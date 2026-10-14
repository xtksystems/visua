import { useState } from "react";
import { CodeTag } from "../ui/index.tsx";
import { useSearch, useWorkspace } from "../../lib/queries.ts";
import { isThreatCatalog } from "../../lib/frameworks.ts";

/** Select published, assessable requirements from this workspace's enabled frameworks. */
export function RequirementPicker({ ws, value, onChange, disabled = false }: { ws: string; value: string[]; onChange: (ids: string[]) => void; disabled?: boolean }) {
  const [text, setText] = useState("");
  const workspace = useWorkspace(ws);
  const search = useSearch(text);
  const enabled = new Set(workspace.data?.workspace.frameworks.filter(f => f.enabled).map(f => f.frameworkId));
  const results = text.trim().length >= 2 && !search.isPlaceholderData ? (search.data?.nodes ?? []).filter(n => n.assessable && enabled.has(n.framework) && !isThreatCatalog(n.framework)) : [];
  return <div className="stack" style={{ gap: 8 }}>
    <div className="row row--wrap" style={{ gap: 8 }}>
      {value.map(id => <span key={id} className="row" style={{ gap: 4 }}><CodeTag id={id} /><button className="btn btn--quiet btn--sm" type="button" disabled={disabled} aria-label={`Remove ${id.split(":").slice(1).join(":")} requirement`} onClick={() => onChange(value.filter(item => item !== id))}>Remove</button></span>)}
    </div>
    <label className="field"><span className="label">Search requirements to link</span><input className="input" aria-label="Search requirements to link" type="search" value={text} disabled={disabled} onChange={event => setText(event.target.value)} placeholder="Search a code or title…" /></label>
    {workspace.error && <div role="alert"><p>Could not load enabled frameworks.</p><button className="btn btn--sm" type="button" onClick={() => void workspace.refetch()}>Retry frameworks</button></div>}
    {text.trim().length >= 2 && <div className="stack" style={{ gap: 6 }}>
      {search.isFetching && <p className="muted" role="status">Searching requirements…</p>}
      {search.error && <div role="alert"><p>Could not search requirements.</p><button className="btn btn--sm" type="button" onClick={() => void search.refetch()}>Retry search</button></div>}
      {results.map(node => <div className="row" key={node.id} style={{ gap: 8 }}><span className="mono">{node.code}</span><span className="muted" style={{ flex: 1 }}>{node.title}</span><button className="btn btn--sm" type="button" aria-label={`Add ${node.code} requirement`} disabled={disabled || value.includes(node.id)} onClick={() => onChange([...value, node.id])}>{value.includes(node.id) ? "Linked" : "Add"}</button></div>)}
      {!search.error && !search.isFetching && !search.isPlaceholderData && !results.length && <p className="muted">No assessable requirements match in enabled frameworks.</p>}
    </div>}
  </div>;
}
