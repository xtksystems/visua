# Observatory investigation and selection

Status: complete; committed, pushed, and locally deployed as `783ed28`

## Outcome and acceptance

Continue the approved visual review after evidence renewal. Add current-scope
At risk, Missing evidence, and Assigned to me presets, a persistent labeled
legend, and useful context around a selected requirement on desktop and phone.
Filter counts include actual matching requirements only. Scope, accepted evidence,
and stable member identity govern inclusion. Preserve canonical workspace,
keyboard focus, and bound review behavior. Threat catalogs remain views.

## Delivered

Evidence renewal was committed and pushed as `9755c01`; all 282 recorded source
hashes matched. Docker still runs `e867494`.
The [run plan](../runs/observatory-20261013/plan.json) accounts for server,
UI, independent review and bounded review follow-up. The lead integrated query
freshness, browser acceptance and docs. Normal framework state now uses one
fresh metadata snapshot and clock, exposing assessed scope and stable owner IDs.
Presets and search persist in the URL. Matching counts exclude retained ancestor
and selected context. The spatial map retains the whole framework, labeled in
the outline. Scene and outline legends stay visible. Inspector path and sibling
controls preserve filters, with usable context above the phone sheet.

## Verification and next action

[Verification](../runs/observatory-20261013/source-verification.json): 540 SQLite
tests (+2 PostgreSQL-only skips), 542 PostgreSQL tests, typechecking, licensing,
corpus and design checks pass. The full browser run passed all 123 cases. After
final focus corrections, all 13 affected browser cases passed again. Desktop
and touch-phone captures were inspected; phone selection stays above the sheet
without horizontal overflow. Independent findings were reproduced and fixed.

Observatory and the subsequent visual-review packages are complete and locally
deployed in `783ed28`. The [follow-through task](visual-followthrough-20261013.md)
records implementation; the [delivery record](../runs/visual-delivery-20261013/deployment-verification.json)
records the pushed source, preserved database, and passing live checks.
