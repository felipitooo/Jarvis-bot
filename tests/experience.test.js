const { test, describe, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { DatabaseManager } = require('../src/database/connection');
const { Migrator } = require('../src/database/migrator');
const { GuildRepository } = require('../src/database/repositories/guildRepository');
const { UserRepository } = require('../src/database/repositories/userRepository');
const { XpRepository } = require('../src/database/repositories/xpRepository');
const { ExperienceService } = require('../src/services/experienceService');
const { progressionFormulaService } = require('../src/services/progressionFormulaService');

describe('Experience Service: Gain, Cooldown & Level Up', () => {
  let db;
  let xpRepo;
  let xpService;
  let mockGuild;
  let mockIdentity;

  beforeEach(() => {
    db = new DatabaseManager(':memory:');
    db.connect();
    const migrator = new Migrator(db, path.resolve(__dirname, '../src/database/migrations'));
    migrator.runPendingMigrations();

    const guildRepo = new GuildRepository(db);
    const userRepo = new UserRepository(db);
    guildRepo.upsertGuild({ id: 'guild_xp_test', name: 'XP Server' });
    userRepo.upsertUser({ id: 'user_gamer', username: 'Gamer' });

    xpRepo = new XpRepository(db);
    mockIdentity = { getDisplayName: () => 'Cell' };

    xpService = new ExperienceService({
      xpRepo,
      formulaService: progressionFormulaService,
      identityService: mockIdentity,
      auditService: null
    });

    mockGuild = {
      id: 'guild_xp_test',
      name: 'XP Server',
      roles: {
        cache: new Map([
          ['reward_role_1', { id: 'reward_role_1', name: 'Nível 1' }],
          ['reward_role_2', { id: 'reward_role_2', name: 'Nível 2' }]
        ])
      },
      channels: {
        cache: new Map()
      }
    };
  });

  afterEach(() => {
    db.close();
  });

  test('rewards XP on valid messages and enforces cooldown', async () => {
    const rolesAdded = [];
    const mockMember = {
      id: 'user_gamer',
      user: { id: 'user_gamer', username: 'Gamer', displayAvatarURL: () => 'http://avatar.png' },
      roles: {
        cache: new Map(),
        add: async (r) => rolesAdded.push(r.id),
        remove: async () => true
      }
    };

    const mockMessage = {
      guild: mockGuild,
      member: mockMember,
      author: { id: 'user_gamer', bot: false },
      content: 'Mensagem válida com mais de cinco caracteres',
      channel: { id: 'ch_1', send: async () => true }
    };

    // 1st Message: should gain XP
    const res1 = await xpService.processMessage(mockMessage);
    assert.ok(res1);
    assert.ok(res1.earnedXp >= 15 && res1.earnedXp <= 25);
    assert.equal(res1.totalXp, res1.earnedXp);

    // 2nd Message immediately: should be blocked by cooldown (returns null)
    const mockMessage2 = {
      ...mockMessage,
      content: 'Outra mensagem diferente mas logo em seguida'
    };
    const res2 = await xpService.processMessage(mockMessage2);
    assert.equal(res2, null, 'Immediate message must be rejected by cooldown');
  });

  test('rejects messages shorter than minMessageLength or repeated duplicate messages', async () => {
    const mockMember = {
      id: 'user_gamer',
      user: { id: 'user_gamer', username: 'Gamer' },
      roles: { cache: new Map() }
    };

    // Short message (< 5 chars)
    const shortMsg = {
      guild: mockGuild,
      member: mockMember,
      author: { id: 'user_gamer', bot: false },
      content: 'oi'
    };
    const resShort = await xpService.processMessage(shortMsg);
    assert.equal(resShort, null);

    // Valid length
    const validMsg = {
      guild: mockGuild,
      member: mockMember,
      author: { id: 'user_gamer', bot: false },
      content: 'mensagem valida de teste'
    };
    const resValid = await xpService.processMessage(validMsg);
    assert.ok(resValid);

    // Exact duplicate message immediately after
    const dupMsg = {
      guild: mockGuild,
      member: mockMember,
      author: { id: 'user_gamer', bot: false },
      content: 'mensagem valida de teste'
    };
    const resDup = await xpService.processMessage(dupMsg);
    assert.equal(resDup, null, 'Duplicate content must be rejected by anti-repetition');
  });

  test('triggers level up and assigns configured level reward roles', async () => {
    // Configure level 1 reward role with remove_previous = 1
    xpRepo.addLevelReward('guild_xp_test', 1, 'reward_role_1', 1);

    const rolesAdded = [];
    const mockMember = {
      id: 'user_gamer',
      user: { id: 'user_gamer', username: 'Gamer', displayAvatarURL: () => 'http://avatar.png' },
      roles: {
        cache: new Map(),
        add: async (r) => rolesAdded.push(r.id),
        remove: async () => true
      }
    };

    // Manually add 100 XP to trigger Level 1 (cumulative for lvl 1 is 100)
    xpService.addManualXp(mockGuild, 'admin', mockMember, 100);

    const profile = xpService.getMemberProfile('guild_xp_test', 'user_gamer');
    assert.equal(profile.currentLevel, 1);
    assert.equal(profile.totalXp, 100);
  });
});
