import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { FrameworkRegistry } from "@visua/frameworks";
import { createApp } from "../src/app.ts";
import { loadAuthConfig } from "../src/auth/config.ts";
import { AuthService } from "../src/auth/service.ts";
import { createService } from "../src/context.ts";
import { TestClient } from "./client.ts";
import { TEST_PG_URL, testDatabase } from "./db.ts";
import { startMockIdp } from "./mock-idp.ts";

process.env["VISUA_AGENT_MODE"] = "offline";

const registry = FrameworkRegistry.load();
const db = await testDatabase("recheck");
const svc = await createService({ database: db.url, registry });
const idp = await startMockIdp();
const txt = new Map<string, string[]>();
const failing = new Map<string, string>(); // name → error code to throw
const lookups: string[] = [];
const resolveTxt = async (name: string) => {
  lookups.push(name);
  const code = failing.get(name);
  if (code) throw Object.assign(new Error(`queryTxt ${code} ${name}`), { code });
  const values = txt.get(name);
  if (!values) throw Object.assign(new Error(`queryTxt ENOTFOUND ${name}`), { code: "ENOTFOUND" });
  return values.map((v) => [v]);
};
const config = {
  ...loadAuthConfig({}),
  mode: "dev" as const,
  allowHttpIssuers: true,
  privateIssuerHosts: [new URL(idp.issuer).hostname],
  platform: { issuer: idp.issuer, clientId: idp.clientId, clientSecret: idp.clientSecret, name: "Test IdP" },
};
const auth = new AuthService(svc, config, { resolveTxt });
const app = createApp(svc, auth);

afterAll(async () => {
  await idp.close();
  await svc.store.close();
  await db.cleanup();
});

const DAY = 86_400_000;
type Me = { user: { id: string; email: string }; activeTenant: { id: string; role: string } | null };
type DomainStatus = { domain: string; verified: boolean; standing: string; lapsesAt?: string; takenOver: boolean; record?: { name: string; value: string } };
type ConnectionJson = { id: string; domainStatus: DomainStatus[] };

async function signIn(email: string) {
  const c = new TestClient(app);
  expect((await c.devLogin(email)).status).toBe(200);
  return c;
}
async function oidcSignIn(connection: string, user: { sub: string; email: string }) {
  const c = new TestClient(app);
  idp.signInAs({ ...user, email_verified: true });
  const start = await c.get(`/api/auth/oidc/start?connection=${connection}&returnTo=%2F`);
  const done = await c.get(await idp.authorize(start.headers.get("location")!));
  const me = await c.get<Me & { csrf: string }>("/api/auth/me");
  if (me.json) c.csrf = me.json.csrf;
  return { client: c, redirect: done.headers.get("location")!, me };
}
/** An organization with one SSO connection whose domain is proven by DNS. */
async function provenOrg(owner: string, domain: string) {
  const client = await signIn(owner);
  const tenant = (await client.get<Me>("/api/auth/me")).json.activeTenant!.id;
  const created = await client.post<ConnectionJson>(`/api/tenants/${tenant}/sso`, { name: `${domain} SSO`, issuer: idp.issuer, clientId: idp.clientId, clientSecret: idp.clientSecret, domains: [domain], jitProvisioning: true });
  expect(created.status).toBe(201);
  const record = created.json.domainStatus[0]!.record!;
  txt.set(record.name, [record.value]);
  const verified = await client.post<ConnectionJson>(`/api/tenants/${tenant}/sso/${created.json.id}/domains/${domain}/verify`);
  expect(verified.status).toBe(200);
  return { client, tenant, connection: verified.json, record };
}
const status = async (client: TestClient, tenant: string, id: string) =>
  (await client.get<{ connections: ConnectionJson[] }>(`/api/tenants/${tenant}/sso`)).json.connections.find((c) => c.id === id)!.domainStatus[0]!;
const trail = async (client: TestClient, tenant: string) => (await client.get<{ action: string; actor: string; summary: string }[]>(`/api/tenants/${tenant}/activity`)).json;
/** Run every re-check due at `at` (the ticker does this every 10 minutes). */
async function recheckAll(at: Date, via = auth) {
  let n = 0;
  while ((n = await via.recheckDueDomains(at)) > 0);
}

describe("re-checking SSO domains proven by DNS", () => {
  it("looks a proven domain up again after a day and keeps it verified while the record is there", async () => {
    const { client, tenant, connection, record } = await provenOrg("pat@found.example", "found-sso.example");
    lookups.length = 0;
    await recheckAll(new Date(Date.now() + DAY / 2));
    expect(lookups).not.toContain(record.name);
    await recheckAll(new Date(Date.now() + DAY + 60_000));
    expect(lookups.filter((n) => n === record.name)).toHaveLength(1);
    expect(await status(client, tenant, connection.id)).toMatchObject({ standing: "verified", verified: true });
  });

  it("marks a missing record failing, lapses it after the grace period, and keeps members signing in", async () => {
    const { client, tenant, connection, record } = await provenOrg("quinn@lapse.example", "lapse-sso.example");
    const member = await oidcSignIn(connection.id, { sub: "okta|rhea", email: "rhea@lapse-sso.example" });
    expect(member.me.json?.user.email).toBe("rhea@lapse-sso.example");
    txt.delete(record.name);
    const t = Date.now();
    await recheckAll(new Date(t + DAY + 60_000));
    const failingNow = await status(client, tenant, connection.id);
    expect(failingNow).toMatchObject({ standing: "failing", verified: true });
    expect(Date.parse(failingNow.lapsesAt!)).toBeCloseTo(t + 8 * DAY + 60_000, -5);
    expect((await trail(client, tenant)).some((e) => e.action === "failing" && e.actor === "Domain re-check" && e.summary.includes("lapse-sso.example"))).toBe(true);
    // Still failing, still admitting, still routing.
    expect((await new TestClient(app).post<{ connection: string }>("/api/auth/sso/discover", { email: "new@lapse-sso.example" })).json.connection).toBe(connection.id);
    for (let d = 2; d <= 8; d++) await recheckAll(new Date(t + d * DAY + 120_000));
    expect(await status(client, tenant, connection.id)).toMatchObject({ standing: "lapsed", verified: false, takenOver: false });
    expect((await trail(client, tenant)).some((e) => e.action === "lapsed" && e.summary.includes("lapse-sso.example"))).toBe(true);
    // Lapsed: a new person is refused, a linked member still gets in, and the domain still routes.
    const stranger = await oidcSignIn(connection.id, { sub: "okta|sam", email: "sam@lapse-sso.example" });
    expect(decodeURIComponent(stranger.redirect)).toContain("no verified email domain");
    const again = await oidcSignIn(connection.id, { sub: "okta|rhea", email: "rhea@lapse-sso.example" });
    expect(again.me.json?.user.email).toBe("rhea@lapse-sso.example");
    expect((await new TestClient(app).post<{ connection: string }>("/api/auth/sso/discover", { email: "rhea@lapse-sso.example" })).json.connection).toBe(connection.id);
    // The record comes back: the next re-check recovers the domain.
    txt.set(record.name, [record.value]);
    await recheckAll(new Date(t + 10 * DAY));
    expect(await status(client, tenant, connection.id)).toMatchObject({ standing: "verified", verified: true });
    expect((await trail(client, tenant)).some((e) => e.action === "recovered")).toBe(true);
  });

  it("never counts DNS trouble against a domain", async () => {
    const { client, tenant, connection, record } = await provenOrg("ravi@flaky.example", "flaky-sso.example");
    failing.set(record.name, "ETIMEOUT");
    const t = Date.now();
    for (let h = 24; h <= 24 * 10; h += 1) await recheckAll(new Date(t + h * 3_600_000 + 60_000));
    expect(await status(client, tenant, connection.id)).toMatchObject({ standing: "verified" });
    expect((await trail(client, tenant)).some((e) => e.action === "failing")).toBe(false);
    failing.delete(record.name);
  });

  it("keeps a Require-SSO organization signing in after its domain lapses, and lets its owner verify again", async () => {
    // The owner's address is in the SSO domain, so their first SSO sign-in links to their account.
    const { client, tenant, connection, record } = await provenOrg("sara@strict-sso.example", "strict-sso.example");
    const first = await oidcSignIn(connection.id, { sub: "okta|sara", email: "sara@strict-sso.example" });
    expect(first.me.json?.user.email).toBe("sara@strict-sso.example");
    expect((await client.patch(`/api/tenants/${tenant}`, { settings: { requireSso: true } })).status).toBe(200);
    txt.delete(record.name);
    const t = Date.now();
    for (let d = 1; d <= 9; d++) await recheckAll(new Date(t + d * DAY + 60_000));
    // The owner signs in the normal way: discovery still sends the domain to the connection.
    const found = await new TestClient(app).post<{ connection: string }>("/api/auth/sso/discover", { email: "sara@strict-sso.example" });
    expect(found.json.connection).toBe(connection.id);
    const owner = await oidcSignIn(found.json.connection, { sub: "okta|sara", email: "sara@strict-sso.example" });
    expect(owner.me.json?.activeTenant?.id).toBe(tenant);
    expect(await status(owner.client, tenant, connection.id)).toMatchObject({ standing: "lapsed" });
    // With "Require SSO" on, only that SSO session can manage the organization: it restores the record and verifies again.
    txt.set(record.name, [record.value]);
    const verified = await owner.client.post<ConnectionJson>(`/api/tenants/${tenant}/sso/${connection.id}/domains/strict-sso.example/verify`);
    expect(verified.status).toBe(200);
    expect(verified.json.domainStatus[0]).toMatchObject({ standing: "verified" });
  });

  it("lets another organization prove a lapsed domain, and never gives it back", async () => {
    const old = await provenOrg("uri@old-owner.example", "moved-sso.example");
    txt.delete(old.record.name);
    const t = Date.now();
    for (let d = 1; d <= 9; d++) await recheckAll(new Date(t + d * DAY + 60_000));
    expect(await status(old.client, old.tenant, old.connection.id)).toMatchObject({ standing: "lapsed" });
    const fresh = await provenOrg("vera@new-owner.example", "moved-sso.example");
    expect((await new TestClient(app).post<{ connection: string }>("/api/auth/sso/discover", { email: "x@moved-sso.example" })).json.connection).toBe(fresh.connection.id);
    // The old record reappears: the old connection is not looked up again and stays lapsed.
    txt.set(old.record.name, [old.record.value]);
    lookups.length = 0;
    for (let d = 10; d <= 12; d++) await recheckAll(new Date(t + d * DAY + 60_000));
    // Both connections share the record name (it depends on the domain only): the three lookups
    // are the new holder's daily re-checks, one per tick; none is the old connection's.
    expect(lookups.filter((n) => n === old.record.name)).toHaveLength(3);
    expect(await status(old.client, old.tenant, old.connection.id)).toMatchObject({ standing: "lapsed", takenOver: true });
  });

  it("never looks up domains that were not proven by DNS, nor anything when re-checks are off", async () => {
    const trusting = new AuthService(svc, { ...config, ssoDomainVerification: "off" }, { resolveTxt });
    expect(trusting.domainRechecksEnabled).toBe(false);
    const off = new AuthService(svc, { ...config, domainRecheckHours: 0 }, { resolveTxt });
    expect(off.domainRechecksEnabled).toBe(false);
    expect(await off.recheckDueDomains(new Date(Date.now() + 30 * DAY))).toBe(0);
    const client = new TestClient(createApp(svc, trusting));
    await client.devLogin("wes@trusted.example");
    const t = (await client.get<Me>("/api/auth/me")).json.activeTenant!.id;
    await client.post(`/api/tenants/${t}/sso`, { name: "Trusted", issuer: idp.issuer, clientId: idp.clientId, clientSecret: idp.clientSecret, domains: ["trusted-sso.example"] });
    lookups.length = 0;
    await recheckAll(new Date(Date.now() + 30 * DAY));
    expect(lookups).not.toContain("_visua-challenge.trusted-sso.example");
  });

  it("looks each due domain up once when two instances tick together", async () => {
    const { record } = await provenOrg("xia@race.example", "race-sso.example");
    // On Postgres, a second service is a second instance with its own connections.
    const otherSvc = TEST_PG_URL ? await createService({ database: db.url, registry }) : svc;
    const other = new AuthService(otherSvc, config, { resolveTxt });
    try {
      lookups.length = 0;
      const at = new Date(Date.now() + DAY + 60_000);
      await Promise.all([recheckAll(at), recheckAll(at, other)]);
      expect(lookups.filter((n) => n === record.name)).toHaveLength(1);
    } finally {
      if (otherSvc !== svc) await otherSvc.store.close();
    }
  });

  it("drops a result when the challenge changed meanwhile", async () => {
    const { client, tenant, connection, record } = await provenOrg("yan@edit.example", "edit-sso.example");
    txt.delete(record.name);
    // While the lookup is in flight, the admin removes the domain and lists it again (a new challenge).
    let edit: Promise<unknown> | undefined;
    const slow = new AuthService(svc, config, {
      resolveTxt: async (name) => {
        if (name === record.name && !edit) {
          edit = (async () => {
            await client.patch(`/api/tenants/${tenant}/sso/${connection.id}`, { domains: ["edit-two.example"] });
            await client.patch(`/api/tenants/${tenant}/sso/${connection.id}`, { domains: ["edit-two.example", "edit-sso.example"] });
          })();
          await edit;
        }
        return resolveTxt(name);
      },
    });
    await recheckAll(new Date(Date.now() + DAY + 60_000), slow);
    const now = (await client.get<{ connections: ConnectionJson[] }>(`/api/tenants/${tenant}/sso`)).json.connections.find((c) => c.id === connection.id)!;
    expect(now.domainStatus.find((d) => d.domain === "edit-sso.example")).toMatchObject({ standing: "pending" });
    expect((await trail(client, tenant)).some((e) => e.action === "failing")).toBe(false);
  });
});
