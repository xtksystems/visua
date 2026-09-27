/**
 * Authentication settings, from the environment.
 *
 *   VISUA_AUTH_MODE             dev | oidc (default: oidc when NODE_ENV=production, else dev)
 *   VISUA_PUBLIC_URL            external base URL, e.g. https://visua.example.com (OIDC redirects, secure cookies)
 *   VISUA_SECRET                server secret (≥ 32 chars) that seals SSO client secrets at rest
 *   VISUA_OIDC_ISSUER           platform identity provider (optional): issuer URL
 *   VISUA_OIDC_CLIENT_ID        … client id
 *   VISUA_OIDC_CLIENT_SECRET    … client secret (omit for a public client; PKCE is always used)
 *   VISUA_OIDC_NAME             … button label (default "Single sign-on")
 *   VISUA_OIDC_ALLOW_HTTP=1     allow http:// issuers (local test IdPs only)
 *   VISUA_OIDC_PRIVATE_ISSUERS  hosts an organization's SSO connection may reach on a private address
 *                               (comma-separated names or IPs, e.g. keycloak.internal; "*" for any)
 *   VISUA_OIDC_TRUST_EMAIL=1    the platform IdP verifies every email it asserts, even without an email_verified claim
 *   VISUA_SSO_DOMAIN_VERIFICATION  dns (default): an SSO connection's email domains route sign-ins only once
 *                               proven by a DNS TXT record; off: trusted as claimed (single-organization installs)
 *   VISUA_SSO_DOMAIN_RECHECK_HOURS  how often a domain proven by DNS is looked up again (default 24; 0 = never)
 *   VISUA_SSO_DOMAIN_RECHECK_GRACE_DAYS  how long its record may be missing before the domain lapses (default 7)
 *   VISUA_BOOTSTRAP_OWNER_EMAIL first owner, pre-provisioned when no organization has one
 *   VISUA_BOOTSTRAP_ORG_NAME    name of the organization created for that owner
 *   VISUA_SESSION_HOURS         absolute session lifetime (default 12)
 *   VISUA_SESSION_IDLE_MINUTES  idle timeout (default 120)
 */
export type AuthMode = "dev" | "oidc";

export interface PlatformIdp {
  issuer: string;
  clientId: string;
  clientSecret?: string;
  name: string;
}

export interface AuthConfig {
  mode: AuthMode;
  publicUrl: string;
  secureCookies: boolean;
  secret: string;
  secretIsDefault: boolean;
  platform?: PlatformIdp;
  allowHttpIssuers: boolean;
  /** Hosts organizations' identity providers may use on private addresses (see egress.ts). */
  privateIssuerHosts: string[];
  /** The platform IdP's email claim is verified even when it sends no email_verified claim. */
  trustPlatformEmail: boolean;
  /** How SSO connections' email domains are proven: a DNS TXT record, or not at all. */
  ssoDomainVerification: "dns" | "off";
  /** Hours between re-checks of a DNS-proven SSO domain; 0 turns re-checking off. */
  domainRecheckHours: number;
  /** Days a domain's record may be missing before the domain lapses. */
  domainRecheckGraceDays: number;
  bootstrapOwnerEmail?: string;
  bootstrapOrgName: string;
  sessionHours: number;
  sessionIdleMinutes: number;
}

const DEV_SECRET = "visua-development-secret-do-not-use-in-production";

export function loadAuthConfig(env: NodeJS.ProcessEnv = process.env): AuthConfig {
  const production = env["NODE_ENV"] === "production";
  const mode: AuthMode = env["VISUA_AUTH_MODE"] === "dev" ? "dev" : env["VISUA_AUTH_MODE"] === "oidc" || production ? "oidc" : "dev";
  if (production && mode === "dev") throw new Error("VISUA_AUTH_MODE=dev is refused when NODE_ENV=production: developer sign-in has no password.");
  const publicUrl = (env["VISUA_PUBLIC_URL"] ?? `http://localhost:${env["VISUA_PORT"] ?? 8787}`).replace(/\/+$/, "");
  const secret = env["VISUA_SECRET"] ?? "";
  if (mode === "oidc" && secret && secret.length < 32) throw new Error("VISUA_SECRET must be at least 32 characters.");
  const issuer = env["VISUA_OIDC_ISSUER"]?.trim();
  const clientId = env["VISUA_OIDC_CLIENT_ID"]?.trim();
  const number = (key: string, fallback: number) => {
    const v = Number(env[key]);
    return Number.isFinite(v) && v > 0 ? v : fallback;
  };
  const hoursRaw = (env["VISUA_SSO_DOMAIN_RECHECK_HOURS"] ?? "").trim();
  const hours = Number(hoursRaw);
  return {
    mode,
    publicUrl,
    secureCookies: publicUrl.startsWith("https://"),
    secret: secret || DEV_SECRET,
    secretIsDefault: !secret,
    platform: issuer && clientId ? { issuer, clientId, clientSecret: env["VISUA_OIDC_CLIENT_SECRET"] || undefined, name: env["VISUA_OIDC_NAME"] || "Single sign-on" } : undefined,
    allowHttpIssuers: env["VISUA_OIDC_ALLOW_HTTP"] === "1",
    privateIssuerHosts: (env["VISUA_OIDC_PRIVATE_ISSUERS"] ?? "").split(",").map((h) => h.trim()).filter(Boolean),
    trustPlatformEmail: env["VISUA_OIDC_TRUST_EMAIL"] === "1",
    ssoDomainVerification: env["VISUA_SSO_DOMAIN_VERIFICATION"] === "off" ? "off" : "dns",
    domainRecheckHours: hoursRaw && Number.isFinite(hours) && hours >= 0 ? hours : 24,
    domainRecheckGraceDays: number("VISUA_SSO_DOMAIN_RECHECK_GRACE_DAYS", 7),
    bootstrapOwnerEmail: env["VISUA_BOOTSTRAP_OWNER_EMAIL"]?.trim().toLowerCase() || undefined,
    bootstrapOrgName: env["VISUA_BOOTSTRAP_ORG_NAME"]?.trim() || "My organization",
    sessionHours: number("VISUA_SESSION_HOURS", 12),
    sessionIdleMinutes: number("VISUA_SESSION_IDLE_MINUTES", 120),
  };
}
