import { afterAll, afterEach, describe, expect, it, vi } from "vitest";
import { FrameworkRegistry } from "@visua/frameworks";
import type { OrganizationProfile } from "@visua/core";
import { createService } from "../src/context.ts";
import { NotFoundError, ValidationError, principalContext } from "../src/services/visua.ts";
import type { AccessInput, AccessRecord } from "../src/storage/access.ts";
import { MIGRATIONS, migrate } from "../src/storage/migrations.ts";
import { PostgresDriver } from "../src/storage/postgres.ts";
import { SqliteDriver } from "../src/storage/sqlite.ts";
import { testDatabase } from "./db.ts";

const db = await testDatabase("access_audit");
const registry = new FrameworkRegistry({ graphs: [], mappings: [], chunks: [], manifests: [] });
const svc = await createService({ database: db.url, registry });
const profile: OrganizationProfile = { industry: "saas", size: "11-50", dataTypes: [], drivers: [], environments: ["cloud"], maturityTier: 1, guidance: "guided", securityTeamSize: 1 };
const principal = { id: "usr_access_reader", label: "Signed-in reader" };
const NOW = "2026-10-13T12:00:00.000Z";
let sequence = 0;
const fixture = (tenantId = "tnt_access") => svc.createWorkspace({ name: `Access ${++sequence}`, profile, tenantId });
const record = (workspaceId: string, input: AccessInput = { kind: "auditor-view", resource: "auditor" }) => principalContext.run(principal, () => svc.recordAccess(workspaceId, input));
afterEach(() => { vi.restoreAllMocks(); vi.useRealTimers(); });
afterAll(async () => { await svc.store.close(); await db.cleanup(); });

describe(`access preparation records (${db.dialect})`, () => {
  it("records only the server principal and canonical workspace/tenant, without private payloads", async () => {
    const ws = await fixture();
    const item = await record(ws.slug, { kind: "export", resource: "auditor-package", revision: 12, manifestSha256: "a".repeat(64), bytes: 1024 });
    expect(item).toEqual({ id: expect.stringMatching(/^acc_/), workspaceId: ws.id, tenantId: ws.tenantId, at: expect.any(String), principalId: principal.id, principalLabel: principal.label, kind: "export", resource: "auditor-package", outcome: "prepared", revision: 12, manifestSha256: "a".repeat(64), bytes: 1024 });
    expect(await svc.readAccess(ws.id)).toEqual([item]);
    expect(await svc.readAccess(ws.slug)).toEqual([item]);
    for (const field of ["actor", "principalId", "principalLabel", "workspaceId", "tenantId", "at", "outcome", "content", "token", "cookie"]) {
      await expect(record(ws.id, { kind: "export", [field]: "spoofed-private-value" } as AccessInput)).rejects.toThrow(ValidationError);
    }
    expect(await svc.readAccess(ws.id)).toHaveLength(1);
    expect(JSON.stringify(await svc.readAccess(ws.id))).not.toContain("spoofed");
  });

  it("refuses missing or malformed identity and an unscoped workspace", async () => {
    const ws = await fixture();
    await expect(svc.recordAccess(ws.id, { kind: "auditor-view" })).rejects.toThrow("authenticated principal");
    for (const actor of [{ id: "", label: "Missing id" }, { id: "usr_ok", label: "x".repeat(513) }, { id: "usr_ok", label: "name\nprivate" }]) {
      await expect(principalContext.run(actor, () => svc.recordAccess(ws.id, { kind: "auditor-view" }))).rejects.toThrow("authenticated principal");
    }
    const unscoped = await svc.createWorkspace({ name: `Unscoped ${++sequence}`, profile });
    await expect(record(unscoped.id)).rejects.toThrow("organization");
    expect(await svc.readAccess(ws.id)).toEqual([]);
  });

  it("keeps concurrent principal contexts and workspace histories isolated", async () => {
    const ws = await fixture(), other = await fixture("tnt_other");
    const [first, second] = await Promise.all([
      record(ws.id),
      principalContext.run({ id: "tok_other_reader", label: "Other token" }, () => svc.recordAccess(other.slug, { kind: "evidence-download", resource: "ev_other" })),
    ]);
    expect(second).toMatchObject({ workspaceId: other.id, tenantId: "tnt_other", principalId: "tok_other_reader", principalLabel: "Other token" });
    expect(await svc.readAccess(ws.id)).toEqual([first]);
    expect(await svc.readAccess(other.id)).toEqual([second]);
    await expect(record("missing-workspace")).rejects.toThrow(NotFoundError);
    await expect(svc.readAccess("missing-workspace")).rejects.toThrow(NotFoundError);
  });

  it("validates kind, hash, opaque resource and finite safe integer metadata", async () => {
    const ws = await fixture();
    const invalid: unknown[] = [
      null, [], { kind: "download" }, { kind: "export", resource: "" }, { kind: "export", resource: "x".repeat(201) },
      ...["/private/path", "../path", "C:\\private\\path", "https://private.example/path", "resource?token=secret", "line\nsecret"].map(resource => ({ kind: "export", resource })),
      ...["A".repeat(64), "a".repeat(63), "g".repeat(64), "sha256:secret"].map(manifestSha256 => ({ kind: "export", manifestSha256 })),
      ...["revision", "bytes"].flatMap(field => [-1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1, "12"].map(value => ({ kind: "export", [field]: value }))),
    ];
    for (const input of invalid) await expect(record(ws.id, input as AccessInput)).rejects.toThrow(ValidationError);
    expect(await svc.readAccess(ws.id)).toEqual([]);
    const edge = await record(ws.id, { kind: "evidence-download", resource: "x".repeat(200), revision: 0, manifestSha256: "0123456789abcdef".repeat(4), bytes: Number.MAX_SAFE_INTEGER });
    expect((await svc.readAccess(ws.id))[0]).toEqual(edge);
  });

  it("does not change assessment revision, hash head, workspace timestamps or bus events", async () => {
    const ws = await fixture();
    const revision = await svc.store.workspaces.rev(ws.id), audit = await svc.store.activity.chain(ws.id), head = await svc.verifyAuditTrail(ws.id);
    const publish = vi.spyOn(svc.bus, "publish");
    await record(ws.id); await record(ws.id, { kind: "export", resource: "readiness" });
    await svc.readAccess(ws.id);
    expect(await svc.store.workspaces.rev(ws.id)).toBe(revision);
    expect(await svc.workspace(ws.id)).toEqual(ws);
    expect(await svc.store.activity.chain(ws.id)).toEqual(audit);
    expect(await svc.verifyAuditTrail(ws.id)).toEqual(head);
    expect(publish).not.toHaveBeenCalled();
  });

  it("rolls a late append failure back and permits a later successful record", async () => {
    const ws = await fixture(), revision = await svc.store.workspaces.rev(ws.id), head = await svc.verifyAuditTrail(ws.id);
    const append = svc.store.access.append.bind(svc.store.access);
    vi.spyOn(svc.store.access, "append").mockImplementationOnce(async item => { await append(item); throw new Error("late append failure"); });
    await expect(record(ws.id)).rejects.toThrow("late append failure");
    expect(await svc.readAccess(ws.id)).toEqual([]);
    expect(await svc.store.workspaces.rev(ws.id)).toBe(revision);
    expect(await svc.verifyAuditTrail(ws.id)).toEqual(head);
    expect(await record(ws.id)).toMatchObject({ outcome: "prepared" });
    expect(await svc.readAccess(ws.id)).toHaveLength(1);
  });

  it("bounds reads to 100 by default and 200 maximum with stable timestamp/id ordering", async () => {
    const ws = await fixture();
    vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(new Date(NOW));
    const tied: AccessRecord[] = [];
    await svc.store.transaction(async () => {
      for (let i = 0; i < 204; i++) tied.push(await record(ws.id));
    });
    vi.setSystemTime(new Date("2026-10-13T12:01:00.000Z"));
    const newest = await record(ws.id);
    const expected = [newest.id, ...tied.map(item => item.id).sort().reverse()];
    expect((await svc.readAccess(ws.id)).map(item => item.id)).toEqual(expected.slice(0, 100));
    expect((await svc.readAccess(ws.id, 900)).map(item => item.id)).toEqual(expected.slice(0, 200));
    expect((await svc.readAccess(ws.id, 2.9)).map(item => item.id)).toEqual(expected.slice(0, 2));
    expect(await svc.readAccess(ws.id, -100)).toHaveLength(1);
    expect(await svc.readAccess(ws.id, NaN)).toHaveLength(100);
    expect(await svc.readAccess(ws.id, Infinity)).toHaveLength(100);
  });

  it("cascades access deletion with workspace deletion while retaining other histories", async () => {
    const ws = await fixture(), other = await fixture("tnt_other");
    await record(ws.id); const retained = await record(other.id);
    await svc.deleteWorkspace(ws.slug);
    expect(await svc.store.access.recent(ws.id)).toEqual([]);
    expect(await svc.readAccess(other.id)).toEqual([retained]);
    await expect(svc.readAccess(ws.id)).rejects.toThrow(NotFoundError);
    await expect(svc.store.access.append({ ...retained, id: "acc_orphan", workspaceId: ws.id })).rejects.toThrow();
    await expect(svc.store.access.append({ ...retained, id: "acc_bad_kind", kind: "unknown" } as unknown as AccessRecord)).rejects.toThrow();
    await expect(svc.store.access.append({ ...retained, id: "acc_bad_outcome", outcome: "received" } as unknown as AccessRecord)).rejects.toThrow();
    await expect(svc.store.access.append(retained)).rejects.toThrow();
  });
});

it("migration 8 preserves all existing rows and starts empty without fabricated access history", async () => {
  const target = await testDatabase("access_migration");
  const driver = target.dialect === "postgres" ? new PostgresDriver(target.url) : new SqliteDriver(target.url);
  try {
    await driver.execute(`CREATE TABLE schema_migrations (version INTEGER PRIMARY KEY, name TEXT NOT NULL, applied_at TEXT NOT NULL)`);
    for (const migration of MIGRATIONS.filter(item => item.version < 8)) await driver.transaction(async tx => {
      await migration.up(tx); await tx.execute(`INSERT INTO schema_migrations VALUES (?, ?, ?)`, [migration.version, migration.name, NOW]);
    });
    const J = driver.dialect === "postgres" ? "?::jsonb" : "?";
    await driver.execute(`INSERT INTO workspaces (id, slug, data, updated_at, rev, tenant_id) VALUES (?, ?, ${J}, ?, ?, ?)`, ["old", "old", JSON.stringify({ id: "old", name: "Old" }), NOW, 17, "tnt_old"]);
    await driver.execute(`INSERT INTO evidence (id, workspace_id, data, updated_at) VALUES (?, ?, ${J}, ?)`, ["ev_old", "old", JSON.stringify({ id: "ev_old", sha256: "retained" }), NOW]);
    await driver.execute(`INSERT INTO evidence_content (evidence_id, workspace_id, data) VALUES (?, ?, ${J})`, ["ev_old", "old", JSON.stringify({ content: "Existing private body" })]);
    await driver.execute(`INSERT INTO activity (id, workspace_id, data, updated_at, seq) VALUES (?, ?, ${J}, ?, ?)`, ["act_old", "old", JSON.stringify({ id: "act_old", hash: "retained", action: "exported" }), NOW, 1]);
    await driver.execute(`INSERT INTO score_snapshots (id, workspace_id, observed_at, revision, reason, data) VALUES (?, ?, ?, ?, ?, ${J})`, ["score_old", "old", NOW, 16, "manual", JSON.stringify({ id: "score_old", private: false })]);
    const tables = ["workspaces", "evidence", "evidence_content", "activity", "score_snapshots"];
    const before = await Promise.all(tables.map(table => driver.query(`SELECT * FROM ${table}`)));
    expect(await migrate(driver)).toEqual([8]);
    expect(await Promise.all(tables.map(table => driver.query(`SELECT * FROM ${table}`)))).toEqual(before);
    expect(await driver.query(`SELECT * FROM workspace_access`)).toEqual([]);
    expect(await migrate(driver)).toEqual([]);
  } finally { await driver.close(); await target.cleanup(); }
});
