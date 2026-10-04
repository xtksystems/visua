import { createHash } from "node:crypto";
import { afterAll, describe, expect, it, vi } from "vitest";
import { evidenceReviewScope, hasCurrentEvidenceReview, isEvidenceValid, type Evidence, type OrganizationProfile } from "@visua/core";
import { FrameworkRegistry } from "@visua/frameworks";
import { createApp } from "../src/app.ts";
import { loadAuthConfig } from "../src/auth/config.ts";
import { AuthService } from "../src/auth/service.ts";
import { EventBus } from "../src/bus.ts";
import { canonical } from "../src/audit.ts";
import { createService } from "../src/context.ts";
import { VisuaService } from "../src/services/visua.ts";
import { MIGRATIONS, migrate } from "../src/storage/migrations.ts";
import { PostgresDriver } from "../src/storage/postgres.ts";
import { SqliteDriver } from "../src/storage/sqlite.ts";
import { Store } from "../src/storage/store.ts";
import type { SqlDriver } from "../src/storage/driver.ts";
import { TestClient } from "./client.ts";
import { testDatabase } from "./db.ts";

const registry = FrameworkRegistry.load();
const db = await testDatabase("evidence_binding");
const svc = await createService({ database: db.url, registry });
const client = new TestClient(createApp(svc, new AuthService(svc, { ...loadAuthConfig({}), mode: "dev" })));
await client.devLogin("evidence-owner@example.test", "Evidence reviewer");
const profile: OrganizationProfile = { industry: "saas", size: "11-50", dataTypes: [], drivers: [], environments: ["cloud"], maturityTier: 1, guidance: "guided", securityTeamSize: 1 };
const A = "nist-csf-2.0:PR.AA-01", B = "nist-csf-2.0:PR.AA-02";
async function fixture() {
  const res = await client.request<{ workspace: { id: string } }>("POST", "/api/workspaces", { name: "Binding", profile, frameworks: ["nist-csf-2.0"] });
  expect(res.status).toBe(201);
  const ws = res.json.workspace.id;
  const e = await svc.createEvidence(ws, { title: "Observed configuration", content: "MFA is enabled", requirementIds: [A], collectedAt: "2026-01-01", validUntil: "2027-12-31" });
  return { ws, e, path: `/api/workspaces/${ws}/evidence/${e.id}` };
}
const accept = (ws: string, e: Evidence) => svc.reviewEvidence(ws, e.id, "accepted", "reviewer", "Inspected artifact", evidenceReviewScope(e));
afterAll(async () => { await svc.store.close(); await db.cleanup(); });

describe(`evidence approval binding (${db.dialect})`, () => {
  it("rejects malformed and reversed dates without creating evidence or audit events", async () => {
    const { ws } = await fixture();
    const count = (await svc.store.evidence.list(ws)).length;
    const head = await svc.store.activity.head(ws);
    for (const validUntil of ["not-a-date", "2026-02-30", "2026-01-02T00:00:00", "2025-12-31"]) {
      const res = await client.request("POST", `/api/workspaces/${ws}/evidence`, { title: "Invalid", requirementIds: [A], content: "config", collectedAt: "2026-01-01", validUntil });
      expect(res.status).toBe(400);
    }
    expect((await svc.store.evidence.list(ws)).length).toBe(count);
    expect(await svc.store.activity.head(ws)).toEqual(head);
  });

  it("binds an acceptance, appends history, and records before/after audit values", async () => {
    const { ws, e, path } = await fixture();
    expect(e.sha256).toBe(createHash("sha256").update(canonical({ content: e.content })).digest("hex"));
    expect(e.validUntil).toBe("2027-12-31T23:59:59.999Z");
    expect((await client.request("PATCH", path, { decision: "accepted" })).status).toBe(400);
    const reviewed = await client.request<Evidence>("PATCH", path, { decision: "accepted", expectedScope: evidenceReviewScope(e), note: "Verified against configuration" });
    expect(reviewed.status).toBe(200);
    expect(isEvidenceValid(reviewed.json, new Date("2026-10-03"))).toBe(true);
    expect(reviewed.json.reviewHistory).toHaveLength(1);
    expect(reviewed.json.reviewHistory![0]).toMatchObject({ scope: evidenceReviewScope(e), note: "Verified against configuration" });
    const log = await svc.store.activity.head(ws);
    expect(log?.data).toMatchObject({ before: { status: "pending-review", reviewCount: 0 }, after: { status: "accepted", reviewCount: 1 } });
    expect((await svc.verifyAuditTrail(ws)).valid).toBe(true);
  });

  it.each([
    { content: "MFA disabled" }, { data: { access: "changed" } }, { requirementIds: [B] },
    { collectedAt: "2026-01-02" }, { validUntil: "2028-01-01" }, { validUntil: null },
  ])("requires renewed review after a protected change: %j", async (patch) => {
    const { ws, e } = await fixture();
    const approved = await accept(ws, e);
    const changed = await svc.updateEvidence(ws, e.id, patch);
    expect(changed.status).toBe("pending-review");
    expect(changed.reviewedBy).toBeUndefined();
    expect(changed.reviewedAt).toBeUndefined();
    expect(changed.reviewHistory).toEqual(approved.reviewHistory);
    expect(isEvidenceValid(changed)).toBe(false);
    await expect(accept(ws, approved)).rejects.toThrow("changed since");
    const again = await accept(ws, changed);
    expect(again.reviewHistory).toHaveLength(2);
    expect(hasCurrentEvidenceReview(again)).toBe(true);
  });

  it("keeps approval for descriptive edits, reordered links and equivalent dates", async () => {
    const { ws, e } = await fixture();
    const linked = await svc.updateEvidence(ws, e.id, { requirementIds: [A, B] });
    const approved = await accept(ws, linked);
    const changed = await svc.updateEvidence(ws, e.id, { title: "Renamed", description: "Context", fileName: "config.txt", requirementIds: [B, A, B], collectedAt: "2026-01-01T01:00:00+01:00", validUntil: "2027-12-31" });
    expect(changed.status).toBe("accepted");
    expect(changed.reviewHistory).toEqual(approved.reviewHistory);
    expect(hasCurrentEvidenceReview(changed)).toBe(true);
  });

  it("cannot restore approval by reverting content or editing review-owned fields", async () => {
    const { ws, e, path } = await fixture();
    const approved = await accept(ws, e);
    await svc.updateEvidence(ws, e.id, { content: "other" });
    const reverted = await svc.updateEvidence(ws, e.id, { content: e.content });
    expect(reverted.sha256).toBe(approved.sha256);
    expect(reverted.status).toBe("pending-review");
    for (const patch of [{ status: "accepted" }, { sha256: "a".repeat(64) }, { reviewHistory: [] }, { reviewedBy: "forged" }, { source: "connector" }]) {
      expect((await client.request("PATCH", path, patch)).status).toBe(400);
      await expect(svc.updateEvidence(ws, e.id, patch as never)).rejects.toThrow("cannot be edited");
    }
    expect((await client.request("PATCH", path, { decision: "accepted", expectedScope: evidenceReviewScope(reverted), content: "ignored edit" })).status).toBe(400);
  });

  it("hashes data and content together and refuses acceptance of metadata-only records", async () => {
    const { ws } = await fixture();
    const e = await svc.createEvidence(ws, { title: "Structured artifact", content: "config", data: { b: 2, a: 1 }, sha256: "f".repeat(64), requirementIds: [A] });
    expect(e.sha256).toBe(createHash("sha256").update(canonical({ content: "config", data: { a: 1, b: 2 } })).digest("hex"));
    const empty = await svc.createEvidence(ws, { title: "Description only", requirementIds: [A] });
    await expect(accept(ws, empty)).rejects.toThrow("requires an artifact");
    const rejected = await svc.reviewEvidence(ws, empty.id, "rejected", "reviewer", "No artifact", evidenceReviewScope(empty));
    expect(rejected.reviewHistory![0]!.note).toBe("No artifact");
  });

  it("cannot alias raw JSON text with a different content/data artifact", async () => {
    const { ws } = await fixture();
    const e = await svc.createEvidence(ws, { title: "Encoded artifact", content: '{"content":"MFA disabled","data":{"enabled":false}}', requirementIds: [A] });
    const approved = await accept(ws, e);
    const changed = await svc.updateEvidence(ws, e.id, { content: "MFA disabled", data: { enabled: false } });
    expect(changed.sha256).not.toBe(approved.sha256);
    expect(changed.status).toBe("pending-review");
    expect(isEvidenceValid(changed)).toBe(false);
    await expect(accept(ws, approved)).rejects.toThrow("changed since");
  });

  it("preserves all decisions, including rejection, without turning old acceptance into current approval", async () => {
    const { ws, e } = await fixture();
    const approved = await accept(ws, e);
    const rejected = await svc.reviewEvidence(ws, e.id, "rejected", "second reviewer", "Insufficient", evidenceReviewScope(approved));
    expect(rejected.reviewHistory?.map((r) => r.decision)).toEqual(["accepted", "rejected"]);
    expect(isEvidenceValid(rejected)).toBe(false);
    const again = await accept(ws, rejected);
    expect(again.reviewHistory?.map((r) => r.decision)).toEqual(["accepted", "rejected", "accepted"]);
  });

  it("keeps connector observations immutable while links and expiry require review", async () => {
    const { ws } = await fixture();
    const observed = { enabled: true };
    const e = await svc.createEvidence(ws, { title: "Check", source: "connector", connectorId: "connector", content: "Observed enabled", data: { checkId: "mfa", observed, automation: "api-automated" }, collectedAt: "2026-01-01T00:00:00.000Z", validUntil: "2027-12-31", requirementIds: [A], status: "accepted", reviewedBy: "reviewer" });
    expect(e.sha256).toBe(createHash("sha256").update(canonical({ checkId: "mfa", observed, observedAt: e.collectedAt })).digest("hex"));
    for (const patch of [{ content: "forged" }, { data: { checkId: "mfa", observed: false } }, { collectedAt: "2026-01-02" }]) await expect(svc.updateEvidence(ws, e.id, patch)).rejects.toThrow("immutable");
    const changed = await svc.updateEvidence(ws, e.id, { requirementIds: [B] });
    expect(changed.status).toBe("pending-review");
    expect(changed.data).toEqual(e.data);
    expect(changed.sha256).toBe(e.sha256);
    expect(changed.reviewHistory).toEqual(e.reviewHistory);
  });

  it("rolls back approval, history, revision, audit and events together on audit failure", async () => {
    const { ws, e } = await fixture();
    const before = await svc.workspace(ws);
    const head = await svc.store.activity.head(ws);
    const events: string[] = [];
    const off = svc.bus.subscribe(ws, (event) => events.push(event.type));
    const audit = vi.spyOn(svc.store.activity, "append").mockRejectedValueOnce(new Error("audit unavailable"));
    try { await expect(accept(ws, e)).rejects.toThrow("audit unavailable"); }
    finally { audit.mockRestore(); off(); }
    expect(await svc.store.evidence.get(e.id)).toEqual(e);
    expect(await svc.workspace(ws)).toEqual(before);
    expect(await svc.store.activity.head(ws)).toEqual(head);
    expect(events).toEqual([]);
  });

  it("serializes a scope edit against an inspected approval across instances", async () => {
    const { ws, e } = await fixture();
    const other = db.dialect === "postgres" ? await createService({ database: db.url, registry }) : svc;
    try {
      await Promise.allSettled([svc.updateEvidence(ws, e.id, { content: "changed configuration" }), accept(ws, e), other.updateEvidence(ws, e.id, { requirementIds: [B] })]);
      const final = (await svc.store.evidence.get(e.id))!;
      expect(final.status).toBe("pending-review");
      expect(isEvidenceValid(final)).toBe(false);
      expect((await svc.verifyAuditTrail(ws)).valid).toBe(true);
    } finally { if (other !== svc) await other.store.close(); }
  });

  it("captures review proposal scope and refuses stale or edited review targets", async () => {
    const { ws, e } = await fixture();
    const propose = () => svc.createProposal(ws, "run", { type: "review-evidence", title: "Review", rationale: "Inspected", payload: { evidenceId: e.id, decision: "accepted", expectedScope: { forged: true } }, confidence: "high", citations: [], nodeIds: [] });
    const p = await propose();
    expect(p.payload["expectedScope"]).toEqual(evidenceReviewScope(e));
    await svc.updateEvidence(ws, e.id, { content: "changed" });
    expect((await svc.decideProposal(ws, p.id, "approved")).status).toBe("failed");
    const edited = await propose();
    expect((await svc.decideProposal(ws, edited.id, "approved", "user", { expectedScope: evidenceReviewScope(e) })).status).toBe("failed");
    expect((await svc.store.evidence.get(e.id))!.status).toBe("pending-review");
  });

  it("retains a connector proposal's check reference and validates edited narrative validity", async () => {
    const { ws } = await fixture();
    const c = await svc.createConnector(ws, { kind: "repo-scan", config: { path: "." } });
    const check = { id: "check-binding", workspaceId: ws, connectorId: c.id, checkId: "mfa", title: "Check", detail: "Observed", outcome: "pass" as const, requirementIds: [A], observedAt: "2026-01-01T00:00:00.000Z", observed: { enabled: true } };
    await svc.store.checks.put(check);
    const p = await svc.createProposal(ws, "run", { type: "create-evidence", title: "File observation", rationale: "Observed", payload: { checkResultId: check.id }, confidence: "high", citations: [], nodeIds: [] });
    const changed = await svc.decideProposal(ws, p.id, "approved", "reviewer", { checkResultId: null, content: "forged narrative", requirementIds: [B] });
    expect(changed.status).toBe("failed");
    expect((await svc.store.checks.get(check.id))?.evidenceId).toBeUndefined();
    const narrative = await svc.createProposal(ws, "run", { type: "create-evidence", title: "Narrative", rationale: "Inspected", payload: { title: "Artifact", content: "Observed configuration", requirementIds: [A], validDays: 30 }, confidence: "high", citations: [], nodeIds: [] });
    expect((await svc.decideProposal(ws, narrative.id, "approved", "reviewer", { validDays: -1 })).status).toBe("failed");
    const good = await svc.createProposal(ws, "run", { type: "create-evidence", title: "Narrative", rationale: "Inspected", payload: { title: "Artifact", content: "Observed configuration", requirementIds: [A], validDays: 30 }, confidence: "high", citations: [], nodeIds: [] });
    expect((await svc.decideProposal(ws, good.id, "approved", "reviewer")).status).toBe("applied");
    const filed = (await svc.store.evidence.list(ws)).find((e) => e.source === "agent")!;
    expect(hasCurrentEvidenceReview(filed)).toBe(true);
  });
});

describe(`legacy evidence migration (${db.dialect})`, () => {
  it("archives unbound decisions, invalidates acceptance transactionally, and runs once", async () => {
    const legacyDb = await testDatabase("evidence_legacy");
    const driver = legacyDb.dialect === "postgres" ? new PostgresDriver(legacyDb.url) : new SqliteDriver(":memory:");
    const store = new Store(driver);
    const old = new VisuaService(store, registry, new EventBus());
    try {
      await driver.execute("CREATE TABLE schema_migrations (version INTEGER PRIMARY KEY, name TEXT NOT NULL, applied_at TEXT NOT NULL)");
      for (const m of MIGRATIONS.filter((m) => m.version < 5)) await driver.transaction(async (tx) => {
        await m.up(tx);
        await tx.execute("INSERT INTO schema_migrations (version, name, applied_at) VALUES (?, ?, ?)", [m.version, m.name, new Date().toISOString()]);
      });
      const ws = await old.createWorkspace({ name: "Legacy", profile, frameworks: ["nist-csf-2.0"] });
      const e = await old.createEvidence(ws.id, { title: "Legacy artifact", content: "Observed", requirementIds: [A] });
      const legacy: Evidence = { ...e, status: "accepted", reviewedBy: "Old reviewer", reviewedAt: "2026-01-01T00:00:00.000Z", validUntil: "invalid legacy expiry", reviewHistory: undefined };
      await store.evidence.put(legacy);
      const noHash: Evidence = { ...legacy, id: "legacy-no-hash", title: "Legacy unhashed artifact", sha256: undefined, validUntil: "2030-12-31" };
      await store.evidence.put(noHash);
      const pending: Evidence = { ...e, id: "legacy-pending", status: "pending-review", sha256: createHash("sha256").update(e.content!).digest("hex"), reviewHistory: undefined };
      await store.evidence.put(pending);
      const head = await store.activity.head(ws.id);
      const before = await old.workspace(ws.id);
      // Inject an audit insert failure inside the migration transaction.
      await expect(driver.transaction((tx) => MIGRATIONS.find((m) => m.version === 5)!.up(new Proxy(tx, {
        get(target, key) {
          if (key === "execute") return async (sql: string, params?: unknown[]) => {
            if (sql.startsWith("INSERT INTO activity")) throw new Error("migration audit unavailable");
            return target.execute(sql, params);
          };
          const value = target[key as keyof SqlDriver];
          return typeof value === "function" ? value.bind(target) : value;
        },
      })))).rejects.toThrow("migration audit unavailable");
      expect(await store.evidence.get(e.id)).toEqual(legacy);
      expect(await store.evidence.get(noHash.id)).toEqual(noHash);
      expect(await store.activity.head(ws.id)).toEqual(head);
      expect(await old.workspace(ws.id)).toEqual(before);
      expect(await migrate(driver)).toEqual([5]);
      const migrated = (await store.evidence.get(e.id))!;
      expect(migrated).toMatchObject({ status: "pending-review", content: "Observed", sha256: legacy.sha256, validUntil: "invalid legacy expiry", reviewHistory: [{ legacy: true, decision: "accepted", reviewedBy: "Old reviewer", reviewedAt: legacy.reviewedAt }] });
      expect(migrated.reviewedBy).toBeUndefined();
      expect(migrated.reviewHistory![0]!.scope).toBeUndefined();
      expect(isEvidenceValid(migrated)).toBe(false);
      expect((await old.verifyAuditTrail(ws.id)).valid).toBe(true);
      const event = (await store.activity.chain(ws.id)).find((a) => a.entityId === legacy.id && a.action === "approval-binding-upgraded");
      expect(event?.data).toMatchObject({ before: { status: "accepted", reviewCount: 0 }, after: { status: "pending-review", reviewCount: 1 } });
      const migrationHead = await store.activity.head(ws.id);
      expect(await migrate(driver)).toEqual([]);
      expect(await store.activity.head(ws.id)).toEqual(migrationHead);
      const migratedPending = (await store.evidence.get(pending.id))!;
      expect(migratedPending.sha256).not.toBe(pending.sha256);
      expect(migratedPending.reviewHistory).toEqual([]);
      expect(hasCurrentEvidenceReview(await old.reviewEvidence(ws.id, migratedPending.id, "accepted", "Reviewer", undefined, evidenceReviewScope(migratedPending)))).toBe(true);
      const reReviewable = (await store.evidence.get(noHash.id))!;
      expect(reReviewable.sha256).toMatch(/^[a-f0-9]{64}$/);
      const reviewed = await old.reviewEvidence(ws.id, reReviewable.id, "accepted", "New reviewer", undefined, evidenceReviewScope(reReviewable));
      expect(reviewed.reviewHistory).toHaveLength(2);
      expect(hasCurrentEvidenceReview(reviewed)).toBe(true);

    } finally { await store.close(); await legacyDb.cleanup(); }
  });
});
