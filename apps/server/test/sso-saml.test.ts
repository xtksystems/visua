import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Hono } from "hono";
import { FrameworkRegistry } from "@visua/frameworks";
import { createApp } from "../src/app.ts";
import type { AppEnv } from "../src/auth/http.ts";
import { loadAuthConfig } from "../src/auth/config.ts";
import { AuthService } from "../src/auth/service.ts";
import { createService } from "../src/context.ts";
import { TestClient } from "./client.ts";
import { testDatabase } from "./db.ts";
import { assertion, encryptedResponse, fingerprint, KEYS, readRequest, response, sign, type TestKey } from "./saml-idp.ts";
import { oktaMetadata } from "./saml-samples.ts";

process.env["VISUA_AGENT_MODE"] = "offline";

const registry = FrameworkRegistry.load();
const db = await testDatabase("saml");
const svc = await createService({ database: db.url, registry });
/** The DNS this suite's server sees: TXT records by name, which tests publish. */
const txt = new Map<string, string[]>();
const resolveTxt = async (name: string) => {
  const values = txt.get(name);
  if (!values) throw Object.assign(new Error(`queryTxt ENOTFOUND ${name}`), { code: "ENOTFOUND" });
  return values.map((v) => [v]);
};
const config = { ...loadAuthConfig({}), mode: "dev" as const };
const auth = new AuthService(svc, config, { resolveTxt });
const app = createApp(svc, auth);
const PUBLIC = config.publicUrl;

afterAll(async () => {
  await svc.store.close();
  await db.cleanup();
});

const IDP = "https://idp.test/saml/visua";
const SSO_URL = "https://idp.test/sso";
const metadata = (certs: TestKey[] = ["a"], entityId = IDP) => oktaMetadata({ entityId, ssoUrl: SSO_URL, certs: certs.map((k) => KEYS[k].cert) });

type Me = { user: { id: string; email: string }; activeTenant: { id: string; role: string } | null; method: string; tenantScope: string | null; organizations: { id: string }[]; csrf: string };
type Certificate = { fingerprint: string; notAfter: string; standing: string };
type ConnectionJson = {
  id: string;
  protocol: "oidc" | "saml";
  enabled: boolean;
  saml?: { entityId: string; ssoUrl: string; certificates: Certificate[] };
  sp?: { entityId: string; acsUrl: string; metadataUrl: string };
  domainStatus: { domain: string; verified: boolean; standing: string; record?: { name: string; value: string } }[];
};

async function signIn(email: string) {
  const c = new TestClient(app);
  expect((await c.devLogin(email)).status).toBe(200);
  return c;
}
const tenantOf = async (c: TestClient) => (await c.get<Me>("/api/auth/me")).json.activeTenant!.id;
const trail = async (client: TestClient, tenant: string) => (await client.get<{ action: string; actor: string; summary: string; data?: Record<string, unknown> }[]>(`/api/tenants/${tenant}/activity`)).json;

/** An organization with a SAML connection whose domain is proven by DNS (unless `prove: false`). */
async function samlOrg(owner: string, domain: string, o: { certs?: TestKey[]; entityId?: string; jit?: boolean; prove?: boolean } = {}) {
  const client = await signIn(owner);
  const tenant = await tenantOf(client);
  const created = await client.post<ConnectionJson>(`/api/tenants/${tenant}/sso`, {
    protocol: "saml",
    name: `${domain} SAML`,
    metadataXml: metadata(o.certs, o.entityId),
    domains: [domain],
    jitProvisioning: o.jit ?? true,
  });
  expect(created.status, JSON.stringify(created.json)).toBe(201);
  let connection = created.json;
  if (o.prove !== false) {
    const record = connection.domainStatus[0]!.record!;
    txt.set(record.name, [record.value]);
    const verified = await client.post<ConnectionJson>(`/api/tenants/${tenant}/sso/${connection.id}/domains/${domain}/verify`);
    expect(verified.status, JSON.stringify(verified.json)).toBe(200);
    connection = verified.json;
  }
  return { client, tenant, connection };
}

describe("SAML connections", () => {
  it("previews pasted metadata without saving, then adds the connection with Visua's URLs to enter in the provider", async () => {
    const owner = await signIn("olga@preview-saml.example");
    const tenant = await tenantOf(owner);
    const preview = await owner.post<{ entityId: string; ssoUrl: string; certificates: Certificate[] }>(`/api/tenants/${tenant}/sso/saml/preview`, { metadataXml: metadata(["a", "b"]) });
    expect(preview.status, JSON.stringify(preview.json)).toBe(200);
    expect(preview.json).toMatchObject({ entityId: IDP, ssoUrl: SSO_URL });
    expect(preview.json.certificates.map((c) => c.fingerprint)).toEqual([fingerprint("a"), fingerprint("b")]);
    expect(preview.json.certificates[0]!.standing).toBe("valid");
    expect((await owner.get<{ connections: unknown[] }>(`/api/tenants/${tenant}/sso`)).json.connections).toHaveLength(0);

    const created = await owner.post<ConnectionJson>(`/api/tenants/${tenant}/sso`, { protocol: "saml", name: "Okta", metadataXml: metadata(), domains: ["preview-saml.example"] });
    expect(created.status, JSON.stringify(created.json)).toBe(201);
    const id = created.json.id;
    expect(created.json).toMatchObject({
      protocol: "saml",
      saml: { entityId: IDP, ssoUrl: SSO_URL },
      sp: { entityId: `${PUBLIC}/api/auth/saml/${id}`, acsUrl: `${PUBLIC}/api/auth/saml/${id}/acs`, metadataUrl: `${PUBLIC}/api/auth/saml/${id}/metadata` },
    });
    expect(created.json.domainStatus[0]).toMatchObject({ domain: "preview-saml.example", standing: "pending" });
    expect(JSON.stringify(created.json)).not.toContain("BEGIN CERTIFICATE");
    expect((await trail(owner, tenant)).some((e) => e.action === "created" && e.summary.includes("preview-saml.example"))).toBe(true);
  });

  it("refuses metadata it cannot trust, a SAML connection without metadata, and admins choosing a provider", async () => {
    const owner = await signIn("oscar@refuse-saml.example");
    const tenant = await tenantOf(owner);
    const post = (body: Record<string, unknown>, as = owner) => as.post<{ error: string }>(`/api/tenants/${tenant}/sso`, { protocol: "saml", domains: ["refuse-saml.example"], ...body });
    const http = await post({ metadataXml: oktaMetadata({ entityId: IDP, ssoUrl: "http://idp.test/sso", certs: [KEYS.a.cert] }) });
    expect(http.status).toBe(400);
    expect(http.json.error).toBe("The sign-in URL in the metadata must use https");
    const doctype = await post({ metadataXml: metadata().replace('<?xml version="1.0" encoding="UTF-8"?>', '<!DOCTYPE x [<!ENTITY a "a">]>') });
    expect(doctype.json.error).toBe("The metadata must not contain a DOCTYPE");
    expect((await post({})).status).toBe(400);
    await owner.post(`/api/tenants/${tenant}/members`, { email: "ada.admin@refuse-saml.example", role: "admin" });
    const admin = await signIn("ada.admin@refuse-saml.example");
    expect((await post({ metadataXml: metadata() }, admin)).status).toBe(403);
    expect((await admin.post(`/api/tenants/${tenant}/sso/saml/preview`, { metadataXml: metadata() })).status).toBe(403);
  });

  it("serves Visua's metadata for an enabled SAML connection only", async () => {
    const { client, tenant, connection } = await samlOrg("mia@meta-saml.example", "meta-saml.example", { prove: false });
    const anon = new TestClient(app);
    const res = await anon.get(`/api/auth/saml/${connection.id}/metadata`);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("application/samlmetadata+xml");
    expect(res.text).toContain(`entityID="${PUBLIC}/api/auth/saml/${connection.id}"`);
    expect(res.text).toContain(`Location="${PUBLIC}/api/auth/saml/${connection.id}/acs"`);
    expect(res.text).toContain('Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST"');
    expect(res.text).toContain('AuthnRequestsSigned="false"');
    expect(res.text).toContain('WantAssertionsSigned="true"');
    expect(res.text).toContain("urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress");
    expect((await client.patch(`/api/tenants/${tenant}/sso/${connection.id}`, { enabled: false })).status).toBe(200);
    expect((await anon.get(`/api/auth/saml/${connection.id}/metadata`)).status).toBe(404);
    const oidc = await client.post<ConnectionJson>(`/api/tenants/${tenant}/sso`, { name: "OIDC", issuer: "https://login.meta-saml.example", clientId: "visua", domains: ["oidc.meta-saml.example"] });
    expect(oidc.json.protocol).toBe("oidc");
    expect((await anon.get(`/api/auth/saml/${oidc.json.id}/metadata`)).status).toBe(404);
    expect((await anon.get(`/api/auth/saml/sso_missing/metadata`)).status).toBe(404);
  });

  it("rotates certificates in place: domains keep their proof, and the trail names the fingerprints", async () => {
    const { client, tenant, connection } = await samlOrg("rui@rotate-saml.example", "rotate-saml.example");
    const both = await client.patch<ConnectionJson>(`/api/tenants/${tenant}/sso/${connection.id}`, { metadataXml: metadata(["a", "b"]) });
    expect(both.status, JSON.stringify(both.json)).toBe(200);
    expect(both.json.saml!.certificates.map((c) => c.fingerprint)).toEqual([fingerprint("a"), fingerprint("b")]);
    expect(both.json.domainStatus[0]).toMatchObject({ verified: true, standing: "verified" });
    const onlyB = await client.patch<ConnectionJson>(`/api/tenants/${tenant}/sso/${connection.id}`, { metadataXml: metadata(["b"]) });
    expect(onlyB.json.saml!.certificates.map((c) => c.fingerprint)).toEqual([fingerprint("b")]);
    const entries = (await trail(client, tenant)).filter((e) => e.action === "updated" && e.summary.includes("signing certificates"));
    expect(entries.some((e) => e.summary.includes(`added: ${fingerprint("b").slice(0, 23)}`))).toBe(true);
    expect(entries.some((e) => e.summary.includes(`removed: ${fingerprint("a").slice(0, 23)}`))).toBe(true);
    expect(entries.some((e) => (e.data?.["certificatesRemoved"] as string[] | undefined)?.includes(fingerprint("a")))).toBe(true);
  });

  it("lets admins enable or disable a SAML connection, never change its provider", async () => {
    const { client, tenant, connection } = await samlOrg("ines@admin-saml.example", "admin-saml.example");
    await client.post(`/api/tenants/${tenant}/members`, { email: "adam@admin-saml.example", role: "admin" });
    const admin = await signIn("adam@admin-saml.example");
    const off = await admin.patch<ConnectionJson>(`/api/tenants/${tenant}/sso/${connection.id}`, { enabled: false });
    expect(off.status, JSON.stringify(off.json)).toBe(200);
    expect(off.json).toMatchObject({ enabled: false, saml: { entityId: IDP } });
    expect((await admin.patch(`/api/tenants/${tenant}/sso/${connection.id}`, { metadataXml: metadata(["b"]) })).status).toBe(403);
  });

  it("lets admins manage the rest of a SAML connection, never its domains or its removal", async () => {
    const { client, tenant, connection } = await samlOrg("ivo@manage-saml.example", "manage-saml.example", { prove: false });
    await client.post(`/api/tenants/${tenant}/members`, { email: "ana@manage-saml.example", role: "admin" });
    await client.post(`/api/tenants/${tenant}/members`, { email: "val@manage-saml.example", role: "approver" });
    const admin = await signIn("ana@manage-saml.example");
    const url = `/api/tenants/${tenant}/sso/${connection.id}`;

    const listed = await admin.get<{ connections: ConnectionJson[] }>(`/api/tenants/${tenant}/sso`);
    expect(listed.status).toBe(200);
    expect(listed.json.connections.find((c) => c.id === connection.id)).toMatchObject({ protocol: "saml", saml: { entityId: IDP }, sp: connection.sp });
    expect((await (await signIn("val@manage-saml.example")).get(`/api/tenants/${tenant}/sso`)).status).toBe(403);

    const renamed = await admin.patch<ConnectionJson & { name: string; jitProvisioning: boolean; defaultRole: string }>(url, { name: "Okta", jitProvisioning: false, defaultRole: "approver" });
    expect(renamed.status, JSON.stringify(renamed.json)).toBe(200);
    expect(renamed.json).toMatchObject({ name: "Okta", jitProvisioning: false, defaultRole: "approver", saml: { entityId: IDP } });
    // The same metadata chooses the same provider, so an admin may send it back unchanged.
    expect((await admin.patch(url, { metadataXml: metadata() })).status).toBe(200);
    expect((await admin.patch(url, { defaultRole: "admin" })).status).toBe(400);
    expect((await admin.patch(url, { domains: ["manage-saml.example", "other-saml.example"] })).status).toBe(403);

    const record = connection.domainStatus[0]!.record!;
    txt.set(record.name, [record.value]);
    const verified = await admin.post<ConnectionJson>(`${url}/domains/manage-saml.example/verify`);
    expect(verified.status, JSON.stringify(verified.json)).toBe(200);
    expect(verified.json.domainStatus[0]).toMatchObject({ verified: true, standing: "verified" });

    expect((await admin.del(url)).status).toBe(403);
    expect((await client.del(url)).status).toBe(204);
  });

  it("keeps each connection's protocol", async () => {
    const { client, tenant, connection } = await samlOrg("pia@proto-saml.example", "proto-saml.example", { prove: false });
    const toOidc = await client.patch<{ error: string }>(`/api/tenants/${tenant}/sso/${connection.id}`, { issuer: "https://login.proto-saml.example" });
    expect(toOidc.status).toBe(400);
    expect(toOidc.json.error).toBe("A SAML connection has no issuer or client: paste new metadata to change its provider");
    const oidc = await client.post<ConnectionJson>(`/api/tenants/${tenant}/sso`, { name: "OIDC", issuer: "https://login.proto-saml.example", clientId: "visua", domains: ["oidc.proto-saml.example"] });
    const toSaml = await client.patch<{ error: string }>(`/api/tenants/${tenant}/sso/${oidc.json.id}`, { metadataXml: metadata() });
    expect(toSaml.status).toBe(400);
    expect(toSaml.json.error).toBe("An OpenID Connect connection takes no SAML metadata");
  });

  it("never starts an OpenID Connect sign-in with a SAML connection", async () => {
    const { connection } = await samlOrg("quin@oidc-saml.example", "oidc-saml.example");
    const res = await new TestClient(app).get(`/api/auth/oidc/start?connection=${connection.id}`);
    expect(res.status).toBe(401);
  });
});

type Flow = { client: TestClient; request: ReturnType<typeof readRequest> };
type Person = { nameId: string; nameIdFormat?: string; attributes?: Record<string, string> };

/** Start a SAML sign-in in a browser (a TestClient keeps its cookies). */
async function startSaml(connection: string, client = new TestClient(app)): Promise<Flow> {
  const start = await client.get(`/api/auth/saml/start?connection=${connection}&returnTo=${encodeURIComponent("/w/somewhere")}`);
  expect(start.status, start.text).toBe(302);
  return { client, request: readRequest(start.headers.get("location")!) };
}
/** The test provider's signed answer to a request (key a, SHA-256, email NameID unless told otherwise). */
function answer(req: Flow["request"], person: Person, o: { key?: TestKey; issuer?: string; algorithm?: "sha256" | "sha1" } = {}): string {
  const issuer = o.issuer ?? IDP;
  return response({ issuer, acs: req.acs, inResponseTo: req.id }, sign(assertion({ issuer, audience: req.issuer, acs: req.acs, inResponseTo: req.id, ...person }), o.key ?? "a", o.algorithm));
}
/** The provider's form POST to the ACS: cross-site, so no Lax cookie reaches Visua. */
const postAcs = (connection: string, samlResponse: string, via: Hono<AppEnv> = app) =>
  via.request(`/api/auth/saml/${connection}/acs`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded", origin: "https://idp.test", "sec-fetch-site": "cross-site" },
    body: new URLSearchParams({ SAMLResponse: samlResponse, RelayState: "" }).toString(),
  });
/** Follow the ACS's redirect in the browser that started the sign-in: the chain began at the provider, so it is cross-site. */
async function finish(flow: Flow, acs: Response) {
  const location = acs.headers.get("location") ?? "";
  const done = await flow.client.request("GET", location, undefined, { "sec-fetch-site": "cross-site" });
  const me = (await flow.client.get<Me | null>("/api/auth/me")).json;
  if (me) flow.client.csrf = me.csrf;
  return { acsLocation: location, redirect: done.headers.get("location") ?? "", me };
}
async function samlSignIn(connection: string, person: Person, o: { key?: TestKey; issuer?: string; algorithm?: "sha256" | "sha1" } = {}) {
  const flow = await startSaml(connection);
  const acs = await postAcs(connection, answer(flow.request, person, o));
  return { ...(await finish(flow, acs)), acs, flow };
}
const loginError = (location: string) => (location.startsWith("/login?") ? new URLSearchParams(location.slice("/login?".length)).get("error") ?? "" : "");

describe("SAML sign-in", () => {
  it("signs a new person in through start, the provider, the ACS and finish, scoped to the organization", async () => {
    const { client, tenant, connection } = await samlOrg("owen@flow-saml.example", "flow-saml.example");
    const flow = await startSaml(connection.id);
    expect(flow.request.url.origin + flow.request.url.pathname).toBe(SSO_URL);
    expect(flow.request.acs).toBe(`${PUBLIC}/api/auth/saml/${connection.id}/acs`);
    expect(flow.request.issuer).toBe(`${PUBLIC}/api/auth/saml/${connection.id}`);
    expect(flow.request.url.searchParams.get("RelayState") ?? "").toBe("");
    expect([...flow.client.jar.keys()]).toContain("visua_saml");
    const acs = await postAcs(connection.id, answer(flow.request, { nameId: "ada@flow-saml.example", attributes: { displayName: "Ada Lovelace" } }));
    expect(acs.status).toBe(303);
    expect(acs.headers.get("location")).toMatch(/^\/api\/auth\/saml\/finish\?code=/);
    expect(acs.headers.getSetCookie()).toEqual([]);
    const done = await finish(flow, acs);
    expect(done.redirect).toBe("/w/somewhere");
    expect(done.me).toMatchObject({ user: { email: "ada@flow-saml.example" }, method: `saml:${connection.id}`, tenantScope: tenant, activeTenant: { id: tenant, role: "viewer" } });
    expect(done.me!.organizations.map((o) => o.id)).toEqual([tenant]);
    expect(flow.client.jar.has("visua_saml")).toBe(false);
    expect((await trail(client, tenant)).some((e) => e.action === "provisioned" && e.summary.includes("ada@flow-saml.example"))).toBe(true);
    // The same person again: linked by the connection's own key, still one organization.
    expect((await samlSignIn(connection.id, { nameId: "ada@flow-saml.example" })).me?.user.email).toBe("ada@flow-saml.example");
  });

  it("sets the SAML flow cookie's attributes, __Host-prefixed and Secure over https", async () => {
    const { connection } = await samlOrg("cody@cookie-saml.example", "cookie-saml.example");
    const start = await new TestClient(app).get(`/api/auth/saml/start?connection=${connection.id}`);
    const setCookie = start.headers.getSetCookie().find((c) => c.startsWith("visua_saml="));
    expect(setCookie).toBeDefined();
    expect(setCookie).toContain("HttpOnly");
    expect(setCookie).toContain("SameSite=Lax");
    expect(setCookie).toContain("Path=/");
    expect(setCookie).toContain("Max-Age=600");
    expect(setCookie).not.toContain("Secure");

    const httpsApp = createApp(svc, new AuthService(svc, { ...config, publicUrl: "https://visua.test", secureCookies: true }, { resolveTxt }));
    const httpsStart = await new TestClient(httpsApp).get(`/api/auth/saml/start?connection=${connection.id}`);
    const httpsSetCookie = httpsStart.headers.getSetCookie().find((c) => c.startsWith("__Host-visua_saml="));
    expect(httpsSetCookie).toBeDefined();
    expect(httpsSetCookie).toContain("Secure");
    expect(httpsSetCookie).toContain("HttpOnly");
    expect(httpsSetCookie).toContain("SameSite=Lax");
    expect(httpsSetCookie).toContain("Path=/");
    expect(httpsSetCookie).toContain("Max-Age=600");
  });

  it("finishes only in the browser that started it, and only once", async () => {
    const { connection } = await samlOrg("bea@browser-saml.example", "browser-saml.example");
    const flow = await startSaml(connection.id);
    const acs = await postAcs(connection.id, answer(flow.request, { nameId: "cy@browser-saml.example" }));
    const elsewhere = await finish({ client: new TestClient(app), request: flow.request }, acs);
    expect(loginError(elsewhere.redirect)).toBe("This sign-in was started in another browser. Start again.");
    expect(elsewhere.me).toBeNull();
    const reused = await finish(flow, acs);
    expect(loginError(reused.redirect)).toBe("This sign-in link expired or was already used. Start again.");
    expect(reused.me).toBeNull();
  });

  it("starts only from Visua, and only for an enabled SAML connection", async () => {
    const { client, tenant, connection } = await samlOrg("cal@start-saml.example", "start-saml.example");
    const fromElsewhere = await new TestClient(app).request("GET", `/api/auth/saml/start?connection=${connection.id}`, undefined, { "sec-fetch-site": "cross-site" });
    expect(loginError(fromElsewhere.headers.get("location")!)).toBe("Start signing in from the Visua sign-in page.");
    const oidc = await client.post<ConnectionJson>(`/api/tenants/${tenant}/sso`, { name: "OIDC", issuer: "https://login.start-saml.example", clientId: "visua", domains: ["oidc.start-saml.example"] });
    const wrong = await new TestClient(app).get(`/api/auth/saml/start?connection=${oidc.json.id}`);
    expect(loginError(wrong.headers.get("location")!)).toBe("This SSO connection is not available");
    await client.patch(`/api/tenants/${tenant}/sso/${connection.id}`, { enabled: false });
    const disabled = await new TestClient(app).get(`/api/auth/saml/start?connection=${connection.id}`);
    expect(loginError(disabled.headers.get("location")!)).toBe("This SSO connection is not available");
  });

  it("exempts exactly the ACS from the cross-site guard", async () => {
    const { connection } = await samlOrg("dan@guard-saml.example", "guard-saml.example");
    const crossSite = { "content-type": "application/x-www-form-urlencoded", origin: "https://idp.test", "sec-fetch-site": "cross-site" };
    // Public paths (they pass the sign-in check and reach the cross-site guard), next to the ACS or not.
    for (const path of [`/api/auth/saml/${connection.id}/metadata`, "/api/auth/saml/start", "/api/auth/saml/finish", "/api/auth/oidc/callback", "/api/auth/dev/login", "/api/auth/logout"]) {
      const res = await app.request(path, { method: "POST", headers: crossSite, body: "SAMLResponse=x" });
      expect(res.status, path).toBe(403);
    }
    // The ACS itself is reached: a response that is not XML ends on the sign-in page, not in a 403.
    const acs = await postAcs(connection.id, "bm90IHhtbA==");
    expect(acs.status).toBe(303);
    expect(loginError(acs.headers.get("location")!)).not.toBe("");
  });

  it("tells the sign-in page which protocol a domain uses", async () => {
    const { connection } = await samlOrg("eve@disc-saml.example", "disc-saml.example");
    const saml = await new TestClient(app).post<{ connection: string; protocol: string }>("/api/auth/sso/discover", { email: "x@disc-saml.example" });
    expect(saml.json).toMatchObject({ connection: connection.id, protocol: "saml" });
    const owner = await signIn("fay@disc-oidc.example");
    const tenant = await tenantOf(owner);
    const oidc = await owner.post<ConnectionJson>(`/api/tenants/${tenant}/sso`, { name: "OIDC", issuer: "https://login.disc-oidc.example", clientId: "visua", domains: ["disc-oidc.example"] });
    const record = oidc.json.domainStatus[0]!.record!;
    txt.set(record.name, [record.value]);
    await owner.post(`/api/tenants/${tenant}/sso/${oidc.json.id}/domains/disc-oidc.example/verify`);
    const found = await new TestClient(app).post<{ connection: string; protocol: string }>("/api/auth/sso/discover", { email: "x@disc-oidc.example" });
    expect(found.json).toMatchObject({ connection: oidc.json.id, protocol: "oidc" });
  });

  it("with only a SAML connection, Require SSO keeps its members' roles and no other session's", async () => {
    const { client, tenant, connection } = await samlOrg("gil@req-saml.example", "req-saml.example");
    expect((await client.patch(`/api/tenants/${tenant}`, { settings: { requireSso: true } })).status).toBe(200);
    // The owner's developer session stands in for any session not from the organization's own SSO.
    expect((await client.get(`/api/tenants/${tenant}`)).status).toBe(404);
    const owner = await samlSignIn(connection.id, { nameId: "gil@req-saml.example" });
    expect(owner.me?.activeTenant).toMatchObject({ id: tenant, role: "owner" });
  });
});

describe("SAML responses Visua refuses", () => {
  const VERIFY_FAILED = "The identity provider's response could not be verified. Start again.";
  let org: Awaited<ReturnType<typeof samlOrg>>;
  const acsOf = (req: Flow["request"]) => ({ issuer: IDP, acs: req.acs, inResponseTo: req.id });
  const base = (req: Flow["request"], nameId = "mal@forge-saml.example") => ({ issuer: IDP, audience: req.issuer, acs: req.acs, inResponseTo: req.id, nameId });
  /** Post a forged response for a fresh request; returns the sign-in page's error (empty when accepted). */
  async function refusal(forge: (req: Flow["request"]) => string) {
    const flow = await startSaml(org.connection.id);
    const acs = await postAcs(org.connection.id, forge(flow.request));
    return loginError(acs.headers.get("location") ?? "");
  }

  beforeAll(async () => {
    org = await samlOrg("fred@forge-saml.example", "forge-saml.example");
  });

  it("refuses unsigned assertions, unknown keys, wrong audiences and expired or early assertions", async () => {
    expect(await refusal((req) => response(acsOf(req), assertion(base(req))))).toBe(VERIFY_FAILED);
    expect(await refusal((req) => response(acsOf(req), sign(assertion(base(req)), "rogue")))).toBe(VERIFY_FAILED);
    expect(await refusal((req) => response(acsOf(req), sign(assertion({ ...base(req), audience: "https://other.example/sp" }))))).toBe(VERIFY_FAILED);
    const past = new Date(Date.now() - 20 * 60_000);
    expect(await refusal((req) => response(acsOf(req), sign(assertion({ ...base(req), issuedAt: past, notOnOrAfter: new Date(past.getTime() + 5 * 60_000) }))))).toBe(VERIFY_FAILED);
    expect(await refusal((req) => response(acsOf(req), sign(assertion({ ...base(req), notBefore: new Date(Date.now() + 10 * 60_000) }))))).toBe(VERIFY_FAILED);
  });

  it("refuses a response from another issuer, even signed with the connection's key", async () => {
    expect(await refusal((req) => response({ ...acsOf(req), issuer: "https://evil.example" }, sign(assertion({ ...base(req), issuer: "https://evil.example" }))))).toBe(
      "The response was issued by another identity provider",
    );
  });

  it("refuses IdP-initiated responses and requests Visua never issued", async () => {
    expect(await refusal((req) => response({ ...acsOf(req), inResponseTo: null }, sign(assertion({ ...base(req), inResponseTo: null }))))).toBe(VERIFY_FAILED);
    expect(await refusal((req) => response({ ...acsOf(req), inResponseTo: "_never" }, sign(assertion({ ...base(req), inResponseTo: "_never" }))))).toBe(VERIFY_FAILED);
  });

  it("refuses an assertion that does not itself answer the request", async () => {
    // A signed assertion with no InResponseTo of its own, wrapped in a Response naming a fresh request.
    expect(await refusal((req) => response(acsOf(req), sign(assertion({ ...base(req), inResponseTo: null }))))).toBe(
      "The identity provider's response does not answer a sign-in Visua started. Start again from the Visua sign-in page.",
    );
    // A signed assertion answering this request, but addressed to another connection's ACS.
    expect(await refusal((req) => response(acsOf(req), sign(assertion({ ...base(req), acs: req.acs.replace(org.connection.id, "sso_elsewhere") }))))).toBe(
      "The identity provider's response does not answer a sign-in Visua started. Start again from the Visua sign-in page.",
    );
    // A signed assertion answering someone else's request, wrapped in a Response naming the attacker's.
    const victim = await startSaml(org.connection.id);
    const captured = sign(assertion(base(victim.request, "victim@forge-saml.example")));
    expect(await refusal((req) => response(acsOf(req), captured))).not.toBe("");
  });

  it("refuses replays, signature wrapping, SHA-1 and encrypted assertions", async () => {
    const flow = await startSaml(org.connection.id);
    const once = answer(flow.request, { nameId: "rae@forge-saml.example" });
    expect((await postAcs(org.connection.id, once)).headers.get("location")).toMatch(/^\/api\/auth\/saml\/finish\?code=/);
    expect(loginError((await postAcs(org.connection.id, once)).headers.get("location")!)).not.toBe("");
    // A signed assertion with an injected unsigned one beside it, or around it.
    expect(await refusal((req) => response(acsOf(req), sign(assertion(base(req))), assertion(base(req, "fred@forge-saml.example"))))).toBe(VERIFY_FAILED);
    expect(
      await refusal((req) => {
        const evil = assertion(base(req, "fred@forge-saml.example"));
        return response(acsOf(req), evil.replace("</saml:Subject>", `</saml:Subject>${sign(assertion(base(req)))}`));
      }),
    ).toBe(VERIFY_FAILED);
    expect(await refusal((req) => answer(req, { nameId: "rae@forge-saml.example" }, { algorithm: "sha1" }))).toBe(
      "The SAML response is signed with an algorithm Visua does not accept: use RSA-SHA256",
    );
    expect(await refusal((req) => encryptedResponse(acsOf(req)))).toBe(
      "Encrypted assertions are not supported: turn assertion encryption off for Visua in your identity provider",
    );
  });

  it("refuses a person without an email address", async () => {
    expect(await refusal((req) => response(acsOf(req), sign(assertion({ ...base(req), nameId: "00u9", nameIdFormat: "urn:oasis:names:tc:SAML:2.0:nameid-format:persistent" }))))).toBe(
      "Your identity provider did not share an email address",
    );
  });

  it("refuses an oversized response however it is sent", async () => {
    const body = new URLSearchParams({ SAMLResponse: "bm90IHhtbA==", padding: "A".repeat(1_100_000) }).toString();
    // A streamed body carries no Content-Length: the limit must hold without it.
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode(body));
        controller.close();
      },
    });
    const res = await app.request(`/api/auth/saml/${org.connection.id}/acs`, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded", origin: "https://idp.test", "sec-fetch-site": "cross-site" },
      body: stream,
      duplex: "half",
    } as RequestInit);
    expect(res.status).toBe(303);
    expect(loginError(res.headers.get("location")!)).toBe("The sign-in response is missing or too large");
  });
});

describe("SAML certificates, domains and instances", () => {
  it("accepts either of two stored certificates during a rotation, then only the one kept", async () => {
    const { client, tenant, connection } = await samlOrg("hal@rot2-saml.example", "rot2-saml.example", { certs: ["a", "b"] });
    expect((await samlSignIn(connection.id, { nameId: "x@rot2-saml.example" }, { key: "a" })).me?.user.email).toBe("x@rot2-saml.example");
    expect((await samlSignIn(connection.id, { nameId: "y@rot2-saml.example" }, { key: "b" })).me?.user.email).toBe("y@rot2-saml.example");
    await client.patch(`/api/tenants/${tenant}/sso/${connection.id}`, { metadataXml: metadata(["b"]) });
    expect((await samlSignIn(connection.id, { nameId: "x@rot2-saml.example" }, { key: "a" })).me).toBeNull();
    expect((await samlSignIn(connection.id, { nameId: "x@rot2-saml.example" }, { key: "b" })).me?.user.email).toBe("x@rot2-saml.example");
  });

  it("admits no one new from a pending or lapsed domain, and keeps linked members signing in", async () => {
    const pending = await samlOrg("ian@pend-saml.example", "pend-saml.example", { prove: false });
    const refused = await samlSignIn(pending.connection.id, { nameId: "new@pend-saml.example" });
    expect(loginError(refused.redirect)).toBe("This SSO connection has no verified email domain yet");
    const { connection } = await samlOrg("jo@lapse-saml.example", "lapse-saml.example");
    expect((await samlSignIn(connection.id, { nameId: "kim@lapse-saml.example" })).me?.user.email).toBe("kim@lapse-saml.example");
    const stored = (await svc.store.identity.sso.get(connection.id))!;
    const v = stored.verification!["lapse-saml.example"]!;
    await svc.store.identity.sso.put({ ...stored, verification: { "lapse-saml.example": { token: v.token, method: "dns", lapsedAt: new Date().toISOString() } } });
    const stranger = await samlSignIn(connection.id, { nameId: "lee@lapse-saml.example" });
    expect(loginError(stranger.redirect)).toContain("no longer admits new people from lapse-saml.example");
    expect((await samlSignIn(connection.id, { nameId: "kim@lapse-saml.example" })).me?.user.email).toBe("kim@lapse-saml.example");
  });

  it("keeps each connection's people apart even with the same entity ID", async () => {
    const first = await samlOrg("max@first-saml.example", "first-saml.example");
    expect((await samlSignIn(first.connection.id, { nameId: "nia@first-saml.example" })).me?.user.email).toBe("nia@first-saml.example");
    // Another organization pastes metadata naming the same provider entity, with a key it holds.
    const second = await samlOrg("oto@second-saml.example", "second-saml.example", { certs: ["rogue"] });
    const intruder = await samlSignIn(second.connection.id, { nameId: "nia@first-saml.example" }, { key: "rogue" });
    expect(loginError(intruder.redirect)).toBe("This sign-in is for second-saml.example addresses");
    expect(intruder.me).toBeNull();
  });

  it("does not carry identity links over to another identity provider", async () => {
    const persistent = "urn:oasis:names:tc:SAML:2.0:nameid-format:persistent";
    const { client, tenant, connection } = await samlOrg("ann@rekey-saml.example", "rekey-saml.example");
    const first = await samlSignIn(connection.id, { nameId: "jdoe", nameIdFormat: persistent, attributes: { email: "ann@rekey-saml.example" } });
    expect(first.me?.user.email).toBe("ann@rekey-saml.example");

    const changed = await client.patch<ConnectionJson>(`/api/tenants/${tenant}/sso/${connection.id}`, { metadataXml: metadata(["a"], "https://idp2.test/saml") });
    expect(changed.status, JSON.stringify(changed.json)).toBe(200);
    const latestUpdated = (await trail(client, tenant)).find((e) => e.action === "updated");
    expect(latestUpdated?.summary).toContain(`identity provider ${IDP} → https://idp2.test/saml`);

    const second = await samlSignIn(connection.id, { nameId: "jdoe", nameIdFormat: persistent, attributes: { email: "bob@rekey-saml.example" } }, { issuer: "https://idp2.test/saml" });
    expect(second.me?.user.email).toBe("bob@rekey-saml.example");
  });

  it("completes on another instance, and accepts a response replayed to two instances once", async () => {
    const { connection } = await samlOrg("pat@multi-saml.example", "multi-saml.example");
    const other = createApp(svc, new AuthService(svc, config, { resolveTxt }));
    const flow = await startSaml(connection.id);
    const acs = await postAcs(connection.id, answer(flow.request, { nameId: "quin@multi-saml.example" }), other);
    expect((await finish(flow, acs)).me?.user.email).toBe("quin@multi-saml.example");

    const again = await startSaml(connection.id);
    const copy = answer(again.request, { nameId: "rhea@multi-saml.example" });
    const results = await Promise.all([postAcs(connection.id, copy, app), postAcs(connection.id, copy, other)]);
    const codes = results.map((r) => r.headers.get("location") ?? "").filter((l) => l.startsWith("/api/auth/saml/finish?code="));
    expect(codes).toHaveLength(1);
  });
});
