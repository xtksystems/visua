import { afterEach, describe, expect, it, vi } from "vitest";
import { EventBus } from "../src/bus.ts";
import { workspaceEventStream, STREAM_MAX_EVENTS, STREAM_RECHECK_MS } from "../src/workspace-events.ts";

const decode = (value: Uint8Array | undefined) => new TextDecoder().decode(value);
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

describe("bounded workspace delivery", () => {
  it("does not reuse an idle authorization read that began before revocation", async () => {
    vi.useFakeTimers();
    const bus = new EventBus();
    let allowed = true, hold = false;
    let release!: () => void;
    const held = new Promise<void>(resolve => { release = resolve; });
    const authorize = vi.fn(async () => {
      const permitted = allowed;
      if (hold) { hold = false; await held; }
      if (!permitted) throw new Error("revoked");
    });
    const reader = workspaceEventStream({ bus, workspaceId: "ws", authorize }).getReader();
    await reader.read();
    hold = true;
    await vi.advanceTimersByTimeAsync(STREAM_RECHECK_MS);
    expect(authorize).toHaveBeenCalledTimes(2);
    allowed = false;
    bus.publish("ws", "activity", { id: "after-revocation" });
    const next = reader.read();
    release();
    try { expect(await next).toEqual({ done: true, value: undefined }); }
    finally { await reader.cancel(); }
  });

  it("rechecks ready, events and ping; never sends queued data after revocation", async () => {
    vi.useFakeTimers();
    const bus = new EventBus();
    let allowed = true;
    const authorize = vi.fn(async () => { if (!allowed) throw new Error("revoked"); });
    const reader = workspaceEventStream({ bus, workspaceId: "ws", authorize }).getReader();
    expect(decode((await reader.read()).value)).toContain("event: ready");
    bus.publish("ws", "activity", { id: "one" });
    expect(decode((await reader.read()).value)).toContain('"id":"one"');
    await vi.advanceTimersByTimeAsync(STREAM_RECHECK_MS);
    expect(decode((await reader.read()).value)).toContain("event: ping");
    expect(authorize).toHaveBeenCalledTimes(4);
    bus.publish("ws", "activity", { id: "secret" });
    allowed = false;
    expect(await reader.read()).toEqual({ done: true, value: undefined });
    expect(vi.getTimerCount()).toBe(0);
  });

  it("bounds a slow consumer with resync instead of silently dropping changes", async () => {
    const bus = new EventBus();
    const reader = workspaceEventStream({ bus, workspaceId: "ws", authorize: async () => {} }).getReader();
    await reader.read();
    for (let i = 0; i <= STREAM_MAX_EVENTS * 2; i++) bus.publish("ws", "activity", { id: String(i) });
    expect(decode((await reader.read()).value)).toContain("event: resync");
    bus.publish("ws", "activity", { id: "after" });
    expect(decode((await reader.read()).value)).toContain('"id":"after"');
    await reader.cancel();
  });

  it("compacts oversized local payloads and bounds user-controlled identifying fields", async () => {
    const bus = new EventBus();
    const reader = workspaceEventStream({ bus, workspaceId: "ws", authorize: async () => {} }).getReader();
    await reader.read();
    bus.publish("ws", "agent.step", { runId: "x".repeat(50_000), step: { title: "“".repeat(20_000) } });
    const message = (await reader.read()).value!;
    expect(message.byteLength).toBeLessThan(8_000);
    expect(decode(message)).toContain('"partial":true');
    await reader.cancel();
  });

  it("bounds queue bytes before the event-count limit is reached", async () => {
    const bus = new EventBus();
    const reader = workspaceEventStream({ bus, workspaceId: "ws", authorize: async () => {} }).getReader();
    await reader.read();
    for (let i = 0; i < 50; i++) bus.publish("ws", "activity", { id: String(i), summary: "x".repeat(6_000) });
    expect(decode((await reader.read()).value)).toContain("event: resync");
    await reader.cancel();
  });

  it("closes idle streams and removes all subscriptions, timers and signal listeners", async () => {
    vi.useFakeTimers();
    const bus = new EventBus();
    const signal = new AbortController();
    const remove = vi.spyOn(signal.signal, "removeEventListener");
    const unsubEvent = vi.fn();
    const unsubResync = vi.fn();
    vi.spyOn(bus, "subscribe").mockReturnValue(unsubEvent);
    vi.spyOn(bus, "subscribeResync").mockReturnValue(unsubResync);
    let allowed = true;
    const reader = workspaceEventStream({ bus, workspaceId: "ws", signals: [signal.signal], authorize: async () => { if (!allowed) throw new Error("revoked"); } }).getReader();
    await reader.read();
    allowed = false;
    await vi.advanceTimersByTimeAsync(STREAM_RECHECK_MS);
    expect(await reader.read()).toEqual({ done: true, value: undefined });
    expect(unsubEvent).toHaveBeenCalledTimes(1);
    expect(unsubResync).toHaveBeenCalledTimes(1);
    expect(remove).toHaveBeenCalledWith("abort", expect.any(Function));
    expect(vi.getTimerCount()).toBe(0);
  });

  it.each(["abort", "storage failure", "storage timeout"])("fails closed on %s while delivery is pending", async (reason) => {
    vi.useFakeTimers();
    const signal = new AbortController();
    const bus = new EventBus();
    const authorize = reason === "storage failure" ? async () => { throw new Error("unavailable"); } : () => new Promise<void>(() => {});
    const reader = workspaceEventStream({ bus, workspaceId: "ws", authorize, signals: [signal.signal] }).getReader();
    const read = reader.read();
    if (reason === "abort") signal.abort();
    else await vi.advanceTimersByTimeAsync(STREAM_RECHECK_MS);
    expect(await read).toEqual({ done: true, value: undefined });
    expect(vi.getTimerCount()).toBe(0);
  });

  it("resyncs a subscriber whose browser connection stays open during a relay gap", async () => {
    const bus = new EventBus();
    const reader = workspaceEventStream({ bus, workspaceId: "ws", authorize: async () => {} }).getReader();
    await reader.read();
    bus.resync();
    expect(decode((await reader.read()).value)).toContain("event: resync");
    bus.publish("another", "activity", { id: "foreign" });
    bus.publish("ws", "activity", { id: "local" });
    expect(decode((await reader.read()).value)).toContain('"id":"local"');
    await reader.cancel();
  });
});
