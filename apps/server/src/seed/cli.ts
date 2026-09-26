/** Re-create the demo workspace: `pnpm --filter @visua/server seed [--reset]`. */
import { loadAuthConfig } from "../auth/config.ts";
import { AuthService } from "../auth/service.ts";
import { createService } from "../context.ts";
import { seedDemo } from "./demo.ts";

const svc = await createService();
// The workspace belongs to the demo organization, created with its personas when missing.
const auth = new AuthService(svc, loadAuthConfig());
if (process.argv.includes("--reset")) {
  const ws = await svc.store.workspaces.get("northwind-health");
  if (ws) await svc.deleteWorkspace(ws.id, "seed --reset");
}
const id = await seedDemo(svc, auth);
console.log(`[visua] Demo workspace ready: ${id}`);
await svc.store.close();
