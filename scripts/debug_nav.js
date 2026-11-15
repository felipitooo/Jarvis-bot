const fs = require('fs');
const content = fs.readFileSync('C:/Jarvis/src/web/dashboardHtml.js', 'utf8');

const sIdx = content.indexOf('<nav class="meli-nav-bar"');
console.log(content.slice(sIdx + 1200, sIdx + 2600));
