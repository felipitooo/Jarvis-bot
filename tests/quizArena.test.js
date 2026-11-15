const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const { DatabaseManager } = require('../src/database/connection');
const { Migrator } = require('../src/database/migrator');
const { GuildRepository } = require('../src/database/repositories/guildRepository');
const { UserRepository } = require('../src/database/repositories/userRepository');
const { QuizRepository } = require('../src/database/repositories/quizRepository');
const { QuizService } = require('../src/services/quizService');
const { normalizeAnswer, QUIZ_CATEGORIES, QUIZ_QUESTIONS } = require('../src/data/quizQuestions');

describe('J.A.R.V.I.S. Quiz Arena & Neural Challenge', () => {
  let dbManager;
  let migrator;
  let guildRepo;
  let userRepo;
  let quizRepo;
  let quizService;
  let userCoins;

  before(async () => {
    dbManager = new DatabaseManager(':memory:');
    dbManager.connect();
    migrator = new Migrator(dbManager);
    await migrator.runPendingMigrations();

    guildRepo = new GuildRepository(dbManager);
    userRepo = new UserRepository(dbManager);
    quizRepo = new QuizRepository(dbManager);

    guildRepo.upsertGuild({ id: 'g_quiz', name: 'Quiz Guild' });
    userRepo.upsertUser({ id: 'u_p1', username: 'GamerPlayer' });
    userRepo.upsertUser({ id: 'u_p2', username: 'AnimeMaster' });

    userCoins = { u_p1: 100, u_p2: 10 };

    quizService = new QuizService({
      quizRepo,
      economyService: {
        getBalance: (gId, uId) => ({ walletBalance: userCoins[uId] ?? 0 }),
        addWalletBalance: (gId, uId, amt) => {
          userCoins[uId] = (userCoins[uId] ?? 0) + amt;
          return true;
        },
        removeWalletBalance: (gId, uId, amt) => {
          if ((userCoins[uId] ?? 0) < amt) {
            throw new Error(`Saldo insuficiente na carteira para pagar ${amt} moedas.`);
          }
          userCoins[uId] -= amt;
          return true;
        }
      },
      experienceService: {
        addXp: (gId, uId, xp) => true
      },
      identityService: {
        getDisplayName: () => 'Jarvis'
      },
      auditService: {
        logAction: () => true
      }
    });
  });

  after(() => {
    dbManager.close();
  });

  it('normalizes answers accurately ignoring accents, punctuation and case', () => {
    assert.strictEqual(normalizeAnswer('Três'), 'tres');
    assert.strictEqual(normalizeAnswer('3'), '3');
    assert.strictEqual(normalizeAnswer('Summoner\'s Rift!'), 'summoners rift');
    assert.strictEqual(normalizeAnswer('  Cromossomo X  '), 'cromossomo x');
    assert.strictEqual(normalizeAnswer('MARACANÃ'), 'maracana');
  });

  it('resolves category aliases to official category keys', () => {
    assert.strictEqual(quizService.resolveCategory('jogos'), 'games');
    assert.strictEqual(quizService.resolveCategory('videogame'), 'games');
    assert.strictEqual(quizService.resolveCategory('anime'), 'animes');
    assert.strictEqual(quizService.resolveCategory('manga'), 'animes');
    assert.strictEqual(quizService.resolveCategory('futeboll'), 'futebol');
    assert.strictEqual(quizService.resolveCategory('ciencias'), 'geral');
    assert.strictEqual(quizService.resolveCategory('computacao'), 'computacao');
    assert.strictEqual(quizService.resolveCategory('programação'), 'computacao');
    assert.strictEqual(quizService.resolveCategory('hardware'), 'computacao');
    assert.strictEqual(quizService.resolveCategory('pc'), 'computacao');
    assert.strictEqual(quizService.resolveCategory('dev'), 'computacao');
    assert.strictEqual(quizService.resolveCategory('stark'), 'marvel');
    assert.strictEqual(quizService.resolveCategory('series'), 'series');
    assert.strictEqual(quizService.resolveCategory('cinema'), 'series');
    assert.strictEqual(quizService.resolveCategory('musica'), 'musica');
    assert.strictEqual(quizService.resolveCategory('mitologia'), 'mitologia');
    assert.strictEqual(quizService.resolveCategory('desenhos'), 'desenhos');
    assert.strictEqual(quizService.resolveCategory('geografia'), 'geografia');
    assert.strictEqual(quizService.resolveCategory('desconhecido'), 'misto');
  });

  it('verifies question bank coverage across all 11 categories', () => {
    const cats = Object.keys(QUIZ_CATEGORIES);
    assert.strictEqual(cats.length, 11);
    assert.ok(cats.includes('computacao'));
    assert.ok(cats.includes('series'));
    assert.ok(cats.includes('musica'));
    assert.ok(cats.includes('mitologia'));
    assert.ok(cats.includes('desenhos'));
    assert.ok(cats.includes('geografia'));

    for (const cat of cats) {
      const qList = QUIZ_QUESTIONS.filter(q => q.category === cat);
      assert.ok(qList.length >= 5, `Category ${cat} should have at least 5 questions, found ${qList.length}`);
      for (const q of qList) {
        assert.ok(q.question, 'Question text must not be empty');
        assert.ok(Array.isArray(q.answers) && q.answers.length > 0, 'Must have acceptable answers');
        assert.ok(q.explanation, 'Must have educational explanation');
        assert.ok(q.imageUrl, 'Must have answer illustration image');
      }
    }
  });

  it('quiz repository stores and retrieves config and user stats', () => {
    const defaultConfig = quizRepo.getQuizConfig('g_quiz');
    assert.strictEqual(defaultConfig.rewardCoins, 200);
    assert.strictEqual(defaultConfig.defaultRounds, 5);

    quizRepo.saveQuizConfig('g_quiz', { rewardCoins: 500, defaultRounds: 10 });
    const updated = quizRepo.getQuizConfig('g_quiz');
    assert.strictEqual(updated.rewardCoins, 500);
    assert.strictEqual(updated.defaultRounds, 10);

    // Record correct answers and match win
    quizRepo.addCorrectAnswer('g_quiz', 'u_p1', 10);
    quizRepo.addCorrectAnswer('g_quiz', 'u_p1', 10);
    quizRepo.addCorrectAnswer('g_quiz', 'u_p2', 10);
    quizRepo.recordMatchWin('g_quiz', 'u_p1');

    const scoreP1 = quizRepo.getUserScore('g_quiz', 'u_p1');
    assert.strictEqual(scoreP1.totalPoints, 20);
    assert.strictEqual(scoreP1.totalCorrect, 2);
    assert.strictEqual(scoreP1.gamesWon, 1);

    const leaderboard = quizRepo.getLeaderboard('g_quiz', 5);
    assert.strictEqual(leaderboard.length, 2);
    assert.strictEqual(leaderboard[0].userId, 'u_p1');
    assert.strictEqual(leaderboard[0].rank, 1);
  });

  it('manages match lifecycle and answers in chat correctly', async () => {
    const channelMock = {
      id: 'c_test_quiz',
      send: async (payload) => payload
    };

    const authorMock = { id: 'u_p1', username: 'GamerPlayer' };

    // Start match
    const match = await quizService.startQuiz({
      guild: { id: 'g_quiz', name: 'Quiz Guild' },
      channel: channelMock,
      author: authorMock,
      categoryInput: 'geral',
      roundsInput: 3
    });

    assert.ok(quizService.hasActiveQuiz('c_test_quiz'));

    // Duplicate match in same channel should throw
    await assert.rejects(async () => {
      await quizService.startQuiz({
        guild: { id: 'g_quiz', name: 'Quiz Guild' },
        channel: channelMock,
        author: authorMock
      });
    }, /Já existe uma partida de Quiz em andamento/);

    // Force set current question
    match.currentQuestion = {
      id: 'q_test',
      category: 'geral',
      question: 'Quantos filmes há numa trilogia?',
      answers: ['3', 'tres', 'três'],
      explanation: 'Trilogia é um conjunto de três obras.'
    };
    match.status = 'QUESTION_ACTIVE';
    match.questionStartTime = Date.now() - 1500;

    // Wrong answer should return false
    const wrongMsg = {
      channel: { id: 'c_test_quiz' },
      author: { id: 'u_p2', username: 'AnimeMaster' },
      content: 'quatro',
      react: async () => {}
    };
    const wrongHandled = await quizService.handleMessageAnswer(wrongMsg, {});
    assert.strictEqual(wrongHandled, false);

    // Correct answer should return true and register score
    const correctMsg = {
      channel: { id: 'c_test_quiz', send: async () => {} },
      author: { id: 'u_p2', username: 'AnimeMaster' },
      content: '3',
      react: async () => {}
    };
    const correctHandled = await quizService.handleMessageAnswer(correctMsg, {});
    assert.strictEqual(correctHandled, true);
    assert.strictEqual(match.status, 'ROUND_COOLDOWN');

    const scores = quizService.getCurrentScores('c_test_quiz');
    assert.strictEqual(scores.length, 1);
    assert.strictEqual(scores[0].user.id, 'u_p2');
    assert.strictEqual(scores[0].points, 10);

    // Stop quiz manually
    await quizService.stopQuiz('g_quiz', 'c_test_quiz', authorMock);
    assert.strictEqual(quizService.hasActiveQuiz('c_test_quiz'), false);
  });

  it('runs infinite mode without round limits and finalizes session on stop', async () => {
    let sentEmbeds = [];
    const endlessChannelMock = {
      id: 'c_endless_quiz',
      send: async (payload) => {
        if (payload?.embeds) sentEmbeds.push(...payload.embeds);
        return payload;
      }
    };
    const authorMock = { id: 'u_p1', username: 'GamerPlayer' };

    // 1. Start with isInfinite: true
    const endlessMatch = await quizService.startQuiz({
      guild: { id: 'g_quiz', name: 'Quiz Guild' },
      channel: endlessChannelMock,
      author: authorMock,
      categoryInput: 'computacao',
      isInfinite: true
    });

    assert.strictEqual(endlessMatch.isInfinite, true);
    assert.strictEqual(endlessMatch.totalRounds, Infinity);
    assert.strictEqual(endlessMatch.category, 'computacao');

    // Verify start embed mentioned Modo Infinito
    const startEmbed = sentEmbeds[0];
    assert.ok(startEmbed.data.title.includes('Modo Infinito'));

    // Advance to round 1
    sentEmbeds = [];
    await quizService.nextRound(endlessMatch);
    assert.strictEqual(endlessMatch.currentRound, 1);
    assert.ok(sentEmbeds[0].data.title.includes('♾️ Modo Infinito'));
    assert.ok(sentEmbeds[0].data.title.includes('Rodada #1'));

    // Simulate answering correctly
    const correctMsg = {
      channel: endlessChannelMock,
      author: { id: 'u_p1', username: 'GamerPlayer' },
      content: endlessMatch.currentQuestion.answers[0],
      react: async () => {}
    };
    const answered = await quizService.handleMessageAnswer(correctMsg, {});
    assert.strictEqual(answered, true);

    const scores = quizService.getCurrentScores('c_endless_quiz');
    assert.strictEqual(scores[0].points, 10);

    // Stop infinite match manually and verify final scoreboard embed
    sentEmbeds = [];
    await quizService.stopQuiz('g_quiz', 'c_endless_quiz', authorMock);
    assert.strictEqual(quizService.hasActiveQuiz('c_endless_quiz'), false);

    const finalBoard = sentEmbeds.find(e => e.data.title && e.data.title.includes('Sessão Infinita'));
    assert.ok(finalBoard, 'Final infinite scoreboard must be published');
    assert.ok(finalBoard.data.description.includes('GamerPlayer') || finalBoard.data.description.includes('u_p1'));
  });

  it('handles question skip with fee and terminates match when unanswered and unskipped', async () => {
    let sentEmbeds = [];
    const channelMock = {
      id: 'c_skip_quiz',
      send: async (payload) => {
        if (payload?.embeds) sentEmbeds.push(...payload.embeds);
        return payload;
      }
    };
    const playerRich = { id: 'u_rich', username: 'RichPlayer' };
    const playerBroke = { id: 'u_broke', username: 'BrokePlayer' };
    userCoins['u_rich'] = 200;
    userCoins['u_broke'] = 10;

    // 1. Start match
    const match = await quizService.startQuiz({
      guild: { id: 'g_quiz', name: 'Quiz Guild' },
      channel: channelMock,
      author: playerRich,
      categoryInput: 'games',
      roundsInput: 5
    });

    await quizService.nextRound(match);
    assert.strictEqual(match.status, 'QUESTION_ACTIVE');

    // Broke user attempts to skip -> throws insufficient coins
    await assert.rejects(async () => {
      await quizService.skipQuestion('g_quiz', 'c_skip_quiz', playerBroke);
    }, /não tem moedas suficientes/);

    // Rich user skips question -> succeeds and moves to cooldown
    const skipSuccess = await quizService.skipQuestion('g_quiz', 'c_skip_quiz', playerRich);
    assert.strictEqual(skipSuccess, true);
    assert.strictEqual(match.status, 'ROUND_COOLDOWN');

    const skipEmbed = sentEmbeds.find(e => e.data.title && e.data.title.includes('Pergunta Pulada'));
    assert.ok(skipEmbed, 'Must publish skip notification embed');

    // Set active again and test timeout ending the match
    match.status = 'QUESTION_ACTIVE';
    sentEmbeds = [];
    await quizService.handleTimeout(match);

    const timeoutEmbed = sentEmbeds.find(e => e.data.title && e.data.title.includes('Tempo Esgotado'));
    assert.ok(timeoutEmbed, 'Must publish timeout termination embed');
    assert.ok(timeoutEmbed.data.description.includes('encerrada') || timeoutEmbed.data.description.includes('acabou'));
  });

  it('supports custom quiz question creation, listing, retrieval and deletion', async () => {
    // 1. Create custom question via quizService
    const created = quizService.createCustomQuestion({
      guildId: 'g_quiz',
      authorId: 'u_p1',
      category: 'series',
      question: 'Qual o apelido do Walter White em Breaking Bad?',
      answers: ['Heisenberg', 'Walter Heisenberg', 'O Heisenberg'],
      explanation: 'Ele escolheu o nome em homenagem ao físico Werner Heisenberg.',
      imageUrl: 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809'
    });

    assert.ok(created.id, 'Must return generated ID');
    assert.strictEqual(created.category, 'series');
    assert.strictEqual(created.question, 'Qual o apelido do Walter White em Breaking Bad?');
    assert.strictEqual(created.answers.length, 3);
    assert.ok(created.answers.includes('Heisenberg'));
    assert.strictEqual(created.isCustom, true);

    // 2. Retrieve list
    const list = quizService.getCustomQuestions('g_quiz');
    assert.ok(list.length >= 1);
    const found = list.find(q => q.id === created.id);
    assert.ok(found);
    assert.strictEqual(found.authorId, 'u_p1');

    // 3. Filter by category
    const seriesList = quizService.getCustomQuestions('g_quiz', 'series');
    assert.ok(seriesList.length >= 1);

    const footballList = quizService.getCustomQuestions('g_quiz', 'futebol');
    assert.strictEqual(footballList.length, 0);

    // 4. Retrieve by ID
    const single = quizService.getCustomQuestionById(created.id, 'g_quiz');
    assert.strictEqual(single.id, created.id);

    // 5. Delete question
    quizService.deleteCustomQuestion(created.id, 'g_quiz');
    const afterDelete = quizService.getCustomQuestionById(created.id, 'g_quiz');
    assert.strictEqual(afterDelete, null);
  });

  it('enforces anti-farming rule: coins are only awarded if 2 or more players scored', async () => {
    let sentEmbeds = [];
    const channelMock = {
      id: 'c_antifarm_quiz',
      send: async (payload) => {
        if (payload?.embeds) sentEmbeds.push(...payload.embeds);
        return payload;
      }
    };
    userCoins['u_solo'] = 0;
    userCoins['u_multi1'] = 0;
    userCoins['u_multi2'] = 0;

    // SCENARIO A: Solo match (only 1 player scores)
    const soloMatch = {
      guildId: 'g_quiz',
      channelId: 'c_antifarm_quiz',
      channel: channelMock,
      category: 'geral',
      catInfo: { name: 'Geral', color: 0x57F287, emoji: '🧠' },
      totalRounds: 3,
      currentRound: 3,
      isInfinite: false,
      scores: new Map([
        ['u_solo', { user: { id: 'u_solo' }, points: 30, correctCount: 3 }]
      ]),
      config: { rewardCoins: 500, rewardXp: 100 }
    };

    sentEmbeds = [];
    await quizService.endMatch(soloMatch);

    // Solo winner should NOT receive coins!
    assert.strictEqual(userCoins['u_solo'], 0, 'Solo player should not receive coin jackpot');
    const soloBoard = sentEmbeds[0];
    assert.ok(soloBoard.data.description.includes('Aviso de Premiação') || soloBoard.data.description.includes('2 ou mais'));

    // SCENARIO B: Multi-player match (2 distinct players score)
    const multiMatch = {
      guildId: 'g_quiz',
      channelId: 'c_antifarm_quiz',
      channel: channelMock,
      category: 'geral',
      catInfo: { name: 'Geral', color: 0x57F287, emoji: '🧠' },
      totalRounds: 3,
      currentRound: 3,
      isInfinite: false,
      scores: new Map([
        ['u_multi1', { user: { id: 'u_multi1' }, points: 20, correctCount: 2 }],
        ['u_multi2', { user: { id: 'u_multi2' }, points: 10, correctCount: 1 }]
      ]),
      config: { rewardCoins: 500, rewardXp: 100 }
    };

    sentEmbeds = [];
    await quizService.endMatch(multiMatch);

    // Multi-player match winner MUST receive the 500 coins!
    assert.strictEqual(userCoins['u_multi1'], 500, 'Multi-player match winner must receive coin jackpot');
    const multiBoard = sentEmbeds[0];
    assert.ok(multiBoard.data.description.includes('500 moedas'));
  });
});
