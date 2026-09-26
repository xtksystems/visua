import type { Dialect, SqlDriver } from "./driver.ts";

/** What a repository needs from the store: the current connection and transactions. */
export interface StoreContext {
  readonly dialect: Dialect;
  db(): SqlDriver;
  atomic<T>(fn: () => Promise<T>): Promise<T>;
}

export abstract class Repo {
  protected readonly store: StoreContext;
  constructor(store: StoreContext) {
    this.store = store;
  }
  protected get db(): SqlDriver {
    return this.store.db();
  }
  /** Placeholder for a JSON document parameter. */
  protected get J(): string {
    return this.store.dialect === "postgres" ? "?::jsonb" : "?";
  }
  /** Stable insertion order for rows with equal timestamps. */
  protected get pos(): string {
    return this.store.dialect === "postgres" ? "pos" : "rowid";
  }
}
