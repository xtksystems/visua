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

// Runs when the AI overlays are ingested (packages/frameworks/data/overlays/).
describe.skipIf(!registry.overlay("nist-ir-8596-iprd"))("AI security overlays (NIST drafts)", () => {
  it("Cyber AI Profile (IR 8596 iprd): all 106 CSF subcategories with a priority for each focus area", () => {
    const o = registry.overlay("nist-ir-8596-iprd")!;
    expect(o.frameworkId).toBe("nist-csf-2.0");
    expect(o.status).toBe("initial preliminary draft");
    expect(o.entries).toHaveLength(106);
    expect(o.lenses?.map((l) => l.id)).toEqual(["secure", "defend", "thwart"]);
    const count = (lens: string, p: number) => o.entries.filter((e) => e.lenses?.[lens]?.priority === p).length;
    // Proposed priorities as printed in Tables 1–6: 1 High, 2 Moderate, 3 Foundational.
    expect([1, 2, 3].map((p) => count("secure", p))).toEqual([23, 33, 50]);
    expect([1, 2, 3].map((p) => count("defend", p))).toEqual([28, 43, 35]);
    expect([1, 2, 3].map((p) => count("thwart", p))).toEqual([24, 44, 38]);
    const csf = registry.framework("nist-csf-2.0")!;
    expect(new Set(o.entries.map((e) => e.nodeId))).toEqual(new Set(csf.assessable.map((n) => n.id)));
    expect(o.entries.every((e) => e.citation.documentId === "nist-ir-8596-iprd" && (e.citation.page ?? 0) >= 25)).toBe(true);
    // Its example informative references include MITRE ATLAS mitigations and the OWASP LLM Top 10.
    const refs = o.entries.flatMap((e) => e.refs);
    expect(refs.some((r) => r.scheme === "atlas" && /^AML\.M\d{4}$/.test(r.id ?? ""))).toBe(true);
    expect(refs.some((r) => r.scheme === "owasp-llm" && r.id === "LLM03")).toBe(true);
  });

  it("COSAiS predictive-AI overlay (annotated outline): 59 SP 800-53 controls, 11 annotated", () => {
    const o = registry.overlay("nist-cosais-predictive-ai")!;
    expect(o.frameworkId).toBe("nist-sp-800-53-r5");
    expect(o.entries).toHaveLength(59);
    const annotated = o.entries.filter((e) => e.control?.annotated);
    expect(annotated.map((e) => e.nodeId.split(":")[1])).toEqual(["AC-6", "CM-2", "CM-4", "RA-5", "SA-11(2)", "SA-15(1)", "SA-15(8)", "SC-5(3)", "SC-7(10)", "SI-3(8)", "SI-4(2)"]);
    for (const e of o.entries) expect(registry.node(e.nodeId)?.frameworkId, e.nodeId).toBe("nist-sp-800-53-r5");
    expect(o.scope?.lifecyclePhases).toEqual(["Model Training", "Model Deployment", "Model Maintenance", "Continuous"]);
    expect(annotated.every((e) => e.control?.attackIds?.every((id) => /^NISTAML\.\d{2,3}$/.test(id)) ?? true)).toBe(true);
  });

  it("indexes overlay entries by node", () => {
    const at = registry.overlaysOf("nist-sp-800-53-r5:AC-6").map((x) => x.overlay.id);
    expect(at).toContain("nist-cosais-predictive-ai");
    expect(registry.overlaysOf("nist-csf-2.0:GV.OC-01").map((x) => x.overlay.id)).toContain("nist-ir-8596-iprd");
  });
});

describe("AI threat catalogs", () => {
  const kinds = (id: string) => registry.framework(id)!.graph.nodes.reduce<Record<string, number>>((acc, n) => ((acc[n.kind] = (acc[n.kind] ?? 0) + 1), acc), {});

  it("MITRE ATLAS 2026.09: 16 tactics, 120 techniques, 88 sub-techniques, 40 mitigations", () => {
    const atlas = registry.framework("mitre-atlas")!;
    expect(atlas.graph.framework.family).toBe("threat");
    expect(atlas.graph.framework.version).toBe("2026.09");
    expect(kinds("mitre-atlas")).toMatchObject({ tactic: 16, technique: 120, "sub-technique": 88, mitigation: 40 });
    expect(atlas.assessable).toHaveLength(208);
    // Matrix order starts with Reconnaissance; a technique sits under its first tactic and keeps every tactic it serves.
    expect(atlas.roots()[0]!.code).toBe("AML.TA0002");
    const techniques = atlas.graph.nodes.filter((n) => n.kind === "technique");
    for (const n of techniques) expect((n.attributes!["tactics"] as string[])[0]).toBe(n.parentId);
    expect(techniques.some((n) => (n.attributes!["tactics"] as string[]).length > 1)).toBe(true);
    expect(atlas.graph.framework.contentNotice).toMatch(/Apache License 2\.0/);
  });

  it("OWASP LLM Top 10: the 2026 edition is current, 2025 is kept with its lineage", () => {
    const owasp = registry.framework("owasp-llm-top10")!;
    expect(kinds("owasp-llm-top10")).toMatchObject({ edition: 2, risk: 20 });
    expect(owasp.assessable.map((n) => n.code)).toEqual(["LLM01", "LLM02", "LLM03", "LLM04", "LLM05", "LLM06", "LLM07", "LLM08", "LLM09", "LLM10"]);
    // 2026 renumbered the list: Supply Chain moved from LLM03 to LLM04.
    const supply = owasp.get("LLM04")!;
    expect(supply.title).toBe("Supply Chain");
    expect(supply.attributes?.["previousEdition"]).toMatchObject({ key: "LLM03:2025", nodeId: "owasp-llm-top10:LLM03-2025" });
    expect(owasp.get("LLM03-2025")!.attributes?.["nextEdition"]).toMatchObject({ key: "LLM04:2026" });
    expect(owasp.graph.framework.contentNotice).toMatch(/CC BY-SA 4\.0/);
  });

  it("OWASP Agentic Top 10 2026 and NIST AI 100-2 E2025", () => {
    expect(registry.framework("owasp-agentic-top10")!.assessable.map((n) => n.code)).toEqual(["ASI01", "ASI02", "ASI03", "ASI04", "ASI05", "ASI06", "ASI07", "ASI08", "ASI09", "ASI10"]);
    expect(kinds("nist-ai-100-2")).toMatchObject({ objective: 5, attack: 25 });
  });

  it("keeps every published link with its authority and status, apart from the requirement crosswalk", () => {
    const sets = registry.threatLinks.sets;
    const count = (authority: RegExp, status: string) => sets.filter((s) => authority.test(s.authority) && s.status === status).reduce((n, s) => n + s.mappings.length, 0);
    expect(count(/^MITRE ATLAS/, "final")).toBe(361);
    expect(count(/^NIST COSAiS/, "draft")).toBe(21);
    expect(count(/^OWASP LLM Top 10 2026/, "final")).toBe(102);
    expect(count(/unreviewed/, "unreviewed")).toBe(237);
    for (const set of sets) for (const m of set.mappings) {
      expect(registry.node(m.source), m.source).toBeDefined();
      expect(registry.node(m.target), m.target).toBeDefined();
    }
    // Threat links never enter the requirement crosswalk.
    expect(registry.crosswalk.sets.some((s) => s.id.startsWith("threat--"))).toBe(false);
    const gvoc = registry.threatLinks.of("nist-csf-2.0:GV.OC-01");
    expect(gvoc.some((l) => l.nodeId === "mitre-atlas:AML.M0020" && l.status === "draft")).toBe(true);
    // Catalogs Visua does not model are kept as references on the threat.
    const refs = registry.node("owasp-llm-top10:LLM01")!.attributes?.["externalRefs"] as { scheme: string }[];
    expect(new Set(refs.map((r) => r.scheme))).toEqual(new Set(["mitre-attack", "cwe", "csa-aicm", "owasp-aivss", "owasp-genai-data-security", "nist-ai-600-1"]));
  });
});

describe.skipIf(!registry.framework("us-state-ai-laws"))("U.S. state AI laws", () => {
  const laws = registry.framework("us-state-ai-laws")!;
  const byKind = (k: string) => laws?.graph.nodes.filter((n) => n.kind === k) ?? [];

  it("26 laws in 8 jurisdictions with 187 obligations quoted from the statutes and regulations", () => {
    expect(laws.graph.framework.family).toBe("law");
    expect(byKind("jurisdiction").map((n) => n.code)).toEqual(["CA", "CO", "IL", "ME", "NY", "NYC", "TX", "UT"]);
    expect(byKind("law")).toHaveLength(26);
    expect(byKind("obligation")).toHaveLength(187);
    expect(laws.assessable).toHaveLength(187);
    // Codes are node ids: unique, short and stable.
    const codes = byKind("law").map((n) => n.code);
    expect(new Set(codes).size).toBe(codes.length);
    expect(codes.every((c) => /^[A-Z]{2,3}-[A-Z0-9-]+$/.test(c) && c.length <= 20)).toBe(true);
    expect(codes).toEqual(expect.arrayContaining(["TX-TRAIGA", "CA-TFAIA", "CO-SB26-189", "NY-RAISE", "NYC-AEDT", "UT-HB276-PROVENANCE", "UT-HB276-VOYEURISM"]));
  });

  it("cites every obligation to its section and page, and names the roles it falls on", () => {
    const docs = new Set(loadCorpusManifests().flatMap((m) => m.documents.map((d) => d.id)));
    for (const o of byKind("obligation")) {
      expect(docs.has(o.citation.documentId), `${o.code} → ${o.citation.documentId}`).toBe(true);
      expect(o.citation.locator, o.code).toBeTruthy();
      expect(o.citation.page, o.code).toBeGreaterThan(0);
      expect((o.attributes?.["roles"] as string[]).length, o.code).toBeGreaterThan(0);
      expect(o.text.length, o.code).toBeGreaterThan(20);
    }
  });

  it("keeps an enjoined law with its status and no obligations to track", () => {
    const co = laws.get("CO-SB24-205")!;
    expect(co.attributes?.["status"]).toBe("enjoined");
    expect(laws.childrenOf(co.id)).toHaveLength(0);
    expect(laws.get("TX-TRAIGA")!.attributes?.["safeHarbors"]).toEqual(expect.arrayContaining([expect.objectContaining({ references: expect.arrayContaining([expect.stringMatching(/600-1/)]) })]));
  });
});
