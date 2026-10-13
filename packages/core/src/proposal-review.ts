import type { Citation, Proposal } from "./types.ts";

/** Server-derived fields; runtime IDs and decision timestamps are listed separately. */
export interface ProposalChange {
  entityType: "requirement" | "task" | "evidence" | "policy" | "risk" | "check" | "workspace";
  entityId?: string;
  label: string;
  current: Record<string, unknown> | null;
  proposed: Record<string, unknown>;
  generatedFields: string[];
}

export interface ProposalReviewSource {
  kind: "check" | "evidence" | "requirement" | "workspace";
  id: string;
  label: string;
  detail: Record<string, unknown>;
}

export interface ProposalPreview {
  proposal: Proposal;
  reviewToken: string;
  workspaceRevision: number;
  changes: ProposalChange[];
  affectedRequirementIds: string[];
  citations: Citation[];
  sources: ProposalReviewSource[];
  unresolvedQuestions: string[];
  canApprove: boolean;
}

export interface ProposalBatchPreview {
  runId: string;
  proposalIds: string[];
  reviewToken: string;
  workspaceRevision: number;
  proposals: ProposalPreview[];
  conflicts: { proposalIds: string[]; reason: string }[];
}

export interface ProposalBatchResult {
  total: number;
  applied: number;
  failed: number;
  skipped: number;
  results: { proposalId: string; status: "applied" | "failed" | "skipped"; proposalStatus: Proposal["status"]; message?: string }[];
}
