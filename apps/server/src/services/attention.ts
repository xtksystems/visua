import {
  ATTENTION_KINDS,
  PRIORITY_WEIGHT,
  buildSnapshot,
  evidenceFreshness,
  hasCurrentEvidenceReview,
  isEvidenceValid,
  isTaskOverdue,
  obligationTiming,
  type AttentionItem,
  type AttentionKind,
  type AttentionOwner,
  type AttentionRequirement,
  type CheckResult,
  type Priority,
  type Proposal,
  type RequirementState,
  type Workspace,
  type WorkspaceAttention,
} from "@visua/core";
import { FRAMEWORK_ORDER } from "@visua/frameworks";
import type { VisuaService } from "./visua.ts";

const URGENCY: Record<AttentionKind, number> = {
  "overdue-task": 0,
  "failing-check": 0,
  "expired-evidence": 1,
  "expiring-evidence": 2,
  "evidence-review": 3,
  "proposal-review": 3,
  "implementation-gap": 4,
};
const unassigned = (): AttentionOwner => ({ kind: "unassigned", label: "Unassigned" });
const compare = (a: string, b: string) => a < b ? -1 : a > b ? 1 : 0;
const frameworkRank = (id: string) => {
  const rank = FRAMEWORK_ORDER.indexOf(id);
  return rank === -1 ? FRAMEWORK_ORDER.length : rank;
};

/** Read the complete cross-framework queue at one clock instant, without hydrating artifacts. */
export async function workspaceAttention(svc: VisuaService, ws: Workspace, at = new Date()): Promise<WorkspaceAttention> {
  const asOf = at.toISOString();
  const today = asOf.slice(0, 10);
  const [states, tasks, evidence, checks, proposals, members] = await Promise.all([
    svc.store.states.list(ws.id),
    svc.store.tasks.list(ws.id),
    svc.store.evidence.metadataList(ws.id),
    svc.store.checks.list(ws.id),
    svc.store.proposals.list(ws.id),
    ws.tenantId ? svc.store.identity.memberships.forTenant(ws.tenantId) : [],
  ]);
  const input = { states, tasks, evidence, checks };
  const snapshot = buildSnapshot(input);
  const memberNames = new Map(members.map(({ user }) => [user.id, user.name]));
  const enabledIds = [...new Set(ws.frameworks.filter((f) => f.enabled).map((f) => f.frameworkId))];
  const indexes = enabledIds.flatMap((id) => {
    const index = svc.registry.framework(id);
    return index && index.graph.framework.family !== "threat" ? [index] : [];
  }).sort((a, b) => frameworkRank(a.id) - frameworkRank(b.id) || compare(a.id, b.id));
  const requirements = new Map<string, AttentionRequirement>();
  const enabledFrameworks = indexes.map((index) => {
    // Avoid the hourly score cache: a deadline may have crossed since its last read.
    const score = svc.scoreOf(index, input, at);
    let inScopeRequirements = 0;
    for (const node of index.assessable) {
      const state = snapshot.states.get(node.id);
      if (state?.applicable === false || state?.userExclusion || score.statuses.get(node.id)?.status === "not-applicable") continue;
      if (!svc.scopeOf(ws, node.id).applicable) continue;
      if (index.graph.framework.family === "law" && obligationTiming(node, today) !== "in-force") continue;
      requirements.set(node.id, {
        id: node.id,
        code: node.code,
        title: node.title || node.text,
        frameworkId: index.id,
        frameworkLabel: index.graph.framework.shortName,
        assessable: true,
      });
      inScopeRequirements++;
    }
    return { id: index.id, shortName: index.graph.framework.shortName, family: index.graph.framework.family, inScopeRequirements };
  });

  // A group link remains useful review context, but does not make an artifact
  // evidence for its descendants. Keep these refs separate from assessed units.
  const linkedRefs = new Map(requirements);
  for (const index of indexes) {
    for (const node of index.graph.nodes) {
      if (node.assessable || node.withdrawn || !index.assessableUnder(node.id).some((child) => requirements.has(child.id))) continue;
      linkedRefs.set(node.id, {
        id: node.id, code: node.code, title: node.title || node.text,
        frameworkId: index.id, frameworkLabel: index.graph.framework.shortName, assessable: false,
      });
    }
  }
  const refsFor = (ids: readonly string[]) => [...new Set(ids)].flatMap((id) => {
    const ref = linkedRefs.get(id);
    return ref ? [ref] : [];
  }).sort((a, b) => frameworkRank(a.frameworkId) - frameworkRank(b.frameworkId) || compare(a.id, b.id));
  const memberOwner = (userId: string, previous?: string): AttentionOwner => {
    const name = memberNames.get(userId);
    return name
      ? { kind: "member", label: name, userId }
      : { kind: "unassigned", label: previous ? `Unassigned (previously ${previous})` : "Unassigned" };
  };
  const stateOwner = (state: RequirementState | undefined): AttentionOwner => state?.ownerUserId
    ? memberOwner(state.ownerUserId, state.owner)
    : state?.owner?.trim() ? { kind: "external", label: state.owner } : unassigned();
  const linkedOwner = (refs: AttentionRequirement[]): AttentionOwner => {
    const owners = new Map<string, AttentionOwner>();
    for (const ref of refs) {
      const owner = stateOwner(snapshot.states.get(ref.id));
      owners.set(`${owner.kind}:${owner.userId ?? owner.label}`, owner);
    }
    const all = [...owners.values()];
    if (!all.length) return unassigned();
    if (all.length === 1) return all[0]!;
    return { kind: "multiple", label: all.map((owner) => owner.label).sort(compare).join(" · ") };
  };
  const linkedPriority = (refs: AttentionRequirement[]): Priority => refs.reduce<Priority>((highest, ref) => {
    const priority = snapshot.states.get(ref.id)?.priority ?? "medium";
    return PRIORITY_WEIGHT[priority] > PRIORITY_WEIGHT[highest] ? priority : highest;
  }, refs.length ? "low" : "medium");
  const byId = new Map<string, AttentionItem>();
  const add = (item: Omit<AttentionItem, "scope">) => byId.set(item.id, {
    ...item,
    scope: item.requirements.length ? "requirements" : "workspace",
  });
  const workspaceReason = (refs: AttentionRequirement[]) => refs.length ? "" : " Workspace work; no requirement is linked.";
  const groupEvidenceReason = (refs: AttentionRequirement[]) => refs.some((ref) => !ref.assessable)
    ? " Group links do not imply individual requirement evidence coverage." : "";

  for (const task of tasks) {
    if (!isTaskOverdue(task, at)) continue;
    const refs = refsFor(task.requirementIds);
    if (task.requirementIds.length && !refs.length) continue;
    const assignee = task.assignee;
    const owner = !assignee ? unassigned() : assignee.type === "person"
      ? memberOwner(assignee.id, assignee.name)
      : { kind: assignee.type, label: assignee.name } as AttentionOwner;
    add({
      id: `overdue-task:${task.id}`, kind: "overdue-task", title: task.title,
      reason: `Task is ${task.status}; due ${task.dueDate}${/^\d{4}-\d{2}-\d{2}$/.test(task.dueDate!) ? " (UTC day)" : ""}.${workspaceReason(refs)}`,
      priority: task.priority, requirements: refs, owner, dueAt: task.dueDate,
      action: { type: "task", id: task.id, label: "Open task" },
    });
  }

  // Reuse scoring's latest-per-(connector, check, requirement) selection. A later
  // passing result may supersede only some links of an older multi-link failure.
  const failing = new Map<string, { check: CheckResult; ids: string[] }>();
  for (const id of requirements.keys()) {
    for (const check of snapshot.checksByNode.get(id) ?? []) {
      if (check.outcome !== "fail") continue;
      const entry = failing.get(check.id) ?? { check, ids: [] };
      entry.ids.push(id);
      failing.set(check.id, entry);
    }
  }
  const unlinkedChecks = new Map<string, CheckResult>();
  for (const check of checks) {
    if (check.requirementIds.length) continue;
    const key = JSON.stringify([check.connectorId, check.checkId]);
    const previous = unlinkedChecks.get(key);
    if (!previous || previous.observedAt < check.observedAt) unlinkedChecks.set(key, check);
  }
  for (const check of unlinkedChecks.values()) if (check.outcome === "fail") failing.set(check.id, { check, ids: [] });
  for (const { check, ids } of failing.values()) {
    const refs = refsFor(ids);
    add({
      id: `failing-check:${check.id}`, kind: "failing-check", title: check.title,
      reason: `Latest monitoring result failed at ${check.observedAt}.${check.detail ? ` ${check.detail}` : ""}${workspaceReason(refs)}`,
      priority: linkedPriority(refs), requirements: refs, owner: linkedOwner(refs),
      action: { type: "check", id: check.id, label: "Inspect check" },
    });
  }

  for (const artifact of evidence) {
    const refs = refsFor(artifact.requirementIds);
    if (artifact.requirementIds.length && !refs.length) continue;
    const freshness = evidenceFreshness(artifact, at);
    if (artifact.status === "pending-review" || (artifact.status === "accepted" && !hasCurrentEvidenceReview(artifact))) {
      add({
        id: `evidence-review:${artifact.id}`, kind: "evidence-review", title: artifact.title,
        reason: `${artifact.status === "pending-review" ? "Evidence is awaiting a human review." : "Evidence has no acceptance bound to its current artifact and links."}${freshness === "expired" ? " Its artifact validity window has expired." : ""}${groupEvidenceReason(refs)}${workspaceReason(refs)}`,
        priority: linkedPriority(refs), requirements: refs,
        owner: { kind: "approver", label: "Evidence approver" },
        action: { type: "evidence", id: artifact.id, label: "Review evidence" },
      });
      continue;
    }
    if (artifact.status === "rejected" || (freshness !== "expired" && freshness !== "expiring")) continue;
    const assessedRefs = refs.filter((ref) => ref.assessable);
    const alternatives = assessedRefs.filter((ref) => (snapshot.evidenceByNode.get(ref.id) ?? []).some((other) => other.id !== artifact.id && isEvidenceValid(other, at))).length;
    const coverage = !assessedRefs.length ? "" : alternatives === assessedRefs.length
      ? " All affected requirements currently have other valid accepted evidence."
      : alternatives > 0 ? ` ${alternatives} of ${assessedRefs.length} affected requirements currently have other valid accepted evidence.`
        : " No other valid accepted evidence is linked to the affected requirements.";
    const kind = freshness === "expired" ? "expired-evidence" : "expiring-evidence";
    add({
      id: `${kind}:${artifact.id}`, kind, title: artifact.title,
      reason: `Artifact ${freshness === "expired" ? "expired" : "expires within 30 days"}${artifact.validUntil ? ` (${artifact.validUntil})` : ""}.${coverage}${groupEvidenceReason(refs)}${workspaceReason(refs)}`,
      priority: linkedPriority(refs), requirements: refs, owner: linkedOwner(refs), dueAt: artifact.validUntil,
      action: { type: "evidence", id: artifact.id, label: "Inspect evidence" },
    });
  }

  const tasksById = new Map(tasks.map((task) => [task.id, task]));
  const evidenceById = new Map(evidence.map((artifact) => [artifact.id, artifact]));
  const checksById = new Map(checks.map((check) => [check.id, check]));
  const proposalLinks = (proposal: Proposal): string[] => {
    const payload = proposal.payload;
    // Target entity links survive proposals whose display-only nodeIds are empty.
    const ids = [...proposal.nodeIds];
    if (typeof payload["nodeId"] === "string") ids.push(payload["nodeId"]);
    if (Array.isArray(payload["requirementIds"])) ids.push(...payload["requirementIds"].filter((id): id is string => typeof id === "string"));
    if (typeof payload["taskId"] === "string") ids.push(...(tasksById.get(payload["taskId"])?.requirementIds ?? []));
    if (typeof payload["evidenceId"] === "string") ids.push(...(evidenceById.get(payload["evidenceId"])?.requirementIds ?? []));
    if (typeof payload["checkResultId"] === "string") ids.push(...(checksById.get(payload["checkResultId"])?.requirementIds ?? []));
    return ids;
  };
  for (const proposal of proposals) {
    if (proposal.status !== "pending") continue;
    const ids = proposalLinks(proposal);
    const refs = refsFor(ids);
    if (ids.length && !refs.length) continue;
    add({
      id: `proposal-review:${proposal.id}`, kind: "proposal-review", title: proposal.title,
      reason: `Proposed ${proposal.type.replaceAll("-", " ")} awaits approval.${proposal.rationale ? ` ${proposal.rationale}` : ""}${proposal.type === "create-evidence" || proposal.type === "review-evidence" ? groupEvidenceReason(refs) : ""}${workspaceReason(refs)}`,
      priority: linkedPriority(refs), requirements: refs,
      owner: { kind: "approver", label: "Proposal approver" },
      action: { type: "proposal", id: proposal.id, runId: proposal.runId, label: "Review proposal" },
    });
  }

  for (const ref of requirements.values()) {
    const state = snapshot.states.get(ref.id);
    const current = state?.current ?? 0, target = state?.target ?? 0;
    if (current >= target) continue;
    add({
      id: `implementation-gap:${ref.id}`, kind: "implementation-gap", title: ref.title,
      reason: `${ref.code} is at implementation level ${current} of target ${target}.`,
      priority: state?.priority ?? "medium", requirements: [ref], owner: stateOwner(state), dueAt: state?.dueDate,
      action: { type: "requirement", id: ref.id, frameworkId: ref.frameworkId, label: "Assess requirement" },
    });
  }

  const dueOrder = (item: AttentionItem) => item.dueAt && /^\d{4}-\d{2}-\d{2}$/.test(item.dueAt)
    ? `${item.dueAt}T23:59:59.999Z` : item.dueAt ?? "\uffff";
  const items = [...byId.values()].sort((a, b) => URGENCY[a.kind] - URGENCY[b.kind]
    || PRIORITY_WEIGHT[b.priority] - PRIORITY_WEIGHT[a.priority]
    || compare(dueOrder(a), dueOrder(b)) || compare(a.id, b.id));
  const byKind = Object.fromEntries(ATTENTION_KINDS.map((kind) => [kind, 0])) as Record<AttentionKind, number>;
  const affected = new Set<string>();
  for (const item of items) {
    byKind[item.kind]++;
    for (const ref of item.requirements) if (ref.assessable) affected.add(ref.id);
  }
  return { workspaceId: ws.id, asOf, enabledFrameworks, counts: { total: items.length, affectedRequirements: affected.size, byKind }, items };
}
