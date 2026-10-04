import { createHash, randomUUID } from "node:crypto";
import { expect, test as base, type Page } from "@playwright/test";

const A = "nist-csf-2.0:PR.AA-01";
const B = "nist-csf-2.0:PR.AA-02";
const PARENT = "nist-csf-2.0:PR.AA";
const ROOT = "nist-csf-2.0:PR";
const OTHER = "nist-csf-2.0:ID.AM-01";
const OWNER_A = "Identity team";
const OWNER_B = "Access team";
type Workspace = { id: string; slug: string };

async function signIn(page: Page) {
  const session = await (await page.request.get("/api/auth/me")).json() as { csrf?: string } | null;
  const response = await page.request.post("/api/auth/dev/login", {
    data: { email: "morgan.lee@northwind-health.example" },
    headers: session?.csrf ? { "x-visua-csrf": session.csrf } : undefined,
  });
  expect(response.ok(), await response.text()).toBe(true);
  return ((await response.json()) as { csrf: string }).csrf;
}

const test = base.extend<{ keyboardWorkspace: Workspace }>({
  keyboardWorkspace: async ({ page }, use) => {
    const csrf = await signIn(page);
    const headers = { "x-visua-csrf": csrf };
    const response = await page.request.post("/api/workspaces", {
      headers,
      data: { name: `Keyboard outline ${randomUUID()}`, profile: { industry: "healthcare", size: "51-200" }, frameworks: ["nist-csf-2.0"] },
    });
    expect(response.status(), await response.text()).toBe(201);
    const workspace = ((await response.json()) as { workspace: Workspace }).workspace;
    expect(workspace.id).not.toBe(workspace.slug);
    for (const [nodeId, owner] of [[A, OWNER_A], [B, OWNER_B]] as const) {
      const updated = await page.request.patch(`/api/workspaces/${workspace.id}/requirements/${encodeURIComponent(nodeId)}`, { headers, data: { owner, current: 1, target: 1 } });
      expect(updated.status(), await updated.text()).toBe(200);
    }
    await use(workspace);
    const cleanupCsrf = await signIn(page);
    const removed = await page.request.delete(`/api/workspaces/${workspace.id}`, { headers: { "x-visua-csrf": cleanupCsrf } });
    expect(removed.ok(), await removed.text()).toBe(true);
  },
});

const routeFor = (workspace: Workspace, nodeId = A) => `/w/${workspace.slug}/observatory/nist-csf-2.0?select=${encodeURIComponent(nodeId)}`;
const tree = (page: Page) => page.getByRole("tree", { name: "Framework outline" });
const row = (page: Page, nodeId: string) => tree(page).locator(`[role="treeitem"][data-node-id="${nodeId}"]`);
const inspector = (page: Page) => page.locator("aside.inspector");
const filter = (page: Page) => page.getByRole("textbox", { name: "Filter outline" });

async function open(page: Page, workspace: Workspace) {
  await page.goto(routeFor(workspace));
  await expect(page.getByRole("complementary", { name: "PR.AA-01 details" })).toBeVisible();
  await expect(row(page, A)).toBeVisible();
}

async function expectSelection(page: Page, nodeId: string) {
  await expect(row(page, nodeId)).toHaveAttribute("aria-selected", "true");
  await expect(page).toHaveURL(new RegExp(`select=${encodeURIComponent(nodeId)}`));
  await expect(tree(page).locator('[role="treeitem"][tabindex="0"]')).toHaveCount(1);
}

async function navigateInPlace(page: Page, destination: string) {
  await page.evaluate((path) => {
    history.pushState({}, "", path);
    window.dispatchEvent(new PopStateEvent("popstate"));
  }, destination);
}

test("outline has one named tab stop and focus follows siblings, children, parents and mouse selection", async ({ page, keyboardWorkspace: workspace }) => {
  await open(page, workspace);
  await expect(tree(page).getByRole("treeitem", { name: /^PR\.AA-01 / })).toHaveAttribute("aria-level", "3");
  await expect(row(page, PARENT)).toHaveAttribute("aria-expanded", "true");
  await expect(tree(page).locator("button:not([tabindex='-1'])")).toHaveCount(0);
  await filter(page).focus();
  await filter(page).press("Tab");
  await expect(row(page, A)).toBeFocused();
  await row(page, A).press("ArrowDown");
  await expectSelection(page, B);
  await expect(row(page, B)).toBeFocused();
  await row(page, B).press("ArrowLeft");
  await expectSelection(page, A);
  await expect(row(page, A)).toBeFocused();
  await row(page, A).press("Backspace");
  await expectSelection(page, PARENT);
  await expect(row(page, PARENT)).toBeFocused();
  await row(page, PARENT).press("Enter");
  await expectSelection(page, A);
  await expect(row(page, A)).toBeFocused();
  await row(page, A).press("Escape");
  await row(page, PARENT).press("Escape");
  await expectSelection(page, ROOT);
  await expect(row(page, ROOT)).toBeFocused();
  await row(page, ROOT).press("ArrowRight");
  await expectSelection(page, "nist-csf-2.0:DE");
  await expect(row(page, "nist-csf-2.0:DE")).toBeFocused();
  await row(page, B).locator(":scope > .outline__row").click();
  await expectSelection(page, B);
  await expect(row(page, B)).toBeFocused();
});

test("filter typing keeps selection and tree navigation stays among visible matches", async ({ page, keyboardWorkspace: workspace }) => {
  await open(page, workspace);
  await row(page, A).focus();
  await row(page, A).press("/");
  await expect(filter(page)).toBeFocused();
  await filter(page).fill("PR.AA-02");
  await expect(row(page, A)).toHaveCount(0);
  await expect(tree(page).getByRole("treeitem")).toHaveCount(3);
  await filter(page).press("ArrowDown");
  await expect(page).toHaveURL(new RegExp(`select=${encodeURIComponent(A)}`));
  await filter(page).press("Tab");
  await expect(row(page, ROOT)).toBeFocused();
  await row(page, ROOT).press("Enter");
  await expect(row(page, PARENT)).toBeFocused();
  await row(page, PARENT).press("Enter");
  await expectSelection(page, B);
  await expect(row(page, B)).toBeFocused();
  await row(page, B).press("ArrowDown");
  await expectSelection(page, B);
  await expect(row(page, B)).toBeFocused();
  await row(page, B).press("/");
  await filter(page).fill("no framework row matches this phrase");
  await expect(tree(page).getByRole("treeitem")).toHaveCount(0);
  await filter(page).press("Escape");
  await expect(page).toHaveURL(new RegExp(`select=${encodeURIComponent(B)}`));
  await expect(filter(page)).toBeFocused();
  await filter(page).fill("");
  await filter(page).press("Tab");
  await expect(row(page, B)).toBeFocused();
});

test("scope dialog Escape closes only the dialog and inspector, HUD and modified keys never steer the scene", async ({ page, keyboardWorkspace: workspace }) => {
  await open(page, workspace);
  const scopeTrigger = inspector(page).getByRole("button", { name: "Mark not applicable…", exact: true });
  await scopeTrigger.click();
  const dialog = page.getByRole("dialog", { name: "Mark PR.AA-01 not applicable" });
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Cancel", exact: true }).focus();
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expectSelection(page, A);
  await expect(scopeTrigger).toBeFocused();
  await scopeTrigger.press("ArrowRight");
  await expectSelection(page, A);
  const owner = inspector(page).getByRole("textbox", { name: "Owner", exact: true });
  await owner.focus();
  await owner.press("Escape");
  await owner.press("ArrowDown");
  await expectSelection(page, A);
  await expect(owner).toBeFocused();
  const viewButton = page.getByRole("button", { name: "Constellation", exact: true });
  await viewButton.focus();
  await viewButton.press("ArrowRight");
  await viewButton.press("l");
  await viewButton.press("/");
  await expectSelection(page, A);
  await expect(viewButton).toBeFocused();
  await expect(page.getByRole("button", { name: "Status lens", exact: true })).toBeVisible();
  await row(page, A).focus();
  await row(page, A).press("Control+ArrowDown");
  await row(page, A).press("Shift+ArrowDown");
  await expectSelection(page, A);
  // An earlier handler may claim the key before the scene receives it.
  await row(page, A).evaluate((element) => element.addEventListener("keydown", (event) => event.preventDefault(), { once: true }));
  await row(page, A).press("ArrowDown");
  await expectSelection(page, A);
  await row(page, A).press("ArrowDown");
  await expectSelection(page, B);
});

test("canvas receives tab and pointer focus while its HUD retains ordinary button behavior", async ({ page, keyboardWorkspace: workspace }) => {
  await open(page, workspace);
  const canvas = page.getByRole("region", { name: "Framework canvas" });
  await row(page, A).focus();
  await row(page, A).press("Tab");
  await expect(canvas).toBeFocused();
  await canvas.press("ArrowRight");
  await expectSelection(page, B);
  await expect(canvas).toBeFocused();
  await canvas.press("Backspace");
  await expectSelection(page, PARENT);
  await canvas.press("Enter");
  await expectSelection(page, A);
  await canvas.press("l");
  await expect(page.getByRole("button", { name: "Gap lens", exact: true })).toBeVisible();
  await canvas.press("f");
  await expectSelection(page, A);
  await expect(canvas).toBeFocused();
  await canvas.press("/");
  await expect(filter(page)).toBeFocused();
  await canvas.locator("canvas").click({ position: { x: 5, y: 5 } });
  await expect(canvas).toBeFocused();
  await canvas.press("ArrowRight");
  await expectSelection(page, "nist-csf-2.0:GV");
  const reset = page.getByRole("button", { name: "Reset view", exact: true });
  await reset.click();
  await expect(reset).toBeFocused();
  await expect(page).not.toHaveURL(/select=/);
  await reset.press("ArrowDown");
  await expect(page).not.toHaveURL(/select=/);
});

test("cached keyboard selections reset owner drafts and external deep links reveal rows without taking input focus", async ({ page, keyboardWorkspace: workspace }) => {
  await open(page, workspace);
  const owner = () => inspector(page).getByRole("textbox", { name: "Owner", exact: true });
  await expect(owner()).toHaveValue(OWNER_A);
  await owner().fill("Unsaved A owner");
  await row(page, A).focus();
  await row(page, A).press("ArrowDown");
  await expectSelection(page, B);
  await expect(owner()).toHaveValue(OWNER_B);
  await owner().fill("Unsaved B owner");
  await row(page, B).focus();
  await row(page, B).press("ArrowUp");
  await expectSelection(page, A);
  await expect(owner()).toHaveValue(OWNER_A);
  await owner().focus();
  await navigateInPlace(page, `${routeFor(workspace)}&source=keyboard-test`);
  await expect(owner()).toBeFocused();
  await filter(page).focus();
  await navigateInPlace(page, routeFor(workspace, OTHER));
  await expectSelection(page, OTHER);
  await expect(row(page, OTHER)).toBeVisible();
  await expect(row(page, "nist-csf-2.0:ID")).toHaveAttribute("aria-expanded", "true");
  await expect(row(page, "nist-csf-2.0:ID.AM")).toHaveAttribute("aria-expanded", "true");
  await expect(filter(page)).toBeFocused();
  await filter(page).press("Tab");
  await expect(row(page, OTHER)).toBeFocused();
  for (const [nodeId, expected] of [[A, OWNER_A], [B, OWNER_B]] as const) {
    const response = await page.request.get(`/api/workspaces/${workspace.id}/requirements/${encodeURIComponent(nodeId)}`);
    expect(response.ok()).toBe(true);
    expect(((await response.json()) as { state: { owner: string } }).state.owner).toBe(expected);
  }
});


test("F reframes the same selection after manual camera movement", async ({ page, keyboardWorkspace: workspace }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await open(page, workspace);
  const surface = page.getByRole("region", { name: "Framework canvas" });
  const raster = surface.locator("canvas");
  await expect(surface.locator('.scene-label--selected[data-shown="true"]')).toBeVisible();
  await page.mouse.move(1, 1);
  const frame = async () => {
    const data = await raster.evaluate(async (element) => {
      for (let i = 0; i < 8; i++) await new Promise(requestAnimationFrame);
      return (element as HTMLCanvasElement).toDataURL();
    });
    return createHash("sha256").update(data).digest("hex");
  };
  const framed = await frame();
  expect(await frame()).toBe(framed);
  const box = await raster.boundingBox();
  expect(box).not.toBeNull();
  await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height * 0.7);
  await page.mouse.wheel(0, 600);
  await page.mouse.move(1, 1);
  await expect.poll(frame).not.toBe(framed);
  await surface.focus();
  await page.keyboard.press("f");
  await expect.poll(frame).toBe(framed);
  await expectSelection(page, A);
  await expect(surface).toBeFocused();
});

test("returning to a cached selection preserves framing after an earlier F request", async ({ page, keyboardWorkspace: workspace }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await open(page, workspace);
  const surface = page.getByRole("region", { name: "Framework canvas" });
  const frame = async () => createHash("sha256").update(await surface.locator("canvas").evaluate(async element => {
    for (let i = 0; i < 8; i++) await new Promise(requestAnimationFrame);
    return (element as HTMLCanvasElement).toDataURL();
  })).digest("hex");
  await expect(surface.locator('.scene-label--selected[data-shown="true"]')).toBeVisible();
  await surface.focus();
  await page.keyboard.press("f");
  await row(page, A).focus();
  await row(page, A).press("ArrowDown");
  await expectSelection(page, B);
  await expect(page.getByRole("complementary", { name: "PR.AA-02 details" })).toBeVisible();
  await page.mouse.move(1, 1);
  const framed = await frame();
  expect(await frame()).toBe(framed);
  await navigateInPlace(page, `/w/${workspace.slug}/plan`);
  await expect(page.getByRole("heading", { name: "Action plan", exact: true })).toBeVisible();
  await navigateInPlace(page, routeFor(workspace, B));
  await expect(page.getByRole("complementary", { name: "PR.AA-02 details" })).toBeVisible();
  await expect(surface.locator('.scene-label--selected[data-shown="true"]')).toBeVisible();
  await expect.poll(frame).toBe(framed);
  await expectSelection(page, B);
});
