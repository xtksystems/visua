/**
 * Embedded backend on Node's built-in SQLite (node:sqlite): zero native
 * dependencies, ideal for local use, demos and tests. node:sqlite is
 * synchronous; a mutex serializes transactions so statements from concurrent
 * requests never interleave with an open transaction.
 */
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { Mutex, type Row, type SqlDriver } from "./driver.ts";

type Param = null | number | bigint | string | Uint8Array;

function bind(params: unknown[]): Param[] {
  return params.map((p) => {
    if (p === undefined || p === null) return null;
    if (typeof p === "boolean") return p ? 1 : 0;
    if (typeof p === "number" || typeof p === "bigint" || typeof p === "string" || p instanceof Uint8Array) return p;
    return JSON.stringify(p);
  });
}

class SqliteConnection implements SqlDriver {
  readonly dialect = "sqlite" as const;
  protected readonly db: DatabaseSync;
  constructor(db: DatabaseSync) {
    this.db = db;
  }

  async query<R extends Row = Row>(sql: string, params: unknown[] = []): Promise<R[]> {
    return this.db.prepare(sql).all(...bind(params)) as R[];
  }

  async execute(sql: string, params: unknown[] = []): Promise<number> {
    if (!params.length && /;\s*\S/.test(sql.trim())) {
      this.db.exec(sql);
      return 0;
    }
    return Number(this.db.prepare(sql).run(...bind(params)).changes);
  }

  async transaction<T>(fn: (tx: SqlDriver) => Promise<T>): Promise<T> {
    return fn(this);
  }

  async lock(): Promise<void> {
    // Transactions are already serialized by the driver mutex.
  }

  async close(): Promise<void> {
    this.db.close();
  }
}

export class SqliteDriver extends SqliteConnection {
  private readonly mutex = new Mutex();

  constructor(path: string) {
    if (path !== ":memory:") mkdirSync(dirname(path), { recursive: true });
    const db = new DatabaseSync(path);
    db.exec("PRAGMA journal_mode = WAL; PRAGMA synchronous = NORMAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;");
    super(db);
  }

  override async query<R extends Row = Row>(sql: string, params: unknown[] = []): Promise<R[]> {
    const release = await this.mutex.acquire();
    try {
      return await super.query<R>(sql, params);
    } finally {
      release();
    }
  }

  override async execute(sql: string, params: unknown[] = []): Promise<number> {
    const release = await this.mutex.acquire();
    try {
      return await super.execute(sql, params);
    } finally {
      release();
    }
  }

  override async transaction<T>(fn: (tx: SqlDriver) => Promise<T>): Promise<T> {
    const release = await this.mutex.acquire();
    const tx = new SqliteConnection(this.db);
    try {
      this.db.exec("BEGIN IMMEDIATE");
      try {
        const result = await fn(tx);
        this.db.exec("COMMIT");
        return result;
      } catch (err) {
        this.db.exec("ROLLBACK");
        throw err;
      }
    } finally {
      release();
    }
  }
}
