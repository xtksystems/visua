import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import type { OrganizationProfile } from "@visua/core";
import { FrameworkRegistry } from "@visua/frameworks";
import { createApp } from "../src/app.ts";
import { AuthService } from "../src/auth/service.ts";
import { loadAuthConfig } from "../src/auth/config.ts";
import { createService } from "../src/context.ts";
import { workspaceEventStream } from "../src/workspace-events.ts";
import { testDatabase } from "./db.ts";

const registry = FrameworkRegistry.load();
const db = await testDatabase("stream_auth");
const dir = await mkdtemp(join(tmpdir(), "visua-stream-"));
const database = db.dialect === "sqlite" ? join(dir, "shared.db") : db.url;
const a = await createService({ database, registry });
const b = await createService({ database, registry });
const authA = new AuthService(a, loadAuthConfig({}));
const authB = new AuthService(b, loadAuthConfig({}));
const profile: OrganizationProfile = { industry: "saas", size: "11-50", dataTypes: [], drivers: [], environments: ["cloud"], maturityTier: 1, guidance: "guided", securityTeamSize: 1 };
let sequence = 0;

afterAll(async () => {
  await b.store.close();
  await a.store.close();
  await db.cleanup();
  await rm(dir, { recursive: true, force: true });
});

async function setup() {
  const n = ++sequence;
  const ownerLogin = await authA.devLogin(`owner${n}@stream.example`);
  const owner = (await authA.resolveSession(ownerLogin.token))!;
  const tenant = (await authA.activeTenant(owner))!.tenant;
  const ws = await a.createWorkspace({ name: `Stream ${n}`, tenantId: tenant.id, profile });
  await authB.addMember(tenant.id, { email: `member${n}@stream.example`, role: "viewer" }, owner);
  const memberLogin = await authB.devLogin(`member${n}@stream.example`);
  const member = (await authA.resolveSession(memberLogin.token))!;
  const credential = { kind: "user" as const, value: memberLogin.token };
  const reader = workspaceEventStream({ bus: a.bus, workspaceId: ws.id, authorize: () => authA.assertWorkspaceAccess(credential, member, ws.id, tenant.id), recheckMs: 50 }).getReader();
  expect(new TextDecoder().decode((await reader.read()).value)).toContain("event: ready");
  return { owner, tenant, ws, member, memberLogin, reader };
}

describe("current authorization across two services", () => {
  it.each(["membership", "session", "session expiry", "idle expiry", "disabled user", "workspace deletion", "workspace ownership"])("refuses the next payload after %s changes on B", async (change) => {
    const { owner, tenant, ws, member, reader } = await setup();
    try {
      if (change === "membership") await authB.removeMember(tenant.id, member.id, owner);
      if (change === "session") await authB.endSession(member);
      if (change === "session expiry" && member.kind === "user") await b.store.identity.sessions.update(member.sessionHash, { ...member.session, expiresAt: "2020-01-01T00:00:00.000Z" });
      if (change === "idle expiry" && member.kind === "user") await b.store.identity.sessions.update(member.sessionHash, { ...member.session, lastSeenAt: "2020-01-01T00:00:00.000Z" });
      if (change === "disabled user" && member.kind === "user") await b.store.identity.users.put({ ...member.user, disabled: true });
      if (change === "workspace deletion") await b.deleteWorkspace(ws.id);
      if (change === "workspace ownership") {
        const other = await authB.createTenant("Other owner", (owner.kind === "user" ? owner.user : undefined)!, owner);
        await b.store.workspaces.put({ ...ws, tenantId: other.id });
      }
      a.bus.publish(ws.id, "activity", { id: "must-not-escape" });
      expect(await reader.read()).toEqual({ done: true, value: undefined });
    } finally { await reader.cancel(); }
  });

  it("closes an idle stream when current SSO policy excludes its session", async () => {
    const { owner, tenant, reader } = await setup();
    try {
      await new AuthService(b, { ...authB.config, ssoDomainVerification: "off" }).upsertSsoConnection(tenant.id, {
        name: "Current SSO", issuer: "https://idp.example", clientId: "client", domains: ["stream.example"],
      }, owner);
      await authB.updateTenant(tenant.id, { settings: { requireSso: true } }, owner);
      await new Promise((resolve) => setTimeout(resolve, 100));
      expect(await reader.read()).toEqual({ done: true, value: undefined });
    } finally { await reader.cancel(); }
  });

  it("rechecks token revocation without updating last-used metadata", async () => {
    const { owner, tenant, ws, reader: memberReader } = await setup();
    await memberReader.cancel();
    const { token, record } = await authB.createApiToken(tenant.id, { name: "Stream", role: "viewer" }, owner);
    const principal = (await authA.resolveApiToken(token, { touch: false }))!;
    const reader = workspaceEventStream({ bus: a.bus, workspaceId: ws.id, authorize: () => authA.assertWorkspaceAccess({ kind: "token", value: token }, principal, ws.id, tenant.id), recheckMs: 50 }).getReader();
    try {
      await reader.read();
      await new Promise((resolve) => setTimeout(resolve, 70));
      expect((await b.store.identity.apiTokens.forTenant(tenant.id)).find((t) => t.id === record.id)?.lastUsedAt).toBeUndefined();
      await authB.revokeApiToken(tenant.id, record.id, owner);
      a.bus.publish(ws.id, "activity", { id: "forbidden" });
      expect(await reader.read()).toEqual({ done: true, value: undefined });
    } finally { await reader.cancel(); }
  });

  it("keeps the HTTP route bound to its original session and canonical workspace", async () => {
    const { ws, member, memberLogin, reader: helperReader } = await setup();
    await helperReader.cancel();
    const response = await createApp(a, authA).request(`/api/workspaces/${ws.slug}/events`, { headers: { cookie: `visua_session=${memberLogin.token}` } });
    expect(response.headers.get("content-type")).toBe("text/event-stream");
    const reader = response.body!.getReader();
    try {
      expect(new TextDecoder().decode((await reader.read()).value)).toContain(ws.id);
      await authB.endSession(member);
      a.bus.publish(ws.id, "activity", { id: "forbidden" });
      expect(await reader.read()).toEqual({ done: true, value: undefined });
    } finally { await reader.cancel(); }
  });

  it("does not extend the session idle window on periodic checks", async () => {
    const { member, reader } = await setup();
    try {
      if (member.kind !== "user") throw new Error("Expected a user session");
      const lastSeenAt = new Date(Date.now() - 120_000).toISOString();
      await b.store.identity.sessions.update(member.sessionHash, { ...member.session, lastSeenAt });
      await new Promise((resolve) => setTimeout(resolve, 80));
      expect((await b.store.identity.sessions.get(member.sessionHash))?.lastSeenAt).toBe(lastSeenAt);
    } finally { await reader.cancel(); }
  });

  it.skipIf(db.dialect !== "postgres")("resyncs a still-open browser after its instance's relay is killed", async () => {
    const { ws, tenant, member, memberLogin, reader: helperReader } = await setup();
    await helperReader.cancel();
    const reader = workspaceEventStream({ bus: a.bus, workspaceId: ws.id, authorize: () => authA.assertWorkspaceAccess({ kind: "user", value: memberLogin.token }, member, ws.id, tenant.id) }).getReader();
    try {
      await reader.read();
      // Target only this test service's dedicated LISTEN connection, never another test/schema.
      const killed = await b.store.driver.query<{ killed: boolean }>(
        `SELECT pg_terminate_backend(pid) AS killed FROM pg_stat_activity WHERE datname = current_database() AND application_name = ?`,
        [`visua-events:${a.bus.instanceId}`],
      );
      expect(killed).toEqual([{ killed: true }]);
      b.bus.publish(ws.id, "activity", { id: "missed-while-relay-disconnected" });
      const message = new TextDecoder().decode((await reader.read()).value);
      expect(message).toContain("event: resync");
      expect(message).not.toContain("missed-while-relay-disconnected");
      // A subsequent change is delivered over the same browser stream after recovery.
      b.bus.publish(ws.id, "activity", { id: "after-relay-reconnect" });
      expect(new TextDecoder().decode((await reader.read()).value)).toContain("after-relay-reconnect");
    } finally { await reader.cancel(); }
  });
});
