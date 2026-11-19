-- Migration 034: Isolated Per-Bot Administration Configs, Bot Memories, Bot Logs, and Persistent Channel Summaries

-- 1. Isolated Configuration per Bot Instance (18 Administrative Sections)
CREATE TABLE IF NOT EXISTS bot_instance_configs (
    bot_id TEXT PRIMARY KEY NOT NULL,
    prefix TEXT NOT NULL DEFAULT '+',
    ai_name TEXT NOT NULL DEFAULT 'J.A.R.V.I.S.',
    ai_model TEXT NOT NULL DEFAULT 'gemini-3.5-flash-lite',
    ai_temperature REAL NOT NULL DEFAULT 0.65,
    ai_humor_mode TEXT NOT NULL DEFAULT 'normal',
    ai_persona_role TEXT DEFAULT 'Assistente virtual inteligente de alta precisão',
    ai_persona_tone TEXT DEFAULT 'Educado, prestativo, analítico e direto',
    presence_status TEXT NOT NULL DEFAULT 'online',
    presence_activity_type TEXT NOT NULL DEFAULT 'Custom',
    presence_activity_text TEXT NOT NULL DEFAULT 'J.A.R.V.I.S | +ajuda',
    presence_activity_url TEXT DEFAULT '',
    modules_state_json TEXT NOT NULL DEFAULT '{}',
    commands_config_json TEXT NOT NULL DEFAULT '{}',
    moderation_config_json TEXT NOT NULL DEFAULT '{}',
    economy_xp_config_json TEXT NOT NULL DEFAULT '{}',
    music_config_json TEXT NOT NULL DEFAULT '{}',
    tickets_config_json TEXT NOT NULL DEFAULT '{}',
    social_config_json TEXT NOT NULL DEFAULT '{}',
    automations_config_json TEXT NOT NULL DEFAULT '{}',
    embeds_config_json TEXT NOT NULL DEFAULT '{}',
    permissions_config_json TEXT NOT NULL DEFAULT '{}',
    integrations_config_json TEXT NOT NULL DEFAULT '{}',
    advanced_config_json TEXT NOT NULL DEFAULT '{}',
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (bot_id) REFERENCES bot_instances(id) ON DELETE CASCADE
);

-- 2. Isolated AI Memories per Bot Instance
CREATE TABLE IF NOT EXISTS bot_instance_memories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    bot_id TEXT NOT NULL,
    guild_id TEXT NOT NULL DEFAULT 'GLOBAL',
    memory_key TEXT NOT NULL,
    memory_value TEXT NOT NULL,
    created_by TEXT DEFAULT 'web_admin',
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(bot_id, guild_id, memory_key),
    FOREIGN KEY (bot_id) REFERENCES bot_instances(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_bot_instance_memories ON bot_instance_memories(bot_id, guild_id);

-- 3. Isolated Logs & Errors per Bot Instance
CREATE TABLE IF NOT EXISTS bot_instance_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    bot_id TEXT NOT NULL,
    level TEXT NOT NULL DEFAULT 'INFO',
    category TEXT NOT NULL DEFAULT 'SYSTEM',
    message TEXT NOT NULL,
    details TEXT DEFAULT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (bot_id) REFERENCES bot_instances(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_bot_instance_logs ON bot_instance_logs(bot_id, created_at DESC);

-- 4. Persistent Intelligent Chat Summaries
CREATE TABLE IF NOT EXISTS channel_summaries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id TEXT NOT NULL,
    channel_id TEXT NOT NULL,
    channel_name TEXT NOT NULL DEFAULT 'chat',
    message_count INTEGER NOT NULL DEFAULT 0,
    summary_type TEXT NOT NULL DEFAULT 'summary',
    summary_text TEXT NOT NULL,
    participants_json TEXT DEFAULT '[]',
    created_by TEXT DEFAULT 'web_admin',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (guild_id) REFERENCES guilds(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_channel_summaries_guild ON channel_summaries(guild_id, created_at DESC);
