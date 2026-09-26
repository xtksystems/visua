/**
 * Action planner: turns gaps (target > current) into a prioritized, scheduled
 * plan of tasks. Every task is grounded in official material — CSF 2.0
 * Implementation Examples, SOC 2 points of focus, or SP 800-53 statements /
 * SP 800-53A assessment objectives — and cites where it came from.
 */
import type { FrameworkIndex } from "./graph.ts";
import { PRIORITY_WEIGHT } from "./scoring.ts";
import type { AgentKind, ChecklistItem, Priority, RequirementNode, RequirementState, Task, TaskKind } from "./types.ts";

export interface PlanOptions {
  workspaceId: string;
  startDate: Date;
  /** Hours per week the team can dedicate to compliance work. */
  weeklyCapacityHours: number;
  /** Only plan for these nodes (default: all assessable). */
  nodeIds?: string[];
  /** Skip nodes that already have open tasks. */
  existingTaskNodeIds?: Set<string>;
  maxTasks?: number;
  idFactory: () => string;
  now?: Date;
}

const KIND_RULES: [RegExp, TaskKind][] = [
  [/\b(polic(y|ies))\b/i, "policy"],
  [/\b(train|awareness|educat)/i, "training"],
  [/\b(supplier|third[- ]part|vendor|acquisition|contract)/i, "vendor"],
  [/\b(monitor|detect|log(s|ging)?|alert|anomal)/i, "monitoring"],
  [/\b(assess|test|exercis|audit|review(ed)?|evaluat)/i, "assessment"],
  [/\b(role|responsibilit|authorit|oversight|strategy|mission|leadership|accountab|stakeholder|legal|regulatory)/i, "governance"],
  [/\b(procedure|process|plan(s|ned)?|playbook|runbook)/i, "procedure"],
  [/\b(configur|software|hardware|network|backup|encrypt|access|authenticat|credential|patch|vulnerab|inventor|platform|infrastructure|firmware)/i, "technical"],
];

export function inferTaskKind(text: string): TaskKind {
  for (const [re, kind] of KIND_RULES) if (re.test(text)) return kind;
  return "procedure";
}

const BASE_EFFORT: Record<TaskKind, number> = {
  governance: 6,
  policy: 8,
  procedure: 8,
  technical: 16,
  evidence: 3,
  training: 6,
  assessment: 8,
  vendor: 10,
  monitoring: 12,
};

const AUTOMATION: Partial<Record<TaskKind, { agent: AgentKind; action: string }>> = {
  policy: { agent: "policy-author", action: "draft-policy" },
  governance: { agent: "policy-author", action: "draft-policy" },
  procedure: { agent: "policy-author", action: "draft-procedure" },
  evidence: { agent: "evidence-collector", action: "collect-evidence" },
  assessment: { agent: "assessor", action: "assess-requirement" },
  monitoring: { agent: "evidence-collector", action: "run-checks" },
  technical: { agent: "task-executor", action: "implementation-guide" },
  training: { agent: "task-executor", action: "implementation-guide" },
  vendor: { agent: "task-executor", action: "implementation-guide" },
};

/** Compact a requirement statement into a short task title fragment. */
export function shortStatement(text: string, max = 88): string {
  const clean = text.replace(/\s+/g, " ").trim().replace(/\.$/, "");
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  return `${cut.slice(0, lastSpace > 40 ? lastSpace : max)}…`;
}

/** Checklist items from the node's official material. */
export function checklistFor(node: RequirementNode, idFactory: () => string): ChecklistItem[] {
  const items: string[] = [];
  if (node.examples?.length) items.push(...node.examples.map((e) => e.text));
  const actions = node.attributes?.["suggestedActions"];
  if (!items.length && Array.isArray(actions)) items.push(...(actions as string[]).slice(0, 8));
  const pof = node.attributes?.["pointsOfFocus"];
  if (Array.isArray(pof)) {
    // Point-of-focus titles only: concise checklist items (the full text stays on the requirement).
    for (const p of pof as { title?: string; text?: string }[]) items.push(p.title?.trim() || (p.text ?? ""));
  }
  const objectives = node.attributes?.["objectives"];
  if (!items.length && Array.isArray(objectives)) items.push(...(objectives as string[]).slice(0, 8));
  const statementItems = node.attributes?.["statementItems"];
  if (!items.length && Array.isArray(statementItems)) items.push(...(statementItems as string[]).slice(0, 8));
  if (!items.length) items.push(`Define how ${node.code} is achieved, who owns it, and what evidence proves it.`);
  items.push("Attach evidence and request verification.");
  return items.filter(Boolean).map((text) => ({ id: idFactory(), text, done: false }));
}

function basisFor(node: RequirementNode): string {
  if (node.examples?.length) return "Official Implementation Examples";
  if (node.attributes?.["suggestedActions"]) return "AI RMF Playbook suggested actions";
  if (node.attributes?.["pointsOfFocus"]) return "AICPA points of focus";
  if (node.attributes?.["objectives"]) return "SP 800-53A assessment objectives";
  if (node.attributes?.["statementItems"]) return "SP 800-53 control statement";
  return "Requirement statement";
}

/** Order functions/families so governance-type work is scheduled first. */
function topLevelOrder(index: FrameworkIndex, node: RequirementNode): number {
  const root = index.ancestors(node.id)[0] ?? node;
  if (/^GV/.test(root.code)) return 0;
  return 1 + root.order;
}

export interface PlannedTask extends Omit<Task, "createdAt" | "updatedAt"> {}

export function planTasks(
  index: FrameworkIndex,
  states: Map<string, RequirementState>,
  opts: PlanOptions,
): PlannedTask[] {
  const wanted = opts.nodeIds ? new Set(opts.nodeIds) : null;
  const candidates = index.assessable.filter((node) => {
    if (wanted && !wanted.has(node.id)) return false;
    if (opts.existingTaskNodeIds?.has(node.id)) return false;
    const s = states.get(node.id);
    if (!s || !s.applicable) return false;
    return s.target > s.current;
  });

  candidates.sort((a, b) => {
    const sa = states.get(a.id)!;
    const sb = states.get(b.id)!;
    const wa = PRIORITY_WEIGHT[sa.priority] * (sa.target - sa.current);
    const wb = PRIORITY_WEIGHT[sb.priority] * (sb.target - sb.current);
    if (wb !== wa) return wb - wa;
    const oa = topLevelOrder(index, a);
    const ob = topLevelOrder(index, b);
    if (oa !== ob) return oa - ob;
    return a.order - b.order;
  });

  const limited = opts.maxTasks ? candidates.slice(0, opts.maxTasks) : candidates;
  const tasks: PlannedTask[] = [];
  const hoursPerDay = Math.max(1, opts.weeklyCapacityHours / 5);
  let cursor = new Date(opts.startDate);

  for (const node of limited) {
    const state = states.get(node.id)!;
    const kind = inferTaskKind(`${node.title} ${node.text}`);
    const gap = state.target - state.current;
    const effortHours = Math.round(BASE_EFFORT[kind] * (0.6 + 0.4 * gap));
    const days = Math.max(1, Math.ceil(effortHours / hoursPerDay));
    const start = new Date(cursor);
    const due = addBusinessDays(start, days);
    cursor = addBusinessDays(start, Math.max(1, Math.ceil(days / 2))); // allow overlap: two work streams
    const automation = AUTOMATION[kind];
    const priority: Priority = state.priority;
    tasks.push({
      id: opts.idFactory(),
      workspaceId: opts.workspaceId,
      title: `${node.code} · ${shortStatement(node.title && node.title !== node.code ? node.title : node.text, 72)}`,
      description: node.text,
      kind,
      status: "todo",
      priority,
      requirementIds: [node.id],
      startDate: isoDate(start),
      dueDate: isoDate(due),
      effortHours,
      checklist: checklistFor(node, opts.idFactory),
      dependsOn: [],
      automation: automation ? { ...automation, params: { nodeId: node.id } } : undefined,
      source: { ...node.citation, basis: basisFor(node) },
      targetLevel: state.target,
      origin: "template",
    });
  }

  // Governance policy work unblocks the rest: link non-GV tasks to the GV.PO task when present.
  const policyTask = tasks.find((t) => t.requirementIds.some((id) => /:GV\.PO-01$/.test(id)));
  if (policyTask) {
    for (const t of tasks) {
      if (t === policyTask) continue;
      if (t.kind === "policy" || t.kind === "procedure") t.dependsOn.push(policyTask.id);
    }
  }
  return tasks;
}

export function addBusinessDays(date: Date, days: number): Date {
  const d = new Date(date);
  let added = 0;
  while (added < days) {
    d.setUTCDate(d.getUTCDate() + 1);
    const wd = d.getUTCDay();
    if (wd !== 0 && wd !== 6) added++;
  }
  return d;
}

export function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}
