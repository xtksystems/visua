# Startup and authentication foundations

Status: complete

## Outcome and acceptance

Milestone 1 package 1 from [phase 2](../../docs/development-phase-2.md) is complete.
Production defaults to no demos and an empty installation provisions a working
OIDC owner. Developer mode defaults to loopback. Readiness probes storage;
startup failure and shutdown drain work before releasing resources, within a
configured deadline. The local Compose host binding and data volume remain.

Preserved tenant isolation, verified-email linking, production refusal of dev
sign-in, unowned-only bootstrap grants, audit transactions, and offline agents.
Explicit VISUA_SEED=1 retains demo opt-in; VISUA_HOST supports container binding.
No commit, push, PR, or redeployment requested. Docker on 8787 is unchanged.

## Implementation and review

Baseline: clean `feat/light-workspace-design` at `c8a1ed0` in `/Users/artem/visua`.
Server resource ownership lives in `apps/server/src/server.ts`; settings and
bootstrap/seeding order live in `startup.ts`. Readiness shares a stuck SQL
query and bounds HTTP wait. Shutdown closes SSE, drains pipelined responses,
disconnected handlers, active SSO lookups and local agent runs, then storage.

Native fresh-context `/root/startup_review` reviewed startup/auth/resource
lifetime. Its startup-failure cleanup finding was reproduced and fixed with
bounded draining. The same reviewer completed targeted correction adjudication;
both expected nodes are complete and accepted. See the
[run ledger](../runs/startup-auth-20261003/plan.json) and
[adjudication](../runs/startup-auth-20261003/review-adjudication.json).

## Verification and limits

Final full local check exited 0: typecheck, licensing, corpus hashes and design
lint passed; 229 SQLite passed / 2 skipped, 231 PostgreSQL passed, all 23 browser
cases passed. It completed in 624 seconds. Exact command, cwd, tested source,
runtimes, prior failures and limitations are in
[verification evidence](../runs/startup-auth-20261003/verification-summary.json).

Production bootstrap uses a mock IdP and isolated schemas on both DBs. Tests
cover readiness failure/recovery/stall, real entry-point signals, streams,
in-flight and pipelined requests, detached agents, deadline and failed startup.
The seeded failure fault case uses memory SQLite. Node 22 container smoke and
Compose configuration validation passed without changing the live deployment.

The existing PostgreSQL SSO case exceeded 30 seconds on 217 simulated hourly
ticks; fewer redundant ticks preserve explicit hourly retry and ten-day checks.
Final full suite passed at its normal deadlines. No live model/IdP, database
outage drill, or durable recovery after forced stop was exercised. Context
pressure and human time savings were not measured.

## Next action

Implement milestone 1 package 2 connector boundaries: guarded HTTP/TLS egress,
DNS/redirect checks, configured scan roots, symlink confinement, and bounded
resources. Preserve this uncommitted startup package. Remaining phase work is
planned; the existing Docker service still uses the October 2 source.
