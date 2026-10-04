import { describe, expect, it } from "vitest";
import {
  FrameworkIndex,
  buildSnapshot,
  deriveStatus,
  evidenceFreshness,
  evidenceReviewScope,
  hasCurrentEvidenceReview,
  isEvidenceValid,
  normalizeEvidenceDate,
  sameEvidenceReviewScope,
  scoreFramework,
  type Evidence,
  type EvidenceReviewScope,
} from "../src/index.ts";
import { miniGraph, state } from "./fixtures.ts";

const NOW = new Date("2026-06-01T12:00:00.000Z");
const SHA = "a".repeat(64);

function reviewedEvidence(extra: Partial<Evidence> = {}): Evidence {
  const e: Evidence = {
    id: "evidence",
    workspaceId: "ws",
    title: "Inspected artifact",
    kind: "document",
    source: "manual",
    status: "accepted",
    requirementIds: ["test-csf:PR.AA-01"],
    collectedAt: "2026-05-01",
    validUntil: "2027-05-01",
    content: "artifact",
    sha256: SHA,
    reviewedBy: "reviewer",
    reviewedAt: "2026-05-02T10:00:00.000Z",
    createdAt: "2026-05-01T00:00:00.000Z",
    ...extra,
  };
  e.reviewHistory = [{
    id: "review",
    decision: "accepted",
    reviewedBy: e.reviewedBy!,
    reviewedAt: e.reviewedAt!,
    scope: evidenceReviewScope(e),
  }];
  return e;
}

describe("normalizeEvidenceDate", () => {
  it("uses UTC midnight for collection and inclusive UTC day end for expiry", () => {
    expect(normalizeEvidenceDate("2026-06-01")).toBe("2026-06-01T00:00:00.000Z");
    expect(normalizeEvidenceDate("2026-06-01", true)).toBe("2026-06-01T23:59:59.999Z");
    expect(normalizeEvidenceDate("2026-06-01T12:00:00Z", true)).toBe("2026-06-01T12:00:00.000Z");
  });

  it("normalizes timezone offsets and timestamp fractions", () => {
    expect(normalizeEvidenceDate("2026-06-01T00:30:00+02:00")).toBe("2026-05-31T22:30:00.000Z");
    expect(normalizeEvidenceDate("2026-06-01T23:30:00-02:00")).toBe("2026-06-02T01:30:00.000Z");
    expect(normalizeEvidenceDate("2026-06-01T12:30+0530")).toBe("2026-06-01T07:00:00.000Z");
    expect(normalizeEvidenceDate("2026-06-01T12:30:00+05")).toBe("2026-06-01T07:30:00.000Z");
    expect(normalizeEvidenceDate("2026-06-01T12:30:00.12Z")).toBe("2026-06-01T12:30:00.120Z");
    expect(normalizeEvidenceDate("2026-06-01T12:30:00.123456Z")).toBe("2026-06-01T12:30:00.123Z");
  });

  it("accepts leap days only in actual leap years", () => {
    expect(normalizeEvidenceDate("2024-02-29")).toBe("2024-02-29T00:00:00.000Z");
    expect(normalizeEvidenceDate("2000-02-29T10:00:00Z")).toBe("2000-02-29T10:00:00.000Z");
    expect(() => normalizeEvidenceDate("1900-02-29")).toThrow();
    expect(() => normalizeEvidenceDate("2100-02-29")).toThrow();
  });

  it.each([
    "", "not-a-date", "2026-02-29", "2026-02-30", "2026-04-31", "2026-13-01", "2026-00-01", "2026-01-00",
    "2026-02-30T12:00:00Z", "2026-06-01T12:00:00", "2026-06-01T24:00:00Z", "2026-06-01T25:00:00Z",
    "2026-06-01T12:60:00Z", "2026-06-01T12:00:60Z", "2026-06-01T12:00:00+24:00", "2026-06-01T12:00:00+02:60",
    " 2026-06-01", "2026-6-1", "06/01/2026",
  ])("rejects malformed or impossible date %s", (value) => {
    expect(() => normalizeEvidenceDate(value)).toThrow();
  });

  it.each([null, undefined, 0, {}, new Date()])("rejects non-string input %s", (value) => {
    expect(() => normalizeEvidenceDate(value as unknown as string)).toThrow();
  });
});

describe("evidence review scopes", () => {
  it("copies sorted distinct links and normalizes the full window", () => {
    const input = {
      sha256: SHA,
      requirementIds: ["b", "a", "b"],
      collectedAt: "2026-05-01T02:00:00+02:00",
      validUntil: "2027-05-01",
    };
    const scope = evidenceReviewScope(input);
    expect(scope).toEqual({
      sha256: SHA,
      requirementIds: ["a", "b"],
      collectedAt: "2026-05-01T00:00:00.000Z",
      validUntil: "2027-05-01T23:59:59.999Z",
    });
    scope.requirementIds.push("c");
    expect(input.requirementIds).toEqual(["b", "a", "b"]);
  });

  it("supports absent expiry and rejects reversed intervals", () => {
    expect(evidenceReviewScope({ requirementIds: [], collectedAt: "2026-05-01" })).toEqual({
      requirementIds: [], collectedAt: "2026-05-01T00:00:00.000Z",
    });
    expect(() => evidenceReviewScope({ requirementIds: [], collectedAt: "2026-05-02", validUntil: "2026-05-01" })).toThrow();
    expect(() => evidenceReviewScope({ requirementIds: [], collectedAt: "2026-05-01", validUntil: "" })).toThrow();
  });

  it("compares link sets and canonical timestamps without changing scope meaning", () => {
    const scope = evidenceReviewScope(reviewedEvidence({ requirementIds: ["a", "b"] }));
    const equivalent = {
      ...scope,
      requirementIds: ["b", "a", "a"],
      collectedAt: "2026-05-01T02:00:00+02:00",
      validUntil: "2027-05-01",
    };
    expect(sameEvidenceReviewScope(scope, equivalent)).toBe(true);
    for (const changed of [
      { sha256: "b".repeat(64) }, { sha256: undefined }, { requirementIds: ["a"] },
      { collectedAt: "2026-05-02" }, { validUntil: "2027-05-02" }, { validUntil: undefined },
    ]) expect(sameEvidenceReviewScope(scope, { ...scope, ...changed })).toBe(false);
  });

  it("returns false for malformed scope dates and invalid intervals", () => {
    const scope = evidenceReviewScope(reviewedEvidence());
    for (const changed of [
      { collectedAt: "invalid" }, { validUntil: "invalid" }, { collectedAt: "2026-02-30" }, { validUntil: "2020-01-01" },
    ]) expect(sameEvidenceReviewScope(scope, { ...scope, ...changed })).toBe(false);
    expect(sameEvidenceReviewScope(null as unknown as EvidenceReviewScope, scope)).toBe(false);
  });
});

describe("current evidence approval", () => {
  it("recognizes a current bound approval and leaves cosmetic changes approved", () => {
    const e = reviewedEvidence();
    expect(hasCurrentEvidenceReview(e)).toBe(true);
    expect(isEvidenceValid(e, NOW)).toBe(true);
    expect(hasCurrentEvidenceReview({ ...e, title: "Renamed", description: "Clarified" })).toBe(true);
    expect(hasCurrentEvidenceReview({ ...e, requirementIds: [...e.requirementIds, ...e.requirementIds] })).toBe(true);
  });

  it("invalidates each protected field change while ignoring link order", () => {
    const e = reviewedEvidence({ requirementIds: ["test-csf:PR.AA-01", "test-csf:PR.AA-03"] });
    expect(hasCurrentEvidenceReview({ ...e, requirementIds: [...e.requirementIds].reverse() })).toBe(true);
    for (const changed of [
      { sha256: "b".repeat(64) }, { requirementIds: ["test-csf:PR.DS-01"] },
      { collectedAt: "2026-05-02" }, { validUntil: "2027-05-02" }, { validUntil: undefined },
    ]) {
      const edited = { ...e, ...changed };
      expect(hasCurrentEvidenceReview(edited)).toBe(false);
      expect(isEvidenceValid(edited, NOW)).toBe(false);
      expect(evidenceFreshness(edited, NOW)).toBe("none");
    }
  });

  it("fails closed for absent, legacy, rejected and malformed latest reviews", () => {
    const e = reviewedEvidence();
    const review = e.reviewHistory![0]!;
    for (const history of [
      undefined, [], [{ ...review, scope: undefined }], [{ ...review, legacy: true }],
      [{ ...review, decision: "rejected" as const }], [review, { ...review, id: "later", decision: "rejected" as const }],
      [{ ...review, reviewedAt: "invalid" }],
    ]) {
      const candidate = { ...e, reviewHistory: history };
      expect(hasCurrentEvidenceReview(candidate)).toBe(false);
      expect(isEvidenceValid(candidate, NOW)).toBe(false);
      expect(evidenceFreshness(candidate, NOW)).toBe("none");
    }
    expect(hasCurrentEvidenceReview({ ...e, reviewHistory: {} as unknown as Evidence["reviewHistory"] })).toBe(false);
  });

  it("requires valid artifact SHA and matching active review metadata", () => {
    const e = reviewedEvidence();
    for (const sha256 of [undefined, "", "a".repeat(63), "A".repeat(64), "g".repeat(64)]) {
      const candidate = { ...e, sha256, reviewHistory: [{ ...e.reviewHistory![0]!, scope: { ...e.reviewHistory![0]!.scope!, sha256 } }] };
      expect(hasCurrentEvidenceReview(candidate)).toBe(false);
    }
    for (const changed of [
      { reviewedBy: undefined }, { reviewedBy: "other" }, { reviewedAt: undefined }, { reviewedAt: "2026-05-03T10:00:00.000Z" },
    ]) expect(hasCurrentEvidenceReview({ ...e, ...changed })).toBe(false);
    const malformedTime = { ...e, reviewedAt: "2026-02-30T00:00:00Z", reviewHistory: [{ ...e.reviewHistory![0]!, reviewedAt: "2026-02-30T00:00:00Z" }] };
    expect(hasCurrentEvidenceReview(malformedTime)).toBe(false);
  });
});

describe("evidence validity and freshness", () => {
  it("requires acceptance, current binding and collection by now", () => {
    const e = reviewedEvidence();
    for (const status of ["pending-review", "rejected"] as const) {
      expect(isEvidenceValid({ ...e, status }, NOW)).toBe(false);
      expect(evidenceFreshness({ ...e, status }, NOW)).toBe("none");
    }
    const future = reviewedEvidence({ collectedAt: "2026-06-02" });
    expect(isEvidenceValid(future, NOW)).toBe(false);
    expect(evidenceFreshness(future, NOW)).toBe("none");
    const indefinite = reviewedEvidence({ validUntil: undefined });
    expect(isEvidenceValid(indefinite, NOW)).toBe(true);
    expect(evidenceFreshness(indefinite, NOW)).toBe("fresh");
    expect(isEvidenceValid(e, new Date("invalid"))).toBe(false);
    expect(evidenceFreshness(e, new Date("invalid"))).toBe("none");
  });

  it("uses an inclusive collection and expiry window", () => {
    const e = reviewedEvidence({ collectedAt: "2026-06-01", validUntil: "2026-06-01" });
    const collection = new Date("2026-06-01T00:00:00.000Z");
    const expiry = new Date("2026-06-01T23:59:59.999Z");
    expect(isEvidenceValid(e, new Date(collection.getTime() - 1))).toBe(false);
    expect(isEvidenceValid(e, collection)).toBe(true);
    expect(isEvidenceValid(e, expiry)).toBe(true);
    expect(evidenceFreshness(e, expiry)).toBe("expiring");
    expect(isEvidenceValid(e, new Date(expiry.getTime() + 1))).toBe(false);
    expect(evidenceFreshness(e, new Date(expiry.getTime() + 1))).toBe("expired");
  });

  it("expires finite past windows and preserves explicit expired status", () => {
    const expired = reviewedEvidence({ validUntil: "2026-05-31" });
    expect(hasCurrentEvidenceReview(expired)).toBe(true);
    expect(isEvidenceValid(expired, NOW)).toBe(false);
    expect(evidenceFreshness(expired, NOW)).toBe("expired");
    expect(evidenceFreshness({ ...expired, status: "pending-review", reviewHistory: undefined }, NOW)).toBe("expired");
    expect(evidenceFreshness(reviewedEvidence({ status: "expired", validUntil: undefined }), NOW)).toBe("expired");
    expect(isEvidenceValid(reviewedEvidence({ status: "expired" }), NOW)).toBe(false);
  });

  it("never marks malformed dates, reversed windows or unbound acceptance fresh", () => {
    const e = reviewedEvidence();
    for (const changed of [
      { collectedAt: "invalid" }, { validUntil: "invalid" }, { collectedAt: "2026-02-30" },
      { validUntil: "2026-04-01" }, { validUntil: "" }, { reviewHistory: undefined },
    ]) {
      expect(isEvidenceValid({ ...e, ...changed }, NOW)).toBe(false);
      expect(evidenceFreshness({ ...e, ...changed }, NOW)).toBe("none");
    }
  });

  it("keeps the existing 30-day freshness threshold", () => {
    const atThreshold = reviewedEvidence({ validUntil: "2026-07-01T12:00:00Z" });
    expect(evidenceFreshness(atThreshold, NOW)).toBe("fresh");
    expect(evidenceFreshness(atThreshold, new Date(NOW.getTime() + 1))).toBe("expiring");
  });
});

describe("approval-dependent status and scores", () => {
  const index = new FrameworkIndex(miniGraph);
  const assessed = state("PR.AA-01", 3, 3, { verifiedAt: "2026-05-02T10:00:00.000Z" });

  it("counts only current bound approval toward coverage and verification", () => {
    const e = reviewedEvidence();
    for (const candidate of [
      e,
      { ...e, validUntil: "invalid" },
      { ...e, requirementIds: [...e.requirementIds, "test-csf:PR.AA-03"] },
      { ...e, reviewHistory: undefined },
      reviewedEvidence({ collectedAt: "2026-06-02" }),
      { ...e, status: "pending-review" as const },
      { ...e, status: "rejected" as const },
    ]) {
      const result = scoreFramework(index, buildSnapshot({ states: [assessed], evidence: [candidate], tasks: [], checks: [] }), NOW);
      const score = result.scores.get(assessed.nodeId)!;
      const accepted = candidate === e;
      expect(result.statuses.get(assessed.nodeId)?.status).toBe(accepted ? "verified" : "implemented");
      expect(score.evidenceCoverage).toBe(accepted ? 1 : 0);
      expect(score.verifiedShare).toBe(accepted ? 1 : 0);
      expect(score.readiness).toBe(1);
    }
  });

  it("retains at-risk expiry, not-applicable and manual override precedence", () => {
    const expired = reviewedEvidence({ validUntil: "2026-05-31" });
    const signals = { state: assessed, evidence: [expired], tasks: [], checks: [], now: NOW };
    expect(deriveStatus(signals).status).toBe("at-risk");
    expect(deriveStatus({ ...signals, state: { ...assessed, applicable: false } }).status).toBe("not-applicable");
    expect(deriveStatus({ ...signals, state: { ...assessed, statusOverride: "implemented" } }).status).toBe("implemented");
  });
});
