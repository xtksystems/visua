import { useEffect, useRef, useState } from "react";
import { Dialog, toast } from "../ui/index.tsx";
import { RequirementPicker } from "./RequirementPicker.tsx";
import { useWorkspaceId } from "../../lib/workspace.ts";
import { useCan } from "../../lib/auth.ts";
import { api } from "../../lib/api.ts";
import { useMeta, useWsMutation } from "../../lib/queries.ts";
import type { Evidence } from "../../lib/types.ts";

export function UploadEvidence({ onClose, onUploaded }: { onClose: () => void; onUploaded: (item: Evidence) => void }) {
  const ws = useWorkspaceId();
  const canWrite = useCan("work.write");
  const meta = useMeta();
  const maxBytes = meta.data?.evidenceUpload?.maxBytes;
  const [file, setFile] = useState<File>();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [kind, setKind] = useState<Evidence["kind"]>("document");
  const [requirementIds, setRequirementIds] = useState<string[]>([]);
  const [collectedAt, setCollectedAt] = useState(new Date().toISOString().slice(0, 10));
  const [validUntil, setValidUntil] = useState("");
  const [error, setError] = useState<string>();
  const active = useRef(false);
  const writing = useRef(false);
  useEffect(() => { active.current = true; return () => { active.current = false; }; }, []);
  const upload = useWsMutation(ws, async () => {
    if (!file) throw new Error("Choose a file to upload.");
    const form = new FormData();
    form.set("file", file);
    form.set("metadata", JSON.stringify({ title: title.trim(), description: description.trim() || undefined, kind, requirementIds, collectedAt, validUntil: validUntil || undefined }));
    return api.upload<Evidence>(`/workspaces/${encodeURIComponent(ws)}/evidence/files`, form);
  }, { onError: failure => { if (active.current) setError(failure.message); } });
  const blocked = upload.isPending || !canWrite;
  const fileError = file && (!file.size ? "Choose a file with content." : maxBytes && file.size > maxBytes ? "Files must be 10 MiB or smaller." : undefined);
  const submit = () => {
    if (blocked || writing.current || !file || !title.trim() || !requirementIds.length || !collectedAt || !maxBytes || fileError) return;
    writing.current = true;
    setError(undefined);
    upload.mutate(undefined, { onSuccess: item => { if (active.current) { toast("Evidence uploaded for review"); onUploaded(item); } }, onSettled: () => { writing.current = false; } });
  };
  return <Dialog wide title="Upload evidence" onClose={() => { if (!upload.isPending) onClose(); }} footer={<><button className="btn" disabled={upload.isPending} onClick={onClose}>Cancel</button><button className="btn btn--primary" disabled={blocked || !file || !title.trim() || !requirementIds.length || !collectedAt || !maxBytes || !!fileError} onClick={submit}>{upload.isPending ? "Uploading…" : "Upload for review"}</button></>}>
    <fieldset disabled={blocked} className="stack" style={{ border: 0, padding: 0, margin: 0, gap: 12 }}>
      <label className="field"><span className="label">Evidence file</span><input className="input" aria-label="Evidence file" type="file" onChange={event => { const next = event.target.files?.[0]; setFile(next); if (!title.trim() && next) setTitle(next.name); setError(undefined); }} /><span className="field__hint">Upload an artifact that shows what is in place. Maximum file size: 10 MiB.</span></label>
      <label className="field"><span className="label">Evidence title</span><input className="input" aria-label="Evidence title" value={title} maxLength={300} onChange={event => setTitle(event.target.value)} /></label>
      <label className="field"><span className="label">Description</span><textarea className="textarea" aria-label="Evidence description" value={description} maxLength={10_000} onChange={event => setDescription(event.target.value)} /></label>
      <label className="field"><span className="label">Kind</span><select className="select" aria-label="Evidence kind" value={kind} onChange={event => setKind(event.target.value as Evidence["kind"])}>{["document", "screenshot", "configuration", "log", "attestation", "policy", "report"].map(value => <option key={value} value={value}>{value}</option>)}</select></label>
      <div className="grid grid--2"><label className="field"><span className="label">Collection date</span><input className="input" aria-label="Collection date" type="date" value={collectedAt} onChange={event => setCollectedAt(event.target.value)} /></label><label className="field"><span className="label">Valid until</span><input className="input" aria-label="Valid until" type="date" value={validUntil} min={collectedAt} onChange={event => setValidUntil(event.target.value)} /><span className="field__hint">Leave blank if the artifact has no expiry.</span></label></div>
      <div><div className="eyebrow">Linked requirements</div><RequirementPicker ws={ws} value={requirementIds} onChange={setRequirementIds} disabled={blocked} /></div>
    </fieldset>
    {fileError && <p role="alert">{fileError}</p>}
    {error && <p role="alert">{error}</p>}
    {upload.isPending && <p className="muted" role="status">Uploading and verifying the file…</p>}
  </Dialog>;
}
