import { randomUUID } from "node:crypto";
import { expect, test as base, type Page } from "@playwright/test";

const OWNER = "morgan.lee@northwind-health.example";
const NODE = "nist-csf-2.0:PR.AA-01";
type Workspace = { id: string; slug: string; csrf: string };

async function signIn(page: Page, email = OWNER) {
  const session = await (await page.request.get("/api/auth/me")).json() as { csrf?: string } | null;
  const response = await page.request.post("/api/auth/dev/login", { data: { email }, headers: session?.csrf ? { "x-visua-csrf": session.csrf } : undefined });
  expect(response.ok(), await response.text()).toBe(true);
  return ((await response.json()) as { csrf: string }).csrf;
}

const test = base.extend<{ workspace: Workspace }>({
  workspace: async ({ page }, use) => {
    const csrf = await signIn(page);
    const response = await page.request.post("/api/workspaces", {
      headers: { "x-visua-csrf": csrf },
      data: { name: `Workspace recovery ${randomUUID()}`, frameworks: ["nist-csf-2.0"], planInitialTasks: false, profile: { industry: "healthcare", size: "51-200" } },
    });
    expect(response.status(), await response.text()).toBe(201);
    const { workspace } = await response.json() as { workspace: { id: string; slug: string } };
    expect(workspace.id).not.toBe(workspace.slug);
    await use({ ...workspace, csrf });
    const cleanupCsrf = await signIn(page);
    const removed = await page.request.delete(`/api/workspaces/${workspace.id}`, { headers: { "x-visua-csrf": cleanupCsrf } });
    expect(removed.ok(), await removed.text()).toBe(true);
  },
});

for (const failure of ["workspace", "metadata", "session"] as const) {
  test(`${failure} failures retain the deep link and Retry restores the selected requirement`, async ({ page, workspace }) => {
    let failing = true;
    const endpoint = failure === "workspace" ? `/api/workspaces/${workspace.slug}` : failure === "metadata" ? "/api/meta" : "/api/auth/me";
    await page.route(`**${endpoint}`, async (route) => {
      if (failing) await route.fulfill({ status: 503, json: { error: `Temporary ${failure} failure` } });
      else await route.continue();
    });
    const path = `/w/${workspace.slug}/observatory/nist-csf-2.0?select=${encodeURIComponent(NODE)}`;
    await page.goto(path);
    await expect(page.getByRole("alert")).toContainText(`Temporary ${failure} failure`);
    expect(new URL(page.url()).pathname + new URL(page.url()).search).toBe(path);
    failing = false;
    await page.getByRole("button", { name: "Retry", exact: true }).click();
    await expect(page.getByRole("complementary", { name: "PR.AA-01 details" })).toBeVisible();
    expect(new URL(page.url()).pathname).toBe(`/w/${workspace.slug}/observatory/nist-csf-2.0`);
  });
}

test("workspace list errors and unknown destinations remain visible and recoverable", async ({ page }) => {
  await signIn(page);
  let failing = true;
  await page.route("**/api/workspaces", async (route) => {
    if (failing) await route.fulfill({ status: 503, json: { error: "Workspace list unavailable" } });
    else await route.continue();
  });
  await page.goto("/");
  await expect(page.getByRole("alert")).toContainText("Workspace list unavailable");
  expect(new URL(page.url()).pathname).toBe("/");
  failing = false;
  await page.getByRole("button", { name: "Retry", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Northwind Health" })).toBeVisible();
  await page.goto("/w/northwind-health/unavailable-destination?keep=this");
  await expect(page.getByRole("alert")).toContainText("Page not found");
  expect(new URL(page.url()).pathname + new URL(page.url()).search).toBe("/w/northwind-health/unavailable-destination?keep=this");
});

test("slug routes share canonical task writes, live events and the id route cache", async ({ page, workspace }) => {
  const readPaths: string[] = [];
  page.on("request", (request) => {
    if (request.method() === "GET" && /\/tasks$|\/events$/.test(new URL(request.url()).pathname)) readPaths.push(new URL(request.url()).pathname);
  });
  await page.goto(`/w/${workspace.slug}/plan`);
  await expect(page.getByRole("heading", { name: "Action plan", exact: true })).toBeVisible();
  await page.getByRole("textbox", { name: "Task title", exact: true }).fill("Local canonical task");
  const created = page.waitForResponse((response) => response.request().method() === "POST" && response.url().endsWith("/tasks"));
  await page.getByRole("button", { name: "Add task", exact: true }).click();
  const local = await created;
  expect(new URL(local.url()).pathname).toBe(`/api/workspaces/${workspace.id}/tasks`);
  expect(local.status()).toBe(201);
  await expect(page.locator(".card").filter({ hasText: "Local canonical task" })).toBeVisible();
  const remote = await page.request.post(`/api/workspaces/${workspace.id}/tasks`, { headers: { "x-visua-csrf": workspace.csrf }, data: { title: "Remote live event task", status: "todo" } });
  expect(remote.status()).toBe(201);
  await expect(page.locator(".card").filter({ hasText: "Remote live event task" })).toBeVisible();
  expect(readPaths).toContain(`/api/workspaces/${workspace.id}/events`);
  expect(readPaths.every((path) => path.includes(`/workspaces/${workspace.id}/`))).toBe(true);
  await page.evaluate((path) => { history.pushState({}, "", path); window.dispatchEvent(new PopStateEvent("popstate")); }, `/w/${workspace.id}/plan`);
  await expect(page.locator(".card").filter({ hasText: "Remote live event task" })).toBeVisible();
  await expect(page).toHaveURL(new RegExp(`/w/${workspace.id}/plan$`));
  expect(readPaths.every((path) => path.includes(`/workspaces/${workspace.id}/`))).toBe(true);
});

test("reconnecting events refresh changes missed while disconnected", async ({ page, workspace }) => {
  await page.addInitScript(() => {
    class TestEventSource extends EventTarget {
      url: string;
      constructor(url: string) { super(); this.url = url; (window as unknown as { sources: TestEventSource[] }).sources.push(this); }
      close() { (window as unknown as { sources: TestEventSource[] }).sources = (window as unknown as { sources: TestEventSource[] }).sources.filter((source) => source !== this); }
    }
    (window as unknown as { sources: TestEventSource[] }).sources = [];
    window.EventSource = TestEventSource as unknown as typeof EventSource;
  });
  await page.goto(`/w/${workspace.slug}/plan`);
  await expect(page.getByRole("heading", { name: "Action plan", exact: true })).toBeVisible();
  const response = await page.request.post(`/api/workspaces/${workspace.id}/tasks`, { headers: { "x-visua-csrf": workspace.csrf }, data: { title: "Task created during the event gap", status: "todo" } });
  expect(response.status()).toBe(201);
  await expect(page.locator(".card").filter({ hasText: "Task created during the event gap" })).toHaveCount(0);
  await page.evaluate(() => {
    for (const source of (window as unknown as { sources: EventTarget[] }).sources) source.dispatchEvent(new Event("open"));
  });
  await expect(page.locator(".card").filter({ hasText: "Task created during the event gap" })).toBeVisible();
});

for (const email of ["jordan.park@northwind-health.example", "alex.kim@audit-partners.example"]) {
  test(`${email.split("@")[0]} can search and read official passages without agent actions`, async ({ page, workspace }) => {
    await signIn(page, email);
    const writes: string[] = [];
    page.on("request", (request) => { if (request.method() === "POST" && request.url().includes("/runs")) writes.push(request.url()); });
    await page.route("**/api/search?*", (route) => route.fulfill({ json: { nodes: [], passages: [{ documentId: "official-fixture", documentTitle: "Official identity guidance", page: 7, quote: "Review identities and credentials for authorized users.", score: 1 }] } }));
    await page.goto(`/w/${workspace.slug}/plan`);
    await page.getByRole("button", { name: "Search requirements", exact: true }).click();
    const palette = page.getByRole("dialog", { name: "Command palette" });
    await expect(palette).not.toContainText("Run an agent");
    await expect(palette).not.toContainText("New workspace");
    await palette.getByRole("combobox", { name: "Search requirements and commands" }).fill("identity");
    await expect(palette).not.toContainText("Ask the copilot:");
    await palette.getByRole("option").filter({ hasText: "Official identity guidance" }).click();
    await expect(palette.getByRole("region", { name: "Official passage" })).toContainText("Review identities and credentials for authorized users.");
    expect(writes).toEqual([]);
  });
}

test("copilot failures are visible and use canonical workspace identity", async ({ page, workspace }) => {
  await signIn(page, "sam.ortiz@northwind-health.example");
  let attempted = "";
  await page.route("**/api/workspaces/*/runs", async (route) => {
    if (route.request().method() !== "POST") return route.continue();
    attempted = new URL(route.request().url()).pathname;
    await route.fulfill({ status: 503, json: { error: "Copilot temporarily unavailable" } });
  });
  await page.goto(`/w/${workspace.slug}/plan`);
  await page.getByRole("button", { name: "Search or ask the copilot", exact: true }).click();
  const palette = page.getByRole("dialog", { name: "Command palette" });
  await palette.getByRole("combobox", { name: "Search requirements and commands" }).fill("Review identity gaps");
  await palette.getByRole("option").filter({ hasText: "Ask the copilot:" }).click();
  await expect(page.getByText("Copilot temporarily unavailable", { exact: true })).toBeVisible();
  expect(attempted).toBe(`/api/workspaces/${workspace.id}/runs`);
  expect(new URL(page.url()).pathname).toBe(`/w/${workspace.slug}/plan`);
});

for (const action of ["task", "plan"] as const) test(`${action} failures show one error and preserve the task draft`, async ({ page, workspace }) => {
  await page.route(`**/api/workspaces/*/${action === "task" ? "tasks" : "plan"}`, (route) => route.request().method() === "POST"
    ? route.fulfill({ status: 503, json: { error: "Task service temporarily unavailable" } }) : route.continue());
  await page.goto(`/w/${workspace.slug}/plan`);
  await page.getByRole("textbox", { name: "Task title", exact: true }).fill("Preserved task draft");
  await page.getByRole("button", { name: action === "task" ? "Add task" : "Generate plan", exact: true }).click();
  await expect(page.locator(".toast--error").first()).toContainText("Task service temporarily unavailable");
  await expect(page.locator(".toast--error")).toHaveCount(1);
  await expect(page.getByRole("textbox", { name: "Task title", exact: true })).toHaveValue("Preserved task draft");
});

test("live agent activity stays within its workspace and signed-in session", async ({ page, workspace }) => {
  await page.addInitScript(() => {
    class TestEventSource extends EventTarget {
      url: string;
      constructor(url: string) { super(); this.url = url; (window as unknown as { sources: TestEventSource[] }).sources.push(this); }
      close() { (window as unknown as { sources: TestEventSource[] }).sources = (window as unknown as { sources: TestEventSource[] }).sources.filter((source) => source !== this); }
    }
    (window as unknown as { sources: TestEventSource[] }).sources = [];
    window.EventSource = TestEventSource as unknown as typeof EventSource;
  });
  const send = async (title: string) => page.evaluate((title) => {
    const sources = (window as unknown as { sources: EventTarget[] }).sources;
    for (const source of sources) {
      source.dispatchEvent(new MessageEvent("visua", { data: JSON.stringify({ type: "agent.run.updated", data: { id: "private-run", agent: "copilot", status: "running" } }) }));
      source.dispatchEvent(new MessageEvent("visua", { data: JSON.stringify({ type: "agent.step", data: { runId: "private-run", agent: "copilot", step: { type: "thinking", title, nodeIds: ["nist-csf-2.0:PR.AA-01"] } } }) }));
    }
  }, title);
  await page.goto(`/w/${workspace.slug}/plan`);
  await expect(page.getByRole("heading", { name: "Action plan", exact: true })).toBeVisible();
  await send("Private first workspace activity");
  await expect(page.locator(".topbar__pulse")).toContainText("Private first workspace activity");
  await page.evaluate(() => {
    const state = window as unknown as { sources: EventTarget[]; previousSource: EventTarget };
    state.previousSource = state.sources[0]!;
    history.pushState({}, "", "/w/northwind-health/plan");
    window.dispatchEvent(new PopStateEvent("popstate"));
  });
  await expect(page.getByRole("combobox", { name: "Workspace", exact: true })).toHaveValue("northwind-health");
  await expect(page.locator(".topbar__pulse")).toHaveCount(0);
  await page.evaluate(() => {
    (window as unknown as { previousSource: EventTarget }).previousSource.dispatchEvent(new MessageEvent("visua", { data: JSON.stringify({ type: "agent.step", data: { runId: "old-run", agent: "copilot", step: { type: "thinking", title: "Closed workspace activity" } } }) }));
  });
  await expect(page.locator(".topbar__pulse")).toHaveCount(0);
  await send("Private owner session activity");
  await expect(page.locator(".topbar__pulse")).toContainText("Private owner session activity");
  await page.getByRole("button", { name: /Account menu for/ }).click();
  await page.getByRole("menuitem", { name: "Sign out", exact: true }).click();
  await expect(page).toHaveURL(/\/login/);
  // Reenter using the public login form, retaining this tab's JavaScript stores.
  await page.getByRole("button", { name: /Jordan Park/ }).click();
  await expect(page.getByRole("combobox", { name: "Workspace", exact: true })).toBeVisible();
  await expect(page.locator(".topbar__pulse")).toHaveCount(0);
});
