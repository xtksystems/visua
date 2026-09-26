import type { FrameworkGraph, RequirementNode } from "./types.ts";

/** Fast, immutable lookups over a framework graph. */
export class FrameworkIndex {
  readonly graph: FrameworkGraph;
  readonly byId = new Map<string, RequirementNode>();
  readonly byCode = new Map<string, RequirementNode>();
  readonly children = new Map<string | null, RequirementNode[]>();
  readonly assessable: RequirementNode[] = [];

  constructor(graph: FrameworkGraph) {
    this.graph = graph;
    for (const node of graph.nodes) {
      this.byId.set(node.id, node);
      this.byCode.set(node.code.toUpperCase(), node);
      const siblings = this.children.get(node.parentId) ?? [];
      siblings.push(node);
      this.children.set(node.parentId, siblings);
      if (node.assessable && !node.withdrawn) this.assessable.push(node);
    }
    for (const list of this.children.values()) list.sort((a, b) => a.order - b.order);
  }

  get id(): string {
    return this.graph.framework.id;
  }

  roots(): RequirementNode[] {
    return this.children.get(null) ?? [];
  }

  childrenOf(id: string): RequirementNode[] {
    return this.children.get(id) ?? [];
  }

  get(idOrCode: string): RequirementNode | undefined {
    return this.byId.get(idOrCode) ?? this.byCode.get(idOrCode.toUpperCase());
  }

  ancestors(id: string): RequirementNode[] {
    const out: RequirementNode[] = [];
    let node = this.byId.get(id);
    while (node?.parentId) {
      const parent = this.byId.get(node.parentId);
      if (!parent) break;
      out.unshift(parent);
      node = parent;
    }
    return out;
  }

  /** All assessable (unit-of-work) descendants of a node, or the node itself. */
  assessableUnder(id: string): RequirementNode[] {
    const node = this.byId.get(id);
    if (!node) return [];
    if (node.assessable && !node.withdrawn) {
      // Assessable nodes may still have assessable children (e.g. 800-53 enhancements).
      return [node, ...this.descendants(id).filter((n) => n.assessable && !n.withdrawn)];
    }
    return this.descendants(id).filter((n) => n.assessable && !n.withdrawn);
  }

  descendants(id: string): RequirementNode[] {
    const out: RequirementNode[] = [];
    const stack = [...this.childrenOf(id)].reverse();
    while (stack.length) {
      const node = stack.pop()!;
      out.push(node);
      const kids = this.childrenOf(node.id);
      for (let i = kids.length - 1; i >= 0; i--) stack.push(kids[i]!);
    }
    return out;
  }

  /** Depth-first traversal in display order. */
  walk(visit: (node: RequirementNode, depth: number) => void): void {
    const recur = (parentId: string | null, depth: number) => {
      for (const node of this.children.get(parentId) ?? []) {
        visit(node, depth);
        recur(node.id, depth + 1);
      }
    };
    recur(null, 0);
  }

  /** Simple scored text search over codes, titles and statements. */
  search(query: string, limit = 20): RequirementNode[] {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const terms = q.split(/\s+/).filter(Boolean);
    const scored: { node: RequirementNode; score: number }[] = [];
    for (const node of this.graph.nodes) {
      const code = node.code.toLowerCase();
      const hay = `${node.title} ${node.text}`.toLowerCase();
      let score = 0;
      if (code === q) score += 100;
      else if (code.startsWith(q)) score += 50;
      for (const term of terms) {
        if (code.includes(term)) score += 10;
        if (node.title.toLowerCase().includes(term)) score += 6;
        if (hay.includes(term)) score += 2;
      }
      if (score > 0) scored.push({ node, score: score - node.depth * 0.1 });
    }
    return scored.sort((a, b) => b.score - a.score).slice(0, limit).map((s) => s.node);
  }
}

export function nodeId(frameworkId: string, code: string): string {
  return `${frameworkId}:${code}`;
}

export function frameworkOf(id: string): string {
  const i = id.lastIndexOf(":");
  return i === -1 ? "" : id.slice(0, i);
}

export function codeOf(id: string): string {
  const i = id.lastIndexOf(":");
  return i === -1 ? id : id.slice(i + 1);
}
