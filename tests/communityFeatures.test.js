const { test, describe, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { DatabaseManager } = require('../src/database/connection');
const { Migrator } = require('../src/database/migrator');
const { GuildRepository } = require('../src/database/repositories/guildRepository');
const { UserRepository } = require('../src/database/repositories/userRepository');
const { CommunityRepository } = require('../src/database/repositories/communityRepository');
const { CommunityService } = require('../src/services/communityService');

describe('Community Features: Welcome, AutoRole, Suggestions & Starboard (Etapa 8)', () => {
  let db;
  let commRepo;
  let commService;
  let mockGuild;
  let mockMember;
  let sentMessages;

  beforeEach(() => {
    db = new DatabaseManager(':memory:');
    db.connect();
    const migrator = new Migrator(db, path.resolve(__dirname, '../src/database/migrations'));
    migrator.runPendingMigrations();

    const guildRepo = new GuildRepository(db);
    const userRepo = new UserRepository(db);

    guildRepo.upsertGuild({ id: 'guild_comm_1', name: 'Community Hub' });
    userRepo.upsertUser({ id: 'user_novice_1', username: 'NoviceUser' });
    userRepo.upsertUser({ id: 'user_moderator_1', username: 'ModUser' });

    commRepo = new CommunityRepository(db);
    const mockIdentity = {
      getDisplayName: () => 'Cell',
      getDefaultName: () => 'Cell'
    };

    commService = new CommunityService({
      communityRepo: commRepo,
      identityService: mockIdentity,
      auditService: null
    });

    sentMessages = [];

    const mockWelcomeChannel = {
      id: 'chan_welcome',
      send: async (payload) => {
        sentMessages.push({ channelId: 'chan_welcome', ...payload });
        return { id: `msg_welcome_${Date.now()}` };
      }
    };

    const mockGoodbyeChannel = {
      id: 'chan_goodbye',
      send: async (payload) => {
        sentMessages.push({ channelId: 'chan_goodbye', ...payload });
        return { id: `msg_goodbye_${Date.now()}` };
      }
    };

    const mockStarboardChannel = {
      id: 'chan_starboard',
      messages: {
        fetch: async (id) => ({
          id,
          edit: async (payload) => {
            sentMessages.push({ action: 'edit', id, ...payload });
            return true;
          }
        })
      },
      send: async (payload) => {
        const msg = { id: `msg_star_${Date.now()}`, ...payload };
        sentMessages.push(msg);
        return msg;
      }
    };

    mockGuild = {
      id: 'guild_comm_1',
      name: 'Community Hub',
      memberCount: 150,
      channels: {
        cache: new Map([
          ['chan_welcome', mockWelcomeChannel],
          ['chan_goodbye', mockGoodbyeChannel],
          ['chan_starboard', mockStarboardChannel]
        ])
      }
    };

    mockMember = {
      id: 'user_novice_1',
      guild: mockGuild,
      user: {
        id: 'user_novice_1',
        username: 'NoviceUser',
        displayAvatarURL: () => 'https://example.com/avatar.png'
      },
      rolesAdded: [],
      roles: {
        add: async (roleIds) => {
          mockMember.rolesAdded.push(...(Array.isArray(roleIds) ? roleIds : [roleIds]));
          return mockMember;
        }
      }
    };
  });

  afterEach(() => {
    if (db) db.close();
  });

  test('formatTemplate interpolates variables accurately', () => {
    const template = 'Bem-vindo(a) {user} ({username}) ao {server}! Somos agora {members} membros.';
    const formatted = commService.formatTemplate(template, {
      user: mockMember.user,
      guild: mockGuild
    });

    assert.equal(formatted, 'Bem-vindo(a) <@user_novice_1> (NoviceUser) ao Community Hub! Somos agora 150 membros.');
  });

  test('handleMemberJoin delivers welcome message and applies autoroles', async () => {
    commRepo.upsertWelcomeConfig('guild_comm_1', {
      welcomeChannelId: 'chan_welcome',
      welcomeEnabled: true,
      welcomeMessage: 'Boas-vindas {user} ao {server}!'
    });

    commRepo.addAutoRole('guild_comm_1', 'role_members');
    commRepo.addAutoRole('guild_comm_1', 'role_unverified');

    await commService.handleMemberJoin(mockMember);

    // Verify autoroles applied
    assert.deepEqual(mockMember.rolesAdded, ['role_members', 'role_unverified']);

    // Verify welcome message sent
    assert.equal(sentMessages.length, 1);
    assert.equal(sentMessages[0].channelId, 'chan_welcome');
    assert.ok(sentMessages[0].embeds[0].data.description.includes('<@user_novice_1>'));
  });

  test('handleMemberLeave delivers goodbye message when enabled', async () => {
    commRepo.upsertWelcomeConfig('guild_comm_1', {
      goodbyeChannelId: 'chan_goodbye',
      goodbyeEnabled: true,
      goodbyeMessage: '{username} saiu do servidor.'
    });

    await commService.handleMemberLeave(mockMember);

    assert.equal(sentMessages.length, 1);
    assert.equal(sentMessages[0].channelId, 'chan_goodbye');
    assert.ok(sentMessages[0].embeds[0].data.description.includes('NoviceUser'));
  });

  test('autoroles management add, list and remove', () => {
    commRepo.addAutoRole('guild_comm_1', 'role_alpha');
    commRepo.addAutoRole('guild_comm_1', 'role_beta');

    let roles = commRepo.getAutoRoles('guild_comm_1');
    assert.equal(roles.length, 2);
    assert.ok(roles.includes('role_alpha'));
    assert.ok(roles.includes('role_beta'));

    commRepo.removeAutoRole('guild_comm_1', 'role_alpha');
    roles = commRepo.getAutoRoles('guild_comm_1');
    assert.equal(roles.length, 1);
    assert.equal(roles[0], 'role_beta');
  });

  test('suggestions lifecycle: create, vote, and moderate', () => {
    const suggestion = commService.createSuggestion('guild_comm_1', mockMember.user, 'Criar uma sala de torneios aos sábados');
    assert.ok(suggestion.id > 0);
    assert.equal(suggestion.status, 'PENDING');
    assert.equal(suggestion.upvotes, 0);

    // Upvote
    const upvoted = commService.voteSuggestion('guild_comm_1', suggestion.id, true);
    assert.equal(upvoted.upvotes, 1);

    // Downvote
    const downvoted = commService.voteSuggestion('guild_comm_1', suggestion.id, false);
    assert.equal(downvoted.downvotes, 1);

    // Moderate
    const mod = { id: 'user_moderator_1', username: 'ModUser' };
    const moderated = commService.moderateSuggestion(
      'guild_comm_1',
      suggestion.id,
      'APPROVED',
      'Ótima ideia! Vamos implementar neste sábado.',
      mod
    );

    assert.equal(moderated.status, 'APPROVED');
    assert.equal(moderated.statusReason, 'Ótima ideia! Vamos implementar neste sábado.');
    assert.equal(moderated.moderatedBy, 'user_moderator_1');
  });

  test('starboard highlights messages reaching star threshold', async () => {
    commRepo.upsertStarboardConfig('guild_comm_1', {
      starboardChannelId: 'chan_starboard',
      starsRequired: 3,
      isEnabled: true
    });

    const mockMessage = {
      id: 'orig_msg_456',
      guild: mockGuild,
      channel: { id: 'chan_chat' },
      content: 'Mensagem lendária no chat geral!',
      createdAt: new Date(),
      url: 'https://discord.com/channels/guild/chat/456',
      author: {
        id: 'user_novice_1',
        username: 'NoviceUser',
        displayAvatarURL: () => 'https://example.com/avatar.png'
      }
    };

    // Reaction with 2 stars (below threshold of 3)
    await commService.handleStarReaction(
      { emoji: { name: '⭐' }, count: 2, message: mockMessage },
      { id: 'user_fan', bot: false }
    );
    assert.equal(sentMessages.length, 0);

    // Reaction with 3 stars (reaches threshold)
    await commService.handleStarReaction(
      { emoji: { name: '⭐' }, count: 3, message: mockMessage },
      { id: 'user_fan_2', bot: false }
    );
    assert.equal(sentMessages.length, 1);
    assert.ok(sentMessages[0].content.includes('⭐ **3**'));

    // Reaction increases to 4 stars (updates existing message)
    await commService.handleStarReaction(
      { emoji: { name: '⭐' }, count: 4, message: mockMessage },
      { id: 'user_fan_3', bot: false }
    );
    assert.equal(sentMessages.length, 2);
    assert.equal(sentMessages[1].action, 'edit');
    assert.ok(sentMessages[1].content.includes('⭐ **4**'));
  });
});
