import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { ActivityEvent, OrganizationProfile, Workspace } from "@visua/core";
import { FrameworkRegistry } from "@visua/frameworks";
import { createApp } from "../src/app.ts";
import { loadAuthConfig } from "../src/auth/config.ts";
import { AuthService } from "../src/auth/service.ts";
import { createService } from "../src/context.ts";
import { chainHash } from "../src/services/visua.ts";
import { toPostgresParams } from "../src/storage/driver.ts";
import { DEFAULT_TENANT_ID } from "../src/storage/index.ts";
import { MIGRATIONS } from "../src/storage/migrations.ts";
import { PostgresDriver } from "../src/storage/postgres.ts";
import { SqliteDriver } from "../src/storage/sqlite.ts";
import { TestClient } from "./client.ts";
import { TEST_PG_URL, testDatabase } from "./db.ts";

const registry = FrameworkRegistry.load();
const db = await testDatabase("store");
const svc = await createService({ database: db.url, registry });
const profile: OrganizationProfile = { industry: "saas", size: "11-50", dataTypes: [], drivers: [], environments: ["cloud"], maturityTier: 1, guidance: "guided", securityTeamSize: 1 };

afterAll(async () => {
  await svc.store.close();
  await db.cleanup();
});

describe(`storage (${db.dialect})`, () => {
  it("rewrites ? placeholders for Postgres outside string literals", () => {
    expect(toPostgresParams("SELECT * FROM t WHERE a = ? AND b = '?' AND c = ?")).toBe("SELECT * FROM t WHERE a = $1 AND b = '?' AND c = $2");
  });

  it("rolls back a failed transaction, including events it would have published", async () => {
    const ws = await svc.createWorkspace({ name: "Rollback", profile, frameworks: ["nist-csf-2.0"] });
    const published: string[] = [];
    const off = svc.bus.subscribe(ws.id, (e) => published.push(e.type));
    await expect(
      svc.store.transaction(async () => {
        await svc.createTask(ws.id, { title: "Doomed task" });
        throw new Error("boom");
      }),
    ).rejects.toThrow("boom");
    off();
    expect((await svc.store.tasks.list(ws.id)).map((t) => t.title)).not.toContain("Doomed task");
    expect(published).toEqual([]);
    expect((await svc.verifyAuditTrail(ws.id)).valid).toBe(true);
  });

  it("rolls back only the inner savepoint when a nested transaction fails", async () => {
    const ws = await svc.createWorkspace({ name: "Savepoint", profile, frameworks: ["nist-csf-2.0"] });
    await svc.store.transaction(async () => {
      await svc.createTask(ws.id, { title: "Kept" });
      await expect(
        svc.store.transaction(async () => {
          await svc.createTask(ws.id, { title: "Discarded" });
          throw new Error("inner");
        }),
      ).rejects.toThrow("inner");
    });
    const titles = (await svc.store.tasks.list(ws.id)).map((t) => t.title);
    expect(titles).toContain("Kept");
    expect(titles).not.toContain("Discarded");
    const trail = await svc.verifyAuditTrail(ws.id);
    expect(trail.valid).toBe(true);
  });

  it("keeps the audit chain linear under concurrent writers", async () => {
    const ws = await svc.createWorkspace({ name: "Concurrency", profile, frameworks: ["nist-csf-2.0"] });
    // A second service instance on the same database stands in for a second server.
    const other = TEST_PG_URL ? await createService({ database: db.url, registry }) : svc;
    try {
      await Promise.all(
        Array.from({ length: 24 }, (_, i) => (i % 2 ? other : svc).createTask(ws.id, { title: `Parallel task ${i}` })),
      );
      const chain = await svc.store.activity.chain(ws.id);
      const seqs = chain.map((e) => e.seq);
      expect(new Set(seqs).size).toBe(chain.length);
      expect(seqs).toEqual(Array.from({ length: chain.length }, (_, i) => i + 1));
      expect((await svc.verifyAuditTrail(ws.id)).valid).toBe(true);
      expect((await svc.store.tasks.list(ws.id)).length).toBe(24);
    } finally {
      if (other !== svc) await other.store.close();
    }
  });

  it("serializes read-modify-write changes to a workspace across instances", async () => {
    const ws = await svc.createWorkspace({ name: "Inventory race", profile, frameworks: ["nist-csf-2.0", "nist-ai-rmf"] });
    const other = TEST_PG_URL ? await createService({ database: db.url, registry }) : svc;
    try {
      await Promise.all(
        Array.from({ length: 10 }, (_, i) => (i % 2 ? other : svc).upsertAiSystem(ws.id, { name: `Model ${i}`, purpose: "Concurrency test system" })),
      );
      const settings = (await svc.workspace(ws.id)).frameworks.find((f) => f.frameworkId === "nist-ai-rmf");
      expect(settings?.ai?.systems.map((s) => s.name).sort()).toEqual(Array.from({ length: 10 }, (_, i) => `Model ${i}`).sort());
    } finally {
      if (other !== svc) await other.store.close();
    }
  });

  it.skipIf(!TEST_PG_URL)("relays live events between instances through Postgres", async () => {
    const ws = await svc.createWorkspace({ name: "Relay", profile, frameworks: ["nist-csf-2.0"] });
    const other = await createService({ database: db.url, registry });
    try {
      const received = new Promise<string[]>((resolve) => {
        const types: string[] = [];
        const off = other.bus.subscribe(ws.id, (e) => {
          types.push(e.type);
          if (e.type === "task.created") {
            off();
            resolve(types);
          }
        });
      });
      await svc.createTask(ws.id, { title: "Seen elsewhere", description: "x".repeat(9_000) });
      const types = await Promise.race([received, new Promise<string[]>((_, reject) => setTimeout(() => reject(new Error("no relayed event")), 5_000))]);
      expect(types).toContain("task.created");
    } finally {
      await other.store.close();
    }
  });

  it("invalidates cached scores when another instance changes the workspace", async () => {
    const ws = await svc.createWorkspace({ name: "Cache", profile, frameworks: ["nist-csf-2.0"] });
    const before = await svc.score(ws.id, "nist-csf-2.0");
    const other = TEST_PG_URL ? await createService({ database: db.url, registry }) : svc;
    try {
      await other.updateState(ws.id, "nist-csf-2.0:GV.OC-01", { current: 4, target: 4 });
      const after = await svc.score(ws.id, "nist-csf-2.0");
      expect(after.statuses.get("nist-csf-2.0:GV.OC-01")?.status).not.toBe(before.statuses.get("nist-csf-2.0:GV.OC-01")?.status);
    } finally {
      if (other !== svc) await other.store.close();
    }
  });
});

describe("upgrading a SQLite database written before migrations", () => {
  const dir = mkdtempSync(join(tmpdir(), "visua-legacy-"));
  afterAll(() => rmSync(dir, { recursive: true, force: true }));

  it("adds tenancy and chain columns and keeps the audit trail valid", async () => {
    const file = join(dir, "legacy.db");
    const legacy = new DatabaseSync(file);
    legacy.exec(`CREATE TABLE workspaces (id TEXT PRIMARY KEY, slug TEXT UNIQUE NOT NULL, data TEXT NOT NULL, updated_at TEXT NOT NULL);
      CREATE TABLE requirement_states (workspace_id TEXT NOT NULL, node_id TEXT NOT NULL, data TEXT NOT NULL, updated_at TEXT NOT NULL, PRIMARY KEY (workspace_id, node_id));
      CREATE TABLE activity (id TEXT PRIMARY KEY, workspace_id TEXT NOT NULL, data TEXT NOT NULL, updated_at TEXT NOT NULL);
      CREATE INDEX activity_ws ON activity(workspace_id, updated_at);`);
    const ts = new Date().toISOString();
    const ws: Workspace = { id: "ws_legacy", name: "Legacy", slug: "legacy", profile, frameworks: [], autonomy: {}, trustCenter: { enabled: false }, createdAt: ts, updatedAt: ts };
    legacy.prepare(`INSERT INTO workspaces VALUES (?, ?, ?, ?)`).run(ws.id, ws.slug, JSON.stringify(ws), ts);
    let prev = "0".repeat(64);
    for (let seq = 1; seq <= 3; seq++) {
      const body: ActivityEvent = { id: `act_${seq}`, workspaceId: ws.id, at: ts, actor: "user", action: "updated", entity: "workspace", entityId: ws.id, summary: `Legacy event ${seq}`, seq, prevHash: prev };
      const event = { ...body, hash: chainHash(prev, body) };
      prev = event.hash;
      legacy.prepare(`INSERT INTO activity VALUES (?, ?, ?, ?)`).run(event.id, ws.id, JSON.stringify(event), `${ts}#${String(seq).padStart(9, "0")}`);
    }
    legacy.close();

    const upgraded = await createService({ database: file, registry });
    try {
      const got = await upgraded.workspace("legacy");
      expect(got.tenantId).toBe(DEFAULT_TENANT_ID);
      expect((await upgraded.store.identity.tenants.get(DEFAULT_TENANT_ID))?.name).toBe("Default organization");
      // Its first person claims it and can open the workspace (access checks read the organization's settings).
      const auth = new AuthService(upgraded, { ...loadAuthConfig({}), mode: "dev" });
      const client = new TestClient(createApp(upgraded, auth));
      expect((await client.devLogin("first@legacy.example")).json.activeTenant?.role).toBe("owner");
      expect((await client.get("/api/workspaces/legacy")).status).toBe(200);
      expect((await upgraded.store.activity.head(ws.id))?.seq).toBe(3);
      await upgraded.updateWorkspace(ws.id, { description: "Upgraded in place" });
      const trail = await upgraded.verifyAuditTrail(ws.id);
      expect(trail).toMatchObject({ valid: true, events: 4 });
    } finally {
      await upgraded.store.close();
    }
    // Opening again runs no migration twice.
    const again = await createService({ database: file, registry });
    expect((await again.workspace("legacy")).description).toBe("Upgraded in place");
    await again.store.close();
  });
});

describe(`upgrading SSO domains to DNS verification (${db.dialect})`, () => {
  const dir = mkdtempSync(join(tmpdir(), "visua-sso-"));
  afterAll(() => rmSync(dir, { recursive: true, force: true }));

  it("grandfathers every domain claimed before verification existed, and holds each domain verified once", async () => {
    const target = TEST_PG_URL ? await testDatabase("ssomig") : { url: join(dir, "sso.db"), cleanup: async () => undefined };
    const J = TEST_PG_URL ? "?::jsonb" : "?";
    const ts = new Date().toISOString();
    // A database at version 2, with a connection claiming a domain the old way.
    const old = TEST_PG_URL ? new PostgresDriver(target.url) : new SqliteDriver(target.url);
    await old.execute(`CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER PRIMARY KEY, name TEXT NOT NULL, applied_at TEXT NOT NULL)`);
    for (const m of MIGRATIONS.filter((m) => m.version < 3)) {
      await old.transaction(async (tx) => {
        await m.up(tx);
        await tx.execute(`INSERT INTO schema_migrations (version, name, applied_at) VALUES (?, ?, ?)`, [m.version, m.name, ts]);
      });
    }
    await old.execute(`INSERT INTO tenants (id, slug, data, created_at, updated_at) VALUES (?, ?, ${J}, ?, ?)`, ["tnt_legacy", "legacy", JSON.stringify({ id: "tnt_legacy", slug: "legacy", name: "Legacy", settings: {}, createdAt: ts, updatedAt: ts }), ts, ts]);
    const legacy = { id: "sso_legacy", tenantId: "tnt_legacy", name: "Legacy SSO", issuer: "https://login.legacy.example", clientId: "visua", domains: ["legacy-sso.example"], jitProvisioning: false, defaultRole: "viewer", enabled: true, createdAt: ts, updatedAt: ts };
    await old.execute(`INSERT INTO sso_connections (id, tenant_id, data, created_at, updated_at) VALUES (?, ?, ${J}, ?, ?)`, [legacy.id, legacy.tenantId, JSON.stringify(legacy), ts, ts]);
    await old.execute(`INSERT INTO sso_domains (domain, connection_id, tenant_id) VALUES (?, ?, ?)`, ["legacy-sso.example", legacy.id, legacy.tenantId]);
    await old.close();

    const upgraded = await createService({ database: target.url, registry });
    try {
      // Still routes: nobody is locked out by the upgrade.
      expect((await upgraded.store.identity.sso.byDomain("legacy-sso.example"))?.id).toBe("sso_legacy");
      expect((await upgraded.store.identity.sso.get("sso_legacy"))?.verification?.["legacy-sso.example"]).toMatchObject({
        method: "grandfathered",
        verifiedAt: expect.any(String),
        token: expect.stringMatching(/^[0-9a-f]{32}$/),
      });
      // The database itself refuses a second verified claim on the domain.
      const rival = { ...legacy, id: "sso_rival", verification: { "legacy-sso.example": { token: "0".repeat(32), verifiedAt: ts, method: "dns" as const } } };
      await expect(upgraded.store.identity.sso.put({ ...rival, defaultRole: "viewer" })).rejects.toThrow();
      // A pending claim beside it is fine.
      await upgraded.store.identity.sso.put({ ...rival, defaultRole: "viewer", verification: { "legacy-sso.example": { token: "0".repeat(32) } } });
      expect((await upgraded.store.identity.sso.claimants("legacy-sso.example")).map((c) => [c.connectionId, c.verified]).sort()).toEqual([
        ["sso_legacy", true],
        ["sso_rival", false],
      ]);
    } finally {
      await upgraded.store.close();
      await target.cleanup();
    }
  });
});

describe(`SSO domain re-check columns (${db.dialect})`, () => {
  const dir = mkdtempSync(join(tmpdir(), "visua-recheck-"));
  afterAll(() => rmSync(dir, { recursive: true, force: true }));
  // Nothing else in this file gives the shared `svc` a tenant row for DEFAULT_TENANT_ID (it is only
  // created by migration 1 when upgrading a database that has orphaned, pre-tenancy workspaces); the
  // sso_connections FK needs the row to exist before these tests can save a connection under it.
  beforeAll(async () => {
    if (await svc.store.identity.tenants.get(DEFAULT_TENANT_ID)) return;
    const ts = new Date().toISOString();
    await svc.store.identity.tenants.put({ id: DEFAULT_TENANT_ID, slug: "default", name: "Default organization", settings: {}, createdAt: ts, updatedAt: ts });
  });
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

describe(`login flows (${db.dialect})`, () => {
  const flows = () => svc.store.identity.loginFlows;
  const inMinutes = (m: number) => new Date(Date.now() + m * 60_000).toISOString();
  const oidcFlow = { connection: "platform", codeVerifier: "v", nonce: "n", returnTo: "/", createdAt: new Date().toISOString() };

  it("hands a flow to exactly one of several concurrent consumers", async () => {
    await flows().put("flow-race", oidcFlow, inMinutes(10));
    const got = await Promise.all([1, 2, 3, 4].map(() => flows().consume("flow-race")));
    expect(got.filter(Boolean)).toHaveLength(1);
    expect(await flows().consume("flow-race")).toBeUndefined();
  });

  it("never returns an expired flow, and peeks without consuming", async () => {
    await flows().put("flow-old", oidcFlow, inMinutes(-1));
    expect(await flows().peek("flow-old")).toBeUndefined();
    expect(await flows().consume("flow-old")).toBeUndefined();
    await flows().put("flow-peek", { kind: "saml-cache", value: "2026-09-27T00:00:00.000Z", createdAt: new Date().toISOString() }, inMinutes(10));
    expect(await flows().peek("flow-peek")).toMatchObject({ kind: "saml-cache", value: "2026-09-27T00:00:00.000Z" });
    expect(await flows().consume("flow-peek")).toMatchObject({ kind: "saml-cache" });
    expect(await flows().peek("flow-peek")).toBeUndefined();
  });

  it("keeps the OpenID Connect take() single use", async () => {
    await flows().put("flow-take", oidcFlow, inMinutes(10));
    expect(await flows().take("flow-take")).toMatchObject({ connection: "platform", nonce: "n" });
    expect(await flows().take("flow-take")).toBeUndefined();
  });

  it("does not let take() consume a SAML row, but still spends it", async () => {
    await flows().put("flow-take-saml", { kind: "saml-cache", value: "v", createdAt: new Date().toISOString() }, inMinutes(10));
    expect(await flows().take("flow-take-saml")).toBeUndefined();
    expect(await flows().peek("flow-take-saml")).toBeUndefined();
  });
});
