const {
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  ButtonBuilder,
  ButtonStyle
} = require('discord.js');
const { resolveCustomEmojis } = require('./emojiHelper');

function parseHelpColor(colorInput, defaultColor = 0x5865F2) {
  if (!colorInput) return defaultColor;
  if (typeof colorInput === 'number') return colorInput;
  if (typeof colorInput === 'string') {
    const clean = colorInput.replace('#', '').trim();
    const parsed = parseInt(clean, 16);
    return isNaN(parsed) ? defaultColor : parsed;
  }
  return defaultColor;
}

function formatHelpText(template, aiName, prefix, guild, client = null) {
  if (!template || typeof template !== 'string') return '';
  const rendered = template
    .replace(/{bot_name}/gi, aiName || 'Bot')
    .replace(/{ai_name}/gi, aiName || 'Bot')
    .replace(/{prefix}/gi, prefix || '+')
    .replace(/{guild_name}/gi, guild?.name || 'Servidor')
    .replace(/{server_name}/gi, guild?.name || 'Servidor')
    .replace(/{member_count}/gi, String(guild?.memberCount || '0'));
  const target = client || guild;
  return resolveCustomEmojis(rendered, target, guild?.id);
}

function safeSetEmoji(builder, emojiStr, client = null, guildId = null) {
  if (!emojiStr || typeof emojiStr !== 'string') return builder;
  let resolved = emojiStr.trim();
  if (client) {
    resolved = resolveCustomEmojis(resolved, client, guildId);
  }
  const match = resolved.match(/<(a)?:([a-zA-Z0-9_~]+):(\d+)>/);
  if (match) {
    try {
      return builder.setEmoji({
        animated: Boolean(match[1]),
        name: match[2],
        id: match[3]
      });
    } catch {}
  }
  try {
    return builder.setEmoji(resolved);
  } catch {
    return builder;
  }
}

const CATEGORIES = {
  home: {
    label: 'Início & Visão Geral',
    emoji: '🏠',
    description: 'Apresentação, estatísticas e instruções gerais.',
    color: 0x5865F2
  },
  economy: {
    label: 'Economia & Negócios',
    emoji: '💼',
    description: 'Trabalho, banco, daily, transferências, crimes e comércio.',
    color: 0xFEE75C
  },
  casino: {
    label: 'Cassino & Apostas',
    emoji: '🎰',
    description: 'Blackjack (21), caça-níqueis, roleta, dados e coinflip.',
    color: 0xF1C40F
  },
  music: {
    label: 'Música, Rádio & Voz',
    emoji: '🎵',
    description: 'Player YouTube/Spotify, fila, volume, loops e TTS.',
    color: 0x9B59B6
  },
  moderation: {
    label: 'Moderação & Segurança',
    emoji: '🛡️',
    description: 'Ban, kick, mute, warn, purge, lock/unlock e histórico.',
    color: 0xED4245
  },
  xp: {
    label: 'Níveis, XP & Ranking',
    emoji: '🎖️',
    description: 'Cartão de rank, leaderboard e multiplicadores de cargo.',
    color: 0x57F287
  },
  fun: {
    label: 'Social, Romance & Diversão',
    emoji: '🎉',
    description: 'Beijo anime, gênero, casamento, ship, bola 8 e interações.',
    color: 0xEB459E
  },
  tickets: {
    label: 'Atendimento & Tickets',
    emoji: '🎫',
    description: 'Canais de suporte privados com transcrição e gestão.',
    color: 0x00A8FC
  },
  admin: {
    label: 'Administração & IA',
    emoji: '⚙️',
    description: 'Personalidade da IA, memória, backups e logs.',
    color: 0x7289DA
  }
};

const CATEGORY_REQUIRED_MODULES = {
  home: [],
  economy: ['economy'],
  casino: ['casino'],
  music: ['music'],
  moderation: ['moderation', 'auto_protection'],
  xp: ['xp', 'voice_xp'],
  fun: ['social', 'marriages', 'fun_commands', 'reputation', 'gifs'],
  tickets: ['tickets'],
  admin: ['ai_chat', 'ai_memory', 'ai_tools']
};

/**
 * Builds the interactive select menu, optionally filtered by allowed modules and customized with emojis.
 * @param {string} currentCategory
 * @param {Array<string>|Set<string>|null} [allowedModules=null]
 * @param {object|null} [helpConfig=null]
 * @param {object|null} [guild=null]
 * @param {import('discord.js').Client|null} [client=null]
 */
function buildHelpComponents(currentCategory = 'home', allowedModules = null, helpConfig = null, guild = null, client = null) {
  let allowedSet = null;
  if (allowedModules) {
    allowedSet = allowedModules instanceof Set
      ? allowedModules
      : new Set(Array.isArray(allowedModules) ? allowedModules.map(m => String(m).toLowerCase().trim()) : Object.keys(allowedModules));
  }

  const entries = Object.entries(CATEGORIES).filter(([key]) => {
    if (!allowedSet) return true;
    const reqs = CATEGORY_REQUIRED_MODULES[key] || [];
    return reqs.length === 0 || reqs.some(m => allowedSet.has(m.toLowerCase()));
  });

  const customEmojis = helpConfig?.categoryEmojis || {};

  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId('help_category_select')
    .setPlaceholder('📂 Escolha uma categoria para navegar...')
    .addOptions(
      entries.map(([key, cat]) => {
        const customEmoji = customEmojis[key] || cat.emoji;
        const opt = new StringSelectMenuOptionBuilder()
          .setLabel(cat.label)
          .setValue(key)
          .setDescription(cat.description)
          .setDefault(key === currentCategory);
        safeSetEmoji(opt, customEmoji, client, guild?.id);
        return opt;
      })
    );

  const selectRow = new ActionRowBuilder().addComponents(selectMenu);
  return [selectRow];
}

/**
 * Builds the Home / Overview Embed, filtering sections if allowedModules is specified and applying helpConfig customizations.
 * @param {string} [aiName='Jarvis']
 * @param {string} [prefix='+']
 * @param {string|null} [botAvatarUrl=null]
 * @param {Array<string>|Set<string>|null} [allowedModules=null]
 * @param {object|null} [helpConfig=null]
 * @param {object|null} [guild=null]
 * @param {import('discord.js').Client|null} [client=null]
 */
function buildHomeEmbed(aiName = 'Jarvis', prefix = '+', botAvatarUrl = null, allowedModules = null, helpConfig = null, guild = null, client = null) {
  let allowedSet = null;
  if (allowedModules) {
    allowedSet = allowedModules instanceof Set
      ? allowedModules
      : new Set(Array.isArray(allowedModules) ? allowedModules.map(m => String(m).toLowerCase().trim()) : Object.keys(allowedModules));
  }

  const customEmojis = helpConfig?.categoryEmojis || {};

  const allCategoryFields = [
    {
      category: 'economy',
      name: `${customEmojis.economy || '💼'} Economia & Negócios (13 cmds)`,
      value: '`+work` `+daily` `+weekly` `+bank` `+dep` `+sac` `+pay` `+crime` `+slut` `+rob` `+shop` `+inv` `+rich`',
      inline: false
    },
    {
      category: 'casino',
      name: `${customEmojis.casino || '🎰'} Cassino & Apostas (7 cmds)`,
      value: '`+bj` `+slots` `+roleta` `+dado` `+coinflip` `+bolao` `+cassino`',
      inline: false
    },
    {
      category: 'music',
      name: `${customEmojis.music || '🎵'} Música, Rádio & Voz (11 cmds)`,
      value: '`+play` `+pause` `+resume` `+skip` `+stop` `+queue` `+np` `+vol` `+loop` `+shuffle` `+tts`',
      inline: false
    },
    {
      category: 'moderation',
      name: `${customEmojis.moderation || '🛡️'} Moderação & Segurança (12 cmds)`,
      value: '`+ban` `+kick` `+mute` `+unmute` `+warn` `+advertir` `+warnlist` `+clearwarns` `+purge` `+lock` `+unlock` `+unban`',
      inline: false
    },
    {
      category: 'xp',
      name: `${customEmojis.xp || '🎖️'} Níveis, XP & Recompensas (3 cmds)`,
      value: '`+rank` `+conquistas` `+leaderboard` • Recompensas automáticas de cargo por nível configuráveis.',
      inline: false
    },
    {
      category: 'fun',
      name: `${customEmojis.fun || '🎉'} Social, Romance & Diversão (11 cmds)`,
      value: '`+fofoca` `+quiz` `+beijar` `+abracar` `+genero` `+marry` `+divorce` `+ship` `+8ball` `+interact` `+raffle`',
      inline: false
    },
    {
      category: 'tickets',
      name: `${customEmojis.tickets || '🎫'} Central de Atendimento & Tickets (1 cmd)`,
      value: '`+ticket` • Sistema completo com histórico, modais e logs privados.',
      inline: false
    },
    {
      category: 'admin',
      name: `${customEmojis.admin || '⚙️'} Administração & Inteligência Artificial (9 cmds)`,
      value: '`+modo` `+backup` `+prefixo` `/ai-name` `/config` `/backup` `/memory` • IA Gemini com modos de humor.',
      inline: false
    }
  ];

  const visibleFields = allCategoryFields.filter(f => {
    if (!allowedSet) return true;
    const reqs = CATEGORY_REQUIRED_MODULES[f.category] || [];
    return reqs.length === 0 || reqs.some(m => allowedSet.has(m.toLowerCase()));
  }).map(f => ({
    ...f,
    name: client ? resolveCustomEmojis(f.name, client, guild?.id) : f.name,
    value: client ? resolveCustomEmojis(f.value, client, guild?.id) : f.value
  }));

  const homeColor = parseHelpColor(helpConfig?.color, 0x5865F2);
  const homeTitleRaw = (helpConfig?.title && String(helpConfig.title).trim() !== '')
    ? formatHelpText(helpConfig.title, aiName, prefix, guild)
    : `⚡ Central de Comandos — ${aiName}`;
  const homeTitle = client ? resolveCustomEmojis(homeTitleRaw, client, guild?.id) : homeTitleRaw;

  const defaultDesc = `Olá! Eu sou o **${aiName}**, seu assistente modular de alta tecnologia para o Discord.\n\n` +
    `✨ **Módulos Ativos e Comandos configurados** para operar com total segurança.\n` +
    `⌨️ **Prefixos Suportados:** **\`${prefix}\`** (Texto) e **\`/\`** (Slash Commands da interface).\n\n` +
    `👇 **Selecione uma categoria no menu suspenso abaixo** para ver os comandos detalhados com exemplos!`;
  const homeDescRaw = (helpConfig?.description && String(helpConfig.description).trim() !== '')
    ? formatHelpText(helpConfig.description, aiName, prefix, guild)
    : defaultDesc;
  const homeDesc = client ? resolveCustomEmojis(homeDescRaw, client, guild?.id) : homeDescRaw;

  const defaultFooter = `${aiName} • Use o menu abaixo para navegar entre as categorias`;
  const homeFooterRaw = (helpConfig?.footer && String(helpConfig.footer).trim() !== '')
    ? formatHelpText(helpConfig.footer, aiName, prefix, guild)
    : defaultFooter;
  const homeFooter = client ? resolveCustomEmojis(homeFooterRaw, client, guild?.id) : homeFooterRaw;

  const embed = new EmbedBuilder()
    .setColor(homeColor)
    .setTitle(homeTitle)
    .setDescription(homeDesc)
    .addFields(visibleFields.length > 0 ? visibleFields : [{ name: 'ℹ️ Módulos', value: 'Nenhum módulo operacional ativo no momento.', inline: false }])
    .setFooter({ text: homeFooter })
    .setTimestamp();

  const thumbUrl = helpConfig?.thumbnailUrl || botAvatarUrl;
  if (thumbUrl) {
    embed.setThumbnail(thumbUrl);
  }

  return embed;
}

/**
 * Builds Category Specific Embed
 */
function buildCategoryEmbed(categoryKey, aiName = 'Jarvis', prefix = '+', botAvatarUrl = null, helpConfig = null, guild = null, client = null) {
  const cat = CATEGORIES[categoryKey] || CATEGORIES.home;
  const customEmojis = helpConfig?.categoryEmojis || {};
  const catEmoji = customEmojis[categoryKey] || cat.emoji;
  const catColor = parseHelpColor(helpConfig?.color, cat.color);
  const defaultFooter = `${aiName} • Categoria: ${cat.label}`;
  const footerRaw = (helpConfig?.footer && String(helpConfig.footer).trim() !== '') ? formatHelpText(helpConfig.footer, aiName, prefix, guild) : defaultFooter;
  const footerText = client ? resolveCustomEmojis(footerRaw, client, guild?.id) : footerRaw;
  const embed = new EmbedBuilder().setColor(catColor).setTimestamp().setFooter({ text: footerText });
  const thumbUrl = helpConfig?.thumbnailUrl || botAvatarUrl;
  if (thumbUrl) embed.setThumbnail(thumbUrl);

  switch (categoryKey) {
    case 'economy': {
      embed.setTitle(`${catEmoji} ${aiName} • Economia, Negócios & Comércio`);
      embed.setDescription(
        `Sistema completo de economia dinâmica com carteira, banco seguro, empregos, crimes e compras na loja.\n` +
        `*Todas as taxas e salários são gerenciados pelos administradores.*`
      );
      embed.addFields(
        { name: `\`${prefix}work\``, value: 'Trabalhe honestamente para receber seu salário fixo ou variável.', inline: true },
        { name: `\`${prefix}daily\``, value: 'Resgate sua recompensa diária de moedas a cada 24 horas.', inline: true },
        { name: `\`${prefix}weekly\``, value: 'Resgate o bônus semanal para membros fiéis.', inline: true },
        { name: `\`${prefix}bank [@user]\``, value: 'Consulte o saldo na carteira e no banco do usuário ou o seu.', inline: true },
        { name: `\`${prefix}dep <quantia|all>\``, value: 'Deposite dinheiro da carteira no banco para protegê-lo de assaltos.', inline: true },
        { name: `\`${prefix}sac <quantia|all>\``, value: 'Saque moedas do seu saldo bancário para gastar na carteira.', inline: true },
        { name: `\`${prefix}pay @user <quantia>\``, value: 'Transfira moedas da sua carteira para outro membro com segurança.', inline: true },
        { name: `\`${prefix}crime\``, value: 'Arrisque-se cometendo crimes. Lucro alto, mas risco de multa pesada!', inline: true },
        { name: `\`${prefix}slut\``, value: 'Faça bicos e pequenos favores na cidade para faturar um extra.', inline: true },
        { name: `\`${prefix}rob @user\``, value: 'Tente assaltar a carteira desprotegida de um membro do servidor.', inline: true },
        { name: `\`${prefix}shop\``, value: 'Veja o catálogo de itens e cargos especiais à venda.', inline: true },
        { name: `\`${prefix}inv\``, value: 'Abra sua mochila e visualize todos os itens comprados na loja.', inline: true },
        { name: `\`${prefix}rich\``, value: 'Exibe o ranking dos maiores magnatas e milionários do servidor.', inline: true }
      );
      break;
    }

    case 'casino': {
      embed.setTitle(`${catEmoji} ${aiName} • Cassino & Jogos de Apostas`);
      embed.setDescription(
        `Jogos de aposta de alto risco e entretenimento. Configure limites e probabilidades no painel web!\n` +
        `*Aposte com sabedoria para não zerar sua carteira.*`
      );
      embed.addFields(
        { name: `\`${prefix}bolao [criar|apostar|finalizar]\``, value: 'Crie ou aposte no bolão comunitário do servidor com pote compartilhado!', inline: false },
        { name: `\`${prefix}cassino\``, value: 'Menu central com todos os jogos e regras de apostas do servidor.', inline: false },
        { name: `\`${prefix}bj <quantia>\``, value: 'Blackjack (21) interativo contra a banca com botões Hit, Stand e Dobrar!', inline: false },
        { name: `\`${prefix}slots <quantia>\``, value: 'Caça-níqueis com 3 cilindros girando e multiplicadores de até 10x.', inline: true },
        { name: `\`${prefix}roleta <quantia> <aposta>\``, value: 'Roleta europeia: aposte em vermelho, preto, par, ímpar ou números 0-36 (até 36x).', inline: true },
        { name: `\`${prefix}dado [lados]\``, value: 'Rola um dado com lados customizados (padrão 6, D20, D100).', inline: true },
        { name: `\`${prefix}coinflip\``, value: 'Joga a moeda da sorte para decidir entre Cara ou Coroa.', inline: true }
      );
      break;
    }

    case 'music': {
      embed.setTitle(`🎵 ${aiName} • Música, Rádio & Streaming de Áudio`);
      embed.setDescription(
        `Sistema profissional de música com suporte a faixas individuais, vídeos, rádios e playlists completas do **YouTube** e **Spotify**.\n` +
        `*Você precisa estar em um canal de voz para solicitar músicas!*`
      );
      embed.addFields(
        { name: `\`${prefix}play <busca|link|playlist>\``, value: 'Toca músicas ou adiciona playlists inteiras do YouTube e Spotify à fila.', inline: false },
        { name: `\`${prefix}pause\` / \`${prefix}resume\``, value: 'Pausa a faixa atual ou retoma a reprodução de onde parou.', inline: true },
        { name: `\`${prefix}skip\``, value: 'Pula imediatamente para a próxima música da fila.', inline: true },
        { name: `\`${prefix}stop\``, value: 'Para a música, esvazia a fila e desconecta o bot da chamada.', inline: true },
        { name: `\`${prefix}queue\``, value: 'Mostra a lista das próximas faixas na fila com duração e autor.', inline: true },
        { name: `\`${prefix}np\``, value: 'Exibe a música tocando no momento com capa e barra de progresso.', inline: true },
        { name: `\`${prefix}vol <0-100>\``, value: 'Ajusta o volume do áudio em tempo real sem distorção.', inline: true },
        { name: `\`${prefix}loop <off|track|queue>\``, value: 'Alterna entre repetir a faixa atual ou a fila inteira.', inline: true },
        { name: `\`${prefix}shuffle\``, value: 'Embaralha a ordem de todas as músicas em espera na fila.', inline: true },
        { name: `\`${prefix}tts <mensagem>\``, value: 'Sintetiza voz realista no canal de áudio falando o texto digitado.', inline: true }
      );
      break;
    }

    case 'moderation': {
      embed.setTitle(`${catEmoji} ${aiName} • Moderação, Punições & Segurança`);
      embed.setDescription(
        `Ferramentas avançadas de moderação disciplinar com registro em histórico e auditoria com prints visuais.\n` +
        `*Requer cargos ou permissões administrativas adequadas.*`
      );
      embed.addFields(
        { name: `\`${prefix}ban @user [motivo]\``, value: 'Bane permanentemente o usuário do servidor.', inline: true },
        { name: `\`${prefix}kick @user [motivo]\``, value: 'Expulsa o membro (permite retorno com convite).', inline: true },
        { name: `\`${prefix}mute @user [min] [motivo]\``, value: 'Aplica castigo temporário (timeout no Discord).', inline: true },
        { name: `\`${prefix}unmute @user\``, value: 'Remove antecipadamente o castigo de fala de um membro.', inline: true },
        { name: `\`${prefix}warn @user <motivo>\``, value: 'Aplica um warn oficial (strike) com escalonamento de punição.', inline: true },
        { name: `\`${prefix}advertir @user <motivo>\``, value: 'Emite uma advertência verbal educativa ao membro (sem strike).', inline: true },
        { name: `\`${prefix}warnlist [@user]\``, value: 'Consulta o histórico de advertências de um membro ou do servidor.', inline: true },
        { name: `\`${prefix}clearwarns @user\``, value: 'Limpa todas as advertências ativas de um membro.', inline: true },
        { name: `\`${prefix}purge <1-100>\``, value: 'Apaga rapidamente mensagens em massa no canal atual.', inline: true },
        { name: `\`${prefix}lock\``, value: 'Tranca o canal de texto atual para membros comuns.', inline: true },
        { name: `\`${prefix}unlock\``, value: 'Destranca o canal restaurando as permissões de conversa.', inline: true },
        { name: `\`${prefix}unban <id>\``, value: 'Remove o banimento de uma conta através do ID numérico.', inline: true }
      );
      break;
    }

    case 'xp': {
      embed.setTitle(`🎖️ ${aiName} • Níveis, XP & Recompensas`);
      embed.setDescription(
        `Sistema de nivelamento e engajamento. Cada mensagem nos canais permitidos rende pontos de XP.\n` +
        `*Multiplicadores por cargo, fórmula de progressão e cargos recompensados são 100% configuráveis!*`
      );
      embed.addFields(
        { name: `\`${prefix}rank [@user]\``, value: 'Exibe o cartão de nível do membro, contendo XP atual, meta e colocação no ranking.', inline: false },
        { name: `\`${prefix}conquistas [@user]\``, value: 'Galeria interativa de insígnias e troféus desbloqueados por participação.', inline: false },
        { name: `\`${prefix}leaderboard\``, value: 'Apresenta o placar dos membros mais ativos e com maior nível do servidor.', inline: false },
        { name: '✨ Recompensas Automáticas', value: 'Cargos são atribuídos automaticamente quando um membro atinge determinado level de XP!', inline: false }
      );
      break;
    }

    case 'fun': {
      embed.setTitle(`🎉 ${aiName} • Romance, Interações Sociais & Diversão`);
      embed.setDescription(
        `Interações afetivas em estilo anime, perfil de gênero, relacionamentos formais e minigames descontraídos!`
      );
      embed.addFields(
        { name: `\`${prefix}fofoca\` (ou \`${prefix}resumo\`)`, value: 'Boletim bem-humorado de fofocas e resumo das conversas recentes da galera!', inline: false },
        { name: `\`${prefix}quiz [categoria] [rodadas]\``, value: 'Desafio neural no chat com placar e prêmios! Modos: games, animes, futebol, geral, marvel ou misto.', inline: false },
        { name: `\`${prefix}beijar @user\``, value: 'Dá um beijo romântico em anime com GIFs customizados por gênero e botão de retribuir sem fim!', inline: false },
        { name: `\`${prefix}abracar @user\``, value: 'Dá um abraço caloroso em anime com contador persistente e botão de retribuir!', inline: false },
        { name: `\`${prefix}genero <masculino|feminino|neutro|livre>\``, value: 'Define seu gênero/orientação para que as animações de anime combinem com seu perfil.', inline: false },
        { name: `\`${prefix}marry @user\``, value: 'Peça alguém especial em casamento com anúncio formal!', inline: true },
        { name: `\`${prefix}divorce\``, value: 'Encerre o relacionamento atual e volte ao estado civil de solteiro.', inline: true },
        { name: `\`${prefix}ship @user1 @user2\``, value: 'Calcula a compatibilidade mística com card visual exclusivo Stark!', inline: true },
        { name: `\`${prefix}8ball <pergunta>\``, value: 'Consulta a bola mística para obter respostas certeiras sobre o futuro.', inline: true },
        { name: `\`${prefix}interact <tipo> @user\``, value: 'Interaja com GIFs fofos: abraçar, socar, chutar, cafuné, etc.', inline: true },
        { name: `\`${prefix}raffle\``, value: 'Inicia um sorteio dinâmico com contagem e vencedor aleatório.', inline: true }
      );
      break;
    }

    case 'tickets': {
      embed.setTitle(`${catEmoji} ${aiName} • Central de Atendimento & Tickets`);
      embed.setDescription(
        `Sistema corporativo de tickets de suporte com salas privadas automáticas, transcrições e modais.`
      );
      embed.addFields(
        { name: `\`${prefix}ticket\``, value: 'Cria um canal privado de suporte direto com a equipe de moderadores.', inline: false },
        { name: '🛠️ Recursos Integrados', value: '• Botão de Assumir Atendimento (`Claim`)\n• Fechamento com motivo obrigatório via Modal\n• Reabertura rápida em caso de dúvidas pendentes\n• Geração de Transcript em texto das conversas.', inline: false }
      );
      break;
    }

    case 'admin': {
      embed.setTitle(`${catEmoji} ${aiName} • Administração, Inteligência Artificial & Configurações`);
      embed.setDescription(
        `Controles administrativos avançados e inteligência artificial conectada ao Google Gemini.`
      );
      embed.addFields(
        { name: `\`${prefix}modo <zoeiro|sarcastico|sabio|amigavel|serio|normal>\``, value: 'Altera o modo de humor e tom de conversa da IA.', inline: false },
        { name: `\`${prefix}backup\``, value: 'Gera e envia o arquivo .sqlite do banco de dados completo.', inline: true },
        { name: `\`${prefix}prefixo <novo_prefixo>\``, value: 'Altera o prefixo de comandos no servidor.', inline: true },
        { name: '`/ai-name <nome>`', value: 'Muda o nome com o qual o assistente se identifica no servidor.', inline: true },
        { name: '`/config`', value: 'Abre o menu interativo de seleção de canais de logs e regras.', inline: true },
        { name: '`/memory`', value: 'Consulta e gerencia as memórias e instruções aprendidas pela IA.', inline: true }
      );
      break;
    }

    default:
      return buildHomeEmbed(aiName, prefix, botAvatarUrl, null, helpConfig, guild, client);
  }

  if (client) {
    if (embed.data.title) embed.data.title = resolveCustomEmojis(embed.data.title, client, guild?.id);
    if (embed.data.description) embed.data.description = resolveCustomEmojis(embed.data.description, client, guild?.id);
    if (Array.isArray(embed.data.fields)) {
      embed.data.fields = embed.data.fields.map(f => ({
        ...f,
        name: resolveCustomEmojis(f.name, client, guild?.id),
        value: resolveCustomEmojis(f.value, client, guild?.id)
      }));
    }
  }

  return embed;
}

/**
 * Builds the complete response payload for a help menu request.
 * @param {object} [options={}]
 * @param {string} [options.category='home']
 * @param {string} [options.aiName='Jarvis']
 * @param {string} [options.prefix='+']
 * @param {string|null} [options.botAvatarUrl=null]
 * @param {Array<string>|Set<string>|null} [options.allowedModules=null]
 */
function buildHelpResponse({
  category = 'home',
  aiName = 'Jarvis',
  prefix = '+',
  botAvatarUrl = null,
  allowedModules = null,
  helpConfig = null,
  guild = null,
  client = null
} = {}) {
  let resolvedCategory = category;
  if (allowedModules && category !== 'home') {
    const allowedSet = allowedModules instanceof Set
      ? allowedModules
      : new Set(Array.isArray(allowedModules) ? allowedModules.map(m => String(m).toLowerCase().trim()) : Object.keys(allowedModules));
    const reqs = CATEGORY_REQUIRED_MODULES[category] || [];
    const isAllowed = reqs.length === 0 || reqs.some(m => allowedSet.has(m.toLowerCase()));
    if (!isAllowed) {
      resolvedCategory = 'home';
    }
  }

  const embed = resolvedCategory === 'home'
    ? buildHomeEmbed(aiName, prefix, botAvatarUrl, allowedModules, helpConfig, guild, client)
    : buildCategoryEmbed(resolvedCategory, aiName, prefix, botAvatarUrl, helpConfig, guild, client);

  const components = buildHelpComponents(resolvedCategory, allowedModules, helpConfig, guild, client);

  return { embeds: [embed], components };
}

module.exports = {
  CATEGORIES,
  parseHelpColor,
  formatHelpText,
  safeSetEmoji,
  buildHelpComponents,
  buildHomeEmbed,
  buildCategoryEmbed,
  buildHelpResponse
};
