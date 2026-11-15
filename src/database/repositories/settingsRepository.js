class SettingsRepository {
  /**
   * @param {import('../connection').DatabaseManager} dbManager
   */
  constructor(dbManager) {
    this.db = dbManager;
  }

  getSetting(guildId, key) {
    const row = this.db.get(
      'SELECT value, updated_at FROM guild_settings WHERE guild_id = ? AND key = ?',
      [guildId, key]
    );
    return row ? row.value : null;
  }

  setSetting(guildId, key, value) {
    const stringValue = typeof value === 'object' && value !== null ? JSON.stringify(value) : String(value);
    const now = new Date().toISOString();

    const existing = this.getSetting(guildId, key);

    if (existing !== null) {
      this.db.run(
        'UPDATE guild_settings SET value = ?, updated_at = ? WHERE guild_id = ? AND key = ?',
        [stringValue, now, guildId, key]
      );
    } else {
      this.db.run(
        'INSERT INTO guild_settings (guild_id, key, value, updated_at) VALUES (?, ?, ?, ?)',
        [guildId, key, stringValue, now]
      );
    }

    return stringValue;
  }

  deleteSetting(guildId, key) {
    const result = this.db.run(
      'DELETE FROM guild_settings WHERE guild_id = ? AND key = ?',
      [guildId, key]
    );
    return result.changes > 0;
  }

  getAllSettings(guildId) {
    const rows = this.db.all(
      'SELECT key, value, updated_at FROM guild_settings WHERE guild_id = ?',
      [guildId]
    );

    const settings = {};
    for (const row of rows) {
      settings[row.key] = row.value;
    }
    return settings;
  }
}

module.exports = {
  SettingsRepository
};
