import { chromium, expect } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import { evidenceReviewScope } from '../../../packages/core/src/evidence.ts';
import { verifyBundle } from '../../../apps/server/src/services/bundle-verifier.mjs';
const require=createRequire(new URL('../../../apps/server/package.json',import.meta.url));
const {unzipSync}=require('fflate');
const base='http://localhost:8787',root=new URL('../../../.screens/auditor-delivery-20261013/',import.meta.url).pathname;
await mkdir(root,{recursive:true});
const browser=await chromium.launch();const owner=await browser.newContext({baseURL:base});
const auditor=await browser.newContext({baseURL:base,viewport:{width:1440,height:900}});
const report={status:'running',checks:[],browserErrors:[]};let csrf,ws;
async function request(context,method,path,data,token){const r=await context.request[method](`/api${path}`,{...(data===undefined?{}:{data}),...(token?{headers:{'x-visua-csrf':token}}:{})});assert(r.ok(),`${method} ${path}: ${r.status()}`);return r.json();}
try{
 csrf=(await request(owner,'post','/auth/dev/login',{email:'morgan.lee@northwind-health.example'})).csrf;
 const created=await request(owner,'post','/workspaces',{name:'Auditor delivery smoke',frameworks:['nist-csf-2.0','aicpa-tsc-2017'],planInitialTasks:false,profile:{industry:'saas',size:'11-50'}},csrf);ws=created.workspace.id;
 const bytes=Buffer.from([0,255,128,10,13,40,70,80]);
 const upload=await owner.request.post(`/api/workspaces/${ws}/evidence/files`,{headers:{'x-visua-csrf':csrf},multipart:{file:{name:'synthetic-observation.bin',mimeType:'application/octet-stream',buffer:bytes},metadata:JSON.stringify({title:'Retained synthetic observation',requirementIds:['nist-csf-2.0:PR.AA-01','aicpa-tsc-2017:CC6.1'],collectedAt:'2026-01-01',assurance:{kind:'operating',scope:'Synthetic local deployment fixture'}})}});assert.equal(upload.status(),201);const evidence=await upload.json();report.syntheticBlob={scope:{tenantId:created.workspace.tenantId,workspaceId:ws},id:evidence.artifact.id};
 await request(owner,'patch',`/workspaces/${ws}/evidence/${evidence.id}`,{decision:'accepted',expectedScope:evidenceReviewScope(evidence),expectedReviewId:null},csrf);
 const before=await request(owner,'get',`/workspaces/${ws}/activity/verify`);
 const auditorMe=await request(auditor,'post','/auth/dev/login',{email:'alex.kim@audit-partners.example'});
 const denied=await auditor.request.patch(`/api/workspaces/${ws}/evidence/${evidence.id}`,{headers:{'x-visua-csrf':auditorMe.csrf},data:{title:'Forbidden edit'}});assert.equal(denied.status(),403);
 const page=await auditor.newPage();page.setDefaultTimeout(30000);page.on('pageerror',e=>report.browserErrors.push(e.message));
 await page.goto(`/w/${ws}/reports`);
 const panel=page.getByRole('region',{name:'Auditor handoff',exact:true});
 await panel.getByRole('button',{name:'Open auditor view',exact:true}).click();
 const view=panel.getByRole('region',{name:'Read-only auditor view',exact:true});await expect(view).toContainText('Retained synthetic observation');await expect(view.locator('button,input,textarea,select')).toHaveCount(0);
 await page.screenshot({path:root+'auditor-desktop.png',animations:'disabled'});
 const download=page.waitForEvent('download');await panel.getByRole('button',{name:'Download auditor package',exact:true}).click();const file=await download;const zip=await readFile(await file.path());const files=unzipSync(zip);
 const receipt=panel.getByRole('region',{name:'Download receipt',exact:true});await expect(receipt).toBeVisible();const text=await receipt.textContent();
 const manifestSha256=/Manifest SHA-256: ([a-f0-9]{64})/.exec(text)?.[1];const pin=/Audit checkpoint: ([^\s:]+):(\d+):([a-f0-9]{64})/.exec(text);assert(manifestSha256&&pin);
 assert.equal(createHash('sha256').update(files['manifest.json']).digest('hex'),manifestSha256);
 const extracted=root+'extracted';await mkdir(extracted,{recursive:true});for(const [path,content]of Object.entries(files)){assert(/^[a-z0-9-]+(?:\/[a-z0-9-]+)*\.[a-z0-9]+$/.test(path));const parent=path.includes('/')?path.slice(0,path.lastIndexOf('/')):'';if(parent)await mkdir(extracted+'/'+parent,{recursive:true});await writeFile(extracted+'/'+path,content);}
 const checkpoint={workspaceId:pin[1],seq:Number(pin[2]),hash:pin[3]};const verified=await verifyBundle(extracted,{manifestSha256,checkpoint});assert(verified.externalManifestPinChecked&&verified.externalCheckpointPinChecked);report.offlineVerification=verified;
 assert(Object.values(files).some(content=>Buffer.from(content).equals(bytes)));
 const downloaded=await auditor.request.get(`/api/workspaces/${ws}/evidence/${evidence.id}/file`);assert(downloaded.ok());assert((await downloaded.body()).equals(bytes));
 await panel.getByRole('button',{name:'Load recent access records',exact:true}).click();const access=panel.getByRole('region',{name:'Prepared access records',exact:true});await expect(access).toContainText('auditor-bundle.zip');await expect(access).toContainText('evidence download');
 const after=await request(owner,'get',`/workspaces/${ws}/activity/verify`);assert.deepEqual(after,before);
 await page.setViewportSize({width:390,height:844});await view.scrollIntoViewIfNeeded();assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await page.screenshot({path:root+'auditor-phone.png',animations:'disabled'});
 assert.deepEqual(report.browserErrors,[]);report.checks.push('Auditor write refusal, explicit read-only preview, actual binary ZIP and download, external receipt pins, offline verification, separate access records, unchanged assessment chain, desktop/phone overflow');report.status='passed';
}catch(error){report.status='failed';report.error=String(error);process.exitCode=1;}
finally{if(ws)try{await request(owner,'delete',`/workspaces/${ws}`,undefined,csrf);report.syntheticWorkspaceRemoved=true;}catch(error){report.cleanupError=String(error);process.exitCode=1;}await browser.close();await writeFile(new URL('live-auditor-result.json',import.meta.url),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));}
