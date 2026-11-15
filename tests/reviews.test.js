const { test, describe, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { DatabaseManager } = require('../src/database/connection');
const { Migrator } = require('../src/database/migrator');
const { GuildRepository } = require('../src/database/repositories/guildRepository');
const { UserRepository } = require('../src/database/repositories/userRepository');
const { ReviewRepository } = require('../src/database/repositories/reviewRepository');
const { ReviewService } = require('../src/services/reviewService');

describe('Reviews & Attendance Evaluation System (Etapa 8)', () => {
  let db;
  let reviewRepo;
  let reviewService;
  let mockGuild;
  let mockAuthor;
  let mockStaff;

  beforeEach(() => {
    db = new DatabaseManager(':memory:');
    db.connect();
    const migrator = new Migrator(db, path.resolve(__dirname, '../src/database/migrations'));
    migrator.runPendingMigrations();

    const guildRepo = new GuildRepository(db);
    const userRepo = new UserRepository(db);

    guildRepo.upsertGuild({ id: 'guild_rev_1', name: 'Review Guild' });
    userRepo.upsertUser({ id: 'user_cust_1', username: 'CustomerOne' });
    userRepo.upsertUser({ id: 'user_cust_2', username: 'CustomerTwo' });
    userRepo.upsertUser({ id: 'user_staff_1', username: 'StaffAttendant' });
    userRepo.upsertUser({ id: 'user_staff_2', username: 'OtherStaff' });

    reviewRepo = new ReviewRepository(db);
    const mockIdentity = {
      getDisplayName: () => 'Cell',
      getDefaultName: () => 'Cell'
    };

    reviewService = new ReviewService({
      reviewRepo,
      identityService: mockIdentity,
      auditService: null
    });

    mockAuthor = { id: 'user_cust_1', username: 'CustomerOne' };
    mockStaff = { id: 'user_staff_1', username: 'StaffAttendant' };

    mockGuild = {
      id: 'guild_rev_1',
      name: 'Review Guild',
      channels: {
        cache: new Map([
          ['chan_feed', { id: 'chan_feed', send: async (payload) => ({ id: 'msg_rev_post', ...payload }) }]
        ])
      }
    };
  });

  afterEach(() => {
    if (db) db.close();
  });

  test('review config defaults and upsert', () => {
    const config = reviewRepo.getReviewConfig('guild_rev_1');
    assert.equal(config.requireModeration, false);
    assert.equal(config.reviewChannelId, null);

    const updated = reviewRepo.upsertReviewConfig('guild_rev_1', {
      reviewChannelId: 'chan_feed',
      requireModeration: true
    });

    assert.equal(updated.reviewChannelId, 'chan_feed');
    assert.equal(updated.requireModeration, true);
  });

  test('submitReview creates approved review when moderation is disabled', async () => {
    reviewRepo.upsertReviewConfig('guild_rev_1', { reviewChannelId: 'chan_feed', requireModeration: false });

    const result = await reviewService.submitReview(mockGuild, {
      authorUser: mockAuthor,
      targetStaffUser: mockStaff,
      ticketId: 10,
      rating: 5,
      comment: 'Atendimento perfeito e muito rápido!'
    });

    assert.equal(result.isPending, false);
    assert.equal(result.stars, '⭐⭐⭐⭐⭐');
    assert.equal(result.review.rating, 5);
    assert.equal(result.review.status, 'APPROVED');
    assert.equal(result.review.targetStaffId, 'user_staff_1');
  });

  test('submitReview enforces comment length validation', async () => {
    await assert.rejects(
      async () => {
        await reviewService.submitReview(mockGuild, {
          authorUser: mockAuthor,
          rating: 4,
          comment: 'Oi' // < 5 chars
        });
      },
      /pelo menos 5 caracteres/
    );
  });

  test('submitReview sets status PENDING when moderation is required', async () => {
    reviewRepo.upsertReviewConfig('guild_rev_1', { requireModeration: true });

    const result = await reviewService.submitReview(mockGuild, {
      authorUser: mockAuthor,
      rating: 3,
      comment: 'Atendimento mediano, demorou um pouco.'
    });

    assert.equal(result.isPending, true);
    assert.equal(result.review.status, 'PENDING');
  });

  test('getStats calculates overall rating and star breakdown', async () => {
    await reviewService.submitReview(mockGuild, {
      authorUser: mockAuthor,
      targetStaffUser: mockStaff,
      rating: 5,
      comment: 'Excelente atendimento cinco estrelas!'
    });

    await reviewService.submitReview(mockGuild, {
      authorUser: { id: 'user_cust_2', username: 'CustomerTwo' },
      targetStaffUser: mockStaff,
      rating: 3,
      comment: 'Atendimento razoável mas resolveu.'
    });

    const stats = reviewService.getStats('guild_rev_1');
    assert.equal(stats.total, 2);
    assert.equal(stats.average, 4.0); // (5 + 3) / 2 = 4.0
    assert.equal(stats.breakdown[5], 1);
    assert.equal(stats.breakdown[3], 1);
    assert.equal(stats.breakdown[1], 0);

    // Filtering by staff
    const staffStats = reviewService.getStats('guild_rev_1', 'user_staff_1');
    assert.equal(staffStats.total, 2);

    const otherStaffStats = reviewService.getStats('guild_rev_1', 'user_staff_2');
    assert.equal(otherStaffStats.total, 0);
  });

  test('respondReview allows staff to post official answer to review', async () => {
    const { review } = await reviewService.submitReview(mockGuild, {
      authorUser: mockAuthor,
      rating: 4,
      comment: 'Gostei bastante do suporte, parabéns!'
    });

    const updated = reviewService.respondReview('guild_rev_1', review.id, 'Muito obrigado pelo feedback!', mockStaff);
    assert.equal(updated.response, 'Muito obrigado pelo feedback!');
    assert.equal(updated.respondedBy, 'user_staff_1');
    assert.ok(updated.respondedAt);

    // Empty response throws
    assert.throws(
      () => reviewService.respondReview('guild_rev_1', review.id, '   ', mockStaff),
      /não pode estar vazia/
    );
  });

  test('moderateReview approves or deletes pending reviews', async () => {
    reviewRepo.upsertReviewConfig('guild_rev_1', { requireModeration: true });

    const { review } = await reviewService.submitReview(mockGuild, {
      authorUser: mockAuthor,
      rating: 1,
      comment: 'Não gostei de nada aqui no servidor.'
    });

    assert.equal(review.status, 'PENDING');

    const approved = reviewService.moderateReview('guild_rev_1', review.id, 'APPROVED', mockStaff);
    assert.equal(approved.status, 'APPROVED');

    const deleted = reviewService.moderateReview('guild_rev_1', review.id, 'DELETED', mockStaff);
    assert.equal(deleted.status, 'DELETED');

    assert.throws(
      () => reviewService.moderateReview('guild_rev_1', review.id, 'INVALID_ACTION', mockStaff),
      /Ação inválida/
    );
  });

  test('submitting review from same user overwrites old review to prevent spam', async () => {
    // 1. Initial review: 5 stars
    const firstRes = await reviewService.submitReview(mockGuild, {
      authorUser: mockAuthor,
      targetStaffUser: mockStaff,
      rating: 5,
      comment: 'Atendimento perfeito no início!'
    });

    assert.equal(firstRes.isOverwritten, false);
    assert.equal(firstRes.review.rating, 5);

    let stats = reviewService.getStats('guild_rev_1', 'user_staff_1');
    assert.equal(stats.total, 1);
    assert.equal(stats.average, 5.0);

    // 2. Same user reviews same staff again: 3 stars
    const secondRes = await reviewService.submitReview(mockGuild, {
      authorUser: mockAuthor,
      targetStaffUser: mockStaff,
      rating: 3,
      comment: 'Mudei de ideia, demorou para responder depois.'
    });

    assert.equal(secondRes.isOverwritten, true);
    assert.equal(secondRes.review.id, firstRes.review.id);
    assert.equal(secondRes.review.rating, 3);
    assert.equal(secondRes.previousRating, 5);

    // 3. Stats must strictly have 1 review with new rating (no spam duplicate!)
    stats = reviewService.getStats('guild_rev_1', 'user_staff_1');
    assert.equal(stats.total, 1);
    assert.equal(stats.average, 3.0);
    assert.equal(stats.breakdown[5], 0);
    assert.equal(stats.breakdown[3], 1);
  });
});
