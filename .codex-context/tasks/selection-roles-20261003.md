# Selection and role correctness

Status: complete

## Outcome and scope

Complete milestone 1 package 4: reset inspector drafts/tab/dialog state by
workspace and requirement; make owner saves explicit; gate all mutation
controls by existing server capabilities; provide default mutation errors;
preserve failed deep links with retry; use canonical workspace ids for query,
mutation cache and SSE identity. Preserve existing server authorization, tenant
isolation, reviewed evidence, audit integrity, framework/corpus/design rules,
and all uncommitted earlier packages.

## Plan and ownership

[Run plan](../runs/selection-roles-20261003/plan.json) tracks immutable briefs and
baseline digests. Two native workers own independent bounded changes: inspector
state/actions and page capability controls. Root owns shared identity/query/
event/error/bootstrap flows, browser integration, docs and final verification.
A fresh independent review follows integration.

Root will introduce `lib/workspace.ts` with `useWorkspaceId(): string`, supplied
by the shell after route resolution. Pages and inspector use this canonical id
for queries/mutations; URL aliases remain accepted. `useWorkspace` resolves
aliases in its context. Root owns default mutation errors and preserves explicit
handlers. Read-only modes retain useful viewing/navigation/filtering controls.
Do not change role definitions or broaden server capabilities to accommodate UI.
Keyboard/tree/dialog-focus work remains package 5, except changes directly
required for safe selection and tested dialogs in this package.

## Acceptance evidence

Reproduce stale cached owner values/no-op blur write and enabled viewer page
controls against the initial build. Add browser regressions for cached
A→B→A→B selection, explicit owner save/reset/failure, all workspace pages under
viewer/auditor/contributor/approver, mutation-error visibility, failed deep-link
retry, and distinct workspace id/slug with live/cache invalidation. Run focused
checks and full pnpm check on the final source (SQLite, PostgreSQL and browser).
No commits, deployments, PRs, external model providers or production services.

## Verified result

Baseline reproduced cached owner values A,B,B,B and a wrong blur PATCH, plus
viewer Plan/Evidence write controls. Inspector lifetime now belongs to its
canonical workspace and requirement. Owner changes use Save/Cancel; same-node
dirty input survives refresh/failure, and old selections cannot change or
notify the new one. Page, inspector and palette mutation controls follow actual
server capabilities. Failed workspace/session/metadata/requirement links offer
retry without redirect. Query/write/event keys use ids even on slug routes;
SSE reconnects refresh state, and live activity clears at workspace/session
boundaries and rejects obsolete sources. Proposal decisions also use the id.

25 initial regressions passed after fixture fixes. Fresh independent source
review found four issues: framework mapping selection cleanup, retained live
activity, delayed inspector task/evidence errors, and duplicate Plan notices.
Each reproduced and was corrected; eight affected-flow cases passed. The final
[review](../runs/selection-roles-20261003/selection-fix-review.json) passed with
all source pins matching. Original findings and dispositions remain recorded.

Final `pnpm check` passed all seven lanes: SQLite 360 passed and two PostgreSQL
cases skipped; PostgreSQL 362 passed; Playwright 57 passed; typecheck, licensing,
corpus hashes and design lint passed. The exact cleaned-environment command and
logs are recorded in [integration evidence](../runs/selection-roles-20261003/integration-summary.json).
The first full run's sole failure was an old slug-specific href assertion;
the final assertion checks the server-returned id and correct program route.
Three new browser specs also pass strict TypeScript checks. All final code/test
pins are unchanged after the gate. Earlier backend/core/agent evidence scope
is preserved, dependency manifests are unchanged, and docs describe behavior.

Changes remain uncommitted. No production process, Docker service, deployment,
PR or external provider was changed. Temporary test servers stopped. The role
matrix simulates a queued run for cancellation affordances; it does not claim
an actual queued cancellation. No pilot time-saving measurement exists.

## Next action

Milestone 1 package 5: keyboard workflow. Scope shortcuts, focus tree rows,
restore dialog focus, correct tabs, and make requirement tags navigate. Cover
Escape inside a scope dialog. Other phase packages remain open.
