import { describe, expect, it } from "vitest";
import { filterPlanTasks, planStatusCounts, projectTaskTimeline, readPlanQuery, sortPlanTasks, taskDay, taskNextAction, taskOverdue, taskUrgency, writePlanQuery } from "../src/lib/plan-urgency.ts";
import type { Task } from "../src/lib/types.ts";

const NOW = Date.parse("2026-10-13T18:00:00Z");
const task = (id: string, patch: Partial<Task> = {}): Task => ({
  id, workspaceId: "workspace", title: `Task ${id}`, description: "", kind: "technical", status: "todo", priority: "medium", requirementIds: [], checklist: [], dependsOn: [], origin: "user", createdAt: "2026-10-01T00:00:00Z", updatedAt: "2026-10-01T00:00:00Z", ...patch,
});

describe("Plan urgency", () => {
  it("places blockers, overdue and review work before upcoming work and completion", () => {
    const tasks = [
      task("done", { status: "done", priority: "critical", dueDate: "2025-01-01" }),
      task("later", { dueDate: "2026-11-01" }),
      task("week", { dueDate: "2026-10-20" }),
      task("today", { dueDate: "2026-10-13" }),
      task("review", { status: "in-review" }),
      task("late", { dueDate: "2026-10-12" }),
      task("blocked", { status: "blocked", priority: "low" }),
    ];
    expect(sortPlanTasks(tasks, NOW).map((item) => item.id)).toEqual(["blocked", "late", "review", "today", "week", "later", "done"]);
    expect(tasks[0]!.id).toBe("done");
  });

  it("keeps a calendar task due for the entire UTC day, across viewer timezones", () => {
    const item = task("due", { dueDate: "2026-10-13" });
    expect(taskOverdue(item, Date.parse("2026-10-13T23:59:59.999Z"))).toBe(false);
    expect(taskOverdue(item, Date.parse("2026-10-14T00:00:00Z"))).toBe(true);
    expect(taskUrgency(item, Date.parse("2026-10-13T00:01:00Z")).label).toBe("Due today");
    expect(taskOverdue(item, Date.parse("2026-10-13T20:01:00-04:00"))).toBe(true);
  });

  it("projects legacy timestamps onto UTC days without local date parsing", () => {
    expect(taskDay("2026-10-13T23:30:00-04:00")).toBe(Date.parse("2026-10-14T00:00:00Z"));
    expect(taskDay("2026-10-13T12:00:00")).toBeNull();
    expect(taskDay("2026-10-13")).toBe(Date.parse("2026-10-13T00:00:00Z"));
  });

  it("retains exact timestamp deadlines while the timeline groups them by UTC day", () => {
    const noon = task("noon", { dueDate: "2026-10-13T12:00:00Z" });
    expect(taskOverdue(noon, Date.parse("2026-10-13T12:00:00Z"))).toBe(false);
    expect(taskUrgency(noon, NOW).label).toBe("Overdue");
    expect(taskOverdue(task("offset", { dueDate: "2026-10-13T11:00:00-04:00" }), NOW)).toBe(true);
    expect(taskOverdue(task("future", { dueDate: "2026-10-13T23:00:00-04:00" }), NOW)).toBe(false);
  });

  it("never marks completed work overdue", () => {
    const item = task("done", { status: "done", dueDate: "2020-01-01" });
    expect(taskOverdue(item, NOW)).toBe(false);
    expect(taskUrgency(item, NOW).label).toBe("Completed");
    expect(taskNextAction(item)).toBe("Review completed work");
  });

  it("retains missing and malformed dates without inventing deadlines", () => {
    for (const dueDate of [undefined, "", "not a date", "2026-02-30", "2025-02-29", "2026-13-01"]) {
      expect(taskDay(dueDate)).toBeNull();
      expect(taskOverdue(task("invalid", { dueDate }), NOW)).toBe(false);
    }
    expect(taskDay("2028-02-29")).not.toBeNull();
    expect(taskUrgency(task("missing"), NOW).label).toBe("No due date");
    expect(taskUrgency(task("invalid", { dueDate: "bad" }), NOW).label).toBe("Check due date");
  });

  it("uses priority then due day then stable identity for deterministic ties", () => {
    const tasks = [task("b"), task("a"), task("later", { dueDate: "2026-12-01" }), task("earlier", { dueDate: "2026-11-01" }), task("critical", { priority: "critical" })];
    const expected = ["critical", "earlier", "later", "a", "b"];
    expect(sortPlanTasks(tasks, NOW).map((item) => item.id)).toEqual(expected);
    expect(sortPlanTasks([...tasks].reverse(), NOW).map((item) => item.id)).toEqual(expected);
  });

  it("provides an actionable next step while preserving checklist wording", () => {
    expect(taskNextAction(task("blocked", { status: "blocked" }))).toBe("Resolve the blocker and update status");
    expect(taskNextAction(task("review", { status: "in-review" }))).toBe("Review the work and update status");
    expect(taskNextAction(task("steps", { checklist: [{ id: "one", text: "Finished step", done: true }, { id: "two", text: "Inspect the actual configuration", done: false }] }))).toBe("Inspect the actual configuration");
    expect(taskNextAction(task("owner"))).toBe("Assign an owner");
    expect(taskNextAction(task("date", { assignee: { id: "external", name: "Consultant", type: "external" } }))).toBe("Set a due date");
  });
});

describe("Plan filters and navigation", () => {
  const tasks = [task("cross", { status: "blocked", requirementIds: ["fw-a:one", "fw-b:one"] }), task("a", { requirementIds: ["fw-a:two"] }), task("b", { status: "done", requirementIds: ["fw-b:two"] }), task("unlinked")];

  it("intersects framework and status without duplicating cross-framework tasks", () => {
    expect(filterPlanTasks(tasks, "fw-a", "blocked").map((item) => item.id)).toEqual(["cross"]);
    expect(filterPlanTasks(tasks, "fw-b").map((item) => item.id)).toEqual(["cross", "b"]);
    expect(filterPlanTasks(tasks, "missing")).toEqual([]);
    expect(filterPlanTasks(tasks)).toHaveLength(4);
  });

  it("keeps every status count in framework scope when the selected status has no matches", () => {
    const scoped = filterPlanTasks(tasks, "fw-a");
    expect(filterPlanTasks(scoped, "all", "done")).toHaveLength(0);
    expect(planStatusCounts(scoped)).toEqual({ backlog: 0, todo: 1, "in-progress": 0, "in-review": 0, blocked: 1, done: 0 });
    expect(planStatusCounts(tasks).todo).toBe(2);
  });

  it("defaults to List and safely handles unknown query modes", () => {
    expect(readPlanQuery(new URLSearchParams())).toEqual({ view: "list", status: "all", framework: "all" });
    expect(readPlanQuery(new URLSearchParams("view=invalid&status=invalid&framework=missing"))).toEqual({ view: "list", status: "all", framework: "missing" });
  });

  it("round-trips filters and leaves deep-linked selection and unrelated query values intact", () => {
    const original = new URLSearchParams("task=selected&other=kept");
    const filtered = writePlanQuery(original, { view: "timeline", status: "in-review", framework: "fw-a" });
    expect(readPlanQuery(filtered)).toEqual({ view: "timeline", status: "in-review", framework: "fw-a" });
    expect(filtered.get("task")).toBe("selected");
    expect(filtered.get("other")).toBe("kept");
    expect(original.toString()).toBe("task=selected&other=kept");
    expect(writePlanQuery(filtered, { view: "list", status: "all", framework: "all" }).toString()).toBe(original.toString());
  });
});

describe("Plan timeline", () => {
  it("gives a due-date-only task a marker and no fabricated duration", () => {
    const item = task("due-only", { dueDate: "2026-10-14" });
    expect(projectTaskTimeline([item])).toEqual([{ task: item, kind: "due", start: null, due: Date.parse("2026-10-14T00:00:00Z"), note: null }]);
  });

  it("retains recorded valid intervals, including same-day work", () => {
    const entries = projectTaskTimeline([task("interval", { startDate: "2026-10-12", dueDate: "2026-10-14" }), task("same-day", { startDate: "2026-10-13", dueDate: "2026-10-13" })]);
    expect(entries.map((entry) => entry.kind)).toEqual(["interval", "interval"]);
    expect(entries[0]!.start).toBe(Date.parse("2026-10-12T00:00:00Z"));
    expect(entries[1]!.start).toBe(entries[1]!.due);
  });

  it("degrades invalid or reversed starts to a due marker with an explicit reason", () => {
    const entries = projectTaskTimeline([task("invalid", { startDate: "bad", dueDate: "2026-10-14" }), task("reversed", { startDate: "2026-10-15", dueDate: "2026-10-14" })]);
    expect(entries.map((entry) => entry.kind)).toEqual(["due", "due"]);
    expect(entries.every((entry) => entry.start === null)).toBe(true);
    expect(entries[0]!.note).toContain("Invalid start date");
    expect(entries[1]!.note).toContain("after due date");
  });

  it("retains start-only, missing and invalid schedules for the accessible table", () => {
    const entries = projectTaskTimeline([task("start-only", { startDate: "2026-10-13" }), task("missing"), task("invalid", { dueDate: "2026-02-30" })]);
    expect(entries).toHaveLength(3);
    expect(entries.every((entry) => entry.kind === "unscheduled" && entry.due === null)).toBe(true);
    expect(entries.map((entry) => entry.note)).toEqual(["Start date only; add a due date", "No due date", "Invalid due date; update task details"]);
  });
});
