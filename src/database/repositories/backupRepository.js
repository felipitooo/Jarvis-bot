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
    const rows = this.db.all(
      'SELECT id, guild_id, backup_name, created_by, checksum, structure_json, created_at FROM guild_backups WHERE guild_id = ? ORDER BY id DESC',
      [guildId]
    ) || [];

    return rows.map(r => {
      let channelsCount = 0;
      let rolesCount = 0;
      try {
        if (r.structure_json) {
          const parsed = JSON.parse(r.structure_json);
          channelsCount = parsed.counts?.channels ?? (Array.isArray(parsed.channels) ? parsed.channels.length : 0);
          rolesCount = parsed.counts?.roles ?? (Array.isArray(parsed.roles) ? parsed.roles.length : 0);
        }
      } catch {}
      return {
        id: r.id,
        backup_id: r.id,
        guild_id: r.guild_id,
        backup_name: r.backup_name,
        name: r.backup_name,
        created_by: r.created_by,
        checksum: r.checksum,
        channels_count: channelsCount,
        roles_count: rolesCount,
        created_at: r.created_at
      };
    });
  }

  deleteBackup(id) {
    const result = this.db.run('DELETE FROM guild_backups WHERE id = ?', [id]);
    return result.changes > 0;
  }
}

module.exports = {
  BackupRepository
};
