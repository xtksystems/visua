import { randomUUID, createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { expect, test as base, type APIRequestContext } from "@playwright/test";
import type { Evidence, WorkspaceSummary } from "../apps/web/src/lib/types.ts";
import type { Me } from "../apps/web/src/lib/auth.ts";

const A = "nist-csf-2.0:PR.AA-01";
const SOC = "aicpa-tsc-2017:CC6.1";
const OWNER = "morgan.lee@northwind-health.example";
const emails = { viewer: "jordan.park@northwind-health.example", auditor: "alex.kim@audit-partners.example", contributor: "sam.ortiz@northwind-health.example" };
const body = Buffer.from([0, 255, 13, 10, 97, 99, 99, 101, 115, 115]);
type Fixture = { id: string; slug: string; csrf: string };
async function login(request: APIRequestContext, email: string) {
  const before = await (await request.get("/api/auth/me")).json() as Me | null;
  const response = await request.post("/api/auth/dev/login", { headers: before?.csrf ? { "x-visua-csrf": before.csrf } : undefined, data: { email } });
  expect(response.ok(), await response.text()).toBe(true);
  return await response.json() as Me;
}
async function post<T>(request: APIRequestContext, path: string, csrf: string, data: unknown): Promise<T> {
  const response = await request.post(`/api${path}`, { headers: { "x-visua-csrf": csrf }, data });
  expect(response.ok(), await response.text()).toBe(true);
  return await response.json() as T;
}
const test = base.extend<{ files: Fixture }>({
  files: async ({ page }, use) => {
    const me = await login(page.request, OWNER);
    const tenant = await post<{ id: string }>(page.request, "/tenants", me.csrf!, { name: `File evidence ${randomUUID()}` });
    for (const [role, email] of Object.entries(emails)) await post(page.request, `/tenants/${tenant.id}/members`, me.csrf!, { role, email });
    const summary = await post<WorkspaceSummary>(page.request, "/workspaces", me.csrf!, { name: `File evidence ${randomUUID()}`, frameworks: ["nist-csf-2.0", "aicpa-tsc-2017"], profile: { industry: "saas", size: "11-50" } });
    await use({ id: summary.workspace.id, slug: summary.workspace.slug, csrf: me.csrf! });
    const cleanup = await login(page.request, OWNER);
    const response = await page.request.delete(`/api/workspaces/${summary.workspace.id}`, { headers: { "x-visua-csrf": cleanup.csrf! } });
    expect(response.ok(), await response.text()).toBe(true);
    if (me.activeTenant) await post(page.request, "/auth/tenant", cleanup.csrf!, { tenantId: me.activeTenant.id });
  },
});
async function apiUpload(request: APIRequestContext, files: Fixture, title = "Uploaded access export") {
  const response = await request.post(`/api/workspaces/${files.id}/evidence/files`, { headers: { "x-visua-csrf": files.csrf }, multipart: { file: { name: "access.bin", mimeType: "application/octet-stream", buffer: body }, metadata: JSON.stringify({ title, requirementIds: [A], collectedAt: "2026-01-01", validUntil: "2030-12-31" }) } });
  expect(response.status(), await response.text()).toBe(201);
  return await response.json() as Evidence;
}

test("upload links CSF and SOC 2 requirements, downloads exact bytes and binds a review", async ({ page, files }) => {
  await page.goto(`/w/${files.slug}/evidence`);
  await page.getByRole("button", { name: "Upload evidence", exact: true }).click();
  const upload = page.getByRole("dialog", { name: "Upload evidence", exact: true });
  await upload.getByLabel("Evidence file", { exact: true }).setInputFiles({ name: "configuration.bin", mimeType: "application/octet-stream", buffer: body });
  await upload.getByLabel("Evidence title", { exact: true }).fill("Implemented access configuration");
  await upload.getByLabel("Collection date", { exact: true }).fill("2026-01-01");
  await upload.getByLabel("Valid until", { exact: true }).fill("2030-12-31");
  await upload.getByLabel("Search requirements to link", { exact: true }).fill("PR.AA-01");
  await upload.getByRole("button", { name: "Add PR.AA-01 requirement", exact: true }).click();
  await upload.getByLabel("Search requirements to link", { exact: true }).fill("CC6.1");
  await upload.getByRole("button", { name: "Add CC6.1 requirement", exact: true }).click();
  const created = page.waitForResponse(response => response.request().method() === "POST" && response.url().endsWith("/evidence/files"));
  await upload.getByRole("button", { name: "Upload for review", exact: true }).click();
  const response = await created;
  expect(response.status()).toBe(201);
  const item = await response.json() as Evidence;
  expect(item.requirementIds).toEqual([A, SOC]);
  expect(item.sha256).toBe(createHash("sha256").update(body).digest("hex"));
  const dialog = page.getByRole("dialog", { name: item.title, exact: true });
  await expect(dialog.getByRole("button", { name: "Download file", exact: true })).toBeVisible();
  const download = page.waitForEvent("download");
  await dialog.getByRole("button", { name: "Download file", exact: true }).click();
  const artifact = await download;
  expect(artifact.suggestedFilename()).toBe("configuration.bin");
  expect(await readFile((await artifact.path())!)).toEqual(body);
  await dialog.getByRole("button", { name: "Accept", exact: true }).click();
  await expect(dialog.getByRole("region", { name: "Review history" })).toContainText("accepted");
  const reviewed = await (await page.request.get(`/api/workspaces/${files.id}/evidence/${item.id}`)).json() as Evidence;
  expect(reviewed.reviewHistory!.at(-1)!.scope!.sha256).toBe(item.sha256);
});

test("failed uploads retain the draft and can retry without duplicate records", async ({ page, files }) => {
  await page.goto(`/w/${files.slug}/evidence`);
  await page.getByRole("button", { name: "Upload evidence", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Upload evidence", exact: true });
  await dialog.getByLabel("Evidence file", { exact: true }).setInputFiles({ name: "audit.log", mimeType: "text/plain", buffer: Buffer.from("Observed access event") });
  await dialog.getByLabel("Evidence title", { exact: true }).fill("Observed access event");
  await dialog.getByLabel("Search requirements to link", { exact: true }).fill("PR.AA-01");
  await dialog.getByRole("button", { name: "Add PR.AA-01 requirement", exact: true }).click();
  let attempts = 0;
  await page.route("**/evidence/files", async route => {
    attempts++;
    if (attempts === 1) await route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ error: "Storage is temporarily unavailable" }) });
    else await route.continue();
  });
  await dialog.getByRole("button", { name: "Upload for review", exact: true }).click();
  await expect(dialog.getByRole("alert")).toContainText("Storage is temporarily unavailable");
  await expect(dialog.getByLabel("Evidence title", { exact: true })).toHaveValue("Observed access event");
  await expect(dialog.getByLabel("Evidence file", { exact: true })).toHaveValue(/audit\.log$/);
  await dialog.getByRole("button", { name: "Upload for review", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Observed access event", exact: true })).toBeVisible();
  const list = await (await page.request.get(`/api/workspaces/${files.id}/evidence`)).json() as Evidence[];
  expect(list).toHaveLength(1);
  expect(attempts).toBe(2);
});

test("metadata-only ledger loads legacy content on inspection and keeps the inspected snapshot", async ({ page, files }) => {
  const legacy = await post<Evidence>(page.request, `/workspaces/${files.id}/evidence`, files.csrf, { title: "Inline access observation", content: "Original observed configuration", requirementIds: [A], collectedAt: "2026-01-01" });
  const list = await (await page.request.get(`/api/workspaces/${files.id}/evidence`)).json() as Evidence[];
  expect(list[0]!.content).toBeUndefined();
  await page.goto(`/w/${files.slug}/evidence`);
  await page.getByRole("button", { name: legacy.title, exact: true }).click();
  const dialog = page.getByRole("dialog", { name: legacy.title, exact: true });
  await expect(dialog).toContainText("Original observed configuration");
  const changed = await page.request.patch(`/api/workspaces/${files.id}/evidence/${legacy.id}`, { headers: { "x-visua-csrf": files.csrf }, data: { content: "Changed observed configuration" } });
  expect(changed.ok()).toBe(true);
  await expect(dialog).toContainText("Original observed configuration");
  await dialog.getByRole("button", { name: "Accept", exact: true }).click();
  await expect(dialog.getByRole("alert")).toContainText("changed since");
  await dialog.getByRole("button", { name: "Reload evidence", exact: true }).click();
  await expect(dialog).toContainText("Changed observed configuration");
  await dialog.getByRole("button", { name: "Accept", exact: true }).click();
  await expect(dialog.getByRole("region", { name: "Review history" })).toContainText("accepted");
});

for (const role of ["viewer", "auditor", "contributor"] as const) {
  test(`${role} can download a file and sees the corresponding upload/review controls`, async ({ page, files }) => {
    const evidence = await apiUpload(page.request, files);
    await login(page.request, emails[role]);
    await page.goto(`/w/${files.slug}/evidence`);
    const upload = page.getByRole("button", { name: "Upload evidence", exact: true });
    if (role === "contributor") await expect(upload).toBeEnabled(); else await expect(upload).toBeDisabled();
    await page.getByRole("button", { name: evidence.title, exact: true }).click();
    const dialog = page.getByRole("dialog", { name: evidence.title, exact: true });
    await expect(dialog.getByRole("button", { name: "Accept", exact: true })).toHaveCount(0);
    const pending = page.waitForEvent("download");
    await dialog.getByRole("button", { name: "Download file", exact: true }).click();
    expect(await readFile((await (await pending).path())!)).toEqual(body);
  });
}

test("detail and download failures offer retry, and upload remains usable on a narrow screen", async ({ page, files }) => {
  const evidence = await apiUpload(page.request, files);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`/w/${files.slug}/evidence`);
  let detailAttempts = 0;
  await page.route(`**/evidence/${evidence.id}`, async route => {
    detailAttempts++;
    if (detailAttempts === 1) await route.fulfill({ status: 503, contentType: "application/json", body: '{"error":"Details unavailable"}' }); else await route.continue();
  });
  await page.getByRole("button", { name: evidence.title, exact: true }).click();
  const dialog = page.getByRole("dialog", { name: evidence.title, exact: true });
  await expect(dialog.getByRole("alert")).toContainText("Details unavailable");
  await expect(dialog.getByRole("button", { name: "Accept", exact: true })).toHaveCount(0);
  await dialog.getByRole("button", { name: "Reload evidence", exact: true }).click();
  await expect(dialog.getByRole("button", { name: "Download file", exact: true })).toBeVisible();
  await page.route(`**/evidence/${evidence.id}/file`, route => route.fulfill({ status: 503, contentType: "application/json", body: '{"error":"File could not be verified"}' }));
  await dialog.getByRole("button", { name: "Download file", exact: true }).click();
  await expect(dialog.getByRole("alert")).toContainText("File could not be verified");
  await page.unroute(`**/evidence/${evidence.id}/file`);
  const download = page.waitForEvent("download");
  await dialog.getByRole("button", { name: "Download file", exact: true }).click();
  expect(await readFile((await (await download).path())!)).toEqual(body);
  await dialog.getByRole("button", { name: "Close", exact: true }).click();
  await page.getByRole("button", { name: "Upload evidence", exact: true }).click();
  const upload = page.getByRole("dialog", { name: "Upload evidence", exact: true });
  await expect(upload.getByLabel("Evidence file", { exact: true })).toBeVisible();
  await expect(upload.getByRole("button", { name: "Cancel", exact: true })).toBeVisible();
  await upload.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(upload).toHaveCount(0);
});
