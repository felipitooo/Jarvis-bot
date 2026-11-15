const { test, describe, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { DatabaseManager } = require('../src/database/connection');
const { Migrator } = require('../src/database/migrator');
const { GuildRepository } = require('../src/database/repositories/guildRepository');
const { MusicVoiceRepository } = require('../src/database/repositories/musicVoiceRepository');
const { XpRepository } = require('../src/database/repositories/xpRepository');
const { BotPresenceRepository } = require('../src/database/repositories/botPresenceRepository');
const { MusicService } = require('../src/services/musicService');
const { ProgressionFormulaService } = require('../src/services/progressionFormulaService');
const { ExperienceService } = require('../src/services/experienceService');
const { applyBotPresence } = require('../src/utils/presenceHelper');

describe('Playlists, Spotify, XP Progression & Bot Presence', () => {
  let db;
  let musicRepo;
  let xpRepo;
  let botPresenceRepo;
  let musicService;
  let formulaService;
  let xpService;

  beforeEach(() => {
    db = new DatabaseManager(':memory:');
    db.connect();
    const migrator = new Migrator(db, path.resolve(__dirname, '../src/database/migrations'));
    migrator.runPendingMigrations();

    const guildRepo = new GuildRepository(db);
    guildRepo.upsertGuild({ id: 'guild_test_1', name: 'Test Guild 1' });

    musicRepo = new MusicVoiceRepository(db);
    xpRepo = new XpRepository(db);
    botPresenceRepo = new BotPresenceRepository(db);

    const mockIdentity = { getDisplayName: () => 'Cell' };

    musicService = new MusicService({
      musicVoiceRepo: musicRepo,
      identityService: mockIdentity
    });

    formulaService = new ProgressionFormulaService();
    xpService = new ExperienceService({
      xpRepo,
      formulaService,
      identityService: mockIdentity
    });
  });

  afterEach(() => {
    if (db) db.close();
  });

  // ==========================================
  // 1. Bot Presence Configuration
  // ==========================================
  test('bot presence configuration persists and applies to Discord client', () => {
    const initial = botPresenceRepo.getPresence();
    assert.equal(initial.botStatus, 'online');
    assert.equal(initial.activityType, 'Custom');

    const updated = botPresenceRepo.updatePresence({
      botStatus: 'dnd',
      activityType: 'Playing',
      activityName: 'Noob Studio Games',
      activityUrl: null
    });

    assert.equal(updated.botStatus, 'dnd');
    assert.equal(updated.activityType, 'Playing');
    assert.equal(updated.activityName, 'Noob Studio Games');

    // Test applyBotPresence mock client
    let presencePayload = null;
    const mockClient = {
      user: {
        setPresence: (p) => { presencePayload = p; }
      }
    };

    const applied = applyBotPresence(mockClient, updated);
    assert.equal(applied, true);
    assert.ok(presencePayload);
    assert.equal(presencePayload.status, 'dnd');
    assert.equal(presencePayload.activities[0].name, 'Noob Studio Games');
  });

  // ==========================================
  // 2. XP Progression: Customizable Formulas
  // ==========================================
  test('calculates XP based on custom progressive, linear, and constant formulas', () => {
    // 1. Classic Progressive (Default)
    const progLvl1 = formulaService.getCumulativeXpForLevel(1, { formulaType: 'PROGRESSIVE', xpPerLevelBase: 100, xpPerLevelIncrement: 50, xpPerLevelCurve: 5 });
    assert.equal(progLvl1, 100);

    // 2. Linear (Fixed increment per level)
    const linLvl1 = formulaService.getCumulativeXpForLevel(1, { formulaType: 'LINEAR', xpPerLevelBase: 100, xpPerLevelIncrement: 100 });
    const linLvl2 = formulaService.getCumulativeXpForLevel(2, { formulaType: 'LINEAR', xpPerLevelBase: 100, xpPerLevelIncrement: 100 });
    assert.equal(linLvl1, 100); // 100
    assert.equal(linLvl2, 300); // 100 + 200

    // 3. Constant (e.g. exactly 100 XP per level)
    const constConfig = { formulaType: 'CONSTANT', xpPerLevelBase: 100 };
    assert.equal(formulaService.getCumulativeXpForLevel(1, constConfig), 100);
    assert.equal(formulaService.getCumulativeXpForLevel(2, constConfig), 200);
    assert.equal(formulaService.getCumulativeXpForLevel(5, constConfig), 500);

    // Test level from XP
    assert.equal(formulaService.calculateLevelFromXp(250, constConfig), 2);
    assert.equal(formulaService.calculateLevelFromXp(500, constConfig), 5);
  });

  // ==========================================
  // 3. XP Level Rewards & Role Multipliers
  // ==========================================
  test('manages level rewards and role multipliers in database', () => {
    // Add rewards
    xpRepo.addLevelReward('guild_test_1', 5, 'role_vip_5', 1);
    xpRepo.addLevelReward('guild_test_1', 10, 'role_vip_10', 0);

    const rewards = xpRepo.getLevelRewards('guild_test_1');
    assert.equal(rewards.length, 2);
    assert.equal(rewards[0].level_required, 5);
    assert.equal(rewards[0].role_id, 'role_vip_5');
    assert.equal(rewards[0].remove_previous_roles, 1);

    // Delete reward
    xpRepo.deleteLevelReward('guild_test_1', 5, 'role_vip_5');
    const remainingRewards = xpRepo.getLevelRewards('guild_test_1');
    assert.equal(remainingRewards.length, 1);
    assert.equal(remainingRewards[0].level_required, 10);

    // Add multiplier
    xpRepo.setMultiplierOrBlock('guild_test_1', 'ROLE', 'role_booster', 2.0, 0);
    const mults = xpRepo.getMultipliersAndBlocks('guild_test_1');
    assert.equal(mults.length, 1);
    assert.equal(mults[0].multiplier, 2.0);

    // Remove multiplier
    xpRepo.removeMultiplierOrBlock('guild_test_1', 'ROLE', 'role_booster');
    assert.equal(xpRepo.getMultipliersAndBlocks('guild_test_1').length, 0);
  });

  // ==========================================
  // 4. Playlists & Thumbnails
  // ==========================================
  test('music presets include thumbnails and load properly', async () => {
    const lofiTrack = await musicService.resolveTrack('lofi', { id: 'u1', username: 'User1' });
    assert.ok(lofiTrack);
    assert.ok(lofiTrack.thumbnail);
    assert.equal(lofiTrack.thumbnail.includes('http'), true);
  });

  test('enqueuing mock playlist items populates session queue with thumbnails', () => {
    const session = musicService.getOrCreateSession('guild_test_1');
    const tracks = [
      { title: 'Track 1', url: 'https://example.com/1.mp3', thumbnail: 'https://example.com/t1.jpg', duration: 180, durationFormatted: '03:00' },
      { title: 'Track 2', url: 'https://example.com/2.mp3', thumbnail: 'https://example.com/t2.jpg', duration: 200, durationFormatted: '03:20' }
    ];

    for (const t of tracks) {
      session.enqueue(t);
    }

    assert.equal(session.queue.length, 2);
    assert.equal(session.queue[0].thumbnail, 'https://example.com/t1.jpg');
    assert.equal(session.queue[1].thumbnail, 'https://example.com/t2.jpg');

    const first = session.playNext();
    assert.equal(first.title, 'Track 1');
    assert.equal(first.thumbnail, 'https://example.com/t1.jpg');
  });
});
