# Evidence renewal

Status: complete; pushed as `9755c01`, locally deployed within `783ed28`

## Outcome and scope

The user requested commit, push, redeploy, tests, and continuation to the next
visual-review task, then explicitly chose evidence renewal. Deliver the prior
package first, preserving the running local service's data. Implement selectable
Expired, Next 7 days, and Next 30 days evidence views with separate review and
validity labels and accurate requirement coverage impact.

The future windows are cumulative: seven days is included in thirty. Coverage
impact uses bound accepted artifact intervals, including alternative evidence,
and stops at the first gap in uninterrupted coverage. Current scope and evidence
on file are assumptions, not promises about future evidence. Expired artifacts
show current uncovered requirements without asserting historical causality.
Groups remain context only. No schema, provenance, supersession, scoring or
historical trend changes belong to this package.

## Plan and ownership

The [renewal run](../runs/evidence-renewal-20261012/plan.json) tracks two bounded
workers and their exact briefs/results. Both completed implementation in the
isolated worktree `.check/evidence-renewal-worktree`, based on `e867494`.
Fourteen explicit files, including the lead's overview links, invalidation and
docs, were hashed and integrated into the main workspace. A fresh independent
review passed against the same source. Final root refinements are verified.

## Delivery and verification

The prior [delivery run](../runs/decision-delivery-20261012/source-verification.json)
is complete. Commit `e867494` was pushed and redeployed to local Docker.
Fresh checks passed 505 SQLite, 507 PostgreSQL and all 110 browser cases,
typecheck, licensing, corpus and design. Readiness, original database preservation,
160 runtime source hashes, live API flows and desktop/mobile smoke checks passed.
Original audit verification passed. A consistent SQLite backup and the old image
are retained for rollback.

Renewal's final non-browser lane passes: 524 SQLite tests (two PostgreSQL-only
skips), 526 PostgreSQL tests, licensing, corpus verification and design lint.
Final typechecking also passes after the last UI edits. Independent review found
no supported material defects and passed 19 focused renewal tests. Desktop and
phone captures show no overflow or page errors; representative deadline, partial
coverage and pending/expired rows were inspected.

The first runtime pass exposed a keyboard test that asserted focus before URL
tab selection committed, and an existing approval test scanning the mutable
checkout twice. The keyboard test now waits for selection; the approval test
uses a small real temporary repository with unchanged safety assertions. The
separate real-checkout scan test remains. See the [investigation](../runs/evidence-renewal-20261012/debugging.md).

Final browser verification covers all 117 cases: 115 passed in the full lane,
and two targeted reruns passed. One existing viewer test had a route-fetch
connection reset and passed unchanged. The bound-review test needed its two
case-sensitive expectations aligned with **Review: Pending review**; all scope,
history and stale-snapshot assertions passed. There was no clean single final
full-browser command. Application source stayed unchanged between those runs.
All 282 final source/config/test hashes match. Every worker result is accounted
for and accepted in [fan-in](../runs/evidence-renewal-20261012/fan-in.json).
See the [final verification record](../runs/evidence-renewal-20261012/source-verification.json).

## Delivery state and next action

Renewal implementation, documentation and verification are complete in the main
workspace. The source was pushed as `9755c01` and deployed within `783ed28`.
The [delivery record](../runs/visual-delivery-20261013/deployment-verification.json)
confirms original data preservation and passing renewal desktop/phone checks.
Raw diagnostics, transient harnesses, and prior review artifacts remain local. The isolated worker checkout contains the earlier review
snapshot; the main workspace includes the final adjustments and is authoritative.
