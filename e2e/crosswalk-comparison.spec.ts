import { expect } from "@playwright/test";
import { evidenceReviewScope } from "../packages/core/src/evidence.ts";
import type { Evidence } from "../apps/web/src/lib/types.ts";
import { AI, CONTROL, CSF, GROUP, REQUIREMENT, SP, VIEWER, capture, signIn, test, write } from "./visual-review.fixture.ts";

test("matrix counts, published direction, pagination and cell selection survive URL reload", async ({ page, visual: ws }) => {
  await page.route("**/crosswalk/comparison?**", async route => { await new Promise(resolve => setTimeout(resolve, 200)); await route.continue(); });
  await page.goto(`/w/${ws.slug}/crosswalk`);
  await page.getByRole("button", { name: "Matrix", exact: true }).click();
  const table = page.getByRole("table", { name: "Requirement mapping comparison" });
  await expect(table).toBeVisible();
  await expect(page.getByRole("combobox", { name: "Source framework", exact: true })).toHaveValue(CSF);
  await expect(page.getByRole("combobox", { name: "Target framework", exact: true })).toHaveValue(SP);
  const comparison = await (await page.request.get(`/api/workspaces/${ws.id}/crosswalk/comparison?source=${CSF}&target=${SP}`)).json() as {
    pairTotal: number; rows: { id: string; source: { id: string }; target: { id: string }; relationship: string }[];
    cells: { sourceGroup: string; targetGroup: string; count: number }[];
    sourceGroups: { id: string; code: string }[]; targetGroups: { id: string; code: string }[];
  };
  expect(comparison.pairTotal).toBeGreaterThan(50);
  const details = page.getByRole("region", { name: "Selected mappings" });
  await expect(details.getByRole("link").first()).toBeVisible();
  const nextPage = page.getByRole("button", { name: "Next page", exact: true });
  await nextPage.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("button", { name: "Previous page", exact: true })).toBeEnabled();
  await expect(nextPage).toBeFocused();
  await expect(page).toHaveURL(/page=2/);
  await page.reload();
  await expect(page.getByRole("button", { name: "Previous page", exact: true })).toBeEnabled();
  const cell = comparison.cells.find(cell => cell.count > 0)!;
  const sourceCode = comparison.sourceGroups.find(group => group.id === cell.sourceGroup)!.code;
  const targetCode = comparison.targetGroups.find(group => group.id === cell.targetGroup)!.code;
  const cellButton = table.getByRole("button", { name: `${sourceCode} to ${targetCode}: ${cell.count} mappings`, exact: true });
  await cellButton.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("button", { name: "Show all mappings", exact: true })).toBeVisible();
  await expect(cellButton).toBeFocused();
  await expect(page).toHaveURL(new RegExp(`sourceGroup=${encodeURIComponent(cell.sourceGroup)}`));
  await expect(page).not.toHaveURL(/page=2/);
  await capture(page, "crosswalk-matrix-1440");
  await page.goto(`/w/${ws.slug}/crosswalk?view=matrix&source=${SP}&target=${CSF}`);
  await expect(table).toBeVisible();
  const reversed = await (await page.request.get(`/api/workspaces/${ws.id}/crosswalk/comparison?source=${SP}&target=${CSF}`)).json() as typeof comparison;
  expect(reversed.pairTotal).toBe(comparison.pairTotal);
  expect(reversed.rows.map(row => [row.id, row.source.id, row.relationship, row.target.id])).toEqual(comparison.rows.map(row => [row.id, row.source.id, row.relationship, row.target.id]));
  await expect(details).toContainText(/published|direction/i);
});

test("matrix failure recovers and an empty pair cannot retain previous mapping rows", async ({ page, visual: ws }) => {
  let failing = true;
  await page.route("**/crosswalk/comparison?**", async route => {
    if (failing) await route.fulfill({ status: 503, json: { error: "Comparison temporarily unavailable" } });
    else await route.continue();
  });
  await page.goto(`/w/${ws.slug}/crosswalk?view=matrix&source=${CSF}&target=${SP}`);
  await expect(page.getByRole("alert")).toContainText("Comparison temporarily unavailable");
  failing = false;
  await page.getByRole("button", { name: /Retry/ }).click();
  await expect(page.getByRole("table", { name: "Requirement mapping comparison" })).toBeVisible();
  await page.getByRole("combobox", { name: "Source framework", exact: true }).selectOption(AI);
  await expect(page.getByRole("region", { name: "Selected mappings" })).toContainText(/No.*mapping/i);
  await expect(page.getByRole("region", { name: "Selected mappings" }).getByRole("link")).toHaveCount(0);
});

test.describe("touch phone comparison", () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  test("evidence direct links and review validity remain distinct without write access or page overflow", async ({ page, visual: ws }) => {
    const artifact = await write<Evidence>(page.request, ws, "post", "/evidence", {
      title: "Observed shared access configuration", content: "Illustrative browser observation.",
      requirementIds: [REQUIREMENT, CONTROL, GROUP], collectedAt: "2026-01-01T00:00:00Z",
    });
    await page.goto(`/w/${ws.slug}/crosswalk?view=matrix&source=${CSF}&target=${SP}&evidence=${artifact.id}`);
    await expect(page.getByRole("combobox", { name: "Evidence artifact", exact: true })).toHaveValue(artifact.id);
    await expect(page.getByText(/Pending review/, { exact: false }).first()).toBeVisible();
    await expect(page.getByText(/group.*child|children.*group|group.*cover/i).first()).toBeVisible();
    await write(page.request, ws, "patch", `/evidence/${artifact.id}`, { decision: "accepted", expectedScope: evidenceReviewScope(artifact) });
    await expect(page.getByText(/Accepted/, { exact: false }).first()).toBeVisible();
    const writes: string[] = [];
    await signIn(page.request, VIEWER);
    page.on("request", request => { if (["POST", "PATCH", "DELETE"].includes(request.method())) writes.push(request.method()); });
    await page.reload();
    await expect(page.getByRole("combobox", { name: "Evidence artifact", exact: true })).toHaveValue(artifact.id);
    await expect(page.getByRole("link", { name: /PR.AA-01/ }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /AC-1/ }).first()).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    await capture(page, "crosswalk-evidence-390");
    await page.getByRole("region", { name: "Direct evidence links", exact: true }).scrollIntoViewIfNeeded();
    await capture(page, "crosswalk-evidence-detail-390");
    expect(writes).toEqual([]);
  });
});
