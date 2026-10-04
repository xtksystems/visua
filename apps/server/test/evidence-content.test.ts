import { createHash } from "node:crypto";
import { afterAll, describe, expect, it, vi } from "vitest";
import { evidenceReviewScope, hasCurrentEvidenceReview, type Evidence, type OrganizationProfile } from "@visua/core";
import { FrameworkRegistry } from "@visua/frameworks";
import { EventBus } from "../src/bus.ts";
import { MAX_BLOB_BYTES, MemoryBlobStore, type BlobReference, type BlobScope, type BlobStore } from "../src/blobs/index.ts";
import { artifactHash, type FileEvidenceInput } from "../src/services/evidence.ts";
import { VisuaService } from "../src/services/visua.ts";
import { frameworkState } from "../src/services/views.ts";
import { openStore } from "../src/storage/index.ts";
import { parseJson, type SqlDriver } from "../src/storage/driver.ts";
import { MIGRATIONS, migrate } from "../src/storage/migrations.ts";
import { PostgresDriver } from "../src/storage/postgres.ts";
import { SqliteDriver } from "../src/storage/sqlite.ts";
import { Store } from "../src/storage/store.ts";
import { testDatabase } from "./db.ts";

const registry = FrameworkRegistry.load();
const database = await testDatabase("evidence_content");
const store = await openStore(database.url);
const profile: OrganizationProfile = { industry: "saas", size: "11-50", dataTypes: [], drivers: [], environments: ["cloud"], maturityTier: 1, guidance: "guided", securityTeamSize: 1 };
const A = "nist-csf-2.0:PR.AA-01", B = "nist-csf-2.0:PR.AA-02";
const fileInput: FileEvidenceInput = { title: "Inspected report", fileName: "report.pdf", mediaType: "application/pdf", requirementIds: [A], collectedAt: "2026-01-01", validUntil: "2027-12-31" };
const bytes = Uint8Array.from([37, 80, 68, 70, 0, 255, 10, 65]);

class ObservedBlobs implements BlobStore {
  readonly backing = new MemoryBlobStore();
  readonly calls: { operation: string; scope: BlobScope; inTransaction: boolean; id?: string }[] = [];
  onRead?: (scope: BlobScope, reference: BlobReference, result: Uint8Array) => Promise<Uint8Array>;
  failPut = false;
  async put(scope: BlobScope, data: Uint8Array): Promise<BlobReference> {
    this.calls.push({ operation: "put", scope, inTransaction: store.inTransaction });
    if (this.failPut) throw new Error("storage unavailable");
    return this.backing.put(scope, data);
  }
  async get(scope: BlobScope, reference: BlobReference): Promise<Uint8Array> {
    this.calls.push({ operation: "get", scope, id: reference.id, inTransaction: store.inTransaction });
    const result = await this.backing.get(scope, reference);
    return this.onRead ? this.onRead(scope, reference, result) : result;
  }
  async delete(scope: BlobScope, id: string): Promise<void> {
    this.calls.push({ operation: "delete", scope, id, inTransaction: store.inTransaction });
    await this.backing.delete(scope, id);
  }
}

async function fixture() {
  const blobs = new ObservedBlobs();
  const svc = new VisuaService(store, registry, new EventBus(), undefined, blobs);
  const ws = await svc.createWorkspace({ name: "Evidence content", profile, tenantId: "tnt_content", frameworks: ["nist-csf-2.0"] });
  return { svc, ws, blobs };
}

afterAll(async () => { await store.close(); await database.cleanup(); });

describe(`evidence metadata and content (${database.dialect})`, () => {
  it("stores inline bodies separately and preserves all hydrated collection operations", async () => {
    const { svc, ws } = await fixture();
    const e = await svc.createEvidence(ws.id, { title: "Configuration", content: "Observed MFA", data: { enabled: true }, requirementIds: [A] });
    const metadata = await store.evidence.metadataList(ws.id);
    expect(metadata[0]).not.toHaveProperty("content");
    expect(metadata[0]).not.toHaveProperty("data");
    const raw = (await store.driver.query<{ data: unknown }>("SELECT data FROM evidence WHERE id = ?", [e.id]))[0]!;
    expect(parseJson<Evidence>(raw.data)).toEqual(metadata[0]);
    expect(await store.evidence.get(e.id)).toEqual(e);
    expect(await store.evidence.list(ws.id)).toEqual([e]);
    expect(await store.evidence.recent(ws.id, 1)).toEqual([e]);
    const updated = await store.evidence.update(e.id, (current) => ({ ...current, title: "Renamed" }));
    expect(updated).toMatchObject({ content: e.content, data: e.data });
    expect(await store.evidence.get(e.id)).toEqual(updated);
  });

  it("reads metadata and computes scores without querying body storage", async () => {
    const { svc, ws } = await fixture();
    await svc.createEvidence(ws.id, { title: "Large inline artifact", content: "raw-body".repeat(100_000), requirementIds: [A] });
    const query = vi.spyOn(store.driver, "query");
    try {
      await store.evidence.metadataList(ws.id);
      await svc.score(ws.id, "nist-csf-2.0");
      await frameworkState(svc, ws, "nist-csf-2.0");
      expect(query.mock.calls.some(([sql]) => sql.includes("evidence_content"))).toBe(false);
      expect(query.mock.calls.some(([sql]) => sql.includes("FROM evidence WHERE"))).toBe(true);
    } finally { query.mockRestore(); }
  });

  it("rolls back metadata, inline bodies, audits and events together", async () => {
    const { svc, ws } = await fixture();
    const head = await store.activity.head(ws.id);
    const events: unknown[] = [];
    const off = svc.bus.subscribe(ws.id, (event) => events.push(event));
    await expect(store.transaction(async () => {
      await svc.createEvidence(ws.id, { title: "Discarded", content: "private body", data: { observed: true } });
      throw new Error("discard");
    })).rejects.toThrow("discard");
    off();
    expect(await store.evidence.list(ws.id)).toEqual([]);
    expect(await store.driver.query("SELECT evidence_id FROM evidence_content WHERE workspace_id = ?", [ws.id])).toEqual([]);
    expect(await store.activity.head(ws.id)).toEqual(head);
    expect(events).toEqual([]);
  });

  it("cleans inline body rows on evidence and workspace deletion", async () => {
    const { svc, ws } = await fixture();
    const e = await svc.createEvidence(ws.id, { title: "Delete", content: "artifact" });
    expect(await store.evidence.delete(e.id)).toBe(true);
    expect(await store.driver.query("SELECT evidence_id FROM evidence_content WHERE evidence_id = ?", [e.id])).toEqual([]);
    await svc.createEvidence(ws.id, { title: "Delete workspace", data: { artifact: true } });
    await store.deleteWorkspace(ws.id);
    expect(await store.driver.query("SELECT evidence_id FROM evidence_content WHERE workspace_id = ?", [ws.id])).toEqual([]);
  });

  it("keeps inline creation/update/review results hydrated while events and audits contain metadata", async () => {
    const { svc, ws } = await fixture();
    const events: unknown[] = [];
    const off = svc.bus.subscribe(ws.id, (event) => { if (event.type.startsWith("evidence.")) events.push(event.data); });
    const e = await svc.createEvidence(ws.id, { title: "Inline", content: "secret initial", data: { secret: true }, requirementIds: [A] });
    const updated = await svc.updateEvidence(ws.id, e.id, { content: "secret updated" });
    const reviewed = await svc.reviewEvidence(ws.id, e.id, "accepted", "Reviewer", undefined, evidenceReviewScope(updated));
    off();
    expect(reviewed).toMatchObject({ content: "secret updated", data: { secret: true } });
    expect(events).toHaveLength(3);
    for (const event of events) {
      expect(event).not.toHaveProperty("content");
      expect(event).not.toHaveProperty("data");
    }
    expect(JSON.stringify(await store.activity.chain(ws.id))).not.toContain("secret initial");
    expect(JSON.stringify(await store.activity.chain(ws.id))).not.toContain("secret updated");
  });
});

describe(`file evidence integrity (${database.dialect})`, () => {
  it("creates only verified server-owned references and performs blob I/O outside transactions", async () => {
    const { svc, ws, blobs } = await fixture();
    const authorize = vi.fn(async () => { expect(store.inTransaction).toBe(true); });
    const e = await svc.createFileEvidence(ws.slug, fileInput, bytes, "Uploader", authorize);
    expect(e).toMatchObject({ workspaceId: ws.id, source: "upload", status: "pending-review", fileName: "report.pdf", artifact: { sha256: createHash("sha256").update(bytes).digest("hex"), size: bytes.length, mediaType: "application/pdf" } });
    expect(e.sha256).toBe(e.artifact!.sha256);
    expect(e).not.toHaveProperty("content");
    expect(e).not.toHaveProperty("data");
    expect(await store.driver.query("SELECT evidence_id FROM evidence_content WHERE evidence_id = ?", [e.id])).toEqual([]);
    const read = await svc.getEvidenceFile(ws.slug, e.id, authorize);
    expect(read.bytes).toEqual(bytes);
    expect(authorize).toHaveBeenCalledTimes(2);
    expect(blobs.calls.every((call) => !call.inTransaction)).toBe(true);
    expect(blobs.calls.every((call) => call.scope.tenantId === ws.tenantId && call.scope.workspaceId === ws.id)).toBe(true);
  });

  it("rejects invalid metadata, unsupported fields, forged references and empty/oversize files before storage", async () => {
    const { svc, ws, blobs } = await fixture();
    const invalid = [ { title: "" }, { fileName: "../report.pdf" }, { mediaType: "bad\r\nheader" }, { collectedAt: "not-a-date" }, { validUntil: "2025-01-01" }, { requirementIds: ["missing"] }, { artifact: { id: "fake" } }, { status: "accepted" }, { sha256: "f".repeat(64) }, { content: "hidden bytes" } ];
    for (const patch of invalid) await expect(svc.createFileEvidence(ws.id, { ...fileInput, ...patch } as FileEvidenceInput, bytes)).rejects.toThrow();
    await expect(svc.createFileEvidence(ws.id, fileInput, new Uint8Array())).rejects.toThrow();
    await expect(svc.createFileEvidence(ws.id, fileInput, new Uint8Array(MAX_BLOB_BYTES + 1))).rejects.toThrow();
    await expect(svc.createEvidence(ws.id, { title: "Forged", artifact: { id: "fake", sha256: "f".repeat(64), size: 8, mediaType: "application/pdf" } })).rejects.toThrow("server-owned");
    expect(blobs.calls).toEqual([]);
    expect(await store.evidence.metadataList(ws.id)).toEqual([]);
  });

  it("verifies stored bytes for retrieval and review, preserving decisions when storage is corrupted", async () => {
    const { svc, ws, blobs } = await fixture();
    const e = await svc.createFileEvidence(ws.id, fileInput, bytes);
    blobs.onRead = async (_scope, _reference, result) => { result[0] = result[0]! ^ 1; return result; };
    await expect(svc.getEvidenceFile(ws.id, e.id)).rejects.toThrow("recorded hash");
    await expect(svc.reviewEvidence(ws.id, e.id, "accepted", "Reviewer", undefined, evidenceReviewScope(e))).rejects.toThrow("recorded hash");
    expect(await store.evidence.get(e.id)).toEqual(e);
  });

  it("cleans up byte-verification failures before publishing metadata", async () => {
    const { svc, ws, blobs } = await fixture();
    blobs.onRead = async (_scope, _reference, result) => { result[0] = result[0]! ^ 1; return result; };
    await expect(svc.createFileEvidence(ws.id, fileInput, bytes)).rejects.toThrow("recorded hash");
    expect(blobs.calls.map((call) => call.operation)).toEqual(["put", "get", "delete"]);
    expect(await store.evidence.metadataList(ws.id)).toEqual([]);
    expect((await store.activity.chain(ws.id)).filter((event) => event.entity === "evidence")).toEqual([]);
  });

  it("keeps file references immutable and binds reviews to links and dates", async () => {
    const { svc, ws, blobs } = await fixture();
    const e = await svc.createFileEvidence(ws.id, fileInput, bytes);
    const accepted = await svc.reviewEvidence(ws.id, e.id, "accepted", "Reviewer", undefined, evidenceReviewScope(e));
    expect(hasCurrentEvidenceReview(accepted)).toBe(true);
    const renamed = await svc.updateEvidence(ws.id, e.id, { title: "Renamed", fileName: "display.pdf" });
    expect(renamed.status).toBe("accepted");
    for (const patch of [{ content: "replacement" }, { data: {} }, { content: undefined }, { artifact: e.artifact }, { sha256: "f".repeat(64) }, { fileName: "../display.pdf" }, { requirementIds: ["missing"] }]) await expect(svc.updateEvidence(ws.id, e.id, patch as never)).rejects.toThrow();
    const relinked = await svc.updateEvidence(ws.id, e.id, { requirementIds: [B] });
    expect(relinked.status).toBe("pending-review");
    expect(relinked.artifact).toEqual(e.artifact);
    expect(relinked.sha256).toBe(e.sha256);
    expect(relinked.reviewHistory).toEqual(accepted.reviewHistory);
    await expect(svc.reviewEvidence(ws.id, e.id, "accepted", "Reviewer", undefined, evidenceReviewScope(e))).rejects.toThrow("changed");
    const reaccepted = await svc.reviewEvidence(ws.id, e.id, "accepted", "Reviewer", undefined, evidenceReviewScope(relinked));
    const dated = await svc.updateEvidence(ws.id, e.id, { validUntil: "2028-12-31" });
    expect(dated.status).toBe("pending-review");
    expect(dated.artifact).toEqual(e.artifact);
    expect(dated.reviewHistory).toEqual(reaccepted.reviewHistory);
    expect(blobs.calls.every((call) => !call.inTransaction)).toBe(true);
  });

  it("publishes nothing on storage/audit/auth failure and cleans bytes only before publication begins", async () => {
    const { svc, ws, blobs } = await fixture();
    const head = await store.activity.head(ws.id);
    blobs.failPut = true;
    await expect(svc.createFileEvidence(ws.id, fileInput, bytes)).rejects.toThrow("storage unavailable");
    blobs.failPut = false;
    const events: unknown[] = [];
    const off = svc.bus.subscribe(ws.id, (event) => events.push(event));
    const log = vi.spyOn(svc, "log").mockRejectedValueOnce(new Error("audit unavailable"));
    await expect(svc.createFileEvidence(ws.id, fileInput, bytes)).rejects.toThrow("audit unavailable");
    log.mockRestore();
    await expect(svc.createFileEvidence(ws.id, fileInput, bytes, "Uploader", async () => { throw new Error("access revoked"); })).rejects.toThrow("access revoked");
    off();
    expect(events).toEqual([]);
    expect(await store.evidence.metadataList(ws.id)).toEqual([]);
    expect(await store.activity.head(ws.id)).toEqual(head);
    const cleanups = blobs.calls.filter((call) => call.operation === "delete");
    expect(cleanups).toHaveLength(1);
    for (const cleanup of cleanups) {
      const reference = blobs.calls.find((call) => call.operation === "get" && call.id === cleanup.id)!;
      await expect(blobs.backing.get(cleanup.scope, { id: reference.id!, sha256: createHash("sha256").update(bytes).digest("hex"), size: bytes.length })).rejects.toThrow();
    }
    expect(blobs.calls.every((call) => !call.inTransaction)).toBe(true);
  });

  it("retains a published file when the commit succeeds but its acknowledgement is lost", async () => {
    const { svc, ws, blobs } = await fixture();
    const transaction = store.driver.transaction.bind(store.driver);
    const commit = vi.spyOn(store.driver, "transaction").mockImplementationOnce(async fn => {
      await transaction(fn);
      throw new Error("commit acknowledgement lost");
    });
    try {
      await expect(svc.createFileEvidence(ws.id, fileInput, bytes)).rejects.toThrow("commit acknowledgement lost");
    } finally { commit.mockRestore(); }
    const published = await store.evidence.metadataList(ws.id);
    expect(published).toHaveLength(1);
    expect((await svc.getEvidenceFile(ws.id, published[0]!.id)).bytes).toEqual(bytes);
    expect(blobs.calls.some(call => call.operation === "delete")).toBe(false);
    expect((await svc.verifyAuditTrail(ws.id)).valid).toBe(true);
  });

  it("rereads workspace/evidence scope after slow storage and rechecks fresh authorization", async () => {
    const { svc, ws, blobs } = await fixture();
    const e = await svc.createFileEvidence(ws.id, fileInput, bytes);
    blobs.onRead = async (_scope, _reference, result) => {
      blobs.onRead = undefined;
      await svc.updateEvidence(ws.id, e.id, { requirementIds: [B] });
      return result;
    };
    await expect(svc.reviewEvidence(ws.id, e.id, "accepted", "Reviewer", undefined, evidenceReviewScope(e))).rejects.toThrow("changed");
    const current = (await store.evidence.get(e.id))!;
    await expect(svc.getEvidenceFile(ws.id, e.id, async () => { throw new Error("access revoked"); })).rejects.toThrow("access revoked");
    await expect(svc.reviewEvidence(ws.id, e.id, "accepted", "Reviewer", undefined, evidenceReviewScope(current), async () => { throw new Error("access revoked"); })).rejects.toThrow("access revoked");
    blobs.onRead = async (_scope, _reference, result) => {
      blobs.onRead = undefined;
      const changed = await svc.workspace(ws.id);
      await store.workspaces.put({ ...changed, tenantId: "tnt_changed" });
      return result;
    };
    await expect(svc.getEvidenceFile(ws.id, e.id)).rejects.toThrow("not found");
    expect((await store.evidence.get(e.id))!.reviewHistory).toEqual([]);
  });

  it("rejects a file reference replacement during retrieval or review", async () => {
    const { svc, ws, blobs } = await fixture();
    const e = await svc.createFileEvidence(ws.id, fileInput, bytes);
    const replacement = await blobs.backing.put({ tenantId: ws.tenantId!, workspaceId: ws.id }, bytes);
    const replace = async (_scope: BlobScope, _reference: BlobReference, result: Uint8Array) => {
      blobs.onRead = undefined;
      await store.evidence.put({ ...e, artifact: { ...replacement, mediaType: "application/pdf" } });
      return result;
    };
    blobs.onRead = replace;
    await expect(svc.getEvidenceFile(ws.id, e.id)).rejects.toThrow("changed");
    await store.evidence.put(e);
    blobs.onRead = replace;
    await expect(svc.reviewEvidence(ws.id, e.id, "accepted", "Reviewer", undefined, evidenceReviewScope(e))).rejects.toThrow("changed");
    expect((await store.evidence.get(e.id))!.reviewHistory).toEqual([]);
  });

  it("cleans uploads if the workspace tenant changes during I/O, and rejects nested file operations", async () => {
    const { svc, ws, blobs } = await fixture();
    blobs.onRead = async (_scope, _reference, result) => {
      blobs.onRead = undefined;
      await store.workspaces.put({ ...(await svc.workspace(ws.id)), tenantId: "tnt_changed" });
      return result;
    };
    await expect(svc.createFileEvidence(ws.id, fileInput, bytes)).rejects.toThrow("organization changed");
    expect(await store.evidence.metadataList(ws.id)).toEqual([]);
    expect(blobs.calls.at(-1)?.operation).toBe("delete");
    await store.workspaces.put({ ...(await svc.workspace(ws.id)), tenantId: ws.tenantId });
    const e = await svc.createFileEvidence(ws.id, fileInput, bytes);
    const before = blobs.calls.length;
    await store.transaction(async () => {
      await expect(svc.createFileEvidence(ws.id, fileInput, bytes)).rejects.toThrow("transaction");
      await expect(svc.getEvidenceFile(ws.id, e.id)).rejects.toThrow("transaction");
      await expect(svc.reviewEvidence(ws.id, e.id, "accepted", "Reviewer", undefined, evidenceReviewScope(e))).rejects.toThrow("reviewed directly");
    });
    expect(blobs.calls).toHaveLength(before);
  });
});

describe(`evidence content migration 6 (${database.dialect})`, () => {
  it("preserves bodies, hashes, approval history, dates and audits; rolls back and runs once", async () => {
    const target = await testDatabase("evidence_m6");
    const driver = target.dialect === "postgres" ? new PostgresDriver(target.url) : new SqliteDriver(target.url);
    const legacyStore = new Store(driver);
    const legacyService = new VisuaService(legacyStore, registry, new EventBus());
    try {
      await driver.execute("CREATE TABLE schema_migrations (version INTEGER PRIMARY KEY, name TEXT NOT NULL, applied_at TEXT NOT NULL)");
      for (const migration of MIGRATIONS.filter((m) => m.version < 6)) await driver.transaction(async (tx) => {
        await migration.up(tx);
        await tx.execute("INSERT INTO schema_migrations (version, name, applied_at) VALUES (?, ?, ?)", [migration.version, migration.name, "2026-01-01"]);
      });
      const ws = await legacyService.createWorkspace({ name: "Pre-v6", profile, frameworks: ["nist-csf-2.0"] });
      const e: Evidence = { id: "ev_m6", workspaceId: ws.id, title: "Reviewed legacy artifact", kind: "configuration", source: "manual", status: "accepted", requirementIds: [A], content: "Raw legacy artifact", data: { enabled: true }, collectedAt: "2026-01-01T00:00:00.000Z", validUntil: "2027-01-01T00:00:00.000Z", createdAt: "2026-01-01T00:00:00.000Z", reviewedAt: "2026-01-02T00:00:00.000Z", reviewedBy: "Reviewer" };
      e.sha256 = artifactHash(e);
      e.reviewHistory = [{ id: "rev_m6", decision: "accepted", reviewedBy: e.reviewedBy!, reviewedAt: e.reviewedAt!, scope: evidenceReviewScope(e) }];
      const cast = target.dialect === "postgres" ? "?::jsonb" : "?";
      await driver.execute(`INSERT INTO evidence (id, workspace_id, data, updated_at) VALUES (?, ?, ${cast}, ?)`, [e.id, ws.id, JSON.stringify(e), "2026-01-02"]);
      const head = await legacyStore.activity.head(ws.id);
      const workspace = await legacyService.workspace(ws.id);
      const migration = MIGRATIONS.find((m) => m.version === 6)!;
      await expect(driver.transaction((tx) => migration.up(new Proxy(tx, {
        get(current, key) {
          if (key === "execute") return async (sql: string, params?: unknown[]) => {
            if (sql.startsWith("UPDATE evidence SET")) throw new Error("metadata write unavailable");
            return current.execute(sql, params);
          };
          const value = current[key as keyof SqlDriver];
          return typeof value === "function" ? value.bind(current) : value;
        },
      })))).rejects.toThrow("metadata write unavailable");
      const raw = (await driver.query<{ data: unknown }>("SELECT data FROM evidence WHERE id = ?", [e.id]))[0]!;
      expect(parseJson<Evidence>(raw.data)).toEqual(e);
      expect(await migrate(driver)).toEqual([6]);
      expect(await legacyStore.evidence.get(e.id)).toEqual(e);
      expect(hasCurrentEvidenceReview((await legacyStore.evidence.get(e.id))!)).toBe(true);
      expect((await legacyStore.evidence.metadataList(ws.id))[0]).not.toHaveProperty("content");
      expect((await driver.query<{ updated_at: string }>("SELECT updated_at FROM evidence WHERE id = ?", [e.id]))[0]!.updated_at).toBe("2026-01-02");
      expect(await legacyStore.activity.head(ws.id)).toEqual(head);
      expect(await legacyService.workspace(ws.id)).toEqual(workspace);
      expect(await migrate(driver)).toEqual([]);
      expect(await legacyStore.evidence.get(e.id)).toEqual(e);
      expect((await legacyService.verifyAuditTrail(ws.id)).valid).toBe(true);
    } finally { await legacyStore.close(); await target.cleanup(); }
  });
});
