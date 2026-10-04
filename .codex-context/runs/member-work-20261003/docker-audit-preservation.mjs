import { DatabaseSync } from 'node:sqlite';
import { isDeepStrictEqual } from 'node:util';

const before=new DatabaseSync('/app/data/member-work-20261003-backup.db',{readOnly:true});
const after=new DatabaseSync('/app/data/visua.db',{readOnly:true});
const old=before.prepare('SELECT * FROM activity ORDER BY id').all();
const current=after.prepare('SELECT * FROM activity ORDER BY id').all();
const byId=new Map(current.map(row=>[row.id,row]));
for(const row of old){
 if(!isDeepStrictEqual(row,byId.get(row.id)))throw new Error('Historical audit record changed or disappeared');
}
const oldIds=new Set(old.map(row=>row.id));
const added=current.filter(row=>!oldIds.has(row.id)).map(row=>JSON.parse(row.data));
const actions=added.reduce((counts,event)=>{counts[event.action]=(counts[event.action]??0)+1;return counts;},{});
if(actions['approval-binding-upgraded']!==18||actions.deleted!==1||added.length!==19)throw new Error('Unexpected post-deployment audit records');
const deleted=added.find(event=>event.action==='deleted');
if(deleted.entity!=='workspace'||after.prepare('SELECT id FROM workspaces WHERE id=?').get(deleted.entityId))throw new Error('Fixture workspace cleanup was not recorded correctly');
before.close();after.close();
console.log(JSON.stringify({status:'passed',historicalRecordsPreserved:old.length,totalRecords:current.length,appendedActions:actions,fixtureDeletionRetainedInOrganizationAudit:true},null,2));
