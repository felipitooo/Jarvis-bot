const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { renderDashboardHtml } = require('../src/web/dashboardHtml');

const EXPECTED_TABS = [
  'overview', 'identity', 'aimemory', 'botspeak', 'tickets', 'customcommands',
  'welcome', 'music', 'economy', 'social', 'quiz', 'casino', 'xp', 'members',
  'moderation', 'starboard', 'reviews', 'community', 'alerts', 'audit',
  'health', 'antibot', 'tempbans', 'summary', 'modules', 'multibot', 'settings'
];

describe('Dashboard HTML modular render (regression guard)', () => {
  const fixturePath = path.join(__dirname, '..', 'scripts', 'fixtures', 'dashboard-fixture.json');
  const fixture = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));

  test('renders complete valid HTML starting with <!DOCTYPE html> and containing all 27 tabs', () => {
    const html = renderDashboardHtml(fixture);
    assert.ok(html.startsWith('<!DOCTYPE html>'), 'Expected HTML output to start with <!DOCTYPE html>');
    assert.ok(html.endsWith('</html>'), 'Expected HTML output to end with </html>');

    for (const tab of EXPECTED_TABS) {
      assert.ok(html.includes(`id="tab-${tab}"`), `Expected tab container id="tab-${tab}" to exist`);
    }
  });

  test('main inline client <script> compiles cleanly under vm.Script', () => {
    const html = renderDashboardHtml(fixture);
    const scriptStart = html.lastIndexOf('<script>');
    assert.ok(scriptStart !== -1, 'Expected inline <script> tag');
    const codeStart = scriptStart + '<script>'.length;
    const scriptEnd = html.indexOf('</script>', codeStart);
    assert.ok(scriptEnd !== -1, 'Expected closing </script> tag');

    const clientCode = html.slice(codeStart, scriptEnd);
    assert.ok(clientCode.length > 10000, 'Expected substantial inline client JS code');
    assert.doesNotThrow(() => {
      new vm.Script(clientCode);
    }, 'Client JavaScript in rendered dashboard should compile without syntax errors');
  });
});
