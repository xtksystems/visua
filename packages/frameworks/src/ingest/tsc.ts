/**
 * AICPA 2017 Trust Services Criteria (with Revised Points of Focus — 2022)
 * ingestion — the criteria used for SOC 2 examinations. Reads the structured
 * extraction made from the official AICPA PDF (corpus/aicpa-soc2/
 * tsc-2017-rev2022.json) and optional official AICPA mapping spreadsheets.
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { FrameworkGraph, Mapping, MappingSet, RequirementNode } from "@visua/core";
import { CORPUS_DIR } from "../paths.ts";
import { findPage, pdfPages } from "./pdf.ts";

export const TSC_ID = "aicpa-tsc-2017";

interface RawTsc {
  source?: { documentId?: string; title?: string; copyright?: string };
  categories: { id: string; name: string; description?: string }[];
  series: { id: string; title: string; category: string }[];
  criteria: {
    id: string;
    series: string;
    category: string;
    cosoPrinciple?: number | null;
    text: string;
    pointsOfFocus?: { title: string; text?: string; scope?: string; addedIn2022?: boolean }[];
  }[];
}

export interface TscMappingRow {
  criterion: string;
  framework: "nist-csf-2.0" | "nist-sp-800-53-r5";
  ref: string;
  documentId: string;
}

export interface TscIngestResult {
  graph: FrameworkGraph;
  mappingRows: TscMappingRow[];
}

const CATEGORY_GROUPS: { code: string; category: string; title: string }[] = [
  { code: "CC", category: "security", title: "Common Criteria (Security)" },
  { code: "A", category: "availability", title: "Additional Criteria for Availability" },
  { code: "PI", category: "processing-integrity", title: "Additional Criteria for Processing Integrity" },
  { code: "C", category: "confidentiality", title: "Additional Criteria for Confidentiality" },
  { code: "P", category: "privacy", title: "Additional Criteria for Privacy" },
];

function naturalKey(code: string): (string | number)[] {
  return code.split(/(\d+)/).map((p) => (/^\d+$/.test(p) ? Number(p) : p));
}
function compareCodes(a: string, b: string): number {
  const ka = naturalKey(a);
  const kb = naturalKey(b);
  for (let i = 0; i < Math.max(ka.length, kb.length); i++) {
    const x = ka[i];
    const y = kb[i];
    if (x === y) continue;
    if (x === undefined) return -1;
    if (y === undefined) return 1;
    if (typeof x === "number" && typeof y === "number") return x - y;
    return String(x).localeCompare(String(y));
  }
  return 0;
}

export async function ingestTsc(): Promise<TscIngestResult | null> {
  const dir = resolve(CORPUS_DIR, "aicpa-soc2");
  const jsonPath = resolve(dir, "tsc-2017-rev2022.json");
  if (!existsSync(jsonPath)) return null;
  const raw = JSON.parse(readFileSync(jsonPath, "utf8")) as RawTsc;
  const manifestPath = resolve(dir, "manifest.json");
  const manifest = existsSync(manifestPath)
    ? (JSON.parse(readFileSync(manifestPath, "utf8")) as { documents: { id: string; role: string; path: string; mediaType: string }[] })
    : { documents: [] };
  const criteriaDoc = manifest.documents.find((d) => d.role === "criteria" && d.mediaType === "application/pdf");
  const documentId = raw.source?.documentId ?? criteriaDoc?.id ?? "aicpa-tsc-2017-rev2022";
  let pages: string[] = [];
  if (criteriaDoc && existsSync(resolve(CORPUS_DIR, criteriaDoc.path))) pages = await pdfPages(resolve(CORPUS_DIR, criteriaDoc.path));

  const nodes: RequirementNode[] = [];
  CATEGORY_GROUPS.forEach((group, gi) => {
    const catInfo = raw.categories.find((c) => c.id === group.category);
    const groupId = `${TSC_ID}:${group.code}`;
    nodes.push({
      id: groupId,
      frameworkId: TSC_ID,
      code: group.code,
      kind: "category",
      parentId: null,
      depth: 0,
      order: gi,
      title: group.title,
      text: catInfo?.description ?? catInfo?.name ?? group.title,
      attributes: { category: group.category },
      citation: { documentId, locator: group.title },
      assessable: false,
    });
    const series = raw.series.filter((s) => s.category === group.category).sort((a, b) => compareCodes(a.id, b.id));
    series.forEach((s, si) => {
      const seriesId = `${TSC_ID}:${s.id}`;
      nodes.push({
        id: seriesId,
        frameworkId: TSC_ID,
        code: s.id,
        kind: "series",
        parentId: groupId,
        depth: 1,
        order: si,
        title: s.title,
        text: `${s.id} — ${s.title}`,
        attributes: { category: group.category },
        citation: { documentId, locator: `${s.id} ${s.title}` },
        assessable: false,
      });
      const criteria = raw.criteria.filter((c) => c.series === s.id).sort((a, b) => compareCodes(a.id, b.id));
      criteria.forEach((c, ci) => {
        const page = pages.length ? findPage(pages, `${c.id} `) ?? findPage(pages, c.id) : undefined;
        nodes.push({
          id: `${TSC_ID}:${c.id}`,
          frameworkId: TSC_ID,
          code: c.id,
          kind: "criterion",
          parentId: seriesId,
          depth: 2,
          order: ci,
          title: c.cosoPrinciple ? `COSO Principle ${c.cosoPrinciple}` : "",
          text: c.text.trim(),
          attributes: {
            category: c.category ?? group.category,
            cosoPrinciple: c.cosoPrinciple ?? null,
            pointsOfFocus: (c.pointsOfFocus ?? []).map((p) => ({ title: p.title.trim(), text: p.text?.trim(), scope: p.scope, addedIn2022: p.addedIn2022 })),
          },
          citation: { documentId, locator: `TSP Section 100 — ${c.id}`, page },
          assessable: true,
        });
      });
    });
  });

  return {
    graph: {
      framework: {
        id: TSC_ID,
        family: "soc2",
        shortName: "SOC 2 (TSC 2017)",
        name: "AICPA 2017 Trust Services Criteria for Security, Availability, Processing Integrity, Confidentiality, and Privacy (With Revised Points of Focus — 2022)",
        publisher: "American Institute of Certified Public Accountants (AICPA)",
        version: "2017 (Revised Points of Focus — 2022)",
        published: "2022",
        description:
          "The control criteria used in SOC 2 examinations: the Common Criteria (Security, aligned to the 17 COSO 2013 principles) plus additional criteria for Availability, Processing Integrity, Confidentiality and Privacy, each supported by points of focus.",
        levels: [
          { kind: "category", label: "Category", pluralLabel: "Categories" },
          { kind: "series", label: "Series", pluralLabel: "Series" },
          { kind: "criterion", label: "Criterion", pluralLabel: "Criteria" },
        ],
        assessableKind: "criterion",
        sources: [{ documentId }],
        unitLabel: "criterion",
        unitLabelPlural: "criteria",
      },
      nodes,
    },
    mappingRows: loadMappingRows(dir, manifest.documents),
  };
}

/** Read `corpus/aicpa-soc2/mappings/*.json` normalized mapping extracts when present. */
function loadMappingRows(dir: string, documents: { id: string; role: string; path: string }[]): TscMappingRow[] {
  const rows: TscMappingRow[] = [];
  const normalized = resolve(dir, "mappings/tsc-mappings.json");
  if (existsSync(normalized)) {
    const data = JSON.parse(readFileSync(normalized, "utf8")) as TscMappingRow[];
    rows.push(...data);
  }
  void documents;
  return rows;
}

export function tscMappingSets(tsc: TscIngestResult, exists: (id: string) => boolean): MappingSet[] {
  const byFramework = new Map<string, Mapping[]>();
  const seen = new Set<string>();
  for (const row of tsc.mappingRows) {
    const source = `${TSC_ID}:${row.criterion}`;
    const target = `${row.framework}:${row.ref}`;
    const key = `${source}|${target}`;
    if (seen.has(key) || !exists(source) || !exists(target)) continue;
    seen.add(key);
    const list = byFramework.get(row.framework) ?? [];
    list.push({ source, target, relationship: "intersects-with", origin: { documentId: row.documentId, authority: "AICPA mapping of the Trust Services Criteria" } });
    byFramework.set(row.framework, list);
  }
  return [...byFramework.entries()].map(([framework, mappings]) => ({
    id: `tsc-2017--${framework === "nist-csf-2.0" ? "csf-2.0" : "sp-800-53-r5"}`,
    title: `AICPA Trust Services Criteria mapped to ${framework === "nist-csf-2.0" ? "NIST CSF 2.0" : "NIST SP 800-53 Rev. 5"}`,
    sourceFramework: TSC_ID,
    targetFramework: framework,
    authority: "AICPA",
    mappings,
  }));
}
