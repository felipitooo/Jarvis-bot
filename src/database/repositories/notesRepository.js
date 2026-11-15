class NotesRepository {
  /**
   * @param {import('../connection').DatabaseManager} dbManager
   */
  constructor(dbManager) {
    this.db = dbManager;
  }

  saveNote({ guildId, title, content, createdBy = null }) {
    const existing = this.getNote(guildId, title);
    const now = new Date().toISOString();

    if (existing) {
      this.db.run(
        `UPDATE guild_notes 
         SET content = ?, updated_at = ?
         WHERE guild_id = ? AND title = ?`,
        [content, now, guildId, title]
      );
      return this.getNote(guildId, title);
    }

    this.db.run(
      `INSERT INTO guild_notes (guild_id, title, content, created_by, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [guildId, title, content, createdBy, now, now]
    );

    return this.getNote(guildId, title);
  }

  getNote(guildId, title) {
    return this.db.get(
      'SELECT * FROM guild_notes WHERE guild_id = ? AND title = ?',
      [guildId, title]
    );
  }

  listNotes(guildId) {
    return this.db.all(
      'SELECT * FROM guild_notes WHERE guild_id = ? ORDER BY title ASC',
      [guildId]
    );
  }

  deleteNote(guildId, title) {
    const result = this.db.run(
      'DELETE FROM guild_notes WHERE guild_id = ? AND title = ?',
      [guildId, title]
    );
    return result.changes > 0;
  }
}

module.exports = {
  NotesRepository
};
