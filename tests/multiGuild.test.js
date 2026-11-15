const { test, describe, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { DatabaseManager } = require('../src/database/connection');
const { Migrator } = require('../src/database/migrator');
const { GuildRepository } = require('../src/database/repositories/guildRepository');
const { SettingsRepository } = require('../src/database/repositories/settingsRepository');
const { AuditRepository } = require('../src/database/repositories/auditRepository');
const { SettingsService } = require('../src/services/settingsService');
const { IdentityService } = require('../src/services/identityService');
const { AuditService } = require('../src/services/auditService');

describe('Multi-Guild Isolation Verification', () => {
  let db;
  let identityService;
  let settingsService;
  let guildRepo;

  beforeEach(() => {
    db = new DatabaseManager(':memory:');
    db.connect();
    const migrator = new Migrator(db, path.resolve(__dirname, '../src/database/migrations'));
    migrator.runPendingMigrations();

    guildRepo = new GuildRepository(db);
    const settingsRepo = new SettingsRepository(db);
    const auditRepo = new AuditRepository(db);
    const auditService = new AuditService(auditRepo);

    settingsService = new SettingsService(settingsRepo, auditService);
    identityService = new IdentityService(settingsService, auditService, 'Cell');

    // Create 2 distinct test guilds
    guildRepo.upsertGuild({ id: 'guild_alpha', name: 'Alpha Server' });
    guildRepo.upsertGuild({ id: 'guild_beta', name: 'Beta Server' });
  });

  afterEach(() => {
    db.close();
  });

  test('two distinct guilds must maintain completely isolated AI display names', () => {
    // Initial state: both use default "Cell"
    assert.equal(identityService.getDisplayName('guild_alpha'), 'Cell');
    assert.equal(identityService.getDisplayName('guild_beta'), 'Cell');

    // Configure distinct names
    identityService.setDisplayName('guild_alpha', 'FRIDAY', 'admin_1');
    identityService.setDisplayName('guild_beta', 'JARVIS', 'admin_2');

    // Verify isolation
    assert.equal(identityService.getDisplayName('guild_alpha'), 'FRIDAY');
    assert.equal(identityService.getDisplayName('guild_beta'), 'JARVIS');

    // Reset Alpha back to default; Beta must remain unchanged
    identityService.resetDisplayName('guild_alpha', 'admin_1');
    assert.equal(identityService.getDisplayName('guild_alpha'), 'Cell');
    assert.equal(identityService.getDisplayName('guild_beta'), 'JARVIS');
  });

  test('general settings must never leak between guilds', () => {
    settingsService.setSetting('guild_alpha', 'prefix', '!');
    settingsService.setSetting('guild_beta', 'prefix', '?');

    settingsService.setSetting('guild_alpha', 'locale', 'pt-BR');
    settingsService.setSetting('guild_beta', 'locale', 'en-US');

    assert.equal(settingsService.getSetting('guild_alpha', 'prefix'), '!');
    assert.equal(settingsService.getSetting('guild_beta', 'prefix'), '?');

    assert.equal(settingsService.getSetting('guild_alpha', 'locale'), 'pt-BR');
    assert.equal(settingsService.getSetting('guild_beta', 'locale'), 'en-US');

    // Verify raw database records are strictly scoped by guild_id
    const alphaSettings = settingsService.getAllSettings('guild_alpha');
    const betaSettings = settingsService.getAllSettings('guild_beta');

    assert.equal(alphaSettings.prefix, '!');
    assert.equal(betaSettings.prefix, '?');
    assert.notDeepEqual(alphaSettings, betaSettings);
  });
});
