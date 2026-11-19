const { logger } = require('../utils/logger');

const moduleLogger = logger.forContext('GuildModuleService');

/**
 * Registry of all 26 official modular systems in Jarvis.
 * Each module can be toggled independently per guild and physically halts
 * real execution (commands, events, AI tools, automations) when disabled.
 */
const MODULE_DEFINITIONS = [
  { id: 'ai_chat', name: 'Inteligência Artificial (Chat)', category: 'IA & Automação', icon: '🤖', description: 'Conversas inteligentes, menções ao Jarvis e respostas automáticas com Gemini.' },
  { id: 'ai_memory', name: 'Memória da IA', category: 'IA & Automação', icon: '🧠', description: 'Gravação e recuperação contextual de memórias do usuário e do servidor.' },
  { id: 'ai_tools', name: 'Ferramentas de IA', category: 'IA & Automação', icon: '⚙️', description: 'Capacidade do Jarvis executar ações administrativas, pesquisas e utilitários via IA.' },
  { id: 'music', name: 'Música & Player', category: 'Mídia & Voz', icon: '🎵', description: 'Reprodução de músicas, rádio, playlists, DJ role e controles de voz.' },
  { id: 'voice_xp', name: 'Recursos de Voz & XP', category: 'Mídia & Voz', icon: '🎙️', description: 'Ganho de XP e recompensas automáticas por tempo em canais de voz.' },
  { id: 'economy', name: 'Economia & Moedas', category: 'Economia & Jogos', icon: '💰', description: 'Daily, work, crime, slut, rob, banco, transferências e câmbio de moedas.' },
  { id: 'casino', name: 'Cassino & Apostas', category: 'Economia & Jogos', icon: '🎰', description: 'Roleta, blackjack, coinflip, crash e apostas do servidor.' },
  { id: 'xp', name: 'XP & Níveis', category: 'Comunidade & Engajamento', icon: '⭐', description: 'Progressão por mensagens, cargos de nível, multiplicadores e placar.' },
  { id: 'tickets', name: 'Central de Tickets', category: 'Atendimento & Moderação', icon: '🎫', description: 'Canais de suporte privado com transcrição e painéis personalizáveis.' },
  { id: 'moderation', name: 'Moderação Manual', category: 'Atendimento & Moderação', icon: '🛡️', description: 'Comandos de ban, tempban, kick, warn, timeout e desbanimento.' },
  { id: 'auto_protection', name: 'Proteção Automática (Anti-Abuso)', category: 'Atendimento & Moderação', icon: '🚨', description: 'Anti-spam, anti-raid, anti-flood e detecção preventiva de golpes.' },
  { id: 'social', name: 'Sistema Social & Afeto', category: 'Comunidade & Engajamento', icon: '❤️', description: 'Interações como abraçar, beijar, cafuné, tapa e perfil de afeto.' },
  { id: 'marriages', name: 'Casamentos & Relações', category: 'Comunidade & Engajamento', icon: '💍', description: 'Propostas de casamento, divórcio, certidões e anéis.' },
  { id: 'reputation', name: 'Reputação (+Rep)', category: 'Comunidade & Engajamento', icon: '🌟', description: 'Reconhecimento entre membros com elogios e pontuação de reputação.' },
  { id: 'reviews', name: 'Avaliações & Feedback', category: 'Comunidade & Engajamento', icon: '📝', description: 'Envio de notas e comentários de membros com moderação opcional.' },
  { id: 'quiz', name: 'Quiz Arena', category: 'Economia & Jogos', icon: '🎯', description: 'Competição de perguntas e respostas com prêmios em XP e moedas.' },
  { id: 'giveaways', name: 'Sorteios', category: 'Comunidade & Engajamento', icon: '🎁', description: 'Criação e sorteio automatizado de prêmios com temporizadores.' },
  { id: 'polls', name: 'Enquetes & Votações', category: 'Comunidade & Engajamento', icon: '📊', description: 'Votações interativas com contagem de votos transparente.' },
  { id: 'welcome', name: 'Boas-Vindas', category: 'Comunidade & Engajamento', icon: '👋', description: 'Mensagens e cartões automáticos na entrada de novos membros.' },
  { id: 'goodbye', name: 'Despedidas', category: 'Comunidade & Engajamento', icon: '🚪', description: 'Notificação automática quando um membro deixa a comunidade.' },
  { id: 'autorole', name: 'AutoRole', category: 'Comunidade & Engajamento', icon: '🏷️', description: 'Atribuição instantânea de cargos na entrada de novos membros.' },
  { id: 'starboard', name: 'Starboard (Mural de Estrelas)', category: 'Comunidade & Engajamento', icon: '⭐', description: 'Destaque de mensagens marcadas com estrelas no canal dedicado.' },
  { id: 'automations', name: 'Automações & Briefings', category: 'IA & Automação', icon: '⏱️', description: 'Tarefas agendadas, resumos diários executivos e rotinas periódicas.' },
  { id: 'reminders', name: 'Lembretes', category: 'IA & Automação', icon: '🔔', description: 'Notificações e alertas agendados por membros ou moderadores.' },
  { id: 'fun_commands', name: 'Comandos de Diversão', category: 'Comunidade & Engajamento', icon: '🎉', description: 'Comandos de entretenimento, memes e respostas bem-humoradas.' },
  { id: 'gifs', name: 'GIFs & Imagens', category: 'Comunidade & Engajamento', icon: '🖼️', description: 'Gerador de imagens e integração com Tenor/Giphy.' }
];

/**
 * Mapping of command names to required module keys.
 */
const COMMAND_TO_MODULE_MAP = {
  // Moderation
  'punir': 'moderation',
  'ban': 'moderation',
  'tempban': 'moderation',
  'kick': 'moderation',
  'warn': 'moderation',
  'timeout': 'moderation',
  'unban': 'moderation',
  'untimeout': 'moderation',
  'limpar': 'moderation',
  'clear': 'moderation',
  'slowmode': 'moderation',
  'lock': 'moderation',
  'unlock': 'moderation',
  
  // Music & Voice
  'musica': 'music',
  'play': 'music',
  'tocar': 'music',
  'skip': 'music',
  'pular': 'music',
  'stop': 'music',
  'parar': 'music',
  'pause': 'music',
  'pausar': 'music',
  'resume': 'music',
  'queue': 'music',
  'fila': 'music',
  'volume': 'music',
  'loop': 'music',
  'tts': 'music',

  // Economy & Games
  'economia': 'economy',
  'daily': 'economy',
  'work': 'economy',
  'trabalhar': 'economy',
  'crime': 'economy',
  'slut': 'economy',
  'rob': 'economy',
  'roubar': 'economy',
  'banco': 'economy',
  'dep': 'economy',
  'depositar': 'economy',
  'sacar': 'economy',
  'saldo': 'economy',
  'bal': 'economy',
  'pagar': 'economy',
  'pay': 'economy',
  'investir': 'economy',
  'cambio': 'economy',
  'bolsa': 'economy',
  'empresa': 'economy',
  'emprestimo': 'economy',

  // Casino
  'cassino': 'casino',
  'apostar': 'casino',
  'roleta': 'casino',
  'blackjack': 'casino',
  'bj': 'casino',
  'coinflip': 'casino',
  'caraoucoroa': 'casino',
  'crash': 'casino',

  // XP & Levels
  'xp': 'xp',
  'rank': 'xp',
  'nivel': 'xp',
  'level': 'xp',
  'placar': 'xp',
  'leaderboard': 'xp',

  // Tickets
  'ticket': 'tickets',
  'tickets': 'tickets',

  // Social & Marriages
  'casar': 'marriages',
  'casamento': 'marriages',
  'divorcio': 'marriages',
  'divorciar': 'marriages',
  'ship': 'social',
  'shippar': 'social',
  'abracar': 'social',
  'hug': 'social',
  'beijar': 'social',
  'kiss': 'social',
  'tapa': 'social',
  'slap': 'social',
  'cafune': 'social',
  'pat': 'social',

  // Reputation
  'rep': 'reputation',
  '+rep': 'reputation',

  // Reviews
  'avaliar': 'reviews',
  'avaliacao': 'reviews',
  'feedback': 'reviews',

  // Quiz
  'quiz': 'quiz',

  // Giveaways & Polls
  'sorteio': 'giveaways',
  'enquete': 'polls',
  'poll': 'polls',

  // Automations & Reminders
  'lembrete': 'reminders',
  'lembrar': 'reminders',
  'briefing': 'automations',

  // Fun & Memes
  'resumir': 'ai_chat',
  'fofoca': 'ai_chat',
  'modo': 'ai_chat',
  'data': 'ai_chat',
  'hora': 'ai_chat',
  'tempo': 'ai_chat',
  'relogio': 'ai_chat'
};

/**
 * Mapping of AI tool declarations to required module keys.
 */
const TOOL_TO_MODULE_MAP = {
  // Moderation tools
  'banir_membro': 'moderation',
  'expulsar_membro': 'moderation',
  'aplicar_timeout': 'moderation',
  'remover_timeout': 'moderation',
  'aplicar_aviso': 'moderation',
  'limpar_mensagens': 'moderation',
  'aplicar_tempban': 'moderation',

  // Economy tools
  'consultar_saldo': 'economy',
  'transferir_moedas': 'economy',
  'conceder_moedas': 'economy',
  'remover_moedas': 'economy',
  'ver_cotacoes_bolsa': 'economy',

  // XP tools
  'consultar_xp_membro': 'xp',
  'adicionar_xp_membro': 'xp',
  'remover_xp_membro': 'xp',

  // Memory tools
  'gravar_memoria': 'ai_memory',
  'consultar_memoria': 'ai_memory',
  'esquecer_memoria': 'ai_memory',

  // Music tools
  'tocar_musica': 'music',
  'pular_musica': 'music',
  'parar_musica': 'music',
  'alterar_volume': 'music',

  // Social & Community tools
  'consultar_casamento': 'marriages',
  'verificar_reputacao': 'reputation',
  'criar_enquete': 'polls',
  'criar_sorteio': 'giveaways',
  'agendar_lembrete': 'reminders'
};

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
  }

  /**
   * Returns list of all defined official modules.
   */
  getAllModuleDefinitions() {
    return JSON.parse(JSON.stringify(MODULE_DEFINITIONS));
  }

  /**
   * Retrieves all module states for a specific guild.
   * If a module hasn't been explicitly configured, it defaults to TRUE (enabled).
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
    return result;
  }

  /**
   * Checks whether a specific module is active for a guild.
   * Ultra-fast cache lookup (< 0.05ms).
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

    if (guildMap && guildMap.has(cleanKey)) {
      return guildMap.get(cleanKey);
    }

    return true; // Default enabled
  }

  /**
   * Sets the enabled state of a specific module for a guild.
   * @param {string} guildId
   * @param {string} moduleKey
   * @param {boolean} isEnabled
   * @param {string} [actorId]
   */
  setModuleEnabled(guildId, moduleKey, isEnabled, actorId = null) {
    if (!guildId || !moduleKey) return false;
    const cleanKey = String(moduleKey).toLowerCase().trim();
    const boolVal = Boolean(isEnabled);
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
    return true;
  }

  /**
   * Batch updates module states for a guild.
   * @param {string} guildId
   * @param {Record<string, boolean>} modulesObject
   * @param {string} [actorId]
   */
  setGuildModules(guildId, modulesObject, actorId = null) {
    if (!guildId || !modulesObject || typeof modulesObject !== 'object') return {};

    for (const [key, val] of Object.entries(modulesObject)) {
      this.setModuleEnabled(guildId, key, Boolean(val), actorId);
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
    const cleanName = String(commandName).toLowerCase().replace(/^[+!/]/, '').trim();

    const moduleKey = COMMAND_TO_MODULE_MAP[cleanName];
    if (!moduleKey) {
      return { allowed: true, moduleKey: null, moduleName: null };
    }

    const isEnabled = this.isModuleEnabled(guildId, moduleKey);
    const modDef = MODULE_DEFINITIONS.find(m => m.id === moduleKey);

    return {
      allowed: isEnabled,
      moduleKey,
      moduleName: modDef ? modDef.name : moduleKey
    };
  }

  /**
   * Checks whether an AI function tool is authorized under current module settings.
   * @param {string} guildId
   * @param {string} toolName
   * @returns {{ allowed: boolean, moduleKey: string|null }}
   */
  checkToolAllowed(guildId, toolName) {
    if (!guildId || !toolName) return { allowed: true, moduleKey: null };

    // Check if ai_tools master switch is disabled
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
  TOOL_TO_MODULE_MAP
};
