import { DatabaseSync } from 'node:sqlite';
import { createHash } from 'node:crypto';

const canonical = value => Array.isArray(value) ? value.map(canonical)
  : value && typeof value === 'object' ? Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])])) : value;
const digest = value => createHash('sha256').update(JSON.stringify(canonical(value))).digest('hex');
const db = new DatabaseSync('/app/data/visua.db', { readOnly: true });
const result = { integrity: db.prepare('PRAGMA quick_check').get().quick_check, tables: {}, evidenceStatuses: {} };
for (const table of ['workspaces', 'requirement_states', 'tasks', 'activity', 'tenants', 'memberships']) {
  const keys = db.prepare(`PRAGMA table_info(${table})`).all().filter(c => c.pk).sort((a,b) => a.pk-b.pk).map(c => c.name);
  const rows = db.prepare(`SELECT * FROM ${table} ORDER BY ${keys.join(',')}`).all();
  result.tables[table] = { count: rows.length, sha256: digest(rows), identitiesSha256: digest(rows.map(row => keys.map(key => row[key]))) };
}
result.migrations = db.prepare('SELECT version FROM schema_migrations ORDER BY version').all().map(row => row.version);
const hasBodies = !!db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='evidence_content'").get();
const bodies = hasBodies ? new Map(db.prepare('SELECT evidence_id, data FROM evidence_content').all().map(row => [row.evidence_id, JSON.parse(row.data)])) : new Map();
const rows = db.prepare('SELECT * FROM evidence ORDER BY id').all();
const metadata = rows.map(row => JSON.parse(row.data));
const hydrated = rows.map((row, index) => ({ ...row, data: { ...metadata[index], ...bodies.get(row.id) } }));
result.evidenceCount = rows.length;
result.evidenceIdentitiesSha256 = digest(rows.map(row => [row.id, row.workspace_id]));
result.hydratedEvidenceSha256 = digest(hydrated);
result.inlineMetadataBodies = metadata.filter(e => e.content !== undefined || e.data !== undefined).length;
result.inlineBodyRows = bodies.size;
result.fileArtifacts = metadata.filter(e => e.artifact).length;
result.legacyReviewCount = metadata.reduce((count, e) => count + (e.reviewHistory ?? []).filter(review => review.legacy).length, 0);
for (const e of metadata) result.evidenceStatuses[e.status] = (result.evidenceStatuses[e.status] ?? 0) + 1;
db.close();
console.log(JSON.stringify(result, null, 2));
