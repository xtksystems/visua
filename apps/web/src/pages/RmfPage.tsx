/**
 * NIST RMF program: the seven-step lifecycle (SP 800-37r2), FIPS 199
 * categorization → SP 800-53B baseline, tailoring, authorization decision
 * and OSCAL exports.
 */
import { Download, Plus, Telescope, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { categorize, type ImpactLevel, type RmfSettings } from "@visua/core";
import { CodeTag, Empty, StatusBar, StatusChip, toast } from "../components/ui/index.tsx";
import { api, exportUrl } from "../lib/api.ts";
import { shortDate } from "../lib/format.ts";
import { useFrameworkState, useGraph, useMeta, useWorkspace, useWsMutation } from "../lib/queries.ts";

const LEVELS: ImpactLevel[] = ["low", "moderate", "high"];
const IMPACT_COLOR: Record<ImpactLevel, string> = { low: "var(--color-status-implemented)", moderate: "var(--color-status-in-progress)", high: "var(--color-status-at-risk)" };

function Lifecycle({ wsId }: { wsId: string }) {
  const graph = useGraph("nist-rmf");
  const state = useFrameworkState(wsId, "nist-rmf");
  const [open, setOpen] = useState<string | null>(null);
  const steps = (graph.data?.nodes ?? []).filter((n) => n.kind === "step");
  const firstIncomplete = steps.find((s) => (state.data?.groups[s.id]?.readiness ?? 0) < 1)?.id;
  const active = open ?? firstIncomplete ?? steps[0]?.id;
  const tasks = (graph.data?.nodes ?? []).filter((n) => n.parentId === active);
  return (
    <div className="panel">
      <div className="panel__head">
        <h2>RMF lifecycle · SP 800-37 Rev. 2</h2>
        <span className="spacer" />
        <Link to={`/w/${wsId}/observatory/nist-rmf`} className="btn btn--sm">
          <Telescope size={13} /> 3D
        </Link>
      </div>
      <div className="rmf-steps" role="tablist" aria-label="RMF steps">
        {steps.map((s, i) => {
          const g = state.data?.groups[s.id];
          const pct = Math.round((g?.readiness ?? 0) * 100);
          return (
            <button key={s.id} role="tab" aria-selected={active === s.id} className={`rmf-step ${active === s.id ? "is-active" : ""}`} onClick={() => setOpen(s.id)}>
              <span className="mono muted" style={{ fontSize: 11 }}>
                {i + 1}
              </span>
              <strong>{s.title}</strong>
              <span className="mono" style={{ fontSize: 12 }}>
                {pct}%
              </span>
              {g && <StatusBar counts={g.counts} height={4} />}
            </button>
          );
        })}
      </div>
      <div className="rmf-tasks">
        {tasks.map((t) => {
          const u = state.data?.units[t.id];
          return (
            <Link key={t.id} className="rmf-task" to={`/w/${wsId}/observatory/nist-rmf?select=${encodeURIComponent(t.id)}`} title={t.text}>
              <span className="mono" style={{ color: "var(--color-primary)", fontSize: 12 }}>
                {t.code}
              </span>
              <span className="rmf-task__title">{t.title}</span>
              {u && <StatusChip status={u.status} />}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function Categorize({ ws, rmf }: { ws: string; rmf: RmfSettings }) {
  const meta = useMeta();
  const [systemName, setSystemName] = useState(rmf.systemName);
  const [types, setTypes] = useState<RmfSettings["informationTypes"]>(rmf.informationTypes);
  const [privacy, setPrivacy] = useState(!!rmf.privacyBaseline);
  useEffect(() => {
    setTypes(rmf.informationTypes);
    setSystemName(rmf.systemName);
    setPrivacy(!!rmf.privacyBaseline);
  }, [rmf]);
  const result = categorize(types);
  const apply = useWsMutation(ws, () => api.post(`/workspaces/${encodeURIComponent(ws)}/rmf/categorize`, { systemName, informationTypes: types, privacyBaseline: privacy }));
  const set = (i: number, patch: Partial<RmfSettings["informationTypes"][number]>) => setTypes(types.map((t, ti) => (ti === i ? { ...t, ...patch } : t)));
  return (
    <div className="panel">
      <div className="panel__head">
        <h2>Categorize · FIPS 199</h2>
        <span className="spacer" />
        <span className="muted" style={{ fontSize: 12 }}>
          High-water mark per FIPS 200 selects the SP 800-53B baseline
        </span>
      </div>
      <div className="field" style={{ marginBottom: 12 }}>
        <label>System name</label>
        <input className="input" value={systemName} onChange={(e) => setSystemName(e.target.value)} />
      </div>
      <table className="table">
        <thead>
          <tr>
            <th>Information type</th>
            <th>Confidentiality</th>
            <th>Integrity</th>
            <th>Availability</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {types.map((t, i) => (
            <tr key={`${t.id}-${i}`}>
              <td>
                <input className="input" value={t.name} onChange={(e) => set(i, { name: e.target.value, id: t.id || e.target.value.toLowerCase().replace(/\W+/g, "-") })} />
              </td>
              {(["confidentiality", "integrity", "availability"] as const).map((obj) => (
                <td key={obj}>
                  <select className="select" value={t[obj]} onChange={(e) => set(i, { [obj]: e.target.value as ImpactLevel })} style={{ color: IMPACT_COLOR[t[obj]] }}>
                    {LEVELS.map((l) => (
                      <option key={l} value={l}>
                        {l}
                      </option>
                    ))}
                  </select>
                </td>
              ))}
              <td>
                <button className="btn btn--quiet btn--sm btn--icon" aria-label="Remove" onClick={() => setTypes(types.filter((_, ti) => ti !== i))}>
                  <Trash2 size={13} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="row row--wrap" style={{ gap: 6, marginTop: 10 }}>
        <button className="btn btn--sm" onClick={() => setTypes([...types, { id: `type-${types.length + 1}`, name: "New information type", confidentiality: "low", integrity: "low", availability: "low" }])}>
          <Plus size={13} /> Add type
        </button>
        {(meta.data?.exampleInformationTypes ?? [])
          .filter((e) => !types.some((t) => t.id === e.id))
          .slice(0, 4)
          .map((e) => (
            <button key={e.id} className="chip" onClick={() => setTypes([...types, e])} title="Provisional impact levels — review for your context">
              + {e.name}
            </button>
          ))}
      </div>
      <div className="row" style={{ marginTop: 16, gap: 16, flexWrap: "wrap" }}>
        <div className="mono" style={{ fontSize: 13 }}>
          SC = {"{"}(confidentiality, <span style={{ color: IMPACT_COLOR[result.confidentiality] }}>{result.confidentiality}</span>), (integrity, <span style={{ color: IMPACT_COLOR[result.integrity] }}>{result.integrity}</span>), (availability,{" "}
          <span style={{ color: IMPACT_COLOR[result.availability] }}>{result.availability}</span>){"}"}
        </div>
        <span style={{ flex: 1 }} />
        <label className="row" style={{ gap: 6, fontSize: 13 }}>
          <input type="checkbox" checked={privacy} onChange={(e) => setPrivacy(e.target.checked)} /> Include the PRIVACY baseline (PII processed)
        </label>
        <button className="btn btn--primary" disabled={!types.length} onClick={() => apply.mutate(undefined, { onSuccess: () => toast(`Categorized ${result.overall.toUpperCase()} — baseline applied`) })}>
          Apply {result.overall.toUpperCase()} baseline
        </button>
      </div>
    </div>
  );
}

function Tailoring({ ws, rmf }: { ws: string; rmf: RmfSettings }) {
  const [code, setCode] = useState("");
  const [action, setAction] = useState<"add" | "remove">("remove");
  const [rationale, setRationale] = useState("");
  const tailor = useWsMutation(ws, (v: { nodeId: string; action: "add" | "remove" | "reset"; rationale: string }) => api.post(`/workspaces/${encodeURIComponent(ws)}/rmf/tailor`, v));
  return (
    <div className="panel">
      <div className="panel__head">
        <h2>Select & tailor · SP 800-53B</h2>
      </div>
      <div className="stack" style={{ gap: 8 }}>
        {rmf.tailoring.map((t) => (
          <div key={t.nodeId} className="row" style={{ gap: 8, fontSize: 13 }}>
            <CodeTag id={t.nodeId} />
            <span className="mono" style={{ fontSize: 11, color: t.action === "add" ? "var(--color-status-implemented)" : "var(--color-status-in-progress)" }}>
              {t.action === "add" ? "+ added" : "− removed"}
            </span>
            <span className="muted" style={{ flex: 1 }}>
              {t.rationale}
            </span>
            <button className="btn btn--quiet btn--sm" onClick={() => tailor.mutate({ nodeId: t.nodeId, action: "reset", rationale: "" })}>
              Reset
            </button>
          </div>
        ))}
        {!rmf.tailoring.length && <div className="muted" style={{ fontSize: 13 }}>No tailoring decisions yet — the {rmf.baseline?.toUpperCase()} baseline applies as published.</div>}
      </div>
      <form
        className="row row--wrap"
        style={{ gap: 8, marginTop: 12 }}
        onSubmit={(e) => {
          e.preventDefault();
          tailor.mutate(
            { nodeId: `nist-sp-800-53-r5:${code.trim().toUpperCase()}`, action, rationale },
            { onSuccess: () => (setCode(""), setRationale(""), toast("Tailoring recorded")), onError: (err) => toast((err as Error).message, "error") },
          );
        }}
      >
        <input className="input mono" style={{ width: 120 }} placeholder="AC-2(4)" value={code} onChange={(e) => setCode(e.target.value)} aria-label="Control" />
        <select className="select" style={{ width: 120 }} value={action} onChange={(e) => setAction(e.target.value as "add" | "remove")} aria-label="Action">
          <option value="remove">Remove</option>
          <option value="add">Add</option>
        </select>
        <input className="input" style={{ flex: 1, minWidth: 200 }} placeholder="Rationale (required, visible to assessors)" value={rationale} onChange={(e) => setRationale(e.target.value)} />
        <button className="btn" disabled={!code.trim() || rationale.trim().length < 8}>
          Record
        </button>
      </form>
    </div>
  );
}

function Authorize({ ws, rmf }: { ws: string; rmf: RmfSettings }) {
  const auth = rmf.authorization ?? { decision: "pending" as const };
  const [decision, setDecision] = useState(auth.decision);
  const [ao, setAo] = useState(auth.authorizingOfficial ?? "");
  const [expires, setExpires] = useState(auth.expiresAt?.slice(0, 10) ?? "");
  const [rationale, setRationale] = useState(auth.rationale ?? "");
  const save = useWsMutation(ws, () => api.post(`/workspaces/${encodeURIComponent(ws)}/rmf/authorize`, { decision, authorizingOfficial: ao || undefined, expiresAt: expires || undefined, rationale: rationale || undefined }));
  const labels: Record<string, string> = { pending: "Pending", ato: "Authorization to Operate (ATO)", iatt: "Interim Authorization to Test (IATT)", dato: "Denial of Authorization (DATO)" };
  return (
    <div className="panel">
      <div className="panel__head">
        <h2>Authorize · Task R-4</h2>
        <span className="spacer" />
        <span className="mono" style={{ fontSize: 12, color: auth.decision === "ato" ? "var(--color-status-implemented)" : auth.decision === "dato" ? "var(--color-status-at-risk)" : "var(--color-on-surface-muted)" }}>
          {labels[auth.decision]}
          {auth.decidedAt && auth.decision !== "pending" ? ` · ${shortDate(auth.decidedAt)}` : ""}
        </span>
      </div>
      <p className="muted" style={{ fontSize: 13, marginBottom: 12 }}>
        Visua records the authorizing official's decision; it never makes it. Review the SSP, assessment results and POA&M before deciding.
      </p>
      <div className="grid grid--2" style={{ gap: 10 }}>
        <div className="field">
          <label>Decision</label>
          <select className="select" value={decision} onChange={(e) => setDecision(e.target.value as typeof decision)}>
            {Object.entries(labels).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>Authorizing official</label>
          <input className="input" value={ao} onChange={(e) => setAo(e.target.value)} />
        </div>
        <div className="field">
          <label>Authorization termination date</label>
          <input className="input" type="date" value={expires} onChange={(e) => setExpires(e.target.value)} />
        </div>
        <div className="field">
          <label>Rationale / terms and conditions</label>
          <input className="input" value={rationale} onChange={(e) => setRationale(e.target.value)} />
        </div>
      </div>
      <div className="row" style={{ justifyContent: "flex-end", marginTop: 12 }}>
        <button className="btn btn--primary" onClick={() => save.mutate(undefined, { onSuccess: () => toast("Authorization decision recorded in the audit trail") })}>
          Record decision
        </button>
      </div>
    </div>
  );
}

export function RmfPage() {
  const { ws = "" } = useParams();
  const { data } = useWorkspace(ws);
  const controls = useFrameworkState(data?.workspace.id, "nist-sp-800-53-r5");
  const graph = useGraph("nist-sp-800-53-r5");
  const enable = useWsMutation(ws, () => api.put(`/workspaces/${encodeURIComponent(ws)}/frameworks/nist-sp-800-53-r5`, { enabled: true }));
  const settings = data?.frameworks.find((f) => f.id === "nist-sp-800-53-r5")?.settings.rmf;
  const families = useMemo(() => (graph.data?.nodes ?? []).filter((n) => n.kind === "family"), [graph.data]);
  if (!data) return <div className="page muted">Loading…</div>;
  if (!settings) {
    return (
      <div className="page">
        <Empty title="NIST RMF is not enabled for this workspace">
          <p style={{ margin: "8px 0 12px" }}>Enable SP 800-53 Rev. 5 to run the Risk Management Framework: categorize your system, select and tailor a baseline, implement and assess controls, and record the authorization decision.</p>
          <button className="btn btn--primary" onClick={() => enable.mutate(undefined)}>
            Enable NIST RMF / SP 800-53
          </button>
        </Empty>
      </div>
    );
  }
  return (
    <div className="page">
      <header className="page__header">
        <div>
          <div className="eyebrow">NIST Risk Management Framework</div>
          <h1>{settings.systemName}</h1>
          <p>
            {settings.categorization ? `Categorized ${settings.categorization.overall.toUpperCase()} (C ${settings.categorization.confidentiality}, I ${settings.categorization.integrity}, A ${settings.categorization.availability})` : "Not yet categorized"} · {settings.baseline?.toUpperCase()} baseline
            {settings.privacyBaseline ? " + PRIVACY" : ""} · {controls.data?.overall.total ?? 0} controls in scope · {settings.tailoring.length} tailoring decision(s)
          </p>
        </div>
        <div className="page__actions">
          <a className="btn" href={exportUrl(ws, "oscal-ssp.json")}>
            <Download size={14} /> OSCAL SSP
          </a>
          <a className="btn" href={exportUrl(ws, "oscal-poam.json")}>
            <Download size={14} /> OSCAL POA&M
          </a>
          <Link className="btn btn--primary" to={`/w/${ws}/observatory/nist-sp-800-53-r5`}>
            <Telescope size={14} /> Controls in 3D
          </Link>
        </div>
      </header>
      <div className="stack" style={{ gap: 16 }}>
        <Lifecycle wsId={data.workspace.id} />
        <div className="grid grid--2" style={{ alignItems: "start" }}>
          <Categorize ws={ws} rmf={settings} />
          <div className="stack" style={{ gap: 16 }}>
            <Tailoring ws={ws} rmf={settings} />
            <Authorize ws={ws} rmf={settings} />
          </div>
        </div>
        <div className="panel">
          <div className="panel__head">
            <h2>Implement & assess · control families</h2>
            <span className="spacer" />
            <span className="muted" style={{ fontSize: 12 }}>
              SP 800-53A objectives are in each control's inspector
            </span>
          </div>
          <div className="grid grid--4" style={{ gap: 10 }}>
            {families.map((f) => {
              const g = controls.data?.groups[f.id];
              if (!g || !g.total) return null;
              return (
                <Link key={f.id} to={`/w/${ws}/observatory/nist-sp-800-53-r5?select=${encodeURIComponent(f.id)}`} className="panel panel--raised" style={{ color: "inherit", padding: 12 }}>
                  <div className="row" style={{ gap: 8 }}>
                    <span className="mono" style={{ color: "var(--color-primary)" }}>
                      {f.code}
                    </span>
                    <span style={{ flex: 1, fontSize: 12.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.title}</span>
                    <span className="mono" style={{ fontSize: 12 }}>
                      {Math.round(g.readiness * 100)}%
                    </span>
                  </div>
                  <div style={{ marginTop: 8 }}>
                    <StatusBar counts={g.counts} height={6} />
                  </div>
                  <div className="muted" style={{ fontSize: 11.5, marginTop: 6 }}>
                    {g.total} in scope · {g.gaps} gaps
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
