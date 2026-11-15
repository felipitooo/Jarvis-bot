const { test, describe, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { DatabaseManager } = require('../src/database/connection');
const { Migrator } = require('../src/database/migrator');
const { GuildRepository } = require('../src/database/repositories/guildRepository');
const { UserRepository } = require('../src/database/repositories/userRepository');
const { AutomationRepository } = require('../src/database/repositories/automationRepository');
const { TicketRepository } = require('../src/database/repositories/ticketRepository');
const { ReviewRepository } = require('../src/database/repositories/reviewRepository');
const { AutomationService } = require('../src/services/automationService');
const { automationTools } = require('../src/ai/tools/automationTools');

describe('Productivity Utilities, SSRF Protection & Friday AI Tools (Etapa 9)', () => {
  let db;
  let autoRepo;
  let ticketRepo;
  let reviewRepo;
  let autoService;
  let toolMap;
  let mockGuild;
  let mockUser;

  beforeEach(() => {
    db = new DatabaseManager(':memory:');
    db.connect();
    const migrator = new Migrator(db, path.resolve(__dirname, '../src/database/migrations'));
    migrator.runPendingMigrations();

    const guildRepo = new GuildRepository(db);
    const userRepo = new UserRepository(db);

    guildRepo.upsertGuild({ id: 'guild_prod_1', name: 'Productivity Guild' });
    userRepo.upsertUser({ id: 'user_prod_1', username: 'ProdUser' });

    autoRepo = new AutomationRepository(db);
    ticketRepo = new TicketRepository(db);
    reviewRepo = new ReviewRepository(db);

    const mockIdentity = {
      getDisplayName: () => 'Cell',
      getDefaultName: () => 'Cell'
    };

    autoService = new AutomationService({
      automationRepo: autoRepo,
      identityService: mockIdentity,
      auditService: null,
      extraServices: { ticketRepo, reviewRepo }
    });

    mockUser = { id: 'user_prod_1', username: 'ProdUser' };
    mockGuild = {
      id: 'guild_prod_1',
      name: 'Productivity Guild',
      memberCount: 250
    };

    toolMap = new Map();
    for (const tool of automationTools) {
      toolMap.set(tool.name, tool);
    }
  });

  afterEach(() => {
    if (db) db.close();
  });

  test('SSRF Protection blocks localhost, private IPs and non-http protocols', () => {
    // 1. Valid external URLs
    const safe1 = autoService.validateUrlSecurity('https://api.github.com/repos');
    assert.equal(safe1.isValid, true);
    assert.equal(safe1.hostname, 'api.github.com');

    const safe2 = autoService.validateUrlSecurity('http://example.org/test?q=1');
    assert.equal(safe2.isValid, true);

    // 2. Localhost & loopback blocked
    assert.throws(
      () => autoService.validateUrlSecurity('http://localhost:3000/admin'),
      /proteção SSRF/
    );
    assert.throws(
      () => autoService.validateUrlSecurity('http://127.0.0.1/secret'),
      /proteção SSRF/
    );

    // 3. Private IP ranges blocked
    assert.throws(
      () => autoService.validateUrlSecurity('http://10.0.0.5/api'),
      /10.0.0.0\/8/
    );
    assert.throws(
      () => autoService.validateUrlSecurity('http://172.16.1.1/dashboard'),
      /172.16.0.0\/12/
    );
    assert.throws(
      () => autoService.validateUrlSecurity('http://192.168.0.100/router'),
      /192.168.0.0\/16/
    );
    assert.throws(
      () => autoService.validateUrlSecurity('http://169.254.169.254/latest/meta-data'),
      /169.254.0.0\/16/
    );

    // 4. Non-HTTP protocols blocked
    assert.throws(
      () => autoService.validateUrlSecurity('file:///etc/passwd'),
      /Apenas protocolos HTTP e HTTPS/
    );
    assert.throws(
      () => autoService.validateUrlSecurity('ftp://files.server.com'),
      /Apenas protocolos HTTP e HTTPS/
    );
  });

  test('Safe Math parser evaluates expressions accurately without eval', () => {
    assert.equal(autoService.safeCalculate('10 + 20'), 30);
    assert.equal(autoService.safeCalculate('(5 + 5) * 4'), 40);
    assert.equal(autoService.safeCalculate('2 ^ 3 + 2'), 10);
    assert.equal(autoService.safeCalculate('100 / 4 - 5'), 20);

    // Division by zero
    assert.throws(
      () => autoService.safeCalculate('50 / 0'),
      /Divisão por zero/
    );

    // Malicious injection attempts
    assert.throws(
      () => autoService.safeCalculate('process.exit(1)'),
      /Expressão matemática inválida/
    );
    assert.throws(
      () => autoService.safeCalculate('require("fs")'),
      /Expressão matemática inválida/
    );
  });

  test('Unit conversions for temperature, distance and digital storage', () => {
    // Temperature
    assert.equal(autoService.convertUnit(0, 'C', 'F'), 32);
    assert.equal(autoService.convertUnit(100, 'C', 'F'), 212);
    assert.equal(autoService.convertUnit(32, 'F', 'C'), 0);

    // Distance
    const miles = autoService.convertUnit(10, 'km', 'mi');
    assert.ok(Math.abs(miles - 6.21371) < 0.001);

    // Storage
    assert.equal(autoService.convertUnit(1024, 'mb', 'gb'), 1);
    assert.equal(autoService.convertUnit(2, 'tb', 'gb'), 2048);
  });

  test('JSON formatting and validation utility', () => {
    const validJson = '{"name":"Cell","version":9}';
    const checkValid = autoService.formatAndValidateJson(validJson);
    assert.equal(checkValid.isValid, true);
    assert.ok(checkValid.formatted.includes('\n'));

    const invalidJson = '{name: without quotes}';
    const checkInvalid = autoService.formatAndValidateJson(invalidJson);
    assert.equal(checkInvalid.isValid, false);
    assert.ok(checkInvalid.error);
  });

  test('Executive server briefing generation', async () => {
    const embed = await autoService.generateServerBriefing(mockGuild);
    assert.ok(embed);
    assert.ok(embed.data.title.includes('Relatório Executivo'));
    assert.ok(embed.data.fields.some(f => f.name.includes('Membros') && f.value.includes('250')));
  });

  test('Friday AI Tools for automations and productivity execute successfully', async () => {
    // 1. agendar_lembrete
    const reminderTool = toolMap.get('agendar_lembrete');
    const remRes = await reminderTool.execute(
      { tempo_segundos: 60, mensagem: 'Reunião de alinhamento' },
      { guild: mockGuild, user: mockUser, automationService: autoService }
    );
    assert.equal(remRes.status, 'sucesso');
    assert.ok(remRes.tarefa_id > 0);

    // 2. criar_tarefa_servidor (missão de equipe com etapas)
    const taskTool = toolMap.get('criar_tarefa_servidor');
    const taskRes = await taskTool.execute(
      {
        titulo: 'Missão Comunitária',
        descricao: 'Engajamento no chat',
        etapas: ['Passo 1', 'Passo 2']
      },
      { guild: mockGuild, user: mockUser, automationService: autoService }
    );
    assert.equal(taskRes.status, 'sucesso');
    assert.equal(taskRes.tipo, 'missao');
    assert.equal(taskRes.total_etapas, 2);

    // 3. consultar_tarefas_pendentes
    const queryTool = toolMap.get('consultar_tarefas_pendentes');
    const queryRes = await queryTool.execute(
      { apenas_minhas: true },
      { guild: mockGuild, user: mockUser, automationService: autoService }
    );
    assert.equal(queryRes.status, 'sucesso');
    assert.ok(queryRes.total >= 1);

    // 4. utilitario_calculo_conversao
    const utilTool = toolMap.get('utilitario_calculo_conversao');
    const calcRes = await utilTool.execute(
      { tipo: 'CALCULO', expressao: '(15 + 5) * 2' },
      { automationService: autoService }
    );
    assert.equal(calcRes.resultado, 40);

    // 5. analisar_seguranca_url
    const urlTool = toolMap.get('analisar_seguranca_url');
    const urlRes = await urlTool.execute(
      { url: 'https://discord.com' },
      { automationService: autoService }
    );
    assert.equal(urlRes.status, 'sucesso');
    assert.equal(urlRes.seguro, true);
  });
});
