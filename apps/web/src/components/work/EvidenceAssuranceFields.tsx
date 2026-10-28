import type { EvidenceAssurance } from "@visua/core";
import { ASSURANCE_LABELS } from "./evidence-labels.ts";
import "./evidence-lifecycle.css";

export function EvidenceAssuranceFields({ value, onChange, disabled = false }: { value: EvidenceAssurance; onChange: (value: EvidenceAssurance) => void; disabled?: boolean }) {
  return <fieldset className="evidence-assurance-fields" disabled={disabled}>
    <legend>Assurance</legend>
    <label className="field"><span className="label">Assurance type</span><select className="select" aria-label="Assurance type" value={value.kind} onChange={event => onChange({ ...value, kind: event.target.value as EvidenceAssurance["kind"] })}>{Object.entries(ASSURANCE_LABELS).map(([kind, label]) => <option key={kind} value={kind}>{label}</option>)}</select></label>
    <p className="field__hint">Design describes what should be in place. Operating evidence records what happened. Attestation is a person's assertion, without independent identity verification. Unspecified makes no assurance claim.</p>
    <label className="field"><span className="label">Assurance scope</span><textarea className="textarea" aria-label="Assurance scope" value={value.scope} maxLength={2_000} onChange={event => onChange({ ...value, scope: event.target.value })} placeholder="Name the system, activity and limits this artifact covers." /></label>
    <div className="evidence-assurance-fields__dates">
      <label className="field"><span className="label">Observation start (UTC)</span><input className="input" type="date" value={value.observationStart?.slice(0, 10) ?? ""} onChange={event => onChange({ ...value, observationStart: event.target.value || undefined })} /></label>
      <label className="field"><span className="label">Observation end (UTC)</span><input className="input" type="date" min={value.observationStart?.slice(0, 10)} value={value.observationEnd?.slice(0, 10) ?? ""} onChange={event => onChange({ ...value, observationEnd: event.target.value || undefined })} /></label>
    </div>
    <p className="field__hint">An optional observation period describes when the underlying activity happened. It is separate from the artifact's validity window.</p>
  </fieldset>;
}
