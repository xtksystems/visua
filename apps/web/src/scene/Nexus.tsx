/**
 * The Crosswalk Nexus: every framework on one ring, its requirement groups as
 * pillars, and authoritative mappings as bundled arcs rising between them.
 * Pillar height = number of units (log), pillar color = group status, arc
 * width = number of unit-level mappings, arc color = source → target framework.
 */
import { CameraControls, PerformanceMonitor, Stars } from "@react-three/drei";
import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { Bloom, EffectComposer, Vignette } from "@react-three/postprocessing";
import { useEffect, useMemo, useRef, useState } from "react";
import { Color, FogExp2, QuadraticBezierCurve3, Vector3, type PerspectiveCamera } from "three";
import { LineMaterial } from "three/examples/jsm/lines/LineMaterial.js";
import { LineSegments2 } from "three/examples/jsm/lines/LineSegments2.js";
import { LineSegmentsGeometry } from "three/examples/jsm/lines/LineSegmentsGeometry.js";
import { designSystem } from "@visua/design";
import type { FrameworkFamily, Status } from "@visua/core";
import { allFrameworks, frameworkMeta } from "../lib/frameworks.ts";
import type { LinkStatus, ThreatRing } from "../lib/types.ts";
import { TOKENS } from "./colors.ts";
import { fitRing, titleSize, useSafeArea } from "./framing.ts";
import type { Vec3 } from "./layout.ts";
import { usePrefersReducedMotion } from "./Observatory.tsx";
import { hudRects, ScreenLabels, type ScreenLabel } from "./ScreenLabels.tsx";

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
  family: FrameworkFamily;
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
const c = designSystem.colors;
const order = (id: string) => allFrameworks().findIndex((f) => f.id === id);

/**
 * A framework's hue is its family's (DESIGN.md framework-*). A second framework of the
 * same family (RMF tasks after the SP 800-53 catalog) is lifted toward white to tell
 * them apart. Threat catalogs have no identity hue: they use neutral ink.
 */
export function frameworkColor(id: string): string | undefined {
  const meta = frameworkMeta(id);
  if (!meta || meta.family === "threat") return undefined;
  const base = c[`framework-${meta.family}` as keyof typeof c];
  const first = allFrameworks().find((f) => f.family === meta.family)?.id === id;
  return first ? base : `#${new Color(base).lerp(new Color("#ffffff"), 0.45).getHexString()}`;
}

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
  ring([...frameworks].sort((a, b) => order(a.id) - order(b.id)), RADIUS, false, layout);
  if (threats?.length) ring(threats, INNER_RADIUS, true, layout);
  return layout;
}

/** Threat catalogs carry no identity hue (DESIGN.md): neutral ink. */
const THREAT_INK = TOKENS.muted;
const inkOf = (framework: string) => {
  const hue = frameworkColor(framework);
  return hue ? new Color(hue) : THREAT_INK.clone();
};

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
          </group>
        );
      })}
    </group>
  );
}

function Sectors({ layout }: { layout: NexusLayout }) {
  return (
    <group>
      {layout.sectors.map((s) => {
        const color = inkOf(s.framework.id);
        const r = s.inner ? INNER_RADIUS : RADIUS;
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
          </group>
        );
      })}
    </group>
  );
}

const sectorAnchor = (s: NexusLayout["sectors"][number]): Vec3 => {
  const mid = (s.start + s.end) / 2;
  // Framework names sit outside the outer ring; threat-catalog names just inside the inner one.
  const r = s.inner ? INNER_RADIUS - 2.6 : RADIUS + 2.4;
  return [r * Math.cos(mid), 0.3, -r * Math.sin(mid)];
};

/**
 * Names and codes in screen space (ScreenLabels): framework names with their identity
 * swatch outside the ring, threat catalogs inside theirs, then pillar codes by priority —
 * the selection and hover first, their linked groups next; the rest where they fit.
 */
function NexusLabels({ layout, selected, hovered, related, onSelect }: { layout: NexusLayout; selected: string | null; hovered: string | null; related: Set<string>; onSelect: (id: string) => void }) {
  const labels = useMemo<ScreenLabel[]>(() => {
    const out: ScreenLabel[] = [];
    const focus = hovered ?? selected;
    const owner = selected ? layout.positions.get(selected)?.framework : undefined;
    for (const s of layout.sectors) {
      const anchor = sectorAnchor(s);
      out.push({
        id: `sector:${s.framework.id}`,
        variant: "sector",
        position: anchor,
        outwardFrom: s.inner ? [anchor[0] * 4, 0, anchor[2] * 4] : [0, 0, 0],
        title: s.framework.shortName,
        sub: s.inner ? `${s.framework.groups.length} groups · threats` : `${s.framework.groups.length} groups${s.framework.enabled ? "" : " · not enabled"}`,
        swatch: frameworkColor(s.framework.id),
        priority: s.inner ? 480 : owner === s.framework.id ? 620 : 500,
      });
    }
    for (const [id, p] of layout.positions) {
      const emphasized = id === selected || id === hovered;
      if (focus && !emphasized && !related.has(id)) continue;
      // The threat ring's codes sit among the arcs: they appear once a pillar is in focus.
      if (!focus && p.inner) continue;
      const h = heightOf(p.group.units) * (p.inner ? 0.8 : 1);
      out.push({
        id: `pillar:${id}`,
        variant: emphasized ? "selected" : "code",
        position: [p.pos[0], h + 0.5, p.pos[2]],
        title: p.group.code,
        priority: id === selected ? 1000 : id === hovered ? 900 : related.has(id) ? 420 : p.inner ? 140 : 150,
        active: id === selected,
        onClick: () => onSelect(id),
      });
    }
    return out;
  }, [layout, selected, hovered, related, onSelect]);
  return <ScreenLabels labels={labels} />;
}

interface ArcGeometry {
  key: string;
  bundle: NexusBundle;
  points: Vector3[];
  colors: [number, number, number][];
  width: number;
  /** Threat links only: the status of the strongest link in the bundle. */
  status?: LinkStatus;
}

/**
 * Threat links show their status as a dash pattern (legend in the Nexus HUD): final
 * links solid, drafts dashed, unreviewed and superseded ones dotted.
 */
export const LINK_DASH: Record<LinkStatus, { dashSize: number; gapSize: number } | null> = {
  final: null,
  draft: { dashSize: 1.1, gapSize: 0.55 },
  unreviewed: { dashSize: 0.28, gapSize: 0.5 },
  superseded: { dashSize: 0.28, gapSize: 0.5 },
};

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
    const status = b.setId.startsWith("threat:") ? (b.setId.slice(7) as LinkStatus) : undefined;
    out.push({ key: `${b.setId}|${b.a}|${b.b}`, bundle: b, points, colors, width: 0.5 + Math.sqrt(b.count) * 0.55, ...(status ? { status } : {}) });
  }
  return out;
}

/** Line widths (pixels) snap to a few steps so arcs batch into a handful of draw calls. */
const WIDTHS = [1, 1.5, 2.2, 3, 4, 5.4, 7.2];
const snapWidth = (w: number) => WIDTHS.reduce((best, x) => (Math.abs(x - w) < Math.abs(best - w) ? x : best), WIDTHS[0]!);

interface Batch {
  line: LineSegments2;
  animated: boolean;
  /** The resting opacity, restored when nothing is in focus. */
  opacity: number;
}

function batch(arcs: ArcGeometry[], opts: { width: number; opacity: number; dash: { dashSize: number; gapSize: number } | null; animated: boolean }): Batch {
  const positions: number[] = [];
  const colors: number[] = [];
  for (const arc of arcs) {
    for (let i = 0; i < arc.points.length - 1; i++) {
      const p = arc.points[i]!;
      const q = arc.points[i + 1]!;
      positions.push(p.x, p.y, p.z, q.x, q.y, q.z);
      colors.push(...arc.colors[i]!, ...arc.colors[i + 1]!);
    }
  }
  const geometry = new LineSegmentsGeometry();
  geometry.setPositions(positions);
  geometry.setColors(colors);
  const material = new LineMaterial({ linewidth: opts.width, vertexColors: true, transparent: true, opacity: opts.opacity, depthWrite: false, dashed: !!opts.dash, dashSize: opts.dash?.dashSize ?? 1, gapSize: opts.dash?.gapSize ?? 1 });
  material.toneMapped = false;
  const line = new LineSegments2(geometry, material);
  if (opts.dash) line.computeLineDistances();
  return { line, animated: opts.animated, opacity: opts.opacity };
}

/**
 * All arcs in a few draw calls (the Nexus drew one mesh per bundle, ~960 a frame):
 * resting arcs batch by width, opacity and dash style, and dim together when a pillar
 * is in focus; the focused pillar's arcs are drawn again on top, wider and bright.
 */
function Arcs({ arcs, focus, reducedMotion }: { arcs: ArcGeometry[]; focus: string | null; reducedMotion: boolean }) {
  const size = useThree((s) => s.size);
  const resting = useMemo(() => {
    const groups = new Map<string, ArcGeometry[]>();
    for (const arc of arcs) {
      const dash = arc.status ? LINK_DASH[arc.status] : null;
      const key = `${snapWidth(arc.width)}|${arc.bundle.count > 2 ? 0.3 : 0.14}|${dash ? `${dash.dashSize}/${dash.gapSize}` : "-"}`;
      groups.set(key, [...(groups.get(key) ?? []), arc]);
    }
    return [...groups.entries()].map(([key, list]) => {
      const [w, o] = key.split("|");
      const dash = list[0]!.status ? LINK_DASH[list[0]!.status] : null;
      return batch(list, { width: Number(w), opacity: Number(o), dash, animated: false });
    });
  }, [arcs]);
  const active = useMemo(() => {
    if (!focus) return [];
    const touching = arcs.filter((a) => a.bundle.a === focus || a.bundle.b === focus);
    const groups = new Map<string, ArcGeometry[]>();
    for (const arc of touching) {
      const dash = arc.status ? LINK_DASH[arc.status] : null;
      const key = `${snapWidth(arc.width * 1.35)}|${dash ? `${dash.dashSize}/${dash.gapSize}` : "-"}`;
      groups.set(key, [...(groups.get(key) ?? []), arc]);
    }
    // Requirement arcs in focus march (dashes move) unless motion is reduced; threat arcs keep their status pattern.
    return [...groups.entries()].map(([key, list]) => {
      const dash = list[0]!.status ? LINK_DASH[list[0]!.status] : null;
      const animated = !dash && !reducedMotion;
      return batch(list, { width: Number(key.split("|")[0]), opacity: 0.95, dash: dash ?? (animated ? { dashSize: 1.6, gapSize: 0.5 } : null), animated });
    });
  }, [arcs, focus, reducedMotion]);
  useEffect(() => {
    for (const b of resting) (b.line.material as LineMaterial).opacity = focus ? 0.022 : b.opacity;
  }, [resting, focus]);
  useEffect(() => {
    for (const b of [...resting, ...active]) (b.line.material as LineMaterial).resolution.set(size.width, size.height);
  }, [resting, active, size]);
  useEffect(
    () => () => {
      for (const b of resting) {
        b.line.geometry.dispose();
        (b.line.material as LineMaterial).dispose();
      }
    },
    [resting],
  );
  useEffect(
    () => () => {
      for (const b of active) {
        b.line.geometry.dispose();
        (b.line.material as LineMaterial).dispose();
      }
    },
    [active],
  );
  useFrame((_, dt) => {
    for (const b of active) if (b.animated) (b.line.material as LineMaterial).dashOffset -= dt * 2.4;
  });
  return (
    <group>
      {resting.map((b, i) => (
        <primitive key={`r${i}`} object={b.line} />
      ))}
      {active.map((b, i) => (
        <primitive key={`a${i}`} object={b.line} />
      ))}
    </group>
  );
}

/** Seen from above the SOC 2 / CSF side, like the original home view (0, 82, 92 → 0, −2, 6). */
const HOME_DIRECTION = new Vector3(0, 84, 86);

function Rig({ selected, layout, reducedMotion }: { selected: string | null; layout: NexusLayout; reducedMotion: boolean }) {
  const controls = useRef<CameraControls>(null);
  const camera = useThree((s) => s.camera) as PerspectiveCamera;
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const size = useThree((s) => s.size);
  const safe = useSafeArea();
  const atHome = useRef(true);
  const framed = useRef(false);
  const home = (transition: boolean) => {
    if (!safe || !controls.current) return;
    const titles = layout.sectors.filter((s) => !s.inner).map((s) => ({ anchor: new Vector3(...sectorAnchor(s)), ...titleSize(s.framework.shortName, { swatch: true, sub: 110 }) }));
    const pose = fitRing({ camera, width: size.width, height: size.height, safe, panels: hudRects(gl.domElement), radius: RADIUS + 1.6, top: 7, titles, dir: HOME_DIRECTION, center: 0.1 });
    if (scene.fog instanceof FogExp2) scene.fog.density = (0.0065 * 120) / Math.max(60, pose.distance);
    void controls.current.setLookAt(pose.position.x, pose.position.y, pose.position.z, pose.target.x, pose.target.y, pose.target.z, transition && framed.current);
    framed.current = true;
    atHome.current = true;
  };
  useEffect(() => {
    const c = controls.current;
    if (!c) return;
    const away = () => {
      atHome.current = false;
    };
    c.addEventListener("controlstart", away);
    return () => c.removeEventListener("controlstart", away);
  }, []);
  useEffect(() => {
    if (!selected) {
      home(!reducedMotion);
      return;
    }
    const p = layout.positions.get(selected);
    if (!p) return;
    atHome.current = false;
    // Look across the ring from behind the selected pillar so its arcs fan out toward the viewer.
    const back = new Vector3(p.pos[0], 0, p.pos[2]).normalize();
    void controls.current?.setLookAt(back.x * 70, 42, back.z * 70, -back.x * 6, 3, -back.z * 6, !reducedMotion);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, layout, reducedMotion]);
  useEffect(() => {
    if (atHome.current && !selected) home(!reducedMotion);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [safe]);
  return <CameraControls ref={controls} makeDefault minDistance={18} maxDistance={260} maxPolarAngle={Math.PI * 0.47} smoothTime={reducedMotion ? 0.001 : 0.4} />;
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
      <NexusLabels layout={layout} selected={selected} hovered={hovered} related={related} onSelect={onSelect} />
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
