import { resolve } from "node:path";
import { FrameworkRegistry, REPO_ROOT } from "@visua/frameworks";
import { EventBus } from "./bus.ts";
import { Store } from "./db.ts";
import { VisuaService } from "./services/visua.ts";

export interface ServiceOptions {
  /** SQLite file path, or ":memory:" for tests. */
  database?: string;
  registry?: FrameworkRegistry;
}

export function createService(options: ServiceOptions = {}): VisuaService {
  const database = options.database ?? process.env["VISUA_DB"] ?? resolve(REPO_ROOT, "data", "visua.db");
  const registry = options.registry ?? FrameworkRegistry.load();
  return new VisuaService(new Store(database), registry, new EventBus());
}
