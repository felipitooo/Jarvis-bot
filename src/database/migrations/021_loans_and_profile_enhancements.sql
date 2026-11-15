-- ========================================================
-- 021_loans_and_profile_enhancements.sql
-- J.A.R.V.I.S Bank & P2P Loans System and User Profile Customization
-- ========================================================

-- 1. Empréstimos Bancários & P2P
CREATE TABLE IF NOT EXISTS economy_loans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id TEXT NOT NULL,
    borrower_id TEXT NOT NULL,
    lender_id TEXT DEFAULT NULL, -- NULL para banco J.A.R.V.I.S (Modelo A) ou user_id para P2P (Modelo C)
    loan_type TEXT NOT NULL DEFAULT 'BANK', -- 'BANK' ou 'P2P'
    principal_amount INTEGER NOT NULL,
    interest_rate REAL NOT NULL DEFAULT 0.10,
    total_due INTEGER NOT NULL,
    amount_paid INTEGER NOT NULL DEFAULT 0,
    remaining_amount INTEGER NOT NULL,
    retention_rate REAL NOT NULL DEFAULT 0.40,
    status TEXT NOT NULL DEFAULT 'ACTIVE', -- 'PENDING', 'ACTIVE', 'PAID', 'DEFAULTED', 'REJECTED'
    due_date DATETIME NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (guild_id) REFERENCES guilds(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_economy_loans_borrower ON economy_loans(guild_id, borrower_id, status);
CREATE INDEX IF NOT EXISTS idx_economy_loans_lender ON economy_loans(guild_id, lender_id, status);

-- 2. Perfis de Membro Customizados (Bio / Sobre Mim, Cor do Embed)
CREATE TABLE IF NOT EXISTS user_profiles (
    guild_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    bio TEXT DEFAULT NULL,
    embed_color TEXT DEFAULT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (guild_id, user_id),
    FOREIGN KEY (guild_id) REFERENCES guilds(id) ON DELETE CASCADE
);
