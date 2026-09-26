import type { Status } from "@visua/core";

export const STATUS_LABEL: Record<Status, string> = {
  "not-started": "Not started",
  "in-progress": "In progress",
  implemented: "Implemented",
  verified: "Verified",
  "at-risk": "At risk",
  "not-applicable": "Not applicable",
};

export const pct = (v: number | undefined, digits = 0) => `${((v ?? 0) * 100).toFixed(digits)}%`;

export type Family = "csf" | "soc2" | "rmf" | "ai" | "law" | "threat";
const THREAT_CATALOGS = new Set(["mitre-atlas", "owasp-llm-top10", "owasp-agentic-top10", "nist-ai-100-2"]);

export function familyOf(frameworkId: string): Family {
  if (frameworkId.startsWith("aicpa")) return "soc2";
  if (frameworkId.startsWith("nist-csf")) return "csf";
  if (frameworkId === "nist-ai-100-2" || THREAT_CATALOGS.has(frameworkId)) return "threat";
  if (frameworkId.startsWith("nist-ai")) return "ai";
  if (frameworkId.startsWith("us-state")) return "law";
  return "rmf";
}

export const FRAMEWORK_SHORT: Record<string, string> = {
  "nist-csf-2.0": "CSF 2.0",
  "aicpa-tsc-2017": "SOC 2",
  "nist-sp-800-53-r5": "SP 800-53",
  "nist-rmf": "RMF",
  "nist-ai-rmf": "AI RMF",
  "us-state-ai-laws": "State AI laws",
  "mitre-atlas": "ATLAS",
  "owasp-llm-top10": "OWASP LLM",
  "owasp-agentic-top10": "OWASP Agentic",
  "nist-ai-100-2": "AI 100-2",
};

export function codeOf(id: string): string {
  const i = id.lastIndexOf(":");
  return i === -1 ? id : id.slice(i + 1);
}
export function frameworkOf(id: string): string {
  const i = id.lastIndexOf(":");
  return i === -1 ? "" : id.slice(0, i);
}

export function relativeTime(iso: string | undefined, now = Date.now()): string {
  if (!iso) return "—";
  const diff = new Date(iso).getTime() - now;
  const abs = Math.abs(diff);
  const units: [number, Intl.RelativeTimeFormatUnit][] = [
    [60_000, "second"],
    [3_600_000, "minute"],
    [86_400_000, "hour"],
    [2_592_000_000, "day"],
    [31_536_000_000, "month"],
    [Infinity, "year"],
  ];
  const fmt = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  let prev = 1000;
  for (const [limit, unit] of units) {
    if (abs < limit) return fmt.format(Math.round(diff / prev), unit);
    prev = limit;
  }
  return iso.slice(0, 10);
}

export const shortDate = (iso: string | undefined) =>
  iso ? new Date(iso).toLocaleDateString("en", { month: "short", day: "numeric", year: new Date(iso).getFullYear() !== new Date().getFullYear() ? "numeric" : undefined }) : "—";

export function truncate(text: string, n: number): string {
  const t = text.replace(/\s+/g, " ").trim();
  return t.length > n ? `${t.slice(0, n - 1)}…` : t;
}

export const TASK_STATUS_LABEL: Record<string, string> = {
  backlog: "Backlog",
  todo: "To do",
  "in-progress": "In progress",
  "in-review": "In review",
  done: "Done",
  blocked: "Blocked",
};
