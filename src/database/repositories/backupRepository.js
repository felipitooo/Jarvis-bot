class BackupRepository {
  /**
   * @param {import('../connection').DatabaseManager} dbManager
   */
  constructor(dbManager) {
    this.db = dbManager;
  }

  createBackup({ guildId, backupName, createdBy = null, structureJson, checksum }) {
    const now = new Date().toISOString();
    const result = this.db.run(
      `INSERT INTO guild_backups (guild_id, backup_name, created_by, structure_json, checksum, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [guildId, backupName, createdBy, structureJson, checksum, now]
    );

    return {
      id: Number(result.lastInsertRowid),
      guildId,
      backupName,
      createdBy,
      checksum,
      createdAt: now
    };
  }

  getBackupById(id) {
    return this.db.get('SELECT * FROM guild_backups WHERE id = ?', [id]);
  }

  listBackups(guildId) {
    return this.db.all(
      'SELECT id, guild_id, backup_name, created_by, checksum, created_at FROM guild_backups WHERE guild_id = ? ORDER BY id DESC',
      [guildId]
    );
  }

  deleteBackup(id) {
    const result = this.db.run('DELETE FROM guild_backups WHERE id = ?', [id]);
    return result.changes > 0;
  }
}

module.exports = {
  BackupRepository
};
