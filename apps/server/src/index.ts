/**
 * Visua server entry point.
 *   VISUA_PORT (default 8787)
 *   VISUA_DATABASE_URL: postgres://… for PostgreSQL, or a SQLite file path (default <repo>/data/visua.db; VISUA_DB also accepted)
 *   VISUA_AGENT_MODE=auto|claude|offline · VISUA_MODEL (default claude-opus-5)
 *   Sign-in, roles and SSO: see src/auth/config.ts (VISUA_AUTH_MODE, VISUA_PUBLIC_URL, VISUA_OIDC_*, …)
 */
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { claudeEnabled, configuredModel } from "@visua/agents";
import { REPO_ROOT } from "@visua/frameworks";
import { createApp } from "./app.ts";
import { loadAuthConfig } from "./auth/config.ts";
import { AuthService, RECHECK_BATCH } from "./auth/service.ts";
import { startDomainRechecks } from "./auth/recheck-ticker.ts";
import { createService, databaseUrl } from "./context.ts";
import { describeDatabase } from "./storage/index.ts";
import { seedDemo } from "./seed/demo.ts";

const port = Number(process.env["VISUA_PORT"] ?? 8787);
const svc = await createService();
const auth = new AuthService(svc, loadAuthConfig());

if (!svc.registry.indexes.size) {
  console.error("[visua] No framework data found. Run `pnpm ingest` to build it from the local corpus.");
  process.exit(1);
}
if (process.env["VISUA_SEED"] !== "0" && (await svc.store.workspaces.list()).length === 0) {
  console.log("[visua] Seeding the Northwind Health demo workspace…");
  await seedDemo(svc, auth);
}
await auth.bootstrap();
// SSO domains proven by DNS are looked at again; each instance ticks, claims keep them apart.
if (auth.domainRechecksEnabled) {
  startDomainRechecks(async () => {
    while ((await auth.recheckDueDomains()) === RECHECK_BATCH);
  });
}
if (auth.config.mode === "oidc" && !auth.config.platform && !(await svc.store.identity.tenants.count())) {
  console.warn("[visua] No identity provider and no organization: set VISUA_OIDC_* and VISUA_BOOTSTRAP_OWNER_EMAIL to sign in.");
}

const app = createApp(svc, auth);
const webDist = resolve(REPO_ROOT, "apps/web/dist");
if (existsSync(webDist)) {
  // Built assets carry a content hash in their names: they never change under the same URL.
  app.use("/assets/*", async (c, next) => {
    await next();
    if (c.res.ok) c.header("Cache-Control", "public, max-age=31536000, immutable");
  });
  app.use("/*", serveStatic({ root: webDist }));
  app.get("*", serveStatic({ path: resolve(webDist, "index.html") }));
}

serve({ fetch: app.fetch, port }, (info) => {
  console.log(`[visua] API on http://localhost:${info.port} · frameworks: ${[...svc.registry.indexes.keys()].join(", ")}`);
  console.log(`[visua] Agents: ${claudeEnabled() ? `Claude (${configuredModel()})` : "offline playbooks (set ANTHROPIC_API_KEY to enable Claude)"}`);
  console.log(`[visua] Corpus index: ${svc.registry.search.size} passages · crosswalk: ${svc.registry.crosswalk.size} mappings`);
  console.log(`[visua] Storage: ${describeDatabase(databaseUrl())}`);
  console.log(
    `[visua] Sign-in: ${auth.config.mode === "dev" ? "developer mode (password-less personas; never expose this server)" : `OpenID Connect${auth.config.platform ? ` via ${auth.config.platform.issuer}` : ""} + per-organization SSO`}`,
  );
  console.log(`[visua] SSO domain re-checks: ${auth.domainRechecksEnabled ? `every ${auth.config.domainRecheckHours} h, lapse after ${auth.config.domainRecheckGraceDays} days` : "off"}`);
});
