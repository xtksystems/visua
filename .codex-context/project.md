# Visua project facts

Visua is a compliance workspace with 3D requirement maps, evidence, tasks,
agent proposals, and cited framework data. This record describes the local
source and the verified local deployment, not the current legal status of its corpus.

## Stack and entry points

This is a pnpm workspace with native TypeScript server execution.

- Node.js >=22.18; pnpm 10.33.0 is pinned in `package.json`.
- `apps/server/src/index.ts`: Hono API, SQLite or PostgreSQL, authentication,
  demo seeding, and serving the built web app.
- `apps/web/src/main.tsx` and `App.tsx`: React 19, Vite, TanStack Query,
  Zustand, and Three.js through React Three Fiber.
- `packages/core`: domain types, status, scoring, scope, and planning.
- `packages/frameworks`: corpus ingestion, graphs, citations, and mappings.
- `packages/agents`: Claude runtime and deterministic offline playbooks.
- `packages/design`: compiles `DESIGN.md` into CSS and TypeScript tokens.

## Canonical guidance

Read [repository rules](../CLAUDE.md) before application changes. They own
coding and delivery requirements. Use the [README](../README.md) for setup,
[architecture](../docs/architecture.md) for internals,
[workspace guide](../docs/workspace.md) for user behavior,
[design system](../DESIGN.md) for visual rules, and
[corpus guide](../corpus/README.md) for provenance and licensing.
The [context map](README.md) links deeper records; load them by task.

## Environment and verification

`pnpm dev` starts the API on 8787 and web on 5173. Framework data is bundled.
The default database is `data/visua.db`; `VISUA_DATABASE_URL` takes precedence
over `VISUA_DB`. Startup bootstraps identity before optional demo seeding.
Seeding defaults on only in non-production developer mode; `VISUA_SEED=0|1`
overrides it. Developer mode binds loopback; `VISUA_HOST` is an explicit override.
`/api/ready` probes storage, and signals trigger a bounded graceful shutdown.
Use `VISUA_AGENT_MODE=offline` for deterministic local agents. Agent and auth
configuration names are in `packages/agents/src/mode.ts` and
`apps/server/src/auth/config.ts`; don't copy secret values into context.
Production refuses developer sign-in and uses OIDC settings.

[Verification](verification.md) describes local checks and their side effects.
There is no hosted CI configuration in this checkout. Local checks run through
`scripts/check.ts`; application tests were not run for context adoption.

## Local deployment

The existing Docker Compose service runs at <http://localhost:8787>, bound to
this Mac with developer sign-in and offline agents. Its SQLite database persists
in `visua_visua-data`. The Docker files, README setup instructions, and project
context were committed and pushed as `1dc5ed1`. On October 2, 2026, rebuilding
the service with visualization
commit `5c497c3` passed health and browser smoke checks; see the
[deployment record](runs/local-redeploy-20261002/result.json).

On October 4, 2026 UTC, the service was rebuilt from pushed source commit
`7806309`, including the five milestone 1 packages and milestone 2's owned work
and evidence file storage. The image revision and 152 runtime source hashes
match. Readiness, live upload/accept/exact download, and the same file/reference/
review after restart pass. Migration 6 moves 18 inline bodies into separate SQL
rows while preserving hydrated evidence, legacy reviews, hashes, workspace
revisions, and all 107 historical audit events. The original volume, workspace,
1,487 requirement states, 18 tasks, two tenants, and nine memberships remain.
A consistent verified backup is retained in the volume and ignored
`data/deployment-backups/`. The synthetic workspace and blob were removed;
its deletion adds one organization audit event. See the
[delivery record](runs/evidence-files-20261004/delivery-result.json). Migration 5
continues to retain all 18 legacy decisions as history with pending current
review. S3-compatible storage is available through operator configuration;
only the local adapter was deployed.

## Unknowns

No public deployment, production operational runbook, or ownership registry was
verified. Local render-work profiles are recorded in the visualization run;
they do not establish production performance.

The [full app review](../docs/reviews/full-app-review-2026-10-02.md) records
confirmed evidence, startup, connector, and workflow defects. The
[next phase](../docs/development-phase-2.md) addresses trustworthy evidence
operations for a hosted pilot. Its startup/authentication, connector boundaries,
evidence approval binding, selection and role correctness, and keyboard
workflow packages are implemented and verified; see the
[startup task](tasks/startup-auth-20261003.md),
[connector task](tasks/connector-boundaries-20261003.md),
[evidence task](tasks/evidence-binding-20261003.md),
[selection task](tasks/selection-roles-20261003.md), and
[keyboard task](tasks/keyboard-workflow-20261003.md). Connector requests use
public-only guarded HTTP/TLS with bounded work. Hosted repository scans require
operator roots in `VISUA_REPO_SCAN_ROOTS` and trusted parent directories.
Evidence approvals bind the server-computed artifact hash, requirement set, and
validity window; protected edits require renewed review. Migration 5 archives
legacy decisions and computes current digests without retroactive approval.
Review uses the fixed dialog snapshot. Inspector state and pending callbacks
belong to the selected workspace and requirement; owner edits use Save/Cancel.
UI controls follow server capabilities, failed deep links offer retry, and
queries, writes, and live events use canonical workspace ids. Live activity
clears across workspace and session changes. Scene shortcuts belong to focused
outline/canvas surfaces; dialogs preserve selection and restore focus. All six
tab groups use shared keyboard behavior and associated panels. Requirement
links and search navigate to their framework and selected node. Milestone 2's
[owned work package](tasks/member-work-20261003.md) adds stable tenant member
assignments, external-owner labels, explicit calendar due-date and task-link
editing, and identity-based My work. Content requirement provenance survives
relinking and governs model licensing. Calendar tasks become overdue after the
UTC day. The [evidence file package](tasks/evidence-files-20261004.md) separates
metadata and inline bodies, provides private local and S3-compatible adapters,
and verifies scoped uploads, downloads, and file review. Migration 6 preserves
existing content, hashes, decisions, and audit history. Ledger, scoring, and
framework state read metadata; inspection explicitly loads inline detail.
[Final checks](runs/evidence-files-20261004/source-verification.json) pass 474
SQLite and 476 PostgreSQL tests; 98 unique browser cases combine 79 unchanged
full-lane passes and 19 final affected reruns. No single final full-check command
passed. Collection origin, assurance scope, and supersession were subsequently implemented; see the lifecycle record below.
Other reviewed defects and phase packages remain open. Local Docker now includes the visual-review packages at `783ed28`.

The approved [decision workspace package](tasks/decision-workspace-20261004.md)
adds scoped implementation/evidence/risk metrics, attention across enabled
frameworks, and exact proposal and batch reviews. HTTP approvals require the
server preview's token; changed inputs require renewed review. Unordered
database rows do not change tokens, but nested artifact order remains bound.
The overview reads fresh metadata so expiry and coverage agree. See the
[workspace guide](../docs/workspace.md) and
[verification record](runs/decision-workspace-20261004/source-verification.json):
505 SQLite, 507 PostgreSQL and all 110 browser tests pass, with desktop/mobile
captures inspected. The package was committed and pushed as `e867494`, then deployed to local Docker
at localhost:8787. A fresh [delivery check](runs/decision-delivery-20261012/source-verification.json)
passed all 110 browser tests, 505 SQLite and 507 PostgreSQL tests; live API and
desktop/mobile smoke checks passed, with the original data and audit chain
verified. The next approved [evidence renewal task](tasks/evidence-renewal-20261012.md)
is complete, pushed as `9755c01`, and deployed within `783ed28`. It adds cumulative
expiry windows, separate review and validity labels, and requirement impact
using accepted alternatives through the first coverage gap.
[Verification](runs/evidence-renewal-20261012/source-verification.json) passes
524 SQLite and 526 PostgreSQL tests, plus 117 browser cases combining 115 full-lane
passes and two targeted reruns. A viewer test had a transient route-fetch reset;
an existing review test needed the new label text. All seven renewal browser
cases passed in the full lane. Independent review and desktop/mobile captures
also passed. Provenance/supersession are covered by the subsequent lifecycle package;
subsequent snapshot-backed history is recorded below.

The next visual-review package, [Observatory presets](tasks/observatory-20261013.md),
is complete, pushed and deployed within `783ed28`, with current-scope attention/evidence/assignment
filters, a persistent labeled legend, and outline/inspector selection context.
[Verification](runs/observatory-20261013/source-verification.json) passes 540
SQLite and 542 PostgreSQL tests. All 123 browser cases passed in the full run;
13 affected cases passed again after the final focus corrections. Typechecking,
independent review corrections and desktop/touch-phone captures are complete.
Its live deployment is verified below.

The autonomous visual-review follow-through is complete, pushed and deployed. The
[implementation plan](../docs/visual-review-plan.md) records all six completed
packages: Crosswalk comparison, Plan urgency, CSF profile, actual agent stages,
visual/accessibility consistency, and immutable snapshots with observed trends.
The [completed task](tasks/visual-followthrough-20261013.md) and
[verification](runs/visual-followthrough-20261013/source-verification.json) record
626 SQLite passes plus two PostgreSQL-only skips, 628 PostgreSQL passes, and
138 verified browser cases (136 full-run passes plus four final affected reruns).
No single final full-check command passed: final test-only corrections address
native Tab focus and the intended local-scroll contract. Product bytes remained
unchanged after the full check. Three independent reviews and desktop/touch-phone
captures are complete; all five supported findings were fixed. Snapshot capture
is transactional, audited and isolated by workspace; migration 7 never backfills
old scores. It samples daily by default, with manual capture for contributors.
On October 13, 2026 UTC, source commit `783ed28` was pushed and deployed to
<http://localhost:8787>. The [delivery record](runs/visual-delivery-20261013/deployment-verification.json)
confirms a healthy image and 182 matching runtime source hashes. Migration 7
preserved every original database row against a consistent SQLite backup. After
live smoke cleanup, the original workspace, 1,487 requirement states, 18 tasks,
18 evidence items and their content/reviews, two tenants, and nine memberships
still match. The first scheduled score observation is recorded; the audit chain
is valid. Manual capture, exact batch approval, and desktop/phone checks passed.
Two temporary smoke workspaces were removed. Hosted operations, reliable automation, auditor handoff, and connector expansion
remain on the roadmap.

The [evidence lifecycle package](tasks/evidence-operations-20261013.md) completes
milestone 2: immutable collection/check/policy provenance, assurance scope,
reasoned rejection and withdrawal, review identity binding, compatible accepted
supersession, and metadata-only requirement lineage. Legacy origins stay unknown;
no migration/backfill occurs. Lineage evaluates current records at a stated time,
without replaying earlier edits. Original licensing also governs derived renewal
work. [Final verification](runs/evidence-operations-20261013/source-verification.json)
passes 650 SQLite and 652 PostgreSQL tests and verifies 146 unique browser cases
through full-lane plus targeted reruns. No single final full-check command passed.
Independent review findings and the collapsed-details keyboard defect are fixed.
Source is verified; commit/push and local deployment are pending at this checkpoint.
Milestone 3 is under implementation in an isolated checkout; milestone 4 follows.

Evidence lifecycle delivery completed on October 13, 2026: source `3c85ef4`
is pushed and running in the local Docker service. All 190 source pins match;
existing workspace state is preserved. The live CSF/SOC2 review/replacement,
withdrawal, download, lineage, and desktop/phone smoke passed and cleaned up.
See [delivery evidence](runs/evidence-operations-20261013/lifecycle-delivery.json).
