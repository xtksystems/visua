import { useId, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ScoreHistory as History, ScoreObservation } from "@visua/core";
import { api } from "../../lib/api.ts";
import { useCan } from "../../lib/auth.ts";
import { historyPercent, historyTime, scoreHistoryPoints, type HistoryPoint } from "../../lib/score-history.ts";
import { QueryError } from "../ui/QueryError.tsx";
import "./score-history.css";

function HistoryChart({ points }: { points: HistoryPoint[] }) {
  const title = useId();
  const first = Date.parse(points[0]!.observation.observedAt), last = Date.parse(points.at(-1)!.observation.observedAt);
  const x = (point: HistoryPoint) => last === first ? 340 : 48 + (Date.parse(point.observation.observedAt) - first) / (last - first) * 584;
  const y = (value: number) => 164 - value * 132;
  return <svg className="score-history__chart" viewBox="0 0 680 212" role="img" aria-labelledby={title}>
    <title id={title}>Recorded implementation progress and valid evidence coverage. Exact values and comparison notes follow in the table.</title>
    {[0, 0.5, 1].map(value => <g key={value}><line className="score-history__grid" x1="48" x2="632" y1={y(value)} y2={y(value)} /><text className="score-history__axis" x="40" y={y(value) + 4} textAnchor="end">{value * 100}%</text></g>)}
    {(["progress", "evidence"] as const).map(metric => <g key={metric} className={`score-history__${metric}`}>
      {points.map((point, index) => {
        const value = point.framework[metric].value;
        const previous = points[index - 1], priorValue = previous?.framework[metric].value;
        if (value === null) return null;
        const label = `${historyTime(point.observation.observedAt)}: ${metric === "progress" ? "Implementation progress" : "Valid evidence coverage"} ${historyPercent(value)}`;
        return <g key={point.observation.id}>
          {previous && priorValue !== null && priorValue !== undefined && !point.breaks.length && <line className="score-history__segment" x1={x(previous)} y1={y(priorValue)} x2={x(point)} y2={y(value)} />}
          {metric === "progress" ? <circle cx={x(point)} cy={y(value)} r="4" aria-label={label}><title>{label}</title></circle>
            : <rect x={x(point) - 3.5} y={y(value) - 3.5} width="7" height="7" aria-label={label}><title>{label}</title></rect>}
        </g>;
      })}
    </g>)}
    <text className="score-history__axis" x="48" y="188">{new Date(first).toISOString().slice(0, 10)}</text>
    <text className="score-history__axis" x="632" y="188" textAnchor="end">{new Date(last).toISOString().slice(0, 10)}</text>
    <text className="score-history__axis" x="340" y="206" textAnchor="middle">Observation date (UTC)</text>
  </svg>;
}

/** History is fetched separately from current metrics and uses only recorded points. */
export function ScoreHistory({ ws }: { ws: string }) {
  const canRecord = useCan("work.write");
  const qc = useQueryClient();
  const selectId = useId();
  const [selected, setSelected] = useState("");
  const history = useQuery({ queryKey: ["ws", ws, "score-history"], queryFn: ({ signal }) => api.get<History>(`/workspaces/${encodeURIComponent(ws)}/score-history`, signal), enabled: !!ws, refetchInterval: 60_000 });
  const record = useMutation({ mutationFn: () => api.post<ScoreObservation>(`/workspaces/${encodeURIComponent(ws)}/score-history`), onSuccess: async () => { await qc.invalidateQueries({ queryKey: ["ws", ws, "score-history"] }); } });
  const observations = history.data?.observations ?? [];
  const frameworks = [...new Map(observations.flatMap(observation => observation.frameworks.map(framework => [framework.frameworkId, framework] as const))).values()];
  const framework = frameworks.find(item => item.frameworkId === selected) ?? frameworks[0];
  const points = framework ? scoreHistoryPoints(observations, framework.frameworkId) : [];
  const latest = points.at(-1);
  return <section className="panel score-history" aria-label="Observed score history">
    <div className="score-history__head"><div><div className="eyebrow">Recorded observations</div><h2>Observed score history</h2></div>
      {canRecord && <button type="button" className="btn" disabled={record.isPending} onClick={() => record.mutate()}>{record.isPending ? "Recording…" : "Record snapshot"}</button>}
    </div>
    <p className="muted">Snapshots record the workspace at a specific time. Lines connect comparable observations; they do not imply continuous monitoring. Current metrics are shown above.</p>
    {record.error && <p role="alert">Could not record snapshot: {record.error.message}</p>}
    {record.isSuccess && <p role="status">Snapshot recorded.</p>}
    {history.error ? <QueryError title="Could not load score history" error={history.error} retry={() => history.refetch()} />
      : history.isPending ? <p role="status">Loading recorded observations…</p>
      : !observations.length ? <p>No observations yet. History begins when the first snapshot is recorded; earlier scores are not reconstructed.</p>
      : !frameworks.length ? <p>The recorded observations contain no enabled assessment frameworks.</p>
      : <>
        <div className="score-history__scope"><label htmlFor={selectId}>History framework</label><select id={selectId} className="select" value={framework!.frameworkId} onChange={event => setSelected(event.target.value)}>{frameworks.map(item => <option key={item.frameworkId} value={item.frameworkId}>{item.label}</option>)}</select></div>
        {latest && <p className="score-history__latest">Latest recorded: <strong>Implementation progress {historyPercent(latest.framework.progress.value)}</strong> · <strong>Valid evidence coverage {historyPercent(latest.framework.evidence.value)}</strong><br /><span className="muted">{historyTime(latest.observation.observedAt)} · {latest.observation.reason} · {latest.framework.scope.inScope} in scope</span></p>}
        {points.length === 1 && <p>One observation recorded. A trend needs another observation with comparable scope, targets, priorities, catalog and calculation.</p>}
        {points.length > 0 && <><div className="score-history__legend" aria-label="History chart legend"><span className="score-history__progress-label">● Implementation progress</span><span className="score-history__evidence-label">■ Valid evidence coverage</span></div><div className="score-history__chart-scroll" role="region" aria-label="Scrollable score history chart" tabIndex={0}><HistoryChart points={points} /></div></>}
        {history.data?.hasOlder && <p className="muted">Showing the latest {observations.length} workspace observations. Older observations remain stored.</p>}
        <div className="score-history__table-scroll" role="region" aria-label="Recorded score observations" tabIndex={0}>
          <table className="table"><caption className="sr-only">Exact recorded values and comparability for {framework!.label}</caption><thead><tr><th scope="col">Observed (UTC)</th><th scope="col">Implementation progress</th><th scope="col">Valid evidence</th><th scope="col">At risk</th><th scope="col">Comparison</th></tr></thead><tbody>
            {points.map((point, index) => <tr key={point.observation.id} data-observation-id={point.observation.id}><th scope="row">{historyTime(point.observation.observedAt)}<span className="score-history__cell-note">{point.observation.reason}</span></th>
              <td>{historyPercent(point.framework.progress.value)}<span className="score-history__cell-note">{point.framework.progress.numerator} / {point.framework.progress.denominator} weighted</span></td>
              <td>{historyPercent(point.framework.evidence.value)}<span className="score-history__cell-note">{point.framework.evidence.covered} / {point.framework.evidence.denominator} requirements</span></td>
              <td>{point.framework.risk.atRisk} / {point.framework.risk.denominator}</td>
              <td>{point.breaks.length ? <ul>{point.breaks.map(reason => <li key={reason}>{reason}</li>)}</ul> : index ? "Same scope, targets, priorities, catalog and calculation" : "First shown observation"}</td></tr>)}
          </tbody></table>
        </div>
        <details className="score-history__details"><summary>Recorded scope, targets and calculation details</summary><p>Progress uses priority-weighted current-to-target ratios capped at 100%. Valid evidence requires a matching accepted review and a current validity window. Risk follows recorded status derivation. Upcoming statutory obligations and excluded requirements do not count toward the denominator.</p>
          {points.map(point => <details key={point.observation.id}><summary>{historyTime(point.observation.observedAt)} · {point.framework.scope.inScope} in scope</summary>
            <p>{point.framework.label} {point.framework.version} · {point.framework.scope.assessable} assessable · {point.framework.scope.upcoming} upcoming · {point.framework.scope.excluded} excluded. Default target: {point.framework.targets.defaultTarget}.</p>
            <p>Targets: {point.framework.targets.levels.map(level => `level ${level.level}: ${level.requirements}`).join("; ") || "None"}. Priorities: {point.framework.targets.priorities.map(priority => `${priority.priority}: ${priority.requirements}`).join("; ")}.</p>
            <p className="mono wrap-anywhere">Calculation {point.observation.formulaVersion} · workspace revision {point.observation.revision}<br />Catalog {point.framework.catalogFingerprint}<br />Scope {point.framework.scopeFingerprint}<br />Targets and priorities {point.framework.targetsFingerprint}</p>
            <p className="wrap-anywhere">Recorded requirement targets: {point.framework.targets.requirements.map(item => `${item.id}: level ${item.target}, ${item.priority}`).join("; ") || "None"}.</p>
            <p className="wrap-anywhere">In-scope requirement IDs: {point.framework.scope.requirementIds.join(", ") || "None"}.</p>
          </details>)}
        </details>
      </>}
  </section>;
}
