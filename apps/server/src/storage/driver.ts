/**
 * SQL driver abstraction shared by the SQLite (embedded) and Postgres
 * (production) backends. SQL is written once with `?` placeholders; the
 * Postgres driver rewrites them to `$1…$n`. JSON documents go through
 * `json()` / `parseJson()` so they are TEXT in SQLite and JSONB in Postgres.
 */
import { AsyncLocalStorage } from "node:async_hooks";

export type Dialect = "sqlite" | "postgres";
export type Row = Record<string, unknown>;

export interface SqlDriver {
  readonly dialect: Dialect;
  query<R extends Row = Row>(sql: string, params?: unknown[]): Promise<R[]>;
  execute(sql: string, params?: unknown[]): Promise<number>;
  /** Run `fn` inside one transaction on one connection. */
  transaction<T>(fn: (tx: SqlDriver) => Promise<T>): Promise<T>;
  /** Serialize writers on a named key for the rest of the current transaction. */
  lock(key: string): Promise<void>;
  close(): Promise<void>;
}

/**
 * The active transaction for the current async call chain. Every repository
 * resolves its driver through this, so code deep inside a service call joins
 * the outermost transaction instead of opening (and deadlocking on) another.
 */
export interface TxContext {
  driver: SqlDriver;
  /** Work to run after the outermost transaction commits (e.g. publishing events). */
  afterCommit: (() => void)[];
  /** False once the transaction has ended: late async work then uses the pool again. */
  open: boolean;
}
export const txContext = new AsyncLocalStorage<TxContext>();

/** `?` → `$n` outside of quoted strings. */
export function toPostgresParams(sql: string): string {
  let n = 0;
  let out = "";
  let quote: string | null = null;
  for (const ch of sql) {
    if (quote) {
      if (ch === quote) quote = null;
      out += ch;
    } else if (ch === "'" || ch === '"') {
      quote = ch;
      out += ch;
    } else if (ch === "?") {
      out += `$${++n}`;
    } else out += ch;
  }
  return out;
}

/** Placeholder for a JSON document parameter. */
export const jsonParam = (dialect: Dialect) => (dialect === "postgres" ? "?::jsonb" : "?");

export function parseJson<T>(value: unknown): T {
  return (typeof value === "string" ? JSON.parse(value) : value) as T;
}

/** Minimal async mutex (FIFO). */
export class Mutex {
  private tail: Promise<void> = Promise.resolve();
  acquire(): Promise<() => void> {
    let release!: () => void;
    const next = new Promise<void>((r) => (release = r));
    const ready = this.tail.then(() => release);
    this.tail = this.tail.then(() => next);
    return ready;
  }
}
