import { chromium } from '@playwright/test';
import { writeFile } from 'node:fs/promises';
const browser=await chromium.launch({args:['--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
const context=await browser.newContext({baseURL:'http://localhost:8801',viewport:{width:1440,height:900}}); const page=await context.newPage();
try {
 const response=await page.request.post('/api/auth/dev/login',{data:{email:'morgan.lee@northwind-health.example'}});const {csrf}=await response.json();
 const headers={'x-visua-csrf':csrf};const created=await page.request.post('/api/workspaces',{headers,data:{name:'Keyboard baseline fixture',profile:{industry:'healthcare',size:'51-200'},frameworks:['nist-csf-2.0']}});const {workspace}=await created.json();
 const A='nist-csf-2.0:PR.AA-01';await page.request.post(`/api/workspaces/${workspace.id}/tasks`,{headers,data:{title:'Keyboard baseline task',kind:'procedure',requirementIds:[A]}});await page.goto(`/w/${workspace.slug}/observatory/nist-csf-2.0?select=${encodeURIComponent(A)}`);await page.getByRole('complementary',{name:'PR.AA-01 details'}).waitFor();
 const rows=await page.getByRole('treeitem').evaluateAll(items=>items.map(e=>({tabindex:e.getAttribute('tabindex'),rowTabindex:e.firstElementChild?.getAttribute('tabindex')})));
 await page.getByRole('button',{name:'Mark not applicable'}).click();await page.getByRole('dialog').waitFor();
 const initialFocus=await page.evaluate(()=>({tag:document.activeElement?.tagName,label:document.activeElement?.getAttribute('aria-label'),inside:!!document.activeElement?.closest('[role=dialog]')}));
 await page.getByRole('dialog').getByRole('button',{name:'Cancel',exact:true}).focus();await page.keyboard.press('Escape');await page.getByRole('dialog').waitFor({state:'hidden'});
 const afterEscape={url:page.url(),selected:await page.locator('aside.inspector').getAttribute('aria-label')};
 const tabs=await page.getByRole('tab').evaluateAll(items=>items.map(e=>({text:e.textContent,tabindex:e.getAttribute('tabindex'),controls:e.getAttribute('aria-controls')})));
 await page.goto(`/w/${workspace.slug}/plan`);await page.locator('.card').filter({hasText:'Keyboard baseline task'}).click();await page.getByRole('dialog').waitFor();
 const tag=page.locator('.code').first();const tagText=await tag.innerText();await tag.click();const afterTag=page.url();
 const result={workspace,baseline:'prior package production dist',rows,initialFocus,afterEscape,tabs,requirementTag:{text:tagText,url:afterTag}};
 await writeFile(new URL('./baseline-browser.json',import.meta.url),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
} finally{await browser.close();}
