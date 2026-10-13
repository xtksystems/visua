import { chromium, expect } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
const root = new URL('./', import.meta.url);
const screenshots = new URL('../../../.screens/visual-delivery-20261013/', import.meta.url).pathname;
await mkdir(screenshots,{recursive:true});
const report={status:'running',checks:[],errors:[]};
const browser=await chromium.launch();
let context,ws,csrf;
const data = async (method,path,body) => {
 const response=await context.request[method](`/api${path}`,{...(body===undefined?{}:{data:body}),...(csrf?{headers:{'x-visua-csrf':csrf}}:{})});
 assert(response.ok(),`${method} ${path}: ${response.status()}`);return response.json();
};
try {
 context=await browser.newContext({baseURL:'http://localhost:8787',viewport:{width:1440,height:1000}});
 csrf=(await data('post','/auth/dev/login',{email:'morgan.lee@northwind-health.example'})).csrf;
 const original=await data('get','/workspaces/northwind-health');
 const audit=await data('get',`/workspaces/${original.workspace.id}/activity/verify`);
 assert.equal(audit.valid,true);report.originalAudit={valid:audit.valid,events:audit.events};
 await expect.poll(async()=> (await data('get',`/workspaces/${original.workspace.id}/score-history`)).observations.some(o=>o.reason==='scheduled'),{timeout:45000}).toBe(true);
 const {observations}=await data('get',`/workspaces/${original.workspace.id}/score-history`);
 assert(observations.some(o=>o.reason==='scheduled'));report.checks.push('Scheduled snapshot captured after deployment; original audit chain valid');
 const created=await data('post','/workspaces',{name:'Visual delivery smoke 20261013',frameworks:['nist-csf-2.0','nist-sp-800-53-r5'],planInitialTasks:false,profile:{industry:'saas',size:'11-50'}});
 ws=created.workspace.id;const base=`/workspaces/${ws}`;
 assert.deepEqual((await data('get',`${base}/score-history`)).observations,[]);
 const observation=await data('post',`${base}/score-history`,{});
 const history=await data('get',`${base}/score-history`);assert.equal(history.observations[0].id,observation.id);assert.equal(observation.reason,'manual');assert.deepEqual(observation.frameworks.map(f=>f.frameworkId).sort(),created.workspace.frameworks.filter(f=>f.enabled).map(f=>f.frameworkId).sort());
 report.checks.push('Manual observation persists through API read with every enabled framework, including the automatically added RMF');
 const comparison=await data('get',`${base}/crosswalk/comparison?source=nist-csf-2.0&target=nist-sp-800-53-r5`);
 assert(comparison.pairTotal>50);assert(comparison.rows.length>0);report.checks.push('Live crosswalk matrix API returns mapping counts and published relationships');
 await data('get',`${base}/evidence/renewal`);
 const task=await data('post',`${base}/tasks`,{title:'Deployment due-only task',requirementIds:['nist-csf-2.0:PR.AA-01'],dueDate:'2000-01-01'});
 const queue=await data('get',`${base}/attention`);assert(queue.items.some(i=>i.kind==='overdue-task'&&i.action.id===task.id));
 const run=await data('post',`${base}/runs?wait=1`,{agent:'planner',goal:'Review deployment stages',input:{framework:'nist-csf-2.0',maxTasks:2}});
 assert.equal(run.proposals.length,2);assert(run.stageHistory.length>=4);
 const page=await context.newPage();page.setDefaultTimeout(15000);page.on('pageerror',e=>report.errors.push(e.message));
 const overflow=async()=>assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Unexpected page overflow');
 await page.goto(`/w/${ws}`);await expect(page.getByRole('region',{name:'Observed score history',exact:true})).toContainText('One observation recorded');await overflow();await page.screenshot({path:screenshots+'home-desktop.png',animations:'disabled'});
 await page.goto(`/w/${ws}/observatory/nist-csf-2.0`);await page.getByRole('combobox',{name:'Outline preset',exact:true}).selectOption('at-risk');await expect(page.getByRole('tree',{name:'Framework outline'})).toBeVisible();await overflow();
 await page.goto(`/w/${ws}/crosswalk?view=matrix&source=nist-csf-2.0&target=nist-sp-800-53-r5`);await expect(page.getByRole('table',{name:'Requirement mapping comparison'})).toBeVisible();await overflow();await page.screenshot({path:screenshots+'matrix-desktop.png',animations:'disabled'});
 await page.goto(`/w/${ws}/plan`);await expect(page.getByRole('button',{name:'Open task Deployment due-only task',exact:true})).toBeVisible();await overflow();
 await page.goto(`/w/${ws}/profile`);await expect(page.getByRole('table',{name:'Current and target profile by category'})).toBeVisible();await page.getByRole('tab',{name:'Tiers',exact:true}).click();await expect(page.getByRole('button',{name:'Save assessment',exact:true})).toBeVisible();await overflow();
 await page.goto(`/w/${ws}/evidence?view=renewal`);await expect(page.getByRole('tab',{name:/Next 7 days/})).toBeVisible();await overflow();
 await page.goto(`/w/${ws}/agents/${run.id}`);const stages=page.getByRole('region',{name:'Agent stages'});await expect(stages.getByRole('heading')).toHaveText('Current stage: Review');
 await page.getByRole('button',{name:'Review all 2',exact:true}).click();const dialog=page.getByRole('dialog',{name:'Review all pending proposals',exact:true});await dialog.getByRole('button',{name:'Approve reviewed 2',exact:true}).click();await expect(dialog.getByRole('status')).toContainText('2 applied');await dialog.getByRole('button',{name:'Close',exact:true}).click();await expect(stages.getByRole('heading')).toHaveText('All proposed changes applied');await page.screenshot({path:screenshots+'agents-desktop.png',animations:'disabled'});
 report.checks.push('Desktop: overview history, Observatory presets, matrix, Plan urgency, Profile/Tiers, renewal, exact batch approval and recorded Apply outcome');
 await page.setViewportSize({width:390,height:844});
 for(const [label,path,role,name] of [
  ['history',`/w/${ws}`,'region','Observed score history'],
  ['plan',`/w/${ws}/plan`,'button','Open task Deployment due-only task'],
  ['renewal',`/w/${ws}/evidence?view=renewal`,'tab',/Next 7 days/],
  ['matrix',`/w/${ws}/crosswalk?view=matrix&source=nist-csf-2.0&target=nist-sp-800-53-r5`,'table','Requirement mapping comparison'],
  ['profile',`/w/${ws}/profile`,'table','Current and target profile by category']]) {
  await page.goto(path);await expect(page.getByRole(role,{name,exact:typeof name==='string'})).toBeVisible();await overflow();await page.screenshot({path:screenshots+label+'-phone.png',animations:'disabled'});
 }
 report.checks.push('390px phone: history, Plan, renewal, matrix and Profile render without page overflow');
 assert.deepEqual(report.errors,[]);assert.equal((await data('get',`${base}/activity/verify`)).valid,true);report.status='passed';
} catch(error) {report.status='failed';report.error=String(error);process.exitCode=1;}
finally {
 if(ws)try{await data('delete',`/workspaces/${ws}`);report.syntheticWorkspaceRemoved=true;}catch(error){report.cleanupError=String(error);process.exitCode=1;}
 await browser.close();await writeFile(new URL('live-smoke-result.json',root),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
}
