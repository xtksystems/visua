import { afterEach, describe, expect, it, vi } from "vitest";
import type { AgentHost, AgentResult } from "@visua/agents";
import type { AgentRun } from "@visua/core";
import { FrameworkRegistry } from "@visua/frameworks";
import { EventBus } from "../src/bus.ts";
import { MemoryBlobStore } from "../src/blobs/index.ts";
import { openStore, type Store } from "../src/storage/index.ts";
import { RunQueueFullError, VisuaService } from "../src/services/visua.ts";
import type { RunExecutionOptions, RunFence } from "../src/services/run-execution.ts";
import type { ConnectorKind } from "../src/connectors/index.ts";
import { testDatabase, type TestDatabase } from "./db.ts";

const execute = vi.hoisted(() => vi.fn<(host: AgentHost) => Promise<AgentResult>>());
vi.mock("@visua/agents", async (original) => ({ ...await original<typeof import("@visua/agents")>(), executeAgent: execute }));
const registry = FrameworkRegistry.load();
const result: AgentResult = { summary: "Observed result", mode: "offline" };
const change = { type: "set-level" as const, title: "Recorded observation", rationale: "Recorded source", payload: { nodeId: "nist-csf-2.0:PR.AA-01", current: 2 }, citations: [], confidence: "medium" as const, nodeIds: ["nist-csf-2.0:PR.AA-01"] };
const services: VisuaService[] = [], stores = new Set<Store>(), databases: TestDatabase[] = [];
let sequence = 0;
const latch = () => { let release!: () => void; const promise = new Promise<void>((resolve) => { release = resolve; }); return { promise, release }; };
const settle = async (predicate: () => Promise<boolean>) => {
  for (let i = 0; i < 200; i++) { if (await predicate()) return; await new Promise(resolve => setTimeout(resolve, 5)); }
  throw new Error("Expected state was not reached");
};
async function fixture(options: RunExecutionOptions = {}, kinds: ConnectorKind[] = []) {
  const db = await testDatabase(`run_reliability_${++sequence}`); databases.push(db);
  const store = await openStore(db.url); stores.add(store);
  // SQLite uses one shared connection; PostgreSQL exercises distinct connections and workspace locks.
  const otherStore = db.dialect === "postgres" ? await openStore(db.url) : store; stores.add(otherStore);
  const a = new VisuaService(store, registry, new EventBus(), kinds, new MemoryBlobStore(), options);
  const b = new VisuaService(otherStore, registry, new EventBus(), kinds, new MemoryBlobStore(), options);
  services.push(a, b);
  const ws = await a.createWorkspace({ name: `Reliable runs ${sequence}`, tenantId: "run-fixture", frameworks: ["nist-csf-2.0"], profile: { industry: "saas", size: "11-50", dataTypes: [], drivers: [], environments: ["cloud"], maturityTier: 1, guidance: "guided", securityTeamSize: 1 } });
  return { a, b, ws, db };
}
const queued = (workspaceId: string, id = `run_fixture_${++sequence}`): AgentRun => ({ id, workspaceId, agent: "copilot", goal: "Recover queued work", input: {}, status: "queued", mode: "offline", steps: [], stageHistory: [], focusNodeIds: [], executionEpoch: 0, createdAt: new Date().toISOString() });
const fenceOf = (run: AgentRun): RunFence => ({ runId: run.id, workspaceId: run.workspaceId, ownerId: run.execution!.ownerId, attemptId: run.execution!.attemptId, epoch: run.execution!.epoch });
afterEach(async () => {
  vi.useRealTimers();
  for (const svc of services.splice(0)) await svc.stopRuns(0);
  for (const store of stores) await store.close(); stores.clear();
  for (const db of databases.splice(0)) await db.cleanup();
  execute.mockReset(); vi.restoreAllMocks();
});

describe("durable run execution", () => {
  it("fences connector results, steps and proposals when instance B cancels A despite ignored abort", async () => {
    const entered = latch(), release = latch();
    let connectorSignal: AbortSignal | undefined;
    const kind: ConnectorKind = { kind: "held", name: "Held", description: "Fixture", configFields: [], run: async (_config, signal) => { connectorSignal = signal; entered.release(); await release.promise; return [{ checkId: "access", title: "Recorded", outcome: "pass", detail: "Recorded source", observed: { enabled: true }, requirements: { csf: ["PR.AA-01"] } }]; } };
    const { a, b, ws } = await fixture({}, [kind]);
    const connector = await a.createConnector(ws.id, { kind: kind.kind, config: {} });
    execute.mockImplementationOnce(async host => {
      await host.runConnector(connector.id).catch(() => undefined);
      host.step({ type: "message", title: "Late step" });
      await host.propose(change).catch(() => undefined);
      return result;
    });
    const run = await a.startRun(ws.id, { agent: "evidence-collector", goal: "Collect" });
    await entered.promise;
    const cancelled = await b.cancelRun(ws.id, run.id);
    const head = await a.store.activity.head(ws.id);
    expect(cancelled.status).toBe("cancelled");
    release.release(); await a.drainRuns();
    expect(connectorSignal).toBeDefined();
    expect((await a.store.runs.get(run.id))!.steps).toEqual(cancelled.steps);
    expect(await a.store.proposals.list(ws.id)).toEqual([]);
    expect(await a.store.checks.list(ws.id)).toEqual([]);
    expect(await a.store.evidence.metadataList(ws.id)).toEqual([]);
    expect(await a.store.activity.head(ws.id)).toEqual(head);
    expect((await a.store.connectors.get(connector.id))!.lastRunAt).toBeUndefined();
  });

  it("allows only one instance to claim a queued attempt", async () => {
    const { a, b, ws } = await fixture();
    const entered = latch(), release = latch();
    execute.mockImplementation(async () => { entered.release(); await release.promise; return result; });
    const run = queued(ws.id); await a.store.runs.put(run);
    await Promise.all([a.reconcileRuns(), b.reconcileRuns()]); await entered.promise;
    expect(execute).toHaveBeenCalledTimes(1);
    const saved = (await a.store.runs.get(run.id))!;
    expect(saved).toMatchObject({ status: "running", executionEpoch: 1, execution: { epoch: 1 } });
    expect(saved.execution!.attemptId).toMatch(/^[\da-f-]{36}$/);
    release.release(); await Promise.all([a.drainRuns(), b.drainRuns()]);
    expect((await a.store.runs.get(run.id))!.status).toBe("completed");
  });

  it("expires a dead lease without replaying its writes and refuses the old owner", async () => {
    const { a, b, ws } = await fixture();
    const entered = latch(), release = latch();
    let host!: AgentHost;
    execute.mockImplementationOnce(async current => { host = current; entered.release(); await release.promise; return result; });
    const run = await a.startRun(ws.id, { agent: "copilot", goal: "Expire" }); await entered.promise;
    const owned = (await a.store.runs.get(run.id))!, fence = fenceOf(owned);
    await a.store.runs.put({ ...owned, execution: { ...owned.execution!, leaseExpiresAt: new Date(Date.now() - 1).toISOString() } });
    await b.reconcileRuns();
    const interrupted = (await a.store.runs.get(run.id))!;
    expect(interrupted).toMatchObject({ status: "failed", interruptionReason: "owner-expired", executionEpoch: fence.epoch + 1 });
    await expect(host.propose(change)).rejects.toThrow("no longer owned");
    await expect(a.appendRunStep(fence, { id: "stale", at: new Date().toISOString(), type: "message", title: "Stale" })).rejects.toThrow("no longer owned");
    release.release(); await a.drainRuns();
    expect(await a.store.runs.get(run.id)).toEqual(interrupted);
    expect(await a.store.proposals.list(ws.id)).toEqual([]);
  });

  it("bounds local concurrency and durable workspace queue with explicit overload", async () => {
    const { a, b, ws } = await fixture({ concurrency: 1, maxQueuedPerWorkspace: 1 });
    const entered = latch(), release = latch();
    execute.mockImplementation(async () => { entered.release(); await release.promise; return result; });
    const first = await a.startRun(ws.id, { agent: "copilot", goal: "First" }); await entered.promise;
    const second = await a.startRun(ws.id, { agent: "copilot", goal: "Second" });
    await expect(b.startRun(ws.id, { agent: "copilot", goal: "Overload" })).rejects.toBeInstanceOf(RunQueueFullError);
    await b.reconcileRuns(); // Workspace's durable slot is still occupied by A.
    expect(execute).toHaveBeenCalledTimes(1);
    expect((await a.store.runs.get(second.id))!.status).toBe("queued");
    release.release();
    expect((await a.waitForRun(first.id)).status).toBe("completed");
    expect((await a.waitForRun(second.id)).status).toBe("completed");
    expect(execute).toHaveBeenCalledTimes(2);
  });

  it("reconciles queued and abandoned running records without changing terminal history", async () => {
    const { a, ws } = await fixture(); execute.mockResolvedValue(result);
    const pending = queued(ws.id), legacyRunning = { ...queued(ws.id), status: "running" as const, executionEpoch: undefined, stageHistory: undefined }, completed = { ...queued(ws.id), status: "completed" as const, executionEpoch: undefined };
    await a.store.runs.put(pending); await a.store.runs.put(legacyRunning); await a.store.runs.put(completed);
    await a.startRunScheduler();
    expect((await a.waitForRun(pending.id)).status).toBe("completed");
    expect(await a.store.runs.get(legacyRunning.id)).toMatchObject({ status: "failed", interruptionReason: "owner-expired" });
    expect((await a.store.runs.get(legacyRunning.id))!.stageHistory).toBeUndefined();
    expect(await a.store.runs.get(completed.id)).toEqual(completed);
    expect(execute).toHaveBeenCalledTimes(1);
  });

  it("reaches later eligible and abandoned runs behind more than one page of blocked queues", async () => {
    const { a, ws } = await fixture();
    const entered = latch(), release = latch();
    execute.mockImplementationOnce(async () => { entered.release(); await release.promise; return result; });
    const old = "2020-01-01T00:00:00.000Z";
    const at = new Date().toISOString();
    await a.store.atomic(async () => {
      for (let i = 0; i < 8; i++) {
        const busy = { ...ws, id: `${ws.id}_busy_${i}`, slug: `${ws.slug}-busy-${i}` };
        await a.store.workspaces.put(busy);
        const active: AgentRun = {
          ...queued(busy.id), status: "running", executionEpoch: 1,
          execution: { ownerId: "another-live-instance", attemptId: `attempt-${i}`, epoch: 1, heartbeatAt: at, leaseExpiresAt: new Date(Date.now() + 600_000).toISOString() },
        };
        await a.store.runs.put(active, at);
        for (let q = 0; q < 32; q++) await a.store.runs.put(queued(busy.id), old);
      }
    });
    const eligible = queued(ws.id);
    const abandoned: AgentRun = { ...queued(ws.id), status: "running" };
    await a.store.runs.put(eligible, at);
    await a.store.runs.put(abandoned, at);
    try {
      await a.reconcileRuns();
      expect(execute).not.toHaveBeenCalled();
      await a.reconcileRuns();
      expect(await a.store.runs.get(abandoned.id)).toMatchObject({ status: "failed", interruptionReason: "owner-expired" });
      await entered.promise;
      expect(execute).toHaveBeenCalledTimes(1);
      expect((await a.store.runs.get(eligible.id))!.status).toBe("running");
    } finally { release.release(); await a.drainRuns(); }
  });

  it("keeps a sweep stable across updates and deletion, then wraps to newly inserted work", async () => {
    const { a, ws } = await fixture();
    const runs = Array.from({ length: 4 }, () => queued(ws.id));
    for (const run of runs) await a.store.runs.put(run);
    const first = await a.store.runs.scanActive(undefined, 2);
    expect(first.runs.map(run => run.id)).toEqual(runs.slice(0, 2).map(run => run.id));
    expect(first.cursor).toBeDefined();
    // Moving timestamps, deleting the cursor row, and retiring a later row must not skip work.
    await a.store.runs.put(runs[0]!, "2040-01-01T00:00:00.000Z");
    await a.store.runs.delete(runs[1]!.id);
    await a.store.runs.put(runs[2]!, "2000-01-01T00:00:00.000Z");
    await a.store.runs.put({ ...runs[3]!, status: "completed" });
    const added = queued(ws.id); await a.store.runs.put(added);
    const second = await a.store.runs.scanActive(first.cursor, 2);
    expect(second.runs.map(run => run.id)).toEqual([runs[2]!.id]);
    expect(second.cursor).toBeUndefined();
    const wrapped = await a.store.runs.scanActive(second.cursor, 2);
    expect(wrapped.runs.map(run => run.id)).toEqual([runs[0]!.id, runs[2]!.id]);
    const tail = await a.store.runs.scanActive(wrapped.cursor, 2);
    expect(tail.runs.map(run => run.id)).toEqual([added.id]);
    expect(tail.cursor).toBeUndefined();
  });

  it("does not cancel completed or awaiting-approval runs or rewrite their history", async () => {
    const { a, b, ws } = await fixture();
    execute.mockResolvedValueOnce(result);
    const first = await a.startRun(ws.id, { agent: "copilot", goal: "Finish" });
    const completed = await a.waitForRun(first.id);
    expect(await b.cancelRun(ws.id, first.id)).toEqual(completed);
    execute.mockImplementationOnce(async host => { await host.propose(change); return result; });
    const second = await a.startRun(ws.id, { agent: "assessor", goal: "Propose" });
    const awaiting = await a.waitForRun(second.id), head = await a.store.activity.head(ws.id);
    expect(awaiting.status).toBe("awaiting-approval");
    expect(await b.cancelRun(ws.id, second.id)).toEqual(awaiting);
    expect(await a.store.activity.head(ws.id)).toEqual(head);
    expect((await a.store.proposals.list(ws.id))[0]!.status).toBe("pending");
  });

  it("publishes a step only after its durable transaction commits", async () => {
    const { a, ws } = await fixture();
    const seen: Promise<boolean>[] = [];
    const unsubscribe = a.bus.subscribe(ws.id, event => {
      if (event.type !== "agent.step") return;
      const data = event.data as { runId: string; step: { id: string } };
      seen.push(a.store.runs.get(data.runId).then(run => !!run?.steps.some(step => step.id === data.step.id)));
    });
    execute.mockImplementationOnce(async host => { host.step({ type: "message", title: "Persist first" }); return result; });
    const run = await a.startRun(ws.id, { agent: "copilot", goal: "Record" }); await a.waitForRun(run.id); await a.drainRuns(); unsubscribe();
    expect(seen).toHaveLength(1);
    expect(await Promise.all(seen)).toEqual([true]);
    expect((await a.verifyAuditTrail(ws.id)).valid).toBe(true);
  });

  it("renews owned leases while queued work stays durable", async () => {
    const { a, ws } = await fixture(); const entered = latch(), release = latch();
    execute.mockImplementationOnce(async () => { entered.release(); await release.promise; return result; });
    const run = await a.startRun(ws.id, { agent: "copilot", goal: "Heartbeat" }); await entered.promise;
    const owned = (await a.store.runs.get(run.id))!;
    await a.store.runs.put({ ...owned, execution: { ...owned.execution!, heartbeatAt: new Date(Date.now() - 1000).toISOString(), leaseExpiresAt: new Date(Date.now() + 1000).toISOString() } });
    await a.reconcileRuns();
    const renewed = (await a.store.runs.get(run.id))!;
    expect(renewed.execution!.attemptId).toBe(owned.execution!.attemptId);
    expect(renewed.executionEpoch).toBe(owned.executionEpoch);
    expect(Date.parse(renewed.execution!.leaseExpiresAt)).toBeGreaterThan(Date.now() + 10_000);
    release.release(); await a.drainRuns();
  });

  it("stops launches, fences work and drains within a bound when execution ignores abort", async () => {
    const { a, ws } = await fixture(); const entered = latch(), release = latch();
    let host!: AgentHost;
    execute.mockImplementationOnce(async current => { host = current; entered.release(); await release.promise; host.step({ type: "message", title: "Late after stop" }); await host.propose(change).catch(() => undefined); return result; });
    const run = await a.startRun(ws.id, { agent: "copilot", goal: "Shutdown" }); await entered.promise;
    const began = performance.now(); await a.stopRuns(10);
    expect(performance.now() - began).toBeLessThan(1000);
    expect(host.signal.aborted).toBe(true);
    const interrupted = (await a.store.runs.get(run.id))!;
    expect(interrupted).toMatchObject({ status: "failed", interruptionReason: "server-stopped" });
    await expect(a.startRun(ws.id, { agent: "copilot", goal: "Too late" })).rejects.toThrow("stopping");
    release.release(); await a.drainRuns();
    expect(await a.store.runs.get(run.id)).toEqual(interrupted);
    expect(await a.store.proposals.list(ws.id)).toEqual([]);
  });
});
