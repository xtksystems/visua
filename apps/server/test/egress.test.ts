import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { guardedFetch, isNonPublicAddress, privateAddressCause, privateHostAllowed, PrivateAddressError, refusedLiteral } from "../src/auth/egress.ts";

describe("non-public addresses", () => {
  it.each([
    "10.1.2.3",
    "127.0.0.1",
    "169.254.169.254",
    "172.20.0.1",
    "192.168.1.1",
    "100.64.0.1",
    "0.0.0.0",
    "224.0.0.1",
    "::1",
    "::",
    "fd12:3456::1",
    "fe80::1",
    "::ffff:10.0.0.1",
    "::ffff:a9fe:a9fe",
    "64:ff9b::7f00:1",
    "2002:c0a8:101::1",
  ])("%s is not public", (address) => {
    expect(isNonPublicAddress(address)).toBe(true);
  });

  it.each(["8.8.8.8", "1.1.1.1", "172.32.0.1", "2606:4700:4700::1111", "::ffff:8.8.8.8", "64:ff9b::808:808"])("%s is public", (address) => {
    expect(isNonPublicAddress(address)).toBe(false);
  });

  it("refuses literal private issuers and localhost when saved, unless the operator allows the host", () => {
    const none = privateHostAllowed([]);
    expect(refusedLiteral(new URL("https://10.0.0.5"), none)).toBe(true);
    expect(refusedLiteral(new URL("https://[fe80::1]/"), none)).toBe(true);
    expect(refusedLiteral(new URL("https://localhost:8443"), none)).toBe(true);
    expect(refusedLiteral(new URL("https://login.example.com"), none)).toBe(false);
    expect(refusedLiteral(new URL("https://10.0.0.5"), privateHostAllowed(["10.0.0.5"]))).toBe(false);
    expect(refusedLiteral(new URL("https://localhost"), privateHostAllowed(["*"]))).toBe(false);
  });
});

describe("guarded fetch", () => {
  let server: Server;
  let port = 0;
  beforeAll(async () => {
    server = createServer((req, res) => {
      if (req.url === "/huge") {
        res.writeHead(200, { "content-type": "application/json" });
        res.end("x".repeat(2 * 1024 * 1024));
        return;
      }
      let body = "";
      req.on("data", (c: Buffer) => (body += c.toString()));
      req.on("end", () => {
        res.writeHead(200, { "content-type": "application/json" });
        res.end(JSON.stringify({ method: req.method, body }));
      });
    });
    await new Promise<void>((r) => server.listen(0, "127.0.0.1", () => r()));
    port = (server.address() as AddressInfo).port;
  });
  afterAll(() => new Promise<void>((r) => server.close(() => r())));

  const options = { method: "GET", headers: {}, body: null, redirect: "manual" as const };

  it("refuses a literal private address unless the operator allows it", async () => {
    const refused = await guardedFetch(privateHostAllowed([]))(`http://127.0.0.1:${port}/`, options).catch((e: unknown) => e);
    expect(refused).toBeInstanceOf(PrivateAddressError);
    const res = await guardedFetch(privateHostAllowed(["127.0.0.1"]))(`http://127.0.0.1:${port}/`, options);
    expect(await res.json()).toEqual({ method: "GET", body: "" });
  });

  it("refuses a name that resolves to a private address, on the addresses the connection would use", async () => {
    // `localhost` is a name, so this goes through the socket's DNS lookup (the rebinding path).
    const refused = await guardedFetch(privateHostAllowed([]))(`http://localhost:${port}/`, options).catch((e: unknown) => e);
    expect(privateAddressCause(refused)).toBeInstanceOf(PrivateAddressError);
    expect(String((refused as Error).message)).toMatch(/localhost is on a private or reserved address/);
    const res = await guardedFetch(privateHostAllowed(["localhost"]))(`http://localhost:${port}/`, { ...options, method: "POST", body: new URLSearchParams({ code: "abc" }) }).catch(
      // On a machine where localhost resolves to ::1 only, the server (on 127.0.0.1) is not there.
      (e: unknown) => e,
    );
    if (res instanceof Response) expect(await res.json()).toEqual({ method: "POST", body: "code=abc" });
    else expect(privateAddressCause(res)).toBeUndefined();
  });

  it("refuses a response larger than an identity provider needs", async () => {
    const err = await guardedFetch(privateHostAllowed(["127.0.0.1"]))(`http://127.0.0.1:${port}/huge`, options).catch((e: unknown) => e);
    expect(String((err as Error).message)).toMatch(/exceeds 1048576 bytes/);
  });
});
