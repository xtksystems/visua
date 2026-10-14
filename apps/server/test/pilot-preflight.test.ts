import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it, vi } from "vitest";
import { loadAuthConfig } from "../src/auth/config.ts";
import { privateHostAllowed } from "../src/auth/egress.ts";
import { inspectPilotConfig } from "../src/operations/pilot-preflight.ts";

const io = vi.hoisted(() => ({ blocked: vi.fn(() => { throw new Error("Preflight attempted I/O"); }) }));
// Importing a database/blob/client entry point is itself outside this inspector's
// contract. Also guard filesystem work through the startup loader's imports.
vi.mock("../src/context.ts", () => { throw new Error("Preflight imported application context"); });
vi.mock("../src/storage/index.ts", () => { throw new Error("Preflight imported database storage"); });
vi.mock("../src/blobs/index.ts", () => { throw new Error("Preflight imported blob storage"); });
vi.mock("@aws-sdk/client-s3", () => { throw new Error("Preflight imported an AWS client"); });
vi.mock("node:fs", async (original) => ({
  ...await original<typeof import("node:fs")>(),
  readFileSync: io.blocked, writeFileSync: io.blocked, existsSync: io.blocked,
  readdirSync: io.blocked, mkdirSync: io.blocked, openSync: io.blocked,
}));
vi.mock("node:fs/promises", async (original) => ({
  ...await original<typeof import("node:fs/promises")>(),
  readFile: io.blocked, writeFile: io.blocked, mkdir: io.blocked, open: io.blocked,
}));

const configured = (): NodeJS.ProcessEnv => ({
  NODE_ENV: "production",
  VISUA_PUBLIC_URL: "https://pilot.example.test",
  VISUA_SECRET: "synthetic-secret-for-the-hosted-profile-1234",
  VISUA_SEED: "0",
  VISUA_OIDC_ISSUER: "https://identity.example.test/realms/pilot",
  VISUA_OIDC_CLIENT_ID: "public-pkce-client",
  VISUA_BOOTSTRAP_OWNER_EMAIL: "operator@example.test",
  VISUA_DATABASE_URL: "postgresql://database.example.test/visua",
  VISUA_BLOB_STORE: "s3",
  VISUA_BLOB_S3_BUCKET: "pilot-evidence",
  VISUA_BLOB_S3_REGION: "us-east-1",
});
const check = (env: NodeJS.ProcessEnv, id: string) => inspectPilotConfig(env).checks.find((entry) => entry.id === id);

afterEach(() => {
  expect(io.blocked).not.toHaveBeenCalled();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("empty-install hosted configuration inspection", () => {
  it("accepts a public PKCE client and role-based S3 credentials while requiring external verification", () => {
    vi.stubGlobal("fetch", io.blocked);
    const env = Object.freeze(configured());
    const result = inspectPilotConfig(env);
    expect(result.configReady).toBe(true);
    expect(result.profile).toBe("empty-install-hosted");
    expect(result.externalChecksRequired).toBe(true);
    expect(result.externalChecks.map((entry) => entry.id)).toEqual(expect.arrayContaining([
      "tls-dns", "database-access", "s3-iam-privacy", "versioned-recovery", "retention-ownership", "capacity", "idp-login",
    ]));
    expect(result.externalChecks.every((entry) => entry.status === "required")).toBe(true);
    expect(result.scope).toMatch(/Existing organizations and their SSO are not inspected/);
    expect(JSON.parse(JSON.stringify(result))).toEqual(result);
    expect(new Set(result.checks.map((entry) => entry.id)).size).toBe(result.checks.length);
  });

  it("accepts an HTTPS S3-compatible origin and the runtime database fallback", () => {
    const env = configured();
    delete env["VISUA_DATABASE_URL"];
    Object.assign(env, {
      VISUA_DB: "postgres://db.example.test/pilot",
      VISUA_BLOB_S3_ENDPOINT: "https://objects.example.test/",
      VISUA_BLOB_S3_FORCE_PATH_STYLE: "1",
      VISUA_BLOB_S3_PREFIX: "pilot/evidence",
    });
    expect(inspectPilotConfig(env).configReady).toBe(true);
  });

  it("rejects missing settings without treating persisted organization SSO as absent", () => {
    const report = inspectPilotConfig({});
    expect(report.configReady).toBe(false);
    expect(report.checks.filter((entry) => entry.status === "fail").map((entry) => entry.id)).toEqual(expect.arrayContaining([
      "production-mode", "oidc-mode", "public-origin", "server-secret", "seed-disabled", "platform-idp", "bootstrap-owner", "postgresql", "s3-backend", "s3-config",
    ]));
    expect(check({}, "platform-idp")?.message).toMatch(/existing organization SSO is not inspected/);
  });

  it.each([
    ["NODE_ENV", "development", "production-mode"],
    ["VISUA_AUTH_MODE", "dev", "oidc-mode"],
    ["VISUA_AUTH_MODE", "invalid", "auth-config"],
    ["VISUA_SECRET", "short", "server-secret"],
    ["VISUA_SECRET", "visua-development-secret-do-not-use-in-production", "server-secret"],
    ["VISUA_SECRET", " ".repeat(32), "server-secret"],
    ["VISUA_SEED", undefined, "seed-disabled"],
    ["VISUA_SEED", "1", "seed-disabled"],
    ["VISUA_SEED", "false", "startup-config"],
    ["VISUA_PORT", "not-a-port", "startup-config"],
    ["VISUA_SHUTDOWN_MS", "0", "startup-config"],
    ["VISUA_OIDC_ISSUER", "https://user:password@identity.example.test/", "platform-idp"],
    ["VISUA_OIDC_ISSUER", "http://identity.example.test/", "platform-idp"],
    ["VISUA_OIDC_ISSUER", "https://identity.example.test/?secret=hidden", "platform-idp"],
    ["VISUA_OIDC_CLIENT_ID", " ", "platform-idp"],
    ["VISUA_BOOTSTRAP_OWNER_EMAIL", "malformed", "bootstrap-owner"],
    ["VISUA_OIDC_ALLOW_HTTP", "1", "oidc-http-disabled"],
    ["VISUA_OIDC_PRIVATE_ISSUERS", "idp.internal, * ", "private-issuer-wildcard-disabled"],
    ["VISUA_DATABASE_URL", ":memory:", "postgresql"],
    ["VISUA_DATABASE_URL", "data/pilot.db", "postgresql"],
    ["VISUA_DATABASE_URL", "postgres://", "postgresql"],
    ["VISUA_DATABASE_URL", "postgres://db.example.test", "postgresql"],
    ["VISUA_BLOB_STORE", undefined, "s3-backend"],
    ["VISUA_BLOB_STORE", "local", "s3-backend"],
    ["VISUA_BLOB_S3_BUCKET", "Bad Bucket", "s3-config"],
    ["VISUA_BLOB_S3_REGION", " ", "s3-config"],
    ["VISUA_BLOB_S3_PREFIX", "../evidence", "s3-config"],
    ["VISUA_BLOB_S3_FORCE_PATH_STYLE", "yes", "s3-config"],
    ["VISUA_BLOB_S3_ENDPOINT", "https://user:password@objects.example.test", "s3-config"],
    ["VISUA_BLOB_S3_ENDPOINT", "https://objects.example.test/bucket", "s3-config"],
    ["VISUA_BLOB_S3_ENDPOINT", "http://objects.example.test", "s3-https"],
    ["VISUA_JSON_CONCURRENCY", "0", "request-controls"],
  ])("rejects invalid %s configuration with a stable check", (key, value, id) => {
    const env = { ...configured(), [key!]: value };
    expect(check(env, id!)).toMatchObject({ severity: "error", status: "fail" });
    expect(inspectPilotConfig(env).configReady).toBe(false);
  });

  it.each([
    "http://pilot.example.test", "https://user:password@pilot.example.test", "https://pilot.example.test/path",
    "https://pilot.example.test/a/..", "https://pilot.example.test?", "https://pilot.example.test#",
    "https://pilot.example.test/?secret=value", "https://pilot.example.test/#fragment", "https://pilot.example.test\n",
  ])("rejects a public URL that is not a clean HTTPS origin", (url) => {
    expect(check({ ...configured(), VISUA_PUBLIC_URL: url }, "public-origin")?.status).toBe("fail");
  });

  it("reports permissive runtime flags as operator review requirements", () => {
    const report = inspectPilotConfig({
      ...configured(), VISUA_OIDC_TRUST_EMAIL: "1", VISUA_SSO_DOMAIN_VERIFICATION: "off",
      VISUA_SSO_DOMAIN_RECHECK_HOURS: "0", VISUA_OIDC_PRIVATE_ISSUERS: "identity.internal",
    });
    expect(report.configReady).toBe(true);
    expect(report.checks.filter((entry) => entry.status === "review").map((entry) => entry.id)).toEqual([
      "platform-email-trust", "sso-domain-verification", "sso-domain-rechecks", "private-issuer-exceptions",
    ]);
  });

  it.each([
    "*", " [*] ", "[*", "*]", "identity.internal,\t[*]\n",
    "[ * ]", "[[*]]", " [IDENTITY.INTERNAL] ", "[::1]", "[], \t,",
  ])("matches runtime private-issuer wildcard normalization for %j", (value) => {
    const env = { ...configured(), VISUA_OIDC_PRIVATE_ISSUERS: value };
    const runtimeAllowsWildcard = privateHostAllowed(loadAuthConfig(env).privateIssuerHosts)("*");
    expect(check(env, "private-issuer-wildcard-disabled")?.status).toBe(runtimeAllowsWildcard ? "fail" : "pass");
    expect(inspectPilotConfig(env).configReady).toBe(!runtimeAllowsWildcard);
  });

  it("reports normalized named exceptions without treating ignored empty brackets as an exception", () => {
    const env = { ...configured(), VISUA_OIDC_PRIVATE_ISSUERS: " [IDENTITY.INTERNAL], [::1] " };
    const allowed = privateHostAllowed(loadAuthConfig(env).privateIssuerHosts);
    expect(allowed("identity.internal")).toBe(true);
    expect(allowed("::1")).toBe(true);
    expect(check(env, "private-issuer-exceptions")?.status).toBe("review");
    expect(check({ ...configured(), VISUA_OIDC_PRIVATE_ISSUERS: "[], \t," }, "private-issuer-exceptions")?.status).toBe("pass");
  });

  it("uses only the supplied environment and never echoes values or caught errors", () => {
    vi.stubEnv("VISUA_PUBLIC_URL", "ambient-secret-marker");
    expect(inspectPilotConfig(configured()).configReady).toBe(true);
    const marker = "PRIVATE_VALUE_DO_NOT_LOG";
    const env = Object.fromEntries(Object.keys(configured()).map((key) => [key, marker]));
    Object.assign(env, {
      VISUA_PUBLIC_URL: `https://${marker}:${marker}@example.test/?token=${marker}`,
      VISUA_DATABASE_URL: `postgres://${marker}:${marker}@db.example.test/pilot`,
      VISUA_BLOB_S3_ENDPOINT: `https://${marker}:${marker}@objects.example.test`,
      VISUA_OIDC_PRIVATE_ISSUERS: marker,
      AWS_SECRET_ACCESS_KEY: marker, AWS_ACCESS_KEY_ID: marker,
    });
    const output = JSON.stringify(inspectPilotConfig(env));
    expect(output).not.toContain(marker);
    expect(output).not.toContain("ambient-secret-marker");
    expect(output).not.toContain("example.test");
    expect(output).not.toContain("Preflight attempted I/O");
  });
});

describe("pilot preflight CLI", () => {
  const script = fileURLToPath(new URL("../../../scripts/pilot-preflight.ts", import.meta.url));
  const run = (args: string[], env: NodeJS.ProcessEnv) => spawnSync(process.execPath, [script, ...args], {
    env, encoding: "utf8", timeout: 10_000,
  });

  it("emits only JSON and uses exit codes 0 and 1 for the supplied configuration", () => {
    for (const [env, status] of [[configured(), 0], [{}, 1]] as const) {
      const result = run([], env);
      expect(result.error).toBeUndefined();
      expect(result.status).toBe(status);
      expect(result.stderr).toBe("");
      expect(JSON.parse(result.stdout).configReady).toBe(status === 0);
      expect(result.stdout.trim().split("\n")).toHaveLength(1);
    }
  });

  it("supports JSON help and rejects other arguments without printing them", () => {
    const help = run(["--help"], {});
    expect(help.status).toBe(0);
    expect(JSON.parse(help.stdout).usage).toBe("node scripts/pilot-preflight.ts [--help]");
    for (const args of [["--secret=PRIVATE_ARG"], ["PRIVATE_ARG"], ["--help", "PRIVATE_ARG"]]) {
      const result = run(args, {});
      expect(result.status).toBe(2);
      expect(result.stderr).toBe("");
      expect(JSON.parse(result.stdout).error).toBeDefined();
      expect(result.stdout).not.toContain("PRIVATE_ARG");
    }
  });
});
