/**
 * NIST CSF 2.0 ingestion from the official CSF 2.0 Reference Tool data
 * (corpus/nist-csf-2.0/machine-readable/csf-2.0-reference-tool-elements.json),
 * with page citations resolved against NIST CSWP 29 and the Implementation
 * Examples PDF. Withdrawn CSF 1.1 elements are excluded from the graph.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { FrameworkGraph, ImplementationExample, InformativeReference, Mapping, MappingSet, RequirementNode } from "@visua/core";
import { CORPUS_DIR } from "../paths.ts";
import { findPage, pdfPages } from "./pdf.ts";

export const CSF_ID = "nist-csf-2.0";
const CSWP29 = "nist-cswp-29-csf-2-0";
const ELEMENTS = "csf-2-0-reference-tool-elements-json";
const EXAMPLES_PDF = "csf-2-0-implementation-examples-pdf";

/** Archived OLIR dataset superseded by the Rev 5.2.0 mapping. */
const ARCHIVED_DATASETS = new Set(["SP-800-53-Rev-5-to-Cybersecurity-Framework-v2.0"]);
export const OLIR_800_53 = "Cybersecurity-Framework-v2.0-to-SP-800-53-Rev-5-2-0";
export const OLIR_800_37 = "SP-800-37-Rev-2-to-Cybersecurity-Framework-v2.0";

interface RawNode {
  elementIdentifier: string;
  elementTypeIdentifier: string;
  title: string;
  text?: string;
  elements?: RawNode[];
  externalRelationships?: RawRef[];
  relationIdentifier?: string;
}

interface RawRef {
  elementIdentifier: string;
  elementTypeIdentifier: string;
  title: string;
  text?: string;
  relationIdentifier: string;
  shortName: string;
  olirName?: string;
  frameworkVersionIdentifier?: string;
}

interface OlirDoc {
  name: string;
  developerId: string;
  releaseDate: string;
  webSite?: string;
}

const isWithdrawn = (n: RawNode) => (n.elements ?? []).some((c) => c.elementTypeIdentifier === "withdraw_reason");

const titleCase = (s: string) => s.charAt(0) + s.slice(1).toLowerCase();

/** "SR-03" → "SR-3", "AC-02(01)" → "AC-2(1)" (SP 800-53 display labels). */
export function normalize80053(ref: string): string {
  const m = /^([A-Z]{2})-0*(\d+)(?:\(0*(\d+)\))?$/.exec(ref.trim().toUpperCase());
  if (!m) return ref.trim().toUpperCase();
  return `${m[1]}-${m[2]}${m[3] ? `(${m[3]})` : ""}`;
}

/** "RMF Prepare Step (...): TASK P-2 Risk Management Strategy" → "P-2" */
export function rmfTaskCode(ref: string): string | undefined {
  return /TASK\s+([PCSIAR]-\d{1,2})\b/.exec(ref)?.[1];
}

export interface CsfIngestResult {
  graph: FrameworkGraph;
  /** Raw references kept for building mapping sets once all graphs exist. */
  crosswalkRefs: { csfId: string; dataset: string; ref: string }[];
}

export async function ingestCsf(): Promise<CsfIngestResult> {
  const dir = resolve(CORPUS_DIR, "nist-csf-2.0");
  const elements = JSON.parse(readFileSync(resolve(dir, "machine-readable/csf-2.0-reference-tool-elements.json"), "utf8")) as {
    response: { elements: RawNode[] };
  };
  const olirs = JSON.parse(readFileSync(resolve(dir, "machine-readable/csf-2.0-reference-tool-olirs.json"), "utf8")) as {
    response: { informativeReferenceDocs: OlirDoc[] };
  };
  const developers = new Map(olirs.response.informativeReferenceDocs.map((d) => [d.name, d.developerId]));

  const cswp = await pdfPages(resolve(dir, "core/NIST.CSWP.29.pdf"));
  const examplesPdf = await pdfPages(resolve(dir, "core/CSF_2.0_Implementation_Examples.pdf"));
  // The CSF Core listing (Appendix A) starts where GV.OC-01 is first spelled out.
  const coreStart = (findPage(cswp, "GV.OC-01:") ?? 1) - 1;

  const nodes: RequirementNode[] = [];
  const crosswalkRefs: CsfIngestResult["crosswalkRefs"] = [];

  const refsOf = (raw: RawNode, csfId: string): InformativeReference[] => {
    const seen = new Set<string>();
    const out: InformativeReference[] = [];
    for (const r of raw.externalRelationships ?? []) {
      if (r.relationIdentifier !== "olir_focal") continue;
      const dataset = r.olirName ?? r.shortName;
      if (ARCHIVED_DATASETS.has(dataset)) continue;
      const key = `${dataset}|${r.elementIdentifier.trim()}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const ref: InformativeReference = { source: r.shortName, ref: r.elementIdentifier.replace(/\s+/g, " ").trim(), dataset, developer: developers.get(dataset) };
      if (dataset === OLIR_800_53) {
        ref.ref = normalize80053(r.elementIdentifier);
        ref.nodeId = `nist-sp-800-53-r5:${ref.ref}`;
        crosswalkRefs.push({ csfId, dataset, ref: ref.ref });
      } else if (dataset === OLIR_800_37) {
        const code = rmfTaskCode(r.elementIdentifier);
        if (code) {
          ref.nodeId = `nist-rmf:${code}`;
          crosswalkRefs.push({ csfId, dataset, ref: code });
        }
      }
      out.push(ref);
    }
    return out;
  };

  const families = (raw: RawNode) =>
    [...new Set((raw.externalRelationships ?? []).filter((r) => r.relationIdentifier === "external_reference").map((r) => r.elementIdentifier))];

  let fnOrder = 0;
  for (const fn of elements.response.elements) {
    const fnId = `${CSF_ID}:${fn.elementIdentifier}`;
    nodes.push({
      id: fnId,
      frameworkId: CSF_ID,
      code: fn.elementIdentifier,
      kind: "function",
      parentId: null,
      depth: 0,
      order: fnOrder++,
      title: titleCase(fn.title),
      text: fn.text ?? "",
      references: refsOf(fn, fnId),
      attributes: { officialTitle: fn.title },
      citation: { documentId: CSWP29, locator: `Appendix A — ${fn.title} (${fn.elementIdentifier})`, page: findPage(cswp, `(${fn.elementIdentifier}):`, coreStart) },
      assessable: false,
    });
    let catOrder = 0;
    for (const cat of fn.elements ?? []) {
      if (cat.elementTypeIdentifier !== "category" || cat.relationIdentifier || isWithdrawn(cat)) continue;
      const catId = `${CSF_ID}:${cat.elementIdentifier}`;
      nodes.push({
        id: catId,
        frameworkId: CSF_ID,
        code: cat.elementIdentifier,
        kind: "category",
        parentId: fnId,
        depth: 1,
        order: catOrder++,
        title: cat.title,
        text: cat.text ?? "",
        references: refsOf(cat, catId),
        citation: { documentId: CSWP29, locator: `Appendix A — ${cat.title} (${cat.elementIdentifier})`, page: findPage(cswp, `(${cat.elementIdentifier}):`, coreStart) },
        assessable: false,
      });
      let subOrder = 0;
      for (const sub of cat.elements ?? []) {
        if (sub.elementTypeIdentifier !== "subcategory" || sub.relationIdentifier || isWithdrawn(sub)) continue;
        const subId = `${CSF_ID}:${sub.elementIdentifier}`;
        const kids = sub.elements ?? [];
        const examples: ImplementationExample[] = kids
          .filter((k) => k.elementTypeIdentifier === "implementation_example")
          .map((k) => ({ code: `${sub.elementIdentifier} ${k.title}`, text: (k.text ?? "").trim() }));
        const party = kids.filter((k) => k.elementTypeIdentifier === "party").map((k) => k.elementIdentifier);
        nodes.push({
          id: subId,
          frameworkId: CSF_ID,
          code: sub.elementIdentifier,
          kind: "subcategory",
          parentId: catId,
          depth: 2,
          order: subOrder++,
          title: "",
          text: (sub.text ?? "").trim(),
          examples,
          references: refsOf(sub, subId),
          attributes: {
            party,
            sp80053Families: families(sub),
            examplesPage: findPage(examplesPdf, `${sub.elementIdentifier}:`) ?? findPage(examplesPdf, sub.elementIdentifier),
          },
          citation: { documentId: CSWP29, locator: `Appendix A — ${sub.elementIdentifier}`, page: findPage(cswp, `${sub.elementIdentifier}:`, coreStart) },
          assessable: true,
        });
      }
    }
  }

  const graph: FrameworkGraph = {
    framework: {
      id: CSF_ID,
      family: "csf",
      shortName: "NIST CSF 2.0",
      badge: "CSF 2.0",
      name: "The NIST Cybersecurity Framework (CSF) 2.0",
      publisher: "National Institute of Standards and Technology",
      version: "2.0",
      published: "2024-02-26",
      description:
        "A taxonomy of high-level cybersecurity outcomes that any organization — regardless of size, sector or maturity — can use to understand, assess, prioritize and communicate its cybersecurity efforts. Six Functions (Govern, Identify, Protect, Detect, Respond, Recover), 22 Categories and 106 Subcategories, with official Implementation Examples and Informative References.",
      levels: [
        { kind: "function", label: "Function", pluralLabel: "Functions" },
        { kind: "category", label: "Category", pluralLabel: "Categories" },
        { kind: "subcategory", label: "Subcategory", pluralLabel: "Subcategories" },
      ],
      assessableKind: "subcategory",
      sources: [{ documentId: CSWP29 }, { documentId: ELEMENTS }, { documentId: EXAMPLES_PDF }],
      unitLabel: "outcome",
      unitLabelPlural: "outcomes",
    },
    nodes,
  };
  return { graph, crosswalkRefs };
}

/** Build CSF crosswalk mapping sets, keeping only mappings whose endpoints exist. */
export function csfMappingSets(refs: CsfIngestResult["crosswalkRefs"], exists: (id: string) => boolean): MappingSet[] {
  const toControls: Mapping[] = [];
  const toRmf: Mapping[] = [];
  const seen = new Set<string>();
  for (const r of refs) {
    if (r.dataset === OLIR_800_53) {
      const source = `nist-sp-800-53-r5:${r.ref}`;
      const key = `${source}|${r.csfId}`;
      if (seen.has(key) || !exists(source) || !exists(r.csfId)) continue;
      seen.add(key);
      toControls.push({
        source,
        target: r.csfId,
        relationship: "supports",
        origin: { documentId: "olir-csf-2-0-to-sp-800-53r5-2-0", authority: "NIST OLIR — CSF 2.0 to SP 800-53 Rev. 5.2.0 concept crosswalk" },
      });
    } else if (r.dataset === OLIR_800_37) {
      const source = `nist-rmf:${r.ref}`;
      const key = `${source}|${r.csfId}`;
      if (seen.has(key) || !exists(source) || !exists(r.csfId)) continue;
      seen.add(key);
      toRmf.push({
        source,
        target: r.csfId,
        relationship: "related-to",
        origin: { documentId: "olir-sp-800-37r2-to-csf-2-0", authority: "NIST OLIR — SP 800-37 Rev. 2 to CSF 2.0 concept crosswalk" },
      });
    }
  }
  return [
    {
      id: "sp-800-53-r5--csf-2.0",
      title: "SP 800-53 Rev. 5.2.0 controls supporting CSF 2.0 outcomes",
      sourceFramework: "nist-sp-800-53-r5",
      targetFramework: CSF_ID,
      authority: "NIST OLIR",
      mappings: toControls,
    },
    {
      id: "rmf-tasks--csf-2.0",
      title: "RMF (SP 800-37 Rev. 2) tasks related to CSF 2.0",
      sourceFramework: "nist-rmf",
      targetFramework: CSF_ID,
      authority: "NIST OLIR",
      mappings: toRmf,
    },
  ];
}
