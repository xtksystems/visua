import { DatabaseSync } from 'node:sqlite';
import { createHash } from 'node:crypto';

const canonical = value => Array.isArray(value) ? value.map(canonical)
  : value && typeof value === 'object' ? Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])])) : value;
const digest = value => createHash('sha256').update(JSON.stringify(canonical(value))).digest('hex');
const db = new DatabaseSync('/app/data/visua.db', { readOnly: true });
db.exec("ATTACH DATABASE '/app/data/evidence-files-20261004-backup.db' AS prior");
const result = { status: 'passed', tables: {}, evidence: {}, integrity: db.prepare('PRAGMA quick_check').get().quick_check };
for (const table of ['workspaces', 'requirement_states', 'tasks', 'activity', 'tenants', 'memberships']) {
  const keys = db.prepare(`PRAGMA table_info(${table})`).all().filter(c => c.pk).sort((a,b) => a.pk-b.pk).map(c => c.name);
  const prior = db.prepare(`SELECT * FROM prior.${table} ORDER BY ${keys.join(',')}`).all();
  const current = db.prepare(`SELECT * FROM main.${table} ORDER BY ${keys.join(',')}`).all();
  const selected = table === 'activity' ? current.filter(row => prior.some(old => old.id === row.id)) : current;
  const equal = digest(prior) === digest(selected);
  result.tables[table] = { priorCount: prior.length, currentCount: current.length, unchanged: equal, priorSha256: digest(prior), comparedSha256: digest(selected) };
  if (!equal) result.status = 'failed';
}
const priorEvidence = db.prepare('SELECT * FROM prior.evidence ORDER BY id').all().map(row => ({ ...row, data: JSON.parse(row.data) }));
const bodies = new Map(db.prepare('SELECT evidence_id, data FROM evidence_content').all().map(row => [row.evidence_id, JSON.parse(row.data)]));
const currentEvidence = db.prepare('SELECT * FROM evidence ORDER BY id').all().map(row => ({ ...row, data: { ...JSON.parse(row.data), ...bodies.get(row.id) } }));
result.evidence = { priorCount: priorEvidence.length, currentCount: currentEvidence.length, unchanged: digest(priorEvidence) === digest(currentEvidence), priorSha256: digest(priorEvidence), currentSha256: digest(currentEvidence) };
if (!result.evidence.unchanged || result.integrity !== 'ok') result.status = 'failed';
db.close();
console.log(JSON.stringify(result, null, 2));
if (result.status !== 'passed') process.exitCode = 1;
