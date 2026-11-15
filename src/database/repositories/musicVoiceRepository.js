class MusicVoiceRepository {
  /**
   * @param {import('../connection').DatabaseManager} dbManager
   */
  constructor(dbManager) {
    this.db = dbManager;
  }

  // ==========================================
  // 1. Music & Voice Configuration
  // ==========================================

  getMusicConfig(guildId) {
    const row = this.db.get(
      'SELECT * FROM music_guild_configs WHERE guild_id = ?',
      [guildId]
    );

    if (!row) {
      return {
        guildId,
        djRoleId: null,
        defaultVolume: 80,
        maxQueueSize: 100,
        allowDuplicateTracks: true,
        ttsEnabled: true,
        ttsLanguage: 'pt-BR',
        ttsVoice: 'standard',
        autoDisconnectMinutes: 5,
        allowedTextChannelId: null,
        allowedVoiceChannelId: null
      };
    }

    return {
      guildId: row.guild_id,
      djRoleId: row.dj_role_id,
      defaultVolume: row.default_volume,
      maxQueueSize: row.max_queue_size,
      allowDuplicateTracks: Boolean(row.allow_duplicate_tracks),
      ttsEnabled: Boolean(row.tts_enabled),
      ttsLanguage: row.tts_language,
      ttsVoice: row.tts_voice,
      autoDisconnectMinutes: row.auto_disconnect_minutes,
      allowedTextChannelId: row.allowed_text_channel_id || null,
      allowedVoiceChannelId: row.allowed_voice_channel_id || null
    };
  }

  upsertMusicConfig(guildId, config) {
    const current = this.getMusicConfig(guildId);
    const updated = { ...current, ...config };
    const now = new Date().toISOString();

    this.db.run(
      `INSERT INTO music_guild_configs (
        guild_id, dj_role_id, default_volume, max_queue_size, allow_duplicate_tracks,
        tts_enabled, tts_language, tts_voice, auto_disconnect_minutes, allowed_text_channel_id,
        allowed_voice_channel_id, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(guild_id) DO UPDATE SET
        dj_role_id = excluded.dj_role_id,
        default_volume = excluded.default_volume,
        max_queue_size = excluded.max_queue_size,
        allow_duplicate_tracks = excluded.allow_duplicate_tracks,
        tts_enabled = excluded.tts_enabled,
        tts_language = excluded.tts_language,
        tts_voice = excluded.tts_voice,
        auto_disconnect_minutes = excluded.auto_disconnect_minutes,
        allowed_text_channel_id = excluded.allowed_text_channel_id,
        allowed_voice_channel_id = excluded.allowed_voice_channel_id,
        updated_at = excluded.updated_at`,
      [
        guildId,
        updated.djRoleId,
        updated.defaultVolume,
        updated.maxQueueSize,
        updated.allowDuplicateTracks ? 1 : 0,
        updated.ttsEnabled ? 1 : 0,
        updated.ttsLanguage,
        updated.ttsVoice,
        updated.autoDisconnectMinutes,
        updated.allowedTextChannelId || null,
        updated.allowedVoiceChannelId || null,
        now
      ]
    );

    return updated;
  }

  // ==========================================
  // 2. Social & Fun Configuration
  // ==========================================

  getSocialConfig(guildId) {
    const row = this.db.get(
      'SELECT * FROM social_guild_configs WHERE guild_id = ?',
      [guildId]
    );

    if (!row) {
      return {
        guildId,
        funCommandsEnabled: true,
        shippingEnabled: true,
        marriageEnabled: true,
        marriageCost: 5000,
        gifsEnabled: true
      };
    }

    return {
      guildId: row.guild_id,
      funCommandsEnabled: Boolean(row.fun_commands_enabled),
      shippingEnabled: Boolean(row.shipping_enabled),
      marriageEnabled: Boolean(row.marriage_enabled),
      marriageCost: row.marriage_cost !== undefined && row.marriage_cost !== null ? Number(row.marriage_cost) : 5000,
      gifsEnabled: Boolean(row.gifs_enabled)
    };
  }

  upsertSocialConfig(guildId, config) {
    const current = this.getSocialConfig(guildId);
    const updated = { ...current, ...config };
    const now = new Date().toISOString();

    this.db.run(
      `INSERT INTO social_guild_configs (
        guild_id, fun_commands_enabled, shipping_enabled, marriage_enabled, marriage_cost, gifs_enabled, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(guild_id) DO UPDATE SET
        fun_commands_enabled = excluded.fun_commands_enabled,
        shipping_enabled = excluded.shipping_enabled,
        marriage_enabled = excluded.marriage_enabled,
        marriage_cost = excluded.marriage_cost,
        gifs_enabled = excluded.gifs_enabled,
        updated_at = excluded.updated_at`,
      [
        guildId,
        updated.funCommandsEnabled ? 1 : 0,
        updated.shippingEnabled ? 1 : 0,
        updated.marriageEnabled ? 1 : 0,
        Number(updated.marriageCost) >= 0 ? Number(updated.marriageCost) : 5000,
        updated.gifsEnabled ? 1 : 0,
        now
      ]
    );

    return updated;
  }

  // ==========================================
  // 3. Social Marriages & Relationships
  // ==========================================

  createMarriage(guildId, user1Id, user2Id, ringCost = 0) {
    const now = new Date().toISOString();
    const result = this.db.run(
      `INSERT INTO social_marriages (guild_id, user1_id, user2_id, married_at, status, ring_cost)
       VALUES (?, ?, ?, ?, 'ACTIVE', ?)`,
      [guildId, user1Id, user2Id, now, Number(ringCost) || 0]
    );

    return {
      id: result.lastInsertRowid,
      guildId,
      user1Id,
      user2Id,
      ringCost: Number(ringCost) || 0,
      marriedAt: now,
      status: 'ACTIVE'
    };
  }

  getActiveMarriage(guildId, userId) {
    const row = this.db.get(
      `SELECT * FROM social_marriages
       WHERE guild_id = ? AND status = 'ACTIVE' AND (user1_id = ? OR user2_id = ?)`,
      [guildId, userId, userId]
    );

    if (!row) return null;

    const spouseId = row.user1_id === userId ? row.user2_id : row.user1_id;

    return {
      id: row.id,
      guildId: row.guild_id,
      user1Id: row.user1_id,
      user2Id: row.user2_id,
      userId,
      spouseId,
      ringCost: row.ring_cost || 0,
      marriedAt: row.married_at,
      status: row.status
    };
  }

  divorce(guildId, userId) {
    const marriage = this.getActiveMarriage(guildId, userId);
    if (!marriage) return null;

    const now = new Date().toISOString();
    this.db.run(
      `UPDATE social_marriages
       SET status = 'DIVORCED', divorced_at = ?
       WHERE id = ?`,
      [now, marriage.id]
    );

    return {
      ...marriage,
      status: 'DIVORCED',
      divorcedAt: now
    };
  }

  getMarriageHistory(guildId, userId) {
    const rows = this.db.all(
      `SELECT * FROM social_marriages
       WHERE guild_id = ? AND (user1_id = ? OR user2_id = ?)
       ORDER BY id DESC`,
      [guildId, userId, userId]
    );

    return rows.map(r => ({
      id: r.id,
      guildId: r.guild_id,
      user1Id: r.user1_id,
      user2Id: r.user2_id,
      spouseId: r.user1_id === userId ? r.user2_id : r.user1_id,
      marriedAt: r.married_at,
      status: r.status,
      divorcedAt: r.divorced_at
    }));
  }

  // ==========================================
  // 3. User Social Profiles & Kiss Tracking
  // ==========================================

  getUserSocialProfile(userId) {
    if (!userId) return { userId: null, gender: 'ANY', kissOrientation: 'ANY' };
    const row = this.db.get(
      'SELECT * FROM user_social_profiles WHERE user_id = ?',
      [userId]
    );
    if (!row) {
      return {
        userId,
        gender: 'ANY',
        kissOrientation: 'ANY',
        updatedAt: null
      };
    }
    return {
      userId: row.user_id,
      gender: row.gender || 'ANY',
      kissOrientation: row.kiss_orientation || 'ANY',
      updatedAt: row.updated_at
    };
  }

  upsertUserSocialProfile(userId, { gender = 'ANY', kissOrientation = 'ANY' }) {
    if (!userId) return null;
    const now = new Date().toISOString();
    const cleanGender = String(gender).toUpperCase();
    const cleanOrientation = String(kissOrientation).toUpperCase();

    this.db.run(
      `INSERT INTO user_social_profiles (user_id, gender, kiss_orientation, updated_at)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(user_id) DO UPDATE SET
         gender = excluded.gender,
         kiss_orientation = excluded.kiss_orientation,
         updated_at = excluded.updated_at`,
      [userId, cleanGender, cleanOrientation, now]
    );

    return this.getUserSocialProfile(userId);
  }

  _normalizePair(u1, u2) {
    return [u1, u2].sort((a, b) => a.localeCompare(b));
  }

  getPairKissCount(guildId, userA, userB) {
    const [p1, p2] = this._normalizePair(String(userA), String(userB));
    const row = this.db.get(
      `SELECT kiss_count FROM social_kiss_counters
       WHERE guild_id = ? AND user1_id = ? AND user2_id = ?`,
      [guildId, p1, p2]
    );
    return row ? Number(row.kiss_count) : 0;
  }

  incrementPairKissCount(guildId, userA, userB) {
    const [p1, p2] = this._normalizePair(String(userA), String(userB));
    const now = new Date().toISOString();

    this.db.run(
      `INSERT INTO social_kiss_counters (guild_id, user1_id, user2_id, kiss_count, last_kiss_at)
       VALUES (?, ?, ?, 1, ?)
       ON CONFLICT(guild_id, user1_id, user2_id) DO UPDATE SET
         kiss_count = social_kiss_counters.kiss_count + 1,
         last_kiss_at = excluded.last_kiss_at`,
      [guildId, p1, p2, now]
    );

    return this.getPairKissCount(guildId, userA, userB);
  }

  getPairHugCount(guildId, userA, userB) {
    const [p1, p2] = this._normalizePair(String(userA), String(userB));
    const row = this.db.get(
      `SELECT hug_count FROM social_hug_counters
       WHERE guild_id = ? AND user_a = ? AND user_b = ?`,
      [guildId, p1, p2]
    );
    return row ? Number(row.hug_count) : 0;
  }

  incrementPairHugCount(guildId, userA, userB) {
    const [p1, p2] = this._normalizePair(String(userA), String(userB));
    const now = new Date().toISOString();

    this.db.run(
      `INSERT INTO social_hug_counters (guild_id, user_a, user_b, hug_count, last_hug_at)
       VALUES (?, ?, ?, 1, ?)
       ON CONFLICT(guild_id, user_a, user_b) DO UPDATE SET
         hug_count = social_hug_counters.hug_count + 1,
         last_hug_at = excluded.last_hug_at`,
      [guildId, p1, p2, now]
    );

    return this.getPairHugCount(guildId, userA, userB);
  }
}

module.exports = { MusicVoiceRepository };
