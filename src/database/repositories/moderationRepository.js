class ModerationRepository {
  /**
   * @param {import('../connection').DatabaseManager} dbManager
   */
  constructor(dbManager) {
    this.db = dbManager;
  }

  // ==========================================
  // 1. Punishments
  // ==========================================

  createPunishment({
    guildId,
    targetId,
    actorId,
    type,
    reason = null,
    durationSeconds = null,
    evidenceUrl = null,
    expiresAt = null
  }) {
    const now = new Date().toISOString();
    const result = this.db.run(
      `INSERT INTO moderation_punishments 
       (guild_id, target_id, actor_id, type, reason, duration_seconds, evidence_url, created_at, expires_at, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      [guildId, targetId, actorId, type.toUpperCase(), reason, durationSeconds, evidenceUrl, now, expiresAt]
    );

    return {
      id: Number(result.lastInsertRowid),
      guildId,
      targetId,
      actorId,
      type: type.toUpperCase(),
      reason,
      durationSeconds,
      evidenceUrl,
      createdAt: now,
      expiresAt,
      isActive: 1
    };
  }

  getDisciplinaryHistory(guildId, targetId) {
    return this.db.all(
      `SELECT * FROM moderation_punishments 
       WHERE guild_id = ? AND target_id = ? 
       ORDER BY id DESC`,
      [guildId, targetId]
    );
  }

  getActiveWarns(guildId, targetId, windowDays = null) {
    let sql = `
      SELECT * FROM moderation_punishments 
      WHERE guild_id = ? AND target_id = ? AND type = 'WARN' AND is_active = 1
    `;
    const params = [guildId, targetId];

    if (windowDays && Number(windowDays) > 0) {
      sql += ` AND created_at >= datetime('now', '-' || ? || ' days')`;
      params.push(windowDays);
    }

    sql += ' ORDER BY id ASC';
    return this.db.all(sql, params);
  }

  clearWarns(guildId, targetId) {
    const result = this.db.run(
      `UPDATE moderation_punishments 
       SET is_active = 0 
       WHERE guild_id = ? AND target_id = ? AND type = 'WARN' AND is_active = 1`,
      [guildId, targetId]
    );
    return result.changes;
  }

  getGuildWarns(guildId, limit = 20) {
    return this.db.all(
      `SELECT * FROM moderation_punishments
       WHERE guild_id = ? AND type = 'WARN'
       ORDER BY id DESC
       LIMIT ?`,
      [guildId, limit]
    );
  }

  getMemberWarns(guildId, targetId) {
    return this.db.all(
      `SELECT * FROM moderation_punishments
       WHERE guild_id = ? AND target_id = ? AND type = 'WARN'
       ORDER BY id DESC`,
      [guildId, targetId]
    );
  }

  // ==========================================
  // 2. Warn Escalation Rules
  // ==========================================

  createEscalationRule({
    guildId,
    thresholdWarns,
    action,
    durationSeconds = null,
    windowDays = 30,
    autoApply = 1,
    exemptRoleIds = '[]',
    priority = 0
  }) {
    const result = this.db.run(
      `INSERT INTO warn_escalation_rules 
       (guild_id, threshold_warns, action, duration_seconds, window_days, auto_apply, exempt_role_ids, priority)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        guildId,
        thresholdWarns,
        action.toUpperCase(),
        durationSeconds,
        windowDays,
        autoApply ? 1 : 0,
        typeof exemptRoleIds === 'string' ? exemptRoleIds : JSON.stringify(exemptRoleIds),
        priority
      ]
    );

    return {
      id: Number(result.lastInsertRowid),
      guildId,
      thresholdWarns,
      action: action.toUpperCase(),
      durationSeconds,
      windowDays,
      autoApply: Boolean(autoApply),
      exemptRoleIds,
      priority
    };
  }

  getEscalationRules(guildId) {
    return this.db.all(
      `SELECT * FROM warn_escalation_rules 
       WHERE guild_id = ? 
       ORDER BY priority DESC, threshold_warns ASC`,
      [guildId]
    );
  }

  deleteEscalationRule(id) {
    const result = this.db.run('DELETE FROM warn_escalation_rules WHERE id = ?', [id]);
    return result.changes > 0;
  }

  // ==========================================
  // 3. Log Channels
  // ==========================================

  setLogChannel(guildId, category, channelId) {
    const cleanCategory = category.toUpperCase().trim();
    const now = new Date().toISOString();

    const existing = this.db.get(
      'SELECT * FROM moderation_log_channels WHERE guild_id = ? AND category = ?',
      [guildId, cleanCategory]
    );

    if (existing) {
      this.db.run(
        'UPDATE moderation_log_channels SET channel_id = ?, updated_at = ? WHERE guild_id = ? AND category = ?',
        [channelId, now, guildId, cleanCategory]
      );
    } else {
      this.db.run(
        'INSERT INTO moderation_log_channels (guild_id, category, channel_id, updated_at) VALUES (?, ?, ?, ?)',
        [guildId, cleanCategory, channelId, now]
      );
    }

    return { guildId, category: cleanCategory, channelId };
  }

  getLogChannels(guildId) {
    return this.db.all('SELECT * FROM moderation_log_channels WHERE guild_id = ?', [guildId]);
  }

  getLogChannel(guildId, category) {
    return this.db.get(
      'SELECT channel_id FROM moderation_log_channels WHERE guild_id = ? AND category = ?',
      [guildId, category.toUpperCase().trim()]
    );
  }

  // ==========================================
  // 4. Anti-Abuse Configuration
  // ==========================================

  getAntiAbuseConfig(guildId) {
    const row = this.db.get('SELECT * FROM anti_abuse_configs WHERE guild_id = ?', [guildId]);
    if (!row) {
      // Default configuration
      return {
        guildId,
        antiSpamEnabled: true,
        maxMessagesPerInterval: 5,
        intervalSeconds: 5,
        antiFloodDuplicateThreshold: 3,
        antiRaidEnabled: true,
        actionOnDetection: 'TIMEOUT',
        timeoutDurationSeconds: 300
      };
    }
    return {
      guildId: row.guild_id,
      antiSpamEnabled: Boolean(row.anti_spam_enabled),
      maxMessagesPerInterval: row.max_messages_per_interval,
      intervalSeconds: row.interval_seconds,
      antiFloodDuplicateThreshold: row.anti_flood_duplicate_threshold,
      antiRaidEnabled: Boolean(row.anti_raid_enabled),
      actionOnDetection: row.action_on_detection,
      timeoutDurationSeconds: row.timeout_duration_seconds
    };
  }

  saveAntiAbuseConfig(guildId, config) {
    const now = new Date().toISOString();
    const existing = this.db.get('SELECT guild_id FROM anti_abuse_configs WHERE guild_id = ?', [guildId]);

    const antiSpam = config.antiSpamEnabled ? 1 : 0;
    const maxMsgs = config.maxMessagesPerInterval || 5;
    const intervalSecs = config.intervalSeconds || 5;
    const floodThresh = config.antiFloodDuplicateThreshold || 3;
    const antiRaid = config.antiRaidEnabled ? 1 : 0;
    const action = config.actionOnDetection || 'TIMEOUT';
    const timeoutSecs = config.timeoutDurationSeconds || 300;

    if (existing) {
      this.db.run(
        `UPDATE anti_abuse_configs SET
          anti_spam_enabled = ?,
          max_messages_per_interval = ?,
          interval_seconds = ?,
          anti_flood_duplicate_threshold = ?,
          anti_raid_enabled = ?,
          action_on_detection = ?,
          timeout_duration_seconds = ?,
          updated_at = ?
         WHERE guild_id = ?`,
        [antiSpam, maxMsgs, intervalSecs, floodThresh, antiRaid, action, timeoutSecs, now, guildId]
      );
    } else {
      this.db.run(
        `INSERT INTO anti_abuse_configs 
         (guild_id, anti_spam_enabled, max_messages_per_interval, interval_seconds, anti_flood_duplicate_threshold, anti_raid_enabled, action_on_detection, timeout_duration_seconds, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [guildId, antiSpam, maxMsgs, intervalSecs, floodThresh, antiRaid, action, timeoutSecs, now]
      );
    }

    return this.getAntiAbuseConfig(guildId);
  }
}

module.exports = {
  ModerationRepository
};
