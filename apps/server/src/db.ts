/**
 * Persistence on Node's built-in SQLite (node:sqlite) — zero native
 * dependencies. Entities are stored as JSON documents with indexed columns,
 * which keeps the domain model flexible while remaining transactional.
 */
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { DatabaseSync } from "node:sqlite";
import type {
  ActivityEvent,
  AgentRun,
  CheckResult,
  Connector,
  Evidence,
  Policy,
  Proposal,
  RequirementState,
  Risk,
  Task,
  Workspace,
} from "@visua/core";

type Entity = { id: string; workspaceId: string };

export class Collection<T extends Entity> {
  private readonly db: DatabaseSync;
  readonly table: string;

  constructor(db: DatabaseSync, table: string) {
    this.db = db;
    this.table = table;
    db.exec(`CREATE TABLE IF NOT EXISTS ${table} (
      id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL,
      data TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS ${table}_ws ON ${table}(workspace_id, updated_at);`);
  }

  get(id: string): T | undefined {
    const row = this.db.prepare(`SELECT data FROM ${this.table} WHERE id = ?`).get(id) as { data: string } | undefined;
    return row ? (JSON.parse(row.data) as T) : undefined;
  }

  list(workspaceId: string): T[] {
    const rows = this.db
      .prepare(`SELECT data FROM ${this.table} WHERE workspace_id = ? ORDER BY updated_at ASC`)
      .all(workspaceId) as { data: string }[];
    return rows.map((r) => JSON.parse(r.data) as T);
  }

  /** Most recent first. */
  recent(workspaceId: string, limit: number): T[] {
    const rows = this.db
      .prepare(`SELECT data FROM ${this.table} WHERE workspace_id = ? ORDER BY updated_at DESC LIMIT ?`)
      .all(workspaceId, limit) as { data: string }[];
    return rows.map((r) => JSON.parse(r.data) as T);
  }

  put(entity: T, updatedAt: string = new Date().toISOString()): T {
    this.db
      .prepare(
        `INSERT INTO ${this.table} (id, workspace_id, data, updated_at) VALUES (?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at, workspace_id = excluded.workspace_id`,
      )
      .run(entity.id, entity.workspaceId, JSON.stringify(entity), updatedAt);
    return entity;
  }

  delete(id: string): boolean {
    const r = this.db.prepare(`DELETE FROM ${this.table} WHERE id = ?`).run(id);
    return Number(r.changes) > 0;
  }

  deleteWorkspace(workspaceId: string): void {
    this.db.prepare(`DELETE FROM ${this.table} WHERE workspace_id = ?`).run(workspaceId);
  }

  count(workspaceId: string): number {
    const row = this.db.prepare(`SELECT COUNT(*) AS n FROM ${this.table} WHERE workspace_id = ?`).get(workspaceId) as { n: number };
    return Number(row.n);
  }
}

export class StateTable {
  private readonly db: DatabaseSync;

  constructor(db: DatabaseSync) {
    this.db = db;
    db.exec(`CREATE TABLE IF NOT EXISTS requirement_states (
      workspace_id TEXT NOT NULL,
      node_id TEXT NOT NULL,
      data TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      PRIMARY KEY (workspace_id, node_id)
    );`);
  }

  get(workspaceId: string, nodeId: string): RequirementState | undefined {
    const row = this.db
      .prepare(`SELECT data FROM requirement_states WHERE workspace_id = ? AND node_id = ?`)
      .get(workspaceId, nodeId) as { data: string } | undefined;
    return row ? (JSON.parse(row.data) as RequirementState) : undefined;
  }

  /** All states of a workspace, optionally restricted to one framework id prefix. */
  list(workspaceId: string, frameworkId?: string): RequirementState[] {
    const rows = frameworkId
      ? (this.db
          .prepare(`SELECT data FROM requirement_states WHERE workspace_id = ? AND node_id LIKE ?`)
          .all(workspaceId, `${frameworkId}:%`) as { data: string }[])
      : (this.db.prepare(`SELECT data FROM requirement_states WHERE workspace_id = ?`).all(workspaceId) as { data: string }[]);
    return rows.map((r) => JSON.parse(r.data) as RequirementState);
  }

  put(workspaceId: string, state: RequirementState): RequirementState {
    this.db
      .prepare(
        `INSERT INTO requirement_states (workspace_id, node_id, data, updated_at) VALUES (?, ?, ?, ?)
         ON CONFLICT(workspace_id, node_id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at`,
      )
      .run(workspaceId, state.nodeId, JSON.stringify(state), state.updatedAt);
    return state;
  }

  deleteWorkspace(workspaceId: string): void {
    this.db.prepare(`DELETE FROM requirement_states WHERE workspace_id = ?`).run(workspaceId);
  }
}

export class WorkspaceTable {
  private readonly db: DatabaseSync;

  constructor(db: DatabaseSync) {
    this.db = db;
    db.exec(`CREATE TABLE IF NOT EXISTS workspaces (
      id TEXT PRIMARY KEY,
      slug TEXT UNIQUE NOT NULL,
      data TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );`);
  }

  get(idOrSlug: string): Workspace | undefined {
    const row = this.db.prepare(`SELECT data FROM workspaces WHERE id = ? OR slug = ?`).get(idOrSlug, idOrSlug) as
      | { data: string }
      | undefined;
    return row ? (JSON.parse(row.data) as Workspace) : undefined;
  }

  list(): Workspace[] {
    const rows = this.db.prepare(`SELECT data FROM workspaces ORDER BY updated_at DESC`).all() as { data: string }[];
    return rows.map((r) => JSON.parse(r.data) as Workspace);
  }

  put(ws: Workspace): Workspace {
    this.db
      .prepare(
        `INSERT INTO workspaces (id, slug, data, updated_at) VALUES (?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET slug = excluded.slug, data = excluded.data, updated_at = excluded.updated_at`,
      )
      .run(ws.id, ws.slug, JSON.stringify(ws), ws.updatedAt);
    return ws;
  }

  delete(id: string): void {
    this.db.prepare(`DELETE FROM workspaces WHERE id = ?`).run(id);
  }
}

export class Store {
  readonly db: DatabaseSync;
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
  readonly activity: Collection<ActivityEvent>;

  constructor(path: string) {
    if (path !== ":memory:") mkdirSync(dirname(path), { recursive: true });
    this.db = new DatabaseSync(path);
    this.db.exec("PRAGMA journal_mode = WAL; PRAGMA synchronous = NORMAL; PRAGMA foreign_keys = ON;");
    this.workspaces = new WorkspaceTable(this.db);
    this.states = new StateTable(this.db);
    this.tasks = new Collection<Task>(this.db, "tasks");
    this.evidence = new Collection<Evidence>(this.db, "evidence");
    this.policies = new Collection<Policy>(this.db, "policies");
    this.risks = new Collection<Risk>(this.db, "risks");
    this.connectors = new Collection<Connector>(this.db, "connectors");
    this.checks = new Collection<CheckResult>(this.db, "check_results");
    this.runs = new Collection<AgentRun>(this.db, "agent_runs");
    this.proposals = new Collection<Proposal>(this.db, "proposals");
    this.activity = new Collection<ActivityEvent>(this.db, "activity");
  }

  transaction<R>(fn: () => R): R {
    this.db.exec("BEGIN");
    try {
      const result = fn();
      this.db.exec("COMMIT");
      return result;
    } catch (err) {
      this.db.exec("ROLLBACK");
      throw err;
    }
  }

  deleteWorkspace(id: string): void {
    this.transaction(() => {
      this.states.deleteWorkspace(id);
      for (const c of [this.tasks, this.evidence, this.policies, this.risks, this.connectors, this.checks, this.runs, this.proposals, this.activity]) {
        c.deleteWorkspace(id);
      }
      this.workspaces.delete(id);
    });
  }

  close(): void {
    this.db.close();
  }
}
