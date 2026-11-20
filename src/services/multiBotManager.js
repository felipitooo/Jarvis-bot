const { Client, GatewayIntentBits, Partials, EmbedBuilder } = require('discord.js');
const { logger } = require('../utils/logger');
const { ValidationError } = require('../utils/errorHandler');
const {
  MODULE_DEFINITIONS,
  COMMAND_TO_MODULE_MAP,
  TOOL_TO_MODULE_MAP,
  INTERACTION_PREFIX_TO_MODULE_MAP
} = require('./guildModuleService');
const { applyBotPresence } = require('../utils/presenceHelper');

const mbLogger = logger.forContext('MultiBotManager');

/**
 * Default isolated configuration template for each Bot Instance (covering all 25 admin & operational sections).
 */
function buildDefaultInstanceConfig(name = 'J.A.R.V.I.S.', assignedModules = null) {
  const defaultModulesMap = {};
  for (const def of MODULE_DEFINITIONS) {
    if (Array.isArray(assignedModules) && assignedModules.length > 0) {
      defaultModulesMap[def.id] = assignedModules.includes(def.id);
    } else {
      defaultModulesMap[def.id] = true;
    }
  }

  return {
    prefix: '+',
    aiName: name || 'J.A.R.V.I.S.',
    aiModel: 'gemini-3.5-flash-lite',
    aiTemperature: 0.65,
    aiHumorMode: 'normal',
    aiPersonaRole: 'Assistente virtual inteligente de alta precisão',
    aiPersonaTone: 'Educado, prestativo, analítico e direto',
    presenceStatus: 'online',
    presenceActivityType: 'Custom',
    presenceActivityText: `${name || 'J.A.R.V.I.S.'} | +ajuda`,
    presenceActivityUrl: '',
    modules: defaultModulesMap,
    commands: {
      prefix: '+',
      prefixlessMode: false,
      disabledCommands: [],
      customAliases: {}
    },
    moderation: {
      logChannelId: '',
      antiSpamEnabled: true,
      maxMessagesPerInterval: 5,
      antiBotScamEnabled: true,
      antiBotScamAction: 'TIMEOUT',
      antiBotScamTimeoutSeconds: 86400,
      antiBotIgnoredChannels: [],
      tempBanWorkerEnabled: true
    },
    audit: {
      channelId: '',
      logMessageDelete: true,
      logMessageEdit: true,
      logVoiceChannels: true,
      logMemberJoinLeave: true,
      logPunishments: true
    },
    economyXp: {
      currencyName: 'StarkCoins',
      currencySymbol: '🪙',
      initialBalance: 100,
      dailyAmount: 500,
      workMin: 50,
      workMax: 200,
      xpMin: 15,
      xpMax: 25,
      xpCooldownSeconds: 60,
      voiceXpPerMinute: 10,
      casinoMinBet: 10,
      casinoMaxBet: 100000,
      quizRewardCoins: 200,
      quizRewardXp: 50,
      quizDefaultRounds: 5,
      quizTimeoutSeconds: 25
    },
    music: {
      defaultVolume: 80,
      maxQueueSize: 100,
      allowDuplicateTracks: true,
      autoDisconnectMinutes: 5,
      djRoleId: '',
      ttsEnabled: true,
      ttsLanguage: 'pt-BR'
    },
    tickets: {
      panelTitle: `🎫 Central de Atendimento — ${name || 'Bot'}`,
      panelDescription: 'Clique no botão abaixo para abrir um ticket privado com a equipe.',
      maxOpenTicketsPerUser: 1,
      transcriptChannelId: '',
      defaultSupportRoleId: ''
    },
    social: {
      marriageEnabled: true,
      marriageCost: 5000,
      shippingEnabled: true,
      funCommandsEnabled: true,
      gifsEnabled: true,
      welcomeChannelId: '',
      welcomeMessage: 'Bem-vindo(a) {user} ao **{server}**! 🎉',
      goodbyeChannelId: '',
      goodbyeMessage: '**{username}** saiu do servidor.',
      autoRoleId: '',
      starboardChannelId: '',
      starboardEmoji: '⭐',
      starboardMinStars: 3
    },
    automations: {
      briefingEnabled: false,
      briefingHourUtc: 18,
      briefingChannelId: '',
      remindersEnabled: true,
      socialAlertsEnabled: true
    },
    embeds: {
      primaryColor: '#00E5FF',
      successColor: '#10B981',
      warningColor: '#F59E0B',
      errorColor: '#EF4444',
      footerText: `${name || 'J.A.R.V.I.S.'} • Sistemas Centrais`
    },
    permissions: {
      allowedGuilds: [],
      blockedChannels: [],
      adminRoleIds: [],
      modRoleIds: [],
      restrictToAllowedGuilds: false
    },
    integrations: {
      youtubeAlertsEnabled: true,
      twitchAlertsEnabled: true,
      redditAlertsEnabled: true,
      webSearchEnabled: true,
      webhookLogUrl: ''
    },
    advanced: {
      maxConcurrency: 5,
      rateLimitPerMinute: 60,
      debugMode: false,
      autoRestartOnCrash: true,
      memoryLimitMb: 512
    }
  };
}

function safeJsonParse(str, fallback = {}) {
  if (!str) return fallback;
  if (typeof str === 'object') return str;
  try {
    return JSON.parse(str);
  } catch {
    return fallback;
  }
}

class MultiBotManager {
  /**
   * @param {import('../database/connection').DatabaseManager} dbManager
   * @param {object} [options]
   * @param {Function} [options.createContextFn]
   * @param {Function} [options.loadEventsFn]
   * @param {import('./auditService').AuditService} [options.auditService]
   */
  constructor(dbManager, options = {}) {
    this.db = dbManager;
    this.createContextFn = options.createContextFn;
    this.loadEventsFn = options.loadEventsFn;
    this.auditService = options.auditService;

    const { InterBotBridge } = require('./interBotBridge');
    this.interBotBridge = options.interBotBridge || new InterBotBridge(dbManager);

    /** @type {Map<string, { client: import('discord.js').Client, status: string, memoryMb: number, lastError: string|null, startedAt: number|null, assignedModules: Array<string>, allowedGuilds: Array<string>, config: object }>} */
    this.activeInstances = new Map();

    // Fallback in-memory stores for unit tests using minimal mock db
    this._fallbackConfigs = new Map();
    this._fallbackMemories = new Map();
    this._fallbackLogs = new Map();
  }

  /**
   * Masks a Discord token for secure presentation in web panels and logs.
   * Never exposes full token.
   * @param {string} token
   * @returns {string}
   */
  maskToken(token) {
    if (!token || typeof token !== 'string') return '';
    if (token.length <= 12) return '••••••••••••';
    return token.slice(0, 8) + '••••••••••••' + token.slice(-4);
  }

  /**
   * Lists all configured bot instances from SQLite with their isolated configs.
   * @returns {Array<object>}
   */
  listInstances() {
    const rows = this.db.all('SELECT * FROM bot_instances ORDER BY created_at ASC') || [];
    return rows.map(r => this._formatInstanceRow(r));
  }

  _formatInstanceRow(r) {
    if (!r) return null;
    const live = this.activeInstances.get(r.id);
    let assigned = [];
    let guilds = [];
    try { assigned = r.assigned_modules ? JSON.parse(r.assigned_modules) : []; } catch {}
    try { guilds = r.allowed_guilds ? JSON.parse(r.allowed_guilds) : []; } catch {}

    const config = this.getInstanceConfig(r.id, r.name, assigned);
    const activeModulesCount = Object.values(config.modules || {}).filter(Boolean).length;

    let memoriesCount = 0;
    let logsCount = 0;
    try {
      const memRow = this.db.get('SELECT COUNT(*) as cnt FROM bot_instance_memories WHERE bot_id = ?', [r.id]);
      if (memRow && typeof memRow.cnt === 'number') memoriesCount = memRow.cnt;
      else memoriesCount = (this._fallbackMemories.get(r.id) || []).length;
    } catch {
      memoriesCount = (this._fallbackMemories.get(r.id) || []).length;
    }

    try {
      const logRow = this.db.get('SELECT COUNT(*) as cnt FROM bot_instance_logs WHERE bot_id = ?', [r.id]);
      if (logRow && typeof logRow.cnt === 'number') logsCount = logRow.cnt;
      else logsCount = (this._fallbackLogs.get(r.id) || []).length;
    } catch {
      logsCount = (this._fallbackLogs.get(r.id) || []).length;
    }

    return {
      id: r.id,
      name: r.name,
      maskedToken: this.maskToken(r.token),
      hasToken: Boolean(r.token && r.token.length > 20),
      isEnabled: r.is_enabled === 1,
      assignedModules: assigned,
      allowedGuilds: guilds,
      status: live ? live.status : (r.status || 'STOPPED'),
      avatarUrl: (typeof live?.client?.user?.displayAvatarURL === 'function')
        ? live.client.user.displayAvatarURL({ extension: 'png', size: 128 })
        : (config?.theme?.avatarUrl || 'https://cdn.discordapp.com/embed/avatars/0.png'),
      lastError: live?.lastError || r.last_error || null,
      memoryMb: live ? live.memoryMb : (r.memory_mb || 0),
      uptimeSeconds: live?.startedAt ? Math.floor((Date.now() - live.startedAt) / 1000) : 0,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      config,
      databaseStats: {
        logicalNamespace: `tenant_${r.id}`,
        isolationMode: 'LOGICAL_SQLITE_TENANT',
        activeModulesCount,
        totalModulesCount: MODULE_DEFINITIONS.length,
        memoriesCount,
        logsCount
      }
    };
  }

  /**
   * Retrieves or initializes the isolated 18-section configuration for a specific bot instance.
   * @param {string} botId
   * @param {string} [botName='J.A.R.V.I.S.']
   * @param {Array<string>} [assignedModules=null]
   */
  getInstanceConfig(botId, botName = 'J.A.R.V.I.S.', assignedModules = null) {
    if (!botName || botName === 'J.A.R.V.I.S.') {
      try {
        const row = this.db?.get?.('SELECT name FROM bot_instances WHERE id = ?', [botId]);
        if (row?.name) botName = row.name;
      } catch {}
    }
    const defaults = buildDefaultInstanceConfig(botName, assignedModules);

    let cfgRow = null;
    try {
      cfgRow = this.db.get('SELECT * FROM bot_instance_configs WHERE bot_id = ?', [botId]);
    } catch {
      cfgRow = null;
    }

    if (!cfgRow && this._fallbackConfigs.has(botId)) {
      cfgRow = this._fallbackConfigs.get(botId);
    }

    if (!cfgRow) {
      // Ensure all 26 modules exist in defaults.modules
      return defaults;
    }

    const savedModules = safeJsonParse(cfgRow.modules_state_json, {});
    const mergedModules = { ...defaults.modules };
    for (const def of MODULE_DEFINITIONS) {
      if (savedModules[def.id] !== undefined) {
        mergedModules[def.id] = Boolean(savedModules[def.id]);
      }
    }

    const isNotDefaultJarvis = Boolean(botName && !['jarvis', 'j.a.r.v.i.s.'].includes(botName.toLowerCase().trim()));
    const rawAiName = cfgRow.ai_name || '';
    const resolvedAiName = (rawAiName && rawAiName !== 'J.A.R.V.I.S.') ? rawAiName : (isNotDefaultJarvis ? botName : defaults.aiName);

    const rawPresText = cfgRow.presence_activity_text !== undefined ? cfgRow.presence_activity_text : '';
    const resolvedPresText = (rawPresText && rawPresText !== 'J.A.R.V.I.S | +ajuda')
      ? rawPresText
      : (isNotDefaultJarvis ? `${botName} | ${cfgRow.prefix || defaults.prefix}ajuda` : (rawPresText || defaults.presenceActivityText));

    return {
      prefix: cfgRow.prefix || defaults.prefix,
      aiName: resolvedAiName,
      aiModel: cfgRow.ai_model || defaults.aiModel,
      aiTemperature: cfgRow.ai_temperature !== undefined ? Number(cfgRow.ai_temperature) : defaults.aiTemperature,
      aiHumorMode: cfgRow.ai_humor_mode || defaults.aiHumorMode,
      aiPersonaRole: cfgRow.ai_persona_role !== undefined ? cfgRow.ai_persona_role : defaults.aiPersonaRole,
      aiPersonaTone: cfgRow.ai_persona_tone !== undefined ? cfgRow.ai_persona_tone : defaults.aiPersonaTone,
      presenceStatus: cfgRow.presence_status || defaults.presenceStatus,
      presenceActivityType: cfgRow.presence_activity_type || defaults.presenceActivityType,
      presenceActivityText: resolvedPresText,
      presenceActivityUrl: cfgRow.presence_activity_url || defaults.presenceActivityUrl,
      modules: mergedModules,
      commands: { ...defaults.commands, ...safeJsonParse(cfgRow.commands_config_json, {}) },
      moderation: { ...defaults.moderation, ...safeJsonParse(cfgRow.moderation_config_json, {}) },
      audit: {
        ...defaults.audit,
        ...(safeJsonParse(cfgRow.advanced_config_json, {}).audit || {}),
        ...(safeJsonParse(cfgRow.moderation_config_json, {}).logChannelId ? { channelId: safeJsonParse(cfgRow.moderation_config_json, {}).logChannelId } : {})
      },
      economyXp: { ...defaults.economyXp, ...safeJsonParse(cfgRow.economy_xp_config_json, {}) },
      music: { ...defaults.music, ...safeJsonParse(cfgRow.music_config_json, {}) },
      tickets: { ...defaults.tickets, ...safeJsonParse(cfgRow.tickets_config_json, {}) },
      social: { ...defaults.social, ...safeJsonParse(cfgRow.social_config_json, {}) },
      automations: { ...defaults.automations, ...safeJsonParse(cfgRow.automations_config_json, {}) },
      embeds: { ...defaults.embeds, ...safeJsonParse(cfgRow.embeds_config_json, {}) },
      permissions: { ...defaults.permissions, ...safeJsonParse(cfgRow.permissions_config_json, {}) },
      integrations: { ...defaults.integrations, ...safeJsonParse(cfgRow.integrations_config_json, {}) },
      advanced: { ...defaults.advanced, ...safeJsonParse(cfgRow.advanced_config_json, {}) }
    };
  }

  /**
   * Registers a new secondary bot instance with isolated config, memory and logs.
   * @param {object} params
   * @param {string} params.name
   * @param {string} params.token
   * @param {Array<string>} [params.assignedModules=[]]
   * @param {Array<string>} [params.allowedGuilds=[]]
   * @param {object} [params.config={}]
   */
  createInstance({ name, token, assignedModules = [], allowedGuilds = [], config = {} }) {
    const cleanName = String(name || '').trim();
    const cleanToken = String(token || '').trim();

    if (!cleanName) throw new ValidationError('O nome da instância é obrigatório.');
    if (!cleanToken || cleanToken.length < 25) throw new ValidationError('Token do Discord inválido (mínimo 25 caracteres).');

    const id = `bot_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();
    const modulesJson = JSON.stringify(assignedModules || []);
    const guildsJson = JSON.stringify(allowedGuilds || []);

    this.db.run(
      `INSERT INTO bot_instances (id, name, token, is_enabled, assigned_modules, allowed_guilds, status, memory_mb, created_at, updated_at)
       VALUES (?, ?, ?, 1, ?, ?, 'STOPPED', 0, ?, ?)`,
      [id, cleanName, cleanToken, modulesJson, guildsJson, now, now]
    );

    // Initialize isolated 18-section config row
    const initCfg = buildDefaultInstanceConfig(cleanName, assignedModules);
    if (config && typeof config === 'object') {
      if (config.prefix) initCfg.prefix = config.prefix;
      if (config.aiName) initCfg.aiName = config.aiName;
      if (config.modules && typeof config.modules === 'object') {
        initCfg.modules = { ...initCfg.modules, ...config.modules };
      }
    }

    this._persistInstanceConfig(id, initCfg);
    this.addInstanceLog(id, 'INFO', 'SYSTEM', `Instância "${cleanName}" cadastrada com sucesso. Isolamento lógico inicializado.`);

    if (this.auditService) {
      this.auditService.logAction({
        action: 'MULTI_BOT_INSTANCE_CREATED',
        targetId: id,
        details: { name: cleanName, assignedModules }
      });
    }

    mbLogger.info(`Registered secondary bot instance: "${cleanName}" (ID: ${id})`);
    return this.getInstance(id);
  }

  _persistInstanceConfig(botId, cfg) {
    const now = new Date().toISOString();
    const rowData = {
      bot_id: botId,
      prefix: String(cfg.prefix || '+').trim(),
      ai_name: String(cfg.aiName || 'J.A.R.V.I.S.').trim(),
      ai_model: String(cfg.aiModel || 'gemini-3.5-flash-lite').trim(),
      ai_temperature: Number(cfg.aiTemperature ?? 0.65),
      ai_humor_mode: String(cfg.aiHumorMode || 'normal').trim(),
      ai_persona_role: String(cfg.aiPersonaRole || ''),
      ai_persona_tone: String(cfg.aiPersonaTone || ''),
      presence_status: String(cfg.presenceStatus || 'online'),
      presence_activity_type: String(cfg.presenceActivityType || 'Custom'),
      presence_activity_text: String(cfg.presenceActivityText || ''),
      presence_activity_url: String(cfg.presenceActivityUrl || ''),
      modules_state_json: JSON.stringify(cfg.modules || {}),
      commands_config_json: JSON.stringify(cfg.commands || {}),
      moderation_config_json: JSON.stringify(cfg.moderation || {}),
      economy_xp_config_json: JSON.stringify(cfg.economyXp || {}),
      music_config_json: JSON.stringify(cfg.music || {}),
      tickets_config_json: JSON.stringify(cfg.tickets || {}),
      social_config_json: JSON.stringify(cfg.social || {}),
      automations_config_json: JSON.stringify(cfg.automations || {}),
      embeds_config_json: JSON.stringify(cfg.embeds || {}),
      permissions_config_json: JSON.stringify(cfg.permissions || {}),
      integrations_config_json: JSON.stringify(cfg.integrations || {}),
      advanced_config_json: JSON.stringify({ ...(cfg.advanced || {}), audit: cfg.audit || {} }),
      updated_at: now
    };

    this._fallbackConfigs.set(botId, rowData);

    try {
      this.db.run(
        `INSERT INTO bot_instance_configs (
          bot_id, prefix, ai_name, ai_model, ai_temperature, ai_humor_mode, ai_persona_role, ai_persona_tone,
          presence_status, presence_activity_type, presence_activity_text, presence_activity_url,
          modules_state_json, commands_config_json, moderation_config_json, economy_xp_config_json,
          music_config_json, tickets_config_json, social_config_json, automations_config_json,
          embeds_config_json, permissions_config_json, integrations_config_json, advanced_config_json, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(bot_id) DO UPDATE SET
          prefix = excluded.prefix,
          ai_name = excluded.ai_name,
          ai_model = excluded.ai_model,
          ai_temperature = excluded.ai_temperature,
          ai_humor_mode = excluded.ai_humor_mode,
          ai_persona_role = excluded.ai_persona_role,
          ai_persona_tone = excluded.ai_persona_tone,
          presence_status = excluded.presence_status,
          presence_activity_type = excluded.presence_activity_type,
          presence_activity_text = excluded.presence_activity_text,
          presence_activity_url = excluded.presence_activity_url,
          modules_state_json = excluded.modules_state_json,
          commands_config_json = excluded.commands_config_json,
          moderation_config_json = excluded.moderation_config_json,
          economy_xp_config_json = excluded.economy_xp_config_json,
          music_config_json = excluded.music_config_json,
          tickets_config_json = excluded.tickets_config_json,
          social_config_json = excluded.social_config_json,
          automations_config_json = excluded.automations_config_json,
          embeds_config_json = excluded.embeds_config_json,
          permissions_config_json = excluded.permissions_config_json,
          integrations_config_json = excluded.integrations_config_json,
          advanced_config_json = excluded.advanced_config_json,
          updated_at = excluded.updated_at`,
        [
          rowData.bot_id, rowData.prefix, rowData.ai_name, rowData.ai_model, rowData.ai_temperature,
          rowData.ai_humor_mode, rowData.ai_persona_role, rowData.ai_persona_tone,
          rowData.presence_status, rowData.presence_activity_type, rowData.presence_activity_text, rowData.presence_activity_url,
          rowData.modules_state_json, rowData.commands_config_json, rowData.moderation_config_json, rowData.economy_xp_config_json,
          rowData.music_config_json, rowData.tickets_config_json, rowData.social_config_json, rowData.automations_config_json,
          rowData.embeds_config_json, rowData.permissions_config_json, rowData.integrations_config_json, rowData.advanced_config_json,
          rowData.updated_at
        ]
      );
    } catch (err) {
      mbLogger.debug(`Fallback config store used for ${botId}: ${err.message}`);
    }
  }

  /**
   * Retrieves single bot instance by ID or name with full 18-section config, memories, and logs.
   * @param {string} idOrName
   */
  getInstance(idOrName) {
    if (!idOrName) return null;
    const row = this.db.get('SELECT * FROM bot_instances WHERE id = ? OR LOWER(name) = LOWER(?)', [idOrName, idOrName]);
    if (!row) return null;
    const formatted = this._formatInstanceRow(row);
    formatted.token = row.token;
    return formatted;
  }

  /**
   * Updates an instance's metadata and/or any of its 18 administrative configuration sections.
   * Strict isolation ensures updating Bot A never modifies Bot B.
   * @param {string} idOrName
   * @param {object} updates
   */
  updateInstance(idOrName, updates = {}) {
    const row = this.db.get('SELECT * FROM bot_instances WHERE id = ? OR LOWER(name) = LOWER(?)', [idOrName, idOrName]);
    if (!row) throw new ValidationError('Instância de bot não encontrada.');

    const existing = this._formatInstanceRow(row);
    const id = existing.id;
    const currentConfig = existing.config;

    const name = updates.name !== undefined ? String(updates.name).trim() : existing.name;
    if (!name) throw new ValidationError('O nome da instância não pode ficar vazio.');

    const token = (updates.token && String(updates.token).trim().length >= 25 && !String(updates.token).includes('••'))
      ? String(updates.token).trim()
      : row.token;
    const isEnabled = updates.isEnabled !== undefined ? (updates.isEnabled ? 1 : 0) : (existing.isEnabled ? 1 : 0);

    // Merge 18-section configurations
    const newConfig = { ...currentConfig };
    const incomingCfg = updates.config || updates;

    if (incomingCfg.prefix !== undefined) {
      newConfig.prefix = String(incomingCfg.prefix).trim() || '+';
      newConfig.commands = { ...newConfig.commands, prefix: newConfig.prefix };
    }
    if (incomingCfg.aiName !== undefined) newConfig.aiName = String(incomingCfg.aiName).trim() || name;
    if (incomingCfg.aiModel !== undefined) newConfig.aiModel = String(incomingCfg.aiModel).trim();
    if (incomingCfg.aiTemperature !== undefined) newConfig.aiTemperature = Number(incomingCfg.aiTemperature);
    if (incomingCfg.aiHumorMode !== undefined) newConfig.aiHumorMode = String(incomingCfg.aiHumorMode).trim();
    if (incomingCfg.aiPersonaRole !== undefined) newConfig.aiPersonaRole = String(incomingCfg.aiPersonaRole);
    if (incomingCfg.aiPersonaTone !== undefined) newConfig.aiPersonaTone = String(incomingCfg.aiPersonaTone);
    if (incomingCfg.presenceStatus !== undefined) newConfig.presenceStatus = String(incomingCfg.presenceStatus);
    if (incomingCfg.presenceActivityType !== undefined) newConfig.presenceActivityType = String(incomingCfg.presenceActivityType);
    if (incomingCfg.presenceActivityText !== undefined) newConfig.presenceActivityText = String(incomingCfg.presenceActivityText);
    if (incomingCfg.presenceActivityUrl !== undefined) newConfig.presenceActivityUrl = String(incomingCfg.presenceActivityUrl);

    if (incomingCfg.modules && typeof incomingCfg.modules === 'object') {
      const mergedMods = { ...newConfig.modules };
      for (const [mKey, mVal] of Object.entries(incomingCfg.modules)) {
        mergedMods[mKey] = Boolean(mVal);
      }
      // Dependency auto-resolution / validation
      for (const def of MODULE_DEFINITIONS) {
        if (mergedMods[def.id] && Array.isArray(def.dependencies)) {
          for (const depId of def.dependencies) {
            if (incomingCfg.modules[depId] === false && incomingCfg.modules[def.id] === true) {
              const depDef = MODULE_DEFINITIONS.find(d => d.id === depId);
              throw new ValidationError(
                `Dependência de Módulo: "${def.name}" requer que "${depDef ? depDef.name : depId}" esteja ativo.`
              );
            }
            if (incomingCfg.modules[depId] === false) {
              mergedMods[def.id] = false;
            } else if (mergedMods[depId] === false) {
              mergedMods[depId] = true;
            }
          }
        }
      }
      newConfig.modules = mergedMods;
    }

    if (incomingCfg.commands && typeof incomingCfg.commands === 'object') {
      newConfig.commands = { ...newConfig.commands, ...incomingCfg.commands };
      if (incomingCfg.commands.prefix && incomingCfg.prefix === undefined) {
        newConfig.prefix = incomingCfg.commands.prefix;
      }
    }
    if (incomingCfg.moderation && typeof incomingCfg.moderation === 'object') {
      newConfig.moderation = { ...newConfig.moderation, ...incomingCfg.moderation };
    }
    if (incomingCfg.economyXp && typeof incomingCfg.economyXp === 'object') {
      newConfig.economyXp = { ...newConfig.economyXp, ...incomingCfg.economyXp };
    }
    if (incomingCfg.music && typeof incomingCfg.music === 'object') {
      newConfig.music = { ...newConfig.music, ...incomingCfg.music };
    }
    if (incomingCfg.tickets && typeof incomingCfg.tickets === 'object') {
      newConfig.tickets = { ...newConfig.tickets, ...incomingCfg.tickets };
    }
    if (incomingCfg.social && typeof incomingCfg.social === 'object') {
      newConfig.social = { ...newConfig.social, ...incomingCfg.social };
    }
    if (incomingCfg.automations && typeof incomingCfg.automations === 'object') {
      newConfig.automations = { ...newConfig.automations, ...incomingCfg.automations };
    }
    if (incomingCfg.embeds && typeof incomingCfg.embeds === 'object') {
      newConfig.embeds = { ...newConfig.embeds, ...incomingCfg.embeds };
    }
    if (incomingCfg.permissions && typeof incomingCfg.permissions === 'object') {
      newConfig.permissions = { ...newConfig.permissions, ...incomingCfg.permissions };
    }
    if (incomingCfg.integrations && typeof incomingCfg.integrations === 'object') {
      newConfig.integrations = { ...newConfig.integrations, ...incomingCfg.integrations };
    }
    if (incomingCfg.advanced && typeof incomingCfg.advanced === 'object') {
      newConfig.advanced = { ...newConfig.advanced, ...incomingCfg.advanced };
    }
    if (incomingCfg.theme && typeof incomingCfg.theme === 'object') {
      newConfig.theme = { ...newConfig.theme, ...incomingCfg.theme };
    }

    const activeModuleList = Object.entries(newConfig.modules)
      .filter(([, val]) => val === true)
      .map(([key]) => key);

    const assignedModulesJson = updates.assignedModules !== undefined
      ? JSON.stringify(updates.assignedModules)
      : JSON.stringify(activeModuleList);

    const allowedGuildsJson = updates.allowedGuilds !== undefined
      ? JSON.stringify(updates.allowedGuilds)
      : JSON.stringify(newConfig.permissions.allowedGuilds || existing.allowedGuilds);

    const now = new Date().toISOString();

    this.db.run(
      `UPDATE bot_instances 
       SET name = ?, token = ?, is_enabled = ?, assigned_modules = ?, allowed_guilds = ?, updated_at = ?
       WHERE id = ?`,
      [name, token, isEnabled, assignedModulesJson, allowedGuildsJson, now, id]
    );

    this._persistInstanceConfig(id, newConfig);
    this.addInstanceLog(id, 'INFO', 'CONFIG', `Configurações administrativas da instância "${name}" salvas com sucesso.`);

    // Update live running instance immediately (presence, AI name, model, modules, prefix, permissions)
    this._syncLiveInstance(id, newConfig, name);

    return this.getInstance(id);
  }

  /**
   * Synchronizes all live runtime state and Discord presence for an active instance.
   * @param {string} botId
   * @param {object} [cfgOverride]
   * @param {string} [nameOverride]
   */
  _syncLiveInstance(botId, cfgOverride = null, nameOverride = null) {
    const live = this.activeInstances.get(botId);
    if (!live) return false;

    const inst = (!cfgOverride || !nameOverride) ? this.getInstance(botId) : null;
    const cfg = cfgOverride || inst?.config || live.config || {};
    const instName = nameOverride || inst?.name || cfg.aiName || 'Bot';

    const activeModuleList = Object.entries(cfg.modules || {})
      .filter(([, val]) => val === true)
      .map(([key]) => key);

    live.config = cfg;
    live.assignedModules = activeModuleList;
    live.allowedGuilds = cfg.permissions?.allowedGuilds || [];

    if (live.childContext) {
      live.childContext.botInstanceConfig = cfg;
      live.childContext.botInstanceName = instName;
      if (live.childContext.identityService) {
        live.childContext.identityService.forcedInstanceName = cfg.aiName || instName;
        live.childContext.identityService.defaultName = cfg.aiName || instName;
      }
      if (live.childContext.llmAdapter && cfg.aiModel) {
        live.childContext.llmAdapter.model = cfg.aiModel;
      }
    }

    this.applyInstancePresence(botId, cfg, instName);

    // Sync guild nickname on live Discord client if available
    if (live.client?.guilds?.cache) {
      for (const g of live.client.guilds.cache.values()) {
        try {
          const me = g.members?.me;
          if (me && typeof me.setNickname === 'function') {
            me.setNickname(instName).catch(() => {});
          }
        } catch {}
      }
    }

    return true;
  }

  /**
   * Immediately applies the instance's configured Discord status and activity to its live Discord Client.
   * @param {string} botId
   * @param {object} [cfgOverride]
   * @param {string} [nameOverride]
   */
  applyInstancePresence(botId, cfgOverride = null, nameOverride = null) {
    const live = this.activeInstances.get(botId);
    if (!live || !live.client || !live.client.user) return false;

    let realName = nameOverride;
    if (!realName) {
      try {
        const instRow = this.db?.get?.('SELECT name FROM bot_instances WHERE id = ?', [botId]);
        if (instRow?.name) realName = instRow.name;
      } catch {}
    }

    const cfg = cfgOverride || live.config || this.getInstanceConfig(botId, realName) || {};
    const instName = realName || cfg.aiName || live.client.user.username || 'Bot';
    const instPrefix = cfg.prefix || '+';

    const rawPres = (cfg.presenceActivityText !== undefined && String(cfg.presenceActivityText).trim() !== '')
      ? String(cfg.presenceActivityText).trim()
      : `${instName} | ${instPrefix}ajuda`;

    const presenceCfg = {
      botStatus: cfg.presenceStatus || 'online',
      activityType: cfg.presenceActivityType || 'Custom',
      activityName: rawPres,
      activityUrl: cfg.presenceActivityUrl || ''
    };

    const applied = applyBotPresence(live.client, presenceCfg);
    if (applied) {
      this.addInstanceLog(
        botId,
        'INFO',
        'PRESENCE',
        `Presença atualizada no Discord: [${presenceCfg.botStatus.toUpperCase()}] ${presenceCfg.activityType}: "${presenceCfg.activityName}"`
      );
    }
    return applied;
  }

  /**
   * Checks whether a specific module is enabled for a specific bot instance.
   * Also verifies parent module dependencies.
   * @param {string} botId
   * @param {string} moduleKey
   * @returns {boolean}
   */
  isModuleEnabledForInstance(botId, moduleKey) {
    if (!botId || !moduleKey) return true;
    const live = this.activeInstances.get(botId);
    const cfg = live?.config || this.getInstance(botId)?.config;
    if (!cfg || !cfg.modules) return false;

    const cleanKey = String(moduleKey).toLowerCase().trim();
    if (cfg.modules[cleanKey] === false) return false;

    const def = MODULE_DEFINITIONS.find(d => d.id === cleanKey);
    if (def && Array.isArray(def.dependencies)) {
      for (const depId of def.dependencies) {
        if (cfg.modules[depId] === false) return false;
      }
    }
    return true;
  }

  /**
   * Checks whether a command is allowed to run on a specific bot instance.
   * Enforces both disabledCommands and the 26-module toggles of that instance.
   * @param {string} botId
   * @param {string} commandName
   * @returns {{ allowed: boolean, moduleKey: string|null, moduleName: string|null, reason?: string }}
   */
  checkCommandAllowedForInstance(botId, commandName) {
    if (!botId || !commandName) return { allowed: true, moduleKey: null, moduleName: null };
    const cleanName = String(commandName).toLowerCase().replace(/^[+!/?]/, '').trim();

    const live = this.activeInstances.get(botId);
    const cfg = live?.config || this.getInstance(botId)?.config;
    if (!cfg) return { allowed: true, moduleKey: null, moduleName: null };

    const disabledList = Array.isArray(cfg.commands?.disabledCommands)
      ? cfg.commands.disabledCommands.map(c => String(c).toLowerCase().replace(/^[+!/?]/, '').trim())
      : [];
    if (disabledList.includes(cleanName)) {
      return {
        allowed: false,
        moduleKey: 'commands',
        moduleName: 'Comandos Desativados na Instância',
        reason: 'COMMAND_DISABLED'
      };
    }

    const moduleKey = COMMAND_TO_MODULE_MAP[cleanName];
    if (!moduleKey) {
      return { allowed: true, moduleKey: null, moduleName: null };
    }

    const isEnabled = this.isModuleEnabledForInstance(botId, moduleKey);
    const modDef = MODULE_DEFINITIONS.find(d => d.id === moduleKey);

    return {
      allowed: isEnabled,
      moduleKey,
      moduleName: modDef ? modDef.name : moduleKey
    };
  }

  /**
   * Checks whether a button/modal/select interaction is allowed on a specific bot instance.
   * @param {string} botId
   * @param {string} customId
   */
  checkInteractionAllowedForInstance(botId, customId) {
    if (!botId || !customId) return { allowed: true, moduleKey: null, moduleName: null };
    const cleanId = String(customId).toLowerCase().trim();

    for (const entry of INTERACTION_PREFIX_TO_MODULE_MAP) {
      if (cleanId.startsWith(entry.prefix)) {
        const isEnabled = this.isModuleEnabledForInstance(botId, entry.moduleKey);
        const modDef = MODULE_DEFINITIONS.find(d => d.id === entry.moduleKey);
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
   * Checks whether an AI tool is allowed on a specific bot instance.
   * @param {string} botId
   * @param {string} toolName
   */
  checkToolAllowedForInstance(botId, toolName) {
    if (!botId || !toolName) return { allowed: true, moduleKey: null };
    if (!this.isModuleEnabledForInstance(botId, 'ai_tools')) {
      return { allowed: false, moduleKey: 'ai_tools' };
    }
    const moduleKey = TOOL_TO_MODULE_MAP[toolName];
    if (moduleKey && !this.isModuleEnabledForInstance(botId, moduleKey)) {
      return { allowed: false, moduleKey };
    }
    return { allowed: true, moduleKey: null };
  }

  /**
   * Checks whether a guild and channel are permitted for a specific bot instance.
   * @param {string} botId
   * @param {string} [guildId]
   * @param {string} [channelId]
   */
  isGuildAndChannelAllowedForInstance(botId, guildId = null, channelId = null) {
    if (!botId) return true;
    const live = this.activeInstances.get(botId);
    const cfg = live?.config || this.getInstance(botId)?.config;
    if (!cfg || !cfg.permissions) return true;

    const allowedGuilds = Array.isArray(cfg.permissions.allowedGuilds) ? cfg.permissions.allowedGuilds.filter(Boolean) : [];
    if (guildId && cfg.permissions.restrictToAllowedGuilds && allowedGuilds.length > 0) {
      if (!allowedGuilds.includes(guildId)) return false;
    }

    const blockedChannels = Array.isArray(cfg.permissions.blockedChannels) ? cfg.permissions.blockedChannels.filter(Boolean) : [];
    if (channelId && blockedChannels.length > 0 && blockedChannels.includes(channelId)) {
      return false;
    }

    return true;
  }

  /**
   * Sends a message or rich embed to a Discord channel using this specific bot instance's live Client ("Falar pelo Bot").
   * @param {string} botId
   * @param {object} params
   * @param {string} [params.guildId]
   * @param {string} params.channelId
   * @param {string} [params.content]
   * @param {object} [params.embed]
   * @param {import('discord.js').Client} [fallbackClient]
   */
  async speakWithInstance(botId, payloadOrChannelId, optionsOrFallback = {}, maybeFallback = null) {
    let guildId = null;
    let channelId = null;
    let content = '';
    let embed = null;
    let fallbackClient = maybeFallback;

    if (typeof payloadOrChannelId === 'string') {
      channelId = payloadOrChannelId;
      content = optionsOrFallback.content || '';
      embed = optionsOrFallback.embed || null;
      guildId = optionsOrFallback.guildId || null;
      fallbackClient = optionsOrFallback.fallbackClient || maybeFallback;
    } else if (payloadOrChannelId && typeof payloadOrChannelId === 'object') {
      channelId = payloadOrChannelId.channelId;
      content = payloadOrChannelId.content || '';
      embed = payloadOrChannelId.embed || null;
      guildId = payloadOrChannelId.guildId || null;
      fallbackClient = (optionsOrFallback && typeof optionsOrFallback === 'object' && optionsOrFallback.guilds) ? optionsOrFallback : maybeFallback;
    }

    if (!channelId) throw new ValidationError('Selecione um canal de texto para enviar a mensagem.');

    const inst = this.getInstance(botId);
    if (!inst) throw new ValidationError('Instância de bot não encontrada.');

    const live = this.activeInstances.get(botId);
    const clientsToTry = [live?.client, fallbackClient].filter(Boolean);
    if (clientsToTry.length === 0) {
      throw new ValidationError(`A instância "${inst.name}" está OFFLINE e nenhum cliente auxiliar está disponível para envio.`);
    }

    let channel = null;
    for (const cli of clientsToTry) {
      if (!channel && guildId && cli.guilds?.cache?.has(guildId)) {
        const g = cli.guilds.cache.get(guildId);
        channel = g.channels?.cache?.get(channelId) || null;
      }
      if (!channel && cli.channels?.cache?.has(channelId)) {
        channel = cli.channels.cache.get(channelId);
      }
      if (!channel && cli.channels?.fetch) {
        try {
          channel = await cli.channels.fetch(channelId);
        } catch {}
      }
      if (channel) break;
    }

    if (!channel || (typeof channel.isTextBased === 'function' && !channel.isTextBased())) {
      throw new ValidationError(`Canal de texto (${channelId}) não encontrado ou sem permissão de envio.`);
    }

    const rawContent = content ? String(content).trim() : '';
    const hasEmbed = embed && (embed.title || embed.description || embed.fields?.length || embed.image || embed.thumbnail);

    if (!rawContent && !hasEmbed) {
      throw new ValidationError('Digite uma mensagem de texto ou preencha o título/descrição da Embed.');
    }

    const guildObj = channel.guild || (guildId && fallbackClient ? fallbackClient.guilds?.cache?.get(guildId) : null);
    let processedContent = rawContent;
    if (guildObj && processedContent) {
      processedContent = processedContent
        .replace(/\{server\}/gi, guildObj.name || 'Servidor')
        .replace(/\{members\}/gi, String(guildObj.memberCount || 0));
    }

    const payload = {};
    if (processedContent) payload.content = processedContent;

    const safeDisplayAvatar = (cli) => {
      try {
        if (typeof cli?.user?.displayAvatarURL === 'function') {
          return cli.user.displayAvatarURL();
        }
      } catch {}
      return undefined;
    };
    const botDisplayName = inst.config?.aiName || inst.name;
    const botAvatarUrl = inst.avatarUrl || safeDisplayAvatar(live?.client) || safeDisplayAvatar(fallbackClient) || undefined;

    if (hasEmbed) {
      const eb = new EmbedBuilder();
      if (embed.title) eb.setTitle(String(embed.title).slice(0, 256));
      if (embed.url) {
        try { new URL(embed.url); eb.setURL(embed.url); } catch {}
      }
      if (embed.description) {
        let desc = String(embed.description).slice(0, 4096);
        if (guildObj) {
          desc = desc
            .replace(/\{server\}/gi, guildObj.name || 'Servidor')
            .replace(/\{members\}/gi, String(guildObj.memberCount || 0));
        }
        eb.setDescription(desc);
      }
      const hexColor = String(embed.color || inst.config?.embeds?.primaryColor || '#00E5FF').replace('#', '');
      const colorInt = parseInt(hexColor, 16);
      eb.setColor(!isNaN(colorInt) ? colorInt : 0x00E5FF);

      if (embed.author?.name) {
        eb.setAuthor({
          name: String(embed.author.name).slice(0, 256),
          iconURL: embed.author.icon || undefined
        });
      } else {
        eb.setAuthor({
          name: botDisplayName,
          iconURL: botAvatarUrl
        });
      }

      const footerTxt = embed.footer?.text || inst.config?.embeds?.footerText || botDisplayName;
      if (footerTxt) {
        eb.setFooter({
          text: String(footerTxt).slice(0, 2048),
          iconURL: embed.footer?.icon || undefined
        });
      }
      if (embed.image) eb.setImage(embed.image);
      if (embed.thumbnail) eb.setThumbnail(embed.thumbnail);
      if (Array.isArray(embed.fields)) {
        for (const f of embed.fields) {
          if (f.name && f.value) {
            eb.addFields({
              name: String(f.name).slice(0, 256),
              value: String(f.value).slice(0, 1024),
              inline: Boolean(f.inline)
            });
          }
        }
      }
      eb.setTimestamp();
      payload.embeds = [eb];
    }

    let sent = null;

    // 1. Try sending directly from live client if member of channel guild
    if (live?.client && channel.guild?.members?.cache?.has(live.client.user?.id)) {
      try {
        sent = await channel.send(payload);
      } catch {}
    }

    // 2. Try sending via Webhook in channel for exact secondary bot persona (name + avatar)
    if (!sent && typeof channel.fetchWebhooks === 'function') {
      try {
        const hooks = await channel.fetchWebhooks().catch(() => null);
        let hook = hooks?.find(h => h.name === 'Jarvis-Speaker');
        if (!hook && typeof channel.createWebhook === 'function') {
          hook = await channel.createWebhook({
            name: 'Jarvis-Speaker',
            avatar: botAvatarUrl
          }).catch(() => null);
        }
        if (hook && hook.send) {
          sent = await hook.send({
            ...payload,
            username: botDisplayName,
            avatarURL: botAvatarUrl
          });
        }
      } catch {}
    }

    // 3. Fallback direct send via whichever client has channel access
    if (!sent) {
      sent = await channel.send(payload);
    }

    this.addInstanceLog(
      botId,
      'INFO',
      'BOT_SPEAK',
      `Mensagem transmitida em #${channel.name || channelId} (ID: ${sent?.id || 'ok'}).`
    );

    return {
      success: true,
      botId,
      botName: botDisplayName,
      channelId,
      channelName: channel.name || channelId,
      messageId: sent?.id || null
    };
  }

  // ==========================================
  // Isolated Bot Instance Memories
  // ==========================================

  listInstanceMemories(botId, guildId = 'GLOBAL') {
    try {
      const rows = this.db.all(
        'SELECT * FROM bot_instance_memories WHERE bot_id = ? AND guild_id = ? ORDER BY updated_at DESC',
        [botId, guildId]
      );
      if (Array.isArray(rows) && rows.length > 0) return rows;
    } catch {}
    return (this._fallbackMemories.get(botId) || []).filter(m => m.guild_id === guildId);
  }

  saveInstanceMemory(botId, { key, value, guildId = 'GLOBAL', createdBy = 'web_admin' }) {
    const cleanKey = String(key || '').trim().toLowerCase().slice(0, 64);
    const cleanVal = String(value || '').trim();
    if (!cleanKey || !cleanVal) {
      throw new ValidationError('Chave e valor da memória são obrigatórios.');
    }
    const now = new Date().toISOString();

    if (!this._fallbackMemories.has(botId)) this._fallbackMemories.set(botId, []);
    const list = this._fallbackMemories.get(botId);
    const existingIdx = list.findIndex(m => m.memory_key === cleanKey && m.guild_id === guildId);
    const entry = {
      id: Date.now(),
      bot_id: botId,
      guild_id: guildId,
      memory_key: cleanKey,
      memory_value: cleanVal,
      created_by: createdBy,
      updated_at: now
    };
    if (existingIdx >= 0) list[existingIdx] = entry;
    else list.unshift(entry);

    try {
      this.db.run(
        `INSERT INTO bot_instance_memories (bot_id, guild_id, memory_key, memory_value, created_by, updated_at)
         VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT(bot_id, guild_id, memory_key) DO UPDATE SET
           memory_value = excluded.memory_value,
           updated_at = excluded.updated_at`,
        [botId, guildId, cleanKey, cleanVal, createdBy, now]
      );
    } catch {}

    this.addInstanceLog(botId, 'INFO', 'MEMORY', `Memória "${cleanKey}" gravada na instância.`);
    return this.listInstanceMemories(botId, guildId);
  }

  deleteInstanceMemory(botId, key, guildId = 'GLOBAL') {
    const cleanKey = String(key || '').trim().toLowerCase();
    if (this._fallbackMemories.has(botId)) {
      const list = this._fallbackMemories.get(botId).filter(m => !(m.memory_key === cleanKey && m.guild_id === guildId));
      this._fallbackMemories.set(botId, list);
    }
    try {
      this.db.run(
        'DELETE FROM bot_instance_memories WHERE bot_id = ? AND guild_id = ? AND memory_key = ?',
        [botId, guildId, cleanKey]
      );
    } catch {}
    this.addInstanceLog(botId, 'INFO', 'MEMORY', `Memória "${cleanKey}" removida da instância.`);
    return this.listInstanceMemories(botId, guildId);
  }

  // ==========================================
  // Isolated Bot Instance Logs & Error History
  // ==========================================

  listInstanceLogs(botId, limit = 50) {
    try {
      const rows = this.db.all(
        'SELECT * FROM bot_instance_logs WHERE bot_id = ? ORDER BY id DESC LIMIT ?',
        [botId, limit]
      );
      if (Array.isArray(rows) && rows.length > 0) return rows;
    } catch {}
    return (this._fallbackLogs.get(botId) || []).slice(0, limit);
  }

  addInstanceLog(botId, level = 'INFO', category = 'SYSTEM', message = '', details = null) {
    const now = new Date().toISOString();
    const detailsStr = details ? (typeof details === 'string' ? details : JSON.stringify(details)) : null;

    if (!this._fallbackLogs.has(botId)) this._fallbackLogs.set(botId, []);
    const list = this._fallbackLogs.get(botId);
    list.unshift({
      id: list.length + 1,
      bot_id: botId,
      level,
      category,
      message,
      details: detailsStr,
      created_at: now
    });

    try {
      this.db.run(
        `INSERT INTO bot_instance_logs (bot_id, level, category, message, details, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [botId, level, category, message, detailsStr, now]
      );
    } catch {}
  }

  clearInstanceLogs(botId) {
    this._fallbackLogs.set(botId, []);
    try {
      this.db.run('DELETE FROM bot_instance_logs WHERE bot_id = ?', [botId]);
    } catch {}
    return [];
  }

  /**
   * Deletes a bot instance, stopping it if running.
   * @param {string} id
   */
  async deleteInstance(id) {
    await this.stopInstance(id);
    this._fallbackConfigs.delete(id);
    this._fallbackMemories.delete(id);
    this._fallbackLogs.delete(id);
    try {
      this.db.run('DELETE FROM bot_instance_configs WHERE bot_id = ?', [id]);
      this.db.run('DELETE FROM bot_instance_memories WHERE bot_id = ?', [id]);
      this.db.run('DELETE FROM bot_instance_logs WHERE bot_id = ?', [id]);
    } catch {}
    this.db.run('DELETE FROM bot_instances WHERE id = ?', [id]);
    mbLogger.info(`Deleted bot instance ${id}`);
    return true;
  }

  /**
   * Starts a secondary bot instance in an isolated client lifecycle.
   * Ensures that failure of this instance CANNOT affect the primary bot or other instances.
   * @param {string} id
   */
  async startInstance(id) {
    const inst = this.getInstance(id);
    if (!inst) throw new ValidationError('Instância não encontrada.');
    if (!inst.token) throw new ValidationError('Token não configurado para esta instância.');

    if (this.activeInstances.has(id)) {
      await this.stopInstance(id);
    }

    this._updateStatusInDb(id, 'STARTING', null);
    this.addInstanceLog(id, 'INFO', 'LIFECYCLE', `Iniciando processo isolado para "${inst.name}"...`);

    try {
      const client = new Client({
        intents: [
          GatewayIntentBits.Guilds,
          GatewayIntentBits.GuildMessages,
          GatewayIntentBits.MessageContent,
          GatewayIntentBits.GuildMembers,
          GatewayIntentBits.GuildVoiceStates,
          GatewayIntentBits.GuildMessageReactions,
          GatewayIntentBits.DirectMessages,
          GatewayIntentBits.GuildModeration,
          GatewayIntentBits.GuildExpressions || GatewayIntentBits.GuildEmojisAndStickers
        ],
        partials: [Partials.Channel, Partials.Message, Partials.Reaction, Partials.GuildMember, Partials.User]
      });

      const liveMeta = {
        client,
        childContext: null,
        status: 'STARTING',
        memoryMb: 45.0,
        lastError: null,
        startedAt: Date.now(),
        assignedModules: inst.assignedModules,
        allowedGuilds: inst.allowedGuilds,
        config: inst.config
      };

      this.activeInstances.set(id, liveMeta);

      if (typeof this.createContextFn === 'function' && typeof this.loadEventsFn === 'function') {
        const childContext = this.createContextFn();
        childContext.botInstanceId = id;
        childContext.botInstanceName = inst.name;
        childContext.botInstanceToken = inst.token;
        childContext.botInstanceConfig = inst.config;
        childContext.multiBotManager = this;
        childContext.client = client;

        if (childContext.auditService) {
          childContext.auditService.botClient = client;
          childContext.auditService.botInstanceId = id;
          childContext.auditService.multiBotManager = this;
        }

        if (childContext.moderationService) {
          childContext.moderationService.botInstanceId = id;
          childContext.moderationService.botInstanceName = inst.config.aiName || inst.name;
          childContext.moderationService.botInstanceConfig = inst.config;
        }

        if (childContext.identityService) {
          childContext.identityService.forcedInstanceName = inst.config.aiName || inst.name;
          childContext.identityService.defaultName = inst.config.aiName || inst.name;
        }
        if (childContext.llmAdapter && inst.config.aiModel) {
          childContext.llmAdapter.model = inst.config.aiModel;
        }
        if (childContext.aiOrchestrator) {
          childContext.aiOrchestrator.botInstanceId = id;
          childContext.aiOrchestrator.multiBotManager = this;
        }
        if (childContext.musicService) {
          childContext.musicService.setClient(client);
        }

        liveMeta.childContext = childContext;
        this.loadEventsFn(client, childContext);
      }

      client.on('error', err => {
        mbLogger.error(`Instance "${inst.name}" (${id}) error: ${err.message}`);
        liveMeta.lastError = err.message;
        liveMeta.status = 'ERROR';
        this._updateStatusInDb(id, 'ERROR', err.message);
        this.addInstanceLog(id, 'ERROR', 'GATEWAY', `Erro na instância: ${err.message}`);
      });

      client.once('ready', () => {
        liveMeta.status = 'ONLINE';
        liveMeta.memoryMb = Number((process.memoryUsage().heapUsed / (1024 * 1024) * 0.4).toFixed(1));
        this._updateStatusInDb(id, 'ONLINE', null, liveMeta.memoryMb);
        this.applyInstancePresence(id, inst.config, inst.name);

        if (this.interBotBridge) {
          this.interBotBridge.registerBot({
            id,
            name: inst.name,
            client,
            context: liveMeta.childContext,
            isPrimary: false
          });
        }

        this.addInstanceLog(id, 'INFO', 'LIFECYCLE', `Instância conectada ao Discord como ${client.user?.tag || inst.name}.`);
        mbLogger.info(`Multi-Bot Instance "${inst.name}" (${client.user.tag}) is ONLINE.`);
      });

      await client.login(inst.token);
      return { success: true, id, status: 'ONLINE' };
    } catch (loginErr) {
      this.activeInstances.delete(id);
      this._updateStatusInDb(id, 'ERROR', loginErr.message);
      this.addInstanceLog(id, 'ERROR', 'AUTH', `Falha de login no Discord: ${loginErr.message}`);
      mbLogger.error(`Failed to start instance "${inst.name}": ${loginErr.message}`);
      throw new Error(`Falha ao conectar instância "${inst.name}": ${loginErr.message}`);
    }
  }

  /**
   * Stops a secondary bot instance cleanly.
   * @param {string} id
   */
  async stopInstance(id) {
    const live = this.activeInstances.get(id);
    if (live && live.client) {
      if (this.interBotBridge) {
        this.interBotBridge.unregisterBot(id);
      }
      try {
        await live.client.destroy();
      } catch (err) {
        mbLogger.warn(`Error while destroying client ${id}: ${err.message}`);
      }
      this.activeInstances.delete(id);
    }
    this._updateStatusInDb(id, 'STOPPED', null, 0);
    this.addInstanceLog(id, 'INFO', 'LIFECYCLE', 'Instância encerrada com segurança.');
    mbLogger.info(`Instance ${id} stopped.`);
    return { success: true, id, status: 'STOPPED' };
  }

  /**
   * Restarts an instance.
   * @param {string} id
   */
  async restartInstance(id) {
    this.addInstanceLog(id, 'INFO', 'LIFECYCLE', 'Reinicialização solicitada pelo administrador.');
    await this.stopInstance(id);
    return await this.startInstance(id);
  }

  /**
   * Boots all enabled secondary instances upon system bootstrap.
   */
  async startAllEnabledInstances() {
    const enabled = this.db.all('SELECT id, token FROM bot_instances WHERE is_enabled = 1') || [];
    for (const row of enabled) {
      if (!row.token || row.token.startsWith('mock_') || row.token.includes('SecretToken')) continue;
      try {
        await this.startInstance(row.id);
      } catch (err) {
        mbLogger.warn(`Auto-start skipped for secondary instance ${row.id}: ${err.message}`);
      }
    }
  }

  /**
   * Stops all secondary instances on bot shutdown.
   */
  async stopAllInstances() {
    for (const id of this.activeInstances.keys()) {
      await this.stopInstance(id);
    }
  }

  _updateStatusInDb(id, status, error = null, memoryMb = 0) {
    const now = new Date().toISOString();
    this.db.run(
      `UPDATE bot_instances 
       SET status = ?, last_error = ?, memory_mb = ?, updated_at = ?
       WHERE id = ?`,
      [status, error, memoryMb, now, id]
    );
  }
}

module.exports = {
  MultiBotManager,
  buildDefaultInstanceConfig
};
