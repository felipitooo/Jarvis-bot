-- ========================================================
-- 008_tickets_reviews_community.sql
-- Tickets, Reviews, Welcomes, AutoRoles, Suggestions & Starboard
-- ========================================================

-- 1. Ticket Panels
CREATE TABLE IF NOT EXISTS ticket_panels (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id TEXT NOT NULL,
    channel_id TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    category_id TEXT DEFAULT NULL,
    support_role_id TEXT DEFAULT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (guild_id) REFERENCES guilds(id) ON DELETE CASCADE
);

-- 2. Ticket Categories
CREATE TABLE IF NOT EXISTS ticket_categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    panel_id INTEGER,
    guild_id TEXT NOT NULL,
    name TEXT NOT NULL,
    emoji TEXT DEFAULT '🎫',
    description TEXT,
    support_role_id TEXT DEFAULT NULL,
    FOREIGN KEY (panel_id) REFERENCES ticket_panels(id) ON DELETE CASCADE,
    FOREIGN KEY (guild_id) REFERENCES guilds(id) ON DELETE CASCADE
);

-- 3. Tickets
CREATE TABLE IF NOT EXISTS tickets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id TEXT NOT NULL,
    channel_id TEXT NOT NULL,
    author_id TEXT NOT NULL,
    category_name TEXT NOT NULL DEFAULT 'Geral',
    status TEXT NOT NULL DEFAULT 'OPEN', -- 'OPEN', 'CLAIMED', 'CLOSED'
    claimed_by TEXT DEFAULT NULL,
    open_reason TEXT,
    close_reason TEXT,
    closed_by TEXT DEFAULT NULL,
    closed_at DATETIME DEFAULT NULL,
    transcript TEXT DEFAULT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (guild_id) REFERENCES guilds(id) ON DELETE CASCADE,
    FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 4. Ticket Guild Configuration
CREATE TABLE IF NOT EXISTS ticket_guild_configs (
    guild_id TEXT PRIMARY KEY NOT NULL,
    max_open_tickets_per_user INTEGER NOT NULL DEFAULT 1,
    transcript_channel_id TEXT DEFAULT NULL,
    default_support_role_id TEXT DEFAULT NULL,
    ticket_category_id TEXT DEFAULT NULL,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (guild_id) REFERENCES guilds(id) ON DELETE CASCADE
);

-- 5. Community Reviews (ReviewCord style)
CREATE TABLE IF NOT EXISTS community_reviews (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id TEXT NOT NULL,
    author_id TEXT NOT NULL,
    target_staff_id TEXT DEFAULT NULL,
    ticket_id INTEGER DEFAULT NULL,
    rating INTEGER NOT NULL, -- 1 to 5 stars
    comment TEXT NOT NULL,
    response TEXT DEFAULT NULL,
    responded_by TEXT DEFAULT NULL,
    responded_at DATETIME DEFAULT NULL,
    status TEXT NOT NULL DEFAULT 'APPROVED', -- 'APPROVED', 'PENDING', 'DELETED'
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (guild_id) REFERENCES guilds(id) ON DELETE CASCADE,
    FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 6. Review Guild Configuration
CREATE TABLE IF NOT EXISTS review_guild_configs (
    guild_id TEXT PRIMARY KEY NOT NULL,
    review_channel_id TEXT DEFAULT NULL,
    require_moderation INTEGER NOT NULL DEFAULT 0,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (guild_id) REFERENCES guilds(id) ON DELETE CASCADE
);

-- 7. Community Welcome & Goodbye Configuration
CREATE TABLE IF NOT EXISTS community_welcome_configs (
    guild_id TEXT PRIMARY KEY NOT NULL,
    welcome_enabled INTEGER NOT NULL DEFAULT 0,
    welcome_channel_id TEXT DEFAULT NULL,
    welcome_message TEXT DEFAULT 'Bem-vindo(a) ao {server}, {user}! Agora somos {members} membros! 🎉',
    goodbye_enabled INTEGER NOT NULL DEFAULT 0,
    goodbye_channel_id TEXT DEFAULT NULL,
    goodbye_message TEXT DEFAULT '{user} saiu do servidor. Agora somos {members} membros. 😢',
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (guild_id) REFERENCES guilds(id) ON DELETE CASCADE
);

-- 8. AutoRoles
CREATE TABLE IF NOT EXISTS community_autoroles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id TEXT NOT NULL,
    role_id TEXT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(guild_id, role_id),
    FOREIGN KEY (guild_id) REFERENCES guilds(id) ON DELETE CASCADE
);

-- 9. Community Suggestions
CREATE TABLE IF NOT EXISTS community_suggestions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id TEXT NOT NULL,
    author_id TEXT NOT NULL,
    message_id TEXT DEFAULT NULL,
    channel_id TEXT DEFAULT NULL,
    suggestion TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDING', -- 'PENDING', 'APPROVED', 'REJECTED'
    status_reason TEXT DEFAULT NULL,
    moderated_by TEXT DEFAULT NULL,
    upvotes INTEGER NOT NULL DEFAULT 0,
    downvotes INTEGER NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (guild_id) REFERENCES guilds(id) ON DELETE CASCADE,
    FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 10. Starboard Configuration & Starred Messages
CREATE TABLE IF NOT EXISTS community_starboards (
    guild_id TEXT PRIMARY KEY NOT NULL,
    starboard_channel_id TEXT DEFAULT NULL,
    stars_required INTEGER NOT NULL DEFAULT 3,
    is_enabled INTEGER NOT NULL DEFAULT 1,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (guild_id) REFERENCES guilds(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS community_starred_messages (
    guild_id TEXT NOT NULL,
    original_message_id TEXT NOT NULL,
    starboard_message_id TEXT NOT NULL,
    author_id TEXT NOT NULL,
    star_count INTEGER NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY(guild_id, original_message_id),
    FOREIGN KEY (guild_id) REFERENCES guilds(id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_tickets_guild_author ON tickets(guild_id, author_id, status);
CREATE INDEX IF NOT EXISTS idx_tickets_guild_channel ON tickets(guild_id, channel_id);
CREATE INDEX IF NOT EXISTS idx_reviews_guild ON community_reviews(guild_id, status);
CREATE INDEX IF NOT EXISTS idx_suggestions_guild ON community_suggestions(guild_id, status);
