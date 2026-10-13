import { expect, type Page } from "@playwright/test";
import type { Task } from "../apps/web/src/lib/types.ts";
import { CONTROL, CSF, REQUIREMENT, VIEWER, capture, signIn, test, write, type VisualWorkspace } from "./visual-review.fixture.ts";

const day = (offset: number) => new Date(Date.now() + offset * 86_400_000).toISOString().slice(0, 10);
async function tasks(page: Page, ws: VisualWorkspace) {
  const inputs = [
    { title: "Resolve access blocker", status: "blocked", priority: "low", assignee: { type: "person", id: ws.ownerId } },
    { title: "Renew overdue observation", status: "todo", dueDate: day(-2), priority: "high" },
    { title: "Review completed configuration", status: "in-review", priority: "medium" },
    { title: "Due-only access review", status: "todo", dueDate: day(5), priority: "medium" },
    { title: "Completed historical task", status: "done", dueDate: day(-7), priority: "critical" },
  ];
  const created: Task[] = [];
  for (const input of inputs) created.push(await write<Task>(page.request, ws, "post", "/tasks", { requirementIds: [REQUIREMENT], ...input }));
  created.push(await write<Task>(page.request, ws, "post", "/tasks", { title: "Control framework backlog", requirementIds: [CONTROL], status: "backlog", priority: "low" }));
  return created;
}

test("default urgency list preserves status counts, framework scope and deep-linked task edits", async ({ page, visual: ws }) => {
  const created = await tasks(page, ws);
  await page.goto(`/w/${ws.slug}/plan`);
  const list = page.getByRole("region", { name: "Tasks by urgency" });
  await expect(list).toBeVisible();
  const titles = list.getByRole("button", { name: /^Open task / });
  await expect(titles).toHaveCount(6);
  expect((await titles.allTextContents()).slice(0, 4)).toEqual(created.slice(0, 4).map(task => task.title));
  expect((await titles.allTextContents()).at(-1)).toBe("Completed historical task");
  const counts = page.getByRole("group", { name: "Filter tasks by status" });
  await counts.getByRole("button", { name: "Blocked (1)", exact: true }).click();
  await expect(titles).toHaveCount(1);
  await expect(counts.getByRole("button", { name: "To do (2)", exact: true })).toBeVisible();
  await expect(page).toHaveURL(/status=blocked/);
  await page.reload();
  await expect(titles).toHaveCount(1);
  await page.getByRole("combobox", { name: "Filter by framework" }).selectOption(CSF);
  await expect(counts.getByRole("button", { name: "All statuses (5)", exact: true })).toBeVisible();
  await list.getByRole("button", { name: "Open task Resolve access blocker", exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`task=${created[0]!.id}`));
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("combobox", { name: "Task status" }).selectOption("in-progress");
  await expect(counts.getByRole("button", { name: "Blocked (0)", exact: true })).toBeVisible();
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Close", exact: true }).click();
  await expect(page).toHaveURL(/status=blocked/);
  await expect(page).not.toHaveURL(/task=/);
  await page.getByRole("button", { name: "Clear task filters", exact: true }).click();
  await capture(page, "plan-urgency-1440");
});

test("Board retains six columns and Timeline includes due-only and unscheduled tasks", async ({ page, visual: ws }) => {
  const created = await tasks(page, ws);
  const dueOnly = created[3]!;
  await page.goto(`/w/${ws.slug}/plan?view=board`);
  const columns = page.locator(".board__col");
  await expect(columns).toHaveCount(6);
  const tops = await columns.evaluateAll(nodes => nodes.map(node => node.getBoundingClientRect().top));
  expect(Math.max(...tops) - Math.min(...tops)).toBeLessThanOrEqual(1);
  await page.getByRole("button", { name: "Timeline", exact: true }).click();
  await expect(page).toHaveURL(/view=timeline/);
  const marker = page.getByRole("region", { name: "Task timeline chart" }).locator(`[data-task-id="${dueOnly.id}"]`);
  await expect(marker).toHaveAttribute("data-schedule-kind", "due");
  await marker.click();
  await expect(page.getByRole("dialog")).toContainText(dueOnly.title);
  await page.getByRole("dialog").getByRole("button", { name: "Close", exact: true }).click();
  const table = page.getByRole("region", { name: "Task schedule table" });
  await expect(table.getByRole("button", { name: "Resolve access blocker", exact: true })).toBeVisible();
  await expect(table.getByRole("button", { name: dueOnly.title, exact: true })).toBeVisible();
});

test.describe("touch phone plan", () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  test("viewer can inspect urgency and timeline without writes or page overflow", async ({ page, visual: ws }) => {
    await tasks(page, ws);
    await signIn(page.request, VIEWER);
    await page.goto(`/w/${ws.slug}/plan`);
    await expect(page.getByRole("region", { name: "Task status counts" })).toBeVisible();
    await page.getByRole("button", { name: "Open task Resolve access blocker", exact: true }).click();
    await expect(page.getByRole("dialog").getByRole("combobox", { name: "Task status" })).toBeDisabled();
    await page.getByRole("dialog").getByRole("button", { name: "Close", exact: true }).click();
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    await capture(page, "plan-urgency-390");
    await page.getByRole("button", { name: "Timeline", exact: true }).click();
    await expect(page.getByRole("region", { name: "Task schedule table" }).getByRole("button", { name: "Due-only access review", exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
  });
});
