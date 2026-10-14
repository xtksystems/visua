/** Per-instance admission and JSON work bounds. Forwarded client addresses are never trusted. */
import type { Context, MiddlewareHandler } from "hono";
import { Diagnostics, processDiagnostics, type RequestCategory } from "./diagnostics.ts";

export interface RequestControlConfig {
  jsonBytes: number;
  bodyTimeoutMs: number;
  jsonConcurrency: number;
  peerPerMinute: number;
  principalPerMinute: number;
  authPerMinute: number;
  publicPerMinute: number;
  maxBuckets: number;
  diagnosticsIntervalMs: number;
}

/** Defaults are conservative local bounds, not distributed quotas or measured capacity targets. */
export function loadRequestControlConfig(env: NodeJS.ProcessEnv = process.env): RequestControlConfig {
  const integer = (key: string, fallback: number, min: number, max: number) => {
    const value = env[key] === undefined ? fallback : Number(env[key]);
    if (!Number.isSafeInteger(value) || value < min || value > max) throw new Error(`${key} must be an integer between ${min} and ${max}.`);
    return value;
  };
  const diagnosticsIntervalMs = integer("VISUA_DIAGNOSTICS_INTERVAL_MS", 60_000, 0, 3_600_000);
  if (diagnosticsIntervalMs > 0 && diagnosticsIntervalMs < 1_000) throw new Error("VISUA_DIAGNOSTICS_INTERVAL_MS must be 0 or at least 1000.");
  return {
    // Existing evidence accepts 2m UTF-16 characters: JSON escapes can require 12m bytes.
    jsonBytes: integer("VISUA_JSON_MAX_BYTES", 16 * 1024 * 1024, 1024, 32 * 1024 * 1024),
    bodyTimeoutMs: integer("VISUA_BODY_TIMEOUT_MS", 30_000, 100, 120_000),
    jsonConcurrency: integer("VISUA_JSON_CONCURRENCY", 4, 1, 32),
    peerPerMinute: integer("VISUA_RATE_PEER_PER_MINUTE", 1200, 1, 100_000),
    principalPerMinute: integer("VISUA_RATE_PRINCIPAL_PER_MINUTE", 600, 1, 100_000),
    authPerMinute: integer("VISUA_RATE_AUTH_PER_MINUTE", 120, 1, 100_000),
    publicPerMinute: integer("VISUA_RATE_PUBLIC_PER_MINUTE", 300, 1, 100_000),
    maxBuckets: integer("VISUA_RATE_MAX_BUCKETS", 10_000, 1, 100_000),
    diagnosticsIntervalMs,
  };
}

export class RequestControlError extends Error {
  readonly status: 400 | 408 | 413 | 429;
  readonly retryAfter?: number;
  constructor(message: string, status: 400 | 408 | 413 | 429, retryAfter?: number) {
    super(message);
    this.status = status;
    this.retryAfter = retryAfter;
  }
}

const readers = new WeakMap<Request, JsonBodyReader>();

export class JsonBodyReader {
  private active = 0;
  private readonly config: RequestControlConfig;
  private readonly diagnostics: Diagnostics;
  constructor(config = loadRequestControlConfig({}), diagnostics = processDiagnostics) {
    this.config = config;
    this.diagnostics = diagnostics;
  }
  async read(request: Request): Promise<unknown> {
    const rejectBody = (message: string, status: 400 | 413): never => {
      this.diagnostics.increment("request.body_rejected");
      void request.body?.cancel().catch(() => undefined);
      throw new RequestControlError(message, status);
    };
    const declared = request.headers.get("content-length");
    if (declared !== null && (!/^\d+$/.test(declared) || !Number.isSafeInteger(Number(declared)))) rejectBody("Invalid request body size.", 400);
    if (declared !== null && Number(declared) > this.config.jsonBytes) rejectBody("The JSON request is too large. Reduce its size or upload evidence as a file.", 413);
    if (this.active >= this.config.jsonConcurrency) {
      this.diagnostics.increment("request.body_busy");
      void request.body?.cancel().catch(() => undefined);
      throw new RequestControlError("Request bodies are busy. Try again shortly.", 429, 1);
    }
    if (!request.body) rejectBody("Request body must be JSON.", 400);
    const reader = request.body!.getReader();
    this.active++;
    this.diagnostics.adjustGauge("request.body_active", 1);
    let timer: ReturnType<typeof setTimeout> | undefined;
    const deadline = performance.now() + this.config.bodyTimeoutMs;
    let timedOut = false;
    const timeoutError = () => {
      if (!timedOut) this.diagnostics.increment("request.body_timeout");
      timedOut = true;
      return new RequestControlError("The request body took too long. Try again.", 408);
    };
    let fail!: (error: RequestControlError) => void;
    const interrupted = new Promise<never>((_, reject) => { fail = reject; });
    const abort = () => {
      fail(new RequestControlError("The request body was interrupted. Try again.", 408));
      void reader.cancel().catch(() => undefined);
    };
    request.signal.addEventListener("abort", abort, { once: true });
    timer = setTimeout(() => {
      fail(timeoutError());
      void reader.cancel().catch(() => undefined);
    }, this.config.bodyTimeoutMs);
    timer.unref?.();
    // A bounded contiguous buffer avoids retaining one object per tiny input chunk.
    let bytes: Uint8Array | undefined;
    let size = 0;
    try {
      const consume = async () => {
        while (true) {
          const chunk = await reader.read();
          // Continuously ready tiny/empty chunks must not starve the timer's deadline.
          if (performance.now() >= deadline) throw timeoutError();
          if (request.signal.aborted) throw new RequestControlError("The request body was interrupted. Try again.", 408);
          if (chunk.done) break;
          size += chunk.value.byteLength;
          if (size > this.config.jsonBytes) throw new RequestControlError("The JSON request is too large. Reduce its size or upload evidence as a file.", 413);
          if (!bytes || bytes.byteLength < size) {
            const larger = new Uint8Array(Math.min(this.config.jsonBytes, Math.max(size, (bytes?.byteLength ?? 32_768) * 2)));
            if (bytes) larger.set(bytes);
            bytes = larger;
          }
          bytes.set(chunk.value, size - chunk.value.byteLength);
        }
      };
      if (request.signal.aborted) abort();
      // One race for the entire read, so tiny chunks do not accumulate promise listeners.
      await Promise.race([consume(), interrupted]);
      if (declared !== null && Number(declared) !== size) throw new RequestControlError("The request body does not match its declared size.", 400);
      try { return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes?.subarray(0, size))); }
      catch { throw new RequestControlError("Request body must be valid JSON.", 400); }
    } catch (error) {
      void reader.cancel().catch(() => undefined);
      if (error instanceof RequestControlError) {
        if (error.status !== 408) this.diagnostics.increment("request.body_rejected");
        throw error;
      }
      throw new RequestControlError("The request body was interrupted. Try again.", 408);
    } finally {
      clearTimeout(timer);
      request.signal.removeEventListener("abort", abort);
      reader.releaseLock();
      this.active--;
      this.diagnostics.adjustGauge("request.body_active", -1);
    }
  }
}

const defaultReader = new JsonBodyReader();
export const readJsonBody = (request: Request): Promise<unknown> => (readers.get(request) ?? defaultReader).read(request);

interface Bucket { tokens: number; at: number; expires: number }
const WINDOW_MS = 60_000;

/** Fixed cardinality; new keys fail closed at capacity rather than evicting live limits. */
export class RateBuckets {
  private readonly buckets = new Map<string, Bucket>();
  private nextCleanup = 0;
  private readonly max: number;
  private readonly now: () => number;
  constructor(max: number, now = Date.now) { this.max = max; this.now = now; }
  get size(): number { return this.buckets.size; }
  cleanup(): void {
    const now = this.now();
    for (const [key, bucket] of this.buckets) if (bucket.expires <= now) this.buckets.delete(key);
    this.nextCleanup = now + WINDOW_MS;
  }
  clear(): void { this.buckets.clear(); }
  take(key: string, limit: number): number {
    const now = this.now();
    if (now >= this.nextCleanup) this.cleanup();
    let bucket = this.buckets.get(key);
    if (!bucket) {
      if (this.buckets.size >= this.max) return 60;
      bucket = { tokens: limit, at: now, expires: now + WINDOW_MS };
      this.buckets.set(key, bucket);
    }
    bucket.tokens = Math.min(limit, bucket.tokens + Math.max(0, now - bucket.at) * limit / WINDOW_MS);
    bucket.at = now;
    bucket.expires = now + WINDOW_MS;
    if (bucket.tokens < 1) return Math.max(1, Math.ceil((1 - bucket.tokens) * WINDOW_MS / limit / 1000));
    bucket.tokens--;
    return 0;
  }
}

/** Only the direct adapter socket is authoritative. A missing socket shares one bounded fallback. */
export function directPeer(env: unknown): string {
  const value = env as { incoming?: { socket?: { remoteAddress?: unknown } } } | undefined;
  const address = value?.incoming?.socket?.remoteAddress;
  return typeof address === "string" && address.length <= 100 ? address : "unavailable";
}

export function requestCategory(path: string): RequestCategory {
  if (path === "/api/health" || path === "/api/ready") return "health";
  if (path.startsWith("/api/auth/")) return "auth";
  if (path.startsWith("/api/trust/")) return "public";
  if (path.startsWith("/api/workspaces")) return "workspace";
  return "other";
}

export class RequestControls {
  readonly config: RequestControlConfig;
  private readonly diagnostics: Diagnostics;
  private readonly rate: RateBuckets;
  private readonly json: JsonBodyReader;
  private readonly timer: ReturnType<typeof setInterval>;
  private readonly signal?: AbortSignal;
  private closed = false;
  constructor(config = loadRequestControlConfig({}), diagnostics = processDiagnostics, signal?: AbortSignal) {
    this.config = config;
    this.diagnostics = diagnostics;
    this.rate = new RateBuckets(config.maxBuckets);
    this.json = new JsonBodyReader(config, diagnostics);
    this.signal = signal;
    this.timer = setInterval(() => { this.rate.cleanup(); this.updateBuckets(); }, WINDOW_MS);
    this.timer.unref?.();
    signal?.addEventListener("abort", this.close, { once: true });
    if (signal?.aborted) this.close();
  }
  private reportedBuckets = 0;
  private updateBuckets() {
    this.diagnostics.adjustGauge("request.rate_buckets", this.rate.size - this.reportedBuckets);
    this.reportedBuckets = this.rate.size;
  }
  close = () => {
    if (this.closed) return;
    this.closed = true;
    clearInterval(this.timer);
    this.signal?.removeEventListener("abort", this.close);
    this.rate.clear();
    this.updateBuckets();
  };
  private admit(c: Context, key: string, limit: number) {
    const retry = this.rate.take(key, limit);
    this.updateBuckets();
    if (!retry) return undefined;
    this.diagnostics.increment("request.rate_limited");
    c.header("Retry-After", String(retry));
    return c.json({ error: "Too many requests. Wait briefly and try again." }, 429);
  }
  beforeAuth(): MiddlewareHandler {
    return async (c, next) => {
      const started = performance.now();
      let status = 500;
      this.diagnostics.adjustGauge("request.active", 1);
      try {
        const category = requestCategory(c.req.path);
        // Health stays observable even when an API client exhausts a shared proxy/peer bucket.
        if (category === "health") { await next(); status = c.res.status; return; }
        if (this.closed) {
          status = 503; return c.json({ error: "Server is stopping" }, 503);
        }
        const peer = directPeer(c.env);
        const refused = this.admit(c, `peer:${peer}`, this.config.peerPerMinute);
        if (refused) { status = 429; return refused; }
        if (category === "auth" || category === "public") {
          const publicRefusal = this.admit(c, `${category}-peer:${peer}`, category === "auth" ? this.config.authPerMinute : this.config.publicPerMinute);
          if (publicRefusal) { status = 429; return publicRefusal; }
        }
        readers.set(c.req.raw, this.json);
        await next();
        status = c.res.status;
      } finally {
        this.diagnostics.adjustGauge("request.active", -1);
        this.diagnostics.request(requestCategory(c.req.path), status, performance.now() - started);
      }
    };
  }
  afterAuth(): MiddlewareHandler {
    return async (c, next) => {
      if (this.closed || requestCategory(c.req.path) === "health") return next();
      const principal = c.get("principal") as { kind: string; id: string } | undefined;
      const category = requestCategory(c.req.path);
      const subject = principal ? `principal:${principal.kind}:${principal.id}` : `peer:${directPeer(c.env)}`;
      const limit = category === "auth" ? this.config.authPerMinute : principal ? this.config.principalPerMinute : this.config.publicPerMinute;
      const refused = this.admit(c, `${category === "auth" ? "auth" : "general"}:${subject}`, limit);
      if (refused) return refused;
      return next();
    };
  }
}
