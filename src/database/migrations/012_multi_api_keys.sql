-- ========================================================
-- 012_multi_api_keys.sql
-- Multi-key API pool for Google Gemini with automatic failover rotation
-- ========================================================

CREATE TABLE IF NOT EXISTS ai_api_keys (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    key_1 TEXT,
    key_2 TEXT,
    key_3 TEXT,
    key_4 TEXT,
    active_key_index INTEGER NOT NULL DEFAULT 0,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT OR IGNORE INTO ai_api_keys (id, active_key_index, updated_at)
VALUES (1, 0, CURRENT_TIMESTAMP);
