import { useId, useState } from "react";
import { Metric } from "../ui/index.tsx";
import type { WorkspaceSummary } from "../../lib/types.ts";

/** Scope is explicit: a framework's progress never stands in for the workspace. */
export function OverviewMetrics({ data }: { data: WorkspaceSummary }) {
  const [selected, setSelected] = useState("");
  const selectId = useId();
  const framework = data.frameworks.find(f => f.id === selected) ?? data.frameworks[0];
  if (!framework) return <p className="muted">Enable a framework to see implementation progress and evidence coverage.</p>;
  const covered = Math.round(framework.evidenceCoverage * framework.total);
  const atRisk = framework.counts["at-risk"];
  return (
    <section className="overview-metrics" aria-label="Program metrics">
      <div className="overview-metrics__scope">
        <label htmlFor={selectId}>Metric scope</label>
        <select id={selectId} className="select" value={framework.id} onChange={e => setSelected(e.target.value)}>
          {data.frameworks.map(f => <option key={f.id} value={f.id}>{f.shortName}</option>)}
        </select>
        <span className="muted">{framework.total} in-scope requirements{framework.upcoming ? ` · ${framework.upcoming.total} upcoming, excluded` : ""}</span>
      </div>
      <div className="grid grid--4 home__metrics">
        <Metric label="Implementation progress" value={framework.total ? Math.round(framework.readiness * 100) : "—"} unit={framework.total ? "%" : undefined} sub={`Priority-weighted · ${framework.shortName}`} />
        <Metric label="Valid evidence coverage" value={framework.total ? Math.round(framework.evidenceCoverage * 100) : "—"} unit={framework.total ? "%" : undefined} sub={`${covered} of ${framework.total} requirements · accepted and valid`} />
        <Metric label="Requirements at risk" value={atRisk} sub={`${atRisk} of ${framework.total} requirements · ${framework.shortName}`} />
        <Metric label="Pending agent decisions" value={data.approvals} sub={`Entire workspace · ${data.agents.running} active runs`} />
      </div>
      <details className="overview-metrics__definitions">
        <summary>How these metrics are calculated</summary>
        <dl>
          <dt>Implementation progress</dt>
          <dd>For each in-scope requirement, divide its recorded current level by its target, capped at 100%. Average these ratios using priority weights: critical 4, high 3, medium 2, low 1. A zero target contributes 100% only when the current level is above zero; otherwise it contributes 0%. This measures recorded implementation, not accepted proof.</dd>
          <dt>Valid evidence coverage</dt>
          <dd>{covered} requirements with at least one accepted artifact whose current review matches its content, linked requirements, and validity window, divided by {framework.total} in-scope requirements. Multiple artifacts covering one requirement count once. Collection must have started and validity must not have expired.</dd>
          <dt>Requirements at risk</dt>
          <dd>{atRisk} requirements currently marked at risk out of {framework.total} in scope. Causes include failing checks, overdue tasks, and expired evidence on implemented work. Explicit status overrides take precedence. The attention queue shows the underlying issues even when an override is present.</dd>
          <dt>Scope</dt>
          <dd>{framework.shortName} only. Withdrawn and not-applicable requirements are excluded. Statutory obligations count only while in force. An empty scope shows no percentage. Pending agent decisions count proposals across the entire workspace.</dd>
          <dt>Updated</dt>
          <dd>{new Date(data.asOf).toLocaleString()}. The overview refreshes every minute and after workspace changes.</dd>
        </dl>
      </details>
    </section>
  );
}
