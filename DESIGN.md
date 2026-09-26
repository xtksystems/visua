---
version: alpha
name: Visua Observatory
description: >-
  The visual identity of Visua, a spatial, AI-first compliance command center.
  A calm deep-night instrument panel in which frameworks, requirements, tasks,
  evidence and AI agents become navigable three-dimensional space. Precise,
  evidence-first, never alarmist.
colors:
  # Foundations: "Deep Night" neutrals. The 3D scene sits directly on `neutral`.
  primary: "#7AA2FF"
  primary-hover: "#9DBBFF"
  on-primary: "#07101F"
  primary-container: "#1A2A4F"
  on-primary-container: "#D4E1FF"
  secondary: "#A9B6CC"
  on-secondary: "#0B1220"
  tertiary: "#B69CFF"
  tertiary-hover: "#CBB8FF"
  on-tertiary: "#140A33"
  tertiary-container: "#251C4A"
  on-tertiary-container: "#E4DAFF"
  neutral: "#070A12"
  surface: "#0C111C"
  surface-raised: "#121927"
  surface-overlay: "#192234"
  surface-bright: "#222D42"
  surface-glass: "#0C111CD9"
  on-surface: "#E6ECF7"
  on-surface-muted: "#9AA8BF"
  outline: "#2A364C"
  outline-strong: "#3D4C68"
  scene-grid: "#141C2B"
  # Status semantics: the only colors allowed to encode implementation state.
  status-not-started: "#8D9BB3"
  status-not-started-container: "#1A2130"
  status-in-progress: "#F2B544"
  status-in-progress-container: "#33270D"
  status-implemented: "#3CCB8C"
  status-implemented-container: "#0F2E22"
  status-verified: "#35D6E0"
  status-verified-container: "#0C2C30"
  status-at-risk: "#FF6B6B"
  status-at-risk-container: "#3A1418"
  status-not-applicable: "#475269"
  status-not-applicable-container: "#151A24"
  on-status: "#06090F"
  error: "#FF6B6B"
  on-error: "#2B0707"
  # Framework identity: used only where several frameworks share one view.
  framework-csf: "#7AA2FF"
  framework-csf-container: "#16244A"
  framework-soc2: "#F28FD0"
  framework-soc2-container: "#3A1531"
  framework-rmf: "#C5E86C"
  framework-rmf-container: "#27310F"
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
    fontFeature: "'tnum' 1"
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
    width: 64px
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
    textColor: "{colors.on-surface}"
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

# Visua Observatory — Design System

This file is the single source of truth for Visua's visual identity. The YAML
front matter holds the normative tokens; everything below explains how to apply
them. `pnpm design:lint` validates this file with the official
`@google/design.md` linter, and `pnpm design:tokens` compiles the tokens into
CSS custom properties (for the 2D interface) and a typed module (for the 3D
scene materials). Never hard-code a color, font, radius or spacing value in
product code — reference the generated token instead.

## Overview

**Brand personality: "Deep-night observatory, calm instrument panel."**
Visua is where a security team *sees* its compliance program. The interface
evokes an astronomical observatory at night: a dark, quiet field of space in
which every framework, requirement, task and piece of evidence is a luminous
object that can be approached, inspected and acted upon. Light carries meaning;
darkness is rest.

- **Audience:** CISOs, GRC leads, security engineers, auditors and first-time
  founders facing their first SOC 2 — any niche, any cyber-maturity level.
  Novices must never feel lost; experts must never feel slowed down.
- **Emotional target:** composure and control. Compliance work is stressful;
  Visua is the calm, precise room where the whole picture becomes legible.
- **Character:** precise, evidence-first, quietly futuristic. Closer to a
  flight-control or telescope console than to a marketing dashboard.
- **Signature:** the 3D *Observatory* canvas is the hero surface. 2D panels
  float over it as instrument read-outs (HUDs) or dock beside it as the
  inspector. Every 3D object has a 2D twin in an outline view.
- **AI presence:** agents are colleagues whose work is always visible,
  attributable (Aurora Violet), cited and reversible — never magic.

## Colors

The palette is a set of cool, blue-black neutrals with exactly three chromatic
roles outside of status: interaction (Observatory Blue), AI agency (Aurora
Violet) and framework identity (used only when frameworks share a view).

- **Primary — Observatory Blue (#7AA2FF):** the single interaction color:
  primary buttons, focus rings, selection, the selected 3D node and the active
  camera target. `primary-hover` (#9DBBFF) is its hover state. Text on primary
  uses `on-primary` (#07101F).
- **Secondary — Instrument Slate (#A9B6CC):** secondary actions and citation
  text; a quieter voice than primary.
- **Tertiary — Aurora Violet (#B69CFF):** reserved exclusively for AI agent
  presence: agent buttons, agent-authored drafts awaiting approval, agent
  pulses and particle streams in the scene, the flight recorder. If something
  is violet, an agent did it or is doing it.
- **Neutral — Deep Night (#070A12):** the background of space. Surfaces step up
  in lightness to express layering: `surface` (#0C111C) for docked panels,
  `surface-raised` (#121927) for cards and inputs, `surface-overlay` (#192234)
  for popovers and the command palette, `surface-bright` (#222D42) for hover.
  `surface-glass` (#0C111C at 85% opacity) is used for HUDs over the canvas.
- **Text:** `on-surface` Starlight (#E6ECF7) for primary text,
  `on-surface-muted` (#9AA8BF) for metadata. Both exceed WCAG AA on every
  surface.
- **Status (the only colors that encode implementation state):**
  - Not started — Dormant Slate (#8D9BB3)
  - In progress — Solar Amber (#F2B544)
  - Implemented — Signal Green (#3CCB8C)
  - Verified (evidence accepted / assessed) — Verified Cyan (#35D6E0)
  - At risk (failing, expired evidence, overdue) — Flare Coral (#FF6B6B)
  - Not applicable — Dust (#475269)

  Each status has a `-container` tint for chips; chip text uses the status
  color itself (or `on-surface-muted` for Not applicable).
- **Framework identity:** NIST CSF (#7AA2FF), SOC 2 (#F28FD0), NIST RMF /
  SP 800-53 (#C5E86C). Used for framework badges and for the planes of the
  Crosswalk Nexus — never for status.

## Typography

Three families with strict roles:

- **Space Grotesk** (display, headlines, capitalized labels, metrics): its
  geometric construction gives the instrument-panel voice. Headlines are
  Semi-Bold with slight negative tracking.
- **IBM Plex Sans** (all body copy, UI labels, form content): institutional,
  trustworthy and highly legible at 13–16px on dark backgrounds.
- **IBM Plex Mono** (every requirement identifier and machine value): control
  codes such as `GV.OC-01`, `CC6.1`, `AC-2(1)`, hashes, timestamps and tool
  calls. A requirement ID is always monospace so it is scannable in lists and
  in 3D labels.

Rules: `label-caps` is uppercase with 0.12em tracking and is used for section
eyebrows and table headers only. `metric-xl` uses tabular numerals so scores
do not jitter while animating. Never use more than two weights on one panel.

## Layout

A **canvas-first, three-zone** layout:

1. **Nav rail** (64px, left): primary destinations as icon buttons with
   tooltips — Observatory, Frameworks, Plan, Evidence, Agents, Policies,
   Trust, Settings.
2. **Canvas** (fluid, center): the 3D Observatory or the 2D view for the current
   destination. HUD read-outs float over the canvas on a 16px inset.
3. **Inspector** (440px, right, collapsible): details and actions for the
   current selection. It never covers the camera target: the scene re-frames
   when the inspector opens.

A 52px top bar holds the workspace switcher, framework switcher, global
search / command palette (⌘K) and agent activity indicator.

Spacing follows a strict **4px base scale** (`xs` 4, `sm` 8, `md` 12, `lg` 16,
`xl` 24, `2xl` 32, `3xl` 48, `4xl` 64). Panels use 16px padding; the inspector
uses 20px; dialogs 24px. Dense data views (tables, outlines) use 40px rows.
Below 1024px the inspector becomes a bottom sheet and the rail collapses into
the top bar; the 3D canvas remains available but defaults to the 2D outline on
touch devices smaller than 768px.

## Elevation & Depth

Depth in the 2D layer is expressed with **tonal layering**, not shadows: each
elevation step uses the next lighter surface token plus a 1px `outline`
(#2A364C) border. Overlays (command palette, dialogs) add a single soft
ambient shadow (0 24px 64px at 55% black) because they float above the 3D
canvas. HUD panels over the canvas use `surface-glass` with a 12px backdrop
blur.

## Spatial System

The 3D Observatory is Visua's signature surface and follows these rules.

- **Coordinates:** Y is up. A framework is laid out on the XZ plane around the
  origin; hierarchy depth maps to radius (root at the center, leaves at the
  rim). Height (Y) is reserved for a *measured value* — maturity, readiness or
  time — never decoration.
- **Geometry vocabulary** (one shape per object kind, so kind is readable
  without color):
  - Framework core — a slowly glowing icosahedron at the origin.
  - Function / family / criteria series — a sector arc with a floating
    `label-caps` title.
  - Category / control — a ring-mounted beacon (low cylinder).
  - Subcategory / criterion / control enhancement (the unit of work) — a
    hexagonal prism node. Its height encodes current maturity; a translucent
    ghost prism encodes the target, so the gap is literally visible.
  - Task — a small satellite (octahedron) orbiting its requirement.
  - Evidence — a crystal (tetrahedron) docked on its requirement; dims as it
    approaches expiry, turns coral when expired.
  - Agent — a violet comet with a particle trail travelling along links.
- **Materials:** physically based, matte (roughness 0.55–0.7, metalness ≤ 0.2).
  Node base color is the status token; emissive intensity is 0.15 at rest,
  0.6 when hovered, 1.0 when selected or when an agent is working on it.
  Bloom is applied only to emissive values above 0.8, so only selection,
  agent activity and at-risk pulses glow.
- **Lighting:** one soft key light, one hemisphere fill tinted from `neutral`
  to `primary-container`, exponential fog in `neutral` so distant objects
  recede into space. No hard shadows.
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
  ratio capped at 1.75; post-processing disabled automatically below 45 fps.

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

## Components

- **Buttons:** `button-primary` (Observatory Blue) for the single most
  important action in a view; `button-secondary` for everything else;
  `button-quiet` for tertiary actions in dense panels; `button-agent`
  (Aurora Violet) for any action that starts or approves AI agent work;
  `button-danger` only for destructive actions, always confirmed.
- **Status chips:** `chip-status-*` pair a colored dot, a text label and the
  status color on its container tint — status is never conveyed by color
  alone.
- **Filter chips:** `chip-filter` / `chip-filter-selected` drive lenses and
  facet filters in the HUD and outline.
- **Requirement code:** `requirement-code` renders IDs (`PR.AA-05`) in mono on a
  raised surface; clicking one always flies the camera to that requirement.
- **Framework badges:** `badge-framework-csf|soc2|rmf` appear wherever items
  from multiple frameworks are listed together.
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
2. Agents **propose, people dispose**: changes that alter compliance state
   (statuses, policies, evidence acceptance) are staged as violet drafts and
   applied only after approval, unless the workspace explicitly grants the
   agent autonomy for that action type.
3. Claims about a framework must carry a **citation** into the local official
   corpus (document, section, page). No citation, no claim.
4. Confidence is shown in words (low / medium / high) with the reason, never
   as a bare percentage.
5. In the scene, agent work is visible: the violet comet travels to the node
   being worked on and the node pulses until the run ends.

## Do's and Don'ts

- Do give every 3D view an equivalent, keyboard-navigable 2D outline.
- Do use Observatory Blue for exactly one primary action per view.
- Do reserve Aurora Violet for AI agents — nothing else may be violet.
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
- Don't use gradients as decoration; the only gradients are fog and glow.

## Accessibility

Visua targets WCAG 2.2 AA. Focus is always visible (2px Observatory Blue ring
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
