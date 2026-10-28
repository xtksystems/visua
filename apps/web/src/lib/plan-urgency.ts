import { isTaskOverdue } from "@visua/core";
import { frameworkOf } from "./format.ts";
import type { Task } from "./types.ts";

export const PLAN_STATUSES: Task["status"][] = ["backlog", "todo", "in-progress", "in-review", "blocked", "done"];
export type PlanView = "list" | "board" | "timeline";
export type PlanStatus = Task["status"] | "all";
export type PlanQuery = { view: PlanView; status: PlanStatus; framework: string };
export const DAY_MS = 86_400_000;

export function readPlanQuery(params: URLSearchParams): PlanQuery {
  const view = params.get("view");
  const status = params.get("status");
  return {
    view: view === "board" || view === "timeline" ? view : "list",
    status: PLAN_STATUSES.includes(status as Task["status"]) ? status as Task["status"] : "all",
    framework: params.get("framework") || "all",
  };
}

export function writePlanQuery(params: URLSearchParams, patch: Partial<PlanQuery>): URLSearchParams {
  const next = new URLSearchParams(params);
  for (const [key, value] of Object.entries(patch)) {
    if (value === "all" || (key === "view" && value === "list")) next.delete(key);
    else next.set(key, value);
  }
  return next;
}

/** Calendar dates and legacy timestamps are projected onto a UTC day; invalid dates stay missing. */
export function taskDay(value: string | undefined): number | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}(?:$|T)/.test(value)) return null;
  const datePart = value.slice(0, 10);
  const date = Date.parse(`${datePart}T00:00:00.000Z`);
  if (!Number.isFinite(date) || new Date(date).toISOString().slice(0, 10) !== datePart) return null;
  if (value.length === 10) return date;
  // A timestamp needs an explicit zone so the viewer's local timezone cannot change urgency.
  if (!/(?:Z|[+-]\d{2}:\d{2})$/.test(value)) return null;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? Math.floor(timestamp / DAY_MS) * DAY_MS : null;
}

export function taskOverdue(task: Task, now = Date.now()): boolean {
  return taskDay(task.dueDate) !== null && isTaskOverdue(task, new Date(now));
}

export function taskUrgency(task: Task, now = Date.now()): { rank: number; label: string; tone: "risk" | "review" | "neutral" | "done" } {
  if (task.status === "done") return { rank: 6, label: "Completed", tone: "done" };
  if (task.status === "blocked") return { rank: 0, label: "Blocked", tone: "risk" };
  if (taskOverdue(task, now)) return { rank: 1, label: "Overdue", tone: "risk" };
  if (task.status === "in-review") return { rank: 2, label: "Awaiting review", tone: "review" };
  const due = taskDay(task.dueDate);
  const today = Math.floor(now / DAY_MS) * DAY_MS;
  if (due === today) return { rank: 3, label: "Due today", tone: "review" };
  if (due !== null && due > today && due <= today + 7 * DAY_MS) return { rank: 4, label: "Due within 7 days", tone: "review" };
  return { rank: 5, label: task.dueDate && due === null ? "Check due date" : due === null ? "No due date" : "Upcoming", tone: "neutral" };
}

const PRIORITY: Record<Task["priority"], number> = { critical: 0, high: 1, medium: 2, low: 3 };
const compareText = (a: string, b: string) => a < b ? -1 : a > b ? 1 : 0;

/** Urgency, priority, due day, then stable task identity; never mutate the query cache. */
export function sortPlanTasks(tasks: readonly Task[], now = Date.now()): Task[] {
  return [...tasks].sort((a, b) => taskUrgency(a, now).rank - taskUrgency(b, now).rank
    || PRIORITY[a.priority] - PRIORITY[b.priority]
    || (taskDay(a.dueDate) ?? Infinity) - (taskDay(b.dueDate) ?? Infinity)
    || compareText(a.id, b.id));
}

export function filterPlanTasks(tasks: readonly Task[], framework = "all", status: PlanStatus = "all"): Task[] {
  return tasks.filter((task) => (framework === "all" || task.requirementIds.some((id) => frameworkOf(id) === framework))
    && (status === "all" || task.status === status));
}

/** Count before the status filter so a zero-result filter never erases other work. */
export function planStatusCounts(tasks: readonly Task[]): Record<Task["status"], number> {
  const counts = Object.fromEntries(PLAN_STATUSES.map((status) => [status, 0])) as Record<Task["status"], number>;
  for (const task of tasks) counts[task.status]++;
  return counts;
}

export function taskNextAction(task: Task): string {
  if (task.status === "done") return "Review completed work";
  if (task.status === "blocked") return "Resolve the blocker and update status";
  if (task.status === "in-review") return "Review the work and update status";
  const next = task.checklist.find((item) => !item.done);
  if (next) return next.text;
  if (!task.assignee) return "Assign an owner";
  if (!task.dueDate) return "Set a due date";
  if (taskDay(task.dueDate) === null) return "Correct the due date";
  return "Open the task and confirm the next step";
}

export type TimelineTask = { task: Task; kind: "interval" | "due" | "unscheduled"; start: number | null; due: number | null; note: string | null };

/** Due-only work has a point, never an invented start or duration. */
export function projectTaskTimeline(tasks: readonly Task[]): TimelineTask[] {
  return tasks.map((task): TimelineTask => {
    const start = taskDay(task.startDate);
    const due = taskDay(task.dueDate);
    if (due === null) return { task, kind: "unscheduled", start, due, note: task.dueDate ? "Invalid due date; update task details" : start !== null ? "Start date only; add a due date" : "No due date" };
    if (start === null) return { task, kind: "due", start: null, due, note: task.startDate ? "Invalid start date; showing due date only" : null };
    if (start > due) return { task, kind: "due", start: null, due, note: "Start date is after due date; showing due date only" };
    return { task, kind: "interval", start, due, note: null };
  });
}
