-- Migration 013: Marriage Cost and Ring Investment in Bot Economy
ALTER TABLE social_guild_configs ADD COLUMN marriage_cost INTEGER NOT NULL DEFAULT 5000;
ALTER TABLE social_marriages ADD COLUMN ring_cost INTEGER NOT NULL DEFAULT 0;
