"""Check failure boundaries with private tempfiles and mocked Docker commands."""
import contextlib,fcntl,io,json,os,pathlib,runpy,subprocess,sys,tempfile
from unittest.mock import patch
base=pathlib.Path.cwd();scripts=base/'deploy/reactor';checks=[]
def runscript(script,root):
 return subprocess.run([sys.executable,str(scripts/script),str(root)],capture_output=True,text=True)
with tempfile.TemporaryDirectory() as temp:
 root=pathlib.Path(temp)/'installation';root.mkdir(mode=0o700)
 shared=root/'shared';shared.mkdir(mode=0o755);shared.chmod(0o755)
 r=runscript('initialize.py',root);assert r.returncode!=0 and not list(shared.iterdir())
 checks.append('Permissive existing credential directory refused before writing secrets')
 shared.chmod(0o700);assert runscript('initialize.py',root).returncode==0
 before=(shared/'app.env').read_bytes();assert runscript('initialize.py',root).returncode!=0
 assert before==(shared/'app.env').read_bytes();checks.append('Initialization refuses credential replacement')
 (root/'compose.yaml').write_bytes((scripts/'compose.yaml').read_bytes());(root/'images.env').write_text('VISUA_IMAGE=sha256:test\nVISUA_POSTGRES_IMAGE=postgres@sha256:test\n')
 r=runscript('preflight.py',root);assert r.returncode==0 and not json.loads(r.stdout)['identity_configured']
 shared.chmod(0o755);r=runscript('preflight.py',root);assert r.returncode==1 and not json.loads(r.stdout)['checks']['private_directories'];shared.chmod(0o700)
 checks.append('Preflight separates private staging from identity readiness and rejects permissive directories')
 with (root/'backup.lock').open('w') as lock:
  fcntl.flock(lock,fcntl.LOCK_EX|fcntl.LOCK_NB)
  r=runscript('backup.py',root);assert r.returncode!=0 and 'already running' in (r.stderr+r.stdout)
 checks.append('Overlapping backup refused before Docker calls')
 def backup(fail):
  calls=[]; descriptors=[]; real_flock=fcntl.flock
  def capture_lock(fd,op):
   descriptors.append(fd);return real_flock(fd,op)
  def fake(args,**kwargs):
   calls.append(args)
   if 'ps' in args:return subprocess.CompletedProcess(args,0,b'container-id\n',b'')
   if fail and 'pg_dump' in args:return subprocess.CompletedProcess(args,1,b'',b'synthetic dump failure')
   out=kwargs['stdout']
   if out!=subprocess.PIPE:out.write(b'synthetic snapshot')
   return subprocess.CompletedProcess(args,0,b'',b'')
  with patch.object(sys,'argv',['backup.py',str(root)]),patch('subprocess.run',fake),patch('fcntl.flock',capture_lock),contextlib.redirect_stdout(io.StringIO()) as captured:
   if fail:
    try:runpy.run_path(str(scripts/'backup.py'),run_name='__main__')
    except RuntimeError:pass
    else:raise AssertionError('Expected failed dump')
   else:runpy.run_path(str(scripts/'backup.py'),run_name='__main__')
  for fd in descriptors:os.close(fd)
  assert 'up' in calls[-1] and '--wait' in calls[-1]
  if not fail:
   receipt=json.loads(captured.getvalue());p=pathlib.Path(receipt['backup']);manifest=json.loads((p/'manifest.json').read_text());assert set(manifest['files'])=={'database.dump','roles.sql','evidence.tar.gz','compose.yaml','images.env','shared/app.env','shared/init.sql','shared/postgres-admin-password'}
 backup(False);checks.append('Backup captures required archives/config and waits for writer restart')
 backup(True);checks.append('Failed dump still restarts writer and does not report completion')
print(json.dumps({'status':'passed','checks':checks,'scope':'Tempfiles and mocked Docker only; remote recovery reported separately.'},indent=2))
