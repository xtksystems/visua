/**
 * Repositories over the SQL driver. Entities are JSON documents with indexed
 * columns, which keeps the domain model flexible while staying transactional
 * on both SQLite and Postgres.
 *
 * Every repository resolves its connection through `store.db()`: inside
 * `store.atomic()` / `store.transaction()` that is the open transaction, so a
 * service method and everything it calls commit or roll back together.
 */
import type { ActivityEvent, AgentRun, CheckResult, Connector, Evidence, Policy, Proposal, RequirementState, Risk, Task, Workspace } from "@visua/core";
import { parseJson, txContext, type Dialect, type SqlDriver, type TxContext } from "./driver.ts";
import { IdentityStore } from "./identity.ts";
import { Repo, type StoreContext } from "./repo.ts";

type Entity = { id: string; workspaceId: string };
type DataRow = { data: unknown };

const CHUNK = 200;
const now = () => new Date().toISOString();

export class Collection<T extends Entity> extends Repo {
  readonly table: string;
  constructor(store: StoreContext, table: string) {
    super(store);
    this.table = table;
  }

  async get(id: string): Promise<T | undefined> {
    const [row] = await this.db.query<DataRow>(`SELECT data FROM ${this.table} WHERE id = ?`, [id]);
    return row ? parseJson<T>(row.data) : undefined;
  }

  async list(workspaceId: string): Promise<T[]> {
    const rows = await this.db.query<DataRow>(`SELECT data FROM ${this.table} WHERE workspace_id = ? ORDER BY updated_at ASC, ${this.pos} ASC`, [workspaceId]);
    return rows.map((r) => parseJson<T>(r.data));
  }

  /** Most recent first. */
  async recent(workspaceId: string, limit: number): Promise<T[]> {
    const rows = await this.db.query<DataRow>(`SELECT data FROM ${this.table} WHERE workspace_id = ? ORDER BY updated_at DESC, ${this.pos} DESC LIMIT ?`, [
      workspaceId,
      Math.max(0, Math.floor(limit)),
    ]);
    return rows.map((r) => parseJson<T>(r.data));
  }

  async put(entity: T, updatedAt: string = now()): Promise<T> {
    await this.db.execute(
      `INSERT INTO ${this.table} (id, workspace_id, data, updated_at) VALUES (?, ?, ${this.J}, ?)
       ON CONFLICT (id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at, workspace_id = excluded.workspace_id`,
      [entity.id, entity.workspaceId, JSON.stringify(entity), updatedAt],
    );
    return entity;
  }

  /**
   * Atomic read-modify-write. The row is locked (Postgres) or the database
   * serialized (SQLite) until the surrounding transaction ends, so concurrent
   * writers never lose each other's updates. Returning `undefined` leaves the
   * row unchanged.
   */
  async update(id: string, fn: (current: T) => T | undefined, updatedAt?: string): Promise<T | undefined> {
    return this.store.atomic(async () => {
      const lock = this.store.dialect === "postgres" ? " FOR UPDATE" : "";
      const [row] = await this.db.query<DataRow>(`SELECT data FROM ${this.table} WHERE id = ?${lock}`, [id]);
      if (!row) return undefined;
      const current = parseJson<T>(row.data);
      const next = fn(current);
      if (!next) return current;
      await this.put(next, updatedAt);
      return next;
    });
  }

  async delete(id: string): Promise<boolean> {
    return (await this.db.execute(`DELETE FROM ${this.table} WHERE id = ?`, [id])) > 0;
  }

  async deleteWorkspace(workspaceId: string): Promise<void> {
    await this.db.execute(`DELETE FROM ${this.table} WHERE workspace_id = ?`, [workspaceId]);
  }

  async count(workspaceId: string): Promise<number> {
    const [row] = await this.db.query<{ n: number }>(`SELECT COUNT(*) AS n FROM ${this.table} WHERE workspace_id = ?`, [workspaceId]);
    return Number(row?.n ?? 0);
  }
}

/** The hash-chained audit trail: append-only, one row per link. */
export class ActivityLog extends Collection<ActivityEvent> {
  constructor(store: StoreContext) {
    super(store, "activity");
  }

  async append(event: ActivityEvent): Promise<ActivityEvent> {
    await this.db.execute(`INSERT INTO activity (id, workspace_id, data, updated_at, seq) VALUES (?, ?, ${this.J}, ?, ?)`, [
      event.id,
      event.workspaceId,
      JSON.stringify(event),
      `${event.at}#${String(event.seq ?? 0).padStart(9, "0")}`,
      event.seq ?? null,
    ]);
    return event;
  }

  /** The last link of the chain. */
  async head(workspaceId: string): Promise<ActivityEvent | undefined> {
    const [row] = await this.db.query<DataRow>(`SELECT data FROM activity WHERE workspace_id = ? AND seq IS NOT NULL ORDER BY seq DESC LIMIT 1`, [workspaceId]);
    return row ? parseJson<ActivityEvent>(row.data) : undefined;
  }

  /** The whole chain in order. */
  async chain(workspaceId: string): Promise<ActivityEvent[]> {
    const rows = await this.db.query<DataRow>(`SELECT data FROM activity WHERE workspace_id = ? ORDER BY seq ASC, updated_at ASC`, [workspaceId]);
    return rows.map((r) => parseJson<ActivityEvent>(r.data));
  }
}

export class StateTable extends Repo {
  async get(workspaceId: string, nodeId: string): Promise<RequirementState | undefined> {
    const [row] = await this.db.query<DataRow>(`SELECT data FROM requirement_states WHERE workspace_id = ? AND node_id = ?`, [workspaceId, nodeId]);
    return row ? parseJson<RequirementState>(row.data) : undefined;
  }

  async getMany(workspaceId: string, nodeIds: Iterable<string>): Promise<Map<string, RequirementState>> {
    const ids = [...new Set(nodeIds)];
    const out = new Map<string, RequirementState>();
    for (let i = 0; i < ids.length; i += CHUNK) {
      const chunk = ids.slice(i, i + CHUNK);
      const rows = await this.db.query<DataRow>(`SELECT data FROM requirement_states WHERE workspace_id = ? AND node_id IN (${chunk.map(() => "?").join(", ")})`, [
        workspaceId,
        ...chunk,
      ]);
      for (const r of rows) {
        const s = parseJson<RequirementState>(r.data);
        out.set(s.nodeId, s);
      }
    }
    return out;
  }

  /** All states of a workspace, optionally restricted to one framework. */
  async list(workspaceId: string, frameworkId?: string): Promise<RequirementState[]> {
    const rows = frameworkId
      ? await this.db.query<DataRow>(`SELECT data FROM requirement_states WHERE workspace_id = ? AND substr(node_id, 1, ?) = ?`, [workspaceId, frameworkId.length + 1, `${frameworkId}:`])
      : await this.db.query<DataRow>(`SELECT data FROM requirement_states WHERE workspace_id = ?`, [workspaceId]);
    return rows.map((r) => parseJson<RequirementState>(r.data));
  }

  /** States of one framework keyed by node id. */
  async map(workspaceId: string, frameworkId?: string): Promise<Map<string, RequirementState>> {
    return new Map((await this.list(workspaceId, frameworkId)).map((s) => [s.nodeId, s]));
  }

  async put(workspaceId: string, state: RequirementState): Promise<RequirementState> {
    await this.putMany(workspaceId, [state]);
    return state;
  }

  async putMany(workspaceId: string, states: RequirementState[]): Promise<void> {
    for (let i = 0; i < states.length; i += CHUNK) {
      const chunk = states.slice(i, i + CHUNK);
      await this.db.execute(
        `INSERT INTO requirement_states (workspace_id, node_id, data, updated_at) VALUES ${chunk.map(() => `(?, ?, ${this.J}, ?)`).join(", ")}
         ON CONFLICT (workspace_id, node_id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at`,
        chunk.flatMap((s) => [workspaceId, s.nodeId, JSON.stringify(s), s.updatedAt]),
      );
    }
  }

  async deleteWorkspace(workspaceId: string): Promise<void> {
    await this.db.execute(`DELETE FROM requirement_states WHERE workspace_id = ?`, [workspaceId]);
  }
}

type WorkspaceRow = { data: unknown; tenant_id: string | null };

export class WorkspaceTable extends Repo {
  private read(row: WorkspaceRow | undefined): Workspace | undefined {
    if (!row) return undefined;
    const ws = parseJson<Workspace>(row.data);
    return row.tenant_id ? { ...ws, tenantId: row.tenant_id } : ws;
  }

  async get(idOrSlug: string): Promise<Workspace | undefined> {
    const [row] = await this.db.query<WorkspaceRow>(`SELECT data, tenant_id FROM workspaces WHERE id = ? OR slug = ?`, [idOrSlug, idOrSlug]);
    return this.read(row);
  }

  /** Workspaces of one tenant (or all of them), most recently updated first. */
  async list(tenantId?: string): Promise<Workspace[]> {
    const rows = tenantId
      ? await this.db.query<WorkspaceRow>(`SELECT data, tenant_id FROM workspaces WHERE tenant_id = ? ORDER BY updated_at DESC, ${this.pos} DESC`, [tenantId])
      : await this.db.query<WorkspaceRow>(`SELECT data, tenant_id FROM workspaces ORDER BY updated_at DESC, ${this.pos} DESC`);
    return rows.map((r) => this.read(r)!);
  }

  async slugTaken(slug: string): Promise<boolean> {
    return (await this.db.query(`SELECT 1 FROM workspaces WHERE slug = ?`, [slug])).length > 0;
  }

  async put(ws: Workspace): Promise<Workspace> {
    await this.db.execute(
      `INSERT INTO workspaces (id, slug, data, updated_at, tenant_id) VALUES (?, ?, ${this.J}, ?, ?)
       ON CONFLICT (id) DO UPDATE SET slug = excluded.slug, data = excluded.data, updated_at = excluded.updated_at, tenant_id = excluded.tenant_id`,
      [ws.id, ws.slug, JSON.stringify(ws), ws.updatedAt, ws.tenantId ?? null],
    );
    return ws;
  }

  async delete(id: string): Promise<void> {
    await this.db.execute(`DELETE FROM workspaces WHERE id = ?`, [id]);
  }

  /** Revision counter: bumped by every audited change, it keys derived caches across instances. */
  async rev(id: string): Promise<number> {
    const [row] = await this.db.query<{ rev: number }>(`SELECT rev FROM workspaces WHERE id = ?`, [id]);
    return Number(row?.rev ?? 0);
  }

  async bump(id: string): Promise<void> {
    await this.db.execute(`UPDATE workspaces SET rev = rev + 1 WHERE id = ?`, [id]);
  }
}

export class Store implements StoreContext {
  readonly driver: SqlDriver;
  readonly workspaces: WorkspaceTable;
  readonly states: StateTable;
  readonly tasks: Collection<Task>;
  readonly evidence: Collection<Evidence>;
  readonly policies: Collection<Policy>;
  readonly risks: Collection<Risk>;
  readonly connectors: Collection<Connector>;
  readonly checks: Collection<CheckResult>;
  readonly runs: Collection<AgentRun>;
  readonly proposals: Collection<Proposal>;
  readonly activity: ActivityLog;
  readonly identity: IdentityStore;
  private savepoints = 0;

  constructor(driver: SqlDriver) {
    this.driver = driver;
    this.workspaces = new WorkspaceTable(this);
    this.states = new StateTable(this);
    this.tasks = new Collection<Task>(this, "tasks");
    this.evidence = new Collection<Evidence>(this, "evidence");
    this.policies = new Collection<Policy>(this, "policies");
    this.risks = new Collection<Risk>(this, "risks");
    this.connectors = new Collection<Connector>(this, "connectors");
    this.checks = new Collection<CheckResult>(this, "check_results");
    this.runs = new Collection<AgentRun>(this, "agent_runs");
    this.proposals = new Collection<Proposal>(this, "proposals");
    this.activity = new ActivityLog(this);
    this.identity = new IdentityStore(this);
  }

  get dialect(): Dialect {
    return this.driver.dialect;
  }

  /** The connection for the current call chain: the open transaction, if any. */
  db(): SqlDriver {
    const ctx = txContext.getStore();
    return ctx?.open ? ctx.driver : this.driver;
  }

  get inTransaction(): boolean {
    return !!txContext.getStore()?.open;
  }

  /** Join the current transaction, or start one. */
  async atomic<T>(fn: () => Promise<T>): Promise<T> {
    return this.inTransaction ? fn() : this.transaction(fn);
  }

  /**
   * Start a transaction; inside one, open a savepoint so a failure rolls back
   * only `fn`'s writes and the caller can recover.
   */
  async transaction<T>(fn: () => Promise<T>): Promise<T> {
    const parent = txContext.getStore();
    if (parent?.open) {
      const name = `visua_sp_${++this.savepoints}`;
      const child: TxContext = { driver: parent.driver, afterCommit: [], open: true };
      await parent.driver.execute(`SAVEPOINT ${name}`);
      try {
        const result = await txContext.run(child, fn);
        await parent.driver.execute(`RELEASE SAVEPOINT ${name}`);
        parent.afterCommit.push(...child.afterCommit);
        return result;
      } catch (err) {
        await parent.driver.execute(`ROLLBACK TO SAVEPOINT ${name}`);
        await parent.driver.execute(`RELEASE SAVEPOINT ${name}`);
        throw err;
      } finally {
        child.open = false;
      }
    }
    const ctx: TxContext = { driver: this.driver, afterCommit: [], open: true };
    const result = await this.driver.transaction((tx) => {
      ctx.driver = tx;
      return txContext.run(ctx, async () => {
        try {
          return await fn();
        } finally {
          ctx.open = false;
        }
      });
    });
    for (const task of ctx.afterCommit) {
      try {
        task();
      } catch (err) {
        console.error("[visua] after-commit task failed", err);
      }
    }
    return result;
  }

  /** Run `fn` once the current transaction commits (immediately outside one); dropped on rollback. */
  afterCommit(fn: () => void): void {
    const ctx = txContext.getStore();
    if (ctx?.open) ctx.afterCommit.push(fn);
    else fn();
  }

  /** Serialize writers on `key` until the current transaction ends (a no-op on SQLite, which serializes all writes). */
  async lock(key: string): Promise<void> {
    await this.db().lock(key);
  }

  async deleteWorkspace(id: string): Promise<void> {
    await this.atomic(async () => {
      await this.states.deleteWorkspace(id);
      for (const c of [this.tasks, this.evidence, this.policies, this.risks, this.connectors, this.checks, this.runs, this.proposals, this.activity]) {
        await c.deleteWorkspace(id);
      }
      await this.workspaces.delete(id);
    });
  }

  async close(): Promise<void> {
    await this.driver.close();
  }
}
