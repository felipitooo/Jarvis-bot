const { test, describe, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { DatabaseManager } = require('../src/database/connection');
const { Migrator } = require('../src/database/migrator');
const { GuildRepository } = require('../src/database/repositories/guildRepository');
const { BackupRepository } = require('../src/database/repositories/backupRepository');
const { BackupSecurityService } = require('../src/services/backupSecurityService');
const { AuditService } = require('../src/services/auditService');
const { AuditRepository } = require('../src/database/repositories/auditRepository');

describe('Backup Security & Restoration Integrity', () => {
  let db;
  let backupService;
  let mockGuild;

  beforeEach(() => {
    db = new DatabaseManager(':memory:');
    db.connect();
    const migrator = new Migrator(db, path.resolve(__dirname, '../src/database/migrations'));
    migrator.runPendingMigrations();

    const guildRepo = new GuildRepository(db);
    guildRepo.upsertGuild({ id: 'guild_backup_test', name: 'Backup Test Server' });

    const backupRepo = new BackupRepository(db);
    const auditRepo = new AuditRepository(db);
    const auditService = new AuditService(auditRepo);

    backupService = new BackupSecurityService(backupRepo, auditService);

    mockGuild = {
      id: 'guild_backup_test',
      name: 'Backup Test Server',
      roles: {
        cache: new Map([
          ['role_1', { id: 'role_1', name: 'Moderador', color: 0x3498DB, hoist: true, position: 10, permissions: { bitfield: 8n }, mentionable: false }],
          ['guild_backup_test', { id: 'guild_backup_test', name: '@everyone', color: 0, hoist: false, position: 0, permissions: { bitfield: 0n }, mentionable: false }]
        ])
      },
      channels: {
        cache: new Map([
          ['ch_1', { id: 'ch_1', name: 'geral', type: 0, parentId: null, topic: 'Bate-papo', rateLimitPerUser: 5, permissionOverwrites: { cache: new Map() } }]
        ])
      }
    };
  });

  afterEach(() => {
    db.close();
  });

  test('creates structural backup with valid SHA-256 checksum', () => {
    const record = backupService.createBackup(mockGuild, 'Backup Inicial', 'admin_user');
    assert.ok(record.id);
    assert.equal(record.backupName, 'Backup Inicial');
    assert.equal(record.checksum.length, 64); // SHA-256 hex length
  });

  test('validates backup successfully when integrity is intact', () => {
    const record = backupService.createBackup(mockGuild, 'Backup Seguro');
    const validation = backupService.validateBackup(record.id);

    assert.equal(validation.valid, true);
    assert.equal(validation.payload.guildId, 'guild_backup_test');
    assert.equal(validation.payload.roles.length, 1);
    assert.equal(validation.payload.channels.length, 1);
  });

  test('detects and rejects corrupted or tampered backups', () => {
    const record = backupService.createBackup(mockGuild, 'Backup a Adulterar');

    // Tamper with data directly in database
    db.run(
      "UPDATE guild_backups SET structure_json = replace(structure_json, 'Moderador', 'HackedRole') WHERE id = ?",
      [record.id]
    );

    const validation = backupService.validateBackup(record.id);
    assert.equal(validation.valid, false);
    assert.ok(validation.error.includes('Integridade corrompida'));
  });

  test('generateRestorationPreview correctly diffs missing resources', () => {
    const record = backupService.createBackup(mockGuild, 'Snapshot');

    // Simulate guild that lost the role 'Moderador'
    const modifiedGuild = {
      ...mockGuild,
      roles: {
        cache: new Map() // All roles deleted
      },
      channels: {
        cache: new Map() // All channels deleted
      }
    };

    const preview = backupService.generateRestorationPreview(modifiedGuild, record.id);
    assert.equal(preview.rolesToCreateCount, 1);
    assert.equal(preview.channelsToCreateCount, 1);
    assert.deepEqual(preview.missingRoleNames, ['Moderador']);
    assert.deepEqual(preview.missingChannelNames, ['geral']);
  });
});
