/**
 * API view models: lean graphs for the 3D Observatory, full node detail for
 * the inspector, and per-framework state bundles.
 */
import { codeOf, frameworkOf, groupStatus, type FrameworkGraph, type RequirementNode, type Workspace } from "@visua/core";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { CORPUS_DIR, FRAMEWORK_ORDER } from "@visua/frameworks";
import type { VisuaService } from "./visua.ts";

export interface LeanNode {
  id: string;
  code: string;
  kind: string;
  parentId: string | null;
  depth: number;
  order: number;
  title: string;
  text: string;
  assessable: boolean;
  /** Small, UI-relevant attributes only. */
  meta?: Record<string, unknown>;
}

const LEAN_ATTRIBUTE_KEYS = ["baselines", "category", "cosoPrinciple", "level", "party", "label"];

export function leanGraph(graph: FrameworkGraph): { framework: FrameworkGraph["framework"]; nodes: LeanNode[]; profiles?: FrameworkGraph["profiles"] } {
  return {
    framework: graph.framework,
    profiles: graph.profiles,
    nodes: graph.nodes.map((n) => {
      const meta: Record<string, unknown> = {};
      for (const k of LEAN_ATTRIBUTE_KEYS) if (n.attributes?.[k] !== undefined) meta[k] = n.attributes[k];
      if (n.examples?.length) meta["examples"] = n.examples.length;
      return {
        id: n.id,
        code: n.code,
        kind: n.kind,
        parentId: n.parentId,
        depth: n.depth,
        order: n.order,
        title: n.title,
        text: n.text.length > 320 ? `${n.text.slice(0, 319)}…` : n.text,
        assessable: n.assessable,
        meta: Object.keys(meta).length ? meta : undefined,
      };
    }),
  };
}

/** Everything the inspector needs for one requirement. */
export async function nodeDetail(svc: VisuaService, ws: Workspace, node: RequirementNode) {
  const index = svc.registry.framework(node.frameworkId)!;
  const related = svc.registry.crosswalk.related(node.id);
  const under = new Set(index.assessableUnder(node.id).map((n) => n.id));
  const [score, states, allTasks, allEvidence, allChecks, allProposals, recentActivity] = await Promise.all([
    svc.score(ws.id, node.frameworkId),
    svc.store.states.getMany(ws.id, [node.id, ...related.map((e) => e.to)]),
    svc.store.tasks.list(ws.id),
    svc.store.evidence.list(ws.id),
    svc.store.checks.list(ws.id),
    svc.store.proposals.list(ws.id),
    svc.store.activity.recent(ws.id, 400),
  ]);
  const state = node.assessable ? states.get(node.id) : undefined;
  const tasks = allTasks.filter((t) => t.requirementIds.some((id) => id === node.id || under.has(id)));
  const evidence = allEvidence.filter((e) => e.requirementIds.some((id) => id === node.id || under.has(id)));
  const checks = allChecks.filter((c) => c.requirementIds.includes(node.id)).slice(-20);
  const proposals = allProposals.filter((p) => p.nodeIds.includes(node.id)).slice(-20);
  const activity = recentActivity.filter((a) => a.entityId === node.id).slice(0, 20);
  const mappings = related.map((e) => {
    const target = svc.registry.node(e.to);
    const s = states.get(e.to);
    return {
      id: e.to,
      code: codeOf(e.to),
      framework: frameworkOf(e.to),
      title: target?.title ?? "",
      text: target?.text.slice(0, 200) ?? "",
      relationship: e.relationship,
      authority: e.authority,
      current: s?.current,
      target: s?.target,
      applicable: s?.applicable,
    };
  });
  const doc = svc.registry.documents.get(node.citation.documentId);
  return {
    node,
    ancestors: index.ancestors(node.id).map((a) => ({ id: a.id, code: a.code, title: a.title })),
    children: index.childrenOf(node.id).map((c) => ({ id: c.id, code: c.code, title: c.title, text: c.text.slice(0, 160), assessable: c.assessable })),
    state,
    status: score.statuses.get(node.id) ?? null,
    score: score.scores.get(node.id) ?? null,
    groupStatus: !node.assessable && score.scores.get(node.id) ? groupStatus(score.scores.get(node.id)!) : null,
    tasks,
    evidence,
    checks,
    proposals,
    activity,
    mappings,
    source: doc
      ? { id: doc.id, title: doc.title, identifier: doc.identifier, path: doc.path, url: doc.url, page: node.citation.page, locator: node.citation.locator, present: existsSync(resolve(CORPUS_DIR, doc.path)) }
      : null,
    contentNotice: svc.registry.framework(node.frameworkId)?.graph.framework.contentNotice,
  };
}

/** Per-framework state bundle driving the 3D colors, heights and HUD. */
export async function frameworkState(svc: VisuaService, ws: Workspace, frameworkId: string) {
  const [score, states, tasks, evidence] = await Promise.all([
    svc.score(ws.id, frameworkId),
    svc.store.states.list(ws.id, frameworkId),
    svc.store.tasks.list(ws.id),
    svc.store.evidence.list(ws.id),
  ]);
  const openTasks = new Map<string, number>();
  for (const t of tasks) if (t.status !== "done") for (const id of t.requirementIds) openTasks.set(id, (openTasks.get(id) ?? 0) + 1);
  const evidenceCount = new Map<string, number>();
  for (const e of evidence) if (e.status === "accepted") for (const id of e.requirementIds) evidenceCount.set(id, (evidenceCount.get(id) ?? 0) + 1);
  return {
    frameworkId,
    overall: score.overall,
    groups: Object.fromEntries([...score.scores.entries()].map(([id, s]) => [id, { ...s, status: groupStatus(s) }])),
    units: Object.fromEntries(
      states.map((s) => [
        s.nodeId,
        {
          current: s.current,
          target: s.target,
          priority: s.priority,
          applicable: s.applicable,
          owner: s.owner,
          status: score.statuses.get(s.nodeId)?.status ?? "not-started",
          reasons: score.statuses.get(s.nodeId)?.reasons ?? [],
          openTasks: openTasks.get(s.nodeId) ?? 0,
          evidence: evidenceCount.get(s.nodeId) ?? 0,
          mapped: svc.registry.crosswalk.related(s.nodeId).length,
        },
      ]),
    ),
  };
}

export async function workspaceSummary(svc: VisuaService, ws: Workspace) {
  const rank = (id: string) => (FRAMEWORK_ORDER.indexOf(id) === -1 ? 99 : FRAMEWORK_ORDER.indexOf(id));
  const enabled = ws.frameworks.filter((f) => f.enabled && svc.registry.framework(f.frameworkId)).sort((a, b) => rank(a.frameworkId) - rank(b.frameworkId));
  const scores = await Promise.all(enabled.map((f) => svc.score(ws.id, f.frameworkId)));
  const frameworks = enabled.map((f, i) => {
    const index = svc.registry.framework(f.frameworkId)!;
    const s = scores[i]!.overall;
    return {
      id: f.frameworkId,
      shortName: index.graph.framework.shortName,
      family: index.graph.framework.family,
      settings: f,
      readiness: s.readiness,
      gaps: s.gaps,
      total: s.total,
      evidenceCoverage: s.evidenceCoverage,
      verifiedShare: s.verifiedShare,
      counts: s.counts,
    };
  });
  const [tasks, proposals, runs, evidenceTotal, policies] = await Promise.all([
    svc.store.tasks.list(ws.id),
    svc.store.proposals.list(ws.id),
    svc.store.runs.recent(ws.id, 50),
    svc.store.evidence.count(ws.id),
    svc.store.policies.list(ws.id),
  ]);
  const today = new Date().toISOString().slice(0, 10);
  return {
    workspace: ws,
    frameworks,
    tasks: {
      total: tasks.length,
      open: tasks.filter((t) => t.status !== "done").length,
      done: tasks.filter((t) => t.status === "done").length,
      overdue: tasks.filter((t) => t.status !== "done" && t.dueDate && t.dueDate < today).length,
      byStatus: tasks.reduce<Record<string, number>>((acc, t) => ((acc[t.status] = (acc[t.status] ?? 0) + 1), acc), {}),
    },
    evidence: { total: evidenceTotal },
    policies: policies.map((p) => ({ id: p.id, title: p.title, status: p.status, version: p.version })),
    approvals: proposals.filter((p) => p.status === "pending").length,
    agents: { running: runs.filter((r) => r.status === "running" || r.status === "queued").length, recent: runs.length },
  };
}
