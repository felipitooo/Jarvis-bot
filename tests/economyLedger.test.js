const { test, describe, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { DatabaseManager } = require('../src/database/connection');
const { Migrator } = require('../src/database/migrator');
const { GuildRepository } = require('../src/database/repositories/guildRepository');
const { UserRepository } = require('../src/database/repositories/userRepository');
const { EconomyRepository } = require('../src/database/repositories/economyRepository');
const { EconomyService } = require('../src/services/economyService');

describe('Economy System: Accounts, Ledger & Banking', () => {
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
    guildRepo.upsertGuild({ id: 'guild_eco_1', name: 'Banco Central Guild' });
    userRepo.upsertUser({ id: 'user_alice', username: 'Alice' });
    userRepo.upsertUser({ id: 'user_bob', username: 'Bob' });

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

  test('default account has zero balances and default bank capacity', () => {
    const acc = ecoRepo.getOrCreateAccount('guild_eco_1', 'user_alice');
    assert.equal(acc.walletBalance, 0);
    assert.equal(acc.bankBalance, 0);
    assert.equal(acc.bankCapacity, 10000);
    assert.equal(acc.totalBalance, 0);
  });

  test('depositing moves funds from wallet to bank up to capacity', () => {
    // Seed wallet with 500
    ecoRepo.updateBalances('guild_eco_1', 'user_alice', { walletBalance: 500, bankBalance: 0 });

    const res = ecoService.deposit('guild_eco_1', 'user_alice', 200);
    assert.equal(res.amount, 200);
    assert.equal(res.walletBalance, 300);
    assert.equal(res.bankBalance, 200);

    // Deposit "all"
    const resAll = ecoService.deposit('guild_eco_1', 'user_alice', 'all');
    assert.equal(resAll.amount, 300);
    assert.equal(resAll.walletBalance, 0);
    assert.equal(resAll.bankBalance, 500);

    // Verify ledger
    const txs = ecoRepo.getRecentTransactions('guild_eco_1', 'user_alice');
    assert.equal(txs.length, 2);
    assert.equal(txs[0].type, 'DEPOSIT');
    assert.equal(txs[0].amount, 300);
  });

  test('deposit fails when wallet is insufficient or bank capacity is exceeded', () => {
    ecoRepo.updateBalances('guild_eco_1', 'user_alice', { walletBalance: 100, bankBalance: 9950, bankCapacity: 10000 });

    // Attempting to deposit more than wallet
    assert.throws(() => {
      ecoService.deposit('guild_eco_1', 'user_alice', 200);
    }, /Saldo insuficiente/);

    // Attempting to deposit more than remaining bank capacity (only 50 remaining capacity)
    assert.throws(() => {
      ecoService.deposit('guild_eco_1', 'user_alice', 80);
    }, /Capacidade do banco excedida/);
  });

  test('withdrawing moves funds from bank to wallet', () => {
    ecoRepo.updateBalances('guild_eco_1', 'user_alice', { walletBalance: 50, bankBalance: 300 });

    const res = ecoService.withdraw('guild_eco_1', 'user_alice', 100);
    assert.equal(res.amount, 100);
    assert.equal(res.walletBalance, 150);
    assert.equal(res.bankBalance, 200);

    // Withdraw "all"
    const resAll = ecoService.withdraw('guild_eco_1', 'user_alice', 'all');
    assert.equal(resAll.amount, 200);
    assert.equal(resAll.walletBalance, 350);
    assert.equal(resAll.bankBalance, 0);

    // Verify ledger
    const txs = ecoRepo.getRecentTransactions('guild_eco_1', 'user_alice');
    assert.equal(txs[0].type, 'WITHDRAW');
    assert.equal(txs[0].amount, 200);
  });

  test('withdrawing fails when bank balance is insufficient', () => {
    ecoRepo.updateBalances('guild_eco_1', 'user_alice', { walletBalance: 0, bankBalance: 50 });

    assert.throws(() => {
      ecoService.withdraw('guild_eco_1', 'user_alice', 100);
    }, /Saldo insuficiente no banco/);
  });

  test('transferring atomically moves wallet funds between two users', () => {
    ecoRepo.updateBalances('guild_eco_1', 'user_alice', { walletBalance: 400 });
    ecoRepo.updateBalances('guild_eco_1', 'user_bob', { walletBalance: 50 });

    const res = ecoService.transfer('guild_eco_1', 'user_alice', 'user_bob', 150);
    assert.equal(res.amount, 150);
    assert.equal(res.senderWallet, 250);
    assert.equal(res.recipientWallet, 200);

    const aliceAcc = ecoRepo.getAccount('guild_eco_1', 'user_alice');
    const bobAcc = ecoRepo.getAccount('guild_eco_1', 'user_bob');
    assert.equal(aliceAcc.walletBalance, 250);
    assert.equal(bobAcc.walletBalance, 200);

    // Verify ledger records for both
    const aliceTxs = ecoRepo.getRecentTransactions('guild_eco_1', 'user_alice');
    const bobTxs = ecoRepo.getRecentTransactions('guild_eco_1', 'user_bob');
    assert.equal(aliceTxs[0].type, 'TRANSFER_SEND');
    assert.equal(bobTxs[0].type, 'TRANSFER_RECEIVE');
  });

  test('transferring fails on self-transfer or insufficient funds', () => {
    ecoRepo.updateBalances('guild_eco_1', 'user_alice', { walletBalance: 100 });

    assert.throws(() => {
      ecoService.transfer('guild_eco_1', 'user_alice', 'user_alice', 50);
    }, /para você mesmo/);

    assert.throws(() => {
      ecoService.transfer('guild_eco_1', 'user_alice', 'user_bob', 500);
    }, /Saldo insuficiente/);
  });
});
