-- Migration 031: Server predictions & betting pool (Bolão)

CREATE TABLE IF NOT EXISTS server_predictions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id TEXT NOT NULL,
    creator_id TEXT NOT NULL,
    title TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'OPEN', -- 'OPEN', 'LOCKED', 'RESOLVED', 'CANCELLED'
    winning_choice TEXT,
    total_pool INTEGER NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    resolved_at DATETIME
);

CREATE TABLE IF NOT EXISTS server_prediction_bets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    prediction_id INTEGER NOT NULL,
    guild_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    choice TEXT NOT NULL, -- 'SIM' or 'NAO'
    amount INTEGER NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(prediction_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_server_predictions_guild ON server_predictions(guild_id, status);
CREATE INDEX IF NOT EXISTS idx_server_prediction_bets_pred ON server_prediction_bets(prediction_id);
