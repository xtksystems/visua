import type { LeanNode, UnitState } from "./types.ts";

export const PROFILE_SORTS = ["function", "gap", "current", "target"] as const;
export type ProfileSort = typeof PROFILE_SORTS[number];
export type ProfileTab = "profile" | "tiers";

export function readProfileQuery(params: URLSearchParams): { tab: ProfileTab; sort: ProfileSort; category: string | null } {
  const sort = params.get("sort");
  return {
    tab: params.get("tab") === "tiers" ? "tiers" : "profile",
    sort: PROFILE_SORTS.includes(sort as ProfileSort) ? sort as ProfileSort : "function",
    category: params.get("category") || null,
  };
}

export function writeProfileQuery(params: URLSearchParams, update: { tab?: ProfileTab; sort?: ProfileSort; category?: string | null }): URLSearchParams {
  const next = new URLSearchParams(params);
  if (update.tab !== undefined) update.tab === "profile" ? next.delete("tab") : next.set("tab", update.tab);
  if (update.sort !== undefined) update.sort === "function" ? next.delete("sort") : next.set("sort", update.sort);
  if (update.category !== undefined) update.category ? next.set("category", update.category) : next.delete("category");
  return next;
}

export interface ProfileRequirement {
  node: LeanNode;
  state: UnitState;
}

export interface ProfileCategory {
  node: LeanNode;
  functionNode: LeanNode | undefined;
  requirements: ProfileRequirement[];
  excluded: number;
  unavailable: number;
  current: number | null;
  target: number | null;
  /** Positive difference between the two category means, on the chart's 0–4 scale. */
  gap: number | null;
  belowTarget: number;
}

/** Scope is supplied by the fresh server projection, never inferred from saved applicability alone. */
export function profileCategories(nodes: readonly LeanNode[], units: Record<string, UnitState>, enabled: boolean): ProfileCategory[] {
  const byId = new Map(nodes.map((node) => [node.id, node]));
  return nodes.filter((node) => node.kind === "category").map((node) => {
    const requirements: ProfileRequirement[] = [];
    let excluded = 0;
    let unavailable = 0;
    for (const child of nodes.filter((child) => child.parentId === node.id && child.assessable)) {
      const state = units[child.id];
      if (!enabled) excluded++;
      else if (!state || state.inScope === undefined) unavailable++;
      else if (state.inScope && state.applicable && state.status !== "not-applicable") requirements.push({ node: child, state });
      else excluded++;
    }
    const current = requirements.length && !unavailable ? requirements.reduce((sum, item) => sum + item.state.current, 0) / requirements.length : null;
    const target = requirements.length && !unavailable ? requirements.reduce((sum, item) => sum + item.state.target, 0) / requirements.length : null;
    return {
      node, functionNode: node.parentId ? byId.get(node.parentId) : undefined,
      requirements: requirements.sort((a, b) => a.node.order - b.node.order || a.node.id.localeCompare(b.node.id)),
      excluded, unavailable, current, target,
      gap: current !== null && target !== null ? Math.max(target - current, 0) : null,
      belowTarget: requirements.filter((item) => item.state.current < item.state.target).length,
    };
  });
}

export function sortProfileCategories(rows: readonly ProfileCategory[], sort: ProfileSort): ProfileCategory[] {
  const categoryOrder = (a: ProfileCategory, b: ProfileCategory) => (a.functionNode?.order ?? 0) - (b.functionNode?.order ?? 0)
    || (a.functionNode?.id ?? "").localeCompare(b.functionNode?.id ?? "") || a.node.order - b.node.order || a.node.id.localeCompare(b.node.id);
  return [...rows].sort((a, b) => {
    if (sort === "function") return categoryOrder(a, b);
    const left = a[sort];
    const right = b[sort];
    // An excluded or unavailable category is not a zero and sorts after measured rows.
    if (left === null || right === null) return left === right ? categoryOrder(a, b) : left === null ? 1 : -1;
    return (sort === "current" ? left - right : right - left) || categoryOrder(a, b);
  });
}
