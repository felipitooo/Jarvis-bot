const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { QUIZ_CATEGORIES } = require('../../data/quizQuestions');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('quiz')
    .setDescription('Protocolo M.A.R.K. — Desafio Neural e Quiz Arena no chat!')
    .setDMPermission(false)
    .addSubcommand(sub =>
      sub
        .setName('iniciar')
        .setDescription('Inicia uma nova rodada de Quiz no canal atual.')
        .addStringOption(opt =>
          opt
            .setName('categoria')
            .setDescription('Categoria temática do Quiz')
            .setRequired(false)
            .addChoices(
              { name: '🎲 Modo Misto (Todas as Categorias)', value: 'misto' },
              { name: '🎮 Jogos & Games', value: 'games' },
              { name: '⛩️ Animes & Mangás', value: 'animes' },
              { name: '⚽ Futebol & Esportes', value: 'futebol' },
              { name: '🧠 Conhecimentos Gerais & Ciências', value: 'geral' },
              { name: '💻 Computação & Tecnologia', value: 'computacao' },
              { name: '⚡ Universo Marvel & Stark', value: 'marvel' },
              { name: '🎬 Cinema & Séries', value: 'series' },
              { name: '🎵 Música & Hits', value: 'musica' },
              { name: '🏛️ Mitologia & História', value: 'mitologia' },
              { name: '🎨 Desenhos & Nostalgia', value: 'desenhos' },
              { name: '🌍 Geografia & Países', value: 'geografia' }
            )
        )
        .addIntegerOption(opt =>
          opt
            .setName('rodadas')
            .setDescription('Quantidade de rodadas (1 a 20, padrão 5)')
            .setMinValue(1)
            .setMaxValue(20)
            .setRequired(false)
        )
        .addBooleanOption(opt =>
          opt
            .setName('infinito')
            .setDescription('Ativa o modo infinito sem limite de rodadas (encerre com /quiz parar)')
            .setRequired(false)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('criar')
        .setDescription('Cria uma pergunta personalizada para o Quiz do servidor.')
        .addStringOption(opt =>
          opt
            .setName('categoria')
            .setDescription('Categoria temática da pergunta')
            .setRequired(true)
            .addChoices(
              { name: '🎮 Jogos & Games', value: 'games' },
              { name: '⛩️ Animes & Mangás', value: 'animes' },
              { name: '⚽ Futebol & Esportes', value: 'futebol' },
              { name: '🧠 Conhecimentos Gerais & Ciências', value: 'geral' },
              { name: '💻 Computação & Tecnologia', value: 'computacao' },
              { name: '⚡ Universo Marvel & Stark', value: 'marvel' },
              { name: '🎬 Cinema & Séries', value: 'series' },
              { name: '🎵 Música & Hits', value: 'musica' },
              { name: '🏛️ Mitologia & História', value: 'mitologia' },
              { name: '🎨 Desenhos & Nostalgia', value: 'desenhos' },
              { name: '🌍 Geografia & Países', value: 'geografia' }
            )
        )
        .addStringOption(opt =>
          opt
            .setName('pergunta')
            .setDescription('O enunciado da pergunta')
            .setRequired(true)
        )
        .addStringOption(opt =>
          opt
            .setName('respostas')
            .setDescription('Respostas corretas aceitas (separe sinônimos por vírgula, ex: São Paulo, SP, Sampa)')
            .setRequired(true)
        )
        .addStringOption(opt =>
          opt
            .setName('explicacao')
            .setDescription('Texto explicando o contexto/porquê da resposta correta')
            .setRequired(true)
        )
        .addAttachmentOption(opt =>
          opt
            .setName('foto')
            .setDescription('Anexe uma foto da resposta (exibida exclusivamente na explicação)')
            .setRequired(false)
        )
        .addStringOption(opt =>
          opt
            .setName('foto_url')
            .setDescription('Ou cole o link de uma foto da resposta (exibida na explicação)')
            .setRequired(false)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('lista')
        .setDescription('Lista as perguntas personalizadas criadas neste servidor.')
    )
    .addSubcommand(sub =>
      sub
        .setName('deletar')
        .setDescription('Remove uma pergunta personalizada do Quiz pelo ID.')
        .addIntegerOption(opt =>
          opt
            .setName('id')
            .setDescription('ID numérico da pergunta a ser deletada')
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('parar')
        .setDescription('Encerra a partida de Quiz em andamento neste canal.')
    )
    .addSubcommand(sub =>
      sub
        .setName('pular')
        .setDescription('Paga moedas para pular a pergunta atual do Quiz.')
    )
    .addSubcommand(sub =>
      sub
        .setName('placar')
        .setDescription('Exibe a pontuação parcial da partida atual.')
    )
    .addSubcommand(sub =>
      sub
        .setName('ranking')
        .setDescription('Exibe os maiores mestres do Quiz no servidor.')
    )
    .addSubcommand(sub =>
      sub
        .setName('categorias')
        .setDescription('Exibe a lista de categorias disponíveis no Quiz.')
    ),

  /**
   * @param {import('discord.js').ChatInputCommandInteraction} interaction
   * @param {object} context
   */
  async execute(interaction, context) {
    const { quizService, identityService } = context;
    const guild = interaction.guild;
    const author = interaction.user;
    const channel = interaction.channel;
    const aiName = identityService?.getDisplayName ? identityService.getDisplayName(guild.id) : 'Jarvis';

    if (!quizService) {
      return interaction.reply({
        content: '❌ O sistema de Quiz não está disponível no momento.',
        ephemeral: true
      });
    }

    const sub = interaction.options.getSubcommand();

    // 1. STOP
    if (sub === 'parar') {
      try {
        await quizService.stopQuiz(guild.id, channel.id, author);
        return interaction.reply({
          content: '⏹️ Partida de Quiz encerrada.',
          ephemeral: true
        });
      } catch (err) {
        return interaction.reply({
          content: `❌ ${err.message}`,
          ephemeral: true
        });
      }
    }

    // 2. PULAR
    if (sub === 'pular') {
      try {
        await quizService.skipQuestion(guild.id, channel.id, author, interaction);
      } catch (err) {
        return interaction.reply({
          content: `❌ ${err.message}`,
          ephemeral: true
        });
      }
    }

    // 2. PLACAR
    if (sub === 'placar') {
      const scores = quizService.getCurrentScores(channel.id);
      if (!scores) {
        return interaction.reply({
          content: 'ℹ️ Não há nenhuma partida de Quiz em andamento neste canal. Inicie com `/quiz iniciar`!',
          ephemeral: true
        });
      }
      if (scores.length === 0) {
        return interaction.reply({
          content: '📊 Placar atual: Nenhum participante pontuou ainda nesta partida.',
          ephemeral: false
        });
      }
      const medals = ['🥇', '🥈', '🥉', '🎖️', '🎖️'];
      const lines = scores.map((s, idx) => `${medals[idx] || '🎖️'} <@${s.user.id}> — **${s.points} pts** (${s.correctCount} acertos)`).join('\n');
      const embed = new EmbedBuilder()
        .setColor(0xF1C40F)
        .setTitle('📊 Placar Parcial da Partida')
        .setDescription(lines)
        .setFooter({ text: `${aiName} • Quiz Arena` });
      return interaction.reply({ embeds: [embed] });
    }

    // 3. RANKING
    if (sub === 'ranking') {
      const top = quizService.getLeaderboard(guild.id, 10);
      if (top.length === 0) {
        return interaction.reply({
          content: '🏆 O servidor ainda não possui campeões registrados no Quiz Arena. Seja o primeiro jogando `/quiz iniciar`!',
          ephemeral: true
        });
      }
      const medals = ['🥇', '🥈', '🥉', '🎖️', '🎖️', '🎖️', '🎖️', '🎖️', '🎖️', '🎖️'];
      const lines = top.map((r, idx) => {
        return `${medals[idx] || '🎖️'} <@${r.userId}> — **${r.totalPoints} pontos** | \`${r.totalCorrect}\` acertos | \`${r.gamesWon}\` vitórias`;
      }).join('\n\n');

      const embed = new EmbedBuilder()
        .setColor(0xF1C40F)
        .setTitle(`🏆 Hall da Fama — Quiz Arena • ${guild.name}`)
        .setDescription(lines)
        .setFooter({ text: `${aiName} • Top Mestres do Conhecimento` })
        .setTimestamp();
      return interaction.reply({ embeds: [embed] });
    }

    // 4. CATEGORIAS
    if (sub === 'categorias') {
      const fields = Object.entries(QUIZ_CATEGORIES).map(([key, cat]) => ({
        name: `${cat.emoji} ${cat.name} (\`/quiz iniciar categoria:${key}\`)`,
        value: cat.description,
        inline: false
      }));
      const embed = new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle('📂 Categorias do Desafio Neural — J.A.R.V.I.S. Quiz Arena')
        .setDescription(
          'Escolha uma das categorias abaixo para iniciar ou dispute no modo misto:\n\n' +
          '🎲 **Modo Misto**: Perguntas sorteadas aleatoriamente de todas as áreas do conhecimento!'
        )
        .addFields(fields)
        .setFooter({ text: `${aiName} • Protocolo M.A.R.K. Quiz` });
      return interaction.reply({ embeds: [embed] });
    }

    // 5. CRIAR (Pergunta customizada)
    if (sub === 'criar') {
      const category = interaction.options.getString('categoria');
      const question = interaction.options.getString('pergunta');
      const answers = interaction.options.getString('respostas');
      const explanation = interaction.options.getString('explicacao');
      const photoAttachment = interaction.options.getAttachment('foto');
      const photoUrl = interaction.options.getString('foto_url');
      const imageUrl = photoAttachment?.url || photoUrl || null;

      try {
        const created = quizService.createCustomQuestion({
          guildId: guild.id,
          authorId: author.id,
          category,
          question,
          answers,
          explanation,
          imageUrl
        });

        const catObj = QUIZ_CATEGORIES[category] || { name: category, emoji: '📁' };
        const embed = new EmbedBuilder()
          .setColor(0x57F287)
          .setTitle(`✅ Pergunta #${created.id} Cadastrada com Sucesso!`)
          .setDescription(
            `Sua pergunta foi salva e entrará nas próximas partidas de Quiz do servidor!\n\n` +
            `📂 **Categoria:** ${catObj.emoji} **${catObj.name}**\n` +
            `📢 **Pergunta:** ${created.question}\n` +
            `🔑 **Respostas Aceitas:** ${created.answers.map(a => `\`${a}\``).join(', ')}\n` +
            `💡 **Explicação:** ${created.explanation}\n` +
            `👤 **Autor:** <@${author.id}>\n\n` +
            `🗑️ Para remover no futuro: \`/quiz deletar id:${created.id}\``
          )
          .setFooter({ text: `${aiName} • Custom Quiz Question Engine` })
          .setTimestamp();

        if (created.imageUrl) {
          embed.setImage(created.imageUrl);
        }

        return interaction.reply({ embeds: [embed] });
      } catch (err) {
        return interaction.reply({
          content: `❌ Falha ao criar pergunta: ${err.message}`,
          ephemeral: true
        });
      }
    }

    // 6. LISTA (Perguntas customizadas)
    if (sub === 'lista') {
      const list = quizService.getCustomQuestions(guild.id);
      if (list.length === 0) {
        return interaction.reply({
          content: 'ℹ️ Nenhuma pergunta personalizada foi cadastrada neste servidor ainda! Use `/quiz criar` para cadastrar a primeira.',
          ephemeral: true
        });
      }

      const lines = list.slice(0, 15).map(q => {
        const catObj = QUIZ_CATEGORIES[q.category] || { emoji: '📁', name: q.category };
        const preview = q.question.length > 55 ? q.question.slice(0, 52) + '...' : q.question;
        return `**#${q.id}** [${catObj.emoji} ${catObj.name}] — *${preview}* (por <@${q.authorId}>)`;
      }).join('\n\n');

      const embed = new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle(`📝 Perguntas Customizadas do Servidor (${list.length})`)
        .setDescription(
          `Estas perguntas entram no sorteio das partidas do servidor:\n\n${lines}\n\n` +
          (list.length > 15 ? `*...e mais ${list.length - 15} perguntas cadastradas.*\n\n` : '') +
          '➕ Para criar: `/quiz criar`\n' +
          '🗑️ Para apagar: `/quiz deletar`'
        )
        .setFooter({ text: `${aiName} • Custom Quiz Questions` })
        .setTimestamp();

      return interaction.reply({ embeds: [embed] });
    }

    // 7. DELETAR (Pergunta customizada)
    if (sub === 'deletar') {
      const targetId = interaction.options.getInteger('id');
      const existing = quizService.getCustomQuestionById(targetId, guild.id);
      if (!existing) {
        return interaction.reply({
          content: `❌ Nenhuma pergunta ativa encontrada com o ID #${targetId} neste servidor.`,
          ephemeral: true
        });
      }

      const isAuthor = existing.authorId === author.id;
      const isAdmin = interaction.memberPermissions?.has('ManageGuild') || interaction.memberPermissions?.has('Administrator');

      if (!isAuthor && !isAdmin) {
        return interaction.reply({
          content: '❌ Você só pode deletar perguntas que você mesmo criou, a menos que possua permissão de Gerenciar Servidor.',
          ephemeral: true
        });
      }

      try {
        quizService.deleteCustomQuestion(targetId, guild.id);
        return interaction.reply({
          content: `✅ Pergunta customizada **#${targetId}** foi removida com sucesso.`,
          ephemeral: false
        });
      } catch (err) {
        return interaction.reply({
          content: `❌ Erro ao deletar pergunta: ${err.message}`,
          ephemeral: true
        });
      }
    }

    // 8. INICIAR
    if (sub === 'iniciar') {
      const category = interaction.options.getString('categoria') || 'misto';
      const rounds = interaction.options.getInteger('rodadas') || 5;
      const isInfinite = interaction.options.getBoolean('infinito') || false;

      try {
        await interaction.reply({
          content: '🚀 Preparando simulação holográfica e carregando banco de dados...',
          ephemeral: true
        });

        await quizService.startQuiz({
          guild,
          channel,
          author,
          categoryInput: category,
          roundsInput: rounds,
          isInfinite
        });
      } catch (err) {
        return interaction.followUp({
          content: `❌ ${err.message}`,
          ephemeral: true
        });
      }
    }
  }
};
