const { test, describe } = require('node:test');
const assert = require('node:assert');
const { DatabaseManager } = require('../src/database/connection');
const { Migrator } = require('../src/database/migrator');
const { CommunityRepository } = require('../src/database/repositories/communityRepository');
const { CommunityService } = require('../src/services/communityService');
const { IdentityService } = require('../src/services/identityService');
const { prefixCommandHandler } = require('../src/handlers/prefixCommandHandler');

describe('Universal Concurrency & Resilient Event Reconciliation', () => {
  test('SQLite WAL pragmas include busy_timeout for concurrent non-blocking access', () => {
    const dbManager = new DatabaseManager(':memory:');
    const db = dbManager.connect();
    
    // Check busy_timeout
    const timeoutRow = db.prepare('PRAGMA busy_timeout;').get();
    assert.strictEqual(timeoutRow.timeout, 5000, 'busy_timeout must be 5000ms');

    // Check foreign keys
    const fkRow = db.prepare('PRAGMA foreign_keys;').get();
    assert.strictEqual(fkRow.foreign_keys, 1, 'foreign_keys must be enabled');
    dbManager.close();
  });

  test('Multi-command execution: message with multiple lines executes both commands without ignoring', async () => {
    const executed = [];
    const replies = [];

    const mockMessage = {
      content: '+ping\n+ajuda',
      guild: { id: 'guild_universal_1', name: 'Universal Guild' },
      author: { id: 'user_u1', username: 'Lipe' },
      member: {
        permissions: { has: () => true },
        roles: { cache: new Map() }
      },
      channel: {
        id: 'chan_u1',
        name: 'geral',
        send: async (payload) => replies.push(payload)
      },
      reply: async (payload) => replies.push(payload)
    };

    const mockContext = {
      settingsService: {
        getSetting: (gId, key, def) => def
      },
      identityService: {
        getDisplayName: () => 'J.A.R.V.I.S'
      }
    };

    // Spy on _executeCommand
    const originalExecute = prefixCommandHandler._executeCommand;
    prefixCommandHandler._executeCommand = async function(cmdName, args, message, context, activePrefix) {
      executed.push(cmdName);
      return true;
    };

    try {
      const handled = await prefixCommandHandler.handle(mockMessage, mockContext);
      assert.strictEqual(handled, true);
      assert.strictEqual(executed.length, 2, 'Must execute both commands from multi-line message');
      assert.strictEqual(executed[0], 'ping');
      assert.strictEqual(executed[1], 'ajuda');
    } finally {
      prefixCommandHandler._executeCommand = originalExecute;
    }
  });

  test('Multi-command execution: semicolon separated commands (+work; +daily) both execute', async () => {
    const executed = [];
    const mockMessage = {
      content: '+ping; +ajuda',
      guild: { id: 'guild_universal_2', name: 'Universal Guild' },
      author: { id: 'user_u2', username: 'Lipe' },
      member: {
        permissions: { has: () => true },
        roles: { cache: new Map() }
      },
      channel: {
        id: 'chan_u2',
        name: 'geral'
      },
      reply: async () => {}
    };

    const mockContext = {
      settingsService: {
        getSetting: (gId, key, def) => def
      },
      identityService: {
        getDisplayName: () => 'J.A.R.V.I.S'
      }
    };

    const originalExecute = prefixCommandHandler._executeCommand;
    prefixCommandHandler._executeCommand = async function(cmdName) {
      executed.push(cmdName);
      return true;
    };

    try {
      const handled = await prefixCommandHandler.handle(mockMessage, mockContext);
      assert.strictEqual(handled, true);
      assert.strictEqual(executed.length, 2, 'Must execute both semicolon separated commands');
      assert.strictEqual(executed[0], 'ping');
      assert.strictEqual(executed[1], 'ajuda');
    } finally {
      prefixCommandHandler._executeCommand = originalExecute;
    }
  });

  test('Preserves multi-line single command when subsequent lines are not separate commands', async () => {
    const executed = [];
    const argsCaptured = [];
    const multiLineAnnouncement = '+anunciar #geral\nLinha 1 do comunicado importante\nLinha 2 com detalhes';

    const mockMessage = {
      content: multiLineAnnouncement,
      guild: { id: 'guild_universal_3', name: 'Universal Guild' },
      author: { id: 'user_u3', username: 'Lipe' },
      member: {
        permissions: { has: () => true },
        roles: { cache: new Map() }
      },
      channel: {
        id: 'chan_u3',
        name: 'geral'
      },
      reply: async () => {}
    };

    const mockContext = {
      settingsService: {
        getSetting: (gId, key, def) => def
      },
      identityService: {
        getDisplayName: () => 'J.A.R.V.I.S'
      }
    };

    const originalExecute = prefixCommandHandler._executeCommand;
    prefixCommandHandler._executeCommand = async function(cmdName, args) {
      executed.push(cmdName);
      argsCaptured.push(...args);
      return true;
    };

    try {
      const handled = await prefixCommandHandler.handle(mockMessage, mockContext);
      assert.strictEqual(handled, true);
      assert.strictEqual(executed.length, 1, 'Only 1 command should execute');
      assert.strictEqual(executed[0], 'anunciar');
      assert.ok(argsCaptured.join(' ').includes('comunicado importante'));
      assert.ok(argsCaptured.join(' ').includes('detalhes'));
    } finally {
      prefixCommandHandler._executeCommand = originalExecute;
    }
  });

  test('Apollo resilience: reconcileMissedJoins catches member who joined while bot was restarting', async () => {
    const path = require('node:path');
    const dbManager = new DatabaseManager(':memory:');
    dbManager.connect();
    const migrator = new Migrator(dbManager, path.resolve(__dirname, '../src/database/migrations'));
    migrator.runPendingMigrations();

    const { GuildRepository } = require('../src/database/repositories/guildRepository');
    const guildRepo = new GuildRepository(dbManager);
    guildRepo.upsertGuild({ id: 'guild_apollo', name: 'Universal Server' });

    const communityRepo = new CommunityRepository(dbManager);
    communityRepo.upsertWelcomeConfig('guild_apollo', {
      welcomeEnabled: 1,
      welcomeChannelId: 'chan_welcome_1',
      welcomeMessage: 'Bem-vindo(a) {user} ao {server}!'
    });
    communityRepo.addAutoRole('guild_apollo', 'role_member_apollo');

    const mockIdentity = {
      getDisplayName: () => 'J.A.RV.I.S',
      getDefaultName: () => 'J.A.R.V.I.S'
    };
    const communityService = new CommunityService({
      communityRepo,
      identityService: mockIdentity
    });

    const addedRoles = [];
    const sentMessages = [];

    // Mock Apollo member who joined 2 minutes ago
    const mockApollo = {
      id: 'apollo_3145',
      user: {
        id: 'apollo_3145',
        username: 'apollo3145',
        bot: false,
        displayAvatarURL: () => 'https://cdn.discordapp.com/avatars/apollo.png'
      },
      joinedTimestamp: Date.now() - (2 * 60 * 1000), // 2 min ago
      roles: {
        add: async (roles) => {
          addedRoles.push(...roles);
        }
      },
      guild: {
        id: 'guild_apollo',
        name: 'Universal Server',
        memberCount: 42,
        channels: {
          cache: new Map([
            ['chan_welcome_1', {
              name: 'welcome',
              send: async (embedData) => {
                sentMessages.push(embedData);
              }
            }]
          ])
        }
      }
    };

    const mockGuild = {
      id: 'guild_apollo',
      name: 'Universal Server',
      members: {
        fetch: async () => {
          const m = new Map();
          m.set('apollo_3145', mockApollo);
          return m;
        }
      }
    };

    // Run reconciliation (as ready.js would do)
    await communityService.reconcileMissedJoins(mockGuild);

    // Verify Apollo got AutoRoles and Welcome message
    assert.strictEqual(addedRoles.length, 1);
    assert.strictEqual(addedRoles[0], 'role_member_apollo');
    assert.strictEqual(sentMessages.length, 1);
    assert.ok(sentMessages[0].embeds[0].data.description.includes('<@apollo_3145>'));
    assert.ok(sentMessages[0].embeds[0].data.description.includes('Universal Server'));

    // Reconciling again immediately should NOT send duplicate welcome
    await communityService.reconcileMissedJoins(mockGuild);
    assert.strictEqual(sentMessages.length, 1, 'Deduplication must prevent spam on subsequent reconciliations');

    dbManager.close();
  });
});
