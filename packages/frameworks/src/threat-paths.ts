/**
 * How each threat (MITRE ATLAS, the OWASP Top 10s, NIST AI 100-2) reaches the
 * requirements that address it, through published links only:
 *
 *   - directly (e.g. OWASP LLM Top 10 2026 → AI RMF categories, COSAiS SP 800-53
 *     controls → NIST AI 100-2 attacks, the OWASP community crosswalk);
 *   - through an ATLAS mitigation (technique → mitigation, MITRE; mitigation →
 *     CSF subcategory, NIST IR 8596 draft);
 *   - through the same entry in the other OWASP LLM Top 10 edition (OWASP's own
 *     2025 → 2026 rank migration, Figure 1 of the 2026 edition).
 *
 * Every path keeps its links, each with its publisher and status, and a path is only
 * as strong as its weakest link (final > draft > unreviewed > superseded). The graph is
 * static: it depends on the registry only, and is shared by the server and the agents.
 */
import type { MappingStatus, RequirementNode } from "@visua/core";
import type { FrameworkRegistry } from "./index.ts";
import { ATLAS_ID } from "./ingest/threats.ts";
import type { ThreatLink } from "./threat-links.ts";

export const STATUS_RANK: Record<MappingStatus, number> = { final: 3, draft: 2, unreviewed: 1, superseded: 0 };

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

export interface ThreatPathGraph {
  isThreat: (nodeId: string) => boolean;
  /** Threat node → requirement node → paths. */
  forward: Map<string, Map<string, ThreatPath[]>>;
  /** Requirement node → threat node → paths. */
  reverse: Map<string, Map<string, ThreatPath[]>>;
}

export const weakest = (links: { status: MappingStatus }[]): MappingStatus => links.reduce<MappingStatus>((w, l) => (STATUS_RANK[l.status] < STATUS_RANK[w] ? l.status : w), "final");

export const linkView = (l: ThreatLink): LinkView => ({
  label: l.label,
  status: l.status,
  authority: l.authority,
  ...(l.strength ? { strength: l.strength } : {}),
  ...(l.note ? { note: l.note } : {}),
  citation: l.citation,
});

/** OWASP publishes the 2025 → 2026 counterparts in its rank migration chart (2026 edition, p. 6). */
const EDITION_LINK: LinkView = {
  label: "same entry in the other edition",
  status: "final",
  authority: "OWASP LLM Top 10 2026, Figure 1",
  citation: { documentId: "owasp-llm-top10-2026-pdf", locator: "Figure 1: rank migration from the 2025 to the 2026 Top 10", page: 6 },
};

/**
 * Coverage groups: the publication that links the requirement (the path's last link)
 * and, within it, the route (an ATLAS mitigation, the other edition's entry, a group
 * such as an AI RMF category, or the requirement itself). Coverage weighs every
 * publication equally and, within one, every route equally.
 */
export function coverageGroup(path: ThreatPath, requirementId: string): { publication: string; route: string } {
  return { publication: path.links[path.links.length - 1]!.authority, route: path.via ?? (path.group ? `group:${path.group}` : requirementId) };
}

const graphs = new WeakMap<FrameworkRegistry, ThreatPathGraph>();

export function threatPaths(registry: FrameworkRegistry): ThreatPathGraph {
  const cached = graphs.get(registry);
  if (cached) return cached;
  const threatFrameworks = new Set(registry.frameworks.filter((f) => f.family === "threat").map((f) => f.id));
  const fwOf = (id: string) => id.slice(0, id.indexOf(":"));
  const isThreat = (id: string) => threatFrameworks.has(fwOf(id));
  const node = (id: string): RequirementNode | undefined => registry.framework(fwOf(id))?.byId.get(id);
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
      const links = [...first, linkView(l)];
      for (const u of units(l.nodeId)) add(threatId, u.id, { kind, ...(via ? { via } : {}), ...(u.group ? { group: u.group } : {}), links, status: weakest(links) });
    }
  };
  for (const fw of threatFrameworks) {
    for (const t of registry.framework(fw)!.graph.nodes) {
      direct(t.id, "direct", undefined, []);
      for (const l of registry.threatLinks.of(t.id)) {
        // Through an ATLAS mitigation of this technique, or an ATLAS mitigation a publication cites for this attack.
        const other = node(l.nodeId);
        if (other && other.frameworkId === ATLAS_ID && other.kind === "mitigation" && t.kind !== "mitigation") direct(t.id, "mitigation", other.id, [linkView(l)]);
      }
      // Through the same entry in the other OWASP LLM Top 10 edition.
      for (const key of ["previousEdition", "nextEdition"]) {
        const edition = t.attributes?.[key] as { nodeId: string } | undefined;
        if (edition && node(edition.nodeId)) direct(t.id, "edition", edition.nodeId, [EDITION_LINK]);
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
