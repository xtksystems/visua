import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { EffectiveEvidenceState, Evidence, NodeScore } from "@visua/core";
import { api } from "../lib/api.ts";
import type { WorkspaceSummary } from "../lib/types.ts";
import { toast } from "./ui/index.tsx";

interface AuditorView {
  workspaceId: string; workspaceName: string; revision: number; asOf: string; capturedAt: string; periodStart?: string; frameworkIds: string[];
  basis: { records: string; period: string; audit: string };
  checkpoint: { workspaceId: string; seq: number; hash: string };
  frameworks: { id: string; name: string; overall: NodeScore; requirements: { id: string; code: string; current: number; target: number; applicable: boolean; status: string; reasons: string[]; rationale?: string; owner?: string; evidenceIds: string[] }[] }[];
  evidence: { evidence: Evidence; effective: EffectiveEvidenceState; dependency: boolean }[];
  dependencies: { missing: { kind: string; id: string; referencedByEvidenceId: string }[] };
}
interface AccessRecord { id: string; at: string; principalLabel: string; kind: string; resource?: string; outcome: "prepared" }
const label = (value: string) => value.replaceAll("-", " ");
const scrollStyle = { overflowX: "auto" as const, maxWidth: "100%", minWidth: 0 };
const tableStyle = { minWidth: "calc(var(--space-4xl) * 12)" };
function save(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob), anchor = document.createElement("a");
  anchor.href = url; anchor.download = filename; anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

/** Explicit captures only. Its parent keys this component by canonical workspace id. */
export function AuditorPanel({ workspace }: { workspace: WorkspaceSummary }) {
  const frameworks = workspace.frameworks.filter(framework => framework.settings.enabled && framework.family !== "threat");
  const availableKey = JSON.stringify(frameworks.map(framework => framework.id).sort());
  const [selected, setSelected] = useState(() => frameworks.map(framework => framework.id));
  const effectiveSelected = selected.filter(id => frameworks.some(framework => framework.id === id));
  const [start, setStart] = useState(""), [end, setEnd] = useState("");
  const [view, setView] = useState<AuditorView>();
  const [receipt, setReceipt] = useState<{ manifest: string; checkpoint: string }>();
  const [access, setAccess] = useState<AccessRecord[]>();
  const [busy, setBusy] = useState<"view" | "download" | "access">();
  const [error, setError] = useState("");
  const active = useRef<AbortController | undefined>(undefined);
  useEffect(() => () => active.current?.abort(), []);
  useLayoutEffect(() => {
    const available = new Set<string>(JSON.parse(availableKey) as string[]);
    // A live scope change can arrive while a capture is in flight. Abort before
    // painting the refreshed scope so its late result cannot restore stale data.
    active.current?.abort();
    setBusy(undefined); setView(undefined); setReceipt(undefined); setError("");
    setSelected(previous => {
      const next = previous.filter(id => available.has(id));
      return next.length === previous.length ? previous : next;
    });
  }, [availableKey]);
  const today = new Date().toISOString().slice(0, 10);
  const base = `/workspaces/${encodeURIComponent(workspace.workspace.id)}`;
  const clearCapture = () => { setView(undefined); setReceipt(undefined); setError(""); };
  const query = () => {
    if (!effectiveSelected.length) throw new Error("Select at least one framework.");
    if ((end && end > today) || (start && start > (end || today))) throw new Error("Use a review window ending no later than today, with its start before its end.");
    const params = new URLSearchParams();
    for (const id of effectiveSelected) params.append("framework", id);
    if (start) params.set("periodStart", `${start}T00:00:00.000Z`);
    if (end) params.set("asOf", end === today ? new Date().toISOString() : `${end}T23:59:59.999Z`);
    return `?${params}`;
  };
  async function run(action: "view" | "download" | "access") {
    active.current?.abort();
    const controller = new AbortController(); active.current = controller;
    setBusy(action); setError("");
    try {
      if (action === "view") {
        const next = await api.get<AuditorView>(`${base}/auditor${query()}`, controller.signal);
        if (!controller.signal.aborted) setView(next);
      } else if (action === "access") {
        const next = await api.get<AccessRecord[]>(`${base}/access`, controller.signal);
        if (!controller.signal.aborted) setAccess(next);
      } else {
        const result = await api.downloadResponse(`${base}/exports/auditor-bundle.zip${query()}`, controller.signal);
        if (controller.signal.aborted) return;
        if (!result.manifestSha256 || !result.auditCheckpoint) throw new Error("The download did not include its receipt. Retry or contact your administrator.");
        save(result.blob, result.filename);
        setReceipt({ manifest: result.manifestSha256, checkpoint: result.auditCheckpoint });
      }
    } catch (cause) {
      if (!controller.signal.aborted) { const message = cause instanceof Error ? cause.message : "The request failed. Try again."; setError(message); toast(message); }
    } finally { if (!controller.signal.aborted) setBusy(undefined); }
  }
  const receiptText = receipt ? `Workspace: ${workspace.workspace.id}\nManifest SHA-256: ${receipt.manifest}\nAudit checkpoint: ${receipt.checkpoint}\n` : "";
  return <section className="panel stack" aria-labelledby="auditor-heading" style={{ marginBottom: "var(--space-xl)", minWidth: 0 }}>
    <h2 id="auditor-heading">Auditor handoff</h2>
    <p>Read-only current recorded state, evaluated at the chosen instant. This does not reconstruct historical state or establish assurance across the entire review period.</p>
    <fieldset disabled={!!busy} className="stack" style={{ minWidth: 0 }}>
      <legend>Framework scope and UTC review window</legend>
      <div className="row row--wrap">
        {frameworks.map(framework => <label key={framework.id} className="row"><input type="checkbox" checked={selected.includes(framework.id)} onChange={event => { setSelected(values => event.target.checked ? [...values, framework.id] : values.filter(id => id !== framework.id)); clearCapture(); }} />{framework.shortName}</label>)}
      </div>
      {!frameworks.length && <p role="note">No enabled assessable frameworks. Ask an administrator to enable a framework.</p>}
      {!!frameworks.length && !effectiveSelected.length && <p role="note">Select at least one framework to prepare a view or package.</p>}
      <div className="row row--wrap">
        <label className="field">Period start (UTC, optional)<input className="input" type="date" max={end || today} value={start} onChange={event => { setStart(event.target.value); clearCapture(); }} /></label>
        <label className="field">Evaluation end (UTC, optional)<input className="input" type="date" min={start || undefined} max={today} value={end} onChange={event => { setEnd(event.target.value); clearCapture(); }} /></label>
      </div>
      <p className="muted">Past dates use the end of that UTC day. Today uses the current instant. Leave the end blank to evaluate at capture time.</p>
      <div className="row row--wrap">
        <button className="btn" disabled={!effectiveSelected.length} onClick={() => void run("view")}>Open auditor view</button>
        <button className="btn btn--primary" disabled={!effectiveSelected.length} onClick={() => void run("download")}>Download auditor package</button>
      </div>
    </fieldset>
    {busy && <p role="status">{busy === "download" ? "Preparing auditor package…" : busy === "view" ? "Preparing auditor view…" : "Loading access records…"}</p>}
    {error && <p role="alert">{error}</p>}
    {receipt && <section className="callout stack" aria-label="Download receipt" style={{ overflowWrap: "anywhere", minWidth: 0 }}>
      <h3>Download receipt</h3>
      <p>Copy or save this receipt separately from the package. An unsigned package can establish internal consistency; authenticity requires an independently retained manifest hash and a trusted verifier. The checkpoint binds the audit chain, not every package file.</p>
      <pre style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{receiptText}</pre>
      <div className="row row--wrap"><button className="btn" onClick={() => void navigator.clipboard.writeText(receiptText).then(() => toast("Receipt copied"), () => toast("Copy failed. Save the receipt instead."))}>Copy receipt</button><button className="btn" onClick={() => save(new Blob([receiptText], { type: "text/plain" }), "visua-auditor-receipt.txt")}>Save receipt</button></div>
    </section>}
    {view && <section className="stack" aria-label="Read-only auditor view" style={{ minWidth: 0 }}>
      <h3>{view.workspaceName} — recorded assessment</h3>
      <p>Revision {view.revision}. Captured {view.capturedAt}. Evaluated {view.asOf}{view.periodStart ? `; period begins ${view.periodStart}` : ""}.</p>
      <p className="muted">{view.basis.records} {view.basis.period}</p>
      <p style={{ overflowWrap: "anywhere" }}>Audit checkpoint: {view.checkpoint.workspaceId}:{view.checkpoint.seq}:{view.checkpoint.hash}</p>
      {view.frameworks.map(framework => <section className="stack" key={framework.id} style={{ minWidth: 0 }}>
        <h4>{framework.name}</h4>
        <p>{framework.overall.total} applicable requirements · {Math.round(framework.overall.readiness * 100)}% implementation progress · {Math.round(framework.overall.evidenceCoverage * 100)}% valid evidence coverage</p>
        <div role="region" aria-label={`${framework.name} recorded requirements`} tabIndex={0} style={scrollStyle}>
          <table className="table" style={tableStyle}><thead><tr>{["Requirement", "Current", "Target", "Applicability / exclusion", "Status and reasons", "Owner", "Evidence"].map(title => <th scope="col" key={title}>{title}</th>)}</tr></thead><tbody>
            {framework.requirements.map(row => <tr key={row.id}><th scope="row" title={row.id}>{row.code}</th><td>{row.current}</td><td>{row.target}</td><td>{row.applicable ? "Applicable" : row.rationale || "Excluded"}</td><td>{label(row.status)}<div className="muted">{row.reasons.join("; ")}</div></td><td>{row.owner || "Unassigned"}</td><td>{row.evidenceIds.length ? row.evidenceIds.map(id => view.evidence.find(item => item.evidence.id === id)?.evidence.title ?? id).join("; ") : "None recorded"}</td></tr>)}
          </tbody></table>
        </div>
        {!framework.requirements.length && <p>No recorded requirements in this scope.</p>}
      </section>)}
      <h4>Evidence, validity and recorded review</h4>
      {view.evidence.length ? <div role="region" aria-label="Recorded evidence" tabIndex={0} style={scrollStyle}><table className="table" style={tableStyle}><thead><tr>{["Evidence", "Source", "Validity at evaluation", "Recorded review", "Collection / expiry", "Assurance"].map(title => <th scope="col" key={title}>{title}</th>)}</tr></thead><tbody>
        {view.evidence.map(({ evidence, effective, dependency }) => <tr key={evidence.id}><th scope="row">{evidence.title}{dependency && <div className="muted">Related dependency outside selected scope</div>}</th><td>{label(evidence.provenance?.origin ?? evidence.source)}{!evidence.provenance && " · provenance not recorded"}</td><td>{label(effective.status)}<div className="muted">{effective.reasons.join("; ")}</div></td><td>{label(evidence.status)} · {effective.acceptanceBound ? "Review bound to current artifact" : "No current bound acceptance"}<div>{evidence.reviewedBy || "Reviewer not recorded"}{evidence.reviewedAt ? ` · ${evidence.reviewedAt}` : ""}</div></td><td>{evidence.collectedAt} / {evidence.validUntil || "No expiry recorded"}</td><td>{evidence.assurance ? `${label(evidence.assurance.kind)}: ${evidence.assurance.scope}` : "Not recorded"}</td></tr>)}
      </tbody></table></div> : <p>No evidence recorded for this scope.</p>}
      {view.dependencies.missing.length > 0 && <div role="note"><h4>Referenced records not available</h4><ul>{view.dependencies.missing.map((item, index) => <li key={index}>{item.kind} {item.id}, referenced by {item.referencedByEvidenceId}</li>)}</ul></div>}
    </section>}
    <div className="stack" style={{ minWidth: 0 }}>
      <h3>Separate access records</h3>
      <p className="muted">These records mean a view or download was prepared. They do not prove receipt and do not change the assessment audit chain.</p>
      <button className="btn" disabled={!!busy} onClick={() => void run("access")}>Load recent access records</button>
      {access && (access.length ? <div role="region" aria-label="Prepared access records" tabIndex={0} style={scrollStyle}><table className="table" style={tableStyle}><thead><tr><th scope="col">Prepared at</th><th scope="col">Principal</th><th scope="col">Kind</th><th scope="col">Resource</th><th scope="col">Outcome</th></tr></thead><tbody>{access.map(item => <tr key={item.id}><td>{item.at}</td><td>{item.principalLabel}</td><td>{label(item.kind)}</td><td>{item.resource || "—"}</td><td>Prepared</td></tr>)}</tbody></table></div> : <p>No access records yet.</p>)}
    </div>
  </section>;
}
