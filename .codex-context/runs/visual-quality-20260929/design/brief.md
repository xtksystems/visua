Task: heavy 3D visualization design and algorithm reasoning for Visua. User requests better visual quality and wow-factor, explicitly using Claude Opus 5.5. You are a bounded expert worker with no tools. Analyze supplied code and propose a concrete implementation that substantially improves Observatory constellation AND terrain through precision, depth, readable grouping, and meaningful selection. Return detailed algorithms and self-contained TypeScript/TSX snippets for the hardest geometry (batched sector surfaces / hierarchy emphasis / target outlines), plus risks. Lead implements and verifies. Do not rewrite product, layout coordinates or data semantics. No added dependencies, shadows, postprocessing, random particles, idle motion, decorative heights, hardcoded colors, or O(N) mesh draw calls. Preserve token colors, measured heights, target ghosts, instancing and 2D twin. Focus on 3-4 high-impact changes feasible in this session; stop after a complete actionable design. Evidence is supplied source at HEAD c3ad38c; these files initially clean. You own only your result, no filesystem writes. No live visual evidence is yet available; label visual judgments as inferred. Suggested direction: readable matte technical maquette, sector grounds/rails, crisp target profiles, focused branch pathways. Evaluate and improve it independently.

SOURCE CLAUDE.md
# Working in the Visua repository

Visua is a pnpm monorepo (Node ≥ 22.18, native TypeScript, `node:sqlite`). Read
`README.md` for the product and `docs/architecture.md` for the internals.

## Commands

- `pnpm dev`: API on :8787 (seeds the demo) and web on :5173
- `pnpm typecheck`, `pnpm test` (Vitest), `pnpm test:e2e` (Playwright against the production build)
- `VISUA_TEST_DATABASE_URL=postgres://… pnpm test` runs the server suites on Postgres too
  (each run uses its own schema and drops it afterwards)
- `pnpm design:lint` after any change to `DESIGN.md`, then `pnpm design:tokens`
- `pnpm ingest` after any change to `corpus/` or `packages/frameworks/src/ingest/*`
- `pnpm corpus:verify` to hash-check the corpus
- `pnpm screens` photographs every view at 1440×900, 1024×768 and 390×844 into `.screens/`
  (git-ignored) with a contact sheet and an overflow report; `pnpm screens --docs` refreshes
  the README images

Run `pnpm typecheck && pnpm test` before committing. Run `pnpm test:e2e` when you
change the web app. `pnpm check` is the local CI (there is no hosted CI): a licensing
guard (no git-ignored file tracked or staged), typecheck, unit tests on SQLite and on
Postgres (`VISUA_TEST_DATABASE_URL`, or a throwaway Docker container), e2e, corpus
hashes and the DESIGN.md lint; `--quick` runs the first three.

## Rules

- **Design.** All visual values come from `DESIGN.md` tokens: CSS variables
  (`var(--color-…)`) in the web app, and `designSystem` / `TOKENS` in scenes. Never
  hard-code colors.
  - Status colors are semantic and always paired with a glyph or label.
  - Aurora Violet (`tertiary`) is reserved for agent activity. AI governance frameworks
    (NIST AI RMF) use Circuit Copper (`framework-ai`), never violet.
- **Citations.** Framework statements must come from the ingested graphs or the
  corpus index, with a citation (document id, locator, page). Do not write requirement
  text by hand. The one exception is the Visua-authored SOC 2 skeleton, which must stay
  in Visua's own words.
- **Official counts are tested.** If an ingest change moves a count (106 CSF outcomes,
  1,014 SP 800-53 units, 47 RMF tasks, 61 TSC criteria, 72 AI RMF outcomes, 12 GAI
  risks and 212 Generative AI Profile actions; ATLAS 2026.09's 16 tactics, 120
  techniques, 88 sub-techniques and 40 mitigations; 10 entries in each OWASP Top 10;
  25 NIST AI 100-2 attacks), the change is wrong unless the official source changed.
  The state-law counts (26 laws, 187 obligations) are Visua's compilation: change them
  only with a deliberate corpus refresh.
- **Threat catalogs are views, not frameworks.** Never enable or assess a threat catalog.
  Its coverage derives from published threat links (`registry.threatLinks`), and every
  link keeps its authority and status (final, draft, unreviewed, superseded). Don't add
  links Visua wrote itself, and keep them out of the requirement crosswalk.
- **Law codes are node ids.** Never change a published law code; add new ones to
  `CODE_OVERRIDES` in `packages/frameworks/src/ingest/state-laws.ts` when needed.
- **AI RMF text comes from the PDF-based extraction** (`corpus/nist-ai-rmf/ai-rmf-core.json`).
  NIST's own CPRT and Playbook JSON differ from the final AI 100-1 text in dozens of
  statements; don't switch the ingest to them.
- **Licensing.** Never commit framework text whose license does not allow
  redistribution (AICPA, ISO, PCI SSC, MITRE SAFE-AI…), including derived JSON,
  mappings and search chunks; keep such files in a git-ignored `.local/` folder.
  Openly licensed catalogs may be committed with their notices: MITRE ATLAS
  (Apache-2.0) and OWASP (CC BY-SA 4.0; files derived from OWASP text stay CC BY-SA,
  see `packages/frameworks/data/NOTICE.md`).
  - `.gitignore` covers `corpus/aicpa-soc2/**` (except `manifest.json` and
    `STRUCTURE.md`), `packages/frameworks/data/aicpa-*.json`,
    `mappings/*tsc-2017*.json` and `chunks/aicpa-soc2.json`. Check `git status` before
    committing.
  - Licensed text must pass through `modelText()` / `licensedTextToModel()` in
    `packages/agents` before it can reach a language model.
- **Agents propose, people approve.** Agents change state only through
  `host.propose()`. Never let an agent file a plan, guide or template as evidence, mark
  anything verified, or make an authorization or audit decision.
- **Tenancy and access.** Every workspace route must go through `workspaceAccess`
  (404 across organizations) and declare any capability above its floor with `need()` or
  `requireCapability()`. Never trust a client-supplied actor: the actor is the signed-in
  principal. Developer sign-in must stay refused in production.
- **Integrity.**
  - Every state change goes through `VisuaService` so it lands in the hash-chained
    audit trail, in the same transaction. Storage is async: `await` every store and
    service call, never hold a transaction open across network calls, and don't
    publish bus events directly from a mutation (the service publishes after commit).
  - "Not applicable" requires a rationale, and scope recomputation must preserve
    `userExclusion`.
- **Claude API.** The default model is `claude-opus-5` (`VISUA_MODEL` overrides it).
  Use adaptive thinking, streaming, prompt caching of the system prompt, and zod
  validation of tool inputs. Follow the existing pattern in
  `packages/agents/src/claude.ts`.


SOURCE DESIGN.md
---
version: alpha
name: Visua
description: >-
  The visual identity of Visua, a spatial compliance workspace. Warm, open
  surfaces make frameworks, requirements, tasks, evidence and agent work easy to
  scan in two or three dimensions. Precise, evidence-first, never alarmist.
colors:
  # Warm neutrals. The 3D scene sits directly on `neutral`.
  primary: "#366B53"
  primary-hover: "#285740"
  on-primary: "#FFFFFF"
  primary-container: "#E3F0E7"
  on-primary-container: "#285740"
  secondary: "#52665A"
  on-secondary: "#FFFFFF"
  tertiary: "#A3553F"
  tertiary-hover: "#8A432F"
  on-tertiary: "#FFFFFF"
  tertiary-container: "#F8EBE5"
  on-tertiary-container: "#81422F"
  neutral: "#F7F8F4"
  surface: "#FFFFFF"
  surface-raised: "#F2F5F0"
  surface-overlay: "#FFFFFF"
  surface-bright: "#E8EEE7"
  surface-glass: "#FFFFFFE8"
  on-surface: "#1D3028"
  on-surface-muted: "#5B6C61"
  outline: "#D9E1D8"
  outline-strong: "#BFCFC2"
  scene-grid: "#DFE7DE"
  # Status semantics: the only colors allowed to encode implementation state.
  status-not-started: "#607168"
  status-not-started-container: "#EEF2EE"
  status-in-progress: "#8A6222"
  status-in-progress-container: "#FBF1DE"
  status-implemented: "#2F7350"
  status-implemented-container: "#E7F3E9"
  status-verified: "#286C80"
  status-verified-container: "#E4F2F5"
  status-at-risk: "#B3473E"
  status-at-risk-container: "#FBEAE7"
  status-not-applicable: "#626B65"
  status-not-applicable-container: "#F0F1EF"
  on-status: "#FFFFFF"
  error: "#B3473E"
  on-error: "#FFFFFF"
  # Framework identity: used only where several frameworks share one view.
  framework-csf: "#3E6386"
  framework-csf-container: "#E9F1F8"
  framework-soc2: "#805576"
  framework-soc2-container: "#F5EBF2"
  framework-rmf: "#57703B"
  framework-rmf-container: "#EFF3E6"
  framework-ai: "#97552A"
  framework-ai-container: "#F8EEE6"
  framework-law: "#705994"
  framework-law-container: "#F0ECF7"
typography:
  display-lg:
    fontFamily: Space Grotesk
    fontSize: 40px
    fontWeight: 600
    lineHeight: 1.1
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Space Grotesk
    fontSize: 28px
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Space Grotesk
    fontSize: 20px
    fontWeight: 600
    lineHeight: 1.3
  title-md:
    fontFamily: IBM Plex Sans
    fontSize: 15px
    fontWeight: 600
    lineHeight: 1.4
  body-lg:
    fontFamily: IBM Plex Sans
    fontSize: 16px
    fontWeight: 400
    lineHeight: 1.6
  body-md:
    fontFamily: IBM Plex Sans
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.55
  body-sm:
    fontFamily: IBM Plex Sans
    fontSize: 13px
    fontWeight: 400
    lineHeight: 1.5
  label-lg:
    fontFamily: IBM Plex Sans
    fontSize: 13px
    fontWeight: 500
    lineHeight: 1.2
    letterSpacing: 0.01em
  label-md:
    fontFamily: IBM Plex Sans
    fontSize: 12px
    fontWeight: 500
    lineHeight: 1.2
    letterSpacing: 0.02em
  label-caps:
    fontFamily: Space Grotesk
    fontSize: 11px
    fontWeight: 600
    lineHeight: 1
    letterSpacing: 0.12em
  code-md:
    fontFamily: IBM Plex Mono
    fontSize: 13px
    fontWeight: 500
    lineHeight: 1.4
  code-sm:
    fontFamily: IBM Plex Mono
    fontSize: 11px
    fontWeight: 500
    lineHeight: 1.3
  metric-xl:
    fontFamily: Space Grotesk
    fontSize: 44px
    fontWeight: 500
    lineHeight: 1
    letterSpacing: -0.03em
rounded:
  none: 0px
  xs: 2px
  sm: 4px
  md: 8px
  lg: 12px
  xl: 16px
  full: 9999px
spacing:
  base: 4px
  xs: 4px
  sm: 8px
  md: 12px
  lg: 16px
  xl: 24px
  2xl: 32px
  3xl: 48px
  4xl: 64px
  gutter: 16px
components:
  app-shell:
    backgroundColor: "{colors.neutral}"
    textColor: "{colors.on-surface}"
    typography: "{typography.body-md}"
  scene-space:
    backgroundColor: "{colors.neutral}"
    textColor: "{colors.on-surface-muted}"
  scene-grid:
    backgroundColor: "{colors.scene-grid}"
  nav-rail:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface-muted}"
    width: 220px
  nav-rail-item-active:
    backgroundColor: "{colors.primary-container}"
    textColor: "{colors.on-primary-container}"
    rounded: "{rounded.md}"
    size: 40px
  top-bar:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
    height: 52px
  panel:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
    rounded: "{rounded.lg}"
    padding: 16px
  panel-raised:
    backgroundColor: "{colors.surface-raised}"
    textColor: "{colors.on-surface}"
    rounded: "{rounded.lg}"
    padding: 16px
  hud-glass:
    backgroundColor: "{colors.surface-glass}"
    textColor: "{colors.on-surface}"
    rounded: "{rounded.lg}"
    padding: 12px
  inspector:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
    width: 440px
    padding: 20px
  divider:
    backgroundColor: "{colors.outline}"
  divider-strong:
    backgroundColor: "{colors.outline-strong}"
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.label-lg}"
    rounded: "{rounded.md}"
    height: 36px
    padding: 14px
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
    textColor: "{colors.on-primary}"
  button-secondary:
    backgroundColor: "{colors.surface-overlay}"
    textColor: "{colors.on-surface}"
    typography: "{typography.label-lg}"
    rounded: "{rounded.md}"
    height: 36px
    padding: 14px
  button-secondary-hover:
    backgroundColor: "{colors.surface-bright}"
    textColor: "{colors.on-surface}"
  button-quiet:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.secondary}"
    typography: "{typography.label-lg}"
    rounded: "{rounded.md}"
    height: 32px
  button-agent:
    backgroundColor: "{colors.tertiary}"
    textColor: "{colors.on-tertiary}"
    typography: "{typography.label-lg}"
    rounded: "{rounded.md}"
    height: 36px
    padding: 14px
  button-agent-hover:
    backgroundColor: "{colors.tertiary-hover}"
    textColor: "{colors.on-tertiary}"
  button-danger:
    backgroundColor: "{colors.error}"
    textColor: "{colors.on-error}"
    typography: "{typography.label-lg}"
    rounded: "{rounded.md}"
    height: 36px
  input:
    backgroundColor: "{colors.surface-raised}"
    textColor: "{colors.on-surface}"
    typography: "{typography.body-md}"
    rounded: "{rounded.md}"
    height: 36px
    padding: 10px
  chip-filter:
    backgroundColor: "{colors.surface-raised}"
    textColor: "{colors.on-surface-muted}"
    typography: "{typography.label-md}"
    rounded: "{rounded.full}"
    height: 26px
  chip-filter-selected:
    backgroundColor: "{colors.primary-container}"
    textColor: "{colors.on-primary-container}"
    typography: "{typography.label-md}"
    rounded: "{rounded.full}"
    height: 26px
  chip-status-not-started:
    backgroundColor: "{colors.status-not-started-container}"
    textColor: "{colors.status-not-started}"
    typography: "{typography.label-md}"
    rounded: "{rounded.full}"
    height: 22px
  chip-status-in-progress:
    backgroundColor: "{colors.status-in-progress-container}"
    textColor: "{colors.status-in-progress}"
    typography: "{typography.label-md}"
    rounded: "{rounded.full}"
    height: 22px
  chip-status-implemented:
    backgroundColor: "{colors.status-implemented-container}"
    textColor: "{colors.status-implemented}"
    typography: "{typography.label-md}"
    rounded: "{rounded.full}"
    height: 22px
  chip-status-verified:
    backgroundColor: "{colors.status-verified-container}"
    textColor: "{colors.status-verified}"
    typography: "{typography.label-md}"
    rounded: "{rounded.full}"
    height: 22px
  chip-status-at-risk:
    backgroundColor: "{colors.status-at-risk-container}"
    textColor: "{colors.status-at-risk}"
    typography: "{typography.label-md}"
    rounded: "{rounded.full}"
    height: 22px
  chip-status-not-applicable:
    backgroundColor: "{colors.status-not-applicable-container}"
    textColor: "{colors.on-surface-muted}"
    typography: "{typography.label-md}"
    rounded: "{rounded.full}"
    height: 22px
  badge-agent:
    backgroundColor: "{colors.tertiary-container}"
    textColor: "{colors.on-tertiary-container}"
    typography: "{typography.label-md}"
    rounded: "{rounded.sm}"
  badge-framework-csf:
    backgroundColor: "{colors.framework-csf-container}"
    textColor: "{colors.framework-csf}"
    typography: "{typography.code-sm}"
    rounded: "{rounded.sm}"
  badge-framework-soc2:
    backgroundColor: "{colors.framework-soc2-container}"
    textColor: "{colors.framework-soc2}"
    typography: "{typography.code-sm}"
    rounded: "{rounded.sm}"
  badge-framework-rmf:
    backgroundColor: "{colors.framework-rmf-container}"
    textColor: "{colors.framework-rmf}"
    typography: "{typography.code-sm}"
    rounded: "{rounded.sm}"
  badge-framework-ai:
    backgroundColor: "{colors.framework-ai-container}"
    textColor: "{colors.framework-ai}"
    typography: "{typography.code-sm}"
    rounded: "{rounded.sm}"
  badge-framework-law:
    backgroundColor: "{colors.framework-law-container}"
    textColor: "{colors.framework-law}"
    typography: "{typography.code-sm}"
    rounded: "{rounded.sm}"
  requirement-code:
    backgroundColor: "{colors.surface-raised}"
    textColor: "{colors.primary}"
    typography: "{typography.code-md}"
    rounded: "{rounded.xs}"
  tooltip:
    backgroundColor: "{colors.surface-overlay}"
    textColor: "{colors.on-surface}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.sm}"
    padding: 8px
  command-palette:
    backgroundColor: "{colors.surface-overlay}"
    textColor: "{colors.on-surface}"
    typography: "{typography.body-lg}"
    rounded: "{rounded.xl}"
    width: 680px
  dialog:
    backgroundColor: "{colors.surface-raised}"
    textColor: "{colors.on-surface}"
    rounded: "{rounded.xl}"
    padding: 24px
    width: 560px
  table-header:
    backgroundColor: "{colors.surface-raised}"
    textColor: "{colors.on-surface-muted}"
    typography: "{typography.label-caps}"
    height: 36px
  table-row:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
    typography: "{typography.body-md}"
    height: 40px
  table-row-hover:
    backgroundColor: "{colors.surface-raised}"
    textColor: "{colors.on-surface}"
  metric-tile:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
    typography: "{typography.metric-xl}"
    rounded: "{rounded.lg}"
    padding: 16px
  progress-track:
    backgroundColor: "{colors.outline}"
    height: 6px
    rounded: "{rounded.full}"
  progress-fill:
    backgroundColor: "{colors.primary}"
    height: 6px
    rounded: "{rounded.full}"
  agent-step:
    backgroundColor: "{colors.tertiary-container}"
    textColor: "{colors.on-tertiary-container}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.md}"
    padding: 10px
  agent-step-tool:
    backgroundColor: "{colors.surface-raised}"
    textColor: "{colors.on-surface-muted}"
    typography: "{typography.code-sm}"
    rounded: "{rounded.md}"
    padding: 10px
  citation:
    backgroundColor: "{colors.surface-raised}"
    textColor: "{colors.secondary}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.sm}"
    padding: 8px
  toast:
    backgroundColor: "{colors.surface-overlay}"
    textColor: "{colors.on-surface}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.lg}"
    padding: 12px
  toast-error:
    backgroundColor: "{colors.status-at-risk-container}"
    textColor: "{colors.status-at-risk}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.lg}"
    padding: 12px
  scene-label:
    backgroundColor: "{colors.surface-glass}"
    textColor: "{colors.on-surface}"
    typography: "{typography.code-sm}"
    rounded: "{rounded.sm}"
    padding: 4px
  scene-sector-label:
    backgroundColor: "{colors.neutral}"
    textColor: "{colors.on-surface-muted}"
    typography: "{typography.label-caps}"
  scene-node-not-started:
    backgroundColor: "{colors.status-not-started}"
    textColor: "{colors.on-status}"
  scene-node-in-progress:
    backgroundColor: "{colors.status-in-progress}"
    textColor: "{colors.on-status}"
  scene-node-implemented:
    backgroundColor: "{colors.status-implemented}"
    textColor: "{colors.on-status}"
  scene-node-verified:
    backgroundColor: "{colors.status-verified}"
    textColor: "{colors.on-status}"
  scene-node-at-risk:
    backgroundColor: "{colors.status-at-risk}"
    textColor: "{colors.on-status}"
  scene-node-not-applicable:
    backgroundColor: "{colors.status-not-applicable}"
    textColor: "{colors.on-status}"
  scene-node-selected:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
  scene-agent-signal:
    backgroundColor: "{colors.tertiary}"
    textColor: "{colors.on-tertiary}"
  secondary-action:
    backgroundColor: "{colors.secondary}"
    textColor: "{colors.on-secondary}"
    typography: "{typography.label-lg}"
    rounded: "{rounded.md}"
    height: 32px
---

# Visua design system

This file is the single source of truth for Visua's visual identity. The YAML
front matter holds the normative tokens; everything below explains how to apply
them. `pnpm design:lint` validates this file with the official
`@google/design.md` linter, and `pnpm design:tokens` compiles the tokens into
CSS custom properties (for the 2D interface) and a typed module (for the 3D
scene materials). Never hard-code a color, font, radius or spacing value in
product code — reference the generated token instead.

## Overview

**Brand personality: "A clear view of what matters."** Visua gives a
security team a calm place to see and move its compliance program forward.
Warm backgrounds, readable information and restrained color help people find
the next action without hiding the surrounding context. The spatial view is a
useful map of the work, and each object has a clear path to its details.

- **Audience:** CISOs, GRC leads, security engineers, auditors and first-time
  founders facing their first SOC 2 — any niche, any cyber-maturity level.
  Novices must never feel lost; experts must never feel slowed down.
- **Emotional target:** composure and progress. Compliance work is stressful;
  Visua makes the whole picture legible and the next step easy to identify.
- **Character:** precise, evidence-first and quietly approachable. Avoid
  decorative complexity and product claims that outpace the evidence.
- **Signature:** the 3D *Observatory* canvas shows relationships between
  requirements. Clear 2D panels show the details and actions beside it. Every
  3D object has a 2D twin in an outline view.
- **AI presence:** agents are colleagues whose work is always visible,
  attributable (terracotta), cited and reversible.

## Colors

The palette uses warm, nearly white surfaces and dark forest ink. Color has
three roles outside of status: interaction (Sage), AI agency (Terracotta) and
framework identity (used only when frameworks share a view). Large surfaces
stay neutral so dense information remains readable.

- **Primary — Sage (#366B53):** the single interaction color:
  primary buttons, focus rings, selection, the selected 3D node and the active
  camera target. `primary-hover` (#285740) is its hover state. Text on primary
  uses white `on-primary` (#FFFFFF). The pale `primary-container` (#E3F0E7)
  identifies selected filters and navigation without flooding the page.
- **Secondary — Quiet green (#52665A):** secondary actions and citation text;
  a quieter voice than primary.
- **Tertiary — Terracotta (#A3553F):** reserved for AI agent
  presence: agent buttons, agent-authored drafts awaiting approval, agent
  signals and activity indicators. Pair the color with a label that names the
  agent or action.
- **Neutral — Porcelain (#F7F8F4):** the workspace canvas. `surface`
  (#FFFFFF) is the main panel color; `surface-raised` (#F2F5F0) groups cards
  and inputs; `surface-overlay` (#FFFFFF) holds popovers and the command
  palette; `surface-bright` (#E8EEE7) gives hover feedback. `surface-glass`
  (#FFFFFFE8) keeps labels legible over the 3D canvas.
- **Text:** `on-surface` Forest Ink (#1D3028) is primary text and
  `on-surface-muted` (#5B6C61) is secondary text. Both meet WCAG AA on the
  specified light surfaces.
- **Status (the only colors that encode implementation state):**
  - Not started — Slate (#607168)
  - In progress — Ochre (#8A6222)
  - Implemented — Fern (#2F7350)
  - Verified (evidence accepted or assessed) — Teal (#286C80)
  - At risk (failing, expired evidence, overdue) — Clay (#B3473E)
  - Not applicable — Grey (#626B65)

  Each status has a `-container` tint for chips; chip text uses the status
  color itself (or `on-surface-muted` for Not applicable). Solid status nodes
  use white labels. These hues are distinct from the action colors and remain
  legible on the specified light surfaces.
- **Framework identity:** NIST CSF (#3E6386), SOC 2 (#805576), NIST RMF /
  SP 800-53 (#57703B), NIST AI RMF (#97552A) and U.S. state AI laws
  (#705994). Use these colors for framework badges and the Crosswalk Nexus,
  never for status. Framework color always travels with a text label. Threat
  catalogs (MITRE ATLAS, OWASP) use neutral ink and an inner Nexus ring, so
  position and text carry their meaning.

## Typography

Three families with strict roles:

- **Space Grotesk** (display, headlines, capitalized labels, metrics): its
  geometric construction gives headings a distinct, friendly voice. Headlines
  are Semi-Bold with slight negative tracking.
- **IBM Plex Sans** (all body copy, UI labels, form content): institutional,
  trustworthy and highly legible at 13–16px on light backgrounds.
- **IBM Plex Mono** (every requirement identifier and machine value): control
  codes such as `GV.OC-01`, `CC6.1`, `AC-2(1)`, hashes, timestamps and tool
  calls. A requirement ID is always monospace so it is scannable in lists and
  in 3D labels.

Rules: `label-caps` is uppercase with 0.12em tracking and is used for section
eyebrows and table headers only. `metric-xl` keeps proportional figures (tabular
figures make large standalone numbers look loose); use `font-variant-numeric:
tabular-nums` only where numbers align in columns — tables and chart axes.
Never use more than two weights on one panel.

## Layout

A **three-zone** layout keeps navigation and context visible:

1. **Navigation** (220px, left): labeled destinations and clear groups make
   Observatory, Frameworks, Plan, Evidence, Agents, Policies, Trust and Settings
   easy to find. Icons help scanning, but labels remain visible on desktop.
2. **Canvas** (fluid, center): the 3D Observatory or the 2D view for the current
   destination. Compact controls sit on a 16px inset over spatial views.
3. **Inspector** (440px, right, collapsible): details and actions for the
   current selection. It never covers the camera target: the scene re-frames
   when the inspector opens.

A 52px top bar holds the workspace switcher, framework switcher, global
search / command palette (⌘K) and agent activity indicator.

Spacing follows a strict **4px base scale** (`xs` 4, `sm` 8, `md` 12, `lg` 16,
`xl` 24, `2xl` 32, `3xl` 48, `4xl` 64). Panels use 16px padding; the inspector
uses 20px; dialogs 24px. Dense data views (tables, outlines) use 40px rows.
Below 1024px the inspector becomes a bottom sheet and the rail collapses into
a labeled navigation drawer available from the top bar; the current section
stays named in the header. The 3D canvas remains available but defaults to the
2D outline on touch devices smaller than 768px.

## Elevation & Depth

Depth in the 2D layer comes from **gentle tonal layering**, a 1px `outline`
(#D9E1D8) border and restrained shadows. The porcelain canvas holds white
panels; softly tinted raised surfaces group related details within them.
Overlays (command palette, dialogs) add a soft ambient shadow so their bounds
remain clear. Panels over the spatial canvas use `surface-glass` with a 12px
backdrop blur. Borders and shadows mark groups without turning every row into
a separate card.

## Spatial System

The 3D Observatory is Visua's signature surface and follows these rules.

- **Coordinates:** Y is up. A framework is laid out on the XZ plane around the
  origin; hierarchy depth maps to radius (root at the center, leaves at the
  rim). Height (Y) is reserved for a *measured value* — maturity, readiness or
  time — never decoration.
- **Geometry vocabulary** (one shape per object kind, so kind is readable
  without color):
  - Framework core — an icosahedron at the origin with a clear silhouette.
  - Function / family / criteria series — a sector arc with a floating
    `label-caps` title.
  - Category / control — a ring-mounted beacon (low cylinder).
  - Subcategory / criterion / control enhancement (the unit of work) — a
    hexagonal prism node. Its height encodes current maturity; a translucent
    ghost prism encodes the target, so the gap is literally visible.
  - Task — a small satellite (octahedron) orbiting its requirement.
  - Evidence — a crystal (tetrahedron) docked on its requirement; changes to
    the at-risk color when expired.
  - Agent — a terracotta marker travelling along links while work is active.
- **Materials:** physically based and matte (roughness 0.55–0.7, metalness
  ≤ 0.2).
  Node base color is the status token. Use an outline, scale or clear selection
  ring for hover and selection; keep emissive effects subtle on the light scene.
- **Lighting:** one soft key light, one hemisphere fill tinted from `neutral`
  to `primary-container`, and gentle atmospheric fade in `neutral` so distant
  objects recede without losing their silhouettes. No hard shadows.
- **Camera:** 45° field of view, damped orbit (damping 0.08). Selecting an
  object flies the camera to it in 800ms with ease-in-out. The camera never
  flips below the XZ plane. Double-click frames the object's subtree.
- **Semantic zoom (level of detail):** far — framework and function titles;
  middle — category codes; near — requirement codes and task satellites.
  Labels are billboards using `code-sm`, clamped between 11px and 14px on
  screen, and never overlap: lower-priority labels hide first.
- **Lenses:** the same space can be re-encoded without moving objects —
  Status, Gap (target − current), Evidence freshness, Ownership, Priority and
  Crosswalk coverage. The active lens is always named in the HUD legend.
- **Performance budget:** 60 fps on an integrated GPU with the full SP 800-53
  catalog visible; instanced meshes for every repeated object; device pixel
  ratio capped at 1.75; no post-processing pass in the light scene.

## Shapes

The shape language is **precise, softened geometry**. Interactive 2D
elements use an 8px radius (`md`); cards and panels 12px (`lg`); overlays 16px
(`xl`). Chips and status pills are fully rounded (`full`). Requirement code
tags use a 2px radius (`xs`) so they read as technical labels. In 3D, hexagonal
prisms echo the hexagonal grid of the Readiness Terrain. Never mix sharp and
rounded corners inside one component.

## Motion

Motion always means something changed or someone (a person or an agent) is
working. Durations: 120ms (hover, press), 200ms (panels, chips), 320ms
(layout), 800ms (camera flights). Easing is cubic ease-in-out for camera
moves and ease-out for UI entrances. Status transitions morph color and
prism height over 600ms so progress is felt. The scene is still when nothing
happens. When the user prefers reduced motion, camera flights become 150ms
cross-fades, particles and pulses are replaced by static halos, and idle
drift is disabled.

## Interaction principles

Each interaction makes its state visible. Keep the page structure stable while
content, progress and recommendations change within it.

- Keep primary navigation labeled and visible on desktop. Remove duplicate
  actions before hiding useful information.
- Show a pressed or pending state immediately after an action. Mark saved,
  failed and reversible outcomes near the item that changed.
- Use a skeleton or named loading state when content takes time to appear.
  Preserve space so the layout does not jump when the result arrives.
- Keep one clear next action in each task context. Use relevant defaults and
  recent selections to shorten routine work without rearranging navigation.
- Surface agent suggestions where they help with the current task. Identify
  their source and approval state, and keep citations available on demand.
- Group dense information with headings, alignment and typographic hierarchy.
  Reveal details on request without hiding the fields needed to decide.

## Components

These component roles keep actions, status and evidence consistent across the
workspace.

- **Buttons:** `button-primary` (Sage) for the single most
  important action in a view; `button-secondary` for everything else;
  `button-quiet` for tertiary actions in dense panels; `button-agent`
  (Terracotta) for any action that starts or approves AI agent work;
  `button-danger` only for destructive actions, always confirmed.
- **Status chips:** `chip-status-*` pair a colored dot, a text label and the
  status color on its container tint — status is never conveyed by color
  alone.
- **Filter chips:** `chip-filter` / `chip-filter-selected` drive lenses and
  facet filters in the HUD and outline.
- **Requirement code:** `requirement-code` renders IDs (`PR.AA-05`) in mono on a
  raised surface; clicking one always flies the camera to that requirement.
- **Framework badges:** `badge-framework-csf|soc2|rmf|ai|law` appear wherever
  items from multiple frameworks are listed together.
- **Agent components:** `badge-agent` marks agent-authored content until a
  human approves it; `agent-step` renders a reasoning step in the flight
  recorder; `agent-step-tool` renders a tool call and its result in mono;
  `citation` renders a quoted passage from the official corpus with document,
  section and page.
- **Inspector:** 440px docked panel with a header (code, title, status chip),
  tabbed body (Overview, Tasks, Evidence, Mappings, History) and a sticky
  footer holding the primary action.
- **HUD (`hud-glass`):** floating read-outs over the canvas: legend, lens
  switcher, minimap and camera breadcrumbs.
- **Command palette:** ⌘K / Ctrl+K opens a 680px palette that accepts both
  commands ("go to PR.AA") and natural-language requests to the copilot.
- **Metric tiles:** `metric-tile` shows one number with a label and a trend;
  used sparingly (max four per view).
- **Tables & outline:** `table-header` in `label-caps`, 40px `table-row` with
  `table-row-hover`; the outline is a keyboard-navigable tree mirroring the 3D
  hierarchy one-to-one.
- **Progress:** `progress-track` + `progress-fill`; fills may take a status
  color when they represent status distribution.
- **Toasts and dialogs:** `toast` for confirmations, `toast-error` for
  failures, `dialog` for decisions that need focus.

## Agent Presence

AI is first-class and fully transparent:

1. Every agent run has a **flight recorder**: goal, plan, each step, each tool
   call with inputs and outputs, citations and the final proposal.
2. Changes that alter compliance state (statuses, policies, evidence acceptance)
   are staged as agent-marked drafts and
   applied only after approval, unless the workspace explicitly grants the
   agent autonomy for that action type.
3. Claims about a framework must carry a **citation** into the local official
   corpus (document, section, page). No citation, no claim.
4. Confidence is shown in words (low / medium / high) with the reason, never
   as a bare percentage.
5. In the scene, an agent marker moves to the node being worked on, and a
   labeled activity state remains visible until the run ends.

## Do's and Don'ts

Use these rules when adding or revising a view.

- Do give every 3D view an equivalent, keyboard-navigable 2D outline.
- Do use Sage for the primary action in a view.
- Do reserve Terracotta for AI agent activity and actions.
- Do encode status with color **and** shape/icon **and** text.
- Do show requirement IDs in IBM Plex Mono and make them navigable.
- Do cite the official source for every framework statement.
- Do maintain WCAG 2.2 AA contrast (4.5:1 for text, 3:1 for UI shapes).
- Don't use height, glow or motion decoratively — each must encode data or
  activity.
- Don't use red or amber outside of status semantics.
- Don't auto-rotate the camera or animate idle scenes by default.
- Don't hide information only in 3D; don't make 3D the only way to act.
- Don't show more than four metric tiles in a view, or more than two font
  weights in one panel.
- Don't use gradients as decoration; use them only when they clarify depth or
  active spatial content.

## Accessibility

Visua targets WCAG 2.2 AA. Focus is always visible (2px Sage ring
with 2px offset). Minimum pointer targets are 32px (24px absolute minimum per
WCAG 2.2). Every 3D interaction has a keyboard path: arrow keys walk
siblings, Enter drills down, Backspace/Escape goes up, `/` searches, `F` frames
the selection, `L` cycles lenses. Agent events are announced through a polite
live region. Reduced-motion and high-contrast preferences are honored
automatically.

## Voice & Tone

Precise, calm and specific. Use the framework's own vocabulary: *outcomes*
(CSF subcategories), *criteria* (SOC 2), *controls* (SP 800-53), *tasks* (RMF).
Prefer "3 subcategories have no evidence" to "You're at risk!". Explain why a
recommendation matters and cite where it comes from. Never promise
certification; Visua prepares organizations for assessment and audit.


SOURCE apps/web/src/scene/FrameworkScene.tsx
/**
 * The framework space: every object encodes data (DESIGN.md › Spatial System).
 * Units of work are instanced hex prisms (height = current level) topped with
 * translucent "gap glass" up to the target level; groups are beacons; tasks
 * orbit as satellites; evidence docks as crystals; agents travel as comets.
 */
import { Line } from "@react-three/drei";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import { memo, useLayoutEffect, useMemo, useRef } from "react";
import {
  BufferGeometry,
  Color,
  CylinderGeometry,
  Float32BufferAttribute,
  IcosahedronGeometry,
  InstancedMesh,
  Object3D,
  OctahedronGeometry,
  QuadraticBezierCurve3,
  TetrahedronGeometry,
  Vector3,
  type Group,
  type Mesh,
} from "three";
import type { FrameworkStateBundle } from "../lib/types.ts";
import { useAgentActivity } from "../state/agentActivity.ts";
import type { Lens } from "../state/ui.ts";
import { TOKENS, unitColor } from "./colors.ts";
import type { Layout, Vec3 } from "./layout.ts";
import { ScreenLabels, type ScreenLabel } from "./ScreenLabels.tsx";


export interface SceneProps {
  layout: Layout;
  state: FrameworkStateBundle | undefined;
  lens: Lens;
  selectedId: string | null;
  hoveredId: string | null;
  focusIds: string[];
  reducedMotion: boolean;
  onHover: (id: string | null, clientX?: number, clientY?: number) => void;
  onSelect: (id: string | null) => void;
}

const tmp = new Object3D();
const tmpColor = new Color();
const hexGeometry = new CylinderGeometry(1, 1, 1, 6, 1);
hexGeometry.translate(0, 0.5, 0);

export function heightFor(level: number, view: Layout["view"]) {
  return view === "terrain" ? 0.3 + level * 0.9 : 0.22 + level * 0.46;
}

// ---------------------------------------------------------------------------

function UnitField({ layout, state, lens, onHover, onSelect, reducedMotion }: SceneProps) {
  const mesh = useRef<InstancedMesh>(null);
  const glass = useRef<InstancedMesh>(null);
  const ids = layout.units;
  const count = ids.length;
  const shown = useRef<Float32Array>(new Float32Array(count));
  const goal = useRef<Float32Array>(new Float32Array(count));
  const tops = useRef<Float32Array>(new Float32Array(count));
  // Units out of scope (not applicable, or no link for a threat) shrink to small dots so the ones that count stand out.
  const widths = useRef<Float32Array>(new Float32Array(count).fill(1));
  const animating = useRef(true);

  // Targets for heights whenever state changes.
  useLayoutEffect(() => {
    const g = new Float32Array(count);
    const t = new Float32Array(count);
    const w = new Float32Array(count);
    ids.forEach((id, i) => {
      const u = state?.units[id];
      const out = !!u && !u.applicable;
      g[i] = out ? 0.08 : heightFor(u ? u.current : 0, layout.view);
      t[i] = u && u.applicable ? heightFor(Math.max(u.current, u.target), layout.view) : g[i]!;
      w[i] = out ? 0.42 : 1;
    });
    goal.current = g;
    tops.current = t;
    widths.current = w;
    if (shown.current.length !== count) shown.current = new Float32Array(g);
    if (reducedMotion) shown.current = new Float32Array(g);
    animating.current = true;
  }, [ids, state, count, layout.view, reducedMotion]);

  // Colors per lens.
  useLayoutEffect(() => {
    const m = mesh.current;
    if (!m) return;
    ids.forEach((id, i) => {
      unitColor(lens, state?.units[id], tmpColor);
      m.setColorAt(i, tmpColor);
    });
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }, [ids, state, lens]);

  useFrame((_, dt) => {
    const m = mesh.current;
    const gl = glass.current;
    if (!m || !gl || !animating.current) return;
    let moving = false;
    const k = Math.min(1, dt * 6);
    for (let i = 0; i < count; i++) {
      const cur = shown.current[i] ?? 0;
      const tgt = goal.current[i] ?? 0;
      const next = Math.abs(tgt - cur) < 0.002 ? tgt : cur + (tgt - cur) * k;
      if (next !== tgt) moving = true;
      shown.current[i] = next;
      const p = layout.positions.get(ids[i]!)!;
      const r = layout.cell * (widths.current[i] ?? 1);
      tmp.position.set(p[0], 0, p[2]);
      tmp.scale.set(r, next, r);
      tmp.updateMatrix();
      m.setMatrixAt(i, tmp.matrix);
      const top = tops.current[i] ?? next;
      const gapH = Math.max(0.0001, top - next);
      tmp.position.set(p[0], next, p[2]);
      tmp.scale.set(r * 0.98, gapH, r * 0.98);
      tmp.updateMatrix();
      gl.setMatrixAt(i, tmp.matrix);
    }
    m.instanceMatrix.needsUpdate = true;
    gl.instanceMatrix.needsUpdate = true;
    m.computeBoundingSphere();
    animating.current = moving;
  });

  const handleMove = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    if (e.instanceId === undefined) return;
    onHover(ids[e.instanceId] ?? null, e.nativeEvent.clientX, e.nativeEvent.clientY);
    document.body.style.cursor = "pointer";
  };
  const handleOut = () => {
    onHover(null);
    document.body.style.cursor = "";
  };
  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    if (e.instanceId !== undefined) onSelect(ids[e.instanceId] ?? null);
  };

  return (
    <group>
      <instancedMesh ref={mesh} args={[hexGeometry, undefined, count]} onPointerMove={handleMove} onPointerOut={handleOut} onClick={handleClick} frustumCulled={false}>
        <meshStandardMaterial roughness={0.72} metalness={0.04} />
      </instancedMesh>
      <instancedMesh ref={glass} args={[hexGeometry, undefined, count]} raycast={() => null} frustumCulled={false}>
        <meshStandardMaterial color={TOKENS.primary} transparent opacity={0.27} roughness={0.7} metalness={0} depthWrite={false} />
      </instancedMesh>
    </group>
  );
}

// ---------------------------------------------------------------------------

function Beacons({ layout, state, onSelect, onHover }: SceneProps) {
  const hubs = layout.hubs;
  const mids = layout.mids.filter((id) => layout.positions.has(id) && layout.view === "constellation");
  const hubMesh = useRef<InstancedMesh>(null);
  const midMesh = useRef<InstancedMesh>(null);
  useLayoutEffect(() => {
    const place = (mesh: InstancedMesh | null, list: string[], radius: number, height: number) => {
      if (!mesh) return;
      list.forEach((id, i) => {
        const p = layout.positions.get(id) ?? [0, 0, 0];
        tmp.position.set(p[0], 0, p[2]);
        tmp.scale.set(radius, height, radius);
        tmp.updateMatrix();
        mesh.setMatrixAt(i, tmp.matrix);
        const g = state?.groups[id];
        tmpColor.copy(g ? TOKENS.status[g.status] : TOKENS.status["not-started"]);
        mesh.setColorAt(i, tmpColor);
      });
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      mesh.computeBoundingSphere();
    };
    place(hubMesh.current, hubs, layout.view === "terrain" ? 0.9 : 1.15, 0.5);
    place(midMesh.current, mids, 0.5, 0.28);
  }, [layout, state, hubs, mids]);

  const click = (list: string[]) => (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    if (e.instanceId !== undefined) onSelect(list[e.instanceId] ?? null);
  };
  const move = (list: string[]) => (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    if (e.instanceId !== undefined) onHover(list[e.instanceId] ?? null, e.nativeEvent.clientX, e.nativeEvent.clientY);
    document.body.style.cursor = "pointer";
  };
  const out = () => {
    onHover(null);
    document.body.style.cursor = "";
  };
  return (
    <group>
      {hubs.length > 0 && (
        <instancedMesh key={`h${hubs.length}`} ref={hubMesh} args={[hexGeometry, undefined, hubs.length]} onClick={click(hubs)} onPointerMove={move(hubs)} onPointerOut={out}>
          <meshStandardMaterial roughness={0.68} metalness={0.06} />
        </instancedMesh>
      )}
      {mids.length > 0 && (
        <instancedMesh key={`m${mids.length}`} ref={midMesh} args={[new CylinderGeometry(1, 1, 1, 24, 1).translate(0, 0.5, 0), undefined, mids.length]} onClick={click(mids)} onPointerMove={move(mids)} onPointerOut={out}>
          <meshStandardMaterial roughness={0.7} metalness={0.05} />
        </instancedMesh>
      )}
    </group>
  );
}

// ---------------------------------------------------------------------------

function Links({ layout }: { layout: Layout }) {
  const geometry = useMemo(() => {
    const pts: number[] = [];
    for (const [a, b] of layout.links) {
      const pa = layout.positions.get(a);
      const pb = layout.positions.get(b);
      if (!pa || !pb) continue;
      pts.push(pa[0], 0.05, pa[2], pb[0], 0.05, pb[2]);
    }
    // Rays from the core to each top-level group.
    for (const h of layout.hubs) {
      const p = layout.positions.get(h)!;
      pts.push(0, 0.05, 0, p[0], 0.05, p[2]);
    }
    const g = new BufferGeometry();
    g.setAttribute("position", new Float32BufferAttribute(pts, 3));
    return g;
  }, [layout]);
  if (layout.view === "terrain") return null;
  return (
    <lineSegments geometry={geometry} raycast={() => null}>
      <lineBasicMaterial color={TOKENS.outlineStrong} transparent opacity={0.78} />
    </lineSegments>
  );
}

function Rings({ layout }: { layout: Layout }) {
  const rings = useMemo(() => {
    if (layout.view === "terrain") return [layout.sectors[0]?.radius ?? 10];
    const radii = new Set<number>();
    for (const id of [...layout.hubs, ...layout.mids.slice(0, 1)]) {
      const p = layout.positions.get(id);
      if (p) radii.add(Math.round(Math.hypot(p[0], p[2]) * 10) / 10);
    }
    radii.add(layout.sectors[0]?.radius ?? 0);
    return [...radii].filter((r) => r > 0);
  }, [layout]);
  return (
    <group rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
      {rings.map((r) => (
        <mesh key={r} raycast={() => null}>
          <ringGeometry args={[r - 0.03, r + 0.03, 192]} />
          <meshBasicMaterial color={TOKENS.grid} transparent opacity={0.95} />
        </mesh>
      ))}
    </group>
  );
}

/**
 * A billboard that hides itself when the camera comes closer than `near`, so
 * large sector titles never fill the foreground after a fly-in.
 */
function Sectors({ layout, state, selectedId }: SceneProps) {
  // Stable per layout: drei's Line disposes its material whenever its points change, and three.js
  // then deletes the shared shader program, re-linked (blocking) on the next frame.
  const arcs = useMemo(
    () =>
      layout.sectors.map((s) => {
        const points: Vec3[] = [];
        const steps = 48;
        for (let i = 0; i <= steps; i++) {
          const a = s.start + ((s.end - s.start) * i) / steps;
          points.push([Math.cos(a) * s.radius, 0.02, Math.sin(a) * s.radius]);
        }
        return points;
      }),
    [layout],
  );
  if (layout.view !== "constellation") return null;
  return (
    <group>
      {layout.sectors.map((s, i) => {
        const g = state?.groups[s.id];
        const color = g ? TOKENS.status[g.status] : TOKENS.outlineStrong;
        const active = selectedId === s.id;
        return <Line key={s.id} points={arcs[i]!} color={active ? TOKENS.primary : color} lineWidth={active ? 3 : 1.5} transparent opacity={active ? 1 : 0.72} />;
      })}
    </group>
  );
}

// ---------------------------------------------------------------------------

function Core({ active }: { active: boolean }) {
  const ref = useRef<Mesh>(null);
  const geometry = useMemo(() => new IcosahedronGeometry(1.4, 1), []);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    ref.current.rotation.y += active ? 0.01 : 0;
    const mat = ref.current.material as unknown as { emissiveIntensity: number };
    mat.emissiveIntensity = active ? 0.18 + Math.sin(clock.elapsedTime * 3) * 0.06 : 0.04;
  });
  return (
    <mesh ref={ref} geometry={geometry} position={[0, 1.6, 0]} raycast={() => null}>
      <meshStandardMaterial color={TOKENS.primary} emissive={TOKENS.primary} emissiveIntensity={0.04} roughness={0.6} metalness={0.06} flatShading />
    </mesh>
  );
}

/** Selection halo + highlighted ancestry path. */
function Selection({ layout, selectedId, state }: SceneProps) {
  // The ancestry path changes with the selection only (see Sectors on why points stay stable).
  const path = useMemo(() => {
    const out: Vec3[] = [];
    let cur = selectedId ? layout.byId.get(selectedId) : undefined;
    while (cur) {
      const q = layout.positions.get(cur.id);
      if (q) out.push([q[0], 0.08, q[2]]);
      cur = cur.parentId ? layout.byId.get(cur.parentId) : undefined;
    }
    out.push([0, 0.08, 0]);
    return out;
  }, [layout, selectedId]);
  if (!selectedId) return null;
  const p = layout.positions.get(selectedId);
  if (!p) return null;
  const node = layout.byId.get(selectedId);
  const u = state?.units[selectedId];
  const h = node?.assessable ? heightFor(Math.max(u?.current ?? 0, u?.target ?? 0), layout.view) : 0.6;
  const r = node?.assessable ? layout.cell * 1.6 : layout.view === "terrain" ? 1.6 : 1.9;
  return (
    <group>
      <mesh position={[p[0], 0.04, p[2]]} rotation={[-Math.PI / 2, 0, 0]} raycast={() => null}>
        <ringGeometry args={[r * 0.82, r, 6]} />
        <meshBasicMaterial color={TOKENS.primary} toneMapped={false} />
      </mesh>
      <mesh position={[p[0], h + 0.05, p[2]]} rotation={[-Math.PI / 2, 0, 0]} raycast={() => null}>
        <ringGeometry args={[r * 0.55, r * 0.62, 6]} />
        <meshBasicMaterial color={TOKENS.primary} toneMapped={false} transparent opacity={0.7} />
      </mesh>
      {layout.view === "constellation" && path.length > 1 && <Line points={path} color={TOKENS.primary} lineWidth={2.2} />}
    </group>
  );
}

/** Tasks as satellites orbiting their requirement (up to three per unit). */
function Satellites({ layout, state, reducedMotion }: SceneProps) {
  const ref = useRef<InstancedMesh>(null);
  const slots = useMemo(() => {
    const out: { p: Vec3; k: number; n: number; h: number }[] = [];
    for (const id of layout.units) {
      const u = state?.units[id];
      if (!u || !u.openTasks) continue;
      const p = layout.positions.get(id)!;
      const n = Math.min(3, u.openTasks);
      for (let k = 0; k < n; k++) out.push({ p, k, n, h: heightFor(Math.max(u.current, u.target), layout.view) });
    }
    return out;
  }, [layout, state]);
  const geometry = useMemo(() => new OctahedronGeometry(0.13, 0), []);
  useFrame(({ clock }) => {
    const m = ref.current;
    if (!m) return;
    const t = reducedMotion ? 0 : clock.elapsedTime * 0.8;
    slots.forEach((s, i) => {
      const a = t + (s.k / s.n) * Math.PI * 2;
      const rr = layout.cell * 1.55;
      tmp.position.set(s.p[0] + Math.cos(a) * rr, s.h + 0.25, s.p[2] + Math.sin(a) * rr);
      tmp.rotation.set(0, a, 0);
      tmp.scale.setScalar(1);
      tmp.updateMatrix();
      m.setMatrixAt(i, tmp.matrix);
    });
    m.instanceMatrix.needsUpdate = true;
  });
  if (!slots.length) return null;
  return (
    <instancedMesh key={slots.length} ref={ref} args={[geometry, undefined, slots.length]} raycast={() => null} frustumCulled={false}>
      <meshStandardMaterial color={TOKENS.onSurface} roughness={0.65} />
    </instancedMesh>
  );
}

/** Evidence crystals docked on units with accepted evidence. */
function Crystals({ layout, state }: SceneProps) {
  const ref = useRef<InstancedMesh>(null);
  const items = useMemo(() => layout.units.filter((id) => (state?.units[id]?.evidence ?? 0) > 0), [layout, state]);
  const geometry = useMemo(() => new TetrahedronGeometry(0.17, 0), []);
  useLayoutEffect(() => {
    const m = ref.current;
    if (!m) return;
    items.forEach((id, i) => {
      const p = layout.positions.get(id)!;
      const u = state!.units[id]!;
      tmp.position.set(p[0], heightFor(Math.max(u.current, u.target), layout.view) + 0.28, p[2]);
      tmp.rotation.set(0.6, 0.8, 0);
      tmp.scale.setScalar(1);
      tmp.updateMatrix();
      m.setMatrixAt(i, tmp.matrix);
      tmpColor.copy(u.status === "at-risk" ? TOKENS.status["at-risk"] : TOKENS.status.verified);
      m.setColorAt(i, tmpColor);
    });
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }, [items, layout, state]);
  if (!items.length) return null;
  return (
    <instancedMesh key={items.length} ref={ref} args={[geometry, undefined, items.length]} raycast={() => null} frustumCulled={false}>
      <meshStandardMaterial roughness={0.45} metalness={0.04} />
    </instancedMesh>
  );
}

/** Warm comets travelling from the core to nodes an agent is working on. */
function AgentComets({ layout, reducedMotion }: { layout: Layout; reducedMotion: boolean }) {
  const hot = useAgentActivity((s) => s.hot);
  const targets = useMemo(() => Object.keys(hot).filter((id) => layout.positions.has(id)).slice(0, 24), [hot, layout]);
  return <Comets layout={layout} targets={targets} reducedMotion={reducedMotion} />;
}

function Comets({ layout, targets, reducedMotion }: { layout: Layout; targets: string[]; reducedMotion: boolean }) {
  const curves = useMemo(
    () =>
      targets.map((id) => {
        const p = layout.positions.get(id)!;
        const end = new Vector3(p[0], 0.9, p[2]);
        const mid = new Vector3(p[0] * 0.5, 4 + Math.hypot(p[0], p[2]) * 0.18, p[2] * 0.5);
        return new QuadraticBezierCurve3(new Vector3(0, 1.6, 0), mid, end);
      }),
    [targets, layout],
  );
  const trails = useMemo(() => curves.map((c) => c.getPoints(32)), [curves]);
  const heads = useRef<(Mesh | null)[]>([]);
  useFrame(({ clock }) => {
    curves.forEach((curve, i) => {
      const m = heads.current[i];
      if (!m) return;
      const t = reducedMotion ? 1 : (clock.elapsedTime * 0.45 + i * 0.13) % 1;
      m.position.copy(curve.getPoint(t));
      m.scale.setScalar(reducedMotion ? 1 : 0.7 + Math.sin(t * Math.PI) * 0.6);
    });
  });
  if (!curves.length) return null;
  return (
    <group>
      {curves.map((curve, i) => (
        <group key={targets[i]}>
          <Line points={trails[i]!} color={TOKENS.tertiary} lineWidth={1.5} transparent opacity={0.62} />
          <mesh ref={(el) => (heads.current[i] = el)} raycast={() => null}>
            <sphereGeometry args={[0.22, 12, 12]} />
            <meshBasicMaterial color={TOKENS.tertiary} toneMapped={false} />
          </mesh>
          <mesh position={curve.getPoint(1)} rotation={[-Math.PI / 2, 0, 0]} raycast={() => null}>
            <ringGeometry args={[layout.cell * 1.2, layout.cell * 1.45, 6]} />
            <meshBasicMaterial color={TOKENS.tertiary} toneMapped={false} transparent opacity={0.8} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

const pct = (x: number) => `${Math.round(x * 100)}%`;

/**
 * Titles and codes, placed in screen space (ScreenLabels): sector titles outside the
 * ring; codes for the selection, hover, agent focus, the selected group's members and
 * the mid-level groups when there are few. Higher priority wins where labels collide.
 */
function SceneLabels({ layout, state, selectedId, hoveredId, focusIds, onSelect }: SceneProps) {
  const labels = useMemo<ScreenLabel[]>(() => {
    const out: ScreenLabel[] = [];
    const selected = selectedId ? layout.byId.get(selectedId) : undefined;
    let root = selected;
    while (root?.parentId) root = layout.byId.get(root.parentId);
    for (const s of layout.sectors) {
      const g = state?.groups[s.id];
      const mid = (s.start + s.end) / 2;
      const position: Vec3 = layout.view === "constellation" ? [Math.cos(mid) * (s.radius + 1), 0.3, Math.sin(mid) * (s.radius + 1)] : s.labelPos;
      const titled = !!s.title && s.title.toUpperCase() !== s.code.toUpperCase();
      const sub = g ? (state?.threat ? `${pct(g.readiness)} covered · ${g.total} with links` : `${pct(g.readiness)} ready · ${g.gaps} gaps`) : undefined;
      const priority = root ? (root.id === s.id ? 700 : 300) : 500;
      const sector = { variant: "sector" as const, position, outwardFrom: [0, 0, 0] as Vec3, group: `sector:${s.id}`, active: selectedId === s.id, onClick: () => onSelect(s.id) };
      out.push({ ...sector, id: `sector:${s.id}`, code: titled ? s.code : undefined, title: titled ? s.title : s.code, sub, priority });
      // Where its title does not fit (twenty SP 800-53 families), a sector keeps its code, with its read-out if there is room.
      if (titled) {
        out.push({ ...sector, id: `sector:${s.id}:code`, title: s.code, sub, priority: priority - 12 });
        if (sub) out.push({ ...sector, id: `sector:${s.id}:bare`, title: s.code, priority: priority - 14 });
      }
    }
    const focus = new Set(focusIds);
    const members = new Set<string>();
    const group = selected ? (selected.assessable && selected.parentId ? selected.parentId : selected.id) : undefined;
    if (group) {
      const walk = (id: string) => {
        for (const k of layout.children.get(id) ?? []) {
          members.add(k.id);
          if (members.size < 90) walk(k.id);
        }
      };
      walk(group);
    }
    const ids = new Set<string>([selectedId, hoveredId, ...focusIds, ...members].filter((id): id is string => !!id && layout.positions.has(id)));
    if (layout.view === "constellation" && layout.mids.length <= 40) for (const id of layout.mids) ids.add(id);
    for (const id of ids) {
      const node = layout.byId.get(id);
      const p = layout.positions.get(id)!;
      const u = state?.units[id];
      const emphasized = id === selectedId || id === hoveredId;
      const y = node?.assessable ? heightFor(Math.max(u?.current ?? 0, u?.target ?? 0), layout.view) + 0.3 : 0.9;
      out.push({
        id: `code:${id}`,
        variant: emphasized ? "selected" : "code",
        position: [p[0], y, p[2]],
        title: (node?.meta?.["label"] as string | undefined) ?? node?.code ?? "",
        // Groups with units in scope (a law that applies) outrank the rest when space is short.
        priority: id === selectedId ? 1000 : id === hoveredId ? 900 : focus.has(id) ? 450 : members.has(id) ? 350 : state?.groups[id]?.total ? 260 : 200,
        active: id === selectedId,
      });
    }
    return out;
  }, [layout, state, selectedId, hoveredId, focusIds, onSelect]);
  return <ScreenLabels labels={labels} />;
}

/**
 * Compiles, as soon as the scene is up, the shader programs that only a selection and agent
 * activity use: the selection halo and path, and agent comets. Compiled on first use, they
 * stalled the frame that answered the first click by 60 to 100 ms. The real components are
 * drawn for a couple of frames, for one unit, shrunk inside the opaque core where the depth
 * test hides them, so they compile through the same tone-mapping pipeline
 * as the real ones. Then they are hidden, not removed, and never re-rendered by a selection:
 * disposing their materials would let three.js delete the programs again. They are drawn
 * again when the layout changes. (`renderer.compileAsync` does not reliably warm
 * the same program variants as the real components.)
 */
const ShaderWarmup = memo(function ShaderWarmup({ layout }: { layout: Layout }) {
  const group = useRef<Group>(null);
  const frames = useRef(0);
  const unit = layout.units[0];
  const targets = useMemo(() => (unit ? [unit] : []), [unit]);
  // Shown again for each layout, drawn however far they are from the camera's view.
  useLayoutEffect(() => {
    frames.current = 0;
    if (!group.current) return;
    group.current.visible = true;
    group.current.traverse((o) => (o.frustumCulled = false));
  }, [layout]);
  useFrame(() => {
    if (group.current?.visible && ++frames.current > 2) group.current.visible = false;
  });
  if (!unit) return null;
  const noop = () => undefined;
  return (
    <group ref={group} position={[0, 1.6, 0]} scale={0.001}>
      <Selection layout={layout} state={undefined} selectedId={unit} lens="status" hoveredId={null} focusIds={[]} reducedMotion onHover={noop} onSelect={noop} />
      <Comets layout={layout} targets={targets} reducedMotion />
    </group>
  );
});

export function FrameworkScene(props: SceneProps & { agentActive: boolean }) {
  return (
    <group>
      <Rings layout={props.layout} />
      <Links layout={props.layout} />
      <Core active={props.agentActive} />
      <Beacons {...props} />
      <UnitField {...props} />
      <Sectors {...props} />
      <Satellites {...props} />
      <Crystals {...props} />
      <Selection {...props} />
      <AgentComets layout={props.layout} reducedMotion={props.reducedMotion} />
      <ShaderWarmup layout={props.layout} />
      <SceneLabels {...props} />
    </group>
  );
}


SOURCE apps/web/src/scene/Observatory.tsx
/**
 * The Observatory canvas: camera, soft daylight, fog and the framework space.
 * Camera: 45° FOV, damped orbit, fly-to on selection, never below the plane.
 */
import { CameraControls } from "@react-three/drei";
import { Canvas, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import { FogExp2, Sphere, Vector3, type PerspectiveCamera } from "three";
import { TOKENS } from "./colors.ts";
import { FrameworkScene, heightFor, type SceneProps } from "./FrameworkScene.tsx";
import type { Layout } from "./layout.ts";
import { fitRing, titleSize, useSafeArea } from "./framing.ts";
import { hudRects, type Rect } from "./ScreenLabels.tsx";

/** The Observatory's home view: its ring and sector titles, seen from the front at ~43°. */
function homePose(layout: Layout, camera: PerspectiveCamera, width: number, height: number, safe: Rect, panels: Rect[]) {
  const R = layout.view === "constellation" && layout.sectors[0] ? layout.sectors[0].radius : layout.radius - 3;
  const titles = layout.sectors.map((s) => {
    const mid = (s.start + s.end) / 2;
    const r = layout.view === "constellation" ? s.radius + 1 : Math.hypot(s.labelPos[0], s.labelPos[2]);
    const titled = !!s.title && s.title.toUpperCase() !== s.code.toUpperCase();
    return { anchor: new Vector3(Math.cos(mid) * r, 0.3, Math.sin(mid) * r), ...titleSize(titled ? s.title : s.code, { code: titled }) };
  });
  return fitRing({ camera, width, height, safe, panels, radius: R, top: heightFor(4, layout.view), titles, dir: new Vector3(0, 1.42, 1.52) });
}

function CameraRig({ layout, selectedId, focusIds, focusSeq, reducedMotion }: { layout: Layout; selectedId: string | null; focusIds: string[]; focusSeq: number; reducedMotion: boolean }) {
  const controls = useRef<CameraControls>(null);
  const camera = useThree((s) => s.camera) as PerspectiveCamera;
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const size = useThree((s) => s.size);
  const animate = !reducedMotion;
  const safe = useSafeArea();
  // Whether the camera still shows the home view (a HUD change then re-frames it).
  const atHome = useRef(true);

  const home = (transition: boolean) => {
    if (!safe || !controls.current) return;
    const pose = homePose(layout, camera, size.width, size.height, safe, hudRects(gl.domElement));
    // Keep the fog's depth cue the same however far back the canvas needs the camera.
    if (scene.fog instanceof FogExp2) scene.fog.density = 0.55 / Math.max(40, pose.distance * 1.15);
    void controls.current.setLookAt(pose.position.x, pose.position.y, pose.position.z, pose.target.x, pose.target.y, pose.target.z, transition);
    atHome.current = true;
  };

  useEffect(() => {
    const c = controls.current;
    if (!c) return;
    const away = () => {
      atHome.current = false;
    };
    c.addEventListener("controlstart", away);
    return () => c.removeEventListener("controlstart", away);
  }, []);

  useEffect(() => {
    atHome.current = true;
    home(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layout]);

  useEffect(() => {
    if (atHome.current && !selectedId) home(animate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [safe]);

  useEffect(() => {
    if (!selectedId) return;
    const p = layout.positions.get(selectedId);
    if (!p) return;
    atHome.current = false;
    const node = layout.byId.get(selectedId);
    const scale = layout.radius > 60 ? 1.8 : 1;
    const dist = (node?.assessable ? 17 : node?.depth === 0 ? 30 : 22) * scale;
    const len = Math.hypot(p[0], p[2]) || 1;
    const dx = p[0] / len;
    const dz = p[2] / len;
    const y = node?.assessable ? heightFor(2, layout.view) : 0.4;
    void controls.current?.setLookAt(p[0] + dx * dist * 0.65, dist * 0.8, p[2] + dz * dist * 0.65, p[0], y, p[2], animate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, layout]);

  useEffect(() => {
    if (focusSeq === 0) return;
    const pts = focusIds.map((id) => layout.positions.get(id)).filter((p): p is [number, number, number] => !!p);
    if (!pts.length) return home(animate);
    if (pts.length === 1) return;
    atHome.current = false;
    const center = new Vector3(pts.reduce((s, p) => s + p[0], 0) / pts.length, 0, pts.reduce((s, p) => s + p[2], 0) / pts.length);
    const radius = Math.max(4, ...pts.map((p) => Math.hypot(p[0] - center.x, p[2] - center.z))) + 2;
    void controls.current?.fitToSphere(new Sphere(center, radius), animate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusSeq]);

  return (
    <CameraControls
      ref={controls}
      makeDefault
      minDistance={2.5}
      maxDistance={layout.radius * 8}
      maxPolarAngle={Math.PI * 0.46}
      smoothTime={animate ? 0.32 : 0.001}
      dollySpeed={0.7}
    />
  );
}

export interface ObservatoryProps extends Omit<SceneProps, "reducedMotion"> {
  focusSeq: number;
  agentActive: boolean;
}

export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const on = () => setReduced(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return reduced;
}

export function Observatory(props: ObservatoryProps) {
  const reducedMotion = usePrefersReducedMotion();
  const fogDensity = useMemo(() => 0.55 / Math.max(40, props.layout.radius * 2.4), [props.layout.radius]);
  return (
    <Canvas
      dpr={[1, 1.75]}
      camera={{ fov: 45, near: 0.1, far: 4000, position: [0, 40, 60] }}
      gl={{ antialias: true, powerPreference: "high-performance", preserveDrawingBuffer: true }}
      onPointerMissed={() => props.onSelect(null)}
      aria-label="3D Observatory of the framework. Use the outline panel for keyboard navigation."
    >
      <color attach="background" args={[TOKENS.neutral]} />
      <fogExp2 attach="fog" args={[TOKENS.neutral, fogDensity]} />
      <hemisphereLight args={[TOKENS.surface, TOKENS.primaryContainer, 1.15]} />
      <ambientLight intensity={0.45} />
      <directionalLight position={[30, 60, 20]} intensity={1.65} />
      <directionalLight position={[-40, 20, -30]} intensity={0.45} color={TOKENS.neutral} />
      <FrameworkScene {...props} reducedMotion={reducedMotion} />
      <CameraRig layout={props.layout} selectedId={props.selectedId} focusIds={props.focusIds} focusSeq={props.focusSeq} reducedMotion={reducedMotion} />
    </Canvas>
  );
}


SOURCE apps/web/src/scene/layout.ts
/**
 * Spatial layouts for any framework graph (DESIGN.md › Spatial System).
 *
 * - Constellation: radial hierarchy on the XZ plane. Top-level groups get
 *   angular sectors proportional to their size; units of work sit on outer
 *   rings; SP 800-53 enhancements form radial stalks beyond their control.
 * - Terrain: each top-level group is a honeycomb "district" of hex cells, one
 *   cell per unit of work; districts ring the framework core.
 *
 * Y is reserved for measured values (current / target level), never decoration.
 */
import type { LeanNode } from "../lib/types.ts";

export type Vec3 = [number, number, number];
export type ViewMode = "constellation" | "terrain";

export interface Sector {
  id: string;
  code: string;
  title: string;
  start: number;
  end: number;
  radius: number;
  labelPos: Vec3;
}

export interface Layout {
  view: ViewMode;
  positions: Map<string, Vec3>;
  /** Hex radius for unit cells in this layout. */
  cell: number;
  units: string[];
  hubs: string[];
  mids: string[];
  links: [string, string][];
  sectors: Sector[];
  radius: number;
  byId: Map<string, LeanNode>;
  children: Map<string | null, LeanNode[]>;
}

function index(nodes: LeanNode[]) {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const children = new Map<string | null, LeanNode[]>();
  for (const n of nodes) {
    const list = children.get(n.parentId) ?? [];
    list.push(n);
    children.set(n.parentId, list);
  }
  for (const list of children.values()) list.sort((a, b) => a.order - b.order);
  return { byId, children };
}

function weightOf(id: string, children: Map<string | null, LeanNode[]>, byId: Map<string, LeanNode>, memo: Map<string, number>): number {
  const cached = memo.get(id);
  if (cached !== undefined) return cached;
  const kids = children.get(id) ?? [];
  const self = byId.get(id)?.assessable ? 1 : 0;
  const w = Math.max(1, self + kids.reduce((s, k) => s + weightOf(k.id, children, byId, memo), 0));
  memo.set(id, w);
  return w;
}

const polar = (r: number, a: number, y = 0): Vec3 => [Math.cos(a) * r, y, Math.sin(a) * r];

/**
 * The scene draws units of work and the groups that hold them. Nodes with no unit
 * below them (MITRE ATLAS's mitigations, a law with no tracked obligation) stay in
 * the outline and the inspector but take no place in space: `positions` has only
 * what is drawn, while `byId` and `children` keep every node for navigation.
 */
export function computeLayout(nodes: LeanNode[], view: ViewMode): Layout {
  const { children } = index(nodes);
  const holds = new Map<string, boolean>();
  const hasUnit = (n: LeanNode): boolean => {
    const known = holds.get(n.id);
    if (known !== undefined) return known;
    const v = n.assessable || (children.get(n.id) ?? []).some(hasUnit);
    holds.set(n.id, v);
    return v;
  };
  const drawn = nodes.filter(hasUnit);
  const layout = view === "terrain" ? terrain(drawn) : constellation(drawn);
  const all = index(nodes);
  return { ...layout, byId: all.byId, children: all.children };
}

function constellation(nodes: LeanNode[]): Layout {
  const { byId, children } = index(nodes);
  const memo = new Map<string, number>();
  const roots = children.get(null) ?? [];
  const positions = new Map<string, Vec3>();
  const units: string[] = [];
  const hubs: string[] = [];
  const mids: string[] = [];
  const links: [string, string][] = [];
  const sectors: Sector[] = [];

  // Ring radii grow with density so nodes never overlap.
  const byDepth = new Map<number, number>();
  for (const n of nodes) {
    const parent = n.parentId ? byId.get(n.parentId) : undefined;
    const stalk = parent?.assessable && n.assessable;
    if (!stalk) byDepth.set(n.depth, (byDepth.get(n.depth) ?? 0) + 1);
  }
  const spacing = 1.15;
  const usable = 2 * Math.PI * 0.86;
  const radii: number[] = [];
  let r = 0;
  for (let d = 0; d <= 4; d++) {
    const count = byDepth.get(d) ?? 0;
    const min = d === 0 ? Math.max(6.5, (count * 3.2) / usable) : r + 7;
    r = Math.max(min, (count * spacing) / usable);
    radii.push(r);
  }

  // A ring of labeled groups (up to 40, e.g. the state laws between jurisdictions and
  // obligations) moves out toward the units so the group codes have room to be read.
  const labeledMids = nodes.filter((n) => n.depth === 1 && !n.assessable).length;
  if (labeledMids > 0 && labeledMids <= 40 && radii[2] !== undefined && byDepth.get(2)) radii[1] = Math.max(radii[1]!, Math.min(radii[2] * 0.58, radii[2] - 7));

  const totalWeight = roots.reduce((s, n) => s + weightOf(n.id, children, byId, memo), 0);
  const gap = roots.length > 1 ? 0.14 * Math.PI * 2 * (1 / roots.length) * 0.35 : 0;
  const available = Math.PI * 2 - gap * roots.length;
  let angle = -Math.PI / 2 + gap / 2;
  let outer = radii[0]!;

  const place = (node: LeanNode, a0: number, a1: number) => {
    const mid = (a0 + a1) / 2;
    const r0 = radii[node.depth] ?? radii[radii.length - 1]!;
    positions.set(node.id, polar(r0, mid));
    outer = Math.max(outer, r0);
    if (node.depth === 0) hubs.push(node.id);
    else if (node.assessable) units.push(node.id);
    else mids.push(node.id);
    if (node.parentId) links.push([node.parentId, node.id]);
    const kids = children.get(node.id) ?? [];
    if (!kids.length) return;
    if (node.assessable) {
      // Stalk: enhancements continue radially outward, zig-zagging slightly.
      kids.forEach((k, i) => {
        const rr = r0 + 1.25 * (i + 1);
        const wobble = ((i % 2 === 0 ? 1 : -1) * 0.32) / Math.max(rr, 1);
        positions.set(k.id, polar(rr, mid + wobble));
        outer = Math.max(outer, rr);
        units.push(k.id);
        links.push([i === 0 ? node.id : kids[i - 1]!.id, k.id]);
        for (const g of children.get(k.id) ?? []) place(g, mid, mid);
      });
      return;
    }
    const w = kids.reduce((s, k) => s + weightOf(k.id, children, byId, memo), 0);
    let a = a0;
    for (const k of kids) {
      const span = ((a1 - a0) * weightOf(k.id, children, byId, memo)) / w;
      place(k, a, a + span);
      a += span;
    }
  };

  for (const root of roots) {
    const span = (available * weightOf(root.id, children, byId, memo)) / totalWeight;
    place(root, angle, angle + span);
    sectors.push({ id: root.id, code: root.code, title: root.title, start: angle, end: angle + span, radius: 0, labelPos: [0, 0, 0] });
    angle += span + gap;
  }
  const sectorRadius = outer + 3.2;
  for (const s of sectors) {
    s.radius = sectorRadius;
    s.labelPos = polar(sectorRadius + 3.4, (s.start + s.end) / 2, 0.2);
  }
  return { view: "constellation", positions, cell: 0.46, units, hubs, mids, links, sectors, radius: sectorRadius + 6, byId, children };
}

/** Axial hex coordinates of a spiral fill (center first, then rings). */
function hexSpiral(count: number): [number, number][] {
  const out: [number, number][] = [[0, 0]];
  const dirs: [number, number][] = [
    [1, 0],
    [1, -1],
    [0, -1],
    [-1, 0],
    [-1, 1],
    [0, 1],
  ];
  for (let ring = 1; out.length < count; ring++) {
    let q = -ring;
    let r = ring;
    for (const [dq, dr] of dirs) {
      for (let s = 0; s < ring && out.length < count; s++) {
        out.push([q, r]);
        q += dq;
        r += dr;
      }
    }
  }
  return out.slice(0, count);
}

function terrain(nodes: LeanNode[]): Layout {
  const { byId, children } = index(nodes);
  const roots = children.get(null) ?? [];
  const positions = new Map<string, Vec3>();
  const units: string[] = [];
  const hubs: string[] = [];
  const mids: string[] = [];
  const links: [string, string][] = [];
  const sectors: Sector[] = [];
  const cell = 0.82;
  const w = Math.sqrt(3) * cell;

  const collect = (id: string): LeanNode[] => {
    const out: LeanNode[] = [];
    const walk = (pid: string) => {
      for (const k of children.get(pid) ?? []) {
        if (k.assessable) out.push(k);
        else mids.push(k.id);
        walk(k.id);
      }
    };
    walk(id);
    return out;
  };

  const districts = roots.map((root) => {
    const cells = collect(root.id);
    const spiral = hexSpiral(Math.max(1, cells.length));
    const radius = cell * 1.9 * Math.sqrt(Math.max(1, cells.length)) * 0.62 + cell * 1.6;
    return { root, cells, spiral, radius };
  });
  const circumference = districts.reduce((s, d) => s + d.radius * 2 + 3, 0);
  const ringRadius = Math.max(9, circumference / (2 * Math.PI));
  let angle = -Math.PI / 2;
  for (const d of districts) {
    const span = ((d.radius * 2 + 3) / circumference) * Math.PI * 2;
    const mid = angle + span / 2;
    const center = polar(ringRadius + d.radius * 0.35, mid);
    hubs.push(d.root.id);
    positions.set(d.root.id, [center[0] * 0.42, 0, center[2] * 0.42]);
    d.cells.forEach((c, i) => {
      const [q, r] = d.spiral[i]!;
      const x = center[0] + w * (q + r / 2);
      const z = center[2] + cell * 1.5 * r;
      positions.set(c.id, [x, 0, z]);
      units.push(c.id);
    });
    // Mid-level groups (categories/controls) sit at the centroid of their cells for navigation.
    for (const mid of children.get(d.root.id) ?? []) {
      if (mid.assessable) continue;
      const pts = (function gather(id: string): Vec3[] {
        return (children.get(id) ?? []).flatMap((k) => (k.assessable ? [positions.get(k.id)!] : gather(k.id)));
      })(mid.id).filter(Boolean);
      if (!pts.length) continue;
      const cx = pts.reduce((s, p) => s + p[0], 0) / pts.length;
      const cz = pts.reduce((s, p) => s + p[2], 0) / pts.length;
      positions.set(mid.id, [cx, 0, cz]);
    }
    sectors.push({ id: d.root.id, code: d.root.code, title: d.root.title, start: angle, end: angle + span, radius: ringRadius, labelPos: polar(ringRadius + d.radius * 0.35 + d.radius + 2.2, mid, 0.2) });
    angle += span;
  }
  for (const id of mids) if (!positions.has(id)) positions.set(id, [0, 0, 0]);
  return { view: "terrain", positions, cell, units, hubs, mids, links, sectors, radius: ringRadius + Math.max(...districts.map((d) => d.radius)) + 3, byId, children };
}


SOURCE apps/web/src/scene/colors.ts
/** Lens encodings: the same space re-colored without moving objects (DESIGN.md › Lenses). */
import { Color } from "three";
import { designSystem } from "@visua/design";
import type { Status } from "@visua/core";
import type { Lens } from "../state/ui.ts";
import type { UnitState } from "../lib/types.ts";

const c = designSystem.colors;
const hex = (v: string) => new Color(v.slice(0, 7));

export const TOKENS = {
  neutral: hex(c.neutral),
  surface: hex(c.surface),
  primary: hex(c.primary),
  tertiary: hex(c.tertiary),
  outline: hex(c.outline),
  outlineStrong: hex(c["outline-strong"]),
  grid: hex(c["scene-grid"]),
  onSurface: hex(c["on-surface"]),
  muted: hex(c["on-surface-muted"]),
  secondary: hex(c.secondary),
  primaryContainer: hex(c["primary-container"]),
  frameworkAi: hex(c["framework-ai"]),
  status: {
    "not-started": hex(c["status-not-started"]),
    "in-progress": hex(c["status-in-progress"]),
    implemented: hex(c["status-implemented"]),
    verified: hex(c["status-verified"]),
    "at-risk": hex(c["status-at-risk"]),
    "not-applicable": hex(c["status-not-applicable"]),
  } satisfies Record<Status, Color>,
};

/**
 * The overlay lens: one Circuit Copper ramp (AI governance, DESIGN.md), strongest
 * for the highest proposed priority, fading gently toward the scene's neutral.
 * Keep the foundational tier dark enough to read against a light canvas.
 */
const aiRamp = [0, 0.25, 0.5].map((t) => TOKENS.frameworkAi.clone().lerp(TOKENS.neutral, t));
export const overlayColor = (level: number | undefined) => (level === undefined ? TOKENS.status["not-applicable"] : aiRamp[Math.min(Math.max(level, 1), 3) - 1]!);
export const overlaySwatch = (level: number) => `#${overlayColor(level).getHexString()}`;

export interface LensLegendItem {
  label: string;
  color: string;
}

export const LENS_INFO: Record<Lens, { title: string; description: string; legend: LensLegendItem[] }> = {
  status: {
    title: "Status",
    description: "Derived implementation status of each unit of work.",
    legend: [
      { label: "Not started", color: c["status-not-started"] },
      { label: "In progress", color: c["status-in-progress"] },
      { label: "Implemented", color: c["status-implemented"] },
      { label: "Verified", color: c["status-verified"] },
      { label: "At risk", color: c["status-at-risk"] },
      { label: "Not applicable", color: c["status-not-applicable"] },
    ],
  },
  gap: {
    title: "Gap",
    description: "Distance between the Current and Target Profile (target − current).",
    legend: [
      { label: "At target", color: c["status-implemented"] },
      { label: "1 level short", color: c["status-in-progress"] },
      { label: "2+ levels short", color: c["status-at-risk"] },
      { label: "Out of scope", color: c["status-not-applicable"] },
    ],
  },
  evidence: {
    title: "Evidence",
    description: "Whether implemented work is backed by accepted, unexpired evidence.",
    legend: [
      { label: "Evidence on file", color: c["status-verified"] },
      { label: "Implemented, no evidence", color: c["status-at-risk"] },
      { label: "Not yet implemented", color: c["status-not-started"] },
      { label: "Out of scope", color: c["status-not-applicable"] },
    ],
  },
  priority: {
    title: "Priority",
    description: "Priority from the maturity- and niche-adapted recommendation.",
    legend: [
      { label: "Critical", color: c["status-at-risk"] },
      { label: "High", color: c["status-in-progress"] },
      { label: "Medium", color: c.primary },
      { label: "Low", color: c["status-not-started"] },
    ],
  },
  overlay: {
    title: "AI overlay",
    description: "Proposed priority in the NIST Cyber AI Profile (draft) for the focus areas you follow, or selection in the COSAiS control overlay.",
    legend: [
      { label: "1 High", color: `#${aiRamp[0]!.getHexString()}` },
      { label: "2 Moderate", color: `#${aiRamp[1]!.getHexString()}` },
      { label: "3 Foundational", color: `#${aiRamp[2]!.getHexString()}` },
      { label: "Not in the overlay", color: c["status-not-applicable"] },
    ],
  },
  crosswalk: {
    title: "Crosswalk",
    description: "How many authoritative mappings connect the unit to other frameworks.",
    legend: [
      { label: "No mappings", color: c["status-not-applicable"] },
      { label: "1–3", color: c.secondary },
      { label: "4–9", color: c.primary },
      { label: "10+", color: c["status-verified"] },
    ],
  },
};

export function unitColor(lens: Lens, unit: (UnitState & { mapped?: number }) | undefined, out: Color): Color {
  if (!unit) return out.copy(TOKENS.status["not-started"]);
  if (!unit.applicable && lens !== "status") return out.copy(TOKENS.status["not-applicable"]);
  switch (lens) {
    case "status":
      return out.copy(TOKENS.status[unit.status]);
    case "gap": {
      const gap = unit.target - unit.current;
      return out.copy(gap <= 0 ? TOKENS.status.implemented : gap === 1 ? TOKENS.status["in-progress"] : TOKENS.status["at-risk"]);
    }
    case "evidence":
      if (unit.evidence > 0) return out.copy(TOKENS.status.verified);
      return out.copy(unit.current >= 2 ? TOKENS.status["at-risk"] : TOKENS.status["not-started"]);
    case "priority":
      return out.copy(
        unit.priority === "critical" ? TOKENS.status["at-risk"] : unit.priority === "high" ? TOKENS.status["in-progress"] : unit.priority === "medium" ? TOKENS.primary : TOKENS.status["not-started"],
      );
    case "crosswalk": {
      const m = unit.mapped ?? 0;
      return out.copy(m === 0 ? TOKENS.status["not-applicable"] : m < 4 ? TOKENS.secondary : m < 10 ? TOKENS.primary : TOKENS.status.verified);
    }
    case "overlay":
      return out.copy(overlayColor(unit.overlay));
  }
}

/** Threat catalogs in the Observatory: coverage borrows the status palette (DESIGN.md: threats have no identity hue). */
export const THREAT_STATUS_LABEL: Record<Status, string> = {
  implemented: "Covered",
  verified: "Covered",
  "in-progress": "Partly covered",
  "not-started": "Open",
  "at-risk": "A linked requirement is at risk",
  "not-applicable": "No link in your frameworks",
};

export const THREAT_LENS: Record<"status" | "gap", { title: string; description: string; legend: LensLegendItem[] }> = {
  status: {
    title: "Coverage",
    description: "Coverage of each threat, derived from the requirements its publishers link to it. Never an assessment of the threat.",
    legend: [
      { label: "Covered", color: c["status-implemented"] },
      { label: "Partly covered", color: c["status-in-progress"] },
      { label: "Open", color: c["status-not-started"] },
      { label: "No link in your frameworks", color: c["status-not-applicable"] },
    ],
  },
  gap: {
    title: "Gap",
    description: "Distance to full coverage (level 4 on the coverage scale).",
    legend: LENS_INFO.gap.legend.map((l) => (l.label === "At target" ? { ...l, label: "Fully covered" } : l.label === "Out of scope" ? { ...l, label: "No link in your frameworks" } : l)),
  },
};
