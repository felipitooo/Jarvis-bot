const { logger } = require('../utils/logger');
const { formatCompactNumber } = require('../utils/numberFormatter');

const loanLogger = logger.forContext('LoanService');

class LoanService {
  /**
   * @param {object} param0
   * @param {import('../database/repositories/loanRepository').LoanRepository} param0.loanRepo
   * @param {import('../database/repositories/economyRepository').EconomyRepository} param0.economyRepo
   * @param {import('./economyService').EconomyService} param0.economyService
   * @param {import('./experienceService').ExperienceService} [param0.experienceService]
   * @param {import('./identityService').IdentityService} [param0.identityService]
   */
  constructor({ loanRepo, economyRepo, economyService, experienceService, identityService }) {
    this.loanRepo = loanRepo;
    this.economyRepo = economyRepo;
    this.economyService = economyService;
    this.experienceService = experienceService;
    this.identityService = identityService;
  }

  /**
   * Get configurable loan settings for a guild.
   * @param {string} guildId
   */
  getLoanConfig(guildId) {
    if (this.loanRepo && typeof this.loanRepo.getLoanConfig === 'function') {
      return this.loanRepo.getLoanConfig(guildId);
    }
    return {
      guildId,
      bankLoansEnabled: true,
      p2pLoansEnabled: true,
      bankInterestRate: 0.10,
      bankTermDays: 7,
      retentionRate: 0.40,
      maxActiveLoans: 1,
      p2pMaxInterestRate: 0.50,
      p2pMaxTermDays: 30,
      blockTransfersOnDefault: true,
      blockShopOnDefault: true,
      blockCasinoOnDefault: false,
      levelTiers: [
        { minLevel: 0, maxLoan: 500 },
        { minLevel: 1, maxLoan: 2000 },
        { minLevel: 5, maxLoan: 10000 },
        { minLevel: 10, maxLoan: 30000 },
        { minLevel: 20, maxLoan: 100000 }
      ]
    };
  }

  /**
   * Update configurable loan settings for a guild.
   * @param {string} guildId
   * @param {object} updates
   */
  updateLoanConfig(guildId, updates = {}) {
    if (!this.loanRepo || typeof this.loanRepo.upsertLoanConfig !== 'function') {
      throw new Error('Repositório de configurações de empréstimo indisponível.');
    }
    return this.loanRepo.upsertLoanConfig(guildId, updates);
  }

  /**
   * Calculate maximum allowable bank loan based on member's XP level and guild's configured levelTiers.
   * Also computes maximum loan units in any exchange currency (maxLimit / currency.rate).
   * @param {string} guildId
   * @param {string} userId
   * @param {string|null} [currencyCode=null]
   */
  calculateMaxBankLoan(guildId, userId, currencyCode = null) {
    let currentLevel = 0;
    if (this.experienceService && this.experienceService.getMemberProfile) {
      try {
        const xp = this.experienceService.getMemberProfile(guildId, userId);
        currentLevel = xp?.currentLevel || 0;
      } catch {}
    }

    const loanCfg = this.getLoanConfig(guildId);
    const tiers = Array.isArray(loanCfg.levelTiers) && loanCfg.levelTiers.length > 0
      ? [...loanCfg.levelTiers].sort((a, b) => Number(a.minLevel) - Number(b.minLevel))
      : [
          { minLevel: 0, maxLoan: 500 },
          { minLevel: 1, maxLoan: 2000 },
          { minLevel: 5, maxLoan: 10000 },
          { minLevel: 10, maxLoan: 30000 },
          { minLevel: 20, maxLoan: 100000 }
        ];

    let maxLimit = Number(tiers[0].maxLoan ?? tiers[0].maxLimit) || 500;
    for (const tier of tiers) {
      if (currentLevel >= Number(tier.minLevel)) {
        maxLimit = Number(tier.maxLoan ?? tier.maxLimit);
      }
    }

    let exchangeLimits = [];
    if (this.economyRepo && typeof this.economyRepo.listExchangeCurrencies === 'function') {
      try {
        const currencies = this.economyRepo.listExchangeCurrencies(guildId, true) || [];
        exchangeLimits = currencies.map(c => ({
          currency: c,
          maxUnits: Math.floor(maxLimit / c.rate)
        }));
      } catch {}
    }

    let selectedCurrency = null;
    let maxCurrencyUnits = null;
    if (currencyCode && this.economyRepo && typeof this.economyRepo.getExchangeCurrencyByCode === 'function') {
      selectedCurrency = this.economyRepo.getExchangeCurrencyByCode(guildId, currencyCode);
      if (selectedCurrency) {
        maxCurrencyUnits = Math.floor(maxLimit / selectedCurrency.rate);
      }
    }

    return {
      level: currentLevel,
      maxLimit,
      levelTiers: tiers,
      loanConfig: loanCfg,
      exchangeLimits,
      currency: selectedCurrency,
      maxCurrencyUnits
    };
  }

  /**
   * Request an automated bank loan from J.A.R.V.I.S (Modelo A).
   * Supports borrowing either in base coins or directly in an Exchange Currency
   * (calculating the max limit for the user's level and dividing by the currency's rate).
   * @param {string} guildId
   * @param {string} userId
   * @param {number|string} amount
   * @param {string|null} [currencyCode=null]
   */
  requestBankLoan(guildId, userId, amount, currencyCode = null) {
    const loanCfg = this.getLoanConfig(guildId);
    if (!loanCfg.bankLoansEnabled) {
      throw new Error('Os empréstimos bancários automáticos estão desativados neste servidor no momento.');
    }

    const activeLoans = this.loanRepo.getActiveLoans
      ? this.loanRepo.getActiveLoans(guildId, userId)
      : (this.loanRepo.getActiveLoan(guildId, userId) ? [this.loanRepo.getActiveLoan(guildId, userId)] : []);

    const hasOverdue = activeLoans.some(l => l.status === 'DEFAULTED' || new Date() > new Date(l.due_date));
    if (hasOverdue) {
      throw new Error(
        '⚠️ **Nome Sujo (Serasa Stark):** Você possui um empréstimo em atraso! Quite sua dívida atual com `+emprestimo pagar` antes de solicitar novo crédito.'
      );
    }

    const maxActiveLoans = Math.max(1, Number(loanCfg.maxActiveLoans) || 1);
    if (activeLoans.length >= maxActiveLoans) {
      const totalRemaining = activeLoans.reduce((sum, l) => sum + (Number(l.remaining_amount) || 0), 0);
      throw new Error(
        `Você já possui um empréstimo ativo (limite máximo: **${maxActiveLoans}**, dívida restante: **${formatCompactNumber(totalRemaining)} moedas**)!\nQuite sua dívida atual com \`+emprestimo pagar\` antes de solicitar outro.`
      );
    }

    const { level, maxLimit } = this.calculateMaxBankLoan(guildId, userId);
    const currentPrincipalSum = activeLoans.reduce((sum, l) => sum + (Number(l.principal_amount) || 0), 0);
    const availableCredit = Math.max(0, maxLimit - currentPrincipalSum);

    const interestRate = Number(loanCfg.bankInterestRate ?? 0.10);
    const retentionRate = Number(loanCfg.retentionRate ?? 0.40);
    const termDays = Math.max(1, Number(loanCfg.bankTermDays) || 7);
    const dueDate = new Date(Date.now() + termDays * 24 * 60 * 60 * 1000).toISOString();

    const isAllInput = typeof amount === 'string' && ['all', 'tudo', 'max'].includes(amount.toLowerCase());

    // Borrowing in an Exchange Currency (max limit by level divided by currency rate)
    if (currencyCode) {
      const currency = this.economyRepo.getExchangeCurrencyByCode(guildId, currencyCode);
      if (!currency) {
        throw new Error(`A moeda de câmbio \`${currencyCode}\` não foi encontrada neste servidor.`);
      }
      if (!currency.isActive) {
        throw new Error(`O câmbio de **${currency.symbol} ${currency.name}** está temporariamente pausado neste servidor.`);
      }

      const maxCurrencyUnits = Math.floor(maxLimit / currency.rate);
      const availableCurrencyUnits = Math.floor(availableCredit / currency.rate);

      if (availableCurrencyUnits <= 0) {
        throw new Error(
          `Limite de crédito insuficiente para **${currency.symbol} ${currency.name}**! No seu Nível atual (${level}), seu crédito disponível é de **${formatCompactNumber(availableCredit)} moedas** e cada **${currency.symbol} ${currency.name}** vale **${formatCompactNumber(currency.rate)} moedas** (máximo permitido no seu nível: **${formatCompactNumber(maxCurrencyUnits)}x ${currency.name}**).`
        );
      }

      const requestedUnits = isAllInput ? availableCurrencyUnits : parseInt(amount, 10);
      if (!requestedUnits || requestedUnits <= 0) {
        throw new Error(`Informe uma quantidade válida e positiva de **${currency.symbol} ${currency.name}** (ou digite \`tudo\`) para solicitar o empréstimo!`);
      }

      if (requestedUnits > availableCurrencyUnits) {
        throw new Error(
          `Limite de crédito insuficiente! No seu Nível atual (${level}), seu teto é de **${formatCompactNumber(maxLimit)} moedas** ÷ **${formatCompactNumber(currency.rate)}** = **${formatCompactNumber(maxCurrencyUnits)}x ${currency.symbol} ${currency.name}** (Disponível agora: **${formatCompactNumber(availableCurrencyUnits)}x ${currency.symbol} ${currency.name}**).`
        );
      }

      const principalCoins = requestedUnits * currency.rate;
      const totalDue = Math.round(principalCoins * (1 + interestRate));
      const totalDueInCurrency = Number((totalDue / currency.rate).toFixed(2));

      return this.economyRepo.db.transaction(() => {
        // 1. Credit Exchange Currency directly to the borrower's wallet
        const newCurrencyBalance = this.economyRepo.addUserCurrencyBalance(guildId, userId, currency.id, requestedUnits);
        const account = this.economyRepo.getOrCreateAccount(guildId, userId);

        // 2. Create loan record
        const loan = this.loanRepo.createLoan({
          guildId,
          borrowerId: userId,
          lenderId: null,
          loanType: 'BANK',
          principalAmount: principalCoins,
          interestRate,
          totalDue,
          remainingAmount: totalDue,
          retentionRate,
          status: 'ACTIVE',
          dueDate
        });

        // 3. Record transaction
        this.economyRepo.recordTransaction({
          guildId,
          userId,
          type: 'LOAN_TAKE',
          amount: principalCoins,
          walletAfter: account.walletBalance,
          bankAfter: account.bankBalance,
          description: `Empréstimo bancário em ${requestedUnits}x ${currency.code} (Equiv: ${principalCoins} moedas | Total devido: ${totalDue})`
        });

        const bal = this.economyService ? this.economyService.getBalance(guildId, userId) : account;

        loanLogger.info(`Bank loan issued in exchange currency for user ${userId} in guild ${guildId}: ${requestedUnits}x ${currency.code} (${principalCoins} coins).`);

        return {
          loan,
          currency,
          currencyUnits: requestedUnits,
          newCurrencyBalance,
          maxCurrencyUnits,
          availableCurrencyUnits,
          principalAmount: principalCoins,
          totalDue,
          totalDueInCurrency,
          interestRate,
          interestPercent: Math.round(interestRate * 10000) / 100,
          retentionRate,
          retentionPercent: Math.round(retentionRate * 100),
          termDays,
          dueDate,
          walletBalance: account.walletBalance,
          effectiveWalletBalance: bal.effectiveWalletBalance ?? account.walletBalance
        };
      });
    }

    const val = isAllInput ? availableCredit : parseInt(amount, 10);
    if (!val || val <= 0) {
      throw new Error('Informe uma quantia válida e positiva para solicitar o empréstimo!');
    }

    if (val > availableCredit) {
      throw new Error(
        `Limite de crédito insuficiente! No seu Nível atual (${level}), seu teto total de crédito é **${formatCompactNumber(maxLimit)} moedas** (Disponível: **${formatCompactNumber(availableCredit)} moedas**).`
      );
    }

    const totalDue = Math.round(val * (1 + interestRate));

    return this.economyRepo.db.transaction(() => {
      // 1. Credit wallet
      const account = this.economyRepo.getOrCreateAccount(guildId, userId);
      const updated = this.economyRepo.updateBalances(guildId, userId, {
        walletBalance: account.walletBalance + val
      });

      // 2. Create loan
      const loan = this.loanRepo.createLoan({
        guildId,
        borrowerId: userId,
        lenderId: null,
        loanType: 'BANK',
        principalAmount: val,
        interestRate,
        totalDue,
        remainingAmount: totalDue,
        retentionRate,
        status: 'ACTIVE',
        dueDate
      });

      // 3. Record transaction
      this.economyRepo.recordTransaction({
        guildId,
        userId,
        type: 'LOAN_TAKE',
        amount: val,
        walletAfter: updated.walletBalance,
        bankAfter: updated.bankBalance,
        description: `Empréstimo bancário J.A.R.V.I.S (Total devido: ${totalDue})`
      });

      loanLogger.info(`Bank loan issued for user ${userId} in guild ${guildId}: ${val} coins.`);

      return {
        loan,
        principalAmount: val,
        totalDue,
        interestRate,
        interestPercent: Math.round(interestRate * 10000) / 100,
        retentionRate,
        retentionPercent: Math.round(retentionRate * 100),
        termDays,
        dueDate,
        walletBalance: updated.walletBalance
      };
    });
  }

  /**
   * Propose a P2P loan to another member (Modelo C).
   * Supports proposing in normal coins or directly in an Exchange Currency.
   * @param {string} guildId
   * @param {string} lenderId
   * @param {string} borrowerId
   * @param {number|string} amount
   * @param {number} interestPercent
   * @param {number} days
   * @param {string|null} [currencyCode=null]
   */
  proposeP2PLoan(guildId, lenderId, borrowerId, amount, interestPercent = 10, days = 7, currencyCode = null) {
    const loanCfg = this.getLoanConfig(guildId);
    if (!loanCfg.p2pLoansEnabled) {
      throw new Error('Os empréstimos P2P entre membros estão desativados neste servidor no momento.');
    }

    if (lenderId === borrowerId) {
      throw new Error('Você não pode propor um empréstimo para si mesmo!');
    }

    const rawVal = parseInt(amount, 10);
    if (!rawVal || rawVal <= 0) {
      throw new Error('Informe uma quantia válida para o empréstimo!');
    }

    let currency = null;
    let currencyUnits = null;
    let val = rawVal;

    if (currencyCode) {
      currency = this.economyRepo.getExchangeCurrencyByCode(guildId, currencyCode);
      if (!currency) {
        throw new Error(`A moeda de câmbio \`${currencyCode}\` não foi encontrada neste servidor.`);
      }
      currencyUnits = rawVal;
      val = currencyUnits * currency.rate;
    }

    const maxInterestPct = Math.round((Number(loanCfg.p2pMaxInterestRate ?? 0.50)) * 100);
    const maxTermDays = Math.max(1, Number(loanCfg.p2pMaxTermDays) || 30);

    const parsedInterest = interestPercent !== undefined && interestPercent !== null ? Number(interestPercent) : 10;
    const interest = Math.min(maxInterestPct, Math.max(0, isNaN(parsedInterest) ? 10 : parsedInterest));
    const termDays = Math.min(maxTermDays, Math.max(1, parseInt(days, 10) || 7));

    const lenderBalance = this.economyService
      ? this.economyService.getBalance(guildId, lenderId)
      : this.economyRepo.getOrCreateAccount(guildId, lenderId);
    const effectiveLenderWallet = lenderBalance.effectiveWalletBalance ?? lenderBalance.walletBalance;

    if (currency) {
      const lenderCurrUnits = this.economyRepo.getUserCurrencyBalance(guildId, lenderId, currency.id);
      if (lenderCurrUnits < currencyUnits && effectiveLenderWallet < val) {
        throw new Error(
          `Você não possui saldo suficiente de **${currency.symbol} ${currency.name}** (nem saldo equivalente na carteira) para emprestar! Você possui **${formatCompactNumber(lenderCurrUnits)}x ${currency.symbol} ${currency.name}**.`
        );
      }
    } else if (effectiveLenderWallet < val) {
      throw new Error(
        `Você não tem saldo suficiente na carteira para emprestar! Você possui apenas **${formatCompactNumber(effectiveLenderWallet)} moedas** na carteira.`
      );
    }

    const activeLoans = this.loanRepo.getActiveLoans
      ? this.loanRepo.getActiveLoans(guildId, borrowerId)
      : (this.loanRepo.getActiveLoan(guildId, borrowerId) ? [this.loanRepo.getActiveLoan(guildId, borrowerId)] : []);

    const maxActiveLoans = Math.max(1, Number(loanCfg.maxActiveLoans) || 1);
    if (activeLoans.length >= maxActiveLoans) {
      throw new Error('O membro destinatário já atingiu o limite máximo de empréstimos ativos no servidor.');
    }

    const totalDue = Math.round(val * (1 + interest / 100));
    const retentionRate = Number(loanCfg.retentionRate ?? 0.40);
    const dueDate = new Date(Date.now() + termDays * 24 * 60 * 60 * 1000).toISOString();

    const loan = this.loanRepo.createLoan({
      guildId,
      borrowerId,
      lenderId,
      loanType: 'P2P',
      principalAmount: val,
      interestRate: interest / 100,
      totalDue,
      remainingAmount: totalDue,
      retentionRate,
      status: 'PENDING',
      dueDate
    });

    loanLogger.info(`P2P loan proposed from ${lenderId} to ${borrowerId} for ${val} coins${currency ? ` (${currencyUnits}x ${currency.code})` : ''}.`);

    return {
      loan,
      currency,
      currencyUnits,
      principalAmount: val,
      totalDue,
      totalDueInCurrency: currency ? Number((totalDue / currency.rate).toFixed(2)) : null,
      interestPercent: interest,
      days: termDays,
      retentionPercent: Math.round(retentionRate * 100),
      dueDate
    };
  }

  /**
   * Borrower accepts pending P2P loan.
   * @param {string} guildId
   * @param {string} borrowerId
   * @param {number} loanId
   * @param {string|null} [currencyCode=null]
   */
  acceptP2PLoan(guildId, borrowerId, loanId, currencyCode = null) {
    const loan = this.loanRepo.getLoanById(loanId);
    if (!loan || loan.guild_id !== guildId || loan.borrower_id !== borrowerId || loan.status !== 'PENDING') {
      throw new Error('Proposta de empréstimo não encontrada ou já expirada!');
    }

    return this.economyRepo.db.transaction(() => {
      if (currencyCode) {
        const currency = this.economyRepo.getExchangeCurrencyByCode(guildId, currencyCode);
        if (currency) {
          const units = Math.max(1, Math.round(loan.principal_amount / currency.rate));
          const lenderUnits = this.economyRepo.getUserCurrencyBalance(guildId, loan.lender_id, currency.id);
          if (lenderUnits >= units) {
            this.economyRepo.addUserCurrencyBalance(guildId, loan.lender_id, currency.id, -units);
            this.economyRepo.addUserCurrencyBalance(guildId, borrowerId, currency.id, units);

            const lenderAccount = this.economyRepo.getOrCreateAccount(guildId, loan.lender_id);
            const borrowerAccount = this.economyRepo.getOrCreateAccount(guildId, borrowerId);
            const updatedLoan = this.loanRepo.updateLoan(loan.id, { status: 'ACTIVE' });

            this.economyRepo.recordTransaction({
              guildId,
              userId: loan.lender_id,
              targetId: borrowerId,
              type: 'LOAN_P2P_LEND',
              amount: loan.principal_amount,
              walletAfter: lenderAccount.walletBalance,
              bankAfter: lenderAccount.bankBalance,
              description: `Empréstimo P2P concedido (${units}x ${currency.code}) para usuário ${borrowerId}`
            });

            this.economyRepo.recordTransaction({
              guildId,
              userId: borrowerId,
              targetId: loan.lender_id,
              type: 'LOAN_P2P_RECEIVE',
              amount: loan.principal_amount,
              walletAfter: borrowerAccount.walletBalance,
              bankAfter: borrowerAccount.bankBalance,
              description: `Empréstimo P2P recebido (${units}x ${currency.code}) do usuário ${loan.lender_id}`
            });

            return {
              loan: updatedLoan,
              currency,
              currencyUnits: units,
              borrowerWallet: borrowerAccount.walletBalance
            };
          }
        }
      }

      let lenderAccount = this.economyRepo.getOrCreateAccount(guildId, loan.lender_id);
      if (lenderAccount.walletBalance < loan.principal_amount && this.economyService && this.economyService.ensureWalletLiquidity) {
        const liq = this.economyService.ensureWalletLiquidity(guildId, loan.lender_id, loan.principal_amount);
        lenderAccount = liq.account;
      }

      if (lenderAccount.walletBalance < loan.principal_amount) {
        this.loanRepo.updateLoan(loan.id, { status: 'REJECTED' });
        throw new Error('O credor não possui mais saldo suficiente na carteira para efetivar o empréstimo!');
      }

      // 1. Deduct from lender
      const lenderUpdated = this.economyRepo.updateBalances(guildId, loan.lender_id, {
        walletBalance: lenderAccount.walletBalance - loan.principal_amount
      });

      // 2. Add to borrower
      const borrowerAccount = this.economyRepo.getOrCreateAccount(guildId, borrowerId);
      const borrowerUpdated = this.economyRepo.updateBalances(guildId, borrowerId, {
        walletBalance: borrowerAccount.walletBalance + loan.principal_amount
      });

      // 3. Activate loan
      const updatedLoan = this.loanRepo.updateLoan(loan.id, { status: 'ACTIVE' });

      // 4. Record transactions
      this.economyRepo.recordTransaction({
        guildId,
        userId: loan.lender_id,
        targetId: borrowerId,
        type: 'LOAN_P2P_LEND',
        amount: loan.principal_amount,
        walletAfter: lenderUpdated.walletBalance,
        bankAfter: lenderUpdated.bankBalance,
        description: `Empréstimo P2P concedido para usuário ${borrowerId}`
      });

      this.economyRepo.recordTransaction({
        guildId,
        userId: borrowerId,
        targetId: loan.lender_id,
        type: 'LOAN_P2P_RECEIVE',
        amount: loan.principal_amount,
        walletAfter: borrowerUpdated.walletBalance,
        bankAfter: borrowerUpdated.bankBalance,
        description: `Empréstimo P2P recebido do usuário ${loan.lender_id}`
      });

      loanLogger.info(`P2P loan ${loanId} accepted by borrower ${borrowerId}.`);

      return {
        loan: updatedLoan,
        borrowerWallet: borrowerUpdated.walletBalance
      };
    });
  }

  /**
   * Borrower declines pending P2P loan.
   * @param {string} guildId
   * @param {string} borrowerId
   * @param {number} loanId
   */
  rejectP2PLoan(guildId, borrowerId, loanId) {
    const loan = this.loanRepo.getLoanById(loanId);
    if (!loan || loan.guild_id !== guildId || loan.borrower_id !== borrowerId || loan.status !== 'PENDING') {
      throw new Error('Proposta de empréstimo não encontrada!');
    }

    this.loanRepo.updateLoan(loan.id, { status: 'REJECTED' });
    loanLogger.info(`P2P loan ${loanId} rejected by borrower ${borrowerId}.`);
    return { success: true };
  }

  /**
   * Pay or amortize an active loan (supports base coins, automatic wallet liquidity, or direct Exchange Currency units).
   * @param {string} guildId
   * @param {string} userId
   * @param {number|'all'|'tudo'} amountToPay
   * @param {string|null} [currencyCode=null]
   */
  repayLoan(guildId, userId, amountToPay, currencyCode = null) {
    const loan = this.loanRepo.getActiveLoan(guildId, userId);
    if (!loan) {
      throw new Error('Você não possui nenhum empréstimo ativo para pagar no momento!');
    }

    return this.economyRepo.db.transaction(() => {
      let convertedNotice = '';
      let usedCurrencyInfo = null;
      let payVal = 0;

      if (currencyCode) {
        const currency = this.economyRepo.getExchangeCurrencyByCode(guildId, currencyCode);
        if (!currency) {
          throw new Error(`A moeda de câmbio \`${currencyCode}\` não foi encontrada neste servidor.`);
        }

        const userCurr = this.economyRepo.getUserCurrencyBalance(guildId, userId, currency.id);
        if (userCurr <= 0) {
          throw new Error(`Você não possui saldo de **${currency.symbol} ${currency.name}** na sua carteira.`);
        }

        const isAll = typeof amountToPay === 'string' && ['all', 'tudo', 'max'].includes(amountToPay.toLowerCase());
        const requestedUnits = isAll
          ? Math.min(userCurr, Math.ceil(loan.remaining_amount / currency.rate))
          : parseInt(amountToPay, 10);

        if (!requestedUnits || requestedUnits <= 0) {
          throw new Error(`Informe uma quantidade válida de **${currency.symbol} ${currency.name}** para pagar o empréstimo.`);
        }
        if (userCurr < requestedUnits) {
          throw new Error(`Saldo insuficiente! Você possui apenas **${formatCompactNumber(userCurr)}x ${currency.symbol} ${currency.name}**.`);
        }

        const neededUnits = Math.min(requestedUnits, Math.ceil(loan.remaining_amount / currency.rate));
        const totalCurrencyValue = neededUnits * currency.rate;
        payVal = Math.min(totalCurrencyValue, loan.remaining_amount);
        const changeCoins = Math.max(0, totalCurrencyValue - payVal);

        // Deduct exchange currency units and credit change if any
        this.economyRepo.addUserCurrencyBalance(guildId, userId, currency.id, -neededUnits);
        const account = this.economyRepo.getOrCreateAccount(guildId, userId);
        const borrowerUpdated = this.economyRepo.updateBalances(guildId, userId, {
          walletBalance: account.walletBalance + changeCoins
        });

        usedCurrencyInfo = {
          currency,
          unitsUsed: neededUnits,
          changeCoins
        };
        convertedNotice = `\n💱 *(Pago com **${neededUnits}x ${currency.symbol} ${currency.name}**${changeCoins > 0 ? ` • Troco devolvido à carteira: **${formatCompactNumber(changeCoins)} moedas**` : ''})*`;

        if (loan.lender_id) {
          const lenderAccount = this.economyRepo.getOrCreateAccount(guildId, loan.lender_id);
          this.economyRepo.updateBalances(guildId, loan.lender_id, {
            walletBalance: lenderAccount.walletBalance + payVal
          });
        }

        const newPaid = loan.amount_paid + payVal;
        const newRemaining = Math.max(0, loan.remaining_amount - payVal);
        const newStatus = newRemaining <= 0 ? 'PAID' : loan.status;

        const updatedLoan = this.loanRepo.updateLoan(loan.id, {
          amountPaid: newPaid,
          remainingAmount: newRemaining,
          status: newStatus
        });

        this.economyRepo.recordTransaction({
          guildId,
          userId,
          targetId: loan.lender_id || null,
          type: 'LOAN_REPAY',
          amount: payVal,
          walletAfter: borrowerUpdated.walletBalance,
          bankAfter: borrowerUpdated.bankBalance,
          description: `Pagamento de empréstimo com ${neededUnits}x ${currency.code} (Restante: ${newRemaining})`
        });

        return {
          paymentAmount: payVal,
          remainingAmount: newRemaining,
          fullyPaid: newRemaining <= 0,
          loan: updatedLoan,
          walletBalance: borrowerUpdated.walletBalance,
          usedCurrencyInfo,
          convertedNotice
        };
      }

      if (typeof amountToPay === 'string' && ['all', 'tudo', 'max'].includes(amountToPay.toLowerCase())) {
        payVal = loan.remaining_amount;
      } else {
        const parsed = parseInt(amountToPay, 10);
        if (!parsed || parsed <= 0) {
          throw new Error('Informe um valor válido para amortizar ou "tudo" para quitar o empréstimo!');
        }
        payVal = Math.min(parsed, loan.remaining_amount);
      }

      let account = this.economyRepo.getOrCreateAccount(guildId, userId);
      if (account.walletBalance < payVal && this.economyService && this.economyService.ensureWalletLiquidity) {
        const liq = this.economyService.ensureWalletLiquidity(guildId, userId, payVal);
        account = liq.account;
        convertedNotice = liq.convertedNotice || '';
      }

      if (account.walletBalance < payVal) {
        throw new Error(
          `Saldo insuficiente na carteira para pagar! Você precisa de **${formatCompactNumber(payVal)} moedas**, mas possui apenas **${formatCompactNumber(account.walletBalance)}**.`
        );
      }

      // 1. Deduct from borrower
      const borrowerUpdated = this.economyRepo.updateBalances(guildId, userId, {
        walletBalance: account.walletBalance - payVal
      });

      // 2. If P2P, credit to lender
      if (loan.lender_id) {
        const lenderAccount = this.economyRepo.getOrCreateAccount(guildId, loan.lender_id);
        this.economyRepo.updateBalances(guildId, loan.lender_id, {
          walletBalance: lenderAccount.walletBalance + payVal
        });
      }

      // 3. Update loan
      const newPaid = loan.amount_paid + payVal;
      const newRemaining = Math.max(0, loan.remaining_amount - payVal);
      const newStatus = newRemaining <= 0 ? 'PAID' : loan.status;

      const updatedLoan = this.loanRepo.updateLoan(loan.id, {
        amountPaid: newPaid,
        remainingAmount: newRemaining,
        status: newStatus
      });

      // 4. Record transaction
      this.economyRepo.recordTransaction({
        guildId,
        userId,
        targetId: loan.lender_id || null,
        type: 'LOAN_REPAY',
        amount: payVal,
        walletAfter: borrowerUpdated.walletBalance,
        bankAfter: borrowerUpdated.bankBalance,
        description: `Pagamento de empréstimo (Restante: ${newRemaining})`
      });

      loanLogger.info(`Loan ${loan.id} repaid with ${payVal} by user ${userId}. Fully paid: ${newRemaining <= 0}`);

      return {
        paymentAmount: payVal,
        remainingAmount: newRemaining,
        fullyPaid: newRemaining <= 0,
        loan: updatedLoan,
        walletBalance: borrowerUpdated.walletBalance,
        convertedNotice
      };
    });
  }

  /**
   * Automatic retention of gross income (e.g. from work, daily, crime) to amortize active loan.
   * @param {string} guildId
   * @param {string} userId
   * @param {number} grossReward
   */
  processIncomeRetention(guildId, userId, grossReward) {
    if (!grossReward || grossReward <= 0) {
      return { retained: 0, netReward: grossReward, fullyPaid: false };
    }

    const loan = this.loanRepo.getActiveLoan(guildId, userId);
    if (!loan) {
      return { retained: 0, netReward: grossReward, fullyPaid: false };
    }

    const loanCfg = this.getLoanConfig(guildId);
    const rate = loan.retention_rate !== undefined && loan.retention_rate !== null
      ? Number(loan.retention_rate)
      : Number(loanCfg.retentionRate ?? 0.40);

    if (rate <= 0) {
      return { retained: 0, netReward: grossReward, fullyPaid: false };
    }

    const retention = Math.min(
      Math.max(1, Math.round(grossReward * rate)),
      loan.remaining_amount
    );

    if (retention <= 0) {
      return { retained: 0, netReward: grossReward, fullyPaid: false };
    }

    // Amortize loan
    const newPaid = loan.amount_paid + retention;
    const newRemaining = Math.max(0, loan.remaining_amount - retention);
    const newStatus = newRemaining <= 0 ? 'PAID' : loan.status;

    this.loanRepo.updateLoan(loan.id, {
      amountPaid: newPaid,
      remainingAmount: newRemaining,
      status: newStatus
    });

    // If P2P, forward retention to lender
    if (loan.lender_id) {
      try {
        const lenderAccount = this.economyRepo.getOrCreateAccount(guildId, loan.lender_id);
        this.economyRepo.updateBalances(guildId, loan.lender_id, {
          walletBalance: lenderAccount.walletBalance + retention
        });
      } catch {}
    }

    return {
      retained: retention,
      netReward: grossReward - retention,
      fullyPaid: newRemaining <= 0,
      remainingAmount: newRemaining,
      loanId: loan.id
    };
  }

  /**
   * Check if a member is defaulted / overdue on a loan.
   * @param {string} guildId
   * @param {string} userId
   */
  isDefaulted(guildId, userId) {
    const loan = this.loanRepo.getActiveLoan(guildId, userId);
    if (!loan) return false;
    return Boolean(loan.status === 'DEFAULTED' || new Date() > new Date(loan.due_date));
  }

  canTransfer(guildId, userId) {
    if (!this.isDefaulted(guildId, userId)) return true;
    const cfg = this.getLoanConfig(guildId);
    return !cfg.blockTransfersOnDefault;
  }

  canBuyShop(guildId, userId) {
    if (!this.isDefaulted(guildId, userId)) return true;
    const cfg = this.getLoanConfig(guildId);
    return !cfg.blockShopOnDefault;
  }

  canUseCasino(guildId, userId) {
    if (!this.isDefaulted(guildId, userId)) return true;
    const cfg = this.getLoanConfig(guildId);
    return !cfg.blockCasinoOnDefault;
  }

  /**
   * Get detailed status of loans and credit score.
   * @param {string} guildId
   * @param {string} userId
   */
  getLoanStatus(guildId, userId) {
    const activeLoan = this.loanRepo.getActiveLoan(guildId, userId);
    const activeLoans = this.loanRepo.getActiveLoans ? this.loanRepo.getActiveLoans(guildId, userId) : (activeLoan ? [activeLoan] : []);
    const { level, maxLimit, levelTiers, loanConfig, exchangeLimits } = this.calculateMaxBankLoan(guildId, userId);
    const profile = this.loanRepo.getProfile(guildId, userId);

    return {
      activeLoan,
      activeLoans,
      hasActiveLoan: Boolean(activeLoan),
      isDefaulted: this.isDefaulted(guildId, userId),
      level,
      maxLimit,
      levelTiers,
      loanConfig,
      exchangeLimits,
      profile
    };
  }

  // ==========================================
  // Profile Customization & Visual Elements
  // ==========================================

  /**
   * Set user profile bio.
   * @param {string} guildId
   * @param {string} userId
   * @param {string} bioText
   */
  setBio(guildId, userId, bioText) {
    const cleanBio = String(bioText || '').trim().slice(0, 150);
    return this.loanRepo.upsertProfile(guildId, userId, { bio: cleanBio || null });
  }

  /**
   * Set custom embed color.
   * @param {string} guildId
   * @param {string} userId
   * @param {string} hexColor
   */
  setEmbedColor(guildId, userId, hexColor) {
    const cleanHex = String(hexColor || '').trim().replace('#', '');
    if (!/^[0-9A-Fa-f]{6}$/.test(cleanHex)) {
      throw new Error('Cor hexadecimal inválida! Use o formato #RRGGBB (ex: #FF0055 ou #00E5FF).');
    }
    return this.loanRepo.upsertProfile(guildId, userId, { embedColor: '#' + cleanHex.toUpperCase() });
  }

  /**
   * Map XP level to an RPG honorific title.
   * @param {number} level
   */
  getRPGTitle(level = 0) {
    const lvl = Number(level) || 0;
    if (lvl >= 50) return '👑 Mestre Lendário';
    if (lvl >= 35) return '⚔️ Guardião Supremo';
    if (lvl >= 20) return '💎 Elite Stark';
    if (lvl >= 10) return '🥇 Veterano Condecorado';
    if (lvl >= 5) return '🥈 Aventureiro Experiente';
    if (lvl >= 1) return '🥉 Explorador';
    return '🌱 Novato';
  }

  /**
   * Dynamically calculate prestige badges for member profile.
   * @param {object} param0
   */
  calculateBadges({ guild, targetUser, member, xpProfile, balance, rel, reviewStats, loanStatus }) {
    const badges = [];

    // 1. Owner
    if (guild && guild.ownerId === targetUser.id) {
      badges.push('👑 Dono');
    }

    // 2. Staff
    if (member && member.permissions) {
      if (member.permissions.has('Administrator') || member.permissions.has('ManageGuild') || member.permissions.has('ModerateMembers')) {
        badges.push('🛡️ Staff');
      }
    }

    // 3. Economy Top 3
    if (balance && balance.rank && Number(balance.rank) <= 3) {
      badges.push('💎 Top Economia');
    }

    // 4. XP Top 3
    if (xpProfile && xpProfile.rankTotal && Number(xpProfile.rankTotal) <= 3) {
      badges.push('🏆 Lendário');
    }

    // 5. Marriage
    if (rel && rel.isMarried) {
      badges.push('💍 Casado(a)');
    }

    // 6. 5-Star Staff
    if (reviewStats && reviewStats.average >= 4.5 && reviewStats.total > 0) {
      badges.push('⭐ Atendente 5★');
    }

    // 7. Credit & Loan status
    if (loanStatus && loanStatus.isDefaulted) {
      badges.push('⚠️ Nome Sujo (Serasa)');
    } else if (loanStatus && loanStatus.hasActiveLoan) {
      badges.push('💳 Empréstimo Ativo');
    } else {
      badges.push('🏦 Bom Pagador');
    }

    // 8. Magnate (Patrimônio >= 50.000 moedas)
    const netWorth = (balance?.walletBalance || 0) + (balance?.bankBalance || 0);
    if (netWorth >= 50000) {
      badges.push('💰 Magnata');
    }

    // 9. Chatterbox (Nível de XP >= 10)
    if (xpProfile && xpProfile.currentLevel >= 10) {
      badges.push('💬 Sem Vida Social');
    }

    // 10. Bankrupt (Endividado ou zerado)
    if (balance && (balance.walletBalance < 0 || (balance.walletBalance === 0 && balance.bankBalance === 0))) {
      badges.push('📉 Faliu de Vez');
    }

    return badges;
  }
}

module.exports = { LoanService };
