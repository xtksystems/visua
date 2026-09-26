/**
 * Runtime access to the ingested framework graphs, mapping sets, corpus
 * manifests and the corpus search index.
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { CrosswalkIndex, FrameworkIndex, type FrameworkGraph, type MappingSet } from "@visua/core";
import { CORPUS_DIR, DATA_DIR } from "./paths.ts";
import { CorpusSearch, type CorpusChunk } from "./search.ts";

export { CORPUS_DIR, DATA_DIR, REPO_ROOT } from "./paths.ts";
export { CorpusSearch, tokenize, bestQuote, type CorpusChunk, type SearchHit } from "./search.ts";

export interface CorpusDocument {
  id: string;
  title: string;
  identifier?: string;
  publisher: string;
  version?: string;
  published?: string;
  role: string;
  mediaType: string;
  path: string;
  url: string;
  landingPage?: string;
  sha256: string;
  bytes: number;
  license: string;
  notes?: string;
}

export interface CorpusManifest {
  framework: string;
  title: string;
  retrieved: string;
  documents: CorpusDocument[];
}

/** Order in which frameworks are presented (increasing complexity). */
export const FRAMEWORK_ORDER = ["nist-csf-2.0", "aicpa-tsc-2017", "nist-sp-800-53-r5", "nist-rmf"];

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, "utf8")) as T;
}

export function loadFrameworkGraphs(dataDir: string = DATA_DIR): FrameworkGraph[] {
  if (!existsSync(dataDir)) return [];
  const graphs = readdirSync(dataDir)
    .filter((f) => f.endsWith(".json") && !f.startsWith("corpus-") && !f.startsWith("_"))
    .map((f) => readJson<FrameworkGraph>(resolve(dataDir, f)))
    .filter((g) => g?.framework?.id && Array.isArray(g.nodes));
  return graphs.sort((a, b) => {
    const ia = FRAMEWORK_ORDER.indexOf(a.framework.id);
    const ib = FRAMEWORK_ORDER.indexOf(b.framework.id);
    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
  });
}

export function loadMappingSets(dataDir: string = DATA_DIR): MappingSet[] {
  const dir = resolve(dataDir, "mappings");
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .map((f) => readJson<MappingSet>(resolve(dir, f)));
}

export function loadCorpusChunks(dataDir: string = DATA_DIR): CorpusChunk[] {
  const path = resolve(dataDir, "corpus-chunks.json");
  return existsSync(path) ? readJson<CorpusChunk[]>(path) : [];
}

export function loadCorpusManifests(corpusDir: string = CORPUS_DIR): CorpusManifest[] {
  if (!existsSync(corpusDir)) return [];
  return readdirSync(corpusDir, { withFileTypes: true })
    .filter((d) => d.isDirectory() && existsSync(resolve(corpusDir, d.name, "manifest.json")))
    .map((d) => readJson<CorpusManifest>(resolve(corpusDir, d.name, "manifest.json")));
}

/** Everything the server and agents need, indexed once. */
export class FrameworkRegistry {
  readonly indexes = new Map<string, FrameworkIndex>();
  readonly crosswalk: CrosswalkIndex;
  readonly search: CorpusSearch;
  readonly documents = new Map<string, CorpusDocument & { framework: string }>();
  readonly manifests: CorpusManifest[];

  constructor(input: { graphs: FrameworkGraph[]; mappings: MappingSet[]; chunks: CorpusChunk[]; manifests: CorpusManifest[] }) {
    for (const g of input.graphs) this.indexes.set(g.framework.id, new FrameworkIndex(g));
    this.crosswalk = new CrosswalkIndex(input.mappings);
    this.search = new CorpusSearch(input.chunks);
    this.manifests = input.manifests;
    for (const m of input.manifests) for (const d of m.documents) this.documents.set(d.id, { ...d, framework: m.framework });
  }

  static load(): FrameworkRegistry {
    return new FrameworkRegistry({
      graphs: loadFrameworkGraphs(),
      mappings: loadMappingSets(),
      chunks: loadCorpusChunks(),
      manifests: loadCorpusManifests(),
    });
  }

  get frameworks() {
    return [...this.indexes.values()].map((i) => i.graph.framework);
  }

  framework(id: string): FrameworkIndex | undefined {
    return this.indexes.get(id);
  }

  /** Resolve a node by global id (`framework:code`) or by code across all frameworks. */
  node(idOrCode: string) {
    const i = idOrCode.lastIndexOf(":");
    if (i > 0) {
      const index = this.indexes.get(idOrCode.slice(0, i));
      const node = index?.byId.get(idOrCode);
      if (node) return node;
    }
    for (const index of this.indexes.values()) {
      const node = index.get(idOrCode);
      if (node) return node;
    }
    return undefined;
  }

  documentTitle(documentId: string): string {
    return this.documents.get(documentId)?.title ?? documentId;
  }
}
