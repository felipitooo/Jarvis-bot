const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { logger } = require('../utils/logger');
const { QUIZ_CATEGORIES, QUIZ_QUESTIONS, normalizeAnswer } = require('../data/quizQuestions');

const quizLogger = logger.forContext('QuizService');

class QuizService {
  /**
   * @param {object} params
   * @param {import('../database/repositories/quizRepository').QuizRepository} params.quizRepo
   * @param {import('./economyService').EconomyService} [params.economyService]
   * @param {import('./experienceService').ExperienceService} [params.experienceService]
   * @param {import('./identityService').IdentityService} [params.identityService]
   * @param {import('./auditService').AuditService} [params.auditService]
   */
  constructor({ quizRepo, economyService = null, experienceService = null, identityService = null, auditService = null }) {
    this.quizRepo = quizRepo;
    this.economyService = economyService;
    this.experienceService = experienceService;
    this.identityService = identityService;
    this.auditService = auditService;
    this.activeMatches = new Map(); // channelId -> match object
  }

  /**
   * Checks if a channel has a live quiz running.
   * @param {string} channelId
   */
  hasActiveQuiz(channelId) {
    return this.activeMatches.has(channelId);
  }

  /**
   * Normalizes category alias into official key (including custom server categories).
   * @param {string} rawCat
   * @param {string|null} [guildId]
   */
  resolveCategory(rawCat, guildId = null) {
    if (!rawCat) return 'misto';
    const c = String(rawCat).toLowerCase().trim();
    if (['game', 'games', 'jogo', 'jogos', 'videogame', 'gamer'].includes(c)) return 'games';
    if (['anime', 'animes', 'manga', 'mangas', 'otaku'].includes(c)) return 'animes';
    if (['futebol', 'futeboll', 'fut', 'soccer', 'esporte', 'esportes'].includes(c)) return 'futebol';
    if (['computacao', 'computação', 'pc', 'hardware', 'programacao', 'programação', 'dev', 'code', 'codigo', 'código', 'ti', 'informatica', 'informática', 'computador', 'tech'].includes(c)) return 'computacao';
    if (['geral', 'ciencias', 'ciencia', 'cultura', 'conhecimentos', 'curiosidades'].includes(c)) return 'geral';
    if (['marvel', 'stark', 'vingadores', 'avengers', 'mcu'].includes(c)) return 'marvel';
    if (['series', 'serie', 'cinema', 'filme', 'filmes', 'hollywood', 'netflix', 'hbo'].includes(c)) return 'series';
    if (['musica', 'música', 'musicas', 'músicas', 'music', 'song', 'songs', 'hits', 'rock', 'pop'].includes(c)) return 'musica';
    if (['mitologia', 'mito', 'mitos', 'historia', 'história', 'antiga', 'deuses', 'grego', 'nordico'].includes(c)) return 'mitologia';
    if (['desenhos', 'desenho', 'animacao', 'animação', 'cartoon', 'cartoons', 'nostalgia', 'disney'].includes(c)) return 'desenhos';
    if (['geografia', 'geo', 'paises', 'países', 'mapa', 'mapas', 'capitais', 'globo'].includes(c)) return 'geografia';

    if (guildId && this.quizRepo) {
      try {
        const customCat = this.quizRepo.getCustomCategoryByKey(guildId, c);
        if (customCat) return customCat.key;
      } catch {}
    }

    return 'misto';
  }

  /**
   * Returns all available categories for a guild (system + custom categories).
   * @param {string|null} [guildId]
   */
  getAllCategories(guildId = null) {
    const categories = {};
    for (const [key, val] of Object.entries(QUIZ_CATEGORIES)) {
      categories[key] = {
        key,
        name: val.name,
        emoji: val.emoji,
        color: typeof val.color === 'number' ? `#${val.color.toString(16).padStart(6, '0')}` : val.color,
        description: val.description,
        isCustom: false
      };
    }

    if (guildId && this.quizRepo) {
      try {
        const customCats = this.quizRepo.getCustomCategories(guildId);
        for (const cc of customCats) {
          categories[cc.key] = {
            id: cc.id,
            key: cc.key,
            name: cc.name,
            emoji: cc.emoji,
            color: cc.color,
            description: cc.description,
            isCustom: true,
            authorId: cc.authorId
          };
        }
      } catch (err) {
        quizLogger.error(`Error loading custom categories for guild ${guildId}: ${err.message}`);
      }
    }

    return categories;
  }

  /**
   * Returns all questions available for a guild (system questions + guild custom questions).
   * @param {string|null} [guildId]
   */
  getAllQuestions(guildId = null) {
    const allCats = this.getAllCategories(guildId);
    const systemQuestions = QUIZ_QUESTIONS.map(q => {
      const cat = allCats[q.category] || QUIZ_CATEGORIES[q.category] || { name: q.category, emoji: '📁' };
      return {
        id: q.id,
        quizQuestionId: q.id,
        category: q.category,
        categoryName: cat.name,
        categoryEmoji: cat.emoji,
        question: q.question,
        answers: q.answers,
        explanation: q.explanation,
        imageUrl: q.imageUrl || null,
        isCustom: false,
        authorId: null
      };
    });

    let customQuestions = [];
    if (guildId && this.quizRepo) {
      try {
        const list = this.quizRepo.getCustomQuestions(guildId);
        customQuestions = list.map(cq => {
          const cat = allCats[cq.category] || { name: cq.category, emoji: '📁' };
          return {
            id: cq.id,
            quizQuestionId: cq.quizQuestionId,
            category: cq.category,
            categoryName: cat.name,
            categoryEmoji: cat.emoji,
            question: cq.question,
            answers: cq.answers,
            explanation: cq.explanation,
            imageUrl: cq.imageUrl,
            isCustom: true,
            authorId: cq.authorId,
            createdAt: cq.createdAt
          };
        });
      } catch (err) {
        quizLogger.error(`Error loading custom questions for guild ${guildId}: ${err.message}`);
      }
    }

    return [...customQuestions, ...systemQuestions];
  }

  /**
   * Starts a new Quiz match in a channel.
   * @param {object} params
   * @param {import('discord.js').Guild} params.guild
   * @param {import('discord.js').TextChannel} params.channel
   * @param {import('discord.js').User} params.author
   * @param {string} [params.categoryInput]
   * @param {number|string} [params.roundsInput]
   * @param {boolean} [params.isInfinite]
   */
  async startQuiz({ guild, channel, author, categoryInput = 'misto', roundsInput = 5, isInfinite = false }) {
    if (this.hasActiveQuiz(channel.id)) {
      throw new Error('Já existe uma partida de Quiz em andamento neste canal! Aguarde o término ou use `+quiz stop` para encerrá-la.');
    }

    const category = this.resolveCategory(categoryInput, guild.id);
    const config = this.quizRepo ? this.quizRepo.getQuizConfig(guild.id) : {
      rewardCoins: 200,
      rewardXp: 50,
      defaultRounds: 5,
      defaultTimeoutSeconds: 25,
      skipCost: 50,
      allowedChannelId: null
    };

    // Check optional allowed channel restriction
    if (config.allowedChannelId && config.allowedChannelId !== channel.id) {
      throw new Error(`As partidas de Quiz estão configuradas para acontecer exclusivamente no canal <#${config.allowedChannelId}>.`);
    }

    const isEndless = Boolean(
      isInfinite === true ||
      String(roundsInput).toLowerCase() === 'infinito' ||
      String(roundsInput).toLowerCase() === 'endless' ||
      String(roundsInput).toLowerCase() === 'infinity' ||
      String(roundsInput).toLowerCase() === 'semfim' ||
      (typeof roundsInput === 'number' && roundsInput <= 0)
    );

    const totalRounds = isEndless
      ? Infinity
      : Math.max(1, Math.min(20, parseInt(roundsInput, 10) || config.defaultRounds || 5));
    const allCats = this.getAllCategories(guild.id);
    const catInfo = category === 'misto'
      ? { name: 'Modo Misto (Todas as Categorias)', emoji: '🎲', color: 0xFEE75C }
      : allCats[category] || QUIZ_CATEGORIES[category] || QUIZ_CATEGORIES.geral;

    const skipCost = config.skipCost ?? 50;

    const match = {
      guildId: guild.id,
      channelId: channel.id,
      channel,
      author,
      category,
      catInfo,
      totalRounds,
      isInfinite: isEndless,
      currentRound: 0,
      scores: new Map(), // userId -> { user, points, correctCount }
      currentQuestion: null,
      questionStartTime: 0,
      roundTimeoutId: null,
      usedQuestionIds: new Set(),
      status: 'INITIALIZING',
      config
    };

    this.activeMatches.set(channel.id, match);

    const roundCountText = isEndless ? '`♾️ Sem Limite (Modo Infinito)`' : `\`${totalRounds}\``;
    const modeTitle = isEndless
      ? `⚡ Protocolo M.A.R.K. — Desafio Neural Quiz (Modo Infinito) Iniciado!`
      : `⚡ Protocolo M.A.R.K. — Desafio Neural Quiz Iniciado!`;

    // Initial match announcement embed
    const startEmbed = new EmbedBuilder()
      .setColor(catInfo.color)
      .setTitle(modeTitle)
      .setDescription(
        `O reator foi ativado por <@${author.id}>! Preparem seus neurônios para uma bateria de perguntas.\n\n` +
        `📂 **Categoria:** ${catInfo.emoji} **${catInfo.name}**\n` +
        `🎯 **Total de Rodadas:** ${roundCountText}\n` +
        `⏱️ **Tempo por Pergunta:** \`${config.defaultTimeoutSeconds}s\`\n` +
        `💰 **Premiação do Vencedor:** \`${config.rewardCoins.toLocaleString('pt-BR')} moedas\` e \`${config.rewardXp} XP\`\n` +
        `⏭️ **Custo para Pular:** \`${skipCost.toLocaleString('pt-BR')} moedas\` (\`+quiz pular\` ou botão)\n\n` +
        `⚠️ **Atenção:** Se ninguém souber a resposta e ninguém pagar para pular dentro do tempo, **a partida acaba imediatamente!**\n\n` +
        (isEndless
          ? `♾️ **Modo Infinito:** As rodadas continuam enquanto houver acertos ou pulos pagos! Para encerrar voluntariamente, envie \`+quiz parar\`.\n\n`
          : '') +
        `💬 **Como Jogar:** Digite a resposta diretamente no chat assim que a pergunta for enviada! Quem acertar primeiro pontua.`
      )
      .setFooter({ text: 'J.A.R.V.I.S. Quiz Arena • Primeira rodada iniciando em 3 segundos...' })
      .setTimestamp();

    await channel.send({ embeds: [startEmbed] });

    if (this.auditService) {
      try {
        this.auditService.logAction({
          guildId: guild.id,
          actorId: author.id,
          targetId: channel.id,
          action: 'QUIZ_STARTED',
          details: { category, totalRounds: isEndless ? 'INFINITE' : totalRounds, isInfinite: isEndless }
        });
      } catch {}
    }

    // Launch round 1 after 3 seconds
    setTimeout(() => {
      if (this.hasActiveQuiz(channel.id)) {
        this.nextRound(match);
      }
    }, 3000);

    return match;
  }

  /**
   * Advances to next round.
   * @param {object} match
   */
  async nextRound(match) {
    if (!this.hasActiveQuiz(match.channelId)) return;

    match.currentRound += 1;

    // Filter candidate questions
    let candidatePool = [...QUIZ_QUESTIONS];
    if (match.category !== 'misto') {
      candidatePool = candidatePool.filter(q => q.category === match.category);
    }

    // Merge custom server questions from repository
    if (this.quizRepo && match.guildId) {
      try {
        const customQuestions = this.quizRepo.getCustomQuestions(match.guildId, match.category);
        if (customQuestions && customQuestions.length > 0) {
          const formatted = customQuestions.map(cq => ({
            id: cq.quizQuestionId || `custom_${cq.id}`,
            category: cq.category,
            question: cq.question,
            answers: cq.answers,
            explanation: cq.explanation,
            imageUrl: cq.imageUrl,
            isCustom: true,
            authorId: cq.authorId
          }));
          candidatePool = candidatePool.concat(formatted);
        }
      } catch (cErr) {
        quizLogger.error(`Error loading custom questions for guild ${match.guildId}: ${cErr.message}`);
      }
    }

    // Filter out already used in this match
    let available = candidatePool.filter(q => !match.usedQuestionIds.has(q.id));
    if (available.length === 0) {
      match.usedQuestionIds.clear();
      available = candidatePool;
    }

    const question = available[Math.floor(Math.random() * available.length)];
    match.usedQuestionIds.add(question.id);
    match.currentQuestion = question;
    match.questionStartTime = Date.now();
    match.status = 'QUESTION_ACTIVE';

    const allCats = this.getAllCategories(match.guildId);
    const catDetails = allCats[question.category] || QUIZ_CATEGORIES[question.category] || match.catInfo;

    const roundTitle = match.isInfinite
      ? `Rodada #${match.currentRound} • ♾️ Modo Infinito • ${catDetails.emoji} ${catDetails.name}`
      : `Rodada #${match.currentRound} de ${match.totalRounds} • ${catDetails.emoji} ${catDetails.name}`;

    const footerText = question.isCustom && question.authorId
      ? `🎨 Pergunta da Comunidade (Criada por <@${question.authorId}>) • Digite a resposta no chat!`
      : '💬 Digite sua resposta diretamente no chat!';

    const questionEmbed = new EmbedBuilder()
      .setColor(catDetails.color)
      .setTitle(roundTitle)
      .setDescription(`📢 **${question.question}**`)
      .addFields(
        { name: '⏱️ Tempo de Resposta', value: `\`${match.config.defaultTimeoutSeconds} segundos\``, inline: true },
        { name: '⭐ Recompensa da Rodada', value: '`+10 pontos`', inline: true }
      )
      .setFooter({ text: footerText })
      .setTimestamp();

    // A foto ilustrativa da resposta é exibida exclusivamente no embed de revelação/explicação (winEmbed, timeoutEmbed, skipEmbed)

    const skipCost = match.config.skipCost ?? 50;
    const skipBtn = new ButtonBuilder()
      .setCustomId(`quiz_skip_${match.channelId}`)
      .setLabel(`⏭️ Pular Pergunta (${skipCost} Moedas)`)
      .setStyle(ButtonStyle.Secondary);

    const row = new ActionRowBuilder().addComponents(skipBtn);

    await match.channel.send({ embeds: [questionEmbed], components: [row] });

    // Schedule Timeout when time expires
    match.roundTimeoutId = setTimeout(() => {
      if (match.status === 'QUESTION_ACTIVE') {
        this.handleTimeout(match);
      }
    }, match.config.defaultTimeoutSeconds * 1000);
  }

  /**
   * Intercepts message and checks if it solves the active question.
   * @param {import('discord.js').Message} message
   * @param {object} context
   * @returns {Promise<boolean>} true if message was the correct quiz answer
   */
  async handleMessageAnswer(message, context) {
    const match = this.activeMatches.get(message.channel.id);
    if (!match || match.status !== 'QUESTION_ACTIVE' || !match.currentQuestion) {
      return false;
    }

    const rawContent = message.content || '';
    if (!rawContent || rawContent.startsWith('+') || rawContent.startsWith('/')) {
      return false;
    }

    const cleanInput = normalizeAnswer(rawContent);
    if (!cleanInput) return false;

    // Check against all valid answers for the current question
    const isCorrect = match.currentQuestion.answers.some(validAns => {
      return normalizeAnswer(validAns) === cleanInput;
    });

    if (!isCorrect) {
      return false;
    }

    // WINNER DETECTED!
    clearTimeout(match.roundTimeoutId);
    match.status = 'ROUND_COOLDOWN';

    const elapsedSeconds = ((Date.now() - match.questionStartTime) / 1000).toFixed(1);

    // Update match scores
    const userScore = match.scores.get(message.author.id) || { user: message.author, points: 0, correctCount: 0 };
    userScore.points += 10;
    userScore.correctCount += 1;
    match.scores.set(message.author.id, userScore);

    // Persist to database
    if (this.quizRepo) {
      try {
        this.quizRepo.addCorrectAnswer(match.guildId, message.author.id, 10);
      } catch (dbErr) {
        quizLogger.error(`Error saving correct answer to db: ${dbErr.message}`);
      }
    }

    // React with star on user's message
    message.react('⭐').catch(() => null);

    const allCats = this.getAllCategories(match.guildId);
    const catDetails = allCats[match.currentQuestion.category] || QUIZ_CATEGORIES[match.currentQuestion.category] || match.catInfo;

    // Dynamic Stark AI voice lines
    const STARK_VOICE_LINES = [
      '🎯 **Disparo certeiro!** Sensores Stark validaram seu acerto em tempo recorde.',
      '⚡ **Conexão sináptica instantânea!** Processadores neurais registraram seu acerto milissegundos antes da concorrência.',
      '🔥 **Agilidade cognitiva de elite!** Nem mesmo a telemetria da Mark LXXXV responderia com tanta precisão.',
      '🧠 **Raciocínio de altíssimo calibre!** O mainframe computou seu acerto e adicionou os pontos ao seu perfil.',
      '🚀 **Alvo neutralizado com perfeição!** O reator arc emite pulso verde para sua resposta exata.',
      '🏆 **Magnífico!** Seus reflexos intelectuais superaram com folga os algoritmos preditivos.'
    ];
    const starkReaction = STARK_VOICE_LINES[Math.floor(Math.random() * STARK_VOICE_LINES.length)];

    const altAnswers = match.currentQuestion.answers.length > 1
      ? `\n*(Variações aceitas: ${match.currentQuestion.answers.slice(1).map(a => `\`${a.toUpperCase()}\``).join(', ')})*`
      : '';

    const customAuthorTag = match.currentQuestion.isCustom && match.currentQuestion.authorId
      ? `\n\n🎨 *Pergunta criada pela comunidade por <@${match.currentQuestion.authorId}>*`
      : '';

    // Win Embed matching LordBot/Stark high-tech style
    const winEmbed = new EmbedBuilder()
      .setColor(0x57F287)
      .setTitle(`🎯 ${match.currentQuestion.question}`)
      .setDescription(
        `✅ **Resposta correta:** \`${match.currentQuestion.answers[0].toUpperCase()}\`${altAnswers}\n\n` +
        `💡 **Arquivo de Dados / Contexto:**\n> ${match.currentQuestion.explanation}\n\n` +
        `👤 **Agente:** ${message.author}\n` +
        `⏱️ **Tempo de Reação:** \`${elapsedSeconds}s\`\n` +
        `⭐ **Pontuação:** \`+10 pontos\` *(Total na partida: ${userScore.points} pts)*` +
        customAuthorTag
      )
      .setFooter({ text: `J.A.R.V.I.S. Quiz Arena • ${catDetails.emoji} ${catDetails.name}` })
      .setTimestamp();

    if (match.currentQuestion.imageUrl) {
      winEmbed.setImage(match.currentQuestion.imageUrl);
    }

    await message.channel.send({
      content: `${starkReaction}\n⭐ **${message.author}** acertou em **${elapsedSeconds}s**! *(+10 pontos)*`,
      embeds: [winEmbed]
    });

    // Schedule next round or end of match
    setTimeout(() => {
      if (!this.hasActiveQuiz(match.channelId)) return;
      if (match.isInfinite || match.currentRound < match.totalRounds) {
        this.nextRound(match);
      } else {
        this.endMatch(match);
      }
    }, 3500);

    return true;
  }

  /**
   * Handles round timeout when no one answers in time.
   * Se ninguém souber a resposta e não pagar para pular, a partida acaba imediatamente!
   * @param {object} match
   */
  async handleTimeout(match) {
    clearTimeout(match.roundTimeoutId);
    match.status = 'ROUND_COOLDOWN';

    const q = match.currentQuestion;
    const catDetails = QUIZ_CATEGORIES[q.category] || match.catInfo;

    const timeoutEmbed = new EmbedBuilder()
      .setColor(0xED4245)
      .setTitle(`⏰ Tempo Esgotado — Fim da Partida!`)
      .setDescription(
        `Nenhum agente soube a resposta e a pergunta não foi pulada a tempo!\n` +
        `Conforme o protocolo do Desafio Neural, **a partida foi encerrada.**\n\n` +
        `📢 **Pergunta:** ${q.question}\n` +
        `🔑 **Resposta correta:** \`${q.answers[0].toUpperCase()}\`\n\n` +
        `${q.explanation}`
      )
      .setFooter({ text: `J.A.R.V.I.S. Quiz Arena • ${catDetails.name}` })
      .setTimestamp();

    if (q.imageUrl) {
      timeoutEmbed.setImage(q.imageUrl);
    }

    await match.channel.send({ embeds: [timeoutEmbed] });

    // ACABA A PARTIDA se o tempo esgotou sem resposta ou pulo!
    setTimeout(() => {
      this.endMatch(match);
    }, 2500);
  }

  /**
   * Allows a user to skip the active question by paying the skip cost.
   * @param {string} guildId
   * @param {string} channelId
   * @param {import('discord.js').User} user
   * @param {import('discord.js').ButtonInteraction|import('discord.js').Message} [interactionOrMessage]
   */
  async skipQuestion(guildId, channelId, user, interactionOrMessage = null) {
    const match = this.activeMatches.get(channelId);
    if (!match || match.status !== 'QUESTION_ACTIVE' || !match.currentQuestion) {
      const errText = 'Não há nenhuma pergunta ativa para pular neste momento!';
      if (interactionOrMessage?.reply) {
        if (interactionOrMessage.isButton?.()) {
          return interactionOrMessage.reply({ content: `❌ ${errText}`, ephemeral: true }).catch(() => {});
        }
        return interactionOrMessage.reply(`❌ ${errText}`).catch(() => {});
      }
      throw new Error(errText);
    }

    const skipCost = match.config.skipCost ?? 50;

    // Check user balance in economyService
    if (this.economyService) {
      try {
        const balance = this.economyService.getBalance(guildId, user.id);
        const wallet = balance?.walletBalance ?? 0;
        if (wallet < skipCost) {
          const errMsg = `❌ <@${user.id}>, você não tem moedas suficientes para pular a pergunta! Custa **${skipCost.toLocaleString('pt-BR')} moedas** e você possui apenas **${wallet.toLocaleString('pt-BR')}**.`;
          if (interactionOrMessage?.reply) {
            if (interactionOrMessage.isButton?.()) {
              return interactionOrMessage.reply({ content: errMsg, ephemeral: true }).catch(() => {});
            }
            return interactionOrMessage.reply(errMsg).catch(() => {});
          }
          throw new Error(errMsg);
        }

        // Deduct coins
        if (typeof this.economyService.removeWalletBalance === 'function') {
          this.economyService.removeWalletBalance(guildId, user.id, skipCost, 'QUIZ_SKIP', 'Pagamento para pular pergunta no Quiz');
        } else if (typeof this.economyService.adminAdjust === 'function') {
          this.economyService.adminAdjust(guildId, user.id, 'wallet', 'remove', skipCost, 'SYSTEM_QUIZ_SKIP', 'Pagamento para pular pergunta no Quiz');
        }
      } catch (ecoErr) {
        const errMsg = ecoErr.message.includes('moedas') || ecoErr.message.includes('Saldo')
          ? ecoErr.message
          : `❌ Erro no débito de moedas: ${ecoErr.message}`;
        if (interactionOrMessage?.reply) {
          if (interactionOrMessage.isButton?.()) {
            return interactionOrMessage.reply({ content: errMsg, ephemeral: true }).catch(() => {});
          }
          return interactionOrMessage.reply(errMsg).catch(() => {});
        }
        throw ecoErr;
      }
    }

    // Question is successfully skipped!
    clearTimeout(match.roundTimeoutId);
    match.status = 'ROUND_COOLDOWN';

    const q = match.currentQuestion;
    const catDetails = QUIZ_CATEGORIES[q.category] || match.catInfo;

    const skipEmbed = new EmbedBuilder()
      .setColor(0xFEE75C)
      .setTitle(`⏭️ Pergunta Pulada!`)
      .setDescription(
        `💸 <@${user.id}> pagou **${skipCost.toLocaleString('pt-BR')} moedas** e pulou a pergunta!\n` +
        `A partida continua normalmente! Próxima rodada em 3 segundos...\n\n` +
        `📢 **Pergunta:** ${q.question}\n` +
        `🔑 **Resposta correta:** \`${q.answers[0].toUpperCase()}\`\n\n` +
        `${q.explanation}`
      )
      .setFooter({ text: `J.A.R.V.I.S. Quiz Arena • ${catDetails.name}` })
      .setTimestamp();

    if (q.imageUrl) {
      skipEmbed.setImage(q.imageUrl);
    }

    if (interactionOrMessage?.isButton?.()) {
      await interactionOrMessage.reply({
        content: `✅ Você pagou **${skipCost} moedas** e pulou a pergunta com sucesso!`,
        ephemeral: true
      }).catch(() => {});
      await match.channel.send({ embeds: [skipEmbed] });
    } else {
      await match.channel.send({ embeds: [skipEmbed] });
    }

    // Schedule next round because question was skipped
    setTimeout(() => {
      if (!this.hasActiveQuiz(match.channelId)) return;
      if (match.isInfinite || match.currentRound < match.totalRounds) {
        this.nextRound(match);
      } else {
        this.endMatch(match);
      }
    }, 3500);

    return true;
  }

  /**
   * Concludes the match and publishes the scoreboard & rewards.
   * @param {object} match
   * @param {import('discord.js').User} [stoppedBy]
   */
  async endMatch(match, stoppedBy = null) {
    clearTimeout(match.roundTimeoutId);
    this.activeMatches.delete(match.channelId);

    const sortedScores = Array.from(match.scores.values()).sort((a, b) => b.points - a.points);

    if (sortedScores.length === 0) {
      const noScoresEmbed = new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle(match.isInfinite ? '🏁 Fim da Sessão Infinita de Quiz!' : '🏁 Fim da Partida de Quiz!')
        .setDescription(
          stoppedBy
            ? `A sessão de Quiz foi encerrada por <@${stoppedBy.id}> após **${match.currentRound} rodada${match.currentRound > 1 ? 's' : ''}**, mas nenhuma pergunta foi respondida com sucesso. Reatores desligados!`
            : 'A partida foi concluída, mas nenhuma pergunta foi respondida com sucesso. Reatores desligados!'
        )
        .setFooter({ text: 'J.A.R.V.I.S. Quiz Arena • Até a próxima!' })
        .setTimestamp();

      await match.channel.send({ embeds: [noScoresEmbed] });
      return;
    }

    const winner = sortedScores[0];
    const rewardCoins = match.config.rewardCoins || 200;
    const rewardXp = match.config.rewardXp || 50;

    // Multi-player check: Coins are only awarded if 2 or more players scored!
    const distinctScorers = sortedScores.filter(s => s.points > 0);
    const hasMultiplayer = distinctScorers.length >= 2;

    // Persist winner in repository
    if (this.quizRepo && winner) {
      try {
        this.quizRepo.recordMatchWin(match.guildId, winner.user.id);
      } catch (wErr) {
        quizLogger.error(`Error recording match win: ${wErr.message}`);
      }
    }

    // Award Economy & XP rewards
    let rewardText = '';
    if (winner) {
      if (hasMultiplayer && this.economyService && rewardCoins > 0) {
        try {
          this.economyService.addWalletBalance(match.guildId, winner.user.id, rewardCoins);
          rewardText += ` +${rewardCoins.toLocaleString('pt-BR')} moedas 🪙`;
        } catch {}
      }
      if (this.experienceService && rewardXp > 0) {
        try {
          this.experienceService.addXp(match.guildId, winner.user.id, rewardXp);
          rewardText += ` +${rewardXp} XP ⚡`;
        } catch {}
      }
    }

    // Build scoreboard lines (matching screenshot 2 style!)
    const medals = ['🥇', '🥈', '🥉', '🎖️', '🎖️'];
    const scoreLines = sortedScores.slice(0, 10).map((s, idx) => {
      const medal = medals[idx] || '🎖️';
      const isTop = idx === 0 ? ` 👑 **Campeão!**${rewardText}` : '';
      return `${medal} <@${s.user.id}> com **${s.points} pontos** (${s.correctCount} acerto${s.correctCount > 1 ? 's' : ''})${isTop}`;
    }).join('\n\n');

    const title = match.isInfinite
      ? '🏆 Placar Final da Sessão Infinita — Desafio Neural'
      : '🏆 Placar Final da Partida — Desafio Neural';

    const stoppedNotice = stoppedBy ? ` *(Encerrada por <@${stoppedBy.id}>)*` : '';
    let roundSummary = match.isInfinite
      ? `A maratona infinita durou **${match.currentRound} rodada${match.currentRound > 1 ? 's' : ''}**!${stoppedNotice}\n\n`
      : `A simulação foi concluída com sucesso após **${match.totalRounds} rodadas**!${stoppedNotice}\n\n`;

    if (!hasMultiplayer && rewardCoins > 0) {
      roundSummary += `⚠️ **Aviso de Premiação:** *As moedas (${rewardCoins.toLocaleString('pt-BR')} 🪙) só são concedidas em partidas disputadas por 2 ou mais jogadores ativos! Convide amigos para disputar o jackpot na próxima.*\n\n`;
    }

    const scoreboardEmbed = new EmbedBuilder()
      .setColor(0xF1C40F)
      .setTitle(title)
      .setDescription(roundSummary + scoreLines)
      .setFooter({ text: `J.A.R.V.I.S. Quiz Arena • ${match.isInfinite ? '♾️ Modo Infinito • ' : ''}${match.catInfo.name}` })
      .setTimestamp();

    await match.channel.send({ embeds: [scoreboardEmbed] });

    if (this.auditService && winner) {
      try {
        this.auditService.logAction({
          guildId: match.guildId,
          actorId: winner.user.id,
          targetId: match.channelId,
          action: 'QUIZ_WON',
          details: { points: winner.points, rounds: match.currentRound, category: match.category, isInfinite: match.isInfinite }
        });
      } catch {}
    }
  }

  /**
   * Manually halts an active match.
   * @param {string} guildId
   * @param {string} channelId
   * @param {import('discord.js').User} requester
   */
  async stopQuiz(guildId, channelId, requester) {
    const match = this.activeMatches.get(channelId);
    if (!match) {
      throw new Error('Não há nenhuma partida de Quiz ativa para cancelar neste canal.');
    }

    clearTimeout(match.roundTimeoutId);

    // If anyone scored in the match, conclude with the final podium & rewards!
    if (match.scores.size > 0) {
      await this.endMatch(match, requester);
      return true;
    }

    this.activeMatches.delete(channelId);

    const embed = new EmbedBuilder()
      .setColor(0xED4245)
      .setTitle('⏹️ Quiz Interrompido')
      .setDescription(
        match.isInfinite
          ? `A sessão de Quiz no **Modo Infinito** foi encerrada por <@${requester.id}> na rodada **#${match.currentRound}**.`
          : `A partida de Quiz foi encerrada por <@${requester.id}> na rodada **#${match.currentRound} de ${match.totalRounds}**.`
      )
      .setFooter({ text: 'J.A.R.V.I.S. Quiz Arena' })
      .setTimestamp();

    await match.channel.send({ embeds: [embed] });
    return true;
  }

  /**
   * Returns current match score if running.
   * @param {string} channelId
   */
  getCurrentScores(channelId) {
    const match = this.activeMatches.get(channelId);
    if (!match) return null;
    return Array.from(match.scores.values()).sort((a, b) => b.points - a.points);
  }

  /**
   * Returns server all-time top players.
   * @param {string} guildId
   * @param {number} limit
   */
  getLeaderboard(guildId, limit = 10) {
    return this.quizRepo ? this.quizRepo.getLeaderboard(guildId, limit) : [];
  }

  /**
   * Creates a custom quiz question for a server.
   */
  createCustomQuestion(params) {
    if (!this.quizRepo) throw new Error('Repositório de Quiz não inicializado.');
    return this.quizRepo.createCustomQuestion(params);
  }

  /**
   * Retrieves active custom questions for a server.
   */
  getCustomQuestions(guildId, category = null) {
    if (!this.quizRepo) return [];
    return this.quizRepo.getCustomQuestions(guildId, category);
  }

  /**
   * Retrieves a custom question by ID.
   */
  getCustomQuestionById(id, guildId) {
    if (!this.quizRepo) return null;
    return this.quizRepo.getCustomQuestionById(id, guildId);
  }

  /**
   * Deletes a custom question by ID.
   */
  deleteCustomQuestion(id, guildId) {
    if (!this.quizRepo) throw new Error('Repositório de Quiz não inicializado.');
    return this.quizRepo.deleteCustomQuestion(id, guildId);
  }

  /**
   * Updates an existing custom question by ID.
   */
  updateCustomQuestion(id, guildId, updates) {
    if (!this.quizRepo) throw new Error('Repositório de Quiz não inicializado.');
    return this.quizRepo.updateCustomQuestion(id, guildId, updates);
  }

  /**
   * Creates or updates a custom category.
   */
  createCustomCategory(params) {
    if (!this.quizRepo) throw new Error('Repositório de Quiz não inicializado.');
    return this.quizRepo.createCustomCategory(params);
  }

  /**
   * Retrieves all custom categories for a guild.
   */
  getCustomCategories(guildId) {
    if (!this.quizRepo) return [];
    return this.quizRepo.getCustomCategories(guildId);
  }

  /**
   * Retrieves a single custom category by key.
   */
  getCustomCategoryByKey(guildId, key) {
    if (!this.quizRepo) return null;
    return this.quizRepo.getCustomCategoryByKey(guildId, key);
  }

  /**
   * Deletes a custom category by ID.
   */
  deleteCustomCategory(id, guildId) {
    if (!this.quizRepo) throw new Error('Repositório de Quiz não inicializado.');
    return this.quizRepo.deleteCustomCategory(id, guildId);
  }

  /**
   * Deletes a custom category by key.
   */
  deleteCustomCategoryByKey(guildId, key) {
    if (!this.quizRepo) throw new Error('Repositório de Quiz não inicializado.');
    return this.quizRepo.deleteCustomCategoryByKey(guildId, key);
  }
}

module.exports = { QuizService };
