-- ========================================================
-- 037_currency_bank_support.sql
-- Adds bank storage support for foreign exchange / custom currencies
-- ========================================================

ALTER TABLE economy_user_currencies ADD COLUMN bank_amount INTEGER NOT NULL DEFAULT 0;
