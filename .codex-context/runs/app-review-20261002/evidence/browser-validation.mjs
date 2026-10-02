import { chromium } from '@playwright/test';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
const OUT = path.dirname(new URL(import.meta.url).pathname);
const BASE = 'http://localhost:8787';
const report = { startedAt: new Date().toISOString(), baseURL: BASE, sourceHead: '1dc5ed1', deploymentRevision: 'not independently established', renderer: 'Chromium SwiftShader', checks: [], discoveries: {}, limitations: [], mutationsBlocked: [] };
const save = () => writeFile(path.join(OUT, 'browser-report.json'), JSON.stringify(report, null, 2));
const browser = await chromium.launch({args:['--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
try {
 for (const [label, viewport] of [['desktop',{width:1440,height:900}],['phone',{width:390,height:844}]]) {
  const context = await browser.newContext({viewport, deviceScaleFactor:1});
  await context.route('**/api/**', async route => {
   const req = route.request();
   if (!['GET','HEAD','OPTIONS'].includes(req.method()) && !req.url().includes('/api/auth/dev/login')) {
    report.mutationsBlocked.push({method:req.method(), url:req.url()});
    return route.abort('blockedbyclient');
   }
   return route.continue();
  });
  const page = await context.newPage();
  let current;
  page.on('pageerror', e => current?.pageErrors.push(e.message));
  page.on('console', m => {if(m.type()==='error') current?.consoleErrors.push(m.text());});
  page.on('requestfailed', req => {if(!req.failure()?.errorText.includes('ERR_ABORTED')) current?.requestErrors.push({url:req.url(),method:req.method(),error:req.failure()?.errorText});});
  page.on('response', res => {if(res.status()>=400) current?.httpErrors.push({url:res.url(),status:res.status()});});
  async function visit(route, shot=false, observation='') {
   current={viewport:label, route, observation, pageErrors:[],consoleErrors:[],requestErrors:[],httpErrors:[]};
   try {
    const res=await page.goto(BASE+route,{waitUntil:'domcontentloaded',timeout:20000});
    current.documentStatus=res?.status();
    await page.waitForFunction(() => document.body.innerText.trim().length > 40 && !/^(Loading Visua…|Loading…)$/.test(document.body.innerText.trim()), {timeout:10000}).catch(e=>{current.settleError=e.message});
    await page.waitForTimeout(route.includes('observatory') ? 1800 : 450);
    current.url=page.url();
    Object.assign(current,await page.evaluate(()=>({title:document.title,headings:[...document.querySelectorAll('h1,h2')].map(e=>({tag:e.tagName,text:e.textContent.trim()})),bodyExcerpt:document.body.innerText.slice(0,1800),width:innerWidth,documentScrollWidth:document.documentElement.scrollWidth,bodyScrollWidth:document.body.scrollWidth,horizontalOverflow:Math.max(document.documentElement.scrollWidth,document.body.scrollWidth)-innerWidth,canvasCount:document.querySelectorAll('canvas').length,mainCount:document.querySelectorAll('main').length,scrollContainers:[...document.querySelectorAll('*')].filter(e=>e.clientWidth>0 && e.scrollWidth>e.clientWidth+2 && /auto|scroll/.test(getComputedStyle(e).overflowX)).slice(0,12).map(e=>({tag:e.tagName,cls:e.className,clientWidth:e.clientWidth,scrollWidth:e.scrollWidth})),links:[...document.querySelectorAll('a[href]')].map(e=>({text:e.textContent.trim(),href:e.getAttribute('href')})).slice(0,70)})));
    if(shot){const file=`browser-${label}-${shot===true?route.split('/').filter(Boolean).join('-'):shot}.png`;await page.screenshot({path:path.join(OUT,file),timeout:12000});current.screenshot=file;}
   } catch(e){current.failure=e.message;}
   report.checks.push(current); await save(); console.log(JSON.stringify({viewport:label,route,headings:current.headings?.filter(h=>h.tag==='H1'),overflow:current.horizontalOverflow,pageErrors:current.pageErrors.length,httpErrors:current.httpErrors,failure:current.failure}));
  }
  await visit('/login',true);
  await page.getByRole('button',{name:/Morgan Lee/}).click();
  await page.waitForURL('**/w/**',{timeout:20000});
  const workspaces=await (await page.request.get(BASE+'/api/workspaces')).json();
  const ws=workspaces.find(x=>x.workspace.slug==='northwind-health')?.workspace ?? workspaces[0]?.workspace;
  if(!ws)throw new Error('No demo workspace found');
  report.discoveries.workspace={id:ws.id,slug:ws.slug,name:ws.name};
  const runs=await (await page.request.get(`${BASE}/api/workspaces/${ws.slug}/runs`)).json();
  report.discoveries.existingRunIds=Array.isArray(runs)?runs.map(x=>x.run?.id??x.id).filter(Boolean):[];
  const W=`/w/${ws.slug}`;
  const routes=['/', '/onboarding',W,W+'/observatory',W+'/observatory/nist-csf-2.0',W+'/observatory/nist-csf-2.0?select=nist-csf-2.0%3APR.AA-01',W+'/plan',W+'/evidence',W+'/agents',...(report.discoveries.existingRunIds.length?[W+'/agents/'+report.discoveries.existingRunIds[0]]:[]),W+'/policies',W+'/profile',W+'/crosswalk',W+'/soc2',W+'/rmf',W+'/ai',W+'/laws',W+'/threats',W+'/threats/mitre-atlas',W+'/reports',W+'/settings',W+'/organization'];
  if(!report.discoveries.existingRunIds.length && !report.limitations.includes('No existing agent run was available for the /agents/:runId route.'))report.limitations.push('No existing agent run was available for the /agents/:runId route.');
  const photos= label==='desktop'?new Map([[W,'home'],[W+'/observatory/nist-csf-2.0?select=nist-csf-2.0%3APR.AA-01','observatory-inspector'],[W+'/plan','plan'],[W+'/evidence','evidence'],[W+'/agents','agents'],[W+'/settings','settings']]):new Map([[W,'home'],[W+'/onboarding','onboarding'],[W+'/plan','plan'],[W+'/profile','profile'],[W+'/threats','threats']]);
  for(const route of routes)await visit(route,photos.get(route)||false);
  await context.close();
  const publicContext=await browser.newContext({viewport,deviceScaleFactor:1});
  const publicPage=await publicContext.newPage();
  const item={viewport:label,route:'/trust/'+ws.slug,publicUnauthenticated:true,pageErrors:[],requestErrors:[],httpErrors:[]};
  publicPage.on('pageerror',e=>item.pageErrors.push(e.message));
  publicPage.on('response',res=>{if(res.status()>=400)item.httpErrors.push({url:res.url(),status:res.status()});});
  const res=await publicPage.goto(BASE+item.route,{waitUntil:'domcontentloaded'});item.documentStatus=res?.status();
  await publicPage.waitForFunction(()=>document.querySelector('h1') || document.body.innerText.includes('not public'),{timeout:10000});await publicPage.waitForTimeout(500);
  Object.assign(item,await publicPage.evaluate(()=>({url:location.href,headings:[...document.querySelectorAll('h1,h2')].map(e=>({tag:e.tagName,text:e.textContent.trim()})),bodyExcerpt:document.body.innerText.slice(0,1600),horizontalOverflow:Math.max(document.documentElement.scrollWidth,document.body.scrollWidth)-innerWidth})));
  item.screenshot=`browser-${label}-trust.png`;await publicPage.screenshot({path:path.join(OUT,item.screenshot),timeout:12000});report.checks.push(item);await save();await publicContext.close();
 }
} catch(e){report.fatalError=e.stack;console.error(e.stack);process.exitCode=1;} finally {report.finishedAt=new Date().toISOString();await save();await browser.close();}
