-- ========================================================
-- 001_initial_schema.sql
-- Foundation Schema for Unified Discord Bot (Cell)
-- ========================================================

-- Enable Foreign Keys enforcement
PRAGMA foreign_keys = ON;

-- 1. Guilds / Servers Table
CREATE TABLE IF NOT EXISTS guilds (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    joined_at DATETIME NOT NULL,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 2. Guild-Specific Settings (Multi-tenant isolation)
-- e.g. ai_display_name, locale, timezone, prefixes
CREATE TABLE IF NOT EXISTS guild_settings (
    guild_id TEXT NOT NULL,
    key TEXT NOT NULL,
    value TEXT NOT NULL,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (guild_id, key),
    FOREIGN KEY (guild_id) REFERENCES guilds(id) ON DELETE CASCADE
);

-- 3. Users Table (Global registry of Discord users interacted with)
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY NOT NULL,
    username TEXT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 4. Member Profiles per Server (Per-guild user data isolation)
CREATE TABLE IF NOT EXISTS member_profiles (
    guild_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    nickname TEXT,
    joined_at DATETIME,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (guild_id, user_id),
    FOREIGN KEY (guild_id) REFERENCES guilds(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 5. Role and Channel Configurations
-- (e.g. logging channels, admin roles, mod roles)
CREATE TABLE IF NOT EXISTS role_channel_configs (
    guild_id TEXT NOT NULL,
    config_type TEXT NOT NULL,
    target_id TEXT NOT NULL,
    metadata TEXT,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (guild_id, config_type, target_id),
    FOREIGN KEY (guild_id) REFERENCES guilds(id) ON DELETE CASCADE
);

-- 6. Audit Logs (Centralized security and configuration audit trail)
CREATE TABLE IF NOT EXISTS audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id TEXT,
    actor_id TEXT,
    action TEXT NOT NULL,
    target_id TEXT,
    details TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (guild_id) REFERENCES guilds(id) ON DELETE SET NULL
);

-- Indexes for performance and multi-tenant scoping
CREATE INDEX IF NOT EXISTS idx_guild_settings_guild ON guild_settings(guild_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_guild ON audit_logs(guild_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_role_channel_guild_type ON role_channel_configs(guild_id, config_type);
CREATE INDEX IF NOT EXISTS idx_member_profiles_guild ON member_profiles(guild_id);
