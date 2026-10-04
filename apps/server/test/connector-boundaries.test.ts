import { afterEach, describe, expect, it, vi } from "vitest";
import { PrivateAddressError, guardedLookup, privateAddressCause } from "../src/auth/egress.ts";
import { connectorFetch, connectorTlsDetails } from "../src/connectors/network.ts";
import { ConnectorCapacityError, CONNECTOR_CONCURRENCY, withConnectorBudget } from "../src/connectors/limits.ts";
import { webPostureConnector } from "../src/connectors/web-posture.ts";

const fixture = vi.hoisted(() => ({ fetch: vi.fn(), answers: undefined as { address: string; family: number }[] | undefined, lookups: [] as string[] }));
vi.mock("../src/auth/egress.ts", async (original) => ({
  ...await original<typeof import("../src/auth/egress.ts")>(),
  guardedFetch: () => fixture.fetch,
}));
vi.mock("node:dns", async (original) => ({
  ...await original<typeof import("node:dns")>(),
  lookup: (hostname: string, _options: unknown, callback: (err: Error | null, answers: unknown) => void) => {
    fixture.lookups.push(hostname);
    callback(null, fixture.answers ?? [{ address: "8.8.8.8", family: 4 }]);
  },
}));

afterEach(() => { fixture.fetch.mockReset(); fixture.answers = undefined; fixture.lookups = []; });

describe("public-only connector transport", () => {
  it.each(["http://127.0.0.1", "https://169.254.169.254/latest", "https://[::1]", "https://localhost", "https://2130706433", "https://user:secret@example.com", "file:///etc/passwd"])("refuses %s before opening a request", async (url) => {
    await expect(connectorFetch(new URL(url), { follow: true })).rejects.toThrow();
    expect(fixture.fetch).not.toHaveBeenCalled();
  });

  it("checks all DNS answers and rejects mixed public/private answers", async () => {
    fixture.answers = [{ address: "8.8.8.8", family: 4 }, { address: "127.0.0.1", family: 4 }];
    const error = await new Promise<unknown>((resolve) => guardedLookup(() => false, "connector")("mixed.example", { all: true }, (err) => resolve(err)));
    expect(error).toBeInstanceOf(PrivateAddressError);
  });

  it("checks each redirect, preserves relative targets, and reports the final URL", async () => {
    fixture.fetch.mockResolvedValueOnce(new Response(null, { status: 302, headers: { location: "/next" } }))
      .mockResolvedValueOnce(new Response("Contact: mailto:security@example.com"));
    const result = await connectorFetch(new URL("https://example.com/initial"), { follow: true });
    expect(result.url.href).toBe("https://example.com/next");
    expect(fixture.fetch.mock.calls.map(([url]) => url)).toEqual(["https://example.com/initial", "https://example.com/next"]);
    expect(fixture.lookups).toEqual(["example.com"]);
  });

  it.each([true, false])("refuses private redirects even with follow=%s", async (follow) => {
    fixture.fetch.mockResolvedValue(new Response(null, { status: 302, headers: { location: "http://169.254.169.254/latest" } }));
    await expect(connectorFetch(new URL("http://example.com/"), { follow })).rejects.toBeInstanceOf(PrivateAddressError);
    expect(fixture.fetch).toHaveBeenCalledTimes(1);
  });

  it("refuses a redirect hostname resolving privately and does not issue its request", async () => {
    fixture.answers = [{ address: "10.0.0.7", family: 4 }];
    fixture.fetch.mockResolvedValue(new Response(null, { status: 302, headers: { location: "https://internal.example/" } }));
    await expect(connectorFetch(new URL("https://example.com/"), { follow: true })).rejects.toBeInstanceOf(PrivateAddressError);
    expect(fixture.fetch).toHaveBeenCalledTimes(1);
  });

  it("refuses HTTPS downgrade and caps redirect loops", async () => {
    fixture.fetch.mockResolvedValue(new Response(null, { status: 302, headers: { location: "http://example.com/" } }));
    await expect(connectorFetch(new URL("https://example.com/"), { follow: true })).rejects.toThrow(/downgrade/);
    fixture.fetch.mockReset().mockImplementation(() => new Response(null, { status: 302, headers: { location: "/loop" } }));
    await expect(connectorFetch(new URL("https://example.com/"), { follow: true })).rejects.toThrow(/five redirects/);
    expect(fixture.fetch).toHaveBeenCalledTimes(6);
  });

  it("uses the guard in the TLS socket's DNS lookup", async () => {
    fixture.answers = [{ address: "127.0.0.1", family: 4 }];
    const error = await connectorTlsDetails(new URL("https://tls-private.example/")).catch((err: unknown) => err);
    expect(privateAddressCause(error)).toBeInstanceOf(PrivateAddressError);
    expect(fixture.lookups).toContain("tls-private.example");
  });

  it("applies the same boundary to the security.txt fetch", async () => {
    fixture.fetch.mockRejectedValueOnce(new Error("fixture HTTPS unavailable"))
      .mockResolvedValueOnce(new Response(null, { status: 200 }))
      .mockResolvedValueOnce(new Response(null, { status: 302, headers: { location: "https://127.0.0.1/private" } }));
    // TLS uses real sockets but its guarded lookup rejects without connecting.
    fixture.answers = [{ address: "127.0.0.1", family: 4 }];
    const outputs = await webPostureConnector.run({ url: "https://example.com" });
    expect(outputs.find((o) => o.checkId === "security-txt")).toMatchObject({ outcome: "warn", detail: expect.stringContaining("private or reserved") });
    expect(fixture.fetch).toHaveBeenCalledTimes(3);
  });

  it("does not start HTTP or TLS work for a private connector configuration", async () => {
    await expect(webPostureConnector.run({ url: "https://127.0.0.1" })).rejects.toBeInstanceOf(PrivateAddressError);
    expect(fixture.fetch).not.toHaveBeenCalled();
    expect(fixture.lookups).toHaveLength(0);
  });
});

describe("connector capacity and cancellation", () => {
  it("refuses excess work without queueing, and keeps cancelled slots until work stops", async () => {
    let finish!: () => void;
    const underlying = new Promise<void>((resolve) => { finish = resolve; });
    const controllers = Array.from({ length: CONNECTOR_CONCURRENCY }, () => new AbortController());
    const work = vi.fn(() => underlying);
    const pending = controllers.map((c) => withConnectorBudget(work, c.signal).catch((err: unknown) => err));
    await Promise.resolve();
    await expect(withConnectorBudget(work)).rejects.toBeInstanceOf(ConnectorCapacityError);
    controllers.forEach((c) => c.abort());
    await Promise.all(pending);
    await expect(withConnectorBudget(work)).rejects.toBeInstanceOf(ConnectorCapacityError);
    expect(work).toHaveBeenCalledTimes(CONNECTOR_CONCURRENCY);
    finish();
    await new Promise<void>((resolve) => setImmediate(resolve));
    await expect(withConnectorBudget(async () => "freed")).resolves.toBe("freed");
  });

  it("never starts work for an already-aborted caller", async () => {
    const work = vi.fn();
    await expect(withConnectorBudget(work, AbortSignal.abort())).rejects.toThrow();
    expect(work).not.toHaveBeenCalled();
  });

  it("observes cancellation triggered synchronously by the work itself", async () => {
    const controller = new AbortController();
    let finish!: () => void;
    const held = new Promise<void>((resolve) => { finish = resolve; });
    let rejected = false;
    const pending = withConnectorBudget(() => { controller.abort(); return held; }, controller.signal).catch(() => { rejected = true; });
    try {
      await new Promise<void>((resolve) => setImmediate(resolve));
      expect(rejected).toBe(true);
    } finally {
      finish();
      await pending;
      await new Promise<void>((resolve) => setImmediate(resolve));
    }
  });

  it("stops waiting when the total deadline expires and signals underlying work", async () => {
    const nativeTimeout = AbortSignal.timeout.bind(AbortSignal);
    const timeout = vi.spyOn(AbortSignal, "timeout").mockImplementation(() => nativeTimeout(10));
    let finish!: () => void;
    let budget!: AbortSignal;
    const hold = setTimeout(() => {}, 1000);
    try {
      await expect(withConnectorBudget((signal) => {
        budget = signal;
        return new Promise<void>((resolve) => { finish = resolve; });
      })).rejects.toThrow(/timeout/i);
      expect(timeout).toHaveBeenCalledWith(30_000);
      expect(budget.aborted).toBe(true);
    } finally {
      finish();
      timeout.mockRestore();
      clearTimeout(hold);
      await new Promise<void>((resolve) => setImmediate(resolve));
    }
  });
});
