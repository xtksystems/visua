/**
 * CSF 2.0 Organizational Profile & Tiers.
 * - Tier assessment with NIST's own statements (CSWP 29, Appendix B, Table 2).
 * - Current vs Target Profile per Category as a bullet chart (bar = current,
 *   tick = target, faint band = gap) with a numeric table twin.
 */
import { Download, ExternalLink } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { StatusBar, StatusLegend, toast } from "../components/ui/index.tsx";
import { api, corpusFileUrl, exportUrl } from "../lib/api.ts";
import { useFrameworkState, useGraph, useMeta, useWorkspace, useWsMutation } from "../lib/queries.ts";
import type { LeanNode } from "../lib/types.ts";
import { split } from "../lib/media.ts";

const FW = "nist-csf-2.0";

interface Row {
  node: LeanNode;
  current: number;
  target: number;
  units: number;
  gaps: number;
}

function BulletChart({ rows, functions }: { rows: Row[]; functions: LeanNode[] }) {
  const [hover, setHover] = useState<string | null>(null);
  const x = (v: number) => `${(v / 4) * 100}%`;
  return (
    <div className="panel" style={{ padding: 0 }}>
      <div className="row row--wrap" style={{ padding: "12px 16px", gap: "8px 16px", borderBottom: "1px solid var(--color-outline)" }}>
        <span className="eyebrow">Current vs target profile · mean implementation level by category (0–4)</span>
        <span style={{ flex: 1 }} />
        <span className="row" style={{ gap: 6, fontSize: 12 }}>
          <span style={{ width: 14, height: 8, borderRadius: "0 4px 4px 0", background: "var(--color-framework-csf)" }} /> Current
        </span>
        <span className="row" style={{ gap: 6, fontSize: 12 }}>
          <span style={{ width: 2, height: 14, background: "var(--color-on-surface)" }} /> Target
        </span>
        <span className="row" style={{ gap: 6, fontSize: 12 }}>
          <span style={{ width: 14, height: 8, background: "var(--color-primary-container)" }} /> Gap
        </span>
      </div>
      <div role="table" aria-label="Current and target profile by category" style={{ padding: "8px 0 12px" }}>
        <div role="row" className="bullet__row bullet__row--head">
          <span role="columnheader" className="eyebrow">
            Category
          </span>
          <span role="columnheader" className="bullet__axis">
            {[0, 1, 2, 3, 4].map((t) => (
              <span key={t} className="mono" style={{ left: x(t) }}>
                {t}
              </span>
            ))}
          </span>
          <span role="columnheader" className="eyebrow" style={{ textAlign: "right" }}>
            Cur · Tgt · Gaps
          </span>
        </div>
        {functions.map((fn) => (
          <div key={fn.id}>
            <div className="bullet__group eyebrow">
              {fn.code} · {fn.title}
            </div>
            {rows
              .filter((r) => r.node.parentId === fn.id)
              .map((r) => (
                <div
                  key={r.node.id}
                  role="row"
                  className={`bullet__row ${hover === r.node.id ? "is-hover" : ""}`}
                  tabIndex={0}
                  onMouseEnter={() => setHover(r.node.id)}
                  onMouseLeave={() => setHover(null)}
                  onFocus={() => setHover(r.node.id)}
                  onBlur={() => setHover(null)}
                  aria-label={`${r.node.code} ${r.node.title}: current ${r.current.toFixed(1)}, target ${r.target.toFixed(1)}, ${r.gaps} of ${r.units} outcomes below target`}
                >
                  <span role="cell" style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    <span className="mono" style={{ color: "var(--color-primary)", marginRight: 8 }}>
                      {r.node.code}
                    </span>
                    <span className="muted">{r.node.title}</span>
                  </span>
                  <span role="cell" className="bullet__track">
                    {[1, 2, 3].map((t) => (
                      <span key={t} className="bullet__grid" style={{ left: x(t) }} />
                    ))}
                    {r.target > r.current && <span className="bullet__gap" style={{ left: x(r.current), width: `calc(${x(r.target)} - ${x(r.current)})` }} />}
                    <span className="bullet__bar" style={{ width: x(r.current) }} />
                    <span className="bullet__target" style={{ left: x(r.target) }} />
                    {hover === r.node.id && (
                      <span className="tooltip" style={{ position: "absolute", left: x(Math.max(r.current, r.target)), top: -46, marginLeft: 10, whiteSpace: "nowrap" }}>
                        <strong className="mono">{r.current.toFixed(1)}</strong> current · <strong className="mono">{r.target.toFixed(1)}</strong> target · {r.gaps}/{r.units} below target
                      </span>
                    )}
                  </span>
                  <span role="cell" className="mono" style={{ textAlign: "right", fontSize: 12, fontVariantNumeric: "tabular-nums" }}>
                    {r.current.toFixed(1)} · {r.target.toFixed(1)} · <span style={{ color: r.gaps ? "var(--color-on-surface)" : "var(--color-on-surface-muted)" }}>{r.gaps}</span>
                  </span>
                </div>
              ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function TierAssessment() {
  const { ws = "" } = useParams();
  const meta = useMeta();
  const workspace = useWorkspace(ws);
  const existing = workspace.data?.workspace.tierAssessment;
  const [answers, setAnswers] = useState<Record<string, number>>(() => ({ ...(existing?.answers ?? {}) }));
  const [touched, setTouched] = useState(false);
  useEffect(() => {
    if (!touched && existing) setAnswers({ ...existing.answers });
  }, [existing, touched]);
  const save = useWsMutation(ws, () => api.post(`/workspaces/${encodeURIComponent(ws)}/tiers`, { answers }));
  const dims = meta.data?.tiers.dimensions ?? [];
  const names = meta.data?.tiers.names ?? [];
  const complete = dims.every((d) => answers[d.id]);
  return (
    <div className="panel">
      <div className="panel__head">
        <h2>CSF Tiers self-assessment</h2>
        <span className="spacer" />
        <a className="muted" style={{ fontSize: 12 }} href={corpusFileUrl("nist-csf-2.0/core/NIST.CSWP.29.pdf", 29)} target="_blank" rel="noreferrer">
          NIST CSWP 29, Appendix B, Table 2 <ExternalLink size={11} />
        </a>
      </div>
      {existing && (
        <div className="grid grid--3" style={{ marginBottom: 16 }}>
          {[
            ["Governance", existing.governanceTier],
            ["Management", existing.managementTier],
            ["Overall", existing.overallTier],
          ].map(([label, tier]) => (
            <div key={label as string} className="metric">
              <span className="eyebrow">{label as string}</span>
              <span className="metric__value" style={{ fontSize: 32 }}>
                Tier {tier as number}
              </span>
              <span className="metric__sub">{names[(tier as number) - 1]}</span>
            </div>
          ))}
        </div>
      )}
      <p className="muted" style={{ fontSize: 13, marginBottom: 12 }}>
        Choose the statement that best describes your organization today. The statements are NIST's notional illustration of the Tiers, quoted verbatim. A Tier is credited only when practices consistently meet it (floor of the mean), and the overall Tier is the lower of governance and management.
      </p>
      <div className="stack" style={{ gap: 14 }}>
        {dims.map((d) => (
          <fieldset key={d.id} style={{ border: 0, padding: 0, margin: 0 }}>
            <legend style={{ fontWeight: 600, marginBottom: 8 }}>
              {d.question} <span className="eyebrow" style={{ marginLeft: 6 }}>{d.area}</span>
            </legend>
            <div className="grid grid--4" style={{ gap: 8 }}>
              {d.statements.map((s, i) => {
                const checked = answers[d.id] === i + 1;
                return (
                  <label key={i} className="panel panel--raised" style={{ padding: 10, cursor: "pointer", borderColor: checked ? "var(--color-primary)" : undefined, background: checked ? "var(--color-primary-container)" : undefined, fontSize: 12.5, lineHeight: 1.45 }}>
                    <input type="radio" name={d.id} className="sr-only" checked={checked} onChange={() => {
                        setTouched(true);
                        setAnswers({ ...answers, [d.id]: i + 1 });
                      }} />
                    <div className="eyebrow" style={{ marginBottom: 4, color: checked ? "var(--color-on-primary-container)" : undefined }}>
                      Tier {i + 1} · {names[i]}
                    </div>
                    {s}
                  </label>
                );
              })}
            </div>
          </fieldset>
        ))}
      </div>
      <div className="row" style={{ justifyContent: "flex-end", marginTop: 16 }}>
        <span className="muted" style={{ fontSize: 12 }}>
          {Object.keys(answers).length}/{dims.length} answered
        </span>
        <button className="btn btn--primary" disabled={!complete || save.isPending} onClick={() => save.mutate(undefined, { onSuccess: () => toast("Tier assessment recorded in the audit trail") })}>
          Save assessment
        </button>
      </div>
    </div>
  );
}

export function ProfilePage() {
  const { ws = "" } = useParams();
  const workspace = useWorkspace(ws);
  const graph = useGraph(FW);
  const state = useFrameworkState(workspace.data?.workspace.id, FW);
  const { rows, functions } = useMemo(() => {
    const nodes = graph.data?.nodes ?? [];
    const functions = nodes.filter((n) => n.kind === "function");
    const rows: Row[] = nodes
      .filter((n) => n.kind === "category")
      .map((cat) => {
        const units = nodes.filter((n) => n.parentId === cat.id).map((n) => state.data?.units[n.id]).filter((u) => u && u.applicable);
        const current = units.length ? units.reduce((s, u) => s + u!.current, 0) / units.length : 0;
        const target = units.length ? units.reduce((s, u) => s + u!.target, 0) / units.length : 0;
        return { node: cat, current, target, units: units.length, gaps: units.filter((u) => u!.target > u!.current).length };
      });
    return { rows, functions };
  }, [graph.data, state.data]);
  const overall = state.data?.overall;
  return (
    <div className="page">
      <header className="page__header">
        <div>
          <div className="eyebrow">NIST CSF 2.0</div>
          <h1>Organizational Profile & Tiers</h1>
          <p>Your Current Profile, Target Profile and the gap between them — the core CSF 2.0 workflow. Export uses NIST's official Organizational Profile template columns.</p>
        </div>
        <div className="page__actions">
          <a className="btn" href={exportUrl(ws, "csf-profile.csv")}>
            <Download size={14} /> Organizational Profile (CSV)
          </a>
          <a className="btn" href={exportUrl(ws, "readiness.md")}>
            <Download size={14} /> Readiness report
          </a>
          <Link className="btn btn--primary" to={`/w/${ws}/observatory/${FW}`}>
            Open in 3D
          </Link>
        </div>
      </header>
      {overall && (
        <div className="panel" style={{ marginBottom: 16 }}>
          <div className="row" style={{ gap: 24, flexWrap: "wrap" }}>
            <div>
              <div className="eyebrow">Readiness</div>
              <div className="metric__value">{Math.round(overall.readiness * 100)}%</div>
            </div>
            <div>
              <div className="eyebrow">Mean level</div>
              <div className="metric__value" style={{ fontSize: 32 }}>
                {overall.current.toFixed(1)} <small>→ {overall.target.toFixed(1)}</small>
              </div>
            </div>
            <div style={{ flex: 1, minWidth: 280 }}>
              <StatusBar counts={overall.counts} height={10} />
              <div style={{ marginTop: 8 }}>
                <StatusLegend counts={overall.counts} />
              </div>
            </div>
          </div>
        </div>
      )}
      <div className="grid split" style={split(1.25, 1)}>
        <BulletChart rows={rows} functions={functions} />
        <TierAssessment />
      </div>
    </div>
  );
}
