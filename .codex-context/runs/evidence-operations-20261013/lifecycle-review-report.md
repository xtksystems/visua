The bounded lifecycle review found two medium defects. Both reproduced against
the inspected source, and the lead accepted them for correction. This report
doesn't claim the forthcoming fixes are verified.

1. A stale acceptance can override withdrawal. At
   `apps/server/src/services/visua.ts:1323`, `expectedScope` binds the artifact
   and its applicability but excludes the latest review identity. An approver
   can inspect accepted evidence, another approver can withdraw it with a
   reason, and the original snapshot can still accept it. The isolated run
   produced `accepted → withdrawn → accepted`. Compare an inspected review ID
   or revision under the mutation lock, while permitting reacceptance after a
   fresh inspection.
2. Explicit-time lineage grants validity before acceptance. At
   `packages/core/src/status.ts:21`, validity checks the current acceptance and
   collection window without bounding it by the review time. An artifact
   accepted on October 13, 2026, reports `valid` and `currentlyValid: true` for
   June 1, 2026. The lineage endpoint inherits this result. Supersession already
   checks acceptance time, producing inconsistent answers. Apply the accepted
   review timestamp consistently to validity, freshness, and coverage intervals.
   This finding doesn't require reconstruction of past workspace revisions.

The [structured report](lifecycle-review.json) contains exact locations,
mechanisms, recommendations, coverage, and limitations. The
[reproduction output](review-reproductions/lifecycle-boundaries-result.json)
records both failures. Its
[synthetic runner](review-reproductions/lifecycle-boundaries.ts) uses an explicit
in-memory SQLite service. The same run independently confirmed that approved
policy bodies reject mutation and that different connector configurations retain
an independent failing check after a later pass against another target.

The focused lifecycle, evidence-binding, and core evidence suites passed all 69
tests, with zero failures or pending tests. The exact command and
[Vitest result](review-reproductions/focused-vitest-result.json) are recorded in
the structured report. No full suite, PostgreSQL, browser, deployed service,
live database, or external connector was used.

The review covered immutable collection identity, original licensing metadata,
scope binding, withdrawal and rejection history, requirement-scoped replacement,
clock evaluation, metadata-only lineage, and shared score/attention integration.
It examined related storage and model licensing boundaries. It began from the
fresh bounded assignment; later lead messages disclosed two concurrent boundary
corrections, which were inspected and exercised rather than accepted on narrative.

The base was `b34cf1fe846920c98aa71df3121712284880dc1a`, including the current
uncommitted lifecycle files. The
[source digest manifest](review-reproductions/inspected-source-hashes.json) binds
the inspected files at October 13, 2026, 07:48:23 UTC. The working tree continued
to change afterward. A focused recheck of the two reported corrections remains
with the integration owner. No product source was changed by this reviewer.
