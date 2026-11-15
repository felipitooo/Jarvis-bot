const { test, describe, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const http = require('node:http');
const { DatabaseManager } = require('../src/database/connection');
const { Migrator } = require('../src/database/migrator');
const { WebSessionRepository } = require('../src/database/repositories/webSessionRepository');
const { WebPanelService } = require('../src/services/webPanelService');
const { WebServer } = require('../src/web/server');
const { logger } = require('../src/utils/logger');

describe('System Health, Observability & Process Metrics (Etapa 10)', () => {
  let db;
  let webServer;
  let serverPort;

  beforeEach(async () => {
    db = new DatabaseManager(':memory:');
    db.connect();
    const migrator = new Migrator(db, path.resolve(__dirname, '../src/database/migrations'));
    migrator.runPendingMigrations();

    const sessionRepo = new WebSessionRepository(db);
    const mockIdentity = {
      getDisplayName: () => 'Cell',
      getDefaultName: () => 'Cell'
    };

    const webPanelService = new WebPanelService({
      webSessionRepo: sessionRepo,
      identityService: mockIdentity,
      settingsService: { getSettings: () => ({}) },
      services: {}
    });

    serverPort = 3900 + Math.floor(Math.random() * 500);
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

  function getHealth(reqPath = '/health') {
    return new Promise((resolve, reject) => {
      http.get(`http://127.0.0.1:${serverPort}${reqPath}`, res => {
        let data = '';
        res.on('data', chunk => { data += chunk; });
        res.on('end', () => {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        });
      }).on('error', reject);
    });
  }

  test('GET /health reports process uptime, memory usage, and database status', async () => {
    const res = await getHealth('/health');
    assert.equal(res.status, 200);
    assert.equal(res.body.status, 'ok');
    assert.ok(typeof res.body.uptime === 'number');
    assert.ok(res.body.memory.heapUsedMb >= 0);
    assert.ok(res.body.memory.heapTotalMb >= 0);
    assert.ok(res.body.memory.rssMb >= 0);
    assert.equal(res.body.database, 'connected');
    assert.ok(res.body.bot);
  });

  test('Structured Logger provides contextual logging without throwing', () => {
    const contextual = logger.forContext('HealthAuditTest');
    assert.doesNotThrow(() => {
      contextual.debug('Debug log trace message');
      contextual.info('Information message for observability', { metric: 123 });
      contextual.warn('Warning test event');
      contextual.error('Error log verification test', { error: 'mock_err' });
    });
  });

  test('Database connection handles graceful disconnect and reconnect', () => {
    assert.equal(db.isConnected(), true);
    db.close();
    assert.equal(db.isConnected(), false);

    db.connect();
    assert.equal(db.isConnected(), true);
  });
});
