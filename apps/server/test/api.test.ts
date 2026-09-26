import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { FrameworkRegistry, REPO_ROOT } from "@visua/frameworks";
import { createApp } from "../src/app.ts";
import { loadAuthConfig } from "../src/auth/config.ts";
import { AuthService } from "../src/auth/service.ts";
import { CONNECTOR_KINDS } from "../src/connectors/index.ts";
import { createService } from "../src/context.ts";
import { seedDemo } from "../src/seed/demo.ts";
import { lawsOverview } from "../src/services/laws.ts";
import { nodeDetail } from "../src/services/views.ts";
import { TestClient } from "./client.ts";
import { testDatabase } from "./db.ts";

process.env["VISUA_AGENT_MODE"] = "offline";

const registry = FrameworkRegistry.load();
const db = await testDatabase("api");
const svc = await createService({ database: db.url, registry });
const auth = new AuthService(svc, { ...loadAuthConfig({}), mode: "dev" });
const app = createApp(svc, auth);

afterAll(async () => {
  await svc.store.close();
  await db.cleanup();
});

// The owner of a fresh organization: every capability.
const client = new TestClient(app);
await client.devLogin("owner@acme-fintech.example", "Ada Owner");
const api = <T = unknown>(method: string, path: string, body?: unknown) => client.request<T>(method, path, body ?? (method === "GET" ? undefined : {}));

let wsId = "";

describe("onboarding and assessment", () => {
  it("serves metadata about frameworks, agents and the corpus", async () => {
    const { status, json } = await api<{ frameworks: { id: string }[]; agents: unknown[]; corpus: unknown[]; ai: { mode: string } }>("GET", "/api/meta");
    expect(status).toBe(200);
    expect(json.frameworks.map((f) => f.id)).toEqual(expect.arrayContaining(["nist-csf-2.0", "nist-sp-800-53-r5", "nist-rmf"]));
    expect(json.agents).toHaveLength(8);
    expect(json.ai.mode).toBe("offline");
  });

  it("creates a maturity- and niche-adapted workspace", async () => {
    const { status, json } = await api<{ workspace: { id: string; frameworks: { frameworkId: string }[] }; frameworks: { id: string; total: number }[] }>("POST", "/api/workspaces", {
      name: "Acme Fintech",
      profile: { industry: "fintech", size: "11-50", dataTypes: ["financial", "pii"], drivers: ["enterprise-customers"], environments: ["cloud"], maturityTier: 1, guidance: "guided", securityTeamSize: 1 },
      frameworks: ["nist-csf-2.0", "nist-sp-800-53-r5"],
      planInitialTasks: true,
    });
    expect(status).toBe(201);
    wsId = json.workspace.id;
    expect(json.frameworks.find((f) => f.id === "nist-csf-2.0")?.total).toBe(106);
    // Moderate baseline by default: 287 controls in scope.
    expect(json.frameworks.find((f) => f.id === "nist-sp-800-53-r5")?.total).toBe(287);
    const tasks = await api<unknown[]>("GET", `/api/workspaces/${wsId}/tasks`);
    expect(tasks.json.length).toBe(12);
  });

  it("rejects invalid input with a 400", async () => {
    const res = await api("POST", "/api/workspaces", { name: "", profile: { industry: "unknown" } });
    expect(res.status).toBe(400);
  });

  it("accepts every profile driver the onboarding and settings screens offer, including AI systems", async () => {
    const res = await api<{ workspace: { profile: { drivers: string[] } } }>("PATCH", `/api/workspaces/${wsId}`, { profile: { drivers: ["enterprise-customers", "ai-systems"] } });
    expect(res.status).toBe(200);
    expect(res.json.workspace.profile.drivers).toEqual(["enterprise-customers", "ai-systems"]);
    const rec = await api<{ frameworks: { frameworkId: string }[] }>("POST", "/api/recommend", { industry: "saas", size: "11-50", drivers: ["ai-systems"] });
    expect(rec.status).toBe(200);
    expect(rec.json.frameworks.map((f) => f.frameworkId)).toContain("nist-ai-rmf");
  });

  it("updates a requirement and derives status", async () => {
    const res = await api<{ current: number }>("PATCH", `/api/workspaces/${wsId}/requirements/nist-csf-2.0:PR.AA-01`, { current: 3, target: 3, owner: "IT" });
    expect(res.status).toBe(200);
    expect(res.json.current).toBe(3);
    const detail = await api<{ status: { status: string }; mappings: unknown[]; source: { page: number } }>("GET", `/api/workspaces/${wsId}/requirements/nist-csf-2.0:PR.AA-01`);
    expect(detail.json.status.status).toBe("implemented");
    expect(detail.json.mappings.length).toBeGreaterThan(0);
    expect(detail.json.source.page).toBeGreaterThan(0);
    const state = await api<{ units: Record<string, { status: string }>; overall: { total: number } }>("GET", `/api/workspaces/${wsId}/frameworks/nist-csf-2.0/state`);
    expect(state.json.units["nist-csf-2.0:PR.AA-01"]?.status).toBe("implemented");
  });

  it("records a CSF Tier assessment from the official Tier statements", async () => {
    const res = await api<{ workspace: { profile: { maturityTier: number }; tierAssessment: { governanceTier: number; managementTier: number } } }>("POST", `/api/workspaces/${wsId}/tiers`, {
      answers: { "risk-strategy": 3, prioritization: 3, "executive-oversight": 2, awareness: 2, consistency: 2, "information-sharing": 3, monitoring: 2, "supplier-risk": 2 },
    });
    expect(res.json.workspace.tierAssessment.governanceTier).toBe(2);
    expect(res.json.workspace.profile.maturityTier).toBe(2);
  });
});

describe("RMF", () => {
  it("categorizes the system with FIPS 199 and re-scopes to the HIGH baseline", async () => {
    const res = await api<{ frameworks: { id: string; total: number; settings: { rmf: { baseline: string } } }[] }>("POST", `/api/workspaces/${wsId}/rmf/categorize`, {
      systemName: "Payments platform",
      informationTypes: [
        { id: "payments", name: "Payment transactions", confidentiality: "high", integrity: "high", availability: "moderate" },
        { id: "marketing", name: "Marketing content", confidentiality: "low", integrity: "low", availability: "low" },
      ],
    });
    const sp = res.json.frameworks.find((f) => f.id === "nist-sp-800-53-r5")!;
    expect(sp.settings.rmf.baseline).toBe("high");
    expect(sp.total).toBe(370);
  });

  it("tailors a control out with a rationale, recorded in the audit trail", async () => {
    expect((await api("POST", `/api/workspaces/${wsId}/rmf/tailor`, { nodeId: "nist-sp-800-53-r5:PE-3", action: "remove", rationale: "  " })).status).toBe(400);
    const res = await api<{ frameworks: { id: string; total: number }[] }>("POST", `/api/workspaces/${wsId}/rmf/tailor`, { nodeId: "nist-sp-800-53-r5:PE-3", action: "remove", rationale: "Inherited from the cloud provider's physical controls" });
    expect(res.json.frameworks.find((f) => f.id === "nist-sp-800-53-r5")!.total).toBe(369);
    const activity = await api<{ summary: string; entityId: string }[]>("GET", `/api/workspaces/${wsId}/activity?limit=3`);
    expect(activity.json.find((a) => a.entityId === "nist-sp-800-53-r5:PE-3")?.summary).toBe("PE-3 tailored out of scope: Inherited from the cloud provider's physical controls");
  });

  it("exports an OSCAL SSP and POA&M", async () => {
    const ssp = await api<{ "system-security-plan": { "control-implementation": { "implemented-requirements": unknown[] }; "system-characteristics": { "security-sensitivity-level": string } } }>("GET", `/api/workspaces/${wsId}/exports/oscal-ssp.json`);
    expect(ssp.json["system-security-plan"]["system-characteristics"]["security-sensitivity-level"]).toBe("fips-199-high");
    expect(ssp.json["system-security-plan"]["control-implementation"]["implemented-requirements"]).toHaveLength(369);
    const poam = await api<{ "plan-of-action-and-milestones": { "poam-items": unknown[] } }>("GET", `/api/workspaces/${wsId}/exports/oscal-poam.json`);
    expect(poam.json["plan-of-action-and-milestones"]["poam-items"].length).toBeGreaterThan(100);
  });
});

describe("SOC 2 and the crosswalk", () => {
  it("scopes SOC 2 by trust services category", async () => {
    const res = await api<{ frameworks: { id: string; total: number }[] }>("PUT", `/api/workspaces/${wsId}/frameworks/aicpa-tsc-2017`, {
      enabled: true,
      soc2: { categories: ["security", "availability"], reportType: "type2" },
    });
    expect(res.status).toBe(200);
    // 33 Common Criteria + 3 Availability criteria.
    expect(res.json.frameworks.find((f) => f.id === "aicpa-tsc-2017")?.total).toBe(36);
  });

  it("drafts DC 200 system description facts, never the description itself", async () => {
    await api("PATCH", `/api/workspaces/${wsId}/requirements/aicpa-tsc-2017:CC6.4`, { applicable: false, applicabilityRationale: "No physical facilities: all infrastructure is hosted by the cloud provider (carved out)." });
    const res = await api<{ items: { id: string; derived: { status: string; facts: string[] } }[] }>("GET", `/api/workspaces/${wsId}/soc2/description`);
    expect(res.json.items.map((i) => i.id)).toEqual(["DC1", "DC2", "DC3", "DC4", "DC5", "DC6", "DC7", "DC8", "DC9"]);
    const dc8 = res.json.items.find((i) => i.id === "DC8")!;
    expect(dc8.derived.facts.some((f) => f.startsWith("CC6.4 not relevant"))).toBe(true);
    expect(res.json.items.find((i) => i.id === "DC6")!.derived.status).toBe("needs-input");
  });

  it("aggregates authoritative mappings into Nexus bundles and rows with live levels", async () => {
    const overview = await api<{ frameworks: { id: string; groups: { id: string }[] }[]; sets: { id: string; authority: string }[]; bundles: { a: string; b: string; count: number }[] }>("GET", `/api/workspaces/${wsId}/crosswalk`);
    expect(overview.json.frameworks.find((f) => f.id === "nist-csf-2.0")!.groups).toHaveLength(22);
    expect(overview.json.sets.find((s) => s.id === "sp-800-53-r5--csf-2.0")!.authority).toBe("NIST OLIR");
    const bundle = overview.json.bundles.find((b) => b.a === "nist-sp-800-53-r5:AC" && b.b === "nist-csf-2.0:PR.AA");
    expect(bundle?.count).toBeGreaterThan(5);
    const rows = await api<{ source: { code: string }; target: { code: string; current: number } }[]>("GET", `/api/workspaces/${wsId}/crosswalk/rows?node=${encodeURIComponent("nist-csf-2.0:PR.AA-01")}`);
    expect(rows.json.length).toBeGreaterThan(0);
    expect(rows.json.every((r) => r.target.code === "PR.AA-01" || r.source.code === "PR.AA-01")).toBe(true);
    expect(rows.json.find((r) => r.target.code === "PR.AA-01")?.target.current).toBe(3);
  });
});

// Runs whenever the AI RMF corpus has been ingested (packages/frameworks/data/nist-ai-rmf.json).
describe.skipIf(!registry.framework("nist-ai-rmf"))("AI governance (NIST AI RMF)", () => {
  let systemId = "";
  it("enables the AI RMF with its four functions and 72 outcomes", async () => {
    const res = await api<{ frameworks: { id: string; total: number }[] }>("PUT", `/api/workspaces/${wsId}/frameworks/nist-ai-rmf`, { enabled: true });
    expect(res.status).toBe(200);
    expect(res.json.frameworks.find((f) => f.id === "nist-ai-rmf")?.total).toBe(72);
    const overview = await api<{ functions: { code: string; total: number }[]; genAi: { active: boolean } | null }>("GET", `/api/workspaces/${wsId}/ai`);
    expect(overview.json.functions.map((f) => [f.code, f.total])).toEqual([
      ["GOVERN", 19],
      ["MAP", 18],
      ["MEASURE", 22],
      ["MANAGE", 13],
    ]);
    expect(overview.json.genAi?.active).toBe(false);
  });

  it("keeps an AI system inventory, validated and recorded in the audit trail", async () => {
    const missingPurpose = await api("POST", `/api/workspaces/${wsId}/ai/systems`, { name: "Underwriting model" });
    expect(missingPurpose.status).toBe(400);
    const created = await api<{ id: string; generative: boolean }>("POST", `/api/workspaces/${wsId}/ai/systems`, {
      name: "Support copilot",
      purpose: "Answers customer billing questions and hands off to staff",
      generative: true,
      riskTier: "moderate",
      dataTypes: ["pii"],
    });
    expect(created.status).toBe(201);
    systemId = created.json.id;
    const overview = await api<{ systems: { name: string }[]; genAi: { active: boolean; risks: { id: string; actions: number; outcomes: string[] }[] } }>("GET", `/api/workspaces/${wsId}/ai`);
    expect(overview.json.systems.map((s) => s.name)).toContain("Support copilot");
    // A generative system brings the NIST AI 600-1 Generative AI Profile into scope: 12 GAI risks, each addressed by actions.
    expect(overview.json.genAi.active).toBe(true);
    expect(overview.json.genAi.risks).toHaveLength(12);
    expect(overview.json.genAi.risks.every((r) => r.actions > 0 && r.outcomes.length > 0)).toBe(true);
    const updated = await api<{ riskTier: string; name: string }>("PATCH", `/api/workspaces/${wsId}/ai/systems/${systemId}`, { riskTier: "high" });
    expect(updated.json).toMatchObject({ riskTier: "high", name: "Support copilot" });
    const activity = await api<{ summary: string }[]>("GET", `/api/workspaces/${wsId}/activity?limit=20`);
    expect(activity.json.some((a) => a.summary.includes("AI system added to the inventory: Support copilot"))).toBe(true);
  });

  it("plans AI RMF work from the Playbook and exports the AI RMF profile", async () => {
    const run = await api<{ status: string; proposals: { type: string; payload: { requirementIds: string[] } }[] }>("POST", `/api/workspaces/${wsId}/runs?wait=1`, { agent: "planner", goal: "Plan AI RMF work", input: { framework: "nist-ai-rmf", maxTasks: 3 } });
    // Agents propose, people approve: the run waits for a human decision on its task proposals.
    expect(run.json.status).toBe("awaiting-approval");
    const tasks = run.json.proposals.filter((p) => p.type === "create-task");
    expect(tasks.length).toBeGreaterThan(0);
    expect(tasks.every((t) => t.payload.requirementIds.every((id) => id.startsWith("nist-ai-rmf:")))).toBe(true);
    const csv = await api("GET", `/api/workspaces/${wsId}/exports/ai-rmf-profile.csv`);
    expect(csv.status).toBe(200);
    expect(csv.text.split("\n")[0]).toContain("Playbook suggested actions");
    expect(csv.text).toContain("GOVERN 1.1");
  });

  it("removes a system from the inventory", async () => {
    const del = await api("DELETE", `/api/workspaces/${wsId}/ai/systems/${systemId}`);
    expect(del.status).toBe(204);
    const overview = await api<{ systems: unknown[] }>("GET", `/api/workspaces/${wsId}/ai`);
    expect(overview.json.systems).toHaveLength(0);
  });
});

// Runs when the AI overlays are ingested (packages/frameworks/data/overlays/).
describe.skipIf(!registry.overlay("nist-ir-8596-iprd"))("AI security overlays: Cyber AI Profile and COSAiS (drafts)", () => {
  type LensSummary = { id: string; selected: boolean; byPriority: { level: number; count: number }[] };
  it("adopts the Cyber AI Profile for chosen focus areas and raises CSF priorities to its High priorities", async () => {
    const adopted = await api<{ adoption: { lenses: string[] }; lenses: LensSummary[]; high: { count: number }; raisable: number }>("PUT", `/api/workspaces/${wsId}/overlays/nist-ir-8596-iprd`, { lenses: ["secure"] });
    expect(adopted.status).toBe(200);
    expect(adopted.json.adoption.lenses).toEqual(["secure"]);
    expect(adopted.json.lenses.find((l) => l.id === "secure")?.byPriority.map((p) => p.count)).toEqual([23, 33, 50]);
    expect(adopted.json.high.count).toBe(23);
    const applied = await api<{ raised: number }>("POST", `/api/workspaces/${wsId}/overlays/nist-ir-8596-iprd/apply-priorities`);
    expect(applied.json.raised).toBeGreaterThan(0);
    expect(applied.json.raised).toBe(adopted.json.raisable);
    // The Observatory's overlay lens and the inspector read the same entries.
    const state = await api<{ overlay: { adopted: boolean; lenses: string[] }; units: Record<string, { overlay?: number; priority: string }> }>("GET", `/api/workspaces/${wsId}/frameworks/nist-csf-2.0/state`);
    expect(state.json.overlay).toMatchObject({ adopted: true, lenses: ["Secure"] });
    const high = Object.values(state.json.units).filter((u) => u.overlay === 1);
    expect(high).toHaveLength(23);
    expect(high.every((u) => u.priority === "high" || u.priority === "critical")).toBe(true);
    const detail = await api<{ overlays: { id: string; status: string; entry: { lenses: Record<string, { priority: number }> } }[] }>("GET", `/api/workspaces/${wsId}/requirements/nist-csf-2.0:GV.OC-01`);
    expect(detail.json.overlays[0]).toMatchObject({ id: "nist-ir-8596-iprd", status: "initial preliminary draft" });
    expect(detail.json.overlays[0]!.entry.lenses["secure"]!.priority).toBe(3);
    const activity = await api<{ summary: string }[]>("GET", `/api/workspaces/${wsId}/activity?limit=5`);
    expect(activity.json.some((a) => a.summary.startsWith("Cyber AI Profile: raised the priority"))).toBe(true);
  });

  it("brings COSAiS controls into SP 800-53 scope on adoption, and out again when dropped", async () => {
    const before = (await api<{ frameworks: { id: string; total: number }[] }>("GET", `/api/workspaces/${wsId}`)).json.frameworks.find((f) => f.id === "nist-sp-800-53-r5")!.total;
    const adopted = await api<{ controls: { nodeId: string; applicable: boolean; addedByOverlay: boolean }[] }>("PUT", `/api/workspaces/${wsId}/overlays/nist-cosais-predictive-ai`, {});
    expect(adopted.status).toBe(200);
    const added = adopted.json.controls.filter((c) => c.addedByOverlay);
    expect(added.length).toBeGreaterThan(0);
    expect(adopted.json.controls.every((c) => c.applicable || c.nodeId === "nist-sp-800-53-r5:PE-3")).toBe(true);
    const during = (await api<{ frameworks: { id: string; total: number }[] }>("GET", `/api/workspaces/${wsId}`)).json.frameworks.find((f) => f.id === "nist-sp-800-53-r5")!.total;
    expect(during).toBe(before + added.length);
    const dropped = await api("DELETE", `/api/workspaces/${wsId}/overlays/nist-cosais-predictive-ai`);
    expect(dropped.status).toBe(200);
    const after = (await api<{ frameworks: { id: string; total: number }[] }>("GET", `/api/workspaces/${wsId}`)).json.frameworks.find((f) => f.id === "nist-sp-800-53-r5")!.total;
    expect(after).toBe(before);
  });
});

// Runs when the U.S. state AI laws corpus is ingested (packages/frameworks/data/us-state-ai-laws.json).
describe.skipIf(!registry.framework("us-state-ai-laws"))("U.S. state AI laws: applicability decides scope", () => {
  const laws = registry.framework("us-state-ai-laws");
  // A law whose obligations fall on at least two different roles, so one role can scope some but not all of them.
  const law = laws?.graph.nodes.find((n) => {
    if (n.kind !== "law") return false;
    const roles = new Set(laws.childrenOf(n.id).flatMap((o) => (o.attributes?.["roles"] as string[]) ?? []));
    return roles.size >= 2;
  });
  const lawId = String(law?.attributes?.["lawId"] ?? "");
  type Overview = { enabled: boolean; jurisdictions: { laws: { lawId: string; obligations: number; inScope: number; applicability: { roles: string[] } | null; roles: { role: string; obligations: number }[] }[] }[] };
  const find = (o: Overview) => o.jurisdictions.flatMap((j) => j.laws).find((l) => l.lawId === lawId)!;

  it("tracks laws without scoping any obligation until the organization records its role", async () => {
    const enabled = await api("PUT", `/api/workspaces/${wsId}/frameworks/us-state-ai-laws`, { enabled: true });
    expect(enabled.status).toBe(200);
    const res = await api<Overview>("GET", `/api/workspaces/${wsId}/laws`);
    expect(res.json.enabled).toBe(true);
    expect(res.json.jurisdictions.flatMap((j) => j.laws).every((l) => l.inScope === 0 && l.applicability === null)).toBe(true);
  });

  it("scopes exactly the obligations of the roles held, and records the decision in the audit trail", async () => {
    const before = find((await api<Overview>("GET", `/api/workspaces/${wsId}/laws`)).json);
    const role = before.roles.find((r) => r.obligations > 0 && r.obligations < before.obligations)!;
    const res = await api<Overview>("PUT", `/api/workspaces/${wsId}/laws/${lawId}/applicability`, { roles: [role.role], note: "We deploy this kind of system in the state." });
    expect(res.status).toBe(200);
    const after = find(res.json);
    expect(after.applicability?.roles).toEqual([role.role]);
    // Obligations that name several roles count toward each, so scope is at least the role's own count and less than the whole law.
    expect(after.inScope).toBeGreaterThanOrEqual(role.obligations);
    expect(after.inScope).toBeLessThanOrEqual(before.obligations);
    const activity = await api<{ summary: string }[]>("GET", `/api/workspaces/${wsId}/activity?limit=5`);
    expect(activity.json.some((a) => a.summary.includes(`applies to us as ${role.role}`))).toBe(true);
    expect((await api("PUT", `/api/workspaces/${wsId}/laws/${lawId}/applicability`, { roles: ["astronaut"] })).status).toBe(400);
  });

  it("takes obligations out of scope again when the law no longer applies", async () => {
    const res = await api<Overview>("PUT", `/api/workspaces/${wsId}/laws/${lawId}/applicability`, { roles: [] });
    expect(res.status).toBe(200);
    expect(find(res.json)).toMatchObject({ inScope: 0, applicability: null });
  });
});

// Runs when the AI threat catalogs are ingested (packages/frameworks/data/mitre-atlas.json and friends).
describe.skipIf(!registry.framework("mitre-atlas"))("threat views: MITRE ATLAS, OWASP Top 10s, NIST AI 100-2", () => {
  type Coverage = { state: string; level: number | null; linked: number; inScope: number; met: number; progress: number; best: string | null };
  type Overview = { catalogs: { id: string; units: number; byState: Record<string, number> }[]; sources: { status: string; links: number }[] };

  it("summarizes coverage per catalog from the linked requirements, labeled by link status", async () => {
    const res = await api<Overview>("GET", `/api/workspaces/${wsId}/threats`);
    expect(res.status).toBe(200);
    expect(res.json.catalogs.map((c) => [c.id, c.units])).toEqual([
      ["mitre-atlas", 208],
      ["owasp-llm-top10", 10],
      ["owasp-agentic-top10", 10],
      ["nist-ai-100-2", 25],
    ]);
    for (const c of res.json.catalogs) expect(Object.values(c.byState).reduce((a, b) => a + b, 0)).toBe(c.units);
    expect(new Set(res.json.sources.map((s) => s.status))).toEqual(new Set(["final", "draft", "unreviewed", "superseded"]));
    // Only final links: ATLAS reaches requirements through NIST's draft Cyber AI Profile, the Agentic Top 10 only through the unreviewed crosswalk.
    const final = await api<Overview>("GET", `/api/workspaces/${wsId}/threats?min=final`);
    const byId = new Map(final.json.catalogs.map((c) => [c.id, c.byState]));
    expect(byId.get("mitre-atlas")!["unmapped"]).toBe(208);
    expect(byId.get("owasp-agentic-top10")!["unmapped"]).toBe(10);
    expect(byId.get("owasp-llm-top10")!["unmapped"]).toBeLessThan(10);
    expect((await api("GET", `/api/workspaces/${wsId}/threats?min=anything`)).status).toBe(400);
  });

  it("derives a threat's coverage from requirement progress and never assesses the threat itself", async () => {
    const before = await api<{ coverage: Record<string, Coverage> }>("GET", `/api/workspaces/${wsId}/threats/owasp-llm-top10?min=final`);
    expect(before.json.coverage["owasp-llm-top10:LLM01"]!.state).not.toBe("covered");
    const detail = await api<{ status: unknown; state: unknown; threat: { coverage: Coverage; requirements: { id: string; framework: string; best: string; target: number; applicable: boolean; paths: { kind: string }[] }[] } }>(
      "GET",
      `/api/workspaces/${wsId}/requirements/${encodeURIComponent("owasp-llm-top10:LLM01")}?min=final`,
    );
    expect(detail.json.status).toBeNull();
    expect(detail.json.state).toBeUndefined();
    const reqs = detail.json.threat.requirements;
    expect(reqs.length).toBe(before.json.coverage["owasp-llm-top10:LLM01"]!.linked);
    expect(reqs.every((r) => r.framework === "nist-ai-rmf" && r.best === "final" && r.paths.every((p) => p.kind === "direct"))).toBe(true);
    for (const r of reqs.filter((x) => x.applicable)) expect((await api("PATCH", `/api/workspaces/${wsId}/requirements/${encodeURIComponent(r.id)}`, { current: r.target })).status).toBe(200);
    const after = await api<{ coverage: Record<string, Coverage> }>("GET", `/api/workspaces/${wsId}/threats/owasp-llm-top10?min=final`);
    expect(after.json.coverage["owasp-llm-top10:LLM01"]).toMatchObject({ state: "covered", level: 4, progress: 1 });
    // Enabling a threat catalog as if it were a framework is refused.
    expect((await api("PUT", `/api/workspaces/${wsId}/frameworks/mitre-atlas`, { enabled: true })).status).toBe(400);
  });

  it("reaches ATLAS techniques through their mitigations, and shows requirements the threats they address", async () => {
    const detail = await api<{ threat: { coverage: Coverage; requirements: { framework: string; paths: { kind: string; via?: { code: string } }[] }[]; related: { code: string; label: string; status: string }[] } }>(
      "GET",
      `/api/workspaces/${wsId}/requirements/${encodeURIComponent("mitre-atlas:AML.T0051")}`,
    );
    expect(detail.json.threat.coverage.best).toBe("draft");
    expect(detail.json.threat.requirements.some((r) => r.framework === "nist-csf-2.0" && r.paths.some((p) => p.kind === "mitigation" && p.via?.code.startsWith("AML.M")))).toBe(true);
    expect(detail.json.threat.related.some((r) => r.label === "mitigates" && r.status === "final")).toBe(true);
    const gvoc = await api<{ threats: { code: string; best: string; paths: { kind: string }[] }[] }>("GET", `/api/workspaces/${wsId}/requirements/${encodeURIComponent("nist-csf-2.0:GV.OC-01")}`);
    expect(gvoc.json.threats.some((t) => t.code === "AML.M0020" && t.best === "draft")).toBe(true);
    expect(gvoc.json.threats.some((t) => t.code === "AML.T0051" && t.paths.some((p) => p.kind === "mitigation"))).toBe(true);
  });

  it("weighs each publication once, and each mitigation, edition or category once within it", async () => {
    type View = { publication: string; status: string; routes: number; linked: number; progress: number | null };
    type Req = { id: string; paths: { kind: string; group?: string; via?: { code: string }; links: { authority: string; status: string; citation: { page?: number } }[] }[] };
    const detail = await api<{ threat: { coverage: Coverage & { views: View[] }; requirements: Req[] } }>("GET", `/api/workspaces/${wsId}/requirements/${encodeURIComponent("owasp-llm-top10:LLM04")}`);
    const { coverage, requirements } = detail.json.threat;
    const views = new Map(coverage.views.map((v) => [v.publication, v]));
    // OWASP 2026 links LLM04 to five AI RMF categories: five routes, however many outcomes they hold.
    const owasp = views.get("OWASP LLM Top 10 2026, Appendix A")!;
    expect(owasp).toMatchObject({ status: "final", routes: 5 });
    expect(owasp.linked).toBeGreaterThan(5);
    // NIST's draft profile cites the 2025 edition's Supply Chain entry on 67 CSF outcomes: one route, through the other edition.
    const nist = views.get("NIST IR 8596 (Cyber AI Profile, draft)")!;
    expect(nist).toMatchObject({ status: "draft", routes: 1, linked: 67 });
    const edition = requirements.flatMap((r) => r.paths).find((p) => p.kind === "edition")!;
    expect(edition.via?.code).toBe("LLM03-2025");
    // The edition link is OWASP's own rank migration chart, labeled with its source.
    expect(edition.links[0]).toMatchObject({ authority: "OWASP LLM Top 10 2026, Figure 1", status: "final", citation: { page: 6 } });
    // Each publication counts once: coverage is the mean of the views that reach requirements in scope.
    const counted = coverage.views.filter((v) => v.progress !== null).map((v) => v.progress!);
    expect(coverage.progress).toBeCloseTo(counted.reduce((a, b) => a + b, 0) / counted.length, 2);
    expect(coverage.linked).toBe(requirements.length);
    // An entry of the superseded edition is no group: it shows the links published for it.
    const previous = await api<{ threat: { coverage: Coverage; requirements: Req[] } }>("GET", `/api/workspaces/${wsId}/requirements/${encodeURIComponent("owasp-llm-top10:LLM03-2025")}`);
    expect(previous.json.threat.coverage.state).not.toBe("unmapped");
    expect(previous.json.threat.requirements.some((r) => r.paths.some((p) => p.kind === "direct" && p.links[0]!.authority === "NIST IR 8596 (Cyber AI Profile, draft)"))).toBe(true);
  });

  it("bundles threat links onto requirement groups for the Nexus threat ring", async () => {
    const ring = await api<{ catalogs: { id: string; groups: { id: string; units: number }[] }[]; bundles: { a: string; b: string; count: number; best: string }[] }>("GET", `/api/workspaces/${wsId}/crosswalk/threats`);
    expect(ring.status).toBe(200);
    const atlas = ring.json.catalogs.find((c) => c.id === "mitre-atlas")!;
    expect(atlas.groups).toHaveLength(16);
    expect(ring.json.bundles.some((b) => b.a.startsWith("mitre-atlas:AML.TA") && b.b.startsWith("nist-csf-2.0:") && b.best === "draft")).toBe(true);
    expect(ring.json.bundles.some((b) => b.a.startsWith("owasp-llm-top10:") && b.b.startsWith("nist-ai-rmf:") && b.best === "final")).toBe(true);
  });
});

describe("assessment guardrails: threat catalogs, enabled frameworks and scope", () => {
  let gw = "";
  const threat = "mitre-atlas:AML.T0051";
  beforeAll(async () => {
    const created = await api<{ workspace: { id: string } }>("POST", "/api/workspaces", {
      name: "Guardrails Co",
      profile: { industry: "saas", size: "11-50", dataTypes: [], drivers: ["ai-systems"], environments: ["cloud"], maturityTier: 2, guidance: "guided", securityTeamSize: 2 },
      frameworks: ["nist-csf-2.0", "us-state-ai-laws"],
    });
    gw = created.json.workspace.id;
  });
  const patch = (nodeId: string, body: Record<string, unknown>) => api<{ error?: string; current?: number; owner?: string }>("PATCH", `/api/workspaces/${gw}/requirements/${encodeURIComponent(nodeId)}`, body);

  it.skipIf(!registry.framework("mitre-atlas"))("never assesses a threat catalog node, through the API or an agent proposal", async () => {
    const res = await patch(threat, { current: 3 });
    expect(res.status).toBe(400);
    expect(res.json.error).toMatch(/threat catalog/);
    expect(await svc.store.states.list(gw, "mitre-atlas")).toHaveLength(0);
    // Agent proposals meet the same rule before they reach the approvals inbox.
    for (const [type, payload] of [
      ["set-level", { nodeId: threat, current: 3 }],
      ["set-target", { nodeId: threat, target: 4 }],
      ["set-applicability", { nodeId: threat, applicable: false, rationale: "Not relevant to our systems at all" }],
      ["create-task", { title: "Mitigate prompt injection", requirementIds: [threat] }],
    ] as const) {
      await expect(svc.createProposal(gw, "run_test", { type, title: type, rationale: "test", payload, citations: [], confidence: "low", nodeIds: [threat] })).rejects.toThrow(/threat/);
    }
    expect(await svc.store.proposals.list(gw)).toHaveLength(0);
    // A proposal already waiting (stored before this rule existed) fails on approval and changes nothing.
    await svc.store.proposals.put({ id: "prop_legacy", runId: "run_test", workspaceId: gw, type: "set-level", title: "legacy", rationale: "legacy", payload: { nodeId: threat, current: 3 }, citations: [], confidence: "low", status: "pending", nodeIds: [threat], createdAt: new Date().toISOString() });
    const decided = await api<{ status: string }>("POST", `/api/workspaces/${gw}/proposals/prop_legacy/decision`, { decision: "approved" });
    expect(decided.json.status).toBe("failed");
    expect(await svc.store.states.list(gw, "mitre-atlas")).toHaveLength(0);
    // Tasks and evidence link requirements, never threats; threat catalogs are not planned.
    expect((await api("POST", `/api/workspaces/${gw}/tasks`, { title: "Threat task", requirementIds: [threat] })).status).toBe(400);
    expect((await api("POST", `/api/workspaces/${gw}/evidence`, { title: "Threat evidence", requirementIds: [threat], content: "x" })).status).toBe(400);
    expect((await api("POST", `/api/workspaces/${gw}/plan`, { framework: "mitre-atlas" })).status).toBe(400);
  });

  it.skipIf(!registry.framework("mitre-atlas"))("keeps offline agents off threat nodes", async () => {
    const run = async (agent: string, input: Record<string, unknown>) =>
      (await api<{ status: string; summary: string; proposals: unknown[] }>("POST", `/api/workspaces/${gw}/runs?wait=1`, { agent, goal: `Run ${agent}`, input })).json;
    const assessed = await run("assessor", { nodeIds: [threat, "mitre-atlas:AML.TA0005"] });
    expect(assessed.status).toBe("completed");
    expect(assessed.proposals).toHaveLength(0);
    const planned = await run("planner", { framework: "mitre-atlas" });
    expect(planned.status).toBe("completed");
    expect(planned.summary).toMatch(/threat catalog/);
    expect(planned.proposals).toHaveLength(0);
  });

  it("refuses assessments in frameworks the workspace has not enabled", async () => {
    const res = await patch("nist-sp-800-53-r5:AC-2", { current: 2 });
    expect(res.status).toBe(400);
    expect(res.json.error).toMatch(/not enabled/);
    expect(await svc.store.states.list(gw, "nist-sp-800-53-r5")).toHaveLength(0);
    await expect(svc.createProposal(gw, "run_test", { type: "set-level", title: "x", rationale: "x", payload: { nodeId: "nist-sp-800-53-r5:AC-2", current: 2 }, citations: [], confidence: "low", nodeIds: [] })).rejects.toThrow(/not enabled/);
    expect((await api("POST", `/api/workspaces/${gw}/plan`, { framework: "nist-sp-800-53-r5" })).status).toBe(400);
  });

  it.skipIf(!registry.framework("us-state-ai-laws"))("sets no levels on requirements out of scope, whoever asks", async () => {
    // No law applicability recorded: every obligation is out of scope by configuration.
    const obligation = registry.framework("us-state-ai-laws")!.assessable[0]!.id;
    for (const body of [{ current: 2 }, { target: 3 }, { verifiedAt: new Date().toISOString() }, { statusOverride: "implemented" }]) {
      const res = await patch(obligation, body);
      expect(res.status, JSON.stringify(body)).toBe(400);
      expect(res.json.error).toMatch(/out of scope/);
    }
    // Documentation stays editable.
    expect((await patch(obligation, { owner: "Legal" })).json.owner).toBe("Legal");
    await expect(svc.createProposal(gw, "run_test", { type: "set-level", title: "x", rationale: "x", payload: { nodeId: obligation, current: 2 }, citations: [], confidence: "low", nodeIds: [obligation] })).rejects.toThrow(/out of scope/);
    // A documented exclusion blocks levels too, until the requirement is brought back into scope.
    const outcome = "nist-csf-2.0:PR.IR-02";
    expect((await patch(outcome, { applicable: false, applicabilityRationale: "No on-premises facilities; inherited from the cloud provider." })).status).toBe(200);
    expect((await patch(outcome, { current: 2 })).status).toBe(400);
    expect((await patch(outcome, { applicable: false, applicabilityRationale: "Still excluded for audit purposes here", current: 1 })).status).toBe(400);
    expect((await patch(outcome, { applicable: true, current: 2 })).json.current).toBe(2);
  });
});

describe.skipIf(!registry.framework("us-state-ai-laws"))("state AI laws: dates decide what counts today", () => {
  const today = new Date().toISOString().slice(0, 10);
  const law = registry.framework("us-state-ai-laws")?.graph.nodes.find((n) => n.code === "CA-SB243");
  // Only meaningful while CA-SB243-04 (2027-07-01) is still ahead and CA-SB243-03 (until 2026-12-31) not yet ended.
  const applicable = !!law && today < "2026-12-31";
  it.skipIf(!applicable)("counts obligations in force, prepares upcoming ones apart, and drops ended ones when read", async () => {
    const created = await api<{ workspace: { id: string } }>("POST", "/api/workspaces", {
      name: "Chatbot Co",
      profile: { industry: "saas", size: "11-50", dataTypes: ["pii", "children"], drivers: ["ai-systems"], environments: ["cloud"], maturityTier: 2, guidance: "guided", securityTeamSize: 2 },
      frameworks: ["nist-csf-2.0", "us-state-ai-laws"],
    });
    const cw = created.json.workspace.id;
    await api("PUT", `/api/workspaces/${cw}/laws/ca-companion-chatbots/applicability`, { roles: ["operator"] });
    const obligation = (n: string) => `us-state-ai-laws:CA-SB243-0${n}`;
    // Everything in force today is met; the reporting duty (from 2027-07-01) is not started.
    for (const n of ["1", "2", "3", "5", "6"]) expect((await api("PATCH", `/api/workspaces/${cw}/requirements/${encodeURIComponent(obligation(n))}`, { current: 3, target: 3 })).status).toBe(200);
    type Law = { code: string; inScope: number; inForce: number; readiness: number; upcomingInScope: { total: number; readiness: number; next: string | null } };
    type Overview = { readiness: number; total: number; upcoming: { total: number; readiness: number }; jurisdictions: { laws: Law[] }[] };
    const ca = (o: Overview) => o.jurisdictions.flatMap((j) => j.laws).find((l) => l.code === "CA-SB243")!;
    const now = (await api<Overview>("GET", `/api/workspaces/${cw}/laws`)).json;
    expect(ca(now)).toMatchObject({ inScope: 6, inForce: 5, readiness: 1, upcomingInScope: { total: 1, readiness: 0, next: "2027-07-01" } });
    expect(now).toMatchObject({ readiness: 1, total: 5, upcoming: { total: 1, readiness: 0 } });
    const state = await api<{ units: Record<string, { upcoming?: string; applicable: boolean }>; upcoming: { total: number } }>("GET", `/api/workspaces/${cw}/frameworks/us-state-ai-laws/state`);
    expect(state.json.units[obligation("4")]).toMatchObject({ upcoming: "2027-07-01", applicable: true });
    expect(state.json.upcoming.total).toBe(1);
    // Months later, with nothing changed in the workspace: the minors duty ended on 2026-12-31, the reporting duty is in force.
    const ws = await svc.workspace(cw);
    vi.useFakeTimers({ toFake: ["Date"], now: new Date("2027-01-15T12:00:00Z") });
    try {
      const january = await lawsOverview(svc, ws);
      expect(ca(january as unknown as Overview)).toMatchObject({ inScope: 5, inForce: 4, readiness: 1 });
      const detail = await nodeDetail(svc, ws, registry.node(obligation("3"))!);
      expect(detail.status?.status).toBe("not-applicable");
      expect(detail.status?.reasons[0]).toBe("No longer in effect after 2026-12-31");
      expect(detail.timing).toMatchObject({ state: "ended", until: "2026-12-31" });
      vi.setSystemTime(new Date("2027-08-01T12:00:00Z"));
      const august = (await lawsOverview(svc, ws)) as unknown as Overview;
      expect(ca(august)).toMatchObject({ inScope: 5, inForce: 5, upcomingInScope: { total: 0 } });
      expect(ca(august).readiness).toBeLessThan(1);
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("documented exclusions survive every scope change", () => {
  let xw = "";
  type State = { applicable: boolean; applicabilityRationale?: string; userExclusion?: { rationale: string } };
  const stateOf = async (nodeId: string) => (await api<{ state: State }>("GET", `/api/workspaces/${xw}/requirements/${encodeURIComponent(nodeId)}`)).json.state;
  const exclude = (nodeId: string, rationale: string) => api("PATCH", `/api/workspaces/${xw}/requirements/${encodeURIComponent(nodeId)}`, { applicable: false, applicabilityRationale: rationale });
  beforeAll(async () => {
    const created = await api<{ workspace: { id: string } }>("POST", "/api/workspaces", {
      name: "Exclusions Co",
      profile: { industry: "healthcare", size: "51-200", dataTypes: ["phi"], drivers: ["ai-systems"], environments: ["cloud"], maturityTier: 2, guidance: "guided", securityTeamSize: 3 },
      frameworks: ["nist-csf-2.0", "nist-sp-800-53-r5", "us-state-ai-laws"],
    });
    xw = created.json.workspace.id;
  });

  it.skipIf(!registry.framework("us-state-ai-laws"))("keeps a not-applicable decision on an obligation when the law stops and starts applying", async () => {
    const laws = registry.framework("us-state-ai-laws")!;
    const obligation = laws.assessable.find((o) => ((o.attributes?.["roles"] as string[]) ?? []).length > 0 && !o.attributes?.["until"])!;
    const lawId = String(obligation.attributes?.["lawId"]);
    const role = (obligation.attributes?.["roles"] as string[])[0]!;
    await api("PUT", `/api/workspaces/${xw}/laws/${lawId}/applicability`, { roles: [role] });
    expect((await stateOf(obligation.id)).applicable).toBe(true);
    const why = "We never offer this service to consumers in the state; confirmed by counsel.";
    expect((await exclude(obligation.id, why)).status).toBe(200);
    // The law stops applying: out of scope by configuration, the person's decision kept underneath.
    await api("PUT", `/api/workspaces/${xw}/laws/${lawId}/applicability`, { roles: [] });
    const off = await stateOf(obligation.id);
    expect(off.applicable).toBe(false);
    expect(off.applicabilityRationale).toMatch(/Not in scope/);
    expect(off.userExclusion?.rationale).toBe(why);
    // It applies again: the documented exclusion stands.
    await api("PUT", `/api/workspaces/${xw}/laws/${lawId}/applicability`, { roles: [role] });
    expect(await stateOf(obligation.id)).toMatchObject({ applicable: false, applicabilityRationale: why, userExclusion: { rationale: why } });
  });

  it.skipIf(!registry.overlay("nist-cosais-predictive-ai"))("keeps a not-applicable decision on a control an overlay adds, drops and adds again", async () => {
    const overlay = registry.overlay("nist-cosais-predictive-ai")!;
    const moderate = (id: string) => ((registry.node(id)?.attributes?.["baselines"] as string[]) ?? []).includes("moderate");
    const control = overlay.entries.map((e) => e.nodeId).find((id) => !moderate(id))!;
    expect((await stateOf(control)).applicable).toBe(false);
    await api("PUT", `/api/workspaces/${xw}/overlays/nist-cosais-predictive-ai`, {});
    expect((await stateOf(control)).applicable).toBe(true);
    const why = "The predictive model runs in a vendor-managed enclave; the vendor's SOC 2 covers this control.";
    expect((await exclude(control, why)).status).toBe(200);
    await api("DELETE", `/api/workspaces/${xw}/overlays/nist-cosais-predictive-ai`);
    const dropped = await stateOf(control);
    expect(dropped.applicable).toBe(false);
    expect(dropped.userExclusion?.rationale).toBe(why);
    await api("PUT", `/api/workspaces/${xw}/overlays/nist-cosais-predictive-ai`, {});
    expect(await stateOf(control)).toMatchObject({ applicable: false, applicabilityRationale: why });
    // Re-categorizing the system (a new baseline) does not overwrite it either.
    await api("POST", `/api/workspaces/${xw}/rmf/categorize`, { informationTypes: [{ id: "phi", name: "Patient records", confidentiality: "high", integrity: "high", availability: "high" }] });
    expect(await stateOf(control)).toMatchObject({ applicable: false, applicabilityRationale: why });
  });
});

describe("agents (offline playbooks) with human-in-the-loop proposals", () => {
  const run = async (agent: string, goal: string, input: Record<string, unknown> = {}) =>
    (await api<{ status: string; mode: string; summary: string; steps: { type: string }[]; proposals: { id: string; type: string; status: string }[] }>("POST", `/api/workspaces/${wsId}/runs?wait=1`, { agent, goal, input })).json;

  it("copilot answers with citations and drives the 3D focus", async () => {
    const r = await run("copilot", "What does PR.AA-05 require and how does it map to SP 800-53?");
    expect(r.mode).toBe("offline");
    expect(r.summary).toContain("PR.AA-05");
    expect(r.steps.some((s) => s.type === "citation")).toBe(true);
    expect(r.steps.some((s) => s.type === "ui")).toBe(true);
  });

  it("planner proposes grounded tasks that apply on approval", async () => {
    const r = await run("planner", "Plan the next sprint", { framework: "nist-csf-2.0", maxTasks: 4 });
    expect(r.status).toBe("awaiting-approval");
    expect(r.proposals.length).toBe(4);
    const before = (await api<unknown[]>("GET", `/api/workspaces/${wsId}/tasks`)).json.length;
    const decided = await api<{ status: string }>("POST", `/api/workspaces/${wsId}/proposals/${r.proposals[0]!.id}/decision`, { decision: "approved" });
    expect(decided.json.status).toBe("applied");
    const after = (await api<unknown[]>("GET", `/api/workspaces/${wsId}/tasks`)).json.length;
    expect(after).toBe(before + 1);
    const rejected = await api<{ status: string }>("POST", `/api/workspaces/${wsId}/proposals/${r.proposals[1]!.id}/decision`, { decision: "rejected" });
    expect(rejected.json.status).toBe("rejected");
  });

  it("assessor, policy author, evidence collector, crosswalk analyst, audit prep and task executor all complete", async () => {
    for (const [agent, input] of [
      ["assessor", { nodeIds: ["nist-csf-2.0:PR.AA"] }],
      ["policy-author", { nodeIds: ["nist-csf-2.0:PR.AT"] }],
      ["evidence-collector", {}],
      ["crosswalk-analyst", { framework: "nist-sp-800-53-r5" }],
      ["auditor-prep", { framework: "nist-csf-2.0" }],
    ] as const) {
      const r = await run(agent, `Run ${agent}`, input);
      expect(["completed", "awaiting-approval"], `${agent}: ${r.summary}`).toContain(r.status);
      expect(r.summary.length).toBeGreaterThan(20);
    }
    const tasks = (await api<{ id: string; automation?: { action: string } }[]>("GET", `/api/workspaces/${wsId}/tasks`)).json;
    const technical = tasks.find((t) => t.automation?.action === "implementation-guide") ?? tasks[0]!;
    const r = await run("task-executor", "Execute this task", { taskId: technical.id });
    expect(["completed", "awaiting-approval"]).toContain(r.status);
    expect(r.proposals.some((p) => p.type === "update-task" || p.type === "create-policy")).toBe(true);
  });

  it("records a proposal in the flight recorder only once it is committed", async () => {
    const created = await api<{ workspace: { id: string } }>("POST", "/api/workspaces", {
      name: "Recorder Co",
      profile: { industry: "saas", size: "1-10", dataTypes: [], drivers: [], environments: ["cloud"], maturityTier: 1, guidance: "guided", securityTeamSize: 1 },
    });
    const rw = created.json.workspace.id;
    await api("PATCH", `/api/workspaces/${rw}`, { autonomy: { "create-task": true } });
    const steps: { data?: { proposalId?: string } }[] = [];
    const recorder = { step: (s: (typeof steps)[number]) => steps.push(s) };
    const input = { type: "create-task" as const, title: "Review access", rationale: "Quarterly review", payload: { title: "Review access", requirementIds: ["nist-csf-2.0:PR.AA-05"] }, citations: [], confidence: "low" as const, nodeIds: ["nist-csf-2.0:PR.AA-05"] };
    // Applying it under autonomy fails at the audit entry: the whole proposal rolls back, and nothing was recorded.
    const append = svc.store.activity.append.bind(svc.store.activity);
    svc.store.activity.append = async () => {
      throw new Error("audit trail unavailable");
    };
    try {
      await expect(svc.createProposal(rw, "run_rec", input, recorder as never)).rejects.toThrow(/audit trail unavailable/);
    } finally {
      svc.store.activity.append = append;
    }
    expect(steps).toHaveLength(0);
    expect(await svc.store.proposals.list(rw)).toHaveLength(0);
    const applied = await svc.createProposal(rw, "run_rec", input, recorder as never);
    expect(applied.status).toBe("applied");
    expect(steps.map((s) => s.data?.proposalId)).toEqual([applied.id]);
  });

  it("autonomy lets an agent apply a proposal type without approval", async () => {
    await api("PATCH", `/api/workspaces/${wsId}`, { autonomy: { "create-task": true } });
    const r = await run("planner", "Plan more", { framework: "nist-csf-2.0", maxTasks: 1 });
    expect(r.proposals.every((p) => p.status === "applied")).toBe(true);
    expect(r.status).toBe("completed");
  });
});

describe("evidence, monitoring and exports", () => {
  it("runs the repository hygiene connector against this repository", async () => {
    const con = await api<{ id: string }>("POST", `/api/workspaces/${wsId}/connectors`, { kind: "repo-scan", config: { path: REPO_ROOT } });
    expect(con.status).toBe(201);
    const results = await api<{ checkId: string; outcome: string; requirementIds: string[] }[]>("POST", `/api/workspaces/${wsId}/connectors/${con.json.id}/run`);
    expect(results.json.find((r) => r.checkId === "lockfile")?.outcome).toBe("pass");
    expect(results.json.find((r) => r.checkId === "secrets")?.outcome).toBe("pass");
    expect(results.json.some((r) => r.requirementIds.length > 0)).toBe(true);
  });

  it("records a failed connector run in the audit trail", async () => {
    const con = await api<{ id: string }>("POST", `/api/workspaces/${wsId}/connectors`, { kind: "repo-scan", name: "Missing repository", config: { path: "/nonexistent/visua-repo" } });
    expect(con.status).toBe(201);
    const kind = CONNECTOR_KINDS.find((k) => k.kind === "repo-scan")!;
    const run = kind.run;
    kind.run = async () => {
      throw new Error("connection timed out");
    };
    try {
      expect((await api("POST", `/api/workspaces/${wsId}/connectors/${con.json.id}/run`)).status).toBe(500);
    } finally {
      kind.run = run;
    }
    const connectors = await api<{ id: string; status: string }[]>("GET", `/api/workspaces/${wsId}/connectors`);
    expect(connectors.json.find((c) => c.id === con.json.id)?.status).toBe("error");
    const activity = await api<{ summary: string }[]>("GET", `/api/workspaces/${wsId}/activity?limit=3`);
    expect(activity.json[0]!.summary).toMatch(/^Connector “Missing repository” failed/);
    expect((await api<{ valid: boolean }>("GET", `/api/workspaces/${wsId}/activity/verify`)).json.valid).toBe(true);
  });

  it("accepts uploaded evidence with a content hash and review", async () => {
    const ev = await api<{ id: string; sha256: string; status: string }>("POST", `/api/workspaces/${wsId}/evidence`, { title: "Access review Q3", kind: "attestation", requirementIds: ["PR.AA-05"], content: "Reviewed 42 accounts; 3 removed." });
    expect(ev.json.sha256).toHaveLength(64);
    expect(ev.json.status).toBe("pending-review");
    const reviewed = await api<{ status: string }>("PATCH", `/api/workspaces/${wsId}/evidence/${ev.json.id}`, { decision: "accepted" });
    expect(reviewed.json.status).toBe("accepted");
    // Changing one field leaves the others as they were.
    const extended = await api<{ title: string; requirementIds: string[]; validUntil: string }>("PATCH", `/api/workspaces/${wsId}/evidence/${ev.json.id}`, { validUntil: "2027-12-31" });
    expect(extended.json).toMatchObject({ title: "Access review Q3", requirementIds: ["nist-csf-2.0:PR.AA-05"], validUntil: "2027-12-31" });
  });

  it("exports the CSF Organizational Profile with the official template columns", async () => {
    const res = await api("GET", `/api/workspaces/${wsId}/exports/csf-profile.csv`);
    const header = res.text.split("\r\n")[0]!;
    expect(header).toContain("CSF Outcome (Function, Category, or Subcategory)");
    expect(header).toContain("Target CSF Tier");
    expect(res.text.split("\r\n").length).toBeGreaterThan(134);
  });

  it("serves official corpus files but blocks traversal", async () => {
    const ok = await client.get("/api/corpus/file/nist-csf-2.0/core/NIST.CSWP.29.pdf");
    expect(ok.status).toBe(200);
    expect(ok.headers.get("content-type")).toBe("application/pdf");
    const bad = await client.get("/api/corpus/file/..%2F..%2Fpackage.json");
    expect(bad.status).toBe(400);
  });
});

describe("integrity guardrails", () => {
  it("requires a written rationale to mark a requirement not applicable", async () => {
    const bad = await api("PATCH", `/api/workspaces/${wsId}/requirements/nist-csf-2.0:PR.IR-02`, { applicable: false });
    expect(bad.status).toBe(400);
    const ok = await api("PATCH", `/api/workspaces/${wsId}/requirements/nist-csf-2.0:PR.IR-02`, { applicable: false, applicabilityRationale: "No on-premises facilities; environmental threats are handled by the cloud provider (inherited)." });
    expect(ok.status).toBe(200);
  });

  it("never lets a scope change overwrite a person's documented exclusion", async () => {
    const id = "nist-sp-800-53-r5:AC-8";
    const excluded = await api<{ applicable: boolean }>("PATCH", `/api/workspaces/${wsId}/requirements/${id}`, { applicable: false, applicabilityRationale: "System use notification is enforced by the upstream identity provider (inherited)." });
    expect(excluded.json.applicable).toBe(false);
    // Re-categorize (re-scopes every control); AC-8 stays in the baseline, so the person's decision must stand.
    await api("POST", `/api/workspaces/${wsId}/rmf/categorize`, {
      informationTypes: [{ id: "payments", name: "Payment transactions", confidentiality: "moderate", integrity: "moderate", availability: "low" }],
    });
    const after = (await api<{ state: { applicable: boolean; applicabilityRationale: string; userExclusion?: { rationale: string } } }>("GET", `/api/workspaces/${wsId}/requirements/${id}`)).json.state;
    expect(after.applicable).toBe(false);
    expect(after.userExclusion?.rationale).toMatch(/identity provider/);
    // Out-of-scope-by-configuration requirements cannot be forced back in without changing the scope.
    const outOfBaseline = await api("PATCH", `/api/workspaces/${wsId}/requirements/nist-sp-800-53-r5:AC-2(11)`, { applicable: true });
    expect(outOfBaseline.status).toBe(400);
    // Restoring applicability clears the exclusion and restores a target.
    const restored = await api<{ applicable: boolean; target: number; userExclusion?: unknown }>("PATCH", `/api/workspaces/${wsId}/requirements/${id}`, { applicable: true });
    expect(restored.json.applicable).toBe(true);
    expect(restored.json.userExclusion).toBeUndefined();
    expect(restored.json.target).toBeGreaterThan(0);
  });

  it("keeps a tamper-evident, hash-chained audit trail", async () => {
    const verified = await api<{ valid: boolean; events: number }>("GET", `/api/workspaces/${wsId}/activity/verify`);
    expect(verified.json.valid).toBe(true);
    expect(verified.json.events).toBeGreaterThan(10);
    // Tamper with one historical event directly in storage: verification must fail.
    const events = await svc.store.activity.chain(wsId);
    const victim = events[3]!;
    await svc.store.activity.put({ ...victim, summary: `${victim.summary} (edited)` }, `${victim.at}#${String(victim.seq).padStart(9, "0")}`);
    const tampered = await api<{ valid: boolean; brokenAt: number }>("GET", `/api/workspaces/${wsId}/activity/verify`);
    expect(tampered.json.valid).toBe(false);
    expect(tampered.json.brokenAt).toBe(victim.seq);
    await svc.store.activity.put(victim, `${victim.at}#${String(victim.seq).padStart(9, "0")}`);
    expect((await api<{ valid: boolean }>("GET", `/api/workspaces/${wsId}/activity/verify`)).json.valid).toBe(true);
  });

  it("never lets the task executor file an implementation guide as evidence", async () => {
    const tasks = (await api<{ id: string; automation?: { action: string } }[]>("GET", `/api/workspaces/${wsId}/tasks`)).json;
    const technical = tasks.find((t) => t.automation?.action === "implementation-guide");
    if (!technical) return;
    const r = (await api<{ proposals: { type: string }[] }>("POST", `/api/workspaces/${wsId}/runs?wait=1`, { agent: "task-executor", goal: "Execute", input: { taskId: technical.id } })).json;
    expect(r.proposals.some((p) => p.type === "create-evidence")).toBe(false);
    expect(r.proposals.some((p) => p.type === "update-task")).toBe(true);
  });
});

describe("demo seed", () => {
  const morgan = new TestClient(app);
  beforeAll(async () => {
    await seedDemo(svc, auth);
    await morgan.devLogin("morgan.lee@northwind-health.example");
  });
  it("creates a realistic, deterministic demo workspace", async () => {
    const res = await morgan.get<{ workspace: { name: string }; frameworks: { id: string; readiness: number }[]; approvals: number; access: { role: string } }>("/api/workspaces/northwind-health");
    expect(res.json.access.role).toBe("owner");
    expect(res.json.workspace.name).toBe("Northwind Health");
    const csf = res.json.frameworks.find((f) => f.id === "nist-csf-2.0")!;
    expect(csf.readiness).toBeGreaterThan(0.3);
    expect(csf.readiness).toBeLessThan(0.9);
    expect(res.json.approvals).toBeGreaterThan(0);
    const trust = await new TestClient(app).get<{ name: string; frameworks: unknown[] }>("/api/trust/northwind-health");
    expect(trust.json.frameworks.length).toBeGreaterThan(0);
  });

  it("re-creates the demo from the command line inside its organization", () => {
    // The seed CLI once created the workspace without an organization, so nobody could open it.
    const dir = mkdtempSync(join(tmpdir(), "visua-seed-"));
    try {
      const file = join(dir, "seed.db");
      const cli = resolve(REPO_ROOT, "apps/server/src/seed/cli.ts");
      const env = { ...process.env, VISUA_DATABASE_URL: file, VISUA_DB: "" };
      execFileSync(process.execPath, ["--disable-warning=ExperimentalWarning", cli], { env, stdio: "pipe" });
      execFileSync(process.execPath, ["--disable-warning=ExperimentalWarning", cli, "--reset"], { env, stdio: "pipe" });
      const check = new DatabaseSync(file);
      const ws = check.prepare(`SELECT tenant_id FROM workspaces WHERE slug = 'northwind-health'`).get() as { tenant_id: string | null };
      const org = check.prepare(`SELECT id FROM tenants WHERE slug = 'northwind-health'`).get() as { id: string };
      const trail = check.prepare(`SELECT data FROM activity WHERE workspace_id = ?`).all(org.id).map((r) => JSON.parse(String((r as { data: string }).data)) as { summary: string });
      check.close();
      expect(ws.tenant_id).toBe(org.id);
      // The reset's deletion is on the organization's own audit trail.
      expect(trail.some((e) => e.summary === "Workspace “Northwind Health” and its data deleted")).toBe(true);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  }, 120_000);

  it("deletes a workspace and records it on the organization trail in one transaction", async () => {
    const created = await morgan.post<{ workspace: { id: string; tenantId: string } }>("/api/workspaces", {
      name: "Short-lived",
      profile: { industry: "saas", size: "1-10", dataTypes: [], drivers: [], environments: ["cloud"], maturityTier: 1, guidance: "guided", securityTeamSize: 1 },
    });
    const { id, tenantId } = created.json.workspace;
    // If the organization's audit entry cannot be written, nothing is deleted.
    const append = svc.store.activity.append.bind(svc.store.activity);
    svc.store.activity.append = async (e) => {
      if (e.workspaceId === tenantId) throw new Error("audit trail unavailable");
      return append(e);
    };
    try {
      expect((await morgan.del(`/api/workspaces/${id}`)).status).toBe(500);
    } finally {
      svc.store.activity.append = append;
    }
    expect((await morgan.get(`/api/workspaces/${id}`)).status).toBe(200);
    expect((await morgan.del(`/api/workspaces/${id}`)).status).toBe(200);
    expect((await morgan.get(`/api/workspaces/${id}`)).status).toBe(404);
    const trail = await morgan.get<{ summary: string }[]>(`/api/tenants/${tenantId}/activity?limit=5`);
    expect(trail.json.some((e) => e.summary === "Workspace “Short-lived” and its data deleted")).toBe(true);
    expect((await morgan.get<{ valid: boolean }>(`/api/tenants/${tenantId}/activity/verify`)).json.valid).toBe(true);
  });

  it("publishes on the trust center only the frameworks the workspace chooses, state AI laws off by default", async () => {
    const visitor = new TestClient(app);
    const published = async () => (await visitor.get<{ frameworks: { id: string }[] }>("/api/trust/northwind-health")).json.frameworks.map((f) => f.id);
    const enabled = (await morgan.get<{ frameworks: { id: string; onTrustCenter: boolean }[] }>("/api/workspaces/northwind-health")).json.frameworks;
    expect(enabled.map((f) => f.id)).toContain("us-state-ai-laws");
    expect(enabled.find((f) => f.id === "us-state-ai-laws")?.onTrustCenter).toBe(false);
    expect(await published()).toEqual(enabled.filter((f) => f.id !== "us-state-ai-laws").map((f) => f.id));
    // Publish the laws and withdraw SOC 2: an audited decision.
    const res = await morgan.patch<{ frameworks: { id: string; onTrustCenter: boolean }[] }>("/api/workspaces/northwind-health", { trustCenter: { frameworks: { "us-state-ai-laws": true, "aicpa-tsc-2017": false } } });
    expect(res.status).toBe(200);
    expect(await published()).toContain("us-state-ai-laws");
    expect(await published()).not.toContain("aicpa-tsc-2017");
    const activity = await morgan.get<{ summary: string }[]>("/api/workspaces/northwind-health/activity?limit=3");
    expect(activity.json[0]!.summary).toBe("State AI laws published on the trust center; SOC 2 (TSC 2017) withdrawn on the trust center");
    // Saving the headline keeps the choices; threat catalogs and unknown ids are refused.
    await morgan.patch("/api/workspaces/northwind-health", { trustCenter: { enabled: true, headline: "Northwind Health trust" } });
    expect(await published()).toContain("us-state-ai-laws");
    expect((await morgan.patch("/api/workspaces/northwind-health", { trustCenter: { frameworks: { "mitre-atlas": true } } })).status).toBe(400);
    expect((await morgan.patch("/api/workspaces/northwind-health", { trustCenter: { frameworks: { nope: true } } })).status).toBe(400);
    // Only admins and owners decide what is public.
    const priya = new TestClient(app);
    await priya.devLogin("priya.shah@northwind-health.example");
    expect((await priya.patch("/api/workspaces/northwind-health", { trustCenter: { frameworks: { "us-state-ai-laws": false } } })).status).toBe(403);
    await morgan.patch("/api/workspaces/northwind-health", { trustCenter: { frameworks: { "us-state-ai-laws": false, "aicpa-tsc-2017": true } } });
    expect(await published()).not.toContain("us-state-ai-laws");
  });
});
