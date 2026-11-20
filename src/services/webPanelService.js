const crypto = require('node:crypto');
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { logger } = require('../utils/logger');
const { ValidationError, PermissionDeniedError } = require('../utils/errorHandler');
const { dmTracker } = require('../utils/dmTracker');
const { MODULE_DEFINITIONS } = require('./guildModuleService');

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
              warnRules: cfg.moderation?.warnRules || [],
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

    if (isSecondaryBot && mb) {
      const inst = mb.getInstance(botId);
      if (inst) {
        const cfg = inst.config || {};
        switch (mod) {
          case 'guild_modules':
          case 'modular_configs':
          case 'modules':
            return {
              definitions: MODULE_DEFINITIONS,
              settings: cfg.modules || {}
            };
          case 'moderation':
          case 'warns':
            return {
              logChannelId: cfg.moderation?.logChannelId || null,
              warnRules: cfg.moderation?.warnRules || [],
              escalations: cfg.moderation?.escalations || [],
              antiAbuse: {
                antiSpamEnabled: cfg.moderation?.antiSpamEnabled ?? true,
                maxMessagesPerInterval: cfg.moderation?.maxMessagesPerInterval ?? 5,
                antiBotScamEnabled: cfg.moderation?.antiBotScamEnabled ?? true,
                antiBotScamAction: cfg.moderation?.antiBotScamAction || 'TIMEOUT'
              }
            };
          case 'audit':
            return {
              channelId: cfg.audit?.channelId || cfg.moderation?.logChannelId || null
            };
          case 'welcome':
            return {
              channelId: cfg.social?.welcomeChannelId || null,
              welcomeChannelId: cfg.social?.welcomeChannelId || null,
              message: cfg.social?.welcomeMessage || 'Bem-vindo(a) {user} ao **{server}**! 🎉',
              welcomeMessage: cfg.social?.welcomeMessage || 'Bem-vindo(a) {user} ao **{server}**! 🎉',
              goodbyeChannelId: cfg.social?.goodbyeChannelId || null,
              goodbyeMessage: cfg.social?.goodbyeMessage || '**{username}** saiu do servidor.',
              welcomeEnabled: Boolean(cfg.social?.welcomeChannelId),
              goodbyeEnabled: Boolean(cfg.social?.goodbyeChannelId),
              embedEnabled: true,
              dmWelcomeEnabled: false
            };
          case 'autorole':
            return {
              roles: cfg.social?.autoRoleId ? [cfg.social.autoRoleId] : [],
              roleId: cfg.social?.autoRoleId || ''
            };
          case 'tickets':
            return {
              panelTitle: cfg.tickets?.panelTitle || `🎫 Central de Atendimento — ${inst.name}`,
              panelDescription: cfg.tickets?.panelDescription || 'Clique no botão abaixo para abrir um ticket privado com a equipe.',
              transcriptChannelId: cfg.tickets?.transcriptChannelId || null,
              panelChannelId: cfg.tickets?.transcriptChannelId || null,
              defaultSupportRoleId: cfg.tickets?.defaultSupportRoleId || null,
              maxOpenTicketsPerUser: cfg.tickets?.maxOpenTicketsPerUser || 1
            };
          case 'starboard':
            return {
              channelId: cfg.social?.starboardChannelId || null,
              emoji: cfg.social?.starboardEmoji || '⭐',
              minStars: cfg.social?.starboardMinStars || 3
            };
          case 'music':
            return {
              allowedTextChannelId: cfg.music?.allowedChannelId || null,
              defaultVolume: cfg.music?.defaultVolume || 80,
              djRoleId: cfg.music?.djRoleId || null
            };
          case 'economy':
            return {
              currencyName: cfg.economyXp?.currencyName || 'StarkCoins',
              currencySymbol: cfg.economyXp?.currencySymbol || '🪙',
              initialBalance: cfg.economyXp?.initialBalance || 100,
              dailyAmount: cfg.economyXp?.dailyAmount || 500
            };
          case 'casino':
          case 'apostas':
            return {
              minBet: cfg.economyXp?.casinoMinBet || 10,
              maxBet: cfg.economyXp?.casinoMaxBet || 100000
            };
          case 'quiz':
            return {
              rewardCoins: cfg.economyXp?.quizRewardCoins || 200,
              rewardXp: cfg.economyXp?.quizRewardXp || 50,
              defaultRounds: cfg.economyXp?.quizDefaultRounds || 5,
              defaultTimeoutSeconds: cfg.economyXp?.quizTimeoutSeconds || 25
            };
          case 'briefing':
            return {
              briefingEnabled: Boolean(cfg.automations?.briefingEnabled),
              briefingHourUtc: cfg.automations?.briefingHourUtc || 18,
              briefingChannelId: cfg.automations?.briefingChannelId || null
            };
          case 'custom_commands':
          case 'customcommands':
            return {
              prefix: cfg.prefix || cfg.commands?.prefix || '+',
              prefixless_mode: Boolean(cfg.commands?.prefixlessMode),
              commands: (this.services.customCommandRepo ? this.services.customCommandRepo.listCommands(guildId) : []) || []
            };
          case 'social_alerts':
          case 'socialalerts':
          case 'alerts': {
            const repo = this.services.socialAlertRepo || this.services.socialAlertsRepo;
            return {
              alerts: repo ? repo.listAlerts(guildId) : []
            };
          }
          case 'bot_presence':
          case 'botpresence':
          case 'presence':
            return {
              botStatus: cfg.presenceStatus || 'online',
              activityType: cfg.presenceActivityType || 'Custom',
              activityName: cfg.presenceActivityText || '',
              activityUrl: cfg.presenceActivityUrl || ''
            };
          case 'aimemory':
          case 'ai_memory':
          case 'memories': {
            const rawMems = (mb.listInstanceMemories ? mb.listInstanceMemories(botId, guildId) : (typeof mb.getInstanceMemories === 'function' ? mb.getInstanceMemories(botId) : [])) || [];
            return {
              memories: rawMems.map(m => ({
                id: m.id,
                key: m.key || m.memory_key,
                value: m.value || m.memory_value,
                created_by: m.created_by,
                updated_at: m.updated_at
              }))
            };
          }
          case 'tempbans':
            return {
              tempbans: this.services.modRepo ? this.services.modRepo.getActiveTempBans(guildId) : []
            };
          case 'help':
          case 'help_menu':
          case 'ajuda':
            return cfg.help || cfg.commands?.help || {
              enabled: true,
              title: `⚡ Central de Comandos — ${inst.name}`,
              description: '',
              footer: `${inst.name} • Use o menu abaixo para navegar entre as categorias`,
              color: '#5865F2',
              thumbnailUrl: '',
              categoryEmojis: {
                home: '🏠',
                economy: '💼',
                casino: '🎰',
                music: '🎵',
                moderation: '🛡️',
                xp: '🎖️',
                fun: '🎉',
                tickets: '🎫',
                admin: '⚙️'
              }
            };
          case 'anti_bot_scam':
          case 'antibotscam':
            return {
              enabled: cfg.moderation?.antiBotScamEnabled ?? true,
              action: cfg.moderation?.antiBotScamAction || 'TIMEOUT',
              timeoutDurationSeconds: cfg.moderation?.antiBotScamTimeoutSeconds || 86400
            };
          case 'reviews':
            return {
              channelId: cfg.reviews?.channelId || null,
              moderationEnabled: Boolean(cfg.reviews?.moderationEnabled)
            };
          case 'identity':
            return {
              aiName: cfg.aiName || inst.name,
              aiModel: cfg.aiModel || 'gemini-3.5-flash-lite',
              aiTemperature: cfg.aiTemperature ?? 0.65,
              prefix: cfg.prefix || cfg.commands?.prefix || '+',
              prefixless: Boolean(cfg.commands?.prefixlessMode)
            };
          default:
            return cfg[mod] || {};
        }
      }
      return null;
    }
    const {
      modRepo,
      ticketRepo,
      reviewRepo,
      communityRepo,
      automationRepo,
      musicVoiceRepo,
      economyRepo,
      xpRepo,
      botPresenceRepo,
      quizRepo,
      apiKeyRepo
    } = this.services;

    switch (mod) {
      case 'tickets':
        return ticketRepo ? ticketRepo.getTicketConfig(guildId) : null;
      case 'reviews':
        return reviewRepo ? reviewRepo.getReviewConfig(guildId) : null;
      case 'welcome':
        return communityRepo ? communityRepo.getWelcomeConfig(guildId) : null;
      case 'autorole': {
        const autoRoles = communityRepo ? communityRepo.getAutoRoles(guildId) : [];
        return { roles: autoRoles, roleId: autoRoles[0] || '' };
      }
      case 'starboard':
        return communityRepo ? communityRepo.getStarboardConfig(guildId) : null;
      case 'briefing':
        return automationRepo ? automationRepo.getBriefingConfig(guildId) : null;
      case 'moderation':
      case 'warns': {
        const row = modRepo ? modRepo.getLogChannel(guildId, 'PUNISHMENTS') : null;
        return {
          logChannelId: row?.channel_id || null,
          warnRules: modRepo ? modRepo.getEscalationRules(guildId) : [],
          escalations: modRepo ? modRepo.getEscalationRules(guildId) : [],
          antiAbuse: modRepo ? modRepo.getAntiAbuseConfig(guildId) : null
        };
      }
      case 'audit': {
        const settings = this.settingsService.getSettings(guildId);
        return { channelId: settings.audit_channel_id || null };
      }
      case 'music':
        return musicVoiceRepo ? musicVoiceRepo.getMusicConfig(guildId) : null;
      case 'social':
      case 'marriage':
        return musicVoiceRepo ? musicVoiceRepo.getSocialConfig(guildId) : null;
      case 'quiz':
        return quizRepo ? quizRepo.getQuizConfig(guildId) : null;
      case 'economy':
        return economyRepo ? {
          ...economyRepo.getGuildConfig(guildId),
          exchangeCurrencies: economyRepo.listExchangeCurrencies(guildId, false),
          companyTypes: economyRepo.listCompanyTypes(guildId, false),
          loanConfig: this.services.loanRepo ? this.services.loanRepo.getLoanConfig(guildId) : null
        } : null;
      case 'casino':
      case 'apostas':
        return this.services.casinoRepo ? this.services.casinoRepo.getCasinoConfig(guildId) : null;
      case 'custom_commands':
      case 'customcommands': {
        const { customCommandRepo, customCommandService, settingsService } = this.services;
        const currentPrefix = settingsService ? settingsService.getSetting(guildId, 'prefix', '+') : '+';
        const prefixless = settingsService ? (settingsService.getSetting(guildId, 'prefixless_mode', 'false') === 'true' || ['none', 'sem', 'nenhum', ''].includes(currentPrefix)) : false;
        return {
          prefix: (!['none', 'sem', 'nenhum', ''].includes(currentPrefix)) ? currentPrefix : '+',
          prefixless_mode: prefixless,
          commands: customCommandRepo ? customCommandRepo.listCommands(guildId) : [],
          placeholders: customCommandService ? customCommandService.getPlaceholdersDocumentation() : []
        };
      }
      case 'xp':
        return xpRepo ? xpRepo.getXpConfig(guildId) : null;
      case 'xp_reward':
        return xpRepo ? { rewards: xpRepo.getLevelRewards(guildId) } : { rewards: [] };
      case 'xp_multiplier':
        return xpRepo ? { multipliers: xpRepo.getMultipliersAndBlocks(guildId) } : { multipliers: [] };
      case 'aimemory':
      case 'ai_memory':
      case 'memories': {
        const botGuild = this.botClient?.guilds?.cache?.get(guildId);
        return {
          memories: this.services.memoryRepo ? this.services.memoryRepo.ensureDefaultBotMemories(guildId, botGuild?.name || 'Servidor') : []
        };
      }
      case 'bot_speak':
      case 'botspeak':
      case 'send_message':
        return { status: 'ready' };
      case 'bot_presence':
      case 'botpresence':
      case 'presence':
        return botPresenceRepo ? botPresenceRepo.getPresence() : null;
      case 'ai_keys':
        return apiKeyRepo ? (apiKeyRepo.getKeysStatus ? apiKeyRepo.getKeysStatus(this.services.llmAdapter) : apiKeyRepo.getKeys()) : null;
      case 'social_alerts':
      case 'socialalerts':
      case 'alerts':
        return this.services.socialAlertRepo ? this.services.socialAlertRepo.listAlerts(guildId) : [];
      case 'backup':
      case 'backups':
        return this.services.backupSecurityService ? this.services.backupSecurityService.listBackups(guildId) : [];
      case 'guild_modules':
      case 'modular_configs':
      case 'modules': {
        const gms = this.services.guildModuleService;
        return {
          definitions: gms ? gms.getAllModuleDefinitions(guildId) : [],
          settings: gms ? gms.getGuildModules(guildId) : {}
        };
      }
      case 'summaries':
      case 'channel_summaries':
        return {
          summaries: this.listChannelSummaries(session, guildId, 20)
        };
      case 'tempbans':
      case 'temp_bans':
        return {
          tempbans: modRepo ? modRepo.getActiveTempBans(guildId) : []
        };
      case 'anti_bot_scam':
      case 'antibotscam': {
        const ab = modRepo ? (modRepo.getAntiAbuseConfig(guildId) || {}) : {};
        const isEnabled = ab.antiBotScamEnabled !== undefined
          ? Boolean(ab.antiBotScamEnabled)
          : (ab.anti_bot_scam_enabled === 1 || ab.anti_bot_scam_enabled === true);
        return {
          enabled: isEnabled,
          action: ab.antiBotScamAction || ab.anti_bot_scam_action || 'TIMEOUT',
          timeoutDurationSeconds: ab.antiBotScamTimeoutSeconds || ab.anti_bot_scam_timeout_seconds || 86400
        };
      }
      case 'help':
      case 'help_menu':
      case 'ajuda': {
        try {
          const row = this.services?.guildModuleService?.db?.get
            ? this.services.guildModuleService.db.get('SELECT value FROM guild_settings WHERE guild_id = ? AND key = ?', [guildId, 'help_menu_config'])
            : null;
          if (row && row.value) {
            return JSON.parse(row.value);
          }
        } catch {}
        const { botConfig } = require('../config/botConfig');
        return botConfig.getConfig()?.help || {
          enabled: true,
          title: '⚡ Central de Comandos — Jarvis',
          description: '',
          footer: 'Jarvis • Use o menu abaixo para navegar entre as categorias',
          color: '#5865F2',
          thumbnailUrl: '',
          categoryEmojis: {
            home: '🏠',
            economy: '💼',
            casino: '🎰',
            music: '🎵',
            moderation: '🛡️',
            xp: '🎖️',
            fun: '🎉',
            tickets: '🎫',
            admin: '⚙️'
          }
        };
      }
      default:
        throw new ValidationError(`Módulo desconhecido: "${moduleName}".`);
    }
  }

  async updateModuleConfig(session, guildId, moduleName, updates, csrfToken, botId = null) {
    this.verifyGuildAccess(session, guildId);
    this.verifyCsrf(session.token, csrfToken, session);

    const mod = moduleName.toLowerCase().trim();
    const mb = this.services.multiBotManager;
    const isSecondaryBot = Boolean(botId && botId !== 'PRIMARY' && botId !== 'MAIN');

    if (isSecondaryBot && mb) {
      const inst = mb.getInstance(botId);
      if (!inst) {
        throw new ValidationError(`Instância de bot "${botId}" não encontrada.`);
      }
      const cfg = { ...(inst.config || {}) };
        switch (mod) {
          case 'guild_modules':
          case 'modular_configs':
          case 'modules': {
            const modulesToSet = updates.modules || updates;
            cfg.modules = { ...(cfg.modules || {}), ...modulesToSet };
            mb.updateInstance(botId, { config: cfg });
            return { module: 'guild_modules', config: cfg.modules };
          }
          case 'moderation':
          case 'warns': {
            cfg.moderation = { ...(cfg.moderation || {}), ...updates };
            if (updates.logChannelId !== undefined) cfg.moderation.logChannelId = updates.logChannelId;
            mb.updateInstance(botId, { config: cfg });
            return { module: 'moderation', config: cfg.moderation };
          }
          case 'welcome': {
            cfg.social = { ...(cfg.social || {}) };
            if (updates.channelId !== undefined) cfg.social.welcomeChannelId = updates.channelId;
            if (updates.message !== undefined) cfg.social.welcomeMessage = updates.message;
            mb.updateInstance(botId, { config: cfg });
            return { module: 'welcome', config: cfg.social };
          }
          case 'autorole': {
            cfg.social = { ...(cfg.social || {}) };
            if (updates.roleId !== undefined) cfg.social.autoRoleId = updates.roleId;
            mb.updateInstance(botId, { config: cfg });
            return { module: 'autorole', config: cfg.social };
          }
          case 'tickets': {
            cfg.tickets = { ...(cfg.tickets || {}), ...updates };
            if (updates.channelId !== undefined) cfg.tickets.transcriptChannelId = updates.channelId;
            if (updates.transcriptChannelId !== undefined) cfg.tickets.transcriptChannelId = updates.transcriptChannelId;
            if (updates.supportRoleId !== undefined) cfg.tickets.defaultSupportRoleId = updates.supportRoleId;
            if (updates.defaultSupportRoleId !== undefined) cfg.tickets.defaultSupportRoleId = updates.defaultSupportRoleId;
            mb.updateInstance(botId, { config: cfg });
            return { module: 'tickets', config: cfg.tickets };
          }
          case 'starboard': {
            cfg.social = { ...(cfg.social || {}) };
            if (updates.channelId !== undefined) cfg.social.starboardChannelId = updates.channelId;
            if (updates.emoji !== undefined) cfg.social.starboardEmoji = updates.emoji;
            if (updates.minStars !== undefined) cfg.social.starboardMinStars = updates.minStars;
            mb.updateInstance(botId, { config: cfg });
            return { module: 'starboard', config: cfg.social };
          }
          case 'economy': {
            cfg.economyXp = { ...(cfg.economyXp || {}), ...updates };
            mb.updateInstance(botId, { config: cfg });
            return { module: 'economy', config: cfg.economyXp };
          }
          case 'audit': {
            const targetChannel = updates.channelId || updates.auditChannelId || '';
            cfg.audit = { ...(cfg.audit || {}), channelId: targetChannel };
            cfg.moderation = { ...(cfg.moderation || {}), logChannelId: targetChannel };
            mb.updateInstance(botId, { config: cfg });
            if (this.auditService) {
              this.auditService.logAction({
                guildId,
                userId: session.userId,
                action: 'WEB_PANEL_MODULE_UPDATE_AUDIT',
                targetId: guildId,
                details: updates,
                botInstanceId: botId
              });
            }
            return { module: 'audit', config: { channelId: targetChannel } };
          }
          case 'music': {
            cfg.music = { ...(cfg.music || {}), ...updates };
            if (updates.allowedTextChannelId !== undefined) cfg.music.allowedChannelId = updates.allowedTextChannelId;
            if (updates.channelId !== undefined) cfg.music.allowedChannelId = updates.channelId;
            mb.updateInstance(botId, { config: cfg });
            return { module: 'music', config: cfg.music };
          }
          case 'social':
          case 'marriage': {
            cfg.social = { ...(cfg.social || {}), ...updates };
            mb.updateInstance(botId, { config: cfg });
            return { module: 'social', config: cfg.social };
          }
          case 'quiz': {
            cfg.economyXp = { ...(cfg.economyXp || {}), ...updates };
            mb.updateInstance(botId, { config: cfg });
            return { module: 'quiz', config: cfg.economyXp };
          }
          case 'casino':
          case 'apostas': {
            cfg.economyXp = { ...(cfg.economyXp || {}), ...updates };
            mb.updateInstance(botId, { config: cfg });
            return { module: 'casino', config: cfg.economyXp };
          }
          case 'briefing': {
            cfg.automations = { ...(cfg.automations || {}), ...updates };
            if (updates.channelId !== undefined) cfg.automations.briefingChannelId = updates.channelId;
            mb.updateInstance(botId, { config: cfg });
            return { module: 'briefing', config: cfg.automations };
          }
          case 'custom_commands':
          case 'customcommands': {
            if (updates.prefix) {
              cfg.prefix = updates.prefix;
              cfg.commands = { ...(cfg.commands || {}), prefix: updates.prefix };
            }
            if (updates.prefixless_mode !== undefined) {
              cfg.commands = { ...(cfg.commands || {}), prefixlessMode: Boolean(updates.prefixless_mode) };
            }
            mb.updateInstance(botId, { config: cfg });

            const { customCommandService, customCommandRepo } = this.services;
            if (customCommandService) {
              if (updates.action === 'UPDATE' || updates.originalName || updates.update) {
                const u = updates.update || updates;
                const origName = u.originalName || u.name;
                customCommandService.updateCommand(guildId, origName, {
                  newName: (u.name && u.name !== origName) ? u.name : undefined,
                  response: u.response,
                  description: u.description,
                  actorId: session.userId || 'web_admin',
                  customPrefix: u.custom_prefix !== undefined ? u.custom_prefix : (u.customPrefix !== undefined ? u.customPrefix : null),
                  requirePrefix: u.require_prefix !== undefined ? u.require_prefix : (u.requirePrefix !== undefined ? u.requirePrefix : (u.sem_prefixo ? 0 : 1)),
                  matchMode: u.match_mode || u.matchMode || 'starts_with'
                });
              } else if (updates.action === 'CREATE' || updates.create) {
                const c = updates.create || updates;
                const cleanName = String(c.name || '').toLowerCase().trim();
                const existing = customCommandRepo ? customCommandRepo.getCommand(guildId, cleanName) : null;
                if (existing) {
                  customCommandService.updateCommand(guildId, cleanName, {
                    response: c.response,
                    description: c.description,
                    actorId: session.userId || 'web_admin',
                    customPrefix: c.custom_prefix !== undefined ? c.custom_prefix : (c.customPrefix !== undefined ? c.customPrefix : null),
                    requirePrefix: c.require_prefix !== undefined ? c.require_prefix : (c.requirePrefix !== undefined ? c.requirePrefix : (c.sem_prefixo ? 0 : 1)),
                    matchMode: c.match_mode || c.matchMode || 'starts_with'
                  });
                } else {
                  customCommandService.createCommand(guildId, {
                    name: cleanName,
                    response: c.response,
                    description: c.description || null,
                    createdBy: session.userId || 'web_admin',
                    customPrefix: c.custom_prefix !== undefined ? c.custom_prefix : (c.customPrefix !== undefined ? c.custom_prefix : null),
                    requirePrefix: c.require_prefix !== undefined ? c.require_prefix : (c.requirePrefix !== undefined ? c.requirePrefix : (c.sem_prefixo ? 0 : 1)),
                    matchMode: c.match_mode || c.matchMode || 'starts_with'
                  });
                }
              } else if (updates.action === 'DELETE' || updates.delete) {
                const cmdName = String(updates.name || updates.delete || '').toLowerCase().trim();
                if (cmdName) {
                  customCommandService.deleteCommand(guildId, cmdName, session.userId || 'web_admin');
                }
              }
            }
            return {
              module: 'custom_commands',
              config: cfg.commands,
              commands: customCommandRepo ? customCommandRepo.listCommands(guildId) : []
            };
          }
          case 'social_alerts':
          case 'socialalerts':
          case 'alerts': {
            const { socialAlertService } = this.services;
            const repo = this.services.socialAlertRepo || this.services.socialAlertsRepo;
            if (updates.action === 'CREATE' || updates.add) {
              if (socialAlertService) {
                socialAlertService.addAlert(guildId, updates.platform, updates.sourceId, updates.channelTargetId, updates.customMessage);
              } else if (repo) {
                repo.createAlert({ guildId, platform: updates.platform, sourceId: updates.sourceId, channelTargetId: updates.channelTargetId, customMessage: updates.customMessage });
              }
            } else if (updates.action === 'DELETE' || updates.delete) {
              if (socialAlertService) {
                socialAlertService.removeAlert(guildId, updates.id || updates.delete);
              } else if (repo) {
                repo.deleteAlert(updates.id || updates.delete, guildId);
              }
            }
            return {
              module: 'social_alerts',
              alerts: repo ? repo.listAlerts(guildId) : []
            };
          }
          case 'help':
          case 'help_menu':
          case 'ajuda': {
            cfg.help = { ...(cfg.help || {}), ...updates };
            if (!cfg.commands) cfg.commands = {};
            cfg.commands.help = { ...(cfg.commands.help || {}), ...updates };
            mb.updateInstance(botId, { config: cfg });
            return { module: 'help', config: cfg.help };
          }
          case 'anti_bot_scam':
          case 'antibotscam': {
            cfg.moderation = { ...(cfg.moderation || {}), ...updates };
            mb.updateInstance(botId, { config: cfg });
            return { module: 'anti_bot_scam', config: cfg.moderation };
          }
          case 'reviews': {
            cfg.reviews = { ...(cfg.reviews || {}), ...updates };
            mb.updateInstance(botId, { config: cfg });
            return { module: 'reviews', config: cfg.reviews };
          }
          case 'identity': {
            if (updates.aiName) cfg.aiName = updates.aiName;
            if (updates.aiModel) cfg.aiModel = updates.aiModel;
            if (updates.prefix) {
              cfg.prefix = updates.prefix;
              cfg.commands = { ...(cfg.commands || {}), prefix: updates.prefix };
            }
            mb.updateInstance(botId, { config: cfg });
            return { module: 'identity', config: cfg };
          }
          case 'xp': {
            cfg.economyXp = { ...(cfg.economyXp || {}), ...updates };
            mb.updateInstance(botId, { config: cfg });
            return { module: 'xp', config: cfg.economyXp };
          }
          case 'bot_presence':
          case 'botpresence':
          case 'presence': {
            if (updates.status !== undefined) cfg.presenceStatus = String(updates.status);
            if (updates.botStatus !== undefined) cfg.presenceStatus = String(updates.botStatus);
            if (updates.presenceStatus !== undefined) cfg.presenceStatus = String(updates.presenceStatus);
            if (updates.activityType !== undefined) cfg.presenceActivityType = String(updates.activityType);
            if (updates.presenceActivityType !== undefined) cfg.presenceActivityType = String(updates.presenceActivityType);
            if (updates.activityName !== undefined) cfg.presenceActivityText = String(updates.activityName);
            if (updates.activityText !== undefined) cfg.presenceActivityText = String(updates.activityText);
            if (updates.presenceActivityText !== undefined) cfg.presenceActivityText = String(updates.presenceActivityText);
            if (updates.activityUrl !== undefined) cfg.presenceActivityUrl = String(updates.activityUrl);
            if (updates.presenceActivityUrl !== undefined) cfg.presenceActivityUrl = String(updates.presenceActivityUrl);
            mb.updateInstance(botId, { config: cfg });
            if (typeof mb.applyInstancePresence === 'function') {
              mb.applyInstancePresence(botId, cfg, inst.name);
            }
            return { module: 'bot_presence', config: cfg };
          }
          case 'aimemory':
          case 'ai_memory':
          case 'memories': {
            if (updates.action === 'SAVE' || updates.save) {
              const key = String(updates.key || '').trim().toLowerCase().slice(0, 64);
              const value = String(updates.value || '').trim();
              if (!key || !value) throw new ValidationError('Chave e conteúdo da memória são obrigatórios.');
              if (typeof mb.saveInstanceMemory === 'function') {
                mb.saveInstanceMemory(botId, { key, value, guildId, createdBy: session.userId || 'web_admin' });
              }
            } else if (updates.action === 'DELETE' || updates.delete) {
              const key = String(updates.key || updates.delete || '').trim().toLowerCase();
              if (key && typeof mb.deleteInstanceMemory === 'function') {
                mb.deleteInstanceMemory(botId, key, guildId);
              }
            }
            const rawMems = typeof mb.listInstanceMemories === 'function' ? mb.listInstanceMemories(botId, guildId) : [];
            const mems = rawMems.map(m => ({
              id: m.id,
              key: m.key || m.memory_key,
              value: m.value || m.memory_value,
              created_by: m.created_by,
              updated_at: m.updated_at
            }));
            return { module: 'aimemory', config: { memories: mems } };
          }
          case 'tempbans': {
            if (updates.action === 'CANCEL' && updates.userId && this.services.modRepo?.removeTempBan) {
              this.services.modRepo.removeTempBan(guildId, updates.userId);
            }
            return {
              module: 'tempbans',
              config: {
                tempbans: this.services.modRepo ? this.services.modRepo.getActiveTempBans(guildId) : []
              }
            };
          }
          case 'bot_speak':
          case 'botspeak':
          case 'send_message': {
            const chosenBotId = (updates.botId && updates.botId !== 'MAIN' && updates.botId !== 'PRIMARY')
              ? updates.botId
              : (botId && botId !== 'MAIN' && botId !== 'PRIMARY' ? botId : null);

            if (chosenBotId && mb && typeof mb.speakWithInstance === 'function') {
              const speakRes = await mb.speakWithInstance(
                chosenBotId,
                {
                  guildId,
                  channelId: updates.channelId,
                  content: updates.content,
                  embed: updates.embed
                },
                this.botClient
              );
              return { module: 'bot_speak', config: speakRes, status: 'success', success: true };
            }
            break;
          }
          default: {
            cfg[mod] = { ...(cfg[mod] || {}), ...updates };
            mb.updateInstance(botId, { config: cfg });
            return { module: mod, config: cfg[mod] };
          }
        }
    }
    const {
      modRepo,
      ticketRepo,
      reviewRepo,
      communityRepo,
      automationRepo
    } = this.services;

    let updated = null;

    switch (mod) {
      case 'tickets': {
        if (!ticketRepo) throw new Error('Serviço de tickets indisponível.');
        const payload = { ...updates };
        if (updates.channelId !== undefined) {
          payload.transcriptChannelId = updates.channelId || null;
        }
        if (updates.transcriptChannelId !== undefined) {
          payload.transcriptChannelId = updates.transcriptChannelId || null;
        }
        if (updates.supportRoleId !== undefined) {
          payload.defaultSupportRoleId = updates.supportRoleId || null;
        }
        if (updates.defaultSupportRoleId !== undefined) {
          payload.defaultSupportRoleId = updates.defaultSupportRoleId || null;
        }
        if (updates.ticketCategoryId !== undefined) {
          payload.ticketCategoryId = updates.ticketCategoryId || null;
        }
        updated = ticketRepo.upsertTicketConfig(guildId, payload);

        // If panelChannelId is provided, publish panel immediately to Discord!
        if (updates.panelChannelId) {
          const panelTitle = updates.panelTitle || '🎫 Central de Atendimento';
          const panelDesc = updates.panelDescription || 'Clique no botão abaixo para abrir um canal de atendimento privado com nossa equipe de suporte.';
          const defaultCat = updates.defaultCategory || 'Suporte Geral';
          ticketRepo.createPanel(guildId, {
            channelId: updates.panelChannelId,
            title: panelTitle,
            description: panelDesc,
            supportRoleId: updates.supportRoleId || null
          });

          if (this.botClient) {
            try {
              const botGuild = this.botClient.guilds?.cache?.get(guildId);
              const panelChan = botGuild?.channels?.cache?.get(updates.panelChannelId);
              if (panelChan && panelChan.send) {
                const row = new ActionRowBuilder().addComponents(
                  new ButtonBuilder()
                    .setCustomId(`ticket_panel_open_${defaultCat.toLowerCase().replace(/[^a-z0-9_-]/g, '_')}`)
                    .setLabel(updates.buttonLabel || '🎫 Abrir Ticket')
                    .setStyle(ButtonStyle.Success)
                );
                const embed = new EmbedBuilder()
                  .setColor(0x5865F2)
                  .setTitle(panelTitle)
                  .setDescription(panelDesc)
                  .addFields(
                    {
                      name: '📋 Como Funciona?',
                      value: 'Ao clicar em **Abrir Ticket**, você informará o **motivo** e os **detalhes** da sua solicitação. Um canal privado e exclusivo será aberto para você falar com nossa equipe.',
                      inline: false
                    }
                  )
                  .setFooter({ text: `${this.identityService.getDisplayName(guildId)} • Atendimento por Tickets` })
                  .setTimestamp();
                panelChan.send({ embeds: [embed], components: [row] }).catch(() => {});
              }
            } catch (sendErr) {
              panelLogger.warn(`Failed to dispatch ticket panel to channel ${updates.panelChannelId}`, { error: sendErr.message });
            }
          }
        }
        break;
      }
      case 'reviews': {
        if (!reviewRepo) throw new Error('Serviço de avaliações indisponível.');
        const payload = { ...updates };
        if (updates.channelId !== undefined) {
          payload.reviewChannelId = updates.channelId || null;
        }
        if (updates.moderationEnabled !== undefined) {
          payload.requireModeration = Boolean(updates.moderationEnabled);
        }
        updated = reviewRepo.upsertReviewConfig(guildId, payload);
        break;
      }
      case 'welcome': {
        if (!communityRepo) throw new Error('Serviço de comunidade indisponível.');
        const payload = { ...updates };
        if (updates.channelId !== undefined) {
          payload.welcomeChannelId = updates.channelId || null;
          payload.welcomeEnabled = Boolean(updates.channelId);
        }
        if (updates.welcomeEnabled !== undefined) payload.welcomeEnabled = Boolean(updates.welcomeEnabled);
        if (updates.welcomeChannelId !== undefined) payload.welcomeChannelId = updates.welcomeChannelId || null;
        if (updates.welcomeMessageTemplate !== undefined) payload.welcomeMessage = updates.welcomeMessageTemplate;
        if (updates.welcomeMessage !== undefined) payload.welcomeMessage = updates.welcomeMessage;
        if (updates.goodbyeEnabled !== undefined) payload.goodbyeEnabled = Boolean(updates.goodbyeEnabled);
        if (updates.goodbyeChannelId !== undefined) payload.goodbyeChannelId = updates.goodbyeChannelId || null;
        if (updates.goodbyeMessage !== undefined) payload.goodbyeMessage = updates.goodbyeMessage;
        updated = communityRepo.upsertWelcomeConfig(guildId, payload);
        break;
      }
      case 'autorole': {
        if (!communityRepo) throw new Error('Serviço de comunidade indisponível.');
        const roleId = updates.roleId || updates.role_id || null;
        if (roleId) {
          communityRepo.setAutoRoles(guildId, [roleId]);
        } else {
          communityRepo.setAutoRoles(guildId, []);
        }
        updated = { roles: communityRepo.getAutoRoles(guildId) };
        break;
      }
      case 'audit': {
        const targetChannel = updates.channelId || updates.auditChannelId || '';
        this.settingsService.setSetting(guildId, 'audit_channel_id', targetChannel, session.userId);
        updated = { channelId: targetChannel };
        break;
      }
      case 'starboard': {
        if (!communityRepo) throw new Error('Serviço de comunidade indisponível.');
        const payload = { ...updates };
        if (updates.channelId !== undefined) {
          payload.starboardChannelId = updates.channelId || null;
          payload.isEnabled = Boolean(updates.channelId);
        }
        if (updates.emoji) {
          payload.starboardEmoji = updates.emoji;
        }
        updated = communityRepo.upsertStarboardConfig(guildId, payload);
        break;
      }
      case 'briefing': {
        if (!automationRepo) throw new Error('Serviço de automação indisponível.');
        const payload = { ...updates };
        if (updates.channelId !== undefined) {
          payload.briefingChannelId = updates.channelId || null;
          payload.isEnabled = Boolean(updates.channelId);
        }
        if (updates.briefingHourUtc !== undefined) {
          const hour = parseInt(updates.briefingHourUtc, 10) || 18;
          payload.scheduleCron = `0 ${hour} * * *`;
        }
        updated = automationRepo.upsertBriefingConfig(guildId, payload);
        break;
      }
      case 'moderation':
      case 'warns': {
        if (!modRepo) throw new Error('Serviço de moderação indisponível.');
        if (updates.logChannelId !== undefined || updates.channelId !== undefined) {
          const targetChannel = updates.channelId || updates.logChannelId || '';
          modRepo.setLogChannel(guildId, 'PUNISHMENTS', targetChannel);
        }
        if (updates.addRule) {
          const r = updates.addRule;
          modRepo.createEscalationRule({
            guildId,
            thresholdWarns: parseInt(r.thresholdWarns, 10) || 3,
            action: String(r.action || 'TIMEOUT').toUpperCase(),
            durationSeconds: r.durationMinutes ? parseInt(r.durationMinutes, 10) * 60 : (r.durationSeconds ? parseInt(r.durationSeconds, 10) : null),
            windowDays: parseInt(r.windowDays, 10) || 30,
            autoApply: r.autoApply !== false,
            priority: parseInt(r.priority, 10) || 0
          });
        }
        if (updates.deleteRuleId) {
          modRepo.deleteEscalationRule(updates.deleteRuleId);
        }
        if (updates.antiAbuse) {
          const ab = updates.antiAbuse;
          modRepo.saveAntiAbuseConfig(guildId, {
            antiSpamEnabled: ab.antiSpamEnabled !== undefined ? Boolean(ab.antiSpamEnabled) : true,
            intervalSeconds: Number(ab.intervalSeconds) || 5,
            maxMessagesPerInterval: Number(ab.maxMessagesPerInterval) || 5,
            antiFloodDuplicateThreshold: Number(ab.antiFloodDuplicateThreshold) || 3,
            antiRaidEnabled: ab.antiRaidEnabled !== undefined ? Boolean(ab.antiRaidEnabled) : true,
            actionOnDetection: ab.actionOnDetection || 'TIMEOUT',
            timeoutDurationSeconds: (Number(ab.timeoutDurationMinutes) || 5) * 60,
            antiBotScamEnabled: ab.antiBotScamEnabled !== undefined ? Boolean(ab.antiBotScamEnabled) : true,
            antiBotScamAction: ab.antiBotScamAction || 'TIMEOUT',
            antiBotScamTimeoutSeconds: ab.antiBotScamTimeoutMinutes ? Number(ab.antiBotScamTimeoutMinutes) * 60 : (Number(ab.antiBotScamTimeoutSeconds) || 86400)
          });
        }
        if (updates.antiBotScam) {
          const currentAb = modRepo.getAntiAbuseConfig(guildId) || {};
          const abs = updates.antiBotScam;
          modRepo.saveAntiAbuseConfig(guildId, {
            ...currentAb,
            antiBotScamEnabled: abs.enabled !== undefined ? Boolean(abs.enabled) : true,
            antiBotScamAction: abs.action || 'TIMEOUT',
            antiBotScamTimeoutSeconds: Number(abs.timeoutDurationSeconds) || 86400
          });
        }
        updated = {
          logChannelId: updates.channelId || updates.logChannelId || '',
          warnRules: modRepo.getEscalationRules(guildId),
          antiAbuse: modRepo.getAntiAbuseConfig(guildId)
        };
        break;
      }
      case 'music': {
        const { musicVoiceRepo } = this.services;
        if (!musicVoiceRepo) throw new Error('Serviço de música indisponível.');
        const payload = { ...updates };
        if (updates.djRoleId !== undefined) payload.djRoleId = updates.djRoleId || null;
        if (updates.defaultVolume !== undefined) payload.defaultVolume = Number(updates.defaultVolume) || 80;
        if (updates.maxQueueSize !== undefined) payload.maxQueueSize = Number(updates.maxQueueSize) || 100;
        if (updates.allowDuplicateTracks !== undefined) payload.allowDuplicateTracks = Boolean(updates.allowDuplicateTracks);
        if (updates.ttsEnabled !== undefined) payload.ttsEnabled = Boolean(updates.ttsEnabled);
        if (updates.ttsLanguage !== undefined) payload.ttsLanguage = updates.ttsLanguage || 'pt-BR';
        if (updates.autoDisconnectMinutes !== undefined) payload.autoDisconnectMinutes = Number(updates.autoDisconnectMinutes) || 5;
        if (updates.allowedTextChannelId !== undefined) payload.allowedTextChannelId = updates.allowedTextChannelId || null;
        if (updates.allowedVoiceChannelId !== undefined) payload.allowedVoiceChannelId = updates.allowedVoiceChannelId || null;
        updated = musicVoiceRepo.upsertMusicConfig(guildId, payload);
        break;
      }
      case 'casino':
      case 'apostas': {
        const { casinoRepo } = this.services;
        if (!casinoRepo) throw new Error('Serviço de cassino indisponível.');
        updated = casinoRepo.upsertCasinoConfig(guildId, updates);
        break;
      }
      case 'economy': {
        const { economyRepo, economyService, loanRepo } = this.services;
        if (!economyRepo) throw new Error('Serviço de economia indisponível.');

        if (updates.exchangeAction) {
          const { exchangeAction, currencyData } = updates;
          if (exchangeAction === 'CREATE' && currencyData) {
            economyRepo.createExchangeCurrency(guildId, currencyData);
          } else if (exchangeAction === 'UPDATE' && currencyData && currencyData.id) {
            economyRepo.updateExchangeCurrency(guildId, currencyData.id, currencyData);
          } else if (exchangeAction === 'DELETE' && currencyData && currencyData.id) {
            economyRepo.deleteExchangeCurrency(guildId, currencyData.id);
          } else if (exchangeAction === 'SIMULATE') {
            if (economyService && typeof economyService.simulateMarketCycle === 'function') {
              economyService.simulateMarketCycle(
                guildId,
                currencyData?.id || currencyData?.code || null,
                currencyData?.deltaPct ?? null,
                currencyData?.reason || null
              );
            }
          }
        } else if (updates.companyAction) {
          const { companyAction, companyData } = updates;
          if (companyAction === 'CREATE' && companyData) {
            economyRepo.createCompanyType(guildId, companyData);
          } else if (companyAction === 'UPDATE' && companyData && companyData.id) {
            economyRepo.updateCompanyType(guildId, companyData.id, companyData);
          } else if (companyAction === 'DELETE' && companyData && companyData.id) {
            economyRepo.deleteCompanyType(guildId, companyData.id);
          }
        } else {
          if (updates.loanConfig && loanRepo) {
            loanRepo.upsertLoanConfig(guildId, updates.loanConfig);
          }
          const payload = { ...updates };
          delete payload.loanConfig;
          if (updates.currencyName !== undefined) payload.currencyName = String(updates.currencyName).trim() || 'Moedas';
          if (updates.currencySymbol !== undefined) payload.currencySymbol = String(updates.currencySymbol).trim() || '🪙';
          if (updates.dailyAmount !== undefined) payload.dailyAmount = Number(updates.dailyAmount) || 500;
          if (updates.dailyCooldownSeconds !== undefined) payload.dailyCooldownSeconds = Number(updates.dailyCooldownSeconds) || 86400;
          if (updates.weeklyAmount !== undefined) payload.weeklyAmount = Number(updates.weeklyAmount) || 3000;
          if (updates.weeklyCooldownSeconds !== undefined) payload.weeklyCooldownSeconds = Number(updates.weeklyCooldownSeconds) || 604800;
          if (updates.workMin !== undefined) payload.workMin = Number(updates.workMin) || 50;
          if (updates.workMax !== undefined) payload.workMax = Number(updates.workMax) || 200;
          if (updates.workCooldownSeconds !== undefined) payload.workCooldownSeconds = Number(updates.workCooldownSeconds) || 3600;
          if (updates.crimeMin !== undefined) payload.crimeMin = Number(updates.crimeMin) || 100;
          if (updates.crimeMax !== undefined) payload.crimeMax = Number(updates.crimeMax) || 500;
          if (updates.crimeCooldownSeconds !== undefined) payload.crimeCooldownSeconds = Number(updates.crimeCooldownSeconds) || 7200;
          if (updates.crimeSuccessRate !== undefined) payload.crimeSuccessRate = Number(updates.crimeSuccessRate) || 0.6;
          if (updates.slutMin !== undefined) payload.slutMin = Number(updates.slutMin) || 80;
          if (updates.slutMax !== undefined) payload.slutMax = Number(updates.slutMax) || 350;
          if (updates.slutCooldownSeconds !== undefined) payload.slutCooldownSeconds = Number(updates.slutCooldownSeconds) || 7200;
          if (updates.slutSuccessRate !== undefined) payload.slutSuccessRate = Number(updates.slutSuccessRate) || 0.65;
          if (updates.robCooldownSeconds !== undefined) payload.robCooldownSeconds = Number(updates.robCooldownSeconds) || 7200;
          if (updates.robSuccessRate !== undefined) payload.robSuccessRate = Number(updates.robSuccessRate) || 0.45;
          if (updates.robFinePercent !== undefined) payload.robFinePercent = Number(updates.robFinePercent) || 0.25;
          if (updates.gambleMin !== undefined) payload.gambleMin = Number(updates.gambleMin) || 10;
          if (updates.gambleMax !== undefined) payload.gambleMax = Number(updates.gambleMax) || 50000;
          if (updates.gambleWinRate !== undefined) payload.gambleWinRate = Number(updates.gambleWinRate) || 0.48;
          if (updates.initialBalance !== undefined) payload.initialBalance = Number(updates.initialBalance) || 100;
          if (updates.bankStartingCapacity !== undefined) payload.bankStartingCapacity = Number(updates.bankStartingCapacity) || 5000;
          if (updates.bankUnlimited !== undefined) payload.bankUnlimited = updates.bankUnlimited ? 1 : 0;
          if (Object.keys(payload).length > 0) {
            economyRepo.upsertGuildConfig(guildId, payload);
          }
        }

        updated = {
          ...economyRepo.getGuildConfig(guildId),
          exchangeCurrencies: economyRepo.listExchangeCurrencies(guildId, false),
          companyTypes: economyRepo.listCompanyTypes(guildId, false),
          loanConfig: loanRepo ? loanRepo.getLoanConfig(guildId) : null
        };
        break;
      }
      case 'social':
      case 'marriage': {
        const { musicVoiceRepo } = this.services;
        if (!musicVoiceRepo) throw new Error('Serviço de casamento e social indisponível.');
        const payload = {};
        if (updates.marriageCost !== undefined) payload.marriageCost = Math.max(0, parseInt(updates.marriageCost, 10) || 0);
        if (updates.marriageEnabled !== undefined) payload.marriageEnabled = Boolean(updates.marriageEnabled);
        if (updates.shippingEnabled !== undefined) payload.shippingEnabled = Boolean(updates.shippingEnabled);
        if (updates.funCommandsEnabled !== undefined) payload.funCommandsEnabled = Boolean(updates.funCommandsEnabled);
        if (updates.gifsEnabled !== undefined) payload.gifsEnabled = Boolean(updates.gifsEnabled);
        updated = musicVoiceRepo.upsertSocialConfig(guildId, payload);
        break;
      }
      case 'quiz': {
        const { quizRepo } = this.services;
        if (!quizRepo) throw new Error('Serviço de Quiz indisponível.');
        const payload = {};
        if (updates.rewardCoins !== undefined) payload.rewardCoins = Math.max(0, parseInt(updates.rewardCoins, 10) || 0);
        if (updates.rewardXp !== undefined) payload.rewardXp = Math.max(0, parseInt(updates.rewardXp, 10) || 0);
        if (updates.defaultRounds !== undefined) payload.defaultRounds = Math.max(1, Math.min(20, parseInt(updates.defaultRounds, 10) || 5));
        if (updates.defaultTimeoutSeconds !== undefined) payload.defaultTimeoutSeconds = Math.max(10, Math.min(60, parseInt(updates.defaultTimeoutSeconds, 10) || 25));
        if (updates.allowedChannelId !== undefined) payload.allowedChannelId = updates.allowedChannelId || null;
        updated = quizRepo.saveQuizConfig(guildId, payload);
        break;
      }
      case 'custom_commands':
      case 'customcommands': {
        const { customCommandService, customCommandRepo, settingsService } = this.services;
        if (!customCommandService) throw new Error('Serviço de comandos personalizados indisponível.');

        if (updates.action === 'SET_PREFIX' || updates.prefix !== undefined || updates.prefixless_mode !== undefined) {
          if (settingsService) {
            if (updates.prefix !== undefined) {
              const pref = String(updates.prefix).trim().slice(0, 5);
              if (pref && pref !== '/') {
                settingsService.setSetting(guildId, 'prefix', pref, session.userId || 'web_admin');
              }
            }
            if (updates.prefixless_mode !== undefined) {
              const pMode = updates.prefixless_mode === true || updates.prefixless_mode === 'true' || updates.prefixless_mode === 1;
              settingsService.setSetting(guildId, 'prefixless_mode', pMode ? 'true' : 'false', session.userId || 'web_admin');
            }
          }
        }

        if (updates.action === 'UPDATE' || updates.originalName || updates.update) {
          const u = updates.update || updates;
          const origName = u.originalName || u.name;
          customCommandService.updateCommand(guildId, origName, {
            newName: (u.name && u.name !== origName) ? u.name : undefined,
            response: u.response,
            description: u.description,
            actorId: session.userId || 'web_admin',
            customPrefix: u.custom_prefix !== undefined ? u.custom_prefix : (u.customPrefix !== undefined ? u.customPrefix : null),
            requirePrefix: u.require_prefix !== undefined ? u.require_prefix : (u.requirePrefix !== undefined ? u.requirePrefix : (u.sem_prefixo ? 0 : 1)),
            matchMode: u.match_mode || u.matchMode || 'starts_with'
          });
        } else if (updates.action === 'CREATE' || updates.create) {
          const c = updates.create || updates;
          const cleanName = String(c.name || '').toLowerCase().trim();
          const existing = customCommandRepo ? customCommandRepo.getCommand(guildId, cleanName) : null;
          if (existing) {
            customCommandService.updateCommand(guildId, cleanName, {
              response: c.response,
              description: c.description,
              actorId: session.userId || 'web_admin',
              customPrefix: c.custom_prefix !== undefined ? c.custom_prefix : (c.customPrefix !== undefined ? c.customPrefix : null),
              requirePrefix: c.require_prefix !== undefined ? c.require_prefix : (c.requirePrefix !== undefined ? c.requirePrefix : (c.sem_prefixo ? 0 : 1)),
              matchMode: c.match_mode || c.matchMode || 'starts_with'
            });
          } else {
            customCommandService.createCommand(guildId, {
              name: c.name,
              response: c.response,
              description: c.description || 'Comando personalizado',
              creatorId: session.userId || 'web_admin',
              customPrefix: c.custom_prefix || c.customPrefix || c.prefix || null,
              requirePrefix: c.require_prefix !== undefined ? c.require_prefix : (c.requirePrefix !== undefined ? c.requirePrefix : (c.sem_prefixo ? 0 : 1)),
              matchMode: c.match_mode || c.matchMode || 'starts_with'
            });
          }
        } else if (updates.action === 'DELETE' || updates.delete || updates.deleteName) {
          const dName = updates.deleteName || updates.delete || updates.name;
          customCommandService.deleteCommand(guildId, dName, session.userId || 'web_admin');
        }
        updated = {
          commands: customCommandRepo.listCommands(guildId),
          placeholders: customCommandService.getPlaceholdersDocumentation()
        };
        break;
      }
      case 'xp': {
        const { xpRepo } = this.services;
        if (!xpRepo) throw new Error('Serviço de XP indisponível.');
        const payload = { ...updates };
        if (updates.channelId !== undefined) payload.levelUpChannelId = updates.channelId || null;
        if (updates.levelUpChannelId !== undefined) payload.levelUpChannelId = updates.levelUpChannelId || null;
        if (updates.cooldownSeconds !== undefined) payload.cooldownSeconds = Number(updates.cooldownSeconds) || 60;
        if (updates.minXp !== undefined) payload.minXp = Number(updates.minXp) || 15;
        if (updates.maxXp !== undefined) payload.maxXp = Number(updates.maxXp) || 25;
        if (updates.minMessageLength !== undefined) payload.minMessageLength = Number(updates.minMessageLength) || 5;
        if (updates.voiceXpEnabled !== undefined) payload.voiceXpEnabled = Boolean(updates.voiceXpEnabled);
        if (updates.voiceXpPerMinute !== undefined) payload.voiceXpPerMinute = Number(updates.voiceXpPerMinute) || 5;
        if (updates.formulaType !== undefined) payload.formulaType = String(updates.formulaType).toUpperCase();
        if (updates.xpPerLevelBase !== undefined) payload.xpPerLevelBase = Number(updates.xpPerLevelBase) || 100;
        if (updates.xpPerLevelIncrement !== undefined) payload.xpPerLevelIncrement = Number(updates.xpPerLevelIncrement) || 50;
        if (updates.xpPerLevelCurve !== undefined) payload.xpPerLevelCurve = Number(updates.xpPerLevelCurve) || 5;
        if (updates.levelUpMessageTemplate !== undefined) payload.levelUpMessageTemplate = updates.levelUpMessageTemplate || 'Parabéns {user}! Você avançou para o nível **{level}**!';
        if (updates.levelUpDm !== undefined) payload.levelUpDm = Boolean(updates.levelUpDm);
        updated = xpRepo.saveXpConfig(guildId, payload);
        break;
      }
      case 'xp_reward': {
        const { xpRepo } = this.services;
        if (!xpRepo) throw new Error('Serviço de XP indisponível.');
        if (updates.action === 'delete') {
          xpRepo.deleteLevelReward(guildId, Number(updates.levelRequired), updates.roleId);
        } else {
          xpRepo.addLevelReward(guildId, Number(updates.levelRequired), updates.roleId, updates.removePreviousRoles);
        }
        updated = { rewards: xpRepo.getLevelRewards(guildId) };
        break;
      }
      case 'xp_multiplier': {
        const { xpRepo } = this.services;
        if (!xpRepo) throw new Error('Serviço de XP indisponível.');
        if (updates.action === 'delete') {
          xpRepo.removeMultiplierOrBlock(guildId, updates.targetType, updates.targetId);
        } else {
          xpRepo.setMultiplierOrBlock(guildId, updates.targetType, updates.targetId, updates.multiplier, updates.isBlocked);
        }
        updated = { multipliers: xpRepo.getMultipliersAndBlocks(guildId) };
        break;
      }
      case 'bot_presence':
      case 'botpresence':
      case 'presence': {
        const { botPresenceRepo } = this.services;
        if (!botPresenceRepo) throw new Error('Serviço de presença do bot indisponível.');
        const updatedPresence = botPresenceRepo.updatePresence(updates);

        const client = this.botClient || this.services?.botClient || this.services?.webServer?.botClient;
        const { applyBotPresence } = require('../utils/presenceHelper');
        applyBotPresence(client, updatedPresence);
        updated = updatedPresence;
        break;
      }
      case 'ai_keys': {
        const { apiKeyRepo, llmAdapter } = this.services;
        if (!apiKeyRepo) throw new Error('Serviço de chaves de API indisponível.');
        const updatedKeys = apiKeyRepo.saveKeys(updates);
        const activeList = [updatedKeys.key1, updatedKeys.key2, updatedKeys.key3, updatedKeys.key4].filter(Boolean);
        if (llmAdapter && typeof llmAdapter.setApiKeys === 'function') {
          llmAdapter.setApiKeys(activeList);
        }
        updated = apiKeyRepo.getKeysStatus ? apiKeyRepo.getKeysStatus(llmAdapter) : updatedKeys;
        break;
      }
      case 'aimemory':
      case 'ai_memory':
      case 'memories': {
        const { memoryRepo } = this.services;
        if (!memoryRepo) throw new Error('Repositório de memória da IA indisponível.');
        if (updates.action === 'SAVE' || updates.save) {
          const key = String(updates.key || '').trim().toLowerCase().slice(0, 64);
          const value = String(updates.value || '').trim();
          if (!key || !value) throw new ValidationError('Chave e conteúdo da memória são obrigatórios.');
          memoryRepo.saveGuildMemory({
            guildId,
            key,
            value,
            createdBy: session.userId || 'web_admin'
          });
        } else if (updates.action === 'DELETE' || updates.delete) {
          const key = String(updates.key || updates.delete || '').trim().toLowerCase();
          if (key) {
            memoryRepo.deleteGuildMemory(guildId, key);
          }
        }
        updated = {
          memories: memoryRepo.listGuildMemories(guildId)
        };
        break;
      }
      case 'bot_speak':
      case 'botspeak':
      case 'send_message': {
        // Support sending via a specific Multi-Bot instance when botId is selected
        const targetInstanceId = (updates.botId && updates.botId !== 'MAIN' && updates.botId !== 'PRIMARY')
          ? updates.botId
          : (botId && botId !== 'MAIN' && botId !== 'PRIMARY' ? botId : null);

        if (targetInstanceId && this.services?.multiBotManager) {
          const speakRes = await this.services.multiBotManager.speakWithInstance(
            targetInstanceId,
            {
              guildId,
              channelId: updates.channelId,
              content: updates.content,
              embed: updates.embed
            },
            this.botClient
          );
          savedResult = speakRes;
          break;
        }

        const botGuild = this.botClient?.guilds?.cache?.get(guildId);
        if (!botGuild) throw new Error('Bot não está conectado ou indisponível neste servidor.');
        const channelId = updates.channelId;
        if (!channelId) throw new ValidationError('Selecione um canal de texto para enviar a mensagem.');
        const channel = botGuild.channels.cache.get(channelId);
        if (!channel || !channel.isTextBased()) throw new ValidationError('Canal de texto inválido ou sem permissão de envio.');

        const rawContent = updates.content ? String(updates.content).trim() : '';
        const rawEmbedData = updates.embed;

        if (!rawContent && (!rawEmbedData || (!rawEmbedData.title && !rawEmbedData.description && !rawEmbedData.fields?.length && !rawEmbedData.image))) {
          throw new ValidationError('A mensagem precisa conter um texto ou uma embed com título/descrição!');
        }

        const { resolveCustomEmojis, resolveEmbedEmojis } = require('../utils/emojiHelper');
        const content = rawContent ? resolveCustomEmojis(rawContent, this.botClient, guildId) : '';
        const embedData = rawEmbedData ? resolveEmbedEmojis(rawEmbedData, this.botClient, guildId) : null;

        const { EmbedBuilder } = require('discord.js');
        const payload = {};
        if (content) payload.content = content;

        if (embedData && (embedData.title || embedData.description || embedData.fields?.length || embedData.image)) {
          const eb = new EmbedBuilder();
          if (embedData.title) eb.setTitle(String(embedData.title).slice(0, 256));
          if (embedData.url) {
            try { new URL(embedData.url); eb.setURL(embedData.url); } catch {}
          }
          if (embedData.description) eb.setDescription(String(embedData.description).slice(0, 4096));
          if (embedData.color) {
            const hex = String(embedData.color).replace('#', '');
            const intVal = parseInt(hex, 16);
            if (!isNaN(intVal)) eb.setColor(intVal);
          } else {
            eb.setColor(0x00E5FF);
          }
          if (embedData.author?.name) {
            eb.setAuthor({
              name: String(embedData.author.name).slice(0, 256),
              iconURL: embedData.author.icon || undefined
            });
          }
          if (embedData.footer?.text) {
            eb.setFooter({
              text: String(embedData.footer.text).slice(0, 2048),
              iconURL: embedData.footer.icon || undefined
            });
          }
          if (embedData.image) eb.setImage(embedData.image);
          if (embedData.thumbnail) eb.setThumbnail(embedData.thumbnail);

          if (Array.isArray(embedData.fields)) {
            for (const f of embedData.fields) {
              if (f.name && f.value) {
                eb.addFields({
                  name: String(f.name).slice(0, 256),
                  value: String(f.value).slice(0, 1024),
                  inline: Boolean(f.inline)
                });
              }
            }
          }
          payload.embeds = [eb];
        }

        const sent = await channel.send(payload);
        if (this.auditService) {
          this.auditService.logAction({
            guildId,
            actorId: session.userId || 'web_admin',
            action: 'BOT_SPEAK_MESSAGE',
            targetId: channelId,
            details: {
              channelName: channel.name,
              messageId: sent.id,
              hasContent: Boolean(content),
              hasEmbed: Boolean(payload.embeds)
            }
          });
        }

        updated = {
          status: 'success',
          messageId: sent.id,
          channelId,
          channelName: channel.name
        };
        break;
      }
      case 'social_alerts':
      case 'socialalerts':
      case 'alerts': {
        const { socialAlertService, socialAlertRepo } = this.services;
        if (!socialAlertService || !socialAlertRepo) throw new Error('Serviço de alertas sociais indisponível.');
        if (updates.action === 'CREATE' || updates.add) {
          socialAlertService.addAlert(guildId, updates.platform, updates.sourceId, updates.channelTargetId, updates.customMessage);
        } else if (updates.action === 'DELETE' || updates.delete) {
          socialAlertService.removeAlert(guildId, updates.id);
        } else if (updates.action === 'TEST') {
          await socialAlertService.dispatchTestAlert(this.botClient, updates.id, guildId);
        }
        updated = socialAlertRepo.listAlerts(guildId);
        break;
      }
      case 'backup':
      case 'backups': {
        const { backupSecurityService } = this.services;
        if (!backupSecurityService) throw new Error('Serviço de backups indisponível.');
        if (updates.action === 'CREATE' || updates.create) {
          let guild = this.botClient?.guilds?.cache?.get(guildId);
          if (!guild || (guild.channels?.cache?.size || 0) === 0) {
            const mb = this.services?.multiBotManager;
            if (mb?.activeInstances) {
              for (const [, inst] of mb.activeInstances) {
                const g = inst.client?.guilds?.cache?.get(guildId);
                if (g && (g.channels?.cache?.size || 0) > 0) {
                  guild = g;
                  break;
                }
              }
            }
          }
          if (!guild) {
            guild = { id: guildId, name: 'Servidor', roles: { cache: new Map() }, channels: { cache: new Map() } };
          }
          backupSecurityService.createBackup(guild, updates.name || `backup_${Date.now()}`, session.userId);
        } else if (updates.action === 'DELETE' || updates.delete) {
          if (backupSecurityService.backupRepo) {
            backupSecurityService.backupRepo.deleteBackup(updates.id);
          }
        }
        updated = backupSecurityService.listBackups(guildId);
        break;
      }
      case 'guild_modules':
      case 'modular_configs':
      case 'modules': {
        const gms = this.services.guildModuleService;
        if (!gms) throw new Error('Serviço de controle modular indisponível.');
        const modulesToSet = updates.modules || updates;
        updated = gms.setGuildModules(guildId, modulesToSet, session.userId);

        // Immediate 0ms propagation to Discord slash commands for this guild
        if (this.botClient?.token && this.botClient?.user?.id) {
          try {
            const activeMods = Object.entries(updated).filter(([, v]) => v === true).map(([k]) => k);
            const { commandRegistry } = require('../commands/commandRegistry');
            commandRegistry.deployGuildCommands(this.botClient.token, this.botClient.user.id, guildId, activeMods).catch(() => {});
          } catch {}
        }
        break;
      }
      case 'tempbans':
      case 'temp_bans': {
        const { moderationService } = this.services;
        if (updates.action === 'CANCEL' || updates.cancel) {
          const targetUserId = updates.userId || updates.id;
          if (!targetUserId) throw new ValidationError('ID do usuário é obrigatório para cancelar o banimento.');
          const botGuild = this.botClient?.guilds?.cache?.get(guildId) || { id: guildId, bans: { remove: async () => {} } };
          if (moderationService && typeof moderationService.cancelTempban === 'function') {
            await moderationService.cancelTempban(botGuild, { id: session.userId }, targetUserId, { reason: updates.reason || 'Cancelado via painel web' });
          }
        }
        updated = modRepo ? modRepo.getActiveTempBans(guildId) : [];
        break;
      }
      case 'anti_bot_scam':
      case 'antibotscam': {
        if (!modRepo) throw new Error('Serviço de moderação indisponível.');
        const currentAb = modRepo.getAntiAbuseConfig(guildId) || {};
        const abs = updates;
        modRepo.saveAntiAbuseConfig(guildId, {
          ...currentAb,
          antiBotScamEnabled: abs.enabled !== undefined ? Boolean(abs.enabled) : true,
          antiBotScamAction: String(abs.action || 'TIMEOUT').toUpperCase(),
          antiBotScamTimeoutSeconds: Number(abs.timeoutDurationSeconds) || 86400
        });
        const saved = modRepo.getAntiAbuseConfig(guildId) || {};
        const isEnabled = saved.antiBotScamEnabled !== undefined
          ? Boolean(saved.antiBotScamEnabled)
          : (saved.anti_bot_scam_enabled === 1 || saved.anti_bot_scam_enabled === true);
        updated = {
          enabled: isEnabled,
          action: saved.antiBotScamAction || saved.anti_bot_scam_action || 'TIMEOUT',
          timeoutDurationSeconds: saved.antiBotScamTimeoutSeconds || saved.anti_bot_scam_timeout_seconds || 86400
        };
        break;
      }
      case 'summaries':
      case 'channel_summaries': {
        if (updates.action === 'DELETE' && updates.id) {
          this.deleteChannelSummary(session, guildId, updates.id);
        }
        updated = {
          summaries: this.listChannelSummaries(session, guildId, 20)
        };
        break;
      }
      case 'help':
      case 'help_menu':
      case 'ajuda': {
        const { botConfig } = require('../config/botConfig');
        const currentHelp = botConfig.getConfig()?.help || {};
        const merged = { ...currentHelp, ...updates };
        botConfig.updateSection('help', merged);
        try {
          const existing = this.settingsService?.getSetting?.(guildId, 'help_menu_config');
          const existingObj = existing ? JSON.parse(existing) : {};
          const updatedGuildHelp = { ...existingObj, ...updates };
          this.settingsService?.setSetting?.(guildId, 'help_menu_config', JSON.stringify(updatedGuildHelp), session.userId);
        } catch {}
        if (updates.enabled !== undefined && this.botClient?.token && this.botClient?.user?.id) {
          try {
            const { commandRegistry } = require('../commands/commandRegistry');
            const gms = this.services.guildModuleService;
            const guildMods = gms?.getGuildModules ? gms.getGuildModules(guildId) : null;
            const activeMods = guildMods ? Object.entries(guildMods).filter(([, v]) => v === true).map(([k]) => k) : null;
            commandRegistry.deployGuildCommands(
              this.botClient.token,
              this.botClient.user.id,
              guildId,
              activeMods,
              null,
              updates.enabled !== false
            ).catch(() => {});
          } catch {}
        }
        updated = merged;
        break;
      }
      default:
        throw new ValidationError(`Módulo desconhecido: "${moduleName}".`);
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
