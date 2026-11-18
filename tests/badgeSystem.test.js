const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { DatabaseManager } = require('../src/database/connection');
const { Migrator } = require('../src/database/migrator');
const { BadgeService } = require('../src/services/badgeService');
const { PrefixCommandHandler } = require('../src/handlers/prefixCommandHandler');

describe('Badge and Achievement System (v6.3)', () => {
  let dbManager;
  let badgeService;

  beforeEach(() => {
    dbManager = new DatabaseManager();
    dbManager.connect(':memory:');
    new Migrator(dbManager).runPendingMigrations();
    badgeService = new BadgeService(dbManager);
  });

  it('lists all defined badges with emojis and descriptions', () => {
    const badges = badgeService.getAllBadges();
    assert.ok(badges.length >= 10, 'Should have at least 10 predefined badges');
    const ownerBadge = badges.find(b => b.id === 'OWNER');
    assert.ok(ownerBadge);
    assert.equal(ownerBadge.emoji, '👑');
  });

  it('dynamically calculates badges based on user context', () => {
    const guild = { id: 'g1', ownerId: 'u1' };
    const targetUser = { id: 'u1', username: 'TestOwner' };
    const member = { permissions: { has: () => true } };
    const xpProfile = { currentLevel: 15, rankTotal: 1 };
    const balance = { walletBalance: 60000, bankBalance: 0, rank: 1 };
    const rel = { isMarried: true };
    const reviewStats = { average: 5.0, total: 3 };
    const loanStatus = { isDefaulted: false, hasActiveLoan: false };

    const calculated = badgeService.calculateBadges({
      guild,
      targetUser,
      member,
      xpProfile,
      balance,
      rel,
      reviewStats,
      loanStatus
    });

    assert.ok(calculated.some(b => b.includes('Dono')), 'Should include Dono');
    assert.ok(calculated.some(b => b.includes('Staff')), 'Should include Staff');
    assert.ok(calculated.some(b => b.includes('Top Economia')), 'Should include Top Economia');
    assert.ok(calculated.some(b => b.includes('Lendário')), 'Should include Lendário');
    assert.ok(calculated.some(b => b.includes('Casado')), 'Should include Casado');
    assert.ok(calculated.some(b => b.includes('Magnata')), 'Should include Magnata');
    assert.ok(calculated.some(b => b.includes('Sem Vida Social')), 'Should include Sem Vida Social');
    assert.ok(calculated.some(b => b.includes('Bom Pagador')), 'Should include Bom Pagador');
  });

  it('awards bankrupt badge when user has negative or zero balance', () => {
    const guild = { id: 'g1', ownerId: 'other' };
    const targetUser = { id: 'u2', username: 'BrokeUser' };
    const member = { permissions: { has: () => false } };
    const balance = { walletBalance: -100, bankBalance: 0 };

    const calculated = badgeService.calculateBadges({
      guild,
      targetUser,
      member,
      balance
    });

    assert.ok(calculated.some(b => b.includes('Faliu de Vez')), 'Should include Faliu de Vez');
  });

  it('persists and retrieves unlocked badges from database', () => {
    const guildId = 'g1';
    const userId = 'u123';

    assert.equal(badgeService.getUserUnlockedBadgeIds(guildId, userId).length, 0);

    const unlocked = badgeService.unlockBadge(guildId, userId, 'CASINO_KING');
    assert.equal(unlocked, true);

    const ids = badgeService.getUserUnlockedBadgeIds(guildId, userId);
    assert.deepEqual(ids, ['CASINO_KING']);

    // Check that it gets rendered in calculateBadges
    const calculated = badgeService.calculateBadges({
      guild: { id: guildId, ownerId: 'other' },
      targetUser: { id: userId, username: 'Winner' },
      member: null
    });

    assert.ok(calculated.some(b => b.includes('Rei do Cassino')));
  });

  it('executes +conquistas command cleanly', async () => {
    const handler = new PrefixCommandHandler('+');
    let repliedPayload = null;

    const mockMessage = {
      content: '+conquistas',
      guild: { id: 'g1', ownerId: 'u1', members: { fetch: async () => null } },
      author: { id: 'u1', username: 'TestUser', displayAvatarURL: () => 'http://avatar.png' },
      member: { permissions: { has: () => false } },
      reply: async (payload) => {
        repliedPayload = payload;
        return payload;
      }
    };

    const context = {
      badgeService,
      identityService: { getDisplayName: () => 'J.A.R.V.I.S.' }
    };

    const handled = await handler.handle(mockMessage, context);
    assert.equal(handled, true);
    assert.ok(repliedPayload?.embeds?.[0]);
    assert.ok(repliedPayload.embeds[0].data.title.includes('Galeria de Conquistas'));
  });
});
