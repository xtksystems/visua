import { expect, test, type Page } from "@playwright/test";

const WS = "/w/northwind-health";
const MORGAN = "morgan.lee@northwind-health.example";

/** Developer sign-in (the e2e server runs in developer mode); returns the session's CSRF token. */
async function signIn(page: Page, email = MORGAN): Promise<string> {
  const res = await page.request.post("/api/auth/dev/login", { data: { email } });
  expect(res.ok(), await res.text()).toBe(true);
  return ((await res.json()) as { csrf: string }).csrf;
}

/** Collect console errors and uncaught exceptions for the duration of a test. */
function watchErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  return errors;
}

test("home shows the workspace, its frameworks and next best actions", async ({ page }) => {
  await signIn(page);
  const errors = watchErrors(page);
  await page.goto(WS);
  await expect(page.getByRole("heading", { level: 1, name: "Northwind Health" })).toBeVisible();
  for (const name of ["CSF 2.0", "SOC 2", "SP 800-53", "RMF"]) await expect(page.getByText(name).first()).toBeVisible();
  await expect(page.getByRole("heading", { name: "Next best actions" })).toBeVisible();
  expect(errors).toEqual([]);
});

test("Observatory renders the 3D scene with its keyboard-accessible 2D twin", async ({ page }) => {
  await signIn(page);
  const errors = watchErrors(page);
  await page.goto(`${WS}/observatory/nist-csf-2.0`);
  await expect(page.locator(".observatory__canvas canvas")).toBeVisible();
  const tree = page.getByRole("tree", { name: "Framework outline" });
  await expect(tree).toBeVisible();
  await tree.locator(".outline__row", { hasText: "GV" }).first().click();
  await expect(page.locator("aside.inspector")).toBeVisible();
  // Deep link to an outcome opens its inspector with the official text and a page citation.
  await page.goto(`${WS}/observatory/nist-csf-2.0?select=${encodeURIComponent("nist-csf-2.0:PR.AA-01")}`);
  const inspector = page.getByRole("complementary", { name: "PR.AA-01 details" });
  await expect(inspector).toContainText("Identities and credentials for authorized users, services, and hardware are managed by the organization");
  await expect(inspector).toContainText(/p\. \d+/);
  expect(errors).toEqual([]);
});

test("Crosswalk Nexus selects a group and lists authoritative mappings", async ({ page }) => {
  await signIn(page);
  const errors = watchErrors(page);
  await page.goto(`${WS}/crosswalk`);
  await expect(page.locator(".observatory__canvas canvas")).toBeVisible();
  await expect(page.getByText("Do the work once, see where it counts")).toBeVisible();
  await page.getByRole("textbox", { name: "Find a requirement group" }).fill("PR.AA");
  await page.getByRole("listitem").filter({ hasText: "PR.AA" }).first().click();
  await expect(page).toHaveURL(/group=nist-csf-2\.0%3APR\.AA/);
  await expect(page.getByRole("note").first()).toContainText("not evidence");
  await expect(page.locator(".xw-row").first()).toBeVisible();
  expect(errors).toEqual([]);
});

test("RMF program: lifecycle, FIPS 199 categorization and authorization record", async ({ page }) => {
  await signIn(page);
  const errors = watchErrors(page);
  await page.goto(`${WS}/rmf`);
  await expect(page.getByRole("tablist", { name: "RMF steps" }).getByRole("tab")).toHaveCount(7);
  await expect(page.getByText("Categorize · FIPS 199")).toBeVisible();
  await expect(page.getByText(/SC = \{\(confidentiality/)).toBeVisible();
  await expect(page.getByText("Authorize · Task R-4")).toBeVisible();
  expect(errors).toEqual([]);
});

test("SOC 2 program: scope, observation window and DC 200 checklist", async ({ page }) => {
  await signIn(page);
  const errors = watchErrors(page);
  await page.goto(`${WS}/soc2`);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Type 2 readiness");
  await expect(page.getByText("Examination scope")).toBeVisible();
  await expect(page.getByText("System description · DC 200")).toBeVisible();
  await expect(page.getByText("DC8", { exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});

test("agents propose, people approve: an offline Copilot run completes with citations", async ({ page }) => {
  const csrf = await signIn(page);
  const request = page.request;
  const run = await request.post("/api/workspaces/northwind-health/runs?wait=1", { data: { agent: "copilot", goal: "What does GV.SC-07 require?", input: {} }, headers: { "x-visua-csrf": csrf } });
  expect(run.ok()).toBe(true);
  const body = (await run.json()) as { id: string; status: string };
  expect(body.status).toBe("completed");
  const detail = (await (await request.get(`/api/workspaces/northwind-health/runs/${body.id}`)).json()) as { steps: { type: string; citations?: { documentId: string; page?: number }[] }[] };
  const citations = detail.steps.flatMap((s) => s.citations ?? []);
  expect(citations.length).toBeGreaterThan(0);
  expect(citations.some((c) => c.documentId && c.page)).toBe(true);
  await page.goto(`${WS}/agents/${body.id}`);
  await expect(page.getByText("What does GV.SC-07 require?").first()).toBeVisible();
});

test("public trust center shows only computed facts", async ({ page }) => {
  await page.goto("/trust/northwind-health");
  await expect(page.getByText("Trust center · powered by Visua")).toBeVisible();
  await expect(page.getByText(/Readiness is not an audit opinion/)).toBeVisible();
});

test("AI governance: inventory, AI RMF functions and Generative AI Profile risks", async ({ page }) => {
  await signIn(page);
  const meta = (await (await page.request.get("/api/meta")).json()) as { frameworks: { id: string }[] };
  test.skip(!meta.frameworks.some((f) => f.id === "nist-ai-rmf"), "NIST AI RMF corpus not ingested");
  const errors = watchErrors(page);
  await page.goto(`${WS}/ai`);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("AI RMF readiness");
  await expect(page.getByText("AI system inventory")).toBeVisible();
  await expect(page.getByRole("row", { name: /Clinical note summarizer/ })).toBeVisible();
  for (const fn of ["GOVERN", "MAP", "MEASURE", "MANAGE"]) await expect(page.getByText(fn, { exact: true }).first()).toBeVisible();
  await expect(page.getByText("Generative AI Profile (NIST AI 600-1)")).toBeVisible();
  await expect(page.getByText("Confabulation").first()).toBeVisible();
  expect(errors).toEqual([]);
});

test("sign-in: developer personas open the workspace with their organization role", async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto(`${WS}/agents`);
  await expect(page).toHaveURL(/\/login\?returnTo=/);
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
  await page.getByRole("list", { name: "Demo personas" }).getByRole("button", { name: /Priya Shah/ }).click();
  await expect(page).toHaveURL(new RegExp(`${WS}/agents$`));
  await expect(page.locator(".topbar .role-badge")).toHaveText("Approver");
  expect(errors).toEqual([]);
});

test("roles: a viewer sees everything read-only and cannot decide or export", async ({ page }) => {
  await signIn(page, "jordan.park@northwind-health.example");
  await page.goto(`${WS}/agents`);
  await expect(page.locator(".topbar .role-badge")).toHaveText("Viewer · read-only");
  await expect(page.getByRole("heading", { name: "Launch an agent" })).toHaveCount(0);
  await page.getByRole("tab", { name: /Approvals inbox/ }).click();
  await expect(page.getByText("Awaiting an approver").first()).toBeVisible();
  await expect(page.getByRole("button", { name: /^Approve/ })).toHaveCount(0);
  await page.goto(`${WS}/reports`);
  await expect(page.getByRole("note").filter({ hasText: "Exports are available" })).toBeVisible();
  const res = await page.request.get("/api/workspaces/northwind-health/exports/readiness.md");
  expect(res.status()).toBe(403);
});

test("tenant separation: another organization cannot see Northwind Health", async ({ page }) => {
  await signIn(page, "taylor.brooks@contoso-bank.example");
  expect((await page.request.get("/api/workspaces/northwind-health")).status()).toBe(404);
  const list = (await (await page.request.get("/api/workspaces")).json()) as unknown[];
  expect(list).toHaveLength(0);
  await page.goto(WS);
  // Contoso Bank has no workspace yet: its owner is sent to onboarding, never into Northwind.
  await expect(page).toHaveURL(/\/onboarding$/);
});

test("organization admin: members, roles and a one-time API token", async ({ page }) => {
  const errors = watchErrors(page);
  await signIn(page);
  await page.goto(`${WS}/organization`);
  await expect(page.getByRole("heading", { level: 1, name: "Northwind Health" })).toBeVisible();
  await expect(page.getByRole("row").filter({ hasText: "priya.shah@northwind-health.example" })).toContainText("Approver");
  await page.getByLabel("Email").fill("new.analyst@northwind-health.example");
  await page.getByRole("button", { name: "Add member" }).click();
  await expect(page.getByRole("row").filter({ hasText: "new.analyst@northwind-health.example" })).toBeVisible();
  await page.getByRole("tab", { name: "API tokens" }).click();
  await page.getByLabel("Token name").fill("CI evidence upload");
  await page.getByRole("button", { name: "Create token" }).click();
  await expect(page.getByRole("status").filter({ hasText: "will not be shown again" })).toContainText("vsa_");
  await page.getByRole("tab", { name: "Audit trail" }).click();
  await expect(page.getByText("Chain intact")).toBeVisible();
  expect(errors).toEqual([]);
});

test("threat views: ATLAS matrix, coverage from linked requirements, and the Nexus threat ring", async ({ page }) => {
  await signIn(page);
  const errors = watchErrors(page);
  await page.goto(`${WS}/threats`);
  await expect(page.getByRole("heading", { level: 1, name: /AI threats/ })).toBeVisible();
  const matrix = page.getByRole("grid", { name: /MITRE ATLAS matrix/ });
  await expect(matrix).toBeVisible();
  await expect(matrix.getByText("Reconnaissance", { exact: true })).toBeVisible();
  // A technique opens the coverage inspector: never a status of its own, always the linked requirements.
  await matrix.getByRole("button", { name: /LLM Prompt Injection/ }).first().click();
  const inspector = page.getByRole("complementary", { name: /AML\.T0051 details/ });
  await expect(inspector.getByText(/Partly covered|Covered|Open/).first()).toBeVisible();
  await inspector.getByRole("tab", { name: /Linked requirements/ }).click();
  await expect(inspector.getByText("Draft").first()).toBeVisible();
  // Final links only: ATLAS has no final link to a requirement.
  await inspector.getByRole("button", { name: "Final only" }).click();
  await expect(inspector.getByText("No linked requirement at the chosen link status.")).toBeVisible();
  await inspector.getByRole("button", { name: "All published links" }).click();
  // OWASP LLM Top 10: the 2026 edition, with the 2025 entry each one replaces.
  await page.getByRole("tab", { name: /OWASP LLM Top 10/ }).click();
  await expect(page.getByText("LLM04:2026")).toBeVisible();
  await expect(page.getByText("was LLM03:2025")).toBeVisible();
  // The Nexus shows the inner threat ring and its detail.
  await page.goto(`${WS}/crosswalk?group=${encodeURIComponent("mitre-atlas:AML.TA0004")}`);
  await expect(page.locator(".observatory__canvas canvas")).toBeVisible();
  await expect(page.getByText("MITRE ATLAS · threat ring")).toBeVisible();
  await expect(page.getByRole("button", { name: /Threat ring/ })).toHaveAttribute("aria-pressed", "true");
  expect(errors).toEqual([]);
});
