const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const { DatabaseManager } = require('../src/database/connection');
const { Migrator } = require('../src/database/migrator');
const { GuildRepository } = require('../src/database/repositories/guildRepository');
const { UserRepository } = require('../src/database/repositories/userRepository');
const { MusicVoiceRepository } = require('../src/database/repositories/musicVoiceRepository');
const { CasinoRepository } = require('../src/database/repositories/casinoRepository');
const { SocialFunService } = require('../src/services/socialFunService');
const { EconomyRepository } = require('../src/database/repositories/economyRepository');
const { EconomyService } = require('../src/services/economyService');

describe('Casino Configs, Kiss Pairing & Channel Restrictions', () => {
  let dbManager;
  let guildRepo;
  let userRepo;
  let musicVoiceRepo;
  let casinoRepo;
  let socialFunService;
  let economyRepo;
  let economyService;

  before(() => {
    dbManager = new DatabaseManager();
    dbManager.connect(':memory:');
    const migrator = new Migrator(dbManager);
    migrator.runPendingMigrations();

    guildRepo = new GuildRepository(dbManager);
    userRepo = new UserRepository(dbManager);
    musicVoiceRepo = new MusicVoiceRepository(dbManager);
    casinoRepo = new CasinoRepository(dbManager);

    socialFunService = new SocialFunService({
      musicVoiceRepo,
      identityService: { getDisplayName: () => 'Jarvis' }
    });

    economyRepo = new EconomyRepository(dbManager);
    economyService = new EconomyService({ economyRepo, casinoRepo });

    // Seed test guilds and users
    guildRepo.upsertGuild({ id: 'g_casino_test', name: 'Casino Guild' });
    guildRepo.upsertGuild({ id: 'g_music_test', name: 'Music Guild' });
    guildRepo.upsertGuild({ id: 'g_kiss_test', name: 'Kiss Guild' });
    guildRepo.upsertGuild({ id: 'g_limits_test', name: 'Limits Guild' });

    userRepo.upsertUser({ id: 'u_alice', username: 'Alice' });
    userRepo.upsertUser({ id: 'u_beatrice', username: 'Beatrice' });
    userRepo.upsertUser({ id: 'u_bettor', username: 'Bettor' });
  });

  after(() => {
    if (dbManager) dbManager.close();
  });

  it('casino config defaults and updates work as expected', () => {
    const guildId = 'g_casino_test';
    const initial = casinoRepo.getCasinoConfig(guildId);
    assert.strictEqual(initial.blackjackEnabled, true);
    assert.strictEqual(initial.slotsEnabled, true);
    assert.strictEqual(initial.blackjackMin, 50);
    assert.strictEqual(initial.blackjackMax, 50000);

    casinoRepo.upsertCasinoConfig(guildId, {
      blackjackMin: 100,
      blackjackMax: 25000,
      slotsMultiplier3x: 15.0
    });

    const updated = casinoRepo.getCasinoConfig(guildId);
    assert.strictEqual(updated.blackjackMin, 100);
    assert.strictEqual(updated.blackjackMax, 25000);
    assert.strictEqual(updated.slotsMultiplier3x, 15.0);
  });

  it('music config saves allowed text and voice channels', () => {
    const guildId = 'g_music_test';
    musicVoiceRepo.upsertMusicConfig(guildId, {
      allowedTextChannelId: 'text_chan_123',
      allowedVoiceChannelId: 'voice_chan_456'
    });

    const cfg = musicVoiceRepo.getMusicConfig(guildId);
    assert.strictEqual(cfg.allowedTextChannelId, 'text_chan_123');
    assert.strictEqual(cfg.allowedVoiceChannelId, 'voice_chan_456');
  });

  it('social gender profile and anime kiss pairing', () => {
    const guildId = 'g_kiss_test';
    const userA = { id: 'u_alice', username: 'Alice', bot: false };
    const userB = { id: 'u_beatrice', username: 'Beatrice', bot: false };

    socialFunService.setUserGender('u_alice', 'feminino');
    socialFunService.setUserGender('u_beatrice', 'feminino');

    const profileA = socialFunService.getUserSocialProfile('u_alice');
    assert.strictEqual(profileA.gender, 'FEMALE');

    const kissRes = socialFunService.kiss(guildId, userA, userB);
    assert.strictEqual(kissRes.kissCount, 1);
    assert.ok(kissRes.gif.includes('.gif') || kissRes.gif.includes('tenor') || kissRes.gif.includes('giphy'));
    assert.ok(kissRes.comment.length > 5);

    // Second kiss increments counter
    const kissRes2 = socialFunService.kiss(guildId, userB, userA);
    assert.strictEqual(kissRes2.kissCount, 2);
  });

  it('economy service enforces casino min/max limits', () => {
    const guildId = 'g_limits_test';
    const userId = 'u_bettor';
    economyRepo.getOrCreateAccount(guildId, userId);
    economyRepo.updateBalances(guildId, userId, { walletBalance: 50000 });

    casinoRepo.upsertCasinoConfig(guildId, {
      coinflipMin: 100,
      coinflipMax: 500
    });

    // Bet under min
    assert.throws(() => {
      economyService.coinflip(guildId, userId, 'cara', 50);
    }, /A aposta no Cara ou Coroa deve ser entre/);

    // Bet over max
    assert.throws(() => {
      economyService.coinflip(guildId, userId, 'cara', 600);
    }, /A aposta no Cara ou Coroa deve ser entre/);

    // Valid bet works
    const res = economyService.coinflip(guildId, userId, 'cara', 200);
    assert.ok(res.success !== undefined);
  });

  it('social hug system with persistent pair counters and anti-repeat', async () => {
    const userA = { id: 'u_alice', username: 'Alice' };
    const userB = { id: 'u_beatrice', username: 'Beatrice' };

    // Initial hug
    const hug1 = socialFunService.hug('g_kiss_test', userA, userB);
    assert.strictEqual(hug1.hugCount, 1);
    assert.ok(hug1.gif);
    assert.ok(hug1.tierTitle);

    // Second hug increments pair count
    const hug2 = socialFunService.hug('g_kiss_test', userB, userA);
    assert.strictEqual(hug2.hugCount, 2);
    assert.ok(hug2.gif);

    // Check DB counter persistence directly
    const storedCount = musicVoiceRepo.getPairHugCount('g_kiss_test', userA.id, userB.id);
    assert.strictEqual(storedCount, 2);

    // Self-hug returns special self tier
    const selfHug = socialFunService.hug('g_kiss_test', userA, userA);
    assert.strictEqual(selfHug.hugCount, 1);
    assert.ok(selfHug.comment.includes('Stark'));
  });

  it('warnlist queries member warns and guild-wide warns', () => {
    const { ModerationRepository } = require('../src/database/repositories/moderationRepository');
    const { ModerationService } = require('../src/services/moderationService');
    const modRepo = new ModerationRepository(dbManager);
    const modService = new ModerationService({ modRepo, permissionService: {}, hierarchyService: {}, auditService: {} });

    guildRepo.upsertGuild({ id: 'g_warn', name: 'Warn Guild' });
    userRepo.upsertUser({ id: 'u_warned', username: 'WarnedUser' });
    userRepo.upsertUser({ id: 'u_mod', username: 'ModUser' });

    modRepo.createPunishment({ guildId: 'g_warn', targetId: 'u_warned', actorId: 'u_mod', type: 'WARN', reason: 'Primeiro aviso' });
    modRepo.createPunishment({ guildId: 'g_warn', targetId: 'u_warned', actorId: 'u_mod', type: 'WARN', reason: 'Segundo aviso' });

    const memberWarns = modService.getMemberWarns('g_warn', 'u_warned');
    assert.strictEqual(memberWarns.length, 2);
    assert.strictEqual(memberWarns[0].reason, 'Segundo aviso'); // DESC order

    // Test sequential numbering logic
    const formatted = memberWarns.map((w, index) => {
      const seqNum = memberWarns.length - index;
      return `[#${seqNum}]`;
    });
    assert.strictEqual(formatted[0], '[#2]'); // 2nd (newest)
    assert.strictEqual(formatted[1], '[#1]'); // 1st (oldest)

    // Test single warn member
    userRepo.upsertUser({ id: 'u_single', username: 'SingleWarnUser' });
    modRepo.createPunishment({ guildId: 'g_warn', targetId: 'u_single', actorId: 'u_mod', type: 'WARN', reason: 'Único aviso' });
    const singleWarns = modService.getMemberWarns('g_warn', 'u_single');
    assert.strictEqual(singleWarns.length, 1);
    const singleFormatted = singleWarns.map((w, index) => `[#${singleWarns.length - index}]`);
    assert.strictEqual(singleFormatted[0], '[#1]'); // Correctly formatted as [#1], NOT database ID!

    // Test clearWarns
    modService.clearWarns('g_warn', 'u_warned', { id: 'u_mod' });
    const memberWarnsAfterClear = modService.getMemberWarns('g_warn', 'u_warned');
    assert.strictEqual(memberWarnsAfterClear.filter(w => w.is_active === 1).length, 0);

    const guildWarns = modService.getGuildWarns('g_warn', 10);
    assert.strictEqual(guildWarns.length, 3);
  });
});
