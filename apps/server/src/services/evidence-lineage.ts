import { buildSnapshot, deriveStatus, effectiveEvidenceState, normalizeEvidenceDate, type RequirementEvidenceLineage, type Workspace } from "@visua/core";
import { evidenceMetadata } from "./evidence.ts";
import { NotFoundError, ValidationError, type VisuaService } from "./visua.ts";

/** Current recorded metadata evaluated at a stated instant; never fetch artifact bodies. */
export async function requirementEvidenceLineage(svc: VisuaService, ws: Workspace, requirementId: string, instant?: string): Promise<RequirementEvidenceLineage> {
  const node = svc.registry.node(requirementId);
  if (!node || !ws.frameworks.some((f) => f.enabled && f.frameworkId === node.frameworkId)) throw new NotFoundError("Requirement not found in this workspace");
  let at: Date;
  try { at = new Date(instant === undefined ? Date.now() : normalizeEvidenceDate(instant)); }
  catch { throw new ValidationError("Lineage time must be a valid date or ISO timestamp"); }
  const [evidence, states, checks, tasks] = await Promise.all([svc.store.evidence.metadataList(ws.id), svc.store.states.list(ws.id), svc.store.checks.list(ws.id), svc.store.tasks.list(ws.id)]);
  const snapshot = buildSnapshot({ evidence, states, checks, tasks });
  const linked = evidence.filter((e) => e.requirementIds.includes(requirementId));
  const result = deriveStatus({ state: snapshot.states.get(requirementId), evidence: linked, allEvidence: evidence, checks: snapshot.checksByNode.get(requirementId) ?? [], tasks: snapshot.tasksByNode.get(requirementId) ?? [], now: at });
  // Include all explicit ancestors and children so the chain survives partial relinking.
  const ids = new Set(linked.map((e) => e.id));
  let added = true;
  while (added) {
    added = false;
    for (const e of evidence) if ((ids.has(e.id) && e.supersedesId && !ids.has(e.supersedesId)) || (e.supersedesId && ids.has(e.supersedesId) && !ids.has(e.id))) {
      ids.add(e.id); if (e.supersedesId) ids.add(e.supersedesId); added = true;
    }
  }
  return {
    workspaceId: ws.id, requirementId, asOf: at.toISOString(), ...result,
    items: evidence.filter((e) => ids.has(e.id)).sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id)).map((e) => ({
      evidence: evidenceMetadata(e), effective: effectiveEvidenceState(e, evidence, at, requirementId),
      unknowns: [...(!e.provenance ? ["Collection provenance not recorded"] : []), ...(!e.assurance ? ["Assurance scope not recorded"] : []), ...(e.provenance?.check && !e.provenance.check.sourceConfigHash ? ["Original connector target identity not recorded"] : [])],
    })),
  };
}
