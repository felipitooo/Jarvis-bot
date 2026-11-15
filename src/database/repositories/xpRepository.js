class XpRepository {
  /**
   * @param {import('../connection').DatabaseManager} dbManager
   */
  constructor(dbManager) {
    this.db = dbManager;
  }

  // ==========================================
  // 1. Member XP & Level
  // ==========================================

  getMemberXp(guildId, userId) {
    const row = this.db.get(
      'SELECT * FROM guild_member_xp WHERE guild_id = ? AND user_id = ?',
      [guildId, userId]
    );

    if (!row) {
      return {
        guildId,
        userId,
        totalXp: 0,
        currentLevel: 0,
        level: 0,
        weeklyXp: 0,
        monthlyXp: 0,
        lastMessageAt: null,
        lastVoiceAt: null
      };
    }

    let level = Number(row.current_level || 0);
    const totalXp = Number(row.total_xp || 0);
    if (level <= 0 && totalXp > 0) {
      try {
        const { progressionFormulaService } = require('../../services/progressionFormulaService');
        const config = this.getXpConfig(guildId) || {};
        level = progressionFormulaService.calculateLevelFromXp(totalXp, config);
        // Self-heal row in database if level was uncalculated
        if (level > 0) {
          this.db.run(
            'UPDATE guild_member_xp SET current_level = ? WHERE guild_id = ? AND user_id = ?',
            [level, guildId, userId]
          );
        }
      } catch {}
    }

    return {
      guildId: row.guild_id,
      userId: row.user_id,
      totalXp,
      currentLevel: level,
      level,
      weeklyXp: row.weekly_xp,
      monthlyXp: row.monthly_xp,
      lastMessageAt: row.last_message_at,
      lastVoiceAt: row.last_voice_at,
      updatedAt: row.updated_at
    };
  }

  _ensureGuildAndUser(guildId, userId) {
    this.db.run(
      `INSERT OR IGNORE INTO guilds (id, name, joined_at) VALUES (?, 'Guild', CURRENT_TIMESTAMP)`,
      [guildId]
    );
    this.db.run(
      `INSERT OR IGNORE INTO users (id, username) VALUES (?, 'User')`,
      [userId]
    );
  }

  addMemberXp(guildId, userId, amount, newLevel, source = 'MESSAGE') {
    this._ensureGuildAndUser(guildId, userId);
    const existing = this.db.get(
      'SELECT * FROM guild_member_xp WHERE guild_id = ? AND user_id = ?',
      [guildId, userId]
    );
    const now = new Date().toISOString();

    if (existing) {
      const messageCol = source === 'MESSAGE' ? ', last_message_at = ?' : '';
      const params = [
        amount,
        newLevel,
        amount,
        amount,
        now
      ];
      if (source === 'MESSAGE') params.push(now);
      params.push(guildId, userId);

      this.db.run(
        `UPDATE guild_member_xp SET
          total_xp = total_xp + ?,
          current_level = ?,
          weekly_xp = weekly_xp + ?,
          monthly_xp = monthly_xp + ?,
          updated_at = ?
          ${messageCol}
         WHERE guild_id = ? AND user_id = ?`,
        params
      );
    } else {
      this.db.run(
        `INSERT INTO guild_member_xp 
         (guild_id, user_id, total_xp, current_level, weekly_xp, monthly_xp, last_message_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [guildId, userId, amount, newLevel, amount, amount, now, now]
      );
    }

    return this.getMemberXp(guildId, userId);
  }

  setMemberXp(guildId, userId, totalXp, level) {
    this._ensureGuildAndUser(guildId, userId);
    const existing = this.db.get(
      'SELECT * FROM guild_member_xp WHERE guild_id = ? AND user_id = ?',
      [guildId, userId]
    );
    const now = new Date().toISOString();

    if (existing) {
      this.db.run(
        `UPDATE guild_member_xp SET total_xp = ?, current_level = ?, updated_at = ? WHERE guild_id = ? AND user_id = ?`,
        [totalXp, level, now, guildId, userId]
      );
    } else {
      this.db.run(
        `INSERT INTO guild_member_xp (guild_id, user_id, total_xp, current_level, weekly_xp, monthly_xp, updated_at)
         VALUES (?, ?, ?, ?, 0, 0, ?)`,
        [guildId, userId, totalXp, level, now]
      );
    }

    return this.getMemberXp(guildId, userId);
  }

  resetMemberXp(guildId, userId) {
    const result = this.db.run(
      'DELETE FROM guild_member_xp WHERE guild_id = ? AND user_id = ?',
      [guildId, userId]
    );
    return result.changes > 0;
  }

  resetGuildXp(guildId) {
    const result = this.db.run(
      'DELETE FROM guild_member_xp WHERE guild_id = ?',
      [guildId]
    );
    return result.changes;
  }

  // ==========================================
  // 2. Leaderboards & Rankings
  // ==========================================

  getLeaderboard(guildId, { type = 'TOTAL', limit = 10, offset = 0 } = {}) {
    const colMap = {
      TOTAL: 'total_xp',
      WEEKLY: 'weekly_xp',
      MONTHLY: 'monthly_xp'
    };
    const sortCol = colMap[type.toUpperCase()] || 'total_xp';

    return this.db.all(
      `SELECT user_id, total_xp, current_level, weekly_xp, monthly_xp 
       FROM guild_member_xp 
       WHERE guild_id = ? 
       ORDER BY ${sortCol} DESC 
       LIMIT ? OFFSET ?`,
      [guildId, limit, offset]
    );
  }

  getMemberRank(guildId, userId, type = 'TOTAL') {
    const colMap = {
      TOTAL: 'total_xp',
      WEEKLY: 'weekly_xp',
      MONTHLY: 'monthly_xp'
    };
    const sortCol = colMap[type.toUpperCase()] || 'total_xp';

    const row = this.db.get(
      `SELECT COUNT(*) + 1 as rank 
       FROM guild_member_xp 
       WHERE guild_id = ? AND ${sortCol} > (
         SELECT COALESCE(${sortCol}, 0) FROM guild_member_xp WHERE guild_id = ? AND user_id = ?
       )`,
      [guildId, guildId, userId]
    );

    return row ? Number(row.rank) : 1;
  }

  // ==========================================
  // 3. Level Rewards
  // ==========================================

  getLevelRewards(guildId) {
    return this.db.all(
      'SELECT * FROM xp_level_rewards WHERE guild_id = ? ORDER BY level_required ASC',
      [guildId]
    );
  }

  addLevelReward(guildId, levelRequired, roleId, removePreviousRoles = 0) {
    const now = new Date().toISOString();
    this.db.run(
      `INSERT OR REPLACE INTO xp_level_rewards (guild_id, level_required, role_id, remove_previous_roles, created_at)
       VALUES (?, ?, ?, ?, ?)`,
      [guildId, levelRequired, roleId, removePreviousRoles ? 1 : 0, now]
    );

    return { guildId, levelRequired, roleId, removePreviousRoles: Boolean(removePreviousRoles) };
  }

  deleteLevelReward(guildId, levelRequired, roleId) {
    const result = this.db.run(
      'DELETE FROM xp_level_rewards WHERE guild_id = ? AND level_required = ? AND role_id = ?',
      [guildId, levelRequired, roleId]
    );
    return result.changes > 0;
  }

  // ==========================================
  // 4. Multipliers & Blocked Targets
  // ==========================================

  getMultipliersAndBlocks(guildId) {
    return this.db.all('SELECT * FROM xp_multipliers_exemptions WHERE guild_id = ?', [guildId]);
  }

  setMultiplierOrBlock(guildId, targetType, targetId, multiplier = 1.0, isBlocked = 0) {
    const now = new Date().toISOString();
    this.db.run(
      `INSERT OR REPLACE INTO xp_multipliers_exemptions (guild_id, target_type, target_id, multiplier, is_blocked, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [guildId, targetType.toUpperCase(), targetId, Number(multiplier) || 1.0, isBlocked ? 1 : 0, now]
    );

    return { guildId, targetType: targetType.toUpperCase(), targetId, multiplier, isBlocked: Boolean(isBlocked) };
  }

  removeMultiplierOrBlock(guildId, targetType, targetId) {
    const result = this.db.run(
      'DELETE FROM xp_multipliers_exemptions WHERE guild_id = ? AND target_type = ? AND target_id = ?',
      [guildId, targetType.toUpperCase(), targetId]
    );
    return result.changes > 0;
  }

  // ==========================================
  // 5. XP Configuration
  // ==========================================

  getXpConfig(guildId) {
    const row = this.db.get('SELECT * FROM xp_guild_configs WHERE guild_id = ?', [guildId]);
    if (!row) {
      return {
        guildId,
        enabled: true,
        cooldownSeconds: 60,
        minXp: 15,
        maxXp: 25,
        minMessageLength: 5,
        voiceXpEnabled: false,
        voiceXpPerMinute: 5,
        levelUpChannelId: null,
        levelUpMessageTemplate: 'Parabéns {user}! Você avançou para o nível **{level}**!',
        levelUpDm: false,
        formulaType: 'PROGRESSIVE',
        xpPerLevelBase: 100,
        xpPerLevelIncrement: 50,
        xpPerLevelCurve: 5
      };
    }

    return {
      guildId: row.guild_id,
      enabled: Boolean(row.enabled),
      cooldownSeconds: row.cooldown_seconds,
      minXp: row.min_xp,
      maxXp: row.max_xp,
      minMessageLength: row.min_message_length,
      voiceXpEnabled: Boolean(row.voice_xp_enabled),
      voiceXpPerMinute: row.voice_xp_per_minute ?? 5,
      levelUpChannelId: row.level_up_channel_id,
      levelUpMessageTemplate: row.level_up_message_template,
      levelUpDm: Boolean(row.level_up_dm),
      formulaType: row.formula_type || 'PROGRESSIVE',
      xpPerLevelBase: row.xp_per_level_base ?? 100,
      xpPerLevelIncrement: row.xp_per_level_increment ?? 50,
      xpPerLevelCurve: row.xp_per_level_curve ?? 5
    };
  }

  saveXpConfig(guildId, config) {
    const now = new Date().toISOString();
    const existing = this.db.get('SELECT guild_id FROM xp_guild_configs WHERE guild_id = ?', [guildId]);

    const enabled = config.enabled !== undefined ? (config.enabled ? 1 : 0) : 1;
    const cooldown = Number(config.cooldownSeconds ?? 60);
    const minXp = Number(config.minXp ?? 15);
    const maxXp = Number(config.maxXp ?? 25);
    const minLen = Number(config.minMessageLength ?? 5);
    const voiceEnabled = config.voiceXpEnabled ? 1 : 0;
    const voicePerMin = Number(config.voiceXpPerMinute ?? 5);
    const channelId = config.levelUpChannelId || null;
    const template = config.levelUpMessageTemplate || 'Parabéns {user}! Você avançou para o nível **{level}**!';
    const dm = config.levelUpDm ? 1 : 0;
    const formulaType = config.formulaType || 'PROGRESSIVE';
    const base = Number(config.xpPerLevelBase ?? 100);
    const inc = Number(config.xpPerLevelIncrement ?? 50);
    const curve = Number(config.xpPerLevelCurve ?? 5);

    if (existing) {
      this.db.run(
        `UPDATE xp_guild_configs SET
          enabled = ?,
          cooldown_seconds = ?,
          min_xp = ?,
          max_xp = ?,
          min_message_length = ?,
          voice_xp_enabled = ?,
          voice_xp_per_minute = ?,
          level_up_channel_id = ?,
          level_up_message_template = ?,
          level_up_dm = ?,
          formula_type = ?,
          xp_per_level_base = ?,
          xp_per_level_increment = ?,
          xp_per_level_curve = ?,
          updated_at = ?
         WHERE guild_id = ?`,
        [enabled, cooldown, minXp, maxXp, minLen, voiceEnabled, voicePerMin, channelId, template, dm, formulaType, base, inc, curve, now, guildId]
      );
    } else {
      this.db.run(
        `INSERT INTO xp_guild_configs 
         (guild_id, enabled, cooldown_seconds, min_xp, max_xp, min_message_length, voice_xp_enabled, voice_xp_per_minute, level_up_channel_id, level_up_message_template, level_up_dm, formula_type, xp_per_level_base, xp_per_level_increment, xp_per_level_curve, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [guildId, enabled, cooldown, minXp, maxXp, minLen, voiceEnabled, voicePerMin, channelId, template, dm, formulaType, base, inc, curve, now]
      );
    }

    return this.getXpConfig(guildId);
  }
}

module.exports = {
  XpRepository
};
