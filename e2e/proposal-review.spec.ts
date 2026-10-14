import { randomUUID } from "node:crypto";
import { expect, test as base, type APIRequestContext, type Page } from "@playwright/test";
import type { Proposal, ProposalBatchPreview, ProposalBatchResult, ProposalPreview } from "@visua/core";
import type { RunWithProposals, WorkspaceSummary } from "../apps/web/src/lib/types.ts";

const OWNER = "morgan.lee@northwind-health.example";
const REQUIREMENT = "nist-csf-2.0:PR.AA-01";
type Workspace = { id: string; slug: string; csrf: string };

async function signIn(request: APIRequestContext): Promise<string> {
  const old = await (await request.get("/api/auth/me")).json() as { csrf?: string } | null;
  const response = await request.post("/api/auth/dev/login", { data: { email: OWNER }, headers: old?.csrf ? { "x-visua-csrf": old.csrf } : undefined });
  expect(response.ok(), await response.text()).toBe(true);
  return ((await response.json()) as { csrf: string }).csrf;
}

async function post<T>(request: APIRequestContext, ws: Workspace, path: string, data: unknown): Promise<T> {
  const response = await request.post(`/api/workspaces/${ws.id}${path}`, { data, headers: { "x-visua-csrf": ws.csrf } });
  expect(response.ok(), await response.text()).toBe(true);
  return await response.json() as T;
}

async function plan(page: Page, ws: Workspace): Promise<RunWithProposals> {
  const run = await post<RunWithProposals>(page.request, ws, "/runs?wait=1", { agent: "planner", goal: "Plan the next three gaps", input: { framework: "nist-csf-2.0", maxTasks: 3 } });
  expect(run.proposals).toHaveLength(3);
  return run;
}

async function editRequirement(page: Page, ws: Workspace, current: number) {
  const response = await page.request.patch(`/api/workspaces/${ws.id}/requirements/${encodeURIComponent(REQUIREMENT)}`, { headers: { "x-visua-csrf": ws.csrf }, data: { current } });
  expect(response.ok(), await response.text()).toBe(true);
}

const test = base.extend<{ workspace: Workspace }>({
  workspace: async ({ page }, use) => {
    const csrf = await signIn(page.request);
    const response = await page.request.post("/api/workspaces", { headers: { "x-visua-csrf": csrf }, data: { name: `Proposal review ${randomUUID()}`, frameworks: ["nist-csf-2.0"], planInitialTasks: false, profile: { industry: "saas", size: "11-50", securityTeamSize: 1 } } });
    expect(response.status(), await response.text()).toBe(201);
    const { workspace } = await response.json() as WorkspaceSummary;
    await use({ id: workspace.id, slug: workspace.slug, csrf });
    const cleanupCsrf = await signIn(page.request);
    const deleted = await page.request.delete(`/api/workspaces/${workspace.id}`, { headers: { "x-visua-csrf": cleanupCsrf } });
    expect(deleted.ok(), await deleted.text()).toBe(true);
  },
});

test("a proposal must be reviewed, then applies the exact inspected changes", async ({ page, workspace: ws }) => {
  const run = await plan(page, ws);
  const proposal = run.proposals[0]!;
  await page.goto(`/w/${ws.slug}/agents/${run.id}`);
  await expect(page.getByRole("button", { name: "Approve", exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Approve and apply", exact: true })).toHaveCount(0);
  const previewResponse = page.waitForResponse((response) => response.url().endsWith(`/proposals/${proposal.id}/preview`));
  await page.locator(`[data-proposal-id="${proposal.id}"]`).getByRole("button", { name: "Review changes" }).click();
  const preview = await (await previewResponse).json() as ProposalPreview;
  const dialog = page.getByRole("dialog", { name: proposal.title, exact: true });
  await expect(dialog.getByRole("heading", { name: "Changes to apply", exact: true })).toBeVisible();
  await expect(dialog.locator(".proposal-change__head").first()).toContainText("Current");
  await expect(dialog.locator(".proposal-change__head").first()).toContainText("Proposed");
  await expect(dialog.getByRole("region", { name: "Affected requirements", exact: true })).toContainText(preview.affectedRequirementIds[0]!.split(":").at(-1)!);
  await expect(dialog.getByRole("heading", { name: "Supporting sources", exact: true })).toBeVisible();
  await expect(dialog.getByRole("region", { name: "Unknowns and limitations" })).toContainText("qualitative estimate, not verification");
  const applied = page.waitForResponse((response) => response.request().method() === "POST" && response.url().endsWith(`/proposals/${proposal.id}/decision`));
  await dialog.getByRole("button", { name: "Approve and apply" }).click();
  const response = await applied;
  expect(response.request().postDataJSON()).toEqual({ decision: "approved", reviewToken: preview.reviewToken });
  expect(response.status()).toBe(200);
  expect((await response.json() as Proposal).status).toBe("applied");
  await expect(dialog.getByRole("heading", { name: "Proposal applied", exact: true })).toBeVisible();
  const tasks = await (await page.request.get(`/api/workspaces/${ws.id}/tasks`)).json() as { title: string; requirementIds: string[] }[];
  expect(tasks).toHaveLength(1);
  expect(tasks[0]!.title).toBe(preview.changes.find((c) => c.entityType === "task")!.proposed["title"]);
  expect(tasks[0]!.requirementIds).toEqual(preview.affectedRequirementIds);
});

test("a stale single review stays frozen until the person explicitly refreshes it", async ({ page, workspace: ws }) => {
  await editRequirement(page, ws, 3);
  const run = await post<RunWithProposals>(page.request, ws, "/runs?wait=1", { agent: "assessor", goal: "Assess this requirement", input: { nodeIds: [REQUIREMENT] } });
  expect(run.proposals).toHaveLength(1);
  const proposal = run.proposals[0]!;
  await page.goto(`/w/${ws.slug}/agents/${run.id}?proposal=${proposal.id}`);
  const dialog = page.getByRole("dialog", { name: proposal.title, exact: true });
  const level = dialog.locator(".proposal-change__row").filter({ has: page.locator("dt", { hasText: "Implementation level" }) });
  await expect(level.locator("dd").first()).toContainText("3");
  await editRequirement(page, ws, 4);
  await expect(level.locator("dd").first()).toContainText("3");
  await dialog.getByRole("button", { name: "Approve and apply" }).click();
  await expect(dialog.getByRole("alert")).toContainText("out of date");
  await expect(dialog.getByRole("button", { name: "Approve and apply" })).toBeDisabled();
  await expect(level.locator("dd").first()).toContainText("3");
  await dialog.getByRole("button", { name: "Refresh preview" }).click();
  await expect(level.locator("dd").first()).toContainText("4");
  await expect(dialog.getByRole("button", { name: "Approve and apply" })).toBeEnabled();
  await dialog.getByRole("button", { name: "Approve and apply" }).click();
  await expect(dialog.getByRole("heading", { name: "Proposal applied", exact: true })).toBeVisible();
});

test("a changed batch member requires a new review and reports only the proposals applied", async ({ page, workspace: ws }) => {
  const run = await plan(page, ws);
  await page.goto(`/w/${ws.slug}/agents/${run.id}`);
  await page.getByRole("button", { name: "Review all 3", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Review all pending proposals", exact: true });
  await expect(dialog.getByRole("button", { name: "Approve reviewed 3", exact: true })).toBeEnabled();
  await post(page.request, ws, `/proposals/${run.proposals[0]!.id}/decision`, { decision: "rejected" });
  await expect(dialog.getByRole("button", { name: "Approve reviewed 3", exact: true })).toBeVisible();
  await dialog.getByRole("button", { name: "Approve reviewed 3", exact: true }).click();
  await expect(dialog.getByRole("alert")).toContainText("out of date");
  const before = await (await page.request.get(`/api/workspaces/${ws.id}/tasks`)).json();
  expect(before).toHaveLength(0);
  await dialog.getByRole("button", { name: "Refresh preview" }).click();
  await expect(dialog.getByRole("button", { name: "Approve reviewed 2", exact: true })).toBeEnabled();
  const applying = page.waitForResponse((response) => response.url().endsWith(`/runs/${run.id}/approve-all`));
  await dialog.getByRole("button", { name: "Approve reviewed 2", exact: true }).click();
  const outcome = await (await applying).json() as ProposalBatchResult;
  expect(outcome.applied).toBe(2);
  await expect(dialog.getByRole("status")).toContainText("2 applied · 0 failed · 0 skipped");
  const tasks = await (await page.request.get(`/api/workspaces/${ws.id}/tasks`)).json();
  expect(tasks).toHaveLength(2);
});

test("new arrivals cannot enter an open batch snapshot and partial outcomes are explicit", async ({ page, workspace: ws }) => {
  const run = await plan(page, ws);
  const late = { ...run.proposals[0]!, id: "prop_late_arrival", title: "A proposal that arrived after review" };
  let added = false;
  await page.route(`**/api/workspaces/${ws.id}/runs/${run.id}`, async (route) => {
    const response = await route.fetch();
    const current = await response.json() as RunWithProposals;
    await route.fulfill({ response, json: { ...current, proposals: added ? [...current.proposals, late] : current.proposals } });
  });
  await page.goto(`/w/${ws.slug}/agents/${run.id}`);
  const reviewing = page.waitForResponse((response) => response.url().endsWith(`/runs/${run.id}/approval-preview`));
  await page.getByRole("button", { name: "Review all 3", exact: true }).click();
  const snapshot = await (await reviewing).json() as ProposalBatchPreview;
  const dialog = page.getByRole("dialog", { name: "Review all pending proposals", exact: true });
  await expect(dialog.getByRole("button", { name: "Approve reviewed 3" })).toBeEnabled();
  added = true;
  // A real agent event refreshes the run under the detached review dialog.
  await post(page.request, ws, "/runs?wait=1", { agent: "planner", goal: "A later planning run", input: { framework: "nist-csf-2.0", maxTasks: 1 } });
  await expect(page.locator(`[data-proposal-id="${late.id}"]`)).toHaveCount(1);
  await expect(dialog).not.toContainText(late.title);
  let submitted: { proposalIds: string[]; reviewToken: string } | undefined;
  await page.route(`**/api/workspaces/${ws.id}/runs/${run.id}/approve-all`, async (route) => {
    submitted = route.request().postDataJSON() as typeof submitted;
    await route.fulfill({ json: { total: 3, applied: 1, failed: 1, skipped: 1, results: [
      { proposalId: snapshot.proposalIds[0]!, status: "applied", proposalStatus: "applied" },
      { proposalId: snapshot.proposalIds[1]!, status: "failed", proposalStatus: "failed", message: "The referenced item no longer exists." },
      { proposalId: snapshot.proposalIds[2]!, status: "skipped", proposalStatus: "pending", message: "Review overlapping changes individually." },
    ] } satisfies ProposalBatchResult });
  });
  await dialog.getByRole("button", { name: "Approve reviewed 3", exact: true }).click();
  await expect(dialog.getByRole("status")).toContainText("1 applied · 1 failed · 1 skipped");
  await expect(dialog.getByRole("status")).toContainText("The referenced item no longer exists");
  expect(submitted).toEqual({ proposalIds: snapshot.proposalIds, reviewToken: snapshot.reviewToken });
  expect(submitted!.proposalIds).not.toContain(late.id);
  await expect(dialog.getByRole("button", { name: /Approve reviewed/ })).toHaveCount(0);
});

test("failed preview and decision requests keep the review retryable without duplicate submission", async ({ page, workspace: ws }) => {
  const run = await plan(page, ws);
  const proposal = run.proposals[0]!;
  let loads = 0;
  await page.route(`**/proposals/${proposal.id}/preview`, async (route) => {
    if (++loads === 1) await route.fulfill({ status: 503, json: { error: "Review storage is temporarily unavailable" } });
    else await route.continue();
  });
  await page.goto(`/w/${ws.slug}/agents/${run.id}?proposal=${proposal.id}`);
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("alert")).toContainText("Review storage is temporarily unavailable");
  await dialog.getByRole("button", { name: "Retry loading review" }).click();
  await expect(dialog.getByRole("button", { name: "Approve and apply" })).toBeEnabled();
  let decisions = 0;
  let release: () => void = () => {};
  const hold = new Promise<void>((resolve) => { release = resolve; });
  await page.route(`**/proposals/${proposal.id}/decision`, async (route) => {
    if (++decisions === 1) {
      await hold;
      await route.fulfill({ status: 503, json: { error: "Decision storage is temporarily unavailable" } });
    } else await route.continue();
  });
  await dialog.getByRole("button", { name: "Approve and apply" }).click();
  await expect(dialog.getByRole("button", { name: "Saving decision…" })).toBeDisabled();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("button", { name: "Cancel", exact: true })).toBeDisabled();
  release();
  await expect(dialog.getByRole("alert")).toContainText("Decision storage is temporarily unavailable");
  await expect(dialog.getByRole("heading", { name: "Proposal applied", exact: true })).toHaveCount(0);
  await dialog.getByRole("button", { name: "Approve and apply" }).click();
  await expect(dialog.getByRole("heading", { name: "Proposal applied", exact: true })).toBeVisible();
  expect(decisions).toBe(2);
  expect(loads).toBe(2);
});

test("mobile deep links open scalar changes and keyboard review restores focus", async ({ page, workspace: ws }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await editRequirement(page, ws, 3);
  const run = await post<RunWithProposals>(page.request, ws, "/runs?wait=1", { agent: "assessor", goal: "Assess a scalar change", input: { nodeIds: [REQUIREMENT] } });
  const proposal = run.proposals[0]!;
  await page.goto(`/w/${ws.slug}/agents/${run.id}?proposal=${proposal.id}`);
  const dialog = page.getByRole("dialog", { name: proposal.title, exact: true });
  const close = dialog.getByRole("button", { name: "Close", exact: true });
  await expect(dialog).toBeVisible();
  // A direct link has no preceding click to activate the loaded document.
  // Activate the page without assigning focus to an element under test.
  await page.bringToFront();
  await expect(close).toBeFocused();
  await expect(dialog.getByRole("button", { name: "Approve and apply" })).toBeEnabled();
  await expect(dialog.locator(".proposal-change__mobile-label").first()).toBeVisible();
  await close.press("Shift+Tab");
  await expect(dialog.getByRole("button", { name: "Approve and apply" })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(close).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(page.getByRole("heading", { name: run.goal, exact: true })).toBeFocused();
  expect(new URL(page.url()).searchParams.has("proposal")).toBe(false);
  const trigger = page.getByRole("button", { name: "Review changes", exact: true });
  await trigger.focus();
  await trigger.press("Enter");
  await expect(dialog).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(trigger).toBeFocused();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test("a missing proposal and a failed run link show recovery instead of opening a different decision", async ({ page, workspace: ws }) => {
  const run = await plan(page, ws);
  await page.goto(`/w/${ws.slug}/agents/${run.id}?proposal=missing-proposal`);
  await expect(page.getByRole("alert")).toContainText("not available in this run");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Retry loading proposal" })).toBeEnabled();
  let failRun = true;
  await page.route(`**/api/workspaces/${ws.id}/runs/${run.id}`, async (route) => {
    if (failRun) await route.fulfill({ status: 503, json: { error: "Run storage is temporarily unavailable" } });
    else await route.continue();
  });
  await page.goto(`/w/${ws.slug}/agents/${run.id}?proposal=${run.proposals[0]!.id}`);
  await expect(page.getByRole("alert")).toContainText("Could not load this run");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  failRun = false;
  await page.getByRole("button", { name: "Retry loading run" }).click();
  await expect(page.getByRole("dialog", { name: run.proposals[0]!.title, exact: true })).toBeVisible();
});
