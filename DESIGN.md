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
