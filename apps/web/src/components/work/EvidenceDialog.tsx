import { effectiveEvidenceState, evidenceReviewScope } from "@visua/core";
import { Check, Download, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { CodeTag, Dialog, toast } from "../ui/index.tsx";
import { useWorkspaceId } from "../../lib/workspace.ts";
import { api } from "../../lib/api.ts";
import { useCan } from "../../lib/auth.ts";
import { useEvidence, useWsMutation } from "../../lib/queries.ts";
import type { Evidence } from "../../lib/types.ts";
import { ASSURANCE_LABELS, canUploadReplacement } from "./evidence-labels.ts";
import { EvidenceCollectionDetails, evidenceTime } from "./EvidenceCollectionDetails.tsx";
import { EvidenceReviewValidity } from "./EvidenceRenewal.tsx";
import { EditEvidenceScope } from "./EditEvidenceScope.tsx";
import { UploadEvidence } from "./UploadEvidence.tsx";

export function EvidenceDialog({ initial, onClose, onSelect }: { initial: Evidence; onClose: () => void; onSelect: (evidence: Evidence) => void }) {
  const ws = useWorkspaceId();
  const canReview = useCan("work.approve");
  const canWrite = useCan("work.write");
  const evidence = useEvidence(ws);
  const [viewing, setViewing] = useState<Evidence>();
  const [error, setError] = useState<string>();
  const [attempt, setAttempt] = useState(0);
  const [downloading, setDownloading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [replacing, setReplacing] = useState(false);
  const [reasonAction, setReasonAction] = useState<"rejected" | "withdrawn">();
  const [note, setNote] = useState("");
  const active = useRef(false);
  useEffect(() => {
    active.current = true;
    const controller = new AbortController();
    api.get<Evidence>(`/workspaces/${encodeURIComponent(ws)}/evidence/${encodeURIComponent(initial.id)}`, controller.signal)
      .then(item => { if (!controller.signal.aborted) setViewing(item); })
      .catch(failure => { if (!controller.signal.aborted) setError((failure as Error).message); });
    return () => { active.current = false; controller.abort(); };
  }, [ws, initial.id, attempt]);
  // The detached detail snapshot is exactly what the person inspected. Live list refreshes cannot replace it.
  const review = useWsMutation(ws, async (value: { evidence: Evidence; decision: "accepted" | "rejected" | "withdrawn"; note?: string }) => api.patch<Evidence>(`/workspaces/${encodeURIComponent(ws)}/evidence/${encodeURIComponent(value.evidence.id)}`, { decision: value.decision, note: value.note, expectedScope: evidenceReviewScope(value.evidence), expectedReviewId: value.evidence.reviewHistory?.at(-1)?.id ?? null }), { onError: failure => { if (active.current) setError(failure.message); } });
  const decide = (decision: "accepted" | "rejected" | "withdrawn") => {
    if (!viewing || review.isPending || !canReview || (decision !== "accepted" && !note.trim())) return;
    setError(undefined);
    review.mutate({ evidence: viewing, decision, note: decision === "accepted" ? undefined : note.trim() }, { onSuccess: next => {
      if (active.current) { setViewing(next); setReasonAction(undefined); setNote(""); toast(`Evidence ${decision}`); }
    } });
  };
  const reload = () => { setError(undefined); setViewing(undefined); setReasonAction(undefined); setNote(""); setAttempt(value => value + 1); };
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
  const related = evidence.data ?? [];
  const effective = viewing ? effectiveEvidenceState(viewing, related) : undefined;
  const artifactLink = (id: string) => `/w/${encodeURIComponent(ws)}/evidence?evidence=${encodeURIComponent(id)}`;
  return <>
    <Dialog wide title={viewing?.title ?? initial.title} onClose={onClose} footer={viewing?.status === "pending-review" && canReview ? <>
      <button className="btn" disabled={review.isPending} onClick={() => { setError(undefined); setNote(""); setReasonAction("rejected"); }}><X size={13} /> Reject</button>
      <button className="btn btn--primary" disabled={review.isPending} onClick={() => decide("accepted")}><Check size={13} /> Accept</button>
    </> : undefined}>
      {error && !reasonAction && <div role="alert"><p>{error}</p><button className="btn btn--sm" disabled={review.isPending || downloading} onClick={reload}>Reload evidence</button></div>}
      {!viewing && !error && <p role="status">Loading evidence details…</p>}
      {viewing && <div className="evidence-lifecycle">
        <section className="evidence-lifecycle__section" aria-label="Evidence review and validity">
          <EvidenceReviewValidity evidence={viewing} />
          <p className="field__hint">{viewing.reviewedBy ? `Reviewed by ${viewing.reviewedBy}${viewing.reviewedAt ? ` · ${evidenceTime(viewing.reviewedAt)}` : ""}` : "No reviewer recorded"}</p>
          {!!effective?.reasons.length && <ul className="evidence-lineage__reasons">{effective.reasons.map(reason => <li key={reason}>{reason}</li>)}</ul>}
          {!!effective?.supersededByIds.length && <p>Superseded by {effective.supersededByIds.map(id => <Link key={id} to={artifactLink(id)}>{related.find(item => item.id === id)?.title ?? id} </Link>)}</p>}
        </section>
        <EvidenceCollectionDetails evidence={viewing} ws={ws} />
        <dl className="evidence-lifecycle__meta">
          <dt>Linked requirements</dt><dd><div className="evidence-lifecycle__links">{viewing.requirementIds.map(id => <CodeTag key={id} id={id} />)}{!viewing.requirementIds.length && "None"}</div></dd>
          <dt>Collected</dt><dd>{evidenceTime(viewing.collectedAt)}</dd>
          <dt>Valid until</dt><dd>{viewing.validUntil ? evidenceTime(viewing.validUntil) : "No expiry recorded"}</dd>
          <dt>Artifact SHA-256</dt><dd className="mono">{viewing.sha256 ?? "Not recorded"}</dd>
          {viewing.supersedesId && <><dt>Replaces</dt><dd><Link to={artifactLink(viewing.supersedesId)}>{related.find(item => item.id === viewing.supersedesId)?.title ?? viewing.supersedesId}</Link><p className="field__hint">The original artifact and its decisions remain in history.</p></dd></>}
        </dl>
        {!!viewing.requirementIds.length && <details><summary>Trace requirement lineage</summary><div className="evidence-lifecycle__links">{viewing.requirementIds.map(id => <Link key={id} to={`/w/${encodeURIComponent(ws)}/observatory/${encodeURIComponent(id.split(":")[0]!)}?select=${encodeURIComponent(id)}&detail=evidence`}>View lineage for {id.split(":").slice(1).join(":")}</Link>)}</div></details>}
        {viewing.artifact && <section className="panel evidence-lifecycle__section" aria-label="Evidence file">
          <p>{viewing.fileName} · {viewing.artifact.size.toLocaleString()} bytes · {viewing.artifact.mediaType}</p>
          <div><button className="btn" disabled={downloading} onClick={() => void download(viewing)}><Download size={14} /> {downloading ? "Verifying download…" : "Download file"}</button></div>
        </section>}
        {viewing.content && <pre className="panel mono evidence-lifecycle__body" aria-label="Evidence content">{viewing.content}</pre>}
        {viewing.data && <details><summary>Recorded artifact data</summary><pre className="panel mono evidence-lifecycle__body">{JSON.stringify(viewing.data, null, 2)}</pre></details>}
        <div className="evidence-lifecycle__actions">
          {canWrite && <button className="btn" disabled={review.isPending} onClick={() => setEditing(true)}>Edit assurance and links</button>}
          {canWrite && canUploadReplacement(viewing) && <button className="btn" disabled={review.isPending} onClick={() => setReplacing(true)}>Upload replacement</button>}
          {canReview && viewing.status !== "withdrawn" && <button className="btn" disabled={review.isPending} onClick={() => { setError(undefined); setNote(""); setReasonAction("withdrawn"); }}>Withdraw evidence</button>}
        </div>
        {!!viewing.reviewHistory?.length && <section className="evidence-lifecycle__section" aria-label="Review history">
          <h3>Review history</h3>
          {viewing.reviewHistory.map(entry => <div key={entry.id} className="panel evidence-lifecycle__section">
            <p>{entry.decision} by {entry.reviewedBy} · {evidenceTime(entry.reviewedAt)}{entry.legacy ? " · legacy decision; renewed review required" : ""}</p>
            {entry.scope && <>
              <div className="evidence-lifecycle__links">{entry.scope.requirementIds.map(id => <CodeTag key={id} id={id} />)}</div>
              <p className="field__hint">Collected {evidenceTime(entry.scope.collectedAt)} · {entry.scope.validUntil ? `valid through ${evidenceTime(entry.scope.validUntil)}` : "no expiry"}</p>
              <p className="field__hint">Assurance: {entry.scope.assurance ? `${ASSURANCE_LABELS[entry.scope.assurance.kind]} · ${entry.scope.assurance.scope || "scope not recorded"}` : "Not recorded"}</p>
              {entry.scope.assurance?.observationStart && <p className="field__hint">Observation: {evidenceTime(entry.scope.assurance.observationStart)} to {entry.scope.assurance.observationEnd ? evidenceTime(entry.scope.assurance.observationEnd) : "not recorded"}</p>}
              <p className="field__hint">Collection origin: {entry.scope.provenance?.origin ?? "not recorded"}{entry.scope.supersedesId ? ` · replaces ${entry.scope.supersedesId}` : ""}</p>
            </>}
            {entry.scope?.sha256 && <p className="mono muted">Artifact SHA-256: {entry.scope.sha256}</p>}
            {entry.note && <p>{entry.note}</p>}
          </div>)}
        </section>}
      </div>}
    </Dialog>
    {viewing && editing && canWrite && <EditEvidenceScope ws={ws} evidence={viewing} onClose={() => setEditing(false)} onSaved={next => { setViewing(next); setEditing(false); }} />}
    {viewing && replacing && canWrite && <UploadEvidence supersedes={viewing} onClose={() => setReplacing(false)} onUploaded={next => { setReplacing(false); onSelect(next); }} />}
    {viewing && reasonAction && canReview && <Dialog title={reasonAction === "rejected" ? "Reject evidence" : "Withdraw evidence"} onClose={() => { if (!review.isPending) { setReasonAction(undefined); setError(undefined); } }} footer={<>
      <button className="btn" disabled={review.isPending} onClick={() => { setReasonAction(undefined); setError(undefined); }}>Cancel</button>
      <button className="btn btn--primary" disabled={!note.trim() || review.isPending} onClick={() => decide(reasonAction)}>{reasonAction === "rejected" ? "Confirm rejection" : "Confirm withdrawal"}</button>
    </>}>
      <p>{reasonAction === "rejected" ? "Explain why this artifact is not accepted for its current scope." : "Explain why this artifact should no longer count as accepted evidence."} The reason stays in its review history.</p>
      <label className="field"><span className="label">{reasonAction === "rejected" ? "Rejection reason" : "Withdrawal reason"}</span><textarea className="textarea" value={note} maxLength={2_000} disabled={review.isPending} onChange={event => setNote(event.target.value)} /></label>
      {error && <div role="alert"><p>{error}</p><button className="btn btn--sm" disabled={review.isPending} onClick={reload}>Reload evidence</button></div>}
    </Dialog>}
  </>;
}
