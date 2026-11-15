const { test, describe, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const { DatabaseManager } = require('../src/database/connection');
const { Migrator } = require('../src/database/migrator');
const { EconomyRepository } = require('../src/database/repositories/economyRepository');
const { LoanRepository } = require('../src/database/repositories/loanRepository');
const { EconomyService } = require('../src/services/economyService');
const { LoanService } = require('../src/services/loanService');
const { buildProfilePayload } = require('../src/utils/profileBuilder');

describe('Loan System (Model A Bank & Model C P2P) & Enhanced Profile', () => {
  let dbManager;
  let economyRepo;
  let loanRepo;
  let economyService;
  let loanService;
  const guildId = 'test-guild-123';
  const borrowerId = 'user-borrower-1';
  const lenderId = 'user-lender-2';

  beforeEach(() => {
    dbManager = new DatabaseManager(':memory:');
    dbManager.connect();
    const migrator = new Migrator(dbManager);
    migrator.runPendingMigrations();

    // Setup base guild and users
    dbManager.run("INSERT INTO guilds (id, name, joined_at) VALUES (?, 'Test Guild', CURRENT_TIMESTAMP)", [guildId]);
    dbManager.run("INSERT INTO users (id, username) VALUES (?, 'Borrower')", [borrowerId]);
    dbManager.run("INSERT INTO users (id, username) VALUES (?, 'Lender')", [lenderId]);

    economyRepo = new EconomyRepository(dbManager);
    loanRepo = new LoanRepository(dbManager);
    economyService = new EconomyService({ economyRepo });

    const mockXpService = {
      getMemberProfile: (gId, uId) => ({ currentLevel: uId === borrowerId ? 5 : 0 })
    };

    loanService = new LoanService({
      loanRepo,
      economyRepo,
      economyService,
      experienceService: mockXpService
    });
    economyService.setLoanService(loanService);
  });

  afterEach(() => {
    if (dbManager) dbManager.close();
  });

  test('Model A: Bank loan issues funds, sets 10% interest, and enforces max level limit', () => {
    // Level 5 borrower max limit is 10,000
    const limitInfo = loanService.calculateMaxBankLoan(guildId, borrowerId);
    assert.equal(limitInfo.maxLimit, 10000);

    // Exceeding limit throws error
    assert.throws(() => {
      loanService.requestBankLoan(guildId, borrowerId, 15000);
    }, /Limite de crédito insuficiente/);

    // Request valid loan of 1,000
    const res = loanService.requestBankLoan(guildId, borrowerId, 1000);
    assert.equal(res.principalAmount, 1000);
    assert.equal(res.totalDue, 1100); // 10% interest
    assert.equal(res.walletBalance, 1000);

    // Active loan is stored and prevents taking a second active loan
    assert.throws(() => {
      loanService.requestBankLoan(guildId, borrowerId, 500);
    }, /Você já possui um empréstimo/);

    const active = loanRepo.getActiveLoan(guildId, borrowerId);
    assert.ok(active);
    assert.equal(active.remaining_amount, 1100);
  });

  test('Model A: Work/Daily income automatically retains 40% to amortize active loan', () => {
    loanService.requestBankLoan(guildId, borrowerId, 1000); // owes 1,100

    // Work gives reward
    const workRes = economyService.work(guildId, borrowerId);
    assert.ok(workRes.success);
    assert.ok(workRes.message.includes('Amortização de Empréstimo') || workRes.message.includes('Retenção de Empréstimo'));

    const updatedLoan = loanRepo.getActiveLoan(guildId, borrowerId);
    assert.ok(updatedLoan.remaining_amount < 1100);
    assert.ok(updatedLoan.amount_paid > 0);
  });

  test('Model A: Manual loan repayment amortizes and fully pays off debt', () => {
    loanService.requestBankLoan(guildId, borrowerId, 500); // owes 550, wallet has 500

    // Give borrower extra funds
    economyRepo.updateBalances(guildId, borrowerId, { walletBalance: 1000 });

    // Partial repayment of 250
    const partRepay = loanService.repayLoan(guildId, borrowerId, 250);
    assert.equal(partRepay.paymentAmount, 250);
    assert.equal(partRepay.remainingAmount, 300);
    assert.equal(partRepay.fullyPaid, false);

    // Full repayment with "tudo"
    const fullRepay = loanService.repayLoan(guildId, borrowerId, 'tudo');
    assert.equal(fullRepay.paymentAmount, 300);
    assert.equal(fullRepay.remainingAmount, 0);
    assert.equal(fullRepay.fullyPaid, true);

    const activeAfter = loanRepo.getActiveLoan(guildId, borrowerId);
    assert.equal(activeAfter, null); // no active loan left
  });

  test('Model C: P2P loan proposal, acceptance, and fund transfer between members', () => {
    // Lender has 2,000 in wallet
    economyRepo.updateBalances(guildId, lenderId, { walletBalance: 2000 });

    // Propose P2P loan: 1,000 coins, 15% interest, 5 days
    const prop = loanService.proposeP2PLoan(guildId, lenderId, borrowerId, 1000, 15, 5);
    assert.equal(prop.loan.status, 'PENDING');
    assert.equal(prop.totalDue, 1150);

    // Borrower accepts
    const accepted = loanService.acceptP2PLoan(guildId, borrowerId, prop.loan.id);
    assert.equal(accepted.loan.status, 'ACTIVE');

    // Check balances
    const lenderBal = economyRepo.getAccount(guildId, lenderId);
    const borrowerBal = economyRepo.getAccount(guildId, borrowerId);
    assert.equal(lenderBal.walletBalance, 1000); // 2000 - 1000
    assert.equal(borrowerBal.walletBalance, 1000); // 0 + 1000

    // Give borrower funds to cover the interest
    economyRepo.updateBalances(guildId, borrowerId, { walletBalance: 1200 });

    // Repay P2P loan credits back to lender
    const repay = loanService.repayLoan(guildId, borrowerId, 'tudo');
    assert.equal(repay.fullyPaid, true);

    const lenderBalAfter = economyRepo.getAccount(guildId, lenderId);
    assert.equal(lenderBalAfter.walletBalance, 2150); // 1000 + 1150 (with interest)
  });

  test('Defaulting & Serasa Stark: Overdue loan locks casino and shop purchases', () => {
    // Create an overdue loan directly
    const overdueDate = new Date(Date.now() - 100000).toISOString();
    const loan = loanRepo.createLoan({
      guildId,
      borrowerId,
      principalAmount: 500,
      totalDue: 550,
      remainingAmount: 550,
      status: 'ACTIVE',
      dueDate: overdueDate
    });

    // Check isDefaulted triggers
    assert.equal(loanService.isDefaulted(guildId, borrowerId), true);

    // Casino / Blackjack block check
    const { BlackjackService } = require('../src/services/blackjackService');
    const bj = new BlackjackService({ economyService });
    assert.throws(() => {
      bj.startGame(guildId, borrowerId, 50);
    }, /Nome Sujo/);

    // Shop purchase block check
    assert.rejects(async () => {
      await economyService.buyShopItem(guildId, borrowerId, 'test-item', 1);
    }, /Nome Sujo/);
  });

  test('Profile customization: Bio, custom color, badges, and buildProfilePayload', async () => {
    // 1. Set bio & custom color
    const p1 = loanService.setBio(guildId, borrowerId, 'Desenvolvedor Stark e explorador');
    assert.equal(p1.bio, 'Desenvolvedor Stark e explorador');

    const p2 = loanService.setEmbedColor(guildId, borrowerId, '#FF0055');
    assert.equal(p2.embedColor, '#FF0055');

    // 2. RPG Title calculation
    assert.equal(loanService.getRPGTitle(0), '🌱 Novato');
    assert.equal(loanService.getRPGTitle(5), '🥈 Aventureiro Experiente');
    assert.equal(loanService.getRPGTitle(25), '💎 Elite Stark');

    // 3. Badges calculation
    const badges = loanService.calculateBadges({
      guild: { ownerId: borrowerId },
      targetUser: { id: borrowerId },
      member: null,
      xpProfile: { rankTotal: 1 },
      balance: { rank: 2 },
      rel: { isMarried: true },
      reviewStats: { average: 5.0, total: 3 },
      loanStatus: { isDefaulted: false, hasActiveLoan: false }
    });
    assert.ok(badges.includes('👑 Dono'));
    assert.ok(badges.includes('💎 Top Economia'));
    assert.ok(badges.includes('🏆 Lendário'));
    assert.ok(badges.includes('💍 Casado(a)'));
    assert.ok(badges.includes('⭐ Atendente 5★'));
    assert.ok(badges.includes('🏦 Bom Pagador'));

    // 4. buildProfilePayload generates embed and interactive components
    const mockContext = {
      experienceService: { getMemberProfile: () => ({ currentLevel: 5, totalXp: 1200, rankTotal: 2, progressPercent: 40, progressInCurrentLevel: 400, xpForNextLevel: 1000, remainingXpToNextLevel: 600 }) },
      economyService,
      socialFunService: { getRelationship: () => ({ isMarried: false }) },
      moderationService: { getMemberWarns: () => [] },
      reviewRepo: { getReviewStats: () => null },
      identityService: { getDisplayName: () => 'J.A.R.V.I.S' },
      loanService,
      loanRepo
    };

    const targetUser = {
      id: borrowerId,
      username: 'Borrower',
      createdTimestamp: 1676000000000,
      displayAvatarURL: () => 'https://cdn.discordapp.com/embed/avatars/0.png'
    };

    const payload = await buildProfilePayload({ id: guildId, ownerId: 'other' }, targetUser, null, mockContext);
    assert.ok(payload.embeds && payload.embeds.length === 1);
    assert.ok(payload.components && payload.components.length === 1);

    const embedData = payload.embeds[0].data;
    assert.equal(embedData.color, 0xFF0055); // Custom color applied
    assert.ok(embedData.description.includes('Desenvolvedor Stark e explorador')); // Bio included
    assert.ok(embedData.description.includes('Aventureiro Experiente')); // RPG Title included
    assert.ok(embedData.fields.some(f => f.name.includes('Crédito & Empréstimos'))); // Loan field included

    // 5 Tab Navigation Buttons
    const buttons = payload.components[0].components;
    assert.equal(buttons.length, 5);
    assert.equal(buttons[0].data.label, '📋 Geral');
    assert.equal(buttons[1].data.label, '💰 Finanças');
    assert.equal(buttons[2].data.label, '🏦 Empréstimos');
    assert.equal(buttons[3].data.label, '💍 Social');
    assert.equal(buttons[4].data.label, '🔄 Atualizar');

    // Test other tabs build properly
    const ecoTab = await buildProfilePayload({ id: guildId, ownerId: 'other' }, targetUser, null, mockContext, 'economy');
    assert.ok(ecoTab.embeds[0].data.title.includes('Extrato Financeiro'));

    const loanTab = await buildProfilePayload({ id: guildId, ownerId: 'other' }, targetUser, null, mockContext, 'loans');
    assert.ok(loanTab.embeds[0].data.title.includes('Crédito & Empréstimos'));

    const socialTab = await buildProfilePayload({ id: guildId, ownerId: 'other' }, targetUser, null, mockContext, 'social');
    assert.ok(socialTab.embeds[0].data.title.includes('Vida Social & Reputação'));
  });
});
