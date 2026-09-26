/**
 * AI threat catalogs as graphs of the "threat" family, and the published links
 * between threats and requirements.
 *
 *   MITRE ATLAS 2026.09        tactics → techniques → sub-techniques; mitigations
 *   OWASP Top 10 for LLM Apps  2026 edition (current) and 2025 (superseded)
 *   OWASP Top 10 for Agentic Applications 2026
 *   NIST AI 100-2 E2025        attacker objectives → attacks
 *
 * Built from the structured extractions in corpus/ai-threats (see its
 * STRUCTURE.md). Links come from corpus/ai-threats/mappings.json, which keeps only
 * links that someone published (MITRE, OWASP, NIST final and draft publications,
 * and OWASP's unreviewed community crosswalk), each with its status. Threat
 * catalogs are never assessed: Visua views them through the linked requirements.
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { ExternalReference, FrameworkGraph, Mapping, MappingSet, MappingStatus, RequirementNode } from "@visua/core";
import { CORPUS_DIR } from "../paths.ts";
import { normalize80053 } from "./csf.ts";

export const ATLAS_ID = "mitre-atlas";
export const OWASP_LLM_ID = "owasp-llm-top10";
export const OWASP_AGENTIC_ID = "owasp-agentic-top10";
export const AI_100_2_ID = "nist-ai-100-2";
export const THREAT_CATALOG_IDS = [ATLAS_ID, OWASP_LLM_ID, OWASP_AGENTIC_ID, AI_100_2_ID];

const THREATS_DIR = resolve(CORPUS_DIR, "ai-threats");
const read = <T>(file: string): T | undefined => (existsSync(file) ? (JSON.parse(readFileSync(file, "utf8")) as T) : undefined);
const oneLine = (s: string) => s.replace(/\s+/g, " ").trim();
const paragraphs = (list: string[] | undefined, fallback: string) => (list?.length ? list : [fallback]).map(oneLine).join("\n\n");

// ---------------------------------------------------------------------------
// MITRE ATLAS
// ---------------------------------------------------------------------------

interface AtlasSource {
  source: { documentId: string; version: string; released: string };
  matrix: { tacticOrder: string[] };
  tactics: { id: string; name: string; description: string }[];
  techniques: { id: string; name: string; description: string; tactics: string[]; parent: string | null; maturity?: string; platforms?: string[] }[];
  mitigations: { id: string; name: string; description: string; categories?: string[]; lifecyclePhases?: string[] }[];
}

export const ATLAS_MITIGATIONS = "AML.MITIGATIONS";

function atlasGraph(dir: string): FrameworkGraph | undefined {
  const src = read<AtlasSource>(resolve(dir, "atlas.json"));
  if (!src) return undefined;
  const fw = ATLAS_ID;
  const doc = src.source.documentId;
  const order = new Map(src.matrix.tacticOrder.map((id, i) => [id, i]));
  const rank = (id: string) => order.get(id) ?? Number.MAX_SAFE_INTEGER;
  const tactics = [...src.tactics].sort((a, b) => rank(a.id) - rank(b.id));
  const parents = src.techniques.filter((t) => !t.parent);
  const subs = src.techniques.filter((t) => t.parent);
  const nodes: RequirementNode[] = [];
  for (const [i, t] of tactics.entries()) {
    nodes.push({ id: `${fw}:${t.id}`, frameworkId: fw, code: t.id, kind: "tactic", parentId: null, depth: 0, order: i, title: t.name, text: oneLine(t.description), assessable: false, citation: { documentId: doc, locator: t.id }, attributes: { label: t.name } });
  }
  // A technique can serve several tactics: the tree places it under the first in matrix
  // order, and `tactics` keeps them all (the matrix view shows it in every column).
  for (const [i, t] of parents.entries()) {
    const tacticIds = [...t.tactics].sort((a, b) => rank(a) - rank(b));
    nodes.push({
      id: `${fw}:${t.id}`,
      frameworkId: fw,
      code: t.id,
      kind: "technique",
      parentId: tacticIds[0] ? `${fw}:${tacticIds[0]}` : null,
      depth: 1,
      order: i,
      title: t.name,
      text: oneLine(t.description),
      assessable: true,
      citation: { documentId: doc, locator: t.id },
      attributes: { label: t.id.replace("AML.", ""), tactics: tacticIds.map((id) => `${fw}:${id}`), maturity: t.maturity, platforms: t.platforms },
    });
  }
  for (const [i, t] of subs.entries()) {
    nodes.push({
      id: `${fw}:${t.id}`,
      frameworkId: fw,
      code: t.id,
      kind: "sub-technique",
      parentId: `${fw}:${t.parent}`,
      depth: 2,
      order: i,
      title: t.name,
      text: oneLine(t.description),
      assessable: true,
      citation: { documentId: doc, locator: t.id },
      attributes: { label: t.id.replace("AML.", ""), tactics: t.tactics.map((id) => `${fw}:${id}`), maturity: t.maturity, platforms: t.platforms },
    });
  }
  nodes.push({
    id: `${fw}:${ATLAS_MITIGATIONS}`,
    frameworkId: fw,
    code: ATLAS_MITIGATIONS,
    kind: "mitigation-group",
    parentId: null,
    depth: 0,
    order: tactics.length,
    title: "Mitigations",
    text: `The ${src.mitigations.length} ATLAS mitigations: security concepts and classes of technologies that can prevent a technique or sub-technique from succeeding.`,
    assessable: false,
    citation: { documentId: doc, locator: "mitigations" },
    attributes: { label: "Mitigations" },
  });
  for (const [i, m] of src.mitigations.entries()) {
    nodes.push({
      id: `${fw}:${m.id}`,
      frameworkId: fw,
      code: m.id,
      kind: "mitigation",
      parentId: `${fw}:${ATLAS_MITIGATIONS}`,
      depth: 1,
      order: i,
      title: m.name,
      text: oneLine(m.description),
      assessable: false,
      citation: { documentId: doc, locator: m.id },
      attributes: { label: m.id.replace("AML.", ""), categories: m.categories, lifecyclePhases: m.lifecyclePhases },
    });
  }
  return {
    framework: {
      id: fw,
      family: "threat",
      shortName: "MITRE ATLAS",
      name: "MITRE ATLAS (Adversarial Threat Landscape for Artificial-Intelligence Systems)",
      publisher: "The MITRE Corporation",
      version: src.source.version,
      published: src.source.released,
      description: `Adversary tactics and techniques against AI systems, from real-world observations and red-team demonstrations: ${tactics.length} tactics, ${parents.length} techniques, ${subs.length} sub-techniques and ${src.mitigations.length} mitigations.`,
      levels: [
        { kind: "tactic", label: "Tactic", pluralLabel: "Tactics" },
        { kind: "technique", label: "Technique", pluralLabel: "Techniques" },
        { kind: "sub-technique", label: "Sub-technique", pluralLabel: "Sub-techniques" },
      ],
      assessableKind: "technique",
      sources: [{ documentId: doc }],
      unitLabel: "technique",
      unitLabelPlural: "techniques",
      contentNotice: `MITRE ATLAS™ data ${src.source.version} © 2021–2026 The MITRE Corporation, used under the Apache License 2.0 (corpus/ai-threats/mitre-atlas/LICENSE). Modified by Visua: restructured into a framework graph; text unchanged. MITRE ATLAS is a trademark of The MITRE Corporation.`,
    },
    nodes,
  };
}

// ---------------------------------------------------------------------------
// OWASP Top 10s
// ---------------------------------------------------------------------------

interface OwaspStrategy {
  label: string;
  title?: string;
  text: string;
  page?: number;
}

interface OwaspRisk {
  id: string;
  edition: string;
  key: string;
  title: string;
  description: string;
  descriptionParagraphs?: string[];
  preventionIntro?: string[];
  preventionStrategies?: OwaspStrategy[];
  page?: number;
  pageEnd?: number;
  previousEdition?: { key: string; basis: string } | null;
}

interface OwaspLicense {
  license: string;
  licenseUrl: string;
  attribution: string;
  changes: string;
}

interface OwaspLlmSource {
  source: OwaspLicense & { catalog: string; currentEdition: string; editions: { edition: string; status: string; documentId: string; title: string; released: string }[] };
  risks: OwaspRisk[];
}

interface OwaspAgenticSource {
  source: OwaspLicense & { catalog: string; edition: string; released: string; documentId: string };
  risks: OwaspRisk[];
}

/** Node codes cannot contain ":" — the current edition keeps the bare id ("LLM01"), older ones gain the year ("LLM01-2025"). */
export const owaspLlmCode = (key: string, current: string) => {
  const [id, edition] = key.split(":");
  return !edition || edition === current ? id! : `${id}-${edition}`;
};

const owaspNotice = (s: OwaspLicense) => `${s.attribution} ${s.changes}`;

const owaspRiskNode = (fw: string, code: string, parentId: string, order: number, r: OwaspRisk, documentId: string, extra: Record<string, unknown>): RequirementNode => ({
  id: `${fw}:${code}`,
  frameworkId: fw,
  code,
  kind: "risk",
  parentId,
  depth: 1,
  order,
  title: r.title,
  text: paragraphs(r.descriptionParagraphs, r.description),
  assessable: true,
  citation: { documentId, locator: r.key, page: r.page },
  attributes: {
    label: r.key,
    key: r.key,
    edition: r.edition,
    pageEnd: r.pageEnd,
    preventionIntro: r.preventionIntro?.map(oneLine),
    preventionStrategies: (r.preventionStrategies ?? []).map((p) => ({ label: p.label, title: p.title, text: oneLine(p.text), page: p.page })),
    ...extra,
  },
});

function owaspLlmGraph(dir: string): FrameworkGraph | undefined {
  const src = read<OwaspLlmSource>(resolve(dir, "owasp-llm-top10.json"));
  if (!src) return undefined;
  const fw = OWASP_LLM_ID;
  const current = src.source.currentEdition;
  const editions = [...src.source.editions].sort((a, b) => b.edition.localeCompare(a.edition));
  // Edition lineage in both directions: 2026 entries name their 2025 predecessor.
  const next = new Map<string, string>();
  for (const r of src.risks) if (r.previousEdition) next.set(r.previousEdition.key, r.key);
  const nodes: RequirementNode[] = [];
  for (const [ei, e] of editions.entries()) {
    const root = `${fw}:EDITION-${e.edition}`;
    const isCurrent = e.edition === current;
    nodes.push({
      id: root,
      frameworkId: fw,
      code: `EDITION-${e.edition}`,
      kind: "edition",
      parentId: null,
      depth: 0,
      order: ei,
      title: isCurrent ? e.title : `${e.title} (superseded)`,
      text: `${e.title}, released ${e.released}.${isCurrent ? "" : ` Superseded by the ${current} edition; kept because other publications cite its identifiers.`}`,
      assessable: false,
      citation: { documentId: e.documentId },
      attributes: { label: e.edition, edition: e.edition, status: isCurrent ? "current" : "superseded" },
    });
    for (const [i, r] of src.risks.filter((x) => x.edition === e.edition).entries()) {
      const prev = r.previousEdition;
      const later = next.get(r.key);
      const node = owaspRiskNode(fw, owaspLlmCode(r.key, current), root, i, r, e.documentId, {
        status: isCurrent ? "current" : "superseded",
        previousEdition: prev ? { key: prev.key, nodeId: `${fw}:${owaspLlmCode(prev.key, current)}`, basis: prev.basis } : undefined,
        nextEdition: later ? { key: later, nodeId: `${fw}:${owaspLlmCode(later, current)}` } : undefined,
      });
      // Superseded entries stay for traceability but are not units of the current catalog.
      node.assessable = isCurrent;
      nodes.push(node);
    }
  }
  const cur = editions.find((e) => e.edition === current)!;
  const older = editions.filter((e) => e.edition !== current).map((e) => e.edition);
  return {
    framework: {
      id: fw,
      family: "threat",
      shortName: "OWASP LLM Top 10",
      name: "OWASP Top 10 for LLM Applications",
      publisher: "OWASP GenAI Security Project",
      version: cur.edition,
      published: cur.released,
      description: `The ten most critical security risks of applications built on large language models (${cur.edition} edition${older.length ? `; the ${older.join(", ")} edition is kept because other publications cite it` : ""}).`,
      levels: [
        { kind: "edition", label: "Edition", pluralLabel: "Editions" },
        { kind: "risk", label: "Risk", pluralLabel: "Risks" },
      ],
      assessableKind: "risk",
      sources: editions.map((e) => ({ documentId: e.documentId })),
      unitLabel: "risk",
      unitLabelPlural: "risks",
      contentNotice: owaspNotice(src.source),
    },
    nodes,
  };
}

function owaspAgenticGraph(dir: string): FrameworkGraph | undefined {
  const src = read<OwaspAgenticSource>(resolve(dir, "owasp-agentic-top10.json"));
  if (!src) return undefined;
  const fw = OWASP_AGENTIC_ID;
  const doc = src.source.documentId;
  const root = `${fw}:EDITION-${src.source.edition}`;
  const nodes: RequirementNode[] = [
    {
      id: root,
      frameworkId: fw,
      code: `EDITION-${src.source.edition}`,
      kind: "edition",
      parentId: null,
      depth: 0,
      order: 0,
      title: `${src.source.catalog} ${src.source.edition}`,
      text: `${src.source.catalog} ${src.source.edition}, released ${src.source.released}.`,
      assessable: false,
      citation: { documentId: doc },
      attributes: { label: src.source.edition, edition: src.source.edition, status: "current" },
    },
    ...src.risks.map((r, i) => owaspRiskNode(fw, r.id, root, i, r, doc, { status: "current" })),
  ];
  return {
    framework: {
      id: fw,
      family: "threat",
      shortName: "OWASP Agentic Top 10",
      name: "OWASP Top 10 for Agentic Applications",
      publisher: "OWASP GenAI Security Project (Agentic Security Initiative)",
      version: src.source.edition,
      published: src.source.released,
      description: "The ten highest-impact security risks of autonomous, tool-using AI agents.",
      levels: [
        { kind: "edition", label: "Edition", pluralLabel: "Editions" },
        { kind: "risk", label: "Risk", pluralLabel: "Risks" },
      ],
      assessableKind: "risk",
      sources: [{ documentId: doc }],
      unitLabel: "risk",
      unitLabelPlural: "risks",
      contentNotice: owaspNotice(src.source),
    },
    nodes,
  };
}

// ---------------------------------------------------------------------------
// NIST AI 100-2 E2025
// ---------------------------------------------------------------------------

interface Ai1002Source {
  source: { publication: { documentId: string; identifier: string; title: string; published: string } };
  objectives: { id: string; name: string; description: string; taxonomies: string[] }[];
  attacks: {
    id: string;
    name: string;
    objectives: { taxonomy: string; objective: string }[];
    taxonomies: string[];
    description: string;
    definitions?: { section: string; sectionTitle?: string; page: number; text: string; taxonomy: string }[];
  }[];
}

function ai1002Graph(dir: string): FrameworkGraph | undefined {
  const src = read<Ai1002Source>(resolve(dir, "nist-ai-100-2.json"));
  if (!src) return undefined;
  const fw = AI_100_2_ID;
  const pub = src.source.publication;
  const nodes: RequirementNode[] = [];
  for (const [i, o] of src.objectives.entries()) {
    nodes.push({ id: `${fw}:${o.id}`, frameworkId: fw, code: o.id, kind: "objective", parentId: null, depth: 0, order: i, title: o.name, text: oneLine(o.description), assessable: false, citation: { documentId: pub.documentId, locator: o.id }, attributes: { label: o.name, taxonomies: o.taxonomies } });
  }
  for (const [i, a] of src.attacks.entries()) {
    const def = a.definitions?.[0];
    nodes.push({
      id: `${fw}:${a.id}`,
      frameworkId: fw,
      code: a.id,
      kind: "attack",
      parentId: a.objectives[0] ? `${fw}:${a.objectives[0].objective}` : null,
      depth: 1,
      order: i,
      title: a.name,
      text: oneLine(def?.text ?? a.description),
      assessable: true,
      citation: { documentId: pub.documentId, locator: def ? `Section ${def.section}` : a.id, page: def?.page },
      attributes: {
        label: a.id,
        taxonomies: a.taxonomies,
        objectives: [...new Set(a.objectives.map((o) => `${fw}:${o.objective}`))],
        definitions: (a.definitions ?? []).map((d) => ({ section: d.section, title: d.sectionTitle, taxonomy: d.taxonomy, page: d.page })),
      },
    });
  }
  return {
    framework: {
      id: fw,
      family: "threat",
      shortName: "NIST AI 100-2",
      name: `${pub.identifier}: ${pub.title}`,
      publisher: "National Institute of Standards and Technology",
      version: "E2025",
      published: pub.published,
      description: `NIST's taxonomy of adversarial machine learning: ${src.attacks.length} attacks on predictive and generative AI, grouped by the attacker's objective.`,
      levels: [
        { kind: "objective", label: "Objective", pluralLabel: "Objectives" },
        { kind: "attack", label: "Attack", pluralLabel: "Attacks" },
      ],
      assessableKind: "attack",
      sources: [{ documentId: pub.documentId }],
      unitLabel: "attack",
      unitLabelPlural: "attacks",
    },
    nodes,
  };
}

export function ingestThreatCatalogs(dir = THREATS_DIR): FrameworkGraph[] {
  return [atlasGraph(dir), owaspLlmGraph(dir), owaspAgenticGraph(dir), ai1002Graph(dir)].filter((g): g is FrameworkGraph => !!g);
}

// ---------------------------------------------------------------------------
// Links
// ---------------------------------------------------------------------------

interface LinkEnd {
  scheme: string;
  id: string | null;
  label?: string;
  url?: string;
}

interface LinkRow {
  source: LinkEnd;
  target: LinkEnd;
  relationship: string;
  strength?: string;
  authority: string;
  status: MappingStatus;
  documentId: string;
  locator?: string;
  page?: number;
  text?: string;
}

interface LinkSource {
  authorities: Record<string, { name: string; publisher: string; status: string }>;
  mappings: LinkRow[];
}

/** Catalogs that appear only as link targets: shown as references, not modeled. */
export const EXTERNAL_SCHEMES: Record<string, string> = {
  "mitre-attack": "MITRE ATT&CK",
  cwe: "CWE",
  "csa-aicm": "CSA AI Controls Matrix",
  "owasp-aivss": "OWASP AIVSS",
  "owasp-genai-data-security": "OWASP GenAI Data Security Risks",
  "owasp-agentic-threats": "OWASP Agentic AI Threats and Mitigations",
  "owasp-ml-top10": "OWASP Machine Learning Security Top 10",
  "owasp-api-top10": "OWASP API Security Top 10",
  "nist-ai-600-1": "NIST AI 600-1 risk",
};

const RELATIONSHIP_LABELS: Record<string, string> = {
  "attack-reference": "ATT&CK reference",
  "related-framework-mapping": "related framework mapping",
  "example-informative-reference": "example informative reference",
};

/** Short names of the publishing authorities, for mapping-set titles and badges. */
const AUTHORITY_NAMES: Record<string, string> = {
  "mitre-atlas-2026.09": "MITRE ATLAS 2026.09",
  "owasp-llm-top10-2026": "OWASP LLM Top 10 2026, Appendix A",
  "owasp-llm-top10-2025": "OWASP LLM Top 10 2025",
  "owasp-agentic-top10-2026": "OWASP Agentic Top 10 2026, Appendix A",
  "nist-ir-8596-iprd": "NIST IR 8596 (Cyber AI Profile, draft)",
  "nist-cosais-outline": "NIST COSAiS outline (draft)",
  "nist-ai-100-2e2025": "NIST AI 100-2 E2025",
  "owasp-genai-crosswalk": "OWASP GenAI Security Crosswalk (unreviewed)",
};

export interface ThreatLinkResult {
  sets: MappingSet[];
  /** External references by node id. */
  external: Map<string, ExternalReference[]>;
  kept: number;
  dropped: Record<string, number>;
}

/** Published links between threats and requirements (and between threat catalogs): one mapping set per authority and pair of frameworks. */
export function threatLinks(exists: (nodeId: string) => boolean, dir = THREATS_DIR): ThreatLinkResult {
  const src = read<LinkSource>(resolve(dir, "mappings.json"));
  const current = read<OwaspLlmSource>(resolve(dir, "owasp-llm-top10.json"))?.source.currentEdition ?? "";
  const result: ThreatLinkResult = { sets: [], external: new Map(), kept: 0, dropped: {} };
  if (!src) return result;
  const nodeOf = (end: LinkEnd): string | undefined => {
    if (!end.id) return undefined;
    switch (end.scheme) {
      case "atlas":
        return `${ATLAS_ID}:${end.id}`;
      case "owasp-llm-top10":
        return `${OWASP_LLM_ID}:${owaspLlmCode(end.id, current)}`;
      case "owasp-agentic-top10":
        return `${OWASP_AGENTIC_ID}:${end.id}`;
      case "nist-ai-100-2":
        return `${AI_100_2_ID}:${end.id}`;
      case "nist-csf-2.0":
        return `nist-csf-2.0:${end.id}`;
      case "nist-ai-rmf":
        return `nist-ai-rmf:${end.id}`;
      case "nist-sp-800-53-r5":
        return `nist-sp-800-53-r5:${normalize80053(end.id)}`;
      default:
        return undefined;
    }
  };
  const drop = (why: string) => (result.dropped[why] = (result.dropped[why] ?? 0) + 1);
  const sets = new Map<string, MappingSet>();
  for (const row of src.mappings) {
    const authority = AUTHORITY_NAMES[row.authority] ?? src.authorities[row.authority]?.name ?? row.authority;
    const label = RELATIONSHIP_LABELS[row.relationship] ?? row.relationship.replace(/-/g, " ");
    const from = nodeOf(row.source);
    if (!from || !exists(from)) {
      drop(from ? `unknown source ${from}` : `unmodeled source scheme ${row.source.scheme}`);
      continue;
    }
    const schemeName = EXTERNAL_SCHEMES[row.target.scheme];
    if (schemeName) {
      const refs = result.external.get(from) ?? [];
      if (!refs.some((r) => r.scheme === row.target.scheme && r.id === row.target.id && r.label === row.target.label && r.authority === authority)) {
        refs.push({
          scheme: row.target.scheme,
          schemeName,
          id: row.target.id,
          ...(row.target.label ? { label: row.target.label } : {}),
          ...(row.target.url ? { url: row.target.url } : {}),
          relationship: label,
          ...(row.strength ? { strength: row.strength } : {}),
          authority,
          status: row.status,
          citation: { documentId: row.documentId, locator: row.locator, page: row.page },
        });
        result.external.set(from, refs);
      }
      continue;
    }
    const to = nodeOf(row.target);
    if (!to || !exists(to)) {
      drop(to ? `unknown target ${to}` : `unmodeled target scheme ${row.target.scheme}`);
      continue;
    }
    const sourceFramework = from.slice(0, from.indexOf(":"));
    const targetFramework = to.slice(0, to.indexOf(":"));
    const id = `threat--${row.authority}--${sourceFramework}--${targetFramework}`;
    let set = sets.get(id);
    if (!set) {
      set = { id, title: authority, sourceFramework, targetFramework, authority, status: row.status, mappings: [] };
      sets.set(id, set);
    }
    if (set.mappings.some((m) => m.source === from && m.target === to)) continue;
    const mapping: Mapping = {
      source: from,
      target: to,
      relationship: "related-to",
      origin: { documentId: row.documentId, locator: row.locator, page: row.page, authority },
      label,
      status: row.status,
      ...(row.strength ? { strength: row.strength } : {}),
      ...(row.relationship === "mitigates" && row.text ? { note: oneLine(row.text) } : {}),
    };
    set.mappings.push(mapping);
    result.kept++;
  }
  result.sets = [...sets.values()].sort((a, b) => a.id.localeCompare(b.id));
  return result;
}
