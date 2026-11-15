const { test, describe, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { DatabaseManager } = require('../src/database/connection');
const { Migrator } = require('../src/database/migrator');
const { GuildRepository } = require('../src/database/repositories/guildRepository');
const { UserRepository } = require('../src/database/repositories/userRepository');
const { TicketRepository } = require('../src/database/repositories/ticketRepository');
const { TicketService } = require('../src/services/ticketService');

describe('Tickets System & Lifecycle (Etapa 8)', () => {
  let db;
  let ticketRepo;
  let ticketService;
  let mockGuild;
  let mockUser;
  let mockStaff;

  beforeEach(() => {
    db = new DatabaseManager(':memory:');
    db.connect();
    const migrator = new Migrator(db, path.resolve(__dirname, '../src/database/migrations'));
    migrator.runPendingMigrations();

    const guildRepo = new GuildRepository(db);
    const userRepo = new UserRepository(db);

    guildRepo.upsertGuild({ id: 'guild_ticket_1', name: 'Ticket Testing Guild' });
    userRepo.upsertUser({ id: 'user_client_1', username: 'ClientOne' });
    userRepo.upsertUser({ id: 'user_staff_1', username: 'StaffOne' });

    ticketRepo = new TicketRepository(db);
    const mockIdentity = {
      getDisplayName: () => 'Cell',
      getDefaultName: () => 'Cell'
    };

    ticketService = new TicketService({
      ticketRepo,
      identityService: mockIdentity,
      auditService: null
    });

    mockUser = { id: 'user_client_1', username: 'ClientOne' };
    mockStaff = { id: 'user_staff_1', username: 'StaffOne' };

    mockGuild = {
      id: 'guild_ticket_1',
      name: 'Ticket Testing Guild',
      members: { me: { id: 'bot_cell_id' } },
      channels: {
        cache: new Map(),
        create: async (options) => {
          const chan = {
            id: `chan_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
            name: options.name,
            type: options.type,
            permissionOverwrites: options.permissionOverwrites,
            send: async (msg) => ({ id: 'msg_welcome_ticket', ...msg }),
            delete: async () => true,
            messages: {
              fetch: async () => new Map([
                ['1', { createdTimestamp: 1000, author: { username: 'ClientOne' }, content: 'Preciso de suporte com cobrança' }],
                ['2', { createdTimestamp: 2000, author: { username: 'StaffOne' }, content: 'Olá! Estou analisando seu caso.' }]
              ])
            }
          };
          mockGuild.channels.cache.set(chan.id, chan);
          return chan;
        }
      }
    };
  });

  afterEach(() => {
    if (db) db.close();
  });

  test('ticket config upsert and default values', () => {
    const defaultConfig = ticketRepo.getTicketConfig('guild_ticket_1');
    assert.equal(defaultConfig.maxOpenTicketsPerUser, 1);
    assert.equal(defaultConfig.transcriptChannelId, null);

    const updated = ticketRepo.upsertTicketConfig('guild_ticket_1', {
      maxOpenTicketsPerUser: 3,
      transcriptChannelId: 'chan_transcripts',
      defaultSupportRoleId: 'role_support'
    });

    assert.equal(updated.maxOpenTicketsPerUser, 3);
    assert.equal(updated.transcriptChannelId, 'chan_transcripts');
    assert.equal(updated.defaultSupportRoleId, 'role_support');

    const fetched = ticketRepo.getTicketConfig('guild_ticket_1');
    assert.equal(fetched.maxOpenTicketsPerUser, 3);
  });

  test('openTicket creates private channel and registers in database', async () => {
    const { ticket, channel } = await ticketService.openTicket(
      mockGuild,
      mockUser,
      'Financeiro',
      'Problemas no pagamento VIP'
    );

    assert.ok(ticket.id > 0);
    assert.equal(ticket.guildId, 'guild_ticket_1');
    assert.equal(ticket.authorId, 'user_client_1');
    assert.equal(ticket.categoryName, 'Financeiro');
    assert.equal(ticket.status, 'OPEN');
    assert.ok(channel.id);
    assert.ok(channel.name.includes('clientone'));

    // Check permission overwrites
    const overwrites = channel.permissionOverwrites;
    assert.ok(overwrites.some(o => o.id === mockGuild.id)); // @everyone
    assert.ok(overwrites.some(o => o.id === mockUser.id)); // author
  });

  test('openTicket enforces maxOpenTicketsPerUser limit', async () => {
    ticketRepo.upsertTicketConfig('guild_ticket_1', { maxOpenTicketsPerUser: 1 });

    await ticketService.openTicket(mockGuild, mockUser, 'Dúvidas', 'Primeiro ticket');

    await assert.rejects(
      async () => {
        await ticketService.openTicket(mockGuild, mockUser, 'Dúvidas', 'Segundo ticket');
      },
      /Limite máximo permitido: 1/
    );
  });

  test('claimTicket allows staff to claim and prevents double claiming', async () => {
    const { ticket } = await ticketService.openTicket(mockGuild, mockUser, 'Geral', 'Ajuda');

    const claimed = ticketService.claimTicket('guild_ticket_1', ticket.id, mockStaff);
    assert.equal(claimed.claimedBy, 'user_staff_1');
    assert.equal(claimed.status, 'CLAIMED');

    // Attempt second claim by another staff
    const otherStaff = { id: 'user_staff_2', username: 'StaffTwo' };
    assert.throws(
      () => ticketService.claimTicket('guild_ticket_1', ticket.id, otherStaff),
      /já foi assumido/
    );
  });

  test('closeTicket generates transcript and sets status to CLOSED', async () => {
    const { ticket, channel } = await ticketService.openTicket(mockGuild, mockUser, 'Suporte', 'Bug no bot');

    const closed = await ticketService.closeTicket(mockGuild, channel.id, mockStaff, 'Resolvido com sucesso');
    assert.equal(closed.status, 'CLOSED');
    assert.equal(closed.closedBy, 'user_staff_1');
    assert.equal(closed.closeReason, 'Resolvido com sucesso');
    assert.ok(closed.transcript.includes('Preciso de suporte com cobrança'));
    assert.ok(closed.transcript.includes('StaffOne'));

    // Cannot claim or re-close a closed ticket
    assert.throws(
      () => ticketService.claimTicket('guild_ticket_1', ticket.id, mockStaff),
      /já está fechado/
    );
  });

  test('reopenTicket restores a closed ticket to OPEN status', async () => {
    const { ticket, channel } = await ticketService.openTicket(mockGuild, mockUser, 'Suporte', 'Problema');
    await ticketService.closeTicket(mockGuild, channel.id, mockStaff, 'Fechando');

    const reopened = ticketService.reopenTicket('guild_ticket_1', ticket.id, mockStaff);
    assert.equal(reopened.status, 'OPEN');

    // Attempting to reopen an open ticket throws error
    assert.throws(
      () => ticketService.reopenTicket('guild_ticket_1', ticket.id, mockStaff),
      /Apenas tickets fechados podem ser reabertos/
    );
  });

  test('ticket panels creation and listing', () => {
    const panel = ticketService.createPanel('guild_ticket_1', {
      channelId: 'chan_panels',
      title: 'Atendimento VIP',
      description: 'Clique abaixo para suporte',
      categoryId: 'cat_vip',
      supportRoleId: 'role_staff'
    });

    assert.ok(panel.id > 0);
    assert.equal(panel.title, 'Atendimento VIP');

    const panels = ticketService.getPanels('guild_ticket_1');
    assert.equal(panels.length, 1);
    assert.equal(panels[0].title, 'Atendimento VIP');
    assert.equal(panels[0].supportRoleId, 'role_staff');
  });

  test('deleteTicket deletes ticket from repository and deletes channel', async () => {
    let channelDeleted = false;
    const { ticket, channel } = await ticketService.openTicket(mockGuild, mockUser, 'Suporte', 'Exclusão');
    channel.delete = async () => { channelDeleted = true; };

    const result = await ticketService.deleteTicket(mockGuild, channel.id, mockStaff);
    assert.equal(result.success, true);
    assert.equal(result.ticketId, ticket.id);
    assert.equal(channelDeleted, true);

    const check = ticketRepo.getTicket('guild_ticket_1', ticket.id);
    assert.equal(check, null);
  });

  test('openTicket records detailed custom reason and category', async () => {
    const fullReason = 'Dúvida sobre VIP\n\n**Detalhes:** Gostaria de saber as vantagens do VIP Diamante.';
    const { ticket } = await ticketService.openTicket(mockGuild, mockUser, 'VIP', fullReason);

    assert.equal(ticket.categoryName, 'VIP');
    assert.equal(ticket.openReason, fullReason);

    const fetched = ticketRepo.getTicket('guild_ticket_1', ticket.id);
    assert.equal(fetched.categoryName, 'VIP');
    assert.equal(fetched.openReason, fullReason);
  });
});
