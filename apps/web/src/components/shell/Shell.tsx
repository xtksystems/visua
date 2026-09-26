/** App shell: nav rail, top bar, command palette, toasts, live events. */
import {
  Activity,
  BookCheck,
  BrainCircuit,
  Bot,
  Building2,
  Check,
  LogOut,
  Users,
  ClipboardList,
  FileText,
  GitCompareArrows,
  LayoutDashboard,
  Network,
  Orbit,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Telescope,
  Waypoints,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Link, NavLink, Outlet, useNavigate, useParams } from "react-router-dom";
import { api, setCsrfToken } from "../../lib/api.ts";
import { ROLE_NAMES, useMe, useResetSession } from "../../lib/auth.ts";
import { initials } from "../../pages/LoginPage.tsx";
import { useWorkspaceEvents } from "../../lib/events.ts";
import { FRAMEWORK_SHORT, truncate } from "../../lib/format.ts";
import { useMeta, useSearch, useWorkspace, useWorkspaces } from "../../lib/queries.ts";
import { useAgentActivity } from "../../state/agentActivity.ts";
import { useUi } from "../../state/ui.ts";
import { AgentBadge, FrameworkBadge, Logo, toast, Toasts } from "../ui/index.tsx";

function RailItem({ to, icon, label, badge, end }: { to: string; icon: ReactNode; label: string; badge?: number; end?: boolean }) {
  return (
    <NavLink to={to} end={end} className="rail__item" aria-label={label} title={label}>
      {icon}
      {badge ? <span className="rail__badge">{badge > 99 ? "99+" : badge}</span> : null}
    </NavLink>
  );
}

function NavRail({ ws, approvals }: { ws: string; approvals: number }) {
  const base = `/w/${ws}`;
  const s = 20;
  return (
    <nav className="rail" aria-label="Primary">
      <Link to={base} className="rail__logo" aria-label="Visua home">
        <Logo />
      </Link>
      <RailItem to={base} end icon={<LayoutDashboard size={s} />} label="Mission control" />
      <RailItem to={`${base}/observatory`} icon={<Telescope size={s} />} label="Observatory (3D)" />
      <RailItem to={`${base}/plan`} icon={<ClipboardList size={s} />} label="Plan & tasks" />
      <RailItem to={`${base}/evidence`} icon={<BookCheck size={s} />} label="Evidence & monitoring" />
      <RailItem to={`${base}/agents`} icon={<Bot size={s} />} label="Agents & approvals" badge={approvals} />
      <RailItem to={`${base}/policies`} icon={<FileText size={s} />} label="Policies" />
      <RailItem to={`${base}/profile`} icon={<Waypoints size={s} />} label="CSF profile & tiers" />
      <RailItem to={`${base}/crosswalk`} icon={<GitCompareArrows size={s} />} label="Crosswalk nexus" />
      <RailItem to={`${base}/soc2`} icon={<ShieldCheck size={s} />} label="SOC 2 program" />
      <RailItem to={`${base}/rmf`} icon={<Network size={s} />} label="RMF program" />
      <RailItem to={`${base}/ai`} icon={<BrainCircuit size={s} />} label="AI governance (AI RMF)" />
      <RailItem to={`${base}/reports`} icon={<Activity size={s} />} label="Reports, audit trail & trust" />
      <span className="rail__spacer" />
      <RailItem to={`${base}/organization`} icon={<Building2 size={s} />} label="Organization: members, SSO & API tokens" />
      <RailItem to={`${base}/settings`} icon={<Settings size={s} />} label="Settings" />
    </nav>
  );
}

function AgentPulse({ ws }: { ws: string }) {
  const running = useAgentActivity((s) => s.running);
  const last = useAgentActivity((s) => s.steps[s.steps.length - 1]);
  const count = Object.keys(running).length;
  const navigate = useNavigate();
  if (!count && !last) return null;
  return (
    <button className="btn btn--quiet btn--sm" onClick={() => navigate(`/w/${ws}/agents`)} title="Agent activity" style={{ maxWidth: 360 }}>
      <span className={count ? "pulse" : ""} style={{ width: 8, height: 8, borderRadius: 99, background: count ? "var(--color-tertiary)" : "var(--color-outline-strong)" }} />
      <span className="muted" style={{ overflow: "hidden", textOverflow: "ellipsis" }}>
        {count ? `${count} agent run${count > 1 ? "s" : ""} · ` : ""}
        {last ? truncate(last.step.title, 48) : ""}
      </span>
    </button>
  );
}

const methodLabel = (m: string) => (m === "dev" ? "developer sign-in" : m === "token" ? "an API token" : m === "oidc:platform" ? "single sign-on" : "your organization's SSO");

function AccountMenu({ ws }: { ws: string }) {
  const me = useMe();
  const summary = useWorkspace(ws);
  const reset = useResetSession();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);
  if (!me.data) return null;
  const { user, organizations, activeTenant, method } = me.data;
  const signOut = async () => {
    await api.post("/auth/logout").catch(() => undefined);
    setCsrfToken(undefined);
    await reset();
    navigate("/login", { replace: true });
  };
  const switchTo = async (tenantId: string) => {
    try {
      await api.post("/auth/tenant", { tenantId });
      setOpen(false);
      await reset();
      navigate("/", { replace: true });
    } catch (err) {
      toast((err as Error).message, "error");
    }
  };
  const tenantName = organizations.find((o) => o.id === summary.data?.workspace.tenantId)?.name;
  return (
    <div className="account" ref={ref}>
      <button className="account__button" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen(!open)} aria-label={`Account menu for ${user.name}`}>
        <span className="account__avatar" aria-hidden>
          {initials(user.name)}
        </span>
        <span style={{ fontSize: 13, maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{tenantName ?? user.name}</span>
      </button>
      {open && (
        <div className="account__menu" role="menu" aria-label="Account">
          <div className="stack" style={{ gap: 2, padding: "4px 8px 8px" }}>
            <strong>{user.name}</strong>
            {user.email && <span className="muted" style={{ fontSize: 12 }}>{user.email}</span>}
            <span className="muted" style={{ fontSize: 12 }}>Signed in with {methodLabel(method)}</span>
          </div>
          <div className="eyebrow" style={{ padding: "4px 8px" }}>
            Organizations
          </div>
          {organizations.map((o) => (
            <button key={o.id} role="menuitemradio" aria-checked={o.id === activeTenant?.id} className="account__item" onClick={() => (o.id === activeTenant?.id ? setOpen(false) : void switchTo(o.id))}>
              <Building2 size={14} aria-hidden />
              <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis" }}>{o.name}</span>
              <span className="role-badge">{ROLE_NAMES[o.role]}</span>
              {o.id === activeTenant?.id ? <Check size={14} aria-label="Active" /> : <span style={{ width: 14 }} />}
            </button>
          ))}
          <Link role="menuitem" to={`/w/${ws}/organization`} onClick={() => setOpen(false)}>
            <Users size={14} aria-hidden /> Members, SSO and API tokens
          </Link>
          <button role="menuitem" className="account__item" onClick={() => void signOut()}>
            <LogOut size={14} aria-hidden /> Sign out
          </button>
        </div>
      )}
    </div>
  );
}

function TopBar({ ws }: { ws: string }) {
  const { data } = useWorkspace(ws);
  const { data: all } = useWorkspaces();
  const meta = useMeta();
  const openPalette = useUi((s) => s.openPalette);
  const navigate = useNavigate();
  const role = data?.access?.role;
  const readOnly = !!data?.access && !data.access.capabilities.includes("work.write");
  const canCreate = !!data?.access?.capabilities.includes("workspace.configure");
  return (
    <header className="topbar">
      <div className="topbar__title">
        <select
          className="select"
          aria-label="Workspace"
          value={data?.workspace.slug ?? ws}
          onChange={(e) => (e.target.value === "__new" ? navigate("/onboarding") : navigate(`/w/${e.target.value}`))}
          style={{ width: 220, minHeight: 32, height: 32, padding: "0 8px", fontWeight: 600 }}
        >
          {data && !(all ?? []).some((w) => w.workspace.id === data.workspace.id) && <option value={data.workspace.slug}>{data.workspace.name}</option>}
          {(all ?? []).map((w) => (
            <option key={w.workspace.id} value={w.workspace.slug}>
              {w.workspace.name}
            </option>
          ))}
          {canCreate && <option value="__new">+ New workspace…</option>}
        </select>
        <span className="row" style={{ gap: 6 }}>
          {data?.frameworks.map((f) => <FrameworkBadge key={f.id} frameworkId={f.id} />)}
        </span>
      </div>
      <button className="topbar__search" onClick={() => openPalette()} aria-label="Search or ask the copilot">
        <Search size={15} />
        <span>Search requirements or ask the copilot…</span>
        <span className="kbd">⌘K</span>
      </button>
      <AgentPulse ws={ws} />
      <span className="badge-agent" title={meta.data?.ai.mode === "claude" ? `Agents run on ${meta.data.ai.model}` : "Agents run deterministic offline playbooks. Set ANTHROPIC_API_KEY on the server to enable Claude."}>
        <Sparkles size={11} />
        {meta.data?.ai.mode === "claude" ? meta.data.ai.model : "offline agents"}
      </span>
      {role && (
        <span className="role-badge" title={readOnly ? "Your role can view this workspace but not change it" : `Your role in this organization`}>
          {ROLE_NAMES[role]}
          {readOnly ? " · read-only" : ""}
        </span>
      )}
      <AccountMenu ws={ws} />
    </header>
  );
}

// ------------------------------------------------------------------ command palette

interface PaletteItem {
  key: string;
  group: string;
  label: ReactNode;
  hint?: string;
  run: () => void;
}

function CommandPalette({ ws }: { ws: string }) {
  const open = useUi((s) => s.paletteOpen);
  const initial = useUi((s) => s.paletteQuery);
  const close = useUi((s) => s.closePalette);
  const focus = useUi((s) => s.focus);
  const navigate = useNavigate();
  const [q, setQ] = useState(initial);
  const [active, setActive] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const search = useSearch(q);

  useEffect(() => {
    if (open) {
      setQ(initial);
      setActive(0);
      setTimeout(() => input.current?.focus(), 10);
    }
  }, [open, initial]);

  const ask = async (agent: string, goal: string, input: Record<string, unknown> = {}) => {
    close();
    try {
      await api.post(`/workspaces/${encodeURIComponent(ws)}/runs`, { agent, goal, input });
      toast(`${agent === "copilot" ? "Copilot" : agent} is working on it — follow along in Agents.`, "agent");
      navigate(`/w/${ws}/agents`);
    } catch (err) {
      toast((err as Error).message, "error");
    }
  };

  const items = useMemo<PaletteItem[]>(() => {
    const out: PaletteItem[] = [];
    const text = q.trim();
    if (text.length > 2) {
      out.push({ key: "ask", group: "Copilot", label: <span>Ask the copilot: “{truncate(text, 70)}”</span>, hint: "↵", run: () => void ask("copilot", text) });
    }
    for (const n of search.data?.nodes ?? []) {
      out.push({
        key: n.id,
        group: "Requirements",
        label: (
          <span className="row" style={{ minWidth: 0 }}>
            <FrameworkBadge frameworkId={n.framework} />
            <span className="mono" style={{ color: "var(--color-primary)" }}>
              {n.code}
            </span>
            <span className="muted">{truncate(n.title || n.text, 80)}</span>
          </span>
        ),
        run: () => {
          close();
          navigate(`/w/${ws}/observatory/${n.framework}`);
          setTimeout(() => focus([n.id]), 60);
        },
      });
    }
    for (const p of (search.data?.passages ?? []).slice(0, 3)) {
      out.push({
        key: `${p.documentId}-${p.page}-${p.quote.slice(0, 10)}`,
        group: "Official corpus",
        label: (
          <span className="stack" style={{ gap: 2, minWidth: 0 }}>
            <span className="muted">{truncate(p.quote, 110)}</span>
            <span style={{ fontSize: 12 }}>
              {truncate(p.documentTitle, 70)}
              {p.page ? `, p. ${p.page}` : ""}
            </span>
          </span>
        ),
        run: () => void ask("copilot", text || p.quote),
      });
    }
    const base = `/w/${ws}`;
    const nav: [string, string][] = [
      ["Mission control", base],
      ["Observatory — NIST CSF 2.0", `${base}/observatory/nist-csf-2.0`],
      ["Observatory — SOC 2", `${base}/observatory/aicpa-tsc-2017`],
      ["Observatory — SP 800-53", `${base}/observatory/nist-sp-800-53-r5`],
      ["Observatory — RMF steps", `${base}/observatory/nist-rmf`],
      ["Observatory — NIST AI RMF", `${base}/observatory/nist-ai-rmf`],
      ["Plan & tasks", `${base}/plan`],
      ["Evidence & monitoring", `${base}/evidence`],
      ["Agents & approvals", `${base}/agents`],
      ["Policies", `${base}/policies`],
      ["CSF profile & tiers", `${base}/profile`],
      ["Crosswalk nexus", `${base}/crosswalk`],
      ["SOC 2 program", `${base}/soc2`],
      ["RMF program", `${base}/rmf`],
      ["AI governance (AI RMF)", `${base}/ai`],
      ["Reports & trust center", `${base}/reports`],
      ["New workspace", "/onboarding"],
    ];
    for (const [label, to] of nav) {
      if (text && !label.toLowerCase().includes(text.toLowerCase())) continue;
      out.push({ key: to, group: "Go to", label, run: () => (close(), navigate(to)) });
    }
    const agents: [string, string, string][] = [
      ["planner", "Plan the next sprint of work for our largest gaps", "Planner"],
      ["assessor", "Assess our current implementation levels from evidence", "Assessor"],
      ["evidence-collector", "Run monitoring checks and find missing evidence", "Evidence Collector"],
      ["auditor-prep", "Prepare an audit readiness brief", "Audit Prep"],
      ["crosswalk-analyst", "Project our CSF progress onto other frameworks", "Crosswalk Analyst"],
    ];
    for (const [agent, goal, name] of agents) {
      if (text && !`${name} ${goal}`.toLowerCase().includes(text.toLowerCase())) continue;
      out.push({ key: `agent-${agent}`, group: "Run an agent", label: <span className="row"><AgentBadge label={name} /> {goal}</span>, run: () => void ask(agent, goal) });
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, search.data, ws]);

  if (!open) return null;
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(items.length - 1, a + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(0, a - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      items[active]?.run();
    } else if (e.key === "Escape") close();
  };
  let lastGroup = "";
  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && close()}>
      <div className="palette" role="dialog" aria-label="Command palette">
        <input
          ref={input}
          className="palette__input"
          placeholder="Search GV.OC-01, CC6.1, AC-2… or ask anything"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setActive(0);
          }}
          onKeyDown={onKey}
          aria-activedescendant={items[active]?.key}
        />
        <div className="palette__list" role="listbox">
          {items.map((item, i) => {
            const header = item.group !== lastGroup ? <div className="palette__group eyebrow">{item.group}</div> : null;
            lastGroup = item.group;
            return (
              <div key={item.key}>
                {header}
                <button id={item.key} role="option" aria-selected={i === active} className="palette__item" onMouseEnter={() => setActive(i)} onClick={() => item.run()}>
                  {item.label}
                  {item.hint ? <span className="kbd">{item.hint}</span> : null}
                </button>
              </div>
            );
          })}
          {!items.length && <div className="muted" style={{ padding: 16 }}>No results.</div>}
        </div>
      </div>
    </div>
  );
}

export function Shell() {
  const { ws = "" } = useParams();
  const { data, error } = useWorkspace(ws);
  const openPalette = useUi((s) => s.openPalette);
  const navigate = useNavigate();
  useWorkspaceEvents(data?.workspace.id);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        openPalette();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openPalette]);

  useEffect(() => {
    if (error) navigate("/");
  }, [error, navigate]);

  return (
    <div className="shell">
      <NavRail ws={ws} approvals={data?.approvals ?? 0} />
      <TopBar ws={ws} />
      <main className="main" id="main">
        <Outlet />
      </main>
      <CommandPalette ws={ws} />
      <Toasts />
    </div>
  );
}

export function FrameworkName({ id }: { id: string }) {
  return <>{FRAMEWORK_SHORT[id] ?? id}</>;
}

export { Orbit };
