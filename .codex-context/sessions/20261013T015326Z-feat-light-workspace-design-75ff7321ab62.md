---
system: "codex-context"
session_id: "20261013T015326Z-feat-light-workspace-design-75ff7321ab62"
created_utc: "2026-10-13T01:53:26+00:00"
updated_utc: "2026-10-13T02:32:34.977218+00:00"
task: "Observatory presets and selection context"
status: "complete"
repo_root: "/Users/artem/visua"
worktree_id: "fbce6dbefa7b12a8"
branch: "feat/light-workspace-design"
head: "9755c01873444647c30821ac1d0b88aa16023632"
---

# Observatory presets and selection context

## Outcome and delivery

User requested commit/push renewal, then the next visual-review task. The later
remaining-tasks question was answered while implementation continued.
Evidence renewal is committed and pushed as `9755c01`; all 282 prior source hashes
matched before commit. Docker still runs `e867494`. Observatory is now complete,
verified, uncommitted and not deployed.

[Task](../tasks/observatory-20261013.md),
[run ledger](../runs/observatory-20261013/plan.json), and
[verification](../runs/observatory-20261013/source-verification.json) record scope
and results. All four delegated results are accounted for; no worker is active.

## Implemented and verified

At risk, Missing evidence and Assigned to me presets use fresh assessed scope,
accepted direct evidence and stable member IDs. Presets/search/selection persist
in the URL. Context rows don't inflate counts. Labeled legends remain visible;
selected paths and sibling navigation work above the mobile inspector sheet.
Fresh framework metadata avoids the hourly cache's expiry lag. Query placeholders
don't cross workspace/framework identities. Threat catalogs remain coverage views.

540 SQLite tests (+2 skips), 542 PostgreSQL tests, licensing, corpus, design and
typechecking pass. All 123 browser cases passed in the full run; all 13 affected
cases passed again after final focus corrections. No single full-browser command
ran after those corrections. Desktop and touch-phone captures were inspected.
All 287 final source/config/test hashes match `delivery-source.json`.

Independent review found keyed inspector focus loss, then a stale request after
plain-text blur; both were reproduced and fixed. Fast keyboard validation also
exposed stale route composition and pre-existing delayed slash focus. Final
search, canvas, deep-link, closed-outline and inspector focus cases pass. Failed
and trial results are preserved in the run ledger and debugging record.

## Next action and retained artifacts

Next visual-review implementation: Crosswalk comparison matrix. Then Plan
urgency list/due-only timeline, CSF profile charts and separate tier tab, full
agent stages, and broader visual/accessibility polish. Trends need snapshots.

Review and commit/push the Observatory package when requested. It has no deployment.
Keep old raw traces/harnesses and original design concept/handoff unstaged. Do not
copy the older renewal worker checkout over main. No process/worktree cleanup
was performed. The current main checkout is authoritative.
