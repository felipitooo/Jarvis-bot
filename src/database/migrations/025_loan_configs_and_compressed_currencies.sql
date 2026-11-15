-- ========================================================
-- 025_loan_configs_and_compressed_currencies.sql
-- Configurable Loan Rules, Interest, Term, Retention & Dynamic Level Tiers
-- ========================================================

CREATE TABLE IF NOT EXISTS economy_loan_configs (
    guild_id TEXT PRIMARY KEY,
    bank_loans_enabled INTEGER NOT NULL DEFAULT 1,
    p2p_loans_enabled INTEGER NOT NULL DEFAULT 1,
    bank_interest_rate REAL NOT NULL DEFAULT 0.10,
    bank_term_days INTEGER NOT NULL DEFAULT 7,
    retention_rate REAL NOT NULL DEFAULT 0.40,
    max_active_loans INTEGER NOT NULL DEFAULT 1,
    p2p_max_interest_rate REAL NOT NULL DEFAULT 0.50,
    p2p_max_term_days INTEGER NOT NULL DEFAULT 30,
    block_transfers_on_default INTEGER NOT NULL DEFAULT 1,
    block_shop_on_default INTEGER NOT NULL DEFAULT 1,
    block_casino_on_default INTEGER NOT NULL DEFAULT 1,
    level_tiers_json TEXT NOT NULL DEFAULT '[{"minLevel":0,"maxLimit":500},{"minLevel":1,"maxLimit":2000},{"minLevel":5,"maxLimit":10000},{"minLevel":10,"maxLimit":30000},{"minLevel":20,"maxLimit":100000},{"minLevel":35,"maxLimit":500000},{"minLevel":50,"maxLimit":2000000}]',
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (guild_id) REFERENCES guilds(id) ON DELETE CASCADE
);
