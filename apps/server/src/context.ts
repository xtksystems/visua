import { resolve } from "node:path";
import { FrameworkRegistry, REPO_ROOT } from "@visua/frameworks";
import { EventBus } from "./bus.ts";
import { PgEventRelay } from "./storage/events.ts";
import { openStore } from "./storage/index.ts";
import { VisuaService } from "./services/visua.ts";
import { createConnectorKinds } from "./connectors/index.ts";

export interface ServiceOptions {
  /** `postgres://…` URL, SQLite file path, or ":memory:" for tests. */
  database?: string;
  registry?: FrameworkRegistry;
  /** Operator policy, independent of persisted tenant connector configuration. */
  connectorRoots?: readonly string[];
}

/** The database URL: VISUA_DATABASE_URL (Postgres or SQLite), then VISUA_DB (SQLite path), then <repo>/data/visua.db. */
export function databaseUrl(env: NodeJS.ProcessEnv = process.env): string {
  return env["VISUA_DATABASE_URL"] || env["VISUA_DB"] || resolve(REPO_ROOT, "data", "visua.db");
}

export async function createService(options: ServiceOptions = {}): Promise<VisuaService> {
  const connectors = options.connectorRoots === undefined ? undefined : createConnectorKinds(options.connectorRoots);
  const url = options.database ?? databaseUrl();
  const store = await openStore(url);
  try {
    const registry = options.registry ?? FrameworkRegistry.load();
    const bus = new EventBus();
    // Several instances on one Postgres database share live events through LISTEN/NOTIFY.
    if (store.dialect === "postgres") await PgEventRelay.start(url, bus, store);
    return new VisuaService(store, registry, bus, connectors);
  } catch (err) {
    await store.close().catch(() => undefined);
    throw err;
  }
}
