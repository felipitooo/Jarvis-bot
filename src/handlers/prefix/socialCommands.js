const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  AttachmentBuilder,
  PermissionFlagsBits
} = require('discord.js');
const { resolveUser } = require('./prefixUtils');
const { generateShipCanvas, generateShipName, getShipTier } = require('../../utils/shipCanvasGenerator');
const { SOCIAL_ACTIONS } = require('../../services/socialFunService');
const { QUIZ_CATEGORIES } = require('../../data/quizQuestions');
const { permissionService } = require('../../services/permissionService');

const COMMANDS = new Set([
  'ship', 'casal', 'love',
  'marry', 'casar', 'casamento',
  'divorce', 'divorciar', 'separar',
  '8ball', 'bola8',
  'interact', 'interagir', 'socar', 'chutar', 'zoar', 'flertar', 'cafune', 'dancar', 'cumprimentar',
  'abracar', 'abraçar', 'hug',
  'beijar', 'kiss',
  'genero', 'sexo',
  'raffle', 'sorteio',
  'quiz',
  'bolao',
  'avaliar', 'review',
  'avaliacoes', 'reviewstats'
]);

function handles(cmdName) {
  return COMMANDS.has(cmdName);
}

async function handle(cmdName, args, message, context, options = {}) {
  if (!handles(cmdName)) return false;

  const guild = message.guild;
  const author = message.author;
  const member = message.member;
  const aiName = options.aiName || 'Jarvis';
  const socialFunService = context.socialFunService;
  const quizService = context.quizService;

  switch (cmdName) {
    case 'ship':
    case 'casal':
    case 'love': {
      let u1 = null;
      let u2 = null;

      const mentionedUsers = Array.from(message.mentions?.users?.values() || []);
      if (mentionedUsers.length >= 2) {
        u1 = mentionedUsers[0];
        u2 = mentionedUsers[1];
      } else if (mentionedUsers.length === 1) {
        u1 = author;
        u2 = mentionedUsers[0];
      } else if (args[0] && args[1]) {
        u1 = await resolveUser(message, args[0]);
        u2 = await resolveUser(message, args[1]);
      } else if (args[0]) {
        u1 = author;
        u2 = await resolveUser(message, args[0]);
      }

      if (!u1 || !u2) {
        await message.reply('💖 **Como usar o +ship:**\n• `+ship @alguem` (testa sua compatibilidade com a pessoa)\n• `+ship @usuário1 @usuário2` (analisa a compatibilidade do casal)');
        return true;
      }

      const botId = message.client?.user?.id;
      const shipRes = socialFunService.ship(guild.id, u1, u2, botId);
      const percent = shipRes.percent;

      const name1 = guild.members.cache.get(u1.id)?.displayName || u1.globalName || u1.username;
      const name2 = guild.members.cache.get(u2.id)?.displayName || u2.globalName || u2.username;
      const shipName = generateShipName(name1, name2);
      const tier = getShipTier(percent);

      const av1 = u1.displayAvatarURL ? u1.displayAvatarURL({ extension: 'png', size: 128 }) : null;
      const av2 = u2.displayAvatarURL ? u2.displayAvatarURL({ extension: 'png', size: 128 }) : null;

      const canvasBuf = await generateShipCanvas({
        user1Name: name1,
        user1AvatarUrl: av1,
        user2Name: name2,
        user2AvatarUrl: av2,
        percent,
        shipName,
        statusEmoji: shipRes.statusEmoji || tier.emoji
      });

      const msgContent = `💖 **Hmmm, será que temos um novo casal aqui?** 💖\n` +
        `\`${name1}\` + \`${name2}\` = ✨ **${shipName}** ✨\n\n` +
        `> *${shipRes.comment || tier.comment}*`;

      const files = [];
      if (canvasBuf) {
        files.push(new AttachmentBuilder(canvasBuf, { name: 'jarvis-ship.png' }));
      }

      await message.reply({
        content: msgContent,
        files
      });
      return true;
    }

    case 'marry':
    case 'casar':
    case 'casamento': {
      let customCost = null;
      let target = null;

      for (const arg of args) {
        const clean = arg.replace(/[^\d]/g, '');
        if (/^\d+$/.test(clean) && !arg.startsWith('<@') && parseInt(clean, 10) > 0) {
          customCost = parseInt(clean, 10);
          break;
        }
      }

      for (const arg of args) {
        if (arg.startsWith('<@') || /^\d{17,20}$/.test(arg)) {
          target = await resolveUser(message, arg);
          if (target) break;
        }
      }
      if (!target && args.length > 0) {
        for (const arg of args) {
          if (isNaN(parseInt(arg, 10))) {
            target = await resolveUser(message, arg);
            if (target) break;
          }
        }
      }

      if (!target) {
        const rel = socialFunService.getRelationship(guild.id, author.id);
        if (rel.isMarried) {
          await message.reply(`💍 ${rel.message}`);
          return true;
        }
        await message.reply('💍 **Casamento:** Mencione a pessoa com quem deseja se casar e, opcionalmente, o valor da aliança!\nExemplo: `+marry @alguem 10000` ou `+marry @alguem`');
        return true;
      }

      if (target.id === author.id) {
        await message.reply('💍 Você não pode se casar com você mesmo! (Mesmo que o amor próprio seja louvável... 💖)');
        return true;
      }

      if (target.bot) {
        await message.reply('🤖 Bots não possuem estado civil reconhecido no protocolo legal, senhor!');
        return true;
      }

      try {
        const proposal = socialFunService.proposeMarriage(guild.id, author, target, customCost);
        const acceptBtn = new ButtonBuilder()
          .setCustomId(`marry_accept_${author.id}_${target.id}`)
          .setLabel('💍 Aceitar Pedido')
          .setStyle(ButtonStyle.Success);

        const declineBtn = new ButtonBuilder()
          .setCustomId(`marry_decline_${author.id}_${target.id}`)
          .setLabel('💔 Recusar')
          .setStyle(ButtonStyle.Danger);

        const row = new ActionRowBuilder().addComponents(acceptBtn, declineBtn);

        const ringText = proposal.cost > 0
          ? `\n💎 **Valor da Aliança/Dote Ofertado:** \`${proposal.cost.toLocaleString('pt-BR')} moedas\``
          : '';

        await message.reply({
          content: `🔔 <@${target.id}>, você recebeu um solene **pedido de casamento** de <@${author.id}>! 💖${ringText}\nVocê aceita compartilhar os reatores e formalizar essa união no cartório?`,
          components: [row]
        });
      } catch (err) {
        await message.reply(`❌ ${err.message}`);
      }
      return true;
    }

    case 'divorce':
    case 'divorciar':
    case 'separar': {
      try {
        const rel = socialFunService.getRelationship(guild.id, author.id);
        if (!rel.isMarried) {
          await message.reply('🕊️ Você não está casado com ninguém neste servidor no momento.');
          return true;
        }
        const exSpouseId = rel.spouseId;
        socialFunService.divorce(guild.id, author.id);
        await message.reply(`💔 O casamento entre <@${author.id}> e <@${exSpouseId}> foi oficialmente desfeito pelo cartório. Ambos agora estão solteiros(as).`);
      } catch (err) {
        await message.reply(`❌ ${err.message}`);
      }
      return true;
    }

    case '8ball':
    case 'bola8': {
      const question = args.join(' ').trim();
      if (!question) {
        await message.reply('🎱 Faça uma pergunta para a Bola 8 Mística!\nExemplo: `+8ball Eu vou ficar rico?`');
        return true;
      }
      const res8 = socialFunService.eightBall(question);
      await message.reply(res8.message);
      return true;
    }

    case 'interact':
    case 'interagir':
    case 'socar':
    case 'chutar':
    case 'zoar':
    case 'flertar':
    case 'cafune':
    case 'dancar':
    case 'cumprimentar': {
      let action = cmdName;
      let target = null;

      if (cmdName === 'interact' || cmdName === 'interagir') {
        action = args[0] || '';
        target = await resolveUser(message, args[1]);
      } else {
        target = await resolveUser(message, args[0]);
      }

      if (!target) {
        const available = Object.keys(SOCIAL_ACTIONS).join(', ');
        await message.reply(`🤗 **Como interagir:** \`+${cmdName} @usuário\`\nAções disponíveis: \`${available}\``);
        return true;
      }

      try {
        const interRes = socialFunService.interact(guild.id, action, author, target);
        const embed = new EmbedBuilder()
          .setColor(0xEB459E)
          .setDescription(`${interRes.emoji || '✨'} ${interRes.message}`)
          .setFooter({ text: `${aiName} • Social` });

        if (interRes.gif) {
          embed.setImage(interRes.gif);
        }
        await message.reply({ embeds: [embed] });
      } catch (err) {
        await message.reply(`❌ ${err.message}`);
      }
      return true;
    }

    case 'abracar':
    case 'abraçar':
    case 'hug': {
      const target = await resolveUser(message, args[0]);
      if (!target) {
        await message.reply('🤗 **Como abraçar:** `+abracar @alguem`\n*Dica: Use `+genero` para personalizar o estilo das animações de anime!*');
        return true;
      }

      try {
        const hugRes = socialFunService.hug(guild.id, author, target);
        const embed = new EmbedBuilder()
          .setColor(0x57F287)
          .setTitle('🤗 Abraço Aconchegante!')
          .setDescription(
            `${hugRes.message}\n\n` +
            `> *"${hugRes.comment}"*\n\n` +
            (hugRes.hugCount > 0 ? `🫂 **Abraços acumulados entre vocês:** \`${hugRes.hugCount}x\` • *${hugRes.tierTitle}*` : '')
          )
          .setFooter({ text: `${aiName} • Afeto & Comunidade` })
          .setTimestamp();

        if (hugRes.gif) {
          embed.setImage(hugRes.gif);
        }

        const components = [];
        if (!hugRes.isSelf && !hugRes.isBot) {
          const returnBtn = new ButtonBuilder()
            .setCustomId(`hug_return_${author.id}_${target.id}`)
            .setLabel('🤗 Retribuir Abraço')
            .setStyle(ButtonStyle.Success);
          components.push(new ActionRowBuilder().addComponents(returnBtn));
        }

        await message.reply({ embeds: [embed], components });
      } catch (err) {
        await message.reply(`❌ ${err.message}`);
      }
      return true;
    }

    case 'beijar':
    case 'kiss': {
      const target = await resolveUser(message, args[0]);
      if (!target) {
        await message.reply('💋 **Como beijar:** `+beijar @alguem`\n*Dica: Use `+genero` para personalizar seus GIFs de anime preferidos!*');
        return true;
      }

      try {
        const kissRes = socialFunService.kiss(guild.id, author, target);
        const embed = new EmbedBuilder()
          .setColor(0xFF2A85)
          .setTitle('💋 Beijo Romântico!')
          .setDescription(
            `${kissRes.message}\n\n` +
            `> *"${kissRes.comment}"*\n\n` +
            (kissRes.kissCount > 0 ? `💖 **Beijos acumulados deste casal:** \`${kissRes.kissCount}x\` • *${kissRes.tierTitle}*` : '')
          )
          .setFooter({ text: `${aiName} • Romance & Afeto Social` })
          .setTimestamp();

        if (kissRes.gif) {
          embed.setImage(kissRes.gif);
        }

        const components = [];
        if (!kissRes.isSelf && !kissRes.isBot) {
          const returnBtn = new ButtonBuilder()
            .setCustomId(`kiss_return_${author.id}_${target.id}`)
            .setLabel('💋 Retribuir Beijo')
            .setStyle(ButtonStyle.Success);
          components.push(new ActionRowBuilder().addComponents(returnBtn));
        }

        await message.reply({ embeds: [embed], components });
      } catch (err) {
        await message.reply(`❌ ${err.message}`);
      }
      return true;
    }

    case 'genero':
    case 'sexo': {
      const arg = (args[0] || '').toLowerCase().trim();
      const validOptions = [
        'masculino', 'm', 'homem',
        'feminino', 'f', 'mulher',
        'hetero', 'hétero',
        'yaoi', 'gay', 'bl',
        'yuri', 'lesbica', 'lésbica', 'gl',
        'neutro', 'nb',
        'livre', 'any'
      ];
      if (!arg || !validOptions.includes(arg)) {
        await message.reply(
          '⚧️ **Como definir seu gênero ou preferência de animes:**\n' +
          '• `+genero masculino` (Ele/Dele • padrão Hetero)\n' +
          '• `+genero feminino` (Ela/Dela • padrão Hetero)\n' +
          '• `+genero hetero` (Fixar GIFs de casal Hetero: Homem x Mulher)\n' +
          '• `+genero yaoi` (Fixar GIFs Yaoi / BL: Homem x Homem)\n' +
          '• `+genero yuri` (Fixar GIFs Yuri / GL: Mulher x Mulher)\n' +
          '• `+genero neutro` (Não-binário / Elu/Delu)\n' +
          '• `+genero livre` (Sem filtro / Sorteio entre todos os 100 GIFs)\n\n' +
          '*Isso garante que comandos como `+beijar` e `+abracar` exibam exatamente o estilo de anime que você curte!*'
        );
        return true;
      }

      socialFunService.setUserGender(author.id, arg);
      const labels = {
        masculino: '👨 Masculino (Padrão Hetero)',
        m: '👨 Masculino (Padrão Hetero)',
        homem: '👨 Masculino (Padrão Hetero)',
        feminino: '👩 Feminino (Padrão Hetero)',
        f: '👩 Feminino (Padrão Hetero)',
        mulher: '👩 Feminino (Padrão Hetero)',
        hetero: '👫 Hetero (Homem x Mulher)',
        'hétero': '👫 Hetero (Homem x Mulher)',
        yaoi: '👬 Yaoi / BL (Homem x Homem)',
        gay: '👬 Yaoi / BL (Homem x Homem)',
        bl: '👬 Yaoi / BL (Homem x Homem)',
        yuri: '👭 Yuri / GL (Mulher x Mulher)',
        lesbica: '👭 Yuri / GL (Mulher x Mulher)',
        'lésbica': '👭 Yuri / GL (Mulher x Mulher)',
        gl: '👭 Yuri / GL (Mulher x Mulher)',
        neutro: '✨ Não-binário / Neutro',
        nb: '✨ Não-binário / Neutro',
        livre: '🌈 Livre / Sem Preferência',
        any: '🌈 Livre / Sem Preferência'
      };

      await message.reply(`✅ Perfil atualizado com sucesso! Sua preferência de anime foi definida como **${labels[arg] || arg}**.`);
      return true;
    }

    case 'raffle':
    case 'sorteio': {
      let candidates = [];
      if (args.length > 0) {
        const raw = args.join(' ');
        if (raw.includes(',')) {
          candidates = raw.split(',').map(s => s.trim()).filter(Boolean);
        } else {
          candidates = args.map(s => s.trim()).filter(Boolean);
        }
      } else {
        const members = Array.from(message.channel.members?.values() || [])
          .filter(m => !m.user.bot)
          .map(m => `<@${m.id}>`);
        candidates = members;
      }

      if (candidates.length < 2) {
        await message.reply('🎉 **Sorteio:** Forneça pelo menos 2 opções ou mencione membros!\nExemplo: `+raffle Pizza, Hambúrguer, Sushi` ou `+raffle @user1 @user2 @user3`');
        return true;
      }

      const raffleRes = socialFunService.raffle(candidates);
      await message.reply(raffleRes.message);
      return true;
    }

    case 'quiz': {
      if (!quizService) {
        await message.reply('❌ O serviço de Quiz não está disponível no momento.');
        return true;
      }

      const sub = (args[0] || '').toLowerCase().trim();

      if (sub === 'stop' || sub === 'parar' || sub === 'cancelar') {
        try {
          await quizService.stopQuiz(guild.id, message.channel.id, author);
        } catch (err) {
          await message.reply(`❌ ${err.message}`);
        }
        return true;
      }

      if (sub === 'pular' || sub === 'skip') {
        try {
          await quizService.skipQuestion(guild.id, message.channel.id, author, message);
        } catch (err) {
          await message.reply(`❌ ${err.message}`);
        }
        return true;
      }

      if (sub === 'placar' || sub === 'score' || sub === 'pontos') {
        const scores = quizService.getCurrentScores(message.channel.id);
        if (!scores) {
          await message.reply('ℹ️ Não há nenhuma partida de Quiz em andamento neste canal. Inicie com `+quiz`!');
          return true;
        }
        if (scores.length === 0) {
          await message.reply('📊 Placar atual: Nenhum participante pontuou ainda nesta partida.');
          return true;
        }
        const medals = ['🥇', '🥈', '🥉', '🎖️', '🎖️'];
        const lines = scores.map((s, idx) => `${medals[idx] || '🎖️'} <@${s.user.id}> — **${s.points} pts** (${s.correctCount} acertos)`).join('\n');
        const embed = new EmbedBuilder()
          .setColor(0xF1C40F)
          .setTitle('📊 Placar Parcial da Partida')
          .setDescription(lines)
          .setFooter({ text: `${aiName} • Quiz Arena` });
        await message.reply({ embeds: [embed] });
        return true;
      }

      if (sub === 'top' || sub === 'ranking' || sub === 'leaderboard') {
        const top = quizService.getLeaderboard(guild.id, 10);
        if (top.length === 0) {
          await message.reply('🏆 O servidor ainda não possui campeões registrados no Quiz Arena. Seja o primeiro usando `+quiz`!');
          return true;
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
        await message.reply({ embeds: [embed] });
        return true;
      }

      if (sub === 'categorias' || sub === 'cats' || sub === 'modos') {
        const allCats = quizService.getAllCategories(guild.id);
        const sysCats = Object.entries(allCats).filter(([_, cat]) => !cat.isCustom);
        const customCats = Object.entries(allCats).filter(([_, cat]) => cat.isCustom);

        const sysFields = sysCats.map(([key, cat]) => ({
          name: `${cat.emoji} ${cat.name} (\`+quiz ${key}\`)`,
          value: cat.description || 'Categoria temática padrão',
          inline: false
        }));

        const customFields = customCats.map(([key, cat]) => ({
          name: `${cat.emoji} ${cat.name} (\`+quiz ${key}\`) [⭐ Servidor]`,
          value: cat.description || 'Categoria criada pela comunidade deste servidor',
          inline: false
        }));

        const embed = new EmbedBuilder()
          .setColor(0x5865F2)
          .setTitle('📁 Categorias do Desafio Neural — J.A.R.V.I.S. Quiz Arena')
          .setDescription(
            'Escolha uma das categorias abaixo para iniciar ou jogue no modo misto:\n\n' +
            '🎲 **Modo Misto** (`+quiz misto` ou apenas `+quiz`): Perguntas sorteadas aleatoriamente de todas as áreas!\n' +
            '♾️ **Modo Infinito** (`+quiz infinito [categoria]`): Sem limite de rodadas! Encerre com `+quiz parar`.\n\n' +
            '💡 **Como Iniciar:** `+quiz <categoria> [rodadas]`\nExemplo: `+quiz animes 5` ou `+quiz computacao infinito`\n\n' +
            '🎨 **Categorias Customizadas:** Crie com `+quiz criarcategoria` ou remova com `+quiz deletarcategoria`!\n' +
            '🛠️ **Perguntas Customizadas:** Crie com `+quiz criar`, edite com `+quiz editar` ou liste com `+quiz lista`!'
          )
          .addFields(sysFields.concat(customFields))
          .setFooter({ text: `${aiName} • Protocolo M.A.R.K. Quiz` });
        await message.reply({ embeds: [embed] });
        return true;
      }

      if (['criarcategoria', 'addcategoria', 'novacategoria', 'criarcat'].includes(sub)) {
        const isAdmin = member.permissions.has(PermissionFlagsBits.ManageGuild) || member.permissions.has(PermissionFlagsBits.Administrator);
        if (!isAdmin) {
          await message.reply('❌ Você precisa da permissão de **Gerenciar Servidor** para criar novas categorias de Quiz.');
          return true;
        }

        const rawBody = message.content.replace(/^\+[a-zA-Z0-9_]+\s+(criarcategoria|addcategoria|novacategoria|criarcat)\s*/i, '').trim();
        const parts = rawBody.split('|').map(p => p.trim());

        if (parts.length < 2 || !parts[0] || !parts[1]) {
          const guideEmbed = new EmbedBuilder()
            .setColor(0x5865F2)
            .setTitle('🎨 Como Criar uma Nova Categoria de Quiz')
            .setDescription(
              'Crie categorias temáticas exclusivas para as partidas do seu servidor!\n\n' +
              '📌 **Formato:**\n' +
              '`+quiz criarcategoria <chave> | <nome> | [emoji ou url foto] | [cor hex] | [descrição]`\n\n' +
              '✨ **Exemplo:**\n' +
              '`+quiz criarcategoria culinaria | Culinária & Gastronomia | 🍳 | #E91E63 | Perguntas sobre receitas, chefs e temperos`\n\n' +
              '📍 A **chave** será usada para iniciar o quiz (ex: `+quiz culinaria`).'
            )
            .setFooter({ text: `${aiName} • Gerenciador de Categorias` });
          await message.reply({ embeds: [guideEmbed] });
          return true;
        }

        const key = parts[0].toLowerCase().replace(/[^a-z0-9_-]/g, '').trim();
        const name = parts[1];
        const emoji = parts[2] || '📁';
        const color = (parts[3] && parts[3].startsWith('#')) ? parts[3] : '#5865F2';
        const description = parts[4] || '';

        try {
          const created = quizService.createCustomCategory({
            guildId: guild.id,
            authorId: author.id,
            key,
            name,
            emoji,
            color,
            description
          });

          const embed = new EmbedBuilder()
            .setColor(0x57F287)
            .setTitle(`✅ Categoria "${created.name}" Criada com Sucesso!`)
            .setDescription(
              `Nova categoria disponível no servidor!\n\n` +
              `🏷️ **Nome:** ${created.emoji} **${created.name}**\n` +
              `🔑 **Chave de ativação:** \`+quiz ${created.key}\`\n` +
              `💬 **Descrição:** ${created.description || 'Sem descrição'}\n\n` +
              `Cadastre perguntas para esta categoria com \`+quiz criar ${created.key} | ...\` ou pelo Painel Web!`
            )
            .setFooter({ text: `${aiName} • Custom Quiz Categories` });
          await message.reply({ embeds: [embed] });
        } catch (err) {
          await message.reply(`❌ Erro ao criar categoria: ${err.message}`);
        }
        return true;
      }

      if (['deletarcategoria', 'removercategoria', 'delcat', 'excluircategoria'].includes(sub)) {
        const isAdmin = member.permissions.has(PermissionFlagsBits.ManageGuild) || member.permissions.has(PermissionFlagsBits.Administrator);
        if (!isAdmin) {
          await message.reply('❌ Você precisa da permissão de **Gerenciar Servidor** para remover categorias de Quiz.');
          return true;
        }

        const targetKey = (args[1] || '').toLowerCase().trim();
        if (!targetKey) {
          await message.reply('❌ Informe a chave ou ID da categoria a ser excluída. Exemplo: `+quiz deletarcategoria culinaria`');
          return true;
        }

        try {
          if (/^\d+$/.test(targetKey)) {
            quizService.deleteCustomCategory(parseInt(targetKey, 10), guild.id);
          } else {
            quizService.deleteCustomCategoryByKey(guild.id, targetKey);
          }
          await message.reply(`✅ Categoria customizada **${targetKey}** removida com sucesso.`);
        } catch (err) {
          await message.reply(`❌ Erro ao remover categoria: ${err.message}`);
        }
        return true;
      }

      if (['criar', 'add', 'novapergunta', 'adicionar'].includes(sub)) {
        const rawBody = message.content.replace(/^\+[a-zA-Z0-9_]+\s+(criar|add|novapergunta|adicionar)\s*/i, '').trim();
        const parts = rawBody.split('|').map(p => p.trim());

        if (parts.length < 4 || !parts[0] || !parts[1] || !parts[2] || !parts[3]) {
          const guideEmbed = new EmbedBuilder()
            .setColor(0x5865F2)
            .setTitle('🛠️ Como Criar uma Pergunta Customizada de Quiz')
            .setDescription(
              'Você pode criar perguntas próprias para o Quiz do servidor! Elas serão sorteadas automaticamente nas partidas.\n\n' +
              '📌 **Formato de Envio:**\n' +
              '`+quiz criar <categoria> | <pergunta> | <respostas aceitas> | <explicação> | [url_da_foto]`\n\n' +
              '📸 **Fotos & Imagens:**\n' +
              'Você pode colocar a URL da imagem no final ou **anexar uma imagem diretamente na mensagem** do Discord!\n\n' +
              '✨ **Exemplo Prático:**\n' +
              '`+quiz criar series | Qual o alter-ego de Walter White em Breaking Bad? | Heisenberg, Walter Heisenberg | Walter adotou o nome em tributo ao físico Werner Heisenberg. | https://...`\n\n' +
              '📍 **Dica de Respostas:**\n' +
              'Separe sinônimos por vírgula (ex: `São Paulo, SP, Sampa`) para que qualquer uma dessas respostas seja aceita!'
            )
            .setFooter({ text: `${aiName} • Protocolo de Criação Neural` });
          await message.reply({ embeds: [guideEmbed] });
          return true;
        }

        const rawCat = parts[0];
        const resolvedCat = quizService.resolveCategory(rawCat, guild.id);
        const questionText = parts[1];
        const answersText = parts[2];
        const explanationText = parts[3];
        const attachedImg = (typeof message.attachments?.first === 'function' ? message.attachments.first()?.url : null) || (Array.isArray(message.attachments) ? message.attachments[0]?.url : null) || null;
        const imageUrl = (parts[4] && parts[4].startsWith('http')) ? parts[4] : attachedImg;

        try {
          const created = quizService.createCustomQuestion({
            guildId: guild.id,
            authorId: author.id,
            category: resolvedCat,
            question: questionText,
            answers: answersText,
            explanation: explanationText,
            imageUrl
          });

          const allCats = quizService.getAllCategories(guild.id);
          const catObj = allCats[resolvedCat] || { name: resolvedCat, emoji: '📁' };

          const successEmbed = new EmbedBuilder()
            .setColor(0x57F287)
            .setTitle(`✅ Pergunta #${created.id} Criada com Sucesso!`)
            .setDescription(
              `Sua pergunta foi cadastrada no banco de dados e já entrará nas próximas partidas de Quiz do servidor!\n\n` +
              `📁 **Categoria:** ${catObj.emoji} **${catObj.name}**\n` +
              `📢 **Pergunta:** ${created.question}\n` +
              `🔑 **Respostas Aceitas:** ${created.answers.map(a => `||\`${a}\`||`).join(', ')} *(spoiler)*\n` +
              `💡 **Explicação:** ${created.explanation}\n` +
              `👤 **Autor:** <@${author.id}>\n\n` +
              `🗑️ Para remover no futuro: \`+quiz deletar ${created.id}\``
            )
            .setFooter({ text: `${aiName} • Custom Quiz Question Engine` })
            .setTimestamp();

          if (created.imageUrl) {
            successEmbed.setImage(created.imageUrl);
          }

          await message.reply({ embeds: [successEmbed] });
        } catch (err) {
          await message.reply(`❌ Erro ao criar pergunta: ${err.message}`);
        }
        return true;
      }

      if (['lista', 'minhas', 'custom', 'perguntas'].includes(sub)) {
        const list = quizService.getCustomQuestions(guild.id);
        if (list.length === 0) {
          await message.reply(
            'ℹ️ Nenhuma pergunta customizada foi criada neste servidor ainda!\n' +
            'Use `+quiz criar` para cadastrar a primeira pergunta com suas próprias regras, respostas e foto!'
          );
          return true;
        }

        const lines = list.slice(0, 15).map(q => {
          const catObj = QUIZ_CATEGORIES[q.category] || { emoji: '📁', name: q.category };
          const preview = q.question.length > 55 ? q.question.slice(0, 52) + '...' : q.question;
          return `**#${q.id}** [${catObj.emoji} ${catObj.name}] — *${preview}* (por <@${q.authorId}>)`;
        }).join('\n\n');

        const embed = new EmbedBuilder()
          .setColor(0x5865F2)
          .setTitle(`📌 Perguntas Customizadas do Servidor (${list.length})`)
          .setDescription(
            `Estas perguntas entram no sorteio das partidas do servidor:\n\n${lines}\n\n` +
            (list.length > 15 ? `*...e mais ${list.length - 15} perguntas cadastradas.*\n\n` : '') +
            '➕ Para criar: `+quiz criar`\n' +
            '🗑️ Para apagar: `+quiz deletar <id>`'
          )
          .setFooter({ text: `${aiName} • Custom Quiz Questions` })
          .setTimestamp();

        await message.reply({ embeds: [embed] });
        return true;
      }

      if (['deletar', 'remover', 'del', 'excluir'].includes(sub)) {
        const targetId = parseInt(args[1], 10);
        if (!targetId || isNaN(targetId)) {
          await message.reply('❌ Informe o ID da pergunta a ser deletada. Exemplo: `+quiz deletar 1` (consulte os IDs com `+quiz lista`).');
          return true;
        }

        const existing = quizService.getCustomQuestionById(targetId, guild.id);
        if (!existing) {
          await message.reply(`❌ Nenhuma pergunta ativa encontrada com o ID #${targetId} neste servidor.`);
          return true;
        }

        const isAuthor = existing.authorId === author.id;
        const isAdmin = member.permissions.has(PermissionFlagsBits.ManageGuild) || member.permissions.has(PermissionFlagsBits.Administrator);

        if (!isAuthor && !isAdmin) {
          await message.reply('❌ Você só pode deletar perguntas que você mesmo criou, a menos que possua permissão de **Gerenciar Servidor**.');
          return true;
        }

        try {
          quizService.deleteCustomQuestion(targetId, guild.id);
          await message.reply(`✅ Pergunta customizada **#${targetId}** foi removida com sucesso.`);
        } catch (err) {
          await message.reply(`❌ Erro ao deletar pergunta: ${err.message}`);
        }
        return true;
      }

      if (['editar', 'edit', 'modificar'].includes(sub)) {
        const rawBody = message.content.replace(/^\+[a-zA-Z0-9_]+\s+(editar|edit|modificar)\s*/i, '').trim();
        const parts = rawBody.split('|').map(p => p.trim());

        if (parts.length < 5 || !parts[0] || !parts[1] || !parts[2] || !parts[3] || !parts[4]) {
          const guideEmbed = new EmbedBuilder()
            .setColor(0x5865F2)
            .setTitle('✏️ Como Editar uma Pergunta Customizada')
            .setDescription(
              'Você pode atualizar qualquer pergunta customizada que você criou (ou se for Administrador)!\n\n' +
              '📌 **Formato de Envio:**\n' +
              '`+quiz editar <id> | <categoria> | <pergunta> | <respostas aceitas> | <explicação> | [url_foto]`\n\n' +
              '✨ **Exemplo:**\n' +
              '`+quiz editar 3 | series | Qual o alter-ego de Walter White? | Heisenberg, Walter | Codinome inspirado no físico Werner Heisenberg. | https://...`\n\n' +
              'Consulte os IDs existentes com `+quiz lista`.'
            )
            .setFooter({ text: `${aiName} • Custom Quiz Editor` });
          await message.reply({ embeds: [guideEmbed] });
          return true;
        }

        const targetId = parseInt(parts[0], 10);
        if (!targetId || isNaN(targetId)) {
          await message.reply('❌ ID da pergunta inválido. Exemplo: `+quiz editar 1 | ...`');
          return true;
        }

        const existing = quizService.getCustomQuestionById(targetId, guild.id);
        if (!existing) {
          await message.reply(`❌ Nenhuma pergunta ativa encontrada com ID #${targetId} neste servidor.`);
          return true;
        }

        const isAuthor = existing.authorId === author.id;
        const isAdmin = member.permissions.has(PermissionFlagsBits.ManageGuild) || member.permissions.has(PermissionFlagsBits.Administrator);
        if (!isAuthor && !isAdmin) {
          await message.reply('❌ Você só pode editar perguntas criadas por você, a menos que possua permissão de **Gerenciar Servidor**.');
          return true;
        }

        const rawCat = parts[1];
        const resolvedCat = quizService.resolveCategory(rawCat, guild.id);
        const questionText = parts[2];
        const answersText = parts[3];
        const explanationText = parts[4];
        const attachedImg = (typeof message.attachments?.first === 'function' ? message.attachments.first()?.url : null) || (Array.isArray(message.attachments) ? message.attachments[0]?.url : null) || null;
        const imageUrl = (parts[5] && parts[5].startsWith('http')) ? parts[5] : (attachedImg || existing.imageUrl);

        try {
          const updated = quizService.updateCustomQuestion(targetId, guild.id, {
            category: resolvedCat,
            question: questionText,
            answers: answersText,
            explanation: explanationText,
            imageUrl
          });

          const allCats = quizService.getAllCategories(guild.id);
          const catObj = allCats[resolvedCat] || { name: resolvedCat, emoji: '📁' };

          const successEmbed = new EmbedBuilder()
            .setColor(0x57F287)
            .setTitle(`✅ Pergunta #${targetId} Atualizada com Sucesso!`)
            .setDescription(
              `As alterações foram salvas e valem para as próximas partidas:\n\n` +
              `📁 **Categoria:** ${catObj.emoji} **${catObj.name}**\n` +
              `📢 **Pergunta:** ${updated.question}\n` +
              `🔑 **Respostas Aceitas:** ${updated.answers.map(a => `||\`${a}\`||`).join(', ')} *(spoiler)*\n` +
              `💡 **Explicação:** ${updated.explanation}\n`
            )
            .setFooter({ text: `${aiName} • Custom Quiz Editor` });
          if (updated.imageUrl) successEmbed.setImage(updated.imageUrl);
          await message.reply({ embeds: [successEmbed] });
        } catch (err) {
          await message.reply(`❌ Erro ao editar pergunta: ${err.message}`);
        }
        return true;
      }

      let categoryInput = 'misto';
      let roundsInput = 5;
      let isInfinite = false;

      const rawTokens = args.map(a => String(a).toLowerCase().trim());
      if (rawTokens.some(t => ['infinito', 'endless', 'infinity', 'semfim'].includes(t))) {
        isInfinite = true;
      }

      const filteredArgs = args.filter(a => !['start', 'iniciar', 'infinito', 'endless', 'infinity', 'semfim'].includes(a.toLowerCase().trim()));

      for (const arg of filteredArgs) {
        const clean = arg.toLowerCase().trim();
        if (['games', 'animes', 'futebol', 'geral', 'computacao', 'computação', 'pc', 'hardware', 'dev', 'programacao', 'programação', 'ti', 'tech', 'marvel', 'stark', 'series', 'serie', 'cinema', 'filme', 'musica', 'música', 'mitologia', 'mito', 'historia', 'história', 'desenhos', 'desenho', 'cartoons', 'geografia', 'geo', 'misto', 'jogos', 'anime', 'fut', 'ciencias'].includes(clean)) {
          categoryInput = clean;
        } else if (!isNaN(parseInt(clean, 10))) {
          const num = parseInt(clean, 10);
          if (num <= 0) {
            isInfinite = true;
          } else {
            roundsInput = num;
          }
        }
      }

      try {
        await quizService.startQuiz({
          guild,
          channel: message.channel,
          author,
          categoryInput,
          roundsInput,
          isInfinite
        });
      } catch (err) {
        await message.reply(`❌ ${err.message}`);
      }
      return true;
    }

    case 'bolao': {
      const service = context.predictionService || new (require('../../services/predictionService').PredictionService)(context.dbManager);
      const sub = args[0]?.toLowerCase();

      if (sub === 'criar' || sub === 'novo' || sub === 'abrir') {
        const title = args.slice(1).join(' ').trim();
        if (!title) {
          await message.reply('❌ Você precisa definir a pergunta do bolão. Exemplo: `+bolao criar O Mengão vai ganhar o jogo hoje?`');
          return true;
        }
        try {
          const pred = service.createPrediction(guild.id, author.id, title);
          const embed = new EmbedBuilder()
            .setTitle('🎲 Novo Bolão Aberto para Apostas!')
            .setDescription(
              `**Pergunta:** "${pred.title}"\n\n` +
              `**Como Apostar:**\n` +
              `• Digite \`+bolao apostar sim <valor>\` para apostar no **SIM**\n` +
              `• Digite \`+bolao apostar nao <valor>\` para apostar no **NÃO**\n\n` +
              `*Criado por <@${author.id}> • Pote Atual: 0 moedas*`
            )
            .setColor(0x57F287)
            .setFooter({ text: `${aiName} • Bolão do Servidor` })
            .setTimestamp();
          await message.reply({ embeds: [embed] });
        } catch (err) {
          await message.reply(`❌ ${err.message}`);
        }
        return true;
      }

      if (sub === 'apostar' || sub === 'bet') {
        const choice = args[1];
        const amount = parseInt(args[2], 10);
        if (!choice || isNaN(amount) || amount <= 0) {
          await message.reply('❌ Uso correto: `+bolao apostar <sim|nao> <valor>`. Exemplo: `+bolao apostar sim 200`');
          return true;
        }
        try {
          const res = service.placeBet(guild.id, author.id, choice, amount, context.economyService);
          await message.reply(
            `✅ **Aposta Confirmada!** Você apostou **${res.amount} moedas** no **${res.choice}**.\n` +
            `📊 **Pote Total:** ${res.updatedPrediction.total_pool} moedas (${res.updatedPrediction.betsSimCount} apostas em SIM / ${res.updatedPrediction.betsNaoCount} apostas em NÃO)`
          );
        } catch (err) {
          await message.reply(`❌ ${err.message}`);
        }
        return true;
      }

      if (sub === 'travar' || sub === 'fechar' || sub === 'lock') {
        const isAdmin = member.permissions.has(PermissionFlagsBits.Administrator);
        try {
          const pred = service.lockPrediction(guild.id, author.id, isAdmin);
          await message.reply(
            `🔒 **Apostas Travadas!** O bolão "${pred.title}" não aceita mais novas apostas.\n` +
            `💰 **Pote Final Acumulado:** **${pred.total_pool} moedas**.\n` +
            `*Aguardando o resultado do evento para divisão do prêmio!*`
          );
        } catch (err) {
          await message.reply(`❌ ${err.message}`);
        }
        return true;
      }

      if (sub === 'finalizar' || sub === 'encerrar' || sub === 'resolver') {
        const winningChoice = args[1];
        if (!winningChoice) {
          await message.reply('❌ Especifique o resultado vencedor: `+bolao finalizar sim` ou `+bolao finalizar nao`.');
          return true;
        }
        const isAdmin = member.permissions.has(PermissionFlagsBits.Administrator);
        try {
          const res = service.resolvePrediction(guild.id, winningChoice, author.id, isAdmin, context.economyService);
          let desc = `**Resultado Oficial:** O lado vencedor foi **${res.winningChoice}**!\n`;
          desc += `💰 **Pote Total Distribuído:** **${res.totalPool} moedas**\n\n`;

          if (res.winnersCount > 0) {
            desc += `🏆 **Ganhadores (${res.winnersCount}):**\n`;
            for (const p of res.payouts) {
              desc += `• <@${p.userId}>: apostou ${p.betAmount} e faturou **${p.payout} moedas** *(+${p.profit})*\n`;
            }
          } else {
            desc += `⚠️ *Ninguém acertou o resultado! Todos os participantes receberam 100% de reembolso de suas apostas.*`;
          }

          const embed = new EmbedBuilder()
            .setTitle(`🎉 Bolão Finalizado: "${res.prediction.title}"`)
            .setDescription(desc)
            .setColor(0xFEE75C)
            .setFooter({ text: `${aiName} • Premiação do Bolão` })
            .setTimestamp();

          await message.reply({ embeds: [embed] });
        } catch (err) {
          await message.reply(`❌ ${err.message}`);
        }
        return true;
      }

      if (sub === 'cancelar' || sub === 'cancel') {
        const isAdmin = member.permissions.has(PermissionFlagsBits.Administrator);
        try {
          const res = service.cancelPrediction(guild.id, author.id, isAdmin, context.economyService);
          await message.reply(`🚫 **Bolão Cancelado!** ${res.refundCount} aposta(s) foram reembolsadas (total de ${res.totalRefunded} moedas devolvidas).`);
        } catch (err) {
          await message.reply(`❌ ${err.message}`);
        }
        return true;
      }

      const pred = service.getActivePrediction(guild.id);
      if (!pred) {
        await message.reply(
          `ℹ️ **Não há nenhum bolão ativo no momento.**\n` +
          `Crie um novo agora mesmo usando: \`+bolao criar <pergunta>\`\n` +
          `*Exemplo:* \`+bolao criar O Mengão vai ganhar hoje?\``
        );
        return true;
      }

      const statusBadge = pred.status === 'OPEN' ? '🟢 **ABERTO PARA APOSTAS**' : '🔒 **APOSTAS TRAVADAS (Aguardando resultado)**';
      const embed = new EmbedBuilder()
        .setTitle(`🎲 Bolão Ativo: "${pred.title}"`)
        .setDescription(
          `**Status:** ${statusBadge}\n` +
          `**Pote Total Acumulado:** **${pred.total_pool} moedas**\n\n` +
          `📊 **Apostas Registradas:**\n` +
          `• **SIM:** ${pred.betsSimCount} apostas (${pred.poolSim} moedas no pote)\n` +
          `• **NÃO:** ${pred.betsNaoCount} apostas (${pred.poolNao} moedas no pote)\n\n` +
          (pred.status === 'OPEN'
            ? `**Como Participar:**\nDigite \`+bolao apostar sim <valor>\` ou \`+bolao apostar nao <valor>\`\n`
            : `*As apostas estão encerradas. O criador ou admin deve usar \`+bolao finalizar <sim|nao>\` após o desfecho!*\n`) +
          `\n*Criado por <@${pred.creator_id}> • ID #${pred.id}*`
        )
        .setColor(0x5865F2)
        .setFooter({ text: `${aiName} • Digite +bolao para atualizar` })
        .setTimestamp();

      await message.reply({ embeds: [embed] });
      return true;
    }

    case 'avaliacoes':
    case 'reviewstats': {
      if (!context.reviewService) {
        await message.reply('❌ Módulo de avaliações temporariamente indisponível.');
        return true;
      }
      const targetStaff = (await resolveUser(message, args[0])) || null;
      const stats = context.reviewService.getStats(guild.id, targetStaff ? targetStaff.id : null);
      if (stats.total === 0) {
        await message.reply(
          targetStaff
            ? `📊 <@${targetStaff.id}> ainda não possui avaliações registradas.`
            : '📊 Ainda não há avaliações registradas neste servidor.'
        );
        return true;
      }

      const starsDisplay = '⭐'.repeat(Math.round(stats.average)) + '☆'.repeat(5 - Math.round(stats.average));
      const breakdownText = [
        `⭐ 5 estrelas: **${stats.breakdown[5]}**`,
        `⭐ 4 estrelas: **${stats.breakdown[4]}**`,
        `⭐ 3 estrelas: **${stats.breakdown[3]}**`,
        `⭐ 2 estrelas: **${stats.breakdown[2]}**`,
        `⭐ 1 estrela: **${stats.breakdown[1]}**`
      ].join('\n');

      const embed = new EmbedBuilder()
        .setColor(0xFEE75C)
        .setTitle(
          targetStaff
            ? `🌟 Reputação de ${targetStaff.username}`
            : `🌟 Reputação Geral do Servidor — ${guild.name}`
        )
        .addFields(
          { name: 'Média de Satisfação', value: `**${stats.average}** / 5.0\n${starsDisplay}`, inline: true },
          { name: 'Total de Avaliações', value: `**${stats.total}** feedbacks`, inline: true },
          { name: 'Distribuição das Notas', value: breakdownText, inline: false }
        )
        .setFooter({ text: `${aiName} • Estatísticas de Atendimento` })
        .setTimestamp();

      await message.reply({ embeds: [embed] });
      return true;
    }

    case 'avaliar':
    case 'review': {
      if (!context.reviewService) {
        const errEmbed = new EmbedBuilder()
          .setColor(0xED4245)
          .setTitle('⚠️ Sistema em Manutenção')
          .setDescription('O módulo de avaliações da equipe está temporariamente desativado neste servidor.')
          .setFooter({ text: aiName + ' • Central de Atendimento' })
          .setTimestamp();
        await message.reply({ embeds: [errEmbed] });
        return true;
      }

      if (!args || args.length === 0) {
        const helpEmbed = new EmbedBuilder()
          .setColor(0x00E5FF)
          .setTitle('⭐ Como Avaliar a Equipe de Atendimento')
          .setDescription(
            'Membros podem avaliar o atendimento de membros da administração!\n\n' +
            '**📌 Formato Obrigatório:**\n' +
            '• `+avaliar @administrador <1 a 5> [comentário opcional]`\n\n' +
            '**💡 Exemplos Práticos:**\n' +
            '• `+avaliar @Syll 5` *(avaliação rápida de 5 estrelas)*\n' +
            '• `+avaliar @Syll 5 Atendimento nota 10, muito prestativo!`\n\n' +
            '*(Nota: Apenas membros com cargo de Administrador podem receber avaliações.)*\n' +
            '*Você também pode usar o comando slash `/avaliar`.*'
          )
          .setFooter({ text: aiName + ' • Central de Avaliações' })
          .setTimestamp();
        await message.reply({ embeds: [helpEmbed] });
        return true;
      }

      const firstCandidate = await resolveUser(message, args[0]);
      if (!firstCandidate) {
        const errEmbed = new EmbedBuilder()
          .setColor(0xED4245)
          .setTitle('⚠️ Formato Incorreto')
          .setDescription(
            'Você deve mencionar ou informar o ID do administrador avaliado.\n\n' +
            '📌 **Uso correto:**\n' +
            '• `+avaliar @administrador <1 a 5> [comentário opcional]`\n\n' +
            '💡 **Exemplo:**\n' +
            '• `+avaliar @Syll 5 Atendimento nota 10!`'
          )
          .setFooter({ text: aiName + ' • Central de Qualidade & Atendimento' })
          .setTimestamp();
        await message.reply({ embeds: [errEmbed] });
        return true;
      }

      if (firstCandidate.id === author.id) {
        const errEmbed = new EmbedBuilder()
          .setColor(0xED4245)
          .setTitle('⚠️ Autoavaliação Não Permitida')
          .setDescription('Você não pode avaliar a si mesmo!')
          .setFooter({ text: aiName + ' • Central de Qualidade & Atendimento' })
          .setTimestamp();
        await message.reply({ embeds: [errEmbed] });
        return true;
      }

      if (firstCandidate.bot) {
        const errEmbed = new EmbedBuilder()
          .setColor(0xED4245)
          .setTitle('⚠️ Usuário Inválido')
          .setDescription('Bots não podem receber avaliações de atendimento.')
          .setFooter({ text: aiName + ' • Central de Qualidade & Atendimento' })
          .setTimestamp();
        await message.reply({ embeds: [errEmbed] });
        return true;
      }

      let targetMember = guild.members?.cache?.get(firstCandidate.id);
      if (!targetMember && guild.members?.fetch) {
        try {
          targetMember = await guild.members.fetch(firstCandidate.id);
        } catch (e) {}
      }

      if (!permissionService.isAdmin(targetMember)) {
        const errEmbed = new EmbedBuilder()
          .setColor(0xED4245)
          .setTitle('⚠️ Apenas Administradores Podem Ser Avaliados')
          .setDescription(
            'O membro <@' + firstCandidate.id + '> não possui cargo de Administrador no servidor.\n\n' +
            'O sistema de avaliações é exclusivo para os membros avaliarem a **equipe administrativa**.'
          )
          .setFooter({ text: aiName + ' • Central de Qualidade & Atendimento' })
          .setTimestamp();
        await message.reply({ embeds: [errEmbed] });
        return true;
      }

      const targetStaff = firstCandidate;
      const rawRating = args[1];
      const ratingNum = parseInt(rawRating, 10);
      if (isNaN(ratingNum) || ratingNum < 1 || ratingNum > 5) {
        const staffName = targetStaff.username || 'staff';
        const errEmbed = new EmbedBuilder()
          .setColor(0xED4245)
          .setTitle('⚠️ Nota Obrigatória (1 a 5 estrelas)')
          .setDescription(
            'Você precisa informar uma nota de **1 a 5** para a avaliação.\n\n' +
            '📌 **Formato:** `+avaliar @' + staffName + ' <1 a 5> [comentário]`\n\n' +
            '💡 **Exemplos:**\n' +
            '• `+avaliar @' + staffName + ' 5`\n' +
            '• `+avaliar @' + staffName + ' 5 Atendimento excelente!`\n' +
            '• `+avaliar @' + staffName + ' 3 Demorou um pouco mas resolveu.`'
          )
          .setFooter({ text: aiName + ' • Central de Qualidade & Atendimento' })
          .setTimestamp();
        await message.reply({ embeds: [errEmbed] });
        return true;
      }

      const commentParts = args.slice(2);
      const comment = commentParts.join(' ').trim();

      if (!comment || comment.length === 0) {
        const staffName = targetStaff.username || 'staff';
        const errEmbed = new EmbedBuilder()
          .setColor(0xFEE75C)
          .setTitle('💬 Adicione um Comentário à sua Avaliação')
          .setDescription(
            'Para que sua avaliação seja validada com transparência e ajude a equipe a melhorar, **é obrigatório incluir um comentário explicativo** (mínimo de 3 caracteres).\n\n' +
            'Você está avaliando o atendimento de **' + staffName + '** com **' + ratingNum + ' estrela(s)**.'
          )
          .addFields(
            {
              name: '📖 Como Concluir sua Avaliação',
              value: '• Enviar com comentário: `+avaliar @' + staffName + ' ' + ratingNum + ' Atendimento nota 10, tirou minhas dúvidas!`\n• Enviar direto sem comentário: `+avaliar @' + staffName + ' ' + ratingNum + '`',
              inline: false
            }
          )
          .setFooter({ text: aiName + ' • Central de Qualidade & Atendimento' })
          .setTimestamp();
        await message.reply({ embeds: [errEmbed] });
        return true;
      }

      try {
        const res = await context.reviewService.submitReview(guild, {
          authorUser: author,
          targetStaffUser: targetStaff,
          rating: ratingNum,
          comment
        });

        const stars = '⭐'.repeat(ratingNum) + '☆'.repeat(5 - ratingNum);
        const title = res.isOverwritten
          ? '🔄 Avaliação Atualizada com Sucesso!'
          : '⭐ Avaliação Registrada com Sucesso!';

        let desc;
        if (res.isPending) {
          desc = 'Sua avaliação foi enviada e está **aguardando moderação** antes de ser exibida publicamente.';
        } else {
          desc = 'Muito obrigado pelo seu feedback! Sua avaliação foi registrada e publicada no mural do servidor.';
        }

        const embed = new EmbedBuilder()
          .setColor(res.isOverwritten ? 0x00E5FF : 0x57F287)
          .setTitle(title)
          .setDescription(desc)
          .addFields(
            { name: '⭐ Classificação', value: stars + ' (' + ratingNum + '/5)', inline: true },
            { name: '🛡️ Atendente', value: targetStaff ? '<@' + targetStaff.id + '>' : '*Geral do Servidor*', inline: true },
            { name: '💬 Comentário Registrado', value: '"' + comment + '"', inline: false }
          )
          .setFooter({ text: aiName + ' • Central de Avaliações' })
          .setTimestamp();

        await message.reply({ embeds: [embed] });
        return true;
      } catch (err) {
        const errEmbed = new EmbedBuilder()
          .setColor(0xED4245)
          .setTitle('⚠️ Falha ao Registrar Avaliação')
          .setDescription('Não foi possível registrar a avaliação pelo seguinte motivo:\n```' + err.message + '```')
          .setFooter({ text: aiName + ' • Central de Avaliações' })
          .setTimestamp();
        await message.reply({ embeds: [errEmbed] });
        return true;
      }
    }
  }

  return false;
}

module.exports = {
  COMMANDS,
  handles,
  handle
};
