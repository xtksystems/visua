import { expect, it, vi } from "vitest";
import { createConnectorKinds } from "../../../apps/server/src/connectors/index.ts";

const fixture = vi.hoisted(() => ({ callbacks: [] as ((error: Error, addresses?: unknown) => void)[] }));
vi.mock("node:dns", async (original) => ({
  ...await original<typeof import("node:dns")>(),
  lookup: (_host: string, _options: unknown, callback: (error: Error, addresses?: unknown) => void) => {
    fixture.callbacks.push(callback);
  },
}));

it("records outstanding connection-time DNS work across cancelled batches", async () => {
  const connector = createConnectorKinds([]).find(kind => kind.kind === "web-posture")!;
  try {
    for (let wave = 0; wave < 3; wave++) {
      const controllers = Array.from({ length: 4 }, () => new AbortController());
      const pending = controllers.map(controller => connector.run({ url: "https://stalled.review.invalid" }, controller.signal).catch(error => error));
      await vi.waitFor(() => expect(fixture.callbacks).toHaveLength((wave + 1) * 4));
      controllers.forEach(controller => controller.abort());
      await Promise.all(pending);
      await new Promise<void>(resolve => setImmediate(resolve));
    }
    expect(fixture.callbacks).toHaveLength(12);
    // These are the socket lookup callbacks; no simulated lookup has completed.
    console.log("Outstanding DNS lookups after three admitted cancelled batches:", fixture.callbacks.length);
  } finally {
    fixture.callbacks.splice(0).forEach(callback => callback(Object.assign(new Error("review fixture cleanup"), { code: "ENOTFOUND" })));
    await new Promise<void>(resolve => setImmediate(resolve));
  }
});

it("admits further runs after policy deadlines while lookup callbacks remain outstanding", async () => {
  const nativeTimeout = AbortSignal.timeout.bind(AbortSignal);
  const timeout = vi.spyOn(AbortSignal, "timeout").mockImplementation(milliseconds => nativeTimeout(milliseconds === 30_000 ? 120 : 45));
  const connector = createConnectorKinds([]).find(kind => kind.kind === "web-posture")!;
  const keepAlive = setTimeout(() => {}, 5000);
  try {
    const batch = () => Promise.all(Array.from({ length: 4 }, () => connector.run({ url: "https://stalled.review.invalid" }).catch(error => error)));
    await batch();
    await new Promise<void>(resolve => setImmediate(resolve));
    const firstBatchLookups = fixture.callbacks.length;
    expect(firstBatchLookups).toBeGreaterThanOrEqual(8);
    await batch();
    await new Promise<void>(resolve => setImmediate(resolve));
    expect(fixture.callbacks.length).toBeGreaterThanOrEqual(firstBatchLookups + 8);
    expect(timeout).toHaveBeenCalledWith(30_000);
    expect(timeout).toHaveBeenCalledWith(12_000);
    console.log("Outstanding DNS after policy-deadline batches:", fixture.callbacks.length);
  } finally {
    timeout.mockRestore();
    clearTimeout(keepAlive);
    fixture.callbacks.splice(0).forEach(callback => callback(Object.assign(new Error("review fixture cleanup"), { code: "ENOTFOUND" })));
    await new Promise<void>(resolve => setImmediate(resolve));
  }
});
