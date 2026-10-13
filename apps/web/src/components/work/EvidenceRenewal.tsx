import { useQuery } from "@tanstack/react-query";
import { useId, useState } from "react";
import {
  evidenceRenewalDates,
  hasCurrentEvidenceReview,
  type Evidence,
  type EvidenceRenewalBucket,
  type EvidenceRenewalDates,
  type EvidenceRenewalItem,
  type WorkspaceEvidenceRenewal,
} from "@visua/core";
import { api } from "../../lib/api.ts";
import { CodeTag, Empty, TabPanel, Tabs } from "../ui/index.tsx";
import "./evidence-renewal.css";

export type RenewalWindow = "expired" | "7d" | "30d";
const WINDOWS: { id: RenewalWindow; label: string; bucket: EvidenceRenewalBucket; empty: string }[] = [
  { id: "expired", label: "Expired", bucket: "expired", empty: "No expired evidence." },
  { id: "7d", label: "Next 7 days", bucket: "next7days", empty: "No evidence expires in the next 7 days." },
  { id: "30d", label: "Next 30 days", bucket: "next30days", empty: "No evidence expires in the next 30 days." },
];

/** Preserve the canonical instant, including the inclusive end of a calendar date. */
function utc(value: string): string { return value.replace("T", " ").replace(/Z$/, " UTC"); }
function reviewLabel(status: Evidence["status"], bound: boolean): string {
  if (status === "pending-review") return "Pending review";
  if (status === "rejected") return "Rejected";
  if (status === "expired") return "Marked expired; no current acceptance";
  return bound ? "Accepted" : "Renewed review required";
}
function validityLabel(dates: Pick<EvidenceRenewalDates, "validity" | "startsAt" | "expiresAt">): string {
  if (dates.validity === "invalid") return "Invalid recorded window";
  if (dates.validity === "expired") return "Expired";
  if (dates.validity === "not-yet-valid") return `Collection starts ${utc(dates.startsAt!)}`;
  return dates.expiresAt ? "Within recorded window" : "no expiry";
}

/** Ledger presentation shares domain date rules but never changes the review snapshot. */
export function EvidenceReviewValidity({ evidence }: { evidence: Evidence }) {
  const dates = evidenceRenewalDates(evidence, new Date());
  return <div className="evidence-review-validity">
    <span>Review: {reviewLabel(evidence.status, hasCurrentEvidenceReview(evidence))}</span>
    <span className={dates.validity === "expired" ? "evidence-renewal__validity--expired" : undefined}>Validity: {validityLabel(dates)}</span>
    {dates.expiresAt && <time dateTime={dates.expiresAt}>{dates.validity === "expired" ? "Ended" : "Ends"} {utc(dates.expiresAt)}</time>}
  </div>;
}

function RequirementLinks({ ids }: { ids: string[] }) {
  return <div className="evidence-renewal__links">{ids.map(id => <CodeTag key={id} id={id} />)}</div>;
}

function RenewalItem({ item, data, onInspect }: { item: EvidenceRenewalItem; data: WorkspaceEvidenceRenewal; onInspect: (id: string) => void }) {
  const expired = item.validity === "expired";
  const coverage = new Map(data.coverage.map(entry => [entry.requirementId, entry]));
  const otherCovered = item.currentlyCoveredRequirementIds;
  const context = item.requirements.filter(ref => !ref.assessable || !ref.inScope);
  return <li className="evidence-renewal__item" data-evidence-id={item.id}>
    <div className="evidence-renewal__head">
      <div><h3>{item.title}</h3><span className="muted">{item.kind} · {item.source}</span></div>
      <button type="button" className="btn btn--sm" onClick={() => onInspect(item.id)} aria-label={`Inspect evidence: ${item.title}`}>Inspect evidence</button>
    </div>
    <dl className="evidence-renewal__meta">
      <div><dt>Review:</dt><dd className={item.status === "pending-review" ? "evidence-renewal__review--pending" : undefined}>{reviewLabel(item.status, item.acceptanceBound)}</dd></div>
      <div><dt>Validity:</dt><dd className={expired ? "evidence-renewal__validity--expired" : "evidence-renewal__validity--upcoming"}>{validityLabel(item)}</dd></div>
      {item.expiresAt && <div><dt>{expired ? "Expired at:" : "Expires at:"}</dt><dd><time dateTime={item.expiresAt}>{utc(item.expiresAt)}</time></dd></div>}
    </dl>
    <div className="evidence-renewal__impact">
      {!!item.currentlyUncoveredRequirementIds.length && <div>
        <p><strong>{item.currentlyUncoveredRequirementIds.length} linked {item.currentlyUncoveredRequirementIds.length === 1 ? "requirement currently lacks" : "requirements currently lack"} valid accepted evidence.</strong></p>
        <RequirementLinks ids={item.currentlyUncoveredRequirementIds} />
      </div>}
      {expired && !!otherCovered.length && <div>
        <p>{otherCovered.length} linked {otherCovered.length === 1 ? "requirement has" : "requirements have"} other valid accepted evidence now.</p>
        <RequirementLinks ids={otherCovered} />
      </div>}
      {!expired && !!item.losingCoverageRequirementIds.length && <div>
        <p><strong>{item.losingCoverageRequirementIds.length} linked {item.losingCoverageRequirementIds.length === 1 ? "requirement would lose" : "requirements would lose"} uninterrupted coverage after this expiry.</strong></p>
        <ul className="evidence-renewal__coverage">{item.losingCoverageRequirementIds.map(id => <li key={id}>
          <CodeTag id={id} />{coverage.get(id)?.losesCoverageAt && <>First gap: <time dateTime={coverage.get(id)!.losesCoverageAt}>{utc(coverage.get(id)!.losesCoverageAt!)}</time></>}
        </li>)}</ul>
      </div>}
      {!expired && !!item.continuingCoverageRequirementIds.length && <div>
        <p>{item.continuingCoverageRequirementIds.length} linked {item.continuingCoverageRequirementIds.length === 1 ? "requirement has" : "requirements have"} accepted alternatives that continue coverage beyond this expiry.</p>
        <ul className="evidence-renewal__coverage">{item.continuingCoverageRequirementIds.map(id => {
          const entry = coverage.get(id);
          return <li key={id}><CodeTag id={id} />{entry?.coveredThrough ? <>Coverage continues through <time dateTime={entry.coveredThrough}>{utc(entry.coveredThrough)}</time>.</> : "No known coverage deadline in the evidence on file."}</li>;
        })}</ul>
      </div>}
      {!expired && !item.losingCoverageRequirementIds.length && !item.continuingCoverageRequirementIds.length && !!otherCovered.length && <div>
        <p>{otherCovered.length} linked {otherCovered.length === 1 ? "requirement has" : "requirements have"} valid accepted evidence now. This item does not end their first uninterrupted coverage period.</p>
        <RequirementLinks ids={otherCovered} />
      </div>}
      {!item.currentlyValid && <p className="muted">This item contributes no valid evidence coverage now.</p>}
      {!item.requirements.length && !item.context.unknown && <p className="muted">Workspace evidence · no requirements linked.</p>}
      {!!context.length && <div>
        <p className="muted">Context only: {item.context.groups} group links · {item.context.outOfScope} links outside the current assessed scope. These links do not count toward impact.</p>
        <RequirementLinks ids={context.map(ref => ref.id)} />
      </div>}
      {!!item.context.unknown && <p className="muted">{item.context.unknown} unrecognized requirement {item.context.unknown === 1 ? "link is" : "links are"} excluded from impact.</p>}
    </div>
  </li>;
}

function Unclassified({ data, onInspect }: { data: WorkspaceEvidenceRenewal; onInspect: (id: string) => void }) {
  const groups = [
    { ids: data.unclassified.invalidWindowIds, label: "an invalid recorded window" },
    { ids: data.unclassified.noExpiryIds, label: "no expiry" },
    { ids: data.unclassified.markedExpiredWithoutDeadlineIds, label: "an expired status without a recorded deadline" },
  ].filter(group => group.ids.length);
  const items = new Map(data.items.map(item => [item.id, item]));
  if (!groups.length) return null;
  return <aside className="evidence-renewal__notice" aria-label="Evidence outside date windows">
    <p>Some evidence has no usable renewal deadline. It remains available in the ledger.</p>
    {groups.map(group => <details key={group.label}>
      <summary>{group.ids.length} {group.ids.length === 1 ? "item has" : "items have"} {group.label}</summary>
      <ul>{group.ids.map(id => <li key={id}><button type="button" className="btn btn--quiet btn--sm" onClick={() => onInspect(id)}>Inspect {items.get(id)?.title ?? "evidence"}</button></li>)}</ul>
    </details>)}
  </aside>;
}

export function EvidenceRenewal({ ws, window, onWindowChange, onInspect }: { ws: string; window: RenewalWindow; onWindowChange: (window: RenewalWindow) => void; onInspect: (id: string) => void }) {
  const tabsId = useId();
  const [visible, setVisible] = useState(12);
  const query = useQuery({
    queryKey: ["ws", ws, "evidence-renewal"],
    queryFn: ({ signal }) => api.get<WorkspaceEvidenceRenewal>(`/workspaces/${encodeURIComponent(ws)}/evidence/renewal`, signal),
    enabled: !!ws,
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  });
  const data = query.data;
  const byId = new Map(data?.items.map(item => [item.id, item]));
  return <section className="evidence-renewal" aria-label="Evidence renewal" aria-busy={query.isPending}>
    <div className="evidence-renewal__intro">
      <h2>Evidence renewal</h2>
      <p className="muted">See upcoming deadlines and requirements that need accepted evidence. Impact assumes the current scope and evidence on file stay unchanged.</p>
      <details className="evidence-renewal__calculation">
        <summary>How renewal impact is calculated</summary>
        <p className="muted">Impact covers enabled, in-scope requirements. Group links provide context without covering their descendants. Only accepted evidence with a current review can extend coverage.</p>
        <p className="muted">Next 30 days includes Next 7 days; the counts are not additive. Future windows exclude expired evidence and end before their 7- or 30-day boundary. Dates are shown in UTC; a date-only deadline runs through 23:59:59.999 UTC.</p>
      </details>
    </div>
    <Tabs id={tabsId} label="Renewal window" tabs={WINDOWS.map(option => ({ id: option.id, label: option.label, count: data?.buckets[option.bucket].evidenceIds.length }))} value={window} onChange={next => { setVisible(12); onWindowChange(next); }} />
    {query.isPending && <p role="status">Loading evidence renewals…</p>}
    {query.error && <div className="evidence-renewal__notice" role="alert">
      <p>{data ? "Could not refresh evidence renewals. Showing the last successful snapshot below." : "Could not load evidence renewals."} {query.error.message}</p>
      <button type="button" className="btn btn--sm" disabled={query.isFetching} onClick={() => void query.refetch()}>Retry renewals</button>
    </div>}
    {WINDOWS.map(option => <TabPanel key={option.id} groupId={tabsId} id={option.id} active={window === option.id}>
      {data && (() => {
        const bucket = data.buckets[option.bucket];
        const items = bucket.evidenceIds.flatMap(id => { const item = byId.get(id); return item ? [item] : []; });
        const impacted = option.id === "expired" ? bucket.uncoveredRequirementIds : bucket.losingCoverageRequirementIds;
        return <>
          <p className="evidence-renewal__summary" role="status">{items.length} evidence {items.length === 1 ? "item" : "items"} · {impacted.length} distinct {impacted.length === 1 ? "requirement" : "requirements"} {option.id === "expired" ? `currently ${impacted.length === 1 ? "lacks" : "lack"} valid accepted evidence` : "would lose uninterrupted coverage in this window"}. Earliest expiry first.</p>
          {!!impacted.length && <RequirementLinks ids={impacted} />}
          {items.length ? <ol className="evidence-renewal__list">{items.slice(0, visible).map(item => <RenewalItem key={item.id} item={item} data={data} onInspect={onInspect} />)}</ol> : <Empty title={option.empty} />}
          {items.length > visible && <button type="button" className="btn evidence-renewal__more" onClick={() => setVisible(value => value + 12)}>Show more evidence ({items.length - visible} remaining)</button>}
        </>;
      })()}
    </TabPanel>)}
    {data && <>
      <Unclassified data={data} onInspect={onInspect} />
      <p className="evidence-renewal__asof">{query.error ? "Last successful snapshot" : "As of"} <time dateTime={data.asOf}>{utc(data.asOf)}</time> · refreshes every minute and after workspace changes. Coverage describes accepted evidence, not implementation or requirement status.</p>
    </>}
  </section>;
}
