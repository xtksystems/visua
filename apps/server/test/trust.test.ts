import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { effectiveEvidenceState, evidenceReviewScope, type CheckResult, type FrameworkGraph, type OrganizationProfile, type RequirementNode } from "@visua/core";
import { FrameworkRegistry } from "@visua/frameworks";
import { createApp } from "../src/app.ts";
import { loadAuthConfig } from "../src/auth/config.ts";
import { AuthService } from "../src/auth/service.ts";
import { createService } from "../src/context.ts";
import { latestMonitoringChecks, publicTrust } from "../src/services/trust.ts";
import { workspaceSummary } from "../src/services/views.ts";
import { TestClient } from "./client.ts";
import { testDatabase } from "./db.ts";

const source = FrameworkRegistry.load();
const CSF = "nist-csf-2.0", AI = "nist-ai-rmf", RMF = "nist-rmf", LAW = "us-state-ai-laws", THREAT = "mitre-atlas";
const A = `${CSF}:PR.AA-01`, B = `${CSF}:PR.AA-02`;
const lawNodes = source.framework(LAW)!.assessable.slice(0, 2).map((node, i) => ({ ...node, attributes: { ...node.attributes, effective: i ? "2026-10-14" : "2026-01-01", until: undefined } }));
const graph = (id: string, nodes: RequirementNode[]): FrameworkGraph => ({ framework: source.framework(id)!.graph.framework, nodes: nodes.map(node => ({ ...node, parentId: null, depth: 0 })) });
const registry = new FrameworkRegistry({ graphs: [
  graph(CSF, [source.node(A)!, source.node(B)!]), graph(AI, source.framework(AI)!.assessable.slice(0, 1)),
  graph(RMF, source.framework(RMF)!.assessable.slice(0, 1)), graph(LAW, lawNodes),
  graph(THREAT, [{ ...source.framework(THREAT)!.graph.nodes[0]!, assessable: true }]),
], mappings: [], chunks: [], manifests: [] });
const db = await testDatabase("trust");
const svc = await createService({ database: db.url, registry });
const auth = new AuthService(svc, { ...loadAuthConfig({}), mode: "dev" });
const app = createApp(svc, auth);
const owner = new TestClient(app);
const login = await owner.devLogin("public-measures@example.test", "Trust owner");
const visitor = new TestClient(app);
const NOW = "2026-10-13T12:00:00.000Z";
const profile: OrganizationProfile = { industry: "saas", size: "11-50", dataTypes: [], drivers: [], environments: ["cloud"], maturityTier: 1, guidance: "guided", securityTeamSize: 1 };
let sequence = 0;
beforeEach(async () => { vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(new Date(NOW)); await owner.devLogin("public-measures@example.test", "Trust owner"); });
afterEach(() => { vi.restoreAllMocks(); vi.useRealTimers(); });
afterAll(async () => { await svc.store.close(); await db.cleanup(); });

async function fixture() {
  const ws = await svc.createWorkspace({ name: `Public measures ${++sequence}`, tenantId: login.json.activeTenant!.id, profile, frameworks: [CSF, AI, RMF, LAW] });
  ws.trustCenter = { enabled: true, headline: "Our organization-authored claim" };
  await svc.store.workspaces.put(ws);
  for (const index of registry.indexes.values()) for (const node of index.assessable) await svc.store.states.put(ws.id, { nodeId: node.id, current: node.id === B ? 0 : 2, target: 2, priority: node.id === B ? "high" : "medium", applicable: true, updatedAt: NOW, updatedBy: "fixture" });
  return ws;
}
function check(workspaceId: string, id: string, connectorId: string, outcome: CheckResult["outcome"], configHash = "config-a", observedAt = NOW): CheckResult {
  return { id, workspaceId, connectorId, checkId: "tls", title: "TLS check", outcome, detail: "PRIVATE DETAILS", requirementIds: [A], observed: { url: "https://private-target.example", token: "PRIVATE TOKEN" }, observedAt, source: { connectorKind: "web", connectorName: "PRIVATE CONNECTOR", configHash } };
}

describe(`supported public measures (${db.dialect})`, () => {
  it("keeps opposite targets and edited configurations separate, selecting by observation time", () => {
    const records = [check("ws", "old", "first", "fail", "a", "2026-10-13T10:00:00Z"), check("ws", "other", "second", "pass"), check("ws", "new-config", "first", "pass", "b"), check("ws", "old-config-latest", "first", "error", "a", "2026-10-13T11:00:00Z"), check("ws", "future", "first", "pass", "a", "2026-10-14T00:00:00Z")];
    const result = latestMonitoringChecks(records, new Date(NOW));
    expect(result.map(item => item.id).sort()).toEqual(["new-config", "old-config-latest", "other"]);
    expect(latestMonitoringChecks([...records].reverse(), new Date(NOW))).toEqual(result);
  });

  it("preserves sources older than 200 newer records in both public and private routes without exposing private metadata", async () => {
    const ws = await fixture();
    await svc.store.checks.put(check(ws.id, "hidden-old-failure", "old-target", "fail", "old-config", "2026-10-13T01:00:00Z"));
    await svc.store.checks.put(check(ws.id, "changed-config-failure", "busy-target", "fail", "previous-config", "2026-10-13T02:00:00Z"));
    for (let i = 0; i < 205; i++) await svc.store.checks.put(check(ws.id, `busy-${i}`, "busy-target", "pass", "current-config", new Date(Date.parse("2026-10-13T03:00:00Z") + i * 1000).toISOString()));
    const recent = vi.spyOn(svc.store.checks, "recent").mockRejectedValue(new Error("Latest sources cannot use a history cutoff"));
    const publicResponse = await visitor.get<Awaited<ReturnType<typeof publicTrust>>>(`/api/trust/${ws.slug}`);
    expect(publicResponse.status).toBe(200);
    expect(publicResponse.json.monitoring).toHaveLength(3);
    expect(publicResponse.json.monitoring.map(item => item.outcome).sort()).toEqual(["fail", "fail", "pass"]);
    expect(new Set(publicResponse.json.monitoring.map(item => item.target)).size).toBe(2);
    expect(new Set(publicResponse.json.monitoring.map(item => item.id)).size).toBe(3);
    for (const secret of ["PRIVATE", "private-target", "old-target", "busy-target", "previous-config", "current-config", "configHash", "requirementIds", "observed\""]) expect(publicResponse.text).not.toContain(secret);
    const privateResponse = await owner.get<CheckResult[]>(`/api/workspaces/${ws.id}/checks`);
    expect(privateResponse.status).toBe(200);
    expect(privateResponse.json.map(item => item.id).sort()).toEqual(["busy-204", "changed-config-failure", "hidden-old-failure"]);
    expect(recent).not.toHaveBeenCalled();
  });

  it("labels unknown legacy configuration without merging it into a recorded configuration", async () => {
    const ws = await fixture();
    await svc.store.checks.put({ ...check(ws.id, "legacy", "target", "fail"), source: undefined });
    await svc.store.checks.put(check(ws.id, "recorded", "target", "pass"));
    const result = await publicTrust(svc, ws.slug, new Date(NOW));
    expect(result.monitoring).toHaveLength(2);
    expect(result.monitoring.some(item => item.configuration === "Configuration not recorded")).toBe(true);
  });

  it("uses one supplied instant and effective evidence metadata at a UTC date boundary", async () => {
    const ws = await fixture();
    const artifact = await svc.createEvidence(ws.id, { title: "PRIVATE ARTIFACT TITLE", requirementIds: [A], content: "PRIVATE ARTIFACT BODY", collectedAt: "2026-10-12", validUntil: "2026-10-13" });
    await svc.reviewEvidence(ws.id, artifact.id, "accepted", "reviewer", undefined, evidenceReviewScope(artifact));
    const get = vi.spyOn(svc.store.evidence, "get").mockRejectedValue(new Error("Public measures must not hydrate bodies"));
    const list = vi.spyOn(svc.store.evidence, "list").mockRejectedValue(new Error("Public measures must not hydrate bodies"));
    const before = new Date("2026-10-13T23:59:59.999Z"), after = new Date("2026-10-14T00:00:00.000Z");
    const valid = await publicTrust(svc, ws.slug, before), expired = await publicTrust(svc, ws.slug, after);
    expect(valid.asOf).toBe(before.toISOString());
    expect(expired.asOf).toBe(after.toISOString());
    expect(valid.updatedAt).toBe(ws.updatedAt);
    const f = valid.frameworks.find(item => item.id === CSF)!;
    expect(f).toMatchObject({ readiness: 40, evidenceCoverage: 50, basis: { scope: { inScope: 2 }, readiness: { numerator: 2, denominator: 5 }, evidence: { covered: 1, denominator: 2 } } });
    expect(expired.frameworks.find(item => item.id === CSF)!.evidenceCoverage).toBe(0);
    const metadata = await svc.store.evidence.metadataList(ws.id);
    expect(effectiveEvidenceState(metadata[0]!, metadata, before, A).status).toBe("valid");
    expect(effectiveEvidenceState(metadata[0]!, metadata, after, A).status).toBe("expired");
    vi.setSystemTime(after);
    const summary = await workspaceSummary(svc, ws);
    expect(summary.frameworks.find(item => item.id === CSF)!.evidenceCoverage * 100).toBe(expired.frameworks.find(item => item.id === CSF)!.evidenceCoverage);
    const publicAtBoundary = await visitor.get<Awaited<ReturnType<typeof publicTrust>>>(`/api/trust/${ws.slug}`);
    expect(publicAtBoundary.status).toBe(200);
    expect(publicAtBoundary.json.asOf).toBe(after.toISOString());
    expect(publicAtBoundary.json.frameworks.find(item => item.id === CSF)!.evidenceCoverage).toBe(0);
    expect(JSON.stringify(valid)).not.toContain("PRIVATE ARTIFACT");
    expect(get).not.toHaveBeenCalled();
    expect(list).not.toHaveBeenCalled();
  });

  it("does not count pending, withdrawn or future evidence as coverage", async () => {
    const ws = await fixture();
    const pending = await svc.createEvidence(ws.id, { title: "Pending", requirementIds: [A], content: "Unreviewed" });
    const withdrawn = await svc.createEvidence(ws.id, { title: "Withdrawn", requirementIds: [A], content: "Withdrawn content" });
    await svc.reviewEvidence(ws.id, withdrawn.id, "withdrawn", "reviewer", "Not supported", evidenceReviewScope(withdrawn));
    const future = await svc.createEvidence(ws.id, { title: "Future", requirementIds: [B], content: "Future artifact", collectedAt: "2026-10-14" });
    await svc.reviewEvidence(ws.id, future.id, "accepted", "reviewer", undefined, evidenceReviewScope(future));
    expect(pending.status).toBe("pending-review");
    expect((await publicTrust(svc, ws.slug, new Date(NOW))).frameworks.find(item => item.id === CSF)!.evidenceCoverage).toBe(0);
  });

  it("keeps canonical order and excludes disabled, unpublished, law opt-out and threat frameworks", async () => {
    const ws = await fixture();
    ws.frameworks.push({ frameworkId: THREAT, enabled: true, defaultTarget: 2 });
    await svc.store.workspaces.put(ws);
    const first = await publicTrust(svc, ws.slug, new Date(NOW));
    expect(first.frameworks.map(item => item.id)).toEqual([CSF, RMF, AI]);
    ws.frameworks = ws.frameworks.map(setting => setting.frameworkId === AI ? { ...setting, enabled: false } : setting);
    ws.trustCenter.frameworks = { [CSF]: false, [LAW]: true, [THREAT]: true };
    await svc.store.workspaces.put(ws);
    const next = await publicTrust(svc, ws.slug, new Date(NOW));
    expect(next.frameworks.map(item => item.id)).toEqual([RMF, LAW]);
    expect(next.frameworks.find(item => item.id === LAW)!.basis.scope).toMatchObject({ inScope: 1, upcoming: 1 });
  });

  it("represents empty scope with an absent percentage and clearly attributes custom headlines", async () => {
    const ws = await fixture();
    for (const nodeId of [A, B]) await svc.updateState(ws.id, nodeId, { applicable: false, applicabilityRationale: "Excluded for this test scope" });
    const custom = await publicTrust(svc, ws.slug, new Date(NOW));
    expect(custom).toMatchObject({ headlineSource: "organization-authored", headline: "Our organization-authored claim" });
    expect(custom.frameworks.find(item => item.id === CSF)).toMatchObject({ readiness: null, evidenceCoverage: null, basis: { scope: { inScope: 0, excluded: 2 }, evidence: { covered: 0, denominator: 0 } } });
    ws.trustCenter.headline = " ";
    await svc.store.workspaces.put(ws);
    expect((await publicTrust(svc, ws.slug, new Date(NOW))).headlineSource).toBe("template");
  });

  it("keeps unpublished centers and internal workspace IDs inaccessible to public callers", async () => {
    const ws = await fixture();
    expect((await visitor.get(`/api/trust/${ws.id}`)).status).toBe(404);
    ws.trustCenter.enabled = false;
    await svc.store.workspaces.put(ws);
    expect((await visitor.get(`/api/trust/${ws.slug}`)).status).toBe(404);
  });
});
