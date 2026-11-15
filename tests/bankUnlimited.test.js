const { test, describe, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { DatabaseManager } = require('../src/database/connection');
const { Migrator } = require('../src/database/migrator');
const { GuildRepository } = require('../src/database/repositories/guildRepository');
const { UserRepository } = require('../src/database/repositories/userRepository');
const { EconomyRepository } = require('../src/database/repositories/economyRepository');
const { EconomyService } = require('../src/services/economyService');

describe('Bank Unlimited Storage System', () => {
  let db;
  let economyRepo;
  let economyService;
  const guildId = 'test_guild_unlimited';
  const userId = 'test_user_rich';

  beforeEach(() => {
    db = new DatabaseManager(':memory:');
    db.connect();
    const migrator = new Migrator(db, path.resolve(__dirname, '../src/database/migrations'));
    migrator.runPendingMigrations();

    const guildRepo = new GuildRepository(db);
    const userRepo = new UserRepository(db);
    guildRepo.upsertGuild({ id: guildId, name: 'Bank Test Guild' });
    userRepo.upsertUser({ id: userId, username: 'RichUser' });

    economyRepo = new EconomyRepository(db);
    economyService = new EconomyService({
      economyRepo,
      identityService: { getDisplayName: () => 'Jarvis' }
    });
  });

  afterEach(() => {
    if (db) db.close();
  });

  test('upsertGuildConfig and getGuildConfig properly handle bankUnlimited flag', () => {
    // Default is false
    const config = economyRepo.getGuildConfig(guildId);
    assert.strictEqual(config.bankUnlimited, false);

    // Update to true
    economyRepo.upsertGuildConfig(guildId, { bankUnlimited: true });
    const updated = economyRepo.getGuildConfig(guildId);
    assert.strictEqual(updated.bankUnlimited, true);

    // Update back to false
    economyRepo.upsertGuildConfig(guildId, { bankUnlimited: false });
    const reverted = economyRepo.getGuildConfig(guildId);
    assert.strictEqual(reverted.bankUnlimited, false);
  });

  test('getBalance reports isBankUnlimited and formattedCapacity correctly', () => {
    // Limited mode with starting capacity 5000
    let balance = economyService.getBalance(guildId, userId);
    assert.strictEqual(balance.isBankUnlimited, false);
    assert.strictEqual(balance.bankCapacity, 5000);

    // Unlimited mode
    economyRepo.upsertGuildConfig(guildId, { bankUnlimited: true });
    balance = economyService.getBalance(guildId, userId);
    assert.strictEqual(balance.isBankUnlimited, true);
    assert.strictEqual(balance.formattedCapacity, '♾️ Ilimitada');
  });

  test('deposit rejects excess in limited mode, but accepts unlimited amount in bankUnlimited mode', () => {
    // Give user 1,000,000 in wallet and limited bank capacity of 5,000
    economyRepo.updateBalances(guildId, userId, { walletBalance: 1000000, bankCapacity: 5000 });

    // In limited mode (capacity 5000): depositing 10,000 throws error
    assert.throws(
      () => economyService.deposit(guildId, userId, 10000),
      /Capacidade do banco excedida/
    );

    // Enable bankUnlimited mode
    economyRepo.upsertGuildConfig(guildId, { bankUnlimited: true });

    // Now depositing 100,000 succeeds
    const result = economyService.deposit(guildId, userId, 100000);
    assert.strictEqual(result.amount, 100000);
    assert.strictEqual(result.bankBalance, 100000);
    assert.strictEqual(result.walletBalance, 900000);

    // Depositing 'all' deposits entire remaining 900,000 without hitting any capacity limits
    const depAllResult = economyService.deposit(guildId, userId, 'all');
    assert.strictEqual(depAllResult.amount, 900000);
    assert.strictEqual(depAllResult.bankBalance, 1000000);
    assert.strictEqual(depAllResult.walletBalance, 0);
  });
});
