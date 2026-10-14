# Prepare portable hosted pilot validation

Status: complete for portable preparation; committed, pushed, and locally deployed.
The user requested continued autonomous work after delivery of
the phase 2 software. This package prepares and exercises the remaining portable
operational checks. Actual hosted deployment still needs a target, public domain,
identity provider, and accountable owners; those details were requested.

## Ordered work and acceptance

The [run ledger](../runs/pilot-readiness-20261013/plan.json) tracks workers and
source identities. The local service on port 8787 and its data remain separate
from this disposable rehearsal.

1. Add a read-only, secret-safe preflight for an empty hosted installation.
   Report configuration gaps and external validation requirements separately.
2. Rehearse production-mode authentication and a CSF/SOC 2 evidence workflow
   against new PostgreSQL and S3-compatible containers with a local test IdP.
   Exercise owner, contributor, approver, and auditor access through real HTTP.
3. Record bounded concurrent-request latency and failure counts with the exact
   fixture size, process count, and workload. Do not infer hosted capacity.
4. Stop all fixture writers, dump and restore PostgreSQL into a fresh database,
   copy and verify referenced object bytes into a separate prefix, then check
   restored reviews, audit continuity, OIDC, downloads, and auditor exports.
5. Review isolation, cleanup, secret handling, and claimed coverage. Run the
   applicable repository checks, document commands and results, and commit/push.

## Constraints

Use generated fixture credentials and owned disposable resources only. Never
read another project's configuration or reuse its live containers. The test IdP
and loopback HTTP exceptions are local fixtures, not deployable identity service
configuration. Keep secrets and backup bytes in private ignored directories.
Preserve the actual application's authorization, licensing, and review rules.

Operator retention/deletion policy, real provider recovery, HTTPS/identity setup,
and pilot-user acceptance cannot be inferred from a local rehearsal. Optional
provider/catalog/identity expansion remains separately deferred. Human time
savings are unmeasured.

## Verification and remaining work

The [source verification](../runs/pilot-readiness-20261013/source-verification.json)
records 944 SQLite passes plus nine PostgreSQL-only skips, 953 PostgreSQL-lane
passes, and typecheck/licensing/corpus/design passes. No web code changed, so the
browser suite was not repeated. The two focused utility suites pass 61 tests.

The [final rehearsal](../runs/pilot-readiness-20261013/rehearsal-release-result.json)
passes with two application processes, four OIDC roles, 167 requirements, one
64 KiB binary artifact, and 80 reads at concurrency 4 with no failed responses.
Database/object restoration preserves all exported entity digests, reviewed
bytes, audit checkpoint, access records, and encrypted organization SSO. All
owned disposable containers and temporary credentials were removed.

Independent review found two supported defects: partial startup cleanup reporting
and bracketed issuer wildcard interpretation. Both are corrected and reproduced
in regression checks. No supported finding remains open.

Source `0af9520` is pushed and running in the local Docker service. All 209
runtime/tooling source hashes match. A fresh quiesced backup verifies, its private
host copy matches, and every database table is identical after deployment. The
image's preflight command correctly rejects the local development environment
as a hosted profile. See the
[delivery record](../runs/pilot-readiness-20261013/delivery.json).

Actual hosted target, public domain, IdP, owners, retention decisions, sustained
capacity testing, and pilot-team acceptance remain outstanding. The
[pilot worksheet](../../docs/pilot-acceptance.md) records these in order. No
external inputs have been supplied in response to the pending question.
