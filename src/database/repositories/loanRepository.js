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
