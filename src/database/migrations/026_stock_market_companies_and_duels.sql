-- ========================================================
-- 026_stock_market_companies_and_duels.sql
-- Stark Stock Market (Dynamic Exchange Currencies & History),
-- Companies / Passive Income System, and PvP Duels
-- ========================================================

ALTER TABLE economy_currencies ADD COLUMN is_dynamic INTEGER NOT NULL DEFAULT 0;
ALTER TABLE economy_currencies ADD COLUMN min_rate INTEGER NOT NULL DEFAULT 100;
ALTER TABLE economy_currencies ADD COLUMN max_rate INTEGER NOT NULL DEFAULT 100000000;
ALTER TABLE economy_currencies ADD COLUMN volatility REAL NOT NULL DEFAULT 0.05;
ALTER TABLE economy_currencies ADD COLUMN previous_rate INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS economy_currency_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id TEXT NOT NULL,
    currency_id INTEGER NOT NULL,
    rate INTEGER NOT NULL,
    reason TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (currency_id) REFERENCES economy_currencies(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_economy_currency_history_lookup ON economy_currency_history(guild_id, currency_id, id DESC);

CREATE TABLE IF NOT EXISTS economy_company_types (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id TEXT NOT NULL,
    name TEXT NOT NULL,
    emoji TEXT NOT NULL DEFAULT '🏢',
    description TEXT,
    price INTEGER NOT NULL DEFAULT 10000,
    hourly_income INTEGER NOT NULL DEFAULT 500,
    max_employees INTEGER NOT NULL DEFAULT 3,
    upgrade_cost_base INTEGER NOT NULL DEFAULT 5000,
    employee_work_bonus REAL NOT NULL DEFAULT 0.15,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_economy_company_types_guild ON economy_company_types(guild_id);

CREATE TABLE IF NOT EXISTS economy_user_companies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id TEXT NOT NULL,
    owner_id TEXT NOT NULL,
    company_type_id INTEGER NOT NULL,
    custom_name TEXT,
    level INTEGER NOT NULL DEFAULT 1,
    vault_balance INTEGER NOT NULL DEFAULT 0,
    total_earned INTEGER NOT NULL DEFAULT 0,
    last_collected_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (company_type_id) REFERENCES economy_company_types(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_economy_user_companies_owner ON economy_user_companies(guild_id, owner_id);

CREATE TABLE IF NOT EXISTS economy_company_employees (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id TEXT NOT NULL,
    company_id INTEGER NOT NULL,
    user_id TEXT NOT NULL,
    total_contributed INTEGER NOT NULL DEFAULT 0,
    hired_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(guild_id, user_id),
    FOREIGN KEY (company_id) REFERENCES economy_user_companies(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_economy_company_employees_company ON economy_company_employees(company_id);
