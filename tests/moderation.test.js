const { test, describe, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { DatabaseManager } = require('../src/database/connection');
const { Migrator } = require('../src/database/migrator');
const { GuildRepository } = require('../src/database/repositories/guildRepository');
const { ModerationRepository } = require('../src/database/repositories/moderationRepository');
const { HierarchyService } = require('../src/services/hierarchyService');
const { ModerationService } = require('../src/services/moderationService');
const { PermissionDeniedError } = require('../src/utils/errorHandler');

describe('Moderation Service & Disciplinary Actions', () => {
  let db;
  let modRepo;
  let modService;
  let hierarchy;
  let mockGuild;

  beforeEach(() => {
    db = new DatabaseManager(':memory:');
    db.connect();
    const migrator = new Migrator(db, path.resolve(__dirname, '../src/database/migrations'));
    migrator.runPendingMigrations();

    const guildRepo = new GuildRepository(db);
    guildRepo.upsertGuild({ id: 'guild_mod_test', name: 'Moderation Server' });

    modRepo = new ModerationRepository(db);
    hierarchy = new HierarchyService();
    modService = new ModerationService({
      modRepo,
      hierarchyService: hierarchy,
      auditService: null,
      warnEscalationService: null,
      logDispatchService: null
    });

    mockGuild = {
      id: 'guild_mod_test',
      name: 'Moderation Server',
      ownerId: 'owner_id',
      bans: {
        create: async () => true,
        remove: async () => true
      }
    };
  });

  afterEach(() => {
    db.close();
  });

  test('successfully applies a warn, records punishment and history', async () => {
    const botMember = { id: 'bot', guild: mockGuild, roles: { highest: { position: 100 } } };
    const modMember = { id: 'mod', guild: mockGuild, roles: { highest: { position: 80 } }, user: { id: 'mod', username: 'Mod' } };
    const targetMember = {
      id: 'target',
      guild: mockGuild,
      roles: { highest: { position: 20 } },
      user: { id: 'target', username: 'Infrator', send: async () => true }
    };

    const res = await modService.warn(botMember, modMember, targetMember, {
      reason: 'Spam no chat geral'
    });

    assert.equal(res.status, 'sucesso');
    assert.equal(res.punishment.type, 'WARN');
    assert.equal(res.punishment.reason, 'Spam no chat geral');

    const history = modService.getDisciplinaryHistory('guild_mod_test', 'target');
    assert.equal(history.length, 1);
    assert.equal(history[0].type, 'WARN');
  });

  test('rejects punishment if target has equal or higher hierarchy', async () => {
    const botMember = { id: 'bot', guild: mockGuild, roles: { highest: { position: 50 } } };
    const modMember = { id: 'mod', guild: mockGuild, roles: { highest: { position: 40 } } };
    const seniorMember = { id: 'senior', guild: mockGuild, roles: { highest: { position: 60 } } };

    await assert.rejects(async () => {
      await modService.kick(botMember, modMember, seniorMember, { reason: 'Teste' });
    }, PermissionDeniedError);
  });

  test('applies timeout and untimeout cleanly', async () => {
    let timeoutAppliedMs = 0;
    const botMember = { id: 'bot', guild: mockGuild, roles: { highest: { position: 100 } } };
    const modMember = { id: 'mod', guild: mockGuild, roles: { highest: { position: 80 } }, user: { id: 'mod', username: 'Mod' } };
    const targetMember = {
      id: 'target',
      guild: mockGuild,
      roles: { highest: { position: 20 } },
      user: { id: 'target', username: 'Infrator', send: async () => true },
      timeout: async (ms) => { timeoutAppliedMs = ms; }
    };

    await modService.timeout(botMember, modMember, targetMember, {
      durationSeconds: 600,
      reason: 'Desrespeito'
    });

    assert.equal(timeoutAppliedMs, 600000);

    await modService.untimeout(botMember, modMember, targetMember, { reason: 'Perdão' });
    assert.equal(timeoutAppliedMs, null);
  });

  test('clearWarns resets active warnings for a member', async () => {
    const botMember = { id: 'bot', guild: mockGuild, roles: { highest: { position: 100 } } };
    const modMember = { id: 'mod', guild: mockGuild, roles: { highest: { position: 80 } }, user: { id: 'mod', username: 'Mod' } };
    const targetMember = {
      id: 'target',
      guild: mockGuild,
      roles: { highest: { position: 20 } },
      user: { id: 'target', username: 'Infrator', send: async () => true }
    };

    // Apply 2 warns
    await modService.warn(botMember, modMember, targetMember, { reason: 'Warn 1' });
    await modService.warn(botMember, modMember, targetMember, { reason: 'Warn 2' });

    let activeWarns = modRepo.getActiveWarns('guild_mod_test', 'target');
    assert.equal(activeWarns.length, 2);

    const cleared = modService.clearWarns('guild_mod_test', 'target', modMember);
    assert.equal(cleared.advertenciasRemovidas, 2);

    activeWarns = modRepo.getActiveWarns('guild_mod_test', 'target');
    assert.equal(activeWarns.length, 0);
  });
});
