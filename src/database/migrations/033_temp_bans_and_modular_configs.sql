-- Migration 033: TempBans, Modular Guild Settings and Multi-Bot Instances
-- Fully persistent TempBans with automated background unban worker, 
-- per-guild toggles for all 26 modules, and multi-bot instance manager.

-- 1. Temp Bans Table
CREATE TABLE IF NOT EXISTS temp_bans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    moderator_id TEXT NOT NULL,
    reason TEXT NOT NULL,
    duration_seconds INTEGER NOT NULL,
    expires_at DATETIME NOT NULL,
    is_active INTEGER NOT NULL DEFAULT 1,
    unbanned_at DATETIME DEFAULT NULL,
    unban_reason TEXT DEFAULT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (guild_id) REFERENCES guilds(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_temp_bans_active ON temp_bans(guild_id, is_active, expires_at);
CREATE INDEX IF NOT EXISTS idx_temp_bans_user ON temp_bans(guild_id, user_id);

-- 2. Guild Modular Settings Table (26 Independent Switchable Modules)
CREATE TABLE IF NOT EXISTS guild_module_settings (
    guild_id TEXT NOT NULL,
    module_key TEXT NOT NULL,
    is_enabled INTEGER NOT NULL DEFAULT 1,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (guild_id, module_key),
    FOREIGN KEY (guild_id) REFERENCES guilds(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_guild_module_settings ON guild_module_settings(guild_id, module_key);

-- 3. Multi-Bot Manager Table (Optional Multiple Discord Bot Instances)
CREATE TABLE IF NOT EXISTS bot_instances (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    token TEXT NOT NULL,
    is_enabled INTEGER NOT NULL DEFAULT 1,
    assigned_modules TEXT DEFAULT NULL, -- JSON array of module keys or NULL for all
    allowed_guilds TEXT DEFAULT NULL,   -- JSON array of guild IDs or NULL for all
    status TEXT NOT NULL DEFAULT 'STOPPED', -- 'STOPPED', 'STARTING', 'ONLINE', 'ERROR'
    last_error TEXT DEFAULT NULL,
    memory_mb REAL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
