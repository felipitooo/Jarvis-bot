class ReviewRepository {
  /**
   * @param {import('../connection').DatabaseManager} dbManager
   */
  constructor(dbManager) {
    this.db = dbManager;
  }

  // ==========================================
  // 1. Review Configuration
  // ==========================================

  getReviewConfig(guildId) {
    const row = this.db.get(
      'SELECT * FROM review_guild_configs WHERE guild_id = ?',
      [guildId]
    );

    if (!row) {
      return {
        guildId,
        reviewChannelId: null,
        requireModeration: false
      };
    }

    return {
      guildId: row.guild_id,
      reviewChannelId: row.review_channel_id,
      requireModeration: Boolean(row.require_moderation)
    };
  }

  upsertReviewConfig(guildId, config) {
    const current = this.getReviewConfig(guildId);
    const updated = { ...current, ...config };
    const now = new Date().toISOString();

    this.db.run(
      `INSERT INTO review_guild_configs (guild_id, review_channel_id, require_moderation, updated_at)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(guild_id) DO UPDATE SET
         review_channel_id = excluded.review_channel_id,
         require_moderation = excluded.require_moderation,
         updated_at = excluded.updated_at`,
      [
        guildId,
        updated.reviewChannelId,
        updated.requireModeration ? 1 : 0,
        now
      ]
    );

    return updated;
  }

  // ==========================================
  // 2. Reviews CRUD
  // ==========================================

  findUserReview(guildId, authorId, targetStaffId = null) {
    let sql = 'SELECT * FROM community_reviews WHERE guild_id = ? AND author_id = ?';
    const params = [guildId, authorId];

    if (targetStaffId) {
      sql += ' AND target_staff_id = ?';
      params.push(targetStaffId);
    } else {
      sql += ' AND target_staff_id IS NULL';
    }

    sql += ' AND status != ? ORDER BY id DESC LIMIT 1';
    params.push('DELETED');

    const row = this.db.get(sql, params);
    return row ? this.mapReview(row) : null;
  }

  upsertReview(guildId, { authorId, targetStaffId = null, ticketId = null, rating, comment, status = 'APPROVED' }) {
    const existing = this.findUserReview(guildId, authorId, targetStaffId);
    const cleanRating = Math.max(1, Math.min(5, Number(rating) || 5));
    const now = new Date().toISOString();

    if (existing) {
      this.db.run(
        `UPDATE community_reviews
         SET rating = ?, comment = ?, ticket_id = COALESCE(?, ticket_id), status = ?, created_at = ?
         WHERE id = ? AND guild_id = ?`,
        [cleanRating, comment, ticketId, status, now, existing.id, guildId]
      );

      return {
        id: existing.id,
        guildId,
        authorId,
        targetStaffId: existing.targetStaffId,
        ticketId: ticketId || existing.ticketId,
        rating: cleanRating,
        comment,
        response: existing.response,
        respondedBy: existing.respondedBy,
        respondedAt: existing.respondedAt,
        status,
        createdAt: now,
        isOverwritten: true,
        previousRating: existing.rating,
        previousComment: existing.comment
      };
    }

    const created = this.createReview(guildId, {
      authorId,
      targetStaffId,
      ticketId,
      rating: cleanRating,
      comment,
      status
    });

    return {
      ...created,
      isOverwritten: false
    };
  }

  createReview(guildId, { authorId, targetStaffId = null, ticketId = null, rating, comment, status = 'APPROVED' }) {
    const now = new Date().toISOString();
    const cleanRating = Math.max(1, Math.min(5, Number(rating) || 5));

    const result = this.db.run(
      `INSERT INTO community_reviews (guild_id, author_id, target_staff_id, ticket_id, rating, comment, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [guildId, authorId, targetStaffId, ticketId, cleanRating, comment, status, now]
    );

    return {
      id: result.lastInsertRowid,
      guildId,
      authorId,
      targetStaffId,
      ticketId,
      rating: cleanRating,
      comment,
      response: null,
      respondedBy: null,
      respondedAt: null,
      status,
      createdAt: now
    };
  }

  getReview(guildId, reviewId) {
    const row = this.db.get(
      'SELECT * FROM community_reviews WHERE guild_id = ? AND id = ?',
      [guildId, reviewId]
    );
    return row ? this.mapReview(row) : null;
  }

  getReviews(guildId, { targetStaffId = null, status = 'APPROVED', limit = 20, offset = 0 } = {}) {
    let sql = 'SELECT * FROM community_reviews WHERE guild_id = ?';
    const params = [guildId];

    if (status) {
      sql += ' AND status = ?';
      params.push(status);
    }
    if (targetStaffId) {
      sql += ' AND target_staff_id = ?';
      params.push(targetStaffId);
    }

    sql += ' ORDER BY id DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const rows = this.db.all(sql, params);
    return rows.map(r => this.mapReview(r));
  }

  respondReview(guildId, reviewId, { response, respondedBy }) {
    const now = new Date().toISOString();
    this.db.run(
      `UPDATE community_reviews
       SET response = ?, responded_by = ?, responded_at = ?
       WHERE guild_id = ? AND id = ?`,
      [response, respondedBy, now, guildId, reviewId]
    );

    return this.getReview(guildId, reviewId);
  }

  updateReviewStatus(guildId, reviewId, status) {
    this.db.run(
      'UPDATE community_reviews SET status = ? WHERE guild_id = ? AND id = ?',
      [status, guildId, reviewId]
    );
    return this.getReview(guildId, reviewId);
  }

  getReviewStats(guildId, targetStaffId = null) {
    let sql = `SELECT COUNT(*) as total, AVG(rating) as average,
               SUM(CASE WHEN rating = 5 THEN 1 ELSE 0 END) as stars_5,
               SUM(CASE WHEN rating = 4 THEN 1 ELSE 0 END) as stars_4,
               SUM(CASE WHEN rating = 3 THEN 1 ELSE 0 END) as stars_3,
               SUM(CASE WHEN rating = 2 THEN 1 ELSE 0 END) as stars_2,
               SUM(CASE WHEN rating = 1 THEN 1 ELSE 0 END) as stars_1
               FROM community_reviews WHERE guild_id = ? AND status = 'APPROVED'`;
    const params = [guildId];

    if (targetStaffId) {
      sql += ' AND target_staff_id = ?';
      params.push(targetStaffId);
    }

    const row = this.db.get(sql, params);

    return {
      total: row ? row.total : 0,
      average: row && row.average ? Number(Number(row.average).toFixed(2)) : 0,
      breakdown: {
        5: row ? row.stars_5 || 0 : 0,
        4: row ? row.stars_4 || 0 : 0,
        3: row ? row.stars_3 || 0 : 0,
        2: row ? row.stars_2 || 0 : 0,
        1: row ? row.stars_1 || 0 : 0
      }
    };
  }

  mapReview(row) {
    return {
      id: row.id,
      guildId: row.guild_id,
      authorId: row.author_id,
      targetStaffId: row.target_staff_id,
      ticketId: row.ticket_id,
      rating: Number(row.rating),
      comment: row.comment,
      response: row.response,
      respondedBy: row.responded_by,
      respondedAt: row.responded_at,
      status: row.status,
      createdAt: row.created_at
    };
  }
}

module.exports = { ReviewRepository };
