# Contracts to preserve

[Repository rules](../CLAUDE.md) are authoritative. The contracts below link
those requirements to inspected source and existing verification paths;
source inspection does not establish that tests currently pass.

| Contract | Evidence and verification |
| --- | --- |
| Workspace routes enforce tenant access, return 404 across organizations, and require capabilities above the route floor. Actors come from the signed-in principal. Production refuses developer sign-in. | `apps/server/src/app.ts`, `auth/http.ts`, `auth/config.ts`; `apps/server/test/auth.test.ts`, `api.test.ts`. |
| Workspace UI cache, mutations, and events use the canonical id. Live activity stays within that workspace/session. Inspector drafts and callbacks belong to their workspace/requirement; owner saves are explicit. Mutation affordances match server capabilities, and failed deep links retain a retryable destination. | `apps/web/src/lib/workspace.ts`, `queries.ts`, `events.ts`, `auth.ts`, `components/shell/Shell.tsx`, `components/inspector/Inspector.tsx`; `e2e/inspector-selection.spec.ts`, `e2e/page-roles.spec.ts`, `e2e/workspace-recovery.spec.ts`. |
| Startup defaults demo seeding to non-production developer mode and bootstraps first-owner identity before optional seeding. Developer mode defaults to loopback. Readiness probes storage; shutdown and startup-failure cleanup drain active request/agent/SSO work before releasing storage, within a deadline. | `apps/server/src/startup.ts`, `server.ts`, `readiness.ts`; `apps/server/test/startup.test.ts`, `domain-recheck.test.ts`. |
| Workspace mutations, the hash-chained audit record, and revision changes share a transaction. Await storage calls; keep network calls outside transactions. Events publish only after commit, and rollback discards them. | `VisuaService.mutate/log/emit` in `apps/server/src/services/visua.ts`; `Store.transaction/afterCommit` in `storage/store.ts`; `apps/server/test/storage.test.ts`. |
| Connector HTTP/TLS and every redirect use public-only connection-time DNS guards; OIDC private-host exceptions never apply. Runs have bounded time, bytes, and process concurrency. Repository scans stay inside operator roots, skip symlinks/special files, and never mark incomplete secret scans as passing. Scan roots require operator-controlled parent directories. | `apps/server/src/auth/egress.ts`, `connectors/network.ts`, `limits.ts`, `repo-scan.ts`; `apps/server/test/connector-boundaries.test.ts`, `egress-dns.test.ts`, `egress.test.ts`, `repo-scan.test.ts`, `api.test.ts`. |
| Concurrent PostgreSQL writers serialize by workspace and reread state after obtaining the lock. Nested transactions use savepoints. | `apps/server/src/services/visua.ts`, `storage/store.ts`, `storage/postgres.ts`; PostgreSQL cases in `apps/server/test/storage.test.ts`. |
| Agent mutations go through `host.propose()`, followed by human approval or explicitly granted autonomy. Agents cannot verify requirements, issue audit or authorization decisions, or file plans/templates as evidence. | `packages/agents/src/host.ts`, `tools.ts`, `apps/server/src/services/visua.ts`; `packages/agents/test/tools.test.ts`, `apps/server/test/api.test.ts`. |
| Not-applicable decisions require a rationale; scope recomputation preserves `userExclusion`. | `effectiveScope`, `updateState`, and framework scope updates in `apps/server/src/services/visua.ts`; `apps/server/test/api.test.ts`. |
| Status precedence is not-applicable, override, at-risk, verified, implemented, in-progress, not-started. Verification needs a positive target met, `verifiedAt`, and accepted unexpired evidence. Scores depend on workspace revision and the current hour; uncommitted computed results must not enter the score cache. | `packages/core/src/status.ts`, `apps/server/src/services/visua.ts`; `packages/core/test/core.test.ts`, `apps/server/test/storage.test.ts`. |
| Requirement statements retain corpus citations. Preserve published node IDs and law codes. AI RMF statements use the PDF extraction, not alternate CPRT/Playbook wording. Official catalog counts change only with an intentional source update. | `packages/frameworks/src/ingest/`, `packages/core/src/ids.ts`; `packages/frameworks/test/frameworks.test.ts`, `pnpm corpus:verify`. |
| Threat catalogs are derived coverage views, never assessable frameworks. Published threat links retain authority/status and stay separate from requirement crosswalks. A mapping is never evidence. | `packages/frameworks/src/threat-links.ts`, `threat-paths.ts`, `apps/server/src/services/threats.ts`, `packages/core/src/crosswalk.ts`; framework, agent, and API tests. |
| Restricted corpus text and derived artifacts stay out of Git. Licensed text must pass through `modelText()` / `licensedTextToModel()` before reaching a model. Preserve open-license notices. | `.gitignore`, `corpus/README.md`, `packages/frameworks/data/NOTICE.md`, `packages/agents/src/mode.ts`, `tools.ts`; `packages/agents/test/licensing.test.ts`, licensing guard in `scripts/check.ts`. |
| DNS timeout/server failure is unknown, not proof of a missing SSO ownership record. Domain lapse blocks new admission without locking existing members out of their route. | `apps/server/src/auth/domain-recheck.ts`, `auth/service.ts`, `storage/identity.ts`; `domain-recheck.test.ts`, `sso-recheck.test.ts`, and the canonical SSO design. |
| Visual values come from `DESIGN.md` tokens. Pair status colors with labels/glyphs; reserve tertiary violet for agents and framework-ai copper for AI frameworks. Preserve accessible 2D navigation. | `CLAUDE.md`, `DESIGN.md`, `packages/design/scripts/build.ts`, `apps/web/src/scene/`; design lint, `apps/web/test/screen-labels.test.ts`, and `e2e/visua.spec.ts`. |
| Scene shortcuts belong to focused outline rows or the canvas and respect forms, controls, modifiers, claimed events, and modal focus. Dialog Escape preserves selection; focus returns to its connected trigger. Tabs keep one active stop and associated panels. Requirement links and search results carry their framework and selection in the URL. | `apps/web/src/pages/ObservatoryPage.tsx`, `lib/modal.ts`, `components/ui/index.tsx`, `components/shell/Shell.tsx`; `e2e/keyboard-outline.spec.ts`, `keyboard-dialog-tabs.spec.ts`, `keyboard-palette.spec.ts`. |

Use [verification commands](verification.md) to select the appropriate suite.
For SSO changes, also read the
[domain recheck specification](../docs/superpowers/specs/2026-09-27-sso-domain-recheck-design.md).

- Evidence acceptance requires the latest bound review to match the server-computed
  artifact hash, requirement set, collection date, and expiry. Protected edits
  return it to review; history and audit snapshots remain. Connector observations
  are immutable. Review requests carry the inspected scope; legacy decisions
  cannot retroactively attest a scope. Dates validate calendar and timezone.

- Work assignment stores current tenant member IDs and canonical names; external
  labels never act as identities. My work matches only the signed-in user ID.
  Explicit clearing removes fields. Calendar due dates expire after the UTC day.
  Task links accept enabled assessable nodes, retain source/origin, and accumulate
  server-owned content requirement provenance for model licensing. Known licensed
  source fallback needs the original document and locator before fragment routing.

- File evidence references are immutable and server-owned. Tenant/workspace
  access authorizes each upload/download; a digest grants no access. Verify
  actual SHA-256 and size after storage, before download, and before review.
  Blob I/O stays outside SQL transactions; reread identity, scope, and current
  authorization under locks after I/O. Authorization rechecks do not write
  session/token usage fields. Retain bytes after a metadata write attempt when
  the commit outcome is uncertain. Migration 6 separates inline bodies without
  changing hashes, decisions, workspace revisions, or audit history. Ledger,
  score, and framework-state reads use metadata only.
