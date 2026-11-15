const fs = require('node:fs');
const path = require('node:path');
const { logger } = require('../utils/logger');

const migratorLogger = logger.forContext('Migrator');

class Migrator {
  /**
   * @param {import('./connection').DatabaseManager} dbManager
   * @param {string} [migrationsDir]
   */
  constructor(dbManager, migrationsDir = null) {
    this.dbManager = dbManager;
    this.migrationsDir = migrationsDir || path.resolve(__dirname, 'migrations');
  }

  ensureMigrationsTable() {
    this.dbManager.exec(`
      CREATE TABLE IF NOT EXISTS _migrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
  }

  getAppliedMigrations() {
    this.ensureMigrationsTable();
    const rows = this.dbManager.all('SELECT name FROM _migrations ORDER BY id ASC');
    return new Set(rows.map(r => r.name));
  }

  getMigrationFiles() {
    if (!fs.existsSync(this.migrationsDir)) {
      return [];
    }

    return fs.readdirSync(this.migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
  }

  runPendingMigrations() {
    this.ensureMigrationsTable();
    const applied = this.getAppliedMigrations();
    const files = this.getMigrationFiles();

    const pending = files.filter(file => !applied.has(file));

    if (pending.length === 0) {
      migratorLogger.info('Database schema is up to date. No pending migrations.');
      return [];
    }

    migratorLogger.info(`Found ${pending.length} pending migration(s) to apply.`);
    const appliedNow = [];

    for (const file of pending) {
      const filePath = path.join(this.migrationsDir, file);
      const sql = fs.readFileSync(filePath, 'utf-8');

      migratorLogger.info(`Applying migration: ${file}...`);

      this.dbManager.transaction(() => {
        this.dbManager.exec(sql);
        this.dbManager.run('INSERT INTO _migrations (name) VALUES (?)', [file]);
      });

      migratorLogger.info(`Successfully applied migration: ${file}`);
      appliedNow.push(file);
    }

    return appliedNow;
  }
}

module.exports = {
  Migrator
};
