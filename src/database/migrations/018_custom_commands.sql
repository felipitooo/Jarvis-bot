-- ========================================================
-- 018_custom_commands.sql
-- Custom Commands System with rich placeholders & embed support
-- ========================================================

CREATE TABLE IF NOT EXISTS custom_commands (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id TEXT NOT NULL,
    name TEXT NOT NULL,
    response TEXT NOT NULL,
    description TEXT DEFAULT 'Comando personalizado',
    creator_id TEXT NOT NULL,
    uses_count INTEGER NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(guild_id, name),
    FOREIGN KEY (guild_id) REFERENCES guilds(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_custom_commands_guild_name ON custom_commands(guild_id, name);
CREATE INDEX IF NOT EXISTS idx_custom_commands_guild ON custom_commands(guild_id);
