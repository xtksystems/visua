import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, afterEach, describe, expect, it } from "vitest";
import { FrameworkRegistry } from "@visua/frameworks";
import { AuthService } from "../src/auth/service.ts";
import { loadAuthConfig } from "../src/auth/config.ts";
import { createService } from "../src/context.ts";
import { testDatabase } from "./db.ts";
import { startMockIdp } from "./mock-idp.ts";

const db = await testDatabase("oidc_current");
const dir = await mkdtemp(join(tmpdir(), "visua-oidc-"));
const database = db.dialect === "sqlite" ? join(dir, "shared.db") : db.url;
const registry = FrameworkRegistry.load();
const a = await createService({ database, registry });
const b = await createService({ database, registry });
const oldIdp = await startMockIdp();
const newIdp = await startMockIdp("changed-client", "changed-secret");
const config = { ...loadAuthConfig({}), allowHttpIssuers: true, privateIssuerHosts: ["127.0.0.1"], ssoDomainVerification: "off" as const };
const authA = new AuthService(a, config);
const authB = new AuthService(b, config);
let sequence = 0;
afterEach(() => { oldIdp.beforeToken(undefined); newIdp.beforeToken(undefined); });
afterAll(async () => {
  await oldIdp.close();
  await newIdp.close();
  await b.store.close();
  await a.store.close();
  await db.cleanup();
  await rm(dir, { recursive: true, force: true });
});

async function setup() {
  const n = ++sequence;
  const login = await authA.devLogin(`owner${n}@oidc-current.example`);
  const owner = (await authA.resolveSession(login.token))!;
  const tenant = (await authA.activeTenant(owner))!.tenant;
  const input = { name: "Current provider", issuer: oldIdp.issuer, clientId: oldIdp.clientId, clientSecret: oldIdp.clientSecret, domains: [`tenant${n}.example`], jitProvisioning: true, defaultRole: "viewer" as const };
  const connection = await authA.upsertSsoConnection(tenant.id, input, owner);
  return { owner, tenant, input, connection, email: `new@tenant${n}.example` };
}

describe("current OIDC configuration across two services", () => {
  it("replaces B's warm cache when A changes issuer/client/secret; rejects the old flow", async () => {
    const { owner, tenant, input, connection, email } = await setup();
    oldIdp.signInAs({ sub: "old-subject", email, email_verified: true });
    const oldStart = await authB.startLogin(connection.id, "/", "browser-old");
    const oldCallback = new URL(await oldIdp.authorize(oldStart.toString()), authB.redirectUri);
    await authA.upsertSsoConnection(tenant.id, { ...input, id: connection.id, issuer: newIdp.issuer, clientId: newIdp.clientId, clientSecret: newIdp.clientSecret }, owner);
    const fresh = await authB.startLogin(connection.id, "/", "browser-new");
    expect(fresh.origin).toBe(newIdp.issuer);
    expect(fresh.searchParams.get("client_id")).toBe(newIdp.clientId);
    await expect(authB.finishLogin(oldCallback, undefined, "browser-old")).rejects.toThrow("provider changed");
    newIdp.signInAs({ sub: "new-subject", email, email_verified: true });
    const done = await authB.finishLogin(new URL(await newIdp.authorize(fresh.toString()), authB.redirectUri), undefined, "browser-new");
    expect((await authA.resolveSession(done.token))?.kind).toBe("user");
  });

  it("invalidates an in-flight flow after same-provider secret rotation", async () => {
    const { owner, tenant, input, connection } = await setup();
    const start = await authB.startLogin(connection.id, "/", "browser");
    const before = (await a.store.identity.sso.get(connection.id))!.providerGeneration;
    await authA.upsertSsoConnection(tenant.id, { ...input, id: connection.id, clientSecret: "rotated" }, owner);
    expect((await a.store.identity.sso.get(connection.id))!.providerGeneration).not.toBe(before);
    await expect(authB.finishLogin(new URL(`${authB.redirectUri}?state=${start.searchParams.get("state")}&code=unused`), undefined, "browser")).rejects.toThrow("provider changed");
  });

  it("rejects provider replacement during token exchange before granting any membership/session", async () => {
    const { owner, tenant, input, connection, email } = await setup();
    oldIdp.signInAs({ sub: "changed-during-exchange", email, email_verified: true });
    const start = await authB.startLogin(connection.id, "/", "browser");
    oldIdp.beforeToken(async () => {
      expect(b.store.inTransaction).toBe(false);
      await authA.upsertSsoConnection(tenant.id, { ...input, id: connection.id, issuer: newIdp.issuer }, owner);
    });
    await expect(authB.finishLogin(new URL(await oldIdp.authorize(start.toString()), authB.redirectUri), undefined, "browser")).rejects.toThrow("provider changed");
    expect(await a.store.identity.users.getByEmail(email)).toBeUndefined();
  });

  it("uses admission policy changed during token exchange", async () => {
    const { owner, tenant, input, connection, email } = await setup();
    oldIdp.signInAs({ sub: "jit-now-disabled", email, email_verified: true });
    const start = await authB.startLogin(connection.id, "/", "browser");
    oldIdp.beforeToken(async () => {
      await authA.upsertSsoConnection(tenant.id, { ...input, id: connection.id, clientSecret: undefined, jitProvisioning: false }, owner);
    });
    await expect(authB.finishLogin(new URL(await oldIdp.authorize(start.toString()), authB.redirectUri), undefined, "browser")).rejects.toThrow("no access");
    expect(await a.store.identity.users.getByEmail(email)).toBeUndefined();
  });
});
