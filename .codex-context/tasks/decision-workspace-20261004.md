# Decision-focused workspace

Status: complete

## Outcome and acceptance

Implement the user-approved first three visualization priorities together:
explicit implementation/evidence/risk metrics with scope and definitions, an
attention queue across every enabled framework, and explicit proposal diffs
with exact batch review. Preserve the warm token-based design and accessible
keyboard/mobile experience. Historical trends and priority-two redesigns are
outside this package.

## Contracts

Metrics retain existing scoring semantics and name their selected framework.
The queue reads metadata, uses current checks, separates expiry from review,
and considers alternative valid evidence before claiming loss of coverage.
Proposal approval checks the inspected snapshot inside the mutation; a batch
applies only its reviewed set. Preserve tenancy, capabilities, provenance and
licenses, byte-bound evidence reviews, and transaction/audit integrity.

## Plan and progress

The [run ledger](../runs/decision-workspace-20261004/plan.json) owns worker
accounting. Server preview and attention work have disjoint file ownership.
The lead integrates frontend, documentation, tests, visual checks, and review.

1. Attention and proposal review contracts implemented; 9 attention and 21
   proposal tests pass. Scoped metrics, queue, exact review/batch UI and direct
   links are integrated. Workspace and architecture guides are updated.
2. Independent review's two findings are corrected: narrative validity periods
   are visible, and batches detect overlapping uninitialized requirements.
3. PostgreSQL integration exposed row-order-dependent tokens. Only unordered
   snapshot record collections are normalized; nested artifact order remains
   token-bound. Both database backends and independent correction checks pass.
4. Final non-browser checks pass: 505 SQLite and 507 PostgreSQL tests,
   typecheck, licensing, corpus and design. All 110 browser tests pass in
   one final run. Six final desktop/mobile captures have no overflow or page
   errors and were inspected. The overview documentation image is refreshed.

## Evidence and next action

Initial HEAD: `833c0eb`. No tracked changes at start. Prior visual-review
records remain untracked and untouched. Implementation authorized; no commit,
push, or deployment requested. All four worker results are reconciled and
accepted; final integration passes. The overview uses fresh
metadata/clock scores to avoid stale expiry metrics.

Focused browser failures included five obsolete test expectations (corrected)
and an inactive browser document (the dialog's element focus was correct).
The mobile test activates the loaded page and retains its focus, trap and
restore assertions; its isolated rerun passes. No competing browser process
runs during the final suite. All 273 final application/test/configuration
input hashes still match the completed browser run. See the
[verification record](../runs/decision-workspace-20261004/source-verification.json)
and [session handoff](../sessions/20261004T084927Z-feat-light-workspace-design-682e84383488.md).
No remaining task work; changes are unstaged and uncommitted.
