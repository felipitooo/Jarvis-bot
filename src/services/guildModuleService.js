const { logger } = require('../utils/logger');
const { ValidationError } = require('../utils/errorHandler');

const moduleLogger = logger.forContext('GuildModuleService');

/**
 * Single Source of Truth Registry of all 26 official modular systems in Jarvis.
 * Each module has:
 * - id: Unique identifier
 * - name: Display name
 * - description: Detailed explanation
 * - category: Grouping category
 * - icon: Visual emoji/icon
 * - dependencies: Array of required parent module IDs
 * - configTab: Associated Web Panel tab ID for deep settings
 * - requiredPermissions: Discord permissions needed
 * - commands: Associated slash/prefix commands
 * - events: Associated Discord gateway events
 * - automations: Associated background workers/schedulers
 */
const MODULE_DEFINITIONS = [
  {
    id: 'ai_chat',
    name: 'Inteligência Artificial (Chat)',
    category: 'IA & Automação',
    icon: '🤖',
    description: 'Conversas inteligentes, menções ao Jarvis, resumos de chat e respostas automáticas com Gemini.',
    dependencies: [],
    configTab: 'tab-identity',
    requiredPermissions: ['SendMessages', 'ReadMessageHistory', 'EmbedLinks'],
    commands: [
      'ai-nome', 'ai-status', 'resumo', 'resumir', 'resumodia', 'fofoca', 'gossip',
      'modo', 'humor', 'hora', 'horario', 'data', 'tempo', 'relogio'
    ],
    events: ['messageCreate'],
    automations: []
  },
  {
    id: 'ai_memory',
    name: 'Memória da IA',
    category: 'IA & Automação',
    icon: '🧠',
    description: 'Gravação e recuperação contextual de memórias de curto e longo prazo por usuário e servidor.',
    dependencies: ['ai_chat'],
    configTab: 'tab-aimemory',
    requiredPermissions: ['SendMessages', 'ReadMessageHistory'],
    commands: ['memoria'],
    events: ['messageCreate'],
    automations: ['memory_consolidation']
  },
  {
    id: 'ai_tools',
    name: 'Ferramentas de IA',
    category: 'IA & Automação',
    icon: '⚙️',
    description: 'Capacidade do Jarvis executar ações administrativas, pesquisas na web e utilitários via IA.',
    dependencies: ['ai_chat'],
    configTab: 'tab-identity',
    requiredPermissions: ['SendMessages', 'EmbedLinks'],
    commands: ['utilitario'],
    events: ['messageCreate'],
    automations: []
  },
  {
    id: 'music',
    name: 'Música & Player',
    category: 'Mídia & Voz',
    icon: '🎵',
    description: 'Reprodução de músicas, rádio, playlists, cargo de DJ e controles de áudio em canais de voz.',
    dependencies: [],
    configTab: 'tab-music',
    requiredPermissions: ['Connect', 'Speak', 'SendMessages'],
    commands: [
      'musica', 'config-musica', 'play', 'tocar', 'p', 'skip', 'pular', 's',
      'stop', 'parar', 'pause', 'pausar', 'resume', 'despausar', 'continuar',
      'queue', 'fila', 'q', 'nowplaying', 'np', 'tocando', 'volume', 'vol', 'v',
      'loop', 'repetir', 'shuffle', 'misturar', 'embaralhar', 'tts', 'falar', 'say',
      'conectar', 'desconectar'
    ],
    events: ['voiceStateUpdate', 'interactionCreate'],
    automations: ['music_inactivity_disconnect']
  },
  {
    id: 'voice_xp',
    name: 'Recursos de Voz & XP',
    category: 'Mídia & Voz',
    icon: '🎙️',
    description: 'Ganho de XP e recompensas automáticas por tempo de permanência em canais de voz.',
    dependencies: ['xp'],
    configTab: 'tab-xp',
    requiredPermissions: ['Connect', 'ViewChannel'],
    commands: ['voz'],
    events: ['voiceStateUpdate'],
    automations: ['voice_xp_ticker']
  },
  {
    id: 'economy',
    name: 'Economia & Moedas',
    category: 'Economia & Jogos',
    icon: '💰',
    description: 'Daily, work, crime, slut, rob, banco, transferências, bolsa de valores, empresas e empréstimos.',
    dependencies: [],
    configTab: 'tab-economy',
    requiredPermissions: ['SendMessages', 'EmbedLinks'],
    commands: [
      'economia', 'eco-admin', 'daily', 'diario', 'weekly', 'semanal',
      'work', 'trabalhar', 'trampo', 'crime', 'criminoso', 'slut', 'bico',
      'rob', 'roubar', 'bank', 'banco', 'dep', 'deposit', 'depositar',
      'sac', 'sacar', 'withdraw', 'saldo', 'balance', 'bal', 'money', 'carteira',
      'pagar', 'pay', 'transfer', 'transferir', 'pix', 'shop', 'loja',
      'inv', 'inventario', 'inventory', 'rich', 'ricos', 'topmoney', 'toprico',
      'investir', 'cambio', 'exchange', 'cota', 'grafico', 'bolsa', 'chart',
      'empresa', 'empresas', 'company', 'emprestimo', 'loan', 'emprestar'
    ],
    events: ['interactionCreate'],
    automations: ['stock_market_cycle', 'company_production_cycle']
  },
  {
    id: 'casino',
    name: 'Cassino & Apostas',
    category: 'Economia & Jogos',
    icon: '🎰',
    description: 'Roleta, blackjack, coinflip, slots, dados, bolão e apostas com a moeda do servidor.',
    dependencies: ['economy'],
    configTab: 'tab-casino',
    requiredPermissions: ['SendMessages', 'EmbedLinks'],
    commands: [
      'cassino', 'casino', 'apostar', 'aposta', 'bet', 'gamble',
      'roleta', 'roulette', 'blackjack', 'bj', '21',
      'coinflip', 'cf', 'moeda', 'caraoucoroa', 'crash',
      'slots', 'slot', 'cacaniqueis', 'dados', 'bolao',
      'duelo', 'x1', 'pvp'
    ],
    events: ['interactionCreate'],
    automations: []
  },
  {
    id: 'xp',
    name: 'XP & Níveis',
    category: 'Comunidade & Engajamento',
    icon: '⭐',
    description: 'Progressão por mensagens, cartões de rank, cargos de nível, multiplicadores e placar.',
    dependencies: [],
    configTab: 'tab-xp',
    requiredPermissions: ['SendMessages', 'ManageRoles', 'AttachFiles'],
    commands: [
      'xp', 'xp-admin', 'config-xp', 'rank', 'nivel', 'level',
      'placar', 'leaderboard', 'topxp', 'perfil', 'profile',
      'conquistas', 'badges', 'insignias', 'bio', 'sobre', 'cor'
    ],
    events: ['messageCreate'],
    automations: []
  },
  {
    id: 'tickets',
    name: 'Central de Tickets',
    category: 'Atendimento & Moderação',
    icon: '🎫',
    description: 'Canais de suporte privado com abertura por botão, transcrição HTML/TXT e painéis personalizáveis.',
    dependencies: [],
    configTab: 'tab-tickets',
    requiredPermissions: ['ManageChannels', 'ManageRoles', 'SendMessages', 'AttachFiles'],
    commands: ['ticket', 'tickets'],
    events: ['interactionCreate'],
    automations: []
  },
  {
    id: 'moderation',
    name: 'Moderação Manual',
    category: 'Atendimento & Moderação',
    icon: '🛡️',
    description: 'Comandos de ban, tempban, kick, warn, timeout, mute, limpeza de chat, lock e desbanimento automático.',
    dependencies: [],
    configTab: 'tab-moderation',
    requiredPermissions: ['BanMembers', 'KickMembers', 'ModerateMembers', 'ManageMessages'],
    commands: [
      'punir', 'ban', 'banir', 'tempban', 'unban', 'desbanir',
      'kick', 'expulsar', 'warn', 'advertir', 'advertencia',
      'warnlist', 'warns', 'warnings', 'advertencias',
      'unwarn', 'clearwarn', 'clearwarns', 'limparwarns',
      'mute', 'timeout', 'mutar', 'silenciar',
      'unmute', 'untimeout', 'desmutar', 'desmultar', 'desilenciar',
      'limpar', 'clear', 'purge', 'limpar-mensagens',
      'slowmode', 'lock', 'lockdown', 'trancar', 'unlock', 'destrancar',
      'config-mod', 'historico-membro', 'auditar',
      'cargo', 'canal', 'backup'
    ],
    events: ['interactionCreate'],
    automations: ['tempban_expiration_worker']
  },
  {
    id: 'auto_protection',
    name: 'Proteção Automática (Anti-Abuso)',
    category: 'Atendimento & Moderação',
    icon: '🚨',
    description: 'Anti-spam, anti-raid, anti-flood e proteção contra bots de golpes (MrBeast, Nitro falso, phishing).',
    dependencies: ['moderation'],
    configTab: 'tab-antibot',
    requiredPermissions: ['ModerateMembers', 'KickMembers', 'BanMembers', 'ManageMessages'],
    commands: [],
    events: ['messageCreate', 'guildMemberAdd'],
    automations: []
  },
  {
    id: 'social',
    name: 'Sistema Social & Afeto',
    category: 'Comunidade & Engajamento',
    icon: '❤️',
    description: 'Interações sociais entre membros como abraçar, beijar, cafuné, tapa, ship e contadores.',
    dependencies: [],
    configTab: 'tab-social',
    requiredPermissions: ['SendMessages', 'EmbedLinks'],
    commands: [
      'ship', 'shippar', 'abracar', 'abraçar', 'hug', 'beijar', 'kiss',
      'tapa', 'slap', 'cafune', 'pat', 'interact', 'interagir', 'interacao',
      'socar', 'chutar', 'zoar', 'flertar', 'dancar', 'cumprimentar',
      'genero', 'sexo'
    ],
    events: ['interactionCreate'],
    automations: []
  },
  {
    id: 'marriages',
    name: 'Casamentos & Relações',
    category: 'Comunidade & Engajamento',
    icon: '💍',
    description: 'Propostas de casamento, divórcio, certidões e alianças entre membros.',
    dependencies: ['social'],
    configTab: 'tab-social',
    requiredPermissions: ['SendMessages', 'EmbedLinks'],
    commands: [
      'marry', 'casar', 'casamento', 'divorce', 'divorciar', 'divorcio',
      'separar', 'casal', 'love', 'relacionamento'
    ],
    events: ['interactionCreate'],
    automations: []
  },
  {
    id: 'reputation',
    name: 'Reputação (+Rep)',
    category: 'Comunidade & Engajamento',
    icon: '🌟',
    description: 'Reconhecimento público entre membros com elogios e ranking de reputação.',
    dependencies: [],
    configTab: 'tab-social',
    requiredPermissions: ['SendMessages'],
    commands: ['rep', '+rep'],
    events: ['messageCreate', 'interactionCreate'],
    automations: []
  },
  {
    id: 'reviews',
    name: 'Avaliações & Feedback',
    category: 'Comunidade & Engajamento',
    icon: '📝',
    description: 'Sistema de avaliação de atendimento da equipe com estrelas, comentários e moderação.',
    dependencies: [],
    configTab: 'tab-reviews',
    requiredPermissions: ['SendMessages', 'EmbedLinks'],
    commands: [
      'avaliar', 'review', 'avaliacao', 'avaliacoes', 'reviewstats',
      'responder-avaliacao', 'feedback'
    ],
    events: ['interactionCreate'],
    automations: []
  },
  {
    id: 'quiz',
    name: 'Quiz Arena',
    category: 'Economia & Jogos',
    icon: '🎯',
    description: 'Competição interativa de perguntas e respostas com categorias personalizadas e prêmios.',
    dependencies: [],
    configTab: 'tab-quiz',
    requiredPermissions: ['SendMessages', 'EmbedLinks'],
    commands: ['quiz'],
    events: ['interactionCreate'],
    automations: []
  },
  {
    id: 'giveaways',
    name: 'Sorteios',
    category: 'Comunidade & Engajamento',
    icon: '🎁',
    description: 'Criação, gerenciamento e apuração automatizada de sorteios com múltiplos ganhadores.',
    dependencies: [],
    configTab: 'tab-community',
    requiredPermissions: ['SendMessages', 'EmbedLinks'],
    commands: ['sorteio', 'raffle'],
    events: ['interactionCreate'],
    automations: ['giveaway_ending_worker']
  },
  {
    id: 'polls',
    name: 'Enquetes & Votações',
    category: 'Comunidade & Engajamento',
    icon: '📊',
    description: 'Votações interativas com botões e barras de progresso em tempo real.',
    dependencies: [],
    configTab: 'tab-community',
    requiredPermissions: ['SendMessages', 'EmbedLinks'],
    commands: ['enquete', 'poll', 'sugestao'],
    events: ['interactionCreate'],
    automations: ['poll_closing_worker']
  },
  {
    id: 'welcome',
    name: 'Boas-Vindas',
    category: 'Comunidade & Engajamento',
    icon: '👋',
    description: 'Mensagens e cartões visuais automáticos na chegada de novos membros ao servidor.',
    dependencies: [],
    configTab: 'tab-welcome',
    requiredPermissions: ['SendMessages', 'AttachFiles'],
    commands: ['config-boas-vindas'],
    events: ['guildMemberAdd'],
    automations: []
  },
  {
    id: 'goodbye',
    name: 'Despedidas',
    category: 'Comunidade & Engajamento',
    icon: '🚪',
    description: 'Notificação automática personalizada quando um membro deixa o servidor.',
    dependencies: [],
    configTab: 'tab-welcome',
    requiredPermissions: ['SendMessages'],
    commands: [],
    events: ['guildMemberRemove'],
    automations: []
  },
  {
    id: 'autorole',
    name: 'AutoRole',
    category: 'Comunidade & Engajamento',
    icon: '🏷️',
    description: 'Atribuição instantânea de cargos configurados na entrada de novos membros.',
    dependencies: [],
    configTab: 'tab-welcome',
    requiredPermissions: ['ManageRoles'],
    commands: ['autorole'],
    events: ['guildMemberAdd'],
    automations: []
  },
  {
    id: 'starboard',
    name: 'Starboard (Mural de Estrelas)',
    category: 'Comunidade & Engajamento',
    icon: '⭐',
    description: 'Destaque automático das melhores mensagens reagidas com estrela em canal dedicado.',
    dependencies: [],
    configTab: 'tab-starboard',
    requiredPermissions: ['SendMessages', 'EmbedLinks', 'ReadMessageHistory'],
    commands: ['starboard'],
    events: ['messageReactionAdd'],
    automations: []
  },
  {
    id: 'automations',
    name: 'Automações & Briefings',
    category: 'IA & Automação',
    icon: '⏱️',
    description: 'Tarefas agendadas, relatórios diários executivos, alertas sociais, comandos personalizados e rotinas periódicas.',
    dependencies: [],
    configTab: 'tab-community',
    requiredPermissions: ['SendMessages', 'EmbedLinks'],
    commands: [
      'briefing', 'tarefa', 'alerta', 'alertas',
      'customcmd', 'addcmd', 'criarcomando', 'addcomando',
      'delcmd', 'deletarcomando', 'removercomando', 'delcomando',
      'editcmd', 'editarcomando', 'cmdinfo', 'cmdlist',
      'customcommands', 'comandospersonalizados', 'meuscomandos',
      'tags', 'placeholders', 'variaveis'
    ],
    events: [],
    automations: ['daily_briefing_worker', 'social_alerts_worker']
  },
  {
    id: 'reminders',
    name: 'Lembretes',
    category: 'IA & Automação',
    icon: '🔔',
    description: 'Notificações e alertas temporizados agendados por membros ou administradores.',
    dependencies: ['automations'],
    configTab: 'tab-community',
    requiredPermissions: ['SendMessages'],
    commands: ['lembrete', 'lembrar'],
    events: ['interactionCreate'],
    automations: ['reminders_worker']
  },
  {
    id: 'fun_commands',
    name: 'Comandos de Diversão',
    category: 'Comunidade & Engajamento',
    icon: '🎉',
    description: 'Comandos de entretenimento, dados, piadas, memes e jogos rápidos de chat.',
    dependencies: [],
    configTab: 'tab-social',
    requiredPermissions: ['SendMessages'],
    commands: ['piada', '8ball', 'bola8', 'escolher', 'dado', 'dice', 'roll', 'meme'],
    events: ['messageCreate'],
    automations: []
  },
  {
    id: 'gifs',
    name: 'GIFs & Imagens',
    category: 'Comunidade & Engajamento',
    icon: '🖼️',
    description: 'Geração de cartões visuais Canvas e integração de GIFs animados nas interações.',
    dependencies: [],
    configTab: 'tab-social',
    requiredPermissions: ['SendMessages', 'AttachFiles', 'EmbedLinks'],
    commands: ['gif', 'avatar', 'banner'],
    events: [],
    automations: []
  }
];

// Build fast lookup map & build command/tool maps from Single Source of Truth
const MODULE_BY_ID = new Map();
const COMMAND_TO_MODULE_MAP = {};

for (const def of MODULE_DEFINITIONS) {
  if (MODULE_BY_ID.has(def.id)) {
    throw new Error(`Duplicate module registration detected for ID: ${def.id}`);
  }
  MODULE_BY_ID.set(def.id, def);
  if (Array.isArray(def.commands)) {
    for (const cmd of def.commands) {
      COMMAND_TO_MODULE_MAP[cmd.toLowerCase()] = def.id;
    }
  }
}

/**
 * Mapping of AI tool declarations to required module keys.
 */
const TOOL_TO_MODULE_MAP = {
  // Moderation tools
  'aplicar_punicao_membro': 'moderation',
  'consultar_historico_disciplinar': 'moderation',
  'limpar_advertencias_membro': 'moderation',
  'configurar_regra_escalonamento': 'moderation',
  'purgar_mensagens_canal': 'moderation',
  'trancar_ou_destrancar_canal': 'moderation',
  'gerenciar_modo_lento_canal': 'moderation',
  'banir_membro': 'moderation',
  'expulsar_membro': 'moderation',
  'mutar_membro': 'moderation',
  'desmutar_membro': 'moderation',
  'aplicar_timeout': 'moderation',
  'remover_timeout': 'moderation',
  'aplicar_aviso': 'moderation',
  'limpar_mensagens': 'moderation',
  'aplicar_tempban': 'moderation',

  // Auto protection tools
  'analisar_seguranca_url': 'auto_protection',

  // Economy tools
  'consultar_saldo_membro': 'economy',
  'consultar_saldo': 'economy',
  'transferir_moedas': 'economy',
  'gerenciar_economia_admin': 'economy',
  'conceder_moedas': 'economy',
  'remover_moedas': 'economy',
  'consultar_loja_itens': 'economy',
  'comprar_item_loja': 'economy',
  'consultar_ranking_economia': 'economy',
  'ver_cotacoes_bolsa': 'economy',

  // XP tools
  'consultar_nivel_membro': 'xp',
  'consultar_xp_membro': 'xp',
  'consultar_ranking_servidor': 'xp',
  'gerenciar_xp_membro': 'xp',
  'adicionar_xp_membro': 'xp',
  'remover_xp_membro': 'xp',
  'configurar_bloqueio_xp_canal': 'xp',
  'resetar_xp_servidor': 'xp',
  'consultar_conquistas_membro': 'xp',

  // Memory tools
  'salvar_memoria': 'ai_memory',
  'gravar_memoria': 'ai_memory',
  'consultar_memoria': 'ai_memory',
  'esquecer_memoria': 'ai_memory',
  'salvar_memoria_servidor': 'ai_memory',
  'gerenciar_notas_servidor': 'ai_memory',
  'salvar_nota': 'ai_memory',

  // AI Chat & Summary tools
  'obter_contexto_canal': 'ai_chat',
  'resumir_conversa': 'ai_chat',
  'obter_fofoca_chat': 'ai_chat',
  'alterar_modo_humor_ia': 'ai_chat',

  // Music & Voice tools
  'tocar_musica': 'music',
  'adicionar_musica_fila': 'music',
  'tocar_em_seguida': 'music',
  'controlar_musica': 'music',
  'consultar_fila_musica': 'music',
  'conectar_canal_voz': 'music',
  'desconectar_canal_voz': 'music',
  'falar_canal_voz': 'music',
  'pular_musica': 'music',
  'parar_musica': 'music',
  'alterar_volume': 'music',

  // Tickets & Reviews tools
  'consultar_tickets_servidor': 'tickets',
  'gerenciar_ticket': 'tickets',
  'consultar_estatisticas_avaliacoes': 'reviews',

  // Social & Community tools
  'executar_interacao_social': 'social',
  'consultar_casamento': 'marriages',
  'verificar_reputacao': 'reputation',
  'criar_enquete': 'polls',
  'moderar_sugestao': 'polls',
  'criar_sorteio': 'giveaways',
  'configurar_boas_vindas': 'welcome',

  // Automations & Reminders tools
  'agendar_lembrete': 'reminders',
  'criar_tarefa_servidor': 'automations',
  'consultar_tarefas_pendentes': 'automations',
  'concluir_tarefa': 'automations',
  'gerar_briefing_servidor': 'automations',

  // Web & Admin AI tools
  'pesquisar_web': 'ai_tools',
  'obter_data_hora_atual': 'ai_tools',
  'traduzir_texto': 'ai_tools',
  'calcular_expressao': 'ai_tools',
  'formatar_e_validar_json': 'ai_tools',
  'gerar_arquivo_anexo': 'ai_tools',
  'utilitario_calculo_conversao': 'ai_tools',
  'gerenciar_cargo_membro': 'ai_tools',
  'alterar_apelido_membro': 'ai_tools',
  'criar_cargo_servidor': 'ai_tools',
  'editar_cargo_servidor': 'ai_tools',
  'excluir_cargo_servidor': 'ai_tools',
  'criar_canal_servidor': 'ai_tools',
  'editar_canal_servidor': 'ai_tools',
  'excluir_canal_servidor': 'ai_tools',
  'analisar_servidor': 'ai_tools',
  'auditar_permissoes_servidor': 'ai_tools',
  'enviar_mensagem_canal': 'ai_tools'
};

/**
 * Mapping of Discord button/modal/select customId prefixes to required module keys.
 */
const INTERACTION_PREFIX_TO_MODULE_MAP = [
  { prefix: 'quiz_', moduleKey: 'quiz' },
  { prefix: 'marry_', moduleKey: 'marriages' },
  { prefix: 'loan_', moduleKey: 'economy' },
  { prefix: 'company_', moduleKey: 'economy' },
  { prefix: 'duel_', moduleKey: 'casino' },
  { prefix: 'bj_', moduleKey: 'casino' },
  { prefix: 'bolao_', moduleKey: 'casino' },
  { prefix: 'ticket_', moduleKey: 'tickets' },
  { prefix: 'close_ticket', moduleKey: 'tickets' },
  { prefix: 'claim_ticket', moduleKey: 'tickets' },
  { prefix: 'transcript_ticket', moduleKey: 'tickets' },
  { prefix: 'poll_', moduleKey: 'polls' },
  { prefix: 'giveaway_', moduleKey: 'giveaways' },
  { prefix: 'raffle_', moduleKey: 'giveaways' },
  { prefix: 'review_', moduleKey: 'reviews' },
  { prefix: 'kiss_', moduleKey: 'social' },
  { prefix: 'hug_', moduleKey: 'social' },
  { prefix: 'interact_', moduleKey: 'social' }
];

class GuildModuleService {
  /**
   * @param {import('../database/connection').DatabaseManager} dbManager
   * @param {import('./auditService').AuditService} [auditService]
   */
  constructor(dbManager, auditService = null) {
    this.db = dbManager;
    this.auditService = auditService;
    /** @type {Map<string, Map<string, boolean>>} */
    this.cache = new Map();
    /** @type {Map<string, Array<{ timestamp: string, message: string, guildId: string }>>} */
    this.errorRegistry = new Map();
    /** @type {Map<string, object>} */
    this.customDefinitions = new Map();
  }

  /**
   * Registers a new module definition, strictly preventing duplicates.
   * @param {object} moduleDef
   */
  registerModule(moduleDef) {
    if (!moduleDef || !moduleDef.id) {
      throw new ValidationError('O módulo precisa possuir um identificador único (id).');
    }
    const cleanId = String(moduleDef.id).toLowerCase().trim();
    if (MODULE_BY_ID.has(cleanId) || this.customDefinitions.has(cleanId)) {
      throw new ValidationError(`Módulo duplicado: o identificador "${cleanId}" já está registrado no sistema.`);
    }
    const normalizedCommands = Array.isArray(moduleDef.commands) ? moduleDef.commands : [];
    this.customDefinitions.set(cleanId, {
      ...moduleDef,
      id: cleanId,
      dependencies: Array.isArray(moduleDef.dependencies) ? moduleDef.dependencies : [],
      requiredPermissions: Array.isArray(moduleDef.requiredPermissions) ? moduleDef.requiredPermissions : [],
      commands: normalizedCommands,
      events: Array.isArray(moduleDef.events) ? moduleDef.events : [],
      automations: Array.isArray(moduleDef.automations) ? moduleDef.automations : []
    });
    for (const cmd of normalizedCommands) {
      COMMAND_TO_MODULE_MAP[String(cmd).toLowerCase().trim()] = cleanId;
    }
    return true;
  }

  /**
   * Records an operational error for a specific module without crashing the bot.
   * @param {string} moduleKey
   * @param {string} errorMessage
   * @param {string} [guildId='GLOBAL']
   */
  recordModuleError(moduleKey, errorMessage, guildId = 'GLOBAL') {
    const cleanKey = String(moduleKey || '').toLowerCase().trim();
    if (!this.errorRegistry.has(cleanKey)) {
      this.errorRegistry.set(cleanKey, []);
    }
    const list = this.errorRegistry.get(cleanKey);
    list.unshift({
      timestamp: new Date().toISOString(),
      message: String(errorMessage),
      guildId
    });
    if (list.length > 20) list.pop();
  }

  /**
   * Returns health status and error log for a module.
   * @param {string} moduleKey
   * @param {boolean} [isEnabled=true]
   */
  getModuleHealth(moduleKey, isEnabled = true) {
    const errors = this.errorRegistry.get(moduleKey) || [];
    let healthStatus = 'HEALTHY';
    if (!isEnabled) {
      healthStatus = 'DISABLED';
    } else if (errors.length > 0) {
      healthStatus = 'DEGRADED';
    }
    return {
      healthStatus,
      errorCount: errors.length,
      errorLog: errors
    };
  }

  /**
   * Returns list of all defined official modules with full metadata and health state.
   * @param {string} [guildId]
   */
  getAllModuleDefinitions(guildId = null) {
    const states = guildId ? this.getGuildModules(guildId) : {};
    const allDefs = [...MODULE_DEFINITIONS, ...Array.from(this.customDefinitions.values())];

    return allDefs.map(def => {
      const isEnabled = guildId ? (states[def.id] !== false) : true;
      const health = this.getModuleHealth(def.id, isEnabled);
      const dependentModules = allDefs
        .filter(other => Array.isArray(other.dependencies) && other.dependencies.includes(def.id))
        .map(other => other.id);

      return {
        ...JSON.parse(JSON.stringify(def)),
        dependentModules,
        isEnabled,
        healthStatus: health.healthStatus,
        errorCount: health.errorCount,
        errorLog: health.errorLog
      };
    });
  }

  /**
   * Retrieves a single module definition by ID.
   * @param {string} moduleKey
   */
  getModuleDefinition(moduleKey) {
    const cleanKey = String(moduleKey || '').toLowerCase().trim();
    return MODULE_BY_ID.get(cleanKey) || this.customDefinitions.get(cleanKey) || null;
  }

  /**
   * Resolves which module ID owns a specific command or alias.
   * @param {string} commandName
   * @returns {string|null}
   */
  getModuleForCommand(commandName) {
    if (!commandName) return null;
    const cleanName = String(commandName).toLowerCase().replace(/^[+!/?]/, '').trim();
    return COMMAND_TO_MODULE_MAP[cleanName] || null;
  }

  /**
   * Validates dependencies for a proposed module state map.
   * @param {Record<string, boolean>} proposedStates
   * @returns {{ valid: boolean, inconsistencies: Array<{ moduleId: string, moduleName: string, missingDependencyId: string, missingDependencyName: string, message: string }> }}
   */
  validateDependencies(proposedStates = {}) {
    const inconsistencies = [];
    for (const def of MODULE_DEFINITIONS) {
      const isModEnabled = proposedStates[def.id] !== false;
      if (isModEnabled && Array.isArray(def.dependencies) && def.dependencies.length > 0) {
        for (const depId of def.dependencies) {
          const isDepEnabled = proposedStates[depId] !== false;
          if (!isDepEnabled) {
            const depDef = MODULE_BY_ID.get(depId);
            const depName = depDef ? depDef.name : depId;
            inconsistencies.push({
              moduleId: def.id,
              moduleName: def.name,
              missingDependencyId: depId,
              missingDependencyName: depName,
              message: `O módulo "${def.name}" (${def.id}) depende do módulo "${depName}" (${depId}), que está desativado.`
            });
          }
        }
      }
    }
    return {
      valid: inconsistencies.length === 0,
      inconsistencies
    };
  }

  /**
   * Retrieves all module states for a specific guild.
   * If a module hasn't been explicitly configured, it defaults to TRUE (enabled).
   * Also reflects disabled state if a required parent dependency is disabled.
   * @param {string} guildId
   * @returns {Record<string, boolean>}
   */
  getGuildModules(guildId) {
    if (!guildId) return {};

    let guildMap = this.cache.get(guildId);
    if (!guildMap) {
      guildMap = new Map();
      const rows = this.db.all(
        'SELECT module_key, is_enabled FROM guild_module_settings WHERE guild_id = ?',
        [guildId]
      );
      for (const row of rows) {
        guildMap.set(row.module_key, row.is_enabled === 1);
      }
      this.cache.set(guildId, guildMap);
    }

    const result = {};
    for (const mod of MODULE_DEFINITIONS) {
      result[mod.id] = guildMap.has(mod.id) ? guildMap.get(mod.id) : true;
    }
    for (const [customId] of this.customDefinitions) {
      result[customId] = guildMap.has(customId) ? guildMap.get(customId) : true;
    }
    // Cascade parent disabled state to child dependent modules
    for (const mod of MODULE_DEFINITIONS) {
      if (result[mod.id] && Array.isArray(mod.dependencies)) {
        for (const depId of mod.dependencies) {
          if (result[depId] === false) {
            result[mod.id] = false;
          }
        }
      }
    }
    return result;
  }

  /**
   * Checks whether a specific module is active for a guild.
   * Also checks if all required parent dependencies of that module are active.
   * @param {string} guildId
   * @param {string} moduleKey
   * @returns {boolean}
   */
  isModuleEnabled(guildId, moduleKey) {
    if (!guildId || !moduleKey) return true;
    const cleanKey = String(moduleKey).toLowerCase().trim();

    let guildMap = this.cache.get(guildId);
    if (!guildMap) {
      this.getGuildModules(guildId);
      guildMap = this.cache.get(guildId);
    }

    const directState = (guildMap && guildMap.has(cleanKey)) ? guildMap.get(cleanKey) : true;
    if (!directState) return false;

    // Verify parent dependencies are also enabled
    const def = this.getModuleDefinition(cleanKey);
    if (def && Array.isArray(def.dependencies)) {
      for (const depId of def.dependencies) {
        const depState = (guildMap && guildMap.has(depId)) ? guildMap.get(depId) : true;
        if (!depState) return false;
      }
    }

    return true;
  }

  /**
   * Sets the enabled state of a specific module for a guild.
   * Preserves all module data when disabled.
   * When enabling a module, automatically enables its dependencies unless strictDependencies is true.
   * When disabling a parent module, automatically disables dependent child modules unless strictDependencies is true.
   * @param {string} guildId
   * @param {string} moduleKey
   * @param {boolean} isEnabled
   * @param {string} [actorId]
   * @param {object} [options]
   * @param {boolean} [options.strictDependencies=false]
   * @param {boolean} [options.autoResolveDependencies=true]
   */
  setModuleEnabled(guildId, moduleKey, isEnabled, actorId = null, options = {}) {
    if (!guildId || !moduleKey) return false;
    const cleanKey = String(moduleKey).toLowerCase().trim();
    const boolVal = Boolean(isEnabled);
    const def = this.getModuleDefinition(cleanKey);

    const currentStates = this.getGuildModules(guildId);

    // Dependency validation & auto-initialization
    if (boolVal && def && Array.isArray(def.dependencies) && def.dependencies.length > 0) {
      for (const depId of def.dependencies) {
        if (currentStates[depId] === false) {
          if (options.strictDependencies) {
            const depDef = this.getModuleDefinition(depId);
            throw new ValidationError(
              `Dependência obrigatória: Não é possível ativar "${def.name}" porque "${depDef ? depDef.name : depId}" está desativado.`
            );
          } else if (options.autoResolveDependencies !== false) {
            this._persistSingleModule(guildId, depId, true, actorId);
          }
        }
      }
    }

    // If disabling a parent module while a child module depends on it
    if (!boolVal) {
      for (const otherDef of MODULE_DEFINITIONS) {
        if (Array.isArray(otherDef.dependencies) && otherDef.dependencies.includes(cleanKey)) {
          if (currentStates[otherDef.id] !== false) {
            if (options.strictDependencies) {
              throw new ValidationError(
                `Conflito de dependência: O módulo "${otherDef.name}" depende de "${def ? def.name : cleanKey}". Desative "${otherDef.name}" primeiro.`
              );
            } else if (options.autoResolveDependencies !== false) {
              this._persistSingleModule(guildId, otherDef.id, false, actorId);
            }
          }
        }
      }
    }

    this._persistSingleModule(guildId, cleanKey, boolVal, actorId);
    return true;
  }

  _persistSingleModule(guildId, cleanKey, boolVal, actorId = null) {
    const intVal = boolVal ? 1 : 0;
    const now = new Date().toISOString();

    this.db.run(
      `INSERT INTO guild_module_settings (guild_id, module_key, is_enabled, updated_at)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(guild_id, module_key) DO UPDATE SET is_enabled = ?, updated_at = ?`,
      [guildId, cleanKey, intVal, now, intVal, now]
    );

    let guildMap = this.cache.get(guildId);
    if (!guildMap) {
      guildMap = new Map();
      this.cache.set(guildId, guildMap);
    }
    guildMap.set(cleanKey, boolVal);

    if (this.auditService) {
      this.auditService.logAction({
        guildId,
        actorId: actorId || 'SYSTEM',
        action: boolVal ? 'GUILD_MODULE_ENABLED' : 'GUILD_MODULE_DISABLED',
        targetId: cleanKey,
        details: { moduleKey: cleanKey, isEnabled: boolVal }
      });
    }

    moduleLogger.info(`Module "${cleanKey}" in guild ${guildId} is now ${boolVal ? 'ENABLED' : 'DISABLED'}.`);
  }

  /**
   * Batch updates module states for a guild with dependency validation.
   * @param {string} guildId
   * @param {Record<string, boolean>} modulesObject
   * @param {string} [actorId]
   * @param {object} [options]
   * @param {boolean} [options.strictDependencies=false]
   */
  setGuildModules(guildId, modulesObject, actorId = null, options = {}) {
    if (!guildId || !modulesObject || typeof modulesObject !== 'object') return {};

    const current = this.getGuildModules(guildId);
    const merged = { ...current };
    for (const [k, v] of Object.entries(modulesObject)) {
      merged[String(k).toLowerCase().trim()] = Boolean(v);
    }

    // Validate dependencies
    const depCheck = this.validateDependencies(merged);
    if (!depCheck.valid) {
      if (options.strictDependencies) {
        throw new ValidationError(depCheck.inconsistencies[0].message);
      }
      for (const inc of depCheck.inconsistencies) {
        const parentExplicitlyFalse = modulesObject[inc.missingDependencyId] === false;
        const childExplicitlyTrue = modulesObject[inc.moduleId] === true;
        if (parentExplicitlyFalse && childExplicitlyTrue) {
          throw new ValidationError(inc.message);
        } else if (parentExplicitlyFalse) {
          merged[inc.moduleId] = false;
        } else {
          merged[inc.missingDependencyId] = true;
        }
      }
    }

    for (const [key, val] of Object.entries(merged)) {
      if (MODULE_BY_ID.has(key) || this.customDefinitions.has(key)) {
        this._persistSingleModule(guildId, key, Boolean(val), actorId);
      }
    }

    return this.getGuildModules(guildId);
  }

  /**
   * Checks whether a Discord command (slash or prefix) is authorized under current module settings.
   * @param {string} guildId
   * @param {string} commandName
   * @returns {{ allowed: boolean, moduleKey: string|null, moduleName: string|null }}
   */
  checkCommandAllowed(guildId, commandName) {
    if (!guildId || !commandName) return { allowed: true, moduleKey: null, moduleName: null };
    const cleanName = String(commandName).toLowerCase().replace(/^[+!/?]/, '').trim();

    const moduleKey = COMMAND_TO_MODULE_MAP[cleanName];
    if (!moduleKey) {
      return { allowed: true, moduleKey: null, moduleName: null };
    }

    const isEnabled = this.isModuleEnabled(guildId, moduleKey);
    const modDef = this.getModuleDefinition(moduleKey);

    return {
      allowed: isEnabled,
      moduleKey,
      moduleName: modDef ? modDef.name : moduleKey
    };
  }

  /**
   * Checks whether a Discord button, select menu, or modal customId is authorized under current module settings.
   * @param {string} guildId
   * @param {string} customId
   * @returns {{ allowed: boolean, moduleKey: string|null, moduleName: string|null }}
   */
  checkInteractionAllowed(guildId, customId) {
    if (!guildId || !customId) return { allowed: true, moduleKey: null, moduleName: null };
    const cleanId = String(customId).toLowerCase().trim();

    for (const entry of INTERACTION_PREFIX_TO_MODULE_MAP) {
      if (cleanId.startsWith(entry.prefix)) {
        const isEnabled = this.isModuleEnabled(guildId, entry.moduleKey);
        const modDef = this.getModuleDefinition(entry.moduleKey);
        return {
          allowed: isEnabled,
          moduleKey: entry.moduleKey,
          moduleName: modDef ? modDef.name : entry.moduleKey
        };
      }
    }
    return { allowed: true, moduleKey: null, moduleName: null };
  }

  /**
   * Checks whether an AI function tool is authorized under current module settings.
   * @param {string} guildId
   * @param {string} toolName
   * @returns {{ allowed: boolean, moduleKey: string|null }}
   */
  checkToolAllowed(guildId, toolName) {
    if (!guildId || !toolName) return { allowed: true, moduleKey: null };

    // Check if ai_tools master switch or ai_chat parent is disabled
    if (!this.isModuleEnabled(guildId, 'ai_tools')) {
      return { allowed: false, moduleKey: 'ai_tools' };
    }

    const moduleKey = TOOL_TO_MODULE_MAP[toolName];
    if (moduleKey && !this.isModuleEnabled(guildId, moduleKey)) {
      return { allowed: false, moduleKey };
    }

    return { allowed: true, moduleKey: null };
  }

  /**
   * Checks whether a Discord event handler for a specific module should execute.
   * @param {string} guildId
   * @param {string} moduleKey
   * @returns {boolean}
   */
  checkEventAllowed(guildId, moduleKey) {
    if (!guildId || !moduleKey) return true;
    return this.isModuleEnabled(guildId, moduleKey);
  }

  /**
   * Checks whether an automated background task for a specific module should execute in a guild.
   * @param {string} guildId
   * @param {string} moduleKey
   * @returns {boolean}
   */
  checkAutomationAllowed(guildId, moduleKey) {
    if (!guildId || !moduleKey) return true;
    return this.isModuleEnabled(guildId, moduleKey);
  }

  /**
   * Invalidates in-memory cache for a guild.
   * @param {string} [guildId]
   */
  invalidateCache(guildId = null) {
    if (guildId) {
      this.cache.delete(guildId);
    } else {
      this.cache.clear();
    }
  }
}

module.exports = {
  GuildModuleService,
  MODULE_DEFINITIONS,
  COMMAND_TO_MODULE_MAP,
  TOOL_TO_MODULE_MAP,
  INTERACTION_PREFIX_TO_MODULE_MAP
};
