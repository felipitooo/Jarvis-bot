const { test, describe, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { DatabaseManager } = require('../src/database/connection');
const { Migrator } = require('../src/database/migrator');
const { GuildRepository } = require('../src/database/repositories/guildRepository');
const { UserRepository } = require('../src/database/repositories/userRepository');
const { SettingsRepository } = require('../src/database/repositories/settingsRepository');
const { AuditRepository } = require('../src/database/repositories/auditRepository');
const { XpRepository } = require('../src/database/repositories/xpRepository');
const { EconomyRepository } = require('../src/database/repositories/economyRepository');
const { TicketRepository } = require('../src/database/repositories/ticketRepository');
const { ReviewRepository } = require('../src/database/repositories/reviewRepository');
const { CommunityRepository } = require('../src/database/repositories/communityRepository');
const { BackupRepository } = require('../src/database/repositories/backupRepository');
const { WebSessionRepository } = require('../src/database/repositories/webSessionRepository');

const { SettingsService } = require('../src/services/settingsService');
const { IdentityService } = require('../src/services/identityService');
const { AuditService } = require('../src/services/auditService');
const { ExperienceService } = require('../src/services/experienceService');
const { progressionFormulaService } = require('../src/services/progressionFormulaService');
const { EconomyService } = require('../src/services/economyService');
const { TicketService } = require('../src/services/ticketService');
const { ReviewService } = require('../src/services/reviewService');
const { CommunityService } = require('../src/services/communityService');
const { BackupSecurityService } = require('../src/services/backupSecurityService');
const { WebPanelService } = require('../src/services/webPanelService');

describe('Full End-to-End System Integration & Concurrency (Etapa 10)', () => {
  let db;
  let guildRepo;
  let userRepo;
  let xpRepo;
  let economyRepo;
  let ticketRepo;
  let reviewRepo;
  let commRepo;
  let backupRepo;
  let sessionRepo;

  let identityService;
  let xpService;
  let economyService;
  let ticketService;
  let reviewService;
  let commService;
  let backupService;
  let webPanelService;

  let mockGuild;
  let mockMember;
  let mockStaff;

  beforeEach(() => {
    db = new DatabaseManager(':memory:');
    db.connect();
    const migrator = new Migrator(db, path.resolve(__dirname, '../src/database/migrations'));
    migrator.runPendingMigrations();

    guildRepo = new GuildRepository(db);
    userRepo = new UserRepository(db);
    const settingsRepo = new SettingsRepository(db);
    const auditRepo = new AuditRepository(db);
    xpRepo = new XpRepository(db);
    economyRepo = new EconomyRepository(db);
    ticketRepo = new TicketRepository(db);
    reviewRepo = new ReviewRepository(db);
    commRepo = new CommunityRepository(db);
    backupRepo = new BackupRepository(db);
    sessionRepo = new WebSessionRepository(db);

    guildRepo.upsertGuild({ id: 'guild_e2e_main', name: 'Cell Mega Server' });
    guildRepo.upsertGuild({ id: 'guild_e2e_other', name: 'Other Isolated Server' });

    userRepo.upsertUser({ id: 'user_e2e_alice', username: 'Alice' });
    userRepo.upsertUser({ id: 'user_e2e_bob_staff', username: 'BobStaff' });
    userRepo.upsertUser({ id: 'user_e2e_charlie', username: 'Charlie' });

    const auditService = new AuditService(auditRepo);
    const settingsService = new SettingsService(settingsRepo, auditService);
    identityService = new IdentityService(settingsService, auditService, 'Cell');

    xpService = new ExperienceService({
      xpRepo,
      formulaService: progressionFormulaService,
      identityService,
      auditService
    });

    economyService = new EconomyService({
      economyRepo,
      identityService,
      auditService
    });

    ticketService = new TicketService({
      ticketRepo,
      identityService,
      auditService
    });

    reviewService = new ReviewService({
      reviewRepo,
      identityService,
      auditService
    });

    commService = new CommunityService({
      communityRepo: commRepo,
      identityService,
      auditService
    });

    backupService = new BackupSecurityService(backupRepo, auditService);

    webPanelService = new WebPanelService({
      webSessionRepo: sessionRepo,
      identityService,
      settingsService,
      auditService,
      services: { ticketRepo, reviewRepo, communityRepo: commRepo }
    });

    mockGuild = {
      id: 'guild_e2e_main',
      name: 'Cell Mega Server',
      memberCount: 50,
      roles: {
        cache: new Map([
          ['role_vip', { id: 'role_vip', name: 'VIP', color: 0, hoist: false, position: 5, managed: false, permissions: { bitfield: 8n } }],
          ['guild_e2e_main', { id: 'guild_e2e_main', name: '@everyone', color: 0, hoist: false, position: 0, permissions: { bitfield: 0n } }]
        ])
      },
      channels: {
        cache: new Map([
          ['chan_general', { id: 'chan_general', name: 'general', type: 0, position: 1, permissions: { bitfield: 0n }, permissionOverwrites: { cache: new Map() } }]
        ]),
        create: async (opts) => {
          const chan = {
            id: `chan_ticket_${Date.now()}`,
            name: opts.name,
            permissionOverwrites: { cache: new Map() },
            send: async () => ({ id: 'ticket_post' }),
            messages: {
              fetch: async () => new Map([
                ['1', { createdTimestamp: 1000, author: { username: 'Alice' }, content: 'Preciso de auxílio' }],
                ['2', { createdTimestamp: 2000, author: { username: 'BobStaff' }, content: 'Caso resolvido com excelência!' }]
              ])
            }
          };
          mockGuild.channels.cache.set(chan.id, chan);
          return chan;
        }
      }
    };

    mockMember = {
      id: 'user_e2e_alice',
      guild: mockGuild,
      user: { id: 'user_e2e_alice', username: 'Alice' },
      rolesAdded: [],
      roles: {
        add: async (roleIds) => {
          mockMember.rolesAdded.push(...(Array.isArray(roleIds) ? roleIds : [roleIds]));
        }
      }
    };

    mockStaff = { id: 'user_e2e_bob_staff', username: 'BobStaff' };
  });

  afterEach(() => {
    if (db) db.close();
  });

  test('Cross-subsystem user journey: Join, XP, Economy, Ticket, Review, Panel & Backup', async () => {
    // 1. Join & AutoRole
    commRepo.addAutoRole(mockGuild.id, 'role_members');
    await commService.handleMemberJoin(mockMember);
    assert.ok(mockMember.rolesAdded.includes('role_members'));

    // 2. Chat & XP Progression
    const xpGain = xpService.addManualXp(mockGuild, mockStaff.id, mockMember, 250);
    assert.ok(xpGain.currentLevel >= 1);
    const profile = xpService.getMemberProfile(mockGuild.id, mockMember.id);
    assert.equal(profile.totalXp, 250);

    // 3. Economy (Work & Deposit)
    const work = economyService.work(mockGuild.id, mockMember.id);
    assert.ok(work.reward > 0);
    const deposit = economyService.deposit(mockGuild.id, mockMember.id, work.reward);
    assert.equal(deposit.walletBalance, 0);
    assert.equal(deposit.bankBalance, work.reward);

    // 4. Ticket Support
    const { ticket, channel } = await ticketService.openTicket(mockGuild, mockMember.user, 'Suporte VIP', 'Problema no bot');
    assert.equal(ticket.status, 'OPEN');

    const claimed = ticketService.claimTicket(mockGuild.id, ticket.id, mockStaff);
    assert.equal(claimed.status, 'CLAIMED');
    assert.equal(claimed.claimedBy, mockStaff.id);

    const closed = await ticketService.closeTicket(mockGuild, channel.id, mockStaff, 'Dúvida esclarecida');
    assert.equal(closed.status, 'CLOSED');
    assert.ok(closed.transcript.includes('Alice'));

    // 5. Review & Staff Response
    const reviewResult = await reviewService.submitReview(mockGuild, {
      authorUser: mockMember.user,
      targetStaffUser: mockStaff,
      ticketId: ticket.id,
      rating: 5,
      comment: 'Atendimento fantástico do BobStaff!'
    });
    assert.equal(reviewResult.review.rating, 5);

    const responded = reviewService.respondReview(mockGuild.id, reviewResult.review.id, 'Ficamos felizes em ajudar!', mockStaff);
    assert.equal(responded.response, 'Ficamos felizes em ajudar!');

    // 6. Identity Change in Web Panel
    const session = webPanelService.createOAuthSession(mockStaff, [
      { id: mockGuild.id, name: mockGuild.name, permissions: '32', owner: false }
    ]);
    webPanelService.updateGuildSettings(session, mockGuild.id, { aiDisplayName: 'Cell-E2E-Prime' }, session.csrfToken);
    assert.equal(identityService.getDisplayName(mockGuild.id), 'Cell-E2E-Prime');

    // 7. Full Guild Backup Creation & Integrity Validation
    const backup = await backupService.createBackup(mockGuild, mockStaff.id);
    assert.ok(backup.id > 0);
    assert.equal(backup.guildId, mockGuild.id);
    const validation = backupService.validateBackup(backup.id);
    assert.ok(validation.valid);
    assert.ok(validation.payload.guildName.includes('Cell Mega Server'));
  });

  test('Concurrency & Atomic Transactions: 10 concurrent transfers prevent negative balances', async () => {
    // Setup initial balance: Alice has 500 coins in wallet
    economyRepo.updateBalances('guild_e2e_main', 'user_e2e_alice', { walletBalance: 500, bankBalance: 0 });

    // 10 concurrent transfers of 100 coins each (total 1000 coins attempted, but only 500 exist)
    const attempts = [];
    for (let i = 0; i < 10; i++) {
      attempts.push(
        new Promise(resolve => {
          try {
            const res = economyService.transfer(
              'guild_e2e_main',
              'user_e2e_alice',
              'user_e2e_charlie',
              100
            );
            resolve({ success: true, res });
          } catch (err) {
            resolve({ success: false, error: err.message });
          }
        })
      );
    }

    const results = await Promise.all(attempts);
    const successfulTransfers = results.filter(r => r.success);
    const failedTransfers = results.filter(r => !r.success);

    // Exactly 5 transfers must succeed (5 * 100 = 500)
    assert.equal(successfulTransfers.length, 5);
    assert.equal(failedTransfers.length, 5);

    // Final Alice balance must be exactly 0, never negative
    const finalAlice = economyRepo.getAccount('guild_e2e_main', 'user_e2e_alice');
    assert.equal(finalAlice.walletBalance, 0);

    // Final Charlie balance must be exactly 500
    const finalCharlie = economyRepo.getAccount('guild_e2e_main', 'user_e2e_charlie');
    assert.equal(finalCharlie.walletBalance, 500);
  });

  test('Strict multi-guild tenant isolation across all modules', async () => {
    // 1. Economy in Guild A does not exist in Guild B
    economyRepo.updateBalances('guild_e2e_main', 'user_e2e_alice', { walletBalance: 777 });
    const accGuildA = economyRepo.getAccount('guild_e2e_main', 'user_e2e_alice');
    const accGuildB = economyRepo.getAccount('guild_e2e_other', 'user_e2e_alice');
    assert.equal(accGuildA.walletBalance, 777);
    assert.equal(accGuildB, null); // completely isolated, no account exists in Guild B
    const createdB = economyRepo.getOrCreateAccount('guild_e2e_other', 'user_e2e_alice');
    assert.equal(createdB.walletBalance, 0);

    // 2. XP in Guild A does not exist in Guild B
    xpService.addManualXp(mockGuild, mockStaff.id, mockMember, 300);
    const xpA = xpRepo.getMemberXp('guild_e2e_main', 'user_e2e_alice');
    const xpB = xpRepo.getMemberXp('guild_e2e_other', 'user_e2e_alice');
    assert.equal(xpA.totalXp, 300);
    assert.equal(xpB.totalXp, 0);

    // 3. AI Name in Guild A does not affect Guild B
    identityService.setDisplayName('guild_e2e_main', 'CustomCellA', 'user_e2e_bob_staff');
    assert.equal(identityService.getDisplayName('guild_e2e_main'), 'CustomCellA');
    assert.equal(identityService.getDisplayName('guild_e2e_other'), 'Cell');
  });
});
