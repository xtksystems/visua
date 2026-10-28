import type { FrameworkFamily, Priority } from "./types.ts";

export const ATTENTION_KINDS = [
  "overdue-task",
  "failing-check",
  "expired-evidence",
  "expiring-evidence",
  "evidence-review",
  "proposal-review",
  "implementation-gap",
] as const;

export type AttentionKind = (typeof ATTENTION_KINDS)[number];

export interface AttentionRequirement {
  id: string;
  code: string;
  title: string;
  frameworkId: string;
  frameworkLabel: string;
  /** Groups are linked context, not individual assessed requirements or evidence coverage. */
  assessable: boolean;
}

export interface AttentionOwner {
  kind: "member" | "external" | "agent" | "unassigned" | "approver" | "multiple";
  label: string;
  userId?: string;
}

/** Entity ids are canonical workspace-scoped ids; a check id identifies a result. */
export interface AttentionAction {
  type: "task" | "evidence" | "check" | "proposal" | "requirement";
  id: string;
  label: string;
  frameworkId?: string;
  runId?: string;
}

export interface AttentionItem {
  id: string;
  kind: AttentionKind;
  title: string;
  reason: string;
  priority: Priority;
  /** Workspace work has no requirement links; excluded links never become workspace work. */
  scope: "requirements" | "workspace";
  requirements: AttentionRequirement[];
  owner: AttentionOwner;
  action: AttentionAction;
  /** UTC timestamp or a calendar date due through the end of its UTC day. */
  dueAt?: string;
}

/** Complete, ordered queue. Clients filter before applying presentation limits. */
export interface WorkspaceAttention {
  workspaceId: string;
  asOf: string;
  enabledFrameworks: {
    id: string;
    shortName: string;
    family: FrameworkFamily;
    inScopeRequirements: number;
  }[];
  counts: {
    total: number;
    /** Unique directly linked assessable requirements; group links are excluded. */
    affectedRequirements: number;
    byKind: Record<AttentionKind, number>;
  };
  items: AttentionItem[];
}
