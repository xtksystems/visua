import type { Priority } from "./types.ts";

/** A recorded observation, never reconstructed from today's state. */
export interface FrameworkScoreObservation {
  frameworkId: string;
  label: string;
  version: string;
  catalogFingerprint: string;
  scopeFingerprint: string;
  targetsFingerprint: string;
  scope: { inScope: number; upcoming: number; excluded: number; assessable: number; requirementIds: string[] };
  targets: { requirements: { id: string; target: number; priority: Priority }[]; defaultTarget: number; levels: { level: number; requirements: number }[]; priorities: { priority: Priority; requirements: number }[] };
  progress: { numerator: number; denominator: number; value: number | null };
  evidence: { covered: number; denominator: number; value: number | null };
  risk: { atRisk: number; denominator: number; value: number | null };
}

export interface ScoreObservation {
  id: string;
  workspaceId: string;
  observedAt: string;
  reason: "manual" | "scheduled";
  formulaVersion: string;
  /** Revision read before this observation's own audit event. */
  revision: number;
  catalogFingerprint: string;
  scopeFingerprint: string;
  targetsFingerprint: string;
  frameworks: FrameworkScoreObservation[];
}

export interface ScoreHistory {
  workspaceId: string;
  /** The latest bounded observations, oldest first. */
  observations: ScoreObservation[];
  hasOlder: boolean;
}
