import {
  evidenceCoverageTimeline, evidenceRenewalDates, hasCurrentEvidenceReview, isEvidenceValid, obligationTiming,
  type Evidence, type EvidenceRenewalBucket, type EvidenceRenewalCoverage, type EvidenceRenewalItem,
  type EvidenceRenewalRequirement, type EvidenceRenewalWindow, type Workspace, type WorkspaceEvidenceRenewal,
} from "@visua/core";
import { FRAMEWORK_ORDER } from "@visua/frameworks";
import type { VisuaService } from "./visua.ts";

const compare = (a: string, b: string) => a < b ? -1 : a > b ? 1 : 0;
const rank = (id: string) => {
  const index = FRAMEWORK_ORDER.indexOf(id);
  return index < 0 ? FRAMEWORK_ORDER.length : index;
};
const emptyWindow = (): EvidenceRenewalWindow => ({ evidenceIds: [], uncoveredRequirementIds: [], losingCoverageRequirementIds: [] });

/** A read-only projection of recorded metadata, with scope fixed at the response time. */
export async function workspaceEvidenceRenewal(svc: VisuaService, ws: Workspace, at = new Date()): Promise<WorkspaceEvidenceRenewal> {
  const asOf = at.toISOString();
  const today = asOf.slice(0, 10);
  const [states, evidence] = await Promise.all([svc.store.states.list(ws.id), svc.store.evidence.metadataList(ws.id)]);
  const statesById = new Map(states.map((state) => [state.nodeId, state]));
  const inScope = new Set<string>();
  const enabled = new Set(ws.frameworks.filter((settings) => settings.enabled).map((settings) => settings.frameworkId));
  for (const frameworkId of enabled) {
    const index = svc.registry.framework(frameworkId);
    if (!index || index.graph.framework.family === "threat") continue;
    for (const node of index.assessable) {
      const state = statesById.get(node.id);
      if (state?.applicable === false || state?.userExclusion || state?.statusOverride === "not-applicable") continue;
      if (!svc.scopeOf(ws, node.id).applicable) continue;
      if (index.graph.framework.family === "law" && obligationTiming(node, today) !== "in-force") continue;
      inScope.add(node.id);
    }
  }

  const refs = new Map<string, EvidenceRenewalRequirement>();
  const evidenceByNode = new Map<string, Evidence[]>();
  for (const artifact of evidence) {
    for (const id of new Set(artifact.requirementIds)) {
      const node = svc.registry.node(id);
      const index = node ? svc.registry.framework(node.frameworkId) : undefined;
      if (!node || !index) continue;
      if (!refs.has(id)) refs.set(id, {
        id, code: node.code, title: node.title || node.text,
        frameworkId: index.id, frameworkLabel: index.graph.framework.shortName,
        assessable: node.assessable,
        inScope: node.assessable ? inScope.has(id) : !node.withdrawn && index.assessableUnder(id).some((child) => inScope.has(child.id)),
      });
      if (!inScope.has(id)) continue;
      const linked = evidenceByNode.get(id) ?? [];
      linked.push(artifact);
      evidenceByNode.set(id, linked);
    }
  }
  const compareRequirements = (a: EvidenceRenewalRequirement, b: EvidenceRenewalRequirement) => rank(a.frameworkId) - rank(b.frameworkId) || compare(a.id, b.id);
  const compareIds = (a: string, b: string) => compareRequirements(refs.get(a)!, refs.get(b)!);
  const coverage: EvidenceRenewalCoverage[] = [...evidenceByNode].map(([requirementId, linked]) => ({
    requirementId, ...evidenceCoverageTimeline(linked, at),
  })).sort((a, b) => compareIds(a.requirementId, b.requirementId));
  const coverageById = new Map(coverage.map((value) => [value.requirementId, value]));
  const datesById = new Map(evidence.map((artifact) => [artifact.id, evidenceRenewalDates(artifact, at)]));
  const items: EvidenceRenewalItem[] = evidence.map((artifact) => {
    const dates = datesById.get(artifact.id)!;
    const ids = [...new Set(artifact.requirementIds)];
    const requirements = ids.flatMap((id) => refs.has(id) ? [refs.get(id)!] : []).sort(compareRequirements);
    const direct = requirements.filter((ref) => ref.assessable && ref.inScope);
    const covered = direct.filter((ref) => coverageById.get(ref.id)!.coveredNow);
    return {
      id: artifact.id, title: artifact.title, kind: artifact.kind, source: artifact.source, status: artifact.status,
      acceptanceBound: hasCurrentEvidenceReview(artifact), currentlyValid: isEvidenceValid(artifact, at),
      validity: dates.validity, collectedAt: artifact.collectedAt, validUntil: artifact.validUntil,
      startsAt: dates.startsAt, expiresAt: dates.expiresAt, requirements,
      context: {
        directInScope: direct.length, outOfScope: requirements.filter((ref) => !ref.inScope).length,
        groups: requirements.filter((ref) => !ref.assessable).length, unknown: ids.length - requirements.length,
      },
      currentlyCoveredRequirementIds: covered.map((ref) => ref.id),
      currentlyUncoveredRequirementIds: direct.filter((ref) => !coverageById.get(ref.id)!.coveredNow).map((ref) => ref.id),
      losingCoverageRequirementIds: covered.filter((ref) => coverageById.get(ref.id)!.endingEvidenceIds.includes(artifact.id)).map((ref) => ref.id),
      continuingCoverageRequirementIds: dates.expiresAt === undefined ? [] : covered.filter((ref) => {
        const end = coverageById.get(ref.id)!.coveredThrough;
        return end === undefined || new Date(end).getTime() > new Date(dates.expiresAt!).getTime();
      }).map((ref) => ref.id),
    };
  }).sort((a, b) => compare(a.expiresAt ?? "\uffff", b.expiresAt ?? "\uffff") || compare(a.id, b.id));

  const buckets: Record<EvidenceRenewalBucket, EvidenceRenewalWindow> = { expired: emptyWindow(), next7days: emptyWindow(), next30days: emptyWindow() };
  const unclassified: WorkspaceEvidenceRenewal["unclassified"] = { invalidWindowIds: [], noExpiryIds: [], markedExpiredWithoutDeadlineIds: [] };
  for (const item of items) {
    const dates = datesById.get(item.id)!;
    for (const key of dates.buckets) {
      const bucket = buckets[key];
      bucket.evidenceIds.push(item.id);
      if (key === "expired") bucket.uncoveredRequirementIds.push(...item.currentlyUncoveredRequirementIds);
      else bucket.losingCoverageRequirementIds.push(...item.losingCoverageRequirementIds);
    }
    if (item.validity === "invalid") unclassified.invalidWindowIds.push(item.id);
    else if (item.expiresAt === undefined) unclassified.noExpiryIds.push(item.id);
    if (item.status === "expired" && item.expiresAt === undefined) unclassified.markedExpiredWithoutDeadlineIds.push(item.id);
  }
  for (const bucket of Object.values(buckets)) {
    bucket.uncoveredRequirementIds = [...new Set(bucket.uncoveredRequirementIds)].sort(compareIds);
    bucket.losingCoverageRequirementIds = [...new Set(bucket.losingCoverageRequirementIds)].sort(compareIds);
  }
  return { workspaceId: ws.id, asOf, buckets, items, coverage, unclassified };
}
