import { describe, expect, it, vi } from "vitest";
import { guardedFetch, guardedLookup, PrivateAddressError, privateAddressCause } from "../src/auth/egress.ts";

const fixture = vi.hoisted(() => ({ answers: [{ address: "127.0.0.1", family: 4 }], calls: 0 }));
vi.mock("node:dns", async (original) => ({
  ...await original<typeof import("node:dns")>(),
  lookup: (_host: string, _options: unknown, callback: (err: Error | null, answers: unknown) => void) => { fixture.calls++; callback(null, fixture.answers); },
}));

describe("connection-time DNS checks", () => {
  it("refuses DNS names in the actual HTTP connection before sending a request", async () => {
    const error = await guardedFetch(() => false, "connector")("http://private.example/", { method: "GET", headers: {}, body: null, redirect: "manual" }).catch((err: unknown) => err);
    expect(privateAddressCause(error)).toBeInstanceOf(PrivateAddressError);
    expect(fixture.calls).toBe(1);
  });

  it("rechecks changing DNS answers and rejects even a mixed result", async () => {
    const lookup = guardedLookup(() => false, "connector");
    const resolve = () => new Promise<unknown>((done) => lookup("changing.example", { all: true }, (err, answers) => done(err ?? answers)));
    fixture.answers = [{ address: "8.8.8.8", family: 4 }];
    expect(await resolve()).toEqual(fixture.answers);
    fixture.answers = [{ address: "8.8.8.8", family: 4 }, { address: "169.254.169.254", family: 4 }];
    expect(await resolve()).toBeInstanceOf(PrivateAddressError);
  });
});
