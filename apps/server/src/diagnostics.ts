/** Fixed process aggregates only: never accept identifiers, URLs, error text or content as labels. */
export const DIAGNOSTIC_COUNTERS = [
  "request.body_rejected", "request.body_timeout", "request.body_busy", "request.rate_limited",
  "run.started", "run.completed", "run.failed", "run.cancelled", "run.interrupted", "run.lease_expired",
  "connector.completed", "connector.failed", "connector.timeout", "connector.rejected",
  "stream.opened", "stream.closed", "stream.resync", "stream.overflow", "stream.auth_refused",
  "relay.notify_failed", "relay.reconnect", "relay.resync",
] as const;
export const DIAGNOSTIC_GAUGES = ["request.active", "request.body_active", "request.rate_buckets", "run.queued", "run.running", "connector.active", "stream.active", "stream.queued_bytes", "relay.queued"] as const;
export const DIAGNOSTIC_HISTOGRAMS = ["request_ms", "run_ms", "connector_ms"] as const;
export type DiagnosticCounter = typeof DIAGNOSTIC_COUNTERS[number];
export type DiagnosticGauge = typeof DIAGNOSTIC_GAUGES[number];
export type DiagnosticHistogram = typeof DIAGNOSTIC_HISTOGRAMS[number];
export type RequestCategory = "auth" | "public" | "workspace" | "health" | "other";
const REQUEST_CATEGORIES: RequestCategory[] = ["auth", "public", "workspace", "health", "other"];
const LIMITS = [10, 50, 100, 500, 1_000, 5_000, 30_000];
const zeroes = <T extends string>(keys: readonly T[]) => Object.fromEntries(keys.map((key) => [key, 0])) as Record<T, number>;
const bounded = (value: number) => Math.max(0, Math.min(Number.MAX_SAFE_INTEGER, value));

export class Diagnostics {
  private readonly since = new Date().toISOString();
  private queuedObservedAt: string | null = null;
  private readonly counters = zeroes(DIAGNOSTIC_COUNTERS);
  private readonly gauges = zeroes(DIAGNOSTIC_GAUGES);
  private readonly requests = zeroes(REQUEST_CATEGORIES.flatMap((category) => ["2xx", "3xx", "4xx", "5xx", "other"].map((status) => `${category}.${status}`)));
  private readonly histograms = Object.fromEntries(DIAGNOSTIC_HISTOGRAMS.map((name) => [name, { count: 0, sumMs: 0, buckets: Array<number>(LIMITS.length + 1).fill(0) }])) as Record<DiagnosticHistogram, { count: number; sumMs: number; buckets: number[] }>;

  increment(name: DiagnosticCounter): void {
    if (DIAGNOSTIC_COUNTERS.includes(name)) this.counters[name] = bounded(this.counters[name] + 1);
  }
  setGauge(name: DiagnosticGauge, value: number): void {
    if (DIAGNOSTIC_GAUGES.includes(name) && Number.isFinite(value)) {
      this.gauges[name] = bounded(value);
      if (name === "run.queued") this.queuedObservedAt = new Date().toISOString();
    }
  }
  adjustGauge(name: DiagnosticGauge, delta: number): void {
    if (DIAGNOSTIC_GAUGES.includes(name) && Number.isFinite(delta)) this.setGauge(name, this.gauges[name] + delta);
  }
  observe(name: DiagnosticHistogram, milliseconds: number): void {
    if (!DIAGNOSTIC_HISTOGRAMS.includes(name) || !Number.isFinite(milliseconds)) return;
    const histogram = this.histograms[name];
    const value = bounded(milliseconds);
    const found = LIMITS.findIndex((limit) => value <= limit);
    const index = found < 0 ? LIMITS.length : found;
    histogram.count = bounded(histogram.count + 1);
    histogram.sumMs = bounded(histogram.sumMs + value);
    histogram.buckets[index] = bounded(histogram.buckets[index]! + 1);
  }
  request(category: RequestCategory, status: number, milliseconds: number): void {
    if (!REQUEST_CATEGORIES.includes(category)) return;
    const statusClass = status >= 200 && status < 600 ? `${Math.floor(status / 100)}xx` : "other";
    const key = `${category}.${statusClass}`;
    this.requests[key] = bounded(this.requests[key]! + 1);
    this.observe("request_ms", milliseconds);
  }
  snapshot() {
    return {
      scope: "process" as const, since: this.since,
      gaugeScope: {
        default: "Current resources in this process; concurrent resources adjust a shared aggregate.",
        "run.queued": "Last scheduler observation of queued rows in the connected database; not a current process queue or a live total.",
      },
      databaseQueueObservedAt: this.queuedObservedAt,
      counters: { ...this.counters }, gauges: { ...this.gauges }, requests: { ...this.requests },
      latencyBucketUpperBoundsMs: [...LIMITS, null],
      histograms: Object.fromEntries(DIAGNOSTIC_HISTOGRAMS.map((name) => [name, { ...this.histograms[name], buckets: [...this.histograms[name].buckets] }])),
    };
  }
}

export const processDiagnostics = new Diagnostics();

/** Internal operator log only; no HTTP endpoint and no tenant-visible process data. */
export function startDiagnosticsLogging(diagnostics: Diagnostics, intervalMs: number, write = (line: string) => console.log(line)): () => void {
  if (intervalMs === 0) return () => {};
  const timer = setInterval(() => write(`[visua] diagnostics ${JSON.stringify(diagnostics.snapshot())}`), intervalMs);
  timer.unref?.();
  return () => clearInterval(timer);
}
