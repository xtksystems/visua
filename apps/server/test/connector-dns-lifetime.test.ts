import { afterEach, describe, expect, it, vi } from "vitest";
import { createConnectorKinds } from "../src/connectors/index.ts";
import { ConnectorCapacityError, withConnectorBudget } from "../src/connectors/limits.ts";
import { connectorRedirect } from "../src/connectors/network.ts";

const fixture = vi.hoisted(() => ({ callbacks: [] as ((error: Error) => void)[] }));
vi.mock("node:dns", async (original) => ({
  ...await original<typeof import("node:dns")>(),
  lookup: (_host: string, _options: unknown, callback: (error: Error) => void) => { fixture.callbacks.push(callback); },
}));

const tick = () => new Promise<void>((resolve) => setImmediate(resolve));
function finishLookups(): void {
  fixture.callbacks.splice(0).forEach((callback) => callback(Object.assign(new Error("fixture DNS finished"), { code: "ENOTFOUND" })));
}
afterEach(async () => { finishLookups(); await tick(); vi.restoreAllMocks(); });

describe("connector resolver lifetime", () => {
  it("retains capacity for cancelled redirect validation lookups", async () => {
    const controllers = Array.from({ length: 4 }, () => new AbortController());
    const pending = controllers.map((controller) => withConnectorBudget((signal) => connectorRedirect(new URL("https://example.com/"), "https://stalled.example/", signal), controller.signal).catch((error: unknown) => error));
    try {
      await vi.waitFor(() => expect(fixture.callbacks).toHaveLength(4));
      controllers.forEach((controller) => controller.abort());
      await Promise.all(pending);
      await tick();
      await expect(withConnectorBudget(async () => "excess")).rejects.toBeInstanceOf(ConnectorCapacityError);
      expect(fixture.callbacks).toHaveLength(4);
    } finally {
      controllers.forEach((controller) => controller.abort());
      await Promise.all(pending);
      finishLookups();
      await tick();
    }
    await expect(withConnectorBudget(async () => "released")).resolves.toBe("released");
  });

  it("retains cancelled slots until each socket lookup physically finishes", async () => {
    const connector = createConnectorKinds([]).find((kind) => kind.kind === "web-posture")!;
    const controllers = Array.from({ length: 4 }, () => new AbortController());
    const pending = controllers.map((controller) => connector.run({ url: "https://stalled.example/" }, controller.signal).catch((error: unknown) => error));
    try {
      await vi.waitFor(() => expect(fixture.callbacks).toHaveLength(4));
      controllers.forEach((controller) => controller.abort());
      await Promise.all(pending);
      await tick();
      for (let retry = 0; retry < 3; retry++) await expect(connector.run({ url: "https://stalled.example/" })).rejects.toBeInstanceOf(ConnectorCapacityError);
      expect(fixture.callbacks).toHaveLength(4);
      fixture.callbacks.shift()!(Object.assign(new Error("one DNS finished"), { code: "ENOTFOUND" }));
      await tick();
      await expect(withConnectorBudget(async () => "one slot released")).resolves.toBe("one slot released");
    } finally {
      controllers.forEach((controller) => controller.abort());
      await Promise.all(pending);
      finishLookups();
      await tick();
    }
    await expect(withConnectorBudget(async () => "all cleaned up")).resolves.toBe("all cleaned up");
  });

  it("retains slots after request and total deadlines while DNS callbacks remain pending", async () => {
    const nativeTimeout = AbortSignal.timeout.bind(AbortSignal);
    const timeout = vi.spyOn(AbortSignal, "timeout").mockImplementation((milliseconds) => nativeTimeout(milliseconds === 30_000 ? 120 : 45));
    const keepAlive = setTimeout(() => {}, 5000);
    const connector = createConnectorKinds([]).find((kind) => kind.kind === "web-posture")!;
    try {
      await Promise.all(Array.from({ length: 4 }, () => connector.run({ url: "https://stalled.example/" }).catch((error: unknown) => error)));
      await tick();
      const outstanding = fixture.callbacks.length;
      expect(outstanding).toBeGreaterThanOrEqual(8);
      for (let retry = 0; retry < 3; retry++) await expect(connector.run({ url: "https://stalled.example/" })).rejects.toBeInstanceOf(ConnectorCapacityError);
      expect(fixture.callbacks).toHaveLength(outstanding);
      expect(timeout).toHaveBeenCalledWith(30_000);
      expect(timeout).toHaveBeenCalledWith(12_000);
    } finally {
      timeout.mockRestore();
      clearTimeout(keepAlive);
      finishLookups();
      await tick();
    }
    await expect(withConnectorBudget(async () => "released")).resolves.toBe("released");
  });
});
