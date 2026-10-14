import assert from "node:assert/strict";
import { overlaySummary } from "/Users/artem/visua/apps/server/src/services/overlays.ts";
import { soc2Description } from "/Users/artem/visua/apps/server/src/services/soc2.ts";
import { FrameworkIndex, buildSnapshot, scoreFramework } from "/Users/artem/visua/packages/core/src/index.ts";

const fid="synthetic-csf", nid=fid+":A";
const node={id:nid,frameworkId:fid,code:"A",kind:"outcome",parentId:null,depth:0,order:0,title:"Synthetic",text:"Synthetic fixture",assessable:true,citation:{documentId:"synthetic"}};
const index=new FrameworkIndex({framework:{id:fid,family:"csf"},nodes:[node]});
const state={nodeId:nid,workspaceId:"fixture",frameworkId:fid,current:0,target:0,priority:"medium",applicable:true};
const score=scoreFramework(index,buildSnapshot({states:[state],evidence:[],tasks:[],checks:[]}));
const overlay={id:"synthetic-overlay",frameworkId:fid,kind:"community-profile",lenses:[{id:"secure"}],priorityLevels:[{level:1,label:"High"}],entries:[{nodeId:nid,lenses:{secure:{priority:1}}}]};
const svc={registry:{overlay:()=>overlay,node:()=>node},frameworkSettings:()=>({enabled:true}),score:async()=>score,store:{states:{map:async()=>new Map([[nid,state]])}}};
const result=await overlaySummary(svc,{id:"fixture"},overlay.id);
assert.equal(score.overall.readiness,0);
assert.equal(result.high.readiness,1);
console.log(JSON.stringify({case:"applicable-zero-target",current:0,target:0,coreReadiness:score.overall.readiness,overlayHighReadiness:result.high.readiness,overlayPriorityReadiness:result.lenses[0].byPriority[0].readiness}));

const settings={categories:["security"],reportType:"type2",observationStart:"2026-09-01",observationEnd:"2026-09-30"};
const event={id:"synthetic-change",at:"2026-09-30T12:00:00.000Z",actor:"user",entity:"policy",summary:"Synthetic policy approved"};
const empty={list:async()=>[]};
const socSvc={frameworkSettings:()=>({soc2:settings}),registry:{framework:()=>({assessable:[]}),documents:new Map(),descriptionCriteria:[{id:"DC9",title:"Synthetic DC9",licensed:false}]},store:{states:empty,tasks:empty,evidence:empty,policies:empty,connectors:empty,risks:empty,activity:{list:async()=>[event]}}};
const missing=await soc2Description(socSvc,{id:"fixture"});
assert.equal(missing.items[0].derived.facts[0],"No framework, policy or monitoring changes recorded during the period.");
settings.observationEnd="2026-10-01";
const included=await soc2Description(socSvc,{id:"fixture"});
assert.ok(included.items[0].derived.facts[0].includes("Synthetic policy approved"));
console.log(JSON.stringify({case:"soc2-observation-final-day",eventAt:event.at,selectedEnd:"2026-09-30",finalDayFacts:missing.items[0].derived.facts,controlEnd:"2026-10-01",controlFacts:included.items[0].derived.facts}));
console.log("PASS: both predicted defects reproduced with synthetic in-memory service fixtures; no external calls or persistent storage.");
