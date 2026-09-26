/**
 * Visua server entry point.
 *   VISUA_PORT (default 8787) · VISUA_DB (default <repo>/data/visua.db)
 *   VISUA_AGENT_MODE=auto|claude|offline · VISUA_MODEL (default claude-opus-5)
 */
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { claudeEnabled, configuredModel } from "@visua/agents";
import { REPO_ROOT } from "@visua/frameworks";
import { createApp } from "./app.ts";
import { createService } from "./context.ts";
import { seedDemo } from "./seed/demo.ts";

const port = Number(process.env["VISUA_PORT"] ?? 8787);
const svc = createService();

if (!svc.registry.indexes.size) {
  console.error("[visua] No framework data found. Run `pnpm ingest` to build it from the local corpus.");
  process.exit(1);
}
if (process.env["VISUA_SEED"] !== "0" && svc.store.workspaces.list().length === 0) {
  console.log("[visua] Seeding the Northwind Health demo workspace…");
  await seedDemo(svc);
}

const app = createApp(svc);
const webDist = resolve(REPO_ROOT, "apps/web/dist");
if (existsSync(webDist)) {
  app.use("/*", serveStatic({ root: webDist }));
  app.get("*", serveStatic({ path: resolve(webDist, "index.html") }));
}

serve({ fetch: app.fetch, port }, (info) => {
  console.log(`[visua] API on http://localhost:${info.port} · frameworks: ${[...svc.registry.indexes.keys()].join(", ")}`);
  console.log(`[visua] Agents: ${claudeEnabled() ? `Claude (${configuredModel()})` : "offline playbooks (set ANTHROPIC_API_KEY to enable Claude)"}`);
  console.log(`[visua] Corpus index: ${svc.registry.search.size} passages · crosswalk: ${svc.registry.crosswalk.size} mappings`);
});
