const fs = require('fs');
const content = fs.readFileSync('C:/Jarvis/src/web/dashboardHtml.js', 'utf8');

const sIdx = content.indexOf('<div class="meli-subbar-inner">');
console.log(content.slice(sIdx + 1500, sIdx + 3000));
