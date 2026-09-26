/**
 * Offline playbooks: deterministic, explainable implementations of every
 * agent that use exactly the same tools as the Claude runtime. They keep
 * Visua fully functional without an API key and make tests reproducible.
 */
import {
  CrosswalkIndex,
  codeOf,
  frameworkOf,
  isEvidenceValid,
  levelLabel,
  newId,
  planTasks,
  projectLevels,
  shortStatement,
  type AgentKind,
  type Citation,
  type RequirementNode,
  type Task,
} from "@visua/core";
import type { AgentHost, AgentResult } from "./host.ts";
import { composePolicy, frameworkLabel, templateFor } from "./policies.ts";
import {
  corpusOf,
  crosswalk,
  focus,
  frameworkEnabled,
  getRequirement,
  hitToCitation,
  isThreat,
  lawBrief,
  listRequirements,
  resolveNode,
  threatBrief,
  proposeAssessment,
  proposePolicy,
  proposeTask,
  runChecks,
  statusOf,
  updateTask,
  workspaceOverview,
} from "./tools.ts";

type Playbook = (host: AgentHost, goal: string, input: Record<string, unknown>) => Promise<string>;

const CODE_PATTERNS = [
  /\b(?:GV|ID|PR|DE|RS|RC)\.[A-Z]{2}(?:-\d{2})?\b/g,
  /\b(?:CC\d\.\d|A1\.\d|PI1\.\d|C1\.\d|P\d\.\d)\b/g,
  /\b[A-Z]{2}-\d{1,2}(?:\(\d{1,2}\))?\b/g,
  /\b[PCSIAR]-\d{1,2}\b/g,
  // MITRE ATLAS tactics, techniques, sub-techniques and mitigations.
  /\bAML\.(?:TA\d{4}|T\d{4}(?:\.\d{3})?|M\d{4})\b/g,
  // OWASP entries, optionally edition-qualified (LLM04:2026, LLM03:2025, ASI01).
  /\b(?:LLM|ASI)\d{2}(?::20\d{2})?\b/g,
  // NIST AI 100-2 objectives and attacks.
  /\bNISTAML\.\d{2,3}\b/g,
  // State AI laws and obligations (CA-SB243, CA-SB243-02, CO-SB26-189, NY-RAISE).
  /\b(?:CA|CO|IL|ME|NY|NYC|TX|UT)-[A-Z][A-Z0-9]*(?:-[A-Z0-9]+)*\b/g,
];
/** AI RMF outcomes and categories, written as NIST writes them (GOVERN 1.1, MAP 2). */
const AI_RMF_CODE = /\b(?:GOVERN|MAP|MEASURE|MANAGE) \d{1,2}(?:\.\d{1,2})?\b/g;

export function extractCodes(text: string): string[] {
  const found = new Set<string>();
  for (const re of CODE_PATTERNS) for (const m of text.toUpperCase().matchAll(re)) found.add(m[0]);
  for (const m of text.matchAll(AI_RMF_CODE)) found.add(m[0]);
  return [...found];
}

function citeFor(host: AgentHost, node: RequirementNode, limit = 2): Citation[] {
  const hits = host.registry.search.search(`${node.code} ${node.title} ${node.text}`, { limit, framework: corpusOf(host, node.frameworkId) });
  return hits.map(hitToCitation);
}

const STOPWORDS = new Set("a an and are as at be by do does for from how in is it of on or our the this to us we what which who why with about".split(" "));

/** Words of a question or a law's names, with "AI" spelled out and bill numbers joined (SB 24-205 → sb24 205, H.B. 149 → hb149). */
function lawWords(text: string): string[] {
  const t = text
    .toLowerCase()
    .replace(/\bai\b/g, "artificial intelligence")
    .replace(/\b([shal])\.\s?b\.\s*(\d)/g, "$1b$2")
    .replace(/\b(sb|ab|hb|ld)[\s.-]*(\d)/g, "$1$2")
    .replace(/\blocal law (\d+)/g, "ll$1");
  return (t.match(/[a-z0-9]+/g) ?? []).map((w) => (w.length > 4 && w.endsWith("s") ? w.slice(0, -1) : w)).filter((w) => !STOPWORDS.has(w));
}

/**
 * A state AI law named in words ("the Colorado AI Act", "TRAIGA", "SB 53", "the Texas law"),
 * if the question clearly names one. A law is a candidate only when the question names its
 * jurisdiction, one of its bill numbers or its acronym (in capitals, so "raise" is not the
 * RAISE Act); candidates are ranked by their distinctive words, and a tie names none.
 */
function lawNamed(host: AgentHost, goal: string): RequirementNode | undefined {
  const asked = new Set(lawWords(goal));
  const laws: { node: RequirementNode; words: Set<string>; named: boolean }[] = [];
  for (const f of host.registry.frameworks.filter((x) => x.family === "law")) {
    const index = host.registry.framework(f.id)!;
    for (const law of index.graph.nodes.filter((n) => n.kind === "law")) {
      const jurisdiction = law.parentId ? (index.byId.get(law.parentId)?.title ?? "") : "";
      const bills = `${law.title} ${law.text}`.match(/\b(?:[SAH]\.\s?B\.|[SAH]B|LD|Local Law)\s*\d[\d-]*/gi) ?? [];
      const acronyms = law.code.split("-").slice(1).filter((w) => /^[A-Z]{3,}$/.test(w) && w !== "AI");
      const billWords = lawWords(`${bills.join(" ")} ${law.code.split("-").slice(1).join(" ")}`).filter((w) => /^(sb|ab|hb|ld|ll)\d/.test(w));
      const named =
        (jurisdiction !== "" && lawWords(jurisdiction).every((w) => asked.has(w))) ||
        (jurisdiction === "New York City" && asked.has("nyc")) ||
        billWords.some((w) => asked.has(w)) ||
        acronyms.some((a) => new RegExp(`\\b${a}\\b`).test(goal));
      laws.push({ node: law, words: new Set([...lawWords(`${law.title} ${jurisdiction} ${bills.join(" ")}`), ...billWords, ...acronyms.map((a) => a.toLowerCase())]), named });
    }
  }
  // Inverse document frequency: "artificial intelligence" and "act" say little, "colorado" or "traiga" a lot.
  const idf = (w: string) => Math.log(laws.length / Math.max(1, laws.filter((l) => l.words.has(w)).length));
  const ranked = laws
    .filter((l) => l.named)
    .map((l) => ({ node: l.node, score: [...asked].filter((w) => l.words.has(w)).reduce((sum, w) => sum + idf(w), 0) }))
    .sort((a, b) => b.score - a.score);
  const [best, next] = ranked;
  if (best && best.score > 0 && (!next || best.score - next.score >= 0.5)) return best.node;
  // No single law: a question about one jurisdiction ("Colorado AI law") gets the jurisdiction's laws.
  const jurisdictions = [...new Set(ranked.map((r) => r.node.parentId))]
    .map((id) => (id ? host.registry.node(id) : undefined))
    .filter((j): j is RequirementNode => !!j && (lawWords(j.title).every((w) => asked.has(w)) || (j.title === "New York City" && asked.has("nyc"))));
  // "New York City" names New York too: keep the most specific.
  const specific = jurisdictions.filter((j) => !jurisdictions.some((o) => o !== j && o.title.startsWith(`${j.title} `)));
  return specific.length === 1 ? specific[0] : undefined;
}

function enabledFrameworks(host: AgentHost): string[] {
  return host
    .workspace()
    .frameworks.filter((f) => f.enabled && host.registry.framework(f.frameworkId))
    .map((f) => f.frameworkId);
}

/**
 * Why a run cannot work on the framework it was given: threat catalogs are never
 * assessed or planned, and a framework the workspace does not follow has no scope.
 */
function unusableFramework(host: AgentHost, input: Record<string, unknown>): string | undefined {
  const requested = typeof input["framework"] === "string" ? (input["framework"] as string) : undefined;
  if (!requested) return undefined;
  const index = host.registry.framework(requested);
  if (!index) return `Unknown framework '${requested}'.`;
  const fw = index.graph.framework;
  if (fw.family === "threat") return `${fw.shortName} is a threat catalog: its threats are never assessed or planned. Their coverage comes from the requirements linked to them; open a threat on the AI threats page to see those requirements and work on them.`;
  if (!frameworkEnabled(host, requested)) return `${fw.shortName} is not enabled in this workspace. An admin can enable it in Settings.`;
  return undefined;
}

function primaryFramework(host: AgentHost, input: Record<string, unknown>): string {
  const requested = typeof input["framework"] === "string" ? (input["framework"] as string) : undefined;
  if (requested && !unusableFramework(host, input)) return requested;
  return enabledFrameworks(host)[0] ?? "nist-csf-2.0";
}

/** Resolve the scope of nodes for a run: explicit ids, a parent code, a task, or top gaps. Never threats. */
function scopeNodes(host: AgentHost, input: Record<string, unknown>, fallbackLimit = 10): RequirementNode[] {
  const ids = Array.isArray(input["nodeIds"]) ? (input["nodeIds"] as string[]) : [];
  const out: RequirementNode[] = [];
  const push = (n: RequirementNode | undefined) => {
    if (n && !isThreat(host, n.id) && frameworkEnabled(host, n.frameworkId) && !out.some((x) => x.id === n.id)) out.push(n);
  };
  for (const id of ids) {
    const node = host.registry.node(id);
    if (!node) continue;
    if (node.assessable) push(node);
    else for (const n of host.registry.framework(node.frameworkId)!.assessableUnder(node.id)) push(n);
  }
  if (typeof input["taskId"] === "string") {
    const task = host.tasks().find((t) => t.id === input["taskId"]);
    for (const id of task?.requirementIds ?? []) push(host.registry.node(id));
  }
  if (out.length) return out;
  const fw = primaryFramework(host, input);
  const index = host.registry.framework(fw)!;
  return index.assessable
    .map((n) => ({ n, s: host.state(n.id) }))
    .filter((x) => x.s?.applicable && x.s.target > x.s.current)
    .sort((a, b) => b.s!.target - b.s!.current - (a.s!.target - a.s!.current))
    .slice(0, fallbackLimit)
    .map((x) => x.n);
}

const isThreatFramework = (host: AgentHost, frameworkId: string) => host.registry.framework(frameworkId)?.graph.framework.family === "threat";

function pct(n: number): string {
  return `${Math.round(n * 100)}%`;
}

// ---------------------------------------------------------------------------
// Copilot
// ---------------------------------------------------------------------------

/** A threat, in words: what it is, and what publishers link to it (never an assessment of it). */
function threatAnswer(host: AgentHost, node: RequirementNode, focusIds: string[]): string[] {
  const t = threatBrief(host, node);
  const lines = [`**${t.code}** — ${t.title} (${t.catalog} ${node.kind})`, shortStatement(node.text.replace(/\[([^\]]+)\]\([^)]*\)/g, "$1"), 420)];
  const mitigations = t.related.filter((r) => r.label === "mitigates");
  if (mitigations.length) lines.push(`Mitigations (${mitigations[0]!.authority}, ${mitigations[0]!.status}): ${mitigations.slice(0, 8).map((m) => `${m.code} ${m.title}`).join("; ")}.`);
  if (!t.linkedRequirements.length) lines.push("No publisher links this threat to a requirement Visua models yet.");
  else {
    lines.push("Requirements publishers link to it:");
    for (const g of t.linkedRequirements) {
      const examples = g.examples.filter((r) => r.inScope).slice(0, 5);
      lines.push(`- *${g.publication}*${g.publication.toLowerCase().includes(g.status) ? "" : ` (${g.status})`}: ${g.requirements} requirement(s), ${g.inYourFrameworks} in your frameworks, ${g.atTarget} at target${examples.length ? ` — e.g. ${examples.map((r) => `**${r.code}**${r.via ? ` via ${r.via}` : ""}`).join(", ")}` : ""}.`);
      focusIds.push(...examples.map((r) => r.id));
    }
  }
  lines.push("Threats are never assessed: coverage comes from these linked requirements, at the status of their weakest link.");
  return lines;
}

/** A state AI law or obligation, in words, with the organization's own scoping decision. */
function lawAnswer(host: AgentHost, node: RequirementNode): string[] {
  if (node.kind === "jurisdiction") {
    const index = host.registry.framework(node.frameworkId)!;
    const laws = index.childrenOf(node.id).filter((n) => n.kind === "law");
    const decisions = host.workspace().frameworks.find((f) => f.frameworkId === node.frameworkId)?.law?.applicability ?? {};
    return [
      `**${node.title}** — ${laws.length} AI law(s) or regulation(s) tracked:`,
      ...laws.map((law) => {
        const a = law.attributes ?? {};
        const roles = decisions[String(a["lawId"] ?? "")]?.roles ?? [];
        return `- **${law.code}** ${law.title}: ${String(a["status"] ?? "")}${a["effective"] ? `, effective ${String(a["effective"])}` : ""}; ${roles.length ? `your recorded role: ${roles.join(", ")}` : "your role is not recorded"}.`;
      }),
      "Ask about one of them by name or code for its obligations and who it applies to.",
    ];
  }
  const l = lawBrief(host, node);
  const roles = (l.roles as string[] | undefined) ?? [];
  if (node.kind === "law") {
    const lines = [`**${l.code}** — ${l.title}: ${String(l.law?.status ?? "")}${l.law?.effective ? `, effective ${String(l.law.effective)}` : ""}.`, shortStatement(node.text, 360)];
    if (l.law?.statusNote) lines.push(`Status: ${shortStatement(String(l.law.statusNote), 420)}`);
    if (l.obligations?.length) {
      lines.push(`${l.obligations.length} obligation(s), on ${roles.join(", ")}:`);
      for (const o of l.obligations.slice(0, 8)) lines.push(`- **${o.code}** ${o.title} (${((o.roles as string[] | undefined) ?? []).join(", ")}; from ${String(o.effective)})`);
    } else lines.push("No obligations are tracked for this law.");
    if (l.yourRoles?.length) lines.push(`Your role under this law (recorded): ${l.yourRoles.join(", ")}.`);
    else {
      lines.push("You have not recorded how this law applies to you. The law's own definitions decide it; an approver records the roles you hold on the State AI laws page:");
      for (const d of l.definitions.slice(0, 4)) lines.push(`- *${d.role}*: “${shortStatement(d.definition, 240)}”`);
    }
    return lines;
  }
  const lines = [`**${l.code}** — ${l.title}: ${shortStatement(node.text, 480)}`];
  if (l.law) lines.push(`Law: ${l.law.code}, ${l.law.title} (${String(l.law.status)})${l.section ? `, ${String(l.section)}` : ""}.`);
  lines.push(`Applies to: ${roles.join(", ")}; ${l.timing === "upcoming" ? `takes effect on ${String(l.effective)}` : l.timing === "ended" ? `no longer in effect after ${String(l.until)}` : `in force since ${String(l.effective)}`}.`);
  lines.push(l.yourRoles?.length ? `Your role under this law (recorded): ${l.yourRoles.join(", ")}.` : "You have not recorded how this law applies to you.");
  if (l.assessment?.applicable) lines.push(`Your implementation: level ${l.assessment.current} of target ${l.assessment.target}.`);
  return lines;
}

const copilot: Playbook = async (host, goal, input) => {
  const q = goal.toLowerCase();
  const codes = extractCodes(goal);
  const contextNode = typeof input["nodeId"] === "string" ? host.registry.node(input["nodeId"] as string) : undefined;
  host.step({ type: "plan", title: "Understand the question", detail: codes.length ? `Requirements mentioned: ${codes.join(", ")}` : "No explicit requirement codes — interpreting intent" });

  const lines: string[] = [];
  const focusIds: string[] = [];

  const nodes: RequirementNode[] = [];
  for (const n of codes.map((c) => resolveNode(host, c))) if (n && !nodes.some((x) => x.id === n.id)) nodes.push(n);
  if (!nodes.length && contextNode && /\b(this|it|here|selected)\b/.test(q)) nodes.push(contextNode);
  if (!nodes.length) {
    const law = lawNamed(host, goal);
    if (law) nodes.push(law);
  }

  const wantsMap = /\b(map|mapping|crosswalk|soc ?2|800-53|also satisf|reuse)\b/.test(q);
  const wantsGaps = /\b(gap|gaps|priorit|next|focus|biggest|weakest|worst|start)\b/.test(q);
  const wantsStatus = /\b(status|readiness|progress|how are we|summary|overview|score|ready)\b/.test(q);
  const wantsEvidence = /\b(evidence|proof|artifact)\b/.test(q);
  const wantsTasks = /\b(task|overdue|todo|plan|deadline)\b/.test(q);

  for (const node of nodes.slice(0, 4)) {
    const family = host.registry.framework(node.frameworkId)?.graph.framework.family;
    if (family === "threat") {
      lines.push(...threatAnswer(host, node, focusIds), "");
      continue;
    }
    if (family === "law") {
      lines.push(...lawAnswer(host, node), "");
      focusIds.push(node.id);
      continue;
    }
    const detail = (await getRequirement.run(host, { id: node.id })) as Record<string, unknown>;
    const a = detail["assessment"] as Record<string, unknown> | null;
    lines.push(`**${node.code}** — ${node.title && node.title !== node.code ? `${node.title}: ` : ""}${node.text}`);
    if (a) lines.push(`Current: ${a["currentLabel"]} (level ${a["current"]}) · Target: ${a["targetLabel"]} (level ${a["target"]}) · Status: ${detail["status"]}`);
    const examples = (detail["examples"] as string[] | undefined) ?? [];
    if (examples.length) lines.push(`Official implementation examples: ${examples.slice(0, 3).map((e) => `“${shortStatement(e, 110)}”`).join("; ")}`);
    if (wantsMap) {
      const cw = (await crosswalk.run(host, { nodeId: node.id })) as { mappings: { code: string; framework: string; relationship: string }[] };
      if (cw.mappings.length) lines.push(`Crosswalk: ${cw.mappings.slice(0, 10).map((m) => `${m.code} (${frameworkLabel(m.framework)}, ${m.relationship})`).join(", ")}`);
      else lines.push("No authoritative crosswalk mappings are loaded for this requirement yet.");
    }
    lines.push("");
    focusIds.push(node.id);
  }

  if (!nodes.length && (wantsStatus || (!wantsGaps && !wantsEvidence && !wantsTasks && /\b(we|our|us)\b/.test(q)))) {
    const overview = (await workspaceOverview.run(host, {})) as {
      frameworks: { id: string; name: string; readinessPercent: number; gaps: number; evidenceCoveragePercent: number; topGaps: string[] }[];
      tasks: { open: number; overdue: number };
      evidence: { pendingReview: number };
    };
    for (const f of overview.frameworks) {
      lines.push(`**${f.name}** — readiness ${f.readinessPercent}%, ${f.gaps} open gaps, evidence coverage ${f.evidenceCoveragePercent}%.`);
      if (f.topGaps.length) lines.push(`Largest gaps: ${f.topGaps.slice(0, 5).join(", ")}.`);
    }
    lines.push(`Work: ${overview.tasks.open} open tasks (${overview.tasks.overdue} overdue), ${overview.evidence.pendingReview} evidence items awaiting review.`);
  }

  if (!nodes.length && wantsGaps) {
    const fw = primaryFramework(host, input);
    const res = (await listRequirements.run(host, { framework: fw, minGap: 1, limit: 8 })) as { rows: { id: string; code: string; text: string; current: number; target: number; priority?: string }[] };
    if (res.rows.length) {
      lines.push(`Highest-leverage gaps in ${frameworkLabel(fw)} (largest distance to target first):`);
      for (const r of res.rows) {
        lines.push(`- **${r.code}** (${r.current}→${r.target}${r.priority ? `, ${r.priority}` : ""}) ${shortStatement(r.text, 110)}`);
        focusIds.push(r.id);
      }
      lines.push("");
      lines.push("Ask the Planner to turn these into scheduled tasks, or open one in the Observatory to act on it.");
    } else lines.push(`No open gaps in ${frameworkLabel(fw)} — every in-scope outcome meets its target.`);
  }

  if (!nodes.length && wantsEvidence) {
    const missing = [];
    for (const fw of enabledFrameworks(host)) {
      const index = host.registry.framework(fw)!;
      for (const n of index.assessable) {
        const s = host.state(n.id);
        if (!s?.applicable || s.current < 2) continue;
        const ev = host.evidence().filter((e) => e.requirementIds.includes(n.id) && isEvidenceValid(e));
        if (!ev.length) missing.push(n);
      }
    }
    lines.push(missing.length ? `${missing.length} implemented requirement(s) have no valid evidence yet. First ten:` : "Every implemented requirement has valid evidence.");
    for (const n of missing.slice(0, 10)) {
      lines.push(`- **${n.code}** ${shortStatement(n.text, 100)}`);
      focusIds.push(n.id);
    }
  }

  if (!nodes.length && wantsTasks) {
    const today = new Date().toISOString().slice(0, 10);
    const open = host.tasks().filter((t) => t.status !== "done");
    const overdue = open.filter((t) => t.dueDate && t.dueDate < today);
    lines.push(`${open.length} open task(s), ${overdue.length} overdue.`);
    for (const t of (overdue.length ? overdue : open).slice(0, 8)) lines.push(`- ${t.title} — ${t.status}${t.dueDate ? `, due ${t.dueDate}` : ""}`);
  }

  // Ground the answer in the official corpus: the corpus of the requirement, law or threat asked about.
  const first = nodes[0];
  const searchQuery = !first
    ? goal
    : first.kind === "jurisdiction"
      ? (host.registry.framework(first.frameworkId)?.childrenOf(first.id).map((l) => l.title).join(" ") ?? first.title)
      : `${first.code} ${first.title} ${first.text}`;
  const hits = host.registry.search.search(searchQuery, { limit: 3, framework: first ? corpusOf(host, first.frameworkId) : undefined });
  if (hits.length) {
    const citations = hits.map(hitToCitation);
    host.step({ type: "citation", title: "Grounding in the official corpus", citations });
    if (!lines.length) {
      lines.push("From the official documentation:");
      for (const c of citations) lines.push(`> ${c.quote}\n> — *${c.documentTitle}${c.page ? `, p. ${c.page}` : ""}*`);
      // Related requirements from the framework the best passage belongs to (never a threat catalog).
      const fw = host.registry.frameworks.find((f) => f.family !== "threat" && corpusOf(host, f.id) === hits[0]!.chunk.framework && frameworkEnabled(host, f.id))?.id;
      const related = fw ? host.registry.framework(fw)!.search(goal, 5).filter((n) => n.assessable) : [];
      if (related.length) {
        lines.push("");
        lines.push(`Related requirements: ${related.map((n) => `**${n.code}**`).join(", ")}.`);
        focusIds.push(...related.map((n) => n.id));
      }
    } else {
      lines.push(`Sources: ${[...new Set(citations.map((c) => `*${c.documentTitle}${c.page ? `, p. ${c.page}` : ""}*`))].join("; ")}.`);
    }
  }
  if (!lines.length) lines.push("I couldn't find anything specific. Try naming a requirement code (e.g. PR.AA-01) or ask about readiness, gaps, evidence or tasks.");

  if (focusIds.length) await focus.run(host, { nodeIds: [...new Set(focusIds)].slice(0, 20), lens: wantsGaps ? "gap" : wantsEvidence ? "evidence" : undefined });
  return lines.join("\n").trim();
};

// ---------------------------------------------------------------------------
// Assessor
// ---------------------------------------------------------------------------

const assessor: Playbook = async (host, _goal, input) => {
  const refused = !Array.isArray(input["nodeIds"]) && typeof input["taskId"] !== "string" ? unusableFramework(host, input) : undefined;
  if (refused) return refused;
  const nodes = scopeNodes(host, input, 12);
  host.step({ type: "plan", title: `Assess ${nodes.length} requirement(s)`, detail: "Weigh accepted evidence, completed tasks and monitoring results; stay conservative without evidence.", nodeIds: nodes.map((n) => n.id) });
  let proposed = 0;
  const rows: string[] = [];
  for (const node of nodes) {
    const s = host.state(node.id);
    if (!s || !s.applicable) continue;
    const family = host.registry.framework(node.frameworkId)!.graph.framework.family;
    const evidence = host.evidence().filter((e) => e.requirementIds.includes(node.id));
    const valid = evidence.filter((e) => isEvidenceValid(e));
    const doneTasks = host.tasks().filter((t) => t.requirementIds.includes(node.id) && t.status === "done");
    const passing = valid.filter((e) => e.kind === "automated-check").length;
    let level = s.current;
    const reasons: string[] = [];
    if (valid.length >= 1 && level < 2) {
      level = 2;
      reasons.push(`${valid.length} accepted, unexpired evidence item(s)`);
    }
    if ((valid.length >= 2 || passing >= 1) && doneTasks.length >= 1 && level < 3) {
      level = Math.min(3, Math.max(level, s.target));
      reasons.push(`${doneTasks.length} completed task(s) plus ${passing ? "passing automated checks" : "multiple evidence items"}`);
    }
    if (!valid.length && s.current > 2) {
      level = 2;
      reasons.push("no valid evidence supports a level above 2 — evidence is required to sustain it");
    }
    if (level === s.current) {
      rows.push(`- ${node.code}: confirmed at ${levelLabel(family, s.current)} (${valid.length} valid evidence, ${doneTasks.length} completed tasks)`);
      continue;
    }
    const citations = citeFor(host, node, 1);
    await proposeAssessment.run(host, {
      nodeId: node.id,
      current: level,
      rationale: `Proposed ${levelLabel(family, level)}: ${reasons.join("; ")}.`,
      confidence: valid.length >= 2 ? "high" : valid.length ? "medium" : "low",
      citations: citations.map((c) => ({ documentId: c.documentId, page: c.page, locator: c.locator, quote: c.quote })),
    });
    proposed++;
    rows.push(`- ${node.code}: ${levelLabel(family, s.current)} → **${levelLabel(family, level)}** — ${reasons.join("; ")}`);
  }
  return [`Assessed ${nodes.length} requirement(s); ${proposed} level change(s) proposed for your approval.`, "", ...rows].join("\n");
};

// ---------------------------------------------------------------------------
// Planner
// ---------------------------------------------------------------------------

const planner: Playbook = async (host, _goal, input) => {
  const refused = unusableFramework(host, input);
  if (refused) return refused;
  const fw = primaryFramework(host, input);
  const index = host.registry.framework(fw)!;
  const scoped = Array.isArray(input["nodeIds"]) || typeof input["taskId"] === "string" ? scopeNodes(host, input) : undefined;
  const openTaskNodes = new Set(host.tasks().filter((t) => t.status !== "done").flatMap((t) => t.requirementIds));
  const states = new Map(host.states(fw).map((s) => [s.nodeId, s]));
  const capacity = Number(input["weeklyCapacityHours"] ?? Math.max(8, host.workspace().profile.securityTeamSize * 12));
  const maxTasks = Number(input["maxTasks"] ?? 10);
  host.step({ type: "plan", title: `Plan ${frameworkLabel(fw)} work`, detail: `Capacity ${capacity} h/week; skipping ${openTaskNodes.size} requirement(s) that already have open tasks.` });
  const planned = planTasks(index, states, {
    workspaceId: host.workspace().id,
    startDate: new Date(),
    weeklyCapacityHours: capacity,
    nodeIds: scoped?.map((n) => n.id),
    existingTaskNodeIds: openTaskNodes,
    maxTasks,
    idFactory: () => newId("chk"),
  });
  const lines = [`Planned ${planned.length} task(s) for ${frameworkLabel(fw)}, highest priority × gap first:`, ""];
  for (const t of planned) {
    await proposeTask.run(host, {
      title: t.title,
      description: t.description,
      kind: t.kind,
      priority: t.priority,
      requirementIds: t.requirementIds,
      dueDate: t.dueDate,
      effortHours: t.effortHours,
      checklist: t.checklist.map((c) => c.text),
    });
    lines.push(`- **${t.title}** — ${t.kind}, ${t.priority}, ${t.effortHours} h, due ${t.dueDate} (basis: ${t.source?.basis})`);
  }
  if (!planned.length) lines.push("No gaps without open tasks — the plan is already complete for this scope.");
  if (planned.length) await focus.run(host, { nodeIds: planned.flatMap((t) => t.requirementIds).slice(0, 30), lens: "gap", note: "Planned work" });
  return lines.join("\n");
};

// ---------------------------------------------------------------------------
// Policy author
// ---------------------------------------------------------------------------

const policyAuthor: Playbook = async (host, _goal, input) => {
  let nodes = scopeNodes(host, input, 0);
  if (!nodes.length) {
    const code = typeof input["category"] === "string" ? (input["category"] as string) : "GV.PO";
    const node = host.registry.node(code);
    nodes = node ? host.registry.framework(node.frameworkId)!.assessableUnder(node.id) : [];
  }
  if (!nodes.length) return "Tell me which requirements or category the policy should cover.";
  const template = templateFor(nodes[0]!);
  // Pull in sibling outcomes the same template governs so the policy is complete.
  const index = host.registry.framework(nodes[0]!.frameworkId)!;
  const parent = nodes[0]!.parentId ? index.byId.get(nodes[0]!.parentId) : undefined;
  if (parent && nodes.length < 3) {
    for (const sibling of index.assessableUnder(parent.id)) if (!nodes.some((n) => n.id === sibling.id)) nodes.push(sibling);
  }
  host.step({ type: "plan", title: `Draft “${template.title}”`, detail: `Covering ${nodes.map((n) => n.code).join(", ")}`, nodeIds: nodes.map((n) => n.id) });
  const ws = host.workspace();
  const mappings = new Map<string, string[]>();
  for (const n of nodes) {
    const related = host.registry.crosswalk.related(n.id).filter((e) => frameworkOf(e.to) !== n.frameworkId);
    mappings.set(n.id, related.map((e) => `${codeOf(e.to)} (${frameworkLabel(frameworkOf(e.to))})`));
  }
  const citations = citeFor(host, nodes[0]!, 2);
  if (citations.length) host.step({ type: "citation", title: "Official basis", citations });
  const body = composePolicy({
    template,
    org: ws.name,
    industry: ws.profile.industry,
    size: ws.profile.size,
    nodes,
    mappings,
    citations: citations.map((c) => ({ title: c.documentTitle, page: c.page })),
    effectiveDate: new Date().toISOString().slice(0, 10),
  });
  await proposePolicy.run(host, {
    title: template.title,
    requirementIds: nodes.map((n) => n.id),
    body,
    citations: citations.map((c) => ({ documentId: c.documentId, page: c.page, quote: c.quote })),
  });
  if (typeof input["taskId"] === "string") {
    await updateTask.run(host, { taskId: input["taskId"] as string, status: "in-review", note: `Draft “${template.title}” proposed — approve the policy to complete this task.` });
  }
  return `Drafted **${template.title}** covering ${nodes.length} requirement(s) (${nodes.map((n) => n.code).join(", ")}). Review the draft in the approvals queue, tailor it, and approve to publish.`;
};

// ---------------------------------------------------------------------------
// Evidence collector
// ---------------------------------------------------------------------------

const evidenceCollector: Playbook = async (host, _goal, input) => {
  const lines: string[] = [];
  const connectors = host.connectors().filter((c) => c.status === "active");
  host.step({ type: "plan", title: "Collect evidence", detail: `${connectors.length} active connector(s); then look for missing and expiring evidence.` });
  if (connectors.length) {
    const res = (await runChecks.run(host, {})) as { connectors?: { connector: string; results: { check: string; outcome: string; detail: string; requirements: string[] }[]; evidenceProposals: number }[] };
    for (const c of res.connectors ?? []) {
      const pass = c.results.filter((r) => r.outcome === "pass").length;
      lines.push(`**${c.connector}** — ${pass}/${c.results.length} checks passing${c.evidenceProposals ? `; ${c.evidenceProposals} proposed as evidence` : ""}.`);
      for (const r of c.results.filter((x) => x.outcome !== "pass")) lines.push(`- ${r.outcome.toUpperCase()}: ${r.check} — ${r.detail}`);
    }
  } else lines.push("No active connectors — add a Web Posture or Repository connector to automate evidence.");

  const scope = Array.isArray(input["nodeIds"]) ? scopeNodes(host, input) : undefined;
  const now = Date.now();
  const expiring = host.evidence().filter((e) => e.status === "accepted" && e.validUntil && new Date(e.validUntil).getTime() - now < 30 * 86_400_000);
  const missing: RequirementNode[] = [];
  for (const fw of enabledFrameworks(host)) {
    for (const n of host.registry.framework(fw)!.assessable) {
      if (scope && !scope.some((x) => x.id === n.id)) continue;
      const s = host.state(n.id);
      if (!s?.applicable || s.current < 2) continue;
      if (!host.evidence().some((e) => e.requirementIds.includes(n.id) && isEvidenceValid(e))) missing.push(n);
    }
  }
  const openEvidenceTasks = new Set(host.tasks().filter((t) => t.kind === "evidence" && t.status !== "done").flatMap((t) => t.requirementIds));
  let created = 0;
  for (const n of missing) {
    if (created >= 6 || openEvidenceTasks.has(n.id)) continue;
    await proposeTask.run(host, {
      title: `${n.code} · Collect evidence of implementation`,
      description: `The requirement is assessed at level ${host.state(n.id)?.current} but has no valid evidence. Collect artifacts that demonstrate: ${n.text}`,
      kind: "evidence",
      priority: host.state(n.id)?.priority ?? "medium",
      requirementIds: [n.id],
      checklist: ["Identify the system of record", "Export or screenshot the configuration / record", "Upload and link the evidence", "Request review"],
    });
    created++;
  }
  for (const e of expiring.slice(0, 4)) {
    await proposeTask.run(host, {
      title: `Refresh evidence: ${shortStatement(e.title, 80)}`,
      description: `Evidence “${e.title}” expires on ${e.validUntil?.slice(0, 10)}. Collect a current version before it lapses.`,
      kind: "evidence",
      priority: "high",
      requirementIds: e.requirementIds,
      dueDate: e.validUntil?.slice(0, 10),
    });
  }
  lines.push("");
  lines.push(`${missing.length} implemented requirement(s) lack valid evidence; proposed ${created} collection task(s). ${expiring.length} accepted item(s) expire within 30 days.`);
  if (missing.length) await focus.run(host, { nodeIds: missing.slice(0, 20).map((n) => n.id), lens: "evidence", note: "Requirements missing evidence" });
  return lines.join("\n");
};

// ---------------------------------------------------------------------------
// Crosswalk analyst
// ---------------------------------------------------------------------------

const crosswalkAnalyst: Playbook = async (host, _goal, input) => {
  const refused = unusableFramework(host, input);
  if (refused) return refused;
  const targets = (typeof input["framework"] === "string" ? [input["framework"] as string] : enabledFrameworks(host).filter((f) => f !== "nist-csf-2.0")).filter((f) => !isThreatFramework(host, f));
  const allStates = new Map(host.states().map((s) => [s.nodeId, s]));
  const lines: string[] = [];
  host.step({ type: "plan", title: "Project progress across frameworks", detail: `Targets: ${targets.map(frameworkLabel).join(", ") || "none"} · ${host.registry.crosswalk.size} authoritative mappings loaded` });
  let total = 0;
  for (const fw of targets) {
    const index = host.registry.framework(fw);
    if (!index) continue;
    const projections = projectLevels(host.registry.crosswalk as CrosswalkIndex, index.assessable.map((n) => n.id), allStates);
    const candidates = projections
      .filter((p) => {
        const s = host.state(p.nodeId);
        return s?.applicable && p.suggested > s.current && p.confidence !== "low";
      })
      .slice(0, Number(input["maxProposals"] ?? 15));
    lines.push(`**${frameworkLabel(fw)}** — ${projections.length} requirement(s) have mapped progress; ${candidates.length} can be raised with medium/high confidence.`);
    for (const p of candidates) {
      const node = index.byId.get(p.nodeId)!;
      const family = index.graph.framework.family;
      const sources = p.sources.slice(0, 5).map((s) => `${codeOf(s.nodeId)} at level ${s.level} (${s.relationship})`).join(", ");
      await proposeAssessment.run(host, {
        nodeId: p.nodeId,
        current: p.suggested,
        rationale: `Crosswalk projection: ${sources}. Suggested ${levelLabel(family, p.suggested)}; confirm with evidence before audit.`,
        confidence: p.confidence,
      });
      lines.push(`- ${node.code} → ${levelLabel(family, p.suggested)} (${p.confidence}) via ${sources}`);
      total++;
    }
  }
  if (!total) lines.push("No projections strong enough to propose — progress in the source framework or more mappings are needed.");
  return lines.join("\n");
};

// ---------------------------------------------------------------------------
// Audit prep
// ---------------------------------------------------------------------------

const auditorPrep: Playbook = async (host, _goal, input) => {
  const refused = unusableFramework(host, input);
  if (refused) return refused;
  const fw = typeof input["framework"] === "string" ? (input["framework"] as string) : enabledFrameworks(host).includes("aicpa-tsc-2017") ? "aicpa-tsc-2017" : primaryFramework(host, input);
  const index = host.registry.framework(fw)!;
  const score = host.score(fw);
  host.step({ type: "plan", title: `Readiness review: ${frameworkLabel(fw)}`, detail: "Check gaps, evidence, policies and overdue work like an independent assessor." });
  const now = new Date();
  const gaps = index.assessable.filter((n) => {
    const s = host.state(n.id);
    return s?.applicable && s.target > s.current;
  });
  const noEvidence = index.assessable.filter((n) => {
    const s = host.state(n.id);
    return s?.applicable && s.current >= 2 && !host.evidence().some((e) => e.requirementIds.includes(n.id) && isEvidenceValid(e, now));
  });
  const atRisk = index.assessable.filter((n) => statusOf(host, n.id)?.status === "at-risk");
  const draftPolicies = host.policies().filter((p) => p.status === "draft" || p.status === "in-review");
  const overdue = host.tasks().filter((t) => t.status !== "done" && t.dueDate && t.dueDate < now.toISOString().slice(0, 10));
  const lines = [
    `## Readiness brief — ${frameworkLabel(fw)}`,
    "",
    `- Readiness: **${pct(score.overall.readiness)}** across ${score.overall.total} in-scope ${index.graph.framework.unitLabelPlural}`,
    `- Evidence coverage: **${pct(score.overall.evidenceCoverage)}**; verified: ${pct(score.overall.verifiedShare)}`,
    `- Open gaps: ${gaps.length} · Implemented without evidence: ${noEvidence.length} · At risk: ${atRisk.length}`,
    `- Policies awaiting approval: ${draftPolicies.length} · Overdue tasks: ${overdue.length}`,
    "",
  ];
  const blockers: { node: RequirementNode; why: string }[] = [
    ...atRisk.map((n) => ({ node: n, why: statusOf(host, n.id)?.reasons.join("; ") ?? "at risk" })),
    ...noEvidence.map((n) => ({ node: n, why: "no valid evidence for an implemented requirement" })),
  ].slice(0, 8);
  if (blockers.length) {
    lines.push("### Blocking items an assessor would flag");
    for (const b of blockers) lines.push(`- **${b.node.code}** — ${b.why}`);
    lines.push("");
  }
  const existing = new Set(host.tasks().filter((t) => t.status !== "done").flatMap((t) => t.requirementIds));
  let proposed = 0;
  for (const b of blockers) {
    if (existing.has(b.node.id) || proposed >= 5) continue;
    await proposeTask.run(host, {
      title: `${b.node.code} · Resolve audit blocker`,
      description: `${b.why}. Requirement: ${b.node.text}`,
      kind: "evidence",
      priority: "high",
      requirementIds: [b.node.id],
    });
    proposed++;
  }
  if (fw === "aicpa-tsc-2017") {
    const settings = host.workspace().frameworks.find((f) => f.frameworkId === fw)?.soc2;
    lines.push(`Report: SOC 2 ${settings?.reportType === "type1" ? "Type 1" : "Type 2"}${settings?.observationStart ? `, observation ${settings.observationStart} → ${settings.observationEnd}` : ""}. Export the PBC (provided-by-client) evidence request list from Reports.`);
  }
  lines.push(`Proposed ${proposed} remediation task(s). This brief does not predict an audit opinion; it shows what an assessor is likely to request.`);
  await focus.run(host, { nodeIds: blockers.map((b) => b.node.id).concat(gaps.slice(0, 10).map((n) => n.id)).slice(0, 30), lens: "status", note: "Audit blockers and gaps" });
  return lines.join("\n");
};

// ---------------------------------------------------------------------------
// Task executor
// ---------------------------------------------------------------------------

const taskExecutor: Playbook = async (host, goal, input) => {
  const taskId = typeof input["taskId"] === "string" ? (input["taskId"] as string) : undefined;
  const task: Task | undefined = taskId ? host.tasks().find((t) => t.id === taskId) : undefined;
  if (!task) return "Select a task to execute.";
  const action = task.automation?.action ?? "implementation-guide";
  host.step({ type: "plan", title: `Execute “${task.title}”`, detail: `Action: ${action}`, nodeIds: task.requirementIds });
  if (action === "draft-policy" || action === "draft-procedure") return policyAuthor(host, goal, { taskId: task.id });
  if (action === "collect-evidence" || action === "run-checks") {
    const out = await evidenceCollector(host, goal, { nodeIds: task.requirementIds });
    await updateTask.run(host, { taskId: task.id, status: "in-review", note: "Checks run and evidence proposals staged." });
    return out;
  }
  if (action === "assess-requirement") {
    const out = await assessor(host, goal, { nodeIds: task.requirementIds });
    await updateTask.run(host, { taskId: task.id, status: "in-review", note: "Assessment proposals staged." });
    return out;
  }
  // Implementation guide: a concrete, reviewable runbook grounded in the requirement and its mappings.
  const nodes = task.requirementIds.map((id) => host.registry.node(id)).filter((n): n is RequirementNode => !!n);
  const guide: string[] = [`# Implementation guide — ${task.title}`, "", `Prepared for ${host.workspace().name}.`, ""];
  for (const node of nodes) {
    guide.push(`## ${node.code}`, "", `**Outcome:** ${node.text}`, "");
    const related = host.registry.crosswalk.related(node.id).filter((e) => frameworkOf(e.to) === "nist-sp-800-53-r5").slice(0, 6);
    if (related.length) {
      guide.push("**Control guidance (SP 800-53 Rev. 5 mappings):**", "");
      for (const e of related) {
        const c = host.registry.node(e.to);
        if (c) guide.push(`- **${c.code} ${c.title}** — ${shortStatement(c.text, 220)}`);
      }
      guide.push("");
    }
  }
  guide.push("## Steps", "");
  task.checklist.forEach((c, i) => guide.push(`${i + 1}. ${c.text}`));
  guide.push("", "## Verification", "", "- Confirm the outcome is achieved in production, not only documented.", "- Capture evidence (configuration export, screenshot, record) with a date.", "- Link evidence to the requirement(s) and request review in Visua.");
  const citations = nodes[0] ? citeFor(host, nodes[0], 2) : [];
  if (citations.length) host.step({ type: "citation", title: "Official basis", citations });
  // A plan is not proof: the guide is attached to the task, never filed as evidence.
  await updateTask.run(host, { taskId: task.id, status: "in-progress", note: guide.join("\n") });
  return `Prepared an implementation guide for **${task.title}** with ${task.checklist.length} step(s) and mapped control guidance. Approve it to attach the guide to the task; evidence is collected only after the work is done.`;
};

export const PLAYBOOKS: Record<AgentKind, Playbook> = {
  copilot,
  assessor,
  planner,
  "policy-author": policyAuthor,
  "evidence-collector": evidenceCollector,
  "crosswalk-analyst": crosswalkAnalyst,
  "auditor-prep": auditorPrep,
  "task-executor": taskExecutor,
};

export async function runOffline(host: AgentHost, agent: AgentKind, goal: string, input: Record<string, unknown>): Promise<AgentResult> {
  const summary = await PLAYBOOKS[agent](host, goal, input);
  host.step({ type: "message", title: summary.split("\n").find((l) => l.trim())?.replace(/^[#*\-\s]+/, "").slice(0, 110) ?? "Done", detail: summary });
  return { summary, mode: "offline" };
}
