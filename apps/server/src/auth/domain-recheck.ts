/**
 * Re-checks of SSO domains proven by DNS: what one lookup says, and what it does to a domain's
 * verification record. Pure: AuthService.recheckDueDomains claims, looks up and records.
 *
 * A domain whose record is missing is "failing" from the first miss; if it is still missing
 * when its grace period ends it "lapses": it admits no one new and holds no claim, but keeps
 * routing its members (storage: byDomain) so nobody is locked out. DNS trouble never counts.
 */
import type { DomainVerification } from "../storage/index.ts";

export type LookupOutcome = "found" | "missing" | "unknown";
export type RecheckEvent = "failing" | "lapsed" | "recovered";
export type DomainStanding = "pending" | "verified" | "failing" | "lapsed" | "not-proven";
export interface RecheckSettings {
  intervalMs: number;
  graceMs: number;
}

/** How soon a lookup that got no clean answer is tried again. */
export const RETRY_MS = 3_600_000;

export function classifyLookup(result: { records: string[][] } | { error: unknown }, expected: string): { outcome: LookupOutcome; code?: string } {
  if ("records" in result) return { outcome: result.records.some((chunks) => chunks.join("") === expected) ? "found" : "missing" };
  const code = (result.error as { code?: string }).code;
  return code === "ENOTFOUND" || code === "ENODATA" ? { outcome: "missing", code } : { outcome: "unknown", code };
}

const iso = (ms: number) => new Date(ms).toISOString();

export function applyOutcome(v: DomainVerification, outcome: LookupOutcome, at: Date, s: RecheckSettings): { next: DomainVerification; event?: RecheckEvent } {
  const t = at.getTime();
  if (outcome === "unknown") return { next: { ...v, nextCheckAt: iso(t + Math.min(RETRY_MS, s.intervalMs)) } };
  const checked = { ...v, lastCheckedAt: iso(t), nextCheckAt: iso(t + s.intervalMs) };
  if (outcome === "found") {
    const { failingSince, lapsesAt, lapsedAt, ...rest } = checked;
    const wasDown = !!(failingSince || lapsedAt);
    return { next: { ...rest, verifiedAt: v.verifiedAt ?? iso(t), method: "dns" }, event: wasDown ? "recovered" : undefined };
  }
  if (v.lapsedAt) return { next: checked };
  if (!v.failingSince) return { next: { ...checked, failingSince: iso(t), lapsesAt: iso(t + s.graceMs) }, event: "failing" };
  if (v.lapsesAt && t >= Date.parse(v.lapsesAt)) {
    const { verifiedAt, lapsesAt, ...rest } = checked;
    return { next: { ...rest, lapsedAt: iso(t) }, event: "lapsed" };
  }
  return { next: checked };
}

export function standingOf(v: DomainVerification | undefined): DomainStanding {
  if (!v) return "pending";
  if (v.lapsedAt) return "lapsed";
  if (!v.verifiedAt) return "pending";
  if (v.method === "grandfathered" || v.method === "trusted") return "not-proven";
  return v.failingSince ? "failing" : "verified";
}
