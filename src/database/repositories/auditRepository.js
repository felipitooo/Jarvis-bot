class AuditRepository {
  /**
   * @param {import('../connection').DatabaseManager} dbManager
   */
  constructor(dbManager) {
    this.db = dbManager;
  }

  createAuditEntry({ guildId = null, actorId = null, action, targetId = null, details = null }) {
    if (guildId) {
      this.db.run(
        `INSERT OR IGNORE INTO guilds (id, name, joined_at) VALUES (?, 'Guild', CURRENT_TIMESTAMP)`,
        [guildId]
      );
    }

    const detailsStr = typeof details === 'object' && details !== null 
      ? JSON.stringify(details) 
      : (details ? String(details) : null);

    const now = new Date().toISOString();

    const result = this.db.run(
      `INSERT INTO audit_logs (guild_id, actor_id, action, target_id, details, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [guildId, actorId, action, targetId, detailsStr, now]
    );

    return {
      id: Number(result.lastInsertRowid),
      guildId,
      actorId,
      action,
      targetId,
      details: detailsStr,
      createdAt: now
    };
  }

  getAuditLogs({ guildId = null, action = null, limit = 50, offset = 0 } = {}) {
    let sql = 'SELECT * FROM audit_logs WHERE 1=1';
    const params = [];

    if (guildId !== null) {
      sql += ' AND guild_id = ?';
      params.push(guildId);
    }

    if (action !== null) {
      sql += ' AND action = ?';
      params.push(action);
    }

    sql += ' ORDER BY id DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    return this.db.all(sql, params);
  }

  getAuditLogById(id) {
    return this.db.get('SELECT * FROM audit_logs WHERE id = ?', [id]);
  }
}

module.exports = {
  AuditRepository
};
