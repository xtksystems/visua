import type { FrameworkScoreObservation, ScoreObservation } from "@visua/core";

export interface HistoryPoint {
  observation: ScoreObservation;
  framework: FrameworkScoreObservation;
  /** Reasons this observation must not be connected to the preceding point. */
  breaks: string[];
}
export function scoreHistoryPoints(observations: ScoreObservation[], frameworkId: string): HistoryPoint[] {
  const points: HistoryPoint[] = [];
  let previous: HistoryPoint | undefined;
  let absent = false;
  for (const observation of observations) {
    const framework = observation.frameworks.find(item => item.frameworkId === frameworkId);
    if (!framework) { if (previous) absent = true; continue; }
    const breaks: string[] = [];
    if (previous) {
      if (absent) breaks.push("Framework absent from intervening observations");
      if (previous.observation.formulaVersion !== observation.formulaVersion) breaks.push("Calculation changed");
      if (previous.framework.catalogFingerprint !== framework.catalogFingerprint) breaks.push("Catalog changed");
      if (previous.framework.scopeFingerprint !== framework.scopeFingerprint) breaks.push("Scope changed");
      if (previous.framework.targetsFingerprint !== framework.targetsFingerprint) breaks.push("Targets or priorities changed");
      if (Date.parse(observation.observedAt) - Date.parse(previous.observation.observedAt) > 36 * 60 * 60_000) breaks.push("More than 36 hours between observations");
    }
    const point = { observation, framework, breaks };
    points.push(point); previous = point; absent = false;
  }
  return points;
}
export const historyPercent = (value: number | null) => value === null ? "No scope" : `${Math.round(value * 100)}%`;
export const historyTime = (value: string) => new Date(value).toLocaleString("en-US", { timeZone: "UTC", year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }) + " UTC";
