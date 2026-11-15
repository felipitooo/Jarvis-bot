-- ========================================================
-- 010_custom_progression_bot_presence.sql
-- Highly customizable XP progression, formulas & global bot presence
-- ========================================================

-- 1. Extended XP formulas & voice progression on xp_guild_configs
ALTER TABLE xp_guild_configs ADD COLUMN formula_type TEXT NOT NULL DEFAULT 'PROGRESSIVE';
ALTER TABLE xp_guild_configs ADD COLUMN xp_per_level_base INTEGER NOT NULL DEFAULT 100;
ALTER TABLE xp_guild_configs ADD COLUMN xp_per_level_increment INTEGER NOT NULL DEFAULT 50;
ALTER TABLE xp_guild_configs ADD COLUMN xp_per_level_curve INTEGER NOT NULL DEFAULT 5;
ALTER TABLE xp_guild_configs ADD COLUMN voice_xp_per_minute INTEGER NOT NULL DEFAULT 5;

-- 2. Global Bot Presence & Activity Configuration
CREATE TABLE IF NOT EXISTS bot_presence_configs (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    bot_status TEXT NOT NULL DEFAULT 'online',
    activity_type TEXT NOT NULL DEFAULT 'Custom',
    activity_name TEXT NOT NULL DEFAULT 'J.A.R.V.I.S | +ajuda',
    activity_url TEXT,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT OR IGNORE INTO bot_presence_configs (id, bot_status, activity_type, activity_name, updated_at)
VALUES (1, 'online', 'Custom', 'J.A.R.V.I.S | +ajuda', CURRENT_TIMESTAMP);
