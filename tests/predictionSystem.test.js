const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { DatabaseManager } = require('../src/database/connection');
const { Migrator } = require('../src/database/migrator');
const { PredictionService } = require('../src/services/predictionService');
const { PrefixCommandHandler } = require('../src/handlers/prefixCommandHandler');

describe('Server Prediction Betting Pool (Bolão) (v6.3)', () => {
  let dbManager;
  let predictionService;
  let mockEconomyService;
  let balances;

  beforeEach(() => {
    dbManager = new DatabaseManager();
    dbManager.connect(':memory:');
    new Migrator(dbManager).runPendingMigrations();
    predictionService = new PredictionService(dbManager);

    balances = {
      user1: 1000,
      user2: 1000,
      user3: 500
    };

    mockEconomyService = {
      getBalance: (guildId, userId) => ({ walletBalance: balances[userId] || 0 }),
      removeBalance: (guildId, userId, amount) => {
        balances[userId] = (balances[userId] || 0) - amount;
      },
      addBalance: (guildId, userId, amount) => {
        balances[userId] = (balances[userId] || 0) + amount;
      }
    };
  });

  it('creates an open prediction and blocks opening a second while active', () => {
    const pred = predictionService.createPrediction('g1', 'user1', 'Flamengo vai ser campeão hoje?');
    assert.equal(pred.title, 'Flamengo vai ser campeão hoje?');
    assert.equal(pred.status, 'OPEN');
    assert.equal(pred.total_pool, 0);

    assert.throws(() => {
      predictionService.createPrediction('g1', 'user2', 'Outro bolão simultâneo');
    }, /Já existe um bolão ativo/);
  });

  it('places bets on SIM and NAO, updating pool and balances', () => {
    const pred = predictionService.createPrediction('g1', 'user1', 'Vai chover hoje à noite?');

    const bet1 = predictionService.placeBet('g1', 'user1', 'SIM', 200, mockEconomyService);
    assert.equal(bet1.choice, 'SIM');
    assert.equal(bet1.amount, 200);
    assert.equal(balances.user1, 800);

    const bet2 = predictionService.placeBet('g1', 'user2', 'NAO', 300, mockEconomyService);
    assert.equal(bet2.choice, 'NAO');
    assert.equal(bet2.amount, 300);
    assert.equal(balances.user2, 700);

    const active = predictionService.getActivePrediction('g1');
    assert.equal(active.total_pool, 500);
    assert.equal(active.poolSim, 200);
    assert.equal(active.poolNao, 300);
    assert.equal(active.betsCount, 2);
  });

  it('prevents multiple bets from the same user in one prediction', () => {
    predictionService.createPrediction('g1', 'user1', 'O time vai ganhar?');
    predictionService.placeBet('g1', 'user1', 'SIM', 100, mockEconomyService);

    assert.throws(() => {
      predictionService.placeBet('g1', 'user1', 'SIM', 50, mockEconomyService);
    }, /Você já apostou/);
  });

  it('locks a prediction preventing subsequent bets', () => {
    predictionService.createPrediction('g1', 'user1', 'Quem vai vencer?');
    predictionService.placeBet('g1', 'user1', 'SIM', 100, mockEconomyService);

    const locked = predictionService.lockPrediction('g1', 'user1', false);
    assert.equal(locked.status, 'LOCKED');

    assert.throws(() => {
      predictionService.placeBet('g1', 'user2', 'NAO', 100, mockEconomyService);
    }, /já foram travadas/);
  });

  it('resolves prediction and distributes pool proportionally to winners', () => {
    predictionService.createPrediction('g1', 'user1', 'Jogo da final');
    // user1 bets 200 on SIM, user2 bets 200 on SIM, user3 bets 600 on NAO (total pool = 1000)
    predictionService.placeBet('g1', 'user1', 'SIM', 200, mockEconomyService);
    predictionService.placeBet('g1', 'user2', 'SIM', 200, mockEconomyService);
    balances.user3 = 600;
    predictionService.placeBet('g1', 'user3', 'NAO', 600, mockEconomyService);

    assert.equal(balances.user1, 800);
    assert.equal(balances.user2, 800);
    assert.equal(balances.user3, 0);

    // Outcome: SIM wins! Total pool of 1000 is split between user1 (50%) and user2 (50%) -> 500 each
    const result = predictionService.resolvePrediction('g1', 'SIM', 'user1', false, mockEconomyService);
    assert.equal(result.winningChoice, 'SIM');
    assert.equal(result.totalPool, 1000);
    assert.equal(result.winnersCount, 2);

    assert.equal(balances.user1, 1300); // 800 + 500
    assert.equal(balances.user2, 1300); // 800 + 500
    assert.equal(balances.user3, 0);    // Lost
  });

  it('cancels prediction and refunds all participants', () => {
    predictionService.createPrediction('g1', 'user1', 'Evento adiado');
    predictionService.placeBet('g1', 'user1', 'SIM', 200, mockEconomyService);
    predictionService.placeBet('g1', 'user2', 'NAO', 300, mockEconomyService);

    assert.equal(balances.user1, 800);
    assert.equal(balances.user2, 700);

    const cancelResult = predictionService.cancelPrediction('g1', 'user1', false, mockEconomyService);
    assert.equal(cancelResult.refundCount, 2);
    assert.equal(cancelResult.totalRefunded, 500);

    assert.equal(balances.user1, 1000);
    assert.equal(balances.user2, 1000);
  });

  it('executes +bolao prefix commands end-to-end', async () => {
    const handler = new PrefixCommandHandler('+');
    let replies = [];

    const createMessage = (content, userId = 'user1') => ({
      content,
      guild: { id: 'g1' },
      author: { id: userId, username: userId },
      member: { permissions: { has: () => true } },
      reply: async (msg) => {
        replies.push(msg);
        return msg;
      }
    });

    const context = {
      predictionService,
      economyService: mockEconomyService,
      identityService: { getDisplayName: () => 'J.A.R.V.I.S.' }
    };

    // 1. +bolao criar
    await handler.handle(createMessage('+bolao criar O time vai ser campeão?'), context);
    assert.ok(replies[0]?.embeds?.[0]?.data?.title?.includes('Novo Bolão Aberto'));

    // 2. +bolao apostar
    await handler.handle(createMessage('+bolao apostar sim 100'), context);
    assert.ok(replies[1].includes('Aposta Confirmada'));

    // 3. +bolao (view)
    await handler.handle(createMessage('+bolao'), context);
    assert.ok(replies[2]?.embeds?.[0]?.data?.title?.includes('Bolão Ativo'));

    // 4. +bolao finalizar
    await handler.handle(createMessage('+bolao finalizar sim'), context);
    assert.ok(replies[3]?.embeds?.[0]?.data?.title?.includes('Bolão Finalizado'));
  });
});
