const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const { createAppContext } = require('../src/index');

describe('Application Lifecycle & Bootstrap', () => {
  const tempDbPath = path.resolve(__dirname, 'temp_lifecycle.sqlite');

  test('createAppContext should initialize all layers and repositories cleanly', () => {
    if (fs.existsSync(tempDbPath)) {
      fs.unlinkSync(tempDbPath);
    }

    const context = createAppContext(tempDbPath);

    assert.ok(context.dbManager);
    assert.ok(context.guildRepo);
    assert.ok(context.settingsRepo);
    assert.ok(context.userRepo);
    assert.ok(context.auditRepo);
    assert.ok(context.identityService);
    assert.ok(context.permissionService);
    assert.ok(context.commandRegistry.has('ping'));

    // Verify command registration
    const pingCmd = context.commandRegistry.get('ping');
    assert.equal(pingCmd.data.name, 'ping');

    // Close cleanly
    context.dbManager.close();

    // Clean up temporary database file
    if (fs.existsSync(tempDbPath)) {
      fs.unlinkSync(tempDbPath);
    }
  });
});
