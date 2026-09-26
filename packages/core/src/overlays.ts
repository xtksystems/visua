/**
 * Overlays: official documents that specialize an existing framework without
 * being frameworks themselves. A community profile (the NIST Cyber AI Profile
 * on CSF 2.0) sets priorities and considerations per subcategory and focus
 * area; a control overlay (NIST COSAiS on SP 800-53) selects and tailors
 * controls for a use case. Entries attach to the framework's own nodes, so
 * the workspace's assessment, evidence and tasks stay in one place.
 */
import type { CorpusCitation } from "./types.ts";

export interface OverlayLens {
  /** e.g. "secure", "defend", "thwart" */
  id: string;
  short: string;
  title: string;
  description: string;
  citation: CorpusCitation;
}

export interface OverlayPriorityLevel {
  level: number;
  label: string;
  description: string;
}

/** A reference printed in the overlay (ATLAS mitigation, OWASP entry, SP 800-53 control…). */
export interface OverlayReference {
  scheme: string;
  id: string | null;
  text: string;
  /** Which part of the entry printed it: "general" or a lens id. */
  column?: string;
}

export interface OverlayLensEntry {
  priority?: number;
  considerations?: string;
  opportunities?: string;
  references: string[];
  referencesNote?: string;
}

export interface OverlayControlEntry {
  inSummaryTable: boolean;
  annotated: boolean;
  proposedAdditional: boolean;
  lifecyclePhases?: string[];
  selectedInModerateBaseline?: string;
  assumptions?: string;
  tailoring?: { controlRequirement: boolean; organizationDefinedParameter: boolean; discussion: boolean };
  tailoringSections?: { label: string; text: string }[];
  /** NIST AI 100-2 attack ids, normalized (e.g. "NISTAML.011"). */
  attackIds?: string[];
}

export interface OverlayEntry {
  /** Node of the target framework (e.g. "nist-csf-2.0:GV.OC-01"). */
  nodeId: string;
  citation: CorpusCitation;
  general?: { considerations?: string; note?: string; references?: string[]; sp80053?: string[] };
  lenses?: Record<string, OverlayLensEntry>;
  control?: OverlayControlEntry;
  refs: OverlayReference[];
}

export interface FrameworkOverlay {
  id: string;
  /** The framework the overlay specializes. */
  frameworkId: string;
  kind: "community-profile" | "control-overlay";
  title: string;
  shortName: string;
  identifier: string;
  documentId: string;
  /** Publication status as NIST states it ("initial preliminary draft", "annotated outline"…). */
  status: string;
  /** Shown wherever the overlay is: drafts are not requirements. */
  notice: { text: string; citation: CorpusCitation };
  published?: string;
  landingPage?: string;
  lenses?: OverlayLens[];
  priorityLevels?: OverlayPriorityLevel[];
  scope?: { useCases?: { id: string; text: string; citation: CorpusCitation }[]; assumptions?: string[]; lifecyclePhases?: string[] };
  entries: OverlayEntry[];
}

/** A workspace's adoption of an overlay. */
export interface OverlayAdoption {
  overlayId: string;
  /** Selected lenses (focus areas) for community profiles. */
  lenses?: string[];
  adoptedAt: string;
  adoptedBy: string;
}

/** Highest priority (lowest number) an entry has across the given lenses. */
export function overlayPriority(entry: OverlayEntry | undefined, lenses: string[]): number | undefined {
  let best: number | undefined;
  for (const l of lenses) {
    const p = entry?.lenses?.[l]?.priority;
    if (p !== undefined && (best === undefined || p < best)) best = p;
  }
  return best;
}
