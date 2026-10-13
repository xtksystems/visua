# Complete trustworthy evidence operations

Status: active. The user requested all remaining work in logical order,
autonomously. The visual review is complete and locally deployed. Continue the
remaining [phase 2 plan](../../docs/development-phase-2.md), preserving the prior
commit/push/local Docker delivery workflow after verified milestones.

## Ordered work

The current plan puts evidence definitions before automation and auditor outputs.
An inventory of existing code/tests will refine each package without repeating
work that already satisfies its acceptance criteria.

| Order | Package | State and dependency |
| --- | --- | --- |
| 1 | Collection provenance, assurance scope, and licensing preservation | Complete; final source gate passed |
| 2 | Fixed review detail, rejection reasons, and withdrawal | Complete; latest decision and artifact scope bound |
| 3 | Explicit/series supersession and shared effective evidence state | Complete; accepted replacements checked per requirement |
| 4 | Metadata-only 2D lineage and full CSF/SOC 2 lifecycle journey | Complete; CSF/SOC2 browser journeys passed |
| 5 | Durable agent ownership, leases, cancellation, and concurrency | Complete; tested, pushed and locally deployed |
| 6 | Stream authorization, bounded queues, reconnect, and current OIDC settings | Complete; tested, pushed and locally deployed |
| 7 | Typed proposals, supported citations/claims, and monitoring identity | Complete; strict payloads, verified quotes, deterministic projections and distinct monitoring |
| 8 | Request limits and operational diagnostics | Complete; bounded requests and private aggregate diagnostics, capacity unmeasured |
| 9 | Frozen auditor package, manifest, chain checkpoint, and offline verification | Implemented and verified; local delivery pending |
| 10 | Period-correct exports, schema validation, and read-only auditor access | Isolated implementation;35 export tests pass, HTTP/UI integration running |
| 11 | Database/blob backup and restore plus operator runbook | Isolated implementation;7 SQLite/local-blob recovery tests pass, runbook pending |
| 12 | Full phase acceptance, commit/push, and local Docker delivery | Queued; independent review and applicable checks before delivery |

The broader roadmap retains explicitly deferred SAML/SCIM, catalog expansion,
questionnaire automation, 3D replay/lineage, and broad provider integrations.
A hosted pilot needs an operator-selected target, identity configuration,
credentials, retention policy, and pilot team; none is established. Build and
verify the local/portable contracts first. Do not claim a hosted deployment,
real-provider integration, or user-study outcome from mocks or local checks.
The optional GitHub connector follows the phase gates as a separate extension.

## Execution and invariants

The [run ledger](../runs/evidence-operations-20261013/plan.json) owns worker briefs,
source snapshots, handles, and result accounting. The
[lifecycle contract](../runs/evidence-operations-20261013/lifecycle-contract.md)
sets acceptance for the first four packages. Backend owns core/server; UI owns
web and lifecycle-related browser fixtures; lead owns agent licensing, docs,
integration/review, and delivery. The inventory worker is read-only except for
its assigned reports. Existing unrelated diagnostic files remain untouched.

Preserve canonical workspace authorization, artifact byte/hash integrity,
fixed review snapshots, append-only audit/review history, original licensing
classification, user scope exclusions, and accessible keyboard/mobile workflows.
An agent narrative, mapping, or approved policy must not masquerade as an
observed operational check. No live database writes occur during implementation.

## Verification and next action

The [M2 source verification](../runs/evidence-operations-20261013/source-verification.json)
records 650 SQLite passes, 652 PostgreSQL passes, and 146 verified browser cases.
The 142 full-lane browser passes, 15 affected passes, and final 32 dialog passes
cover every case; no single final full-check command passed. The final database
lane, typecheck, corpus verification, and design lint passed after all product
corrections. Independent review and desktop/phone inspection are complete.

M2 delivered: `3c85ef4` is pushed and deployed locally. All 190 runtime source
pins match, original rows are preserved, and the live lifecycle workflow and
desktop/phone inspection passed. See the
[delivery record](../runs/evidence-operations-20261013/lifecycle-delivery.json).

M3 is delivered: source `dc5e68c`, delivery docs `de3d02c` pushed; Docker source
matches all 196 pins. Final checks passed 798 SQLite plus seven PostgreSQL-only
skips, 805 PostgreSQL, and 148 unique browser cases through full and targeted runs.
Synthetic events were corrected to carry canonical IDs. Live autonomy/public
measures, original assessment preservation, and desktop/phone checks passed.
Expected smoke effects are one sign-in session/timestamps and workspace deletion
event. See [source verification](../runs/evidence-operations-20261013/automation-source-verification.json)
and [delivery](../runs/evidence-operations-20261013/automation-delivery.json).

M4 is integrated and verified in root. Final checks pass 883 SQLite tests plus
nine PostgreSQL-only skips and 892 PostgreSQL-lane tests. All 152 browser cases
are verified: 151 in the full run and two final targeted passes after draining
pending mock responses before fixture teardown. Product source stayed unchanged.
Three independent reviews produced six supported findings, now fixed; the runbook
review found no errors. See [verification](../runs/evidence-operations-20261013/auditor-source-verification.json).
Next: commit/push, build candidate image, stop writers, capture and verify a fresh
SQLite+referenced-blob backup, redeploy, verify migration/data/source preservation,
and download/verify the live package as an auditor on desktop and phone.

Actual hosted pilot setup and representative capacity/user measurements remain
external prerequisites, not passed local gates. Explicitly deferred expansions
and the optional GitHub connector are outside these required phase packages.
