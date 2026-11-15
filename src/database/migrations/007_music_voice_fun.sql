-- ========================================================
-- 007_music_voice_fun.sql
-- Music Queue, Voice Sessions, DJ Permissions, TTS & Social Fun
-- ========================================================

-- 1. Music & Voice Guild Configuration
CREATE TABLE IF NOT EXISTS music_guild_configs (
    guild_id TEXT PRIMARY KEY NOT NULL,
    dj_role_id TEXT DEFAULT NULL,
    default_volume INTEGER NOT NULL DEFAULT 80,
    max_queue_size INTEGER NOT NULL DEFAULT 100,
    allow_duplicate_tracks INTEGER NOT NULL DEFAULT 1,
    tts_enabled INTEGER NOT NULL DEFAULT 1,
    tts_language TEXT NOT NULL DEFAULT 'pt-BR',
    tts_voice TEXT NOT NULL DEFAULT 'standard',
    auto_disconnect_minutes INTEGER NOT NULL DEFAULT 5,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (guild_id) REFERENCES guilds(id) ON DELETE CASCADE
);

-- 2. Social Marriages & Relationships (Loritta inspired)
CREATE TABLE IF NOT EXISTS social_marriages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id TEXT NOT NULL,
    user1_id TEXT NOT NULL,
    user2_id TEXT NOT NULL,
    married_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    status TEXT NOT NULL DEFAULT 'ACTIVE', -- 'ACTIVE', 'DIVORCED'
    divorced_at DATETIME DEFAULT NULL,
    FOREIGN KEY (guild_id) REFERENCES guilds(id) ON DELETE CASCADE,
    FOREIGN KEY (user1_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (user2_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 3. Social & Fun Configuration
CREATE TABLE IF NOT EXISTS social_guild_configs (
    guild_id TEXT PRIMARY KEY NOT NULL,
    fun_commands_enabled INTEGER NOT NULL DEFAULT 1,
    shipping_enabled INTEGER NOT NULL DEFAULT 1,
    marriage_enabled INTEGER NOT NULL DEFAULT 1,
    gifs_enabled INTEGER NOT NULL DEFAULT 1,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (guild_id) REFERENCES guilds(id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_social_marriages_guild ON social_marriages(guild_id, status);
CREATE INDEX IF NOT EXISTS idx_social_marriages_user1 ON social_marriages(guild_id, user1_id, status);
CREATE INDEX IF NOT EXISTS idx_social_marriages_user2 ON social_marriages(guild_id, user2_id, status);
