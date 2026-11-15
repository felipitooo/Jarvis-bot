const { logger } = require('../utils/logger');
const { formatCompactNumber } = require('../utils/numberFormatter');

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
      let message = template.replace('{amount}', formattedReward) + loanNotice;

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

      return {
        currency,
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

      return {
        currency,
        quantity: qty,
        totalGained,
        newWallet: updated.walletBalance,
        remainingCurrencyBalance
      };
    });
  }
}

module.exports = { EconomyService };
