/**
 * Crosswalk views for the Nexus: authoritative mapping sets aggregated into
 * group-level bundles (CSF category ↔ SP 800-53 family, TSC series ↔ CSF
 * category, …) and unit-level rows with the workspace's live progress on both
 * sides. A mapping says two requirements are related — never that evidence for
 * one satisfies the other.
 */
import { codeOf, frameworkOf, groupStatus, type MappingRelationship, type Status, type Workspace } from "@visua/core";
import type { VisuaService } from "./visua.ts";

/** Depth of the node level used to bundle mappings in the Nexus. */
const BUNDLE_DEPTH: Record<string, number> = { "nist-csf-2.0": 1, "aicpa-tsc-2017": 1 };

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
  family: string;
  enabled: boolean;
  groups: NexusGroup[];
}

export interface NexusBundle {
  a: string;
  b: string;
  count: number;
  setId: string;
  relationships: Partial<Record<MappingRelationship, number>>;
}

export function groupOf(svc: VisuaService, nodeId: string): string | null {
  const fw = frameworkOf(nodeId);
  const index = svc.registry.framework(fw);
  if (!index) return null;
  const depth = BUNDLE_DEPTH[fw] ?? 0;
  const node = index.byId.get(nodeId);
  if (!node) return null;
  if (node.depth === depth) return node.id;
  return index.ancestors(nodeId).find((a) => a.depth === depth)?.id ?? null;
}

export async function crosswalkOverview(svc: VisuaService, ws: Workspace) {
  const sets = svc.registry.crosswalk.sets;
  // Frameworks that only threat catalogs link to (the AI RMF) join the ring for the Nexus threat ring.
  const threatLinked = svc.registry.threatLinks.sets.flatMap((s) => [s.sourceFramework, s.targetFramework]).filter((id) => svc.registry.framework(id)?.graph.framework.family !== "threat");
  const ids = [...new Set([...sets.flatMap((s) => [s.sourceFramework, s.targetFramework]), ...threatLinked])].filter((id) => svc.registry.framework(id));
  const enabled = new Set(ws.frameworks.filter((f) => f.enabled).map((f) => f.frameworkId));
  const scores = await Promise.all(ids.map((id) => (enabled.has(id) ? svc.score(ws.id, id) : null)));
  const frameworks: NexusFramework[] = ids.map((id, i) => {
    const index = svc.registry.framework(id)!;
    const depth = BUNDLE_DEPTH[id] ?? 0;
    const score = scores[i];
    const groups = index.graph.nodes
      .filter((n) => n.depth === depth && !n.withdrawn)
      .map((n) => {
        const s = score?.scores.get(n.id);
        return { id: n.id, code: n.code, title: n.title, units: index.assessableUnder(n.id).length, readiness: s && s.total ? s.readiness : null, status: s ? groupStatus(s) : null };
      })
      .filter((g) => g.units > 0);
    return { id, shortName: index.graph.framework.shortName, family: index.graph.framework.family, enabled: enabled.has(id), groups };
  });
  const bundles = new Map<string, NexusBundle>();
  for (const set of sets) {
    for (const m of set.mappings) {
      const a = groupOf(svc, m.source);
      const b = groupOf(svc, m.target);
      if (!a || !b) continue;
      const key = `${set.id}|${a}|${b}`;
      const bundle = bundles.get(key) ?? { a, b, count: 0, setId: set.id, relationships: {} };
      bundle.count++;
      bundle.relationships[m.relationship] = (bundle.relationships[m.relationship] ?? 0) + 1;
      bundles.set(key, bundle);
    }
  }
  return {
    frameworks,
    sets: sets.map((s) => ({
      id: s.id,
      title: s.title,
      authority: s.authority,
      source: s.sourceFramework,
      target: s.targetFramework,
      count: s.mappings.length,
      documentId: s.mappings[0]?.origin.documentId,
      documentTitle: s.mappings[0] ? svc.registry.documentTitle(s.mappings[0].origin.documentId) : undefined,
    })),
    bundles: [...bundles.values()],
  };
}

interface Side {
  id: string;
  code: string;
  title: string;
  framework: string;
  group: string | null;
  current: number | null;
  target: number | null;
  applicable: boolean | null;
  status: Status | null;
}

export async function crosswalkRows(svc: VisuaService, ws: Workspace, opts: { setId?: string; groupId?: string; nodeId?: string; limit?: number }) {
  const sets = svc.registry.crosswalk.sets.filter((s) => !opts.setId || s.id === opts.setId);
  const enabled = new Set(ws.frameworks.filter((f) => f.enabled).map((f) => f.frameworkId));
  const involved = [...new Set(sets.flatMap((s) => [s.sourceFramework, s.targetFramework]))].filter((fw) => enabled.has(fw) && svc.registry.framework(fw));
  const loaded = await Promise.all(involved.map(async (fw) => [fw, await svc.score(ws.id, fw), await svc.store.states.map(ws.id, fw)] as const));
  const scores = new Map(loaded.map(([fw, score]) => [fw, score]));
  const states = new Map(loaded.map(([fw, , map]) => [fw, map]));
  const side = (id: string): Side => {
    const fw = frameworkOf(id);
    const node = svc.registry.node(id);
    const st = states.get(fw)?.get(id);
    return {
      id,
      code: node?.code ?? codeOf(id),
      title: node?.title || node?.text.slice(0, 120) || "",
      framework: fw,
      group: groupOf(svc, id),
      current: st?.current ?? null,
      target: st?.target ?? null,
      applicable: st ? st.applicable : null,
      status: scores.get(fw)?.statuses.get(id)?.status ?? null,
    };
  };
  const rows: { setId: string; authority: string; documentId: string; relationship: MappingRelationship; source: Side; target: Side }[] = [];
  for (const set of sets) {
    for (const m of set.mappings) {
      if (opts.nodeId && m.source !== opts.nodeId && m.target !== opts.nodeId) continue;
      if (opts.groupId) {
        const ga = groupOf(svc, m.source);
        const gb = groupOf(svc, m.target);
        if (ga !== opts.groupId && gb !== opts.groupId) continue;
      }
      rows.push({ setId: set.id, authority: m.origin.authority, documentId: m.origin.documentId, relationship: m.relationship, source: side(m.source), target: side(m.target) });
      if (rows.length >= (opts.limit ?? 2000)) return rows;
    }
  }
  return rows;
}
