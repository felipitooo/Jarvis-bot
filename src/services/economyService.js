const { logger } = require('../utils/logger');
const { formatCompactNumber } = require('../utils/numberFormatter');
const companyRules = require('../utils/companyRules');

const ecoLogger = logger.forContext('EconomyService');

class EconomyService {
  /**
   * @param {object} params
   * @param {import('../database/repositories/economyRepository').EconomyRepository} params.economyRepo
   * @param {import('./identityService').IdentityService} params.identityService
   * @param {import('../database/repositories/casinoRepository').CasinoRepository} [params.casinoRepo]
   * @param {import('./auditService').AuditService} [params.auditService]
   */
  constructor({ economyRepo, identityService, casinoRepo = null, auditService = null }) {
    this.economyRepo = economyRepo;
    this.identityService = identityService;
    this.casinoRepo = casinoRepo;
    this.auditService = auditService;
    this.loanService = null;

    this.workMessages = [
      'Você desenvolveu um bot incrível no Discord e recebeu {amount}!',
      'Você trabalhou como programador freelancer e faturou {amount}!',
      'Você fez entregas de aplicativo a noite toda e ganhou {amount}!',
      'Você deu aulas particulares de matemática e recebeu {amount}!',
      'Você ajudou a organizar o estoque do supermercado e ganhou {amount}!',
      'Você prestou suporte técnico remoto e faturou {amount}!',
      'Você fez um design de logotipo para uma startup e recebeu {amount}!'
    ];

    this.crimeSuccessMessages = [
      'Você conseguiu invadir o sistema de um banco digital e desviou {amount}!',
      'Você invadiu uma mansão abandonada e encontrou joias avaliadas em {amount}!',
      'Você aplicou um golpe cibernético contra golpistas e faturou {amount}!',
      'Você interceptou um carregamento suspeito e confiscou {amount}!'
    ];

    this.crimeFailMessages = [
      'A polícia chegou no meio da sua ação! Você foi multado em {amount}.',
      'O alarme silencioso disparou e você teve que pagar uma fiança de {amount}.',
      'As câmeras de segurança te identificaram e a justiça confiscou {amount}.',
      'Seu comparsa te traiu e você teve um prejuízo de {amount}.'
    ];

    this.slutSuccessMessages = [
      'Você fez uma transmissão ao vivo com muito carisma e recebeu {amount} em doações!',
      'Você trabalhou como modelo fotográfico para uma marca famosa e ganhou {amount}!',
      'Você vendeu fotos exclusivas para seus admiradores e faturou {amount}!',
      'Você atendeu como acompanhante de luxo em um jantar de gala e recebeu {amount}!'
    ];

    this.slutFailMessages = [
      'Seu cliente deu calote e ainda danificou seu figurino, custando {amount}.',
      'A transmissão caiu por violação de termos e você tomou uma multa de {amount}.',
      'Você se envolveu em uma confusão no restaurante e teve que pagar {amount}.'
    ];
  }

  setLoanService(loanService) {
    this.loanService = loanService;
  }

  // ==========================================
  // Helper: Currency Formatter & Cooldown Calculator
  // ==========================================

  formatCurrency(amount, config, { compact = false } = {}) {
    const symbol = config?.currencySymbol || '🪙';
    const name = config?.currencyName || 'Moedas';
    if (compact) {
      const compactNum = formatCompactNumber(amount);
      return `${symbol}\u00A0**${compactNum}**\u00A0${name}`;
    }
    const formattedNum = Number(amount || 0).toLocaleString('pt-BR');
    return `${symbol}\u00A0**${formattedNum}**\u00A0${name}`;
  }

  formatCompactCurrency(amount, config) {
    return this.formatCurrency(amount, config, { compact: true });
  }

  getCooldownRemainingSeconds(guildId, userId, commandName, cooldownSeconds) {
    const lastUsed = this.economyRepo.getCooldown(guildId, userId, commandName);
    if (!lastUsed) return 0;

    const elapsedSeconds = Math.floor((Date.now() - lastUsed.getTime()) / 1000);
    const remaining = cooldownSeconds - elapsedSeconds;
    return remaining > 0 ? remaining : 0;
  }

  formatTime(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;

    const parts = [];
    if (h > 0) parts.push(`${h}h`);
    if (m > 0) parts.push(`${m}m`);
    if (s > 0 || parts.length === 0) parts.push(`${s}s`);
    return parts.join(' ');
  }

  // ==========================================
  // 1. Balance & Banking
  // ==========================================

  /**
   * Automatically converts exchange currencies into base coins in the wallet
   * whenever an operation requires more base coins than currently loose in wallet.
   */
  ensureWalletLiquidity(guildId, userId, requiredAmount) {
    const config = this.economyRepo.getGuildConfig(guildId);
    let account = this.economyRepo.getOrCreateAccount(guildId, userId, config.bankStartingCapacity);

    if (account.walletBalance >= requiredAmount) {
      return { account, convertedCurrencies: [], convertedNotice: '' };
    }

    const userCurrencies = this.economyRepo.getUserExchangeCurrencies
      ? this.economyRepo.getUserExchangeCurrencies(guildId, userId)
      : [];

    const exchangeAssetsValue = userCurrencies.reduce((sum, c) => sum + (c.totalValue || 0), 0);
    const totalWalletPower = account.walletBalance + exchangeAssetsValue;

    if (totalWalletPower < requiredAmount) {
      return { account, convertedCurrencies: [], convertedNotice: '' };
    }

    // Sort currencies from lowest rate to highest rate so we preserve the highest-tier currencies first
    const sorted = [...userCurrencies].sort((a, b) => a.rate - b.rate);
    let deficit = requiredAmount - account.walletBalance;
    let totalConvertedCoins = 0;
    const convertedCurrencies = [];

    for (const c of sorted) {
      if (deficit <= 0) break;
      if (c.amount <= 0 || c.rate <= 0) continue;

      const unitsNeeded = Math.min(c.amount, Math.ceil(deficit / c.rate));
      if (unitsNeeded > 0) {
        const gained = unitsNeeded * c.rate;
        this.economyRepo.addUserCurrencyBalance(guildId, userId, c.currencyId, -unitsNeeded);
        totalConvertedCoins += gained;
        deficit -= gained;
        convertedCurrencies.push({
          currencyId: c.currencyId,
          name: c.name,
          code: c.code,
          symbol: c.symbol,
          rate: c.rate,
          units: unitsNeeded,
          coinsGained: gained
        });
      }
    }

    if (totalConvertedCoins > 0) {
      account = this.economyRepo.updateBalances(guildId, userId, {
        walletBalance: account.walletBalance + totalConvertedCoins
      });

      const summaryStr = convertedCurrencies
        .map(item => `${item.units}x ${item.symbol} ${item.name}`)
        .join(', ');

      this.economyRepo.recordTransaction({
        guildId,
        userId,
        type: 'EXCHANGE_AUTO_CONVERT',
        amount: totalConvertedCoins,
        walletAfter: account.walletBalance,
        bankAfter: account.bankBalance,
        description: `Câmbio automático na carteira: ${summaryStr}`
      });

      return {
        account,
        convertedCurrencies,
        convertedNotice: `\n💱 *(Câmbio automático: ${summaryStr} utilizado(s) da sua carteira)*`
      };
    }

    return { account, convertedCurrencies: [], convertedNotice: '' };
  }

  getBalance(guildId, userId) {
    const config = this.economyRepo.getGuildConfig(guildId);
    const account = this.economyRepo.getOrCreateAccount(guildId, userId, config.bankStartingCapacity);
    const rank = this.economyRepo.getMemberRank(guildId, userId) || 1;
    const isDebt = account.walletBalance < 0;
    const debtAmount = isDebt ? Math.abs(account.walletBalance) : 0;

    const userCurrencies = this.economyRepo.getUserExchangeCurrencies
      ? this.economyRepo.getUserExchangeCurrencies(guildId, userId)
      : [];
    const exchangeAssetsValue = userCurrencies.reduce((sum, c) => sum + (c.totalValue || 0), 0);
    const effectiveWalletBalance = account.walletBalance + exchangeAssetsValue;
    const totalNetWorth = account.totalBalance + exchangeAssetsValue;

    const isBankUnlimited = Boolean(config.bankUnlimited) || config.bankStartingCapacity <= 0;

    return {
      ...account,
      rank,
      config,
      isDebt,
      debtAmount,
      userCurrencies,
      exchangeAssetsValue,
      effectiveWalletBalance,
      totalNetWorth,
      isBankUnlimited,
      formattedWallet: this.formatCurrency(account.walletBalance, config),
      formattedCompactWallet: this.formatCompactCurrency(account.walletBalance, config),
      formattedEffectiveWallet: this.formatCurrency(effectiveWalletBalance, config),
      formattedCompactEffectiveWallet: this.formatCompactCurrency(effectiveWalletBalance, config),
      formattedBank: this.formatCurrency(account.bankBalance, config),
      formattedCompactBank: this.formatCompactCurrency(account.bankBalance, config),
      formattedTotal: this.formatCurrency(account.totalBalance, config),
      formattedCompactTotal: this.formatCompactCurrency(account.totalBalance, config),
      formattedNetWorth: this.formatCurrency(totalNetWorth, config),
      formattedCompactNetWorth: this.formatCompactCurrency(totalNetWorth, config),
      formattedCapacity: isBankUnlimited ? '♾️ Ilimitada' : this.formatCurrency(account.bankCapacity, config)
    };
  }

  deposit(guildId, userId, amountInput) {
    return this.economyRepo.db.transaction(() => {
      const config = this.economyRepo.getGuildConfig(guildId);
      let account = this.economyRepo.getOrCreateAccount(guildId, userId, config.bankStartingCapacity);
      const isBankUnlimited = Boolean(config.bankUnlimited) || config.bankStartingCapacity <= 0;

      const availableCapacity = isBankUnlimited ? Infinity : Math.max(0, account.bankCapacity - account.bankBalance);

      let depositAmount;
      const isAll = typeof amountInput === 'string' && (amountInput.toLowerCase() === 'all' || amountInput.toLowerCase() === 'tudo' || amountInput.toLowerCase() === 'max');
      if (isAll) {
        if (account.walletBalance <= 0) {
          throw new Error('Você não possui moedas na carteira para depositar.');
        }
        if (!isBankUnlimited && availableCapacity <= 0) {
          throw new Error('Seu banco já atingiu a capacidade máxima de armazenamento.');
        }
        depositAmount = isBankUnlimited ? account.walletBalance : Math.min(account.walletBalance, availableCapacity);
      } else {
        depositAmount = parseInt(amountInput, 10);
      }

      if (isNaN(depositAmount) || depositAmount <= 0) {
        throw new Error('A quantia de depósito deve ser um número positivo ou "all".');
      }

      if (account.walletBalance < depositAmount) {
        const liq = this.ensureWalletLiquidity(guildId, userId, depositAmount);
        account = liq.account;
      }

      if (account.walletBalance < depositAmount) {
        throw new Error(`Saldo insuficiente na carteira. Você possui apenas ${this.formatCurrency(account.walletBalance, config)}.`);
      }

      if (!isBankUnlimited && depositAmount > availableCapacity) {
        throw new Error(`Capacidade do banco excedida. Você só pode guardar mais ${this.formatCurrency(availableCapacity, config)} no banco.`);
      }

      const updated = this.economyRepo.updateBalances(guildId, userId, {
        walletBalance: account.walletBalance - depositAmount,
        bankBalance: account.bankBalance + depositAmount
      });

      this.economyRepo.recordTransaction({
        guildId,
        userId,
        type: 'DEPOSIT',
        amount: depositAmount,
        walletAfter: updated.walletBalance,
        bankAfter: updated.bankBalance,
        description: `Depósito bancário de ${depositAmount}`
      });

      return {
        amount: depositAmount,
        walletBalance: updated.walletBalance,
        bankBalance: updated.bankBalance,
        formattedAmount: this.formatCurrency(depositAmount, config),
        formattedWallet: this.formatCurrency(updated.walletBalance, config),
        formattedBank: this.formatCurrency(updated.bankBalance, config)
      };
    });
  }

  withdraw(guildId, userId, amountInput) {
    return this.economyRepo.db.transaction(() => {
      const config = this.economyRepo.getGuildConfig(guildId);
      const account = this.economyRepo.getOrCreateAccount(guildId, userId, config.bankStartingCapacity);

      let withdrawAmount;
      const isAll = typeof amountInput === 'string' && (amountInput.toLowerCase() === 'all' || amountInput.toLowerCase() === 'tudo' || amountInput.toLowerCase() === 'max');
      if (isAll) {
        if (account.bankBalance <= 0) {
          throw new Error('Você não possui moedas guardadas no banco para sacar.');
        }
        withdrawAmount = account.bankBalance;
      } else {
        withdrawAmount = parseInt(amountInput, 10);
      }

      if (isNaN(withdrawAmount) || withdrawAmount <= 0) {
        throw new Error('A quantia de saque deve ser um número positivo ou "all".');
      }

      if (account.bankBalance < withdrawAmount) {
        throw new Error(`Saldo insuficiente no banco. Você possui ${this.formatCurrency(account.bankBalance, config)} guardados.`);
      }

      const updated = this.economyRepo.updateBalances(guildId, userId, {
        walletBalance: account.walletBalance + withdrawAmount,
        bankBalance: account.bankBalance - withdrawAmount
      });

      this.economyRepo.recordTransaction({
        guildId,
        userId,
        type: 'WITHDRAW',
        amount: withdrawAmount,
        walletAfter: updated.walletBalance,
        bankAfter: updated.bankBalance,
        description: `Saque bancário de ${withdrawAmount}`
      });

      return {
        amount: withdrawAmount,
        walletBalance: updated.walletBalance,
        bankBalance: updated.bankBalance,
        formattedAmount: this.formatCurrency(withdrawAmount, config),
        formattedWallet: this.formatCurrency(updated.walletBalance, config),
        formattedBank: this.formatCurrency(updated.bankBalance, config)
      };
    });
  }

  transfer(guildId, senderId, recipientId, amount, currencyCode = null) {
    if (this.loanService) {
      const canTrans = this.loanService.canTransfer ? this.loanService.canTransfer(guildId, senderId) : !this.loanService.isDefaulted(guildId, senderId);
      if (!canTrans) {
        throw new Error('⚠️ **Nome Sujo (Serasa Stark):** Você possui um empréstimo em atraso! Quite sua dívida com `+emprestimo pagar` antes de realizar transferências.');
      }
    }

    if (senderId === recipientId) {
      throw new Error('Você não pode transferir dinheiro para você mesmo.');
    }

    if (currencyCode) {
      return this.transferExchangeCurrency(guildId, senderId, recipientId, currencyCode, amount);
    }

    const transferAmount = parseInt(amount, 10);
    if (isNaN(transferAmount) || transferAmount <= 0) {
      throw new Error('A quantia para transferência deve ser um número positivo.');
    }

    return this.economyRepo.db.transaction(() => {
      const config = this.economyRepo.getGuildConfig(guildId);
      let sender = this.economyRepo.getOrCreateAccount(guildId, senderId);
      const recipient = this.economyRepo.getOrCreateAccount(guildId, recipientId);

      let convertedNotice = '';
      if (sender.walletBalance < transferAmount) {
        const liq = this.ensureWalletLiquidity(guildId, senderId, transferAmount);
        sender = liq.account;
        convertedNotice = liq.convertedNotice || '';
      }

      if (sender.walletBalance < transferAmount) {
        throw new Error(`Saldo insuficiente na carteira para transferir. Você possui ${this.formatCurrency(sender.walletBalance, config)}.`);
      }

      const newSenderWallet = sender.walletBalance - transferAmount;
      const newRecipientWallet = recipient.walletBalance + transferAmount;

      const updatedSender = this.economyRepo.updateBalances(guildId, senderId, {
        walletBalance: newSenderWallet
      });

      const updatedRecipient = this.economyRepo.updateBalances(guildId, recipientId, {
        walletBalance: newRecipientWallet
      });

      this.economyRepo.recordTransaction({
        guildId,
        userId: senderId,
        type: 'TRANSFER_SEND',
        amount: transferAmount,
        targetId: recipientId,
        walletAfter: updatedSender.walletBalance,
        bankAfter: updatedSender.bankBalance,
        description: `Transferência enviada para ${recipientId}`
      });

      this.economyRepo.recordTransaction({
        guildId,
        userId: recipientId,
        type: 'TRANSFER_RECEIVE',
        amount: transferAmount,
        targetId: senderId,
        walletAfter: updatedRecipient.walletBalance,
        bankAfter: updatedRecipient.bankBalance,
        description: `Transferência recebida de ${senderId}`
      });

      const formattedAmount = this.formatCurrency(transferAmount, config);
      return {
        success: true,
        senderId,
        recipientId,
        amount: transferAmount,
        senderWallet: updatedSender.walletBalance,
        recipientWallet: updatedRecipient.walletBalance,
        formattedAmount,
        convertedNotice,
        message: `Você transferiu com sucesso ${formattedAmount} para <@${recipientId}>!${convertedNotice}`
      };
    });
  }

  transferExchangeCurrency(guildId, senderId, recipientId, codeOrId, quantityInput) {
    if (this.loanService) {
      const canTrans = this.loanService.canTransfer ? this.loanService.canTransfer(guildId, senderId) : !this.loanService.isDefaulted(guildId, senderId);
      if (!canTrans) {
        throw new Error('⚠️ **Nome Sujo (Serasa Stark):** Você possui um empréstimo em atraso! Quite sua dívida com `+emprestimo pagar` antes de realizar transferências.');
      }
    }

    if (senderId === recipientId) {
      throw new Error('Você não pode transferir para você mesmo.');
    }

    const currency = this.getExchangeCurrency(guildId, codeOrId);
    if (!currency) {
      throw new Error(`Moeda de câmbio "${codeOrId}" não encontrada.`);
    }

    const currentSenderBalance = this.economyRepo.getUserCurrencyBalance(guildId, senderId, currency.id);
    let qty;
    if (typeof quantityInput === 'string' && ['all', 'tudo', 'max'].includes(quantityInput.toLowerCase())) {
      qty = currentSenderBalance;
    } else {
      qty = parseInt(quantityInput, 10);
    }

    if (isNaN(qty) || qty <= 0) {
      throw new Error('A quantidade a transferir deve ser um número positivo.');
    }

    return this.economyRepo.db.transaction(() => {
      const config = this.economyRepo.getGuildConfig(guildId);
      let senderHoldings = this.economyRepo.getUserCurrencyBalance(guildId, senderId, currency.id);

      // If sender doesn't have enough units of this currency directly, check if their wallet can buy the missing units automatically!
      if (senderHoldings < qty) {
        const missingUnits = qty - senderHoldings;
        const costNeeded = missingUnits * currency.rate;
        const senderAcc = this.economyRepo.getOrCreateAccount(guildId, senderId);
        const liq = this.ensureWalletLiquidity(guildId, senderId, costNeeded);
        if (liq.account.walletBalance >= costNeeded) {
          this.economyRepo.updateBalances(guildId, senderId, {
            walletBalance: liq.account.walletBalance - costNeeded
          });
          senderHoldings = this.economyRepo.addUserCurrencyBalance(guildId, senderId, currency.id, missingUnits);
        }
      }

      if (senderHoldings < qty) {
        throw new Error(`Saldo insuficiente de ${currency.symbol} **${currency.name}**. Você possui apenas **${senderHoldings}** unidade(s).`);
      }

      const newSenderHoldings = this.economyRepo.addUserCurrencyBalance(guildId, senderId, currency.id, -qty);
      const newRecipientHoldings = this.economyRepo.addUserCurrencyBalance(guildId, recipientId, currency.id, qty);

      const senderAcc = this.economyRepo.getOrCreateAccount(guildId, senderId);
      const recipientAcc = this.economyRepo.getOrCreateAccount(guildId, recipientId);
      const equivalentValue = qty * currency.rate;

      this.economyRepo.recordTransaction({
        guildId,
        userId: senderId,
        type: 'EXCHANGE_TRANSFER_SEND',
        amount: -equivalentValue,
        targetId: recipientId,
        walletAfter: senderAcc.walletBalance,
        bankAfter: senderAcc.bankBalance,
        description: `Enviou ${qty}x ${currency.symbol} ${currency.name} para ${recipientId}`
      });

      this.economyRepo.recordTransaction({
        guildId,
        userId: recipientId,
        type: 'EXCHANGE_TRANSFER_RECEIVE',
        amount: equivalentValue,
        targetId: senderId,
        walletAfter: recipientAcc.walletBalance,
        bankAfter: recipientAcc.bankBalance,
        description: `Recebeu ${qty}x ${currency.symbol} ${currency.name} de ${senderId}`
      });

      const formattedAmount = `${currency.symbol} **${formatCompactNumber(qty)}** ${currency.name} *(equiv. ${this.formatCompactCurrency(equivalentValue, config)})*`;

      return {
        success: true,
        isExchangeCurrency: true,
        currency,
        senderId,
        recipientId,
        amount: qty,
        equivalentValue,
        senderCurrencyBalance: newSenderHoldings,
        recipientCurrencyBalance: newRecipientHoldings,
        senderWallet: senderAcc.walletBalance,
        recipientWallet: recipientAcc.walletBalance,
        formattedAmount,
        message: `Você transferiu com sucesso ${formattedAmount} para <@${recipientId}>!`
      };
    });
  }

  payMarriageCost(guildId, userId, amountInput) {
    const amount = parseInt(amountInput, 10);
    if (isNaN(amount) || amount <= 0) return { cost: 0, paid: true };

    return this.economyRepo.db.transaction(() => {
      const config = this.economyRepo.getGuildConfig(guildId);
      let account = this.economyRepo.getOrCreateAccount(guildId, userId, config.bankStartingCapacity);
      let totalAvailable = (account.walletBalance || 0) + (account.bankBalance || 0);

      if (totalAvailable < amount) {
        const neededFromWallet = amount - Math.max(0, account.bankBalance || 0);
        const liq = this.ensureWalletLiquidity(guildId, userId, neededFromWallet);
        account = liq.account;
        totalAvailable = (account.walletBalance || 0) + (account.bankBalance || 0);
      }

      if (totalAvailable < amount) {
        throw new Error(`Saldo insuficiente! Para formalizar o casamento são necessárias ${this.formatCurrency(amount, config)}. Você possui um total de ${this.formatCurrency(totalAvailable, config)}.`);
      }

      let newWallet = account.walletBalance || 0;
      let newBank = account.bankBalance || 0;
      let remaining = amount;

      if (newWallet >= remaining) {
        newWallet -= remaining;
        remaining = 0;
      } else {
        remaining -= newWallet;
        newWallet = 0;
        newBank -= remaining;
      }

      const updated = this.economyRepo.updateBalances(guildId, userId, {
        walletBalance: newWallet,
        bankBalance: newBank
      });

      this.economyRepo.recordTransaction({
        guildId,
        userId,
        type: 'MARRIAGE_FEE',
        amount: -amount,
        targetId: 'CEREMONY',
        walletAfter: updated.walletBalance,
        bankAfter: updated.bankBalance,
        description: `Taxa de Cartório e Aliança de Casamento`
      });

      return {
        amount,
        formattedAmount: this.formatCurrency(amount, config),
        walletAfter: updated.walletBalance,
        bankAfter: updated.bankBalance
      };
    });
  }

  // ==========================================
  // 2. Income Activities: Work, Daily, Weekly, Crime, Slut
  // ==========================================

  work(guildId, userId) {
    const config = this.economyRepo.getGuildConfig(guildId);
    const remainingCooldown = this.getCooldownRemainingSeconds(guildId, userId, 'work', config.workCooldownSeconds);

    if (remainingCooldown > 0) {
      return {
        success: false,
        cooldown: true,
        remainingSeconds: remainingCooldown,
        message: `Você está exausto do trabalho! Descanse por mais **${this.formatTime(remainingCooldown)}**.`
      };
    }

    return this.economyRepo.db.transaction(() => {
      let reward = Math.floor(Math.random() * (config.workMax - config.workMin + 1)) + config.workMin;
      let jobBonusNotice = '';
      if (this.economyRepo.getEmployeeJob) {
        const job = this.economyRepo.getEmployeeJob(guildId, userId);
        if (job && job.workBonusRate > 0) {
          const bonus = Math.max(1, Math.round(reward * job.workBonusRate));
          reward += bonus;
          this.economyRepo.recordEmployeeContribution(guildId, userId, bonus);
          jobBonusNotice = `\n${job.emoji} **Bônus Corporativo (${job.companyName}):** +${this.formatCurrency(bonus, config)} *(+${Math.round(job.workBonusRate * 100)}% para você e para o cofre da empresa)*`;
        }
      }
      let loanNotice = '';
      if (this.loanService) {
        const ret = this.loanService.processIncomeRetention(guildId, userId, reward);
        if (ret && ret.retained > 0) {
          reward = ret.netReward;
          loanNotice = ret.fullyPaid
            ? `\n🎉 **Empréstimo Quitado!** ${this.formatCurrency(ret.retained, config)} foram retidos e quitaram seu empréstimo 100%! Seu nome está limpo!`
            : `\n🏦 **Amortização de Empréstimo:** ${this.formatCurrency(ret.retained, config)} (40%) foram retidos para abater sua dívida. Restam ${this.formatCurrency(ret.remainingAmount, config)} a pagar.`;
        }
      }

      const account = this.economyRepo.getOrCreateAccount(guildId, userId);
      const newWallet = account.walletBalance + reward;

      const updated = this.economyRepo.updateBalances(guildId, userId, { walletBalance: newWallet });
      this.economyRepo.setCooldown(guildId, userId, 'work');

      this.economyRepo.recordTransaction({
        guildId,
        userId,
        type: 'WORK',
        amount: reward,
        walletAfter: updated.walletBalance,
        bankAfter: updated.bankBalance,
        description: 'Recompensa por trabalho'
      });

      const template = this.workMessages[Math.floor(Math.random() * this.workMessages.length)];
      const formattedReward = this.formatCurrency(reward, config);
      let message = template.replace('{amount}', formattedReward) + jobBonusNotice + loanNotice;

      if (account.walletBalance < 0) {
        if (updated.walletBalance >= 0) {
          message += `\n🎉 **Dívida Quitada!** Seu salário cobriu todas as suas dívidas e agora você possui saldo positivo!`;
        } else {
          message += `\n📉 **Abatimento de Dívida:** Esse salário foi destinado para pagar sua dívida! Restam ${this.formatCurrency(Math.abs(updated.walletBalance), config)} para você sair do vermelho.`;
        }
      }

      return {
        success: true,
        reward,
        walletBalance: updated.walletBalance,
        formattedReward,
        message
      };
    });
  }

  daily(guildId, userId) {
    const config = this.economyRepo.getGuildConfig(guildId);
    const cooldownSeconds = config.dailyCooldownSeconds || 86400;
    const remainingCooldown = this.getCooldownRemainingSeconds(guildId, userId, 'daily', cooldownSeconds);

    if (remainingCooldown > 0) {
      return {
        success: false,
        cooldown: true,
        remainingSeconds: remainingCooldown,
        message: `Você já resgatou sua recompensa diária hoje! Volte em **${this.formatTime(remainingCooldown)}**.`
      };
    }

    return this.economyRepo.db.transaction(() => {
      let reward = config.dailyAmount;
      let loanNotice = '';
      if (this.loanService) {
        const ret = this.loanService.processIncomeRetention(guildId, userId, reward);
        if (ret && ret.retained > 0) {
          reward = ret.netReward;
          loanNotice = ret.fullyPaid
            ? `\n🎉 **Empréstimo Quitado!** ${this.formatCurrency(ret.retained, config)} foram retidos e quitaram seu empréstimo 100%! Seu nome está limpo!`
            : `\n🏦 **Amortização de Empréstimo:** ${this.formatCurrency(ret.retained, config)} (40%) foram retidos para abater sua dívida. Restam ${this.formatCurrency(ret.remainingAmount, config)} a pagar.`;
        }
      }

      const account = this.economyRepo.getOrCreateAccount(guildId, userId);
      const updated = this.economyRepo.updateBalances(guildId, userId, {
        walletBalance: account.walletBalance + reward
      });

      this.economyRepo.setCooldown(guildId, userId, 'daily');
      this.economyRepo.recordTransaction({
        guildId,
        userId,
        type: 'DAILY',
        amount: reward,
        walletAfter: updated.walletBalance,
        bankAfter: updated.bankBalance,
        description: 'Recompensa diária'
      });

      const formattedReward = this.formatCurrency(reward, config);
      let message = `Parabéns! Você resgatou sua recompensa diária de ${formattedReward}!${loanNotice}`;

      if (account.walletBalance < 0) {
        if (updated.walletBalance >= 0) {
          message += `\n🎉 **Dívida Quitada!** Sua recompensa diária zerou suas pendências financeiras!`;
        } else {
          message += `\n📉 **Abatimento de Dívida:** A recompensa diária foi abatida da sua dívida. Restam ${this.formatCurrency(Math.abs(updated.walletBalance), config)} para quitar.`;
        }
      }

      return {
        success: true,
        reward,
        walletBalance: updated.walletBalance,
        formattedReward,
        message
      };
    });
  }

  weekly(guildId, userId) {
    const config = this.economyRepo.getGuildConfig(guildId);
    const cooldownSeconds = config.weeklyCooldownSeconds || 604800;
    const remainingCooldown = this.getCooldownRemainingSeconds(guildId, userId, 'weekly', cooldownSeconds);

    if (remainingCooldown > 0) {
      return {
        success: false,
        cooldown: true,
        remainingSeconds: remainingCooldown,
        message: `Você já resgatou sua recompensa semanal! Volte em **${this.formatTime(remainingCooldown)}**.`
      };
    }

    return this.economyRepo.db.transaction(() => {
      let reward = config.weeklyAmount;
      let loanNotice = '';
      if (this.loanService) {
        const ret = this.loanService.processIncomeRetention(guildId, userId, reward);
        if (ret && ret.retained > 0) {
          reward = ret.netReward;
          loanNotice = ret.fullyPaid
            ? `\n🎉 **Empréstimo Quitado!** ${this.formatCurrency(ret.retained, config)} foram retidos e quitaram seu empréstimo 100%! Seu nome está limpo!`
            : `\n🏦 **Amortização de Empréstimo:** ${this.formatCurrency(ret.retained, config)} (40%) foram retidos para abater sua dívida. Restam ${this.formatCurrency(ret.remainingAmount, config)} a pagar.`;
        }
      }

      const account = this.economyRepo.getOrCreateAccount(guildId, userId);
      const updated = this.economyRepo.updateBalances(guildId, userId, {
        walletBalance: account.walletBalance + reward
      });

      this.economyRepo.setCooldown(guildId, userId, 'weekly');
      this.economyRepo.recordTransaction({
        guildId,
        userId,
        type: 'WEEKLY',
        amount: reward,
        walletAfter: updated.walletBalance,
        bankAfter: updated.bankBalance,
        description: 'Recompensa semanal'
      });

      const formattedReward = this.formatCurrency(reward, config);
      let message = `Recompensa semanal resgatada com sucesso! Você recebeu ${formattedReward}!${loanNotice}`;

      if (account.walletBalance < 0) {
        if (updated.walletBalance >= 0) {
          message += `\n🎉 **Dívida Quitada!** Sua recompensa semanal quitou integralmente suas pendências!`;
        } else {
          message += `\n📉 **Abatimento de Dívida:** A recompensa semanal foi abatida da sua dívida. Restam ${this.formatCurrency(Math.abs(updated.walletBalance), config)} para quitar.`;
        }
      }

      return {
        success: true,
        reward,
        walletBalance: updated.walletBalance,
        formattedReward,
        message
      };
    });
  }

  crime(guildId, userId) {
    const config = this.economyRepo.getGuildConfig(guildId);
    const remainingCooldown = this.getCooldownRemainingSeconds(guildId, userId, 'crime', config.crimeCooldownSeconds);

    if (remainingCooldown > 0) {
      return {
        success: false,
        cooldown: true,
        remainingSeconds: remainingCooldown,
        message: `A polícia ainda está patrulhando sua vizinhança! Aguarde **${this.formatTime(remainingCooldown)}**.`
      };
    }

    return this.economyRepo.db.transaction(() => {
      const isSuccess = Math.random() < config.crimeSuccessRate;
      const account = this.economyRepo.getOrCreateAccount(guildId, userId);
      this.economyRepo.setCooldown(guildId, userId, 'crime');

      if (isSuccess) {
        let reward = Math.floor(Math.random() * (config.crimeMax - config.crimeMin + 1)) + config.crimeMin;
        let loanNotice = '';
        if (this.loanService) {
          const ret = this.loanService.processIncomeRetention(guildId, userId, reward);
          if (ret && ret.retained > 0) {
            reward = ret.netReward;
            loanNotice = ret.fullyPaid
              ? `\n🎉 **Empréstimo Quitado!** ${this.formatCurrency(ret.retained, config)} foram retidos e quitaram seu empréstimo 100%! Seu nome está limpo!`
              : `\n🏦 **Amortização de Empréstimo:** ${this.formatCurrency(ret.retained, config)} (40%) foram retidos para abater sua dívida. Restam ${this.formatCurrency(ret.remainingAmount, config)} a pagar.`;
          }
        }

        const updated = this.economyRepo.updateBalances(guildId, userId, {
          walletBalance: account.walletBalance + reward
        });

        this.economyRepo.recordTransaction({
          guildId,
          userId,
          type: 'CRIME',
          amount: reward,
          walletAfter: updated.walletBalance,
          bankAfter: updated.bankBalance,
          description: 'Crime bem sucedido'
        });

        const template = this.crimeSuccessMessages[Math.floor(Math.random() * this.crimeSuccessMessages.length)];
        const formattedReward = this.formatCurrency(reward, config);

        return {
          success: true,
          reward,
          walletBalance: updated.walletBalance,
          formattedReward,
          message: template.replace('{amount}', formattedReward) + loanNotice
        };
      } else {
        const totalFunds = account.walletBalance + account.bankBalance;
        if (totalFunds === 0) {
          const adminFee = Math.max(50, Math.floor(config.crimeMin * 0.5));
          const updated = this.economyRepo.updateBalances(guildId, userId, {
            walletBalance: -adminFee,
            bankBalance: 0
          });

          this.economyRepo.recordTransaction({
            guildId,
            userId,
            type: 'CRIME_FAIL',
            amount: -adminFee,
            walletAfter: updated.walletBalance,
            bankAfter: updated.bankBalance,
            description: 'Prestou serviços comunitários e autuado em taxa administrativa'
          });

          return {
            success: false,
            fine: adminFee,
            walletBalance: updated.walletBalance,
            bankBalance: 0,
            formattedFine: this.formatCurrency(adminFee, config),
            message: `🚔 A polícia te pegou em flagrante! Como você não tinha nenhum centavo, você teve que prestar serviços comunitários e ainda foi autuado em uma taxa judicial de ${this.formatCurrency(adminFee, config)}!\n⚠️ **Você ficou ENDIVIDADO!** Saldo atual: ${this.formatCurrency(updated.walletBalance, config)}.`
          };
        }

        const rawFine = Math.floor(config.crimeMin * 0.75);
        const targetFine = Math.max(100, rawFine);

        let remainingFine = targetFine;
        let newWallet = account.walletBalance;
        let newBank = account.bankBalance;
        let fromBank = 0;

        if (newWallet > 0) {
          const fromWallet = Math.min(newWallet, remainingFine);
          newWallet -= fromWallet;
          remainingFine -= fromWallet;
        }

        if (remainingFine > 0 && newBank > 0) {
          fromBank = Math.min(newBank, remainingFine);
          newBank -= fromBank;
          remainingFine -= fromBank;
        }

        // Remainder plunges wallet into negative balance (debt)
        if (remainingFine > 0) {
          newWallet -= remainingFine;
        }

        const updated = this.economyRepo.updateBalances(guildId, userId, {
          walletBalance: newWallet,
          bankBalance: newBank
        });

        this.economyRepo.recordTransaction({
          guildId,
          userId,
          type: 'CRIME_FAIL',
          amount: -targetFine,
          walletAfter: updated.walletBalance,
          bankAfter: updated.bankBalance,
          description: fromBank > 0 ? `Falha no crime - multa (${fromBank} debitado do banco)` : 'Falha no crime - multa'
        });

        const template = this.crimeFailMessages[Math.floor(Math.random() * this.crimeFailMessages.length)];
        const formattedFine = this.formatCurrency(targetFine, config);
        let message = template.replace('{amount}', formattedFine);
        if (fromBank > 0) {
          message += ` *(Como sua carteira não cobria o valor, ${this.formatCurrency(fromBank, config)} foi debitado do seu banco)*`;
        }
        if (updated.walletBalance < 0) {
          message += `\n⚠️ **Você não tinha fundos suficientes e ficou ENDIVIDADO!** Saldo atual na carteira: ${this.formatCurrency(updated.walletBalance, config)}. Suas próximas rendas serão usadas para abater a dívida.`;
        }

        return {
          success: false,
          fine: targetFine,
          walletBalance: updated.walletBalance,
          bankBalance: updated.bankBalance,
          formattedFine,
          message
        };
      }
    });
  }

  slut(guildId, userId) {
    const config = this.economyRepo.getGuildConfig(guildId);
    const cooldownSeconds = config.slutCooldownSeconds || 7200;
    const remainingCooldown = this.getCooldownRemainingSeconds(guildId, userId, 'slut', cooldownSeconds);

    if (remainingCooldown > 0) {
      return {
        success: false,
        cooldown: true,
        remainingSeconds: remainingCooldown,
        message: `Você precisa descansar a imagem antes do próximo evento! Aguarde **${this.formatTime(remainingCooldown)}**.`
      };
    }

    return this.economyRepo.db.transaction(() => {
      const isSuccess = Math.random() < (config.slutSuccessRate ?? 0.65);
      const account = this.economyRepo.getOrCreateAccount(guildId, userId);
      this.economyRepo.setCooldown(guildId, userId, 'slut');

      if (isSuccess) {
        const minReward = config.slutMin || 80;
        const maxReward = config.slutMax || 350;
        let reward = Math.floor(Math.random() * (maxReward - minReward + 1)) + minReward;
        let loanNotice = '';
        if (this.loanService) {
          const ret = this.loanService.processIncomeRetention(guildId, userId, reward);
          if (ret && ret.retained > 0) {
            reward = ret.netReward;
            loanNotice = ret.fullyPaid
              ? `\n🎉 **Empréstimo Quitado!** ${this.formatCurrency(ret.retained, config)} foram retidos e quitaram seu empréstimo 100%! Seu nome está limpo!`
              : `\n🏦 **Amortização de Empréstimo:** ${this.formatCurrency(ret.retained, config)} (40%) foram retidos para abater sua dívida. Restam ${this.formatCurrency(ret.remainingAmount, config)} a pagar.`;
          }
        }

        const updated = this.economyRepo.updateBalances(guildId, userId, {
          walletBalance: account.walletBalance + reward
        });

        this.economyRepo.recordTransaction({
          guildId,
          userId,
          type: 'SLUT',
          amount: reward,
          walletAfter: updated.walletBalance,
          bankAfter: updated.bankBalance,
          description: 'Trabalho de entretenimento adulto / carisma'
        });

        const template = this.slutSuccessMessages[Math.floor(Math.random() * this.slutSuccessMessages.length)];
        const formattedReward = this.formatCurrency(reward, config);

        return {
          success: true,
          reward,
          walletBalance: updated.walletBalance,
          formattedReward,
          message: template.replace('{amount}', formattedReward) + loanNotice
        };
      } else {
        const rawFine = Math.floor(Math.random() * (140 - 50 + 1)) + 50;
        const targetFine = Math.max(50, rawFine);

        let remainingFine = targetFine;
        let newWallet = account.walletBalance;
        let newBank = account.bankBalance;
        let fromBank = 0;

        if (newWallet > 0) {
          const fromWallet = Math.min(newWallet, remainingFine);
          newWallet -= fromWallet;
          remainingFine -= fromWallet;
        }

        if (remainingFine > 0 && newBank > 0) {
          fromBank = Math.min(newBank, remainingFine);
          newBank -= fromBank;
          remainingFine -= fromBank;
        }

        if (remainingFine > 0) {
          newWallet -= remainingFine;
        }

        const updated = this.economyRepo.updateBalances(guildId, userId, {
          walletBalance: newWallet,
          bankBalance: newBank
        });

        this.economyRepo.recordTransaction({
          guildId,
          userId,
          type: 'SLUT_FAIL',
          amount: -targetFine,
          walletAfter: updated.walletBalance,
          bankAfter: updated.bankBalance,
          description: fromBank > 0 ? `Prejuízo no entretenimento (${fromBank} debitado do banco)` : 'Prejuízo no entretenimento'
        });

        const template = this.slutFailMessages[Math.floor(Math.random() * this.slutFailMessages.length)];
        const formattedFine = this.formatCurrency(targetFine, config);
        let message = template.replace('{amount}', formattedFine);
        if (fromBank > 0) {
          message += ` *(Como sua carteira não cobria o valor, ${this.formatCurrency(fromBank, config)} foi debitado do seu banco)*`;
        }
        if (updated.walletBalance < 0) {
          message += `\n⚠️ **Prejuízo total! Você entrou em dívida:** ${this.formatCurrency(updated.walletBalance, config)}.`;
        }

        return {
          success: false,
          fine: targetFine,
          walletBalance: updated.walletBalance,
          bankBalance: updated.bankBalance,
          formattedFine,
          message
        };
      }
    });
  }

  rob(guildId, robberId, victimId) {
    if (robberId === victimId) {
      throw new Error('Você não pode roubar você mesmo.');
    }

    const config = this.economyRepo.getGuildConfig(guildId);
    const remainingCooldown = this.getCooldownRemainingSeconds(guildId, robberId, 'rob', config.robCooldownSeconds);

    if (remainingCooldown > 0) {
      return {
        success: false,
        cooldown: true,
        remainingSeconds: remainingCooldown,
        message: `Você precisa ficar discreto! Pode tentar roubar novamente em **${this.formatTime(remainingCooldown)}**.`
      };
    }

    return this.economyRepo.db.transaction(() => {
      const robberAccount = this.economyRepo.getOrCreateAccount(guildId, robberId);
      const victimAccount = this.economyRepo.getOrCreateAccount(guildId, victimId);

      const MIN_VICTIM_BALANCE = 100;
      const MIN_ROBBER_BALANCE = 50;

      if (victimAccount.walletBalance < MIN_VICTIM_BALANCE) {
        throw new Error(`A vítima está falida! Ela precisa ter pelo menos ${this.formatCurrency(MIN_VICTIM_BALANCE, config)} na carteira.`);
      }

      if (robberAccount.walletBalance < MIN_ROBBER_BALANCE) {
        throw new Error(`Você precisa ter pelo menos ${this.formatCurrency(MIN_ROBBER_BALANCE, config)} na carteira para cobrir uma possível multa em caso de flagrante.`);
      }

      this.economyRepo.setCooldown(guildId, robberId, 'rob');
      const isSuccess = Math.random() < config.robSuccessRate;

      if (isSuccess) {
        // Steal between 20% and 50% of victim wallet
        const stealPercent = 0.20 + Math.random() * 0.30;
        const stolenAmount = Math.max(1, Math.floor(victimAccount.walletBalance * stealPercent));

        const updatedVictim = this.economyRepo.updateBalances(guildId, victimId, {
          walletBalance: victimAccount.walletBalance - stolenAmount
        });

        const updatedRobber = this.economyRepo.updateBalances(guildId, robberId, {
          walletBalance: robberAccount.walletBalance + stolenAmount
        });

        this.economyRepo.recordTransaction({
          guildId,
          userId: robberId,
          type: 'ROB_SUCCESS',
          amount: stolenAmount,
          targetId: victimId,
          walletAfter: updatedRobber.walletBalance,
          bankAfter: updatedRobber.bankBalance,
          description: `Roubou com sucesso de ${victimId}`
        });

        this.economyRepo.recordTransaction({
          guildId,
          userId: victimId,
          type: 'ROBBED',
          amount: -stolenAmount,
          targetId: robberId,
          walletAfter: updatedVictim.walletBalance,
          bankAfter: updatedVictim.bankBalance,
          description: `Foi roubado por ${robberId}`
        });

        const formattedStolen = this.formatCurrency(stolenAmount, config);
        return {
          success: true,
          amount: stolenAmount,
          formattedAmount: formattedStolen,
          message: `⚔️ Sucesso! Você assaltou a carteira de <@${victimId}> e levou ${formattedStolen}!`
        };
      } else {
        // Failed: pay compensation to victim + legal fine (can drive robber into debt!)
        const fine = Math.max(120, Math.floor(victimAccount.walletBalance * (config.robFinePercent || 0.25)));

        let remainingFine = fine;
        let newRobberWallet = robberAccount.walletBalance;
        let newRobberBank = robberAccount.bankBalance;
        let fromBank = 0;

        if (newRobberWallet > 0) {
          const fromWallet = Math.min(newRobberWallet, remainingFine);
          newRobberWallet -= fromWallet;
          remainingFine -= fromWallet;
        }

        if (remainingFine > 0 && newRobberBank > 0) {
          fromBank = Math.min(newRobberBank, remainingFine);
          newRobberBank -= fromBank;
          remainingFine -= fromBank;
        }

        // Remainder plunges robber into debt (saldo negativo)
        if (remainingFine > 0) {
          newRobberWallet -= remainingFine;
        }

        const updatedRobber = this.economyRepo.updateBalances(guildId, robberId, {
          walletBalance: newRobberWallet,
          bankBalance: newRobberBank
        });

        const updatedVictim = this.economyRepo.updateBalances(guildId, victimId, {
          walletBalance: victimAccount.walletBalance + fine
        });

        this.economyRepo.recordTransaction({
          guildId,
          userId: robberId,
          type: 'ROB_FAIL',
          amount: -fine,
          targetId: victimId,
          walletAfter: updatedRobber.walletBalance,
          bankAfter: updatedRobber.bankBalance,
          description: `Falhou ao tentar roubar ${victimId} e pagou indenização`
        });

        this.economyRepo.recordTransaction({
          guildId,
          userId: victimId,
          type: 'ROB_COMPENSATION',
          amount: fine,
          targetId: robberId,
          walletAfter: updatedVictim.walletBalance,
          bankAfter: updatedVictim.bankBalance,
          description: `Indenização recebida pela tentativa de roubo de ${robberId}`
        });

        const formattedFine = this.formatCurrency(fine, config);
        let msg = `🚨 **Flagrante!** Você foi pego tentando assaltar <@${victimId}> e teve que pagar uma indenização de ${formattedFine}!`;
        if (fromBank > 0) {
          msg += ` *(Como sua carteira não cobria o valor, ${this.formatCurrency(fromBank, config)} foi debitado do seu banco)*`;
        }
        if (updatedRobber.walletBalance < 0) {
          msg += `\n⚠️ **Você não tinha fundos suficientes e ficou ENDIVIDADO!** Saldo atual: ${this.formatCurrency(updatedRobber.walletBalance, config)}. Suas próximas rendas serão usadas para abater a dívida.`;
        }

        return {
          success: false,
          fine,
          walletBalance: updatedRobber.walletBalance,
          bankBalance: updatedRobber.bankBalance,
          formattedFine,
          message: msg
        };
      }
    });
  }

  // ==========================================
  // 3. Virtual Gambling (Coinflip, Dice, Slots, Gamble, Roulette)
  // ==========================================

  _checkCasinoAccess(guildId, userId) {
    if (this.loanService) {
      const canPlay = this.loanService.canUseCasino
        ? this.loanService.canUseCasino(guildId, userId)
        : !this.loanService.isDefaulted(guildId, userId);
      if (!canPlay) {
        throw new Error('⚠️ **Nome Sujo (Serasa Stark):** Você possui um empréstimo em atraso! Quite sua dívida com `+emprestimo pagar` antes de apostar no cassino.');
      }
    }
  }

  _settleExchangeCurrencyBet(guildId, userId, currency, betUnits, netMultiplierDelta, txTypeWin, txTypeLoss, desc) {
    // netMultiplierDelta: e.g. +1 for 2x win, +5 for 6x win, +0.5 for 1.5x win, -1 for loss
    const config = this.economyRepo.getGuildConfig(guildId);
    let holdings = this.economyRepo.getUserCurrencyBalance(guildId, userId, currency.id);

    if (holdings < betUnits) {
      const missingUnits = betUnits - holdings;
      const neededCoins = missingUnits * currency.rate;
      const liq = this.ensureWalletLiquidity(guildId, userId, neededCoins);
      if (liq.account.walletBalance >= neededCoins) {
        this.economyRepo.updateBalances(guildId, userId, {
          walletBalance: liq.account.walletBalance - neededCoins
        });
        holdings = this.economyRepo.addUserCurrencyBalance(guildId, userId, currency.id, missingUnits);
      }
    }

    if (holdings < betUnits) {
      throw new Error(`Saldo insuficiente de ${currency.symbol} **${currency.name}** na carteira. Você possui **${holdings}** unidade(s).`);
    }

    const isWin = netMultiplierDelta > 0;
    const rawUnitDelta = betUnits * netMultiplierDelta;
    const wholeUnitsDelta = isWin ? Math.floor(rawUnitDelta) : -betUnits;
    const fractionalUnits = isWin ? (rawUnitDelta - wholeUnitsDelta) : 0;
    const bonusBaseCoins = fractionalUnits > 0 ? Math.round(fractionalUnits * currency.rate) : 0;

    const newHoldings = this.economyRepo.addUserCurrencyBalance(guildId, userId, currency.id, wholeUnitsDelta);
    let account = this.economyRepo.getOrCreateAccount(guildId, userId, config.bankStartingCapacity);
    if (bonusBaseCoins > 0) {
      account = this.economyRepo.updateBalances(guildId, userId, {
        walletBalance: account.walletBalance + bonusBaseCoins
      });
    }

    const equivalentCoinDelta = Math.round(rawUnitDelta * currency.rate);
    this.economyRepo.recordTransaction({
      guildId,
      userId,
      type: isWin ? txTypeWin : txTypeLoss,
      amount: equivalentCoinDelta,
      walletAfter: account.walletBalance,
      bankAfter: account.bankBalance,
      description: `${desc} [${betUnits}x ${currency.symbol} ${currency.name}]`
    });

    const formattedBet = `${currency.symbol} **${formatCompactNumber(betUnits)}** ${currency.name}`;
    let formattedGain;
    if (isWin) {
      const parts = [];
      if (wholeUnitsDelta > 0) parts.push(`${currency.symbol} **${formatCompactNumber(wholeUnitsDelta)}** ${currency.name}`);
      if (bonusBaseCoins > 0) parts.push(this.formatCurrency(bonusBaseCoins, config));
      formattedGain = parts.join(' + ') || formattedBet;
    } else {
      formattedGain = formattedBet;
    }

    return {
      newHoldings,
      walletBalance: account.walletBalance,
      formattedBet,
      formattedGain
    };
  }

  coinflip(guildId, userId, choice, betAmountInput, currencyCode = null) {
    this._checkCasinoAccess(guildId, userId);

    const cleanChoice = String(choice).toLowerCase().trim();
    if (cleanChoice !== 'cara' && cleanChoice !== 'coroa') {
      throw new Error('Escolha inválida. Você deve escolher entre "cara" ou "coroa".');
    }

    const casinoConfig = this.casinoRepo?.getCasinoConfig(guildId) || {
      coinflipEnabled: true,
      coinflipMin: 10,
      coinflipMax: 30000,
      coinflipWinRate: 0.5
    };

    if (!casinoConfig.coinflipEnabled) {
      throw new Error('O jogo de Cara ou Coroa está temporariamente desativado neste servidor pela administração.');
    }

    if (currencyCode) {
      const currency = this.getExchangeCurrency(guildId, currencyCode);
      if (!currency) throw new Error(`Moeda "${currencyCode}" não encontrada.`);
      const currentHoldings = this.economyRepo.getUserCurrencyBalance(guildId, userId, currency.id);
      const betUnits = (typeof betAmountInput === 'string' && ['all', 'tudo', 'max'].includes(betAmountInput.toLowerCase()))
        ? currentHoldings
        : parseInt(betAmountInput, 10);
      if (isNaN(betUnits) || betUnits <= 0) {
        throw new Error(`Informe uma quantidade válida de ${currency.symbol} ${currency.name} para apostar.`);
      }

      return this.economyRepo.db.transaction(() => {
        const winRate = Number(casinoConfig.coinflipWinRate) || 0.5;
        const isWin = Math.random() < winRate;
        const coinResult = isWin ? cleanChoice : (cleanChoice === 'cara' ? 'coroa' : 'cara');

        const settled = this._settleExchangeCurrencyBet(
          guildId,
          userId,
          currency,
          betUnits,
          isWin ? 1 : -1,
          'COINFLIP_WIN',
          'COINFLIP_LOSS',
          `Cara ou Coroa: escolheu ${cleanChoice}, deu ${coinResult}`
        );

        return {
          success: isWin,
          isExchangeCurrency: true,
          currency,
          coinResult,
          choice: cleanChoice,
          bet: betUnits,
          currencyBalance: settled.newHoldings,
          walletBalance: settled.walletBalance,
          formattedBet: settled.formattedBet,
          message: isWin
            ? `🪙 A moeda caiu em **${coinResult.toUpperCase()}**! Você acertou e ganhou ${settled.formattedGain}!`
            : `🪙 A moeda caiu em **${coinResult.toUpperCase()}**! Você errou e perdeu ${settled.formattedBet}.`
        };
      });
    }

    const bet = parseInt(betAmountInput, 10);
    if (isNaN(bet) || bet <= 0) {
      throw new Error('O valor da aposta deve ser um número positivo.');
    }

    if (bet < casinoConfig.coinflipMin || bet > casinoConfig.coinflipMax) {
      throw new Error(`A aposta no Cara ou Coroa deve ser entre ${casinoConfig.coinflipMin.toLocaleString('pt-BR')} e ${casinoConfig.coinflipMax.toLocaleString('pt-BR')} moedas.`);
    }

    return this.economyRepo.db.transaction(() => {
      const config = this.economyRepo.getGuildConfig(guildId);
      let account = this.economyRepo.getOrCreateAccount(guildId, userId, config.bankStartingCapacity);

      if (account.walletBalance < 0) {
        throw new Error(`❌ Você está endividado (${this.formatCurrency(account.walletBalance, config)})! O cassino não aceita apostas de membros com dívidas ativas.`);
      }

      let convertedNotice = '';
      if (account.walletBalance < bet) {
        const liq = this.ensureWalletLiquidity(guildId, userId, bet);
        account = liq.account;
        convertedNotice = liq.convertedNotice || '';
      }

      if (account.walletBalance < bet) {
        throw new Error(`Saldo insuficiente na carteira. Você possui ${this.formatCurrency(account.walletBalance, config)}.`);
      }

      const winRate = Number(casinoConfig.coinflipWinRate) || 0.5;
      const isWin = Math.random() < winRate;
      const coinResult = isWin ? cleanChoice : (cleanChoice === 'cara' ? 'coroa' : 'cara');

      const newWallet = isWin ? account.walletBalance + bet : account.walletBalance - bet;
      const updated = this.economyRepo.updateBalances(guildId, userId, { walletBalance: newWallet });

      this.economyRepo.recordTransaction({
        guildId,
        userId,
        type: isWin ? 'COINFLIP_WIN' : 'COINFLIP_LOSS',
        amount: isWin ? bet : -bet,
        walletAfter: updated.walletBalance,
        bankAfter: updated.bankBalance,
        description: `Cara ou Coroa: escolheu ${cleanChoice}, deu ${coinResult}`
      });

      const formattedBet = this.formatCurrency(bet, config);
      return {
        success: isWin,
        coinResult,
        choice: cleanChoice,
        bet,
        walletBalance: updated.walletBalance,
        formattedBet,
        message: (isWin
          ? `🪙 A moeda caiu em **${coinResult.toUpperCase()}**! Você acertou e ganhou ${formattedBet}!`
          : `🪙 A moeda caiu em **${coinResult.toUpperCase()}**! Você errou e perdeu ${formattedBet}.`) + convertedNotice
      };
    });
  }

  dice(guildId, userId, guessInput, betAmountInput, currencyCode = null) {
    this._checkCasinoAccess(guildId, userId);

    const guess = parseInt(guessInput, 10);
    if (isNaN(guess) || guess < 1 || guess > 6) {
      throw new Error('O palpite no dado deve ser um número de 1 a 6.');
    }

    const casinoConfig = this.casinoRepo?.getCasinoConfig(guildId) || {
      diceEnabled: true,
      diceMin: 10,
      diceMax: 20000,
      diceMultiplier: 5
    };

    if (!casinoConfig.diceEnabled) {
      throw new Error('O jogo de Dados está temporariamente desativado neste servidor pela administração.');
    }

    if (currencyCode) {
      const currency = this.getExchangeCurrency(guildId, currencyCode);
      if (!currency) throw new Error(`Moeda "${currencyCode}" não encontrada.`);
      const currentHoldings = this.economyRepo.getUserCurrencyBalance(guildId, userId, currency.id);
      const betUnits = (typeof betAmountInput === 'string' && ['all', 'tudo', 'max'].includes(betAmountInput.toLowerCase()))
        ? currentHoldings
        : parseInt(betAmountInput, 10);
      if (isNaN(betUnits) || betUnits <= 0) {
        throw new Error(`Informe uma quantidade válida de ${currency.symbol} ${currency.name} para apostar.`);
      }

      return this.economyRepo.db.transaction(() => {
        const diceResult = Math.floor(Math.random() * 6) + 1;
        const isWin = diceResult === guess;
        const mult = Number(casinoConfig.diceMultiplier) || 5;

        const settled = this._settleExchangeCurrencyBet(
          guildId,
          userId,
          currency,
          betUnits,
          isWin ? mult : -1,
          'DICE_WIN',
          'DICE_LOSS',
          `Aposta de dado: palpite ${guess}, rolou ${diceResult}`
        );

        return {
          success: isWin,
          isExchangeCurrency: true,
          currency,
          diceResult,
          guess,
          bet: betUnits,
          currencyBalance: settled.newHoldings,
          walletBalance: settled.walletBalance,
          formattedGain: settled.formattedGain,
          message: isWin
            ? `🎲 O dado rolou **${diceResult}**! Parabéns, você acertou em cheio e faturou ${settled.formattedGain}!`
            : `🎲 O dado rolou **${diceResult}**! Você apostou no **${guess}** e perdeu ${settled.formattedBet}.`
        };
      });
    }

    const bet = parseInt(betAmountInput, 10);
    if (isNaN(bet) || bet <= 0) {
      throw new Error('O valor da aposta deve ser um número positivo.');
    }

    if (bet < casinoConfig.diceMin || bet > casinoConfig.diceMax) {
      throw new Error(`A aposta no Dado deve ser entre ${casinoConfig.diceMin.toLocaleString('pt-BR')} e ${casinoConfig.diceMax.toLocaleString('pt-BR')} moedas.`);
    }

    return this.economyRepo.db.transaction(() => {
      const config = this.economyRepo.getGuildConfig(guildId);
      let account = this.economyRepo.getOrCreateAccount(guildId, userId, config.bankStartingCapacity);

      if (account.walletBalance < 0) {
        throw new Error(`❌ Você está endividado (${this.formatCurrency(account.walletBalance, config)})! O cassino não aceita apostas de membros com dívidas ativas.`);
      }

      let convertedNotice = '';
      if (account.walletBalance < bet) {
        const liq = this.ensureWalletLiquidity(guildId, userId, bet);
        account = liq.account;
        convertedNotice = liq.convertedNotice || '';
      }

      if (account.walletBalance < bet) {
        throw new Error(`Saldo insuficiente na carteira. Você possui ${this.formatCurrency(account.walletBalance, config)}.`);
      }

      const diceResult = Math.floor(Math.random() * 6) + 1;
      const isWin = diceResult === guess;

      let newWallet;
      let netGain;
      if (isWin) {
        const mult = Number(casinoConfig.diceMultiplier) || 5;
        netGain = bet * mult;
        newWallet = account.walletBalance + netGain;
      } else {
        netGain = -bet;
        newWallet = account.walletBalance - bet;
      }

      const updated = this.economyRepo.updateBalances(guildId, userId, { walletBalance: newWallet });

      this.economyRepo.recordTransaction({
        guildId,
        userId,
        type: isWin ? 'DICE_WIN' : 'DICE_LOSS',
        amount: netGain,
        walletAfter: updated.walletBalance,
        bankAfter: updated.bankBalance,
        description: `Aposta de dado: palpite ${guess}, rolou ${diceResult}`
      });

      const formattedBet = this.formatCurrency(bet, config);
      const formattedGain = this.formatCurrency(netGain, config);

      return {
        success: isWin,
        diceResult,
        guess,
        bet,
        netGain,
        walletBalance: updated.walletBalance,
        formattedGain,
        message: (isWin
          ? `🎲 O dado rolou **${diceResult}**! Parabéns, você acertou em cheio e faturou ${formattedGain} (6x)!`
          : `🎲 O dado rolou **${diceResult}**! Você apostou no **${guess}** e perdeu ${formattedBet}.`) + convertedNotice
      };
    });
  }

  slots(guildId, userId, betAmountInput, currencyCode = null) {
    this._checkCasinoAccess(guildId, userId);

    const casinoConfig = this.casinoRepo?.getCasinoConfig(guildId) || {
      slotsEnabled: true,
      slotsMin: 10,
      slotsMax: 25000,
      slotsMultiplier3x: 10,
      slotsMultiplier2x: 2
    };

    if (!casinoConfig.slotsEnabled) {
      throw new Error('A máquina de Caça-Níqueis está temporariamente desativada neste servidor pela administração.');
    }

    const icons = ['🍒', '🍋', '🍇', '💎', '7️⃣'];
    const reel1 = icons[Math.floor(Math.random() * icons.length)];
    const reel2 = icons[Math.floor(Math.random() * icons.length)];
    const reel3 = icons[Math.floor(Math.random() * icons.length)];
    const displayReels = `[ ${reel1} | ${reel2} | ${reel3} ]`;

    let isWin = false;
    let multiplier = 0;
    if (reel1 === reel2 && reel2 === reel3) {
      multiplier = Number(casinoConfig.slotsMultiplier3x) || 10;
      isWin = true;
    } else if (reel1 === reel2 || reel2 === reel3 || reel1 === reel3) {
      multiplier = Number(casinoConfig.slotsMultiplier2x) || 2;
      isWin = true;
    }

    if (currencyCode) {
      const currency = this.getExchangeCurrency(guildId, currencyCode);
      if (!currency) throw new Error(`Moeda "${currencyCode}" não encontrada.`);
      const currentHoldings = this.economyRepo.getUserCurrencyBalance(guildId, userId, currency.id);
      const betUnits = (typeof betAmountInput === 'string' && ['all', 'tudo', 'max'].includes(betAmountInput.toLowerCase()))
        ? currentHoldings
        : parseInt(betAmountInput, 10);
      if (isNaN(betUnits) || betUnits <= 0) {
        throw new Error(`Informe uma quantidade válida de ${currency.symbol} ${currency.name} para apostar.`);
      }

      return this.economyRepo.db.transaction(() => {
        const netMult = isWin ? Math.max(0.5, multiplier - 1) : -1;
        const settled = this._settleExchangeCurrencyBet(
          guildId,
          userId,
          currency,
          betUnits,
          netMult,
          'SLOTS_WIN',
          'SLOTS_LOSS',
          `Caça-níqueis: ${reel1}${reel2}${reel3} (multiplicador ${multiplier}x)`
        );

        let message;
        if (reel1 === reel2 && reel2 === reel3) {
          message = `🎰 **JACKPOT!** ${displayReels}\nTrinca perfeita! Você ganhou ${settled.formattedGain} (${multiplier}x)!`;
        } else if (isWin) {
          message = `🎰 ${displayReels}\nDupla premiada! Você lucrou ${settled.formattedGain} (${multiplier}x)!`;
        } else {
          message = `🎰 ${displayReels}\nNenhuma combinação premiada. Você perdeu ${settled.formattedBet}.`;
        }

        return {
          success: isWin,
          isExchangeCurrency: true,
          currency,
          displayReels,
          multiplier,
          bet: betUnits,
          currencyBalance: settled.newHoldings,
          walletBalance: settled.walletBalance,
          message
        };
      });
    }

    const bet = parseInt(betAmountInput, 10);
    if (isNaN(bet) || bet <= 0) {
      throw new Error('O valor da aposta deve ser um número positivo.');
    }

    if (bet < casinoConfig.slotsMin || bet > casinoConfig.slotsMax) {
      throw new Error(`A aposta no Caça-Níqueis deve ser entre ${casinoConfig.slotsMin.toLocaleString('pt-BR')} e ${casinoConfig.slotsMax.toLocaleString('pt-BR')} moedas.`);
    }

    return this.economyRepo.db.transaction(() => {
      const config = this.economyRepo.getGuildConfig(guildId);
      let account = this.economyRepo.getOrCreateAccount(guildId, userId, config.bankStartingCapacity);

      if (account.walletBalance < 0) {
        throw new Error(`❌ Você está endividado (${this.formatCurrency(account.walletBalance, config)})! O cassino não aceita apostas de membros com dívidas ativas.`);
      }

      let convertedNotice = '';
      if (account.walletBalance < bet) {
        const liq = this.ensureWalletLiquidity(guildId, userId, bet);
        account = liq.account;
        convertedNotice = liq.convertedNotice || '';
      }

      if (account.walletBalance < bet) {
        throw new Error(`Saldo insuficiente na carteira. Você possui ${this.formatCurrency(account.walletBalance, config)}.`);
      }

      const netGain = isWin ? Math.round(bet * (multiplier - 1)) : -bet;
      const newWallet = account.walletBalance + netGain;
      const updated = this.economyRepo.updateBalances(guildId, userId, { walletBalance: newWallet });

      this.economyRepo.recordTransaction({
        guildId,
        userId,
        type: isWin ? 'SLOTS_WIN' : 'SLOTS_LOSS',
        amount: netGain,
        walletAfter: updated.walletBalance,
        bankAfter: updated.bankBalance,
        description: `Caça-níqueis: ${reel1}${reel2}${reel3} (multiplicador ${multiplier}x)`
      });

      const formattedBet = this.formatCurrency(bet, config);
      const formattedGain = this.formatCurrency(Math.abs(netGain), config);

      let message;
      if (reel1 === reel2 && reel2 === reel3) {
        message = `🎰 **JACKPOT!** ${displayReels}\nTrinca perfeita! Você ganhou ${formattedGain} (${multiplier}x)!`;
      } else if (isWin) {
        message = `🎰 ${displayReels}\nDupla premiada! Você lucrou ${formattedGain} (${multiplier}x)!`;
      } else {
        message = `🎰 ${displayReels}\nNenhuma combinação premiada. Você perdeu ${formattedBet}.`;
      }

      return {
        success: isWin,
        displayReels,
        multiplier,
        netGain,
        walletBalance: updated.walletBalance,
        message: message + convertedNotice
      };
    });
  }

  gamble(guildId, userId, betAmountInput, currencyCode = null) {
    this._checkCasinoAccess(guildId, userId);

    const config = this.economyRepo.getGuildConfig(guildId);
    const winThreshold = Math.round((config.gambleWinRate ?? 0.48) * 100);
    const userRoll = Math.floor(Math.random() * 100) + 1;
    const isWin = userRoll <= winThreshold;

    if (currencyCode) {
      const currency = this.getExchangeCurrency(guildId, currencyCode);
      if (!currency) throw new Error(`Moeda "${currencyCode}" não encontrada.`);
      const currentHoldings = this.economyRepo.getUserCurrencyBalance(guildId, userId, currency.id);
      const betUnits = (typeof betAmountInput === 'string' && ['all', 'tudo', 'max'].includes(betAmountInput.toLowerCase()))
        ? currentHoldings
        : parseInt(betAmountInput, 10);
      if (isNaN(betUnits) || betUnits <= 0) {
        throw new Error(`Informe uma quantidade válida de ${currency.symbol} ${currency.name} para apostar.`);
      }

      return this.economyRepo.db.transaction(() => {
        const settled = this._settleExchangeCurrencyBet(
          guildId,
          userId,
          currency,
          betUnits,
          isWin ? 1 : -1,
          'GAMBLE_WIN',
          'GAMBLE_LOSS',
          `Aposta geral: rolagem ${userRoll}/100`
        );

        return {
          success: isWin,
          won: isWin,
          isExchangeCurrency: true,
          currency,
          roll: userRoll,
          bet: betUnits,
          currencyBalance: settled.newHoldings,
          walletBalance: settled.walletBalance,
          message: isWin
            ? `🎲 Você rolou **${userRoll}**/100 e venceu a banca! Ganhou ${settled.formattedGain}!`
            : `🎲 Você rolou **${userRoll}**/100 e perdeu para a banca. Perdeu ${settled.formattedBet}.`
        };
      });
    }

    const bet = parseInt(betAmountInput, 10);
    if (isNaN(bet) || bet <= 0) {
      throw new Error('O valor da aposta deve ser um número positivo.');
    }

    return this.economyRepo.db.transaction(() => {
      let account = this.economyRepo.getOrCreateAccount(guildId, userId, config.bankStartingCapacity);

      if (config.gambleMin && bet < config.gambleMin) {
        throw new Error(`O valor mínimo para apostar é de ${this.formatCurrency(config.gambleMin, config)}.`);
      }
      if (config.gambleMax && bet > config.gambleMax) {
        throw new Error(`O valor máximo para apostar é de ${this.formatCurrency(config.gambleMax, config)}.`);
      }

      if (account.walletBalance < 0) {
        throw new Error(`❌ Você está endividado (${this.formatCurrency(account.walletBalance, config)})! O cassino não aceita apostas de membros com dívidas ativas.`);
      }

      let convertedNotice = '';
      if (account.walletBalance < bet) {
        const liq = this.ensureWalletLiquidity(guildId, userId, bet);
        account = liq.account;
        convertedNotice = liq.convertedNotice || '';
      }

      if (account.walletBalance < bet) {
        throw new Error(`Saldo insuficiente na carteira. Você possui ${this.formatCurrency(account.walletBalance, config)}.`);
      }

      const netGain = isWin ? bet : -bet;
      const updated = this.economyRepo.updateBalances(guildId, userId, {
        walletBalance: account.walletBalance + netGain
      });

      this.economyRepo.recordTransaction({
        guildId,
        userId,
        type: isWin ? 'GAMBLE_WIN' : 'GAMBLE_LOSS',
        amount: netGain,
        walletAfter: updated.walletBalance,
        bankAfter: updated.bankBalance,
        description: `Aposta geral: rolagem ${userRoll}/100`
      });

      const formattedBet = this.formatCurrency(bet, config);
      return {
        success: isWin,
        won: isWin,
        roll: userRoll,
        bet,
        walletBalance: updated.walletBalance,
        message: (isWin
          ? `🎲 Você rolou **${userRoll}**/100 e venceu a banca! Ganhou ${formattedBet}!`
          : `🎲 Você rolou **${userRoll}**/100 e perdeu para a banca. Perdeu ${formattedBet}.`) + convertedNotice
      };
    });
  }

  roulette(guildId, userId, betAmountInput, choiceInput, currencyCode = null) {
    this._checkCasinoAccess(guildId, userId);

    const casinoConfig = this.casinoRepo?.getCasinoConfig(guildId) || {
      rouletteEnabled: true,
      rouletteMin: 20,
      rouletteMax: 50000,
      rouletteNumberPayout: 36,
      rouletteColorPayout: 2
    };

    if (!casinoConfig.rouletteEnabled) {
      throw new Error('A Roleta Europeia está temporariamente desativada neste servidor pela administração.');
    }

    const choiceRaw = String(choiceInput || '').toLowerCase().trim();
    if (!choiceRaw) {
      throw new Error('Informe sua aposta na roleta: "vermelho", "preto", "par", "impar", ou um número de 0 a 36.');
    }

    const redNumbers = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];
    const blackNumbers = [2, 4, 6, 8, 10, 11, 13, 15, 17, 20, 22, 24, 26, 28, 29, 31, 33, 35];

    let betType = null;
    let targetNum = null;

    if (['red', 'vermelho', 'verm', 'v'].includes(choiceRaw)) {
      betType = 'COLOR_RED';
    } else if (['black', 'preto', 'p'].includes(choiceRaw)) {
      betType = 'COLOR_BLACK';
    } else if (['even', 'par'].includes(choiceRaw)) {
      betType = 'EVEN';
    } else if (['odd', 'impar', 'ímpar'].includes(choiceRaw)) {
      betType = 'ODD';
    } else if (/^\d+$/.test(choiceRaw)) {
      const n = parseInt(choiceRaw, 10);
      if (n >= 0 && n <= 36) {
        betType = 'EXACT_NUMBER';
        targetNum = n;
      }
    }

    if (!betType) {
      throw new Error('Aposta inválida! Escolha entre: "vermelho", "preto", "par", "impar" ou um número de 0 a 36.');
    }

    const landedNumber = Math.floor(Math.random() * 37);
    let landedColor = '🟢';
    let landedColorName = 'Verde (Zero)';
    if (redNumbers.includes(landedNumber)) {
      landedColor = '🔴';
      landedColorName = 'Vermelho';
    } else if (blackNumbers.includes(landedNumber)) {
      landedColor = '⚫';
      landedColorName = 'Preto';
    }

    let isWin = false;
    let multiplier = 0;

    const colorPayout = Number(casinoConfig.rouletteColorPayout) || 2;
    const numPayout = Number(casinoConfig.rouletteNumberPayout) || 36;

    if (betType === 'COLOR_RED' && redNumbers.includes(landedNumber)) {
      isWin = true;
      multiplier = colorPayout;
    } else if (betType === 'COLOR_BLACK' && blackNumbers.includes(landedNumber)) {
      isWin = true;
      multiplier = colorPayout;
    } else if (betType === 'EVEN' && landedNumber > 0 && landedNumber % 2 === 0) {
      isWin = true;
      multiplier = colorPayout;
    } else if (betType === 'ODD' && landedNumber % 2 !== 0) {
      isWin = true;
      multiplier = colorPayout;
    } else if (betType === 'EXACT_NUMBER' && landedNumber === targetNum) {
      isWin = true;
      multiplier = numPayout;
    }

    if (currencyCode) {
      const currency = this.getExchangeCurrency(guildId, currencyCode);
      if (!currency) throw new Error(`Moeda "${currencyCode}" não encontrada.`);
      const currentHoldings = this.economyRepo.getUserCurrencyBalance(guildId, userId, currency.id);
      const betUnits = (typeof betAmountInput === 'string' && ['all', 'tudo', 'max'].includes(betAmountInput.toLowerCase()))
        ? currentHoldings
        : parseInt(betAmountInput, 10);
      if (isNaN(betUnits) || betUnits <= 0) {
        throw new Error(`Informe uma quantidade válida de ${currency.symbol} ${currency.name} para apostar.`);
      }

      return this.economyRepo.db.transaction(() => {
        const netMult = isWin ? Math.max(0.5, multiplier - 1) : -1;
        const settled = this._settleExchangeCurrencyBet(
          guildId,
          userId,
          currency,
          betUnits,
          netMult,
          'ROULETTE_WIN',
          'ROULETTE_LOSS',
          `Roleta: apostou em ${choiceRaw}, caiu ${landedNumber} ${landedColor}`
        );

        const message = isWin
          ? `🎡 **A roleta parou no número ${landedNumber} ${landedColor} (${landedColorName})!**\n🎉 Parabéns! Você acertou sua aposta e lucrou **${settled.formattedGain}** (${multiplier}x)!`
          : `🎡 **A roleta parou no número ${landedNumber} ${landedColor} (${landedColorName})!**\n💸 A banca venceu desta vez. Você perdeu **${settled.formattedBet}**.`;

        return {
          success: isWin,
          isExchangeCurrency: true,
          currency,
          landedNumber,
          landedColor,
          landedColorName,
          bet: betUnits,
          multiplier,
          currencyBalance: settled.newHoldings,
          walletBalance: settled.walletBalance,
          message
        };
      });
    }

    const bet = parseInt(betAmountInput, 10);
    if (isNaN(bet) || bet <= 0) {
      throw new Error('O valor da aposta deve ser um número positivo.');
    }

    if (bet < casinoConfig.rouletteMin || bet > casinoConfig.rouletteMax) {
      throw new Error(`A aposta na Roleta deve ser entre ${casinoConfig.rouletteMin.toLocaleString('pt-BR')} e ${casinoConfig.rouletteMax.toLocaleString('pt-BR')} moedas.`);
    }

    return this.economyRepo.db.transaction(() => {
      const config = this.economyRepo.getGuildConfig(guildId);
      let account = this.economyRepo.getOrCreateAccount(guildId, userId, config.bankStartingCapacity);

      if (account.walletBalance < 0) {
        throw new Error(`❌ Você está endividado (${this.formatCurrency(account.walletBalance, config)})! O cassino não aceita apostas de membros com dívidas ativas.`);
      }

      let convertedNotice = '';
      if (account.walletBalance < bet) {
        const liq = this.ensureWalletLiquidity(guildId, userId, bet);
        account = liq.account;
        convertedNotice = liq.convertedNotice || '';
      }

      if (account.walletBalance < bet) {
        throw new Error(`Saldo insuficiente na carteira. Você possui ${this.formatCurrency(account.walletBalance, config)}.`);
      }

      const netGain = isWin ? bet * (multiplier - 1) : -bet;
      const newWallet = account.walletBalance + netGain;
      const updated = this.economyRepo.updateBalances(guildId, userId, { walletBalance: newWallet });

      this.economyRepo.recordTransaction({
        guildId,
        userId,
        type: isWin ? 'ROULETTE_WIN' : 'ROULETTE_LOSS',
        amount: netGain,
        walletAfter: updated.walletBalance,
        bankAfter: updated.bankBalance,
        description: `Roleta: apostou em ${choiceRaw}, caiu ${landedNumber} ${landedColor}`
      });

      const formattedBet = this.formatCurrency(bet, config);
      const formattedGain = this.formatCurrency(Math.abs(netGain), config);

      const message = isWin
        ? `🎡 **A roleta parou no número ${landedNumber} ${landedColor} (${landedColorName})!**\n🎉 Parabéns! Você acertou sua aposta e lucrou **${formattedGain}** (${multiplier}x)!${convertedNotice}`
        : `🎡 **A roleta parou no número ${landedNumber} ${landedColor} (${landedColorName})!**\n💸 A banca venceu desta vez. Você perdeu **${formattedBet}**.${convertedNotice}`;

      return {
        success: isWin,
        landedNumber,
        landedColor,
        landedColorName,
        bet,
        netGain,
        multiplier,
        walletBalance: updated.walletBalance,
        message
      };
    });
  }

  // ==========================================
  // 4. Shop & Inventory
  // ==========================================

  getShop(guildId) {
    const config = this.economyRepo.getGuildConfig(guildId);
    const items = this.economyRepo.getShopItems(guildId);
    return items.map(item => ({
      ...item,
      formattedPrice: this.formatCurrency(item.price, config)
    }));
  }

  createShopItem(guildId, { name, description, price, stock = -1, roleId = null }) {
    const numPrice = parseInt(price, 10);
    if (isNaN(numPrice) || numPrice <= 0) {
      throw new Error('O preço do item deve ser um número positivo.');
    }

    const numStock = parseInt(stock, 10);

    return this.economyRepo.createShopItem(guildId, {
      name: name.trim(),
      description: description ? description.trim() : null,
      price: numPrice,
      stock: isNaN(numStock) ? -1 : numStock,
      roleId: roleId || null
    });
  }

  deleteShopItem(guildId, itemId) {
    return this.economyRepo.deleteShopItem(guildId, itemId);
  }

  async buyShopItem(guildId, userId, itemIdOrName, quantityInput = 1, guildMember = null) {
    if (this.loanService) {
      const canShop = this.loanService.canBuyShop
        ? this.loanService.canBuyShop(guildId, userId)
        : !this.loanService.isDefaulted(guildId, userId);
      if (!canShop) {
        throw new Error('⚠️ **Nome Sujo (Serasa Stark):** Você possui um empréstimo em atraso! Quite sua dívida com `+emprestimo pagar` antes de realizar compras na loja.');
      }
    }

    const quantity = parseInt(quantityInput, 10);
    if (isNaN(quantity) || quantity <= 0) {
      throw new Error('A quantidade deve ser um número positivo.');
    }

    const item = this.economyRepo.getShopItem(guildId, itemIdOrName);
    if (!item) {
      throw new Error(`Item "${itemIdOrName}" não encontrado na loja.`);
    }

    if (item.stock !== -1 && item.stock < quantity) {
      throw new Error(`Estoque insuficiente. Restam apenas ${item.stock} unidades deste item.`);
    }

    const totalCost = item.price * quantity;

    const result = this.economyRepo.db.transaction(() => {
      const config = this.economyRepo.getGuildConfig(guildId);
      let account = this.economyRepo.getOrCreateAccount(guildId, userId);

      let convertedNotice = '';
      if (account.walletBalance < totalCost) {
        const liq = this.ensureWalletLiquidity(guildId, userId, totalCost);
        account = liq.account;
        convertedNotice = liq.convertedNotice || '';
      }

      if (account.walletBalance < totalCost) {
        throw new Error(`Saldo insuficiente na carteira. O custo total é ${this.formatCurrency(totalCost, config)} e você possui ${this.formatCurrency(account.walletBalance, config)}.`);
      }

      const updated = this.economyRepo.updateBalances(guildId, userId, {
        walletBalance: account.walletBalance - totalCost
      });

      if (item.stock !== -1) {
        this.economyRepo.updateShopItemStock(guildId, item.id, item.stock - quantity);
      }

      this.economyRepo.addInventoryItem(guildId, userId, item.id, quantity);

      this.economyRepo.recordTransaction({
        guildId,
        userId,
        type: 'SHOP_BUY',
        amount: -totalCost,
        walletAfter: updated.walletBalance,
        bankAfter: updated.bankBalance,
        description: `Compra de ${quantity}x "${item.name}" na loja`
      });

      return {
        item,
        quantity,
        totalCost,
        walletBalance: updated.walletBalance,
        formattedCost: this.formatCurrency(totalCost, config),
        convertedNotice
      };
    });

    // If item awards a Discord role and member is provided, grant role
    let roleAssigned = false;
    if (item.roleId && guildMember && guildMember.roles?.add) {
      try {
        await guildMember.roles.add(item.roleId);
        roleAssigned = true;
      } catch (err) {
        ecoLogger.warn(`Failed to assign role ${item.roleId} to member ${userId} after shop purchase`, { error: err.message });
      }
    }

    return {
      ...result,
      roleAssigned
    };
  }

  sellInventoryItem(guildId, userId, itemIdOrName, quantityInput = 1) {
    const quantity = parseInt(quantityInput, 10);
    if (isNaN(quantity) || quantity <= 0) {
      throw new Error('A quantidade deve ser um número positivo.');
    }

    const item = this.economyRepo.getShopItem(guildId, itemIdOrName);
    if (!item) {
      throw new Error(`Item não encontrado no catálogo.`);
    }

    return this.economyRepo.db.transaction(() => {
      const config = this.economyRepo.getGuildConfig(guildId);
      const userItem = this.economyRepo.getUserInventoryItem(guildId, userId, item.id);

      if (!userItem || userItem.quantity < quantity) {
        throw new Error(`Você não possui quantidade suficiente deste item para vender.`);
      }

      // Sell price is 50% of original price
      const unitSellPrice = Math.max(1, Math.floor(item.price * 0.5));
      const totalRefund = unitSellPrice * quantity;

      this.economyRepo.removeInventoryItem(guildId, userId, item.id, quantity);

      const account = this.economyRepo.getOrCreateAccount(guildId, userId);
      const updated = this.economyRepo.updateBalances(guildId, userId, {
        walletBalance: account.walletBalance + totalRefund
      });

      this.economyRepo.recordTransaction({
        guildId,
        userId,
        type: 'SHOP_SELL',
        amount: totalRefund,
        walletAfter: updated.walletBalance,
        bankAfter: updated.bankBalance,
        description: `Venda de ${quantity}x "${item.name}" para a loja`
      });

      return {
        item,
        quantity,
        totalRefund,
        walletBalance: updated.walletBalance,
        formattedRefund: this.formatCurrency(totalRefund, config)
      };
    });
  }

  getUserInventory(guildId, userId) {
    const config = this.economyRepo.getGuildConfig(guildId);
    const items = this.economyRepo.getUserInventory(guildId, userId);

    return items.map(inv => ({
      ...inv,
      formattedPrice: this.formatCurrency(inv.price, config)
    }));
  }

  // ==========================================
  // 5. Admin Controls & Configuration
  // ==========================================

  adminAdjust(guildId, userId, targetField, action, amountInput, executorId = null, reason = 'Ajuste administrativo') {
    const field = targetField.toLowerCase().trim();
    if (field !== 'wallet' && field !== 'bank') {
      throw new Error('Campo inválido. Use "wallet" (carteira) ou "bank" (banco).');
    }

    const act = action.toLowerCase().trim();
    if (!['add', 'remove', 'set'].includes(act)) {
      throw new Error('Ação inválida. Use "add", "remove" ou "set".');
    }

    const amount = parseInt(amountInput, 10);
    if (isNaN(amount) || amount < 0) {
      throw new Error('A quantia deve ser um número inteiro maior ou igual a zero.');
    }

    return this.economyRepo.db.transaction(() => {
      const config = this.economyRepo.getGuildConfig(guildId);
      const account = this.economyRepo.getOrCreateAccount(guildId, userId, config.bankStartingCapacity);

      let newWallet = account.walletBalance;
      let newBank = account.bankBalance;
      let txType = `ADMIN_${act.toUpperCase()}`;

      if (field === 'wallet') {
        if (act === 'add') newWallet += amount;
        else if (act === 'remove') newWallet = Math.max(0, newWallet - amount);
        else if (act === 'set') newWallet = amount;
      } else {
        if (act === 'add') newBank += amount;
        else if (act === 'remove') newBank = Math.max(0, newBank - amount);
        else if (act === 'set') newBank = amount;
      }

      const updated = this.economyRepo.updateBalances(guildId, userId, {
        walletBalance: newWallet,
        bankBalance: newBank
      });

      this.economyRepo.recordTransaction({
        guildId,
        userId,
        type: txType,
        amount: act === 'remove' ? -amount : amount,
        targetId: executorId,
        walletAfter: updated.walletBalance,
        bankAfter: updated.bankBalance,
        description: `${reason} (por ${executorId || 'Sistema'})`
      });

      if (this.auditService && executorId) {
        this.auditService.logAction({
          guildId,
          userId: executorId,
          action: `ECONOMY_ADMIN_${act.toUpperCase()}`,
          targetId: userId,
          details: { field, amount, reason, newWallet, newBank }
        });
      }

      return {
        userId,
        field,
        action: act,
        amount,
        walletBalance: updated.walletBalance,
        bankBalance: updated.bankBalance,
        formattedWallet: this.formatCurrency(updated.walletBalance, config),
        formattedBank: this.formatCurrency(updated.bankBalance, config)
      };
    });
  }

  adminReset(guildId, targetUserId = null, executorId = null) {
    if (targetUserId) {
      this.economyRepo.resetMemberEconomy(guildId, targetUserId);
      if (this.auditService && executorId) {
        this.auditService.logAction({
          guildId,
          userId: executorId,
          action: 'ECONOMY_RESET_MEMBER',
          targetId: targetUserId,
          details: { guildId }
        });
      }
      return { type: 'member', targetUserId };
    } else {
      this.economyRepo.resetGuildEconomy(guildId);
      if (this.auditService && executorId) {
        this.auditService.logAction({
          guildId,
          userId: executorId,
          action: 'ECONOMY_RESET_GUILD',
          details: { guildId }
        });
      }
      return { type: 'guild' };
    }
  }

  updateConfig(guildId, updates, executorId = null) {
    const updated = this.economyRepo.upsertGuildConfig(guildId, updates);
    if (this.auditService && executorId) {
      this.auditService.logAction({
        guildId,
        userId: executorId,
        action: 'ECONOMY_CONFIG_UPDATE',
        details: updates
      });
    }
    return updated;
  }

  getLeaderboard(guildId, limit = 10, offset = 0) {
    const config = this.economyRepo.getGuildConfig(guildId);
    const leaders = this.economyRepo.getLeaderboard(guildId, limit, offset);

    return leaders.map(l => ({
      ...l,
      formattedTotal: this.formatCurrency(l.totalBalance, config),
      formattedCompactTotal: this.formatCompactCurrency(l.totalBalance, config),
      formattedWallet: this.formatCurrency(l.walletBalance, config),
      formattedCompactWallet: this.formatCompactCurrency(l.walletBalance, config),
      formattedBank: this.formatCurrency(l.bankBalance, config),
      formattedCompactBank: this.formatCompactCurrency(l.bankBalance, config)
    }));
  }

  /**
   * Adds coins directly to a member's wallet balance.
   * @param {string} guildId
   * @param {string} userId
   * @param {number} amount
   * @param {string} [txType]
   * @param {string} [description]
   */
  addWalletBalance(guildId, userId, amount, txType = 'REWARD_ADD', description = 'Recompensa adicionada') {
    const amt = Math.max(0, parseInt(amount, 10) || 0);
    if (amt <= 0) return null;

    return this.economyRepo.db.transaction(() => {
      const account = this.economyRepo.getOrCreateAccount(guildId, userId);
      const updated = this.economyRepo.updateBalances(guildId, userId, {
        walletBalance: account.walletBalance + amt
      });

      this.economyRepo.recordTransaction({
        guildId,
        userId,
        type: txType,
        amount: amt,
        walletAfter: updated.walletBalance,
        bankAfter: updated.bankBalance,
        description
      });

      return updated;
    });
  }

  /**
   * Deducts coins from a member's wallet balance.
   * @param {string} guildId
   * @param {string} userId
   * @param {number} amount
   * @param {string} [txType]
   * @param {string} [description]
   */
  removeWalletBalance(guildId, userId, amount, txType = 'PAYMENT_DEDUCT', description = 'Pagamento deduzido') {
    const amt = Math.max(0, parseInt(amount, 10) || 0);
    if (amt <= 0) return null;

    return this.economyRepo.db.transaction(() => {
      let account = this.economyRepo.getOrCreateAccount(guildId, userId);
      if (account.walletBalance < amt) {
        const liq = this.ensureWalletLiquidity(guildId, userId, amt);
        account = liq.account;
      }
      if (account.walletBalance < amt) {
        throw new Error(`Saldo insuficiente na carteira para pagar ${amt} moedas. Você possui apenas ${account.walletBalance} moedas.`);
      }

      const updated = this.economyRepo.updateBalances(guildId, userId, {
        walletBalance: account.walletBalance - amt
      });

      this.economyRepo.recordTransaction({
        guildId,
        userId,
        type: txType,
        amount: -amt,
        walletAfter: updated.walletBalance,
        bankAfter: updated.bankBalance,
        description
      });

      return updated;
    });
  }

  // ==========================================
  // 12. Exchange Currencies (Câmbio / Moedas de Prestígio)
  // ==========================================

  listExchangeCurrencies(guildId, onlyActive = true) {
    return this.economyRepo.listExchangeCurrencies(guildId, onlyActive);
  }

  getExchangeCurrency(guildId, codeOrId) {
    if (!codeOrId) return null;
    if (typeof codeOrId === 'number' || (!isNaN(Number(codeOrId)) && !String(codeOrId).includes(' '))) {
      const byId = this.economyRepo.getExchangeCurrencyById(guildId, Number(codeOrId));
      if (byId) return byId;
    }
    return this.economyRepo.getExchangeCurrencyByCode(guildId, String(codeOrId));
  }

  createExchangeCurrency(guildId, data) {
    return this.economyRepo.createExchangeCurrency(guildId, data);
  }

  updateExchangeCurrency(guildId, id, updates) {
    return this.economyRepo.updateExchangeCurrency(guildId, id, updates);
  }

  deleteExchangeCurrency(guildId, id) {
    return this.economyRepo.deleteExchangeCurrency(guildId, id);
  }

  getUserCurrencies(guildId, userId) {
    return this.economyRepo.getUserExchangeCurrencies(guildId, userId);
  }

  buyExchangeCurrency(guildId, userId, codeOrId, quantityInput) {
    const currency = this.getExchangeCurrency(guildId, codeOrId);

    if (!currency) {
      throw new Error(`Moeda de câmbio "${codeOrId}" não encontrada.`);
    }
    if (!currency.isActive) {
      throw new Error(`A moeda "${currency.name}" (${currency.symbol}) está temporariamente desativada para novas conversões.`);
    }

    return this.economyRepo.db.transaction(() => {
      let account = this.economyRepo.getOrCreateAccount(guildId, userId);
      const config = this.economyRepo.getGuildConfig(guildId);

      let qty;
      const isAll = typeof quantityInput === 'string' && ['all', 'tudo', 'max'].includes(quantityInput.toLowerCase());
      if (isAll) {
        qty = Math.floor(Math.max(0, account.walletBalance) / currency.rate);
        if (qty <= 0) {
          throw new Error(`Você precisa de pelo menos ${this.formatCurrency(currency.rate, config)} na carteira para adquirir 1x ${currency.symbol} ${currency.name}.`);
        }
      } else {
        qty = Math.max(1, parseInt(quantityInput, 10) || 1);
      }

      const totalCost = qty * currency.rate;

      if (account.walletBalance < totalCost) {
        const needed = this.formatCurrency(totalCost, config);
        const current = this.formatCurrency(account.walletBalance, config);
        throw new Error(`Saldo insuficiente na carteira para comprar ${qty}x ${currency.symbol} ${currency.name}. Custo: ${needed} (você possui ${current}).`);
      }

      const updated = this.economyRepo.updateBalances(guildId, userId, {
        walletBalance: account.walletBalance - totalCost
      });

      const newCurrencyBalance = this.economyRepo.addUserCurrencyBalance(guildId, userId, currency.id, qty);

      this.economyRepo.recordTransaction({
        guildId,
        userId,
        type: 'EXCHANGE_BUY',
        amount: -totalCost,
        walletAfter: updated.walletBalance,
        bankAfter: updated.bankBalance,
        description: `Câmbio: Compra de ${qty}x ${currency.symbol} ${currency.name} (cotação: ${currency.rate})`
      });

      let updatedCurrency = currency;
      if (currency.isDynamic) {
        const impactPct = Math.min(currency.volatility || 0.05, 0.008 * Math.min(10, qty));
        const nextRate = Math.min(
          currency.maxRate,
          Math.max(currency.minRate, Math.round(currency.rate * (1 + impactPct)))
        );
        if (nextRate !== currency.rate) {
          updatedCurrency = this.economyRepo.updateExchangeCurrency(guildId, currency.id, {
            rate: nextRate,
            previousRate: currency.rate,
            reason: `Alta por demanda de compra (+${qty}x)`
          });
        }
      }

      return {
        currency: updatedCurrency,
        quantity: qty,
        totalCost,
        remainingWallet: updated.walletBalance,
        newCurrencyBalance
      };
    });
  }

  sellExchangeCurrency(guildId, userId, codeOrId, quantityInput) {
    const currency = this.getExchangeCurrency(guildId, codeOrId);
    if (!currency) {
      throw new Error(`Moeda de câmbio "${codeOrId}" não encontrada.`);
    }

    const currentBalance = this.economyRepo.getUserCurrencyBalance(guildId, userId, currency.id);
    let qty;
    if (typeof quantityInput === 'string' && (quantityInput.toLowerCase() === 'all' || quantityInput.toLowerCase() === 'tudo' || quantityInput.toLowerCase() === 'max')) {
      qty = currentBalance;
    } else {
      qty = Math.max(1, parseInt(quantityInput, 10) || 1);
    }

    if (currentBalance < qty || qty <= 0) {
      throw new Error(`Você não possui ${qty}x ${currency.symbol} ${currency.name} para vender. Seu saldo atual é: ${currentBalance}.`);
    }

    const totalGained = qty * currency.rate;

    return this.economyRepo.db.transaction(() => {
      const account = this.economyRepo.getOrCreateAccount(guildId, userId);
      const updated = this.economyRepo.updateBalances(guildId, userId, {
        walletBalance: account.walletBalance + totalGained
      });

      const remainingCurrencyBalance = this.economyRepo.addUserCurrencyBalance(guildId, userId, currency.id, -qty);

      this.economyRepo.recordTransaction({
        guildId,
        userId,
        type: 'EXCHANGE_SELL',
        amount: totalGained,
        walletAfter: updated.walletBalance,
        bankAfter: updated.bankBalance,
        description: `Câmbio: Venda de ${qty}x ${currency.symbol} ${currency.name} (recebido: ${totalGained})`
      });

      let updatedCurrency = currency;
      if (currency.isDynamic) {
        const impactPct = Math.min(currency.volatility || 0.05, 0.008 * Math.min(10, qty));
        const nextRate = Math.min(
          currency.maxRate,
          Math.max(currency.minRate, Math.round(currency.rate * (1 - impactPct)))
        );
        if (nextRate !== currency.rate) {
          updatedCurrency = this.economyRepo.updateExchangeCurrency(guildId, currency.id, {
            rate: nextRate,
            previousRate: currency.rate,
            reason: `Correção por oferta de venda (-${qty}x)`
          });
        }
      }

      return {
        currency: updatedCurrency,
        quantity: qty,
        totalGained,
        newWallet: updated.walletBalance,
        remainingCurrencyBalance
      };
    });
  }

  getCurrencyChartData(guildId, codeOrId = null) {
    let currency = null;
    if (codeOrId) {
      currency = this.getExchangeCurrency(guildId, codeOrId);
    } else {
      const all = this.listExchangeCurrencies(guildId, false);
      currency = all[0] || null;
    }
    if (!currency) {
      throw new Error('Moeda de câmbio não encontrada neste servidor.');
    }
    const history = this.economyRepo.getCurrencyRateHistory
      ? this.economyRepo.getCurrencyRateHistory(guildId, currency.id, 24)
      : [];
    return { currency, history };
  }

  simulateMarketCycle(guildId, codeOrId = null, customDeltaPct = null, customReason = null) {
    const currencies = codeOrId
      ? [this.getExchangeCurrency(guildId, codeOrId)].filter(Boolean)
      : this.listExchangeCurrencies(guildId, true).filter(c => c.isDynamic || customDeltaPct !== null);

    if (currencies.length === 0) {
      throw new Error('Nenhuma moeda dinâmica encontrada para oscilar no mercado.');
    }

    const results = [];
    for (const c of currencies) {
      const vol = Number(c.volatility) || 0.05;
      const pctDelta = customDeltaPct !== null && customDeltaPct !== undefined && !isNaN(Number(customDeltaPct))
        ? Number(customDeltaPct) / 100
        : (Math.random() * 2 - 0.96) * vol;

      const rawNext = Math.round(c.rate * (1 + pctDelta));
      const clampedNext = Math.max(c.minRate, Math.min(c.maxRate, rawNext === c.rate ? c.rate + (pctDelta >= 0 ? 1 : -1) : rawNext));
      const updated = this.economyRepo.updateExchangeCurrency(guildId, c.id, {
        rate: clampedNext,
        previousRate: c.rate,
        reason: customReason || (clampedNext >= c.rate ? 'Oscilação positiva da Bolsa Stark' : 'Correção de mercado da Bolsa Stark')
      });
      results.push(updated);
    }
    return results;
  }

  // ==========================================
  // 14. Company Bankruptcy, Bot Auto-Buyout & Takeover
  // ==========================================

  assertNotFoundingBanned(guildId, userId) {
    const ban = this.economyRepo.getFoundingBan(guildId, userId);
    if (ban) {
      const unix = Math.floor(new Date(ban.bannedUntil).getTime() / 1000);
      throw new Error(`🚫 Você faliu recentemente e está impedido de fundar ou assumir empresas até <t:${unix}:f> (<t:${unix}:R>).`);
    }
  }

  /** Book value ("valor contábil"): share of the founding price + share of what was invested in upgrades. */
  getCompanyBookValue(company) {
    let upgrades = 0;
    for (let l = 1; l < company.level; l++) {
      upgrades += Math.round(company.upgradeCostBase * Math.pow(1.65, l - 1));
    }
    const value = company.typePrice * companyRules.BOOK_VALUE_PRICE_RATE + upgrades * companyRules.BOOK_VALUE_UPGRADE_RATE;
    return Math.max(1000, Math.round(value));
  }

  /** Supplier debt: grows every hour the company stays out of stock (suppliers deliver on credit). */
  calculateCompanyDebt(company, nowMs = Date.now()) {
    if (!company.distressSince) return 0;
    const since = new Date(company.distressSince).getTime();
    if (!since) return 0;
    const hours = Math.min(companyRules.MAX_DEBT_HOURS, Math.max(0, (nowMs - since) / 3600000));
    return Math.round(hours * company.supplyHourlyCost);
  }

  /** Price the bot asks for a bankrupt company: appreciates every day it waits, up to its book value. */
  getAskingPrice(company, nowMs = Date.now()) {
    const listedMs = new Date(company.bankruptAt).getTime() || nowMs;
    const days = Math.max(0, (nowMs - listedMs) / 86400000);
    const price = Math.round(company.listStartPrice * (1 + companyRules.AUCTION_APPRECIATION_PER_DAY * days));
    return Math.min(company.listCapPrice, price);
  }

  _computeBankruptcySettlement(company, nowMs = Date.now()) {
    const bookValue = this.getCompanyBookValue(company);
    const debt = this.calculateCompanyDebt(company, nowMs);
    const claimable = Math.max(0, company.claimableTotal || 0);
    const grossShare = Math.round(bookValue * companyRules.OWNER_PAYOUT_RATE);
    const ownerPayout = Math.max(0, claimable + grossShare - debt);
    const startPrice = Math.round(bookValue * companyRules.AUCTION_START_RATE);
    return {
      bookValue,
      debt,
      claimable,
      grossShare,
      ownerPayout,
      startPrice,
      capPrice: Math.max(startPrice, bookValue)
    };
  }

  /** What would happen if the owner declared bankruptcy now (no side effects). */
  previewCompanyBankruptcy(guildId, userId, companyId = null) {
    const companies = this.economyRepo.getUserCompanies(guildId, userId);
    if (companies.length === 0) {
      throw new Error('Você não possui nenhuma empresa para declarar falência!');
    }
    let comp = null;
    if (companyId) {
      comp = companies.find(c => c.id === Number(String(companyId).replace('#', '')));
    } else if (companies.length === 1) {
      comp = companies[0];
    } else {
      throw new Error('Você tem mais de uma empresa! Informe o ID: `+empresa falir <id>` (veja os IDs em `+empresa`).');
    }
    if (!comp) throw new Error('Empresa não encontrada ou não pertence a você.');
    return { company: comp, ...this._computeBankruptcySettlement(comp) };
  }

  /**
   * Bankruptcy: the bot's NPC administrator buys the company from its owner, pays the owner a share of the
   * book value (minus supplier debts), fires the human staff, keeps it supplied and re-lists it for sale.
   * @param {'MANUAL'|'FORCED_NO_STOCK'} reason
   */
  declareCompanyBankruptcy(guildId, userId, companyId, reason = 'MANUAL') {
    const comp = this.economyRepo.getUserCompanyById(Number(String(companyId).replace('#', '')));
    if (!comp || comp.guildId !== guildId || comp.ownerId !== userId || comp.status !== 'ACTIVE') {
      throw new Error('Empresa não encontrada ou não pertence a você.');
    }

    return this.economyRepo.db.transaction(() => {
      const nowMs = Date.now();
      const nowIso = new Date(nowMs).toISOString();
      const settlement = this._computeBankruptcySettlement(comp, nowMs);

      const fired = this.economyRepo.removeCompanyEmployees(comp.id);

      let walletBalance = null;
      if (settlement.ownerPayout > 0) {
        const acc = this.economyRepo.getOrCreateAccount(guildId, userId);
        const updated = this.economyRepo.updateBalances(guildId, userId, {
          walletBalance: acc.walletBalance + settlement.ownerPayout
        });
        walletBalance = updated.walletBalance;
        this.economyRepo.recordTransaction({
          guildId,
          userId,
          type: 'COMPANY_BANKRUPTCY_PAYOUT',
          amount: settlement.ownerPayout,
          walletAfter: updated.walletBalance,
          bankAfter: updated.bankBalance,
          description: `Falência de ${comp.name}: venda ao administrador (${reason === 'MANUAL' ? 'declarada pelo dono' : 'estoque zerado'})`
        });
      }

      // The bot's administrator now holds the company and keeps it supplied until someone buys it
      const updatedCompany = this.economyRepo.updateUserCompany(comp.id, {
        ownerId: companyRules.ADMIN_OWNER_ID,
        status: 'FOR_SALE',
        formerOwnerId: userId,
        bankruptAt: nowIso,
        distressSince: null,
        distressNotified: 0,
        listStartPrice: settlement.startPrice,
        listCapPrice: settlement.capPrice,
        stockProducts: Math.ceil(comp.maxStock * companyRules.ADMIN_STOCK_RATE),
        vaultBalance: 0,
        autoRestock: 0,
        lastCollectedAt: nowIso
      });

      const banUntil = new Date(nowMs + companyRules.FOUNDING_BAN_HOURS * 3600000).toISOString();
      this.economyRepo.setFoundingBan(guildId, userId, banUntil, `Falência de ${comp.name}`);

      this.economyRepo.recordBankruptcy({
        guildId,
        companyId: comp.id,
        companyName: comp.name,
        formerOwnerId: userId,
        reason,
        bookValue: settlement.bookValue,
        debt: settlement.debt,
        ownerPayout: settlement.ownerPayout
      });

      return {
        company: updatedCompany,
        originalCompany: comp,
        reason,
        ...settlement,
        walletBalance,
        banUntil,
        firedUserIds: fired.map(e => e.userId)
      };
    });
  }

  listCompaniesForSale(guildId) {
    const now = Date.now();
    return this.economyRepo.listCompaniesForSale(guildId).map(c => ({
      ...c,
      bookValue: this.getCompanyBookValue(c),
      askingPrice: this.getAskingPrice(c, now),
      daysListed: Math.max(0, (now - (new Date(c.bankruptAt).getTime() || now)) / 86400000)
    }));
  }

  /** A player buys a bankrupt company from the bot's administrator at the current (appreciated) price. */
  takeoverCompany(guildId, userId, companyIdInput) {
    const id = Number(String(companyIdInput || '').replace('#', ''));
    if (!id) {
      throw new Error('Informe o ID da empresa à venda. Veja a lista com `+empresa leilao`!');
    }
    this.assertNotFoundingBanned(guildId, userId);

    const comp = this.economyRepo.getUserCompanyById(id);
    if (!comp || comp.guildId !== guildId || comp.status !== 'FOR_SALE') {
      throw new Error('Essa empresa não está à venda (ou já foi comprada por outra pessoa). Veja `+empresa leilao`.');
    }

    const existing = this.economyRepo.getUserCompanies(guildId, userId);
    const askingPrice = this.getAskingPrice(comp);
    const scaledPrice = Math.round(askingPrice * Math.pow(1.6, existing.length));

    return this.economyRepo.db.transaction(() => {
      const config = this.economyRepo.getGuildConfig(guildId);
      let acc = this.economyRepo.getOrCreateAccount(guildId, userId);
      let convertedNotice = '';
      if (acc.walletBalance < scaledPrice) {
        const liq = this.ensureWalletLiquidity(guildId, userId, scaledPrice);
        acc = liq.account;
        convertedNotice = liq.convertedNotice || '';
      }
      if (acc.walletBalance < scaledPrice) {
        throw new Error(`Saldo insuficiente! **${comp.emoji} ${comp.name}** está à venda por **${this.formatCompactCurrency(scaledPrice, config)}**${existing.length > 0 ? ` *(preço escalado para sua ${existing.length + 1}ª empresa)*` : ''} e você possui **${this.formatCompactCurrency(acc.walletBalance, config)}**.`);
      }

      const updatedAcc = this.economyRepo.updateBalances(guildId, userId, {
        walletBalance: acc.walletBalance - scaledPrice
      });
      this.economyRepo.recordTransaction({
        guildId,
        userId,
        type: 'COMPANY_TAKEOVER',
        amount: -scaledPrice,
        walletAfter: updatedAcc.walletBalance,
        bankAfter: updatedAcc.bankBalance,
        description: `Aquisição de empresa falida: ${comp.name} (${existing.length + 1}ª empresa)`
      });

      const nowIso = new Date().toISOString();
      const company = this.economyRepo.updateUserCompany(comp.id, {
        ownerId: userId,
        status: 'ACTIVE',
        formerOwnerId: null,
        bankruptAt: null,
        listStartPrice: 0,
        listCapPrice: 0,
        distressSince: null,
        distressNotified: 0,
        vaultBalance: 0,
        totalEarned: 0,
        autoRestock: 0,
        lastCollectedAt: nowIso
      });

      return {
        company,
        askingPrice,
        scaledPrice,
        convertedNotice,
        companyNumber: existing.length + 1,
        previousOwnerId: comp.formerOwnerId
      };
    });
  }

  /** The Supply Manager (if hired) buys the company's own supplies from its earnings before stock runs out. */
  _applyManagerAutoRestock(comp, nowIso) {
    if (!comp.autoRestock || comp.remainingStock >= Math.floor(comp.maxStock * 0.25)) return comp;
    const claimable = comp.claimableTotal;
    const needed = comp.maxStock - comp.remainingStock;
    const affordable = Math.min(needed, Math.floor(claimable / Math.max(1, comp.supplyUnitCost)));
    if (affordable <= 0) return comp;
    return this.economyRepo.updateUserCompany(comp.id, {
      stockProducts: comp.remainingStock + affordable,
      vaultBalance: claimable - affordable * comp.supplyUnitCost,
      lastCollectedAt: nowIso
    });
  }

  /**
   * Periodic check of every company: detects empty stock, starts the grace period, escalates warnings and
   * forces bankruptcy when the deadline passes. Returns the DMs that must be delivered.
   * @returns {Array<{ userId: string, guildId: string, type: string, text: string }>}
   */
  runCompanyHealthCheck(nowMs = Date.now()) {
    const notifications = [];
    const nowIso = new Date(nowMs).toISOString();
    const graceMs = companyRules.BANKRUPTCY_GRACE_HOURS * 3600000;

    let companies = [];
    try {
      companies = this.economyRepo.getAllActiveCompanies();
    } catch (err) {
      ecoLogger.warn(`Company health check could not list companies: ${err.message}`);
      return notifications;
    }

    for (let comp of companies) {
      try {
        comp = this._applyManagerAutoRestock(comp, nowIso);

        if (comp.remainingStock > 0) {
          if (comp.distressSince || comp.distressNotified) {
            this.economyRepo.updateUserCompany(comp.id, { distressSince: null, distressNotified: 0 });
          }
          continue;
        }

        // Out of stock -> distress timer
        if (!comp.distressSince) {
          this.economyRepo.updateUserCompany(comp.id, { distressSince: nowIso, distressNotified: 1 });
          const deadlineUnix = Math.floor((nowMs + graceMs) / 1000);
          notifications.push({
            userId: comp.ownerId,
            guildId: comp.guildId,
            type: 'DISTRESS_WARNING',
            text:
              `⚠️ **Alerta de Falência — ${comp.emoji} ${comp.name}** (ID #${comp.id})\n` +
              `Sua empresa está **sem estoque de ${comp.supplyEmoji} ${comp.supplyName}** e a renda caiu para 10%. Os fornecedores estão entregando a crédito e a dívida cresce a cada hora.\n\n` +
              `• **Prazo para reabastecer:** <t:${deadlineUnix}:f> (<t:${deadlineUnix}:R>)\n` +
              `• Reabasteça com \`+empresa estoque\` (ou contrate o gerente com \`+empresa gerente\`).\n` +
              `• Se o prazo vencer, o administrador do bot **compra a empresa**: você recebe só uma parte do valor (menos as dívidas) e fica **${companyRules.FOUNDING_BAN_HOURS / 24} dias sem fundar empresas**.\n` +
              `• Prefere encerrar agora? Use \`+empresa falir ${comp.id}\`.`
          });
          continue;
        }

        const elapsedMs = nowMs - new Date(comp.distressSince).getTime();
        const remainingMs = graceMs - elapsedMs;

        if (remainingMs <= 0) {
          const res = this.declareCompanyBankruptcy(comp.guildId, comp.ownerId, comp.id, 'FORCED_NO_STOCK');
          const unixBan = Math.floor(new Date(res.banUntil).getTime() / 1000);
          notifications.push({
            userId: comp.ownerId,
            guildId: comp.guildId,
            type: 'BANKRUPT',
            text:
              `🏦 **Sua empresa faliu — ${comp.emoji} ${comp.name}**\n` +
              `O prazo para reabastecer ${comp.supplyEmoji} ${comp.supplyName} venceu e o administrador do bot comprou a empresa.\n\n` +
              `• **Valor contábil:** ${formatCompactNumber(res.bookValue)} • **Sua parte (${Math.round(companyRules.OWNER_PAYOUT_RATE * 100)}%):** ${formatCompactNumber(res.grossShare)}\n` +
              `• **Lucros pendentes no cofre:** +${formatCompactNumber(res.claimable)}\n` +
              `• **Dívidas com fornecedores:** -${formatCompactNumber(res.debt)}\n` +
              `• **Você recebeu:** 💰 **${formatCompactNumber(res.ownerPayout)} moedas**\n` +
              `• Você não pode fundar nem assumir empresas até <t:${unixBan}:f> (<t:${unixBan}:R>).`
          });
          for (const fid of res.firedUserIds) {
            notifications.push({
              userId: fid,
              guildId: comp.guildId,
              type: 'EMPLOYEE_FIRED',
              text: `💼 A empresa **${comp.emoji} ${comp.name}**, onde você trabalhava, faliu. Você ficou desempregado e perdeu o bônus no \`+work\`. Procure outra empresa para trabalhar!`
            });
          }
          continue;
        }

        if (remainingMs <= companyRules.FINAL_WARNING_HOURS * 3600000 && comp.distressNotified < 2) {
          this.economyRepo.updateUserCompany(comp.id, { distressNotified: 2 });
          const deadlineUnix = Math.floor((new Date(comp.distressSince).getTime() + graceMs) / 1000);
          notifications.push({
            userId: comp.ownerId,
            guildId: comp.guildId,
            type: 'DISTRESS_FINAL',
            text:
              `🚨 **ÚLTIMO AVISO — ${comp.emoji} ${comp.name}** (ID #${comp.id})\n` +
              `Sua empresa vai **falir** <t:${deadlineUnix}:R> se continuar sem estoque de ${comp.supplyEmoji} ${comp.supplyName}!\n` +
              `• Dívida atual com fornecedores: **${formatCompactNumber(this.calculateCompanyDebt(comp, nowMs))} moedas**\n` +
              `• Reabasteça agora: \`+empresa estoque\``
          });
        }
      } catch (err) {
        ecoLogger.warn(`Company health check failed for company #${comp?.id}: ${err.message}`);
      }
    }

    return notifications;
  }

  startCompanyHealthWorker(client, intervalMinutes = companyRules.HEALTH_CHECK_INTERVAL_MINUTES) {
    if (this._companyHealthInterval) clearInterval(this._companyHealthInterval);
    if (this._companyHealthTimeout) clearTimeout(this._companyHealthTimeout);
    const intervalMs = Math.max(1, Number(intervalMinutes) || companyRules.HEALTH_CHECK_INTERVAL_MINUTES) * 60 * 1000;

    const run = async () => {
      let notifications = [];
      try {
        notifications = this.runCompanyHealthCheck();
      } catch (err) {
        ecoLogger.warn(`Company health worker error: ${err.message}`);
      }
      for (const n of notifications) {
        try {
          const user = await client.users.fetch(n.userId);
          await user.send(n.text);
        } catch {
          // DMs closed or user unavailable: the warning is still visible in +empresa
        }
      }
    };

    this._companyHealthTimeout = setTimeout(run, companyRules.HEALTH_CHECK_FIRST_RUN_DELAY_MS);
    this._companyHealthInterval = setInterval(run, intervalMs);
    return this._companyHealthInterval;
  }

  startStockMarketDailyCycle(client, intervalHours = 24) {
    if (this._stockMarketInterval) {
      clearInterval(this._stockMarketInterval);
    }
    const intervalMs = Math.max(1, Number(intervalHours) || 24) * 60 * 60 * 1000;

    const runDailyCycle = () => {
      try {
        if (!client?.guilds?.cache) return;
        for (const [guildId] of client.guilds.cache) {
          try {
            const dynamicCurrencies = this.listExchangeCurrencies(guildId, true).filter(c => c.isDynamic);
            if (dynamicCurrencies.length > 0) {
              this.simulateMarketCycle(guildId, null, null, 'Oscilação do Ciclo Diário Automático da Bolsa Stark');
            }
          } catch {}
        }
      } catch {}
    };

    this._stockMarketInterval = setInterval(runDailyCycle, intervalMs);
    this._stockMarketIntervalHours = intervalHours;
    return this._stockMarketInterval;
  }

  getStockMarketCycleStatus() {
    return {
      active: true,
      intervalHours: this._stockMarketIntervalHours || 24,
      description: `Roda automaticamente a cada ${this._stockMarketIntervalHours || 24} horas para todas as moedas dinâmicas da Bolsa.`
    };
  }

  // ==========================================
  // 13. Companies, Real Estate & Passive Income (+empresa)
  // ==========================================

  listCompanyCatalog(guildId, activeOnly = true) {
    return this.economyRepo.listCompanyTypes(guildId, activeOnly);
  }

  getUserCompaniesStatus(guildId, userId) {
    const companies = this.economyRepo.getUserCompanies(guildId, userId);
    const job = this.economyRepo.getEmployeeJob(guildId, userId);
    return { companies, job };
  }

  buyCompany(guildId, userId, typeIdOrName, customName = null, currencyCode = null) {
    const type = this.economyRepo.getCompanyTypeById(guildId, typeIdOrName);
    if (!type || !type.isActive) {
      throw new Error(`Tipo de empresa "${typeIdOrName}" não encontrado no catálogo. Use \`+empresa loja\` para ver as opções!`);
    }
    this.assertNotFoundingBanned(guildId, userId);

    // Anti-monopoly progressive scaling based on companies already owned
    const existingCompanies = this.economyRepo.getUserCompanies(guildId, userId);
    const scaleMultiplier = Math.pow(1.6, existingCompanies.length);
    const scaledPrice = Math.round(type.price * scaleMultiplier);

    return this.economyRepo.db.transaction(() => {
      const config = this.economyRepo.getGuildConfig(guildId);
      let convertedNotice = '';

      if (currencyCode) {
        const currency = this.getExchangeCurrency(guildId, currencyCode);
        if (!currency) throw new Error(`Moeda de câmbio "${currencyCode}" não encontrada.`);
        const neededUnits = Math.ceil(scaledPrice / currency.rate);
        const userUnits = this.economyRepo.getUserCurrencyBalance(guildId, userId, currency.id);
        if (userUnits < neededUnits) {
          throw new Error(`Saldo insuficiente! Você precisa de **${neededUnits}x ${currency.symbol} ${currency.name}** para comprar **${type.emoji} ${type.name}** (Você possui ${userUnits}x).`);
        }
        const totalValue = neededUnits * currency.rate;
        const change = Math.max(0, totalValue - scaledPrice);
        this.economyRepo.addUserCurrencyBalance(guildId, userId, currency.id, -neededUnits);
        const acc = this.economyRepo.getOrCreateAccount(guildId, userId);
        if (change > 0) {
          this.economyRepo.updateBalances(guildId, userId, { walletBalance: acc.walletBalance + change });
        }
        convertedNotice = `\n💱 *(Adquirida com **${neededUnits}x ${currency.symbol} ${currency.name}**${change > 0 ? ` • Troco: ${this.formatCompactCurrency(change, config)}` : ''})*`;
      } else {
        let acc = this.economyRepo.getOrCreateAccount(guildId, userId);
        if (acc.walletBalance < scaledPrice) {
          const liq = this.ensureWalletLiquidity(guildId, userId, scaledPrice);
          acc = liq.account;
          convertedNotice = liq.convertedNotice || '';
        }
        if (acc.walletBalance < scaledPrice) {
          throw new Error(`Saldo insuficiente na carteira! **${type.emoji} ${type.name}** custa **${this.formatCompactCurrency(scaledPrice, config)}**${existingCompanies.length > 0 ? ` *(preço escalado para sua ${existingCompanies.length + 1}ª empresa)*` : ''} e você possui **${this.formatCompactCurrency(acc.walletBalance, config)}**.`);
        }
        const updatedAcc = this.economyRepo.updateBalances(guildId, userId, {
          walletBalance: acc.walletBalance - scaledPrice
        });
        this.economyRepo.recordTransaction({
          guildId,
          userId,
          type: 'COMPANY_BUY',
          amount: -scaledPrice,
          walletAfter: updatedAcc.walletBalance,
          bankAfter: updatedAcc.bankBalance,
          description: `Fundação de empresa: ${type.name} (${existingCompanies.length + 1}ª empresa)`
        });
      }

      const company = this.economyRepo.createUserCompany(guildId, userId, type.id, customName);
      return { company, type, scaledPrice, convertedNotice, companyNumber: existingCompanies.length + 1 };
    });
  }

  collectCompanyProfits(guildId, userId, companyId = null) {
    const companies = this.economyRepo.getUserCompanies(guildId, userId);
    if (companies.length === 0) {
      throw new Error('Você ainda não possui nenhuma empresa! Use `+empresa loja` para ver o catálogo e `+empresa comprar <id>` para fundar a sua.');
    }

    const targets = companyId
      ? companies.filter(c => c.id === Number(companyId))
      : companies;

    if (targets.length === 0) {
      throw new Error('Empresa não encontrada ou não pertence a você.');
    }

    return this.economyRepo.db.transaction(() => {
      let totalCollected = 0;
      let totalRestockSpent = 0;
      let autoRestockedUnits = 0;
      const restockDetails = [];
      const nowIso = new Date().toISOString();

      for (const comp of targets) {
        let claimable = comp.claimableTotal;
        let newStock = comp.remainingStock;
        let companyRestockSpent = 0;

        // Auto-restock manager: buys THIS company's own supplies at THIS company's wholesale price
        if (comp.autoRestock && newStock < Math.floor(comp.maxStock * 0.25)) {
          const needed = comp.maxStock - newStock;
          const wholesaleCost = needed * comp.supplyUnitCost;
          if (claimable >= wholesaleCost) {
            claimable -= wholesaleCost;
            companyRestockSpent = wholesaleCost;
            totalRestockSpent += wholesaleCost;
            autoRestockedUnits += needed;
            newStock = comp.maxStock;
            restockDetails.push({
              companyName: comp.name,
              supplyName: comp.supplyName,
              supplyEmoji: comp.supplyEmoji,
              units: needed,
              cost: wholesaleCost
            });
          }
        }

        if (claimable > 0 || comp.consumedStock > 0 || newStock !== comp.stockProducts) {
          totalCollected += claimable;
          this.economyRepo.updateUserCompany(comp.id, {
            vaultBalance: 0,
            stockProducts: newStock,
            totalEarned: comp.totalEarned + claimable + companyRestockSpent,
            lastCollectedAt: nowIso,
            ...(newStock > 0 ? { distressSince: null, distressNotified: 0 } : {})
          });
        }
      }

      if (totalCollected <= 0 && autoRestockedUnits <= 0) {
        throw new Error('O cofre da sua empresa ainda está acumulando lucros ou precisa de reposição de estoque! Use `+empresa estoque` ou aguarde mais alguns minutos.');
      }

      let walletBalance = 0;
      if (totalCollected > 0) {
        const acc = this.economyRepo.getOrCreateAccount(guildId, userId);
        const updated = this.economyRepo.updateBalances(guildId, userId, {
          walletBalance: acc.walletBalance + totalCollected
        });
        walletBalance = updated.walletBalance;

        this.economyRepo.recordTransaction({
          guildId,
          userId,
          type: 'COMPANY_COLLECT',
          amount: totalCollected,
          walletAfter: updated.walletBalance,
          bankAfter: updated.bankBalance,
          description: `Coleta de lucros corporativos (${targets.length} empresa(s))`
        });
      } else {
        const acc = this.economyRepo.getOrCreateAccount(guildId, userId);
        walletBalance = acc.walletBalance;
      }

      return {
        totalCollected,
        totalRestockSpent,
        autoRestockedUnits,
        restockDetails,
        walletBalance,
        companies: this.economyRepo.getUserCompanies(guildId, userId)
      };
    });
  }

  upgradeCompany(guildId, userId, companyId = null) {
    const companies = this.economyRepo.getUserCompanies(guildId, userId);
    if (companies.length === 0) {
      throw new Error('Você não possui nenhuma empresa para evoluir!');
    }
    const comp = companyId ? companies.find(c => c.id === Number(companyId)) : companies[0];
    if (!comp) {
      throw new Error('Empresa não encontrada.');
    }

    if (!comp.canUpgradeByTurnover) {
      throw new Error(`Sua empresa **${comp.emoji} ${comp.name}** (${comp.tierTitle}) ainda não possui maturidade comercial para expandir!\nPara subir para **${comp.nextTierTitle}**, a empresa precisa acumular pelo menos **${formatCompactNumber(comp.minTurnoverRequired)} moedas** em vendas e lucros coletados (Faturado até agora: **${formatCompactNumber(comp.totalEarned)} moedas**).\nMantenha seu estoque abastecido e colete lucros para crescer!`);
    }

    const cost = comp.nextUpgradeCost;
    return this.economyRepo.db.transaction(() => {
      let acc = this.economyRepo.getOrCreateAccount(guildId, userId);
      let convertedNotice = '';
      if (acc.walletBalance < cost) {
        const liq = this.ensureWalletLiquidity(guildId, userId, cost);
        acc = liq.account;
        convertedNotice = liq.convertedNotice || '';
      }
      if (acc.walletBalance < cost) {
        throw new Error(`Saldo insuficiente para evoluir **${comp.emoji} ${comp.name}** para o Nível ${comp.level + 1}! Custo: **${formatCompactNumber(cost)} moedas**.`);
      }

      const updatedAcc = this.economyRepo.updateBalances(guildId, userId, {
        walletBalance: acc.walletBalance - cost
      });

      // Preserve any pending passive income in vault before leveling up
      const updatedCompany = this.economyRepo.updateUserCompany(comp.id, {
        level: comp.level + 1,
        maxStock: comp.maxStock + 50,
        vaultBalance: comp.claimableTotal,
        stockProducts: comp.remainingStock,
        lastCollectedAt: new Date().toISOString()
      });

      this.economyRepo.recordTransaction({
        guildId,
        userId,
        type: 'COMPANY_UPGRADE',
        amount: -cost,
        walletAfter: updatedAcc.walletBalance,
        bankAfter: updatedAcc.bankBalance,
        description: `Upgrade da empresa ${comp.name} para Nível ${comp.level + 1}`
      });

      return {
        company: updatedCompany,
        cost,
        walletBalance: updatedAcc.walletBalance,
        convertedNotice
      };
    });
  }

  restockCompany(guildId, userId, amountInput = null, companyId = null) {
    const companies = this.economyRepo.getUserCompanies(guildId, userId);
    if (companies.length === 0) {
      throw new Error('Você não possui nenhuma empresa para reabastecer! Use `+empresa loja`.');
    }
    const comp = companyId ? companies.find(c => c.id === Number(companyId)) : companies[0];
    if (!comp) throw new Error('Empresa não encontrada.');

    const availableSpace = Math.max(0, comp.maxStock - comp.remainingStock);
    if (availableSpace <= 0) {
      throw new Error(`O estoque de **${comp.emoji} ${comp.name}** já está no limite máximo (**${comp.remainingStock}/${comp.maxStock}** ${comp.supplyEmoji} ${comp.supplyName})!`);
    }

    let qty = availableSpace;
    if (amountInput && String(amountInput).toLowerCase() !== 'max') {
      const parsed = parseInt(amountInput, 10);
      if (isNaN(parsed) || parsed <= 0) {
        throw new Error(`Informe uma quantidade válida de ${comp.supplyName} para comprar ou use \`max\`.`);
      }
      qty = Math.min(availableSpace, parsed);
    }

    // Each business buys its own kind of supplies, priced by the business type
    const wholesalePricePerUnit = comp.supplyUnitCost;
    const totalCost = qty * wholesalePricePerUnit;

    return this.economyRepo.db.transaction(() => {
      let acc = this.economyRepo.getOrCreateAccount(guildId, userId);
      let convertedNotice = '';
      if (acc.walletBalance < totalCost) {
        const liq = this.ensureWalletLiquidity(guildId, userId, totalCost);
        acc = liq.account;
        convertedNotice = liq.convertedNotice || '';
      }
      if (acc.walletBalance < totalCost) {
        throw new Error(`Saldo insuficiente para comprar **${qty}x ${comp.supplyEmoji} ${comp.supplyName}**! Custo total: **${formatCompactNumber(totalCost)} moedas** (${formatCompactNumber(wholesalePricePerUnit)} cada) — você tem ${formatCompactNumber(acc.walletBalance)}.`);
      }

      const updatedAcc = this.economyRepo.updateBalances(guildId, userId, {
        walletBalance: acc.walletBalance - totalCost
      });

      const newStock = comp.remainingStock + qty;
      const updatedCompany = this.economyRepo.updateUserCompany(comp.id, {
        stockProducts: newStock,
        vaultBalance: comp.claimableTotal,
        lastCollectedAt: new Date().toISOString(),
        distressSince: null,
        distressNotified: 0
      });

      this.economyRepo.recordTransaction({
        guildId,
        userId,
        type: 'COMPANY_RESTOCK',
        amount: -totalCost,
        walletAfter: updatedAcc.walletBalance,
        bankAfter: updatedAcc.bankBalance,
        description: `Reabastecimento: ${qty}x ${comp.supplyName} para ${comp.name}`
      });

      return {
        company: updatedCompany,
        qtyAdded: qty,
        newStock,
        totalCost,
        unitCost: wholesalePricePerUnit,
        supplyName: comp.supplyName,
        supplyEmoji: comp.supplyEmoji,
        walletBalance: updatedAcc.walletBalance,
        convertedNotice
      };
    });
  }

  toggleCompanyAutoRestock(guildId, userId, companyId = null) {
    const companies = this.economyRepo.getUserCompanies(guildId, userId);
    if (companies.length === 0) {
      throw new Error('Você não possui nenhuma empresa! Use `+empresa loja`.');
    }
    const comp = companyId ? companies.find(c => c.id === Number(companyId)) : companies[0];
    if (!comp) throw new Error('Empresa não encontrada.');

    const activating = !comp.autoRestock;
    const managerHiringCost = 5000;

    return this.economyRepo.db.transaction(() => {
      let notice = '';
      if (activating) {
        let acc = this.economyRepo.getOrCreateAccount(guildId, userId);
        if (acc.walletBalance < managerHiringCost) {
          const liq = this.ensureWalletLiquidity(guildId, userId, managerHiringCost);
          acc = liq.account;
        }
        if (acc.walletBalance < managerHiringCost) {
          throw new Error(`Saldo insuficiente para contratar o **Gerente de Suprimentos**! Taxa de contratação: **${formatCompactNumber(managerHiringCost)} moedas**.`);
        }
        const updatedAcc = this.economyRepo.updateBalances(guildId, userId, {
          walletBalance: acc.walletBalance - managerHiringCost
        });
        this.economyRepo.recordTransaction({
          guildId,
          userId,
          type: 'COMPANY_MANAGER_HIRE',
          amount: -managerHiringCost,
          walletAfter: updatedAcc.walletBalance,
          bankAfter: updatedAcc.bankBalance,
          description: `Contratação de Gerente de Suprimentos para ${comp.name}`
        });
        notice = `Contratado por **${formatCompactNumber(managerHiringCost)} moedas**! Ele manterá seu estoque sempre abastecido automaticamente.`;
      } else {
        notice = 'Gerente de suprimentos desativado. Você precisará reabastecer manualmente.';
      }

      const updatedCompany = this.economyRepo.updateUserCompany(comp.id, {
        autoRestock: activating ? 1 : 0
      });

      return {
        company: updatedCompany,
        isActive: activating,
        notice
      };
    });
  }

  hireNpcWorker(guildId, userId, companyId = null) {
    const companies = this.economyRepo.getUserCompanies(guildId, userId);
    if (companies.length === 0) {
      throw new Error('Você não possui nenhuma empresa! Use `+empresa loja`.');
    }
    const comp = companyId ? companies.find(c => c.id === Number(companyId)) : companies[0];
    if (!comp) throw new Error('Empresa não encontrada.');

    const totalStaff = comp.employees.length + comp.npcWorkers;
    if (totalStaff >= comp.maxEmployees) {
      throw new Error(`Sua empresa **${comp.emoji} ${comp.name}** já atingiu a capacidade máxima de equipe (**${comp.maxEmployees} funcionários**)! Evolua o nível da empresa com \`+empresa evoluir\` para abrir novos postos de trabalho.`);
    }

    const hireCost = 3000 * comp.level;
    return this.economyRepo.db.transaction(() => {
      let acc = this.economyRepo.getOrCreateAccount(guildId, userId);
      if (acc.walletBalance < hireCost) {
        const liq = this.ensureWalletLiquidity(guildId, userId, hireCost);
        acc = liq.account;
      }
      if (acc.walletBalance < hireCost) {
        throw new Error(`Saldo insuficiente para contratar funcionário operacional! Custo: **${formatCompactNumber(hireCost)} moedas**.`);
      }

      const updatedAcc = this.economyRepo.updateBalances(guildId, userId, {
        walletBalance: acc.walletBalance - hireCost
      });

      const updatedCompany = this.economyRepo.updateUserCompany(comp.id, {
        npcWorkers: comp.npcWorkers + 1,
        maxStock: comp.maxStock + 25
      });

      this.economyRepo.recordTransaction({
        guildId,
        userId,
        type: 'COMPANY_NPC_HIRE',
        amount: -hireCost,
        walletAfter: updatedAcc.walletBalance,
        bankAfter: updatedAcc.bankBalance,
        description: `Contratação de funcionário NPC para ${comp.name}`
      });

      return {
        company: updatedCompany,
        hireCost,
        walletBalance: updatedAcc.walletBalance
      };
    });
  }

  hireCompanyEmployee(guildId, ownerId, employeeId, companyId = null) {
    if (ownerId === employeeId) {
      throw new Error('Você já é o dono da empresa e não pode contratar a si mesmo como funcionário!');
    }
    const companies = this.economyRepo.getUserCompanies(guildId, ownerId);
    if (companies.length === 0) {
      throw new Error('Você precisa ter uma empresa para contratar funcionários! Use `+empresa loja`.');
    }
    const comp = companyId ? companies.find(c => c.id === Number(companyId)) : companies[0];
    if (!comp) throw new Error('Empresa não encontrada.');

    if (comp.employees.length >= comp.maxEmployees) {
      throw new Error(`Sua empresa **${comp.emoji} ${comp.name}** já atingiu o limite de **${comp.maxEmployees} funcionários**! Evolua sua empresa com \`+empresa evoluir\` para abrir mais vagas.`);
    }

    const job = this.economyRepo.hireEmployee(guildId, comp.id, employeeId);
    return {
      company: this.economyRepo.getUserCompanyById(comp.id),
      job
    };
  }

  fireCompanyEmployee(guildId, ownerId, employeeId, companyId = null) {
    const companies = this.economyRepo.getUserCompanies(guildId, ownerId);
    const comp = companyId ? companies.find(c => c.id === Number(companyId)) : companies[0];
    if (!comp) throw new Error('Você não possui uma empresa ativa.');
    const removed = this.economyRepo.fireEmployee(guildId, comp.id, employeeId);
    if (!removed) throw new Error('Este membro não faz parte do quadro de funcionários da sua empresa.');
    return { company: this.economyRepo.getUserCompanyById(comp.id) };
  }

  // ==========================================
  // 14. PvP Duels X1 (+duelo)
  // ==========================================

  _ensureDuelMaps() {
    if (!this.pendingDuels) this.pendingDuels = new Map();
    if (!this.activeRussianRoulettes) this.activeRussianRoulettes = new Map();
  }

  createDuelChallenge(guildId, challengerId, opponentId, amountInput, modeInput = 'moeda', currencyCode = null) {
    this._ensureDuelMaps();
    this._checkCasinoAccess(guildId, challengerId);
    this._checkCasinoAccess(guildId, opponentId);

    if (challengerId === opponentId) {
      throw new Error('Você não pode desafiar a si mesmo para um duelo!');
    }

    const rawMode = String(modeInput || 'moeda').toLowerCase().trim();
    let mode = 'moeda';
    if (['dado', 'dados', 'dice'].includes(rawMode)) mode = 'dado';
    else if (['roleta', 'russa', 'roulette', 'revolver'].includes(rawMode)) mode = 'roleta';

    const amount = parseInt(amountInput, 10);
    if (isNaN(amount) || amount <= 0) {
      throw new Error('Informe uma quantia válida e positiva para a aposta do duelo!');
    }

    let currency = null;
    if (currencyCode) {
      currency = this.getExchangeCurrency(guildId, currencyCode);
      if (!currency) throw new Error(`A moeda de câmbio "${currencyCode}" não foi encontrada neste servidor.`);
      const challengerUnits = this.economyRepo.getUserCurrencyBalance(guildId, challengerId, currency.id);
      if (challengerUnits < amount) {
        throw new Error(`Você não possui **${formatCompactNumber(amount)}x ${currency.symbol} ${currency.name}** na carteira para desafiar!`);
      }
    } else {
      const bal = this.getBalance(guildId, challengerId);
      const eff = bal.effectiveWalletBalance ?? bal.walletBalance;
      if (eff < amount) {
        throw new Error(`Você não possui saldo suficiente na carteira para apostar **${formatCompactNumber(amount)} moedas**!`);
      }
    }

    const duelId = `${Date.now().toString(36)}${Math.floor(Math.random() * 999)}`;
    const duel = {
      id: duelId,
      guildId,
      challengerId,
      opponentId,
      amount,
      mode,
      currencyCode: currency ? currency.code : null,
      currency,
      createdAt: Date.now()
    };

    this.pendingDuels.set(duelId, duel);
    return duel;
  }

  declineDuelChallenge(guildId, duelId, userId) {
    this._ensureDuelMaps();
    const duel = this.pendingDuels.get(duelId);
    if (!duel || duel.guildId !== guildId) {
      throw new Error('Este desafio de duelo não existe mais ou já expirou.');
    }
    if (userId !== duel.opponentId && userId !== duel.challengerId) {
      throw new Error('Apenas os participantes do duelo podem cancelar ou recusar o desafio!');
    }
    this.pendingDuels.delete(duelId);
    return duel;
  }

  acceptDuelChallenge(guildId, duelId, accepterId) {
    this._ensureDuelMaps();
    const duel = this.pendingDuels.get(duelId);
    if (!duel || duel.guildId !== guildId) {
      throw new Error('Este desafio de duelo não existe mais ou já foi encerrado!');
    }
    if (accepterId !== duel.opponentId) {
      throw new Error(`Apenas <@${duel.opponentId}> pode aceitar este duelo!`);
    }

    this._checkCasinoAccess(guildId, duel.challengerId);
    this._checkCasinoAccess(guildId, duel.opponentId);

    this.pendingDuels.delete(duelId);

    // Verify both players have funds & lock/settle inside transaction
    return this.economyRepo.db.transaction(() => {
      const { challengerId, opponentId, amount, mode, currency } = duel;

      if (currency) {
        const cUnits = this.economyRepo.getUserCurrencyBalance(guildId, challengerId, currency.id);
        const oUnits = this.economyRepo.getUserCurrencyBalance(guildId, opponentId, currency.id);
        if (cUnits < amount) {
          throw new Error(`<@${challengerId}> não possui mais **${amount}x ${currency.symbol} ${currency.name}** na carteira!`);
        }
        if (oUnits < amount) {
          throw new Error(`Você precisa de **${amount}x ${currency.symbol} ${currency.name}** na carteira para aceitar este duelo (você possui ${oUnits}x)!`);
        }
      } else {
        let cAcc = this.economyRepo.getOrCreateAccount(guildId, challengerId);
        if (cAcc.walletBalance < amount) {
          cAcc = this.ensureWalletLiquidity(guildId, challengerId, amount).account;
        }
        if (cAcc.walletBalance < amount) {
          throw new Error(`<@${challengerId}> não possui mais saldo suficiente na carteira!`);
        }

        let oAcc = this.economyRepo.getOrCreateAccount(guildId, opponentId);
        if (oAcc.walletBalance < amount) {
          oAcc = this.ensureWalletLiquidity(guildId, opponentId, amount).account;
        }
        if (oAcc.walletBalance < amount) {
          throw new Error(`Você não possui saldo suficiente na carteira para aceitar a aposta de **${formatCompactNumber(amount)} moedas**!`);
        }
      }

      // If Russian Roulette mode, deduct stakes into pot and start interactive turn-based game
      if (mode === 'roleta') {
        if (currency) {
          this.economyRepo.addUserCurrencyBalance(guildId, challengerId, currency.id, -amount);
          this.economyRepo.addUserCurrencyBalance(guildId, opponentId, currency.id, -amount);
        } else {
          const cAcc = this.economyRepo.getOrCreateAccount(guildId, challengerId);
          const oAcc = this.economyRepo.getOrCreateAccount(guildId, opponentId);
          this.economyRepo.updateBalances(guildId, challengerId, { walletBalance: cAcc.walletBalance - amount });
          this.economyRepo.updateBalances(guildId, opponentId, { walletBalance: oAcc.walletBalance - amount });
        }

        const rrState = {
          ...duel,
          pot: amount * 2,
          currentTurnId: Math.random() < 0.5 ? challengerId : opponentId,
          chamberIndex: 0,
          bulletChamber: Math.floor(Math.random() * 6),
          log: []
        };
        this.activeRussianRoulettes.set(duelId, rrState);
        return {
          mode: 'roleta',
          finished: false,
          rrState
        };
      }

      // Instant resolution for 'moeda' (Coinflip X1) or 'dado' (Dice 2d6 X1)
      let winnerId;
      let loserId;
      let detailsText = '';

      if (mode === 'dado') {
        let cRoll1 = 1, cRoll2 = 1, oRoll1 = 1, oRoll2 = 1;
        let cSum = 0, oSum = 0;
        while (cSum === oSum) {
          cRoll1 = Math.floor(Math.random() * 6) + 1;
          cRoll2 = Math.floor(Math.random() * 6) + 1;
          oRoll1 = Math.floor(Math.random() * 6) + 1;
          oRoll2 = Math.floor(Math.random() * 6) + 1;
          cSum = cRoll1 + cRoll2;
          oSum = oRoll1 + oRoll2;
        }
        winnerId = cSum > oSum ? challengerId : opponentId;
        loserId = winnerId === challengerId ? opponentId : challengerId;
        detailsText =
          `🎲 <@${challengerId}> rolou **[${cRoll1} + ${cRoll2}] = ${cSum}**\n` +
          `🎲 <@${opponentId}> rolou **[${oRoll1} + ${oRoll2}] = ${oSum}**`;
      } else {
        const landed = Math.random() < 0.5 ? 'CARA' : 'COROA';
        winnerId = landed === 'CARA' ? challengerId : opponentId;
        loserId = winnerId === challengerId ? opponentId : challengerId;
        detailsText =
          `🪙 <@${challengerId}> ficou com **CARA** • <@${opponentId}> ficou com **COROA**\n` +
          `✨ A moeda girou no ar e caiu em: **${landed}**!`;
      }

      if (currency) {
        this.economyRepo.addUserCurrencyBalance(guildId, loserId, currency.id, -amount);
        this.economyRepo.addUserCurrencyBalance(guildId, winnerId, currency.id, amount);
      } else {
        const lAcc = this.economyRepo.getOrCreateAccount(guildId, loserId);
        const wAcc = this.economyRepo.getOrCreateAccount(guildId, winnerId);
        const updatedL = this.economyRepo.updateBalances(guildId, loserId, { walletBalance: lAcc.walletBalance - amount });
        const updatedW = this.economyRepo.updateBalances(guildId, winnerId, { walletBalance: wAcc.walletBalance + amount });

        this.economyRepo.recordTransaction({
          guildId,
          userId: winnerId,
          targetId: loserId,
          type: 'DUEL_WIN',
          amount,
          walletAfter: updatedW.walletBalance,
          bankAfter: updatedW.bankBalance,
          description: `Vitória em Duelo X1 (${mode}) contra ${loserId}`
        });
        this.economyRepo.recordTransaction({
          guildId,
          userId: loserId,
          targetId: winnerId,
          type: 'DUEL_LOSS',
          amount: -amount,
          walletAfter: updatedL.walletBalance,
          bankAfter: updatedL.bankBalance,
          description: `Derrota em Duelo X1 (${mode}) para ${winnerId}`
        });
      }

      return {
        mode,
        finished: true,
        duel,
        winnerId,
        loserId,
        amount,
        pot: amount * 2,
        currency,
        detailsText
      };
    });
  }

  pullRussianRouletteTrigger(guildId, duelId, userId) {
    this._ensureDuelMaps();
    const rr = this.activeRussianRoulettes.get(duelId);
    if (!rr || rr.guildId !== guildId) {
      throw new Error('Esta partida de Roleta Russa não está mais ativa.');
    }
    if (userId !== rr.currentTurnId) {
      throw new Error(`Não é a sua vez! Agora é a vez de <@${rr.currentTurnId}> puxar o gatilho!`);
    }

    const chamberNum = rr.chamberIndex + 1;
    const fired = rr.chamberIndex === rr.bulletChamber;

    if (fired) {
      this.activeRussianRoulettes.delete(duelId);
      const loserId = userId;
      const winnerId = userId === rr.challengerId ? rr.opponentId : rr.challengerId;

      this.economyRepo.db.transaction(() => {
        if (rr.currency) {
          this.economyRepo.addUserCurrencyBalance(guildId, winnerId, rr.currency.id, rr.pot);
        } else {
          const wAcc = this.economyRepo.getOrCreateAccount(guildId, winnerId);
          const updatedW = this.economyRepo.updateBalances(guildId, winnerId, {
            walletBalance: wAcc.walletBalance + rr.pot
          });
          this.economyRepo.recordTransaction({
            guildId,
            userId: winnerId,
            targetId: loserId,
            type: 'DUEL_ROULETTE_WIN',
            amount: rr.amount,
            walletAfter: updatedW.walletBalance,
            bankAfter: updatedW.bankBalance,
            description: `Sobreviveu à Roleta Russa X1 contra ${loserId}`
          });
        }
      });

      rr.log.push(`💥 **[Câmara ${chamberNum}/6]** <@${loserId}> puxou o gatilho e... **BANG!** O disparo de plasma acertou em cheio!`);
      return {
        finished: true,
        winnerId,
        loserId,
        rrState: rr
      };
    } else {
      rr.log.push(`😮‍💨 **[Câmara ${chamberNum}/6]** <@${userId}> puxou o gatilho... *CLICK!* Câmara vazia!`);
      rr.chamberIndex += 1;
      rr.currentTurnId = userId === rr.challengerId ? rr.opponentId : rr.challengerId;
      return {
        finished: false,
        rrState: rr
      };
    }
  }
}

module.exports = { EconomyService };
