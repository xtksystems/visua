import { afterEach, describe, expect, it } from "vitest";
import { CrosswalkIndex, type FrameworkFamily, type MappingSet, type RequirementNode, type RequirementState, type Workspace } from "@visua/core";
import { CorpusSearch, type CorpusChunk } from "@visua/frameworks";
import type { AgentHost, ProposalInput } from "../src/host.ts";
import { runOffline } from "../src/offline.ts";
import { AGENTS } from "../src/agents.ts";
import { templateFor } from "../src/policies.ts";
import { proposeAssessment, proposeCrosswalkAssessment, proposeCrosswalk, proposePolicy, searchCorpus } from "../src/tools.ts";

const csfId = "nist-csf-2.0";
const socId = "aicpa-tsc-2017";
const node = (frameworkId = csfId, code = "PR.AA-01"): RequirementNode => ({ id: `${frameworkId}:${code}`, frameworkId, code, kind: "subcategory", parentId: null, depth: 2, order: 0, title: "Access review", text: "Access is reviewed and records are retained.", assessable: true, citation: { documentId: "public", page: 2 } });
const publicNode = node();
const chunk: CorpusChunk = { id: "public#p2-0", documentId: "public", documentTitle: "Synthetic public text", framework: "public-test", page: 2, locator: "Access", text: publicNode.text };
const families: Record<string, FrameworkFamily> = { [csfId]: "csf", [socId]: "soc2", "us-state-ai-laws": "law", "nist-ai-rmf": "ai" };

function fixture(nodes = [publicNode], options: { mappings?: MappingSet[]; disabled?: string[]; chunks?: CorpusChunk[]; sourceCurrent?: number } = {}) {
  const proposals: ProposalInput[] = [];
  const frameworks = [...new Set([csfId, ...nodes.map(n => n.frameworkId)])];
  const indexes = new Map(frameworks.map(id => {
    const local = nodes.filter(n => n.frameworkId === id);
    return [id, { graph: { framework: { id, family: families[id], shortName: id, sources: [{ documentId: "public" }] }, nodes: local }, byId: new Map(local.map(n => [n.id, n])), assessable: local.filter(n => n.assessable), assessableUnder: (nodeId: string) => local.filter(n => n.assessable && (n.id === nodeId || n.parentId === nodeId)) }];
  }));
  const states: RequirementState[] = nodes.filter(n => n.assessable).map(n => ({ nodeId: n.id, current: n.frameworkId === socId ? options.sourceCurrent ?? 2 : 0, target: 3, applicable: true, priority: "medium", updatedAt: "2026-10-13T00:00:00Z", updatedBy: "tester" }));
  const search = new CorpusSearch(options.chunks ?? [chunk]);
  const host = {
    registry: {
      node: (id: string) => nodes.find(n => n.id === id || n.code === id), framework: (id: string) => indexes.get(id),
      documents: new Map([["public", { id: "public", framework: "public-test" }], ["licensed", { id: "licensed", framework: "aicpa-soc2" }]]),
      search, crosswalk: new CrosswalkIndex(options.mappings ?? []),
    },
    runId: "test-run", signal: new AbortController().signal,
    workspace: () => ({ id: "ws", name: "Test organization", profile: { industry: "saas", size: "11-50" }, frameworks: frameworks.map(frameworkId => ({ frameworkId, enabled: !options.disabled?.includes(frameworkId) })) } as Workspace),
    states: () => states, state: (id: string) => states.find(s => s.nodeId === id), tasks: () => [], evidence: () => [], policies: () => [], connectors: () => [],
    step: (step: unknown) => step,
    propose: async (input: ProposalInput) => { proposals.push(input); return { id: `proposal-${proposals.length}`, status: "pending" }; },
  } as unknown as AgentHost;
  return { host, proposals };
}
const originalEnv = { ...process.env };
afterEach(() => { process.env = { ...originalEnv }; });

describe("agent corpus-backed proposals", () => {
  it("uses the deterministic node-only tool for provider-backed crosswalk proposals", () => {
    expect(AGENTS["crosswalk-analyst"].tools).toContain("propose_crosswalk_assessment");
    expect(AGENTS["crosswalk-analyst"].tools).not.toContain("propose_assessment");
    expect(proposeCrosswalk.schema.safeParse({ nodeId: publicNode.id, current: 4, confidence: "high" }).success).toBe(false);
    expect(proposeCrosswalk.schema.safeParse({ nodeId: publicNode.id }).success).toBe(true);
  });

  it("search results round trip into canonical stored citations", async () => {
    const { host, proposals } = fixture();
    const result = await searchCorpus.run(host, { query: "access review" }) as { hits: { chunkId: string; chunkSha256: string; documentId: string; quote: string }[] };
    const hit = result.hits[0]!;
    expect(hit).toMatchObject({ chunkId: chunk.id, chunkSha256: expect.stringMatching(/^[a-f0-9]{64}$/) });
    const out = await proposeAssessment.run(host, { nodeId: publicNode.id, current: 1, rationale: "A proposed assessment for review.", confidence: "low", citations: [hit] });
    expect(out).toMatchObject({ proposalId: "proposal-1" });
    expect(proposals[0]!.citations[0]).toMatchObject({ chunkId: chunk.id, documentTitle: chunk.documentTitle, page: 2, locator: "Access", quote: chunk.text });
  });

  it.each(["assessment", "policy"])("rejects fabricated quotes from a known document before staging a %s", async kind => {
    const { host, proposals } = fixture();
    const citations = [{ documentId: "public", quote: "This organization is compliant and certified." }];
    const out = kind === "assessment"
      ? await proposeAssessment.run(host, { nodeId: publicNode.id, current: 4, rationale: "Fabricated assessment must fail.", confidence: "high", citations })
      : await proposePolicy.run(host, { title: "Access policy", requirementIds: [publicNode.id], body: "Policy draft ".repeat(30), citations });
    expect(out).toMatchObject({ error: expect.stringMatching(/does not match/) });
    expect(proposals).toEqual([]);
  });

  it("rejects an entire mixed citation list rather than silently dropping fabricated references", async () => {
    const { host, proposals } = fixture();
    const out = await proposeAssessment.run(host, { nodeId: publicNode.id, current: 2, rationale: "Review both supplied references.", confidence: "high", citations: [
      { documentId: "public", quote: chunk.text }, { documentId: "missing", quote: "Invented" },
    ] });
    expect(out).toHaveProperty("error");
    expect(proposals).toEqual([]);
  });

  it("preserves the model licensing gate even when the quote really exists", async () => {
    process.env["VISUA_AGENT_MODE"] = "claude";
    delete process.env["VISUA_AICPA_AI_USE"];
    const licensed = { ...chunk, id: "licensed#p2-0", documentId: "licensed", framework: "aicpa-soc2", text: "SYNTHETIC LICENSED FIXTURE" };
    const { host, proposals } = fixture([publicNode], { chunks: [licensed] });
    const out = await proposeAssessment.run(host, { nodeId: publicNode.id, current: 1, rationale: "Use the cited source text.", confidence: "low", citations: [{ documentId: "licensed", quote: licensed.text }] });
    expect(out).toMatchObject({ error: expect.stringMatching(/unavailable to this model/) });
    expect(JSON.stringify(out)).not.toContain(licensed.text);
    expect(proposals).toEqual([]);
  });
});

describe("policy template applicability", () => {
  it.each([
    [csfId, "PR.AA-01", "access-control-policy"],
    [socId, "P1.1", "privacy-policy"],
    ["nist-ai-rmf", "GOVERN 1.1", "ai-governance-policy"],
    ["nist-sp-800-53-r5", "AC-2(1)", "access-control-policy"],
  ])("routes supported %s %s to its applicable template", (frameworkId, code, templateId) => {
    expect(templateFor(node(frameworkId, code))?.id).toBe(templateId);
  });

  it.each([["us-state-ai-laws", "CA-SB243-02"], ["unknown", "PR.AA-01"], ["nist-ai-rmf", "GOVERNANCE"], [csfId, "ZZ.ZZ-01"], [socId, "P10.1"]])("does not fallback or confuse prefix vocabularies for %s %s", (frameworkId, code) => {
    expect(templateFor(node(frameworkId, code))).toBeUndefined();
  });

  it.each([{ nodeIds: ["us-state-ai-laws:CA-SB243-02"] }, { nodeIds: ["unknown"] }, {}])("reports no applicable template and stages nothing for unsupported scope %j", async input => {
    const { host, proposals } = fixture([publicNode, node("us-state-ai-laws", "CA-SB243-02")]);
    const result = await runOffline(host, "policy-author", "Draft a policy for the requested topic", input);
    expect(result.summary).toMatch(/No applicable policy template/);
    expect(proposals).toEqual([]);
  });

  it("rejects a mixed scope instead of attaching unrelated requirements to the first template", async () => {
    const privacy = node(socId, "P1.1");
    const { host, proposals } = fixture([publicNode, privacy]);
    const result = await runOffline(host, "policy-author", "Draft a policy", { nodeIds: [publicNode.id, privacy.id] });
    expect(result.summary).toMatch(/No single applicable policy template/);
    expect(proposals).toEqual([]);
  });

  it("leaves an unsupported policy task unchanged instead of advancing it to review", async () => {
    const law = node("us-state-ai-laws", "CA-SB243-02");
    const { host, proposals } = fixture([publicNode, law]);
    const task = { id: "policy-task", requirementIds: [law.id], status: "todo" } as ReturnType<AgentHost["tasks"]>[number];
    host.tasks = () => [task];
    const result = await runOffline(host, "policy-author", "Draft policy", { taskId: task.id });
    expect(result.summary).toMatch(/No applicable policy template/);
    expect(task.status).toBe("todo");
    expect(proposals).toEqual([]);
  });

  it("does not bypass disabled framework scope through category selection", async () => {
    const category = { ...node(socId, "CC6"), assessable: false };
    const child = { ...node(socId, "CC6.1"), parentId: category.id };
    const { host, proposals } = fixture([publicNode, category, child], { disabled: [socId] });
    const result = await runOffline(host, "policy-author", "Draft a policy", { category: "CC6" });
    expect(result.summary).toMatch(/No applicable policy template/);
    expect(proposals).toEqual([]);
  });

  it("still drafts a supported policy with resolved source citations", async () => {
    const { host, proposals } = fixture();
    const result = await runOffline(host, "policy-author", "Draft access policy", { nodeIds: [publicNode.id] });
    expect(result.summary).toMatch(/^Drafted/);
    expect(proposals).toHaveLength(1);
    expect(proposals[0]!.type).toBe("create-policy");
    expect(proposals[0]!.citations[0]!.chunkId).toBe(chunk.id);
    expect(proposals[0]!.payload["body"]).toContain("do not establish satisfaction");
    expect(proposals[0]!.payload["body"]).not.toContain("Also satisfies");
  });

  it("surfaces failed corpus provenance instead of claiming a policy was drafted", async () => {
    const { host, proposals } = fixture([publicNode], { chunks: [chunk, { ...chunk, documentId: "other", text: "Duplicate chunk identity" }] });
    const result = await runOffline(host, "policy-author", "Draft access policy", { nodeIds: [publicNode.id] });
    expect(result.summary).toMatch(/^No policy was proposed:.*ambiguous/);
    expect(proposals).toEqual([]);
  });
});

describe("trusted crosswalk proposal boundary", () => {
  const source = node(socId, "CC6.1");
  const mapping: MappingSet = { id: "mapping", title: "Synthetic test mapping", sourceFramework: socId, targetFramework: csfId, authority: "Test publisher", status: "final", mappings: [{ source: source.id, target: publicNode.id, relationship: "equivalent", origin: { documentId: "mapping-document", authority: "Test publisher", locator: "Row 1" } }] };
  it("retains official mapping provenance separately from verified quoted citations", async () => {
    const { host, proposals } = fixture([publicNode, source], { mappings: [mapping] });
    const result = await proposeCrosswalkAssessment(host, publicNode.id);
    expect(result).toMatchObject({ proposalId: "proposal-1", projection: { kind: "implementation-projection", suggested: 3, targetFamily: "csf", confidence: "medium" } });
    expect(proposals[0]!.citations).toEqual([]);
    expect(proposals[0]!.payload).toMatchObject({ current: 3, projection: { sources: [{ citation: { documentId: "mapping-document", locator: "Row 1" }, mappingSetId: "mapping", family: "soc2", levelLabel: "Implemented" }] } });
    expect(proposals[0]!.rationale).toMatch(/not observed evidence/);
  });

  it("does not stage weak or disabled-source projections", async () => {
    for (const options of [{ mappings: [{ ...mapping, status: "draft" as const }] }, { mappings: [mapping], disabled: [socId] }]) {
      const { host, proposals } = fixture([publicNode, source], options);
      expect(await proposeCrosswalkAssessment(host, publicNode.id)).toHaveProperty("error");
      expect(proposals).toEqual([]);
    }
  });
});
