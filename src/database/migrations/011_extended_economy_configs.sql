-- Migration 011: Extended Economy Configurations for 100% customizability
ALTER TABLE economy_guild_configs ADD COLUMN slut_min INTEGER NOT NULL DEFAULT 80;
ALTER TABLE economy_guild_configs ADD COLUMN slut_max INTEGER NOT NULL DEFAULT 350;
ALTER TABLE economy_guild_configs ADD COLUMN slut_cooldown_seconds INTEGER NOT NULL DEFAULT 7200;
ALTER TABLE economy_guild_configs ADD COLUMN slut_success_rate REAL NOT NULL DEFAULT 0.65;
ALTER TABLE economy_guild_configs ADD COLUMN daily_cooldown_seconds INTEGER NOT NULL DEFAULT 86400;
ALTER TABLE economy_guild_configs ADD COLUMN weekly_cooldown_seconds INTEGER NOT NULL DEFAULT 604800;
ALTER TABLE economy_guild_configs ADD COLUMN gamble_min INTEGER NOT NULL DEFAULT 10;
ALTER TABLE economy_guild_configs ADD COLUMN gamble_max INTEGER NOT NULL DEFAULT 50000;
ALTER TABLE economy_guild_configs ADD COLUMN gamble_win_rate REAL NOT NULL DEFAULT 0.48;
ALTER TABLE economy_guild_configs ADD COLUMN initial_balance INTEGER NOT NULL DEFAULT 100;
ALTER TABLE economy_guild_configs ADD COLUMN bank_starting_capacity INTEGER NOT NULL DEFAULT 5000;
