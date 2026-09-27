/**
 * Spatial layouts for any framework graph (DESIGN.md › Spatial System).
 *
 * - Constellation: radial hierarchy on the XZ plane. Top-level groups get
 *   angular sectors proportional to their size; units of work sit on outer
 *   rings; SP 800-53 enhancements form radial stalks beyond their control.
 * - Terrain: each top-level group is a honeycomb "district" of hex cells, one
 *   cell per unit of work; districts ring the framework core.
 *
 * Y is reserved for measured values (current / target level), never decoration.
 */
import type { LeanNode } from "../lib/types.ts";

export type Vec3 = [number, number, number];
export type ViewMode = "constellation" | "terrain";

export interface Sector {
  id: string;
  code: string;
  title: string;
  start: number;
  end: number;
  radius: number;
  labelPos: Vec3;
}

export interface Layout {
  view: ViewMode;
  positions: Map<string, Vec3>;
  /** Hex radius for unit cells in this layout. */
  cell: number;
  units: string[];
  hubs: string[];
  mids: string[];
  links: [string, string][];
  sectors: Sector[];
  radius: number;
  byId: Map<string, LeanNode>;
  children: Map<string | null, LeanNode[]>;
}

function index(nodes: LeanNode[]) {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const children = new Map<string | null, LeanNode[]>();
  for (const n of nodes) {
    const list = children.get(n.parentId) ?? [];
    list.push(n);
    children.set(n.parentId, list);
  }
  for (const list of children.values()) list.sort((a, b) => a.order - b.order);
  return { byId, children };
}

function weightOf(id: string, children: Map<string | null, LeanNode[]>, byId: Map<string, LeanNode>, memo: Map<string, number>): number {
  const cached = memo.get(id);
  if (cached !== undefined) return cached;
  const kids = children.get(id) ?? [];
  const self = byId.get(id)?.assessable ? 1 : 0;
  const w = Math.max(1, self + kids.reduce((s, k) => s + weightOf(k.id, children, byId, memo), 0));
  memo.set(id, w);
  return w;
}

const polar = (r: number, a: number, y = 0): Vec3 => [Math.cos(a) * r, y, Math.sin(a) * r];

/**
 * The scene draws units of work and the groups that hold them. Nodes with no unit
 * below them (MITRE ATLAS's mitigations, a law with no tracked obligation) stay in
 * the outline and the inspector but take no place in space: `positions` has only
 * what is drawn, while `byId` and `children` keep every node for navigation.
 */
export function computeLayout(nodes: LeanNode[], view: ViewMode): Layout {
  const { children } = index(nodes);
  const holds = new Map<string, boolean>();
  const hasUnit = (n: LeanNode): boolean => {
    const known = holds.get(n.id);
    if (known !== undefined) return known;
    const v = n.assessable || (children.get(n.id) ?? []).some(hasUnit);
    holds.set(n.id, v);
    return v;
  };
  const drawn = nodes.filter(hasUnit);
  const layout = view === "terrain" ? terrain(drawn) : constellation(drawn);
  const all = index(nodes);
  return { ...layout, byId: all.byId, children: all.children };
}

function constellation(nodes: LeanNode[]): Layout {
  const { byId, children } = index(nodes);
  const memo = new Map<string, number>();
  const roots = children.get(null) ?? [];
  const positions = new Map<string, Vec3>();
  const units: string[] = [];
  const hubs: string[] = [];
  const mids: string[] = [];
  const links: [string, string][] = [];
  const sectors: Sector[] = [];

  // Ring radii grow with density so nodes never overlap.
  const byDepth = new Map<number, number>();
  for (const n of nodes) {
    const parent = n.parentId ? byId.get(n.parentId) : undefined;
    const stalk = parent?.assessable && n.assessable;
    if (!stalk) byDepth.set(n.depth, (byDepth.get(n.depth) ?? 0) + 1);
  }
  const spacing = 1.15;
  const usable = 2 * Math.PI * 0.86;
  const radii: number[] = [];
  let r = 0;
  for (let d = 0; d <= 4; d++) {
    const count = byDepth.get(d) ?? 0;
    const min = d === 0 ? Math.max(6.5, (count * 3.2) / usable) : r + 7;
    r = Math.max(min, (count * spacing) / usable);
    radii.push(r);
  }

  // A ring of labeled groups (up to 40, e.g. the state laws between jurisdictions and
  // obligations) moves out toward the units so the group codes have room to be read.
  const labeledMids = nodes.filter((n) => n.depth === 1 && !n.assessable).length;
  if (labeledMids > 0 && labeledMids <= 40 && radii[2] !== undefined && byDepth.get(2)) radii[1] = Math.max(radii[1]!, Math.min(radii[2] * 0.58, radii[2] - 7));

  const totalWeight = roots.reduce((s, n) => s + weightOf(n.id, children, byId, memo), 0);
  const gap = roots.length > 1 ? 0.14 * Math.PI * 2 * (1 / roots.length) * 0.35 : 0;
  const available = Math.PI * 2 - gap * roots.length;
  let angle = -Math.PI / 2 + gap / 2;
  let outer = radii[0]!;

  const place = (node: LeanNode, a0: number, a1: number) => {
    const mid = (a0 + a1) / 2;
    const r0 = radii[node.depth] ?? radii[radii.length - 1]!;
    positions.set(node.id, polar(r0, mid));
    outer = Math.max(outer, r0);
    if (node.depth === 0) hubs.push(node.id);
    else if (node.assessable) units.push(node.id);
    else mids.push(node.id);
    if (node.parentId) links.push([node.parentId, node.id]);
    const kids = children.get(node.id) ?? [];
    if (!kids.length) return;
    if (node.assessable) {
      // Stalk: enhancements continue radially outward, zig-zagging slightly.
      kids.forEach((k, i) => {
        const rr = r0 + 1.25 * (i + 1);
        const wobble = ((i % 2 === 0 ? 1 : -1) * 0.32) / Math.max(rr, 1);
        positions.set(k.id, polar(rr, mid + wobble));
        outer = Math.max(outer, rr);
        units.push(k.id);
        links.push([i === 0 ? node.id : kids[i - 1]!.id, k.id]);
        for (const g of children.get(k.id) ?? []) place(g, mid, mid);
      });
      return;
    }
    const w = kids.reduce((s, k) => s + weightOf(k.id, children, byId, memo), 0);
    let a = a0;
    for (const k of kids) {
      const span = ((a1 - a0) * weightOf(k.id, children, byId, memo)) / w;
      place(k, a, a + span);
      a += span;
    }
  };

  for (const root of roots) {
    const span = (available * weightOf(root.id, children, byId, memo)) / totalWeight;
    place(root, angle, angle + span);
    sectors.push({ id: root.id, code: root.code, title: root.title, start: angle, end: angle + span, radius: 0, labelPos: [0, 0, 0] });
    angle += span + gap;
  }
  const sectorRadius = outer + 3.2;
  for (const s of sectors) {
    s.radius = sectorRadius;
    s.labelPos = polar(sectorRadius + 3.4, (s.start + s.end) / 2, 0.2);
  }
  return { view: "constellation", positions, cell: 0.46, units, hubs, mids, links, sectors, radius: sectorRadius + 6, byId, children };
}

/** Axial hex coordinates of a spiral fill (center first, then rings). */
function hexSpiral(count: number): [number, number][] {
  const out: [number, number][] = [[0, 0]];
  const dirs: [number, number][] = [
    [1, 0],
    [1, -1],
    [0, -1],
    [-1, 0],
    [-1, 1],
    [0, 1],
  ];
  for (let ring = 1; out.length < count; ring++) {
    let q = -ring;
    let r = ring;
    for (const [dq, dr] of dirs) {
      for (let s = 0; s < ring && out.length < count; s++) {
        out.push([q, r]);
        q += dq;
        r += dr;
      }
    }
  }
  return out.slice(0, count);
}

function terrain(nodes: LeanNode[]): Layout {
  const { byId, children } = index(nodes);
  const roots = children.get(null) ?? [];
  const positions = new Map<string, Vec3>();
  const units: string[] = [];
  const hubs: string[] = [];
  const mids: string[] = [];
  const links: [string, string][] = [];
  const sectors: Sector[] = [];
  const cell = 0.82;
  const w = Math.sqrt(3) * cell;

  const collect = (id: string): LeanNode[] => {
    const out: LeanNode[] = [];
    const walk = (pid: string) => {
      for (const k of children.get(pid) ?? []) {
        if (k.assessable) out.push(k);
        else mids.push(k.id);
        walk(k.id);
      }
    };
    walk(id);
    return out;
  };

  const districts = roots.map((root) => {
    const cells = collect(root.id);
    const spiral = hexSpiral(Math.max(1, cells.length));
    const radius = cell * 1.9 * Math.sqrt(Math.max(1, cells.length)) * 0.62 + cell * 1.6;
    return { root, cells, spiral, radius };
  });
  const circumference = districts.reduce((s, d) => s + d.radius * 2 + 3, 0);
  const ringRadius = Math.max(9, circumference / (2 * Math.PI));
  let angle = -Math.PI / 2;
  for (const d of districts) {
    const span = ((d.radius * 2 + 3) / circumference) * Math.PI * 2;
    const mid = angle + span / 2;
    const center = polar(ringRadius + d.radius * 0.35, mid);
    hubs.push(d.root.id);
    positions.set(d.root.id, [center[0] * 0.42, 0, center[2] * 0.42]);
    d.cells.forEach((c, i) => {
      const [q, r] = d.spiral[i]!;
      const x = center[0] + w * (q + r / 2);
      const z = center[2] + cell * 1.5 * r;
      positions.set(c.id, [x, 0, z]);
      units.push(c.id);
    });
    // Mid-level groups (categories/controls) sit at the centroid of their cells for navigation.
    for (const mid of children.get(d.root.id) ?? []) {
      if (mid.assessable) continue;
      const pts = (function gather(id: string): Vec3[] {
        return (children.get(id) ?? []).flatMap((k) => (k.assessable ? [positions.get(k.id)!] : gather(k.id)));
      })(mid.id).filter(Boolean);
      if (!pts.length) continue;
      const cx = pts.reduce((s, p) => s + p[0], 0) / pts.length;
      const cz = pts.reduce((s, p) => s + p[2], 0) / pts.length;
      positions.set(mid.id, [cx, 0, cz]);
    }
    sectors.push({ id: d.root.id, code: d.root.code, title: d.root.title, start: angle, end: angle + span, radius: ringRadius, labelPos: polar(ringRadius + d.radius * 0.35 + d.radius + 2.2, mid, 0.2) });
    angle += span;
  }
  for (const id of mids) if (!positions.has(id)) positions.set(id, [0, 0, 0]);
  return { view: "terrain", positions, cell, units, hubs, mids, links, sectors, radius: ringRadius + Math.max(...districts.map((d) => d.radius)) + 3, byId, children };
}
