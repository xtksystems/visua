/**
 * Citation-ready lexical retrieval (Okapi BM25) over the local official corpus.
 *
 * Chunks are produced at ingest time from the official PDFs / machine-readable
 * sources and carry document id, title, locator and page so every agent answer
 * can cite exactly where a statement comes from. BM25 needs no network, no
 * embeddings service and is fully deterministic — ideal for audit-grade work.
 */

export interface CorpusChunk {
  /** Stable id: `${documentId}#p${page}-${n}` */
  id: string;
  documentId: string;
  documentTitle: string;
  framework: string;
  page?: number;
  locator?: string;
  text: string;
}

export interface SearchHit {
  chunk: CorpusChunk;
  score: number;
  /** Best matching sentence(s) for display as a quote. */
  quote: string;
}

const STOPWORDS = new Set(
  (
    "a an and are as at be been but by can could did do does for from had has have how i if in into is it its may " +
    "might must no not of on or our shall should so such than that the their them then there these they this those " +
    "to under up upon was we were what when where which while who whom why will with within without would you your " +
    "also any each other more most all both only same own too very s t just over between through during before after"
  ).split(/\s+/),
);

/** Light stemmer: strips common English suffixes so "controls" ≈ "control". */
export function stem(token: string): string {
  if (token.length <= 4) return token;
  for (const suffix of ["ations", "ation", "ments", "ment", "ities", "ity", "ings", "ing", "ies", "ed", "es", "s"]) {
    if (token.endsWith(suffix) && token.length - suffix.length >= 4) {
      return suffix === "ies" ? token.slice(0, -3) + "y" : token.slice(0, -suffix.length);
    }
  }
  return token;
}

export function tokenize(text: string): string[] {
  const out: string[] = [];
  const raw = text.toLowerCase().match(/[a-z0-9][a-z0-9.\-()]*[a-z0-9)]|[a-z0-9]/g) ?? [];
  for (const t of raw) {
    // Keep identifiers such as "gv.oc-01", "ac-2(1)", "cc6.1" intact, plus their parts.
    if (/[.\-()]/.test(t)) {
      out.push(t);
      for (const part of t.split(/[.\-()]+/)) if (part && !STOPWORDS.has(part)) out.push(stem(part));
      continue;
    }
    if (STOPWORDS.has(t)) continue;
    out.push(stem(t));
  }
  return out;
}

export class CorpusSearch {
  private readonly chunks: CorpusChunk[];
  private readonly docTerms: Map<string, number>[] = [];
  private readonly docLength: number[] = [];
  private readonly df = new Map<string, number>();
  private readonly postings = new Map<string, number[]>();
  private readonly avgLength: number;
  private readonly k1 = 1.4;
  private readonly b = 0.72;

  constructor(chunks: CorpusChunk[]) {
    this.chunks = chunks;
    let total = 0;
    chunks.forEach((chunk, i) => {
      const terms = tokenize(`${chunk.locator ?? ""} ${chunk.text}`);
      const tf = new Map<string, number>();
      for (const t of terms) tf.set(t, (tf.get(t) ?? 0) + 1);
      this.docTerms.push(tf);
      this.docLength.push(terms.length);
      total += terms.length;
      for (const t of tf.keys()) {
        this.df.set(t, (this.df.get(t) ?? 0) + 1);
        const list = this.postings.get(t);
        if (list) list.push(i);
        else this.postings.set(t, [i]);
      }
    });
    this.avgLength = chunks.length ? total / chunks.length : 1;
  }

  get size(): number {
    return this.chunks.length;
  }

  search(query: string, opts: { limit?: number; framework?: string; documentId?: string } = {}): SearchHit[] {
    const limit = opts.limit ?? 6;
    const terms = [...new Set(tokenize(query))];
    if (!terms.length) return [];
    const n = this.chunks.length;
    const scores = new Map<number, number>();
    for (const term of terms) {
      const posting = this.postings.get(term);
      if (!posting) continue;
      const df = this.df.get(term) ?? 0;
      const idf = Math.log(1 + (n - df + 0.5) / (df + 0.5));
      for (const i of posting) {
        const chunk = this.chunks[i]!;
        if (opts.framework && chunk.framework !== opts.framework) continue;
        if (opts.documentId && chunk.documentId !== opts.documentId) continue;
        const tf = this.docTerms[i]!.get(term) ?? 0;
        const norm = tf + this.k1 * (1 - this.b + (this.b * this.docLength[i]!) / this.avgLength);
        scores.set(i, (scores.get(i) ?? 0) + idf * ((tf * (this.k1 + 1)) / norm));
      }
    }
    return [...scores.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([i, score]) => ({ chunk: this.chunks[i]!, score, quote: bestQuote(this.chunks[i]!.text, terms) }));
  }
}

/** Pick the sentence window with the highest query-term density. */
export function bestQuote(text: string, terms: string[], maxLength = 420): string {
  const sentences = text.replace(/\s+/g, " ").match(/[^.!?]+[.!?]*(\s|$)/g) ?? [text];
  let best = 0;
  let bestScore = -1;
  for (let i = 0; i < sentences.length; i++) {
    const window = sentences.slice(i, i + 2).join(" ");
    const tokens = new Set(tokenize(window));
    const score = terms.reduce((s, t) => s + (tokens.has(t) ? 1 : 0), 0);
    if (score > bestScore) {
      bestScore = score;
      best = i;
    }
  }
  const quote = sentences.slice(best, best + 2).join(" ").trim();
  return quote.length > maxLength ? `${quote.slice(0, maxLength - 1).trimEnd()}…` : quote;
}
