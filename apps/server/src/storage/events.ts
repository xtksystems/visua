/**
 * Cross-instance live events on Postgres. Each server instance LISTENs on one
 * channel and NOTIFYs it with every event it publishes, so a browser connected
 * to any instance sees changes made through any other.
 */
import pg from "pg";
import { processDiagnostics as diagnostics } from "../diagnostics.ts";
import type { EventBus, VisuaEvent } from "../bus.ts";
import type { Store } from "./store.ts";

/** Postgres NOTIFY payloads are limited to 8,000 bytes (UTF-8); the envelope adds a few dozen. */
export const EVENT_BYTE_LIMIT = 7_500;
export const RELAY_MAX_QUEUED_EVENTS = 64;
const LIMIT = EVENT_BYTE_LIMIT;
const bytes = (value: unknown) => Buffer.byteLength(JSON.stringify(value), "utf8");

const pick = (o: unknown, keys: string[]) => {
  const src = (o ?? {}) as Record<string, unknown>;
  return Object.fromEntries(keys.filter((k) => src[k] !== undefined).map((k) => [k, src[k]]));
};

/** Large events travel with their identifying fields only; clients refetch what they need. */
export function compactEvent(event: VisuaEvent): VisuaEvent {
  if (bytes(event) <= LIMIT) return event;
  const d = (event.data ?? {}) as Record<string, unknown>;
  const data =
    event.type === "agent.step"
      ? { runId: d["runId"], agent: d["agent"], step: pick(d["step"], ["id", "at", "type", "title", "nodeIds"]) }
      : pick(d, ["id", "runId", "agent", "status", "workspaceId", "nodeId", "connectorId", "title", "summary", "seq"]);
  const small: VisuaEvent = { ...event, data, partial: true };
  if (bytes(small) <= LIMIT) return small;
  const minimal = { type: event.type, workspaceId: event.workspaceId, at: event.at, data: {}, partial: true };
  // Identity fields are server generated; omit all user-controlled identifying fields on fallback.
  return minimal;
}

export class PgEventRelay {
  private client?: pg.Client;
  private closed = false;
  private retry = 0;
  private connectedBefore = false;
  private timer?: ReturnType<typeof setTimeout>;
  private notifyInFlight = false;
  private notifyQueue: string[] = [];
  private pendingResync = false;
  private notifyRetry = 0;
  private notifyTimer?: ReturnType<typeof setTimeout>;
  private readonly connectionString: string;
  private readonly bus: EventBus;
  private readonly store: Store;
  readonly channel: string;

  private constructor(connectionString: string, bus: EventBus, channel: string, store: Store) {
    this.connectionString = connectionString;
    this.bus = bus;
    this.channel = channel;
    this.store = store;
  }

  static async start(connectionString: string, bus: EventBus, store: Store): Promise<PgEventRelay> {
    // One channel per schema, so installations sharing a database stay apart.
    const [row] = await store.driver.query<{ schema: string }>(`SELECT current_schema() AS schema`);
    const schema = (row?.schema ?? "public").toLowerCase().replace(/[^a-z0-9_]/g, "_");
    const relay = new PgEventRelay(connectionString, bus, `visua_events${schema === "public" ? "" : `_${schema}`}`.slice(0, 63), store);
    try {
      await relay.listen();
    } catch (err) {
      await relay.close();
      throw err;
    }
    bus.attachRelay({ send: (event) => relay.send(event) });
    store.onClose(() => relay.close());
    return relay;
  }

  /** Bound first delivery; dropped or failed notifications need canonical refetch, not replay. */
  private send(event: VisuaEvent): void {
    if (this.closed) return;
    if (this.pendingResync) return;
    try {
      if (this.notifyInFlight && this.notifyQueue.length >= RELAY_MAX_QUEUED_EVENTS) throw new Error("Event queue is full");
      const compacted = compactEvent(event);
      if (bytes(compacted) > LIMIT) throw new Error("Event envelope exceeds the byte limit");
      const payload = JSON.stringify({ origin: this.bus.instanceId, event: compacted });
      if (this.notifyInFlight) { this.notifyQueue.push(payload); diagnostics.adjustGauge("relay.queued", 1); }
      else void this.notify(payload, false);
    } catch {
      diagnostics.adjustGauge("relay.queued", -this.notifyQueue.length);
      this.notifyQueue = [];
      this.pendingResync = true;
      this.resyncLater();
    }
  }

  private async notify(payload: string, resync: boolean): Promise<void> {
    if (this.closed) return;
    this.notifyInFlight = true;
    // This control message covers earlier gaps. New changes during its send remain in
    // the bounded queue, or set pendingResync again if that queue overflows.
    if (resync) this.pendingResync = false;
    try {
      // Through the pool, never a caller's transaction. Do not retain any failed event.
      await this.store.driver.execute(`SELECT pg_notify(?, ?)`, [this.channel, payload]);
      this.notifyRetry = 0;
    } catch {
      if (!this.closed) {
        diagnostics.adjustGauge("relay.queued", -this.notifyQueue.length);
      this.notifyQueue = [];
        this.pendingResync = true;
        diagnostics.increment("relay.notify_failed");
        console.error("[visua] event relay: notify failed; scheduling remote resync");
      }
    } finally {
      this.notifyInFlight = false;
      if (!this.closed && !this.pendingResync && this.notifyQueue.length) { diagnostics.adjustGauge("relay.queued", -1); void this.notify(this.notifyQueue.shift()!, false); }
      else this.resyncLater();
    }
  }

  /** A single retry timer and gap bit cover any number of missed events, even without a new write. */
  private resyncLater(): void {
    if (this.closed || !this.pendingResync || this.notifyInFlight || this.notifyTimer) return;
    const delay = Math.min(30_000, 1_000 * 2 ** this.notifyRetry);
    this.notifyRetry = Math.min(5, this.notifyRetry + 1);
    this.notifyTimer = setTimeout(() => {
      this.notifyTimer = undefined;
      if (!this.closed && this.pendingResync) void this.notify(JSON.stringify({ origin: this.bus.instanceId, resync: true }), true);
    }, delay);
    this.notifyTimer.unref?.();
  }

  private async listen(): Promise<void> {
    const client = new pg.Client({ connectionString: this.connectionString, application_name: `visua-events:${this.bus.instanceId}` });
    client.on("notification", (msg) => {
      if (this.closed || msg.channel !== this.channel || !msg.payload) return;
      try {
        const { origin, event, resync } = JSON.parse(msg.payload) as { origin: string; event?: VisuaEvent; resync?: boolean };
        if (origin === this.bus.instanceId) return;
        if (resync === true) { diagnostics.increment("relay.resync"); this.bus.resync(); }
        else if (event) this.bus.deliver(event);
      } catch (err) {
        console.error("[visua] event relay: bad payload", err);
      }
    });
    // A connection that fails or drops, at any point, schedules the next attempt.
    let lost = false;
    const lose = (err?: Error) => {
      if (lost) return;
      lost = true;
      if (this.client === client) this.client = undefined;
      if (this.closed) return;
      if (err) console.error("[visua] event relay: connection lost, reconnecting", err.message);
      this.reconnectLater();
    };
    client.on("error", lose);
    client.on("end", () => lose());
    try {
      await client.connect();
      await client.query(`LISTEN ${this.channel}`);
    } catch (err) {
      lose(err as Error);
      void client.end().catch(() => undefined);
      throw err;
    }
    if (lost) return;
    if (this.closed) {
      void client.end().catch(() => undefined);
      return;
    }
    this.client = client;
    this.retry = 0;
    // LISTEN cannot replay notifications lost during a disconnect. Keep browsers open, but
    // explicitly replace their cached state once this instance can receive new changes again.
    if (this.connectedBefore) { diagnostics.increment("relay.reconnect"); diagnostics.increment("relay.resync"); this.bus.resync(); }
    this.connectedBefore = true;
  }

  /** One pending attempt at a time, backing off up to 30 s, until the relay is closed. */
  private reconnectLater(): void {
    if (this.closed || this.timer) return;
    const delay = Math.min(30_000, 1_000 * 2 ** this.retry++);
    this.timer = setTimeout(() => {
      this.timer = undefined;
      // A failed attempt schedules the next one itself.
      this.listen().catch(() => undefined);
    }, delay);
    this.timer.unref?.();
  }

  async close(): Promise<void> {
    this.closed = true;
    if (this.timer) clearTimeout(this.timer);
    if (this.notifyTimer) clearTimeout(this.notifyTimer);
    this.timer = undefined;
    this.notifyTimer = undefined;
    this.pendingResync = false;
    diagnostics.adjustGauge("relay.queued", -this.notifyQueue.length);
    this.notifyQueue = [];
    const client = this.client;
    this.client = undefined;
    await client?.end().catch(() => undefined);
  }
}
