-- ========================================================
-- 006_economy_system.sql
-- Virtual Economy, Ledger, Income, Gambling, Shop & Inventory
-- ========================================================

-- 1. Member Economy Accounts (Wallet & Bank)
CREATE TABLE IF NOT EXISTS economy_accounts (
    guild_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    wallet_balance INTEGER NOT NULL DEFAULT 0,
    bank_balance INTEGER NOT NULL DEFAULT 0,
    bank_capacity INTEGER NOT NULL DEFAULT 10000,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (guild_id, user_id),
    FOREIGN KEY (guild_id) REFERENCES guilds(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 2. Immutable Ledger / Transactions History
CREATE TABLE IF NOT EXISTS economy_transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    type TEXT NOT NULL, -- 'WORK', 'CRIME', 'SLUT', 'DAILY', 'WEEKLY', 'ROB', 'DEPOSIT', 'WITHDRAW', 'TRANSFER_SEND', 'TRANSFER_RECEIVE', 'GAMBLE', 'SLOTS', 'COINFLIP', 'DICE', 'SHOP_BUY', 'SHOP_SELL', 'ADMIN_ADD', 'ADMIN_REMOVE', 'ADMIN_SET'
    amount INTEGER NOT NULL,
    target_id TEXT,
    wallet_after INTEGER NOT NULL,
    bank_after INTEGER NOT NULL,
    description TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (guild_id) REFERENCES guilds(id) ON DELETE CASCADE
);

-- 3. Income Command Cooldowns
CREATE TABLE IF NOT EXISTS economy_cooldowns (
    guild_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    command_name TEXT NOT NULL,
    last_used_at DATETIME NOT NULL,
    PRIMARY KEY (guild_id, user_id, command_name),
    FOREIGN KEY (guild_id) REFERENCES guilds(id) ON DELETE CASCADE
);

-- 4. Shop Items
CREATE TABLE IF NOT EXISTS economy_shop_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    price INTEGER NOT NULL,
    stock INTEGER NOT NULL DEFAULT -1, -- -1 = unlimited
    role_id TEXT, -- role given on purchase
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (guild_id) REFERENCES guilds(id) ON DELETE CASCADE,
    UNIQUE(guild_id, name)
);

-- 5. User Inventory
CREATE TABLE IF NOT EXISTS economy_inventory (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    item_id INTEGER NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (guild_id, user_id, item_id),
    FOREIGN KEY (guild_id) REFERENCES guilds(id) ON DELETE CASCADE,
    FOREIGN KEY (item_id) REFERENCES economy_shop_items(id) ON DELETE CASCADE
);

-- 6. Guild Economy Configuration
CREATE TABLE IF NOT EXISTS economy_guild_configs (
    guild_id TEXT PRIMARY KEY NOT NULL,
    currency_name TEXT NOT NULL DEFAULT 'Moedas',
    currency_symbol TEXT NOT NULL DEFAULT '🪙',
    work_min INTEGER NOT NULL DEFAULT 50,
    work_max INTEGER NOT NULL DEFAULT 200,
    work_cooldown_seconds INTEGER NOT NULL DEFAULT 3600,
    daily_amount INTEGER NOT NULL DEFAULT 500,
    weekly_amount INTEGER NOT NULL DEFAULT 3000,
    crime_min INTEGER NOT NULL DEFAULT 100,
    crime_max INTEGER NOT NULL DEFAULT 500,
    crime_success_rate REAL NOT NULL DEFAULT 0.6,
    crime_cooldown_seconds INTEGER NOT NULL DEFAULT 7200,
    rob_success_rate REAL NOT NULL DEFAULT 0.45,
    rob_cooldown_seconds INTEGER NOT NULL DEFAULT 7200,
    rob_fine_percent REAL NOT NULL DEFAULT 0.25,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (guild_id) REFERENCES guilds(id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_economy_accounts_lookup ON economy_accounts(guild_id, user_id);
CREATE INDEX IF NOT EXISTS idx_economy_transactions_user ON economy_transactions(guild_id, user_id, id DESC);
CREATE INDEX IF NOT EXISTS idx_economy_shop_guild ON economy_shop_items(guild_id);
CREATE INDEX IF NOT EXISTS idx_economy_inventory_lookup ON economy_inventory(guild_id, user_id);
