import { resolve } from "node:path";
import { FrameworkRegistry, REPO_ROOT } from "@visua/frameworks";
import { EventBus } from "./bus.ts";
import { PgEventRelay } from "./storage/events.ts";
import { openStore } from "./storage/index.ts";
import { VisuaService } from "./services/visua.ts";

export interface ServiceOptions {
  /** `postgres://…` URL, SQLite file path, or ":memory:" for tests. */
  database?: string;
  registry?: FrameworkRegistry;
}

/** The database URL: VISUA_DATABASE_URL (Postgres or SQLite), then VISUA_DB (SQLite path), then <repo>/data/visua.db. */
export function databaseUrl(): string {
  return process.env["VISUA_DATABASE_URL"] || process.env["VISUA_DB"] || resolve(REPO_ROOT, "data", "visua.db");
}

export async function createService(options: ServiceOptions = {}): Promise<VisuaService> {
  const url = options.database ?? databaseUrl();
  const store = await openStore(url);
  const registry = options.registry ?? FrameworkRegistry.load();
  const bus = new EventBus();
  // Several instances on one Postgres database share live events through LISTEN/NOTIFY.
  if (store.dialect === "postgres") await PgEventRelay.start(url, bus, store);
  return new VisuaService(store, registry, bus);
}
