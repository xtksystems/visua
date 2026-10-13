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
    this.listening = false;
  }
  /** The server drops the connection. */
  drop() {
    this.listening = false;
    this.emit("error", new Error("terminating connection due to administrator command"));
    this.emit("end");
  }
}

vi.mock("pg", () => ({ default: { Client: FakeClient } }));

const { PgEventRelay, compactEvent, RELAY_MAX_QUEUED_EVENTS } = await import("../src/storage/events.ts");
const { EventBus } = await import("../src/bus.ts");
const { workspaceEventStream } = await import("../src/workspace-events.ts");

const fakeStore = () => ({
  driver: { query: async () => [{ schema: "public" }], execute: async () => undefined },
  onClose: () => undefined,
});

const notifyingStore = (schema = "public") => {
  const deliver = async (_sql: string, [channel, payload]: string[]) => {
    for (const client of clients) if (client.listening && !client.ended) client.emit("notification", { channel, payload });
    return 1;
  };
  return {
    deliver,
    driver: { query: async () => [{ schema }], execute: vi.fn(deliver) },
    onClose: () => undefined,
  };
};

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
    const bus = new EventBus();
    const resync = vi.fn();
    const unsubscribe = bus.subscribeResync(resync);
    const relay = await PgEventRelay.start("postgres://fake", bus, fakeStore() as never);
    expect(resync).not.toHaveBeenCalled();
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
    expect(resync).toHaveBeenCalledTimes(1);
    // Connected again: a later drop starts over from a short delay.
    clients[3]!.drop();
    await vi.advanceTimersByTimeAsync(1_000);
    expect(clients).toHaveLength(5);
    expect(clients[4]!.listening).toBe(true);
    expect(resync).toHaveBeenCalledTimes(2);
    unsubscribe();
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

  it("repairs a failed publisher notification on still-connected remote browser streams", async () => {
    const a = new EventBus(), b = new EventBus(), otherSchema = new EventBus();
    const publisher = notifyingStore("same_schema");
    const ra = await PgEventRelay.start("postgres://fake", a, publisher as never);
    const rb = await PgEventRelay.start("postgres://fake", b, notifyingStore("same_schema") as never);
    const rc = await PgEventRelay.start("postgres://fake", otherSchema, notifyingStore("other_schema") as never);
    const localResync = vi.fn(), remoteResync = vi.fn(), foreignResync = vi.fn();
    a.subscribeResync(localResync);
    b.subscribeResync(remoteResync);
    otherSchema.subscribeResync(foreignResync);
    const reader = workspaceEventStream({ bus: b, workspaceId: "ws", authorize: async () => {} }).getReader();
    try {
      expect(new TextDecoder().decode((await reader.read()).value)).toContain("event: ready");
      publisher.driver.execute.mockRejectedValueOnce(new Error("single publisher failure"));
      a.publish("ws", "state.updated", { id: "lost-committed-mutation" });
      await vi.advanceTimersByTimeAsync(0);
      a.publish("ws", "activity", { id: "later-unrelated-event" });
      await vi.advanceTimersByTimeAsync(1_000);
      expect(remoteResync).toHaveBeenCalledTimes(1);
      expect(localResync).not.toHaveBeenCalled();
      expect(foreignResync).not.toHaveBeenCalled();
      expect(new TextDecoder().decode((await reader.read()).value)).toContain("event: resync");
      expect(clients).toHaveLength(3);
      expect(clients.every((client) => client.listening)).toBe(true);
      a.publish("ws", "activity", { id: "after-recovery" });
      expect(new TextDecoder().decode((await reader.read()).value)).toContain("after-recovery");
    } finally {
      await reader.cancel();
      await Promise.all([ra.close(), rb.close(), rc.close()]);
    }
    expect(vi.getTimerCount()).toBe(0);
  });

  it("retries a pending gap without new events, with one timer and capped backoff", async () => {
    const a = new EventBus(), b = new EventBus();
    const publisher = notifyingStore();
    publisher.driver.execute.mockRejectedValue(new Error("publisher unavailable"));
    const ra = await PgEventRelay.start("postgres://fake", a, publisher as never);
    const rb = await PgEventRelay.start("postgres://fake", b, notifyingStore() as never);
    const resync = vi.fn();
    b.subscribeResync(resync);
    try {
      a.publish("ws", "state.updated", { id: "missed" });
      await vi.advanceTimersByTimeAsync(0);
      let attempts = 1;
      for (const delay of [1_000, 2_000, 4_000, 8_000, 16_000, 30_000, 30_000]) {
        expect(vi.getTimerCount()).toBe(1);
        for (let n = 0; n < 100; n++) a.publish("ws", "activity", { id: `discarded-${n}` });
        await vi.advanceTimersByTimeAsync(delay - 1);
        expect(publisher.driver.execute).toHaveBeenCalledTimes(attempts);
        await vi.advanceTimersByTimeAsync(1);
        expect(publisher.driver.execute).toHaveBeenCalledTimes(++attempts);
      }
      expect(resync).not.toHaveBeenCalled();
      publisher.driver.execute.mockImplementation(publisher.deliver);
      await vi.advanceTimersByTimeAsync(30_000);
      expect(resync).toHaveBeenCalledTimes(1);
      expect(vi.getTimerCount()).toBe(0);
      expect(clients).toHaveLength(2);
      // Only the initial attempt carried event data. Every retry is the bounded gap signal.
      for (const [, args] of publisher.driver.execute.mock.calls.slice(1)) expect(JSON.parse(args[1]!)).toEqual({ origin: a.instanceId, resync: true });
    } finally { await Promise.all([ra.close(), rb.close()]); }
  });

  it("preserves ordinary event order within the bounded queue", async () => {
    const a = new EventBus(), b = new EventBus();
    const publisher = notifyingStore();
    const ra = await PgEventRelay.start("postgres://fake", a, publisher as never);
    const rb = await PgEventRelay.start("postgres://fake", b, notifyingStore() as never);
    const received: string[] = [];
    b.subscribe("ws", (event) => received.push((event.data as { id: string }).id));
    try {
      for (let n = 0; n <= RELAY_MAX_QUEUED_EVENTS; n++) a.publish("ws", "activity", { id: String(n) });
      await vi.advanceTimersByTimeAsync(0);
      expect(received).toEqual(Array.from({ length: RELAY_MAX_QUEUED_EVENTS + 1 }, (_, n) => String(n)));
      expect(vi.getTimerCount()).toBe(0);
    } finally { await Promise.all([ra.close(), rb.close()]); }
  });

  it("bounds blocked sends and resyncs again if changes overflow during recovery", async () => {
    const a = new EventBus(), b = new EventBus();
    const publisher = notifyingStore();
    let release!: () => void;
    publisher.driver.execute.mockImplementationOnce(() => new Promise<number>((resolve) => { release = () => resolve(1); }));
    const ra = await PgEventRelay.start("postgres://fake", a, publisher as never);
    const rb = await PgEventRelay.start("postgres://fake", b, notifyingStore() as never);
    const resync = vi.fn();
    b.subscribeResync(resync);
    try {
      for (let n = 0; n < RELAY_MAX_QUEUED_EVENTS * 10; n++) a.publish("ws", "activity", { id: String(n), detail: "x".repeat(10_000) });
      expect(publisher.driver.execute).toHaveBeenCalledTimes(1);
      expect(vi.getTimerCount()).toBe(0);
      // Deliver the first resync but hold its completion; changes in that interval require
      // their own delivery or another resync, even if the first control message succeeds.
      let releaseResync!: () => void;
      publisher.driver.execute.mockImplementationOnce(async (sql, args) => {
        await publisher.deliver(sql, args);
        await new Promise<void>((resolve) => { releaseResync = resolve; });
        return 1;
      });
      release();
      await vi.advanceTimersByTimeAsync(1_000);
      expect(resync).toHaveBeenCalledTimes(1);
      for (let n = 0; n <= RELAY_MAX_QUEUED_EVENTS; n++) a.publish("ws", "state.updated", { id: `during-recovery-${n}` });
      expect(publisher.driver.execute).toHaveBeenCalledTimes(2);
      releaseResync();
      await vi.advanceTimersByTimeAsync(1_000);
      expect(resync).toHaveBeenCalledTimes(2);
      expect(publisher.driver.execute).toHaveBeenCalledTimes(3);
      expect(vi.getTimerCount()).toBe(0);
    } finally { await Promise.all([ra.close(), rb.close()]); }
  });

  it.each(["timer", "in-flight failure", "in-flight success"])("close releases pending recovery during %s", async (state) => {
    const bus = new EventBus();
    const publisher = notifyingStore();
    let finish!: () => void;
    if (state === "timer") publisher.driver.execute.mockRejectedValue(new Error("failed"));
    else publisher.driver.execute.mockImplementationOnce(() => new Promise<number>((resolve, reject) => {
      finish = () => state === "in-flight failure" ? reject(new Error("late failure")) : resolve(1);
    }));
    const relay = await PgEventRelay.start("postgres://fake", bus, publisher as never);
    bus.publish("ws", "activity", {});
    bus.publish("ws", "activity", {});
    await vi.advanceTimersByTimeAsync(0);
    await relay.close();
    if (state !== "timer") finish();
    bus.publish("ws", "activity", {});
    await vi.advanceTimersByTimeAsync(60_000);
    expect(publisher.driver.execute).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
    expect(clients[0]!.ended).toBe(true);
  });
});
