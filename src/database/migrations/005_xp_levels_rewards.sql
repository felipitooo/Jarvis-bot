-- ========================================================
-- 005_xp_levels_rewards.sql
-- Experience Points, Level Progression, Multipliers & Rewards
-- ========================================================

-- 1. Member Experience Points & Levels per Guild
CREATE TABLE IF NOT EXISTS guild_member_xp (
    guild_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    total_xp INTEGER NOT NULL DEFAULT 0,
    current_level INTEGER NOT NULL DEFAULT 0,
    weekly_xp INTEGER NOT NULL DEFAULT 0,
    monthly_xp INTEGER NOT NULL DEFAULT 0,
    last_message_at DATETIME,
    last_voice_at DATETIME,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (guild_id, user_id),
    FOREIGN KEY (guild_id) REFERENCES guilds(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 2. Role Rewards per Level
CREATE TABLE IF NOT EXISTS xp_level_rewards (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id TEXT NOT NULL,
    level_required INTEGER NOT NULL,
    role_id TEXT NOT NULL,
    remove_previous_roles INTEGER NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (guild_id) REFERENCES guilds(id) ON DELETE CASCADE,
    UNIQUE(guild_id, level_required, role_id)
);

-- 3. Multipliers & Blocked Targets (Channels, Roles, Users)
CREATE TABLE IF NOT EXISTS xp_multipliers_exemptions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id TEXT NOT NULL,
    target_type TEXT NOT NULL, -- 'CHANNEL', 'ROLE', 'USER'
    target_id TEXT NOT NULL,
    multiplier REAL NOT NULL DEFAULT 1.0,
    is_blocked INTEGER NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (guild_id) REFERENCES guilds(id) ON DELETE CASCADE,
    UNIQUE(guild_id, target_type, target_id)
);

-- 4. Guild XP System Configuration
CREATE TABLE IF NOT EXISTS xp_guild_configs (
    guild_id TEXT PRIMARY KEY NOT NULL,
    enabled INTEGER NOT NULL DEFAULT 1,
    cooldown_seconds INTEGER NOT NULL DEFAULT 60,
    min_xp INTEGER NOT NULL DEFAULT 15,
    max_xp INTEGER NOT NULL DEFAULT 25,
    min_message_length INTEGER NOT NULL DEFAULT 5,
    voice_xp_enabled INTEGER NOT NULL DEFAULT 0,
    level_up_channel_id TEXT, -- NULL = notify in same channel
    level_up_message_template TEXT DEFAULT 'Parabéns {user}! Você avançou para o nível **{level}**!',
    level_up_dm INTEGER NOT NULL DEFAULT 0,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (guild_id) REFERENCES guilds(id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_member_xp_ranking ON guild_member_xp(guild_id, total_xp DESC);
CREATE INDEX IF NOT EXISTS idx_member_xp_weekly ON guild_member_xp(guild_id, weekly_xp DESC);
CREATE INDEX IF NOT EXISTS idx_member_xp_monthly ON guild_member_xp(guild_id, monthly_xp DESC);
CREATE INDEX IF NOT EXISTS idx_xp_rewards_level ON xp_level_rewards(guild_id, level_required ASC);
