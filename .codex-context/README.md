# Visua context map

Start with [project facts](project.md), the only default startup record in
[system.json](system.json). Existing documentation retains ownership of
product, architecture, design, licensing, and engineering rules.

| Record | Read when |
| --- | --- |
| [Repository rules](../CLAUDE.md) | Before application changes; owns coding rules and delivery checks. |
| [Project README](../README.md) | Setup, features, environment, and local deployment. |
| [Canonical architecture](../docs/architecture.md) | Detailed behavior and subsystem design. |
| [Workspace guide](../docs/workspace.md) | Navigation and user workflows. |
| [Design system](../DESIGN.md) | UI or scene changes. |
| [Corpus guide](../corpus/README.md) and [derived-data notices](../packages/frameworks/data/NOTICE.md) | Ingestion, provenance, or redistribution changes. |
| [Roadmap](../docs/roadmap.md) | Product direction; not automatic task selection. |
| [AI governance research](../docs/research/ai-governance-landscape.md) and [competitive research](../docs/research/delve-competitive-analysis.md) | Historical product research, not live claims. |
| [SSO design](../docs/superpowers/specs/2026-09-27-sso-domain-recheck-design.md) and [implementation plan](../docs/superpowers/plans/2026-09-27-sso-domain-recheck.md) | Domain ownership rechecks; revalidate historical completion claims. |
| [Source navigation](architecture.md) | Finding callers, modules, and data flows. |
| [Invariants](invariants.md) | Contracts affected by an edit. |
| [Verification](verification.md) | Commands, prerequisites, delivery boundaries, and evidence. |
| [Workflow](workflow.md) | Substantial or resumed work; prime/wrapup fallback. |
| [Continuity](continuity.md) and [run template](templates/run.md) | Long or delegated tasks and worker recovery. |
| [Focused review](review.md) | Optional failure-oriented review for relevant risk. |

Use templates for [tasks](templates/task.md), [decisions](templates/decision.md),
and [sessions](templates/session.md) only when work needs those records.
`tasks/`, `decisions/`, `sessions/`, and `runs/` are created when used; there is
no selected backlog task or historical handoff merely because templates exist.

`python3 .codex-context/bin/context.py status --repo .` reports the worktree,
startup declaration, and candidate handoffs without changing files.
`$prime` and `$wrapup` are portable skill invocations. Native slash command
availability belongs to the client and cannot be registered by this repository.
Keep secrets and raw logs out of context; handoffs cannot authorize external
mutations in a later session.
