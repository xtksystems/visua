import { afterEach, describe, expect, it, vi } from "vitest";
import { Diagnostics, startDiagnosticsLogging } from "../src/diagnostics.ts";

afterEach(() => vi.useRealTimers());
describe("safe process diagnostics", () => {
  it("keeps fixed categories and combines concurrent gauges without identifiers", () => {
    const diagnostics = new Diagnostics();
    diagnostics.increment("run.started");
    diagnostics.adjustGauge("stream.active", 1);
    diagnostics.adjustGauge("stream.active", 1);
    diagnostics.adjustGauge("stream.active", -1);
    diagnostics.adjustGauge("connector.active", -1);
    diagnostics.setGauge("run.queued", 4);
    diagnostics.observe("connector_ms", 45);
    diagnostics.request("workspace", 403, 80);
    const before = JSON.stringify(diagnostics.snapshot());
    diagnostics.increment("user-secret" as never);
    diagnostics.setGauge("private-evidence" as never, 12);
    diagnostics.observe("https://private/path?token=secret" as never, 100);
    expect(JSON.stringify(diagnostics.snapshot())).toBe(before);
    const value = diagnostics.snapshot();
    expect(value.gauges).toMatchObject({ "stream.active": 1, "connector.active": 0, "run.queued": 4 });
    expect(value.requests["workspace.4xx"]).toBe(1);
    expect(value.histograms["connector_ms"]).toMatchObject({ count: 1, sumMs: 45, buckets: [0, 1, 0, 0, 0, 0, 0, 0] });
    expect(value.gaugeScope["run.queued"]).toContain("Last scheduler observation");
    value.gauges["stream.active"] = 99;
    expect(diagnostics.snapshot().gauges["stream.active"]).toBe(1);
  });

  it("logs only aggregate snapshots and stops its timer", async () => {
    vi.useFakeTimers();
    const diagnostics = new Diagnostics();
    const write = vi.fn();
    const stop = startDiagnosticsLogging(diagnostics, 1000, write);
    diagnostics.request("auth", 429, 5);
    await vi.advanceTimersByTimeAsync(1000);
    expect(write).toHaveBeenCalledTimes(1);
    expect(write.mock.calls[0]![0]).toContain('"auth.4xx":1');
    stop();
    await vi.advanceTimersByTimeAsync(5000);
    expect(write).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
    startDiagnosticsLogging(diagnostics, 0, write)();
    expect(vi.getTimerCount()).toBe(0);
  });
});
