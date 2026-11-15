class ProtectionRepository {
  /**
   * @param {import('../connection').DatabaseManager} dbManager
   */
  constructor(dbManager) {
    this.db = dbManager;
  }

  addProtectedResource({ guildId, resourceType, resourceId, reason = null }) {
    const cleanType = resourceType.toUpperCase();
    const existing = this.isProtected(guildId, cleanType, resourceId);
    const now = new Date().toISOString();

    if (existing) {
      this.db.run(
        `UPDATE protected_resources SET reason = ? WHERE guild_id = ? AND resource_type = ? AND resource_id = ?`,
        [reason, guildId, cleanType, resourceId]
      );
      return { guildId, resourceType: cleanType, resourceId, reason };
    }

    this.db.run(
      `INSERT INTO protected_resources (guild_id, resource_type, resource_id, reason, created_at)
       VALUES (?, ?, ?, ?, ?)`,
      [guildId, cleanType, resourceId, reason, now]
    );

    return { guildId, resourceType: cleanType, resourceId, reason, createdAt: now };
  }

  isProtected(guildId, resourceType, resourceId) {
    const row = this.db.get(
      'SELECT * FROM protected_resources WHERE guild_id = ? AND resource_type = ? AND resource_id = ?',
      [guildId, resourceType.toUpperCase(), resourceId]
    );
    return Boolean(row);
  }

  removeProtectedResource(guildId, resourceType, resourceId) {
    const result = this.db.run(
      'DELETE FROM protected_resources WHERE guild_id = ? AND resource_type = ? AND resource_id = ?',
      [guildId, resourceType.toUpperCase(), resourceId]
    );
    return result.changes > 0;
  }

  listProtectedResources(guildId) {
    return this.db.all(
      'SELECT * FROM protected_resources WHERE guild_id = ? ORDER BY resource_type ASC',
      [guildId]
    );
  }
}

module.exports = {
  ProtectionRepository
};
