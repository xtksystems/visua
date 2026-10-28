import { Hono } from "hono";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Diagnostics } from "../src/diagnostics.ts";
import { directPeer, JsonBodyReader, loadRequestControlConfig, RateBuckets, readJsonBody, RequestControlError, RequestControls } from "../src/request-controls.ts";

const defaults = loadRequestControlConfig({});
const bodyRequest = (body: NonNullable<RequestInit["body"]>, headers: Record<string, string> = {}, signal?: AbortSignal) => new Request("http://local/api/test", { method: "POST", body, headers, signal, duplex: "half" } as RequestInit);
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

describe("bounded JSON bodies", () => {
  it("preserves the existing 500k policy and 2m evidence text contracts, including JSON escapes", async () => {
    const reader = new JsonBodyReader();
    const body = { policy: "x".repeat(500_000), evidence: "\u0000".repeat(2_000_000) };
    expect(await reader.read(bodyRequest(JSON.stringify(body)))).toEqual(body);
  });

  it("checks real multibyte bytes even when length is missing or understates the body", async () => {
    const reader = new JsonBodyReader({ ...defaults, jsonBytes: 20 });
    const value = JSON.stringify({ text: "界".repeat(8) });
    for (const headers of [{}, { "content-length": "10" }] as Record<string, string>[]) await expect(reader.read(bodyRequest(value, headers))).rejects.toMatchObject({ status: 413 });
    await expect(reader.read(bodyRequest("{}", { "content-length": "3" }))).rejects.toMatchObject({ status: 400 });
    await expect(reader.read(bodyRequest("{}", { "content-length": "invalid" }))).rejects.toMatchObject({ status: 400 });
  });

  it("rejects oversized declared bodies before reading and refuses malformed JSON", async () => {
    const pull = vi.fn();
    const cancel = vi.fn();
    const stream = new ReadableStream({ pull, cancel }, { highWaterMark: 0 });
    const reader = new JsonBodyReader({ ...defaults, jsonBytes: 20 });
    await expect(reader.read(bodyRequest(stream, { "content-length": "21" }))).rejects.toMatchObject({ status: 413 });
    expect(pull).not.toHaveBeenCalled();
    expect(cancel).toHaveBeenCalledTimes(1);
    await expect(reader.read(bodyRequest("{bad json"))).rejects.toMatchObject({ status: 400 });
    await expect(reader.read(bodyRequest(new Uint8Array([0xff, 0xff])))).rejects.toMatchObject({ status: 400 });
  });

  it.each(["abort", "timeout"])("bounds %s even when source cancellation never resolves", async (reason) => {
    vi.useFakeTimers();
    const controller = new AbortController();
    const diagnostics = new Diagnostics();
    const cancel = vi.fn(() => new Promise<void>(() => {}));
    const request = bodyRequest(new ReadableStream({ cancel }), {}, controller.signal);
    const remove = vi.spyOn(request.signal, "removeEventListener");
    const reader = new JsonBodyReader({ ...defaults, bodyTimeoutMs: 50 }, diagnostics);
    const result = expect(reader.read(request)).rejects.toMatchObject({ status: 408 });
    if (reason === "abort") controller.abort();
    else await vi.advanceTimersByTimeAsync(50);
    await result;
    expect(cancel).toHaveBeenCalledTimes(1);
    expect(remove).toHaveBeenCalledWith("abort", expect.any(Function));
    expect(diagnostics.snapshot().gauges["request.body_active"]).toBe(0);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("limits concurrent readers and releases capacity after abort", async () => {
    const controller = new AbortController();
    const reader = new JsonBodyReader({ ...defaults, jsonConcurrency: 1 });
    const first = expect(reader.read(bodyRequest(new ReadableStream(), {}, controller.signal))).rejects.toMatchObject({ status: 408 });
    await expect(reader.read(bodyRequest("{}"))).rejects.toMatchObject({ status: 429, retryAfter: 1 });
    controller.abort();
    await first;
    expect(await reader.read(bodyRequest("{}"))).toEqual({});
  });

  it("handles tiny streamed chunks within the same byte bound", async () => {
    const bytes = new TextEncoder().encode(JSON.stringify({ value: "x".repeat(10_000) }));
    let offset = 0;
    const stream = new ReadableStream<Uint8Array>({ pull(c) { if (offset === bytes.length) c.close(); else c.enqueue(bytes.subarray(offset, ++offset)); } });
    expect(await new JsonBodyReader({ ...defaults, jsonBytes: bytes.length }).read(bodyRequest(stream))).toEqual({ value: "x".repeat(10_000) });
  });

  it("enforces wall time when continuously ready empty chunks starve timer callbacks", async () => {
    const diagnostics = new Diagnostics();
    const cancel = vi.fn();
    const stream = new ReadableStream<Uint8Array>({ pull(c) { c.enqueue(new Uint8Array()); }, cancel });
    await expect(new JsonBodyReader({ ...defaults, bodyTimeoutMs: 20 }, diagnostics).read(bodyRequest(stream))).rejects.toMatchObject({ status: 408 });
    expect(cancel).toHaveBeenCalledTimes(1);
    expect(diagnostics.snapshot().counters["request.body_timeout"]).toBe(1);
    expect(diagnostics.snapshot().gauges["request.body_active"]).toBe(0);
  });
});

describe("per-instance rate admission", () => {
  it("never resolves credentials on static or SPA paths outside API admission", async () => {
    const { createService } = await import("../src/context.ts");
    const { createApp } = await import("../src/app.ts");
    const { AuthService } = await import("../src/auth/service.ts");
    const { loadAuthConfig } = await import("../src/auth/config.ts");
    const service = await createService({ database: ":memory:" });
    const auth = new AuthService(service, loadAuthConfig({}));
    const resolve = vi.spyOn(auth, "resolveApiToken").mockResolvedValue(undefined);
    const app = createApp(service, auth, { stopping: false }, { config: { ...defaults, peerPerMinute: 1 } });
    const headers = { authorization: "Bearer vsa_invalid-token" };
    try {
      for (const path of ["/assets/unknown.js", "/w/unknown", "/", "/api/health", "/api/ready"]) await app.request(path, { headers });
      expect(resolve).not.toHaveBeenCalled();
      expect((await app.request("/api/meta", { headers })).status).toBe(401);
      expect((await app.request("/api/meta", { headers })).status).toBe(429);
      expect(resolve).toHaveBeenCalledTimes(1);
    } finally { await service.store.close(); }
  });

  it("bounds cardinality without evicting active limits, refills, and removes expired buckets", () => {
    let now = 0;
    const buckets = new RateBuckets(2, () => now);
    expect(buckets.take("a", 2)).toBe(0);
    expect(buckets.take("a", 2)).toBe(0);
    expect(buckets.take("a", 2)).toBe(30);
    expect(buckets.take("b", 2)).toBe(0);
    expect(buckets.take("new-identity", 2)).toBe(60);
    expect(buckets.size).toBe(2);
    now = 30_000;
    expect(buckets.take("a", 2)).toBe(0);
    now = 90_001;
    buckets.cleanup();
    expect(buckets.size).toBe(0);
    expect(buckets.take("new-identity", 2)).toBe(0);
  });

  it("uses direct socket peers or one fallback, never spoofed forwarded headers", async () => {
    const controls = new RequestControls({ ...defaults, authPerMinute: 2 });
    const app = new Hono<{ Variables: { principal: { kind: string; id: string } } }>();
    app.use("*", controls.beforeAuth());
    app.use("*", controls.afterAuth());
    app.post("/api/auth/login", (c) => c.json({ ok: true }));
    try {
      for (let i = 0; i < 2; i++) expect((await app.request("/api/auth/login", { method: "POST", headers: { "x-forwarded-for": `198.51.100.${i}`, "cf-connecting-ip": `198.51.100.${i}` } })).status).toBe(200);
      const denied = await app.request("/api/auth/login", { method: "POST", headers: { forwarded: "for=203.0.113.99" } });
      expect(denied.status).toBe(429);
      expect(Number(denied.headers.get("Retry-After"))).toBeGreaterThan(0);
      expect((await app.request("/api/auth/login", { method: "POST" }, { incoming: { socket: { remoteAddress: "127.0.0.2" } } })).status).toBe(200);
      expect(directPeer({ incoming: { socket: { remoteAddress: "127.0.0.1" } } })).toBe("127.0.0.1");
    } finally { controls.close(); }
  });

  it("uses the authenticated principal across peer changes and returns safe aggregate status counts", async () => {
    const diagnostics = new Diagnostics();
    const controls = new RequestControls({ ...defaults, principalPerMinute: 1 }, diagnostics);
    const app = new Hono<{ Variables: { principal: { kind: string; id: string } } }>();
    let principal = "principal-a";
    app.use("*", controls.beforeAuth());
    app.use("*", async (c, next) => { c.set("principal", { kind: "user", id: principal }); await next(); });
    app.use("*", controls.afterAuth());
    app.get("/api/workspaces/private-id", (c) => c.json({ ok: true }));
    try {
      expect((await app.request("/api/workspaces/private-id", undefined, { incoming: { socket: { remoteAddress: "127.0.0.1" } } })).status).toBe(200);
      expect((await app.request("/api/workspaces/private-id", undefined, { incoming: { socket: { remoteAddress: "127.0.0.2" } } })).status).toBe(429);
      principal = "principal-b";
      expect((await app.request("/api/workspaces/private-id")).status).toBe(200);
      expect(diagnostics.snapshot().requests).toMatchObject({ "workspace.2xx": 2, "workspace.4xx": 1 });
      expect(JSON.stringify(diagnostics.snapshot())).not.toMatch(/principal-a|principal-b|private-id|127\.0/);
    } finally { controls.close(); }
    expect(diagnostics.snapshot().gauges["request.rate_buckets"]).toBe(0);
  });

  it("keeps health and readiness available after a shared peer exhausts API admission", async () => {
    const diagnostics = new Diagnostics();
    const controls = new RequestControls({ ...defaults, peerPerMinute: 1, authPerMinute: 1 }, diagnostics);
    const app = new Hono();
    app.use("*", controls.beforeAuth());
    app.use("*", controls.afterAuth());
    app.get("/api/auth/config", (c) => c.json({ ok: true }));
    app.get("/api/health", (c) => c.json({ ok: true }));
    app.get("/api/ready", (c) => c.json({ ok: true }));
    try {
      expect((await app.request("/api/auth/config")).status).toBe(200);
      expect((await app.request("/api/auth/config")).status).toBe(429);
      expect((await app.request("/api/health")).status).toBe(200);
      expect((await app.request("/api/ready")).status).toBe(200);
      expect(diagnostics.snapshot().requests).toMatchObject({ "auth.2xx": 1, "auth.4xx": 1, "health.2xx": 2 });
    } finally { controls.close(); }
  });

  it("integrates parser policy, errors, cleanup and Retry-After through middleware", async () => {
    vi.useFakeTimers();
    const signal = new AbortController();
    const controls = new RequestControls({ ...defaults, jsonBytes: 10 }, new Diagnostics(), signal.signal);
    const app = new Hono<{ Variables: { principal: { kind: string; id: string } } }>();
    app.onError((error, c) => error instanceof RequestControlError ? c.json({ error: error.message }, error.status) : c.json({ error: "internal" }, 500));
    app.use("*", controls.beforeAuth());
    app.post("/api/auth/login", async (c) => c.json(await readJsonBody(c.req.raw)));
    expect((await app.request("/api/auth/login", { method: "POST", body: "{}" })).status).toBe(200);
    expect((await app.request("/api/auth/login", { method: "POST", body: JSON.stringify({ text: "too-long" }) })).status).toBe(413);
    signal.abort();
    expect((await app.request("/api/auth/login", { method: "POST", body: "{}" })).status).toBe(503);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("validates operator settings without echoing unsafe values", () => {
    expect(defaults).toMatchObject({ jsonBytes: 16 * 1024 * 1024, jsonConcurrency: 4 });
    expect(() => loadRequestControlConfig({ VISUA_RATE_MAX_BUCKETS: "secret-invalid-value" })).toThrow("VISUA_RATE_MAX_BUCKETS must be");
    expect(() => loadRequestControlConfig({ VISUA_JSON_MAX_BYTES: "0" })).toThrow();
    expect(() => loadRequestControlConfig({ VISUA_DIAGNOSTICS_INTERVAL_MS: "1" })).toThrow();
    expect(loadRequestControlConfig({ VISUA_DIAGNOSTICS_INTERVAL_MS: "0" }).diagnosticsIntervalMs).toBe(0);
  });

  it("applies the same JSON cap to real authentication and workspace routes", async () => {
    const { createService } = await import("../src/context.ts");
    const { createApp } = await import("../src/app.ts");
    const { AuthService } = await import("../src/auth/service.ts");
    const { loadAuthConfig } = await import("../src/auth/config.ts");
    const { TestClient } = await import("./client.ts");
    const service = await createService({ database: ":memory:" });
    const auth = new AuthService(service, loadAuthConfig({}));
    const app = createApp(service, auth, { stopping: false }, { config: { ...defaults, jsonBytes: 1024 } });
    const client = new TestClient(app);
    try {
      expect((await client.devLogin("limits@example.test")).status).toBe(200);
      expect((await client.post("/api/auth/dev/login", { email: "limits@example.test", name: "x".repeat(2000) })).status).toBe(413);
      expect((await client.post("/api/workspaces", { name: "x".repeat(2000) })).status).toBe(413);
      const invalid = await client.request("POST", "/api/workspaces", undefined, { "content-type": "application/json" });
      expect(invalid.status).toBe(400);
      expect((await client.get("/api/auth/me")).status).toBe(200);
    } finally { await service.store.close(); }
  });
});
