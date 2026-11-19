const { test, describe, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { DatabaseManager } = require('../src/database/connection');
const { Migrator } = require('../src/database/migrator');
const { GuildRepository } = require('../src/database/repositories/guildRepository');
const { UserRepository } = require('../src/database/repositories/userRepository');
const { MemoryRepository } = require('../src/database/repositories/memoryRepository');
const { SettingsRepository } = require('../src/database/repositories/settingsRepository');
const { AuditRepository } = require('../src/database/repositories/auditRepository');
const { WebSessionRepository } = require('../src/database/repositories/webSessionRepository');
const { SettingsService } = require('../src/services/settingsService');
const { IdentityService } = require('../src/services/identityService');
const { AuditService } = require('../src/services/auditService');
const { WebPanelService } = require('../src/services/webPanelService');

describe('Web Panel Speak & AI Forced Memories Features', () => {
  let db;
  let memoryRepo;
  let auditService;
  let webPanelService;
  let mockBotClient;
  let sentMessages;

  beforeEach(() => {
    db = new DatabaseManager(':memory:');
    db.connect();
    const migrator = new Migrator(db, path.resolve(__dirname, '../src/database/migrations'));
    migrator.runPendingMigrations();

    const guildRepo = new GuildRepository(db);
    const userRepo = new UserRepository(db);
    const settingsRepo = new SettingsRepository(db);
    const auditRepo = new AuditRepository(db);
    const webSessionRepo = new WebSessionRepository(db);

    guildRepo.upsertGuild({ id: 'guild_test_1', name: 'Test Guild' });
    userRepo.upsertUser({ id: 'user_admin', username: 'Stark' });

    memoryRepo = new MemoryRepository(db);
    auditService = new AuditService(auditRepo);
    const settingsService = new SettingsService(settingsRepo, auditService);
    const identityService = new IdentityService(settingsService, auditService, 'J.A.R.V.I.S');

    sentMessages = [];
    const mockChannel = {
      id: 'channel_chat_1',
      name: 'geral',
      isTextBased: () => true,
      send: async (payload) => {
        sentMessages.push(payload);
        return { id: 'msg_discord_123', channel: mockChannel };
      }
    };

    mockBotClient = {
      user: {
        displayAvatarURL: () => 'https://cdn.example.com/bot.png'
      },
      guilds: {
        cache: new Map([
          ['guild_test_1', {
            id: 'guild_test_1',
            name: 'Test Guild',
            channels: {
              cache: new Map([
                ['channel_chat_1', mockChannel]
              ])
            }
          }]
        ])
      }
    };

    const { MultiBotManager } = require('../src/services/multiBotManager');
    const multiBotManager = new MultiBotManager(db, auditService);

    webPanelService = new WebPanelService({
      webSessionRepo,
      identityService,
      settingsService,
      auditService,
      services: {
        memoryRepo,
        multiBotManager
      },
      botClient: mockBotClient
    });
  });

  afterEach(() => {
    if (db) db.close();
  });

  test('aimemory: can save and list guild memories via panel', async () => {
    const session = webPanelService.createOAuthSession(
      { id: 'user_admin', username: 'Stark' },
      [{ id: 'guild_test_1', name: 'Test Guild', permissions: '32', owner: false }]
    );
    const res = await webPanelService.updateModuleConfig(
      session,
      'guild_test_1',
      'aimemory',
      { action: 'SAVE', key: 'dono_servidor', value: 'O dono supremo é o Lipe' },
      session.csrfToken
    );

    assert.ok(res.config.memories);
    assert.equal(res.config.memories.length, 1);
    assert.equal(res.config.memories[0].key, 'dono_servidor');
    assert.equal(res.config.memories[0].value, 'O dono supremo é o Lipe');

    // Overview includes memories
    const overview = webPanelService.getGuildOverview(session, 'guild_test_1');
    assert.equal(overview.modules.aiMemories.length, 1);
    assert.equal(overview.modules.aiMemories[0].key, 'dono_servidor');
  });

  test('aimemory: can delete memory via panel', async () => {
    const session = webPanelService.createOAuthSession(
      { id: 'user_admin', username: 'Stark' },
      [{ id: 'guild_test_1', name: 'Test Guild', permissions: '32', owner: false }]
    );
    await webPanelService.updateModuleConfig(
      session,
      'guild_test_1',
      'aimemory',
      { action: 'SAVE', key: 'regras', value: 'Sem flood e respeite a equipe' },
      session.csrfToken
    );

    const deleteRes = await webPanelService.updateModuleConfig(
      session,
      'guild_test_1',
      'aimemory',
      { action: 'DELETE', key: 'regras' },
      session.csrfToken
    );

    assert.equal(deleteRes.config.memories.length, 0);
  });

  test('bot_speak: successfully dispatches text and styled embed to discord channel', async () => {
    const session = webPanelService.createOAuthSession(
      { id: 'user_admin', username: 'Stark' },
      [{ id: 'guild_test_1', name: 'Test Guild', permissions: '32', owner: false }]
    );
    const result = await webPanelService.updateModuleConfig(
      session,
      'guild_test_1',
      'bot_speak',
      {
        channelId: 'channel_chat_1',
        content: 'Olá a todos do {server}!',
        embed: {
          title: '📢 Comunicado Oficial',
          description: 'A manutenção do sistema foi concluída.',
          color: '#00E5FF',
          fields: [
            { name: 'Status', value: 'Operacional 100%', inline: true },
            { name: 'Versão', value: 'v2.5', inline: true }
          ],
          footer: { text: 'J.A.R.V.I.S Security' }
        }
      },
      session.csrfToken
    );

    assert.equal(result.status, 'success');
    assert.equal(result.config.messageId, 'msg_discord_123');
    assert.equal(sentMessages.length, 1);
    assert.equal(sentMessages[0].content, 'Olá a todos do {server}!');
    assert.ok(sentMessages[0].embeds);
    assert.equal(sentMessages[0].embeds.length, 1);
  });

  test('bot_speak: rejects invalid channel or empty payload', async () => {
    const session = webPanelService.createOAuthSession(
      { id: 'user_admin', username: 'Stark' },
      [{ id: 'guild_test_1', name: 'Test Guild', permissions: '32', owner: false }]
    );

    await assert.rejects(
      async () => {
        await webPanelService.updateModuleConfig(
          session,
          'guild_test_1',
          'bot_speak',
          { channelId: 'inexistent_channel', content: 'hello' },
          session.csrfToken
        );
      },
      /Canal de texto inválido/
    );

    await assert.rejects(
      async () => {
        await webPanelService.updateModuleConfig(
          session,
          'guild_test_1',
          'bot_speak',
          { channelId: 'channel_chat_1', content: '' },
          session.csrfToken
        );
      },
      /A mensagem precisa conter um texto ou uma embed/
    );
  });

  test('updateGuildSettings: isolates secondary bot name from primary bot identity', async () => {
    const session = webPanelService.createOAuthSession(
      { id: 'user_admin', username: 'Stark' },
      [{ id: 'guild_test_1', name: 'Test Guild', permissions: '32', owner: false }]
    );

    const mb = webPanelService.services.multiBotManager;
    const inst = mb.createInstance({
      name: 'Nala',
      token: 'OTk5OTk5OTk5OTk5OTk5OTk5.Gxxxxx.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
      assignedModules: ['economy'],
      allowedGuilds: ['guild_test_1']
    });

    // Primary bot starts as J.A.R.V.I.S
    assert.equal(webPanelService.identityService.getDisplayName('guild_test_1'), 'J.A.R.V.I.S');

    // Update settings targeting the secondary bot Nala
    const res = webPanelService.updateGuildSettings(
      session,
      'guild_test_1',
      { aiDisplayName: 'N.A.L.A', prefix: '!', prefixlessMode: true },
      session.csrfToken,
      inst.id
    );

    assert.equal(res.status, 'success');
    assert.equal(res.aiDisplayName, 'N.A.L.A');

    // Secondary bot's instance name and config were updated
    const updatedInst = mb.getInstance(inst.id);
    assert.equal(updatedInst.name, 'N.A.L.A');
    assert.equal(updatedInst.config.aiName, 'N.A.L.A');
    assert.equal(updatedInst.config.prefix, '!');

    // CRITICAL: Primary bot's display name in guild settings remains J.A.R.V.I.S and was NOT contaminated
    assert.equal(webPanelService.identityService.getDisplayName('guild_test_1'), 'J.A.R.V.I.S');
  });
});
