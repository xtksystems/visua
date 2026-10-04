# Evidence approval binding

Status: complete

## Outcome and scope

Completed milestone 1 package 3 from the
[phase plan](../../docs/development-phase-2.md). Prior uncommitted startup and
connector work is preserved. No commit, PR, deployment, or external provider
work was requested or performed.

## Contract and decisions

- Acceptance binds the server-computed artifact SHA, requirement set, collection
  date, and expiry in an append-only decision history. Latest decision and active
  reviewer/time must match. Missing or legacy scopes cannot grant current approval.
- Hash one canonical content/data envelope for all nonconnector artifacts to
  avoid representation aliases. Preserve the immutable connector observation
  recipe. Metadata-only items cannot be accepted.
- Content/data, links, collection date, or expiry changes return evidence to
  pending review and clear active review metadata. Title, description, filename,
  equivalent dates, and reordered link sets preserve approval. Reverting an edit
  does not restore approval. Connector observations cannot be edited.
- Dates validate real calendar days and timezone-qualified timestamps. Date-only
  collection begins at UTC midnight; expiry ends at 23:59:59.999 UTC. Expiry
  cannot precede collection. Future/expired/malformed items cannot verify current
  implementation. Historical decisions remain available.
- Human API review requires the inspected scope. Dialog actions use their fixed
  viewed snapshot even after live rows refresh. Agent review proposals capture
  immutable target/scope; connector proposals retain their check reference.
  Existing explicit autonomy permissions remain unchanged.
- Migration 5 recomputes current digests for unbound legacy artifacts, including
  pending uploads. It archives actual prior decisions without inventing a scope
  or a pending decision; accepted legacy items return to review. Mutations and
  migration audit before/after values, revision, and data in one transaction.

## Implementation and review

[Run plan](../runs/evidence-binding-20261003/plan.json) records native workers,
immutable briefs, source digests, and accepted envelopes. `/root/evidence_core`
owned pure core helpers/types/tests. Root integrated service, audit utility,
migration, API, proposals, current-evidence counts, UI, browser tests, and docs.
`/root/evidence_integrity_review` performed a fresh bounded independent pass.

Old-source reproductions confirmed invalid expiry counted valid and protected
edits kept acceptance. The first review reproduced a content/data encoding alias
and traced dialog/row snapshot mismatch and legacy missing-hash review failure.
All were corrected, including pending legacy digests. The
[corrected-state review](../runs/evidence-binding-20261003/fix-review.json) passed
with no supported remaining findings; the original findings remain preserved.
A browser overflow regression was fixed by letting freshness labels wrap.

## Verification

[Verification summary](../runs/evidence-binding-20261003/verification-summary.json)
records commands, source fingerprints, results, and limitations. All commands ran
in `/Users/artem/visua` against the uncommitted working tree.

- Core worker: 52 tests and core typecheck passed.
- Initial focused integration: 98 passed; one PostgreSQL-only case skipped.
- Corrected evidence suite: 19 passed on SQLite; also covered in the full
  PostgreSQL lane. Includes digest alias, date validation, protected/no-op/revert
  edits, stale/concurrent approval, immutable observations, proposal edits,
  history, audit/events/revision rollback, and migration rollback/idempotence.
- Browser regressions: acceptance/history, expiry amendment, concurrent edit
  during inspection, and responsive overflow passed.
- Final `pnpm check`: exit 0 in 266 seconds. All seven lanes passed: licensing,
  typecheck, 360 SQLite tests (two PostgreSQL-only skips), 362 PostgreSQL tests,
  24 browser tests, corpus hashes, and design lint. No code/test changes followed.
- First full gate failed evidence overflow and predates integrity corrections;
  it is preserved as failed evidence, not treated as the delivery result.

Legacy malformed dates need correction through the edit API before re-review.
Object storage, explicit artifact versions/supersession, withdrawal, and the
broader evidence lifecycle remain milestone 2 work. Docker still runs October 2
source and was not redeployed. Changes remain unstaged and uncommitted.

## Next action

No remaining work in this package. On a new development request, implement
milestone 1 package 4, selection and role correctness, using the phase plan.
