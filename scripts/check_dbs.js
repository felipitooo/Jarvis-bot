const { DatabaseSync } = require('node:sqlite');
for (const f of ['jarvis.db', 'cell.db', 'jarvis.sqlite']) {
  try {
    const db = new DatabaseSync('C:/Jarvis/data/' + f);
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map(t=>t.name);
    console.log(f, 'tables:', tables);
  } catch(e) {
    console.log(f, 'error:', e.message);
  }
}
