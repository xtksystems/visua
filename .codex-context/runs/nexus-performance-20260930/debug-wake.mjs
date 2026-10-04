import { chromium } from '@playwright/test';
const b=await chromium.launch({args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const c=await b.newContext({baseURL:'http://localhost:8815', viewport:{width:1440,height:900},reducedMotion:'no-preference'});
await c.addInitScript(()=>{
 window.framesDrawn=0;
 const clear=WebGL2RenderingContext.prototype.clear;
 WebGL2RenderingContext.prototype.clear=function(m){window.framesDrawn++;return clear.call(this,m)};
 class Events extends EventTarget {constructor(){super();window.events=this;window.registrations=0;}addEventListener(...a){window.registrations++;super.addEventListener(...a)}close(){}}
 window.EventSource=Events;
});
await c.request.post('/api/auth/dev/login',{data:{email:'morgan.lee@northwind-health.example'}});
const p=await c.newPage();p.on('pageerror',e=>console.log('ERROR',e.message));
await p.goto('/w/northwind-health/observatory/nist-csf-2.0');
await p.locator('.hud-stats').waitFor();await p.getByRole('button',{name:'Terrain',exact:true}).click();await p.waitForTimeout(7000);
console.log('before',await p.evaluate(()=>({frames:window.framesDrawn,registered:window.registrations,reduced:matchMedia('(prefers-reduced-motion: reduce)').matches})));
await p.evaluate(()=>{window.events.dispatchEvent(new MessageEvent('visua',{data:JSON.stringify({type:'agent.run.updated',data:{id:'fixture',agent:'copilot',status:'running'}})}));window.events.dispatchEvent(new MessageEvent('visua',{data:JSON.stringify({type:'agent.step',data:{runId:'fixture',agent:'copilot',step:{id:'fixture-step',at:new Date().toISOString(),type:'thought',title:'Checking',nodeIds:['nist-csf-2.0:PR.AA-01']}}})}));});
for(let i=0;i<3;i++){await p.waitForTimeout(1000);console.log('after',await p.evaluate(()=>({frames:window.framesDrawn,txt:document.querySelector('header')?.textContent})));}
await b.close();
