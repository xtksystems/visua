/** App shell: labeled sidebar, top bar, command palette, toasts, live events. */
import {
  Activity,
  BookCheck,
  BrainCircuit,
  Bot,
  Building2,
  Check,
  LogOut,
  Menu,
  Users,
  X,
  ClipboardList,
  FileText,
  GitCompareArrows,
  LayoutDashboard,
  Network,
  Radar,
  Scale,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Telescope,
  Waypoints,
} from "lucide-react";
import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate, useParams } from "react-router-dom";
import { api, setCsrfToken } from "../../lib/api.ts";
import { ROLE_NAMES, useCan, useMe, useResetSession } from "../../lib/auth.ts";
import { initials } from "../../pages/LoginPage.tsx";
import { useWorkspaceEvents } from "../../lib/events.ts";
import { truncate } from "../../lib/format.ts";
import { useModalFocus } from "../../lib/modal.ts";
import { allFrameworks, threatCatalogs } from "../../lib/frameworks.ts";
import { useMeta, useSearch, useWorkspace, useWorkspaceRoute, useWorkspaces } from "../../lib/queries.ts";
import { WorkspaceContext, useWorkspaceId } from "../../lib/workspace.ts";
import { QueryError } from "../ui/QueryError.tsx";
import { useAgentActivity } from "../../state/agentActivity.ts";
import { useUi } from "../../state/ui.ts";
import { AgentBadge, FrameworkBadge, Logo, toast, Toasts } from "../ui/index.tsx";

function RailItem({ to, icon, label, badge, end }: { to: string; icon: ReactNode; label: string; badge?: number; end?: boolean }) {
  return (
    <NavLink to={to} end={end} className="rail__item" aria-label={label} title={label}>
      {icon}
      {/* Keep destinations visible on desktop and in the mobile menu. */}
      <span className="rail__label" aria-hidden>
        {label}
      </span>
      {badge ? <span className="rail__badge">{badge > 99 ? "99+" : badge}</span> : null}
    </NavLink>
  );
}

function NavRail({ ws, approvals }: { ws: string; approvals: number }) {
  const base = `/w/${ws}`;
  const s = 18;
  return (
    <nav className="rail" id="primary-nav" aria-label="Primary">
      <Link to={base} className="rail__logo" aria-label="Visua home">
        <span className="rail__mark"><Logo size={28} /></span>
        <span className="rail__wordmark">visua<span className="rail__wordmark-dot">.</span></span>
      </Link>
      <div className="rail__group">
        <span className="rail__section">Workspace</span>
        <RailItem to={base} end icon={<LayoutDashboard size={s} />} label="Overview" />
        <RailItem to={`${base}/plan`} icon={<ClipboardList size={s} />} label="Action plan" />
        <RailItem to={`${base}/my-work`} icon={<Users size={s} />} label="My work" />
        <RailItem to={`${base}/evidence`} icon={<BookCheck size={s} />} label="Evidence" />
        <RailItem to={`${base}/agents`} icon={<Bot size={s} />} label="Agents" badge={approvals} />
        <RailItem to={`${base}/policies`} icon={<FileText size={s} />} label="Policies" />
        <RailItem to={`${base}/reports`} icon={<Activity size={s} />} label="Reports & trust" />
      </div>
      <div className="rail__group">
        <span className="rail__section">Explore</span>
        <RailItem to={`${base}/observatory`} icon={<Telescope size={s} />} label="Observatory" />
        <RailItem to={`${base}/profile`} icon={<Waypoints size={s} />} label="CSF profile & tiers" />
        <RailItem to={`${base}/crosswalk`} icon={<GitCompareArrows size={s} />} label="Crosswalk nexus" />
        <RailItem to={`${base}/soc2`} icon={<ShieldCheck size={s} />} label="SOC 2 program" />
        <RailItem to={`${base}/rmf`} icon={<Network size={s} />} label="RMF program" />
        <RailItem to={`${base}/ai`} icon={<BrainCircuit size={s} />} label="AI governance" />
        <RailItem to={`${base}/laws`} icon={<Scale size={s} />} label="State AI laws" />
        <RailItem to={`${base}/threats`} icon={<Radar size={s} />} label="AI threats" />
      </div>
      <span className="rail__spacer" />
      <div className="rail__group rail__group--footer">
        <span className="rail__section">Manage</span>
        <RailItem to={`${base}/organization`} icon={<Building2 size={s} />} label="Organization" />
        <RailItem to={`${base}/settings`} icon={<Settings size={s} />} label="Settings" />
      </div>
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
    <button className="btn btn--quiet btn--sm topbar__pulse" onClick={() => navigate(`/w/${ws}/agents`)} title="Agent activity" style={{ maxWidth: 360 }}>
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
        <span className="account__name">{tenantName ?? user.name}</span>
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
  const navOpen = useUi((s) => s.navOpen);
  const setNav = useUi((s) => s.setNav);
  return (
    <header className="topbar">
      <button className="btn btn--quiet btn--icon topbar__menu" aria-label={navOpen ? "Close menu" : "Open menu"} aria-expanded={navOpen} aria-controls="primary-nav" onClick={() => setNav(!navOpen)}>
        {navOpen ? <X size={18} /> : <Menu size={18} />}
      </button>
      <div className="topbar__title">
        <select
          className="select topbar__ws"
          aria-label="Workspace"
          value={data?.workspace.slug ?? ws}
          onChange={(e) => (e.target.value === "__new" ? navigate("/onboarding") : navigate(`/w/${e.target.value}`))}
        >
          {data && !(all ?? []).some((w) => w.workspace.id === data.workspace.id) && <option value={data.workspace.slug}>{data.workspace.name}</option>}
          {(all ?? []).map((w) => (
            <option key={w.workspace.id} value={w.workspace.slug}>
              {w.workspace.name}
            </option>
          ))}
          {canCreate && <option value="__new">+ New workspace…</option>}
        </select>
        <span className="row topbar__frameworks" style={{ gap: 6 }}>
          {data?.frameworks.map((f) => <FrameworkBadge key={f.id} frameworkId={f.id} />)}
        </span>
      </div>
      <button className="topbar__search" onClick={() => openPalette()} aria-label={readOnly ? "Search requirements" : "Search or ask the copilot"}>
        <Search size={15} />
        <span className="topbar__search-text">{readOnly ? "Search requirements…" : "Search requirements or ask the copilot…"}</span>
        <span className="kbd">⌘K</span>
      </button>
      <AgentPulse ws={ws} />
      <span className="badge-agent topbar__agents" title={meta.data?.ai.mode === "claude" ? `Agents run on ${meta.data.ai.model}` : "Agents run deterministic offline playbooks. Set ANTHROPIC_API_KEY on the server to enable Claude."}>
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
  const workspaceId = useWorkspaceId();
  const canWrite = useCan("work.write");
  const canConfigure = useCan("workspace.configure");
  const open = useUi((s) => s.paletteOpen);
  const initial = useUi((s) => s.paletteQuery);
  const close = useUi((s) => s.closePalette);
  const navigate = useNavigate();
  const [q, setQ] = useState(initial);
  const [active, setActive] = useState(0);
  const [passage, setPassage] = useState<{ quote: string; documentTitle: string; page?: number } | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const dialog = useRef<HTMLDivElement>(null);
  const paletteId = useId();
  const listId = `${paletteId}-results`;
  const search = useSearch(q);
  useModalFocus(dialog, close, { open, initialFocusRef: input });

  useEffect(() => {
    if (open) {
      setQ(initial);
      setActive(0);
      setPassage(null);
    }
  }, [open, initial]);

  const ask = async (agent: string, goal: string, input: Record<string, unknown> = {}) => {
    if (!canWrite) return;
    close();
    try {
      await api.post(`/workspaces/${encodeURIComponent(workspaceId)}/runs`, { agent, goal, input });
      toast(`${agent === "copilot" ? "Copilot" : agent} is working on it — follow along in Agents.`, "agent");
      navigate(`/w/${ws}/agents`);
    } catch (err) {
      toast((err as Error).message, "error");
    }
  };

  const items = useMemo<PaletteItem[]>(() => {
    const out: PaletteItem[] = [];
    const text = q.trim();
    const results = text.length >= 2 && !search.isPlaceholderData ? search.data : undefined;
    if (canWrite && text.length > 2) {
      out.push({ key: "ask", group: "Copilot", label: <span>Ask the copilot: “{truncate(text, 70)}”</span>, hint: "↵", run: () => void ask("copilot", text) });
    }
    for (const n of results?.nodes ?? []) {
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
          navigate(`/w/${workspaceId}/observatory/${n.framework}?select=${encodeURIComponent(n.id)}`);
        },
      });
    }
    for (const p of (results?.passages ?? []).slice(0, 3)) {
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
        run: () => setPassage(p),
      });
    }
    const base = `/w/${ws}`;
    const nav: [string, string][] = [
      ["Overview", base],
      ...allFrameworks().map((f): [string, string] => [`Observatory — ${f.shortName}${f.family === "threat" ? " coverage in 3D" : ""}`, `${base}/observatory/${f.id}`]),
      ["Plan & tasks", `${base}/plan`],
      ["My work", `${base}/my-work`],
      ["Evidence & monitoring", `${base}/evidence`],
      ["Agents & approvals", `${base}/agents`],
      ["Policies", `${base}/policies`],
      ["CSF profile & tiers", `${base}/profile`],
      ["Crosswalk nexus", `${base}/crosswalk`],
      ["SOC 2 program", `${base}/soc2`],
      ["RMF program", `${base}/rmf`],
      ["AI governance (AI RMF)", `${base}/ai`],
      ["State AI laws", `${base}/laws`],
      ...threatCatalogs().map((f): [string, string] => [`AI threats — ${f.name}`, `${base}/threats/${f.id}`]),
      ["Reports & trust center", `${base}/reports`],
      ...(canConfigure ? [["New workspace", "/onboarding"] as [string, string]] : []),
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
      if (!canWrite) continue;
      if (text && !`${name} ${goal}`.toLowerCase().includes(text.toLowerCase())) continue;
      out.push({ key: `agent-${agent}`, group: "Run an agent", label: <span className="row"><AgentBadge label={name} /> {goal}</span>, run: () => void ask(agent, goal) });
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, search.data, search.isPlaceholderData, ws, workspaceId, canWrite, canConfigure]);

  const activeIndex = Math.max(0, Math.min(active, items.length - 1));
  useEffect(() => {
    if (open && items.length) document.getElementById(`${listId}-${activeIndex}`)?.scrollIntoView({ block: "nearest" });
  }, [open, activeIndex, items, listId]);

  if (!open) return null;
  const onKey = (e: React.KeyboardEvent) => {
    if (e.nativeEvent.isComposing) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive(Math.min(Math.max(0, items.length - 1), activeIndex + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive(Math.max(0, activeIndex - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      items[activeIndex]?.run();
    }
  };
  let lastGroup = "";
  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && close()}>
      <div ref={dialog} tabIndex={-1} className="palette" role="dialog" aria-modal="true" aria-label="Command palette">
        <input
          ref={input}
          className="palette__input"
          placeholder={canWrite ? "Search GV.OC-01, CC6.1, AC-2… or ask anything" : "Search GV.OC-01, CC6.1, AC-2…"}
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setActive(0);
            setPassage(null);
          }}
          onKeyDown={onKey}
          role="combobox"
          aria-label="Search requirements and commands"
          aria-autocomplete="list"
          aria-expanded="true"
          aria-controls={listId}
          aria-activedescendant={items.length ? `${listId}-${activeIndex}` : undefined}
        />
        {passage && <section className="panel stack" aria-label="Official passage" style={{ margin: 12 }}>
          <strong>{passage.documentTitle}{passage.page ? `, p. ${passage.page}` : ""}</strong>
          <blockquote style={{ margin: 0 }}>{passage.quote}</blockquote>
          <button className="btn btn--quiet" onClick={() => setPassage(null)}>Close passage</button>
        </section>}
        <div id={listId} className="palette__list" role="listbox" aria-label="Requirements and commands">
          {items.map((item, i) => {
            const header = item.group !== lastGroup ? <div className="palette__group eyebrow">{item.group}</div> : null;
            lastGroup = item.group;
            return (
              <div key={item.key}>
                {header}
                <button id={`${listId}-${i}`} tabIndex={-1} role="option" aria-selected={i === activeIndex} className="palette__item" onMouseEnter={() => setActive(i)} onClick={() => item.run()}>
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
  const route = useWorkspaceRoute(ws);
  const summary = useWorkspace(route.data?.workspace.id);
  const data = summary.data;
  // Framework families, names and pages come from /api/meta: pages render once it has loaded.
  const meta = useMeta();
  const openPalette = useUi((s) => s.openPalette);
  const navOpen = useUi((s) => s.navOpen);
  const setNav = useUi((s) => s.setNav);
  const location = useLocation();
  useWorkspaceEvents(data?.workspace.id);
  // A workspace switch must not retain another workspace's inspected selection.
  const select = useUi((s) => s.select);
  useLayoutEffect(() => {
    select(null);
    useAgentActivity.getState().setWorkspace(data?.workspace.id);
  }, [data?.workspace.id, select]);
  useLayoutEffect(() => () => useAgentActivity.getState().reset(), []);

  // The menu closes when a destination is chosen, on Escape, and when the window grows past it.
  useEffect(() => setNav(false), [location.pathname, setNav]);
  useEffect(() => {
    if (!navOpen) return;
    const onKey = (e: KeyboardEvent) => !e.defaultPrevented && e.key === "Escape" && setNav(false);
    const wide = window.matchMedia("(min-width: 1025px)");
    const onWide = () => wide.matches && setNav(false);
    window.addEventListener("keydown", onKey);
    wide.addEventListener("change", onWide);
    return () => {
      window.removeEventListener("keydown", onKey);
      wide.removeEventListener("change", onWide);
    };
  }, [navOpen, setNav]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (!document.querySelector('[role="dialog"][aria-modal="true"]')) openPalette();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openPalette]);

  if (route.error || summary.error) return <QueryError title="Unable to open this workspace" error={route.error ?? summary.error} retry={() => route.error ? route.refetch() : summary.refetch()}><Link className="btn" to="/">Workspaces</Link></QueryError>;
  if (meta.error) return <QueryError title="Unable to load Visua" error={meta.error} retry={() => meta.refetch()} />;
  if (!data || !meta.data) return <div className="page muted">Loading Visua…</div>;
  return (
    <WorkspaceContext.Provider key={data.workspace.id} value={{ id: data.workspace.id, slug: data.workspace.slug, route: ws }}>
    <div className={`shell ${navOpen ? "shell--nav-open" : ""}`}>
      <NavRail ws={ws} approvals={data?.approvals ?? 0} />
      {navOpen && <div className="shell__backdrop" onClick={() => setNav(false)} aria-hidden />}
      <TopBar ws={ws} />
      <main className="main" id="main">
        <Outlet />
      </main>
      <CommandPalette ws={ws} />
      <Toasts />
    </div>
    </WorkspaceContext.Provider>
  );
}
