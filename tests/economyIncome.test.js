const { test, describe, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { DatabaseManager } = require('../src/database/connection');
const { Migrator } = require('../src/database/migrator');
const { GuildRepository } = require('../src/database/repositories/guildRepository');
const { UserRepository } = require('../src/database/repositories/userRepository');
const { EconomyRepository } = require('../src/database/repositories/economyRepository');
const { EconomyService } = require('../src/services/economyService');

describe('Economy System: Income Activities & Cooldowns', () => {
  let db;
  let ecoRepo;
  let ecoService;

  beforeEach(() => {
    db = new DatabaseManager(':memory:');
    db.connect();
    const migrator = new Migrator(db, path.resolve(__dirname, '../src/database/migrations'));
    migrator.runPendingMigrations();

    const guildRepo = new GuildRepository(db);
    const userRepo = new UserRepository(db);
    guildRepo.upsertGuild({ id: 'guild_income', name: 'Workplace' });
    userRepo.upsertUser({ id: 'worker_1', username: 'Worker One' });

    ecoRepo = new EconomyRepository(db);
    const mockIdentity = { getDisplayName: () => 'Cell' };

    ecoService = new EconomyService({
      economyRepo: ecoRepo,
      identityService: mockIdentity,
      auditService: null
    });
  });

  afterEach(() => {
    if (db) db.close();
  });

  test('work earns coins within configured range and triggers cooldown', () => {
    const config = ecoRepo.getGuildConfig('guild_income');
    const res = ecoService.work('guild_income', 'worker_1');

    assert.equal(res.success, true);
    assert.ok(res.reward >= config.workMin && res.reward <= config.workMax);
    assert.equal(res.walletBalance, res.reward);

    // Second work attempt immediately should hit cooldown
    const resCooldown = ecoService.work('guild_income', 'worker_1');
    assert.equal(resCooldown.success, false);
    assert.equal(resCooldown.cooldown, true);
    assert.ok(resCooldown.remainingSeconds > 0);
  });

  test('daily delivers fixed daily amount and enforces 24h cooldown', () => {
    const config = ecoRepo.getGuildConfig('guild_income');
    const res = ecoService.daily('guild_income', 'worker_1');

    assert.equal(res.success, true);
    assert.equal(res.reward, config.dailyAmount);
    assert.equal(res.walletBalance, config.dailyAmount);

    // Immediate second attempt triggers cooldown
    const secondTry = ecoService.daily('guild_income', 'worker_1');
    assert.equal(secondTry.success, false);
    assert.equal(secondTry.cooldown, true);
    assert.ok(secondTry.remainingSeconds > 80000); // close to 86400s
  });

  test('weekly delivers fixed weekly amount and enforces 7d cooldown', () => {
    const config = ecoRepo.getGuildConfig('guild_income');
    const res = ecoService.weekly('guild_income', 'worker_1');

    assert.equal(res.success, true);
    assert.equal(res.reward, config.weeklyAmount);
    assert.equal(res.walletBalance, config.weeklyAmount);

    const secondTry = ecoService.weekly('guild_income', 'worker_1');
    assert.equal(secondTry.success, false);
    assert.equal(secondTry.cooldown, true);
  });

  test('crime updates wallet correctly and enforces cooldown', () => {
    // Seed user with some balance to cover potential fine
    ecoRepo.updateBalances('guild_income', 'worker_1', { walletBalance: 200 });

    const res = ecoService.crime('guild_income', 'worker_1');
    assert.ok(typeof res.success === 'boolean');
    if (res.success) {
      assert.ok(res.reward > 0);
      assert.ok(res.walletBalance > 200);
    } else {
      assert.ok(res.fine > 0);
      assert.ok(res.walletBalance <= 200);
    }

    // Cooldown verification
    const secondTry = ecoService.crime('guild_income', 'worker_1');
    assert.equal(secondTry.success, false);
    assert.equal(secondTry.cooldown, true);
  });

  test('slut updates wallet correctly and enforces cooldown', () => {
    ecoRepo.updateBalances('guild_income', 'worker_1', { walletBalance: 200 });

    const res = ecoService.slut('guild_income', 'worker_1');
    assert.ok(typeof res.success === 'boolean');
    if (res.success) {
      assert.ok(res.reward >= 80);
      assert.ok(res.walletBalance >= 280);
    } else {
      assert.ok(res.fine >= 40);
      assert.ok(res.walletBalance <= 200);
    }

    const secondTry = ecoService.slut('guild_income', 'worker_1');
    assert.equal(secondTry.success, false);
    assert.equal(secondTry.cooldown, true);
  });
});
