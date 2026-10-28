import { evidenceReviewScope } from "@visua/core";
import { useEffect, useRef, useState } from "react";
import { api } from "../../lib/api.ts";
import { useCan } from "../../lib/auth.ts";
import { useWsMutation } from "../../lib/queries.ts";
import type { Evidence } from "../../lib/types.ts";
import { Dialog, toast } from "../ui/index.tsx";
import { EvidenceAssuranceFields } from "./EvidenceAssuranceFields.tsx";
import { RequirementPicker } from "./RequirementPicker.tsx";
import { assuranceDraft, assuranceError } from "./evidence-labels.ts";

/** Draft from the inspected snapshot; refreshes never silently replace edits. */
export function EditEvidenceScope({ ws, evidence, onClose, onSaved }: { ws: string; evidence: Evidence; onClose: () => void; onSaved: (next: Evidence) => void }) {
  const canWrite = useCan("work.write");
  const [assurance, setAssurance] = useState(() => assuranceDraft(evidence));
  const [requirementIds, setRequirementIds] = useState(() => [...evidence.requirementIds]);
  const [error, setError] = useState<string>();
  const active = useRef(false);
  useEffect(() => { active.current = true; return () => { active.current = false; }; }, []);
  const save = useWsMutation(ws, () => api.patch<Evidence>(`/workspaces/${encodeURIComponent(ws)}/evidence/${encodeURIComponent(evidence.id)}`, { assurance, requirementIds, expectedScope: evidenceReviewScope(evidence) }), { onError: failure => { if (active.current) setError(failure.message); } });
  const invalid = assuranceError(assurance);
  const changed = JSON.stringify(assurance) !== JSON.stringify(assuranceDraft(evidence)) || JSON.stringify([...requirementIds].sort()) !== JSON.stringify([...evidence.requirementIds].sort());
  return <Dialog wide title="Edit assurance and links" onClose={() => { if (!save.isPending) onClose(); }} footer={<><button className="btn" disabled={save.isPending} onClick={onClose}>Cancel</button><button className="btn btn--primary" disabled={!canWrite || !changed || !!invalid || save.isPending} onClick={() => { setError(undefined); save.mutate(undefined, { onSuccess: next => { if (active.current) { toast("Scope updated; renewed review required"); onSaved(next); } } }); }}>Save for renewed review</button></>}>
    <div className="evidence-lifecycle">
      <p className="evidence-lifecycle__notice">Changing assurance or linked requirements returns this artifact to pending review. Previous decisions and the original collection references remain in its history.</p>
      <EvidenceAssuranceFields value={assurance} onChange={setAssurance} disabled={!canWrite || save.isPending} />
      <div><h3>Linked requirements</h3><RequirementPicker ws={ws} value={requirementIds} onChange={setRequirementIds} disabled={!canWrite || save.isPending} /></div>
      {invalid && <p className="field__hint">{invalid}</p>}
      {error && <p role="alert">{error}</p>}
    </div>
  </Dialog>;
}
