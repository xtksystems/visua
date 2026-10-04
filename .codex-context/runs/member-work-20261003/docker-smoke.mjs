import { chromium, expect as baseExpect } from '@playwright/test';
const expect = baseExpect.configure({timeout:30000});
const origin = 'http://localhost:8787';
const A = 'nist-csf-2.0:PR.AA-01';
const B = 'nist-csf-2.0:PR.AA-02';
const browser = await chromium.launch({args:['--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
const context = await browser.newContext({viewport:{width:1440,height:900},baseURL:origin});
const page = await context.newPage();
const errors=[];
page.on('pageerror',e=>errors.push(e.message));
let workspace;
let csrf;
const result = {ok:false,origin,checks:{},fixtureCleaned:false};
try {
 const ready=await context.request.get('/api/ready');
 expect(ready.status()).toBe(200);
 result.checks.ready=true;
 const login=await context.request.post('/api/auth/dev/login',{data:{email:'morgan.lee@northwind-health.example'}});
 expect(login.ok()).toBe(true);
 const me=await login.json();
 csrf=me.csrf;
 const headers={'x-visua-csrf':csrf};
 const existing=await (await context.request.get('/api/workspaces')).json();
 result.checks.existingAuditChains=[];
 for(const item of existing){
  const response=await context.request.get(`/api/workspaces/${item.workspace.id}/activity/verify`);
  expect(response.ok()).toBe(true);
  const verification=await response.json();
  expect(verification.valid).toBe(true);
  result.checks.existingAuditChains.push({valid:verification.valid,events:verification.events});
 }
 const created=await context.request.post('/api/workspaces',{headers,data:{name:`Deployment smoke ${Date.now()}`,frameworks:['nist-csf-2.0'],profile:{industry:'saas',size:'11-50'}}});
 expect(created.status()).toBe(201);
 workspace=(await created.json()).workspace;
 const createdTask=await context.request.post(`/api/workspaces/${workspace.id}/tasks`,{headers,data:{title:'Deployment assignment smoke',requirementIds:[A]}});
 expect(createdTask.status()).toBe(201);
 const task=await createdTask.json();
 await page.goto(`/w/${workspace.slug}/plan?task=${task.id}`);
 const dialog=page.getByRole('dialog',{name:task.title});
 await dialog.getByLabel('Assignee',{exact:true}).selectOption(`member:${me.user.id}`);
 await dialog.getByLabel('Due date',{exact:true}).fill('2030-12-31');
 await dialog.getByLabel('Search requirements to link',{exact:true}).fill('PR.AA-02');
 await dialog.getByRole('button',{name:'Add PR.AA-02 requirement',exact:true}).click();
 await dialog.getByRole('button',{name:'Save task details',exact:true}).click();
 await expect(dialog.getByRole('button',{name:'Save task details',exact:true})).toBeDisabled();
 const tasks=await (await context.request.get(`/api/workspaces/${workspace.id}/tasks`)).json();
 expect(tasks.find(t=>t.id===task.id)).toMatchObject({assignee:{type:'person',id:me.user.id},dueDate:'2030-12-31',requirementIds:[A,B]});
 result.checks.taskAssignmentDateAndLinks=true;
 await page.goto(`/w/${workspace.slug}/observatory/nist-csf-2.0?select=${encodeURIComponent(A)}`);
 const inspector=page.locator('aside.inspector');
 await inspector.getByLabel('Assign owner',{exact:true}).selectOption(`member:${me.user.id}`);
 await inspector.getByRole('button',{name:'Save owner',exact:true}).click();
 await expect(inspector.getByRole('button',{name:'Save owner',exact:true})).toBeDisabled();
 await inspector.getByLabel('Requirement due date').fill('2030-12-31');
 await inspector.getByRole('button',{name:'Save due date',exact:true}).click();
 await expect(inspector.getByRole('button',{name:'Save due date',exact:true})).toBeDisabled();
 const state=(await (await context.request.get(`/api/workspaces/${workspace.id}/requirements/${encodeURIComponent(A)}`)).json()).state;
 expect(state).toMatchObject({ownerUserId:me.user.id,dueDate:'2030-12-31'});
 result.checks.requirementAssignmentAndDate=true;
 await page.getByRole('link',{name:'My work',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Assigned to you',exact:true})).toBeVisible();
 await expect(page.getByRole('button',{name:`Open task ${task.title}`,exact:true})).toBeVisible();
 await page.getByRole('link',{name:/PR.AA-02/}).first().click();
 await expect(page).toHaveURL(new RegExp(`/w/${workspace.id}/observatory/nist-csf-2.0.*select=`));
 await expect(page.getByRole('complementary',{name:'PR.AA-02 details'})).toBeVisible();
 result.checks.myWorkAndRequirementNavigation=true;
 expect(errors).toEqual([]);
 result.checks.noPageErrors=true;
 result.ok=true;
} finally {
 if(workspace && csrf){
  const deleted=await context.request.delete(`/api/workspaces/${workspace.id}`,{headers:{'x-visua-csrf':csrf}});
  result.fixtureCleaned=deleted.ok();
  if(!deleted.ok())throw new Error('Deployment fixture cleanup failed');
 }
 await context.close();
 await browser.close();
}
console.log(JSON.stringify(result,null,2));
