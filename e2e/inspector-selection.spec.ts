import { randomUUID } from "node:crypto";
import { expect, test as base, type Page } from "@playwright/test";

const OWNER = "morgan.lee@northwind-health.example";
const A = "nist-csf-2.0:PR.AA-01";
const B = "nist-csf-2.0:PR.AA-02";
const OWNER_A = "Alice — identity team";
const OWNER_B = "Blair — access team";
const TASK = "Inspect the identity configuration";
const EVIDENCE = "Observed identity configuration";

type Identity = { id: string; slug: string };
type InspectorWorkspace = Identity & { csrf: string; sibling: () => Promise<Identity> };

async function signIn(page: Page, email = OWNER): Promise<string> {
  const session = await (await page.request.get("/api/auth/me")).json() as { csrf?: string } | null;
  const response = await page.request.post("/api/auth/dev/login", { data: { email }, headers: session?.csrf ? { "x-visua-csrf": session.csrf } : undefined });
  expect(response.ok(), await response.text()).toBe(true);
  return ((await response.json()) as { csrf: string }).csrf;
}

async function createWorkspace(page: Page, csrf: string): Promise<Identity> {
  const response = await page.request.post("/api/workspaces", {
    headers: { "x-visua-csrf": csrf },
    data: { name: `Inspector selection ${randomUUID()}`, profile: { industry: "healthcare", size: "51-200" }, frameworks: ["nist-csf-2.0"] },
  });
  expect(response.status(), await response.text()).toBe(201);
  const identity = ((await response.json()) as { workspace: Identity }).workspace;
  expect(identity.id).not.toBe(identity.slug);
  return identity;
}

const test = base.extend<{ inspectorWorkspace: InspectorWorkspace }>({
  inspectorWorkspace: async ({ page }, use) => {
    const csrf = await signIn(page);
    const workspace = await createWorkspace(page, csrf);
    const created = [workspace];
    const headers = { "x-visua-csrf": csrf };
    for (const [nodeId, owner] of [[A, OWNER_A], [B, OWNER_B]] as const) {
      const response = await page.request.patch(`/api/workspaces/${workspace.id}/requirements/${encodeURIComponent(nodeId)}`, { headers, data: { owner, current: 1, target: 1 } });
      expect(response.status(), await response.text()).toBe(200);
    }
    const task = await page.request.post(`/api/workspaces/${workspace.id}/tasks`, { headers, data: { title: TASK, kind: "procedure", requirementIds: [A] } });
    expect(task.status(), await task.text()).toBe(201);
    const evidence = await page.request.post(`/api/workspaces/${workspace.id}/evidence`, { headers, data: { title: EVIDENCE, content: "Configuration observed by the browser fixture", requirementIds: [A] } });
    expect(evidence.status(), await evidence.text()).toBe(201);
    await use({ ...workspace, csrf, sibling: async () => {
      const next = await createWorkspace(page, csrf);
      created.push(next);
      return next;
    } });
    const cleanupCsrf = await signIn(page);
    for (const identity of created) {
      const response = await page.request.delete(`/api/workspaces/${identity.id}`, { headers: { "x-visua-csrf": cleanupCsrf } });
      expect(response.ok(), await response.text()).toBe(true);
    }
  },
});

const inspector = (page: Page) => page.locator("aside.inspector");
const nodeCode = (nodeId: string) => nodeId.split(":")[1]!;
const routeFor = (workspace: string, nodeId = A) => `/w/${workspace}/observatory/nist-csf-2.0?select=${encodeURIComponent(nodeId)}`;

async function open(page: Page, workspace: Identity, nodeId = A) {
  await page.goto(routeFor(workspace.slug, nodeId));
  await expect(page.getByRole("complementary", { name: `${nodeCode(nodeId)} details` })).toBeVisible();
}

async function select(page: Page, nodeId: string) {
  await page.locator(`[id="outline-${nodeId}"]`).click();
  await expect(page.getByRole("complementary", { name: `${nodeCode(nodeId)} details` })).toBeVisible();
}

/** Follow another destination without reloading, retaining the query cache and mounted route. */
async function navigateInPlace(page: Page, path: string) {
  await page.evaluate((destination) => {
    history.pushState({}, "", destination);
    window.dispatchEvent(new PopStateEvent("popstate"));
  }, path);
}

async function serverOwner(page: Page, workspace: Identity, nodeId = A) {
  const response = await page.request.get(`/api/workspaces/${workspace.id}/requirements/${encodeURIComponent(nodeId)}`);
  expect(response.ok()).toBe(true);
  return ((await response.json()) as { state: { owner?: string } }).state.owner;
}

test("cached A → B → A → B selections reset owner drafts and never write on blur", async ({ page, inspectorWorkspace: workspace }) => {
  const detailRequests: string[] = [];
  const patches: string[] = [];
  page.on("request", (request) => {
    if (!request.url().includes("/requirements/")) return;
    detailRequests.push(request.url());
    if (request.method() === "PATCH") patches.push(request.url());
  });
  await open(page, workspace);
  await expect(inspector(page).getByLabel("Owner", { exact: true })).toHaveValue(OWNER_A);
  await inspector(page).getByLabel("Owner", { exact: true }).press("Tab");
  await expect(inspector(page).getByRole("button", { name: "Save owner", exact: true })).toBeDisabled();
  await select(page, B);
  await expect(inspector(page).getByLabel("Owner", { exact: true })).toHaveValue(OWNER_B);
  await inspector(page).getByLabel("Owner", { exact: true }).fill("Unsaved B draft");
  await inspector(page).getByLabel("Owner", { exact: true }).press("Tab");
  await select(page, A);
  await expect(inspector(page).getByLabel("Owner", { exact: true })).toHaveValue(OWNER_A);
  await inspector(page).getByLabel("Owner", { exact: true }).fill("Unsaved A draft");
  await select(page, B);
  await expect(inspector(page).getByLabel("Owner", { exact: true })).toHaveValue(OWNER_B);
  expect(await serverOwner(page, workspace)).toBe(OWNER_A);
  expect(await serverOwner(page, workspace, B)).toBe(OWNER_B);
  expect(patches).toEqual([]);
  expect(detailRequests.length).toBeGreaterThanOrEqual(2);
  expect(detailRequests.every((url) => url.includes(`/workspaces/${workspace.id}/requirements/`))).toBe(true);
});

test("owner edits require Save, survive refetch and failure, and Cancel resets without writing", async ({ page, inspectorWorkspace: workspace }) => {
  await open(page, workspace);
  const owner = inspector(page).getByLabel("Owner", { exact: true });
  const save = inspector(page).getByRole("button", { name: "Save owner", exact: true });
  const cancel = inspector(page).getByRole("button", { name: "Cancel owner change", exact: true });
  await owner.fill("Owner draft through refetch");
  const refreshed = page.waitForResponse((response) => response.request().method() === "GET" && response.url().includes(`/workspaces/${workspace.id}/requirements/${encodeURIComponent(A)}`));
  const changed = await page.request.patch(`/api/workspaces/${workspace.id}/requirements/${encodeURIComponent(A)}`, { headers: { "x-visua-csrf": workspace.csrf }, data: { priority: "high" } });
  expect(changed.status()).toBe(200);
  await refreshed;
  await expect(inspector(page).getByRole("combobox", { name: "Priority", exact: true })).toHaveValue("high");
  await expect(owner).toHaveValue("Owner draft through refetch");
  await cancel.click();
  await expect(owner).toHaveValue(OWNER_A);
  await expect(save).toBeDisabled();
  await expect(cancel).toBeDisabled();
  expect(await serverOwner(page, workspace)).toBe(OWNER_A);

  const requirementUrl = `**/api/workspaces/${workspace.id}/requirements/${encodeURIComponent(A)}`;
  await page.route(requirementUrl, async (route) => {
    if (route.request().method() === "PATCH") await route.fulfill({ status: 503, json: { error: "Owner service temporarily unavailable" } });
    else await route.continue();
  });
  await owner.fill("Casey — operations");
  await save.click();
  await expect(inspector(page).getByRole("alert")).toContainText("Could not save owner: Owner service temporarily unavailable");
  await expect(owner).toHaveValue("Casey — operations");
  await expect(save).toBeEnabled();
  expect(await serverOwner(page, workspace)).toBe(OWNER_A);
  await page.unroute(requirementUrl);
  const saved = page.waitForResponse((response) => response.request().method() === "PATCH" && response.url().includes(`/workspaces/${workspace.id}/requirements/${encodeURIComponent(A)}`));
  await save.click();
  expect((await saved).status()).toBe(200);
  await expect(save).toBeDisabled();
  await expect(owner).toHaveValue("Casey — operations");
  await expect(inspector(page).getByRole("alert")).toHaveCount(0);
  expect(await serverOwner(page, workspace)).toBe("Casey — operations");
  await page.reload();
  await expect(inspector(page).getByLabel("Owner", { exact: true })).toHaveValue("Casey — operations");
});

test("cached selection changes reset tabs, rationale dialogs, task and evidence drafts", async ({ page, inspectorWorkspace: workspace }) => {
  await open(page, workspace);
  await select(page, B);
  await select(page, A);
  await inspector(page).getByRole("button", { name: "Mark not applicable…", exact: true }).click();
  await page.getByRole("dialog").getByLabel("Rationale (visible to auditors)").fill("Unsaved scope rationale for A");
  await navigateInPlace(page, routeFor(workspace.slug, B));
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(inspector(page).getByRole("tab", { name: "Overview", exact: true })).toHaveAttribute("aria-selected", "true");
  await inspector(page).getByRole("button", { name: "Mark not applicable…", exact: true }).click();
  await expect(page.getByRole("dialog").getByLabel("Rationale (visible to auditors)")).toHaveValue("");
  await page.getByRole("dialog").getByRole("button", { name: "Cancel", exact: true }).click();
  await inspector(page).getByRole("tab", { name: /^Tasks/ }).click();
  await inspector(page).getByLabel("Task title", { exact: true }).fill("Unsaved task for B");
  await select(page, A);
  await expect(inspector(page).getByRole("tab", { name: "Overview", exact: true })).toHaveAttribute("aria-selected", "true");
  await inspector(page).getByRole("tab", { name: /^Tasks/ }).click();
  await expect(inspector(page).getByLabel("Task title", { exact: true })).toHaveValue("");
  await inspector(page).getByRole("tab", { name: /^Evidence/ }).click();
  await inspector(page).getByRole("button", { name: "Add evidence", exact: true }).click();
  await page.getByRole("dialog").getByLabel("Title", { exact: true }).fill("Unsaved artifact for A");
  await page.getByRole("dialog").getByLabel("Kind", { exact: true }).selectOption("log");
  await page.getByRole("dialog").getByLabel("Content or reference", { exact: true }).fill("Unsaved evidence content");
  await navigateInPlace(page, routeFor(workspace.slug, B));
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(inspector(page).getByRole("tab", { name: "Overview", exact: true })).toHaveAttribute("aria-selected", "true");
  await inspector(page).getByRole("tab", { name: /^Evidence/ }).click();
  await inspector(page).getByRole("button", { name: "Add evidence", exact: true }).click();
  await expect(page.getByRole("dialog").getByLabel("Title", { exact: true })).toHaveValue("");
  await expect(page.getByRole("dialog").getByLabel("Content or reference", { exact: true })).toHaveValue("");
  await expect(page.getByRole("dialog").getByLabel("Kind", { exact: true })).toHaveValue("document");
});

test("a pending owner response cannot change or report an error in the next selection", async ({ page, inspectorWorkspace: workspace }) => {
  await open(page, workspace);
  let release!: () => void;
  let intercepted!: () => void;
  const ready = new Promise<void>((resolve) => { intercepted = resolve; });
  const held = new Promise<void>((resolve) => { release = resolve; });
  await page.route(`**/api/workspaces/${workspace.id}/requirements/${encodeURIComponent(A)}`, async (route) => {
    if (route.request().method() !== "PATCH") return route.continue();
    intercepted();
    await held;
    await route.fulfill({ status: 503, json: { error: "The previous owner's save failed" } });
  });
  await inspector(page).getByLabel("Owner", { exact: true }).fill("Pending A draft");
  await inspector(page).getByRole("button", { name: "Save owner", exact: true }).click();
  await ready;
  await expect(inspector(page).getByRole("button", { name: "Save owner", exact: true })).toBeDisabled();
  await expect(inspector(page).getByRole("button", { name: "Cancel owner change", exact: true })).toBeDisabled();
  await expect(inspector(page).getByLabel("Owner", { exact: true })).toBeDisabled();
  await select(page, B);
  await inspector(page).getByLabel("Owner", { exact: true }).fill("Fresh B draft");
  const failed = page.waitForResponse((response) => response.request().method() === "PATCH" && response.url().includes(encodeURIComponent(A)));
  release();
  expect((await failed).status()).toBe(503);
  await expect(inspector(page).getByLabel("Owner", { exact: true })).toHaveValue("Fresh B draft");
  await expect(inspector(page).getByRole("alert")).toHaveCount(0);
  await expect(page.getByText("The previous owner's save failed", { exact: true })).toHaveCount(0);
  await select(page, A);
  await expect(inspector(page).getByLabel("Owner", { exact: true })).toHaveValue(OWNER_A);
  await expect(inspector(page).getByRole("alert")).toHaveCount(0);
});

test("same-node workspace changes reset cached drafts and use each canonical id", async ({ page, inspectorWorkspace: workspace }) => {
  const other = await workspace.sibling();
  const response = await page.request.patch(`/api/workspaces/${other.id}/requirements/${encodeURIComponent(A)}`, { headers: { "x-visua-csrf": workspace.csrf }, data: { owner: "Other workspace owner" } });
  expect(response.status()).toBe(200);
  await open(page, workspace);
  await inspector(page).getByLabel("Owner", { exact: true }).fill("Unsaved first-workspace owner");
  await navigateInPlace(page, routeFor(other.slug));
  await expect(inspector(page).getByLabel("Owner", { exact: true })).toHaveValue("Other workspace owner");
  await inspector(page).getByLabel("Owner", { exact: true }).fill("Unsaved second-workspace owner");
  await navigateInPlace(page, routeFor(workspace.slug));
  await expect(inspector(page).getByLabel("Owner", { exact: true })).toHaveValue(OWNER_A);
  await navigateInPlace(page, routeFor(other.id));
  await expect(inspector(page).getByLabel("Owner", { exact: true })).toHaveValue("Other workspace owner");
  expect(await serverOwner(page, workspace)).toBe(OWNER_A);
  expect(await serverOwner(page, other)).toBe("Other workspace owner");
});

test("a failed requirement deep link stays selected with inline retry and close", async ({ page, inspectorWorkspace: workspace }) => {
  let failing = true;
  await page.route(`**/api/workspaces/${workspace.id}/requirements/${encodeURIComponent(A)}`, async (route) => {
    if (failing && route.request().method() === "GET") await route.fulfill({ status: 503, json: { error: "Requirement details unavailable" } });
    else await route.continue();
  });
  await page.goto(routeFor(workspace.slug));
  await expect(inspector(page).getByRole("alert")).toContainText("Requirement details unavailable");
  await expect(page).toHaveURL(new RegExp(`select=${encodeURIComponent(A)}`));
  failing = false;
  await inspector(page).getByRole("button", { name: "Retry", exact: true }).click();
  await expect(inspector(page).getByLabel("Owner", { exact: true })).toHaveValue(OWNER_A);
  await expect(page).toHaveURL(new RegExp(`select=${encodeURIComponent(A)}`));
  await inspector(page).getByRole("button", { name: "Close inspector", exact: true }).click();
  await expect(inspector(page)).toHaveCount(0);
  await expect(page).toHaveURL(new RegExp(`/w/${workspace.slug}/observatory/nist-csf-2.0$`));
});

test("mapping navigation keeps the selected requirement when the framework changes", async ({ page, inspectorWorkspace: workspace }) => {
  const response = await page.request.get(`/api/workspaces/${workspace.id}/requirements/${encodeURIComponent(A)}`);
  const detail = await response.json() as { mappings: { id: string; framework: string }[] };
  const mapping = detail.mappings.find((item) => item.framework === "nist-sp-800-53-r5")!;
  expect(mapping).toBeTruthy();
  const enabled = await page.request.put(`/api/workspaces/${workspace.id}/frameworks/${mapping.framework}`, { headers: { "x-visua-csrf": workspace.csrf }, data: { enabled: true } });
  expect(enabled.ok(), await enabled.text()).toBe(true);
  await open(page, workspace);
  await inspector(page).getByRole("tab", { name: /^Mappings/ }).click();
  await inspector(page).getByRole("button", { name: nodeCode(mapping.id), exact: true }).click();
  await expect(page.getByRole("complementary", { name: `${nodeCode(mapping.id)} details` })).toBeVisible();
  expect(new URL(page.url()).pathname).toBe(`/w/${workspace.slug}/observatory/${mapping.framework}`);
  expect(new URL(page.url()).searchParams.get("select")).toBe(mapping.id);
  await navigateInPlace(page, routeFor(workspace.slug));
  await expect(page.getByRole("complementary", { name: "PR.AA-01 details" })).toBeVisible();
  await inspector(page).getByRole("tab", { name: /^Mappings/ }).click();
  await inspector(page).getByRole("button", { name: nodeCode(mapping.id), exact: true }).click();
  await expect(page.getByRole("complementary", { name: `${nodeCode(mapping.id)} details` })).toBeVisible();
  expect(new URL(page.url()).searchParams.get("select")).toBe(mapping.id);
});

for (const action of ["task", "evidence"] as const) {
  test(`failed ${action} writes retain the active requirement draft and report the error`, async ({ page, inspectorWorkspace: workspace }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const message = `Active ${action} service unavailable`;
    await page.route(`**/api/workspaces/${workspace.id}/${action === "task" ? "tasks" : "evidence"}`, (route) => route.request().method() === "POST"
      ? route.fulfill({ status: 503, json: { error: message } }) : route.continue());
    await open(page, workspace);
    await inspector(page).getByRole("tab", { name: action === "task" ? /^Tasks/ : /^Evidence/ }).click();
    if (action === "task") {
      await inspector(page).getByLabel("Task title", { exact: true }).fill("Keep my task draft");
      await inspector(page).getByRole("button", { name: "Add task", exact: true }).click();
    } else {
      await inspector(page).getByRole("button", { name: "Add evidence", exact: true }).click();
      await page.getByRole("dialog").getByLabel("Title", { exact: true }).fill("Keep my evidence draft");
      await page.getByRole("dialog").getByLabel("Content or reference", { exact: true }).fill("Observed configuration remains in this draft");
      await page.getByRole("dialog").getByRole("button", { name: "Add for review", exact: true }).click();
    }
    await expect(page.getByText(message, { exact: true })).toBeVisible();
    if (action === "task") await expect(inspector(page).getByLabel("Task title", { exact: true })).toHaveValue("Keep my task draft");
    else {
      await expect(page.getByRole("dialog").getByLabel("Title", { exact: true })).toHaveValue("Keep my evidence draft");
      await expect(page.getByRole("dialog").getByLabel("Content or reference", { exact: true })).toHaveValue("Observed configuration remains in this draft");
    }
  });

  test(`a delayed ${action} failure stays with its original requirement`, async ({ page, inspectorWorkspace: workspace }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.addInitScript(() => {
      const state = window as unknown as { noticeTexts: string[] };
      state.noticeTexts = [];
      document.addEventListener("DOMContentLoaded", () => new MutationObserver(() => {
        for (const notice of document.querySelectorAll(".toast--error")) state.noticeTexts.push(notice.textContent ?? "");
      }).observe(document.body, { childList: true, subtree: true }));
    });
    await open(page, workspace);
    let release!: () => void;
    let intercepted!: () => void;
    const ready = new Promise<void>((resolve) => { intercepted = resolve; });
    const held = new Promise<void>((resolve) => { release = resolve; });
    const endpoint = `/api/workspaces/${workspace.id}/${action === "task" ? "tasks" : "evidence"}`;
    const message = `Previous requirement ${action} failed`;
    await page.route(`**${endpoint}`, async (route) => {
      if (route.request().method() !== "POST") return route.continue();
      intercepted();
      await held;
      await route.fulfill({ status: 503, json: { error: message } });
    });
    const draft = async (title: string) => {
      await inspector(page).getByRole("tab", { name: action === "task" ? /^Tasks/ : /^Evidence/ }).click();
      if (action === "task") await inspector(page).getByLabel("Task title", { exact: true }).fill(title);
      else {
        await inspector(page).getByRole("button", { name: "Add evidence", exact: true }).click();
        await page.getByRole("dialog").getByLabel("Title", { exact: true }).fill(title);
      }
    };
    await draft("Pending requirement A draft");
    if (action === "task") await inspector(page).getByRole("button", { name: "Add task", exact: true }).click();
    else await page.getByRole("dialog").getByRole("button", { name: "Add for review", exact: true }).click();
    await ready;
    await navigateInPlace(page, routeFor(workspace.slug, B));
    await expect(page.getByRole("complementary", { name: "PR.AA-02 details" })).toBeVisible();
    await draft("Fresh requirement B draft");
    const failed = page.waitForResponse((response) => response.request().method() === "POST" && new URL(response.url()).pathname === endpoint);
    release();
    const response = await failed;
    expect(response.status()).toBe(503);
    await response.finished();
    await page.evaluate(async () => { await new Promise(requestAnimationFrame); await new Promise(requestAnimationFrame); });
    const notices = await page.evaluate(() => (window as unknown as { noticeTexts: string[] }).noticeTexts);
    expect(notices.some((text) => text.includes(message))).toBe(false);
    if (action === "task") await expect(inspector(page).getByLabel("Task title", { exact: true })).toHaveValue("Fresh requirement B draft");
    else await expect(page.getByRole("dialog").getByLabel("Title", { exact: true })).toHaveValue("Fresh requirement B draft");
  });
}

for (const persona of [
  { role: "viewer", email: "jordan.park@northwind-health.example", write: false, approve: false },
  { role: "auditor", email: "alex.kim@audit-partners.example", write: false, approve: false },
  { role: "contributor", email: "sam.ortiz@northwind-health.example", write: true, approve: false },
  { role: "approver", email: "priya.shah@northwind-health.example", write: true, approve: true },
]) {
  test(`${persona.role} inspector offers exactly its assessment, task and evidence capabilities`, async ({ page, inspectorWorkspace: workspace }) => {
    await signIn(page, persona.email);
    const writes: string[] = [];
    page.on("request", (request) => {
      if (request.url().includes(`/api/workspaces/${workspace.id}/`) && ["POST", "PATCH", "PUT", "DELETE"].includes(request.method())) writes.push(request.url());
    });
    await open(page, workspace);
    await expect(inspector(page).getByLabel("Owner", { exact: true })).toHaveValue(OWNER_A);
    const level = inspector(page).getByRole("radiogroup", { name: "Current level", exact: true }).getByRole("radio").first();
    if (persona.write) {
      await expect(inspector(page).getByLabel("Owner", { exact: true })).toBeEnabled();
      await expect(inspector(page).getByRole("combobox", { name: "Priority", exact: true })).toBeEnabled();
      await expect(level).toBeEnabled();
    } else {
      await expect(inspector(page).getByLabel("Owner", { exact: true })).toBeDisabled();
      await expect(inspector(page).getByRole("combobox", { name: "Priority", exact: true })).toBeDisabled();
      await expect(level).toBeDisabled();
    }
    await expect(inspector(page).getByRole("button", { name: "Save owner", exact: true })).toHaveCount(persona.write ? 1 : 0);
    await expect(inspector(page).getByRole("button", { name: "Mark not applicable…", exact: true })).toHaveCount(persona.approve ? 1 : 0);
    await expect(inspector(page).getByRole("button", { name: "Mark verified", exact: true })).toHaveCount(persona.approve ? 1 : 0);
    await expect(inspector(page).getByRole("button", { name: "Assess", exact: true })).toHaveCount(persona.write ? 1 : 0);
    await inspector(page).getByRole("tab", { name: /^Tasks/ }).click();
    await expect(inspector(page)).toContainText(TASK);
    await expect(inspector(page).getByRole("button", { name: "Execute", exact: true })).toHaveCount(persona.write ? 1 : 0);
    await expect(inspector(page).getByRole("button", { name: "Add task", exact: true })).toHaveCount(persona.write ? 1 : 0);
    await inspector(page).getByRole("tab", { name: /^Evidence/ }).click();
    await expect(inspector(page)).toContainText(EVIDENCE);
    await expect(inspector(page).getByRole("button", { name: "Add evidence", exact: true })).toHaveCount(persona.write ? 1 : 0);
    expect(writes).toEqual([]);
  });
}
