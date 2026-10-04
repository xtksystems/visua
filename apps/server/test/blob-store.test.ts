import { createHash, createHmac } from "node:crypto";
import { constants } from "node:fs";
import * as fs from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { createServer, type IncomingMessage, type Server } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  BlobStoreError, LocalBlobStore, MAX_BLOB_BYTES, MemoryBlobStore, S3BlobStore, createBlobStore,
  type BlobReference, type BlobScope, type BlobStore,
} from "../src/blobs/index.ts";

vi.mock("node:fs/promises", async (original) => {
  const actual = await original<typeof import("node:fs/promises")>();
  return { ...actual, open: vi.fn(actual.open) };
});

const scope = { tenantId: "tenant-one", workspaceId: "workspace-one" };
const otherTenant = { ...scope, tenantId: "tenant-two" };
const otherWorkspace = { ...scope, workspaceId: "workspace-two" };
const bytes = Uint8Array.from(Buffer.from("Auditable artifact\0\xff", "utf8"));
const hash = (value: Uint8Array | string) => createHash("sha256").update(value).digest("hex");
let base: string;
const servers: Server[] = [];
const clients: S3BlobStore[] = [];

beforeEach(async () => {
  // macOS's system temporary directory may have an operator-owned /var alias.
  base = await fs.realpath(await fs.mkdtemp(join(tmpdir(), "visua-blobs-")));
});
afterEach(async () => {
  for (const client of clients.splice(0)) client.destroy();
  for (const server of servers.splice(0)) {
    server.closeAllConnections();
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
  vi.unstubAllEnvs();
  vi.mocked(fs.open).mockReset();
  const actual = await vi.importActual<typeof import("node:fs/promises")>("node:fs/promises");
  vi.mocked(fs.open).mockImplementation(actual.open);
  await fs.rm(base, { recursive: true, force: true });
});

describe.each(["memory", "local"] as const)("%s blob contract", (backend) => {
  const store = (): BlobStore => backend === "memory" ? new MemoryBlobStore() : new LocalBlobStore(join(base, "blobs"));

  it("stores independent bytes with random ids and server SHA-256", async () => {
    const blobs = store();
    const input = Uint8Array.from(bytes);
    const reference = await blobs.put(scope, input);
    const duplicate = await blobs.put(scope, bytes);
    expect(reference).toMatchObject({ sha256: hash(bytes), size: bytes.length });
    expect(reference.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(duplicate.id).not.toBe(reference.id);
    input.fill(0);
    const download = await blobs.get(scope, reference);
    expect(Buffer.from(download)).toEqual(Buffer.from(bytes));
    download.fill(0);
    expect(Buffer.from(await blobs.get(scope, reference))).toEqual(Buffer.from(bytes));
  });

  it("isolates tenant and workspace reads and deletion", async () => {
    const blobs = store();
    const reference = await blobs.put(scope, bytes);
    for (const denied of [otherTenant, otherWorkspace]) {
      await expect(blobs.get(denied, reference)).rejects.toMatchObject({ code: "not_found" });
      await blobs.delete(denied, reference.id);
    }
    expect(Buffer.from(await blobs.get(scope, reference))).toEqual(Buffer.from(bytes));
    await blobs.delete(scope, reference.id);
    await blobs.delete(scope, reference.id);
    await expect(blobs.get(scope, reference)).rejects.toMatchObject({ code: "not_found" });
  });

  it("checks persisted bytes against reference size and digest on every read", async () => {
    const blobs = store();
    const reference = await blobs.put(scope, bytes);
    await expect(blobs.get(scope, { ...reference, sha256: "0".repeat(64) })).rejects.toMatchObject({ code: "integrity" });
    await expect(blobs.get(scope, { ...reference, size: reference.size + 1 })).rejects.toMatchObject({ code: "integrity" });
    await expect(blobs.get(scope, { ...reference, size: MAX_BLOB_BYTES + 1 })).rejects.toMatchObject({ code: "invalid_input" });
  });

  it("accepts the exact byte bound and rejects empty/oversized input before persistence", async () => {
    const blobs = store();
    const largest = new Uint8Array(MAX_BLOB_BYTES).fill(31);
    const reference = await blobs.put(scope, largest);
    expect((await blobs.get(scope, reference)).byteLength).toBe(MAX_BLOB_BYTES);
    await expect(blobs.put(scope, new Uint8Array())).rejects.toMatchObject({ code: "invalid_input" });
    await expect(blobs.put(scope, new Uint8Array(MAX_BLOB_BYTES + 1))).rejects.toMatchObject({ code: "invalid_input" });
  });

  it.each(["..", "../escape", "/absolute", "a/b", "a\\b", "a\0b", "%2e%2e", "", "a\n", "a".repeat(129)])("rejects traversal/invalid scopes %s", async (component) => {
    const blobs = store();
    for (const invalid of [{ ...scope, tenantId: component }, { ...scope, workspaceId: component }]) {
      await expect(blobs.put(invalid, bytes)).rejects.toMatchObject({ code: "invalid_input" });
      await expect(blobs.delete(invalid, "../escape")).rejects.toMatchObject({ code: "invalid_input" });
    }
  });

  it("rejects malicious ids and malformed references", async () => {
    const blobs = store();
    const reference = await blobs.put(scope, bytes);
    for (const id of ["../escape", reference.sha256, reference.id + "/child", reference.id + "\n", "", "x\0y"]) {
      await expect(blobs.get(scope, { ...reference, id })).rejects.toMatchObject({ code: "invalid_input" });
      await expect(blobs.delete(scope, id)).rejects.toMatchObject({ code: "invalid_input" });
    }
    await expect(blobs.get(scope, { ...reference, sha256: "invalid" })).rejects.toMatchObject({ code: "invalid_input" });
    await expect(blobs.get(scope, { ...reference, size: 0 })).rejects.toMatchObject({ code: "invalid_input" });
  });
});

describe("local private storage", () => {
  const directory = () => join(base, "blobs");
  const pathFor = (reference: BlobReference) => join(directory(), scope.tenantId, scope.workspaceId, reference.id);

  it("persists across adapter instances and creates private directories and files", async () => {
    const reference = await new LocalBlobStore(directory()).put(scope, bytes);
    expect(Buffer.from(await new LocalBlobStore(directory()).get(scope, reference))).toEqual(Buffer.from(bytes));
    for (const path of [directory(), join(directory(), scope.tenantId), join(directory(), scope.tenantId, scope.workspaceId)]) expect((await fs.stat(path)).mode & 0o777).toBe(0o700);
    expect((await fs.stat(pathFor(reference))).mode & 0o777).toBe(0o600);
  });

  it("detects same-size tampering, truncation, oversize and missing bytes", async () => {
    const blobs = new LocalBlobStore(directory());
    const reference = await blobs.put(scope, bytes);
    const path = pathFor(reference);
    await fs.writeFile(path, new Uint8Array(bytes.length).fill(0));
    await expect(blobs.get(scope, reference)).rejects.toMatchObject({ code: "integrity" });
    await fs.truncate(path, bytes.length - 1);
    await expect(blobs.get(scope, reference)).rejects.toMatchObject({ code: "integrity" });
    await fs.truncate(path, MAX_BLOB_BYTES + 1);
    await expect(blobs.get(scope, reference)).rejects.toMatchObject({ code: "integrity" });
    await fs.unlink(path);
    await expect(blobs.get(scope, reference)).rejects.toMatchObject({ code: "not_found" });
  });

  it.each(["root", "ancestor", "tenant", "workspace"])("refuses a symlink %s directory without touching its target", async (kind) => {
    const outside = join(base, "outside");
    await fs.mkdir(outside, { mode: 0o700 });
    let configured = directory();
    let link = configured;
    if (kind === "ancestor") {
      link = join(base, "alias");
      configured = join(link, "blobs");
    } else if (kind === "tenant" || kind === "workspace") {
      await fs.mkdir(directory(), { mode: 0o700 });
      link = join(directory(), scope.tenantId);
      if (kind === "workspace") {
        await fs.mkdir(link, { mode: 0o700 });
        link = join(link, scope.workspaceId);
      }
    }
    await fs.symlink(outside, link);
    await expect(new LocalBlobStore(configured).put(scope, bytes)).rejects.toBeInstanceOf(BlobStoreError);
    expect(await fs.readdir(outside)).toEqual([]);
  });

  it("refuses file symlinks and hard links on reads/deletes", async () => {
    const blobs = new LocalBlobStore(directory());
    const reference = await blobs.put(scope, bytes);
    const path = pathFor(reference);
    const outside = join(base, "outside");
    await fs.writeFile(outside, bytes, { mode: 0o600 });
    await fs.unlink(path);
    await fs.symlink(outside, path);
    await expect(blobs.get(scope, reference)).rejects.toMatchObject({ code: "unavailable" });
    await expect(blobs.delete(scope, reference.id)).rejects.toMatchObject({ code: "unavailable" });
    await fs.unlink(path);
    await fs.link(outside, path);
    await expect(blobs.get(scope, reference)).rejects.toMatchObject({ code: "unavailable" });
    await expect(blobs.delete(scope, reference.id)).rejects.toMatchObject({ code: "unavailable" });
    expect(await fs.readFile(outside)).toEqual(Buffer.from(bytes));
  });

  it("rejects special files without waiting for a FIFO writer", async () => {
    const blobs = new LocalBlobStore(directory());
    const reference = await blobs.put(scope, bytes);
    await fs.unlink(pathFor(reference));
    execFileSync("mkfifo", ["-m", "600", pathFor(reference)]);
    await expect(blobs.get(scope, reference)).rejects.toMatchObject({ code: "unavailable" });
  });

  it("refuses preexisting directories/files with public permissions", async () => {
    await fs.mkdir(directory(), { mode: 0o755 });
    await expect(new LocalBlobStore(directory()).put(scope, bytes)).rejects.toMatchObject({ code: "unavailable" });
    await fs.chmod(directory(), 0o700);
    const blobs = new LocalBlobStore(directory());
    const reference = await blobs.put(scope, bytes);
    await fs.chmod(pathFor(reference), 0o644);
    await expect(blobs.get(scope, reference)).rejects.toMatchObject({ code: "unavailable" });
  });

  it("reads uploads independently and removes a corrupt write before returning failure", async () => {
    const actual = await vi.importActual<typeof import("node:fs/promises")>("node:fs/promises");
    vi.mocked(fs.open).mockImplementation(async (path, flags, mode) => {
      if (typeof flags === "number" && (flags & constants.O_WRONLY) === 0) await actual.writeFile(path, new Uint8Array(bytes.length).fill(0));
      return actual.open(path, flags, mode);
    });
    await expect(new LocalBlobStore(directory()).put(scope, bytes)).rejects.toMatchObject({ code: "integrity" });
    expect(await fs.readdir(join(directory(), scope.tenantId, scope.workspaceId))).toEqual([]);
  });

  it("sanitizes filesystem failures without retaining a raw cause", async () => {
    vi.mocked(fs.open).mockRejectedValue(new Error("secret /operator/private/storage"));
    let error: unknown;
    try { await new LocalBlobStore(directory()).put(scope, bytes); } catch (caught) { error = caught; }
    expect(error).toMatchObject({ code: "unavailable", message: "Evidence file storage is unavailable." });
    expect(error).not.toHaveProperty("cause");
    expect(String(error)).not.toContain("operator");
  });
});

const ACCESS_KEY = "AKIATESTBLOBONLY00000";
const SECRET_KEY = "mock-secret-for-local-protocol-only";
const hmac = (key: Uint8Array | string, input: string) => createHmac("sha256", key).update(input).digest();
const rfc3986 = (value: string) => encodeURIComponent(value).replace(/[!'()*]/g, (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`);

/** Check the SDK's actual SigV4 request against fake test credentials. */
function signed(req: IncomingMessage, body: Buffer): boolean {
  const auth = req.headers.authorization ?? "";
  const match = /^AWS4-HMAC-SHA256 Credential=([^/]+)\/([^,]+), SignedHeaders=([^,]+), Signature=([0-9a-f]{64})$/.exec(auth);
  if (!match || match[1] !== ACCESS_KEY) return false;
  const credentialScope = match[2]!;
  const [date, region, service, end] = credentialScope.split("/");
  if (!date || region !== "us-east-1" || service !== "s3" || end !== "aws4_request") return false;
  const names = match[3]!.split(";");
  const canonicalHeaders = names.map((name) => `${name}:${String(req.headers[name] ?? "").trim().replace(/\s+/g, " ")}\n`).join("");
  const url = new URL(req.url!, "http://localhost");
  const query = [...url.searchParams].map(([key, value]) => [rfc3986(key), rfc3986(value)] as const).sort(([ka, va], [kb, vb]) => ka < kb ? -1 : ka > kb ? 1 : va < vb ? -1 : va > vb ? 1 : 0).map(([key, value]) => `${key}=${value}`).join("&");
  const payloadHash = String(req.headers["x-amz-content-sha256"] ?? "");
  if (payloadHash !== hash(body) && payloadHash !== "UNSIGNED-PAYLOAD") return false;
  const canonical = [req.method, url.pathname, query, canonicalHeaders, match[3], payloadHash].join("\n");
  const stringToSign = ["AWS4-HMAC-SHA256", req.headers["x-amz-date"], credentialScope, hash(canonical)].join("\n");
  const key = hmac(hmac(hmac(hmac("AWS4" + SECRET_KEY, date), region), service), end);
  return hmac(key, stringToSign).toString("hex") === match[4];
}

type MockMode = "normal" | "corrupt" | "oversize" | "chunkOverflow" | "stall" | "headersStall" | "denied" | "retry";
async function mockS3() {
  const objects = new Map<string, Buffer>();
  const requests: { method: string; path: string; signed: boolean; acl?: string | string[] }[] = [];
  const state: { mode: MockMode; corruptPut: boolean; closedStalls: number } = { mode: "normal", corruptPut: false, closedStalls: 0 };
  const server = createServer((req, res) => {
    void (async () => {
      const chunks: Buffer[] = [];
      for await (const chunk of req) chunks.push(Buffer.from(chunk));
      const body = Buffer.concat(chunks);
      const key = new URL(req.url!, "http://localhost").pathname;
      const valid = signed(req, body);
      requests.push({ method: req.method!, path: key, signed: valid, acl: req.headers["x-amz-acl"] });
      const fail = (status: number, code: string) => {
        res.writeHead(status, { "content-type": "application/xml" });
        res.end(`<Error><Code>${code}</Code><Message>secret https://private-store/credential</Message></Error>`);
      };
      if (!valid) return fail(403, "SignatureDoesNotMatch");
      if (req.method === "PUT") {
        objects.set(key, state.corruptPut ? Buffer.alloc(body.length) : body);
        res.writeHead(200, { etag: '"mock-etag"' });
        return res.end();
      }
      if (req.method === "DELETE") { objects.delete(key); res.writeHead(204); return res.end(); }
      if (state.mode === "denied") return fail(403, "AccessDenied");
      if (state.mode === "retry") return fail(503, "ServiceUnavailable");
      const value = objects.get(key);
      if (!value) return fail(404, "NoSuchKey");
      if (state.mode === "headersStall") { res.on("close", () => { state.closedStalls++; }); return; }
      if (state.mode === "oversize") { res.writeHead(200, { "content-length": MAX_BLOB_BYTES + 1 }); res.flushHeaders(); return; }
      if (state.mode === "chunkOverflow") { res.writeHead(200); res.write(Buffer.alloc(value.length + 1)); return res.end(); }
      res.writeHead(200, { "content-length": value.length, "content-type": "application/octet-stream" });
      if (state.mode === "stall") { res.flushHeaders(); res.on("close", () => { state.closedStalls++; }); return; }
      res.end(state.mode === "corrupt" ? Buffer.alloc(value.length) : value);
    })().catch(() => res.destroy());
  });
  servers.push(server);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Missing mock address");
  return { objects, requests, state, endpoint: `http://127.0.0.1:${address.port}` };
}

function s3(endpoint: string, operationTimeoutMs?: number): S3BlobStore {
  vi.stubEnv("AWS_ACCESS_KEY_ID", ACCESS_KEY);
  vi.stubEnv("AWS_SECRET_ACCESS_KEY", SECRET_KEY);
  vi.stubEnv("AWS_SESSION_TOKEN", undefined);
  vi.stubEnv("AWS_EC2_METADATA_DISABLED", "true");
  const store = new S3BlobStore({ bucket: "private-evidence", region: "us-east-1", endpoint, prefix: "artifacts/files", forcePathStyle: true, operationTimeoutMs });
  clients.push(store);
  return store;
}

describe("S3-compatible storage with real SDK signed HTTP", () => {
  it("roundtrips signed scoped objects, verifies via GET after PUT and keeps authorization isolated", async () => {
    const mock = await mockS3();
    vi.stubEnv("AWS_ENDPOINT_URL_S3", "http://127.0.0.1:1");
    const blobs = s3(mock.endpoint);
    const reference = await blobs.put(scope, bytes);
    const duplicate = await blobs.put(scope, bytes);
    expect(reference.sha256).toBe(hash(bytes));
    expect(reference.id).not.toBe(duplicate.id);
    expect(mock.requests.slice(0, 2).map((request) => request.method)).toEqual(["PUT", "GET"]);
    expect(mock.requests[0]!.path).toBe(`/private-evidence/artifacts/files/${scope.tenantId}/${scope.workspaceId}/${reference.id}`);
    expect(Buffer.from(await blobs.get(scope, reference))).toEqual(Buffer.from(bytes));
    for (const denied of [otherTenant, otherWorkspace]) {
      await expect(blobs.get(denied, reference)).rejects.toMatchObject({ code: "not_found" });
      await blobs.delete(denied, reference.id);
    }
    expect(Buffer.from(await blobs.get(scope, reference))).toEqual(Buffer.from(bytes));
    await blobs.delete(scope, reference.id);
    await expect(blobs.get(scope, reference)).rejects.toMatchObject({ code: "not_found" });
    expect(mock.requests.every((request) => request.signed && request.acl === undefined)).toBe(true);
  });

  it("cleans up an object when the independent verification GET detects corrupt persistence", async () => {
    const mock = await mockS3();
    mock.state.corruptPut = true;
    await expect(s3(mock.endpoint).put(scope, bytes)).rejects.toMatchObject({ code: "integrity" });
    expect(mock.objects.size).toBe(0);
    expect(mock.requests.map((request) => request.method)).toEqual(["PUT", "GET", "DELETE"]);
  });

  it.each(["corrupt", "oversize", "chunkOverflow"] as const)("rejects %s downloads with bounded bytes", async (mode) => {
    const mock = await mockS3();
    const blobs = s3(mock.endpoint);
    const reference = await blobs.put(scope, bytes);
    mock.state.mode = mode;
    await expect(blobs.get(scope, reference)).rejects.toMatchObject({ code: "integrity" });
  });

  it.each(["stall", "headersStall"] as const)("aborts %s network work on the total deadline", async (mode) => {
    const mock = await mockS3();
    const blobs = s3(mock.endpoint, 250);
    const reference = await blobs.put(scope, bytes);
    mock.state.mode = mode;
    const started = Date.now();
    await expect(blobs.get(scope, reference)).rejects.toMatchObject({ code: "timeout" });
    expect(Date.now() - started).toBeLessThan(1_500);
    await vi.waitFor(() => expect(mock.state.closedStalls).toBe(1));
  });

  it("sanitizes backend denials and bounds retry attempts", async () => {
    const mock = await mockS3();
    const blobs = s3(mock.endpoint);
    const reference = await blobs.put(scope, bytes);
    mock.state.mode = "denied";
    await expect(blobs.get(scope, reference)).rejects.toMatchObject({ code: "unavailable", message: "Evidence file storage is unavailable." });
    const before = mock.requests.length;
    mock.state.mode = "retry";
    await expect(blobs.get(scope, reference)).rejects.toMatchObject({ code: "unavailable" });
    expect(mock.requests.length - before).toBe(2);
  });

  it("rejects invalid input without sending requests", async () => {
    const mock = await mockS3();
    const blobs = s3(mock.endpoint);
    await expect(blobs.put({ ...scope, tenantId: "../escape" }, bytes)).rejects.toMatchObject({ code: "invalid_input" });
    await expect(blobs.put(scope, new Uint8Array(MAX_BLOB_BYTES + 1))).rejects.toMatchObject({ code: "invalid_input" });
    expect(mock.requests).toEqual([]);
  });
});

describe("operator backend configuration", () => {
  it("defaults memory tests to Memory and honors an explicit backend", () => {
    expect(createBlobStore({}, { memory: true })).toBeInstanceOf(MemoryBlobStore);
    expect(createBlobStore({})).toBeInstanceOf(LocalBlobStore);
    expect(createBlobStore({ VISUA_BLOB_STORE: "local", VISUA_BLOB_DIR: join(base, "local") }, { memory: true })).toBeInstanceOf(LocalBlobStore);
    const configured = createBlobStore({ VISUA_BLOB_STORE: "s3", VISUA_BLOB_S3_BUCKET: "private-evidence", VISUA_BLOB_S3_REGION: "us-east-1", VISUA_BLOB_S3_ENDPOINT: "http://127.0.0.1:1", VISUA_BLOB_S3_FORCE_PATH_STYLE: "true", VISUA_BLOB_S3_PREFIX: "test/files" }, { memory: true });
    expect(configured).toBeInstanceOf(S3BlobStore);
    (configured as S3BlobStore).destroy();
  });

  it.each([
    { VISUA_BLOB_STORE: "unknown" },
    { VISUA_BLOB_STORE: "s3" },
    { VISUA_BLOB_STORE: "s3", VISUA_BLOB_S3_BUCKET: "private-evidence" },
    { VISUA_BLOB_STORE: "s3", VISUA_BLOB_S3_BUCKET: "../bucket", VISUA_BLOB_S3_REGION: "us-east-1" },
    { VISUA_BLOB_STORE: "s3", VISUA_BLOB_S3_BUCKET: "private-evidence", VISUA_BLOB_S3_REGION: "us-east-1", VISUA_BLOB_S3_PREFIX: "../escape" },
    { VISUA_BLOB_STORE: "s3", VISUA_BLOB_S3_BUCKET: "private-evidence", VISUA_BLOB_S3_REGION: "us-east-1", VISUA_BLOB_S3_ENDPOINT: "http://user:secret@localhost" },
    { VISUA_BLOB_STORE: "s3", VISUA_BLOB_S3_BUCKET: "private-evidence", VISUA_BLOB_S3_REGION: "us-east-1", VISUA_BLOB_S3_ENDPOINT: "https://host/path" },
    { VISUA_BLOB_STORE: "s3", VISUA_BLOB_S3_BUCKET: "private-evidence", VISUA_BLOB_S3_REGION: "us-east-1", VISUA_BLOB_S3_FORCE_PATH_STYLE: "yes" },
  ])("rejects malformed operator configuration with sanitized errors", (env) => {
    expect(() => createBlobStore(env)).toThrow("Evidence file storage configuration is invalid.");
  });
});
