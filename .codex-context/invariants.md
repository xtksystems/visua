# Contracts to preserve

[Repository rules](../CLAUDE.md) are authoritative. The contracts below link
those requirements to inspected source and existing verification paths;
source inspection does not establish that tests currently pass.

| Contract | Evidence and verification |
| --- | --- |
| Workspace routes enforce tenant access, return 404 across organizations, and require capabilities above the route floor. Actors come from the signed-in principal. Production refuses developer sign-in. | `apps/server/src/app.ts`, `auth/http.ts`, `auth/config.ts`; `apps/server/test/auth.test.ts`, `api.test.ts`. |
| Workspace mutations, the hash-chained audit record, and revision changes share a transaction. Await storage calls; keep network calls outside transactions. Events publish only after commit, and rollback discards them. | `VisuaService.mutate/log/emit` in `apps/server/src/services/visua.ts`; `Store.transaction/afterCommit` in `storage/store.ts`; `apps/server/test/storage.test.ts`. |
| Concurrent PostgreSQL writers serialize by workspace and reread state after obtaining the lock. Nested transactions use savepoints. | `apps/server/src/services/visua.ts`, `storage/store.ts`, `storage/postgres.ts`; PostgreSQL cases in `apps/server/test/storage.test.ts`. |
| Agent mutations go through `host.propose()`, followed by human approval or explicitly granted autonomy. Agents cannot verify requirements, issue audit or authorization decisions, or file plans/templates as evidence. | `packages/agents/src/host.ts`, `tools.ts`, `apps/server/src/services/visua.ts`; `packages/agents/test/tools.test.ts`, `apps/server/test/api.test.ts`. |
| Not-applicable decisions require a rationale; scope recomputation preserves `userExclusion`. | `effectiveScope`, `updateState`, and framework scope updates in `apps/server/src/services/visua.ts`; `apps/server/test/api.test.ts`. |
| Status precedence is not-applicable, override, at-risk, verified, implemented, in-progress, not-started. Verification needs a positive target met, `verifiedAt`, and accepted unexpired evidence. Scores depend on workspace revision and the current hour; uncommitted computed results must not enter the score cache. | `packages/core/src/status.ts`, `apps/server/src/services/visua.ts`; `packages/core/test/core.test.ts`, `apps/server/test/storage.test.ts`. |
| Requirement statements retain corpus citations. Preserve published node IDs and law codes. AI RMF statements use the PDF extraction, not alternate CPRT/Playbook wording. Official catalog counts change only with an intentional source update. | `packages/frameworks/src/ingest/`, `packages/core/src/ids.ts`; `packages/frameworks/test/frameworks.test.ts`, `pnpm corpus:verify`. |
| Threat catalogs are derived coverage views, never assessable frameworks. Published threat links retain authority/status and stay separate from requirement crosswalks. A mapping is never evidence. | `packages/frameworks/src/threat-links.ts`, `threat-paths.ts`, `apps/server/src/services/threats.ts`, `packages/core/src/crosswalk.ts`; framework, agent, and API tests. |
| Restricted corpus text and derived artifacts stay out of Git. Licensed text must pass through `modelText()` / `licensedTextToModel()` before reaching a model. Preserve open-license notices. | `.gitignore`, `corpus/README.md`, `packages/frameworks/data/NOTICE.md`, `packages/agents/src/mode.ts`, `tools.ts`; `packages/agents/test/licensing.test.ts`, licensing guard in `scripts/check.ts`. |
| DNS timeout/server failure is unknown, not proof of a missing SSO ownership record. Domain lapse blocks new admission without locking existing members out of their route. | `apps/server/src/auth/domain-recheck.ts`, `auth/service.ts`, `storage/identity.ts`; `domain-recheck.test.ts`, `sso-recheck.test.ts`, and the canonical SSO design. |
| Visual values come from `DESIGN.md` tokens. Pair status colors with labels/glyphs; reserve tertiary violet for agents and framework-ai copper for AI frameworks. Preserve accessible 2D navigation. | `CLAUDE.md`, `DESIGN.md`, `packages/design/scripts/build.ts`, `apps/web/src/scene/`; design lint, `apps/web/test/screen-labels.test.ts`, and `e2e/visua.spec.ts`. |

Use [verification commands](verification.md) to select the appropriate suite.
For SSO changes, also read the
[domain recheck specification](../docs/superpowers/specs/2026-09-27-sso-domain-recheck-design.md).
