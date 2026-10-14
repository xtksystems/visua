/** Ground geometry stays on XZ: surface offsets prevent z-fighting, never encode data. */
import { BufferGeometry, Float32BufferAttribute } from "three";
import type { Layout, Vec3 } from "./layout.ts";

export type Point2 = [number, number];

/** Counter-clockwise convex hull in XZ, including the footprint of every cell. */
export function convexHull(points: Point2[]): Point2[] {
  const sorted = [...new Map(points.map((p) => [`${p[0]},${p[1]}`, p])).values()].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  if (sorted.length < 3) return sorted;
  const cross = (a: Point2, b: Point2, c: Point2) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
  const half = (list: Point2[]) => {
    const out: Point2[] = [];
    for (const p of list) {
      while (out.length > 1 && cross(out.at(-2)!, out.at(-1)!, p) <= 0) out.pop();
      out.push(p);
    }
    return out;
  };
  return [...half(sorted).slice(0, -1), ...half([...sorted].reverse()).slice(0, -1)];
}

export function rootOf(layout: Layout, id: string | null): string | undefined {
  let node = id ? layout.byId.get(id) : undefined;
  while (node?.parentId) node = layout.byId.get(node.parentId);
  return node?.id;
}

export function districtHulls(layout: Layout): Map<string, Point2[]> {
  const points = new Map<string, Point2[]>();
  for (const id of layout.units) {
    const root = rootOf(layout, id);
    const p = layout.positions.get(id);
    if (!root || !p) continue;
    const list = points.get(root) ?? [];
    for (let i = 0; i < 6; i++) {
      const a = i * Math.PI / 3;
      list.push([p[0] + Math.sin(a) * layout.cell * 1.3, p[2] + Math.cos(a) * layout.cell * 1.3]);
    }
    points.set(root, list);
  }
  return new Map([...points].map(([id, pts]) => [id, convexHull(pts)]));
}

/** Explicit upward winding for a triangle fan on XZ. */
export function hullTriangles(hull: Point2[], y: number): number[] {
  const out: number[] = [];
  for (let i = 1; i + 1 < hull.length; i++) {
    for (const p of [hull[0]!, hull[i + 1]!, hull[i]!]) out.push(p[0], y, p[1]);
  }
  return out;
}

/** An annular strip, with subdivision proportional to its angular span. */
export function arcTriangles(inner: number, outer: number, start: number, end: number, y: number): number[] {
  if (end <= start || outer <= inner) return [];
  const out: number[] = [];
  const steps = Math.max(1, Math.ceil((end - start) * 40));
  const p = (r: number, a: number): Vec3 => [Math.cos(a) * r, y, Math.sin(a) * r];
  for (let i = 0; i < steps; i++) {
    const a = start + (end - start) * i / steps;
    const b = start + (end - start) * (i + 1) / steps;
    for (const v of [p(inner, a), p(inner, b), p(outer, a), p(outer, a), p(inner, b), p(outer, b)]) out.push(...v);
  }
  return out;
}

export function positionGeometry(positions: number[]): BufferGeometry {
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
  return geometry;
}

/** A flat six-sided rim aligned with Three's CylinderGeometry, for instancing. */
export function hexRimGeometry(inner = 0.9): BufferGeometry {
  const out: number[] = [];
  for (let i = 0; i < 6; i++) {
    const a = i * Math.PI / 3;
    const b = (i + 1) * Math.PI / 3;
    const p = (r: number, angle: number) => [Math.sin(angle) * r, 0, Math.cos(angle) * r];
    for (const v of [p(inner, a), p(1, a), p(inner, b), p(1, a), p(1, b), p(inner, b)]) out.push(...v);
  }
  return positionGeometry(out);
}
