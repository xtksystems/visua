import { randomUUID } from "node:crypto";
import { expect, test as base, type APIRequestContext, type Page } from "@playwright/test";
import type { Me } from "../apps/web/src/lib/auth.ts";
import type { Task, WorkspaceSummary } from "../apps/web/src/lib/types.ts";

const A = "nist-csf-2.0:PR.AA-01";
const B = "nist-csf-2.0:PR.AA-02";
const SOC = "aicpa-tsc-2017:CC6.1";
const OWNER = "morgan.lee@northwind-health.example";
const roleEmails = { viewer: "jordan.park@northwind-health.example", auditor: "alex.kim@audit-partners.example", contributor: "sam.ortiz@northwind-health.example" };
type Fixture = { id: string; slug: string; tenantId: string; csrf: string; ownerId: string; task: Task; memberIds: Record<string, string> };
async function signIn(request: APIRequestContext, email: string): Promise<Me> {
  const previous = await (await request.get("/api/auth/me")).json() as Me | null;
  const r = await request.post("/api/auth/dev/login", { data: { email }, headers: previous?.csrf ? { "x-visua-csrf": previous.csrf } : undefined });
  expect(r.ok(), await r.text()).toBe(true);
  return await r.json() as Me;
}
async function write<T>(request: APIRequestContext, method: "post" | "patch" | "delete", path: string, csrf: string, data?: unknown): Promise<T> {
  const r = await request[method](`/api${path}`, { headers: { "x-visua-csrf": csrf }, data });
  expect(r.ok(), await r.text()).toBe(true);
  return await r.json() as T;
}
const test = base.extend<{ work: Fixture }>({
  work: async ({ page }, use) => {
    const me = await signIn(page.request, OWNER);
    const csrf = me.csrf!;
    const tenant = await write<{ id: string }>(page.request, "post", "/tenants", csrf, { name: `Owned work ${randomUUID()}` });
    for (const [role, email] of Object.entries(roleEmails)) await write(page.request, "post", `/tenants/${tenant.id}/members`, csrf, { email, role });
    const summary = await write<WorkspaceSummary>(page.request, "post", "/workspaces", csrf, {
      name: `Owned work ${randomUUID()}`, frameworks: ["nist-csf-2.0", "aicpa-tsc-2017"], profile: { industry: "saas", size: "11-50" },
    });
    const { id, slug } = summary.workspace;
    const members = await (await page.request.get(`/api/tenants/${tenant.id}/members`)).json() as { id: string; email: string }[];
    const memberIds = Object.fromEntries(members.map((m) => [m.email, m.id]));
    const task = await write<Task>(page.request, "post", `/workspaces/${id}/tasks`, csrf, { title: "Review access operations", requirementIds: [A], checklist: [{ text: "Inspect access settings" }] });
    await use({ id, slug, tenantId: tenant.id, csrf, ownerId: me.user.id, task, memberIds });
    const cleanup = await signIn(page.request, OWNER);
    const response = await page.request.delete(`/api/workspaces/${id}`, { headers: { "x-visua-csrf": cleanup.csrf! } });
    expect(response.ok(), await response.text()).toBe(true);
    if (me.activeTenant) await write(page.request, "post", "/auth/tenant", cleanup.csrf!, { tenantId: me.activeTenant.id });
  },
});
const basePath = (f: Fixture) => `/w/${f.slug}`;
const requirementPath = (f: Fixture, id = A) => `${basePath(f)}/observatory/${id.split(":")[0]}?select=${encodeURIComponent(id)}`;
const inspector = (page: Page) => page.locator("aside.inspector");
async function navigate(page: Page, path: string) {
  await page.evaluate((url) => { history.pushState({}, "", url); window.dispatchEvent(new PopStateEvent("popstate")); }, path);
}
async function serverTask(page: Page, work: Fixture) {
  return (await (await page.request.get(`/api/workspaces/${work.id}/tasks`)).json() as Task[]).find((t) => t.id === work.task.id)!;
}

test("requirement owner and due date save explicitly, then appear in identity-based My work", async ({ page, work }) => {
  const patches: string[] = [];
  page.on("request", (r) => { if (r.method() === "PATCH") patches.push(r.url()); });
  await page.goto(requirementPath(work));
  const panel = inspector(page);
  await panel.getByLabel("Assign owner", { exact: true }).selectOption(`member:${work.ownerId}`);
  await panel.getByLabel("Requirement due date").fill("2026-01-01");
  await panel.getByLabel("Requirement due date").press("Tab");
  expect(patches).toEqual([]);
  await panel.getByRole("button", { name: "Save owner", exact: true }).click();
  await expect(panel.getByRole("button", { name: "Save owner", exact: true })).toBeDisabled();
  await panel.getByRole("button", { name: "Save due date", exact: true }).click();
  await expect(panel.getByRole("button", { name: "Save due date", exact: true })).toBeDisabled();
  const state = await (await page.request.get(`/api/workspaces/${work.id}/requirements/${encodeURIComponent(A)}`)).json() as { state: { ownerUserId: string; dueDate: string } };
  expect(state.state).toMatchObject({ ownerUserId: work.ownerId, dueDate: "2026-01-01" });
  await page.getByRole("link", { name: "My work", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Assigned to you", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: /PR.AA-01/ }).first()).toBeVisible();
  await expect(page.getByText(/Overdue/).first()).toBeVisible();
  await page.getByRole("link", { name: /PR.AA-01/ }).first().click();
  await expect(page).toHaveURL(new RegExp(`/w/${work.id}/observatory/nist-csf-2.0.*select=`));
  await expect(inspector(page).getByLabel("Assign owner", { exact: true })).toHaveValue(`member:${work.ownerId}`);
});

test("cached requirement changes discard unsaved member and due date drafts", async ({ page, work }) => {
  await page.goto(requirementPath(work));
  await expect(inspector(page).getByLabel("Requirement due date")).toBeVisible();
  await navigate(page, requirementPath(work, B));
  await expect(page.getByRole("complementary", { name: "PR.AA-02 details" })).toBeVisible();
  await inspector(page).getByLabel("Assign owner", { exact: true }).selectOption(`member:${work.ownerId}`);
  await inspector(page).getByLabel("Requirement due date").fill("2027-02-01");
  await navigate(page, requirementPath(work));
  await expect(inspector(page).getByLabel("Requirement due date")).toHaveValue("");
  await navigate(page, requirementPath(work, B));
  await expect(inspector(page).getByLabel("Assign owner", { exact: true })).toHaveValue("");
  await expect(inspector(page).getByLabel("Requirement due date")).toHaveValue("");
  await expect(inspector(page).getByRole("button", { name: "Save due date", exact: true })).toBeDisabled();
});

test("task details assign a member, edit due date and add a cross-framework requirement", async ({ page, work }) => {
  await page.goto(`${basePath(work)}/plan?task=${work.task.id}`);
  const dialog = page.getByRole("dialog", { name: work.task.title });
  await expect(dialog).toBeVisible();
  await dialog.getByLabel("Assignee", { exact: true }).selectOption(`member:${work.ownerId}`);
  await dialog.getByLabel("Due date", { exact: true }).fill("2027-02-28");
  await dialog.getByLabel("Search requirements to link", { exact: true }).fill("CC6.1");
  await dialog.getByRole("button", { name: /Add CC6.1/ }).click();
  expect((await serverTask(page, work)).assignee).toBeUndefined();
  await dialog.getByRole("button", { name: "Save task details", exact: true }).click();
  await expect(dialog.getByRole("button", { name: "Save task details", exact: true })).toBeDisabled();
  expect(await serverTask(page, work)).toMatchObject({ assignee: { type: "person", id: work.ownerId, name: "Morgan Lee" }, dueDate: "2027-02-28", requirementIds: [A, SOC] });
  await dialog.getByRole("button", { name: "Close", exact: true }).click();
  await page.getByRole("link", { name: "My work", exact: true }).click();
  await page.getByRole("button", { name: `Open task ${work.task.title}`, exact: true }).click();
  await expect(page.getByRole("dialog", { name: work.task.title })).toBeVisible();
  await page.getByRole("dialog").getByRole("link", { name: /CC6.1/ }).click();
  await expect(page).toHaveURL(new RegExp(`/w/${work.id}/observatory/aicpa-tsc-2017.*select=`));
  await expect(page.getByRole("complementary", { name: "CC6.1 details" })).toBeVisible();
});

test("task draft survives same-task refresh, Cancel discards it, and null saves clear assignment and date", async ({ page, work }) => {
  await write(page.request, "patch", `/workspaces/${work.id}/tasks/${work.task.id}`, work.csrf, { assignee: { type: "person", id: work.ownerId, name: "Spoof" }, dueDate: "2027-03-01" });
  await page.goto(`${basePath(work)}/plan?task=${work.task.id}`);
  const dialog = page.getByRole("dialog", { name: work.task.title });
  await dialog.getByLabel("Due date", { exact: true }).fill("2027-04-01");
  await write(page.request, "patch", `/workspaces/${work.id}/tasks/${work.task.id}`, work.csrf, { priority: "high" });
  await expect(dialog.getByText("high", { exact: true })).toBeVisible();
  await expect(dialog.getByLabel("Due date", { exact: true })).toHaveValue("2027-04-01");
  await dialog.getByRole("button", { name: "Cancel task changes", exact: true }).click();
  await expect(dialog.getByLabel("Due date", { exact: true })).toHaveValue("2027-03-01");
  await dialog.getByLabel("Assignee", { exact: true }).selectOption("");
  await dialog.getByLabel("Due date", { exact: true }).fill("");
  await dialog.getByRole("button", { name: "Save task details", exact: true }).click();
  await expect(dialog.getByRole("button", { name: "Save task details", exact: true })).toBeDisabled();
  expect((await serverTask(page, work)).assignee).toBeUndefined();
  expect((await serverTask(page, work)).dueDate).toBeUndefined();
});

test("failed detail save retains the draft and supports a successful retry", async ({ page, work }) => {
  await page.goto(`${basePath(work)}/plan?task=${work.task.id}`);
  const dialog = page.getByRole("dialog", { name: work.task.title });
  await dialog.getByLabel("Assignee", { exact: true }).selectOption("external");
  await dialog.getByLabel("External owner", { exact: true }).fill("External access consultant");
  await dialog.getByLabel("Due date", { exact: true }).fill("2027-03-01");
  await page.route(`**/api/workspaces/${work.id}/tasks/${work.task.id}`, async (route) => {
    if (route.request().method() === "PATCH") { await route.fulfill({ status: 503, json: { error: "Detail save unavailable" } }); await page.unroute(`**/api/workspaces/${work.id}/tasks/${work.task.id}`); }
    else await route.continue();
  });
  await dialog.getByRole("button", { name: "Save task details", exact: true }).click();
  await expect(dialog.getByRole("alert")).toContainText("Detail save unavailable");
  await expect(dialog.getByLabel("Due date", { exact: true })).toHaveValue("2027-03-01");
  expect((await serverTask(page, work)).dueDate).toBeUndefined();
  await dialog.getByRole("button", { name: "Save task details", exact: true }).click();
  await expect(dialog.getByRole("button", { name: "Save task details", exact: true })).toBeDisabled();
  expect((await serverTask(page, work)).assignee).toMatchObject({ type: "external", id: "external", name: "External access consultant" });
  await dialog.getByRole("button", { name: "Close", exact: true }).click();
  await page.getByRole("link", { name: "My work", exact: true }).click();
  await expect(page.getByRole("button", { name: `Open task ${work.task.title}`, exact: true })).toHaveCount(0);
});

for (const role of ["viewer", "auditor", "contributor"] as const) {
  test(`${role} sees personal assignments with edit controls matching its capability`, async ({ page, work }) => {
    const id = work.memberIds[roleEmails[role]]!;
    await write(page.request, "patch", `/workspaces/${work.id}/tasks/${work.task.id}`, work.csrf, { assignee: { type: "person", id, name: "Untrusted" } });
    await write(page.request, "patch", `/workspaces/${work.id}/requirements/${encodeURIComponent(A)}`, work.csrf, { ownerUserId: id, dueDate: "2027-03-01" });
    await signIn(page.request, roleEmails[role]);
    const writes: string[] = [];
    page.on("request", (r) => { if (r.method() === "PATCH") writes.push(r.url()); });
    await page.goto(`${basePath(work)}/my-work`);
    await page.getByRole("button", { name: `Open task ${work.task.title}`, exact: true }).click();
    const dialog = page.getByRole("dialog", { name: work.task.title });
    const control = dialog.getByLabel("Assignee", { exact: true });
    if (role === "contributor") {
      await expect(control).toBeEnabled();
      await dialog.getByLabel("Due date", { exact: true }).fill("2027-04-01");
      await dialog.getByRole("button", { name: "Save task details", exact: true }).click();
      await expect(dialog.getByRole("button", { name: "Save task details", exact: true })).toBeDisabled();
      expect(writes).toHaveLength(1);
    } else { await expect(control).toBeDisabled(); await expect(dialog.getByLabel("Due date", { exact: true })).toBeDisabled(); expect(writes).toEqual([]); }
    await dialog.getByRole("button", { name: "Close", exact: true }).click();
    await page.getByRole("link", { name: /PR.AA-01/ }).first().click();
    await expect(inspector(page).getByLabel("Assign owner", { exact: true })).toHaveValue(`member:${id}`);
    if (role !== "contributor") { await expect(inspector(page).getByLabel("Assign owner", { exact: true })).toBeDisabled(); await expect(inspector(page).getByLabel("Requirement due date")).toBeDisabled(); expect(writes).toEqual([]); }
  });
}

test("My work load failure keeps its URL and Retry recovers canonical workspace data", async ({ page, work }) => {
  let fail = true;
  const urls: string[] = [];
  await page.route("**/api/workspaces/*/my-work", async (route) => {
    urls.push(route.request().url());
    if (fail) await route.fulfill({ status: 503, json: { error: "Personal work unavailable" } });
    else await route.continue();
  });
  await page.goto(`${basePath(work)}/my-work`);
  await expect(page.getByRole("alert")).toContainText("Personal work unavailable");
  await expect(page).toHaveURL(new RegExp(`${work.slug}/my-work$`));
  fail = false;
  await page.getByRole("button", { name: "Retry", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Assigned to you", exact: true })).toBeVisible();
  expect(urls.length).toBeGreaterThan(1);
  expect(urls.every((url) => url.includes(`/workspaces/${work.id}/my-work`))).toBe(true);
});

test("completed tasks, removed links, mobile layout and reassignment reconcile My work", async ({ page, work }) => {
  await write(page.request, "patch", `/workspaces/${work.id}/tasks/${work.task.id}`, work.csrf, { assignee: { type: "person", id: work.ownerId }, status: "done" });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${basePath(work)}/my-work`);
  await expect(page.getByRole("heading", { name: "Assigned to you", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: `Open task ${work.task.title}`, exact: true })).toHaveCount(0);
  await page.getByLabel("Show completed").check();
  await page.getByRole("button", { name: `Open task ${work.task.title}`, exact: true }).click();
  const dialog = page.getByRole("dialog", { name: work.task.title });
  await dialog.getByRole("button", { name: "Remove PR.AA-01 requirement", exact: true }).click();
  await dialog.getByRole("button", { name: "Save task details", exact: true }).click();
  await expect(dialog.getByRole("button", { name: "Save task details", exact: true })).toBeDisabled();
  expect((await serverTask(page, work)).requirementIds).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  await write(page.request, "patch", `/workspaces/${work.id}/tasks/${work.task.id}`, work.csrf, { assignee: { type: "person", id: work.memberIds[roleEmails.contributor] } });
  await expect(dialog).toHaveCount(0);
  await expect(page.getByRole("button", { name: `Open task ${work.task.title}`, exact: true })).toHaveCount(0);
});

test("evidence events refresh assigned requirement status in an open My work view", async ({ page, work }) => {
  await write(page.request, "patch", `/workspaces/${work.id}/requirements/${encodeURIComponent(A)}`, work.csrf, { ownerUserId: work.ownerId, current: 3, target: 3 });
  await page.goto(`${basePath(work)}/my-work`);
  await expect(page.getByText("Implemented", { exact: true })).toBeVisible();
  const evidence = await write<{ id: string }>(page.request, "post", `/workspaces/${work.id}/evidence`, work.csrf, { title: "Expired access observation", requirementIds: [A], content: "Fixture observation", collectedAt: "2025-01-01", validUntil: "2025-02-01" });
  await expect(page.getByText("At risk", { exact: true })).toBeVisible();
  await write(page.request, "patch", `/workspaces/${work.id}/evidence/${evidence.id}`, work.csrf, { validUntil: "2030-02-01" });
  await expect(page.getByText("Implemented", { exact: true })).toBeVisible();
});
