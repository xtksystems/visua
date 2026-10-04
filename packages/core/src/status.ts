import type { CheckResult, Evidence, RequirementState, Status, Task } from "./types.ts";
import { evidenceReviewScope, hasCurrentEvidenceReview } from "./evidence.ts";

export interface StatusSignals {
  state: RequirementState | undefined;
  evidence: Evidence[];
  tasks: Task[];
  checks: CheckResult[];
  now?: Date;
}

export interface DerivedStatus {
  status: Status;
  /** Human-readable reasons, most important first. */
  reasons: string[];
}

const DAY = 86_400_000;

export function isEvidenceValid(e: Evidence, now: Date = new Date()): boolean {
  if (e.status !== "accepted" || !hasCurrentEvidenceReview(e) || !Number.isFinite(now.getTime())) return false;
  try {
    const scope = evidenceReviewScope(e);
    return new Date(scope.collectedAt).getTime() <= now.getTime()
      && (scope.validUntil === undefined || now.getTime() <= new Date(scope.validUntil).getTime());
  } catch {
    return false;
  }
}

export function evidenceFreshness(e: Evidence, now: Date = new Date()): "fresh" | "expiring" | "expired" | "none" {
  if (e.status === "expired") return "expired";
  if (!Number.isFinite(now.getTime())) return "none";
  try {
    const scope = evidenceReviewScope(e);
    const remaining = scope.validUntil === undefined ? undefined : new Date(scope.validUntil).getTime() - now.getTime();
    if (remaining !== undefined && remaining < 0) return "expired";
    if (new Date(scope.collectedAt).getTime() > now.getTime() || e.status !== "accepted" || !hasCurrentEvidenceReview(e)) return "none";
    return remaining !== undefined && remaining < 30 * DAY ? "expiring" : "fresh";
  } catch {
    return "none";
  }
}

export function isTaskOverdue(t: Task, now: Date = new Date()): boolean {
  if (!t.dueDate || t.status === "done" || !Number.isFinite(now.getTime())) return false;
  // Calendar dates remain due through their UTC day. Preserve legacy timestamp precision.
  if (/^\d{4}-\d{2}-\d{2}$/.test(t.dueDate)) return t.dueDate < now.toISOString().slice(0, 10);
  return new Date(t.dueDate).getTime() < now.getTime();
}

/**
 * Derive a requirement's status from its assessment state and live signals.
 *
 * Precedence: not-applicable → manual override → at-risk (failing check,
 * expired evidence on an implemented requirement, overdue work) → verified →
 * implemented → in-progress → not-started.
 */
export function deriveStatus({ state, evidence, tasks, checks, now = new Date() }: StatusSignals): DerivedStatus {
  if (state && !state.applicable) {
    return { status: "not-applicable", reasons: [state.applicabilityRationale ?? "Marked not applicable"] };
  }
  if (state?.statusOverride) {
    return { status: state.statusOverride, reasons: ["Status set manually"] };
  }

  const current = state?.current ?? 0;
  const target = state?.target ?? 0;
  const reasons: string[] = [];

  const failing = checks.filter((c) => c.outcome === "fail");
  if (failing.length) reasons.push(`${failing.length} monitoring check(s) failing: ${failing.map((c) => c.title).join(", ")}`);

  const expired = evidence.filter((e) => evidenceFreshness(e, now) === "expired");
  if (expired.length && current > 0) reasons.push(`${expired.length} evidence item(s) expired`);

  const overdue = tasks.filter((t) => isTaskOverdue(t, now));
  if (overdue.length) reasons.push(`${overdue.length} task(s) overdue`);

  if (reasons.length) return { status: "at-risk", reasons };

  const validEvidence = evidence.filter((e) => isEvidenceValid(e, now));
  const meetsTarget = target > 0 && current >= target;

  if (meetsTarget && state?.verifiedAt && validEvidence.length > 0) {
    return { status: "verified", reasons: ["Target met, verified, with valid evidence"] };
  }
  if (meetsTarget) {
    return {
      status: "implemented",
      reasons: [validEvidence.length ? "Target level met — awaiting verification" : "Target level met — evidence needed"],
    };
  }
  const activeTasks = tasks.filter((t) => t.status === "in-progress" || t.status === "in-review");
  if (current > 0 || activeTasks.length > 0) {
    return {
      status: "in-progress",
      reasons: [`Level ${current} of target ${target}` + (activeTasks.length ? `, ${activeTasks.length} task(s) active` : "")],
    };
  }
  return { status: "not-started", reasons: ["No implementation recorded yet"] };
}
