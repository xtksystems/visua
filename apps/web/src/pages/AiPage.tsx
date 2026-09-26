/**
 * AI governance program (NIST AI RMF 1.0 + the NIST AI 600-1 Generative AI Profile):
 * the AI system inventory, readiness per function (GOVERN, MAP, MEASURE, MANAGE) and
 * coverage of the Generative AI Profile risks when any system is generative.
 */
import { useQuery } from "@tanstack/react-query";
import { BrainCircuit, Pencil, Plus, Sparkles, Telescope, Trash2 } from "lucide-react";
import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import type { AiSystem, CorpusCitation, FrameworkDescriptor, Status } from "@visua/core";
import { useRunAgent } from "../components/inspector/Inspector.tsx";
import { Dialog, Empty, Progress, StatusBar, StatusChip, toast } from "../components/ui/index.tsx";
import { api, exportUrl } from "../lib/api.ts";
import { truncate } from "../lib/format.ts";
import { useMeta, useWorkspace, useWsMutation } from "../lib/queries.ts";
import { DATA_TYPES } from "./SettingsPage.tsx";

const AI_RMF = "nist-ai-rmf";

interface AiOverview {
  enabled: boolean;
  framework: FrameworkDescriptor;
  readiness: number;
  gaps: number;
  total: number;
  systems: AiSystem[];
  functions: { id: string; code: string; title: string; text: string; readiness: number; gaps: number; total: number; counts?: Record<Status, number>; status: Status }[];
  genAi: {
    profileId: string;
    title: string;
    documentId: string;
    active: boolean;
    generativeSystems: string[];
    risks: { id: string; title: string; description: string; citation: CorpusCitation; actions: number; outcomes: string[]; readiness: number; gaps: number }[];
  } | null;
}

const LIFECYCLE: [AiSystem["lifecycle"], string][] = [
  ["plan-design", "Plan and design"],
  ["collect-process-data", "Collect and process data"],
  ["build-use-model", "Build and use model"],
  ["verify-validate", "Verify and validate"],
  ["deploy-use", "Deploy and use"],
  ["operate-monitor", "Operate and monitor"],
  ["retired", "Retired"],
];
const ROLES: [AiSystem["role"], string][] = [
  ["deployer", "We deploy it (third-party or internal model)"],
  ["developer", "We develop it for others"],
  ["developer-deployer", "We develop and deploy it"],
];
const TIER_LABEL: Record<AiSystem["riskTier"], string> = { low: "Low risk", moderate: "Moderate risk", high: "High risk" };

type Draft = Omit<AiSystem, "id" | "createdAt" | "updatedAt"> & { id?: string };
const EMPTY: Draft = { name: "", purpose: "", role: "deployer", lifecycle: "plan-design", generative: false, provider: "", riskTier: "moderate", owner: "", dataTypes: [], humanOversight: "" };

function SystemDialog({ ws, initial, onClose }: { ws: string; initial: Draft; onClose: () => void }) {
  const [d, setD] = useState<Draft>(initial);
  const save = useWsMutation(ws, (v: Draft) => {
    const { id, ...body } = v;
    const clean = { ...body, provider: body.provider || undefined, owner: body.owner || undefined, humanOversight: body.humanOversight || undefined };
    return id ? api.patch(`/workspaces/${encodeURIComponent(ws)}/ai/systems/${id}`, clean) : api.post(`/workspaces/${encodeURIComponent(ws)}/ai/systems`, clean);
  });
  const valid = d.name.trim() && d.purpose.trim();
  return (
    <Dialog
      wide
      title={d.id ? `Edit ${initial.name}` : "Add an AI system to the inventory"}
      onClose={onClose}
      footer={
        <>
          <button className="btn" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn btn--primary"
            disabled={!valid}
            onClick={() => save.mutate(d, { onSuccess: () => (toast(d.id ? "AI system updated" : "AI system added to the inventory"), onClose()), onError: (e) => toast((e as Error).message, "error") })}
          >
            {d.id ? "Save" : "Add system"}
          </button>
        </>
      }
    >
      <div className="grid grid--2" style={{ gap: 12 }}>
        <div className="field">
          <label>Name</label>
          <input className="input" value={d.name} onChange={(e) => setD({ ...d, name: e.target.value })} placeholder="e.g. Clinical note summarizer" />
        </div>
        <div className="field">
          <label>Model, API or platform (value chain)</label>
          <input className="input" value={d.provider ?? ""} onChange={(e) => setD({ ...d, provider: e.target.value })} placeholder="e.g. third-party LLM API, in-house gradient boosting" />
        </div>
        <div className="field" style={{ gridColumn: "1 / -1" }}>
          <label>Intended purpose and context of use</label>
          <textarea className="input" rows={3} value={d.purpose} onChange={(e) => setD({ ...d, purpose: e.target.value })} placeholder="What it does, for whom, where its outputs are used, and what it must not be used for" />
        </div>
        <div className="field">
          <label>Our role</label>
          <select className="select" value={d.role} onChange={(e) => setD({ ...d, role: e.target.value as AiSystem["role"] })}>
            {ROLES.map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>Lifecycle stage</label>
          <select className="select" value={d.lifecycle} onChange={(e) => setD({ ...d, lifecycle: e.target.value as AiSystem["lifecycle"] })}>
            {LIFECYCLE.map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>Risk tier (your organization's own tiering)</label>
          <select className="select" value={d.riskTier} onChange={(e) => setD({ ...d, riskTier: e.target.value as AiSystem["riskTier"] })}>
            {(["low", "moderate", "high"] as const).map((t) => (
              <option key={t} value={t}>
                {TIER_LABEL[t]}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>Accountable owner</label>
          <input className="input" value={d.owner ?? ""} onChange={(e) => setD({ ...d, owner: e.target.value })} />
        </div>
        <label className="row" style={{ gap: 8, gridColumn: "1 / -1", fontSize: 13 }}>
          <input type="checkbox" checked={d.generative} onChange={(e) => setD({ ...d, generative: e.target.checked })} />
          Generative AI (produces text, images, audio, code or other content) — applies the NIST AI 600-1 Generative AI Profile
        </label>
        <div className="field" style={{ gridColumn: "1 / -1" }}>
          <span className="label">Data it processes</span>
          <div className="row row--wrap" style={{ gap: 6 }}>
            {DATA_TYPES.map(([v, l]) => (
              <button key={v} className="chip" aria-pressed={d.dataTypes.includes(v)} onClick={() => setD({ ...d, dataTypes: d.dataTypes.includes(v) ? d.dataTypes.filter((x) => x !== v) : [...d.dataTypes, v] })}>
                {l}
              </button>
            ))}
          </div>
        </div>
        <div className="field" style={{ gridColumn: "1 / -1" }}>
          <label>Human oversight</label>
          <input className="input" value={d.humanOversight ?? ""} onChange={(e) => setD({ ...d, humanOversight: e.target.value })} placeholder="Who reviews or can override outputs, and when" />
        </div>
      </div>
    </Dialog>
  );
}

function Inventory({ ws, systems }: { ws: string; systems: AiSystem[] }) {
  const [editing, setEditing] = useState<Draft | null>(null);
  const remove = useWsMutation(ws, (id: string) => api.del(`/workspaces/${encodeURIComponent(ws)}/ai/systems/${id}`));
  return (
    <div className="panel">
      <div className="panel__head">
        <BrainCircuit size={16} />
        <h2>AI system inventory</h2>
        <span className="spacer" />
        <button className="btn btn--sm" onClick={() => setEditing(EMPTY)}>
          <Plus size={13} /> Add system
        </button>
      </div>
      {systems.length ? (
        <table className="table">
          <thead>
            <tr>
              <th>System</th>
              <th>Role · stage</th>
              <th>Risk tier</th>
              <th>Owner</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {systems.map((s) => (
              <tr key={s.id}>
                <td>
                  <div style={{ fontWeight: 500 }}>
                    {s.name}
                    {s.generative && (
                      <span className="chip" style={{ cursor: "default", marginLeft: 8, fontSize: 11 }}>
                        <Sparkles size={11} /> Generative
                      </span>
                    )}
                  </div>
                  <div className="muted" style={{ fontSize: 12 }}>
                    {truncate(s.purpose, 120)}
                    {s.provider ? ` · ${s.provider}` : ""}
                  </div>
                </td>
                <td className="muted" style={{ fontSize: 12.5 }}>
                  {ROLES.find(([v]) => v === s.role)?.[1].split(" (")[0]} · {LIFECYCLE.find(([v]) => v === s.lifecycle)?.[1]}
                </td>
                <td style={{ fontSize: 12.5 }}>{TIER_LABEL[s.riskTier]}</td>
                <td className="muted" style={{ fontSize: 12.5 }}>
                  {s.owner ?? "—"}
                </td>
                <td style={{ whiteSpace: "nowrap" }}>
                  <button className="btn btn--quiet btn--sm btn--icon" aria-label={`Edit ${s.name}`} onClick={() => setEditing({ ...s })}>
                    <Pencil size={13} />
                  </button>
                  <button
                    className="btn btn--quiet btn--sm btn--icon"
                    aria-label={`Remove ${s.name}`}
                    onClick={() => window.confirm(`Remove ${s.name} from the inventory? The removal is recorded in the audit trail.`) && remove.mutate(s.id)}
                  >
                    <Trash2 size={13} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="muted" style={{ fontSize: 13 }}>
          No AI systems inventoried yet. Start here: AI risk management is scoped by the systems you develop or deploy, their purpose and their context of use.
        </p>
      )}
      {editing && <SystemDialog ws={ws} initial={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}

export function AiPage() {
  const { ws = "" } = useParams();
  const meta = useMeta();
  const workspace = useWorkspace(ws);
  const run = useRunAgent();
  const loaded = meta.data?.frameworks.some((f) => f.id === AI_RMF);
  const { data, error } = useQuery({ queryKey: ["ws", ws, "ai"], queryFn: () => api.get<AiOverview>(`/workspaces/${encodeURIComponent(ws)}/ai`), enabled: !!loaded });
  const enable = useWsMutation(ws, () => api.put(`/workspaces/${encodeURIComponent(ws)}/frameworks/${AI_RMF}`, { enabled: true }));

  if (!meta.data || !workspace.data) return <div className="page muted">Loading…</div>;
  if (!loaded) {
    return (
      <div className="page">
        <Empty title="The NIST AI RMF is not ingested">
          <p style={{ margin: "8px 0 0" }}>
            Add the official corpus to <code className="mono">corpus/nist-ai-rmf/</code> and run <code className="mono">pnpm ingest</code>.
          </p>
        </Empty>
      </div>
    );
  }
  if (error) return <div className="page muted">Could not load AI governance: {(error as Error).message}</div>;
  if (!data) return <div className="page muted">Loading…</div>;
  if (!data.enabled) {
    return (
      <div className="page">
        <Empty title="AI governance is not enabled for this workspace">
          <p style={{ margin: "8px 0 12px" }}>
            Enable the NIST AI Risk Management Framework to inventory your AI systems and work through its four functions — GOVERN, MAP, MEASURE and MANAGE — with the Generative AI Profile for generative systems.
          </p>
          <button className="btn btn--primary" onClick={() => enable.mutate(undefined)}>
            Enable NIST AI RMF
          </button>
        </Empty>
      </div>
    );
  }
  const genAi = data.genAi;
  return (
    <div className="page">
      <header className="page__header">
        <div>
          <div className="eyebrow">AI governance · {data.framework.name}</div>
          <h1>AI RMF readiness · {Math.round(data.readiness * 100)}%</h1>
          <p>
            {data.systems.length} AI system{data.systems.length === 1 ? "" : "s"} inventoried · {data.total} outcomes · {data.gaps} gaps
            {genAi?.active ? ` · Generative AI Profile applies (${genAi.generativeSystems.join(", ")})` : ""}. The AI RMF is voluntary and outcome-based; Visua tracks progress, it does not certify conformity.
          </p>
        </div>
        <div className="page__actions">
          <button className="btn btn--agent" onClick={() => run("planner", "Plan AI RMF work for our largest AI governance gaps", { framework: AI_RMF }, { stay: true })}>
            <Sparkles size={14} /> Plan with agent
          </button>
          <a className="btn" href={exportUrl(ws, "ai-rmf-profile.csv")}>
            AI RMF profile (CSV)
          </a>
          <Link className="btn btn--primary" to={`/w/${ws}/observatory/${AI_RMF}`}>
            <Telescope size={14} /> Outcomes in 3D
          </Link>
        </div>
      </header>
      <div className="stack" style={{ gap: 16 }}>
        <Inventory ws={ws} systems={data.systems} />
        <div className="grid grid--4">
          {data.functions.map((f) => (
            <Link key={f.id} to={`/w/${ws}/observatory/${AI_RMF}?select=${encodeURIComponent(f.id)}`} className="panel" style={{ color: "inherit" }}>
              <div className="row" style={{ gap: 8 }}>
                <span className="mono" style={{ color: "var(--color-framework-ai)" }}>
                  {f.code}
                </span>
                <span style={{ flex: 1 }} />
                <StatusChip status={f.status} />
              </div>
              <div className="metric__value" style={{ marginTop: 8 }}>
                {Math.round(f.readiness * 100)}
                <small>%</small>
              </div>
              <div style={{ marginTop: 8 }}>{f.counts && <StatusBar counts={f.counts} height={6} />}</div>
              <div className="muted" style={{ fontSize: 12, marginTop: 6 }}>
                {f.total} outcomes · {f.gaps} gaps
              </div>
            </Link>
          ))}
        </div>
        {genAi && (
          <div className="panel">
            <div className="panel__head">
              <h2>{genAi.title}</h2>
              <span className="spacer" />
              <span className="muted" style={{ fontSize: 12 }}>
                {genAi.active ? "Applies: at least one inventoried system is generative" : "Not yet applicable: no generative system in the inventory"}
              </span>
            </div>
            <p className="muted" style={{ fontSize: 13, marginBottom: 12 }}>
              Each GAI risk is addressed by Generative AI Profile actions attached to AI RMF outcomes. Readiness here is the progress of those outcomes toward their targets — a lead indicator, not a risk rating.
            </p>
            <table className="table">
              <thead>
                <tr>
                  <th>GAI risk</th>
                  <th style={{ width: 90 }}>Actions</th>
                  <th style={{ width: 90 }}>Outcomes</th>
                  <th style={{ width: 220 }}>Outcome readiness</th>
                  <th style={{ width: 70 }}>Gaps</th>
                </tr>
              </thead>
              <tbody>
                {genAi.risks.map((r) => (
                  <tr key={r.id} title={r.description}>
                    <td>
                      <Link to={`/w/${ws}/observatory/${AI_RMF}?select=${encodeURIComponent(r.outcomes[0] ?? "")}`} style={{ color: "inherit" }}>
                        {r.title}
                      </Link>
                      <div className="muted" style={{ fontSize: 11.5 }}>
                        {truncate(r.description, 140)}
                        {r.citation.page ? ` (NIST AI 600-1, p. ${r.citation.page})` : ""}
                      </div>
                    </td>
                    <td className="mono">{r.actions}</td>
                    <td className="mono">{r.outcomes.length}</td>
                    <td>
                      <div className="row" style={{ gap: 8 }}>
                        <div style={{ flex: 1 }}>
                          <Progress value={r.readiness} color="var(--color-framework-ai)" />
                        </div>
                        <span className="mono" style={{ fontSize: 12, width: 38, textAlign: "right" }}>
                          {Math.round(r.readiness * 100)}%
                        </span>
                      </div>
                    </td>
                    <td className="mono">{r.gaps}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {data.framework.contentNotice && <p className="muted" style={{ fontSize: 12 }}>{data.framework.contentNotice}</p>}
      </div>
    </div>
  );
}
