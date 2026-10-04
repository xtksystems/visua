# Session handoff

## Objective and outcome

Record the task, completed work, and whether it is complete, paused, or blocked.
Set the frontmatter `status` to match and `task` to a short descriptive label
that distinguishes this work from other tasks on the same branch. Set
`updated_utc` to the current UTC timestamp after each checkpoint; preserve
`created_utc` and the note's identity. Keep frontmatter strings JSON-quoted,
with JSON `null` for unavailable branch/HEAD values. Link the active task plan
if one exists.

## Changes and evidence

List relevant paths and observable changes. Record checks with command, cwd,
tested state, result, and limitations. Say explicitly when checks weren't run.
Separate pre-existing changes from this session's work where known.

## Constraints and decisions

Link durable records updated during the session. Preserve task-specific
constraints, open questions, and assumptions that need revalidation.

## Outcome value, when useful

For recurring work or automation, state the human workflow eliminated and the
remaining review, correction, and maintenance effort. Include net time saved
only with a stated baseline, period, assumptions, and evidence; label estimates
or say "not measured." Omit this section when it adds no useful information.

## Next action

Record the concrete next step or "No remaining task work." Identify blockers
and pending external actions without treating them as future authorization.
State whether local changes are staged, unstaged, or committed.
