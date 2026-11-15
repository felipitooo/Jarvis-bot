-- ========================================================
-- 014_casino_bets_and_music_restrictions.sql
-- Casino & Bets Configuration, Music Channel Restrictions,
-- and User Social Gender / Anime Kiss Tracking
-- ========================================================

-- 1. Casino & Bets Configuration per Guild
CREATE TABLE IF NOT EXISTS casino_guild_configs (
    guild_id TEXT PRIMARY KEY NOT NULL,
    blackjack_enabled INTEGER NOT NULL DEFAULT 1,
    blackjack_min INTEGER NOT NULL DEFAULT 50,
    blackjack_max INTEGER NOT NULL DEFAULT 50000,
    blackjack_payout REAL NOT NULL DEFAULT 1.5,
    slots_enabled INTEGER NOT NULL DEFAULT 1,
    slots_min INTEGER NOT NULL DEFAULT 10,
    slots_max INTEGER NOT NULL DEFAULT 25000,
    slots_multiplier_3x INTEGER NOT NULL DEFAULT 10,
    slots_multiplier_2x INTEGER NOT NULL DEFAULT 2,
    roulette_enabled INTEGER NOT NULL DEFAULT 1,
    roulette_min INTEGER NOT NULL DEFAULT 20,
    roulette_max INTEGER NOT NULL DEFAULT 50000,
    roulette_number_payout INTEGER NOT NULL DEFAULT 36,
    roulette_color_payout INTEGER NOT NULL DEFAULT 2,
    dice_enabled INTEGER NOT NULL DEFAULT 1,
    dice_min INTEGER NOT NULL DEFAULT 10,
    dice_max INTEGER NOT NULL DEFAULT 20000,
    dice_multiplier INTEGER NOT NULL DEFAULT 5,
    coinflip_enabled INTEGER NOT NULL DEFAULT 1,
    coinflip_min INTEGER NOT NULL DEFAULT 10,
    coinflip_max INTEGER NOT NULL DEFAULT 30000,
    coinflip_win_rate REAL NOT NULL DEFAULT 0.5,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (guild_id) REFERENCES guilds(id) ON DELETE CASCADE
);

-- 2. Add Music Channel Restriction Columns to music_guild_configs
ALTER TABLE music_guild_configs ADD COLUMN allowed_text_channel_id TEXT DEFAULT NULL;
ALTER TABLE music_guild_configs ADD COLUMN allowed_voice_channel_id TEXT DEFAULT NULL;

-- 3. User Social Profiles (Gender & Romance Preferences)
CREATE TABLE IF NOT EXISTS user_social_profiles (
    user_id TEXT PRIMARY KEY NOT NULL,
    gender TEXT NOT NULL DEFAULT 'ANY', -- 'MALE', 'FEMALE', 'NON_BINARY', 'ANY'
    kiss_orientation TEXT NOT NULL DEFAULT 'ANY', -- 'ANY', 'HETERO', 'YURI', 'YAOI'
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 4. Pair Kiss Interaction Counters
CREATE TABLE IF NOT EXISTS social_kiss_counters (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id TEXT NOT NULL,
    user1_id TEXT NOT NULL,
    user2_id TEXT NOT NULL,
    kiss_count INTEGER NOT NULL DEFAULT 1,
    last_kiss_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(guild_id, user1_id, user2_id)
);

CREATE INDEX IF NOT EXISTS idx_social_kiss_pair ON social_kiss_counters(guild_id, user1_id, user2_id);
