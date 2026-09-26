/**
 * AICPA 2017 Trust Services Criteria (points of focus revised 2022): the
 * criteria used in SOC 2 examinations.
 *
 * Licensing: the criteria text, points of focus and DC 200 description criteria
 * are © AICPA ("all rights reserved"; the AICPA site terms allow personal,
 * non-commercial use and object to use in LLM knowledge bases). Visua does not
 * redistribute them. The graph is built from Visua's own skeleton
 * (./tsc-skeleton.ts) and, when a licensed local copy of the structured
 * extraction exists (corpus/aicpa-soc2/tsc-2017-rev2022.json, git-ignored),
 * overlaid with the verbatim text for that installation only.
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { FrameworkGraph, RequirementNode } from "@visua/core";
import { CORPUS_DIR } from "../paths.ts";
import { DC200_SKELETON, TSC_CATEGORIES, TSC_CRITERIA, TSC_SERIES } from "./tsc-skeleton.ts";

export const TSC_ID = "aicpa-tsc-2017";
export const TSC_DOCUMENT = "tsc-2017-rev-pof-2022";
export const DC200_DOCUMENT = "dc200-2018-rev-ig-2022";

const LICENSED_TSC = resolve(CORPUS_DIR, "aicpa-soc2/tsc-2017-rev2022.json");
const LICENSED_DC200 = resolve(CORPUS_DIR, "aicpa-soc2/dc200-description-criteria.json");

export interface LicensedTsc {
  criteria: {
    id: string;
    text: string;
    sourcePage?: number;
    pointsOfFocus?: { ref?: string; title: string; text?: string; scope?: string; origin?: string; addedIn2022?: boolean; revisedIn2022?: boolean; sourcePage?: number }[];
  }[];
  categories?: { id: string; description?: string }[];
}

export function loadLicensedTsc(): LicensedTsc | null {
  if (!existsSync(LICENSED_TSC)) return null;
  return JSON.parse(readFileSync(LICENSED_TSC, "utf8")) as LicensedTsc;
}

const CATEGORY_GROUPS: { code: string; category: string; title: string }[] = [
  { code: "CC", category: "security", title: "Common Criteria (Security)" },
  { code: "A", category: "availability", title: "Availability" },
  { code: "PI", category: "processing-integrity", title: "Processing Integrity" },
  { code: "C", category: "confidentiality", title: "Confidentiality" },
  { code: "P", category: "privacy", title: "Privacy" },
];

/** Build the TSC graph: Visua skeleton, overlaid with licensed verbatim text when available. */
export function buildTscGraph(licensed: LicensedTsc | null = loadLicensedTsc()): FrameworkGraph {
  const nodes: RequirementNode[] = [];
  CATEGORY_GROUPS.forEach((group, gi) => {
    const cat = TSC_CATEGORIES.find((c) => c.id === group.category)!;
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
      text: cat.summary,
      attributes: { category: group.category, licensed: false },
      citation: { documentId: TSC_DOCUMENT, locator: `TSP Section 100 — ${cat.name}` },
      assessable: false,
    });
    TSC_SERIES.filter((s) => s.category === group.category).forEach((s, si) => {
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
        attributes: { category: group.category, licensed: false },
        citation: { documentId: TSC_DOCUMENT, locator: `TSP Section 100 — ${s.id} ${s.title}` },
        assessable: false,
      });
      TSC_CRITERIA.filter((c) => c.series === s.id).forEach((c, ci) => {
        const official = licensed?.criteria.find((x) => x.id === c.id);
        nodes.push({
          id: `${TSC_ID}:${c.id}`,
          frameworkId: TSC_ID,
          code: c.id,
          kind: "criterion",
          parentId: seriesId,
          depth: 2,
          order: ci,
          title: c.title,
          text: official?.text.trim() ?? c.summary,
          attributes: {
            category: c.category,
            cosoPrinciple: c.cosoPrinciple,
            summary: c.summary,
            licensed: !!official,
            ...(official?.pointsOfFocus
              ? {
                  pointsOfFocus: official.pointsOfFocus.map((p) => ({
                    ref: p.ref,
                    title: p.title.trim(),
                    text: p.text?.trim(),
                    scope: p.scope,
                    origin: p.origin,
                    change2022: p.addedIn2022 ? "added" : p.revisedIn2022 ? "revised" : "unchanged",
                  })),
                }
              : {}),
          },
          citation: { documentId: TSC_DOCUMENT, locator: `TSP Section 100 — ${c.id}`, page: official?.sourcePage },
          assessable: true,
        });
      });
    });
  });
  const licensedText = nodes.some((n) => n.attributes?.["licensed"] === true);
  return {
    framework: {
      id: TSC_ID,
      family: "soc2",
      shortName: "SOC 2 (TSC 2017)",
      badge: "SOC 2",
      name: "AICPA 2017 Trust Services Criteria for Security, Availability, Processing Integrity, Confidentiality, and Privacy (points of focus revised 2022)",
      publisher: "American Institute of Certified Public Accountants (AICPA)",
      version: "2017 (points of focus revised 2022)",
      published: "2022",
      description:
        "The criteria used in SOC 2 examinations: the Common Criteria (Security, built on the 17 COSO 2013 principles) plus additional criteria for Availability, Processing Integrity, Confidentiality and Privacy.",
      levels: [
        { kind: "category", label: "Category", pluralLabel: "Categories" },
        { kind: "series", label: "Series", pluralLabel: "Series" },
        { kind: "criterion", label: "Criterion", pluralLabel: "Criteria" },
      ],
      assessableKind: "criterion",
      sources: [{ documentId: TSC_DOCUMENT }],
      unitLabel: "criterion",
      unitLabelPlural: "criteria",
      contentNotice: licensedText
        ? "Criterion text and points of focus © AICPA, loaded from this installation's local copy. Not redistributed by Visua."
        : "Criterion titles and summaries are Visua's plain-language descriptions. The official AICPA text is not bundled; add a licensed copy to corpus/aicpa-soc2 to display it.",
    },
    nodes,
  };
}

export interface DescriptionCriterion {
  id: string;
  title: string;
  /** Verbatim criterion text — only with a licensed local copy. */
  text?: string;
  items?: { marker: string; text: string }[];
  page?: number;
  typeTwoOnly?: boolean;
  licensed: boolean;
}

/** DC 200 description criteria: Visua titles, overlaid with licensed text when available. */
export function loadDescriptionCriteria(): DescriptionCriterion[] {
  const licensed = existsSync(LICENSED_DC200)
    ? (JSON.parse(readFileSync(LICENSED_DC200, "utf8")) as { id: string; criterion?: string; text: string; items?: { marker: string; text: string }[]; sourcePage?: number }[])
    : null;
  return DC200_SKELETON.map((d) => {
    const official = licensed?.find((x) => x.id === d.id);
    return {
      id: d.id,
      title: d.title,
      text: official ? (official.criterion ?? official.text) : undefined,
      items: official?.items?.map((i) => ({ marker: i.marker, text: i.text })),
      page: official?.sourcePage,
      typeTwoOnly: d.typeTwoOnly,
      licensed: !!official,
    };
  });
}
