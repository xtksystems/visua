/**
 * Crosswalk engine: "do the work once, satisfy many frameworks".
 *
 * Mapping sets come from authoritative sources (NIST CSF 2.0 informative
 * references to SP 800-53 via CPRT/OLIR, AICPA TSC mapping spreadsheets).
 * The engine indexes them bidirectionally and projects implementation
 * progress from one framework onto another with explicit confidence.
 */
import { frameworkOf } from "./graph.ts";
import type { Mapping, MappingRelationship, MappingSet, RequirementState } from "./types.ts";

const INVERSE: Record<MappingRelationship, MappingRelationship> = {
  equivalent: "equivalent",
  "subset-of": "superset-of",
  "superset-of": "subset-of",
  "intersects-with": "intersects-with",
  "related-to": "related-to",
  supports: "related-to",
};

/** How much implementation of the source says about the target (0..1). */
const STRENGTH: Record<MappingRelationship, number> = {
  equivalent: 1,
  "superset-of": 0.9,
  "subset-of": 0.6,
  "intersects-with": 0.5,
  supports: 0.4,
  "related-to": 0.35,
};

export interface Edge {
  from: string;
  to: string;
  relationship: MappingRelationship;
  authority: string;
  mappingSetId: string;
}

export class CrosswalkIndex {
  private readonly out = new Map<string, Edge[]>();
  readonly sets: MappingSet[];

  constructor(sets: MappingSet[]) {
    this.sets = sets;
    for (const set of sets) {
      for (const m of set.mappings) {
        this.add({ from: m.source, to: m.target, relationship: m.relationship, authority: m.origin.authority, mappingSetId: set.id });
        this.add({ from: m.target, to: m.source, relationship: INVERSE[m.relationship], authority: m.origin.authority, mappingSetId: set.id });
      }
    }
  }

  private add(edge: Edge) {
    const list = this.out.get(edge.from);
    if (list) {
      if (!list.some((e) => e.to === edge.to && e.mappingSetId === edge.mappingSetId)) list.push(edge);
    } else this.out.set(edge.from, [edge]);
  }

  /** Direct mappings of a node, optionally restricted to one target framework. */
  related(nodeId: string, targetFramework?: string): Edge[] {
    const edges = this.out.get(nodeId) ?? [];
    return targetFramework ? edges.filter((e) => frameworkOf(e.to) === targetFramework) : edges;
  }

  /** Nodes reachable in up to `depth` hops (e.g. TSC → CSF → SP 800-53). */
  reach(nodeId: string, depth = 2): Map<string, { via: string[]; strength: number }> {
    const result = new Map<string, { via: string[]; strength: number }>();
    // `via` holds the intermediate nodes between the start node and the reached node.
    let frontier: { id: string; via: string[]; strength: number }[] = [{ id: nodeId, via: [], strength: 1 }];
    for (let d = 0; d < depth; d++) {
      const next: typeof frontier = [];
      for (const f of frontier) {
        const via = f.id === nodeId ? [] : [...f.via, f.id];
        for (const e of this.out.get(f.id) ?? []) {
          if (e.to === nodeId) continue;
          const strength = f.strength * STRENGTH[e.relationship];
          const prev = result.get(e.to);
          if (!prev || prev.strength < strength) {
            result.set(e.to, { via, strength });
            next.push({ id: e.to, via, strength });
          }
        }
      }
      frontier = next;
    }
    return result;
  }

  get size(): number {
    let n = 0;
    for (const list of this.out.values()) n += list.length;
    return n / 2;
  }
}

export interface ProjectedLevel {
  nodeId: string;
  /** Suggested level on the target framework's 0–4 scale. */
  suggested: number;
  confidence: "low" | "medium" | "high";
  sources: { nodeId: string; level: number; relationship: MappingRelationship }[];
}

/**
 * Project progress from source requirement states onto target nodes.
 * Uses the strongest-evidence source; confidence reflects relationship types
 * and how many independent sources agree.
 */
export function projectLevels(
  crosswalk: CrosswalkIndex,
  targetNodeIds: string[],
  sourceStates: Map<string, RequirementState>,
): ProjectedLevel[] {
  const out: ProjectedLevel[] = [];
  for (const nodeId of targetNodeIds) {
    const sources: ProjectedLevel["sources"] = [];
    let best = 0;
    let weighted = 0;
    let weights = 0;
    for (const edge of crosswalk.related(nodeId)) {
      const s = sourceStates.get(edge.to);
      if (!s || !s.applicable) continue;
      sources.push({ nodeId: edge.to, level: s.current, relationship: edge.relationship });
      const strength = STRENGTH[edge.relationship];
      best = Math.max(best, s.current * strength);
      weighted += s.current * strength;
      weights += strength;
    }
    if (!sources.length) continue;
    const mean = weights ? weighted / weights : 0;
    const suggested = Math.round(Math.min(4, (best + mean) / 2));
    const strong = sources.filter((s) => STRENGTH[s.relationship] >= 0.9).length;
    const confidence = strong >= 1 && sources.length >= 2 ? "high" : sources.length >= 2 || strong >= 1 ? "medium" : "low";
    out.push({ nodeId, suggested, confidence, sources });
  }
  return out;
}

/** Share of target nodes that have at least one mapping into the source framework. */
export function mappingCoverage(crosswalk: CrosswalkIndex, targetNodeIds: string[], sourceFramework: string): number {
  if (!targetNodeIds.length) return 0;
  const covered = targetNodeIds.filter((id) => crosswalk.related(id, sourceFramework).length > 0).length;
  return covered / targetNodeIds.length;
}

export function mappingsToEdges(set: MappingSet): Mapping[] {
  return set.mappings;
}
