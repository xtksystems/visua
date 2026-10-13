import { createHash } from "node:crypto";
import { effectiveEvidenceState, obligationTiming, PRIORITY_WEIGHT, trustCenterPublishes, type CheckResult } from "@visua/core";
import { FRAMEWORK_ORDER } from "@visua/frameworks";
import { SCORE_FORMULA_VERSION } from "./score-history.ts";
import { NotFoundError, type VisuaService } from "./visua.ts";

/** Recorded configurations remain separate; a later target edit cannot erase an old result. */
export function latestMonitoringChecks(checks: readonly CheckResult[], at = new Date()): CheckResult[] {
  const timestamp = at.getTime();
  if (!Number.isFinite(timestamp)) throw new RangeError("Invalid monitoring evaluation time");
  const latest = new Map<string, CheckResult>();
  for (const check of checks) {
    const observed = Date.parse(check.observedAt);
    if (!Number.isFinite(observed) || observed > timestamp) continue;
    const key = JSON.stringify([check.connectorId, check.checkId, check.source?.configHash ?? null]);
    const previous = latest.get(key);
    if (!previous || observed > Date.parse(previous.observedAt) || (observed === Date.parse(previous.observedAt) && check.id > previous.id)) latest.set(key, check);
  }
  return [...latest.values()].sort((a, b) => Date.parse(b.observedAt) - Date.parse(a.observedAt) || a.id.localeCompare(b.id));
}

const opaqueId = (...parts: unknown[]) => createHash("sha256").update(JSON.stringify(parts)).digest("hex");

/** Current recorded metadata evaluated at one instant, not a reconstruction of historical edits. */
export async function publicTrust(svc: VisuaService, slug: string, at = new Date()) {
  if (!Number.isFinite(at.getTime())) throw new RangeError("Invalid trust evaluation time");
  at = new Date(at.getTime());
  const asOf = at.toISOString();
  return svc.store.atomic(async () => {
    const found = await svc.store.workspaces.get(slug);
    if (!found || found.slug !== slug) throw new NotFoundError("Trust center not found");
    await svc.store.lock(`ws:${found.id}`);
    const ws = await svc.workspace(found.id);
    if (ws.slug !== slug || !ws.trustCenter.enabled) throw new NotFoundError("Trust center not found");
    const [states, evidence, tasks, checks, policies] = await Promise.all([
      svc.store.states.list(ws.id), svc.store.evidence.metadataList(ws.id),
      svc.store.tasks.list(ws.id), svc.store.checks.list(ws.id), svc.store.policies.list(ws.id),
    ]);
    const observedChecks = checks.filter(check => Number.isFinite(Date.parse(check.observedAt)) && Date.parse(check.observedAt) <= at.getTime());
    const input = { states, evidence, tasks, checks: observedChecks };
    const stateById = new Map(states.map(state => [state.nodeId, state]));
    const rank = (id: string) => FRAMEWORK_ORDER.indexOf(id) === -1 ? 99 : FRAMEWORK_ORDER.indexOf(id);
    const frameworks = ws.frameworks.filter(setting => setting.enabled).sort((a, b) => rank(a.frameworkId) - rank(b.frameworkId)).flatMap(setting => {
      const index = svc.registry.framework(setting.frameworkId);
      if (!index || !trustCenterPublishes(ws.trustCenter, setting.frameworkId, index.graph.framework.family)) return [];
      const score = svc.scoreOf(index, input, at);
      const units = index.assessable.filter(node => !node.withdrawn);
      const scoped = units.filter(node => score.statuses.get(node.id)?.status !== "not-applicable"
        && (index.graph.framework.family !== "law" || obligationTiming(node, asOf.slice(0, 10)) === "in-force"));
      const denominator = scoped.reduce((sum, node) => sum + PRIORITY_WEIGHT[stateById.get(node.id)?.priority ?? "medium"], 0);
      const covered = scoped.filter(node => evidence.some(item => item.requirementIds.includes(node.id)
        && effectiveEvidenceState(item, evidence, at, node.id).status === "valid")).length;
      return [{
        id: setting.frameworkId, name: index.graph.framework.shortName,
        readiness: denominator ? Math.round(score.overall.readiness * 100) : null,
        evidenceCoverage: scoped.length ? Math.round(covered / scoped.length * 100) : null,
        basis: {
          formulaVersion: SCORE_FORMULA_VERSION, catalogVersion: index.graph.framework.version,
          scope: { assessable: units.length, inScope: scoped.length, upcoming: score.upcoming?.overall.total ?? 0, excluded: units.length - scoped.length - (score.upcoming?.overall.total ?? 0) },
          readiness: { numerator: score.overall.readiness * denominator, denominator },
          evidence: { covered, denominator: scoped.length },
        },
      }];
    });
    return {
      name: ws.name,
      headline: ws.trustCenter.headline?.trim() || `${ws.name} security & compliance`,
      headlineSource: ws.trustCenter.headline?.trim() ? "organization-authored" as const : "template" as const,
      contactEmail: ws.trustCenter.contactEmail,
      asOf,
      basis: {
        scope: "Enabled frameworks selected for publication; only applicable, assessable requirements count. Upcoming and ended statutory obligations do not count toward current readiness.",
        readiness: "100 × sum(priority weight × target completion) / sum(priority weights). Target completion is min(current / target, 1); a zero target contributes 1 only when current is above zero. Priority weights: critical 4, high 3, medium 2, low 1.",
        evidence: "100 × requirements with at least one currently valid, accepted, review-bound evidence item / in-scope requirements. Rejected, withdrawn, future, expired and superseded artifacts do not establish coverage.",
        monitoring: "Latest observation at or before evaluation time for each recorded connector, configuration and check, across all saved history. Different configurations remain separate; observations are not evidence acceptance or a guarantee of current performance.",
        policies: "Titles and versions of approved or published workspace policies. Approval does not establish implementation.",
        time: "Current recorded metadata evaluated at the stated instant; this is not a reconstruction of historical edits. Empty denominators are shown as no applicable requirements.",
      },
      frameworks,
      policies: policies.filter(policy => policy.status === "approved" || policy.status === "published").map(policy => ({ title: policy.title, version: policy.version })),
      monitoring: latestMonitoringChecks(checks, at).map(check => ({
        id: opaqueId(ws.id, check.connectorId, check.checkId, check.source?.configHash ?? null),
        title: check.title, outcome: check.outcome, observedAt: check.observedAt,
        target: `Target ${opaqueId(ws.id, check.connectorId).slice(0, 8)}`,
        configuration: check.source?.configHash ? `Configuration ${opaqueId(ws.id, check.connectorId, check.source.configHash).slice(0, 8)}` : "Configuration not recorded",
      })),
      updatedAt: ws.updatedAt,
    };
  });
}
