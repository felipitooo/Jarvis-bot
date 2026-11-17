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
const { MemoryRepository } = require('../src/database/repositories/memoryRepository');
const { MusicVoiceRepository } = require('../src/database/repositories/musicVoiceRepository');
const { SettingsService } = require('../src/services/settingsService');
const { IdentityService } = require('../src/services/identityService');
const { AuditService } = require('../src/services/auditService');
const { WebPanelService } = require('../src/services/webPanelService');
const { SocialFunService } = require('../src/services/socialFunService');
const { WebServer } = require('../src/web/server');

describe('Security Shield (PIN 1598), Multi-Tenant Isolation & Jarvis Romance Variation', () => {
  let db;
  let webSessionRepo;
  let identityService;
  let settingsService;
  let ticketRepo;
  let memoryRepo;
  let musicVoiceRepo;
  let socialFunService;
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

    guildRepo.upsertGuild({ id: 'guild_alpha', name: 'Alpha Studio' });
    guildRepo.upsertGuild({ id: 'guild_beta', name: 'Beta Gaming' });
    userRepo.upsertUser({ id: 'user_owner', username: 'Owner' });

    ticketRepo = new TicketRepository(db);
    memoryRepo = new MemoryRepository(db);
    musicVoiceRepo = new MusicVoiceRepository(db);
    webSessionRepo = new WebSessionRepository(db);

    const auditService = new AuditService(auditRepo);
    settingsService = new SettingsService(settingsRepo, auditService);
    identityService = new IdentityService(settingsService, auditService, 'J.A.R.V.I.S');

    socialFunService = new SocialFunService({
      musicVoiceRepo
    });

    webPanelService = new WebPanelService({
      webSessionRepo,
      identityService,
      settingsService,
      auditService,
      services: {
        ticketRepo,
        memoryRepo,
        musicVoiceRepo
      }
    });

    serverPort = 3500 + Math.floor(Math.random() * 800);
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
        headers: { ...headers }
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

  test('1. Panel Security: Unauthenticated requests cannot access /api/guilds without password 1598', async () => {
    // Attempting direct API call without password or authorization
    const lockedRes = await makeRequest('GET', '/api/guilds');
    assert.equal(lockedRes.status, 401);
    assert.ok(lockedRes.body.error.includes('Painel bloqueado'));

    // Wrong password test
    const wrongRes = await makeRequest('POST', '/api/auth/unlock', {}, { password: 'wrong_password_999' });
    assert.equal(wrongRes.status, 401);
    assert.equal(wrongRes.body.success, false);

    // Correct password (1598) test
    const unlockRes = await makeRequest('POST', '/api/auth/unlock', {}, { password: '1598' });
    assert.equal(unlockRes.status, 200);
    assert.equal(unlockRes.body.success, true);
    assert.ok(unlockRes.headers['set-cookie']);

    // Extract auth cookie
    const cookies = unlockRes.headers['set-cookie'].join('; ');
    const authCookie = cookies.split(';').find(c => c.trim().startsWith('cell_auth='));
    assert.ok(authCookie);

    // Now /api/guilds works with the unlocked auth cookie
    const authorizedRes = await makeRequest('GET', '/api/guilds', { Cookie: authCookie });
    assert.equal(authorizedRes.status, 200);
    assert.ok(Array.isArray(authorizedRes.body.guilds));

    // Lock panel
    const lockRes = await makeRequest('POST', '/api/auth/lock', { Cookie: authCookie });
    assert.equal(lockRes.status, 200);
    assert.equal(lockRes.body.success, true);
  });

  test('2. Jarvis Romance Variation: Ship with bot does not stay at fixed 48% or identical phrase', () => {
    const user = { id: 'user_tony', username: 'Tony' };
    const bot = { id: 'jarvis_bot_id', username: 'J.A.R.V.I.S', bot: true };

    const results = [];
    const percentages = new Set();
    const comments = new Set();

    for (let i = 0; i < 20; i++) {
      const res = socialFunService.ship('guild_alpha', user, bot, 'jarvis_bot_id');
      assert.ok(res.percent >= 0 && res.percent <= 100);
      assert.ok(res.comment);
      assert.ok(res.progressBar);
      results.push(res);
      percentages.add(res.percent);
      comments.add(res.comment);
    }

    // Must have variation across 20 calls (not locked to 1 single value)
    assert.ok(percentages.size > 1, 'Percent should vary across calls');
    assert.ok(comments.size > 1, 'Comments should vary across calls');

    // Bot marriage rejection
    assert.throws(
      () => socialFunService.proposeMarriage('guild_alpha', user, bot),
      /Você não pode se casar com um bot/
    );
  });

  test('3. Multi-Tenant Server Isolation: Data in Guild Alpha does not leak into Guild Beta', () => {
    // Memory recorded in guild_alpha
    memoryRepo.saveUserMemory({
      guildId: 'guild_alpha',
      userId: 'user_common',
      key: 'apelido',
      value: 'Mestre Alpha'
    });

    // Query in guild_alpha
    const alphaMemories = memoryRepo.listUserMemories('guild_alpha', 'user_common');
    assert.equal(alphaMemories.length, 1);
    assert.equal(alphaMemories[0].value, 'Mestre Alpha');

    // Query in guild_beta - MUST BE EMPTY! No cross-guild leakage
    const betaMemories = memoryRepo.listUserMemories('guild_beta', 'user_common');
    assert.equal(betaMemories.length, 0);
  });

  test('4. Light Theme & English Language: Dashboard HTML renders theme toggle, language toggle, and Light Mode CSS', async () => {
    const res = await makeRequest('GET', '/dashboard');
    assert.equal(res.status, 200);
    const html = typeof res.body === 'string' ? res.body : JSON.stringify(res.body);

    // Light mode CSS presence
    assert.ok(html.includes('.theme-light'), 'Should contain theme-light CSS rules');
    assert.ok(html.includes('themeToggleBtn'), 'Should contain themeToggleBtn');

    // Language toggle presence and dictionary
    assert.ok(html.includes('langToggleBtn'), 'Should contain langToggleBtn');
    assert.ok(html.includes('i18nDict'), 'Should contain i18n translation dictionary');
    assert.ok(html.includes('Managing now'), 'Should contain English translation strings');
    assert.ok(html.includes('const t = i18nDict[lang] || i18nDict.pt;'), 'Should define t in applyLanguage');
    assert.ok(html.includes('cfgLangEnBtn'), 'Should contain cfgLangEnBtn');
    assert.ok(html.includes('cfgLangPtBtn'), 'Should contain cfgLangPtBtn');
    assert.ok(html.includes('DASHBOARD & HEALTH'), 'Should contain English hub translations');
  });
});
