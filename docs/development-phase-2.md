# Development phase 2: Trustworthy evidence operations

Deliver one complete team workflow: select a gap, assign accountable work,
collect an artifact, review it, explain verified status, and hand an auditor a
verifiable package. Ship this on a safe hosted pilot before expanding the
framework catalog or integrations.

This development plan is based on the
[October 2, 2026 full application review](reviews/full-app-review-2026-10-02.md)
at commit `1dc5ed1`. The review did not implement the plan. The
startup/authentication, connector boundaries, evidence approval binding,
selection and role correctness, and keyboard workflow packages from milestone 1
are implemented and verified. Their
[startup](../.codex-context/tasks/startup-auth-20261003.md),
[connector](../.codex-context/tasks/connector-boundaries-20261003.md),
[evidence](../.codex-context/tasks/evidence-binding-20261003.md),
[selection](../.codex-context/tasks/selection-roles-20261003.md), and
[keyboard](../.codex-context/tasks/keyboard-workflow-20261003.md) task records
track verification. Milestone 2's first package is also implemented and verified;
its [member work task](../.codex-context/tasks/member-work-20261003.md) records
member assignment, calendar dates, editable task links, and My work. Later
packages remain planned work.
The [existing roadmap](roadmap.md) retains the broader backlog.

## Outcome and scope

The first pilot uses CSF and SOC 2 with the existing roles, offline test
playbooks, and OIDC. PostgreSQL remains the hosted storage path; SQLite must
continue to support local development. No current customer, deployment target,
team capacity, or delivery date has been established, so sequence work by
acceptance gates rather than a calendar promise.

The pilot is ready when an owner can provision an empty installation, a
contributor can complete assigned work and upload evidence, an approver can
accept or reject it with a traceable basis, and an auditor can verify an
exported package. Every step must work by keyboard and respect its role.

Preserve corpus citations and licenses, published node ids, scope exclusions,
tenant isolation, transaction/audit integrity, approved agent changes, distinct
threat coverage, design tokens, and the accessible 2D path. Readiness remains
an explicitly defined self-assessment measure, not a certification or audit
opinion.

## Why this phase comes next

The review compared the roadmap's main development directions. The existing
framework breadth already exceeds the evidence and team-work depth supporting
its claims.

| Direction | Decision and basis |
| --- | --- |
| Evidence and team workflow | Lead this phase. Accepted-evidence mutation and stale inspector writes are reproduced; file evidence, ownership, and auditor packaging are incomplete. |
| Safe hosting and reliable agents | Required pilot foundations. Startup, egress, stream revocation, cancellation, and multi-instance SSO cache issues directly affect the hosted workflow. |
| More connectors | Prove one API connector after evidence, provenance, egress, and credential contracts work. Avoid simultaneous provider expansion. |
| SAML and SCIM | Schedule after a concrete buyer requirement. OIDC already supports the pilot; protocol breadth does not fix current evidence defects. |
| More frameworks | Defer. Freeze obligation identifiers before any corpus refresh and reuse the completed evidence contracts when expanding. |
| New 3D features | Defer time scrubber and lineage animation. Deliver a useful 2D lineage record first and preserve current visuals. |

## Milestone 1: Safe and correct pilot foundations

Close the reproduced defects and make the existing workspace safe for a
multi-role team. Each work package can ship as a focused pull request.

1. **Startup and authentication.** Make demo seeding explicitly development-only
   by default, ensure first-owner bootstrap works with an empty production
   database, and bind developer mode to loopback. Keep the existing local
   Compose workflow working. Add database-aware readiness and graceful stop.
2. **Connector boundaries.** Reuse guarded egress for every HTTP/TLS request,
   check DNS resolution and redirects, restrict local scans to configured roots,
   prevent symlink escape, and bound time, response size, and concurrent work.
3. **Evidence approval binding.** Validate dates. Bind acceptance to the artifact
   hash, requirement links, and validity window. Changes to these fields require
   a new review; connector observations remain immutable. Preserve prior review
   history and record before/after values.
4. **Selection and role correctness.** Reset inspector state by requirement,
   make owner edits explicit, gate every mutation affordance, add default error
   handling, preserve failed deep links, and use canonical workspace identity
   for queries and events.
5. **Keyboard workflow.** Scope shortcuts to the outline/canvas, implement
   focusable tree rows and dialog focus restoration, correct tabs, and make
   requirement tags navigate to their destination.

The gate is an automated regression for every reproduced case, plus the full
local check. Tests must include cached A→B→A→B selection, Escape inside a scope
dialog, every page under viewer/auditor/contributor/approver roles, and a
workspace whose id differs from its slug. A mock production IdP and empty
PostgreSQL schema must produce a working bootstrap owner with no demo tenants.
Private/redirected connector targets and escaped scan paths must be refused.

## Milestone 2: Owned work and an evidence lifecycle

Complete the user path from a gap to a reviewed artifact. Build the evidence
contract before adding object-store adapters or new connector providers.

1. Add member-based task and requirement assignment, editable due dates,
   requirement links, and a **My work** view. Keep a documented path for an
   external owner if the pilot needs one.
2. Split evidence metadata from content. Add a blob-store interface with a
   local-development adapter and a hosted object-store adapter. Compute SHA-256
   server-side, authorize each upload/download, enforce size limits, and verify
   bytes before publishing an artifact reference. Scope references by tenant;
   do not let knowledge of a digest authorize a download.
3. Represent collection origin, immutable artifact/check reference, assurance
   scope, validity, review history, and explicit supersession. Preserve original
   source/licensing classification when an item or task is relinked.
4. Give review a detail screen with artifact preview/download, linked
   requirements, source observation, validity, and a rejection reason. Show
   verifier and date, explain unmet verification conditions, and support
   withdrawal. Define separate design, operating, and attestation evidence.
5. Define supersession by observation series or policy version. Expired
   superseded artifacts retain history but do not override a valid replacement
   from the same series. Independent failing checks still make status at risk.
6. Expose a 2D lineage record from requirement or published measure to its
   artifact, source run/check, hash, reviewer, validity, and policy version.
   Drive lenses, status, reports, and public measures from the same effective
   state at a stated time.

The gate is a browser journey for one CSF outcome and one SOC 2 criterion:
assign → upload → reject with reason → replace → accept → verify → expire →
refresh. Run storage/API cases on SQLite and PostgreSQL. Check that a different
tenant cannot obtain a blob by id or hash and that scoring reads metadata
without loading file bodies. Supersession and clock transitions need explicit
tests; do not use a manual status override to hide expired history.

## Milestone 3: Reliable automation and supported claims

Make current agents and monitoring reliable enough to support the workflow.
This milestone depends on the evidence definitions from milestone 2.

1. Add durable run ownership/leases, heartbeat, bounded concurrency, startup
   reconciliation, and graceful cancellation. Refuse steps/proposals after
   cancellation. A cancelled connector call must not keep creating proposals.
2. Recheck authorization on SSE streams, bound queues and payloads, and resync
   clients after reconnect. Version OIDC configuration caches across instances.
3. Validate proposal payloads by type and preserve immutable check references
   through approval edits. Reject fake automated-check/attestation provenance.
   Hash narrative content and distinguish generated narrative from observed
   artifacts. Keep autonomy explicit and limited to reviewed safe types.
4. Verify citation references against corpus chunks, record provenance, and
   distinguish implementation projections from observed evidence. Make weak
   crosswalk confidence reflect relationship strength and family scales; show
   mapping authority. Fix inappropriate policy-template fallbacks.
5. Key monitoring results by target/connector and check. Give public measures a
   basis and as-of time. Restrict public headlines to supported templates or
   clearly identify organization-authored statements.
6. Add body/rate limits and basic diagnostics for requests, run states,
   connector failures, queue depth, and relay reconnects. Measure the pilot's
   baseline before selecting capacity targets.

The gate is a two-instance PostgreSQL test: start on A, cancel through B, remove
a member with an open stream, replace the IdP through A, and reconnect a client
after dropped events. Assert no post-cancel proposals, no post-revocation
payloads, current provider settings, and consistent UI state. Test fabricated
citations, edited check provenance, and weak crosswalk projections separately.
Two monitored targets with opposite outcomes must both remain visible.

After this gate, a separate connector package may add one GitHub API connector
with a mock API fixture, least-privilege credentials, declared automation and
assurance scope, guarded egress, and the complete evidence lifecycle. Treat it
as a pilot extension, not a requirement to expand across every provider.

## Milestone 4: Verifiable auditor handoff

Deliver a frozen package for a chosen scope and period, with a read-only
auditor presentation. Start from the existing export capability instead of
creating a second assessment engine.

1. Package scope, current/target states, exclusions and rationale, evidence
   ids/hashes and review history, source observations, approved policy versions,
   PBC requests, and a verification manifest. Record snapshot revision and time.
2. Export audit events with entity/content digests and a chain-head checkpoint.
   Declare the checkpoint's trust boundary. An unsigned hash supplied alongside
   a package establishes consistency, not independent authenticity. Keep an
   independently retained checkpoint or signature when claiming truncation
   detection.
3. Use effective period/date scope consistently in reports and exports.
   Preserve stable export identifiers, explicit tailoring rationale, accurate
   zero-level implementation wording, and spreadsheet-safe values. Validate
   OSCAL exports against the chosen official version's schemas.
4. Provide an auditor view with no write affordances and log access/export
   events separately from assessment changes. Use Visua-authored PBC wording on
   skeleton installations; preserve licensed-text restrictions.
5. Verify backup/restore for the database and evidence blobs, and document
   deployment, upgrades, restore, authentication, and artifact retention.

The gate is one download that an auditor can inspect and verify offline,
including actual evidence files and a manifest with no missing references.
Unchanged state must have stable content and identifiers apart from explicit
generation metadata. Tests must detect tampered bytes and mismatched audit
checkpoints. Restore the package's referenced artifacts from a backup fixture.
Visua must never draft an auditor conclusion or issue a pass/certification.

## Decisions to settle during implementation

These choices affect the architecture or product contract. They do not block
the completed review and plan. The implementation owner must resolve them in
the associated work package with the accountable product/operator owner.

| Decision | Proposed starting point |
| --- | --- |
| Pilot hosting and storage | PostgreSQL plus one selected object-store adapter; local filesystem adapter for development. Confirm deployment and provider before adding infrastructure. |
| Evidence acceptance changes | Return edited acceptance-bound fields to pending review and retain the prior approval. Do not silently extend validity. |
| Evidence autonomy | Default to human review for narratives and scope decisions. Allow narrowly defined immutable check-backed automation only after explicit configuration. This tightens existing opt-in policy and needs a documented migration. |
| Separation of duties | Require a distinct approver only when the pilot's policy calls for it; make enforcement explicit rather than inferring a universal requirement. |
| Audit/artifact retention | Archive instead of erase where retention applies; choose duration, deletion rights, checkpoint retention, and restore ownership explicitly. |
| Licensed corpus entitlement | Use skeleton content for tenants without configured entitlement; preserve original source classification through relinking and model routing. |
| Hosted tenant context | Keep current route checks. Design scoped blob access now; add PostgreSQL RLS after a reviewed transaction/role design rather than treating it as an existing bug fix. |

## Deferred work and completion evidence

SAML/SCIM, questionnaire automation, additional frameworks, a visual time
scrubber, 3D lineage animation, and broad cloud/IdP/HRIS/MDM connectors remain
on the wider roadmap. Freeze law obligation identities before any refresh.
Research current official sources and licensing when a framework expansion is
actually scheduled.

The phase is complete when all four milestone gates pass and a pilot team can
complete the workflow without a side spreadsheet. Track time to first accepted
artifact, unowned/overdue work, review backlog, failed runs, and expired evidence
without replacements. Establish baselines with pilot users; no time-saving or
completion-rate measurement exists yet.

## Next action

Implement milestone 2's second package: separate evidence metadata from content,
add a blob-store interface and storage adapters, compute and verify artifact
hashes server-side, and authorize each upload and download within its tenant.

All five milestone 1 packages and milestone 2's owned-work package are complete.
The [member work task](../.codex-context/tasks/member-work-20261003.md) records
stable member assignment, an external-owner path, strict calendar dates,
editable links with retained model licensing provenance, and My work.
The full local check passes all seven lanes: 382 SQLite tests (two
PostgreSQL-only skips), 384 PostgreSQL tests, and 91 browser cases. Other phase
packages remain open; starting another package requires a development request.
