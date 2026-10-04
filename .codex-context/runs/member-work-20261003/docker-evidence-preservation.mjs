import { DatabaseSync } from 'node:sqlite';
import { isDeepStrictEqual } from 'node:util';
import { artifactHash } from '/app/apps/server/src/services/evidence.ts';

const before=new DatabaseSync('/app/data/member-work-20261003-backup.db',{readOnly:true});
const after=new DatabaseSync('/app/data/visua.db',{readOnly:true});
const rows=before.prepare('SELECT id,workspace_id,data FROM evidence ORDER BY id').all();
const content=item=>{
 const {sha256,reviewHistory,status,reviewedBy,reviewedAt,...preserved}=item;
 return preserved;
};
let checked=0;
for(const row of rows){
 const old=JSON.parse(row.data);
 const current=after.prepare('SELECT workspace_id,data FROM evidence WHERE id=?').get(row.id);
 if(!current||current.workspace_id!==row.workspace_id)throw new Error('Evidence identity changed');
 const next=JSON.parse(current.data);
 if(!isDeepStrictEqual(content(old),content(next)))throw new Error('Evidence content or metadata changed');
 if(next.sha256!==artifactHash(next))throw new Error('Evidence digest mismatch');
 if(old.status==='accepted'){
  if(next.status!=='pending-review')throw new Error('Legacy approval was not invalidated');
  const review=next.reviewHistory?.find(item=>item.legacy&&item.decision==='accepted'&&item.reviewedBy===(old.reviewedBy??'Unknown legacy reviewer')&&item.reviewedAt===(old.reviewedAt??old.createdAt));
  if(!review)throw new Error('Legacy decision details were not preserved');
 }
 checked++;
}
before.close();after.close();
console.log(JSON.stringify({status:'passed',recordsChecked:checked,contentAndMetadataPreserved:true,artifactHashesVerified:true,legacyDecisionDetailsPreserved:true},null,2));
