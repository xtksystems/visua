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
passed. Next is explicit collection origin, assurance scope, and supersession.
Other reviewed defects and phase packages remain open. Local Docker includes
the completed packages at source commit `7806309`.
