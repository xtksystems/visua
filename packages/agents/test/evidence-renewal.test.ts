import { afterEach, describe, expect, it, vi } from "vitest";
import { evidenceReviewScope, type Evidence, type Proposal, type RequirementState, type Workspace } from "@visua/core";
import { FrameworkRegistry } from "@visua/frameworks";
import type { AgentHost, ProposalInput } from "../src/host.ts";
import { PLAYBOOKS } from "../src/offline.ts";

const registry = FrameworkRegistry.load();
const A = "nist-csf-2.0:PR.AA-01", B = "nist-csf-2.0:PR.AA-02";
const at = "2026-06-10T00:00:00.000Z";
function artifact(id: string, patch: Partial<Evidence> = {}): Evidence {
  const e: Evidence = {
    id, workspaceId: "ws_renewal", title: id, kind: "document", source: "manual",
    status: "accepted", requirementIds: [A, B], collectedAt: "2026-01-01T00:00:00.000Z",
    validUntil: "2026-06-01T00:00:00.000Z", createdAt: "2026-01-01T00:00:00.000Z",
    sha256: "a".repeat(64), reviewedBy: "reviewer", reviewedAt: "2026-06-01T00:00:00.000Z", ...patch,
  };
  e.reviewHistory = [{ id: `review-${id}`, decision: "accepted", reviewedBy: e.reviewedBy!, reviewedAt: e.reviewedAt!, scope: evidenceReviewScope(e) }];
  return e;
}
async function collect(evidence: Evidence[], nodeIds?: string[]) {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(at);
  const proposals: ProposalInput[] = [];
  const host = {
    registry, workspace: () => ({ frameworks: [{ frameworkId: "nist-csf-2.0", enabled: true }] } as Workspace),
    state: (id: string) => ({ nodeId: id, applicable: true, current: 1, target: 2 } as RequirementState),
    evidence: () => evidence, tasks: () => [], connectors: () => [], step: () => undefined,
    propose: async (input: ProposalInput) => { proposals.push(input); return { id: "proposal", status: "pending" } as Proposal; },
  } as unknown as AgentHost;
  const summary = await PLAYBOOKS["evidence-collector"](host, "Renew evidence", nodeIds ? { nodeIds } : {});
  return { proposals, summary };
}
afterEach(() => vi.useRealTimers());

describe("offline renewal proposals", () => {
  it("omits fully replaced artifacts and preserves uncovered requirements of a partial replacement", async () => {
    const old = artifact("Old observation");
    const replacement = artifact("Current observation", { supersedesId: old.id, validUntil: "2027-01-01T00:00:00.000Z" });
    expect((await collect([old, replacement])).proposals).toEqual([]);
    const partial = artifact(replacement.id, { supersedesId: old.id, requirementIds: [A], validUntil: replacement.validUntil });
    const result = await collect([old, partial]);
    expect(result.proposals).toHaveLength(1);
    expect(result.proposals[0]!.payload["requirementIds"]).toEqual([B]);
    expect(result.proposals[0]!.payload["description"]).toContain("expired on");
    expect((await collect([old, partial], [A])).proposals).toEqual([]);
  });

  it("keeps renewal work visible for a withdrawn replacement without duplicating linked work", async () => {
    const old = artifact("Old observation");
    const duplicate = artifact("Another old observation");
    const withdrawn = artifact("Withdrawn replacement", { supersedesId: old.id, status: "withdrawn", validUntil: "2027-01-01T00:00:00.000Z" });
    const result = await collect([old, duplicate, withdrawn], [B]);
    expect(result.proposals).toHaveLength(1);
    expect(result.proposals[0]!.payload["requirementIds"]).toEqual([B]);
    expect(result.summary).toContain("proposed 1 renewal task(s)");
  });

  it("does not copy restricted artifact titles into tasks whose current links are public", async () => {
    const old = artifact("ev_relinked", {
      title: "RESTRICTED COLLECTION SOURCE TEXT", requirementIds: [A],
      contentRequirementIds: ["aicpa-tsc-2017:CC6.1", A], restrictedContent: true,
    });
    const result = await collect([old]);
    expect(result.proposals).toHaveLength(1);
    expect(JSON.stringify(result.proposals)).not.toContain(old.title);
    expect(result.proposals[0]!.payload["description"]).toContain(old.id);
  });
});
