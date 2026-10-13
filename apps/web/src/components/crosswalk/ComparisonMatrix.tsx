import { useQuery } from "@tanstack/react-query";
import { useEffect, useLayoutEffect, useRef } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api, corpusFileUrl } from "../../lib/api.ts";
import { changeComparison, comparisonQuery, type ComparisonEndpoint, type CrosswalkComparison } from "../../lib/crosswalk-comparison.ts";
import { useWorkspaceId } from "../../lib/workspace.ts";
import "./comparison.css";

function RequirementLink({ endpoint, ws }: { endpoint: ComparisonEndpoint; ws: string }) {
  return endpoint.resolved ? <Link className="mono" to={`/w/${encodeURIComponent(ws)}/observatory/${encodeURIComponent(endpoint.framework)}?select=${encodeURIComponent(endpoint.id)}`} title={endpoint.title}>{endpoint.id}</Link>
    : <span className="mono">{endpoint.id} (unresolved)</span>;
}

export function ComparisonMatrix() {
  const ws = useWorkspaceId();
  const [params, setParams] = useSearchParams();
  const query = comparisonQuery(params);
  const pendingFocus = useRef<{ key: string; query: string } | null>(null);
  // A new query temporarily removes result controls. Restore the initiating
  // control only if the user has not moved focus elsewhere while it loads.
  useEffect(() => {
    const moved = (event: FocusEvent) => {
      if (event.target !== document.body) pendingFocus.current = null;
    };
    document.addEventListener("focusin", moved);
    return () => document.removeEventListener("focusin", moved);
  }, []);
  const result = useQuery({
    queryKey: ["ws", ws, "evidence", "crosswalk-comparison", query],
    queryFn: ({ signal }) => api.get<CrosswalkComparison>(`/workspaces/${encodeURIComponent(ws)}/crosswalk/comparison?${query}`, signal),
    enabled: !!ws,
    staleTime: 0,
    refetchInterval: 30_000,
  });
  const data = result.data;
  useEffect(() => {
    if (!data || result.isError || data.workspaceId !== ws) return;
    if (!params.has("source") || !params.has("target")) {
      const next = new URLSearchParams(params);
      next.set("source", data.source); next.set("target", data.target);
      setParams(next, { replace: true });
    }
  }, [data, params, result.isError, setParams, ws]);
  useLayoutEffect(() => {
    const pending = pendingFocus.current;
    if (!pending || pending.query !== query || (!data && !result.isError)) return;
    pendingFocus.current = null;
    if (document.activeElement !== document.body) return;
    const target = Array.from(document.querySelectorAll<HTMLElement>("[data-comparison-focus]")).find(element => element.dataset.comparisonFocus === pending.key);
    const fallback = document.querySelector<HTMLElement>("[data-comparison-focus='retry'], [data-comparison-focus='source']");
    (target && !target.matches(":disabled") ? target : fallback)?.focus({ preventScroll: true });
  }, [data, query, result.isError]);
  const change = (values: Record<string, string | null>) => {
    const next = changeComparison(new URLSearchParams(window.location.search), values);
    const active = document.activeElement as HTMLElement | null;
    const key = active?.dataset.comparisonFocus;
    pendingFocus.current = key ? { key, query: comparisonQuery(next) } : null;
    setParams(next);
  };
  // Even a background failure hides cached detail rows. An old pair/workspace is never displayed.
  if (result.isError) return <main className="page comparison" data-testid="crosswalk-matrix"><h1>Crosswalk matrix</h1><div role="alert"><p>Could not load comparison: {result.error.message}</p><button className="btn" data-comparison-focus="retry" onClick={() => void result.refetch()}>Retry</button></div><button className="btn" onClick={() => setParams({ view: "matrix" })}>Reset comparison</button><button className="btn" onClick={() => change({ view: null })}>Nexus</button></main>;
  if (!data || data.workspaceId !== ws) return <main className="page comparison" data-testid="crosswalk-matrix"><h1>Crosswalk matrix</h1><p role="status">Loading comparison…</p></main>;
  const name = (id: string) => data.frameworks.find(f => f.id === id)?.shortName ?? id;
  const sourceGroup = data.sourceGroups.find(g => g.id === data.sourceGroup);
  const targetGroup = data.targetGroups.find(g => g.id === data.targetGroup);
  const selectedScope = sourceGroup || targetGroup ? `${sourceGroup?.code ?? "All source groups"} → ${targetGroup?.code ?? "All target groups"}` : "All groups in this pair";
  const cellCounts = new Map(data.cells.map(c => [JSON.stringify([c.sourceGroup, c.targetGroup]), c.count]));
  const evidence = data.selectedEvidence;
  const review = evidence?.status === "accepted" ? (evidence.acceptanceBound ? "Accepted for the current artifact and links" : "Renewed review required") : evidence?.status === "pending-review" ? "Pending review" : evidence?.status === "rejected" ? "Rejected" : evidence?.status === "withdrawn" ? "Withdrawn" : "Marked expired";
  return <main className="page comparison" data-testid="crosswalk-matrix">
    <header className="comparison__head">
      <div><div className="eyebrow">Crosswalk</div><h1>Compare requirement mappings</h1><p className="muted">Trace published relationships between frameworks and inspect the evidence linked directly to requirements.</p></div>
      <div className="row" role="group" aria-label="Crosswalk view"><button className="btn" aria-pressed={false} onClick={() => change({ view: null })}>Nexus</button><button className="btn" aria-pressed={true}>Matrix</button></div>
    </header>
    <div className="comparison__controls">
      <label>Source framework<select className="select" data-comparison-focus="source" aria-label="Source framework" value={data.source} onChange={event => change(event.target.value === data.target ? { source: data.target, target: data.source } : { source: event.target.value })}>{data.frameworks.map(f => <option key={f.id} value={f.id}>{f.shortName}</option>)}</select></label>
      <button className="btn" data-comparison-focus="reverse" onClick={() => change({ source: data.target, target: data.source })}>Reverse frameworks</button>
      <label>Target framework<select className="select" data-comparison-focus="target" aria-label="Target framework" value={data.target} onChange={event => change(event.target.value === data.source ? { source: data.target, target: data.source } : { target: event.target.value })}>{data.frameworks.map(f => <option key={f.id} value={f.id}>{f.shortName}</option>)}</select></label>
    </div>
    <p className="comparison__notice" role="note">Counts represent mapping records, never readiness or proof. A mapped relationship does not establish implementation or transfer evidence to another requirement.</p>
    <div className="comparison__summary"><strong>{data.pairTotal.toLocaleString()} mapping records</strong><span>{data.sets.length} mapping sets</span><span>{name(data.source)} → {name(data.target)}</span></div>
    <details className="comparison__sources"><summary>Mapping sources ({data.sets.length})</summary><ul>{data.sets.map(set => <li key={set.id}><strong>{set.title}</strong> · {set.count.toLocaleString()} records<div>{name(set.source)} → {name(set.target)}</div><div>Authority: {set.authority} · Publication: {set.status ?? "not recorded"}</div></li>)}</ul>{!data.sets.length && <p>No mapping sets connect this pair.</p>}</details>
    {data.ungroupedTotal > 0 && <p role="note">{data.ungroupedTotal} records have an ungrouped endpoint, including {data.unresolvedTotal} with unresolved IDs. They remain in totals and the Unresolved row or column.</p>}
    <div className="comparison__workspace">
      <section className="comparison__matrix-panel" aria-label="Mapping matrix">
        <div className="comparison__selection"><strong>Selected: {selectedScope}</strong><span>{data.filteredTotal.toLocaleString()} mapping records</span><a href="#comparison-details">View selected mappings</a></div>
        {data.pairTotal === 0 && <p role="status">No requirement mappings are recorded for this pair. Both frameworks remain available for comparison.</p>}
        <div className="comparison__scroll" tabIndex={0} role="region" aria-label="Scrollable mapping matrix">
          <table className="comparison__table" aria-label="Requirement mapping comparison">
            <caption>{name(data.source)} groups (rows) by {name(data.target)} groups (columns). Select a group heading or cell to inspect mapping records.</caption>
            <thead><tr><th scope="col">{name(data.source)} / {name(data.target)}</th>{data.targetGroups.map(g => <th key={g.id} scope="col"><button className="comparison__group" data-comparison-focus={`target:${g.id}`} aria-pressed={!data.sourceGroup && data.targetGroup === g.id} onClick={() => change({ sourceGroup: null, targetGroup: g.id })}><span className="mono">{g.code}</span><span>{g.title}</span><span className="muted">{g.total} mappings</span></button></th>)}</tr></thead>
            <tbody>{data.sourceGroups.map(row => <tr key={row.id}><th scope="row"><button className="comparison__group" data-comparison-focus={`source:${row.id}`} aria-pressed={data.sourceGroup === row.id && !data.targetGroup} onClick={() => change({ sourceGroup: row.id, targetGroup: null })}><span className="mono">{row.code}</span><span>{row.title}</span><span className="muted">{row.total} mappings</span></button></th>{data.targetGroups.map(col => {
              const count = cellCounts.get(JSON.stringify([row.id, col.id])) ?? 0;
              return <td key={col.id}><button className={`comparison__cell${count ? " comparison__cell--mapped" : ""}`} data-comparison-focus={`cell:${row.id}:${col.id}`} aria-label={`${row.code} to ${col.code}: ${count} mappings`} aria-pressed={data.sourceGroup === row.id && data.targetGroup === col.id} onClick={() => change({ sourceGroup: row.id, targetGroup: col.id })}>{count}</button></td>;
            })}</tr>)}</tbody>
          </table>
        </div>
      </section>
      <section id="comparison-details" className="comparison__details" aria-label="Selected mappings">
        <header><h2>Selected mappings</h2><p><strong>{selectedScope}</strong> · {data.filteredTotal.toLocaleString()} records of {data.pairTotal.toLocaleString()} in this pair</p>{(sourceGroup || targetGroup) && <button className="btn btn--sm" data-comparison-focus="clear" onClick={() => change({ sourceGroup: null, targetGroup: null })}>Show all mappings</button>}</header>
        <p className="muted">Each row keeps the original published direction, including when the matrix axes are reversed. Duplicate records retain separate identities.</p>
        {!data.rows.length && <p>No mapping records in this selection.</p>}
        <ol className="comparison__rows" start={(data.page - 1) * data.pageSize + 1}>{data.rows.map(row => <li key={row.id} data-mapping-id={row.id}>
          <div className="comparison__relationship"><RequirementLink endpoint={row.source} ws={ws} /><span>→ <strong>{row.relationship}</strong>{row.label && row.label !== row.relationship ? ` (${row.label})` : ""} →</span><RequirementLink endpoint={row.target} ws={ws} /></div>
          <div>{row.setTitle} · record {row.recordIndex + 1}</div>
          <div className="muted">Authority: {row.origin.authority}{row.setAuthority !== row.origin.authority ? ` · Set authority: ${row.setAuthority}` : ""}</div>
          <div>Publication: {row.status ?? "not recorded"}{row.strength ? ` · ${row.strength}` : ""}</div>
          <div className="muted">Source: {row.origin.path ? <a href={corpusFileUrl(row.origin.path, row.origin.page)} target="_blank" rel="noreferrer">{row.origin.documentTitle}</a> : row.origin.documentTitle}{row.origin.locator ? ` · ${row.origin.locator}` : ""}{row.origin.page ? ` · p. ${row.origin.page}` : ""}</div>
          {row.note && <p>{row.note}</p>}
        </li>)}</ol>
        <nav className="comparison__pagination" aria-label="Mapping pages"><button className="btn btn--sm" data-comparison-focus="previous" disabled={data.page <= 1} onClick={() => change({ page: String(data.page - 1) })}>Previous page</button><span>Page {data.page} of {data.pages} · {data.filteredTotal ? (data.page - 1) * data.pageSize + 1 : 0}–{Math.min(data.page * data.pageSize, data.filteredTotal)} of {data.filteredTotal}</span><button className="btn btn--sm" data-comparison-focus="next" disabled={data.page >= data.pages} onClick={() => change({ page: String(data.page + 1) })}>Next page</button></nav>
      </section>
    </div>
    <section className="comparison__evidence" aria-label="Direct evidence links"><h2>Inspect direct evidence links</h2><label>Evidence artifact<select className="select" data-comparison-focus="evidence" aria-label="Evidence artifact" value={evidence?.id ?? ""} onChange={event => change({ evidence: event.target.value || null })}><option value="">Select an artifact</option>{data.evidence.map(e => <option key={e.id} value={e.id}>{e.title}</option>)}</select></label>
      <p className="muted">Only recorded direct links appear here. A direct group link is context, not proof for its children. Accepted, valid artifact status does not establish that every mapped requirement is covered.</p>
      {evidence && <div data-testid="crosswalk-evidence-detail"><h3>{evidence.title}</h3><p>Review: {review}</p><p>Validity: {evidence.validity === "current" ? "Within recorded window" : evidence.validity === "not-yet-valid" ? "Collection is in the future" : evidence.validity === "invalid" ? "Invalid recorded window" : evidence.validity === "expired" ? "Expired" : evidence.validity}{evidence.expiresAt ? ` · ends ${evidence.expiresAt}` : evidence.validity !== "invalid" ? " · no recorded expiry" : ""}</p><p>{evidence.currentlyValid ? "Artifact has valid, bound acceptance for its recorded direct links." : "Artifact does not currently contribute valid accepted evidence."}</p><Link className="btn btn--sm" to={`/w/${encodeURIComponent(ws)}/evidence?evidence=${encodeURIComponent(evidence.id)}`}>Inspect evidence</Link>
        {!evidence.links.length && <p>No requirements directly linked.</p>}<ul className="comparison__direct-links">{evidence.links.map(link => <li key={link.id}><RequirementLink endpoint={link} ws={ws} /><span>{link.frameworkLabel} · {link.kind === "group" ? "Direct group link · no child proof" : link.kind === "unresolved" ? "Unresolved direct link" : "Direct requirement link"}</span></li>)}</ul>
      </div>}
    </section>
  </main>;
}
