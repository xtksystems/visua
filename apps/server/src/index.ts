/** Visua API entry point. Startup settings are documented in README.md. */
import { claudeEnabled, configuredModel } from "@visua/agents";
import { databaseUrl } from "./context.ts";
import { startServer } from "./server.ts";
import { describeDatabase } from "./storage/index.ts";

const { svc, auth, server, config, stop } = await startServer();
const address = server.address();
const port = typeof address === "object" && address ? address.port : config.port;
console.log(`[visua] API on http://${config.hostname}:${port} · frameworks: ${[...svc.registry.indexes.keys()].join(", ")}`);
console.log(`[visua] Agents: ${claudeEnabled() ? `Claude (${configuredModel()})` : "offline playbooks (set ANTHROPIC_API_KEY to enable Claude)"}`);
console.log(`[visua] Corpus index: ${svc.registry.search.size} passages · crosswalk: ${svc.registry.crosswalk.size} mappings`);
console.log(`[visua] Storage: ${describeDatabase(databaseUrl())}`);
console.log(`[visua] Sign-in: ${auth.config.mode === "dev" ? "developer mode (password-less personas; never expose this server)" : `OpenID Connect${auth.config.platform ? ` via ${auth.config.platform.issuer}` : ""} + per-organization SSO`}`);
console.log(`[visua] SSO domain re-checks: ${auth.domainRechecksEnabled ? `every ${auth.config.domainRecheckHours} h, lapse after ${auth.config.domainRecheckGraceDays} days` : "off"}`);
if (auth.config.mode === "oidc" && !auth.config.platform && !(await svc.store.identity.tenants.count())) {
  console.warn("[visua] No identity provider and no organization: set VISUA_OIDC_* and VISUA_BOOTSTRAP_OWNER_EMAIL to sign in.");
}

let stopping = false;
for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => {
    if (stopping) return;
    stopping = true;
    console.log(`[visua] ${signal}: draining requests and background work…`);
    stop().then(
      () => process.exit(0),
      (err: unknown) => {
        console.error("[visua] Shutdown failed", err);
        process.exit(1);
      },
    );
  });
}
