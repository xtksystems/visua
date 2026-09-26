/**
 * The framework space: every object encodes data (DESIGN.md › Spatial System).
 * Units of work are instanced hex prisms (height = current level) topped with
 * translucent "gap glass" up to the target level; groups are beacons; tasks
 * orbit as satellites; evidence docks as crystals; agents travel as comets.
 */
import { Billboard, Line, Text } from "@react-three/drei";
import FONT_MONO from "@fontsource/ibm-plex-mono/files/ibm-plex-mono-latin-500-normal.woff?url";
import FONT_DISPLAY from "@fontsource/space-grotesk/files/space-grotesk-latin-600-normal.woff?url";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useRef } from "react";
import {
  AdditiveBlending,
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
import type { Layout, Vec3 } from "./layout.ts";


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
const hexGeometry = new CylinderGeometry(1, 1, 1, 6, 1);
hexGeometry.translate(0, 0.5, 0);

export function heightFor(level: number, view: Layout["view"]) {
  return view === "terrain" ? 0.3 + level * 0.9 : 0.22 + level * 0.46;
}

// ---------------------------------------------------------------------------

function UnitField({ layout, state, lens, onHover, onSelect, reducedMotion }: SceneProps) {
  const mesh = useRef<InstancedMesh>(null);
  const glass = useRef<InstancedMesh>(null);
  const ids = layout.units;
  const count = ids.length;
  const shown = useRef<Float32Array>(new Float32Array(count));
  const goal = useRef<Float32Array>(new Float32Array(count));
  const tops = useRef<Float32Array>(new Float32Array(count));
  const animating = useRef(true);

  // Targets for heights whenever state changes.
  useLayoutEffect(() => {
    const g = new Float32Array(count);
    const t = new Float32Array(count);
    ids.forEach((id, i) => {
      const u = state?.units[id];
      g[i] = heightFor(u ? u.current : 0, layout.view);
      t[i] = u && u.applicable ? heightFor(Math.max(u.current, u.target), layout.view) : g[i]!;
    });
    goal.current = g;
    tops.current = t;
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
      const r = layout.cell;
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
    }
    m.instanceMatrix.needsUpdate = true;
    gl.instanceMatrix.needsUpdate = true;
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
        <meshStandardMaterial roughness={0.6} metalness={0.12} emissiveIntensity={0.15} toneMapped />
      </instancedMesh>
      <instancedMesh ref={glass} args={[hexGeometry, undefined, count]} raycast={() => null} frustumCulled={false}>
        <meshStandardMaterial color={TOKENS.primary} emissive={TOKENS.primary} emissiveIntensity={0.25} transparent opacity={0.2} roughness={0.2} metalness={0} depthWrite={false} />
      </instancedMesh>
    </group>
  );
}

// ---------------------------------------------------------------------------

function Beacons({ layout, state, onSelect, onHover }: SceneProps) {
  const hubs = layout.hubs;
  const mids = layout.mids.filter((id) => layout.positions.has(id) && layout.view === "constellation");
  const hubMesh = useRef<InstancedMesh>(null);
  const midMesh = useRef<InstancedMesh>(null);
  useLayoutEffect(() => {
    const place = (mesh: InstancedMesh | null, list: string[], radius: number, height: number) => {
      if (!mesh) return;
      list.forEach((id, i) => {
        const p = layout.positions.get(id) ?? [0, 0, 0];
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
  }, [layout, state, hubs, mids]);

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
        <instancedMesh key={`h${hubs.length}`} ref={hubMesh} args={[hexGeometry, undefined, hubs.length]} onClick={click(hubs)} onPointerMove={move(hubs)} onPointerOut={out}>
          <meshStandardMaterial roughness={0.45} metalness={0.25} />
        </instancedMesh>
      )}
      {mids.length > 0 && (
        <instancedMesh key={`m${mids.length}`} ref={midMesh} args={[new CylinderGeometry(1, 1, 1, 24, 1).translate(0, 0.5, 0), undefined, mids.length]} onClick={click(mids)} onPointerMove={move(mids)} onPointerOut={out}>
          <meshStandardMaterial roughness={0.5} metalness={0.2} />
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
  if (layout.view === "terrain") return null;
  return (
    <lineSegments geometry={geometry} raycast={() => null}>
      <lineBasicMaterial color={TOKENS.outlineStrong} transparent opacity={0.55} />
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
    radii.add(layout.sectors[0]?.radius ?? 0);
    return [...radii].filter((r) => r > 0);
  }, [layout]);
  return (
    <group rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
      {rings.map((r) => (
        <mesh key={r} raycast={() => null}>
          <ringGeometry args={[r - 0.03, r + 0.03, 192]} />
          <meshBasicMaterial color={TOKENS.grid} transparent opacity={0.9} />
        </mesh>
      ))}
    </group>
  );
}

/**
 * A billboard that hides itself when the camera comes closer than `near`, so
 * large sector titles never fill the foreground after a fly-in.
 */
function DistanceFade({ position, near, children }: { position: Vec3; near: number; children: React.ReactNode }) {
  const ref = useRef<Group>(null);
  const world = useMemo(() => new Vector3(...position), [position]);
  useFrame(({ camera }) => {
    if (ref.current) ref.current.visible = camera.position.distanceTo(world) > near;
  });
  return (
    <Billboard ref={ref} position={position}>
      {children}
    </Billboard>
  );
}

function Sectors({ layout, state, selectedId, onSelect }: SceneProps) {
  const many = layout.sectors.length > 12;
  const big = layout.radius > 60;
  const titleSize = big ? (many ? 1.7 : 2.4) : 1.15;
  const subSize = big ? (many ? 1.15 : 1.6) : 0.75;
  return (
    <group>
      {layout.sectors.map((s) => {
        const g = state?.groups[s.id];
        const color = g ? TOKENS.status[g.status] : TOKENS.outlineStrong;
        const points: Vec3[] = [];
        const steps = 48;
        for (let i = 0; i <= steps; i++) {
          const a = s.start + ((s.end - s.start) * i) / steps;
          points.push([Math.cos(a) * s.radius, 0.02, Math.sin(a) * s.radius]);
        }
        const active = selectedId === s.id;
        return (
          <group key={s.id}>
            {layout.view === "constellation" && <Line points={points} color={active ? TOKENS.primary : color} lineWidth={active ? 3 : 1.5} transparent opacity={active ? 1 : 0.55} />}
            <DistanceFade position={[s.labelPos[0], big ? 4.5 : 2.2, s.labelPos[2]]} near={titleSize * 16}>
              <Text
                fontSize={titleSize}
                font={FONT_DISPLAY}
                color={active ? TOKENS.primary : TOKENS.onSurface}
                outlineWidth={titleSize * 0.07}
                outlineColor={TOKENS.neutral}
                anchorX="center"
                anchorY="bottom"
                letterSpacing={0.08}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelect(s.id);
                }}
              >
                {`${s.code}${s.title && s.title.toUpperCase() !== s.code.toUpperCase() ? ` · ${(many && s.title.length > 26 ? `${s.title.slice(0, 25)}…` : s.title).toUpperCase()}` : ""}`}
              </Text>
              {g && (
                <Text
                  position={[0, -subSize * 0.45, 0]}
                  fontSize={subSize}
                  font={FONT_MONO}
                  color={TOKENS.muted}
                  outlineWidth={subSize * 0.08}
                  outlineColor={TOKENS.neutral}
                  anchorX="center"
                  anchorY="top"
                >
                  {`${Math.round(g.readiness * 100)}% ready · ${g.gaps} gaps`}
                </Text>
              )}
            </DistanceFade>
          </group>
        );
      })}
    </group>
  );
}

// ---------------------------------------------------------------------------

function Core({ active }: { active: boolean }) {
  const ref = useRef<Mesh>(null);
  const geometry = useMemo(() => new IcosahedronGeometry(1.4, 1), []);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    ref.current.rotation.y += active ? 0.01 : 0;
    const mat = ref.current.material as unknown as { emissiveIntensity: number };
    mat.emissiveIntensity = active ? 0.9 + Math.sin(clock.elapsedTime * 3) * 0.4 : 0.35;
  });
  return (
    <mesh ref={ref} geometry={geometry} position={[0, 1.6, 0]} raycast={() => null}>
      <meshStandardMaterial color={TOKENS.primaryContainer} emissive={TOKENS.primary} emissiveIntensity={0.35} roughness={0.35} metalness={0.3} flatShading />
    </mesh>
  );
}

/** Selection halo + highlighted ancestry path. */
function Selection({ layout, selectedId, state }: SceneProps) {
  if (!selectedId) return null;
  const p = layout.positions.get(selectedId);
  if (!p) return null;
  const node = layout.byId.get(selectedId);
  const u = state?.units[selectedId];
  const h = node?.assessable ? heightFor(Math.max(u?.current ?? 0, u?.target ?? 0), layout.view) : 0.6;
  const path: Vec3[] = [];
  let cur = node;
  while (cur) {
    const q = layout.positions.get(cur.id);
    if (q) path.push([q[0], 0.08, q[2]]);
    cur = cur.parentId ? layout.byId.get(cur.parentId) : undefined;
  }
  path.push([0, 0.08, 0]);
  const r = node?.assessable ? layout.cell * 1.6 : layout.view === "terrain" ? 1.6 : 1.9;
  return (
    <group>
      <mesh position={[p[0], 0.04, p[2]]} rotation={[-Math.PI / 2, 0, 0]} raycast={() => null}>
        <ringGeometry args={[r * 0.82, r, 6]} />
        <meshBasicMaterial color={new Color(TOKENS.primary).multiplyScalar(2.2)} toneMapped={false} />
      </mesh>
      <mesh position={[p[0], h + 0.05, p[2]]} rotation={[-Math.PI / 2, 0, 0]} raycast={() => null}>
        <ringGeometry args={[r * 0.55, r * 0.62, 6]} />
        <meshBasicMaterial color={new Color(TOKENS.primary).multiplyScalar(1.6)} toneMapped={false} transparent opacity={0.8} />
      </mesh>
      {layout.view === "constellation" && path.length > 1 && <Line points={path} color={TOKENS.primary} lineWidth={2.2} />}
    </group>
  );
}

/** Tasks as satellites orbiting their requirement (up to three per unit). */
function Satellites({ layout, state, reducedMotion }: SceneProps) {
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
  useFrame(({ clock }) => {
    const m = ref.current;
    if (!m) return;
    const t = reducedMotion ? 0 : clock.elapsedTime * 0.8;
    slots.forEach((s, i) => {
      const a = t + (s.k / s.n) * Math.PI * 2;
      const rr = layout.cell * 1.55;
      tmp.position.set(s.p[0] + Math.cos(a) * rr, s.h + 0.25, s.p[2] + Math.sin(a) * rr);
      tmp.rotation.set(0, a, 0);
      tmp.scale.setScalar(1);
      tmp.updateMatrix();
      m.setMatrixAt(i, tmp.matrix);
    });
    m.instanceMatrix.needsUpdate = true;
  });
  if (!slots.length) return null;
  return (
    <instancedMesh key={slots.length} ref={ref} args={[geometry, undefined, slots.length]} raycast={() => null} frustumCulled={false}>
      <meshStandardMaterial color={TOKENS.onSurface} emissive={TOKENS.primary} emissiveIntensity={0.25} roughness={0.4} />
    </instancedMesh>
  );
}

/** Evidence crystals docked on units with accepted evidence. */
function Crystals({ layout, state }: SceneProps) {
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
  }, [items, layout, state]);
  if (!items.length) return null;
  return (
    <instancedMesh key={items.length} ref={ref} args={[geometry, undefined, items.length]} raycast={() => null} frustumCulled={false}>
      <meshStandardMaterial emissive={TOKENS.status.verified} emissiveIntensity={0.35} roughness={0.25} metalness={0.1} />
    </instancedMesh>
  );
}

/** Violet comets travelling from the core to nodes an agent is working on. */
function AgentComets({ layout, reducedMotion }: { layout: Layout; reducedMotion: boolean }) {
  const hot = useAgentActivity((s) => s.hot);
  const targets = useMemo(() => Object.keys(hot).filter((id) => layout.positions.has(id)).slice(0, 24), [hot, layout]);
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
  const heads = useRef<(Mesh | null)[]>([]);
  useFrame(({ clock }) => {
    curves.forEach((curve, i) => {
      const m = heads.current[i];
      if (!m) return;
      const t = reducedMotion ? 1 : (clock.elapsedTime * 0.45 + i * 0.13) % 1;
      m.position.copy(curve.getPoint(t));
      m.scale.setScalar(reducedMotion ? 1 : 0.7 + Math.sin(t * Math.PI) * 0.6);
    });
  });
  if (!curves.length) return null;
  const violet = new Color(TOKENS.tertiary).multiplyScalar(2.4);
  return (
    <group>
      {curves.map((curve, i) => (
        <group key={targets[i]}>
          <Line points={curve.getPoints(32)} color={TOKENS.tertiary} lineWidth={1.2} transparent opacity={0.45} />
          <mesh ref={(el) => (heads.current[i] = el)} raycast={() => null}>
            <sphereGeometry args={[0.22, 12, 12]} />
            <meshBasicMaterial color={violet} toneMapped={false} blending={AdditiveBlending} />
          </mesh>
          <mesh position={curve.getPoint(1)} rotation={[-Math.PI / 2, 0, 0]} raycast={() => null}>
            <ringGeometry args={[layout.cell * 1.2, layout.cell * 1.45, 6]} />
            <meshBasicMaterial color={violet} toneMapped={false} transparent opacity={0.85} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/** Level-of-detail labels: codes for the selection, hover, focus and the selected group's children. */
function Labels({ layout, state, selectedId, hoveredId, focusIds }: SceneProps) {
  const ids = useMemo(() => {
    const set = new Set<string>();
    const add = (id: string | null | undefined) => id && layout.positions.has(id) && set.add(id);
    add(selectedId);
    add(hoveredId);
    focusIds.forEach(add);
    const selectedNode = selectedId ? layout.byId.get(selectedId) : undefined;
    const group = selectedNode ? (selectedNode.assessable && selectedNode.parentId ? selectedNode.parentId : selectedNode.id) : undefined;
    if (group) {
      const walk = (id: string) => {
        for (const k of layout.children.get(id) ?? []) {
          add(k.id);
          if (set.size < 70) walk(k.id);
        }
      };
      walk(group);
    }
    if (layout.view === "constellation" && layout.mids.length <= 40) layout.mids.forEach(add);
    return [...set].slice(0, 90);
  }, [layout, selectedId, hoveredId, focusIds]);
  const size = layout.radius > 60 ? 0.9 : 0.46;
  return (
    <group>
      {ids.map((id) => {
        const node = layout.byId.get(id);
        const p = layout.positions.get(id)!;
        const u = state?.units[id];
        const y = node?.assessable ? heightFor(Math.max(u?.current ?? 0, u?.target ?? 0), layout.view) + 0.75 : 1.1;
        const emphasized = id === selectedId || id === hoveredId;
        return (
          <Billboard key={id} position={[p[0], y, p[2]]}>
            <Text
              fontSize={emphasized ? size * 1.35 : size}
              font={FONT_MONO}
              color={emphasized ? TOKENS.onSurface : TOKENS.muted}
              outlineWidth={size * 0.12}
              outlineColor={TOKENS.neutral}
              anchorX="center"
              anchorY="bottom"
            >
              {node?.code ?? ""}
            </Text>
          </Billboard>
        );
      })}
    </group>
  );
}

export function FrameworkScene(props: SceneProps & { agentActive: boolean }) {
  return (
    <group>
      <Rings layout={props.layout} />
      <Links layout={props.layout} />
      <Core active={props.agentActive} />
      <Beacons {...props} />
      <UnitField {...props} />
      <Sectors {...props} />
      <Satellites {...props} />
      <Crystals {...props} />
      <Selection {...props} />
      <AgentComets layout={props.layout} reducedMotion={props.reducedMotion} />
      <Labels {...props} />
    </group>
  );
}
