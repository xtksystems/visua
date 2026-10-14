import { useState } from "react";
import { Link } from "react-router-dom";
import { useEvidenceLineage } from "../../lib/queries.ts";
import { StatusChip } from "../ui/index.tsx";
import { EvidenceReviewValidity } from "./EvidenceRenewal.tsx";
import { EvidenceCollectionDetails, evidenceTime } from "./EvidenceCollectionDetails.tsx";
import { ASSURANCE_LABELS, provenance } from "./evidence-labels.ts";
import "./evidence-lifecycle.css";

/** Two-dimensional requirement → artifact → collection/review lineage; no artifact body reads. */
export function EvidenceLineage({ ws, requirementId }: { ws: string; requirementId: string }) {
  const [at, setAt] = useState<string>();
  const [draftTime, setDraftTime] = useState("");
  const query = useEvidenceLineage(ws, requirementId, at);
  const data = query.data?.workspaceId === ws && query.data.requirementId === requirementId ? query.data : undefined;
  const artifactLink = (id: string) => `/w/${encodeURIComponent(ws)}/evidence?evidence=${encodeURIComponent(id)}`;
  return <section className="evidence-lineage" aria-label="Requirement evidence lineage" aria-busy={query.isPending}>
    <h3>Evidence lineage</h3>
    <p className="field__hint">Trace the artifacts linked to this requirement, their collection sources, assurance and reviews. A generated narrative or mapping alone does not prove observed operation.</p>
    <details>
      <summary>Evaluate a different time</summary>
      <form className="evidence-lineage__clock" onSubmit={event => { event.preventDefault(); const instant = new Date(`${draftTime}Z`); if (Number.isFinite(instant.getTime())) setAt(instant.toISOString()); }}>
        <label className="field"><span className="label">Evaluation time (UTC)</span><input className="input" type="datetime-local" value={draftTime} onChange={event => setDraftTime(event.target.value)} /></label>
        <div className="evidence-lifecycle__actions"><button className="btn btn--sm" disabled={!draftTime || query.isFetching}>Evaluate time</button><button className="btn btn--sm" type="button" onClick={() => { setAt(undefined); setDraftTime(""); }}>Use current time</button></div>
        <p className="field__hint">Evaluates the evidence metadata currently on file at the selected time. This does not reconstruct earlier edits or decisions.</p>
      </form>
    </details>
    {query.isPending && <p role="status">Loading evidence lineage…</p>}
    {query.error && <div role="alert"><p>Could not load evidence lineage. {query.error.message}</p><button className="btn btn--sm" disabled={query.isFetching} onClick={() => void query.refetch()}>Retry lineage</button></div>}
    {data && !query.error && <>
      <div className="evidence-lifecycle__section"><div className="evidence-lifecycle__links"><span>Requirement status</span><StatusChip status={data.status} /></div><ul className="evidence-lineage__reasons">{data.reasons.map(reason => <li key={reason}>{reason}</li>)}</ul></div>
      <p className="field__hint">Evaluated at <time dateTime={data.asOf}>{evidenceTime(data.asOf)}</time>{at ? " · selected time" : " · refreshes every minute"}</p>
      {!data.items.length && <p>No evidence is linked to this requirement.</p>}
      <ol className="evidence-lineage__list">{data.items.map(({ evidence, effective, unknowns }) => <li key={evidence.id} className="evidence-lineage__item" data-evidence-id={evidence.id}>
        <h3><Link to={artifactLink(evidence.id)}>{evidence.title}</Link></h3>
        <p className="evidence-lineage__source">{provenance(evidence).label} · {evidence.assurance ? `${ASSURANCE_LABELS[evidence.assurance.kind]} assurance` : "Assurance not recorded"}</p>
        <p className="field__hint">Scope: {evidence.assurance?.scope || "Not recorded"}</p>
        <EvidenceReviewValidity evidence={evidence} at={new Date(data.asOf)} />
        <p><strong>{!evidence.requirementIds.includes(requirementId) ? "Replacement-chain context; not linked to this requirement" : effective.status === "superseded" ? "Superseded" : effective.currentlyValid ? "Valid accepted artifact" : "No valid accepted coverage from this artifact"}</strong></p>
        <ul className="evidence-lineage__reasons">{effective.reasons.map(reason => <li key={reason}>{reason}</li>)}</ul>
        <p className="evidence-lineage__source">Reviewer: {evidence.reviewedBy ?? "Not recorded"}{evidence.reviewedAt ? ` · ${evidenceTime(evidence.reviewedAt)}` : ""}</p>
        {evidence.provenance?.check && <p className="evidence-lineage__source">Observed: {evidenceTime(evidence.provenance.check.observedAt)} · {evidence.provenance.check.connectorName} · {evidence.provenance.check.checkId}</p>}
        {evidence.provenance?.policy && <p className="evidence-lineage__source">Policy {evidence.provenance.policy.id} · version {evidence.provenance.policy.version}</p>}
        {evidence.provenance?.agent && <p className="evidence-lineage__source">Agent run {evidence.provenance.agent.runId} · proposal {evidence.provenance.agent.proposalId}</p>}
        {evidence.supersedesId && <div className="evidence-lineage__chain">Replaces <Link to={artifactLink(evidence.supersedesId)}>{data.items.find(item => item.evidence.id === evidence.supersedesId)?.evidence.title ?? evidence.supersedesId}</Link></div>}
        {!!effective.supersededByIds.length && <div className="evidence-lineage__chain">Valid replacement: {effective.supersededByIds.map(id => <Link key={id} to={artifactLink(id)}>{data.items.find(item => item.evidence.id === id)?.evidence.title ?? id} </Link>)}</div>}
        {!!unknowns.length && <ul className="evidence-lineage__reasons" aria-label="Unrecorded details">{unknowns.map(unknown => <li key={unknown}>{unknown}</li>)}</ul>}
        <details><summary>Collection and artifact identity</summary><div className="evidence-lifecycle"><EvidenceCollectionDetails evidence={evidence} ws={ws} /><p className="mono field__hint">Artifact {evidence.id}<br />SHA-256: {evidence.sha256 ?? "Not recorded"}</p><Link to={artifactLink(evidence.id)}>Inspect artifact and review history</Link></div></details>
      </li>)}</ol>
    </>}
  </section>;
}
