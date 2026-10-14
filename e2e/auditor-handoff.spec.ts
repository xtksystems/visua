import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { expect, test as base, type APIRequestContext } from "@playwright/test";
import type { WorkspaceSummary } from "../apps/web/src/lib/types.ts";
import { OWNER, signIn } from "./visual-review.fixture.ts";

const AUDITOR = "alex.kim@audit-partners.example", CSF = "nist-csf-2.0", AI = "nist-ai-rmf";
interface Handoff { id: string; slug: string; otherSlug: string; csfName: string; aiName: string }
async function post<T>(request: APIRequestContext, path: string, csrf: string, data: unknown): Promise<T> {
  const response = await request.post(`/api${path}`, { headers: { "x-visua-csrf": csrf }, data });
  expect(response.ok(), await response.text()).toBe(true);
  return await response.json() as T;
}
const test = base.extend<{ handoff: Handoff }>({
  handoff: async ({ page }, use) => {
    const owner = await signIn(page.request, OWNER);
    const tenant = await post<{ id: string }>(page.request, "/tenants", owner.csrf!, { name: `Auditor handoff ${randomUUID()}` });
    await post(page.request, `/tenants/${tenant.id}/members`, owner.csrf!, { email: AUDITOR, role: "auditor" });
    const create = () => post<WorkspaceSummary>(page.request, "/workspaces", owner.csrf!, { name: `Handoff ${randomUUID()}`, frameworks: [CSF, AI], profile: { industry: "saas", size: "11-50" } });
    const first = await create(), second = await create();
    await post(page.request, `/workspaces/${first.workspace.id}/evidence`, owner.csrf!, { title: "Recorded access configuration", content: "Private artifact bytes for the ZIP only", requirementIds: [`${CSF}:PR.AA-01`], collectedAt: "2025-01-01" });
    await signIn(page.request, AUDITOR);
    await use({ id: first.workspace.id, slug: first.workspace.slug, otherSlug: second.workspace.slug, csfName: first.frameworks.find(f => f.id === CSF)!.shortName, aiName: first.frameworks.find(f => f.id === AI)!.shortName });
    const cleanup = await signIn(page.request, OWNER);
    for (const ws of [first.workspace, second.workspace]) expect((await page.request.delete(`/api/workspaces/${ws.id}`, { headers: { "x-visua-csrf": cleanup.csrf! } })).ok()).toBe(true);
    if (owner.activeTenant) await post(page.request, "/auth/tenant", cleanup.csrf!, { tenantId: owner.activeTenant.id });
  },
});

test("auditor explicitly selects scope and dates, reads metadata and downloads a real ZIP with a separate receipt", async ({ page, handoff }) => {
  await page.goto(`/w/${handoff.slug}/reports`);
  const panel = page.getByRole("region", { name: "Auditor handoff", exact: true });
  await expect(panel.getByRole("region", { name: "Read-only auditor view" })).toHaveCount(0);
  await panel.getByRole("checkbox", { name: handoff.aiName, exact: true }).uncheck();
  await panel.getByLabel("Period start (UTC, optional)").fill("2025-01-01");
  await panel.getByLabel("Evaluation end (UTC, optional)").fill("2025-12-31");
  const prepared = page.waitForResponse(response => response.url().includes(`/workspaces/${handoff.id}/auditor?`));
  await panel.getByRole("button", { name: "Open auditor view", exact: true }).click();
  const response = await prepared;
  expect(response.status()).toBe(200);
  expect(await response.json()).toMatchObject({ frameworkIds: [CSF], asOf: "2025-12-31T23:59:59.999Z", periodStart: "2025-01-01T00:00:00.000Z" });
  const view = panel.getByRole("region", { name: "Read-only auditor view", exact: true });
  await expect(view).toContainText("Recorded access configuration");
  await expect(view).toContainText("no historical revision replay");
  await expect(view).not.toContainText("Private artifact bytes for the ZIP only");
  await expect(view.locator("button,input,textarea,select,[contenteditable=true]")).toHaveCount(0);
  await expect(view.getByRole("columnheader", { name: "Current", exact: true })).toBeVisible();
  await expect(view.getByRole("columnheader", { name: "Recorded review", exact: true })).toBeAttached();
  const downloaded = page.waitForEvent("download");
  await panel.getByRole("button", { name: "Download auditor package", exact: true }).click();
  const file = await downloaded, bytes = await readFile((await file.path())!);
  expect(file.suggestedFilename()).toMatch(/^visua-auditor-[a-f0-9]{16}\.zip$/);
  expect(bytes.subarray(0, 4)).toEqual(Buffer.from([0x50, 0x4b, 0x03, 0x04])); expect(bytes.length).toBeGreaterThan(100);
  const receipt = panel.getByRole("region", { name: "Download receipt", exact: true });
  await expect(receipt).toContainText(/Manifest SHA-256: [a-f0-9]{64}/);
  await expect(receipt).toContainText(new RegExp(`Audit checkpoint: ${handoff.id}:\\d+:[a-f0-9]{64}`));
  await expect(receipt).toContainText("independently retained manifest hash");
  const saved = page.waitForEvent("download");
  await receipt.getByRole("button", { name: "Save receipt", exact: true }).click();
  const pin = await saved;
  expect(await readFile((await pin.path())!, "utf8")).toContain(`Workspace: ${handoff.id}`);
  await panel.getByRole("button", { name: "Load recent access records", exact: true }).click();
  const records = panel.getByRole("region", { name: "Prepared access records", exact: true });
  await expect(records).toContainText("auditor view"); await expect(records).toContainText("auditor-bundle.zip");
});

test("failed preview preserves selection for retry and switching workspace clears the capture", async ({ page, handoff }) => {
  let fail = true;
  await page.route(`**/api/workspaces/${handoff.id}/auditor?**`, route => fail ? route.fulfill({ status: 503, json: { error: "Preview temporarily unavailable" } }) : route.continue());
  await page.goto(`/w/${handoff.slug}/reports`);
  const panel = page.getByRole("region", { name: "Auditor handoff", exact: true });
  await panel.getByRole("checkbox", { name: handoff.aiName, exact: true }).uncheck();
  await panel.getByLabel("Evaluation end (UTC, optional)").fill("2025-12-31");
  await panel.getByRole("button", { name: "Open auditor view", exact: true }).click();
  await expect(panel.getByRole("alert")).toHaveText("Preview temporarily unavailable");
  await expect(panel.getByRole("checkbox", { name: handoff.aiName, exact: true })).not.toBeChecked();
  await expect(panel.getByLabel("Evaluation end (UTC, optional)")).toHaveValue("2025-12-31");
  fail = false;
  await panel.getByRole("button", { name: "Open auditor view", exact: true }).click();
  await expect(panel.getByRole("region", { name: "Read-only auditor view", exact: true })).toBeVisible();
  await page.goto(`/w/${handoff.otherSlug}/reports`);
  await expect(panel.getByRole("region", { name: "Read-only auditor view", exact: true })).toHaveCount(0);
  await expect(panel.getByLabel("Evaluation end (UTC, optional)")).toHaveValue("");
  await expect(panel.getByRole("checkbox", { name: handoff.aiName, exact: true })).toBeChecked();
});

test("live framework removal clears old receipts and in-flight captures, preserving valid selections", async ({ page, request, handoff }) => {
  await page.goto(`/w/${handoff.slug}/reports`);
  const panel = page.getByRole("region", { name: "Auditor handoff", exact: true });
  await panel.getByRole("button", { name: "Open auditor view", exact: true }).click();
  const view = panel.getByRole("region", { name: "Read-only auditor view", exact: true });
  await expect(view).toBeVisible();
  await expect(view).toContainText("implementation progress");
  const initialDownload = page.waitForEvent("download");
  await panel.getByRole("button", { name: "Download auditor package", exact: true }).click();
  await initialDownload;
  const receipt = panel.getByRole("region", { name: "Download receipt", exact: true });
  await expect(receipt).toBeVisible();

  let prepared!: () => void, release!: () => void, completed!: () => void;
  const captured = new Promise<void>(resolve => { prepared = resolve; });
  const gate = new Promise<void>(resolve => { release = resolve; });
  const delivered = new Promise<void>(resolve => { completed = resolve; });
  await page.route(`**/api/workspaces/${handoff.id}/auditor?**`, async route => {
    const response = await route.fetch(); prepared();
    await gate;
    // A scope refresh is expected to abort this old browser request.
    try { await route.fulfill({ response }); } catch { /* Request was cancelled. */ }
    finally { completed(); }
  }, { times: 1 });
  await panel.getByRole("button", { name: "Open auditor view", exact: true }).click();
  await captured;
  try {
    const owner = await signIn(request, OWNER);
    const changed = await request.put(`/api/workspaces/${handoff.id}/frameworks/${AI}`, { headers: { "x-visua-csrf": owner.csrf! }, data: { enabled: false } });
    expect(changed.ok(), await changed.text()).toBe(true);
    // The actual workspace event refetches this summary without navigation or remount.
    await expect(panel.getByRole("checkbox", { name: handoff.aiName, exact: true })).toHaveCount(0);
    await expect(panel.getByRole("checkbox", { name: handoff.csfName, exact: true })).toBeChecked();
    await expect(view).toHaveCount(0); await expect(receipt).toHaveCount(0);
  } finally { release(); }
  await delivered;
  await expect(view).toHaveCount(0);
  await expect(panel.getByRole("status")).toHaveCount(0);
  const recovered = page.waitForResponse(response => response.url().includes(`/workspaces/${handoff.id}/auditor?`));
  await panel.getByRole("button", { name: "Open auditor view", exact: true }).click();
  const response = await recovered;
  expect(response.status()).toBe(200);
  expect(await response.json()).toMatchObject({ frameworkIds: [CSF] });
  await expect(view).toBeVisible();
  const downloadResponse = page.waitForResponse(response => response.url().includes(`/workspaces/${handoff.id}/exports/auditor-bundle.zip?`));
  const downloaded = page.waitForEvent("download");
  await panel.getByRole("button", { name: "Download auditor package", exact: true }).click();
  const zipResponse = await downloadResponse;
  expect(new URL(zipResponse.url()).searchParams.getAll("framework")).toEqual([CSF]);
  expect((await downloaded).suggestedFilename()).toMatch(/\.zip$/);
  await expect(receipt).toBeVisible();
});

test.describe("phone auditor presentation", () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  test("keeps read-only tables locally scrollable by keyboard without page overflow", async ({ page, handoff }) => {
    await page.goto(`/w/${handoff.slug}/reports`);
    const panel = page.getByRole("region", { name: "Auditor handoff", exact: true });
    await panel.getByRole("checkbox", { name: handoff.aiName, exact: true }).uncheck();
    await panel.getByRole("button", { name: "Open auditor view", exact: true }).click();
    const view = panel.getByRole("region", { name: "Read-only auditor view", exact: true });
    const table = view.getByRole("region", { name: `${handoff.csfName} recorded requirements`, exact: true });
    await expect(table).toBeVisible();
    expect(await table.evaluate(element => element.scrollWidth > element.clientWidth)).toBe(true);
    await panel.getByRole("button", { name: "Download auditor package", exact: true }).focus();
    await page.keyboard.press("Tab"); await expect(table).toBeFocused();
    await page.keyboard.press("ArrowRight");
    await expect.poll(() => table.evaluate(element => element.scrollLeft)).toBeGreaterThan(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    await expect(view.locator("button,input,textarea,select")).toHaveCount(0);
  });
});
