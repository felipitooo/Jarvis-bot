const { test, describe, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { DatabaseManager } = require('../src/database/connection');
const { Migrator } = require('../src/database/migrator');
const { GuildRepository } = require('../src/database/repositories/guildRepository');
const { UserRepository } = require('../src/database/repositories/userRepository');
const { MusicVoiceRepository } = require('../src/database/repositories/musicVoiceRepository');
const { SocialFunService } = require('../src/services/socialFunService');

describe('Social Fun: Interactions, Shipping, Marriages & Minigames', () => {
  let db;
  let musicRepo;
  let socialService;

  beforeEach(() => {
    db = new DatabaseManager(':memory:');
    db.connect();
    const migrator = new Migrator(db, path.resolve(__dirname, '../src/database/migrations'));
    migrator.runPendingMigrations();

    const guildRepo = new GuildRepository(db);
    const userRepo = new UserRepository(db);
    guildRepo.upsertGuild({ id: 'guild_social', name: 'Social Guild' });
    userRepo.upsertUser({ id: 'user_romeo', username: 'Romeo' });
    userRepo.upsertUser({ id: 'user_juliet', username: 'Juliet' });
    userRepo.upsertUser({ id: 'user_friend', username: 'Friend' });

    musicRepo = new MusicVoiceRepository(db);
    const mockIdentity = { getDisplayName: () => 'Cell' };

    socialService = new SocialFunService({
      musicVoiceRepo: musicRepo,
      identityService: mockIdentity,
      auditService: null
    });
  });

  afterEach(() => {
    if (db) db.close();
  });

  test('social interaction generates appropriate messages and handles self-interaction', () => {
    const userA = { id: 'user_romeo', username: 'Romeo' };
    const userB = { id: 'user_juliet', username: 'Juliet' };

    // Valid interaction
    const res = socialService.interact('guild_social', 'abracar', userA, userB);
    assert.equal(res.isSelf, false);
    assert.equal(res.action, 'abracar');
    assert.ok(res.message.includes('<@user_romeo>') && res.message.includes('<@user_juliet>'));
    assert.ok(res.gif !== null);

    // Self interaction
    const selfRes = socialService.interact('guild_social', 'beijar', userA, userA);
    assert.equal(selfRes.isSelf, true);
    assert.ok(selfRes.message.includes('espelho'));
  });

  test('shipping calculates deterministic compatibility', () => {
    const userA = { id: 'user_romeo', username: 'Romeo' };
    const userB = { id: 'user_juliet', username: 'Juliet' };

    const ship1 = socialService.ship('guild_social', userA, userB);
    const ship2 = socialService.ship('guild_social', userB, userA); // reverse order

    assert.equal(ship1.percent, ship2.percent); // must be identical
    assert.ok(ship1.percent >= 0 && ship1.percent <= 100);
    assert.ok(ship1.progressBar.length > 0);

    // Self ship is 100%
    const selfShip = socialService.ship('guild_social', userA, userA);
    assert.equal(selfShip.percent, 100);
    assert.ok(selfShip.title.includes('Amor Próprio'));
  });

  test('marriage flow: propose, accept, query relationship, and divorce', () => {
    const userA = { id: 'user_romeo', username: 'Romeo' };
    const userB = { id: 'user_juliet', username: 'Juliet' };

    // Initially single
    const singleRel = socialService.getRelationship('guild_social', 'user_romeo');
    assert.equal(singleRel.isMarried, false);

    // Proposal
    const prop = socialService.proposeMarriage('guild_social', userA, userB);
    assert.equal(prop.proposer.id, 'user_romeo');
    assert.equal(prop.target.id, 'user_juliet');

    // Accept marriage
    socialService.acceptMarriage('guild_social', 'user_romeo', 'user_juliet');

    // Query relationship
    const marriedRel = socialService.getRelationship('guild_social', 'user_romeo');
    assert.equal(marriedRel.isMarried, true);
    assert.equal(marriedRel.spouseId, 'user_juliet');

    // Cannot marry another person while married
    assert.throws(() => {
      socialService.proposeMarriage('guild_social', userA, { id: 'user_friend', username: 'Friend' });
    }, /já está casado/);

    // Divorce
    const div = socialService.divorce('guild_social', 'user_romeo');
    assert.equal(div.status, 'DIVORCED');

    // Now single again
    const afterDiv = socialService.getRelationship('guild_social', 'user_romeo');
    assert.equal(afterDiv.isMarried, false);
  });

  test('minigames: coinflip, rollDice, eightBall and raffle behave within bounds', () => {
    // 1. Coinflip
    const coin = socialService.coinflip();
    assert.ok(coin.result === 'Cara' || coin.result === 'Coroa');

    // 2. Dice roll
    const dice = socialService.rollDice(20);
    assert.ok(dice.roll >= 1 && dice.roll <= 20);

    // 3. 8Ball
    const ball = socialService.eightBall('O projeto será um sucesso?');
    assert.ok(ball.answer.length > 0);

    // 4. Raffle
    const participants = ['Alice', 'Bob', 'Charlie'];
    const raffle = socialService.raffle(participants);
    assert.equal(raffle.totalParticipants, 3);
    assert.ok(participants.includes(raffle.winner));
  });
});
