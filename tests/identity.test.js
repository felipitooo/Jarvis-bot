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
const { ValidationError } = require('../src/utils/errorHandler');
const { AUDIT_ACTIONS } = require('../src/config/constants');

describe('Identity & Dynamic AI Name Service', () => {
  let db;
  let identityService;
  let auditRepo;

  beforeEach(() => {
    db = new DatabaseManager(':memory:');
    db.connect();
    const migrator = new Migrator(db, path.resolve(__dirname, '../src/database/migrations'));
    migrator.runPendingMigrations();

    const guildRepo = new GuildRepository(db);
    guildRepo.upsertGuild({ id: 'guild_001', name: 'Primary Guild' });

    const settingsRepo = new SettingsRepository(db);
    auditRepo = new AuditRepository(db);
    const auditService = new AuditService(auditRepo);

    const settingsService = new SettingsService(settingsRepo, auditService);
    identityService = new IdentityService(settingsService, auditService, 'Cell');
  });

  afterEach(() => {
    db.close();
  });

  test('default identity name must be "Cell"', () => {
    assert.equal(identityService.getDefaultName(), 'Cell');
    assert.equal(identityService.getDisplayName('guild_001'), 'Cell');
    assert.equal(identityService.getDisplayName(null), 'Cell');
  });

  test('custom identity name can be configured dynamically without restarting', () => {
    identityService.setDisplayName('guild_001', 'Aura', 'user_admin');
    assert.equal(identityService.getDisplayName('guild_001'), 'Aura');

    // Should create audit log
    const logs = auditRepo.getAuditLogs({ guildId: 'guild_001', action: AUDIT_ACTIONS.AI_NAME_UPDATE });
    assert.equal(logs.length, 1);
    assert.equal(logs[0].actor_id, 'user_admin');
  });

  test('restoring default identity name resets back to "Cell"', () => {
    identityService.setDisplayName('guild_001', 'TemporaryName', 'admin_1');
    assert.equal(identityService.getDisplayName('guild_001'), 'TemporaryName');

    const resetResult = identityService.resetDisplayName('guild_001', 'admin_1');
    assert.equal(resetResult, 'Cell');
    assert.equal(identityService.getDisplayName('guild_001'), 'Cell');

    // Audit log for reset
    const logs = auditRepo.getAuditLogs({ guildId: 'guild_001', action: AUDIT_ACTIONS.AI_NAME_RESET });
    assert.equal(logs.length, 1);
  });

  test('formatMessage dynamically injects configured AI name into templates', () => {
    identityService.setDisplayName('guild_001', 'Athena');

    const greeting = identityService.formatMessage('guild_001', 'Olá! Eu sou a {ai_name}, como posso ajudar?');
    assert.equal(greeting, 'Olá! Eu sou a Athena, como posso ajudar?');

    const botTag = identityService.formatMessage('guild_001', 'Powered by {bot_name}');
    assert.equal(botTag, 'Powered by Athena');
  });

  test('validates name input rejecting empty or over-length strings', () => {
    assert.throws(() => {
      identityService.setDisplayName('guild_001', '');
    }, ValidationError);

    assert.throws(() => {
      identityService.setDisplayName('guild_001', '   ');
    }, ValidationError);

    assert.throws(() => {
      identityService.setDisplayName('guild_001', 'a'.repeat(33));
    }, ValidationError);
  });

  test('technical internal identifier is distinct from display name', () => {
    assert.notEqual(identityService.getTechnicalIdentifier(), identityService.getDisplayName('guild_001'));
    assert.equal(identityService.getTechnicalIdentifier(), 'jarvis-unified-core');
  });
});
