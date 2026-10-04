import { randomUUID } from "node:crypto";
import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
import type { Me } from "../apps/web/src/lib/auth.ts";
import type { WorkspaceSummary } from "../apps/web/src/lib/types.ts";

const OWNER = "morgan.lee@northwind-health.example";
const PERSONAS = {
  viewer: "jordan.park@northwind-health.example",
  auditor: "alex.kim@audit-partners.example",
  contributor: "sam.ortiz@northwind-health.example",
  approver: "priya.shah@northwind-health.example",
} as const;
const A = "nist-csf-2.0:PR.AA-01";
const CONTROL = "nist-sp-800-53-r5:AC-2";
const ARTIFACT = "Keyboard navigation observation";
let fixture: { id: string; slug: string; tenantId: string };

async function signIn(request: APIRequestContext, email: string): Promise<Me> {
  const prior = await (await request.get("/api/auth/me")).json() as { csrf?: string } | null;
  const response = await request.post("/api/auth/dev/login", { data: { email }, headers: prior?.csrf ? { "x-visua-csrf": prior.csrf } : undefined });
  expect(response.ok(), await response.text()).toBe(true);
  return await response.json() as Me;
}
async function post<T>(request: APIRequestContext, path: string, csrf: string, data: unknown): Promise<T> {
  const response = await request.post(`/api${path}`, { headers: { "x-visua-csrf": csrf }, data });
  expect(response.ok(), await response.text()).toBe(true);
  return await response.json() as T;
}

test.beforeAll(async ({ request }) => {
  const owner = await signIn(request, OWNER);
  const tenant = await post<{ id: string }>(request, "/tenants", owner.csrf!, { name: `Keyboard navigation ${randomUUID()}` });
  for (const [role, email] of Object.entries(PERSONAS)) await post(request, `/tenants/${tenant.id}/members`, owner.csrf!, { email, role });
  const summary = await post<WorkspaceSummary>(request, "/workspaces", owner.csrf!, {
    name: `Keyboard navigation ${randomUUID()}`, frameworks: ["nist-csf-2.0", "nist-sp-800-53-r5"], planInitialTasks: false,
    profile: { industry: "healthcare", size: "51-200" },
  });
  fixture = { id: summary.workspace.id, slug: summary.workspace.slug, tenantId: tenant.id };
  expect(fixture.id).not.toBe(fixture.slug);
  await post(request, `/workspaces/${fixture.id}/evidence`, owner.csrf!, { title: ARTIFACT, content: "Observed access configuration", requirementIds: [A] });
  if (owner.activeTenant) await post(request, "/auth/tenant", owner.csrf!, { tenantId: owner.activeTenant.id });
});

test.afterAll(async ({ request }) => {
  if (!fixture) return;
  const owner = await signIn(request, OWNER);
  await post(request, "/auth/tenant", owner.csrf!, { tenantId: fixture.tenantId });
  const response = await request.delete(`/api/workspaces/${fixture.id}`, { headers: { "x-visua-csrf": owner.csrf! } });
  expect(response.ok(), await response.text()).toBe(true);
  if (owner.activeTenant) await post(request, "/auth/tenant", owner.csrf!, { tenantId: owner.activeTenant.id });
});

async function activate(page: Page, email: string) {
  const me = await signIn(page.request, email);
  await post(page.request, "/auth/tenant", me.csrf!, { tenantId: fixture.tenantId });
}

for (const role of Object.keys(PERSONAS) as (keyof typeof PERSONAS)[]) {
  test(`${role} follows requirement links and uses the palette without changing role permissions`, async ({ page }) => {
    await activate(page, PERSONAS[role]);
    const writes: string[] = [];
    page.on("request", r => { if (!["GET", "HEAD", "OPTIONS"].includes(r.method()) && r.url().includes(`/api/workspaces/${fixture.id}/`)) writes.push(`${r.method()} ${r.url()}`); });
    await page.goto(`/w/${fixture.slug}/evidence`);
    const trigger = page.getByRole("button", { name: ARTIFACT, exact: true });
    await trigger.focus();
    await page.keyboard.press("Enter");
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    const close = dialog.getByRole("button", { name: "Close", exact: true });
    await expect(close).toBeFocused();
    await page.keyboard.press("Control+k");
    await expect(page.getByRole("dialog", { name: "Command palette" })).toHaveCount(0);
    await expect(close).toBeFocused();
    const tag = dialog.getByRole("link", { name: "PR.AA-01", exact: true }).first();
    await expect(tag).toHaveAttribute("href", `/w/${fixture.id}/observatory/nist-csf-2.0?select=${encodeURIComponent(A)}`);
    await tag.focus();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(new RegExp(`/w/${fixture.id}/observatory/nist-csf-2.0\\?select=`));
    await expect(page.getByRole("complementary", { name: "PR.AA-01 details" })).toBeVisible();
    await expect(page.getByRole("dialog")).toHaveCount(0);

    const searchTrigger = page.getByRole("button", { name: role === "viewer" || role === "auditor" ? "Search requirements" : "Search or ask the copilot", exact: true });
    await searchTrigger.focus();
    await page.keyboard.press("Enter");
    const search = page.getByRole("combobox", { name: "Search requirements and commands" });
    await expect(search).toBeFocused();
    await expect(page.getByRole("dialog", { name: "Command palette" })).toHaveAttribute("aria-modal", "true");
    await page.keyboard.press("Tab");
    await expect(search).toBeFocused();
    await page.keyboard.press("Shift+Tab");
    await expect(search).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(searchTrigger).toBeFocused();
    await expect(page.getByRole("complementary", { name: "PR.AA-01 details" })).toBeVisible();
    expect(new URL(page.url()).searchParams.get("select")).toBe(A);

    await page.keyboard.press("Control+k");
    await expect(search).toBeFocused();
    await search.fill("AC-2");
    const result = page.getByRole("option").filter({ has: page.getByText("AC-2", { exact: true }) });
    await expect(result).toBeVisible();
    const allowed = role === "contributor" || role === "approver";
    await expect(page.getByRole("option").filter({ hasText: "Ask the copilot:" })).toHaveCount(allowed ? 1 : 0);
    if (allowed) await page.keyboard.press("ArrowDown");
    await expect(result).toHaveAttribute("aria-selected", "true");
    const descendant = await search.getAttribute("aria-activedescendant");
    expect(descendant).toBe(await result.getAttribute("id"));
    await page.keyboard.press("Enter");
    await expect(page.getByRole("complementary", { name: "AC-2 details" })).toBeVisible();
    expect(new URL(page.url()).pathname).toBe(`/w/${fixture.id}/observatory/nist-sp-800-53-r5`);
    expect(new URL(page.url()).searchParams.get("select")).toBe(CONTROL);
    expect(writes).toEqual([]);
  });
}

test("palette active descendant stays valid as the result list shrinks", async ({ page }) => {
  await activate(page, OWNER);
  await page.goto(`/w/${fixture.slug}/plan`);
  await page.getByRole("button", { name: "Search or ask the copilot", exact: true }).click();
  const search = page.getByRole("combobox", { name: "Search requirements and commands" });
  for (let i = 0; i < 12; i++) await page.keyboard.press("ArrowDown");
  await search.fill("AC-2");
  const result = page.getByRole("option").filter({ has: page.getByText("AC-2", { exact: true }) });
  await expect(result).toBeVisible();
  const active = await search.getAttribute("aria-activedescendant");
  expect(active).not.toBeNull();
  await expect(page.locator(`[id="${active}"]`)).toHaveAttribute("aria-selected", "true");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: "Search or ask the copilot", exact: true })).toBeFocused();
});

test("organization keeps a selected Members tab when permissions remove the current tab", async ({ page }) => {
  await activate(page, OWNER);
  await page.clock.install();
  let roleReduced = false;
  await page.route(`**/api/tenants/${fixture.tenantId}`, async route => {
    const response = await route.fetch();
    const data = await response.json() as Record<string, unknown>;
    await route.fulfill({ response, json: roleReduced ? { ...data, role: "viewer" } : data });
  });
  await page.goto(`/w/${fixture.slug}/organization`);
  const tabs = page.getByRole("tablist", { name: "Organization settings" });
  const tokens = tabs.getByRole("tab", { name: "API tokens", exact: true });
  await tokens.click();
  await expect(tokens).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("tabpanel", { name: "API tokens", exact: true })).toBeVisible();
  roleReduced = true;
  await page.clock.fastForward(16_000);
  const refetched = page.waitForResponse(response => new URL(response.url()).pathname === `/api/tenants/${fixture.tenantId}`);
  await page.evaluate(() => {
    window.dispatchEvent(new Event("offline"));
    window.dispatchEvent(new Event("online"));
  });
  await refetched;
  await expect(tokens).toHaveCount(0);
  const members = tabs.getByRole("tab", { name: "Members", exact: true });
  await expect(members).toHaveAttribute("aria-selected", "true");
  await expect(members).toHaveAttribute("tabindex", "0");
  await expect(tabs.getByRole("tab")).toHaveCount(1);
  await expect(page.getByRole("tabpanel", { name: "Members", exact: true })).toBeVisible();
  await members.focus();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("tabpanel", { name: "Members", exact: true })).toBeFocused();
});
