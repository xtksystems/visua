from pathlib import Path
import hashlib,json,secrets,subprocess
root=Path('/opt/visua');receipt=json.loads((root/'evidence/backup-result.json').read_text());backup=Path(receipt['backup'])
manifest=json.loads((backup/'manifest.json').read_text())
assert hashlib.sha256((backup/'manifest.json').read_bytes()).hexdigest()==receipt['manifest_sha256']
for name,item in manifest['files'].items():
 with (backup/name).open('rb') as f:assert hashlib.file_digest(f,'sha256').hexdigest()==item['sha256']
tag=secrets.token_hex(5);db='visua_probe_backup_'+tag;volume='visua_probe_backup_'+tag;pg='visua-reactor-postgres-1'
def run(args,data=None):return subprocess.check_output(args,input=data,stderr=subprocess.PIPE)
image=dict(line.split('=',1) for line in (root/'images.env').read_text().splitlines())['VISUA_IMAGE']
created_db=False;created_volume=False
try:
 run(['docker','exec',pg,'createdb','-U','visua_admin','-O','visua',db]);created_db=True
 run(['docker','exec','-i',pg,'pg_restore','-U','visua_admin','--no-owner','--role=visua','--exit-on-error','-d',db],(backup/'database.dump').read_bytes())
 tables=run(['docker','exec',pg,'psql','-U','visua_admin','-d','visua','-Atc',"SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename"]).decode().splitlines()
 query=' UNION ALL '.join('SELECT \''+t+'\',count(*) FROM "'+t+'"' for t in tables)
 original=run(['docker','exec',pg,'psql','-U','visua_admin','-d','visua','-Atc',query])
 restored=run(['docker','exec',pg,'psql','-U','visua_admin','-d',db,'-Atc',query]);assert original==restored
 run(['docker','volume','create','--label','visua.recovery.fixture='+tag,volume]);created_volume=True
 run(['docker','run','-i','--rm','--network','none','--mount','type=volume,src='+volume+',dst=/app/data','--entrypoint','tar',image,'-C','/app/data','-xzf','-'],(backup/'evidence.tar.gz').read_bytes())
 r={'status':'passed','manifest_pin':True,'archive_checksums':True,'fresh_database_restore':True,'tables_with_equal_row_counts':len(tables),'fresh_artifact_volume_restore':True,'scope':'Current empty staged install. Binary/review/audit restore is separately exercised by synthetic recovery fixture.','backup':str(backup)}
finally:
 if created_db:run(['docker','exec',pg,'dropdb','-U','visua_admin',db])
 if created_volume:run(['docker','volume','rm',volume])
r['cleanup_complete']=True
(root/'evidence/backup-verification.json').write_text(json.dumps(r,indent=2)+'\n');print(json.dumps(r))
