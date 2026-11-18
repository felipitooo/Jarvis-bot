const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { DatabaseManager } = require('../src/database/connection');
const { Migrator } = require('../src/database/migrator');
const { SettingsRepository } = require('../src/database/repositories/settingsRepository');
const { AuditRepository } = require('../src/database/repositories/auditRepository');
const { WebSessionRepository } = require('../src/database/repositories/webSessionRepository');
const { SettingsService } = require('../src/services/settingsService');
const { IdentityService } = require('../src/services/identityService');
const { AuditService } = require('../src/services/auditService');
const { WebPanelService } = require('../src/services/webPanelService');
const { WebServer } = require('../src/web/server');
const { PrefixCommandHandler } = require('../src/handlers/prefixCommandHandler');

describe('Database Local Backup System (v6.3)', () => {
  let db;
  let webServer;
  let serverPort;

  beforeEach(async () => {
    db = new DatabaseManager(':memory:');
    db.connect();
    const migrator = new Migrator(db);
    migrator.runPendingMigrations();

    const settingsRepo = new SettingsRepository(db);
    const auditRepo = new AuditRepository(db);
    const webSessionRepo = new WebSessionRepository(db);

    const auditService = new AuditService(auditRepo);
    const settingsService = new SettingsService(settingsRepo, auditService);
    const identityService = new IdentityService(settingsService, auditService, 'Cell');

    const webPanelService = new WebPanelService({
      webSessionRepo,
      identityService,
      settingsService,
      auditService,
      services: {}
    });

    serverPort = 3600 + Math.floor(Math.random() * 800);
    webServer = new WebServer({
      webPanelService,
      port: serverPort,
      host: '127.0.0.1'
    });

    await webServer.start();
  });

  afterEach(async () => {
    if (webServer) await webServer.stop();
    if (db) db.close();
  });

  it('blocks unauthorized requests to /api/backup/download without panel password', async () => {
    const res = await fetch(`http://127.0.0.1:${serverPort}/api/backup/download`);
    assert.equal(res.status, 401);
    const data = await res.json();
    assert.ok(data.error.includes('Painel bloqueado'));
  });

  it('allows authorized requests to /api/backup/download and serves attachment', async () => {
    const res = await fetch(`http://127.0.0.1:${serverPort}/api/backup/download`, {
      headers: { 'X-Panel-Password': '1598' }
    });
    assert.equal(res.status, 200);
    assert.ok(res.headers.get('content-disposition').includes('attachment; filename='));
  });

  it('enforces administrator permissions for +backup command', async () => {
    const handler = new PrefixCommandHandler('+');
    let replyMsg = '';

    const nonAdminMsg = {
      content: '+backup',
      guild: { id: 'g1' },
      author: { id: 'u1' },
      member: { permissions: { has: () => false } },
      reply: async (txt) => {
        replyMsg = typeof txt === 'string' ? txt : (txt.content || '');
      }
    };

    const handled = await handler.handle(nonAdminMsg, {});
    assert.equal(handled, true);
    assert.ok(replyMsg.includes('Apenas administradores'));
  });

  it('executes +backup command cleanly for administrators', async () => {
    const handler = new PrefixCommandHandler('+');
    let replyMsg = '';

    const adminMsg = {
      content: '+backup',
      guild: { id: 'g1' },
      author: { id: 'admin1' },
      member: { permissions: { has: () => true } },
      reply: async (txt) => {
        replyMsg = typeof txt === 'string' ? txt : (txt.content || '');
      }
    };

    const handled = await handler.handle(adminMsg, {});
    assert.equal(handled, true);
    assert.ok(replyMsg.includes('banco de dados') || replyMsg.includes('Backup'));
  });
});
