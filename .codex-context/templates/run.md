# Run: <short task label>

Copy this template only for work that benefits from a run ledger. Link it from
the active session note. Keep detailed worker output in referenced artifacts.
This is a human-readable ledger, not a machine-validated execution manifest.

- Run ID: <stable unique ID>
- Updated UTC: <timestamp>
- Status: <active | paused | complete>
- Session note: <relative path>
- Objective and done criteria: <observable result>
- Latest steering and accepted authorization: <constraints or reference>
- Invariants: <relevant invariant IDs or paths>
- Repository / worktree / branch / HEAD: <identity; null when unavailable>
- Dirty source fingerprint: <method, included paths, digest; or not recorded>
- Baseline user-owned changes: <paths and preservation constraints>
- Context observation: <source, thread/turn, time, scope, used/capacity; or unavailable>
- Limits: <concurrency, scope/deadline, attempts, cost if known; enforced or advisory>

## Task graph and ownership

List one bounded job per row. An edge exists only when an input, write conflict,
or shared resource requires ordering. Use stable IDs when a worker is retried.

| Task ID | Job and owned paths | Depends on | Worker/backend and runtime handle | Status | Expected result/artifact | Acceptance evidence |
| --- | --- | --- | --- | --- | --- | --- |
| inspect-a | <bounded job; read-only or owned files> | none | <agent ID, or session ID + process identity> | pending | <path/output shape> | <source/check requirement> |
| inspect-b | <independent bounded job> | none | <handle> | pending | <path/output shape> | <requirement> |
| integrate | <resolve and verify> | inspect-a, inspect-b | coordinator | pending | <integrated change/report> | <relevant checks> |

Task statuses: `pending`, `running`, `returned`, `accepted`, `integrated`,
`failed`, `blocked`, `cancelled`, or `superseded`. A returned artifact doesn't
establish acceptance. Record failed attempts and replacement handles without
erasing the task's identity. For external processes, include launch time and
command identity so a reused PID can't be mistaken for the worker.

## Results and verification

Record compact conclusions and the evidence needed for the next phase.

| Task/finding ID | Returned result and evidence path | Source state checked | Verification/reviewer | Verdict and integration state |
| --- | --- | --- | --- | --- |
| <ID> | <result; unverified until checked> | <HEAD + relevant dirty fingerprint> | <command + exit, or independent source review> | <accepted/rejected/unresolved; reason; integrated path> |

- Expected task IDs: <all IDs feeding this merge>
- Returned IDs: <IDs with inspectable artifacts>
- Missing, failed, cancelled, or superseded IDs: <IDs and resolution>
- Conflicts, unsupported claims, or stale tests: <item and next check>
- Decisions that change future work: <decision path or brief rationale>

## Continuation

Preserve enough state to resume without replaying every worker conversation.

- Current milestone: <last verified progress>
- Still-running workers/commands: <handles, ownership, artifact locations>
- Last status check: <timestamp and actual observation>
- Blockers and dependencies: <what needs to change or return>
- Exact next action: <command or bounded implementation step>
- Reconciliation before retry: <source/worker state to inspect>
- Completion evidence still required: <acceptance criteria not yet satisfied>
