import type { RequirementState, Task } from "@visua/core";

/** Work dates are calendar days, never timestamps or normalized invalid dates. */
export function isWorkDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export type RequirementPatch = Partial<Pick<RequirementState, "current" | "target" | "priority" | "applicable" | "applicabilityRationale" | "notes">> & {
  owner?: string | null;
  ownerUserId?: string | null;
  dueDate?: string | null;
  statusOverride?: RequirementState["statusOverride"] | null;
  verifiedAt?: string | null;
};

export type TaskPatch = Omit<Partial<Task>, "assignee" | "startDate" | "dueDate" | "contentRequirementIds"> & {
  assignee?: Task["assignee"] | null;
  startDate?: string | null;
  dueDate?: string | null;
};

/** Explicit nulls make field clearing visible in audit JSON on both databases. */
export const requirementWorkSnapshot = (state: RequirementState) => ({
  owner: state.owner ?? null, ownerUserId: state.ownerUserId ?? null, dueDate: state.dueDate ?? null,
});

export const taskWorkSnapshot = (task: Task) => ({
  assignee: task.assignee ?? null, startDate: task.startDate ?? null, dueDate: task.dueDate ?? null,
  requirementIds: [...task.requirementIds], contentRequirementIds: task.contentRequirementIds ? [...task.contentRequirementIds] : null,
  source: task.source ?? null, origin: task.origin,
});
