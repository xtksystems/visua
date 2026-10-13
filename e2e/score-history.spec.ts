import { expect } from "@playwright/test";
import type { ScoreObservation } from "@visua/core";
import { CSF, REQUIREMENT, VIEWER, capture, signIn, test, write } from "./visual-review.fixture.ts";

test("history begins with recorded observations and separates progress from target and scope changes", async ({ page, visual: ws }) => {
  await page.goto(`/w/${ws.slug}`);
  const history = page.getByRole("region", { name: "Observed score history", exact: true });
  await expect(history).toContainText("No observations yet");
  const record = async () => {
    const response = page.waitForResponse(response => response.request().method() === "POST" && response.url().endsWith("/score-history"));
    await history.getByRole("button", { name: "Record snapshot", exact: true }).click();
    const result = await response;
    expect(result.status()).toBe(201);
    return await result.json() as ScoreObservation;
  };
  const first = await record();
  await history.getByRole("combobox", { name: "History framework", exact: true }).selectOption(CSF);
  await expect(history).toContainText("One observation recorded");
  await write(page.request, ws, "patch", `/requirements/${encodeURIComponent(REQUIREMENT)}`, { current: 2 });
  const second = await record();
  const original = first.frameworks.find(f => f.frameworkId === CSF)!;
  const changed = second.frameworks.find(f => f.frameworkId === CSF)!;
  expect(changed.progress.value).toBeGreaterThan(original.progress.value!);
  expect(changed.evidence.covered).toBe(0);
  expect(changed.targetsFingerprint).toBe(original.targetsFingerprint);
  const table = history.getByRole("region", { name: "Recorded score observations", exact: true });
  await expect(table.locator("tbody tr")).toHaveCount(2);
  await expect(table.locator("tbody tr").last()).toContainText("Same scope, targets, priorities, catalog and calculation");
  await write(page.request, ws, "patch", `/requirements/${encodeURIComponent(REQUIREMENT)}`, { target: 4 });
  await record();
  await expect(table.locator("tbody tr").last()).toContainText("Targets or priorities changed");
  await write(page.request, ws, "patch", `/requirements/${encodeURIComponent(REQUIREMENT)}`, { applicable: false, applicabilityRationale: "Changed scope for the history browser fixture." });
  await record();
  await expect(table.locator("tbody tr")).toHaveCount(4);
  await expect(table.locator("tbody tr").last()).toContainText("Scope changed");
  await page.reload();
  await history.getByRole("combobox", { name: "History framework", exact: true }).selectOption(CSF);
  await expect(table.locator("tbody tr")).toHaveCount(4);
  await history.scrollIntoViewIfNeeded();
  await capture(page, "score-history-1440");
});

test("history load failure offers retry without reporting an empty history", async ({ page, visual: ws }) => {
  let failure = true;
  await page.route(`**/api/workspaces/${ws.id}/score-history`, async route => failure
    ? route.fulfill({ status: 503, json: { error: "History temporarily unavailable" } })
    : route.continue());
  await page.goto(`/w/${ws.slug}`);
  const history = page.getByRole("region", { name: "Observed score history", exact: true });
  await expect(history.getByRole("alert")).toContainText("History temporarily unavailable");
  await expect(history).not.toContainText("No observations yet");
  failure = false;
  await history.getByRole("button", { name: /Retry/ }).click();
  await expect(history).toContainText("No observations yet");
});

test.describe("touch phone history", () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  test("reader sees exact recorded values and local table scroll without a capture control", async ({ page, visual: ws }) => {
    await write(page.request, ws, "post", "/score-history", {});
    await write(page.request, ws, "patch", `/requirements/${encodeURIComponent(REQUIREMENT)}`, { current: 2 });
    await write(page.request, ws, "post", "/score-history", {});
    await signIn(page.request, VIEWER);
    await page.goto(`/w/${ws.slug}`);
    const history = page.getByRole("region", { name: "Observed score history", exact: true });
    await history.getByRole("combobox", { name: "History framework", exact: true }).selectOption(CSF);
    await expect(history.getByRole("button", { name: "Record snapshot", exact: true })).toHaveCount(0);
    await expect(history.getByRole("columnheader", { name: "Comparison", exact: true })).toBeVisible();
    await expect(history.locator("tbody tr")).toHaveCount(2);
    const chart = history.getByRole("region", { name: "Scrollable score history chart", exact: true });
    expect(await chart.evaluate(element => element.scrollWidth > element.clientWidth)).toBe(true);
    await chart.scrollIntoViewIfNeeded();
    // Enter the scroll region through native keyboard navigation, as a user does.
    await history.getByRole("combobox", { name: "History framework", exact: true }).focus();
    await page.keyboard.press("Tab");
    await expect(chart).toBeFocused();
    await page.keyboard.press("ArrowRight");
    await expect.poll(() => chart.evaluate(element => element.scrollLeft)).toBeGreaterThan(0);
    await chart.evaluate(element => { element.scrollLeft = 0; });
    const touch = await page.context().newCDPSession(page);
    const bounds = (await chart.boundingBox())!;
    await touch.send("Input.synthesizeScrollGesture", { x: bounds.x + bounds.width - 30, y: bounds.y + bounds.height / 2, xDistance: -180, yDistance: 0, gestureSourceType: "touch", preventFling: true });
    await expect.poll(() => chart.evaluate(element => element.scrollLeft)).toBeGreaterThan(0);
    await touch.detach();
    await chart.evaluate(element => { element.scrollLeft = 0; });
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    await history.scrollIntoViewIfNeeded();
    await capture(page, "score-history-390");
  });
});
