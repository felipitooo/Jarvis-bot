const { test, describe, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const http = require('node:http');
const { DatabaseManager } = require('../src/database/connection');
const { Migrator } = require('../src/database/migrator');
const { GuildRepository } = require('../src/database/repositories/guildRepository');
const { UserRepository } = require('../src/database/repositories/userRepository');
const { SettingsRepository } = require('../src/database/repositories/settingsRepository');
const { AuditRepository } = require('../src/database/repositories/auditRepository');
const { TicketRepository } = require('../src/database/repositories/ticketRepository');
const { WebSessionRepository } = require('../src/database/repositories/webSessionRepository');
const { SettingsService } = require('../src/services/settingsService');
const { IdentityService } = require('../src/services/identityService');
const { AuditService } = require('../src/services/auditService');
const { WebPanelService } = require('../src/services/webPanelService');
const { WebServer } = require('../src/web/server');

describe('Web Panel, OAuth2 Authentication & Server Authorization (Etapa 9)', () => {
  let db;
  let webSessionRepo;
  let identityService;
  let settingsService;
  let ticketRepo;
  let webPanelService;
  let webServer;
  let serverPort;

  beforeEach(async () => {
    db = new DatabaseManager(':memory:');
    db.connect();
    const migrator = new Migrator(db, path.resolve(__dirname, '../src/database/migrations'));
    migrator.runPendingMigrations();

    const guildRepo = new GuildRepository(db);
    const userRepo = new UserRepository(db);
    const settingsRepo = new SettingsRepository(db);
    const auditRepo = new AuditRepository(db);

    guildRepo.upsertGuild({ id: 'guild_web_1', name: 'Web Manageable Guild' });
    guildRepo.upsertGuild({ id: 'guild_foreign_2', name: 'Foreign Forbidden Guild' });
    userRepo.upsertUser({ id: 'user_admin_1', username: 'GuildAdmin' });

    ticketRepo = new TicketRepository(db);
    webSessionRepo = new WebSessionRepository(db);
    const auditService = new AuditService(auditRepo);
    settingsService = new SettingsService(settingsRepo, auditService);
    identityService = new IdentityService(settingsService, auditService, 'Cell');

    webPanelService = new WebPanelService({
      webSessionRepo,
      identityService,
      settingsService,
      auditService,
      services: { ticketRepo }
    });

    serverPort = 3100 + Math.floor(Math.random() * 800);
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

  function makeRequest(method, reqPath, headers = {}, body = null) {
    return new Promise((resolve, reject) => {
      const options = {
        hostname: '127.0.0.1',
        port: serverPort,
        path: reqPath,
        method,
        headers: {
          ...headers
        }
      };

      if (body) {
        options.headers['Content-Type'] = 'application/json';
      }

      const req = http.request(options, res => {
        let data = '';
        res.on('data', chunk => { data += chunk; });
        res.on('end', () => {
          let parsed = null;
          try {
            parsed = JSON.parse(data);
          } catch {
            parsed = data;
          }
          resolve({ status: res.statusCode, headers: res.headers, body: parsed });
        });
      });

      req.on('error', reject);
      if (body) req.write(typeof body === 'string' ? body : JSON.stringify(body));
      req.end();
    });
  }

  test('GET / serves HTML dashboard with security headers', async () => {
    const res = await makeRequest('GET', '/');
    assert.equal(res.status, 200);
    assert.equal(res.headers['x-content-type-options'], 'nosniff');
    assert.equal(res.headers['x-frame-options'], 'DENY');
    assert.ok(res.headers['strict-transport-security']);
    assert.ok(typeof res.body === 'string' && res.body.includes('Cell — Painel de Controle'));
  });

  test('OAuth2 session creation and CSRF validation', () => {
    const session = webPanelService.createOAuthSession(
      { id: 'user_admin_1', username: 'GuildAdmin' },
      [
        { id: 'guild_web_1', name: 'Web Manageable Guild', permissions: '32', owner: false }, // 32 = ManageGuild
        { id: 'guild_foreign_2', name: 'Foreign Forbidden Guild', permissions: '0', owner: false } // No perms
      ]
    );

    assert.ok(session.token);
    assert.ok(session.csrfToken);
    assert.equal(session.userId, 'user_admin_1');

    // Valid CSRF
    assert.equal(webPanelService.validateCsrf(session.token, session.csrfToken), true);
    // Invalid CSRF
    assert.equal(webPanelService.validateCsrf(session.token, 'wrong_token'), false);
  });

  test('user cannot access or modify guilds where they lack permissions', () => {
    const session = webPanelService.createOAuthSession(
      { id: 'user_admin_1', username: 'GuildAdmin' },
      [
        { id: 'guild_web_1', name: 'Web Manageable Guild', permissions: '32', owner: false },
        { id: 'guild_foreign_2', name: 'Foreign Forbidden Guild', permissions: '0', owner: false }
      ]
    );

    // Allowed guild
    assert.equal(webPanelService.canUserManageGuild(session, 'guild_web_1'), true);

    // Forbidden guild
    assert.equal(webPanelService.canUserManageGuild(session, 'guild_foreign_2'), false);

    // Unknown guild
    assert.equal(webPanelService.canUserManageGuild(session, 'guild_unknown'), false);

    assert.throws(
      () => webPanelService.getGuildOverview(session, 'guild_foreign_2'),
      /Você não possui permissão de gerenciamento/
    );
  });

  test('updating guild settings via HTTP API enforces CSRF and updates identity', async () => {
    // 1. Login simulation
    const loginRes = await makeRequest('POST', '/auth/simulate-login', {}, {
      userId: 'user_admin_1',
      username: 'GuildAdmin',
      guilds: [
        { id: 'guild_web_1', name: 'Web Manageable Guild', permissions: '32', owner: false }
      ]
    });

    assert.equal(loginRes.status, 200);
    const token = loginRes.body.token;
    const csrf = loginRes.body.csrfToken;

    // 2. Reject PATCH without valid CSRF
    const badCsrfRes = await makeRequest(
      'PATCH',
      '/api/guilds/guild_web_1/settings',
      {
        Authorization: `Bearer ${token}`,
        'X-CSRF-Token': 'invalid_csrf'
      },
      { aiDisplayName: 'Cell-Supreme' }
    );
    assert.equal(badCsrfRes.status, 403);

    // 3. Accept PATCH with valid CSRF
    const goodRes = await makeRequest(
      'PATCH',
      '/api/guilds/guild_web_1/settings',
      {
        Authorization: `Bearer ${token}`,
        'X-CSRF-Token': csrf
      },
      { aiDisplayName: 'Cell-Supreme' }
    );
    assert.equal(goodRes.status, 200);
    assert.equal(goodRes.body.aiDisplayName, 'Cell-Supreme');

    // 4. Verify IdentityService was dynamically updated
    assert.equal(identityService.getDisplayName('guild_web_1'), 'Cell-Supreme');
  });

  test('updating modules via HTTP API updates shared database layer', async () => {
    const loginRes = await makeRequest('POST', '/auth/simulate-login', {}, {
      userId: 'user_admin_1',
      username: 'GuildAdmin',
      guilds: [
        { id: 'guild_web_1', name: 'Web Manageable Guild', permissions: '8', owner: false } // Administrator
      ]
    });
    const token = loginRes.body.token;
    const csrf = loginRes.body.csrfToken;

    // Update tickets module
    const updateRes = await makeRequest(
      'PATCH',
      '/api/guilds/guild_web_1/modules/tickets',
      {
        Authorization: `Bearer ${token}`,
        'X-CSRF-Token': csrf
      },
      { maxOpenTicketsPerUser: 4, transcriptChannelId: 'chan_trans_web' }
    );

    assert.equal(updateRes.status, 200);
    assert.equal(updateRes.body.config.maxOpenTicketsPerUser, 4);

    // Verify ticketRepo shares the exact same state
    const currentTicketConfig = ticketRepo.getTicketConfig('guild_web_1');
    assert.equal(currentTicketConfig.maxOpenTicketsPerUser, 4);
    assert.equal(currentTicketConfig.transcriptChannelId, 'chan_trans_web');
  });
});
