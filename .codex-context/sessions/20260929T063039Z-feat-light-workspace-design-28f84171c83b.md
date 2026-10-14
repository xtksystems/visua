---
system: "codex-context"
session_id: "20260929T063039Z-feat-light-workspace-design-28f84171c83b"
created_utc: "2026-09-29T06:30:39+00:00"
updated_utc: "2026-09-29T06:31:28+00:00"
task: "Adopt Codex context workflow"
status: "complete"
repo_root: "/Users/artem/visua"
worktree_id: "fbce6dbefa7b12a8"
branch: "feat/light-workspace-design"
head: "c3ad38c36497ad9b25b055055908d9e4fb0fd1ce"
---

# Codex adoption handoff

## Objective and outcome

Install and tailor the Codex context workflow in Visua, preserve existing
instructions and working changes, and prime the session. Complete; no
follow-on application task was supplied. No task plan or workers were needed.

## Changes and evidence

This session added root `AGENTS.md` and `.codex-context/`: five tailored
project records, startup manifest, workflow, continuity and optional review
guidance, templates, and the unmodified bundled Python helper. This handoff
was added during wrapup. Start with the [context map](../README.md).

Pre-existing work, preserved: modified root `README.md` (18 added lines),
untracked `.dockerignore`, `Dockerfile`, and `compose.yaml`. None of these
changes belongs to this adoption. No staged changes or commits were made.
Application files, runtime configuration, dependencies, and hooks were not
changed. Existing `CLAUDE.md` and canonical docs retain their ownership.

Checks ran from `/Users/artem/visua` at the frontmatter HEAD with the new
context files untracked:

- Bundled `adopt.py` preview, apply, and repeat preview succeeded; repeat
  preview preserved all destinations. Helper/workflow/templates match bundle.
- `python3 .codex-context/bin/context.py status --repo .` passed; startup is
  only `.codex-context/project.md`. No earlier session notes existed.
- Python local-link scan passed for 70 context links at adoption.
- SHA-256 comparison against the pre-install snapshot confirmed all 524
  existing files were unchanged. Snapshot was temporary; this note preserves
  the observed result, not a claim that the snapshot is a durable artifact.
- `git diff --check` passed. The 15 adoption files passed individual
  `git diff --no-index --check /dev/null <path>` checks. Exit 1 without
  diagnostic output denotes file differences for that no-index command.
- Focused link/whitespace checks passed for the final verification record
  and handoff. The status helper recognized this completed note with matching
  branch, worktree, and HEAD, and no unreadable sessions.
- Application tests, browsers, databases, and deployments were not run.

## Constraints and decisions

See [verification](../verification.md) for exact application checks and
[invariants](../invariants.md) for source-backed contracts. Default startup
stays small; load canonical rules and deeper records for the relevant task.
No fallback instruction filename was configured, so the root router was
created without replacing an active fallback. `$prime` and `$wrapup` are
portable skill invocations; native slash commands depend on the client.

The browser harness sets `VISUA_DB=:memory:`, but inherited
`VISUA_DATABASE_URL` takes precedence. Inspect environment configuration
before browser tests. No live operational evidence was collected.
No background workers or processes were launched. Context pressure is unknown;
no runtime measurement was available. Time savings were not measured.

## Next action

No remaining task work or blockers. On the next request, run `$prime`, inspect
the current diff, and select only the user's requested task. Preserve the
README/Docker changes. All adoption files and this note remain untracked and
uncommitted; the README remains modified and unstaged. No commit, push, PR,
or deployment was requested or performed.
