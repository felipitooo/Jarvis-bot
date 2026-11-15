const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const { DatabaseManager } = require('../src/database/connection');
const { Migrator } = require('../src/database/migrator');
const { GuildRepository } = require('../src/database/repositories/guildRepository');
const { UserRepository } = require('../src/database/repositories/userRepository');
const { QuizRepository } = require('../src/database/repositories/quizRepository');
const { QuizService } = require('../src/services/quizService');
const { WebPanelService } = require('../src/services/webPanelService');

describe('Quiz Categories, Browser & Duplicate Detector Suite', () => {
  let dbManager;
  let guildRepo;
  let userRepo;
  let quizRepo;
  let quizService;
  let webPanelService;
  const guildId = '123456789012345678';
  const authorId = '987654321098765432';

  before(async () => {
    dbManager = new DatabaseManager(':memory:');
    dbManager.connect();

    const migrator = new Migrator(dbManager);
    await migrator.runPendingMigrations();

    guildRepo = new GuildRepository(dbManager);
    userRepo = new UserRepository(dbManager);
    quizRepo = new QuizRepository(dbManager);
    quizService = new QuizService({ quizRepo });

    guildRepo.upsertGuild({ id: guildId, name: 'Quiz Test Guild' });
    userRepo.upsertUser({ id: authorId, username: 'QuizAuthor' });

    webPanelService = new WebPanelService({
      services: { quizRepo, quizService }
    });
  });

  after(() => {
    if (dbManager) dbManager.close();
  });

  it('creates, lists, resolves, and deletes custom categories', () => {
    // 1. Create custom category
    const cat = quizRepo.createCustomCategory({
      guildId,
      authorId,
      key: 'culinaria',
      name: 'Culinária & Gastronomia',
      emoji: '🍳',
      color: '#E91E63',
      description: 'Perguntas sobre pratos típicos, chefs e temperos.'
    });

    assert.ok(cat.id, 'Category should have an ID');
    assert.strictEqual(cat.key, 'culinaria');
    assert.strictEqual(cat.name, 'Culinária & Gastronomia');
    assert.strictEqual(cat.emoji, '🍳');
    assert.strictEqual(cat.color, '#E91E63');

    // 2. Retrieve custom categories
    const list = quizRepo.getCustomCategories(guildId);
    assert.strictEqual(list.length, 1);
    assert.strictEqual(list[0].key, 'culinaria');

    // 3. Resolve category via service
    const resolved = quizService.resolveCategory('culinaria', guildId);
    assert.strictEqual(resolved, 'culinaria');

    // 4. Check getAllCategories merges built-in + custom
    const allCats = quizService.getAllCategories(guildId);
    assert.ok(allCats.games, 'System category games should exist');
    assert.ok(allCats.geral, 'System category geral should exist');
    assert.ok(allCats.culinaria, 'Custom category culinaria should exist');
    assert.strictEqual(allCats.culinaria.isCustom, true);
    assert.strictEqual(allCats.culinaria.name, 'Culinária & Gastronomia');

    // 5. Delete category by key
    const deleted = quizRepo.deleteCustomCategoryByKey(guildId, 'culinaria');
    assert.strictEqual(deleted, true);

    const afterDelete = quizRepo.getCustomCategories(guildId);
    assert.strictEqual(afterDelete.length, 0);

    const resolvedAfterDelete = quizService.resolveCategory('culinaria', guildId);
    assert.strictEqual(resolvedAfterDelete, 'misto', 'Fallback to misto when custom category does not exist');
  });

  it('updates an existing custom quiz question', () => {
    // 1. Create a question
    const created = quizRepo.createCustomQuestion({
      guildId,
      authorId,
      category: 'series',
      question: 'Qual o codinome de Walter White em Breaking Bad?',
      answers: 'Heisenberg, Walter',
      explanation: 'Walter adotou Heisenberg em tributo ao físico alemão.',
      imageUrl: 'https://example.com/walter.jpg'
    });

    assert.ok(created.id);
    assert.strictEqual(created.question, 'Qual o codinome de Walter White em Breaking Bad?');

    // 2. Update the question
    const updated = quizRepo.updateCustomQuestion(created.id, guildId, {
      category: 'geral',
      question: 'Qual o famoso codinome de Walter White na série Breaking Bad?',
      answers: 'Heisenberg, Heisenberg Walter, Walter',
      explanation: 'Nome inspirado no físico Werner Heisenberg.',
      imageUrl: 'https://example.com/walter-hd.jpg'
    });

    assert.strictEqual(updated.id, created.id);
    assert.strictEqual(updated.category, 'geral');
    assert.strictEqual(updated.question, 'Qual o famoso codinome de Walter White na série Breaking Bad?');
    assert.deepStrictEqual(updated.answers, ['Heisenberg', 'Heisenberg Walter', 'Walter']);
    assert.strictEqual(updated.explanation, 'Nome inspirado no físico Werner Heisenberg.');
    assert.strictEqual(updated.imageUrl, 'https://example.com/walter-hd.jpg');

    // 3. Verify retrieved question matches updates
    const fetched = quizRepo.getCustomQuestionById(created.id, guildId);
    assert.strictEqual(fetched.question, 'Qual o famoso codinome de Walter White na série Breaking Bad?');
  });

  it('getAllQuestions returns combined system and custom question bank', () => {
    // Add two custom questions
    const q1 = quizRepo.createCustomQuestion({
      guildId,
      authorId,
      category: 'games',
      question: 'Qual o protagonista da franquia The Witcher?',
      answers: 'Geralt, Geralt de Rivia',
      explanation: 'Geralt de Rívia, o Bruxo Lobo Branco.'
    });

    const q2 = quizRepo.createCustomQuestion({
      guildId,
      authorId,
      category: 'futebol',
      question: 'Quantas Copas do Mundo o Brasil possui?',
      answers: '5, Cinco, Pentacampeão',
      explanation: 'O Brasil é pentacampeão (1958, 1962, 1970, 1994, 2002).'
    });

    const allQuestions = quizService.getAllQuestions(guildId);

    // There are 151 built-in questions + 3 custom questions (1 from previous test + 2 here) = 154 total
    assert.strictEqual(allQuestions.length, 154);

    const customItems = allQuestions.filter(q => q.isCustom);
    assert.strictEqual(customItems.length, 3);

    const systemItems = allQuestions.filter(q => !q.isCustom);
    assert.strictEqual(systemItems.length, 151);

    // Verify custom question formatting
    const witcher = allQuestions.find(q => q.id === q1.id);
    assert.ok(witcher);
    assert.strictEqual(witcher.isCustom, true);
    assert.strictEqual(witcher.question, 'Qual o protagonista da franquia The Witcher?');
    assert.deepStrictEqual(witcher.answers, ['Geralt', 'Geralt de Rivia']);
  });

  it('webPanelService manages categories and questions with session permissions', () => {
    const adminSession = { userId: authorId, userData: { guilds: [{ id: guildId, owner: true }] } };

    // 1. Create Category via WebPanelService
    const cat = webPanelService.createCustomQuizCategory(adminSession, guildId, {
      name: 'Anime & Otaku',
      key: 'anime-otaku',
      emoji: '⛩️',
      color: '#9B59B6',
      description: 'Quiz sobre animes clássicos e sazonais'
    });
    assert.strictEqual(cat.key, 'anime-otaku');

    // 2. Fetch categories
    const categories = webPanelService.getQuizCategories(adminSession, guildId);
    assert.ok(categories['anime-otaku']);

    // 3. Create question via WebPanelService
    const createdQ = webPanelService.createCustomQuizQuestion(adminSession, guildId, {
      category: 'anime-otaku',
      question: 'Quem é o capitão dos Chapéus de Palha?',
      answers: 'Luffy, Monkey D Luffy',
      explanation: 'Monkey D. Luffy é o capitão do bando.'
    });
    assert.ok(createdQ.id);

    // 4. Update question via WebPanelService
    const updatedQ = webPanelService.updateCustomQuizQuestion(adminSession, guildId, createdQ.id, {
      category: 'anime-otaku',
      question: 'Quem é o capitão do Bando dos Chapéus de Palha em One Piece?',
      answers: 'Luffy, Monkey D. Luffy, Mugiwara',
      explanation: 'Monkey D. Luffy sonha em se tornar o Rei dos Piratas.'
    });
    assert.strictEqual(updatedQ.question, 'Quem é o capitão do Bando dos Chapéus de Palha em One Piece?');

    // 5. List all questions via WebPanelService
    const allQ = webPanelService.getAllQuizQuestions(adminSession, guildId);
    assert.ok(allQ.some(q => q.id === createdQ.id));

    // 6. Delete category via WebPanelService
    const delResult = webPanelService.deleteCustomQuizCategory(adminSession, guildId, cat.id);
    assert.strictEqual(delResult, true);
  });

  it('validates duplicate detection algorithm', () => {
    function normalize(txt) {
      if (!txt) return '';
      return String(txt)
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    }

    const existingQuestions = [
      'Qual o pseudônimo criminoso adotado por Walter White em Breaking Bad?',
      'Qual a capital oficial do Canadá?',
      'Quem pintou a Mona Lisa no Renascimento?'
    ];

    function checkDuplicate(input) {
      const normInput = normalize(input);
      if (normInput.length < 5) return false;
      return existingQuestions.some(existing => {
        const normExisting = normalize(existing);
        if (normExisting === normInput) return true;
        if (normInput.length > 12 && normExisting.length > 12) {
          if (normExisting.includes(normInput) || normInput.includes(normExisting)) {
            return true;
          }
        }
        return false;
      });
    }

    // Exact match with different case and punctuation
    assert.strictEqual(
      checkDuplicate('qual o pseudonimo criminoso adotado por walter white em breaking bad'),
      true,
      'Should detect case/accent insensitive duplicate'
    );

    // Substring match with high overlap
    assert.strictEqual(
      checkDuplicate('Qual a capital oficial do Canadá?'),
      true,
      'Should detect exact match'
    );
    assert.strictEqual(
      checkDuplicate('capital oficial do Canadá'),
      true,
      'Should detect strong substring overlap'
    );

    // Completely new question
    assert.strictEqual(
      checkDuplicate('Qual o maior oceano do planeta Terra?'),
      false,
      'Different question should not trigger duplicate'
    );
  });
});
