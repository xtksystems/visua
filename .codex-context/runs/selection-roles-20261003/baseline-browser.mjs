import { chromium } from '@playwright/test';
import { writeFile } from 'node:fs/promises';
const browser = await chromium.launch({args:['--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
const context = await browser.newContext({baseURL:'http://localhost:8801',viewport:{width:1440,height:900}});
const page = await context.newPage();
const patches = [];
page.on('request', r => { if(r.method()==='PATCH' && r.url().includes('/requirements/')) patches.push({url:new URL(r.url()).pathname,body:r.postDataJSON()}); });
try {
 const login = await page.request.post('/api/auth/dev/login',{data:{email:'morgan.lee@northwind-health.example'}});
 const {csrf} = await login.json();
 const headers = {'x-visua-csrf':csrf};
 const created = await page.request.post('/api/workspaces',{headers,data:{name:'Selection baseline fixture',profile:{industry:'saas',size:'11-50',dataTypes:[],drivers:[],environments:['cloud'],maturityTier:1,guidance:'guided',securityTeamSize:1},frameworks:['nist-csf-2.0']}});
 const {workspace} = await created.json();
 const A='nist-csf-2.0:PR.AA-01', B='nist-csf-2.0:PR.AA-02';
 for (const [id,owner] of [[A,'Owner A'],[B,'Owner B']]) await page.request.patch(`/api/workspaces/${workspace.id}/requirements/${encodeURIComponent(id)}`,{headers,data:{owner}});
 await page.goto(`/w/${workspace.slug}/observatory/nist-csf-2.0?select=${encodeURIComponent(A)}`);
 await page.getByRole('complementary',{name:'PR.AA-01 details'}).waitFor();
 await page.getByLabel('Filter outline').fill('PR.AA-0');
 const values = [await page.getByLabel('Owner',{exact:true}).inputValue()];
 for(const code of ['PR.AA-02','PR.AA-01','PR.AA-02']) {
   await page.getByRole('tree',{name:'Framework outline'}).getByText(code,{exact:true}).click();
   await page.getByRole('complementary',{name:`${code} details`}).waitFor();
   values.push(await page.getByLabel('Owner',{exact:true}).inputValue());
 }
 await page.getByRole('tree').getByText('PR.AA-01',{exact:true}).click();
 await page.getByRole('complementary',{name:'PR.AA-01 details'}).waitFor();
 await page.getByLabel('Owner',{exact:true}).focus();
 await page.getByRole('complementary',{name:'PR.AA-01 details'}).getByText('PR.AA-01',{exact:true}).click();
 await page.waitForTimeout(300);
 await page.request.post('/api/auth/dev/login',{data:{email:'jordan.park@northwind-health.example'}});
 await page.goto('/w/northwind-health/plan');
 const plan={generate:await page.getByRole('button',{name:'Generate plan',exact:true}).isEnabled(),agent:await page.getByRole('button',{name:'Plan with agent',exact:true}).isEnabled()};
 await page.goto('/w/northwind-health/evidence');
 const evidence={addConnector:await page.getByRole('button',{name:'Add connector',exact:true}).isEnabled(),collect:await page.getByRole('button',{name:'Collect with agent',exact:true}).isEnabled(),run:await page.getByRole('button',{name:'Run',exact:true}).first().isEnabled()};
 const result={baseline:'existing production build before selection/role edits',workspace:{id:workspace.id,slug:workspace.slug},cachedOwnerSequence:values,blurPatches:patches,viewerControls:{plan,evidence}};
 await writeFile(new URL('./baseline-browser.json',import.meta.url),JSON.stringify(result,null,2)+'\n');
 console.log(JSON.stringify(result));
} finally { await browser.close(); }
