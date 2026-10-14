import { chromium } from '@playwright/test';
const base = 'http://127.0.0.1:8841';
const out = '.codex-context/runs/predeploy-review-20261014/product';
const browser = await chromium.launch({args:['--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
const context = await browser.newContext({baseURL:base,viewport:{width:1440,height:900}});
const page = await context.newPage();
const errors=[];page.on('pageerror',e=>errors.push(e.message));
let ws;
try {
 const login=await context.request.post('/api/auth/dev/login',{data:{email:'morgan.lee@northwind-health.example'}}); const me=await login.json();
 const created=await context.request.post('/api/workspaces',{headers:{'x-visua-csrf':me.csrf},data:{name:'Product review isolated',frameworks:['nist-csf-2.0','nist-sp-800-53-r5'],planInitialTasks:false,profile:{industry:'saas',size:'11-50'}}});
 ws=(await created.json()).workspace; console.log('fixture',JSON.stringify({login:login.status(),created:created.status(),workspaceId:ws.id}));
 const calls=[];page.on('request',r=>{if(r.method()==='GET'&&r.url().includes('/crosswalk')) calls.push(new URL(r.url()).pathname)});
 await page.goto(`/w/${ws.slug}/crosswalk?group=nist-csf-2.0%3APR.AA`);
 await page.getByRole('complementary',{name:'Crosswalk details'}).getByText(/units.*ready/).waitFor();
 await page.waitForTimeout(1500);
 const detail=page.getByRole('complementary',{name:'Crosswalk details'});
 const before=(await detail.innerText()).split('\n').filter(s=>s.includes('units'));
 calls.length=0;
 const patch=await context.request.patch(`/api/workspaces/${ws.id}/requirements/${encodeURIComponent('nist-csf-2.0:PR.AA-01')}`,{headers:{'x-visua-csrf':me.csrf},data:{current:4}});
 await page.waitForTimeout(2000);
 const after=(await detail.innerText()).split('\n').filter(s=>s.includes('units'));
 const fresh=await (await context.request.get(`/api/workspaces/${ws.id}/crosswalk`)).json();
 const group=fresh.frameworks.flatMap(f=>f.groups).find(g=>g.id==='nist-csf-2.0:PR.AA');
 console.log('crosswalk-sse',JSON.stringify({patch:patch.status(),before,after,browserReadsAfterMutation:calls,freshGroupReadiness:group.readiness}));
 await page.screenshot({path:`${out}/crosswalk-stale.png`});
 await page.setViewportSize({width:390,height:844});
 await page.goto(`/w/${ws.slug}`);await page.getByRole('heading',{level:1,name:'Product review isolated'}).waitFor();
 const menu=page.getByRole('button',{name:'Open menu',exact:true});await menu.focus();await page.keyboard.press('Enter');await page.keyboard.press('Tab');
 console.log('mobile-menu-first-tab',JSON.stringify(await page.evaluate(()=>({text:document.activeElement?.getAttribute('aria-label')||document.activeElement?.textContent,tag:document.activeElement?.tagName,inNav:!!document.activeElement?.closest('#primary-nav'),expanded:document.querySelector('.topbar__menu')?.getAttribute('aria-expanded')}))));
 await page.keyboard.press('Escape');
 const results=[];
 for(const route of ['','evidence?view=renewal','plan','observatory','crosswalk?view=matrix','profile','reports','agents']) {
  await page.goto(`/w/${ws.slug}/${route}`);await page.waitForTimeout(900);
  results.push({route,overflow:await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth),loading:await page.locator('main').innerText().then(s=>/^Loading/.test(s.trim())),errors:errors.length});
 }
 console.log('mobile-smoke',JSON.stringify(results));
 console.log('pageErrors',JSON.stringify(errors));
} catch(e) { console.error(e.stack);process.exitCode=1; }
finally { if(ws){const me=await (await context.request.get('/api/auth/me')).json();const deleted=await context.request.delete(`/api/workspaces/${ws.id}`,{headers:{'x-visua-csrf':me.csrf}});console.log('cleanup',deleted.status());}await browser.close();}
