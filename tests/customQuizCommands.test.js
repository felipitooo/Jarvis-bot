const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const { DatabaseManager } = require('../src/database/connection');
const { Migrator } = require('../src/database/migrator');
const { GuildRepository } = require('../src/database/repositories/guildRepository');
const { UserRepository } = require('../src/database/repositories/userRepository');
const { QuizRepository } = require('../src/database/repositories/quizRepository');
const { QuizService } = require('../src/services/quizService');
const { prefixCommandHandler } = require('../src/handlers/prefixCommandHandler');

describe('Custom Quiz Commands (+quiz criar, +quiz lista, +quiz deletar)', () => {
  let dbManager;
  let migrator;
  let guildRepo;
  let userRepo;
  let quizRepo;
  let quizService;

  before(async () => {
    dbManager = new DatabaseManager(':memory:');
    dbManager.connect();
    migrator = new Migrator(dbManager);
    await migrator.runPendingMigrations();

    guildRepo = new GuildRepository(dbManager);
    userRepo = new UserRepository(dbManager);
    quizRepo = new QuizRepository(dbManager);

    guildRepo.upsertGuild({ id: 'g_custom_quiz', name: 'Custom Quiz Server' });
    userRepo.upsertUser({ id: 'u_author_1', username: 'TriviaBoss' });

    quizService = new QuizService({
      quizRepo,
      identityService: { getDisplayName: () => 'Jarvis' },
      economyService: null,
      experienceService: null,
      auditService: null
    });
  });

  after(() => {
    dbManager.close();
  });

  it('shows guide when +quiz criar has insufficient arguments', async () => {
    let sentPayload = null;
    const mockMessage = {
      content: '+quiz criar',
      guild: { id: 'g_custom_quiz', name: 'Custom Quiz Server' },
      channel: { id: 'c_general', send: async () => {} },
      author: { id: 'u_author_1', username: 'TriviaBoss' },
      member: { permissions: { has: () => false } },
      attachments: new Map(),
      reply: async (payload) => { sentPayload = payload; }
    };

    const handled = await prefixCommandHandler.handle(mockMessage, {
      quizService,
      identityService: { getDisplayName: () => 'Jarvis' }
    });

    assert.strictEqual(handled, true);
    assert.ok(sentPayload.embeds);
    assert.ok(sentPayload.embeds[0].data.title.includes('Como Criar uma Pergunta'));
  });

  it('creates a custom question via +quiz criar with piped syntax', async () => {
    let sentPayload = null;
    const mockMessage = {
      content: '+quiz criar series | Quem é o vilão principal da 4ª temporada de Stranger Things? | Vecna, Henry Creel, Um | Vecna foi revelado como Henry Creel, o Número Um do laboratório de Hawkins. | https://images.unsplash.com/photo-1518709268805-4e9042af9f23',
      guild: { id: 'g_custom_quiz', name: 'Custom Quiz Server' },
      channel: { id: 'c_general', send: async () => {} },
      author: { id: 'u_author_1', username: 'TriviaBoss' },
      member: { permissions: { has: () => false } },
      attachments: new Map(),
      reply: async (payload) => { sentPayload = payload; }
    };

    const handled = await prefixCommandHandler.handle(mockMessage, {
      quizService,
      identityService: { getDisplayName: () => 'Jarvis' }
    });

    assert.strictEqual(handled, true);
    assert.ok(sentPayload.embeds);
    assert.ok(sentPayload.embeds[0].data.title.includes('Criada com Sucesso'));
    assert.ok(sentPayload.embeds[0].data.description.includes('Vecna'));

    // Verify it is in database
    const questions = quizService.getCustomQuestions('g_custom_quiz');
    assert.strictEqual(questions.length, 1);
    assert.strictEqual(questions[0].category, 'series');
    assert.strictEqual(questions[0].answers.length, 3);
  });

  it('lists custom questions via +quiz lista', async () => {
    let sentPayload = null;
    const mockMessage = {
      content: '+quiz lista',
      guild: { id: 'g_custom_quiz', name: 'Custom Quiz Server' },
      channel: { id: 'c_general', send: async () => {} },
      author: { id: 'u_author_1', username: 'TriviaBoss' },
      member: { permissions: { has: () => false } },
      attachments: new Map(),
      reply: async (payload) => { sentPayload = payload; }
    };

    const handled = await prefixCommandHandler.handle(mockMessage, {
      quizService,
      identityService: { getDisplayName: () => 'Jarvis' }
    });

    assert.strictEqual(handled, true);
    assert.ok(sentPayload.embeds);
    assert.ok(sentPayload.embeds[0].data.title.includes('Perguntas Customizadas do Servidor'));
    assert.ok(sentPayload.embeds[0].data.description.includes('#1'));
  });

  it('deletes custom question via +quiz deletar <id>', async () => {
    let sentPayload = null;
    const mockMessage = {
      content: '+quiz deletar 1',
      guild: { id: 'g_custom_quiz', name: 'Custom Quiz Server' },
      channel: { id: 'c_general', send: async () => {} },
      author: { id: 'u_author_1', username: 'TriviaBoss' },
      member: { permissions: { has: () => false } },
      attachments: new Map(),
      reply: async (payload) => { sentPayload = payload; }
    };

    const handled = await prefixCommandHandler.handle(mockMessage, {
      quizService,
      identityService: { getDisplayName: () => 'Jarvis' }
    });

    assert.strictEqual(handled, true);
    assert.ok(sentPayload.includes('removida com sucesso'));

    const remaining = quizService.getCustomQuestions('g_custom_quiz');
    assert.strictEqual(remaining.length, 0);
  });
});
