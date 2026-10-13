import { randomUUID } from "node:crypto";
import { expect, test as base, type APIRequestContext, type Page } from "@playwright/test";
import { evidenceReviewScope } from "../packages/core/src/evidence.ts";
import type { Me } from "../apps/web/src/lib/auth.ts";
import type { Evidence, WorkspaceSummary } from "../apps/web/src/lib/types.ts";

const CSF = "nist-csf-2.0:PR.AA-01";
const SOC = "aicpa-tsc-2017:CC6.1";
const OWNER = "morgan.lee@northwind-health.example";
const READER = "jordan.park@northwind-health.example";
const DAY = 86_400_000;
type Workspace = { id: string; slug: string; csrf: string; now: number };
async function write<T>(request: APIRequestContext, method: "post" | "patch", path: string, csrf: string, data: unknown): Promise<T> {
  const response = await request[method](`/api${path}`, { headers: { "x-visua-csrf": csrf }, data });
  expect(response.ok(), await response.text()).toBe(true);
  return await response.json() as T;
}
async function login(request: APIRequestContext, email: string) {
  const before = await (await request.get("/api/auth/me")).json() as Me | null;
  return write<Me>(request, "post", "/auth/dev/login", before?.csrf ?? "", { email });
}
const test = base.extend<{ renewal: Workspace }>({
  renewal: async ({ page }, use) => {
    const me = await login(page.request, OWNER);
    const tenant = await write<{ id: string }>(page.request, "post", "/tenants", me.csrf!, { name: `Renewals ${randomUUID()}` });
    await write(page.request, "post", `/tenants/${tenant.id}/members`, me.csrf!, { role: "viewer", email: READER });
    const summary = await write<WorkspaceSummary>(page.request, "post", "/workspaces", me.csrf!, { name: `Renewals ${randomUUID()}`, frameworks: ["nist-csf-2.0", "aicpa-tsc-2017"], profile: { industry: "saas", size: "11-50" } });
    await use({ id: summary.workspace.id, slug: summary.workspace.slug, csrf: me.csrf!, now: Date.now() });
    const cleanup = await login(page.request, OWNER);
    const deleted = await page.request.delete(`/api/workspaces/${summary.workspace.id}`, { headers: { "x-visua-csrf": cleanup.csrf! } });
    expect(deleted.ok(), await deleted.text()).toBe(true);
    if (me.activeTenant) await write(page.request, "post", "/auth/tenant", cleanup.csrf!, { tenantId: me.activeTenant.id });
  },
});
async function evidence(page: Page, ws: Workspace, title: string, days: number | undefined, requirements = [CSF], decision?: "accepted" | "rejected") {
  const item = await write<Evidence>(page.request, "post", `/workspaces/${ws.id}/evidence`, ws.csrf, {
    title, requirementIds: requirements, content: `Observed configuration: ${title}`,
    collectedAt: new Date(ws.now - 60 * DAY).toISOString(),
    ...(days === undefined ? {} : { validUntil: new Date(ws.now + days * DAY).toISOString() }),
  });
  return decision ? write<Evidence>(page.request, "patch", `/workspaces/${ws.id}/evidence/${item.id}`, ws.csrf, { decision, expectedScope: evidenceReviewScope(item) }) : item;
}
const region = (page: Page) => page.getByRole("region", { name: "Evidence renewal", exact: true });
const itemRow = (page: Page, item: Evidence) => region(page).locator(`[data-evidence-id="${item.id}"]`);
const open = (page: Page, ws: Workspace, window = "expired") => page.goto(`/w/${ws.slug}/evidence?view=renewal&window=${window}`);

test("renewal windows keep review separate from dates and explain cumulative counts", async ({ page, renewal }) => {
  const expired = await evidence(page, renewal, "Pending expired observation", -2);
  const soon = await evidence(page, renewal, "Pending next week", 3);
  const rejected = await evidence(page, renewal, "Rejected later observation", 15, [SOC], "rejected");
  await evidence(page, renewal, "Beyond the renewal horizon", 45);
  const noExpiry = await evidence(page, renewal, "Observation without expiry", undefined);
  await page.goto(`/w/${renewal.slug}/evidence`);
  const ledgerRow = page.getByRole("row").filter({ hasText: expired.title });
  await expect(ledgerRow).toContainText("Review: Pending review");
  await expect(ledgerRow).toContainText("Validity: Expired");
  await page.getByRole("tab", { name: "Renewal", exact: true }).click();
  await expect(region(page).getByRole("tab", { name: /^Expired\s*1$/ })).toHaveAttribute("aria-selected", "true");
  await expect(itemRow(page, expired)).toContainText("Pending review");
  await expect(itemRow(page, expired)).toContainText("requirement currently lacks valid accepted evidence");
  await expect(itemRow(page, expired)).toContainText("This item contributes no valid evidence coverage now");
  await region(page).getByRole("tab", { name: /^Next 7 days\s*1$/ }).click();
  await expect(itemRow(page, soon)).toBeVisible();
  await expect(itemRow(page, expired)).toHaveCount(0);
  await region(page).getByRole("tab", { name: /^Next 30 days\s*2$/ }).click();
  await expect(itemRow(page, soon)).toBeVisible();
  await expect(itemRow(page, rejected)).toContainText("Rejected");
  await expect(region(page)).toContainText("Next 30 days includes Next 7 days");
  await region(page).getByText("1 item has no expiry", { exact: true }).click();
  await region(page).getByRole("button", { name: `Inspect ${noExpiry.title}`, exact: true }).click();
  await expect(page.getByRole("dialog", { name: noExpiry.title, exact: true })).toBeVisible();
});

test("accepted alternatives move the forecast to the last uninterrupted deadline without hiding partial impact", async ({ page, renewal }) => {
  const primary = await evidence(page, renewal, "Early shared observation", 3, [CSF, SOC], "accepted");
  const alternative = await evidence(page, renewal, "Later CSF observation", 15, [CSF], "accepted");
  await open(page, renewal, "7d");
  await expect(region(page).getByRole("status")).toContainText("1 distinct requirement would lose uninterrupted coverage");
  await expect(itemRow(page, primary)).toContainText("1 linked requirement would lose uninterrupted coverage after this expiry");
  await expect(itemRow(page, primary)).toContainText("1 linked requirement has accepted alternatives that continue coverage beyond this expiry");
  await expect(itemRow(page, primary).getByRole("link", { name: "CC6.1", exact: true })).toBeVisible();
  await expect(itemRow(page, primary)).toContainText(alternative.validUntil!.replace("T", " ").replace("Z", " UTC"));
  await region(page).getByRole("tab", { name: /^Next 30 days\s*2$/ }).click();
  await expect(region(page).getByRole("status")).toContainText("2 distinct requirements would lose uninterrupted coverage");
  await expect(itemRow(page, alternative)).toContainText("1 linked requirement would lose uninterrupted coverage after this expiry");
  await expect(itemRow(page, alternative).getByRole("link", { name: "PR.AA-01", exact: true })).toBeVisible();
});

test("loading and failures never masquerade as an empty renewal window and retry recovers", async ({ page, renewal }) => {
  let failing = true;
  let release!: () => void;
  const pending = new Promise<void>(resolve => { release = resolve; });
  await page.route("**/api/workspaces/*/evidence/renewal", async route => {
    await pending;
    if (failing) await route.fulfill({ status: 503, contentType: "application/json", body: '{"error":"Renewal snapshot unavailable"}' });
    else await route.continue();
  });
  await open(page, renewal, "7d");
  await expect(region(page).getByRole("status")).toHaveText("Loading evidence renewals…");
  await expect(region(page).getByText("No evidence expires in the next 7 days.", { exact: true })).toHaveCount(0);
  release();
  await expect(region(page).getByRole("alert")).toContainText("Could not load evidence renewals");
  await expect(region(page).getByText("No evidence expires in the next 7 days.", { exact: true })).toHaveCount(0);
  failing = false;
  await region(page).getByRole("button", { name: "Retry renewals", exact: true }).click();
  await expect(region(page).getByText("No evidence expires in the next 7 days.", { exact: true })).toBeVisible();
});

test("overview expiry deep links retain the exact artifact and renewal selection through close and history", async ({ page, renewal }) => {
  const expired = await evidence(page, renewal, "Expired approved observation", -2, [CSF], "accepted");
  await page.goto(`/w/${renewal.slug}`);
  const attention = page.getByRole("region", { name: "Needs attention", exact: true });
  await expect(attention.getByRole("link", { name: "Review evidence renewals", exact: true })).toHaveAttribute("href", /view=renewal/);
  await attention.getByRole("button", { name: /^Evidence/ }).click();
  await attention.getByRole("link", { name: `Inspect evidence: ${expired.title}`, exact: true }).click();
  await expect(page).toHaveURL(/view=renewal&window=expired/);
  const dialog = page.getByRole("dialog", { name: expired.title, exact: true });
  await expect(dialog).toContainText(`Observed configuration: ${expired.title}`);
  await page.reload();
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Close", exact: true }).click();
  await expect(page).not.toHaveURL(/evidence=/);
  await expect(page).toHaveURL(/view=renewal&window=expired/);
  await region(page).getByRole("tab", { name: /^Next 7 days\s*0$/ }).click();
  await region(page).getByRole("tab", { name: /^Next 30 days\s*0$/ }).click();
  await page.goBack();
  await expect(region(page).getByRole("tab", { name: /^Next 7 days\s*0$/ })).toHaveAttribute("aria-selected", "true");
  await page.goForward();
  await expect(region(page).getByRole("tab", { name: /^Next 30 days\s*0$/ })).toHaveAttribute("aria-selected", "true");
});

test("mobile keyboard navigation retains impact links and restores the inspection trigger", async ({ page, renewal }) => {
  const expired = await evidence(page, renewal, "A long expired observation title that remains readable on a narrow screen", -1, [CSF, SOC]);
  await page.setViewportSize({ width: 390, height: 844 });
  await open(page, renewal);
  const expiredTab = region(page).getByRole("tab", { name: /^Expired\s*1$/ });
  await expiredTab.focus();
  await expiredTab.press("ArrowLeft");
  const last = region(page).getByRole("tab", { name: /^Next 30 days\s*0$/ });
  await expect(last).toBeFocused();
  await expect(last).toHaveAttribute("aria-selected", "true");
  await last.press("Home");
  await expect(expiredTab).toBeFocused();
  await expect(expiredTab).toHaveAttribute("aria-selected", "true");
  expect(await region(page).getByRole("tab").evaluateAll(tabs => tabs.filter(tab => tab.getAttribute("tabindex") === "0").length)).toBe(1);
  await expiredTab.press("Tab");
  await expect(region(page).getByRole("tabpanel", { name: /^Expired\s*1$/ })).toBeFocused();
  const inspect = itemRow(page, expired).getByRole("button", { name: `Inspect evidence: ${expired.title}`, exact: true });
  await inspect.focus();
  await inspect.press("Enter");
  const dialog = page.getByRole("dialog", { name: expired.title, exact: true });
  await expect(dialog.getByRole("button", { name: "Close", exact: true })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(inspect).toBeFocused();
  await expect(itemRow(page, expired).getByRole("link", { name: "CC6.1", exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  await itemRow(page, expired).getByRole("link", { name: "CC6.1", exact: true }).press("Enter");
  await expect(page).toHaveURL(/observatory\/aicpa-tsc-2017\?select=aicpa-tsc-2017%3ACC6.1/);
});

test("new accepted alternatives refresh coverage through workspace events", async ({ page, renewal }) => {
  const primary = await evidence(page, renewal, "Renewal with a live alternative", 3, [CSF], "accepted");
  await open(page, renewal, "7d");
  await expect(region(page).getByRole("status")).toContainText("1 distinct requirement would lose uninterrupted coverage");
  await evidence(page, renewal, "New accepted observation without expiry", undefined, [CSF], "accepted");
  await expect(region(page).getByRole("status")).toContainText("0 distinct requirements would lose uninterrupted coverage");
  await expect(itemRow(page, primary)).toContainText("accepted alternatives that continue coverage beyond this expiry");
  await expect(itemRow(page, primary)).toContainText("No known coverage deadline in the evidence on file");
});

test("a viewer can inspect pending expired evidence and follow requirement links without writes", async ({ page, renewal }) => {
  const expired = await evidence(page, renewal, "Read-only pending expired observation", -1);
  await login(page.request, READER);
  const writes: string[] = [];
  page.on("request", request => { if (!["GET", "HEAD", "OPTIONS"].includes(request.method()) && /\/api\/workspaces\//.test(request.url())) writes.push(request.url()); });
  await open(page, renewal);
  await expect(page.getByRole("button", { name: "Upload evidence", exact: true })).toBeDisabled();
  await itemRow(page, expired).getByRole("button", { name: `Inspect evidence: ${expired.title}`, exact: true }).click();
  const dialog = page.getByRole("dialog", { name: expired.title, exact: true });
  await expect(dialog).toContainText(`Observed configuration: ${expired.title}`);
  await expect(dialog.getByRole("button", { name: /^(Accept|Reject)$/ })).toHaveCount(0);
  await dialog.getByRole("link", { name: "PR.AA-01", exact: true }).click();
  await expect(page).toHaveURL(/observatory\/nist-csf-2.0\?select=nist-csf-2.0%3APR.AA-01/);
  expect(writes).toEqual([]);
});
