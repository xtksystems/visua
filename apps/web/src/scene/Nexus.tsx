/**
 * The Crosswalk Nexus: every framework on one ring, its requirement groups as
 * pillars, and authoritative mappings as bundled arcs rising between them.
 * Pillar height = number of units (log), pillar color = group status, arc
 * width = number of unit-level mappings, arc color = source → target framework.
 */
import { CameraControls } from "@react-three/drei";
import { Canvas, useThree, type ThreeEvent } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { Color, CubicBezierCurve3, CylinderGeometry, FogExp2, Float32BufferAttribute, InstancedBufferAttribute, InstancedMesh, Object3D, RingGeometry, Vector3, type PerspectiveCamera } from "three";
import { LineMaterial } from "three/examples/jsm/lines/LineMaterial.js";
import { LineSegments2 } from "three/examples/jsm/lines/LineSegments2.js";
import { LineSegmentsGeometry } from "three/examples/jsm/lines/LineSegmentsGeometry.js";
import { designSystem } from "@visua/design";
import type { FrameworkFamily, Status } from "@visua/core";
import { allFrameworks, frameworkMeta } from "../lib/frameworks.ts";
import type { LinkStatus, ThreatRing } from "../lib/types.ts";
import { DemandCameraControls } from "./demandRendering.ts";
import { arcTriangles, positionGeometry } from "./spatialGeometry.ts";
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
  return first ? base : `#${new Color(base).lerp(TOKENS.surface, 0.25).getHexString()}`;
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

const pillarShape = new CylinderGeometry(0.62, 0.7, 1, 6).translate(0, 0.5, 0);
const threatShape = new CylinderGeometry(0.5, 0.5, 1, 3).translate(0, 0.5, 0);
const pillarFoot = new RingGeometry(0.8, 1.0, 6, 1, Math.PI / 6).rotateX(-Math.PI / 2);
const threatFoot = new RingGeometry(0.6, 0.8, 3, 1, Math.PI / 6).rotateX(-Math.PI / 2);

type PillarProps = { layout: NexusLayout; selected: string | null; hovered: string | null; related: Set<string>; onHover: (id: string | null) => void; onSelect: (id: string) => void };

/** Two instanced fields preserve kind silhouettes without one draw call per group. */
function PillarField({ inner, layout, selected, hovered, related, onHover, onSelect }: PillarProps & { inner: boolean }) {
  const invalidate = useThree((s) => s.invalidate);
  const mesh = useRef<InstancedMesh>(null);
  const feet = useRef<InstancedMesh>(null);
  const items = useMemo(() => [...layout.positions].filter(([, p]) => p.inner === inner), [layout, inner]);
  useLayoutEffect(() => {
    const m = mesh.current, f = feet.current;
    if (!m || !f) return;
    const transform = new Object3D();
    const focus = hovered ?? selected;
    items.forEach(([id, p], i) => {
      const dim = !!focus && id !== focus && !related.has(id);
      const color = p.group.status !== null ? TOKENS.status[p.group.status].clone() : inkOf(p.framework).lerp(TOKENS.neutral, 0.56);
      if (dim) color.lerp(TOKENS.neutral, 0.72);
      transform.position.set(p.pos[0], 0, p.pos[2]);
      transform.scale.set(1, heightOf(p.group.units) * (inner ? 0.8 : 1), 1);
      transform.updateMatrix();
      m.setMatrixAt(i, transform.matrix);
      m.setColorAt(i, color);
      transform.position.y = 0.035;
      transform.scale.setScalar(1);
      transform.updateMatrix();
      f.setMatrixAt(i, transform.matrix);
      f.setColorAt(i, inkOf(p.framework).lerp(TOKENS.neutral, dim ? 0.85 : 0.25));
    });
    for (const field of [m, f]) {
      field.instanceMatrix.needsUpdate = true;
      if (field.instanceColor) field.instanceColor.needsUpdate = true;
      field.computeBoundingSphere();
    }
    invalidate();
  }, [items, selected, hovered, related, inner, invalidate]);
  const hit = (e: ThreeEvent<PointerEvent | MouseEvent>) => e.instanceId === undefined ? undefined : items[e.instanceId]?.[0];
  if (!items.length) return null;
  return (
    <group>
      <instancedMesh ref={mesh} args={[inner ? threatShape : pillarShape, undefined, items.length]}
        onPointerMove={(e) => { e.stopPropagation(); const id = hit(e); if (id) onHover(id); document.body.style.cursor = "pointer"; }}
        onPointerOut={() => { onHover(null); document.body.style.cursor = ""; }}
        onClick={(e) => { e.stopPropagation(); const id = hit(e); if (id) onSelect(id); }}>
        <meshStandardMaterial roughness={0.62} metalness={0.08} flatShading />
      </instancedMesh>
      <instancedMesh ref={feet} args={[inner ? threatFoot : pillarFoot, undefined, items.length]} raycast={() => null}>
        <meshBasicMaterial polygonOffset polygonOffsetFactor={-1} polygonOffsetUnits={-2} />
      </instancedMesh>
    </group>
  );
}

function Pillars(props: PillarProps) {
  return (
    <group>
      <PillarField {...props} inner={false} />
      <PillarField {...props} inner />
      {[props.selected, props.hovered].map((id, i) => {
        const p = id ? props.layout.positions.get(id) : undefined;
        return <mesh key={i} visible={!!p && !(i === 1 && id === props.selected)} position={p ? [p.pos[0], 0.05, p.pos[2]] : [0, 0, 0]} rotation-x={-Math.PI / 2} raycast={() => null}>
          <ringGeometry args={[1.05, 1.22, 6, 1, Math.PI / 6]} />
          <meshBasicMaterial color={TOKENS.primary} transparent opacity={i === 0 ? 1 : 0.55} toneMapped={false} />
        </mesh>;
      })}
    </group>
  );
}

function Sectors({ layout }: { layout: NexusLayout }) {
  const geometry = useMemo(() => {
    const ground: number[] = [], rail: number[] = [], groundColors: number[] = [], railColors: number[] = [];
    const append = (points: number[], colors: number[], vertices: number[], color: Color) => {
      points.push(...vertices);
      for (let i = 0; i < vertices.length / 3; i++) colors.push(color.r, color.g, color.b);
    };
    for (const sector of layout.sectors) {
      const radius = sector.inner ? INNER_RADIUS : RADIUS;
      const ink = inkOf(sector.framework.id);
      // Nexus uses -sin(angle) for Z, so reverse the angular interval for XZ geometry.
      append(ground, groundColors, arcTriangles(radius - 1.6, radius + (sector.inner ? 1.1 : 1.6), -sector.end, -sector.start, -0.04), ink.clone().lerp(TOKENS.neutral, 0.92));
      append(rail, railColors, arcTriangles(radius - 1.6, radius - 1.35, -sector.end, -sector.start, 0.015), ink.clone().lerp(TOKENS.neutral, sector.inner ? 0.4 : 0.15));
    }
    const base = positionGeometry(ground), edge = positionGeometry(rail);
    base.setAttribute("color", new Float32BufferAttribute(groundColors, 3));
    edge.setAttribute("color", new Float32BufferAttribute(railColors, 3));
    return { base, edge };
  }, [layout]);
  useEffect(() => () => { geometry.base.dispose(); geometry.edge.dispose(); }, [geometry]);
  return <group>
    <mesh geometry={geometry.base} raycast={() => null}><meshBasicMaterial vertexColors /></mesh>
    <mesh geometry={geometry.edge} raycast={() => null}><meshBasicMaterial vertexColors toneMapped={false} /></mesh>
  </group>;
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
  draft: { dashSize: 1.2, gapSize: 0.6 },
  unreviewed: { dashSize: 0.45, gapSize: 0.55 },
  superseded: { dashSize: 0.45, gapSize: 1.6 },
};

export function arcsFor(layout: NexusLayout, bundles: NexusBundle[]): ArcGeometry[] {
  const out: ArcGeometry[] = [];
  const lanes = new Map<string, string[]>();
  for (const b of bundles) {
    const pair = JSON.stringify([b.a, b.b].sort());
    const sets = lanes.get(pair) ?? [];
    if (!sets.includes(b.setId)) sets.push(b.setId);
    lanes.set(pair, sets);
  }
  for (const sets of lanes.values()) sets.sort();
  const hubs = new Map(layout.sectors.map((s) => {
    const mid = (s.start + s.end) / 2;
    const radius = s.inner ? INNER_RADIUS * 0.7 : RADIUS * 0.18;
    return [s.framework.id, new Vector3(Math.cos(mid) * radius, 0, -Math.sin(mid) * radius)];
  }));
  for (const b of bundles) {
    const pa = layout.positions.get(b.a);
    const pb = layout.positions.get(b.b);
    if (!pa || !pb) continue;
    const a = new Vector3(pa.pos[0] * 0.955, 0.3, pa.pos[2] * 0.955);
    const z = new Vector3(pb.pos[0] * 0.955, 0.3, pb.pos[2] * 0.955);
    const chord = a.distanceTo(z);
    // Shared framework hubs organize dense crossings while endpoints remain at their groups.
    const rise = (pa.inner || pb.inner ? 3 + chord * 0.28 : 4 + chord * 0.42) * 2 / 3;
    const c1 = a.clone().lerp(hubs.get(pa.framework) ?? a, 0.55).setY(rise);
    const c2 = z.clone().lerp(hubs.get(pb.framework) ?? z, 0.55).setY(rise);
    // Separate parallel publication sets in XZ so a solid link cannot hide a draft.
    const sets = lanes.get(JSON.stringify([b.a, b.b].sort()))!;
    const lane = (sets.indexOf(b.setId) - (sets.length - 1) / 2) * 1.2;
    const direction = b.a < b.b ? 1 : -1;
    const offset = new Vector3(-(z.z - a.z), 0, z.x - a.x).normalize().multiplyScalar(lane * direction);
    c1.add(offset);
    c2.add(offset);
    const points = new CubicBezierCurve3(a, c1, c2, z).getPoints(40);
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

/** Home view aggregates relationships by framework pair and provenance/status set.
 * Selecting a group restores its exact group-to-group connections. */
export function overviewBundles(layout: NexusLayout, bundles: NexusBundle[]): NexusBundle[] {
  const groups = new Map<string, NexusBundle>();
  for (const b of bundles) {
    const a = layout.positions.get(b.a)?.framework;
    const z = layout.positions.get(b.b)?.framework;
    if (!a || !z) continue;
    const [from, to] = [a, z].sort() as [string, string];
    const key = JSON.stringify([b.setId, from, to]);
    const existing = groups.get(key);
    if (existing) existing.count += b.count;
    else groups.set(key, { a: from, b: to, count: b.count, setId: b.setId });
  }
  return [...groups.values()];
}

function overviewArcs(layout: NexusLayout, bundles: NexusBundle[]): ArcGeometry[] {
  const positions: NexusLayout["positions"] = new Map();
  for (const s of layout.sectors) {
    const angle = (s.start + s.end) / 2;
    const radius = s.inner ? INNER_RADIUS : RADIUS;
    positions.set(s.framework.id, { angle, pos: [radius * Math.cos(angle), 0, -radius * Math.sin(angle)], framework: s.framework.id, inner: s.inner,
      group: { id: s.framework.id, code: s.framework.shortName, title: s.framework.shortName, units: 0, readiness: null, status: null } });
  }
  return arcsFor({ positions, sectors: layout.sectors }, overviewBundles(layout, bundles));
}

/** Line widths (pixels) snap to a few steps so arcs batch into a handful of draw calls. */
const WIDTHS = [1, 1.5, 2.2, 3, 4, 5.4, 7.2];
const snapWidth = (w: number) => WIDTHS.reduce((best, x) => (Math.abs(x - w) < Math.abs(best - w) ? x : best), WIDTHS[0]!);

interface Batch {
  line: LineSegments2;
}

/** Reset dash phase for each relationship, independent of its place in the batch. */
export function arcDistances(arcs: { points: Vector3[] }[]): { starts: number[]; ends: number[] } {
  const starts: number[] = [], ends: number[] = [];
  for (const arc of arcs) {
    let distance = 0;
    for (let i = 0; i + 1 < arc.points.length; i++) {
      starts.push(distance);
      distance += arc.points[i]!.distanceTo(arc.points[i + 1]!);
      ends.push(distance);
    }
  }
  return { starts, ends };
}

function batch(arcs: ArcGeometry[], opts: { width: number; opacity: number; wash?: number; dash: { dashSize: number; gapSize: number } | null }): Batch {
  const positions: number[] = [];
  const colors: number[] = [];
  const wash = opts.wash ?? 0;
  const keep = 1 - wash;
  for (const arc of arcs) {
    for (let i = 0; i < arc.points.length - 1; i++) {
      const p = arc.points[i]!;
      const q = arc.points[i + 1]!;
      const a = arc.colors[i]!;
      const z = arc.colors[i + 1]!;
      positions.push(p.x, p.y, p.z, q.x, q.y, q.z);
      colors.push(
        a[0] * keep + TOKENS.neutral.r * wash,
        a[1] * keep + TOKENS.neutral.g * wash,
        a[2] * keep + TOKENS.neutral.b * wash,
        z[0] * keep + TOKENS.neutral.r * wash,
        z[1] * keep + TOKENS.neutral.g * wash,
        z[2] * keep + TOKENS.neutral.b * wash,
      );
    }
  }
  const geometry = new LineSegmentsGeometry();
  geometry.setPositions(positions);
  geometry.setColors(colors);
  const material = new LineMaterial({ linewidth: opts.width, vertexColors: true, transparent: opts.opacity < 1, opacity: opts.opacity, depthWrite: opts.opacity === 1, dashed: !!opts.dash, dashSize: opts.dash?.dashSize ?? 1, gapSize: opts.dash?.gapSize ?? 1 });
  material.toneMapped = false;
  const line = new LineSegments2(geometry, material);
  if (opts.dash) {
    const distances = arcDistances(arcs);
    geometry.setAttribute("instanceDistanceStart", new InstancedBufferAttribute(new Float32Array(distances.starts), 1));
    geometry.setAttribute("instanceDistanceEnd", new InstancedBufferAttribute(new Float32Array(distances.ends), 1));
  }
  return { line };
}

/**
 * All arcs in a few draw calls (the Nexus drew one mesh per bundle, ~960 a frame):
 * resting arcs batch by width and dash style. Their colors are mixed toward the canvas
 * and rendered without alpha blending, so dense crossings do not accumulate into a
 * dark patch. Focusing a pillar hides unrelated links and shows its own arcs wider
 * and in framework color.
 */
function Arcs({ arcs, overview, focus }: { arcs: ArcGeometry[]; overview: ArcGeometry[]; focus: string | null }) {
  const invalidate = useThree((s) => s.invalidate);
  const size = useThree((s) => s.size);
  const resting = useMemo(() => {
    const groups = new Map<string, ArcGeometry[]>();
    for (const arc of overview) {
      const dash = arc.status ? LINK_DASH[arc.status] : null;
      const key = `${snapWidth(arc.width)}|${dash ? `${dash.dashSize}/${dash.gapSize}` : "-"}`;
      const list = groups.get(key);
      if (list) list.push(arc);
      else groups.set(key, [arc]);
    }
    return [...groups.entries()].map(([key, list]) => {
      const [w] = key.split("|");
      const dash = list[0]!.status ? LINK_DASH[list[0]!.status] : null;
      return batch(list, { width: Math.max(0.8, Number(w) * 0.7), opacity: 1, wash: 0.18, dash });
    });
  }, [overview]);
  const active = useMemo(() => {
    if (!focus) return [];
    const touching = arcs.filter((a) => a.bundle.a === focus || a.bundle.b === focus);
    const groups = new Map<string, ArcGeometry[]>();
    for (const arc of touching) {
      const dash = arc.status ? LINK_DASH[arc.status] : null;
      const key = `${snapWidth(arc.width * 1.35)}|${dash ? `${dash.dashSize}/${dash.gapSize}` : "-"}`;
      const list = groups.get(key);
      if (list) list.push(arc);
      else groups.set(key, [arc]);
    }
    // Selection changes emphasis; dash patterns continue to encode publication status.
    return [...groups.entries()].map(([key, list]) => {
      const dash = list[0]!.status ? LINK_DASH[list[0]!.status] : null;
      return batch(list, { width: Number(key.split("|")[0]), opacity: 1, dash });
    });
  }, [arcs, focus]);
  useEffect(() => {
    for (const b of [...resting, ...active]) (b.line.material as LineMaterial).resolution.set(size.width, size.height);
    invalidate();
  }, [resting, active, size, invalidate]);
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
  return (
    <group>
      {resting.map((b, i) => (
        <primitive key={`r${i}`} object={b.line} visible={focus === null} />
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
  return <CameraControls ref={controls} impl={DemandCameraControls} makeDefault minDistance={18} maxDistance={260} maxPolarAngle={Math.PI * 0.47} smoothTime={reducedMotion ? 0.001 : 0.4} />;
}

export function NexusCanvas({ data, selected, onSelect, onHover, hovered }: { data: NexusData; selected: string | null; onSelect: (id: string | null) => void; onHover: (id: string | null) => void; hovered: string | null }) {
  const reducedMotion = usePrefersReducedMotion();
  const layout = useMemo(() => nexusLayout(data.frameworks, threatFrameworks(data.threats)), [data.frameworks, data.threats]);
  const bundles = useMemo<NexusBundle[]>(() => [...data.bundles, ...(data.threats?.bundles ?? []).map((b) => ({ a: b.a, b: b.b, count: b.count, setId: `threat:${b.best}` }))], [data.bundles, data.threats]);
  const arcs = useMemo(() => arcsFor(layout, bundles), [layout, bundles]);
  const overview = useMemo(() => overviewArcs(layout, bundles), [layout, bundles]);
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
      frameloop="demand"
      dpr={[1, 1.75]}
      camera={{ fov: 45, near: 0.1, far: 2000, position: [0, 82, 92] }}
      gl={{ antialias: true, powerPreference: "high-performance", preserveDrawingBuffer: true }}
      onPointerMissed={() => onSelect(null)}
      aria-label="3D crosswalk Nexus. Use the group list beside it for keyboard navigation."
    >
      <color attach="background" args={[TOKENS.neutral]} />
      <fogExp2 attach="fog" args={[TOKENS.neutral, 0.0065]} />
      <hemisphereLight args={[TOKENS.surface, TOKENS.primaryContainer, 0.85]} />
      <ambientLight intensity={0.25} />
      <directionalLight position={[30, 60, 20]} intensity={2.1} />
      <directionalLight position={[-40, 22, -30]} intensity={0.4} color={TOKENS.neutral} />
      <Sectors layout={layout} />
      <Arcs arcs={arcs} overview={overview} focus={focus} />
      <Pillars layout={layout} selected={selected} hovered={hovered} related={related} onHover={onHover} onSelect={(id) => onSelect(id)} />
      <NexusLabels layout={layout} selected={selected} hovered={hovered} related={related} onSelect={onSelect} />
      <Rig selected={selected} layout={layout} reducedMotion={reducedMotion} />
    </Canvas>
  );
}
