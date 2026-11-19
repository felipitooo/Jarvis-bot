class CommunityRepository {
  /**
   * @param {import('../connection').DatabaseManager} dbManager
   */
  constructor(dbManager) {
    this.db = dbManager;
  }

  // ==========================================
  // 1. Welcome & Goodbye Configuration
  // ==========================================

  getWelcomeConfig(guildId) {
    const row = this.db.get(
      'SELECT * FROM community_welcome_configs WHERE guild_id = ?',
      [guildId]
    );

    if (!row) {
      return {
        guildId,
        welcomeEnabled: false,
        welcomeChannelId: null,
        welcomeMessage: 'Bem-vindo(a) ao {server}, {user}! Agora somos {members} membros! 🎉',
        goodbyeEnabled: false,
        goodbyeChannelId: null,
        goodbyeMessage: '{user} saiu do servidor. Agora somos {members} membros. 😢'
      };
    }

    return {
      guildId: row.guild_id,
      welcomeEnabled: Boolean(row.welcome_enabled),
      welcomeChannelId: row.welcome_channel_id,
      welcomeMessage: row.welcome_message,
      goodbyeEnabled: Boolean(row.goodbye_enabled),
      goodbyeChannelId: row.goodbye_channel_id,
      goodbyeMessage: row.goodbye_message
    };
  }

  upsertWelcomeConfig(guildId, config) {
    const current = this.getWelcomeConfig(guildId);
    const updated = { ...current, ...config };
    const now = new Date().toISOString();

    this.db.run(
      `INSERT INTO community_welcome_configs (
        guild_id, welcome_enabled, welcome_channel_id, welcome_message,
        goodbye_enabled, goodbye_channel_id, goodbye_message, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(guild_id) DO UPDATE SET
        welcome_enabled = excluded.welcome_enabled,
        welcome_channel_id = excluded.welcome_channel_id,
        welcome_message = excluded.welcome_message,
        goodbye_enabled = excluded.goodbye_enabled,
        goodbye_channel_id = excluded.goodbye_channel_id,
        goodbye_message = excluded.goodbye_message,
        updated_at = excluded.updated_at`,
      [
        guildId,
        updated.welcomeEnabled ? 1 : 0,
        updated.welcomeChannelId,
        updated.welcomeMessage,
        updated.goodbyeEnabled ? 1 : 0,
        updated.goodbyeChannelId,
        updated.goodbyeMessage,
        now
      ]
    );

    return updated;
  }

  // ==========================================
  // 2. AutoRoles
  // ==========================================

  getAutoRoles(guildId) {
    const rows = this.db.all(
      'SELECT role_id FROM community_autoroles WHERE guild_id = ? ORDER BY id ASC',
      [guildId]
    );
    return rows.map(r => r.role_id);
  }

  addAutoRole(guildId, roleId) {
    const now = new Date().toISOString();
    this.db.run(
      `INSERT OR IGNORE INTO community_autoroles (guild_id, role_id, created_at)
       VALUES (?, ?, ?)`,
      [guildId, roleId, now]
    );
    return this.getAutoRoles(guildId);
  }

  removeAutoRole(guildId, roleId) {
    this.db.run(
      'DELETE FROM community_autoroles WHERE guild_id = ? AND role_id = ?',
      [guildId, roleId]
    );
    return this.getAutoRoles(guildId);
  }

  setAutoRoles(guildId, roleIds = []) {
    this.db.run('DELETE FROM community_autoroles WHERE guild_id = ?', [guildId]);
    const now = new Date().toISOString();
    for (const roleId of roleIds) {
      if (roleId) {
        this.db.run(
          'INSERT OR IGNORE INTO community_autoroles (guild_id, role_id, created_at) VALUES (?, ?, ?)',
          [guildId, roleId, now]
        );
      }
    }
    return this.getAutoRoles(guildId);
  }

  // ==========================================
  // 3. Suggestions
  // ==========================================

  createSuggestion(guildId, { authorId, channelId = null, messageId = null, suggestion }) {
    const now = new Date().toISOString();
    const result = this.db.run(
      `INSERT INTO community_suggestions (guild_id, author_id, channel_id, message_id, suggestion, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 'PENDING', ?, ?)`,
      [guildId, authorId, channelId, messageId, suggestion, now, now]
    );

    return {
      id: result.lastInsertRowid,
      guildId,
      authorId,
      channelId,
      messageId,
      suggestion,
      status: 'PENDING',
      statusReason: null,
      moderatedBy: null,
      upvotes: 0,
      downvotes: 0,
      createdAt: now,
      updatedAt: now
    };
  }

  getSuggestion(guildId, suggestionId) {
    const row = this.db.get(
      'SELECT * FROM community_suggestions WHERE guild_id = ? AND id = ?',
      [guildId, suggestionId]
    );
    return row ? this.mapSuggestion(row) : null;
  }

  getSuggestions(guildId, { status = null, limit = 20, offset = 0 } = {}) {
    let sql = 'SELECT * FROM community_suggestions WHERE guild_id = ?';
    const params = [guildId];

    if (status) {
      sql += ' AND status = ?';
      params.push(status);
    }

    sql += ' ORDER BY id DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const rows = this.db.all(sql, params);
    return rows.map(r => this.mapSuggestion(r));
  }

  moderateSuggestion(guildId, suggestionId, { status, reason = null, moderatedBy = null }) {
    const now = new Date().toISOString();
    this.db.run(
      `UPDATE community_suggestions
       SET status = ?, status_reason = ?, moderated_by = ?, updated_at = ?
       WHERE guild_id = ? AND id = ?`,
      [status, reason, moderatedBy, now, guildId, suggestionId]
    );

    return this.getSuggestion(guildId, suggestionId);
  }

  voteSuggestion(guildId, suggestionId, isUpvote) {
    const col = isUpvote ? 'upvotes' : 'downvotes';
    const now = new Date().toISOString();
    this.db.run(
      `UPDATE community_suggestions
       SET ${col} = ${col} + 1, updated_at = ?
       WHERE guild_id = ? AND id = ?`,
      [now, guildId, suggestionId]
    );

    return this.getSuggestion(guildId, suggestionId);
  }

  // ==========================================
  // 4. Starboard
  // ==========================================

  getStarboardConfig(guildId) {
    const row = this.db.get(
      'SELECT * FROM community_starboards WHERE guild_id = ?',
      [guildId]
    );

    if (!row) {
      return {
        guildId,
        starboardChannelId: null,
        starsRequired: 3,
        starboardEmoji: '⭐',
        isEnabled: true
      };
    }

    return {
      guildId: row.guild_id,
      starboardChannelId: row.starboard_channel_id,
      starsRequired: row.stars_required,
      starboardEmoji: row.starboard_emoji || '⭐',
      isEnabled: Boolean(row.is_enabled)
    };
  }

  upsertStarboardConfig(guildId, config) {
    const current = this.getStarboardConfig(guildId);
    const updated = { ...current, ...config };
    const now = new Date().toISOString();

    this.db.run(
      `INSERT INTO community_starboards (guild_id, starboard_channel_id, stars_required, starboard_emoji, is_enabled, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(guild_id) DO UPDATE SET
         starboard_channel_id = excluded.starboard_channel_id,
         stars_required = excluded.stars_required,
         starboard_emoji = excluded.starboard_emoji,
         is_enabled = excluded.is_enabled,
         updated_at = excluded.updated_at`,
      [
        guildId,
        updated.starboardChannelId,
        updated.starsRequired,
        updated.starboardEmoji || updated.emoji || '⭐',
        updated.isEnabled ? 1 : 0,
        now
      ]
    );

    return updated;
  }

  getStarredMessage(guildId, originalMessageId) {
    const row = this.db.get(
      'SELECT * FROM community_starred_messages WHERE guild_id = ? AND original_message_id = ?',
      [guildId, originalMessageId]
    );

    if (!row) return null;
    return {
      guildId: row.guild_id,
      originalMessageId: row.original_message_id,
      starboardMessageId: row.starboard_message_id,
      authorId: row.author_id,
      starCount: row.star_count,
      createdAt: row.created_at
    };
  }

  saveStarredMessage(guildId, { originalMessageId, starboardMessageId, authorId, starCount }) {
    const now = new Date().toISOString();
    this.db.run(
      `INSERT INTO community_starred_messages (guild_id, original_message_id, starboard_message_id, author_id, star_count, created_at)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(guild_id, original_message_id) DO UPDATE SET
         star_count = excluded.star_count`,
      [guildId, originalMessageId, starboardMessageId, authorId, starCount, now]
    );
  }

  mapSuggestion(row) {
    return {
      id: row.id,
      guildId: row.guild_id,
      authorId: row.author_id,
      channelId: row.channel_id,
      messageId: row.message_id,
      suggestion: row.suggestion,
      status: row.status,
      statusReason: row.status_reason,
      moderatedBy: row.moderated_by,
      upvotes: row.upvotes,
      downvotes: row.downvotes,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }
}

module.exports = { CommunityRepository };
