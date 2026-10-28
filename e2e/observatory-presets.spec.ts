import { randomUUID } from "node:crypto";
import { mkdir } from "node:fs/promises";
import { expect, test as base, type APIRequestContext, type Page } from "@playwright/test";
import { evidenceReviewScope } from "../packages/core/src/evidence.ts";
import type { Me } from "../apps/web/src/lib/auth.ts";
import type { Evidence, WorkspaceSummary } from "../apps/web/src/lib/types.ts";

const FW = "nist-csf-2.0";
const A = `${FW}:PR.AA-01`, B = `${FW}:PR.AA-02`, C = `${FW}:PR.AA-03`, GROUP = `${FW}:PR.AA`;
const OWNER = "morgan.lee@northwind-health.example";
type Fixture = { id: string; slug: string; csrf: string; userId: string };
async function write<T>(request: APIRequestContext, method: "post" | "patch", path: string, csrf: string, data: unknown): Promise<T> {
  const response = await request[method](`/api${path}`, { headers: { "x-visua-csrf": csrf }, data });
  expect(response.ok(), await response.text()).toBe(true);
  return await response.json() as T;
}
async function login(request: APIRequestContext) {
  const before = await (await request.get("/api/auth/me")).json() as Me | null;
  return write<Me>(request, "post", "/auth/dev/login", before?.csrf ?? "", { email: OWNER });
}
const test = base.extend<{ observatory: Fixture }>({
  observatory: async ({ page }, use) => {
    const me = await login(page.request);
    const summary = await write<WorkspaceSummary>(page.request, "post", "/workspaces", me.csrf!, {
      name: `Observatory ${randomUUID()}`, frameworks: [FW, "nist-ai-rmf"], profile: { industry: "saas", size: "11-50" },
    });
    const ws = { id: summary.workspace.id, slug: summary.workspace.slug, csrf: me.csrf!, userId: me.user.id };
    await write(page.request, "patch", `/workspaces/${ws.id}/requirements/${encodeURIComponent(A)}`, ws.csrf, { current: 2, target: 2, ownerUserId: ws.userId, statusOverride: "at-risk" });
    await write(page.request, "patch", `/workspaces/${ws.id}/requirements/${encodeURIComponent(B)}`, ws.csrf, { current: 2, target: 2, owner: me.user.name, statusOverride: "at-risk" });
    await use(ws);
    const cleanup = await login(page.request);
    const removed = await page.request.delete(`/api/workspaces/${ws.id}`, { headers: { "x-visua-csrf": cleanup.csrf! } });
    expect(removed.ok(), await removed.text()).toBe(true);
  },
});
const preset = (page: Page) => page.getByRole("combobox", { name: "Outline preset", exact: true });
const tree = (page: Page) => page.getByRole("tree", { name: "Framework outline" });
const row = (page: Page, id: string) => tree(page).locator(`[role="treeitem"][data-node-id="${id}"]`);
const routeFor = (ws: Fixture, query = "") => `/w/${ws.slug}/observatory/${FW}${query ? `?${query}` : ""}`;
async function capture(page: Page, name: string) {
  await mkdir(".screens/observatory-20261013", { recursive: true });
  await page.screenshot({ path: `.screens/observatory-20261013/${name}.png`, animations: "disabled" });
}
async function evidence(page: Page, ws: Fixture, ids: string[]) {
  const item = await write<Evidence>(page.request, "post", `/workspaces/${ws.id}/evidence`, ws.csrf, {
    title: "Current observed configuration", requirementIds: ids, content: "Illustrative observation for browser verification.",
    collectedAt: new Date(Date.now() - 86_400_000).toISOString(),
  });
  return write<Evidence>(page.request, "patch", `/workspaces/${ws.id}/evidence/${item.id}`, ws.csrf, { decision: "accepted", expectedScope: evidenceReviewScope(item), expectedReviewId: item.reviewHistory?.at(-1)?.id ?? null });
}

test("presets use current scope and stable member identity, with URL roundtrip", async ({ page, observatory: ws }) => {
  await page.goto(routeFor(ws, "preset=at-risk"));
  await expect(row(page, A)).toBeVisible();
  await expect(row(page, B)).toBeVisible();
  await expect(row(page, C)).toHaveCount(0);
  await expect(page.locator(".hud-legend").getByText("At risk", { exact: true })).toBeVisible();
  await expect(page.locator(".hud-legend").getByText("Verified", { exact: true })).toBeVisible();
  await capture(page, "at-risk-1440");
  await preset(page).selectOption("assigned-to-me");
  await expect(row(page, A)).toBeVisible();
  await expect(row(page, B)).toHaveCount(0);
  await expect(page).toHaveURL(/preset=assigned-to-me/);
  await page.reload();
  await expect(preset(page)).toHaveValue("assigned-to-me");
  await expect(row(page, A)).toBeVisible();
  await write(page.request, "patch", `/workspaces/${ws.id}/requirements/${encodeURIComponent(A)}`, ws.csrf, { applicable: false, applicabilityRationale: "Excluded in this fixture." });
  await expect(row(page, A)).toHaveCount(0);
  await preset(page).selectOption("at-risk");
  await expect(row(page, B)).toBeVisible();
  await expect(row(page, A)).toHaveCount(0);
});

test("missing evidence uses accepted direct proof and refreshes after evidence review", async ({ page, observatory: ws }) => {
  await evidence(page, ws, [GROUP]);
  await page.goto(routeFor(ws, "preset=missing-evidence&q=PR.AA"));
  await expect(row(page, A)).toBeVisible();
  await expect(row(page, B)).toBeVisible();
  await expect(row(page, C)).toBeVisible();
  await evidence(page, ws, [A]);
  await expect(row(page, A)).toHaveCount(0);
  await expect(row(page, B)).toBeVisible();
  await expect(row(page, C)).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Filter outline" })).toHaveValue("PR.AA");
});

test("inspector peer and parent navigation retains keyboard focus across detail loads", async ({ page, observatory: ws }) => {
  await page.goto(routeFor(ws, `preset=at-risk&select=${encodeURIComponent(A)}`));
  await expect(page.getByRole("complementary", { name: "PR.AA-01 details" })).toBeVisible();
  const context = page.getByRole("navigation", { name: "Selection context" });
  await context.getByRole("button", { name: "Next sibling", exact: true }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("complementary", { name: "PR.AA-02 details" })).toBeVisible();
  await expect(context.getByRole("button", { name: "Next sibling", exact: true })).toBeFocused({ timeout: 3000 });
  await page.keyboard.press("Enter");
  await expect(page.getByRole("complementary", { name: "PR.AA-03 details" })).toBeVisible();
  await expect(context).toContainText("Outside filter");
  await expect(context.getByRole("button", { name: "Next sibling", exact: true })).toBeFocused();
  await context.getByRole("button", { name: "Previous sibling", exact: true }).press("Enter");
  await expect(page.getByRole("complementary", { name: "PR.AA-02 details" })).toBeVisible();
  await expect(context.getByRole("button", { name: "Previous sibling", exact: true })).toBeFocused();
  // Clicking plain header text leaves navigation deliberately. A live assessment
  // refresh must not revive the old request to focus a sibling control.
  await page.getByRole("complementary", { name: "PR.AA-02 details" }).locator(".inspector__head > .row > .mono").click();
  await expect(page.locator("body")).toBeFocused();
  await write(page.request, "patch", `/workspaces/${ws.id}/requirements/${encodeURIComponent(A)}`, ws.csrf, { applicable: false, applicabilityRationale: "Refresh while reading another requirement." });
  await expect(page.locator(".outline__summary")).toContainText("1 in-scope requirement matches");
  await expect(page.locator("body")).toBeFocused();
  await context.getByRole("button", { name: "PR.AA", exact: true }).press("Enter");
  await expect(page.getByRole("complementary", { name: "PR.AA details" })).toBeVisible();
  await expect(context.getByRole("button", { name: "PR.AA", exact: true })).toBeFocused();
  await expect(preset(page)).toHaveValue("at-risk");
});

test.describe("phone outline", () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
test("phone selection stays accessible outside search results with a labeled legend", async ({ page, observatory: ws }) => {
  await page.goto(routeFor(ws, `preset=at-risk&select=${encodeURIComponent(A)}`));
  await expect(page.getByRole("complementary", { name: "PR.AA-01 details" })).toBeVisible();
  await expect(page.locator(".outline__legend").getByText("At risk", { exact: true })).toBeVisible();
  await page.getByRole("textbox", { name: "Filter outline" }).fill("PR.AA-02");
  await expect(row(page, A)).toBeVisible();
  await expect(row(page, A)).toHaveAttribute("aria-selected", "true");
  await expect(row(page, B)).toBeVisible();
  await expect(page).toHaveURL(/q=PR.AA-02/);
  await expect(page.getByRole("textbox", { name: "Filter outline" })).toBeFocused();
  await row(page, A).focus();
  await row(page, A).press("ArrowDown");
  await expect(row(page, B)).toBeFocused();
  await expect(page.getByRole("complementary", { name: "PR.AA-02 details" })).toBeVisible();
  const bounds = await row(page, B).locator(":scope > .outline__row").boundingBox();
  const sheet = await page.locator("aside.inspector").boundingBox();
  expect(bounds).not.toBeNull();
  expect(sheet).not.toBeNull();
  expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(sheet!.y + 1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
  await capture(page, "selection-390");
  await page.getByRole("button", { name: "Close inspector", exact: true }).click();
  await expect(page).not.toHaveURL(/select=/);
  await expect(preset(page)).toHaveValue("at-risk");
});
});

test("failed preset state can retry and threat catalogs never show assessment presets", async ({ page, observatory: ws }) => {
  let failing = true;
  await page.route(`**/api/workspaces/${ws.id}/frameworks/${FW}/state`, async route => {
    if (failing) await route.fulfill({ status: 503, json: { error: "Preset snapshot unavailable" } });
    else await route.continue();
  });
  await page.goto(routeFor(ws, "preset=at-risk"));
  await expect(page.getByRole("alert").filter({ hasText: /Preset snapshot unavailable/ })).toBeVisible();
  await expect(row(page, A)).toHaveCount(0);
  failing = false;
  await page.getByRole("button", { name: /Retry/ }).click();
  await expect(row(page, A)).toBeVisible();
  await page.goto(`/w/${ws.slug}/observatory/mitre-atlas?preset=at-risk`);
  await expect(tree(page)).toBeVisible();
  await expect(preset(page)).toHaveCount(0);
  await expect(page.getByText(/Threat catalogs.*not assessed|Threat catalogs.*coverage/i).first()).toBeVisible();
});

test("switching frameworks keeps the preset but never borrows the previous assessment", async ({ page, observatory: ws }) => {
  await page.goto(routeFor(ws, "preset=at-risk"));
  await expect(row(page, A)).toBeVisible();
  let release!: () => void;
  const pending = new Promise<void>(resolve => { release = resolve; });
  await page.route(`**/api/workspaces/${ws.id}/frameworks/nist-ai-rmf/state`, async route => {
    await pending;
    await route.continue();
  });
  try {
    await page.getByRole("combobox", { name: "Framework", exact: true }).selectOption("nist-ai-rmf");
    await expect(preset(page)).toHaveValue("at-risk");
    await expect(page.locator(".outline__summary")).toHaveText("Loading assessment…");
    await expect(row(page, A)).toHaveCount(0);
  } finally { release(); }
  await expect(page.locator(".outline__summary")).toContainText("0 in-scope requirements match");
  await expect(page).toHaveURL(/nist-ai-rmf\?preset=at-risk/);
});
