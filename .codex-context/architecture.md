# Architecture navigation

Use [the canonical architecture](../docs/architecture.md) for the full design.
These source relationships help you find the implementation without loading
that entire document at startup.

## Data and domain

[Ingestion](../packages/frameworks/scripts/ingest.ts) converts the local
`corpus/` into `packages/frameworks/data/` graphs, search chunks, overlays,
requirement mappings, and separate threat mappings.
[FrameworkRegistry](../packages/frameworks/src/index.ts) loads those artifacts
and constructs indexes from [core types](../packages/core/src/types.ts).
The core package implements status, scoring, planning, scope, and crosswalk
projection without owning persistence. Corpus provenance remains in
[the corpus guide](../corpus/README.md) and per-corpus manifests.

## Requests and persistence

[Server startup](../apps/server/src/index.ts) calls
[createService](../apps/server/src/context.ts), which opens and migrates the
selected store, loads the registry, creates the event bus, and attaches a
PostgreSQL event relay when needed. Startup constructs `AuthService`, seeds
an empty demo store when enabled, bootstraps identity, and creates the app.

[Hono routes](../apps/server/src/app.ts) validate inputs and use
[auth middleware](../apps/server/src/auth/http.ts) for principals, CSRF,
tenant access, and capabilities. Workspace changes enter
[VisuaService](../apps/server/src/services/visua.ts). Its mutation path joins
a transaction, locks the workspace, updates state and the audit chain, and
queues events for publication after commit.

[Store](../apps/server/src/storage/store.ts) exposes async repositories over
[the SQL driver contract](../apps/server/src/storage/driver.ts).
[Migrations](../apps/server/src/storage/migrations.ts) own schema evolution.
SQLite serves local use; PostgreSQL supports multiple instances, locks, and
[LISTEN/NOTIFY relay](../apps/server/src/storage/events.ts).
Identity records live in [identity storage](../apps/server/src/storage/identity.ts).
The [SSO domain design](../docs/superpowers/specs/2026-09-27-sso-domain-recheck-design.md)
explains claim ownership, retries, and domain lapse behavior.

## Agents and live UI

[AgentHost](../packages/agents/src/host.ts) separates agent tools from the
server. [Tools](../packages/agents/src/tools.ts) read cited data and propose
changes; [runtime](../packages/agents/src/runtime.ts) selects the Claude or
offline implementation. `VisuaService` owns runs, proposals, approvals,
autonomy checks, and persisted outcomes.

[App](../apps/web/src/App.tsx) provides routes and workspace screens.
[Queries](../apps/web/src/lib/queries.ts) fetch API state;
[SSE handling](../apps/web/src/lib/events.ts) batches cache invalidation and
updates agent activity. `apps/web/src/scene/` contains the Observatory and
Nexus; ordinary pages and the 2D outline provide parallel navigation.
[The token builder](../packages/design/scripts/build.ts) turns `DESIGN.md`
into `packages/design/generated/tokens.css` and `tokens.ts` for both UI forms.
