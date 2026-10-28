import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AgentHost, AgentResult } from "@visua/agents";
import { FrameworkRegistry } from "@visua/frameworks";
import { createService } from "../src/context.ts";
import { testDatabase } from "./db.ts";

const execute = vi.hoisted(() => vi.fn<(host: AgentHost) => Promise<AgentResult>>());
vi.mock("@visua/agents", async (original) => ({ ...await original<typeof import("@visua/agents")>(), executeAgent: execute }));

const db = await testDatabase("agent_stages");
const svc = await createService({ database: db.url, registry: FrameworkRegistry.load() });
const done: AgentResult = { summary: "Observed answer", mode: "offline" };
let sequence = 0;
const fixture = () => svc.createWorkspace({ name: `Stage tracking ${++sequence}`, tenantId: "stages-tenant", frameworks: ["nist-csf-2.0"], profile: { industry: "saas", size: "11-50", dataTypes: [], drivers: [], environments: ["cloud"], maturityTier: 1, guidance: "guided", securityTeamSize: 1 } });
const change = { type: "set-level" as const, title: "Observed implementation", rationale: "A recorded source", payload: { nodeId: "nist-csf-2.0:PR.AA-01", current: 2 }, nodeIds: ["nist-csf-2.0:PR.AA-01"], citations: [], confidence: "medium" as const };
const eventNames = (run: Awaited<ReturnType<typeof svc.waitForRun>>) => run.stageHistory?.map((event) => `${event.stage}:${event.status}`);
beforeEach(() => { execute.mockReset(); execute.mockResolvedValue(done); });
afterEach(async () => { await svc.drainRuns(); vi.restoreAllMocks(); });
afterAll(async () => { await svc.store.close(); await db.cleanup(); });

describe(`agent stage lifecycle (${db.dialect})`, () => {
  it("persists real collect and analysis boundaries without inventing proposal stages", async () => {
    const ws = await fixture();
    const queued = await svc.startRun(ws.id, { agent: "copilot", goal: "Answer" });
    expect(queued.stageHistory).toEqual([]);
    const completed = await svc.waitForRun(queued.id);
    expect(completed.status).toBe("completed");
    expect(eventNames(completed)).toEqual(["collect:started", "collect:completed", "analyze:started", "analyze:completed"]);
    expect(completed.stageHistory!.every((event) => Number.isFinite(Date.parse(event.at)))).toBe(true);
    expect(await svc.store.proposals.list(ws.id)).toHaveLength(0);
    expect((await svc.store.runs.get(queued.id))!.stageHistory).toEqual(completed.stageHistory);
  });

  it("leaves collection incomplete when the workspace snapshot fails", async () => {
    const ws = await fixture();
    vi.spyOn(svc.store.evidence, "list").mockRejectedValueOnce(new Error("Snapshot unavailable"));
    const queued = await svc.startRun(ws.id, { agent: "copilot", goal: "Collect" });
    const failed = await svc.waitForRun(queued.id);
    expect(failed).toMatchObject({ status: "failed", error: "Snapshot unavailable" });
    expect(eventNames(failed)).toEqual(["collect:started"]);
    expect(execute).not.toHaveBeenCalled();
  });

  it("leaves analysis incomplete when runtime execution fails", async () => {
    const ws = await fixture();
    execute.mockRejectedValueOnce(new Error("Runtime unavailable"));
    const queued = await svc.startRun(ws.id, { agent: "copilot", goal: "Analyze" });
    const failed = await svc.waitForRun(queued.id);
    expect(failed.status).toBe("failed");
    expect(eventNames(failed)).toEqual(["collect:started", "collect:completed", "analyze:started"]);
  });

  it("does not start analysis after cancellation during collection", async () => {
    const ws = await fixture();
    const original = svc.store.evidence.list.bind(svc.store.evidence);
    let release!: () => void;
    let entered!: () => void;
    const reached = new Promise<void>((resolve) => { entered = resolve; });
    const held = new Promise<void>((resolve) => { release = resolve; });
    vi.spyOn(svc.store.evidence, "list").mockImplementationOnce(async (id) => { entered(); await held; return original(id); });
    const queued = await svc.startRun(ws.id, { agent: "copilot", goal: "Stop collection" });
    try {
      await reached;
      await svc.cancelRun(ws.id, queued.id);
    } finally { release(); }
    await svc.drainRuns();
    const cancelled = (await svc.store.runs.get(queued.id))!;
    expect(cancelled.status).toBe("cancelled");
    expect(eventNames(cancelled)).toEqual(["collect:started"]);
    expect(execute).not.toHaveBeenCalled();
  });

  it("does not record analysis completion after cancellation wins", async () => {
    const ws = await fixture();
    let release!: () => void;
    let entered!: () => void;
    const reached = new Promise<void>((resolve) => { entered = resolve; });
    const held = new Promise<void>((resolve) => { release = resolve; });
    execute.mockImplementationOnce(async () => { entered(); await held; return done; });
    const queued = await svc.startRun(ws.id, { agent: "copilot", goal: "Stop analysis" });
    try {
      await reached;
      await svc.cancelRun(ws.id, queued.id);
    } finally { release(); }
    await svc.drainRuns();
    const cancelled = (await svc.store.runs.get(queued.id))!;
    expect(cancelled.status).toBe("cancelled");
    expect(eventNames(cancelled)).toEqual(["collect:started", "collect:completed", "analyze:started"]);
  });

  it("retains observed analysis completion through exact human approval", async () => {
    const ws = await fixture();
    execute.mockImplementationOnce(async (host) => { await host.propose(change); return done; });
    const queued = await svc.startRun(ws.id, { agent: "assessor", goal: "Propose" });
    const awaiting = await svc.waitForRun(queued.id);
    expect(awaiting.status).toBe("awaiting-approval");
    const proposal = (await svc.store.proposals.list(ws.id))[0]!;
    const preview = await svc.previewProposal(ws.id, proposal.id);
    const decision = await svc.decideProposal(ws.id, proposal.id, "approved", "reviewer", undefined, preview.reviewToken);
    expect(decision).toMatchObject({ status: "applied", decidedBy: "reviewer" });
    const completed = (await svc.store.runs.get(queued.id))!;
    expect(completed.status).toBe("completed");
    expect(completed.stageHistory).toEqual(awaiting.stageHistory);
  });

  it("preserves autonomy as the decision source without inventing human review", async () => {
    const ws = await fixture();
    await svc.updateWorkspace(ws.id, { autonomy: { "create-task": true } });
    const task = { ...change, type: "create-task" as const, payload: { title: "Review access", requirementIds: change.nodeIds } };
    execute.mockImplementationOnce(async (host) => { await host.propose(task); return done; });
    const queued = await svc.startRun(ws.id, { agent: "planner", goal: "Granted autonomy" });
    const completed = await svc.waitForRun(queued.id);
    expect(completed.status).toBe("completed");
    expect((await svc.store.proposals.list(ws.id))[0]).toMatchObject({ status: "applied", decidedBy: "autonomy" });
    expect(eventNames(completed)).toEqual(["collect:started", "collect:completed", "analyze:started", "analyze:completed"]);
  });
});
