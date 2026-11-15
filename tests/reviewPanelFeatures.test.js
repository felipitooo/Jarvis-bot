const { test, describe, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { DatabaseManager } = require('../src/database/connection');
const { Migrator } = require('../src/database/migrator');
const { GuildRepository } = require('../src/database/repositories/guildRepository');
const { UserRepository } = require('../src/database/repositories/userRepository');
const { ReviewRepository } = require('../src/database/repositories/reviewRepository');
const { WebPanelService } = require('../src/services/webPanelService');

describe('Web Panel Reviews & Staff Ratings', () => {
  let db;
  let reviewRepo;
  let webPanelService;
  const guildId = 'test_guild_123';
  const adminUserId = 'admin_456';

  beforeEach(() => {
    db = new DatabaseManager(':memory:');
    db.connect();
    const migrator = new Migrator(db, path.resolve(__dirname, '../src/database/migrations'));
    migrator.runPendingMigrations();

    const guildRepo = new GuildRepository(db);
    const userRepo = new UserRepository(db);

    guildRepo.upsertGuild({ id: guildId, name: 'Test Server' });
    userRepo.upsertUser({ id: adminUserId, username: 'admin' });
    userRepo.upsertUser({ id: 'staff_1', username: 'lipe_admin' });
    userRepo.upsertUser({ id: 'user_1', username: 'cliente_feliz' });
    userRepo.upsertUser({ id: 'user_2', username: 'cliente_2' });

    reviewRepo = new ReviewRepository(db);

    const mockBotClient = {
      guilds: {
        cache: new Map([
          [
            guildId,
            {
              id: guildId,
              name: 'Test Server',
              members: {
                cache: new Map([
                  [
                    'staff_1',
                    {
                      id: 'staff_1',
                      displayName: 'Lipe Admin',
                      user: { username: 'lipe_admin', displayAvatarURL: () => 'https://example.com/avatar.png' }
                    }
                  ],
                  [
                    'user_1',
                    {
                      id: 'user_1',
                      displayName: 'Cliente Feliz',
                      user: { username: 'cliente_feliz', displayAvatarURL: () => 'https://example.com/user.png' }
                    }
                  ]
                ])
              }
            }
          ]
        ])
      }
    };

    webPanelService = new WebPanelService({
      services: { reviewRepo },
      botClient: mockBotClient
    });
  });

  afterEach(() => {
    if (db) db.close();
  });

  test('can fetch reviews, breakdown, stats, and staff leaderboard', () => {
    const session = {
      userId: 'admin_local',
      userData: { id: adminUserId, guilds: [{ id: guildId, owner: true }] }
    };

    // Insert 2 sample reviews
    const r1 = reviewRepo.createReview(guildId, {
      authorId: 'user_1',
      targetStaffId: 'staff_1',
      rating: 5,
      comment: 'Atendimento nota 10!'
    });
    reviewRepo.updateReviewStatus(guildId, r1.id, 'APPROVED');

    const r2 = reviewRepo.createReview(guildId, {
      authorId: 'user_2',
      targetStaffId: 'staff_1',
      rating: 4,
      comment: 'Muito prestativo'
    });
    reviewRepo.updateReviewStatus(guildId, r2.id, 'APPROVED');

    const data = webPanelService.getReviewData(session, guildId);

    assert.equal(data.stats.total, 2);
    assert.equal(data.stats.average, 4.5);
    assert.equal(data.stats.positivePercent, 100);
    assert.equal(data.stats.breakdown[5], 1);
    assert.equal(data.stats.breakdown[4], 1);

    assert.equal(data.leaderboard.length, 1);
    assert.equal(data.leaderboard[0].staff.displayName, 'Lipe Admin');
    assert.equal(data.leaderboard[0].average, 4.5);

    assert.equal(data.reviews.length, 2);
    assert.equal(data.reviews[0].targetStaff.displayName, 'Lipe Admin');
  });

  test('can moderate reviews (approve, reject, delete)', () => {
    const session = {
      userId: 'admin_local',
      userData: { id: adminUserId, guilds: [{ id: guildId, owner: true }] }
    };

    const rev = reviewRepo.createReview(guildId, {
      authorId: 'user_1',
      targetStaffId: 'staff_1',
      rating: 1,
      comment: 'Spam review',
      status: 'PENDING'
    });

    // Default status is PENDING
    assert.equal(rev.status, 'PENDING');

    // Reject review
    webPanelService.moderateReview(session, guildId, rev.id, 'REJECT');
    let fetched = reviewRepo.getReview(guildId, rev.id);
    assert.equal(fetched.status, 'REJECTED');

    // Approve review
    webPanelService.moderateReview(session, guildId, rev.id, 'APPROVE');
    fetched = reviewRepo.getReview(guildId, rev.id);
    assert.equal(fetched.status, 'APPROVED');

    // Delete review
    webPanelService.moderateReview(session, guildId, rev.id, 'DELETE');
    fetched = reviewRepo.getReview(guildId, rev.id);
    assert.equal(fetched, null);
  });
});
