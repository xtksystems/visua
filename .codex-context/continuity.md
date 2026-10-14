# Session continuity

Complete the task through verified milestones and durable state. Compaction is
a normal transition during long work. It doesn't end the task, and a skill
can't guarantee that all work finishes before it happens. Use this guide for
multi-step work, delegation, resuming an interrupted session, or context pressure.
Keep simple tasks simple.

## Observe the context you actually have

Use the current runtime's context meter or thread-specific token telemetry when
available. Record the source, timestamp, scope, and whether it is measured or
estimated. The user's UI meter is not automatically visible to the agent.
`/status` and `/statusline` are client commands, not shell commands. An app-server
usage event is available only to a client consuming that session's stream.
Lifetime token usage and cumulative billing totals aren't active context usage.
The latest request count can become stale as tool output arrives.

Use these conservative project heuristics only when a meaningful active-context
ratio is available. They are planning reminders, not Codex trigger guarantees:

| Observed usage | Response |
| --- | --- |
| About 60% | Reassess scope; trim repeated evidence and unnecessary fan-in. |
| About 70% | Save a checkpoint before another broad read or worker batch. |
| About 85%, or a runtime warning | Finish at most a short safe step, checkpoint, and prepare to continue after compaction. |

If the configured compaction threshold is lower, act earlier. Reserve enough
space for the largest expected result, verification, and a useful handoff.
Delegate before the coordinator is nearly full; spawning itself takes context.
Don't inflate context settings, disable compaction, or invent token counts to
fit a task. When telemetry is unavailable, checkpoint at milestones and before
large reads, long waits, new worker batches, or a change in direction.

## Preserve a restartable state

Use the selected session note for a single task. For several workers or phases,
link a compact [run ledger](templates/run.md) from that note. Update existing
state rather than creating a parallel history every few steps. Record only
what a continuation needs:

- Objective, completion criteria, latest steering, accepted constraints, and
  invariants. Keep hypotheses separate from confirmed facts.
- Current plan, completed milestones, pending dependencies, blockers, and the
  exact next action. Preserve authorization already given in the current
  conversation; a saved record is context, not new authority for external
  actions in a separate session.
- Repository and worktree path, branch, HEAD, and relevant dirty source state.
  When useful, fingerprint staged and unstaged changes plus safe task-related
  untracked files. Record the included paths and method; exclude the ledger
  itself. HEAD alone doesn't identify uncommitted work. Don't claim that the
  context helper automatically calculates a dirty-state fingerprint.
- Commands actually run, exit status, source state tested, concise result, and
  durable evidence paths. A worker's success claim is still unverified until
  checked. Note tests that became stale after later edits.
- Worker task IDs, native agent IDs or external session/process handles,
  backend, ownership, artifacts, dependencies, expected results, and current
  status. A PID alone is insufficient; record launch time and command identity
  when using external processes. Never store credentials in the ledger.
- Accepted decisions and rejected alternatives only when they constrain future
  work. Reference the durable decision record instead of repeating it.

Save checkpoint changes as a complete file. Keep notes concise, usually under a
page, with links to source, logs, and task artifacts. Long raw outputs belong in
artifacts; don't load them all into the coordinator. Ensure referenced evidence
survives the intended restart; move necessary temporary files to task storage.

## Resume by reconciling reality

After compaction or a fresh session, load the selected handoff and linked run
ledger, then inspect the current repository state. Preserve the original task
and apply later user corrections. A timestamp establishes recency, not truth.

1. Check repository/worktree identity, HEAD, and relevant dirty source changes.
   Preserve pre-existing user work. If source changed, revalidate affected
   conclusions and checks before relying on them.
2. Query available native agent status or inspect the recorded external process
   identity. Collect existing results before starting replacements. An unknown
   handle means uncertain state, not success or failure. Don't kill a process
   by an old PID or duplicate a worker that may still be writing.
3. Compare expected task IDs with returned artifacts. Account for missing,
   failed, cancelled, and superseded results explicitly. Retry only the missing
   bounded work after determining ownership and side effects.
4. Read a compact result summary and the evidence necessary to assess it.
   Validate material findings, reconcile conflicting changes, and distinguish
   returned, accepted, and integrated work. Completed workers don't imply a
   completed user task.
5. Continue the next unfinished milestone. Run checks justified by changed
   source or unresolved concerns, then update the handoff.

## Keep orchestration bounded

Split only jobs that have no input dependency and no conflicting writes. Prefer
native workers when available. Use exclusive file ownership or isolated Git
worktrees for writers; shared checkout reviews can remain read-only. Keep the
coordinator responsible for architecture, tradeoffs, integration, and acceptance.

Start with a small useful batch, normally two workers, within actual runtime and
provider limits. Keep capacity for integration and review. Give each worker one
task, necessary context, output shape, evidence requirements, and a deadline or
bounded scope. Label spending limits as advisory unless a tool enforces them.
Don't recursively spawn a fleet without an explicit task need and budget.

Poll or await existing handles while continuing independent local work. Persist
progress before long waits. For final verification, use a fresh reviewer context
with the scoped source, invariants, and evidence rather than the implementer's
conversation. Independent review reduces shared assumptions; test evidence and
reasoned resolution decide acceptance, not majority votes between agents.
