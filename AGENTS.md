<!-- codex-context:begin -->
## Codex project context

At session start, read the files declared by `startup_context` in
`.codex-context/system.json`. If the field is absent, read
`.codex-context/workflow.md` and `.codex-context/project.md`. Report invalid or
missing declared files. For substantial or resumed work, also read
`.codex-context/workflow.md`; otherwise load only task-relevant extra context.
Keep existing project instructions and canonical documentation authoritative.
Before editing a nested area, read its applicable instruction files.

Use `$prime` to orient at session start and `$wrapup` to preserve results at
session end. If those skills aren't installed, follow the equivalent procedures
in `.codex-context/workflow.md`. Treat `/prime` and `/wrapup` messages as those
requests when the client passes them through. Carry the task's relevant
invariants into implementation, and verify behavior before reporting completion.
<!-- codex-context:end -->
