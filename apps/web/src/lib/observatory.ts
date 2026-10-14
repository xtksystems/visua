import type { FrameworkStateBundle, LeanNode, UnitState } from "./types.ts";

export const OUTLINE_PRESETS = ["all", "at-risk", "missing-evidence", "assigned-to-me"] as const;
export type OutlinePreset = typeof OUTLINE_PRESETS[number];
export type OutlineMode = "assessed" | "guide" | "threat";

export const PRESET_LABEL: Record<OutlinePreset, string> = {
  all: "All requirements",
  "at-risk": "At risk",
  "missing-evidence": "Missing evidence",
  "assigned-to-me": "Assigned to me",
};

export function readOutlineQuery(params: URLSearchParams): { preset: OutlinePreset; query: string } {
  const value = params.get("preset");
  return { preset: OUTLINE_PRESETS.includes(value as OutlinePreset) ? value as OutlinePreset : "all", query: params.get("q") ?? "" };
}

/** Filter edits keep the selected node and unrelated route state. */
export function writeOutlineQuery(params: URLSearchParams, update: { preset?: OutlinePreset; query?: string }): URLSearchParams {
  const next = new URLSearchParams(params);
  if (update.preset !== undefined) {
    if (update.preset === "all") next.delete("preset");
    else next.set("preset", update.preset);
  }
  if (update.query !== undefined) {
    if (update.query) next.set("q", update.query);
    else next.delete("q");
  }
  return next;
}

export function outlineMode(frameworkId: string, enabled: readonly string[], threat: boolean): OutlineMode {
  return threat ? "threat" : enabled.includes(frameworkId) ? "assessed" : "guide";
}

export function outlineUserId(identity: { principal: "user" | "token"; user: { id: string } } | null | undefined): string | undefined {
  return identity?.principal === "user" ? identity.user.id : undefined;
}

export function matchesOutlinePreset(node: LeanNode, unit: UnitState | undefined, preset: OutlinePreset, userId?: string): boolean {
  if (!node.assessable || unit?.inScope !== true) return false;
  switch (preset) {
    case "at-risk": return unit.status === "at-risk";
    case "missing-evidence": return unit.evidence === 0;
    case "assigned-to-me": return !!userId && unit.ownerUserId === userId;
    case "all": return true;
  }
}

export interface OutlineResults {
  /** Direct text/preset matches, including navigable groups for All/search. */
  matches: Set<string>;
  /** Matches plus their ancestors and the selected path. Never used for counts. */
  visible: Set<string>;
  context: Set<string>;
  selectedOutside: boolean;
  filtered: boolean;
  /** Only current assessed units count. Null means no current assessment data. */
  count: number | null;
}

export function outlineResults({ nodes, state, mode, preset, query, selectedId, userId }: {
  nodes: readonly LeanNode[];
  state?: FrameworkStateBundle;
  mode: OutlineMode;
  preset: OutlinePreset;
  query: string;
  selectedId: string | null;
  /** Only a signed-in user principal supplies this id; tokens and owner labels do not. */
  userId?: string;
}): OutlineResults {
  const effectivePreset = mode === "assessed" ? preset : "all";
  const text = query.trim().toLocaleLowerCase();
  const filtered = effectivePreset !== "all" || !!text;
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const matches = new Set<string>();
  let count: number | null = mode === "assessed" && state ? 0 : null;
  for (const node of nodes) {
    const textMatch = !text || [node.code, node.title, node.text].some((value) => value.toLocaleLowerCase().includes(text));
    const unit = state?.units[node.id];
    if (!textMatch || (effectivePreset !== "all" && !matchesOutlinePreset(node, unit, effectivePreset, userId))) continue;
    matches.add(node.id);
    if (count !== null && matchesOutlinePreset(node, unit, effectivePreset, userId)) count++;
  }
  const visible = new Set(matches);
  const addPath = (id: string) => {
    let node = byId.get(id);
    const visited = new Set<string>();
    while (node && !visited.has(node.id)) {
      visited.add(node.id);
      visible.add(node.id);
      node = node.parentId ? byId.get(node.parentId) : undefined;
    }
  };
  for (const id of matches) addPath(id);
  if (selectedId) addPath(selectedId);
  return {
    matches, visible,
    context: new Set([...visible].filter((id) => !matches.has(id))),
    selectedOutside: !!selectedId && byId.has(selectedId) && !matches.has(selectedId),
    filtered, count,
  };
}
