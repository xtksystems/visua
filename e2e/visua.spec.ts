import { expect, test, type Page } from "@playwright/test";

const WS = "/w/northwind-health";

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
  const errors = watchErrors(page);
  await page.goto(WS);
  await expect(page.getByRole("heading", { level: 1, name: "Northwind Health" })).toBeVisible();
  for (const name of ["CSF 2.0", "SOC 2", "SP 800-53", "RMF"]) await expect(page.getByText(name).first()).toBeVisible();
  await expect(page.getByRole("heading", { name: "Next best actions" })).toBeVisible();
  expect(errors).toEqual([]);
});

test("Observatory renders the 3D scene with its keyboard-accessible 2D twin", async ({ page }) => {
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
  const errors = watchErrors(page);
  await page.goto(`${WS}/rmf`);
  await expect(page.getByRole("tablist", { name: "RMF steps" }).getByRole("tab")).toHaveCount(7);
  await expect(page.getByText("Categorize · FIPS 199")).toBeVisible();
  await expect(page.getByText(/SC = \{\(confidentiality/)).toBeVisible();
  await expect(page.getByText("Authorize · Task R-4")).toBeVisible();
  expect(errors).toEqual([]);
});

test("SOC 2 program: scope, observation window and DC 200 checklist", async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto(`${WS}/soc2`);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Type 2 readiness");
  await expect(page.getByText("Examination scope")).toBeVisible();
  await expect(page.getByText("System description · DC 200")).toBeVisible();
  await expect(page.getByText("DC8", { exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});

test("agents propose, people approve: an offline Copilot run completes with citations", async ({ page, request }) => {
  const run = await request.post("/api/workspaces/northwind-health/runs?wait=1", { data: { agent: "copilot", goal: "What does GV.SC-07 require?", input: {} } });
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

test("AI governance: inventory, AI RMF functions and Generative AI Profile risks", async ({ page, request }) => {
  const meta = (await (await request.get("/api/meta")).json()) as { frameworks: { id: string }[] };
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
