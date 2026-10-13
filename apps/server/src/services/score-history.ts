import { createHash } from "node:crypto";
import { buildSnapshot, isEvidenceValid, newId, obligationTiming, PRIORITY_WEIGHT, type FrameworkIndex, type FrameworkScoreObservation, type Priority, type ScoreObservation } from "@visua/core";
import type { VisuaService } from "./visua.ts";

export const SCORE_FORMULA_VERSION = "implementation-evidence-risk-v1";
export const SCORE_CAPTURE_INTERVAL = 24 * 60 * 60_000;
const catalogs = new WeakMap<FrameworkIndex, string>();
const canonical = (value: unknown): unknown => Array.isArray(value) ? value.map(canonical)
  : value && typeof value === "object" ? Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => [key, canonical(item)])) : value;
const fingerprint = (value: unknown) => createHash("sha256").update(JSON.stringify(canonical(value))).digest("hex");
function catalogFingerprint(index: FrameworkIndex): string {
  let value = catalogs.get(index);
  if (!value) { value = fingerprint(index.graph); catalogs.set(index, value); }
  return value;
}

/**
 * One clock, fresh metadata and a workspace lock shared with normal service
 * mutations. The observation and its audit event commit or roll back together.
 */
export async function recordScoreObservation(
  svc: VisuaService, workspaceId: string, actor: string,
  { reason = "manual", clock = () => new Date() }: { reason?: ScoreObservation["reason"]; clock?: () => Date } = {},
): Promise<ScoreObservation | undefined> {
  return svc.store.atomic(async () => {
    const found = await svc.workspace(workspaceId);
    await svc.store.lock(`ws:${found.id}`);
    const ws = await svc.workspace(found.id);
    const at = clock();
    const observedAt = at.toISOString();
    if (reason === "scheduled") {
      const last = await svc.store.scoreHistory.latestScheduledAt(ws.id);
      if (last && at.getTime() - Date.parse(last) < SCORE_CAPTURE_INTERVAL) return undefined;
    }
    const [states, evidence, tasks, checks, revision] = await Promise.all([
      svc.store.states.list(ws.id), svc.store.evidence.metadataList(ws.id),
      svc.store.tasks.list(ws.id), svc.store.checks.list(ws.id), svc.store.workspaces.rev(ws.id),
    ]);
    const input = { states, evidence, tasks, checks };
    const snapshot = buildSnapshot(input);
    const frameworks: FrameworkScoreObservation[] = [];
    for (const id of [...new Set(ws.frameworks.filter(f => f.enabled).map(f => f.frameworkId))].sort()) {
      const index = svc.registry.framework(id);
      if (!index || index.graph.framework.family === "threat") continue;
      const score = svc.scoreOf(index, input, at);
      const units = index.assessable.filter(node => !node.withdrawn);
      const scoped = units.filter(node => score.statuses.get(node.id)?.status !== "not-applicable"
        && (index.graph.framework.family !== "law" || obligationTiming(node, observedAt.slice(0, 10)) === "in-force"));
      const requirements = scoped.map(node => {
        const state = snapshot.states.get(node.id);
        return { id: node.id, target: state?.target ?? 0, priority: state?.priority ?? "medium" as Priority };
      }).sort((a, b) => a.id.localeCompare(b.id));
      let numerator = 0, denominator = 0, covered = 0;
      for (const requirement of requirements) {
        const current = snapshot.states.get(requirement.id)?.current ?? 0;
        const weight = PRIORITY_WEIGHT[requirement.priority];
        numerator += weight * (requirement.target > 0 ? Math.min(current / requirement.target, 1) : current > 0 ? 1 : 0);
        denominator += weight;
        if (snapshot.evidenceByNode.get(requirement.id)?.some(item => isEvidenceValid(item, at))) covered++;
      }
      const count = scoped.length;
      frameworks.push({
        frameworkId: id, label: index.graph.framework.shortName, version: index.graph.framework.version,
        catalogFingerprint: catalogFingerprint(index),
        scopeFingerprint: fingerprint(requirements.map(r => r.id)), targetsFingerprint: fingerprint(requirements),
        scope: { inScope: count, upcoming: score.upcoming?.overall.total ?? 0, excluded: units.length - count - (score.upcoming?.overall.total ?? 0), assessable: units.length, requirementIds: requirements.map(r => r.id) },
        targets: {
          requirements,
          defaultTarget: svc.frameworkSettings(ws, id)?.defaultTarget ?? 3,
          levels: [...new Set(requirements.map(r => r.target))].sort((a, b) => a - b).map(level => ({ level, requirements: requirements.filter(r => r.target === level).length })),
          priorities: (["critical", "high", "medium", "low"] as const).map(priority => ({ priority, requirements: requirements.filter(r => r.priority === priority).length })),
        },
        progress: { numerator, denominator, value: denominator ? numerator / denominator : null },
        evidence: { covered, denominator: count, value: count ? covered / count : null },
        risk: { atRisk: score.overall.counts["at-risk"], denominator: count, value: count ? score.overall.counts["at-risk"] / count : null },
      });
    }
    const observation: ScoreObservation = {
      id: newId("score"), workspaceId: ws.id, observedAt, reason, revision, formulaVersion: SCORE_FORMULA_VERSION, frameworks,
      catalogFingerprint: fingerprint(frameworks.map(f => [f.frameworkId, f.catalogFingerprint])),
      scopeFingerprint: fingerprint(frameworks.map(f => [f.frameworkId, f.scopeFingerprint])),
      targetsFingerprint: fingerprint(frameworks.map(f => [f.frameworkId, f.targetsFingerprint])),
    };
    await svc.store.scoreHistory.append(observation);
    await svc.log(ws.id, actor, "observed", "score-snapshot", observation.id, `Recorded ${reason} score observation for ${frameworks.length} frameworks`, {
      observedAt, reason, revision, formulaVersion: SCORE_FORMULA_VERSION,
      catalogFingerprint: observation.catalogFingerprint, scopeFingerprint: observation.scopeFingerprint, targetsFingerprint: observation.targetsFingerprint,
    });
    return observation;
  });
}

/** Capture only now; a server restart never fills missing historical days. */
export async function captureDueScoreObservations(svc: VisuaService, { clock = () => new Date(), stopped = () => false, onError = (message: string) => console.warn(message) }: {
  clock?: () => Date; stopped?: () => boolean; onError?: (message: string) => void;
} = {}): Promise<void> {
  for (const ws of await svc.store.workspaces.list()) {
    if (stopped()) break;
    try { await recordScoreObservation(svc, ws.id, "system:score-history", { reason: "scheduled", clock }); }
    catch (error) { onError(`[visua] Score observation failed for ${ws.id}: ${(error as Error).message}`); }
  }
}
