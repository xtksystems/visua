/**
 * U.S. state AI laws: which laws apply to the organization and in what role,
 * when their obligations take effect, and progress on the obligations in
 * scope. Obligation text is the statute's own; nothing here is legal advice.
 */
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, ChevronRight, Gavel, Scale, Telescope } from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import type { Status } from "@visua/core";
import { LawTimeline } from "../components/laws/Timeline.tsx";
import { Empty, Progress, StatusBar, StatusChip, toast } from "../components/ui/index.tsx";
import { api } from "../lib/api.ts";
import { useCan } from "../lib/auth.ts";
import { keys, useWorkspace } from "../lib/queries.ts";

const LAWS = "us-state-ai-laws";
const enc = encodeURIComponent;

interface LawRole {
  role: string;
  obligations: number;
  definition?: string;
}
interface Law {
  id: string;
  lawId: string;
  code: string;
  title: string;
  citation: { documentId: string; locator?: string };
  summary: string;
  status: string;
  statusNote?: string;
  enacted?: string;
  effective?: string;
  sunset?: string;
  enforcement?: { authority?: string; penalties?: string; privateRight?: string };
  safeHarbors: { text: string; section: string; references?: string[]; note?: string }[];
  roles: LawRole[];
  applicability: { roles: string[]; note?: string; decidedAt: string; decidedBy: string } | null;
  obligations: number;
  inScope: number;
  /** In scope and in force today. */
  inForce: number;
  readiness: number;
  gaps: number;
  counts?: Record<Status, number>;
  status_: Status | null;
  upcoming: string | null;
  /** In scope but not in effect yet: prepared share, not counted in readiness. */
  upcomingInScope: { total: number; readiness: number; next: string | null };
}
interface LawsOverview {
  enabled: boolean;
  /** Obligations in force today and in scope. */
  readiness: number;
  gaps: number;
  total: number;
  upcoming: { total: number; readiness: number; gaps: number };
  obligations: number;
  laws: number;
  jurisdictions: { id: string; code: string; name: string; laws: Law[] }[];
  timeline: { date: string; lawCode: string; lawId: string; label: string; obligations: number; past: boolean }[];
  today: string;
}
interface Obligation {
  id: string;
  code: string;
  title: string;
  text: string;
  meta?: Record<string, unknown>;
}

const roleLabel = (r: string) => r.replace(/-/g, " ");

function Obligations({ ws, law }: { ws: string; law: Law }) {
  const graph = useQuery({ queryKey: keys.graph(LAWS), queryFn: () => api.get<{ nodes: (Obligation & { parentId: string | null })[] }>(`/frameworks/${LAWS}`), staleTime: Infinity });
  const state = useQuery({
    queryKey: keys.state(ws, LAWS),
    queryFn: () => api.get<{ units: Record<string, { applicable: boolean; status: Status; current: number; target: number; upcoming?: string }> }>(`/workspaces/${enc(ws)}/frameworks/${LAWS}/state`),
  });
  const rows = (graph.data?.nodes ?? []).filter((n) => n.parentId === law.id);
  return (
    <table className="table table--obligations" style={{ marginTop: 8 }}>
      <thead>
        <tr>
          <th style={{ width: 150 }}>Obligation</th>
          <th>Summary</th>
          <th style={{ width: 150 }}>Applies to</th>
          <th style={{ width: 110 }}>Effective</th>
          <th style={{ width: 140 }}>Status</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((o) => {
          const u = state.data?.units[o.id];
          const meta = o.meta ?? {};
          return (
            <tr key={o.id} title={o.text}>
              <td>
                <Link to={`/w/${ws}/observatory/${LAWS}?select=${enc(o.id)}`} className="mono" style={{ color: "var(--color-primary)" }}>
                  {o.code}
                </Link>
              </td>
              <td>{o.title}</td>
              <td className="muted" style={{ fontSize: 12 }}>
                {String(meta["role"] ?? "")}
              </td>
              <td className="mono" style={{ fontSize: 12 }}>
                {String(meta["effective"] ?? law.effective ?? "—")}
              </td>
              <td>
                {u ? (
                  <span className="row row--wrap" style={{ gap: 4 }}>
                    <StatusChip status={u.applicable ? u.status : "not-applicable"} />
                    {u.applicable && u.upcoming ? (
                      <span className="chip" style={{ cursor: "default", height: 22 }} title={`Takes effect ${u.upcoming}: not counted in today's readiness`}>
                        ○ upcoming
                      </span>
                    ) : null}
                  </span>
                ) : null}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

/** Laws the organization has not decided on stay one line until opened. */
function LawRow({ ws, law }: { ws: string; law: Law }) {
  const [expanded, setExpanded] = useState(!!law.applicability);
  if (expanded) return <LawCard ws={ws} law={law} onCollapse={law.applicability ? undefined : () => setExpanded(false)} />;
  return (
    <button type="button" className="panel row row--wrap law-row" style={{ gap: 8 }} onClick={() => setExpanded(true)} aria-expanded={false}>
      <ChevronRight size={14} aria-hidden className="muted" />
      <span className="badge-fw badge-fw--law">{law.code}</span>
      <strong style={{ textAlign: "left" }}>{law.title}</strong>
      <span style={{ flex: 1 }} />
      <span className="muted" style={{ fontSize: 12 }}>
        {law.status}
        {law.effective ? ` · ${law.effective}` : ""} · {law.obligations} obligations · roles: {law.roles.map((r) => roleLabel(r.role)).join(", ") || "—"}
      </span>
      <span className="chip" style={{ cursor: "pointer" }}>
        Not decided
      </span>
    </button>
  );
}

function LawCard({ ws, law, onCollapse }: { ws: string; law: Law; onCollapse?: () => void }) {
  const qc = useQueryClient();
  const canDecide = useCan("work.approve");
  const [roles, setRoles] = useState<string[] | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const chosen = roles ?? law.applicability?.roles ?? [];
  const dirty = roles !== null || note !== null;
  const toggle = (r: string) => setRoles(chosen.includes(r) ? chosen.filter((x) => x !== r) : [...chosen, r]);
  const save = async () => {
    setBusy(true);
    try {
      await api.put(`/workspaces/${enc(ws)}/laws/${enc(law.lawId)}/applicability`, { roles: chosen, note: note ?? law.applicability?.note });
      toast(chosen.length ? `${law.code}: applicability recorded` : `${law.code} marked as not applying`);
      setRoles(null);
      setNote(null);
      await qc.invalidateQueries({ queryKey: ["ws", ws] });
    } catch (err) {
      toast((err as Error).message, "error");
    } finally {
      setBusy(false);
    }
  };
  const inForce = law.status.toLowerCase().startsWith("in force");
  const aiRmfHarbor = law.safeHarbors.some((h) => (h.references ?? []).some((r) => /AI 600-1|AI RMF|AI 100-1/i.test(r)) || /Risk Management Framework/i.test(h.text));
  return (
    <article className="panel stack" style={{ gap: 12 }} aria-labelledby={`law-${law.lawId}`}>
      <div className="row row--wrap" style={{ gap: 8 }}>
        {onCollapse && (
          <button type="button" className="btn btn--quiet btn--icon btn--sm" onClick={onCollapse} aria-label={`Collapse ${law.code}`} aria-expanded>
            <ChevronDown size={14} aria-hidden />
          </button>
        )}
        <span className="badge-fw badge-fw--law">{law.code}</span>
        <h3 id={`law-${law.lawId}`} style={{ margin: 0, fontSize: 16 }}>
          {law.title}
        </h3>
        <span style={{ flex: 1 }} />
        <span className="role-badge" title={law.statusNote}>
          <Gavel size={11} aria-hidden /> {law.status}
          {law.effective ? ` · ${inForce ? "since" : "from"} ${law.effective}` : ""}
          {law.sunset ? ` · sunsets ${law.sunset}` : ""}
        </span>
      </div>
      <div className="muted" style={{ fontSize: 12 }}>
        {law.citation.locator}
      </div>
      <fieldset disabled={!canDecide || busy} style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>
        <legend className="eyebrow" style={{ marginBottom: 6 }}>
          Applies to us as
        </legend>
        <div className="row row--wrap" style={{ gap: 6 }}>
          {law.roles.map((r) => (
            <label key={r.role} className="chip" aria-pressed={chosen.includes(r.role)} title={r.definition ?? `${r.obligations} obligation(s) apply to this role`} style={{ cursor: canDecide ? "pointer" : "default" }}>
              <input type="checkbox" checked={chosen.includes(r.role)} onChange={() => toggle(r.role)} style={{ marginRight: 6 }} />
              {roleLabel(r.role)}
              <span className="muted" style={{ marginLeft: 6 }}>
                {r.obligations}
              </span>
            </label>
          ))}
        </div>
        <div className="row row--wrap" style={{ gap: 8, marginTop: 8 }}>
          <input className="input" style={{ flex: "1 1 260px" }} placeholder="Basis for this decision (e.g. which of our products or activities it covers, and where)" value={note ?? law.applicability?.note ?? ""} onChange={(e) => setNote(e.target.value)} aria-label={`Basis for ${law.code} applicability`} />
          {canDecide && (
            <button className="btn btn--primary" disabled={!dirty || busy} onClick={() => void save()}>
              {chosen.length ? "Record applicability" : "Record: does not apply"}
            </button>
          )}
        </div>
        {law.applicability && (
          <div className="muted" style={{ fontSize: 11.5, marginTop: 4 }}>
            Decided {law.applicability.decidedAt.slice(0, 10)} by {law.applicability.decidedBy}
          </div>
        )}
      </fieldset>
      <div className="row row--wrap law-card__score" style={{ gap: 12 }}>
        <div style={{ minWidth: 150 }}>
          <span className="mono">{law.inForce}</span> <span className="muted">in force · {law.inScope} of {law.obligations} in scope</span>
        </div>
        <div style={{ flex: "1 1 160px" }}>{law.counts && law.inForce ? <StatusBar counts={law.counts} height={6} /> : <Progress value={0} />}</div>
        <span className="mono" style={{ width: 44, textAlign: "right" }} title="Readiness of the obligations in force today">
          {law.inForce ? `${Math.round(law.readiness * 100)}%` : "—"}
        </span>
        <span className="muted" style={{ width: 70 }}>
          {law.gaps} gaps
        </span>
        {law.status_ && law.inForce > 0 && <StatusChip status={law.status_} />}
      </div>
      {law.upcomingInScope.total > 0 ? (
        <div className="muted" style={{ fontSize: 12 }}>
          ○ {law.upcomingInScope.total} obligation{law.upcomingInScope.total === 1 ? "" : "s"} in scope take{law.upcomingInScope.total === 1 ? "s" : ""} effect from <strong>{law.upcomingInScope.next}</strong>: {Math.round(law.upcomingInScope.readiness * 100)}% prepared, not counted in today's readiness.
        </div>
      ) : law.upcoming ? (
        <div className="muted" style={{ fontSize: 12 }}>
          Next obligations take effect on <strong>{law.upcoming}</strong>.
        </div>
      ) : null}
      {law.safeHarbors.length > 0 && (
        <details>
          <summary className="eyebrow" style={{ cursor: "pointer" }}>
            Safe harbors and defenses ({law.safeHarbors.length})
          </summary>
          <ul className="stack" style={{ gap: 8, paddingLeft: 18, marginTop: 8 }}>
            {law.safeHarbors.map((h) => (
              <li key={h.section} style={{ fontSize: 13 }}>
                <span className="mono" style={{ fontSize: 11.5 }}>
                  {h.section}
                </span>{" "}
                {h.text}
                {h.note ? <div className="muted" style={{ fontSize: 12 }}>{h.note}</div> : null}
              </li>
            ))}
          </ul>
          {aiRmfHarbor && (
            <p style={{ fontSize: 13 }}>
              This law recognizes the NIST AI RMF or its Generative AI Profile. <Link to={`/w/${ws}/ai`}>See your AI RMF readiness →</Link>
            </p>
          )}
        </details>
      )}
      {law.enforcement && (law.enforcement.authority || law.enforcement.penalties) && (
        <details>
          <summary className="eyebrow" style={{ cursor: "pointer" }}>
            Enforcement
          </summary>
          <div className="stack" style={{ gap: 6, fontSize: 13, marginTop: 8 }}>
            {law.enforcement.authority && <p style={{ margin: 0 }}>{law.enforcement.authority}</p>}
            {law.enforcement.penalties && <p className="muted" style={{ margin: 0 }}>{law.enforcement.penalties}</p>}
          </div>
        </details>
      )}
      <div className="row" style={{ gap: 8 }}>
        <button className="btn btn--quiet btn--sm" onClick={() => setOpen(!open)} aria-expanded={open}>
          {open ? <ChevronDown size={14} aria-hidden /> : <ChevronRight size={14} aria-hidden />} {law.obligations} obligations
        </button>
        <Link className="btn btn--quiet btn--sm" to={`/w/${ws}/observatory/${LAWS}?select=${enc(law.id)}`}>
          <Telescope size={14} aria-hidden /> In 3D
        </Link>
      </div>
      {open && <Obligations ws={ws} law={law} />}
    </article>
  );
}

export function LawsPage() {
  const { ws = "" } = useParams();
  const qc = useQueryClient();
  const workspace = useWorkspace(ws);
  const canConfigure = useCan("workspace.configure");
  const enabled = !!workspace.data?.frameworks.some((f) => f.id === LAWS);
  const overview = useQuery({ queryKey: [...keys.workspace(ws), "laws"], queryFn: () => api.get<LawsOverview>(`/workspaces/${enc(ws)}/laws`), enabled: !!ws });
  const [filter, setFilter] = useState("");
  const data = overview.data;
  const jurisdictions = useMemo(
    () =>
      (data?.jurisdictions ?? [])
        .map((j) => ({ ...j, laws: j.laws.filter((l) => !filter || `${l.code} ${l.title} ${j.name}`.toLowerCase().includes(filter.toLowerCase())) }))
        .filter((j) => j.laws.length),
    [data, filter],
  );
  if (overview.isError) return <div className="page muted">{(overview.error as Error).message}</div>;
  if (!data) return <div className="page muted">Loading…</div>;
  const enable = async () => {
    try {
      await api.put(`/workspaces/${enc(ws)}/frameworks/${LAWS}`, { enabled: true });
      toast("U.S. state AI laws enabled — record which laws apply to you");
      await qc.invalidateQueries({ queryKey: ["ws", ws] });
      await qc.invalidateQueries({ queryKey: keys.workspaces });
    } catch (err) {
      toast((err as Error).message, "error");
    }
  };
  return (
    <div className="page">
      <header className="page__header">
        <div>
          <div className="eyebrow">AI laws · United States</div>
          <h1>
            State AI laws{enabled && data.total ? ` · ${Math.round(data.readiness * 100)}% of obligations in force` : ""}
          </h1>
          {enabled && data.upcoming.total > 0 && (
            <p className="muted" style={{ marginTop: 4 }}>
              ○ {data.upcoming.total} more obligation{data.upcoming.total === 1 ? "" : "s"} in scope take effect later: {Math.round(data.upcoming.readiness * 100)}% prepared.
            </p>
          )}
          <p>
            {data.laws} laws and regulations, {data.obligations} obligations quoted from the statutes and adopted regulations. Record the role you hold under each law —
            developer, deployer, employer, operator… as the law defines it — and Visua scopes its obligations. This is a tracking tool, not legal advice.
          </p>
        </div>
        <div className="page__actions">
          {!enabled && canConfigure && (
            <button className="btn btn--primary" onClick={() => void enable()}>
              <Scale size={14} aria-hidden /> Track state AI laws
            </button>
          )}
          {enabled && (
            <Link className="btn btn--primary" to={`/w/${ws}/observatory/${LAWS}`}>
              <Telescope size={14} aria-hidden /> Obligations in 3D
            </Link>
          )}
        </div>
      </header>
      {!enabled && (
        <Empty title="Not tracked in this workspace">
          {canConfigure ? "Turn on tracking to record which laws apply and follow their obligations." : "Ask an admin to turn on tracking of U.S. state AI laws."}
        </Empty>
      )}
      <div className="stack" style={{ gap: 16 }}>
        <LawTimeline timeline={data.timeline} today={data.today} />
        <input className="input" placeholder="Filter laws (state, code, title)" value={filter} onChange={(e) => setFilter(e.target.value)} aria-label="Filter laws" style={{ maxWidth: 420 }} />
        {jurisdictions.map((j) => (
          <section key={j.id} className="stack" style={{ gap: 12 }} aria-labelledby={`j-${j.code}`}>
            <h2 id={`j-${j.code}`} className="section-title" style={{ margin: 0 }}>
              {j.name} <span className="muted">· {j.laws.length}</span>
            </h2>
            {j.laws.map((l) => (enabled ? <LawRow key={l.id} ws={ws} law={l} /> : <LawSummary key={l.id} law={l} />))}
          </section>
        ))}
        <p className="muted" style={{ fontSize: 12 }}>
          Sources: enrolled bills, codified statutes and adopted regulations from the state legislatures and agencies, stored in the local corpus with checksums. Titles, role
          labels and suggested evidence are Visua summaries. Laws change — check each law's status and dates, and consult counsel.
        </p>
      </div>
    </div>
  );
}

function LawSummary({ law }: { law: Law }) {
  return (
    <div className="panel row row--wrap" style={{ gap: 8 }}>
      <span className="badge-fw badge-fw--law">{law.code}</span>
      <strong>{law.title}</strong>
      <span style={{ flex: 1 }} />
      <span className="muted" style={{ fontSize: 12 }}>
        {law.status}
        {law.effective ? ` · ${law.effective}` : ""} · {law.obligations} obligations
      </span>
    </div>
  );
}
