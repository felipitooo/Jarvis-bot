const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const { DatabaseManager } = require('../src/database/connection');
const { Migrator } = require('../src/database/migrator');
const { GuildRepository } = require('../src/database/repositories/guildRepository');
const { CustomCommandRepository } = require('../src/database/repositories/customCommandRepository');
const { CustomCommandService, RESERVED_COMMAND_NAMES } = require('../src/services/customCommandService');
const { parsePlaceholders, getPlaceholdersDocumentation, resolveColor } = require('../src/utils/placeholderParser');

describe('Custom Commands & Placeholders Engine ({})', () => {
  let db;
  let customRepo;
  let customService;
  const guildId = 'guild_custom_test';

  before(async () => {
    db = new DatabaseManager(':memory:');
    db.connect();
    const migrator = new Migrator(db);
    await migrator.runPendingMigrations();

    const guildRepo = new GuildRepository(db);
    guildRepo.upsertGuild({ id: guildId, name: 'Stark Industries HQ' });

    customRepo = new CustomCommandRepository(db);
    customService = new CustomCommandService({
      customCommandRepo: customRepo,
      economyService: {
        getBalance: () => ({ walletBalance: 1250, bankBalance: 5000, totalBalance: 6250 })
      },
      experienceService: {
        getMemberXp: () => ({ level: 42, current_xp: 9900 })
      },
      identityService: { getDisplayName: () => 'Jarvis' },
      auditService: { logAction: () => true }
    });
  });

  after(() => {
    if (db) db.close();
  });

  // 1. Placeholder Parsing Engine
  describe('Placeholder Parser', () => {
    const mockAuthor = {
      id: '111222333',
      username: 'TonyStark',
      tag: 'TonyStark#0001',
      displayAvatarURL: () => 'https://example.com/avatar.png',
      createdAt: new Date('2020-01-01')
    };

    const mockMember = {
      user: mockAuthor,
      displayName: 'Iron Man',
      joinedAt: new Date('2021-06-15'),
      roles: {
        cache: new Map([
          ['r1', { name: 'VIP' }],
          ['r2', { name: 'Avenger' }],
          ['@everyone', { name: '@everyone' }]
        ]),
        highest: { name: 'Avenger', hexColor: '#E74C3C' }
      }
    };

    const mockTarget = {
      id: '444555666',
      username: 'PeterParker',
      displayAvatarURL: () => 'https://example.com/peter.png',
      createdAt: new Date('2022-02-02')
    };

    const mockGuild = {
      id: guildId,
      name: 'Stark Industries HQ',
      memberCount: 500,
      iconURL: () => 'https://example.com/icon.png',
      ownerId: '111222333'
    };

    const mockChannel = {
      id: '777888999',
      name: 'laboratorio'
    };

    it('should parse basic author and server tags correctly', () => {
      const template = 'Olá {user}! Bem-vindo ao {server}. Seu nome é {username} ({user.displayName}). Total de membros: {members}.';
      const parsed = parsePlaceholders(template, {
        guild: mockGuild,
        member: mockMember,
        author: mockAuthor,
        channel: mockChannel
      });

      assert.strictEqual(parsed.content, 'Olá <@111222333>! Bem-vindo ao Stark Industries HQ. Seu nome é TonyStark (Iron Man). Total de membros: 500.');
      assert.strictEqual(parsed.isEmbed, false);
      assert.strictEqual(parsed.shouldDelete, false);
      assert.strictEqual(parsed.sendDm, false);
    });

    it('should parse target member tags when target is provided', () => {
      const template = '{user} enviou um convite para {target}! Alvo: {target.username} (ID: {target.id})';
      const parsed = parsePlaceholders(template, {
        guild: mockGuild,
        member: mockMember,
        author: mockAuthor,
        targetUser: mockTarget
      });

      assert.strictEqual(parsed.content, '<@111222333> enviou um convite para <@444555666>! Alvo: PeterParker (ID: 444555666)');
    });

    it('should parse argument tags correctly', () => {
      const template = 'Comando acionado com: {args}! 1º: {arg:1}, 2º: {arg:2}, Resto: {arg:2+}';
      const parsed = parsePlaceholders(template, {
        args: ['primeiro', 'segundo', 'terceiro', 'quarto']
      });

      assert.strictEqual(parsed.content, 'Comando acionado com: primeiro segundo terceiro quarto! 1º: primeiro, 2º: segundo, Resto: segundo terceiro quarto');
    });

    it('should evaluate random choices, coinflip, roll and numbers', () => {
      const template = 'Escolha: {choose:A;B;C} | Moeda: {coinflip} | Dado: {roll} | Num: {random.number:10;20} | Porcentagem: {percent}';
      const parsed = parsePlaceholders(template, {});

      assert.match(parsed.content, /Escolha: [ABC]/);
      assert.match(parsed.content, /Moeda: 🪙 (?:Cara|Coroa)/);
      assert.match(parsed.content, /Dado: ⚀|⚁|⚂|⚃|⚄|⚅/);
      assert.match(parsed.content, /Num: (?:1[0-9]|20)/);
      assert.match(parsed.content, /Porcentagem: \d+%/);
    });

    it('should parse economy and XP tags', () => {
      const template = 'Você possui {coins} moedas na carteira, {bank} no banco. Seu nível é {level} com {xp} XP.';
      const parsed = parsePlaceholders(template, {
        economyData: { walletBalance: 1250, bankBalance: 5000, totalBalance: 6250 },
        xpData: { level: 42, currentXp: 9900 }
      });

      assert.strictEqual(parsed.content, 'Você possui 1250 moedas na carteira, 5000 no banco. Seu nível é 42 com 9900 XP.');
    });

    it('should handle action modifiers {delete}, {dm}, {reply}', () => {
      const template = '{delete}{dm}{reply}Mensagem confidencial enviada.';
      const parsed = parsePlaceholders(template, {});

      assert.strictEqual(parsed.content, 'Mensagem confidencial enviada.');
      assert.strictEqual(parsed.shouldDelete, true);
      assert.strictEqual(parsed.sendDm, true);
      assert.strictEqual(parsed.shouldReply, true);
    });

    it('should build a rich Embed when {embed} is present', () => {
      const template = '{embed}{color:gold}{title:Anúncio Especial}{description:Olá {username}! O servidor {server} está em festa!}{field:Prêmio;1000 Moedas;true}{field:Data;{date};true}{footer:J.A.R.V.I.S Security}';
      const parsed = parsePlaceholders(template, {
        guild: mockGuild,
        author: mockAuthor
      });

      assert.strictEqual(parsed.isEmbed, true);
      assert.ok(parsed.embed);
      assert.strictEqual(parsed.embed.data.title, 'Anúncio Especial');
      assert.strictEqual(parsed.embed.data.description, 'Olá TonyStark! O servidor Stark Industries HQ está em festa!');
      assert.strictEqual(parsed.embed.data.color, 0xF1C40F);
      assert.strictEqual(parsed.embed.data.fields.length, 2);
      assert.strictEqual(parsed.embed.data.fields[0].name, 'Prêmio');
      assert.strictEqual(parsed.embed.data.fields[0].value, '1000 Moedas');
      assert.strictEqual(parsed.embed.data.footer.text, 'J.A.R.V.I.S Security');
    });

    it('should resolve named and hex colors correctly', () => {
      assert.strictEqual(resolveColor('red'), 0xE74C3C);
      assert.strictEqual(resolveColor('green'), 0x2ECC71);
      assert.strictEqual(resolveColor('#FF0000'), 0xFF0000);
      assert.strictEqual(resolveColor('0x00FF00'), 0x00FF00);
    });
  });

  // 2. Custom Command Service CRUD & Validation
  describe('Custom Command Service', () => {
    it('should create a new custom command with valid parameters', () => {
      const cmd = customService.createCommand(guildId, {
        name: 'regras',
        response: 'Regras do servidor {server}: 1. Respeito mútuo. 2. Sem spam em {channel}.',
        description: 'Exibe as regras',
        creatorId: 'user_admin_1'
      });

      assert.strictEqual(cmd.name, 'regras');
      assert.strictEqual(cmd.description, 'Exibe as regras');
      assert.strictEqual(customService.hasCommand(guildId, 'regras'), true);
    });

    it('should reject creating duplicate command name in same guild', () => {
      assert.throws(() => {
        customService.createCommand(guildId, {
          name: 'regras',
          response: 'Outra resposta',
          creatorId: 'user_admin_1'
        });
      }, /Já existe um comando personalizado/);
    });

    it('should reject reserved system command names', () => {
      assert.throws(() => {
        customService.createCommand(guildId, {
          name: 'quiz',
          response: 'Sobrescrever quiz',
          creatorId: 'user_admin_1'
        });
      }, /comando nativo reservado/);

      assert.throws(() => {
        customService.createCommand(guildId, {
          name: 'help',
          response: 'Sobrescrever help',
          creatorId: 'user_admin_1'
        });
      }, /comando nativo reservado/);
    });

    it('should reject invalid command names (spaces, special characters, too short)', () => {
      assert.throws(() => {
        customService.createCommand(guildId, {
          name: 'a',
          response: 'Curto demais',
          creatorId: 'user_admin_1'
        });
      }, /entre 2 e 32 caracteres/);

      assert.throws(() => {
        customService.createCommand(guildId, {
          name: 'meu comando',
          response: 'Com espaços',
          creatorId: 'user_admin_1'
        });
      }, /entre 2 e 32 caracteres/);
    });

    it('should update an existing command response and description', () => {
      const updated = customService.updateCommand(guildId, 'regras', {
        response: 'Novas regras de {server}!',
        description: 'Regras 2.0',
        actorId: 'user_admin_1'
      });

      assert.strictEqual(updated.response, 'Novas regras de {server}!');
      assert.strictEqual(updated.description, 'Regras 2.0');
    });

    it('should list and count commands for the guild', () => {
      customService.createCommand(guildId, {
        name: 'vip',
        response: 'Vantagens VIP para {user}!',
        creatorId: 'user_admin_1'
      });

      const list = customService.listCommands(guildId);
      assert.strictEqual(list.length, 2);
      assert.strictEqual(customService.countCommands(guildId), 2);
    });

    it('should delete a custom command successfully', () => {
      const deleted = customService.deleteCommand(guildId, 'vip', 'user_admin_1');
      assert.strictEqual(deleted, true);
      assert.strictEqual(customService.hasCommand(guildId, 'vip'), false);
    });

    it('should return placeholder documentation', () => {
      const docs = customService.getPlaceholdersDocumentation();
      assert.ok(Array.isArray(docs));
      assert.ok(docs.length >= 6);
    });
  });

  // 3. Execution Integration
  describe('Command Execution Simulation', () => {
    it('should execute a custom command and send message with incremented uses', async () => {
      let sentPayload = null;
      let deletedMessage = false;

      const mockMsg = {
        guild: { id: guildId, name: 'Stark Industries HQ', memberCount: 500 },
        member: { displayName: 'Tony' },
        author: { id: 'u_ironman', username: 'Tony' },
        channel: {
          id: 'c_lab',
          name: 'lab',
          send: async (p) => { sentPayload = p; return p; }
        },
        deletable: true,
        delete: async () => { deletedMessage = true; },
        mentions: { users: new Map() }
      };

      customService.createCommand(guildId, {
        name: 'aviso',
        response: '{delete}Atenção {user}! Este é um aviso automático de {server}.',
        creatorId: 'user_admin_1'
      });

      const handled = await customService.executeCommand(guildId, 'aviso', [], mockMsg);
      assert.strictEqual(handled, true);
      assert.strictEqual(deletedMessage, true);
      assert.strictEqual(sentPayload.content, 'Atenção <@u_ironman>! Este é um aviso automático de Stark Industries HQ.');

      const cmdAfter = customService.getCommand(guildId, 'aviso');
      assert.strictEqual(cmdAfter.uses_count, 1);
    });
  });
});
