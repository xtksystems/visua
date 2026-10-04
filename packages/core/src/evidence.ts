import type { Evidence, EvidenceReviewScope } from "./types.ts";

const DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const TIMESTAMP = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d+))?)?(Z|([+-])(\d{2})(?::?(\d{2}))?)$/;

/** Validate calendar dates before parsing, so Date cannot roll impossible days forward. */
function calendarDate(year: number, month: number, day: number): boolean {
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const monthDays = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return month >= 1 && month <= 12 && day >= 1 && day <= monthDays[month - 1]!;
}

/** Normalize a strict date or timezone-qualified timestamp to UTC milliseconds. */
export function normalizeEvidenceDate(value: string, endOfDay = false): string {
  if (typeof value !== "string") throw new TypeError("Evidence date must be a string");
  const date = DATE.exec(value);
  const timestamp = date ? null : TIMESTAMP.exec(value);
  const parts = date ?? timestamp;
  if (!parts || !calendarDate(Number(parts[1]), Number(parts[2]), Number(parts[3]))) {
    throw new RangeError("Evidence date must be a valid calendar date or timezone-qualified ISO timestamp");
  }
  if (date) return `${value}T${endOfDay ? "23:59:59.999" : "00:00:00.000"}Z`;

  const hour = Number(timestamp![4]);
  const minute = Number(timestamp![5]);
  const second = Number(timestamp![6] ?? 0);
  const offsetHour = Number(timestamp![10] ?? 0);
  const offsetMinute = Number(timestamp![11] ?? 0);
  if (hour >= 24 || minute >= 60 || second >= 60 || offsetHour >= 24 || offsetMinute >= 60) {
    throw new RangeError("Evidence date contains an invalid time or timezone offset");
  }
  const fraction = (timestamp![7] ?? "").padEnd(3, "0").slice(0, 3);
  const zone = timestamp![8] === "Z" ? "Z" : `${timestamp![9]}${timestamp![10]}:${timestamp![11] ?? "00"}`;
  const canonicalInput = `${parts[1]}-${parts[2]}-${parts[3]}T${timestamp![4]}:${timestamp![5]}:${String(second).padStart(2, "0")}.${fraction}${zone}`;
  const parsed = new Date(canonicalInput);
  if (!Number.isFinite(parsed.getTime()) || parsed.getUTCFullYear() < 0 || parsed.getUTCFullYear() > 9999) {
    throw new RangeError("Evidence date is outside the supported range");
  }
  return parsed.toISOString();
}

/** Make a detached, canonical snapshot of the protected evidence fields. */
export function evidenceReviewScope(e: Pick<Evidence, "sha256" | "requirementIds" | "collectedAt" | "validUntil">): EvidenceReviewScope {
  if (!Array.isArray(e.requirementIds) || e.requirementIds.some((id) => typeof id !== "string")) {
    throw new TypeError("Evidence requirement links must be strings");
  }
  const collectedAt = normalizeEvidenceDate(e.collectedAt);
  const validUntil = e.validUntil === undefined ? undefined : normalizeEvidenceDate(e.validUntil, true);
  if (validUntil !== undefined && new Date(validUntil).getTime() < new Date(collectedAt).getTime()) {
    throw new RangeError("Evidence expiry cannot precede collection");
  }
  return {
    ...(e.sha256 === undefined ? {} : { sha256: e.sha256 }),
    requirementIds: [...new Set(e.requirementIds)].sort(),
    collectedAt,
    ...(validUntil === undefined ? {} : { validUntil }),
  };
}

/** Compare link sets and the complete normalized collection/expiry window. */
export function sameEvidenceReviewScope(a: EvidenceReviewScope, b: EvidenceReviewScope): boolean {
  try {
    const left = evidenceReviewScope(a);
    const right = evidenceReviewScope(b);
    return left.sha256 === right.sha256
      && left.collectedAt === right.collectedAt
      && left.validUntil === right.validUntil
      && left.requirementIds.length === right.requirementIds.length
      && left.requirementIds.every((id, i) => id === right.requirementIds[i]);
  } catch {
    return false;
  }
}

/** Only the latest person decision can bind approval to the current artifact. */
export function hasCurrentEvidenceReview(e: Evidence): boolean {
  const review = Array.isArray(e.reviewHistory) ? e.reviewHistory.at(-1) : undefined;
  if (!review || review.decision !== "accepted" || review.legacy || !review.scope) return false;
  if (typeof e.sha256 !== "string" || !/^[a-f0-9]{64}$/.test(e.sha256)) return false;
  if (typeof review.reviewedBy !== "string" || !review.reviewedBy.trim() || review.reviewedBy !== e.reviewedBy) return false;
  if (review.reviewedAt !== e.reviewedAt) return false;
  try {
    normalizeEvidenceDate(review.reviewedAt);
    return sameEvidenceReviewScope(review.scope, evidenceReviewScope(e));
  } catch {
    return false;
  }
}
