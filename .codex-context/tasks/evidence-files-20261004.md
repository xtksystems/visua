# Evidence file storage

Status: implementation and verification complete; commit/push/Docker delivery active. Milestone 2 package 2 under the existing autonomous delivery authorization.

The metadata-only ledger, explicit inline detail, migration 6, scoped private local and S3-compatible adapters, verified file upload/download/review, UI roles/retry/focus behavior, and product documentation are implemented. The [run ledger](../runs/evidence-files-20261004/plan.json) accounts for accepted workers and independent reviews. All supported findings are resolved.

[Final verification](../runs/evidence-files-20261004/source-verification.json): typecheck, licensing, corpus, and design checks pass; SQLite 474 passed/2 PostgreSQL-only skips; PostgreSQL 476 passed. Browser coverage is 98 unique cases: 19 final affected reruns plus 79 unchanged full-lane passes. Earlier failures and explicit reuse remain recorded; no single final full-check command passed. Final source has 261 matching pins.

Next: commit/push source A, build its labeled Docker image, stop the old service and create a unique consistent backup, upgrade with the original volume, verify migration content equivalence and historical rows, exercise live upload/review/exact download, restart and download again, delete the synthetic workspace and its blob. Finish fan-in/delivery records and a documentation-only commit B+push. Existing Docker remains at `2ca9631` until that upgrade. Next phase package is collection origin, assurance scope, and explicit supersession.
