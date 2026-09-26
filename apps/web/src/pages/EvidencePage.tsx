/** Evidence & monitoring: provenance-first evidence ledger, connectors and checks. */
import { Check, Plug, Play, Plus, ShieldCheck, X } from "lucide-react";
import { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { useRunAgent } from "../components/inspector/Inspector.tsx";
import { CodeTag, Dialog, Empty, Metric, Segmented, toast } from "../components/ui/index.tsx";
import { api } from "../lib/api.ts";
import { relativeTime, shortDate, truncate } from "../lib/format.ts";
import { useChecks, useConnectors, useEvidence, useMeta, useWsMutation } from "../lib/queries.ts";
import type { CheckResult, Evidence } from "../lib/types.ts";

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
  if (!e.validUntil) return { label: "no expiry", color: "var(--color-status-verified)" };
  const days = (new Date(e.validUntil).getTime() - Date.now()) / 86_400_000;
  if (days < 0) return { label: `expired ${shortDate(e.validUntil)}`, color: "var(--color-status-at-risk)" };
  if (days < 30) return { label: `expires ${relativeTime(e.validUntil)}`, color: "var(--color-status-in-progress)" };
  return { label: `valid to ${shortDate(e.validUntil)}`, color: "var(--color-status-verified)" };
}

function AddConnector({ onClose }: { onClose: () => void }) {
  const { ws = "" } = useParams();
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
          <button className="btn btn--primary" onClick={() => create.mutate(undefined, { onSuccess: () => (toast("Connector added"), onClose()), onError: (e) => toast((e as Error).message, "error") })}>
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

export function EvidencePage() {
  const { ws = "" } = useParams();
  const { data: evidence = [] } = useEvidence(ws);
  const { data: connectors = [] } = useConnectors(ws);
  const { data: checks = [] } = useChecks(ws);
  const run = useRunAgent();
  const [filter, setFilter] = useState<"all" | "pending" | "expiring" | "connector">("all");
  const [adding, setAdding] = useState(false);
  const [viewing, setViewing] = useState<Evidence | null>(null);
  const review = useWsMutation(ws, (v: { id: string; decision: "accepted" | "rejected" }) => api.patch(`/workspaces/${encodeURIComponent(ws)}/evidence/${v.id}`, { decision: v.decision }));
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
  const accepted = evidence.filter((e) => e.status === "accepted").length;
  const expired = evidence.filter((e) => e.validUntil && new Date(e.validUntil).getTime() < Date.now()).length;
  return (
    <div className="page">
      <header className="page__header">
        <div>
          <div className="eyebrow">Evidence & monitoring</div>
          <h1>Evidence ledger</h1>
          <p>Evidence must show what is actually in place. Every item records where it came from, when, who reviewed it, and a content hash. Agents cannot file plans or drafts as evidence.</p>
        </div>
        <div className="page__actions">
          <button className="btn btn--agent" onClick={() => run("evidence-collector", "Run monitoring checks and find implemented requirements without evidence", {})}>
            Collect with agent
          </button>
          <button className="btn" onClick={() => setAdding(true)}>
            <Plug size={14} /> Add connector
          </button>
        </div>
      </header>
      <div className="grid grid--4" style={{ marginBottom: 20 }}>
        <Metric label="Evidence items" value={evidence.length} sub={`${accepted} accepted`} />
        <Metric label="Awaiting review" value={evidence.filter((e) => e.status === "pending-review").length} />
        <Metric label="Expired" value={expired} sub="Expired evidence puts requirements at risk" />
        <Metric label="Connectors" value={connectors.length} sub={`${latestChecks.filter((c) => c.outcome === "pass").length}/${latestChecks.length} checks passing`} />
      </div>
      <div className="grid" style={{ gridTemplateColumns: "minmax(0, 1.7fr) minmax(0, 1fr)", alignItems: "start" }}>
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
            <table className="table">
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
                      <td style={{ color: f.color, fontSize: 12.5, whiteSpace: "nowrap" }}>{f.label}</td>
                      <td style={{ whiteSpace: "nowrap" }}>
                        {e.status === "pending-review" && (
                          <>
                            <button className="btn btn--sm btn--icon" title="Accept" onClick={() => review.mutate({ id: e.id, decision: "accepted" })}>
                              <Check size={13} />
                            </button>{" "}
                            <button className="btn btn--sm btn--icon" title="Reject" onClick={() => review.mutate({ id: e.id, decision: "rejected" })}>
                              <X size={13} />
                            </button>
                          </>
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
                    disabled={runConnector.isPending}
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
                <div className="muted" style={{ fontSize: 12, marginBottom: 10 }}>
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
              <button className="btn btn--sm" onClick={() => setAdding(true)} style={{ marginTop: 8 }}>
                <Plus size={13} /> Add a connector
              </button>
            </Empty>
          )}
        </div>
      </div>
      {adding && <AddConnector onClose={() => setAdding(false)} />}
      {viewing && (
        <Dialog wide title={viewing.title} onClose={() => setViewing(null)}>
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
            <dt>Collected</dt>
            <dd>{new Date(viewing.collectedAt).toLocaleString()}</dd>
            <dt>Valid until</dt>
            <dd>{viewing.validUntil ? new Date(viewing.validUntil).toLocaleString() : "—"}</dd>
            <dt>SHA-256</dt>
            <dd className="mono" style={{ wordBreak: "break-all", fontSize: 12 }}>
              {viewing.sha256 ?? "—"}
            </dd>
          </dl>
          {viewing.content && <pre className="panel mono" style={{ whiteSpace: "pre-wrap", fontSize: 12, maxHeight: 320, overflow: "auto" }}>{viewing.content}</pre>}
          {viewing.data && <pre className="panel mono" style={{ whiteSpace: "pre-wrap", fontSize: 11.5, maxHeight: 260, overflow: "auto", marginTop: 8 }}>{JSON.stringify(viewing.data, null, 2)}</pre>}
        </Dialog>
      )}
    </div>
  );
}
