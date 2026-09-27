/**
 * Organization administration: members and roles, API tokens, single sign-on
 * connections, the SSO requirement and the organization's own audit trail.
 * Everything here is enforced by the server; the page only hides what the
 * signed-in role cannot do.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, KeyRound, Plus, ShieldCheck, Trash2, UserPlus } from "lucide-react";
import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ROLES, ROLE_LABELS, can, roleRank, type ActivityEvent, type Role } from "@visua/core";
import { Empty, Tabs, toast } from "../components/ui/index.tsx";
import { api } from "../lib/api.ts";
import { ROLE_NAMES, useMe, useResetSession } from "../lib/auth.ts";
import { useWorkspace } from "../lib/queries.ts";

interface Member {
  id: string;
  email: string;
  name: string;
  role: Role;
  memberSince: string;
  lastLoginAt?: string;
}
interface Token {
  id: string;
  name: string;
  role: Role;
  prefix: string;
  createdAt: string;
  expiresAt?: string;
  revokedAt?: string;
  lastUsedAt?: string;
}
interface Connection {
  id: string;
  name: string;
  issuer: string;
  clientId: string;
  hasClientSecret: boolean;
  domains: string[];
  jitProvisioning: boolean;
  defaultRole: Role;
  enabled: boolean;
}
interface TenantInfo {
  id: string;
  name: string;
  slug: string;
  settings: { requireSso?: boolean };
  role: Role;
}

type Tab = "members" | "tokens" | "sso" | "audit";
const day = (iso?: string) => (iso ? iso.slice(0, 10) : "—");

function RoleSelect({ value, onChange, max, label, exclude = [], compact }: { value: Role; onChange: (r: Role) => void; max: Role; label: string; exclude?: Role[]; compact?: boolean }) {
  return (
    <select className="select" aria-label={label} value={value} onChange={(e) => onChange(e.target.value as Role)} style={compact ? { minHeight: 32, height: 32, padding: "0 8px", width: 160 } : { width: 160 }}>
      {ROLES.filter((r) => roleRank(r) <= roleRank(max) && !exclude.includes(r)).map((r) => (
        <option key={r} value={r} title={ROLE_LABELS[r].description}>
          {ROLE_NAMES[r]}
        </option>
      ))}
    </select>
  );
}

export function OrganizationPage() {
  const { ws = "" } = useParams();
  const summary = useWorkspace(ws);
  const tenantId = summary.data?.workspace.tenantId;
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>("members");
  const tenant = useQuery({ queryKey: ["tenant", tenantId], queryFn: () => api.get<TenantInfo>(`/tenants/${tenantId}`), enabled: !!tenantId });
  const role = tenant.data?.role;
  const manage = can(role, "tenant.manage");
  const audit = can(role, "workspace.export");
  const refresh = () => qc.invalidateQueries({ queryKey: ["tenant", tenantId] });

  if (!tenantId || !tenant.data) return <div className="page muted">Loading…</div>;
  const tabs: { id: Tab; label: string }[] = [{ id: "members", label: "Members" }];
  if (manage) tabs.push({ id: "tokens", label: "API tokens" }, { id: "sso", label: "Single sign-on" });
  if (audit) tabs.push({ id: "audit", label: "Audit trail" });

  return (
    <div className="page">
      <header className="page__header">
        <div>
          <div className="eyebrow">Organization</div>
          <h1>{tenant.data.name}</h1>
          <p>
            Every workspace belongs to one organization. People see an organization's workspaces only through a membership, and what they can do follows their role.
            You are <strong>{ROLE_NAMES[tenant.data.role]}</strong>.
          </p>
        </div>
      </header>
      <Tabs tabs={tabs} value={tab} onChange={setTab} />
      <div style={{ marginTop: 16 }}>
        {tab === "members" && <Members tenantId={tenantId} role={tenant.data.role} onChange={refresh} />}
        {tab === "tokens" && manage && <Tokens tenantId={tenantId} role={tenant.data.role} />}
        {tab === "sso" && manage && <Sso tenant={tenant.data} onChange={refresh} />}
        {tab === "audit" && audit && <Audit tenantId={tenantId} />}
      </div>
    </div>
  );
}

function Members({ tenantId, role, onChange }: { tenantId: string; role: Role; onChange: () => void }) {
  const qc = useQueryClient();
  const me = useMe();
  const manage = can(role, "tenant.manage");
  const members = useQuery({ queryKey: ["tenant", tenantId, "members"], queryFn: () => api.get<Member[]>(`/tenants/${tenantId}/members`) });
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [newRole, setNewRole] = useState<Role>("contributor");
  const done = () => {
    void qc.invalidateQueries({ queryKey: ["tenant", tenantId, "members"] });
    onChange();
  };
  const add = useMutation({
    mutationFn: () => api.post(`/tenants/${tenantId}/members`, { email, name: name || undefined, role: newRole }),
    onSuccess: () => {
      toast(`${email} added as ${ROLE_NAMES[newRole].toLowerCase()}`);
      setEmail("");
      setName("");
      done();
    },
    onError: (e: Error) => toast(e.message, "error"),
  });
  const setMemberRole = useMutation({
    mutationFn: (v: { id: string; role: Role }) => api.patch(`/tenants/${tenantId}/members/${v.id}`, { role: v.role }),
    onSuccess: done,
    onError: (e: Error) => toast(e.message, "error"),
  });
  const remove = useMutation({
    mutationFn: (id: string) => api.del(`/tenants/${tenantId}/members/${id}`),
    onSuccess: done,
    onError: (e: Error) => toast(e.message, "error"),
  });
  return (
    <div className="stack" style={{ gap: 16 }}>
      {manage && (
        <form
          className="panel row row--wrap"
          style={{ gap: 10, alignItems: "flex-end" }}
          onSubmit={(e) => {
            e.preventDefault();
            add.mutate();
          }}
        >
          <div className="field" style={{ flex: "2 1 220px" }}>
            <label htmlFor="member-email">Email</label>
            <input id="member-email" className="input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="colleague@company.com" />
          </div>
          <div className="field" style={{ flex: "1 1 160px" }}>
            <label htmlFor="member-name">Name</label>
            <input id="member-name" className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Optional" />
          </div>
          <div className="field">
            <label>Role</label>
            <RoleSelect label="Role for the new member" value={newRole} onChange={setNewRole} max={role} />
          </div>
          <button className="btn btn--primary" type="submit" disabled={add.isPending || !email.includes("@")}>
            <UserPlus size={15} aria-hidden /> Add member
          </button>
          <p className="field__hint" style={{ flexBasis: "100%", margin: 0 }}>
            Members sign in through your SSO or the platform identity provider with this email address. {ROLE_LABELS[newRole].description}
          </p>
        </form>
      )}
      <div className="panel" style={{ padding: 0 }}>
        <table className="table table--members">
          <thead>
            <tr>
              <th>Member</th>
              <th>Role</th>
              <th>Member since</th>
              <th>Last sign-in</th>
              {manage && <th aria-label="Actions" />}
            </tr>
          </thead>
          <tbody>
            {(members.data ?? []).map((m) => {
              const self = m.id === me.data?.user.id;
              const editable = manage && !self && (m.role !== "owner" || role === "owner");
              return (
                <tr key={m.id}>
                  <td>
                    <div className="stack" style={{ gap: 2 }}>
                      <strong>
                        {m.name}
                        {self ? " (you)" : ""}
                      </strong>
                      <span className="muted" style={{ fontSize: 12 }}>
                        {m.email}
                      </span>
                    </div>
                  </td>
                  <td>{editable ? <RoleSelect compact label={`Role of ${m.email}`} value={m.role} onChange={(r) => setMemberRole.mutate({ id: m.id, role: r })} max={role} /> : <span className="role-badge">{ROLE_NAMES[m.role]}</span>}</td>
                  <td className="mono">{day(m.memberSince)}</td>
                  <td className="mono">{day(m.lastLoginAt)}</td>
                  {manage && (
                    <td style={{ textAlign: "right" }}>
                      {editable && (
                        <button className="btn btn--quiet btn--sm btn--icon" aria-label={`Remove ${m.email}`} title="Remove from organization" onClick={() => confirm(`Remove ${m.email} from this organization?`) && remove.mutate(m.id)}>
                          <Trash2 size={14} />
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <NewOrganization />
    </div>
  );
}

function NewOrganization() {
  const me = useMe();
  const reset = useResetSession();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const create = useMutation({
    mutationFn: () => api.post<{ id: string }>("/tenants", { name }),
    onSuccess: async () => {
      toast(`Organization “${name}” created — you are its owner.`);
      await reset();
      navigate("/onboarding");
    },
    onError: (e: Error) => toast(e.message, "error"),
  });
  if (me.data?.principal !== "user" || me.data.tenantScope) return null;
  return (
    <form
      className="panel row row--wrap"
      style={{ gap: 10, alignItems: "flex-end" }}
      onSubmit={(e) => {
        e.preventDefault();
        create.mutate();
      }}
    >
      <div className="field" style={{ flex: "1 1 260px" }}>
        <label htmlFor="org-name">Start another organization</label>
        <input id="org-name" className="input" required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. a client you advise" />
        <span className="field__hint">For consultants and groups: each organization's workspaces, members and SSO stay separate.</span>
      </div>
      <button className="btn" type="submit" disabled={!name.trim() || create.isPending}>
        <Plus size={15} aria-hidden /> Create organization
      </button>
    </form>
  );
}

function Tokens({ tenantId, role }: { tenantId: string; role: Role }) {
  const qc = useQueryClient();
  const tokens = useQuery({ queryKey: ["tenant", tenantId, "tokens"], queryFn: () => api.get<Token[]>(`/tenants/${tenantId}/tokens`) });
  const [name, setName] = useState("");
  const [tokenRole, setTokenRole] = useState<Role>("contributor");
  const [days, setDays] = useState(90);
  const [created, setCreated] = useState<{ name: string; token: string } | null>(null);
  const create = useMutation({
    mutationFn: () => api.post<Token & { token: string }>(`/tenants/${tenantId}/tokens`, { name, role: tokenRole, expiresInDays: days || undefined }),
    onSuccess: (t) => {
      setCreated({ name: t.name, token: t.token });
      setName("");
      void qc.invalidateQueries({ queryKey: ["tenant", tenantId, "tokens"] });
    },
    onError: (e: Error) => toast(e.message, "error"),
  });
  const revoke = useMutation({
    mutationFn: (id: string) => api.del(`/tenants/${tenantId}/tokens/${id}`),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["tenant", tenantId, "tokens"] }),
    onError: (e: Error) => toast(e.message, "error"),
  });
  const now = new Date().toISOString();
  return (
    <div className="stack" style={{ gap: 16 }}>
      <form
        className="panel row row--wrap"
        style={{ gap: 10, alignItems: "flex-end" }}
        onSubmit={(e) => {
          e.preventDefault();
          create.mutate();
        }}
      >
        <div className="field" style={{ flex: "2 1 220px" }}>
          <label htmlFor="token-name">Token name</label>
          <input id="token-name" className="input" required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. CI evidence upload" />
        </div>
        <div className="field">
          <label>Role</label>
          <RoleSelect label="Token role" value={tokenRole} onChange={setTokenRole} max={role} exclude={["owner"]} />
        </div>
        <div className="field" style={{ width: 130 }}>
          <label htmlFor="token-days">Expires in (days)</label>
          <input id="token-days" className="input" type="number" min={1} max={730} value={days} onChange={(e) => setDays(Number(e.target.value))} />
        </div>
        <button className="btn btn--primary" type="submit" disabled={!name.trim() || create.isPending}>
          <KeyRound size={15} aria-hidden /> Create token
        </button>
        <p className="field__hint" style={{ flexBasis: "100%", margin: 0 }}>
          Tokens act in this organization only, with the role you choose, and every change they make is recorded under their name. Send them as <span className="mono">Authorization: Bearer …</span>.
        </p>
      </form>
      {created && (
        <div className="panel stack" role="status" style={{ gap: 8 }}>
          <strong>Copy “{created.name}” now — it will not be shown again.</strong>
          <div className="row" style={{ gap: 8 }}>
            <code className="secret" style={{ flex: 1 }}>
              {created.token}
            </code>
            <button className="btn btn--sm" onClick={() => void navigator.clipboard?.writeText(created.token).then(() => toast("Token copied"))} aria-label="Copy token">
              <Copy size={14} />
            </button>
          </div>
        </div>
      )}
      <div className="panel" style={{ padding: 0 }}>
        {tokens.data?.length ? (
          <table className="table table--tokens">
            <thead>
              <tr>
                <th>Token</th>
                <th>Role</th>
                <th>Created</th>
                <th>Last used</th>
                <th>Expires</th>
                <th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {tokens.data.map((t) => {
                const expired = !!t.expiresAt && t.expiresAt <= now;
                return (
                  <tr key={t.id}>
                    <td>
                      <div className="stack" style={{ gap: 2 }}>
                        <strong>{t.name}</strong>
                        <span className="mono muted" style={{ fontSize: 12 }}>
                          {t.prefix}…
                        </span>
                      </div>
                    </td>
                    <td>
                      <span className="role-badge">{ROLE_NAMES[t.role]}</span>
                    </td>
                    <td className="mono">{day(t.createdAt)}</td>
                    <td className="mono">{day(t.lastUsedAt)}</td>
                    <td className="mono">{t.revokedAt ? `revoked ${day(t.revokedAt)}` : expired ? `expired ${day(t.expiresAt)}` : day(t.expiresAt)}</td>
                    <td style={{ textAlign: "right" }}>
                      {!t.revokedAt && !expired && (
                        <button className="btn btn--quiet btn--sm" onClick={() => confirm(`Revoke “${t.name}”? Anything using it stops working immediately.`) && revoke.mutate(t.id)}>
                          Revoke
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <Empty title="No API tokens">Create one for CI pipelines, evidence uploads or integrations.</Empty>
        )}
      </div>
    </div>
  );
}

const emptyConnection = { name: "", issuer: "", clientId: "", clientSecret: "", domains: "", jitProvisioning: false, defaultRole: "viewer" as Role };

function Sso({ tenant, onChange }: { tenant: TenantInfo; onChange: () => void }) {
  const qc = useQueryClient();
  const sso = useQuery({ queryKey: ["tenant", tenant.id, "sso"], queryFn: () => api.get<{ redirectUri: string; connections: Connection[] }>(`/tenants/${tenant.id}/sso`) });
  const [form, setForm] = useState(emptyConnection);
  const done = () => {
    void qc.invalidateQueries({ queryKey: ["tenant", tenant.id, "sso"] });
    onChange();
  };
  const save = useMutation({
    mutationFn: () =>
      api.post(`/tenants/${tenant.id}/sso`, {
        name: form.name || "Single sign-on",
        issuer: form.issuer,
        clientId: form.clientId,
        clientSecret: form.clientSecret || undefined,
        domains: form.domains.split(/[\s,]+/).filter(Boolean),
        jitProvisioning: form.jitProvisioning,
        defaultRole: form.defaultRole,
      }),
    onSuccess: () => {
      toast("SSO connection added");
      setForm(emptyConnection);
      done();
    },
    onError: (e: Error) => toast(e.message, "error"),
  });
  const update = useMutation({
    mutationFn: (v: { id: string; patch: Partial<Connection> }) => api.patch(`/tenants/${tenant.id}/sso/${v.id}`, v.patch),
    onSuccess: done,
    onError: (e: Error) => toast(e.message, "error"),
  });
  const remove = useMutation({
    mutationFn: (id: string) => api.del(`/tenants/${tenant.id}/sso/${id}`),
    onSuccess: done,
    onError: (e: Error) => toast(e.message, "error"),
  });
  const requireSso = useMutation({
    mutationFn: (value: boolean) => api.patch(`/tenants/${tenant.id}`, { settings: { requireSso: value } }),
    onSuccess: (_, value) => {
      toast(value ? "SSO is now required for this organization" : "SSO is no longer required");
      onChange();
    },
    onError: (e: Error) => toast(e.message, "error"),
  });
  const owner = tenant.role === "owner";
  return (
    <div className="stack" style={{ gap: 16 }}>
      <div className="panel stack" style={{ gap: 8 }}>
        <h2 className="section-title" style={{ margin: 0 }}>
          How it works
        </h2>
        <p className="muted" style={{ margin: 0 }}>
          Connect your identity provider (Okta, Microsoft Entra ID, Google Workspace, Keycloak…) with OpenID Connect. People whose email is in your domains are sent to it
          when they sign in. Sessions it creates reach this organization only. Register this redirect URI with your provider:
        </p>
        <code className="secret">{sso.data?.redirectUri ?? "…"}</code>
      </div>
      <div className="panel" style={{ padding: 0 }}>
        {sso.data?.connections.length ? (
          <table className="table table--sso">
            <thead>
              <tr>
                <th>Connection</th>
                <th>Domains</th>
                <th>New people</th>
                <th>Status</th>
                <th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {sso.data.connections.map((c) => (
                <tr key={c.id}>
                  <td>
                    <div className="stack" style={{ gap: 2 }}>
                      <strong>{c.name}</strong>
                      <span className="mono muted" style={{ fontSize: 12 }}>
                        {c.issuer} · {c.clientId}
                        {c.hasClientSecret ? " · secret stored (encrypted)" : " · public client"}
                      </span>
                    </div>
                  </td>
                  <td className="mono">{c.domains.join(", ")}</td>
                  <td>{c.jitProvisioning ? `Join as ${ROLE_NAMES[c.defaultRole].toLowerCase()}` : "Admins add them first"}</td>
                  <td>
                    <button className="btn btn--quiet btn--sm" onClick={() => update.mutate({ id: c.id, patch: { enabled: !c.enabled } })}>
                      {c.enabled ? "Enabled — disable" : "Disabled — enable"}
                    </button>
                  </td>
                  <td style={{ textAlign: "right" }}>
                    {owner && (
                      <button className="btn btn--quiet btn--sm btn--icon" aria-label={`Remove ${c.name}`} onClick={() => confirm(`Remove the SSO connection “${c.name}”?`) && remove.mutate(c.id)}>
                        <Trash2 size={14} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <Empty title="No SSO connection">Add your identity provider below.</Empty>
        )}
      </div>
      {!owner && (
        <div className="panel muted" role="note">
          Only owners add, remove or re-point identity providers: whoever controls a provider can sign in as any member on its domains, owners included. Admins can
          enable or disable connections.
        </div>
      )}
      {owner && (
      <form
        className="panel stack"
        style={{ gap: 12 }}
        onSubmit={(e) => {
          e.preventDefault();
          save.mutate();
        }}
      >
        <h2 className="section-title" style={{ margin: 0 }}>
          Add an OpenID Connect provider
        </h2>
        <div className="grid grid--2" style={{ gap: 12 }}>
          <div className="field">
            <label htmlFor="sso-name">Name</label>
            <input id="sso-name" className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Okta" />
          </div>
          <div className="field">
            <label htmlFor="sso-issuer">Issuer URL</label>
            <input id="sso-issuer" className="input" required value={form.issuer} onChange={(e) => setForm({ ...form, issuer: e.target.value })} placeholder="https://login.example.com/" />
          </div>
          <div className="field">
            <label htmlFor="sso-client">Client ID</label>
            <input id="sso-client" className="input" required value={form.clientId} onChange={(e) => setForm({ ...form, clientId: e.target.value })} />
          </div>
          <div className="field">
            <label htmlFor="sso-secret">Client secret</label>
            <input id="sso-secret" className="input" type="password" autoComplete="off" value={form.clientSecret} onChange={(e) => setForm({ ...form, clientSecret: e.target.value })} placeholder="Leave empty for a public client (PKCE)" />
          </div>
          <div className="field">
            <label htmlFor="sso-domains">Email domains</label>
            <input id="sso-domains" className="input" required value={form.domains} onChange={(e) => setForm({ ...form, domains: e.target.value })} placeholder="example.com, example.co.uk" />
          </div>
          <div className="field">
            <label>New people from these domains</label>
            <div className="row" style={{ gap: 8 }}>
              <select className="select" aria-label="Provisioning" value={form.jitProvisioning ? "jit" : "invite"} onChange={(e) => setForm({ ...form, jitProvisioning: e.target.value === "jit" })}>
                <option value="invite">Admins add them first</option>
                <option value="jit">Join automatically as…</option>
              </select>
              {form.jitProvisioning && <RoleSelect label="Default role" value={form.defaultRole} onChange={(r) => setForm({ ...form, defaultRole: r })} max="approver" />}
            </div>
          </div>
        </div>
        <div>
          <button className="btn btn--primary" type="submit" disabled={save.isPending}>
            <Plus size={15} aria-hidden /> Add connection
          </button>
        </div>
      </form>
      )}
      <div className="panel row" style={{ gap: 12, justifyContent: "space-between" }}>
        <div className="stack" style={{ gap: 4 }}>
          <strong>
            <ShieldCheck size={15} aria-hidden style={{ verticalAlign: "-2px" }} /> Require SSO for everyone
          </strong>
          <span className="muted" style={{ fontSize: 13 }}>
            When on, only sessions from this organization's own SSO can open its workspaces — including yours. {owner ? "" : "Only owners can change this."}
          </span>
        </div>
        <button className={`btn ${tenant.settings.requireSso ? "" : "btn--primary"}`} disabled={!owner || requireSso.isPending} onClick={() => requireSso.mutate(!tenant.settings.requireSso)}>
          {tenant.settings.requireSso ? "Required — turn off" : "Require SSO"}
        </button>
      </div>
    </div>
  );
}

function Audit({ tenantId }: { tenantId: string }) {
  const events = useQuery({ queryKey: ["tenant", tenantId, "activity"], queryFn: () => api.get<ActivityEvent[]>(`/tenants/${tenantId}/activity?limit=200`) });
  const verify = useQuery({ queryKey: ["tenant", tenantId, "verify"], queryFn: () => api.get<{ valid: boolean; events: number; head?: string }>(`/tenants/${tenantId}/activity/verify`) });
  return (
    <div className="stack" style={{ gap: 12 }}>
      {verify.data && (
        <div className="panel row" role="status" style={{ gap: 8 }}>
          <span className={`status status--${verify.data.valid ? "verified" : "at-risk"}`}>{verify.data.valid ? "✓ Chain intact" : "! Chain broken"}</span>
          <span className="muted">
            {verify.data.events} organization events, hash-chained like workspace audit trails
            {verify.data.head ? ` · head ${verify.data.head.slice(0, 12)}…` : ""}
          </span>
        </div>
      )}
      <div className="panel" style={{ padding: 0 }}>
        <table className="table">
          <thead>
            <tr>
              <th>When</th>
              <th>Who</th>
              <th>What</th>
            </tr>
          </thead>
          <tbody>
            {(events.data ?? []).map((e) => (
              <tr key={e.id}>
                <td className="mono" style={{ whiteSpace: "nowrap" }}>
                  {e.at.slice(0, 16).replace("T", " ")}
                </td>
                <td>{e.actor}</td>
                <td>{e.summary}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
