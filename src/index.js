if (!process.env.LOG_FORMAT) process.env.LOG_FORMAT = 'pretty';
const { Client, GatewayIntentBits, Partials } = require('discord.js');
const { config } = require('./config/env');
const { botConfig } = require('./config/botConfig');
const { logger } = require('./utils/logger');
const { setupGlobalErrorHandlers } = require('./utils/errorHandler');
const { dbManager } = require('./database/connection');
const { Migrator } = require('./database/migrator');

// Repositories
const { GuildRepository } = require('./database/repositories/guildRepository');
const { SettingsRepository } = require('./database/repositories/settingsRepository');
const { UserRepository } = require('./database/repositories/userRepository');
const { AuditRepository } = require('./database/repositories/auditRepository');
const { MemoryRepository } = require('./database/repositories/memoryRepository');
const { NotesRepository } = require('./database/repositories/notesRepository');
const { BackupRepository } = require('./database/repositories/backupRepository');
const { ProtectionRepository } = require('./database/repositories/protectionRepository');
const { LockdownRepository } = require('./database/repositories/lockdownRepository');
const { ModerationRepository } = require('./database/repositories/moderationRepository');
const { XpRepository } = require('./database/repositories/xpRepository');
const { EconomyRepository } = require('./database/repositories/economyRepository');
const { MusicVoiceRepository } = require('./database/repositories/musicVoiceRepository');
const { TicketRepository } = require('./database/repositories/ticketRepository');
const { ReviewRepository } = require('./database/repositories/reviewRepository');
const { CommunityRepository } = require('./database/repositories/communityRepository');
const { WebSessionRepository } = require('./database/repositories/webSessionRepository');
const { AutomationRepository } = require('./database/repositories/automationRepository');
const { BotPresenceRepository } = require('./database/repositories/botPresenceRepository');
const { CasinoRepository } = require('./database/repositories/casinoRepository');
const { QuizRepository } = require('./database/repositories/quizRepository');
const { CustomCommandRepository } = require('./database/repositories/customCommandRepository');
const { LoanRepository } = require('./database/repositories/loanRepository');
const { SocialAlertRepository } = require('./database/repositories/socialAlertRepository');

// Services
const { AuditService } = require('./services/auditService');
const { SettingsService } = require('./services/settingsService');
const { PermissionService } = require('./services/permissionService');
const { IdentityService } = require('./services/identityService');
const { hierarchyService } = require('./services/hierarchyService');
const { ServerAdminService } = require('./services/serverAdminService');
const { BackupSecurityService } = require('./services/backupSecurityService');
const { LockdownService } = require('./services/lockdownService');
const { ModerationService } = require('./services/moderationService');
const { WarnEscalationService } = require('./services/warnEscalationService');
const { ProtectionService } = require('./services/protectionService');
const { LogDispatchService } = require('./services/logDispatchService');
const { progressionFormulaService } = require('./services/progressionFormulaService');
const { ExperienceService } = require('./services/experienceService');
const { EconomyService } = require('./services/economyService');
const { LoanService } = require('./services/loanService');
const { BlackjackService } = require('./services/blackjackService');
const { MusicService } = require('./services/musicService');
const { SocialFunService } = require('./services/socialFunService');
const { QuizService } = require('./services/quizService');
const { CustomCommandService } = require('./services/customCommandService');
const { TicketService } = require('./services/ticketService');
const { ReviewService } = require('./services/reviewService');
const { CommunityService } = require('./services/communityService');
const { WebPanelService } = require('./services/webPanelService');
const { AutomationService } = require('./services/automationService');
const { BadgeService } = require('./services/badgeService');
const { PredictionService } = require('./services/predictionService');
const { GossipService } = require('./services/gossipService');
const { SocialAlertService } = require('./services/socialAlertService');

// Web Server
const { WebServer } = require('./web/server');

// AI Core
const { GeminiAdapter } = require('./ai/adapters/geminiAdapter');
const { toolRegistry } = require('./ai/tools/toolRegistry');
const { fridayTools } = require('./ai/tools/fridayTools');
const { adminTools } = require('./ai/tools/adminTools');
const { moderationTools } = require('./ai/tools/moderationTools');
const { xpTools } = require('./ai/tools/xpTools');
const { economyTools } = require('./ai/tools/economyTools');
const { musicVoiceTools } = require('./ai/tools/musicVoiceTools');
const { communityTools } = require('./ai/tools/communityTools');
const { automationTools } = require('./ai/tools/automationTools');
const { AIOrchestrator } = require('./ai/orchestrator');

// Commands
const { commandRegistry } = require('./commands/commandRegistry');
const { prefixCommandHandler } = require('./handlers/prefixCommandHandler');
const pingCommand = require('./commands/infrastructure/ping');
const helpCommand = require('./commands/infrastructure/help');
const aiStatusCommand = require('./commands/ai/aiStatus');
const aiNameCommand = require('./commands/ai/aiName');
const memoryCommand = require('./commands/ai/memory');

// Admin Commands
const roleCommand = require('./commands/admin/role');
const channelCommand = require('./commands/admin/channel');
const lockdownCommand = require('./commands/admin/lockdown');
const backupCommand = require('./commands/admin/backup');
const auditSecurityCommand = require('./commands/admin/auditSecurity');

// Moderation Commands
const punishCommand = require('./commands/moderation/punish');
const historyCommand = require('./commands/moderation/history');
const warnlistCommand = require('./commands/moderation/warnlist');
const purgeCommand = require('./commands/moderation/purge');
const configModCommand = require('./commands/moderation/configMod');

// XP Commands
const rankCommand = require('./commands/xp/rank');
const leaderboardCommand = require('./commands/xp/leaderboard');
const xpAdminCommand = require('./commands/xp/xpAdmin');
const configXpCommand = require('./commands/xp/configXp');

// Economy Commands
const balanceCommand = require('./commands/economy/balance');
const depositCommand = require('./commands/economy/deposit');
const withdrawCommand = require('./commands/economy/withdraw');
const transferCommand = require('./commands/economy/transfer');
const workCommand = require('./commands/economy/work');
const dailyCommand = require('./commands/economy/daily');
const weeklyCommand = require('./commands/economy/weekly');
const crimeCommand = require('./commands/economy/crime');
const slutCommand = require('./commands/economy/slut');
const robCommand = require('./commands/economy/rob');
const gambleCommand = require('./commands/economy/gamble');
const shopCommand = require('./commands/economy/shop');
const inventoryCommand = require('./commands/economy/inventory');
const ecoAdminCommand = require('./commands/economy/ecoAdmin');
const richLeaderboardCommand = require('./commands/economy/richLeaderboard');
const exchangeCommand = require('./commands/economy/exchange');
const loanCommand = require('./commands/economy/loan');

// Music & Voice Commands
const playCommand = require('./commands/music/play');
const pauseCommand = require('./commands/music/pause');
const resumeCommand = require('./commands/music/resume');
const skipCommand = require('./commands/music/skip');
const stopCommand = require('./commands/music/stop');
const queueCommand = require('./commands/music/queue');
const nowPlayingCommand = require('./commands/music/nowPlaying');
const volumeCommand = require('./commands/music/volume');
const loopCommand = require('./commands/music/loop');
const shuffleCommand = require('./commands/music/shuffle');
const connectVoiceCommand = require('./commands/music/connectVoice');
const disconnectVoiceCommand = require('./commands/music/disconnectVoice');
const ttsCommand = require('./commands/music/tts');
const configMusicCommand = require('./commands/music/configMusic');

// Social & Fun Commands
const interactCommand = require('./commands/social/interact');
const shipCommand = require('./commands/social/ship');
const marryCommand = require('./commands/social/marry');
const divorceCommand = require('./commands/social/divorce');
const relationshipCommand = require('./commands/social/relationship');
const diceCommand = require('./commands/social/dice');
const coinflipCommand = require('./commands/social/coinflip');
const eightBallCommand = require('./commands/social/eightBall');
const raffleCommand = require('./commands/social/raffle');
const pollCommand = require('./commands/social/poll');
const kissCommand = require('./commands/social/kiss');
const genderCommand = require('./commands/social/gender');
const hugCommand = require('./commands/social/hug');
const quizCommand = require('./commands/social/quiz');
const profileCommand = require('./commands/social/profile');
const bioCommand = require('./commands/social/bio');

// Tickets, Reviews & Community Commands
const ticketCommand = require('./commands/tickets/ticket');
const reviewCommand = require('./commands/reviews/review');
const reviewStatsCommand = require('./commands/reviews/reviewStats');
const respondReviewCommand = require('./commands/reviews/respondReview');
const welcomeCommand = require('./commands/community/welcome');
const autoroleCommand = require('./commands/community/autorole');
const suggestionCommand = require('./commands/community/suggestion');
const starboardCommand = require('./commands/community/starboard');
const customcmdCommand = require('./commands/community/customcmd');
const prefixCommand = require('./commands/admin/prefix');

// Automation & Productivity Commands
const configCommand = require('./commands/admin/config');
const reminderCommand = require('./commands/automations/reminder');
const taskCommand = require('./commands/automations/task');
const briefingCommand = require('./commands/automations/briefing');
const utilityCommand = require('./commands/automations/utility');
const alertaCommand = require('./commands/automations/alerta');
const resumoCommand = require('./commands/community/resumo');

// Event Loader
const { loadEvents } = require('./events/eventLoader');

const appLogger = logger.forContext('Bootstrap');

let client = null;
let appContext = null;
let isShuttingDown = false;

/**
 * Initializes database, migrations, repositories, services, tools, and registers commands.
 */
function createAppContext(customDbPath = null) {
  // 1. Connect SQLite database
  const targetDbPath = customDbPath || config.databasePath;
  dbManager.connect(targetDbPath);

  // 2. Run versioned migrations
  const migrator = new Migrator(dbManager);
  migrator.runPendingMigrations();

  // 3. Initialize Repositories (DAL)
  const guildRepo = new GuildRepository(dbManager);
  const settingsRepo = new SettingsRepository(dbManager);
  const userRepo = new UserRepository(dbManager);
  const auditRepo = new AuditRepository(dbManager);
  const memoryRepo = new MemoryRepository(dbManager);
  const notesRepo = new NotesRepository(dbManager);
  const backupRepo = new BackupRepository(dbManager);
  const protectionRepo = new ProtectionRepository(dbManager);
  const lockdownRepo = new LockdownRepository(dbManager);
  const moderationRepo = new ModerationRepository(dbManager);
  const xpRepo = new XpRepository(dbManager);
  const economyRepo = new EconomyRepository(dbManager);
  const musicVoiceRepo = new MusicVoiceRepository(dbManager);
  const ticketRepo = new TicketRepository(dbManager);
  const reviewRepo = new ReviewRepository(dbManager);
  const communityRepo = new CommunityRepository(dbManager);
  const webSessionRepo = new WebSessionRepository(dbManager);
  const automationRepo = new AutomationRepository(dbManager);
  const botPresenceRepo = new BotPresenceRepository(dbManager);
  const casinoRepo = new CasinoRepository(dbManager);
  const quizRepo = new QuizRepository(dbManager);
  const customCommandRepo = new CustomCommandRepository(dbManager);
  const loanRepo = new LoanRepository(dbManager);
  const socialAlertRepo = new SocialAlertRepository(dbManager);

  // 4. Initialize Core & Admin Services
  const auditService = new AuditService(auditRepo);
  const settingsService = new SettingsService(settingsRepo, auditService);
  auditService.settingsService = settingsService;
  const permissionService = new PermissionService();
  const identityService = new IdentityService(settingsService, auditService, config.defaultAiName);
  const serverAdminService = new ServerAdminService(hierarchyService, auditService, protectionRepo);
  const backupSecurityService = new BackupSecurityService(backupRepo, auditService);
  const lockdownService = new LockdownService(lockdownRepo, auditService);

  // 5. Initialize Moderation & Protection Services
  const logDispatchService = new LogDispatchService(moderationRepo, identityService);
  const warnEscalationService = new WarnEscalationService(moderationRepo);
  const moderationService = new ModerationService({
    modRepo: moderationRepo,
    hierarchyService,
    auditService,
    warnEscalationService,
    logDispatchService
  });
  warnEscalationService.setModerationService(moderationService);

  const protectionService = new ProtectionService(moderationRepo, moderationService, auditService);

  // 6. Initialize XP & Progression Services
  const experienceService = new ExperienceService({
    xpRepo,
    formulaService: progressionFormulaService,
    identityService,
    auditService
  });

  // 7. Initialize Economy Service
  const economyService = new EconomyService({
    economyRepo,
    identityService,
    casinoRepo,
    auditService
  });

  const blackjackService = new BlackjackService({
    economyService,
    casinoRepo,
    auditService
  });

  const loanService = new LoanService({
    loanRepo,
    economyRepo,
    economyService,
    experienceService,
    identityService
  });
  economyService.setLoanService(loanService);

  // 8. Initialize Music, Voice & Social Fun Services
  const musicService = new MusicService({
    musicVoiceRepo,
    identityService,
    auditService
  });

  const socialFunService = new SocialFunService({
    musicVoiceRepo,
    identityService,
    auditService,
    economyService
  });

  const quizService = new QuizService({
    quizRepo,
    economyService,
    experienceService,
    identityService,
    auditService
  });

  const customCommandService = new CustomCommandService({
    customCommandRepo,
    economyService,
    experienceService,
    identityService,
    auditService
  });

  // 9. Initialize Tickets, Reviews & Community Services
  const ticketService = new TicketService({
    ticketRepo,
    identityService,
    auditService
  });

  const reviewService = new ReviewService({
    reviewRepo,
    identityService,
    auditService
  });

  const communityService = new CommunityService({
    communityRepo,
    identityService,
    auditService
  });

  // 10. Initialize Automations & Web Panel Services
  const automationService = new AutomationService({
    automationRepo,
    botPresenceRepo,
    identityService,
    auditService,
    extraServices: {
      modRepo: moderationRepo,
      xpRepo,
      economyRepo,
      ticketRepo,
      reviewRepo,
      communityRepo
    }
  });

  const { ApiKeyRepository } = require('./database/repositories/apiKeyRepository');
  const apiKeyRepo = new ApiKeyRepository(dbManager);

  // Load Gemini API Keys from DB or ENV (supports up to 4 keys with automatic quota rotation)
  let dbKeys = apiKeyRepo.getKeys();
  const envKeys = [
    process.env.GEMINI_API_KEY,
    process.env.GEMINI_API_KEY_2,
    process.env.GEMINI_API_KEY_3,
    process.env.GEMINI_API_KEY_4
  ].filter(Boolean);

  // If DB has no keys configured, seed from ENV
  if (!dbKeys.key1 && envKeys.length > 0) {
    dbKeys = apiKeyRepo.saveKeys({
      key1: envKeys[0] || '',
      key2: envKeys[1] || '',
      key3: envKeys[2] || '',
      key4: envKeys[3] || ''
    });
  }

  const activeApiKeys = [dbKeys.key1, dbKeys.key2, dbKeys.key3, dbKeys.key4].filter(Boolean);
  if (activeApiKeys.length === 0 && envKeys.length > 0) {
    activeApiKeys.push(...envKeys);
  }

  // 11. Initialize AI Core & Tool Catalog
  const { botConfig } = require('./config/botConfig');
  const activeBotConfig = botConfig.getConfig();
  const llmAdapter = new GeminiAdapter({
    apiKeys: activeApiKeys,
    model: activeBotConfig.ai?.model || process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite'
  });

  const badgeService = new BadgeService(dbManager);
  const predictionService = new PredictionService(dbManager);
  const gossipService = new GossipService({ llmAdapter, botConfig });
  const socialAlertService = new SocialAlertService(socialAlertRepo, auditService);
  loanService.badgeService = badgeService;

  const webPanelService = new WebPanelService({
    webSessionRepo,
    identityService,
    settingsService,
    auditService,
    services: {
      modRepo: moderationRepo,
      ticketRepo,
      reviewRepo,
      communityRepo,
      automationRepo,
      musicVoiceRepo,
      economyRepo,
      economyService,
      loanRepo,
      loanService,
      moderationService,
      experienceService,
      warnEscalationService,
      casinoRepo,
      quizRepo,
      quizService,
      customCommandRepo,
      customCommandService,
      xpRepo,
      botPresenceRepo,
      apiKeyRepo,
      llmAdapter,
      memoryRepo,
      badgeService,
      predictionService,
      gossipService,
      socialAlertRepo,
      socialAlertService,
      backupSecurityService,
      backupRepo,
      guildRepo,
      settingsService
    },
    botClient: client
  });

  const webServer = new WebServer({
    webPanelService,
    port: parseInt(process.env.PORT, 10) || 3000
  });

  // Register all Friday tools, Admin tools, Moderation tools, XP tools, Economy tools and Music/Voice tools
  for (const tool of fridayTools) {
    if (!toolRegistry.has(tool.name)) toolRegistry.register(tool);
  }
  for (const tool of adminTools) {
    if (!toolRegistry.has(tool.name)) toolRegistry.register(tool);
  }
  for (const tool of moderationTools) {
    if (!toolRegistry.has(tool.name)) toolRegistry.register(tool);
  }
  for (const tool of xpTools) {
    if (!toolRegistry.has(tool.name)) toolRegistry.register(tool);
  }
  for (const tool of economyTools) {
    if (!toolRegistry.has(tool.name)) toolRegistry.register(tool);
  }
  for (const tool of musicVoiceTools) {
    if (!toolRegistry.has(tool.name)) toolRegistry.register(tool);
  }
  for (const tool of communityTools) {
    if (!toolRegistry.has(tool.name)) toolRegistry.register(tool);
  }
  for (const tool of automationTools) {
    if (!toolRegistry.has(tool.name)) toolRegistry.register(tool);
  }

  const aiOrchestrator = new AIOrchestrator({
    llmAdapter,
    toolRegistry,
    memoryRepo,
    notesRepo,
    identityService,
    permissionService,
    auditService,
    services: {
      xpRepository: xpRepo,
      xpRepo,
      experienceService,
      economyRepository: economyRepo,
      economyRepo,
      economyService,
      loanService,
      serverAdminService,
      moderationRepository: moderationRepo,
      moderationRepo,
      moderationService,
      protectionService,
      musicService,
      socialFunService,
      quizService,
      ticketService,
      reviewRepository: reviewRepo,
      reviewRepo,
      reviewService,
      communityRepository: communityRepo,
      communityRepo,
      communityService,
      automationService,
      lockdownService,
      backupSecurityService,
      userRepo,
      badgeService,
      predictionService,
      gossipService,
      socialAlertRepo,
      socialAlertService,
      dbManager,
      llmAdapter
    }
  });

  // 10. Register Commands
  commandRegistry.register(pingCommand);
  commandRegistry.register(helpCommand);
  commandRegistry.register(aiStatusCommand);
  commandRegistry.register(aiNameCommand);
  commandRegistry.register(memoryCommand);
  commandRegistry.register(roleCommand);
  commandRegistry.register(channelCommand);
  commandRegistry.register(lockdownCommand);
  commandRegistry.register(backupCommand);
  commandRegistry.register(auditSecurityCommand);
  commandRegistry.register(punishCommand);
  commandRegistry.register(historyCommand);
  commandRegistry.register(warnlistCommand);
  commandRegistry.register(purgeCommand);
  commandRegistry.register(configModCommand);
  commandRegistry.register(rankCommand);
  commandRegistry.register(leaderboardCommand);
  commandRegistry.register(xpAdminCommand);
  commandRegistry.register(configXpCommand);

  // Economy Commands
  commandRegistry.register(balanceCommand);
  commandRegistry.register(depositCommand);
  commandRegistry.register(withdrawCommand);
  commandRegistry.register(transferCommand);
  commandRegistry.register(workCommand);
  commandRegistry.register(dailyCommand);
  commandRegistry.register(weeklyCommand);
  commandRegistry.register(crimeCommand);
  commandRegistry.register(slutCommand);
  commandRegistry.register(robCommand);
  commandRegistry.register(gambleCommand);
  commandRegistry.register(shopCommand);
  commandRegistry.register(inventoryCommand);
  commandRegistry.register(ecoAdminCommand);
  commandRegistry.register(richLeaderboardCommand);
  commandRegistry.register(exchangeCommand);
  commandRegistry.register(loanCommand);

  // Music & Voice Commands
  commandRegistry.register(playCommand);
  commandRegistry.register(pauseCommand);
  commandRegistry.register(resumeCommand);
  commandRegistry.register(skipCommand);
  commandRegistry.register(stopCommand);
  commandRegistry.register(queueCommand);
  commandRegistry.register(nowPlayingCommand);
  commandRegistry.register(volumeCommand);
  commandRegistry.register(loopCommand);
  commandRegistry.register(shuffleCommand);
  commandRegistry.register(connectVoiceCommand);
  commandRegistry.register(disconnectVoiceCommand);
  commandRegistry.register(ttsCommand);
  commandRegistry.register(configMusicCommand);

  // Social & Fun Commands
  commandRegistry.register(interactCommand);
  commandRegistry.register(shipCommand);
  commandRegistry.register(marryCommand);
  commandRegistry.register(divorceCommand);
  commandRegistry.register(relationshipCommand);
  commandRegistry.register(diceCommand);
  commandRegistry.register(coinflipCommand);
  commandRegistry.register(eightBallCommand);
  commandRegistry.register(raffleCommand);
  commandRegistry.register(pollCommand);
  commandRegistry.register(kissCommand);
  commandRegistry.register(genderCommand);
  commandRegistry.register(hugCommand);
  commandRegistry.register(quizCommand);
  commandRegistry.register(profileCommand);
  commandRegistry.register(bioCommand);

  // Tickets, Reviews & Community Commands
  commandRegistry.register(ticketCommand);
  commandRegistry.register(reviewCommand);
  commandRegistry.register(reviewStatsCommand);
  commandRegistry.register(respondReviewCommand);
  commandRegistry.register(welcomeCommand);
  commandRegistry.register(autoroleCommand);
  commandRegistry.register(suggestionCommand);
  commandRegistry.register(starboardCommand);
  commandRegistry.register(customcmdCommand);
  commandRegistry.register(prefixCommand);

  // Automation & Productivity Commands
  commandRegistry.register(configCommand);
  commandRegistry.register(reminderCommand);
  commandRegistry.register(taskCommand);
  commandRegistry.register(briefingCommand);
  commandRegistry.register(utilityCommand);
  commandRegistry.register(alertaCommand);
  commandRegistry.register(resumoCommand);

  return {
    dbManager,
    migrator,
    guildRepo,
    settingsRepo,
    userRepo,
    auditRepo,
    memoryRepo,
    notesRepo,
    backupRepo,
    protectionRepo,
    lockdownRepo,
    moderationRepo,
    xpRepo,
    economyRepo,
    musicVoiceRepo,
    ticketRepo,
    reviewRepo,
    communityRepo,
    webSessionRepo,
    automationRepo,
    botPresenceRepo,
    casinoRepo,
    quizRepo,
    customCommandRepo,
    loanRepo,
    socialAlertRepo,
    customCommandService,
    auditService,
    settingsService,
    permissionService,
    identityService,
    hierarchyService,
    serverAdminService,
    backupSecurityService,
    lockdownService,
    moderationService,
    warnEscalationService,
    protectionService,
    logDispatchService,
    progressionFormulaService,
    experienceService,
    economyService,
    loanService,
    blackjackService,
    musicService,
    socialFunService,
    quizService,
    ticketService,
    reviewService,
    communityService,
    webPanelService,
    automationService,
    badgeService,
    predictionService,
    gossipService,
    socialAlertService,
    webServer,
    llmAdapter,
    toolRegistry,
    aiOrchestrator,
    commandRegistry
  };
}

/**
 * Graceful shutdown procedure.
 * @param {string} signal
 */
async function shutdown(signal = 'SIGTERM') {
  if (isShuttingDown) return;
  isShuttingDown = true;

  appLogger.info(`Graceful shutdown initiated (${signal})...`);

  try {
    if (appContext && appContext.socialAlertService) {
      appContext.socialAlertService.stopPolling();
    }

    if (appContext && appContext.webServer) {
      appLogger.info('Stopping Web Server...');
      await appContext.webServer.stop();
    }

    if (client) {
      appLogger.info('Destroying Discord client connection...');
      await client.destroy();
      client = null;
    }

    appLogger.info('Closing database connection...');
    dbManager.close();

    appLogger.info('Graceful shutdown completed successfully.');
  } catch (err) {
    appLogger.error('Error during graceful shutdown', { error: err.message });
  }
}

/**
 * Main application bootstrap.
 */
async function bootstrap() {
  logger.setLevel(config.logLevel);
  appLogger.info('Initializing Cell Discord Bot Foundation, AI Core, Admin, Moderation & XP System...');

  // Setup global uncaught error listeners
  setupGlobalErrorHandlers(appLogger, () => shutdown('EMERGENCY'));

  // Setup termination signal listeners
  process.on('SIGINT', () => shutdown('SIGINT').then(() => process.exit(0)));
  process.on('SIGTERM', () => shutdown('SIGTERM').then(() => process.exit(0)));

  // Initialize infrastructure and dependency context
  appContext = createAppContext();
  const context = appContext;

  appLogger.info(`Base identity initialized: ${context.identityService.getDefaultName()} (Technical ID: ${context.identityService.getTechnicalIdentifier()})`);
  appLogger.info(`AI LLM Provider initialized: ${context.llmAdapter.getProviderName()} (${context.llmAdapter.getModelName()})`);
  appLogger.info(`Tool catalog ready: ${context.toolRegistry.getAll().length} tool(s) registered.`);

  // Synchronize dynamic botConfig changes to live services
  botConfig.onConfigChange((newCfg) => {
    if (newCfg.identity?.name && context.identityService) {
      context.identityService.defaultName = newCfg.identity.name;
    }
    if (newCfg.identity?.defaultPrefix && prefixCommandHandler) {
      prefixCommandHandler.prefix = newCfg.identity.defaultPrefix;
    }
  });

  // Start Web Panel Server
  if (context.webServer) {
    try {
      await context.webServer.start();
    } catch (webErr) {
      if (webErr.code === 'EADDRINUSE') {
        appLogger.error(`A porta ${context.webServer.port} já está em uso por outra instância do bot!`);
        appLogger.warn('Para evitar que 2 bots respondam ao mesmo tempo gerando tickets e embeds duplicados, esta nova instância foi encerrada.');
        process.exit(1);
      }
      appLogger.error('Failed to start Web Server', { error: webErr.message });
    }
  }

  // Discord.js Client initialization
  client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
      GatewayIntentBits.DirectMessages,
      GatewayIntentBits.GuildMembers,
      GatewayIntentBits.GuildVoiceStates,
      GatewayIntentBits.GuildMessageReactions,
      GatewayIntentBits.GuildModeration
    ],
    partials: [Partials.Channel, Partials.Message, Partials.Reaction, Partials.GuildMember, Partials.User]
  });

  // Link WebServer and WebPanelService to live Discord client for guild & channel inspection
  if (context.webPanelService) {
    context.webPanelService.setBotClient(client);
  }
  if (context.webServer) {
    context.webServer.botClient = client;
  }
  if (context.auditService) {
    context.auditService.botClient = client;
  }
  if (context.economyRepo) {
    context.economyRepo.botClient = client;
  }
  if (context.economyService) {
    context.economyService.botClient = client;
  }
  if (context.musicService) {
    context.musicService.setClient(client);
  }
  if (context.socialAlertService) {
    context.socialAlertService.startPolling(client, 5);
  }

  // Load events
  loadEvents(client, context);

  // Check Discord Token
  if (!config.discordToken) {
    appLogger.warn('No DISCORD_TOKEN provided in environment.');
    appLogger.info('Database, migrations, AI core, Admin, Moderation and XP infrastructure initialized successfully.');
    appLogger.info('Provide a valid DISCORD_TOKEN in .env to connect to Discord Gateway.');
    return { client, context, connected: false };
  }

  // Connect to Discord Gateway
  appLogger.info('Connecting to Discord Gateway...');
  await client.login(config.discordToken);

  return { client, context, connected: true };
}

// Start application if executed directly
if (require.main === module) {
  bootstrap().catch((err) => {
    appLogger.error('Fatal bootstrap error', { error: err.message, stack: err.stack });
    process.exit(1);
  });
}

module.exports = {
  bootstrap,
  shutdown,
  createAppContext
};
