import { describe, expect, it } from "vitest";
import { CorpusSearch, corpusChunkSha256, type CorpusChunk, type CorpusReference } from "../src/search.ts";
import { FrameworkRegistry } from "../src/index.ts";

const chunk: CorpusChunk = { id: "doc#p2-0", documentId: "doc", documentTitle: "Synthetic test document", framework: "test", page: 2, locator: "Section A", text: "Access is reviewed.\n  Review records are retained for inspection." };

describe("corpus citation resolution", () => {
  it("resolves a unique exact passage and binds canonical identity, location and original content", () => {
    const search = new CorpusSearch([chunk]);
    expect(search.resolveCitation({ documentId: "doc", quote: "reviewed.  Review records" })).toEqual({ ok: true, citation: {
      chunkId: chunk.id, chunkSha256: corpusChunkSha256(chunk), documentId: "doc", documentTitle: chunk.documentTitle,
      page: 2, locator: "Section A", quote: "reviewed. Review records",
    } });
  });

  it.each([
    { quote: "The organization is certified." },
    { quote: "Access is reviewed. … inspection." },
    { quote: "access is reviewed." },
    { quote: "" },
    { quote: " ".repeat(10) },
    { quote: "x".repeat(601) },
    { documentId: "invented" },
    { chunkId: "invented" },
    { page: 3 },
    { page: 0 },
    { locator: "Section B" },
    { chunkSha256: "0".repeat(64) },
  ])("rejects fabricated, stale or mismatched references: %j", (patch) => {
    expect(new CorpusSearch([chunk]).resolveCitation({ documentId: "doc", quote: "Access is reviewed.", ...patch }).ok).toBe(false);
  });

  it("requires a disambiguating chunk id when a quote appears in multiple chunks", () => {
    const second = { ...chunk, id: "doc#p3-0", page: 3 };
    const search = new CorpusSearch([chunk, second]);
    const input = { documentId: "doc", quote: "Access is reviewed." };
    expect(search.resolveCitation(input)).toMatchObject({ ok: false, error: expect.stringMatching(/multiple/) });
    expect(search.resolveCitation({ ...input, chunkId: second.id })).toMatchObject({ ok: true, citation: { page: 3, chunkId: second.id } });
    expect(search.resolveCitation({ ...input, page: 2 })).toMatchObject({ ok: true, citation: { chunkId: chunk.id } });
  });

  it("fails closed for duplicate chunk identities, even across documents", () => {
    const search = new CorpusSearch([chunk, { ...chunk, documentId: "other", text: "Different content" }]);
    for (const input of [{}, { chunkId: chunk.id }]) expect(search.resolveCitation({ documentId: "doc", quote: "Access is reviewed.", ...input }).ok).toBe(false);
  });

  it("freezes the indexed corpus and rejects a changed edition's content hash", () => {
    const mutable = { ...chunk };
    const search = new CorpusSearch([mutable]);
    mutable.text = "Changed content";
    const old: CorpusReference = { documentId: "doc", chunkId: chunk.id, quote: "Access is reviewed.", chunkSha256: corpusChunkSha256(chunk) };
    expect(search.resolveCitation(old).ok).toBe(true);
    expect(new CorpusSearch([{ ...chunk, text: `${chunk.text} New edition.` }]).resolveCitation(old).ok).toBe(false);
  });

  it("returns exact search excerpts without invented truncation marks", () => {
    const text = `A long access review sentence ${"with retained records ".repeat(45)}. The next sentence.`;
    const search = new CorpusSearch([{ ...chunk, text }]);
    const [hit] = search.search("access review");
    expect(hit!.quote.length).toBeLessThanOrEqual(420);
    expect(hit!.quote).not.toContain("…");
    expect(search.resolveCitation({ documentId: "doc", chunkId: chunk.id, quote: hit!.quote }).ok).toBe(true);
  });

  it("preserves identifiers and parenthesized abbreviations while selecting sentence windows", () => {
    const text = "Review controls. PR.AA-01: Review account identities (e.g., employee credentials). CC6.1 is another identifier.";
    const search = new CorpusSearch([{ ...chunk, text }]);
    const [hit] = search.search("account identities");
    expect(hit!.quote).toContain("PR.AA-01");
    expect(hit!.quote).toContain("(e.g., employee credentials)");
    expect(search.resolveCitation({ documentId: "doc", quote: hit!.quote }).ok).toBe(true);
  });

  it("round trips retrieved passages from the installed corpus without treating retrieval as entailment", () => {
    const registry = FrameworkRegistry.load();
    for (const query of ["PR.AA-01 identity", "CC6.1 logical access", "AC-2 account management", "GOVERN AI risk", "companion chatbot protocol", "prompt injection"] ) {
      const hits = registry.search.search(query, { limit: 10 });
      expect(hits.length).toBeGreaterThan(0);
      for (const hit of hits) {
        const reference = { documentId: hit.chunk.documentId, chunkId: hit.chunk.id, chunkSha256: corpusChunkSha256(hit.chunk), page: hit.chunk.page, locator: hit.chunk.locator, quote: hit.quote };
        expect(registry.search.resolveCitation(reference), hit.chunk.id).toMatchObject({ ok: true });
      }
    }
  });
});
