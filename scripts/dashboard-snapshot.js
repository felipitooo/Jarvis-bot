const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { renderDashboardHtml } = require('../src/web/dashboardHtml');

const outPath = process.argv[2];
if (!outPath) {
  console.error('Usage: node scripts/dashboard-snapshot.js <output-path>');
  process.exit(1);
}

const fixturePath = path.join(__dirname, 'fixtures', 'dashboard-fixture.json');
const fixture = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));

const html = renderDashboardHtml({
  ...fixture,
  botConfig: fixture.botConfig
});

fs.mkdirSync(path.dirname(path.resolve(outPath)), { recursive: true });
fs.writeFileSync(outPath, html, 'utf8');

const sha256 = crypto.createHash('sha256').update(html, 'utf8').digest('hex');
console.log(JSON.stringify({ outPath, length: Buffer.byteLength(html, 'utf8'), sha256 }));
