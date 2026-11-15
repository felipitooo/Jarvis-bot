const { test, describe, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { HierarchyService } = require('../src/services/hierarchyService');
const { PermissionDeniedError } = require('../src/utils/errorHandler');

describe('Hierarchy Service & Discord Role Position Validation', () => {
  let hierarchy;
  let mockGuild;

  beforeEach(() => {
    hierarchy = new HierarchyService();
    mockGuild = {
      id: 'guild_test',
      ownerId: 'owner_user_id'
    };
  });

  test('bot cannot manage the guild owner under any circumstances', () => {
    const botMember = {
      id: 'bot_id',
      guild: mockGuild,
      roles: { highest: { position: 100 } }
    };
    const ownerMember = {
      id: 'owner_user_id',
      guild: mockGuild,
      roles: { highest: { position: 5 } }
    };

    const check = hierarchy.canBotManageMember(botMember, ownerMember);
    assert.equal(check.allowed, false);
    assert.ok(check.reason.includes('Dono do Servidor'));
  });

  test('bot cannot manage member with equal or higher role position', () => {
    const botMember = {
      id: 'bot_id',
      guild: mockGuild,
      roles: { highest: { position: 50 } }
    };
    const seniorMember = {
      id: 'senior_id',
      guild: mockGuild,
      roles: { highest: { position: 60 } }
    };
    const equalMember = {
      id: 'equal_id',
      guild: mockGuild,
      roles: { highest: { position: 50 } }
    };
    const juniorMember = {
      id: 'junior_id',
      guild: mockGuild,
      roles: { highest: { position: 30 } }
    };

    assert.equal(hierarchy.canBotManageMember(botMember, seniorMember).allowed, false);
    assert.equal(hierarchy.canBotManageMember(botMember, equalMember).allowed, false);
    assert.equal(hierarchy.canBotManageMember(botMember, juniorMember).allowed, true);
  });

  test('bot cannot manage roles positioned higher than its own role or managed roles', () => {
    const botMember = {
      id: 'bot_id',
      guild: mockGuild,
      roles: { highest: { position: 50 } }
    };
    const adminRole = { id: 'admin_role', guild: mockGuild, position: 60, managed: false };
    const managedRole = { id: 'managed_role', guild: mockGuild, position: 20, managed: true };
    const everyoneRole = { id: 'guild_test', guild: mockGuild, position: 0, managed: false };
    const juniorRole = { id: 'junior_role', guild: mockGuild, position: 30, managed: false };

    assert.equal(hierarchy.canBotManageRole(botMember, adminRole).allowed, false);
    assert.equal(hierarchy.canBotManageRole(botMember, managedRole).allowed, false);
    assert.equal(hierarchy.canBotManageRole(botMember, everyoneRole).allowed, false);
    assert.equal(hierarchy.canBotManageRole(botMember, juniorRole).allowed, true);
  });

  test('enforceHierarchy throws PermissionDeniedError when hierarchy is violated', () => {
    const botMember = { id: 'bot_id', guild: mockGuild, roles: { highest: { position: 50 } } };
    const modMember = { id: 'mod_id', guild: mockGuild, roles: { highest: { position: 40 } } };
    const targetMember = { id: 'target_id', guild: mockGuild, roles: { highest: { position: 45 } } };

    assert.throws(() => {
      hierarchy.enforceHierarchy(botMember, modMember, targetMember, 'punir membro');
    }, PermissionDeniedError);
  });
});
