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

[The server entry point](../apps/server/src/index.ts) delegates startup and
shutdown to [server lifecycle](../apps/server/src/server.ts), which calls
[createService](../apps/server/src/context.ts). Service creation opens and
migrates storage, loads the registry, creates the event bus, and attaches a
PostgreSQL event relay when needed. Startup constructs `AuthService`,
bootstraps identity before optional demo seeding, and starts the app and listener.
Developer mode binds loopback unless overridden. Readiness probes storage;
shutdown drains HTTP, SSO checks, and detached local runs before store close.

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

## Evidence integrity

[Core evidence rules](../packages/core/src/evidence.ts) validate dates and bind
current acceptance to the latest review scope. [Artifact hashing](../apps/server/src/services/evidence.ts)
uses a canonical content/data envelope or the immutable connector recipe.
Uploaded files use the verified bytes' digest. [Private blob adapters](../apps/server/src/blobs/index.ts)
scope server-generated references by tenant and workspace. Upload, download,
and review verify size/hash outside SQL before a locked metadata/scope/auth
reread. Metadata publication failures retain possibly committed files.
`VisuaService` owns protected edits and append-only decisions, with transactional
before/after audit snapshots. Migration 5 recomputes legacy digests and archives
prior decisions without attesting an unknown scope. The evidence detail dialog
retains its inspected snapshot and sends it with the decision; live refetch does
not replace what the person reviewed. See the [evidence task](tasks/evidence-binding-20261003.md).

Migration 6 moves inline bodies into `evidence_content`, preserving identities,
digests, decisions, revisions, and audit history. Explicit detail/export reads
hydrate bodies; ledger, score, and framework-state reads use metadata only.
Compose persists SQLite and local blobs together under `/app/data`. S3 uses
operator-managed private storage and standard AWS credentials; retention and
physical garbage collection remain operational decisions. See the
[file-storage task](tasks/evidence-files-20261004.md).

## Agents and live UI

The shell resolves URL aliases into canonical workspace ids before mounting
pages. Queries, mutations, and SSE share that id; reconnecting streams refresh
state. Live activity resets on workspace/session changes and rejects obsolete
streams. Inspector query/draft lifetimes are keyed by workspace and requirement;
owner changes save explicitly. Capability controls follow server authorization,
and failed workspace/requirement links keep their destination with retry. See
the [selection task](tasks/selection-roles-20261003.md),
[keyboard task](tasks/keyboard-workflow-20261003.md), and
[web architecture](../docs/architecture.md#5-web-appsweb).

Outline/canvas handlers own scene shortcuts. Shared modal focus and tabs
provide focus lifetimes and panel associations; tags and palette results use
requirement URLs. Catalog tab navigation preserves the current workspace alias
to keep its focus lifetime; its data requests still use the canonical id.

[AgentHost](../packages/agents/src/host.ts) separates agent tools from the
server. [Tools](../packages/agents/src/tools.ts) read cited data and propose
changes; [runtime](../packages/agents/src/runtime.ts) selects the Claude or
offline implementation. `VisuaService` owns runs, proposals, approvals,
autonomy checks, and persisted outcomes.

[Connector registry](../apps/server/src/connectors/index.ts) wraps every kind
with shared process capacity and a total deadline. [Web transport](../apps/server/src/connectors/network.ts)
reuses the [egress guard](../apps/server/src/auth/egress.ts) for public-only
HTTP, redirect validation, and direct TLS. [Repository scans](../apps/server/src/connectors/repo-scan.ts)
use operator-configured roots and bounded asynchronous reads without following
symlinks. Connector I/O precedes the service transaction that records checks,
evidence, and audit events.

[App](../apps/web/src/App.tsx) provides routes and workspace screens.
[Queries](../apps/web/src/lib/queries.ts) fetch API state;
[SSE handling](../apps/web/src/lib/events.ts) batches cache invalidation and
updates agent activity. `apps/web/src/scene/` contains the Observatory and
Nexus; ordinary pages and the 2D outline provide parallel navigation.
[The token builder](../packages/design/scripts/build.ts) turns `DESIGN.md`
into `packages/design/generated/tokens.css` and `tokens.ts` for both UI forms.

## Assigned work

Requirement state keeps `ownerUserId` and calendar `dueDate` beside legacy owner
labels. Tasks use current member `person` assignments or explicit external labels.
JSON-backed records need no schema change for these optional fields. Workspace
member-directory and My work routes use the existing workspace access guard;
personal results match the signed-in user ID and carry derived requirement status.
See [canonical architecture](../docs/architecture.md) for date, provenance, audit,
query-identity, draft, and live-event contracts.
