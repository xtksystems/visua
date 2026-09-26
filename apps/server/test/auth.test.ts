import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { FrameworkRegistry } from "@visua/frameworks";
import { createApp } from "../src/app.ts";
import { loadAuthConfig } from "../src/auth/config.ts";
import { AuthService } from "../src/auth/service.ts";
import { createService } from "../src/context.ts";
import { TestClient } from "./client.ts";
import { testDatabase } from "./db.ts";
import { startMockIdp } from "./mock-idp.ts";

process.env["VISUA_AGENT_MODE"] = "offline";

const registry = FrameworkRegistry.load();
const db = await testDatabase("auth");
const svc = await createService({ database: db.url, registry });
const idp = await startMockIdp();
const auth = new AuthService(svc, {
  ...loadAuthConfig({}),
  mode: "dev",
  allowHttpIssuers: true,
  platform: { issuer: idp.issuer, clientId: idp.clientId, clientSecret: idp.clientSecret, name: "Test IdP" },
});
const app = createApp(svc, auth);

afterAll(async () => {
  await idp.close();
  await svc.store.close();
  await db.cleanup();
});

const profile = { industry: "saas", size: "11-50", dataTypes: [], drivers: [], environments: ["cloud"], maturityTier: 1, guidance: "guided", securityTeamSize: 1 };

type Me = { user: { id: string; email: string }; activeTenant: { id: string; role: string } | null; organizations: { id: string; role: string }[]; tenantScope: string | null; method: string };

async function signIn(email: string, name?: string) {
  const c = new TestClient(app);
  const res = await c.devLogin(email, name);
  expect(res.status).toBe(200);
  return c;
}

/** Complete an OpenID Connect sign-in through the mock provider. */
async function oidcSignIn(connection: string, user: { sub: string; email?: string; name?: string; email_verified?: boolean }) {
  const c = new TestClient(app);
  idp.signInAs(user);
  const start = await c.get(`/api/auth/oidc/start?connection=${connection}&returnTo=${encodeURIComponent("/w/somewhere")}`);
  expect(start.status).toBe(302);
  const callback = await idp.authorize(start.headers.get("location")!);
  const done = await c.get(callback);
  expect(done.status).toBe(302);
  const me = await c.get<Me>("/api/auth/me");
  if (me.json) c.csrf = (me.json as unknown as { csrf: string }).csrf;
  return { client: c, redirect: done.headers.get("location")!, me, callback };
}

let alice: TestClient;
let aliceTenant = "";
let wsId = "";

describe("sign-in and tenant separation", () => {
  beforeAll(async () => {
    alice = await signIn("alice@acme.example", "Alice Admin");
    aliceTenant = (await alice.get<Me>("/api/auth/me")).json.activeTenant!.id;
    const ws = await alice.post<{ workspace: { id: string } }>("/api/workspaces", { name: "Acme program", profile, frameworks: ["nist-csf-2.0"] });
    expect(ws.status).toBe(201);
    wsId = ws.json.workspace.id;
  });

  it("requires a signed-in principal for everything but health, sign-in and trust centers", async () => {
    const anon = new TestClient(app);
    expect((await anon.get("/api/health")).status).toBe(200);
    expect((await anon.get("/api/auth/config")).status).toBe(200);
    expect((await anon.get("/api/auth/me")).json).toBeNull();
    for (const path of ["/api/workspaces", "/api/meta", "/api/frameworks/nist-csf-2.0", "/api/search?q=access", "/api/corpus", "/api/corpus/file/nist-csf-2.0/core/NIST.CSWP.29.pdf", `/api/workspaces/${wsId}`]) {
      expect((await anon.get(path)).status, path).toBe(401);
    }
    expect((await anon.post("/api/workspaces", { name: "x", profile })).status).toBe(401);
  });

  it("makes the first developer sign-in the owner of a new organization", async () => {
    const me = await alice.get<Me>("/api/auth/me");
    expect(me.json.activeTenant?.role).toBe("owner");
    expect(me.json.method).toBe("dev");
  });

  it("hides one organization's workspaces from another", async () => {
    const bob = await signIn("bob@globex.example", "Bob");
    expect((await bob.get<unknown[]>("/api/workspaces")).json).toHaveLength(0);
    for (const [method, path] of [
      ["GET", `/api/workspaces/${wsId}`],
      ["GET", `/api/workspaces/${wsId}/tasks`],
      ["GET", `/api/workspaces/${wsId}/events`],
      ["GET", `/api/workspaces/${wsId}/exports/readiness.md`],
      ["PATCH", `/api/workspaces/${wsId}/requirements/nist-csf-2.0:GV.OC-01`],
      ["DELETE", `/api/workspaces/${wsId}`],
      ["GET", `/api/tenants/${aliceTenant}/members`],
    ] as const) {
      const res = await bob.request(method, path, method === "GET" ? undefined : { current: 1 });
      expect(res.status, `${method} ${path}`).toBe(404);
    }
    expect((await alice.get(`/api/workspaces/${wsId}`)).status).toBe(200);
  });

  it("refuses state changes without the session's CSRF token", async () => {
    const csrf = alice.csrf;
    alice.csrf = "";
    const res = await alice.patch(`/api/workspaces/${wsId}/requirements/nist-csf-2.0:GV.OC-01`, { current: 1 });
    alice.csrf = csrf;
    expect(res.status).toBe(403);
  });

  it("sends security headers", async () => {
    const res = await alice.get("/api/auth/me");
    expect(res.headers.get("x-content-type-options")).toBe("nosniff");
    expect(res.headers.get("x-frame-options")).toBe("DENY");
    expect(res.headers.get("cache-control")).toBe("no-store");
  });
});

describe("roles", () => {
  const clients: Record<string, TestClient> = {};
  beforeAll(async () => {
    for (const role of ["viewer", "auditor", "contributor", "approver", "admin"] as const) {
      const email = `${role}@acme.example`;
      expect((await alice.post(`/api/tenants/${aliceTenant}/members`, { email, role })).status).toBe(201);
      clients[role] = await signIn(email);
      // The member's own personal organization is not active: switch to Acme.
      expect((await clients[role]!.post("/api/auth/tenant", { tenantId: aliceTenant })).status).toBe(200);
    }
  });

  it("lets viewers read but not change or export", async () => {
    const v = clients["viewer"]!;
    const ws = await v.get<{ access: { role: string } }>(`/api/workspaces/${wsId}`);
    expect(ws.json.access.role).toBe("viewer");
    expect((await v.patch(`/api/workspaces/${wsId}/requirements/nist-csf-2.0:GV.OC-01`, { current: 2 })).status).toBe(403);
    expect((await v.post(`/api/workspaces/${wsId}/tasks`, { title: "Nope" })).status).toBe(403);
    expect((await v.get(`/api/workspaces/${wsId}/exports/readiness.md`)).status).toBe(403);
  });

  it("lets auditors export but not change anything", async () => {
    const a = clients["auditor"]!;
    expect((await a.get(`/api/workspaces/${wsId}/exports/readiness.md`)).status).toBe(200);
    expect((await a.get(`/api/workspaces/${wsId}/activity/verify`)).status).toBe(200);
    expect((await a.patch(`/api/workspaces/${wsId}/requirements/nist-csf-2.0:GV.OC-01`, { current: 2 })).status).toBe(403);
  });

  it("lets contributors do the work, and keeps decisions with approvers", async () => {
    const c = clients["contributor"]!;
    expect((await c.patch(`/api/workspaces/${wsId}/requirements/nist-csf-2.0:GV.OC-01`, { current: 2 })).status).toBe(200);
    const run = await c.post<{ proposals: { id: string }[]; status: string }>(`/api/workspaces/${wsId}/runs?wait=1`, { agent: "planner", goal: "Plan", input: { framework: "nist-csf-2.0", maxTasks: 2 } });
    expect(run.status).toBe(201);
    const proposal = run.json.proposals[0]!.id;
    expect((await c.post(`/api/workspaces/${wsId}/proposals/${proposal}/decision`, { decision: "approved" })).status).toBe(403);
    const policy = await c.post<{ id: string }>(`/api/workspaces/${wsId}/policies`, { title: "Access policy", body: "# Access policy\n\nAccess shall be reviewed quarterly." });
    expect(policy.status).toBe(201);
    expect((await c.patch(`/api/workspaces/${wsId}/policies/${policy.json.id}`, { status: "approved" })).status).toBe(403);
    expect((await c.put(`/api/workspaces/${wsId}/frameworks/nist-ai-rmf`, { enabled: true })).status).toBe(403);
    expect((await c.post(`/api/workspaces/${wsId}/connectors`, { kind: "web-posture", config: { url: "https://example.com" } })).status).toBe(403);

    const approver = clients["approver"]!;
    const decided = await approver.post<{ status: string; decidedBy: string }>(`/api/workspaces/${wsId}/proposals/${proposal}/decision`, { decision: "approved" });
    expect(decided.json.status).toBe("applied");
    expect(decided.json.decidedBy).toBe("approver <approver@acme.example>");
    expect((await approver.patch(`/api/workspaces/${wsId}/policies/${policy.json.id}`, { status: "approved" })).status).toBe(200);
  });

  it("records the authenticated person in the audit trail", async () => {
    const events = await alice.get<{ actor: string; actorId?: string; summary: string }[]>(`/api/workspaces/${wsId}/activity?limit=50`);
    const approval = events.json.find((e) => e.summary.startsWith("Approved:"))!;
    expect(approval.actor).toBe("approver <approver@acme.example>");
    expect(approval.actorId).toMatch(/^usr_/);
    expect((await alice.get<{ valid: boolean }>(`/api/workspaces/${wsId}/activity/verify`)).json.valid).toBe(true);
  });

  it("never lets anyone grant a role above their own, or remove the last owner", async () => {
    const admin = clients["admin"]!;
    expect((await admin.post(`/api/tenants/${aliceTenant}/members`, { email: "mallory@acme.example", role: "owner" })).status).toBe(403);
    expect((await admin.post(`/api/tenants/${aliceTenant}/members`, { email: "grace@acme.example", role: "approver" })).status).toBe(201);
    const aliceId = (await alice.get<Me>("/api/auth/me")).json.user.id;
    expect((await admin.patch(`/api/tenants/${aliceTenant}/members/${aliceId}`, { role: "viewer" })).status).toBe(403);
    expect((await alice.patch(`/api/tenants/${aliceTenant}/members/${aliceId}`, { role: "admin" })).status).toBe(400);
    expect((await clients["contributor"]!.post(`/api/tenants/${aliceTenant}/members`, { email: "x@acme.example", role: "viewer" })).status).toBe(403);
  });

  it("removes access when a member is removed", async () => {
    const members = await alice.get<{ id: string; email: string }[]>(`/api/tenants/${aliceTenant}/members`);
    const viewer = members.json.find((m) => m.email === "viewer@acme.example")!;
    expect((await alice.del(`/api/tenants/${aliceTenant}/members/${viewer.id}`)).status).toBe(204);
    expect((await clients["viewer"]!.get(`/api/workspaces/${wsId}`)).status).toBe(404);
  });
});

describe("API tokens", () => {
  let token = "";
  let tokenId = "";
  it("authenticates automation with a scoped, revocable bearer token", async () => {
    expect((await alice.post(`/api/tenants/${aliceTenant}/tokens`, { name: "CI", role: "owner" })).status).toBe(400);
    const created = await alice.post<{ id: string; token: string; role: string }>(`/api/tenants/${aliceTenant}/tokens`, { name: "CI pipeline", role: "contributor", expiresInDays: 30 });
    expect(created.status).toBe(201);
    token = created.json.token;
    tokenId = created.json.id;
    expect(token).toMatch(/^vsa_/);
    const list = await alice.get<{ id: string; token?: string }[]>(`/api/tenants/${aliceTenant}/tokens`);
    expect(list.json.find((t) => t.id === tokenId)?.token).toBeUndefined();

    const bot = new TestClient(app);
    bot.bearer = token;
    expect((await bot.patch(`/api/workspaces/${wsId}/requirements/nist-csf-2.0:GV.OC-02`, { current: 1 })).status).toBe(200);
    const events = await alice.get<{ actor: string }[]>(`/api/workspaces/${wsId}/activity?limit=5`);
    expect(events.json[0]!.actor).toBe("API token “CI pipeline”");
    expect((await bot.get("/api/workspaces")).json).toHaveLength(1);
  });

  it("stops working when revoked", async () => {
    expect((await alice.del(`/api/tenants/${aliceTenant}/tokens/${tokenId}`)).status).toBe(204);
    const bot = new TestClient(app);
    bot.bearer = token;
    expect((await bot.get(`/api/workspaces/${wsId}`)).status).toBe(401);
  });

  it("keeps an organization audit trail of membership, token and SSO changes", async () => {
    const trail = await alice.get<{ summary: string }[]>(`/api/tenants/${aliceTenant}/activity?limit=100`);
    expect(trail.json.some((e) => e.summary.includes("added as viewer"))).toBe(true);
    expect(trail.json.some((e) => e.summary.includes("API token “CI pipeline” created"))).toBe(true);
    expect((await alice.get<{ valid: boolean }>(`/api/tenants/${aliceTenant}/activity/verify`)).json.valid).toBe(true);
  });
});

describe("single sign-on (OpenID Connect)", () => {
  it("signs in a pre-provisioned member through the platform identity provider", async () => {
    await alice.post(`/api/tenants/${aliceTenant}/members`, { email: "henry@corp.example", name: "Henry", role: "contributor" });
    const { me, redirect } = await oidcSignIn("platform", { sub: "idp|henry", email: "henry@corp.example", email_verified: true, name: "Henry Hughes" });
    expect(redirect).toBe("/w/somewhere");
    expect(me.json?.user.email).toBe("henry@corp.example");
    expect(me.json.method).toBe("oidc:platform");
    expect(me.json.organizations.find((o) => o.id === aliceTenant)?.role).toBe("contributor");
    // The identity is linked by issuer + subject: a later email change at the IdP still signs in the same person.
    const again = await oidcSignIn("platform", { sub: "idp|henry", email: "henry.hughes@corp.example", email_verified: true });
    expect(again.me.json.user.id).toBe(me.json.user.id);
  });

  it("refuses people who have no membership, and replays of a used sign-in", async () => {
    const { redirect, client, callback } = await oidcSignIn("platform", { sub: "idp|stranger", email: "stranger@elsewhere.example", email_verified: true });
    expect(redirect).toMatch(/^\/login\?error=/);
    expect(decodeURIComponent(redirect)).toContain("no access");
    const replay = await client.get(callback);
    expect(decodeURIComponent(replay.headers.get("location") ?? "")).toMatch(/expired or was already used/);
  });

  it("provisions members through an organization's own SSO connection, scoped to that organization", async () => {
    const created = await alice.post<{ id: string; hasClientSecret: boolean; clientSecretSealed?: string }>(`/api/tenants/${aliceTenant}/sso`, {
      name: "Acme Okta",
      issuer: idp.issuer,
      clientId: idp.clientId,
      clientSecret: idp.clientSecret,
      domains: ["acme-sso.example"],
      jitProvisioning: true,
      defaultRole: "contributor",
    });
    expect(created.status).toBe(201);
    expect(created.json.hasClientSecret).toBe(true);
    expect(created.json.clientSecretSealed).toBeUndefined();
    const discovered = await new TestClient(app).post<{ connection: string }>("/api/auth/sso/discover", { email: "ivy@acme-sso.example" });
    expect(discovered.json.connection).toBe(created.json.id);

    const { me, client } = await oidcSignIn(created.json.id, { sub: "okta|ivy", email: "ivy@acme-sso.example", email_verified: true, name: "Ivy" });
    expect(me.json.tenantScope).toBe(aliceTenant);
    expect(me.json.activeTenant?.role).toBe("contributor");
    expect((await client.get(`/api/workspaces/${wsId}`)).status).toBe(200);

    // Even as a member elsewhere, an Acme-SSO session reaches only Acme.
    const bob = await signIn("bob@globex.example");
    const bobTenant = (await bob.get<Me>("/api/auth/me")).json.activeTenant!.id;
    const bobWs = await bob.post<{ workspace: { id: string } }>("/api/workspaces", { name: "Globex program", profile, frameworks: ["nist-csf-2.0"] });
    await bob.post(`/api/tenants/${bobTenant}/members`, { email: "ivy@acme-sso.example", role: "viewer" });
    expect((await client.get(`/api/workspaces/${bobWs.json.workspace.id}`)).status).toBe(404);

    // Addresses outside the connection's domains are refused.
    const outsider = await oidcSignIn(created.json.id, { sub: "okta|eve", email: "eve@evil.example", email_verified: true });
    expect(decodeURIComponent(outsider.redirect)).toContain("acme-sso.example");
  });

  it("can require an organization's own SSO for every session", async () => {
    expect((await alice.patch(`/api/tenants/${aliceTenant}`, { settings: { requireSso: true } })).status).toBe(200);
    // Alice's developer session no longer reaches Acme; an Acme SSO session does.
    expect((await alice.get(`/api/workspaces/${wsId}`)).status).toBe(404);
    const { client } = await oidcSignIn((await svc.store.identity.sso.forTenant(aliceTenant))[0]!.id, { sub: "okta|ivy", email: "ivy@acme-sso.example" });
    expect((await client.get(`/api/workspaces/${wsId}`)).status).toBe(200);
  });
});
