#!/usr/bin/env python3
"""Stop this stack's writer and retain PostgreSQL, artifacts, and private config."""
from datetime import datetime, timezone
import hashlib
import fcntl
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import uuid

os.umask(0o077)
root = Path(sys.argv[1] if len(sys.argv) == 2 else "/opt/visua").resolve()
# Hold the installation lock through the final restart. An overlapping snapshot
# must never let another invocation resume writers during capture.
lock_fd = os.open(root / "backup.lock", os.O_CREAT | os.O_RDWR | os.O_NOFOLLOW, 0o600)
try:
    fcntl.flock(lock_fd, fcntl.LOCK_EX | fcntl.LOCK_NB)
except BlockingIOError:
    raise SystemExit("Another backup is already running for this installation.")
compose = ["docker", "compose", "--env-file", str(root / "images.env"),
           "-f", str(root / "compose.yaml")]


def run(args, output=None):
    result = subprocess.run(args, cwd=root, stdout=output or subprocess.PIPE,
                            stderr=subprocess.PIPE, check=False)
    if result.returncode:
        raise RuntimeError("Backup command failed; exit " + str(result.returncode))
    return result.stdout


stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
destination = root / "backups" / (stamp + "-" + uuid.uuid4().hex[:8])
destination.mkdir(mode=0o700, parents=True, exist_ok=False)
running = bool(run(compose + ["ps", "--status", "running", "-q", "app"]).strip())
if not running:
    raise SystemExit("Writer must be running before this managed backup; inspect its state.")
try:
    run(compose + ["stop", "app"])
    # Only this Compose project may write these volumes. Do not run another app
    # or external database/artifact writer during the snapshot.
    with (destination / "database.dump").open("xb") as stream:
        run(compose + ["exec", "-T", "postgres", "pg_dump", "-U", "visua_admin",
                       "--format=custom", "visua"], stream)
    with (destination / "roles.sql").open("xb") as stream:
        run(compose + ["exec", "-T", "postgres", "pg_dumpall", "-U", "visua_admin",
                       "--globals-only"], stream)
    with (destination / "evidence.tar.gz").open("xb") as stream:
        run(compose + ["run", "--rm", "--no-deps", "-T",
                       "--entrypoint", "tar", "app", "-C", "/app/data", "-czf", "-", "."], stream)
    for name in ["compose.yaml", "images.env", "shared/app.env",
                 "shared/init.sql", "shared/postgres-admin-password"]:
        target = destination / name
        target.parent.mkdir(mode=0o700, parents=True, exist_ok=True)
        shutil.copyfile(root / name, target)
        target.chmod(0o600)
    files = {}
    for path in sorted(destination.rglob("*")):
        if path.is_file():
            with path.open("rb") as stream:
                digest = hashlib.file_digest(stream, "sha256").hexdigest()
            files[str(path.relative_to(destination))] = {"sha256": digest, "bytes": path.stat().st_size}
    manifest = {"created_at": datetime.now(timezone.utc).isoformat(), "files": files,
                "consistency": "Compose app stopped throughout SQL and artifact capture; sole-writer assumption.",
                "sensitivity": "Contains database, sessions, artifacts and credentials. Store encrypted off-host.",
                "verification": "Archive hashes only; drill restore and application integrity separately."}
    (destination / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")
finally:
    run(compose + ["up", "-d", "--no-deps", "--wait", "--wait-timeout", "120", "app"])
print(json.dumps({"status": "complete", "backup": str(destination),
                  "manifest_sha256": hashlib.sha256((destination / "manifest.json").read_bytes()).hexdigest(),
                  "app_restarted": True, "off_host_copy": "operator required"}))
