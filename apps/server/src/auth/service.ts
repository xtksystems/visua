/**
 * Identity and access: organizations (tenants), members and roles, sessions,
 * API tokens, per-organization SSO connections and the OpenID Connect login
 * flow (authorization code + PKCE, state and nonce).
 *
 * Tenant separation rules:
 * - Every workspace belongs to one organization; access to it is the member's
 *   role in that organization, and nothing else.
 * - A session created through an organization's own SSO connection is scoped
 *   to that organization, so an identity provider configured by one tenant can
 *   never grant access to another tenant's data.
 * - An organization can require its own SSO for every session that touches it.
 */
import { randomBytes } from "node:crypto";
import { Resolver } from "node:dns/promises";
import * as oidc from "openid-client";
import { ROLE_CAPABILITIES, can, newId, roleRank, slugify, type Capability, type Membership, type Role, type Tenant, type TenantSettings, type User } from "@visua/core";
import type { ApiTokenRecord, DomainVerification, SessionRecord, SsoConnection } from "../storage/index.ts";
import { DEFAULT_TENANT_ID } from "../storage/index.ts";
import { NotFoundError, ValidationError, type Principal as AuditPrincipal, type VisuaService } from "../services/visua.ts";
import type { AuthConfig } from "./config.ts";
import { applyOutcome, classifyLookup, standingOf, type LookupOutcome, type RecheckEvent } from "./domain-recheck.ts";
import { randomToken, safeEqual, seal, sha256, unseal } from "./crypto.ts";
import { guardedFetch, privateAddressCause, privateHostAllowed, refusedLiteral } from "./egress.ts";

export class UnauthorizedError extends Error {}
export class ForbiddenError extends Error {}

export type Principal =
  | { kind: "user"; id: string; label: string; user: User; session: SessionRecord; sessionHash: string }
  | { kind: "token"; id: string; label: string; token: ApiTokenRecord };

export const PLATFORM = "platform";
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const now = () => new Date().toISOString();
const addMinutes = (min: number, from = Date.now()) => new Date(from + min * 60_000).toISOString();

export const userLabel = (u: Pick<User, "name" | "email">) => `${u.name} <${u.email}>`;

export interface SsoConnectionInput {
  name: string;
  issuer: string;
  clientId: string;
  clientSecret?: string;
  domains: string[];
  jitProvisioning?: boolean;
  defaultRole?: Role;
  enabled?: boolean;
}

/** The TXT record that proves control of a domain for one SSO connection. */
export const challengeRecord = (domain: string, token: string) => ({ name: `_visua-challenge.${domain}`, value: `visua-domain-verification=${token}` });

/** The domains a connection has proven: the only ones that route sign-ins and admit people. */
export const verifiedDomains = (c: SsoConnection) => c.domains.filter((d) => !!c.verification?.[d]?.verifiedAt);

/**
 * What the API returns for an SSO connection: never the secret; each domain with its status and
 * record. `owners` names, for the connection's lapsed domains, the connection that has proven
 * each one since (AuthService.describeConnection looks them up).
 */
export const publicConnection = (c: SsoConnection, owners: Record<string, string | undefined> = {}) => {
  const { clientSecretSealed, verification, ...rest } = c;
  const domainStatus = c.domains.map((domain) => {
    const v = verification?.[domain];
    const standing = standingOf(v);
    return {
      domain,
      verified: !!v?.verifiedAt,
      standing,
      method: v?.method,
      verifiedAt: v?.verifiedAt,
      lastCheckedAt: v?.lastCheckedAt,
      failingSince: v?.failingSince,
      lapsesAt: v?.lapsesAt,
      lapsedAt: v?.lapsedAt,
      takenOver: standing === "lapsed" && !!owners[domain] && owners[domain] !== c.id,
      record: v ? challengeRecord(domain, v.token) : undefined,
    };
  });
  return { ...rest, hasClientSecret: !!clientSecretSealed, domainStatus };
};

const day = (iso: string | undefined) => (iso ? iso.slice(0, 10) : "");
function recheckSummary(event: RecheckEvent, domain: string, record: string, connection: string, v: DomainVerification): string {
  if (event === "failing") return `Domain ${domain}: its TXT record ${record} was not found on re-check; it lapses on ${day(v.lapsesAt)} unless the record is restored`;
  if (event === "lapsed")
    return `Domain ${domain} lapsed: its TXT record ${record} has been missing since ${day(v.failingSince)}; “${connection}” no longer admits new people from it, and another organization can prove it`;
  return `Domain ${domain}: its TXT record ${record} was found again`;
}

/** How many due domains one tick claims. */
export const RECHECK_BATCH = 25;
/** How long a claimed re-check is hidden from other instances while it is looked up. */
const LEASE_MS = 15 * 60_000;

/** TXT lookups for domain verification (replaceable in tests). */
export type ResolveTxt = (name: string) => Promise<string[][]>;
const resolveTxtWithTimeout: ResolveTxt = (name) => new Resolver({ timeout: 5000, tries: 2 }).resolveTxt(name);

export class AuthService {
  readonly svc: VisuaService;
  readonly config: AuthConfig;
  private readonly oidcConfigs = new Map<string, { config: oidc.Configuration; at: number }>();
  private readonly resolveTxt: ResolveTxt;

  constructor(svc: VisuaService, config: AuthConfig, deps: { resolveTxt?: ResolveTxt } = {}) {
    this.svc = svc;
    this.config = config;
    this.resolveTxt = deps.resolveTxt ?? resolveTxtWithTimeout;
  }

  private get ids() {
    return this.svc.store.identity;
  }

  /** Domains proven by DNS are looked up again on a schedule (VISUA_SSO_DOMAIN_RECHECK_HOURS, 0 = off). */
  get domainRechecksEnabled(): boolean {
    return this.config.ssoDomainVerification === "dns" && this.config.domainRecheckHours > 0;
  }

  /** How the organization page describes the re-check schedule. */
  get domainRecheckSchedule(): { enabled: boolean; everyHours: number } {
    return { enabled: this.domainRechecksEnabled, everyHours: this.config.domainRecheckHours };
  }

  /** A connection as the API returns it, with each lapsed domain's current holder looked up. */
  async describeConnection(c: SsoConnection): Promise<ReturnType<typeof publicConnection>> {
    const owners: Record<string, string | undefined> = {};
    for (const d of c.domains) if (c.verification?.[d]?.lapsedAt) owners[d] = await this.ids.sso.domainOwner(d);
    return publicConnection(c, owners);
  }

  async describeConnections(list: SsoConnection[]): Promise<ReturnType<typeof publicConnection>[]> {
    const out: ReturnType<typeof publicConnection>[] = [];
    for (const c of list) out.push(await this.describeConnection(c));
    return out;
  }

  private get recheckSettings() {
    return { intervalMs: this.config.domainRecheckHours * 3_600_000, graceMs: this.config.domainRecheckGraceDays * 86_400_000 };
  }

  /** Look up a domain's challenge record. Never inside a transaction. */
  private async lookupChallenge(domain: string, token: string): Promise<{ outcome: LookupOutcome; code?: string }> {
    const record = challengeRecord(domain, token);
    try {
      return classifyLookup({ records: await this.resolveTxt(record.name) }, record.value);
    } catch (error) {
      return classifyLookup({ error }, record.value);
    }
  }

  /** Organization-level audit trail: the same hash-chained log, keyed by the tenant id. */
  private async audit(tenantId: string, by: Principal | string, action: string, entity: string, entityId: string, summary: string, data?: Record<string, unknown>) {
    await this.svc.log(tenantId, typeof by === "string" ? by : by.label, action, entity, entityId, summary, data);
  }

  // -------------------------------------------------------------------------
  // Organizations, users and memberships
  // -------------------------------------------------------------------------

  async tenant(id: string): Promise<Tenant> {
    const t = await this.ids.tenants.get(id);
    if (!t) throw new NotFoundError("Organization not found");
    return t;
  }

  async createTenant(name: string, owner: User, by: Principal | string, slugHint?: string): Promise<Tenant> {
    const clean = name.trim();
    if (!clean) throw new ValidationError("An organization needs a name");
    return this.svc.store.atomic(async () => {
      let slug = slugify(slugHint ?? clean) || "org";
      await this.svc.store.lock(`tenant-slug:${slug}`);
      if (await this.ids.tenants.getBySlug(slug)) slug = `${slug}-${randomToken(3).toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 4) || "x"}`;
      const ts = now();
      const tenant: Tenant = { id: newId("tnt"), slug, name: clean, settings: {}, createdAt: ts, updatedAt: ts };
      await this.ids.tenants.put(tenant);
      await this.ids.memberships.put({ tenantId: tenant.id, userId: owner.id, role: "owner", createdAt: ts, updatedAt: ts });
      await this.audit(tenant.id, by, "created", "organization", tenant.id, `Organization “${tenant.name}” created; ${owner.name} is its owner`);
      return tenant;
    });
  }

  async updateTenant(tenantId: string, patch: { name?: string; settings?: Partial<TenantSettings> }, by: Principal): Promise<Tenant> {
    return this.svc.store.atomic(async () => {
      const t = await this.tenant(tenantId);
      if (patch.settings?.requireSso) {
        const connections = (await this.ids.sso.forTenant(tenantId)).filter((c) => c.enabled);
        if (!connections.length) throw new ValidationError("Add and enable an SSO connection before requiring SSO");
        // Verified domains route sign-ins (and lapsed ones, until another connection proves them),
        // but only a verified one can be required: a lapsed domain admits no one new.
        if (!connections.some((c) => verifiedDomains(c).length)) throw new ValidationError("Verify at least one of your SSO connection's domains before requiring SSO");
      }
      const next: Tenant = { ...t, name: patch.name?.trim() || t.name, settings: { ...t.settings, ...(patch.settings ?? {}) }, updatedAt: now() };
      await this.ids.tenants.put(next);
      await this.audit(tenantId, by, "updated", "organization", tenantId, `Organization settings updated (${Object.keys({ ...patch, ...(patch.settings ?? {}) }).filter((k) => k !== "settings").join(", ")})`);
      return next;
    });
  }

  async ensureUser(email: string, name?: string): Promise<User> {
    const normalized = email.trim().toLowerCase();
    if (!EMAIL.test(normalized)) throw new ValidationError("Enter a valid email address");
    return this.svc.store.atomic(async () => {
      await this.svc.store.lock(`user:${normalized}`);
      const existing = await this.ids.users.getByEmail(normalized);
      if (existing) return existing;
      const ts = now();
      return this.ids.users.put({ id: newId("usr"), email: normalized, name: name?.trim() || normalized.split("@")[0]!, createdAt: ts, updatedAt: ts });
    });
  }

  async members(tenantId: string) {
    return (await this.ids.memberships.forTenant(tenantId)).map(({ membership, user }) => ({ ...user, role: membership.role, memberSince: membership.createdAt }));
  }

  /** Nobody grants a role above their own; only owners manage owners. */
  private assertCanGrant(actorRole: Role | undefined, role: Role) {
    if (!actorRole || !can(actorRole, "tenant.manage")) throw new ForbiddenError("Managing members requires the admin or owner role");
    if (role === "owner" && actorRole !== "owner") throw new ForbiddenError("Only owners can grant the owner role");
    if (roleRank(role) > roleRank(actorRole)) throw new ForbiddenError("You cannot grant a role above your own");
  }

  async addMember(tenantId: string, input: { email: string; name?: string; role: Role }, by: Principal): Promise<Membership> {
    const actorRole = await this.roleIn(by, tenantId);
    this.assertCanGrant(actorRole, input.role);
    return this.svc.store.atomic(async () => {
      await this.svc.store.lock(`ws:${tenantId}`);
      const user = await this.ensureUser(input.email, input.name);
      const existing = await this.ids.memberships.get(tenantId, user.id);
      if (existing) throw new ValidationError(`${user.email} is already a member (${existing.role})`);
      const ts = now();
      const m = await this.ids.memberships.put({ tenantId, userId: user.id, role: input.role, addedBy: by.id, createdAt: ts, updatedAt: ts });
      await this.audit(tenantId, by, "added", "member", user.id, `${user.email} added as ${input.role}`);
      return m;
    });
  }

  /** System grant (seeding, bootstrap): no actor role check, but audited. */
  async grantMembership(tenantId: string, user: User, role: Role, by: string): Promise<Membership> {
    return this.svc.store.atomic(async () => {
      await this.svc.store.lock(`ws:${tenantId}`);
      const ts = now();
      const existing = await this.ids.memberships.get(tenantId, user.id);
      const m = await this.ids.memberships.put({ tenantId, userId: user.id, role, addedBy: by, createdAt: existing?.createdAt ?? ts, updatedAt: ts });
      await this.audit(tenantId, by, existing ? "updated" : "added", "member", user.id, `${user.email} ${existing ? "now" : "added as"} ${role}`);
      return m;
    });
  }

  async setRole(tenantId: string, userId: string, role: Role, by: Principal): Promise<Membership> {
    const actorRole = await this.roleIn(by, tenantId);
    return this.svc.store.atomic(async () => {
      await this.svc.store.lock(`ws:${tenantId}`);
      const m = await this.ids.memberships.get(tenantId, userId);
      if (!m) throw new NotFoundError("Member not found");
      this.assertCanGrant(actorRole, role);
      if (m.role === "owner" && actorRole !== "owner") throw new ForbiddenError("Only owners can change an owner's role");
      if (m.role === "owner" && role !== "owner" && (await this.ids.memberships.owners(tenantId)) <= 1) throw new ValidationError("An organization needs at least one owner");
      const next = await this.ids.memberships.put({ ...m, role, updatedAt: now() });
      const user = await this.ids.users.get(userId);
      await this.audit(tenantId, by, "updated", "member", userId, `${user?.email ?? userId}: ${m.role} → ${role}`);
      return next;
    });
  }

  async removeMember(tenantId: string, userId: string, by: Principal): Promise<void> {
    const actorRole = await this.roleIn(by, tenantId);
    if (!can(actorRole, "tenant.manage")) throw new ForbiddenError("Managing members requires the admin or owner role");
    await this.svc.store.atomic(async () => {
      await this.svc.store.lock(`ws:${tenantId}`);
      const m = await this.ids.memberships.get(tenantId, userId);
      if (!m) throw new NotFoundError("Member not found");
      if (m.role === "owner" && actorRole !== "owner") throw new ForbiddenError("Only owners can remove an owner");
      if (m.role === "owner" && (await this.ids.memberships.owners(tenantId)) <= 1) throw new ValidationError("An organization needs at least one owner");
      await this.ids.memberships.delete(tenantId, userId);
      const user = await this.ids.users.get(userId);
      await this.audit(tenantId, by, "removed", "member", userId, `${user?.email ?? userId} removed (was ${m.role})`);
    });
  }

  // -------------------------------------------------------------------------
  // Access
  // -------------------------------------------------------------------------

  /** The principal's role in an organization, after scope and SSO-requirement checks. */
  async roleIn(principal: Principal | undefined, tenantId: string | undefined): Promise<Role | undefined> {
    if (!principal || !tenantId) return undefined;
    if (principal.kind === "token") return principal.token.tenantId === tenantId ? principal.token.role : undefined;
    if (principal.session.tenantScope && principal.session.tenantScope !== tenantId) return undefined;
    const m = await this.ids.memberships.get(tenantId, principal.user.id);
    if (!m) return undefined;
    const tenant = await this.ids.tenants.get(tenantId);
    if (tenant?.settings.requireSso) {
      const own = (await this.ids.sso.forTenant(tenantId)).filter((c) => c.enabled).map((c) => `oidc:${c.id}`);
      if (own.length && !own.includes(principal.session.method)) return undefined;
    }
    return m.role;
  }

  async can(principal: Principal | undefined, tenantId: string | undefined, capability: Capability): Promise<boolean> {
    return can(await this.roleIn(principal, tenantId), capability);
  }

  /** Organizations this principal can use right now. */
  async organizations(principal: Principal): Promise<{ tenant: Tenant; role: Role }[]> {
    if (principal.kind === "token") {
      const tenant = await this.ids.tenants.get(principal.token.tenantId);
      return tenant ? [{ tenant, role: principal.token.role }] : [];
    }
    const out: { tenant: Tenant; role: Role }[] = [];
    for (const { tenant } of await this.ids.memberships.forUser(principal.user.id)) {
      const role = await this.roleIn(principal, tenant.id);
      if (role) out.push({ tenant, role });
    }
    return out;
  }

  /** The organization new workspaces go to and workspace lists come from. */
  async activeTenant(principal: Principal, orgs?: { tenant: Tenant; role: Role }[]): Promise<{ tenant: Tenant; role: Role } | undefined> {
    const list = orgs ?? (await this.organizations(principal));
    const wanted = principal.kind === "user" ? principal.session.activeTenantId : principal.token.tenantId;
    return list.find((o) => o.tenant.id === wanted) ?? list[0];
  }

  async me(principal: Principal) {
    const orgs = await this.organizations(principal);
    const active = await this.activeTenant(principal, orgs);
    return {
      authMode: this.config.mode,
      principal: principal.kind,
      user: principal.kind === "user" ? { id: principal.user.id, email: principal.user.email, name: principal.user.name } : { id: principal.id, email: "", name: principal.label },
      method: principal.kind === "user" ? principal.session.method : "token",
      csrf: principal.kind === "user" ? principal.session.csrf : undefined,
      tenantScope: principal.kind === "user" ? principal.session.tenantScope ?? null : principal.token.tenantId,
      activeTenant: active ? { id: active.tenant.id, slug: active.tenant.slug, name: active.tenant.name, settings: active.tenant.settings, role: active.role, capabilities: ROLE_CAPABILITIES[active.role] } : null,
      organizations: orgs.map((o) => ({ id: o.tenant.id, slug: o.tenant.slug, name: o.tenant.name, role: o.role })),
    };
  }

  // -------------------------------------------------------------------------
  // Sessions
  // -------------------------------------------------------------------------

  async createSession(user: User, method: string, opts: { tenantScope?: string; userAgent?: string } = {}): Promise<{ token: string; session: SessionRecord }> {
    if (user.disabled) throw new ForbiddenError("This account is disabled");
    const token = randomToken(32);
    const ts = now();
    const session: SessionRecord = {
      userId: user.id,
      method,
      tenantScope: opts.tenantScope,
      activeTenantId: opts.tenantScope,
      csrf: randomToken(24),
      userAgent: opts.userAgent?.slice(0, 300),
      createdAt: ts,
      lastSeenAt: ts,
      expiresAt: addMinutes(this.config.sessionHours * 60),
    };
    await this.svc.store.atomic(async () => {
      await this.ids.sessions.create(sha256(token), session);
      await this.ids.users.put({ ...user, lastLoginAt: ts, updatedAt: ts });
    });
    return { token, session };
  }

  async resolveSession(token: string, options: { touch?: boolean } = {}): Promise<Principal | undefined> {
    const hash = sha256(token);
    const session = await this.ids.sessions.get(hash);
    if (!session) return undefined;
    const t = Date.now();
    const idleLimit = new Date(session.lastSeenAt).getTime() + this.config.sessionIdleMinutes * 60_000;
    if (new Date(session.expiresAt).getTime() <= t || idleLimit <= t) {
      if (options.touch !== false) await this.ids.sessions.delete(hash);
      return undefined;
    }
    const user = await this.ids.users.get(session.userId);
    if (!user || user.disabled) return undefined;
    // Sliding idle window, written at most once a minute.
    if (options.touch !== false && t - new Date(session.lastSeenAt).getTime() > 60_000) {
      session.lastSeenAt = new Date(t).toISOString();
      await this.ids.sessions.update(hash, session);
    }
    return { kind: "user", id: user.id, label: userLabel(user), user, session, sessionHash: hash };
  }

  async endSession(principal: Principal): Promise<void> {
    if (principal.kind === "user") await this.ids.sessions.delete(principal.sessionHash);
  }

  async switchTenant(principal: Principal, tenantId: string): Promise<void> {
    if (principal.kind !== "user") throw new ValidationError("API tokens belong to one organization");
    if (!(await this.roleIn(principal, tenantId))) throw new NotFoundError("Organization not found");
    await this.ids.sessions.update(principal.sessionHash, { ...principal.session, activeTenantId: tenantId });
  }

  // -------------------------------------------------------------------------
  // API tokens
  // -------------------------------------------------------------------------

  async createApiToken(tenantId: string, input: { name: string; role: Role; expiresInDays?: number }, by: Principal): Promise<{ token: string; record: ApiTokenRecord }> {
    const actorRole = await this.roleIn(by, tenantId);
    if (!can(actorRole, "tenant.manage")) throw new ForbiddenError("Creating API tokens requires the admin or owner role");
    if (input.role === "owner") throw new ValidationError("API tokens cannot hold the owner role");
    if (roleRank(input.role) > roleRank(actorRole!)) throw new ForbiddenError("A token cannot hold a role above your own");
    const name = input.name.trim();
    if (!name) throw new ValidationError("Name the token after what uses it");
    const token = `vsa_${randomToken(32)}`;
    const ts = now();
    const record: ApiTokenRecord = {
      id: newId("tok"),
      tenantId,
      name,
      role: input.role,
      prefix: token.slice(0, 10),
      createdBy: by.id,
      createdAt: ts,
      expiresAt: input.expiresInDays ? addMinutes(input.expiresInDays * 24 * 60) : undefined,
    };
    await this.svc.store.atomic(async () => {
      await this.ids.apiTokens.create(sha256(token), record);
      await this.audit(tenantId, by, "created", "api-token", record.id, `API token “${name}” created (${input.role}${record.expiresAt ? `, expires ${record.expiresAt.slice(0, 10)}` : ""})`);
    });
    return { token, record };
  }

  async resolveApiToken(raw: string, options: { touch?: boolean } = {}): Promise<Principal | undefined> {
    if (!raw.startsWith("vsa_")) return undefined;
    const record = await this.ids.apiTokens.byHash(sha256(raw));
    if (!record || record.revokedAt || (record.expiresAt && record.expiresAt <= now())) return undefined;
    const t = Date.now();
    if (options.touch !== false && (!record.lastUsedAt || t - new Date(record.lastUsedAt).getTime() > 60_000)) await this.ids.apiTokens.touch(record.id, new Date(t).toISOString());
    return { kind: "token", id: record.id, label: `API token “${record.name}”`, token: record };
  }

  async revokeApiToken(tenantId: string, id: string, by: Principal): Promise<void> {
    if (!(await this.can(by, tenantId, "tenant.manage"))) throw new ForbiddenError("Revoking API tokens requires the admin or owner role");
    await this.svc.store.atomic(async () => {
      if (!(await this.ids.apiTokens.revoke(tenantId, id))) throw new NotFoundError("Token not found or already revoked");
      await this.audit(tenantId, by, "revoked", "api-token", id, `API token revoked`);
    });
  }

  // -------------------------------------------------------------------------
  // SSO connections
  // -------------------------------------------------------------------------

  /**
   * Create or change an SSO connection. Whoever controls a connection's identity provider
   * can sign in as any member on its domains, owners included: choosing the provider
   * (issuer, client, secret, domains) is an owner decision. Admins manage the rest.
   */
  async upsertSsoConnection(tenantId: string, input: SsoConnectionInput & { id?: string }, by: Principal): Promise<SsoConnection> {
    if (!(await this.can(by, tenantId, "tenant.manage"))) throw new ForbiddenError("Configuring SSO requires the admin or owner role");
    if (this.config.mode === "oidc" && this.config.secretIsDefault && input.clientSecret) throw new ValidationError("Set VISUA_SECRET on the server before storing SSO client secrets");
    let issuer: URL;
    try {
      issuer = new URL(input.issuer.trim());
    } catch {
      throw new ValidationError("The issuer must be a URL, e.g. https://login.example.com/");
    }
    if (issuer.protocol !== "https:" && !this.config.allowHttpIssuers) throw new ValidationError("The issuer must use https");
    // Names are checked again at every request, on the addresses they resolve to (egress.ts).
    if (refusedLiteral(issuer, privateHostAllowed(this.config.privateIssuerHosts))) {
      throw new ValidationError("The issuer is a private or local address. The server operator can allow an internal identity provider with VISUA_OIDC_PRIVATE_ISSUERS.");
    }
    const domains = [...new Set(input.domains.map((d) => d.trim().toLowerCase().replace(/^@/, "")).filter(Boolean))];
    if (!domains.length) throw new ValidationError("List at least one email domain this connection signs in");
    if (domains.some((d) => !/^[a-z0-9.-]+\.[a-z]{2,}$/.test(d))) throw new ValidationError("Email domains look like example.com");
    const role = input.defaultRole ?? "viewer";
    if (role === "owner" || role === "admin") throw new ValidationError("Provisioned members start at approver or below");
    return this.svc.store.atomic(async () => {
      await this.svc.store.lock("sso-domains");
      const existing = input.id ? await this.ids.sso.get(input.id) : undefined;
      if (input.id && (!existing || existing.tenantId !== tenantId)) throw new NotFoundError("SSO connection not found");
      const issuerUrl = issuer.toString().replace(/\/$/, "");
      const providerChanged =
        !existing || existing.issuer !== issuerUrl || existing.clientId !== input.clientId.trim() || !!input.clientSecret || existing.domains.join(",") !== domains.join(",");
      if (providerChanged && !(await this.can(by, tenantId, "tenant.own"))) {
        throw new ForbiddenError("Only owners choose an SSO connection's identity provider, client and domains: whoever controls it can sign in as any member");
      }
      const enabled = input.enabled ?? existing?.enabled ?? true;
      if (existing?.enabled && !enabled) {
        const tenant = await this.tenant(tenantId);
        const others = (await this.ids.sso.forTenant(tenantId)).filter((c) => c.enabled && c.id !== existing.id);
        if (tenant.settings.requireSso && !others.length) throw new ValidationError("Turn off “Require SSO” before disabling the last connection");
      }
      // Pending claims from different organizations can coexist (a claim alone proves nothing);
      // a verified one is final, and an organization lists each domain on one connection.
      for (const d of domains) {
        for (const claim of await this.ids.sso.claimants(d)) {
          if (claim.connectionId === existing?.id) continue;
          if (claim.verified) throw new ValidationError(`The domain ${d} is verified by another SSO connection`);
          if (claim.tenantId === tenantId) throw new ValidationError(`The domain ${d} is already listed on another of this organization's SSO connections`);
        }
      }
      const ts = now();
      // Each domain keeps its challenge (and proof) while it stays listed; a new one gets a fresh
      // challenge, or is trusted as claimed when the operator turned verification off.
      const trusted = this.config.ssoDomainVerification === "off";
      const verification: Record<string, DomainVerification> = {};
      for (const d of domains) {
        verification[d] = existing?.verification?.[d] ?? { token: randomBytes(16).toString("hex"), ...(trusted ? { verifiedAt: ts, method: "trusted" as const } : {}) };
      }
      // A stored secret belongs to its provider: a new issuer or client needs its own.
      const samePartner = !!existing && existing.issuer === issuerUrl && existing.clientId === input.clientId.trim();
      const connection: SsoConnection = {
        id: existing?.id ?? newId("sso"),
        tenantId,
        name: input.name.trim() || "Single sign-on",
        issuer: issuerUrl,
        clientId: input.clientId.trim(),
        clientSecretSealed: input.clientSecret ? seal(input.clientSecret, this.config.secret) : samePartner ? existing.clientSecretSealed : undefined,
        domains,
        verification,
        jitProvisioning: input.jitProvisioning ?? existing?.jitProvisioning ?? false,
        defaultRole: role,
        enabled,
        createdAt: existing?.createdAt ?? ts,
        updatedAt: ts,
      };
      if (!connection.clientId) throw new ValidationError("The client id is required");
      await this.ids.sso.put(connection);
      this.oidcConfigs.delete(connection.id);
      const pending = domains.filter((d) => !verification[d]!.verifiedAt);
      await this.audit(
        tenantId,
        by,
        existing ? "updated" : "created",
        "sso-connection",
        connection.id,
        `SSO connection “${connection.name}” ${existing ? "updated" : "added"} for ${domains.join(", ")}${pending.length ? ` (awaiting DNS verification: ${pending.join(", ")})` : ""}`,
      );
      return connection;
    });
  }

  /**
   * Prove a connection's domain: its TXT record `_visua-challenge.<domain>` must carry the
   * connection's token. Only then are the domain's people routed to the connection and
   * admitted by it. DNS is asked outside any transaction; the result is recorded under the
   * domain lock, and the first organization to prove a domain holds it.
   */
  async verifySsoDomain(tenantId: string, id: string, domain: string, by: Principal): Promise<SsoConnection> {
    if (!(await this.can(by, tenantId, "tenant.manage"))) throw new ForbiddenError("Verifying SSO domains requires the admin or owner role");
    const d = domain.trim().toLowerCase();
    const before = await this.ids.sso.get(id);
    if (!before || before.tenantId !== tenantId) throw new NotFoundError("SSO connection not found");
    const challenge = before.verification?.[d];
    if (!before.domains.includes(d) || !challenge) throw new NotFoundError(`${d} is not one of this connection's domains`);
    if (challenge.verifiedAt && !challenge.failingSince) return before;
    const record = challengeRecord(d, challenge.token);
    const { outcome, code } = await this.lookupChallenge(d, challenge.token);
    if (outcome === "unknown") throw new ValidationError(`The DNS lookup of ${record.name} failed (${code ?? "error"}). Try again in a moment.`);
    if (outcome === "missing") throw new ValidationError(`No TXT record ${record.name} with the value ${record.value} was found. DNS changes can take a while to appear: try again later.`);
    return this.svc.store.atomic(async () => {
      await this.svc.store.lock("sso-domains");
      const c = await this.ids.sso.get(id);
      const current = c?.verification?.[d];
      if (!c || c.tenantId !== tenantId || !c.domains.includes(d) || current?.token !== challenge.token) {
        throw new ValidationError("The connection changed while its domain was being verified. Try again.");
      }
      const owner = await this.ids.sso.domainOwner(d);
      if (owner && owner !== c.id) throw new ValidationError(`The domain ${d} is verified by another SSO connection`);
      const ts = now();
      const { failingSince, lapsesAt, lapsedAt, ...kept } = current;
      const next: SsoConnection = {
        ...c,
        verification: {
          ...c.verification,
          // With re-checks off the schedule is still written, a day ahead, so turning them on later picks the domain up.
          [d]: { ...kept, verifiedAt: ts, method: "dns", lastCheckedAt: ts, nextCheckAt: new Date(Date.now() + (this.recheckSettings.intervalMs || 86_400_000)).toISOString() },
        },
        updatedAt: ts,
      };
      await this.ids.sso.put(next);
      await this.audit(tenantId, by, "verified", "sso-domain", c.id, `Domain ${d} verified by DNS for SSO connection “${c.name}”`, { domain: d, record: record.name });
      return next;
    });
  }

  /**
   * Re-check SSO domains proven by DNS that are due at `at` (every server instance calls this
   * from its ticker). Claims up to RECHECK_BATCH due domains under the domain lock, pushing each
   * one's next check out by a lease so other instances skip it; looks each up outside any
   * transaction; records each result in its own transaction. Returns how many were claimed.
   */
  async recheckDueDomains(at: Date = new Date()): Promise<number> {
    if (!this.domainRechecksEnabled) return 0;
    const lease = new Date(at.getTime() + LEASE_MS).toISOString();
    const claimed = await this.svc.store.atomic(async () => {
      await this.svc.store.lock("sso-domains");
      const out: { connectionId: string; domain: string; token: string }[] = [];
      for (const due of await this.ids.sso.dueForRecheck(at.toISOString(), RECHECK_BATCH)) {
        const c = await this.ids.sso.get(due.connectionId);
        const v = c?.verification?.[due.domain];
        if (!c || !v) continue;
        // A lapsed domain another connection has proven is not looked up while that one holds it;
        // it is looked at again an interval later, so it can recover once the holder is gone.
        const owner = v.lapsedAt ? await this.ids.sso.domainOwner(due.domain) : undefined;
        const held = !!owner && owner !== c.id;
        const nextCheckAt = held ? new Date(at.getTime() + this.recheckSettings.intervalMs).toISOString() : lease;
        await this.ids.sso.put({ ...c, verification: { ...c.verification, [due.domain]: { ...v, nextCheckAt } } });
        if (!held) out.push({ connectionId: c.id, domain: due.domain, token: v.token });
      }
      return out;
    });
    for (const claim of claimed) await this.recordRecheck(claim, (await this.lookupChallenge(claim.domain, claim.token)).outcome, at);
    return claimed.length;
  }

  private async recordRecheck(claim: { connectionId: string; domain: string; token: string }, outcome: LookupOutcome, at: Date): Promise<void> {
    await this.svc.store.atomic(async () => {
      await this.svc.store.lock("sso-domains");
      const c = await this.ids.sso.get(claim.connectionId);
      const v = c?.verification?.[claim.domain];
      // The connection changed while the domain was looked up: this answer is about an old challenge.
      if (!c || !v || !c.domains.includes(claim.domain) || v.token !== claim.token) return;
      if (outcome === "found" && v.lapsedAt) {
        const owner = await this.ids.sso.domainOwner(claim.domain);
        if (owner && owner !== c.id) return;
      }
      const { next, event } = applyOutcome(v, outcome, at, this.recheckSettings);
      await this.ids.sso.put({ ...c, verification: { ...c.verification, [claim.domain]: next } });
      if (event) {
        const record = challengeRecord(claim.domain, v.token);
        await this.audit(c.tenantId, "Domain re-check", event, "sso-domain", c.id, recheckSummary(event, claim.domain, record.name, c.name, next), { domain: claim.domain, record: record.name });
      }
    });
  }

  async deleteSsoConnection(tenantId: string, id: string, by: Principal): Promise<void> {
    if (!(await this.can(by, tenantId, "tenant.own"))) throw new ForbiddenError("Only owners remove an SSO connection");
    await this.svc.store.atomic(async () => {
      // A re-check holding this lock may be about to write the connection back: wait for it.
      await this.svc.store.lock("sso-domains");
      const tenant = await this.tenant(tenantId);
      const remaining = (await this.ids.sso.forTenant(tenantId)).filter((c) => c.enabled && c.id !== id);
      if (tenant.settings.requireSso && !remaining.length) throw new ValidationError("Turn off “Require SSO” before removing the last connection");
      if (!(await this.ids.sso.delete(tenantId, id))) throw new NotFoundError("SSO connection not found");
      this.oidcConfigs.delete(id);
      await this.audit(tenantId, by, "deleted", "sso-connection", id, `SSO connection removed`);
    });
  }

  /** Where an email address signs in: its organization's SSO, else the platform provider. */
  async discover(email: string): Promise<{ connection: string; name: string } | undefined> {
    const domain = email.trim().toLowerCase().split("@")[1];
    const c = domain ? await this.ids.sso.byDomain(domain) : undefined;
    if (c?.enabled) return { connection: c.id, name: c.name };
    if (this.config.platform) return { connection: PLATFORM, name: this.config.platform.name };
    return undefined;
  }

  // -------------------------------------------------------------------------
  // OpenID Connect
  // -------------------------------------------------------------------------

  get redirectUri(): string {
    return `${this.config.publicUrl}/api/auth/oidc/callback`;
  }

  private async oidcFor(connectionId: string): Promise<{ config: oidc.Configuration; connection?: SsoConnection }> {
    const connection = connectionId === PLATFORM ? undefined : await this.ids.sso.get(connectionId);
    if (connectionId !== PLATFORM && (!connection || !connection.enabled)) throw new UnauthorizedError("This SSO connection is not available");
    const settings = connection
      ? { issuer: connection.issuer, clientId: connection.clientId, clientSecret: connection.clientSecretSealed ? unseal(connection.clientSecretSealed, this.config.secret) : undefined }
      : this.config.platform;
    if (!settings) throw new UnauthorizedError("No identity provider is configured");
    const cached = this.oidcConfigs.get(connectionId);
    if (cached && Date.now() - cached.at < 3_600_000) return { config: cached.config, connection };
    const execute = this.config.allowHttpIssuers ? [oidc.allowInsecureRequests] : [];
    const auth = settings.clientSecret ? oidc.ClientSecretPost(settings.clientSecret) : oidc.None();
    // An organization's provider is chosen by its owner: its requests may not reach private
    // addresses. The platform provider is the operator's own configuration.
    const fetchOptions = connection ? { [oidc.customFetch]: guardedFetch(privateHostAllowed(this.config.privateIssuerHosts)) } : {};
    const config = await explained(oidc.discovery(new URL(settings.issuer), settings.clientId, undefined, auth, { execute, ...fetchOptions }));
    this.oidcConfigs.set(connectionId, { config, at: Date.now() });
    return { config, connection };
  }

  /**
   * Build the authorization request and remember its state, nonce and PKCE verifier
   * (single use, 10 minutes), bound to the browser that started it: `browser` is the
   * value of a pre-auth cookie only that browser holds.
   */
  async startLogin(connectionId: string, returnTo = "/", browser = ""): Promise<URL> {
    if (!browser) throw new UnauthorizedError("Sign-in could not be started in this browser");
    const { config } = await this.oidcFor(connectionId);
    const state = oidc.randomState();
    const nonce = oidc.randomNonce();
    const codeVerifier = oidc.randomPKCECodeVerifier();
    await this.ids.loginFlows.purgeExpired();
    await this.ids.loginFlows.put(sha256(state), { connection: connectionId, codeVerifier, nonce, returnTo: safeReturnTo(returnTo), binding: sha256(browser), createdAt: now() }, addMinutes(10));
    return oidc.buildAuthorizationUrl(config, {
      redirect_uri: this.redirectUri,
      scope: "openid email profile",
      state,
      nonce,
      code_challenge: await oidc.calculatePKCECodeChallenge(codeVerifier),
      code_challenge_method: "S256",
    });
  }

  /** Complete the flow: verify the response, map the identity to a member, and open a session. */
  async finishLogin(callback: URL, userAgent?: string, browser = ""): Promise<{ token: string; returnTo: string }> {
    const state = callback.searchParams.get("state");
    if (!state) throw new UnauthorizedError("The sign-in response has no state");
    const flow = await this.ids.loginFlows.take(sha256(state));
    if (!flow) throw new UnauthorizedError("This sign-in link expired or was already used. Start again.");
    // A sign-in finishes only in the browser that started it (no login CSRF with a captured callback URL).
    if (!flow.binding || !browser || !safeEqual(flow.binding, sha256(browser))) throw new UnauthorizedError("This sign-in was started in another browser. Start again.");
    const idpError = callback.searchParams.get("error");
    if (idpError) throw new UnauthorizedError(`The identity provider refused the sign-in (${idpError})`);
    const { config, connection } = await this.oidcFor(flow.connection);
    const tokens = await explained(
      oidc.authorizationCodeGrant(
        config,
        new URL(`${this.redirectUri}${callback.search}`),
        { pkceCodeVerifier: flow.codeVerifier, expectedState: state, expectedNonce: flow.nonce, idTokenExpected: true },
      ),
    );
    const claims = tokens.claims();
    if (!claims) throw new UnauthorizedError("The identity provider returned no ID token");
    const email = typeof claims["email"] === "string" ? claims["email"].trim().toLowerCase() : undefined;
    // The platform provider's sessions reach every organization: its email must be verified
    // explicitly (VISUA_OIDC_TRUST_EMAIL=1 for providers that verify without saying so). An
    // organization's own provider only reaches that organization; it must not deny it.
    const emailVerified = claims["email_verified"] === true || (claims["email_verified"] === undefined && (!!connection || this.config.trustPlatformEmail));
    const displayName =
      (typeof claims["name"] === "string" && claims["name"]) ||
      [claims["given_name"], claims["family_name"]].filter((x) => typeof x === "string").join(" ") ||
      email?.split("@")[0] ||
      "Member";
    const user = await this.svc.store.atomic(() => this.resolveIdentity({ issuer: claims.iss, subject: claims.sub, email, emailVerified, name: displayName }, connection));
    const method = connection ? `oidc:${connection.id}` : `oidc:${PLATFORM}`;
    const { token } = await this.createSession(user, method, { tenantScope: connection?.tenantId, userAgent });
    return { token, returnTo: flow.returnTo };
  }

  private async resolveIdentity(id: { issuer: string; subject: string; email?: string; emailVerified: boolean; name: string }, connection?: SsoConnection): Promise<User> {
    await this.svc.store.lock(`identity:${id.issuer}|${id.subject}`);
    const linked = await this.ids.identities.find(id.issuer, id.subject);
    let user = linked ? await this.ids.users.get(linked.userId) : undefined;
    if (!user) {
      if (!id.email || !id.emailVerified) throw new ForbiddenError("Your identity provider did not share a verified email address");
      // A connection admits new people only from domains its organization has proven.
      const proven = connection ? verifiedDomains(connection) : [];
      const emailDomain = id.email.split("@")[1]!;
      if (connection && !proven.includes(emailDomain)) {
        if (connection.domains.includes(emailDomain) && connection.verification?.[emailDomain]?.lapsedAt) {
          throw new ForbiddenError(`This sign-in no longer admits new people from ${emailDomain}: its DNS proof has lapsed. Ask an administrator of your organization.`);
        }
        throw new ForbiddenError(proven.length ? `This sign-in is for ${proven.join(", ")} addresses` : "This SSO connection has no verified email domain yet");
      }
      user = await this.ids.users.getByEmail(id.email);
      if (!user && connection?.jitProvisioning) user = await this.ensureUser(id.email, id.name);
      if (!user) throw new ForbiddenError("You have no access to Visua yet. Ask an administrator of your organization to add you.");
      await this.ids.identities.link(id.issuer, id.subject, user.id, id.email);
    } else {
      await this.ids.identities.link(id.issuer, id.subject, user.id, id.email);
    }
    if (user.disabled) throw new ForbiddenError("This account is disabled");
    if (connection) {
      const membership = await this.ids.memberships.get(connection.tenantId, user.id);
      if (!membership) {
        if (!connection.jitProvisioning) throw new ForbiddenError("You are not a member of this organization. Ask an administrator to add you.");
        const ts = now();
        await this.ids.memberships.put({ tenantId: connection.tenantId, userId: user.id, role: connection.defaultRole, addedBy: `sso:${connection.id}`, createdAt: ts, updatedAt: ts });
        await this.audit(connection.tenantId, `SSO “${connection.name}”`, "provisioned", "member", user.id, `${user.email} provisioned on first sign-in as ${connection.defaultRole}`);
      }
    } else if (!(await this.ids.memberships.forUser(user.id)).length) {
      throw new ForbiddenError("You have no access to Visua yet. Ask an administrator of your organization to add you.");
    }
    // A provider names the people it signs in for the first time, but an organization's own
    // provider never renames someone who also belongs to other organizations.
    if (id.name && id.name !== user.name && !linked) {
      const elsewhere = connection && (await this.ids.memberships.forUser(user.id)).some((m) => m.tenant.id !== connection.tenantId);
      if (!elsewhere) user = await this.ids.users.put({ ...user, name: id.name, updatedAt: now() });
    }
    return user;
  }

  // -------------------------------------------------------------------------
  // Developer sign-in and bootstrap
  // -------------------------------------------------------------------------

  /** Password-less sign-in for local development and demos. Refused unless VISUA_AUTH_MODE=dev. */
  async devLogin(email: string, name?: string, userAgent?: string): Promise<{ token: string; user: User }> {
    if (this.config.mode !== "dev") throw new ForbiddenError("Developer sign-in is disabled on this server");
    const user = await this.svc.store.atomic(async () => {
      const u = await this.ensureUser(email, name);
      if ((await this.ids.memberships.forUser(u.id)).length) return u;
      // First sign-in: claim an unowned default organization (an upgraded single-user install), else start a new one.
      const def = await this.ids.tenants.get(DEFAULT_TENANT_ID);
      if (def && (await this.ids.memberships.owners(def.id)) === 0) {
        const ts = now();
        await this.ids.memberships.put({ tenantId: def.id, userId: u.id, role: "owner", createdAt: ts, updatedAt: ts });
        await this.audit(def.id, userLabel(u), "claimed", "organization", def.id, `${u.email} became the owner of “${def.name}”`);
      } else {
        await this.createTenant(`${u.name}'s organization`, u, userLabel(u));
      }
      return u;
    });
    const { token } = await this.createSession(user, "dev", { userAgent });
    return { token, user };
  }

  /** Personas offered on the developer sign-in screen. */
  async devPersonas(limit = 16): Promise<{ email: string; name: string; organizations: { name: string; role: Role }[] }[]> {
    if (this.config.mode !== "dev") return [];
    const out: { email: string; name: string; organizations: { name: string; role: Role }[] }[] = [];
    for (const tenant of await this.ids.tenants.list()) {
      for (const { user, membership } of await this.ids.memberships.forTenant(tenant.id)) {
        let entry = out.find((p) => p.email === user.email);
        if (!entry) {
          if (out.length >= limit) continue;
          entry = { email: user.email, name: user.name, organizations: [] };
          out.push(entry);
        }
        entry.organizations.push({ name: tenant.name, role: membership.role });
      }
    }
    return out;
  }

  /** Startup: give an unowned organization its first owner, or create the first organization. */
  async bootstrap(): Promise<void> {
    const email = this.config.bootstrapOwnerEmail;
    if (!email) return;
    await this.svc.store.atomic(async () => {
      await this.svc.store.lock("bootstrap");
      const user = await this.ensureUser(email);
      const tenants = await this.ids.tenants.list();
      for (const t of tenants) {
        if ((await this.ids.memberships.owners(t.id)) === 0) {
          const ts = now();
          await this.ids.memberships.put({ tenantId: t.id, userId: user.id, role: "owner", createdAt: ts, updatedAt: ts });
          await this.audit(t.id, "bootstrap", "added", "member", user.id, `${user.email} added as owner (VISUA_BOOTSTRAP_OWNER_EMAIL)`);
        }
      }
      if (!tenants.length) await this.createTenant(this.config.bootstrapOrgName, user, "bootstrap");
    });
  }

  /** The principal as recorded in the audit trail. */
  static auditPrincipal(p: Principal): AuditPrincipal {
    return { id: p.id, label: p.label };
  }
}

/** A request refused for its address becomes a sign-in error that says why. */
async function explained<T>(request: Promise<T>): Promise<T> {
  try {
    return await request;
  } catch (err) {
    const refused = privateAddressCause(err);
    if (refused) throw new UnauthorizedError(refused.message);
    throw err;
  }
}

/**
 * Only same-site relative paths: never an open redirect. Browsers drop tabs and line
 * breaks from URLs and read backslashes as slashes, so "/\t/evil.example" or
 * "/\\evil.example" would leave the site: such paths fall back to "/".
 */
export function safeReturnTo(value: string | undefined): string {
  if (!value || !/^\/(?![\/\\])[^\s\\\x00-\x1f\x7f]*$/.test(value)) return "/";
  return value.slice(0, 500);
}
