You are the requested Claude Opus 5.5 heavy 3D reasoning worker for Visua. Deliver one concise actionable analysis, at most 900 words total across the schema. No tools available. Purpose: improve visual quality and wow-factor of an existing light, matte compliance maquette, preserving semantic data and instanced performance (1014 units). Nodes are hex prisms current maturity height, transparent gap to target, colors from tokens. Constellation has radial hierarchy with 6-20 root sectors, terrain packs units into hex districts. Lead has started the supplied batched geometry to turn a faint wire diagram into solid cartographic surfaces and target rims. YOUR HARD TASK: validate the geometry strategy, find the biggest remaining visual-quality leverage and precise algorithms to implement it. Focus on district hulls, measured readiness arcs, and prism edge/target treatment. Give 2-3 concrete improvements with concise TypeScript only if needed, not full file rewrites. Account for flat XZ normals/winding, transparent instance ordering, raycasting, disposal, draw calls, dense catalogs, small screens. Constraints: no new dependencies/postprocessing/shadows/idle animation/decorative heights; use existing tokens, keep coordinates fixed across lenses and preserve 2D twin. You own analysis only; lead implements and tests. Stop after the bounded analysis. This is the one retry after a 300s timeout of a larger packet; do not speculate on that failure. No visual captures supplied; all visual judgments are inferences from source.

SOURCE apps/web/src/scene/spatialGeometry.ts
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

SOURCE apps/web/src/scene/SpatialGround.tsx
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
        add(rails, railColors, arcTriangles(sector.radius - width, sector.radius + width, sector.start, sector.end, 0.025), TOKENS.outlineStrong);
        if (score && score.total > 0) {
          const end = sector.start + (sector.end - sector.start) * Math.max(0, Math.min(1, score.readiness));
          add(rails, railColors, arcTriangles(sector.radius - width, sector.radius + width, sector.start, end, 0.035), TOKENS.status[score.status]);
        }
      } else {
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
        <meshBasicMaterial vertexColors />
      </mesh>
    </group>
  );
}

Unit rendering excerpt:
/**
 * The framework space: every object encodes data (DESIGN.md › Spatial System).
 * Units of work are instanced hex prisms (height = current level) topped with
 * translucent "gap glass" up to the target level; groups are beacons; tasks
 * orbit as satellites; evidence docks as crystals; agents travel as comets.
 */
import { Line } from "@react-three/drei";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import { memo, useEffect, useLayoutEffect, useMemo, useRef } from "react";
import {
  BufferGeometry,
  Color,
  CylinderGeometry,
  Float32BufferAttribute,
  IcosahedronGeometry,
  InstancedMesh,
  Object3D,
  OctahedronGeometry,
  QuadraticBezierCurve3,
  TetrahedronGeometry,
  Vector3,
  type Group,
  type Mesh,
} from "three";
import type { FrameworkStateBundle } from "../lib/types.ts";
import { useAgentActivity } from "../state/agentActivity.ts";
import type { Lens } from "../state/ui.ts";
import { TOKENS, unitColor } from "./colors.ts";
import { SpatialGround } from "./SpatialGround.tsx";
import { hexRimGeometry } from "./spatialGeometry.ts";
import type { Layout, Vec3 } from "./layout.ts";
import { ScreenLabels, type ScreenLabel } from "./ScreenLabels.tsx";


export interface SceneProps {
  layout: Layout;
  state: FrameworkStateBundle | undefined;
  lens: Lens;
  selectedId: string | null;
  hoveredId: string | null;
  focusIds: string[];
  reducedMotion: boolean;
  onHover: (id: string | null, clientX?: number, clientY?: number) => void;
  onSelect: (id: string | null) => void;
}

const tmp = new Object3D();
const tmpColor = new Color();
const rimGeometry = hexRimGeometry();
const beaconGeometry = new CylinderGeometry(1, 1, 1, 32, 1).translate(0, 0.5, 0);
const hexGeometry = new CylinderGeometry(1, 1, 1, 6, 1);
hexGeometry.translate(0, 0.5, 0);

export function heightFor(level: number, view: Layout["view"]) {
  return view === "terrain" ? 0.3 + level * 0.9 : 0.22 + level * 0.46;
}

// ---------------------------------------------------------------------------

function UnitField({ layout, state, lens, onHover, onSelect, reducedMotion }: SceneProps) {
  const mesh = useRef<InstancedMesh>(null);
  const glass = useRef<InstancedMesh>(null);
  const targets = useRef<InstancedMesh>(null);
  const crowns = useRef<InstancedMesh>(null);
  const ids = layout.units;
  const count = ids.length;
  const shown = useRef<Float32Array>(new Float32Array(count));
  const goal = useRef<Float32Array>(new Float32Array(count));
  const tops = useRef<Float32Array>(new Float32Array(count));
  // Units out of scope (not applicable, or no link for a threat) shrink to small dots so the ones that count stand out.
  const widths = useRef<Float32Array>(new Float32Array(count).fill(1));
  const animating = useRef(true);

  // Targets for heights whenever state changes.
  useLayoutEffect(() => {
    const g = new Float32Array(count);
    const t = new Float32Array(count);
    const w = new Float32Array(count);
    ids.forEach((id, i) => {
      const u = state?.units[id];
      const out = !!u && !u.applicable;
      g[i] = out ? 0.08 : heightFor(u ? u.current : 0, layout.view);
      t[i] = u && u.applicable ? heightFor(Math.max(u.current, u.target), layout.view) : g[i]!;
      w[i] = out ? 0.42 : 1;
    });
    goal.current = g;
    tops.current = t;
    widths.current = w;
    if (shown.current.length !== count) shown.current = new Float32Array(g);
    if (reducedMotion) shown.current = new Float32Array(g);
    animating.current = true;
  }, [ids, state, count, layout.view, reducedMotion]);

  // Colors per lens.
  useLayoutEffect(() => {
    const m = mesh.current;
    if (!m) return;
    ids.forEach((id, i) => {
      unitColor(lens, state?.units[id], tmpColor);
      m.setColorAt(i, tmpColor);
    });
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }, [ids, state, lens]);

  useFrame((_, dt) => {
    const m = mesh.current;
    const gl = glass.current;
    if (!m || !gl || !animating.current) return;
    let moving = false;
    const k = Math.min(1, dt * 6);
    for (let i = 0; i < count; i++) {
      const cur = shown.current[i] ?? 0;
      const tgt = goal.current[i] ?? 0;
      const next = Math.abs(tgt - cur) < 0.002 ? tgt : cur + (tgt - cur) * k;
      if (next !== tgt) moving = true;
      shown.current[i] = next;
      const p = layout.positions.get(ids[i]!)!;
      const r = layout.cell * (layout.view === "terrain" ? 0.9 : 1) * (widths.current[i] ?? 1);
      tmp.rotation.set(0, 0, 0);
      tmp.position.set(p[0], 0, p[2]);
      tmp.scale.set(r, next, r);
      tmp.updateMatrix();
      m.setMatrixAt(i, tmp.matrix);
      const top = tops.current[i] ?? next;
      const gapH = Math.max(0.0001, top - next);
      tmp.position.set(p[0], next, p[2]);
      tmp.scale.set(r * 0.98, gapH, r * 0.98);
      tmp.updateMatrix();
      gl.setMatrixAt(i, tmp.matrix);
      tmp.position.set(p[0], top + 0.008, p[2]);
      tmp.scale.setScalar(top > (goal.current[i] ?? 0) + 0.002 ? r * 0.98 : 0);
      tmp.updateMatrix();
      targets.current?.setMatrixAt(i, tmp.matrix);
      tmp.position.y = next + 0.006;
      tmp.scale.setScalar(r);
      tmp.updateMatrix();
      crowns.current?.setMatrixAt(i, tmp.matrix);
    }
    m.instanceMatrix.needsUpdate = true;
    gl.instanceMatrix.needsUpdate = true;
    if (targets.current) targets.current.instanceMatrix.needsUpdate = true;
    if (crowns.current) crowns.current.instanceMatrix.needsUpdate = true;
    m.computeBoundingSphere();
    animating.current = moving;
  });

  const handleMove = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    if (e.instanceId === undefined) return;
    onHover(ids[e.instanceId] ?? null, e.nativeEvent.clientX, e.nativeEvent.clientY);
    document.body.style.cursor = "pointer";
  };
  const handleOut = () => {
    onHover(null);
    document.body.style.cursor = "";
  };
  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    if (e.instanceId !== undefined) onSelect(ids[e.instanceId] ?? null);
  };

  return (
    <group>
      <instancedMesh ref={mesh} args={[hexGeometry, undefined, count]} onPointerMove={handleMove} onPointerOut={handleOut} onClick={handleClick} frustumCulled={false}>
        <meshStandardMaterial roughness={0.62} metalness={0.08} flatShading />
      </instancedMesh>
      <instancedMesh ref={glass} args={[hexGeometry, undefined, count]} raycast={() => null} frustumCulled={false}>
        <meshStandardMaterial color={TOKENS.primary} transparent opacity={0.12} roughness={0.7} metalness={0} depthWrite={false} />
      </instancedMesh>
      <instancedMesh ref={targets} args={[rimGeometry, undefined, count]} raycast={() => null} frustumCulled={false}>
        <meshBasicMaterial color={TOKENS.primary} transparent opacity={0.55} depthWrite={false} />
      </instancedMesh>
      <instancedMesh ref={crowns} args={[rimGeometry, undefined, count]} raycast={() => null} frustumCulled={false}>
        <meshBasicMaterial color={TOKENS.onSurface} transparent opacity={0.22} depthWrite={false} />
      </instancedMesh>
    </group>
  );
}

// ---------------------------------------------------------------------------

