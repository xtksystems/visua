import { describe, expect, it } from "vitest";
import { FrameworkRegistry, loadCorpusManifests, loadFrameworkGraphs, loadMappingSets } from "../src/index.ts";
import { normalize80053, rmfTaskCode } from "../src/ingest/csf.ts";
import { buildTscGraph, loadLicensedTsc } from "../src/ingest/tsc.ts";
import { normalize80053 as normalizeAicpa80053 } from "../src/ingest/tsc-mappings.ts";
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

  it("AICPA TSC 2017 (SOC 2): 5 categories, 20 series, 61 criteria — runs without the licensed text", () => {
    const skeleton = buildTscGraph(null);
    const byKind = (k: string) => skeleton.nodes.filter((n) => n.kind === k);
    expect(byKind("category").map((n) => n.code)).toEqual(["CC", "A", "PI", "C", "P"]);
    expect(byKind("series")).toHaveLength(20);
    expect(byKind("criterion")).toHaveLength(61);
    const count = (prefix: RegExp) => byKind("criterion").filter((n) => prefix.test(n.code)).length;
    expect([count(/^CC/), count(/^A/), count(/^PI/), count(/^C\d/), count(/^P\d/)]).toEqual([33, 3, 5, 2, 18]);
    // COSO principles 1–17 map to CC1.1–CC5.3; the skeleton carries no AICPA text.
    expect(byKind("criterion").filter((n) => n.attributes?.["cosoPrinciple"]).map((n) => n.attributes?.["cosoPrinciple"]).sort((a, b) => Number(a) - Number(b))).toEqual(Array.from({ length: 17 }, (_, i) => i + 1));
    expect(skeleton.nodes.every((n) => n.attributes?.["licensed"] === false)).toBe(true);
    expect(skeleton.framework.contentNotice).toMatch(/not bundled/);
  });

  it("overlays the verbatim criteria from a licensed local copy when present", () => {
    const licensed = loadLicensedTsc();
    if (!licensed) return; // Fresh clones do not include AICPA content.
    const graph = buildTscGraph(licensed);
    const cc61 = graph.nodes.find((n) => n.code === "CC6.1")!;
    expect(cc61.attributes?.["licensed"]).toBe(true);
    expect(cc61.text).toMatch(/^The entity implements logical access security software/);
    expect(cc61.citation.page).toBeGreaterThan(0);
    const pof = graph.nodes.filter((n) => n.kind === "criterion").reduce((s, n) => s + ((n.attributes?.["pointsOfFocus"] as unknown[]) ?? []).length, 0);
    expect(pof).toBe(330);
  });

  // Runs whenever the AI RMF corpus has been ingested (packages/frameworks/data/nist-ai-rmf.json).
  it.skipIf(!registry.framework("nist-ai-rmf"))("NIST AI RMF 1.0: 4 functions, 19 categories, 72 subcategories, Playbook actions and the Generative AI Profile", () => {
    const ai = registry.framework("nist-ai-rmf")!;
    const byKind = (k: string) => ai.graph.nodes.filter((n) => n.kind === k);
    expect(byKind("function").map((n) => n.code)).toEqual(["GOVERN", "MAP", "MEASURE", "MANAGE"]);
    expect(byKind("category")).toHaveLength(19);
    expect(byKind("subcategory")).toHaveLength(72);
    const perFunction = (f: string) => byKind("subcategory").filter((n) => n.code.startsWith(`${f} `)).length;
    expect(["GOVERN", "MAP", "MEASURE", "MANAGE"].map(perFunction)).toEqual([19, 18, 22, 13]);
    expect(ai.graph.nodes.every((n) => n.citation.page && n.citation.page > 0)).toBe(true);
    // The Playbook gives suggested actions for every outcome.
    expect(byKind("subcategory").every((n) => ((n.attributes?.["suggestedActions"] as unknown[]) ?? []).length > 0)).toBe(true);
    // NIST AI 600-1: 12 GAI risks; every action is tied to an existing outcome and to known risks.
    const profile = ai.graph.profiles?.find((p) => p.id === "nist-ai-600-1");
    expect(profile?.risks).toHaveLength(12);
    const riskIds = new Set(profile!.risks.map((r) => r.id));
    const actions = byKind("subcategory").flatMap((n) => (n.attributes?.["profileActions"] as { id: string; risks: string[] }[] | undefined) ?? []);
    expect(actions.length).toBeGreaterThan(150);
    expect(actions.every((a) => /^(GV|MP|MS|MG)-\d+\.\d+-\d{3}$/.test(a.id) && a.risks.every((r) => riskIds.has(r)))).toBe(true);
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
    expect(normalizeAicpa80053("PS-6a")).toBe("PS-6");
    expect(normalizeAicpa80053("AC-2(1)(a)")).toBe("AC-2(1)");
    expect(normalizeAicpa80053("SA-08(21)")).toBe("SA-8(21)");
  });
});
