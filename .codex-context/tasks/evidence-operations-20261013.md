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
| 5 | Durable agent ownership, leases, cancellation, and concurrency | Implemented in isolated checkout; integration/review pending |
| 6 | Stream authorization, bounded queues, reconnect, and current OIDC settings | Implemented in isolated checkout; integration/review pending |
| 7 | Typed proposals, supported citations/claims, and monitoring identity | In progress in isolated checkout; service validation and corpus claims |
| 8 | Request limits and operational diagnostics | Queued; expose measured facts without invented capacity claims |
| 9 | Frozen auditor package, manifest, chain checkpoint, and offline verification | Queued; depends on effective evidence and immutable source references |
| 10 | Period-correct exports, schema validation, and read-only auditor access | Queued; preserve stable identifiers and licensed content restrictions |
| 11 | Database/blob backup and restore plus operator runbook | Queued; use isolated fixtures and keep live data intact |
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

M2 commit/push/local delivery is next; prior deployed source remains `783ed28`.
A consistent backup and identical ignored local copy are already verified. Root
application source is frozen for delivery. Automation workers use isolated
`.check/evidence-automation-20261013`; integrate only their owned changes against
the recorded M2 overlay, preserving later lead corrections. Durable runs and
stream/auth workers returned focused passes; independent boundary review and
combined PostgreSQL/browser verification remain open. Lead is integrating strict
proposal validation; corpus claims work is finishing focused tests.

Continue the remaining automation and auditor packages after delivery. Actual
hosted pilot setup remains an external prerequisite, not a passed local gate.

M2 delivered: `3c85ef4` pushed and deployed locally. Source190 pins, original
rows, live lifecycle workflow, desktop/phone inspection and cleanup passed.
See `../runs/evidence-operations-20261013/lifecycle-delivery.json`. M3 continues
in the isolated checkout; independent review found scheduler scan starvation
and lost publisher notifications, both assigned for correction before its gate.
