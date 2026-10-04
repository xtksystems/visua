import { randomUUID } from "node:crypto";
import { expect, test as base, type Locator, type Page } from "@playwright/test";

const OWNER = "morgan.lee@northwind-health.example";
const READERS = ["jordan.park@northwind-health.example", "alex.kim@audit-partners.example"];
const REQUIREMENT = "nist-csf-2.0:PR.AA-01";
const CONTROL = "nist-sp-800-53-r5:AC-2";
const EVIDENCE = "Keyboard workflow artifact";
type Identity = { id: string; slug: string };

async function signIn(page: Page, email = OWNER) {
  const session = await (await page.request.get("/api/auth/me")).json() as { csrf?: string } | null;
  const response = await page.request.post("/api/auth/dev/login", { data: { email }, headers: session?.csrf ? { "x-visua-csrf": session.csrf } : undefined });
  expect(response.ok(), await response.text()).toBe(true);
  return ((await response.json()) as { csrf: string }).csrf;
}

const test = base.extend<{ keyboardWorkspace: Identity }>({
  keyboardWorkspace: async ({ page }, use) => {
    const csrf = await signIn(page);
    const response = await page.request.post("/api/workspaces", {
      headers: { "x-visua-csrf": csrf },
      data: { name: `Keyboard workflow ${randomUUID()}`, frameworks: ["nist-csf-2.0", "nist-sp-800-53-r5"], planInitialTasks: false, profile: { industry: "healthcare", size: "51-200" } },
    });
    expect(response.status(), await response.text()).toBe(201);
    const identity = ((await response.json()) as { workspace: Identity }).workspace;
    expect(identity.id).not.toBe(identity.slug);
    const evidence = await page.request.post(`/api/workspaces/${identity.id}/evidence`, {
      headers: { "x-visua-csrf": csrf },
      data: { title: EVIDENCE, content: "Observed identity configuration", requirementIds: [REQUIREMENT, CONTROL] },
    });
    expect(evidence.status(), await evidence.text()).toBe(201);
    await use(identity);
    const cleanupCsrf = await signIn(page);
    const removed = await page.request.delete(`/api/workspaces/${identity.id}`, { headers: { "x-visua-csrf": cleanupCsrf } });
    expect(removed.ok(), await removed.text()).toBe(true);
  },
});

async function openRequirement(page: Page, workspace: Identity) {
  await page.goto(`/w/${workspace.slug}/observatory/nist-csf-2.0?select=${encodeURIComponent(REQUIREMENT)}`);
  const inspector = page.getByRole("complementary", { name: "PR.AA-01 details", exact: true });
  await expect(inspector).toBeVisible();
  return inspector;
}

async function expectAssociations(page: Page, tablist: Locator) {
  const tabs = tablist.getByRole("tab");
  await expect(tabs.first()).toBeVisible();
  expect(await tabs.count()).toBeGreaterThan(0);
  await expect(tablist.locator('[role="tab"][tabindex="0"]')).toHaveCount(1);
  const ids: string[] = [];
  for (const tab of await tabs.all()) {
    const id = await tab.getAttribute("id");
    const controls = await tab.getAttribute("aria-controls");
    expect(id).toBeTruthy();
    expect(controls).toBeTruthy();
    ids.push(id!);
    const panel = page.locator(`[id="${controls}"]`);
    await expect(panel).toHaveAttribute("role", "tabpanel");
    await expect(panel).toHaveAttribute("aria-labelledby", id!);
    if (await tab.getAttribute("aria-selected") === "true") await expect(panel).toBeVisible();
    else await expect(panel).toBeHidden();
  }
  expect(new Set(ids).size).toBe(ids.length);
}

test("scope dialog traps both Tab directions, retains typing focus and restores its trigger", async ({ page, keyboardWorkspace: workspace }) => {
  const inspector = await openRequirement(page, workspace);
  const trigger = inspector.getByRole("button", { name: "Mark not applicable…", exact: true });
  await trigger.focus();
  await trigger.press("Enter");
  const dialog = page.getByRole("dialog", { name: "Mark PR.AA-01 not applicable", exact: true });
  const close = dialog.getByRole("button", { name: "Close", exact: true });
  await expect(close).toBeFocused();
  // The disabled decision is skipped; Shift+Tab wraps to Cancel.
  await close.press("Shift+Tab");
  await expect(dialog.getByRole("button", { name: "Cancel", exact: true })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(close).toBeFocused();
  const rationale = dialog.getByRole("textbox", { name: "Rationale (visible to auditors)" });
  await rationale.fill("This draft belongs to the open decision dialog.");
  await expect(rationale).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(close).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(dialog.getByRole("button", { name: "Record decision", exact: true })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(close).toBeFocused();
  await rationale.focus();
  await rationale.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(trigger).toBeFocused();
  await expect(inspector).toBeVisible();
  expect(new URL(page.url()).searchParams.get("select")).toBe(REQUIREMENT);
});

test("evidence dialog keeps focus through callback rerenders and restores Add evidence", async ({ page, keyboardWorkspace: workspace }) => {
  const inspector = await openRequirement(page, workspace);
  await inspector.getByRole("tab", { name: /^Evidence/ }).click();
  const trigger = inspector.getByRole("button", { name: "Add evidence", exact: true });
  await trigger.click();
  const dialog = page.getByRole("dialog", { name: "Add evidence for PR.AA-01", exact: true });
  await expect(dialog.getByRole("button", { name: "Close", exact: true })).toBeFocused();
  const title = dialog.getByRole("textbox", { name: "Title", exact: true });
  await title.fill("An unsaved artifact title");
  await expect(title).toBeFocused();
  const content = dialog.getByRole("textbox", { name: "Content or reference", exact: true });
  await content.fill("A draft that must retain keyboard focus on each change.");
  await expect(content).toBeFocused();
  await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect(trigger).toBeFocused();
});

test("requirement tabs activate with wrapping arrows, Home and End, then Tab reaches the selected panel", async ({ page, keyboardWorkspace: workspace }) => {
  const inspector = await openRequirement(page, workspace);
  const tablist = inspector.getByRole("tablist", { name: "Requirement details", exact: true });
  const overview = tablist.getByRole("tab", { name: "Overview", exact: true });
  const history = tablist.getByRole("tab", { name: "History", exact: true });
  const tasks = tablist.getByRole("tab", { name: /^Tasks/ });
  await expectAssociations(page, tablist);
  await overview.focus();
  await overview.press("ArrowLeft");
  await expect(history).toBeFocused();
  await expect(history).toHaveAttribute("aria-selected", "true");
  await history.press("ArrowRight");
  await expect(overview).toBeFocused();
  await overview.press("End");
  await expect(history).toBeFocused();
  await history.press("Home");
  await expect(overview).toBeFocused();
  await overview.press("ArrowRight");
  await expect(tasks).toBeFocused();
  await expectAssociations(page, tablist);
  await tasks.press("Tab");
  await expect(inspector.getByRole("tabpanel", { name: /^Tasks/ })).toBeFocused();
  await expect(inspector).toBeVisible();
  expect(new URL(page.url()).searchParams.get("select")).toBe(REQUIREMENT);
});

test("organization tabs expose labeled panels and one keyboard tab stop", async ({ page, keyboardWorkspace: workspace }) => {
  await page.goto(`/w/${workspace.slug}/organization`);
  const tablist = page.getByRole("tablist", { name: "Organization settings", exact: true });
  await expectAssociations(page, tablist);
  const members = tablist.getByRole("tab", { name: "Members", exact: true });
  const audit = tablist.getByRole("tab", { name: "Audit trail", exact: true });
  await members.focus();
  await members.press("End");
  await expect(audit).toBeFocused();
  await expect(audit).toHaveAttribute("aria-selected", "true");
  await audit.press("ArrowRight");
  await expect(members).toBeFocused();
  await expectAssociations(page, tablist);
  await members.press("Tab");
  await expect(page.getByRole("tabpanel", { name: "Members", exact: true })).toBeFocused();
});

test("threat tabs activate their linked panels from the keyboard", async ({ page, keyboardWorkspace: workspace }) => {
  const meta = await (await page.request.get("/api/meta")).json() as { frameworks: { id: string }[] };
  test.skip(!meta.frameworks.some((framework) => framework.id === "mitre-atlas"), "MITRE ATLAS catalog is unavailable");
  await page.goto(`/w/${workspace.slug}/threats/mitre-atlas?select=${encodeURIComponent("mitre-atlas:AML.T0051")}`);
  const tablist = page.getByRole("tablist", { name: "Threat details", exact: true });
  await expectAssociations(page, tablist);
  const overview = tablist.getByRole("tab", { name: "Overview", exact: true });
  const related = tablist.getByRole("tab", { name: /^Related threats/ });
  await overview.focus();
  await overview.press("ArrowLeft");
  await expect(related).toBeFocused();
  await expect(related).toHaveAttribute("aria-selected", "true");
  await related.press("Home");
  await expect(overview).toBeFocused();
  await expectAssociations(page, tablist);
});

test("agent activity tabs wrap and preserve the launcher draft without starting a run", async ({ page, keyboardWorkspace: workspace }) => {
  const writes: string[] = [];
  page.on("request", (request) => {
    if (!["GET", "HEAD", "OPTIONS"].includes(request.method()) && /\/api\/workspaces\//.test(request.url())) writes.push(request.url());
  });
  await page.goto(`/w/${workspace.slug}/agents`);
  const goal = page.getByRole("textbox", { name: "Goal", exact: true });
  await goal.fill("Keep this launcher draft while browsing the approvals inbox.");
  const tablist = page.getByRole("tablist", { name: "Agent activity", exact: true });
  const runs = tablist.getByRole("tab", { name: /^Runs/ });
  const inbox = tablist.getByRole("tab", { name: /^Approvals inbox/ });
  await expectAssociations(page, tablist);
  await runs.focus();
  await runs.press("ArrowLeft");
  await expect(inbox).toBeFocused();
  await expect(inbox).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("tabpanel", { name: /^Approvals inbox/ })).toContainText("Inbox zero");
  await inbox.press("Tab");
  await expect(page.getByRole("tabpanel", { name: /^Approvals inbox/ })).toBeFocused();
  await inbox.focus();
  await inbox.press("ArrowRight");
  await expect(runs).toBeFocused();
  await runs.press("End");
  await expect(inbox).toBeFocused();
  await inbox.press("Home");
  await expect(runs).toBeFocused();
  await expectAssociations(page, tablist);
  await expect(goal).toHaveValue("Keep this launcher draft while browsing the approvals inbox.");
  expect(writes).toEqual([]);
});

test("RMF lifecycle cards have one tab stop and keyboard-selected task panels", async ({ page, keyboardWorkspace: workspace }) => {
  await page.goto(`/w/${workspace.slug}/rmf`);
  const tablist = page.getByRole("tablist", { name: "RMF steps", exact: true });
  await expectAssociations(page, tablist);
  const tabs = tablist.getByRole("tab");
  await expect(tabs).toHaveCount(7);
  const first = tabs.first();
  const last = tabs.last();
  await first.focus();
  await first.press("End");
  await expect(last).toBeFocused();
  await expect(last).toHaveAttribute("aria-selected", "true");
  await expectAssociations(page, tablist);
  await last.press("ArrowRight");
  await expect(first).toBeFocused();
  await first.press("ArrowLeft");
  await expect(last).toBeFocused();
  await last.press("Home");
  await expect(first).toBeFocused();
  await first.press("Tab");
  const panelId = await first.getAttribute("aria-controls");
  const panel = page.locator(`[id="${panelId}"]`);
  await expect(panel).toBeFocused();
  await expect(panel.getByRole("link").first()).toHaveAttribute("href", new RegExp(`/w/${workspace.id}/observatory/nist-rmf\\?select=`));
  await expectAssociations(page, tablist);
});

test("threat catalog keyboard changes clear the inspector and stale controls during loading", async ({ page, keyboardWorkspace: workspace }) => {
  const meta = await (await page.request.get("/api/meta")).json() as { frameworks: { id: string }[] };
  test.skip(!meta.frameworks.some((framework) => framework.id === "mitre-atlas"), "MITRE ATLAS catalog is unavailable");
  await page.goto(`/w/${workspace.slug}/threats/mitre-atlas?select=${encodeURIComponent("mitre-atlas:AML.T0051")}`);
  await expect(page.locator("aside.inspector")).toBeVisible();
  const tablist = page.getByRole("tablist", { name: "Threat catalogs", exact: true });
  await expectAssociations(page, tablist);
  const tabs = tablist.getByRole("tab");
  expect(await tabs.count()).toBeGreaterThan(1);
  const first = tabs.first();
  const next = tabs.nth(1);
  const catalog = (await next.getAttribute("id"))!.split("-tab-")[1]!;
  let release!: () => void;
  let intercepted!: () => void;
  const held = new Promise<void>((resolve) => { release = resolve; });
  const ready = new Promise<void>((resolve) => { intercepted = resolve; });
  await page.route(`**/api/workspaces/${workspace.id}/threats/${catalog}?*`, async (route) => {
    intercepted();
    await held;
    await route.continue();
  });
  try {
    await first.focus();
    await first.press("ArrowRight");
    await ready;
    await expect(next).toBeFocused();
    await expect(next).toHaveAttribute("aria-selected", "true");
    expect(new URL(page.url()).pathname).toBe(`/w/${workspace.slug}/threats/${catalog}`);
    expect(new URL(page.url()).searchParams.has("select")).toBe(false);
    await expect(page.locator("aside.inspector")).toHaveCount(0);
    await expect(page.locator(".atlas-cell")).toHaveCount(0);
    const panelId = await next.getAttribute("aria-controls");
    const panel = page.locator(`[id="${panelId}"]`);
    await expect(panel.getByText(/^Loading .+…$/)).toBeVisible();
    await expectAssociations(page, tablist);
    await next.press("Tab");
    await expect(panel).toBeFocused();
    release();
    await expect(panel.getByText(/^Loading .+…$/)).toHaveCount(0);
    await next.focus();
    await next.press("End");
    await expect(tabs.last()).toBeFocused();
    await expect(tabs.last()).toHaveAttribute("aria-selected", "true");
    await tabs.last().press("ArrowRight");
    await expect(first).toBeFocused();
    await expect(first).toHaveAttribute("aria-selected", "true");
    await first.press("End");
    await tabs.last().press("Home");
    await expect(first).toBeFocused();
    await expect(first).toHaveAttribute("aria-selected", "true");
    await expectAssociations(page, tablist);
  } finally {
    release();
  }
});

for (const email of READERS) {
  test(`${email.split("@")[0]} can follow requirement links from the read-only evidence dialog without writes`, async ({ page, keyboardWorkspace: workspace }) => {
    await signIn(page, email);
    const writes: string[] = [];
    page.on("request", (request) => {
      if (!["GET", "HEAD", "OPTIONS"].includes(request.method()) && /\/api\/(workspaces|tenants)\//.test(request.url())) writes.push(request.url());
    });
    await page.goto(`/w/${workspace.slug}/evidence`);
    const row = page.getByRole("row").filter({ hasText: EVIDENCE });
    await expect(row.getByRole("link", { name: "PR.AA-01", exact: true })).toHaveAttribute("href", `/w/${workspace.id}/observatory/nist-csf-2.0?select=${encodeURIComponent(REQUIREMENT)}`);
    const trigger = row.getByRole("button", { name: EVIDENCE, exact: true });
    await trigger.press("Enter");
    const dialog = page.getByRole("dialog", { name: EVIDENCE, exact: true });
    const close = dialog.getByRole("button", { name: "Close", exact: true });
    const control = dialog.getByRole("link", { name: "AC-2", exact: true });
    await expect(close).toBeFocused();
    await expect(dialog.getByRole("button", { name: /^(Accept|Reject)$/ })).toHaveCount(0);
    await expect(control).toBeVisible();
    await close.press("Shift+Tab");
    await expect(control).toBeFocused();
    await control.press("Escape");
    await expect(dialog).toHaveCount(0);
    await expect(trigger).toBeFocused();
    await trigger.press("Enter");
    await expect(dialog.getByRole("button", { name: "Close", exact: true })).toBeFocused();
    await control.press("Enter");
    await expect(page.getByRole("complementary", { name: "AC-2 details", exact: true })).toBeVisible();
    expect(new URL(page.url()).pathname).toBe(`/w/${workspace.id}/observatory/nist-sp-800-53-r5`);
    expect(new URL(page.url()).searchParams.get("select")).toBe(CONTROL);
    await expect(dialog).toHaveCount(0);
    await expect(page.getByRole("tab", { name: "Overview", exact: true })).toBeVisible();
    expect(writes).toEqual([]);
  });
}
