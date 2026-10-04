# Member assignment and My work

Status: complete. Implemented milestone 2 package 1, committed and pushed the
accumulated changes, and updated local Docker under the user's authorization.

Stable tenant member identities now assign requirements and tasks. External
owners remain supported. Calendar dates and task links use explicit drafts;
My work follows the signed-in user's identity and live status changes. Relinking
preserves model licensing provenance. Tenant, role, audit, selection, keyboard,
and design contracts remain enforced.

The [run plan](../runs/member-work-20261003/plan.json) accounts for all seven
accepted worker/integration/review nodes. Server and Plan workers implemented
bounded areas; root integrated shared controls, queries, inspector, demo
compatibility, browser coverage, documentation, checks and delivery. Independent
review found relinked licensing, due-day scoring, and live status invalidation
issues; all were corrected and adjudicated. A followup source-fragment fallback
issue was also fixed. Earlier browser label failures were corrected before the
final check. See the [review adjudication](../runs/member-work-20261003/review-adjudication.json).

The [full check](../runs/member-work-20261003/verification-summary.json) passed
all seven lanes in 1,145 seconds: SQLite 382 passed with two PostgreSQL-only
skips, PostgreSQL 384 passed, and 91 browser cases including 11 new cases. All
249 checked source pins remain unchanged. Focused licensing/calendar cases and
strict browser-spec typechecking also passed. The final independent review
passed on 32 unchanged pins; orchestration fan-in passed with seven accepted nodes.

Source commit `2ca9631` includes this package and five previously completed,
uncommitted milestone 1 packages. It was pushed to `origin/feat/light-workspace-design`.
The [Docker delivery](../runs/member-work-20261003/delivery-result.json) passed:
healthy service at <http://localhost:8787>, revision-labeled image matching the
pushed source, 142 matching runtime source hashes, consistent SQLite backup,
verified existing data and audit history, and live assignment/date/link/My work
browser smoke. The disposable test workspace was removed; the organization's
audit retains its deletion event.

Migration 5 preserved all 18 evidence records and their content and prior
decision details, computed verified artifact hashes, and returned legacy
approvals to pending review. All 88 historical activity records are unchanged;
18 migration events extend the workspace chain, which verifies 97 sequenced
events. Local developer sign-in and offline agents remain configured.

Delivery documentation follows the source commit in a separate pushed commit.
No requested work remains. Next development package is milestone 2 package 2:
separate evidence metadata/content, introduce blob storage adapters, verify
artifact bytes, and authorize tenant-scoped uploads and downloads.
