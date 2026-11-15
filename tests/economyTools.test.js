const { test, describe, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { PermissionFlagsBits } = require('discord.js');
const { DatabaseManager } = require('../src/database/connection');
const { Migrator } = require('../src/database/migrator');
const { GuildRepository } = require('../src/database/repositories/guildRepository');
const { UserRepository } = require('../src/database/repositories/userRepository');
const { EconomyRepository } = require('../src/database/repositories/economyRepository');
const { EconomyService } = require('../src/services/economyService');
const { economyTools } = require('../src/ai/tools/economyTools');

describe('Economy Friday AI Tools', () => {
  let db;
  let ecoRepo;
  let ecoService;
  let toolMap;

  beforeEach(() => {
    db = new DatabaseManager(':memory:');
    db.connect();
    const migrator = new Migrator(db, path.resolve(__dirname, '../src/database/migrations'));
    migrator.runPendingMigrations();

    const guildRepo = new GuildRepository(db);
    const userRepo = new UserRepository(db);
    guildRepo.upsertGuild({ id: 'guild_tools', name: 'Tools Guild' });
    userRepo.upsertUser({ id: 'user_ai_shopper', username: 'Shopper' });
    userRepo.upsertUser({ id: 'user_recipient', username: 'Recipient' });

    ecoRepo = new EconomyRepository(db);
    const mockIdentity = { getDisplayName: () => 'Cell' };

    ecoService = new EconomyService({
      economyRepo: ecoRepo,
      identityService: mockIdentity,
      auditService: null
    });

    toolMap = new Map();
    for (const tool of economyTools) {
      toolMap.set(tool.name, tool);
    }
  });

  afterEach(() => {
    if (db) db.close();
  });

  test('consultar_saldo_membro returns detailed balance and rank', async () => {
    ecoRepo.updateBalances('guild_tools', 'user_ai_shopper', { walletBalance: 400, bankBalance: 600 });
    const tool = toolMap.get('consultar_saldo_membro');

    const res = await tool.execute(
      { membro_id: 'user_ai_shopper' },
      {
        guild: { id: 'guild_tools' },
        user: { id: 'user_ai_shopper' },
        economyService: ecoService
      }
    );

    assert.equal(res.status, 'sucesso');
    assert.equal(res.carteira, 400);
    assert.equal(res.banco, 600);
    assert.equal(res.total, 1000);
    assert.equal(res.ranking, 1);
  });

  test('transferir_moedas sends coins to another member', async () => {
    ecoRepo.updateBalances('guild_tools', 'user_ai_shopper', { walletBalance: 500 });
    const tool = toolMap.get('transferir_moedas');

    const res = await tool.execute(
      { destinatario_id: 'user_recipient', quantia: 200 },
      {
        guild: { id: 'guild_tools' },
        user: { id: 'user_ai_shopper' },
        economyService: ecoService
      }
    );

    assert.equal(res.status, 'sucesso');
    assert.equal(res.quantia, 200);

    const recipient = ecoRepo.getAccount('guild_tools', 'user_recipient');
    assert.equal(recipient.walletBalance, 200);
  });

  test('gerenciar_economia_admin checks ManageGuild permission and modifies balance', async () => {
    const tool = toolMap.get('gerenciar_economia_admin');

    const mockAdminMember = {
      permissions: {
        has: (perm) => perm === PermissionFlagsBits.ManageGuild
      }
    };

    const res = await tool.execute(
      { membro_id: 'user_recipient', campo: 'wallet', acao: 'add', quantia: 1000, motivo: 'Premiação' },
      {
        guild: { id: 'guild_tools' },
        member: mockAdminMember,
        user: { id: 'admin_user' },
        economyService: ecoService
      }
    );

    assert.equal(res.status, 'sucesso');
    assert.equal(res.carteira_atual, 1000);

    // Permission denied case
    const mockNonAdminMember = {
      permissions: {
        has: () => false
      }
    };

    await assert.rejects(async () => {
      await tool.execute(
        { membro_id: 'user_recipient', campo: 'wallet', acao: 'add', quantia: 50 },
        {
          guild: { id: 'guild_tools' },
          member: mockNonAdminMember,
          user: { id: 'non_admin' },
          economyService: ecoService
        }
      );
    }, /Permissão Gerenciar Servidor/);
  });

  test('consultar_loja_itens and comprar_item_loja work via AI tool execution', async () => {
    ecoRepo.updateBalances('guild_tools', 'user_ai_shopper', { walletBalance: 500 });
    ecoService.createShopItem('guild_tools', {
      name: 'Armadura Encantada',
      price: 200,
      stock: 3
    });

    const listTool = toolMap.get('consultar_loja_itens');
    const listRes = await listTool.execute({}, {
      guild: { id: 'guild_tools' },
      economyService: ecoService
    });

    assert.equal(listRes.status, 'sucesso');
    assert.equal(listRes.total_itens, 1);
    assert.equal(listRes.itens[0].nome, 'Armadura Encantada');

    const buyTool = toolMap.get('comprar_item_loja');
    const buyRes = await buyTool.execute(
      { item_id_ou_nome: 'Armadura Encantada', quantidade: 1 },
      {
        guild: { id: 'guild_tools' },
        member: { id: 'user_ai_shopper' },
        user: { id: 'user_ai_shopper' },
        economyService: ecoService
      }
    );

    assert.equal(buyRes.status, 'sucesso');
    assert.equal(buyRes.custo_total, 200);

    const inv = ecoService.getUserInventory('guild_tools', 'user_ai_shopper');
    assert.equal(inv.length, 1);
    assert.equal(inv[0].name, 'Armadura Encantada');
  });

  test('consultar_ranking_economia returns sorted leaders', async () => {
    ecoRepo.updateBalances('guild_tools', 'user_ai_shopper', { walletBalance: 1200 });
    ecoRepo.updateBalances('guild_tools', 'user_recipient', { walletBalance: 300 });

    const tool = toolMap.get('consultar_ranking_economia');
    const res = await tool.execute({ limite: 5 }, {
      guild: { id: 'guild_tools' },
      economyService: ecoService
    });

    assert.equal(res.status, 'sucesso');
    assert.equal(res.ranking.length, 2);
    assert.equal(res.ranking[0].usuario_id, 'user_ai_shopper');
  });
});
