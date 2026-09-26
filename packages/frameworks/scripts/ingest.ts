/**
 * Ingestion pipeline: official corpus → normalized Visua data.
 *
 *   corpus/<framework>/…  ──►  packages/frameworks/data/<framework-id>.json
 *                              packages/frameworks/data/mappings/*.json
 *                              packages/frameworks/data/corpus-chunks.json
 *                              packages/frameworks/data/_ingest-report.json
 *
 * Run with `pnpm ingest`. Deterministic: same corpus in, same data out.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import type { FrameworkGraph, MappingSet, RequirementNode } from "@visua/core";
import { loadCorpusManifests, type CorpusDocument } from "../src/index.ts";
import { CORPUS_DIR, DATA_DIR } from "../src/paths.ts";
import type { CorpusChunk } from "../src/search.ts";
import { csfMappingSets, ingestCsf } from "../src/ingest/csf.ts";
import { chunkPages, pdfPages } from "../src/ingest/pdf.ts";
import { ingestRmf, rmfToControls } from "../src/ingest/rmf.ts";
import { ingest80053 } from "../src/ingest/sp80053.ts";
import { ingestTsc, tscMappingSets } from "../src/ingest/tsc.ts";

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

const tsc = await ingestTsc();
if (tsc) {
  graphs.push(tsc.graph);
  log(`AICPA TSC (SOC 2): ${tsc.graph.nodes.length} nodes (${tsc.graph.nodes.filter((n) => n.assessable).length} criteria)`);
} else {
  log("AICPA TSC (SOC 2): corpus not available — skipped");
}

const ids = new Set(graphs.flatMap((g) => g.nodes.map((n) => n.id)));
const exists = (id: string) => ids.has(id);

// Drop dangling cross-framework node links in informative references.
for (const g of graphs) for (const n of g.nodes) for (const r of n.references ?? []) if (r.nodeId && !exists(r.nodeId)) delete r.nodeId;

const mappingSets: MappingSet[] = [...csfMappingSets(csf.crosswalkRefs, exists), rmfToControls(exists), ...(tsc ? tscMappingSets(tsc, exists) : [])];
for (const set of mappingSets) {
  writeFileSync(resolve(DATA_DIR, "mappings", `${set.id}.json`), JSON.stringify(set, null, 1));
  log(`mapping ${set.id}: ${set.mappings.length}`);
}

for (const g of graphs) writeFileSync(resolve(DATA_DIR, `${g.framework.id}.json`), JSON.stringify(g));

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
  if (n.guidance) parts.push(`Discussion: ${n.guidance.slice(0, 1600)}`);
  return {
    id: `node:${n.id}`,
    documentId: n.citation.documentId,
    documentTitle: doc?.title ?? n.citation.documentId,
    framework: doc?.framework ?? (n.frameworkId === "aicpa-tsc-2017" ? "aicpa-soc2" : n.frameworkId === "nist-csf-2.0" ? "nist-csf-2.0" : "nist-rmf"),
    page: n.citation.page,
    locator: n.citation.locator ?? n.code,
    text: parts.join("\n"),
  };
}
for (const g of graphs) for (const n of g.nodes) if (n.text) chunks.push(nodeChunk(n));
log(`structured chunks: ${chunks.length}`);

const INCLUDED_ROLES = new Set(["core", "quick-start-guide", "categorization", "criteria", "description-criteria", "guide", "profile"]);
const EXCLUDED_DOCS = new Set(["csf-2-0-implementation-examples-pdf", "nist-sp-800-53r5", "nist-sp-800-53ar5", "nist-sp-800-60r2-iwd"]);
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
writeFileSync(resolve(DATA_DIR, "corpus-chunks.json"), JSON.stringify(chunks));
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
  corpus: { chunks: chunks.length, pdfDocuments: pdfCount, manifests: manifests.map((m) => ({ framework: m.framework, documents: m.documents.length })) },
  sources: manifests.flatMap((m) => m.documents.filter((d) => d.role === "machine-readable" || d.role === "criteria").map((d) => ({ id: d.id, sha256: d.sha256 }))),
};
writeFileSync(resolve(DATA_DIR, "_ingest-report.json"), JSON.stringify(report, null, 2));
log("done");

// Keep TypeScript happy about unused imports when optional corpora are absent.
void readFileSync;
