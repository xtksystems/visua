import { randomUUID } from "node:crypto";
import { expect, test as base, type APIRequestContext } from "@playwright/test";
import type { Me } from "../apps/web/src/lib/auth.ts";
import type { WorkspaceSummary } from "../apps/web/src/lib/types.ts";

async function write<T>(request: APIRequestContext, method: "post" | "patch", path: string, csrf: string, data: unknown): Promise<T> {
  const response = await request[method](`/api${path}`, { headers: { "x-visua-csrf": csrf }, data });
  expect(response.ok(), await response.text()).toBe(true);
  return await response.json() as T;
}
const test = base.extend<{ workspace: { id: string; slug: string; csrf: string } }>({
  workspace: async ({ page }, use) => {
    const previous = await (await page.request.get("/api/auth/me")).json() as Me | null;
    const login = await page.request.post("/api/auth/dev/login", { headers: previous?.csrf ? { "x-visua-csrf": previous.csrf } : undefined, data: { email: "morgan.lee@northwind-health.example" } });
    expect(login.ok()).toBe(true);
    const me = await login.json() as Me;
    const summary = await write<WorkspaceSummary>(page.request, "post", "/workspaces", me.csrf!, { name: `Claims ${randomUUID()}`, frameworks: ["nist-csf-2.0"], planInitialTasks: false, profile: { industry: "saas", size: "11-50" } });
    const { id, slug } = summary.workspace;
    try { await use({ id, slug, csrf: me.csrf! }); }
    finally { expect((await page.request.delete(`/api/workspaces/${id}`, { headers: { "x-visua-csrf": me.csrf! } })).ok()).toBe(true); }
  },
});

test("autonomy settings retire broad grants and save only supported choices", async ({ page, workspace }) => {
  let oldGrant = true;
  await page.route(`**/api/workspaces/${workspace.id}`, async route => {
    if (route.request().method() !== "GET") return route.continue();
    const response = await route.fetch();
    const body = await response.json() as WorkspaceSummary;
    if (oldGrant) body.workspace.autonomy = { ...body.workspace.autonomy, "set-level": true };
    await route.fulfill({ response, json: body });
  });
  await page.goto(`/w/${workspace.id}/settings`);
  const panel = page.locator(".panel").filter({ has: page.getByRole("heading", { name: "Agent autonomy", exact: true }) });
  await expect(panel.getByRole("switch")).toHaveCount(2);
  await expect(panel.getByRole("note")).toContainText("Earlier grants for other change types");
  await expect(panel).toContainText("narrative evidence and task updates always require human approval");
  const update = page.waitForRequest(request => request.method() === "PATCH" && request.url().endsWith(`/api/workspaces/${workspace.id}`));
  oldGrant = false;
  await panel.getByRole("switch", { name: "Create tasks", exact: true }).click();
  expect((await update).postDataJSON()).toEqual({ autonomy: { "create-task": true, "create-evidence": false } });
  await expect(panel.getByRole("switch", { name: "Create tasks", exact: true })).toHaveAttribute("aria-checked", "true");
  await expect(panel.getByRole("note")).toHaveCount(0);
});

test("public measures disclose their basis and authored headline on desktop and phone", async ({ page, workspace }) => {
  const headline = "Our organization maintains this assessment";
  await write(page.request, "patch", `/workspaces/${workspace.id}`, workspace.csrf, { trustCenter: { enabled: true, headline, frameworkIds: ["nist-csf-2.0"] } });
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(`/trust/${workspace.slug}`);
    await expect(page.getByRole("heading", { name: headline, exact: true })).toBeVisible();
    await expect(page.getByText(/Organization-authored statement/)).toBeVisible();
    await expect(page.locator("time[datetime]").first()).toBeVisible();
    await page.getByText("Calculation basis", { exact: true }).click();
    await expect(page.getByText(/Weighted completion 0.00/)).toBeVisible();
    await page.getByText("Scope and limitations", { exact: true }).click();
    await expect(page.getByText(/not a reconstruction of historical edits/)).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  }
});
