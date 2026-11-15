-- ========================================================
-- 003_admin_security.sql
-- Server Administration, Hierarchy, Backups & Lockdown
-- ========================================================

-- 1. Structural Backups (Roles, channels, categories, permissions)
CREATE TABLE IF NOT EXISTS guild_backups (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id TEXT NOT NULL,
    backup_name TEXT NOT NULL,
    created_by TEXT,
    structure_json TEXT NOT NULL,
    checksum TEXT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (guild_id) REFERENCES guilds(id) ON DELETE CASCADE
);

-- 2. Protected Resources (Critical roles and channels protected from accidental deletion)
CREATE TABLE IF NOT EXISTS protected_resources (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id TEXT NOT NULL,
    resource_type TEXT NOT NULL, -- 'ROLE', 'CHANNEL'
    resource_id TEXT NOT NULL,
    reason TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (guild_id) REFERENCES guilds(id) ON DELETE CASCADE,
    UNIQUE(guild_id, resource_type, resource_id)
);

-- 3. Lockdown History & Active Quarantines
CREATE TABLE IF NOT EXISTS lockdown_states (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id TEXT NOT NULL,
    is_active INTEGER NOT NULL DEFAULT 1,
    initiated_by TEXT,
    reason TEXT,
    channels_affected_json TEXT NOT NULL, -- JSON snapshot of original overwrite permissions
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    reverted_at DATETIME,
    FOREIGN KEY (guild_id) REFERENCES guilds(id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_backups_guild ON guild_backups(guild_id, id DESC);
CREATE INDEX IF NOT EXISTS idx_protected_lookup ON protected_resources(guild_id, resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_lockdown_active ON lockdown_states(guild_id, is_active);
