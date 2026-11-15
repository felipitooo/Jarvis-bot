const { test, describe, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { DatabaseManager } = require('../src/database/connection');
const { Migrator } = require('../src/database/migrator');
const { GuildRepository } = require('../src/database/repositories/guildRepository');
const { UserRepository } = require('../src/database/repositories/userRepository');
const { EconomyRepository } = require('../src/database/repositories/economyRepository');
const { EconomyService } = require('../src/services/economyService');

describe('Economy System: Shop, Inventory & Role Rewards', () => {
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
    guildRepo.upsertGuild({ id: 'guild_mall', name: 'Shopping Mall' });
    userRepo.upsertUser({ id: 'shopper_1', username: 'Shopper' });

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

  test('shop items can be created, listed, and deleted', () => {
    const item1 = ecoService.createShopItem('guild_mall', {
      name: 'Espada Lendária',
      description: 'Uma arma de alto valor',
      price: 300,
      stock: 5,
      roleId: 'role_warrior'
    });

    const item2 = ecoService.createShopItem('guild_mall', {
      name: 'Poção de Cura',
      description: 'Recupera vitalidade',
      price: 50,
      stock: -1
    });

    assert.ok(item1.id > 0);
    assert.ok(item2.id > 0);

    const catalog = ecoService.getShop('guild_mall');
    assert.equal(catalog.length, 2);
    assert.equal(catalog[0].name, 'Poção de Cura'); // sorted by price asc

    // Delete item
    const deleted = ecoService.deleteShopItem('guild_mall', item1.id);
    assert.equal(deleted, true);

    const updatedCatalog = ecoService.getShop('guild_mall');
    assert.equal(updatedCatalog.length, 1);
  });

  test('purchasing shop item deducts balance, tracks stock and adds to inventory', async () => {
    ecoRepo.updateBalances('guild_mall', 'shopper_1', { walletBalance: 1000 });
    const item = ecoService.createShopItem('guild_mall', {
      name: 'Passe VIP',
      price: 250,
      stock: 2,
      roleId: 'role_vip'
    });

    // Mock discord member with roles.add
    let roleAdded = null;
    const mockMember = {
      id: 'shopper_1',
      roles: {
        add: async (id) => { roleAdded = id; }
      }
    };

    const res = await ecoService.buyShopItem('guild_mall', 'shopper_1', item.name, 1, mockMember);
    assert.equal(res.quantity, 1);
    assert.equal(res.totalCost, 250);
    assert.equal(res.walletBalance, 750);
    assert.equal(res.roleAssigned, true);
    assert.equal(roleAdded, 'role_vip');

    // Check inventory
    const inv = ecoService.getUserInventory('guild_mall', 'shopper_1');
    assert.equal(inv.length, 1);
    assert.equal(inv[0].name, 'Passe VIP');
    assert.equal(inv[0].quantity, 1);

    // Stock should be 1 remaining
    const shopItem = ecoRepo.getShopItem('guild_mall', item.id);
    assert.equal(shopItem.stock, 1);

    // Buying 2 when only 1 is left should fail
    await assert.rejects(async () => {
      await ecoService.buyShopItem('guild_mall', 'shopper_1', item.id, 2);
    }, /Estoque insuficiente/);
  });

  test('selling inventory item refunds 50% and decrements quantity', async () => {
    ecoRepo.updateBalances('guild_mall', 'shopper_1', { walletBalance: 500 });
    const item = ecoService.createShopItem('guild_mall', {
      name: 'Anel Mágico',
      price: 100,
      stock: -1
    });

    // Buy 2 rings
    await ecoService.buyShopItem('guild_mall', 'shopper_1', item.id, 2);
    let inv = ecoService.getUserInventory('guild_mall', 'shopper_1');
    assert.equal(inv[0].quantity, 2);

    // Sell 1 ring (refund = 50 coins)
    const sellRes = ecoService.sellInventoryItem('guild_mall', 'shopper_1', item.name, 1);
    assert.equal(sellRes.totalRefund, 50);

    inv = ecoService.getUserInventory('guild_mall', 'shopper_1');
    assert.equal(inv[0].quantity, 1);

    // Sell remaining 1 ring (inventory row should be removed)
    ecoService.sellInventoryItem('guild_mall', 'shopper_1', item.name, 1);
    inv = ecoService.getUserInventory('guild_mall', 'shopper_1');
    assert.equal(inv.length, 0);

    // Attempting to sell when 0 owned should throw error
    assert.throws(() => {
      ecoService.sellInventoryItem('guild_mall', 'shopper_1', item.name, 1);
    }, /não possui quantidade suficiente/);
  });
});
