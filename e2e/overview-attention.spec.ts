import { randomUUID } from "node:crypto";
import { expect, test as base, type APIRequestContext } from "@playwright/test";
import type { Me } from "../apps/web/src/lib/auth.ts";
import type { Evidence, Task, WorkspaceSummary } from "../apps/web/src/lib/types.ts";

const CSF = "nist-csf-2.0:PR.AA-01";
const SOC = "aicpa-tsc-2017:CC6.1";
const OWNER = "morgan.lee@northwind-health.example";
type Work = { id: string; slug: string; csrf: string; task: Task; evidence: Evidence };
async function write<T>(request: APIRequestContext, method: "post" | "patch", path: string, csrf: string, data: unknown): Promise<T> {
  const response = await request[method](`/api${path}`, { headers: { "x-visua-csrf": csrf }, data });
  expect(response.ok(), await response.text()).toBe(true);
  return await response.json() as T;
}
const test = base.extend<{ overview: Work }>({
  overview: async ({ page }, use) => {
    const previous = await (await page.request.get("/api/auth/me")).json() as Me | null;
    const login = await page.request.post("/api/auth/dev/login", { headers: previous?.csrf ? { "x-visua-csrf": previous.csrf } : undefined, data: { email: OWNER } });
    expect(login.ok()).toBe(true);
    const me = await login.json() as Me;
    const csrf = me.csrf!;
    await write(page.request, "post", "/tenants", csrf, { name: `Attention ${randomUUID()}` });
    const summary = await write<WorkspaceSummary>(page.request, "post", "/workspaces", csrf, { name: `Attention ${randomUUID()}`, frameworks: ["nist-csf-2.0", "aicpa-tsc-2017"], profile: { industry: "saas", size: "11-50" } });
    const { id, slug } = summary.workspace;
    const task = await write<Task>(page.request, "post", `/workspaces/${id}/tasks`, csrf, { title: "Renew SOC access review", requirementIds: [SOC], dueDate: "2000-01-01", assignee: { type: "person", id: me.user.id } });
    const evidence = await write<Evidence>(page.request, "post", `/workspaces/${id}/evidence`, csrf, { title: "Access configuration observation", requirementIds: [CSF, SOC], content: "Access configuration observed", collectedAt: "2026-01-01", validUntil: "2030-12-31" });
    await use({ id, slug, csrf, task, evidence });
    const deleted = await page.request.delete(`/api/workspaces/${id}`, { headers: { "x-visua-csrf": csrf } });
    expect(deleted.ok(), await deleted.text()).toBe(true);
    if (me.activeTenant) await write(page.request, "post", "/auth/tenant", csrf, { tenantId: me.activeTenant.id });
  },
});

test("overview explains scoped metrics and puts the complete attention queue before frameworks", async ({ page, overview }) => {
  const summary = await (await page.request.get(`/api/workspaces/${overview.id}`)).json() as WorkspaceSummary;
  await page.goto(`/w/${overview.slug}`);
  const metrics = page.getByRole("region", { name: "Program metrics" });
  await expect(metrics.locator(".metric").getByText("Implementation progress", { exact: true })).toBeVisible();
  await expect(metrics.locator(".metric").getByText("Valid evidence coverage", { exact: true })).toBeVisible();
  await expect(metrics.locator(".metric").getByText("Requirements at risk", { exact: true })).toBeVisible();
  await page.getByLabel("Metric scope", { exact: true }).selectOption("aicpa-tsc-2017");
  const soc = summary.frameworks.find(f => f.id === "aicpa-tsc-2017")!;
  await expect(metrics.getByText(`${soc.total} in-scope requirements`, { exact: true })).toBeVisible();
  await expect(metrics.locator(".metric").filter({ hasText: "Requirements at risk" }).locator(".metric__value")).toHaveText(String(soc.counts["at-risk"]));
  await metrics.getByText("How these metrics are calculated", { exact: true }).click();
  await expect(metrics.getByText(/critical 4, high 3, medium 2, low 1/)).toBeVisible();
  const attention = page.getByRole("region", { name: "Needs attention" });
  await expect(attention.getByText(overview.task.title, { exact: true })).toBeVisible();
  expect((await attention.boundingBox())!.y).toBeLessThan((await page.getByRole("heading", { name: "Frameworks in scope" }).boundingBox())!.y);
  await page.getByLabel("Queue scope", { exact: true }).selectOption("aicpa-tsc-2017");
  await attention.getByRole("button", { name: /^Implementation gaps/ }).click();
  await expect(attention.locator(".attention__item").first()).toBeVisible();
  await expect(attention.locator(".attention__item").first().getByRole("link").last()).toHaveAttribute("href", /observatory\/aicpa-tsc-2017/);
});

test("an overdue item in a secondary framework opens its task and updates after completion", async ({ page, overview }) => {
  await page.goto(`/w/${overview.slug}`);
  const attention = page.getByRole("region", { name: "Needs attention" });
  await attention.getByRole("button", { name: /^Overdue work/ }).click();
  await expect(attention.getByText("Owner: Morgan Lee", { exact: true })).toBeVisible();
  await attention.getByRole("link", { name: new RegExp(overview.task.title) }).click();
  await expect(page.getByRole("dialog", { name: overview.task.title })).toBeVisible();
  await write(page.request, "patch", `/workspaces/${overview.id}/tasks/${overview.task.id}`, overview.csrf, { status: "done" });
  await page.goto(`/w/${overview.id}`);
  await expect(page.getByRole("button", { name: "Overdue work 0", exact: true })).toBeVisible();
});

test("attention opens an exact artifact for bound review, then coverage refreshes", async ({ page, overview }) => {
  await page.goto(`/w/${overview.slug}`);
  const attention = page.getByRole("region", { name: "Needs attention" });
  await attention.getByRole("button", { name: /^Evidence/ }).click();
  await attention.getByRole("link", { name: new RegExp(overview.evidence.title) }).click();
  const dialog = page.getByRole("dialog", { name: overview.evidence.title });
  await expect(dialog.getByText("Access configuration observed", { exact: true })).toBeVisible();
  await dialog.getByRole("button", { name: "Accept", exact: true }).click();
  await expect(dialog.getByRole("button", { name: "Accept", exact: true })).toHaveCount(0);
  await dialog.getByRole("button", { name: "Close", exact: true }).click();
  await expect(page).not.toHaveURL(/evidence=/);
  await page.goto(`/w/${overview.id}`);
  await expect(page.getByRole("region", { name: "Program metrics" }).getByText(/^1 of \d+ requirements · accepted and valid$/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Evidence 0", exact: true })).toBeVisible();
});

test("queue failures remain retryable instead of claiming nothing needs attention", async ({ page, overview }) => {
  let failing = true;
  await page.route("**/api/workspaces/*/attention", route => failing ? route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ error: "Attention unavailable" }) }) : route.continue());
  await page.goto(`/w/${overview.slug}`);
  const attention = page.getByRole("region", { name: "Needs attention" });
  await expect(attention.getByRole("alert")).toContainText("Could not refresh the attention queue");
  await expect(attention.getByText("No issues match this filter.")).toHaveCount(0);
  failing = false;
  await attention.getByRole("button", { name: "Retry attention queue" }).click();
  await expect(attention.getByText(overview.task.title, { exact: true })).toBeVisible();
});

test("mobile metrics and queue preserve keyboard filtering without horizontal overflow", async ({ page, overview }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`/w/${overview.slug}`);
  const attention = page.getByRole("region", { name: "Needs attention" });
  const evidence = attention.getByRole("button", { name: /^Evidence/ });
  await expect(attention.getByText(overview.task.title, { exact: true })).toBeVisible();
  await evidence.focus();
  await evidence.press("Enter");
  await expect(evidence).toHaveAttribute("aria-pressed", "true");
  await expect(attention.getByText(overview.evidence.title, { exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
});
