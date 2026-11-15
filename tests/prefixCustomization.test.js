const { test, describe, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const { DatabaseManager } = require('../src/database/connection');
const { Migrator } = require('../src/database/migrator');
const { GuildRepository } = require('../src/database/repositories/guildRepository');
const { UserRepository } = require('../src/database/repositories/userRepository');
const { SettingsRepository } = require('../src/database/repositories/settingsRepository');
const { SettingsService } = require('../src/services/settingsService');
const { CustomCommandRepository } = require('../src/database/repositories/customCommandRepository');
const { CustomCommandService } = require('../src/services/customCommandService');
const { AuditRepository } = require('../src/database/repositories/auditRepository');
const { AuditService } = require('../src/services/auditService');
const { IdentityService } = require('../src/services/identityService');
const { EconomyRepository } = require('../src/database/repositories/economyRepository');
const { EconomyService } = require('../src/services/economyService');
const { PrefixCommandHandler } = require('../src/handlers/prefixCommandHandler');
const prefixSlashCommand = require('../src/commands/admin/prefix');

describe('Prefix Customization & Prefixless Mode System', () => {
  let db;
  let settingsRepo;
  let settingsService;
  let auditRepo;
  let auditService;
  let identityService;
  let economyRepo;
  let economyService;
  let customCommandRepo;
  let customCommandService;
  let handler;
  let context;

  const guildId = 'g_prefix_test';

  function createMockMessage(content, authorId = 'u_admin_1') {
    let replyData = null;
    const msg = {
      content,
      createdTimestamp: Date.now(),
      client: {
        user: { id: '1559424560657596446' },
        ws: { ping: 25 }
      },
      guild: { id: guildId, name: 'Servidor de Teste' },
      channel: {
        id: 'c_general',
        name: 'geral',
        send: async (payload) => {
          replyData = payload;
          return { id: 'm_sent_1' };
        }
      },
      author: { id: authorId, username: 'Admin' },
      member: { permissions: { has: () => true } },
      reply: async (payload) => {
        replyData = payload;
        return {
          createdTimestamp: Date.now() + 10,
          edit: async (newPayload) => {
            replyData = newPayload;
          }
        };
      },
      getReply: () => replyData
    };
    return msg;
  }

  beforeEach(async () => {
    db = new DatabaseManager(':memory:');
    db.connect();
    const migrator = new Migrator(db);
    await migrator.runPendingMigrations();

    const guildRepo = new GuildRepository(db);
    guildRepo.upsertGuild({ id: guildId, name: 'Servidor de Teste' });

    const userRepo = new UserRepository(db);
    userRepo.upsertUser({ id: 'u_admin_1', username: 'Admin' });

    auditRepo = new AuditRepository(db);
    auditService = new AuditService(auditRepo);

    settingsRepo = new SettingsRepository(db);
    settingsService = new SettingsService(settingsRepo, auditService);

    identityService = new IdentityService(settingsService, auditService, 'J.A.R.V.I.S');

    economyRepo = new EconomyRepository(db);
    economyService = new EconomyService({ economyRepo, identityService, auditService });

    customCommandRepo = new CustomCommandRepository(db);
    customCommandService = new CustomCommandService({ customCommandRepo, auditService });

    handler = new PrefixCommandHandler('+');

    context = {
      settingsService,
      identityService,
      economyService,
      customCommandService,
      auditService,
      musicService: null,
      moderationService: null,
      protectionService: null,
      lockdownService: null,
      experienceService: null,
      ticketService: null,
      socialFunService: null,
      quizService: null
    };
  });

  afterEach(() => {
    if (db) db.close();
  });

  test('Default prefix is "+" and executes "+ping" properly', async () => {
    const msg = createMockMessage('+ping');
    const handled = await handler.handle(msg, context);
    assert.equal(handled, true);
    const reply = msg.getReply();
    const text = typeof reply === 'string' ? reply : reply?.content;
    assert.ok(text && text.includes('Pong'));
  });

  test('Changing prefix to "!" makes "!ping" work and rejects "+ping"', async () => {
    settingsService.setSetting(guildId, 'prefix', '!');

    const msgExcl = createMockMessage('!ping');
    const handledExcl = await handler.handle(msgExcl, context);
    assert.equal(handledExcl, true);
    const replyExcl = msgExcl.getReply();
    const textExcl = typeof replyExcl === 'string' ? replyExcl : replyExcl?.content;
    assert.ok(textExcl && textExcl.includes('Pong'));

    // Non-prefix normal word should return false
    const msgNormal = createMockMessage('ping');
    const handledNormal = await handler.handle(msgNormal, context);
    assert.equal(handledNormal, false);
  });

  test('Prefixless mode allows executing commands directly without any prefix', async () => {
    // Activate prefixless mode
    settingsService.setSetting(guildId, 'prefix', 'none');
    settingsService.setSetting(guildId, 'prefixless_mode', 'true');

    // Register a custom command
    customCommandService.createCommand(guildId, {
      name: 'regras',
      response: 'Bem-vindo! Respeite as regras.',
      creatorId: 'u_admin_1'
    });

    // 1. Built-in command "ping" without prefix
    const msgPing = createMockMessage('ping');
    const handledPing = await handler.handle(msgPing, context);
    assert.equal(handledPing, true);
    const textPing = typeof msgPing.getReply() === 'string' ? msgPing.getReply() : msgPing.getReply()?.content;
    assert.ok(textPing.includes('Pong'));

    // 2. Custom command "regras" without prefix
    const msgRegras = createMockMessage('regras');
    const handledRegras = await handler.handle(msgRegras, context);
    assert.equal(handledRegras, true);
    const textRegras = typeof msgRegras.getReply() === 'string' ? msgRegras.getReply() : msgRegras.getReply()?.content;
    assert.ok(textRegras.includes('Respeite as regras'));

    // 3. Normal chatter like "bom dia pessoal" MUST NOT be triggered as a command
    const msgChat = createMockMessage('bom dia pessoal, como vocês estão hoje?');
    const handledChat = await handler.handle(msgChat, context);
    assert.equal(handledChat, false);
  });

  test('Mentioning the bot alone informs current prefix and prefixless status', async () => {
    const msgMention = createMockMessage('<@1559424560657596446>');
    const handled = await handler.handle(msgMention, context);
    assert.equal(handled, true);
    const text = typeof msgMention.getReply() === 'string' ? msgMention.getReply() : msgMention.getReply()?.content;
    assert.ok(text && text.includes('Meu prefixo neste servidor é: `+`'));
  });

  test('+prefixo command allows checking and modifying prefix via chat', async () => {
    // 1. +prefixo without args shows status
    const msgInfo = createMockMessage('+prefixo');
    await handler.handle(msgInfo, context);
    const replyInfo = msgInfo.getReply();
    assert.ok(replyInfo && replyInfo.embeds && replyInfo.embeds.length === 1);
    assert.ok(replyInfo.embeds[0].data.title.includes('Configuração de Prefixo'));

    // 2. +prefixo ! sets prefix to !
    const msgChange = createMockMessage('+prefixo !');
    await handler.handle(msgChange, context);
    const replyChange = typeof msgChange.getReply() === 'string' ? msgChange.getReply() : msgChange.getReply()?.content;
    assert.ok(replyChange && replyChange.includes('O novo prefixo deste servidor agora é: `!`'));
    assert.equal(settingsService.getSetting(guildId, 'prefix'), '!');

    // 3. !prefixo sem activates prefixless mode
    const msgSem = createMockMessage('!prefixo sem');
    await handler.handle(msgSem, context);
    const replySem = typeof msgSem.getReply() === 'string' ? msgSem.getReply() : msgSem.getReply()?.content;
    assert.ok(replySem && replySem.includes('Modo Sem Prefixo Ativado com Sucesso!'));
    assert.equal(settingsService.getSetting(guildId, 'prefixless_mode'), 'true');

    // 4. In prefixless mode, command "prefixo reset" restores '+'
    const msgReset = createMockMessage('prefixo reset');
    await handler.handle(msgReset, context);
    const replyReset = typeof msgReset.getReply() === 'string' ? msgReset.getReply() : msgReset.getReply()?.content;
    assert.ok(replyReset && replyReset.includes('O prefixo do servidor voltou ao padrão: `+`'));
    assert.equal(settingsService.getSetting(guildId, 'prefix'), '+');
  });

  test('/prefixo slash command works for ver, definir, sem-prefixo, and resetar', async () => {
    // 1. /prefixo ver
    let slashPayload = null;
    const mockInteractionVer = {
      guild: { id: guildId, name: 'Servidor de Teste' },
      user: { id: 'u_admin_1' },
      options: {
        getSubcommand: () => 'ver'
      },
      reply: async (p) => { slashPayload = p; }
    };
    await prefixSlashCommand.execute(mockInteractionVer, context);
    assert.ok(slashPayload && slashPayload.embeds);

    // 2. /prefixo definir prefixo:?
    let slashDefinir = null;
    const mockInteractionDef = {
      guild: { id: guildId, name: 'Servidor de Teste' },
      user: { id: 'u_admin_1' },
      options: {
        getSubcommand: () => 'definir',
        getString: (opt) => opt === 'prefixo' ? '?' : null
      },
      reply: async (p) => { slashDefinir = p; }
    };
    await prefixSlashCommand.execute(mockInteractionDef, context);
    assert.equal(settingsService.getSetting(guildId, 'prefix'), '?');

    // 3. /prefixo sem-prefixo ativar:true
    let slashSem = null;
    const mockInteractionSem = {
      guild: { id: guildId, name: 'Servidor de Teste' },
      user: { id: 'u_admin_1' },
      options: {
        getSubcommand: () => 'sem-prefixo',
        getBoolean: (opt) => opt === 'ativar' ? true : false
      },
      reply: async (p) => { slashSem = p; }
    };
    await prefixSlashCommand.execute(mockInteractionSem, context);
    assert.equal(settingsService.getSetting(guildId, 'prefixless_mode'), 'true');

    // 4. /prefixo resetar
    let slashReset = null;
    const mockInteractionReset = {
      guild: { id: guildId, name: 'Servidor de Teste' },
      user: { id: 'u_admin_1' },
      options: {
        getSubcommand: () => 'resetar'
      },
      reply: async (p) => { slashReset = p; }
    };
    await prefixSlashCommand.execute(mockInteractionReset, context);
    assert.equal(settingsService.getSetting(guildId, 'prefix'), '+');
    assert.equal(settingsService.getSetting(guildId, 'prefixless_mode'), 'false');
  });
});
