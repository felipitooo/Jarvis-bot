-- Migration 032: Social Alerts & Bot Scam / Phishing Protection
-- Adds social media monitoring (YouTube, Twitch, Reddit) and anti-bot scam controls.

ALTER TABLE anti_abuse_configs ADD COLUMN anti_bot_scam_enabled INTEGER DEFAULT 1;
ALTER TABLE anti_abuse_configs ADD COLUMN anti_bot_scam_action TEXT DEFAULT 'TIMEOUT';
ALTER TABLE anti_abuse_configs ADD COLUMN anti_bot_scam_timeout_seconds INTEGER DEFAULT 86400;

CREATE TABLE IF NOT EXISTS social_alerts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id TEXT NOT NULL,
    platform TEXT NOT NULL,
    source_id TEXT NOT NULL,
    channel_target_id TEXT NOT NULL,
    custom_message TEXT DEFAULT NULL,
    last_notified_id TEXT DEFAULT NULL,
    is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_social_alerts_guild ON social_alerts(guild_id, platform);
CREATE INDEX IF NOT EXISTS idx_social_alerts_active ON social_alerts(platform, is_active);
