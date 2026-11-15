const { logger } = require('../../utils/logger');

const loanLogger = logger.forContext('LoanRepository');

class LoanRepository {
  /**
   * @param {import('../databaseManager').DatabaseManager} db
   */
  constructor(db) {
    this.db = db;
  }

  /**
   * Get loan by primary key ID.
   * @param {number} id
   */
  getLoanById(id) {
    return this.db.get('SELECT * FROM economy_loans WHERE id = ?', [id]);
  }

  /**
   * Get all active or defaulted loans for a borrower in a guild.
   * @param {string} guildId
   * @param {string} borrowerId
   */
  getActiveLoans(guildId, borrowerId) {
    this.checkAndMarkOverdue(guildId, borrowerId);

    return this.db.all(
      `SELECT * FROM economy_loans 
       WHERE guild_id = ? AND borrower_id = ? AND status IN ('ACTIVE', 'DEFAULTED')
       ORDER BY id ASC`,
      [guildId, borrowerId]
    );
  }

  /**
   * Get active or defaulted loan for a borrower in a guild.
   * @param {string} guildId
   * @param {string} borrowerId
   */
  getActiveLoan(guildId, borrowerId) {
    // Check and update if overdue
    this.checkAndMarkOverdue(guildId, borrowerId);

    return this.db.get(
      `SELECT * FROM economy_loans 
       WHERE guild_id = ? AND borrower_id = ? AND status IN ('ACTIVE', 'DEFAULTED')
       ORDER BY id DESC LIMIT 1`,
      [guildId, borrowerId]
    );
  }

  /**
   * Get loan configuration for a guild (interest, term, retention, level limits, etc.).
   * @param {string} guildId
   */
  getLoanConfig(guildId) {
    const defaultTiers = [
      { minLevel: 0, maxLimit: 500, maxLoan: 500 },
      { minLevel: 1, maxLimit: 2000, maxLoan: 2000 },
      { minLevel: 5, maxLimit: 10000, maxLoan: 10000 },
      { minLevel: 10, maxLimit: 30000, maxLoan: 30000 },
      { minLevel: 20, maxLimit: 100000, maxLoan: 100000 },
      { minLevel: 35, maxLimit: 500000, maxLoan: 500000 },
      { minLevel: 50, maxLimit: 2000000, maxLoan: 2000000 }
    ];

    let row = null;
    try {
      row = this.db.get('SELECT * FROM economy_loan_configs WHERE guild_id = ?', [guildId]);
    } catch {
      row = null;
    }

    if (!row) {
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
        blockCasinoOnDefault: true,
        levelTiers: defaultTiers
      };
    }

    let parsedTiers = defaultTiers;
    try {
      const raw = JSON.parse(row.level_tiers_json || '[]');
      if (Array.isArray(raw) && raw.length > 0) {
        parsedTiers = raw
          .map(t => {
            const val = Math.max(1, parseInt(t.maxLoan ?? t.maxLimit, 10) || 500);
            return {
              minLevel: Math.max(0, parseInt(t.minLevel, 10) || 0),
              maxLimit: val,
              maxLoan: val
            };
          })
          .sort((a, b) => a.minLevel - b.minLevel);
      }
    } catch {
      parsedTiers = defaultTiers;
    }

    return {
      guildId: row.guild_id,
      bankLoansEnabled: row.bank_loans_enabled !== 0,
      p2pLoansEnabled: row.p2p_loans_enabled !== 0,
      bankInterestRate: Number(row.bank_interest_rate ?? 0.10),
      bankTermDays: Math.max(1, parseInt(row.bank_term_days, 10) || 7),
      retentionRate: Number(row.retention_rate ?? 0.40),
      maxActiveLoans: Math.max(1, parseInt(row.max_active_loans, 10) || 1),
      p2pMaxInterestRate: Number(row.p2p_max_interest_rate ?? 0.50),
      p2pMaxTermDays: Math.max(1, parseInt(row.p2p_max_term_days, 10) || 30),
      blockTransfersOnDefault: row.block_transfers_on_default !== 0,
      blockShopOnDefault: row.block_shop_on_default !== 0,
      blockCasinoOnDefault: row.block_casino_on_default !== 0,
      levelTiers: parsedTiers
    };
  }

  /**
   * Upsert loan configuration for a guild.
   * @param {string} guildId
   * @param {object} updates
   */
  upsertLoanConfig(guildId, updates = {}) {
    const current = this.getLoanConfig(guildId);
    const merged = { ...current, ...updates };

    let tiers = Array.isArray(merged.levelTiers) ? merged.levelTiers : current.levelTiers;
    tiers = tiers
      .map(t => {
        const val = Math.max(1, parseInt(t.maxLoan ?? t.maxLimit, 10) || 500);
        return {
          minLevel: Math.max(0, parseInt(t.minLevel, 10) || 0),
          maxLimit: val,
          maxLoan: val
        };
      })
      .sort((a, b) => a.minLevel - b.minLevel);

    // Deduplicate by minLevel (keep latest)
    const tierMap = new Map();
    for (const t of tiers) {
      tierMap.set(t.minLevel, t);
    }
    const cleanTiers = Array.from(tierMap.values()).sort((a, b) => a.minLevel - b.minLevel);
    if (cleanTiers.length === 0) {
      cleanTiers.push({ minLevel: 0, maxLimit: 500 });
    }

    this.db.run(
      `INSERT OR IGNORE INTO guilds (id, name, joined_at) VALUES (?, 'Guild', CURRENT_TIMESTAMP)`,
      [guildId]
    );

    this.db.run(
      `INSERT INTO economy_loan_configs (
        guild_id, bank_loans_enabled, p2p_loans_enabled,
        bank_interest_rate, bank_term_days, retention_rate, max_active_loans,
        p2p_max_interest_rate, p2p_max_term_days,
        block_transfers_on_default, block_shop_on_default, block_casino_on_default,
        level_tiers_json, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(guild_id) DO UPDATE SET
        bank_loans_enabled = excluded.bank_loans_enabled,
        p2p_loans_enabled = excluded.p2p_loans_enabled,
        bank_interest_rate = excluded.bank_interest_rate,
        bank_term_days = excluded.bank_term_days,
        retention_rate = excluded.retention_rate,
        max_active_loans = excluded.max_active_loans,
        p2p_max_interest_rate = excluded.p2p_max_interest_rate,
        p2p_max_term_days = excluded.p2p_max_term_days,
        block_transfers_on_default = excluded.block_transfers_on_default,
        block_shop_on_default = excluded.block_shop_on_default,
        block_casino_on_default = excluded.block_casino_on_default,
        level_tiers_json = excluded.level_tiers_json,
        updated_at = CURRENT_TIMESTAMP`,
      [
        guildId,
        merged.bankLoansEnabled ? 1 : 0,
        merged.p2pLoansEnabled ? 1 : 0,
        Math.max(0, Number(merged.bankInterestRate ?? 0.10)),
        Math.max(1, parseInt(merged.bankTermDays, 10) || 7),
        Math.max(0, Math.min(1, Number(merged.retentionRate ?? 0.40))),
        Math.max(1, parseInt(merged.maxActiveLoans, 10) || 1),
        Math.max(0, Number(merged.p2pMaxInterestRate ?? 0.50)),
        Math.max(1, parseInt(merged.p2pMaxTermDays, 10) || 30),
        merged.blockTransfersOnDefault ? 1 : 0,
        merged.blockShopOnDefault ? 1 : 0,
        merged.blockCasinoOnDefault ? 1 : 0,
        JSON.stringify(cleanTiers)
      ]
    );

    return this.getLoanConfig(guildId);
  }

  /**
   * Get pending P2P loan awaiting confirmation.
   * @param {string} guildId
   * @param {string} borrowerId
   */
  getPendingP2PLoan(guildId, borrowerId) {
    return this.db.get(
      `SELECT * FROM economy_loans 
       WHERE guild_id = ? AND borrower_id = ? AND status = 'PENDING'
       ORDER BY id DESC LIMIT 1`,
      [guildId, borrowerId]
    );
  }

  /**
   * Create a new loan record.
   * @param {object} param0
   */
  createLoan({
    guildId,
    borrowerId,
    lenderId = null,
    loanType = 'BANK',
    principalAmount,
    interestRate = 0.10,
    totalDue,
    remainingAmount,
    retentionRate = 0.40,
    status = 'ACTIVE',
    dueDate
  }) {
    const res = this.db.run(
      `INSERT INTO economy_loans (
        guild_id, borrower_id, lender_id, loan_type,
        principal_amount, interest_rate, total_due, amount_paid,
        remaining_amount, retention_rate, status, due_date
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?)`,
      [
        guildId,
        borrowerId,
        lenderId,
        loanType,
        principalAmount,
        interestRate,
        totalDue,
        remainingAmount,
        retentionRate,
        status,
        dueDate
      ]
    );

    return this.getLoanById(res.lastInsertRowid);
  }

  /**
   * Update loan values (amount_paid, remaining_amount, status).
   * @param {number} id
   * @param {object} updates
   */
  updateLoan(id, updates = {}) {
    const sets = [];
    const params = [];

    if (updates.amountPaid !== undefined) {
      sets.push('amount_paid = ?');
      params.push(updates.amountPaid);
    }
    if (updates.remainingAmount !== undefined) {
      sets.push('remaining_amount = ?');
      params.push(updates.remainingAmount);
    }
    if (updates.status !== undefined) {
      sets.push('status = ?');
      params.push(updates.status);
    }
    sets.push('updated_at = CURRENT_TIMESTAMP');

    params.push(id);

    this.db.run(
      `UPDATE economy_loans SET ${sets.join(', ')} WHERE id = ?`,
      params
    );

    return this.getLoanById(id);
  }

  /**
   * Mark active loans overdue if current time has passed due date.
   * @param {string} guildId
   * @param {string} borrowerId
   */
  checkAndMarkOverdue(guildId, borrowerId) {
    const nowIso = new Date().toISOString();
    this.db.run(
      `UPDATE economy_loans 
       SET status = 'DEFAULTED', updated_at = CURRENT_TIMESTAMP 
       WHERE guild_id = ? AND borrower_id = ? AND status = 'ACTIVE' AND due_date < ?`,
      [guildId, borrowerId, nowIso]
    );
  }

  /**
   * Get user loan history.
   * @param {string} guildId
   * @param {string} userId
   * @param {number} limit
   */
  getUserLoans(guildId, userId, limit = 10) {
    return this.db.all(
      `SELECT * FROM economy_loans 
       WHERE guild_id = ? AND (borrower_id = ? OR lender_id = ?)
       ORDER BY id DESC LIMIT ?`,
      [guildId, userId, userId, limit]
    );
  }

  // ==========================================
  // User Profiles (Bio, Custom Embed Color)
  // ==========================================

  /**
   * Get user profile details.
   * @param {string} guildId
   * @param {string} userId
   */
  getProfile(guildId, userId) {
    const row = this.db.get(
      'SELECT * FROM user_profiles WHERE guild_id = ? AND user_id = ?',
      [guildId, userId]
    );

    return {
      guildId,
      userId,
      bio: row?.bio || null,
      embedColor: row?.embed_color || null
    };
  }

  /**
   * Upsert user profile bio and/or embed color.
   * @param {string} guildId
   * @param {string} userId
   * @param {object} data
   */
  upsertProfile(guildId, userId, data = {}) {
    const current = this.getProfile(guildId, userId);
    const bio = data.bio !== undefined ? data.bio : current.bio;
    const embedColor = data.embedColor !== undefined ? data.embedColor : current.embedColor;

    this.db.run(
      `INSERT INTO user_profiles (guild_id, user_id, bio, embed_color, updated_at)
       VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
       ON CONFLICT(guild_id, user_id) DO UPDATE SET
         bio = excluded.bio,
         embed_color = excluded.embed_color,
         updated_at = CURRENT_TIMESTAMP`,
      [guildId, userId, bio, embedColor]
    );

    return this.getProfile(guildId, userId);
  }
}

module.exports = { LoanRepository };
