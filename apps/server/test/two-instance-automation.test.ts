import type { AddressInfo } from "node:net";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { AgentHost, AgentResult } from "@visua/agents";
import type { ActivityEvent, AgentRun, Proposal, Workspace } from "@visua/core";
import { FrameworkRegistry } from "@visua/frameworks";
import { MemoryBlobStore } from "../src/blobs/index.ts";
import { startServer } from "../src/server.ts";
import { TEST_PG_URL, testDatabase, type TestDatabase } from "./db.ts";
import { startMockIdp } from "./mock-idp.ts";

const execute = vi.hoisted(() => vi.fn<(host: AgentHost) => Promise<AgentResult>>());
vi.mock("@visua/agents", async (original) => ({ ...await original<typeof import("@visua/agents")>(), executeAgent: execute }));

type Server = Awaited<ReturnType<typeof startServer>>;
type Me = { csrf: string; user: { id: string; email: string }; activeTenant: { id: string } };
type RunDetail = AgentRun & { proposals: Proposal[] };
const servers: Server[] = [], databases: TestDatabase[] = [];
const streams: HttpEvents[] = [], releases: (() => void)[] = [];
const providers: Awaited<ReturnType<typeof startMockIdp>>[] = [];
let sequence = 0;

async function bounded<T>(work: Promise<T>, milliseconds: number, expire = () => {}): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([work, new Promise<never>((_, reject) => {
      timer = setTimeout(() => { expire(); reject(new Error("HTTP gate operation timed out")); }, milliseconds);
    })]);
  } finally { clearTimeout(timer); }
}

/** Uses the real listener, retaining only the browser's cookies and CSRF value. */
class HttpClient {
  readonly origin: string;
  readonly jar = new Map<string, string>();
  csrf = "";
  constructor(origin: string, session?: HttpClient) {
    this.origin = origin;
    if (session) {
      for (const [name, value] of session.jar) this.jar.set(name, value);
      this.csrf = session.csrf;
    }
  }
  cookie(): string { return [...this.jar].map(([name, value]) => `${name}=${value}`).join("; "); }
  async request<T = unknown>(method: string, path: string, body?: unknown) {
    const headers = new Headers({ cookie: this.cookie() });
    if (body !== undefined) headers.set("content-type", "application/json");
    if (this.csrf && !["GET", "HEAD"].includes(method)) headers.set("x-visua-csrf", this.csrf);
    const response = await fetch(new URL(path, this.origin), {
      method, headers, body: body === undefined ? undefined : JSON.stringify(body),
      redirect: "manual", signal: AbortSignal.timeout(10_000),
    });
    for (const set of response.headers.getSetCookie()) {
      const pair = set.split(";")[0]!, at = pair.indexOf("=");
      const name = pair.slice(0, at), value = pair.slice(at + 1);
      if (!value || /max-age=0/i.test(set)) this.jar.delete(name);
      else this.jar.set(name, value);
    }
    const text = await response.text();
    return { status: response.status, headers: response.headers, json: (text ? JSON.parse(text) : undefined) as T };
  }
  get = <T = unknown>(path: string) => this.request<T>("GET", path);
  post = <T = unknown>(path: string, body: unknown = {}) => this.request<T>("POST", path, body);
  patch = <T = unknown>(path: string, body: unknown) => this.request<T>("PATCH", path, body);
  del = (path: string) => this.request("DELETE", path);
  async login(email: string): Promise<Me> {
    const response = await this.post<Me>("/api/auth/dev/login", { email });
    expect(response.status).toBe(200);
    this.csrf = response.json.csrf;
    return response.json;
  }
}

interface Frame { event: string; data: string }
class HttpEvents {
  private readonly reader: ReadableStreamDefaultReader<Uint8Array>;
  private readonly signal: AbortController;
  private readonly decoder = new TextDecoder();
  private buffer = "";
  constructor(reader: ReadableStreamDefaultReader<Uint8Array>, signal: AbortController) { this.reader = reader; this.signal = signal; }
  async next(timeoutMs = 8_000): Promise<Frame | undefined> {
    const until = Date.now() + timeoutMs;
    for (;;) {
      const at = this.buffer.indexOf("\n\n");
      if (at >= 0) {
        const lines = this.buffer.slice(0, at).split("\n");
        this.buffer = this.buffer.slice(at + 2);
        return {
          event: lines.find(line => line.startsWith("event: "))?.slice(7) ?? "message",
          data: lines.filter(line => line.startsWith("data: ")).map(line => line.slice(6)).join("\n"),
        };
      }
      const { value, done } = await bounded(this.reader.read(), Math.max(1, until - Date.now()), () => this.signal.abort());
      if (done) return undefined;
      this.buffer += this.decoder.decode(value, { stream: true }).replace(/\r\n/g, "\n");
    }
  }
  async until(predicate: (frame: Frame) => boolean): Promise<Frame> {
    const deadline = Date.now() + 10_000;
    for (let count = 0; count < 100; count++) {
      const frame = await this.next(Math.max(1, deadline - Date.now()));
      if (!frame) throw new Error("HTTP event stream closed before the expected event");
      if (predicate(frame)) return frame;
    }
    throw new Error("HTTP event stream exceeded the gate's event bound");
  }
  async close(): Promise<void> { this.signal.abort(); await this.reader.cancel().catch(() => undefined); }
}

async function events(client: HttpClient, workspaceId: string): Promise<HttpEvents> {
  const signal = new AbortController();
  try {
    const response = await bounded(fetch(`${client.origin}/api/workspaces/${workspaceId}/events`, {
      headers: { cookie: client.cookie() }, signal: signal.signal,
    }), 10_000, () => signal.abort());
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("text/event-stream");
    const stream = new HttpEvents(response.body!.getReader(), signal); streams.push(stream);
    const ready = await stream.until(frame => frame.event === "ready");
    expect(JSON.parse(ready.data)).toEqual({ workspaceId });
    return stream;
  } catch (error) { signal.abort(); throw error; }
}

const latch = () => {
  let release!: () => void;
  const promise = new Promise<void>(resolve => { release = resolve; });
  releases.push(release);
  return { promise, release };
};

async function fixture() {
  const db = await testDatabase(`http_automation_${++sequence}`); databases.push(db);
  expect(db.dialect).toBe("postgres");
  const registry = FrameworkRegistry.load();
  const start = async () => {
    const server = await startServer({
      database: db.url, registry, blobs: new MemoryBlobStore(), connectorRoots: [],
      env: { VISUA_AUTH_MODE: "dev", VISUA_PORT: "0", VISUA_SEED: "0", VISUA_SCORE_HISTORY: "off", VISUA_SHUTDOWN_MS: "5000", VISUA_SSO_DOMAIN_RECHECK_HOURS: "0", VISUA_SSO_DOMAIN_VERIFICATION: "off", VISUA_OIDC_ALLOW_HTTP: "1", VISUA_OIDC_PRIVATE_ISSUERS: "127.0.0.1" },
      // The mocked runtime is offline. Long heartbeats keep B from racing A's HTTP-triggered claim.
      runOptions: { heartbeatMs: 60_000, leaseMs: 120_000 },
    });
    servers.push(server);
    const origin = `http://127.0.0.1:${(server.server.address() as AddressInfo).port}`;
    // Bind this server's callback URL after the OS chooses its free port; no global env mutation.
    server.auth.config.publicUrl = origin;
    return { server, origin };
  };
  const first = await start(), second = await start();
  const a = first.server, b = second.server;
  expect(a.svc.store).not.toBe(b.svc.store);
  expect(a.svc.bus.instanceId).not.toBe(b.svc.bus.instanceId);
  const ownerA = new HttpClient(first.origin);
  const owner = await ownerA.login(`owner-${sequence}@http-gate.example`);
  const ownerB = new HttpClient(second.origin, ownerA);
  expect((await ownerB.get<Me>("/api/auth/me")).json.user.id).toBe(owner.user.id);
  const created = await ownerA.post<{ workspace: Workspace }>("/api/workspaces", {
    name: "HTTP automation gate", frameworks: ["nist-csf-2.0"],
    profile: { industry: "saas", size: "11-50", dataTypes: [], drivers: [], environments: ["cloud"], maturityTier: 1, guidance: "guided", securityTeamSize: 1 },
  });
  expect(created.status).toBe(201);
  return { a, b, ownerA, ownerB, owner, ws: created.json.workspace, tenantId: owner.activeTenant.id };
}

afterEach(async () => {
  for (const release of releases.splice(0)) release();
  const errors: unknown[] = [];
  const finish = async (work: () => Promise<unknown>) => { try { await work(); } catch (error) { errors.push(error); } };
  for (const stream of streams.splice(0)) await finish(() => stream.close());
  vi.restoreAllMocks();
  for (const server of servers.splice(0).reverse()) await finish(() => server.stop());
  for (const provider of providers.splice(0)) await finish(() => provider.close());
  for (const database of databases.splice(0)) await finish(() => database.cleanup());
  execute.mockReset();
  if (errors.length) throw new AggregateError(errors, "Two-instance HTTP gate cleanup failed");
}, 45_000);

describe.skipIf(!TEST_PG_URL)("two-server automation HTTP gate (requires VISUA_TEST_DATABASE_URL)", () => {
  it("starts on A, cancels through B, and fences attempted late steps and proposals", async () => {
    const { a, b, ownerA, ownerB, owner, ws } = await fixture();
    const entered = latch(), release = latch();
    const appendA = vi.spyOn(a.svc, "appendRunStep"), appendB = vi.spyOn(b.svc, "appendRunStep");
    let lateStepAttempted = false, lateProposalError = "";
    const proposal = { type: "set-level" as const, title: "Before cancellation", rationale: "Synthetic observation", payload: { nodeId: "nist-csf-2.0:PR.AA-01", current: 2 }, citations: [], confidence: "medium" as const, nodeIds: ["nist-csf-2.0:PR.AA-01"] };
    execute.mockImplementationOnce(async host => {
      host.step({ type: "message", title: "Before cancellation" });
      await host.propose(proposal);
      entered.release();
      await release.promise; // Deliberately ignores AbortSignal, as a late external operation can.
      lateStepAttempted = true;
      host.step({ type: "message", title: "Must not persist after cancellation" });
      try { await host.propose({ ...proposal, title: "Must not persist after cancellation" }); }
      catch (error) { lateProposalError = (error as Error).message; }
      return { summary: "Late offline result", mode: "offline" };
    });
    const started = await ownerA.post<AgentRun>(`/api/workspaces/${ws.id}/runs`, { agent: "copilot", goal: "Observe cancellation" });
    expect(started.status).toBe(202);
    await bounded(entered.promise, 10_000);
    await vi.waitFor(async () => {
      const current = await ownerA.get<RunDetail>(`/api/workspaces/${ws.id}/runs/${started.json.id}`);
      expect(current.status).toBe(200);
      expect(current.json.startedBy).toBe(owner.user.id);
      expect(current.json.steps.length).toBeGreaterThanOrEqual(2);
      expect(current.json.proposals).toHaveLength(1);
    }, { timeout: 10_000, interval: 20 });
    expect(appendA).toHaveBeenCalled();
    expect(appendB).not.toHaveBeenCalled();
    const before = (await ownerA.get<RunDetail>(`/api/workspaces/${ws.id}/runs/${started.json.id}`)).json;
    expect(before.status).toBe("running");
    const cancelled = await ownerB.post<AgentRun>(`/api/workspaces/${ws.id}/runs/${started.json.id}/cancel`);
    expect(cancelled.status).toBe(200);
    expect(cancelled.json.status).toBe("cancelled");
    expect(cancelled.json.executionEpoch).toBe(before.executionEpoch! + 1);
    release.release();
    await bounded(a.svc.drainRuns(), 10_000);
    const after = await ownerB.get<RunDetail>(`/api/workspaces/${ws.id}/runs/${started.json.id}`);
    expect(after.status).toBe(200);
    expect(lateStepAttempted).toBe(true);
    expect(lateProposalError).toContain("no longer owned");
    expect(after.json).toMatchObject({ status: "cancelled", finishedAt: cancelled.json.finishedAt, executionEpoch: cancelled.json.executionEpoch });
    expect(after.json.steps).toEqual(cancelled.json.steps);
    expect(after.json.proposals).toEqual(before.proposals);
    expect(after.json.proposals).toHaveLength(1);
    expect(execute).toHaveBeenCalledTimes(1);
  }, 45_000);

  it("removes a member through B and closes their HTTP stream on A before later payloads", async () => {
    const { ownerA, ownerB, ws, tenantId } = await fixture();
    const email = `member-${sequence}@http-gate.example`;
    expect((await ownerB.post(`/api/tenants/${tenantId}/members`, { email, role: "viewer" })).status).toBe(201);
    const member = new HttpClient(ownerA.origin), me = await member.login(email);
    expect((await member.get(`/api/workspaces/${ws.id}`)).status).toBe(200);
    const stream = await events(member, ws.id);
    expect((await ownerB.patch(`/api/workspaces/${ws.id}`, { name: "Before removal" })).status).toBe(200);
    await stream.until(frame => frame.event === "visua" && JSON.parse(frame.data).type === "workspace.updated" && JSON.parse(frame.data).data.name === "Before removal");
    const head = (await ownerB.get<ActivityEvent[]>(`/api/workspaces/${ws.id}/activity?limit=1`)).json[0]!;
    await stream.until(frame => frame.event === "visua" && JSON.parse(frame.data).type === "activity" && JSON.parse(frame.data).data.id === head.id);
    expect((await ownerB.del(`/api/tenants/${tenantId}/members/${me.user.id}`)).status).toBe(204);
    expect((await ownerB.patch(`/api/workspaces/${ws.id}`, { name: "Private after removal" })).status).toBe(200);
    expect((await member.get(`/api/workspaces/${ws.id}`)).status).toBe(404);
    for (let i = 0; ; i++) {
      expect(i).toBeLessThan(20);
      const frame = await stream.next();
      if (!frame) break;
      expect(frame.event).not.toBe("visua");
      expect(frame.data).not.toContain("Private after removal");
    }
  }, 45_000);

  it("resyncs remote HTTP subscribers after one failed NOTIFY with both listeners still connected", async () => {
    const { a, b, ownerA, ownerB, ws } = await fixture();
    const stream = await events(ownerA, ws.id);
    const listeners = async () => (await a.svc.store.driver.query<{ pid: number }>(
      "SELECT pid FROM pg_stat_activity WHERE datname = current_database() AND application_name IN (?, ?) ORDER BY pid",
      [`visua-events:${a.svc.bus.instanceId}`, `visua-events:${b.svc.bus.instanceId}`],
    )).map(row => row.pid);
    const before = await listeners(); expect(before).toHaveLength(2);
    let failed = 0;
    const original = b.svc.store.driver.execute.bind(b.svc.store.driver);
    vi.spyOn(b.svc.store.driver, "execute").mockImplementation(async (sql, params) => {
      if (sql === "SELECT pg_notify(?, ?)" && !failed) {
        const payload = JSON.parse(String(params?.[1]));
        if (payload.event?.type === "workspace.updated" && payload.event?.data?.name === "Committed despite notification loss") {
          failed++;
          throw new Error("Synthetic publisher notification failure");
        }
      }
      return original(sql, params);
    });
    expect((await ownerB.patch(`/api/workspaces/${ws.id}`, { name: "Committed despite notification loss" })).status).toBe(200);
    const gap = await stream.until(frame => frame.event === "resync");
    expect(JSON.parse(gap.data)).toEqual({ workspaceId: ws.id });
    expect(failed).toBe(1);
    expect(await listeners()).toEqual(before);
    const canonical = await ownerA.get<{ workspace: Workspace }>(`/api/workspaces/${ws.id}`);
    expect(canonical.status).toBe(200);
    expect(canonical.json.workspace.name).toBe("Committed despite notification loss");
    expect((await ownerB.patch(`/api/workspaces/${ws.id}`, { name: "After recovery" })).status).toBe(200);
    await stream.until(frame => frame.event === "visua" && JSON.parse(frame.data).type === "workspace.updated" && JSON.parse(frame.data).data.name === "After recovery");
  }, 45_000);

  it("replaces B's warm provider through A's HTTP settings and rejects B's old login flow", async () => {
    const { ownerA, ownerB, tenantId } = await fixture();
    const old = await startMockIdp(); providers.push(old);
    const next = await startMockIdp("replacement-client", "replacement-secret"); providers.push(next);
    const email = `new-${sequence}@http-sso.example`;
    const connection = await ownerA.post<{ id: string }>(`/api/tenants/${tenantId}/sso`, {
      name: "HTTP SSO", issuer: old.issuer, clientId: old.clientId, clientSecret: old.clientSecret,
      domains: ["http-sso.example"], jitProvisioning: true, defaultRole: "viewer",
    });
    expect(connection.status).toBe(201);
    const browser = new HttpClient(ownerB.origin);
    old.signInAs({ sub: "old-http-subject", email, email_verified: true });
    const initial = await browser.get(`/api/auth/oidc/start?connection=${connection.json.id}`);
    expect(initial.status).toBe(302);
    expect(new URL(initial.headers.get("location")!).origin).toBe(old.issuer);
    const oldCallback = await old.authorize(initial.headers.get("location")!);
    expect((await ownerA.patch(`/api/tenants/${tenantId}/sso/${connection.json.id}`, { issuer: next.issuer, clientId: next.clientId, clientSecret: next.clientSecret })).status).toBe(200);
    const refused = await browser.get(oldCallback);
    expect(refused.status).toBe(302);
    expect(new URL(refused.headers.get("location")!, browser.origin).searchParams.get("error")).toContain("provider changed");
    expect((await browser.get("/api/auth/me")).json).toBeNull();
    next.signInAs({ sub: "new-http-subject", email, email_verified: true });
    const fresh = await browser.get(`/api/auth/oidc/start?connection=${connection.json.id}`);
    expect(fresh.status).toBe(302);
    const location = new URL(fresh.headers.get("location")!);
    expect(location.origin).toBe(next.issuer);
    expect(location.searchParams.get("client_id")).toBe(next.clientId);
    expect(location.searchParams.get("redirect_uri")).toBe(`${ownerB.origin}/api/auth/oidc/callback`);
    expect((await browser.get(await next.authorize(location.toString()))).status).toBe(302);
    const signedIn = await browser.get<Me>("/api/auth/me");
    expect(signedIn.status).toBe(200);
    expect(signedIn.json.user.email).toBe(email);
    expect(signedIn.json.activeTenant.id).toBe(tenantId);
  }, 45_000);
});
