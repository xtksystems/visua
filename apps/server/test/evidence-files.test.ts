import { createHash } from "node:crypto";
import { afterAll, describe, expect, it, vi } from "vitest";
import { evidenceReviewScope, type Evidence, type Role } from "@visua/core";
import { FrameworkRegistry } from "@visua/frameworks";
import { createApp } from "../src/app.ts";
import { createService } from "../src/context.ts";
import { AuthService } from "../src/auth/service.ts";
import { loadAuthConfig } from "../src/auth/config.ts";
import { BlobStoreError, MAX_BLOB_BYTES, MemoryBlobStore } from "../src/blobs/index.ts";
import { TestClient } from "./client.ts";
import { testDatabase } from "./db.ts";
import { EvidenceUploadError, evidenceUpload, withEvidenceUpload } from "../src/evidence-http.ts";

const db = await testDatabase("evidence_files");
const blobs = new MemoryBlobStore();
const svc = await createService({ database: db.url, registry: FrameworkRegistry.load(), blobs });
const auth = new AuthService(svc, { ...loadAuthConfig({}), mode: "dev" });
const app = createApp(svc, auth);
const owner = new TestClient(app);
const login = await owner.devLogin("files-owner@example.test", "File owner");
const tenantId = login.json.activeTenant!.id;
const A = "nist-csf-2.0:PR.AA-01";
const bytes = Buffer.from([0, 255, 13, 10, 60, 115, 118, 103, 62]);
afterAll(async () => { await svc.store.close(); await db.cleanup(); });

async function workspace() {
  const result = await owner.post<{ workspace: { id: string } }>("/api/workspaces", { name: "Evidence files", frameworks: ["nist-csf-2.0"], profile: { industry: "saas", size: "11-50" } });
  expect(result.status).toBe(201);
  return result.json.workspace.id;
}
function form(content: Uint8Array = bytes, metadata: unknown = { title: "Access configuration", requirementIds: [A], collectedAt: "2026-01-01", validUntil: "2030-12-31" }, name = "access.bin", mediaType = "application/octet-stream") {
  const data = new FormData();
  data.set("file", new File([content as Uint8Array<ArrayBuffer>], name, { type: mediaType }));
  data.set("metadata", JSON.stringify(metadata));
  return data;
}
function credentials(client: TestClient) {
  return { cookie: [...client.jar].map(([k, v]) => `${k}=${v}`).join("; "), "x-visua-csrf": client.csrf, ...(client.bearer ? { authorization: `Bearer ${client.bearer}` } : {}) };
}
function upload(client: TestClient, ws: string, body = form(), extra: Record<string, string> = {}) {
  return app.request(`/api/workspaces/${ws}/evidence/files`, { method: "POST", headers: { ...credentials(client), ...extra }, body });
}
async function fixture() {
  const ws = await workspace();
  const response = await upload(owner, ws);
  expect(response.status, await response.clone().text()).toBe(201);
  return { ws, evidence: await response.json() as Evidence };
}
async function member(role: Role) {
  const email = `file-${role}-${Date.now()}-${Math.random()}@example.test`;
  const created = await owner.post<{ id: string }>(`/api/tenants/${tenantId}/members`, { email, role });
  expect(created.status).toBe(201);
  const client = new TestClient(app);
  const signedIn = await client.devLogin(email);
  expect(signedIn.status).toBe(200);
  return { client, id: signedIn.json.user.id };
}

describe(`authorized evidence file API (${db.dialect})`, () => {
  it("publishes verified byte metadata, lists no bodies, and downloads the original binary", async () => {
    const { ws, evidence } = await fixture();
    expect(evidence).toMatchObject({ source: "upload", status: "pending-review", fileName: "access.bin", artifact: { size: bytes.length, mediaType: "application/octet-stream" }, sha256: createHash("sha256").update(bytes).digest("hex") });
    expect(evidence.artifact!.sha256).toBe(evidence.sha256);
    expect(evidence.content).toBeUndefined();
    expect(evidence.data).toBeUndefined();
    const inline = await svc.createEvidence(ws, { title: "Inline observation", content: "PRIVATE inline body", data: { privateObservation: true }, requirementIds: [A] });
    const listed = await owner.get<Evidence[]>(`/api/workspaces/${ws}/evidence`);
    expect(listed.json.every(item => item.content === undefined && item.data === undefined)).toBe(true);
    expect(listed.text).not.toContain("PRIVATE inline body");
    const detail = await owner.get<Evidence>(`/api/workspaces/${ws}/evidence/${inline.id}`);
    expect(detail.json.content).toBe("PRIVATE inline body");
    const response = await app.request(`/api/workspaces/${ws}/evidence/${evidence.id}/file`, { headers: credentials(owner) });
    expect(response.status).toBe(200);
    expect(Buffer.from(await response.arrayBuffer())).toEqual(bytes);
    expect(response.headers.get("content-type")).toBe("application/octet-stream");
    expect(response.headers.get("content-disposition")).toContain('attachment; filename="access.bin"');
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
    expect((await svc.verifyAuditTrail(ws)).valid).toBe(true);
  });

  it("requires workspace access for metadata, detail, upload and download; a hash grants no access", async () => {
    const { ws, evidence } = await fixture();
    const other = new TestClient(app);
    await other.devLogin(`outside-${Date.now()}@different.test`);
    for (const path of [`/evidence`, `/evidence/${evidence.id}`, `/evidence/${evidence.id}/file`, `/evidence/${evidence.sha256}/file`]) expect((await other.get(`/api/workspaces/${ws}${path}`)).status).toBe(404);
    expect((await upload(other, ws)).status).toBe(404);
    const sameTenantOtherWs = await workspace();
    expect((await owner.get(`/api/workspaces/${sameTenantOtherWs}/evidence/${evidence.id}/file`)).status).toBe(404);
    expect((await new TestClient(app).get(`/api/workspaces/${ws}/evidence/${evidence.id}/file`)).status).toBe(401);
  });

  it("downloads exact bytes after a display filename contains malformed Unicode", async () => {
    const { ws, evidence } = await fixture();
    const renamed = await owner.patch(`/api/workspaces/${ws}/evidence/${evidence.id}`, { fileName: "report\ud800.bin" });
    expect(renamed.status).toBe(200);
    const response = await app.request(`/api/workspaces/${ws}/evidence/${evidence.id}/file`, { headers: credentials(owner) });
    expect(response.status).toBe(200);
    expect(Buffer.from(await response.arrayBuffer())).toEqual(bytes);
    expect(response.headers.get("content-disposition")).toContain("report%EF%BF%BD.bin");
  });

  it.each(["viewer", "auditor"] as const)("permits %s downloads and refuses writes before blob storage", async role => {
    const { ws, evidence } = await fixture();
    const { client } = await member(role);
    const put = vi.spyOn(blobs, "put");
    expect((await upload(client, ws)).status).toBe(403);
    expect(put).not.toHaveBeenCalled();
    put.mockRestore();
    expect((await client.get(`/api/workspaces/${ws}/evidence/${evidence.id}/file`)).status).toBe(200);
  });

  it("contributors can upload but only approvers can bind a file review", async () => {
    const ws = await workspace();
    const { client } = await member("contributor");
    const response = await upload(client, ws);
    expect(response.status).toBe(201);
    const evidence = await response.json() as Evidence;
    expect((await client.patch(`/api/workspaces/${ws}/evidence/${evidence.id}`, { decision: "accepted", expectedScope: evidenceReviewScope(evidence) })).status).toBe(403);
    const reviewed = await owner.patch<Evidence>(`/api/workspaces/${ws}/evidence/${evidence.id}`, { decision: "accepted", expectedScope: evidenceReviewScope(evidence) });
    expect(reviewed.status).toBe(200);
    expect(reviewed.json.reviewHistory!.at(-1)!.scope!.sha256).toBe(createHash("sha256").update(bytes).digest("hex"));
  });

  it("rejects empty/oversize files, malformed forms and forged server-owned references without records", async () => {
    const ws = await workspace();
    const head = await svc.store.activity.head(ws);
    const put = vi.spyOn(blobs, "put");
    expect((await upload(owner, ws, form(new Uint8Array()))).status).toBe(400);
    expect((await upload(owner, ws, form(new Uint8Array(MAX_BLOB_BYTES + 1)))).status).toBe(413);
    const duplicate = form(); duplicate.append("file", new File(["extra"], "extra.txt"));
    expect((await upload(owner, ws, duplicate)).status).toBe(400);
    const bad = form(); bad.set("metadata", "{broken");
    expect((await upload(owner, ws, bad)).status).toBe(400);
    for (const malicious of [{ artifact: { id: "other", sha256: "f".repeat(64), size: 5 } }, { sha256: "f".repeat(64) }, { status: "accepted" }, { content: "body" }]) {
      expect((await upload(owner, ws, form(bytes, { title: "Forged", requirementIds: [A], ...malicious }))).status).toBe(400);
    }
    expect((await owner.post(`/api/workspaces/${ws}/evidence`, { title: "Forged JSON", requirementIds: [A], artifact: { id: "other" } })).status).toBe(400);
    expect(put).not.toHaveBeenCalled(); put.mockRestore();
    expect(await svc.store.evidence.count(ws)).toBe(0);
    expect(await svc.store.activity.head(ws)).toEqual(head);
  });

  it("requires CSRF for multipart uploads and serves active formats as attachments", async () => {
    const ws = await workspace();
    expect((await upload(owner, ws, form(), { "x-visua-csrf": "" })).status).toBe(403);
    const response = await upload(owner, ws, form(Buffer.from("<script>alert(1)</script>"), { title: "HTML observation", requirementIds: [A] }, 'quoted" ü.html', "text/html"));
    expect(response.status).toBe(201);
    const evidence = await response.json() as Evidence;
    const file = await app.request(`/api/workspaces/${ws}/evidence/${evidence.id}/file`, { headers: credentials(owner) });
    expect(file.status).toBe(200);
    expect(file.headers.get("content-type")).toBe("application/octet-stream");
    expect(file.headers.get("content-security-policy")).toContain("sandbox");
    expect(file.headers.get("content-disposition")).toContain("filename*=UTF-8''");
  });

  it("accepts public metadata length bounds and rejects disabled or unassessable links before storage", async () => {
    const ws = await workspace();
    const response = await upload(owner, ws, form(bytes, { title: "t".repeat(300), description: "d".repeat(10_000), requirementIds: [A] }, `${"n".repeat(296)}.bin`));
    expect(response.status).toBe(201);
    const put = vi.spyOn(blobs, "put");
    for (const requirementIds of [[], ["aicpa-tsc-2017:CC6.1"], ["nist-csf-2.0:PR"], ["unknown:missing"]]) {
      expect((await upload(owner, ws, form(bytes, { title: "Invalid links", requirementIds }))).status).toBe(400);
    }
    expect(put).not.toHaveBeenCalled(); put.mockRestore();
  });

  it("does not publish on storage failure and gives a retryable safe download error", async () => {
    const { ws, evidence } = await fixture();
    const count = await svc.store.evidence.count(ws);
    const head = await svc.store.activity.head(ws);
    const put = vi.spyOn(blobs, "put").mockRejectedValueOnce(new BlobStoreError("unavailable"));
    expect((await upload(owner, ws)).status).toBe(503); put.mockRestore();
    expect(await svc.store.evidence.count(ws)).toBe(count);
    expect(await svc.store.activity.head(ws)).toEqual(head);
    const get = vi.spyOn(blobs, "get").mockRejectedValueOnce(new BlobStoreError("integrity"));
    const response = await owner.get(`/api/workspaces/${ws}/evidence/${evidence.id}/file`);
    expect(response.status).toBe(503);
    expect(response.text).not.toContain(evidence.artifact!.id); get.mockRestore();
    expect((await owner.get(`/api/workspaces/${ws}/evidence/${evidence.id}/file`)).status).toBe(200);
  });

  it("cleans an uploaded blob when membership is downgraded before publication", async () => {
    const ws = await workspace();
    const { client, id } = await member("contributor");
    let entered!: () => void, release!: () => void;
    const started = new Promise<void>(resolve => { entered = resolve; });
    const waiting = new Promise<void>(resolve => { release = resolve; });
    const original = blobs.put.bind(blobs);
    const put = vi.spyOn(blobs, "put").mockImplementationOnce(async (scope, data) => { expect(svc.store.inTransaction).toBe(false); const ref = await original(scope, data); entered(); await waiting; return ref; });
    const remove = vi.spyOn(blobs, "delete");
    const request = upload(client, ws); await started;
    expect((await owner.patch(`/api/tenants/${tenantId}/members/${id}`, { role: "viewer" })).status).toBe(200);
    release();
    expect((await request).status).toBe(403);
    expect(await svc.store.evidence.count(ws)).toBe(0);
    expect(remove).toHaveBeenCalledOnce();
    put.mockRestore(); remove.mockRestore();
  });

  it("rechecks an API token after reading bytes, refusing a token revoked during storage I/O", async () => {
    const { ws, evidence } = await fixture();
    const token = await owner.post<{ id: string; token: string }>(`/api/tenants/${tenantId}/tokens`, { name: "Download fixture", role: "viewer" });
    expect(token.status).toBe(201);
    const client = new TestClient(app); client.bearer = token.json.token;
    let entered!: () => void, release!: () => void;
    const started = new Promise<void>(resolve => { entered = resolve; });
    const waiting = new Promise<void>(resolve => { release = resolve; });
    const original = blobs.get.bind(blobs);
    const get = vi.spyOn(blobs, "get").mockImplementationOnce(async (scope, ref) => { expect(svc.store.inTransaction).toBe(false); const data = await original(scope, ref); entered(); await waiting; return data; });
    const request = client.get(`/api/workspaces/${ws}/evidence/${evidence.id}/file`); await started;
    expect((await owner.del(`/api/tenants/${tenantId}/tokens/${token.json.id}`)).status).toBe(204);
    release(); expect((await request).status).toBe(401); get.mockRestore();
  });

  it("rechecks an aging API token without a usage write under the organization lock", async () => {
    const { ws, evidence } = await fixture();
    const token = await owner.post<{ id: string; token: string }>(`/api/tenants/${tenantId}/tokens`, { name: "Aging download fixture", role: "viewer" });
    expect(token.status).toBe(201);
    const client = new TestClient(app); client.bearer = token.json.token;
    const stale = new Date(Date.now() - 120_000).toISOString();
    const original = blobs.get.bind(blobs);
    const get = vi.spyOn(blobs, "get").mockImplementationOnce(async (scope, ref) => {
      const data = await original(scope, ref);
      await svc.store.identity.apiTokens.touch(token.json.id, stale);
      return data;
    });
    try {
      const response = await client.get(`/api/workspaces/${ws}/evidence/${evidence.id}/file`);
      expect(response.status).toBe(200);
      const record = await svc.store.identity.apiTokens.byHash(createHash("sha256").update(token.json.token).digest("hex"));
      expect(record!.lastUsedAt).toBe(stale);
    } finally { get.mockRestore(); }
  });
});

describe("multipart resource boundaries", () => {
  it.each([undefined, "1"])("bounds a streamed body regardless of its declared size (%s)", async length => {
    let cancelled = false;
    const stream = new ReadableStream<Uint8Array>({
      pull(controller) { controller.enqueue(new Uint8Array(65_536)); },
      cancel() { cancelled = true; },
    });
    const headers: Record<string, string> = { "content-type": "multipart/form-data; boundary=files" };
    if (length) headers["content-length"] = length;
    const request = new Request("http://localhost/upload", { method: "POST", headers, body: stream, duplex: "half" } as RequestInit & { duplex: "half" });
    await expect(evidenceUpload(request)).rejects.toMatchObject({ status: 413 });
    expect(cancelled).toBe(true);
  });

  it("cancels a stalled body when its caller aborts", async () => {
    let cancelled = false;
    const abort = new AbortController();
    const stream = new ReadableStream<Uint8Array>({ start(controller) { controller.enqueue(new Uint8Array([1])); }, cancel() { cancelled = true; } });
    const request = new Request("http://localhost/upload", { method: "POST", headers: { "content-type": "multipart/form-data; boundary=files" }, body: stream, signal: abort.signal, duplex: "half" } as RequestInit & { duplex: "half" });
    const result = evidenceUpload(request);
    abort.abort();
    await expect(result).rejects.toBeInstanceOf(EvidenceUploadError);
    expect(cancelled).toBe(true);
  });

  it("bounds active uploads, refuses excess work, and recovers capacity after failures", async () => {
    let release!: () => void;
    const pending = new Promise<void>(resolve => { release = resolve; });
    const active = Array.from({ length: 4 }, () => withEvidenceUpload(async () => { await pending; throw new Error("Storage fixture failure"); }).catch(error => error));
    await expect(withEvidenceUpload(async () => true)).rejects.toMatchObject({ status: 503 });
    release(); await Promise.all(active);
    await expect(withEvidenceUpload(async () => true)).resolves.toBe(true);
  });
});
