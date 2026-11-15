class MemoryRepository {
  /**
   * @param {import('../connection').DatabaseManager} dbManager
   */
  constructor(dbManager) {
    this.db = dbManager;
  }

  // ==========================================
  // 1. Individual User Memory
  // ==========================================

  saveUserMemory({ guildId = null, userId, key, value }) {
    if (!userId || !key) throw new Error('userId e key são obrigatórios para salvar memória do usuário.');
    try {
      this.db.run(
        `INSERT OR IGNORE INTO users (id, username) VALUES (?, ?)`,
        [userId, `user_${userId}`]
      );
    } catch {}

    const existing = this.getUserMemory(guildId, userId, key);
    const now = new Date().toISOString();

    if (existing) {
      if (guildId) {
        this.db.run(
          `UPDATE ai_user_memories 
           SET value = ?, updated_at = ?
           WHERE guild_id = ? AND user_id = ? AND key = ?`,
          [value, now, guildId, userId, key]
        );
      } else {
        this.db.run(
          `UPDATE ai_user_memories 
           SET value = ?, updated_at = ?
           WHERE guild_id IS NULL AND user_id = ? AND key = ?`,
          [value, now, userId, key]
        );
      }
      return this.getUserMemory(guildId, userId, key);
    }

    this.db.run(
      `INSERT INTO ai_user_memories (guild_id, user_id, key, value, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [guildId, userId, key, value, now, now]
    );

    return this.getUserMemory(guildId, userId, key);
  }

  getUserMemory(guildId, userId, key) {
    if (guildId) {
      return this.db.get(
        `SELECT * FROM ai_user_memories 
         WHERE guild_id = ? AND user_id = ? AND key = ?`,
        [guildId, userId, key]
      );
    }
    return this.db.get(
      `SELECT * FROM ai_user_memories 
       WHERE guild_id IS NULL AND user_id = ? AND key = ?`,
      [userId, key]
    );
  }

  listUserMemories(guildId, userId) {
    if (guildId) {
      return this.db.all(
        `SELECT * FROM ai_user_memories 
         WHERE guild_id = ? AND user_id = ? 
         ORDER BY updated_at DESC`,
        [guildId, userId]
      );
    }
    return this.db.all(
      `SELECT * FROM ai_user_memories 
       WHERE user_id = ? 
       ORDER BY updated_at DESC`,
      [userId]
    );
  }

  deleteUserMemory(guildId, userId, key) {
    let result;
    if (guildId) {
      result = this.db.run(
        `DELETE FROM ai_user_memories 
         WHERE guild_id = ? AND user_id = ? AND key = ?`,
        [guildId, userId, key]
      );
    } else {
      result = this.db.run(
        `DELETE FROM ai_user_memories 
         WHERE guild_id IS NULL AND user_id = ? AND key = ?`,
        [userId, key]
      );
    }
    return result.changes > 0;
  }

  // ==========================================
  // 2. Shared Guild Memory
  // ==========================================

  saveGuildMemory({ guildId, key, value, createdBy = null }) {
    let authorId = createdBy;
    if (authorId === 'bot' || authorId === 'system') {
      try {
        this.db.run(
          `INSERT OR IGNORE INTO users (id, username, created_at, updated_at) VALUES ('bot', 'J.A.R.V.I.S', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`
        );
        authorId = 'bot';
      } catch {}
    } else if (authorId) {
      try {
        const userExists = this.db.get('SELECT id FROM users WHERE id = ?', [authorId]);
        if (!userExists) {
          authorId = null;
        }
      } catch {
        authorId = null;
      }
    }

    const existing = this.getGuildMemory(guildId, key);
    const now = new Date().toISOString();

    if (existing) {
      this.db.run(
        `UPDATE ai_guild_memories 
         SET value = ?, created_by = COALESCE(?, created_by), updated_at = ?
         WHERE guild_id = ? AND key = ?`,
        [value, authorId, now, guildId, key]
      );
      return this.getGuildMemory(guildId, key);
    }

    this.db.run(
      `INSERT INTO ai_guild_memories (guild_id, key, value, created_by, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [guildId, key, value, authorId, now, now]
    );

    return this.getGuildMemory(guildId, key);
  }

  getGuildMemory(guildId, key) {
    return this.db.get(
      `SELECT * FROM ai_guild_memories WHERE guild_id = ? AND key = ?`,
      [guildId, key]
    );
  }

  listGuildMemories(guildId) {
    return this.db.all(
      `SELECT * FROM ai_guild_memories WHERE guild_id = ? ORDER BY updated_at DESC`,
      [guildId]
    );
  }

  /**
   * Initializes permanent core memories created by the bot itself for the guild.
   * Ensures the AI brain is grounded and the memories panel is never empty.
   * @param {string} guildId
   * @param {string} [guildName]
   * @returns {Array<object>}
   */
  ensureDefaultBotMemories(guildId, guildName = 'Servidor') {
    if (!guildId) return [];
    const existing = this.listGuildMemories(guildId);
    if (existing && existing.length > 0) {
      return existing;
    }

    const defaults = [
      {
        key: 'hierarquia_e_dono',
        value: 'O fundador, criador e proprietário deste servidor é o Lipe. O J.A.R.V.I.S sempre deve tratá-lo com máxima deferência, lealdade e respeito Stark em qualquer circunstância.',
        createdBy: 'bot'
      },
      {
        key: 'identidade_jarvis',
        value: `O J.A.R.V.I.S atua como o sistema de inteligência artificial central do ${guildName}, combinando polidez britânica, sarcasmo sutil, perspicácia analítica e prontidão Stark.`,
        createdBy: 'bot'
      },
      {
        key: 'diretrizes_servidor',
        value: 'A moderação preza pelo ambiente agradável. Membros podem abrir tickets para suporte e avaliar o atendimento da equipe através de notas de 1 a 5 estrelas.',
        createdBy: 'bot'
      },
      {
        key: 'protocolo_comunidade',
        value: 'Fomentar a resenha saudável, games, animes e interação divertida através de comandos de entretenimento, economia, quiz e música.',
        createdBy: 'bot'
      }
    ];

    for (const def of defaults) {
      this.saveGuildMemory({
        guildId,
        key: def.key,
        value: def.value,
        createdBy: def.createdBy
      });
    }

    return this.listGuildMemories(guildId);
  }

  deleteGuildMemory(guildId, key) {
    const result = this.db.run(
      `DELETE FROM ai_guild_memories WHERE guild_id = ? AND key = ?`,
      [guildId, key]
    );
    return result.changes > 0;
  }

  // ==========================================
  // 3. Rolling Conversation History
  // ==========================================

  addHistoryEntry({ guildId = null, channelId, userId, role, content }) {
    const now = new Date().toISOString();
    return this.db.run(
      `INSERT INTO ai_conversation_history (guild_id, channel_id, user_id, role, content, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [guildId, channelId, userId, role, content, now]
    );
  }

  getRecentHistory(channelId, limit = 10) {
    const rows = this.db.all(
      `SELECT role, content, user_id, created_at 
       FROM ai_conversation_history 
       WHERE channel_id = ? 
       ORDER BY id DESC 
       LIMIT ?`,
      [channelId, limit]
    );
    return rows.reverse();
  }

  clearHistory(channelId) {
    const result = this.db.run(
      `DELETE FROM ai_conversation_history WHERE channel_id = ?`,
      [channelId]
    );
    return result.changes;
  }
}

module.exports = {
  MemoryRepository
};
