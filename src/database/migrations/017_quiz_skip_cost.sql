-- ====================================================================
-- Migration: 017_quiz_skip_cost.sql
-- Description: Add skip_cost column to quiz_guild_configs
-- ====================================================================

ALTER TABLE quiz_guild_configs ADD COLUMN skip_cost INTEGER NOT NULL DEFAULT 50;
