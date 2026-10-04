import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
import { serve } from "../../../../apps/server/node_modules/@hono/node-server/dist/index.mjs";
import { createService } from "../../../../apps/server/src/context.ts";
import { AuthService } from "../../../../apps/server/src/auth/service.ts";
import { loadAuthConfig } from "../../../../apps/server/src/auth/config.ts";
import { seedDemoOrganizations } from "../../../../apps/server/src/seed/demo.ts";

process.env.VISUA_AGENT_MODE = "offline";
const svc = await createService({ database: ":memory:" });
const findings = [];
try {
  const auth = new AuthService(svc, loadAuthConfig({ NODE_ENV: "production", VISUA_PUBLIC_URL: "https://review-fixture.example", VISUA_BOOTSTRAP_OWNER_EMAIL: "bootstrap@review-fixture.example", VISUA_BOOTSTRAP_ORG_NAME: "Review fixture" }));
  await seedDemoOrganizations(auth);
  await auth.bootstrap();
  const user = await svc.store.identity.users.getByEmail("bootstrap@review-fixture.example");
  const memberships = await svc.store.identity.memberships.forUser(user.id);
  assert.equal(memberships.length, 0);
  const tenants = await svc.store.identity.tenants.list();
  assert.equal(tenants.length, 2);
  findings.push({ id: "seed-before-bootstrap", reproduced: true, productionAuthMode: auth.config.mode, demoOrganizations: tenants.length, bootstrapOwnerMemberships: memberships.length, environment: "isolated SQLite memory store; startup identity-seeding order; no live IdP" });
} finally {
  await svc.store.close();
}
assert.equal(loadAuthConfig({}).mode, "dev");
const server = serve({ fetch: () => new Response("isolated fixture"), port: 0 });
await new Promise((resolve) => server.listening ? resolve() : server.once("listening", resolve));
const address = server.address();
assert.ok(["::", "0.0.0.0"].includes(address.address));
await new Promise((resolve) => server.close(resolve));
findings.push({ id: "dev-bind-default", reproduced: true, authModeWithoutEnvironment: "dev", omittedHostnameBinds: address.address, environment: "installed @hono/node-server 2.1.1 with ephemeral port; no application data served" });
const result = { status: "complete", source: "1dc5ed1", command: "node .codex-context/runs/app-review-20261002/evidence/production-bootstrap.mjs", findings, limitations: ["Production sign-in failure inferred from zero membership and finishLogin source; no live production IdP used", "SQLite identity fixture only; no production database changed"] };
writeFileSync(new URL("production-bootstrap.json", import.meta.url), JSON.stringify(result, null, 2) + "\n");
console.log(JSON.stringify(result, null, 2));
