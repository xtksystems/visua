/** Bounded, pull-driven SSE. Event IDs are ephemeral; gaps always require a full refetch. */
import { processDiagnostics as diagnostics } from "./diagnostics.ts";
import type { EventBus } from "./bus.ts";
import { compactEvent, EVENT_BYTE_LIMIT } from "./storage/events.ts";

export const STREAM_RECHECK_MS = 5_000;
export const STREAM_MAX_EVENTS = 128;
export const STREAM_MAX_BYTES = 256 * 1024;

interface Message { event: string; data: string }

export function workspaceEventStream(options: {
  bus: EventBus;
  workspaceId: string;
  authorize: () => Promise<void>;
  signals?: (AbortSignal | undefined)[];
  stopping?: boolean;
  /** Shorter intervals are useful for deterministic idle/revocation tests. */
  recheckMs?: number;
}): ReadableStream<Uint8Array> {
  const { bus, workspaceId, authorize } = options;
  const signals = options.signals?.filter((s): s is AbortSignal => !!s) ?? [];
  const interval = options.recheckMs ?? STREAM_RECHECK_MS;
  const encoder = new TextEncoder();
  let queue: Message[] = [];
  let queuedBytes = 0;
  let ready = true;
  let resync = false;
  let ping = false;
  let closed = false;
  let wake: (() => void) | undefined;
  let controller: ReadableStreamDefaultController<Uint8Array>;
  let timer: ReturnType<typeof setInterval> | undefined;
  let authTimer: ReturnType<typeof setTimeout> | undefined;
  let checking: Promise<boolean> | undefined;
  let stopCheck: (() => void) | undefined;
  let unsubscribe = () => {};
  let unsubscribeResync = () => {};
  const finish = (closeReadable: boolean) => {
    if (closed) return;
    closed = true;
    diagnostics.increment("stream.closed");
    diagnostics.adjustGauge("stream.active", -1);
    diagnostics.adjustGauge("stream.queued_bytes", -queuedBytes);
    queue = [];
    queuedBytes = 0;
    unsubscribe();
    unsubscribeResync();
    if (timer) clearInterval(timer);
    if (authTimer) clearTimeout(authTimer);
    for (const signal of signals) signal.removeEventListener("abort", close);
    wake?.();
    wake = undefined;
    stopCheck?.();
    stopCheck = undefined;
    if (closeReadable) controller.close();
  };
  const close = () => finish(true);
  const check = (fresh = false): Promise<boolean> => {
    if (closed) return Promise.resolve(false);
    // A periodic check may have read access before a remote revocation. Delivery
    // waits for it, then starts its own read; it cannot reuse that older answer.
    if (checking) return fresh ? checking.then(allowed => allowed && !closed ? check(true) : false) : checking;
    // One in-flight read at most, including while storage stalls. Its result can never
    // resume delivery after the stream has closed; no transaction spans enqueue/network IO.
    const timeout = new Promise<false>((resolve) => {
      stopCheck = () => resolve(false);
      authTimer = setTimeout(close, STREAM_RECHECK_MS);
      authTimer.unref?.();
    });
    checking = Promise.race([
      Promise.resolve().then(authorize).then(() => !closed, () => { diagnostics.increment("stream.auth_refused"); close(); return false; }),
      timeout,
    ]).finally(() => {
      if (authTimer) clearTimeout(authTimer);
      authTimer = undefined;
      checking = undefined;
      stopCheck = undefined;
    });
    return checking;
  };
  const requestResync = () => {
    if (closed) return;
    diagnostics.increment("stream.resync");
    diagnostics.adjustGauge("stream.queued_bytes", -queuedBytes);
    queue = [];
    queuedBytes = 0;
    resync = true;
    wake?.();
  };
  return new ReadableStream<Uint8Array>({
    start(c) {
      controller = c;
      diagnostics.increment("stream.opened");
      diagnostics.adjustGauge("stream.active", 1);
      unsubscribe = bus.subscribe(workspaceId, (event) => {
        if (closed || resync) return;
        try {
          const data = JSON.stringify(compactEvent(event));
          const size = Buffer.byteLength(data, "utf8");
          if (size > EVENT_BYTE_LIMIT || queue.length >= STREAM_MAX_EVENTS || queuedBytes + size > STREAM_MAX_BYTES) { diagnostics.increment("stream.overflow"); return requestResync(); }
          queue.push({ event: "visua", data });
          queuedBytes += size;
          diagnostics.adjustGauge("stream.queued_bytes", size);
          wake?.();
        } catch { requestResync(); }
      });
      unsubscribeResync = bus.subscribeResync(requestResync);
      for (const signal of signals) signal.addEventListener("abort", close, { once: true });
      if (options.stopping || signals.some((signal) => signal.aborted)) return close();
      timer = setInterval(() => {
        void check().then((allowed) => {
          if (!allowed || closed) return;
          ping = true;
          wake?.();
        });
      }, interval);
      timer.unref?.();
    },
    async pull() {
      if (!closed && !ready && !resync && !queue.length && !ping) {
        await new Promise<void>((resolve) => { wake = resolve; });
        wake = undefined;
      }
      if (closed || !await check(true) || closed) return;
      let message: Message | undefined;
      if (ready) {
        ready = false;
        message = { event: "ready", data: JSON.stringify({ workspaceId }) };
      } else if (resync) {
        resync = false;
        message = { event: "resync", data: JSON.stringify({ workspaceId }) };
      } else if (queue.length) {
        message = queue.shift()!;
        const size = Buffer.byteLength(message.data, "utf8");
        queuedBytes -= size;
        diagnostics.adjustGauge("stream.queued_bytes", -size);
      } else if (ping) message = { event: "ping", data: String(Date.now()) };
      ping = false;
      if (message) controller.enqueue(encoder.encode(`event: ${message.event}\ndata: ${message.data}\n\n`));
    },
    cancel() { finish(false); },
  }, { highWaterMark: 0 });
}
