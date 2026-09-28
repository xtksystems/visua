/**
 * Storage entry point. `VISUA_DATABASE_URL` selects the backend:
 *   postgres://user:pass@host:5432/db   → PostgreSQL (production, multi-instance)
 *   file path or ":memory:"              → embedded SQLite (local use, demos, tests)
 */
import { migrate } from "./migrations.ts";
import { PostgresDriver } from "./postgres.ts";
import { SqliteDriver } from "./sqlite.ts";
import { Store } from "./store.ts";

export { Collection, ActivityLog, StateTable, WorkspaceTable, Store } from "./store.ts";
export type {
  ApiTokenRecord,
  DomainVerification,
  LoginFlow,
  LoginFlows,
  SamlCacheEntry,
  SamlCertificate,
  SamlIdp,
  SamlRequestFlow,
  SamlResultFlow,
  SessionRecord,
  SsoConnection,
  StoredFlow,
} from "./identity.ts";
export { protocolOf } from "./identity.ts";
export { DEFAULT_TENANT_ID } from "./migrations.ts";
export type { Dialect, SqlDriver } from "./driver.ts";

export const isPostgresUrl = (url: string) => /^postgres(ql)?:\/\//i.test(url);

/** Human-readable backend description with credentials removed. */
export function describeDatabase(url: string): string {
  if (!isPostgresUrl(url)) return url === ":memory:" ? "SQLite (in memory)" : `SQLite (${url})`;
  try {
    const u = new URL(url);
    return `PostgreSQL (${u.hostname}${u.port ? `:${u.port}` : ""}${u.pathname})`;
  } catch {
    return "PostgreSQL";
  }
}

export async function openStore(url: string): Promise<Store> {
  const driver = isPostgresUrl(url) ? new PostgresDriver(url) : new SqliteDriver(url);
  try {
    await migrate(driver);
  } catch (err) {
    await driver.close().catch(() => undefined);
    throw err;
  }
  return new Store(driver);
}
