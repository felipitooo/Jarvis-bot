class WebSessionRepository {
  /**
   * @param {import('../connection').DatabaseManager} dbManager
   */
  constructor(dbManager) {
    this.db = dbManager;
  }

  createSession(token, userId, userData, csrfToken, ttlSeconds = 86400) {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + ttlSeconds * 1000).toISOString();
    const createdAt = now.toISOString();

    this.db.run(
      `INSERT INTO web_sessions (token, user_id, user_data, csrf_token, expires_at, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [token, userId, JSON.stringify(userData), csrfToken, expiresAt, createdAt]
    );

    return {
      token,
      userId,
      userData,
      csrfToken,
      expiresAt,
      createdAt
    };
  }

  getSession(token) {
    if (!token) return null;
    const now = new Date().toISOString();
    const row = this.db.get(
      'SELECT * FROM web_sessions WHERE token = ? AND expires_at > ?',
      [token, now]
    );

    if (!row) return null;

    let parsedData = {};
    try {
      parsedData = JSON.parse(row.user_data);
    } catch {
      parsedData = {};
    }

    return {
      token: row.token,
      userId: row.user_id,
      userData: parsedData,
      csrfToken: row.csrf_token,
      expiresAt: row.expires_at,
      createdAt: row.created_at
    };
  }

  deleteSession(token) {
    const res = this.db.run('DELETE FROM web_sessions WHERE token = ?', [token]);
    return res.changes > 0;
  }

  cleanExpiredSessions() {
    const now = new Date().toISOString();
    const res = this.db.run('DELETE FROM web_sessions WHERE expires_at <= ?', [now]);
    return res.changes;
  }

  validateCsrf(sessionToken, providedCsrfToken) {
    if (!sessionToken || !providedCsrfToken) return false;
    const session = this.getSession(sessionToken);
    if (!session) return false;
    return session.csrfToken === providedCsrfToken;
  }
}

module.exports = { WebSessionRepository };
