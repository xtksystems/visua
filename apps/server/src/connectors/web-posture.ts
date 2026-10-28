/**
 * Web Security Posture connector — credential-free, real checks against a
 * public endpoint: HTTPS, HTTP→HTTPS redirect, HSTS, TLS certificate and
 * protocol, browser security headers and a vulnerability disclosure contact.
 */
import { checkConnectorUrl, connectorFetch, connectorTlsDetails } from "./network.ts";
import type { CheckOutput, ConnectorKind } from "./index.ts";

const TRANSIT = { csf: ["PR.DS-02"], soc2: ["CC6.7"], sp80053: ["SC-8", "SC-8(1)"] };

function normalizeUrl(raw: string): URL {
  const value = raw.trim();
  if (!value || value.length > 2048) throw new Error("Public URL is required and must be at most 2048 characters.");
  const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(value) ? value : `https://${value}`;
  const url = new URL(withScheme);
  checkConnectorUrl(url);
  url.protocol = "https:";
  return url;
}

export const webPostureConnector: ConnectorKind = {
  kind: "web-posture",
  name: "Web Security Posture",
  description: "Checks a public web endpoint for HTTPS, HSTS, TLS certificate health, security headers and a security.txt disclosure contact.",
  configFields: [{ key: "url", label: "Public URL", placeholder: "https://example.com", required: true }],
  async run(config, signal) {
    const url = normalizeUrl(String(config["url"] ?? ""));
    const out: CheckOutput[] = [];
    let response: Response | undefined;

    try {
      const fetched = await connectorFetch(url, { follow: true, signal });
      response = fetched.response;
      out.push({
        checkId: "https-reachable",
        title: "Service is served over HTTPS",
        outcome: response.status < 500 ? "pass" : "fail",
        detail: `GET ${url.origin} returned HTTP ${response.status}`,
        observed: { status: response.status, finalUrl: fetched.url.toString() },
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
      const { response: http } = await connectorFetch(new URL(`http://${url.host}/`), { signal });
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
      const tls = await connectorTlsDetails(url, signal);
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
      const { response: res } = await connectorFetch(new URL("/.well-known/security.txt", url), { follow: true, signal });
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
