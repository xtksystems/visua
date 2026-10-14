import { chromium } from '@playwright/test';
const base='http://127.0.0.1:8841',out='.codex-context/runs/predeploy-review-20261014/product';
const browser=await chromium.launch({args:['--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
const context=await browser.newContext({baseURL:base,viewport:{width:390,height:844}}),page=await context.newPage();
try {
 await context.request.post('/api/auth/dev/login',{data:{email:'morgan.lee@northwind-health.example'}});
 const workspaces=await(await context.request.get('/api/workspaces')).json(),ws=workspaces[0].workspace;
 const checks=await(await context.request.get(`/api/workspaces/${ws.id}/checks`)).json();
 const connectors=await(await context.request.get(`/api/workspaces/${ws.id}/connectors`)).json();
 console.log('existing-monitoring-counts',JSON.stringify({connectors:connectors.length,checks:checks.length,failures:checks.filter(c=>c.outcome==='fail').length}));
 await page.goto(`/w/${ws.slug}`);await page.getByRole('button',{name:'Open menu',exact:true}).waitFor();
 await page.getByRole('button',{name:'Open menu',exact:true}).focus();await page.keyboard.press('Enter');
 const tabs=[];
 for(let i=0;i<12;i++){await page.keyboard.press('Tab');tabs.push(await page.evaluate(()=>{const e=document.activeElement,b=e.getBoundingClientRect(),top=document.elementFromPoint(b.x+b.width/2,b.y+b.height/2);return {tag:e.tagName,name:e.getAttribute('aria-label')||e.textContent.slice(0,80),inNav:!!e.closest('#primary-nav'),inMain:!!e.closest('#main'),coveredBy:top?.className,visible:top===e||e.contains(top)}}));if(tabs.at(-1).inMain)break;}
 console.log('mobile-drawer-tabs',JSON.stringify(tabs));
 await page.screenshot({path:`${out}/mobile-nav-focus.png`});await page.keyboard.press('Escape');
 const results=[];const errors=[];page.on('pageerror',e=>errors.push(e.message));
 for(const route of ['','evidence?view=renewal','plan','observatory','crosswalk?view=matrix','profile','reports','agents']){
  await page.goto(`/w/${ws.slug}/${route}`);await page.waitForTimeout(1200);
  results.push({route,overflow:await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth),loading:/^Loading/.test((await page.locator('#main').innerText()).trim()),pageErrors:errors.length});
 }
 console.log('mobile-smoke',JSON.stringify(results));console.log('pageErrors',JSON.stringify(errors));
 await page.route('**/checks',route=>route.fulfill({status:503,json:{error:'Review injected monitoring read failure'}}));
 await page.goto(`/w/${ws.slug}/evidence`);await page.getByRole('heading',{name:'Evidence & monitoring'}).waitFor();await page.waitForTimeout(2200);
 console.log('checks-failure-ui',JSON.stringify({firstRunMessages:await page.getByText('Run the connector to collect its first results.',{exact:true}).count(),alerts:await page.getByRole('alert').allTextContents(),retryButtons:await page.getByRole('button',{name:/Retry/}).count(),errorVisible:await page.getByText('Review injected monitoring read failure',{exact:false}).count(),metric:await page.locator('.metric').allTextContents()}));
 await page.screenshot({path:`${out}/monitoring-failure.png`});
} catch(e){console.error(e.stack);process.exitCode=1;}finally{await browser.close();}
