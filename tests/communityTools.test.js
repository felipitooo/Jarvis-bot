const { test, describe, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { DatabaseManager } = require('../src/database/connection');
const { Migrator } = require('../src/database/migrator');
const { GuildRepository } = require('../src/database/repositories/guildRepository');
const { UserRepository } = require('../src/database/repositories/userRepository');
const { TicketRepository } = require('../src/database/repositories/ticketRepository');
const { ReviewRepository } = require('../src/database/repositories/reviewRepository');
const { CommunityRepository } = require('../src/database/repositories/communityRepository');
const { TicketService } = require('../src/services/ticketService');
const { ReviewService } = require('../src/services/reviewService');
const { CommunityService } = require('../src/services/communityService');
const { communityTools } = require('../src/ai/tools/communityTools');

describe('Community & Support Friday AI Tools (Etapa 8)', () => {
  let db;
  let ticketRepo;
  let reviewRepo;
  let commRepo;
  let ticketService;
  let reviewService;
  let commService;
  let toolMap;
  let mockGuild;
  let mockStaff;

  beforeEach(() => {
    db = new DatabaseManager(':memory:');
    db.connect();
    const migrator = new Migrator(db, path.resolve(__dirname, '../src/database/migrations'));
    migrator.runPendingMigrations();

    const guildRepo = new GuildRepository(db);
    const userRepo = new UserRepository(db);

    guildRepo.upsertGuild({ id: 'guild_tools_c', name: 'Community Tools Guild' });
    userRepo.upsertUser({ id: 'user_support_staff', username: 'SupportStaff' });
    userRepo.upsertUser({ id: 'user_requester', username: 'Requester' });

    ticketRepo = new TicketRepository(db);
    reviewRepo = new ReviewRepository(db);
    commRepo = new CommunityRepository(db);

    const mockIdentity = {
      getDisplayName: () => 'Cell',
      getDefaultName: () => 'Cell'
    };

    ticketService = new TicketService({
      ticketRepo,
      identityService: mockIdentity,
      auditService: null
    });

    reviewService = new ReviewService({
      reviewRepo,
      identityService: mockIdentity,
      auditService: null
    });

    commService = new CommunityService({
      communityRepo: commRepo,
      identityService: mockIdentity,
      auditService: null
    });

    mockStaff = { id: 'user_support_staff', username: 'SupportStaff' };

    mockGuild = {
      id: 'guild_tools_c',
      name: 'Community Tools Guild',
      channels: {
        cache: new Map([
          ['chan_feed', { id: 'chan_feed', send: async () => ({ id: 'msg_ok' }) }]
        ]),
        create: async (opts) => ({
          id: `chan_dyn_${Date.now()}`,
          name: opts.name,
          permissionOverwrites: opts.permissionOverwrites,
          send: async () => ({ id: 'dyn_msg' }),
          messages: {
            fetch: async () => new Map([
              ['1', { createdTimestamp: 1000, author: { username: 'Requester' }, content: 'Mensagem de teste no ticket' }]
            ])
          }
        })
      }
    };

    toolMap = new Map();
    for (const tool of communityTools) {
      toolMap.set(tool.name, tool);
    }
  });

  afterEach(() => {
    if (db) db.close();
  });

  test('consultar_tickets_servidor lists tickets with optional status filtering', async () => {
    const tool = toolMap.get('consultar_tickets_servidor');
    assert.ok(tool);

    const requester = { id: 'user_requester', username: 'Requester' };
    await ticketService.openTicket(mockGuild, requester, 'Suporte', 'Ajuda com cargo');

    const result = await tool.execute(
      { status: 'OPEN', limite: 5 },
      { guild: mockGuild, ticketService }
    );

    assert.equal(result.status, 'sucesso');
    assert.equal(result.total, 1);
    assert.equal(result.tickets[0].autor_id, 'user_requester');
    assert.equal(result.tickets[0].status, 'OPEN');
  });

  test('gerenciar_ticket claim, close and reopen lifecycle via AI tool', async () => {
    const tool = toolMap.get('gerenciar_ticket');
    assert.ok(tool);

    const requester = { id: 'user_requester', username: 'Requester' };
    const { ticket } = await ticketService.openTicket(mockGuild, requester, 'Geral', 'Dúvida');

    // 1. Claim
    const claimRes = await tool.execute(
      { ticket_id: ticket.id, acao: 'claim' },
      { guild: mockGuild, user: mockStaff, ticketService }
    );
    assert.equal(claimRes.status, 'sucesso');
    assert.equal(claimRes.acao, 'claim');
    assert.equal(claimRes.assumido_por, 'user_support_staff');

    // 2. Close
    const closeRes = await tool.execute(
      { ticket_id: ticket.id, acao: 'close', motivo: 'Resolvido pelo assistente Cell' },
      { guild: mockGuild, user: mockStaff, ticketService }
    );
    assert.equal(closeRes.status, 'sucesso');
    assert.equal(closeRes.acao, 'close');

    // 3. Reopen
    const reopenRes = await tool.execute(
      { ticket_id: ticket.id, acao: 'reopen' },
      { guild: mockGuild, user: mockStaff, ticketService }
    );
    assert.equal(reopenRes.status, 'sucesso');
    assert.equal(reopenRes.acao, 'reopen');
  });

  test('consultar_estatisticas_avaliacoes returns overall rating breakdown', async () => {
    const tool = toolMap.get('consultar_estatisticas_avaliacoes');
    assert.ok(tool);

    const requester = { id: 'user_requester', username: 'Requester' };
    await reviewService.submitReview(mockGuild, {
      authorUser: requester,
      targetStaffUser: mockStaff,
      rating: 5,
      comment: 'Atendimento muito prestativo!'
    });

    const result = await tool.execute(
      { atendente_id: 'user_support_staff' },
      { guild: mockGuild, reviewService }
    );

    assert.equal(result.status, 'sucesso');
    assert.equal(result.total_avaliacoes, 1);
    assert.equal(result.media_estrelas, 5.0);
    assert.equal(result.distribuicao[5], 1);
  });

  test('moderar_sugestao approves or rejects community suggestions', async () => {
    const tool = toolMap.get('moderar_sugestao');
    assert.ok(tool);

    const requester = { id: 'user_requester', username: 'Requester' };
    const suggestion = commService.createSuggestion('guild_tools_c', requester, 'Criar canal de memes');

    const result = await tool.execute(
      { sugestao_id: suggestion.id, decisao: 'APPROVED', motivo: 'Aprovado para a comunidade' },
      { guild: mockGuild, user: mockStaff, communityService: commService }
    );

    assert.equal(result.status, 'sucesso');
    assert.equal(result.novo_status, 'APPROVED');
    assert.equal(result.motivo, 'Aprovado para a comunidade');
    assert.equal(result.moderado_por, 'user_support_staff');
  });

  test('configurar_boas_vindas updates welcome settings and template', async () => {
    const tool = toolMap.get('configurar_boas_vindas');
    assert.ok(tool);

    const result = await tool.execute(
      {
        canal_id: 'chan_welcome_123',
        ativado: true,
        mensagem: 'Olá {user}! Seja bem-vindo ao servidor {server}!'
      },
      { guild: mockGuild, communityRepo: commRepo }
    );

    assert.equal(result.status, 'sucesso');
    assert.equal(result.ativado, true);
    assert.equal(result.canal_id, 'chan_welcome_123');
    assert.ok(result.mensagem.includes('{user}'));
  });
});
