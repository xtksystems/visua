import { describe, expect, it } from "vitest";
import { evidenceCoverageTimeline, evidenceRenewalDates, evidenceReviewScope, EVIDENCE_RENEWAL_DAY as DAY, type Evidence } from "../src/index.ts";

const NOW = new Date("2026-10-04T12:00:00.000Z");
const instant = (days: number) => new Date(NOW.getTime() + days * DAY).toISOString();
function accepted(id: string, start: number, end?: number): Evidence {
  const value: Evidence = {
    id, workspaceId: "ws", title: id, kind: "document", source: "manual", status: "accepted", requirementIds: ["requirement"],
    collectedAt: instant(start), validUntil: end === undefined ? undefined : instant(end), sha256: "a".repeat(64),
    reviewedBy: "reviewer", reviewedAt: instant(-10), createdAt: instant(-10),
  };
  value.reviewHistory = [{ id: `review-${id}`, decision: "accepted", reviewedBy: value.reviewedBy!, reviewedAt: value.reviewedAt!, scope: evidenceReviewScope(value) }];
  return value;
}

describe("renewal calendar windows", () => {
  it.each([
    [-1, ["expired"]], [0, ["next7days", "next30days"]], [7 * DAY - 1, ["next7days", "next30days"]],
    [7 * DAY, ["next30days"]], [30 * DAY - 1, ["next30days"]], [30 * DAY, []],
  ])("classifies a deadline %d milliseconds from now", (offset, buckets) => {
    const value = { collectedAt: instant(-1), validUntil: new Date(NOW.getTime() + offset).toISOString() };
    expect(evidenceRenewalDates(value, NOW).buckets).toEqual(buckets);
  });

  it("normalizes UTC day-end and zones without inspecting review state", () => {
    for (const status of ["accepted", "pending-review", "rejected", "expired"] as const) {
      const value = { ...accepted(status, -1, 1), status, collectedAt: "2026-10-04T02:00:00+02:00", validUntil: "2026-10-04" };
      expect(evidenceRenewalDates(value, NOW)).toEqual({
        validity: "current", startsAt: "2026-10-04T00:00:00.000Z", expiresAt: "2026-10-04T23:59:59.999Z", buckets: ["next7days", "next30days"],
      });
    }
    const value = { collectedAt: "2026-10-04", validUntil: "2026-10-04" };
    expect(evidenceRenewalDates(value, new Date("2026-10-04T23:59:59.999Z")).validity).toBe("current");
    expect(evidenceRenewalDates(value, new Date("2026-10-05T00:00:00.000Z")).validity).toBe("expired");
  });

  it("retains future collection and distinguishes absent expiry from invalid windows", () => {
    expect(evidenceRenewalDates(accepted("future", 1, 3), NOW)).toMatchObject({ validity: "not-yet-valid", buckets: ["next7days", "next30days"] });
    expect(evidenceRenewalDates(accepted("indefinite", -1), NOW)).toMatchObject({ validity: "current", expiresAt: undefined, buckets: [] });
    for (const patch of [{ validUntil: "" }, { validUntil: "2026-02-30" }, { collectedAt: "invalid" }, { collectedAt: instant(5), validUntil: instant(3) }]) {
      expect(evidenceRenewalDates({ ...accepted("invalid", -1, 1), ...patch }, NOW)).toEqual({ validity: "invalid", buckets: [] });
    }
    expect(evidenceRenewalDates(accepted("invalid-clock", -1, 1), new Date("invalid"))).toEqual({ validity: "invalid", buckets: [] });
  });
});

describe("uninterrupted accepted evidence coverage", () => {
  it("uses the last reachable alternative rather than each artifact's expiry", () => {
    const a = accepted("a", -1, 3), b = accepted("b", -1, 10);
    const expected = { coveredNow: true, currentEvidenceIds: ["a", "b"], coveredThrough: instant(10), losesCoverageAt: new Date(NOW.getTime() + 10 * DAY + 1).toISOString(), endingEvidenceIds: ["b"] };
    expect(evidenceCoverageTimeline([a, b], NOW)).toEqual(expected);
    expect(evidenceCoverageTimeline([b, a, a], NOW)).toEqual(expected);
  });

  it("extends through gap-free future records but stops at the first actual gap", () => {
    const a = accepted("a", -1, 3), b = accepted("b", 2, 10), c = accepted("c", 8, 20);
    expect(evidenceCoverageTimeline([c, a, b], NOW)).toMatchObject({ currentEvidenceIds: ["a"], coveredThrough: instant(20), endingEvidenceIds: ["c"] });
    expect(evidenceCoverageTimeline([a, accepted("late", 5, 10), c], NOW)).toMatchObject({ coveredThrough: instant(3), endingEvidenceIds: ["a"] });
    const adjacent = accepted("adjacent", 3 + 1 / DAY, 10);
    expect(evidenceCoverageTimeline([a, adjacent], NOW).coveredThrough).toBe(instant(10));
    const gap = accepted("gap", 3 + 2 / DAY, 10);
    expect(evidenceCoverageTimeline([a, gap], NOW).coveredThrough).toBe(instant(3));
  });

  it("never bridges with pending, rejected, legacy, stale, or malformed acceptance", () => {
    const a = accepted("a", -1, 3), b = accepted("b", 2, 10);
    for (const candidate of [
      { ...b, status: "pending-review" as const }, { ...b, status: "rejected" as const }, { ...b, status: "expired" as const },
      { ...b, reviewHistory: [] }, { ...b, sha256: "b".repeat(64) }, { ...b, validUntil: "invalid" },
      { ...b, reviewHistory: b.reviewHistory!.map((review) => ({ ...review, legacy: true })) },
    ]) expect(evidenceCoverageTimeline([a, candidate], NOW)).toMatchObject({ coveredThrough: instant(3), endingEvidenceIds: ["a"] });
  });

  it("handles equal deadlines, indefinite alternatives and currently uncovered requirements", () => {
    const a = accepted("a", -1, 3), b = accepted("b", -1, 3);
    expect(evidenceCoverageTimeline([a, b], NOW).endingEvidenceIds).toEqual(["a", "b"]);
    expect(evidenceCoverageTimeline([a, accepted("forever", 2)], NOW)).toEqual({ coveredNow: true, currentEvidenceIds: ["a"], endingEvidenceIds: [] });
    expect(evidenceCoverageTimeline([accepted("expired", -2, -1), accepted("future", 1, 2)], NOW)).toEqual({ coveredNow: false, currentEvidenceIds: [], endingEvidenceIds: [] });
    expect(evidenceCoverageTimeline([a], new Date("invalid"))).toEqual({ coveredNow: false, currentEvidenceIds: [], endingEvidenceIds: [] });
  });
});
