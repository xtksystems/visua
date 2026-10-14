import { DatabaseSync } from 'node:sqlite';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
const old = new DatabaseSync('/app/data/pilot-readiness-20261014-backup/database.sqlite', { readOnly: true });
const current = new DatabaseSync('/app/data/visua.db', { readOnly: true });
const report = { status: 'passed', integrity: current.prepare('PRAGMA quick_check').get().quick_check, tables: {} };
const digest = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
try {
  assert.equal(report.integrity, 'ok');
  for (const {name} of old.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name").all()) {
    const quoted = '"' + name.replaceAll('"','""') + '"';
    const order = rows => rows.map(row => JSON.stringify(row)).sort();
    const before = order(old.prepare(`SELECT * FROM ${quoted}`).all());
    const after = order(current.prepare(`SELECT * FROM ${quoted}`).all());
    assert.equal(digest(after),digest(before),`Table changed: ${name}`);
    report.tables[name] = {rows: before.length, sha256: digest(before)};
  }
} catch (error) { report.status='failed'; report.error=error.message; process.exitCode=1; }
finally {old.close();current.close();console.log(JSON.stringify(report,null,2));}
