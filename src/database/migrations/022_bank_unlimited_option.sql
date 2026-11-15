-- Migration 022: Add bank_unlimited column to economy_guild_configs
ALTER TABLE economy_guild_configs ADD COLUMN bank_unlimited INTEGER NOT NULL DEFAULT 0;
