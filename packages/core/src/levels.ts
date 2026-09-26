import type { FrameworkFamily } from "./types.ts";

export interface LevelDefinition {
  level: number;
  label: string;
  description: string;
}

export interface LevelScale {
  family: FrameworkFamily;
  name: string;
  /** Why this scale exists and what it is (and is not) grounded in. */
  basis: string;
  levels: LevelDefinition[];
}

/**
 * NIST CSF 2.0 does not prescribe a per-outcome maturity scale. Visua uses a
 * Tier-aligned implementation scale so that Organizational Profiles (current vs.
 * target) read naturally against the four CSF Tiers (CSWP 29, §3.2 / Appendix B).
 */
export const CSF_SCALE: LevelScale = {
  family: "csf",
  name: "Tier-aligned implementation level",
  basis:
    "Visua convention aligned to the CSF 2.0 Tier characteristics (Partial, Risk Informed, Repeatable, Adaptive). " +
    "CSF Tiers officially characterize organization-wide governance and management practices; Visua applies the same " +
    "vocabulary per outcome so current and target Organizational Profiles can be compared.",
  levels: [
    { level: 0, label: "Not performed", description: "The outcome is not being achieved and no practice exists." },
    {
      level: 1,
      label: "Partial",
      description: "Ad hoc and reactive. The outcome is achieved inconsistently, with limited awareness of the risk.",
    },
    {
      level: 2,
      label: "Risk Informed",
      description:
        "Practices are approved by management and informed by risk, but not yet established as organization-wide policy.",
    },
    {
      level: 3,
      label: "Repeatable",
      description:
        "Formally approved and expressed as policy; consistently implemented and regularly updated as requirements change.",
    },
    {
      level: 4,
      label: "Adaptive",
      description:
        "Continuously improved using lessons learned and predictive indicators; part of the organizational culture.",
    },
  ],
};

/** SOC 2: design → implementation (Type I) → operating effectiveness (Type II). */
export const SOC2_SCALE: LevelScale = {
  family: "soc2",
  name: "Control readiness",
  basis:
    "Visua convention mirroring the SOC 2 examination: a Type 1 report addresses the suitability of design of controls " +
    "at a point in time; a Type 2 report additionally addresses operating effectiveness over a period.",
  levels: [
    { level: 0, label: "Not designed", description: "No control addresses the criterion yet." },
    { level: 1, label: "Designed", description: "Controls are designed and documented but not yet in operation." },
    { level: 2, label: "Implemented", description: "Controls are in place at a point in time — Type 1 ready." },
    {
      level: 3,
      label: "Operating",
      description: "Controls operate consistently with evidence across the observation period — Type 2 ready.",
    },
    { level: 4, label: "Assured", description: "Tested without exceptions (internal or auditor testing)." },
  ],
};

/** SP 800-53 / RMF: aligned to OSCAL implementation-status and SP 800-53A outcomes. */
export const RMF_SCALE: LevelScale = {
  family: "rmf",
  name: "Control implementation status",
  basis:
    "Aligned to OSCAL SSP implementation-status tokens (planned, partial, implemented) and SP 800-53A assessment " +
    "determinations (satisfied / other than satisfied).",
  levels: [
    { level: 0, label: "Not implemented", description: "The control is not implemented and not yet planned." },
    { level: 1, label: "Planned", description: "Implementation is planned (OSCAL: planned)." },
    { level: 2, label: "Partially implemented", description: "Some parts of the control are in place (OSCAL: partial)." },
    { level: 3, label: "Implemented", description: "The control is fully implemented (OSCAL: implemented)." },
    {
      level: 4,
      label: "Assessed — satisfied",
      description: "SP 800-53A assessment determined all objectives are satisfied.",
    },
  ],
};

export const LEVEL_SCALES: Record<FrameworkFamily, LevelScale> = {
  csf: CSF_SCALE,
  soc2: SOC2_SCALE,
  rmf: RMF_SCALE,
};

export const MAX_LEVEL = 4;

export function levelLabel(family: FrameworkFamily, level: number): string {
  return LEVEL_SCALES[family].levels.find((l) => l.level === level)?.label ?? `Level ${level}`;
}

export function clampLevel(level: number): number {
  if (!Number.isFinite(level)) return 0;
  return Math.max(0, Math.min(MAX_LEVEL, Math.round(level)));
}
