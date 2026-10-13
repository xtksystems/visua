import { createHash } from "node:crypto";
import { unzipSync } from "fflate";
import { afterAll, afterEach, describe, expect, it, vi } from "vitest";
import { FrameworkRegistry } from "@visua/frameworks";
import { evidenceReviewScope, type OrganizationProfile, type Role } from "@visua/core";
import { createService } from "../src/context.ts";
import { createApp } from "../src/app.ts";
import { AuthService } from "../src/auth/service.ts";
import { loadAuthConfig } from "../src/auth/config.ts";
import { MemoryBlobStore } from "../src/blobs/index.ts";
import { PostgresDriver } from "../src/storage/postgres.ts";
import type { AccessRecord } from "../src/storage/access.ts";
import { TestClient } from "./client.ts";
import { testDatabase } from "./db.ts";

const db = await testDatabase("auditor_http");
const svc = await createService({ database: db.url, registry: FrameworkRegistry.load(), blobs: new MemoryBlobStore() });
const auth = new AuthService(svc, { ...loadAuthConfig({}), mode: "dev" });
const app = createApp(svc, auth);
const owner = await auth.ensureUser("auditor-http-owner@example.test", "HTTP owner");
const tenant = await auth.createTenant("Auditor HTTP", owner, "fixture");
const profile: OrganizationProfile = { industry: "saas", size: "11-50", dataTypes: [], drivers: [], environments: ["cloud"], maturityTier: 1, guidance: "guided", securityTeamSize: 1 };
const CSF = "nist-csf-2.0", AI = "nist-ai-rmf", A = `${CSF}:PR.AA-01`, B = `${CSF}:PR.AA-02`;
let n = 0;
const fixture = (frameworks = [CSF, AI]) => svc.createWorkspace({ name: `Auditor HTTP ${++n}`, tenantId: tenant.id, profile, frameworks });
async function client(role?: Role) {
  const client = new TestClient(app), login = await client.devLogin(`auditor-http-${++n}@example.test`, "Authenticated auditor");
  expect(login.status).toBe(200);
  if (role) await svc.store.identity.memberships.put({ tenantId: tenant.id, userId: login.json.user.id, role, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
  return { client, id: login.json.user.id };
}
async function raw(client: TestClient, path: string, signal?: AbortSignal) {
  return app.request(path, { signal, headers: { cookie: [...client.jar].map(([key, value]) => `${key}=${value}`).join("; "), ...(client.bearer ? { authorization: `Bearer ${client.bearer}` } : {}) } });
}
afterEach(() => vi.restoreAllMocks());
afterAll(async () => { await svc.store.close(); await db.cleanup(); });

describe(`auditor HTTP (${db.dialect})`, () => {
  it("permits explicit auditor reads but retains viewer, cross-tenant and write floors", async () => {
    const ws = await fixture(), auditor = await client("auditor"), viewer = await client("viewer"), outsider = await client();
    for (const path of ["auditor", "access", "exports/auditor-bundle.zip"]) {
      expect((await viewer.client.get(`/api/workspaces/${ws.id}/${path}`)).status).toBe(403);
      expect((await outsider.client.get(`/api/workspaces/${ws.id}/${path}`)).status).toBe(404);
      expect((await new TestClient(app).get(`/api/workspaces/${ws.id}/${path}`)).status).toBe(401);
    }
    expect((await auditor.client.post(`/api/workspaces/${ws.id}/auditor`)).status).toBe(403);
    expect((await auditor.client.patch(`/api/workspaces/${ws.id}/requirements/${encodeURIComponent(A)}`, { current: 4 })).status).toBe(403);
    expect((await auditor.client.post(`/api/workspaces/${ws.id}/evidence`, { title: "Forbidden", content: "artifact" })).status).toBe(403);
    expect(await svc.readAccess(ws.id)).toEqual([]);
  });

  it("returns selected metadata at the stated instant and records the signed-in principal without assessment changes", async () => {
    const ws = await fixture(), auditor = await client("auditor");
    await svc.updateState(ws.id, A, { current: 2, target: 3 });
    await svc.updateState(ws.id, B, { applicable: false, applicabilityRationale: "Outside contracted scope" });
    const artifact = await svc.createEvidence(ws.id, { title: "Recorded source", content: "PRIVATE_INLINE_BYTES", data: { secret: "PRIVATE_OBSERVATION" }, requirementIds: [A], collectedAt: "2025-01-01", validUntil: "2025-12-31" });
    const revision = await svc.store.workspaces.rev(ws.id), head = await svc.verifyAuditTrail(ws.id);
    const result = await auditor.client.get<{ workspaceId: string; revision: number; asOf: string; capturedAt: string; frameworkIds: string[]; periodStart: string; basis: { records: string }; frameworks: { requirements: { id: string; applicable: boolean; rationale?: string }[] }[]; evidence: { evidence: { id: string }; effective: { validity: string } }[] }>(`/api/workspaces/${ws.slug}/auditor?framework=${CSF}&asOf=2026-01-01T00:00:00Z&periodStart=2025-01-01T00:00:00Z`);
    expect(result.status).toBe(200);
    expect(result.headers.get("cache-control")).toBe("private, no-store");
    expect(result.json).toMatchObject({ workspaceId: ws.id, revision, frameworkIds: [CSF], asOf: "2026-01-01T00:00:00.000Z", periodStart: "2025-01-01T00:00:00.000Z" });
    expect(result.json.basis.records).toContain("no historical revision replay");
    expect(result.json.frameworks[0]!.requirements.find(item => item.id === B)).toMatchObject({ applicable: false, rationale: "Outside contracted scope" });
    expect(result.json.evidence.find(item => item.evidence.id === artifact.id)?.effective.validity).toBe("expired");
    expect(result.text).not.toContain("PRIVATE_INLINE_BYTES"); expect(result.text).not.toContain("PRIVATE_OBSERVATION");
    const access = await auditor.client.get<AccessRecord[]>(`/api/workspaces/${ws.id}/access`);
    expect(access.status).toBe(200); expect(access.json).toHaveLength(1);
    expect(access.json[0]).toMatchObject({ kind: "auditor-view", outcome: "prepared", principalId: auditor.id, principalLabel: expect.stringMatching(/^Authenticated auditor <auditor-http-\d+@example\.test>$/), workspaceId: ws.id, tenantId: tenant.id, revision });
    expect(await svc.store.workspaces.rev(ws.id)).toBe(revision); expect(await svc.verifyAuditTrail(ws.id)).toEqual(head);
  });

  it("returns a real ZIP and a receipt matching its manifest and captured checkpoint", async () => {
    const ws = await fixture(), auditor = await client("auditor");
    const revision = await svc.store.workspaces.rev(ws.id), head = await svc.verifyAuditTrail(ws.id);
    const response = await raw(auditor.client, `/api/workspaces/${ws.id}/exports/auditor-bundle.zip?framework=${CSF}`);
    expect(response.status).toBe(200); expect(response.headers.get("content-type")).toBe("application/zip");
    expect(response.headers.get("content-disposition")).toMatch(/^attachment; filename="visua-auditor-[a-f0-9]{16}\.zip"/);
    expect(response.headers.get("cache-control")).toBe("private, no-store"); expect(response.headers.get("x-content-type-options")).toBe("nosniff");
    const bytes = new Uint8Array(await response.arrayBuffer()), archive = unzipSync(bytes);
    const digest = createHash("sha256").update(archive["manifest.json"]!).digest("hex");
    expect(response.headers.get("x-visua-manifest-sha256")).toBe(digest);
    expect(response.headers.get("x-visua-audit-checkpoint")).toBe(`${ws.id}:${head.events}:${head.head}`);
    expect(archive["index.html"]).toBeDefined(); expect(archive["verify.mjs"]).toBeDefined();
    expect((await svc.readAccess(ws.id))[0]).toMatchObject({ kind: "export", resource: "auditor-bundle.zip", manifestSha256: digest, revision, bytes: bytes.byteLength, principalId: auditor.id });
    expect(await svc.store.workspaces.rev(ws.id)).toBe(revision); expect(await svc.verifyAuditTrail(ws.id)).toEqual(head);
  });

  it("accepts a valid long server-owned display name and email in access attribution", async () => {
    const ws = await fixture(), reader = new TestClient(app);
    const name = "N".repeat(120), email = `${"a".repeat(64)}@${"b".repeat(63)}.${"c".repeat(62)}.testtest`;
    expect(email.length).toBe(200);
    const login = await reader.devLogin(email, name);
    expect(login.status).toBe(200);
    await svc.store.identity.memberships.put({ tenantId: tenant.id, userId: login.json.user.id, role: "auditor", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
    const response = await reader.get(`/api/workspaces/${ws.id}/auditor?framework=${CSF}`);
    expect(response.status).toBe(200);
    expect((await svc.readAccess(ws.id))[0]?.principalLabel).toBe(`${name} <${email}>`);
  });

  it("does not mark a future verification as verified in the auditor evaluation", async () => {
    const ws = await fixture(), auditor = await client("auditor");
    const evidence = await svc.createEvidence(ws.id, { title: "Current accepted artifact", content: "Observed", requirementIds: [A], collectedAt: "2025-01-01", validUntil: "2035-01-01" });
    await svc.reviewEvidence(ws.id, evidence.id, "accepted", "fixture", undefined, evidenceReviewScope(evidence));
    await svc.updateState(ws.id, A, { current: 2, target: 2, verifiedAt: "2030-01-01T00:00:00Z" });
    const response = await auditor.client.get<{ frameworks: { requirements: { id: string; status: string }[] }[] }>(`/api/workspaces/${ws.id}/auditor?framework=${CSF}`);
    expect(response.status).toBe(200);
    expect(response.json.frameworks[0]!.requirements.find(row => row.id === A)?.status).toBe("implemented");
  });

  it("rejects unknown, repeated or invalid query values without preparing an access record", async () => {
    const ws = await fixture(), auditor = await client("auditor");
    for (const query of ["actor=spoof", "framework=unknown", "framework=", "asOf=bad", "asOf=2026-02-30T00:00:00Z", "asOf=2999-01-01T00:00:00Z", "asOf=2025-01-01T00:00:00Z&asOf=2025-01-02T00:00:00Z", "asOf=2025-01-01T00:00:00Z&periodStart=2025-01-02T00:00:00Z"]) {
      for (const route of ["auditor", "exports/auditor-bundle.zip"]) expect((await auditor.client.get(`/api/workspaces/${ws.id}/${route}?${query}`)).status).toBe(400);
    }
    for (const query of ["limit=201", "limit=0", "limit=1.5", "limit=NaN", "limit=1&limit=2", "actor=spoof"]) expect((await auditor.client.get(`/api/workspaces/${ws.id}/access?${query}`)).status).toBe(400);
    expect(await svc.readAccess(ws.id)).toEqual([]);
  });

  it("logs every existing export kind separately with the same capability and unchanged assessment head", async () => {
    const ws = await fixture([CSF, AI, "nist-sp-800-53-r5", "aicpa-tsc-2017"]), auditor = await client("auditor");
    const revision = await svc.store.workspaces.rev(ws.id), head = await svc.verifyAuditTrail(ws.id);
    const kinds = ["csf-profile.csv", "action-plan.csv", "evidence-index.csv", "ai-rmf-profile.csv", "soc2-pbc.csv", "readiness.md", "oscal-ssp.json", "oscal-poam.json"];
    for (const kind of kinds) {
      const response = await auditor.client.get(`/api/workspaces/${ws.id}/exports/${kind}`);
      expect(response.status, `${kind}: ${response.text.slice(0, 150)}`).toBe(200);
      expect(response.headers.get("cache-control")).toBe("private, no-store"); expect(response.headers.get("content-disposition")).toMatch(/^attachment;/);
    }
    expect((await svc.readAccess(ws.id)).map(item => item.resource).sort()).toEqual(kinds.sort());
    expect(await svc.store.workspaces.rev(ws.id)).toBe(revision); expect(await svc.verifyAuditTrail(ws.id)).toEqual(head);
  });

  it("retains file download read floor and logs verified prepared bytes without paths", async () => {
    const ws = await fixture(), viewer = await client("viewer");
    const bytes = Buffer.from([0, 255, 10, 42]);
    const evidence = await svc.createFileEvidence(ws.id, { title: "File", fileName: "file.bin", mediaType: "application/octet-stream", requirementIds: [A] }, bytes);
    const revision = await svc.store.workspaces.rev(ws.id), head = await svc.verifyAuditTrail(ws.id);
    const response = await raw(viewer.client, `/api/workspaces/${ws.id}/evidence/${evidence.id}/file`);
    expect(response.status).toBe(200); expect(Buffer.from(await response.arrayBuffer())).toEqual(bytes);
    expect((await svc.readAccess(ws.id))[0]).toMatchObject({ kind: "evidence-download", resource: evidence.id, bytes: bytes.length, principalId: viewer.id });
    expect(JSON.stringify(await svc.readAccess(ws.id))).not.toContain("file.bin");
    expect(await svc.store.workspaces.rev(ws.id)).toBe(revision); expect(await svc.verifyAuditTrail(ws.id)).toEqual(head);
  });

  it.each(["role", "membership", "session", "workspace"] as const)("refuses bytes after %s revocation during external blob I/O", async change => {
    const ws = await fixture(), auditor = await client("auditor");
    await svc.createFileEvidence(ws.id, { title: "Delayed file", fileName: "slow.bin", mediaType: "application/octet-stream", requirementIds: [A] }, Buffer.from("slow bytes"));
    const original = svc.blobs.get.bind(svc.blobs);
    let entered!: () => void, release!: () => void;
    const started = new Promise<void>(resolve => { entered = resolve; }), gate = new Promise<void>(resolve => { release = resolve; });
    vi.spyOn(svc.blobs, "get").mockImplementationOnce(async (...args) => { expect(svc.store.inTransaction).toBe(false); const value = await original(...args); entered(); await gate; return value; });
    const pending = raw(auditor.client, `/api/workspaces/${ws.id}/exports/auditor-bundle.zip?framework=${CSF}`);
    await started;
    if (change === "role") await svc.store.identity.memberships.put({ tenantId: tenant.id, userId: auditor.id, role: "viewer", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
    if (change === "membership") await svc.store.identity.memberships.delete(tenant.id, auditor.id);
    if (change === "session") expect((await auditor.client.post("/api/auth/logout")).status).toBe(200);
    if (change === "workspace") await svc.deleteWorkspace(ws.id);
    release();
    const response = await pending;
    expect(response.status).toBe(change === "role" ? 403 : change === "session" ? 401 : 404);
    expect(response.headers.get("x-visua-manifest-sha256")).toBeNull(); expect(response.headers.get("content-type")).not.toBe("application/zip");
    expect(await svc.store.access.recent(ws.id)).toEqual([]);
  });

  it("refuses a request cancelled while final access recording waits for its workspace lock", async () => {
    const ws = await fixture(), auditor = await client("auditor"), controller = new AbortController();
    const lock = svc.store.lock.bind(svc.store);
    let calls = 0, entered!: () => void, release!: () => void;
    const waiting = new Promise<void>(resolve => { entered = resolve; }), gate = new Promise<void>(resolve => { release = resolve; });
    vi.spyOn(svc.store, "lock").mockImplementation(async key => {
      // Snapshot capture takes the first lock. The next lock is final access recording.
      if (key === `ws:${ws.id}` && ++calls === 2) { entered(); await gate; }
      await lock(key);
    });
    const pending = raw(auditor.client, `/api/workspaces/${ws.id}/auditor?framework=${CSF}`, controller.signal);
    try {
      await waiting; controller.abort();
    } finally { release(); }
    const response = await pending;
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ error: "The request was interrupted" });
    expect(await svc.readAccess(ws.id)).toEqual([]);
  });

  it.skipIf(db.dialect !== "postgres").each(["membership", "token"] as const)("rechecks %s revocation after a real PostgreSQL access-record lock wait", async change => {
    const ws = await fixture(), auditor = await client("auditor");
    let tokenId: string | undefined;
    if (change === "token") {
      const ownerClient = new TestClient(app);
      expect((await ownerClient.devLogin(owner.email, owner.name)).status).toBe(200);
      const created = await ownerClient.post<{ token: string; id: string }>(`/api/tenants/${tenant.id}/tokens`, { name: "Lock-wait fixture", role: "auditor" });
      expect(created.status).toBe(201);
      auditor.client.bearer = created.json.token; tokenId = created.json.id;
    }
    await svc.createFileEvidence(ws.id, { title: "Lock wait file", fileName: "wait.bin", mediaType: "application/octet-stream", requirementIds: [A] }, Buffer.from("Prepared before lock contention"));
    const blocker = new PostgresDriver(db.url);
    const blobGet = svc.blobs.get.bind(svc.blobs), lock = svc.store.lock.bind(svc.store);
    let blobEntered!: () => void, releaseBlob!: () => void, lockHeld!: () => void, releaseLock!: () => void, waitEntered!: (pid: number) => void;
    const blobWaiting = new Promise<void>(resolve => { blobEntered = resolve; }), blobGate = new Promise<void>(resolve => { releaseBlob = resolve; });
    const held = new Promise<void>(resolve => { lockHeld = resolve; }), lockGate = new Promise<void>(resolve => { releaseLock = resolve; });
    const waitPid = new Promise<number>(resolve => { waitEntered = resolve; });
    let afterBlob = false;
    vi.spyOn(svc.blobs, "get").mockImplementationOnce(async (...args) => {
      expect(svc.store.inTransaction).toBe(false);
      const value = await blobGet(...args); blobEntered(); await blobGate; afterBlob = true; return value;
    });
    vi.spyOn(svc.store, "lock").mockImplementation(async key => {
      if (afterBlob && key === `ws:${ws.id}`) {
        const [row] = await svc.store.db().query<{ pid: number }>("SELECT pg_backend_pid() AS pid");
        waitEntered(row!.pid);
      }
      await lock(key);
    });
    const pending = raw(auditor.client, `/api/workspaces/${ws.id}/exports/auditor-bundle.zip?framework=${CSF}`);
    let holding: Promise<void> | undefined;
    try {
      await Promise.race([blobWaiting, pending.then(() => { throw new Error("Request finished before the blob gate"); })]);
      holding = blocker.transaction(async tx => { await tx.lock(`ws:${ws.id}`); lockHeld(); await lockGate; });
      await Promise.race([held, holding]); releaseBlob();
      const pid = await Promise.race([waitPid, pending.then(() => { throw new Error("Request finished before the access-record lock"); })]);
      // Observe the actual ungranted advisory lock, rather than relying on a sleep.
      await vi.waitFor(async () => {
        const rows = await blocker.query("SELECT pid FROM pg_locks WHERE pid = ? AND locktype = 'advisory' AND NOT granted", [pid]);
        expect(rows).toHaveLength(1);
      }, { timeout: 3000, interval: 20 });
      if (change === "membership") await svc.store.identity.memberships.delete(tenant.id, auditor.id);
      else expect(await svc.store.identity.apiTokens.revoke(tenant.id, tokenId!)).toBe(true);
      releaseLock(); await holding;
      const response = await pending;
      expect(response.status).toBe(change === "membership" ? 404 : 401);
      expect(response.headers.get("x-visua-manifest-sha256")).toBeNull();
      expect(response.headers.get("content-type")).not.toBe("application/zip");
      expect(await svc.readAccess(ws.id)).toEqual([]);
    } finally {
      releaseBlob(); releaseLock();
      await holding?.catch(() => undefined);
      await pending.catch(() => undefined);
      await blocker.close();
    }
  });
});
