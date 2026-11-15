const { test, describe, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { DatabaseManager } = require('../src/database/connection');
const { Migrator } = require('../src/database/migrator');
const { GuildRepository } = require('../src/database/repositories/guildRepository');
const { SettingsRepository } = require('../src/database/repositories/settingsRepository');
const { UserRepository } = require('../src/database/repositories/userRepository');

describe('Database & Migrations Infrastructure', () => {
  let db;
  let migrator;

  beforeEach(() => {
    db = new DatabaseManager(':memory:');
    db.connect();
    migrator = new Migrator(db, path.resolve(__dirname, '../src/database/migrations'));
  });

  afterEach(() => {
    db.close();
  });

  test('should create _migrations table and apply 001_initial_schema.sql', () => {
    const applied = migrator.runPendingMigrations();
    assert.ok(applied.includes('001_initial_schema.sql'));

    const tables = db.all(
      "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name ASC"
    );
    const tableNames = tables.map(t => t.name);

    assert.ok(tableNames.includes('_migrations'));
    assert.ok(tableNames.includes('guilds'));
    assert.ok(tableNames.includes('guild_settings'));
    assert.ok(tableNames.includes('users'));
    assert.ok(tableNames.includes('member_profiles'));
    assert.ok(tableNames.includes('role_channel_configs'));
    assert.ok(tableNames.includes('audit_logs'));
  });

  test('should not re-apply already applied migrations', () => {
    migrator.runPendingMigrations();
    const secondRun = migrator.runPendingMigrations();
    assert.equal(secondRun.length, 0);
  });

  test('should rollback transaction on error', () => {
    migrator.runPendingMigrations();

    assert.throws(() => {
      db.transaction(() => {
        db.run("INSERT INTO guilds (id, name, joined_at) VALUES ('g1', 'Guild 1', datetime('now'))");
        throw new Error('Forced failure to trigger rollback');
      });
    }, /Forced failure/);

    const guild = db.get("SELECT * FROM guilds WHERE id = 'g1'");
    assert.equal(guild, null, 'Guild should not exist due to transaction rollback');
  });

  test('should enforce foreign key constraints', () => {
    migrator.runPendingMigrations();

    // Trying to insert into guild_settings without existing guild must fail
    assert.throws(() => {
      db.run("INSERT INTO guild_settings (guild_id, key, value) VALUES ('non_existent_guild', 'key', 'val')");
    });
  });

  test('should correctly perform CRUD operations with repositories', () => {
    migrator.runPendingMigrations();
    const guildRepo = new GuildRepository(db);
    const settingsRepo = new SettingsRepository(db);
    const userRepo = new UserRepository(db);

    // 1. Guild
    const guild = guildRepo.upsertGuild({ id: 'guild_100', name: 'Test Server' });
    assert.equal(guild.id, 'guild_100');
    assert.equal(guild.name, 'Test Server');
    assert.equal(guild.is_active, 1);

    // 2. Settings
    settingsRepo.setSetting('guild_100', 'prefix', '!');
    assert.equal(settingsRepo.getSetting('guild_100', 'prefix'), '!');

    // 3. User & Member profile
    const user = userRepo.upsertUser({ id: 'user_200', username: 'TestUser' });
    assert.equal(user.id, 'user_200');

    const profile = userRepo.upsertMemberProfile({
      guildId: 'guild_100',
      userId: 'user_200',
      nickname: 'Tester'
    });
    assert.equal(profile.nickname, 'Tester');
  });
});
