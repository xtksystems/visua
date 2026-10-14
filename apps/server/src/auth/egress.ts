/**
 * Outbound requests to identity providers that organizations choose.
 *
 * An organization's owner picks its SSO connection's issuer, and the server then fetches
 * that issuer's discovery document and the token and key endpoints it names. Left open,
 * that lets a tenant make the server call addresses on its own network (cloud metadata,
 * admin consoles, databases). Requests for organization connections therefore go through
 * `guardedFetch`, which refuses private, loopback, link-local and other non-public
 * addresses unless the operator allows the host (VISUA_OIDC_PRIVATE_ISSUERS), as needed for
 * identity providers such as Keycloak on an internal network.
 *
 * The check runs in the socket's own DNS lookup, on the addresses the connection will use,
 * so a name that resolves to a public address when saved and a private one at sign-in (DNS
 * rebinding) is still refused. Every endpoint the discovery document names is checked the
 * same way.
 * Monitoring connectors reuse this transport and lookup without a private-host exception.
 */
import { lookup as dnsLookup, type LookupAddress } from "node:dns";
import { request as httpRequest, type IncomingMessage } from "node:http";
import { request as httpsRequest } from "node:https";
import { BlockList, isIP, type LookupFunction } from "node:net";
import { brotliDecompressSync, gunzipSync, inflateSync } from "node:zlib";
import type { CustomFetch } from "openid-client";
import { trackPendingWork } from "../work-scope.ts";

/** Maximum encoded and decoded response size for guarded outbound requests. */
const MAX_BODY = 1024 * 1024;
const GLOBAL_V6 = new BlockList();
GLOBAL_V6.addSubnet("2000::", 3, "ipv6");

const NON_PUBLIC = new BlockList();
for (const [net, prefix] of [
  ["0.0.0.0", 8], // "this network"
  ["10.0.0.0", 8], // private
  ["100.64.0.0", 10], // carrier-grade NAT
  ["127.0.0.0", 8], // loopback
  ["169.254.0.0", 16], // link-local, cloud metadata
  ["172.16.0.0", 12], // private
  ["192.0.0.0", 24], // IETF protocol assignments
  ["192.0.2.0", 24], // documentation
  ["192.168.0.0", 16], // private
  ["198.18.0.0", 15], // benchmarking
  ["198.51.100.0", 24], // documentation
  ["203.0.113.0", 24], // documentation
  ["224.0.0.0", 4], // multicast
  ["240.0.0.0", 4], // reserved, broadcast
] as const) NON_PUBLIC.addSubnet(net, prefix, "ipv4");
for (const [net, prefix] of [
  ["::", 128], // unspecified
  ["::1", 128], // loopback
  ["64:ff9b:1::", 48], // local-use NAT64
  ["100::", 64], // discard
  ["2001:db8::", 32], // documentation
  ["2001::", 23], // special-purpose assignments, including Teredo
  ["3fff::", 20], // documentation
  ["fc00::", 7], // unique local
  ["fe80::", 10], // link-local
  ["ff00::", 8], // multicast
] as const) NON_PUBLIC.addSubnet(net, prefix, "ipv6");

/** The IPv4 address an IPv6 address carries (IPv4-mapped, NAT64 well-known prefix, 6to4), if any. */
function embeddedIPv4(address: string): string | undefined {
  const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/i.exec(address);
  if (mapped) return mapped[1];
  // Canonical form, e.g. "::ffff:a00:1" or "64:ff9b::a00:1".
  const canonical = new URL(`http://[${address}]`).hostname.slice(1, -1);
  const groups = canonical.split(":");
  const toV4 = (hi: string, lo: string) => {
    const a = parseInt(hi || "0", 16);
    const b = parseInt(lo || "0", 16);
    return `${a >> 8}.${a & 255}.${b >> 8}.${b & 255}`;
  };
  if (/^::ffff:[0-9a-f]{1,4}:[0-9a-f]{1,4}$/.test(canonical)) return toV4(groups.at(-2)!, groups.at(-1)!);
  if (canonical.startsWith("64:ff9b::")) return toV4(groups.at(-2)!, groups.at(-1)!);
  if (canonical.startsWith("2002:")) return toV4(groups[1]!, groups[2]!);
  return undefined;
}

/** Whether an IP address is anything other than a public unicast address. */
export function isNonPublicAddress(address: string): boolean {
  const family = isIP(address);
  if (family === 4) return NON_PUBLIC.check(address, "ipv4");
  if (family === 6) {
    const v4 = embeddedIPv4(address);
    return NON_PUBLIC.check(address, "ipv6") || (v4 !== undefined ? NON_PUBLIC.check(v4, "ipv4") : !GLOBAL_V6.check(address, "ipv6"));
  }
  return true;
}

export class PrivateAddressError extends Error {
  readonly host: string;
  constructor(host: string, address: string, purpose: "identity provider" | "connector" = "identity provider") {
    super(
      `The ${purpose} ${host} is on a private or reserved address (${address}).` +
        (purpose === "identity provider" ? " If it is an internal provider this server should reach, the operator can allow it with VISUA_OIDC_PRIVATE_ISSUERS." : " Connectors can reach public addresses only."),
    );
    this.host = host;
  }
}

/** The PrivateAddressError behind an error, however deeply a library wrapped it. */
export function privateAddressCause(err: unknown): PrivateAddressError | undefined {
  for (let e = err, depth = 0; e && depth < 5; e = (e as { cause?: unknown }).cause, depth++) {
    if (e instanceof PrivateAddressError) return e;
  }
  return undefined;
}

/** Hosts the operator allows on private addresses: names or IP literals, or "*" for any. */
export function privateHostAllowed(allowed: readonly string[]): (host: string) => boolean {
  const set = new Set(allowed.map((h) => h.trim().toLowerCase().replace(/^\[|\]$/g, "")).filter(Boolean));
  return (host) => set.has("*") || set.has(host.toLowerCase());
}

/** The host of a URL as a bare name or IP literal (IPv6 without brackets). */
export const bareHost = (url: URL) => url.hostname.toLowerCase().replace(/^\[|\]$/g, "");

export function assertPublicTarget(target: URL, allow: (host: string) => boolean, purpose: "identity provider" | "connector" = "identity provider"): void {
  if (target.protocol !== "https:" && target.protocol !== "http:") throw new TypeError(`Unsupported protocol ${target.protocol}`);
  const host = bareHost(target);
  if (!allow(host) && refusedLiteral(target, allow)) throw new PrivateAddressError(host, host, purpose);
}

/** Validate every answer in the lookup that the socket actually uses. */
export function guardedLookup(allow: (host: string) => boolean, purpose: "identity provider" | "connector" = "identity provider"): LookupFunction {
  return (hostname, lookupOptions, callback) => {
    const finished = trackPendingWork();
    try {
      dnsLookup(hostname, { ...lookupOptions, all: true }, (err, addresses: LookupAddress[]) => {
        try {
          if (err) return callback(err, "", 0);
          if (!addresses.length) return callback(Object.assign(new Error(`No address for ${hostname}`), { code: "ENOTFOUND" }), "", 0);
          const refused = allow(hostname) ? undefined : addresses.find((a) => isNonPublicAddress(a.address));
          if (refused) return callback(new PrivateAddressError(hostname, refused.address, purpose), "", 0);
          if (lookupOptions.all) return callback(null, addresses);
          const first = addresses[0]!;
          callback(null, first.address, first.family);
        } finally { finished(); }
      });
    } catch (err) {
      finished();
      throw err;
    }
  };
}

/** A literal address or `localhost` that would be refused: checked when an owner saves an issuer. */
export function refusedLiteral(url: URL, allow: (host: string) => boolean): boolean {
  const host = bareHost(url);
  if (allow(host)) return false;
  return host === "localhost" || host.endsWith(".localhost") || (isIP(host) !== 0 && isNonPublicAddress(host));
}

function decode(body: Buffer, encoding: string | undefined): Buffer {
  switch (encoding?.trim().toLowerCase()) {
    case "gzip":
    case "x-gzip":
      return gunzipSync(body, { maxOutputLength: MAX_BODY });
    case "deflate":
      return inflateSync(body, { maxOutputLength: MAX_BODY });
    case "br":
      return brotliDecompressSync(body, { maxOutputLength: MAX_BODY });
    default:
      return body;
  }
}

async function bodyBytes(body: unknown): Promise<Buffer | undefined> {
  if (body === undefined || body === null) return undefined;
  if (typeof body === "string" || body instanceof URLSearchParams) return Buffer.from(body.toString());
  if (body instanceof ArrayBuffer) return Buffer.from(body);
  if (ArrayBuffer.isView(body)) return Buffer.from(body.buffer, body.byteOffset, body.byteLength);
  if (body instanceof ReadableStream) return Buffer.from(await new Response(body).arrayBuffer());
  throw new TypeError("Unsupported request body");
}

/**
 * A fetch for openid-client that refuses non-public addresses unless `allow(host)`.
 * Redirects are returned, never followed (openid-client asks for `redirect: "manual"`).
 */
export function guardedFetch(allow: (host: string) => boolean, purpose: "identity provider" | "connector" = "identity provider"): CustomFetch {
  return async (url, options) => {
    const target = new URL(url);
    assertPublicTarget(target, allow, purpose);
    const lookup = guardedLookup(allow, purpose);
    const deadline = AbortSignal.timeout(12_000);
    const signal = options.signal ? AbortSignal.any([options.signal, deadline]) : deadline;
    const payload = await bodyBytes(options.body);
    return new Promise<Response>((resolve, reject) => {
      const send = target.protocol === "https:" ? httpsRequest : httpRequest;
      const req = send(target, { method: options.method, headers: options.headers, lookup, signal, agent: false }, (res: IncomingMessage) => {
        const chunks: Buffer[] = [];
        let size = 0;
        res.on("data", (chunk: Buffer) => {
          size += chunk.length;
          if (size > MAX_BODY) {
            req.destroy(new Error(`The ${purpose}'s response exceeds ${MAX_BODY} bytes`));
            return;
          }
          chunks.push(chunk);
        });
        res.on("error", reject);
        res.on("end", () => {
          try {
            const status = res.statusCode ?? 502;
            const headers = new Headers();
            for (const [name, value] of Object.entries(res.headers)) {
              if (value === undefined || name === "content-encoding" || name === "content-length") continue;
              for (const v of Array.isArray(value) ? value : [value]) headers.append(name, v);
            }
            const empty = options.method === "HEAD" || [204, 205, 304].includes(status);
            const raw = Buffer.concat(chunks);
            resolve(new Response(empty ? null : decode(raw, res.headers["content-encoding"]), { status, statusText: res.statusMessage, headers }));
          } catch (err) {
            reject(err);
          }
        });
      });
      req.on("error", reject);
      req.end(payload);
    });
  };
}
