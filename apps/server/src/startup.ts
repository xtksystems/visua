import type { AuthService } from "./auth/service.ts";
import type { VisuaService } from "./services/visua.ts";
import { seedDemo } from "./seed/demo.ts";

export function loadStartupConfig(env: NodeJS.ProcessEnv, mode: "dev" | "oidc") {
  const port = Number(env["VISUA_PORT"] ?? 8787);
  if (!Number.isInteger(port) || port < 0 || port > 65535) throw new Error("VISUA_PORT must be an integer between 0 and 65535.");
  const seed = env["VISUA_SEED"];
  if (seed !== undefined && seed !== "0" && seed !== "1") throw new Error("VISUA_SEED must be 0 or 1.");
  const shutdownMs = Number(env["VISUA_SHUTDOWN_MS"] ?? 10_000);
  if (!Number.isInteger(shutdownMs) || shutdownMs < 1) throw new Error("VISUA_SHUTDOWN_MS must be a positive integer.");
  return {
    port,
    hostname: env["VISUA_HOST"]?.trim() || (mode === "dev" ? "127.0.0.1" : "0.0.0.0"),
    seed: seed === "1" || (seed === undefined && mode === "dev" && env["NODE_ENV"] !== "production"),
    shutdownMs,
  };
}

export async function initializeWorkspace(svc: VisuaService, auth: AuthService, seed: boolean): Promise<void> {
  await auth.bootstrap();
  if (seed && (await svc.store.workspaces.list()).length === 0) await seedDemo(svc, auth);
}
