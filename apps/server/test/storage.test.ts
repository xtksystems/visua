import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { afterAll, describe, expect, it } from "vitest";
import type { ActivityEvent, OrganizationProfile, Workspace } from "@visua/core";
import { FrameworkRegistry } from "@visua/frameworks";
import { createService } from "../src/context.ts";
import { chainHash } from "../src/services/visua.ts";
import { toPostgresParams } from "../src/storage/driver.ts";
import { DEFAULT_TENANT_ID } from "../src/storage/index.ts";
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
