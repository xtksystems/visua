# Keyboard workflow

Status: complete. Milestone 1 package 5; all milestone 1 packages verified.
Run: `.codex-context/runs/keyboard-workflow-20261003/plan.json`.
Session: `.codex-context/sessions/20261003T222635Z-feat-light-workspace-design-f9fc1621703a.md`.

## Acceptance and constraints

Scope shortcuts to focused outline/canvas, managed tree rows, modal focus entry/
trap/restoration, scope Escape preserving selection, all tab groups, requirement
links and palette search navigation. Preserve canonical workspace queries/events,
capabilities, cached inspector draft/selection lifetimes, all prior dirty work and
backend contracts. No commits, deployment, or external dispatch. Live Docker8787
remains untouched. Root exclusively owns builds/browser/server scheduling.

## Implemented and verified milestones

- Outline rows have one named, leveled, selected tab stop; pointer/keyboard focus
  follows explicit navigation; filter navigation includes only visible matches.
  Deep links expand ancestors without stealing field focus. Canvas is focusable
  and isolates scene keys from editable fields, controls, modals, and modifiers.
- Shared modal stack handles initial focus, containment, Tab/ShiftTab, topmost
  Escape, stable callback rerenders/StrictMode, and connected trigger restoration.
  Palette uses combobox/listbox associations and no delayed selection callback.
- All six tab groups use shared arrow/Home/End and tab/panel associations; custom
  RMF and catalog styling stays intact. Organization falls back to a permitted
  Members tab when role changes remove its current tab. Catalog tabs preserve
  their route alias so canonical resource resolution does not remount focus.
- Requirement tags use canonical workspace/framework/selection links; custom
  callbacks remain buttons. Palette and tags navigate under all four roles
  without workspace writes. F reframes the unchanged selected node after camera
  movement and does not replay an old singleton request on canvas remount.

## Evidence and corrections

Baseline `baseline-browser.json`: no outline tab stops, focus outside scope
dialog, Cancel Escape changing selected requirement to parent, and Plan code
tag leaving URL unchanged. Five first palette cases passed. First 17-case run
had 13 passes and four test-harness failures, fixed by waiting for loaded tabs
and using the actual lens accessible names; corrected four cases passed.

Independent first review confirmed F framing, omitted custom tablists, and
Organization permission-dependent selection. Before-fix camera regressions
failed at pixel hash restoration in `f-before.log` and `camera-remount-before.log`.
F and permission fallback fixes passed in `review-fixes-browser-1.log`.

Combined 23-case run: 22 passed, one real catalog-focus failure caused by
slug-to-id navigation remount. Preserve route alias; targeted test then exposed
its own final route-commit assertion race. Await selected state and rerun:
`catalog-focus-final.log` one pass, including held catalog load/old-control
removal/focus/Tab assertions. Final strict spec TypeScript check passed.
`keyboard-fix-review.json` complete/pass; all five result envelopes accepted.

Original snapshots and deliberate addenda are preserved; first and affected
review production identities are validated. Source pins refreshed only after
inspecting actual changes and final verification evidence. Implementation workers
`/root/keyboard_outline`, `/root/keyboard_ui` complete/accepted; reviewer
`/root/keyboard_review` complete and accepted. Isolated servers8801 stopped.

## Final verification and next action

Final clean `pnpm check` exited 0: all seven lanes passed in 435 seconds.
SQLite: 360 passed, two PostgreSQL-only skips; PostgreSQL: 362 passed; browser:
80 passed, including all 23 keyboard cases. Licensing, typecheck, corpus hashes,
and design lint passed. Final strict new-spec TypeScript check passed. Logs:
`full-check-final.log`, `final-check-logs`; source: `full-check-source.json`.
All five expected worker/review results accepted; affected-flow review complete
with no remaining findings. Prior source validation preserves 49 files; the
12 changed prior-scope files belong to this keyboard package. The older recovery
spec changed only two role locators (three tests), verified by inverse hash.

First full run was interrupted at exit130 after an old textbox locator failed;
its logs/source remain in `full-check-first.log`, `first-check-logs`, and
`full-check-first-source.json`. Its owned server was stopped after identifying
its launch; final check server and disposable PostgreSQL were cleaned up.
All source identities match, docs and relative links checked, whitespace clean.
Fan-in: `.codex-context/runs/keyboard-workflow-20261003/fan-in.json`.
No ongoing workers or remaining package work. Context pressure unknown.
Changes unstaged/uncommitted. Live Docker remains its October 2 build.

Next requested task: milestone 2 package 1, member-based task/requirement
assignment, editable due dates, requirement links, and My work. Do not start
it in this completed package.
