const { DatabaseSync } = require('node:sqlite');
const path = require('node:path');
const fs = require('node:fs');
const { logger } = require('../utils/logger');

const dbLogger = logger.forContext('Database');

class DatabaseManager {
  constructor(dbPath = null) {
    this.dbPath = dbPath;
    this.db = null;
    this.statementCache = new Map();
  }

  connect(customPath = null) {
    if (this.db) {
      return this.db;
    }

    const targetPath = customPath || this.dbPath;

    if (!targetPath) {
      throw new Error('Database path not specified.');
    }

    if (targetPath !== ':memory:') {
      const dir = path.dirname(targetPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    }

    dbLogger.info(`Connecting to SQLite database: ${targetPath === ':memory:' ? ':memory:' : targetPath}`);
    this.db = new DatabaseSync(targetPath);

    // Pragma setup for ultra-high concurrency and resilience
    this.db.exec('PRAGMA foreign_keys = ON;');
    this.db.exec('PRAGMA busy_timeout = 5000;');
    if (targetPath !== ':memory:') {
      this.db.exec('PRAGMA journal_mode = WAL;');
      this.db.exec('PRAGMA synchronous = NORMAL;');
      this.db.exec('PRAGMA cache_size = -64000;');
      this.db.exec('PRAGMA temp_store = MEMORY;');
    }

    this.dbPath = targetPath;
    return this.db;
  }

  getRawDb() {
    if (!this.db) {
      throw new Error('Database is not connected. Call connect() first.');
    }
    return this.db;
  }

  getStatement(sql) {
    if (!this.statementCache.has(sql)) {
      const stmt = this.getRawDb().prepare(sql);
      this.statementCache.set(sql, stmt);
    }
    return this.statementCache.get(sql);
  }

  run(sql, params = []) {
    const stmt = this.getStatement(sql);
    const args = Array.isArray(params) ? params : [params];
    return stmt.run(...args);
  }

  get(sql, params = []) {
    const stmt = this.getStatement(sql);
    const args = Array.isArray(params) ? params : [params];
    const row = stmt.get(...args);
    return row ? { ...row } : null;
  }

  all(sql, params = []) {
    const stmt = this.getStatement(sql);
    const args = Array.isArray(params) ? params : [params];
    const rows = stmt.all(...args);
    return rows.map(r => ({ ...r }));
  }

  exec(sql) {
    return this.getRawDb().exec(sql);
  }

  /**
   * Executes a callback within a database transaction.
   * Rolls back automatically if an error is thrown.
   * @template T
   * @param {() => T} callback
   * @returns {T}
   */
  transaction(callback) {
    this.exec('BEGIN TRANSACTION;');
    try {
      const result = callback();
      this.exec('COMMIT;');
      return result;
    } catch (err) {
      try {
        this.exec('ROLLBACK;');
      } catch (rollbackErr) {
        dbLogger.error('Failed to rollback transaction', { error: rollbackErr.message });
      }
      throw err;
    }
  }

  isConnected() {
    return this.db !== null;
  }

  close() {
    if (this.db) {
      dbLogger.info('Closing SQLite database connection.');
      this.statementCache.clear();
      this.db.close();
      this.db = null;
    }
  }
}

const defaultDbManager = new DatabaseManager();

module.exports = {
  DatabaseManager,
  dbManager: defaultDbManager
};
