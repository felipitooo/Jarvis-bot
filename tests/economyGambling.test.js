const { test, describe, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { DatabaseManager } = require('../src/database/connection');
const { Migrator } = require('../src/database/migrator');
const { GuildRepository } = require('../src/database/repositories/guildRepository');
const { UserRepository } = require('../src/database/repositories/userRepository');
const { EconomyRepository } = require('../src/database/repositories/economyRepository');
const { EconomyService } = require('../src/services/economyService');

describe('Economy System: Robbing & Virtual Gambling', () => {
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
    guildRepo.upsertGuild({ id: 'guild_casino', name: 'Casino Guild' });
    userRepo.upsertUser({ id: 'gambler_1', username: 'Gambler' });
    userRepo.upsertUser({ id: 'victim_1', username: 'Victim' });

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

  test('rob enforces requirements: self-rob, minimum balances and cooldown', () => {
    // 1. Self rob
    assert.throws(() => {
      ecoService.rob('guild_casino', 'gambler_1', 'gambler_1');
    }, /você mesmo/);

    // 2. Victim has 0 balance
    ecoRepo.updateBalances('guild_casino', 'gambler_1', { walletBalance: 100 });
    ecoRepo.updateBalances('guild_casino', 'victim_1', { walletBalance: 20 });
    assert.throws(() => {
      ecoService.rob('guild_casino', 'gambler_1', 'victim_1');
    }, /vítima está falida/);

    // 3. Robber has < 50 balance
    ecoRepo.updateBalances('guild_casino', 'gambler_1', { walletBalance: 20 });
    ecoRepo.updateBalances('guild_casino', 'victim_1', { walletBalance: 200 });
    assert.throws(() => {
      ecoService.rob('guild_casino', 'gambler_1', 'victim_1');
    }, /pelo menos/);

    // 4. Valid balances execute rob
    ecoRepo.updateBalances('guild_casino', 'gambler_1', { walletBalance: 100 });
    ecoRepo.updateBalances('guild_casino', 'victim_1', { walletBalance: 300 });

    const result = ecoService.rob('guild_casino', 'gambler_1', 'victim_1');
    assert.ok(typeof result.success === 'boolean');

    // 5. Robber is now on cooldown
    const secondAttempt = ecoService.rob('guild_casino', 'gambler_1', 'victim_1');
    assert.equal(secondAttempt.cooldown, true);
  });

  test('coinflip validates inputs and adjusts balances based on result', () => {
    ecoRepo.updateBalances('guild_casino', 'gambler_1', { walletBalance: 500 });

    // Invalid choice
    assert.throws(() => {
      ecoService.coinflip('guild_casino', 'gambler_1', 'invalido', 100);
    }, /Escolha inválida/);

    // Insufficient balance
    assert.throws(() => {
      ecoService.coinflip('guild_casino', 'gambler_1', 'cara', 1000);
    }, /Saldo insuficiente/);

    const res = ecoService.coinflip('guild_casino', 'gambler_1', 'cara', 100);
    assert.ok(res.coinResult === 'cara' || res.coinResult === 'coroa');
    if (res.success) {
      assert.equal(res.walletBalance, 600);
    } else {
      assert.equal(res.walletBalance, 400);
    }
  });

  test('dice validates 1-6 range and awards 6x on win', () => {
    ecoRepo.updateBalances('guild_casino', 'gambler_1', { walletBalance: 500 });

    // Invalid guess
    assert.throws(() => {
      ecoService.dice('guild_casino', 'gambler_1', 7, 50);
    }, /número de 1 a 6/);

    const res = ecoService.dice('guild_casino', 'gambler_1', 3, 50);
    assert.ok(res.diceResult >= 1 && res.diceResult <= 6);
    if (res.success) {
      assert.equal(res.netGain, 250); // 50 * 5 net profit
      assert.equal(res.walletBalance, 750);
    } else {
      assert.equal(res.netGain, -50);
      assert.equal(res.walletBalance, 450);
    }
  });

  test('slots returns symbols and adjusts balance according to match', () => {
    ecoRepo.updateBalances('guild_casino', 'gambler_1', { walletBalance: 500 });

    const res = ecoService.slots('guild_casino', 'gambler_1', 100);
    assert.ok(res.displayReels);
    assert.ok(typeof res.success === 'boolean');
    assert.ok(res.walletBalance >= 0);
  });

  test('gamble general roll adjusts balance', () => {
    ecoRepo.updateBalances('guild_casino', 'gambler_1', { walletBalance: 500 });

    const res = ecoService.gamble('guild_casino', 'gambler_1', 50);
    assert.ok(res.roll >= 1 && res.roll <= 100);
    if (res.success) {
      assert.equal(res.walletBalance, 550);
    } else {
      assert.equal(res.walletBalance, 450);
    }
  });
});
