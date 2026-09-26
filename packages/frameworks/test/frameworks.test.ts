import { describe, expect, it } from "vitest";
import { FrameworkRegistry, loadCorpusManifests, loadFrameworkGraphs, loadMappingSets } from "../src/index.ts";
import { normalize80053, rmfTaskCode } from "../src/ingest/csf.ts";
import { tokenize } from "../src/search.ts";

const registry = FrameworkRegistry.load();

describe("ingested framework graphs match the official sources", () => {
  it("NIST CSF 2.0: 6 Functions, 22 Categories, 106 Subcategories, 363 Implementation Examples", () => {
    const csf = registry.framework("nist-csf-2.0")!;
    const byKind = (k: string) => csf.graph.nodes.filter((n) => n.kind === k);
    expect(byKind("function").map((n) => n.code)).toEqual(["GV", "ID", "PR", "DE", "RS", "RC"]);
    expect(byKind("category")).toHaveLength(22);
    expect(byKind("subcategory")).toHaveLength(106);
    expect(byKind("subcategory").reduce((s, n) => s + (n.examples?.length ?? 0), 0)).toBe(363);
    const gvoc01 = csf.get("GV.OC-01")!;
    expect(gvoc01.text).toBe("The organizational mission is understood and informs cybersecurity risk management");
    expect(gvoc01.citation.page).toBeGreaterThan(0);
    expect(csf.graph.nodes.every((n) => n.citation.page)).toBe(true);
  });

  it("SP 800-53 Rev. 5.2.0: 20 families, 1,014 active controls and enhancements, SP 800-53B baselines", () => {
    const sp = registry.framework("nist-sp-800-53-r5")!;
    expect(sp.roots()).toHaveLength(20);
    expect(sp.assessable).toHaveLength(1014);
    const count = (b: string) => sp.assessable.filter((n) => (n.attributes?.["baselines"] as string[]).includes(b)).length;
    expect(count("low")).toBe(149);
    expect(count("moderate")).toBe(287);
    expect(count("high")).toBe(370);
    expect(count("privacy")).toBe(96);
    const ac2 = sp.get("AC-2")!;
    expect(ac2.title).toBe("Account Management");
    expect(ac2.text).toContain("[Assignment: organization-defined");
    expect((ac2.attributes?.["objectives"] as string[]).length).toBeGreaterThan(10);
    expect(sp.get("SA-24")).toBeDefined(); // Release 5.2.0 addition
  });

  it("NIST RMF: 7 steps and 47 tasks", () => {
    const rmf = registry.framework("nist-rmf")!;
    expect(rmf.roots().map((n) => n.code)).toEqual(["P", "C", "S", "I", "A", "R", "M"]);
    expect(rmf.assessable).toHaveLength(47);
    expect(rmf.get("C-2")!.title).toBe("Security Categorization");
  });

  it("every mapping endpoint exists", () => {
    for (const set of loadMappingSets()) {
      expect(set.mappings.length).toBeGreaterThan(0);
      for (const m of set.mappings) {
        expect(registry.node(m.source), m.source).toBeDefined();
        expect(registry.node(m.target), m.target).toBeDefined();
      }
    }
    expect(registry.crosswalk.related("nist-csf-2.0:PR.AA-05", "nist-sp-800-53-r5").length).toBeGreaterThan(3);
  });

  it("every cited document is in a corpus manifest", () => {
    const docs = new Set(loadCorpusManifests().flatMap((m) => m.documents.map((d) => d.id)));
    for (const g of loadFrameworkGraphs()) for (const n of g.nodes) expect(docs.has(n.citation.documentId), `${n.id} → ${n.citation.documentId}`).toBe(true);
  });
});

describe("corpus search", () => {
  it("retrieves citable passages from the official corpus", () => {
    const hits = registry.search.search("security categorization FIPS 199 impact level", { limit: 5, framework: "nist-rmf" });
    expect(hits.length).toBeGreaterThan(0);
    expect(hits[0]!.chunk.page).toBeGreaterThan(0);
    expect(hits[0]!.quote.length).toBeGreaterThan(20);
    const byCode = registry.search.search("PR.AA-05 access permissions", { limit: 3 });
    expect(byCode.some((h) => h.chunk.text.includes("PR.AA-05"))).toBe(true);
  });

  it("tokenizes framework identifiers intact", () => {
    expect(tokenize("See GV.OC-01 and AC-2(1)")).toEqual(expect.arrayContaining(["gv.oc-01", "ac-2(1)"]));
  });
});

describe("identifier normalization", () => {
  it("normalizes SP 800-53 and RMF identifiers", () => {
    expect(normalize80053("SR-03")).toBe("SR-3");
    expect(normalize80053("AC-02(01)")).toBe("AC-2(1)");
    expect(rmfTaskCode("RMF Prepare Step (System Level): TASK P-14 Risk Assessment—System")).toBe("P-14");
  });
});
