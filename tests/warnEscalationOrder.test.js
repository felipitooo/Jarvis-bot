const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { WarnEscalationService } = require('../src/services/warnEscalationService');

describe('WarnEscalationService rule ordering', () => {
  test('applies the most severe matching rule (5 warns = KICK beats 3 warns = TIMEOUT)', async () => {
    const rules = [
      { id: 1, threshold_warns: 3, action: 'TIMEOUT', duration_seconds: 3600, window_days: 30, auto_apply: 1, priority: 0 },
      { id: 2, threshold_warns: 5, action: 'KICK', window_days: 30, auto_apply: 1, priority: 0 }
    ];
    const modRepo = {
      getEscalationRules: () => rules,
      getActiveWarns: () => new Array(5).fill({})
    };
    const calls = [];
    const moderationService = {
      timeout: async () => calls.push('TIMEOUT'),
      kick: async () => calls.push('KICK'),
      ban: async () => calls.push('BAN')
    };
    const svc = new WarnEscalationService(modRepo, moderationService);
    const botMember = { guild: { id: 'g1' }, user: { id: 'bot' } };
    const target = { id: 'u1', user: { id: 'u1' }, roles: { cache: new Map() } };

    const res = await svc.checkAndEscalate(botMember, target);
    assert.equal(res.triggered, true);
    assert.equal(res.action, 'KICK');
    assert.deepEqual(calls, ['KICK']);
  });
});
