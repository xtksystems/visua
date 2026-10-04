import { spawn } from "node:child_process";
import { once } from "node:events";
import { createConnection, type AddressInfo } from "node:net";
import { afterEach, describe, expect, it, vi } from "vitest";
import { FrameworkRegistry, REPO_ROOT } from "@visua/frameworks";
import { createApp } from "../src/app.ts";
import { loadAuthConfig } from "../src/auth/config.ts";
import { VisuaService } from "../src/services/visua.ts";
import { Store } from "../src/storage/store.ts";
import { initializeWorkspace, loadStartupConfig } from "../src/startup.ts";
import { startServer } from "../src/server.ts";
import { readinessProbe } from "../src/readiness.ts";
import { TestClient } from "./client.ts";
import { testDatabase } from "./db.ts";
import { startMockIdp } from "./mock-idp.ts";

const registry = FrameworkRegistry.load();
process.env["VISUA_AGENT_MODE"] = "offline";
const cleanup: (() => Promise<unknown>)[] = [];
const profile = { industry: "saas", size: "11-50", dataTypes: [], drivers: [], environments: ["cloud"], maturityTier: 1, guidance: "guided", securityTeamSize: 1 };
async function httpStatus(url: string): Promise<number> {
  const res = await fetch(url);
  await res.arrayBuffer();
  return res.status;
}
afterEach(async () => {
  for (const close of cleanup.splice(0).reverse()) await close();
  vi.restoreAllMocks();
});

describe("startup defaults", () => {
  it("keeps passwordless developer sign-in on loopback and seeds its demo", () => {
    expect(loadStartupConfig({}, "dev")).toMatchObject({ hostname: "127.0.0.1", seed: true });
  });

  it("does not seed an OIDC installation by default", () => {
    expect(loadStartupConfig({ NODE_ENV: "production" }, "oidc").seed).toBe(false);
    expect(loadStartupConfig({}, "oidc").seed).toBe(false);
  });

  it("requires explicit overrides for demo seeding and container binding", () => {
    expect(loadStartupConfig({ VISUA_SEED: "0" }, "dev").seed).toBe(false);
    expect(loadStartupConfig({ NODE_ENV: "production", VISUA_SEED: "1" }, "oidc").seed).toBe(true);
    expect(loadStartupConfig({ VISUA_HOST: "0.0.0.0" }, "dev").hostname).toBe("0.0.0.0");
    expect(() => loadAuthConfig({ VISUA_AUTH_MODE: "odic" })).toThrow("VISUA_AUTH_MODE");
    expect(() => loadAuthConfig({ NODE_ENV: "production", VISUA_AUTH_MODE: "dev" })).toThrow("refused");
    expect(() => loadStartupConfig({ VISUA_PORT: "NaN" }, "dev")).toThrow("VISUA_PORT");
    expect(() => loadStartupConfig({ VISUA_SEED: "yes" }, "dev")).toThrow("VISUA_SEED");
    expect(() => loadStartupConfig({ VISUA_SHUTDOWN_MS: "0" }, "dev")).toThrow("VISUA_SHUTDOWN_MS");
  });
});

describe("empty production installation", () => {
  it("bootstraps a working OIDC owner without demo tenants or workspaces", async () => {
    const db = await testDatabase("bootstrap");
    cleanup.push(db.cleanup);
    const idp = await startMockIdp();
    cleanup.push(idp.close);
    const env = {
      NODE_ENV: "production",
      VISUA_PORT: "0",
      VISUA_HOST: "127.0.0.1",
      VISUA_PUBLIC_URL: "http://localhost:8787",
      VISUA_SECRET: "test-production-secret-at-least-32-characters",
      VISUA_OIDC_ISSUER: idp.issuer,
      VISUA_OIDC_CLIENT_ID: idp.clientId,
      VISUA_OIDC_CLIENT_SECRET: idp.clientSecret,
      VISUA_OIDC_ALLOW_HTTP: "1",
      VISUA_BOOTSTRAP_OWNER_EMAIL: "ciso@pilot.example",
      VISUA_BOOTSTRAP_ORG_NAME: "Pilot organization",
    };
    const runtime = await startServer({ env, database: db.url, registry });
    cleanup.push(runtime.stop);
    const { svc, auth } = runtime;
    const tenants = await svc.store.identity.tenants.list();
    expect(tenants.map((t) => t.name)).toEqual(["Pilot organization"]);
    expect(await svc.store.workspaces.list()).toEqual([]);
    // Repeated startup cannot add a second tenant or remove the first owner's role.
    await initializeWorkspace(svc, auth, loadStartupConfig(env, auth.config.mode).seed);
    expect(await svc.store.identity.tenants.count()).toBe(1);

    const client = new TestClient(createApp(svc, auth));
    expect((await client.devLogin("ciso@pilot.example")).status).toBe(403);
    idp.signInAs({ sub: "pilot-owner", email: "ciso@pilot.example", email_verified: true });
    const start = await client.get("/api/auth/oidc/start?connection=platform");
    expect(start.status).toBe(302);
    const done = await client.get(await idp.authorize(start.headers.get("location")!));
    expect(done.status).toBe(302);
    const me = await client.get<{ csrf: string; activeTenant: { id: string; role: string } }>("/api/auth/me");
    expect(me.json.activeTenant).toMatchObject({ id: tenants[0]!.id, role: "owner" });
    client.csrf = me.json.csrf;
    const created = await client.post<{ workspace: { id: string; tenantId: string } }>("/api/workspaces", {
      name: "Pilot workspace",
      frameworks: ["nist-csf-2.0"],
      profile,
    });
    expect(created.status, created.text).toBe(201);
    expect(created.json.workspace.tenantId).toBe(tenants[0]!.id);
    // Hosted policy comes from this runtime's env, independent of the test process's dev defaults.
    const connector = await client.post<{ id: string }>(`/api/workspaces/${created.json.workspace.id}/connectors`, { kind: "repo-scan", config: { path: REPO_ROOT } });
    expect(connector.status).toBe(201);
    const checks = await client.post<{ checkId: string; outcome: string; detail: string }[]>(`/api/workspaces/${created.json.workspace.id}/connectors/${connector.json.id}/run`);
    expect(checks.json).toEqual([expect.objectContaining({ checkId: "repo-exists", outcome: "error", detail: expect.stringContaining("no operator roots") })]);
  });

  it("drains a seeded execution before storage cleanup when startup fails", async () => {
    let release!: () => void;
    const held = new Promise<void>((done) => { release = done; });
    let finished = false;
    // Hold the real execution at its entry to reproduce a waitForRun timeout cheaply.
    const prototype = VisuaService.prototype as unknown as { executeRun: (runId: string, signal: AbortSignal) => Promise<void> };
    const original = prototype.executeRun;
    vi.spyOn(prototype, "executeRun").mockImplementation(async function(this: VisuaService, ...args) {
      await held;
      await this.store.driver.query("SELECT 1");
      await original.apply(this, args);
      finished = true;
    });
    const wait = vi.spyOn(VisuaService.prototype, "waitForRun").mockRejectedValue(new Error("injected startup timeout"));
    const close = vi.spyOn(Store.prototype, "close");
    const starting = startServer({ env: { VISUA_PORT: "0", VISUA_SEED: "1", VISUA_SHUTDOWN_MS: "5000" }, database: ":memory:", registry }).catch((err: unknown) => err);
    cleanup.push(async () => { release(); await starting; });
    await vi.waitFor(() => expect(wait).toHaveBeenCalled(), { timeout: 10_000 });
    expect(close).not.toHaveBeenCalled();
    release();
    expect(await starting).toMatchObject({ message: "injected startup timeout" });
    expect(finished).toBe(true);
    expect(close).toHaveBeenCalledTimes(1);
  });
});

describe("server lifecycle", () => {
  async function runtime(shutdownMs = "10000") {
    const db = await testDatabase("lifecycle");
    cleanup.push(db.cleanup);
    const started = await startServer({ env: { VISUA_PORT: "0", VISUA_SEED: "0", VISUA_SHUTDOWN_MS: shutdownMs }, database: db.url, registry });
    cleanup.push(started.stop);
    return started;
  }

  it("probes storage anonymously, handles database failure, and recovers", async () => {
    const started = await runtime();
    const address = started.server.address() as AddressInfo;
    expect(address.address).toBe("127.0.0.1");
    const url = `http://127.0.0.1:${address.port}`;
    expect(await httpStatus(`${url}/api/ready`)).toBe(200);
    const query = vi.spyOn(started.svc.store.driver, "query");
    query.mockRejectedValue(new Error("private connection detail"));
    const down = await fetch(`${url}/api/ready`, { headers: { authorization: "Bearer ignored-for-probes", cookie: "visua_session=stale" } });
    expect(down.status).toBe(503);
    expect(await down.json()).toEqual({ ok: false });
    expect(await httpStatus(`${url}/api/health`)).toBe(200);
    query.mockRestore();
    expect(await httpStatus(`${url}/api/ready`)).toBe(200);
  });

  it("drains an in-flight request before releasing storage and refuses new work", async () => {
    const started = await runtime();
    const { port } = started.server.address() as AddressInfo;
    let release!: () => void;
    let entered!: () => void;
    const queryEntered = new Promise<void>((done) => { entered = done; });
    const held = new Promise<void>((done) => { release = done; });
    const original = started.svc.store.driver.query.bind(started.svc.store.driver);
    vi.spyOn(started.svc.store.driver, "query").mockImplementation(async (sql, params) => {
      if (sql === "SELECT 1") { entered(); await held; }
      return original(sql, params);
    });
    const close = vi.spyOn(started.svc.store, "close");
    const request = fetch(`http://127.0.0.1:${port}/api/ready`);
    await queryEntered;
    const stopping = started.stop();
    expect(started.stop()).toBe(stopping);
    expect(close).not.toHaveBeenCalled();
    expect((await started.app.request("/api/ready")).status).toBe(503);
    expect((await started.app.request("/api/auth/dev/login", { method: "POST" })).status).toBe(503);
    release();
    const response = await request;
    expect(response.status).toBe(503);
    await response.arrayBuffer();
    await stopping;
    expect(close).toHaveBeenCalledTimes(1);
    expect(started.server.listening).toBe(false);
  });

  it("closes a live event stream on shutdown without waiting for its heartbeat", async () => {
    const started = await runtime();
    const client = new TestClient(started.app);
    await client.devLogin("owner@events.example");
    const created = await client.post<{ workspace: { id: string } }>("/api/workspaces", { name: "Event workspace", profile, frameworks: ["nist-csf-2.0"] });
    expect(created.status).toBe(201);
    const { port } = started.server.address() as AddressInfo;
    const cookie = [...client.jar].map(([name, value]) => `${name}=${value}`).join("; ");
    const response = await fetch(`http://127.0.0.1:${port}/api/workspaces/${created.json.workspace.id}/events`, { headers: { cookie } });
    expect(response.status).toBe(200);
    const reader = response.body!.getReader();
    expect(new TextDecoder().decode((await reader.read()).value)).toContain("event: ready");
    const stopping = started.stop();
    while (!(await reader.read()).done);
    await stopping;
    expect(started.server.listening).toBe(false);
  });

  it("waits for detached agent writes before closing the store", async () => {
    const started = await runtime();
    const client = new TestClient(started.app);
    await client.devLogin("owner@agents.example");
    const created = await client.post<{ workspace: { id: string } }>("/api/workspaces", { name: "Agent workspace", profile, frameworks: ["nist-csf-2.0"] });
    expect(created.status).toBe(201);
    let release!: () => void;
    let entered!: () => void;
    const writing = new Promise<void>((done) => { entered = done; });
    const held = new Promise<void>((done) => { release = done; });
    const original = started.svc.store.runs.update.bind(started.svc.store.runs);
    let first = true;
    vi.spyOn(started.svc.store.runs, "update").mockImplementation(async (...args) => {
      if (first) { first = false; entered(); await held; }
      return original(...args);
    });
    const close = vi.spyOn(started.svc.store, "close");
    await started.svc.startRun(created.json.workspace.id, { agent: "planner", goal: "Plan initial work" });
    await writing;
    const stopping = started.stop();
    expect(close).not.toHaveBeenCalled();
    release();
    await stopping;
    expect(close).toHaveBeenCalledTimes(1);
  });

  it("drains every active response on a pipelined connection", async () => {
    const started = await runtime();
    const { port } = started.server.address() as AddressInfo;
    let release!: () => void;
    const held = new Promise<void>((done) => { release = done; });
    const original = started.svc.store.driver.query.bind(started.svc.store.driver);
    vi.spyOn(started.svc.store.driver, "query").mockImplementation(async (sql, params) => {
      if (sql === "SELECT 1") await held;
      return original(sql, params);
    });
    let requests = 0;
    const arrived = new Promise<void>((done) => started.server.on("request", () => { if (++requests === 2) done(); }));
    const socket = createConnection({ host: "127.0.0.1", port });
    cleanup.push(async () => { socket.destroy(); });
    let received = "";
    socket.on("data", (data: Buffer) => { received += data.toString(); });
    await once(socket, "connect");
    const end = once(socket, "end");
    socket.write("GET /api/ready HTTP/1.1\r\nHost: localhost\r\n\r\n".repeat(2));
    await arrived;
    const stopping = started.stop();
    release();
    await end;
    await stopping;
    expect(received.match(/HTTP\/1.1 503/g)).toHaveLength(2);
    expect(received.match(/\{"ok":false\}/g)).toHaveLength(2);
  });

  it("bounds shutdown when a request cannot finish within the grace period", async () => {
    const started = await runtime("30");
    // This case expects stop() to reject; cleanup must still release its held query.
    cleanup.pop();
    const { port } = started.server.address() as AddressInfo;
    let release!: () => void;
    let entered!: () => void;
    const enteredQuery = new Promise<void>((done) => { entered = done; });
    const held = new Promise<void>((done) => { release = done; });
    const original = started.svc.store.driver.query.bind(started.svc.store.driver);
    vi.spyOn(started.svc.store.driver, "query").mockImplementation(async (sql, params) => {
      if (sql === "SELECT 1") { entered(); await held; }
      return original(sql, params);
    });
    const request = fetch(`http://127.0.0.1:${port}/api/ready`).catch(() => undefined);
    await enteredQuery;
    const close = vi.spyOn(started.svc.store, "close");
    const stopping = started.stop();
    cleanup.push(async () => { release(); await stopping.catch(() => undefined); await vi.waitFor(() => expect(close).toHaveBeenCalledTimes(1)); });
    await expect(stopping).rejects.toThrow("Shutdown exceeded 30 ms");
    await request;
    expect(started.server.listening).toBe(false);
    expect(close).not.toHaveBeenCalled();
  });

  it("bounds a stalled readiness query and shares it across repeated probes", async () => {
    const started = await runtime();
    let release!: (rows: []) => void;
    const query = vi.spyOn(started.svc.store.driver, "query").mockReturnValue(new Promise((done) => { release = done; }));
    const ready = readinessProbe(started.svc.store, 10);
    expect(await Promise.all([ready(), ready()])).toEqual([false, false]);
    expect(await ready()).toBe(false);
    expect(query).toHaveBeenCalledTimes(1);
    release([]);
    query.mockRestore();
    // Let the completed query clear its in-flight slot before the next check.
    await new Promise((done) => setImmediate(done));
    expect(await ready()).toBe(true);
  });

  it.each(["SIGINT", "SIGTERM"] as const)("exits cleanly on %s through the real entry point", async (signal) => {
    const child = spawn(process.execPath, ["--disable-warning=ExperimentalWarning", "apps/server/src/index.ts"], {
      cwd: REPO_ROOT,
      env: { ...process.env, NODE_ENV: "development", VISUA_AUTH_MODE: "dev", VISUA_PORT: "0", VISUA_HOST: "127.0.0.1", VISUA_SEED: "0", VISUA_DATABASE_URL: ":memory:", VISUA_AGENT_MODE: "offline", VISUA_BOOTSTRAP_OWNER_EMAIL: "", VISUA_SHUTDOWN_MS: "1000" },
      stdio: ["ignore", "pipe", "pipe"],
    });
    cleanup.push(async () => { if (child.exitCode === null && child.signalCode === null) { child.kill("SIGKILL"); await once(child, "exit"); } });
    let output = "";
    child.stdout.on("data", (chunk: Buffer) => { output += chunk.toString(); });
    child.stderr.on("data", (chunk: Buffer) => { output += chunk.toString(); });
    await vi.waitFor(() => expect(output).toContain("SSO domain re-checks:"), { timeout: 10_000 });
    const exited = once(child, "exit");
    child.kill(signal);
    expect(await exited, output).toEqual([0, null]);
    expect(output).toContain("draining requests");
  });
});
