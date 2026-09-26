/**
 * Cross-instance live events on Postgres. Each server instance LISTENs on one
 * channel and NOTIFYs it with every event it publishes, so a browser connected
 * to any instance sees changes made through any other.
 */
import pg from "pg";
import type { EventBus, VisuaEvent } from "../bus.ts";
import type { Store } from "./store.ts";

/** Postgres NOTIFY payloads are limited to 8,000 bytes (UTF-8); the envelope adds a few dozen. */
const LIMIT = 7_500;
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
  return bytes(small) <= LIMIT ? small : { ...event, data: pick(d, ["id"]), partial: true };
}

export class PgEventRelay {
  private client?: pg.Client;
  private closed = false;
  private retry = 0;
  private timer?: ReturnType<typeof setTimeout>;
  private readonly connectionString: string;
  private readonly bus: EventBus;
  readonly channel: string;

  private constructor(connectionString: string, bus: EventBus, channel: string) {
    this.connectionString = connectionString;
    this.bus = bus;
    this.channel = channel;
  }

  static async start(connectionString: string, bus: EventBus, store: Store): Promise<PgEventRelay> {
    // One channel per schema, so installations sharing a database stay apart.
    const [row] = await store.driver.query<{ schema: string }>(`SELECT current_schema() AS schema`);
    const schema = (row?.schema ?? "public").toLowerCase().replace(/[^a-z0-9_]/g, "_");
    const relay = new PgEventRelay(connectionString, bus, `visua_events${schema === "public" ? "" : `_${schema}`}`.slice(0, 63));
    try {
      await relay.listen();
    } catch (err) {
      await relay.close();
      throw err;
    }
    bus.attachRelay({
      send: (event) => {
        const payload = JSON.stringify({ origin: bus.instanceId, event: compactEvent(event) });
        // Through the pool, never a caller's transaction.
        store.driver.execute(`SELECT pg_notify(?, ?)`, [relay.channel, payload]).catch((err: unknown) => console.error("[visua] event relay: notify failed", err));
      },
    });
    store.onClose(() => relay.close());
    return relay;
  }

  private async listen(): Promise<void> {
    const client = new pg.Client({ connectionString: this.connectionString, application_name: "visua-events" });
    client.on("notification", (msg) => {
      if (msg.channel !== this.channel || !msg.payload) return;
      try {
        const { origin, event } = JSON.parse(msg.payload) as { origin: string; event: VisuaEvent };
        if (origin !== this.bus.instanceId) this.bus.deliver(event);
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
    this.timer = undefined;
    const client = this.client;
    this.client = undefined;
    await client?.end().catch(() => undefined);
  }
}
