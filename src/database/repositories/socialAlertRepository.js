class SocialAlertRepository {
  /**
   * @param {import('../connection').DatabaseManager} dbManager
   */
  constructor(dbManager) {
    this.db = dbManager;
  }

  createAlert({ guildId, platform, sourceId, channelTargetId, customMessage = null }) {
    const result = this.db.run(
      `INSERT INTO social_alerts (guild_id, platform, source_id, channel_target_id, custom_message, is_active)
       VALUES (?, ?, ?, ?, ?, 1)`,
      [guildId, platform.toUpperCase(), sourceId.trim(), channelTargetId, customMessage]
    );

    return {
      id: Number(result.lastInsertRowid),
      guildId,
      platform: platform.toUpperCase(),
      sourceId: sourceId.trim(),
      channelTargetId,
      customMessage,
      isActive: true
    };
  }

  getAlertById(id) {
    const row = this.db.get('SELECT * FROM social_alerts WHERE id = ?', [id]);
    return row ? this._formatRow(row) : null;
  }

  listAlerts(guildId, platform = null) {
    let sql = 'SELECT * FROM social_alerts WHERE guild_id = ?';
    const params = [guildId];

    if (platform) {
      sql += ' AND platform = ?';
      params.push(platform.toUpperCase());
    }

    sql += ' ORDER BY id DESC';
    const rows = this.db.all(sql, params);
    return rows.map(r => this._formatRow(r));
  }

  listAllActiveAlerts() {
    const rows = this.db.all('SELECT * FROM social_alerts WHERE is_active = 1 ORDER BY id ASC');
    return rows.map(r => this._formatRow(r));
  }

  updateLastNotifiedId(id, lastNotifiedId) {
    this.db.run(
      'UPDATE social_alerts SET last_notified_id = ? WHERE id = ?',
      [lastNotifiedId, id]
    );
  }

  deleteAlert(id, guildId = null) {
    let sql = 'DELETE FROM social_alerts WHERE id = ?';
    const params = [id];
    if (guildId) {
      sql += ' AND guild_id = ?';
      params.push(guildId);
    }
    const result = this.db.run(sql, params);
    return result.changes > 0;
  }

  toggleAlert(id, isActive, guildId = null) {
    let sql = 'UPDATE social_alerts SET is_active = ? WHERE id = ?';
    const params = [isActive ? 1 : 0, id];
    if (guildId) {
      sql += ' AND guild_id = ?';
      params.push(guildId);
    }
    const result = this.db.run(sql, params);
    return result.changes > 0;
  }

  _formatRow(row) {
    return {
      id: row.id,
      guildId: row.guild_id,
      platform: row.platform,
      sourceId: row.source_id,
      channelTargetId: row.channel_target_id,
      customMessage: row.custom_message,
      lastNotifiedId: row.last_notified_id,
      isActive: Boolean(row.is_active),
      createdAt: row.created_at
    };
  }
}

module.exports = {
  SocialAlertRepository
};
