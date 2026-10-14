import { useQuery } from "@tanstack/react-query";
import { useId, useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, ArrowRight, Bot, CalendarClock, FileCheck2, Target } from "lucide-react";
import type { AttentionAction, AttentionItem, AttentionKind, WorkspaceAttention } from "@visua/core";
import { api } from "../../lib/api.ts";
import { CodeTag } from "../ui/index.tsx";

const FILTERS = [
  { id: "all", label: "All", kinds: [] },
  { id: "work", label: "Overdue work", kinds: ["overdue-task"] },
  { id: "checks", label: "Failed checks", kinds: ["failing-check"] },
  { id: "evidence", label: "Evidence", kinds: ["expired-evidence", "expiring-evidence", "evidence-review"] },
  { id: "decisions", label: "Agent decisions", kinds: ["proposal-review"] },
  { id: "gaps", label: "Implementation gaps", kinds: ["implementation-gap"] },
] as const;

const LABELS: Record<AttentionKind, string> = {
  "overdue-task": "Overdue work", "failing-check": "Failed check", "expired-evidence": "Expired evidence",
  "expiring-evidence": "Expiring evidence", "evidence-review": "Evidence review", "proposal-review": "Agent decision", "implementation-gap": "Implementation gap",
};

function destination(ws: string, action: AttentionAction, kind: AttentionKind) {
  const base = `/w/${encodeURIComponent(ws)}`;
  const id = encodeURIComponent(action.id);
  switch (action.type) {
    case "task": return `${base}/plan?task=${id}`;
    case "evidence": return `${base}/evidence?evidence=${id}${kind === "expired-evidence" ? "&view=renewal&window=expired" : kind === "expiring-evidence" ? "&view=renewal&window=30d" : ""}`;
    case "check": return `${base}/evidence?check=${id}`;
    case "proposal": return `${base}/agents${action.runId ? `/${encodeURIComponent(action.runId)}` : ""}?proposal=${id}`;
    case "requirement": return `${base}/observatory/${encodeURIComponent(action.frameworkId ?? "")}?select=${id}`;
  }
}

function AttentionRow({ item, ws }: { item: AttentionItem; ws: string }) {
  const Icon = item.kind === "proposal-review" ? Bot : item.kind === "implementation-gap" ? Target : item.kind === "overdue-task" ? CalendarClock : item.kind === "failing-check" ? AlertTriangle : FileCheck2;
  return (
    <li className="attention__item" data-kind={item.kind}>
      <span className="attention__icon" aria-hidden="true"><Icon size={18} /></span>
      <div className="attention__copy">
        <div className="attention__kind">{LABELS[item.kind]} · {item.priority} priority</div>
        <h3>{item.title}</h3>
        <p>{item.reason}</p>
        <div className="attention__owner">Owner: {item.owner.label}</div>
        {item.scope === "workspace" ? <span className="muted">Workspace work · no requirements linked</span> : (
          <div className="attention__requirements">
            <span className="muted">{item.requirements.length} {item.requirements.some(r => !r.assessable) ? "linked requirements / groups" : item.requirements.length === 1 ? "affected requirement" : "affected requirements"}</span>
            {item.requirements.slice(0, 3).map(r => <CodeTag key={r.id} id={r.id} />)}
            {item.requirements.length > 3 && <details><summary>+{item.requirements.length - 3} more</summary><div className="attention__more-links">{item.requirements.slice(3).map(r => <CodeTag key={r.id} id={r.id} />)}</div></details>}
          </div>
        )}
      </div>
      <Link className="btn btn--quiet btn--sm attention__action" to={destination(ws, item.action, item.kind)} aria-label={`${item.action.label}: ${item.title}`}>
        {item.action.label} <ArrowRight size={14} aria-hidden="true" />
      </Link>
    </li>
  );
}

export function AttentionQueue({ ws }: { ws: string }) {
  const queue = useQuery({ queryKey: ["ws", ws, "attention"], queryFn: ({ signal }) => api.get<WorkspaceAttention>(`/workspaces/${encodeURIComponent(ws)}/attention`, signal), enabled: !!ws, refetchInterval: 60_000 });
  const [filter, setFilter] = useState<string>("all");
  const [framework, setFramework] = useState("all");
  const [visible, setVisible] = useState(6);
  const scopeId = useId();
  const scope = queue.data?.enabledFrameworks.some(f => f.id === framework) ? framework : "all";
  const scoped = (queue.data?.items ?? []).filter(item => scope === "all" || item.requirements.some(r => r.frameworkId === scope));
  const matches = (item: AttentionItem, id: string) => id === "all" || (FILTERS.find(f => f.id === id)?.kinds as readonly AttentionKind[] | undefined)?.includes(item.kind);
  const items = scoped.filter(item => matches(item, filter));
  return (
    <section className="panel attention" aria-labelledby={`${scopeId}-title`}>
      <div className="attention__head">
        <div><div className="eyebrow">Where to focus</div><h2 id={`${scopeId}-title`}>Needs attention</h2><p className="muted">The issue, affected work, owner, and next action across your program.</p></div>
        <div className="attention__scope"><label htmlFor={scopeId}>Queue scope</label><select id={scopeId} className="select" value={scope} onChange={e => { setFramework(e.target.value); setVisible(6); }}>
          <option value="all">All enabled frameworks</option>
          {queue.data?.enabledFrameworks.map(f => <option key={f.id} value={f.id}>{f.shortName}</option>)}
        </select></div>
      </div>
      <Link className="btn btn--quiet btn--sm" to={`/w/${encodeURIComponent(ws)}/evidence?view=renewal&window=expired`}>Review evidence renewals <ArrowRight size={14} aria-hidden="true" /></Link>
      <div className="attention__filters" role="group" aria-label="Filter attention queue">
        {FILTERS.map(f => <button key={f.id} type="button" className="chip" aria-pressed={filter === f.id} onClick={() => { setFilter(f.id); setVisible(6); }}>{f.label} <span>{scoped.filter(item => matches(item, f.id)).length}</span></button>)}
      </div>
      {queue.isPending ? <p role="status">Loading attention queue…</p> : queue.error ? <div role="alert"><p>Could not refresh the attention queue. {queue.error.message}</p><button className="btn btn--sm" onClick={() => void queue.refetch()}>Retry attention queue</button></div> : <>
        <p className="attention__count muted" role="status">{items.length ? `Showing ${Math.min(visible, items.length)} of ${items.length} issues · most urgent first` : "No issues match this filter."}</p>
        <ol className="attention__list">{items.slice(0, visible).map(item => <AttentionRow key={item.id} item={item} ws={ws} />)}</ol>
        {items.length > visible && <button className="btn btn--sm" onClick={() => setVisible(n => n + 12)}>Show more issues ({items.length - visible} remaining)</button>}
        <p className="attention__asof muted">{queue.data && `As of ${new Date(queue.data.asOf).toLocaleString()} · refreshes every minute`} · An issue can affect several requirements; counts represent issues.</p>
      </>}
    </section>
  );
}
