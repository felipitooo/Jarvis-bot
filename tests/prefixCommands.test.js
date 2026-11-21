const { test, describe, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { DatabaseManager } = require('../src/database/connection');
const { Migrator } = require('../src/database/migrator');
const { GuildRepository } = require('../src/database/repositories/guildRepository');
const { UserRepository } = require('../src/database/repositories/userRepository');
const { EconomyRepository } = require('../src/database/repositories/economyRepository');
const { EconomyService } = require('../src/services/economyService');
const { IdentityService } = require('../src/services/identityService');
const { SettingsService } = require('../src/services/settingsService');
const { SettingsRepository } = require('../src/database/repositories/settingsRepository');
const { AuditRepository } = require('../src/database/repositories/auditRepository');
const { AuditService } = require('../src/services/auditService');
const { MusicVoiceRepository } = require('../src/database/repositories/musicVoiceRepository');
const { MusicService } = require('../src/services/musicService');
const { prefixCommandHandler } = require('../src/handlers/prefixCommandHandler');
const { PermissionFlagsBits } = require('discord.js');

describe('Traditional Prefix Commands (+work, +slut, +bank, +ban, +daily, etc.)', () => {
  let db;
  let economyService;
  let identityService;
  let eventContext;

  beforeEach(() => {
    db = new DatabaseManager(':memory:');
    db.connect();
    const migrator = new Migrator(db, path.resolve(__dirname, '../src/database/migrations'));
    migrator.runPendingMigrations();

    const guildRepo = new GuildRepository(db);
    guildRepo.upsertGuild({ id: 'g_prefix_1', name: 'Prefix Guild' });
    const userRepo = new UserRepository(db);
    userRepo.upsertUser({ id: 'u_worker_1', username: 'Worker' });
    userRepo.upsertUser({ id: 'u_slut_1', username: 'Slutty' });
    userRepo.upsertUser({ id: 'u_banker_1', username: 'Banker' });

    const auditRepo = new AuditRepository(db);
    const auditService = new AuditService(auditRepo);
    const settingsRepo = new SettingsRepository(db);
    const settingsService = new SettingsService(settingsRepo, auditService);
    identityService = new IdentityService(settingsService, auditService, 'Cell');

    const economyRepo = new EconomyRepository(db);
    economyService = new EconomyService({
      economyRepo,
      identityService,
      auditService
    });

    const musicVoiceRepo = new MusicVoiceRepository(db);
    const musicService = new MusicService({
      musicVoiceRepo,
      identityService,
      auditService
    });

    eventContext = {
      economyService,
      identityService,
      musicService,
      moderationService: {
        ban: async () => ({ punishment: { id: 101 } })
      },
      protectionService: null,
      lockdownService: null,
      experienceService: null,
      ticketService: null,
      socialFunService: null
    };
  });

  afterEach(() => {
    if (db) db.close();
  });

  test('+work gives money to user and sends embed', async () => {
    let replyPayload = null;
    const mockMessage = {
      content: '+work',
      guild: { id: 'g_prefix_1' },
      author: { id: 'u_worker_1', username: 'Worker' },
      member: { permissions: { has: () => false } },
      reply: async (payload) => {
        replyPayload = payload;
      }
    };

    const handled = await prefixCommandHandler.handle(mockMessage, eventContext);
    assert.equal(handled, true);
    assert.ok(replyPayload);
    assert.ok(replyPayload.embeds && replyPayload.embeds.length === 1);
    assert.ok(replyPayload.embeds[0].data.title.includes('Dia de Trabalho'));
  });

  test('+slut runs risk job', async () => {
    let replyPayload = null;
    const mockMessage = {
      content: '+slut',
      guild: { id: 'g_prefix_1' },
      author: { id: 'u_slut_1', username: 'Slutty' },
      member: { permissions: { has: () => false } },
      reply: async (payload) => {
        replyPayload = payload;
      }
    };

    const handled = await prefixCommandHandler.handle(mockMessage, eventContext);
    assert.equal(handled, true);
    assert.ok(replyPayload);
    assert.ok(replyPayload.embeds && replyPayload.embeds.length === 1);
  });

  test('+bank displays wallet and bank balance', async () => {
    let replyPayload = null;
    const mockMessage = {
      content: '+bank',
      guild: { id: 'g_prefix_1' },
      author: { id: 'u_banker_1', username: 'Banker', displayAvatarURL: () => 'https://avatar.png' },
      member: { permissions: { has: () => false } },
      mentions: { users: new Map(), members: new Map() },
      reply: async (payload) => {
        replyPayload = payload;
      }
    };

    const handled = await prefixCommandHandler.handle(mockMessage, eventContext);
    assert.equal(handled, true);
    assert.ok(replyPayload);
    assert.ok(replyPayload.embeds && replyPayload.embeds.length === 1);
    assert.ok(replyPayload.embeds[0].data.title.includes('Saldo'));
    // Verify bank field does NOT contain "/" limit cap
    const bankField = replyPayload.embeds[0].data.fields.find(f => f.name.includes('Banco'));
    assert.ok(bankField);
    assert.ok(!bankField.value.includes('/'));
  });

  test('+dep all deposits entire wallet into bank', async () => {
    let replyPayload = null;
    const mockMessage = {
      content: '+dep all',
      guild: { id: 'g_prefix_1' },
      author: { id: 'u_worker_1' },
      member: { permissions: { has: () => false } },
      reply: async (payload) => {
        replyPayload = payload;
      }
    };

    // First give money to worker
    economyService.economyRepo.updateBalances('g_prefix_1', 'u_worker_1', { walletBalance: 250, bankBalance: 0 });

    const handled = await prefixCommandHandler.handle(mockMessage, eventContext);
    assert.equal(handled, true);
    assert.ok(replyPayload);
    assert.ok(replyPayload.embeds && replyPayload.embeds.length === 1);
    assert.ok(replyPayload.embeds[0].data.title.includes('Depósito Realizado'));

    const bal = economyService.getBalance('g_prefix_1', 'u_worker_1');
    assert.equal(bal.walletBalance, 0);
    assert.equal(bal.bankBalance, 250);
  });

  test('+sac all withdraws entire bank into wallet', async () => {
    let replyPayload = null;
    const mockMessage = {
      content: '+sac all',
      guild: { id: 'g_prefix_1' },
      author: { id: 'u_worker_1' },
      member: { permissions: { has: () => false } },
      reply: async (payload) => {
        replyPayload = payload;
      }
    };

    // Setup bank funds
    economyService.economyRepo.updateBalances('g_prefix_1', 'u_worker_1', { walletBalance: 0, bankBalance: 300 });

    const handled = await prefixCommandHandler.handle(mockMessage, eventContext);
    assert.equal(handled, true);
    assert.ok(replyPayload);
    assert.ok(replyPayload.embeds && replyPayload.embeds.length === 1);
    assert.ok(replyPayload.embeds[0].data.title.includes('Saque Realizado'));

    const bal = economyService.getBalance('g_prefix_1', 'u_worker_1');
    assert.equal(bal.walletBalance, 300);
    assert.equal(bal.bankBalance, 0);
  });

  test('+ban blocks unauthorized member from banning', async () => {
    let replyText = '';
    const mockMessage = {
      content: '+ban @alvo motivo',
      guild: { id: 'g_prefix_1' },
      author: { id: 'u_unauth_1' },
      member: {
        permissions: {
          has: (perm) => false
        }
      },
      mentions: { users: new Map([['target_1', { id: 'target_1', username: 'BadUser' }]]) },
      reply: async (txt) => {
        replyText = txt;
      }
    };

    const handled = await prefixCommandHandler.handle(mockMessage, eventContext);
    assert.equal(handled, true);
    assert.ok(replyText.includes('Você não tem permissão'));
  });

  test('+ban executes when member has BanMembers permission', async () => {
    let replyText = '';
    const mockTargetUser = { id: 'target_banned', username: 'AlvoBan' };
    const mockMessage = {
      content: '+ban @AlvoBan spam grave',
      guild: {
        id: 'g_prefix_1',
        members: {
          me: { id: 'bot_me' },
          fetch: async () => ({ id: 'target_banned' })
        }
      },
      author: { id: 'u_admin_1' },
      member: {
        permissions: {
          has: (perm) => perm === PermissionFlagsBits.BanMembers || perm === PermissionFlagsBits.Administrator
        }
      },
      mentions: { users: new Map([['target_banned', mockTargetUser]]) },
      reply: async (payload) => {
        replyText = typeof payload === 'string' ? payload : (payload.embeds?.[0]?.data?.description || JSON.stringify(payload));
        const confirmCustomId = payload?.components?.[0]?.components?.[0]?.data?.custom_id;
        return {
          createMessageComponentCollector: () => {
            const { EventEmitter } = require('node:events');
            const ee = Object.assign(new EventEmitter(), {
              stop: () => {}
            });
            setImmediate(() => {
              ee.emit('collect', {
                customId: confirmCustomId,
                user: { id: 'u_admin_1' },
                deferUpdate: async () => {},
                editReply: async (res) => {
                  replyText = typeof res === 'string' ? res : (res.embeds?.[0]?.data?.description || JSON.stringify(res));
                },
                reply: async () => {}
              });
            });
            return ee;
          },
          edit: async (edited) => {
            replyText = typeof edited === 'string' ? edited : (edited.embeds?.[0]?.data?.description || JSON.stringify(edited));
          }
        };
      }
    };

    const handled = await prefixCommandHandler.handle(mockMessage, eventContext);
    assert.equal(handled, true);
    // Allow immediate collector event to resolve
    await new Promise(r => setTimeout(r, 200));
    assert.ok(replyText.includes('foi banido permanentemente'));
  });

  test('+ajuda lists all available prefix commands', async () => {
    let replyPayload = null;
    const mockMessage = {
      content: '+ajuda',
      guild: { id: 'g_prefix_1' },
      author: { id: 'u_helper_1' },
      member: { permissions: { has: () => false } },
      reply: async (payload) => {
        replyPayload = payload;
      }
    };

    const { botConfig: helpBotConfig } = require('../src/config/botConfig');
    const originalGetConfig = helpBotConfig.getConfig.bind(helpBotConfig);
    helpBotConfig.getConfig = () => ({ ...originalGetConfig(), help: { enabled: true } });
    let handled;
    try {
      handled = await prefixCommandHandler.handle(mockMessage, eventContext);
    } finally {
      helpBotConfig.getConfig = originalGetConfig;
    }
    assert.equal(handled, true);
    assert.ok(replyPayload);
    assert.ok(replyPayload.embeds && replyPayload.embeds.length === 1);
    assert.ok(replyPayload.embeds[0].data.title.includes('Central de Comandos'));
  });

  test('+ajuda stays silent when help is disabled', async () => {
    let replied = false;
    const mockMessage = {
      content: '+ajuda',
      guild: { id: 'g_prefix_1' },
      author: { id: 'u_helper_1' },
      member: { permissions: { has: () => false } },
      reply: async () => { replied = true; }
    };
    const { botConfig: helpBotConfig } = require('../src/config/botConfig');
    const originalGetConfig = helpBotConfig.getConfig.bind(helpBotConfig);
    helpBotConfig.getConfig = () => ({ ...originalGetConfig(), help: { enabled: false } });
    try {
      const handled = await prefixCommandHandler.handle(mockMessage, eventContext);
      assert.equal(handled, false);
      assert.equal(replied, false);
    } finally {
      helpBotConfig.getConfig = originalGetConfig;
    }
  });

  test('+crime deducts from bank when wallet is empty and does not fine 0', async () => {
    // Worker has 0 in wallet, 500 in bank
    economyService.economyRepo.updateBalances('g_prefix_1', 'u_worker_1', { walletBalance: 0, bankBalance: 500 });
    // Force crime fail by setting success rate to 0 in config
    economyService.economyRepo.upsertGuildConfig('g_prefix_1', { crimeSuccessRate: 0, crimeMin: 100 });

    let replyPayload = null;
    const mockMessage = {
      content: '+crime',
      guild: { id: 'g_prefix_1' },
      author: { id: 'u_worker_1' },
      member: { permissions: { has: () => false } },
      reply: async (payload) => {
        replyPayload = payload;
      }
    };

    const handled = await prefixCommandHandler.handle(mockMessage, eventContext);
    assert.equal(handled, true);
    assert.ok(replyPayload);
    assert.ok(replyPayload.embeds && replyPayload.embeds.length === 1);
    assert.ok(!replyPayload.embeds[0].data.description.includes('multado em 🪙 0'));
    
    // Check that fine was deducted from bank
    const bal = economyService.getBalance('g_prefix_1', 'u_worker_1');
    assert.equal(bal.walletBalance, 0);
    assert.ok(bal.bankBalance < 500);
  });

  test('+crime when user is totally broke gives community service instead of 0 fine', async () => {
    // User with 0 in wallet and 0 in bank
    economyService.economyRepo.updateBalances('g_prefix_1', 'u_broke', { walletBalance: 0, bankBalance: 0 });
    economyService.economyRepo.upsertGuildConfig('g_prefix_1', { crimeSuccessRate: 0 });

    let replyPayload = null;
    const mockMessage = {
      content: '+crime',
      guild: { id: 'g_prefix_1' },
      author: { id: 'u_broke' },
      member: { permissions: { has: () => false } },
      reply: async (payload) => {
        replyPayload = payload;
      }
    };

    const handled = await prefixCommandHandler.handle(mockMessage, eventContext);
    assert.equal(handled, true);
    assert.ok(replyPayload);
    assert.ok(replyPayload.embeds && replyPayload.embeds.length === 1);
    assert.ok(replyPayload.embeds[0].data.description.includes('serviços comunitários'));
  });

  test('+rob handles new unregistered user without foreign key error', async () => {
    let replyText = '';
    let replyPayload = null;
    const mockMessage = {
      content: '+rob @brand_new_user',
      guild: { id: 'g_prefix_1' },
      author: { id: 'u_worker_1' },
      member: { permissions: { has: () => false } },
      mentions: { users: new Map([['brand_new_user', { id: 'brand_new_user', username: 'BrandNew' }]]) },
      reply: async (payload) => {
        if (typeof payload === 'string') replyText = payload;
        else replyPayload = payload;
      }
    };

    // Ensure worker has funds
    economyService.economyRepo.updateBalances('g_prefix_1', 'u_worker_1', { walletBalance: 100, bankBalance: 0 });

    const handled = await prefixCommandHandler.handle(mockMessage, eventContext);
    assert.equal(handled, true);
    // Should NOT have foreign key error, should cleanly report victim is broke
    assert.ok(!replyText.includes('FOREIGN KEY'));
    assert.ok(replyText.includes('A vítima está falida') || (replyPayload && replyPayload.embeds));
  });

  test('+play rejects when member is not in voice channel', async () => {
    let replyText = '';
    const mockMessage = {
      content: '+play lofi',
      guild: { id: 'g_prefix_1' },
      author: { id: 'u_worker_1', username: 'Worker' },
      member: { voice: null, permissions: { has: () => false } },
      reply: async (txt) => {
        replyText = txt;
      }
    };

    const handled = await prefixCommandHandler.handle(mockMessage, eventContext);
    assert.equal(handled, true);
    assert.ok(replyText.includes('conectado a um canal de voz'));
  });

  test('+play plays preset radio and sends embed when in voice channel', async () => {
    let replyPayload = null;
    const mockMessage = {
      content: '+play lofi',
      guild: { id: 'g_prefix_1' },
      channel: { id: 'c_text_1' },
      author: { id: 'u_worker_1', username: 'Worker' },
      member: {
        voice: { channel: { id: 'vc_1', name: 'Canal de Música' } },
        permissions: { has: () => false }
      },
      reply: async (payload) => {
        replyPayload = payload;
      }
    };

    const handled = await prefixCommandHandler.handle(mockMessage, eventContext);
    assert.equal(handled, true);
    assert.ok(replyPayload);
    assert.ok(replyPayload.embeds && replyPayload.embeds.length === 1);
    assert.ok(replyPayload.embeds[0].data.title.includes('Tocando Agora'));
  });

  test('+stop stops music playback and clears queue', async () => {
    let replyText = '';
    const mockMessage = {
      content: '+stop',
      guild: { id: 'g_prefix_1' },
      author: { id: 'u_worker_1', username: 'Worker' },
      member: {
        voice: { channel: { id: 'vc_1', name: 'Canal de Música' } },
        permissions: { has: () => true },
        roles: { cache: new Map() }
      },
      reply: async (txt) => {
        replyText = txt;
      }
    };

    const handled = await prefixCommandHandler.handle(mockMessage, eventContext);
    assert.equal(handled, true);
    assert.ok(replyText.includes('Reprodução encerrada'));
  });

  test('+lock and +unlock lock and unlock channels correctly', async () => {
    let lockedReason = '';
    let unlocked = false;
    const mockChannel = {
      id: 'c_text_1',
      name: 'geral',
      guild: { id: 'g_prefix_1', roles: { everyone: { id: 'g_prefix_1' } } },
      permissionOverwrites: {
        edit: async (role, perms, opts) => {
          if (perms.SendMessages === false) lockedReason = opts.reason;
          if (perms.SendMessages === null) unlocked = true;
        }
      }
    };

    const lockdownService = {
      lockChannel: async (chan, reason) => {
        await chan.permissionOverwrites.edit(chan.guild.roles.everyone, { SendMessages: false }, { reason });
        return { locked: true };
      },
      unlockChannel: async (chan, reason) => {
        await chan.permissionOverwrites.edit(chan.guild.roles.everyone, { SendMessages: null }, { reason });
        return { unlocked: true };
      }
    };

    const ctx = { ...eventContext, lockdownService };

    let replyLock = '';
    const msgLock = {
      content: '+lock',
      guild: { id: 'g_prefix_1' },
      channel: mockChannel,
      author: { id: 'u_worker_1', username: 'Worker' },
      member: { permissions: { has: () => true } },
      reply: async (txt) => { replyLock = txt; }
    };

    const h1 = await prefixCommandHandler.handle(msgLock, ctx);
    assert.equal(h1, true);
    assert.ok(replyLock.includes('trancado'));

    let replyUnlock = '';
    const msgUnlock = {
      content: '+unlock',
      guild: { id: 'g_prefix_1' },
      channel: mockChannel,
      author: { id: 'u_worker_1', username: 'Worker' },
      member: { permissions: { has: () => true } },
      reply: async (txt) => { replyUnlock = txt; }
    };

    const h2 = await prefixCommandHandler.handle(msgUnlock, ctx);
    assert.equal(h2, true);
    assert.ok(replyUnlock.includes('destrancado'));
    assert.equal(unlocked, true);
  });

  test('+rank and +leaderboard format XP cleanly', async () => {
    const experienceService = {
      getUserRank: () => ({
        level: 5,
        currentXp: 150,
        xpForNextLevel: 300,
        totalXp: 1250,
        rank: 1,
        progressPercent: 50
      }),
      getLeaderboard: () => [
        { userId: 'u_worker_1', level: 5, totalXp: 1250 }
      ]
    };

    const ctx = { ...eventContext, experienceService };

    let rankEmbed = null;
    const msgRank = {
      content: '+rank',
      guild: { id: 'g_prefix_1' },
      author: { id: 'u_worker_1', username: 'Worker', displayAvatarURL: () => null },
      member: { permissions: { has: () => false } },
      reply: async (payload) => { rankEmbed = payload.embeds[0]; }
    };

    const h1 = await prefixCommandHandler.handle(msgRank, ctx);
    assert.equal(h1, true);
    assert.ok(rankEmbed.data.title.includes('Perfil & Nível'));

    let lbEmbed = null;
    const msgLb = {
      content: '+leaderboard',
      guild: { id: 'g_prefix_1' },
      author: { id: 'u_worker_1', username: 'Worker' },
      member: { permissions: { has: () => false } },
      reply: async (payload) => { lbEmbed = payload.embeds[0]; }
    };

    const h2 = await prefixCommandHandler.handle(msgLb, ctx);
    assert.equal(h2, true);
    assert.ok(lbEmbed.data.title.includes('Top 10'));
    assert.ok(lbEmbed.data.description.includes('🥇'));
  });

  test('+clear without number does not delete messages and requests amount', async () => {
    let purged = false;
    let replyText = '';
    const protectionService = {
      purgeMessages: async () => {
        purged = true;
        return { purgedCount: 5 };
      }
    };
    const ctx = { ...eventContext, protectionService };

    const msgNoArg = {
      content: '+clear',
      guild: { id: 'g_prefix_1' },
      channel: { id: 'c_text_1' },
      author: { id: 'u_worker_1' },
      member: { permissions: { has: () => true } },
      reply: async (txt) => { replyText = txt; }
    };

    const handled = await prefixCommandHandler.handle(msgNoArg, ctx);
    assert.equal(handled, true);
    assert.equal(purged, false);
    assert.ok(replyText.includes('informar a quantidade'));

    let sentMsg = '';
    const msgWithArg = {
      content: '+clear 15',
      guild: { id: 'g_prefix_1' },
      channel: {
        id: 'c_text_1',
        send: async (txt) => { sentMsg = txt; return { delete: async () => true }; }
      },
      author: { id: 'u_worker_1' },
      member: { permissions: { has: () => true } },
      delete: async () => true,
      reply: async (txt) => { replyText = txt; }
    };

    const handled2 = await prefixCommandHandler.handle(msgWithArg, ctx);
    assert.equal(handled2, true);
    assert.equal(purged, true);
    assert.ok(sentMsg.includes('excluídas'));

    // Test clear with > 1000
    const msgOver = {
      content: '+clear 1500',
      guild: { id: 'g_prefix_1' },
      channel: { id: 'c_text_1' },
      author: { id: 'u_worker_1' },
      member: { permissions: { has: () => true } },
      reply: async (txt) => { replyText = txt; }
    };
    const handledOver = await prefixCommandHandler.handle(msgOver, ctx);
    assert.equal(handledOver, true);
    assert.ok(replyText.includes('entre 1 e 1000'));
  });

  test('normal message without prefix returns false', async () => {
    const mockMessage = {
      content: 'Olá Cell, como vai?',
      guild: { id: 'g_prefix_1' },
      author: { id: 'u_regular' }
    };

    const handled = await prefixCommandHandler.handle(mockMessage, eventContext);
    assert.equal(handled, false);
  });

  test('social and fun commands execute properly (+ship, +dado, +coinflip, +8ball, +raffle)', async () => {
    const socialFunService = {
      ship: () => ({ percent: 85 }),
      rollDice: (sides) => ({ message: `🎲 O dado de ${sides} lados rolou o número 5!` }),
      coinflip: () => ({ message: 'A moeda caiu em Cara! 🪙' }),
      eightBall: (q) => ({ message: `🎱 Pergunta: ${q} Resposta: Sim!` }),
      raffle: (opts) => ({ message: `🎉 Sorteio realizado! Vencedor: ${opts[0]}` }),
      proposeMarriage: () => ({}),
      getRelationship: () => ({ isMarried: false })
    };

    const ctx = {
      ...eventContext,
      socialFunService
    };

    // +dado
    let dadoReply = '';
    await prefixCommandHandler.handle({
      content: '+dado 20',
      guild: { id: 'g_prefix_1' },
      author: { id: 'u_worker_1', username: 'Tony' },
      reply: async (txt) => { dadoReply = txt; }
    }, ctx);
    assert.ok(dadoReply.includes('dado'));

    // +coinflip
    let coinReply = '';
    await prefixCommandHandler.handle({
      content: '+coinflip',
      guild: { id: 'g_prefix_1' },
      author: { id: 'u_worker_1', username: 'Tony' },
      reply: async (txt) => { coinReply = txt; }
    }, ctx);
    assert.ok(coinReply.includes('moeda'));

    // +8ball
    let eightReply = '';
    await prefixCommandHandler.handle({
      content: '+8ball Eu vou construir uma armadura?',
      guild: { id: 'g_prefix_1' },
      author: { id: 'u_worker_1', username: 'Tony' },
      reply: async (txt) => { eightReply = txt; }
    }, ctx);
    assert.ok(eightReply.includes('Pergunta:'));

    // +ship
    let shipReply = null;
    const targetUser = { id: 'u_target_1', username: 'Pepper', globalName: 'Pepper Potts' };
    await prefixCommandHandler.handle({
      content: '+ship @Pepper',
      guild: { id: 'g_prefix_1', members: { cache: new Map() } },
      mentions: { users: new Map([['u_target_1', targetUser]]) },
      author: { id: 'u_worker_1', username: 'TonyStark', globalName: 'Tony Stark' },
      reply: async (payload) => { shipReply = payload; }
    }, ctx);
    assert.ok(shipReply.content.includes('será que temos um novo casal'));
    assert.ok(shipReply.files.length > 0);
  });

  test('moderation commands: +advertir sends verbal warning without strike, while +warn applies official strike', async () => {
    let warnTarget = null;
    let warnOptions = null;
    const moderationService = {
      warn: async (botMember, modMember, targetMember, options) => {
        warnTarget = targetMember.id;
        warnOptions = options;
        return { punishment: { id: 101 } };
      },
      getMemberWarns: () => [{ is_active: 1 }]
    };

    const ctx = {
      ...eventContext,
      moderationService
    };

    let targetDm = '';
    const targetUser = {
      id: 'u_target_mod',
      username: 'Spammer',
      send: async (msg) => { targetDm = msg; }
    };
    const targetMember = {
      id: 'u_target_mod',
      user: targetUser
    };

    const modMember = {
      permissions: {
        has: () => true
      }
    };

    // Test +advertir (verbal warning)
    let advertirReply = '';
    await prefixCommandHandler.handle({
      content: '+advertir @Spammer Por favor não faça spam de emojis',
      guild: {
        id: 'g_prefix_1',
        name: 'Prefix Guild',
        members: {
          fetch: async () => targetMember,
          me: { id: 'bot_id' }
        }
      },
      member: modMember,
      mentions: { users: new Map([['u_target_mod', targetUser]]) },
      author: { id: 'u_worker_1', username: 'ModTony' },
      reply: async (txt) => { advertirReply = txt; }
    }, ctx);

    assert.ok(advertirReply.includes('Advertência Verbal'));
    assert.ok(targetDm.includes('advertência verbal educativa'));
    assert.equal(warnTarget, null); // Warn service was NOT invoked for verbal warning!

    // Test +warn (formal strike)
    let warnReply = '';
    await prefixCommandHandler.handle({
      content: '+warn @Spammer Reincidência de flood',
      guild: {
        id: 'g_prefix_1',
        name: 'Prefix Guild',
        members: {
          fetch: async () => targetMember,
          me: { id: 'bot_id' }
        }
      },
      member: modMember,
      mentions: { users: new Map([['u_target_mod', targetUser]]) },
      author: { id: 'u_worker_1', username: 'ModTony' },
      reply: async (payload) => {
        warnReply = typeof payload === 'string' ? payload : (payload.embeds?.[0]?.data?.description || JSON.stringify(payload));
        const confirmCustomId = payload?.components?.[0]?.components?.[0]?.data?.custom_id;
        return {
          createMessageComponentCollector: () => {
            const { EventEmitter } = require('node:events');
            const ee = Object.assign(new EventEmitter(), {
              stop: () => {}
            });
            setImmediate(() => {
              ee.emit('collect', {
                customId: confirmCustomId,
                user: { id: 'u_worker_1' },
                deferUpdate: async () => {},
                editReply: async (res) => {
                  warnReply = typeof res === 'string' ? res : ((res.embeds?.[0]?.data?.title || '') + ' ' + (res.embeds?.[0]?.data?.description || '') || JSON.stringify(res));
                },
                reply: async () => {}
              });
            });
            return ee;
          },
          edit: async (edited) => {
            warnReply = typeof edited === 'string' ? edited : ((edited.embeds?.[0]?.data?.title || '') + ' ' + (edited.embeds?.[0]?.data?.description || '') || JSON.stringify(edited));
          }
        };
      }
    }, ctx);

    await new Promise(r => setTimeout(r, 20));
    assert.ok(warnReply.includes('Warn Oficial (Strike)'));
    assert.equal(warnTarget, 'u_target_mod'); // Warn service WAS invoked for formal warn!
    assert.equal(warnOptions.reason, 'Reincidência de flood');
  });
});
