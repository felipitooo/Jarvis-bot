const Database = require('better-sqlite3');
const db = new Database('C:/Jarvis/data/jarvis.db');
const audit = db.prepare("SELECT * FROM audit_logs WHERE action = 'MEMBER_JOIN' ORDER BY id DESC LIMIT 10").all();
console.log(JSON.stringify(audit, null, 2));
