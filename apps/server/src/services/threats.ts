/**
 * Threat views: MITRE ATLAS, the OWASP Top 10s and NIST AI 100-2 seen through
 * the requirements a workspace implements.
 *
 * Threat catalogs are never assessed. A threat's coverage is derived from the
 * requirements that a publisher linked to it:
 *
 *   - directly (e.g. OWASP LLM Top 10 2026 → AI RMF categories, COSAiS SP 800-53
 *     controls → NIST AI 100-2 attacks, the OWASP community crosswalk);
 *   - through an ATLAS mitigation (CSF subcategory → mitigation, NIST IR 8596
 *     draft; mitigation → technique, MITRE);
 *   - through the same entry in the other OWASP LLM Top 10 edition.
 *
 * Every path keeps its links, and a path is only as strong as its weakest
 * link's status (final > draft > unreviewed > superseded).
 */
import { groupStatus, LEVEL_SCALES, type MappingStatus, type RequirementNode, type RequirementState, type Status, type Workspace } from "@visua/core";
import { AI_100_2_ID, ATLAS_ID, FRAMEWORK_ORDER, OWASP_AGENTIC_ID, OWASP_LLM_ID, type FrameworkRegistry, type ThreatLink } from "@visua/frameworks";
import { groupOf } from "./crosswalk.ts";
import { NotFoundError, ValidationError, type VisuaService } from "./visua.ts";

export const STATUS_RANK: Record<MappingStatus, number> = { final: 3, draft: 2, unreviewed: 1, superseded: 0 };
const MIN_STATUSES = ["final", "draft", "unreviewed"] as const;
export type MinStatus = (typeof MIN_STATUSES)[number];

export function parseMinStatus(value: string | undefined): MinStatus {
  if (!value) return "unreviewed";
  if (!(MIN_STATUSES as readonly string[]).includes(value)) throw new ValidationError(`min must be one of ${MIN_STATUSES.join(", ")}`);
  return value as MinStatus;
}

export type PathKind = "direct" | "mitigation" | "edition";

export interface LinkView {
  label: string;
  status: MappingStatus;
  authority: string;
  strength?: string;
  note?: string;
  citation: ThreatLink["citation"];
}

export interface ThreatPath {
  kind: PathKind;
  /** The intermediate threat-catalog node (an ATLAS mitigation, or the other OWASP edition). */
  via?: string;
  /** Set when the link names a group (e.g. an AI RMF category) and the requirement is one of its units. */
  group?: string;
  links: LinkView[];
  status: MappingStatus;
}

export type CoverageState = "covered" | "partial" | "open" | "out-of-scope" | "unmapped";

export interface ThreatCoverage {
  state: CoverageState;
  /** THREAT_SCALE level (0–4) when any linked requirement is in scope. */
  level: number | null;
  /** Linked requirements (all frameworks), after the status filter. */
  linked: number;
  /** Linked requirements in the workspace's enabled frameworks and applicable. */
  inScope: number;
  met: number;
  atRisk: number;
  /** Mean progress toward target of the in-scope linked requirements (0–1). */
  progress: number;
  /** Strongest link status among the paths. */
  best: MappingStatus | null;
  /** Frameworks the linked requirements belong to. */
  frameworks: string[];
}

const weakest = (links: { status: MappingStatus }[]): MappingStatus => links.reduce<MappingStatus>((w, l) => (STATUS_RANK[l.status] < STATUS_RANK[w] ? l.status : w), "final");
const view = (l: ThreatLink): LinkView => ({ label: l.label, status: l.status, authority: l.authority, ...(l.strength ? { strength: l.strength } : {}), ...(l.note ? { note: l.note } : {}), citation: l.citation });

/** Static link structure, computed once per registry. */
interface ThreatGraph {
  isThreat: (nodeId: string) => boolean;
  /** Threat node → requirement node → paths. */
  forward: Map<string, Map<string, ThreatPath[]>>;
  /** Requirement node → threat node → paths. */
  reverse: Map<string, Map<string, ThreatPath[]>>;
}

const graphs = new WeakMap<FrameworkRegistry, ThreatGraph>();

function threatGraph(registry: FrameworkRegistry): ThreatGraph {
  const cached = graphs.get(registry);
  if (cached) return cached;
  const threatFrameworks = new Set(registry.frameworks.filter((f) => f.family === "threat").map((f) => f.id));
  const fwOf = (id: string) => id.slice(0, id.indexOf(":"));
  const isThreat = (id: string) => threatFrameworks.has(fwOf(id));
  const node = (id: string) => registry.framework(fwOf(id))?.byId.get(id);
  // A link to a group (an AI RMF category, a CSF category) stands for its units.
  const units = (id: string): { id: string; group?: string }[] => {
    const n = node(id);
    if (!n) return [];
    if (n.assessable) return [{ id }];
    return registry
      .framework(n.frameworkId)!
      .assessableUnder(id)
      .map((u) => ({ id: u.id, group: n.code }));
  };
  const forward = new Map<string, Map<string, ThreatPath[]>>();
  const add = (threatId: string, reqId: string, path: ThreatPath) => {
    const byReq = forward.get(threatId) ?? new Map<string, ThreatPath[]>();
    byReq.set(reqId, [...(byReq.get(reqId) ?? []), path]);
    forward.set(threatId, byReq);
  };
  const direct = (threatId: string, kind: PathKind, via: string | undefined, first: LinkView[]) => {
    for (const l of registry.threatLinks.of(via ?? threatId)) {
      if (isThreat(l.nodeId)) continue;
      const links = [...first, view(l)];
      for (const u of units(l.nodeId)) add(threatId, u.id, { kind, ...(via ? { via } : {}), ...(u.group ? { group: u.group } : {}), links, status: weakest(links) });
    }
  };
  for (const fw of threatFrameworks) {
    for (const t of registry.framework(fw)!.graph.nodes) {
      direct(t.id, "direct", undefined, []);
      for (const l of registry.threatLinks.of(t.id)) {
        // Through an ATLAS mitigation of this technique, or an ATLAS mitigation a publication cites for this attack.
        const other = node(l.nodeId);
        if (other && other.frameworkId === ATLAS_ID && other.kind === "mitigation" && t.kind !== "mitigation") direct(t.id, "mitigation", other.id, [view(l)]);
      }
      // Through the same entry in the other OWASP LLM Top 10 edition.
      for (const key of ["previousEdition", "nextEdition"]) {
        const edition = t.attributes?.[key] as { nodeId: string } | undefined;
        if (edition && node(edition.nodeId)) direct(t.id, "edition", edition.nodeId, []);
      }
    }
  }
  const reverse = new Map<string, Map<string, ThreatPath[]>>();
  for (const [threatId, byReq] of forward) {
    for (const [reqId, paths] of byReq) {
      const byThreat = reverse.get(reqId) ?? new Map<string, ThreatPath[]>();
      byThreat.set(threatId, paths);
      reverse.set(reqId, byThreat);
    }
  }
  const g = { isThreat, forward, reverse };
  graphs.set(registry, g);
  return g;
}

/** Paths that pass the status filter. */
const passing = (paths: ThreatPath[], min: MinStatus) => paths.filter((p) => STATUS_RANK[p.status] >= STATUS_RANK[min]);

interface WorkspaceSignals {
  enabled: Set<string>;
  states: Map<string, RequirementState>;
  statuses: Map<string, Status>;
}

/** States and statuses of the workspace's enabled frameworks that threat links reach. */
async function signals(svc: VisuaService, ws: Workspace, frameworks: Iterable<string>): Promise<WorkspaceSignals> {
  const enabled = new Set(ws.frameworks.filter((f) => f.enabled).map((f) => f.frameworkId));
  const wanted = [...new Set(frameworks)].filter((f) => enabled.has(f));
  const loaded = await Promise.all(wanted.map(async (f) => [await svc.store.states.map(ws.id, f), await svc.score(ws.id, f)] as const));
  const states = new Map<string, RequirementState>();
  const statuses = new Map<string, Status>();
  for (const [m, score] of loaded) {
    for (const [id, s] of m) states.set(id, s);
    for (const [id, s] of score.statuses) statuses.set(id, s.status);
  }
  return { enabled, states, statuses };
}

const fwOf = (id: string) => id.slice(0, id.indexOf(":"));

function coverageOf(byReq: Map<string, ThreatPath[]> | undefined, min: MinStatus, sig: WorkspaceSignals): ThreatCoverage {
  const linked: string[] = [];
  let best: MappingStatus | null = null;
  for (const [reqId, paths] of byReq ?? []) {
    const ok = passing(paths, min);
    if (!ok.length) continue;
    linked.push(reqId);
    for (const p of ok) if (!best || STATUS_RANK[p.status] > STATUS_RANK[best]) best = p.status;
  }
  const frameworks = [...new Set(linked.map(fwOf))].sort((a, b) => FRAMEWORK_ORDER.indexOf(a) - FRAMEWORK_ORDER.indexOf(b));
  const inScope = linked.filter((id) => sig.enabled.has(fwOf(id)) && sig.states.get(id)?.applicable !== false && sig.states.has(id));
  if (!linked.length) return { state: "unmapped", level: null, linked: 0, inScope: 0, met: 0, atRisk: 0, progress: 0, best, frameworks };
  if (!inScope.length) return { state: "out-of-scope", level: null, linked: linked.length, inScope: 0, met: 0, atRisk: 0, progress: 0, best, frameworks };
  let sum = 0;
  let met = 0;
  let atRisk = 0;
  for (const id of inScope) {
    const s = sig.states.get(id)!;
    const p = s.target > 0 ? Math.min(s.current / s.target, 1) : s.current > 0 ? 1 : 0;
    sum += p;
    if (s.current >= s.target && s.target > 0) met++;
    if (sig.statuses.get(id) === "at-risk") atRisk++;
  }
  const progress = sum / inScope.length;
  const level = met === inScope.length ? 4 : progress >= 2 / 3 ? 3 : progress >= 1 / 3 ? 2 : progress > 0 ? 1 : 0;
  const state: CoverageState = level === 4 ? "covered" : level === 0 ? "open" : "partial";
  return { state, level, linked: linked.length, inScope: inScope.length, met, atRisk, progress: Math.round(progress * 1000) / 1000, best, frameworks };
}

function catalogIndex(svc: VisuaService, catalogId: string) {
  const index = svc.registry.framework(catalogId);
  if (!index || index.graph.framework.family !== "threat") throw new NotFoundError(`Threat catalog '${catalogId}' not found`);
  return index;
}

const threatCatalogs = (svc: VisuaService) => svc.registry.frameworks.filter((f) => f.family === "threat");

const leanNode = (n: RequirementNode) => {
  const a = n.attributes ?? {};
  return {
    id: n.id,
    code: n.code,
    kind: n.kind,
    parentId: n.parentId,
    order: n.order,
    title: n.title,
    summary: n.text.length > 240 ? `${n.text.slice(0, 237).replace(/\s+\S*$/, "")}…` : n.text,
    assessable: n.assessable,
    label: a["label"] as string | undefined,
    tactics: a["tactics"] as string[] | undefined,
    maturity: a["maturity"] as string | undefined,
    status: a["status"] as string | undefined,
    edition: a["edition"] as string | undefined,
    objectives: a["objectives"] as string[] | undefined,
    taxonomies: a["taxonomies"] as string[] | undefined,
    previousEdition: a["previousEdition"] as { key: string; nodeId: string } | undefined,
    nextEdition: a["nextEdition"] as { key: string; nodeId: string } | undefined,
  };
};

/** Every threat catalog with coverage counts, and the link sets that feed them. */
export async function threatsOverview(svc: VisuaService, ws: Workspace, min: MinStatus) {
  const g = threatGraph(svc.registry);
  const catalogs = threatCatalogs(svc);
  const reached = new Set<string>();
  for (const byReq of g.forward.values()) for (const id of byReq.keys()) reached.add(fwOf(id));
  const sig = await signals(svc, ws, reached);
  const shortName = (id: string) => svc.registry.framework(id)?.graph.framework.shortName ?? id;
  return {
    minStatus: min,
    catalogs: catalogs.map((c) => {
      const index = svc.registry.framework(c.id)!;
      const byState: Record<CoverageState, number> = { covered: 0, partial: 0, open: 0, "out-of-scope": 0, unmapped: 0 };
      const linkedFrameworks = new Map<string, number>();
      const open: { id: string; code: string; title: string; coverage: ThreatCoverage }[] = [];
      for (const u of index.assessable) {
        const coverage = coverageOf(g.forward.get(u.id), min, sig);
        byState[coverage.state]++;
        for (const f of coverage.frameworks) linkedFrameworks.set(f, (linkedFrameworks.get(f) ?? 0) + 1);
        if (coverage.state === "open" || coverage.state === "partial") open.push({ id: u.id, code: u.code, title: u.title, coverage });
      }
      open.sort((a, b) => a.coverage.progress - b.coverage.progress || b.coverage.inScope - a.coverage.inScope);
      return {
        id: c.id,
        shortName: c.shortName,
        name: c.name,
        publisher: c.publisher,
        version: c.version,
        published: c.published,
        description: c.description,
        unitLabel: c.unitLabel,
        unitLabelPlural: c.unitLabelPlural,
        contentNotice: c.contentNotice,
        units: index.assessable.length,
        byState,
        linkedFrameworks: [...linkedFrameworks.entries()]
          .sort((a, b) => FRAMEWORK_ORDER.indexOf(a[0]) - FRAMEWORK_ORDER.indexOf(b[0]))
          .map(([id, threats]) => ({ id, shortName: shortName(id), enabled: sig.enabled.has(id), threats })),
        weakest: open.slice(0, 5),
      };
    }),
    sources: svc.registry.threatLinks.sets.map((s) => ({
      id: s.id,
      authority: s.authority,
      status: s.status ?? "final",
      source: { id: s.sourceFramework, shortName: shortName(s.sourceFramework) },
      target: { id: s.targetFramework, shortName: shortName(s.targetFramework) },
      links: s.mappings.length,
    })),
  };
}

/** One catalog's nodes with the coverage of each. */
export async function threatCatalogState(svc: VisuaService, ws: Workspace, catalogId: string, min: MinStatus) {
  const index = catalogIndex(svc, catalogId);
  const g = threatGraph(svc.registry);
  const reached = new Set<string>();
  for (const n of index.graph.nodes) for (const id of g.forward.get(n.id)?.keys() ?? []) reached.add(fwOf(id));
  const sig = await signals(svc, ws, reached);
  const coverage: Record<string, ThreatCoverage> = {};
  for (const n of index.graph.nodes) if (n.assessable || n.kind === "mitigation") coverage[n.id] = coverageOf(g.forward.get(n.id), min, sig);
  const f = index.graph.framework;
  return {
    catalog: { id: f.id, shortName: f.shortName, name: f.name, publisher: f.publisher, version: f.version, published: f.published, description: f.description, levels: f.levels, unitLabel: f.unitLabel, unitLabelPlural: f.unitLabelPlural, contentNotice: f.contentNotice },
    minStatus: min,
    enabledFrameworks: [...sig.enabled],
    nodes: index.graph.nodes.map(leanNode),
    coverage,
  };
}

/** Coverage of a group of threats (a tactic, an edition, an objective): its threats' coverage, pooled. */
function pooled(coverages: ThreatCoverage[]): { coverage: ThreatCoverage; byState: Record<CoverageState, number> } {
  const byState: Record<CoverageState, number> = { covered: 0, partial: 0, open: 0, "out-of-scope": 0, unmapped: 0 };
  let best: MappingStatus | null = null;
  const frameworks = new Set<string>();
  let progress = 0;
  let counted = 0;
  const sum = { linked: 0, inScope: 0, met: 0, atRisk: 0 };
  for (const c of coverages) {
    byState[c.state]++;
    if (c.best && (!best || STATUS_RANK[c.best] > STATUS_RANK[best])) best = c.best;
    for (const f of c.frameworks) frameworks.add(f);
    sum.linked += c.linked;
    sum.inScope += c.inScope;
    sum.met += c.met;
    sum.atRisk += c.atRisk;
    if (c.level !== null) {
      progress += c.progress;
      counted++;
    }
  }
  const mean = counted ? progress / counted : 0;
  const state: CoverageState = !counted ? (byState["out-of-scope"] ? "out-of-scope" : "unmapped") : byState.covered === counted ? "covered" : mean > 0 ? "partial" : "open";
  const level = !counted ? null : state === "covered" ? 4 : mean >= 2 / 3 ? 3 : mean >= 1 / 3 ? 2 : mean > 0 ? 1 : 0;
  return { coverage: { state, level, ...sum, progress: Math.round(mean * 1000) / 1000, best, frameworks: [...frameworks] }, byState };
}

/** Inspector section for a threat node: its coverage and the requirements and threats linked to it. */
export async function threatDetail(svc: VisuaService, ws: Workspace, node: RequirementNode, min: MinStatus = "unreviewed") {
  const g = threatGraph(svc.registry);
  const related = svc.registry.threatLinks
    .of(node.id)
    .filter((l) => g.isThreat(l.nodeId))
    .map((l) => ({ ...briefOf(svc, l.nodeId), direction: l.direction, ...view(l) }));
  const externalRefs = (node.attributes?.["externalRefs"] as unknown[] | undefined) ?? [];
  // A tactic, edition or objective: pooled coverage of its threats.
  if (!node.assessable && node.kind !== "mitigation") {
    const units = ringGroups(svc.registry, node.frameworkId).find((x) => x.group.id === node.id)?.units ?? svc.registry.framework(node.frameworkId)!.assessableUnder(node.id);
    const reached = new Set<string>();
    for (const u of units) for (const id of g.forward.get(u.id)?.keys() ?? []) reached.add(fwOf(id));
    const sig = await signals(svc, ws, reached);
    const { coverage, byState } = pooled(units.map((u) => coverageOf(g.forward.get(u.id), min, sig)));
    return { minStatus: min, coverage, group: { units: units.length, byState }, requirements: [], related, externalRefs };
  }
  const byReq = g.forward.get(node.id);
  const sig = await signals(svc, ws, [...(byReq?.keys() ?? [])].map(fwOf));
  const brief = (id: string) => briefOf(svc, id);
  const requirements = [...(byReq ?? new Map<string, ThreatPath[]>())]
    .map(([id, paths]) => {
      const ok = passing(paths, min);
      const s = sig.states.get(id);
      return {
        ...brief(id),
        enabled: sig.enabled.has(fwOf(id)),
        current: s?.current,
        target: s?.target,
        applicable: s?.applicable,
        status: sig.statuses.get(id) ?? null,
        best: ok.reduce<MappingStatus | null>((b, p) => (!b || STATUS_RANK[p.status] > STATUS_RANK[b] ? p.status : b), null),
        paths: ok.map((p) => ({ ...p, via: p.via ? brief(p.via) : undefined })),
      };
    })
    .filter((r) => r.paths.length)
    .sort((a, b) => STATUS_RANK[b.best!] - STATUS_RANK[a.best!] || FRAMEWORK_ORDER.indexOf(a.framework) - FRAMEWORK_ORDER.indexOf(b.framework) || a.code.localeCompare(b.code, undefined, { numeric: true }));
  return { minStatus: min, coverage: coverageOf(byReq, min, sig), group: null, requirements, related, externalRefs };
}

/** Id, code and a readable title (CSF subcategories have no title: their text stands in). */
function briefOf(svc: VisuaService, id: string) {
  const n = svc.registry.node(id);
  const title = n ? (n.title && n.title !== n.code ? n.title : n.text.length > 140 ? `${n.text.slice(0, 137)}…` : n.text) : "";
  return { id, code: n?.code ?? id, title, kind: n?.kind ?? "", framework: fwOf(id) };
}

/** Inspector section for a requirement: the threats it helps address. */
export function threatsAddressedBy(svc: VisuaService, nodeId: string) {
  const g = threatGraph(svc.registry);
  const byThreat = g.reverse.get(nodeId);
  if (!byThreat) return [];
  const brief = (id: string) => briefOf(svc, id);
  return [...byThreat]
    .map(([id, paths]) => {
      const best = paths.reduce<MappingStatus>((b, p) => (STATUS_RANK[p.status] > STATUS_RANK[b] ? p.status : b), "superseded");
      return { ...brief(id), best, paths: paths.map((p) => ({ ...p, via: p.via ? brief(p.via) : undefined })) };
    })
    .filter((t) => svc.registry.framework(t.framework)?.byId.get(t.id)?.assessable || t.kind === "mitigation")
    .sort((a, b) => FRAMEWORK_ORDER.indexOf(a.framework) - FRAMEWORK_ORDER.indexOf(b.framework) || STATUS_RANK[b.best] - STATUS_RANK[a.best] || a.code.localeCompare(b.code, undefined, { numeric: true }));
}

/** For tests and the crosswalk view: how many requirements each threat reaches, by path kind. */
export function threatPathCounts(registry: FrameworkRegistry) {
  const g = threatGraph(registry);
  const counts: Record<PathKind, number> = { direct: 0, mitigation: 0, edition: 0 };
  for (const byReq of g.forward.values()) for (const paths of byReq.values()) for (const p of paths) counts[p.kind]++;
  return counts;
}

// ---------------------------------------------------------------------------
// The Nexus threat ring
// ---------------------------------------------------------------------------

/** Ring groups: ATLAS tactics, OWASP entries (current editions), NIST AI 100-2 objectives. */
function ringGroups(registry: FrameworkRegistry, catalogId: string): { group: RequirementNode; units: RequirementNode[] }[] {
  const index = registry.framework(catalogId);
  if (!index) return [];
  const listed = (n: RequirementNode, key: string) => ((n.attributes?.[key] as string[] | undefined) ?? []);
  switch (catalogId) {
    case ATLAS_ID: {
      const techniques = index.assessable;
      // Sub-techniques serve their parent's tactics when they list none of their own.
      const tacticsOf = (n: RequirementNode) => (listed(n, "tactics").length ? listed(n, "tactics") : n.parentId ? listed(index.byId.get(n.parentId)!, "tactics") : []);
      return index.roots().filter((r) => r.kind === "tactic").map((t) => ({ group: t, units: techniques.filter((n) => tacticsOf(n).includes(t.id)) }));
    }
    case OWASP_LLM_ID:
    case OWASP_AGENTIC_ID:
      return index.assessable.map((n) => ({ group: n, units: [n] }));
    case AI_100_2_ID:
      return index.roots().map((o) => ({ group: o, units: index.assessable.filter((a) => listed(a, "objectives").includes(o.id)) }));
    default:
      return [];
  }
}

export async function threatRing(svc: VisuaService, ws: Workspace, min: MinStatus) {
  const g = threatGraph(svc.registry);
  const reached = new Set<string>();
  for (const byReq of g.forward.values()) for (const id of byReq.keys()) reached.add(fwOf(id));
  const sig = await signals(svc, ws, reached);
  const bundles = new Map<string, { a: string; b: string; count: number; best: MappingStatus }>();
  const catalogs = threatCatalogs(svc)
    .map((c) => ({
      id: c.id,
      shortName: c.shortName,
      groups: ringGroups(svc.registry, c.id)
        .filter((x) => x.units.length)
        .map(({ group, units }) => {
          const byState: Record<CoverageState, number> = { covered: 0, partial: 0, open: 0, "out-of-scope": 0, unmapped: 0 };
          let progress = 0;
          let counted = 0;
          for (const u of units) {
            const cov = coverageOf(g.forward.get(u.id), min, sig);
            byState[cov.state]++;
            if (cov.level !== null) {
              progress += cov.progress;
              counted++;
            }
            for (const [reqId, paths] of g.forward.get(u.id) ?? []) {
              const ok = passing(paths, min);
              const reqGroup = ok.length ? groupOf(svc, reqId) : null;
              if (!reqGroup) continue;
              const key = `${group.id}|${reqGroup}`;
              const best = ok.reduce<MappingStatus>((b, p) => (STATUS_RANK[p.status] > STATUS_RANK[b] ? p.status : b), "superseded");
              const bundle = bundles.get(key) ?? { a: group.id, b: reqGroup, count: 0, best };
              bundle.count++;
              if (STATUS_RANK[best] > STATUS_RANK[bundle.best]) bundle.best = best;
              bundles.set(key, bundle);
            }
          }
          const mean = counted ? progress / counted : null;
          const status: Status | null = mean === null ? null : byState.covered === counted ? "implemented" : mean > 0 ? "in-progress" : "not-started";
          // Entries show their key (LLM01:2026, ASI01); tactics and objectives their identifier.
          const code = group.kind === "risk" ? String(group.attributes?.["label"] ?? group.code) : group.code;
          return { id: group.id, code, title: group.title, units: units.length, byState, readiness: mean, status };
        }),
    }))
    .filter((c) => c.groups.length);
  return { minStatus: min, catalogs, bundles: [...bundles.values()] };
}

// ---------------------------------------------------------------------------
// Observatory bundle: coverage in the shape of a framework state bundle
// ---------------------------------------------------------------------------

const COVERAGE_STATUS: Record<CoverageState, Status> = { covered: "implemented", partial: "in-progress", open: "not-started", "out-of-scope": "not-applicable", unmapped: "not-applicable" };

const COVERAGE_REASON: Record<CoverageState, string> = {
  covered: "Every linked requirement in scope is at its target",
  partial: "Linked requirements are partly implemented",
  open: "No linked requirement is implemented yet",
  "out-of-scope": "Linked requirements are in frameworks this workspace does not follow",
  unmapped: "No published link to a requirement (at this link status)",
};

const emptyCounts = (): Record<Status, number> => ({ "not-started": 0, "in-progress": 0, implemented: 0, verified: 0, "at-risk": 0, "not-applicable": 0 });

/**
 * A threat catalog for the 3D Observatory: each threat's height is its coverage level
 * (THREAT_SCALE, target 4) and its color the status its coverage corresponds to. Nothing
 * here is an assessment of the threat.
 */
export async function threatStateBundle(svc: VisuaService, ws: Workspace, catalogId: string, min: MinStatus = "unreviewed") {
  const index = catalogIndex(svc, catalogId);
  const g = threatGraph(svc.registry);
  const reached = new Set<string>();
  for (const n of index.assessable) for (const id of g.forward.get(n.id)?.keys() ?? []) reached.add(fwOf(id));
  const sig = await signals(svc, ws, reached);
  const units: Record<string, { current: number; target: number; priority: "medium"; applicable: boolean; status: Status; reasons: string[]; openTasks: number; evidence: number; mapped: number; coverage: ThreatCoverage }> = {};
  for (const n of index.assessable) {
    const coverage = coverageOf(g.forward.get(n.id), min, sig);
    const applicable = coverage.level !== null;
    // A linked requirement at risk is a reason, not the threat's color: one at-risk outcome would redden dozens of threats.
    const status: Status = COVERAGE_STATUS[coverage.state];
    const reasons = [COVERAGE_REASON[coverage.state], ...(coverage.inScope ? [`${coverage.met} of ${coverage.inScope} linked requirements at target`] : []), ...(coverage.atRisk ? [`${coverage.atRisk} linked requirement(s) at risk`] : [])];
    units[n.id] = { current: coverage.level ?? 0, target: 4, priority: "medium", applicable, status, reasons, openTasks: 0, evidence: 0, mapped: coverage.linked, coverage };
  }
  const aggregate = (nodeId: string, ids: string[]) => {
    const counts = emptyCounts();
    let progress = 0;
    let total = 0;
    let gaps = 0;
    let current = 0;
    for (const id of ids) {
      const u = units[id]!;
      counts[u.status]++;
      if (!u.applicable) continue;
      total++;
      progress += u.coverage.progress;
      current += u.current;
      if (u.current < u.target) gaps++;
    }
    const score = {
      nodeId,
      readiness: total ? progress / total : 0,
      current: total ? current / total : 0,
      target: total ? 4 : 0,
      gapScore: gaps,
      gaps,
      counts,
      total,
      evidenceCoverage: 0,
      verifiedShare: 0,
    };
    return { ...score, status: groupStatus(score) };
  };
  const groups: Record<string, ReturnType<typeof aggregate>> = {};
  for (const n of index.graph.nodes) if (!n.assessable) {
    const under = index.assessableUnder(n.id).map((u) => u.id);
    if (under.length) groups[n.id] = aggregate(n.id, under);
  }
  return {
    frameworkId: catalogId,
    overall: aggregate(catalogId, index.assessable.map((n) => n.id)),
    groups,
    units,
    overlay: null,
    threat: { minStatus: min, levels: LEVEL_SCALES.threat.levels },
  };
}
