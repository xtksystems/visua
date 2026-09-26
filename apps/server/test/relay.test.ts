/**
 * The Postgres live-event relay, with a fake `pg` client: it must keep
 * reconnecting after failed attempts, and keep NOTIFY payloads under Postgres's
 * 8,000-byte limit however many bytes each character takes.
 */
import { EventEmitter } from "node:events";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const clients: FakeClient[] = [];
let failConnects = 0;

class FakeClient extends EventEmitter {
  listening = false;
  ended = false;
  constructor() {
    super();
    clients.push(this);
  }
  async connect() {
    if (failConnects > 0) {
      failConnects--;
      throw new Error("connect ECONNREFUSED");
    }
  }
  async query(sql: string) {
    if (sql.startsWith("LISTEN")) this.listening = true;
  }
  async end() {
    this.ended = true;
  }
  /** The server drops the connection. */
  drop() {
    this.listening = false;
    this.emit("error", new Error("terminating connection due to administrator command"));
    this.emit("end");
  }
}

vi.mock("pg", () => ({ default: { Client: FakeClient } }));

const { PgEventRelay, compactEvent } = await import("../src/storage/events.ts");
const { EventBus } = await import("../src/bus.ts");

const fakeStore = () => ({
  driver: { query: async () => [{ schema: "public" }], execute: async () => undefined },
  onClose: () => undefined,
});

describe("Postgres event relay", () => {
  beforeEach(() => {
    clients.length = 0;
    failConnects = 0;
    vi.useFakeTimers();
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("keeps reconnecting, with backoff, while the database is unreachable", async () => {
    const relay = await PgEventRelay.start("postgres://fake", new EventBus(), fakeStore() as never);
    expect(clients).toHaveLength(1);
    expect(clients[0]!.listening).toBe(true);
    // The database goes away for a while: the first two attempts fail.
    failConnects = 2;
    clients[0]!.drop();
    await vi.advanceTimersByTimeAsync(1_000);
    expect(clients).toHaveLength(2);
    await vi.advanceTimersByTimeAsync(2_000);
    expect(clients).toHaveLength(3);
    await vi.advanceTimersByTimeAsync(4_000);
    expect(clients).toHaveLength(4);
    expect(clients[3]!.listening).toBe(true);
    // Connected again: a later drop starts over from a short delay.
    clients[3]!.drop();
    await vi.advanceTimersByTimeAsync(1_000);
    expect(clients).toHaveLength(5);
    expect(clients[4]!.listening).toBe(true);
    await relay.close();
    expect(clients[4]!.ended).toBe(true);
    // Closed: no more attempts.
    await vi.advanceTimersByTimeAsync(60_000);
    expect(clients).toHaveLength(5);
  });

  it("fails fast at startup when the database is unreachable, without retrying in the background", async () => {
    failConnects = 1;
    await expect(PgEventRelay.start("postgres://fake", new EventBus(), fakeStore() as never)).rejects.toThrow(/ECONNREFUSED/);
    await vi.advanceTimersByTimeAsync(60_000);
    expect(clients).toHaveLength(1);
  });

  it("sizes NOTIFY payloads in bytes, so text with multibyte characters is compacted", () => {
    // 3,000 “ characters are 3,000 UTF-16 units but 9,000 UTF-8 bytes.
    const summary = "“".repeat(3_000);
    const event = { type: "activity" as const, workspaceId: "ws_1", at: "2026-09-26T00:00:00Z", data: { id: "act_1", summary: "short", detail: summary } };
    const compacted = compactEvent(event);
    expect(compacted.partial).toBe(true);
    expect(Buffer.byteLength(JSON.stringify(compacted), "utf8")).toBeLessThan(8_000);
    const small = { ...event, data: { id: "act_2", summary: "“quoted”" } };
    expect(compactEvent(small)).toBe(small);
  });
});
