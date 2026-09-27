import { describe, expect, it } from "vitest";
import { loadAuthConfig } from "../src/auth/config.ts";
import { applyOutcome, classifyLookup, standingOf } from "../src/auth/domain-recheck.ts";

const DAY = 86_400_000;
const s = { intervalMs: DAY, graceMs: 7 * DAY };
const t0 = new Date("2026-10-01T00:00:00.000Z");
const at = (days: number) => new Date(t0.getTime() + days * DAY);
const proven = { token: "a".repeat(32), verifiedAt: "2026-09-01T00:00:00.000Z", method: "dns" as const, nextCheckAt: t0.toISOString() };

describe("classifying a TXT lookup", () => {
  const expected = "visua-domain-verification=abc";
  it("finds the exact value among the records, joining split strings", () => {
    expect(classifyLookup({ records: [["other"], ["visua-domain-", "verification=abc"]] }, expected).outcome).toBe("found");
  });
  it("counts only a clean negative answer as missing", () => {
    expect(classifyLookup({ records: [["visua-domain-verification=zzz"]] }, expected).outcome).toBe("missing");
    expect(classifyLookup({ error: Object.assign(new Error("x"), { code: "ENOTFOUND" }) }, expected).outcome).toBe("missing");
    expect(classifyLookup({ error: Object.assign(new Error("x"), { code: "ENODATA" }) }, expected).outcome).toBe("missing");
  });
  it("treats timeouts and server failures as unknown", () => {
    expect(classifyLookup({ error: Object.assign(new Error("x"), { code: "ETIMEOUT" }) }, expected)).toEqual({ outcome: "unknown", code: "ETIMEOUT" });
    expect(classifyLookup({ error: Object.assign(new Error("x"), { code: "ESERVFAIL" }) }, expected).outcome).toBe("unknown");
    expect(classifyLookup({ error: new Error("no code") }, expected).outcome).toBe("unknown");
  });
});

describe("what one re-check does to a domain", () => {
  it("keeps a found domain verified and schedules the next check", () => {
    const { next, event } = applyOutcome(proven, "found", t0, s);
    expect(event).toBeUndefined();
    expect(next).toMatchObject({ verifiedAt: proven.verifiedAt, lastCheckedAt: t0.toISOString(), nextCheckAt: at(1).toISOString() });
    expect(standingOf(next)).toBe("verified");
  });

  it("starts a failure at the first miss, lapses it at the end of the grace period, and recovers it", () => {
    const first = applyOutcome(proven, "missing", t0, s);
    expect(first.event).toBe("failing");
    expect(first.next).toMatchObject({ verifiedAt: proven.verifiedAt, failingSince: t0.toISOString(), lapsesAt: at(7).toISOString() });
    expect(standingOf(first.next)).toBe("failing");
    const middle = applyOutcome(first.next, "missing", at(3), s);
    expect(middle.event).toBeUndefined();
    expect(middle.next.failingSince).toBe(t0.toISOString());
    const lapsed = applyOutcome(middle.next, "missing", at(7), s);
    expect(lapsed.event).toBe("lapsed");
    expect(lapsed.next.verifiedAt).toBeUndefined();
    expect(lapsed.next).toMatchObject({ lapsedAt: at(7).toISOString(), nextCheckAt: at(8).toISOString() });
    expect(standingOf(lapsed.next)).toBe("lapsed");
    expect(applyOutcome(lapsed.next, "missing", at(8), s).event).toBeUndefined();
    const back = applyOutcome(lapsed.next, "found", at(9), s);
    expect(back.event).toBe("recovered");
    expect(back.next).toMatchObject({ verifiedAt: at(9).toISOString(), method: "dns" });
    expect(back.next.lapsedAt ?? back.next.failingSince ?? back.next.lapsesAt).toBeUndefined();
    expect(standingOf(back.next)).toBe("verified");
  });

  it("recovers a failing domain without changing when it was proven", () => {
    const failing = applyOutcome(proven, "missing", t0, s).next;
    const back = applyOutcome(failing, "found", at(2), s);
    expect(back.event).toBe("recovered");
    expect(back.next.verifiedAt).toBe(proven.verifiedAt);
  });

  it("lets DNS trouble neither start nor advance a failure", () => {
    const unknown = applyOutcome(proven, "unknown", t0, s);
    expect(unknown.event).toBeUndefined();
    expect(unknown.next).toEqual({ ...proven, nextCheckAt: new Date(t0.getTime() + 3_600_000).toISOString() });
    // Days of timeouts after a first miss never lapse the domain.
    let v = applyOutcome(proven, "missing", t0, s).next;
    for (let d = 1; d <= 10; d++) v = applyOutcome(v, "unknown", at(d), s).next;
    expect(standingOf(v)).toBe("failing");
  });

  it("names the standing of domains that were never looked up", () => {
    expect(standingOf(undefined)).toBe("pending");
    expect(standingOf({ token: "t" })).toBe("pending");
    expect(standingOf({ token: "t", verifiedAt: "x", method: "grandfathered" })).toBe("not-proven");
    expect(standingOf({ token: "t", verifiedAt: "x", method: "trusted" })).toBe("not-proven");
  });
});

describe("re-check settings", () => {
  it("checks daily and lapses after a week by default", () => {
    expect(loadAuthConfig({})).toMatchObject({ domainRecheckHours: 24, domainRecheckGraceDays: 7 });
  });
  it("turns re-checking off with 0 and ignores nonsense", () => {
    expect(loadAuthConfig({ VISUA_SSO_DOMAIN_RECHECK_HOURS: "0" }).domainRecheckHours).toBe(0);
    expect(loadAuthConfig({ VISUA_SSO_DOMAIN_RECHECK_HOURS: "-3", VISUA_SSO_DOMAIN_RECHECK_GRACE_DAYS: "soon" })).toMatchObject({ domainRecheckHours: 24, domainRecheckGraceDays: 7 });
    expect(loadAuthConfig({ VISUA_SSO_DOMAIN_RECHECK_HOURS: "6", VISUA_SSO_DOMAIN_RECHECK_GRACE_DAYS: "14" })).toMatchObject({ domainRecheckHours: 6, domainRecheckGraceDays: 14 });
  });
});
