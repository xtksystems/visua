import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {createService} from './apps/server/src/context.ts';
import {evidenceReviewScope} from './packages/core/src/index.ts';
import {buildAuditorBundle} from './apps/server/src/services/auditor-bundle.ts';
assert.match(new URL(process.env.VISUA_DATABASE_URL).pathname,/^\/visua_probe_[a-z0-9_]+$/);
const svc=await createService();
const bytes=Buffer.alloc(65536); for(let i=0;i<bytes.length;i++)bytes[i]=i%251;
try {
 if(process.argv[2]==='create') {
  const ws=await svc.createWorkspace({name:'Synthetic reactor recovery',tenantId:'reactor-probe',frameworks:['nist-csf-2.0'],planInitialTasks:false,profile:{industry:'saas',size:'1-10',dataTypes:[],drivers:[],environments:['on-prem'],maturityTier:1,guidance:'guided',securityTeamSize:1}});
  const ev=await svc.createFileEvidence(ws.id,{title:'Synthetic binary recovery check',fileName:'synthetic.bin',mediaType:'application/octet-stream',requirementIds:['nist-csf-2.0:PR.AA-01'],collectedAt:'2026-10-28',validUntil:'2027-10-28'},bytes);
  const reviewed=await svc.reviewEvidence(ws.id,ev.id,'accepted','synthetic-reviewer',undefined,evidenceReviewScope(ev));
  const bundle=await buildAuditorBundle(svc,ws,{asOf:"2026-10-28T00:00:00.000Z"});
  const receipt={workspace:ws,reviewed,revision:await svc.store.workspaces.rev(ws.id),activity:await svc.store.activity.chain(ws.id),bundleContentSha256:bundle.contentSha256,checkpoint:bundle.snapshot.auditCheckpoint,bytesSha256:createHash('sha256').update(bytes).digest('hex')};
  await writeFile('/app/data/probe-receipt.json',JSON.stringify(receipt));
  console.log(JSON.stringify({stage:'created',fileBytes:bytes.length,receiptSha256:createHash('sha256').update(JSON.stringify(receipt)).digest('hex')}));
 } else {
  const receipt=JSON.parse(await readFile('/app/data/probe-receipt.json','utf8'));
  assert.equal(createHash('sha256').update(JSON.stringify(receipt)).digest('hex'),process.argv[3]);
  const {evidence,bytes:restored}=await svc.getEvidenceFile(receipt.workspace.id,receipt.reviewed.id);
  assert.deepEqual(Buffer.from(restored),bytes);assert.deepEqual(evidence,receipt.reviewed);
  assert.deepEqual(await svc.store.activity.chain(receipt.workspace.id),receipt.activity);
  assert.equal(await svc.store.workspaces.rev(receipt.workspace.id),receipt.revision);
  assert.equal((await svc.verifyAuditTrail(receipt.workspace.id)).valid,true);
  const bundle=await buildAuditorBundle(svc,receipt.workspace,{asOf:"2026-10-28T00:00:00.000Z"});
  assert.equal(bundle.contentSha256,receipt.bundleContentSha256);
  assert.deepEqual(bundle.snapshot.auditCheckpoint,receipt.checkpoint);
  console.log(JSON.stringify({stage:'restored',exactBinary:true,boundReview:true,auditAndRevision:true,bundleContent:true,receiptPin:true}));
 }
} finally {await svc.store.close();}
