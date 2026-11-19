const { describe, test, beforeEach } = require('node:test');
const assert = require('node:assert');
const { InterBotBridge } = require('../src/services/interBotBridge');
const { DatabaseManager } = require('../src/database/connection');
const { Migrator } = require('../src/database/migrator');

describe('InterBotBridge — Inter-Bot Communication Mesh', () => {
  let dbManager;
  let bridge;

  beforeEach(async () => {
    dbManager = new DatabaseManager(':memory:');
    dbManager.connect();
    const migrator = new Migrator(dbManager);
    await migrator.runPendingMigrations();
    bridge = new InterBotBridge(dbManager);
  });

  test('registers and unregisters bot nodes in the mesh', () => {
    const jarvisNode = bridge.registerBot('jarvis_primary', {
      name: 'J.A.R.V.I.S.',
      isPrimary: true,
      allowedGuilds: ['guild_1']
    });

    const dumbNode = bridge.registerBot('bot_dumb_123', {
      name: 'Dumb',
      isPrimary: false,
      allowedGuilds: ['guild_1']
    });

    assert.strictEqual(bridge.isBotOnline('jarvis_primary'), true);
    assert.strictEqual(bridge.isBotOnline('bot_dumb_123'), true);
    assert.strictEqual(bridge.isBotOnline('unknown_bot'), false);

    const connected = bridge.getConnectedBots();
    assert.strictEqual(connected.length, 2);
    assert.ok(connected.map(n => n.name).includes('J.A.R.V.I.S.'));
    assert.ok(connected.map(n => n.name).includes('Dumb'));

    bridge.unregisterBot('bot_dumb_123');
    assert.strictEqual(bridge.isBotOnline('bot_dumb_123'), false);
    assert.strictEqual(bridge.getConnectedBots().length, 1);
  });

  test('broadcasts packets to all registered bots and prevents duplicate loops', () => {
    const receivedPackets = [];

    bridge.registerBot('jarvis_primary', { name: 'J.A.R.V.I.S.', isPrimary: true });
    bridge.registerBot('bot_dumb', { name: 'Dumb', isPrimary: false });

    bridge.on('packet', (packet) => {
      receivedPackets.push(packet);
    });

    const packet = bridge.broadcast('jarvis_primary', 'SYNC_EVENT', {
      testMessage: 'Olá Dumb!'
    });

    assert.ok(packet);
    assert.strictEqual(packet.fromBotId, 'jarvis_primary');
    assert.strictEqual(packet.eventType, 'SYNC_EVENT');
    assert.strictEqual(packet.payload.testMessage, 'Olá Dumb!');
    assert.strictEqual(receivedPackets.length, 1);

    // Verify duplicate suppression
    const dupRes = bridge._dispatchPacket(packet);
    assert.strictEqual(dupRes, false);
  });

  test('sends targeted direct messages between specific bots', () => {
    bridge.registerBot('jarvis_primary', { name: 'J.A.R.V.I.S.', isPrimary: true });
    bridge.registerBot('bot_dumb', { name: 'Dumb', isPrimary: false });

    let dumbReceived = null;
    bridge.on('bot:bot_dumb', (packet) => {
      dumbReceived = packet;
    });

    let jarvisReceived = null;
    bridge.on('bot:jarvis_primary', (packet) => {
      jarvisReceived = packet;
    });

    const packet = bridge.send('jarvis_primary', 'bot_dumb', 'DIRECT_PING', {
      pingCode: 42
    });

    assert.ok(packet);
    assert.ok(dumbReceived);
    assert.strictEqual(dumbReceived.payload.pingCode, 42);
    assert.strictEqual(jarvisReceived, null);
  });

  test('synchronizes moderation punishments across the mesh without recursion', () => {
    bridge.registerBot('jarvis_primary', { name: 'J.A.R.V.I.S.', isPrimary: true });
    bridge.registerBot('bot_dumb', { name: 'Dumb', isPrimary: false });

    let moderationEvent = null;
    bridge.on('moderation:sync', (packet) => {
      moderationEvent = packet;
    });

    const packet = bridge.syncModeration({
      action: 'TIMEOUT',
      targetId: 'user_456',
      targetName: 'virzinho dos chimmas',
      actorId: 'user_123',
      actorName: 'Lipe',
      botName: 'Dumb',
      reason: 'Spam excessivo no chat',
      durationSeconds: 600,
      guildId: 'guild_1'
    });

    assert.ok(packet);
    assert.ok(moderationEvent);
    assert.strictEqual(moderationEvent.payload.action, 'TIMEOUT');
    assert.strictEqual(moderationEvent.payload.targetName, 'virzinho dos chimmas');
    assert.strictEqual(moderationEvent.payload.durationSeconds, 600);

    const recent = bridge.getRecentPackets();
    assert.ok(recent.length > 0);
    assert.strictEqual(recent[0].eventType, 'MODERATION_ACTION');
  });

  test('getMeshStatus provides complete network telemetry', () => {
    bridge.registerBot('jarvis_primary', { name: 'J.A.R.V.I.S.', isPrimary: true });
    bridge.registerBot('bot_dumb', { name: 'Dumb', isPrimary: false });

    bridge.broadcast('jarvis_primary', 'HEARTBEAT', { status: 'OK' });

    const status = bridge.getMeshStatus();
    assert.strictEqual(status.connectedNodes, 2);
    assert.strictEqual(status.totalPacketsProcessed, 1);
    assert.strictEqual(status.nodes.length, 2);
    assert.strictEqual(status.recentPackets.length, 1);
  });
});
