const { test, describe, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { DatabaseManager } = require('../src/database/connection');
const { Migrator } = require('../src/database/migrator');
const { GuildRepository } = require('../src/database/repositories/guildRepository');
const { UserRepository } = require('../src/database/repositories/userRepository');
const { EconomyRepository } = require('../src/database/repositories/economyRepository');
const { EconomyService } = require('../src/services/economyService');

describe('Economy System: Admin Controls, Reset & Leaderboards', () => {
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
    guildRepo.upsertGuild({ id: 'guild_admin', name: 'Federal Guild' });
    userRepo.upsertUser({ id: 'admin_user', username: 'Governor' });
    userRepo.upsertUser({ id: 'target_user_1', username: 'Citizen1' });
    userRepo.upsertUser({ id: 'target_user_2', username: 'Citizen2' });

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

  test('admin adjustments modify wallet and bank balances accurately', () => {
    // Add to wallet
    const addRes = ecoService.adminAdjust('guild_admin', 'target_user_1', 'wallet', 'add', 500, 'admin_user');
    assert.equal(addRes.walletBalance, 500);

    // Add to bank
    const addBankRes = ecoService.adminAdjust('guild_admin', 'target_user_1', 'bank', 'add', 1000, 'admin_user');
    assert.equal(addBankRes.bankBalance, 1000);

    // Remove from wallet
    const remRes = ecoService.adminAdjust('guild_admin', 'target_user_1', 'wallet', 'remove', 200, 'admin_user');
    assert.equal(remRes.walletBalance, 300);

    // Set wallet
    const setRes = ecoService.adminAdjust('guild_admin', 'target_user_1', 'wallet', 'set', 750, 'admin_user');
    assert.equal(setRes.walletBalance, 750);
  });

  test('updating guild economy configuration modifies rules and defaults', () => {
    const updated = ecoService.updateConfig('guild_admin', {
      currencyName: 'Bitcoins',
      currencySymbol: '₿',
      workMin: 100,
      workMax: 300,
      dailyAmount: 1000
    });

    assert.equal(updated.currencyName, 'Bitcoins');
    assert.equal(updated.currencySymbol, '₿');
    assert.equal(updated.workMin, 100);
    assert.equal(updated.dailyAmount, 1000);

    const reloaded = ecoRepo.getGuildConfig('guild_admin');
    assert.equal(reloaded.currencyName, 'Bitcoins');
    assert.equal(reloaded.currencySymbol, '₿');
  });

  test('leaderboard returns members sorted by total wealth and ranks accurately', () => {
    ecoRepo.updateBalances('guild_admin', 'target_user_1', { walletBalance: 100, bankBalance: 900 }); // total 1000
    ecoRepo.updateBalances('guild_admin', 'target_user_2', { walletBalance: 2000, bankBalance: 500 }); // total 2500

    const board = ecoService.getLeaderboard('guild_admin', 10);
    assert.equal(board.length, 2);
    assert.equal(board[0].userId, 'target_user_2'); // highest total
    assert.equal(board[0].totalBalance, 2500);
    assert.equal(board[0].rank, 1);

    assert.equal(board[1].userId, 'target_user_1');
    assert.equal(board[1].totalBalance, 1000);
    assert.equal(board[1].rank, 2);

    // Member rank lookup
    const rankUser1 = ecoRepo.getMemberRank('guild_admin', 'target_user_1');
    assert.equal(rankUser1, 2);
    const rankUser2 = ecoRepo.getMemberRank('guild_admin', 'target_user_2');
    assert.equal(rankUser2, 1);
  });

  test('resetting individual member or entire guild cleans economy data', () => {
    ecoRepo.updateBalances('guild_admin', 'target_user_1', { walletBalance: 500, bankBalance: 500 });
    ecoRepo.setCooldown('guild_admin', 'target_user_1', 'work');

    // Reset member
    ecoService.adminReset('guild_admin', 'target_user_1', 'admin_user');
    const acc = ecoRepo.getAccount('guild_admin', 'target_user_1');
    assert.equal(acc, null);

    const cd = ecoRepo.getCooldown('guild_admin', 'target_user_1', 'work');
    assert.equal(cd, null);

    // Reset whole guild
    ecoRepo.updateBalances('guild_admin', 'target_user_2', { walletBalance: 800 });
    ecoService.adminReset('guild_admin', null, 'admin_user');
    const acc2 = ecoRepo.getAccount('guild_admin', 'target_user_2');
    assert.equal(acc2, null);
  });
});
