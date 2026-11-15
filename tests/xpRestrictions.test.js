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

describe('XP Restrictions, Multipliers & Leaderboards', () => {
  let db;
  let xpRepo;
  let xpService;
  let mockGuild;

  beforeEach(() => {
    db = new DatabaseManager(':memory:');
    db.connect();
    const migrator = new Migrator(db, path.resolve(__dirname, '../src/database/migrations'));
    migrator.runPendingMigrations();

    const guildRepo = new GuildRepository(db);
    const userRepo = new UserRepository(db);
    guildRepo.upsertGuild({ id: 'guild_restr_test', name: 'Restr Guild' });
    userRepo.upsertUser({ id: 'user_alice', username: 'Alice' });
    userRepo.upsertUser({ id: 'user_bob', username: 'Bob' });

    xpRepo = new XpRepository(db);
    xpService = new ExperienceService({
      xpRepo,
      formulaService: progressionFormulaService,
      identityService: { getDisplayName: () => 'Cell' },
      auditService: null
    });

    mockGuild = {
      id: 'guild_restr_test',
      name: 'Restr Guild',
      roles: { cache: new Map() },
      channels: { cache: new Map() }
    };
  });

  afterEach(() => {
    db.close();
  });

  test('blocked channel prevents XP generation', async () => {
    // Block channel 'ch_spam'
    xpRepo.setMultiplierOrBlock('guild_restr_test', 'CHANNEL', 'ch_spam', 1.0, 1);

    const mockMessage = {
      guild: mockGuild,
      member: { id: 'user_alice', user: { id: 'user_alice', username: 'Alice' }, roles: { cache: new Map() } },
      author: { id: 'user_alice', bot: false },
      content: 'Mensagem enviada no canal de spam bloqueado',
      channel: { id: 'ch_spam', send: async () => true }
    };

    const res = await xpService.processMessage(mockMessage);
    assert.equal(res, null, 'Message in blocked channel must not earn XP');
  });

  test('multipliers boost XP generation correctly', async () => {
    // 2.0x multiplier on channel 'ch_boost'
    xpRepo.setMultiplierOrBlock('guild_restr_test', 'CHANNEL', 'ch_boost', 2.0, 0);

    const mockMessage = {
      guild: mockGuild,
      member: { id: 'user_alice', user: { id: 'user_alice', username: 'Alice' }, roles: { cache: new Map() } },
      author: { id: 'user_alice', bot: false },
      content: 'Mensagem válida no canal com multiplicador de 2x',
      channel: { id: 'ch_boost', send: async () => true }
    };

    const res = await xpService.processMessage(mockMessage);
    assert.ok(res);
    // Base min is 15 -> with 2.0x is >= 30; base max is 25 -> with 2.0x is <= 50
    assert.ok(res.earnedXp >= 30 && res.earnedXp <= 50);
  });

  test('leaderboard returns members sorted by XP and accurately calculates rank', () => {
    xpRepo.setMemberXp('guild_restr_test', 'user_alice', 500, 3);
    xpRepo.setMemberXp('guild_restr_test', 'user_bob', 1200, 5);

    const leaderboard = xpRepo.getLeaderboard('guild_restr_test', { type: 'TOTAL', limit: 10 });
    assert.equal(leaderboard.length, 2);
    assert.equal(leaderboard[0].user_id, 'user_bob');
    assert.equal(leaderboard[1].user_id, 'user_alice');

    const rankBob = xpRepo.getMemberRank('guild_restr_test', 'user_bob', 'TOTAL');
    const rankAlice = xpRepo.getMemberRank('guild_restr_test', 'user_alice', 'TOTAL');

    assert.equal(rankBob, 1);
    assert.equal(rankAlice, 2);
  });

  test('resetting individual member or entire guild cleans up XP records', () => {
    xpRepo.setMemberXp('guild_restr_test', 'user_alice', 500, 3);
    xpRepo.setMemberXp('guild_restr_test', 'user_bob', 1200, 5);

    // Reset Alice
    const resAlice = xpService.resetMember('guild_restr_test', 'user_alice', 'admin');
    assert.equal(resAlice.resetado, true);
    assert.equal(xpRepo.getMemberXp('guild_restr_test', 'user_alice').totalXp, 0);
    assert.equal(xpRepo.getMemberXp('guild_restr_test', 'user_bob').totalXp, 1200);

    // Reset entire Guild
    const resGuild = xpService.resetGuild('guild_restr_test', 'admin');
    assert.equal(resGuild.totalMembrosResetados, 1); // Only Bob remained
    assert.equal(xpRepo.getMemberXp('guild_restr_test', 'user_bob').totalXp, 0);
  });
});
