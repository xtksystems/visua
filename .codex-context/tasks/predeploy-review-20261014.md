# Predeployment review and live deployment plan

Status: review and plan delivered with an explicit independent security gap;
live deployment held. Reviewed source at `cb438d1` before deployment to the user's tenant.
The user requests multiple independent agents across all dimensions, then a live
deployment plan. This task does not deploy or change product behavior.

Run: [plan](../runs/predeploy-review-20261014/plan.json).

## Acceptance

Collect six independent bounded reviews: security, integrity, automation,
product/accessibility/performance, corpus/claims/licensing, and operations.
Run a fresh full local check on disposable fixtures and review dependency risk.
Adjudicate supported findings with source or isolated reproductions; preserve
failures and omissions. Deliver a prioritized report and sequenced deployment
plan with acceptance/rollback gates and unresolved operator inputs.

## Outcome and verification

The [review](../../docs/reviews/predeployment-review-2026-10-14.md) records eleven
supported findings: one conditional high, nine medium, one low. Five of six
independent application reviews returned; the security worker stopped under a
platform cybersecurity safety restriction without a report. It was not retried
or redirected. Lead source inspection is not a substitute security signoff.
A seventh agent independently reviewed the
[original Google Cloud plan](https://github.com/xtksystems/visua/blob/e3149dd11f1fa67b4955b4eec3d998aa82be284e/docs/live-deployment-plan.md) and found no supported
technical errors within its bounded scope.

Fresh `pnpm check`: typecheck, licensing, corpus/design, 944 SQLite tests and 953
PostgreSQL tests passed; nine PostgreSQL-only skips in SQLite. Browser results:
151 passed, one mobile-history keyboard-scroll failure. One targeted rerun failed
at the same assertion. T01 remains unresolved. A fresh portable two-process
PostgreSQL/MinIO/mock-OIDC rehearsal passed, including recovery. F02/F03 also
reproduced in the existing image's Node 22 runtime. No source was changed.

## Constraints and next actions

Preserve all current data, the local service, untracked diagnostics, and source.
No application edits, actual provider mutations, or public deployment in this pass.
Use native agents only. The user selected new Google Workspace identity and
Cloudflare DNS and requested Google Cloud project/billing setup. Domain names
will be supplied later. Region/residency, workload, budget, and operators remain
open; no cloud resources were created.

1. In a subsequent implementation task, fix F01 admission and F02/F03 database
   failure handling; diagnose T01, retaining both failures as baseline evidence.
2. Resolve F04–F11 with targeted regressions and a fresh full check. Obtain the
   missing independent security assessment; do not label this review a pass.
3. Supply deployment inputs, price the infrastructure, and prepare staging.
   Execute real-provider, recovery, and pilot gates before admitting evidence.

Subsequent steering selects XTK Systems office hosting for three users. The
[office planning task](office-deployment-plan-20261014.md) and
[current deployment plan](../../docs/live-deployment-plan.md) own that revision;
the review findings and original worker artifacts above remain historical evidence.
