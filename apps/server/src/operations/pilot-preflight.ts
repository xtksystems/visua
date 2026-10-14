import { loadAuthConfig } from "../auth/config.ts";
import { loadStartupConfig } from "../startup.ts";
import { loadRequestControlConfig } from "../request-controls.ts";

export interface PilotConfigCheck {
  id: string;
  severity: "error" | "warning";
  status: "pass" | "fail" | "review";
  message: string;
}

export interface PilotConfigReport {
  profile: "empty-install-hosted";
  scope: string;
  configReady: boolean;
  checks: PilotConfigCheck[];
  externalChecksRequired: true;
  externalChecks: { id: string; status: "required"; message: string }[];
}

/** Do not expose loader exceptions: future errors may contain supplied values. */
function safely<T>(load: () => T): T | undefined {
  try { return load(); } catch { return undefined; }
}

function parsedUrl(value: string | undefined): URL | undefined {
  if (!value || /[\s\u0000-\u001f\u007f\\]/.test(value)) return undefined;
  return safely(() => new URL(value));
}

function httpsUrl(value: string | undefined, originOnly = false): boolean {
  const url = parsedUrl(value);
  return !!url && url.protocol === "https:" && !url.username && !url.password
    && !value!.includes("?") && !value!.includes("#")
    && (!originOnly || /^https:\/\/[^/?#]+\/?$/.test(value!));
}

/**
 * Keep aligned with blobs/index.ts and S3BlobStore's constructor. Those modules
 * have no separate configuration loader; constructing a client here would bring
 * credential providers into an otherwise environment-only inspection.
 */
function validS3Config(env: NodeJS.ProcessEnv): boolean {
  const bucket = env["VISUA_BLOB_S3_BUCKET"] ?? "";
  const region = env["VISUA_BLOB_S3_REGION"] ?? "";
  const style = env["VISUA_BLOB_S3_FORCE_PATH_STYLE"];
  const prefix = env["VISUA_BLOB_S3_PREFIX"] ?? "evidence";
  if (bucket.trim() !== bucket || region.trim() !== region
    || !/^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$/.test(bucket) || bucket.includes("..")
    || !/^[a-z0-9][a-z0-9-]{0,62}$/.test(region)
    || (style !== undefined && !["true", "false", "1", "0"].includes(style))) return false;
  if (prefix.trim() !== prefix || prefix.length > 512
    || (prefix && (prefix.split("/").length > 8
      || prefix.split("/").some((part) => !/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(part))))) return false;
  const endpoint = env["VISUA_BLOB_S3_ENDPOINT"];
  if (endpoint === undefined) return true;
  const url = parsedUrl(endpoint);
  return !!url && ["http:", "https:"].includes(url.protocol) && !url.username && !url.password
    && !endpoint.includes("?") && !endpoint.includes("#") && url.pathname === "/";
}

/**
 * An offline configuration profile, not a production-readiness verdict. Only
 * static messages leave this function; environment values and loader errors do
 * not. No stores, clients, DNS lookups or credential providers are opened.
 */
export function inspectPilotConfig(env: NodeJS.ProcessEnv): PilotConfigReport {
  const checks: PilotConfigCheck[] = [];
  const required = (id: string, passes: boolean, success: string, failure: string) => {
    checks.push({ id, severity: "error", status: passes ? "pass" : "fail", message: passes ? success : failure });
  };
  const review = (id: string, needsReview: boolean, success: string, warning: string) => {
    checks.push({ id, severity: "warning", status: needsReview ? "review" : "pass", message: needsReview ? warning : success });
  };
  const auth = safely(() => loadAuthConfig(env));
  const mode = env["VISUA_AUTH_MODE"] ?? (env["NODE_ENV"] === "production" ? "oidc" : "dev");
  const startup = safely(() => loadStartupConfig(env, mode === "dev" ? "dev" : "oidc"));
  const requestControls = safely(() => loadRequestControlConfig(env));
  const secret = env["VISUA_SECRET"] ?? "";
  // Match loadAuthConfig followed by privateHostAllowed (auth/egress.ts),
  // including bracket stripping after trimming. Bracketed '*' still permits all.
  const privateIssuers = (env["VISUA_OIDC_PRIVATE_ISSUERS"] ?? "").split(",")
    .map((host) => host.trim().toLowerCase().replace(/^\[|\]$/g, "")).filter(Boolean);

  required("production-mode", env["NODE_ENV"] === "production", "Production mode is selected.", "Set NODE_ENV to production for this profile.");
  required("oidc-mode", mode === "oidc", "OIDC authentication is selected.", "Select OIDC authentication for this profile.");
  required("auth-config", !!auth, "Authentication settings pass the runtime loader.", "Authentication settings are invalid; review VISUA_AUTH_MODE and VISUA_SECRET.");
  required("public-origin", httpsUrl(env["VISUA_PUBLIC_URL"], true), "An HTTPS public origin is configured.", "Set VISUA_PUBLIC_URL to an HTTPS origin without credentials, a path, query or fragment.");
  required("server-secret", secret.length >= 32 && secret.trim().length >= 32 && secret !== loadAuthConfig({}).secret,
    "A non-default server secret of sufficient length is configured.", "Set VISUA_SECRET to a non-default secret of at least 32 characters.");
  required("seed-disabled", env["VISUA_SEED"] === "0", "Demo seeding is explicitly disabled.", "Set VISUA_SEED to 0 explicitly for this profile.");
  required("startup-config", !!startup, "Startup settings pass the runtime loader.", "Startup settings are invalid; review VISUA_PORT, VISUA_SEED and VISUA_SHUTDOWN_MS.");
  required("platform-idp", httpsUrl(env["VISUA_OIDC_ISSUER"]?.trim()) && !!env["VISUA_OIDC_CLIENT_ID"]?.trim(),
    "A platform issuer and client ID are configured; a public PKCE client may omit its client secret.",
    "The empty-install profile requires an HTTPS platform issuer and client ID; existing organization SSO is not inspected.");
  required("bootstrap-owner", /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(env["VISUA_BOOTSTRAP_OWNER_EMAIL"]?.trim() ?? ""),
    "A bootstrap owner email is configured for the empty-install profile.", "Set a valid VISUA_BOOTSTRAP_OWNER_EMAIL for the empty-install profile.");
  required("oidc-http-disabled", env["VISUA_OIDC_ALLOW_HTTP"] !== "1", "The HTTP issuer override is disabled.", "Disable VISUA_OIDC_ALLOW_HTTP for this profile.");
  required("private-issuer-wildcard-disabled", !privateIssuers.includes("*"), "Private issuer access has no wildcard allowance.", "Remove the wildcard from VISUA_OIDC_PRIVATE_ISSUERS for this profile.");

  // Match the runtime's selection order and scheme recognition without importing
  // the context/storage entry points or creating a database driver.
  const database = env["VISUA_DATABASE_URL"] || env["VISUA_DB"];
  const databaseUrl = parsedUrl(database);
  required("postgresql", !!database && /^postgres(ql)?:\/\//i.test(database) && !!databaseUrl?.hostname
    && databaseUrl.pathname.length > 1 && !database.includes("#"),
  "A PostgreSQL database URL is configured.", "Configure a PostgreSQL URL with a host and database name; SQLite does not satisfy this profile.");
  required("s3-backend", env["VISUA_BLOB_STORE"] === "s3", "S3 blob storage is explicitly selected.", "Set VISUA_BLOB_STORE to s3 explicitly for this profile.");
  required("s3-config", validS3Config(env), "S3 bucket, region and optional endpoint settings have valid syntax.", "Review S3 bucket, region, endpoint, prefix and path-style settings.");
  required("s3-https", env["VISUA_BLOB_S3_ENDPOINT"] === undefined || httpsUrl(env["VISUA_BLOB_S3_ENDPOINT"], true),
    "S3 uses its default HTTPS endpoint or an explicit HTTPS origin.", "Use an HTTPS origin for the hosted S3 endpoint.");
  required("request-controls", !!requestControls, "Request-control settings pass the runtime loader.", "Request-control settings are invalid; review the documented body, concurrency, rate and diagnostics bounds.");

  review("platform-email-trust", env["VISUA_OIDC_TRUST_EMAIL"] === "1", "Platform email verification is not overridden.", "Platform email verification is overridden; confirm the identity provider verifies every asserted email.");
  review("sso-domain-verification", env["VISUA_SSO_DOMAIN_VERIFICATION"] === "off", "SSO domain ownership uses DNS verification.", "SSO domain ownership verification is disabled; review this operator trust decision.");
  const recheck = env["VISUA_SSO_DOMAIN_RECHECK_HOURS"]?.trim();
  review("sso-domain-rechecks", !!recheck && Number(recheck) === 0, "SSO domain rechecks are enabled.", "SSO domain rechecks are disabled; review the risk of stale domain ownership.");
  review("private-issuer-exceptions", privateIssuers.some((host) => host !== "*"), "No explicit private issuer exceptions are configured.", "Explicit private issuer exceptions require an operator review of their network access.");

  return {
    profile: "empty-install-hosted",
    scope: "Environment-only checks for an empty hosted installation. Existing organizations and their SSO are not inspected. Passing configuration checks does not establish production readiness.",
    configReady: checks.every((check) => check.severity !== "error" || check.status === "pass"),
    checks,
    externalChecksRequired: true,
    externalChecks: [
      { id: "tls-dns", status: "required", message: "Verify public DNS, trusted TLS, reverse-proxy behavior and secure browser sessions." },
      { id: "database-access", status: "required", message: "Verify PostgreSQL connectivity, transport security, least-privilege access and migration ownership." },
      { id: "s3-iam-privacy", status: "required", message: "Verify the deployed credential chain, least-privilege IAM, bucket privacy, encryption and actual evidence upload/download access." },
      { id: "versioned-recovery", status: "required", message: "Rehearse coordinated PostgreSQL and versioned object recovery, including reviewed binary evidence and retained integrity pins." },
      { id: "retention-ownership", status: "required", message: "Assign retention and deletion ownership, backup retention and measured recovery objectives." },
      { id: "capacity", status: "required", message: "Measure expected pilot load, proxy rate limits, database and storage capacity, monitoring and failure recovery." },
      { id: "idp-login", status: "required", message: "Verify issuer discovery, client registration, callback URI, verified email claims, first-owner login and tenant access with the actual identity provider." },
      { id: "pilot-operations", status: "required", message: "Assign an operator, alert response and pilot acceptance criteria before admitting real evidence." },
    ],
  };
}
