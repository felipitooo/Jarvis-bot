const { test, describe, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { DatabaseManager } = require('../src/database/connection');
const { Migrator } = require('../src/database/migrator');
const { GuildRepository } = require('../src/database/repositories/guildRepository');
const { UserRepository } = require('../src/database/repositories/userRepository');
const { EconomyRepository } = require('../src/database/repositories/economyRepository');
const { EconomyService } = require('../src/services/economyService');

describe('Economy Debt & Negative Balances System', () => {
  let db;
  let ecoRepo;
  let ecoService;
  const guildId = 'guild_debt_test';

  beforeEach(() => {
    db = new DatabaseManager(':memory:');
    db.connect();

    const migrator = new Migrator(db, path.join(__dirname, '../src/database/migrations'));
    migrator.runPendingMigrations();

    const guildRepo = new GuildRepository(db);
    const userRepo = new UserRepository(db);
    guildRepo.upsertGuild({ id: guildId, name: 'Debt Test Guild' });
    userRepo.upsertUser({ id: 'debtor_1', username: 'Debtor' });
    userRepo.upsertUser({ id: 'criminal_1', username: 'Criminal' });
    userRepo.upsertUser({ id: 'gig_worker_1', username: 'GigWorker' });
    userRepo.upsertUser({ id: 'robber_1', username: 'Robber' });
    userRepo.upsertUser({ id: 'victim_1', username: 'Victim' });
    userRepo.upsertUser({ id: 'worker_debt', username: 'WorkerDebt' });
    userRepo.upsertUser({ id: 'daily_debt', username: 'DailyDebt' });
    userRepo.upsertUser({ id: 'gambler_debt', username: 'GamblerDebt' });
    userRepo.upsertUser({ id: 'saver_debt', username: 'SaverDebt' });

    ecoRepo = new EconomyRepository(db);
    ecoRepo.db.run(
      `INSERT INTO economy_guild_configs (guild_id, crime_success_rate, slut_success_rate, rob_success_rate)
       VALUES (?, 0.6, 0.65, 0.45)`,
      [guildId]
    );

    ecoService = new EconomyService({
      economyRepo: ecoRepo,
      identityService: { getDisplayName: () => 'Jarvis' }
    });
  });

  afterEach(() => {
    if (db && db.isConnected) {
      db.close();
    }
  });

  test('getBalance accurately reports debt status and debt amount when wallet is negative', () => {
    ecoRepo.updateBalances(guildId, 'debtor_1', { walletBalance: -250, bankBalance: 0 });
    const bal = ecoService.getBalance(guildId, 'debtor_1');

    assert.equal(bal.walletBalance, -250);
    assert.equal(bal.isDebt, true);
    assert.equal(bal.debtAmount, 250);
    assert.equal(bal.totalBalance, -250);
  });

  test('failing a crime with zero or insufficient funds plunges member into debt', () => {
    ecoRepo.updateBalances(guildId, 'criminal_1', { walletBalance: 20, bankBalance: 0 });
    
    // Force crime fail
    ecoRepo.db.run(
      'UPDATE economy_guild_configs SET crime_success_rate = 0 WHERE guild_id = ?',
      [guildId]
    );

    const res = ecoService.crime(guildId, 'criminal_1');
    assert.equal(res.success, false);
    assert.ok(res.fine >= 100);
    assert.ok(res.walletBalance < 0, `Expected negative wallet, got ${res.walletBalance}`);
    assert.ok(res.message.includes('ENDIVIDADO'));
  });

  test('failing a slut/bico with zero funds causes negative wallet balance', () => {
    ecoRepo.updateBalances(guildId, 'gig_worker_1', { walletBalance: 0, bankBalance: 0 });

    ecoRepo.db.run(
      'UPDATE economy_guild_configs SET slut_success_rate = 0 WHERE guild_id = ?',
      [guildId]
    );

    const res = ecoService.slut(guildId, 'gig_worker_1');
    assert.equal(res.success, false);
    assert.ok(res.fine >= 50);
    assert.ok(res.walletBalance < 0);
    assert.ok(res.message.includes('dívida'));
  });

  test('failing a robbery charges compensation to victim and drives robber into debt', () => {
    // Robber has 50 (minimum to attempt), victim has 800
    ecoRepo.updateBalances(guildId, 'robber_1', { walletBalance: 50, bankBalance: 0 });
    ecoRepo.updateBalances(guildId, 'victim_1', { walletBalance: 800, bankBalance: 0 });

    // Force rob fail
    ecoRepo.db.run(
      'UPDATE economy_guild_configs SET rob_success_rate = 0 WHERE guild_id = ?',
      [guildId]
    );

    const res = ecoService.rob(guildId, 'robber_1', 'victim_1');
    assert.equal(res.success, false);
    assert.ok(res.fine >= 120);
    assert.ok(res.walletBalance < 0, `Robber wallet should be negative: ${res.walletBalance}`);
    assert.ok(res.message.includes('ENDIVIDADO'));

    // Victim received full compensation
    const victimBal = ecoService.getBalance(guildId, 'victim_1');
    assert.equal(victimBal.walletBalance, 800 + res.fine);
  });

  test('working while in debt reduces debt and notifies member', () => {
    ecoRepo.updateBalances(guildId, 'worker_debt', { walletBalance: -100, bankBalance: 0 });

    const res = ecoService.work(guildId, 'worker_debt');
    assert.equal(res.success, true);
    assert.ok(res.walletBalance > -100);
    assert.ok(res.message.includes('Dívida'));
  });

  test('daily and weekly rewards while in debt reduce debt', () => {
    ecoRepo.updateBalances(guildId, 'daily_debt', { walletBalance: -1000, bankBalance: 0 });

    const resDaily = ecoService.daily(guildId, 'daily_debt');
    assert.equal(resDaily.success, true);
    assert.equal(resDaily.walletBalance, -1000 + 500); // default daily is 500
    assert.ok(resDaily.message.includes('Dívida'));
  });

  test('gambling while in debt is strictly blocked', () => {
    ecoRepo.updateBalances(guildId, 'gambler_debt', { walletBalance: -150, bankBalance: 0 });

    assert.throws(() => {
      ecoService.coinflip(guildId, 'gambler_debt', 'cara', 50);
    }, /endividado/i);

    assert.throws(() => {
      ecoService.dice(guildId, 'gambler_debt', 3, 50);
    }, /endividado/i);

    assert.throws(() => {
      ecoService.slots(guildId, 'gambler_debt', 50);
    }, /endividado/i);

    assert.throws(() => {
      ecoService.gamble(guildId, 'gambler_debt', 50);
    }, /endividado/i);
  });

  test('withdrawing from bank while in debt pays off wallet debt', () => {
    ecoRepo.updateBalances(guildId, 'saver_debt', { walletBalance: -100, bankBalance: 500 });

    const res = ecoService.withdraw(guildId, 'saver_debt', 100);
    assert.equal(res.walletBalance, 0);
    assert.equal(res.bankBalance, 400);

    const bal = ecoService.getBalance(guildId, 'saver_debt');
    assert.equal(bal.walletBalance, 0);
    assert.equal(bal.isDebt, false);
  });
});
