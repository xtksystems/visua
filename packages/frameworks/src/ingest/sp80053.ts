/**
 * NIST SP 800-53 Rev. 5 (Release 5.2.0) ingestion from the official OSCAL
 * catalog, with SP 800-53A assessment objectives/methods (embedded in the
 * catalog) and SP 800-53B baseline membership from the OSCAL profiles.
 * Withdrawn controls are excluded from the graph.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { FrameworkGraph, RequirementNode } from "@visua/core";
import { CORPUS_DIR } from "../paths.ts";
import { pdfPages } from "./pdf.ts";

export const SP80053_ID = "nist-sp-800-53-r5";
const CATALOG_DOC = "oscal-sp-800-53r5-catalog";
const PDF_DOC = "nist-sp-800-53r5";

interface Prop {
  name: string;
  value: string;
  class?: string;
  ns?: string;
}
interface Part {
  id?: string;
  name: string;
  props?: Prop[];
  prose?: string;
  parts?: Part[];
  links?: { href: string; rel: string }[];
}
interface Param {
  id: string;
  label?: string;
  props?: Prop[];
  select?: { "how-many"?: string; choice?: string[] };
  guidelines?: { prose: string }[];
}
interface Control {
  id: string;
  class: string;
  title: string;
  props?: Prop[];
  params?: Param[];
  links?: { href: string; rel: string }[];
  parts?: Part[];
  controls?: Control[];
}
interface Group {
  id: string;
  title: string;
  props?: Prop[];
  controls: Control[];
}

const labelOf = (props: Prop[] | undefined, cls?: string) =>
  props?.find((p) => p.name === "label" && (cls ? p.class === cls : !p.class))?.value;

const isWithdrawn = (c: Control) => c.props?.some((p) => p.name === "status" && p.value === "withdrawn") ?? false;

/** Resolve `{{ insert: param, id }}` to SP 800-53 printed style. */
function renderProse(prose: string, params: Map<string, Param>): string {
  return prose.replace(/\{\{\s*insert:\s*param,\s*([^\s}]+)\s*\}\}/g, (_m, id: string) => {
    const p = params.get(id);
    if (!p) return "[Assignment: organization-defined value]";
    if (p.select?.choice?.length) {
      const how = p.select["how-many"] === "one-or-more" ? "Selection (one or more)" : "Selection";
      return `[${how}: ${p.select.choice.map((c) => renderProse(c, params)).join("; ")}]`;
    }
    return `[Assignment: organization-defined ${p.label ?? "value"}]`;
  });
}

/** Strip OSCAL markdown links: "[CM-8](#cm-8)" → "CM-8". */
const stripLinks = (text: string) => text.replace(/\[([^\]]+)\]\(#[^)]+\)/g, "$1");

function renderStatement(part: Part | undefined, params: Map<string, Param>, depth = 0): string[] {
  if (!part) return [];
  const lines: string[] = [];
  const label = labelOf(part.props);
  if (part.prose) lines.push(`${"  ".repeat(Math.max(0, depth - 1))}${label ? `${label} ` : ""}${renderProse(part.prose, params)}`);
  for (const child of part.parts ?? []) if (child.name === "item") lines.push(...renderStatement(child, params, depth + 1));
  return lines;
}

function leafObjectives(part: Part | undefined, params: Map<string, Param>, out: string[] = []): string[] {
  if (!part) return out;
  const kids = (part.parts ?? []).filter((p) => p.name === "assessment-objective");
  if (!kids.length && part.prose) {
    const label = labelOf(part.props, "sp800-53a");
    out.push(`${label ? `${label} ` : ""}${renderProse(part.prose, params)}`);
  }
  for (const k of kids) leafObjectives(k, params, out);
  return out;
}

function methods(control: Control): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const part of control.parts ?? []) {
    if (part.name !== "assessment-method") continue;
    const method = part.props?.find((p) => p.name === "method")?.value?.toLowerCase();
    const objects = part.parts?.find((p) => p.name === "assessment-objects")?.prose ?? "";
    if (method) out[method] = objects.split(/\n\s*\n/).map((s) => s.trim()).filter(Boolean);
  }
  return out;
}

function baselineIds(file: string): Set<string> {
  const profile = JSON.parse(readFileSync(file, "utf8")) as {
    profile: { imports: { "include-controls"?: { "with-ids"?: string[] }[] }[] };
  };
  const ids = new Set<string>();
  for (const imp of profile.profile.imports) for (const inc of imp["include-controls"] ?? []) for (const id of inc["with-ids"] ?? []) ids.add(id);
  return ids;
}

export async function ingest80053(): Promise<FrameworkGraph> {
  const dir = resolve(CORPUS_DIR, "nist-rmf");
  const catalog = JSON.parse(readFileSync(resolve(dir, "oscal/NIST_SP-800-53_rev5_catalog.json"), "utf8")) as {
    catalog: { groups: Group[]; metadata: { version: string } };
  };
  const baselines: Record<string, Set<string>> = {
    low: baselineIds(resolve(dir, "oscal/NIST_SP-800-53_rev5_LOW-baseline_profile.json")),
    moderate: baselineIds(resolve(dir, "oscal/NIST_SP-800-53_rev5_MODERATE-baseline_profile.json")),
    high: baselineIds(resolve(dir, "oscal/NIST_SP-800-53_rev5_HIGH-baseline_profile.json")),
    privacy: baselineIds(resolve(dir, "oscal/NIST_SP-800-53_rev5_PRIVACY-baseline_profile.json")),
  };
  const pdf = await pdfPages(resolve(dir, "controls/NIST.SP.800-53r5.pdf"));
  // Control catalog (Chapter 3) begins at the first family heading.
  // Skip the table of contents: the catalog starts on the page holding AC-1's heading.
  const chapterStart = Math.max(0, pdf.findIndex((p) => p.includes("AC-1 POLICY AND PROCEDURES")) - 1);
  const idToLabel = new Map<string, string>();
  for (const g of catalog.catalog.groups) {
    for (const c of g.controls) {
      idToLabel.set(c.id, labelOf(c.props) ?? c.id.toUpperCase());
      for (const e of c.controls ?? []) idToLabel.set(e.id, labelOf(e.props) ?? e.id.toUpperCase());
    }
  }

  const releaseVersion = catalog.catalog.metadata.version;
  const familyPage = (index: number, title: string) => {
    const heading = `3.${index + 1} ${title.toUpperCase()}`;
    const i = pdf.findIndex((p, pi) => pi >= chapterStart && p.includes(heading));
    return i >= 0 ? i + 1 : undefined;
  };
  const nodes: RequirementNode[] = [];
  let pageCursor = Math.max(0, chapterStart);
  const findControlPage = (label: string, title: string) => {
    const heading = `${label} ${title.toUpperCase()}`;
    for (let i = pageCursor; i < pdf.length; i++) {
      if (pdf[i]!.includes(heading)) {
        pageCursor = i;
        return i + 1;
      }
    }
    return undefined;
  };

  const controlNode = (c: Control, parentId: string, depth: number, order: number, basePage?: number, baseTitle?: string): RequirementNode => {
    const label = labelOf(c.props) ?? c.id.toUpperCase();
    const params = new Map((c.params ?? []).map((p) => [p.id, p]));
    const statementPart = c.parts?.find((p) => p.name === "statement");
    const statementLines = renderStatement(statementPart, params);
    const topItems = (statementPart?.parts ?? []).filter((p) => p.name === "item").map((p) => `${labelOf(p.props) ?? ""} ${renderProse(p.prose ?? "", params)}`.trim());
    const guidance = c.parts?.find((p) => p.name === "guidance")?.prose;
    const objective = c.parts?.find((p) => p.name === "assessment-objective");
    const memberOf = Object.entries(baselines).filter(([, ids]) => ids.has(c.id)).map(([b]) => b);
    const related = (c.links ?? []).filter((l) => l.rel === "related").map((l) => idToLabel.get(l.href.replace(/^#/, "")) ?? l.href.replace(/^#/, "").toUpperCase());
    const implementationLevel = (c.props ?? []).filter((p) => p.name === "implementation-level").map((p) => p.value);
    const enhancement = c.class === "SP800-53-enhancement";
    const page = enhancement ? basePage : findControlPage(label, c.title);
    return {
      id: `${SP80053_ID}:${label}`,
      frameworkId: SP80053_ID,
      code: label,
      kind: enhancement ? "enhancement" : "control",
      parentId,
      depth,
      order,
      title: enhancement && baseTitle ? `${c.title}` : c.title,
      text: statementLines.join("\n") || c.title,
      guidance: guidance ? stripLinks(guidance) : undefined,
      attributes: {
        oscalId: c.id,
        baselines: memberOf,
        statementItems: topItems,
        objectives: leafObjectives(objective, params),
        methods: methods(c),
        related,
        implementationLevel,
        contributesToAssurance: (c.props ?? []).some((p) => p.name === "contributes-to-assurance" && p.value === "true"),
        parameters: (c.params ?? []).filter((p) => p.id.includes("_odp")).length,
      },
      // Controls added after the 2020 PDF (e.g. SA-24, IA-13) are cited from the OSCAL release.
      citation: page ? { documentId: PDF_DOC, locator: `${label} ${c.title}`, page } : { documentId: CATALOG_DOC, locator: `${label} ${c.title} (Release ${releaseVersion})` },
      assessable: true,
    };
  };

  catalog.catalog.groups.forEach((g, gi) => {
    const familyCode = labelOf(g.props) ?? g.id.toUpperCase();
    const familyId = `${SP80053_ID}:${familyCode}`;
    nodes.push({
      id: familyId,
      frameworkId: SP80053_ID,
      code: familyCode,
      kind: "family",
      parentId: null,
      depth: 0,
      order: gi,
      title: g.title,
      text: `${g.title} (${familyCode}) control family`,
      citation: familyPage(gi, g.title) ? { documentId: PDF_DOC, locator: `3.${gi + 1} ${g.title}`, page: familyPage(gi, g.title) } : { documentId: CATALOG_DOC, locator: `Family ${familyCode}` },
      assessable: false,
    });
    let order = 0;
    for (const c of g.controls) {
      if (isWithdrawn(c)) continue;
      const base = controlNode(c, familyId, 1, order++);
      nodes.push(base);
      let eo = 0;
      for (const e of c.controls ?? []) {
        if (isWithdrawn(e)) continue;
        nodes.push(controlNode(e, base.id, 2, eo++, base.citation.page, c.title));
      }
    }
  });

  return {
    framework: {
      id: SP80053_ID,
      family: "rmf",
      shortName: "SP 800-53 Rev. 5",
      badge: "SP 800-53",
      name: "NIST SP 800-53 Rev. 5 — Security and Privacy Controls for Information Systems and Organizations (Release 5.2.0)",
      publisher: "National Institute of Standards and Technology",
      version: catalog.catalog.metadata.version,
      published: "2025-08-26",
      description:
        "The comprehensive catalog of security and privacy controls used by the NIST Risk Management Framework: 20 families, base controls and enhancements with SP 800-53A assessment objectives and SP 800-53B LOW / MODERATE / HIGH / PRIVACY baselines.",
      levels: [
        { kind: "family", label: "Family", pluralLabel: "Families" },
        { kind: "control", label: "Control", pluralLabel: "Controls" },
        { kind: "enhancement", label: "Enhancement", pluralLabel: "Enhancements" },
      ],
      assessableKind: "control",
      sources: [{ documentId: CATALOG_DOC }, { documentId: PDF_DOC }, { documentId: "nist-sp-800-53b" }, { documentId: "nist-sp-800-53ar5" }],
      unitLabel: "control",
      unitLabelPlural: "controls",
    },
    nodes,
  };
}
