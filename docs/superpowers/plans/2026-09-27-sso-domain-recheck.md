# SSO Domain Re-check Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Re-check SSO domains proven by DNS every day; a domain whose TXT record stays missing past a grace period lapses (admits no one new, releases its claim) but keeps routing its members, so nobody is locked out.

**Architecture:** The connection's JSON `verification[domain]` record holds the schedule and standing; `SsoConnections.put()` mirrors `next_check_at` and `lapsed_at` into `sso_domains` columns (migration 4) for querying and routing. A pure module (`auth/domain-recheck.ts`) decides what one lookup outcome does to a record; `AuthService.recheckDueDomains(at)` claims due domains under the `sso-domains` lock, looks them up outside any transaction, and records each result in its own transaction with an audit entry. A ticker in `index.ts` calls it every 10 minutes on every instance.

**Tech Stack:** Node 22+/26 native TypeScript, Hono, `node:sqlite` and Postgres through `apps/server/src/storage`, Vitest, React (web), Playwright (existing e2e only).

**Spec:** `docs/superpowers/specs/2026-09-27-sso-domain-recheck-design.md`

Two details differ from the spec's wording, on purpose: the lapse date is stored as `lapsesAt` in the verification record (set at the first miss) instead of being computed from `failingSince` each time; and the routing query for a lapsed domain does not filter on the connection being enabled, because `discover()` already falls back to the platform provider for a disabled connection.

## Global Constraints

- Every state change goes through `AuthService.audit` → `VisuaService.log`, in the same transaction as the change (CLAUDE.md "Integrity").
- Never hold a transaction open across a network call: DNS lookups run outside `store.atomic`.
- `await` every store and service call.
- Colors only from DESIGN.md tokens; status chips always pair the glyph with a label (use `StatusChip`).
- Every workspace/tenant route keeps going through its existing guards; this plan adds no route.
- Settings: `VISUA_SSO_DOMAIN_RECHECK_HOURS` default `24`, `0` = off; `VISUA_SSO_DOMAIN_RECHECK_GRACE_DAYS` default `7`. With `VISUA_SSO_DOMAIN_VERIFICATION=off`, re-checking is off.
- Only a clean NXDOMAIN (`ENOTFOUND`), NODATA (`ENODATA`) or a TXT set without the expected value counts as missing; any other lookup error is "unknown" and only reschedules (backoff: `min(1 hour, interval)`).
- Only domains whose verification `method` is `"dns"` (or lapsed domains) are ever looked up; `grandfathered` and `trusted` never.
- Claim lease 15 minutes; batch 25 domains per claim; ticker every 10 minutes, first tick 30 s after start.
- Actor for audit entries: `Domain re-check`. Entity `sso-domain`, entity id = connection id, `data: { domain, record }`.
- Before each commit: `pnpm typecheck && pnpm test`. Before the PR: `pnpm check`, plus `pnpm screens` before and after (Task 5 changes the web app).
- Commit messages say why; end with the `Co-Authored-By` line used on this repository.

## Review Focus

1. **A connection edited while a re-check is in flight** (admin removes and re-adds the domain → new token): the stale result must be dropped, never applied to the new challenge. Pinned in Task 3 (test "drops a result when the challenge changed meanwhile").
2. **A "Require SSO" organization whose only domain lapses**: its linked owner must still sign in through the normal discovery path and be able to verify again. Pinned in Task 3 (test "keeps a Require-SSO organization signing in after its domain lapses").
3. **A DNS outage during the grace period** (timeouts for days): must neither start nor advance a failure, and must not lapse a domain whose last clean answer was "found". Pinned in Task 2 (pure) and Task 3 (API).
4. **Editing any connection field** (name, JIT, enabled) rewrites `sso_domains` rows: `next_check_at` and `lapsed_at` must survive, or re-checks silently stop / lapsed routing breaks. Pinned in Task 1.
5. **Another organization proves a lapsed domain, then the old owner's record reappears**: the old owner must not win it back, and must not be looked up again. Pinned in Task 3.

---

## File Structure

- Modify `apps/server/src/storage/identity.ts` — `DomainVerification` fields; `SsoConnections.put()`, `byDomain()`, new `dueForRecheck()`.
- Modify `apps/server/src/storage/migrations.ts` — migration 4.
- Create `apps/server/src/auth/domain-recheck.ts` — pure: lookup classification, outcome → next record, standing for the API.
- Modify `apps/server/src/auth/config.ts` — two settings.
- Modify `apps/server/src/auth/service.ts` — `lookupChallenge`, `verifySsoDomain` (clears failure, schedules), `recheckDueDomains`, `recordRecheck`, `publicConnection` fields.
- Create `apps/server/src/auth/recheck-ticker.ts` — the timer loop.
- Modify `apps/server/src/index.ts` — start the ticker.
- Create `apps/server/test/domain-recheck.test.ts` — pure-module and ticker tests.
- Create `apps/server/test/sso-recheck.test.ts` — API-level behaviour on SQLite and Postgres.
- Modify `apps/server/test/storage.test.ts` — migration 4 and `put()` columns.
- Modify `apps/web/src/pages/OrganizationPage.tsx` — standings and restore panels.
- Modify `README.md`, `docs/architecture.md`, `docs/roadmap.md`.

---

### Task 1: Storage — record fields, migration 4, routing of lapsed domains

**Files:**
- Modify: `apps/server/src/storage/identity.ts:60-72` (`DomainVerification`), `:264-303` (`byDomain`, `put`, new `dueForRecheck`)
- Modify: `apps/server/src/storage/migrations.ts:157` (add migration 4)
- Test: `apps/server/test/storage.test.ts` (new `describe` after the migration-3 block)

**Interfaces:**
- Produces:
  - `interface DomainVerification { token: string; verifiedAt?: string; method?: "dns" | "grandfathered" | "trusted"; lastCheckedAt?: string; nextCheckAt?: string; failingSince?: string; lapsesAt?: string; lapsedAt?: string }`
  - `SsoConnections.dueForRecheck(atIso: string, limit: number): Promise<{ connectionId: string; domain: string }[]>`
  - `SsoConnections.byDomain(domain)` now also returns the connection of the most recently lapsed claim when no connection holds the domain verified.

- [ ] **Step 1: Write the failing tests** (append to `apps/server/test/storage.test.ts`)

```ts
describe(`SSO domain re-check columns (${db.dialect})`, () => {
  const dir = mkdtempSync(join(tmpdir(), "visua-recheck-"));
  afterAll(() => rmSync(dir, { recursive: true, force: true }));
  const ts = "2026-09-01T00:00:00.000Z";
  const base = { tenantId: DEFAULT_TENANT_ID, issuer: "https://login.example", clientId: "visua", jitProvisioning: false, defaultRole: "viewer" as const, enabled: true, createdAt: ts, updatedAt: ts };

  it("keeps the schedule and a lapse in the domain rows when a connection is saved again", async () => {
    const sso = svc.store.identity.sso;
    await sso.put({ ...base, id: "sso_cols", name: "Cols", domains: ["cols.example"], verification: { "cols.example": { token: "a".repeat(32), verifiedAt: ts, method: "dns", nextCheckAt: "2026-09-02T00:00:00.000Z" } } });
    expect(await sso.dueForRecheck("2026-09-02T00:00:00.000Z", 25)).toContainEqual({ connectionId: "sso_cols", domain: "cols.example" });
    expect(await sso.dueForRecheck("2026-09-01T23:59:59.000Z", 25)).not.toContainEqual({ connectionId: "sso_cols", domain: "cols.example" });
    // An unrelated edit (rename) rewrites the rows: the schedule must survive.
    const c = (await sso.get("sso_cols"))!;
    await sso.put({ ...c, name: "Renamed" });
    expect(await sso.dueForRecheck("2026-09-02T00:00:00.000Z", 25)).toContainEqual({ connectionId: "sso_cols", domain: "cols.example" });
    await sso.delete(DEFAULT_TENANT_ID, "sso_cols");
  });

  it("routes a lapsed domain to its connection until another connection proves it", async () => {
    const sso = svc.store.identity.sso;
    const lapsed = { token: "b".repeat(32), method: "dns" as const, lapsedAt: "2026-09-10T00:00:00.000Z", nextCheckAt: "2026-09-11T00:00:00.000Z" };
    await sso.put({ ...base, id: "sso_old", name: "Old", domains: ["lapse.example"], verification: { "lapse.example": lapsed } });
    expect((await sso.byDomain("lapse.example"))?.id).toBe("sso_old");
    expect(await sso.domainOwner("lapse.example")).toBeUndefined();
    // Another connection may now prove it (the verified unique index does not see a lapsed row)...
    await sso.put({ ...base, id: "sso_new", name: "New", domains: ["lapse.example"], verification: { "lapse.example": { token: "c".repeat(32), verifiedAt: ts, method: "dns" } } });
    // ...and then routing moves to it.
    expect((await sso.byDomain("lapse.example"))?.id).toBe("sso_new");
    await sso.delete(DEFAULT_TENANT_ID, "sso_old");
    await sso.delete(DEFAULT_TENANT_ID, "sso_new");
  });

  it("schedules the first re-check of every DNS-verified domain within a day when upgrading", async () => {
    const target = TEST_PG_URL ? await testDatabase("recheckmig") : { url: join(dir, "recheck.db"), cleanup: async () => undefined };
    const J = TEST_PG_URL ? "?::jsonb" : "?";
    const old = TEST_PG_URL ? new PostgresDriver(target.url) : new SqliteDriver(target.url);
    await old.execute(`CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER PRIMARY KEY, name TEXT NOT NULL, applied_at TEXT NOT NULL)`);
    for (const m of MIGRATIONS.filter((m) => m.version < 4)) {
      await old.transaction(async (tx) => {
        await m.up(tx);
        await tx.execute(`INSERT INTO schema_migrations (version, name, applied_at) VALUES (?, ?, ?)`, [m.version, m.name, ts]);
      });
    }
    await old.execute(`INSERT INTO tenants (id, slug, data, created_at, updated_at) VALUES (?, ?, ${J}, ?, ?)`, ["tnt_m4", "m4", JSON.stringify({ id: "tnt_m4", slug: "m4", name: "M4", settings: {}, createdAt: ts, updatedAt: ts }), ts, ts]);
    const conn = {
      ...base, id: "sso_m4", tenantId: "tnt_m4", name: "M4", domains: ["dns-m4.example", "old-m4.example"],
      verification: { "dns-m4.example": { token: "d".repeat(32), verifiedAt: ts, method: "dns" }, "old-m4.example": { token: "e".repeat(32), verifiedAt: ts, method: "grandfathered" } },
    };
    await old.execute(`INSERT INTO sso_connections (id, tenant_id, data, created_at, updated_at) VALUES (?, ?, ${J}, ?, ?)`, [conn.id, conn.tenantId, JSON.stringify(conn), ts, ts]);
    for (const d of conn.domains) await old.execute(`INSERT INTO sso_domains (domain, connection_id, tenant_id, verified_at) VALUES (?, ?, ?, ?)`, [d, conn.id, conn.tenantId, ts]);
    await old.close();

    const before = Date.now();
    const upgraded = await createService({ database: target.url, registry });
    try {
      const v = (await upgraded.store.identity.sso.get("sso_m4"))!.verification!;
      const next = Date.parse(v["dns-m4.example"]!.nextCheckAt!);
      expect(next).toBeGreaterThanOrEqual(before - 1000);
      expect(next).toBeLessThanOrEqual(Date.now() + 24 * 3_600_000);
      expect(v["old-m4.example"]!.nextCheckAt).toBeUndefined();
      const due = await upgraded.store.identity.sso.dueForRecheck(new Date(Date.now() + 25 * 3_600_000).toISOString(), 25);
      expect(due).toEqual([{ connectionId: "sso_m4", domain: "dns-m4.example" }]);
    } finally {
      await upgraded.store.close();
      await target.cleanup();
    }
  });
});
```

Add `DEFAULT_TENANT_ID` to the imports from `../src/storage/index.ts` if not already imported (check the file's import block first; `testDatabase`, `TEST_PG_URL`, `PostgresDriver`, `SqliteDriver`, `MIGRATIONS`, `mkdtempSync`, `rmSync`, `tmpdir`, `join` are already imported for the migration-3 test).

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run apps/server/test/storage.test.ts -t "re-check columns"`
Expected: FAIL — `sso.dueForRecheck is not a function`.

- [ ] **Step 3: Implement**

In `identity.ts`, extend the interface (keep its doc comment, add one line per field):

```ts
export interface DomainVerification {
  token: string;
  verifiedAt?: string;
  method?: "dns" | "grandfathered" | "trusted";
  /** Last re-check that got an answer (found or missing). */
  lastCheckedAt?: string;
  /** When the domain is next looked up (DNS-proven and lapsed domains only). */
  nextCheckAt?: string;
  /** First re-check of the current failure that did not find the record. */
  failingSince?: string;
  /** When a failing domain lapses unless its record comes back. */
  lapsesAt?: string;
  /** When it lapsed: it then admits no one new and holds no claim (verifiedAt is cleared). */
  lapsedAt?: string;
}
```

`put()`: write the two columns.

```ts
      for (const d of c.domains) {
        const v = c.verification?.[d];
        await this.db.execute(`INSERT INTO sso_domains (domain, connection_id, tenant_id, verified_at, lapsed_at, next_check_at) VALUES (?, ?, ?, ?, ?, ?)`, [
          d.toLowerCase(),
          c.id,
          c.tenantId,
          v?.verifiedAt ?? null,
          v?.lapsedAt ?? null,
          v?.nextCheckAt ?? null,
        ]);
      }
```

`byDomain()`: verified first, else the latest lapsed.

```ts
  /**
   * The connection people of a domain are sent to: the one that has verified it, else the one
   * whose proof lapsed most recently (its members keep signing in until someone proves the domain).
   */
  async byDomain(domain: string): Promise<SsoConnection | undefined> {
    const [row] = await this.db.query<DataRow>(
      `SELECT c.data FROM sso_domains d JOIN sso_connections c ON c.id = d.connection_id
       WHERE d.domain = ? AND (d.verified_at IS NOT NULL OR d.lapsed_at IS NOT NULL)
       ORDER BY CASE WHEN d.verified_at IS NOT NULL THEN 0 ELSE 1 END, d.lapsed_at DESC LIMIT 1`,
      [domain.toLowerCase()],
    );
    return row ? parseJson<SsoConnection>(row.data) : undefined;
  }
```

New method after `claimants()`:

```ts
  /** Domains whose re-check is due at `atIso`, oldest first. */
  async dueForRecheck(atIso: string, limit: number): Promise<{ connectionId: string; domain: string }[]> {
    const rows = await this.db.query<{ connection_id: string; domain: string }>(
      `SELECT connection_id, domain FROM sso_domains WHERE next_check_at IS NOT NULL AND next_check_at <= ? ORDER BY next_check_at LIMIT ?`,
      [atIso, limit],
    );
    return rows.map((r) => ({ connectionId: r.connection_id, domain: r.domain }));
  }
```

In `migrations.ts`, before `export const MIGRATIONS`:

```ts
/**
 * Domains proven by DNS are looked at again periodically (auth/service.ts: recheckDueDomains).
 * The schedule and a lapse live in each connection's verification record and are mirrored
 * here for querying and routing. Each DNS-proven domain gets a first re-check spread over
 * the next day by a stable hash, so an upgrade does not look up every domain at once.
 */
const ssoDomainRecheck: Migration = {
  version: 4,
  name: "SSO domains re-checked: schedule and lapse columns",
  async up(db) {
    await run(db, [
      `ALTER TABLE sso_domains ADD COLUMN lapsed_at TEXT`,
      `ALTER TABLE sso_domains ADD COLUMN next_check_at TEXT`,
      `CREATE INDEX sso_domains_next_check ON sso_domains(next_check_at)`,
    ]);
    const start = Date.now();
    const cast = db.dialect === "postgres" ? "?::jsonb" : "?";
    for (const row of await db.query<{ id: string; data: unknown }>(`SELECT id, data FROM sso_connections`)) {
      const connection = parseJson<{ domains?: string[]; verification?: Record<string, { method?: string; verifiedAt?: string; nextCheckAt?: string }> }>(row.data);
      const verification = { ...(connection.verification ?? {}) };
      let changed = false;
      for (const d of connection.domains ?? []) {
        const v = verification[d];
        if (!v?.verifiedAt || v.method !== "dns" || v.nextCheckAt) continue;
        const offset = createHash("sha256").update(`${d}|${row.id}`).digest().readUInt32BE(0) % 86_400_000;
        const nextCheckAt = new Date(start + offset).toISOString();
        verification[d] = { ...v, nextCheckAt };
        await db.execute(`UPDATE sso_domains SET next_check_at = ? WHERE domain = ? AND connection_id = ?`, [nextCheckAt, d.toLowerCase(), row.id]);
        changed = true;
      }
      if (changed) await db.execute(`UPDATE sso_connections SET data = ${cast} WHERE id = ?`, [JSON.stringify({ ...connection, verification }), row.id]);
    }
  },
};

export const MIGRATIONS: Migration[] = [baseline, tenantSettings, ssoDomainVerification, ssoDomainRecheck];
```

Add `createHash` to the existing `node:crypto` import in `migrations.ts` (it already imports `randomBytes`).

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run apps/server/test/storage.test.ts`
Expected: PASS (all storage tests, including migration 3's).
Then on Postgres: `docker start visua-pg-test` (or recreate it, see the memory note) and `VISUA_TEST_DATABASE_URL=postgres://visua:visua@127.0.0.1:55432/visua_test npx vitest run apps/server/test/storage.test.ts`. Expected: PASS. Never use port 5432.

- [ ] **Step 5: Commit**

```bash
pnpm typecheck && pnpm test
git add apps/server/src/storage/identity.ts apps/server/src/storage/migrations.ts apps/server/test/storage.test.ts
git commit   # "Storage for SSO domain re-checks: schedule and lapse, lapsed domains keep routing" + why
```

---

### Task 2: Pure re-check rules and settings

**Files:**
- Create: `apps/server/src/auth/domain-recheck.ts`
- Modify: `apps/server/src/auth/config.ts` (header comment, `AuthConfig`, `loadAuthConfig`)
- Test: `apps/server/test/domain-recheck.test.ts`

**Interfaces:**
- Consumes: `DomainVerification` (Task 1).
- Produces:
  - `type LookupOutcome = "found" | "missing" | "unknown"`
  - `function classifyLookup(result: { records: string[][] } | { error: unknown }, expected: string): { outcome: LookupOutcome; code?: string }`
  - `interface RecheckSettings { intervalMs: number; graceMs: number }`
  - `type RecheckEvent = "failing" | "lapsed" | "recovered"`
  - `function applyOutcome(v: DomainVerification, outcome: LookupOutcome, at: Date, s: RecheckSettings): { next: DomainVerification; event?: RecheckEvent }`
  - `type DomainStanding = "pending" | "verified" | "failing" | "lapsed" | "not-proven"`
  - `function standingOf(v: DomainVerification | undefined): DomainStanding`
  - `const RETRY_MS = 3_600_000`
  - `AuthConfig.domainRecheckHours: number` (0 = off), `AuthConfig.domainRecheckGraceDays: number`

- [ ] **Step 1: Write the failing tests** (`apps/server/test/domain-recheck.test.ts`)

```ts
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
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run apps/server/test/domain-recheck.test.ts`
Expected: FAIL — cannot resolve `../src/auth/domain-recheck.ts`.

- [ ] **Step 3: Implement** `apps/server/src/auth/domain-recheck.ts`

```ts
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
```

Note: in the lapsed branch, `failingSince` is kept on purpose (the audit summary and the UI say since when the record has been missing); `standingOf` checks `lapsedAt` first.

`config.ts`: header lines after `VISUA_SSO_DOMAIN_VERIFICATION`:

```
 *   VISUA_SSO_DOMAIN_RECHECK_HOURS  how often a domain proven by DNS is looked up again (default 24; 0 = never)
 *   VISUA_SSO_DOMAIN_RECHECK_GRACE_DAYS  how long its record may be missing before the domain lapses (default 7)
```

`AuthConfig`:

```ts
  /** Hours between re-checks of a DNS-proven SSO domain; 0 turns re-checking off. */
  domainRecheckHours: number;
  /** Days a domain's record may be missing before the domain lapses. */
  domainRecheckGraceDays: number;
```

`loadAuthConfig` (next to `number`):

```ts
  const hours = Number(env["VISUA_SSO_DOMAIN_RECHECK_HOURS"]);
  ...
    domainRecheckHours: env["VISUA_SSO_DOMAIN_RECHECK_HOURS"] !== undefined && Number.isFinite(hours) && hours >= 0 ? hours : 24,
    domainRecheckGraceDays: number("VISUA_SSO_DOMAIN_RECHECK_GRACE_DAYS", 7),
```

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run apps/server/test/domain-recheck.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
pnpm typecheck && pnpm test
git add apps/server/src/auth/domain-recheck.ts apps/server/src/auth/config.ts apps/server/test/domain-recheck.test.ts
git commit   # "The rules of an SSO domain re-check, and its two settings" + why
```

---

### Task 3: AuthService — scheduled re-checks, manual verify, API standing

**Files:**
- Modify: `apps/server/src/auth/service.ts` (`publicConnection` ~l.57, `verifySsoDomain` ~l.476-506, new methods after it)
- Test: `apps/server/test/sso-recheck.test.ts` (new)

**Interfaces:**
- Consumes: Task 1 (`dueForRecheck`, `byDomain`, fields), Task 2 (`classifyLookup`, `applyOutcome`, `standingOf`, `RETRY_MS`, config fields).
- Produces:
  - `AuthService.domainRechecksEnabled: boolean` (getter: `config.ssoDomainVerification === "dns" && config.domainRecheckHours > 0`)
  - `AuthService.recheckDueDomains(at?: Date): Promise<number>` — number of domains claimed (0..`RECHECK_BATCH`)
  - `export const RECHECK_BATCH = 25`
  - `publicConnection(c).domainStatus[i]` gains `standing: DomainStanding`, `lastCheckedAt?`, `failingSince?`, `lapsesAt?`, `lapsedAt?`, `takenOver: boolean`

- [ ] **Step 1: Write the failing tests** (`apps/server/test/sso-recheck.test.ts`)

The suite copies the setup of `auth.test.ts` (own database, mock IdP, a controllable `txt` map) and adds a lookup counter and error injection.

```ts
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { FrameworkRegistry } from "@visua/frameworks";
import { createApp } from "../src/app.ts";
import { loadAuthConfig } from "../src/auth/config.ts";
import { AuthService } from "../src/auth/service.ts";
import { createService } from "../src/context.ts";
import { TestClient } from "./client.ts";
import { TEST_PG_URL, testDatabase } from "./db.ts";
import { startMockIdp } from "./mock-idp.ts";

process.env["VISUA_AGENT_MODE"] = "offline";

const registry = FrameworkRegistry.load();
const db = await testDatabase("recheck");
const svc = await createService({ database: db.url, registry });
const idp = await startMockIdp();
const txt = new Map<string, string[]>();
const failing = new Map<string, string>(); // name → error code to throw
const lookups: string[] = [];
const resolveTxt = async (name: string) => {
  lookups.push(name);
  const code = failing.get(name);
  if (code) throw Object.assign(new Error(`queryTxt ${code} ${name}`), { code });
  const values = txt.get(name);
  if (!values) throw Object.assign(new Error(`queryTxt ENOTFOUND ${name}`), { code: "ENOTFOUND" });
  return values.map((v) => [v]);
};
const config = {
  ...loadAuthConfig({}),
  mode: "dev" as const,
  allowHttpIssuers: true,
  privateIssuerHosts: [new URL(idp.issuer).hostname],
  platform: { issuer: idp.issuer, clientId: idp.clientId, clientSecret: idp.clientSecret, name: "Test IdP" },
};
const auth = new AuthService(svc, config, { resolveTxt });
const app = createApp(svc, auth);

afterAll(async () => {
  await idp.close();
  await svc.store.close();
  await db.cleanup();
});

const DAY = 86_400_000;
type Me = { user: { id: string; email: string }; activeTenant: { id: string; role: string } | null };
type DomainStatus = { domain: string; verified: boolean; standing: string; lapsesAt?: string; takenOver: boolean; record?: { name: string; value: string } };
type ConnectionJson = { id: string; domainStatus: DomainStatus[] };

async function signIn(email: string) {
  const c = new TestClient(app);
  expect((await c.devLogin(email)).status).toBe(200);
  return c;
}
async function oidcSignIn(connection: string, user: { sub: string; email: string }) {
  const c = new TestClient(app);
  idp.signInAs({ ...user, email_verified: true });
  const start = await c.get(`/api/auth/oidc/start?connection=${connection}&returnTo=%2F`);
  const done = await c.get(await idp.authorize(start.headers.get("location")!));
  const me = await c.get<Me & { csrf: string }>("/api/auth/me");
  if (me.json) c.csrf = me.json.csrf;
  return { client: c, redirect: done.headers.get("location")!, me };
}
/** An organization with one SSO connection whose domain is proven by DNS. */
async function provenOrg(owner: string, domain: string) {
  const client = await signIn(owner);
  const tenant = (await client.get<Me>("/api/auth/me")).json.activeTenant!.id;
  const created = await client.post<ConnectionJson>(`/api/tenants/${tenant}/sso`, { name: `${domain} SSO`, issuer: idp.issuer, clientId: idp.clientId, clientSecret: idp.clientSecret, domains: [domain], jitProvisioning: true });
  expect(created.status).toBe(201);
  const record = created.json.domainStatus[0]!.record!;
  txt.set(record.name, [record.value]);
  const verified = await client.post<ConnectionJson>(`/api/tenants/${tenant}/sso/${created.json.id}/domains/${domain}/verify`);
  expect(verified.status).toBe(200);
  return { client, tenant, connection: verified.json, record };
}
const status = async (client: TestClient, tenant: string, id: string) =>
  (await client.get<{ connections: ConnectionJson[] }>(`/api/tenants/${tenant}/sso`)).json.connections.find((c) => c.id === id)!.domainStatus[0]!;
const trail = async (client: TestClient, tenant: string) => (await client.get<{ action: string; actor: string; summary: string }[]>(`/api/tenants/${tenant}/activity`)).json;
/** Run every re-check due at `at` (the ticker does this every 10 minutes). */
async function recheckAll(at: Date, via = auth) {
  let n = 0;
  while ((n = await via.recheckDueDomains(at)) > 0);
}

describe("re-checking SSO domains proven by DNS", () => {
  it("looks a proven domain up again after a day and keeps it verified while the record is there", async () => {
    const { client, tenant, connection, record } = await provenOrg("pat@found.example", "found-sso.example");
    lookups.length = 0;
    await recheckAll(new Date(Date.now() + DAY / 2));
    expect(lookups).not.toContain(record.name);
    await recheckAll(new Date(Date.now() + DAY + 60_000));
    expect(lookups.filter((n) => n === record.name)).toHaveLength(1);
    expect(await status(client, tenant, connection.id)).toMatchObject({ standing: "verified", verified: true });
  });

  it("marks a missing record failing, lapses it after the grace period, and keeps members signing in", async () => {
    const { client, tenant, connection, record } = await provenOrg("quinn@lapse.example", "lapse-sso.example");
    const member = await oidcSignIn(connection.id, { sub: "okta|rhea", email: "rhea@lapse-sso.example" });
    expect(member.me.json?.user.email).toBe("rhea@lapse-sso.example");
    txt.delete(record.name);
    const t = Date.now();
    await recheckAll(new Date(t + DAY + 60_000));
    const failingNow = await status(client, tenant, connection.id);
    expect(failingNow).toMatchObject({ standing: "failing", verified: true });
    expect(Date.parse(failingNow.lapsesAt!)).toBeCloseTo(t + 8 * DAY + 60_000, -5);
    expect((await trail(client, tenant)).some((e) => e.action === "failing" && e.actor === "Domain re-check" && e.summary.includes("lapse-sso.example"))).toBe(true);
    // Still failing, still admitting, still routing.
    expect((await new TestClient(app).post<{ connection: string }>("/api/auth/sso/discover", { email: "new@lapse-sso.example" })).json.connection).toBe(connection.id);
    for (let d = 2; d <= 8; d++) await recheckAll(new Date(t + d * DAY + 120_000));
    expect(await status(client, tenant, connection.id)).toMatchObject({ standing: "lapsed", verified: false, takenOver: false });
    expect((await trail(client, tenant)).some((e) => e.action === "lapsed" && e.summary.includes("lapse-sso.example"))).toBe(true);
    // Lapsed: a new person is refused, a linked member still gets in, and the domain still routes.
    const stranger = await oidcSignIn(connection.id, { sub: "okta|sam", email: "sam@lapse-sso.example" });
    expect(decodeURIComponent(stranger.redirect)).toContain("no verified email domain");
    const again = await oidcSignIn(connection.id, { sub: "okta|rhea", email: "rhea@lapse-sso.example" });
    expect(again.me.json?.user.email).toBe("rhea@lapse-sso.example");
    expect((await new TestClient(app).post<{ connection: string }>("/api/auth/sso/discover", { email: "rhea@lapse-sso.example" })).json.connection).toBe(connection.id);
    // The record comes back: the next re-check recovers the domain.
    txt.set(record.name, [record.value]);
    await recheckAll(new Date(t + 10 * DAY));
    expect(await status(client, tenant, connection.id)).toMatchObject({ standing: "verified", verified: true });
    expect((await trail(client, tenant)).some((e) => e.action === "recovered")).toBe(true);
  });

  it("never counts DNS trouble against a domain", async () => {
    const { client, tenant, connection, record } = await provenOrg("ravi@flaky.example", "flaky-sso.example");
    failing.set(record.name, "ETIMEOUT");
    const t = Date.now();
    for (let h = 24; h <= 24 * 10; h += 1) await recheckAll(new Date(t + h * 3_600_000 + 60_000));
    expect(await status(client, tenant, connection.id)).toMatchObject({ standing: "verified" });
    expect((await trail(client, tenant)).some((e) => e.action === "failing")).toBe(false);
    failing.delete(record.name);
  });

  it("keeps a Require-SSO organization signing in after its domain lapses, and lets its owner verify again", async () => {
    // The owner's address is in the SSO domain, so their first SSO sign-in links to their account.
    const { client, tenant, connection, record } = await provenOrg("sara@strict-sso.example", "strict-sso.example");
    const first = await oidcSignIn(connection.id, { sub: "okta|sara", email: "sara@strict-sso.example" });
    expect(first.me.json?.user.email).toBe("sara@strict-sso.example");
    expect((await client.patch(`/api/tenants/${tenant}`, { settings: { requireSso: true } })).status).toBe(200);
    txt.delete(record.name);
    const t = Date.now();
    for (let d = 1; d <= 9; d++) await recheckAll(new Date(t + d * DAY + 60_000));
    // The owner signs in the normal way: discovery still sends the domain to the connection.
    const found = await new TestClient(app).post<{ connection: string }>("/api/auth/sso/discover", { email: "sara@strict-sso.example" });
    expect(found.json.connection).toBe(connection.id);
    const owner = await oidcSignIn(found.json.connection, { sub: "okta|sara", email: "sara@strict-sso.example" });
    expect(owner.me.json?.activeTenant?.id).toBe(tenant);
    expect(await status(owner.client, tenant, connection.id)).toMatchObject({ standing: "lapsed" });
    // With "Require SSO" on, only that SSO session can manage the organization: it restores the record and verifies again.
    txt.set(record.name, [record.value]);
    const verified = await owner.client.post<ConnectionJson>(`/api/tenants/${tenant}/sso/${connection.id}/domains/strict-sso.example/verify`);
    expect(verified.status).toBe(200);
    expect(verified.json.domainStatus[0]).toMatchObject({ standing: "verified" });
  });

  it("lets another organization prove a lapsed domain, and never gives it back", async () => {
    const old = await provenOrg("uri@old-owner.example", "moved-sso.example");
    txt.delete(old.record.name);
    const t = Date.now();
    for (let d = 1; d <= 9; d++) await recheckAll(new Date(t + d * DAY + 60_000));
    expect(await status(old.client, old.tenant, old.connection.id)).toMatchObject({ standing: "lapsed" });
    const fresh = await provenOrg("vera@new-owner.example", "moved-sso.example");
    expect((await new TestClient(app).post<{ connection: string }>("/api/auth/sso/discover", { email: "x@moved-sso.example" })).json.connection).toBe(fresh.connection.id);
    // The old record reappears: the old connection is not looked up again and stays lapsed.
    txt.set(old.record.name, [old.record.value]);
    lookups.length = 0;
    for (let d = 10; d <= 12; d++) await recheckAll(new Date(t + d * DAY + 60_000));
    expect(lookups).not.toContain(old.record.name);
    expect(await status(old.client, old.tenant, old.connection.id)).toMatchObject({ standing: "lapsed", takenOver: true });
  });

  it("never looks up domains that were not proven by DNS, nor anything when re-checks are off", async () => {
    const trusting = new AuthService(svc, { ...config, ssoDomainVerification: "off" }, { resolveTxt });
    expect(trusting.domainRechecksEnabled).toBe(false);
    const off = new AuthService(svc, { ...config, domainRecheckHours: 0 }, { resolveTxt });
    expect(off.domainRechecksEnabled).toBe(false);
    expect(await off.recheckDueDomains(new Date(Date.now() + 30 * DAY))).toBe(0);
    const client = new TestClient(createApp(svc, trusting));
    await client.devLogin("wes@trusted.example");
    const t = (await client.get<Me>("/api/auth/me")).json.activeTenant!.id;
    await client.post(`/api/tenants/${t}/sso`, { name: "Trusted", issuer: idp.issuer, clientId: idp.clientId, clientSecret: idp.clientSecret, domains: ["trusted-sso.example"] });
    lookups.length = 0;
    await recheckAll(new Date(Date.now() + 30 * DAY));
    expect(lookups).not.toContain("_visua-challenge.trusted-sso.example");
  });

  it("looks each due domain up once when two instances tick together", async () => {
    const { record } = await provenOrg("xia@race.example", "race-sso.example");
    // On Postgres, a second service is a second instance with its own connections.
    const otherSvc = TEST_PG_URL ? await createService({ database: db.url, registry }) : svc;
    const other = new AuthService(otherSvc, config, { resolveTxt });
    try {
      lookups.length = 0;
      const at = new Date(Date.now() + DAY + 60_000);
      await Promise.all([recheckAll(at), recheckAll(at, other)]);
      expect(lookups.filter((n) => n === record.name)).toHaveLength(1);
    } finally {
      if (otherSvc !== svc) await otherSvc.store.close();
    }
  });

  it("drops a result when the challenge changed meanwhile", async () => {
    const { client, tenant, connection, record } = await provenOrg("yan@edit.example", "edit-sso.example");
    txt.delete(record.name);
    // While the lookup is in flight, the admin removes the domain and lists it again (a new challenge).
    let edit: Promise<unknown> | undefined;
    const slow = new AuthService(svc, config, {
      resolveTxt: async (name) => {
        if (name === record.name && !edit) {
          edit = (async () => {
            await client.patch(`/api/tenants/${tenant}/sso/${connection.id}`, { domains: ["edit-two.example"] });
            await client.patch(`/api/tenants/${tenant}/sso/${connection.id}`, { domains: ["edit-two.example", "edit-sso.example"] });
          })();
          await edit;
        }
        return resolveTxt(name);
      },
    });
    await recheckAll(new Date(Date.now() + DAY + 60_000), slow);
    const now = (await client.get<{ connections: ConnectionJson[] }>(`/api/tenants/${tenant}/sso`)).json.connections.find((c) => c.id === connection.id)!;
    expect(now.domainStatus.find((d) => d.domain === "edit-sso.example")).toMatchObject({ standing: "pending" });
    expect((await trail(client, tenant)).some((e) => e.action === "failing")).toBe(false);
  });
});
```

`TEST_PG_URL` is exported by `./db.ts` (set when `VISUA_TEST_DATABASE_URL` is): import it with `testDatabase`.

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run apps/server/test/sso-recheck.test.ts`
Expected: FAIL — `auth.recheckDueDomains is not a function` (and `standing` undefined).

- [ ] **Step 3: Implement** in `service.ts`

Imports: `import { RETRY_MS, applyOutcome, classifyLookup, standingOf, type LookupOutcome, type RecheckEvent } from "./domain-recheck.ts";`

`publicConnection`:

```ts
export const publicConnection = (c: SsoConnection) => {
  const { clientSecretSealed, verification, ...rest } = c;
  const domainStatus = c.domains.map((domain) => {
    const v = verification?.[domain];
    const standing = standingOf(v);
    return {
      domain,
      verified: !!v?.verifiedAt,
      standing,
      method: v?.method,
      verifiedAt: v?.verifiedAt,
      lastCheckedAt: v?.lastCheckedAt,
      failingSince: v?.failingSince,
      lapsesAt: v?.lapsesAt,
      lapsedAt: v?.lapsedAt,
      // Only a takeover stops the re-checks of a lapsed domain.
      takenOver: standing === "lapsed" && !v?.nextCheckAt,
      record: v ? challengeRecord(domain, v.token) : undefined,
    };
  });
  return { ...rest, hasClientSecret: !!clientSecretSealed, domainStatus };
};
```

Constants near the top of the class file: `export const RECHECK_BATCH = 25; const LEASE_MS = 15 * 60_000;`

In the class:

```ts
  get domainRechecksEnabled(): boolean {
    return this.config.ssoDomainVerification === "dns" && this.config.domainRecheckHours > 0;
  }

  private get recheckSettings() {
    return { intervalMs: this.config.domainRecheckHours * 3_600_000, graceMs: this.config.domainRecheckGraceDays * 86_400_000 };
  }

  /** Look up a domain's challenge record. Never inside a transaction. */
  private async lookupChallenge(domain: string, token: string): Promise<{ outcome: LookupOutcome; code?: string }> {
    const record = challengeRecord(domain, token);
    try {
      return classifyLookup({ records: await this.resolveTxt(record.name) }, record.value);
    } catch (error) {
      return classifyLookup({ error }, record.value);
    }
  }
```

`verifySsoDomain`: replace the early return and the lookup block.

```ts
    if (challenge.verifiedAt && !challenge.failingSince) return before;
    const record = challengeRecord(d, challenge.token);
    const { outcome, code } = await this.lookupChallenge(d, challenge.token);
    if (outcome === "unknown") throw new ValidationError(`The DNS lookup of ${record.name} failed (${code ?? "error"}). Try again in a moment.`);
    if (outcome === "missing") throw new ValidationError(`No TXT record ${record.name} with the value ${record.value} was found. DNS changes can take a while to appear: try again later.`);
```

and the recorded value (inside the existing atomic block):

```ts
      const ts = now();
      const { failingSince, lapsesAt, lapsedAt, ...kept } = current;
      const next: SsoConnection = {
        ...c,
        verification: { ...c.verification, [d]: { ...kept, verifiedAt: ts, method: "dns", lastCheckedAt: ts, nextCheckAt: new Date(Date.now() + (this.recheckSettings.intervalMs || 86_400_000)).toISOString() } },
        updatedAt: ts,
      };
```

(`intervalMs || 86_400_000`, in parentheses: with re-checks off the schedule is still written, a day ahead, so turning them on later picks the domain up.)

New methods after `verifySsoDomain`:

```ts
  /**
   * Re-check SSO domains proven by DNS that are due at `at` (every server instance calls this
   * from its ticker). Claims up to RECHECK_BATCH due domains under the domain lock, pushing each
   * one's next check out by a lease so other instances skip it; looks each up outside any
   * transaction; records each result in its own transaction. Returns how many were claimed.
   */
  async recheckDueDomains(at: Date = new Date()): Promise<number> {
    if (!this.domainRechecksEnabled) return 0;
    const lease = new Date(at.getTime() + LEASE_MS).toISOString();
    const claimed = await this.svc.store.atomic(async () => {
      await this.svc.store.lock("sso-domains");
      const out: { connectionId: string; domain: string; token: string }[] = [];
      for (const due of await this.ids.sso.dueForRecheck(at.toISOString(), RECHECK_BATCH)) {
        const c = await this.ids.sso.get(due.connectionId);
        const v = c?.verification?.[due.domain];
        if (!c || !v) continue;
        // A lapsed domain another connection has proven is not ours to look after any more.
        const owner = v.lapsedAt ? await this.ids.sso.domainOwner(due.domain) : undefined;
        const { nextCheckAt, ...rest } = v;
        await this.ids.sso.put({ ...c, verification: { ...c.verification, [due.domain]: owner && owner !== c.id ? rest : { ...v, nextCheckAt: lease } } });
        if (!owner || owner === c.id) out.push({ connectionId: c.id, domain: due.domain, token: v.token });
      }
      return out;
    });
    for (const claim of claimed) await this.recordRecheck(claim, (await this.lookupChallenge(claim.domain, claim.token)).outcome, at);
    return claimed.length;
  }

  private async recordRecheck(claim: { connectionId: string; domain: string; token: string }, outcome: LookupOutcome, at: Date): Promise<void> {
    await this.svc.store.atomic(async () => {
      await this.svc.store.lock("sso-domains");
      const c = await this.ids.sso.get(claim.connectionId);
      const v = c?.verification?.[claim.domain];
      // The connection changed while the domain was looked up: this answer is about an old challenge.
      if (!c || !v || !c.domains.includes(claim.domain) || v.token !== claim.token) return;
      if (outcome === "found" && v.lapsedAt) {
        const owner = await this.ids.sso.domainOwner(claim.domain);
        if (owner && owner !== c.id) return;
      }
      const { next, event } = applyOutcome(v, outcome, at, this.recheckSettings);
      await this.ids.sso.put({ ...c, verification: { ...c.verification, [claim.domain]: next } });
      if (event) {
        const record = challengeRecord(claim.domain, v.token);
        await this.audit(c.tenantId, "Domain re-check", event, "sso-domain", c.id, recheckSummary(event, claim.domain, record.name, c.name, next), { domain: claim.domain, record: record.name });
      }
    });
  }
```

Module-level helper (after `publicConnection`):

```ts
const day = (iso: string | undefined) => (iso ? iso.slice(0, 10) : "");
function recheckSummary(event: RecheckEvent, domain: string, record: string, connection: string, v: DomainVerification): string {
  if (event === "failing") return `Domain ${domain}: its TXT record ${record} was not found on re-check; it lapses on ${day(v.lapsesAt)} unless the record is restored`;
  if (event === "lapsed")
    return `Domain ${domain} lapsed: its TXT record ${record} has been missing since ${day(v.failingSince)}; “${connection}” no longer admits new people from it, and another organization can prove it`;
  return `Domain ${domain}: its TXT record ${record} was found again`;
}
```

Also: the re-check claim must not bump `updatedAt` (it is not a person's edit) — the `put` calls above keep `c.updatedAt`.

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run apps/server/test/sso-recheck.test.ts apps/server/test/auth.test.ts`
Expected: PASS (existing `auth.test.ts` domain tests must stay green: `verified` and `method` are unchanged).
Then Postgres: `VISUA_TEST_DATABASE_URL=postgres://visua:visua@127.0.0.1:55432/visua_test npx vitest run apps/server/test/sso-recheck.test.ts` — Expected: PASS.

If "never counts DNS trouble" is slow (240 ticks), keep it: each tick with nothing due is one indexed query. If it exceeds ~5 s on SQLite, step by 6 hours instead of 1 and say so in the commit.

- [ ] **Step 5: Commit**

```bash
pnpm typecheck && pnpm test
git add apps/server/src/auth/service.ts apps/server/test/sso-recheck.test.ts
git commit   # "Re-check SSO domains proven by DNS; lapse them after a grace period without locking anyone out" + why
```

---

### Task 4: The ticker

**Files:**
- Create: `apps/server/src/auth/recheck-ticker.ts`
- Modify: `apps/server/src/index.ts` (after `await auth.bootstrap();`)
- Test: `apps/server/test/domain-recheck.test.ts` (append)

**Interfaces:**
- Consumes: `AuthService.recheckDueDomains`, `AuthService.domainRechecksEnabled`, `RECHECK_BATCH` (Task 3).
- Produces: `startDomainRechecks(run: () => Promise<unknown>, opts?: { everyMs?: number; firstMs?: number; log?: (message: string) => void }): () => void`

- [ ] **Step 1: Write the failing test** (append to `apps/server/test/domain-recheck.test.ts`; add `vi` and `afterEach` to the vitest import and `import { startDomainRechecks } from "../src/auth/recheck-ticker.ts";`)

```ts
describe("the re-check ticker", () => {
  afterEach(() => vi.useRealTimers());

  it("runs shortly after start and then on every interval, never overlapping, until stopped", async () => {
    vi.useFakeTimers();
    let runs = 0;
    let release: () => void = () => undefined;
    const stop = startDomainRechecks(
      () => {
        runs++;
        return new Promise<void>((r) => (release = r));
      },
      { firstMs: 1000, everyMs: 10_000 },
    );
    await vi.advanceTimersByTimeAsync(999);
    expect(runs).toBe(0);
    await vi.advanceTimersByTimeAsync(1);
    expect(runs).toBe(1);
    // Still running at the next interval: that tick is skipped.
    await vi.advanceTimersByTimeAsync(10_000);
    expect(runs).toBe(1);
    release();
    await vi.advanceTimersByTimeAsync(10_000);
    expect(runs).toBe(2);
    release();
    stop();
    await vi.advanceTimersByTimeAsync(50_000);
    expect(runs).toBe(2);
  });

  it("logs a failed run and keeps ticking", async () => {
    vi.useFakeTimers();
    const logged: string[] = [];
    let runs = 0;
    const stop = startDomainRechecks(
      async () => {
        runs++;
        throw new Error("database gone");
      },
      { firstMs: 10, everyMs: 100, log: (m) => logged.push(m) },
    );
    await vi.advanceTimersByTimeAsync(210);
    expect(runs).toBe(3);
    expect(logged[0]).toContain("database gone");
    stop();
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run apps/server/test/domain-recheck.test.ts -t ticker`
Expected: FAIL — cannot resolve `recheck-ticker.ts`.

- [ ] **Step 3: Implement** `apps/server/src/auth/recheck-ticker.ts`

```ts
/**
 * Runs SSO domain re-checks on a timer (every instance runs one; the claims in
 * AuthService.recheckDueDomains keep instances from looking up the same domain). A run
 * still in progress makes the next tick skip; a failed run is logged and the ticker goes on.
 * The timers do not keep the process alive.
 */
export function startDomainRechecks(
  run: () => Promise<unknown>,
  { everyMs = 10 * 60_000, firstMs = 30_000, log = (m: string) => console.warn(m) }: { everyMs?: number; firstMs?: number; log?: (message: string) => void } = {},
): () => void {
  let running = false;
  let stopped = false;
  const tick = async () => {
    if (running || stopped) return;
    running = true;
    try {
      await run();
    } catch (err) {
      log(`[visua] SSO domain re-check failed: ${(err as Error).message}`);
    } finally {
      running = false;
    }
  };
  const first = setTimeout(() => void tick(), firstMs);
  const every = setInterval(() => void tick(), everyMs);
  first.unref?.();
  every.unref?.();
  return () => {
    stopped = true;
    clearTimeout(first);
    clearInterval(every);
  };
}
```

`index.ts` (imports: `import { startDomainRechecks } from "./auth/recheck-ticker.ts";` and `RECHECK_BATCH` from `./auth/service.ts`), after `await auth.bootstrap();`:

```ts
// SSO domains proven by DNS are looked at again; each instance ticks, claims keep them apart.
if (auth.domainRechecksEnabled) {
  startDomainRechecks(async () => {
    while ((await auth.recheckDueDomains()) === RECHECK_BATCH);
  });
}
```

and add one line to the startup log block:

```ts
  console.log(`[visua] SSO domain re-checks: ${auth.domainRechecksEnabled ? `every ${auth.config.domainRecheckHours} h, lapse after ${auth.config.domainRecheckGraceDays} days` : "off"}`);
```

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run apps/server/test/domain-recheck.test.ts`
Expected: PASS. Then start the server once to see the log line: `VISUA_PORT=8816 VISUA_DB=:memory: node --disable-warning=ExperimentalWarning apps/server/src/index.ts` (check `lsof -iTCP:8816 -sTCP:LISTEN` first; stop it after the line appears).

- [ ] **Step 5: Commit**

```bash
pnpm typecheck && pnpm test
git add apps/server/src/auth/recheck-ticker.ts apps/server/src/index.ts apps/server/test/domain-recheck.test.ts
git commit   # "Tick SSO domain re-checks on every instance" + why
```

---

### Task 5: Organization settings — standings and what to do about them

**Files:**
- Modify: `apps/web/src/pages/OrganizationPage.tsx:43` (type), `:430` (`pending` → `attention`), `:478-483` (chips), `:499-543` (panels)

**Interfaces:**
- Consumes: `domainStatus[i].standing | lastCheckedAt | failingSince | lapsesAt | lapsedAt | takenOver` (Task 3); `StatusChip` (`components/ui`), `shortDate` (`lib/format.ts`).

- [ ] **Step 1: Screens before**

Run: `pnpm screens --only organization --out recheck-before`. Look at `.screens/recheck-before/*/organization*.png`.

- [ ] **Step 2: Implement**

Type (line 43):

```ts
  domainStatus: {
    domain: string;
    verified: boolean;
    standing: "pending" | "verified" | "failing" | "lapsed" | "not-proven";
    method?: "dns" | "grandfathered" | "trusted";
    verifiedAt?: string;
    failingSince?: string;
    lapsesAt?: string;
    lapsedAt?: string;
    takenOver: boolean;
    record?: { name: string; value: string };
  }[];
```

Chip (replace the `d.verified ? … : …` expression):

```tsx
<DomainChip d={d} />
```

with, near `PROOF`:

```tsx
function DomainChip({ d }: { d: Connection["domainStatus"][number] }) {
  if (d.standing === "failing") return <StatusChip status="at-risk" label={`Record missing · lapses ${shortDate(d.lapsesAt)}`} />;
  if (d.standing === "lapsed") return <StatusChip status="at-risk" label={d.takenOver ? "Held by another organization" : "Lapsed · admits no one new"} />;
  if (d.standing === "pending") return <StatusChip status="in-progress" label="Awaiting DNS proof" />;
  return <StatusChip status="verified" label={PROOF[d.method ?? "dns"]} />;
}
```

(Use the file's existing name for the connection type — check the interface that holds `domainStatus` at line ~40 and substitute it for `Connection`.)

Panels: rename `pending` to `attention` and include failing and lapsed domains that are not taken over:

```ts
  const attention = (sso.data?.connections ?? []).flatMap((c) =>
    c.domainStatus.filter((d) => d.record && (d.standing === "pending" || d.standing === "failing" || (d.standing === "lapsed" && !d.takenOver))).map((d) => ({ connection: c, ...d, record: d.record! })),
  );
```

Heading and text per standing (replace the `<h2>` content and the `<p>`):

```tsx
{p.standing === "pending" ? `Prove you control ${p.domain}` : p.standing === "failing" ? `Restore the DNS record for ${p.domain}` : `${p.domain} has lapsed`}
```

```tsx
<p className="muted" style={{ margin: 0 }}>
  {p.standing === "pending" && (
    <>Until then, nobody is sent to “{p.connection.name}” for this domain, and it admits no one from it. Add this TXT record at your DNS provider, then verify. Another organization can claim the domain too; the first to prove it holds it.</>
  )}
  {p.standing === "failing" && (
    <>Visua looks at this record again every day and has not found it since {shortDate(p.failingSince)}. Unless it is back by {shortDate(p.lapsesAt)}, the domain lapses: “{p.connection.name}” then admits no one new from it, and another organization can prove it. People who already sign in with it keep doing so.</>
  )}
  {p.standing === "lapsed" && (
    <>Since {shortDate(p.lapsedAt)}, “{p.connection.name}” admits no one new from this domain, and another organization can prove it. People who already sign in with it still can. Restore this TXT record, then verify.</>
  )}
</p>
```

Replace every remaining `pending.map` with `attention.map`.

- [ ] **Step 3: Check it by hand**

`pnpm typecheck`, then `pnpm dev` is not enough to reach a failing standing (it needs DNS answers). Use a scratch script (not committed) that creates a service on a temp SQLite file, builds an `AuthService` with a `resolveTxt` that returns the record once and then `ENOTFOUND`, creates an organization and connection, verifies, and calls `recheckDueDomains` at +1 day and +9 days for two domains; then start the server on that file (`VISUA_DB=<file> VISUA_SEED=0 VISUA_PORT=8817`), sign in as that owner in dev mode and open Organization settings → SSO. Confirm: failing chip with lapse date and the "Restore" panel; lapsed chip and panel; glyph plus label on each chip; nothing overflows at 390 px.

- [ ] **Step 4: Screens after and e2e**

Run: `pnpm screens --only organization --out recheck-after` and compare with Step 1 (the seed has no failing domains, so the shots should be unchanged — that is the check that nothing regressed). Run `pnpm test:e2e`. Expected: 22 passed.

- [ ] **Step 5: Commit**

```bash
pnpm typecheck && pnpm test
git add apps/web/src/pages/OrganizationPage.tsx
git commit   # "Organization settings: show failing and lapsed SSO domains and how to restore them" + why
```

---

### Task 6: Documentation and the full check

**Files:**
- Modify: `README.md` (configuration table after `VISUA_SSO_DOMAIN_VERIFICATION` at line ~121; the `pnpm test` count line)
- Modify: `docs/architecture.md` (§4 identity paragraph on domain verification; §6 testing bullets and count; §7 first bullet)
- Modify: `docs/roadmap.md` ("Identity follow-ups" item)

- [ ] **Step 1: Write the docs**

README rows:

```
| `VISUA_SSO_DOMAIN_RECHECK_HOURS` | `24` | How often a domain proven by DNS is looked up again. A domain whose record is missing is shown as failing; still missing after the grace period, it lapses: it admits no one new and another organization can prove it, but its members keep signing in. `0` turns re-checks off (they are off whenever `VISUA_SSO_DOMAIN_VERIFICATION=off`). |
| `VISUA_SSO_DOMAIN_RECHECK_GRACE_DAYS` | `7` | How long a domain's record may be missing before the domain lapses. |
```

`docs/architecture.md` §7: replace the first bullet with:

```
- Domains grandfathered by the upgrade, or trusted while `VISUA_SSO_DOMAIN_VERIFICATION=off`,
  were never proven and are never re-checked; on a shared installation, ask their
  organizations to remove and verify them again. Domains proven by DNS are re-checked
  daily and lapse after a week without their record.
```

§4: add a paragraph after the domain-verification description explaining standings (verified, failing, lapsed; lapsed keeps routing; claims, lease, one transaction per result; the audit actor "Domain re-check"). §6: add a bullet for `sso-recheck.test.ts` and `domain-recheck.test.ts`, and update the Vitest count to the number `pnpm test` prints.

`docs/roadmap.md`: `1. **Identity follow-ups.** SAML and SCIM provisioning.`

- [ ] **Step 2: Run the full local CI**

Run: `pnpm check`
Expected: all green; note the new Vitest counts (SQLite and Postgres) and e2e 22 passed. If the counts in README/architecture differ from what it prints, fix them and re-run `pnpm typecheck && pnpm test`.

- [ ] **Step 3: Commit, push, open the PR**

```bash
git add README.md docs/architecture.md docs/roadmap.md
git commit   # "Docs: SSO domain re-checks" + why
git push -u origin feat/sso-domain-recheck
gh pr create --base main --title "Re-check SSO domains proven by DNS; lapse them without locking anyone out" --body-file <file>   # body: what changed per task, the pnpm check numbers, the spec and plan paths, the 🤖 line
```

Do not merge: merging is the user's call.
