/**
 * Auditor-ready exports: the NIST CSF 2.0 Organizational Profile (official
 * template columns), the action plan, a readiness report, the SOC 2 PBC
 * (provided-by-client) evidence request list, and OSCAL SSP / POA&M.
 */
import { createHash } from "node:crypto";
import { codeOf, frameworkOf, groupStatus, effectiveEvidenceState, levelLabel, obligationTiming, type RequirementNode, type Workspace } from "@visua/core";
import { ValidationError, type VisuaService } from "./visua.ts";
import { canonical } from "../audit.ts";
import { captureExportSnapshot, EXPORT_SNAPSHOT_BASIS, type ExportSnapshot } from "./export-snapshot.ts";

const csvCell = (v: unknown) => {
  const raw = v === undefined || v === null ? "" : String(v);
  // Quoting alone does not prevent a spreadsheet from evaluating a formula.
  const s = /^[\s\u0000-\u001f\u007f-\u009f]*[=+@-]/u.test(raw) || /^[\t\r\n]/.test(raw) ? `'${raw}` : raw;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
export const toCsv = (rows: unknown[][]) => rows.map((r) => r.map(csvCell).join(",")).join("\r\n") + "\r\n";

async function frozen(svc: VisuaService, ws: Workspace, snapshot?: ExportSnapshot): Promise<ExportSnapshot> {
  if (snapshot && snapshot.workspace.id !== ws.id) throw new ValidationError("Export snapshot belongs to another workspace");
  return snapshot ?? captureExportSnapshot(svc, ws);
}
function selected(svc: VisuaService, snapshot: ExportSnapshot, id: string) {
  const index = svc.registry.framework(id);
  if (!index || !snapshot.frameworkIds.includes(id)) throw new ValidationError(`Framework '${id}' is not selected for this export`);
  return index;
}
function context(snapshot: ExportSnapshot) {
  const { evidence, tasks, policies } = snapshot;
  const at = new Date(snapshot.asOf);
  return {
    evidenceFor: (id: string) => evidence.filter(e => e.requirementIds.includes(id) && effectiveEvidenceState(e, evidence, at, id).status === "valid"),
    tasksFor: (id: string) => tasks.filter(t => t.requirementIds.includes(id)),
    policiesFor: (id: string) => policies.filter(p => p.requirementIds.includes(id)),
    states: new Map(snapshot.states.map(state => [state.nodeId, state])),
  };
}
/** Apply recorded signal times to scoring without changing the raw captured records. */
export function exportScoreInput(snapshot: ExportSnapshot) {
  const asOf = Date.parse(snapshot.asOf);
  return {
    ...snapshot,
    states: snapshot.states.map(state => !state.verifiedAt || Date.parse(state.verifiedAt) <= asOf ? state : { ...state, verifiedAt: undefined }),
    checks: snapshot.checks.filter(check => Number.isFinite(Date.parse(check.observedAt)) && Date.parse(check.observedAt) <= asOf),
  };
}
function scopeReason(node: RequirementNode, snapshot: ExportSnapshot): string | undefined {
  const state = snapshot.states.find(item => item.nodeId === node.id);
  if (node.withdrawn) return "Withdrawn from the source catalog";
  if (!state) return "Assessment state not recorded";
  if (!state.applicable) return state.applicabilityRationale || state.userExclusion?.rationale || "Not applicable; rationale not recorded";
  if (frameworkOf(node.id) === "us-state-ai-laws") {
    const timing = obligationTiming(node, snapshot.asOf.slice(0, 10));
    if (timing !== "in-force") return `${timing === "upcoming" ? "Not yet in effect" : "No longer in effect"} at ${snapshot.asOf}`;
  }
  return undefined;
}

/** NIST CSF 2.0 Organizational Profile, using the official template's columns. */
export async function csfProfileCsv(svc: VisuaService, ws: Workspace, snapshot?: ExportSnapshot): Promise<string> {
  const snap = await frozen(svc, ws, snapshot);
  ws = snap.workspace;
  const index = selected(svc, snap, "nist-csf-2.0");
  const ctx = context(snap), states = ctx.states;
  const score = svc.scoreOf(index, exportScoreInput(snap), new Date(snap.asOf));
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
    const st = states.get(node.id);
    const status = score.statuses.get(node.id);
    const approved = ctx.policiesFor(node.id).filter((p) => p.status === "approved" || p.status === "published");
    const openPolicyWork = ctx.tasksFor(node.id).filter((t) => t.status !== "done" && (t.kind === "policy" || t.kind === "procedure"));
    const openWork = ctx.tasksFor(node.id).filter((t) => t.status !== "done");
    const evidence = ctx.evidenceFor(node.id);
    rows.push([
      node.code,
      node.text,
      scopeReason(node, snap) ? "No" : "Yes",
      scopeReason(node, snap) ?? "",
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

export async function actionPlanCsv(svc: VisuaService, ws: Workspace, snapshot?: ExportSnapshot): Promise<string> {
  const snap = await frozen(svc, ws, snapshot);
  const rows: unknown[][] = [["Task", "Status", "Priority", "Kind", "Requirements", "Start", "Due", "Effort (h)", "Assignee", "Checklist done", "Basis", "Origin"]];
  for (const t of [...snap.tasks].sort((a, b) => (a.dueDate ?? "").localeCompare(b.dueDate ?? "") || a.id.localeCompare(b.id))) {
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

export async function evidenceIndexCsv(svc: VisuaService, ws: Workspace, snapshot?: ExportSnapshot): Promise<string> {
  const snap = await frozen(svc, ws, snapshot);
  const rows: unknown[][] = [["Evidence", "Kind", "Source", "Recorded review status", "Requirements", "Collected", "Valid until", "Reviewed by", "SHA-256", "Effective status", "Reasons", "Evaluated at", "Records captured at", "Record role"]];
  for (const e of snap.evidence) {
    const effective = effectiveEvidenceState(e, snap.evidence, new Date(snap.asOf));
    rows.push([e.title, e.kind, e.source, e.status, e.requirementIds.map((id) => `${codeOf(id)} (${frameworkOf(id)})`).join("; "), e.collectedAt, e.validUntil ?? "", e.reviewedBy ?? "", e.sha256 ?? "", effective.status, effective.reasons.join("; "), snap.asOf, snap.capturedAt, snap.dependencies.evidenceIds.includes(e.id) ? "Lineage dependency outside selected requirement scope" : "Selected requirement evidence"]);
  }
  return toCsv(rows);
}

/**
 * NIST AI RMF profile: current and target state for every outcome, with the Playbook
 * suggested actions and (for generative systems) Generative AI Profile actions in scope.
 */
export async function aiRmfProfileCsv(svc: VisuaService, ws: Workspace, snapshot?: ExportSnapshot): Promise<string> {
  const snap = await frozen(svc, ws, snapshot);
  ws = snap.workspace;
  const index = selected(svc, snap, "nist-ai-rmf");
  const ctx = context(snap), states = ctx.states;
  const score = svc.scoreOf(index, exportScoreInput(snap), new Date(snap.asOf));
  const generative = (svc.frameworkSettings(ws, "nist-ai-rmf")?.ai?.systems ?? []).some((s) => s.generative);
  const rows: unknown[][] = [["Function", "Category", "Outcome", "Outcome description", "In scope", "Current", "Target", "Status", "Owner", "Playbook suggested actions", "Generative AI Profile actions", "Open tasks", "Evidence on file", "Source", "Scope reason"]];
  for (const node of index.assessable) {
    const [fn, cat] = index.ancestors(node.id);
    const st = states.get(node.id);
    const actions = (node.attributes?.["suggestedActions"] as string[] | undefined) ?? [];
    const gai = (node.attributes?.["profileActions"] as { id: string }[] | undefined) ?? [];
    rows.push([
      fn?.code ?? "",
      cat?.code ?? "",
      node.code,
      node.text,
      scopeReason(node, snap) ? "No" : "Yes",
      levelLabel("ai", st?.current ?? 0),
      levelLabel("ai", st?.target ?? 0),
      score.statuses.get(node.id)?.status ?? "",
      st?.owner ?? "",
      actions.length,
      generative ? gai.map((a) => a.id).join("; ") : "",
      ctx.tasksFor(node.id).filter((t) => t.status !== "done").length,
      ctx.evidenceFor(node.id).map((e) => e.title).join("; "),
      `${node.citation.locator ?? node.code}${node.citation.page ? `, p. ${node.citation.page}` : ""}`,
      scopeReason(node, snap) ?? "",
    ]);
  }
  return toCsv(rows);
}

function pbcRequest(code: string): string {
  const categories: Record<string, string> = {
    CC1: "approved governance responsibilities, staff training records, and oversight meeting records",
    CC2: "current communication procedures and examples of internal and external security communications",
    CC3: "the current risk register, assessment method, and documented treatment decisions",
    CC4: "control monitoring results, identified deficiencies, and follow-up records",
    CC5: "approved control procedures and dated records showing those procedures were performed",
    CC6: "access inventories, authorization approvals, access reviews, and removal records",
    CC7: "monitoring alerts, incident records, and investigation and response records",
    CC8: "change requests, approvals, testing results, and deployment records",
    CC9: "vendor assessments, continuity plans, and recovery exercise results",
    A: "capacity monitoring, availability incident records, and recovery test results",
    C: "data classification, confidentiality safeguards, and secure disposal records",
    PI: "processing specifications, validation results, and exception handling records",
    P: "privacy notices, consent records, data requests, and privacy incident records",
  };
  const key = code.startsWith("CC") ? code.split(".")[0]! : code.match(/^[A-Z]+/)?.[0] ?? "";
  return `Visua-authored request for ${code}: provide ${categories[key] ?? "the approved procedure and dated operational records"}; identify the accountable owner, system scope, observation period, and a representative sample linked to this criterion. This is request guidance, not AICPA text.`;
}

/** SOC 2 PBC list: what an auditor will request per criterion, and what is already on file. */
export async function soc2PbcCsv(svc: VisuaService, ws: Workspace, snapshot?: ExportSnapshot): Promise<string> {
  const snap = await frozen(svc, ws, snapshot);
  ws = snap.workspace;
  const index = selected(svc, snap, "aicpa-tsc-2017");
  const ctx = context(snap), states = ctx.states;
  const score = svc.scoreOf(index, exportScoreInput(snap), new Date(snap.asOf));
  const rows: unknown[][] = [["Criterion", "Criterion reference", "In scope", "Points of focus", "Evidence requested (Visua-authored)", "Evidence on file", "Status", "Owner", "Scope reason"]];
  for (const node of index.assessable) {
    const st = states.get(node.id);
    const pof = (node.attributes?.["pointsOfFocus"] as { title: string }[] | undefined) ?? [];
    const onFile = ctx.evidenceFor(node.id);
    rows.push([
      node.code,
      `Criterion ${node.code}; consult the applicable AICPA source for its exact wording.`,
      scopeReason(node, snap) ? "No" : "Yes",
      pof.length,
      pbcRequest(node.code),
      onFile.map((e) => e.title).join("; "),
      score.statuses.get(node.id)?.status ?? "",
      st?.owner ?? "",
      scopeReason(node, snap) ?? "",
    ]);
  }
  return toCsv(rows);
}

export async function readinessMarkdown(svc: VisuaService, ws: Workspace, snapshot?: ExportSnapshot): Promise<string> {
  const snap = await frozen(svc, ws, snapshot);
  ws = snap.workspace;
  const lines = [`# ${ws.name} — Compliance readiness report`, "", `Records captured ${snap.capturedAt}; evaluated at ${snap.asOf}; workspace revision ${snap.revision}.`, "", EXPORT_SNAPSHOT_BASIS.records, EXPORT_SNAPSHOT_BASIS.audit, ""];
  if (snap.periodStart) lines.push(`Review period: ${snap.periodStart} through ${snap.asOf}. ${EXPORT_SNAPSHOT_BASIS.period}`, "");
  const states = context(snap).states;
  for (const id of snap.frameworkIds) {
    const index = selected(svc, snap, id);
    const score = svc.scoreOf(index, exportScoreInput(snap), new Date(snap.asOf));
    const fw = index.graph.framework;
    lines.push(`## ${fw.shortName}`, "");
    lines.push(score.overall.total ? `- Readiness: **${Math.round(score.overall.readiness * 100)}%** across ${score.overall.total} in-scope ${fw.unitLabelPlural}` : "- Readiness: no applicable requirements at the evaluation time.");
    if (score.overall.total) lines.push(`- Evidence coverage: ${Math.round(score.overall.evidenceCoverage * 100)}% · Verified: ${Math.round(score.overall.verifiedShare * 100)}% · Open gaps: ${score.overall.gaps}`);
    lines.push(`- Status: ${Object.entries(score.overall.counts).filter(([, n]) => n > 0).map(([status, n]) => `${status} ${n}`).join(", ") || "none"}`, "");
    lines.push(`| ${fw.levels[0]!.label} | Readiness | Gaps | Evidence |`, "|---|---|---|---|");
    for (const root of index.roots()) {
      const group = score.scores.get(root.id);
      if (!group?.total) continue;
      lines.push(`| ${root.code} ${root.title} | ${Math.round(group.readiness * 100)}% | ${group.gaps} | ${Math.round(group.evidenceCoverage * 100)}% |`);
    }
    const gaps = index.assessable.map(node => ({ node, state: states.get(node.id) })).filter(item => !scopeReason(item.node, snap) && item.state && item.state.target > item.state.current)
      .sort((a, b) => (b.state!.target - b.state!.current) - (a.state!.target - a.state!.current) || a.node.id.localeCompare(b.node.id)).slice(0, 10);
    if (gaps.length) {
      lines.push("", "Largest gaps:", "");
      for (const { node, state } of gaps) lines.push(`- **${node.code}** (${levelLabel(fw.family, state!.current)} → ${levelLabel(fw.family, state!.target)})`);
    }
    const excluded = index.assessable.filter(node => scopeReason(node, snap)).sort((a, b) => a.id.localeCompare(b.id));
    if (excluded.length) {
      lines.push("", "Excluded or outside the evaluation scope:", "");
      for (const node of excluded) lines.push(`- **${node.code}**: ${scopeReason(node, snap)}`);
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
const OSCAL_NS = "https://visua.dev/ns/oscal";
// Source identity recorded in corpus/nist-rmf/manifest.json. The upstream
// profile/catalog use OSCAL 1.2.2; this document is an SSP/POAM in 1.1.2.
export const OSCAL_SOURCE_PIN = {
  commit: "78650f02ad9321bb7b817846f8fbd4f2bcd620de",
  catalogSha256: "01f37cf90ea99d92242c936cbfbdebcc338eef1f71454e2acac36cc56e9bc062",
  baselineSha256: {
    low: "8fd206017c8d718b44bdef612c2ff321a9fd84d97a515c8ec33c4619accbef6e",
    moderate: "9030dbf1f13169947eb97eb101b4bd2f00d3c151b100455a923ac75803f00ea1",
    high: "60576970caef91b2cba56d46e5948b72e3b879434fc2a4840bc4179e5e75cfd7",
  },
} as const;
const sourceHref = (file: string) => `https://raw.githubusercontent.com/usnistgov/oscal-content/${OSCAL_SOURCE_PIN.commit}/nist.gov/SP800-53/rev5/json/${file}`;

/** RFC 4122 UUID v5, using the fixed URL namespace and unambiguous tuple keys. */
export function oscalUuid(workspaceId: string, purpose: string, entityId: string): string {
  const namespace = Buffer.from("6ba7b8119dad11d180b400c04fd430c8", "hex");
  const bytes = createHash("sha1").update(namespace).update(JSON.stringify([OSCAL_NS, workspaceId, purpose, entityId])).digest().subarray(0, 16);
  bytes[6] = (bytes[6]! & 0x0f) | 0x50;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
const prop = (name: string, value: string) => ({ name, ns: OSCAL_NS, value });
const documentId = (snap: ExportSnapshot, kind: string) => oscalUuid(snap.workspace.id, `${kind}-revision`, canonical([snap.revision, snap.asOf, snap.periodStart ?? null, snap.frameworkIds]));
function oscalMetadata(snap: ExportSnapshot, title: string, kind: string) {
  return {
    title, "last-modified": snap.capturedAt, version: `workspace-revision-${snap.revision}`, "oscal-version": OSCAL_VERSION,
    "document-ids": [{ scheme: `${OSCAL_NS}/document`, identifier: oscalUuid(snap.workspace.id, "logical-document", kind) }],
    props: [prop("evaluated-at", snap.asOf), prop("records-captured-at", snap.capturedAt), ...(snap.periodStart ? [prop("review-period-start", snap.periodStart)] : [])],
    remarks: `${EXPORT_SNAPSHOT_BASIS.records} ${EXPORT_SNAPSHOT_BASIS.period} Self-assessed implementation; not an audit conclusion or certification.`,
  };
}
function implementationStatus(current: number): string {
  if (current >= 3) return "implemented";
  if (current === 2) return "partial";
  if (current === 1) return "planned";
  return "not-implemented";
}

export async function oscalSsp(svc: VisuaService, ws: Workspace, snapshot?: ExportSnapshot): Promise<Record<string, unknown>> {
  const snap = await frozen(svc, ws, snapshot);
  ws = snap.workspace;
  const index = selected(svc, snap, "nist-sp-800-53-r5");
  const settings = ws.frameworks.find(f => f.frameworkId === index.id)?.rmf;
  if (!settings) throw new ValidationError("Configure NIST RMF / SP 800-53 before exporting an SSP");
  const baseline = settings.baseline;
  if (!baseline) throw new ValidationError("OSCAL SSP unavailable: no SP 800-53 baseline is configured. Select a baseline before exporting an SSP.");
  const states = context(snap).states;
  const inScope = index.assessable.filter(node => !scopeReason(node, snap)).sort((a, b) => a.id.localeCompare(b.id));
  if (!inScope.length) throw new ValidationError("OSCAL SSP unavailable: no applicable SP 800-53 controls are selected. OSCAL 1.1.2 requires at least one implemented-requirement; no controls were invented.");
  const id = (purpose: string, entity: string) => oscalUuid(ws.id, purpose, entity);
  const ownerParty = id("party", "workspace-organization"), thisSystem = id("component", "this-system");
  const systemState = settings.authorization?.decision === "ato" ? "operational" : "under-development";
  const excluded = index.assessable.filter(node => scopeReason(node, snap)).map(node => ({ requirementId: node.id, reason: scopeReason(node, snap) })).sort((a, b) => a.requirementId.localeCompare(b.requirementId));
  const tailoring = [...settings.tailoring].sort((a, b) => a.nodeId.localeCompare(b.nodeId) || a.action.localeCompare(b.action));
  const metadata = oscalMetadata(snap, `${settings.systemName} System Security Plan`, "ssp");
  const baselineHref = sourceHref(`NIST_SP-800-53_rev5_${baseline.toUpperCase()}-baseline_profile.json`);
  const informationTypes = settings.informationTypes.length ? [...settings.informationTypes].sort((a, b) => a.id.localeCompare(b.id)).map(type => ({
    uuid: id("information-type", type.id), title: type.name, description: `${type.name} (${type.id}); recorded workspace categorization.`,
    "confidentiality-impact": { base: `fips-199-${type.confidentiality}` }, "integrity-impact": { base: `fips-199-${type.integrity}` }, "availability-impact": { base: `fips-199-${type.availability}` },
  })) : [{ uuid: id("information-type", "not-recorded"), title: "Information types not recorded", description: "Information types have not been recorded in this workspace. This entry represents missing categorization data, not an assessed information type." }];
  return {
    "system-security-plan": {
      uuid: documentId(snap, "ssp"),
      metadata: {
        ...metadata,
        remarks: `${metadata.remarks} Local tailoring and excluded assessment states (Visua records): ${canonical({ tailoring, excluded })}`,
        props: [...metadata.props, prop("source-catalog-sha256", OSCAL_SOURCE_PIN.catalogSha256), prop("source-baseline-sha256", OSCAL_SOURCE_PIN.baselineSha256[baseline]), prop("assessment-catalog-sha256", createHash("sha256").update(canonical(index.graph)).digest("hex"))],
        links: [{ href: sourceHref("NIST_SP-800-53_rev5_catalog.json"), rel: "source" }],
        roles: [{ id: "system-owner", title: "System Owner" }],
        parties: [{ uuid: ownerParty, type: "organization", name: ws.name }],
        "responsible-parties": [{ "role-id": "system-owner", "party-uuids": [ownerParty] }],
      },
      "import-profile": { href: baselineHref, remarks: "Pinned NIST baseline source (content release 5.2.0; source OSCAL 1.2.2). Local tailoring is recorded separately below. This reference is not a resolved tailored profile and no cross-version profile resolution is claimed." },
      "system-characteristics": {
        "system-ids": [{ "identifier-type": "http://ietf.org/rfc/rfc4122", id: id("system", "workspace") }],
        "system-name": settings.systemName,
        description: settings.systemDescription || "System description not recorded.",
        ...(settings.categorization ? {
          "security-sensitivity-level": `fips-199-${settings.categorization.overall}`,
          "security-impact-level": { "security-objective-confidentiality": `fips-199-${settings.categorization.confidentiality}`, "security-objective-integrity": `fips-199-${settings.categorization.integrity}`, "security-objective-availability": `fips-199-${settings.categorization.availability}` },
        } : {}),
        "system-information": { "information-types": informationTypes },
        status: { state: systemState, remarks: "Derived from the workspace's recorded authorization state; no independent operational assessment is asserted." },
        "authorization-boundary": { description: "Authorization boundary details have not been recorded in Visua. Confirm the actual system boundary before relying on this SSP." },
      },
      "system-implementation": {
        users: [{ uuid: id("user-class", "not-recorded"), title: "System user details not recorded", remarks: "User categories and privileges have not been recorded; this placeholder makes the missing inventory explicit." }],
        components: [{ uuid: thisSystem, type: "this-system", title: "This System", description: settings.systemName, status: { state: systemState } }],
      },
      "control-implementation": {
        description: `Recorded control implementation against the ${baseline.toUpperCase()} baseline. Local scope decisions do not constitute a resolved OSCAL profile.`,
        "implemented-requirements": inScope.map(node => {
          const state = states.get(node.id)!;
          const status = implementationStatus(state.current);
          return {
            uuid: id("implemented-requirement", node.id), "control-id": String(node.attributes?.["oscalId"] ?? node.code.toLowerCase()),
            props: [prop("implementation-level", String(state.current)), prop("target-level", String(state.target))],
            "by-components": [{
              "component-uuid": thisSystem, uuid: id("by-component", node.id), description: state.notes || `${node.code}: ${levelLabel("rmf", state.current)} (self-assessed).`,
              "implementation-status": { state: status, remarks: state.current === 0 ? "Visua local state not-implemented: level zero records neither implementation nor a plan." : `Recorded RMF level ${state.current}: ${levelLabel("rmf", state.current)}. This is not an independent assessment conclusion.` },
            }],
          };
        }),
      },
    },
  };
}

export async function oscalPoam(svc: VisuaService, ws: Workspace, snapshot?: ExportSnapshot): Promise<Record<string, unknown>> {
  const snap = await frozen(svc, ws, snapshot);
  ws = snap.workspace;
  const states = context(snap).states;
  const items: Record<string, unknown>[] = [];
  const excluded: { requirementId: string; reason: string }[] = [];
  for (const frameworkId of snap.frameworkIds) {
    const index = selected(svc, snap, frameworkId);
    for (const node of [...index.assessable].sort((a, b) => a.id.localeCompare(b.id))) {
      const state = states.get(node.id);
      const reason = scopeReason(node, snap);
      if (reason) { excluded.push({ requirementId: node.id, reason }); continue; }
      if (!state || state.current >= state.target) continue;
      const related = snap.tasks.filter(task => task.requirementIds.includes(node.id) && task.status !== "done");
      items.push({
        uuid: oscalUuid(ws.id, "poam-item", node.id),
        title: `${node.code} below target (${levelLabel(index.graph.framework.family, state.current)} → ${levelLabel(index.graph.framework.family, state.target)})`,
        description: `Visua records implementation level ${state.current} below target ${state.target} for ${node.code} in ${index.graph.framework.shortName}. This is a recorded implementation gap, not an auditor finding or formal risk determination.`,
        props: [prop("framework", frameworkId), prop("requirement-id", node.id), prop("priority", state.priority)],
        remarks: related.length ? `Recorded remediation tasks: ${related.map(task => `${task.title}${task.dueDate ? ` (due ${task.dueDate})` : " (due date not recorded)"}`).join("; ")}` : "No remediation task scheduled yet.",
      });
    }
  }
  if (!items.length) throw new ValidationError("OSCAL POAM unavailable: no in-scope implementation gaps are recorded. OSCAL 1.1.2 requires at least one POAM item; no gap was invented.");
  return {
    "plan-of-action-and-milestones": {
      uuid: documentId(snap, "poam"), metadata: {
        ...oscalMetadata(snap, `${ws.name} Plan of Action and Milestones`, "poam"),
        remarks: `${EXPORT_SNAPSHOT_BASIS.records} ${EXPORT_SNAPSHOT_BASIS.period} Recorded implementation gaps, not audit findings. Excluded assessment states: ${canonical(excluded)}`,
      },
      "system-id": { "identifier-type": "http://ietf.org/rfc/rfc4122", id: oscalUuid(ws.id, "system", "workspace") },
      "poam-items": items,
    },
  };
}

export function nodeLabel(n: RequirementNode): string {
  return `${n.code}${n.title ? ` ${n.title}` : ""}`;
}
