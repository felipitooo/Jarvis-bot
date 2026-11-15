const { logger } = require('../../utils/logger');

const quizLogger = logger.forContext('QuizRepository');

class QuizRepository {
  /**
   * @param {import('../databaseManager').DatabaseManager} db
   */
  constructor(db) {
    this.db = db;
  }

  /**
   * Returns default quiz configuration for a guild.
   */
  getDefaults(guildId) {
    return {
      guildId,
      rewardCoins: 200,
      rewardXp: 50,
      defaultRounds: 5,
      defaultTimeoutSeconds: 25,
      skipCost: 50,
      allowedChannelId: null
    };
  }

  /**
   * Gets guild quiz configuration.
   * @param {string} guildId
   */
  getQuizConfig(guildId) {
    if (!guildId) return this.getDefaults(guildId);

    const row = this.db.get(
      'SELECT * FROM quiz_guild_configs WHERE guild_id = ?',
      [guildId]
    );

    if (!row) {
      return this.getDefaults(guildId);
    }

    return {
      guildId,
      rewardCoins: Number(row.reward_coins_per_win ?? 200),
      rewardXp: Number(row.reward_xp_per_win ?? 50),
      defaultRounds: Number(row.default_rounds ?? 5),
      defaultTimeoutSeconds: Number(row.default_timeout_seconds ?? 25),
      skipCost: Number(row.skip_cost ?? 50),
      allowedChannelId: row.allowed_channel_id || null
    };
  }

  /**
   * Upserts guild quiz configuration.
   * @param {string} guildId
   * @param {object} config
   */
  saveQuizConfig(guildId, config = {}) {
    const current = this.getQuizConfig(guildId);
    const updated = { ...current, ...config };

    this.db.run(
      `INSERT INTO quiz_guild_configs (guild_id, reward_coins_per_win, reward_xp_per_win, default_rounds, default_timeout_seconds, skip_cost, allowed_channel_id)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(guild_id) DO UPDATE SET
         reward_coins_per_win = excluded.reward_coins_per_win,
         reward_xp_per_win = excluded.reward_xp_per_win,
         default_rounds = excluded.default_rounds,
         default_timeout_seconds = excluded.default_timeout_seconds,
         skip_cost = excluded.skip_cost,
         allowed_channel_id = excluded.allowed_channel_id`,
      [
        guildId,
        updated.rewardCoins,
        updated.rewardXp,
        updated.defaultRounds,
        updated.defaultTimeoutSeconds,
        updated.skipCost,
        updated.allowedChannelId
      ]
    );

    return this.getQuizConfig(guildId);
  }

  /**
   * Records a user's correct question answer in a match.
   * @param {string} guildId
   * @param {string} userId
   * @param {number} points
   */
  addCorrectAnswer(guildId, userId, points = 10) {
    this.db.run(
      `INSERT INTO quiz_scores (guild_id, user_id, total_points, total_correct, games_won, last_played_at)
       VALUES (?, ?, ?, 1, 0, datetime('now'))
       ON CONFLICT(guild_id, user_id) DO UPDATE SET
         total_points = total_points + excluded.total_points,
         total_correct = total_correct + 1,
         last_played_at = datetime('now')`,
      [guildId, userId, points]
    );
  }

  /**
   * Records a user winning an entire quiz match.
   * @param {string} guildId
   * @param {string} userId
   */
  recordMatchWin(guildId, userId) {
    this.db.run(
      `INSERT INTO quiz_scores (guild_id, user_id, total_points, total_correct, games_won, last_played_at)
       VALUES (?, ?, 0, 0, 1, datetime('now'))
       ON CONFLICT(guild_id, user_id) DO UPDATE SET
         games_won = games_won + 1,
         last_played_at = datetime('now')`,
      [guildId, userId]
    );
  }

  /**
   * Retrieves user statistics in the quiz arena.
   * @param {string} guildId
   * @param {string} userId
   */
  getUserScore(guildId, userId) {
    const row = this.db.get(
      'SELECT * FROM quiz_scores WHERE guild_id = ? AND user_id = ?',
      [guildId, userId]
    );

    if (!row) {
      return {
        guildId,
        userId,
        totalPoints: 0,
        totalCorrect: 0,
        gamesWon: 0,
        lastPlayedAt: null
      };
    }

    return {
      guildId,
      userId,
      totalPoints: Number(row.total_points || 0),
      totalCorrect: Number(row.total_correct || 0),
      gamesWon: Number(row.games_won || 0),
      lastPlayedAt: row.last_played_at
    };
  }

  /**
   * Retrieves server top quiz champions.
   * @param {string} guildId
   * @param {number} limit
   */
  getLeaderboard(guildId, limit = 10) {
    const rows = this.db.all(
      `SELECT user_id, total_points, total_correct, games_won, last_played_at
       FROM quiz_scores
       WHERE guild_id = ?
       ORDER BY total_points DESC, total_correct DESC, games_won DESC
       LIMIT ?`,
      [guildId, limit]
    );

    return rows.map((r, i) => ({
      rank: i + 1,
      userId: r.user_id,
      totalPoints: Number(r.total_points || 0),
      totalCorrect: Number(r.total_correct || 0),
      gamesWon: Number(r.games_won || 0),
      lastPlayedAt: r.last_played_at
    }));
  }

  /**
   * Creates a custom user quiz question for a guild.
   * @param {object} params
   * @param {string} params.guildId
   * @param {string} params.authorId
   * @param {string} params.category
   * @param {string} params.question
   * @param {string[]|string} params.answers
   * @param {string} params.explanation
   * @param {string|null} [params.imageUrl]
   */
  createCustomQuestion({ guildId, authorId, category = 'geral', question, answers, explanation, imageUrl = null }) {
    if (!guildId || !authorId || !question || !answers || !explanation) {
      throw new Error('Parâmetros obrigatórios ausentes para criação de pergunta customizada.');
    }

    const answersArray = Array.isArray(answers)
      ? answers.map(a => String(a).trim()).filter(Boolean)
      : String(answers).split(',').map(a => a.trim()).filter(Boolean);

    if (answersArray.length === 0) {
      throw new Error('Pelo menos uma resposta correta deve ser fornecida.');
    }

    const cleanCat = String(category || 'geral').toLowerCase().trim();
    const cleanImg = imageUrl && String(imageUrl).trim().startsWith('http') ? String(imageUrl).trim() : null;

    this.db.run(
      `INSERT INTO custom_quiz_questions (guild_id, author_id, category, question, answers, explanation, image_url, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
      [
        guildId,
        authorId,
        cleanCat,
        question.trim(),
        JSON.stringify(answersArray),
        explanation.trim(),
        cleanImg
      ]
    );

    const inserted = this.db.get(
      `SELECT * FROM custom_quiz_questions WHERE guild_id = ? ORDER BY id DESC LIMIT 1`,
      [guildId]
    );

    return this._formatCustomQuestion(inserted);
  }

  /**
   * Gets all active custom questions for a guild (optionally filtered by category).
   * @param {string} guildId
   * @param {string|null} [category]
   */
  getCustomQuestions(guildId, category = null) {
    if (!guildId) return [];

    let rows;
    if (category && category !== 'misto') {
      rows = this.db.all(
        `SELECT * FROM custom_quiz_questions
         WHERE guild_id = ? AND category = ? AND is_active = 1
         ORDER BY id DESC`,
        [guildId, category.toLowerCase().trim()]
      );
    } else {
      rows = this.db.all(
        `SELECT * FROM custom_quiz_questions
         WHERE guild_id = ? AND is_active = 1
         ORDER BY id DESC`,
        [guildId]
      );
    }

    return rows.map(r => this._formatCustomQuestion(r));
  }

  /**
   * Retrieves a single custom question by ID and guildId.
   * @param {number|string} id
   * @param {string} guildId
   */
  getCustomQuestionById(id, guildId) {
    const row = this.db.get(
      `SELECT * FROM custom_quiz_questions WHERE id = ? AND guild_id = ? AND is_active = 1`,
      [Number(id), guildId]
    );
    return row ? this._formatCustomQuestion(row) : null;
  }

  /**
   * Soft-deletes a custom question by ID.
   * @param {number|string} id
   * @param {string} guildId
   */
  deleteCustomQuestion(id, guildId) {
    this.db.run(
      `UPDATE custom_quiz_questions SET is_active = 0 WHERE id = ? AND guild_id = ?`,
      [Number(id), guildId]
    );
    return true;
  }

  /**
   * Updates an existing custom question by ID.
   * @param {number|string} id
   * @param {string} guildId
   * @param {object} updates
   */
  updateCustomQuestion(id, guildId, updates = {}) {
    const existing = this.getCustomQuestionById(id, guildId);
    if (!existing) {
      throw new Error(`Pergunta customizada #${id} não encontrada.`);
    }

    const newQuestion = updates.question !== undefined ? updates.question.trim() : existing.question;
    const newCat = updates.category !== undefined ? updates.category.toLowerCase().trim() : existing.category;
    const newExpl = updates.explanation !== undefined ? updates.explanation.trim() : existing.explanation;
    const newImg = updates.imageUrl !== undefined
      ? (updates.imageUrl && updates.imageUrl.startsWith('http') ? updates.imageUrl.trim() : null)
      : existing.imageUrl;

    let newAnswers = existing.answers;
    if (updates.answers !== undefined) {
      newAnswers = Array.isArray(updates.answers)
        ? updates.answers.map(a => String(a).trim()).filter(Boolean)
        : String(updates.answers).split(',').map(a => a.trim()).filter(Boolean);
      if (newAnswers.length === 0) {
        throw new Error('Pelo menos uma resposta correta deve ser fornecida.');
      }
    }

    this.db.run(
      `UPDATE custom_quiz_questions
       SET category = ?, question = ?, answers = ?, explanation = ?, image_url = ?
       WHERE id = ? AND guild_id = ?`,
      [newCat, newQuestion, JSON.stringify(newAnswers), newExpl, newImg, Number(id), guildId]
    );

    return this.getCustomQuestionById(id, guildId);
  }

  /**
   * Creates or updates a custom category for a guild.
   * @param {object} params
   * @param {string} params.guildId
   * @param {string} params.authorId
   * @param {string} params.key
   * @param {string} params.name
   * @param {string} [params.emoji]
   * @param {string} [params.color]
   * @param {string} [params.description]
   */
  createCustomCategory({ guildId, authorId, key, name, emoji = '📁', color = '#5865F2', description = '' }) {
    if (!guildId || !key || !name) {
      throw new Error('Guild, código (slug) e nome da categoria são obrigatórios.');
    }

    const cleanKey = String(key).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9_-]/g, '').trim();
    if (!cleanKey) {
      throw new Error('Código identificador da categoria inválido.');
    }

    this.db.run(
      `INSERT INTO custom_quiz_categories (guild_id, author_id, key, name, emoji, color, description, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, 1)
       ON CONFLICT(guild_id, key) DO UPDATE SET
         name = excluded.name,
         emoji = excluded.emoji,
         color = excluded.color,
         description = excluded.description,
         is_active = 1`,
      [guildId, authorId, cleanKey, String(name).trim(), String(emoji || '📁').trim(), String(color || '#5865F2').trim(), String(description || '').trim()]
    );

    return this.getCustomCategoryByKey(guildId, cleanKey);
  }

  /**
   * Retrieves all active custom categories for a guild.
   * @param {string} guildId
   */
  getCustomCategories(guildId) {
    if (!guildId) return [];
    const rows = this.db.all(
      `SELECT * FROM custom_quiz_categories WHERE guild_id = ? AND is_active = 1 ORDER BY id ASC`,
      [guildId]
    );

    return rows.map(r => ({
      id: Number(r.id),
      guildId: r.guild_id,
      authorId: r.author_id,
      key: r.key,
      name: r.name,
      emoji: r.emoji || '📁',
      color: r.color || '#5865F2',
      description: r.description || '',
      createdAt: r.created_at,
      isCustom: true
    }));
  }

  /**
   * Retrieves a single custom category by key.
   * @param {string} guildId
   * @param {string} key
   */
  getCustomCategoryByKey(guildId, key) {
    const cleanKey = String(key).toLowerCase().trim();
    const row = this.db.get(
      `SELECT * FROM custom_quiz_categories WHERE guild_id = ? AND key = ? AND is_active = 1`,
      [guildId, cleanKey]
    );

    if (!row) return null;
    return {
      id: Number(row.id),
      guildId: row.guild_id,
      authorId: row.author_id,
      key: row.key,
      name: row.name,
      emoji: row.emoji || '📁',
      color: row.color || '#5865F2',
      description: row.description || '',
      createdAt: row.created_at,
      isCustom: true
    };
  }

  /**
   * Deletes a custom category by ID.
   * @param {number|string} id
   * @param {string} guildId
   */
  deleteCustomCategory(id, guildId) {
    this.db.run(
      `UPDATE custom_quiz_categories SET is_active = 0 WHERE id = ? AND guild_id = ?`,
      [Number(id), guildId]
    );
    return true;
  }

  /**
   * Deletes a custom category by key.
   * @param {string} guildId
   * @param {string} key
   */
  deleteCustomCategoryByKey(guildId, key) {
    this.db.run(
      `UPDATE custom_quiz_categories SET is_active = 0 WHERE guild_id = ? AND key = ?`,
      [guildId, String(key).toLowerCase().trim()]
    );
    return true;
  }

  /**
   * Helper to deserialize answers and format custom question object.
   * @private
   */
  _formatCustomQuestion(row) {
    if (!row) return null;
    let answers = [];
    try {
      answers = JSON.parse(row.answers);
      if (!Array.isArray(answers)) answers = [String(row.answers)];
    } catch {
      answers = [String(row.answers)];
    }

    return {
      id: Number(row.id),
      quizQuestionId: `custom_${row.id}`,
      guildId: row.guild_id,
      authorId: row.author_id,
      category: row.category,
      question: row.question,
      answers,
      explanation: row.explanation,
      imageUrl: row.image_url || null,
      createdAt: row.created_at,
      isActive: Boolean(row.is_active),
      isCustom: true
    };
  }
}

module.exports = { QuizRepository };
