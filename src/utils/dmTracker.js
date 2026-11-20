/**
 * Persistent tracker for administrative DM messages sent from the dashboard
 * and capturing the member's responses (up to 2 replies).
 * Backed by both fast memory map and SQLite for 100% durability across restarts.
 */
class DmTracker {
  constructor() {
    /**
     * Map<userId, {
     *   id: string,
     *   guildId: string,
     *   adminId: string,
     *   adminUsername: string,
     *   sentText: string,
     *   sentAt: string,
     *   replies: Array<{ id: string, content: string, timestamp: string }>,
     *   maxReplies: number,
     *   status: 'waiting' | 'completed'
     * }>
     */
    this.sessions = new Map();
    this._tableReady = false;
  }

  _getDb() {
    try {
      const { dbManager } = require('../database/connection');
      if (!dbManager) return null;
      if (!this._tableReady) {
        dbManager.exec(`
          CREATE TABLE IF NOT EXISTS admin_dm_sessions (
            user_id TEXT PRIMARY KEY,
            guild_id TEXT,
            admin_id TEXT,
            admin_username TEXT,
            sent_text TEXT,
            sent_at TEXT,
            replies_json TEXT,
            max_replies INTEGER DEFAULT 2,
            status TEXT DEFAULT 'waiting',
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP
          );
        `);
        this._tableReady = true;
      }
      return dbManager;
    } catch {
      return null;
    }
  }

  /**
   * Registers an outbound direct message sent by an administrator via the bot
   * and prepares to capture the next 2 replies from the member.
   * @param {object} params
   * @param {string} params.userId
   * @param {string} [params.guildId]
   * @param {string} [params.adminId]
   * @param {string} [params.adminUsername]
   * @param {string} params.sentText
   * @returns {object}
   */
  registerOutboundDm({ userId, guildId = null, adminId = 'admin', adminUsername = 'Administrador', sentText = '', botId = 'PRIMARY' }) {
    if (!userId) return null;
    const session = {
      id: `dm_${userId}_${Date.now()}`,
      guildId: guildId || null,
      adminId: String(adminId),
      adminUsername: String(adminUsername),
      sentText: String(sentText || ''),
      sentAt: new Date().toISOString(),
      botId: String(botId || 'PRIMARY'),
      replies: [],
      maxReplies: 2,
      status: 'waiting'
    };
    this.sessions.set(String(userId), session);

    const db = this._getDb();
    if (db) {
      try {
        db.run(
          `INSERT INTO admin_dm_sessions (user_id, guild_id, admin_id, admin_username, sent_text, sent_at, replies_json, max_replies, status, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT(user_id) DO UPDATE SET
             guild_id = excluded.guild_id,
             admin_id = excluded.admin_id,
             admin_username = excluded.admin_username,
             sent_text = excluded.sent_text,
             sent_at = excluded.sent_at,
             replies_json = excluded.replies_json,
             max_replies = excluded.max_replies,
             status = excluded.status,
             updated_at = excluded.updated_at`,
          [
            String(userId),
            session.guildId,
            session.adminId,
            session.adminUsername,
            session.sentText,
            session.sentAt,
            JSON.stringify(session.replies),
            session.maxReplies,
            session.status,
            new Date().toISOString()
          ]
        );
      } catch {}
    }

    return session;
  }

  /**
   * Records a member's direct reply in their active DM tracking session.
   * @param {string} userId
   * @param {import('discord.js').Message|object} message
   * @returns {object|null}
   */
  recordReply(userId, message) {
    if (!userId) return null;
    let session = this.getSession(userId);
    if (!session) return null;

    if (session.replies.length < (session.maxReplies || 2)) {
      const content = message?.content || (message?.attachments?.size ? '(Anexo/Mídia enviada)' : '(Mensagem)');
      session.replies.push({
        id: message?.id || `reply_${Date.now()}_${session.replies.length + 1}`,
        content,
        timestamp: new Date().toISOString()
      });

      if (session.replies.length >= (session.maxReplies || 2)) {
        session.status = 'completed';
      }

      this.sessions.set(String(userId), session);

      const db = this._getDb();
      if (db) {
        try {
          db.run(
            `UPDATE admin_dm_sessions
             SET replies_json = ?, status = ?, updated_at = ?
             WHERE user_id = ?`,
            [
              JSON.stringify(session.replies),
              session.status,
              new Date().toISOString(),
              String(userId)
            ]
          );
        } catch {}
      }
    }
    return session;
  }

  /**
   * Checks whether the user has an active tracking session awaiting replies.
   * Silences the AI in DM while tracking is in progress.
   * @param {string} userId
   * @returns {boolean}
   */
  hasActiveSession(userId) {
    if (!userId) return false;
    const session = this.getSession(userId);
    return Boolean(session && session.status === 'waiting' && session.replies.length < (session.maxReplies || 2));
  }

  isMonitoringActive(userId) {
    return this.hasActiveSession(userId);
  }

  /**
   * Retrieves the current tracking session for a user (from memory or SQLite).
   * @param {string} userId
   * @param {string} [guildId]
   * @returns {object|null}
   */
  getSession(userId, guildId = null, botId = null) {
    if (!userId) return null;
    const uid = String(userId);
    let session = this.sessions.get(uid);

    if (!session) {
      const db = this._getDb();
      if (db) {
        try {
          const row = db.get(`SELECT * FROM admin_dm_sessions WHERE user_id = ?`, [uid]);
          if (row) {
            let replies = [];
            try { replies = JSON.parse(row.replies_json || '[]'); } catch {}
            session = {
              id: `dm_${row.user_id}`,
              guildId: row.guild_id,
              adminId: row.admin_id,
              adminUsername: row.admin_username,
              sentText: row.sent_text,
              sentAt: row.sent_at,
              botId: row.bot_id || 'PRIMARY',
              replies,
              maxReplies: row.max_replies || 2,
              status: row.status || 'waiting'
            };
            this.sessions.set(uid, session);
          }
        } catch {}
      }
    }

    if (session && guildId && session.guildId && String(session.guildId) !== String(guildId)) {
      return null;
    }
    if (session && botId && session.botId && botId !== 'all' && botId !== 'PRIMARY' && session.botId !== 'PRIMARY' && String(session.botId) !== String(botId)) {
      return null;
    }

    return session || null;
  }

  /**
   * Concludes/finalizes the tracking session so the AI can resume answering normally in DM.
   * @param {string} userId
   * @returns {object|null}
   */
  finishSession(userId) {
    if (!userId) return null;
    const session = this.getSession(userId);
    if (!session) return null;

    session.status = 'completed';
    this.sessions.set(String(userId), session);

    const db = this._getDb();
    if (db) {
      try {
        db.run(
          `UPDATE admin_dm_sessions SET status = 'completed', updated_at = ? WHERE user_id = ?`,
          [new Date().toISOString(), String(userId)]
        );
      } catch {}
    }
    return session;
  }

  /**
   * Clears the tracking session for a user.
   * @param {string} userId
   * @returns {boolean}
   */
  clearSession(userId) {
    if (!userId) return false;
    const uid = String(userId);
    this.sessions.delete(uid);

    const db = this._getDb();
    if (db) {
      try {
        db.run(`DELETE FROM admin_dm_sessions WHERE user_id = ?`, [uid]);
      } catch {}
    }
    return true;
  }
}

const dmTracker = new DmTracker();

module.exports = { DmTracker, dmTracker };
