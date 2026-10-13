# Visual review implementation plan

This plan completes the October 2026 visual review: every view explains what
needs attention, why it matters, and the next action. The user authorized the
remaining work to proceed autonomously on October 13, 2026 UTC. The review is
expert design feedback, not a user study; concept data is illustrative.

## Completed foundation

The first five prioritized packages are implemented. Deployment is tracked
separately from implementation so local previews don't imply a live release.

| Package | Implementation | Delivery |
| --- | --- | --- |
| Implementation progress, valid evidence coverage, and requirements at risk | Complete, with scope and calculation details | Pushed and locally deployed in `e867494` |
| Overview attention queue across enabled frameworks | Complete | Pushed and locally deployed in `e867494` |
| Exact proposal changes and batch approval preview | Complete | Pushed and locally deployed in `e867494` |
| Evidence renewal and coverage impact | Complete | Pushed in `9755c01`; not deployed |
| Observatory presets, labeled legend, and selection context | Complete and verified | Uncommitted; not deployed |

The [Observatory record](../.codex-context/tasks/observatory-20261013.md) links
its final validation. Existing changes form the starting point for this plan.

## Execution order and results

All six packages below are implemented and verified in the working tree.
They remain uncommitted and undeployed. The order records their dependencies.

| Order | Package | Status | Acceptance criteria |
| --- | --- | --- | --- |
| 1 | Crosswalk comparison | Complete and verified | Choose source/target frameworks; compare exact mapping counts in an accessible matrix; inspect relationships, direction, authority, and sources; select evidence to see its direct requirement links across frameworks. Preserve mapping versus accepted proof. Keep the Nexus as an alternate view. |
| 2 | Plan urgency | Complete and verified | Default to an urgency-sorted list; expose blocked and review work with persistent status counts; retain Board and Timeline; include due-date-only tasks; keep role, assignment, details, and keyboard behavior. |
| 3 | CSF profile | Complete and verified | Give current/target/gap rows more width; add sorting and requirement drill-down; keep an accessible numeric equivalent; put tier assessment in a separate tab. |
| 4 | Agent stages and decisions | Complete and verified | Show Collect → Analyze → Propose → Review → Apply using observed run/proposal events; show blockers and terminal outcomes; qualify assessments and foreground sources; retain exact-change approvals and flight recorder details. |
| 5 | Visual and accessibility consistency | Complete and verified | Reduce avoidable card nesting; align comparable values; use readable primary text, direct chart labels and table/list alternatives; foreground provenance and observation age; use purposeful reduced-motion-aware feedback. Audit the changed flows on desktop and touch phone. |
| 6 | Reliable history and trends | Complete and verified | Record score snapshots with observation time, scope/target identity, formula version, denominators, and workspace isolation. Show only recorded history; mark scope/target changes and gaps. Do not invent or backfill a historical curve from current state. |

Crosswalk and Plan come first because they complete the remaining prioritized
attention and comparison views using existing domain records. CSF and agent
work then refine analysis and decisions. The consistency pass covers those
finished flows. Historical trends come last because their data contract must
exist before a chart can make a trustworthy comparison.

## Boundaries and verification

Preserve tenant isolation, server capability checks, canonical workspace IDs,
transactional audited mutations, fixed approval snapshots, and token-based
proposal approval. Evidence coverage requires directly linked valid accepted
proof; parent links and mappings do not confer coverage. Threat catalogs remain
coverage views. Reuse ingested requirement text and mapping authority, respect
licensed corpus exclusions, and use design tokens.

For each package, run meaningful domain/UI tests and relevant typechecking.
Run the applicable local integration lanes, browser workflows, and desktop/
touch-phone checks on the combined final source. Use an independent review for
consequential semantic changes and resolve supported findings. Record exact
source identities and distinguish reused results from newly executed checks.

The [completed task](../.codex-context/tasks/visual-followthrough-20261013.md) and
[run ledger](../.codex-context/runs/visual-followthrough-20261013/plan.json) track
implementation, workers, findings, and verification. The broader
[development phase](development-phase-2.md) remains separate: provenance,
supersession, hosted operations, and connector expansion are not silently
included in this visual-review plan.

## Verification and remaining delivery

No implementation items remain in this visual review. The
[verification record](../.codex-context/runs/visual-followthrough-20261013/source-verification.json)
records 626 passing SQLite tests (two PostgreSQL-only skips), 628 passing
PostgreSQL tests, and 138 verified browser cases. Browser evidence combines
136 full-run passes with four final affected reruns; the two full-run failures
were corrected test assumptions about native keyboard focus and intentional
local scrolling. No single final full-check command passed. Typechecking,
licensing, corpus hashes, and design lint passed. Desktop and touch-phone
captures were inspected, and five independent-review findings were resolved.

Remaining delivery is to commit, push, and deploy the uncommitted Observatory
and follow-through packages. Evidence renewal is already pushed but also
awaits deployment. The recorded local deployment remains `e867494`; this work
did not change its database. History begins with real observations after
capture is enabled; migration 7 does not backfill earlier scores.
