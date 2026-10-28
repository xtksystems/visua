---
system: "codex-context"
session_id: "20261014T013036Z-feat-light-workspace-design-196147ed6a1f"
created_utc: "2026-10-14T01:30:36+00:00"
updated_utc: "2026-10-14T01:53:22.254064+00:00"
task: "Prepare portable hosted pilot validation"
status: "complete"
repo_root: "/Users/artem/visua"
worktree_id: "fbce6dbefa7b12a8"
branch: "feat/light-workspace-design"
head: "0af95208b3b87150290bce7683ef0bd11b0670e7"
---

# Portable pilot preparation delivered

The [task](../tasks/pilot-readiness-20261013.md) and
[run ledger](../runs/pilot-readiness-20261013/plan.json) record completed portable
preparation. All three native nodes are accepted; no worker remains active.
Source `0af9520` is committed, pushed, and locally deployed at localhost:8787.
Final documentation records its delivery; no additional deployment is needed.

## Behavior and verification

`pnpm pilot:preflight` inspects intended environment without provider access,
credential resolution, or value/secret output. It keeps external checks required.
`pnpm pilot:rehearse` creates owned PostgreSQL/MinIO resources and two application
processes with production authentication mode and a local mock IdP.

[Final source checks](../runs/pilot-readiness-20261013/source-verification.json)
pass 944 SQLite tests plus nine PostgreSQL-only skips, 953 PostgreSQL-lane tests,
and typecheck/licensing/corpus/design checks. Focused utility suites pass 61 tests.
No web code changed, so browsers were not rerun. The actual HTTP rehearsal covers
four roles, 167 requirements, a 64 KiB binary artifact, and 80 reads at concurrency
4 with no errors. Fresh SQL/object-prefix recovery preserves all exported entity
digests, reviews, audit checkpoint, access records, and encrypted organization
SSO. New auditor packages verify offline against retained receipt pins.

The independent review found incorrect partial-startup cleanup reporting and
bracketed issuer wildcard interpretation. Both are fixed with reproduced failure
cases and passing rechecks. Initial fixture-only field/argv-path failures remain
recorded; final relevant checks pass. Disposable resources and credentials are
removed, while private rehearsal artifacts remain under ignored `.check/pilot-*`.

## Local delivery

[Delivery](../runs/pilot-readiness-20261013/delivery.json) confirms 209 matching
source hashes, working image preflight, root HTML/readiness, and every database
table unchanged after the upgrade. The original `visua_visua-data` volume remains.
The new quiesced backup directory is
`/app/data/pilot-readiness-20261014-backup`, privately copied under ignored
`data/deployment-backups/`. Its SQL SHA-256 begins `119ba241`. No migration or
sign-in/assessment mutations were needed. Do not overwrite retained backups or
repeat this completed deployment.

## Remaining external work

The [pilot worksheet](../../docs/pilot-acceptance.md) lists actual hosted setup,
TLS/IdP/IAM/provider recovery, retention ownership, sustained capacity testing,
and pilot-team acceptance in order. Hosting target, public domain, and identity
provider were requested asynchronously; no answer has arrived. Local fixtures
do not establish these outcomes. Optional provider/catalog/SAML/SCIM/3D expansion
remains separately deferred. Human time savings are unmeasured.

Next: use the operator's target/domain/IdP details when supplied, then follow the
worksheet. No portable implementation or delivery task remains. Historical
untracked review/diagnostic files are untouched; use explicit staging.
