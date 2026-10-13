import { afterAll, afterEach, describe, expect, it, vi } from "vitest";
import { newId, type OrganizationProfile, type Proposal, type ProposalBatchPreview, type ProposalBatchResult, type ProposalPreview, type ProposalType } from "@visua/core";
import { FrameworkRegistry } from "@visua/frameworks";
import { createApp } from "../src/app.ts";
import { loadAuthConfig } from "../src/auth/config.ts";
import { AuthService } from "../src/auth/service.ts";
import { createService } from "../src/context.ts";
import { TestClient } from "./client.ts";
import { testDatabase } from "./db.ts";

const registry = FrameworkRegistry.load();
const db = await testDatabase("proposal_review");
const svc = await createService({ database: db.url, registry });
const app = createApp(svc, new AuthService(svc, { ...loadAuthConfig({}), mode: "dev" }));
const client = new TestClient(app);
const login = await client.devLogin("proposal-owner@example.test", "Proposal reviewer");
const profile: OrganizationProfile = { industry: "saas", size: "11-50", dataTypes: [], drivers: [], environments: ["cloud"], maturityTier: 1, guidance: "guided", securityTeamSize: 1 };
const A = "nist-csf-2.0:PR.AA-01", B = "nist-csf-2.0:PR.AA-02";
async function fixture() {
  const response = await client.post<{ workspace: { id: string } }>("/api/workspaces", { name: "Proposal review", profile, frameworks: ["nist-csf-2.0"], planInitialTasks: false });
  expect(response.status).toBe(201);
  const ws = response.json.workspace.id, run = newId("run");
  await svc.store.runs.put({ id: run, workspaceId: ws, agent: "planner", goal: "Review changes", input: {}, status: "awaiting-approval", mode: "offline", steps: [], focusNodeIds: [], createdAt: new Date().toISOString(), startedAt: new Date().toISOString() });
  return { ws, run, base: `/api/workspaces/${ws}`, propose: (type: ProposalType, payload: Record<string, unknown>) => svc.createProposal(ws, run, { type, payload, title: `Proposed ${type}`, rationale: "Review the observed change", citations: [], confidence: "high", nodeIds: [B] }) };
}
const preview = async (base: string, proposal: Proposal) => {
  const response = await client.get<ProposalPreview>(`${base}/proposals/${proposal.id}/preview`);
  expect(response.status, response.text).toBe(200);
  expect(response.headers.get("cache-control")).toBe("private, no-store");
  return response.json;
};
afterEach(() => vi.restoreAllMocks());
afterAll(async () => { await svc.store.close(); await db.cleanup(); });

describe(`authoritative proposal review (${db.dialect})`, () => {
  it("previews every proposal type with actual fields and payload/target requirement links", async () => {
    const { ws, base, propose } = await fixture();
    const task = await svc.createTask(ws, { title: "Existing task", description: "Original", requirementIds: [A], checklist: [{ id: "item", text: "Inspect", done: false }] });
    const evidence = await svc.createEvidence(ws, { title: "Configuration", content: "MFA enabled", requirementIds: [A] });
    await svc.enableFramework(ws, "nist-sp-800-53-r5");
    const cases: { type: ProposalType; payload: Record<string, unknown>; entity: string; field: string; value: unknown }[] = [
      { type: "set-level", payload: { nodeId: A, current: 2 }, entity: "requirement", field: "current", value: 2 },
      { type: "set-target", payload: { nodeId: A, target: 4 }, entity: "requirement", field: "target", value: 4 },
      { type: "set-applicability", payload: { nodeId: A, applicable: false, rationale: "Outside this assessment" }, entity: "requirement", field: "applicable", value: false },
      { type: "create-task", payload: { title: " New task ", requirementIds: [A], checklist: ["Inspect"] }, entity: "task", field: "title", value: "New task" },
      { type: "update-task", payload: { taskId: task.id, requirementIds: [B], status: "done", completeChecklistItems: ["item"] }, entity: "task", field: "status", value: "done" },
      { type: "create-evidence", payload: { title: "Observation", content: "Observed configuration", requirementIds: [A], validDays: 30 }, entity: "evidence", field: "content", value: "Observed configuration" },
      { type: "review-evidence", payload: { evidenceId: evidence.id, decision: "accepted", note: "Inspected bytes" }, entity: "evidence", field: "status", value: "accepted" },
      { type: "create-policy", payload: { title: "Access policy", body: "Proposed governance procedure", requirementIds: [A] }, entity: "policy", field: "status", value: "in-review" },
      { type: "create-risk", payload: { title: "New risk", requirementIds: [A] }, entity: "risk", field: "likelihood", value: 3 },
      { type: "set-rmf", payload: { systemName: "New system name", baseline: "low" }, entity: "workspace", field: "frameworks", value: undefined },
    ];
    for (const item of cases) {
      const p = await propose(item.type, item.payload);
      const inspected = await preview(base, p);
      expect(inspected.canApprove, `${item.type}: ${inspected.unresolvedQuestions}`).toBe(true);
      const change = inspected.changes.find((change) => change.entityType === item.entity)!;
      expect(change, item.type).toBeDefined();
      if (item.value !== undefined) expect(change.proposed[item.field], item.type).toEqual(item.value);
      if (item.type !== "set-rmf") expect(inspected.affectedRequirementIds, item.type).toContain(A);
      if (item.type === "update-task") {
        expect(inspected.affectedRequirementIds).toEqual([A, B]);
        expect(change.current?.["status"]).toBe("todo");
        expect(change.proposed["contentRequirementIds"]).toEqual([A, B]);
      } else if (item.type !== "set-rmf") expect(inspected.affectedRequirementIds).not.toContain(B);
      if (item.type === "set-rmf") expect(inspected.affectedRequirementIds.some((id) => id.startsWith("nist-sp-800-53-r5:"))).toBe(true);
      expect((await preview(base, p)).reviewToken, `stable ${item.type} token`).toBe(inspected.reviewToken);
    }
  });

  it("preview leaves persisted rows, revision, audit and events untouched and performs no blob reads", async () => {
    const { ws, base, propose } = await fixture();
    const p = await propose("create-evidence", { title: "Observed artifact", content: "Observed", requirementIds: [A], validDays: 30 });
    const revision = await svc.store.workspaces.rev(ws), head = await svc.store.activity.head(ws);
    const publish = vi.spyOn(svc.bus, "publish"), blobRead = vi.spyOn(svc.blobs, "get");
    const inspected = await preview(base, p);
    expect(inspected.canApprove).toBe(true);
    expect(inspected.changes[0]!.generatedFields).toContain("collectedAt");
    expect(await svc.store.evidence.list(ws)).toEqual([]);
    expect(await svc.store.workspaces.rev(ws)).toBe(revision);
    expect(await svc.store.activity.head(ws)).toEqual(head);
    expect(await svc.store.proposals.get(p.id)).toEqual(p);
    expect(publish).not.toHaveBeenCalled();
    expect(blobRead).not.toHaveBeenCalled();
    expect((await svc.verifyAuditTrail(ws)).valid).toBe(true);
  });

  it.each([
    { validDays: 1, validityPeriod: "1 day from approval" },
    { validDays: 730, validityPeriod: "730 days from approval" },
    { validDays: undefined, validityPeriod: "No expiry date" },
  ])("exposes and binds narrative evidence validity: $validityPeriod", async ({ validDays, validityPeriod }) => {
    const { ws, base, propose } = await fixture();
    const p = await propose("create-evidence", { title: "Observed artifact", content: "Recorded configuration", requirementIds: [A], ...(validDays === undefined ? {} : { validDays }) });
    const inspected = await preview(base, p);
    const change = inspected.changes.find((change) => change.entityType === "evidence")!;
    expect(change.proposed["validityPeriod"]).toBe(validityPeriod);
    expect(change.proposed["collectionTime"]).toBe("Recorded when this proposal is approved");
    expect(change.proposed["collectedAt"]).toBeUndefined();
    expect(change.generatedFields).toContain("collectedAt");
    const changed = { ...p, payload: { ...p.payload, validDays: validDays === 1 ? 730 : 1 } };
    await svc.store.proposals.put(changed);
    const result = await client.post(`${base}/proposals/${p.id}/decision`, { decision: "approved", reviewToken: inspected.reviewToken });
    expect(result.status).toBe(409);
    expect((await svc.store.proposals.get(p.id))?.status).toBe("pending");
    expect(await svc.store.evidence.list(ws)).toEqual([]);
    expect((await preview(base, changed)).changes.find((change) => change.entityType === "evidence")!.proposed["validityPeriod"]).not.toBe(validityPeriod);
  });

  it("requires an HTTP approval snapshot, applies it, and records the authenticated actor", async () => {
    const { ws, base, propose } = await fixture();
    const p = await propose("set-level", { nodeId: A, current: 2 });
    const path = `${base}/proposals/${p.id}/decision`;
    expect((await client.post(path, { decision: "approved" })).status).toBe(400);
    const inspected = await preview(base, p);
    expect((await client.post(path, { decision: "approved", reviewToken: inspected.reviewToken, edits: { current: 4 } })).status).toBe(400);
    const accepted = await client.post<Proposal>(path, { decision: "approved", reviewToken: inspected.reviewToken });
    expect(accepted.status, accepted.text).toBe(200);
    expect(accepted.json.status).toBe("applied");
    expect(accepted.json.decidedBy).toContain("proposal-owner@example.test");
    expect((await svc.store.states.get(ws, A))?.current).toBe(2);
  });

  it.each(["single", "batch"])("keeps %s approvals valid when storage returns unchanged records in a different order", async (mode) => {
    const { ws, run, base, propose } = await fixture();
    const a = await propose("set-level", { nodeId: A, current: 2 });
    await propose("set-level", { nodeId: B, current: 3 });
    const list = svc.store.states.list.bind(svc.store.states);
    let reverse = false;
    vi.spyOn(svc.store.states, "list").mockImplementation(async (...args) => {
      const states = await list(...args);
      return reverse ? states.reverse() : states;
    });
    if (mode === "single") {
      const inspected = await preview(base, a);
      reverse = true;
      expect((await preview(base, a)).reviewToken).toBe(inspected.reviewToken);
      const result = await client.post<Proposal>(`${base}/proposals/${a.id}/decision`, { decision: "approved", reviewToken: inspected.reviewToken });
      expect(result.status, result.text).toBe(200);
      expect(result.json.status).toBe("applied");
    } else {
      const inspected = await client.get<ProposalBatchPreview>(`${base}/runs/${run}/approval-preview`);
      reverse = true;
      expect((await client.get<ProposalBatchPreview>(`${base}/runs/${run}/approval-preview`)).json.reviewToken).toBe(inspected.json.reviewToken);
      const result = await client.post<ProposalBatchResult>(`${base}/runs/${run}/approve-all`, { reviewToken: inspected.json.reviewToken, proposalIds: inspected.json.proposalIds });
      expect(result.status, result.text).toBe(200);
      expect(result.json).toMatchObject({ total: 2, applied: 2, failed: 0, skipped: 0 });
      expect((await svc.store.states.get(ws, B))?.current).toBe(3);
    }
    expect((await svc.store.states.get(ws, A))?.current).toBe(2);
  });

  it.each(["target", "proposal"])("rejects stale %s snapshots without deciding the proposal", async (changed) => {
    const { ws, base, propose } = await fixture();
    const p = await propose("set-level", { nodeId: A, current: 2 });
    const inspected = await preview(base, p);
    if (changed === "target") await svc.updateState(ws, A, { current: 1 });
    else await svc.store.proposals.put({ ...p, payload: { ...p.payload, current: 3 } });
    const head = await svc.store.activity.head(ws), revision = await svc.store.workspaces.rev(ws);
    const result = await client.post(`${base}/proposals/${p.id}/decision`, { decision: "approved", reviewToken: inspected.reviewToken });
    expect(result.status, result.text).toBe(409);
    expect((await svc.store.proposals.get(p.id))!.status).toBe("pending");
    expect(await svc.store.activity.head(ws)).toEqual(head);
    expect(await svc.store.workspaces.rev(ws)).toBe(revision);
  });

  it("keeps rejection available without approving or changing the target", async () => {
    const { ws, base, propose } = await fixture();
    const p = await propose("set-level", { nodeId: A, current: 4 });
    const rejected = await client.post<Proposal>(`${base}/proposals/${p.id}/decision`, { decision: "rejected" });
    expect(rejected.json.status).toBe("rejected");
    expect((await svc.store.states.get(ws, A))?.current).toBe(0);
    expect((await preview(base, rejected.json)).canApprove).toBe(false);
  });

  it("does not disclose another tenant's proposals, source records or run previews", async () => {
    const { ws, run, base, propose } = await fixture();
    const p = await propose("create-task", { title: "Private", requirementIds: [A] });
    const other = new TestClient(app);
    await other.devLogin("proposal-other@example.test", "Another organization");
    expect((await other.get(`${base}/proposals/${p.id}/preview`)).status).toBe(404);
    expect((await other.get(`${base}/runs/${run}/approval-preview`)).status).toBe(404);
    const otherWs = await other.post<{ workspace: { id: string } }>("/api/workspaces", { name: "Other", profile, frameworks: ["nist-csf-2.0"], planInitialTasks: false });
    expect((await other.get(`/api/workspaces/${otherWs.json.workspace.id}/proposals/${p.id}/preview`)).status).toBe(404);
    expect((await other.post(`/api/workspaces/${otherWs.json.workspace.id}/proposals/${p.id}/decision`, { decision: "approved", reviewToken: (await svc.previewProposal(ws, p.id)).reviewToken })).status).toBe(404);
    const foreignEvidence = await svc.createEvidence(ws, { title: "Private bytes", content: "Secret", requirementIds: [A] });
    const legacy = { ...p, id: newId("prop"), workspaceId: otherWs.json.workspace.id, type: "review-evidence" as const, payload: { evidenceId: foreignEvidence.id, decision: "accepted" } };
    await svc.store.proposals.put(legacy);
    const safe = await other.get<ProposalPreview>(`/api/workspaces/${otherWs.json.workspace.id}/proposals/${legacy.id}/preview`);
    expect(safe.json.sources).toEqual([]);
    expect(safe.text).not.toContain("Secret");
    expect(safe.json.canApprove).toBe(false);
  });

  it("preserves approval capability checks for contributors", async () => {
    const { base, run, propose } = await fixture();
    const tenant = login.json.activeTenant!.id;
    await client.post(`/api/tenants/${tenant}/members`, { email: "proposal-contributor@example.test", role: "contributor" });
    const contributor = new TestClient(app);
    await contributor.devLogin("proposal-contributor@example.test");
    await contributor.post("/api/auth/tenant", { tenantId: tenant });
    const p = await propose("create-task", { title: "Work", requirementIds: [A] });
    const inspected = await contributor.get<ProposalPreview>(`${base}/proposals/${p.id}/preview`);
    expect(inspected.status).toBe(200);
    expect((await contributor.post(`${base}/proposals/${p.id}/decision`, { decision: "approved", reviewToken: inspected.json.reviewToken })).status).toBe(403);
    expect((await contributor.post(`${base}/runs/${run}/approve-all`, { proposalIds: [p.id], reviewToken: "token" })).status).toBe(403);
  });

  it("freezes batch IDs and cannot sweep in a newly added proposal", async () => {
    const { ws, run, base, propose } = await fixture();
    const first = await propose("create-task", { title: "Reviewed", requirementIds: [A] });
    const batch = await client.get<ProposalBatchPreview>(`${base}/runs/${run}/approval-preview`);
    const extra = await propose("create-task", { title: "Not reviewed", requirementIds: [B] });
    const tampered = await client.post(`${base}/runs/${run}/approve-all`, { reviewToken: batch.json.reviewToken, proposalIds: [...batch.json.proposalIds, extra.id] });
    expect(tampered.status).toBe(409);
    const result = await client.post<ProposalBatchResult>(`${base}/runs/${run}/approve-all`, { reviewToken: batch.json.reviewToken, proposalIds: batch.json.proposalIds });
    expect(result.status, result.text).toBe(200);
    expect(result.json).toMatchObject({ total: 1, applied: 1, failed: 0, skipped: 0 });
    expect((await svc.store.proposals.get(first.id))?.status).toBe("applied");
    expect((await svc.store.proposals.get(extra.id))?.status).toBe("pending");
    expect((await svc.store.tasks.list(ws)).map((task) => task.title)).toEqual(["Reviewed"]);
  });

  it("reports conflicting batch targets honestly and applies only independent proposals", async () => {
    const { ws, run, base, propose } = await fixture();
    const a = await propose("set-level", { nodeId: A, current: 2 });
    const b = await propose("set-level", { nodeId: A, current: 4 });
    await propose("create-task", { title: "Independent", requirementIds: [B] });
    const batch = await client.get<ProposalBatchPreview>(`${base}/runs/${run}/approval-preview`);
    expect(batch.json.conflicts).toHaveLength(1);
    const result = await client.post<ProposalBatchResult>(`${base}/runs/${run}/approve-all`, { reviewToken: batch.json.reviewToken, proposalIds: batch.json.proposalIds });
    expect(result.json).toMatchObject({ total: 3, applied: 1, failed: 0, skipped: 2 });
    expect((await svc.store.proposals.get(a.id))?.status).toBe("pending");
    expect((await svc.store.proposals.get(b.id))?.status).toBe("pending");
    expect((await svc.store.states.get(ws, A))?.current).toBe(0);
  });

  it("keeps a missing requirement state's identity and skips overlapping proposals without creating the row", async () => {
    const { ws, run, base, propose } = await fixture();
    await svc.store.db().execute("DELETE FROM requirement_states WHERE workspace_id = ? AND node_id = ?", [ws, A]);
    const a = await propose("set-level", { nodeId: A, current: 2 });
    const b = await propose("set-level", { nodeId: A, current: 4 });
    const batch = await client.get<ProposalBatchPreview>(`${base}/runs/${run}/approval-preview`);
    expect(batch.status, batch.text).toBe(200);
    for (const inspected of batch.json.proposals) {
      expect(inspected.changes.find((change) => change.entityType === "requirement")).toMatchObject({ entityId: A, current: null });
    }
    expect(batch.json.conflicts).toHaveLength(1);
    expect(new Set(batch.json.conflicts[0]!.proposalIds)).toEqual(new Set([a.id, b.id]));
    const result = await client.post<ProposalBatchResult>(`${base}/runs/${run}/approve-all`, { reviewToken: batch.json.reviewToken, proposalIds: batch.json.proposalIds });
    expect(result.status, result.text).toBe(200);
    expect(result.json).toMatchObject({ total: 2, applied: 0, failed: 0, skipped: 2 });
    expect((await svc.store.proposals.get(a.id))?.status).toBe("pending");
    expect((await svc.store.proposals.get(b.id))?.status).toBe("pending");
    expect(await svc.store.states.get(ws, A)).toBeUndefined();
  });

  it("rejects a changed batch target before applying any reviewed item", async () => {
    const { ws, run, base, propose } = await fixture();
    const a = await propose("set-level", { nodeId: A, current: 2 });
    const b = await propose("create-task", { title: "Must stay pending", requirementIds: [B] });
    const batch = await client.get<ProposalBatchPreview>(`${base}/runs/${run}/approval-preview`);
    expect(batch.headers.get("cache-control")).toBe("private, no-store");
    await svc.updateState(ws, A, { current: 1 });
    const result = await client.post(`${base}/runs/${run}/approve-all`, { reviewToken: batch.json.reviewToken, proposalIds: batch.json.proposalIds });
    expect(result.status).toBe(409);
    expect((await svc.store.proposals.get(a.id))?.status).toBe("pending");
    expect((await svc.store.proposals.get(b.id))?.status).toBe("pending");
    expect(await svc.store.tasks.list(ws)).toEqual([]);
  });

  it("reports actual partial failures without rolling back independent successes", async () => {
    const { ws, run, base, propose } = await fixture();
    await propose("create-task", { title: "Succeeds", requirementIds: [A] });
    const failing = await propose("create-task", { title: "Fails on apply", requirementIds: [B] });
    const batch = await client.get<ProposalBatchPreview>(`${base}/runs/${run}/approval-preview`);
    const createTask = svc.createTask.bind(svc);
    vi.spyOn(svc, "createTask").mockImplementation(async (id, input, actor) => {
      if (input.title === "Fails on apply" && !actor?.startsWith("approving user")) throw new Error("Injected task write failure");
      return createTask(id, input, actor);
    });
    const result = await client.post<ProposalBatchResult>(`${base}/runs/${run}/approve-all`, { reviewToken: batch.json.reviewToken, proposalIds: batch.json.proposalIds });
    expect(result.status, result.text).toBe(200);
    expect(result.json).toMatchObject({ total: 2, applied: 1, failed: 1, skipped: 0 });
    expect(result.json.results.find((item) => item.proposalId === failing.id)?.message).toContain("Injected");
    expect((await svc.store.tasks.list(ws)).map((task) => task.title)).toEqual(["Succeeds"]);
    expect((await svc.verifyAuditTrail(ws)).valid).toBe(true);
  });

  it("rolls back an item's writes and events when its decision audit fails, reporting that it remains pending", async () => {
    const { ws, run, base, propose } = await fixture();
    await propose("create-task", { title: "Committed", requirementIds: [A] });
    const failing = await propose("create-task", { title: "Must roll back", requirementIds: [B] });
    const batch = await client.get<ProposalBatchPreview>(`${base}/runs/${run}/approval-preview`);
    const log = svc.log.bind(svc), events = vi.spyOn(svc.bus, "publish");
    vi.spyOn(svc, "log").mockImplementation(async (...args) => {
      if (args[3] === "proposal" && args[4] === failing.id) throw new Error("Injected decision audit failure");
      return log(...args);
    });
    const result = await client.post<ProposalBatchResult>(`${base}/runs/${run}/approve-all`, { reviewToken: batch.json.reviewToken, proposalIds: batch.json.proposalIds });
    expect(result.status, result.text).toBe(200);
    expect(result.json).toMatchObject({ total: 2, applied: 1, failed: 1, skipped: 0 });
    expect(result.json.results.find((item) => item.proposalId === failing.id)).toMatchObject({ status: "failed", proposalStatus: "pending" });
    expect((await svc.store.proposals.get(failing.id))?.status).toBe("pending");
    expect((await svc.store.tasks.list(ws)).map((task) => task.title)).toEqual(["Committed"]);
    expect(events.mock.calls.filter((call) => call[1] === "task.created")).toHaveLength(1);
    expect((await svc.verifyAuditTrail(ws)).valid).toBe(true);
  });

  it("shows authoritative connector observations and keeps file byte review in its direct workflow", async () => {
    const { ws, base, propose } = await fixture();
    const connector = await svc.createConnector(ws, { kind: "repo-scan", name: "Stored connector", config: { path: "." } });
    const check = { id: newId("check"), workspaceId: ws, connectorId: connector.id, checkId: "access", title: "Stored check", detail: "Observed access configuration", outcome: "pass" as const, requirementIds: [A], observedAt: "2026-01-01T00:00:00.000Z", observed: { enabled: true, id: "ev_external", at: "2026-01-01", by: "External observer", steps: ["first", "second"] } };
    await svc.store.checks.put(check);
    const p = await propose("create-evidence", { checkResultId: check.id, title: "Ignore invented title", content: "Ignore invented content", requirementIds: [B] });
    const inspected = await preview(base, p);
    expect(inspected.affectedRequirementIds).toEqual([A]);
    expect(inspected.sources[0]?.detail).toMatchObject({ ...check, connector: { id: connector.id, name: connector.name } });
    const change = inspected.changes.find((change) => change.entityType === "evidence")!;
    expect(change.proposed["content"]).toBe(check.detail);
    expect(change.proposed["collectedAt"]).toBe(check.observedAt);
    expect(change.proposed["source"]).toBe("connector");
    expect(change.proposed["data"]).toMatchObject({ observed: check.observed });
    // Record collection ordering is immaterial, but order inside an observed
    // artifact is meaningful and remains bound even without a revision bump.
    await svc.store.checks.put({ ...check, observed: { ...check.observed, steps: ["second", "first"] } });
    const reordered = await preview(base, p);
    expect(reordered.reviewToken).not.toBe(inspected.reviewToken);
    expect(reordered.changes.find((change) => change.entityType === "evidence")!.proposed["data"]).toMatchObject({ observed: { steps: ["second", "first"] } });
    expect((await client.post(`${base}/proposals/${p.id}/decision`, { decision: "approved", reviewToken: inspected.reviewToken })).status).toBe(409);
    const file = await svc.createFileEvidence(ws, { title: "File", fileName: "config.txt", mediaType: "text/plain", requirementIds: [A] }, Buffer.from("file bytes"));
    const fileProposal = await propose("review-evidence", { evidenceId: file.id, decision: "accepted" });
    const get = vi.spyOn(svc.blobs, "get");
    const blocked = await preview(base, fileProposal);
    expect(blocked.canApprove).toBe(false);
    expect(blocked.unresolvedQuestions.join(" ")).toContain("reviewed directly");
    expect(get).not.toHaveBeenCalled();
    expect((await svc.store.evidence.get(file.id))?.status).toBe("pending-review");
  });

  it("does not let RMF proposals carry an authorization decision", async () => {
    const { propose } = await fixture();
    await expect(propose("set-rmf", { authorization: { decision: "ato" } })).rejects.toThrow("cannot propose authorization");
  });
});
