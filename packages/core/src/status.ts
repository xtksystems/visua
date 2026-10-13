import type { CheckResult, Evidence, RequirementState, Status, Task } from "./types.ts";
import { evidenceReviewScope, hasCurrentEvidenceReview } from "./evidence.ts";

export interface StatusSignals {
  state: RequirementState | undefined;
  evidence: Evidence[];
  allEvidence?: Evidence[];
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
    return new Date(e.reviewHistory!.at(-1)!.reviewedAt).getTime() <= now.getTime()
      && new Date(scope.collectedAt).getTime() <= now.getTime()
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
    if (!isEvidenceValid(e, now)) return "none";
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
export function deriveStatus({ state, evidence, allEvidence = evidence, tasks, checks, now = new Date() }: StatusSignals): DerivedStatus {
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

  const expired = evidence.filter((e) => evidenceFreshness(e, now) === "expired" && !effectiveEvidenceState(e, allEvidence, now, state?.nodeId).supersededByIds.length);
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


export interface EffectiveEvidenceState {
  status: "valid" | "pending-review" | "rejected" | "withdrawn" | "expired" | "not-yet-valid" | "invalid" | "superseded";
  validity: "current" | "not-yet-valid" | "expired" | "invalid";
  currentlyValid: boolean;
  acceptanceBound: boolean;
  reasons: string[];
  supersededByIds: string[];
}

/** Periods may advance, but a replacement cannot silently change the assurance claim. */
export function compatibleEvidenceSeries(previous: Evidence, next: Evidence): boolean {
  if (previous.workspaceId !== next.workspaceId) return false;
  const a = previous.assurance ?? { kind: "unspecified", scope: "" };
  const b = next.assurance ?? { kind: "unspecified", scope: "" };
  if (a.kind !== b.kind || a.scope.trim() !== b.scope.trim()) return false;
  const human = (e: Evidence) => e.provenance?.origin === "upload" || e.provenance?.origin === "manual" || (!e.provenance && ["upload", "manual"].includes(e.source));
  if (human(previous) && human(next)) return true;
  return !!previous.provenance?.seriesKey && previous.provenance.seriesKey === next.provenance?.seriesKey;
}

/** One shared metadata-only assessment for lineage and expiry-risk suppression. */
export function effectiveEvidenceState(e: Evidence, evidence: readonly Evidence[], at = new Date(), requirementId?: string): EffectiveEvidenceState {
  let validity: EffectiveEvidenceState["validity"] = "invalid";
  try {
    const scope = evidenceReviewScope(e);
    if (Number.isFinite(at.getTime())) validity = scope.validUntil && new Date(scope.validUntil).getTime() < at.getTime() ? "expired" : new Date(scope.collectedAt).getTime() > at.getTime() ? "not-yet-valid" : "current";
  } catch { /* Invalid legacy metadata is visible and never covers a requirement. */ }
  const acceptanceBound = hasCurrentEvidenceReview(e);
  const currentlyValid = isEvidenceValid(e, at);
  const awaitingReviewTime = e.status === "accepted" && acceptanceBound && new Date(e.reviewHistory!.at(-1)!.reviewedAt).getTime() > at.getTime();
  const byId = new Map(evidence.map((item) => [item.id, item]));
  const explicitlyReplaces = (candidate: Evidence): boolean => {
    const seen = new Set([candidate.id]);
    let next = candidate;
    while (next.supersedesId) {
      if (seen.has(next.supersedesId)) return false;
      seen.add(next.supersedesId);
      const previous = byId.get(next.supersedesId);
      if (!previous || !compatibleEvidenceSeries(previous, next)) return false;
      if (previous.id === e.id) return true;
      next = previous;
    }
    return false;
  };
  const supersededByIds = evidence.filter((candidate) => {
    if (candidate.id === e.id || !compatibleEvidenceSeries(e, candidate) || !isEvidenceValid(candidate, at)) return false;
    const reviewedAt = candidate.reviewHistory?.at(-1)?.reviewedAt;
    if (!reviewedAt || new Date(reviewedAt).getTime() > at.getTime()) return false;
    const covered = requirementId ? candidate.requirementIds.includes(requirementId) : e.requirementIds.length > 0 && e.requirementIds.every((id) => candidate.requirementIds.includes(id));
    if (!covered) return false;
    if (explicitlyReplaces(candidate)) return true;
    return !!e.provenance?.seriesKey && e.provenance.seriesKey === candidate.provenance?.seriesKey
      && new Date(candidate.collectedAt).getTime() > new Date(e.collectedAt).getTime();
  }).map((item) => item.id).sort();
  const status: EffectiveEvidenceState["status"] = supersededByIds.length ? "superseded"
    : e.status === "withdrawn" || e.status === "rejected" || e.status === "pending-review" ? e.status
    : validity !== "current" ? validity : e.status === "expired" ? "expired" : awaitingReviewTime ? "pending-review" : currentlyValid ? "valid" : "invalid";
  const reasons: string[] = [];
  if (supersededByIds.length) reasons.push("Replaced by valid accepted evidence covering this requirement");
  if (e.status === "withdrawn") reasons.push(`Withdrawn: ${e.reviewHistory?.at(-1)?.note ?? "reason not recorded"}`);
  if (e.status === "rejected") reasons.push(`Rejected: ${e.reviewHistory?.at(-1)?.note ?? "reason not recorded"}`);
  if (e.status === "pending-review") reasons.push("Awaiting review of this artifact and scope");
  if (awaitingReviewTime) reasons.push("The recorded acceptance had not occurred at this evaluation time; earlier decisions are not reconstructed");
  if (validity === "expired" || e.status === "expired") reasons.push("Evidence validity has expired");
  if (validity === "not-yet-valid") reasons.push("Evidence validity has not started");
  if (validity === "invalid") reasons.push("Evidence has an invalid validity window or assurance scope");
  if (e.status === "accepted" && !acceptanceBound) reasons.push("Acceptance does not bind the current artifact and scope");
  if (!reasons.length) reasons.push("Accepted review matches the artifact and its current validity window");
  return { status, validity, currentlyValid, acceptanceBound, reasons, supersededByIds };
}

export interface RequirementEvidenceLineage {
  workspaceId: string;
  requirementId: string;
  asOf: string;
  status: Status;
  reasons: string[];
  items: { evidence: Evidence; effective: EffectiveEvidenceState; unknowns: string[] }[];
}
