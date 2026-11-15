class BotPresenceRepository {
  /**
   * @param {import('../connection').DatabaseManager} dbManager
   */
  constructor(dbManager) {
    this.db = dbManager;
  }

  getPresence() {
    const row = this.db.get('SELECT * FROM bot_presence_configs WHERE id = 1');
    if (!row) {
      return {
        botStatus: 'online',
        activityType: 'Custom',
        activityName: 'J.A.R.V.I.S | +ajuda',
        activityUrl: null
      };
    }

    return {
      botStatus: row.bot_status || 'online',
      activityType: row.activity_type || 'Custom',
      activityName: row.activity_name || 'J.A.R.V.I.S | +ajuda',
      activityUrl: row.activity_url || null,
      updatedAt: row.updated_at
    };
  }

  updatePresence({ botStatus, activityType, activityName, activityUrl }) {
    const current = this.getPresence();
    const newStatus = botStatus || current.botStatus || 'online';
    const newType = activityType || current.activityType || 'Custom';
    const newName = activityName !== undefined ? String(activityName).trim() : current.activityName;
    const newUrl = activityUrl !== undefined ? (activityUrl || null) : current.activityUrl;
    const now = new Date().toISOString();

    this.db.run(
      `INSERT INTO bot_presence_configs (id, bot_status, activity_type, activity_name, activity_url, updated_at)
       VALUES (1, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         bot_status = excluded.bot_status,
         activity_type = excluded.activity_type,
         activity_name = excluded.activity_name,
         activity_url = excluded.activity_url,
         updated_at = excluded.updated_at`,
      [newStatus, newType, newName, newUrl, now]
    );

    return this.getPresence();
  }
}

module.exports = { BotPresenceRepository };
