/**
 * Prediction and Betting Pool Service (Sistema de Bolão do Servidor)
 * Allows members to create real-life event predictions, bet coins, and distribute accumulated pools.
 */
class PredictionService {
  constructor(dbManager) {
    this.db = dbManager;
  }

  /**
   * Creates a new prediction betting pool.
   * Only one active (OPEN or LOCKED) prediction is allowed per guild.
   */
  createPrediction(guildId, creatorId, title) {
    if (!guildId || !creatorId || !title?.trim()) {
      throw new Error('Parâmetros inválidos para criação do bolão.');
    }

    const cleanTitle = title.trim();
    if (cleanTitle.length < 5 || cleanTitle.length > 200) {
      throw new Error('O título do bolão deve ter entre 5 e 200 caracteres.');
    }

    const active = this.getActivePrediction(guildId);
    if (active) {
      throw new Error(`Já existe um bolão ativo no servidor: "${active.title}". Finalize-o antes de abrir outro.`);
    }

    const stmt = this.db.run(
      'INSERT INTO server_predictions (guild_id, creator_id, title, status, total_pool) VALUES (?, ?, ?, ?, ?)',
      [guildId, creatorId, cleanTitle, 'OPEN', 0]
    );

    const id = stmt.lastInsertRowid;
    return this.getPredictionById(id);
  }

  /**
   * Retrieves the currently active prediction for a guild (status OPEN or LOCKED).
   */
  getActivePrediction(guildId) {
    if (!guildId) return null;
    const row = this.db.get(
      'SELECT * FROM server_predictions WHERE guild_id = ? AND status IN (\'OPEN\', \'LOCKED\') ORDER BY id DESC LIMIT 1',
      [guildId]
    );
    if (!row) return null;
    return this._enrichPrediction(row);
  }

  /**
   * Retrieves a prediction by its ID.
   */
  getPredictionById(predictionId) {
    const row = this.db.get('SELECT * FROM server_predictions WHERE id = ?', [predictionId]);
    if (!row) return null;
    return this._enrichPrediction(row);
  }

  /**
   * Places a bet on an OPEN prediction.
   */
  placeBet(guildId, userId, choiceRaw, amount, economyService) {
    if (!guildId || !userId || !choiceRaw || !amount || isNaN(amount) || amount <= 0) {
      throw new Error('Valor da aposta inválido.');
    }

    const choiceNorm = choiceRaw.toUpperCase().trim();
    let choice = null;
    if (['SIM', 'S', 'YES', 'Y', '1'].includes(choiceNorm)) choice = 'SIM';
    else if (['NAO', 'NÃO', 'N', 'NO', '0'].includes(choiceNorm)) choice = 'NAO';
    else throw new Error('Opção de voto inválida. Escolha "SIM" ou "NÃO".');

    const pred = this.getActivePrediction(guildId);
    if (!pred) {
      throw new Error('Não há nenhum bolão aberto para apostas no momento.');
    }
    if (pred.status !== 'OPEN') {
      throw new Error('As apostas para este bolão já foram travadas.');
    }

    const intAmount = Math.floor(Number(amount));
    if (intAmount < 10) {
      throw new Error('O valor mínimo de aposta no bolão é de 10 moedas.');
    }

    // Check user balance
    if (economyService) {
      const bal = economyService.getBalance(guildId, userId);
      if ((bal?.walletBalance || 0) < intAmount) {
        throw new Error(`Saldo insuficiente na carteira. Você tem ${bal?.walletBalance || 0} moedas.`);
      }
    }

    // Check if user already bet on this prediction
    const existingBet = this.db.get(
      'SELECT * FROM server_prediction_bets WHERE prediction_id = ? AND user_id = ?',
      [pred.id, userId]
    );
    if (existingBet) {
      throw new Error(`Você já apostou ${existingBet.amount} moedas no "${existingBet.choice}". Cada membro só pode apostar uma vez por bolão.`);
    }

    // Deduct coins from user's wallet
    if (economyService) {
      economyService.removeBalance(guildId, userId, intAmount, 'WALLET', `Aposta no Bolão #${pred.id}`);
    }

    // Record bet
    this.db.run(
      'INSERT INTO server_prediction_bets (prediction_id, guild_id, user_id, choice, amount) VALUES (?, ?, ?, ?, ?)',
      [pred.id, guildId, userId, choice, intAmount]
    );

    // Update total pool
    this.db.run(
      'UPDATE server_predictions SET total_pool = total_pool + ? WHERE id = ?',
      [intAmount, pred.id]
    );

    return {
      success: true,
      predictionId: pred.id,
      choice,
      amount: intAmount,
      updatedPrediction: this.getPredictionById(pred.id)
    };
  }

  /**
   * Locks an active prediction (no further bets allowed).
   */
  lockPrediction(guildId, userId, isAdmin = false) {
    const pred = this.getActivePrediction(guildId);
    if (!pred) throw new Error('Não há bolão ativo para travar.');
    if (pred.status !== 'OPEN') throw new Error('Este bolão já está travado ou encerrado.');
    if (pred.creator_id !== userId && !isAdmin) {
      throw new Error('Apenas o criador do bolão ou um administrador pode travar as apostas.');
    }

    this.db.run("UPDATE server_predictions SET status = 'LOCKED' WHERE id = ?", [pred.id]);
    return this.getPredictionById(pred.id);
  }

  /**
   * Resolves a prediction with a winning choice and distributes the accumulated pool proportionally.
   */
  resolvePrediction(guildId, winningChoiceRaw, userId, isAdmin = false, economyService = null) {
    const pred = this.getActivePrediction(guildId);
    if (!pred) throw new Error('Não há bolão ativo para finalizar.');
    if (pred.creator_id !== userId && !isAdmin) {
      throw new Error('Apenas o criador do bolão ou um administrador pode finalizar o bolão.');
    }

    const choiceNorm = winningChoiceRaw?.toUpperCase()?.trim();
    let winningChoice = null;
    if (['SIM', 'S', 'YES', 'Y'].includes(choiceNorm)) winningChoice = 'SIM';
    else if (['NAO', 'NÃO', 'N', 'NO'].includes(choiceNorm)) winningChoice = 'NAO';
    else throw new Error('Opção vencedora inválida. Especifique "SIM" ou "NÃO".');

    const bets = this.db.all('SELECT * FROM server_prediction_bets WHERE prediction_id = ?', [pred.id]);
    const totalPool = pred.total_pool || 0;
    const winners = bets.filter(b => b.choice === winningChoice);
    const winningPool = winners.reduce((acc, b) => acc + b.amount, 0);

    const payouts = [];

    if (winners.length > 0 && winningPool > 0) {
      // Distribute pool proportionally
      for (const w of winners) {
        const shareRatio = w.amount / winningPool;
        const payout = Math.max(w.amount, Math.floor(shareRatio * totalPool));
        if (economyService) {
          economyService.addBalance(guildId, w.user_id, payout, 'WALLET', `Prêmio do Bolão #${pred.id}`);
        }
        payouts.push({
          userId: w.user_id,
          betAmount: w.amount,
          payout,
          profit: payout - w.amount
        });
      }
    } else {
      // No winners: refund all original bets
      for (const b of bets) {
        if (economyService) {
          economyService.addBalance(guildId, b.user_id, b.amount, 'WALLET', `Reembolso do Bolão #${pred.id} (Sem acertadores)`);
        }
        payouts.push({
          userId: b.user_id,
          betAmount: b.amount,
          payout: b.amount,
          profit: 0,
          refunded: true
        });
      }
    }

    this.db.run(
      "UPDATE server_predictions SET status = 'RESOLVED', winning_choice = ?, resolved_at = CURRENT_TIMESTAMP WHERE id = ?",
      [winningChoice, pred.id]
    );

    return {
      prediction: this.getPredictionById(pred.id),
      winningChoice,
      totalPool,
      winnersCount: winners.length,
      payouts
    };
  }

  /**
   * Cancels a prediction and refunds 100% of bets back to all participants.
   */
  cancelPrediction(guildId, userId, isAdmin = false, economyService = null) {
    const pred = this.getActivePrediction(guildId);
    if (!pred) throw new Error('Não há bolão ativo para cancelar.');
    if (pred.creator_id !== userId && !isAdmin) {
      throw new Error('Apenas o criador do bolão ou um administrador pode cancelar o bolão.');
    }

    const bets = this.db.all('SELECT * FROM server_prediction_bets WHERE prediction_id = ?', [pred.id]);
    for (const b of bets) {
      if (economyService) {
        economyService.addBalance(guildId, b.user_id, b.amount, 'WALLET', `Reembolso do Bolão #${pred.id} cancelado`);
      }
    }

    this.db.run(
      "UPDATE server_predictions SET status = 'CANCELLED', resolved_at = CURRENT_TIMESTAMP WHERE id = ?",
      [pred.id]
    );

    return {
      prediction: this.getPredictionById(pred.id),
      refundCount: bets.length,
      totalRefunded: pred.total_pool
    };
  }

  _enrichPrediction(row) {
    const bets = this.db.all('SELECT * FROM server_prediction_bets WHERE prediction_id = ?', [row.id]);
    const simBets = bets.filter(b => b.choice === 'SIM');
    const naoBets = bets.filter(b => b.choice === 'NAO');
    const poolSim = simBets.reduce((acc, b) => acc + b.amount, 0);
    const poolNao = naoBets.reduce((acc, b) => acc + b.amount, 0);

    return {
      ...row,
      poolSim,
      poolNao,
      betsCount: bets.length,
      betsSimCount: simBets.length,
      betsNaoCount: naoBets.length,
      bets
    };
  }
}

module.exports = { PredictionService };
