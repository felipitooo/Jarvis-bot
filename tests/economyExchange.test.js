const { test, describe, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { DatabaseManager } = require('../src/database/connection');
const { Migrator } = require('../src/database/migrator');
const { GuildRepository } = require('../src/database/repositories/guildRepository');
const { EconomyRepository } = require('../src/database/repositories/economyRepository');
const { EconomyService } = require('../src/services/economyService');
const { formatCompactNumber } = require('../src/utils/numberFormatter');

describe('Economy System: Compact Number Formatter & Currency Exchange', () => {
  let db;
  let ecoRepo;
  let ecoService;
  const guildId = 'guild_exchange_test';
  const userId = 'user_trillionaire';

  beforeEach(() => {
    db = new DatabaseManager(':memory:');
    db.connect();
    const migrator = new Migrator(db, path.resolve(__dirname, '../src/database/migrations'));
    migrator.runPendingMigrations();

    const guildRepo = new GuildRepository(db);
    guildRepo.upsertGuild({ id: guildId, name: 'Stark Economy Guild' });

    ecoRepo = new EconomyRepository(db);
    ecoService = new EconomyService({ economyRepo: ecoRepo, identityService: null });
  });

  afterEach(() => {
    db.close();
  });

  describe('Compact Number Formatter', () => {
    test('formats regular numbers below 1 million with standard pt-BR formatting', () => {
      assert.equal(formatCompactNumber(500), '500');
      assert.equal(formatCompactNumber(12500), '12.500');
      assert.equal(formatCompactNumber(999999), '999.999');
    });

    test('formats millions, billions, trillions and quadrillions compactly', () => {
      assert.equal(formatCompactNumber(1000000), '1M');
      assert.equal(formatCompactNumber(1500000), '1,5M');
      assert.equal(formatCompactNumber(2500000000), '2,5B');
      assert.equal(formatCompactNumber(1000000000000), '1T');
      assert.equal(formatCompactNumber(10500000000000), '10,5T');
      assert.equal(formatCompactNumber(1000000000000000), '1Qa');
    });

    test('properly handles negative numbers (debt)', () => {
      assert.equal(formatCompactNumber(-5000), '-5.000');
      assert.equal(formatCompactNumber(-1500000), '-1,5M');
      assert.equal(formatCompactNumber(-2000000000), '-2B');
    });
  });

  describe('Exchange Currencies (Câmbio / Moedas de Prestígio)', () => {
    test('creates, lists, and retrieves exchange currencies', () => {
      const gold = ecoRepo.createExchangeCurrency(guildId, {
        name: 'Barra de Ouro',
        code: 'ouro',
        symbol: '🏆',
        rate: 1000000,
        description: 'Ativo de ouro fino para preservar riqueza'
      });

      assert.ok(gold.id);
      assert.equal(gold.name, 'Barra de Ouro');
      assert.equal(gold.code, 'ouro');
      assert.equal(gold.rate, 1000000);
      assert.equal(gold.isActive, true);

      const list = ecoRepo.listExchangeCurrencies(guildId);
      assert.equal(list.length, 1);
      assert.equal(list[0].code, 'ouro');

      const byCode = ecoRepo.getExchangeCurrencyByCode(guildId, 'OURO');
      assert.ok(byCode);
      assert.equal(byCode.id, gold.id);
    });

    test('buying exchange currency converts base coins into prestige currency', () => {
      // 1. Create prestige currency: 1 Gema = 500.000 moedas
      ecoRepo.createExchangeCurrency(guildId, {
        name: 'Gema Cósmica',
        code: 'gema',
        symbol: '💎',
        rate: 500000
      });

      // 2. Give user 1.500.000 coins in wallet
      ecoRepo.updateBalances(guildId, userId, { walletBalance: 1500000 });

      // 3. Buy 2 Gemas (Cost: 1.000.000 moedas)
      const res = ecoService.buyExchangeCurrency(guildId, userId, 'gema', 2);
      assert.equal(res.quantity, 2);
      assert.equal(res.totalCost, 1000000);
      assert.equal(res.remainingWallet, 500000);
      assert.equal(res.newCurrencyBalance, 2);

      // Verify wallet updated in DB
      const account = ecoRepo.getOrCreateAccount(guildId, userId);
      assert.equal(account.walletBalance, 500000);

      // Verify holdings
      const userCurrencies = ecoRepo.getUserExchangeCurrencies(guildId, userId);
      assert.equal(userCurrencies.length, 1);
      assert.equal(userCurrencies[0].name, 'Gema Cósmica');
      assert.equal(userCurrencies[0].amount, 2);
      assert.equal(userCurrencies[0].totalValue, 1000000);
    });

    test('buying exchange currency throws error on insufficient funds', () => {
      ecoRepo.createExchangeCurrency(guildId, {
        name: 'Diamante Stark',
        code: 'diamante',
        symbol: '💎',
        rate: 10000000
      });

      ecoRepo.updateBalances(guildId, userId, { walletBalance: 500 });

      assert.throws(() => {
        ecoService.buyExchangeCurrency(guildId, userId, 'diamante', 1);
      }, /Saldo insuficiente/);
    });

    test('selling exchange currency converts prestige currency back into base coins', () => {
      const cur = ecoRepo.createExchangeCurrency(guildId, {
        name: 'Barra de Platina',
        code: 'platina',
        symbol: '🪙',
        rate: 2000000
      });

      ecoRepo.updateBalances(guildId, userId, { walletBalance: 100000 });
      ecoRepo.addUserCurrencyBalance(guildId, userId, cur.id, 5);

      // Sell 2 Barras de Platina (gain: 4.000.000 moedas)
      const res = ecoService.sellExchangeCurrency(guildId, userId, 'platina', 2);
      assert.equal(res.quantity, 2);
      assert.equal(res.totalGained, 4000000);
      assert.equal(res.newWallet, 4100000);
      assert.equal(res.remainingCurrencyBalance, 3);

      // Sell all remaining (3)
      const resAll = ecoService.sellExchangeCurrency(guildId, userId, 'platina', 'all');
      assert.equal(resAll.quantity, 3);
      assert.equal(resAll.totalGained, 6000000);
      assert.equal(resAll.remainingCurrencyBalance, 0);
    });

    test('getBalance includes exchange currencies and net worth calculation', () => {
      const cur = ecoRepo.createExchangeCurrency(guildId, {
        name: 'Gema Estelar',
        code: 'estelar',
        symbol: '⭐',
        rate: 1000000
      });

      ecoRepo.updateBalances(guildId, userId, { walletBalance: 200000, bankBalance: 300000 });
      ecoRepo.addUserCurrencyBalance(guildId, userId, cur.id, 3); // 3 * 1.000.000 = 3.000.000

      const balance = ecoService.getBalance(guildId, userId);
      assert.equal(balance.walletBalance, 200000);
      assert.equal(balance.bankBalance, 300000);
      assert.equal(balance.totalBalance, 500000);
      assert.equal(balance.exchangeAssetsValue, 3000000);
      assert.equal(balance.totalNetWorth, 3500000);
      assert.equal(balance.userCurrencies.length, 1);
      assert.equal(balance.userCurrencies[0].amount, 3);
    });
  });
});
