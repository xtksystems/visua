# Member assignment and My work

Status: active. User authorizes implementing the next phase package, committing
and pushing accumulated changes, and updating local Docker without data loss.

Implement milestone 2 package 1: stable member-based requirement and task
assignment, external owner compatibility, editable strict calendar due dates,
editable task links, and identity-based My work. Preserve tenant/capability,
selection, audit, provenance, keyboard, licensing, and design contracts.

Run: [member-work-20261003](../runs/member-work-20261003/plan.json). Lead owns
shared picker/queries/inspector, browser tests, docs, integration and delivery.
Server worker owns core types/server and focused API tests; plan worker owns
Plan/My work/route/rail. Initial snapshot captures already-dirty milestone 1.

Next: dispatch bounded workers, implement shared controls, check integration,
run independent review and full pnpm check, stage safe source/context artifacts,
commit/push, preserve Docker database, rebuild service, and verify live health/UI.

Implementation milestone: original server and Plan UI workers complete; runtime
contracts inspected. Initial typecheck and strict E2E TS passed. Focused browser
first attempt interrupted on ambiguous member selector label; second attempt
8 passed, 1 failed on search label containing helper text. Both fields corrected.
Initial independent review found licensing after relink, calendar due-today
scoring mismatch, and missing evidence/check My work invalidations. Root fixed
day boundary/events and added regressions; server worker resumed under
licensing-fix-brief.txt for immutable contentRequirementIds/model filtering.
Current review is findings pending affected-path adjudication and full check.
Next: await licensing freeze, review fixes, run focused + full integration, deliver.

Verification milestone: 11 focused browser cases passed (3.1 min). Final
synthetic licensing/calendar tests passed 25 cases. Initial licensing correction
had a same-document/different-criterion fallback defect; root bound original
fragment availability to a nonempty exact locator and optional page, with two
regressions. Final independent affected-flow adjudication passed, 32 source
pins unchanged. Full check session 69128 running: licensing, typecheck, SQLite
382 passed/2 skipped and PostgreSQL passed; 91 browser cases underway.
No runtime source edits remain planned. Docker before-data row counts and quick
check saved; volume unchanged. Delivery is still pending.

Final application verification: full pnpm check exit0, all7 lanes, 1,145 seconds.
SQLite382 passed/2 PG-only skips; PostgreSQL384 passed; browser91 passed,
including11 new cases. All249 selected source hashes match the check-start
snapshot. Final review complete/pass; six returned worker/review nodes accepted.
Delivery still pending: commit/push, labeled image, consistent SQLite backup,
rebuild/service readiness, unchanged record content/history and live browser smoke.
