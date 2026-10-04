---
system: "codex-context"
session_id: "20261004T005540Z-feat-light-workspace-design-4e69991a003e"
created_utc: "2026-10-04T00:55:40+00:00"
updated_utc: "2026-10-04T03:26:01.747538+00:00"
task: "Evidence file storage, autonomous commit/push and Docker delivery"
status: "active"
repo_root: "/Users/artem/visua"
worktree_id: "fbce6dbefa7b12a8"
branch: "feat/light-workspace-design"
head: "3b50f1b001ba2ca9905f67cd0b0082830d75cca1"
---

# Evidence file delivery checkpoint

Resume milestone 2 package 2 under existing autonomous commit/push/local Docker authorization. [Task](../tasks/evidence-files-20261004.md), [run](../runs/evidence-files-20261004/plan.json). Runtime and product documentation implemented. All five worker/review nodes accepted; root delivery remains pending.

Final source `final-delivery-source.json`: 261 pins match; final source correction and UI reviews pass. Initial four findings fixed, plus malformed filename normalization before PostgreSQL persistence. Late UI correction registers review onError at the hook so inline alert appears once; success/error callbacks guard the keyed dialog lifetime. Readiness fixture mocks recovery after a held query rather than requiring real SQL to finish in 10ms.

Final source verification is complete. Clean `pnpm check --no-e2e` passed all six non-browser lanes in 122s: 474 SQLite passes/2 PostgreSQL-only skips and 476 PostgreSQL passes. Final affected browser run passed all 19 in 4.2m, including stale review and the renderer-crash retry. The full browser run's 79 unaffected passes remain valid under the documented narrow delta. No single final full-check command passed all seven lanes. [Verification](../runs/evidence-files-20261004/source-verification.json), source reuse and prior failure records are durable.

Delivery next: update roadmap/project, refresh own staging, commit and push source A. Build Docker with VISUA_REVISION=A. Existing service still runs `2ca9631`, image cd247de52c86, volume visua_visua-data. Capture latest baseline, stop service, create unique `/app/data/evidence-files-20261004-backup.db` with docker-backup.mjs using old image/volume. Copy/verify ignored host backup. Bring up new image using the same volume. Run prepared DB preservation/source-check/live UI smoke scripts, restart, repeat exact download and review checks, delete synthetic workspace and only its blob. All original hydrated evidence and historical rows must match backup.

Finish root result/plan integration/fan-in and delivery records, then documentation-only commit B+push. Docker may retain source A because B changes no runtime. Leave unrelated `.codex-context/runs/visual-design-review-20261003/` and `.codex-context/sessions/20261004T010233Z-feat-light-workspace-design-1d5fba304135.md` untouched/untracked. Logs, traces, data, backups and restricted corpus files stay ignored.
