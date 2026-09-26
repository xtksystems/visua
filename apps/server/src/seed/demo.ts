/**
 * Deterministic demo workspace: "Northwind Health", a fictional 120-person
 * digital-health SaaS company preparing for SOC 2 Type 2 and a FedRAMP
 * Moderate-style SP 800-53 program on top of a NIST CSF 2.0 foundation.
 * Everything is reproducible (seeded PRNG) so screenshots and tests are stable.
 */
import { CrosswalkIndex, codeOf, projectLevels, type Task } from "@visua/core";
import { REPO_ROOT } from "@visua/frameworks";
import type { VisuaService } from "../services/visua.ts";

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}
function rand(seed: string): number {
  let t = (hash(seed) + 0x6d2b79f5) >>> 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

/** Typical early-stage profile: governance and identity ahead, detection and recovery behind. */
const CURRENT_BY_CATEGORY: Record<string, [number, number]> = {
  "GV.OC": [2, 3],
  "GV.RM": [1, 2],
  "GV.RR": [2, 3],
  "GV.PO": [2, 3],
  "GV.OV": [1, 2],
  "GV.SC": [0, 2],
  "ID.AM": [1, 3],
  "ID.RA": [1, 2],
  "ID.IM": [0, 1],
  "PR.AA": [2, 3],
  "PR.AT": [1, 3],
  "PR.DS": [2, 3],
  "PR.PS": [1, 3],
  "PR.IR": [1, 2],
  "DE.CM": [1, 2],
  "DE.AE": [0, 2],
  "RS.MA": [1, 2],
  "RS.AN": [0, 1],
  "RS.CO": [1, 2],
  "RS.MI": [1, 2],
  "RC.RP": [0, 2],
  "RC.CO": [0, 1],
};

const daysFromNow = (d: number) => new Date(Date.now() + d * 86_400_000).toISOString();
const dateFromNow = (d: number) => daysFromNow(d).slice(0, 10);

export async function seedDemo(svc: VisuaService): Promise<string> {
  const existing = svc.store.workspaces.get("northwind-health");
  if (existing) return existing.id;
  const actor = "seed";
  const frameworks = ["nist-csf-2.0", "aicpa-tsc-2017", "nist-sp-800-53-r5"].filter((id) => svc.registry.framework(id));
  const ws = svc.createWorkspace(
    {
      name: "Northwind Health",
      description: "Digital-health SaaS for outpatient clinics (fictional demo workspace).",
      profile: {
        industry: "healthcare",
        size: "51-200",
        dataTypes: ["phi", "pii"],
        drivers: ["enterprise-customers", "cyber-insurance", "federal-customers"],
        environments: ["cloud"],
        maturityTier: 2,
        guidance: "guided",
        securityTeamSize: 3,
      },
      frameworks,
      soc2: { reportType: "type2", categories: ["security", "availability", "confidentiality"], observationStart: dateFromNow(-45), observationEnd: dateFromNow(135), auditFirm: "Independent CPA firm (to be engaged)" },
    },
    actor,
  );
  svc.updateWorkspace(ws.id, { autonomy: { "create-task": false }, trustCenter: { enabled: true, headline: "Northwind Health security & compliance", contactEmail: "security@northwind-health.example" } }, actor);
  svc.recordTierAssessment(ws.id, { "risk-strategy": 2, prioritization: 2, "executive-oversight": 2, awareness: 2, consistency: 2, "information-sharing": 3, monitoring: 2, "supplier-risk": 1 }, actor);

  // CSF 2.0 current profile.
  const csf = svc.registry.framework("nist-csf-2.0")!;
  svc.store.transaction(() => {
    for (const node of csf.assessable) {
      const [lo, hi] = CURRENT_BY_CATEGORY[node.code.slice(0, 5)] ?? [0, 2];
      const current = Math.min(hi, lo + Math.floor(rand(`csf:${node.code}`) * (hi - lo + 1)));
      const prev = svc.store.states.get(ws.id, node.id)!;
      svc.store.states.put(ws.id, {
        ...prev,
        current,
        owner: node.code.startsWith("GV") ? "CISO" : node.code.startsWith("PR.AA") ? "IT Lead" : node.code.startsWith("DE") || node.code.startsWith("RS") ? "Security Engineer" : "Platform Lead",
        updatedAt: daysFromNow(-20),
        updatedBy: actor,
      });
    }
  });

  // Project CSF progress onto SP 800-53 and SOC 2 through the authoritative crosswalks.
  const csfStates = new Map(svc.store.states.list(ws.id, "nist-csf-2.0").map((s) => [s.nodeId, s]));
  for (const fw of frameworks.filter((f) => f !== "nist-csf-2.0")) {
    const index = svc.registry.framework(fw)!;
    const projected = projectLevels(svc.registry.crosswalk as CrosswalkIndex, index.assessable.map((n) => n.id), csfStates);
    const byId = new Map(projected.map((p) => [p.nodeId, p]));
    svc.store.transaction(() => {
      for (const node of index.assessable) {
        const prev = svc.store.states.get(ws.id, node.id);
        if (!prev || !prev.applicable) continue;
        const p = byId.get(node.id);
        const jitter = rand(`${fw}:${node.code}`);
        const current = Math.max(0, Math.min(prev.target, (p?.suggested ?? 0) + (jitter > 0.7 ? 1 : 0) + (fw === "aicpa-tsc-2017" ? 1 : 0)));
        svc.store.states.put(ws.id, { ...prev, current, updatedAt: daysFromNow(-15), updatedBy: actor });
      }
    });
  }

  // RMF Categorize (FIPS 199 via SP 800-60 information types): high-water mark → MODERATE baseline.
  if (svc.frameworkSettings(svc.workspace(ws.id), "nist-sp-800-53-r5")) {
    svc.categorizeSystem(
      ws.id,
      {
        systemName: "Northwind Clinic Cloud",
        systemDescription: "Multi-tenant SaaS for outpatient scheduling, e-prescribing and billing.",
        informationTypes: [
          { id: "health-care-delivery", name: "Health care delivery services (PHI)", confidentiality: "moderate", integrity: "moderate", availability: "low" },
          { id: "scheduling", name: "Patient scheduling", confidentiality: "low", integrity: "moderate", availability: "moderate" },
          { id: "billing", name: "Billing and payments", confidentiality: "moderate", integrity: "moderate", availability: "low" },
        ],
        privacyBaseline: true,
      },
      actor,
    );
    svc.tailorControl(ws.id, "nist-sp-800-53-r5:PE-3", "remove", "Physical access control is inherited from the cloud provider's data centers (carve-out).", actor);
  }

  // RMF lifecycle: the demo system is prepared, categorized and has its baseline selected; implementation is under way.
  const rmf = svc.registry.framework("nist-rmf");
  if (rmf && svc.frameworkSettings(svc.workspace(ws.id), "nist-rmf")) {
    const stepLevel: Record<string, number> = { P: 3, C: 3, S: 3, I: 2, A: 1, R: 0, M: 1 };
    svc.store.transaction(() => {
      for (const node of rmf.assessable) {
        const prev = svc.store.states.get(ws.id, node.id);
        if (!prev || !prev.applicable) continue;
        const level = stepLevel[node.code.split("-")[0]!] ?? 0;
        const current = Math.max(0, Math.min(prev.target, level - (rand(`rmf:${node.code}`) > 0.8 ? 1 : 0)));
        svc.store.states.put(ws.id, { ...prev, current, owner: node.code.startsWith("R-") ? "Authorizing Official" : "System Owner", updatedAt: daysFromNow(-10), updatedBy: actor });
      }
    });
  }

  // Policies (approved ones become evidence automatically).
  const nodesUnder = (code: string) => csf.assessableUnder(csf.get(code)!.id).map((n) => n.id);
  const isp = svc.createPolicy(ws.id, { title: "Information Security Policy", body: policyBody("Information Security Policy", "establish management direction for protecting Northwind Health information"), requirementIds: [...nodesUnder("GV.PO"), ...nodesUnder("GV.OC").slice(0, 2)], owner: "CISO" }, actor);
  svc.updatePolicy(ws.id, isp.id, { status: "approved" }, "Dana Whitfield (CEO)");
  const acp = svc.createPolicy(ws.id, { title: "Identity and Access Control Policy", body: policyBody("Identity and Access Control Policy", "limit access to authorized users with MFA and least privilege"), requirementIds: nodesUnder("PR.AA"), owner: "IT Lead" }, actor);
  svc.updatePolicy(ws.id, acp.id, { status: "approved" }, "Dana Whitfield (CEO)");
  svc.createPolicy(ws.id, { title: "Incident Response Plan", body: policyBody("Incident Response Plan", "detect, contain and recover from incidents and notify affected parties"), requirementIds: nodesUnder("RS.MA"), owner: "Security Engineer", status: "in-review" } as never, actor);

  // Evidence on file (a few stale to exercise at-risk status).
  const evidenceSeeds: [string, string, number, "document" | "configuration" | "screenshot" | "report" | "attestation"][] = [
    ["PR.AA-01", "Okta user lifecycle export (joiner/mover/leaver)", 200, "configuration"],
    ["PR.AA-03", "MFA enforcement policy screenshot — Okta", 250, "screenshot"],
    ["PR.AA-05", "Quarterly access review sign-off Q2", 60, "attestation"],
    ["PR.DS-01", "AWS KMS encryption-at-rest configuration", 300, "configuration"],
    ["PR.DS-02", "TLS 1.2+ enforcement on load balancers", 280, "configuration"],
    ["PR.DS-11", "Backup restore test report", -12, "report"],
    ["PR.AT-01", "Security awareness training completion report", 150, "report"],
    ["ID.AM-01", "Hardware inventory export (Jamf)", 90, "configuration"],
    ["ID.AM-02", "Software and SaaS inventory", 120, "document"],
    ["GV.RR-02", "Security roles and responsibilities matrix", 330, "document"],
    ["GV.OC-03", "HIPAA and state privacy law obligations register", 210, "document"],
    ["DE.CM-01", "Network monitoring — GuardDuty findings dashboard", 20, "screenshot"],
    ["PR.PS-02", "Patch management SLA report", -3, "report"],
    ["RS.MA-01", "Incident response tabletop exercise minutes", 180, "report"],
  ];
  for (const [code, title, validDays, kind] of evidenceSeeds) {
    const node = csf.get(code);
    if (!node) continue;
    svc.createEvidence(
      ws.id,
      { title, kind, source: "manual", requirementIds: [node.id], status: "accepted", reviewedBy: "CISO", reviewedAt: daysFromNow(-10), collectedAt: daysFromNow(-30), validUntil: daysFromNow(validDays), content: `${title} — collected for ${code}.` },
      actor,
    );
  }
  for (const code of ["PR.AA-03", "PR.DS-01", "GV.RR-02"]) {
    const node = csf.get(code)!;
    const s = svc.store.states.get(ws.id, node.id)!;
    svc.store.states.put(ws.id, { ...s, current: Math.max(s.current, s.target), verifiedAt: daysFromNow(-5) });
  }

  // Action plan grounded in the official Implementation Examples.
  const tasks = svc.planWith(ws.id, "nist-csf-2.0", 18, actor);
  const statuses: Task["status"][] = ["done", "done", "in-progress", "in-progress", "in-review", "in-progress", "todo", "todo", "blocked"];
  tasks.forEach((t, i) => {
    const status = statuses[i] ?? "todo";
    const patch: Partial<Task> = { status };
    if (i === 2) patch.dueDate = dateFromNow(-4); // overdue → at-risk signal
    if (status === "done") patch.checklist = t.checklist.map((c) => ({ ...c, done: true }));
    if (status === "in-progress" || status === "in-review") patch.checklist = t.checklist.map((c, ci) => ({ ...c, done: ci < Math.ceil(t.checklist.length / 2) }));
    if (i % 3 === 0) patch.assignee = { type: "person", id: "u-ciso", name: "Morgan Lee (CISO)" };
    else if (i % 3 === 1) patch.assignee = { type: "person", id: "u-it", name: "Sam Ortiz (IT Lead)" };
    else patch.assignee = { type: "agent", id: t.automation?.agent ?? "task-executor", name: "Visua agent" };
    svc.updateTask(ws.id, t.id, patch, actor);
  });

  // Real, credential-free monitoring: scan this repository for secure-development signals.
  const repo = svc.createConnector(ws.id, { kind: "repo-scan", name: "Platform repository", config: { path: REPO_ROOT } }, actor);
  await svc.runConnector(ws.id, repo.id, actor).catch(() => []);
  svc.createConnector(ws.id, { kind: "web-posture", name: "Public website posture", config: { url: "https://www.nist.gov" } }, actor);

  svc.upsertRisk(ws.id, { title: "Ransomware disrupting clinic scheduling", description: "Encryption of production data stores would halt appointment scheduling for clinics.", likelihood: 3, impact: 5, treatment: "mitigate", status: "treating", requirementIds: nodesUnder("RC.RP").concat(nodesUnder("PR.DS").slice(-1)), owner: "CISO" }, actor);
  svc.upsertRisk(ws.id, { title: "Third-party EHR integration compromise", description: "A compromised EHR integration partner could exfiltrate PHI through API credentials.", likelihood: 2, impact: 5, treatment: "mitigate", status: "open", requirementIds: nodesUnder("GV.SC"), owner: "Platform Lead" }, actor);

  // A glass-box agent run awaiting approval, so the flight recorder has history.
  const run = svc.startRun(ws.id, { agent: "auditor-prep", goal: "Prepare a SOC 2 readiness brief and flag audit blockers", input: frameworks.includes("aicpa-tsc-2017") ? { framework: "aicpa-tsc-2017" } : {} }, "Morgan Lee (CISO)");
  await svc.waitForRun(run.id);
  const planner = svc.startRun(ws.id, { agent: "evidence-collector", goal: "Find implemented CSF outcomes without evidence and propose collection tasks", input: {} }, "Morgan Lee (CISO)");
  await svc.waitForRun(planner.id);

  return ws.id;
}

function policyBody(title: string, purpose: string): string {
  return [
    `# ${title}`,
    "",
    "## 1. Purpose",
    "",
    `The purpose of this policy is to ${purpose}.`,
    "",
    "## 2. Scope",
    "",
    "All Northwind Health workforce members, contractors, systems and data, including cloud services.",
    "",
    "## 3. Policy statements",
    "",
    "Northwind Health shall maintain, communicate and enforce the requirements in this document, review them annually, and track exceptions in the risk register.",
  ].join("\n");
}

export function describeSeed(svc: VisuaService, workspaceId: string): string {
  const ws = svc.workspace(workspaceId);
  return `${ws.name}: ${ws.frameworks.map((f) => codeOf(`x:${f.frameworkId}`)).join(", ")}`;
}
