import { DatabaseSync } from 'node:sqlite';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
const before = new DatabaseSync('/app/data/evidence-auditor-20261013-backup/database.sqlite', { readOnly: true });
const after = new DatabaseSync('/app/data/visua.db', { readOnly: true });
const report = { status: 'passed', integrity: after.prepare('PRAGMA quick_check').get().quick_check, tables: {}, newActivity: [], snapshots: [] };
const canonical = v => Array.isArray(v) ? v.map(canonical) : v && typeof v === 'object' ? Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])])) : v;
const digest = v => createHash('sha256').update(JSON.stringify(canonical(v))).digest('hex');
try {
  assert.equal(report.integrity, 'ok');
  for (const {name} of before.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all()) {
    const quoted = '"' + name.replaceAll('"','""') + '"';
    const keys = before.prepare(`PRAGMA table_info(${quoted})`).all().filter(c=>c.pk).sort((a,b)=>a.pk-b.pk).map(c=>c.name);
    assert(keys.length, `No primary key for ${name}`);
    const oldRows = before.prepare(`SELECT * FROM ${quoted}`).all();
    const newRows = after.prepare(`SELECT * FROM ${quoted}`).all();
    const key = row => JSON.stringify(keys.map(k=>row[k]));
    const byKey = new Map(newRows.map(row=>[key(row),row]));
    const oldKeys = new Set(oldRows.map(key));
    for (const row of oldRows) {
      const current = byKey.get(key(row));
      assert(current, `Missing original ${name} row`);
      const expected = {...row}, actual = {...current};
      if (name === 'workspaces') {
        const snapshots = after.prepare('SELECT COUNT(*) AS n FROM score_snapshots WHERE workspace_id=?').get(row.id).n - before.prepare('SELECT COUNT(*) AS n FROM score_snapshots WHERE workspace_id=?').get(row.id).n;
        assert.equal(current.rev-row.rev,snapshots,'Workspace revision reflects only new snapshots');
        delete expected.rev; delete actual.rev;
      }
      assert.equal(digest(actual),digest(expected),`Original ${name} row changed; keys: ${Object.keys(row).filter(k=>JSON.stringify(row[k])!==JSON.stringify(current[k])).join(',')}`);
    }
    const added = newRows.filter(row=>!oldKeys.has(key(row)));
    if (name === 'activity') {
      report.newActivity = added.map(row=>{ const e=JSON.parse(row.data); return {action:e.action,entity:e.entity,actor:e.actor}; });
      assert(added.every(row=>JSON.parse(row.data).entity==='score-snapshot'),'Unexpected new activity before smoke');
    } else if (name === 'schema_migrations') assert.deepEqual(added.map(row=>row.version),[8]);
    else if (name !== 'score_snapshots') assert.equal(added.length,0,`Unexpected added ${name} rows`);
    report.tables[name] = { preserved: oldRows.length, added: added.length, originalRowsSha256: digest(oldRows.sort((a,b)=>key(a).localeCompare(key(b)))) };
  }
  assert.equal(after.prepare('SELECT COUNT(*) AS n FROM workspace_access').get().n,0,'No original access records lost or spurious access appended');
  report.snapshots = after.prepare('SELECT reason, COUNT(*) AS count FROM score_snapshots GROUP BY reason').all();
} catch(error) {report.status='failed';report.error=String(error);process.exitCode=1;}
finally {before.close();after.close();console.log(JSON.stringify(report,null,2));}
