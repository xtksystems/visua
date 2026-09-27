/**
 * Versioned schema migrations for both backends. Each migration runs once, in
 * order, inside one transaction, under a lock so several instances starting
 * together cannot race. Version 1 is the baseline: it creates the complete
 * schema and upgrades SQLite databases written before migrations existed.
 */
import { randomBytes } from "node:crypto";
import { parseJson, type Dialect, type SqlDriver } from "./driver.ts";

export interface Migration {
  version: number;
  name: string;
  up(db: SqlDriver): Promise<void>;
}

/** Workspace-scoped JSON document tables (id, workspace_id, data, updated_at). */
export const DOCUMENT_TABLES = ["tasks", "evidence", "policies", "risks", "connectors", "check_results", "agent_runs", "proposals", "activity"] as const;

const json = (d: Dialect) => (d === "postgres" ? "JSONB" : "TEXT");

async function columns(db: SqlDriver, table: string): Promise<Set<string>> {
  if (db.dialect === "postgres") {
    const rows = await db.query<{ column_name: string }>(`SELECT column_name FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = ?`, [table]);
    return new Set(rows.map((r) => r.column_name));
  }
  const rows = await db.query<{ name: string }>(`SELECT name FROM pragma_table_info(?)`, [table]);
  return new Set(rows.map((r) => r.name));
}

async function run(db: SqlDriver, statements: string[]): Promise<void> {
  for (const sql of statements) await db.execute(sql);
}

export const DEFAULT_TENANT_ID = "tnt_default";

const baseline: Migration = {
  version: 1,
  name: "baseline schema: tenancy, identity and workspace data",
  async up(db) {
    const J = json(db.dialect);
    // Postgres has no rowid: a serial column keeps insertion order stable for equal timestamps.
    const POS = db.dialect === "postgres" ? ", pos BIGSERIAL" : "";
    const FK = (table: string, column = "id") => `REFERENCES ${table}(${column}) ON DELETE CASCADE`;
    await run(db, [
      // Tenancy & identity
      `CREATE TABLE IF NOT EXISTS tenants (id TEXT PRIMARY KEY, slug TEXT NOT NULL UNIQUE, data ${J} NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL)`,
      `CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE, data ${J} NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL)`,
      `CREATE TABLE IF NOT EXISTS memberships (tenant_id TEXT NOT NULL ${FK("tenants")}, user_id TEXT NOT NULL ${FK("users")}, role TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, PRIMARY KEY (tenant_id, user_id))`,
      `CREATE INDEX IF NOT EXISTS memberships_user ON memberships(user_id)`,
      `CREATE TABLE IF NOT EXISTS identities (issuer TEXT NOT NULL, subject TEXT NOT NULL, user_id TEXT NOT NULL ${FK("users")}, email TEXT, created_at TEXT NOT NULL, last_login_at TEXT, PRIMARY KEY (issuer, subject))`,
      `CREATE INDEX IF NOT EXISTS identities_user ON identities(user_id)`,
      `CREATE TABLE IF NOT EXISTS sessions (id_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL ${FK("users")}, tenant_id TEXT, data ${J} NOT NULL, created_at TEXT NOT NULL, expires_at TEXT NOT NULL, last_seen_at TEXT NOT NULL)`,
      `CREATE INDEX IF NOT EXISTS sessions_user ON sessions(user_id)`,
      `CREATE INDEX IF NOT EXISTS sessions_expiry ON sessions(expires_at)`,
      `CREATE TABLE IF NOT EXISTS api_tokens (id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL ${FK("tenants")}, token_hash TEXT NOT NULL UNIQUE, data ${J} NOT NULL, created_at TEXT NOT NULL, expires_at TEXT, revoked_at TEXT, last_used_at TEXT)`,
      `CREATE INDEX IF NOT EXISTS api_tokens_tenant ON api_tokens(tenant_id)`,
      `CREATE TABLE IF NOT EXISTS sso_connections (id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL ${FK("tenants")}, data ${J} NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL)`,
      `CREATE INDEX IF NOT EXISTS sso_connections_tenant ON sso_connections(tenant_id)`,
      `CREATE TABLE IF NOT EXISTS sso_domains (domain TEXT PRIMARY KEY, connection_id TEXT NOT NULL ${FK("sso_connections")}, tenant_id TEXT NOT NULL)`,
      `CREATE TABLE IF NOT EXISTS login_flows (state_hash TEXT PRIMARY KEY, data ${J} NOT NULL, expires_at TEXT NOT NULL)`,
      // Workspace data
      `CREATE TABLE IF NOT EXISTS workspaces (id TEXT PRIMARY KEY, slug TEXT NOT NULL UNIQUE, data ${J} NOT NULL, updated_at TEXT NOT NULL${POS})`,
      `CREATE TABLE IF NOT EXISTS requirement_states (workspace_id TEXT NOT NULL, node_id TEXT NOT NULL, data ${J} NOT NULL, updated_at TEXT NOT NULL, PRIMARY KEY (workspace_id, node_id))`,
      ...DOCUMENT_TABLES.flatMap((t) => [
        `CREATE TABLE IF NOT EXISTS ${t} (id TEXT PRIMARY KEY, workspace_id TEXT NOT NULL, data ${J} NOT NULL, updated_at TEXT NOT NULL${POS})`,
        `CREATE INDEX IF NOT EXISTS ${t}_ws ON ${t}(workspace_id, updated_at)`,
      ]),
    ]);

    // Columns added since the first release. A fresh database gets them here;
    // a SQLite database written by an earlier Visua version is upgraded in place.
    const ws = await columns(db, "workspaces");
    if (!ws.has("tenant_id")) await db.execute(`ALTER TABLE workspaces ADD COLUMN tenant_id TEXT`);
    if (!ws.has("rev")) await db.execute(`ALTER TABLE workspaces ADD COLUMN rev INTEGER NOT NULL DEFAULT 0`);
    const activity = await columns(db, "activity");
    if (!activity.has("seq")) {
      await db.execute(`ALTER TABLE activity ADD COLUMN seq INTEGER`);
      await db.execute(
        db.dialect === "postgres"
          ? `UPDATE activity SET seq = (data->>'seq')::int WHERE data->>'seq' IS NOT NULL`
          : `UPDATE activity SET seq = json_extract(data, '$.seq') WHERE json_extract(data, '$.seq') IS NOT NULL`,
      );
    }
    await run(db, [
      `CREATE INDEX IF NOT EXISTS workspaces_tenant ON workspaces(tenant_id, updated_at)`,
      // One link per position: the audit chain can never fork.
      `CREATE UNIQUE INDEX IF NOT EXISTS activity_chain ON activity(workspace_id, seq)`,
    ]);

    // Workspaces from before tenancy belong to a default organization.
    const orphans = await db.query<{ n: number }>(`SELECT COUNT(*) AS n FROM workspaces WHERE tenant_id IS NULL`);
    if (Number(orphans[0]?.n ?? 0) > 0) {
      const ts = new Date().toISOString();
      const exists = await db.query(`SELECT id FROM tenants WHERE id = ?`, [DEFAULT_TENANT_ID]);
      if (!exists.length) {
        await db.execute(`INSERT INTO tenants (id, slug, data, created_at, updated_at) VALUES (?, ?, ${db.dialect === "postgres" ? "?::jsonb" : "?"}, ?, ?)`, [
          DEFAULT_TENANT_ID,
          "default",
          JSON.stringify({ id: DEFAULT_TENANT_ID, slug: "default", name: "Default organization", settings: {}, createdAt: ts, updatedAt: ts }),
          ts,
          ts,
        ]);
      }
      await db.execute(`UPDATE workspaces SET tenant_id = ? WHERE tenant_id IS NULL`, [DEFAULT_TENANT_ID]);
    }
  },
};

/**
 * Version 1 created the default organization of an upgraded installation without its
 * settings, and access checks read them: give every organization settings.
 */
const tenantSettings: Migration = {
  version: 2,
  name: "every organization has settings",
  async up(db) {
    await db.execute(
      db.dialect === "postgres"
        ? `UPDATE tenants SET data = jsonb_set(data, '{settings}', '{}'::jsonb) WHERE data->'settings' IS NULL OR jsonb_typeof(data->'settings') <> 'object'`
        : `UPDATE tenants SET data = json_set(data, '$.settings', json('{}')) WHERE json_type(data, '$.settings') IS NULL OR json_type(data, '$.settings') <> 'object'`,
    );
  },
};

/**
 * SSO domains are verified by DNS. Several organizations may claim a domain while it is
 * pending, but only one can hold it verified (a partial unique index), and only verified
 * domains route sign-ins. Domains claimed before this version keep working: they are
 * recorded as verified, method "grandfathered", so no organization is locked out.
 */
const ssoDomainVerification: Migration = {
  version: 3,
  name: "SSO domains verified by DNS; existing claims grandfathered",
  async up(db) {
    const ts = new Date().toISOString();
    const FK = `REFERENCES sso_connections(id) ON DELETE CASCADE`;
    await run(db, [
      `CREATE TABLE sso_domains_v3 (domain TEXT NOT NULL, connection_id TEXT NOT NULL ${FK}, tenant_id TEXT NOT NULL, verified_at TEXT, PRIMARY KEY (domain, connection_id))`,
    ]);
    await db.execute(`INSERT INTO sso_domains_v3 (domain, connection_id, tenant_id, verified_at) SELECT domain, connection_id, tenant_id, ? FROM sso_domains`, [ts]);
    await run(db, [
      `DROP TABLE sso_domains`,
      `ALTER TABLE sso_domains_v3 RENAME TO sso_domains`,
      `CREATE UNIQUE INDEX sso_domains_verified ON sso_domains(domain) WHERE verified_at IS NOT NULL`,
      `CREATE INDEX sso_domains_connection ON sso_domains(connection_id)`,
    ]);
    const cast = db.dialect === "postgres" ? "?::jsonb" : "?";
    for (const row of await db.query<{ id: string; data: unknown }>(`SELECT id, data FROM sso_connections`)) {
      const connection = parseJson<{ domains?: string[]; verification?: Record<string, unknown> }>(row.data);
      const verification = { ...(connection.verification ?? {}) };
      for (const d of connection.domains ?? []) verification[d] ??= { token: randomBytes(16).toString("hex"), verifiedAt: ts, method: "grandfathered" };
      await db.execute(`UPDATE sso_connections SET data = ${cast} WHERE id = ?`, [JSON.stringify({ ...connection, verification }), row.id]);
    }
  },
};

export const MIGRATIONS: Migration[] = [baseline, tenantSettings, ssoDomainVerification];

export async function migrate(driver: SqlDriver): Promise<number[]> {
  await driver.execute(`CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER PRIMARY KEY, name TEXT NOT NULL, applied_at TEXT NOT NULL)`);
  return driver.transaction(async (tx) => {
    await tx.lock("visua:migrations");
    const done = new Set((await tx.query<{ version: number }>(`SELECT version FROM schema_migrations`)).map((r) => Number(r.version)));
    const applied: number[] = [];
    for (const m of MIGRATIONS) {
      if (done.has(m.version)) continue;
      await m.up(tx);
      await tx.execute(`INSERT INTO schema_migrations (version, name, applied_at) VALUES (?, ?, ?)`, [m.version, m.name, new Date().toISOString()]);
      applied.push(m.version);
    }
    return applied;
  });
}
