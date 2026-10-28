#!/usr/bin/env python3
"""Inspect the reactor profile without emitting configured values or credentials."""
import json
import os
from pathlib import Path
import stat
import sys
from urllib.parse import urlparse

root = Path(sys.argv[1] if len(sys.argv) > 1 else "/opt/visua").resolve()
require_identity = "--require-identity" in sys.argv
path = root / "shared/app.env"
values = {}
for line in path.read_text().splitlines():
    if line and not line.startswith("#"):
        key, value = line.split("=", 1)
        if key in values:
            raise SystemExit("Duplicate configuration key")
        values[key] = value
origin = urlparse(values.get("VISUA_PUBLIC_URL", ""))
database = urlparse(values.get("VISUA_DATABASE_URL", ""))
compose = (root / "compose.yaml").read_text()
checks = {
    "private_directories": all(not directory.is_symlink()
        and directory.stat().st_uid == os.geteuid()
        and stat.S_IMODE(directory.stat().st_mode) == 0o700
        for directory in [root, root / "shared"]),
    "private_config": stat.S_IMODE(path.stat().st_mode) == 0o600,
    "production_oidc": values.get("NODE_ENV") == "production" and values.get("VISUA_AUTH_MODE") == "oidc",
    "seed_disabled": values.get("VISUA_SEED") == "0",
    "nondefault_secret": len(values.get("VISUA_SECRET", "")) >= 32
        and values.get("VISUA_SECRET") != "visua-development-secret-do-not-use-in-production",
    "local_evidence": values.get("VISUA_BLOB_STORE") == "local" and values.get("VISUA_BLOB_DIR") == "/app/data/blobs",
    "dedicated_postgresql": database.scheme == "postgres" and database.hostname == "postgres"
        and database.username == "visua" and database.path == "/visua" and bool(database.password),
    "private_listener": '"127.0.0.1:8787:8787"' in compose,
    "offline_agents": values.get("VISUA_AGENT_MODE") == "offline",
    "repository_scan_disabled": values.get("VISUA_REPO_SCAN_ROOTS") == "[]",
    "no_identity_overrides": not any(values.get(key) for key in
        ["VISUA_OIDC_ALLOW_HTTP", "VISUA_OIDC_TRUST_EMAIL", "VISUA_OIDC_PRIVATE_ISSUERS"])
        and values.get("VISUA_SSO_DOMAIN_VERIFICATION", "dns") == "dns",
}
identity = {
    "https_origin": origin.scheme == "https" and bool(origin.hostname)
        and origin.hostname not in ["localhost", "127.0.0.1"] and not origin.username
        and origin.path in ["", "/"] and not origin.query and not origin.fragment,
    "google_issuer": values.get("VISUA_OIDC_ISSUER") == "https://accounts.google.com",
    "oauth_client": bool(values.get("VISUA_OIDC_CLIENT_ID")) and bool(values.get("VISUA_OIDC_CLIENT_SECRET")),
    "bootstrap_owner": "@" in values.get("VISUA_BOOTSTRAP_OWNER_EMAIL", ""),
}
ready = all(checks.values())
print(json.dumps({"profile": "reactor-postgresql-local", "checks": checks,
                  "identity_checks": identity, "private_install_ready": ready,
                  "identity_configured": all(identity.values()),
                  "live_admission": "Requires real login, recovery, and release finding resolution."}, indent=2))
sys.exit(0 if ready and (not require_identity or all(identity.values())) else 1)
