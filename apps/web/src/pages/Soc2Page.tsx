/**
 * SOC 2 program: examination scope (Trust Services Categories, Type 1/Type 2,
 * observation window), readiness by criteria series, the DC 200 system
 * description checklist and the PBC request list.
 */
import { useQuery } from "@tanstack/react-query";
import { Download, FileText, Telescope } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import type { Soc2Settings } from "@visua/core";
import { Empty, Segmented, StatusBar, toast } from "../components/ui/index.tsx";
import { api, exportUrl } from "../lib/api.ts";
import { shortDate } from "../lib/format.ts";
import { useFrameworkState, useGraph, useMeta, useWorkspace, useWsMutation } from "../lib/queries.ts";

const TSC = "aicpa-tsc-2017";
type Category = Soc2Settings["categories"][number];
const CATEGORIES: { id: Category; label: string; group: string; note: string }[] = [
  { id: "security", label: "Security", group: "CC", note: "Required — the Common Criteria apply to every SOC 2 examination." },
  { id: "availability", label: "Availability", group: "A", note: "Uptime, capacity, backup and recovery commitments." },
  { id: "processing-integrity", label: "Processing integrity", group: "PI", note: "Complete, valid, accurate, timely and authorized processing." },
  { id: "confidentiality", label: "Confidentiality", group: "C", note: "Information designated as confidential is protected." },
  { id: "privacy", label: "Privacy", group: "P", note: "Personal information is collected, used, retained, disclosed and disposed of per commitments." },
];

interface DescriptionItem {
  id: string;
  title: string;
  /** Official DC 200 text — only when this installation holds a licensed copy. */
  text?: string;
  items?: { marker: string; text: string }[];
  page?: number;
  licensed: boolean;
  derived: { status: "drafted" | "needs-input" | "not-applicable"; facts: string[] };
}

function ObservationWindow({ start, end }: { start?: string; end?: string }) {
  if (!start || !end) return null;
  const s = new Date(start).getTime();
  const e = new Date(end).getTime();
  const now = Date.now();
  const total = Math.max(1, Math.round((e - s) / 86_400_000));
  const elapsed = Math.min(total, Math.max(0, Math.round((now - s) / 86_400_000)));
  const pct = (elapsed / total) * 100;
  const phase = now < s ? "Not started" : now > e ? "Window closed — ready for fieldwork" : `${elapsed} of ${total} days elapsed`;
  return (
    <div style={{ marginTop: 14 }}>
      <div className="row" style={{ fontSize: 12, marginBottom: 6 }}>
        <span className="mono muted">{shortDate(start)}</span>
        <span style={{ flex: 1, textAlign: "center" }}>{phase}</span>
        <span className="mono muted">{shortDate(end)}</span>
      </div>
      <div style={{ position: "relative", height: 8, borderRadius: 99, background: "var(--color-surface-raised)", border: "1px solid var(--color-outline)" }} role="img" aria-label={`Observation window: ${phase}`}>
        <div style={{ position: "absolute", inset: 0, width: `${pct}%`, borderRadius: 99, background: "var(--color-primary)", opacity: 0.8 }} />
      </div>
      <p className="muted" style={{ fontSize: 12, marginTop: 8 }}>
        A Type 2 report covers operating effectiveness over this period: evidence must show controls operated throughout it, not just on the day of the audit.
      </p>
    </div>
  );
}

function Scope({ ws, settings }: { ws: string; settings: Soc2Settings }) {
  const [draft, setDraft] = useState(settings);
  useEffect(() => setDraft(settings), [settings]);
  const save = useWsMutation(ws, (soc2: Soc2Settings) => api.put(`/workspaces/${encodeURIComponent(ws)}/frameworks/${TSC}`, { soc2 }));
  const toggle = (c: Category) => {
    if (c === "security") return;
    setDraft({ ...draft, categories: draft.categories.includes(c) ? draft.categories.filter((x) => x !== c) : [...draft.categories, c] });
  };
  const dirty = JSON.stringify(draft) !== JSON.stringify(settings);
  return (
    <div className="panel">
      <div className="panel__head">
        <h2>Examination scope</h2>
        <span className="spacer" />
        <Segmented
          label="Report type"
          value={draft.reportType}
          onChange={(v) => setDraft({ ...draft, reportType: v as Soc2Settings["reportType"] })}
          options={[
            { id: "type1", label: "Type 1" },
            { id: "type2", label: "Type 2" },
          ]}
        />
      </div>
      <div className="stack" style={{ gap: 8 }}>
        {CATEGORIES.map((c) => {
          const on = c.id === "security" || draft.categories.includes(c.id);
          return (
            <label key={c.id} className="row" style={{ gap: 10, alignItems: "flex-start", cursor: c.id === "security" ? "default" : "pointer" }}>
              <input type="checkbox" checked={on} disabled={c.id === "security"} onChange={() => toggle(c.id)} style={{ marginTop: 3 }} />
              <span style={{ flex: 1 }}>
                <span style={{ fontWeight: 500 }}>{c.label}</span> <span className="mono muted" style={{ fontSize: 11 }}>{c.group}</span>
                <div className="muted" style={{ fontSize: 12 }}>
                  {c.note}
                </div>
              </span>
            </label>
          );
        })}
      </div>
      <div className="grid grid--3" style={{ gap: 10, marginTop: 14 }}>
        {draft.reportType === "type2" && (
          <>
            <div className="field">
              <label>Observation start</label>
              <input className="input" type="date" value={draft.observationStart ?? ""} onChange={(e) => setDraft({ ...draft, observationStart: e.target.value })} />
            </div>
            <div className="field">
              <label>Observation end</label>
              <input className="input" type="date" value={draft.observationEnd ?? ""} onChange={(e) => setDraft({ ...draft, observationEnd: e.target.value })} />
            </div>
          </>
        )}
        <div className="field">
          <label>Service auditor (CPA firm)</label>
          <input className="input" value={draft.auditFirm ?? ""} placeholder="Independent CPA firm" onChange={(e) => setDraft({ ...draft, auditFirm: e.target.value })} />
        </div>
      </div>
      {draft.reportType === "type2" && <ObservationWindow start={settings.observationStart} end={settings.observationEnd} />}
      <div className="row" style={{ justifyContent: "flex-end", marginTop: 12 }}>
        <button className="btn btn--primary" disabled={!dirty} onClick={() => save.mutate({ ...draft, categories: Array.from(new Set<Category>(["security", ...draft.categories])) }, { onSuccess: () => toast("SOC 2 scope saved — criteria re-scoped") })}>
          Save scope
        </button>
      </div>
    </div>
  );
}

function SystemDescription({ ws }: { ws: string }) {
  const { data } = useQuery({ queryKey: ["ws", ws, "soc2-description"], queryFn: () => api.get<{ source: { title: string; path?: string }; items: DescriptionItem[] }>(`/workspaces/${encodeURIComponent(ws)}/soc2/description`), retry: false });
  const licensed = data?.items.some((d) => d.licensed);
  if (!data) return null;
  const tone = { drafted: "var(--color-status-implemented)", "needs-input": "var(--color-status-in-progress)", "not-applicable": "var(--color-on-surface-muted)" } as const;
  const label = { drafted: "Drafted from workspace", "needs-input": "Needs your input", "not-applicable": "Not applicable" } as const;
  return (
    <div className="panel">
      <div className="panel__head">
        <FileText size={16} />
        <h2>System description · DC 200</h2>
        <span className="spacer" />
        <span className="muted" style={{ fontSize: 12 }}>
          Management's description must address each description criterion
        </span>
      </div>
      <div className="stack" style={{ gap: 12 }}>
        {data.items.map((d) => (
          <div key={d.id} className="row" style={{ alignItems: "flex-start", gap: 10 }}>
            <span className="code" style={{ flexShrink: 0, cursor: "default" }}>
              {d.id}
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13.5, fontWeight: 500 }}>{d.title}</div>
              {d.text && (
                <div className="muted" style={{ fontSize: 12 }} title={d.page ? `DC 200, p. ${d.page}` : undefined}>
                  {d.text}
                  {d.items && d.items.length > 0 ? ` ${d.items.map((i) => `${i.marker} ${i.text}`).join(" · ")}` : ""}
                </div>
              )}
              {d.derived.facts.length > 0 && (
                <ul style={{ margin: "6px 0 0", paddingLeft: 18, fontSize: 12.5 }}>
                  {d.derived.facts.slice(0, 5).map((f, i) => (
                    <li key={i}>{f}</li>
                  ))}
                  {d.derived.facts.length > 5 && <li className="muted">+{d.derived.facts.length - 5} more</li>}
                </ul>
              )}
            </div>
            <span className="mono" style={{ fontSize: 11, whiteSpace: "nowrap", color: tone[d.derived.status] }}>
              {label[d.derived.status]}
            </span>
          </div>
        ))}
      </div>
      <p className="muted" style={{ fontSize: 12, marginTop: 12 }}>
        Source: {data.source.title}
        {licensed ? " (© AICPA, local copy)" : " — titles are Visua's summaries; the official text is not bundled"}. Visua drafts only what it can derive from recorded facts; everything else is left for management to write.
      </p>
    </div>
  );
}

export function Soc2Page() {
  const { ws = "" } = useParams();
  const meta = useMeta();
  const { data } = useWorkspace(ws);
  const graph = useGraph(TSC);
  const state = useFrameworkState(data?.workspace.id, TSC);
  const enable = useWsMutation(ws, () => api.put(`/workspaces/${encodeURIComponent(ws)}/frameworks/${TSC}`, { enabled: true }));
  const loaded = meta.data?.frameworks.some((f) => f.id === TSC);
  const fw = data?.frameworks.find((f) => f.id === TSC);
  const nodes = graph.data?.nodes ?? [];
  const groups = useMemo(() => nodes.filter((n) => n.depth === 0).map((g) => ({ group: g, series: nodes.filter((n) => n.parentId === g.id) })), [nodes]);

  if (!data || !meta.data) return <div className="page muted">Loading…</div>;
  if (!loaded) {
    return (
      <div className="page">
        <Empty title="The AICPA Trust Services Criteria are not ingested">
          <p style={{ margin: "8px 0 0" }}>
            Place the official criteria in <code className="mono">corpus/aicpa-soc2/</code> and run <code className="mono">pnpm ingest</code>.
          </p>
        </Empty>
      </div>
    );
  }
  if (!fw?.settings.soc2) {
    return (
      <div className="page">
        <Empty title="SOC 2 is not enabled for this workspace">
          <p style={{ margin: "8px 0 12px" }}>Prepare for a SOC 2 examination against the 2017 Trust Services Criteria (revised points of focus, 2022). Visua tracks readiness, evidence over the observation window and the auditor's request list.</p>
          <button className="btn btn--primary" onClick={() => enable.mutate(undefined)}>
            Enable SOC 2
          </button>
        </Empty>
      </div>
    );
  }
  const s = fw.settings.soc2;
  return (
    <div className="page">
      <header className="page__header">
        <div>
          <div className="eyebrow">SOC 2 · AICPA Trust Services Criteria (2017, points of focus rev. 2022)</div>
          <h1>
            {s.reportType === "type2" ? "Type 2" : "Type 1"} readiness · {Math.round(fw.readiness * 100)}%
          </h1>
          <p>
            {fw.total} in-scope criteria across {s.categories.length} categor{s.categories.length === 1 ? "y" : "ies"} · {fw.gaps} gaps · evidence coverage {Math.round(fw.evidenceCoverage * 100)}%{s.auditFirm ? ` · auditor ${s.auditFirm}` : ""}. Readiness is not an audit opinion — only an independent CPA firm issues a SOC 2 report.
          </p>
        </div>
        <div className="page__actions">
          <a className="btn" href={exportUrl(ws, "soc2-pbc.csv")}>
            <Download size={14} /> PBC request list
          </a>
          <Link className="btn btn--primary" to={`/w/${ws}/observatory/${TSC}`}>
            <Telescope size={14} /> Criteria in 3D
          </Link>
        </div>
      </header>
      <div className="grid" style={{ gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1.25fr)", alignItems: "start" }}>
        <div className="stack" style={{ gap: 16 }}>
          <Scope ws={ws} settings={s} />
          <SystemDescription ws={ws} />
        </div>
        <div className="stack" style={{ gap: 16 }}>
          {groups.map(({ group, series }) => {
            const g = state.data?.groups[group.id];
            const inScope = !!g?.total;
            return (
              <div key={group.id} className="panel" style={{ opacity: inScope ? 1 : 0.55 }}>
                <div className="panel__head">
                  <h2>{group.title}</h2>
                  <span className="spacer" />
                  {inScope ? (
                    <span className="mono" style={{ fontSize: 12 }}>
                      {Math.round((g?.readiness ?? 0) * 100)}% · {g?.gaps ?? 0} gaps
                    </span>
                  ) : (
                    <span className="muted" style={{ fontSize: 12 }}>
                      Not in scope
                    </span>
                  )}
                </div>
                {inScope && (
                  <div className="stack" style={{ gap: 8 }}>
                    {series.map((se) => {
                      const sg = state.data?.groups[se.id];
                      const criteria = nodes.filter((n) => n.parentId === se.id);
                      return (
                        <div key={se.id} className="row" style={{ gap: 10 }}>
                          <Link to={`/w/${ws}/observatory/${TSC}?select=${encodeURIComponent(se.id)}`} style={{ width: 210, flexShrink: 0, color: "inherit" }}>
                            <span className="mono" style={{ color: "var(--color-primary)", fontSize: 12.5 }}>{se.code}</span> <span style={{ fontSize: 12.5 }}>{se.title}</span>
                          </Link>
                          <div style={{ flex: 1 }}>{sg && <StatusBar counts={sg.counts} height={8} />}</div>
                          <span className="mono muted" style={{ fontSize: 11.5, width: 70, textAlign: "right" }}>
                            {criteria.length} criteria
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
