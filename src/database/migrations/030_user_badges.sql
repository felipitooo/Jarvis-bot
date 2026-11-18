-- Migration 030: User badges & achievements system

CREATE TABLE IF NOT EXISTS user_badges (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    badge_id TEXT NOT NULL,
    unlocked_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(guild_id, user_id, badge_id)
);

CREATE INDEX IF NOT EXISTS idx_user_badges_guild_user ON user_badges(guild_id, user_id);
