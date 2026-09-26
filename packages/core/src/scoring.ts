import type { FrameworkIndex } from "./graph.ts";
import { deriveStatus, isEvidenceValid, type DerivedStatus } from "./status.ts";
import type { CheckResult, Evidence, Priority, RequirementNode, RequirementState, Status, Task } from "./types.ts";
import { STATUSES } from "./types.ts";

export const PRIORITY_WEIGHT: Record<Priority, number> = { critical: 4, high: 3, medium: 2, low: 1 };

export interface WorkspaceSnapshot {
  states: Map<string, RequirementState>;
  evidenceByNode: Map<string, Evidence[]>;
  tasksByNode: Map<string, Task[]>;
  checksByNode: Map<string, CheckResult[]>;
}

export interface NodeScore {
  nodeId: string;
  /** Weighted readiness 0..1: mean of min(current/target, 1) across applicable units of work. */
  readiness: number;
  /** Mean current level across applicable units of work. */
  current: number;
  /** Mean target level across applicable units of work. */
  target: number;
  /** Weighted sum of positive gaps (target − current) × priority weight. */
  gapScore: number;
  /** Count of applicable units with current < target. */
  gaps: number;
  counts: Record<Status, number>;
  /** Applicable units of work under this node. */
  total: number;
  /** Fraction of applicable units with at least one valid (accepted, unexpired) evidence item. */
  evidenceCoverage: number;
  /** Fraction of applicable units whose status is verified. */
  verifiedShare: number;
}

export interface FrameworkScore {
  frameworkId: string;
  statuses: Map<string, DerivedStatus>;
  scores: Map<string, NodeScore>;
  overall: NodeScore;
}

export interface ScoreOptions {
  /**
   * Which units count toward the roll-ups (readiness, gaps, totals); by default all.
   * Units left out still get a status: e.g. statutory obligations not yet in effect.
   */
  counts?: (node: RequirementNode) => boolean;
}

interface Acc {
  weight: number;
  readinessW: number;
  currentSum: number;
  targetSum: number;
  gapScore: number;
  gaps: number;
  counts: Record<Status, number>;
  total: number;
  withEvidence: number;
  verified: number;
}

const emptyCounts = (): Record<Status, number> =>
  Object.fromEntries(STATUSES.map((s) => [s, 0])) as Record<Status, number>;

const emptyAcc = (): Acc => ({
  weight: 0,
  readinessW: 0,
  currentSum: 0,
  targetSum: 0,
  gapScore: 0,
  gaps: 0,
  counts: emptyCounts(),
  total: 0,
  withEvidence: 0,
  verified: 0,
});

function merge(into: Acc, from: Acc): void {
  into.weight += from.weight;
  into.readinessW += from.readinessW;
  into.currentSum += from.currentSum;
  into.targetSum += from.targetSum;
  into.gapScore += from.gapScore;
  into.gaps += from.gaps;
  into.total += from.total;
  into.withEvidence += from.withEvidence;
  into.verified += from.verified;
  for (const s of STATUSES) into.counts[s] += from.counts[s];
}

function finalize(nodeId: string, acc: Acc): NodeScore {
  const n = acc.total || 1;
  return {
    nodeId,
    readiness: acc.weight ? acc.readinessW / acc.weight : 0,
    current: acc.total ? acc.currentSum / n : 0,
    target: acc.total ? acc.targetSum / n : 0,
    gapScore: acc.gapScore,
    gaps: acc.gaps,
    counts: acc.counts,
    total: acc.total,
    evidenceCoverage: acc.total ? acc.withEvidence / n : 0,
    verifiedShare: acc.total ? acc.verified / n : 0,
  };
}

/** Unit-level contribution of one assessable requirement. */
function unitAcc(status: DerivedStatus, state: RequirementState | undefined, evidence: Evidence[], now: Date): Acc {
  const acc = emptyAcc();
  acc.counts[status.status] += 1;
  if (status.status === "not-applicable") return acc;
  const current = state?.current ?? 0;
  const target = state?.target ?? 0;
  const weight = PRIORITY_WEIGHT[state?.priority ?? "medium"];
  const ratio = target > 0 ? Math.min(current / target, 1) : current > 0 ? 1 : 0;
  acc.weight = weight;
  acc.readinessW = ratio * weight;
  acc.currentSum = current;
  acc.targetSum = target;
  acc.total = 1;
  if (target > current) {
    acc.gaps = 1;
    acc.gapScore = (target - current) * weight;
  }
  if (evidence.some((e) => isEvidenceValid(e, now))) acc.withEvidence = 1;
  if (status.status === "verified") acc.verified = 1;
  return acc;
}

/** Derive statuses and roll readiness up the framework hierarchy. */
export function scoreFramework(index: FrameworkIndex, snapshot: WorkspaceSnapshot, now: Date = new Date(), opts: ScoreOptions = {}): FrameworkScore {
  const statuses = new Map<string, DerivedStatus>();
  const scores = new Map<string, NodeScore>();

  const visit = (nodeId: string | null): Acc => {
    const acc = emptyAcc();
    const node = nodeId ? index.byId.get(nodeId) : undefined;
    if (node && node.assessable && !node.withdrawn) {
      const state = snapshot.states.get(node.id);
      const evidence = snapshot.evidenceByNode.get(node.id) ?? [];
      const status = deriveStatus({
        state,
        evidence,
        tasks: snapshot.tasksByNode.get(node.id) ?? [],
        checks: snapshot.checksByNode.get(node.id) ?? [],
        now,
      });
      statuses.set(node.id, status);
      if (opts.counts?.(node) !== false) merge(acc, unitAcc(status, state, evidence, now));
    }
    const kids = nodeId === null ? index.roots() : index.childrenOf(nodeId);
    for (const child of kids) merge(acc, visit(child.id));
    if (nodeId) scores.set(nodeId, finalize(nodeId, acc));
    return acc;
  };

  const overallAcc = visit(null);
  return { frameworkId: index.id, statuses, scores, overall: finalize(index.id, overallAcc) };
}

/** Roll-up status for a group node: worst-first summary used to tint beacons/sectors. */
export function groupStatus(score: NodeScore): Status {
  const c = score.counts;
  if (score.total === 0) return c["not-applicable"] > 0 ? "not-applicable" : "not-started";
  if (c["at-risk"] > 0) return "at-risk";
  const done = c["implemented"] + c["verified"];
  if (c["verified"] === score.total) return "verified";
  if (done === score.total) return "implemented";
  if (done > 0 || c["in-progress"] > 0) return "in-progress";
  return "not-started";
}

export function buildSnapshot(input: {
  states: RequirementState[];
  evidence: Evidence[];
  tasks: Task[];
  checks: CheckResult[];
}): WorkspaceSnapshot {
  const states = new Map(input.states.map((s) => [s.nodeId, s]));
  const push = <T>(map: Map<string, T[]>, key: string, value: T) => {
    const list = map.get(key);
    if (list) list.push(value);
    else map.set(key, [value]);
  };
  const evidenceByNode = new Map<string, Evidence[]>();
  for (const e of input.evidence) for (const id of e.requirementIds) push(evidenceByNode, id, e);
  const tasksByNode = new Map<string, Task[]>();
  for (const t of input.tasks) for (const id of t.requirementIds) push(tasksByNode, id, t);
  // Only the latest result per (connector, check, requirement) counts.
  const latest = new Map<string, CheckResult>();
  for (const c of input.checks) {
    for (const id of c.requirementIds) {
      const key = `${c.connectorId}|${c.checkId}|${id}`;
      const prev = latest.get(key);
      if (!prev || prev.observedAt < c.observedAt) latest.set(key, c);
    }
  }
  const checksByNode = new Map<string, CheckResult[]>();
  for (const [key, c] of latest) push(checksByNode, key.split("|")[2]!, c);
  return { states, evidenceByNode, tasksByNode, checksByNode };
}
