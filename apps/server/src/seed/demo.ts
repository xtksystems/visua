/**
 * Deterministic demo workspace: "Northwind Health", a fictional 120-person
 * digital-health SaaS company preparing for SOC 2 Type 2 and a FedRAMP
 * Moderate-style SP 800-53 program on top of a NIST CSF 2.0 foundation.
 * Everything is reproducible (seeded PRNG) so screenshots and tests are stable.
 */
import { CrosswalkIndex, codeOf, projectLevels, type RequirementNode, type RequirementState, type Role, type Task } from "@visua/core";
import { REPO_ROOT } from "@visua/frameworks";
import type { AuthService } from "../auth/service.ts";
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

/** Fictional people for the developer sign-in screen: one per role, plus a consultant who works for two organizations. */
export const DEMO_PERSONAS: { email: string; name: string; title: string; orgs: Partial<Record<"northwind-health" | "contoso-bank", Role>> }[] = [
  { email: "morgan.lee@northwind-health.example", name: "Morgan Lee", title: "CISO", orgs: { "northwind-health": "owner" } },
  { email: "casey.nguyen@northwind-health.example", name: "Casey Nguyen", title: "IT director", orgs: { "northwind-health": "admin" } },
  { email: "priya.shah@northwind-health.example", name: "Priya Shah", title: "Compliance lead", orgs: { "northwind-health": "approver" } },
  { email: "sam.ortiz@northwind-health.example", name: "Sam Ortiz", title: "IT lead", orgs: { "northwind-health": "contributor" } },
  { email: "alex.kim@audit-partners.example", name: "Alex Kim", title: "External auditor", orgs: { "northwind-health": "auditor" } },
  { email: "jordan.park@northwind-health.example", name: "Jordan Park", title: "Board observer", orgs: { "northwind-health": "viewer" } },
  { email: "riley.chen@visua-partners.example", name: "Riley Chen", title: "vCISO consultant", orgs: { "northwind-health": "admin", "contoso-bank": "admin" } },
  { email: "taylor.brooks@contoso-bank.example", name: "Taylor Brooks", title: "Security lead, Contoso Bank", orgs: { "contoso-bank": "owner" } },
];

/** Demo organizations: Northwind Health (the demo workspace) and Contoso Bank (to show tenant separation). */
export async function seedDemoOrganizations(auth: AuthService): Promise<string> {
  const ids = auth.svc.store.identity;
  const existing = await ids.tenants.getBySlug("northwind-health");
  if (existing) return existing.id;
  const users = new Map<string, Awaited<ReturnType<AuthService["ensureUser"]>>>();
  for (const p of DEMO_PERSONAS) users.set(p.email, await auth.ensureUser(p.email, p.name));
  const tenants: Record<string, string> = {};
  for (const [slug, name] of [["northwind-health", "Northwind Health"], ["contoso-bank", "Contoso Bank"]] as const) {
    const owner = DEMO_PERSONAS.find((p) => p.orgs[slug] === "owner")!;
    const tenant = await auth.createTenant(name, users.get(owner.email)!, "seed", slug);
    tenants[slug] = tenant.id;
    for (const p of DEMO_PERSONAS) {
      const role = p.orgs[slug];
      if (role && role !== "owner") await auth.grantMembership(tenant.id, users.get(p.email)!, role, "seed");
    }
  }
  return tenants["northwind-health"]!;
}

const daysFromNow = (d: number) => new Date(Date.now() + d * 86_400_000).toISOString();
const dateFromNow = (d: number) => daysFromNow(d).slice(0, 10);

export async function seedDemo(svc: VisuaService, auth?: AuthService): Promise<string> {
  const existing = await svc.store.workspaces.get("northwind-health");
  if (existing) return existing.id;
  const tenantId = auth ? await seedDemoOrganizations(auth) : undefined;
  const actor = "seed";
  const frameworks = ["nist-csf-2.0", "aicpa-tsc-2017", "nist-sp-800-53-r5", "nist-ai-rmf", "us-state-ai-laws"].filter((id) => svc.registry.framework(id));
  const ws = await svc.createWorkspace(
    {
      tenantId,
      name: "Northwind Health",
      description: "Digital-health SaaS for outpatient clinics (fictional demo workspace).",
      profile: {
        industry: "healthcare",
        size: "51-200",
        dataTypes: ["phi", "pii"],
        drivers: ["enterprise-customers", "cyber-insurance", "federal-customers", "ai-systems"],
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
  await svc.updateWorkspace(ws.id, { autonomy: { "create-task": false }, trustCenter: { enabled: true, headline: "Northwind Health security & compliance", contactEmail: "security@northwind-health.example" } }, actor);
  await svc.recordTierAssessment(ws.id, { "risk-strategy": 2, prioritization: 2, "executive-oversight": 2, awareness: 2, consistency: 2, "information-sharing": 3, monitoring: 2, "supplier-risk": 1 }, actor);

  // CSF 2.0 current profile.
  // Historical assessment levels are seeded directly (bulk), then derived caches are invalidated.
  const seedStates = async (frameworkId: string, level: (node: RequirementNode, prev: RequirementState) => Partial<RequirementState> | undefined) => {
    const index = svc.registry.framework(frameworkId)!;
    const states = await svc.store.states.map(ws.id, frameworkId);
    const next: RequirementState[] = [];
    for (const node of index.assessable) {
      const prev = states.get(node.id);
      const patch = prev ? level(node, prev) : undefined;
      if (prev && patch) next.push({ ...prev, ...patch, updatedBy: actor });
    }
    await svc.store.states.putMany(ws.id, next);
    await svc.invalidate(ws.id);
  };

  const csf = svc.registry.framework("nist-csf-2.0")!;
  await seedStates("nist-csf-2.0", (node) => {
    const [lo, hi] = CURRENT_BY_CATEGORY[node.code.slice(0, 5)] ?? [0, 2];
    return {
      current: Math.min(hi, lo + Math.floor(rand(`csf:${node.code}`) * (hi - lo + 1))),
      owner: node.code.startsWith("GV") ? "CISO" : node.code.startsWith("PR.AA") ? "IT Lead" : node.code.startsWith("DE") || node.code.startsWith("RS") ? "Security Engineer" : "Platform Lead",
      updatedAt: daysFromNow(-20),
    };
  });

  // Project CSF progress onto SP 800-53 and SOC 2 through the authoritative crosswalks.
  const csfStates = await svc.store.states.map(ws.id, "nist-csf-2.0");
  for (const fw of frameworks.filter((f) => f !== "nist-csf-2.0")) {
    const index = svc.registry.framework(fw)!;
    const projected = projectLevels(svc.registry.crosswalk as CrosswalkIndex, index.assessable.map((n) => n.id), csfStates);
    const byId = new Map(projected.map((p) => [p.nodeId, p]));
    await seedStates(fw, (node, prev) => {
      if (!prev.applicable) return undefined;
      const p = byId.get(node.id);
      const jitter = rand(`${fw}:${node.code}`);
      return { current: Math.max(0, Math.min(prev.target, (p?.suggested ?? 0) + (jitter > 0.7 ? 1 : 0) + (fw === "aicpa-tsc-2017" ? 1 : 0))), updatedAt: daysFromNow(-15) };
    });
  }

  // RMF Categorize (FIPS 199 via SP 800-60 information types): high-water mark → MODERATE baseline.
  if (svc.frameworkSettings(await svc.workspace(ws.id), "nist-sp-800-53-r5")) {
    await svc.categorizeSystem(
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
    await svc.tailorControl(ws.id, "nist-sp-800-53-r5:PE-3", "remove", "Physical access control is inherited from the cloud provider's data centers (carve-out).", actor);
    // The no-show predictor is predictive AI: follow NIST's COSAiS overlay for it (pre-draft).
    if (svc.registry.overlay("nist-cosais-predictive-ai")) await svc.adoptOverlay(ws.id, "nist-cosais-predictive-ai", {}, actor);
  }

  // RMF lifecycle: the demo system is prepared, categorized and has its baseline selected; implementation is under way.
  const rmf = svc.registry.framework("nist-rmf");
  if (rmf && svc.frameworkSettings(await svc.workspace(ws.id), "nist-rmf")) {
    const stepLevel: Record<string, number> = { P: 3, C: 3, S: 3, I: 2, A: 1, R: 0, M: 1 };
    await seedStates("nist-rmf", (node, prev) => {
      if (!prev.applicable) return undefined;
      const level = stepLevel[node.code.split("-")[0]!] ?? 0;
      return {
        current: Math.max(0, Math.min(prev.target, level - (rand(`rmf:${node.code}`) > 0.8 ? 1 : 0))),
        owner: node.code.startsWith("R-") ? "Authorizing Official" : "System Owner",
        updatedAt: daysFromNow(-10),
      };
    });
  }

  // AI governance: an AI system inventory and a mid-maturity AI RMF profile (GOVERN ahead of MEASURE/MANAGE).
  const aiRmf = svc.registry.framework("nist-ai-rmf");
  if (aiRmf && svc.frameworkSettings(await svc.workspace(ws.id), "nist-ai-rmf")) {
    const systems: Parameters<typeof svc.upsertAiSystem>[1][] = [
      {
        name: "Clinical note summarizer",
        purpose: "Drafts visit summaries from clinician dictation for clinician review; never used for diagnosis or treatment decisions.",
        role: "deployer",
        lifecycle: "deploy-use",
        generative: true,
        provider: "Third-party LLM API under a business associate agreement (fictional)",
        riskTier: "high",
        owner: "Chief Medical Information Officer",
        dataTypes: ["phi", "pii"],
        humanOversight: "A clinician reviews, edits and signs every summary before it enters the record.",
      },
      {
        name: "Appointment no-show predictor",
        purpose: "Scores upcoming appointments for no-show likelihood so staff can send reminders; never blocks or reorders booking.",
        role: "developer-deployer",
        lifecycle: "operate-monitor",
        generative: false,
        provider: "In-house gradient-boosted model",
        riskTier: "moderate",
        owner: "Data Science Lead",
        dataTypes: ["pii"],
        humanOversight: "Front-desk staff decide whether to act on a score; monthly bias review across patient groups.",
      },
      {
        name: "Patient support assistant",
        purpose: "Answers scheduling and billing questions in the patient portal; hands off to staff for anything clinical.",
        role: "deployer",
        lifecycle: "verify-validate",
        generative: true,
        provider: "Third-party LLM API (fictional)",
        riskTier: "moderate",
        owner: "Patient Experience Manager",
        dataTypes: ["pii"],
        humanOversight: "Escalates to a person on clinical keywords, low confidence or on request.",
      },
    ];
    for (const s of systems) await svc.upsertAiSystem(ws.id, s, actor);
    const fnLevel: Record<string, number> = { GOVERN: 2, MAP: 2, MEASURE: 1, MANAGE: 1 };
    await seedStates("nist-ai-rmf", (node, prev) => {
      if (!prev.applicable) return undefined;
      const fn = aiRmf.ancestors(node.id)[0]?.code ?? "";
      const j = rand(`ai:${node.code}`);
      return {
        current: Math.max(0, Math.min(prev.target, (fnLevel[fn] ?? 1) + (j > 0.8 ? 1 : j < 0.2 ? -1 : 0))),
        owner: fn === "GOVERN" ? "AI Governance Committee" : "Data Science Lead",
        updatedAt: daysFromNow(-8),
      };
    });
  }

  // Cyber AI Profile (draft): secure the AI systems Northwind deploys and thwart AI-enabled attacks.
  if (svc.registry.overlay("nist-ir-8596-iprd")) {
    await svc.adoptOverlay(ws.id, "nist-ir-8596-iprd", { lenses: ["secure", "thwart"] }, actor);
    await svc.applyOverlayPriorities(ws.id, "nist-ir-8596-iprd", actor);
  }

  // U.S. state AI laws: the roles Northwind holds under the laws of the states it serves.
  // Roles a law does not define are skipped, so the seed follows the corpus as it evolves.
  const laws = svc.registry.framework("us-state-ai-laws");
  if (laws) {
    const decisions: [string, string[], string][] = [
      ["co-admt-act", ["deployer"], "Our patient-facing assistant helps route requests for health-care services in Colorado clinics."],
      ["tx-traiga", ["developer", "deployer"], "We build and operate AI features used by Texas clinics and their patients."],
      ["ca-ccpa-admt-regs", ["business"], "We process personal information of California residents above the CCPA thresholds."],
      ["ut-genai-disclosures", ["supplier"], "Patients in Utah interact with our generative AI assistant."],
    ];
    for (const [lawId, roles, note] of decisions) {
      const law = laws.graph.nodes.find((n) => n.kind === "law" && n.attributes?.["lawId"] === lawId);
      if (!law) continue;
      const defined = new Set(laws.childrenOf(law.id).flatMap((o) => (o.attributes?.["roles"] as string[] | undefined) ?? []));
      const held = roles.filter((r) => defined.has(r));
      if (held.length) await svc.setLawApplicability(ws.id, lawId, { roles: held, note }, "Dana Whitfield (CEO)");
    }
    await seedStates("us-state-ai-laws", (node, prev) => {
      if (!prev.applicable) return undefined;
      const j = rand(`law:${node.code}`);
      return { current: j > 0.75 ? 3 : j > 0.4 ? 2 : j > 0.15 ? 1 : 0, owner: "Privacy Counsel", updatedAt: daysFromNow(-12) };
    });
  }

  // Policies (approved ones become evidence automatically).
  const nodesUnder = (code: string) => csf.assessableUnder(csf.get(code)!.id).map((n) => n.id);
  const isp = await svc.createPolicy(ws.id, { title: "Information Security Policy", body: policyBody("Information Security Policy", "establish management direction for protecting Northwind Health information"), requirementIds: [...nodesUnder("GV.PO"), ...nodesUnder("GV.OC").slice(0, 2)], owner: "CISO" }, actor);
  await svc.updatePolicy(ws.id, isp.id, { status: "approved" }, "Dana Whitfield (CEO)");
  const acp = await svc.createPolicy(ws.id, { title: "Identity and Access Control Policy", body: policyBody("Identity and Access Control Policy", "limit access to authorized users with MFA and least privilege"), requirementIds: nodesUnder("PR.AA"), owner: "IT Lead" }, actor);
  await svc.updatePolicy(ws.id, acp.id, { status: "approved" }, "Dana Whitfield (CEO)");
  await svc.createPolicy(ws.id, { title: "Incident Response Plan", body: policyBody("Incident Response Plan", "detect, contain and recover from incidents and notify affected parties"), requirementIds: nodesUnder("RS.MA"), owner: "Security Engineer", status: "in-review" } as never, actor);

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
    await svc.createEvidence(
      ws.id,
      { title, kind, source: "manual", requirementIds: [node.id], status: "accepted", reviewedBy: "CISO", reviewedAt: daysFromNow(-10), collectedAt: daysFromNow(-30), validUntil: daysFromNow(validDays), content: `${title} — collected for ${code}.` },
      actor,
    );
  }
  const verified = new Set(["PR.AA-03", "PR.DS-01", "GV.RR-02"]);
  await seedStates("nist-csf-2.0", (node, s) => (verified.has(node.code) ? { current: Math.max(s.current, s.target), verifiedAt: daysFromNow(-5) } : undefined));

  // Action plan grounded in the official Implementation Examples.
  const tasks = await svc.planWith(ws.id, "nist-csf-2.0", 18, actor);
  const statuses: Task["status"][] = ["done", "done", "in-progress", "in-progress", "in-review", "in-progress", "todo", "todo", "blocked"];
  for (const [i, t] of tasks.entries()) {
    const status = statuses[i] ?? "todo";
    const patch: Partial<Task> = { status };
    if (i === 2) patch.dueDate = dateFromNow(-4); // overdue → at-risk signal
    if (status === "done") patch.checklist = t.checklist.map((c) => ({ ...c, done: true }));
    if (status === "in-progress" || status === "in-review") patch.checklist = t.checklist.map((c, ci) => ({ ...c, done: ci < Math.ceil(t.checklist.length / 2) }));
    if (i % 3 === 0) patch.assignee = { type: "person", id: "u-ciso", name: "Morgan Lee (CISO)" };
    else if (i % 3 === 1) patch.assignee = { type: "person", id: "u-it", name: "Sam Ortiz (IT Lead)" };
    else patch.assignee = { type: "agent", id: t.automation?.agent ?? "task-executor", name: "Visua agent" };
    await svc.updateTask(ws.id, t.id, patch, actor);
  }

  // Real, credential-free monitoring: scan this repository for secure-development signals.
  const repo = await svc.createConnector(ws.id, { kind: "repo-scan", name: "Platform repository", config: { path: REPO_ROOT } }, actor);
  await svc.runConnector(ws.id, repo.id, actor).catch(() => []);
  await svc.createConnector(ws.id, { kind: "web-posture", name: "Public website posture", config: { url: "https://www.nist.gov" } }, actor);

  await svc.upsertRisk(ws.id, { title: "Ransomware disrupting clinic scheduling", description: "Encryption of production data stores would halt appointment scheduling for clinics.", likelihood: 3, impact: 5, treatment: "mitigate", status: "treating", requirementIds: nodesUnder("RC.RP").concat(nodesUnder("PR.DS").slice(-1)), owner: "CISO" }, actor);
  await svc.upsertRisk(ws.id, { title: "Third-party EHR integration compromise", description: "A compromised EHR integration partner could exfiltrate PHI through API credentials.", likelihood: 2, impact: 5, treatment: "mitigate", status: "open", requirementIds: nodesUnder("GV.SC"), owner: "Platform Lead" }, actor);

  // A glass-box agent run awaiting approval, so the flight recorder has history.
  const run = await svc.startRun(ws.id, { agent: "auditor-prep", goal: "Prepare a SOC 2 readiness brief and flag audit blockers", input: frameworks.includes("aicpa-tsc-2017") ? { framework: "aicpa-tsc-2017" } : {} }, "Morgan Lee <morgan.lee@northwind-health.example>");
  await svc.waitForRun(run.id);
  const planner = await svc.startRun(ws.id, { agent: "evidence-collector", goal: "Find implemented CSF outcomes without evidence and propose collection tasks", input: {} }, "Morgan Lee <morgan.lee@northwind-health.example>");
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

export async function describeSeed(svc: VisuaService, workspaceId: string): Promise<string> {
  const ws = await svc.workspace(workspaceId);
  return `${ws.name}: ${ws.frameworks.map((f) => codeOf(`x:${f.frameworkId}`)).join(", ")}`;
}
