import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { FrameworkRegistry } from "@visua/frameworks";
import { createApp } from "../src/app.ts";
import { loadAuthConfig } from "../src/auth/config.ts";
import { AuthService } from "../src/auth/service.ts";
import { createService } from "../src/context.ts";
import { TestClient } from "./client.ts";
import { testDatabase } from "./db.ts";
import { fingerprint, KEYS, type TestKey } from "./saml-idp.ts";
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
