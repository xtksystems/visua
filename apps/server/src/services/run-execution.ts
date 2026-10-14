import type { AgentRun } from "@visua/core";

export interface RunExecutionOptions {
  /** Local worker slots; the durable workspace limit is checked across all instances. */
  concurrency?: number;
  workspaceConcurrency?: number;
  maxQueuedPerWorkspace?: number;
  leaseMs?: number;
  heartbeatMs?: number;
}

export interface RunFence {
  runId: string;
  workspaceId: string;
  ownerId: string;
  attemptId: string;
  epoch: number;
}

export class RunLeaseLostError extends Error {
  constructor() { super("Run execution is no longer owned by this worker"); }
}

export function runExecutionOptions(input: RunExecutionOptions = {}) {
  const integer = (value: number | undefined, fallback: number, maximum: number) => {
    const resolved = value ?? fallback;
    if (!Number.isSafeInteger(resolved) || resolved < 1 || resolved > maximum) throw new RangeError("Invalid run execution limit");
    return resolved;
  };
  const leaseMs = integer(input.leaseMs, 30_000, 600_000);
  const heartbeatMs = integer(input.heartbeatMs, Math.min(5_000, Math.max(1, Math.floor(leaseMs / 3))), 60_000);
  if (heartbeatMs >= leaseMs) throw new RangeError("Run heartbeat must be shorter than its lease");
  return {
    concurrency: integer(input.concurrency, 2, 32),
    workspaceConcurrency: integer(input.workspaceConcurrency, 1, 8),
    maxQueuedPerWorkspace: integer(input.maxQueuedPerWorkspace, 32, 256),
    leaseMs, heartbeatMs,
  };
}

export function ownsRun(run: AgentRun | undefined, fence: RunFence, at = Date.now()): run is AgentRun {
  const lease = run?.execution;
  return run?.id === fence.runId && run.workspaceId === fence.workspaceId && run.status === "running"
    && run.executionEpoch === fence.epoch && lease?.epoch === fence.epoch
    && lease.ownerId === fence.ownerId && lease.attemptId === fence.attemptId
    && Number.isFinite(Date.parse(lease.leaseExpiresAt)) && Date.parse(lease.leaseExpiresAt) > at;
}
