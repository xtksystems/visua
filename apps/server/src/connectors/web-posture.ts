/**
 * Web Security Posture connector — credential-free, real checks against a
 * public endpoint: HTTPS, HTTP→HTTPS redirect, HSTS, TLS certificate and
 * protocol, browser security headers and a vulnerability disclosure contact.
 */
import { connect } from "node:tls";
import type { CheckOutput, ConnectorKind } from "./index.ts";

const TRANSIT = { csf: ["PR.DS-02"], soc2: ["CC6.7"], sp80053: ["SC-8", "SC-8(1)"] };

function normalizeUrl(raw: string): URL {
  const withScheme = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  const url = new URL(withScheme);
  url.protocol = "https:";
  return url;
}

async function fetchWithTimeout(url: string, init: RequestInit = {}, ms = 12_000): Promise<Response> {
  return fetch(url, { ...init, signal: AbortSignal.timeout(ms), headers: { "user-agent": "Visua-Posture-Check/1.0", ...(init.headers ?? {}) } });
}

function tlsDetails(host: string, port = 443, ms = 10_000): Promise<{ validTo: Date; protocol: string | null; issuer: string; subject: string }> {
  return new Promise((resolve, reject) => {
    const socket = connect({ host, port, servername: host, timeout: ms }, () => {
      const cert = socket.getPeerCertificate();
      const protocol = socket.getProtocol();
      socket.end();
      if (!cert || !cert.valid_to) return reject(new Error("No certificate presented"));
      resolve({
        validTo: new Date(cert.valid_to),
        protocol,
        issuer: String(cert.issuer?.O ?? cert.issuer?.CN ?? "unknown"),
        subject: String(cert.subject?.CN ?? host),
      });
    });
    socket.on("timeout", () => {
      socket.destroy();
      reject(new Error("TLS handshake timed out"));
    });
    socket.on("error", reject);
  });
}

export const webPostureConnector: ConnectorKind = {
  kind: "web-posture",
  name: "Web Security Posture",
  description: "Checks a public web endpoint for HTTPS, HSTS, TLS certificate health, security headers and a security.txt disclosure contact.",
  configFields: [{ key: "url", label: "Public URL", placeholder: "https://example.com", required: true }],
  async run(config) {
    const url = normalizeUrl(String(config["url"] ?? ""));
    const out: CheckOutput[] = [];
    let response: Response | undefined;

    try {
      response = await fetchWithTimeout(url.toString(), { redirect: "follow" });
      out.push({
        checkId: "https-reachable",
        title: "Service is served over HTTPS",
        outcome: response.status < 500 ? "pass" : "fail",
        detail: `GET ${url.origin} returned HTTP ${response.status}`,
        observed: { status: response.status, finalUrl: response.url },
        requirements: TRANSIT,
      });
    } catch (err) {
      out.push({
        checkId: "https-reachable",
        title: "Service is served over HTTPS",
        outcome: "fail",
        detail: `HTTPS request failed: ${(err as Error).message}`,
        observed: {},
        requirements: TRANSIT,
      });
    }

    try {
      const http = await fetchWithTimeout(`http://${url.host}/`, { redirect: "manual" });
      const location = http.headers.get("location") ?? "";
      const redirects = [301, 302, 307, 308].includes(http.status) && location.startsWith("https://");
      out.push({
        checkId: "http-redirect",
        title: "Plain HTTP redirects to HTTPS",
        outcome: redirects ? "pass" : http.status < 400 ? "fail" : "warn",
        detail: redirects ? `HTTP ${http.status} → ${location}` : `HTTP responded ${http.status} without redirecting to HTTPS`,
        observed: { status: http.status, location },
        requirements: TRANSIT,
      });
    } catch (err) {
      out.push({
        checkId: "http-redirect",
        title: "Plain HTTP redirects to HTTPS",
        outcome: "warn",
        detail: `Port 80 not reachable (${(err as Error).message}) — acceptable if HTTP is disabled`,
        observed: {},
        requirements: TRANSIT,
      });
    }

    if (response) {
      const hsts = response.headers.get("strict-transport-security");
      const maxAge = Number(/max-age=(\d+)/i.exec(hsts ?? "")?.[1] ?? 0);
      out.push({
        checkId: "hsts",
        title: "HTTP Strict Transport Security is enforced",
        outcome: hsts ? (maxAge >= 15_552_000 ? "pass" : "warn") : "fail",
        detail: hsts ? `strict-transport-security: ${hsts}` : "No Strict-Transport-Security header",
        observed: { header: hsts, maxAge },
        requirements: TRANSIT,
      });

      const headers = {
        "content-security-policy": response.headers.get("content-security-policy"),
        "x-content-type-options": response.headers.get("x-content-type-options"),
        "x-frame-options": response.headers.get("x-frame-options"),
        "referrer-policy": response.headers.get("referrer-policy"),
      };
      const present = Object.entries(headers).filter(([k, v]) => v || (k === "x-frame-options" && /frame-ancestors/i.test(headers["content-security-policy"] ?? "")));
      out.push({
        checkId: "security-headers",
        title: "Browser security headers are configured",
        outcome: present.length >= 3 ? "pass" : present.length >= 1 ? "warn" : "fail",
        detail: `${present.length}/4 recommended headers present: ${present.map(([k]) => k).join(", ") || "none"}`,
        observed: headers,
        requirements: { csf: ["PR.PS-01"], soc2: ["CC6.6"], sp80053: ["CM-6"] },
      });
    }

    try {
      const tls = await tlsDetails(url.hostname, Number(url.port || 443));
      const days = Math.floor((tls.validTo.getTime() - Date.now()) / 86_400_000);
      const modern = tls.protocol === "TLSv1.3" || tls.protocol === "TLSv1.2";
      out.push({
        checkId: "tls-certificate",
        title: "TLS certificate is valid and protocol is modern",
        outcome: days >= 30 && modern ? "pass" : days >= 7 && modern ? "warn" : "fail",
        detail: `${tls.protocol ?? "unknown protocol"}; certificate for ${tls.subject} issued by ${tls.issuer} expires in ${days} day(s)`,
        observed: { protocol: tls.protocol, validTo: tls.validTo.toISOString(), daysRemaining: days, issuer: tls.issuer },
        requirements: { csf: ["PR.DS-02"], soc2: ["CC6.7"], sp80053: ["SC-8(1)", "SC-13"] },
      });
    } catch (err) {
      out.push({
        checkId: "tls-certificate",
        title: "TLS certificate is valid and protocol is modern",
        outcome: "warn",
        detail: `Could not inspect the TLS handshake directly (${(err as Error).message}); HTTPS reachability is checked separately`,
        observed: {},
        requirements: { csf: ["PR.DS-02"], soc2: ["CC6.7"], sp80053: ["SC-8(1)", "SC-13"] },
      });
    }

    try {
      const res = await fetchWithTimeout(`${url.origin}/.well-known/security.txt`, { redirect: "follow" });
      const body = res.ok ? await res.text() : "";
      const ok = res.ok && /^contact:/im.test(body);
      out.push({
        checkId: "security-txt",
        title: "Vulnerability disclosure contact is published (security.txt)",
        outcome: ok ? "pass" : "warn",
        detail: ok ? "security.txt with Contact field found" : `security.txt not found (HTTP ${res.status})`,
        observed: { status: res.status },
        requirements: { csf: ["ID.RA-08"], soc2: ["CC2.3"], sp80053: ["RA-5(11)"] },
      });
    } catch (err) {
      out.push({
        checkId: "security-txt",
        title: "Vulnerability disclosure contact is published (security.txt)",
        outcome: "warn",
        detail: `Could not fetch security.txt (${(err as Error).message})`,
        observed: {},
        requirements: { csf: ["ID.RA-08"], soc2: ["CC2.3"], sp80053: ["RA-5(11)"] },
      });
    }
    return out;
  },
};
