import { afterAll, afterEach, describe, expect, it, vi } from "vitest";
import { evidenceReviewScope, type OrganizationProfile } from "@visua/core";
import { FrameworkRegistry } from "@visua/frameworks";
import { createService } from "../src/context.ts";
import { workspaceSummary } from "../src/services/views.ts";
import { workspaceAttention } from "../src/services/attention.ts";
import { testDatabase } from "./db.ts";

const source = FrameworkRegistry.load();
const fw = "nist-csf-2.0", id = `${fw}:PR.AA-01`;
const registry = new FrameworkRegistry({ graphs: [{ framework: source.framework(fw)!.graph.framework, nodes: [{ ...source.node(id)!, parentId: null, depth: 0 }] }], mappings: [], chunks: [], manifests: [] });
const db = await testDatabase("overview");
const svc = await createService({ database: db.url, registry });
const profile: OrganizationProfile = { industry: "saas", size: "11-50", dataTypes: [], drivers: [], environments: ["cloud"], maturityTier: 1, guidance: "guided", securityTeamSize: 1 };
afterEach(() => { vi.restoreAllMocks(); vi.useRealTimers(); });
afterAll(async () => { await svc.store.close(); await db.cleanup(); });

describe(`overview metrics (${db.dialect})`, () => {
  it("reflects evidence expiry within the score cache hour using metadata, matching the attention queue", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-04T12:00:00Z"));
    const ws = await svc.createWorkspace({ name: "Expiry metrics", profile, frameworks: [fw] });
    await svc.updateState(ws.id, id, { current: 2, target: 2 });
    const evidence = await svc.createEvidence(ws.id, { title: "Observed access", requirementIds: [id], content: "Configured access", collectedAt: "2026-10-04T11:00:00Z", validUntil: "2026-10-04T12:05:00Z" });
    await svc.reviewEvidence(ws.id, evidence.id, "accepted", "reviewer", undefined, evidenceReviewScope(evidence));
    expect((await svc.score(ws.id, fw)).overall.evidenceCoverage).toBe(1);
    vi.setSystemTime(new Date("2026-10-04T12:06:00Z"));
    const bodyRead = vi.spyOn(svc.store.evidence, "get").mockRejectedValue(new Error("Overview must not hydrate evidence"));
    const listRead = vi.spyOn(svc.store.evidence, "list").mockRejectedValue(new Error("Overview must not hydrate evidence"));
    const summary = await workspaceSummary(svc, await svc.workspace(ws.id));
    const queue = await workspaceAttention(svc, await svc.workspace(ws.id));
    expect(summary.asOf).toBe("2026-10-04T12:06:00.000Z");
    expect(summary.frameworks[0]).toMatchObject({ readiness: 1, evidenceCoverage: 0, total: 1, counts: { "at-risk": 1 } });
    expect(queue.items.some(item => item.kind === "expired-evidence")).toBe(true);
    expect(bodyRead).not.toHaveBeenCalled();
    expect(listRead).not.toHaveBeenCalled();
  });
});
