class GuildRepository {
  /**
   * @param {import('../connection').DatabaseManager} dbManager
   */
  constructor(dbManager) {
    this.db = dbManager;
  }

  upsertGuild({ id, name, joinedAt = new Date().toISOString(), isActive = 1 }) {
    const existing = this.getGuild(id);
    const now = new Date().toISOString();

    if (existing) {
      this.db.run(
        `UPDATE guilds 
         SET name = ?, is_active = ?, updated_at = ?
         WHERE id = ?`,
        [name, isActive ? 1 : 0, now, id]
      );
      return this.getGuild(id);
    }

    this.db.run(
      `INSERT INTO guilds (id, name, joined_at, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, name, joinedAt, isActive ? 1 : 0, now, now]
    );

    return this.getGuild(id);
  }

  getGuild(id) {
    return this.db.get('SELECT * FROM guilds WHERE id = ?', [id]);
  }

  setGuildActive(id, isActive) {
    const now = new Date().toISOString();
    return this.db.run(
      `UPDATE guilds SET is_active = ?, updated_at = ? WHERE id = ?`,
      [isActive ? 1 : 0, now, id]
    );
  }

  listActiveGuilds() {
    return this.db.all('SELECT * FROM guilds WHERE is_active = 1 ORDER BY name ASC');
  }
}

module.exports = {
  GuildRepository
};
