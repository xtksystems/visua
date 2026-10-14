# Evidence lifecycle contract

Complete milestone 2 packages 3–6 before reliable automation and auditor exports.
This is an application contract, not an external compliance claim. Preserve all
existing artifact hashes, file authorization, review snapshots, source licensing,
workspace isolation, transactional audits, and approval-preview tokens.

## Domain and compatibility

New evidence records carry server-owned collection provenance: origin, recording
actor/time, original content requirement ids, and applicable immutable check-result,
agent-run/proposal, or approved-policy id/version/hash references. Never infer an
old artifact's provenance from its current links. Existing records without this
metadata are visibly "not recorded"; do not retroactively certify them. Keep
artifact bytes/body reads out of ledgers, scoring, and lineage metadata responses.
Preserve a union of content requirement ids when links change, for model licensing.

Define assurance as design, operating, attestation, or unspecified, with a bounded
plain-language scope and optional observation period. Validate periods and bind
assurance, origin references, and explicit replacement relationships into the
review snapshot. Metadata changes affecting that scope return approval to pending.
Acceptance still does not certify that an artifact is sufficient for an audit.
A file labeled attestation is an uploaded assertion, not independently verified
identity or automated observation. Agent narrative must not claim to be a connector
check or human attestation. Only stored checks can generate automated-check proof.

Server and core owner finalizes exact TypeScript names and API shapes promptly in
api-contract.json and informs the UI owner. Extend existing core helpers rather
than introduce competing evidence validity engines. Avoid a storage migration
if optional metadata and explicit legacy fallbacks preserve old records safely.

## Review and replacement

Approvers can accept/reject a fixed inspected snapshot; rejection requires a
reason. Add explicit withdrawal with a required reason and append-only history.
Contributors can edit assurance and links subject to renewed review; original
collection references remain immutable. Existing file artifacts remain immutable.
Show why an artifact is not currently valid, the reviewer/date, separate validity
and review labels, source observation, download/inline preview, and history.

Creating an inline/file replacement can name a same-workspace supersedesId.
The link is immutable and bound into review. Validate compatible assurance and
source series; prevent cross-workspace links and cycles. Keep prior artifacts
and their reviews. A pending, rejected, withdrawn, expired, future, unrelated,
or differently scoped replacement must not suppress an expired artifact's risk.
Only a valid accepted successor in the same series and linked to the requirement
at the requested time can do so. Partial relinking cannot suppress risk for a
requirement the replacement does not cover. Independent failing checks always
retain their risk signal. Recorded observation series and policy versions may
link valid replacements automatically, based on server-owned source identity.
Do not merge unrelated connector targets merely because their check ids match.

## Lineage and shared state

Expose a metadata-only 2D lineage response/view for a requirement: effective status
and reasons at a stated time, artifact identity, source check/run or policy
version, assurance, reviewer, validity, replacement chain, and explicit unknowns.
Use shared effective-evidence logic for status, scoring, renewal, snapshots,
reports, and trust measures. Retain historical artifacts in the ledger and label
supersession. If status calculation semantics change, version score snapshots so
history does not connect incompatible calculations.

## Verification and ownership

Backend owner: packages/core/** and apps/server/**, including meaningful tests.
UI owner: apps/web/** and new e2e/evidence-lifecycle.spec.ts only; maintain role,
keyboard, modal snapshot/focus, workspace-switch, and phone behavior. No shared
browser server while another lane runs. Lead owns packages/agents/**, docs/context,
full verification, independent review, commits and local Docker delivery. Coordinate
new field names before coding shared assumptions. No production writes by workers.

Gate: CSF outcome and SOC 2 criterion journey assign → upload → reject with reason
→ replace → accept → verify → expire → refresh. Use an explicit fixture clock or
controlled valid dates; no manual override to hide history. SQLite/PostgreSQL cases
cover review races, tenancy, immutable references, license-preserving relinks,
partial replacements, withdrawal, clock transitions, and metadata-only reads.
Run focused tests as useful; lead owns typecheck/full suite/browser integration.
