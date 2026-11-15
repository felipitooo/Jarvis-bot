-- ====================================================================
-- Migration: 015_social_hug_counters.sql
-- Description: Table for persistent pair hug counts between guild members
-- ====================================================================

CREATE TABLE IF NOT EXISTS social_hug_counters (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  guild_id TEXT NOT NULL,
  user_a TEXT NOT NULL,
  user_b TEXT NOT NULL,
  hug_count INTEGER NOT NULL DEFAULT 1,
  last_hug_at TEXT NOT NULL,
  FOREIGN KEY (guild_id) REFERENCES guilds(id) ON DELETE CASCADE,
  UNIQUE(guild_id, user_a, user_b)
);

CREATE INDEX IF NOT EXISTS idx_social_hug_guild_pair ON social_hug_counters(guild_id, user_a, user_b);
