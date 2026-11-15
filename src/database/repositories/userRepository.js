class UserRepository {
  /**
   * @param {import('../connection').DatabaseManager} dbManager
   */
  constructor(dbManager) {
    this.db = dbManager;
  }

  upsertUser({ id, username }) {
    const existing = this.getUser(id);
    const now = new Date().toISOString();

    if (existing) {
      this.db.run(
        'UPDATE users SET username = ?, updated_at = ? WHERE id = ?',
        [username, now, id]
      );
      return this.getUser(id);
    }

    this.db.run(
      'INSERT INTO users (id, username, created_at, updated_at) VALUES (?, ?, ?, ?)',
      [id, username, now, now]
    );

    return this.getUser(id);
  }

  getUser(id) {
    return this.db.get('SELECT * FROM users WHERE id = ?', [id]);
  }

  upsertMemberProfile({ guildId, userId, nickname = null, joinedAt = null }) {
    const existing = this.getMemberProfile(guildId, userId);
    const now = new Date().toISOString();

    if (existing) {
      this.db.run(
        `UPDATE member_profiles 
         SET nickname = ?, updated_at = ?
         WHERE guild_id = ? AND user_id = ?`,
        [nickname, now, guildId, userId]
      );
      return this.getMemberProfile(guildId, userId);
    }

    this.db.run(
      `INSERT INTO member_profiles (guild_id, user_id, nickname, joined_at, updated_at)
       VALUES (?, ?, ?, ?, ?)`,
      [guildId, userId, nickname, joinedAt || now, now]
    );

    return this.getMemberProfile(guildId, userId);
  }

  getMemberProfile(guildId, userId) {
    return this.db.get(
      'SELECT * FROM member_profiles WHERE guild_id = ? AND user_id = ?',
      [guildId, userId]
    );
  }
}

module.exports = {
  UserRepository
};
