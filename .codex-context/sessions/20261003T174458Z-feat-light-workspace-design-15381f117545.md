---
system: "codex-context"
session_id: "20261003T174458Z-feat-light-workspace-design-15381f117545"
created_utc: "2026-10-03T17:44:58+00:00"
updated_utc: "2026-10-03T18:08:57.470903+00:00"
task: "Connector boundaries"
status: "complete"
repo_root: "/Users/artem/visua"
worktree_id: "fbce6dbefa7b12a8"
branch: "feat/light-workspace-design"
head: "c8a1ed06a8043fe725381ccccd89779b6a3498e0"
---

# Connector boundaries handoff

## Objective and outcome

Completed milestone 1 package 2 after the user requested the next task.
[Task](../tasks/connector-boundaries-20261003.md);
[run ledger](../runs/connector-boundaries-20261003/plan.json).
Earlier startup/authentication work remains uncommitted and is preserved.

## Changes and evidence

Public-only guarded HTTP/TLS now covers every web probe and redirect. Shared
budgets cap runs, deadlines, and bytes. Async repository scans use per-runtime
operator roots, skip links/special files, and warn on incomplete coverage.
Hosted/OIDC defaults to no scan roots. DNS and filesystem work retain their
capacity after caller cancellation until physical cleanup completes.

Final full check passed all seven lanes in 182 seconds: SQLite 299 + 2 skips, PostgreSQL 301,
Playwright 23, typecheck, licensing, corpus, and design. Exact command and source
snapshots are in the [verification record](../runs/connector-boundaries-20261003/verification-summary.json).
Fresh review reproduced a DNS capacity gap; targeted follow-up closed it and
an introduced synchronous cancellation race, with 90 affected tests passing.
[Final review](../runs/connector-boundaries-20261003/fix-review.json) has no
unresolved findings. All three native nodes returned and were accepted;
Worker IDs are /root/repo_boundaries and
/root/connector_review. No workers remain active. Earlier check failures and
pre-fix passes are historical; final source/tests match the delivery snapshot.

## Constraints and decisions

No commit, push, PR, or deployment. Existing Docker at localhost:8787 remains
healthy and uses October 2 source. No connector private-host exception; SSO
exceptions are preserved. `VISUA_REPO_SCAN_ROOTS` is an operator JSON allowlist.
Parent directories must be trusted: portable Node cannot eliminate ancestor
replacement races. In-flight kernel calls can exceed 15 seconds cancellation; caller
wait is bounded at 30 seconds. This repo's oversized framework JSON correctly produces
a secret-scan warning with no findings, rather than a misleading pass.

## Next action

Milestone 1 package 3: evidence approval binding. Validate dates; bind acceptance
to artifact hash, links, and validity window; require new review on changes;
preserve review history and immutable connector observations. All current
changes remain unstaged/uncommitted. No remaining work in this package.
