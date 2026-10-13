---
system: "codex-context"
session_id: "20261013T064241Z-feat-light-workspace-design-19c0d5334d10"
created_utc: "2026-10-13T06:42:41+00:00"
updated_utc: "2026-10-13T08:55:07.600434+00:00"
task: "Complete remaining trustworthy evidence operations autonomously"
status: "active"
repo_root: "/Users/artem/visua"
worktree_id: "fbce6dbefa7b12a8"
branch: "feat/light-workspace-design"
head: "b34cf1fe846920c98aa71df3121712284880dc1a"
---

# Autonomous evidence operations

Continue docs/development-phase-2.md M2 → M3 → M4. The user authorized ongoing
implementation, commit/push, and local Docker deployment. The visual review is
complete. Deferred catalog/provider expansion stays deferred; hosted pilot needs
an operator target/configuration/team. Do not stop after the M2 milestone.

Run: ../runs/evidence-operations-20261013/plan.json. Inventory accepted.
M2 lifecycle is source-verified and staged for commit. Final source hashes are in
lifecycle-final-source.json. Final pnpm check --no-e2e passes: SQLite650 +2 PG-only
skips, PG652, typecheck, corpus, licensing, design. Browser coverage146 unique
cases via full142-pass run plus targeted reruns; final32 dialog cases all pass.
No single final full-check command passed. Details: source-verification.json.
Independent review findings fixed: stale review after withdrawal and validity
before acceptance. Lead also fixed agent review proposal expectedReviewId binding,
restricted-title renewal task laundering, and closed-details focus trapping.
Desktop and phone lifecycle captures inspected.

Backup exists at /app/data/evidence-lifecycle-20261013-backup.db and ignored
local data/deployment-backups/evidence-lifecycle-20261013-backup.db (mode600).
Matching hashes in docker-backup.json; do not rerun the create-only backup script.
Original:1 workspace,1487 states,18 tasks,18 inline evidence,0 files,2 tenants,
9 memberships,112 activity. No new migration. Next: commit/push explicitly staged
86 paths, build with commit revision, deploy, run docker-preservation.mjs before
live smoke, docker-source-check.mjs (190 pins), live-lifecycle-smoke.mjs, inspect
screenshots, verify cleanup and original data. HEAD/origin b34cf1f before commit;
previous deployed source783ed28. Preserve volume and unrelated diagnostics.

M3 is ONLY in .check/evidence-automation-20261013 (detached b34cf1f plus M2
overlay). Baseline automation-worktree-baseline.json. Never copy its whole diff:
it includes inherited M2 and lacks later root modal/selector/ledger fixes.
Run reliability, stream/auth, and corpus-claims workers are complete, reports and
source hashes available in root run, not accepted/integrated yet. Run lane30
focused tests; stream lane68 plus HTTP shutdown; corpus lane98 and3 typechecks.
Some PG cases are authored but not run. Run backend carried latest M2 proposal
review binding into isolated visua.ts; distinguish carried root changes.

Fresh automation_boundary_review is active (native handle /root/automation_boundary_review).
Confirmed oldest256 active-run scan starvation using actual in-memory store;
repro in automation-review-reproductions/scheduler-starvation.mjs. Review also
examines inherited relay send-gap omission. Await final report before fixes.

Lead M3 strict schema work in isolated proposal-validation.ts and test, visua.ts,
SettingsPage.tsx: 5 early pure tests pass; latest envelope/projection/service/UI
integration unverified. Strict payload/envelope/citations; projection recomputed
from current enabled sources/mappings; autonomy only create-task and immutable
check-backed create-evidence. Still preserve projection on approval edits, adapt
legacy test fixtures to strict contract, test combined changes. No root M3 edits.

After M2 deployment: integrate M3 owned deltas, complete monitoring/limits and
real two-instance PG gates, review/test/commit/deploy. Then frozen auditor bundle,
exports/access/restore. Keep original scope/invariants; no live test database.
