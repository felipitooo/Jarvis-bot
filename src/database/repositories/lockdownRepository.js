class LockdownRepository {
  /**
   * @param {import('../connection').DatabaseManager} dbManager
   */
  constructor(dbManager) {
    this.db = dbManager;
  }

  createLockdown({ guildId, initiatedBy = null, reason = null, channelsAffectedJson }) {
    const now = new Date().toISOString();
    const result = this.db.run(
      `INSERT INTO lockdown_states (guild_id, is_active, initiated_by, reason, channels_affected_json, created_at)
       VALUES (?, 1, ?, ?, ?, ?)`,
      [guildId, initiatedBy, reason, channelsAffectedJson, now]
    );

    return {
      id: Number(result.lastInsertRowid),
      guildId,
      isActive: 1,
      initiatedBy,
      reason,
      createdAt: now
    };
  }

  getActiveLockdown(guildId) {
    return this.db.get(
      'SELECT * FROM lockdown_states WHERE guild_id = ? AND is_active = 1 ORDER BY id DESC LIMIT 1',
      [guildId]
    );
  }

  revertLockdown(id) {
    const now = new Date().toISOString();
    const result = this.db.run(
      'UPDATE lockdown_states SET is_active = 0, reverted_at = ? WHERE id = ?',
      [now, id]
    );
    return result.changes > 0;
  }
}

module.exports = {
  LockdownRepository
};
