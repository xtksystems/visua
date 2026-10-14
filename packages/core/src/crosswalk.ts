/**
 * Crosswalk engine: "do the work once, satisfy many frameworks".
 *
 * Mapping sets come from authoritative sources (NIST CSF 2.0 informative
 * references to SP 800-53 via CPRT/OLIR, AICPA TSC mapping spreadsheets).
 * The engine indexes them bidirectionally and projects implementation
 * progress from one framework onto another with explicit confidence.
 */
import { LEVEL_SCALES } from "./levels.ts";
import { frameworkOf } from "./graph.ts";
import type { CorpusCitation, FrameworkFamily, Mapping, MappingRelationship, MappingSet, MappingStatus, RequirementState } from "./types.ts";

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
  reverseRelationship: MappingRelationship;
  authority: string;
  mappingSetId: string;
  citation: CorpusCitation;
  status?: MappingStatus;
  strength?: string;
}

export class CrosswalkIndex {
  private readonly out = new Map<string, Edge[]>();
  readonly sets: MappingSet[];

  constructor(sets: MappingSet[]) {
    this.sets = sets;
    for (const set of sets) {
      for (const m of set.mappings) {
        const provenance = { citation: { documentId: m.origin.documentId, locator: m.origin.locator, page: m.origin.page }, status: m.status ?? set.status, strength: m.strength };
        this.add({ ...provenance, from: m.source, to: m.target, relationship: m.relationship, reverseRelationship: INVERSE[m.relationship], authority: m.origin.authority, mappingSetId: set.id });
        this.add({ ...provenance, from: m.target, to: m.source, relationship: INVERSE[m.relationship], reverseRelationship: m.relationship, authority: m.origin.authority, mappingSetId: set.id });
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
  kind: "implementation-projection";
  version: 1;
  targetFamily: Exclude<FrameworkFamily, "threat">;
  /** Conservative suggestion on the target family's scale, never observed evidence. */
  suggested: number;
  confidence: "low" | "medium" | "high";
  reasons: string[];
  sources: {
    nodeId: string;
    family: Exclude<FrameworkFamily, "threat">;
    level: number;
    levelLabel: string;
    projectedLevel: number;
    /** Always source → target, even when the index was traversed in reverse. */
    relationship: MappingRelationship;
    authority: string;
    mappingSetId: string;
    citation: CorpusCitation;
    status?: MappingStatus;
    strength?: string;
  }[];
}

/**
 * Visua's conservative projection convention, not a publisher-endorsed scale conversion.
 * Stages: absent (0), initial/planned (1), designed/partial (2), implemented (3),
 * operating/improving (4), independently assessed/reviewed (5).
 * Mappings alone cannot propose operating, assured, adaptive or legally-met states.
 */
const FAMILY_STAGES: Record<Exclude<FrameworkFamily, "threat">, readonly number[]> = {
  csf: [0, 1, 2, 3, 4], soc2: [0, 2, 3, 4, 5], rmf: [0, 1, 2, 3, 5], ai: [0, 1, 2, 3, 4], law: [0, 1, 2, 3, 5],
};
const PROJECTION_CAP = { csf: 3, soc2: 2, rmf: 3, ai: 3, law: 2 } as const;
const CONFIDENCE = { low: 0, medium: 1, high: 2 } as const;

/** Relationships and recorded publisher status determine confidence; counts never upgrade it. */
export function projectLevels(
  crosswalk: CrosswalkIndex,
  targetNodeIds: string[],
  sourceStates: Map<string, RequirementState>,
  familyFor: (frameworkId: string) => FrameworkFamily | undefined,
): ProjectedLevel[] {
  const out: ProjectedLevel[] = [];
  for (const nodeId of targetNodeIds) {
    const targetFamily = familyFor(frameworkOf(nodeId));
    if (!targetFamily || targetFamily === "threat") continue;
    const sources: ProjectedLevel["sources"] = [];
    const confidences: ProjectedLevel["confidence"][] = [];
    for (const edge of crosswalk.related(nodeId)) {
      if (frameworkOf(edge.to) === frameworkOf(nodeId)) continue;
      const state = sourceStates.get(edge.to);
      const family = familyFor(frameworkOf(edge.to));
      if (!state?.applicable || !family || family === "threat" || !LEVEL_SCALES[family].levels.some(level => level.level === state.current)) continue;
      // The indexed edge runs target → source; its inverse describes the actual projection.
      const relationship = edge.reverseRelationship;
      const publisherStrength = edge.strength === undefined || edge.strength === "primary" ? 1 : edge.strength === "supporting" ? STRENGTH.supports : 0;
      const strength = Math.min(STRENGTH[relationship], publisherStrength);
      const stage = FAMILY_STAGES[family][state.current]! * strength;
      const candidates = LEVEL_SCALES[targetFamily].levels.filter(level => level.level <= PROJECTION_CAP[targetFamily] && FAMILY_STAGES[targetFamily][level.level]! <= stage);
      const projectedLevel = candidates.at(-1)?.level ?? 0;
      const hasAuthority = !!edge.authority.trim() && !!edge.citation.documentId.trim() && !/\b(visua|editorial|unreviewed)\b/i.test(edge.authority);
      const confidence = edge.status === "final" && hasAuthority && strength >= 0.9
        ? relationship === "equivalent" && family === targetFamily ? "high" : "medium" : "low";
      sources.push({ nodeId: edge.to, family, level: state.current, levelLabel: LEVEL_SCALES[family].levels.find(level => level.level === state.current)!.label, projectedLevel, relationship, authority: edge.authority, mappingSetId: edge.mappingSetId, citation: edge.citation, status: edge.status, strength: edge.strength });
      confidences.push(confidence);
    }
    if (!sources.length) continue;
    const ranked = sources.map((source, index) => ({ source, confidence: confidences[index]! }))
      .sort((a, b) => b.source.projectedLevel - a.source.projectedLevel || CONFIDENCE[b.confidence] - CONFIDENCE[a.confidence] || a.source.nodeId.localeCompare(b.source.nodeId));
    const best = ranked[0]!;
    const conflicting = ranked.some(entry => entry.source.projectedLevel < best.source.projectedLevel && CONFIDENCE[entry.confidence] >= CONFIDENCE[best.confidence]);
    const confidence = conflicting ? "low" : best.confidence;
    out.push({ nodeId, kind: "implementation-projection", version: 1, targetFamily, suggested: best.source.projectedLevel, confidence, sources,
      reasons: [
        "Proposed implementation assessment using Visua's conservative family-stage conversion; inspect the target requirement before approval.",
        "A mapping is not observed evidence, accepted proof, an operating-effectiveness test or a legal determination.",
        ...(confidence === "low" ? [conflicting ? "Source projections disagree; human assessment is required." : "Only weak, unpublished-status or editorial mapping support is available; link count does not increase confidence."] : []),
      ],
    });
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
