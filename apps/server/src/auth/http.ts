/**
 * HTTP side of authentication: session cookies, bearer tokens, CSRF and
 * origin checks, security headers, role guards, and the /api/auth and
 * /api/tenants routes.
 */
import type { Context, Hono, MiddlewareHandler } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import { z } from "zod";
import { ROLES, ROLE_LABELS, can, type Capability, type Role, type Workspace } from "@visua/core";
import { NotFoundError, ValidationError, principalContext } from "../services/visua.ts";
import { protocolOf } from "../storage/index.ts";
import { randomToken, safeEqual } from "./crypto.ts";
import { METADATA_MAX } from "./saml.ts";
import { AuthService, ForbiddenError, UnauthorizedError, safeReturnTo, type Principal, type SsoConnectionInput } from "./service.ts";

export type AppEnv = {
  Variables: {
    principal: Principal | undefined;
    workspace: Workspace;
    role: Role;
    tenantId: string;
  };
};

export const CSRF_HEADER = "x-visua-csrf";
const SAFE = new Set(["GET", "HEAD", "OPTIONS"]);

/** Routes that answer without a signed-in principal. */
const PUBLIC_ROUTES = [
  /^\/api\/health$/,
  /^\/api\/auth\/(config|me|dev\/login|oidc\/start|oidc\/callback|saml\/start|saml\/finish|sso\/discover|logout)$/,
  /^\/api\/auth\/saml\/[^/]+\/(acs|metadata)$/,
  /^\/api\/trust\//,
];
/** The SAML assertion consumer service: the identity provider's cross-site form POST. */
const SAML_ACS = /^\/api\/auth\/saml\/[^/]+\/acs$/;

export const cookieName = (auth: AuthService) => (auth.config.secureCookies ? "__Host-visua_session" : "visua_session");
/** Pre-auth cookie that binds an OpenID Connect flow to the browser that started it. */
const flowCookieName = (auth: AuthService) => (auth.config.secureCookies ? "__Host-visua_oidc" : "visua_oidc");
/** Pre-auth cookie that binds a SAML sign-in to the browser that started it. */
const samlCookieName = (auth: AuthService) => (auth.config.secureCookies ? "__Host-visua_saml" : "visua_saml");

/** `?limit=` as a bounded positive integer (anything else: the default). */
export function limitParam(value: string | undefined, fallback: number, max: number): number {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? Math.min(n, max) : fallback;
}

export function principalOf(c: Context<AppEnv>): Principal {
  const p = c.get("principal");
  if (!p) throw new UnauthorizedError("Sign in to continue");
  return p;
}

export const actorOf = (c: Context<AppEnv>) => principalOf(c).label;

const CSP = [
  "default-src 'self'",
  // troika (3D text) loads its worker modules from blob: URLs.
  "script-src 'self' blob:",
  "worker-src 'self' blob:",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

export function securityHeaders(auth: AuthService): MiddlewareHandler<AppEnv> {
  return async (c, next) => {
    await next();
    const h = c.res.headers;
    h.set("X-Content-Type-Options", "nosniff");
    h.set("Referrer-Policy", "same-origin");
    h.set("Cross-Origin-Opener-Policy", "same-origin");
    h.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=()");
    if (auth.config.secureCookies) h.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
    // Corpus documents open in the browser's own PDF viewer; everything else refuses framing.
    if (!c.req.path.startsWith("/api/corpus/file/")) {
      h.set("X-Frame-Options", "DENY");
      if ((h.get("content-type") ?? "").includes("text/html")) h.set("Content-Security-Policy", CSP);
    }
    if (c.req.path.startsWith("/api/") && !h.has("Cache-Control")) h.set("Cache-Control", "no-store");
  };
}

/** Resolve the principal (bearer API token or session cookie) and run the request as it. */
export function authenticate(auth: AuthService): MiddlewareHandler<AppEnv> {
  return async (c, next) => {
    let principal: Principal | undefined;
    const header = c.req.header("authorization");
    if (header?.toLowerCase().startsWith("bearer ")) {
      principal = await auth.resolveApiToken(header.slice(7).trim());
      if (!principal) return c.json({ error: "Invalid, expired or revoked API token" }, 401);
    } else {
      const token = getCookie(c, cookieName(auth));
      if (token) principal = await auth.resolveSession(token);
    }
    c.set("principal", principal);
    if (!principal) return next();
    return principalContext.run({ id: principal.id, label: principal.label }, () => next());
  };
}

/** Everything under /api needs a principal, except the public routes. */
export function requireSignIn(): MiddlewareHandler<AppEnv> {
  return async (c, next) => {
    if (c.get("principal") || PUBLIC_ROUTES.some((r) => r.test(c.req.path))) return next();
    return c.json({ error: "Sign in to continue" }, 401);
  };
}

/**
 * State-changing requests from a browser session must carry the session's CSRF
 * token, and (outside developer mode) come from Visua's own origin.
 */
export function csrfProtection(auth: AuthService): MiddlewareHandler<AppEnv> {
  const allowed = new Set([new URL(auth.config.publicUrl).origin, ...(process.env["VISUA_ALLOWED_ORIGINS"] ?? "").split(",").map((o) => o.trim()).filter(Boolean)]);
  return async (c, next) => {
    // The identity provider posts the response from its own site, with no Visua cookie or token:
    // the signed response and the stored request authenticate it (AuthService.acceptSamlResponse).
    if (c.req.method === "POST" && SAML_ACS.test(c.req.path)) return next();
    if (SAFE.has(c.req.method)) return next();
    const origin = c.req.header("origin");
    if (origin && auth.config.mode === "oidc" && !allowed.has(origin)) return c.json({ error: "Cross-origin request refused" }, 403);
    // Browsers label requests another site started; none may change state (sign-in included), except from allowed origins.
    if (c.req.header("sec-fetch-site") === "cross-site" && !(origin && allowed.has(origin))) return c.json({ error: "Cross-site request refused" }, 403);
    const p = c.get("principal");
    if (p?.kind === "user" && !safeEqual(c.req.header(CSRF_HEADER) ?? "", p.session.csrf)) return c.json({ error: "Missing or invalid CSRF token — reload the page" }, 403);
    return next();
  };
}

/**
 * Workspace routes: the workspace must belong to an organization the principal
 * can access (404 otherwise — other tenants' workspaces do not exist for you).
 * Reads need `workspace.read`; any write needs at least `work.write`; routes
 * that need more add `need()`.
 */
export function workspaceAccess(auth: AuthService): MiddlewareHandler<AppEnv> {
  return async (c, next) => {
    const ws = await auth.svc.store.workspaces.get(c.req.param("ws") ?? "");
    const role = ws ? await auth.roleIn(c.get("principal"), ws.tenantId) : undefined;
    if (!ws || !role) throw new NotFoundError("Workspace not found");
    c.set("workspace", ws);
    c.set("role", role);
    c.set("tenantId", ws.tenantId!);
    const floor: Capability = SAFE.has(c.req.method) ? "workspace.read" : "work.write";
    if (!can(role, floor)) throw new ForbiddenError(`The ${ROLE_LABELS[role].name.toLowerCase()} role is read-only`);
    return next();
  };
}

/** Organization routes (/api/tenants/:tenant/...): membership required, 404 otherwise. */
export function tenantAccess(auth: AuthService): MiddlewareHandler<AppEnv> {
  return async (c, next) => {
    const id = c.req.param("tenant") ?? "";
    const tenant = (await auth.svc.store.identity.tenants.get(id)) ?? (await auth.svc.store.identity.tenants.getBySlug(id));
    const role = tenant ? await auth.roleIn(c.get("principal"), tenant.id) : undefined;
    if (!tenant || !role) throw new NotFoundError("Organization not found");
    c.set("tenantId", tenant.id);
    c.set("role", role);
    return next();
  };
}

/** Require a capability beyond the route's floor. */
export const need =
  (capability: Capability): MiddlewareHandler<AppEnv> =>
  async (c, next) => {
    requireCapability(c, capability);
    return next();
  };

export function requireCapability(c: Context<AppEnv>, capability: Capability): void {
  const role = c.get("role");
  if (!can(role, capability)) throw new ForbiddenError(`This needs the ${capabilityRole(capability)} role or higher (you are ${role ? ROLE_LABELS[role].name.toLowerCase() : "not a member"})`);
}

const capabilityRole = (capability: Capability) => ROLE_LABELS[[...ROLES].reverse().find((r) => can(r, capability)) ?? "owner"].name.toLowerCase();

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

const RoleSchema = z.enum(ROLES);

function parse<T extends z.ZodType>(schema: T, body: unknown): z.infer<T> {
  const parsed = schema.safeParse(body);
  if (!parsed.success) throw new ValidationError(z.prettifyError(parsed.error));
  return parsed.data;
}

async function json<T extends z.ZodType>(c: Context, schema: T): Promise<z.infer<T>> {
  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    throw new ValidationError("Request body must be JSON");
  }
  return parse(schema, body);
}

/** Sign-in starts from Visua's own pages (or a typed URL), never from another site's link. */
const startedElsewhere = (c: Context) => {
  const site = c.req.header("sec-fetch-site");
  return !!site && site !== "same-origin" && site !== "none";
};

/** A failed sign-in goes back to the sign-in page, saying why only for authentication and access errors. */
function signInFailed(c: Context, err: unknown, what: string, status: 302 | 303) {
  const known = err instanceof UnauthorizedError || err instanceof ForbiddenError;
  if (!known) console.error(`[visua] ${what} failed`, err);
  const message = known ? err.message : "Sign-in failed. Try again or contact your administrator.";
  return c.redirect(`/login?error=${encodeURIComponent(message)}`, status);
}

export function authRoutes(app: Hono<AppEnv>, auth: AuthService): void {
  const setSession = (c: Context, token: string) =>
    setCookie(c, cookieName(auth), token, {
      httpOnly: true,
      secure: auth.config.secureCookies,
      sameSite: "Lax",
      path: "/",
      maxAge: auth.config.sessionHours * 3600,
    });

  app.get("/api/auth/config", async (c) =>
    c.json({
      mode: auth.config.mode,
      platform: auth.config.platform ? { name: auth.config.platform.name } : null,
      sso: true,
      personas: await auth.devPersonas(),
    }),
  );

  app.post("/api/auth/dev/login", async (c) => {
    const input = await json(c, z.object({ email: z.string().max(200), name: z.string().max(120).optional() }));
    const { token } = await auth.devLogin(input.email, input.name, c.req.header("user-agent"));
    setSession(c, token);
    const principal = await auth.resolveSession(token);
    return c.json(await auth.me(principal!));
  });

  app.post("/api/auth/sso/discover", async (c) => {
    const input = await json(c, z.object({ email: z.string().max(200) }));
    const found = await auth.discover(input.email);
    if (!found) throw new NotFoundError("No single sign-on is configured for this address");
    return c.json(found);
  });

  app.get("/api/auth/oidc/start", async (c) => {
    if (startedElsewhere(c)) return c.redirect(`/login?error=${encodeURIComponent("Start signing in from the Visua sign-in page.")}`, 302);
    const browser = randomToken(24);
    const url = await auth.startLogin(c.req.query("connection") || "platform", safeReturnTo(c.req.query("returnTo")), browser);
    setCookie(c, flowCookieName(auth), browser, { httpOnly: true, secure: auth.config.secureCookies, sameSite: "Lax", path: "/", maxAge: 600 });
    return c.redirect(url.toString(), 302);
  });

  app.get("/api/auth/oidc/callback", async (c) => {
    const browser = getCookie(c, flowCookieName(auth)) ?? "";
    deleteCookie(c, flowCookieName(auth), { path: "/", secure: auth.config.secureCookies });
    try {
      const { token, returnTo } = await auth.finishLogin(new URL(c.req.url), c.req.header("user-agent"), browser);
      setSession(c, token);
      return c.redirect(returnTo, 302);
    } catch (err) {
      return signInFailed(c, err, "OIDC callback", 302);
    }
  });

  app.get("/api/auth/saml/start", async (c) => {
    if (startedElsewhere(c)) return c.redirect(`/login?error=${encodeURIComponent("Start signing in from the Visua sign-in page.")}`, 302);
    const browser = randomToken(24);
    try {
      const url = await auth.startSamlLogin(c.req.query("connection") ?? "", safeReturnTo(c.req.query("returnTo")), browser);
      setCookie(c, samlCookieName(auth), browser, { httpOnly: true, secure: auth.config.secureCookies, sameSite: "Lax", path: "/", maxAge: 600 });
      return c.redirect(url, 302);
    } catch (err) {
      return signInFailed(c, err, "SAML start", 302);
    }
  });

  // Exempt from the origin and CSRF checks (csrfProtection); creates no session.
  app.post("/api/auth/saml/:id/acs", async (c) => {
    try {
      if (Number(c.req.header("content-length") ?? 0) > 1_048_576) throw new UnauthorizedError("The sign-in response is missing or too large");
      const form = await c.req.parseBody();
      const samlResponse = typeof form["SAMLResponse"] === "string" ? form["SAMLResponse"] : "";
      const code = await auth.acceptSamlResponse(c.req.param("id"), samlResponse);
      return c.redirect(`/api/auth/saml/finish?code=${encodeURIComponent(code)}`, 303);
    } catch (err) {
      return signInFailed(c, err, "SAML response", 303);
    }
  });

  // Reached through the ACS's 303: a top-level GET, so the browser sends the Lax flow cookie. The
  // redirect chain began at the provider, so Sec-Fetch-Site is "cross-site": not checked here.
  app.get("/api/auth/saml/finish", async (c) => {
    const browser = getCookie(c, samlCookieName(auth)) ?? "";
    deleteCookie(c, samlCookieName(auth), { path: "/", secure: auth.config.secureCookies });
    try {
      const { token, returnTo } = await auth.finishSamlLogin(c.req.query("code") ?? "", c.req.header("user-agent"), browser);
      setSession(c, token);
      return c.redirect(returnTo, 302);
    } catch (err) {
      return signInFailed(c, err, "SAML sign-in", 302);
    }
  });

  // Identity providers fetch this (public, like the entity ID it names).
  app.get("/api/auth/saml/:id/metadata", async (c) =>
    c.body(await auth.samlMetadata(c.req.param("id")), 200, { "content-type": "application/samlmetadata+xml; charset=utf-8" }),
  );

  app.post("/api/auth/logout", async (c) => {
    const p = c.get("principal");
    if (p) await auth.endSession(p);
    deleteCookie(c, cookieName(auth), { path: "/", secure: auth.config.secureCookies });
    return c.json({ ok: true });
  });

  // Signed out is a normal state for the sign-in screen: null, not an error.
  app.get("/api/auth/me", async (c) => {
    const p = c.get("principal");
    return c.json(p ? await auth.me(p) : null);
  });

  app.post("/api/auth/tenant", async (c) => {
    const input = await json(c, z.object({ tenantId: z.string() }));
    const p = principalOf(c);
    await auth.switchTenant(p, input.tenantId);
    return c.json(await auth.me((await auth.resolveSession(getCookie(c, cookieName(auth)) ?? "")) ?? p));
  });

  // ------------------------------------------------------------ organizations
  app.post("/api/tenants", async (c) => {
    const p = principalOf(c);
    if (p.kind !== "user") throw new ForbiddenError("API tokens cannot create organizations");
    if (p.session.tenantScope) throw new ForbiddenError("Sessions from an organization's SSO cannot create other organizations");
    const input = await json(c, z.object({ name: z.string().min(1).max(120) }));
    const tenant = await auth.createTenant(input.name, p.user, p);
    await auth.switchTenant(p, tenant.id);
    return c.json(tenant, 201);
  });

  const t = tenantAccess(auth);
  app.use("/api/tenants/:tenant", t);
  app.use("/api/tenants/:tenant/*", t);

  app.get("/api/tenants/:tenant", async (c) => {
    const tenant = await auth.tenant(c.get("tenantId"));
    return c.json({ ...tenant, role: c.get("role") });
  });

  app.patch("/api/tenants/:tenant", need("tenant.manage"), async (c) => {
    const input = await json(c, z.object({ name: z.string().min(1).max(120).optional(), settings: z.object({ requireSso: z.boolean().optional() }).optional() }));
    if (input.settings) requireCapability(c, "tenant.own");
    return c.json(await auth.updateTenant(c.get("tenantId"), input, principalOf(c)));
  });

  app.get("/api/tenants/:tenant/members", async (c) => c.json(await auth.members(c.get("tenantId"))));

  app.post("/api/tenants/:tenant/members", need("tenant.manage"), async (c) => {
    const input = await json(c, z.object({ email: z.string().max(200), name: z.string().max(120).optional(), role: RoleSchema }));
    return c.json(await auth.addMember(c.get("tenantId"), input, principalOf(c)), 201);
  });

  app.patch("/api/tenants/:tenant/members/:userId", need("tenant.manage"), async (c) => {
    const input = await json(c, z.object({ role: RoleSchema }));
    return c.json(await auth.setRole(c.get("tenantId"), c.req.param("userId"), input.role, principalOf(c)));
  });

  app.delete("/api/tenants/:tenant/members/:userId", need("tenant.manage"), async (c) => {
    await auth.removeMember(c.get("tenantId"), c.req.param("userId"), principalOf(c));
    return c.body(null, 204);
  });

  app.get("/api/tenants/:tenant/tokens", need("tenant.manage"), async (c) => c.json(await auth.svc.store.identity.apiTokens.forTenant(c.get("tenantId"))));

  app.post("/api/tenants/:tenant/tokens", need("tenant.manage"), async (c) => {
    const input = await json(c, z.object({ name: z.string().min(1).max(120), role: RoleSchema, expiresInDays: z.number().int().min(1).max(730).optional() }));
    const { token, record } = await auth.createApiToken(c.get("tenantId"), input, principalOf(c));
    // The token is shown once; only its hash is stored.
    return c.json({ ...record, token }, 201);
  });

  app.delete("/api/tenants/:tenant/tokens/:id", need("tenant.manage"), async (c) => {
    await auth.revokeApiToken(c.get("tenantId"), c.req.param("id"), principalOf(c));
    return c.body(null, 204);
  });

  const SsoShared = {
    name: z.string().max(120).default("Single sign-on"),
    domains: z.array(z.string().max(200)).min(1).max(50),
    jitProvisioning: z.boolean().optional(),
    defaultRole: RoleSchema.optional(),
    enabled: z.boolean().optional(),
  };
  const OidcCreate = z.object({ protocol: z.literal("oidc").optional(), ...SsoShared, issuer: z.string().min(1).max(500), clientId: z.string().min(1).max(300), clientSecret: z.string().max(2000).optional() });
  const SamlCreate = z.object({ protocol: z.literal("saml"), ...SsoShared, metadataXml: z.string().min(1).max(METADATA_MAX) });
  // An update changes only the fields it sends (no defaults: a missing name keeps the current one).
  const SsoPatch = z.object({
    name: z.string().max(120),
    domains: SsoShared.domains,
    jitProvisioning: z.boolean(),
    defaultRole: RoleSchema,
    enabled: z.boolean(),
    issuer: z.string().min(1).max(500),
    clientId: z.string().min(1).max(300),
    clientSecret: z.string().max(2000),
    metadataXml: z.string().min(1).max(METADATA_MAX),
  }).partial();

  app.get("/api/tenants/:tenant/sso", need("tenant.manage"), async (c) =>
    c.json({
      redirectUri: auth.redirectUri,
      domainRechecks: auth.domainRecheckSchedule,
      connections: await auth.describeConnections(await auth.svc.store.identity.sso.forTenant(c.get("tenantId"))),
    }),
  );

  app.post("/api/tenants/:tenant/sso", need("tenant.manage"), async (c) => {
    const body = await json(c, z.looseObject({ protocol: z.enum(["oidc", "saml"]).optional() }));
    const input: SsoConnectionInput = body.protocol === "saml" ? parse(SamlCreate, body) : parse(OidcCreate, body);
    return c.json(await auth.describeConnection(await auth.upsertSsoConnection(c.get("tenantId"), input, principalOf(c))), 201);
  });

  app.post("/api/tenants/:tenant/sso/saml/preview", need("tenant.own"), async (c) => {
    const input = await json(c, z.object({ metadataXml: z.string().min(1).max(METADATA_MAX) }));
    return c.json(await auth.previewSamlMetadata(c.get("tenantId"), input.metadataXml, principalOf(c)));
  });

  app.patch("/api/tenants/:tenant/sso/:id", need("tenant.manage"), async (c) => {
    const { metadataXml, issuer, clientId, clientSecret, ...rest } = await json(c, SsoPatch);
    const existing = await auth.svc.store.identity.sso.get(c.req.param("id"));
    if (!existing || existing.tenantId !== c.get("tenantId")) throw new NotFoundError("SSO connection not found");
    const shared = { name: existing.name, domains: existing.domains, jitProvisioning: existing.jitProvisioning, defaultRole: existing.defaultRole, enabled: existing.enabled, ...rest };
    let input: SsoConnectionInput;
    if (protocolOf(existing) === "saml") {
      if (issuer !== undefined || clientId !== undefined || clientSecret !== undefined) throw new ValidationError("A SAML connection has no issuer or client: paste new metadata to change its provider");
      input = { protocol: "saml", ...shared, metadataXml };
    } else {
      if (metadataXml !== undefined) throw new ValidationError("An OpenID Connect connection takes no SAML metadata");
      input = { protocol: "oidc", ...shared, issuer: issuer ?? existing.issuer ?? "", clientId: clientId ?? existing.clientId ?? "", clientSecret };
    }
    return c.json(await auth.describeConnection(await auth.upsertSsoConnection(c.get("tenantId"), { ...input, id: existing.id }, principalOf(c))));
  });

  // Checks the domain's TXT record now; admins may, since proving a domain chooses no provider.
  app.post("/api/tenants/:tenant/sso/:id/domains/:domain/verify", need("tenant.manage"), async (c) =>
    c.json(await auth.describeConnection(await auth.verifySsoDomain(c.get("tenantId"), c.req.param("id"), c.req.param("domain"), principalOf(c)))),
  );

  app.delete("/api/tenants/:tenant/sso/:id", need("tenant.manage"), async (c) => {
    await auth.deleteSsoConnection(c.get("tenantId"), c.req.param("id"), principalOf(c));
    return c.body(null, 204);
  });

  app.get("/api/tenants/:tenant/activity", need("workspace.export"), async (c) =>
    c.json(await auth.svc.store.activity.recent(c.get("tenantId"), limitParam(c.req.query("limit"), 100, 500))),
  );
  app.get("/api/tenants/:tenant/activity/verify", need("workspace.export"), async (c) => c.json(await auth.svc.verifyAuditTrail(c.get("tenantId"))));
}
