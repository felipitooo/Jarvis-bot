const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const {
  isSecondary,
  getInstanceConfig,
  resolveBotName,
  resolvePrefix,
  isPrefixlessValue,
  resolveHelpConfig,
  isHelpEnabledForInstanceConfig
} = require('../src/utils/botContextResolver');
const { botConfig } = require('../src/config/botConfig');

describe('botContextResolver (centralized secondary vs primary resolution)', () => {
  test('isSecondary detects secondary Multi-Bot instances accurately', () => {
    assert.equal(isSecondary({ botInstanceId: 'bot_nala' }), true);
    assert.equal(isSecondary({}), false);
    assert.equal(isSecondary(null), false);
  });

  test('getInstanceConfig returns null for primary and resolves instance config for secondary', () => {
    assert.equal(getInstanceConfig({}), null);

    const cfgFromMgr = { prefix: '!', modules: { moderation: true } };
    const secondaryCtx = {
      botInstanceId: 'bot_nala',
      multiBotManager: { getInstanceConfig: () => cfgFromMgr },
      botInstanceConfig: { prefix: '?' }
    };
    assert.deepEqual(getInstanceConfig(secondaryCtx), cfgFromMgr);

    const fallbackCtx = {
      botInstanceId: 'bot_nala',
      botInstanceConfig: { prefix: '?' }
    };
    assert.deepEqual(getInstanceConfig(fallbackCtx), { prefix: '?' });
  });

  test('resolveBotName resolves isolated name for secondary and identityService name for primary', () => {
    const primaryCtx = {
      identityService: { getDisplayName: (gId) => (gId === 'g1' ? 'Jarvis Custom' : 'Jarvis') }
    };
    assert.equal(resolveBotName(primaryCtx, 'g1', null), 'Jarvis Custom');
    assert.equal(resolveBotName({}, 'g1', null), 'Jarvis');

    const secondaryCtx = {
      botInstanceId: 'bot_nala',
      botInstanceName: 'N.A.L.A',
      identityService: { getDisplayName: () => 'Jarvis Custom' }
    };
    assert.equal(resolveBotName(secondaryCtx, 'g1', { user: { username: 'NALAUser' } }), 'N.A.L.A');

    const secondaryClientFallback = {
      botInstanceId: 'bot_nala',
      multiBotManager: { getInstance: () => ({ name: 'NALAMgr' }) }
    };
    assert.equal(resolveBotName(secondaryClientFallback, 'g1', { user: { username: 'NALAClient' } }), 'NALAClient');
    assert.equal(resolveBotName(secondaryClientFallback, 'g1', null), 'NALAMgr');
  });

  test('resolvePrefix and isPrefixlessValue handle secondary, primary and prefixless values', () => {
    const secondaryCtx = {
      botInstanceId: 'bot_nala',
      multiBotManager: { getInstanceConfig: () => ({ prefix: '!' }) }
    };
    assert.equal(resolvePrefix(secondaryCtx, 'g1'), '!');

    const originalGetConfig = botConfig.getConfig.bind(botConfig);
    botConfig.getConfig = () => ({ identity: { defaultPrefix: '+' } });
    try {
      const primaryCtx = {
        settingsService: {
          getSetting: (gId, key, def) => (gId === 'g_custom' && key === 'prefix' ? '$' : def)
        }
      };
      assert.equal(resolvePrefix(primaryCtx, 'g_custom'), '$');
      assert.equal(resolvePrefix(primaryCtx, 'g_default'), '+');
      assert.equal(resolvePrefix({}, 'g_any'), '+');
    } finally {
      botConfig.getConfig = originalGetConfig;
    }

    assert.equal(isPrefixlessValue('none'), true);
    assert.equal(isPrefixlessValue('sem'), true);
    assert.equal(isPrefixlessValue('nenhum'), true);
    assert.equal(isPrefixlessValue(''), true);
    assert.equal(isPrefixlessValue('!'), false);
    assert.equal(isPrefixlessValue('+'), false);
  });

  test('resolveHelpConfig reads isolated help config for secondary and guild_settings or botConfig for primary', () => {
    const secondaryCtx = {
      botInstanceId: 'bot_nala',
      multiBotManager: {
        getInstanceConfig: () => ({ help: { enabled: false, title: 'NALA Help' } })
      }
    };
    assert.deepEqual(resolveHelpConfig(secondaryCtx, 'g1'), { enabled: false, title: 'NALA Help' });

    const secondaryCmdHelpCtx = {
      botInstanceId: 'bot_nala',
      multiBotManager: {
        getInstanceConfig: () => ({ commands: { help: { enabled: true, title: 'Cmd Help' } } })
      }
    };
    assert.deepEqual(resolveHelpConfig(secondaryCmdHelpCtx, 'g1'), { enabled: true, title: 'Cmd Help' });

    const primaryGuildSettingsCtx = {
      guildModuleService: {
        db: {
          get: () => ({ value: JSON.stringify({ enabled: true, title: 'Guild Help' }) })
        }
      }
    };
    assert.deepEqual(resolveHelpConfig(primaryGuildSettingsCtx, 'g1'), { enabled: true, title: 'Guild Help' });

    const originalGetConfig = botConfig.getConfig.bind(botConfig);
    botConfig.getConfig = () => ({ help: { enabled: false, title: 'Global Fallback' } });
    try {
      assert.deepEqual(resolveHelpConfig({}, 'g1'), { enabled: false, title: 'Global Fallback' });
    } finally {
      botConfig.getConfig = originalGetConfig;
    }
  });

  test('isHelpEnabledForInstanceConfig returns false when either commands.help.enabled or help.enabled is false', () => {
    assert.equal(isHelpEnabledForInstanceConfig(null), true);
    assert.equal(isHelpEnabledForInstanceConfig({}), true);
    assert.equal(isHelpEnabledForInstanceConfig({ help: { enabled: true }, commands: { help: { enabled: true } } }), true);
    assert.equal(isHelpEnabledForInstanceConfig({ help: { enabled: false }, commands: { help: { enabled: true } } }), false);
    assert.equal(isHelpEnabledForInstanceConfig({ help: { enabled: true }, commands: { help: { enabled: false } } }), false);
  });
});
