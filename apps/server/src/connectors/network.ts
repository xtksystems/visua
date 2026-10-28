/** Public-only HTTP and TLS transport for tenant-configured connector targets. */
import { isIP } from "node:net";
import { connect } from "node:tls";
import { assertPublicTarget, bareHost, guardedFetch, guardedLookup } from "../auth/egress.ts";

const noPrivateHosts = () => false;
const fetchPublic = guardedFetch(noPrivateHosts, "connector");
const lookupPublic = guardedLookup(noPrivateHosts, "connector");
const REDIRECTS = new Set([301, 302, 303, 307, 308]);

export function checkConnectorUrl(url: URL): void {
  if (url.username || url.password) throw new Error("Connector URLs must not contain credentials.");
  assertPublicTarget(url, noPrivateHosts, "connector");
}

/** Validate an observed redirect even when the HTTP probe does not follow it. */
export async function connectorRedirect(from: URL, location: string, signal?: AbortSignal): Promise<URL> {
  const target = new URL(location, from);
  checkConnectorUrl(target);
  if (from.protocol === "https:" && target.protocol !== "https:") throw new Error("Connector redirects must not downgrade HTTPS.");
  signal?.throwIfAborted();
  const host = bareHost(target);
  if (!isIP(host)) await new Promise<void>((resolve, reject) => {
    const aborted = () => reject(signal!.reason);
    signal?.addEventListener("abort", aborted, { once: true });
    lookupPublic(host, { all: true }, (err) => {
      signal?.removeEventListener("abort", aborted);
      if (err) reject(err);
      else resolve();
    });
  });
  signal?.throwIfAborted();
  return target;
}

export async function connectorFetch(url: URL, options: { follow?: boolean; signal?: AbortSignal } = {}): Promise<{ response: Response; url: URL }> {
  const deadline = AbortSignal.timeout(12_000);
  const signal = options.signal ? AbortSignal.any([options.signal, deadline]) : deadline;
  let target = url;
  for (let hops = 0; ; hops++) {
    checkConnectorUrl(target);
    signal.throwIfAborted();
    const response = await fetchPublic(target.toString(), {
      method: "GET", headers: { "user-agent": "Visua-Posture-Check/1.0", "accept-encoding": "identity" }, body: null, redirect: "manual", signal,
    });
    const location = response.headers.get("location");
    if (!REDIRECTS.has(response.status) || !location) return { response, url: target };
    const next = await connectorRedirect(target, location, signal);
    if (!options.follow) return { response, url: target };
    if (hops >= 5) throw new Error("Connector request exceeds five redirects.");
    target = next;
  }
}

export function connectorTlsDetails(url: URL, parentSignal?: AbortSignal): Promise<{ validTo: Date; protocol: string | null; issuer: string; subject: string }> {
  checkConnectorUrl(url);
  const deadline = AbortSignal.timeout(12_000);
  const signal = parentSignal ? AbortSignal.any([parentSignal, deadline]) : deadline;
  signal.throwIfAborted();
  const host = bareHost(url);
  return new Promise((resolve, reject) => {
    const socket = connect({ host, port: Number(url.port || 443), servername: isIP(host) ? undefined : host, lookup: lookupPublic });
    const aborted = () => socket.destroy(signal.reason instanceof Error ? signal.reason : new Error("TLS handshake aborted"));
    signal.addEventListener("abort", aborted, { once: true });
    socket.once("close", () => signal.removeEventListener("abort", aborted));
    socket.once("error", reject);
    socket.once("secureConnect", () => {
      try {
        const cert = socket.getPeerCertificate();
        if (!cert?.valid_to) throw new Error("No certificate presented");
        resolve({ validTo: new Date(cert.valid_to), protocol: socket.getProtocol(), issuer: String(cert.issuer?.O ?? cert.issuer?.CN ?? "unknown"), subject: String(cert.subject?.CN ?? host) });
      } catch (err) {
        reject(err);
      } finally {
        socket.destroy();
      }
    });
  });
}
