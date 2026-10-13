import { afterEach, describe, expect, it } from "vitest";
import { evidenceReviewScope, type Evidence, type RequirementNode, type CheckResult } from "@visua/core";
import type { AgentHost } from "../src/host.ts";
import { getRequirement, listEvidence, modelEvidenceTitle, proposeEvidence, runChecks } from "../src/tools.ts";

const saved = { ...process.env };
afterEach(() => { process.env = { ...saved }; });
const requirement = {
  id: "nist-csf-2.0:PR.AA-01", frameworkId: "nist-csf-2.0", code: "PR.AA-01",
  title: "Identity inventory", text: "Public requirement text", kind: "subcategory",
  citation: { documentId: "nist-csf-2.0" }, attributes: {}, assessable: true,
} as RequirementNode;
const item = {
  id: "ev_relinked", workspaceId: "ws_provenance", title: "VERBATIM RESTRICTED SOURCE",
  kind: "document", source: "upload", status: "pending-review",
  requirementIds: [requirement.id], contentRequirementIds: ["aicpa-tsc-2017:CC6.1", requirement.id],
  contentSourceDocumentIds: ["tsc-2017-rev-pof-2022"], restrictedContent: true,
  content: "PRIVATE ARTIFACT BODY", data: { confidential: "PRIVATE STRUCTURED OBSERVATION" },
  collectedAt: "2026-10-01T00:00:00.000Z", createdAt: "2026-10-01T00:00:00.000Z",
} as Evidence;
function host(evidence = item): AgentHost {
  return {
    registry: {
      node: (id: string) => id === requirement.id ? requirement : undefined,
      documents: new Map(),
      framework: () => ({ graph: { framework: { family: "csf" } }, ancestors: () => [] }),
      crosswalk: { related: () => [] },
    },
    evidence: () => [evidence], tasks: () => [], state: () => undefined,
    score: () => ({ statuses: new Map() }), step: () => undefined,
  } as unknown as AgentHost;
}

describe("evidence provenance at model boundaries", () => {
  it("retains collection-time restrictions after relinking and removing the source overlay", async () => {
    process.env["VISUA_AGENT_MODE"] = "claude";
    delete process.env["VISUA_AICPA_AI_USE"];
    const api = host();
    for (const output of [await listEvidence.run(api, {}), await getRequirement.run(api, { id: requirement.id })]) {
      const text = JSON.stringify(output);
      expect(text).not.toContain("VERBATIM");
      expect(text).not.toContain("PRIVATE");
      expect(text).toContain("withheld");
      expect(text).toContain(item.id);
      expect(text).toContain("pending-review");
    }
    expect(item.title).toBe("VERBATIM RESTRICTED SOURCE");
  });

  it("honors durable original provenance even when current classification fields are absent", () => {
    process.env["VISUA_AGENT_MODE"] = "claude";
    delete process.env["VISUA_AICPA_AI_USE"];
    const original = {
      ...item, restrictedContent: undefined, contentRequirementIds: undefined, contentSourceDocumentIds: undefined,
      provenance: {
        origin: "upload", recordedBy: "member", recordedAt: item.createdAt,
        originalRequirementIds: ["aicpa-tsc-2017:CC6.1"], sourceDocumentIds: ["tsc-2017-rev-pof-2022"], restrictedContent: true,
      },
    } as Evidence;
    expect(modelEvidenceTitle(host(original), original)).toContain("withheld");
  });

  it("keeps permitted titles while still omitting artifact bodies from model tools", async () => {
    for (const [mode, permission] of [["offline", undefined], ["claude", "permitted"]]) {
      process.env["VISUA_AGENT_MODE"] = mode;
      if (permission) process.env["VISUA_AICPA_AI_USE"] = permission;
      else delete process.env["VISUA_AICPA_AI_USE"];
      const text = JSON.stringify(await listEvidence.run(host(), {}));
      expect(text).toContain(item.title);
      expect(text).not.toContain("PRIVATE");
    }
    process.env["VISUA_AGENT_MODE"] = "claude";
    delete process.env["VISUA_AICPA_AI_USE"];
    const publicItem = { ...item, title: "Customer configuration export", restrictedContent: false, contentSourceDocumentIds: [], contentRequirementIds: [requirement.id] };
    expect(modelEvidenceTitle(host(publicItem), publicItem)).toBe(publicItem.title);
  });

  it("does not let accepted evidence from an old target configuration suppress a new check", async () => {
    const old: Evidence = { ...item, id: "old-check", kind: "automated-check", source: "connector", connectorId: "connector", status: "accepted", sha256: "a".repeat(64), reviewedAt: "2026-10-01T00:00:00.000Z", reviewedBy: "reviewer", data: { checkId: "access" }, provenance: { origin: "connector-check", recordedBy: "connector", recordedAt: item.createdAt, originalRequirementIds: [requirement.id], sourceDocumentIds: [], restrictedContent: false, check: { resultId: "old-result", connectorId: "connector", connectorKind: "fixture", connectorName: "Fixture", checkId: "access", observedAt: item.collectedAt, sourceConfigHash: "old-config" } } };
    old.reviewHistory = [{ id: "review", decision: "accepted", reviewedAt: old.reviewedAt!, reviewedBy: old.reviewedBy!, scope: evidenceReviewScope(old) }];
    const result: CheckResult = { id: "new-result", workspaceId: item.workspaceId, connectorId: "connector", checkId: "access", title: "Access", outcome: "pass", detail: "Observed", requirementIds: [requirement.id], observed: {}, observedAt: new Date().toISOString(), source: { connectorKind: "fixture", connectorName: "Fixture", configHash: "new-config" } };
    const proposed: unknown[] = [];
    const api = { ...host(old), connectors: () => [{ id: "connector", name: "Fixture", status: "active" }], runConnector: async () => [result], propose: async (input: { payload: unknown }) => { proposed.push(input.payload); return { id: "proposal" }; } } as unknown as AgentHost;
    await runChecks.run(api, {});
    expect(proposed).toEqual([{ checkResultId: "new-result" }]);
    proposed.length = 0;
    result.source!.configHash = "old-config";
    await runChecks.run(api, {});
    expect(proposed).toEqual([]);
  });

  it("accepts withdrawal filters and refuses generated check, attestation, or approved-policy claims", () => {
    expect(listEvidence.schema.safeParse({ status: ["withdrawn"] }).success).toBe(true);
    const narrative = { title: "Observed artifact report", requirementIds: [requirement.id], content: "A narrative describing a source artifact for human review." };
    for (const kind of ["automated-check", "attestation", "policy"]) {
      expect(proposeEvidence.schema.safeParse({ ...narrative, kind }).success).toBe(false);
    }
    expect(proposeEvidence.schema.safeParse({ ...narrative, kind: "report" }).success).toBe(true);
  });
});
