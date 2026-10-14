import { normalizeEvidenceDate, type ActivityEvent, type CheckResult, type Evidence, type Policy, type RequirementState, type Task, type Workspace } from "@visua/core";
import { GENESIS } from "../audit.ts";
import { ValidationError, type VisuaService } from "./visua.ts";

export interface ExportSelection {
  frameworkIds?: string[];
  asOf?: string;
  periodStart?: string;
}

/** Current records captured together, evaluated at asOf; never historical replay. */
export interface ExportSnapshot {
  schemaVersion: 1;
  workspace: Workspace;
  revision: number;
  capturedAt: string;
  asOf: string;
  periodStart?: string;
  frameworkIds: string[];
  states: RequirementState[];
  evidence: Evidence[];
  tasks: Task[];
  policies: Policy[];
  checks: CheckResult[];
  /** Complete workspace audit chain, including events outside selected frameworks/period. */
  activity: ActivityEvent[];
  auditCheckpoint: { seq: number; hash: string };
  /** Related records outside assessed scope; missing recorded references stay explicit. */
  dependencies: {
    evidenceIds: string[]; policyIds: string[]; checkIds: string[];
    missing: { kind: "evidence" | "policy" | "check"; id: string; referencedByEvidenceId: string }[];
  };
}

export const EXPORT_SNAPSHOT_BASIS = {
  records: "Current records evaluated at asOf, observed at capturedAt; no historical revision replay.",
  audit: "Complete workspace audit chain through auditCheckpoint; not filtered by framework or period.",
  period: "The requested period labels the review window; current records are retained, not reconstructed or silently filtered by creation date.",
} as const;

function timestamp(value: string, name: string): string {
  // Require seconds and a complete RFC3339 zone; the shared parser also checks
  // real calendar days and rejects nonfinite or out-of-range instants.
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/i.test(value)) {
    throw new ValidationError(`${name} must be a finite RFC3339 timestamp`);
  }
  try { return normalizeEvidenceDate(value.replace(/t/i, "T").replace(/z$/i, "Z")); }
  catch { throw new ValidationError(`${name} must be a finite RFC3339 timestamp`); }
}
const byId = <T extends { id: string }>(values: T[]): T[] => values.sort((a, b) => a.id.localeCompare(b.id));

/** No external blobs, writes, audit append, or revision bump occur during capture. */
export async function captureExportSnapshot(svc: VisuaService, ws: Workspace, selection: ExportSelection = {}): Promise<ExportSnapshot> {
  return svc.store.atomic(async () => {
    await svc.store.lock(`ws:${ws.id}`);
    const workspace = await svc.workspace(ws.id);
    const capturedAt = new Date().toISOString();
    const asOf = selection.asOf === undefined ? capturedAt : timestamp(selection.asOf, "asOf");
    const periodStart = selection.periodStart === undefined ? undefined : timestamp(selection.periodStart, "periodStart");
    if (asOf > capturedAt) throw new ValidationError("asOf cannot be later than capture time");
    if (periodStart !== undefined && periodStart > asOf) throw new ValidationError("periodStart cannot be later than asOf");
    const enabled = workspace.frameworks.filter(f => f.enabled && svc.registry.framework(f.frameworkId)?.graph.framework.family !== "threat"
      && svc.registry.framework(f.frameworkId)?.assessable.length).map(f => f.frameworkId);
    if (selection.frameworkIds !== undefined && (!Array.isArray(selection.frameworkIds) || selection.frameworkIds.some(id => typeof id !== "string" || !enabled.includes(id)))) {
      throw new ValidationError("Select only enabled, assessable frameworks in this workspace");
    }
    const frameworkIds = [...new Set(selection.frameworkIds ?? enabled)].sort();
    if (!frameworkIds.length) throw new ValidationError("Select at least one enabled, assessable framework");
    const requirements = new Set(frameworkIds.flatMap(id => svc.registry.framework(id)!.assessable.map(node => node.id)));
    const intersects = (item: { requirementIds: string[] }) => item.requirementIds.some(id => requirements.has(id));
    // Bound SQL materialization before hydrating any potentially large body or log.
    const tables = ["requirement_states", "evidence", "tasks", "policies", "check_results", "activity"];
    const counts = await svc.store.db().query<{ total: number | string }>(
      `SELECT SUM(n) AS total FROM (${tables.map(table => `SELECT COUNT(*) AS n FROM ${table} WHERE workspace_id = ?`).join(" UNION ALL ")}) AS export_counts`, tables.map(() => workspace.id),
    );
    const [evidenceCount] = await svc.store.db().query<{ total: number | string }>("SELECT COUNT(*) AS total FROM evidence WHERE workspace_id = ?", [workspace.id]);
    const byteLength = svc.store.dialect === "postgres" ? "octet_length(c.data::text)" : "length(CAST(c.data AS BLOB))";
    const [bodySize] = await svc.store.db().query<{ total: number | string | null }>(`SELECT SUM(${byteLength}) AS total FROM evidence_content c JOIN evidence e ON e.id = c.evidence_id WHERE e.workspace_id = ?`, [workspace.id]);
    if (Number(counts[0]?.total ?? 0) > 20_000 || Number(evidenceCount?.total ?? 0) > 1_000 || Number(bodySize?.total ?? 0) > 32 * 1024 * 1024) {
      throw new ValidationError("Export unavailable: workspace exceeds 20,000 records, 1,000 evidence items, or 32 MiB of inline evidence. Reduce export volume; framework selection cannot truncate the complete audit trail.");
    }
    const [revision, states, evidence, tasks, policies, checks, activity] = await Promise.all([
      svc.store.workspaces.rev(workspace.id), svc.store.states.list(workspace.id), svc.store.evidence.list(workspace.id),
      svc.store.tasks.list(workspace.id), svc.store.policies.list(workspace.id), svc.store.checks.list(workspace.id), svc.store.activity.chain(workspace.id),
    ]);
    const selectedEvidenceIds = new Set(evidence.filter(intersects).map(item => item.id));
    const selectedPolicyIds = new Set(policies.filter(intersects).map(item => item.id));
    const selectedCheckIds = new Set(checks.filter(intersects).map(item => item.id));
    const evidenceById = new Map(evidence.map(item => [item.id, item]));
    const successors = new Map<string, string[]>();
    for (const item of evidence) if (item.supersedesId) successors.set(item.supersedesId, [...(successors.get(item.supersedesId) ?? []), item.id]);
    const retained = new Set(selectedEvidenceIds), queue = [...selectedEvidenceIds];
    while (queue.length) {
      const current = queue.pop()!;
      const predecessor = evidenceById.get(current)?.supersedesId;
      for (const related of [...(predecessor ? [predecessor] : []), ...(successors.get(current) ?? [])]) {
        if (evidenceById.has(related) && !retained.has(related)) { retained.add(related); queue.push(related); }
      }
    }
    const keptEvidence = evidence.filter(item => retained.has(item.id));
    const policyIds = new Set(selectedPolicyIds), checkIds = new Set(selectedCheckIds);
    const missing: ExportSnapshot["dependencies"]["missing"] = [];
    const availableEvidence = new Set(evidenceById.keys()), availablePolicies = new Set(policies.map(item => item.id)), availableChecks = new Set(checks.map(item => item.id));
    for (const item of keptEvidence) {
      const refs = [
        { kind: "evidence" as const, id: item.supersedesId, available: availableEvidence },
        { kind: "policy" as const, id: item.provenance?.policy?.id, available: availablePolicies },
        { kind: "check" as const, id: item.provenance?.check?.resultId, available: availableChecks },
      ];
      for (const ref of refs) {
        if (!ref.id) continue;
        if (!ref.available.has(ref.id)) missing.push({ kind: ref.kind, id: ref.id, referencedByEvidenceId: item.id });
        else if (ref.kind === "policy") policyIds.add(ref.id);
        else if (ref.kind === "check") checkIds.add(ref.id);
      }
    }
    activity.sort((a, b) => (a.seq ?? 0) - (b.seq ?? 0) || a.id.localeCompare(b.id));
    const head = activity.at(-1);
    return structuredClone({
      schemaVersion: 1, workspace, revision, capturedAt, asOf, ...(periodStart === undefined ? {} : { periodStart }), frameworkIds,
      states: states.filter(state => requirements.has(state.nodeId)).sort((a, b) => a.nodeId.localeCompare(b.nodeId)),
      evidence: byId(keptEvidence), tasks: byId(tasks.filter(intersects)), policies: byId(policies.filter(item => policyIds.has(item.id))), checks: byId(checks.filter(item => checkIds.has(item.id))),
      dependencies: {
        evidenceIds: [...retained].filter(id => !selectedEvidenceIds.has(id)).sort(),
        policyIds: [...policyIds].filter(id => !selectedPolicyIds.has(id)).sort(),
        checkIds: [...checkIds].filter(id => !selectedCheckIds.has(id)).sort(),
        missing: missing.sort((a, b) => a.kind.localeCompare(b.kind) || a.id.localeCompare(b.id) || a.referencedByEvidenceId.localeCompare(b.referencedByEvidenceId)),
      },
      activity, auditCheckpoint: { seq: head?.seq ?? 0, hash: head?.hash ?? GENESIS },
    });
  });
}
