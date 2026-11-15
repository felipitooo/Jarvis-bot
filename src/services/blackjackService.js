const crypto = require('node:crypto');
const { logger } = require('../utils/logger');

const bjLogger = logger.forContext('BlackjackService');

const SUITS = ['♠', '♥', '♦', '♣'];
const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

/**
 * Creates and shuffles a standard 52-card shoe.
 * @param {number} decks Number of decks to include in the shoe
 */
function createDeck(decks = 1) {
  const cards = [];
  for (let d = 0; d < decks; d++) {
    for (const suit of SUITS) {
      for (const rank of RANKS) {
        cards.push({ rank, suit });
      }
    }
  }
  // Fisher-Yates Shuffle
  for (let i = cards.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [cards[i], cards[j]] = [cards[j], cards[i]];
  }
  return cards;
}

/**
 * Calculates optimal Blackjack hand value taking Aces as 1 or 11.
 * @param {Array<{rank: string, suit: string}>} cards
 */
function calculateHandValue(cards) {
  let total = 0;
  let aces = 0;
  for (const c of cards) {
    if (c.rank === 'A') {
      aces++;
      total += 11;
    } else if (['K', 'Q', 'J'].includes(c.rank)) {
      total += 10;
    } else {
      total += parseInt(c.rank, 10);
    }
  }
  while (total > 21 && aces > 0) {
    total -= 10;
    aces--;
  }
  return total;
}

/**
 * Formats a card into a visually distinct casino string.
 * @param {{rank: string, suit: string}} card
 */
function formatCard(card) {
  if (!card) return '`[ ❓ ]`';
  return `\`[ ${card.rank}${card.suit} ]\``;
}

/**
 * Formats a hand of cards.
 * @param {Array<{rank: string, suit: string}>} cards
 * @param {boolean} hideSecondCard
 */
function formatHand(cards, hideSecondCard = false) {
  if (hideSecondCard) {
    return `${formatCard(cards[0])} \`[ ❓ ]\``;
  }
  return cards.map(c => formatCard(c)).join(' ');
}

class BlackjackService {
  /**
   * @param {object} params
   * @param {import('./economyService').EconomyService} params.economyService
   * @param {import('../database/repositories/casinoRepository').CasinoRepository} [params.casinoRepo]
   * @param {import('./auditService').AuditService} [params.auditService]
   */
  constructor({ economyService, casinoRepo = null, auditService = null }) {
    this.economyService = economyService;
    this.casinoRepo = casinoRepo;
    this.auditService = auditService;
    // Map of active games: key = `${guildId}:${userId}`
    this.activeGames = new Map();
  }

  getGameKey(guildId, userId) {
    return `${guildId}:${userId}`;
  }

  getActiveGame(guildId, userId) {
    return this.activeGames.get(this.getGameKey(guildId, userId));
  }

  /**
   * Starts a new Blackjack game.
   */
  startGame(guildId, userId, betAmountInput, currencyCode = null) {
    if (this.economyService?.loanService) {
      const canPlay = this.economyService.loanService.canUseCasino
        ? this.economyService.loanService.canUseCasino(guildId, userId)
        : !this.economyService.loanService.isDefaulted(guildId, userId);
      if (!canPlay) {
        throw new Error('⚠️ **Nome Sujo (Serasa Stark):** Você possui um empréstimo em atraso! Quite sua dívida com `+emprestimo pagar` antes de realizar apostas no cassino.');
      }
    }

    const key = this.getGameKey(guildId, userId);
    if (this.activeGames.has(key)) {
      throw new Error('Você já possui uma partida de Blackjack em andamento neste servidor! Conclua-a antes de iniciar outra.');
    }

    const casinoConfig = this.casinoRepo?.getCasinoConfig(guildId) || {
      blackjackEnabled: true,
      blackjackMin: 50,
      blackjackMax: 50000,
      blackjackPayout: 1.5
    };

    if (!casinoConfig.blackjackEnabled) {
      throw new Error('O Blackjack está temporariamente desativado neste servidor pela administração.');
    }

    let currency = null;
    let bet = parseInt(betAmountInput, 10);

    if (currencyCode) {
      currency = this.economyService.getExchangeCurrency(guildId, currencyCode);
      if (!currency) {
        throw new Error(`Moeda "${currencyCode}" não encontrada.`);
      }
      const currentHoldings = this.economyService.economyRepo.getUserCurrencyBalance(guildId, userId, currency.id);
      if (typeof betAmountInput === 'string' && ['all', 'tudo', 'max'].includes(betAmountInput.toLowerCase())) {
        bet = currentHoldings;
      }
      if (isNaN(bet) || bet <= 0) {
        throw new Error(`Informe uma quantidade válida de ${currency.symbol} ${currency.name} para apostar.`);
      }

      if (currentHoldings < bet) {
        const missing = bet - currentHoldings;
        const neededCoins = missing * currency.rate;
        const liq = this.economyService.ensureWalletLiquidity(guildId, userId, neededCoins);
        if (liq.account.walletBalance >= neededCoins) {
          this.economyService.economyRepo.updateBalances(guildId, userId, {
            walletBalance: liq.account.walletBalance - neededCoins
          });
          this.economyService.economyRepo.addUserCurrencyBalance(guildId, userId, currency.id, missing);
        }
      }

      const updatedHoldings = this.economyService.economyRepo.getUserCurrencyBalance(guildId, userId, currency.id);
      if (updatedHoldings < bet) {
        throw new Error(`Saldo insuficiente de ${currency.symbol} **${currency.name}**. Você possui **${updatedHoldings}** unidade(s).`);
      }

      this.economyService.economyRepo.addUserCurrencyBalance(guildId, userId, currency.id, -bet);
      const account = this.economyService.economyRepo.getOrCreateAccount(guildId, userId);
      this.economyService.economyRepo.recordTransaction({
        guildId,
        userId,
        type: 'BLACKJACK_BET',
        amount: -(bet * currency.rate),
        walletAfter: account.walletBalance,
        bankAfter: account.bankBalance,
        description: `Aposta de Blackjack (${bet}x ${currency.symbol} ${currency.name})`
      });
    } else {
      if (isNaN(bet) || bet <= 0) {
        throw new Error('O valor da aposta deve ser um número positivo.');
      }

      if (bet < casinoConfig.blackjackMin || bet > casinoConfig.blackjackMax) {
        throw new Error(`A aposta no Blackjack deve ser entre ${casinoConfig.blackjackMin.toLocaleString('pt-BR')} e ${casinoConfig.blackjackMax.toLocaleString('pt-BR')} moedas.`);
      }

      const config = this.economyService.economyRepo.getGuildConfig(guildId);
      let account = this.economyService.economyRepo.getOrCreateAccount(guildId, userId);

      if (account.walletBalance < 0) {
        throw new Error(`❌ Você está endividado (${this.economyService.formatCurrency(account.walletBalance, config)})! O cassino não aceita apostas de membros com dívidas ativas.`);
      }

      if (account.walletBalance < bet && this.economyService.ensureWalletLiquidity) {
        const liq = this.economyService.ensureWalletLiquidity(guildId, userId, bet);
        account = liq.account;
      }

      if (account.walletBalance < bet) {
        throw new Error(`Saldo insuficiente na carteira! Você possui ${this.economyService.formatCurrency(account.walletBalance, config)}.`);
      }

      const updated = this.economyService.economyRepo.updateBalances(guildId, userId, {
        walletBalance: account.walletBalance - bet
      });

      this.economyService.economyRepo.recordTransaction({
        guildId,
        userId,
        type: 'BLACKJACK_BET',
        amount: -bet,
        walletAfter: updated.walletBalance,
        bankAfter: updated.bankBalance,
        description: `Aposta de Blackjack (${bet} moedas)`
      });
    }

    const deck = createDeck(2); // 2-deck shoe
    const playerHand = [deck.pop(), deck.pop()];
    const dealerHand = [deck.pop(), deck.pop()];

    const playerTotal = calculateHandValue(playerHand);
    const dealerTotal = calculateHandValue(dealerHand);

    const gameId = crypto.randomBytes(6).toString('hex');
    const game = {
      gameId,
      guildId,
      userId,
      bet,
      currency,
      deck,
      playerHand,
      dealerHand,
      status: 'IN_PROGRESS', // IN_PROGRESS, BLACKJACK, PLAYER_WIN, DEALER_WIN, PUSH, PLAYER_BUST, DEALER_BUST, SURRENDER
      createdAt: Date.now(),
      canDouble: true,
      canSurrender: true
    };

    // Check for natural Blackjack (21 on initial deal)
    if (playerTotal === 21) {
      if (dealerTotal === 21) {
        // Push
        game.status = 'PUSH';
        this._payout(guildId, userId, bet, 'BLACKJACK_PUSH', 'Blackjack: Empate natural (21 x 21)', currency);
      } else {
        // Natural Blackjack pays (1 + blackjackPayout)x
        const payout = bet * (1 + (casinoConfig.blackjackPayout || 1.5));
        game.status = 'BLACKJACK';
        this._payout(guildId, userId, payout, 'BLACKJACK_WIN', `Blackjack Natural!`, currency);
      }
      return game;
    }

    // Check if dealer has natural Blackjack
    if (dealerTotal === 21) {
      game.status = 'DEALER_WIN';
      return game;
    }

    this.activeGames.set(key, game);
    return game;
  }

  /**
   * Player hits (draws a card).
   */
  hit(guildId, userId) {
    const key = this.getGameKey(guildId, userId);
    const game = this.activeGames.get(key);
    if (!game) {
      throw new Error('Nenhuma partida ativa de Blackjack encontrada.');
    }

    game.canDouble = false;
    game.canSurrender = false;

    // Draw card
    const card = game.deck.pop();
    game.playerHand.push(card);

    const playerTotal = calculateHandValue(game.playerHand);
    if (playerTotal > 21) {
      // Player busts
      game.status = 'PLAYER_BUST';
      this.activeGames.delete(key);
      return game;
    }

    if (playerTotal === 21) {
      // Auto-stand on 21
      return this.stand(guildId, userId);
    }

    return game;
  }

  /**
   * Player stands (dealer plays).
   */
  stand(guildId, userId) {
    const key = this.getGameKey(guildId, userId);
    const game = this.activeGames.get(key);
    if (!game) {
      throw new Error('Nenhuma partida ativa de Blackjack encontrada.');
    }

    this.activeGames.delete(key);

    const playerTotal = calculateHandValue(game.playerHand);
    let dealerTotal = calculateHandValue(game.dealerHand);

    // Dealer draws cards until reaching 17 or higher
    while (dealerTotal < 17 && game.deck.length > 0) {
      game.dealerHand.push(game.deck.pop());
      dealerTotal = calculateHandValue(game.dealerHand);
    }

    if (dealerTotal > 21) {
      // Dealer busts, player wins
      game.status = 'DEALER_BUST';
      const payout = game.bet * 2;
      this._payout(guildId, userId, payout, 'BLACKJACK_WIN', `Blackjack: Dealer estourou (${dealerTotal})`, game.currency);
    } else if (playerTotal > dealerTotal) {
      // Player has higher total, player wins
      game.status = 'PLAYER_WIN';
      const payout = game.bet * 2;
      this._payout(guildId, userId, payout, 'BLACKJACK_WIN', `Blackjack: Vitória (${playerTotal} x ${dealerTotal})`, game.currency);
    } else if (playerTotal === dealerTotal) {
      // Push / tie, refund bet
      game.status = 'PUSH';
      this._payout(guildId, userId, game.bet, 'BLACKJACK_PUSH', `Blackjack: Empate (${playerTotal} x ${dealerTotal})`, game.currency);
    } else {
      // Dealer has higher total, dealer wins
      game.status = 'DEALER_WIN';
    }

    return game;
  }

  /**
   * Player doubles down (doubles bet, draws exactly 1 card, then stands).
   */
  doubleDown(guildId, userId) {
    const key = this.getGameKey(guildId, userId);
    const game = this.activeGames.get(key);
    if (!game) {
      throw new Error('Nenhuma partida ativa de Blackjack encontrada.');
    }
    if (!game.canDouble) {
      throw new Error('Você só pode dobrar a aposta na primeira rodada!');
    }

    const config = this.economyService.economyRepo.getGuildConfig(guildId);

    if (game.currency) {
      let holdings = this.economyService.economyRepo.getUserCurrencyBalance(guildId, userId, game.currency.id);
      if (holdings < game.bet) {
        const missing = game.bet - holdings;
        const neededCoins = missing * game.currency.rate;
        const liq = this.economyService.ensureWalletLiquidity(guildId, userId, neededCoins);
        if (liq.account.walletBalance >= neededCoins) {
          this.economyService.economyRepo.updateBalances(guildId, userId, {
            walletBalance: liq.account.walletBalance - neededCoins
          });
          holdings = this.economyService.economyRepo.addUserCurrencyBalance(guildId, userId, game.currency.id, missing);
        }
      }
      if (holdings < game.bet) {
        throw new Error(`Saldo insuficiente para dobrar a aposta! Você precisa de mais ${game.bet}x ${game.currency.symbol} ${game.currency.name}.`);
      }
      this.economyService.economyRepo.addUserCurrencyBalance(guildId, userId, game.currency.id, -game.bet);
      const account = this.economyService.economyRepo.getOrCreateAccount(guildId, userId);
      this.economyService.economyRepo.recordTransaction({
        guildId,
        userId,
        type: 'BLACKJACK_BET',
        amount: -(game.bet * game.currency.rate),
        walletAfter: account.walletBalance,
        bankAfter: account.bankBalance,
        description: `Blackjack: Dobrou a aposta (+${game.bet}x ${game.currency.symbol} ${game.currency.name})`
      });
    } else {
      let account = this.economyService.economyRepo.getOrCreateAccount(guildId, userId);
      if (account.walletBalance < game.bet && this.economyService.ensureWalletLiquidity) {
        const liq = this.economyService.ensureWalletLiquidity(guildId, userId, game.bet);
        account = liq.account;
      }

      if (account.walletBalance < game.bet) {
        throw new Error(`Saldo insuficiente para dobrar a aposta! Você precisa de mais ${this.economyService.formatCurrency(game.bet, config)}.`);
      }

      // Deduct second bet amount
      const updated = this.economyService.economyRepo.updateBalances(guildId, userId, {
        walletBalance: account.walletBalance - game.bet
      });

      this.economyService.economyRepo.recordTransaction({
        guildId,
        userId,
        type: 'BLACKJACK_BET',
        amount: -game.bet,
        walletAfter: updated.walletBalance,
        bankAfter: updated.bankBalance,
        description: `Blackjack: Dobrou a aposta (+${game.bet} moedas)`
      });
    }

    game.bet *= 2;
    game.canDouble = false;
    game.canSurrender = false;

    // Draw exactly 1 card
    game.playerHand.push(game.deck.pop());
    const playerTotal = calculateHandValue(game.playerHand);

    if (playerTotal > 21) {
      game.status = 'PLAYER_BUST';
      this.activeGames.delete(key);
      return game;
    }

    // Stand immediately
    return this.stand(guildId, userId);
  }

  /**
   * Player surrenders (gives up half the bet).
   */
  surrender(guildId, userId) {
    const key = this.getGameKey(guildId, userId);
    const game = this.activeGames.get(key);
    if (!game) {
      throw new Error('Nenhuma partida ativa de Blackjack encontrada.');
    }
    if (!game.canSurrender) {
      throw new Error('Você só pode se render na primeira rodada!');
    }

    this.activeGames.delete(key);
    game.status = 'SURRENDER';

    // Refund 50% of the bet
    const refund = game.currency ? (game.bet / 2) : Math.floor(game.bet / 2);
    if (refund > 0) {
      this._payout(guildId, userId, refund, 'BLACKJACK_SURRENDER', 'Blackjack: Rendição (devolução de 50%)', game.currency);
    }

    return game;
  }

  _payout(guildId, userId, amount, txType, description, currency = null) {
    if (currency) {
      const wholeUnits = Math.floor(amount);
      const fracUnits = amount - wholeUnits;
      const bonusCoins = fracUnits > 0 ? Math.round(fracUnits * currency.rate) : 0;

      if (wholeUnits > 0) {
        this.economyService.economyRepo.addUserCurrencyBalance(guildId, userId, currency.id, wholeUnits);
      }
      let account = this.economyService.economyRepo.getOrCreateAccount(guildId, userId);
      if (bonusCoins > 0) {
        account = this.economyService.economyRepo.updateBalances(guildId, userId, {
          walletBalance: account.walletBalance + bonusCoins
        });
      }

      this.economyService.economyRepo.recordTransaction({
        guildId,
        userId,
        type: txType,
        amount: Math.round(amount * currency.rate),
        walletAfter: account.walletBalance,
        bankAfter: account.bankBalance,
        description: `${description} [${amount}x ${currency.symbol} ${currency.name}]`
      });
      return;
    }

    const cleanAmt = Math.floor(amount);
    const account = this.economyService.economyRepo.getOrCreateAccount(guildId, userId);
    const updated = this.economyService.economyRepo.updateBalances(guildId, userId, {
      walletBalance: account.walletBalance + cleanAmt
    });

    this.economyService.economyRepo.recordTransaction({
      guildId,
      userId,
      type: txType,
      amount: cleanAmt,
      walletAfter: updated.walletBalance,
      bankAfter: updated.bankBalance,
      description
    });
  }

  calculateHand(cards) {
    return calculateHandValue(cards);
  }

  formatHand(cards, hideSecond = false) {
    return formatHand(cards, hideSecond);
  }
}

module.exports = {
  BlackjackService,
  calculateHandValue,
  formatCard,
  formatHand
};
