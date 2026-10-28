import { CylinderGeometry, Vector3 } from "three";
import { describe, expect, it } from "vitest";
import type { LeanNode } from "../src/lib/types.ts";
import { computeLayout } from "../src/scene/layout.ts";
import { arcTriangles, convexHull, districtHulls, hexRimGeometry, hullTriangles, rootOf } from "../src/scene/spatialGeometry.ts";

function expectUpward(positions: number[]) {
  for (let i = 0; i < positions.length; i += 9) {
    const a = new Vector3().fromArray(positions, i);
    const b = new Vector3().fromArray(positions, i + 3);
    const c = new Vector3().fromArray(positions, i + 6);
    expect(b.sub(a).cross(c.sub(a)).y).toBeGreaterThan(0);
  }
}

const node = (id: string, parentId: string | null, depth: number, assessable: boolean): LeanNode => ({ id, parentId, depth, assessable, code: id, title: id, text: "", order: 0, kind: assessable ? "subcategory" : "function" });

describe("cartographic ground geometry", () => {
  it("keeps annular strips facing the above-ground camera across wraparound angles", () => {
    for (const [start, end] of [[-Math.PI / 2, Math.PI * 1.5], [5.8, 6.6], [0, 0.0001]]) {
      const pts = arcTriangles(5, 9, start!, end!, -0.05);
      expectUpward(pts);
      for (let i = 0; i < pts.length; i += 3) {
        expect(Math.hypot(pts[i]!, pts[i + 2]!)).toBeGreaterThanOrEqual(5 - 1e-9);
        expect(Math.hypot(pts[i]!, pts[i + 2]!)).toBeLessThanOrEqual(9 + 1e-9);
        expect(pts[i + 1]).toBe(-0.05);
      }
    }
    expect(arcTriangles(5, 9, 1, 1, 0)).toEqual([]);
  });

  it("handles duplicate/collinear points and produces upward district surfaces", () => {
    const hull = convexHull([[0, 0], [2, 0], [1, 0], [2, 2], [0, 2], [1, 1], [0, 0]]);
    expect(hull).toHaveLength(4);
    expectUpward(hullTriangles(hull, -0.05));
    expect(convexHull([])).toEqual([]);
    expect(hullTriangles(convexHull([[0, 0], [1, 0]]), 0)).toEqual([]);
  });

  it("encloses every terrain cell in its own root district, including deep descendants", () => {
    const nodes = [node("a", null, 0, false), node("b", null, 0, false), node("group", "a", 1, false)];
    for (let i = 0; i < 180; i++) nodes.push(node(`u${i}`, i % 2 ? "group" : "b", i % 2 ? 2 : 1, true));
    const layout = computeLayout(nodes, "terrain");
    const hulls = districtHulls(layout);
    expect(hulls.size).toBe(2);
    expect(rootOf(layout, "u1")).toBe("a");
    expect(rootOf(layout, "missing")).toBeUndefined();
    for (const id of layout.units) {
      const hull = hulls.get(rootOf(layout, id)!)!;
      const p = layout.positions.get(id)!;
      for (let vertex = 0; vertex < 6; vertex++) {
        const angle = vertex * Math.PI / 3;
        const x = p[0] + Math.sin(angle) * layout.cell;
        const z = p[2] + Math.cos(angle) * layout.cell;
        for (let i = 0; i < hull.length; i++) {
          const a = hull[i]!;
          const b = hull[(i + 1) % hull.length]!;
          expect((b[0] - a[0]) * (z - a[1]) - (b[1] - a[1]) * (x - a[0])).toBeGreaterThanOrEqual(-1e-8);
        }
      }
    }
  });

  it("aligns target rims with the hex prism corners, with upward winding", () => {
    const rim = hexRimGeometry();
    const prism = new CylinderGeometry(1, 1, 1, 6);
    const points = rim.getAttribute("position");
    expectUpward(Array.from(points.array));
    const corners = prism.getAttribute("position");
    for (let i = 0; i < points.count; i++) {
      const x = points.getX(i), z = points.getZ(i);
      if (Math.hypot(x, z) < 0.95) continue;
      expect(Array.from({ length: corners.count }, (_, j) => Math.hypot(x - corners.getX(j), z - corners.getZ(j))).some((d) => d < 1e-6)).toBe(true);
    }
    rim.dispose();
    prism.dispose();
  });
});
