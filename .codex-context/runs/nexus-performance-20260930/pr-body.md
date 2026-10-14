The workspace refresh gives overview, planning, and 3D exploration a consistent light design. Observatory now separates framework districts with readiness gauges, outlined target gaps, and clearer selection labels. Nexus opens with a readable framework-level map; selecting a pillar reveals its exact group connections and authoritative mapping details.

- Batch Nexus pillars, footprints, sector surfaces, and connection arcs. Keep threat publication states distinct with static solid, dashed, and dotted patterns.
- Render both 3D canvases on demand. Selection, layout, lens, and agent changes wake the scene; active camera flights and agent work animate until settled. Reduced motion retains a static activity cue.
- Include the earlier workspace design/token refresh already on this branch, updated user and architecture docs, responsive capture tooling, and refreshed screenshots.

Validation:
- Typecheck passes. Unit tests: 214 passed / 2 skipped on SQLite; 216 passed on PostgreSQL.
- All 23 browser cases pass across the full run and focused rerun: 22 passed in the full suite; the idle/wakeup test passed after allowing shader warmup before its idle sample. A test-only TypeScript syntax error caught by the same check was fixed and typecheck rerun successfully.
- Licensing guard, corpus hashes, and DESIGN.md lint pass. All 12 Nexus captures at 1440×900, 1024×768, and 390×844 report no overflow or console errors; desktop and phone results were visually inspected.
- Chromium SwiftShader at 1440×900, reduced motion: peak Nexus draw calls/frame fell **122 → 14** (89%); selected Nexus **120 → 15**. All five sampled views submitted **zero idle frames/draw calls** during 1.5-second samples. These are submitted-work counts, not hardware GPU/FPS claims. Reproduce with `node scripts/scene-profile.ts --url <demo-server>`.

Claude Opus 5.5 was requested through the existing subscription for bounded 3D design analysis and fresh source review. Both reported low-severity demand-rendering findings were addressed and covered by integration tests.

![Crosswalk Nexus](https://raw.githubusercontent.com/xtksystems/visua/feat/light-workspace-design/docs/images/crosswalk-nexus.jpg)

![Observatory](https://raw.githubusercontent.com/xtksystems/visua/feat/light-workspace-design/docs/images/observatory-csf.jpg)
