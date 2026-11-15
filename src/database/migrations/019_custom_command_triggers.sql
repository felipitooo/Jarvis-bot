-- ========================================================
-- 019_custom_command_triggers.sql
-- Custom command prefix selection, prefixless mode and trigger matching
-- ========================================================

ALTER TABLE custom_commands ADD COLUMN custom_prefix TEXT DEFAULT NULL;
ALTER TABLE custom_commands ADD COLUMN require_prefix INTEGER NOT NULL DEFAULT 1;
ALTER TABLE custom_commands ADD COLUMN match_mode TEXT NOT NULL DEFAULT 'starts_with';
