-- ========================================================
-- 002_ai_memory_tools.sql
-- AI Core, Memory Isolation, Server Notes & History
-- ========================================================

-- 1. Individual User Memory (Scoped by User and optional Guild)
CREATE TABLE IF NOT EXISTS ai_user_memories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id TEXT,
    user_id TEXT NOT NULL,
    key TEXT NOT NULL,
    value TEXT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (guild_id) REFERENCES guilds(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(guild_id, user_id, key)
);

-- 2. Shared Guild Memory (Server-wide context shared across members)
CREATE TABLE IF NOT EXISTS ai_guild_memories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id TEXT NOT NULL,
    key TEXT NOT NULL,
    value TEXT NOT NULL,
    created_by TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (guild_id) REFERENCES guilds(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    UNIQUE(guild_id, key)
);

-- 3. Permanent Server Notes and Rules (Static context for AI prompts)
CREATE TABLE IF NOT EXISTS guild_notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id TEXT NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    created_by TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (guild_id) REFERENCES guilds(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    UNIQUE(guild_id, title)
);

-- 4. Rolling Conversation History (Bounded multi-turn memory buffer)
CREATE TABLE IF NOT EXISTS ai_conversation_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id TEXT,
    channel_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    role TEXT NOT NULL, -- 'user', 'assistant', 'system', 'tool'
    content TEXT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_user_memories_lookup ON ai_user_memories(user_id, guild_id, key);
CREATE INDEX IF NOT EXISTS idx_guild_memories_lookup ON ai_guild_memories(guild_id, key);
CREATE INDEX IF NOT EXISTS idx_guild_notes_lookup ON guild_notes(guild_id);
CREATE INDEX IF NOT EXISTS idx_ai_history_channel ON ai_conversation_history(channel_id, id DESC);
