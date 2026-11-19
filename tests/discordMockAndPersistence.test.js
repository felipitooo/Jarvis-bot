const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const http = require('http');

const { DatabaseManager } = require('../src/database/connection');
const { Migrator } = require('../src/database/migrator');
const { GuildRepository } = require('../src/database/repositories/guildRepository');
const { SettingsRepository } = require('../src/database/repositories/settingsRepository');
const { UserRepository } = require('../src/database/repositories/userRepository');
const { AuditRepository } = require('../src/database/repositories/auditRepository');
const { MemoryRepository } = require('../src/database/repositories/memoryRepository');
const { BackupRepository } = require('../src/database/repositories/backupRepository');
const { ModerationRepository } = require('../src/database/repositories/moderationRepository');
const { XpRepository } = require('../src/database/repositories/xpRepository');
const { EconomyRepository } = require('../src/database/repositories/economyRepository');
const { MusicVoiceRepository } = require('../src/database/repositories/musicVoiceRepository');
const { TicketRepository } = require('../src/database/repositories/ticketRepository');
const { ReviewRepository } = require('../src/database/repositories/reviewRepository');
const { CommunityRepository } = require('../src/database/repositories/communityRepository');
const { WebSessionRepository } = require('../src/database/repositories/webSessionRepository');
const { AutomationRepository } = require('../src/database/repositories/automationRepository');
const { BotPresenceRepository } = require('../src/database/repositories/botPresenceRepository');
const { CasinoRepository } = require('../src/database/repositories/casinoRepository');
const { QuizRepository } = require('../src/database/repositories/quizRepository');
const { CustomCommandRepository } = require('../src/database/repositories/customCommandRepository');
const { LoanRepository } = require('../src/database/repositories/loanRepository');
const { SocialAlertRepository } = require('../src/database/repositories/socialAlertRepository');
const { ApiKeyRepository } = require('../src/database/repositories/apiKeyRepository');

const { AuditService } = require('../src/services/auditService');
const { SettingsService } = require('../src/services/settingsService');
const { IdentityService } = require('../src/services/identityService');
const { BackupSecurityService } = require('../src/services/backupSecurityService');
const { ModerationService } = require('../src/services/moderationService');
const { ProtectionService } = require('../src/services/protectionService');
const { ExperienceService } = require('../src/services/experienceService');
const { progressionFormulaService } = require('../src/services/progressionFormulaService');
const { EconomyService } = require('../src/services/economyService');
const { CustomCommandService } = require('../src/services/customCommandService');
const { CommunityService } = require('../src/services/communityService');
const { GossipService } = require('../src/services/gossipService');
const { SocialAlertService } = require('../src/services/socialAlertService');
const { GuildModuleService, MODULE_DEFINITIONS } = require('../src/services/guildModuleService');
const { MultiBotManager } = require('../src/services/multiBotManager');
const { WebPanelService } = require('../src/services/webPanelService');
const { WebServer } = require('../src/web/server');
const { GeminiAdapter } = require('../src/ai/adapters/geminiAdapter');
const { buildSystemPrompt } = require('../src/ai/prompts/systemPrompt');
const { prefixCommandHandler } = require('../src/handlers/prefixCommandHandler');
const { toolRegistry } = require('../src/ai/tools/toolRegistry');
const messageCreateEvent = require('../src/events/messageCreate');
const guildMemberAddEvent = require('../src/events/guildMemberAdd');

// =========================================================================
// DISCORD MOCK ENGINE (Simulates Servers, Channels, Users, Members & Messages)
// =========================================================================
class DiscordMockEngine {
  constructor() {
    this.guilds = new Map();
    this.user = {
      id: 'bot_jarvis_main',
      username: 'J.A.R.V.I.S.',
      tag: 'J.A.R.V.I.S.#0001',
      displayAvatarURL: () => 'https://cdn.discordapp.com/embed/avatars/0.png'
    };
  }

  createGuild(id, name = 'Servidor Stark Mock') {
    const channelsMap = new Map();
    const rolesMap = new Map();
    const membersMap = new Map();
    const bansRemoved = [];

    rolesMap.set('role_cidadao', { id: 'role_cidadao', name: 'Cidadão Stark', hexColor: '#00E5FF', managed: false });
    rolesMap.set('role_staff', { id: 'role_staff', name: 'Equipe Stark', hexColor: '#10B981', managed: false });

    const guild = {
      id,
      name,
      memberCount: 4,
      iconURL: () => 'https://cdn.discordapp.com/embed/avatars/0.png',
      channels: {
        cache: channelsMap,
        fetch: async (cid) => channelsMap.get(cid) || null
      },
      roles: {
        cache: rolesMap
      },
      members: {
        cache: membersMap,
        fetch: async () => membersMap
      },
      bans: {
        remove: async (uid, reason) => {
          bansRemoved.push({ uid, reason });
        }
      },
      _bansRemoved: bansRemoved
    };

    this.guilds.set(id, guild);
    return guild;
  }

  createTextChannel(guild, id, name = 'geral') {
    const storedMessages = [];
    const sentPayloads = [];

    const channel = {
      id,
      name,
      type: 0,
      guild,
      isTextBased: () => true,
      sendTyping: async () => {},
      send: async (payload) => {
        const msgObj = {
          id: `msg_sent_${Date.now()}_${Math.random()}`,
          content: typeof payload === 'string' ? payload : (payload.content || ''),
          embeds: payload.embeds || [],
          channel
        };
        sentPayloads.push(payload);
        return msgObj;
      },
      messages: {
        fetch: async ({ limit = 100 } = {}) => {
          const slice = storedMessages.slice(-limit).reverse();
          const map = new Map(slice.map(m => [m.id, m]));
          map.last = () => slice[slice.length - 1];
          return map;
        }
      },
      _storedMessages: storedMessages,
      _sentPayloads: sentPayloads
    };

    guild.channels.cache.set(id, channel);
    return channel;
  }

  addArtificialMessage(channel, { id, authorId, username, displayName, content, bot = false, timestampOffsetMs = 0 }) {
    const createdAt = new Date(Date.now() + timestampOffsetMs);
    const replies = [];
    const addedRoles = [];

    const member = {
      id: authorId,
      displayName: displayName || username,
      guild: channel.guild,
      user: {
        id: authorId,
        username,
        bot,
        displayAvatarURL: () => 'https://cdn.discordapp.com/embed/avatars/0.png'
      },
      roles: {
        cache: new Map(),
        add: async (roles) => {
          addedRoles.push(...(Array.isArray(roles) ? roles : [roles]));
        }
      },
      permissions: {
        has: () => true
      },
      _addedRoles: addedRoles
    };

    channel.guild.members.cache.set(authorId, member);

    const msg = {
      id: id || `msg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      content,
      createdAt,
      createdTimestamp: createdAt.getTime(),
      author: member.user,
      member,
      guild: channel.guild,
      channel,
      client: { user: this.user, guilds: { cache: this.guilds } },
      mentions: {
        users: new Map(),
        members: new Map()
      },
      attachments: new Map(),
      reply: async (payload) => {
        replies.push(payload);
        return { id: `reply_${Date.now()}`, ...payload };
      },
      delete: async () => {},
      _replies: replies
    };

    channel._storedMessages.push(msg);
    return msg;
  }
}

// Helper for HTTP JSON requests against the test WebServer
function httpRequest(port, method, urlPath, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const payloadStr = body ? JSON.stringify(body) : null;
    const reqHeaders = {
      'X-Panel-Password': '1598',
      ...headers
    };
    if (payloadStr) {
      reqHeaders['Content-Type'] = 'application/json';
      reqHeaders['Content-Length'] = Buffer.byteLength(payloadStr);
    }

    const req = http.request({
      hostname: '127.0.0.1',
      port,
      path: urlPath,
      method,
      headers: reqHeaders
    }, (res) => {
      let raw = '';
      res.on('data', chunk => { raw += chunk; });
      res.on('end', () => {
        let json = null;
        try { json = JSON.parse(raw); } catch {}
        resolve({
          status: res.statusCode,
          headers: res.headers,
          body: raw,
          json
        });
      });
    });

    req.on('error', reject);
    if (payloadStr) req.write(payloadStr);
    req.end();
  });
}

describe('OPERAÇÃO DE CORREÇÃO TOTAL V8.5.0 — Persistência Real, Isolamento Multi-Bot, 26 Módulos e Discord Mock', () => {
  const testDbPath = path.join(__dirname, `temp_v85_audit_${Date.now()}.sqlite`);
  let dbManager;
  let discordMock;
  let guildA;
  let guildB;
  let channelGeneral;
  let context;
  let webServer;
  let serverPort;
  let authCookie = '';
  let csrfToken = '';

  function buildFullTestStack(existingDbPath) {
    const db = new DatabaseManager();
    db.connect(existingDbPath);
    const migrator = new Migrator(db);
    migrator.runPendingMigrations();

    const guildRepo = new GuildRepository(db);
    const settingsRepo = new SettingsRepository(db);
    const userRepo = new UserRepository(db);
    const auditRepo = new AuditRepository(db);
    const memoryRepo = new MemoryRepository(db);
    const backupRepo = new BackupRepository(db);
    const moderationRepo = new ModerationRepository(db);
    const xpRepo = new XpRepository(db);
    const economyRepo = new EconomyRepository(db);
    const musicVoiceRepo = new MusicVoiceRepository(db);
    const ticketRepo = new TicketRepository(db);
    const reviewRepo = new ReviewRepository(db);
    const communityRepo = new CommunityRepository(db);
    const webSessionRepo = new WebSessionRepository(db);
    const automationRepo = new AutomationRepository(db);
    const botPresenceRepo = new BotPresenceRepository(db);
    const casinoRepo = new CasinoRepository(db);
    const quizRepo = new QuizRepository(db);
    const customCommandRepo = new CustomCommandRepository(db);
    const loanRepo = new LoanRepository(db);
    const socialAlertRepo = new SocialAlertRepository(db);
    const apiKeyRepo = new ApiKeyRepository(db);

    const auditService = new AuditService(auditRepo);
    const settingsService = new SettingsService(settingsRepo, auditService);
    const identityService = new IdentityService(settingsService, auditService, 'J.A.R.V.I.S.');
    const backupSecurityService = new BackupSecurityService(backupRepo, auditService);
    const moderationService = new ModerationService({ modRepo: moderationRepo, auditService });
    const protectionService = new ProtectionService(moderationRepo, moderationService, auditService);
    const guildModuleService = new GuildModuleService(db, auditService);
    const experienceService = new ExperienceService({
      xpRepo,
      formulaService: progressionFormulaService,
      identityService,
      auditService
    });
    const economyService = new EconomyService({
      economyRepo,
      identityService,
      casinoRepo,
      auditService
    });
    const customCommandService = new CustomCommandService({
      customCommandRepo,
      economyService,
      experienceService,
      identityService,
      auditService
    });
    const communityService = new CommunityService({
      communityRepo,
      identityService,
      auditService,
      guildModuleService
    });
    const llmAdapter = new GeminiAdapter({ mockMode: true });
    const gossipService = new GossipService({ llmAdapter });
    const socialAlertService = new SocialAlertService(socialAlertRepo, auditService);
    const multiBotManager = new MultiBotManager(db, { auditService });

    const mockClient = {
      user: discordMock.user,
      guilds: { cache: discordMock.guilds },
      isReady: () => true
    };

    const webPanelService = new WebPanelService({
      webSessionRepo,
      identityService,
      settingsService,
      auditService,
      services: {
        dbManager: db,
        modRepo: moderationRepo,
        ticketRepo,
        reviewRepo,
        communityRepo,
        automationRepo,
        musicVoiceRepo,
        economyRepo,
        economyService,
        loanRepo,
        moderationService,
        experienceService,
        casinoRepo,
        quizRepo,
        customCommandRepo,
        customCommandService,
        xpRepo,
        botPresenceRepo,
        apiKeyRepo,
        llmAdapter,
        memoryRepo,
        gossipService,
        socialAlertRepo,
        socialAlertService,
        backupSecurityService,
        backupRepo,
        guildRepo,
        settingsService,
        guildModuleService,
        multiBotManager
      },
      botClient: mockClient
    });

    return {
      db,
      guildRepo,
      userRepo,
      memoryRepo,
      moderationRepo,
      economyRepo,
      xpRepo,
      communityRepo,
      ticketRepo,
      reviewRepo,
      settingsService,
      identityService,
      moderationService,
      protectionService,
      experienceService,
      economyService,
      communityService,
      gossipService,
      guildModuleService,
      multiBotManager,
      webPanelService,
      mockClient
    };
  }

  before(async () => {
    discordMock = new DiscordMockEngine();
    guildA = discordMock.createGuild('guild_stark_a', 'Stark Tower Alpha');
    guildB = discordMock.createGuild('guild_stark_b', 'Avengers Compound Beta');
    channelGeneral = discordMock.createTextChannel(guildA, 'chan_planejamento', 'planejamento-stark');

    context = buildFullTestStack(testDbPath);
    dbManager = context.db;

    context.guildRepo.upsertGuild({ id: guildA.id, name: guildA.name });
    context.guildRepo.upsertGuild({ id: guildB.id, name: guildB.name });

    webServer = new WebServer({
      webPanelService: context.webPanelService,
      port: 0, // Ephemeral port to avoid conflicts with any running local process
      host: '127.0.0.1'
    });
    const srv = await webServer.start();
    serverPort = srv.address().port;

    // Simulate login to obtain session & CSRF token
    const loginRes = await httpRequest(serverPort, 'POST', '/auth/simulate-login', {
      userId: 'admin_local',
      username: 'StarkAdmin',
      guilds: [
        { id: guildA.id, name: guildA.name, owner: true, permissions: '8' },
        { id: guildB.id, name: guildB.name, owner: true, permissions: '8' }
      ]
    });
    assert.equal(loginRes.status, 200);
    csrfToken = loginRes.json.csrfToken;
    authCookie = `cell_session=${loginRes.json.token}; cell_auth=1598`;
  });

  after(async () => {
    if (webServer) await webServer.stop();
    if (dbManager) dbManager.close();
    try {
      if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);
      if (fs.existsSync(`${testDbPath}-wal`)) fs.unlinkSync(`${testDbPath}-wal`);
      if (fs.existsSync(`${testDbPath}-shm`)) fs.unlinkSync(`${testDbPath}-shm`);
    } catch {}
  });

  // =========================================================================
  // CENÁRIO 1: MULTI-BOT MANAGER, PÁGINA INDIVIDUAL (18 SEÇÕES), ISOLAMENTO E REINICIALIZAÇÃO
  // =========================================================================
  describe('1. Multi-Bot Manager: Persistência Real, Página Individual e Isolamento entre Bots', () => {
    let botAId = null;
    let botBId = null;

    test('Cadastra Bot A e Bot B, configura Economia apenas no Bot A, persiste em F5 e após reinicialização completa do backend', async () => {
      // 1. Cadastrar Bot A via HTTP POST
      const createARes = await httpRequest(serverPort, 'POST', '/api/multi-bot', {
        name: 'Bot A - Economia & IA',
        token: 'OTk5MTAwMjAwMzAwNDAwNTAw.Ga1111.TokenSuperSecretoBotA123456789'
      }, { Cookie: authCookie, 'X-CSRF-Token': csrfToken });

      assert.equal(createARes.status, 201);
      assert.equal(createARes.json.success, true);
      botAId = createARes.json.instance.id;
      assert.ok(botAId);
      // Security check: token must never be exposed in plaintext
      assert.equal(createARes.json.instance.token, undefined);
      assert.ok(createARes.json.instance.maskedToken.includes('••••'));

      // 2. Cadastrar Bot B via HTTP POST
      const createBRes = await httpRequest(serverPort, 'POST', '/api/multi-bot', {
        name: 'Bot B - Moderação & Segurança',
        token: 'OTk5MjAwMzAwNDAwNTAwNjAw.Gb2222.TokenSuperSecretoBotB987654321'
      }, { Cookie: authCookie, 'X-CSRF-Token': csrfToken });

      assert.equal(createBRes.status, 201);
      botBId = createBRes.json.instance.id;
      assert.notEqual(botAId, botBId);

      // 3. Configurar Bot A: Economia ATIVA, Moderação DESATIVADA, Prefixo "$", Moeda "AlphaCoins"
      const updateARes = await httpRequest(serverPort, 'POST', `/api/multi-bot/${botAId}/config`, {
        name: 'Bot A - Economia & IA',
        config: {
          prefix: '$',
          aiName: 'FRIDAY Alpha',
          presenceStatus: 'online',
          presenceActivityText: 'Gerenciando Economia | $ajuda',
          modules: {
            economy: true,
            casino: true,
            moderation: false,
            auto_protection: false
          },
          economyXp: {
            currencyName: 'AlphaCoins',
            dailyAmount: 1500
          }
        }
      }, { Cookie: authCookie, 'X-CSRF-Token': csrfToken });
      assert.equal(updateARes.status, 200);
      assert.equal(updateARes.json.success, true);

      // 4. Configurar Bot B: Economia DESATIVADA, Cassino DESATIVADO, Moderação ATIVA, Prefixo "!", Moeda "BetaCoins"
      const updateBRes = await httpRequest(serverPort, 'POST', `/api/multi-bot/${botBId}/config`, {
        name: 'Bot B - Moderação & Segurança',
        config: {
          prefix: '!',
          aiName: 'VERONICA Security',
          presenceStatus: 'dnd',
          presenceActivityText: 'Patrulha Anti-Raid | !punir',
          modules: {
            economy: false,
            casino: false,
            moderation: true,
            auto_protection: true
          },
          economyXp: {
            currencyName: 'BetaCoins',
            dailyAmount: 100
          }
        }
      }, { Cookie: authCookie, 'X-CSRF-Token': csrfToken });
      assert.equal(updateBRes.status, 200);
      assert.equal(updateBRes.json.success, true);

      // 5. Gravar memórias isoladas em cada Bot
      await httpRequest(serverPort, 'POST', `/api/multi-bot/${botAId}/memories`, {
        action: 'SAVE',
        key: 'regra_economia',
        value: 'No Bot A o prêmio diário é de 1500 AlphaCoins.'
      }, { Cookie: authCookie, 'X-CSRF-Token': csrfToken });

      await httpRequest(serverPort, 'POST', `/api/multi-bot/${botBId}/memories`, {
        action: 'SAVE',
        key: 'regra_seguranca',
        value: 'No Bot B qualquer link suspeito resulta em banimento.'
      }, { Cookie: authCookie, 'X-CSRF-Token': csrfToken });

      // 6. Simular F5 (GET /api/multi-bot e GET individual de cada página administrativa)
      const listAfterF5 = await httpRequest(serverPort, 'GET', '/api/multi-bot', null, { Cookie: authCookie });
      assert.equal(listAfterF5.status, 200);
      assert.equal(listAfterF5.json.instances.length, 2);

      // 7. SIMULAR REINICIALIZAÇÃO COMPLETA DO SERVIDOR / COMPUTADOR:
      // Fechar o banco de dados atual e abrir uma nova conexão SQLite do zero no arquivo em disco
      await webServer.stop();
      dbManager.close();

      context = buildFullTestStack(testDbPath);
      dbManager = context.db;
      webServer = new WebServer({
        webPanelService: context.webPanelService,
        port: 0,
        host: '127.0.0.1'
      });
      const newSrv = await webServer.start();
      serverPort = newSrv.address().port;

      const relogin = await httpRequest(serverPort, 'POST', '/auth/simulate-login', {
        userId: 'admin_local',
        username: 'StarkAdmin',
        guilds: [
          { id: guildA.id, name: guildA.name, owner: true, permissions: '8' },
          { id: guildB.id, name: guildB.name, owner: true, permissions: '8' }
        ]
      });
      csrfToken = relogin.json.csrfToken;
      authCookie = `cell_session=${relogin.json.token}; cell_auth=1598`;

      // 8. Verificar que os dois bots continuam cadastrados após reinício completo
      const pageA = await httpRequest(serverPort, 'GET', `/api/multi-bot/${botAId}`, null, { Cookie: authCookie });
      const pageB = await httpRequest(serverPort, 'GET', `/api/multi-bot/${botBId}`, null, { Cookie: authCookie });

      assert.equal(pageA.status, 200);
      assert.equal(pageB.status, 200);

      // Verificar que a economia continua ativa SOMENTE no Bot A e desativada no Bot B
      assert.equal(pageA.json.instance.config.modules.economy, true);
      assert.equal(pageA.json.instance.config.modules.casino, true);
      assert.equal(pageA.json.instance.config.modules.moderation, false);
      assert.equal(pageA.json.instance.config.prefix, '$');
      assert.equal(pageA.json.instance.config.aiName, 'FRIDAY Alpha');
      assert.equal(pageA.json.instance.config.economyXp.currencyName, 'AlphaCoins');

      assert.equal(pageB.json.instance.config.modules.economy, false);
      assert.equal(pageB.json.instance.config.modules.casino, false);
      assert.equal(pageB.json.instance.config.modules.moderation, true);
      assert.equal(pageB.json.instance.config.prefix, '!');
      assert.equal(pageB.json.instance.config.aiName, 'VERONICA Security');
      assert.equal(pageB.json.instance.config.economyXp.currencyName, 'BetaCoins');

      // Verificar isolamento absoluto de memórias entre Bot A e Bot B
      assert.equal(pageA.json.memories.length, 1);
      assert.equal(pageA.json.memories[0].memory_key, 'regra_economia');
      assert.equal(pageB.json.memories.length, 1);
      assert.equal(pageB.json.memories[0].memory_key, 'regra_seguranca');
    });
  });

  // =========================================================================
  // CENÁRIO 2: SISTEMA DE 26 MÓDULOS — FONTE ÚNICA, DEPENDÊNCIAS, BLOQUEIO REAL E PRESERVAÇÃO DE DADOS
  // =========================================================================
  describe('2. Sistema de 26 Módulos: Fonte Única, Dependências, Bloqueio Real e Preservação de Dados', () => {
    test('Garante 26 módulos únicos com metadados completos e impede registro duplicado', () => {
      const defs = context.guildModuleService.getAllModuleDefinitions(guildA.id);
      assert.equal(defs.length, 26);

      const seenIds = new Set();
      for (const d of defs) {
        assert.ok(d.id, 'Module must have id');
        assert.ok(!seenIds.has(d.id), `Duplicate module id: ${d.id}`);
        seenIds.add(d.id);
        assert.ok(d.name);
        assert.ok(d.description);
        assert.ok(d.category);
        assert.ok(Array.isArray(d.dependencies));
        assert.ok(Array.isArray(d.requiredPermissions));
        assert.ok(Array.isArray(d.commands));
        assert.ok(Array.isArray(d.events));
        assert.ok(Array.isArray(d.automations));
        assert.ok(d.healthStatus);
        assert.ok(Array.isArray(d.errorLog));
      }

      // Tentativa de registrar módulo duplicado deve lançar erro
      assert.throws(() => {
        context.guildModuleService.registerModule({ id: 'economy', name: 'Duplicado' });
      }, /Módulo duplicado/);
    });

    test('Valida dependências: impede ativar Cassino se Economia estiver explicitamente desativada', () => {
      assert.throws(() => {
        context.guildModuleService.setGuildModules(guildA.id, {
          economy: false,
          casino: true
        }, 'admin_local');
      }, /depende do módulo "Economia & Moedas"/);
    });

    test('Ativar módulo -> executar comando (+daily) -> funciona; Desativar módulo -> bloqueia execução real sem apagar dados', async () => {
      // 1. Ativar módulo economy
      context.guildModuleService.setModuleEnabled(guildA.id, 'economy', true, 'admin_local');
      assert.equal(context.guildModuleService.isModuleEnabled(guildA.id, 'economy'), true);

      // 2. Executar comando +daily no Discord Mock
      const msg1 = discordMock.addArtificialMessage(channelGeneral, {
        authorId: 'user_stark_1',
        username: 'TonyStark',
        content: '+daily'
      });

      const handled1 = await prefixCommandHandler.handle(msg1, context);
      assert.equal(handled1, true);

      // Verificar que o saldo foi creditado no banco SQLite
      const accountAfterDaily = context.economyRepo.getAccount(guildA.id, 'user_stark_1');
      assert.ok(accountAfterDaily.walletBalance > 0, 'Daily command should credit coins when module is active');
      const savedBalance = accountAfterDaily.walletBalance;

      // 3. Desativar módulo economy via API HTTP e verificar persistência após F5
      const patchModRes = await httpRequest(
        serverPort,
        'PATCH',
        `/api/guilds/${guildA.id}/modules/guild_modules`,
        { modules: { economy: false } },
        { Cookie: authCookie, 'X-CSRF-Token': csrfToken }
      );
      assert.equal(patchModRes.status, 200);
      assert.equal(patchModRes.json.config.economy, false);
      // Como casino depende de economy, casino também deve ter sido desativado automaticamente
      assert.equal(patchModRes.json.config.casino, false);

      // 4. Tentar executar comando +saldo com módulo desativado -> Deve bloquear execução real!
      const msg2 = discordMock.addArtificialMessage(channelGeneral, {
        authorId: 'user_stark_1',
        username: 'TonyStark',
        content: '+saldo'
      });

      await prefixCommandHandler.handle(msg2, context);
      assert.ok(msg2._replies.length > 0);
      const rawReply = msg2._replies[0];
      const replyText = typeof rawReply === 'string' ? rawReply : (rawReply?.content || '');
      assert.ok(replyText.includes('Módulo Desativado'), `Expected disabled module notice, got: ${replyText}`);

      // 5. Confirmar que desativar o módulo NÃO apagou os dados do usuário no SQLite!
      const accountWhileDisabled = context.economyRepo.getAccount(guildA.id, 'user_stark_1');
      assert.equal(accountWhileDisabled.walletBalance, savedBalance);

      // 6. Reativar módulo economy
      context.guildModuleService.setModuleEnabled(guildA.id, 'economy', true, 'admin_local');
      assert.equal(context.guildModuleService.isModuleEnabled(guildA.id, 'economy'), true);
    });

    test('Desativar módulos de Eventos (Welcome, AutoRole, XP) bloqueia execução real nos eventos do Discord Mock', async () => {
      // Configurar boas-vindas e autorole no servidor
      context.communityRepo.upsertWelcomeConfig(guildA.id, {
        welcomeEnabled: true,
        welcomeChannelId: channelGeneral.id,
        welcomeMessage: 'Bem-vindo {user} ao {server}!'
      });
      context.communityRepo.setAutoRoles(guildA.id, ['role_cidadao']);

      // 1. Desativar welcome e autorole
      context.guildModuleService.setModuleEnabled(guildA.id, 'welcome', false);
      context.guildModuleService.setModuleEnabled(guildA.id, 'autorole', false);

      const sentBefore = channelGeneral._sentPayloads.length;
      const newMember1 = {
        id: 'member_join_blocked',
        guild: guildA,
        user: { id: 'member_join_blocked', username: 'BlockedUser' },
        roles: { add: async () => { throw new Error('Should not add role when autorole is disabled'); } }
      };

      await guildMemberAddEvent.execute(newMember1, context);
      assert.equal(channelGeneral._sentPayloads.length, sentBefore, 'No welcome message should be sent when welcome module is disabled');

      // 2. Ativar welcome e autorole e testar novamente
      context.guildModuleService.setModuleEnabled(guildA.id, 'welcome', true);
      context.guildModuleService.setModuleEnabled(guildA.id, 'autorole', true);

      let roleAdded = null;
      const newMember2 = {
        id: 'member_join_allowed',
        guild: guildA,
        user: { id: 'member_join_allowed', username: 'AllowedUser' },
        roles: { add: async (r) => { roleAdded = r; } }
      };

      await guildMemberAddEvent.execute(newMember2, context);
      assert.deepEqual(roleAdded, ['role_cidadao']);
      assert.equal(channelGeneral._sentPayloads.length, sentBefore + 1, 'Welcome message must be sent when welcome module is enabled');
    });
  });

  // =========================================================================
  // CENÁRIO 3: RESUMO INTELIGENTE E MEMÓRIA CONTEXTUAL DA IA COM FATOS CONHECIDOS
  // =========================================================================
  describe('3. Resumo Inteligente & Memória Contextual da IA (Preservação de Fatos e Persistência)', () => {
    test('Gera resumo preservando fatos importantes de conversa artificial e persiste no SQLite após F5', async () => {
      // Limpar mensagens anteriores do canal mock e criar conversa artificial com fatos conhecidos
      channelGeneral._storedMessages.length = 0;

      discordMock.addArtificialMessage(channelGeneral, {
        authorId: 'u_lipe',
        username: 'Lipe',
        displayName: 'Lipe',
        content: 'Pessoal, o torneio oficial de Valorant do servidor será neste sábado às 19h30 valendo 15000 StarkCoins!',
        timestampOffsetMs: -240000
      });
      discordMock.addArtificialMessage(channelGeneral, {
        authorId: 'u_tacio',
        username: 'Tacio',
        displayName: 'Tacio',
        content: 'Eu vou participar com meu time Esquadrão Alpha, já confirmei os 5 jogadores.',
        timestampOffsetMs: -180000
      });
      discordMock.addArtificialMessage(channelGeneral, {
        authorId: 'u_tecno',
        username: 'Tecno',
        displayName: 'Tecno',
        content: 'Vou transmitir a partida ao vivo no canal da Twitch com narração oficial.',
        timestampOffsetMs: -120000
      });
      discordMock.addArtificialMessage(channelGeneral, {
        authorId: 'u_virzinho',
        username: 'Virzinho',
        displayName: 'Virzinho',
        content: 'Combinado! A senha da sala personalizada será STARK2026.',
        timestampOffsetMs: -60000
      });

      // Chamar endpoint real do Resumo Inteligente
      const sumRes = await httpRequest(
        serverPort,
        'POST',
        `/api/guilds/${guildA.id}/summary`,
        {
          channelId: channelGeneral.id,
          limit: 100,
          type: 'summary',
          sendToDiscord: true
        },
        { Cookie: authCookie, 'X-CSRF-Token': csrfToken }
      );

      assert.equal(sumRes.status, 200);
      assert.equal(sumRes.json.success, true);
      assert.ok(sumRes.json.summary, 'Response must contain summary property');

      const summaryText = sumRes.json.summary;
      // Verificar se os fatos importantes conhecidos estão preservados no resumo!
      assert.ok(summaryText.includes('Valorant'), 'Summary must preserve topic Valorant');
      assert.ok(summaryText.includes('15000'), 'Summary must preserve prize 15000 StarkCoins');
      assert.ok(summaryText.includes('STARK2026'), 'Summary must preserve room password STARK2026');
      assert.ok(summaryText.includes('Lipe'), 'Summary must cite participant Lipe');
      assert.ok(summaryText.includes('Tacio'), 'Summary must cite participant Tacio');
      assert.ok(summaryText.includes('Tecno'), 'Summary must cite participant Tecno');

      // Verificar se o resumo foi persistido no SQLite e retorna ao simular F5 (GET /api/guilds/:id)
      const overviewAfterF5 = await httpRequest(serverPort, 'GET', `/api/guilds/${guildA.id}`, null, { Cookie: authCookie });
      assert.equal(overviewAfterF5.status, 200);
      const savedSummaries = overviewAfterF5.json.modules.channelSummaries;
      assert.ok(Array.isArray(savedSummaries));
      assert.ok(savedSummaries.length >= 1);
      assert.ok(savedSummaries[0].summaryText.includes('STARK2026'));
    });

    test('Memória da IA recupera informações armazenadas anteriormente e mantém isolamento entre servidores e usuários', () => {
      // Gravar memória de servidor no Servidor A
      context.memoryRepo.saveGuildMemory({
        guildId: guildA.id,
        key: 'codigo_secreto_servidor',
        value: 'PROTOCOLO-OMEGA-7749',
        createdBy: 'admin_local'
      });

      // Gravar memória de usuário no Servidor A
      context.memoryRepo.saveUserMemory({
        guildId: guildA.id,
        userId: 'u_lipe',
        key: 'jogo_favorito',
        value: 'Lipe é o fundador do servidor e seu jogo favorito é Cyberpunk 2077.'
      });

      // Recuperar memórias para construir o prompt contextual do Servidor A
      const guildAMemories = context.memoryRepo.listGuildMemories(guildA.id);
      const userAMemories = context.memoryRepo.listUserMemories(guildA.id, 'u_lipe');

      const promptGuildA = buildSystemPrompt({
        aiName: 'J.A.R.V.I.S.',
        guildName: guildA.name,
        serverMemories: guildAMemories,
        userMemories: userAMemories
      });

      assert.ok(promptGuildA.includes('PROTOCOLO-OMEGA-7749'), 'AI prompt must recover stored guild memory');
      assert.ok(promptGuildA.includes('Cyberpunk 2077'), 'AI prompt must recover stored user memory');

      // Verificar que o Servidor B NÃO tem acesso às memórias do Servidor A
      const guildBMemories = context.memoryRepo.listGuildMemories(guildB.id);
      const userBMemories = context.memoryRepo.listUserMemories(guildB.id, 'u_lipe');
      const promptGuildB = buildSystemPrompt({
        aiName: 'J.A.R.V.I.S.',
        guildName: guildB.name,
        serverMemories: guildBMemories,
        userMemories: userBMemories
      });

      assert.ok(!promptGuildB.includes('PROTOCOLO-OMEGA-7749'), 'Guild B must be isolated from Guild A memories');
      assert.ok(!promptGuildB.includes('Cyberpunk 2077'), 'Guild B must be isolated from Guild A user memories');
    });
  });

  // =========================================================================
  // CENÁRIO 4: AUDITORIA DE TODAS AS CONFIGURAÇÕES DO PAINEL + PERSISTÊNCIA APÓS F5
  // =========================================================================
  describe('4. Auditoria Completa de Salvamento e Recuperação Pós-F5 de Todos os Módulos do Painel', () => {
    test('Salva configurações em todos os módulos do painel via HTTP e comprova persistência real após F5', async () => {
      const headers = { Cookie: authCookie, 'X-CSRF-Token': csrfToken };

      // 1. Identidade & Prefixo do Servidor
      const resSettings = await httpRequest(serverPort, 'PATCH', `/api/guilds/${guildA.id}/settings`, {
        aiDisplayName: 'J.A.R.V.I.S. Mark VIII',
        prefix: '!',
        aiChannelId: channelGeneral.id
      }, headers);
      assert.equal(resSettings.status, 200);

      // 2. Proteção Anti-Bots & Scams
      const resAntiBot = await httpRequest(serverPort, 'PATCH', `/api/guilds/${guildA.id}/modules/moderation`, {
        logChannelId: channelGeneral.id,
        antiBotScam: {
          enabled: true,
          action: 'KICK',
          timeoutDurationSeconds: 3600
        }
      }, headers);
      assert.equal(resAntiBot.status, 200);

      // 3. Economia
      const resEco = await httpRequest(serverPort, 'PATCH', `/api/guilds/${guildA.id}/modules/economy`, {
        currencyName: 'Vibranium',
        currencySymbol: '🛡️',
        dailyAmount: 950,
        workMin: 120,
        workMax: 450
      }, headers);
      assert.equal(resEco.status, 200);

      // 4. Cassino
      const resCasino = await httpRequest(serverPort, 'PATCH', `/api/guilds/${guildA.id}/modules/casino`, {
        blackjackEnabled: true,
        blackjackMin: 50,
        blackjackMax: 10000,
        rouletteEnabled: true
      }, headers);
      assert.equal(resCasino.status, 200);

      // 5. Música
      const resMusic = await httpRequest(serverPort, 'PATCH', `/api/guilds/${guildA.id}/modules/music`, {
        defaultVolume: 65,
        maxQueueSize: 150,
        autoDisconnectMinutes: 10
      }, headers);
      assert.equal(resMusic.status, 200);

      // 6. Tickets
      const resTickets = await httpRequest(serverPort, 'PATCH', `/api/guilds/${guildA.id}/modules/tickets`, {
        transcriptChannelId: channelGeneral.id,
        maxOpenTicketsPerUser: 3
      }, headers);
      assert.equal(resTickets.status, 200);

      // 7. Boas-vindas & AutoRole
      const resWelcome = await httpRequest(serverPort, 'PATCH', `/api/guilds/${guildA.id}/modules/welcome`, {
        welcomeEnabled: true,
        welcomeChannelId: channelGeneral.id,
        welcomeMessage: 'Olá {user}, bem-vindo à Torre Stark!'
      }, headers);
      assert.equal(resWelcome.status, 200);

      const resAutoRole = await httpRequest(serverPort, 'PATCH', `/api/guilds/${guildA.id}/modules/autorole`, {
        roleId: 'role_cidadao'
      }, headers);
      assert.equal(resAutoRole.status, 200);

      // 8. Níveis & XP
      const resXp = await httpRequest(serverPort, 'PATCH', `/api/guilds/${guildA.id}/modules/xp`, {
        minXp: 20,
        maxXp: 40,
        cooldownSeconds: 45,
        voiceXpPerMinute: 12
      }, headers);
      assert.equal(resXp.status, 200);

      // 9. Starboard & Briefing
      const resStar = await httpRequest(serverPort, 'PATCH', `/api/guilds/${guildA.id}/modules/starboard`, {
        channelId: channelGeneral.id,
        starsRequired: 4
      }, headers);
      assert.equal(resStar.status, 200);

      // 10. Alertas Sociais & Backups
      const resAlert = await httpRequest(serverPort, 'PATCH', `/api/guilds/${guildA.id}/modules/social_alerts`, {
        action: 'CREATE',
        platform: 'YOUTUBE',
        sourceId: '@MarvelBrasil',
        channelTargetId: channelGeneral.id,
        customMessage: 'Vídeo novo no ar!'
      }, headers);
      assert.equal(resAlert.status, 200);

      const resBackup = await httpRequest(serverPort, 'PATCH', `/api/guilds/${guildA.id}/modules/backup`, {
        action: 'CREATE',
        name: 'Snapshot_Auditoria_V85'
      }, headers);
      assert.equal(resBackup.status, 200);

      // =====================================================================
      // SIMULAR F5 (RECARREGAMENTO COMPLETO DO PAINEL: GET /api/guilds/:guildId)
      // =====================================================================
      const f5Res = await httpRequest(serverPort, 'GET', `/api/guilds/${guildA.id}`, null, headers);
      assert.equal(f5Res.status, 200);
      const ov = f5Res.json;

      assert.equal(ov.aiDisplayName, 'J.A.R.V.I.S. Mark VIII');
      assert.equal(ov.modules.serverPrefix, '!');
      assert.equal(ov.settings.ai_channel_id, channelGeneral.id);

      assert.equal(ov.modules.moderation.logChannelId, channelGeneral.id);
      assert.equal(ov.modules.moderation.antiBotScam.enabled, true);
      assert.equal(ov.modules.moderation.antiBotScam.action, 'KICK');
      assert.equal(ov.modules.moderation.antiBotScam.timeoutDurationSeconds, 3600);

      assert.equal(ov.modules.economy.currencyName, 'Vibranium');
      assert.equal(ov.modules.economy.currencySymbol, '🛡️');
      assert.equal(ov.modules.economy.dailyAmount, 950);
      assert.equal(ov.modules.economy.workMin, 120);
      assert.equal(ov.modules.economy.workMax, 450);

      assert.equal(ov.modules.casino.blackjackMin, 50);
      assert.equal(ov.modules.casino.blackjackMax, 10000);

      assert.equal(ov.modules.music.defaultVolume, 65);
      assert.equal(ov.modules.music.maxQueueSize, 150);
      assert.equal(ov.modules.music.autoDisconnectMinutes, 10);

      assert.equal(ov.modules.tickets.transcriptChannelId, channelGeneral.id);
      assert.equal(ov.modules.tickets.maxOpenTicketsPerUser, 3);

      assert.equal(ov.modules.welcome.welcomeChannelId, channelGeneral.id);
      assert.equal(ov.modules.welcome.welcomeMessage, 'Olá {user}, bem-vindo à Torre Stark!');
      assert.equal(ov.modules.autorole.roleId, 'role_cidadao');

      assert.equal(ov.modules.xp.minXp, 20);
      assert.equal(ov.modules.xp.maxXp, 40);
      assert.equal(ov.modules.xp.cooldownSeconds, 45);
      assert.equal(ov.modules.xp.voiceXpPerMinute, 12);

      assert.equal(ov.modules.starboard.starboardChannelId, channelGeneral.id);
      assert.equal(ov.modules.starboard.starsRequired, 4);

      assert.ok(ov.modules.socialAlerts.some(a => a.source_id === '@MarvelBrasil'));
      assert.ok(ov.modules.backups.some(b => (b.backup_name || b.name) === 'Snapshot_Auditoria_V85'));
    });

    test('Verifica integridade da interface HTML do Painel (18 seções do Multi-Bot e ausência de módulos duplicados)', async () => {
      const htmlRes = await httpRequest(serverPort, 'GET', '/dashboard', null, { Cookie: authCookie });
      assert.equal(htmlRes.status, 200);
      const html = htmlRes.body;

      // Verificar presença das abas principais
      assert.ok(html.includes('id="tab-antibot"'));
      assert.ok(html.includes('id="tab-tempbans"'));
      assert.ok(html.includes('id="tab-summary"'));
      assert.ok(html.includes('id="tab-modules"'));
      assert.ok(html.includes('id="tab-multibot"'));

      // Verificar presença da Página Administrativa Individual com todas as 18 seções
      const required18Sections = [
        'mb-sec-overview', 'mb-sec-presence', 'mb-sec-modules', 'mb-sec-ai',
        'mb-sec-memory', 'mb-sec-commands', 'mb-sec-moderation', 'mb-sec-economy',
        'mb-sec-music', 'mb-sec-tickets', 'mb-sec-social', 'mb-sec-automations',
        'mb-sec-embeds', 'mb-sec-permissions', 'mb-sec-integrations', 'mb-sec-database',
        'mb-sec-logs', 'mb-sec-advanced'
      ];
      for (const secId of required18Sections) {
        assert.ok(html.includes(`id="${secId}"`), `HTML must include individual bot admin section #${secId}`);
      }

      // Verificar que os checkboxes duplicados de módulos na aba Configurações Gerais foram removidos
      assert.ok(!html.includes('<input type="checkbox" id="cfgModAiChat"'), 'Duplicate module checkboxes in general settings must be removed');
    });
  });
});
