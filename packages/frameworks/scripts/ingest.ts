/**
 * Ingestion pipeline: official corpus → normalized Visua data.
 *
 *   corpus/<framework>/…  ──►  packages/frameworks/data/<framework-id>.json
 *                              packages/frameworks/data/mappings/*.json
 *                              packages/frameworks/data/threat-mappings/*.json
 *                              packages/frameworks/data/overlays/*.json
 *                              packages/frameworks/data/chunks/<corpus>.json
 *                              packages/frameworks/data/_ingest-report.json
 *
 * Run with `pnpm ingest`. Deterministic: same corpus in, same data out.
 */
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import type { FrameworkGraph, FrameworkOverlay, MappingSet, RequirementNode } from "@visua/core";
import { loadCorpusManifests, type CorpusDocument } from "../src/index.ts";
import { CORPUS_DIR, DATA_DIR } from "../src/paths.ts";
import type { CorpusChunk } from "../src/search.ts";
import { csfMappingSets, ingestCsf } from "../src/ingest/csf.ts";
import { chunkPages, pdfPages } from "../src/ingest/pdf.ts";
import { ingestRmf, rmfToControls } from "../src/ingest/rmf.ts";
import { ingest80053 } from "../src/ingest/sp80053.ts";
import { ingestAiRmf } from "../src/ingest/ai-rmf.ts";
import { ingestCosais, ingestCyberAiProfile } from "../src/ingest/ai-overlays.ts";
import { ingestStateLaws } from "../src/ingest/state-laws.ts";
import { ingestThreatCatalogs, threatLinks } from "../src/ingest/threats.ts";
import { buildTscGraph } from "../src/ingest/tsc.ts";
import { aicpaTscMappingSets } from "../src/ingest/tsc-mappings.ts";

const started = Date.now();
const log = (msg: string) => console.log(`[ingest ${((Date.now() - started) / 1000).toFixed(1)}s] ${msg}`);

mkdirSync(resolve(DATA_DIR, "mappings"), { recursive: true });

const graphs: FrameworkGraph[] = [];
const csf = await ingestCsf();
graphs.push(csf.graph);
log(`NIST CSF 2.0: ${csf.graph.nodes.length} nodes (${csf.graph.nodes.filter((n) => n.assessable).length} outcomes)`);

const sp80053 = await ingest80053();
graphs.push(sp80053);
log(`SP 800-53 Rev. 5: ${sp80053.nodes.length} nodes (${sp80053.nodes.filter((n) => n.assessable).length} controls + enhancements)`);

const rmf = ingestRmf();
graphs.push(rmf.graph);
log(`NIST RMF: ${rmf.graph.nodes.length} nodes (${rmf.graph.nodes.filter((n) => n.assessable).length} tasks)`);

const aiRmf = ingestAiRmf();
if (aiRmf) {
  graphs.push(aiRmf);
  const actions = aiRmf.nodes.reduce((n, x) => n + ((x.attributes?.["profileActions"] as unknown[]) ?? []).length, 0);
  log(`NIST AI RMF: ${aiRmf.nodes.length} nodes (${aiRmf.nodes.filter((n) => n.assessable).length} outcomes; ${aiRmf.profiles?.[0]?.risks.length ?? 0} GAI risks, ${actions} Generative AI Profile actions)`);
} else {
  log("NIST AI RMF: corpus not available — skipped");
}

const laws = ingestStateLaws();
if (laws) {
  graphs.push(laws);
  const count = (kind: string) => laws.nodes.filter((n) => n.kind === kind).length;
  log(`U.S. state AI laws: ${count("jurisdiction")} jurisdictions, ${count("law")} laws, ${count("obligation")} obligations`);
} else {
  log("U.S. state AI laws: corpus not available — skipped");
}

// Threat catalogs (never assessed; viewed through the requirements linked to them).
const threatGraphs = ingestThreatCatalogs();
for (const g of threatGraphs) {
  graphs.push(g);
  const byKind = g.nodes.reduce<Record<string, number>>((acc, n) => ((acc[n.kind] = (acc[n.kind] ?? 0) + 1), acc), {});
  log(`${g.framework.shortName} ${g.framework.version}: ${Object.entries(byKind).map(([k, v]) => `${v} ${k}`).join(", ")}`);
}
if (!threatGraphs.length) log("AI threat catalogs: corpus not available — skipped");

const tsc = buildTscGraph();
graphs.push(tsc);
const tscLicensed = tsc.nodes.filter((n) => n.attributes?.["licensed"] === true).length;
log(`AICPA TSC (SOC 2): ${tsc.nodes.length} nodes (${tsc.nodes.filter((n) => n.assessable).length} criteria; ${tscLicensed ? `official text from the local licensed copy for ${tscLicensed}` : "Visua skeleton — no licensed local copy"})`);

const ids = new Set(graphs.flatMap((g) => g.nodes.map((n) => n.id)));
const exists = (id: string) => ids.has(id);

// Drop dangling cross-framework node links in informative references.
for (const g of graphs) for (const n of g.nodes) for (const r of n.references ?? []) if (r.nodeId && !exists(r.nodeId)) delete r.nodeId;

const aicpa = await aicpaTscMappingSets(exists);
for (const [k, v] of Object.entries(aicpa.report)) log(`  ${k}: ${v}`);
const mappingSets: MappingSet[] = [...csfMappingSets(csf.crosswalkRefs, exists), rmfToControls(exists), ...aicpa.sets];
for (const set of mappingSets) {
  writeFileSync(resolve(DATA_DIR, "mappings", `${set.id}.json`), JSON.stringify(set, null, 1));
  log(`mapping ${set.id}: ${set.mappings.length}`);
}

// Threat links: one set per publishing authority, labeled with its status (final, draft,
// unreviewed, superseded). Links to catalogs Visua does not model become node references.
const threats = threatLinks(exists);
rmSync(resolve(DATA_DIR, "threat-mappings"), { recursive: true, force: true });
if (threats.sets.length) mkdirSync(resolve(DATA_DIR, "threat-mappings"), { recursive: true });
for (const set of threats.sets) {
  writeFileSync(resolve(DATA_DIR, "threat-mappings", `${set.id}.json`), JSON.stringify(set, null, 1));
  log(`threat links ${set.id} (${set.status}): ${set.mappings.length}`);
}
const nodeIndex = new Map(graphs.flatMap((g) => g.nodes.map((n) => [n.id, n] as const)));
for (const [nodeId, refs] of threats.external) {
  const node = nodeIndex.get(nodeId)!;
  node.attributes = { ...node.attributes, externalRefs: refs };
}
if (threatGraphs.length) {
  log(`threat links kept: ${threats.kept}; external references: ${[...threats.external.values()].reduce((n, r) => n + r.length, 0)}`);
  for (const [why, n] of Object.entries(threats.dropped)) log(`  dropped ${n}: ${why}`);
}

for (const g of graphs) writeFileSync(resolve(DATA_DIR, `${g.framework.id}.json`), JSON.stringify(g));

// Overlays: NIST drafts that specialize CSF 2.0 and SP 800-53 for AI systems.
mkdirSync(resolve(DATA_DIR, "overlays"), { recursive: true });
const overlays = [ingestCyberAiProfile(ids), ingestCosais(ids)].filter((o): o is FrameworkOverlay => !!o);
for (const o of overlays) {
  writeFileSync(resolve(DATA_DIR, "overlays", `${o.id}.json`), JSON.stringify(o));
  const priorities = o.lenses?.map((l) => `${l.short} ${[1, 2, 3].map((p) => o.entries.filter((e) => e.lenses?.[l.id]?.priority === p).length).join("/")}`).join(", ");
  log(`overlay ${o.id} (${o.status}) on ${o.frameworkId}: ${o.entries.length} entries${priorities ? `; priorities 1/2/3: ${priorities}` : ""}`);
}

// ---------------------------------------------------------------------------
// Corpus search index
// ---------------------------------------------------------------------------

const manifests = loadCorpusManifests();
const docs = new Map<string, CorpusDocument & { framework: string }>();
for (const m of manifests) for (const d of m.documents) docs.set(d.id, { ...d, framework: m.framework });

const chunks: CorpusChunk[] = [];

/** Structured chunks: one per requirement, citing its official source location. */
function nodeChunk(n: RequirementNode): CorpusChunk {
  const doc = docs.get(n.citation.documentId);
  const parts = [`${n.code}${n.title ? ` ${n.title}` : ""}: ${n.text}`];
  if (n.examples?.length) parts.push(`Implementation examples: ${n.examples.map((e) => e.text).join(" ")}`);
  const pof = n.attributes?.["pointsOfFocus"] as { title: string; text?: string }[] | undefined;
  if (pof?.length) parts.push(`Points of focus: ${pof.map((p) => `${p.title}. ${p.text ?? ""}`).join(" ")}`);
  const suggested = n.attributes?.["suggestedActions"] as string[] | undefined;
  if (suggested?.length) parts.push(`Suggested actions (AI RMF Playbook): ${suggested.join(" ")}`);
  const profileActions = n.attributes?.["profileActions"] as { id: string; text: string }[] | undefined;
  if (profileActions?.length) parts.push(`Generative AI Profile actions: ${profileActions.map((a) => `${a.id} ${a.text}`).join(" ")}`);
  const prevention = n.attributes?.["preventionStrategies"] as { title?: string; text: string }[] | undefined;
  if (prevention?.length) parts.push(`Prevention and mitigation strategies: ${prevention.map((p) => `${p.title ? `${p.title}. ` : ""}${p.text}`).join(" ")}`);
  if (n.guidance) parts.push(`Discussion: ${n.guidance.slice(0, 1600)}`);
  return {
    id: `node:${n.id}`,
    documentId: n.citation.documentId,
    documentTitle: doc?.title ?? n.citation.documentId,
    framework: doc?.framework ?? (n.frameworkId === "aicpa-tsc-2017" ? "aicpa-soc2" : n.frameworkId === "nist-csf-2.0" ? "nist-csf-2.0" : n.frameworkId === "nist-ai-rmf" ? "nist-ai-rmf" : "nist-rmf"),
    page: n.citation.page,
    locator: n.citation.locator ?? n.code,
    text: parts.join("\n"),
  };
}
for (const g of graphs) for (const n of g.nodes) if (n.text) chunks.push(nodeChunk(n));

/** Overlay entries are searchable too, always labeled with the draft's status. */
const nodeById = new Map(graphs.flatMap((g) => g.nodes.map((n) => [n.id, n] as const)));
for (const o of overlays) {
  const doc = docs.get(o.documentId);
  for (const e of o.entries) {
    const node = nodeById.get(e.nodeId);
    const parts = [`${o.shortName} (${o.identifier}, ${o.status}) for ${node?.code ?? e.nodeId}${node?.title ? ` ${node.title}` : ""}.`];
    if (e.general?.considerations) parts.push(`General considerations: ${e.general.considerations}`);
    for (const l of o.lenses ?? []) {
      const f = e.lenses?.[l.id];
      if (!f) continue;
      const level = o.priorityLevels?.find((p) => p.level === f.priority)?.label;
      parts.push(`${l.short}: proposed priority ${f.priority}${level ? ` (${level})` : ""}.${f.opportunities ? ` Opportunities: ${f.opportunities}` : ""}${f.considerations ? ` Considerations: ${f.considerations}` : ""}${f.references.length ? ` Example informative references: ${f.references.join("; ")}.` : ""}`);
    }
    if (e.control) {
      const c = e.control;
      parts.push(`Selected in the overlay${c.annotated ? " (annotated)" : c.proposedAdditional ? " (additional proposed control)" : ""}.${c.lifecyclePhases?.length ? ` AI lifecycle phases: ${c.lifecyclePhases.join(", ")}.` : ""}${c.assumptions ? ` Assumptions: ${c.assumptions}` : ""}`);
      for (const t of c.tailoringSections ?? []) parts.push(`${t.label}: ${t.text}`);
      if (c.attackIds?.length) parts.push(`NIST AI 100-2 attacks: ${c.attackIds.join(", ")}.`);
    }
    chunks.push({
      id: `overlay:${o.id}:${e.nodeId}`,
      documentId: o.documentId,
      documentTitle: doc?.title ?? o.title,
      framework: doc?.framework ?? "nist-ai-rmf",
      page: e.citation.page,
      locator: e.citation.locator ?? e.nodeId,
      text: parts.join("\n"),
    });
  }
}
log(`structured chunks: ${chunks.length}`);

const INCLUDED_ROLES = new Set(["core", "quick-start-guide", "categorization", "criteria", "description-criteria", "guide", "profile"]);
const EXCLUDED_DOCS = new Set([
  "csf-2-0-implementation-examples-pdf",
  "nist-sp-800-53r5",
  "nist-sp-800-53ar5",
  "nist-sp-800-60r2-iwd",
  // Superseded AICPA editions and red-lines: the current 2022 editions are indexed instead.
  "tsc-2017-rev-pof-2022-redlined",
  "tsc-2017-march-2020-updates",
  "tsc-2017-march-2020-updates-redlined",
  "tsc-2017-original-april-2017",
  "dc200-2018-original",
  "dc200a-2015-description-criteria",
]);
const isDraft = (d: CorpusDocument) => /draft|\(ipd\)|\(iprd\)|\(2pd\)|\(iwd\)/i.test(`${d.version ?? ""} ${d.identifier ?? ""}`) || /\/drafts\/|\.ipd\.|\.iprd\.|\.2pd\.|\.iwd\./.test(d.path);

let pdfCount = 0;
for (const d of docs.values()) {
  if (d.mediaType !== "application/pdf" || !INCLUDED_ROLES.has(d.role) || EXCLUDED_DOCS.has(d.id) || isDraft(d)) continue;
  const path = resolve(CORPUS_DIR, d.path);
  if (!existsSync(path)) continue;
  try {
    const pages = await pdfPages(path);
    const docChunks = chunkPages({ documentId: d.id, documentTitle: d.title, framework: d.framework }, pages);
    chunks.push(...docChunks);
    pdfCount++;
    log(`  ${d.id}: ${pages.length} pages → ${docChunks.length} chunks`);
  } catch (err) {
    log(`  ${d.id}: FAILED (${(err as Error).message})`);
  }
}
// One file per corpus: licensed corpora (AICPA) stay local and git-ignored.
mkdirSync(resolve(DATA_DIR, "chunks"), { recursive: true });
const byCorpus = new Map<string, CorpusChunk[]>();
for (const c of chunks) byCorpus.set(c.framework, [...(byCorpus.get(c.framework) ?? []), c]);
for (const [corpus, list] of byCorpus) {
  writeFileSync(resolve(DATA_DIR, "chunks", `${corpus}.json`), JSON.stringify(list));
  log(`  chunks/${corpus}.json: ${list.length}`);
}
if (existsSync(resolve(DATA_DIR, "corpus-chunks.json"))) rmSync(resolve(DATA_DIR, "corpus-chunks.json"));
log(`corpus index: ${chunks.length} chunks from ${pdfCount} PDFs + structured requirements`);

const report = {
  generatedAt: new Date().toISOString(),
  frameworks: graphs.map((g) => ({
    id: g.framework.id,
    nodes: g.nodes.length,
    assessable: g.nodes.filter((n) => n.assessable).length,
    byKind: g.nodes.reduce<Record<string, number>>((acc, n) => ((acc[n.kind] = (acc[n.kind] ?? 0) + 1), acc), {}),
  })),
  mappings: mappingSets.map((m) => ({ id: m.id, count: m.mappings.length, authority: m.authority })),
  threatMappings: threats.sets.map((m) => ({ id: m.id, count: m.mappings.length, authority: m.authority, status: m.status })),
  overlays: overlays.map((o) => ({ id: o.id, frameworkId: o.frameworkId, status: o.status, entries: o.entries.length })),
  corpus: { chunks: chunks.length, pdfDocuments: pdfCount, manifests: manifests.map((m) => ({ framework: m.framework, documents: m.documents.length })) },
  sources: manifests.flatMap((m) => m.documents.filter((d) => d.role === "machine-readable" || d.role === "criteria").map((d) => ({ id: d.id, sha256: d.sha256 }))),
};
writeFileSync(resolve(DATA_DIR, "_ingest-report.json"), JSON.stringify(report, null, 2));
log("done");

// Keep TypeScript happy about unused imports when optional corpora are absent.
void readFileSync;
