import { describe, expect, it } from "vitest";
import type { RequirementState, Workspace } from "@visua/core";
import { FrameworkRegistry } from "@visua/frameworks";
import type { AgentHost } from "../src/host.ts";
import { extractCodes } from "../src/offline.ts";
import { getRequirement, listRequirements, searchCorpus } from "../src/tools.ts";

const registry = FrameworkRegistry.load();
const hasThreats = !!registry.framework("mitre-atlas") && !!registry.framework("owasp-llm-top10");
const hasLaws = !!registry.framework("us-state-ai-laws");

/** A read-only host over a workspace with CSF 2.0, the AI RMF and the state AI laws enabled. */
function hostWith(states: RequirementState[] = [], lawRoles: Record<string, string[]> = {}): AgentHost {
  const ws = {
    id: "ws_tools",
    name: "Tools Co",
    frameworks: [
      { frameworkId: "nist-csf-2.0", enabled: true },
      { frameworkId: "nist-ai-rmf", enabled: true },
      { frameworkId: "us-state-ai-laws", enabled: true, law: { applicability: Object.fromEntries(Object.entries(lawRoles).map(([lawId, roles]) => [lawId, { roles }])) } },
    ],
  } as unknown as Workspace;
  const byId = new Map(states.map((s) => [s.nodeId, s]));
  const steps: unknown[] = [];
  return {
    registry,
    runId: "run_tools",
    signal: new AbortController().signal,
    workspace: () => ws,
    states: () => states,
    state: (id: string) => byId.get(id),
    tasks: () => [],
    evidence: () => [],
    policies: () => [],
    connectors: () => [],
    score: () => ({ statuses: new Map() }),
    step: (s: unknown) => (steps.push(s), s),
  } as unknown as AgentHost;
}

describe("agent tools on threats and state laws", () => {
  it.skipIf(!hasThreats)("describes a threat with the requirements publishers link to it, never an assessment", async () => {
    const out = (await getRequirement.run(hostWith(), { id: "AML.T0051" })) as Record<string, unknown> & {
      linkedRequirements: { publication: string; status: string; requirements: number; examples: { code: string; via?: string }[] }[];
      related: { code: string; label: string }[];
    };
    expect(out["code"]).toBe("AML.T0051");
    expect(out).not.toHaveProperty("current");
    expect(out).not.toHaveProperty("status");
    expect(out["note"]).toMatch(/never assessed/);
    expect(out.linkedRequirements.length).toBeGreaterThan(0);
    for (const g of out.linkedRequirements) {
      expect(g.publication.length).toBeGreaterThan(0);
      expect(["final", "draft", "unreviewed", "superseded"]).toContain(g.status);
      expect(g.requirements).toBeGreaterThan(0);
    }
    // ATLAS reaches requirements only through its mitigations and NIST's draft Cyber AI Profile.
    expect(out.linkedRequirements.map((g) => g.status)).toEqual(["draft"]);
    expect(out.linkedRequirements[0]!.examples.every((r) => r.via?.startsWith("AML.M"))).toBe(true);
    expect(out.related.some((r) => r.code.startsWith("AML.M") && r.label === "mitigates")).toBe(true);
  });

  it.skipIf(!hasThreats)("resolves OWASP entries by edition and names the other edition as a catalog writes it", async () => {
    const host = hostWith();
    const current = (await getRequirement.run(host, { id: "LLM04:2026" })) as { code: string; title: string; linkedRequirements: { examples: { via?: string }[] }[] };
    const previous = (await getRequirement.run(host, { id: "LLM04:2025" })) as { code: string; title: string };
    expect(current.code).toBe("LLM04:2026");
    expect(previous.code).toBe("LLM04:2025");
    expect(current.title).not.toBe(previous.title);
    const vias = current.linkedRequirements.flatMap((g) => g.examples.map((r) => r.via)).filter(Boolean);
    expect(vias).toContain("LLM03:2025");
    expect(vias.some((v) => v!.includes("-2025"))).toBe(false);
  });

  it.skipIf(!hasThreats)("refuses to list a threat catalog as requirements", async () => {
    const out = (await listRequirements.run(hostWith(), { framework: "mitre-atlas" })) as { error?: string };
    expect(out.error).toMatch(/threat catalog/);
  });

  it.skipIf(!hasLaws)("describes a state law and an obligation with dates, roles, definitions and the recorded decision", async () => {
    const lawId = String(registry.node("us-state-ai-laws:CA-SB243")?.attributes?.["lawId"]);
    const law = (await getRequirement.run(hostWith([], { [lawId]: ["operator"] }), { id: "CA-SB243" })) as Record<string, unknown> & {
      obligations: { code: string }[];
      definitions: { role: string; definition: string }[];
      yourRoles: string[] | null;
    };
    expect(law["kind"]).toBe("law");
    expect(law.obligations.map((o) => o.code)).toContain("CA-SB243-02");
    expect(law.definitions.map((d) => d.role)).toContain("operator");
    expect(law.definitions.find((d) => d.role === "operator")!.definition).toMatch(/operator/i);
    expect(law.yourRoles).toEqual(["operator"]);
    const obligation = (await getRequirement.run(hostWith(), { id: "CA-SB243-02" })) as Record<string, unknown> & { law: { code: string; effective: string; timing: string; yourRoles: string[] | null; citation: { documentId: string; page?: number } } };
    expect(obligation["code"]).toBe("CA-SB243-02");
    expect(obligation.law).toMatchObject({ code: "CA-SB243-02", timing: "in-force", yourRoles: null });
    expect(obligation.law.citation.documentId).toBe("ca-sb243-ch677-2025");
    expect(obligation.law.citation.page).toBeGreaterThan(0);
  });

  it.skipIf(!hasLaws)("searches the state-law corpus on its own", async () => {
    const out = (await searchCorpus.run(hostWith(), { query: "companion chatbot suicide protocol", framework: "us-state-ai-laws", limit: 3 })) as { hits: { documentId: string }[] };
    expect(out.hits.length).toBeGreaterThan(0);
    const laws = new Set([...registry.documents.values()].filter((d) => d.framework === "us-state-ai-laws").map((d) => d.id));
    expect(out.hits.every((h) => laws.has(h.documentId))).toBe(true);
  });

  it("reads threat, AI RMF and state-law codes out of a question", () => {
    expect(extractCodes("Is AML.T0051.001 covered, and AML.M0019? What about LLM04:2026, ASI01 and NISTAML.018?")).toEqual(
      expect.arrayContaining(["AML.T0051.001", "AML.M0019", "LLM04:2026", "ASI01", "NISTAML.018"]),
    );
    expect(extractCodes("What does CA-SB243-02 say, and GOVERN 1.1?")).toEqual(expect.arrayContaining(["CA-SB243-02", "GOVERN 1.1"]));
  });
});
