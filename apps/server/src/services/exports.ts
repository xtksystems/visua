/**
 * Auditor-ready exports: the NIST CSF 2.0 Organizational Profile (official
 * template columns), the action plan, a readiness report, the SOC 2 PBC
 * (provided-by-client) evidence request list, and OSCAL SSP / POA&M.
 */
import { randomUUID } from "node:crypto";
import { codeOf, frameworkOf, groupStatus, isEvidenceValid, levelLabel, type RequirementNode, type Workspace } from "@visua/core";
import type { VisuaService } from "./visua.ts";

const csvCell = (v: unknown) => {
  const s = v === undefined || v === null ? "" : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
export const toCsv = (rows: unknown[][]) => rows.map((r) => r.map(csvCell).join(",")).join("\r\n") + "\r\n";

function context(svc: VisuaService, ws: Workspace) {
  const evidence = svc.store.evidence.list(ws.id);
  const tasks = svc.store.tasks.list(ws.id);
  const policies = svc.store.policies.list(ws.id);
  return {
    evidenceFor: (id: string) => evidence.filter((e) => e.requirementIds.includes(id)),
    tasksFor: (id: string) => tasks.filter((t) => t.requirementIds.includes(id)),
    policiesFor: (id: string) => policies.filter((p) => p.requirementIds.includes(id)),
    tasks,
    evidence,
    policies,
  };
}

/** NIST CSF 2.0 Organizational Profile, using the official template's columns. */
export function csfProfileCsv(svc: VisuaService, ws: Workspace): string {
  const index = svc.registry.framework("nist-csf-2.0");
  if (!index) throw new Error("CSF 2.0 is not loaded");
  const score = svc.score(ws.id, index.id);
  const ctx = context(svc, ws);
  const header = [
    "CSF Outcome (Function, Category, or Subcategory)",
    "CSF Outcome Description",
    "Included in Profile?",
    "Rationale",
    "Current Priority",
    "Current Status",
    "Current Policies, Processes, and Procedures",
    "Current Internal Practices",
    "Current Roles and Responsibilities",
    "Current Selected Informative References",
    "Current Artifacts and Evidence",
    "Target Priority",
    "Target CSF Tier",
    "Target Policies, Processes, and Procedures",
    "Target Internal Practices",
    "Target Roles and Responsibilities",
    "Target Selected Informative References",
    "Notes",
    "Considerations",
  ];
  const rows: unknown[][] = [header];
  index.walk((node) => {
    const refs = (node.references ?? []).filter((r) => r.source.startsWith("SP 800-53")).map((r) => r.ref).slice(0, 10).join("; ");
    if (!node.assessable) {
      const s = score.scores.get(node.id);
      rows.push([
        node.code,
        `${node.title}: ${node.text}`,
        "Yes",
        "",
        "",
        s ? `${groupStatus(s)} — readiness ${Math.round(s.readiness * 100)}%, ${s.gaps} gap(s)` : "",
        "",
        "",
        "",
        refs,
        "",
        "",
        "",
        "",
        "",
        "",
        refs,
        "",
        "",
      ]);
      return;
    }
    const st = svc.store.states.get(ws.id, node.id);
    const status = score.statuses.get(node.id);
    const approved = ctx.policiesFor(node.id).filter((p) => p.status === "approved" || p.status === "published");
    const openPolicyWork = ctx.tasksFor(node.id).filter((t) => t.status !== "done" && (t.kind === "policy" || t.kind === "procedure"));
    const openWork = ctx.tasksFor(node.id).filter((t) => t.status !== "done");
    const evidence = ctx.evidenceFor(node.id).filter((e) => isEvidenceValid(e));
    rows.push([
      node.code,
      node.text,
      st?.applicable === false ? "No" : "Yes",
      st?.applicabilityRationale ?? "",
      st?.priority ?? "",
      st ? `${levelLabel("csf", st.current)} (level ${st.current}) — ${status?.status ?? ""}` : "",
      approved.map((p) => `${p.title} v${p.version}`).join("; "),
      st?.notes ?? "",
      st?.owner ?? "",
      refs,
      evidence.map((e) => e.title).join("; "),
      st?.priority ?? "",
      st ? `${levelLabel("csf", st.target)} (level ${st.target})` : "",
      openPolicyWork.map((t) => t.title).join("; "),
      openWork.filter((t) => !openPolicyWork.includes(t)).map((t) => t.title).join("; "),
      st?.owner ?? "",
      refs,
      st && st.target > st.current ? `Gap of ${st.target - st.current} level(s)` : "",
      status?.reasons.join("; ") ?? "",
    ]);
  });
  return toCsv(rows);
}

export function actionPlanCsv(svc: VisuaService, ws: Workspace): string {
  const rows: unknown[][] = [["Task", "Status", "Priority", "Kind", "Requirements", "Start", "Due", "Effort (h)", "Assignee", "Checklist done", "Basis", "Origin"]];
  for (const t of svc.store.tasks.list(ws.id).sort((a, b) => (a.dueDate ?? "").localeCompare(b.dueDate ?? ""))) {
    rows.push([
      t.title,
      t.status,
      t.priority,
      t.kind,
      t.requirementIds.map(codeOf).join("; "),
      t.startDate ?? "",
      t.dueDate ?? "",
      t.effortHours ?? "",
      t.assignee?.name ?? "",
      `${t.checklist.filter((c) => c.done).length}/${t.checklist.length}`,
      t.source?.basis ?? "",
      t.origin,
    ]);
  }
  return toCsv(rows);
}

export function evidenceIndexCsv(svc: VisuaService, ws: Workspace): string {
  const rows: unknown[][] = [["Evidence", "Kind", "Source", "Status", "Requirements", "Collected", "Valid until", "Reviewed by", "SHA-256"]];
  for (const e of svc.store.evidence.list(ws.id)) {
    rows.push([e.title, e.kind, e.source, e.status, e.requirementIds.map((id) => `${codeOf(id)} (${frameworkOf(id)})`).join("; "), e.collectedAt, e.validUntil ?? "", e.reviewedBy ?? "", e.sha256 ?? ""]);
  }
  return toCsv(rows);
}

/**
 * NIST AI RMF profile: current and target state for every outcome, with the Playbook
 * suggested actions and (for generative systems) Generative AI Profile actions in scope.
 */
export function aiRmfProfileCsv(svc: VisuaService, ws: Workspace): string {
  const index = svc.registry.framework("nist-ai-rmf");
  if (!index) throw new Error("The NIST AI RMF is not loaded");
  const score = svc.score(ws.id, index.id);
  const ctx = context(svc, ws);
  const generative = (svc.frameworkSettings(ws, "nist-ai-rmf")?.ai?.systems ?? []).some((s) => s.generative);
  const rows: unknown[][] = [["Function", "Category", "Outcome", "Outcome description", "In scope", "Current", "Target", "Status", "Owner", "Playbook suggested actions", "Generative AI Profile actions", "Open tasks", "Evidence on file", "Source"]];
  for (const node of index.assessable) {
    const [fn, cat] = index.ancestors(node.id);
    const st = svc.store.states.get(ws.id, node.id);
    const actions = (node.attributes?.["suggestedActions"] as string[] | undefined) ?? [];
    const gai = (node.attributes?.["profileActions"] as { id: string }[] | undefined) ?? [];
    rows.push([
      fn?.code ?? "",
      cat?.code ?? "",
      node.code,
      node.text,
      st?.applicable === false ? "No" : "Yes",
      levelLabel("ai", st?.current ?? 0),
      levelLabel("ai", st?.target ?? 0),
      score.statuses.get(node.id)?.status ?? "",
      st?.owner ?? "",
      actions.length,
      generative ? gai.map((a) => a.id).join("; ") : "",
      ctx.tasksFor(node.id).filter((t) => t.status !== "done").length,
      ctx.evidenceFor(node.id).filter((e) => isEvidenceValid(e)).map((e) => e.title).join("; "),
      `${node.citation.locator ?? node.code}${node.citation.page ? `, p. ${node.citation.page}` : ""}`,
    ]);
  }
  return toCsv(rows);
}

/** SOC 2 PBC list: what an auditor will request per criterion, and what is already on file. */
export function soc2PbcCsv(svc: VisuaService, ws: Workspace): string {
  const index = svc.registry.framework("aicpa-tsc-2017");
  if (!index) throw new Error("SOC 2 (TSC) is not loaded");
  const ctx = context(svc, ws);
  const score = svc.score(ws.id, index.id);
  const rows: unknown[][] = [["Criterion", "Criterion text", "In scope", "Points of focus", "Evidence requested", "Evidence on file", "Status", "Owner"]];
  for (const node of index.assessable) {
    const st = svc.store.states.get(ws.id, node.id);
    const pof = (node.attributes?.["pointsOfFocus"] as { title: string }[] | undefined) ?? [];
    const onFile = ctx.evidenceFor(node.id).filter((e) => isEvidenceValid(e));
    rows.push([
      node.code,
      node.text,
      st?.applicable === false ? "No" : "Yes",
      pof.length,
      pof.slice(0, 6).map((p) => `Evidence that the entity ${p.title.charAt(0).toLowerCase()}${p.title.slice(1)}`).join("; "),
      onFile.map((e) => e.title).join("; "),
      score.statuses.get(node.id)?.status ?? "",
      st?.owner ?? "",
    ]);
  }
  return toCsv(rows);
}

export function readinessMarkdown(svc: VisuaService, ws: Workspace): string {
  const lines = [`# ${ws.name} — Compliance readiness report`, "", `Generated ${new Date().toISOString().slice(0, 16).replace("T", " ")} UTC by Visua.`, ""];
  for (const f of ws.frameworks.filter((x) => x.enabled)) {
    const index = svc.registry.framework(f.frameworkId);
    if (!index) continue;
    const score = svc.score(ws.id, f.frameworkId);
    const fw = index.graph.framework;
    lines.push(`## ${fw.shortName}`, "");
    lines.push(`- Readiness: **${Math.round(score.overall.readiness * 100)}%** across ${score.overall.total} in-scope ${fw.unitLabelPlural}`);
    lines.push(`- Evidence coverage: ${Math.round(score.overall.evidenceCoverage * 100)}% · Verified: ${Math.round(score.overall.verifiedShare * 100)}% · Open gaps: ${score.overall.gaps}`);
    const counts = score.overall.counts;
    lines.push(`- Status: ${Object.entries(counts).filter(([, n]) => n > 0).map(([s, n]) => `${s} ${n}`).join(", ")}`, "");
    lines.push(`| ${fw.levels[0]!.label} | Readiness | Gaps | Evidence |`, "|---|---|---|---|");
    for (const root of index.roots()) {
      const s = score.scores.get(root.id);
      if (!s || !s.total) continue;
      lines.push(`| ${root.code} ${root.title} | ${Math.round(s.readiness * 100)}% | ${s.gaps} | ${Math.round(s.evidenceCoverage * 100)}% |`);
    }
    const gaps = index.assessable
      .map((n) => ({ n, s: svc.store.states.get(ws.id, n.id) }))
      .filter((x) => x.s?.applicable && x.s.target > x.s.current)
      .sort((a, b) => b.s!.target - b.s!.current - (a.s!.target - a.s!.current))
      .slice(0, 10);
    if (gaps.length) {
      lines.push("", "Largest gaps:", "");
      for (const g of gaps) lines.push(`- **${g.n.code}** (${levelLabel(fw.family, g.s!.current)} → ${levelLabel(fw.family, g.s!.target)}): ${g.n.text.slice(0, 160)}`);
    }
    lines.push("");
  }
  lines.push("> Readiness reflects self-assessed implementation levels, evidence and monitoring in Visua. It is not an audit opinion or certification.");
  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// OSCAL
// ---------------------------------------------------------------------------

const OSCAL_VERSION = "1.1.2";

function implementationStatus(current: number, applicable: boolean): string {
  if (!applicable) return "not-applicable";
  if (current >= 3) return "implemented";
  if (current === 2) return "partial";
  if (current === 1) return "planned";
  return "planned";
}

export function oscalSsp(svc: VisuaService, ws: Workspace): Record<string, unknown> {
  const index = svc.registry.framework("nist-sp-800-53-r5");
  const settings = ws.frameworks.find((f) => f.frameworkId === "nist-sp-800-53-r5")?.rmf;
  if (!index || !settings) throw new Error("Enable NIST RMF / SP 800-53 for this workspace to export an SSP");
  const now = new Date().toISOString();
  const cat = settings.categorization;
  const level = cat?.overall ?? settings.baseline ?? "moderate";
  const ownerParty = randomUUID();
  const thisSystem = randomUUID();
  const inScope = index.assessable.filter((n) => svc.store.states.get(ws.id, n.id)?.applicable);
  return {
    "system-security-plan": {
      uuid: randomUUID(),
      metadata: {
        title: `${settings.systemName} System Security Plan`,
        "last-modified": now,
        version: "1.0",
        "oscal-version": OSCAL_VERSION,
        roles: [{ id: "system-owner", title: "System Owner" }, { id: "authorizing-official", title: "Authorizing Official" }],
        parties: [{ uuid: ownerParty, type: "organization", name: ws.name }],
        "responsible-parties": [{ "role-id": "system-owner", "party-uuids": [ownerParty] }],
        remarks: "Generated by Visua from the workspace's SP 800-53 Rev. 5 implementation state.",
      },
      "import-profile": { href: `https://raw.githubusercontent.com/usnistgov/oscal-content/main/nist.gov/SP800-53/rev5/json/NIST_SP-800-53_rev5_${level.toUpperCase()}-baseline_profile.json` },
      "system-characteristics": {
        "system-ids": [{ "identifier-type": "https://ietf.org/rfc/rfc4122", id: ws.id }],
        "system-name": settings.systemName,
        description: settings.systemDescription ?? `${settings.systemName} operated by ${ws.name}.`,
        "security-sensitivity-level": `fips-199-${level}`,
        "system-information": {
          "information-types": (settings.informationTypes.length ? settings.informationTypes : [{ id: "generic", name: "Organizational information", confidentiality: level, integrity: level, availability: level }]).map((t) => ({
            uuid: randomUUID(),
            title: t.name,
            description: `${t.name} (${t.id})`,
            "confidentiality-impact": { base: `fips-199-${t.confidentiality}` },
            "integrity-impact": { base: `fips-199-${t.integrity}` },
            "availability-impact": { base: `fips-199-${t.availability}` },
          })),
        },
        "security-impact-level": {
          "security-objective-confidentiality": `fips-199-${cat?.confidentiality ?? level}`,
          "security-objective-integrity": `fips-199-${cat?.integrity ?? level}`,
          "security-objective-availability": `fips-199-${cat?.availability ?? level}`,
        },
        status: { state: settings.authorization?.decision === "ato" ? "operational" : "under-development" },
        "authorization-boundary": { description: `The authorization boundary of ${settings.systemName} as defined by ${ws.name}.` },
      },
      "system-implementation": {
        users: [{ uuid: randomUUID(), title: "System administrators", "role-ids": ["system-owner"] }],
        components: [{ uuid: thisSystem, type: "this-system", title: "This System", description: settings.systemName, status: { state: "operational" } }],
      },
      "control-implementation": {
        description: `Control implementation for the ${level.toUpperCase()} baseline${settings.tailoring.length ? " with tailoring" : ""}.`,
        "implemented-requirements": inScope.map((n) => {
          const st = svc.store.states.get(ws.id, n.id);
          return {
            uuid: randomUUID(),
            "control-id": String(n.attributes?.["oscalId"] ?? n.code.toLowerCase()),
            props: [{ name: "implementation-status", value: implementationStatus(st?.current ?? 0, st?.applicable ?? true) }],
            "by-components": [
              {
                "component-uuid": thisSystem,
                uuid: randomUUID(),
                description: st?.notes || `${n.code} ${n.title} — ${levelLabel("rmf", st?.current ?? 0)}.`,
                "implementation-status": { state: implementationStatus(st?.current ?? 0, st?.applicable ?? true) },
              },
            ],
          };
        }),
      },
    },
  };
}

export function oscalPoam(svc: VisuaService, ws: Workspace): Record<string, unknown> {
  const now = new Date().toISOString();
  const items: Record<string, unknown>[] = [];
  const tasks = svc.store.tasks.list(ws.id);
  for (const f of ws.frameworks.filter((x) => x.enabled)) {
    const index = svc.registry.framework(f.frameworkId);
    if (!index) continue;
    for (const n of index.assessable) {
      const st = svc.store.states.get(ws.id, n.id);
      if (!st?.applicable || st.current >= st.target) continue;
      const related = tasks.filter((t) => t.requirementIds.includes(n.id) && t.status !== "done");
      items.push({
        uuid: randomUUID(),
        title: `${n.code} below target (${levelLabel(index.graph.framework.family, st.current)} → ${levelLabel(index.graph.framework.family, st.target)})`,
        description: n.text,
        props: [
          { name: "framework", ns: "https://visua.dev/ns/oscal", value: f.frameworkId },
          { name: "priority", ns: "https://visua.dev/ns/oscal", value: st.priority },
        ],
        remarks: related.length ? `Milestones: ${related.map((t) => `${t.title}${t.dueDate ? ` (due ${t.dueDate})` : ""}`).join("; ")}` : "No remediation task scheduled yet.",
      });
    }
  }
  return {
    "plan-of-action-and-milestones": {
      uuid: randomUUID(),
      metadata: { title: `${ws.name} Plan of Action and Milestones`, "last-modified": now, version: "1.0", "oscal-version": OSCAL_VERSION },
      "poam-items": items,
    },
  };
}

export function nodeLabel(n: RequirementNode): string {
  return `${n.code}${n.title ? ` ${n.title}` : ""}`;
}
