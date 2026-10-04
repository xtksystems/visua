import { expect, test, type APIRequestContext, type Locator, type Page } from "@playwright/test";
import type { Me } from "../apps/web/src/lib/auth.ts";
import type { WorkspaceSummary } from "../apps/web/src/lib/types.ts";

const OWNER = "morgan.lee@northwind-health.example";
const PERSONAS = {
  viewer: "jordan.park@northwind-health.example",
  auditor: "alex.kim@audit-partners.example",
  contributor: "sam.ortiz@northwind-health.example",
  approver: "priya.shah@northwind-health.example",
} as const;
type TestRole = keyof typeof PERSONAS;
const REQUIREMENT = "nist-csf-2.0:PR.AA-01";
const TASK = "Role matrix task";
const POLICY = "Role matrix draft policy";
const EVIDENCE = "Role matrix pending artifact";
const AI_SYSTEM = "Role matrix AI system";
let fixture: { id: string; slug: string; name: string; tenantId: string; taskId: string; runId: string; unconfiguredSlug: string };

async function signIn(request: APIRequestContext, email: string): Promise<Me> {
  const session = await (await request.get("/api/auth/me")).json() as { csrf?: string } | null;
  const response = await request.post("/api/auth/dev/login", { data: { email }, headers: session?.csrf ? { "x-visua-csrf": session.csrf } : undefined });
  expect(response.ok(), await response.text()).toBe(true);
  return await response.json() as Me;
}

async function post<T>(request: APIRequestContext, path: string, csrf: string, data: unknown): Promise<T> {
  const response = await request.post(`/api${path}`, { headers: { "x-visua-csrf": csrf }, data });
  expect(response.ok(), await response.text()).toBe(true);
  return await response.json() as T;
}

/** Create memberships in an isolated organization; never change a seeded user's existing role. */
test.beforeAll(async ({ request }) => {
  const me = await signIn(request, OWNER);
  const csrf = me.csrf!;
  const tenant = await post<{ id: string }>(request, "/tenants", csrf, { name: `Page roles ${Date.now()}` });
  for (const [role, email] of Object.entries(PERSONAS)) await post(request, `/tenants/${tenant.id}/members`, csrf, { email, role });
  const meta = await (await request.get("/api/meta")).json() as { frameworks: { id: string }[] };
  const frameworks = ["nist-csf-2.0", "aicpa-tsc-2017", "nist-sp-800-53-r5", "nist-ai-rmf", "us-state-ai-laws"].filter((id) => meta.frameworks.some((fw) => fw.id === id));
  const summary = await post<WorkspaceSummary>(request, "/workspaces", csrf, {
    name: `Page roles workspace ${Date.now()}`, frameworks, planInitialTasks: false,
    profile: { industry: "saas", size: "11-50", dataTypes: ["pii"], drivers: ["ai-systems"], environments: ["cloud"], maturityTier: 1, guidance: "guided", securityTeamSize: 1 },
  });
  const unconfigured = await post<WorkspaceSummary>(request, "/workspaces", csrf, {
    name: `Page roles unconfigured ${Date.now()}`, frameworks: ["nist-csf-2.0"], planInitialTasks: false,
    profile: { industry: "saas", size: "11-50", dataTypes: ["pii"], drivers: ["ai-systems"], environments: ["cloud"], maturityTier: 1, guidance: "guided", securityTeamSize: 1 },
  });
  const ws = `/workspaces/${encodeURIComponent(summary.workspace.id)}`;
  const task = await post<{ id: string }>(request, `${ws}/tasks`, csrf, { title: TASK, status: "todo", requirementIds: [REQUIREMENT], startDate: "2026-10-01", dueDate: "2026-12-01", checklist: [{ text: "Review the implemented configuration" }] });
  await post(request, `${ws}/evidence`, csrf, { title: EVIDENCE, requirementIds: [REQUIREMENT], content: "Observed MFA configuration" });
  await post(request, `${ws}/policies`, csrf, { title: POLICY, body: "# Access policy\n\nDocumented workforce access rules.", requirementIds: [REQUIREMENT] });
  await post(request, `${ws}/connectors`, csrf, { kind: "web-posture", name: "Role matrix connector", config: { url: "https://www.nist.gov" } });
  await post(request, `${ws}/ai/systems`, csrf, { name: AI_SYSTEM, purpose: "Summarize internal documents", role: "deployer", lifecycle: "deploy-use", riskTier: "moderate", generative: true });
  // Offline agent proposals let readers inspect the flight recorder and approvers see decision controls.
  const run = await post<{ id: string }>(request, `${ws}/runs?wait=1`, csrf, { agent: "planner", goal: "Plan role matrix gaps", input: { framework: "nist-csf-2.0" } });
  fixture = { id: summary.workspace.id, slug: summary.workspace.slug, name: summary.workspace.name, tenantId: tenant.id, taskId: task.id, runId: run.id, unconfiguredSlug: unconfigured.workspace.slug };
  if (me.activeTenant) await post(request, "/auth/tenant", csrf, { tenantId: me.activeTenant.id });
});

async function expectWriteControl(control: Locator, allowed: boolean) {
  await expect(control).toBeVisible();
  if (allowed) await expect(control).toBeEnabled();
  else await expect(control).toBeDisabled();
}

function observeWrites(page: Page): string[] {
  const writes: string[] = [];
  page.on("request", (request) => {
    if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method()) && /\/api\/(workspaces|tenants)\//.test(request.url())) writes.push(`${request.method()} ${request.url()}`);
  });
  return writes;
}

for (const role of Object.keys(PERSONAS) as TestRole[]) {
  test(`${role} can view every workspace destination with controls matching server capabilities`, async ({ page }) => {
    test.setTimeout(180_000);
    const me = await signIn(page.request, PERSONAS[role]);
    await post(page.request, "/auth/tenant", me.csrf!, { tenantId: fixture.tenantId });
    const writes = observeWrites(page);
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    const canWrite = role === "contributor" || role === "approver";
    const canApprove = role === "approver";
    const canExport = role !== "viewer";
    const base = `/w/${fixture.slug}`;
    const open = async (path: string) => { await page.goto(`${base}${path}`); };

    await open("");
    await expect(page.getByRole("heading", { level: 1, name: fixture.name })).toBeVisible();
    await expectWriteControl(page.getByRole("button", { name: "Plan with agent", exact: true }), canWrite);
    await expect(page.getByRole("link", { name: /Explore Observatory/ })).toBeEnabled();

    await open("/plan");
    await expect(page.getByRole("heading", { name: "Action plan", exact: true })).toBeVisible();
    await expectWriteControl(page.getByRole("button", { name: "Generate plan", exact: true }), canWrite);
    await expectWriteControl(page.getByRole("button", { name: "Plan with agent", exact: true }), canWrite);
    const title = page.getByRole("textbox", { name: "Task title", exact: true });
    await expectWriteControl(title, canWrite);
    if (canWrite) {
      await title.fill("A task draft kept in this browser");
      await expect(page.getByRole("button", { name: "Add task", exact: true })).toBeEnabled();
    } else await expect(page.getByRole("button", { name: "Add task", exact: true })).toBeDisabled();
    await expect(page.getByRole("combobox", { name: "Filter by framework" })).toBeEnabled();
    const card = page.locator(".card").filter({ hasText: TASK });
    await expect(card).toHaveAttribute("draggable", String(canWrite));
    if (!canWrite) {
      // A synthetic drop must not bypass the disabled drag affordance.
      await page.getByRole("region", { name: "Done", exact: true }).dispatchEvent("drop", { dataTransfer: await page.evaluateHandle((id) => { const data = new DataTransfer(); data.setData("text/task", id); return data; }, fixture.taskId) });
    }
    await card.click();
    const taskDialog = page.getByRole("dialog");
    await expectWriteControl(taskDialog.getByRole("combobox", { name: "Task status" }), canWrite);
    await expectWriteControl(taskDialog.getByRole("checkbox"), canWrite);
    await expect(taskDialog.getByRole("button", { name: "Execute with agent" })).toHaveCount(canWrite ? 1 : 0);
    await taskDialog.getByRole("button", { name: "Close", exact: true }).click();
    await page.getByRole("button", { name: "Timeline", exact: true }).click();
    await expect(page.getByRole("button", { name: TASK, exact: true })).toBeEnabled();

    await open("/evidence");
    await expect(page.getByRole("heading", { name: "Evidence ledger" })).toBeVisible();
    await expectWriteControl(page.getByRole("button", { name: "Collect with agent" }), canWrite);
    await expectWriteControl(page.getByRole("button", { name: "Add connector", exact: true }), false);
    await expectWriteControl(page.getByRole("button", { name: "Run", exact: true }), canWrite);
    await page.getByRole("button", { name: EVIDENCE, exact: true }).click();
    await expect(page.getByRole("dialog")).toContainText("Observed MFA configuration");
    await expect(page.getByRole("dialog").getByRole("button", { name: "Accept", exact: true })).toHaveCount(canApprove ? 1 : 0);
    await expect(page.getByRole("dialog").getByRole("button", { name: "Reject", exact: true })).toHaveCount(canApprove ? 1 : 0);
    await page.getByRole("dialog").getByRole("button", { name: "Close", exact: true }).click();
    await page.getByRole("button", { name: "Automated", exact: true }).click();
    await expect(page.getByRole("button", { name: "Automated", exact: true })).toHaveAttribute("aria-pressed", "true");

    await open("/policies");
    await expect(page.getByRole("heading", { name: "Policies", exact: true })).toBeVisible();
    await page.locator(".runrow").filter({ hasText: POLICY }).click();
    await expectWriteControl(page.getByRole("button", { name: "Draft", exact: true }), canWrite);
    await expect(page.getByRole("button", { name: "Edit", exact: true })).toHaveCount(canWrite ? 1 : 0);
    await expect(page.getByRole("button", { name: "Submit for review", exact: true })).toHaveCount(canWrite ? 1 : 0);
    await expect(page.getByRole("button", { name: "Approve", exact: true })).toHaveCount(canApprove ? 1 : 0);

    await page.route(`**/api/workspaces/*/runs/${fixture.runId}`, async (route) => {
      const response = await route.fetch();
      const run = await response.json();
      await route.fulfill({ response, json: { ...run, status: "queued" } });
    });
    await open(`/agents/${fixture.runId}`);
    await expect(page.getByRole("heading", { name: "Agents", exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Launch an agent" })).toHaveCount(canWrite ? 1 : 0);
    if (canWrite) await expect(page.getByRole("button", { name: "Run Copilot", exact: true })).toBeEnabled();
    await expect(page.getByRole("button", { name: "Stop", exact: true })).toHaveCount(canWrite ? 1 : 0);
    await expect(page.getByRole("button", { name: /Approve all/ })).toHaveCount(canApprove ? 1 : 0);
    await page.getByRole("tab", { name: /Approvals inbox/ }).click();
    await expect(page.getByRole("tab", { name: /Approvals inbox/ })).toHaveAttribute("aria-selected", "true");
    const inbox = page.locator(".master-detail__master");
    if (canApprove) await expect(inbox.getByRole("button", { name: "Approve", exact: true }).first()).toBeEnabled();
    else await expect(inbox.getByRole("button", { name: "Approve", exact: true })).toHaveCount(0);

    await open("/profile");
    await expect(page.getByRole("heading", { name: "Organizational Profile & Tiers" })).toBeVisible();
    const tierRadio = page.locator('input[type="radio"]').first();
    await expectWriteControl(tierRadio, canWrite);
    if (canWrite) for (const field of await page.locator('fieldset').all()) {
      const radio = field.locator('input[type="radio"]').first();
      await radio.locator("..").click();
      await expect(radio).toBeChecked();
    }
    await expectWriteControl(page.getByRole("button", { name: "Save assessment" }), canWrite);
    await expect(page.getByRole("link", { name: "Organizational Profile (CSV)" })).toHaveCount(canExport ? 1 : 0);

    await open("/soc2");
    await expect(page.getByRole("heading", { name: /Type [12] readiness/ })).toBeVisible();
    await expect(page.getByRole("button", { name: "Save scope" })).toBeDisabled();
    await expect(page.getByRole("checkbox", { name: /Availability/ })).toBeDisabled();
    await expect(page.getByRole("link", { name: "PBC request list" })).toHaveCount(canExport ? 1 : 0);
    await expect(page.getByRole("link", { name: "Criteria in 3D" })).toBeEnabled();

    await open("/rmf");
    await expect(page.getByRole("heading", { name: "Categorize · FIPS 199" })).toBeVisible();
    await expectWriteControl(page.getByRole("button", { name: "Add type", exact: true }), canApprove);
    await expectWriteControl(page.getByRole("button", { name: "Record decision", exact: true }), canApprove);
    await expectWriteControl(page.getByRole("textbox", { name: "Control", exact: true }), canApprove);
    await expect(page.getByRole("tablist", { name: "RMF steps" }).getByRole("tab").first()).toBeEnabled();
    await expect(page.getByRole("link", { name: "OSCAL SSP", exact: true })).toHaveCount(canExport ? 1 : 0);

    await open("/ai");
    await expect(page.getByRole("heading", { name: /AI RMF readiness/ })).toBeVisible();
    await expectWriteControl(page.getByRole("button", { name: "Add system", exact: true }), canWrite);
    await expectWriteControl(page.getByRole("button", { name: `Edit ${AI_SYSTEM}`, exact: true }), canWrite);
    await expectWriteControl(page.getByRole("button", { name: `Remove ${AI_SYSTEM}`, exact: true }), canWrite);
    await expect(page.getByRole("link", { name: "AI RMF profile (CSV)" })).toHaveCount(canExport ? 1 : 0);
    await expect(page.getByRole("link", { name: "Outcomes in 3D" })).toBeEnabled();

    await open("/laws");
    await expect(page.getByRole("heading", { name: /State AI laws/ })).toBeVisible();
    await page.getByRole("textbox", { name: "Filter laws" }).fill("Colorado");
    await expect(page.getByRole("textbox", { name: "Filter laws" })).toHaveValue("Colorado");
    await page.locator(".law-row").first().click();
    const lawCard = page.locator("article").first();
    await expectWriteControl(lawCard.getByRole("textbox", { name: /Basis for .* applicability/ }), canApprove);
    await expectWriteControl(lawCard.getByRole("checkbox").first(), canApprove);

    await open("/crosswalk?group=nist-csf-2.0%3APR.AA");
    await expect(page.getByText("Crosswalk Nexus", { exact: true })).toBeVisible();
    await expect(page.getByRole("complementary", { name: "Crosswalk details" })).toContainText("PR.AA");
    await expect(page.getByRole("button", { name: /Project mapped progress onto/ })).toHaveCount(canWrite ? 1 : 0);
    await expect(page.getByRole("button", { name: "Threat ring", exact: true })).toBeEnabled();

    await open("/threats");
    await expect(page.getByRole("heading", { name: "AI threats, seen through your requirements" })).toBeVisible();
    await expect(page.getByRole("tablist", { name: "Threat catalogs" }).getByRole("tab").first()).toBeEnabled();
    await expect(page.getByRole("textbox", { name: /Find a / })).toBeEnabled();
    await open("/threats/mitre-atlas");
    await expect(page.getByRole("heading", { name: "AI threats, seen through your requirements" })).toBeVisible();

    await open("/reports");
    await expect(page.getByRole("heading", { name: "Reports, audit trail & trust" })).toBeVisible();
    await expectWriteControl(page.getByRole("checkbox", { name: "Public", exact: true }), false);
    await expectWriteControl(page.getByRole("textbox", { name: "Trust center headline" }), false);
    await expectWriteControl(page.getByRole("button", { name: "Save", exact: true }), false);
    expect(await page.locator('a[href*="/exports/"]').count() > 0).toBe(canExport);

    await open("/settings");
    await expect(page.getByRole("heading", { name: "Workspace settings" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Save profile" })).toBeDisabled();
    await expect(page.getByRole("switch").first()).toBeDisabled();
    await expect(page.getByRole("button", { name: "Delete workspace" })).toBeDisabled();
    await expect(page.getByRole("link", { name: "headline and visibility" })).toBeEnabled();

    await open("/organization");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Page roles");
    await expect(page.getByRole("table")).toContainText(PERSONAS[role]);
    await expect(page.getByRole("button", { name: "Add member" })).toHaveCount(0);
    await expect(page.getByRole("combobox", { name: /Role of / })).toHaveCount(0);
    await expect(page.getByRole("tab", { name: "API tokens" })).toHaveCount(0);
    await expect(page.getByRole("tab", { name: "Single sign-on" })).toHaveCount(0);
    await expect(page.getByRole("tab", { name: "Audit trail" })).toHaveCount(canExport ? 1 : 0);
    // Creating another organization is permitted to an unscoped user by the server.
    await expect(page.getByRole("button", { name: "Create organization" })).toBeVisible();

    await open("/observatory/nist-csf-2.0");
    await expect(page.getByRole("tree", { name: "Framework outline" })).toBeVisible();
    await expect(page.getByRole("textbox", { name: "Filter outline" })).toBeEnabled();
    for (const [path, label] of [["/soc2", "Enable SOC 2"], ["/rmf", "Enable NIST RMF / SP 800-53"], ["/ai", "Enable NIST AI RMF"]]) {
      await page.goto(`/w/${fixture.unconfiguredSlug}${path}`);
      await expectWriteControl(page.getByRole("button", { name: label, exact: true }), false);
    }
    await page.goto(`/w/${fixture.unconfiguredSlug}/laws`);
    await expect(page.getByRole("textbox", { name: "Filter laws" })).toBeEnabled();
    await expect(page.getByRole("button", { name: "Track state AI laws" })).toHaveCount(0);
    await page.goto("/onboarding");
    await expect(page.getByRole("heading", { name: "Workspace setup" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Create workspace" })).toHaveCount(0);
    expect(writes, "Viewing, filtering and synthetic forbidden drops must not submit writes").toEqual([]);
    expect(errors).toEqual([]);
  });
}

test("contributor page writes succeed and a failed policy save keeps its draft with one error", async ({ page }) => {
  await signIn(page.request, PERSONAS.contributor);
  await page.goto(`/w/${fixture.slug}/plan`);
  const newTitle = `Contributor browser task ${Date.now()}`;
  await page.getByRole("textbox", { name: "Task title", exact: true }).fill(newTitle);
  const creation = page.waitForResponse((response) => response.request().method() === "POST" && response.url().endsWith(`/workspaces/${fixture.id}/tasks`));
  await page.getByRole("button", { name: "Add task", exact: true }).click();
  expect((await creation).status()).toBe(201);
  await expect(page.locator(".card").filter({ hasText: newTitle })).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Task title", exact: true })).toHaveValue("");

  await page.goto(`/w/${fixture.slug}/policies`);
  await page.locator(".runrow").filter({ hasText: POLICY }).click();
  await page.getByRole("button", { name: "Edit", exact: true }).click();
  const body = "# Preserved policy draft\n\nThis text must survive a server failure.";
  await page.getByRole("textbox", { name: "Policy body (Markdown)" }).fill(body);
  await page.route("**/api/workspaces/*/policies/*", async (route) => {
    if (route.request().method() === "PATCH") await route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ error: "Policy storage is temporarily unavailable" }) });
    else await route.continue();
  });
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByText("Policy storage is temporarily unavailable", { exact: true })).toBeVisible();
  await expect(page.getByText("Policy storage is temporarily unavailable", { exact: true })).toHaveCount(1);
  await expect(page.getByRole("textbox", { name: "Policy body (Markdown)" })).toHaveValue(body);
  await page.unroute("**/api/workspaces/*/policies/*");
  const saving = page.waitForResponse((response) => response.request().method() === "PATCH" && response.url().includes(`/workspaces/${fixture.id}/policies/`));
  await page.getByRole("button", { name: "Save", exact: true }).click();
  expect((await saving).status()).toBe(200);
  await expect(page.getByRole("textbox", { name: "Policy body (Markdown)" })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Preserved policy draft", exact: true })).toBeVisible();
});

test("approver can accept inspected evidence and approve a policy through page controls", async ({ page }) => {
  await signIn(page.request, PERSONAS.approver);
  await page.goto(`/w/${fixture.slug}/evidence`);
  const row = page.getByRole("row").filter({ hasText: EVIDENCE });
  await row.getByRole("button", { name: EVIDENCE, exact: true }).click();
  const review = page.waitForResponse((response) => response.request().method() === "PATCH" && response.url().includes(`/workspaces/${fixture.id}/evidence/`));
  await page.getByRole("dialog").getByRole("button", { name: "Accept", exact: true }).click();
  expect((await review).status()).toBe(200);
  await expect(page.getByRole("dialog")).toContainText("accepted by");
  await page.getByRole("dialog").getByRole("button", { name: "Close", exact: true }).click();
  await expect(row).toContainText("no expiry");

  await page.goto(`/w/${fixture.slug}/policies`);
  await page.locator(".runrow").filter({ hasText: POLICY }).click();
  const approval = page.waitForResponse((response) => response.request().method() === "PATCH" && response.url().includes(`/workspaces/${fixture.id}/policies/`));
  await page.getByRole("button", { name: "Approve", exact: true }).click();
  expect((await approval).status()).toBe(200);
  await expect(page.getByRole("button", { name: "Publish", exact: true })).toBeEnabled();
});
