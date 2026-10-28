import type { Evidence } from "@visua/core";
import { Link } from "react-router-dom";
import { CodeTag } from "../ui/index.tsx";
import { ASSURANCE_LABELS, provenance } from "./evidence-labels.ts";
import "./evidence-lifecycle.css";

export const evidenceTime = (value: string) => value.replace("T", " ").replace(/Z$/, " UTC");

export function EvidenceCollectionDetails({ evidence, ws }: { evidence: Evidence; ws: string }) {
  const origin = evidence.provenance;
  const assurance = evidence.assurance;
  return <section className="evidence-lifecycle__section" aria-label="Collection and assurance">
    <h3>Collection and assurance</h3>
    <dl className="evidence-lifecycle__meta">
      <dt>Collection origin</dt><dd>{provenance(evidence).label}</dd>
      <dt>Recorded by</dt><dd>{origin ? <>{origin.recordedBy} · <time dateTime={origin.recordedAt}>{evidenceTime(origin.recordedAt)}</time></> : "Not recorded"}</dd>
      <dt>Original requirements</dt><dd>{origin ? origin.originalRequirementIds.length ? <div className="evidence-lifecycle__links">{origin.originalRequirementIds.map(id => <CodeTag key={id} id={id} />)}</div> : "None recorded at collection" : "Not recorded; current links do not establish origin"}</dd>
      <dt>Assurance</dt><dd>{assurance ? ASSURANCE_LABELS[assurance.kind] : "Unspecified · not recorded"}</dd>
      <dt>Scope</dt><dd>{assurance?.scope || "Not recorded"}</dd>
      <dt>Observation period</dt><dd>{assurance?.observationStart && assurance.observationEnd ? <>{evidenceTime(assurance.observationStart)} to {evidenceTime(assurance.observationEnd)}</> : "Not recorded"}</dd>
      {origin?.check && <>
        <dt>Source observation</dt><dd><Link to={`/w/${encodeURIComponent(ws)}/evidence?check=${encodeURIComponent(origin.check.resultId)}`}>Inspect recorded check</Link> · {origin.check.connectorName} ({origin.check.connectorKind}) · {origin.check.checkId}<br /><time dateTime={origin.check.observedAt}>{evidenceTime(origin.check.observedAt)}</time></dd>
        <dt>Source identity</dt><dd className="mono">Connector {origin.check.connectorId}<br />Result {origin.check.resultId}<br />Configuration SHA-256: {origin.check.sourceConfigHash ?? "Not recorded"}</dd>
      </>}
      {origin?.agent && <><dt>Agent source</dt><dd><Link to={`/w/${encodeURIComponent(ws)}/agents/${encodeURIComponent(origin.agent.runId)}`}>Inspect agent run</Link><br />Run {origin.agent.runId}<br />Proposal {origin.agent.proposalId}</dd></>}
      {origin?.policy && <>
        <dt>Policy version</dt><dd>{origin.policy.id} · version {origin.policy.version}</dd>
        <dt>Policy SHA-256</dt><dd className="mono">{origin.policy.sha256}</dd>
        <dt>Policy approval</dt><dd>{origin.policy.approvedBy ?? "Reviewer not recorded"}{origin.policy.approvedAt && <> · {evidenceTime(origin.policy.approvedAt)}</>}</dd>
      </>}
    </dl>
    <p className="field__hint">{provenance(evidence).title}</p>
    {assurance?.kind === "attestation" && <p className="field__hint">This is an uploaded or recorded assertion. Identity and the asserted activity have not been independently verified by Visua.</p>}
    <p className="field__hint">Acceptance records a review of this artifact and scope. It does not certify audit sufficiency.</p>
  </section>;
}
