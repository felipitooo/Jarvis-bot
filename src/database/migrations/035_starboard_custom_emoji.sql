-- 035_starboard_custom_emoji.sql
-- Adds customizable emoji support for Starboard
ALTER TABLE community_starboards ADD COLUMN starboard_emoji TEXT NOT NULL DEFAULT '⭐';
