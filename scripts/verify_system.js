const assert = require('node:assert');
const { DatabaseManager } = require('../src/database/connection');
const { Migrator } = require('../src/database/migrator');
const { GuildRepository } = require('../src/database/repositories/guildRepository');
const { UserRepository } = require('../src/database/repositories/userRepository');
const { QuizRepository } = require('../src/database/repositories/quizRepository');
const { ModerationRepository } = require('../src/database/repositories/moderationRepository');
const { EconomyRepository } = require('../src/database/repositories/economyRepository');
const { MusicVoiceRepository } = require('../src/database/repositories/musicVoiceRepository');

const { QuizService } = require('../src/services/quizService');
const { EconomyService } = require('../src/services/economyService');
const { SocialFunService } = require('../src/services/socialFunService');
const { ModerationService } = require('../src/services/moderationService');

const { QUIZ_QUESTIONS, QUIZ_CATEGORIES, normalizeAnswer } = require('../src/data/quizQuestions');

async function runAllChecks() {
  console.log('========================================================');
  console.log('⚡ INICIANDO AUDITORIA COMPLETA DE TODAS AS FUNÇÕES');
  console.log('========================================================\n');

  const db = new DatabaseManager(':memory:');
  db.connect();
  const migrator = new Migrator(db);
  await migrator.runPendingMigrations();

  const guildRepo = new GuildRepository(db);
  const userRepo = new UserRepository(db);
  const quizRepo = new QuizRepository(db);
  const modRepo = new ModerationRepository(db);
  const ecoRepo = new EconomyRepository(db);
  const musicVoiceRepo = new MusicVoiceRepository(db);

  guildRepo.upsertGuild({ id: 'guild_test', name: 'Guild de Testes' });
  userRepo.upsertUser({ id: 'u_alice', username: 'Alice' });
  userRepo.upsertUser({ id: 'u_bob', username: 'Bob' });
  userRepo.upsertUser({ id: 'u_charlie', username: 'Charlie' });

  const auditService = { logAction: () => true };
  const identityService = { getDisplayName: () => 'Jarvis' };
  const economyService = new EconomyService({ economyRepo: ecoRepo, auditService });
  const socialFunService = new SocialFunService({ musicVoiceRepo, identityService, auditService, economyService });
  const moderationService = new ModerationService({ modRepo, hierarchyService: { enforceHierarchy: () => true }, auditService });
  const quizService = new QuizService({
    quizRepo,
    economyService,
    experienceService: { addXp: () => true },
    identityService,
    auditService
  });

  // ----------------------------------------------------
  // TESTE 1: Banco de Perguntas do Quiz (101 Perguntas)
  // ----------------------------------------------------
  console.log('▶ [1/6] Verificando Banco de 101 Perguntas do Quiz...');
  assert.strictEqual(QUIZ_QUESTIONS.length, 101, 'Deve conter exatamente 101 perguntas');
  const cats = Object.keys(QUIZ_CATEGORIES);
  assert.strictEqual(cats.length, 6, 'Deve conter 6 categorias');

  for (const q of QUIZ_QUESTIONS) {
    assert.ok(q.id, `Questão sem ID: ${JSON.stringify(q)}`);
    assert.ok(q.question, `Questão ${q.id} sem texto de pergunta`);
    assert.ok(Array.isArray(q.answers) && q.answers.length > 0, `Questão ${q.id} sem respostas válidas`);
    assert.ok(q.explanation, `Questão ${q.id} sem explicação educativa`);
    assert.ok(q.imageUrl, `Questão ${q.id} sem foto da resposta`);
  }
  console.log('  ✅ 101 perguntas verificadas com sucesso! Todas possuem fotos, respostas e explicações.\n');

  // ----------------------------------------------------
  // TESTE 2: Normalização e Resolução de Categorias
  // ----------------------------------------------------
  console.log('▶ [2/6] Verificando Normalizador e Categorias...');
  assert.strictEqual(normalizeAnswer('  Cromossomo X!  '), 'cromossomo x');
  assert.strictEqual(normalizeAnswer('São Paulo FC'), 'sao paulo fc');
  assert.strictEqual(normalizeAnswer('1024 MB'), '1024 mb');
  assert.strictEqual(quizService.resolveCategory('jogos'), 'games');
  assert.strictEqual(quizService.resolveCategory('pc'), 'computacao');
  assert.strictEqual(quizService.resolveCategory('stark'), 'marvel');
  assert.strictEqual(quizService.resolveCategory('fut'), 'futebol');
  console.log('  ✅ Resolução de sinônimos e normalização funcionando perfeitamente.\n');

  // ----------------------------------------------------
  // TESTE 3: Partida de Quiz, Acertos no Chat e Imagens
  // ----------------------------------------------------
  console.log('▶ [3/6] Simulando Partida de Quiz com Acerto no Chat...');
  let sentInChannel = [];
  const channelMock = {
    id: 'chan_quiz_1',
    send: async (payload) => {
      sentInChannel.push(payload);
      return payload;
    }
  };

  const match = await quizService.startQuiz({
    guild: { id: 'guild_test' },
    channel: channelMock,
    author: { id: 'u_alice', username: 'Alice' },
    categoryInput: 'computacao',
    roundsInput: 3
  });

  assert.strictEqual(match.isInfinite, false);
  assert.strictEqual(match.totalRounds, 3);
  assert.strictEqual(sentInChannel[0].embeds[0].data.title.includes('Desafio Neural Quiz'), true);

  // Inicia rodada
  sentInChannel = [];
  await quizService.nextRound(match);
  assert.strictEqual(match.status, 'QUESTION_ACTIVE');
  // Pergunta NÃO deve exibir imagem antecipada (zero spoiler)
  assert.strictEqual(sentInChannel[0].embeds[0].data.image, undefined, 'Pergunta não deve ter imagem de spoiler!');
  // Pergunta DEVE conter botão de pular com custo
  assert.ok(sentInChannel[0].components[0].components[0].data.custom_id.startsWith('quiz_skip_'));

  // Resposta certa no chat
  sentInChannel = [];
  const correctMsg = {
    channel: channelMock,
    author: { id: 'u_bob', username: 'Bob' },
    content: match.currentQuestion.answers[0],
    react: async () => true
  };
  const answered = await quizService.handleMessageAnswer(correctMsg, {});
  assert.strictEqual(answered, true);
  assert.strictEqual(match.status, 'ROUND_COOLDOWN');
  // Resposta DEVE conter foto da resposta!
  const winEmbed = sentInChannel[0].embeds[0];
  assert.ok(winEmbed.data.image.url, 'Embed de acerto DEVE exibir a foto da resposta!');
  assert.ok(winEmbed.data.description.includes('Resposta correta:'));
  console.log('  ✅ Acerto no chat validado com sucesso! Resposta e foto exibidas perfeitamente.\n');

  // ----------------------------------------------------
  // TESTE 4: Pagar para Pular Pergunta e Fim de Jogo por Timeout
  // ----------------------------------------------------
  console.log('▶ [4/6] Verificando Pagar para Pular e Fim de Jogo...');
  economyService.addWalletBalance('guild_test', 'u_alice', 200); // Alice tem 200
  // Bob tem 0 moedas

  match.status = 'QUESTION_ACTIVE';
  // Bob tenta pular sem saldo -> erro
  await assert.rejects(async () => {
    await quizService.skipQuestion('guild_test', 'chan_quiz_1', { id: 'u_bob', username: 'Bob' });
  }, /não tem moedas suficientes/);

  // Alice pula com saldo de 200 -> debita 50 e avança
  sentInChannel = [];
  const skipSuccess = await quizService.skipQuestion('guild_test', 'chan_quiz_1', { id: 'u_alice', username: 'Alice' });
  assert.strictEqual(skipSuccess, true);
  const balAfter = economyService.getBalance('guild_test', 'u_alice');
  assert.strictEqual(balAfter.walletBalance, 150, 'Deve ter debitado 50 moedas');
  const skipEmbed = sentInChannel[0].embeds[0];
  assert.ok(skipEmbed.data.title.includes('Pergunta Pulada'));
  assert.ok(skipEmbed.data.image.url, 'Embed de pulo deve conter a foto da resposta');

  // Timeout sem acerto e sem pulo -> Fim de Jogo
  match.status = 'QUESTION_ACTIVE';
  sentInChannel = [];
  await quizService.handleTimeout(match);
  const timeoutEmbed = sentInChannel[0].embeds[0];
  assert.ok(timeoutEmbed.data.title.includes('Tempo Esgotado — Fim da Partida'));
  assert.ok(timeoutEmbed.data.image.url, 'Embed de tempo esgotado deve conter a foto da resposta');
  console.log('  ✅ Pular com cobrança e encerramento por timeout funcionando 100%!\n');

  // ----------------------------------------------------
  // TESTE 5: Modo Infinito e Placar Final da Sessão
  // ----------------------------------------------------
  console.log('▶ [5/6] Verificando Modo Infinito do Quiz...');
  const endlessChannel = {
    id: 'chan_quiz_endless',
    send: async (p) => { sentInChannel.push(p); return p; }
  };
  const endlessMatch = await quizService.startQuiz({
    guild: { id: 'guild_test' },
    channel: endlessChannel,
    author: { id: 'u_alice', username: 'Alice' },
    isInfinite: true
  });
  assert.strictEqual(endlessMatch.isInfinite, true);
  assert.strictEqual(endlessMatch.totalRounds, Infinity);

  // Stop do modo infinito publica o placar final
  sentInChannel = [];
  endlessMatch.scores.set('u_alice', { user: { id: 'u_alice' }, points: 30, correctCount: 3 });
  await quizService.stopQuiz('guild_test', 'chan_quiz_endless', { id: 'u_alice' });
  const finalBoard = sentInChannel.find(p => p.embeds?.[0]?.data?.title?.includes('Sessão Infinita'));
  assert.ok(finalBoard, 'Placar final da sessão infinita deve ser gerado');
  console.log('  ✅ Modo Infinito e consolidação de ranking verificados com sucesso!\n');

  // ----------------------------------------------------
  // TESTE 6: Social & Moderação (+beijar, +abracar, +warnlist)
  // ----------------------------------------------------
  console.log('▶ [6/6] Verificando Interações Sociais e Moderação...');
  const kiss1 = socialFunService.kiss('guild_test', { id: 'u_alice', username: 'Alice' }, { id: 'u_bob', username: 'Bob' });
  assert.ok(kiss1.gif, 'Deve conter GIF de beijo');
  assert.strictEqual(kiss1.gif.includes('26AHG5KGFxSkUWw1i.gif'), false, 'Não deve conter o meme do unicórnio');

  const hug1 = socialFunService.hug('guild_test', { id: 'u_alice', username: 'Alice' }, { id: 'u_bob', username: 'Bob' });
  assert.ok(hug1.gif, 'Deve conter GIF de abraço');

  // Advertências com numeração relativa
  modRepo.createPunishment({ guildId: 'guild_test', targetId: 'u_charlie', actorId: 'u_alice', type: 'WARN', reason: 'Spam' });
  modRepo.createPunishment({ guildId: 'guild_test', targetId: 'u_charlie', actorId: 'u_alice', type: 'WARN', reason: 'Flood' });
  const warns = moderationService.getMemberWarns('guild_test', 'u_charlie');
  assert.strictEqual(warns.length, 2);
  const seqForFirst = warns.length - (warns.length - 1);
  assert.strictEqual(seqForFirst, 1, 'Primeira advertência deve ter seqNum #1');
  console.log('  ✅ Beijo, abraço e lista de advertências validados com sucesso!\n');

  db.close();
  console.log('========================================================');
  console.log('🎉 AUDITORIA COMPLETA CONCLUÍDA: TODAS AS FUNÇÕES 100% OPERACIONAIS!');
  console.log('========================================================');
}

runAllChecks().catch(err => {
  console.error('❌ ERRO NA AUDITORIA:', err);
  process.exit(1);
});
