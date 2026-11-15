const { test, describe, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { DatabaseManager } = require('../src/database/connection');
const { Migrator } = require('../src/database/migrator');
const { GuildRepository } = require('../src/database/repositories/guildRepository');
const { UserRepository } = require('../src/database/repositories/userRepository');
const { MemoryRepository } = require('../src/database/repositories/memoryRepository');
const { NotesRepository } = require('../src/database/repositories/notesRepository');
const { PermissionService } = require('../src/services/permissionService');
const { ToolRegistry, MissingParameterError } = require('../src/ai/tools/toolRegistry');
const { fridayTools, evaluateSafeMath } = require('../src/ai/tools/fridayTools');
const { PermissionDeniedError, ValidationError } = require('../src/utils/errorHandler');
const { PermissionFlagsBits } = require('discord.js');

describe('AI Tools Catalog & Friday Tool Suite', () => {
  let db;
  let registry;
  let context;

  beforeEach(() => {
    db = new DatabaseManager(':memory:');
    db.connect();
    const migrator = new Migrator(db, path.resolve(__dirname, '../src/database/migrations'));
    migrator.runPendingMigrations();

    const guildRepo = new GuildRepository(db);
    const userRepo = new UserRepository(db);
    const memoryRepo = new MemoryRepository(db);
    const notesRepo = new NotesRepository(db);
    const permissionService = new PermissionService();

    guildRepo.upsertGuild({ id: 'guild_test', name: 'Test Guild' });
    userRepo.upsertUser({ id: 'user_regular', username: 'RegularUser' });
    userRepo.upsertUser({ id: 'user_admin', username: 'AdminUser' });

    registry = new ToolRegistry();
    for (const tool of fridayTools) {
      registry.register(tool);
    }

    context = {
      guildId: 'guild_test',
      user: { id: 'user_regular', username: 'RegularUser' },
      member: {
        id: 'user_regular',
        guild: { ownerId: 'other_owner' },
        permissions: {
          has: (bit) => bit === PermissionFlagsBits.SendMessages
        }
      },
      memoryRepo,
      notesRepo,
      permissionService
    };
  });

  afterEach(() => {
    db.close();
  });

  test('should throw MissingParameterError when required tool parameters are omitted', async () => {
    await assert.rejects(
      async () => {
        await registry.execute('salvar_memoria', { chave: 'teste' }, context);
      },
      (err) => {
        assert.ok(err instanceof MissingParameterError);
        assert.deepEqual(err.missingParams, ['valor']);
        return true;
      }
    );
  });

  test('should enforce permissions and reject unauthorized calls to administrative tools', async () => {
    await assert.rejects(
      async () => {
        // user_regular does NOT have ManageGuild permission
        await registry.execute('salvar_memoria_servidor', { chave: 'anuncio', valor: 'teste' }, context);
      },
      PermissionDeniedError
    );
  });

  test('safe math evaluator calculates expressions accurately without eval', () => {
    assert.equal(evaluateSafeMath('10 + 5 * 2'), 20);
    assert.equal(evaluateSafeMath('(10 + 5) * 2'), 30);
    assert.equal(evaluateSafeMath('2 ^ 3 + 4 / 2'), 10);
    assert.equal(evaluateSafeMath('10 % 3'), 1);
    assert.equal(evaluateSafeMath('-(4 * 2) + 10'), 2);

    // Division by zero throws ValidationError
    assert.throws(() => evaluateSafeMath('10 / 0'), ValidationError);

    // Arbitrary text / code injection attempts are rejected
    assert.throws(() => evaluateSafeMath('process.exit(1)'), ValidationError);
    assert.throws(() => evaluateSafeMath('alert(1)'), ValidationError);
  });

  test('formatar_e_validar_json validates and formats valid JSON', async () => {
    const valid = await registry.execute('formatar_e_validar_json', { json_string: '{"a":1,"b":[2,3]}' }, context);
    assert.equal(valid.status, 'valido');
    assert.ok(valid.formatado.includes('  "a": 1'));

    const invalid = await registry.execute('formatar_e_validar_json', { json_string: '{invalid json}' }, context);
    assert.equal(invalid.status, 'invalido');
    assert.ok(invalid.erro);
  });

  test('gerar_arquivo_anexo creates safe file and enforces type and size limits', async () => {
    const fileResult = await registry.execute('gerar_arquivo_anexo', {
      nome_arquivo: 'relatorio',
      tipo: 'txt',
      conteudo: 'Conteúdo seguro de teste'
    }, context);

    assert.equal(fileResult.status, 'sucesso');
    assert.equal(fileResult.filename, 'relatorio.txt');
    assert.equal(fileResult.isAttachment, true);

    // Rejects disallowed file types
    await assert.rejects(async () => {
      await registry.execute('gerar_arquivo_anexo', {
        nome_arquivo: 'virus',
        tipo: 'exe',
        conteudo: 'bad'
      }, context);
    }, ValidationError);

    // Rejects content exceeding 100KB
    const giantContent = 'x'.repeat(101 * 1024);
    await assert.rejects(async () => {
      await registry.execute('gerar_arquivo_anexo', {
        nome_arquivo: 'gigante',
        tipo: 'txt',
        conteudo: giantContent
      }, context);
    }, ValidationError);
  });

  test('AIOrchestrator injects guild and server services into tool execution context and synthesizes natural response', async () => {
    const { AIOrchestrator } = require('../src/ai/orchestrator');
    const { XpRepository } = require('../src/database/repositories/xpRepository');
    const { xpTools } = require('../src/ai/tools/xpTools');

    for (const tool of xpTools) {
      if (!registry.has(tool.name)) registry.register(tool);
    }

    const xpRepo = new XpRepository(db);
    xpRepo.setMemberXp('guild_test', 'user_admin', 1500, 5);
    xpRepo.setMemberXp('guild_test', 'user_regular', 800, 3);

    let callCount = 0;
    const fakeLlm = {
      mockMode: false,
      currentKeyIndex: 0,
      async generate({ tools }) {
        callCount++;
        if (callCount === 1 && tools && tools.length > 0) {
          return {
            text: '',
            toolCalls: [{ name: 'consultar_ranking_servidor', args: { limite: 3, tipo: 'SEMANAL' } }]
          };
        }
        return {
          text: 'Certamente, senhor. O Top 3 do servidor é liderado por AdminUser (Nível 5) e RegularUser (Nível 3).'
        };
      }
    };

    const orchestrator = new AIOrchestrator({
      llmAdapter: fakeLlm,
      toolRegistry: registry,
      memoryRepo: context.memoryRepo,
      notesRepo: context.notesRepo,
      identityService: { getDisplayName: () => 'J.A.R.V.I.S' },
      permissionService: context.permissionService,
      auditService: null,
      services: {
        xpRepository: xpRepo,
        xpRepo
      }
    });

    const mockGuild = {
      id: 'guild_test',
      name: 'Test Guild',
      members: {
        cache: new Map([
          ['user_admin', { id: 'user_admin', displayName: 'AdminUser', user: { username: 'AdminUser' } }],
          ['user_regular', { id: 'user_regular', displayName: 'RegularUser', user: { username: 'RegularUser' } }]
        ])
      }
    };

    const res = await orchestrator.processMessage({
      guildId: 'guild_test',
      guildName: 'Test Guild',
      guild: mockGuild,
      channelId: 'chan_1',
      user: { id: 'user_regular', username: 'RegularUser' },
      member: context.member,
      rawMessageText: 'me fale o top 3'
    });

    assert.ok(!res.text.includes('Requer servidor'));
    assert.ok(res.text.includes('Top 3 do servidor'));
    assert.equal(callCount, 2);
  });
});
