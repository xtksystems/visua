# Complete the visual review backlog

Status: complete; committed, pushed, and locally deployed as `783ed28`

The user requested a documented backlog and autonomous implementation in logical
order. All six packages in the [plan](../../docs/visual-review-plan.md) are complete:
Crosswalk comparison, Plan urgency, CSF profile, actual agent stages, visual and
accessibility consistency, and immutable snapshots with observed trends.

The implementation and Observatory were committed and pushed as `783ed28` on
`feat/light-workspace-design`, then deployed to local Docker after the user
explicitly requested delivery. Old diagnostics and the original concept remain
local and untracked. The [delivery record](../runs/visual-delivery-20261013/deployment-verification.json)
verifies backup, migration, data preservation, runtime hashes, and live checks.

## Verification

The [verification record](../runs/visual-followthrough-20261013/source-verification.json)
pins 318 source/config/test/document files. Typechecking, licensing, corpus hashes,
and design lint pass. SQLite passes 626 tests with two PostgreSQL-only skips;
PostgreSQL passes all 628 in a disposable container. All 138 browser cases are
verified through 136 full-run passes plus four final affected reruns. No single
final full-check command passed. Only two browser test files and documentation
changed after the full check; product source stayed unchanged.

The full browser run exposed two test assumptions: a blanket ban on local
horizontal scrolling, and programmatic focus before native keyboard scrolling.
The final tests enforce named, focusable, viewport-bounded scroll regions and
enter the history chart through Tab before checking ArrowRight and a touch swipe.
Both failures, diagnostic attempts, and final passes remain recorded.

Three independent reviews found five issues; all were fixed and verified:
legacy timestamp urgency, matrix focus retention, decision-source attribution,
legacy runtime stage inference, and tier draft loss on a transient refresh error.
Access loss still unmounts the workspace. Thirteen desktop/touch-phone captures
were inspected. The [run ledger](../runs/visual-followthrough-20261013/plan.json)
accounts for all eight implementation/review results.

## Remaining work

No implementation or delivery work remains in this visual-review scope.
Broader evidence provenance, supersession, hosted operations, and connector
expansion remain on the development roadmap.

History starts with actual captures. Migration 7 creates storage without
backfilling past scores; the UI displays the latest 60 observations and retains
older records. Daily capture and manual capture both preserve tenant, audit,
transaction, and proof boundaries.
