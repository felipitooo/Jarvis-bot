-- Migration 029: Company bankruptcy, bot auto-buyout (administrator NPC) and takeover listings

ALTER TABLE economy_user_companies ADD COLUMN status TEXT NOT NULL DEFAULT 'ACTIVE';
ALTER TABLE economy_user_companies ADD COLUMN distress_since TEXT;
ALTER TABLE economy_user_companies ADD COLUMN distress_notified INTEGER NOT NULL DEFAULT 0;
ALTER TABLE economy_user_companies ADD COLUMN bankrupt_at TEXT;
ALTER TABLE economy_user_companies ADD COLUMN former_owner_id TEXT;
ALTER TABLE economy_user_companies ADD COLUMN list_start_price INTEGER NOT NULL DEFAULT 0;
ALTER TABLE economy_user_companies ADD COLUMN list_cap_price INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_economy_user_companies_status ON economy_user_companies(guild_id, status);

-- Players who went bankrupt cannot found/take over companies until banned_until
CREATE TABLE IF NOT EXISTS economy_company_founding_bans (
    guild_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    banned_until TEXT NOT NULL,
    reason TEXT,
    PRIMARY KEY (guild_id, user_id)
);

-- Bankruptcy history (audit trail)
CREATE TABLE IF NOT EXISTS economy_company_bankruptcies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id TEXT NOT NULL,
    company_id INTEGER NOT NULL,
    company_name TEXT NOT NULL,
    former_owner_id TEXT NOT NULL,
    reason TEXT NOT NULL,
    book_value INTEGER NOT NULL DEFAULT 0,
    debt INTEGER NOT NULL DEFAULT 0,
    owner_payout INTEGER NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_economy_company_bankruptcies_guild ON economy_company_bankruptcies(guild_id, created_at);
