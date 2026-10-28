# Renewal acceptance investigation

- First focused browser lane: six cases passed; keyboard case failed after ArrowLeft and Home succeeded, then Tab focused Next30 instead of the active Expired tabpanel. Static tab indices remained one active. Trace at test-results/evidence-renewal-mobile-ke-aed8d-ores-the-inspection-trigger/trace.zip. Hypotheses: native Tab navigation on an unfocused document (other local browsers observed), or React URL/tab re-render changes focus. Instrument document.hasFocus, active element, and all tab attributes on keyboard and focus events in an isolated copy; no product fix before evidence.
- First SQLite lane: 523 pass, one existing agent/connector test timed out at30s. It scans REPO_ROOT; the newly-created nested worktree expands that filesystem and concurrent build/test load was present. Hypotheses: repository scan/I/O budget contention versus actual agent hang. Inspect existing scanner bounds, rerun exact unchanged test in isolation after current lanes, record timing and observed check state. No timeout changes or skipped assertions.
- No independent review findings; its scoped static pass does not substitute runtime checks.

## Focus evidence and correction

Trace input@call381 shows Expired still aria-selected=false and tabindex=-1 after its focus assertion passed; Next30 retained tabindex=0. URL had already changed. Thus Tab was sent during the router render transition; the one-zero-tabindex assertion did not assert which tab was selected. The instrumented pass logged document.hasFocus=true and passed all keyboard/restore checks. Add an explicit aria-selected=true assertion after Home, matching the existing ArrowLeft readiness assertion. No app focus workaround or weakened expectation.

Lead also aligned the ledger Expired count and Expiring/expired filter with evidenceRenewalDates and replaced the unconditional risk subtitle with “See Renewal for coverage impact”. Domain normalization already has fixed-date tests. This avoids ledger/renewal disagreement on UTC day-end or invalid windows.

## Connector timeout cause

The isolated original test and instrumented copy both hit30s. Instrumentation shows first connector run15013ms and first agent API response15029ms; preview/decision calls complete in1–31ms; a second connector run then starts and the test reaches30s. The scanner visited2125 entries and read7.4MB before its first budget. This test actually scans the mutable checkout twice. The expansion from nested worktree and diagnostics makes that unbounded fixture slower; no renewal read endpoint is involved. Keep the real scanner and all bound-approval/duplicate assertions, but point this agent approval test at an owned temporary repository containing a lockfile and security policy, cleaning it in finally. The separate whole-checkout connector test stays unchanged. No scanner or test timeout changes.

## Final full browser lane: viewer route fetch

At case69, viewer destination/permission matrix failed because its Playwright route.fetch GET for the agent run received ECONNRESET. The snapshot remained at Loading run; subsequent Review all assertion had no rendered record. This is a transport failure observed by the test's interception, not evidence that approval capabilities changed. Auditor/contributor cases immediately following passed. No source edits made. Preserve the full lane result and rerun the same viewer case unchanged after the browser lane exits; do not claim a clean full pass from this run. Raw trace remains in ignored test-results until copied locally for the retry.

## Final full browser lane: legacy review label assertion

Case82 failed the existing case-sensitive substring assertion “pending review”. Captured row exists and reads “Review: Pending review Validity: no expiry”, which is the intended separated label. Update the two old assertions in the bound-review case to “Review: Pending review” after the lane ends, preserving all approval scope, history and stale-snapshot assertions. No product change. Rerun that case plus the unchanged viewer transport case. Other full-lane cases remain applicable because only this specific test text changes.
