-- Migration 036: Inter-Bot Communication Mesh, Shared Signals & Disciplinary Sync

CREATE TABLE IF NOT EXISTS inter_bot_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    packet_id TEXT NOT NULL UNIQUE,
    from_bot_id TEXT NOT NULL,
    from_bot_name TEXT NOT NULL,
    to_bot_id TEXT NOT NULL DEFAULT 'ALL',
    event_type TEXT NOT NULL, -- 'MODERATION_ACTION', 'MEMBER_MUTE_SYNC', 'DIRECT_SIGNAL', 'AI_INQUIRY', 'HEARTBEAT'
    guild_id TEXT,
    payload_json TEXT NOT NULL DEFAULT '{}',
    is_processed INTEGER NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_inter_bot_messages_to ON inter_bot_messages(to_bot_id, created_at);
CREATE INDEX IF NOT EXISTS idx_inter_bot_messages_guild ON inter_bot_messages(guild_id);
CREATE INDEX IF NOT EXISTS idx_inter_bot_messages_event ON inter_bot_messages(event_type);
