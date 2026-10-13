import { expect } from "@playwright/test";
import type { RunWithProposals } from "../apps/web/src/lib/types.ts";
import { CSF, capture, test, write } from "./visual-review.fixture.ts";

test("recorded stages progress from review to actual application and keep recorder keyboard access", async ({ page, visual: ws }) => {
  const run = await write<RunWithProposals>(page.request, ws, "post", "/runs?wait=1", { agent: "planner", goal: "Plan two gaps for stage review", input: { framework: CSF, maxTasks: 2 } });
  expect(run.proposals).toHaveLength(2);
  await page.goto(`/w/${ws.slug}/agents/${run.id}`);
  const stages = page.getByRole("region", { name: "Agent stages" });
  await expect(stages.getByRole("heading")).toHaveText("Current stage: Review");
  await expect(stages.locator('[data-stage="collect"]')).toHaveAttribute("data-state", "complete");
  await expect(stages.locator('[data-stage="analyze"]')).toHaveAttribute("data-state", "complete");
  await expect(stages.locator('[data-stage="apply"]')).toHaveAttribute("data-state", "waiting");
  const toggle = page.locator(".agent-step__toggle").first();
  await toggle.focus();
  await page.keyboard.press("Enter");
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  await page.keyboard.press("Space");
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await page.getByRole("button", { name: "Review all 2", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Review all pending proposals", exact: true });
  await dialog.getByRole("button", { name: "Approve reviewed 2", exact: true }).click();
  await expect(dialog.getByRole("status")).toContainText("2 applied");
  await dialog.getByRole("button", { name: "Close", exact: true }).click();
  await expect(stages.getByRole("heading")).toHaveText("All proposed changes applied");
  await expect(stages.locator('[data-stage="apply"]')).toHaveAttribute("data-state", "complete");
  await capture(page, "agent-stages-1440");
});

test("answer-only runs and older unrecorded stages never imply changes were applied", async ({ page, visual: ws }) => {
  const run = await write<RunWithProposals>(page.request, ws, "post", "/runs?wait=1", { agent: "copilot", goal: "Summarize current implementation gaps", input: { framework: CSF } });
  expect(run.proposals).toHaveLength(0);
  await page.goto(`/w/${ws.slug}/agents/${run.id}`);
  const stages = page.getByRole("region", { name: "Agent stages" });
  await expect(stages.getByRole("heading")).toHaveText("Completed without proposed changes");
  await expect(stages.locator('[data-stage="apply"]')).toHaveAttribute("data-state", "not-needed");
  await page.route(`**/api/workspaces/${ws.id}/runs/${run.id}`, async route => {
    const response = await route.fetch();
    const data = await response.json() as RunWithProposals;
    delete data.stageHistory;
    await route.fulfill({ response, json: data });
  });
  await page.reload();
  await expect(stages.locator('[data-stage="collect"]')).toHaveAttribute("data-state", "not-recorded");
  await expect(stages.locator('[data-stage="apply"]')).toHaveAttribute("data-state", "not-recorded");
});

test.describe("touch phone stages", () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  test("rejection is visible as an outcome rather than a completed application", async ({ page, visual: ws }) => {
    const run = await write<RunWithProposals>(page.request, ws, "post", "/runs?wait=1", { agent: "planner", goal: "Plan one gap for rejection", input: { framework: CSF, maxTasks: 1 } });
    await page.goto(`/w/${ws.slug}/agents/${run.id}`);
    const stages = page.getByRole("region", { name: "Agent stages" });
    await expect(stages.getByRole("heading")).toHaveText("Current stage: Review");
    await write(page.request, ws, "post", `/proposals/${run.proposals[0]!.id}/decision`, { decision: "rejected" });
    await expect(stages.getByRole("heading")).toHaveText("All proposed changes rejected");
    await expect(stages.locator('[data-stage="apply"]')).toHaveAttribute("data-state", "rejected");
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    await capture(page, "agent-stages-390");
  });
});
