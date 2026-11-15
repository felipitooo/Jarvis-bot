-- ====================================================================
-- Migration: 023_custom_quiz_questions.sql
-- Description: Custom user-created quiz questions with answers, explanation and image
-- ====================================================================

CREATE TABLE IF NOT EXISTS custom_quiz_questions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  guild_id TEXT NOT NULL,
  author_id TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'geral',
  question TEXT NOT NULL,
  answers TEXT NOT NULL,
  explanation TEXT NOT NULL,
  image_url TEXT DEFAULT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  is_active INTEGER NOT NULL DEFAULT 1,
  FOREIGN KEY (guild_id) REFERENCES guilds(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_custom_quiz_guild ON custom_quiz_questions(guild_id, is_active);
CREATE INDEX IF NOT EXISTS idx_custom_quiz_guild_cat ON custom_quiz_questions(guild_id, category, is_active);
