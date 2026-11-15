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
   * Calculate maximum allowable bank loan based on member's XP level.
   * @param {string} guildId
   * @param {string} userId
   */
  calculateMaxBankLoan(guildId, userId) {
    let currentLevel = 0;
    if (this.experienceService && this.experienceService.getMemberProfile) {
      try {
        const xp = this.experienceService.getMemberProfile(guildId, userId);
        currentLevel = xp?.currentLevel || 0;
      } catch {}
    }

    let maxLimit = 500;
    if (currentLevel >= 20) {
      maxLimit = 100000;
    } else if (currentLevel >= 10) {
      maxLimit = 30000;
    } else if (currentLevel >= 5) {
      maxLimit = 10000;
    } else if (currentLevel >= 1) {
      maxLimit = 2000;
    }

    return {
      level: currentLevel,
      maxLimit
    };
  }

  /**
   * Request an automated bank loan from J.A.R.V.I.S (Modelo A).
   * @param {string} guildId
   * @param {string} userId
   * @param {number} amount
   */
  requestBankLoan(guildId, userId, amount) {
    const val = parseInt(amount, 10);
    if (!val || val <= 0) {
      throw new Error('Informe uma quantia válida e positiva para solicitar o empréstimo!');
    }

    const activeLoan = this.loanRepo.getActiveLoan(guildId, userId);
    if (activeLoan) {
      const statusDesc = activeLoan.status === 'DEFAULTED' ? '⚠️ EM ATRASO' : 'ativo';
      throw new Error(
        `Você já possui um empréstimo ${statusDesc} no valor restante de **${formatCompactNumber(activeLoan.remaining_amount)} moedas**!\nQuite sua dívida atual com \`+emprestimo pagar\` antes de solicitar outro.`
      );
    }

    const { level, maxLimit } = this.calculateMaxBankLoan(guildId, userId);
    if (val > maxLimit) {
      throw new Error(
        `Limite de crédito insuficiente! No seu Nível atual (${level}), o limite máximo para empréstimo é de **${formatCompactNumber(maxLimit)} moedas**.`
      );
    }

    const interestRate = 0.10; // 10%
    const totalDue = Math.round(val * (1 + interestRate));
    const retentionRate = 0.40; // 40% retenção em ganhos
    const dueDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 dias

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
        dueDate,
        walletBalance: updated.walletBalance
      };
    });
  }

  /**
   * Propose a P2P loan to another member (Modelo C).
   * @param {string} guildId
   * @param {string} lenderId
   * @param {string} borrowerId
   * @param {number} amount
   * @param {number} interestPercent
   * @param {number} days
   */
  proposeP2PLoan(guildId, lenderId, borrowerId, amount, interestPercent = 10, days = 7) {
    if (lenderId === borrowerId) {
      throw new Error('Você não pode propor um empréstimo para si mesmo!');
    }

    const val = parseInt(amount, 10);
    if (!val || val <= 0) {
      throw new Error('Informe uma quantia válida para o empréstimo!');
    }

    const interest = Math.min(50, Math.max(0, parseInt(interestPercent, 10) || 10));
    const termDays = Math.min(30, Math.max(1, parseInt(days, 10) || 7));

    const lenderAccount = this.economyRepo.getOrCreateAccount(guildId, lenderId);
    if (lenderAccount.walletBalance < val) {
      throw new Error(`Você não tem moedas suficientes na carteira para emprestar! Você possui apenas ${formatCompactNumber(lenderAccount.walletBalance)}.`);
    }

    const borrowerActive = this.loanRepo.getActiveLoan(guildId, borrowerId);
    if (borrowerActive) {
      throw new Error('O membro devedor já possui um empréstimo ativo no servidor e não pode contrair outra dívida no momento.');
    }

    const totalDue = Math.round(val * (1 + interest / 100));
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
      retentionRate: 0.40,
      status: 'PENDING',
      dueDate
    });

    loanLogger.info(`P2P loan proposed from ${lenderId} to ${borrowerId} for ${val} coins.`);

    return {
      loan,
      principalAmount: val,
      totalDue,
      interestPercent: interest,
      days: termDays,
      dueDate
    };
  }

  /**
   * Borrower accepts pending P2P loan.
   * @param {string} guildId
   * @param {string} borrowerId
   * @param {number} loanId
   */
  acceptP2PLoan(guildId, borrowerId, loanId) {
    const loan = this.loanRepo.getLoanById(loanId);
    if (!loan || loan.guild_id !== guildId || loan.borrower_id !== borrowerId || loan.status !== 'PENDING') {
      throw new Error('Proposta de empréstimo não encontrada ou já expirada!');
    }

    const lenderAccount = this.economyRepo.getOrCreateAccount(guildId, loan.lender_id);
    if (lenderAccount.walletBalance < loan.principal_amount) {
      this.loanRepo.updateLoan(loan.id, { status: 'REJECTED' });
      throw new Error('O credor não possui mais saldo suficiente na carteira para efetivar o empréstimo!');
    }

    return this.economyRepo.db.transaction(() => {
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
   * Pay or amortize an active loan.
   * @param {string} guildId
   * @param {string} userId
   * @param {number|'all'} amountToPay
   */
  repayLoan(guildId, userId, amountToPay) {
    const loan = this.loanRepo.getActiveLoan(guildId, userId);
    if (!loan) {
      throw new Error('Você não possui nenhum empréstimo ativo para pagar no momento!');
    }

    let payVal = 0;
    if (amountToPay === 'all' || amountToPay === 'tudo') {
      payVal = loan.remaining_amount;
    } else {
      const parsed = parseInt(amountToPay, 10);
      if (!parsed || parsed <= 0) {
        throw new Error('Informe um valor válido para amortizar ou "tudo" para quitar o empréstimo!');
      }
      payVal = Math.min(parsed, loan.remaining_amount);
    }

    const account = this.economyRepo.getOrCreateAccount(guildId, userId);
    if (account.walletBalance < payVal) {
      throw new Error(
        `Saldo insuficiente na carteira para pagar! Você precisa de **${formatCompactNumber(payVal)} moedas**, mas possui apenas **${formatCompactNumber(account.walletBalance)}**.`
      );
    }

    return this.economyRepo.db.transaction(() => {
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
        walletBalance: borrowerUpdated.walletBalance
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

    const retention = Math.min(
      Math.max(1, Math.round(grossReward * (loan.retention_rate || 0.40))),
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
    return Boolean(loan && loan.status === 'DEFAULTED');
  }

  /**
   * Get detailed status of loans and credit score.
   * @param {string} guildId
   * @param {string} userId
   */
  getLoanStatus(guildId, userId) {
    const activeLoan = this.loanRepo.getActiveLoan(guildId, userId);
    const { level, maxLimit } = this.calculateMaxBankLoan(guildId, userId);
    const profile = this.loanRepo.getProfile(guildId, userId);

    return {
      activeLoan,
      hasActiveLoan: Boolean(activeLoan),
      isDefaulted: Boolean(activeLoan && activeLoan.status === 'DEFAULTED'),
      level,
      maxLimit,
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

    return badges;
  }
}

module.exports = { LoanService };
