-- ========================================================
-- 004_moderation_logs.sql
-- Punishments, Warn Escalation, Log Channels & Anti-Abuse
-- ========================================================

-- 1. Disciplinary Punishments History
CREATE TABLE IF NOT EXISTS moderation_punishments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id TEXT NOT NULL,
    target_id TEXT NOT NULL,
    actor_id TEXT NOT NULL,
    type TEXT NOT NULL, -- 'BAN', 'UNBAN', 'KICK', 'WARN', 'TIMEOUT', 'UNTIMEOUT', 'VOICE_MUTE', 'VOICE_UNMUTE'
    reason TEXT,
    duration_seconds INTEGER,
    evidence_url TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME,
    is_active INTEGER NOT NULL DEFAULT 1,
    FOREIGN KEY (guild_id) REFERENCES guilds(id) ON DELETE CASCADE
);

-- 2. Configurable Warn Escalation Rules
CREATE TABLE IF NOT EXISTS warn_escalation_rules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id TEXT NOT NULL,
    threshold_warns INTEGER NOT NULL,
    action TEXT NOT NULL, -- 'TIMEOUT', 'KICK', 'BAN'
    duration_seconds INTEGER,
    window_days INTEGER DEFAULT 30,
    auto_apply INTEGER NOT NULL DEFAULT 1,
    exempt_role_ids TEXT, -- JSON array of role IDs
    priority INTEGER NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (guild_id) REFERENCES guilds(id) ON DELETE CASCADE
);

-- 3. Dedicated Log Channels per Category
CREATE TABLE IF NOT EXISTS moderation_log_channels (
    guild_id TEXT NOT NULL,
    category TEXT NOT NULL, -- 'PUNISHMENTS', 'MEMBERS', 'CHANNELS', 'ROLES', 'MESSAGES'
    channel_id TEXT NOT NULL,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (guild_id, category),
    FOREIGN KEY (guild_id) REFERENCES guilds(id) ON DELETE CASCADE
);

-- 4. Anti-Abuse, Anti-Spam & Anti-Flood Configuration
CREATE TABLE IF NOT EXISTS anti_abuse_configs (
    guild_id TEXT PRIMARY KEY NOT NULL,
    anti_spam_enabled INTEGER NOT NULL DEFAULT 1,
    max_messages_per_interval INTEGER NOT NULL DEFAULT 5,
    interval_seconds INTEGER NOT NULL DEFAULT 5,
    anti_flood_duplicate_threshold INTEGER NOT NULL DEFAULT 3,
    anti_raid_enabled INTEGER NOT NULL DEFAULT 1,
    action_on_detection TEXT NOT NULL DEFAULT 'TIMEOUT', -- 'TIMEOUT', 'KICK'
    timeout_duration_seconds INTEGER NOT NULL DEFAULT 300,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (guild_id) REFERENCES guilds(id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_punishments_target ON moderation_punishments(guild_id, target_id, type, is_active);
CREATE INDEX IF NOT EXISTS idx_escalation_guild ON warn_escalation_rules(guild_id, threshold_warns);
