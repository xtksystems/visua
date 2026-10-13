import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { evidenceReviewScope, type CheckResult, type Evidence, type FrameworkGraph, type OrganizationProfile, type Proposal, type RequirementNode, type RequirementState, type Task } from "@visua/core";
import { FrameworkRegistry } from "@visua/frameworks";
import { createService } from "../src/context.ts";
import { loadAuthConfig } from "../src/auth/config.ts";
import { AuthService } from "../src/auth/service.ts";
import { workspaceAttention } from "../src/services/attention.ts";
import { testDatabase } from "./db.ts";

const source = FrameworkRegistry.load();
const CSF = "nist-csf-2.0", AI = "nist-ai-rmf", LAW = "us-state-ai-laws", SOC = "aicpa-tsc-2017", THREAT = "mitre-atlas";
const A = `${CSF}:PR.AA-01`, B = `${CSF}:PR.AA-02`, W = `${CSF}:PR.AA-03`;
const GROUP = `${CSF}:PR.AA`;
const aiNodes = source.framework(AI)!.assessable.slice(0, 2);
const C = aiNodes[0]!.id, D = aiNodes[1]!.id;
const lawNodes: RequirementNode[] = source.framework(LAW)!.assessable.slice(0, 4).map((node, i) => ({
  ...node,
  attributes: {
    ...node.attributes, effective: i === 1 ? "2026-10-05" : "2026-01-01", until: i === 2 ? "2026-10-03" : undefined,
    ...(i === 3 ? { roles: ["fixture-unselected-role"] } : {}),
  },
}));
const L = lawNodes[0]!.id, FUTURE = lawNodes[1]!.id, ENDED = lawNodes[2]!.id, NO_ROLE = lawNodes[3]!.id;
const socNode = source.framework(SOC)!.assessable[0]!;
const socGroup = source.node(socNode.parentId!)!;
const threatNode = source.framework(THREAT)!.graph.nodes[0]!;
const graph = (id: string, nodes: RequirementNode[]): FrameworkGraph => ({
  framework: source.framework(id)!.graph.framework,
  nodes: nodes.map((node) => ({ ...node, parentId: nodes.some((parent) => parent.id === node.parentId) ? node.parentId : null, depth: 0 })),
});
const registry = new FrameworkRegistry({
  graphs: [
    graph(CSF, [source.node(GROUP)!, source.node(A)!, source.node(B)!, { ...source.node(W)!, withdrawn: true }]),
    graph(AI, aiNodes), graph(LAW, lawNodes), graph(SOC, [socGroup, socNode]), graph(THREAT, [{ ...threatNode, assessable: true }]),
  ],
  mappings: [], chunks: [], manifests: [],
});
const db = await testDatabase("attention");
const svc = await createService({ database: db.url, registry });
const auth = new AuthService(svc, { ...loadAuthConfig({}), mode: "dev" });
const member = await auth.ensureUser("attention-member@example.test", "Current member name");
const tenant = await auth.createTenant("Attention test", member, "fixture");
const profile: OrganizationProfile = { industry: "saas", size: "11-50", dataTypes: [], drivers: [], environments: ["cloud"], maturityTier: 1, guidance: "guided", securityTeamSize: 1 };
const NOW = "2026-10-04T12:00:00.000Z";
let sequence = 0;
const id = (prefix: string) => `${prefix}-${++sequence}`;

beforeEach(() => { vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(new Date(NOW)); });
afterEach(() => { vi.restoreAllMocks(); vi.useRealTimers(); });
afterAll(async () => { await svc.store.close(); await db.cleanup(); });

async function fixture() {
  const ws = await svc.createWorkspace({ name: id("Attention"), profile, tenantId: tenant.id, frameworks: [CSF, AI, LAW, SOC] });
  const applicability: NonNullable<(typeof ws.frameworks)[number]["law"]>["applicability"] = {};
  for (const node of lawNodes.slice(0, 3)) {
    const lawId = String(node.attributes!["lawId"]);
    const previous = applicability[lawId]?.roles ?? [];
    applicability[lawId] = { roles: [...new Set([...previous, ...node.attributes!["roles"] as string[]])], decidedAt: NOW, decidedBy: "fixture" };
  }
  ws.frameworks = ws.frameworks.map((settings) => settings.frameworkId === SOC ? { ...settings, enabled: false }
    : settings.frameworkId === LAW ? { ...settings, law: { applicability } } : settings);
  ws.frameworks.push({ frameworkId: THREAT, enabled: true, defaultTarget: 2 });
  await svc.store.workspaces.put(ws);
  for (const index of registry.indexes.values()) {
    for (const node of index.graph.nodes) {
      await svc.store.states.put(ws.id, { nodeId: node.id, applicable: true, current: 2, target: 2, priority: "medium", updatedAt: NOW, updatedBy: "fixture" });
    }
  }
  return ws;
}

async function state(ws: string, nodeId: string, patch: Partial<RequirementState>) {
  return svc.store.states.put(ws, { ...(await svc.store.states.get(ws, nodeId))!, ...patch });
}

async function task(ws: string, requirementIds: string[], patch: Partial<Task> = {}) {
  const value: Task = {
    id: id("task"), workspaceId: ws, title: "Follow up", description: "", kind: "technical", status: "todo", priority: "medium",
    requirementIds, dueDate: "2026-10-03", checklist: [], dependsOn: [], origin: "user", createdAt: NOW, updatedAt: NOW, ...patch,
  };
  await svc.store.tasks.put(value);
  return value;
}

async function check(ws: string, requirementIds: string[], patch: Partial<CheckResult> = {}) {
  const value: CheckResult = {
    id: id("check"), workspaceId: ws, connectorId: "configuration", checkId: "mfa", title: "MFA configuration", detail: "MFA is disabled",
    outcome: "fail", requirementIds, observed: {}, observedAt: "2026-10-03T10:00:00.000Z", ...patch,
  };
  await svc.store.checks.put(value);
  return value;
}

async function artifact(ws: string, requirementIds: string[], validUntil: string, accepted = true): Promise<Evidence> {
  const value = await svc.createEvidence(ws, { title: id("Configuration artifact"), content: "Observed configuration", requirementIds, collectedAt: "2026-01-01", validUntil });
  return accepted ? svc.reviewEvidence(ws, value.id, "accepted", "reviewer", "Inspected", evidenceReviewScope(value)) : value;
}

async function proposal(ws: string, nodeIds: string[], patch: Partial<Proposal> = {}) {
  const value: Proposal = {
    id: id("proposal"), workspaceId: ws, runId: "run-attention", type: "set-level", title: "Record implementation", rationale: "Observed configuration supports implementation",
    payload: {}, citations: [], confidence: "medium", status: "pending", nodeIds, createdAt: NOW, ...patch,
  };
  await svc.store.proposals.put(value);
  return value;
}

describe(`workspace attention (${db.dialect})`, () => {
  it("finds a gap and failing check in a non-primary framework with requirement and action context", async () => {
    const ws = await fixture();
    await state(ws.id, C, { current: 0, priority: "high", owner: "AI governance lead" });
    const failed = await check(ws.id, [C]);
    const before = { revision: await svc.store.workspaces.rev(ws.id), activity: await svc.store.activity.head(ws.id) };
    const queue = await workspaceAttention(svc, ws);
    expect(queue.asOf).toBe(NOW);
    expect(queue.enabledFrameworks.map((framework) => framework.id)).toEqual([CSF, AI, LAW]);
    expect(queue.items.map((item) => item.kind)).toEqual(["failing-check", "implementation-gap"]);
    expect(queue.items[0]).toMatchObject({ requirements: [{ id: C, frameworkId: AI }], owner: { kind: "external", label: "AI governance lead" }, action: { type: "check", id: failed.id } });
    expect(queue.items[1]).toMatchObject({ reason: expect.stringContaining("level 0 of target 2"), action: { type: "requirement", id: C, frameworkId: AI } });
    expect(queue.counts).toMatchObject({ total: 2, affectedRequirements: 1, byKind: { "failing-check": 1, "implementation-gap": 1 } });
    expect({ revision: await svc.store.workspaces.rev(ws.id), activity: await svc.store.activity.head(ws.id) }).toEqual(before);
  });

  it("excludes disabled, withdrawn, excluded, out-of-scope and inactive statutory requirements from items and counts", async () => {
    const ws = await fixture();
    await state(ws.id, B, { applicable: false, current: 0, applicabilityRationale: "Outside our services" });
    for (const nodeId of [B, W, socNode.id, threatNode.id, FUTURE, ENDED, NO_ROLE]) {
      await state(ws.id, nodeId, { current: 0 });
      await task(ws.id, [nodeId]);
      await check(ws.id, [nodeId], { checkId: nodeId });
      await proposal(ws.id, [nodeId]);
    }
    await state(ws.id, D, { current: 0, userExclusion: { rationale: "Documented exclusion", at: NOW, by: "reviewer" } });
    const included = await task(ws.id, [L]);
    const queue = await workspaceAttention(svc, ws);
    expect(queue.items.map((item) => item.action.id)).toEqual([included.id]);
    expect(queue.enabledFrameworks.map((framework) => [framework.id, framework.inScopeRequirements])).toEqual([[CSF, 1], [AI, 1], [LAW, 1]]);
    expect(queue.counts.affectedRequirements).toBe(1);
  });

  it("lets newer results supersede each failed requirement independently and deduplicates multi-links", async () => {
    const ws = await fixture();
    const old = await check(ws.id, [A, A, C]);
    await check(ws.id, [A], { outcome: "pass", observedAt: "2026-10-04T10:00:00.000Z", detail: "MFA enabled" });
    let queue = await workspaceAttention(svc, ws);
    expect(queue.items).toHaveLength(1);
    expect(queue.items[0]).toMatchObject({ action: { id: old.id }, requirements: [{ id: C }] });
    await check(ws.id, [C], { outcome: "warn", observedAt: "2026-10-04T11:00:00.000Z" });
    queue = await workspaceAttention(svc, ws);
    expect(queue.items).toEqual([]);
  });

  it("describes expired artifact freshness without claiming lost coverage when valid alternatives exist", async () => {
    const ws = await fixture();
    const expired = await artifact(ws.id, [A, C], "2026-10-03");
    await artifact(ws.id, [A, C], "2027-01-01");
    const expiring = await artifact(ws.id, [B], "2026-10-20");
    const queue = await workspaceAttention(svc, ws);
    expect(queue.items.map((item) => item.kind)).toEqual(["expired-evidence", "expiring-evidence"]);
    expect(queue.items[0]).toMatchObject({ action: { type: "evidence", id: expired.id }, requirements: [{ id: A }, { id: C }] });
    expect(queue.items[0]!.reason).toContain("All affected requirements currently have other valid accepted evidence");
    expect(queue.items[1]).toMatchObject({ action: { id: expiring.id }, reason: expect.stringContaining("within 30 days") });
    const evidenceDetail = vi.spyOn(svc.store.evidence, "list").mockRejectedValue(new Error("artifact bodies must not be read"));
    const evidenceGet = vi.spyOn(svc.store.evidence, "get").mockRejectedValue(new Error("artifact body must not be read"));
    const metadata = vi.spyOn(svc.store.evidence, "metadataList");
    expect(await workspaceAttention(svc, ws)).toEqual(queue);
    expect(metadata).toHaveBeenCalledOnce();
    expect(evidenceDetail).not.toHaveBeenCalled();
    expect(evidenceGet).not.toHaveBeenCalled();
  });

  it("keeps pending and unbound evidence in review, includes unlinked work, and resolves proposal entity links", async () => {
    const ws = await fixture();
    const pending = await artifact(ws.id, [A, A, C], "2026-10-03", false);
    const unlinkedEvidence = await artifact(ws.id, [], "2027-01-01", false);
    const unbound = await artifact(ws.id, [B], "2027-01-01");
    await svc.store.evidence.put({ ...unbound, reviewHistory: [] });
    const review = await proposal(ws.id, [], { type: "review-evidence", payload: { evidenceId: pending.id, decision: "accepted" } });
    const workspaceProposal = await proposal(ws.id, [], { type: "set-rmf" });
    await proposal(ws.id, [D], { status: "applied" });
    const unlinkedTask = await task(ws.id, []);
    const queue = await workspaceAttention(svc, ws);
    expect(queue.counts.byKind).toMatchObject({ "evidence-review": 3, "proposal-review": 2, "overdue-task": 1, "expired-evidence": 0 });
    const evidenceItem = queue.items.find((item) => item.action.id === pending.id)!;
    expect(evidenceItem).toMatchObject({ requirements: [{ id: A }, { id: C }], owner: { kind: "approver", label: "Evidence approver" }, reason: expect.stringContaining("validity window has expired") });
    expect(queue.items.find((item) => item.action.id === review.id)).toMatchObject({ requirements: [{ id: A }, { id: C }], action: { type: "proposal", id: review.id, runId: review.runId } });
    for (const entityId of [unlinkedEvidence.id, workspaceProposal.id, unlinkedTask.id]) {
      expect(queue.items.find((item) => item.action.id === entityId)).toMatchObject({ scope: "workspace", requirements: [], reason: expect.stringContaining("no requirement is linked") });
    }
    expect(queue.items.find((item) => item.action.id === unlinkedTask.id)?.owner).toEqual({ kind: "unassigned", label: "Unassigned" });
  });

  it("keeps eligible group review links visible without counting or inheriting individual evidence coverage", async () => {
    const ws = await fixture();
    const pending = await artifact(ws.id, [GROUP, GROUP], "2027-01-01", false);
    const review = await proposal(ws.id, [GROUP], { type: "review-evidence", payload: { evidenceId: pending.id, decision: "accepted" } });
    await artifact(ws.id, [GROUP], "2027-01-01");
    await artifact(ws.id, [socGroup.id], "2027-01-01", false);
    await proposal(ws.id, [socGroup.id]);
    let queue = await workspaceAttention(svc, ws);
    expect(queue.items).toHaveLength(2);
    expect(queue.counts).toMatchObject({ total: 2, affectedRequirements: 0, byKind: { "evidence-review": 1, "proposal-review": 1 } });
    expect(queue.enabledFrameworks.find((framework) => framework.id === CSF)?.inScopeRequirements).toBe(2);
    for (const entityId of [pending.id, review.id]) {
      expect(queue.items.find((item) => item.action.id === entityId)).toMatchObject({
        scope: "requirements", requirements: [{ id: GROUP, assessable: false }],
        reason: expect.stringContaining("Group links do not imply individual requirement evidence coverage"),
      });
    }
    expect((await svc.score(ws.id, CSF)).overall.evidenceCoverage).toBe(0);
    const mixed = await artifact(ws.id, [GROUP, A], "2027-01-01", false);
    queue = await workspaceAttention(svc, ws);
    expect(queue.counts.affectedRequirements).toBe(1);
    expect(queue.items.find((item) => item.action.id === mixed.id)?.requirements).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: GROUP, assessable: false }), expect.objectContaining({ id: A, assessable: true }),
    ]));
    await state(ws.id, A, { applicable: false });
    await state(ws.id, B, { applicable: false });
    queue = await workspaceAttention(svc, ws);
    expect(queue.items).toEqual([]);
    expect(queue.counts.affectedRequirements).toBe(0);
  });

  it("resolves member identities using current names and keeps external, agent and departed labels distinct", async () => {
    const ws = await fixture();
    await state(ws.id, A, { current: 0, ownerUserId: member.id, owner: "Stale saved name" });
    await state(ws.id, C, { owner: "Outside assessor" });
    const assigned = await task(ws.id, [A, C, A], { assignee: { type: "person", id: member.id, name: "Stale saved name" } });
    const external = await task(ws.id, [], { assignee: { type: "external", id: "external", name: "Outside counsel" } });
    const agent = await task(ws.id, [], { assignee: { type: "agent", id: "assessor", name: "Assessor agent" } });
    const departed = await task(ws.id, [], { assignee: { type: "person", id: "departed", name: "Former member" } });
    const failed = await check(ws.id, [A, C, A]);
    const queue = await workspaceAttention(svc, ws);
    const find = (entityId: string) => queue.items.find((item) => item.action.id === entityId)!;
    expect(find(assigned.id)).toMatchObject({ requirements: [{ id: A }, { id: C }], owner: { kind: "member", userId: member.id, label: member.name } });
    expect(find(A).owner).toEqual({ kind: "member", userId: member.id, label: member.name });
    expect(find(external.id).owner).toEqual({ kind: "external", label: "Outside counsel" });
    expect(find(agent.id).owner).toEqual({ kind: "agent", label: "Assessor agent" });
    expect(find(departed.id).owner).toEqual({ kind: "unassigned", label: "Unassigned (previously Former member)" });
    expect(find(failed.id).owner).toEqual({ kind: "multiple", label: "Current member name · Outside assessor" });
    expect(queue.counts.affectedRequirements).toBe(2);
  });

  it("uses UTC due-day boundaries and fresh timestamps rather than a cached hourly score", async () => {
    const ws = await fixture();
    const today = await task(ws.id, [A], { dueDate: "2026-10-04" });
    const instant = await task(ws.id, [C], { dueDate: "2026-10-04T12:00:00.000Z" });
    await task(ws.id, [], { status: "done", dueDate: "2026-01-01" });
    expect((await workspaceAttention(svc, ws)).items).toEqual([]);
    await svc.score(ws.id, AI);
    vi.setSystemTime(new Date("2026-10-04T12:00:00.001Z"));
    expect((await workspaceAttention(svc, ws)).items.map((item) => item.action.id)).toEqual([instant.id]);
    vi.setSystemTime(new Date("2026-10-04T23:59:59.999Z"));
    expect((await workspaceAttention(svc, ws)).items.map((item) => item.action.id)).toEqual([instant.id]);
    vi.setSystemTime(new Date("2026-10-05T00:00:00.000Z"));
    expect((await workspaceAttention(svc, ws)).items.map((item) => item.action.id).sort()).toEqual([instant.id, today.id].sort());
  });

  it("keeps the complete queue and deterministic urgency ordering for later framework filters", async () => {
    const ws = await fixture();
    for (let i = 0; i < 55; i++) await task(ws.id, [A], { id: `bulk-${ws.id}-${String(i).padStart(3, "0")}` });
    const aiTask = await task(ws.id, [C], { priority: "critical" });
    await state(ws.id, D, { current: 0, priority: "critical" });
    const queue = await workspaceAttention(svc, ws);
    expect(queue.counts).toMatchObject({ total: 57, affectedRequirements: 3, byKind: { "overdue-task": 56, "implementation-gap": 1 } });
    expect(queue.items[0]?.action.id).toBe(aiTask.id);
    expect(queue.items.at(-1)?.kind).toBe("implementation-gap");
    expect(queue.items.filter((item) => item.requirements.some((ref) => ref.frameworkId === AI))).toHaveLength(2);
    expect((await workspaceAttention(svc, ws)).items.map((item) => item.id)).toEqual(queue.items.map((item) => item.id));
  });
});
