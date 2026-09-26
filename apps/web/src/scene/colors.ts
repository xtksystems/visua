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
  primary: hex(c.primary),
  tertiary: hex(c.tertiary),
  outline: hex(c.outline),
  outlineStrong: hex(c["outline-strong"]),
  grid: hex(c["scene-grid"]),
  onSurface: hex(c["on-surface"]),
  muted: hex(c["on-surface-muted"]),
  secondary: hex(c.secondary),
  primaryContainer: hex(c["primary-container"]),
  status: {
    "not-started": hex(c["status-not-started"]),
    "in-progress": hex(c["status-in-progress"]),
    implemented: hex(c["status-implemented"]),
    verified: hex(c["status-verified"]),
    "at-risk": hex(c["status-at-risk"]),
    "not-applicable": hex(c["status-not-applicable"]),
  } satisfies Record<Status, Color>,
};

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
  }
}
