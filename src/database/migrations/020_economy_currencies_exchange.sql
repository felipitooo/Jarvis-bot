-- ========================================================
-- 020_economy_currencies_exchange.sql
-- Custom Exchange Currencies, Prestiges & Multi-Currency System
-- ========================================================

CREATE TABLE IF NOT EXISTS economy_currencies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id TEXT NOT NULL,
    name TEXT NOT NULL,
    code TEXT NOT NULL,
    symbol TEXT NOT NULL DEFAULT '💎',
    rate INTEGER NOT NULL DEFAULT 1000000,
    description TEXT,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(guild_id, code),
    FOREIGN KEY (guild_id) REFERENCES guilds(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS economy_user_currencies (
    guild_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    currency_id INTEGER NOT NULL,
    amount INTEGER NOT NULL DEFAULT 0,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (guild_id, user_id, currency_id),
    FOREIGN KEY (guild_id) REFERENCES guilds(id) ON DELETE CASCADE,
    FOREIGN KEY (currency_id) REFERENCES economy_currencies(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_economy_currencies_guild ON economy_currencies(guild_id);
CREATE INDEX IF NOT EXISTS idx_economy_user_currencies_lookup ON economy_user_currencies(guild_id, user_id);
