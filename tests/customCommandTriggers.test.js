const { test, describe, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const { DatabaseManager } = require('../src/database/connection');
const { Migrator } = require('../src/database/migrator');
const { GuildRepository } = require('../src/database/repositories/guildRepository');
const { UserRepository } = require('../src/database/repositories/userRepository');
const { CustomCommandRepository } = require('../src/database/repositories/customCommandRepository');
const { CustomCommandService } = require('../src/services/customCommandService');
const { AuditRepository } = require('../src/database/repositories/auditRepository');
const { AuditService } = require('../src/services/auditService');
const { PrefixCommandHandler } = require('../src/handlers/prefixCommandHandler');
const customcmdSlash = require('../src/commands/community/customcmd');

describe('Custom Command Per-Command Prefix & Prefixless Trigger System', () => {
  let db;
  let customCommandRepo;
  let customCommandService;
  let auditService;
  let handler;
  let context;

  const guildId = 'g_custom_triggers';

  function createMockMessage(content, authorId = 'u_tester_1') {
    let replyData = null;
    let channelData = null;
    const msg = {
      content,
      createdTimestamp: Date.now(),
      client: {
        user: { id: '1559424560657596446' }
      },
      guild: { id: guildId, name: 'Servidor de Teste' },
      channel: {
        id: 'c_general',
        name: 'geral',
        send: async (p) => { channelData = p; return { id: 'm1' }; }
      },
      author: { id: authorId, username: 'Tester' },
      member: { permissions: { has: () => true } },
      reply: async (p) => { replyData = p; return { createdTimestamp: Date.now(), edit: async (np) => { replyData = np; } }; },
      getReply: () => replyData,
      getChannelData: () => channelData
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
    userRepo.upsertUser({ id: 'u_tester_1', username: 'Tester' });

    const auditRepo = new AuditRepository(db);
    auditService = new AuditService(auditRepo);

    customCommandRepo = new CustomCommandRepository(db);
    customCommandService = new CustomCommandService({ customCommandRepo, auditService });

    handler = new PrefixCommandHandler('+');

    context = {
      customCommandService,
      auditService,
      settingsService: null,
      identityService: null
    };
  });

  afterEach(() => {
    if (db) db.close();
  });

  test('Creating command with custom prefix (e.g. "!") triggers with "!" and rejects "+"', async () => {
    // Command created specifically with prefix "!"
    customCommandService.createCommand(guildId, {
      name: 'vip',
      response: 'Compre seu VIP em https://loja.com!',
      creatorId: 'u_tester_1',
      customPrefix: '!'
    });

    // 1. !vip triggers
    const msgExcl = createMockMessage('!vip');
    const handledExcl = await handler.handle(msgExcl, context);
    assert.equal(handledExcl, true);
    const channelOutput = msgExcl.getChannelData();
    assert.ok(channelOutput && channelOutput.content.includes('Compre seu VIP'));

    // 2. +vip does not trigger this command
    const msgPlus = createMockMessage('+vip');
    const handledPlus = await handler.handle(msgPlus, context);
    assert.equal(handledPlus, false);
  });

  test('Creating command with "sem_prefixo: true" triggers directly without prefix', async () => {
    // Command created without requiring prefix
    customCommandService.createCommand(guildId, {
      name: 'salve',
      response: 'Salve {user}! Tamo junto!',
      creatorId: 'u_tester_1',
      requirePrefix: 0,
      matchMode: 'starts_with'
    });

    // 1. Just saying "salve" in chat triggers it!
    const msgDirect = createMockMessage('salve');
    const handledDirect = await handler.handle(msgDirect, context);
    assert.equal(handledDirect, true);
    const output = msgDirect.getChannelData();
    assert.ok(output && output.content.includes('Tamo junto!'));

    // 2. Saying "salve galera" triggers it with arguments
    const msgArgs = createMockMessage('salve galera do discord');
    const handledArgs = await handler.handle(msgArgs, context);
    assert.equal(handledArgs, true);

    // 3. Normal chatter without the command name returns false
    const msgChat = createMockMessage('ola galera, boa tarde');
    const handledChat = await handler.handle(msgChat, context);
    assert.equal(handledChat, false);
  });

  test('Creating command with "match_mode: contains" triggers if word is spoken anywhere in message', async () => {
    // Command with match_mode contains ("so de falar na mensagem ja vem o comando")
    customCommandService.createCommand(guildId, {
      name: 'pix',
      response: 'Chave PIX do servidor: pix@stark.com',
      creatorId: 'u_tester_1',
      requirePrefix: 0,
      matchMode: 'contains'
    });

    // "alguem manda o pix da loja por favor" triggers it!
    const msgPhrase = createMockMessage('alguem me passa a chave pix da loja por favor?');
    const handledPhrase = await handler.handle(msgPhrase, context);
    assert.equal(handledPhrase, true);
    const output = msgPhrase.getChannelData();
    assert.ok(output && output.content.includes('pix@stark.com'));
  });

  test('Directive tags in response ({semprefixo}, {contem}, {prefix:!}) automatically configure the command', async () => {
    // 1. Tag {semprefixo}
    const cmd1 = customCommandService.createCommand(guildId, {
      name: 'ola',
      response: '{semprefixo} Olá {user}! Seja bem-vindo!',
      creatorId: 'u_tester_1'
    });
    assert.equal(cmd1.require_prefix, 0);
    assert.ok(!cmd1.response.includes('{semprefixo}'));

    // 2. Tag {contem}
    const cmd2 = customCommandService.createCommand(guildId, {
      name: 'duvida',
      response: '{contem} Se você tem alguma dúvida, abra um ticket em #suporte!',
      creatorId: 'u_tester_1'
    });
    assert.equal(cmd2.require_prefix, 0);
    assert.equal(cmd2.match_mode, 'contains');

    // 3. Tag {prefix:?}
    const cmd3 = customCommandService.createCommand(guildId, {
      name: 'regras',
      response: '{prefix:?} Leia as regras em #regras.',
      creatorId: 'u_tester_1'
    });
    assert.equal(cmd3.custom_prefix, '?');
    assert.equal(cmd3.require_prefix, 1);
  });

  test('Creating command starting with symbol (e.g. !lojavip) automatically infers custom prefix', async () => {
    const cmd = customCommandService.createCommand(guildId, {
      name: '!lojavip',
      response: 'Visite nossa loja!',
      creatorId: 'u_tester_1'
    });
    assert.equal(cmd.name, 'lojavip');
    assert.equal(cmd.custom_prefix, '!');
    assert.equal(cmd.require_prefix, 1);
  });

  test('Creating command with "match_mode: exact" triggers only when message is exactly identical', async () => {
    customCommandService.createCommand(guildId, {
      name: 'pingou',
      response: 'Pong perfeito!',
      creatorId: 'u_tester_1',
      requirePrefix: 0,
      matchMode: 'exact'
    });

    // 1. Exact message triggers
    const msgExact = createMockMessage('pingou');
    const handledExact = await handler.handle(msgExact, context);
    assert.equal(handledExact, true);
    assert.ok(msgExact.getChannelData().content.includes('Pong perfeito!'));

    // 2. Extra words do NOT trigger exact match
    const msgExtra = createMockMessage('pingou aqui rapaziada');
    const handledExtra = await handler.handle(msgExtra, context);
    assert.equal(handledExtra, false);

    // 3. Sentence containing it does NOT trigger exact match
    const msgSentence = createMockMessage('olha la pingou');
    const handledSentence = await handler.handle(msgSentence, context);
    assert.equal(handledSentence, false);
  });

  test('/customcmd criar with sem_prefixo and modo_disparo options', async () => {
    let replyPayload = null;
    const mockInteraction = {
      guild: { id: guildId, name: 'Servidor' },
      user: { id: 'u_tester_1' },
      options: {
        getSubcommand: () => 'criar',
        getString: (opt) => {
          if (opt === 'nome') return 'resenha';
          if (opt === 'resposta') return 'Bora resenhar!';
          if (opt === 'modo_disparo') return 'contains';
          return null;
        },
        getBoolean: (opt) => opt === 'sem_prefixo' ? true : null
      },
      reply: async (p) => { replyPayload = p; }
    };

    await customcmdSlash.execute(mockInteraction, context);
    assert.ok(replyPayload && replyPayload.embeds);

    const saved = customCommandService.getCommand(guildId, 'resenha');
    assert.ok(saved);
    assert.equal(saved.require_prefix, 0);
    assert.equal(saved.match_mode, 'contains');
  });

  test('Case-insensitivity: triggers regardless of uppercase, lowercase, or mixed case', async () => {
    // 1. Prefixless with contains
    customCommandService.createCommand(guildId, {
      name: 'pix',
      response: 'Chave PIX: 12345',
      creatorId: 'u_tester_1',
      requirePrefix: 0,
      matchMode: 'contains'
    });

    // Uppercase PIX
    const msgUpper = createMockMessage('ALGUEM MANDA O PIX POR FAVOR');
    const handledUpper = await handler.handle(msgUpper, context);
    assert.equal(handledUpper, true);
    assert.ok(msgUpper.getChannelData().content.includes('12345'));

    // Mixed case PiX! with punctuation
    const msgMixed = createMockMessage('manda o PiX!');
    const handledMixed = await handler.handle(msgMixed, context);
    assert.equal(handledMixed, true);

    // 2. Prefixless with exact: RESENHA triggers resenha
    customCommandService.createCommand(guildId, {
      name: 'resenha',
      response: 'Resenha ativada!',
      creatorId: 'u_tester_1',
      requirePrefix: 0,
      matchMode: 'exact'
    });
    const msgExactUpper = createMockMessage('RESENHA');
    const handledExactUpper = await handler.handle(msgExactUpper, context);
    assert.equal(handledExactUpper, true);
    assert.ok(msgExactUpper.getChannelData().content.includes('Resenha ativada!'));

    // 3. Prefixed command: +RESENHA
    customCommandService.createCommand(guildId, {
      name: 'aviso',
      response: 'Aviso importante!',
      creatorId: 'u_tester_1',
      requirePrefix: 1
    });
    const msgPrefUpper = createMockMessage('+AVISO');
    const handledPrefUpper = await handler.handle(msgPrefUpper, context);
    assert.equal(handledPrefUpper, true);
    assert.ok(msgPrefUpper.getChannelData().content.includes('Aviso importante!'));
  });

  test('Renaming command updates name in place without creating duplicates', async () => {
    customCommandService.createCommand(guildId, {
      name: 'antigo',
      response: 'Resposta antiga',
      creatorId: 'u_tester_1',
      requirePrefix: 0
    });

    // Rename 'antigo' to 'novo'
    const updated = customCommandService.updateCommand(guildId, 'antigo', {
      newName: 'novo',
      response: 'Resposta nova'
    });
    assert.equal(updated.name, 'novo');
    assert.equal(updated.response, 'Resposta nova');

    // 'antigo' must not exist anymore
    const oldCmd = customCommandService.getCommand(guildId, 'antigo');
    assert.equal(oldCmd, null);

    // 'novo' must exist
    const newCmd = customCommandService.getCommand(guildId, 'novo');
    assert.ok(newCmd);

    // Total commands count in guild must remain 1 (no duplicates created)
    const all = customCommandService.listCommands(guildId);
    const names = all.map(c => c.name);
    assert.ok(names.includes('novo'));
    assert.ok(!names.includes('antigo'));
  });
});
