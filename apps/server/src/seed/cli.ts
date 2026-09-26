/** Re-create the demo workspace: `pnpm --filter @visua/server seed [--reset]`. */
import { createService } from "../context.ts";
import { seedDemo } from "./demo.ts";

const svc = await createService();
if (process.argv.includes("--reset")) {
  const ws = await svc.store.workspaces.get("northwind-health");
  if (ws) await svc.deleteWorkspace(ws.id);
}
const id = await seedDemo(svc);
console.log(`[visua] Demo workspace ready: ${id}`);
await svc.store.close();
