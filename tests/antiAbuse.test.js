const { test, describe, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { DatabaseManager } = require('../src/database/connection');
const { Migrator } = require('../src/database/migrator');
const { GuildRepository } = require('../src/database/repositories/guildRepository');
const { ModerationRepository } = require('../src/database/repositories/moderationRepository');
const { ProtectionService } = require('../src/services/protectionService');

describe('Protection Service: Anti-Spam, Anti-Flood & Purge Filters', () => {
  let db;
  let modRepo;
  let protection;
  let mockGuild;

  beforeEach(() => {
    db = new DatabaseManager(':memory:');
    db.connect();
    const migrator = new Migrator(db, path.resolve(__dirname, '../src/database/migrations'));
    migrator.runPendingMigrations();

    const guildRepo = new GuildRepository(db);
    guildRepo.upsertGuild({ id: 'guild_prot_test', name: 'Protection Server' });

    modRepo = new ModerationRepository(db);
    modRepo.saveAntiAbuseConfig('guild_prot_test', {
      antiSpamEnabled: true,
      maxMessagesPerInterval: 3,
      intervalSeconds: 5,
      antiFloodDuplicateThreshold: 3,
      actionOnDetection: 'TIMEOUT',
      timeoutDurationSeconds: 300
    });

    const mockModerationService = {
      timeout: async () => true,
      kick: async () => true,
      warn: async () => true,
      ban: async () => true
    };

    protection = new ProtectionService(modRepo, mockModerationService, null);

    mockGuild = {
      id: 'guild_prot_test',
      members: {
        me: { id: 'bot_me' }
      }
    };
  });

  afterEach(() => {
    db.close();
  });

  test('anti-flood triggers when identical messages exceed threshold', async () => {
    const mockMember = { id: 'spammer_1' };
    const createMsg = (content) => ({
      guild: mockGuild,
      member: mockMember,
      author: { id: 'spammer_1', bot: false },
      content
    });

    // 1st identical message
    const res1 = await protection.inspectMessage(createMsg('comprar nitro gratis'));
    assert.equal(res1.isViolating, false);

    // 2nd identical message
    const res2 = await protection.inspectMessage(createMsg('comprar nitro gratis'));
    assert.equal(res2.isViolating, false);

    // 3rd identical message -> triggers FLOOD violation!
    const res3 = await protection.inspectMessage(createMsg('comprar nitro gratis'));
    assert.equal(res3.isViolating, true);
    assert.equal(res3.type, 'FLOOD');
  });

  test('anti-spam triggers when message frequency exceeds limit in window', async () => {
    const mockMember = { id: 'spammer_2' };
    const createMsg = (content) => ({
      guild: mockGuild,
      member: mockMember,
      author: { id: 'spammer_2', bot: false },
      content
    });

    // Send 3 messages (within limit 3)
    await protection.inspectMessage(createMsg('msg 1'));
    await protection.inspectMessage(createMsg('msg 2'));
    await protection.inspectMessage(createMsg('msg 3'));

    // 4th message in same second exceeds limit 3 -> triggers SPAM!
    const res = await protection.inspectMessage(createMsg('msg 4'));
    assert.equal(res.isViolating, true);
    assert.equal(res.type, 'SPAM');
  });

  test('anti-spam triggers WARN action when actionOnDetection is WARN', async () => {
    let warnCalledWith = null;
    const warnModService = {
      warn: async (botMember, modMember, targetMember, opts) => {
        warnCalledWith = { botMember, modMember, targetMember, opts };
        return { status: 'sucesso' };
      }
    };
    modRepo.saveAntiAbuseConfig('guild_prot_test', {
      antiSpamEnabled: true,
      maxMessagesPerInterval: 2,
      intervalSeconds: 5,
      antiFloodDuplicateThreshold: 2,
      actionOnDetection: 'WARN'
    });
    const warnProtection = new ProtectionService(modRepo, warnModService, null);
    const mockMember = { id: 'warn_target_1' };
    const createMsg = (content) => ({
      guild: mockGuild,
      member: mockMember,
      author: { id: 'warn_target_1', bot: false },
      content
    });

    await warnProtection.inspectMessage(createMsg('spam'));
    const res = await warnProtection.inspectMessage(createMsg('spam'));
    assert.equal(res.isViolating, true);
    assert.equal(res.actionTaken, 'WARN');
    assert.ok(warnCalledWith);
    assert.equal(warnCalledWith.targetMember.id, 'warn_target_1');
    assert.match(warnCalledWith.opts.reason, /Detecção automática de flood/);
  });

  test('purgeMessages correctly filters messages by type', async () => {
    const messages = [
      { id: '1', author: { id: 'user_a', bot: false }, content: 'olá', attachments: new Map() },
      { id: '2', author: { id: 'user_b', bot: true }, content: 'bot msg', attachments: new Map() },
      { id: '3', author: { id: 'user_a', bot: false }, content: 'veja http://example.com link', attachments: new Map() },
      { id: '4', author: { id: 'user_c', bot: false }, content: 'foto', attachments: new Map([['att', {}]]) }
    ];

    let deletedIds = [];
    const mockChannel = {
      guild: mockGuild,
      messages: {
        fetch: async () => new Map(messages.map(m => [m.id, m]))
      },
      bulkDelete: async (toDel) => {
        deletedIds = toDel.map(m => m.id);
        return { size: toDel.length };
      }
    };

    // Filter BOTS: should only delete msg 2
    const resBots = await protection.purgeMessages(mockChannel, { filter: 'BOTS' });
    assert.equal(resBots.totalDeleted, 1);
    assert.deepEqual(deletedIds, ['2']);

    // Filter LINKS: should only delete msg 3
    const resLinks = await protection.purgeMessages(mockChannel, { filter: 'LINKS' });
    assert.equal(resLinks.totalDeleted, 1);
    assert.deepEqual(deletedIds, ['3']);

    // Filter ATTACHMENTS: should only delete msg 4
    const resAtt = await protection.purgeMessages(mockChannel, { filter: 'ATTACHMENTS' });
    assert.equal(resAtt.totalDeleted, 1);
    assert.deepEqual(deletedIds, ['4']);

    // Filter USERS for user_a: should delete msg 1 and 3
    const resUser = await protection.purgeMessages(mockChannel, { filter: 'USERS', targetUserId: 'user_a' });
    assert.equal(resUser.totalDeleted, 2);
    assert.deepEqual(deletedIds, ['1', '3']);
  });
});
