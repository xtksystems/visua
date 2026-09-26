/**
 * The Crosswalk Nexus: every framework on one ring, its requirement groups as
 * pillars, and authoritative mappings as bundled arcs rising between them.
 * Pillar height = number of units (log), pillar color = group status, arc
 * width = number of unit-level mappings, arc color = source → target framework.
 */
import { Billboard, CameraControls, Line, PerformanceMonitor, Stars, Text } from "@react-three/drei";
import FONT_MONO from "@fontsource/ibm-plex-mono/files/ibm-plex-mono-latin-500-normal.woff?url";
import FONT_DISPLAY from "@fontsource/space-grotesk/files/space-grotesk-latin-600-normal.woff?url";
import { Canvas, useFrame, type ThreeEvent } from "@react-three/fiber";
import { Bloom, EffectComposer, Vignette } from "@react-three/postprocessing";
import { useEffect, useMemo, useRef, useState } from "react";
import { Color, QuadraticBezierCurve3, Vector3, type Group } from "three";
import { designSystem } from "@visua/design";
import type { Status } from "@visua/core";
import type { ThreatRing } from "../lib/types.ts";
import { TOKENS } from "./colors.ts";
import { usePrefersReducedMotion } from "./Observatory.tsx";

export interface NexusGroup {
  id: string;
  code: string;
  title: string;
  units: number;
  readiness: number | null;
  status: Status | null;
}
export interface NexusFramework {
  id: string;
  shortName: string;
  family: "csf" | "soc2" | "rmf" | "ai" | "law" | "threat";
  enabled: boolean;
  groups: NexusGroup[];
}
export interface NexusBundle {
  a: string;
  b: string;
  count: number;
  setId: string;
}
export interface NexusData {
  frameworks: NexusFramework[];
  sets: { id: string; title: string; authority: string; source: string; target: string; count: number; documentId?: string; documentTitle?: string }[];
  bundles: NexusBundle[];
  /** Inner ring: threat catalogs bundled onto the requirement groups their publishers link them to. */
  threats?: ThreatRing;
}

const RADIUS = 30;
const INNER_RADIUS = 13;
const FRAMEWORK_GAP = 0.16;
const ORDER = ["nist-csf-2.0", "aicpa-tsc-2017", "nist-sp-800-53-r5", "nist-rmf", "nist-ai-rmf"];

const c = designSystem.colors;
export const FRAMEWORK_COLORS: Record<string, string> = {
  "nist-csf-2.0": c["framework-csf"],
  "aicpa-tsc-2017": c["framework-soc2"],
  "nist-sp-800-53-r5": c["framework-rmf"],
  // RMF tasks share the RMF family hue, lifted toward white to separate them from the control catalog.
  "nist-rmf": `#${new Color(c["framework-rmf"]).lerp(new Color("#ffffff"), 0.45).getHexString()}`,
  "nist-ai-rmf": c["framework-ai"],
};

export interface NexusLayout {
  positions: Map<string, { angle: number; pos: [number, number, number]; framework: string; group: NexusGroup; inner: boolean }>;
  sectors: { framework: NexusFramework; start: number; end: number; inner: boolean }[];
}

/** Lay groups around a ring, one sector per framework (or threat catalog). */
function ring(frameworks: NexusFramework[], radius: number, inner: boolean, into: NexusLayout) {
  const total = frameworks.reduce((s, f) => s + f.groups.length, 0);
  const per = (Math.PI * 2 - FRAMEWORK_GAP * frameworks.length) / Math.max(1, total);
  let angle = Math.PI / 2 + FRAMEWORK_GAP / 2;
  for (const f of frameworks) {
    const start = angle;
    for (const g of f.groups) {
      const a = angle + per / 2;
      into.positions.set(g.id, { angle: a, pos: [radius * Math.cos(a), 0, -radius * Math.sin(a)], framework: f.id, group: g, inner });
      angle += per;
    }
    into.sectors.push({ framework: f, start, end: angle, inner });
    angle += FRAMEWORK_GAP;
  }
}

/** Threat catalogs as ring frameworks: their groups (tactics, entries, objectives) colored by pooled coverage. */
export function threatFrameworks(threats: ThreatRing | undefined): NexusFramework[] {
  return (threats?.catalogs ?? []).map((c) => ({
    id: c.id,
    shortName: c.shortName,
    family: "threat",
    enabled: true,
    groups: c.groups.map((g) => ({ id: g.id, code: g.code, title: g.title, units: g.units, readiness: g.readiness, status: g.status })),
  }));
}

export function nexusLayout(frameworks: NexusFramework[], threats?: NexusFramework[]): NexusLayout {
  const layout: NexusLayout = { positions: new Map(), sectors: [] };
  ring([...frameworks].sort((a, b) => ORDER.indexOf(a.id) - ORDER.indexOf(b.id)), RADIUS, false, layout);
  if (threats?.length) ring(threats, INNER_RADIUS, true, layout);
  return layout;
}

/** Threat catalogs carry no identity hue (DESIGN.md): neutral ink. */
const THREAT_INK = TOKENS.muted;
const inkOf = (framework: string) => (FRAMEWORK_COLORS[framework] ? new Color(FRAMEWORK_COLORS[framework]) : THREAT_INK.clone());

const heightOf = (units: number) => 0.8 + Math.log2(units + 1) * 0.75;

function Pillars({ layout, selected, hovered, related, onHover, onSelect }: { layout: NexusLayout; selected: string | null; hovered: string | null; related: Set<string>; onHover: (id: string | null) => void; onSelect: (id: string) => void }) {
  const focus = hovered ?? selected;
  return (
    <group>
      {[...layout.positions.entries()].map(([id, p]) => {
        const h = heightOf(p.group.units) * (p.inner ? 0.8 : 1);
        const enabled = p.group.status !== null;
        const base = enabled ? TOKENS.status[p.group.status!] : inkOf(p.framework).multiplyScalar(0.45);
        const dim = focus && id !== focus && !related.has(id);
        const isSel = id === selected;
        return (
          <group key={id} position={[p.pos[0], 0, p.pos[2]]}>
            <mesh
              position={[0, h / 2, 0]}
              onPointerOver={(e: ThreeEvent<PointerEvent>) => {
                e.stopPropagation();
                onHover(id);
                document.body.style.cursor = "pointer";
              }}
              onPointerOut={() => {
                onHover(null);
                document.body.style.cursor = "";
              }}
              onClick={(e: ThreeEvent<MouseEvent>) => {
                e.stopPropagation();
                onSelect(id);
              }}
            >
              {p.inner ? <cylinderGeometry args={[0.5, 0.5, h, 3]} /> : <cylinderGeometry args={[0.62, 0.7, h, 6]} />}
              <meshStandardMaterial color={base} emissive={base} emissiveIntensity={isSel ? 1.4 : id === hovered ? 0.9 : 0.28} transparent opacity={dim ? 0.22 : 1} roughness={0.45} metalness={0.1} />
            </mesh>
            {!dim && (
              <Billboard position={[0, h + 0.9, 0]}>
                <Text font={FONT_MONO} fontSize={isSel || id === hovered ? 1.05 : 0.72} color={isSel ? TOKENS.onSurface : TOKENS.muted} anchorX="center" anchorY="bottom" outlineWidth={0.04} outlineColor={TOKENS.neutral}>
                  {p.group.code}
                </Text>
              </Billboard>
            )}
          </group>
        );
      })}
    </group>
  );
}

/** Hides a large label when the camera is closer than `near`, so fly-ins never clip it at the frame edge. */
function FadingBillboard({ position, near, children }: { position: [number, number, number]; near: number; children: React.ReactNode }) {
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

function Sectors({ layout }: { layout: NexusLayout }) {
  return (
    <group>
      {layout.sectors.map((s) => {
        const color = inkOf(s.framework.id);
        const mid = (s.start + s.end) / 2;
        const r = s.inner ? INNER_RADIUS : RADIUS;
        // Outer labels sit outside the ring; threat-catalog labels sit just inside theirs.
        const labelR = s.inner ? INNER_RADIUS + 3.6 : RADIUS + 7.5;
        return (
          <group key={s.framework.id}>
            <mesh rotation-x={-Math.PI / 2} position={[0, 0.02, 0]}>
              <ringGeometry args={[r - 1.5, r - (s.inner ? 1.2 : 1.0), 96, 1, s.start, s.end - s.start]} />
              <meshBasicMaterial color={color} transparent opacity={s.inner ? 0.6 : 0.85} toneMapped={false} />
            </mesh>
            <mesh rotation-x={-Math.PI / 2} position={[0, 0.01, 0]}>
              <ringGeometry args={[r - 1.0, r + (s.inner ? 1.1 : 1.6), 96, 1, s.start, s.end - s.start]} />
              <meshBasicMaterial color={color} transparent opacity={0.07} />
            </mesh>
            <FadingBillboard position={[labelR * Math.cos(mid), s.inner ? 1.2 : 2.2, -labelR * Math.sin(mid)]} near={s.inner ? 40 : 62}>
              <Text font={FONT_DISPLAY} fontSize={s.inner ? 1.15 : 2.1} color={color} anchorX="center" anchorY="middle" outlineWidth={0.05} outlineColor={TOKENS.neutral}>
                {s.framework.shortName}
              </Text>
              <Text font={FONT_MONO} fontSize={s.inner ? 0.6 : 0.85} position={[0, s.inner ? -1.1 : -1.9, 0]} color={TOKENS.muted} anchorX="center" anchorY="middle">
                {s.inner ? `${s.framework.groups.length} groups · threats` : `${s.framework.groups.length} groups${s.framework.enabled ? "" : " · not enabled"}`}
              </Text>
            </FadingBillboard>
          </group>
        );
      })}
    </group>
  );
}

interface ArcGeometry {
  key: string;
  bundle: NexusBundle;
  points: Vector3[];
  colors: [number, number, number][];
  width: number;
}

function arcsFor(layout: NexusLayout, bundles: NexusBundle[]): ArcGeometry[] {
  const out: ArcGeometry[] = [];
  for (const b of bundles) {
    const pa = layout.positions.get(b.a);
    const pb = layout.positions.get(b.b);
    if (!pa || !pb) continue;
    const a = new Vector3(pa.pos[0] * 0.955, 0.3, pa.pos[2] * 0.955);
    const z = new Vector3(pb.pos[0] * 0.955, 0.3, pb.pos[2] * 0.955);
    const chord = a.distanceTo(z);
    const mid = a.clone().add(z).multiplyScalar(0.5);
    // Threat links rise from the inner ring in a lower, flatter arc.
    const control = pa.inner || pb.inner ? mid.multiplyScalar(0.7).setY(3 + chord * 0.28) : mid.multiplyScalar(0.18).setY(4 + chord * 0.42);
    const points = new QuadraticBezierCurve3(a, control, z).getPoints(40);
    const ca = inkOf(pa.framework);
    const cb = inkOf(pb.framework);
    const colors = points.map((_, i) => {
      const t = i / (points.length - 1);
      const col = ca.clone().lerp(cb, t);
      return [col.r, col.g, col.b] as [number, number, number];
    });
    out.push({ key: `${b.setId}|${b.a}|${b.b}`, bundle: b, points, colors, width: 0.5 + Math.sqrt(b.count) * 0.55 });
  }
  return out;
}

function Arcs({ arcs, focus, reducedMotion }: { arcs: ArcGeometry[]; focus: string | null; reducedMotion: boolean }) {
  const group = useRef<Group>(null);
  useFrame((_, dt) => {
    if (reducedMotion || !focus || !group.current) return;
    group.current.traverse((o) => {
      const m = (o as unknown as { material?: { dashOffset?: number; dashed?: boolean } }).material;
      if (m && m.dashed && typeof m.dashOffset === "number") m.dashOffset -= dt * 2.4;
    });
  });
  return (
    <group ref={group}>
      {arcs.map((arc) => {
        const active = !!focus && (arc.bundle.a === focus || arc.bundle.b === focus);
        const dim = !!focus && !active;
        return (
          <Line
            key={arc.key}
            points={arc.points}
            vertexColors={arc.colors}
            lineWidth={active ? arc.width * 1.35 : arc.width}
            transparent
            opacity={dim ? 0.022 : active ? 0.95 : arc.bundle.count > 2 ? 0.3 : 0.14}
            dashed={active && !reducedMotion}
            dashSize={1.6}
            gapSize={0.5}
            depthWrite={false}
            toneMapped={false}
          />
        );
      })}
    </group>
  );
}

/** Home view: the whole ring and its labels, seen from above the SOC 2 / CSF side. */
const HOME: [number, number, number, number, number, number] = [0, 82, 92, 0, -2, 6];

function Rig({ selected, layout, reducedMotion }: { selected: string | null; layout: NexusLayout; reducedMotion: boolean }) {
  const controls = useRef<CameraControls>(null);
  useEffect(() => {
    void controls.current?.setLookAt(...HOME, false);
  }, []);
  useEffect(() => {
    if (!selected) {
      void controls.current?.setLookAt(...HOME, !reducedMotion);
      return;
    }
    const p = layout.positions.get(selected);
    if (!p) return;
    // Look across the ring from behind the selected pillar so its arcs fan out toward the viewer.
    const back = new Vector3(p.pos[0], 0, p.pos[2]).normalize();
    void controls.current?.setLookAt(back.x * 70, 42, back.z * 70, -back.x * 6, 3, -back.z * 6, !reducedMotion);
  }, [selected, layout, reducedMotion]);
  return <CameraControls ref={controls} makeDefault minDistance={18} maxDistance={190} maxPolarAngle={Math.PI * 0.47} smoothTime={reducedMotion ? 0.001 : 0.4} />;
}

export function NexusCanvas({ data, selected, onSelect, onHover, hovered }: { data: NexusData; selected: string | null; onSelect: (id: string | null) => void; onHover: (id: string | null) => void; hovered: string | null }) {
  const reducedMotion = usePrefersReducedMotion();
  const [effects, setEffects] = useState(true);
  const layout = useMemo(() => nexusLayout(data.frameworks, threatFrameworks(data.threats)), [data.frameworks, data.threats]);
  const bundles = useMemo<NexusBundle[]>(() => [...data.bundles, ...(data.threats?.bundles ?? []).map((b) => ({ a: b.a, b: b.b, count: b.count, setId: `threat:${b.best}` }))], [data.bundles, data.threats]);
  const arcs = useMemo(() => arcsFor(layout, bundles), [layout, bundles]);
  const focus = hovered ?? selected;
  const related = useMemo(() => {
    const s = new Set<string>();
    if (!focus) return s;
    for (const b of bundles) {
      if (b.a === focus) s.add(b.b);
      if (b.b === focus) s.add(b.a);
    }
    return s;
  }, [focus, bundles]);
  return (
    <Canvas
      dpr={[1, 1.75]}
      camera={{ fov: 45, near: 0.1, far: 2000, position: [0, 82, 92] }}
      gl={{ antialias: true, powerPreference: "high-performance", preserveDrawingBuffer: true }}
      onPointerMissed={() => onSelect(null)}
      aria-label="3D crosswalk Nexus. Use the group list beside it for keyboard navigation."
    >
      <color attach="background" args={[TOKENS.neutral]} />
      <fogExp2 attach="fog" args={[TOKENS.neutral, 0.0065]} />
      <hemisphereLight args={[TOKENS.primaryContainer, TOKENS.neutral, 0.9]} />
      <ambientLight intensity={0.3} />
      <directionalLight position={[30, 60, 20]} intensity={1.4} />
      <Stars radius={140} depth={60} count={1200} factor={2.2} saturation={0} fade speed={0} />
      <mesh rotation-x={-Math.PI / 2} position={[0, -0.02, 0]}>
        <circleGeometry args={[RADIUS + 12, 96]} />
        <meshBasicMaterial color={TOKENS.grid} transparent opacity={0.35} />
      </mesh>
      <Sectors layout={layout} />
      <Arcs arcs={arcs} focus={focus} reducedMotion={reducedMotion} />
      <Pillars layout={layout} selected={selected} hovered={hovered} related={related} onHover={onHover} onSelect={(id) => onSelect(id)} />
      <Rig selected={selected} layout={layout} reducedMotion={reducedMotion} />
      <PerformanceMonitor onDecline={() => setEffects(false)} />
      {effects && (
        <EffectComposer multisampling={0}>
          <Bloom luminanceThreshold={0.75} luminanceSmoothing={0.2} intensity={0.8} mipmapBlur />
          <Vignette offset={0.28} darkness={0.55} />
        </EffectComposer>
      )}
    </Canvas>
  );
}
