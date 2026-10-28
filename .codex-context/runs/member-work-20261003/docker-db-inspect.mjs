import { DatabaseSync } from 'node:sqlite';
import { createHash } from 'node:crypto';
const db = new DatabaseSync('/app/data/visua.db', { readOnly: true });
const result = { integrity: db.prepare('PRAGMA quick_check').get().quick_check, tables: {}, evidenceStatuses: {} };
for (const table of ['workspaces','requirement_states','tasks','activity','tenants','memberships']) {
 const columns=db.prepare(`PRAGMA table_info(${table})`).all();
 const keys=columns.filter(c=>c.pk).sort((a,b)=>a.pk-b.pk).map(c=>c.name);
 const rows=db.prepare(`SELECT * FROM ${table}${keys.length ? ` ORDER BY ${keys.join(',')}` : ''}`).all();
 result.tables[table]={count:rows.length,sha256:createHash('sha256').update(JSON.stringify(rows)).digest('hex')};
 result.tables[table].identitiesSha256=createHash('sha256').update(JSON.stringify(rows.map(row=>keys.map(key=>row[key])))).digest('hex');
 result.tables[table].contentSha256=createHash('sha256').update(JSON.stringify(rows.map(row=>row.data??row))).digest('hex');
 if(table==='activity'){
  result.maxActivitySeq=Math.max(0,...rows.map(row=>row.seq??0));
  const cutoff=Number(process.env.VISUA_AUDIT_PREFIX_SEQ??0);
  if(cutoff){const prefix=rows.filter(row=>row.seq===null||row.seq<=cutoff);result.historicalActivity={count:prefix.length,sha256:createHash('sha256').update(JSON.stringify(prefix)).digest('hex')};}
 }
}
result.migrations=db.prepare('SELECT version FROM schema_migrations ORDER BY version').all().map(row=>row.version);
const evidence=db.prepare('SELECT data FROM evidence').all().map(row=>JSON.parse(row.data));
result.evidenceCount=evidence.length;
result.evidenceIdentitiesSha256=createHash('sha256').update(JSON.stringify(db.prepare('SELECT id,workspace_id FROM evidence ORDER BY id').all())).digest('hex');
result.legacyReviewCount=evidence.reduce((count,item)=>count+(item.reviewHistory??[]).filter(review=>review.legacy).length,0);
for(const item of evidence)result.evidenceStatuses[item.status]=(result.evidenceStatuses[item.status]??0)+1;
db.close();
console.log(JSON.stringify(result,null,2));
