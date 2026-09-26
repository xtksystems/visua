/** Re-create the demo workspace: `pnpm --filter @visua/server seed [--reset]`. */
import { createService } from "../context.ts";
import { seedDemo } from "./demo.ts";

const svc = createService();
if (process.argv.includes("--reset")) {
  const ws = svc.store.workspaces.get("northwind-health");
  if (ws) svc.store.deleteWorkspace(ws.id);
}
const id = await seedDemo(svc);
console.log(`[visua] Demo workspace ready: ${id}`);
svc.store.close();
