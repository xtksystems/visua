/**
 * NIST's AI security drafts as overlays on frameworks Visua already models:
 *
 * - the Cyber AI Profile (NIST IR 8596, initial preliminary draft), a CSF 2.0
 *   Community Profile: for each of the 106 subcategories, general
 *   considerations and, per focus area (Secure, Defend, Thwart), a proposed
 *   priority, considerations and example informative references;
 * - COSAiS, the SP 800-53 Control Overlays for Securing AI Systems: the
 *   annotated outline of the "Using and Fine-Tuning Predictive AI" overlay
 *   (planned NISTIR 8605A), with its 59 controls.
 *
 * Both come from the structured extractions in corpus/nist-ai-rmf/ (see
 * STRUCTURE.md §11, reproducible with the scripts in tools/). Every entry
 * must attach to an existing node, or ingestion fails.
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { FrameworkOverlay, OverlayEntry, OverlayLensEntry } from "@visua/core";
import { CORPUS_DIR } from "../paths.ts";

interface ProfileSource {
  source: { documentId: string; title: string; identifier: string; status: string; published: string; landingPage: string; draftNotice: { text: string; page: number } };
  focusAreas: { id: string; short: string; title: string; description: string; page: number; section: string }[];
  priorityLevels: { level: number; label: string; description: string }[];
  entries: {
    subcategory: string;
    page: number;
    general: { considerations: string | null; note?: string | null; references: string[]; sp80053: string[] };
    focus: Record<string, { priority: number; considerations?: string | null; opportunities?: string | null; references?: string[]; referencesNote?: string }>;
    refs: { scheme: string; id: string | null; text: string; column: string }[];
  }[];
}

interface CosaisSource {
  status: string;
  sources: { documentId: string; published: string }[];
  overlays: {
    id: string;
    title: string;
    status: string;
    note: string;
    notePage: number;
    documentId: string;
    useCases: { id: string; text: string; page: number }[];
    assumptions: string[];
    lifecyclePhases: string[];
    controls: {
      id: string;
      idAsPrinted: string;
      inSummaryTable: boolean;
      annotated: boolean;
      proposedAdditional: boolean;
      lifecyclePhases: string[] | null;
      tailoring: { controlRequirement: boolean; organizationDefinedParameter: boolean; discussion: boolean } | null;
      annotation: {
        selectedInModerateBaseline?: string;
        assumptions?: string;
        controlTailoringSections?: { label: string; text: string }[];
        attackIdsNormalized?: string[];
      } | null;
      page: number;
    }[];
  }[];
}

const clean = <T extends Record<string, unknown>>(o: T): T => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined && v !== null)) as T;

export const CYBER_AI_PROFILE_ID = "nist-ir-8596-iprd";
export const COSAIS_PREDICTIVE_ID = "nist-cosais-predictive-ai";

export function ingestCyberAiProfile(nodeIds: Set<string>, corpusDir = CORPUS_DIR): FrameworkOverlay | undefined {
  const file = resolve(corpusDir, "nist-ai-rmf", "cyber-ai-profile.json");
  if (!existsSync(file)) return undefined;
  const src = JSON.parse(readFileSync(file, "utf8")) as ProfileSource;
  const doc = src.source.documentId;
  const entries: OverlayEntry[] = src.entries.map((e) => {
    const nodeId = `nist-csf-2.0:${e.subcategory}`;
    if (!nodeIds.has(nodeId)) throw new Error(`Cyber AI Profile: ${e.subcategory} is not a CSF 2.0 subcategory`);
    const lenses: Record<string, OverlayLensEntry> = {};
    for (const [lens, f] of Object.entries(e.focus)) {
      lenses[lens] = clean({ priority: f.priority, considerations: f.considerations ?? undefined, opportunities: f.opportunities ?? undefined, references: f.references ?? [], referencesNote: f.referencesNote });
    }
    return {
      nodeId,
      citation: { documentId: doc, locator: `Cyber AI Profile, ${e.subcategory}`, page: e.page },
      general: clean({ considerations: e.general.considerations ?? undefined, note: e.general.note ?? undefined, references: e.general.references, sp80053: e.general.sp80053 }),
      lenses,
      refs: e.refs.map((r) => ({ scheme: r.scheme, id: r.id, text: r.text, column: r.column })),
    };
  });
  return {
    id: CYBER_AI_PROFILE_ID,
    frameworkId: "nist-csf-2.0",
    kind: "community-profile",
    title: src.source.title,
    shortName: "Cyber AI Profile",
    identifier: src.source.identifier,
    documentId: doc,
    status: src.source.status,
    notice: { text: src.source.draftNotice.text, citation: { documentId: doc, locator: "Section 2.2", page: src.source.draftNotice.page } },
    published: src.source.published,
    landingPage: src.source.landingPage,
    lenses: src.focusAreas.map((f) => ({ id: f.id, short: f.short, title: f.title, description: f.description, citation: { documentId: doc, locator: `Section ${f.section}`, page: f.page } })),
    priorityLevels: src.priorityLevels.map((p) => ({ level: p.level, label: p.label, description: p.description })),
    entries,
  };
}

export function ingestCosais(nodeIds: Set<string>, corpusDir = CORPUS_DIR): FrameworkOverlay | undefined {
  const file = resolve(corpusDir, "nist-ai-rmf", "cosais.json");
  if (!existsSync(file)) return undefined;
  const src = JSON.parse(readFileSync(file, "utf8")) as CosaisSource;
  const o = src.overlays.find((x) => x.id === "predictive-ai-use-finetune");
  if (!o) return undefined;
  const doc = o.documentId;
  const entries: OverlayEntry[] = o.controls.map((c) => {
    const nodeId = `nist-sp-800-53-r5:${c.id}`;
    if (!nodeIds.has(nodeId)) throw new Error(`COSAiS: ${c.id} is not an SP 800-53 Rev. 5 control`);
    const where = c.annotated ? "control annotation" : c.inSummaryTable ? "summary table" : "additional proposed controls";
    const attackIds = c.annotation?.attackIdsNormalized ?? [];
    return {
      nodeId,
      citation: { documentId: doc, locator: `${c.idAsPrinted}, ${where}`, page: c.page },
      control: clean({
        inSummaryTable: c.inSummaryTable,
        annotated: c.annotated,
        proposedAdditional: c.proposedAdditional,
        lifecyclePhases: c.lifecyclePhases ?? undefined,
        selectedInModerateBaseline: c.annotation?.selectedInModerateBaseline,
        assumptions: c.annotation?.assumptions,
        tailoring: c.tailoring ?? undefined,
        tailoringSections: c.annotation?.controlTailoringSections,
        attackIds: attackIds.length ? attackIds : undefined,
      }),
      refs: attackIds.map((id) => ({ scheme: "nist-ai-100-2", id, text: id })),
    };
  });
  return {
    id: COSAIS_PREDICTIVE_ID,
    frameworkId: "nist-sp-800-53-r5",
    kind: "control-overlay",
    title: o.title,
    shortName: "COSAiS · Predictive AI",
    identifier: "COSAiS annotated outline (planned NISTIR 8605A)",
    documentId: doc,
    status: o.status,
    notice: { text: `${src.status} ${o.note}`, citation: { documentId: doc, locator: "Additional proposed controls", page: o.notePage } },
    published: src.sources.find((s) => s.documentId === doc)?.published,
    landingPage: "https://csrc.nist.gov/projects/cosais",
    scope: {
      useCases: o.useCases.map((u) => ({ id: u.id, text: u.text, citation: { documentId: doc, locator: `Use case ${u.id}`, page: u.page } })),
      assumptions: o.assumptions,
      lifecyclePhases: o.lifecyclePhases,
    },
    entries,
  };
}
