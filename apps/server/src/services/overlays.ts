/**
 * Overlay views: how a workspace stands against a community profile (the
 * Cyber AI Profile's priorities per focus area) or a control overlay (COSAiS
 * controls in and out of scope), using the framework's own assessment.
 */
import { groupStatus, overlayPriority, type FrameworkOverlay, type Status, type Workspace } from "@visua/core";
import { NotFoundError, type VisuaService } from "./visua.ts";

/** Overlay metadata without entries, for lists and headers. */
export const overlayMeta = (o: FrameworkOverlay) => ({
  id: o.id,
  frameworkId: o.frameworkId,
  kind: o.kind,
  title: o.title,
  shortName: o.shortName,
  identifier: o.identifier,
  documentId: o.documentId,
  status: o.status,
  notice: o.notice,
  published: o.published,
  landingPage: o.landingPage,
  lenses: o.lenses,
  priorityLevels: o.priorityLevels,
  scope: o.scope,
  entries: o.entries.length,
});

/** Legend levels for the Observatory's overlay lens. */
export function overlayLevels(o: FrameworkOverlay): { level: number; label: string }[] {
  if (o.kind === "community-profile") return (o.priorityLevels ?? []).map((p) => ({ level: p.level, label: `${p.level} ${p.label}` }));
  return [
    { level: 1, label: "Annotated in the overlay" },
    { level: 2, label: "Proposed additional control" },
  ];
}

/** The unit's level in the overlay's lens: a profile's priority, or a control overlay's selection. */
export function overlayLevelFor(o: FrameworkOverlay, nodeId: string, lenses: string[]): number | undefined {
  const entry = o.entries.find((e) => e.nodeId === nodeId);
  if (!entry) return undefined;
  if (o.kind === "community-profile") return overlayPriority(entry, lenses);
  return entry.control?.annotated || entry.control?.inSummaryTable ? 1 : 2;
}

export async function overlaySummary(svc: VisuaService, ws: Workspace, overlayId: string) {
  const o = svc.registry.overlay(overlayId);
  if (!o) throw new NotFoundError(`Overlay '${overlayId}' not found`);
  const settings = svc.frameworkSettings(ws, o.frameworkId);
  const adoption = settings?.overlays?.find((a) => a.overlayId === o.id) ?? null;
  const enabled = !!settings?.enabled;
  const [score, states] = enabled ? await Promise.all([svc.score(ws.id, o.frameworkId), svc.store.states.map(ws.id, o.frameworkId)]) : [null, new Map()];
  const unit = (nodeId: string) => {
    const node = svc.registry.node(nodeId);
    const st = states.get(nodeId);
    return {
      nodeId,
      code: node?.code ?? nodeId,
      title: node?.title || node?.text.slice(0, 120) || "",
      applicable: st?.applicable ?? null,
      current: st?.current ?? null,
      target: st?.target ?? null,
      priority: st?.priority ?? null,
      status: (score?.statuses.get(nodeId)?.status ?? null) as Status | null,
    };
  };
  const readinessOf = (ids: string[]) => {
    const inScope = ids.map((id) => states.get(id)).filter((s) => s?.applicable);
    if (!inScope.length) return { readiness: 0, gaps: 0, inScope: 0 };
    const readiness = inScope.reduce((sum, s) => sum + (s!.target > 0 ? Math.min(s!.current / s!.target, 1) : 1), 0) / inScope.length;
    return { readiness, gaps: inScope.filter((s) => s!.target > s!.current).length, inScope: inScope.length };
  };

  if (o.kind === "community-profile") {
    const lenses = (o.lenses ?? []).map((l) => {
      const byPriority = (o.priorityLevels ?? []).map((p) => {
        const ids = o.entries.filter((e) => e.lenses?.[l.id]?.priority === p.level).map((e) => e.nodeId);
        return { level: p.level, label: p.label, count: ids.length, ...readinessOf(ids) };
      });
      return { ...l, selected: adoption?.lenses?.includes(l.id) ?? false, byPriority };
    });
    const followed = adoption?.lenses ?? (o.lenses ?? []).map((l) => l.id);
    const high = o.entries.filter((e) => overlayPriority(e, followed) === 1);
    const gaps = high
      .map((e) => unit(e.nodeId))
      .filter((u) => u.applicable && u.target !== null && u.current !== null && u.target > u.current)
      .sort((a, b) => b.target! - b.current! - (a.target! - a.current!) || a.code.localeCompare(b.code))
      .slice(0, 12);
    const raisable = high.filter((e) => {
      const s = states.get(e.nodeId);
      return s?.applicable && s.priority !== "high" && s.priority !== "critical";
    }).length;
    return { overlay: overlayMeta(o), enabled, adoption, lenses, high: { count: high.length, ...readinessOf(high.map((e) => e.nodeId)) }, gaps, raisable };
  }

  const tailoring = settings?.rmf?.tailoring ?? [];
  const controls = o.entries.map((e) => ({
    ...unit(e.nodeId),
    annotated: !!e.control?.annotated,
    proposedAdditional: !!e.control?.proposedAdditional,
    lifecyclePhases: e.control?.lifecyclePhases ?? [],
    addedByOverlay: tailoring.some((t) => t.nodeId === e.nodeId && t.source === o.id),
    tailoredByPerson: tailoring.find((t) => t.nodeId === e.nodeId && t.source !== o.id)?.action ?? null,
    citation: e.citation,
  }));
  const groups = o.frameworkId && score ? [...new Set(controls.map((c) => svc.registry.framework(o.frameworkId)?.ancestors(c.nodeId)[0]?.id).filter((x): x is string => !!x))] : [];
  return {
    overlay: overlayMeta(o),
    enabled,
    adoption,
    controls,
    ...readinessOf(controls.map((c) => c.nodeId)),
    families: groups.map((g) => ({ id: g, code: svc.registry.node(g)?.code ?? g, status: score?.scores.get(g) ? groupStatus(score.scores.get(g)!) : null })),
  };
}
