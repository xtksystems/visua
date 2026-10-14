import { Vector3 } from "three";
import { describe, expect, it } from "vitest";
import { arcDistances, arcsFor, LINK_DASH, nexusLayout, overviewBundles, type NexusFramework } from "../src/scene/Nexus.tsx";
const frameworks: NexusFramework[] = [
  { id: "nist-csf-2.0", shortName: "CSF", family: "csf", enabled: true, groups: [{ id: "a", code: "A", title: "A", units: 20, readiness: 0.5, status: "in-progress" }] },
  { id: "nist-rmf", shortName: "RMF", family: "rmf", enabled: true, groups: [{ id: "b", code: "B", title: "B", units: 10, readiness: 0, status: "not-started" }] },
];
describe("Nexus relationship geometry", () => {
  it("keeps mapping endpoints at their groups while routing finite bundled curves", () => {
    const layout = nexusLayout(frameworks);
    const arcs = arcsFor(layout, [{ a: "a", b: "b", count: 8, setId: "official" }]);
    expect(arcs).toHaveLength(1);
    for (const [id, point] of [["a", arcs[0]!.points[0]!], ["b", arcs[0]!.points.at(-1)!]] as const) {
      const pos = layout.positions.get(id)!.pos;
      expect(point.x).toBeCloseTo(pos[0] * 0.955);
      expect(point.z).toBeCloseTo(pos[2] * 0.955);
      expect(point.y).toBeCloseTo(0.3);
    }
    expect(arcs[0]!.points.every(p => p.toArray().every(Number.isFinite))).toBe(true);
    expect(arcsFor(layout, [{ a: "missing", b: "b", count: 1, setId: "official" }])).toEqual([]);
  });
  it("preserves mapping counts and publication sets when aggregating the overview", () => {
    const layout = nexusLayout(frameworks);
    const grouped = overviewBundles(layout, [
      { a: "a", b: "b", count: 4, setId: "official" },
      { a: "b", b: "a", count: 6, setId: "official" },
      { a: "a", b: "b", count: 3, setId: "threat:draft" },
      { a: "a", b: "b", count: 2, setId: "threat:final" },
      { a: "missing", b: "b", count: 100, setId: "official" },
    ]);
    expect(grouped).toHaveLength(3);
    expect(grouped.reduce((sum, b) => sum + b.count, 0)).toBe(15);
    expect(grouped.find(b => b.setId === "official")?.count).toBe(10);
    expect(grouped.every(b => b.a === "nist-csf-2.0" && b.b === "nist-rmf")).toBe(true);
  });
  it("separates parallel publication sets without moving their endpoints", () => {
    const arcs = arcsFor(nexusLayout(frameworks), [
      { a: "a", b: "b", count: 2, setId: "threat:final" },
      { a: "a", b: "b", count: 2, setId: "threat:draft" },
    ]);
    expect(arcs[0]!.points[0]!.equals(arcs[1]!.points[0]!)).toBe(true);
    expect(arcs[0]!.points.at(-1)!.equals(arcs[1]!.points.at(-1)!)).toBe(true);
    expect(arcs[0]!.points[20]!.distanceTo(arcs[1]!.points[20]!)).toBeGreaterThan(0.5);
  });
  it("restarts dash distance for every relationship instead of inheriting the preceding arc", () => {
    const distances = arcDistances([
      { points: [new Vector3(0, 0, 0), new Vector3(3, 4, 0), new Vector3(6, 8, 0)] },
      { points: [new Vector3(10, 0, 0), new Vector3(10, 0, 2)] },
    ]);
    expect(distances).toEqual({ starts: [0, 5, 0], ends: [5, 10, 2] });
  });
  it("keeps published, draft, unreviewed and superseded patterns distinct", () => {
    expect(LINK_DASH.final).toBeNull();
    expect(new Set(Object.values(LINK_DASH).map(v => JSON.stringify(v))).size).toBe(4);
  });
});
