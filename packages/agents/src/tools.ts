/**
 * Agent tools shared by the Claude runtime and the offline playbooks.
 * Read tools return compact JSON; write tools only *propose* changes.
 */
import { z } from "zod";
import {
  LEVEL_SCALES,
  STATUSES,
  codeOf,
  frameworkOf,
  isEvidenceValid,
  levelLabel,
  obligationTiming,
  type Citation,
  type FrameworkFamily,
  type RequirementNode,
  type Task,
} from "@visua/core";
import { STATUS_RANK, coverageGroup, threatPaths, type SearchHit } from "@visua/frameworks";
import type { AgentHost } from "./host.ts";
import { licensedTextToModel, WITHHELD_NOTICE } from "./mode.ts";

export interface AgentTool<S extends z.ZodType = z.ZodType> {
  name: string;
  description: string;
  schema: S;
  /** Tools that change state (via proposals) — used to label steps. */
  writes?: boolean;
  run(host: AgentHost, input: z.infer<S>): Promise<unknown>;
}

const defineTool = <S extends z.ZodType>(tool: AgentTool<S>): AgentTool<S> => tool;

const Level = z.number().int().min(0).max(4);
const CitationInput = z.object({
  documentId: z.string().describe("Corpus document id returned by search_corpus"),
  page: z.number().int().optional(),
  locator: z.string().optional(),
  quote: z.string().describe("Short verbatim quote from the corpus passage"),
});

export function hitToCitation(hit: SearchHit): Citation {
  return {
    documentId: hit.chunk.documentId,
    documentTitle: hit.chunk.documentTitle,
    locator: hit.chunk.locator,
    page: hit.chunk.page,
    quote: hit.quote,
  };
}

function normalizeCitations(host: AgentHost, input: z.infer<typeof CitationInput>[] | undefined): Citation[] {
  return (input ?? [])
    .filter((c) => host.registry.documents.has(c.documentId))
    .map((c) => ({
      documentId: c.documentId,
      documentTitle: host.registry.documentTitle(c.documentId),
      page: c.page,
      locator: c.locator,
      quote: c.quote.slice(0, 600),
    }));
}

function familyOf(host: AgentHost, nodeId: string): FrameworkFamily {
  return host.registry.framework(frameworkOf(nodeId))?.graph.framework.family ?? "csf";
}

/**
 * A node by id or code. OWASP entries are also found by their edition-qualified keys:
 * "LLM04:2026" is the current entry LLM04, "LLM03:2025" the superseded LLM03-2025.
 */
export function resolveNode(host: AgentHost, idOrCode: string): RequirementNode | undefined {
  const code = idOrCode.trim();
  const found = host.registry.node(code);
  if (found) return found;
  const edition = /^((?:LLM|ASI)\d{2}):(20\d{2})$/i.exec(code);
  if (!edition) return undefined;
  const current = host.registry.node(edition[1]!.toUpperCase());
  const key = `${edition[1]!.toUpperCase()}:${edition[2]}`;
  return current?.attributes?.["key"] === key ? current : host.registry.node(`${edition[1]!.toUpperCase()}-${edition[2]}`);
}

/** The corpus that holds a framework's official text (from the documents it was ingested from). */
export function corpusOf(host: AgentHost, frameworkId: string): string | undefined {
  const sources = host.registry.framework(frameworkId)?.graph.framework.sources ?? [];
  for (const s of sources) {
    const corpus = host.registry.documents.get(s.documentId)?.framework;
    if (corpus) return corpus;
  }
  return undefined;
}

/** Threat catalogs (ATLAS, OWASP, NIST AI 100-2) are views: never assessed, planned or linked as requirements. */
export function isThreat(host: AgentHost, nodeId: string): boolean {
  return familyOf(host, nodeId) === "threat";
}

export function frameworkEnabled(host: AgentHost, frameworkId: string): boolean {
  return host.workspace().frameworks.some((f) => f.frameworkId === frameworkId && f.enabled);
}

/**
 * What an agent may say about a threat: its description, related threats, and the
 * requirements publishers link to it, grouped by publication with each group's status,
 * and the workspace's levels on them. Threats themselves are never assessed.
 */
/** A threat's code as its catalog writes it (OWASP entries carry their edition: LLM03:2025). */
const threatCode = (host: AgentHost, id: string): string => {
  const n = host.registry.node(id);
  return n ? String(n.attributes?.["key"] ?? n.code) : codeOf(id);
};

export function threatBrief(host: AgentHost, node: RequirementNode) {
  const g = threatPaths(host.registry);
  const enabled = new Set(host.workspace().frameworks.filter((f) => f.enabled).map((f) => f.frameworkId));
  const groups = new Map<string, { publication: string; status: string; requirements: Map<string, { via?: string; group?: string }> }>();
  for (const [reqId, paths] of g.forward.get(node.id) ?? []) {
    for (const p of paths) {
      const { publication } = coverageGroup(p, reqId);
      const group = groups.get(publication) ?? { publication, status: p.status, requirements: new Map() };
      if (STATUS_RANK[p.status] < STATUS_RANK[group.status as keyof typeof STATUS_RANK]) group.status = p.status;
      if (!group.requirements.has(reqId)) group.requirements.set(reqId, { ...(p.via ? { via: threatCode(host, p.via) } : {}), ...(p.group ? { group: p.group } : {}) });
      groups.set(publication, group);
    }
  }
  const linked = [...groups.values()]
    .sort((a, b) => STATUS_RANK[b.status as keyof typeof STATUS_RANK] - STATUS_RANK[a.status as keyof typeof STATUS_RANK] || b.requirements.size - a.requirements.size)
    .map((group) => {
      const reqs = [...group.requirements].map(([id, how]) => {
        const req = host.registry.node(id);
        const s = host.state(id);
        const inScope = enabled.has(frameworkOf(id)) && !!s?.applicable;
        return { id, code: codeOf(id), framework: frameworkOf(id), text: req ? short(modelText(req), 110) : "", ...how, inScope, current: s?.current, target: s?.target };
      });
      const inScope = reqs.filter((r) => r.inScope);
      return {
        publication: group.publication,
        status: group.status,
        requirements: reqs.length,
        inYourFrameworks: inScope.length,
        atTarget: inScope.filter((r) => (r.target ?? 0) > 0 && (r.current ?? 0) >= (r.target ?? 0)).length,
        examples: [...inScope, ...reqs.filter((r) => !r.inScope)].slice(0, 12),
      };
    });
  const related = host.registry.threatLinks
    .of(node.id)
    .filter((l) => g.isThreat(l.nodeId))
    .slice(0, 20)
    .map((l) => ({ code: threatCode(host, l.nodeId), title: host.registry.node(l.nodeId)?.title ?? "", label: l.label, status: l.status, authority: l.authority }));
  const a = node.attributes ?? {};
  return {
    id: node.id,
    code: String(a["key"] ?? node.code),
    kind: node.kind,
    catalog: host.registry.framework(node.frameworkId)?.graph.framework.shortName,
    title: node.title,
    text: short(node.text, 1400),
    tactics: a["tactics"],
    maturity: a["maturity"],
    related,
    linkedRequirements: linked,
    note: "Threats are never assessed. Coverage comes from the requirements publishers link to the threat; every link keeps its publisher and status (final, draft, unreviewed, superseded). Work on the linked requirements, not on the threat.",
    citation: node.citation,
  };
}

/** What an agent may say about a state AI law or one of its obligations, with the workspace's scoping decision. */
export function lawBrief(host: AgentHost, node: RequirementNode) {
  const index = host.registry.framework(node.frameworkId)!;
  const law = node.kind === "law" ? node : node.parentId ? index.byId.get(node.parentId) : undefined;
  const la = law?.attributes ?? {};
  const lawId = String(la["lawId"] ?? "");
  const decision = host.workspace().frameworks.find((f) => f.frameworkId === node.frameworkId)?.law?.applicability[lawId];
  const today = new Date().toISOString().slice(0, 10);
  const obligations = law ? index.childrenOf(law.id) : [];
  const s = node.assessable ? host.state(node.id) : undefined;
  return {
    id: node.id,
    code: node.code,
    kind: node.kind,
    title: node.title,
    text: short(node.text, 1400),
    law: law ? { code: law.code, title: law.title, status: la["status"], statusNote: la["statusNote"] ? short(String(la["statusNote"]), 600) : undefined, effective: la["effective"], sunset: la["sunset"] } : undefined,
    roles: node.kind === "law" ? [...new Set(obligations.flatMap((o) => (o.attributes?.["roles"] as string[] | undefined) ?? []))] : node.attributes?.["roles"],
    // The law's own definitions of those roles, so the organization can decide which it holds.
    definitions: ((la["appliesTo"] as { role: string; condition?: string }[] | undefined) ?? [])
      .filter((a) => node.kind === "law" || ((node.attributes?.["roles"] as string[] | undefined) ?? []).includes(a.role))
      .map((a) => ({ role: a.role, definition: short(a.condition ?? "", 500) })),
    obligations: node.kind === "law" ? obligations.map((o) => ({ code: o.code, title: o.title, roles: o.attributes?.["roles"], effective: o.attributes?.["effective"] })).slice(0, 30) : undefined,
    effective: node.attributes?.["effective"],
    until: node.attributes?.["until"],
    timing: node.assessable ? obligationTiming(node, today) : undefined,
    section: node.attributes?.["section"],
    yourRoles: decision?.roles ?? null,
    assessment: s ? { applicable: s.applicable, current: s.current, target: s.target, applicabilityRationale: s.applicabilityRationale } : null,
    note: "Obligations are quoted from the enacted statute or adopted regulation. They are in scope only for the roles the organization records under each law's own definitions. This is tracking, not legal advice.",
    citation: node.citation,
  };
}

/** Why this node cannot take an assessment proposal in this workspace, if it cannot. */
function cannotAssess(host: AgentHost, node: RequirementNode | undefined, asked: string, levels: boolean): string | undefined {
  if (!node || !node.assessable) return `'${asked}' is not an assessable requirement`;
  const fw = host.registry.framework(node.frameworkId)!.graph.framework;
  if (fw.family === "threat") return `${node.code} is a threat in ${fw.shortName}: threats are never assessed. Propose changes to the requirements linked to it instead (get_requirement lists them).`;
  if (!frameworkEnabled(host, node.frameworkId)) return `${fw.shortName} is not enabled in this workspace`;
  const s = host.state(node.id);
  if (levels && s && !s.applicable) return `${node.code} is out of scope (${s.applicabilityRationale ?? "not applicable"}): levels apply only to requirements in scope`;
  return undefined;
}

/** Requirements a task, policy or evidence item may link to: known nodes that are not threats. */
function linkable(host: AgentHost, ids: string[]): { nodes: RequirementNode[]; error?: string } {
  const nodes = ids.map((id) => resolveNode(host, id)).filter((n): n is RequirementNode => !!n);
  const threats = nodes.filter((n) => isThreat(host, n.id));
  if (threats.length) return { nodes: [], error: `${threats.map((n) => n.code).join(", ")} ${threats.length > 1 ? "are threats" : "is a threat"}, not requirements: link the requirements that address ${threats.length > 1 ? "them" : "it"} instead (get_requirement on a threat lists them).` };
  return { nodes };
}

function short(text: string, n = 180): string {
  const t = text.replace(/\s+/g, " ").trim();
  return t.length > n ? `${t.slice(0, n - 1)}…` : t;
}

/** Requirement text as it may be sent to the model (licensed AICPA text is withheld unless permitted). */
export function modelText(node: RequirementNode): string {
  if (node.attributes?.["licensed"] === true && !licensedTextToModel()) return `${node.title}. ${String(node.attributes["summary"] ?? "")} ${WITHHELD_NOTICE}`;
  return node.text;
}

/**
 * A task as it may be sent to the model. Tasks planned from licensed AICPA criteria carry
 * the criterion text (description) and point-of-focus titles (checklist): they are
 * withheld like the criteria themselves, unless the operator declared permission.
 */
export function modelTask<T extends Pick<Task, "title" | "description" | "checklist" | "requirementIds" | "contentRequirementIds" | "source">>(host: AgentHost, task: T): T {
  if (licensedTextToModel()) return task;
  const withheld: [string, string][] = [];
  const sourceDocument = task.source ? host.registry.documents.get(task.source.documentId) : undefined;
  const licensedSource = sourceDocument?.framework === "aicpa-soc2";
  let sourceTextAvailable = false;
  for (const id of new Set([...task.requirementIds, ...(task.contentRequirementIds ?? [])])) {
    const node = host.registry.node(id);
    if (node?.attributes?.["licensed"] !== true) continue;
    if (task.source?.locator && node.citation.documentId === task.source.documentId && node.citation.locator === task.source.locator
      && (task.source.page === undefined || node.citation.page === task.source.page)) sourceTextAvailable = true;
    withheld.push([node.text.trim(), `[${node.code}: ${String(node.attributes["summary"] ?? node.title)} (AICPA text withheld)]`]);
    for (const p of (node.attributes["pointsOfFocus"] as { title?: string; text?: string }[] | undefined) ?? []) {
      for (const t of [p.text, p.title]) if (t?.trim()) withheld.push([t.trim(), "[AICPA point of focus withheld]"]);
    }
  }
  // Legacy tasks can predate provenance tracking or outlive the locally licensed
  // nodes. Without the original fragments, the source still requires withholding.
  if (licensedSource && !sourceTextAvailable) return {
    ...task, title: "[AICPA task text withheld]", description: WITHHELD_NOTICE,
    checklist: task.checklist.map((item) => ({ ...item, text: "[AICPA task checklist withheld]" })),
  };
  if (!withheld.length) return task;
  // Longest first, so a criterion's text is replaced whole before any fragment of it.
  withheld.sort((a, b) => b[0].length - a[0].length);
  const clean = (s: string) => withheld.reduce((acc, [text, notice]) => (text.length >= 12 ? acc.split(text).join(notice) : acc), s);
  return { ...task, title: clean(task.title), description: clean(task.description), checklist: task.checklist.map((c) => ({ ...c, text: clean(c.text) })) };
}

/** Whether a corpus document's passages may be sent to the model. */
function passageAllowed(host: AgentHost, documentId: string): boolean {
  if (licensedTextToModel()) return true;
  return host.registry.documents.get(documentId)?.framework !== "aicpa-soc2";
}

export function statusOf(host: AgentHost, nodeId: string) {
  return host.score(frameworkOf(nodeId)).statuses.get(nodeId);
}

// ---------------------------------------------------------------------------

export const searchCorpus = defineTool({
  name: "search_corpus",
  description:
    "Search the local official documentation corpus (NIST CSF 2.0, NIST RMF / SP 800-53 family, AICPA SOC 2, NIST AI RMF with the Generative AI Profile, NIST AI 100-2 and NIST's AI overlays, U.S. state AI laws, and the AI threat catalogs: MITRE ATLAS and the OWASP Top 10s) and return citable passages with document id, title and page. Use it before making any claim about what a framework, law or threat catalog says.",
  schema: z.object({
    query: z.string().min(2).describe("Keywords or a question, e.g. 'backups tested restore', 'GV.SC-07 supplier risk', 'CA-SB243 suicide protocol' or 'AML.T0051 prompt injection'"),
    framework: z
      .enum(["nist-csf-2.0", "nist-rmf", "aicpa-soc2", "nist-ai-rmf", "us-state-ai-laws", "ai-threats"])
      .optional()
      .describe("Restrict to one corpus: nist-ai-rmf also holds NIST AI 100-2 and the AI overlays; ai-threats holds MITRE ATLAS and OWASP"),
    limit: z.number().int().min(1).max(8).optional(),
  }),
  async run(host, input) {
    const hits = host.registry.search.search(input.query, { limit: input.limit ?? 5, framework: input.framework });
    const citations = hits.map(hitToCitation);
    if (citations.length) host.step({ type: "citation", title: `Corpus: “${short(input.query, 60)}”`, citations });
    return {
      hits: citations.map((c) => ({ documentId: c.documentId, documentTitle: c.documentTitle, page: c.page, locator: c.locator, quote: passageAllowed(host, c.documentId) ? c.quote : WITHHELD_NOTICE })),
    };
  },
});

export const getRequirement = defineTool({
  name: "get_requirement",
  description:
    "Get one requirement (CSF outcome, SOC 2 criterion, SP 800-53 control, RMF task, AI RMF outcome, state-law obligation) by id or code, with its official text, implementation examples / points of focus, the workspace's current and target level, status, tasks, evidence and crosswalk mappings. Also describes a state AI law (its obligations, roles and dates) or a threat (ATLAS technique or mitigation, OWASP entry, NIST AI 100-2 attack) with the requirements publishers link to it.",
  schema: z.object({ id: z.string().describe("Node id ('nist-csf-2.0:PR.AA-01') or code ('PR.AA-01', 'CC6.1', 'AC-2', 'GOVERN 1.1', 'CA-SB243-02', 'AML.T0051', 'LLM04:2026')") }),
  async run(host, input) {
    const node = resolveNode(host, input.id);
    if (!node) return { error: `Unknown requirement '${input.id}'. Use list_requirements or search_corpus to find valid codes.` };
    const fam = familyOf(host, node.id);
    if (fam === "threat") {
      host.step({ type: "thought", title: `Reviewed ${node.code} and the requirements linked to it`, nodeIds: [node.id] });
      return threatBrief(host, node);
    }
    if (fam === "law" && !node.assessable) {
      host.step({ type: "thought", title: `Reviewed ${node.code}`, nodeIds: [node.id] });
      return lawBrief(host, node);
    }
    const index = host.registry.framework(node.frameworkId)!;
    const state = host.state(node.id);
    const status = statusOf(host, node.id);
    const family = index.graph.framework.family;
    const tasks = host.tasks().filter((t) => t.requirementIds.includes(node.id));
    const evidence = host.evidence().filter((e) => e.requirementIds.includes(node.id));
    const mappings = host.registry.crosswalk.related(node.id).slice(0, 24).map((e) => {
      const target = host.registry.node(e.to);
      const s = host.state(e.to);
      return { id: e.to, code: codeOf(e.to), framework: frameworkOf(e.to), relationship: e.relationship, text: target ? short(modelText(target), 120) : undefined, current: s?.current };
    });
    host.step({ type: "thought", title: `Reviewed ${node.code}`, nodeIds: [node.id] });
    return {
      id: node.id,
      code: node.code,
      kind: node.kind,
      framework: node.frameworkId,
      title: node.title,
      text: modelText(node),
      ...(family === "law" ? { law: lawBrief(host, node) } : {}),
      guidance: node.guidance ? short(node.guidance, 900) : undefined,
      ancestors: index.ancestors(node.id).map((a) => ({ code: a.code, title: a.title })),
      examples: node.examples?.map((e) => e.text),
      pointsOfFocus: licensedTextToModel() ? (node.attributes?.["pointsOfFocus"] as { title: string }[] | undefined)?.map((p) => p.title) : undefined,
      citation: node.citation,
      assessment: state
        ? {
            current: state.current,
            currentLabel: levelLabel(family, state.current),
            target: state.target,
            targetLabel: levelLabel(family, state.target),
            priority: state.priority,
            applicable: state.applicable,
            owner: state.owner,
            notes: state.notes,
          }
        : null,
      status: status?.status,
      statusReasons: status?.reasons,
      tasks: tasks.map((task) => {
        const t = modelTask(host, task);
        return { id: t.id, title: t.title, status: t.status, dueDate: t.dueDate, kind: t.kind };
      }),
      evidence: evidence.map((e) => ({ id: e.id, title: e.title, status: e.status, kind: e.kind, validUntil: e.validUntil })),
      mappings,
    };
  },
});

export const listRequirements = defineTool({
  name: "list_requirements",
  description:
    "List units of work (assessable requirements) in a framework with their status, current/target level and priority. Filter by parent (function/category/family code), status, priority or minimum gap.",
  schema: z.object({
    framework: z.string().describe("Framework id, e.g. 'nist-csf-2.0', 'aicpa-tsc-2017', 'nist-sp-800-53-r5', 'nist-ai-rmf'"),
    parent: z.string().optional().describe("Restrict to descendants of this code, e.g. 'PR' or 'PR.AA' or 'AC'"),
    status: z.array(z.enum(STATUSES)).optional(),
    priority: z.array(z.enum(["critical", "high", "medium", "low"])).optional(),
    minGap: z.number().int().min(0).max(4).optional(),
    limit: z.number().int().min(1).max(120).optional(),
  }),
  async run(host, input) {
    const index = host.registry.framework(input.framework);
    if (!index) return { error: `Unknown framework '${input.framework}'. Known: ${[...host.registry.indexes.keys()].join(", ")}` };
    if (index.graph.framework.family === "threat") return { error: `${index.graph.framework.shortName} is a threat catalog: its threats are never assessed. Call get_requirement on a threat to see the requirements linked to it.` };
    const score = host.score(input.framework);
    let nodes = index.assessable;
    if (input.parent) {
      const parent = index.get(input.parent);
      if (!parent) return { error: `Unknown parent '${input.parent}' in ${input.framework}` };
      nodes = index.assessableUnder(parent.id);
    }
    const rows = [];
    for (const node of nodes) {
      const s = host.state(node.id);
      const status = score.statuses.get(node.id)?.status;
      if (input.status && (!status || !input.status.includes(status))) continue;
      if (input.priority && (!s || !input.priority.includes(s.priority))) continue;
      const gap = s ? Math.max(0, s.target - s.current) : 0;
      if (input.minGap !== undefined && gap < input.minGap) continue;
      rows.push({ id: node.id, code: node.code, text: short(modelText(node), 140), status, current: s?.current ?? 0, target: s?.target ?? 0, gap, priority: s?.priority });
    }
    // Highest leverage first: gap weighted by priority.
    const weight = { critical: 4, high: 3, medium: 2, low: 1 } as const;
    rows.sort((a, b) => b.gap * weight[b.priority ?? "medium"] - a.gap * weight[a.priority ?? "medium"]);
    return { total: rows.length, rows: rows.slice(0, input.limit ?? 40) };
  },
});

export const workspaceOverview = defineTool({
  name: "workspace_overview",
  description:
    "Summarize the workspace: organization profile, enabled frameworks with readiness, gaps, evidence coverage and status counts, plus task, evidence and policy totals. Call this first when the question is broad.",
  schema: z.object({}),
  async run(host) {
    const ws = host.workspace();
    const frameworks = ws.frameworks
      .filter((f) => f.enabled && host.registry.framework(f.frameworkId))
      .map((f) => {
        const index = host.registry.framework(f.frameworkId)!;
        const score = host.score(f.frameworkId);
        const topGaps = index.assessable
          .map((n) => ({ n, s: host.state(n.id) }))
          .filter((x) => x.s && x.s.applicable && x.s.target > x.s.current)
          .sort((a, b) => b.s!.target - b.s!.current - (a.s!.target - a.s!.current))
          .slice(0, 8)
          .map((x) => `${x.n.code} (${x.s!.current}→${x.s!.target})`);
        return {
          id: f.frameworkId,
          name: index.graph.framework.shortName,
          readinessPercent: Math.round(score.overall.readiness * 100),
          units: score.overall.total,
          gaps: score.overall.gaps,
          evidenceCoveragePercent: Math.round(score.overall.evidenceCoverage * 100),
          statusCounts: score.overall.counts,
          topGaps,
        };
      });
    const tasks = host.tasks();
    const evidence = host.evidence();
    const policies = host.policies();
    return {
      organization: { name: ws.name, ...ws.profile },
      frameworks,
      tasks: {
        total: tasks.length,
        open: tasks.filter((t) => t.status !== "done").length,
        overdue: tasks.filter((t) => t.dueDate && t.status !== "done" && t.dueDate < new Date().toISOString().slice(0, 10)).length,
      },
      evidence: { total: evidence.length, accepted: evidence.filter((e) => isEvidenceValid(e)).length, pendingReview: evidence.filter((e) => e.status === "pending-review").length },
      policies: policies.map((p) => ({ title: p.title, status: p.status, version: p.version })),
    };
  },
});

export const proposeAssessment = defineTool({
  name: "propose_assessment",
  description:
    "Propose the current implementation level (0–4 on the framework's scale) for a requirement, with rationale, confidence and citations. A human approves before it takes effect unless the workspace granted autonomy.",
  writes: true,
  schema: z.object({
    nodeId: z.string(),
    current: Level,
    rationale: z.string().min(10),
    confidence: z.enum(["low", "medium", "high"]),
    citations: z.array(CitationInput).optional(),
  }),
  async run(host, input) {
    const node = resolveNode(host, input.nodeId);
    const refused = cannotAssess(host, node, input.nodeId, true);
    if (refused || !node) return { error: refused };
    const family = familyOf(host, node.id);
    const prev = host.state(node.id);
    const proposal = await host.propose({
      type: "set-level",
      title: `${node.code}: ${levelLabel(family, prev?.current ?? 0)} → ${levelLabel(family, input.current)}`,
      rationale: input.rationale,
      payload: { nodeId: node.id, current: input.current },
      citations: normalizeCitations(host, input.citations),
      confidence: input.confidence,
      nodeIds: [node.id],
    });
    return { proposalId: proposal.id, status: proposal.status };
  },
});

export const proposeTarget = defineTool({
  name: "propose_target",
  description: "Propose a target implementation level (Target Profile) for a requirement, with rationale.",
  writes: true,
  schema: z.object({ nodeId: z.string(), target: Level, rationale: z.string().min(10) }),
  async run(host, input) {
    const node = resolveNode(host, input.nodeId);
    const refused = cannotAssess(host, node, input.nodeId, true);
    if (refused || !node) return { error: refused };
    const family = familyOf(host, node.id);
    const proposal = await host.propose({
      type: "set-target",
      title: `${node.code}: target ${levelLabel(family, input.target)}`,
      rationale: input.rationale,
      payload: { nodeId: node.id, target: input.target },
      citations: [],
      confidence: "medium",
      nodeIds: [node.id],
    });
    return { proposalId: proposal.id, status: proposal.status };
  },
});

export const proposeApplicability = defineTool({
  name: "propose_applicability",
  description: "Propose marking a requirement applicable or not applicable, with a justification suitable for auditors.",
  writes: true,
  schema: z.object({ nodeId: z.string(), applicable: z.boolean(), rationale: z.string().min(10) }),
  async run(host, input) {
    const node = resolveNode(host, input.nodeId);
    const refused = cannotAssess(host, node, input.nodeId, false);
    if (refused || !node) return { error: refused };
    const proposal = await host.propose({
      type: "set-applicability",
      title: `${node.code}: ${input.applicable ? "applicable" : "not applicable"}`,
      rationale: input.rationale,
      payload: { nodeId: node.id, applicable: input.applicable, rationale: input.rationale },
      citations: [],
      confidence: "medium",
      nodeIds: [node.id],
    });
    return { proposalId: proposal.id, status: proposal.status };
  },
});

export const proposeTask = defineTool({
  name: "propose_task",
  description: "Propose a new task that advances one or more requirements. Keep titles imperative and specific.",
  writes: true,
  schema: z.object({
    title: z.string().min(4).max(140),
    description: z.string(),
    kind: z.enum(["governance", "policy", "procedure", "technical", "evidence", "training", "assessment", "vendor", "monitoring"]),
    priority: z.enum(["critical", "high", "medium", "low"]),
    requirementIds: z.array(z.string()).min(1),
    dueDate: z.string().optional().describe("YYYY-MM-DD"),
    effortHours: z.number().optional(),
    checklist: z.array(z.string()).optional(),
  }),
  async run(host, input) {
    const { nodes, error } = linkable(host, input.requirementIds);
    if (error) return { error };
    if (!nodes.length) return { error: "None of the requirementIds are known" };
    const proposal = await host.propose({
      type: "create-task",
      title: input.title,
      rationale: input.description,
      payload: { ...input, requirementIds: nodes.map((n) => n.id) },
      citations: [],
      confidence: "high",
      nodeIds: nodes.map((n) => n.id),
    });
    return { proposalId: proposal.id, status: proposal.status };
  },
});

export const proposePolicy = defineTool({
  name: "propose_policy",
  description:
    "Propose a policy, standard or procedure document (Markdown) mapped to requirements. The document should be tailored to the organization, use 'shall' statements, and include a requirements mapping section.",
  writes: true,
  schema: z.object({
    title: z.string().min(4),
    requirementIds: z.array(z.string()).min(1),
    body: z.string().min(200).describe("Complete Markdown document"),
    citations: z.array(CitationInput).optional(),
  }),
  async run(host, input) {
    const { nodes, error } = linkable(host, input.requirementIds);
    if (error) return { error };
    if (!nodes.length) return { error: "None of the requirementIds are known" };
    const proposal = await host.propose({
      type: "create-policy",
      title: `Draft: ${input.title}`,
      rationale: `Policy draft covering ${nodes.map((n) => n.code).join(", ")}`,
      payload: { title: input.title, body: input.body, requirementIds: nodes.map((n) => n.id) },
      citations: normalizeCitations(host, input.citations),
      confidence: "medium",
      nodeIds: nodes.map((n) => n.id),
    });
    return { proposalId: proposal.id, status: proposal.status };
  },
});

export const proposeEvidence = defineTool({
  name: "propose_evidence",
  description:
    "Propose an evidence record for an artifact that demonstrates an implemented control — a configuration export, log extract, system record or signed attestation — linked to requirements. Never use it for plans, drafts, guides or anything that describes intended work: evidence must show what is actually in place.",
  writes: true,
  schema: z.object({
    title: z.string().min(4),
    requirementIds: z.array(z.string()).min(1),
    kind: z.enum(["document", "screenshot", "configuration", "log", "attestation", "automated-check", "policy", "report"]),
    content: z.string().min(20),
    validDays: z.number().int().min(1).max(730).optional(),
  }),
  async run(host, input) {
    const { nodes, error } = linkable(host, input.requirementIds);
    if (error) return { error };
    if (!nodes.length) return { error: "None of the requirementIds are known" };
    const proposal = await host.propose({
      type: "create-evidence",
      title: input.title,
      rationale: `Evidence for ${nodes.map((n) => n.code).join(", ")}`,
      payload: { ...input, requirementIds: nodes.map((n) => n.id) },
      citations: [],
      confidence: "medium",
      nodeIds: nodes.map((n) => n.id),
    });
    return { proposalId: proposal.id, status: proposal.status };
  },
});

export const updateTask = defineTool({
  name: "update_task",
  description: "Propose a task update: status change, completed checklist items (by id) and a progress note.",
  writes: true,
  schema: z.object({
    taskId: z.string(),
    status: z.enum(["backlog", "todo", "in-progress", "in-review", "done", "blocked"]).optional(),
    completeChecklistItems: z.array(z.string()).optional(),
    note: z.string().optional(),
  }),
  async run(host, input) {
    const task = host.tasks().find((t) => t.id === input.taskId);
    if (!task) return { error: `Unknown task '${input.taskId}'` };
    const proposal = await host.propose({
      type: "update-task",
      title: `Update “${short(task.title, 60)}”${input.status ? ` → ${input.status}` : ""}`,
      rationale: input.note ?? "Task progress update",
      payload: { ...input },
      citations: [],
      confidence: "high",
      nodeIds: task.requirementIds,
    });
    return { proposalId: proposal.id, status: proposal.status };
  },
});

export const listTasks = defineTool({
  name: "list_tasks",
  description: "List tasks, optionally filtered by status or requirement.",
  schema: z.object({
    status: z.array(z.enum(["backlog", "todo", "in-progress", "in-review", "done", "blocked"])).optional(),
    requirementId: z.string().optional(),
    limit: z.number().int().min(1).max(100).optional(),
  }),
  async run(host, input) {
    const req = input.requirementId ? resolveNode(host, input.requirementId)?.id : undefined;
    const tasks = host
      .tasks()
      .filter((t) => (!input.status || input.status.includes(t.status)) && (!req || t.requirementIds.includes(req)))
      .slice(0, input.limit ?? 40);
    return {
      tasks: tasks.map((task) => {
        const t = modelTask(host, task);
        return {
          id: t.id,
          title: t.title,
          status: t.status,
          kind: t.kind,
          priority: t.priority,
          dueDate: t.dueDate,
          requirements: t.requirementIds.map(codeOf),
          checklist: t.checklist.map((c) => ({ id: c.id, text: short(c.text, 100), done: c.done })),
        };
      }),
    };
  },
});

export const listEvidence = defineTool({
  name: "list_evidence",
  description: "List evidence records, optionally filtered by requirement or status.",
  schema: z.object({
    requirementId: z.string().optional(),
    status: z.array(z.enum(["pending-review", "accepted", "rejected", "expired"])).optional(),
  }),
  async run(host, input) {
    const req = input.requirementId ? resolveNode(host, input.requirementId)?.id : undefined;
    return {
      evidence: host
        .evidence()
        .filter((e) => (!req || e.requirementIds.includes(req)) && (!input.status || input.status.includes(e.status)))
        .slice(0, 60)
        .map((e) => ({ id: e.id, title: e.title, kind: e.kind, status: e.status, source: e.source, collectedAt: e.collectedAt, validUntil: e.validUntil, requirements: e.requirementIds.map(codeOf) })),
    };
  },
});

export const runChecks = defineTool({
  name: "run_checks",
  description:
    "Run the workspace's monitoring connectors (e.g. web security posture, repository hygiene) and return check outcomes. Each passing check linked to requirements is proposed as automated-check evidence, built from the recorded check itself; it is filed once approved (or at once, if the workspace's autonomy settings allow evidence proposals).",
  writes: true,
  schema: z.object({ connectorId: z.string().optional() }),
  async run(host, input) {
    const connectors = host.connectors().filter((c) => c.status === "active" && (!input.connectorId || c.id === input.connectorId));
    if (!connectors.length) return { error: "No active connectors. Ask the user to add one in Evidence → Connectors." };
    const out = [];
    // Evidence from the same check that stays valid for another week needs no new proposal.
    const onFile = (connectorId: string, checkId: string) =>
      host
        .evidence()
        .some((e) => e.connectorId === connectorId && (e.data as { checkId?: string } | undefined)?.checkId === checkId && isEvidenceValid(e, new Date(Date.now() + 7 * 86_400_000)));
    for (const c of connectors) {
      const results = await host.runConnector(c.id);
      const proposed: string[] = [];
      for (const r of results.filter((x) => x.outcome === "pass" && x.requirementIds.length && !x.evidenceId && !onFile(c.id, x.checkId))) {
        const proposal = await host.propose({
          type: "create-evidence",
          title: `${c.name}: ${r.title}`,
          rationale: `Passing automated check from the ${c.name} connector, observed ${r.observedAt.slice(0, 16).replace("T", " ")} UTC: ${short(r.detail, 200)}`,
          payload: { checkResultId: r.id, title: `${c.name}: ${r.title}`, kind: "automated-check", requirementIds: r.requirementIds, content: r.detail },
          citations: [],
          confidence: "high",
          nodeIds: r.requirementIds,
        });
        proposed.push(proposal.id);
      }
      out.push({
        connector: c.name,
        results: results.map((r) => ({ check: r.title, outcome: r.outcome, detail: r.detail, requirements: r.requirementIds.map(codeOf) })),
        evidenceProposals: proposed.length,
      });
    }
    return { connectors: out };
  },
});

export const crosswalk = defineTool({
  name: "crosswalk",
  description:
    "Show authoritative crosswalk mappings for a requirement (e.g. CSF outcome ↔ SP 800-53 controls ↔ SOC 2 criteria) with the workspace's levels, to reuse work across frameworks.",
  schema: z.object({ nodeId: z.string(), targetFramework: z.string().optional() }),
  async run(host, input) {
    const node = resolveNode(host, input.nodeId);
    if (!node) return { error: `Unknown requirement '${input.nodeId}'` };
    const edges = host.registry.crosswalk.related(node.id, input.targetFramework);
    host.step({ type: "thought", title: `Crosswalk for ${node.code}: ${edges.length} mapping(s)`, nodeIds: [node.id, ...edges.slice(0, 12).map((e) => e.to)] });
    return {
      node: node.code,
      mappings: edges.slice(0, 40).map((e) => {
        const t = host.registry.node(e.to);
        return { id: e.to, code: codeOf(e.to), framework: frameworkOf(e.to), relationship: e.relationship, authority: e.authority, text: t ? short(modelText(t), 120) : undefined, current: host.state(e.to)?.current };
      }),
    };
  },
});

export const focus = defineTool({
  name: "focus",
  description:
    "Direct the user's 3D Observatory: fly the camera to requirements and optionally switch the lens. Use it to show the user what you are talking about.",
  schema: z.object({
    nodeIds: z.array(z.string()).min(1).max(40),
    lens: z.enum(["status", "gap", "evidence", "priority", "crosswalk"]).optional(),
    note: z.string().optional(),
  }),
  async run(host, input) {
    const nodes = input.nodeIds.map((id) => resolveNode(host, id)).filter((n): n is RequirementNode => !!n);
    host.step({
      type: "ui",
      title: input.note ?? `Focus on ${nodes.map((n) => n.code).slice(0, 6).join(", ")}`,
      data: { action: "focus", nodeIds: nodes.map((n) => n.id), lens: input.lens },
      nodeIds: nodes.map((n) => n.id),
    });
    return { focused: nodes.map((n) => n.code) };
  },
});

export const ALL_TOOLS = [
  workspaceOverview,
  searchCorpus,
  getRequirement,
  listRequirements,
  crosswalk,
  listTasks,
  listEvidence,
  focus,
  proposeAssessment,
  proposeTarget,
  proposeApplicability,
  proposeTask,
  proposePolicy,
  proposeEvidence,
  updateTask,
  runChecks,
] as AgentTool[];

export function toolByName(name: string): AgentTool | undefined {
  return ALL_TOOLS.find((t) => t.name === name);
}

/** Level scale reference used in prompts. */
export function levelScaleText(): string {
  return Object.values(LEVEL_SCALES)
    .map((s) => `${s.family.toUpperCase()} — ${s.name}: ${s.levels.map((l) => `${l.level} ${l.label}`).join(", ")}`)
    .join("\n");
}
