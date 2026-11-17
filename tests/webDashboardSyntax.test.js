const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const { renderDashboardHtml } = require('../src/web/dashboardHtml.js');

describe('Web Dashboard Client Script Syntax Verification', () => {
  it('should generate valid client-side JavaScript for unlocked state', () => {
    const html = renderDashboardHtml({ activeConfig: {}, isUnlocked: true });
    const scriptMatches = html.match(/<script[\s\S]*?<\/script>/gi) || [];
    assert.ok(scriptMatches.length > 0, 'Should find at least one <script> tag');

    scriptMatches.forEach((scriptTag, idx) => {
      const code = scriptTag.replace(/<script[^>]*>/i, '').replace(/<\/script>/i, '');
      assert.doesNotThrow(() => {
        new vm.Script(code, { filename: `dashboard_script_unlocked_${idx}.js` });
      }, `Script ${idx} in unlocked dashboardHtml must compile without syntax errors`);
    });
  });

  it('should generate valid client-side JavaScript for locked state', () => {
    const html = renderDashboardHtml({ activeConfig: {}, isUnlocked: false });
    const scriptMatches = html.match(/<script[\s\S]*?<\/script>/gi) || [];
    assert.ok(scriptMatches.length > 0, 'Should find at least one <script> tag');

    scriptMatches.forEach((scriptTag, idx) => {
      const code = scriptTag.replace(/<script[^>]*>/i, '').replace(/<\/script>/i, '');
      assert.doesNotThrow(() => {
        new vm.Script(code, { filename: `dashboard_script_locked_${idx}.js` });
      }, `Script ${idx} in locked dashboardHtml must compile without syntax errors`);
    });
  });
});
