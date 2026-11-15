const { test, describe, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { DatabaseManager } = require('../src/database/connection');
const { Migrator } = require('../src/database/migrator');
const { GuildRepository } = require('../src/database/repositories/guildRepository');
const { ModerationRepository } = require('../src/database/repositories/moderationRepository');
const { HierarchyService } = require('../src/services/hierarchyService');
const { ModerationService } = require('../src/services/moderationService');
const { WarnEscalationService } = require('../src/services/warnEscalationService');

describe('Warn Escalation System & Expiration Windows', () => {
  let db;
  let modRepo;
  let modService;
  let escalationService;
  let mockGuild;

  beforeEach(() => {
    db = new DatabaseManager(':memory:');
    db.connect();
    const migrator = new Migrator(db, path.resolve(__dirname, '../src/database/migrations'));
    migrator.runPendingMigrations();

    const guildRepo = new GuildRepository(db);
    guildRepo.upsertGuild({ id: 'guild_esc_test', name: 'Escalation Server' });

    modRepo = new ModerationRepository(db);
    escalationService = new WarnEscalationService(modRepo);
    const hierarchy = new HierarchyService();

    modService = new ModerationService({
      modRepo,
      hierarchyService: hierarchy,
      auditService: null,
      warnEscalationService: escalationService,
      logDispatchService: null
    });
    escalationService.setModerationService(modService);

    mockGuild = {
      id: 'guild_esc_test',
      name: 'Escalation Server',
      ownerId: 'owner_id'
    };
  });

  afterEach(() => {
    db.close();
  });

  test('escalation triggers automatically when threshold is reached', async () => {
    // Rule: 3 warns -> TIMEOUT (duration 600s)
    modRepo.createEscalationRule({
      guildId: 'guild_esc_test',
      thresholdWarns: 3,
      action: 'TIMEOUT',
      durationSeconds: 600,
      windowDays: 30,
      autoApply: 1
    });

    let timeoutCalledWith = null;
    const botMember = {
      id: 'bot',
      guild: mockGuild,
      roles: { highest: { position: 100 } },
      user: { id: 'bot', username: 'CellBot' }
    };
    const modMember = {
      id: 'mod',
      guild: mockGuild,
      roles: { highest: { position: 80 } },
      user: { id: 'mod', username: 'Mod' }
    };
    const targetMember = {
      id: 'target',
      guild: mockGuild,
      roles: { highest: { position: 20 }, cache: new Map() },
      user: { id: 'target', username: 'Troublemaker', send: async () => true },
      timeout: async (ms) => { timeoutCalledWith = ms; }
    };

    // Warn 1
    const res1 = await modService.warn(botMember, modMember, targetMember, { reason: 'Infração 1' });
    assert.equal(res1.escalation.triggered, false);

    // Warn 2
    const res2 = await modService.warn(botMember, modMember, targetMember, { reason: 'Infração 2' });
    assert.equal(res2.escalation.triggered, false);

    // Warn 3 -> triggers escalation!
    const res3 = await modService.warn(botMember, modMember, targetMember, { reason: 'Infração 3' });
    assert.equal(res3.escalation.triggered, true);
    assert.equal(res3.escalation.action, 'TIMEOUT');
    assert.equal(timeoutCalledWith, 600000); // 600 seconds * 1000
  });

  test('expired warns outside the window_days are ignored by escalation', async () => {
    // Rule: 2 warns in 7 days -> KICK
    modRepo.createEscalationRule({
      guildId: 'guild_esc_test',
      thresholdWarns: 2,
      action: 'KICK',
      windowDays: 7,
      autoApply: 1
    });

    // Insert an old warn manually (15 days ago)
    db.run(
      `INSERT INTO moderation_punishments 
       (guild_id, target_id, actor_id, type, reason, created_at, is_active)
       VALUES ('guild_esc_test', 'target_user', 'mod', 'WARN', 'Old Warn', datetime('now', '-15 days'), 1)`
    );

    const botMember = {
      id: 'bot',
      guild: mockGuild,
      roles: { highest: { position: 100 } },
      user: { id: 'bot', username: 'CellBot' }
    };
    const modMember = {
      id: 'mod',
      guild: mockGuild,
      roles: { highest: { position: 80 } },
      user: { id: 'mod', username: 'Mod' }
    };
    const targetMember = {
      id: 'target_user',
      guild: mockGuild,
      roles: { highest: { position: 20 }, cache: new Map() },
      user: { id: 'target_user', username: 'Troublemaker', send: async () => true },
      kick: async () => true
    };

    // Apply 1 fresh warn
    const res = await modService.warn(botMember, modMember, targetMember, { reason: 'Fresh warn' });

    // The old warn (15 days ago) must not count toward the 7-day window rule
    assert.equal(res.escalation.triggered, false);
  });

  test('exempt roles prevent automated escalation on privileged members', async () => {
    // Rule: 1 warn -> TIMEOUT, exempt role: 'vip_role'
    modRepo.createEscalationRule({
      guildId: 'guild_esc_test',
      thresholdWarns: 1,
      action: 'TIMEOUT',
      durationSeconds: 300,
      windowDays: 30,
      autoApply: 1,
      exemptRoleIds: JSON.stringify(['vip_role'])
    });

    const botMember = {
      id: 'bot',
      guild: mockGuild,
      roles: { highest: { position: 100 } },
      user: { id: 'bot', username: 'CellBot' }
    };
    const modMember = {
      id: 'mod',
      guild: mockGuild,
      roles: { highest: { position: 80 } },
      user: { id: 'mod', username: 'Mod' }
    };
    const vipMember = {
      id: 'vip_user',
      guild: mockGuild,
      roles: {
        highest: { position: 20 },
        cache: new Map([['vip_role', { id: 'vip_role', name: 'VIP' }]])
      },
      user: { id: 'vip_user', username: 'VipUser', send: async () => true }
    };

    const res = await modService.warn(botMember, modMember, vipMember, { reason: 'Infração leve' });
    // Should NOT trigger escalation due to exempt role
    assert.equal(res.escalation.triggered, false);
  });
});
