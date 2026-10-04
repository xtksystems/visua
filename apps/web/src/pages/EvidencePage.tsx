/** Evidence & monitoring: provenance-first evidence ledger, connectors and checks. */
import { evidenceFreshness, evidenceReviewScope, isEvidenceValid } from "@visua/core";
import { Check, Download, Plug, Play, Plus, ShieldCheck, Upload, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRunAgent } from "../components/inspector/Inspector.tsx";
import { CodeTag, Dialog, Empty, Metric, Segmented, toast } from "../components/ui/index.tsx";
import { useWorkspaceId } from "../lib/workspace.ts";
import { api } from "../lib/api.ts";
import { useCan } from "../lib/auth.ts";
import { relativeTime, shortDate, truncate } from "../lib/format.ts";
import { useChecks, useConnectors, useEvidence, useMeta, useWsMutation } from "../lib/queries.ts";
import type { CheckResult, Evidence } from "../lib/types.ts";
import { split } from "../lib/media.ts";
import { UploadEvidence } from "../components/work/UploadEvidence.tsx";
import { QueryError } from "../components/ui/QueryError.tsx";

const OUTCOME_COLOR: Record<CheckResult["outcome"], string> = {
  pass: "var(--color-status-implemented)",
  warn: "var(--color-status-in-progress)",
  fail: "var(--color-status-at-risk)",
  error: "var(--color-status-at-risk)",
};

function provenance(e: Evidence): { label: string; title: string } {
  if (e.source === "connector") return { label: "API-automated", title: "Collected by a monitoring connector; the raw observation and its SHA-256 hash are stored." };
  if (e.source === "agent") return { label: "Agent-assisted", title: "Proposed by an agent and approved by a person." };
  if (e.source === "upload") return { label: "Uploaded", title: "Uploaded by a person; content hash recorded." };
  return { label: "Manual", title: "Recorded manually." };
}

function freshness(e: Evidence): { label: string; color: string } {
  if (e.status === "rejected") return { label: "rejected", color: "var(--color-on-surface-muted)" };
  if (e.status === "pending-review") return { label: "pending review", color: "var(--color-tertiary)" };
  const state = evidenceFreshness(e);
  if (state === "none") return { label: "requires review or correction", color: "var(--color-status-in-progress)" };
  if (state === "expired") return { label: `expired${e.validUntil ? ` ${shortDate(e.validUntil)}` : ""}`, color: "var(--color-status-at-risk)" };
  if (!e.validUntil) return { label: "no expiry", color: "var(--color-status-verified)" };
  const days = (new Date(e.validUntil).getTime() - Date.now()) / 86_400_000;
  if (days < 0) return { label: `expired ${shortDate(e.validUntil)}`, color: "var(--color-status-at-risk)" };
  if (days < 30) return { label: `expires ${relativeTime(e.validUntil)}`, color: "var(--color-status-in-progress)" };
  return { label: `valid to ${shortDate(e.validUntil)}`, color: "var(--color-status-verified)" };
}

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

function EvidenceDialog({ initial, onClose }: { initial: Evidence; onClose: () => void }) {
  const ws = useWorkspaceId();
  const canReview = useCan("work.approve");
  const [viewing, setViewing] = useState<Evidence>();
  const [error, setError] = useState<string>();
  const [attempt, setAttempt] = useState(0);
  const [downloading, setDownloading] = useState(false);
  const active = useRef(false);
  useEffect(() => {
    active.current = true;
    const controller = new AbortController();
    api.get<Evidence>(`/workspaces/${encodeURIComponent(ws)}/evidence/${encodeURIComponent(initial.id)}`, controller.signal)
      .then(item => { if (!controller.signal.aborted) setViewing(item); })
      .catch(failure => { if (!controller.signal.aborted) setError((failure as Error).message); });
    return () => { active.current = false; controller.abort(); };
  }, [ws, initial.id, attempt]);
  // This detached detail snapshot is the content the person inspected, even if live metadata refreshes.
  const review = useWsMutation(ws, async (v: { evidence: Evidence; decision: "accepted" | "rejected" }) => api.patch<Evidence>(`/workspaces/${encodeURIComponent(ws)}/evidence/${v.evidence.id}`, { decision: v.decision, expectedScope: evidenceReviewScope(v.evidence) }), { onError: failure => { if (active.current) setError(failure.message); } });
  const download = async (item: Evidence) => {
    if (downloading) return;
    setDownloading(true); setError(undefined);
    try {
      const blob = await api.download(`/workspaces/${encodeURIComponent(ws)}/evidence/${encodeURIComponent(item.id)}/file`);
      if (!active.current) return;
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a"); link.href = url; link.download = item.fileName ?? "evidence";
      document.body.append(link); link.click(); link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
    } catch (failure) { if (active.current) setError((failure as Error).message); }
    finally { if (active.current) setDownloading(false); }
  };
  return (
        <Dialog wide title={viewing?.title ?? initial.title} onClose={onClose} footer={viewing && viewing.status === "pending-review" && canReview ? (
          <>
            <button className="btn" disabled={review.isPending} onClick={() => review.mutate({ evidence: viewing, decision: "rejected" }, { onSuccess: (next) => { if (active.current) { setViewing(next); toast("Evidence rejected"); } } })}><X size={13} /> Reject</button>
            <button className="btn btn--primary" disabled={review.isPending} onClick={() => review.mutate({ evidence: viewing, decision: "accepted" }, { onSuccess: (next) => { if (active.current) { setViewing(next); toast("Evidence accepted"); } } })}><Check size={13} /> Accept</button>
          </>
        ) : undefined}>
          {error && <div role="alert"><p>{error}</p><button className="btn btn--sm" disabled={review.isPending || downloading} onClick={() => { setError(undefined); setViewing(undefined); setAttempt(value => value + 1); }}>Reload evidence</button></div>}
          {!viewing && !error && <p role="status">Loading evidence details…</p>}
          {viewing && <>
          <dl className="kv" style={{ marginBottom: 12 }}>
            <dt>Provenance</dt>
            <dd>
              {provenance(viewing).label} · {viewing.source}
              {viewing.connectorId ? ` · connector ${viewing.connectorId}` : ""}
            </dd>
            <dt>Status</dt>
            <dd>
              {viewing.status}
              {viewing.reviewedBy ? ` by ${viewing.reviewedBy} ${relativeTime(viewing.reviewedAt)}` : ""}
            </dd>
            <dt>Requirements</dt>
            <dd>{viewing.requirementIds.map((id) => <CodeTag key={id} id={id} />)}</dd>
            <dt>Collected</dt>
            <dd>{new Date(viewing.collectedAt).toLocaleString()}</dd>
            <dt>Valid until</dt>
            <dd>{viewing.validUntil ? new Date(viewing.validUntil).toLocaleString() : "—"}</dd>
            <dt>SHA-256</dt>
            <dd className="mono" style={{ wordBreak: "break-all", fontSize: 12 }}>
              {viewing.sha256 ?? "—"}
            </dd>
          </dl>
          {viewing.artifact && <section className="panel stack" style={{ gap: 8 }} aria-label="Evidence file">
            <div>{viewing.fileName} · {viewing.artifact.size.toLocaleString()} bytes · {viewing.artifact.mediaType}</div>
            <button className="btn" disabled={downloading} onClick={() => void download(viewing)}><Download size={14} /> {downloading ? "Verifying download…" : "Download file"}</button>
          </section>}
          {!!viewing.reviewHistory?.length && (
            <section className="stack" style={{ gap: 8, marginBottom: 12 }} aria-label="Review history">
              <h3>Review history</h3>
              {viewing.reviewHistory.map((r) => (
                <div key={r.id} className="panel" style={{ fontSize: 12 }}>
                  <div>{r.decision} by {r.reviewedBy} · {shortDate(r.reviewedAt)}{r.legacy ? " · legacy decision; renewed review required" : ""}</div>
                  {r.scope && <div className="muted">{r.scope.requirementIds.map((id) => <CodeTag key={id} id={id} />)} · collected {shortDate(r.scope.collectedAt)} · {r.scope.validUntil ? `valid through ${shortDate(r.scope.validUntil)}` : "no expiry"}</div>}
                  {r.scope?.sha256 && <div className="mono muted wrap-anywhere">Artifact SHA-256: {r.scope.sha256}</div>}
                  {r.note && <p>{r.note}</p>}
                </div>
              ))}
            </section>
          )}
          {viewing.content && <pre className="panel mono" style={{ whiteSpace: "pre-wrap", fontSize: 12, maxHeight: 320, overflow: "auto" }}>{viewing.content}</pre>}
          {viewing.data && <pre className="panel mono" style={{ whiteSpace: "pre-wrap", fontSize: 11.5, maxHeight: 260, overflow: "auto", marginTop: 8 }}>{JSON.stringify(viewing.data, null, 2)}</pre>}
          </>}
        </Dialog>
  );
}

export function EvidencePage() {
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
  const [uploading, setUploading] = useState(false);
  useEffect(() => { setViewing(null); setUploading(false); }, [ws]);
  const canWrite = useCan("work.write");
  const canReview = useCan("work.approve");
  const runConnector = useWsMutation(ws, (id: string) => api.post<CheckResult[]>(`/workspaces/${encodeURIComponent(ws)}/connectors/${id}/run`));
  const list = useMemo(() => {
    const now = Date.now();
    return evidence
      .filter((e) => {
        if (filter === "pending") return e.status === "pending-review";
        if (filter === "connector") return e.source === "connector";
        if (filter === "expiring") return !!e.validUntil && new Date(e.validUntil).getTime() - now < 30 * 86_400_000;
        return true;
      })
      .sort((a, b) => b.collectedAt.localeCompare(a.collectedAt));
  }, [evidence, filter]);
  const latestChecks = useMemo(() => {
    const seen = new Set<string>();
    return checks.filter((c) => {
      const key = `${c.connectorId}|${c.checkId}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [checks]);
  const accepted = evidence.filter((e) => isEvidenceValid(e)).length;
  const expired = evidence.filter((e) => e.validUntil && new Date(e.validUntil).getTime() < Date.now()).length;
  if (evidenceQuery.error) return <QueryError title="Could not load evidence" error={evidenceQuery.error} retry={() => evidenceQuery.refetch()} />;
  return (
    <div className="page">
      <header className="page__header">
        <div>
          <div className="eyebrow">Evidence & monitoring</div>
          <h1>Evidence ledger</h1>
          <p>Evidence must show what is actually in place. Every item records where it came from, when, who reviewed it, and a content hash. Agents cannot file plans or drafts as evidence.</p>
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
      {evidenceQuery.isPending && <p role="status">Loading evidence…</p>}
      <div className="grid grid--4" style={{ marginBottom: 20 }}>
        <Metric label="Evidence items" value={evidence.length} sub={`${accepted} currently valid`} />
        <Metric label="Awaiting review" value={evidence.filter((e) => e.status === "pending-review").length} />
        <Metric label="Expired" value={expired} sub="Expired evidence puts requirements at risk" />
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
          <div style={{ overflow: "auto", maxHeight: "calc(100vh - 360px)" }}>
            <table className="table table--evidence">
              <thead>
                <tr>
                  <th>Evidence</th>
                  <th>Provenance</th>
                  <th>Requirements</th>
                  <th>Freshness</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {list.map((e) => {
                  const p = provenance(e);
                  const f = freshness(e);
                  return (
                    <tr key={e.id}>
                      <td style={{ maxWidth: 320 }}>
                        <button className="btn btn--quiet btn--sm" style={{ padding: 0, height: "auto", color: "var(--color-on-surface)", textAlign: "left", whiteSpace: "normal" }} onClick={() => setViewing(e)}>
                          {truncate(e.title, 90)}
                        </button>
                        <div className="muted" style={{ fontSize: 11.5 }}>
                          {e.kind} · collected {relativeTime(e.collectedAt)}
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
                      <td style={{ color: f.color, fontSize: 12.5 }}>{f.label}</td>
                      <td style={{ whiteSpace: "nowrap" }}>
                        {e.status === "pending-review" && canReview && (
                          <button className="btn btn--sm" onClick={() => setViewing(e)}>Review</button>
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
                  {c.kind} · {Object.values(c.config).map(String).join(" ")} · {c.lastRunAt ? `last run ${relativeTime(c.lastRunAt)}` : "never run"}
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
      {adding && canConfigure && <AddConnector onClose={() => setAdding(false)} />}
      {viewing && <EvidenceDialog key={`${ws}:${viewing.id}`} initial={viewing} onClose={() => setViewing(null)} />}
      {uploading && canWrite && <UploadEvidence key={ws} onClose={() => setUploading(false)} onUploaded={item => { setUploading(false); setViewing(item); }} />}
    </div>
  );
}
