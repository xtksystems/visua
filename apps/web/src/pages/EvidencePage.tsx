/** Evidence & monitoring: provenance-first evidence ledger, connectors and checks. */
import { effectiveEvidenceState, evidenceRenewalDates, isEvidenceValid } from "@visua/core";
import { Plug, Play, Plus, ShieldCheck, Upload } from "lucide-react";
import { useEffect, useId, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { useRunAgent } from "../components/inspector/Inspector.tsx";
import { CodeTag, Dialog, Empty, Metric, Segmented, TabPanel, Tabs, toast } from "../components/ui/index.tsx";
import { useWorkspaceId } from "../lib/workspace.ts";
import { api } from "../lib/api.ts";
import { useCan } from "../lib/auth.ts";
import { relativeTime, truncate } from "../lib/format.ts";
import { useChecks, useConnectors, useEvidence, useMeta, useWsMutation } from "../lib/queries.ts";
import type { CheckResult, Evidence } from "../lib/types.ts";
import { split } from "../lib/media.ts";
import { EvidenceDialog } from "../components/work/EvidenceDialog.tsx";
import { ASSURANCE_LABELS, provenance } from "../components/work/evidence-labels.ts";
import { UploadEvidence } from "../components/work/UploadEvidence.tsx";
import { QueryError } from "../components/ui/QueryError.tsx";
import { EvidenceRenewal, EvidenceReviewValidity, type RenewalWindow } from "../components/work/EvidenceRenewal.tsx";

const OUTCOME_COLOR: Record<CheckResult["outcome"], string> = {
  pass: "var(--color-status-implemented)",
  warn: "var(--color-status-in-progress)",
  fail: "var(--color-status-at-risk)",
  error: "var(--color-status-at-risk)",
};

function AddConnector({ onClose }: { onClose: () => void }) {
  const ws = useWorkspaceId();
  const canConfigure = useCan("workspace.configure");
  const meta = useMeta();
  const kinds = meta.data?.connectorKinds ?? [];
  const [kind, setKind] = useState(kinds[0]?.kind ?? "web-posture");
  const [name, setName] = useState("");
  const [config, setConfig] = useState<Record<string, string>>({});
  const def = kinds.find((k) => k.kind === kind);
  const create = useWsMutation(ws, () => api.post(`/workspaces/${encodeURIComponent(ws)}/connectors`, { kind, name: name || undefined, config }));
  return (
    <Dialog
      title="Add a monitoring connector"
      onClose={onClose}
      footer={
        <>
          <button className="btn" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn--primary" disabled={!canConfigure || create.isPending} onClick={() => create.mutate(undefined, { onSuccess: () => (toast("Connector added"), onClose()), onError: (e) => toast((e as Error).message, "error") })}>
            Add connector
          </button>
        </>
      }
    >
      <div className="stack" style={{ gap: 12 }}>
        <div className="field">
          <label>Connector</label>
          <select className="select" value={kind} onChange={(e) => setKind(e.target.value)}>
            {kinds.map((k) => (
              <option key={k.kind} value={k.kind}>
                {k.name}
              </option>
            ))}
          </select>
          <span className="field__hint">{def?.description}</span>
        </div>
        <div className="field">
          <label>Display name</label>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder={def?.name} />
        </div>
        {def?.configFields.map((f) => (
          <div key={f.key} className="field">
            <label>{f.label}</label>
            <input className="input" placeholder={f.placeholder} value={config[f.key] ?? ""} onChange={(e) => setConfig({ ...config, [f.key]: e.target.value })} />
          </div>
        ))}
        <span className="field__hint">Automation depth: API-automated. Every check stores its raw observation, timestamp and a SHA-256 hash.</span>
      </div>
    </Dialog>
  );
}

function CheckDialog({ id, onClose }: { id: string; onClose: () => void }) {
  const ws = useWorkspaceId();
  const observation = useQuery({ queryKey: ["ws", ws, "check", id], queryFn: ({ signal }) => api.get<CheckResult>(`/workspaces/${encodeURIComponent(ws)}/checks/${encodeURIComponent(id)}`, signal) });
  const check = observation.data;
  return <Dialog wide title={check?.title ?? "Monitoring observation"} onClose={onClose}>
    {observation.isPending && <p role="status">Loading observation…</p>}
    {observation.error && <div role="alert"><p>Could not load this observation. {observation.error.message}</p><button className="btn" onClick={() => void observation.refetch()}>Retry observation</button></div>}
    {check && <div className="stack">
      <p><strong>{check.outcome.toUpperCase()}</strong> · observed {new Date(check.observedAt).toLocaleString()}</p>
      <p>{check.detail}</p>
      <div className="row row--wrap">{check.requirementIds.map(id => <CodeTag key={id} id={id} />)}</div>
      <p className="muted">This is the recorded observation. A later check may have a different outcome. Return to the overview for current attention items.</p>
      <details><summary>Observation details</summary><pre className="panel mono wrap-anywhere" style={{ whiteSpace: "pre-wrap", maxHeight: 320, overflow: "auto" }}>{JSON.stringify(check, null, 2)}</pre></details>
    </div>}
  </Dialog>;
}

export function EvidencePage() {
  const ws = useWorkspaceId();
  return <EvidenceWorkspace key={ws} />;
}

function EvidenceWorkspace() {
  const ws = useWorkspaceId();
  const canConfigure = useCan("workspace.configure");
  const evidenceQuery = useEvidence(ws);
  const { data: evidence = [] } = evidenceQuery;
  const { data: connectors = [] } = useConnectors(ws);
  const { data: checks = [] } = useChecks(ws);
  const run = useRunAgent();
  const [filter, setFilter] = useState<"all" | "pending" | "expiring" | "connector">("all");
  const [adding, setAdding] = useState(false);
  const [viewing, setViewing] = useState<Evidence | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const viewId = useId();
  const view = searchParams.get("view") === "renewal" ? "renewal" : "ledger";
  const windowParam = searchParams.get("window");
  const renewalWindow: RenewalWindow = windowParam === "7d" || windowParam === "30d" ? windowParam : "expired";
  const changeView = (next: "ledger" | "renewal") => setSearchParams(params => {
    if (next === "renewal") { params.set("view", "renewal"); params.set("window", renewalWindow); }
    else { params.delete("view"); params.delete("window"); }
    return params;
  });
  const changeWindow = (next: RenewalWindow) => setSearchParams(params => { params.set("view", "renewal"); params.set("window", next); return params; });
  const inspectRenewal = (id: string) => {
    setViewing(null);
    setSearchParams(params => { params.set("evidence", id); params.delete("check"); return params; });
  };
  const evidenceId = searchParams.get("evidence");
  const checkId = searchParams.get("check");
  const selectedEvidence = evidenceId ? (viewing?.id === evidenceId ? viewing : evidence.find(e => e.id === evidenceId)) : undefined;
  const inspectEvidence = (item: Evidence) => {
    setViewing(item);
    setSearchParams(params => { params.set("evidence", item.id); params.delete("check"); return params; });
  };
  const closeLinked = () => {
    setViewing(null);
    setSearchParams(params => { params.delete("evidence"); params.delete("check"); return params; }, { replace: true });
  };
  const [uploading, setUploading] = useState(false);
  useEffect(() => { setViewing(null); setUploading(false); }, [ws]);
  const canWrite = useCan("work.write");
  const canReview = useCan("work.approve");
  const runConnector = useWsMutation(ws, (id: string) => api.post<CheckResult[]>(`/workspaces/${encodeURIComponent(ws)}/connectors/${id}/run`));
  const list = useMemo(() => {
    const now = new Date();
    return evidence
      .filter((e) => {
        if (filter === "pending") return e.status === "pending-review";
        if (filter === "connector") return e.provenance?.origin === "connector-check";
        if (filter === "expiring") return evidenceRenewalDates(e, now).buckets.length > 0;
        return true;
      })
      .sort((a, b) => b.collectedAt.localeCompare(a.collectedAt));
  }, [evidence, filter]);
  const latestChecks = useMemo(() => {
    const seen = new Set<string>();
    return [...checks].sort((a, b) => Date.parse(b.observedAt) - Date.parse(a.observedAt) || b.id.localeCompare(a.id)).filter((c) => {
      const key = JSON.stringify([c.connectorId, c.checkId, c.source?.configHash ?? null]);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [checks]);
  const accepted = evidence.filter((e) => isEvidenceValid(e)).length;
  const asOf = new Date();
  const expired = evidence.filter((e) => evidenceRenewalDates(e, asOf).validity === "expired").length;
  if (evidenceQuery.error) return <QueryError title="Could not load evidence" error={evidenceQuery.error} retry={() => evidenceQuery.refetch()} />;
  return (
    <div className="page">
      <header className="page__header">
        <div>
          <div className="eyebrow">Evidence & monitoring</div>
          <h1>Evidence ledger</h1>
          <p>Inspect artifact origins, assurance scope, reviews and replacement history. Legacy collection details are explicitly unrecorded. Generated narratives and requirement mappings do not prove observed operation.</p>
        </div>
        <div className="page__actions">
          <button className="btn btn--primary" disabled={!canWrite} onClick={() => setUploading(true)}><Upload size={14} /> Upload evidence</button>
          <button className="btn btn--agent" disabled={!canWrite} onClick={() => run("evidence-collector", "Run monitoring checks and find implemented requirements without evidence", {})}>
            Collect with agent
          </button>
          <button className="btn" disabled={!canConfigure} title={canConfigure ? undefined : "Only admins and owners configure connectors"} onClick={() => setAdding(true)}>
            <Plug size={14} /> Add connector
          </button>
        </div>
      </header>
      {!canWrite && <p className="muted" role="note">Read-only access. You can inspect evidence and monitoring results; contributors run collections and approvers review evidence.</p>}
      <Tabs id={viewId} label="Evidence view" tabs={[{ id: "ledger", label: "Ledger" }, { id: "renewal", label: "Renewal" }]} value={view} onChange={changeView} />
      <TabPanel groupId={viewId} id="renewal" active={view === "renewal"}>
        <EvidenceRenewal ws={ws} window={renewalWindow} onWindowChange={changeWindow} onInspect={inspectRenewal} />
      </TabPanel>
      <TabPanel groupId={viewId} id="ledger" active={view === "ledger"}>
      {evidenceQuery.isPending ? <p role="status">Loading evidence…</p> : <>
      <div className="grid grid--4" style={{ marginBottom: 20 }}>
        <Metric label="Evidence items" value={evidence.length} sub={`${accepted} currently valid`} />
        <Metric label="Awaiting review" value={evidence.filter((e) => e.status === "pending-review").length} />
        <Metric label="Expired" value={expired} sub="See Renewal for coverage impact" />
        <Metric label="Connectors" value={connectors.length} sub={`${latestChecks.filter((c) => c.outcome === "pass").length}/${latestChecks.length} checks passing`} />
      </div>
      <div className="grid split" style={split(1.7, 1)}>
        <div className="panel" style={{ padding: 0, overflow: "hidden" }}>
          <div className="row" style={{ padding: 12, gap: 8 }}>
            <Segmented
              label="Filter evidence"
              value={filter}
              onChange={setFilter}
              options={[
                { id: "all", label: "All" },
                { id: "pending", label: "Pending review" },
                { id: "expiring", label: "Expiring / expired" },
                { id: "connector", label: "Automated" },
              ]}
            />
          </div>
          <div className="evidence-ledger__scroll" role="region" aria-label="Evidence ledger details" tabIndex={0} style={{ overflow: "auto", maxHeight: "calc(100vh - 360px)" }}>
            <table className="table table--evidence">
              <thead>
                <tr>
                  <th>Evidence</th>
                  <th>Provenance</th>
                  <th>Requirements</th>
                  <th>Review & validity</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {list.map((e) => {
                  const p = provenance(e);
                  const effective = effectiveEvidenceState(e, evidence, asOf);
                  return (
                    <tr key={e.id}>
                      <td style={{ maxWidth: 320 }}>
                        <button className="btn btn--quiet btn--sm" style={{ padding: 0, height: "auto", color: "var(--color-on-surface)", textAlign: "left", whiteSpace: "normal" }} onClick={() => inspectEvidence(e)}>
                          {truncate(e.title, 90)}
                        </button>
                        <div className="muted" style={{ fontSize: 11.5 }}>
                          {e.kind} · collected {relativeTime(e.collectedAt)}
                          <div>{e.assurance ? `${ASSURANCE_LABELS[e.assurance.kind]} assurance` : "Assurance not recorded"}{e.supersedesId ? " · replacement" : ""}</div>
                        </div>
                      </td>
                      <td>
                        <span className="chip" style={{ cursor: "help" }} title={p.title}>
                          {p.label}
                        </span>
                        {e.sha256 && (
                          <div className="mono muted" style={{ fontSize: 10.5, marginTop: 4 }} title={e.sha256}>
                            sha256 {e.sha256.slice(0, 12)}…
                          </div>
                        )}
                      </td>
                      <td>
                        <div className="row row--wrap" style={{ gap: 4 }}>
                          {e.requirementIds.slice(0, 4).map((id) => (
                            <CodeTag key={id} id={id} />
                          ))}
                          {e.requirementIds.length > 4 ? <span className="muted">+{e.requirementIds.length - 4}</span> : null}
                        </div>
                      </td>
                      <td><EvidenceReviewValidity evidence={e} />{!!effective.supersededByIds.length && <div className="field__hint">Superseded by valid accepted replacement</div>}</td>
                      <td style={{ whiteSpace: "nowrap" }}>
                        {e.status === "pending-review" && canReview && (
                          <button className="btn btn--sm" onClick={() => inspectEvidence(e)}>Review</button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {!list.length && (
              <div style={{ padding: 16 }}>
                <Empty title="Nothing here" />
              </div>
            )}
          </div>
        </div>
        <div className="stack" style={{ gap: 16 }}>
          {connectors.map((c) => {
            const results = latestChecks.filter((r) => r.connectorId === c.id);
            return (
              <div key={c.id} className="panel">
                <div className="panel__head">
                  <ShieldCheck size={16} />
                  <h3>{c.name}</h3>
                  <span className="spacer" />
                  <button
                    className="btn btn--sm"
                    disabled={!canWrite || runConnector.isPending}
                    onClick={() =>
                      runConnector.mutate(c.id, {
                        onSuccess: (r) => toast(`${c.name}: ${r.filter((x) => x.outcome === "pass").length}/${r.length} checks passing`),
                        onError: (e) => toast((e as Error).message, "error"),
                      })
                    }
                  >
                    <Play size={12} /> Run
                  </button>
                </div>
                <div className="muted wrap-anywhere" style={{ fontSize: 12, marginBottom: 10 }}>
                  Current settings: {c.kind} · {Object.values(c.config).map(String).join(" ")} · {c.lastRunAt ? `last run ${relativeTime(c.lastRunAt)}` : "never run"}
                </div>
                <div className="stack" style={{ gap: 8 }}>
                  {results.map((r) => (
                    <div key={r.id} className="row" style={{ alignItems: "flex-start", gap: 8, fontSize: 13 }}>
                      <span className="mono" style={{ color: OUTCOME_COLOR[r.outcome], width: 38, flexShrink: 0, fontSize: 11, textTransform: "uppercase" }}>
                        {r.outcome}
                      </span>
                      <div style={{ minWidth: 0 }}>
                        <div>{r.title}</div>
                        <div className="muted" style={{ fontSize: 12 }}>
                          Observed <time dateTime={r.observedAt} title={r.observedAt}>{relativeTime(r.observedAt)}</time> · <span title={r.source?.configHash}>recorded configuration {r.source?.configHash?.slice(0, 8) ?? "not recorded"}</span>
                        </div>
                        <div className="muted" style={{ fontSize: 12 }}>
                          {truncate(r.detail, 140)}
                        </div>
                      </div>
                    </div>
                  ))}
                  {!results.length && <div className="muted" style={{ fontSize: 13 }}>Run the connector to collect its first results.</div>}
                </div>
              </div>
            );
          })}
          {!connectors.length && (
            <Empty title="No connectors yet">
              <button className="btn btn--sm" disabled={!canConfigure} onClick={() => setAdding(true)} style={{ marginTop: 8 }}>
                <Plus size={13} /> Add a connector
              </button>
            </Empty>
          )}
        </div>
      </div>
      </>}
      </TabPanel>
      {adding && canConfigure && <AddConnector onClose={() => setAdding(false)} />}
      {selectedEvidence && <EvidenceDialog key={`${ws}:${selectedEvidence.id}`} initial={selectedEvidence} onClose={closeLinked} onSelect={inspectEvidence} />}
      {evidenceId && !selectedEvidence && !evidenceQuery.isPending && <Dialog title="Evidence unavailable" onClose={closeLinked}><p role="alert">This evidence is no longer available in this workspace.</p><button className="btn" onClick={() => void evidenceQuery.refetch()}>Retry evidence</button></Dialog>}
      {checkId && !evidenceId && <CheckDialog key={`${ws}:${checkId}`} id={checkId} onClose={closeLinked} />}
      {uploading && canWrite && <UploadEvidence key={ws} onClose={() => setUploading(false)} onUploaded={item => { setUploading(false); inspectEvidence(item); }} />}
    </div>
  );
}
