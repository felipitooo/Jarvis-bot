const {
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  ButtonBuilder,
  ButtonStyle
} = require('discord.js');

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

/**
 * Builds the interactive select menu.
 * @param {string} currentCategory
 */
function buildHelpComponents(currentCategory = 'home') {
  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId('help_category_select')
    .setPlaceholder('📂 Escolha uma categoria para navegar...')
    .addOptions(
      Object.entries(CATEGORIES).map(([key, cat]) =>
        new StringSelectMenuOptionBuilder()
          .setLabel(cat.label)
          .setValue(key)
          .setDescription(cat.description)
          .setEmoji(cat.emoji)
          .setDefault(key === currentCategory)
      )
    );

  const selectRow = new ActionRowBuilder().addComponents(selectMenu);
  return [selectRow];
}

/**
 * Builds the Home / Overview Embed
 */
function buildHomeEmbed(aiName = 'Jarvis', prefix = '+', botAvatarUrl = null) {
  const embed = new EmbedBuilder()
    .setColor(0x5865F2)
    .setTitle(`⚡ Central de Comandos — ${aiName}`)
    .setDescription(
      `Olá! Eu sou o **${aiName}**, seu assistente modular de alta tecnologia para o Discord.\n\n` +
      `✨ **73 Comandos disponíveis** distribuídos em módulos totalmente customizáveis.\n` +
      `⌨️ **Prefixos Suportados:** **\`${prefix}\`** (Texto) e **\`/\`** (Slash Commands da interface).\n\n` +
      `👇 **Selecione uma categoria no menu suspenso abaixo** para ver os comandos detalhados com exemplos!`
    )
    .addFields(
      {
        name: '💼 Economia & Negócios (13 cmds)',
        value: '`+work` `+daily` `+weekly` `+bank` `+dep` `+sac` `+pay` `+crime` `+slut` `+rob` `+shop` `+inv` `+rich`',
        inline: false
      },
      {
        name: '🎰 Cassino & Apostas (7 cmds)',
        value: '`+bj` `+slots` `+roleta` `+dado` `+coinflip` `+bolao` `+cassino`',
        inline: false
      },
      {
        name: '🎵 Música, Rádio & Voz (11 cmds)',
        value: '`+play` `+pause` `+resume` `+skip` `+stop` `+queue` `+np` `+vol` `+loop` `+shuffle` `+tts`',
        inline: false
      },
      {
        name: '🛡️ Moderação & Segurança (12 cmds)',
        value: '`+ban` `+kick` `+mute` `+unmute` `+warn` `+advertir` `+warnlist` `+clearwarns` `+purge` `+lock` `+unlock` `+unban`',
        inline: false
      },
      {
        name: '🎖️ Níveis, XP & Recompensas (3 cmds)',
        value: '`+rank` `+conquistas` `+leaderboard` • Recompensas automáticas de cargo por nível configuráveis.',
        inline: false
      },
      {
        name: '🎉 Social, Romance & Diversão (11 cmds)',
        value: '`+fofoca` `+quiz` `+beijar` `+abracar` `+genero` `+marry` `+divorce` `+ship` `+8ball` `+interact` `+raffle`',
        inline: false
      },
      {
        name: '🎫 Central de Atendimento & Tickets (1 cmd)',
        value: '`+ticket` • Sistema completo com histórico, modais e logs privados.',
        inline: false
      },
      {
        name: '⚙️ Administração & Inteligência Artificial (9 cmds)',
        value: '`+modo` `+backup` `+prefixo` `/ai-name` `/config` `/backup` `/memory` • IA Gemini com modos de humor.',
        inline: false
      }
    )
    .setFooter({ text: `${aiName} • Use o menu abaixo para navegar entre as categorias` })
    .setTimestamp();

  if (botAvatarUrl) {
    embed.setThumbnail(botAvatarUrl);
  }

  return embed;
}

/**
 * Builds Category Specific Embed
 */
function buildCategoryEmbed(categoryKey, aiName = 'Jarvis', prefix = '+', botAvatarUrl = null) {
  const cat = CATEGORIES[categoryKey] || CATEGORIES.home;
  const embed = new EmbedBuilder()
    .setColor(cat.color)
    .setTimestamp()
    .setFooter({ text: `${aiName} • Categoria: ${cat.label}` });

  if (botAvatarUrl) {
    embed.setThumbnail(botAvatarUrl);
  }

  switch (categoryKey) {
    case 'economy': {
      embed.setTitle(`💼 ${aiName} • Economia, Negócios & Comércio`);
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
      embed.setTitle(`🎰 ${aiName} • Cassino & Jogos de Apostas`);
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
      embed.setTitle(`🛡️ ${aiName} • Moderação, Punições & Segurança`);
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
      embed.setTitle(`🎫 ${aiName} • Central de Atendimento & Tickets`);
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
      embed.setTitle(`⚙️ ${aiName} • Administração, Inteligência Artificial & Configurações`);
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
      return buildHomeEmbed(aiName, prefix, botAvatarUrl);
  }

  return embed;
}

/**
 * Builds the complete response payload for a help menu request.
 */
function buildHelpResponse({ category = 'home', aiName = 'Jarvis', prefix = '+', botAvatarUrl = null } = {}) {
  const embed = category === 'home'
    ? buildHomeEmbed(aiName, prefix, botAvatarUrl)
    : buildCategoryEmbed(category, aiName, prefix, botAvatarUrl);

  const components = buildHelpComponents(category);

  return { embeds: [embed], components };
}

module.exports = {
  CATEGORIES,
  buildHelpComponents,
  buildHomeEmbed,
  buildCategoryEmbed,
  buildHelpResponse
};
