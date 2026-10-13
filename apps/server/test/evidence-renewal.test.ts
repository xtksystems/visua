import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { evidenceReviewScope, type Evidence, type FrameworkGraph, type OrganizationProfile, type RequirementNode, type RequirementState, type WorkspaceEvidenceRenewal } from "@visua/core";
import { FrameworkRegistry } from "@visua/frameworks";
import { createApp } from "../src/app.ts";
import { createService } from "../src/context.ts";
import { loadAuthConfig } from "../src/auth/config.ts";
import { AuthService } from "../src/auth/service.ts";
import { workspaceEvidenceRenewal } from "../src/services/evidence-renewal.ts";
import { TestClient } from "./client.ts";
import { testDatabase } from "./db.ts";

const source = FrameworkRegistry.load();
const CSF = "nist-csf-2.0", AI = "nist-ai-rmf", LAW = "us-state-ai-laws", SOC = "aicpa-tsc-2017", SP = "nist-sp-800-53-r5", THREAT = "mitre-atlas";
const A = `${CSF}:PR.AA-01`, B = `${CSF}:PR.AA-02`, W = `${CSF}:PR.AA-03`, GROUP = `${CSF}:PR.AA`;
const ai = source.framework(AI)!.assessable.slice(0, 3);
const [C, D, E] = ai.map((node) => node.id) as [string, string, string];
const laws: RequirementNode[] = source.framework(LAW)!.assessable.slice(0, 4).map((node, i) => ({ ...node, attributes: {
  ...node.attributes, effective: i === 1 ? "2026-10-05" : "2026-01-01", until: i === 2 ? "2026-10-03" : undefined,
  ...(i === 3 ? { roles: ["fixture-unselected-role"] } : {}),
} }));
const [L, FUTURE, ENDED, NO_ROLE] = laws.map((node) => node.id) as [string, string, string, string];
const soc = source.framework(SOC)!.assessable.slice(0, 2).map((node, i) => ({ ...node, attributes: { ...node.attributes, category: i ? "availability" : "security" } }));
const sp = source.framework(SP)!.assessable.slice(0, 2).map((node, i) => ({ ...node, attributes: { ...node.attributes, baselines: i ? ["low"] : [] } }));
const threat = { ...source.framework(THREAT)!.graph.nodes[0]!, assessable: true };
const graph = (frameworkId: string, nodes: RequirementNode[]): FrameworkGraph => ({
  framework: source.framework(frameworkId)!.graph.framework,
  nodes: nodes.map((node) => ({ ...node, parentId: nodes.some((parent) => parent.id === node.parentId) ? node.parentId : null, depth: 0 })),
});
const registry = new FrameworkRegistry({ graphs: [
  graph(CSF, [source.node(GROUP)!, source.node(A)!, source.node(B)!, { ...source.node(W)!, withdrawn: true }]),
  graph(AI, ai), graph(LAW, laws), graph(SOC, soc), graph(SP, sp), graph(THREAT, [threat]),
], mappings: [], chunks: [], manifests: [] });
const db = await testDatabase("evidence_renewal");
const svc = await createService({ database: db.url, registry });
const auth = new AuthService(svc, { ...loadAuthConfig({}), mode: "dev" });
const app = createApp(svc, auth);
const owner = await auth.ensureUser("renewal-owner@example.test", "Renewal owner");
const tenant = await auth.createTenant("Renewal", owner, "fixture");
const profile: OrganizationProfile = { industry: "saas", size: "11-50", dataTypes: [], drivers: [], environments: ["cloud"], maturityTier: 1, guidance: "guided", securityTeamSize: 1 };
const NOW = "2026-10-04T12:00:00.000Z";
const DAY = 86_400_000;
const instant = (days: number) => new Date(new Date(NOW).getTime() + days * DAY).toISOString();
let sequence = 0;

beforeEach(() => { vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(new Date(NOW)); });
afterEach(() => { vi.restoreAllMocks(); vi.useRealTimers(); });
afterAll(async () => { await svc.store.close(); await db.cleanup(); });

async function fixture() {
  const ws = await svc.createWorkspace({ name: `Renewal ${++sequence}`, profile, tenantId: tenant.id, frameworks: [CSF, AI, LAW, SOC, SP] });
  const applicability: NonNullable<(typeof ws.frameworks)[number]["law"]>["applicability"] = {};
  for (const node of laws.slice(0, 3)) {
    const id = String(node.attributes!["lawId"]);
    applicability[id] = { roles: [...new Set([...(applicability[id]?.roles ?? []), ...node.attributes!["roles"] as string[]])], decidedAt: NOW, decidedBy: "fixture" };
  }
  ws.frameworks = ws.frameworks.map((settings) => settings.frameworkId === LAW ? { ...settings, law: { applicability } } : settings);
  ws.frameworks.push({ frameworkId: THREAT, enabled: true, defaultTarget: 2 });
  await svc.store.workspaces.put(ws);
  for (const index of registry.indexes.values()) for (const node of index.graph.nodes) {
    await svc.store.states.put(ws.id, { nodeId: node.id, applicable: true, current: 2, target: 2, priority: "medium", updatedAt: NOW, updatedBy: "fixture" });
  }
  return ws;
}
async function state(ws: string, nodeId: string, patch: Partial<RequirementState>) {
  await svc.store.states.put(ws, { ...(await svc.store.states.get(ws, nodeId))!, ...patch });
}
async function artifact(ws: string, ids: string[], end?: number, status: "accepted" | "rejected" | "pending-review" = "accepted", start = -10): Promise<Evidence> {
  const value = await svc.createEvidence(ws, { title: `Artifact ${++sequence}`, content: "Observed configuration", requirementIds: ids, collectedAt: instant(start), validUntil: end === undefined ? undefined : instant(end) });
  return status === "pending-review" ? value : svc.reviewEvidence(ws, value.id, status, "reviewer", undefined, evidenceReviewScope(value));
}

describe(`evidence renewal (${db.dialect})`, () => {
  it("keeps review separate and counts current uncovered context for every expired review state", async () => {
    const ws = await fixture();
    const pending = await artifact(ws.id, [A, A, C], -1, "pending-review");
    const rejected = await artifact(ws.id, [A], -1, "rejected");
    const expired = await artifact(ws.id, [B], -1);
    await artifact(ws.id, [B]);
    const future = await artifact(ws.id, [A], 3, "pending-review", 1);
    const result = await workspaceEvidenceRenewal(svc, ws);
    expect(result.buckets.expired.evidenceIds).toEqual([pending.id, rejected.id, expired.id].sort());
    expect(result.buckets.expired.uncoveredRequirementIds).toEqual([A, C]);
    expect(result.items.find((item) => item.id === pending.id)).toMatchObject({ status: "pending-review", validity: "expired", acceptanceBound: false, currentlyUncoveredRequirementIds: [A, C] });
    expect(result.items.find((item) => item.id === rejected.id)).toMatchObject({ status: "rejected", validity: "expired", currentlyUncoveredRequirementIds: [A] });
    expect(result.items.find((item) => item.id === expired.id)).toMatchObject({ status: "accepted", validity: "expired", currentlyUncoveredRequirementIds: [], currentlyCoveredRequirementIds: [B] });
    expect(result.items.find((item) => item.id === future.id)).toMatchObject({ validity: "not-yet-valid", currentlyValid: false, losingCoverageRequirementIds: [] });
  });

  it("deduplicates first-loss impact across alternatives and cumulative windows", async () => {
    const ws = await fixture();
    const early = await artifact(ws.id, [A, C], 3);
    const later = await artifact(ws.id, [A, A], 10);
    const same = await artifact(ws.id, [A], 10);
    const chain = await artifact(ws.id, [C], 20, "accepted", 2);
    const result = await workspaceEvidenceRenewal(svc, ws);
    expect(result.buckets.next7days).toEqual({ evidenceIds: [early.id], uncoveredRequirementIds: [], losingCoverageRequirementIds: [] });
    expect(result.buckets.next30days.losingCoverageRequirementIds).toEqual([A, C]);
    expect(result.items.find((item) => item.id === early.id)).toMatchObject({ losingCoverageRequirementIds: [], continuingCoverageRequirementIds: [A, C] });
    expect(result.items.find((item) => item.id === later.id)?.losingCoverageRequirementIds).toEqual([A]);
    expect(result.items.find((item) => item.id === same.id)?.losingCoverageRequirementIds).toEqual([A]);
    expect(result.items.find((item) => item.id === chain.id)).toMatchObject({ currentlyValid: false, validity: "not-yet-valid", losingCoverageRequirementIds: [C] });
    const metadata = await svc.store.evidence.metadataList(ws.id);
    vi.spyOn(svc.store.evidence, "metadataList").mockResolvedValue([...metadata].reverse());
    expect(await workspaceEvidenceRenewal(svc, ws)).toEqual(result);
  });

  it("does not conceal a first gap with unreachable future evidence or unbound acceptance", async () => {
    const ws = await fixture();
    const early = await artifact(ws.id, [A, B], 3);
    await artifact(ws.id, [A], 10, "accepted", 5);
    const unbound = await artifact(ws.id, [B], 20);
    await svc.store.evidence.put({ ...unbound, reviewHistory: [] });
    const result = await workspaceEvidenceRenewal(svc, ws);
    expect(result.buckets.next7days.losingCoverageRequirementIds).toEqual([A, B]);
    expect(result.buckets.next30days.losingCoverageRequirementIds).toEqual([A, B]);
    expect(result.items.find((item) => item.id === early.id)?.losingCoverageRequirementIds).toEqual([A, B]);
    expect(result.items.find((item) => item.id === unbound.id)).toMatchObject({ status: "accepted", acceptanceBound: false, currentlyValid: false, losingCoverageRequirementIds: [] });
  });

  it("limits impact to current scope while retaining excluded, group and unknown link context", async () => {
    const ws = await fixture();
    await state(ws.id, B, { applicable: false });
    await state(ws.id, D, { userExclusion: { rationale: "Documented exclusion", at: NOW, by: "reviewer" } });
    await state(ws.id, E, { statusOverride: "not-applicable" });
    ws.frameworks = ws.frameworks.map((settings) => settings.frameworkId === SOC ? { ...settings, soc2: { categories: ["security"], reportType: "type1" } }
      : settings.frameworkId === SP ? { ...settings, rmf: { ...settings.rmf!, baseline: "low", tailoring: [{ nodeId: sp[1]!.id, action: "remove", rationale: "Test scope" }] } } : settings);
    await svc.store.workspaces.put(ws);
    const excluded = [B, D, E, W, FUTURE, ENDED, NO_ROLE, soc[1]!.id, sp[0]!.id, sp[1]!.id, threat.id];
    const mixed = await artifact(ws.id, [A, C, L, GROUP, ...excluded.filter((id) => id !== threat.id)], -1, "pending-review");
    await svc.store.evidence.put({ ...mixed, requirementIds: [...mixed.requirementIds, threat.id, "missing:unknown"] });
    const group = await artifact(ws.id, [GROUP], -1);
    const unlinked = await artifact(ws.id, [], -1);
    let result = await workspaceEvidenceRenewal(svc, ws);
    expect(result.buckets.expired.uncoveredRequirementIds).toEqual(expect.arrayContaining([A, C, L]));
    expect(result.buckets.expired.uncoveredRequirementIds).toHaveLength(3);
    const row = result.items.find((item) => item.id === mixed.id)!;
    expect(row.context).toEqual({ directInScope: 3, outOfScope: excluded.length, groups: 1, unknown: 1 });
    expect(row.requirements.filter((ref) => !ref.inScope).map((ref) => ref.id).sort()).toEqual(excluded.sort());
    expect(result.items.find((item) => item.id === group.id)).toMatchObject({ context: { directInScope: 0, groups: 1 }, currentlyUncoveredRequirementIds: [] });
    expect(result.items.find((item) => item.id === unlinked.id)?.context).toEqual({ directInScope: 0, outOfScope: 0, groups: 0, unknown: 0 });
    ws.frameworks = ws.frameworks.map((settings) => settings.frameworkId === CSF ? { ...settings, enabled: false } : settings);
    result = await workspaceEvidenceRenewal(svc, ws);
    expect(result.buckets.expired.uncoveredRequirementIds).not.toContain(A);
    expect(result.items.find((item) => item.id === mixed.id)!.requirements.find((ref) => ref.id === A)?.inScope).toBe(false);
  });

  it("keeps raw invalid dates and explicit expired-without-deadline records out of date buckets", async () => {
    const ws = await fixture();
    const invalid = await artifact(ws.id, [A], 3);
    await svc.store.evidence.put({ ...invalid, validUntil: "invalid legacy expiry" });
    const marked = await artifact(ws.id, [B]);
    await svc.store.evidence.put({ ...marked, status: "expired" });
    const result = await workspaceEvidenceRenewal(svc, ws);
    expect(result.unclassified).toEqual({ invalidWindowIds: [invalid.id], noExpiryIds: [marked.id], markedExpiredWithoutDeadlineIds: [marked.id] });
    expect(Object.values(result.buckets).flatMap((bucket) => bucket.evidenceIds)).toEqual([]);
    expect(result.items.find((item) => item.id === invalid.id)).toMatchObject({ validUntil: "invalid legacy expiry", validity: "invalid", acceptanceBound: false, currentlyValid: false });
    expect(result.items.find((item) => item.id === marked.id)).toMatchObject({ status: "expired", validity: "current", currentlyValid: false });
  });

  it("reads metadata only and leaves workspace revision and audit untouched", async () => {
    const ws = await fixture();
    await artifact(ws.id, [A], 3);
    const file = await svc.createFileEvidence(ws.id, { title: "File", fileName: "evidence.txt", mediaType: "text/plain", requirementIds: [B], collectedAt: instant(-1), validUntil: instant(3) }, new TextEncoder().encode("private artifact bytes"));
    await svc.reviewEvidence(ws.id, file.id, "accepted", "reviewer", undefined, evidenceReviewScope(file));
    const before = { rev: await svc.store.workspaces.rev(ws.id), audit: await svc.store.activity.head(ws.id) };
    const list = vi.spyOn(svc.store.evidence, "list").mockRejectedValue(new Error("No body reads"));
    const get = vi.spyOn(svc.store.evidence, "get").mockRejectedValue(new Error("No body reads"));
    const recent = vi.spyOn(svc.store.evidence, "recent").mockRejectedValue(new Error("No body reads"));
    const blob = vi.spyOn(svc.blobs, "get").mockRejectedValue(new Error("No file reads"));
    const result = await workspaceEvidenceRenewal(svc, ws);
    expect(result.buckets.next7days.losingCoverageRequirementIds).toEqual([A, B]);
    for (const spy of [list, get, recent, blob]) expect(spy).not.toHaveBeenCalled();
    expect({ rev: await svc.store.workspaces.rev(ws.id), audit: await svc.store.activity.head(ws.id) }).toEqual(before);
    for (const row of result.items) for (const key of ["content", "data", "artifact", "sha256", "reviewHistory"]) expect(row).not.toHaveProperty(key);
  });

  it("uses workspace read access, preserves tenant isolation, and sends a fresh noncached route response", async () => {
    const ws = await fixture();
    const value = await artifact(ws.id, [A], 0);
    const reader = new TestClient(app);
    const login = await reader.devLogin("renewal-reader@example.test", "Reader");
    await svc.store.identity.memberships.put({ tenantId: tenant.id, userId: login.json.user.id, role: "viewer", createdAt: NOW, updatedAt: NOW });
    const path = `/api/workspaces/${ws.id}/evidence/renewal`;
    const response = await reader.get<WorkspaceEvidenceRenewal>(path);
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(response.json.asOf).toBe(NOW);
    expect(response.json.buckets.next7days.evidenceIds).toEqual([value.id]);
    vi.setSystemTime(new Date(new Date(NOW).getTime() + 1));
    expect((await reader.get<WorkspaceEvidenceRenewal>(path)).json.buckets.expired.evidenceIds).toEqual([value.id]);
    const outsider = new TestClient(app);
    await outsider.devLogin("renewal-outsider@example.test", "Outsider");
    expect((await outsider.get(path)).status).toBe(404);
    expect((await new TestClient(app).get(path)).status).toBe(401);
  });
});
