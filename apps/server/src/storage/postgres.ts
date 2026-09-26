/**
 * Production backend on PostgreSQL (node-postgres pool). Documents are JSONB;
 * each transaction runs on one pooled client; `lock()` takes a transaction-
 * scoped advisory lock so writers that must be serialized (the hash-chained
 * audit trail) are, even across several server instances.
 */
import pg from "pg";
import { toPostgresParams, type Row, type SqlDriver } from "./driver.ts";

// Keep int8 counters as numbers (they are small: sequence numbers, counts).
pg.types.setTypeParser(20, (v: string) => Number(v));

class PgClientDriver implements SqlDriver {
  readonly dialect = "postgres" as const;
  private readonly client: pg.PoolClient;
  constructor(client: pg.PoolClient) {
    this.client = client;
  }

  async query<R extends Row = Row>(sql: string, params: unknown[] = []): Promise<R[]> {
    const r = await this.client.query(toPostgresParams(sql), params);
    return r.rows as R[];
  }

  async execute(sql: string, params: unknown[] = []): Promise<number> {
    const r = await this.client.query(toPostgresParams(sql), params);
    return r.rowCount ?? 0;
  }

  async transaction<T>(fn: (tx: SqlDriver) => Promise<T>): Promise<T> {
    return fn(this);
  }

  async lock(key: string): Promise<void> {
    await this.client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [key]);
  }

  async close(): Promise<void> {
    // Pooled clients are released by the pool driver.
  }
}

export class PostgresDriver implements SqlDriver {
  readonly dialect = "postgres" as const;
  readonly pool: pg.Pool;

  constructor(connectionString: string, options: { max?: number } = {}) {
    this.pool = new pg.Pool({ connectionString, max: options.max ?? 10, application_name: "visua" });
  }

  async query<R extends Row = Row>(sql: string, params: unknown[] = []): Promise<R[]> {
    const r = await this.pool.query(toPostgresParams(sql), params);
    return r.rows as R[];
  }

  async execute(sql: string, params: unknown[] = []): Promise<number> {
    const r = await this.pool.query(toPostgresParams(sql), params);
    return r.rowCount ?? 0;
  }

  async transaction<T>(fn: (tx: SqlDriver) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      try {
        const result = await fn(new PgClientDriver(client));
        await client.query("COMMIT");
        return result;
      } catch (err) {
        await client.query("ROLLBACK");
        throw err;
      }
    } finally {
      client.release();
    }
  }

  async lock(key: string): Promise<void> {
    // Outside a transaction an advisory xact lock is released immediately; callers lock inside transactions.
    await this.pool.query("SELECT pg_advisory_xact_lock(hashtext($1))", [key]);
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}
