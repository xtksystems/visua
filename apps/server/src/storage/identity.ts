/**
 * Tenancy and identity persistence: organizations, users, memberships,
 * federated identities, sessions, API tokens and SSO connections. Secrets
 * (session ids, API tokens, OIDC state) are stored only as SHA-256 hashes.
 */
import type { Membership, Role, Tenant, User } from "@visua/core";
import { parseJson } from "./driver.ts";
import { Repo, type StoreContext } from "./repo.ts";

type DataRow = { data: unknown };
const now = () => new Date().toISOString();

export interface SessionRecord {
  userId: string;
  /** Tenant selected for listing and creating workspaces. */
  activeTenantId?: string;
  /** When set, the session may only access this tenant (login through that tenant's SSO). */
  tenantScope?: string;
  /** "dev", "oidc:platform", "oidc:<connectionId>". */
  method: string;
  csrf: string;
  userAgent?: string;
  ip?: string;
  createdAt: string;
  expiresAt: string;
  lastSeenAt: string;
}

export interface ApiTokenRecord {
  id: string;
  tenantId: string;
  name: string;
  role: Role;
  /** First characters of the token, for recognition in lists. */
  prefix: string;
  createdBy: string;
  createdAt: string;
  expiresAt?: string;
  revokedAt?: string;
  lastUsedAt?: string;
}

export interface SsoConnection {
  id: string;
  tenantId: string;
  name: string;
  issuer: string;
  clientId: string;
  /** AES-256-GCM sealed with the server secret; never returned by the API. */
  clientSecretSealed?: string;
  domains: string[];
  /** Create a membership on first login for users of the connection's domains. */
  jitProvisioning: boolean;
  defaultRole: Role;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LoginFlow {
  /** "platform" or an SSO connection id. */
  connection: string;
  codeVerifier: string;
  nonce: string;
  returnTo: string;
  createdAt: string;
}

class Tenants extends Repo {
  async get(id: string): Promise<Tenant | undefined> {
    const [row] = await this.db.query<DataRow>(`SELECT data FROM tenants WHERE id = ?`, [id]);
    return row ? parseJson<Tenant>(row.data) : undefined;
  }
  async getBySlug(slug: string): Promise<Tenant | undefined> {
    const [row] = await this.db.query<DataRow>(`SELECT data FROM tenants WHERE slug = ?`, [slug]);
    return row ? parseJson<Tenant>(row.data) : undefined;
  }
  async list(): Promise<Tenant[]> {
    return (await this.db.query<DataRow>(`SELECT data FROM tenants ORDER BY created_at ASC`)).map((r) => parseJson<Tenant>(r.data));
  }
  async count(): Promise<number> {
    const [row] = await this.db.query<{ n: number }>(`SELECT COUNT(*) AS n FROM tenants`);
    return Number(row?.n ?? 0);
  }
  async put(t: Tenant): Promise<Tenant> {
    await this.db.execute(
      `INSERT INTO tenants (id, slug, data, created_at, updated_at) VALUES (?, ?, ${this.J}, ?, ?)
       ON CONFLICT (id) DO UPDATE SET slug = excluded.slug, data = excluded.data, updated_at = excluded.updated_at`,
      [t.id, t.slug, JSON.stringify(t), t.createdAt, t.updatedAt],
    );
    return t;
  }
}

class Users extends Repo {
  async get(id: string): Promise<User | undefined> {
    const [row] = await this.db.query<DataRow>(`SELECT data FROM users WHERE id = ?`, [id]);
    return row ? parseJson<User>(row.data) : undefined;
  }
  async getByEmail(email: string): Promise<User | undefined> {
    const [row] = await this.db.query<DataRow>(`SELECT data FROM users WHERE email = ?`, [email.trim().toLowerCase()]);
    return row ? parseJson<User>(row.data) : undefined;
  }
  async put(u: User): Promise<User> {
    const user = { ...u, email: u.email.trim().toLowerCase() };
    await this.db.execute(
      `INSERT INTO users (id, email, data, created_at, updated_at) VALUES (?, ?, ${this.J}, ?, ?)
       ON CONFLICT (id) DO UPDATE SET email = excluded.email, data = excluded.data, updated_at = excluded.updated_at`,
      [user.id, user.email, JSON.stringify(user), user.createdAt, user.updatedAt],
    );
    return user;
  }
}

type MembershipRow = { tenant_id: string; user_id: string; role: Role; created_at: string; updated_at: string };
const toMembership = (r: MembershipRow): Membership => ({ tenantId: r.tenant_id, userId: r.user_id, role: r.role, createdAt: r.created_at, updatedAt: r.updated_at });

class Memberships extends Repo {
  async get(tenantId: string, userId: string): Promise<Membership | undefined> {
    const [row] = await this.db.query<MembershipRow>(`SELECT * FROM memberships WHERE tenant_id = ? AND user_id = ?`, [tenantId, userId]);
    return row ? toMembership(row) : undefined;
  }
  async forUser(userId: string): Promise<{ membership: Membership; tenant: Tenant }[]> {
    const rows = await this.db.query<MembershipRow & { tdata: unknown }>(
      `SELECT m.*, t.data AS tdata FROM memberships m JOIN tenants t ON t.id = m.tenant_id WHERE m.user_id = ? ORDER BY t.created_at ASC`,
      [userId],
    );
    return rows.map((r) => ({ membership: toMembership(r), tenant: parseJson<Tenant>(r.tdata) }));
  }
  async forTenant(tenantId: string): Promise<{ membership: Membership; user: User }[]> {
    const rows = await this.db.query<MembershipRow & { udata: unknown }>(
      `SELECT m.*, u.data AS udata FROM memberships m JOIN users u ON u.id = m.user_id WHERE m.tenant_id = ? ORDER BY m.created_at ASC`,
      [tenantId],
    );
    return rows.map((r) => ({ membership: toMembership(r), user: parseJson<User>(r.udata) }));
  }
  async put(m: Membership): Promise<Membership> {
    await this.db.execute(
      `INSERT INTO memberships (tenant_id, user_id, role, created_at, updated_at) VALUES (?, ?, ?, ?, ?)
       ON CONFLICT (tenant_id, user_id) DO UPDATE SET role = excluded.role, updated_at = excluded.updated_at`,
      [m.tenantId, m.userId, m.role, m.createdAt, m.updatedAt],
    );
    return m;
  }
  async delete(tenantId: string, userId: string): Promise<boolean> {
    return (await this.db.execute(`DELETE FROM memberships WHERE tenant_id = ? AND user_id = ?`, [tenantId, userId])) > 0;
  }
  async owners(tenantId: string): Promise<number> {
    const [row] = await this.db.query<{ n: number }>(`SELECT COUNT(*) AS n FROM memberships WHERE tenant_id = ? AND role = 'owner'`, [tenantId]);
    return Number(row?.n ?? 0);
  }
}

class Identities extends Repo {
  async find(issuer: string, subject: string): Promise<{ userId: string; email?: string } | undefined> {
    const [row] = await this.db.query<{ user_id: string; email: string | null }>(`SELECT user_id, email FROM identities WHERE issuer = ? AND subject = ?`, [issuer, subject]);
    return row ? { userId: row.user_id, email: row.email ?? undefined } : undefined;
  }
  async link(issuer: string, subject: string, userId: string, email?: string): Promise<void> {
    const ts = now();
    await this.db.execute(
      `INSERT INTO identities (issuer, subject, user_id, email, created_at, last_login_at) VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT (issuer, subject) DO UPDATE SET email = excluded.email, last_login_at = excluded.last_login_at`,
      [issuer, subject, userId, email ?? null, ts, ts],
    );
  }
}

type SessionRow = { id_hash: string; user_id: string; tenant_id: string | null; data: unknown; expires_at: string; last_seen_at: string };

class Sessions extends Repo {
  async create(idHash: string, s: SessionRecord): Promise<void> {
    await this.db.execute(`INSERT INTO sessions (id_hash, user_id, tenant_id, data, created_at, expires_at, last_seen_at) VALUES (?, ?, ?, ${this.J}, ?, ?, ?)`, [
      idHash,
      s.userId,
      s.activeTenantId ?? null,
      JSON.stringify(s),
      s.createdAt,
      s.expiresAt,
      s.lastSeenAt,
    ]);
  }
  async get(idHash: string): Promise<SessionRecord | undefined> {
    const [row] = await this.db.query<SessionRow>(`SELECT * FROM sessions WHERE id_hash = ?`, [idHash]);
    if (!row) return undefined;
    return { ...parseJson<SessionRecord>(row.data), activeTenantId: row.tenant_id ?? undefined, expiresAt: row.expires_at, lastSeenAt: row.last_seen_at };
  }
  async update(idHash: string, s: SessionRecord): Promise<void> {
    await this.db.execute(`UPDATE sessions SET tenant_id = ?, data = ${this.J}, expires_at = ?, last_seen_at = ? WHERE id_hash = ?`, [
      s.activeTenantId ?? null,
      JSON.stringify(s),
      s.expiresAt,
      s.lastSeenAt,
      idHash,
    ]);
  }
  async delete(idHash: string): Promise<void> {
    await this.db.execute(`DELETE FROM sessions WHERE id_hash = ?`, [idHash]);
  }
  async deleteForUser(userId: string): Promise<void> {
    await this.db.execute(`DELETE FROM sessions WHERE user_id = ?`, [userId]);
  }
  async purgeExpired(at = now()): Promise<number> {
    return this.db.execute(`DELETE FROM sessions WHERE expires_at < ?`, [at]);
  }
}

type TokenRow = { data: unknown; last_used_at: string | null; revoked_at: string | null };

class ApiTokens extends Repo {
  private read(r: TokenRow): ApiTokenRecord {
    return { ...parseJson<ApiTokenRecord>(r.data), lastUsedAt: r.last_used_at ?? undefined, revokedAt: r.revoked_at ?? undefined };
  }
  async create(hash: string, t: ApiTokenRecord): Promise<void> {
    await this.db.execute(`INSERT INTO api_tokens (id, tenant_id, token_hash, data, created_at, expires_at) VALUES (?, ?, ?, ${this.J}, ?, ?)`, [
      t.id,
      t.tenantId,
      hash,
      JSON.stringify(t),
      t.createdAt,
      t.expiresAt ?? null,
    ]);
  }
  async byHash(hash: string): Promise<ApiTokenRecord | undefined> {
    const [row] = await this.db.query<TokenRow>(`SELECT data, last_used_at, revoked_at FROM api_tokens WHERE token_hash = ?`, [hash]);
    return row ? this.read(row) : undefined;
  }
  async forTenant(tenantId: string): Promise<ApiTokenRecord[]> {
    const rows = await this.db.query<TokenRow>(`SELECT data, last_used_at, revoked_at FROM api_tokens WHERE tenant_id = ? ORDER BY created_at DESC`, [tenantId]);
    return rows.map((r) => this.read(r));
  }
  async revoke(tenantId: string, id: string): Promise<boolean> {
    return (await this.db.execute(`UPDATE api_tokens SET revoked_at = ? WHERE tenant_id = ? AND id = ? AND revoked_at IS NULL`, [now(), tenantId, id])) > 0;
  }
  async touch(id: string, at = now()): Promise<void> {
    await this.db.execute(`UPDATE api_tokens SET last_used_at = ? WHERE id = ?`, [at, id]);
  }
}

class SsoConnections extends Repo {
  async get(id: string): Promise<SsoConnection | undefined> {
    const [row] = await this.db.query<DataRow>(`SELECT data FROM sso_connections WHERE id = ?`, [id]);
    return row ? parseJson<SsoConnection>(row.data) : undefined;
  }
  async forTenant(tenantId: string): Promise<SsoConnection[]> {
    return (await this.db.query<DataRow>(`SELECT data FROM sso_connections WHERE tenant_id = ? ORDER BY created_at ASC`, [tenantId])).map((r) => parseJson<SsoConnection>(r.data));
  }
  async byDomain(domain: string): Promise<SsoConnection | undefined> {
    const [row] = await this.db.query<DataRow>(`SELECT c.data FROM sso_domains d JOIN sso_connections c ON c.id = d.connection_id WHERE d.domain = ?`, [domain.toLowerCase()]);
    return row ? parseJson<SsoConnection>(row.data) : undefined;
  }
  async domainOwner(domain: string): Promise<string | undefined> {
    const [row] = await this.db.query<{ connection_id: string }>(`SELECT connection_id FROM sso_domains WHERE domain = ?`, [domain.toLowerCase()]);
    return row?.connection_id;
  }
  async put(c: SsoConnection): Promise<SsoConnection> {
    await this.store.atomic(async () => {
      await this.db.execute(
        `INSERT INTO sso_connections (id, tenant_id, data, created_at, updated_at) VALUES (?, ?, ${this.J}, ?, ?)
         ON CONFLICT (id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at`,
        [c.id, c.tenantId, JSON.stringify(c), c.createdAt, c.updatedAt],
      );
      await this.db.execute(`DELETE FROM sso_domains WHERE connection_id = ?`, [c.id]);
      for (const d of c.domains) await this.db.execute(`INSERT INTO sso_domains (domain, connection_id, tenant_id) VALUES (?, ?, ?)`, [d.toLowerCase(), c.id, c.tenantId]);
    });
    return c;
  }
  async delete(tenantId: string, id: string): Promise<boolean> {
    return this.store.atomic(async () => {
      await this.db.execute(`DELETE FROM sso_domains WHERE connection_id = ?`, [id]);
      return (await this.db.execute(`DELETE FROM sso_connections WHERE tenant_id = ? AND id = ?`, [tenantId, id])) > 0;
    });
  }
}

class LoginFlows extends Repo {
  async put(stateHash: string, flow: LoginFlow, expiresAt: string): Promise<void> {
    await this.db.execute(`INSERT INTO login_flows (state_hash, data, expires_at) VALUES (?, ${this.J}, ?)`, [stateHash, JSON.stringify(flow), expiresAt]);
  }
  /** Single use: returns the flow and deletes it. */
  async take(stateHash: string): Promise<LoginFlow | undefined> {
    return this.store.atomic(async () => {
      const [row] = await this.db.query<{ data: unknown; expires_at: string }>(`SELECT data, expires_at FROM login_flows WHERE state_hash = ?`, [stateHash]);
      if (!row) return undefined;
      await this.db.execute(`DELETE FROM login_flows WHERE state_hash = ?`, [stateHash]);
      return row.expires_at < now() ? undefined : parseJson<LoginFlow>(row.data);
    });
  }
  async purgeExpired(at = now()): Promise<number> {
    return this.db.execute(`DELETE FROM login_flows WHERE expires_at < ?`, [at]);
  }
}

export class IdentityStore {
  readonly tenants: Tenants;
  readonly users: Users;
  readonly memberships: Memberships;
  readonly identities: Identities;
  readonly sessions: Sessions;
  readonly apiTokens: ApiTokens;
  readonly sso: SsoConnections;
  readonly loginFlows: LoginFlows;

  constructor(store: StoreContext) {
    this.tenants = new Tenants(store);
    this.users = new Users(store);
    this.memberships = new Memberships(store);
    this.identities = new Identities(store);
    this.sessions = new Sessions(store);
    this.apiTokens = new ApiTokens(store);
    this.sso = new SsoConnections(store);
    this.loginFlows = new LoginFlows(store);
  }
}
