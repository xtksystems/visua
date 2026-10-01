/**
 * The framework space: every object encodes data (DESIGN.md › Spatial System).
 * Units of work are instanced hex prisms (height = current level) topped with
 * translucent "gap glass" up to the target level; groups are beacons; tasks
 * occupy satellite slots; evidence docks as crystals; agents travel as comets.
 */
import { Line } from "@react-three/drei";
import { useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
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
const targetRimGeometry = hexRimGeometry(0.8);
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
  const invalidate = useThree((s) => s.invalidate);

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
    invalidate();
  }, [ids, state, count, layout.view, reducedMotion, invalidate]);

  // The layout can change with the same number of units; always rewrite transforms.
  useLayoutEffect(() => { animating.current = true; invalidate(); }, [layout, invalidate]);

  // Colors per lens.
  useLayoutEffect(() => {
    const m = mesh.current;
    if (!m) return;
    ids.forEach((id, i) => {
      unitColor(lens, state?.units[id], tmpColor);
      m.setColorAt(i, tmpColor);
      crowns.current?.setColorAt(i, tmpColor.lerp(TOKENS.onSurface, 0.22));
    });
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
    if (crowns.current?.instanceColor) crowns.current.instanceColor.needsUpdate = true;
    invalidate();
  }, [ids, state, lens, invalidate]);

  useFrame((_, dt) => {
    const m = mesh.current;
    const gl = glass.current;
    if (!m || !gl || !animating.current) return;
    let moving = false;
    const k = Math.min(dt, 1 / 30) * 6;
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
      const gapH = Math.max(0, top - next);
      tmp.position.set(p[0], next, p[2]);
      tmp.scale.set(gapH > 0.002 ? r * 0.98 : 0, gapH, gapH > 0.002 ? r * 0.98 : 0);
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
    // Raycasting also uses this sphere during layout/height transitions.
    m.computeBoundingSphere();
    animating.current = moving;
    if (moving) invalidate();
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
      <instancedMesh ref={glass} renderOrder={1} args={[hexGeometry, undefined, count]} raycast={() => null} frustumCulled={false}>
        <meshStandardMaterial color={TOKENS.primary} transparent opacity={0.12} roughness={0.7} metalness={0} depthWrite={false} />
      </instancedMesh>
      <instancedMesh ref={targets} renderOrder={2} args={[targetRimGeometry, undefined, count]} raycast={() => null} frustumCulled={false}>
        <meshBasicMaterial color={TOKENS.primary} transparent opacity={0.55} depthWrite={false} />
      </instancedMesh>
      <instancedMesh ref={crowns} args={[rimGeometry, undefined, count]} raycast={() => null} frustumCulled={false}>
        <meshBasicMaterial polygonOffset polygonOffsetFactor={-1} polygonOffsetUnits={-4} />
      </instancedMesh>
    </group>
  );
}

// ---------------------------------------------------------------------------

function Beacons({ layout, state, onSelect, onHover }: SceneProps) {
  const invalidate = useThree((s) => s.invalidate);
  const hubs = layout.hubs;
  const mids = layout.mids.filter((id) => layout.positions.has(id) && layout.view === "constellation");
  const hubMesh = useRef<InstancedMesh>(null);
  const midMesh = useRef<InstancedMesh>(null);
  useLayoutEffect(() => {
    const place = (mesh: InstancedMesh | null, list: string[], radius: number, height: number) => {
      if (!mesh) return;
      list.forEach((id, i) => {
        const p = layout.positions.get(id) ?? [0, 0, 0];
        tmp.rotation.set(0, 0, 0);
        tmp.position.set(p[0], 0, p[2]);
        tmp.scale.set(radius, height, radius);
        tmp.updateMatrix();
        mesh.setMatrixAt(i, tmp.matrix);
        const g = state?.groups[id];
        tmpColor.copy(g ? TOKENS.status[g.status] : TOKENS.status["not-started"]);
        mesh.setColorAt(i, tmpColor);
      });
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      mesh.computeBoundingSphere();
    };
    place(hubMesh.current, hubs, layout.view === "terrain" ? 0.9 : 1.15, 0.5);
    place(midMesh.current, mids, 0.5, 0.28);
    invalidate();
  }, [layout, state, hubs, mids, invalidate]);

  const click = (list: string[]) => (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    if (e.instanceId !== undefined) onSelect(list[e.instanceId] ?? null);
  };
  const move = (list: string[]) => (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    if (e.instanceId !== undefined) onHover(list[e.instanceId] ?? null, e.nativeEvent.clientX, e.nativeEvent.clientY);
    document.body.style.cursor = "pointer";
  };
  const out = () => {
    onHover(null);
    document.body.style.cursor = "";
  };
  return (
    <group>
      {hubs.length > 0 && (
        <instancedMesh key={`h${hubs.length}`} ref={hubMesh} args={[beaconGeometry, undefined, hubs.length]} onClick={click(hubs)} onPointerMove={move(hubs)} onPointerOut={out}>
          <meshStandardMaterial roughness={0.68} metalness={0.06} />
        </instancedMesh>
      )}
      {mids.length > 0 && (
        <instancedMesh key={`m${mids.length}`} ref={midMesh} args={[beaconGeometry, undefined, mids.length]} onClick={click(mids)} onPointerMove={move(mids)} onPointerOut={out}>
          <meshStandardMaterial roughness={0.7} metalness={0.05} />
        </instancedMesh>
      )}
    </group>
  );
}

// ---------------------------------------------------------------------------

function Links({ layout }: { layout: Layout }) {
  const geometry = useMemo(() => {
    const pts: number[] = [];
    for (const [a, b] of layout.links) {
      const pa = layout.positions.get(a);
      const pb = layout.positions.get(b);
      if (!pa || !pb) continue;
      pts.push(pa[0], 0.05, pa[2], pb[0], 0.05, pb[2]);
    }
    // Rays from the core to each top-level group.
    for (const h of layout.hubs) {
      const p = layout.positions.get(h)!;
      pts.push(0, 0.05, 0, p[0], 0.05, p[2]);
    }
    const g = new BufferGeometry();
    g.setAttribute("position", new Float32BufferAttribute(pts, 3));
    return g;
  }, [layout]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  if (layout.view === "terrain") return null;
  return (
    <lineSegments geometry={geometry} raycast={() => null}>
      <lineBasicMaterial color={TOKENS.outlineStrong} transparent opacity={0.78} />
    </lineSegments>
  );
}

function Rings({ layout }: { layout: Layout }) {
  const rings = useMemo(() => {
    if (layout.view === "terrain") return [layout.sectors[0]?.radius ?? 10];
    const radii = new Set<number>();
    for (const id of [...layout.hubs, ...layout.mids.slice(0, 1)]) {
      const p = layout.positions.get(id);
      if (p) radii.add(Math.round(Math.hypot(p[0], p[2]) * 10) / 10);
    }
    return [...radii].filter((r) => r > 0);
  }, [layout]);
  return (
    <group rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
      {rings.map((r) => (
        <mesh key={r} raycast={() => null}>
          <ringGeometry args={[r - 0.03, r + 0.03, 192]} />
          <meshBasicMaterial color={TOKENS.grid} transparent opacity={0.95} />
        </mesh>
      ))}
    </group>
  );
}

// ---------------------------------------------------------------------------

function Core({ active, reducedMotion }: { active: boolean; reducedMotion: boolean }) {
  const invalidate = useThree((s) => s.invalidate);
  // Motion preferences can change while active without changing any Three props.
  useLayoutEffect(() => invalidate(), [active, reducedMotion, invalidate]);
  const ref = useRef<Mesh>(null);
  const geometry = useMemo(() => new IcosahedronGeometry(1.4, 0), []);
  useFrame(({ clock, invalidate }, dt) => {
    if (!ref.current) return;
    if (active && !reducedMotion) invalidate();
    ref.current.rotation.y += active && !reducedMotion ? Math.min(dt, 0.1) * 0.6 : 0;
    const mat = ref.current.material as unknown as { emissiveIntensity: number };
    mat.emissiveIntensity = active ? (reducedMotion ? 0.18 : 0.18 + Math.sin(clock.elapsedTime * 3) * 0.06) : 0.04;
  });
  return (
    <group>
      <mesh ref={ref} geometry={geometry} position={[0, 1.6, 0]} raycast={() => null}>
        <meshStandardMaterial color={TOKENS.primary} emissive={active ? TOKENS.tertiary : TOKENS.primary} emissiveIntensity={0.04} roughness={0.58} metalness={0.12} flatShading />
      </mesh>
      <mesh visible={active} position={[0, 0.04, 0]} rotation={[-Math.PI / 2, 0, 0]} raycast={() => null}>
        <ringGeometry args={[1.8, 2.05, 64]} />
        <meshBasicMaterial color={TOKENS.tertiary} toneMapped={false} />
      </mesh>
    </group>
  );
}

/** Selection halo + highlighted ancestry path. */
function Selection({ layout, selectedId, state }: SceneProps) {
  // Keep points stable until selection changes to avoid rebuilding the line material.
  const path = useMemo(() => {
    const out: Vec3[] = [];
    let cur = selectedId ? layout.byId.get(selectedId) : undefined;
    while (cur) {
      const q = layout.positions.get(cur.id);
      if (q) out.push([q[0], 0.08, q[2]]);
      cur = cur.parentId ? layout.byId.get(cur.parentId) : undefined;
    }
    out.push([0, 0.08, 0]);
    return out;
  }, [layout, selectedId]);
  if (!selectedId) return null;
  const p = layout.positions.get(selectedId);
  if (!p) return null;
  const node = layout.byId.get(selectedId);
  const u = state?.units[selectedId];
  const h = node?.assessable ? heightFor(Math.max(u?.current ?? 0, u?.target ?? 0), layout.view) : 0.6;
  const r = node?.assessable ? layout.cell * 1.6 : layout.view === "terrain" ? 1.6 : 1.9;
  return (
    <group>
      <mesh position={[p[0], 0.04, p[2]]} rotation={[-Math.PI / 2, 0, 0]} raycast={() => null}>
        <ringGeometry args={[r * 0.82, r, 6, 1, Math.PI / 6]} />
        <meshBasicMaterial color={TOKENS.primary} toneMapped={false} />
      </mesh>
      <mesh position={[p[0], h + 0.05, p[2]]} rotation={[-Math.PI / 2, 0, 0]} raycast={() => null}>
        <ringGeometry args={[r * 0.55, r * 0.62, 6, 1, Math.PI / 6]} />
        <meshBasicMaterial color={TOKENS.primary} toneMapped={false} transparent opacity={0.7} />
      </mesh>
      {layout.view === "constellation" && path.length > 1 && <Line points={path} color={TOKENS.primary} lineWidth={2.2} />}
    </group>
  );
}

/** Open tasks occupy fixed satellite slots; only active agent work moves. */
function Satellites({ layout, state }: SceneProps) {
  const invalidate = useThree((s) => s.invalidate);
  const ref = useRef<InstancedMesh>(null);
  const slots = useMemo(() => {
    const out: { p: Vec3; k: number; n: number; h: number }[] = [];
    for (const id of layout.units) {
      const u = state?.units[id];
      if (!u || !u.openTasks) continue;
      const p = layout.positions.get(id)!;
      const n = Math.min(3, u.openTasks);
      for (let k = 0; k < n; k++) out.push({ p, k, n, h: heightFor(Math.max(u.current, u.target), layout.view) });
    }
    return out;
  }, [layout, state]);
  const geometry = useMemo(() => new OctahedronGeometry(0.13, 0), []);
  useLayoutEffect(() => {
    const m = ref.current;
    if (!m) return;
    slots.forEach((s, i) => {
      const a = (s.k / s.n) * Math.PI * 2;
      const rr = layout.cell * 1.55;
      tmp.position.set(s.p[0] + Math.cos(a) * rr, s.h + 0.25, s.p[2] + Math.sin(a) * rr);
      tmp.rotation.set(0, a, 0);
      tmp.scale.setScalar(1);
      tmp.updateMatrix();
      m.setMatrixAt(i, tmp.matrix);
    });
    m.instanceMatrix.needsUpdate = true;
    invalidate();
  }, [slots, layout, invalidate]);
  if (!slots.length) return null;
  return (
    <instancedMesh key={slots.length} ref={ref} args={[geometry, undefined, slots.length]} raycast={() => null} frustumCulled={false}>
      <meshStandardMaterial color={TOKENS.onSurface} roughness={0.65} />
    </instancedMesh>
  );
}

/** Evidence crystals docked on units with accepted evidence. */
function Crystals({ layout, state }: SceneProps) {
  const invalidate = useThree((s) => s.invalidate);
  const ref = useRef<InstancedMesh>(null);
  const items = useMemo(() => layout.units.filter((id) => (state?.units[id]?.evidence ?? 0) > 0), [layout, state]);
  const geometry = useMemo(() => new TetrahedronGeometry(0.17, 0), []);
  useLayoutEffect(() => {
    const m = ref.current;
    if (!m) return;
    items.forEach((id, i) => {
      const p = layout.positions.get(id)!;
      const u = state!.units[id]!;
      tmp.position.set(p[0], heightFor(Math.max(u.current, u.target), layout.view) + 0.28, p[2]);
      tmp.rotation.set(0.6, 0.8, 0);
      tmp.scale.setScalar(1);
      tmp.updateMatrix();
      m.setMatrixAt(i, tmp.matrix);
      tmpColor.copy(u.status === "at-risk" ? TOKENS.status["at-risk"] : TOKENS.status.verified);
      m.setColorAt(i, tmpColor);
    });
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
    invalidate();
  }, [items, layout, state, invalidate]);
  if (!items.length) return null;
  return (
    <instancedMesh key={items.length} ref={ref} args={[geometry, undefined, items.length]} raycast={() => null} frustumCulled={false}>
      <meshStandardMaterial roughness={0.6} metalness={0.04} />
    </instancedMesh>
  );
}

/** Warm comets travelling from the core to nodes an agent is working on. */
function AgentComets({ layout, reducedMotion }: { layout: Layout; reducedMotion: boolean }) {
  const hot = useAgentActivity((s) => s.hot);
  const targets = useMemo(() => Object.keys(hot).filter((id) => layout.positions.has(id)).slice(0, 24), [hot, layout]);
  return <Comets layout={layout} targets={targets} reducedMotion={reducedMotion} />;
}

function Comets({ layout, targets, reducedMotion }: { layout: Layout; targets: string[]; reducedMotion: boolean }) {
  const curves = useMemo(
    () =>
      targets.map((id) => {
        const p = layout.positions.get(id)!;
        const end = new Vector3(p[0], 0.9, p[2]);
        const mid = new Vector3(p[0] * 0.5, 4 + Math.hypot(p[0], p[2]) * 0.18, p[2] * 0.5);
        return new QuadraticBezierCurve3(new Vector3(0, 1.6, 0), mid, end);
      }),
    [targets, layout],
  );
  const invalidate = useThree((s) => s.invalidate);
  useLayoutEffect(() => invalidate(), [curves, reducedMotion, invalidate]);
  const trails = useMemo(() => curves.map((c) => c.getPoints(32)), [curves]);
  const heads = useRef<(Mesh | null)[]>([]);
  useFrame(({ clock, invalidate }) => {
    if (curves.length && !reducedMotion) invalidate();
    curves.forEach((curve, i) => {
      const m = heads.current[i];
      if (!m) return;
      const t = reducedMotion ? 1 : (clock.elapsedTime * 0.45 + i * 0.13) % 1;
      m.position.copy(curve.getPoint(t));
      m.scale.setScalar(reducedMotion ? 1 : 0.7 + Math.sin(t * Math.PI) * 0.6);
    });
  });
  if (!curves.length) return null;
  return (
    <group>
      {curves.map((curve, i) => (
        <group key={targets[i]}>
          <Line points={trails[i]!} color={TOKENS.tertiary} lineWidth={1.5} transparent opacity={0.62} />
          <mesh ref={(el) => (heads.current[i] = el)} raycast={() => null}>
            <sphereGeometry args={[0.22, 12, 12]} />
            <meshBasicMaterial color={TOKENS.tertiary} toneMapped={false} />
          </mesh>
          <mesh position={curve.getPoint(1)} rotation={[-Math.PI / 2, 0, 0]} raycast={() => null}>
            <ringGeometry args={[layout.cell * 1.2, layout.cell * 1.45, 6, 1, Math.PI / 6]} />
            <meshBasicMaterial color={TOKENS.tertiary} toneMapped={false} transparent opacity={0.8} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

const pct = (x: number) => `${Math.round(x * 100)}%`;

/**
 * Titles and codes, placed in screen space (ScreenLabels): sector titles outside the
 * ring; codes for the selection, hover, agent focus, the selected group's members and
 * the mid-level groups when there are few. Higher priority wins where labels collide.
 */
function SceneLabels({ layout, state, selectedId, hoveredId, focusIds, onSelect }: SceneProps) {
  const labels = useMemo<ScreenLabel[]>(() => {
    const out: ScreenLabel[] = [];
    const selected = selectedId ? layout.byId.get(selectedId) : undefined;
    let root = selected;
    while (root?.parentId) root = layout.byId.get(root.parentId);
    for (const s of layout.sectors) {
      const g = state?.groups[s.id];
      const mid = (s.start + s.end) / 2;
      const position: Vec3 = layout.view === "constellation" ? [Math.cos(mid) * (s.radius + 1), 0.3, Math.sin(mid) * (s.radius + 1)] : s.labelPos;
      const titled = !!s.title && s.title.toUpperCase() !== s.code.toUpperCase();
      const sub = g ? (state?.threat ? `${pct(g.readiness)} covered · ${g.total} with links` : `${pct(g.readiness)} ready · ${g.gaps} gaps`) : undefined;
      const priority = root ? (root.id === s.id ? 700 : 300) : 500;
      const sector = { variant: "sector" as const, position, outwardFrom: [0, 0, 0] as Vec3, group: `sector:${s.id}`, active: selectedId === s.id, onClick: () => onSelect(s.id) };
      out.push({ ...sector, id: `sector:${s.id}`, code: titled ? s.code : undefined, title: titled ? s.title : s.code, sub, priority });
      // Where its title does not fit (twenty SP 800-53 families), a sector keeps its code, with its read-out if there is room.
      if (titled) {
        out.push({ ...sector, id: `sector:${s.id}:code`, title: s.code, sub, priority: priority - 12 });
        if (sub) out.push({ ...sector, id: `sector:${s.id}:bare`, title: s.code, priority: priority - 14 });
      }
    }
    const focus = new Set(focusIds);
    const members = new Set<string>();
    const group = selected ? (selected.assessable && selected.parentId ? selected.parentId : selected.id) : undefined;
    if (group) {
      const walk = (id: string) => {
        for (const k of layout.children.get(id) ?? []) {
          members.add(k.id);
          if (members.size < 90) walk(k.id);
        }
      };
      walk(group);
    }
    const ids = new Set<string>([selectedId, hoveredId, ...focusIds, ...members].filter((id): id is string => !!id && layout.positions.has(id)));
    if (layout.view === "constellation" && layout.mids.length <= 40) for (const id of layout.mids) ids.add(id);
    for (const id of ids) {
      const node = layout.byId.get(id);
      const p = layout.positions.get(id)!;
      const u = state?.units[id];
      const emphasized = id === selectedId || id === hoveredId;
      const y = node?.assessable ? heightFor(Math.max(u?.current ?? 0, u?.target ?? 0), layout.view) + 0.3 : 0.9;
      out.push({
        id: `code:${id}`,
        variant: emphasized ? "selected" : "code",
        position: [p[0], y, p[2]],
        title: (node?.meta?.["label"] as string | undefined) ?? node?.code ?? "",
        // Groups with units in scope (a law that applies) outrank the rest when space is short.
        priority: id === selectedId ? 1000 : id === hoveredId ? 900 : focus.has(id) ? 450 : members.has(id) ? 350 : state?.groups[id]?.total ? 260 : 200,
        active: id === selectedId,
      });
    }
    return out;
  }, [layout, state, selectedId, hoveredId, focusIds, onSelect]);
  return <ScreenLabels labels={labels} />;
}

/**
 * Compiles, as soon as the scene is up, the shader programs that only a selection and agent
 * activity use: the selection halo and path, and agent comets. Compiled on first use, they
 * stalled the frame that answered the first click by 60 to 100 ms. The real components are
 * drawn for a couple of frames, for one unit, shrunk inside the opaque core where the depth
 * test hides them, so they compile through the same tone-mapping pipeline
 * as the real ones. Then they are hidden, not removed, and never re-rendered by a selection:
 * disposing their materials would let three.js delete the programs again. They are drawn
 * again when the layout changes. (`renderer.compileAsync` does not reliably warm
 * the same program variants as the real components.)
 */
const ShaderWarmup = memo(function ShaderWarmup({ layout }: { layout: Layout }) {
  const group = useRef<Group>(null);
  const frames = useRef(0);
  const invalidate = useThree((s) => s.invalidate);
  const unit = layout.units[0];
  const targets = useMemo(() => (unit ? [unit] : []), [unit]);
  // Shown again for each layout, drawn however far they are from the camera's view.
  useLayoutEffect(() => {
    frames.current = 0;
    if (!group.current) return;
    group.current.visible = true;
    group.current.traverse((o) => (o.frustumCulled = false));
    invalidate();
  }, [layout, invalidate]);
  useFrame(({ invalidate }) => {
    if (!group.current?.visible) return;
    if (++frames.current > 2) group.current.visible = false;
    else invalidate();
  });
  if (!unit) return null;
  const noop = () => undefined;
  return (
    <group ref={group} position={[0, 1.6, 0]} scale={0.001}>
      <Selection layout={layout} state={undefined} selectedId={unit} lens="status" hoveredId={null} focusIds={[]} reducedMotion onHover={noop} onSelect={noop} />
      <Comets layout={layout} targets={targets} reducedMotion />
    </group>
  );
});

export function FrameworkScene(props: SceneProps & { agentActive: boolean }) {
  return (
    <group>
      <SpatialGround {...props} />
      <Rings layout={props.layout} />
      <Links layout={props.layout} />
      <Core active={props.agentActive} reducedMotion={props.reducedMotion} />
      <Beacons {...props} />
      <UnitField {...props} />
      <Satellites {...props} />
      <Crystals {...props} />
      <Selection {...props} />
      {props.agentActive && <AgentComets layout={props.layout} reducedMotion={props.reducedMotion} />}
      <ShaderWarmup layout={props.layout} />
      <SceneLabels {...props} />
    </group>
  );
}
