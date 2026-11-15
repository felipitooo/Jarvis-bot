-- ====================================================================
-- Migration: 024_custom_quiz_categories.sql
-- Description: Custom user-created quiz categories per guild
-- ====================================================================

CREATE TABLE IF NOT EXISTS custom_quiz_categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  guild_id TEXT NOT NULL,
  author_id TEXT NOT NULL,
  key TEXT NOT NULL,
  name TEXT NOT NULL,
  emoji TEXT NOT NULL DEFAULT '📁',
  color TEXT NOT NULL DEFAULT '#5865F2',
  description TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  is_active INTEGER NOT NULL DEFAULT 1,
  UNIQUE(guild_id, key),
  FOREIGN KEY (guild_id) REFERENCES guilds(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_custom_quiz_cat_guild ON custom_quiz_categories(guild_id, is_active);
CREATE INDEX IF NOT EXISTS idx_custom_quiz_cat_lookup ON custom_quiz_categories(guild_id, key, is_active);
