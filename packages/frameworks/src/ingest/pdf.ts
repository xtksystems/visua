/**
 * PDF → page text → citation-ready chunks.
 * Chunks never cross page boundaries so every citation carries an exact page.
 */
import { readFileSync } from "node:fs";
import { extractText, getDocumentProxy } from "unpdf";
import type { CorpusChunk } from "../search.ts";

export async function pdfPages(path: string): Promise<string[]> {
  const pdf = await getDocumentProxy(new Uint8Array(readFileSync(path)));
  const { text } = await extractText(pdf, { mergePages: false });
  return (text as string[]).map((p) => p ?? "");
}

/** Lines repeated on most pages (running headers/footers) are noise for retrieval. */
function boilerplateLines(pages: string[]): Set<string> {
  const counts = new Map<string, number>();
  for (const page of pages) {
    const lines = new Set(
      page
        .split("\n")
        .map((l) => l.trim())
        .filter((l) => l.length > 3 && l.length < 140),
    );
    for (const l of lines) counts.set(l, (counts.get(l) ?? 0) + 1);
  }
  const threshold = Math.max(3, pages.length * 0.4);
  return new Set([...counts.entries()].filter(([, n]) => n >= threshold).map(([l]) => l));
}

export function cleanPage(page: string, boilerplate: Set<string>): string {
  return page
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l && !boilerplate.has(l) && !/^\d{1,4}$/.test(l))
    .join("\n")
    .replace(/(\w)-\n(\w)/g, "$1$2") // re-join hyphenated words
    .replace(/[ \t]+/g, " ")
    .replace(/\n{2,}/g, "\n")
    .trim();
}

export interface ChunkSource {
  documentId: string;
  documentTitle: string;
  framework: string;
}

export function chunkPages(source: ChunkSource, pages: string[], size = 1300): CorpusChunk[] {
  const boilerplate = boilerplateLines(pages);
  const chunks: CorpusChunk[] = [];
  pages.forEach((raw, i) => {
    const text = cleanPage(raw, boilerplate);
    if (text.length < 60) return;
    const paragraphs = text.split(/\n(?=[A-Z•o\-–(0-9])/);
    let buf = "";
    let n = 0;
    const flush = () => {
      const t = buf.replace(/\n/g, " ").replace(/\s+/g, " ").trim();
      if (t.length >= 60) {
        chunks.push({ id: `${source.documentId}#p${i + 1}-${n++}`, documentId: source.documentId, documentTitle: source.documentTitle, framework: source.framework, page: i + 1, text: t });
      }
      buf = "";
    };
    for (const p of paragraphs) {
      if (buf.length + p.length > size && buf.length > 200) flush();
      buf += (buf ? "\n" : "") + p;
    }
    flush();
  });
  return chunks;
}

/** Find the first PDF page (1-based) whose text contains the needle. */
export function findPage(pages: string[], needle: string, from = 0): number | undefined {
  for (let i = from; i < pages.length; i++) if (pages[i]!.includes(needle)) return i + 1;
  return undefined;
}
