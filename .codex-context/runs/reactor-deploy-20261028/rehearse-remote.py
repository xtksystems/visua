"""Run only owned synthetic databases/volumes; never write the installed app data."""
from pathlib import Path
import datetime,hashlib,json,os,secrets,subprocess
os.umask(0o077)
root=Path('/opt/visua');run=root/'evidence';tag=secrets.token_hex(5)
work=run/('recovery-'+tag);work.mkdir(mode=0o700)
images=dict(line.split('=',1) for line in (root/'images.env').read_text().splitlines())
values=dict(line.split('=',1) for line in (root/'shared/app.env').read_text().splitlines() if line and not line.startswith('#'))
image=images['VISUA_IMAGE'];pg='visua-reactor-postgres-1'
source='visua_probe_original_'+tag;target='visua_probe_restored_'+tag
volumes=['visua_probe_original_'+tag,'visua_probe_restored_'+tag]
created_databases=[];created_volumes=[];result={'scope':'Synthetic logical databases in installed PostgreSQL cluster; separate artifact volumes. No real IdP/host failover tested.'}
def call(args,inp=None,out=None):
 r=subprocess.run(args,input=inp,stdout=out or subprocess.PIPE,stderr=subprocess.PIPE)
 if r.returncode:raise RuntimeError('Fixture command failed: '+args[0]+'; '+r.stderr.decode(errors='replace')[-1500:])
 return r.stdout
try:
 for db in [source,target]:
  call(['docker','exec',pg,'createdb','-U','visua_admin','-O','visua',db]);created_databases.append(db)
 for volume in volumes:
  call(['docker','volume','create','--label','visua.recovery.fixture='+tag,volume]);created_volumes.append(volume)
 def fixture(db,volume,mode,pin=None):
  env=work/(mode+'.env');configured=values.copy();configured['VISUA_DATABASE_URL']=values['VISUA_DATABASE_URL'].rsplit('/',1)[0]+'/'+db
  env.write_text(''.join(k+'='+v+'\n' for k,v in configured.items()))
  args=['docker','run','--rm','--network','visua-reactor_database','--read-only','--cap-drop','ALL','--security-opt','no-new-privileges:true','--env-file',str(env),'--mount','type=volume,src='+volume+',dst=/app/data','--mount','type=bind,src='+str(run/'recovery-fixture.mjs')+',dst=/app/reactor-recovery-fixture.mjs,readonly','--entrypoint','node',image,'--disable-warning=ExperimentalWarning','/app/reactor-recovery-fixture.mjs',mode]
  if pin:args.append(pin)
  return json.loads(call(args).decode().splitlines()[-1])
 result['created']=fixture(source,volumes[0],'create')
 with (work/'database.dump').open('wb') as f:call(['docker','exec',pg,'pg_dump','-U','visua_admin','-Fc',source],out=f)
 with (work/'evidence.tar.gz').open('wb') as f:call(['docker','run','--rm','--network','none','--mount','type=volume,src='+volumes[0]+',dst=/app/data','--entrypoint','tar',image,'-C','/app/data','-czf','-','.'],out=f)
 call(['docker','exec','-i',pg,'pg_restore','-U','visua_admin','--no-owner','--role=visua','--exit-on-error','-d',target],inp=(work/'database.dump').read_bytes())
 call(['docker','run','-i','--rm','--network','none','--mount','type=volume,src='+volumes[1]+',dst=/app/data','--entrypoint','tar',image,'-C','/app/data','-xzf','-'],inp=(work/'evidence.tar.gz').read_bytes())
 result['restored']=fixture(target,volumes[1],'verify',result['created']['receiptSha256'])
 result['status']='passed'
finally:
 for db in created_databases:call(['docker','exec',pg,'dropdb','-U','visua_admin',db])
 for volume in created_volumes:call(['docker','volume','rm',volume])
 for env in work.glob('*.env'):env.unlink()
 result['cleanup_complete']=True
 result['completed_at']=datetime.datetime.now(datetime.timezone.utc).isoformat()
 (run/'recovery-result.json').write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps(result))
