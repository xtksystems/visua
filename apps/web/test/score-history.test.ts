import { describe, expect, it } from "vitest";
import type { FrameworkScoreObservation, ScoreObservation } from "@visua/core";
import { historyPercent, historyTime, scoreHistoryPoints } from "../src/lib/score-history.ts";
const frame: FrameworkScoreObservation = {
  frameworkId: "csf", label: "CSF", version: "2.0", catalogFingerprint: "catalog", scopeFingerprint: "scope", targetsFingerprint: "targets",
  scope: { inScope: 2, upcoming: 0, excluded: 0, assessable: 2, requirementIds: ["one", "two"] },
  targets: { requirements: [], defaultTarget: 3, levels: [{ level: 3, requirements: 2 }], priorities: [{ priority: "medium", requirements: 2 }] },
  progress: { numerator: 2, denominator: 4, value: 0.5 }, evidence: { covered: 1, denominator: 2, value: 0.5 }, risk: { atRisk: 0, denominator: 2, value: 0 },
};
const observation = (id: string, observedAt: string, patch: Partial<ScoreObservation> = {}): ScoreObservation => ({ id, workspaceId: "workspace", observedAt, reason: "manual", revision: 1, formulaVersion: "v1", catalogFingerprint: "catalog", scopeFingerprint: "scope", targetsFingerprint: "targets", frameworks: [frame], ...patch });
const first = observation("one", "2026-10-13T12:00:00.000Z");
const second = observation("two", "2026-10-14T12:00:00.000Z");
describe("observed score history comparisons", () => {
  it("does not invent observations for empty or single-point history", () => {
    expect(scoreHistoryPoints([], "csf")).toEqual([]);
    expect(scoreHistoryPoints([first], "csf")).toEqual([{ observation: first, framework: frame, breaks: [] }]);
  });
  it("permits connection only for comparable recorded observations", () => {
    expect(scoreHistoryPoints([first, second], "csf").map(point => point.breaks)).toEqual([[], []]);
  });
  it.each([["catalogFingerprint", "Catalog changed"], ["scopeFingerprint", "Scope changed"], ["targetsFingerprint", "Targets or priorities changed"]] as const)("breaks a series when %s changes", (field, reason) => {
    const changed = { ...second, frameworks: [{ ...frame, [field]: "changed" }] };
    expect(scoreHistoryPoints([first, changed], "csf")[1]!.breaks).toContain(reason);
  });
  it("breaks at formula changes and observation gaps beyond 36 hours", () => {
    const changed = observation("changed", "2026-10-15T00:00:00.001Z", { formulaVersion: "v2" });
    expect(scoreHistoryPoints([first, changed], "csf")[1]!.breaks).toEqual(["Calculation changed", "More than 36 hours between observations"]);
    expect(scoreHistoryPoints([first, { ...changed, observedAt: "2026-10-15T00:00:00.000Z", formulaVersion: "v1" }], "csf")[1]!.breaks).toEqual([]);
  });
  it("never joins points across a framework being absent from a recorded observation", () => {
    const disabled = { ...second, frameworks: [] };
    const returned = observation("returned", "2026-10-14T13:00:00Z");
    const points = scoreHistoryPoints([first, disabled, returned], "csf");
    expect(points).toHaveLength(2); expect(points[1]!.breaks).toContain("Framework absent from intervening observations");
  });
  it("distinguishes an empty denominator from a measured zero and labels UTC", () => {
    expect(historyPercent(null)).toBe("No scope"); expect(historyPercent(0)).toBe("0%");
    expect(historyTime("2026-10-13T23:30:00-04:00")).toContain("Oct 14, 2026, 03:30:00 UTC");
  });
});
