import { createHash } from "node:crypto";
import type { Proposal, ProposalBatchPreview, ProposalChange, ProposalPreview, ProposalReviewSource, Workspace } from "@visua/core";
import { canonical } from "../audit.ts";
import type { VisuaService } from "./visua.ts";

export class ProposalReviewConflict extends Error {}

type Row = Record<string, unknown>;
type Snapshot = Record<ProposalChange["entityType"], Row[]>;
const row = (value: unknown) => value as Row;
const ids = (value: unknown): string[] => Array.isArray(value) ? value.filter((id): id is string => typeof id === "string") : [];
const hash = (value: unknown) => createHash("sha256").update(canonical(value)).digest("hex");
const identity = (value: Row) => String(value["id"] ?? value["nodeId"]);
const compareId = (a: string, b: string) => a < b ? -1 : a > b ? 1 : 0;
// Database result sets have no semantic order. Canonical JSON intentionally
// preserves arrays inside content, so normalize only these record collections.
const records = (values: unknown[]) => values.map(row).sort((a, b) => compareId(identity(a), identity(b)));

/** Metadata reads only: external artifacts are never fetched by a proposal preview. */
async function snapshot(svc: VisuaService, ws: Workspace): Promise<Snapshot> {
  const [states, tasks, evidence, policies, risks, checks, workspace] = await Promise.all([
    svc.store.states.list(ws.id), svc.store.tasks.list(ws.id), svc.store.evidence.metadataList(ws.id),
    svc.store.policies.list(ws.id), svc.store.risks.list(ws.id), svc.store.checks.list(ws.id), svc.workspace(ws.id),
  ]);
  return {
    requirement: records(states), task: records(tasks), evidence: records(evidence), policy: records(policies),
    risk: records(risks), check: records(checks), workspace: [row(workspace)],
  };
}

/** Remove values generated on approval, naming every omission for the reviewer. */
function project(value: unknown, before: unknown, path: string, generated: string[], narrative: boolean): unknown {
  if (Array.isArray(value)) return value.map((item, i) => project(item, Array.isArray(before) ? before[i] : undefined, `${path}[${i}]`, generated, narrative));
  if (!value || typeof value !== "object") return value;
  const output: Row = {};
  for (const [key, next] of Object.entries(row(value))) {
    if (next === undefined) continue;
    const previous = before && typeof before === "object" ? row(before)[key] : undefined;
    const field = path ? `${path}.${key}` : key;
    const changed = canonical(next) !== canonical(previous);
    const root = !path, review = /^reviewHistory\[\d+\]$/.test(path), checklist = /^checklist\[\d+\]$/.test(path);
    const generatedIdentity = (key === "id" && previous === undefined && (root || review || checklist) && /^(task|ev|pol|risk|chk|rev)_/.test(String(next))) || (root && key === "evidenceId");
    const generatedTime = (root && ["createdAt", "updatedAt", "reviewedAt", "completedAt"].includes(key)) || (review && key === "reviewedAt") || (path === "userExclusion" && key === "at") || (narrative && (root || /^reviewHistory\[\d+\]\.scope$/.test(path)) && ["collectedAt", "validUntil"].includes(key));
    const generatedActor = (root && ["reviewedBy", "updatedBy"].includes(key)) || (review && key === "reviewedBy") || (path === "userExclusion" && key === "by");
    if (changed && (generatedIdentity || generatedTime || generatedActor)) {
      generated.push(field);
      continue;
    }
    output[key] = project(next, previous, field, generated, narrative);
  }
  return output;
}

async function changesBetween(svc: VisuaService, before: Snapshot, after: Snapshot, proposal: Proposal): Promise<ProposalChange[]> {
  const changes: ProposalChange[] = [];
  for (const entityType of Object.keys(after) as (keyof Snapshot)[]) {
    const previous = new Map(before[entityType].map((record) => [identity(record), record]));
    for (let next of after[entityType]) {
      let current = previous.get(identity(next));
      if (canonical(current) === canonical(next)) continue;
      if (entityType === "evidence") {
        // New inline evidence must show the exact content/data being accepted.
        next = row(await svc.store.evidence.get(String(next["id"])));
      }
      const generatedFields: string[] = [];
      const narrative = entityType === "evidence" && proposal.type === "create-evidence" && typeof proposal.payload["checkResultId"] !== "string";
      const projected = row(project(next, current, "", generatedFields, narrative));
      // Existing records display only changed fields. New records display all fields.
      const keys = current ? Object.keys({ ...current, ...projected }).filter((key) => !generatedFields.includes(key) && canonical(current![key]) !== canonical(projected[key])) : Object.keys(projected);
      const proposed = Object.fromEntries(keys.map((key) => [key, projected[key] ?? null]));
      if (narrative) {
        // The exact timestamps are generated at approval, but their reviewed
        // meaning must remain visible when those timestamp fields are omitted.
        const validDays = proposal.payload["validDays"];
        proposed["collectionTime"] = "Recorded when this proposal is approved";
        proposed["validityPeriod"] = typeof validDays === "number" ? `${validDays} ${validDays === 1 ? "day" : "days"} from approval` : "No expiry date";
      }
      if (!keys.length && !generatedFields.length) continue;
      changes.push({
        entityType, ...(current || entityType === "requirement" ? { entityId: identity(next) } : {}),
        label: String(next["title"] ?? next["name"] ?? next["nodeId"] ?? entityType),
        current: current ? Object.fromEntries(keys.map((key) => [key, current![key] ?? null])) : null,
        proposed, generatedFields,
      });
    }
  }
  return changes;
}

/** Run only inside the workspace lock. The savepoint always rolls back, including audit and events. */
export async function buildProposalPreview(svc: VisuaService, ws: Workspace, proposal: Proposal, apply: () => Promise<void>): Promise<ProposalPreview> {
  const before = await snapshot(svc, ws);
  const workspaceRevision = await svc.store.workspaces.rev(ws.id);
  const sources: ProposalReviewSource[] = [];
  const affected = new Set<string>();
  const questions: string[] = [];
  const payload = proposal.payload;
  const addLinks = (value: unknown) => ids(value).forEach((id) => { if (svc.registry.node(id)) affected.add(id); });
  if (["create-task", "update-task", "create-evidence", "create-policy", "create-risk"].includes(proposal.type) && !(proposal.type === "create-evidence" && typeof payload["checkResultId"] === "string")) addLinks(payload["requirementIds"]);
  if (["set-level", "set-target", "set-applicability"].includes(proposal.type) && typeof payload["nodeId"] === "string" && svc.registry.node(payload["nodeId"])) affected.add(payload["nodeId"]);
  const task = before.task.find((record) => record["id"] === payload["taskId"]);
  if (task) addLinks(task["requirementIds"]);
  if (typeof payload["checkResultId"] === "string") {
    const check = before.check.find((record) => record["id"] === payload["checkResultId"]);
    if (check) {
      const connector = await svc.store.connectors.get(String(check["connectorId"]));
      const detail = { ...check, ...(connector?.workspaceId === ws.id ? { connector: { id: connector.id, name: connector.name, kind: connector.kind } } : {}) };
      sources.push({ kind: "check", id: String(check["id"]), label: String(check["title"]), detail });
      addLinks(check["requirementIds"]);
    }
  }
  if (typeof payload["evidenceId"] === "string") {
    const evidence = await svc.store.evidence.get(payload["evidenceId"]);
    if (evidence?.workspaceId === ws.id) {
      const index = before.evidence.findIndex((record) => record["id"] === evidence.id);
      if (index >= 0) before.evidence[index] = row(evidence);
      sources.push({ kind: "evidence", id: evidence.id, label: evidence.title, detail: row(evidence) });
      addLinks(evidence.requirementIds);
    }
  }
  let changes: ProposalChange[] = [];
  let canApprove = proposal.status === "pending";
  if (!canApprove) questions.push(`This proposal is already ${proposal.status}.`);
  else {
    const rollback = new Error("proposal preview rollback");
    try {
      await svc.store.transaction(async () => {
        await apply();
        changes = await changesBetween(svc, before, await snapshot(svc, ws), proposal);
        throw rollback;
      });
    } catch (error) {
      if (error !== rollback) {
        canApprove = false;
        questions.push(error instanceof Error ? error.message : "The proposal cannot currently be applied.");
      }
    }
  }
  for (const change of changes) {
    if (change.entityType === "requirement" && change.entityId) affected.add(change.entityId);
    if (change.entityType === "requirement" && typeof change.proposed["nodeId"] === "string") affected.add(change.proposed["nodeId"]);
    addLinks(change.current?.["requirementIds"]);
    addLinks(change.proposed["requirementIds"]);
  }
  if (proposal.type === "set-rmf") sources.push({ kind: "workspace", id: ws.id, label: "Current RMF settings", detail: row(svc.frameworkSettings(ws, "nist-sp-800-53-r5")?.rmf ?? {}) });
  const citations = [...proposal.citations];
  for (const id of affected) {
    const node = svc.registry.node(id)!;
    const framework = svc.registry.framework(node.frameworkId)!.graph.framework;
    const citation = { ...node.citation, documentTitle: framework.name, quote: "" };
    if (!citations.some((item) => item.documentId === citation.documentId && item.locator === citation.locator && item.page === citation.page)) citations.push(citation);
  }
  if (!sources.some((source) => source.kind === "check" || source.kind === "evidence")) questions.push("No supporting evidence artifact or connector check is attached to this proposal. Confirm the rationale against your records.");
  if (proposal.type === "create-evidence" && typeof payload["checkResultId"] !== "string") questions.push("Confirm that this content records an observed artifact. A plan, guide, or template is not evidence. Collection time and any validity period begin at approval.");
  if (proposal.type === "set-level" || proposal.type === "set-target" || proposal.type === "set-applicability" || proposal.type === "set-rmf") questions.push("Readiness will be recalculated after approval; this preview does not predict a score change or establish compliance.");
  const result = { proposal, workspaceRevision, changes, affectedRequirementIds: [...affected].sort(), citations, sources, unresolvedQuestions: questions, canApprove };
  // Bind the inputs, not generated output IDs/timestamps. A day rollover also
  // invalidates previews containing a dated task note or time-sensitive scope.
  // Member names come from identity storage and can change outside this workspace.
  const members = row(payload["assignee"] ?? {})["type"] === "person" ? (await svc.workspaceMembers(ws.id)).sort((a, b) => compareId(a.id, b.id)) : undefined;
  return { ...result, reviewToken: `proposal-v1:${hash({ tenantId: ws.tenantId, before, proposal, sources, members, workspaceRevision, canApprove, day: new Date().toISOString().slice(0, 10) })}` };
}

/** Overlapping targets are kept pending: independent previews do not imply a safe sequence. */
export function proposalBatchPreview(runId: string, previews: ProposalPreview[], workspaceRevision: number): ProposalBatchPreview {
  const conflicts: ProposalBatchPreview["conflicts"] = [];
  for (let i = 0; i < previews.length; i++) {
    const a = previews[i]!;
    for (const b of previews.slice(i + 1)) {
      const overlap = a.changes.some((left) => left.entityId && b.changes.some((right) => right.entityType === left.entityType && right.entityId === left.entityId));
      // A framework/scope change can invalidate another proposal's validation even
      // when it has no write to the same row (for example creating a linked task).
      const scope = (a.proposal.type === "set-rmf" || b.proposal.type === "set-rmf") && a.affectedRequirementIds.some((id) => b.affectedRequirementIds.includes(id));
      if (overlap || scope) conflicts.push({ proposalIds: [a.proposal.id, b.proposal.id], reason: "These proposals affect the same target. Review and approve them individually, refreshing after each decision." });
    }
  }
  const value = { runId, proposalIds: previews.map((preview) => preview.proposal.id), workspaceRevision, proposals: previews, conflicts };
  return { ...value, reviewToken: `batch-v1:${hash({ runId, proposalIds: value.proposalIds, workspaceRevision, tokens: previews.map((preview) => preview.reviewToken), conflicts })}` };
}
