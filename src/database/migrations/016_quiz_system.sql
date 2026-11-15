-- ====================================================================
-- Migration: 016_quiz_system.sql
-- Description: Tables for Quiz Arena leaderboard and guild configurations
-- ====================================================================

CREATE TABLE IF NOT EXISTS quiz_scores (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  guild_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  total_points INTEGER NOT NULL DEFAULT 0,
  total_correct INTEGER NOT NULL DEFAULT 0,
  games_won INTEGER NOT NULL DEFAULT 0,
  last_played_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (guild_id) REFERENCES guilds(id) ON DELETE CASCADE,
  UNIQUE(guild_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_quiz_scores_guild_user ON quiz_scores(guild_id, user_id);
CREATE INDEX IF NOT EXISTS idx_quiz_scores_guild_points ON quiz_scores(guild_id, total_points DESC);

CREATE TABLE IF NOT EXISTS quiz_guild_configs (
  guild_id TEXT PRIMARY KEY,
  reward_coins_per_win INTEGER NOT NULL DEFAULT 200,
  reward_xp_per_win INTEGER NOT NULL DEFAULT 50,
  default_rounds INTEGER NOT NULL DEFAULT 5,
  default_timeout_seconds INTEGER NOT NULL DEFAULT 25,
  allowed_channel_id TEXT DEFAULT NULL,
  FOREIGN KEY (guild_id) REFERENCES guilds(id) ON DELETE CASCADE
);
