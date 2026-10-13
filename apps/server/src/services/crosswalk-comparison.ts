/** Complete, read-only mapping counts. Published directions survive display reversal. */
import { codeOf, evidenceRenewalDates, frameworkOf, hasCurrentEvidenceReview, isEvidenceValid, type Workspace } from "@visua/core";
import { z } from "zod";
import { groupOf } from "./crosswalk.ts";
import { NotFoundError, ValidationError, type VisuaService } from "./visua.ts";

const Query = z.object({
  source: z.string().min(1).optional(), target: z.string().min(1).optional(),
  sourceGroup: z.string().min(1).optional(), targetGroup: z.string().min(1).optional(),
  page: z.string().regex(/^[1-9]\d*$/).transform(Number).pipe(z.number().int().max(1_000_000)).optional(),
  pageSize: z.string().regex(/^[1-9]\d*$/).transform(Number).pipe(z.number().int().max(100)).optional(),
  evidence: z.string().min(1).max(200).optional(),
}).strict();

export async function crosswalkComparison(svc: VisuaService, ws: Workspace, query: Record<string, string | undefined>, at = new Date()) {
  const parsed = Query.safeParse(query);
  if (!parsed.success) throw new ValidationError("Invalid comparison filters or pagination");
  const opts = parsed.data;
  const frameworks = svc.registry.frameworks.filter(f => f.family !== "threat").map(f => ({ id: f.id, shortName: f.shortName }));
  const source = opts.source ?? (frameworks.find(f => f.id === "nist-csf-2.0") ?? frameworks[0])?.id;
  const target = opts.target ?? (frameworks.find(f => f.id === "nist-sp-800-53-r5" && f.id !== source) ?? frameworks.find(f => f.id !== source))?.id;
  if (!source || !target || source === target || !frameworks.some(f => f.id === source) || !frameworks.some(f => f.id === target)) {
    throw new ValidationError("Choose two different available requirement frameworks");
  }
  const unresolvedId = (fw: string) => `${fw}:__ungrouped__`;
  const endpoint = (id: string) => {
    const fw = frameworkOf(id);
    // Exact IDs only: a missing endpoint must not resolve to a similarly named code elsewhere.
    const node = svc.registry.framework(fw)?.byId.get(id);
    return { id, code: node?.code ?? codeOf(id), title: node?.title || node?.text.slice(0, 160) || "Unresolved requirement", framework: fw, group: groupOf(svc, id), resolved: !!node };
  };
  const sets = svc.registry.crosswalk.sets.filter(set =>
    (set.sourceFramework === source && set.targetFramework === target) || (set.sourceFramework === target && set.targetFramework === source));
  const rows = sets.flatMap(set => set.mappings.map((m, index) => {
    const originalSource = endpoint(m.source), originalTarget = endpoint(m.target);
    const forward = set.sourceFramework === source;
    const left = forward ? originalSource : originalTarget, right = forward ? originalTarget : originalSource;
    const document = svc.registry.documents.get(m.origin.documentId);
    return {
      id: JSON.stringify([set.id, index]), recordIndex: index, setId: set.id, setTitle: set.title, setAuthority: set.authority,
      relationship: m.relationship, label: m.label, status: m.status ?? set.status ?? null, strength: m.strength, note: m.note,
      origin: { ...m.origin, documentTitle: svc.registry.documentTitle(m.origin.documentId), path: document?.path },
      source: originalSource, target: originalTarget,
      sourceGroup: (left.framework === source ? left.group : null) ?? unresolvedId(source), targetGroup: (right.framework === target ? right.group : null) ?? unresolvedId(target),
    };
  }));
  const groups = (fw: string, side: "sourceGroup" | "targetGroup") => {
    const result = svc.registry.framework(fw)!.graph.nodes.filter(n => groupOf(svc, n.id) === n.id)
      .map(n => ({ id: n.id, code: n.code, title: n.title || n.text.slice(0, 120), total: 0 }));
    if (rows.some(r => r[side] === unresolvedId(fw))) result.push({ id: unresolvedId(fw), code: "Unresolved", title: "Unresolved or ungrouped endpoints", total: 0 });
    const byId = new Map(result.map(group => [group.id, group]));
    for (const row of rows) { const group = byId.get(row[side]); if (group) group.total++; }
    return result;
  };
  const sourceGroups = groups(source, "sourceGroup"), targetGroups = groups(target, "targetGroup");
  if ((opts.sourceGroup && !sourceGroups.some(g => g.id === opts.sourceGroup)) || (opts.targetGroup && !targetGroups.some(g => g.id === opts.targetGroup))) {
    throw new ValidationError("Group filter must belong to its selected framework");
  }
  const cells = new Map<string, { sourceGroup: string; targetGroup: string; count: number }>();
  for (const row of rows) {
    const key = JSON.stringify([row.sourceGroup, row.targetGroup]);
    const cell = cells.get(key) ?? { sourceGroup: row.sourceGroup, targetGroup: row.targetGroup, count: 0 };
    cell.count++; cells.set(key, cell);
  }
  const filtered = rows.filter(row => (!opts.sourceGroup || row.sourceGroup === opts.sourceGroup) && (!opts.targetGroup || row.targetGroup === opts.targetGroup));
  const page = opts.page ?? 1, pageSize = opts.pageSize ?? 50;
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  if (page > pages) throw new ValidationError("Page is outside the selected mapping results");

  // A scoped metadata list both powers the picker and prevents cross-tenant ID disclosure.
  const artifacts = await svc.store.evidence.metadataList(ws.id);
  const artifact = opts.evidence ? artifacts.find(e => e.id === opts.evidence) : undefined;
  if (opts.evidence && !artifact) throw new NotFoundError("Evidence not found");
  const selectedEvidence = artifact ? {
    id: artifact.id, title: artifact.title, status: artifact.status, source: artifact.source,
    acceptanceBound: hasCurrentEvidenceReview(artifact), currentlyValid: isEvidenceValid(artifact, at),
    ...evidenceRenewalDates(artifact, at),
    links: [...new Set(artifact.requirementIds)].map(id => {
      const ref = endpoint(id);
      const node = svc.registry.framework(ref.framework)?.byId.get(id);
      return { ...ref, kind: !node ? "unresolved" as const : node.assessable ? "requirement" as const : "group" as const,
        frameworkLabel: svc.registry.framework(ref.framework)?.graph.framework.shortName ?? ref.framework };
    }),
  } : null;
  return {
    workspaceId: ws.id, asOf: at.toISOString(), frameworks, source, target,
    sourceGroups, targetGroups, cells: [...cells.values()], pairTotal: rows.length,
    unresolvedTotal: rows.filter(row => !row.source.resolved || !row.target.resolved).length,
    ungroupedTotal: rows.filter(row => !row.source.group || !row.target.group).length,
    sets: sets.map(set => ({ id: set.id, title: set.title, authority: set.authority, status: set.status ?? null, source: set.sourceFramework, target: set.targetFramework, count: set.mappings.length })),
    sourceGroup: opts.sourceGroup ?? null, targetGroup: opts.targetGroup ?? null,
    filteredTotal: filtered.length, page, pageSize, pages, rows: filtered.slice((page - 1) * pageSize, page * pageSize),
    evidence: artifacts.map(e => ({ id: e.id, title: e.title })), selectedEvidence,
  };
}
