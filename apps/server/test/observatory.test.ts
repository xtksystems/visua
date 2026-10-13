import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { evidenceReviewScope, type Evidence, type FrameworkGraph, type OrganizationProfile, type RequirementNode, type RequirementState } from "@visua/core";
import { FrameworkRegistry } from "@visua/frameworks";
import { createApp } from "../src/app.ts";
import { createService } from "../src/context.ts";
import { loadAuthConfig } from "../src/auth/config.ts";
import { AuthService } from "../src/auth/service.ts";
import { frameworkState } from "../src/services/views.ts";
import { workspaceEvidenceRenewal } from "../src/services/evidence-renewal.ts";
import { TestClient } from "./client.ts";
import { testDatabase } from "./db.ts";

const source = FrameworkRegistry.load();
const CSF = "nist-csf-2.0", AI = "nist-ai-rmf", LAW = "us-state-ai-laws", SOC = "aicpa-tsc-2017", SP = "nist-sp-800-53-r5", THREAT = "mitre-atlas";
const [A, B, C, D, W] = ["01", "02", "03", "04", "05"].map((code) => `${CSF}:PR.AA-${code}`) as [string, string, string, string, string];
const GROUP = `${CSF}:PR.AA`;
const ai = source.framework(AI)!.assessable[0]!;
const laws: RequirementNode[] = source.framework(LAW)!.assessable.slice(0, 4).map((node, i) => ({ ...node, attributes: {
  ...node.attributes, effective: i === 1 ? "2026-10-05" : "2026-01-01", until: i === 2 ? "2026-10-03" : undefined,
  ...(i === 3 ? { roles: ["fixture-unselected-role"] } : {}),
} }));
const [L, FUTURE, ENDED, NO_ROLE] = laws.map((node) => node.id) as [string, string, string, string];
const soc = source.framework(SOC)!.assessable.slice(0, 2).map((node, i) => ({ ...node, attributes: { ...node.attributes, category: i ? "availability" : "security" } }));
const sp = source.framework(SP)!.assessable.slice(0, 2).map((node, i) => ({ ...node, attributes: { ...node.attributes, baselines: i ? ["low"] : [] } }));
const threat = { ...source.framework(THREAT)!.graph.nodes[0]!, assessable: true };
const graph = (id: string, nodes: RequirementNode[]): FrameworkGraph => ({
  framework: source.framework(id)!.graph.framework,
  nodes: nodes.map((node) => ({ ...node, parentId: nodes.some((parent) => parent.id === node.parentId) ? node.parentId : null, depth: 0 })),
});
const registry = new FrameworkRegistry({ graphs: [
  graph(CSF, [source.node(GROUP)!, ...[A, B, C, D].map((id) => source.node(id)!), { ...source.node(W)!, withdrawn: true }]),
  graph(AI, [ai]), graph(LAW, laws), graph(SOC, soc), graph(SP, sp), graph(THREAT, [threat]),
], mappings: [], chunks: [], manifests: [] });
const db = await testDatabase("observatory");
const svc = await createService({ database: db.url, registry });
const auth = new AuthService(svc, { ...loadAuthConfig({}), mode: "dev" });
const app = createApp(svc, auth);
const owner = await auth.ensureUser("observatory-owner@example.test", "Shared name");
const tenant = await auth.createTenant("Observatory", owner, "fixture");
const member = await auth.ensureUser("observatory-member@example.test", "Shared name");
await auth.grantMembership(tenant.id, member, "contributor", "fixture");
const profile: OrganizationProfile = { industry: "saas", size: "11-50", dataTypes: [], drivers: [], environments: ["cloud"], maturityTier: 1, guidance: "guided", securityTeamSize: 1 };
const NOW = "2026-10-04T12:00:00.000Z";
let sequence = 0;

beforeEach(() => { vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(new Date(NOW)); });
afterEach(() => { vi.restoreAllMocks(); vi.useRealTimers(); });
afterAll(async () => { await svc.store.close(); await db.cleanup(); });

async function fixture() {
  const ws = await svc.createWorkspace({ name: `Observatory ${++sequence}`, profile, tenantId: tenant.id, frameworks: [CSF, AI, LAW, SOC, SP] });
  const applicability: NonNullable<(typeof ws.frameworks)[number]["law"]>["applicability"] = {};
  for (const node of laws.slice(0, 3)) {
    const id = String(node.attributes!["lawId"]);
    applicability[id] = { roles: [...new Set([...(applicability[id]?.roles ?? []), ...node.attributes!["roles"] as string[]])], decidedAt: NOW, decidedBy: "fixture" };
  }
  ws.frameworks = ws.frameworks.map((settings) => settings.frameworkId === LAW ? { ...settings, law: { applicability } } : settings);
  await svc.store.workspaces.put(ws);
  for (const index of registry.indexes.values()) for (const node of index.graph.nodes) {
    if (index.id === THREAT) continue;
    await svc.store.states.put(ws.id, { nodeId: node.id, applicable: true, current: 2, target: 2, priority: "medium", updatedAt: NOW, updatedBy: "fixture" });
  }
  return ws;
}
async function state(ws: string, nodeId: string, patch: Partial<RequirementState>) {
  await svc.store.states.put(ws, { ...(await svc.store.states.get(ws, nodeId))!, ...patch });
}
async function artifact(ws: string, ids: string[], options: { end?: string; start?: string; status?: "accepted" | "rejected" | "pending-review" } = {}): Promise<Evidence> {
  const value = await svc.createEvidence(ws, { title: `Artifact ${++sequence}`, content: "Observed configuration", requirementIds: ids, collectedAt: options.start ?? "2026-10-01T00:00:00Z", validUntil: options.end });
  return options.status === "pending-review" ? value : svc.reviewEvidence(ws, value.id, options.status ?? "accepted", "reviewer", options.status === "rejected" ? "Artifact did not meet the requested scope" : undefined, evidenceReviewScope(value));
}
async function normalBundle(ws: Awaited<ReturnType<typeof fixture>>, id = CSF) {
  const bundle = await frameworkState(svc, ws, id);
  if (!("asOf" in bundle)) throw new Error("Expected normal assessment bundle");
  return bundle;
}

describe(`Observatory assessment bundles (${db.dialect})`, () => {
  it("updates risk and evidence together within the cached score hour", async () => {
    const ws = await fixture();
    await artifact(ws.id, [A], { end: "2026-10-04T12:05:00Z" });
    expect((await svc.score(ws.id, CSF)).statuses.get(A)?.status).toBe("implemented");
    expect((await normalBundle(ws)).units[A]).toMatchObject({ status: "implemented", evidence: 1, inScope: true });

    vi.setSystemTime(new Date("2026-10-04T12:06:00Z"));
    // The service cache remains stale; the Observatory must derive a fresh score.
    expect((await svc.score(ws.id, CSF)).statuses.get(A)?.status).toBe("implemented");
    const bundle = await normalBundle(ws);
    expect(bundle.asOf).toBe("2026-10-04T12:06:00.000Z");
    expect(bundle.units[A]).toMatchObject({ status: "at-risk", evidence: 0, inScope: true });
    expect(bundle.units[A]!.reasons).toContain("1 evidence item(s) expired");
    expect(bundle.overall.counts["at-risk"]).toBe(1);
    expect(bundle.overall.evidenceCoverage).toBe(0);
    expect(bundle.groups[GROUP]!.status).toBe("at-risk");
  });

  it("counts current valid direct artifacts independently of status and group links", async () => {
    const ws = await fixture();
    await state(ws.id, A, { current: 0 });
    const direct = await artifact(ws.id, [A]);
    await svc.store.evidence.put({ ...direct, requirementIds: [A, A] });
    await artifact(ws.id, [A]);
    await artifact(ws.id, [B], { end: "2026-10-03T00:00:00Z" });
    await artifact(ws.id, [B]);
    await artifact(ws.id, [GROUP]);
    await artifact(ws.id, [C], { status: "pending-review" });
    await artifact(ws.id, [C], { status: "rejected" });
    await artifact(ws.id, [C], { start: "2026-10-05T00:00:00Z" });
    const unbound = await artifact(ws.id, [C]);
    await svc.store.evidence.put({ ...unbound, reviewHistory: [] });

    const { units, overall } = await normalBundle(ws);
    expect(units[A]).toMatchObject({ current: 0, status: "not-started", evidence: 2 });
    expect(units[B]).toMatchObject({ status: "at-risk", evidence: 1 });
    expect(units[C]).toMatchObject({ status: "implemented", evidence: 0 });
    expect(units[D]).toMatchObject({ evidence: 0 });
    expect(units[GROUP]).toMatchObject({ evidence: 1, inScope: false });
    expect(overall.evidenceCoverage).toBe(0.5);
  });

  it("returns stored member identities without inferring assignment from matching labels", async () => {
    const ws = await fixture();
    await svc.updateState(ws.id, A, { ownerUserId: owner.id });
    await svc.updateState(ws.id, B, { ownerUserId: member.id });
    await svc.updateState(ws.id, C, { owner: "Shared name" });
    const { units } = await normalBundle(ws);
    expect(units[A]).toMatchObject({ owner: "Shared name", ownerUserId: owner.id });
    expect(units[B]).toMatchObject({ owner: "Shared name", ownerUserId: member.id });
    expect(units[C]!.owner).toBe("Shared name");
    expect(units[C]!.ownerUserId).toBeUndefined();
    expect(Object.entries(units).filter(([, unit]) => unit.ownerUserId === owner.id).map(([id]) => id)).toEqual([A]);
  });

  it("matches renewal scope for disabled, excluded, withdrawn and dynamically scoped requirements", async () => {
    const ws = await fixture();
    await state(ws.id, B, { applicable: false });
    await state(ws.id, C, { userExclusion: { rationale: "Documented exclusion", at: NOW, by: "reviewer" } });
    await state(ws.id, D, { statusOverride: "not-applicable" });
    ws.frameworks = ws.frameworks.map((settings) => settings.frameworkId === AI ? { ...settings, enabled: false }
      : settings.frameworkId === SOC ? { ...settings, soc2: { categories: ["security"], reportType: "type1" } }
      : settings.frameworkId === SP ? { ...settings, rmf: { ...settings.rmf!, baseline: "low", tailoring: [{ nodeId: sp[1]!.id, action: "remove", rationale: "Test scope" }] } } : settings);
    await svc.store.workspaces.put(ws);
    const included = [A, L, soc[0]!.id];
    const excluded = [B, C, D, W, ai.id, FUTURE, ENDED, NO_ROLE, soc[1]!.id, sp[0]!.id, sp[1]!.id];
    const evidence = await artifact(ws.id, [...included, ...excluded], { status: "pending-review" });
    const bundles = await Promise.all([CSF, AI, LAW, SOC, SP].map((id) => normalBundle(ws, id)));
    const units = Object.assign({}, ...bundles.map((bundle) => bundle.units)) as (typeof bundles)[number]["units"];
    expect(Object.entries(units).filter(([, unit]) => unit.inScope).map(([id]) => id).sort()).toEqual(included.sort());
    for (const id of [...excluded, GROUP]) expect(units[id]!.inScope).toBe(false);
    const renewal = await workspaceEvidenceRenewal(svc, ws);
    expect(renewal.items.find((item) => item.id === evidence.id)!.requirements.filter((ref) => ref.inScope).map((ref) => ref.id).sort()).toEqual(included.sort());
  });

  it("moves upcoming laws into current scope at the response date", async () => {
    const ws = await fixture();
    const before = await normalBundle(ws, LAW);
    expect(before.units[FUTURE]).toMatchObject({ applicable: true, inScope: false, upcoming: "2026-10-05" });
    expect(before.units[ENDED]).toMatchObject({ applicable: false, inScope: false });
    vi.setSystemTime(new Date("2026-10-05T00:00:00Z"));
    const after = await normalBundle(ws, LAW);
    expect(after.asOf).toBe("2026-10-05T00:00:00.000Z");
    expect(after.units[FUTURE]).toMatchObject({ applicable: true, inScope: true });
    expect(after.units[FUTURE]).not.toHaveProperty("upcoming");
    expect(after.upcoming?.total).toBe(0);
    expect(after.overall.total).toBe(before.overall.total + 1);
  });

  it("uses metadata only without changing revisions or audit history", async () => {
    const ws = await fixture();
    await artifact(ws.id, [A]);
    const file = await svc.createFileEvidence(ws.id, { title: "File", fileName: "evidence.txt", mediaType: "text/plain", requirementIds: [B], collectedAt: "2026-10-01T00:00:00Z" }, new TextEncoder().encode("private artifact bytes"));
    await svc.reviewEvidence(ws.id, file.id, "accepted", "reviewer", undefined, evidenceReviewScope(file));
    const before = { rev: await svc.store.workspaces.rev(ws.id), audit: await svc.store.activity.head(ws.id) };
    const reads = [
      vi.spyOn(svc.store.evidence, "list").mockRejectedValue(new Error("No body reads")),
      vi.spyOn(svc.store.evidence, "get").mockRejectedValue(new Error("No body reads")),
      vi.spyOn(svc.store.evidence, "recent").mockRejectedValue(new Error("No body reads")),
      vi.spyOn(svc.blobs, "get").mockRejectedValue(new Error("No file reads")),
    ];
    const { units } = await normalBundle(ws);
    expect(units[A]!.evidence).toBe(1);
    expect(units[B]!.evidence).toBe(1);
    for (const spy of reads) expect(spy).not.toHaveBeenCalled();
    expect({ rev: await svc.store.workspaces.rev(ws.id), audit: await svc.store.activity.head(ws.id) }).toEqual(before);
  });

  it("keeps threat bundles free of assessment scope and assignment fields", async () => {
    const ws = await fixture();
    const score = vi.spyOn(svc, "scoreOf");
    const bundle = await frameworkState(svc, ws, THREAT);
    expect(bundle).toHaveProperty("threat");
    expect(bundle).not.toHaveProperty("asOf");
    expect(bundle.units[threat.id]).toHaveProperty("coverage");
    expect(bundle.units[threat.id]).not.toHaveProperty("inScope");
    expect(bundle.units[threat.id]).not.toHaveProperty("ownerUserId");
    expect(score).not.toHaveBeenCalled();
  });

  it("retains workspace read access and tenant isolation on the state endpoint", async () => {
    const ws = await fixture();
    await svc.updateState(ws.id, A, { ownerUserId: owner.id });
    const reader = new TestClient(app);
    const login = await reader.devLogin("observatory-reader@example.test", "Reader");
    await svc.store.identity.memberships.put({ tenantId: tenant.id, userId: login.json.user.id, role: "viewer", createdAt: NOW, updatedAt: NOW });
    const path = `/api/workspaces/${ws.id}/frameworks/${CSF}/state`;
    const response = await reader.get<Awaited<ReturnType<typeof normalBundle>>>(path);
    expect(response.status).toBe(200);
    expect(response.json.asOf).toBe(NOW);
    expect(response.json.units[A]).toMatchObject({ ownerUserId: owner.id, inScope: true });
    const outsider = new TestClient(app);
    await outsider.devLogin("observatory-outsider@example.test", "Outsider");
    expect((await outsider.get(path)).status).toBe(404);
    expect((await new TestClient(app).get(path)).status).toBe(401);
  });
});
