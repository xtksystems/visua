/** Batched cartographic surfaces: hierarchy in constellation, districts in terrain. */
import { useEffect, useMemo } from "react";
import { Color, Float32BufferAttribute } from "three";
import type { SceneProps } from "./FrameworkScene.tsx";
import { TOKENS } from "./colors.ts";
import { arcTriangles, districtHulls, hullTriangles, positionGeometry, rootOf } from "./spatialGeometry.ts";

export function SpatialGround({ layout, state, selectedId }: SceneProps) {
  const selectedRoot = rootOf(layout, selectedId);
  const hulls = useMemo(() => districtHulls(layout), [layout]);
  const geometry = useMemo(() => {
    const surfaces: number[] = [];
    const colors: number[] = [];
    const borders: number[] = [];
    const rails: number[] = [];
    const railColors: number[] = [];
    const add = (target: number[], palette: number[], vertices: number[], color: Color) => {
      target.push(...vertices);
      for (let i = 0; i < vertices.length / 3; i++) palette.push(color.r, color.g, color.b);
    };
    for (const sector of layout.sectors) {
      const active = sector.id === selectedRoot;
      const color = active ? TOKENS.primaryContainer : TOKENS.surfaceBright;
      if (layout.view === "constellation") {
        const hub = layout.positions.get(sector.id);
        const inner = Math.max(2.2, Math.hypot(hub?.[0] ?? 0, hub?.[2] ?? 0) - 2);
        const outer = sector.radius - 0.7;
        add(surfaces, colors, arcTriangles(inner, outer, sector.start, sector.end, -0.055), color);
        for (const a of [sector.start, sector.end]) {
          borders.push(Math.cos(a) * inner, -0.025, Math.sin(a) * inner, Math.cos(a) * outer, -0.025, Math.sin(a) * outer);
        }
        const score = state?.groups[sector.id];
        const width = Math.max(0.12, Math.min(0.28, sector.radius * 0.007));
        const gap = Math.min((sector.end - sector.start) * 0.25, 0.35 / sector.radius);
        const start = sector.start + gap / 2;
        const end = sector.end - gap / 2;
        const share = score && score.total > 0 ? Math.max(0, Math.min(1, score.readiness)) : 0;
        const filled = start + (end - start) * share;
        add(rails, railColors, arcTriangles(sector.radius - width * 0.35, sector.radius + width * 0.35, filled, end, 0.03), TOKENS.outlineStrong);
        if (score && share > 0) add(rails, railColors, arcTriangles(sector.radius - width, sector.radius + width, start, filled, 0.03), TOKENS.status[score.status]);
        for (const q of [0, 0.25, 0.5, 0.75, 1]) {
          const angle = start + (end - start) * q;
          const half = 0.035 / sector.radius;
          add(rails, railColors, arcTriangles(sector.radius + width, sector.radius + width * 2.4, angle - half, angle + half, 0.03), TOKENS.outlineStrong);
        }
      } else {
        const hub = layout.positions.get(sector.id);
        const score = state?.groups[sector.id];
        if (hub) {
          const ring = (start: number, end: number) => {
            const pts = arcTriangles(1.16, 1.34, start, end, 0.03);
            for (let i = 0; i < pts.length; i += 3) {
              pts[i] = pts[i]! + hub[0];
              pts[i + 2] = pts[i + 2]! + hub[2];
            }
            return pts;
          };
          const filled = -Math.PI / 2 + Math.PI * 2 * (score && score.total > 0 ? Math.max(0, Math.min(1, score.readiness)) : 0);
          add(rails, railColors, ring(filled, Math.PI * 1.5), TOKENS.outlineStrong);
          if (score) add(rails, railColors, ring(-Math.PI / 2, filled), TOKENS.status[score.status]);
        }
        const hull = hulls.get(sector.id);
        if (!hull?.length) continue;
        add(surfaces, colors, hullTriangles(hull, -0.055), color);
        for (let i = 0; i < hull.length; i++) {
          const a = hull[i]!;
          const b = hull[(i + 1) % hull.length]!;
          borders.push(a[0], -0.025, a[1], b[0], -0.025, b[1]);
        }
      }
    }
    const ground = positionGeometry(surfaces);
    ground.setAttribute("color", new Float32BufferAttribute(colors, 3));
    const progress = positionGeometry(rails);
    progress.setAttribute("color", new Float32BufferAttribute(railColors, 3));
    return { ground, progress, borders: positionGeometry(borders) };
  }, [layout, state, selectedRoot, hulls]);
  useEffect(() => () => Object.values(geometry).forEach((g) => g.dispose()), [geometry]);
  return (
    <group raycast={() => null}>
      <mesh geometry={geometry.ground} raycast={() => null}>
        <meshBasicMaterial vertexColors />
      </mesh>
      <lineSegments geometry={geometry.borders} raycast={() => null}>
        <lineBasicMaterial color={TOKENS.outlineStrong} transparent opacity={0.65} />
      </lineSegments>
      <mesh geometry={geometry.progress} raycast={() => null}>
        <meshBasicMaterial vertexColors polygonOffset polygonOffsetFactor={-1} polygonOffsetUnits={-4} />
      </mesh>
    </group>
  );
}
