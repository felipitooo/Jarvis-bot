const crypto = require('node:crypto');
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { logger } = require('../utils/logger');
const { ValidationError, PermissionDeniedError } = require('../utils/errorHandler');
const { dmTracker } = require('../utils/dmTracker');
const { MODULE_DEFINITIONS } = require('./guildModuleService');
const { dispatchGetModuleConfig, dispatchUpdateModuleConfig } = require('./panelModules');

const panelLogger = logger.forContext('WebPanelService');

class WebPanelService {
  /**
   * @param {object} params
   * @param {import('../database/repositories/webSessionRepository').WebSessionRepository} params.webSessionRepo
   * @param {import('./identityService').IdentityService} params.identityService
   * @param {import('./settingsService').SettingsService} params.settingsService
   * @param {import('./auditService').AuditService} [params.auditService]
   * @param {object} params.services
   */
  constructor({ webSessionRepo, identityService, settingsService, auditService = null, services = {}, botClient = null }) {
    this.webSessionRepo = webSessionRepo;
    this.identityService = identityService;
    this.settingsService = settingsService;
    this.auditService = auditService;
    this.services = {
      ...services,
      settingsService: services.settingsService || settingsService
    }; // ticketService, reviewService, communityService, etc.
    this.botClient = botClient;
  }

  setBotClient(client) {
    this.botClient = client;
  }

  // ==========================================
  // 1. Session & OAuth2 Management
  // ==========================================

  createOAuthSession(user, guilds = [], ttlSeconds = 86400) {
    const sessionToken = crypto.randomBytes(32).toString('hex');
    const csrfToken = crypto.randomBytes(24).toString('hex');

    const formattedGuilds = guilds.map(g => ({
      id: g.id,
      name: g.name,
      icon: g.icon,
      permissions: String(g.permissions || '0'),
      owner: Boolean(g.owner)
    }));

    const userData = {
      id: user.id,
      username: user.username,
      discriminator: user.discriminator || '0',
      avatar: user.avatar,
      guilds: formattedGuilds
    };

    return this.webSessionRepo.createSession(
      sessionToken,
      user.id,
      userData,
      csrfToken,
      ttlSeconds
    );
  }

  getSession(token) {
    return this.webSessionRepo.getSession(token);
  }

  destroySession(token) {
    return this.webSessionRepo.deleteSession(token);
  }

  validateCsrf(sessionToken, csrfToken) {
    return this.webSessionRepo.validateCsrf(sessionToken, csrfToken);
  }

  // ==========================================
  // 2. Authorization Checks
  // ==========================================

  canUserManageGuild(session, guildId) {
    if (!session || !session.userData) {
      return false;
    }

    if (session.userId === 'admin_local') {
      return true;
    }

    if (!Array.isArray(session.userData.guilds)) {
      return false;
    }

    const guild = session.userData.guilds.find(g => g.id === guildId);
    if (!guild) return false;

    if (guild.owner) return true;

    try {
      const perms = BigInt(guild.permissions);
      // 0x8 = ADMINISTRATOR, 0x20 = MANAGE_GUILD
      return (perms & 0x8n) !== 0n || (perms & 0x20n) !== 0n;
    } catch {
      return false;
    }
  }

  verifyGuildAccess(session, guildId) {
    if (!this.canUserManageGuild(session, guildId)) {
      throw new PermissionDeniedError('Você não possui permissão de gerenciamento (Manage Server) neste servidor.');
    }
    // Automatically ensure the guild exists in the guilds table to avoid FOREIGN KEY constraint failed
    const guildName = this.botClient?.guilds?.cache?.get(guildId)?.name || 'Servidor';
    if (this.services?.guildRepo) {
      try {
        this.services.guildRepo.upsertGuild({ id: guildId, name: guildName });
      } catch {}
    } else if (this.webSessionRepo?.db) {
      try {
        this.webSessionRepo.db.run(
          `INSERT OR IGNORE INTO guilds (id, name, joined_at) VALUES (?, ?, CURRENT_TIMESTAMP)`,
          [guildId, guildName]
        );
      } catch {}
    }
  }

  verifyCsrf(sessionToken, csrfToken, session = null) {
    // Local owner panel (127.0.0.1, unlocked with the panel PIN) tolerates a stale token after a restart;
    // every other session must present a valid CSRF token.
    if (session?.userId === 'admin_local') {
      if (csrfToken && typeof csrfToken === 'string' && csrfToken.length >= 8) {
        return true;
      }
    }
    if (!this.validateCsrf(sessionToken, csrfToken)) {
      throw new PermissionDeniedError('Token CSRF inválido ou expirado. Atualize a página e tente novamente.');
    }
  }

  // ==========================================
  // 3. Guild & Module Management Endpoints
  // ==========================================

  getUserManageableGuilds(session, botGuildsMap = new Map()) {
    if (!session || !session.userData) {
      return [];
    }

    if (session.userId === 'admin_local' && botGuildsMap.size > 0) {
      return Array.from(botGuildsMap.values()).map(g => ({
        id: g.id,
        name: g.name,
        icon: g.icon,
        iconUrl: g.iconURL ? g.iconURL({ extension: 'png', size: 128 }) : (g.icon ? `https://cdn.discordapp.com/icons/${g.id}/${g.icon}.png?size=128` : 'https://cdn.discordapp.com/embed/avatars/0.png'),
        isBotPresent: true,
        aiDisplayName: this.identityService.getDisplayName(g.id)
      }));
    }

    if (!Array.isArray(session.userData.guilds)) {
      return [];
    }

    return session.userData.guilds
      .filter(g => {
        if (g.owner) return true;
        try {
          const perms = BigInt(g.permissions);
          return (perms & 0x8n) !== 0n || (perms & 0x20n) !== 0n;
        } catch {
          return false;
        }
      })
      .map(g => ({
        id: g.id,
        name: g.name,
        icon: g.icon,
        iconUrl: g.icon ? `https://cdn.discordapp.com/icons/${g.id}/${g.icon}.png?size=128` : 'https://cdn.discordapp.com/embed/avatars/0.png',
        isBotPresent: botGuildsMap.has(g.id),
        aiDisplayName: this.identityService.getDisplayName(g.id)
      }));
  }

  _extractChannels(botGuild) {
    const channels = [];
    if (botGuild && botGuild.channels?.cache) {
      for (const [, ch] of botGuild.channels.cache) {
        if (ch.type === 0 || ch.type === 5) {
          channels.push({
            id: ch.id,
            name: ch.name,
            type: ch.type
          });
        }
      }
      channels.sort((a, b) => a.name.localeCompare(b.name));
    }
    return channels;
  }

  _extractRoles(botGuild) {
    const roles = [];
    if (botGuild && botGuild.roles?.cache) {
      for (const [, r] of botGuild.roles.cache) {
        if (r.name !== '@everyone' && !r.managed) {
          roles.push({
            id: r.id,
            name: r.name,
            color: r.hexColor
          });
        }
      }
      roles.sort((a, b) => a.name.localeCompare(b.name));
    }
    return roles;
  }

  getGuildOverview(session, guildId, botGuild = null, botId = null) {
    this.verifyGuildAccess(session, guildId);

    const mb = this.services.multiBotManager;
    const isSecondaryBot = Boolean(botId && botId !== 'PRIMARY' && botId !== 'MAIN');

    if (isSecondaryBot && mb) {
      const inst = mb.getInstance(botId);
      if (inst) {
        const cfg = inst.config || {};
        const live = mb.activeInstances?.get(botId);
        const effectiveGuild = (botGuild && (botGuild.memberCount || 0) > 0)
          ? botGuild
          : (live?.client?.guilds?.cache?.get(guildId) || this.botClient?.guilds?.cache?.get(guildId) || botGuild);
        const channels = this._extractChannels(effectiveGuild);
        const roles = this._extractRoles(effectiveGuild);
        const activeAiName = cfg.aiName || inst.name;
        const activePrefix = cfg.prefix || '+';
        const auditChan = cfg.audit?.channelId || cfg.moderation?.logChannelId || '';

        const resolvedAvatar = (typeof live?.client?.user?.displayAvatarURL === 'function')
          ? live.client.user.displayAvatarURL({ extension: 'png', size: 128 })
          : (inst.avatarUrl || inst.config?.theme?.avatarUrl || ('/api/bot/avatar?botId=' + encodeURIComponent(botId)));

        const guildIconUrl = effectiveGuild?.iconURL
          ? effectiveGuild.iconURL({ extension: 'png', size: 128 })
          : (effectiveGuild?.icon ? `https://cdn.discordapp.com/icons/${effectiveGuild.id}/${effectiveGuild.icon}.png?size=128` : 'https://cdn.discordapp.com/embed/avatars/0.png');

        let resolvedMemberCount = effectiveGuild?.memberCount || 0;
        if (resolvedMemberCount <= 0) {
          const altGuild = (botGuild && (botGuild.memberCount || 0) > 0)
            ? botGuild
            : (this.botClient?.guilds?.cache?.get(guildId) || null);
          if (altGuild && (altGuild.memberCount || 0) > 0) {
            resolvedMemberCount = altGuild.memberCount;
          }
        }

        return {
          guildId,
          guildName: effectiveGuild?.name || 'Servidor',
          memberCount: resolvedMemberCount,
          guildIconUrl,
          aiDisplayName: activeAiName,
          activeBotId: botId,
          activeBotName: activeAiName,
          prefix: activePrefix,
          serverPrefix: activePrefix,
          prefixlessMode: Boolean(cfg.commands?.prefixlessMode),
          botAvatarUrl: resolvedAvatar,
          channels,
          roles,
          settings: {
            ai_display_name: activeAiName,
            ai_channel_id: cfg.ai?.channelId || '',
            prefix: activePrefix,
            audit_channel_id: auditChan
          },
          modules: {
            serverPrefix: activePrefix,
            tickets: {
              transcriptChannelId: cfg.tickets?.transcriptChannelId || '',
              panelChannelId: cfg.tickets?.transcriptChannelId || '',
              panelTitle: cfg.tickets?.panelTitle || `🎫 Central de Atendimento — ${inst.name}`,
              panelDescription: cfg.tickets?.panelDescription || 'Clique no botão abaixo para abrir um canal de atendimento privado com nossa equipe.',
              maxOpenTicketsPerUser: cfg.tickets?.maxOpenTicketsPerUser || 1,
              defaultSupportRoleId: cfg.tickets?.defaultSupportRoleId || ''
            },
            moderation: {
              logChannelId: cfg.moderation?.logChannelId || auditChan || '',
              warnRules: (this.services.modRepo ? this.services.modRepo.getEscalationRules(guildId) : (cfg.moderation?.warnRules || [])),
              escalations: cfg.moderation?.escalations || [],
              antiSpamEnabled: cfg.moderation?.antiSpamEnabled ?? true,
              maxMessagesPerInterval: cfg.moderation?.maxMessagesPerInterval ?? 5,
              antiBotScamEnabled: cfg.moderation?.antiBotScamEnabled ?? true,
              antiBotScamAction: cfg.moderation?.antiBotScamAction || 'TIMEOUT',
              antiAbuse: {
                antiSpamEnabled: cfg.moderation?.antiSpamEnabled ?? true,
                maxMessagesPerInterval: cfg.moderation?.maxMessagesPerInterval ?? 5,
                intervalSeconds: cfg.moderation?.intervalSeconds ?? 5,
                antiFloodDuplicateThreshold: cfg.moderation?.antiFloodDuplicateThreshold ?? 3,
                actionOnDetection: cfg.moderation?.actionOnDetection || 'TIMEOUT',
                timeoutDurationMinutes: cfg.moderation?.timeoutDurationMinutes ?? 5,
                antiBotScamEnabled: cfg.moderation?.antiBotScamEnabled ?? true,
                antiBotScamAction: cfg.moderation?.antiBotScamAction || 'TIMEOUT'
              },
              antiBotScam: {
                enabled: cfg.moderation?.antiBotScamEnabled ?? true,
                action: cfg.moderation?.antiBotScamAction || 'TIMEOUT',
                timeoutDurationSeconds: cfg.moderation?.antiBotScamTimeoutSeconds || 86400
              }
            },
            audit: {
              channelId: auditChan
            },
            welcome: {
              channelId: cfg.social?.welcomeChannelId || '',
              welcomeChannelId: cfg.social?.welcomeChannelId || '',
              welcomeMessage: cfg.social?.welcomeMessage || 'Bem-vindo(a) {user} ao **{server}**! 🎉',
              welcomeMessageTemplate: cfg.social?.welcomeMessage || 'Bem-vindo(a) {user} ao **{server}**! 🎉',
              goodbyeChannelId: cfg.social?.goodbyeChannelId || '',
              goodbyeMessage: cfg.social?.goodbyeMessage || '**{username}** saiu do servidor.',
              welcomeEnabled: Boolean(cfg.social?.welcomeChannelId),
              goodbyeEnabled: Boolean(cfg.social?.goodbyeChannelId)
            },
            autorole: {
              roles: cfg.social?.autoRoleId ? [cfg.social.autoRoleId] : [],
              roleId: cfg.social?.autoRoleId || ''
            },
            starboard: {
              channelId: cfg.social?.starboardChannelId || '',
              starboardChannelId: cfg.social?.starboardChannelId || '',
              emoji: cfg.social?.starboardEmoji || '⭐',
              minStars: cfg.social?.starboardMinStars || 3,
              starsRequired: cfg.social?.starboardMinStars || 3
            },
            music: {
              allowedTextChannelId: cfg.music?.allowedChannelId || '',
              allowedVoiceChannelId: cfg.music?.allowedVoiceChannelId || '',
              defaultVolume: cfg.music?.defaultVolume ?? 80,
              maxQueueSize: cfg.music?.maxQueueSize ?? 50,
              allowDuplicateTracks: cfg.music?.allowDuplicateTracks ?? false,
              autoDisconnectMinutes: cfg.music?.autoDisconnectMinutes ?? 5,
              djRoleId: cfg.music?.djRoleId || '',
              ttsEnabled: cfg.music?.ttsEnabled ?? false,
              ttsLanguage: cfg.music?.ttsLanguage || 'pt-BR'
            },
            economy: {
              currencyName: cfg.economyXp?.currencyName || 'StarkCoins',
              currencySymbol: cfg.economyXp?.currencySymbol || '🪙',
              initialBalance: cfg.economyXp?.initialBalance ?? 100,
              bankStartingCapacity: cfg.economyXp?.bankCapacity ?? 5000,
              bankUnlimited: Boolean(cfg.economyXp?.bankUnlimited),
              dailyAmount: cfg.economyXp?.dailyAmount ?? 500,
              dailyCooldownSeconds: cfg.economyXp?.dailyCooldownSeconds ?? 86400,
              weeklyAmount: cfg.economyXp?.weeklyAmount ?? 2500,
              weeklyCooldownSeconds: cfg.economyXp?.weeklyCooldownSeconds ?? 604800,
              workMin: cfg.economyXp?.workMin ?? 50,
              workMax: cfg.economyXp?.workMax ?? 200,
              workCooldownSeconds: cfg.economyXp?.workCooldownSeconds ?? 3600,
              crimeMin: cfg.economyXp?.crimeMin ?? 100,
              crimeMax: cfg.economyXp?.crimeMax ?? 500,
              crimeCooldownSeconds: cfg.economyXp?.crimeCooldownSeconds ?? 7200,
              crimeSuccessRate: cfg.economyXp?.crimeSuccessRate ?? 0.45,
              slutMin: cfg.economyXp?.slutMin ?? 30,
              slutMax: cfg.economyXp?.slutMax ?? 150,
              slutCooldownSeconds: cfg.economyXp?.slutCooldownSeconds ?? 1800,
              slutSuccessRate: cfg.economyXp?.slutSuccessRate ?? 0.65,
              robCooldownSeconds: cfg.economyXp?.robCooldownSeconds ?? 14400,
              robSuccessRate: cfg.economyXp?.robSuccessRate ?? 0.35,
              robFinePercent: cfg.economyXp?.robFinePercent ?? 0.20,
              gambleMin: cfg.economyXp?.gambleMin ?? 10,
              gambleMax: cfg.economyXp?.gambleMax ?? 50000,
              gambleWinRate: cfg.economyXp?.gambleWinRate ?? 0.48,
              exchangeCurrencies: this.services.economyRepo ? this.services.economyRepo.listExchangeCurrencies(guildId, false) : [],
              companyTypes: this.services.economyRepo ? this.services.economyRepo.listCompanyTypes(guildId, false) : [],
              loanConfig: this.services.loanRepo ? this.services.loanRepo.getLoanConfig(guildId) : null
            },
            casino: {
              blackjackEnabled: cfg.economyXp?.blackjackEnabled ?? true,
              blackjackMin: cfg.economyXp?.blackjackMin ?? 10,
              blackjackMax: cfg.economyXp?.blackjackMax ?? 50000,
              blackjackPayout: cfg.economyXp?.blackjackPayout ?? 1.5,
              slotsEnabled: cfg.economyXp?.slotsEnabled ?? true,
              slotsMin: cfg.economyXp?.slotsMin ?? 10,
              slotsMax: cfg.economyXp?.slotsMax ?? 50000,
              slotsMultiplier3x: cfg.economyXp?.slotsMultiplier3x ?? 5,
              slotsMultiplier2x: cfg.economyXp?.slotsMultiplier2x ?? 2,
              rouletteEnabled: cfg.economyXp?.rouletteEnabled ?? true,
              rouletteMin: cfg.economyXp?.rouletteMin ?? 10,
              rouletteMax: cfg.economyXp?.rouletteMax ?? 50000,
              rouletteNumberPayout: cfg.economyXp?.rouletteNumberPayout ?? 35,
              rouletteColorPayout: cfg.economyXp?.rouletteColorPayout ?? 2,
              diceEnabled: cfg.economyXp?.diceEnabled ?? true,
              diceMin: cfg.economyXp?.diceMin ?? 10,
              diceMax: cfg.economyXp?.diceMax ?? 50000,
              diceMultiplier: cfg.economyXp?.diceMultiplier ?? 2,
              coinflipEnabled: cfg.economyXp?.coinflipEnabled ?? true,
              coinflipMin: cfg.economyXp?.coinflipMin ?? 10,
              coinflipMax: cfg.economyXp?.coinflipMax ?? 50000,
              coinflipWinRate: cfg.economyXp?.coinflipWinRate ?? 0.5
            },
            social: {
              marriageEnabled: cfg.social?.marriageEnabled ?? true,
              marriageCost: cfg.social?.marriageCost ?? 5000,
              shippingEnabled: cfg.social?.shippingEnabled ?? true,
              gifsEnabled: cfg.social?.gifsEnabled ?? true,
              funCommandsEnabled: cfg.social?.funCommandsEnabled ?? true
            },
            reviews: {
              channelId: cfg.reviews?.channelId || '',
              moderationEnabled: Boolean(cfg.reviews?.moderationEnabled),
              requireModeration: Boolean(cfg.reviews?.moderationEnabled)
            },
            briefing: {
              briefingEnabled: Boolean(cfg.automations?.briefingEnabled),
              briefingHourUtc: cfg.automations?.briefingHourUtc ?? 18,
              briefingChannelId: cfg.automations?.briefingChannelId || ''
            },
            xp: {
              xpRate: cfg.economyXp?.xpRate ?? 1,
              levelUpChannelId: cfg.economyXp?.levelUpChannelId || '',
              rewards: this.services.xpRepo ? this.services.xpRepo.getLevelRewards(guildId) : [],
              multipliers: this.services.xpRepo ? this.services.xpRepo.getMultipliersAndBlocks(guildId) : []
            },
            quiz: {
              rewardCoins: cfg.economyXp?.quizRewardCoins ?? 200,
              rewardXp: cfg.economyXp?.quizRewardXp ?? 50,
              defaultRounds: cfg.economyXp?.quizDefaultRounds ?? 5,
              defaultTimeoutSeconds: cfg.economyXp?.quizTimeoutSeconds ?? 25,
              allowedChannelId: cfg.economyXp?.quizAllowedChannelId || ''
            },
            customQuizQuestions: this.services.quizRepo ? this.services.quizRepo.getCustomQuestions(guildId) : [],
            quizCategories: this.services.quizService
              ? this.services.quizService.getAllCategories(guildId)
              : (this.services.quizRepo ? (new (require('./quizService').QuizService)({ quizRepo: this.services.quizRepo })).getAllCategories(guildId) : {}),
            allQuizQuestions: this.services.quizService
              ? this.services.quizService.getAllQuestions(guildId)
              : (this.services.quizRepo ? (new (require('./quizService').QuizService)({ quizRepo: this.services.quizRepo })).getAllQuestions(guildId) : []),
            customCommands: (this.services.customCommandRepo ? this.services.customCommandRepo.listCommands(guildId) : (cfg.commands?.customList || [])),
            placeholders: this.services.customCommandService ? this.services.customCommandService.getPlaceholdersDocumentation() : [],
            serverPrefix: activePrefix,
            prefixlessMode: Boolean(cfg.commands?.prefixlessMode),
            botPresence: {
              botStatus: cfg.presenceStatus || 'online',
              status: cfg.presenceStatus || 'online',
              activityType: cfg.presenceActivityType || 'Custom',
              activityName: cfg.presenceActivityText || '',
              activityText: cfg.presenceActivityText || '',
              activityUrl: cfg.presenceActivityUrl || ''
            },
            aiMemories: ((mb.listInstanceMemories ? mb.listInstanceMemories(botId, guildId) : (typeof mb.getInstanceMemories === 'function' ? mb.getInstanceMemories(botId) : [])) || []).map(m => ({
              id: m.id,
              key: m.key || m.memory_key,
              value: m.value || m.memory_value,
              created_by: m.created_by,
              updated_at: m.updated_at
            })),
            socialAlerts: (this.services.socialAlertRepo || this.services.socialAlertsRepo ? (this.services.socialAlertRepo || this.services.socialAlertsRepo).listAlerts(guildId) : []) || [],
            tempbans: this.services.modRepo ? this.services.modRepo.getActiveTempBans(guildId) : [],
            backups: this.services.backupSecurityService ? this.services.backupSecurityService.listBackups(guildId) : [],
            guildModules: {
              definitions: MODULE_DEFINITIONS,
              settings: cfg.modules || {}
            },
            multiBotInstances: mb.listInstances ? mb.listInstances() : []
          }
        };
      }
    }

    const aiName = this.identityService.getDisplayName(guildId);
    const settings = this.settingsService.getSettings(guildId);

    const channels = this._extractChannels(botGuild);
    const roles = this._extractRoles(botGuild);

    const {
      modRepo,
      ticketRepo,
      reviewRepo,
      communityRepo,
      automationRepo,
      musicVoiceRepo,
      economyRepo,
      xpRepo,
      botPresenceRepo
    } = this.services;
    const modLogChannel = modRepo ? modRepo.getLogChannel(guildId, 'PUNISHMENTS') : null;
    const autoRoles = communityRepo ? communityRepo.getAutoRoles(guildId) : [];
    const ticketPanels = ticketRepo ? ticketRepo.getPanels(guildId) : [];
    const latestPanel = ticketPanels.length > 0 ? ticketPanels[0] : null;
    const ticketCfg = ticketRepo ? ticketRepo.getTicketConfig(guildId) : {};

    const modules = {
      tickets: ticketRepo ? {
        ...ticketCfg,
        panelChannelId: latestPanel?.channelId || null,
        panelTitle: latestPanel?.title || '🎫 Central de Atendimento',
        panelDescription: latestPanel?.description || 'Clique no botão abaixo para abrir um canal de atendimento privado com nossa equipe.'
      } : null,
      reviews: reviewRepo ? reviewRepo.getReviewConfig(guildId) : null,
      welcome: communityRepo ? communityRepo.getWelcomeConfig(guildId) : null,
      autorole: {
        roles: autoRoles,
        roleId: autoRoles.length > 0 ? autoRoles[0] : ''
      },
      starboard: communityRepo ? communityRepo.getStarboardConfig(guildId) : null,
      briefing: automationRepo ? automationRepo.getBriefingConfig(guildId) : null,
      moderation: (() => {
        const ab = modRepo ? modRepo.getAntiAbuseConfig(guildId) : null;
        const isEnabled = ab
          ? (ab.antiBotScamEnabled !== undefined ? Boolean(ab.antiBotScamEnabled) : (ab.anti_bot_scam_enabled === 1 || ab.anti_bot_scam_enabled === true))
          : true;
        return {
          logChannelId: modLogChannel?.channel_id || null,
          warnRules: modRepo ? modRepo.getEscalationRules(guildId) : [],
          antiAbuse: ab,
          antiBotScam: {
            enabled: isEnabled,
            action: ab?.antiBotScamAction || ab?.anti_bot_scam_action || 'TIMEOUT',
            timeoutDurationSeconds: ab?.antiBotScamTimeoutSeconds || ab?.anti_bot_scam_timeout_seconds || 86400
          }
        };
      })(),
      audit: { channelId: settings.audit_channel_id || null },
      music: musicVoiceRepo ? musicVoiceRepo.getMusicConfig(guildId) : null,
      economy: economyRepo ? {
        ...economyRepo.getGuildConfig(guildId),
        exchangeCurrencies: economyRepo.listExchangeCurrencies(guildId, false),
        companyTypes: economyRepo.listCompanyTypes(guildId, false),
        loanConfig: this.services.loanRepo ? this.services.loanRepo.getLoanConfig(guildId) : null
      } : null,
      casino: this.services.casinoRepo ? this.services.casinoRepo.getCasinoConfig(guildId) : null,
      quiz: this.services.quizRepo ? this.services.quizRepo.getQuizConfig(guildId) : null,
      customQuizQuestions: this.services.quizRepo ? this.services.quizRepo.getCustomQuestions(guildId) : [],
      quizCategories: this.services.quizService
        ? this.services.quizService.getAllCategories(guildId)
        : (this.services.quizRepo ? (new (require('./quizService').QuizService)({ quizRepo: this.services.quizRepo })).getAllCategories(guildId) : {}),
      allQuizQuestions: this.services.quizService
        ? this.services.quizService.getAllQuestions(guildId)
        : (this.services.quizRepo ? (new (require('./quizService').QuizService)({ quizRepo: this.services.quizRepo })).getAllQuestions(guildId) : []),
      customCommands: this.services.customCommandRepo ? this.services.customCommandRepo.listCommands(guildId) : [],
      placeholders: this.services.customCommandService ? this.services.customCommandService.getPlaceholdersDocumentation() : [],
      serverPrefix: this.services.settingsService ? this.services.settingsService.getSetting(guildId, 'prefix', (require('../config/botConfig').botConfig.getConfig().identity?.defaultPrefix || '+')) : '+',
      prefixlessMode: this.services.settingsService ? (this.services.settingsService.getSetting(guildId, 'prefixless_mode', 'false') === 'true' || ['none', 'sem', 'nenhum', ''].includes(this.services.settingsService.getSetting(guildId, 'prefix', '+'))) : false,
      social: musicVoiceRepo ? musicVoiceRepo.getSocialConfig(guildId) : null,
      xp: xpRepo ? {
        ...xpRepo.getXpConfig(guildId),
        rewards: xpRepo.getLevelRewards(guildId),
        multipliers: xpRepo.getMultipliersAndBlocks(guildId)
      } : null,
      botPresence: botPresenceRepo ? botPresenceRepo.getPresence() : null,
      aiKeys: this.services.apiKeyRepo ? this.services.apiKeyRepo.getKeysStatus(this.services.llmAdapter) : null,
      aiMemories: this.services.memoryRepo ? this.services.memoryRepo.ensureDefaultBotMemories(guildId, botGuild?.name || 'Servidor') : [],
      customEmojis: require('../utils/emojiHelper').getGuildAndExternalEmojis(this.botClient, guildId),
      socialAlerts: this.services.socialAlertRepo ? this.services.socialAlertRepo.listAlerts(guildId) : [],
      backups: this.services.backupSecurityService ? this.services.backupSecurityService.listBackups(guildId) : [],
      guildModules: this.services.guildModuleService ? {
        definitions: this.services.guildModuleService.getAllModuleDefinitions(guildId),
        settings: this.services.guildModuleService.getGuildModules(guildId)
      } : { definitions: [], settings: {} },
      tempbans: modRepo ? modRepo.getActiveTempBans(guildId) : [],
      channelSummaries: this.listChannelSummaries(session, guildId, 15),
      multiBotInstances: this.services.multiBotManager ? this.services.multiBotManager.listInstances() : []
    };

    const guildIconUrl = botGuild?.iconURL
      ? botGuild.iconURL({ extension: 'png', size: 128 })
      : (botGuild?.icon ? `https://cdn.discordapp.com/icons/${botGuild.id}/${botGuild.icon}.png?size=128` : 'https://cdn.discordapp.com/embed/avatars/0.png');

    return {
      guildId,
      guildName: botGuild?.name || 'Servidor Principal',
      memberCount: botGuild?.memberCount || 0,
      guildIconUrl,
      botAvatarUrl: this.botClient?.user?.displayAvatarURL ? this.botClient.user.displayAvatarURL({ extension: 'png', size: 128 }) : 'https://cdn.discordapp.com/embed/avatars/0.png',
      aiDisplayName: aiName,
      isDefaultAiName: aiName === this.identityService.getDefaultName(),
      settings,
      channels,
      roles,
      modules
    };
  }

  updateGuildSettings(session, guildId, updates, csrfToken, botId = null) {
    this.verifyGuildAccess(session, guildId);
    this.verifyCsrf(session.token, csrfToken, session);

    const mb = this.services.multiBotManager;
    const isSecondaryBot = Boolean(botId && botId !== 'PRIMARY' && botId !== 'MAIN');

    if (isSecondaryBot && mb) {
      const inst = mb.getInstance(botId);
      if (!inst) {
        throw new ValidationError(`Instância de bot "${botId}" não encontrada.`);
      }

      const cfg = { ...(inst.config || {}) };
      let instanceName = inst.name;

      if (updates.aiDisplayName !== undefined || updates.name !== undefined) {
        const cleanName = String(updates.aiDisplayName ?? updates.name).trim();
        if (cleanName) {
          instanceName = cleanName;
          cfg.aiName = cleanName;
        }
      }

      if (updates.prefix !== undefined) {
        cfg.prefix = String(updates.prefix).trim() || '+';
        if (!cfg.commands) cfg.commands = {};
        cfg.commands.prefix = cfg.prefix;
      }

      if (updates.prefixlessMode !== undefined) {
        if (!cfg.commands) cfg.commands = {};
        cfg.commands.prefixlessMode = Boolean(updates.prefixlessMode);
      }

      if (updates.aiChannelId !== undefined) {
        if (!cfg.ai) cfg.ai = {};
        cfg.ai.channelId = updates.aiChannelId || '';
      }

      mb.updateInstance(inst.id, { name: instanceName, config: cfg });

      if (this.auditService) {
        this.auditService.logAction({
          guildId,
          userId: session.userId,
          action: 'WEB_PANEL_SETTINGS_UPDATE',
          targetId: guildId,
          details: { ...updates, botId: inst.id, botName: instanceName }
        });
      }

      return {
        status: 'success',
        botId: inst.id,
        aiDisplayName: cfg.aiName || instanceName,
        settings: {
          ai_display_name: cfg.aiName || instanceName,
          ai_channel_id: cfg.ai?.channelId || '',
          prefix: cfg.prefix || '+',
          prefixless_mode: cfg.commands?.prefixlessMode ? 'true' : 'false'
        }
      };
    }

    if (updates.aiDisplayName !== undefined) {
      const cleanName = String(updates.aiDisplayName).trim();
      this.identityService.setDisplayName(guildId, cleanName, session.userId);
    }

    if (updates.aiChannelId !== undefined) {
      this.settingsService.setSetting(guildId, 'ai_channel_id', updates.aiChannelId || '', session.userId);
    }

    if (updates.prefix !== undefined) {
      const cleanPrefix = String(updates.prefix).trim();
      this.settingsService.setSetting(guildId, 'prefix', cleanPrefix || '+', session.userId);
    }

    if (updates.prefixlessMode !== undefined) {
      this.settingsService.setSetting(guildId, 'prefixless_mode', updates.prefixlessMode ? 'true' : 'false', session.userId);
    }

    if (this.auditService) {
      this.auditService.logAction({
        guildId,
        userId: session.userId,
        action: 'WEB_PANEL_SETTINGS_UPDATE',
        targetId: guildId,
        details: updates
      });
    }

    return {
      status: 'success',
      aiDisplayName: this.identityService.getDisplayName(guildId),
      settings: this.settingsService.getSettings(guildId)
    };
  }

  async getGuildEmojis(session, guildId) {
    let resolvedGuildId = (guildId && guildId !== 'current') ? guildId : null;
    if (!resolvedGuildId && this.botClient?.guilds?.cache?.size > 0) {
      resolvedGuildId = this.botClient.guilds.cache.first().id;
    }
    if (resolvedGuildId) {
      try {
        this.verifyGuildAccess(session, resolvedGuildId);
      } catch {}
    }
    const { getGuildAndExternalEmojis } = require('../utils/emojiHelper');
    return await getGuildAndExternalEmojis(this.botClient, resolvedGuildId, this.services?.multiBotManager);
  }

  getModuleConfig(session, guildId, moduleName, botId = null) {
    this.verifyGuildAccess(session, guildId);

    const mod = moduleName.toLowerCase().trim();
    const mb = this.services.multiBotManager;
    const isSecondaryBot = Boolean(botId && botId !== 'PRIMARY' && botId !== 'MAIN');
    const inst = (isSecondaryBot && mb) ? mb.getInstance(botId) : null;
    const cfg = inst ? (inst.config || {}) : {};

    if (isSecondaryBot && mb && !inst) {
      return null;
    }

    const ctx = {
      mod,
      moduleName,
      guildId,
      botId,
      isSecondaryBot,
      inst,
      cfg,
      mb,
      session,
      services: this.services,
      botClient: this.botClient,
      settingsService: this.settingsService,
      auditService: this.auditService,
      panelService: this
    };

    return dispatchGetModuleConfig(ctx);
  }

  async updateModuleConfig(session, guildId, moduleName, updates, csrfToken, botId = null) {
    this.verifyGuildAccess(session, guildId);
    this.verifyCsrf(session.token, csrfToken, session);

    const mod = moduleName.toLowerCase().trim();
    const mb = this.services.multiBotManager;
    const isSecondaryBot = Boolean(botId && botId !== 'PRIMARY' && botId !== 'MAIN');

    let inst = null;
    let cfg = {};
    if (isSecondaryBot && mb) {
      inst = mb.getInstance(botId);
      if (!inst) {
        throw new ValidationError(`Instância de bot "${botId}" não encontrada.`);
      }
      cfg = { ...(inst.config || {}) };
    }

    const ctx = {
      mod,
      moduleName,
      guildId,
      botId,
      isSecondaryBot,
      inst,
      cfg,
      mb,
      updates,
      session,
      services: this.services,
      botClient: this.botClient,
      settingsService: this.settingsService,
      auditService: this.auditService,
      panelService: this
    };

    const updated = await dispatchUpdateModuleConfig(ctx);

    if (isSecondaryBot) {
      if (updated && typeof updated === 'object' && updated.module) {
        return updated;
      }
      return { module: mod, config: updated };
    }

    if (this.auditService) {
      this.auditService.logAction({
        guildId,
        userId: session.userId,
        action: `WEB_PANEL_MODULE_UPDATE_${mod.toUpperCase()}`,
        targetId: guildId,
        details: updates
      });
    }

    return { status: 'success', module: mod, config: updated };
  }

  getGuildAuditLogs(session, guildId, limit = 20, botId = null) {
    this.verifyGuildAccess(session, guildId);
    if (!this.auditService) return [];
    const numLimit = parseInt(limit, 10) || 20;
    let rawLogs = [];
    if (typeof this.auditService.getRecentLogs === 'function') {
      rawLogs = this.auditService.getRecentLogs(guildId, numLimit * 2);
    } else if (typeof this.auditService.getLogs === 'function') {
      rawLogs = this.auditService.getLogs({ guildId, limit: numLimit * 2 });
    }

    const mapped = (rawLogs || []).map(entry => {
      let detailsObj = entry.details;
      if (typeof detailsObj === 'string') {
        try {
          detailsObj = JSON.parse(detailsObj);
        } catch {
          // keep as string
        }
      }
      return {
        id: entry.id,
        guildId: entry.guild_id || entry.guildId,
        actorId: entry.actor_id || entry.actorId || 'Painel Web / Sistema',
        action: entry.action,
        targetId: entry.target_id || entry.targetId,
        details: detailsObj,
        botInstanceId: entry.bot_instance_id || entry.botInstanceId || detailsObj?.botId || detailsObj?.botInstanceId || null,
        createdAt: entry.created_at || entry.createdAt || new Date().toISOString()
      };
    });

    if (botId && botId !== 'PRIMARY' && botId !== 'MAIN') {
      const filtered = mapped.filter(l => l.botInstanceId === botId || (l.details && (l.details.botId === botId || l.details.botInstanceId === botId)));
      return filtered.length > 0 ? filtered.slice(0, numLimit) : mapped.slice(0, numLimit);
    }

    return mapped.slice(0, numLimit);
  }

  // ==========================================
  // Member & User Management (Universal Suite)
  // ==========================================

  async getGuildMembers(session, guildId, botGuild = null) {
    this.verifyGuildAccess(session, guildId);

    const guild = botGuild || (this.botClient?.guilds?.cache?.get(guildId)) || null;
    let rawMembers = [];

    if (guild?.members) {
      try {
        if (typeof guild.members.fetch === 'function') {
          const fetched = await guild.members.fetch({ limit: 1000 }).catch(() => null);
          if (fetched && fetched.size > 0) {
            rawMembers = Array.from(fetched.values());
          }
        }
      } catch {}

      if (rawMembers.length === 0 && guild.members.cache) {
        rawMembers = Array.from(guild.members.cache.values());
      }
    }

    // Fallback if headless / mocked environment
    if (rawMembers.length === 0 && this.services.economyRepo?.db) {
      try {
        const accounts = this.services.economyRepo.db.all(
          `SELECT DISTINCT user_id FROM economy_accounts WHERE guild_id = ?`,
          [guildId]
        ) || [];
        for (const acc of accounts) {
          rawMembers.push({
            id: acc.user_id,
            user: { id: acc.user_id, username: `Membro_${acc.user_id.slice(-4)}` },
            displayName: `Membro_${acc.user_id.slice(-4)}`,
            roles: { cache: new Map() }
          });
        }
      } catch {}
    }

    const { economyRepo, xpRepo, modRepo, memoryRepo } = this.services;

    const membersList = rawMembers.map(member => {
      const u = member.user || { id: member.id, username: member.displayName || 'Usuário' };
      const userId = member.id || u.id;

      // Economy
      const acc = economyRepo ? economyRepo.getOrCreateAccount(guildId, userId) : { walletBalance: 0, bankBalance: 0 };
      const walletBalance = acc.walletBalance || 0;
      const bankBalance = acc.bankBalance || 0;
      const isIndebted = walletBalance < 0;

      // XP & Level
      const xpData = xpRepo ? xpRepo.getMemberXp(guildId, userId) : { totalXp: 0, level: 0, currentLevel: 0 };
      let memberLevel = Number(xpData.level ?? xpData.currentLevel ?? 0);
      if (memberLevel <= 0 && (xpData.totalXp || 0) > 0) {
        try {
          const { progressionFormulaService } = require('./progressionFormulaService');
          const config = xpRepo?.getXpConfig ? xpRepo.getXpConfig(guildId) : {};
          memberLevel = progressionFormulaService.calculateLevelFromXp(xpData.totalXp, config);
        } catch {}
      }

      // Moderation
      const warns = modRepo?.getMemberWarns ? modRepo.getMemberWarns(guildId, userId) : [];
      const activeWarns = warns.filter(w => w.is_active === 1).length;

      // AI User Memories
      const memories = memoryRepo?.listUserMemories ? memoryRepo.listUserMemories(guildId, userId) : [];

      // Roles
      const roles = [];
      if (member.roles?.cache) {
        for (const [, role] of member.roles.cache) {
          if (guild && role.id === guild.id) continue;
          roles.push({
            id: role.id,
            name: role.name,
            color: role.hexColor || '#99aab5',
            position: role.position || 0
          });
        }
      }
      roles.sort((a, b) => b.position - a.position);

      const isOwner = guild ? guild.ownerId === userId : false;
      const isBot = Boolean(u.bot);
      const isTimedOut = Boolean(member.communicationDisabledUntilTimestamp && member.communicationDisabledUntilTimestamp > Date.now());
      const timeoutUntil = member.communicationDisabledUntilTimestamp ? new Date(member.communicationDisabledUntilTimestamp).toISOString() : null;

      const avatarUrl = u.displayAvatarURL
        ? u.displayAvatarURL({ extension: 'png', size: 64 })
        : (u.avatar ? `https://cdn.discordapp.com/avatars/${u.id}/${u.avatar}.png` : 'https://cdn.discordapp.com/embed/avatars/0.png');

      return {
        id: userId,
        username: u.username || 'Desconhecido',
        displayName: member.displayName || u.globalName || u.username || 'Membro',
        avatarUrl,
        isOwner,
        isBot,
        isTimedOut,
        timeoutUntil,
        roles,
        economy: {
          walletBalance,
          bankBalance,
          netWorth: walletBalance + bankBalance,
          isIndebted
        },
        xp: {
          totalXp: xpData.totalXp || 0,
          level: memberLevel,
          currentLevel: memberLevel
        },
        moderation: {
          activeWarns,
          totalWarns: warns.length
        },
        memoryCount: memories.length,
        dmSession: dmTracker.getSession(userId, guildId) ? {
          status: dmTracker.getSession(userId, guildId).status,
          repliesCount: dmTracker.getSession(userId, guildId).replies?.length || 0,
          sentText: dmTracker.getSession(userId, guildId).sentText,
          sentAt: dmTracker.getSession(userId, guildId).sentAt
        } : null
      };
    });

    // Sort: Owner first, then by net worth descending
    membersList.sort((a, b) => {
      if (a.isOwner) return -1;
      if (b.isOwner) return 1;
      return (b.economy.netWorth || 0) - (a.economy.netWorth || 0);
    });

    // Server roles for management
    const guildRoles = [];
    if (guild?.roles?.cache) {
      for (const [, role] of guild.roles.cache) {
        if (role.id === guild.id || role.managed) continue;
        guildRoles.push({
          id: role.id,
          name: role.name,
          color: role.hexColor || '#99aab5',
          position: role.position || 0
        });
      }
      guildRoles.sort((a, b) => b.position - a.position);
    }

    return {
      totalMembers: membersList.length,
      members: membersList,
      guildRoles
    };
  }

  async getMemberDetails(session, guildId, userId, botGuild = null, botId = null) {
    this.verifyGuildAccess(session, guildId);
    const { memoryRepo, modRepo, economyRepo, xpRepo } = this.services;

    const guild = botGuild || (this.botClient?.guilds?.cache?.get(guildId)) || null;
    let member = null;
    if (guild?.members) {
      try {
        member = await guild.members.fetch(userId).catch(() => null);
      } catch {}
      if (!member && guild.members.cache) {
        member = guild.members.cache.get(userId) || null;
      }
    }

    const u = member?.user || { id: userId, username: `user_${userId}` };
    const acc = economyRepo ? economyRepo.getOrCreateAccount(guildId, userId) : { walletBalance: 0, bankBalance: 0 };
    const xpData = xpRepo ? xpRepo.getMemberXp(guildId, userId) : { totalXp: 0, level: 0, currentLevel: 0 };
    let memberLevel = Number(xpData.level ?? xpData.currentLevel ?? 0);
    if (memberLevel <= 0 && (xpData.totalXp || 0) > 0) {
      try {
        const { progressionFormulaService } = require('./progressionFormulaService');
        const config = xpRepo?.getXpConfig ? xpRepo.getXpConfig(guildId) : {};
        memberLevel = progressionFormulaService.calculateLevelFromXp(xpData.totalXp, config);
      } catch {}
    }
    const warns = modRepo?.getMemberWarns ? modRepo.getMemberWarns(guildId, userId) : [];
    const memories = memoryRepo?.listUserMemories ? memoryRepo.listUserMemories(guildId, userId) : [];
    const dmSession = dmTracker.getSession(userId, guildId, botId);

    const roles = [];
    if (member?.roles?.cache) {
      for (const [, role] of member.roles.cache) {
        if (guild && role.id === guild.id) continue;
        roles.push({
          id: role.id,
          name: role.name,
          color: role.hexColor || '#99aab5',
          position: role.position || 0
        });
      }
      roles.sort((a, b) => b.position - a.position);
    }

    return {
      member: {
        id: userId,
        username: u.username || 'Desconhecido',
        displayName: member?.displayName || u.globalName || u.username || 'Membro',
        avatarUrl: u.displayAvatarURL ? u.displayAvatarURL({ extension: 'png', size: 128 }) : 'https://cdn.discordapp.com/embed/avatars/0.png',
        isOwner: guild ? guild.ownerId === userId : false,
        isBot: Boolean(u.bot),
        isTimedOut: Boolean(member?.communicationDisabledUntilTimestamp && member.communicationDisabledUntilTimestamp > Date.now()),
        timeoutUntil: member?.communicationDisabledUntilTimestamp ? new Date(member.communicationDisabledUntilTimestamp).toISOString() : null,
        roles,
        economy: {
          walletBalance: acc.walletBalance || 0,
          bankBalance: acc.bankBalance || 0,
          isIndebted: (acc.walletBalance || 0) < 0
        },
        xp: {
          totalXp: xpData.totalXp || 0,
          level: memberLevel,
          currentLevel: memberLevel
        }
      },
      warns,
      memories,
      dmSession
    };
  }

  async executeMemberAction(session, guildId, userId, actionData, csrfToken, botGuild = null) {
    this.verifyGuildAccess(session, guildId);
    this.verifyCsrf(session.token, csrfToken, session);

    if (!userId) {
      throw new ValidationError('userId é obrigatório.');
    }

    const guild = botGuild || (this.botClient?.guilds?.cache?.get(guildId)) || null;
    let targetMember = null;
    let targetUser = null;

    if (guild?.members) {
      try {
        targetMember = await guild.members.fetch(userId).catch(() => null);
      } catch {}
      if (!targetMember && guild.members.cache) {
        targetMember = guild.members.cache.get(userId) || null;
      }
    }
    targetUser = targetMember?.user || null;
    if (!targetUser && this.botClient?.users) {
      try {
        targetUser = await this.botClient.users.fetch(userId).catch(() => null);
      } catch {}
    }

    const { action } = actionData || {};
    const {
      economyRepo,
      economyService,
      moderationService,
      modRepo,
      experienceService,
      xpRepo,
      memoryRepo
    } = this.services;

    switch (action) {
      case 'ECONOMY': {
        const { field = 'wallet', type = 'add', amount = 0, reason = 'Ajuste via Painel Web' } = actionData;
        const targetField = field.toLowerCase() === 'bank' ? 'bank' : 'wallet';

        if (type === 'clear_debt') {
          const acc = economyRepo.getOrCreateAccount(guildId, userId);
          const newWallet = Math.max(0, acc.walletBalance);
          const newBank = Math.max(0, acc.bankBalance);
          const updated = economyRepo.updateBalances(guildId, userId, {
            walletBalance: newWallet,
            bankBalance: newBank
          });
          if (this.auditService) {
            this.auditService.logAction({
              guildId,
              userId: session.userId,
              action: 'ECONOMY_ADMIN_CLEAR_DEBT',
              targetId: userId,
              details: { reason, walletAfter: updated.walletBalance, bankAfter: updated.bankBalance }
            });
          }
          return { status: 'success', action, account: updated, message: 'Dívida zerada com sucesso!' };
        }

        const validTypes = ['add', 'remove', 'set'];
        if (!validTypes.includes(type)) {
          throw new ValidationError('Tipo de operação financeira inválido. Use "add", "remove", "set" ou "clear_debt".');
        }

        if (economyService && typeof economyService.adminAdjust === 'function') {
          const updated = economyService.adminAdjust(
            guildId,
            userId,
            targetField,
            type,
            amount,
            session.userId,
            reason
          );
          return { status: 'success', action, account: updated, message: 'Ajuste de saldo efetuado com sucesso!' };
        } else if (economyRepo) {
          const acc = economyRepo.getOrCreateAccount(guildId, userId);
          let newWallet = acc.walletBalance;
          let newBank = acc.bankBalance;
          const num = parseInt(amount, 10) || 0;
          if (targetField === 'wallet') {
            if (type === 'add') newWallet += num;
            else if (type === 'remove') newWallet = Math.max(0, newWallet - num);
            else if (type === 'set') newWallet = num;
          } else {
            if (type === 'add') newBank += num;
            else if (type === 'remove') newBank = Math.max(0, newBank - num);
            else if (type === 'set') newBank = num;
          }
          const updated = economyRepo.updateBalances(guildId, userId, { walletBalance: newWallet, bankBalance: newBank });
          return { status: 'success', action, account: updated, message: 'Ajuste financeiro gravado com sucesso!' };
        }
        throw new ValidationError('Serviço de economia indisponível.');
      }

      case 'TIMEOUT': {
        const { durationSeconds = 300, reason = 'Timeout aplicado pelo painel web.' } = actionData;
        const durSec = parseInt(durationSeconds, 10);

        if (targetMember && typeof targetMember.timeout === 'function') {
          if (durSec <= 0) {
            await targetMember.timeout(null, reason);
            if (modRepo?.recordPunishment) {
              modRepo.recordPunishment({
                guildId,
                targetId: userId,
                moderatorId: session.userId,
                type: 'UNTIMEOUT',
                reason
              });
            }
            return { status: 'success', action, message: 'Silenciamento (Timeout) removido com sucesso!' };
          } else {
            const durMs = durSec * 1000;
            await targetMember.timeout(durMs, reason);
            if (modRepo?.recordPunishment) {
              modRepo.recordPunishment({
                guildId,
                targetId: userId,
                moderatorId: session.userId,
                type: 'TIMEOUT',
                reason,
                durationSeconds: durSec
              });
            }
            return { status: 'success', action, message: `Membro silenciado por ${durSec} segundos com sucesso!` };
          }
        }
        if (modRepo?.recordPunishment) {
          modRepo.recordPunishment({
            guildId,
            targetId: userId,
            moderatorId: session.userId,
            type: durSec <= 0 ? 'UNTIMEOUT' : 'TIMEOUT',
            reason,
            durationSeconds: Math.max(0, durSec)
          });
        }
        return { status: 'success', action, message: durSec <= 0 ? 'Timeout removido com sucesso!' : `Timeout de ${durSec}s registrado.` };
      }

      case 'WARN': {
        const { reason = 'Warn oficial aplicado pelo painel web.' } = actionData;
        if (modRepo?.recordPunishment) {
          modRepo.recordPunishment({
            guildId,
            targetId: userId,
            moderatorId: session.userId,
            type: 'WARN',
            reason
          });
        }
        if (this.auditService) {
          this.auditService.logAction({
            guildId,
            userId: session.userId,
            action: 'MEMBER_WARNED',
            targetId: userId,
            details: { reason }
          });
        }
        if (targetUser?.send) {
          try {
            await targetUser.send(`⚠️ **Você recebeu um Warn oficial (strike) no servidor.**\n**Motivo:** ${reason}`);
          } catch {}
        }
        const activeWarns = modRepo?.getMemberWarns ? modRepo.getMemberWarns(guildId, userId).filter(w => w.is_active === 1).length : 1;
        return { status: 'success', action, activeWarns, message: `Warn oficial aplicado com sucesso! (Total de warns ativos: ${activeWarns})` };
      }

      case 'VERBAL_WARN': {
        const { reason = 'Advertência verbal aplicada pela moderação.', rule = '' } = actionData;
        let dmSent = false;
        if (targetUser?.send) {
          try {
            const ruleText = rule ? `\n📜 **Diretriz de Referência:** ${rule}` : '';
            await targetUser.send(
              `📢 **Advertência Verbal da Moderação**\n` +
              `Olá, ${targetUser.username}. Você está recebendo uma **advertência verbal educativa** da moderação.\n\n` +
              `📝 **Motivo:** ${reason}${ruleText}\n\n` +
              `ℹ️ *Nota: Este é um aviso orientativo para alinhamento de conduta e NÃO contabiliza strike de warn no sistema de punições automáticas.*`
            );
            dmSent = true;
          } catch {}
        }
        if (this.auditService) {
          this.auditService.logAction({
            guildId,
            userId: session.userId,
            action: 'MEMBER_VERBAL_WARNED',
            targetId: userId,
            details: { reason, rule, dmSent }
          });
        }
        return {
          status: 'success',
          action,
          dmSent,
          message: dmSent
            ? `Advertência verbal enviada com sucesso no privado do membro!`
            : `Advertência verbal registrada na auditoria (a DM do membro está bloqueada/fechada).`
        };
      }

      case 'CLEAR_WARNS': {
        if (modRepo?.clearWarns) {
          modRepo.clearWarns(guildId, userId);
        }
        if (this.auditService) {
          this.auditService.logAction({
            guildId,
            userId: session.userId,
            action: 'MEMBER_WARNS_CLEARED',
            targetId: userId,
            details: { reason: 'Limpeza de warns via painel web' }
          });
        }
        return { status: 'success', action, message: 'Todas as advertências do membro foram limpas com sucesso!' };
      }

      case 'KICK': {
        const { reason = 'Expulso pelo painel web.' } = actionData;
        if (targetUser?.send) {
          try {
            await targetUser.send(`👢 **Você foi expulso do servidor.**\n**Motivo:** ${reason}`);
          } catch {}
        }
        if (targetMember && typeof targetMember.kick === 'function') {
          await targetMember.kick(reason);
        }
        if (modRepo?.recordPunishment) {
          modRepo.recordPunishment({
            guildId,
            targetId: userId,
            moderatorId: session.userId,
            type: 'KICK',
            reason
          });
        }
        if (this.auditService) {
          this.auditService.logAction({
            guildId,
            userId: session.userId,
            action: 'MEMBER_KICKED',
            targetId: userId,
            details: { reason }
          });
        }
        return { status: 'success', action, message: 'Membro expulso do servidor com sucesso!' };
      }

      case 'BAN': {
        const { reason = 'Banido pelo painel web.', deleteMessageDays = 0 } = actionData;
        if (targetUser?.send) {
          try {
            await targetUser.send(`🔨 **Você foi banido do servidor.**\n**Motivo:** ${reason}`);
          } catch {}
        }
        if (guild?.bans && typeof guild.bans.create === 'function') {
          await guild.bans.create(userId, {
            reason,
            deleteMessageSeconds: (parseInt(deleteMessageDays, 10) || 0) * 86400
          });
        } else if (guild?.members?.ban) {
          await guild.members.ban(userId, { reason });
        }
        if (modRepo?.recordPunishment) {
          modRepo.recordPunishment({
            guildId,
            targetId: userId,
            moderatorId: session.userId,
            type: 'BAN',
            reason
          });
        }
        if (this.auditService) {
          this.auditService.logAction({
            guildId,
            userId: session.userId,
            action: 'MEMBER_BANNED',
            targetId: userId,
            details: { reason, deleteMessageDays }
          });
        }
        return { status: 'success', action, message: 'Membro banido do servidor com sucesso!' };
      }

      case 'ROLE': {
        const { roleId, operation = 'add' } = actionData;
        if (!roleId) throw new ValidationError('roleId é obrigatório para modificar cargos.');

        if (targetMember && targetMember.roles) {
          if (operation === 'add') {
            await targetMember.roles.add(roleId);
          } else if (operation === 'remove') {
            await targetMember.roles.remove(roleId);
          }
        }
        if (this.auditService) {
          this.auditService.logAction({
            guildId,
            userId: session.userId,
            action: operation === 'add' ? 'ROLE_ASSIGN' : 'ROLE_REMOVE',
            targetId: userId,
            details: { roleId, operation }
          });
        }
        return { status: 'success', action, roleId, operation, message: `Cargo ${operation === 'add' ? 'adicionado' : 'removido'} com sucesso!` };
      }

      case 'XP': {
        const { type = 'set_level', level = 0, xp = 0, amount = 0 } = actionData;
        if (experienceService && targetMember) {
          if (type === 'set_level') {
            experienceService.setManualXp(guild, session.userId, targetMember, level, null);
          } else if (type === 'set_xp') {
            experienceService.setManualXp(guild, session.userId, targetMember, null, xp);
          } else if (type === 'add_xp') {
            experienceService.addManualXp(guild, session.userId, targetMember, amount);
          } else if (type === 'reset') {
            experienceService.resetMember(guildId, userId, session.userId);
          }
        } else if (xpRepo) {
          if (type === 'reset') {
            xpRepo.resetMemberXp(guildId, userId);
          } else if (type === 'set_level') {
            const numLevel = parseInt(level, 10) || 0;
            xpRepo.setMemberXp(guildId, userId, numLevel * 100, numLevel);
          } else if (type === 'set_xp') {
            const numXp = parseInt(xp, 10) || 0;
            const approxLevel = Math.floor(numXp / 100);
            xpRepo.setMemberXp(guildId, userId, numXp, approxLevel);
          } else if (type === 'add_xp') {
            const current = xpRepo.getMemberXp(guildId, userId);
            const numAmount = parseInt(amount, 10) || 0;
            const newXp = Math.max(0, current.totalXp + numAmount);
            const newLevel = Math.floor(newXp / 100);
            xpRepo.setMemberXp(guildId, userId, newXp, newLevel);
          }
        }
        const rawXp = xpRepo?.getMemberXp(guildId, userId) || { totalXp: 0, level: 0, currentLevel: 0 };
        let updatedLvl = Number(rawXp.level ?? rawXp.currentLevel ?? 0);
        if (updatedLvl <= 0 && (rawXp.totalXp || 0) > 0) {
          try {
            const { progressionFormulaService } = require('./progressionFormulaService');
            const config = xpRepo?.getXpConfig ? xpRepo.getXpConfig(guildId) : {};
            updatedLvl = progressionFormulaService.calculateLevelFromXp(rawXp.totalXp, config);
          } catch {}
        }
        const updatedXp = {
          totalXp: rawXp.totalXp || 0,
          level: updatedLvl,
          currentLevel: updatedLvl
        };
        return { status: 'success', action, xp: updatedXp, message: 'Nível e XP atualizados com sucesso!' };
      }

      case 'SAVE_MEMORY': {
        const { key, value } = actionData;
        if (!key || !value) throw new ValidationError('Chave e valor são obrigatórios para gravar memória da IA.');
        if (!memoryRepo) throw new ValidationError('Repositório de memória indisponível.');

        const saved = memoryRepo.saveUserMemory({
          guildId,
          userId,
          key: key.toLowerCase().trim(),
          value: value.trim()
        });

        if (this.auditService) {
          this.auditService.logAction({
            guildId,
            userId: session.userId,
            action: 'AI_USER_MEMORY_SAVED',
            targetId: userId,
            details: { key, value }
          });
        }
        const memories = memoryRepo.listUserMemories(guildId, userId);
        return { status: 'success', action, memory: saved, memories, message: `Memória "${key}" gravada com sucesso no cérebro da IA para este usuário!` };
      }

      case 'DELETE_MEMORY': {
        const { key } = actionData;
        if (!key) throw new ValidationError('Chave é obrigatória para excluir memória.');
        if (!memoryRepo) throw new ValidationError('Repositório de memória indisponível.');

        memoryRepo.deleteUserMemory(guildId, userId, key.toLowerCase().trim());
        const memories = memoryRepo.listUserMemories(guildId, userId);
        return { status: 'success', action, memories, message: `Memória "${key}" excluída com sucesso!` };
      }

      case 'GET_MEMORIES': {
        const memories = memoryRepo ? memoryRepo.listUserMemories(guildId, userId) : [];
        return { status: 'success', action, memories };
      }

      case 'SEND_DM': {
        const { messageText } = actionData;
        if (!messageText || messageText.trim().length === 0) {
          throw new ValidationError('O texto da mensagem privada não pode estar vazio.');
        }

        let sentOk = false;
        let activeClient = this.botClient;
        const targetBotId = actionData.botId;
        if (targetBotId && targetBotId !== 'PRIMARY' && targetBotId !== 'MAIN' && this.services?.multiBotManager) {
          const instLive = this.services.multiBotManager.activeInstances.get(targetBotId);
          if (instLive?.client?.users) {
            activeClient = instLive.client;
          }
        }

        if (activeClient?.users) {
          try {
            const u = await activeClient.users.fetch(userId);
            if (u && typeof u.send === 'function') {
              await u.send(messageText.trim());
              sentOk = true;
            }
          } catch (dmErr) {
            throw new Error(`Falha ao enviar mensagem privada pelo bot selecionado: ${dmErr.message}`);
          }
        } else if (targetUser && typeof targetUser.send === 'function') {
          try {
            await targetUser.send(messageText.trim());
            sentOk = true;
          } catch (dmErr) {
            throw new Error(`Não foi possível enviar a DM para o usuário (DMs podem estar bloqueadas): ${dmErr.message}`);
          }
        } else {
          sentOk = true;
        }

        const sessionData = dmTracker.registerOutboundDm({
          userId,
          guildId,
          adminId: session.userId,
          adminUsername: session.userData?.username || 'Administrador',
          sentText: messageText.trim(),
          botId: targetBotId || 'PRIMARY'
        });

        if (this.auditService) {
          this.auditService.logAction({
            guildId,
            userId: session.userId,
            action: 'ADMIN_DM_SENT',
            targetId: userId,
            details: { sentText: messageText.trim() }
          });
        }

        return {
          status: 'success',
          action,
          message: 'Mensagem privada enviada com sucesso! O interceptador está monitorando as próximas 2 respostas do membro.',
          session: sessionData
        };
      }

      case 'GET_DM': {
        const sessionData = dmTracker.getSession(userId);
        return { status: 'success', action, session: sessionData };
      }

      case 'FINISH_DM': {
        const sessionData = dmTracker.finishSession(userId);
        return {
          status: 'success',
          action,
          message: 'Acompanhamento finalizado com sucesso! O silenciador da IA foi desligado e a IA poderá responder normalmente.',
          session: sessionData
        };
      }

      case 'CLEAR_DM': {
        dmTracker.clearSession(userId);
        return {
          status: 'success',
          action,
          message: 'Histórico de monitoramento de DM excluído com sucesso.',
          session: null
        };
      }

      default:
        throw new ValidationError(`Ação administrativa desconhecida: "${action}".`);
    }
  }

  /**
   * Retrieves all custom quiz questions for a guild.
   */
  getCustomQuizQuestions(session, guildId) {
    this.verifyGuildAccess(session, guildId);
    return this.services.quizRepo ? this.services.quizRepo.getCustomQuestions(guildId) : [];
  }

  /**
   * Creates a custom quiz question for a guild.
   */
  createCustomQuizQuestion(session, guildId, data = {}) {
    this.verifyGuildAccess(session, guildId);
    if (!this.services.quizRepo) throw new Error('Serviço de Quiz indisponível.');
    return this.services.quizRepo.createCustomQuestion({
      guildId,
      authorId: session.userId || 'DASHBOARD_ADMIN',
      category: data.category || 'geral',
      question: data.question,
      answers: data.answers,
      explanation: data.explanation,
      imageUrl: data.imageUrl || null
    });
  }

  /**
   * Deletes a custom quiz question for a guild.
   */
  deleteCustomQuizQuestion(session, guildId, questionId) {
    this.verifyGuildAccess(session, guildId);
    if (!this.services.quizRepo) throw new Error('Serviço de Quiz indisponível.');
    return this.services.quizRepo.deleteCustomQuestion(questionId, guildId);
  }

  /**
   * Updates an existing custom quiz question.
   */
  updateCustomQuizQuestion(session, guildId, questionId, data = {}) {
    this.verifyGuildAccess(session, guildId);
    if (!this.services.quizRepo) throw new Error('Serviço de Quiz indisponível.');
    return this.services.quizRepo.updateCustomQuestion(questionId, guildId, data);
  }

  /**
   * Retrieves all questions (system + custom) for the guild question browser.
   */
  getAllQuizQuestions(session, guildId) {
    this.verifyGuildAccess(session, guildId);
    if (this.services.quizService) {
      return this.services.quizService.getAllQuestions(guildId);
    }
    if (this.services.quizRepo) {
      const { QuizService } = require('./quizService');
      const qs = new QuizService({ quizRepo: this.services.quizRepo });
      return qs.getAllQuestions(guildId);
    }
    return [];
  }

  /**
   * Retrieves all quiz categories (system + custom).
   */
  getQuizCategories(session, guildId) {
    this.verifyGuildAccess(session, guildId);
    if (this.services.quizService) {
      return this.services.quizService.getAllCategories(guildId);
    }
    if (this.services.quizRepo) {
      const { QuizService } = require('./quizService');
      const qs = new QuizService({ quizRepo: this.services.quizRepo });
      return qs.getAllCategories(guildId);
    }
    return {};
  }

  /**
   * Creates a custom category.
   */
  createCustomQuizCategory(session, guildId, data = {}) {
    this.verifyGuildAccess(session, guildId);
    if (!this.services.quizRepo) throw new Error('Serviço de Quiz indisponível.');
    return this.services.quizRepo.createCustomCategory({
      guildId,
      authorId: session.userId || 'DASHBOARD_ADMIN',
      key: data.key,
      name: data.name,
      emoji: data.emoji || '📁',
      color: data.color || '#5865F2',
      description: data.description || ''
    });
  }

  /**
   * Deletes a custom category by ID.
   */
  deleteCustomQuizCategory(session, guildId, categoryId) {
    this.verifyGuildAccess(session, guildId);
    if (!this.services.quizRepo) throw new Error('Serviço de Quiz indisponível.');
    return this.services.quizRepo.deleteCustomCategory(categoryId, guildId);
  }

  /**
   * Retrieves comprehensive review and rating metrics for the guild.
   */
  getReviewData(session, guildId) {
    this.verifyGuildAccess(session, guildId);
    const reviewRepo = this.services.reviewRepo;
    if (!reviewRepo) {
      return { config: null, stats: { total: 0, average: 0, breakdown: {}, positivePercent: 100 }, leaderboard: [], reviews: [] };
    }

    const config = reviewRepo.getReviewConfig(guildId) || { reviewChannelId: null, requireModeration: false };
    const rawStats = reviewRepo.getReviewStats(guildId);
    const positiveCount = ((rawStats.breakdown && rawStats.breakdown[5]) || 0) + ((rawStats.breakdown && rawStats.breakdown[4]) || 0);
    const positivePercent = rawStats.total > 0 ? Math.round((positiveCount / rawStats.total) * 100) : 100;
    const stats = {
      ...rawStats,
      positivePercent
    };

    const rawReviews = reviewRepo.getReviews(guildId, { limit: 100, status: null });
    const rawLeaderboard = reviewRepo.getStaffReviewLeaderboard
      ? reviewRepo.getStaffReviewLeaderboard(guildId)
      : [];

    const guild = this.botClient?.guilds?.cache?.get(guildId);
    const resolveUser = (userId) => {
      if (!userId) return null;
      if (guild) {
        const member = guild.members?.cache?.get(userId);
        if (member) {
          return {
            id: userId,
            displayName: member.displayName || member.user?.username || userId,
            username: member.user?.username || userId,
            avatarUrl: member.user?.displayAvatarURL?.({ size: 64 }) || member.displayAvatarURL?.({ size: 64 }) || 'https://cdn.discordapp.com/embed/avatars/0.png'
          };
        }
      }
      return {
        id: userId,
        displayName: 'Membro (' + userId.slice(-4) + ')',
        username: userId,
        avatarUrl: 'https://cdn.discordapp.com/embed/avatars/0.png'
      };
    };

    const reviews = rawReviews.map(r => ({
      ...r,
      author: resolveUser(r.authorId),
      targetStaff: resolveUser(r.targetStaffId)
    }));

    const leaderboard = rawLeaderboard.map(lb => ({
      ...lb,
      staff: resolveUser(lb.staffId)
    }));

    return {
      config,
      stats,
      leaderboard,
      reviews
    };
  }

  /**
   * Approves, rejects, or deletes a review.
   */
  moderateReview(session, guildId, reviewId, action) {
    this.verifyGuildAccess(session, guildId);
    const reviewRepo = this.services.reviewRepo;
    if (!reviewRepo) throw new Error('Serviço de avaliações indisponível.');

    const cleanAction = String(action || '').toUpperCase();
    if (cleanAction === 'DELETE') {
      return reviewRepo.deleteReview(guildId, reviewId);
    } else if (cleanAction === 'APPROVE') {
      return reviewRepo.updateReviewStatus(guildId, reviewId, 'APPROVED');
    } else if (cleanAction === 'REJECT') {
      return reviewRepo.updateReviewStatus(guildId, reviewId, 'REJECTED');
    }
    throw new Error('Ação inválida. Utilize APPROVE, REJECT ou DELETE.');
  }

  listChannelSummaries(session, guildId, limit = 20) {
    this.verifyGuildAccess(session, guildId);
    const db = this.services?.dbManager || this.services?.modRepo?.db || this.services?.guildRepo?.db;
    if (!db || typeof db.all !== 'function') return [];
    try {
      const rows = db.all(
        `SELECT * FROM channel_summaries WHERE guild_id = ? ORDER BY id DESC LIMIT ?`,
        [guildId, Math.max(1, Number(limit) || 20)]
      );
      return (rows || []).map(r => {
        let participants = [];
        try { participants = r.participants_json ? JSON.parse(r.participants_json) : []; } catch {}
        return {
          id: r.id,
          guildId: r.guild_id,
          channelId: r.channel_id,
          channelName: r.channel_name,
          messageCount: r.message_count,
          summaryType: r.summary_type,
          summaryText: r.summary_text,
          participants,
          createdBy: r.created_by,
          createdAt: r.created_at
        };
      });
    } catch {
      return [];
    }
  }

  deleteChannelSummary(session, guildId, summaryId) {
    this.verifyGuildAccess(session, guildId);
    const db = this.services?.dbManager || this.services?.modRepo?.db || this.services?.guildRepo?.db;
    if (!db || typeof db.run !== 'function') return false;
    try {
      const res = db.run(
        `DELETE FROM channel_summaries WHERE id = ? AND guild_id = ?`,
        [Number(summaryId), guildId]
      );
      return res.changes > 0;
    } catch {
      return false;
    }
  }

  async generateChatSummaryForPanel(session, guildId, channelId, limit = 300, type = 'summary', sendToDiscord = false, botId = null) {
    this.verifyGuildAccess(session, guildId);
    const startTime = Date.now();
    const mb = this.services?.multiBotManager;
    const isSecondaryBot = Boolean(botId && botId !== 'PRIMARY' && botId !== 'MAIN');
    const inst = isSecondaryBot && mb ? mb.getInstance(botId) : null;
    const client = (inst?.client?.guilds?.cache?.has(guildId) ? inst.client : null) || this.botClient || this.services?.botClient;
    const guild = client?.guilds?.cache?.get(guildId);
    const channel = guild?.channels?.cache?.get(channelId);
    if (!channel || !channel.messages) {
      throw new ValidationError(`Canal de texto "${channelId}" não encontrado ou inacessível.`);
    }

    const { gossipService, llmAdapter } = this.services;
    const service = gossipService || (llmAdapter ? new (require('./gossipService').GossipService)({ llmAdapter }) : null);
    if (!service) {
      throw new ValidationError('Serviço de IA / Resumo indisponível.');
    }

    const messages = await service.fetchChannelMessages(channel, limit);
    const aiName = (inst?.config?.aiName || inst?.name) || this.identityService.getDisplayName(guildId);

    let text = '';
    if (type === 'gossip') {
      text = await service.generateGossipBulletin(messages, channel.name);
    } else {
      text = await service.generateChatSummary(messages, channel.name);
    }

    // Extract unique human participants
    const participants = Array.from(new Set(
      (messages || [])
        .filter(m => m && !m.author?.bot)
        .map(m => m.member?.displayName || m.author?.username)
        .filter(Boolean)
    ));

    // Persist generated summary in SQLite channel_summaries table
    let savedId = null;
    const db = this.services?.dbManager || this.services?.modRepo?.db || this.services?.guildRepo?.db;
    if (db && typeof db.run === 'function') {
      try {
        const now = new Date().toISOString();
        const result = db.run(
          `INSERT INTO channel_summaries (guild_id, channel_id, channel_name, message_count, summary_type, summary_text, participants_json, created_by, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            guildId,
            channelId,
            channel.name || 'chat',
            messages.length,
            type,
            text,
            JSON.stringify(participants),
            session?.userId || 'web_admin',
            now
          ]
        );
        savedId = Number(result?.lastInsertRowid || Date.now());
      } catch {}
    }

    if (sendToDiscord && channel.send) {
      const { EmbedBuilder } = require('discord.js');
      const isGossip = type === 'gossip';
      const embed = new EmbedBuilder()
        .setTitle(isGossip ? '📰 Boletim da Fofoca & Resenha do Servidor' : `📑 Resumo Inteligente do Chat — #${channel.name}`)
        .setDescription(text)
        .setColor(isGossip ? 0xFF69B4 : 0x00E5FF)
        .setFooter({
          text: `${aiName} • ${isGossip ? 'Fofoca & Resenha' : 'Resumo Estruturado'} (${messages.length} mensagens)`,
          iconURL: client?.user?.displayAvatarURL ? client.user.displayAvatarURL() : undefined
        })
        .setTimestamp();
      await channel.send({ embeds: [embed] }).catch(() => {});
    }

    const durationMs = Date.now() - startTime;
    const summariesHistory = this.listChannelSummaries(session, guildId, 15);

    return {
      success: true,
      id: savedId,
      channelId,
      channelName: channel.name,
      messageCount: messages.length,
      participants,
      type,
      summary: text,
      text,
      durationMs,
      summaries: summariesHistory
    };
  }
}

module.exports = { WebPanelService };
