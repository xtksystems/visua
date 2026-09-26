/**
 * Published links between threats (MITRE ATLAS, OWASP Top 10s, NIST AI 100-2)
 * and requirements, kept apart from the requirement crosswalk: they say which
 * requirements address a threat, not how far one requirement satisfies another.
 */
import type { CorpusCitation, MappingSet, MappingStatus } from "@visua/core";

export interface ThreatLink {
  /** The node at the other end of the link. */
  nodeId: string;
  /** "out" when the indexed node is the mapping's source. */
  direction: "out" | "in";
  /** The publisher's term, e.g. "mitigates" or "example informative reference". */
  label: string;
  status: MappingStatus;
  strength?: string;
  note?: string;
  authority: string;
  mappingSetId: string;
  citation: CorpusCitation;
}

export class ThreatLinkIndex {
  readonly sets: MappingSet[];
  private readonly byNode = new Map<string, ThreatLink[]>();

  constructor(sets: MappingSet[]) {
    this.sets = sets;
    for (const set of sets) {
      for (const m of set.mappings) {
        const base = {
          label: m.label ?? "related to",
          status: m.status ?? set.status ?? "final",
          ...(m.strength ? { strength: m.strength } : {}),
          ...(m.note ? { note: m.note } : {}),
          authority: m.origin.authority,
          mappingSetId: set.id,
          citation: { documentId: m.origin.documentId, locator: m.origin.locator, page: m.origin.page },
        };
        this.add(m.source, { ...base, nodeId: m.target, direction: "out" });
        this.add(m.target, { ...base, nodeId: m.source, direction: "in" });
      }
    }
  }

  private add(nodeId: string, link: ThreatLink) {
    const list = this.byNode.get(nodeId);
    if (list) list.push(link);
    else this.byNode.set(nodeId, [link]);
  }

  /** Every published link that touches a node, in either direction. */
  of(nodeId: string): ThreatLink[] {
    return this.byNode.get(nodeId) ?? [];
  }

  get size(): number {
    return this.sets.reduce((n, s) => n + s.mappings.length, 0);
  }
}
