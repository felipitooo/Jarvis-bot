class CustomCommandRepository {
  /**
   * @param {import('../connection').DatabaseManager} dbManager
   */
  constructor(dbManager) {
    this.db = dbManager;
  }

  createCommand(guildId, {
    name,
    response,
    description = 'Comando personalizado',
    creatorId,
    customPrefix = null,
    requirePrefix = 1,
    matchMode = 'starts_with'
  }) {
    const cleanName = String(name).toLowerCase().trim();
    const now = new Date().toISOString();
    const prefixVal = customPrefix ? String(customPrefix).trim().slice(0, 5) : null;
    const reqPrefVal = (requirePrefix === false || requirePrefix === 0 || requirePrefix === '0' || requirePrefix === 'false') ? 0 : 1;
    const cleanMatch = ['starts_with', 'contains', 'exact'].includes(matchMode) ? matchMode : 'starts_with';

    this.db.run(
      `INSERT INTO custom_commands (
        guild_id, name, response, description, creator_id,
        custom_prefix, require_prefix, match_mode, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [guildId, cleanName, response, description, creatorId, prefixVal, reqPrefVal, cleanMatch, now, now]
    );

    return this.getCommand(guildId, cleanName);
  }

  getCommand(guildId, name) {
    const cleanName = String(name).toLowerCase().trim();
    return this.db.get(
      'SELECT * FROM custom_commands WHERE guild_id = ? AND name = ?',
      [guildId, cleanName]
    );
  }

  updateCommand(guildId, name, {
    newName = null,
    response = null,
    description = null,
    customPrefix = undefined,
    requirePrefix = undefined,
    matchMode = undefined
  }) {
    const cleanName = String(name).toLowerCase().trim();
    const current = this.getCommand(guildId, cleanName);
    if (!current) return null;

    const targetName = (newName && String(newName).trim())
      ? String(newName).toLowerCase().trim()
      : cleanName;

    if (targetName !== cleanName) {
      const conflict = this.getCommand(guildId, targetName);
      if (conflict) {
        throw new Error(`Já existe um comando personalizado com o nome "${targetName}".`);
      }
    }

    const newResponse = response !== null && response !== undefined ? response : current.response;
    const newDesc = description !== null && description !== undefined ? description : current.description;
    const newPrefix = customPrefix !== undefined ? (customPrefix ? String(customPrefix).trim().slice(0, 5) : null) : current.custom_prefix;
    const newReqPref = requirePrefix !== undefined ? ((requirePrefix === false || requirePrefix === 0 || requirePrefix === '0' || requirePrefix === 'false') ? 0 : 1) : current.require_prefix;
    const newMatch = matchMode !== undefined ? (['starts_with', 'contains', 'exact'].includes(matchMode) ? matchMode : 'starts_with') : current.match_mode;
    const now = new Date().toISOString();

    this.db.run(
      `UPDATE custom_commands 
       SET name = ?, response = ?, description = ?, custom_prefix = ?, require_prefix = ?, match_mode = ?, updated_at = ?
       WHERE guild_id = ? AND name = ?`,
      [targetName, newResponse, newDesc, newPrefix, newReqPref, newMatch, now, guildId, cleanName]
    );

    return this.getCommand(guildId, targetName);
  }

  deleteCommand(guildId, name) {
    const cleanName = String(name).toLowerCase().trim();
    const result = this.db.run(
      'DELETE FROM custom_commands WHERE guild_id = ? AND name = ?',
      [guildId, cleanName]
    );
    return result.changes > 0;
  }

  listCommands(guildId, limit = 100, offset = 0) {
    return this.db.all(
      `SELECT * FROM custom_commands 
       WHERE guild_id = ? 
       ORDER BY name ASC 
       LIMIT ? OFFSET ?`,
      [guildId, limit, offset]
    );
  }

  countCommands(guildId) {
    const row = this.db.get(
      'SELECT COUNT(*) as count FROM custom_commands WHERE guild_id = ?',
      [guildId]
    );
    return row ? row.count : 0;
  }

  incrementUses(guildId, name) {
    const cleanName = String(name).toLowerCase().trim();
    this.db.run(
      'UPDATE custom_commands SET uses_count = uses_count + 1 WHERE guild_id = ? AND name = ?',
      [guildId, cleanName]
    );
  }
}

module.exports = {
  CustomCommandRepository
};
