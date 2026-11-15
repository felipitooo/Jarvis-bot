const { test, describe, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { DatabaseManager } = require('../src/database/connection');
const { Migrator } = require('../src/database/migrator');
const { GuildRepository } = require('../src/database/repositories/guildRepository');
const { ProtectionRepository } = require('../src/database/repositories/protectionRepository');
const { LockdownRepository } = require('../src/database/repositories/lockdownRepository');
const { ServerAdminService } = require('../src/services/serverAdminService');
const { LockdownService } = require('../src/services/lockdownService');
const { hierarchyService } = require('../src/services/hierarchyService');
const { ValidationError } = require('../src/utils/errorHandler');
const { PermissionFlagsBits } = require('discord.js');

describe('Server Administration, Protection & Lockdown', () => {
  let db;
  let adminService;
  let lockdownService;
  let protectionRepo;
  let mockGuild;

  beforeEach(() => {
    db = new DatabaseManager(':memory:');
    db.connect();
    const migrator = new Migrator(db, path.resolve(__dirname, '../src/database/migrations'));
    migrator.runPendingMigrations();

    const guildRepo = new GuildRepository(db);
    guildRepo.upsertGuild({ id: 'guild_admin_test', name: 'Admin Test Guild' });

    protectionRepo = new ProtectionRepository(db);
    const lockdownRepo = new LockdownRepository(db);

    adminService = new ServerAdminService(hierarchyService, null, protectionRepo);
    lockdownService = new LockdownService(lockdownRepo, null);

    mockGuild = {
      id: 'guild_admin_test',
      name: 'Admin Test Guild',
      ownerId: 'owner_id',
      memberCount: 50,
      verificationLevel: 2,
      roles: {
        everyone: { id: 'guild_admin_test', name: '@everyone', permissions: { has: () => false } },
        cache: new Map([
          ['guild_admin_test', { id: 'guild_admin_test', name: '@everyone', position: 0, permissions: { has: () => false } }],
          ['role_admin', { id: 'role_admin', name: 'Admin', position: 90, permissions: { has: (bit) => bit === PermissionFlagsBits.Administrator } }],
          ['role_mod', { id: 'role_mod', name: 'Mod', position: 50, permissions: { has: (bit) => bit === PermissionFlagsBits.KickMembers } }]
        ])
      },
      channels: {
        cache: new Map([
          ['ch_geral', {
            id: 'ch_geral',
            name: 'geral',
            type: 0,
            isTextBased: () => true,
            isVoiceBased: () => false,
            isDMBased: () => false,
            isThread: () => false,
            permissionOverwrites: {
              cache: new Map(),
              edit: async () => true
            }
          }]
        ])
      }
    };
  });

  afterEach(() => {
    db.close();
  });

  test('protectionRepository prevents deletion of protected roles and channels', async () => {
    protectionRepo.addProtectedResource({
      guildId: 'guild_admin_test',
      resourceType: 'ROLE',
      resourceId: 'role_mod',
      reason: 'Cargo essencial da equipe'
    });

    protectionRepo.addProtectedResource({
      guildId: 'guild_admin_test',
      resourceType: 'CHANNEL',
      resourceId: 'ch_geral',
      reason: 'Canal principal'
    });

    const botMember = { roles: { highest: { position: 100 } }, guild: mockGuild };
    const roleMod = { id: 'role_mod', name: 'Mod', position: 50, managed: false, guild: mockGuild };

    // Attempting to delete protected role must throw ValidationError
    await assert.rejects(async () => {
      await adminService.deleteRole(botMember, null, roleMod);
    }, ValidationError);

    // Attempting to delete protected channel must throw ValidationError
    await assert.rejects(async () => {
      await adminService.deleteChannel(mockGuild, null, { id: 'ch_geral', name: 'geral' });
    }, ValidationError);
  });

  test('emergency lockdown initiates and reverts cleanly restoring previous state', async () => {
    const lockResult = await lockdownService.initiateLockdown({
      guild: mockGuild,
      actorId: 'admin_1',
      reason: 'Ataque de raid detectado'
    });

    assert.equal(lockResult.lockedChannels.length, 1);
    assert.equal(lockResult.lockedChannels[0].name, 'geral');

    // Active lockdown should be detected
    const active = lockdownService.getActiveLockdown('guild_admin_test');
    assert.ok(active);
    assert.equal(active.is_active, 1);

    // Revert lockdown
    const revertResult = await lockdownService.revertLockdown({
      guild: mockGuild,
      actorId: 'admin_1'
    });

    assert.equal(revertResult.unlockedChannels.length, 1);
    assert.equal(lockdownService.getActiveLockdown('guild_admin_test'), null);
  });

  test('auditDangerousPermissions correctly identifies critical roles and safe @everyone', () => {
    const audit = adminService.auditDangerousPermissions(mockGuild);

    assert.equal(audit.everyoneHasDangerousPermissions, false);
    assert.equal(audit.dangerousRolesCount, 2); // role_admin and role_mod
    assert.equal(audit.dangerousRoles[0].name, 'Admin');
    assert.ok(audit.dangerousRoles[0].dangerousPermissions.includes('Administrator'));
    assert.equal(audit.dangerousRoles[1].name, 'Mod');
    assert.ok(audit.dangerousRoles[1].dangerousPermissions.includes('KickMembers'));
  });

  test('analyzeServer returns comprehensive structural metrics', () => {
    const metrics = adminService.analyzeServer(mockGuild);

    assert.equal(metrics.guildId, 'guild_admin_test');
    assert.equal(metrics.totalMembers, 50);
    assert.equal(metrics.totalRoles, 3);
    assert.equal(metrics.textChannelsCount, 1);
    assert.equal(metrics.voiceChannelsCount, 0);
  });
});
