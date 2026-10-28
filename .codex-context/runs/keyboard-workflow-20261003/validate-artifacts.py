from pathlib import Path
import hashlib,json
root=Path('/Users/artem/visua');run=root/'.codex-context/runs/keyboard-workflow-20261003';hash=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
plan=json.loads((run/'plan.json').read_text());nodes=[]
for n in plan['nodes']:
 e=json.loads((run/n['result']).read_text());valid=e['run_id']==plan['run_id'] and e['node_id']==n['id'] and e['input_sha256']==n['input_sha256']==hash(run/n['input']) and e['status']=='complete' and all(isinstance(e[k],str) for k in ['summary']) and all(isinstance(e[k],list) and all(isinstance(v,str) for v in e[k]) for k in ['evidence','limitations']);assert valid,n['id'];n.update(status='complete',accepted=True,result_sha256=hash(run/n['result']));nodes.append({'id':n['id'],'valid':valid})
reports=[]
for name in ['keyboard-review.json','keyboard-fix-review.json']:
 r=json.loads((run/name).read_text());assert set(r)=={'status','verdict','summary','coverage','findings','limitations'};assert r['status']=='complete' and r['coverage'];assert (r['verdict']=='pass' and not r['findings']) or (r['verdict']=='findings' and r['findings']);
 for f in r['findings']: assert set(f)=={'severity','location','mechanism','evidence','recommendation'} and f['severity'] in ['critical','high','medium','low'] and all(isinstance(v,str) and v for v in f.values())
 reports.append({'path':name,'status':r['status'],'verdict':r['verdict'],'findings':len(r['findings'])})
assert reports[-1]['verdict']=='pass'
source=json.loads((run/'full-check-source.json').read_text());mismatches={p:{'expected':h,'actual':hash(root/p)} for p,h in source['files'].items() if hash(root/p)!=h};assert not mismatches,mismatches
prior=json.loads((root/'.codex-context/runs/selection-roles-20261003/plan.json').read_text())['scope']['files']
allowed={'apps/web/src/pages/ObservatoryPage.tsx','apps/web/src/components/ui/index.tsx','apps/web/src/components/shell/Shell.tsx','apps/web/src/components/inspector/Inspector.tsx','apps/web/src/components/inspector/Threats.tsx','apps/web/src/pages/OrganizationPage.tsx','apps/web/src/pages/AgentsPage.tsx','apps/web/src/pages/RmfPage.tsx','apps/web/src/pages/ThreatsPage.tsx','apps/web/src/scene/Observatory.tsx','apps/web/src/styles/global.css','e2e/workspace-recovery.spec.ts'}
preserved=[p for p,h in prior.items() if p not in allowed and hash(root/p)==h];unexpected={p:{'expected':h,'actual':hash(root/p)} for p,h in prior.items() if p not in allowed and hash(root/p)!=h};assert not unexpected,unexpected
(run/'prior-scope-validation.json').write_text(json.dumps({'previous_scope_files':len(prior),'allowed_keyboard_changes':sorted(allowed),'preserved_unchanged_files':preserved,'unexpected_changes':unexpected},indent=2)+'\n')
(run/'artifact-validation.json').write_text(json.dumps({'nodes':nodes,'reviews':reports,'full_check_source_files':len(source['files']),'source_mismatches':mismatches,'preserved_prior_files':len(preserved)},indent=2)+'\n')
(run/'plan.json').write_text(json.dumps(plan,indent=2)+'\n')
print(json.dumps({'expected_nodes':len(nodes),'valid_nodes':len(nodes),'review_reports':reports,'preserved_prior_files':len(preserved),'source_mismatches':mismatches}))
