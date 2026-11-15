const { test, describe, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { DatabaseManager } = require('../src/database/connection');
const { Migrator } = require('../src/database/migrator');
const { GuildRepository } = require('../src/database/repositories/guildRepository');
const { UserRepository } = require('../src/database/repositories/userRepository');
const { SettingsRepository } = require('../src/database/repositories/settingsRepository');
const { AuditRepository } = require('../src/database/repositories/auditRepository');
const { SettingsService } = require('../src/services/settingsService');
const { IdentityService } = require('../src/services/identityService');
const { AuditService } = require('../src/services/auditService');
const configCommand = require('../src/commands/admin/config');
const interactionCreateEvent = require('../src/events/interactionCreate');

describe('Discord In-Server /config Panel & Interactive Controls (Etapa 9)', () => {
  let db;
  let identityService;
  let settingsService;
  let mockGuild;
  let mockUser;
  let eventContext;

  beforeEach(() => {
    db = new DatabaseManager(':memory:');
    db.connect();
    const migrator = new Migrator(db, path.resolve(__dirname, '../src/database/migrations'));
    migrator.runPendingMigrations();

    const guildRepo = new GuildRepository(db);
    const userRepo = new UserRepository(db);
    const settingsRepo = new SettingsRepository(db);
    const auditRepo = new AuditRepository(db);

    guildRepo.upsertGuild({ id: 'guild_discord_cfg', name: 'Discord Config Guild' });
    userRepo.upsertUser({ id: 'user_mod_1', username: 'ModeratorOne' });

    const auditService = new AuditService(auditRepo);
    settingsService = new SettingsService(settingsRepo, auditService);
    identityService = new IdentityService(settingsService, auditService, 'Cell');

    mockGuild = {
      id: 'guild_discord_cfg',
      name: 'Discord Config Guild'
    };

    mockUser = {
      id: 'user_mod_1',
      username: 'ModeratorOne'
    };

    eventContext = {
      identityService,
      settingsService,
      auditService,
      userRepo,
      guildRepo,
      commandRegistry: {
        get: () => configCommand
      }
    };
  });

  afterEach(() => {
    if (db) db.close();
  });

  test('/config displays embed with dynamic AI name, select menus, and action buttons', async () => {
    let replyPayload = null;
    const mockInteraction = {
      guild: mockGuild,
      user: mockUser,
      reply: async (payload) => {
        replyPayload = payload;
        return payload;
      }
    };

    await configCommand.execute(mockInteraction, eventContext);

    assert.ok(replyPayload);
    assert.equal(replyPayload.ephemeral, true);
    assert.equal(replyPayload.embeds.length, 1);
    const embed = replyPayload.embeds[0];
    assert.ok(embed.data.title.includes('Discord Config Guild'));
    assert.ok(embed.data.fields.some(f => f.name.includes('Identidade da IA') && f.value.includes('Cell')));

    // Action rows with select menu and buttons
    assert.equal(replyPayload.components.length, 2);
    const selectMenu = replyPayload.components[0].components[0];
    assert.ok(selectMenu.data.custom_id.includes('config_select_module'));
    assert.equal(selectMenu.options.length, 5);

    const buttons = replyPayload.components[1].components;
    assert.equal(buttons.length, 3);
  });

  test('button interaction restores default AI name in shared database layer', async () => {
    // 1. Set custom name first
    identityService.setDisplayName('guild_discord_cfg', 'Friday-Advanced', mockUser.id);
    assert.equal(identityService.getDisplayName('guild_discord_cfg'), 'Friday-Advanced');

    // 2. Simulate button click: config_btn_restore_ai_
    let replyText = null;
    const mockButtonInteraction = {
      isButton: () => true,
      isModalSubmit: () => false,
      isStringSelectMenu: () => false,
      isChatInputCommand: () => false,
      customId: `config_btn_restore_ai_${mockGuild.id}`,
      guild: mockGuild,
      user: mockUser,
      reply: async ({ content }) => { replyText = content; }
    };

    await interactionCreateEvent.execute(mockButtonInteraction, eventContext);

    assert.ok(replyText.includes('restaurado para o padrão **Cell**'));
    assert.equal(identityService.getDisplayName('guild_discord_cfg'), 'Cell');
  });

  test('select menu interaction returns module specific details', async () => {
    let replyPayload = null;
    const mockSelectInteraction = {
      isButton: () => false,
      isModalSubmit: () => false,
      isStringSelectMenu: () => true,
      isChatInputCommand: () => false,
      customId: `config_select_module_${mockGuild.id}`,
      values: ['tickets'],
      guild: mockGuild,
      user: mockUser,
      reply: async (payload) => { replyPayload = payload; }
    };

    await interactionCreateEvent.execute(mockSelectInteraction, eventContext);

    assert.ok(replyPayload);
    assert.equal(replyPayload.ephemeral, true);
    assert.ok(replyPayload.embeds[0].data.title.includes('TICKETS'));
  });

  test('modal submit interaction updates AI display name dynamically', async () => {
    let replyText = null;
    const mockModalInteraction = {
      isButton: () => false,
      isModalSubmit: () => true,
      isStringSelectMenu: () => false,
      isChatInputCommand: () => false,
      customId: `modal_config_ai_${mockGuild.id}`,
      guild: mockGuild,
      user: mockUser,
      fields: {
        getTextInputValue: (fieldId) => {
          if (fieldId === 'modal_ai_name_input') return 'Cortana';
          return '';
        }
      },
      reply: async ({ content }) => { replyText = content; }
    };

    await interactionCreateEvent.execute(mockModalInteraction, eventContext);

    assert.ok(replyText.includes('atualizado para **Cortana**'));
    assert.equal(identityService.getDisplayName('guild_discord_cfg'), 'Cortana');
  });
});
