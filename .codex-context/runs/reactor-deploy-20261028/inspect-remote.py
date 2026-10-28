from pathlib import Path
import json,subprocess,hashlib,urllib.request,urllib.error
root=Path('/opt/visua');out=root/'evidence'
def call(args,inp=None):return subprocess.check_output(args,input=inp)
manifest=(out/'runtime-source-manifest.json').read_bytes()
node="""const fs=require('fs'),crypto=require('crypto');let s='';process.stdin.on('data',c=>s+=c);process.stdin.on('end',()=>{const m=JSON.parse(s),bad=[];for(const [p,h] of Object.entries(m)){if(!fs.existsSync('/app/'+p)||crypto.createHash('sha256').update(fs.readFileSync('/app/'+p)).digest('hex')!==h)bad.push(p)}console.log(JSON.stringify({checked:Object.keys(m).length,mismatches:bad}));if(bad.length)process.exitCode=1})"""
source=json.loads(call(['docker','exec','-i','visua-reactor-app-1','node','-e',node],manifest))
containers=json.loads(call(['docker','inspect','visua-reactor-app-1','visua-reactor-postgres-1']))
safe=[]
for c in containers:
 safe.append({'name':c['Name'].lstrip('/'),'id':c['Id'],'image':c['Image'],'health':c['State']['Health']['Status'],'ports':c['NetworkSettings']['Ports'],'user':c['Config']['User'],'read_only':c['HostConfig']['ReadonlyRootfs'],'revision':c['Config']['Labels'].get('org.opencontainers.image.revision'),'restart':c['HostConfig']['RestartPolicy']['Name'],'mounts':[{'name':m.get('Name'),'destination':m['Destination'],'read_only':not m['RW']} for m in c['Mounts']]})
assert safe[0]['ports']['8787/tcp'][0]['HostIp']=='127.0.0.1'
assert not safe[1]['ports']['5432/tcp']
assert safe[0]['health']==safe[1]['health']=='healthy'
assert safe[0]['user']=='node' and safe[0]['read_only']
services=call(['docker','ps','--format','{{.Names}} {{.Image}} {{.Status}}']).decode()
previous=(out/'existing-services-before.txt').read_text().splitlines()
currentnames={line.split()[0] for line in services.splitlines()}
assert all(line.split()[0] in currentnames for line in previous)
role=call(['docker','exec','visua-reactor-postgres-1','psql','-U','visua_admin','-d','visua','-Atc',"SELECT rolsuper,rolcreatedb,rolcreaterole FROM pg_roles WHERE rolname='visua'"]).decode().strip()
assert role=='f|f|f'
result={'source':source,'containers':safe,'application_database_role':{'superuser':False,'create_database':False,'create_role':False},'existing_service_names_preserved':len(previous),'host_files':{name:hashlib.sha256((root/name).read_bytes()).hexdigest() for name in ['compose.yaml','initialize.py','preflight.py','backup.py']},'source_archive_sha256':hashlib.sha256((root/'releases/source-5450fc7.tar.gz').read_bytes()).hexdigest(),'identity':'Not configured','admission':'Private staged install only'}
(out/'runtime-verification.json').write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps({'source':source,'healthy_containers':len(safe),'existing_service_names_preserved':len(previous),'role_least_privilege':True,'listener':'127.0.0.1:8787','identity':'Pending operator details'}))
