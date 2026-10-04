import { afterAll, describe, expect, it, vi } from "vitest";
import type { OrganizationProfile, RequirementState, Task } from "@visua/core";
import { FrameworkRegistry } from "@visua/frameworks";
import { workspaceContext, type AgentHost } from "@visua/agents";
import { listTasks, modelTask } from "../../../packages/agents/src/tools.ts";
import { createApp } from "../src/app.ts";
import { loadAuthConfig } from "../src/auth/config.ts";
import { AuthService } from "../src/auth/service.ts";
import { createService } from "../src/context.ts";
import { TestClient } from "./client.ts";
import { testDatabase } from "./db.ts";

const registry = FrameworkRegistry.load();
const db = await testDatabase("member_work");
const svc = await createService({ database: db.url, registry });
const auth = new AuthService(svc, { ...loadAuthConfig({}), mode: "dev" });
const app = createApp(svc, auth);
const owner = new TestClient(app);
const login = await owner.devLogin("work-owner@example.test", "Shared Name");
const tenant = login.json.activeTenant!.id;
const ownerId = login.json.user.id;
const member = await auth.ensureUser("work-member@example.test", "Shared Name");
await auth.grantMembership(tenant, member, "contributor", "fixture");
const memberClient = new TestClient(app);
await memberClient.devLogin(member.email, member.name);
await memberClient.post("/api/auth/tenant", { tenantId: tenant });
const outsider = new TestClient(app);
const outside = await outsider.devLogin("work-outside@example.test", "Shared Name");
const outsideId = outside.json.user.id;
const profile: OrganizationProfile = { industry: "saas", size: "11-50", dataTypes: [], drivers: [], environments: ["cloud"], maturityTier: 1, guidance: "guided", securityTeamSize: 1 };
const A = "nist-csf-2.0:PR.AA-01", B = "nist-csf-2.0:PR.AA-02";
type MyWork = Awaited<ReturnType<typeof svc.myWork>>;

async function fixture() {
  const response = await owner.post<{ workspace: { id: string; slug: string } }>("/api/workspaces", { name: "Member work", profile, frameworks: ["nist-csf-2.0"] });
  expect(response.status).toBe(201);
  const ws = response.json.workspace.id;
  return { ws, root: `/api/workspaces/${ws}`, requirement: `/api/workspaces/${ws}/requirements/${A}`, slug: response.json.workspace.slug };
}

afterAll(async () => { await svc.store.close(); await db.cleanup(); });

describe(`member assignment and My work (${db.dialect})`, () => {
  it("exposes only the current tenant member ids and names, through workspace access and canonical slugs", async () => {
    const { root, slug } = await fixture();
    const response = await memberClient.get<{ id: string; name: string }[]>(`${root}/members`);
    expect(response.status).toBe(200);
    expect(response.json).toEqual(expect.arrayContaining([{ id: ownerId, name: "Shared Name" }, { id: member.id, name: "Shared Name" }]));
    expect(response.json.some((user) => user.id === outsideId)).toBe(false);
    for (const user of response.json) expect(Object.keys(user).sort()).toEqual(["id", "name"]);
    expect((await memberClient.get(`/api/workspaces/${slug}/members`)).json).toEqual(response.json);
    for (const path of [`${root}/members`, `${root}/my-work`]) {
      expect((await outsider.get(path)).status).toBe(404);
      expect((await new TestClient(app).get(path)).status).toBe(401);
    }
  });

  it("canonicalizes task and requirement assignment names from the selected member", async () => {
    const { ws, root, requirement } = await fixture();
    const response = await memberClient.post<Task>(`${root}/tasks`, { title: "Owned task", assignee: { type: "person", id: member.id, name: "Spoofed executive" }, dueDate: "2028-02-29" });
    expect(response.status).toBe(201);
    expect(response.json.assignee).toEqual({ type: "person", id: member.id, name: "Shared Name" });
    const task = response.json;
    const reassigned = await owner.patch<{ task: Task }>(`${root}/tasks/${task.id}`, { assignee: { type: "person", id: ownerId } });
    expect(reassigned.status).toBe(200);
    expect(reassigned.json.task.assignee).toEqual({ type: "person", id: ownerId, name: "Shared Name" });
    const state = await memberClient.patch<RequirementState>(requirement, { ownerUserId: member.id, owner: "Spoofed requirement owner", dueDate: "2028-02-29" });
    expect(state.status).toBe(200);
    expect(state.json).toMatchObject({ ownerUserId: member.id, owner: "Shared Name", dueDate: "2028-02-29" });
    expect((await svc.store.activity.head(ws))?.data).toMatchObject({ before: { ownerUserId: null, dueDate: null }, after: { ownerUserId: member.id, owner: "Shared Name", dueDate: "2028-02-29" } });
  });

  it("rejects missing, cross-tenant and departed members without mutating data", async () => {
    const { ws, root, requirement } = await fixture();
    const departed = await auth.ensureUser("departed-work@example.test", "Former member");
    await auth.grantMembership(tenant, departed, "contributor", "fixture");
    const task = await svc.createTask(ws, { title: "Before departure", assignee: { type: "person", id: departed.id, name: "ignored" } });
    const state = await svc.updateState(ws, A, { ownerUserId: departed.id });
    expect((await owner.del(`/api/tenants/${tenant}/members/${departed.id}`)).status).toBe(204);
    const before = await svc.store.activity.head(ws);
    for (const id of ["missing-user", outsideId, departed.id]) {
      expect((await owner.post(`${root}/tasks`, { title: "Bad member", assignee: { type: "person", id, name: "Shared Name" } })).status).toBe(400);
      expect((await owner.patch(`${root}/tasks/${task.id}`, { assignee: { type: "person", id, name: "Shared Name" } })).status).toBe(400);
      expect((await owner.patch(requirement, { ownerUserId: id })).status).toBe(400);
      await expect(svc.createTask(ws, { title: "Direct", assignee: { type: "person", id, name: "Shared Name" } })).rejects.toThrow("current member");
      await expect(svc.updateState(ws, A, { ownerUserId: id })).rejects.toThrow("current member");
    }
    expect(await svc.store.activity.head(ws)).toEqual(before);
    expect(await svc.store.tasks.get(task.id)).toEqual(task);
    expect(await svc.store.states.get(ws, A)).toEqual(state);
    expect((await owner.get<{ id: string }[]>(`${root}/members`)).json.some((user) => user.id === departed.id)).toBe(false);
    expect((await svc.updateTask(ws, task.id, { title: "Still editable" })).task.assignee).toEqual(task.assignee);
    expect((await svc.updateState(ws, A, { notes: "Still editable" })).ownerUserId).toBe(departed.id);
  });

  it("keeps legacy labels readable and permits unrelated edits without assigning them to same-named users", async () => {
    const { ws, root } = await fixture();
    const base = await svc.createTask(ws, { title: "Legacy task" });
    const task: Task = { ...base, assignee: { type: "person", id: "u-ciso", name: "Shared Name" }, startDate: "legacy-value", dueDate: "2026-01-01T00:00:00Z" };
    await svc.store.tasks.put(task);
    const state = (await svc.store.states.get(ws, A))!;
    await svc.store.states.put(ws, { ...state, owner: "Shared Name" });
    expect((await owner.get<Task[]>(`${root}/tasks`)).json.find((item) => item.id === task.id)?.assignee).toEqual(task.assignee);
    const changed = await svc.updateTask(ws, task.id, { status: "in-progress" });
    expect(changed.task).toMatchObject({ assignee: task.assignee, startDate: task.startDate, dueDate: task.dueDate });
    expect((await svc.updateTask(ws, task.id, { dueDate: "2027-01-01" })).task.startDate).toBe("legacy-value");
    expect(await svc.myWork(ws, ownerId)).toEqual({ tasks: [], requirements: [] });
  });

  it("supports explicit external labels and null clearing with before/after audit snapshots", async () => {
    const { ws, root, requirement } = await fixture();
    const task = await svc.createTask(ws, { title: "Clear fields", startDate: "2027-01-01", dueDate: "2027-01-02", assignee: { type: "person", id: member.id, name: "ignored" } });
    const external = await owner.patch<{ task: Task }>(`${root}/tasks/${task.id}`, { assignee: { type: "external", id: "external", name: "  Outside counsel  " } });
    expect(external.json.task.assignee).toEqual({ type: "external", id: "external", name: "Outside counsel" });
    for (const assignee of [{ type: "external", id: member.id, name: "Outside" }, { type: "external", id: "external", name: "  " }]) {
      expect((await owner.patch(`${root}/tasks/${task.id}`, { assignee })).status).toBe(400);
      await expect(svc.updateTask(ws, task.id, { assignee } as never)).rejects.toThrow();
    }
    const cleared = await owner.patch<{ task: Task }>(`${root}/tasks/${task.id}`, { assignee: null, dueDate: null, startDate: null });
    expect(cleared.status).toBe(200);
    for (const field of ["assignee", "dueDate", "startDate"]) expect(cleared.json.task).not.toHaveProperty(field);
    expect((await svc.store.activity.head(ws))?.data).toMatchObject({ before: { assignee: { type: "external", name: "Outside counsel" }, startDate: "2027-01-01", dueDate: "2027-01-02" }, after: { assignee: null, startDate: null, dueDate: null } });
    await svc.updateState(ws, A, { ownerUserId: member.id, dueDate: "2027-01-02" });
    const externalState = await owner.patch<RequirementState>(requirement, { owner: "  Outside counsel  " });
    expect(externalState.json.owner).toBe("Outside counsel");
    expect(externalState.json.ownerUserId).toBeUndefined();
    await svc.updateState(ws, A, { ownerUserId: member.id });
    const clearedState = await owner.patch<RequirementState>(requirement, { ownerUserId: null, dueDate: null });
    expect(clearedState.status).toBe(200);
    for (const field of ["owner", "ownerUserId", "dueDate"]) expect(clearedState.json).not.toHaveProperty(field);
    await svc.updateState(ws, A, { owner: "Outside counsel" });
    expect((await owner.patch<RequirementState>(requirement, { owner: null })).json.owner).toBeUndefined();
  });

  it("rejects impossible dates, timestamps, and reversed effective task ranges through API and service", async () => {
    const { ws, root, requirement } = await fixture();
    const task = await svc.createTask(ws, { title: "Dates", startDate: "2027-06-10", dueDate: "2027-06-12" });
    const before = await svc.store.activity.head(ws);
    for (const value of ["not-a-date", "2027-02-29", "2026-02-30", "2027-13-01", "2027-6-01", "2027-06-10T00:00:00.000Z"]) {
      for (const field of ["startDate", "dueDate"]) {
        expect((await owner.post(`${root}/tasks`, { title: "Invalid", [field]: value })).status).toBe(400);
        expect((await owner.patch(`${root}/tasks/${task.id}`, { [field]: value })).status).toBe(400);
        await expect(svc.createTask(ws, { title: "Invalid", [field]: value })).rejects.toThrow("calendar date");
        await expect(svc.updateTask(ws, task.id, { [field]: value })).rejects.toThrow("calendar date");
      }
      expect((await owner.patch(requirement, { dueDate: value })).status).toBe(400);
      await expect(svc.updateState(ws, A, { dueDate: value })).rejects.toThrow("calendar date");
    }
    for (const patch of [{ dueDate: "2027-06-09" }, { startDate: "2027-06-13" }]) {
      expect((await owner.patch(`${root}/tasks/${task.id}`, patch)).status).toBe(400);
      await expect(svc.updateTask(ws, task.id, patch)).rejects.toThrow("precede");
    }
    expect((await owner.post(`${root}/tasks`, { title: "Reversed", startDate: "2027-06-10", dueDate: "2027-06-09" })).status).toBe(400);
    expect(await svc.store.activity.head(ws)).toEqual(before);
    expect(await svc.store.tasks.get(task.id)).toEqual(task);
    expect((await svc.updateTask(ws, task.id, { startDate: null, dueDate: "2027-06-09" })).task.dueDate).toBe("2027-06-09");
  });

  it("validates agent proposal dates and assignment again when approvals apply", async () => {
    const { ws } = await fixture();
    const propose = (payload: Record<string, unknown>) => svc.createProposal(ws, "run", { type: "create-task", title: "Task proposal", rationale: "Plan", payload: { title: "Task", requirementIds: [A], ...payload }, confidence: "high", citations: [], nodeIds: [A] });
    await expect(propose({ dueDate: "2027-02-29" })).rejects.toThrow("calendar date");
    await expect(propose({ startDate: "2027-06-10", dueDate: "2027-06-09" })).rejects.toThrow("precede");
    await expect(propose({ assignee: { type: "person", id: outsideId, name: "Shared Name" } })).rejects.toThrow("current member");
    const proposal = await propose({ dueDate: "2027-06-10" });
    const count = await svc.store.tasks.count(ws);
    const failed = await svc.decideProposal(ws, proposal.id, "approved", "Owner", { dueDate: "2027-02-29" });
    expect(failed.status).toBe("failed");
    expect(await svc.store.tasks.count(ws)).toBe(count);
    const task = await svc.createTask(ws, { title: "Proposal edit", startDate: "2027-01-02" });
    await expect(svc.createProposal(ws, "run", { type: "update-task", title: "Update", rationale: "Plan", payload: { taskId: task.id, dueDate: "2027-01-01" }, confidence: "high", citations: [], nodeIds: [] })).rejects.toThrow("precede");
  });

  it("validates edited links against enabled assessable requirements and retains source/licensing provenance", async () => {
    const { ws, root } = await fixture();
    const source = { ...registry.node(A)!.citation, documentId: "restricted-source-fixture", basis: "Original licensed guidance" };
    const task = await svc.createTask(ws, { title: "Linked task", requirementIds: [A], source, origin: "template" });
    const changed = await owner.patch<{ task: Task }>(`${root}/tasks/${task.id}`, { requirementIds: [B, B] });
    expect(changed.status).toBe(200);
    expect(changed.json.task).toMatchObject({ requirementIds: [B], source, origin: "template" });
    expect((await svc.store.activity.head(ws))?.data).toMatchObject({ before: { requirementIds: [A], source }, after: { requirementIds: [B], source } });
    const nonassessable = registry.framework("nist-csf-2.0")!.graph.nodes.find((node) => !node.assessable)!.id;
    const disabled = registry.framework("nist-ai-rmf")!.graph.nodes.find((node) => node.assessable)!.id;
    const threat = [...registry.indexes.values()].find((index) => index.graph.framework.family === "threat")!.graph.nodes[0]!.id;
    const before = await svc.store.activity.head(ws);
    for (const id of ["unknown:node", nonassessable, disabled, threat]) {
      expect((await owner.patch(`${root}/tasks/${task.id}`, { requirementIds: [id] })).status).toBe(400);
      await expect(svc.updateTask(ws, task.id, { requirementIds: [id] })).rejects.toThrow();
    }
    expect(await svc.store.activity.head(ws)).toEqual(before);
    const cleared = await svc.updateTask(ws, task.id, { requirementIds: [], source: undefined, origin: "user" });
    expect(cleared.task).toMatchObject({ requirementIds: [], source, origin: "template" });
    const search = await owner.get<{ nodes: { id: string; assessable: boolean }[] }>("/api/search?q=access&framework=nist-csf-2.0");
    expect(search.json.nodes.length).toBeGreaterThan(0);
    for (const node of search.json.nodes) expect(node.assessable).toBe(registry.node(node.id)!.assessable);
  });

  it("initializes and monotonically retains server-owned task text provenance despite hostile patches", async () => {
    const { ws, root } = await fixture();
    const created = await owner.post<Task>(`${root}/tasks`, { title: "Provenance", requirementIds: [A], contentRequirementIds: [B] });
    expect(created.status).toBe(201);
    expect(created.json.contentRequirementIds).toEqual([A]);
    const direct = await svc.createTask(ws, { title: "Direct provenance", requirementIds: [A], contentRequirementIds: [B] });
    expect(direct.contentRequirementIds).toEqual([A]);
    const linked = await owner.patch<{ task: Task }>(`${root}/tasks/${created.json.id}`, { requirementIds: [B], contentRequirementIds: [] });
    expect(linked.status).toBe(200);
    expect(linked.json.task).toMatchObject({ requirementIds: [B], contentRequirementIds: [A, B] });
    const unlinked = await svc.updateTask(ws, created.json.id, { requirementIds: [], contentRequirementIds: null } as never);
    expect(unlinked.task.contentRequirementIds).toEqual([A, B]);
    const assigned = await svc.updateTask(ws, created.json.id, { assignee: { type: "person", id: member.id, name: "spoofed" }, contentRequirementIds: ["forged:id"] } as never);
    expect(assigned.task).toMatchObject({ requirementIds: [], contentRequirementIds: [A, B], assignee: { type: "person", id: member.id, name: member.name } });
    expect((await svc.store.activity.head(ws))?.data).toMatchObject({ before: { contentRequirementIds: [A, B] }, after: { contentRequirementIds: [A, B] } });
    const legacy: Task = { ...direct, contentRequirementIds: undefined };
    await svc.store.tasks.put(legacy);
    expect((await svc.updateTask(ws, legacy.id, { requirementIds: [] })).task.contentRequirementIds).toEqual([A]);
    const planned = await svc.planWith(ws, "nist-csf-2.0", 2);
    expect(planned).toHaveLength(2);
    for (const task of planned) expect(task.contentRequirementIds).toEqual(task.requirementIds);
  });

  it("protects user task text without a source after unlinking and relinking when sent to model tools/context", async () => {
    const { ws } = await fixture();
    const fakeLicensed = { ...registry.node(A)!, text: "FAKE LICENSED NARRATIVE FOR RELINKING", attributes: { licensed: true, summary: "Safe fixture summary", pointsOfFocus: [{ title: "FAKE LICENSED CHECKLIST FOR RELINKING" }] } };
    const task = await svc.createTask(ws, { title: fakeLicensed.text, description: fakeLicensed.text, requirementIds: [A], checklist: [{ id: "", text: "FAKE LICENSED CHECKLIST FOR RELINKING", done: false }, { id: "", text: "User-authored context", done: false }] });
    expect(task.source).toBeUndefined();
    const workspace = await svc.workspace(ws);
    const mode = process.env["VISUA_AGENT_MODE"], permission = process.env["VISUA_AICPA_AI_USE"];
    process.env["VISUA_AGENT_MODE"] = "claude";
    delete process.env["VISUA_AICPA_AI_USE"];
    try {
      for (const requirementIds of [[], [B]]) {
        const changed = (await svc.updateTask(ws, task.id, { requirementIds })).task;
        const host = { registry: { node: (id: string) => id === A ? fakeLicensed : registry.node(id) }, workspace: () => ({ ...workspace, frameworks: [] }), tasks: () => [changed] } as unknown as AgentHost;
        const projected = modelTask(host, changed);
        expect(projected.description).not.toContain("FAKE LICENSED");
        for (const output of [JSON.stringify(await listTasks.run(host, {})), workspaceContext(host, { agent: "task-executor", goal: "Execute", input: { taskId: task.id } })]) {
          expect(output).not.toContain("FAKE LICENSED");
          expect(output).toContain("withheld");
          expect(output).toContain("User-authored context");
        }
      }
    } finally {
      if (mode === undefined) delete process.env["VISUA_AGENT_MODE"]; else process.env["VISUA_AGENT_MODE"] = mode;
      if (permission === undefined) delete process.env["VISUA_AICPA_AI_USE"]; else process.env["VISUA_AICPA_AI_USE"] = permission;
    }
  });

  it("selects My work by stable identity, includes all statuses, and excludes same-name, external, agent and disabled requirements", async () => {
    const { ws, root, slug } = await fixture();
    const ownTasks = await Promise.all((["todo", "done"] as const).map((status) => svc.createTask(ws, { title: `Own ${status}`, status, assignee: { type: "person", id: member.id, name: "spoofed" } })));
    await svc.createTask(ws, { title: "Same name", assignee: { type: "person", id: ownerId, name: "Shared Name" } });
    await svc.createTask(ws, { title: "External name", assignee: { type: "external", id: "external", name: "Shared Name" } });
    await svc.createTask(ws, { title: "Agent identity", assignee: { type: "agent", id: member.id, name: "Shared Name" } });
    await svc.updateState(ws, A, { ownerUserId: member.id, dueDate: "2027-01-01", current: 1 });
    await svc.updateState(ws, B, { owner: "Shared Name" });
    await svc.enableFramework(ws, "nist-ai-rmf", { enabled: true });
    const ai = registry.framework("nist-ai-rmf")!.graph.nodes.find((node) => node.assessable)!.id;
    await svc.updateState(ws, ai, { ownerUserId: member.id });
    await svc.enableFramework(ws, "nist-ai-rmf", { enabled: false });
    const response = await memberClient.get<MyWork>(`${root}/my-work`);
    expect(response.status).toBe(200);
    expect(response.json.tasks.map((task) => task.id).sort()).toEqual(ownTasks.map((task) => task.id).sort());
    expect(response.json.requirements).toEqual([{ id: A, code: registry.node(A)!.code, title: registry.node(A)!.title, state: await svc.store.states.get(ws, A), status: "in-progress" }]);
    expect((await memberClient.get(`/api/workspaces/${slug}/my-work`)).json).toEqual(response.json);
    const otherWork = await owner.get<MyWork>(`${root}/my-work`);
    expect(otherWork.json.tasks).toHaveLength(1);
    expect(otherWork.json.requirements).toEqual([]);
    const tokenResponse = await owner.post<{ token: string }>(`/api/tenants/${tenant}/tokens`, { name: "Shared Name", role: "contributor" });
    expect(tokenResponse.status).toBe(201);
    const tokenClient = new TestClient(app);
    tokenClient.bearer = tokenResponse.json.token;
    expect((await tokenClient.get(`${root}/my-work`)).json).toEqual({ tasks: [], requirements: [] });
  });

  it("lets viewers and auditors read their work but denies assignment, date and link writes", async () => {
    const { ws, root, requirement } = await fixture();
    const task = await svc.createTask(ws, { title: "Protected task", requirementIds: [A] });
    for (const role of ["viewer", "auditor"] as const) {
      const user = await auth.ensureUser(`work-${role}@example.test`, role);
      await auth.grantMembership(tenant, user, role, "fixture");
      const client = new TestClient(app);
      await client.devLogin(user.email);
      await client.post("/api/auth/tenant", { tenantId: tenant });
      expect((await client.get(`${root}/members`)).status).toBe(200);
      expect((await client.get(`${root}/my-work`)).status).toBe(200);
      for (const patch of [{ assignee: { type: "person", id: user.id, name: user.name } }, { dueDate: "2027-01-01" }, { requirementIds: [B] }]) expect((await client.patch(`${root}/tasks/${task.id}`, patch)).status).toBe(403);
      for (const patch of [{ ownerUserId: user.id }, { dueDate: "2027-01-01" }]) expect((await client.patch(requirement, patch)).status).toBe(403);
      expect((await client.post(`${root}/tasks`, { title: "Denied", assignee: { type: "person", id: user.id } })).status).toBe(403);
    }
  });

  it("rolls assignment, dates, links, audit, revision and events back together on audit failure", async () => {
    const { ws } = await fixture();
    const task = await svc.createTask(ws, { title: "Atomic work", requirementIds: [A] });
    const state = (await svc.store.states.get(ws, A))!;
    const workspace = await svc.workspace(ws);
    const head = await svc.store.activity.head(ws);
    const events: string[] = [];
    const off = svc.bus.subscribe(ws, (event) => events.push(event.type));
    const audit = vi.spyOn(svc.store.activity, "append");
    try {
      audit.mockRejectedValueOnce(new Error("audit unavailable"));
      await expect(svc.updateTask(ws, task.id, { assignee: { type: "person", id: member.id, name: "ignored" }, dueDate: "2027-01-01", requirementIds: [B] })).rejects.toThrow("audit unavailable");
      audit.mockRejectedValueOnce(new Error("audit unavailable"));
      await expect(svc.updateState(ws, A, { ownerUserId: member.id, dueDate: "2027-01-01" })).rejects.toThrow("audit unavailable");
    } finally { audit.mockRestore(); off(); }
    expect(await svc.store.tasks.get(task.id)).toEqual(task);
    expect(await svc.store.states.get(ws, A)).toEqual(state);
    expect(await svc.workspace(ws)).toEqual(workspace);
    expect(await svc.store.activity.head(ws)).toEqual(head);
    expect(events).toEqual([]);
    expect((await svc.verifyAuditTrail(ws)).valid).toBe(true);
  });
});
