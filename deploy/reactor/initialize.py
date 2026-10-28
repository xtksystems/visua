#!/usr/bin/env python3
"""Create private first-install configuration without printing secret values."""
import os
from pathlib import Path
import secrets
import stat
import sys

root = Path(sys.argv[1] if len(sys.argv) == 2 else "/opt/visua").resolve()
os.umask(0o077)
root.mkdir(mode=0o700, parents=True, exist_ok=True)
shared = root / "shared"
if shared.is_symlink():
    raise SystemExit("Configuration directory must not be a symlink.")
shared.mkdir(mode=0o700, exist_ok=True)
for directory in [root, shared]:
    info = directory.stat()
    if info.st_uid != os.geteuid() or stat.S_IMODE(info.st_mode) != 0o700:
        raise SystemExit("Install and configuration directories must be owned by this user with mode 0700.")
paths = [shared / name for name in ["app.env", "init.sql", "postgres-admin-password"]]
if any(path.exists() for path in paths):
    raise SystemExit("Configuration already exists; refusing to replace credentials.")
app_password = secrets.token_hex(32)
admin_password = secrets.token_hex(32)
server_secret = secrets.token_hex(48)
values = {
    "NODE_ENV": "production",
    "VISUA_AUTH_MODE": "oidc",
    "VISUA_SEED": "0",
    "VISUA_HOST": "0.0.0.0",
    "VISUA_PORT": "8787",
    "VISUA_PUBLIC_URL": "http://127.0.0.1:8787",
    "VISUA_SECRET": server_secret,
    "VISUA_DATABASE_URL": f"postgres://visua:{app_password}@postgres:5432/visua",
    "VISUA_BLOB_STORE": "local",
    "VISUA_BLOB_DIR": "/app/data/blobs",
    "VISUA_AGENT_MODE": "offline",
    "VISUA_REPO_SCAN_ROOTS": "[]",
    "VISUA_BOOTSTRAP_ORG_NAME": "XTK Systems",
}
with paths[0].open("x") as stream:
    stream.write("# Private staged install; add exact HTTPS origin and Google OIDC before sign-in.\n")
    stream.write("".join(f"{key}={value}\n" for key, value in values.items()))
with paths[1].open("x") as stream:
    stream.write(f"CREATE USER visua WITH PASSWORD '{app_password}';\n")
    stream.write("CREATE DATABASE visua OWNER visua;\n")
with paths[2].open("x") as stream:
    stream.write(admin_password + "\n")
# The PostgreSQL entrypoint drops to its own UID before reading bind mounts.
# The parent stays 0700 on the host; these two files are mounted read-only.
paths[1].chmod(0o444)
paths[2].chmod(0o444)
print("Initialized private configuration. OIDC provider and owner remain unconfigured.")
