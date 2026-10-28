---
system: "codex-context"
session_id: "20261028T215613Z-feat-light-workspace-design-02d68ffbbafd"
created_utc: "2026-10-28T21:56:13+00:00"
updated_utc: "2026-10-28T21:57:27.850573+00:00"
task: "Deploy Visua privately to SSH reactor"
status: "installed_pending_identity"
repo_root: "/Users/artem/visua"
worktree_id: "fbce6dbefa7b12a8"
branch: "feat/light-workspace-design"
head: "5450fc7271332ba09892350c3af28646c0d12dc0"
---

# Session handoff

User requested deployment through SSH `reactor`; the private runtime is installed.
The [task](../tasks/reactor-deployment-20261028.md),
[state](../runs/reactor-deploy-20261028/state.json), and
[runbook](../../deploy/reactor/README.md) carry exact scope and pending work.

Reactor is Ubuntu 24.04 x86_64 with Docker; `/opt/visua` is private and owned by
artem. App image from `5450fc7`, PostgreSQL17 and local evidence run with restart
policies. Listener only127.0.0.1:8787. Production OIDC, seed0, offline agents,
no scan roots, no owner/provider. Zero users/workspaces/SSO connections. No live
login is possible until inputs arrive. Existing five server services preserved.

Fresh `pnpm check --no-e2e` passed: 944 SQLite+9skips/953PG/types/licensing/corpus/
design. Browser suite skipped; earlier T01 failure remains. Target desktop and
phone login smoke passed; anonymous401 and devlogin403. All265 checked runtime
source/data hashes match. Six packaging fixture checks passed. Independent
review's two new script findings were fixed and correction pass passed.

Current backup restored fresh DB/volume with24 table counts equal. Synthetic
64KiB binary, accepted review, audit/revision and fixed-asOf bundle content
restored. First fixture failure (different asOf) retained; no app fix claimed.
Scratch DBs/volumes/tempcredentialfiles cleaned. Backups only on reactor;
independent encrypted/off-host retention remains pending.

Next: await hostname, owner email, OAuth credential path and access choice from
async questions. Configure final HTTPS and real Google sign-in, then owner and
three-user acceptance. Retain F01–F11/T01 and missing independent security review
as open before live evidence admission. Never change to developer auth to bypass
missing setup. Do not retry the earlier refused security job through another
provider. No DNS/firewall/Cloudflare mutation occurred.

Curated deployment helpers, docs and evidence are being committed/pushed under
existing authorization. Raw build logs, secrets, source archive, screenshots,
and backup bytes remain private outside Git. Historical untracked diagnostics
are preserved. Local Mac demo unchanged. Temporary SSH browser forward will be
closed after checks; use the runbook command to access the private sign-in page.
