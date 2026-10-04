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
UTC day. Full local checks pass 382 SQLite, 384 PostgreSQL, and 91 browser cases.
Next is evidence metadata/content separation with authorized blob storage.
Other reviewed defects and phase packages remain open. The running local Docker
service still uses its October 2 source; these packages have not been redeployed.
