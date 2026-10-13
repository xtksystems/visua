import { hasCurrentEvidenceReview, normalizeEvidenceDate } from "./evidence.ts";
import type { EffectiveEvidenceState } from "./status.ts";
import type { Evidence, EvidenceKind, EvidenceStatus } from "./types.ts";

export const EVIDENCE_RENEWAL_DAY = 86_400_000;
export type EvidenceRenewalBucket = "expired" | "next7days" | "next30days";
export type EvidenceRenewalValidity = "current" | "not-yet-valid" | "expired" | "invalid";

export interface EvidenceRenewalRequirement {
  id: string;
  code: string;
  title: string;
  frameworkId: string;
  frameworkLabel: string;
  assessable: boolean;
  /** Current scope (or in-scope descendants for groups); group links never grant coverage. */
  inScope: boolean;
}

export interface EvidenceRenewalItem {
  id: string;
  title: string;
  kind: EvidenceKind;
  source: Evidence["source"];
  status: EvidenceStatus;
  effective?: EffectiveEvidenceState;
  acceptanceBound: boolean;
  currentlyValid: boolean;
  validity: EvidenceRenewalValidity;
  /** Original metadata remains visible when a legacy date is invalid. */
  collectedAt: string;
  validUntil?: string;
  /** Canonical dates are present only when the entire window is valid. */
  startsAt?: string;
  expiresAt?: string;
  requirements: EvidenceRenewalRequirement[];
  context: { directInScope: number; outOfScope: number; groups: number; unknown: number };
  currentlyCoveredRequirementIds: string[];
  currentlyUncoveredRequirementIds: string[];
  /** First uninterrupted coverage loss ends with this record. */
  losingCoverageRequirementIds: string[];
  /** Recorded accepted alternatives extend uninterrupted coverage past this expiry. */
  continuingCoverageRequirementIds: string[];
}

export interface EvidenceRenewalWindow {
  evidenceIds: string[];
  /** Expired window only: a current fact, regardless of the expired record's review state. */
  uncoveredRequirementIds: string[];
  /** Future windows only, deduplicated by requirement. */
  losingCoverageRequirementIds: string[];
}

export interface EvidenceRenewalCoverage {
  requirementId: string;
  coveredNow: boolean;
  currentEvidenceIds: string[];
  /** Inclusive end of continuous coverage from asOf; absent if uncovered or unbounded. */
  coveredThrough?: string;
  losesCoverageAt?: string;
  endingEvidenceIds: string[];
}

export interface WorkspaceEvidenceRenewal {
  workspaceId: string;
  asOf: string;
  /** Cumulative windows: Next 30 days includes Next 7 days. */
  buckets: Record<EvidenceRenewalBucket, EvidenceRenewalWindow>;
  /** Complete metadata summaries, including records outside the selected windows. */
  items: EvidenceRenewalItem[];
  /** Only currently in-scope, directly linked assessable requirements. */
  coverage: EvidenceRenewalCoverage[];
  unclassified: {
    invalidWindowIds: string[];
    /** Valid collection window with no expiry; can still be a covering alternative. */
    noExpiryIds: string[];
    markedExpiredWithoutDeadlineIds: string[];
  };
}

export interface EvidenceRenewalDates {
  validity: EvidenceRenewalValidity;
  startsAt?: string;
  expiresAt?: string;
  buckets: EvidenceRenewalBucket[];
}

/** Dates describe the recorded window independently of the human review decision. */
export function evidenceRenewalDates(e: Pick<Evidence, "collectedAt" | "validUntil">, at: Date): EvidenceRenewalDates {
  const now = at.getTime();
  if (!Number.isFinite(now)) return { validity: "invalid", buckets: [] };
  try {
    const startsAt = normalizeEvidenceDate(e.collectedAt);
    const expiresAt = e.validUntil === undefined ? undefined : normalizeEvidenceDate(e.validUntil, true);
    const start = new Date(startsAt).getTime();
    const end = expiresAt === undefined ? Infinity : new Date(expiresAt).getTime();
    if (end < start) return { validity: "invalid", buckets: [] };
    const buckets: EvidenceRenewalBucket[] = [];
    if (end < now) buckets.push("expired");
    else {
      if (end < now + 7 * EVIDENCE_RENEWAL_DAY) buckets.push("next7days");
      if (end < now + 30 * EVIDENCE_RENEWAL_DAY) buckets.push("next30days");
    }
    return { validity: end < now ? "expired" : start > now ? "not-yet-valid" : "current", startsAt, expiresAt, buckets };
  } catch {
    return { validity: "invalid", buckets: [] };
  }
}

/** First gap in the union of accepted windows, conditional on the records staying unchanged. */
export function evidenceCoverageTimeline(evidence: readonly Evidence[], at: Date): Omit<EvidenceRenewalCoverage, "requirementId"> {
  const now = at.getTime();
  const intervals = evidence.flatMap((e) => {
    if (e.status !== "accepted" || !hasCurrentEvidenceReview(e)) return [];
    const dates = evidenceRenewalDates(e, at);
    if (dates.validity === "invalid") return [];
    const start = Math.max(new Date(dates.startsAt!).getTime(), new Date(e.reviewHistory!.at(-1)!.reviewedAt).getTime());
    const end = dates.expiresAt === undefined ? Infinity : new Date(dates.expiresAt).getTime();
    return start > end ? [] : [{ id: e.id, start, end }];
  }).sort((a, b) => a.start - b.start || a.end - b.end || a.id.localeCompare(b.id));
  const current = intervals.filter((interval) => interval.start <= now && now <= interval.end);
  const currentEvidenceIds = [...new Set(current.map((interval) => interval.id))].sort();
  if (!current.length) return { coveredNow: false, currentEvidenceIds, endingEvidenceIds: [] };
  let end = Math.max(...current.map((interval) => interval.end));
  for (const interval of intervals) {
    if (interval.start > end + 1) break;
    end = Math.max(end, interval.end);
  }
  if (!Number.isFinite(end)) return { coveredNow: true, currentEvidenceIds, endingEvidenceIds: [] };
  return {
    coveredNow: true, currentEvidenceIds,
    coveredThrough: new Date(end).toISOString(), losesCoverageAt: new Date(end + 1).toISOString(),
    endingEvidenceIds: [...new Set(intervals.filter((interval) => interval.end === end).map((interval) => interval.id))].sort(),
  };
}
