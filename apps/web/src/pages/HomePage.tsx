/** Mission control: where the program stands and what to do next. */
import { ArrowRight, Bot, ShieldCheck, Telescope } from "lucide-react";
import { useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import type { Recommendation } from "@visua/core";
import { useQuery } from "@tanstack/react-query";
import { useRunAgent } from "../components/inspector/Inspector.tsx";
import { AgentBadge, CodeTag, FrameworkBadge, Metric, StatusBar } from "../components/ui/index.tsx";
import { api } from "../lib/api.ts";
import { pct, relativeTime, truncate } from "../lib/format.ts";
import { frameworkMeta, programPath } from "../lib/frameworks.ts";
import { useActivity, useAuditVerification, useFrameworkState, useGraph, useProposals, useRuns, useWorkspace } from "../lib/queries.ts";
import { split } from "../lib/media.ts";

const PRIORITY_WEIGHT = { critical: 4, high: 3, medium: 2, low: 1 } as const;

function NextBestActions({ ws, frameworkId }: { ws: string; frameworkId: string }) {
  const graph = useGraph(frameworkId);
  const state = useFrameworkState(ws, frameworkId);
  const run = useRunAgent();
  const items = useMemo(() => {
    if (!graph.data || !state.data) return [];
    return graph.data.nodes
      .filter((n) => n.assessable)
      .map((n) => ({ n, u: state.data!.units[n.id] }))
      .filter((x) => x.u && x.u.applicable && x.u.target > x.u.current)
      .sort((a, b) => PRIORITY_WEIGHT[b.u!.priority] * (b.u!.target - b.u!.current) - PRIORITY_WEIGHT[a.u!.priority] * (a.u!.target - a.u!.current) || (a.u!.openTasks - b.u!.openTasks))
      .slice(0, 6);
  }, [graph.data, state.data]);
  return (
    <div className="panel">
      <div className="panel__head">
        <h2>Next best actions</h2>
        <span className="spacer" />
        <button className="btn btn--agent btn--sm" onClick={() => run("planner", "Plan the next sprint of work for our highest-priority gaps", { framework: frameworkId })}>
          <Bot size={13} /> Plan with agent
        </button>
      </div>
      <div className="stack" style={{ gap: 10 }}>
        {items.map(({ n, u }) => (
          <div key={n.id} className="row" style={{ alignItems: "flex-start", gap: 10 }}>
            <CodeTag id={n.id} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13 }}>{truncate(n.text, 140)}</div>
              <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>
                {u!.priority} priority · level {u!.current} → {u!.target}
                {u!.openTasks ? ` · ${u!.openTasks} open task(s)` : " · no task yet"}
              </div>
            </div>
            <Link className="btn btn--sm" to={`/w/${ws}/observatory/${frameworkId}?select=${encodeURIComponent(n.id)}`}>
              Open
            </Link>
          </div>
        ))}
        {!items.length && <div className="muted">Every in-scope requirement meets its target. Consider raising targets or adding a framework.</div>}
      </div>
    </div>
  );
}

export function HomePage() {
  const { ws = "" } = useParams();
  const { data } = useWorkspace(ws);
  const runs = useRuns(ws);
  const pending = useProposals(ws, "pending");
  const activity = useActivity(ws, 12);
  const audit = useAuditVerification(ws);
  const rec = useQuery({ queryKey: ["ws", ws, "recommendation"], queryFn: () => api.get<Recommendation>(`/workspaces/${encodeURIComponent(ws)}/recommendation`), enabled: !!ws });
  if (!data) return <div className="page muted">Loading…</div>;
  const primary = data.frameworks[0];
  const p = data.workspace.profile;
  return (
    <div className="page">
      <header className="page__header">
        <div>
          <div className="eyebrow">Mission control</div>
          <h1>{data.workspace.name}</h1>
          <p>
            {p.industry.replace("-", " ")} · {p.size} people · security team {p.securityTeamSize} · CSF Tier {p.maturityTier}
            {data.workspace.tierAssessment ? ` (governance ${data.workspace.tierAssessment.governanceTier}, management ${data.workspace.tierAssessment.managementTier})` : ""}
          </p>
        </div>
        <div className="page__actions">
          <Link className="btn" to={`/w/${ws}/agents`}>
            <Bot size={15} /> Approvals ({data.approvals})
          </Link>
          <Link className="btn btn--primary" to={`/w/${ws}/observatory`}>
            <Telescope size={15} /> Open the Observatory
          </Link>
        </div>
      </header>

      {primary && (
        <div className="grid grid--4" style={{ marginBottom: 20 }}>
          <Metric label={`${primary.shortName} readiness`} value={Math.round(primary.readiness * 100)} unit="%" sub={`${primary.total} in-scope ${frameworkMeta(primary.id)?.unitLabelPlural ?? "requirements"}`} />
          <Metric label="Open gaps" value={primary.gaps} sub={`${data.tasks.open} open tasks · ${data.tasks.overdue} overdue`} />
          <Metric label="Evidence coverage" value={Math.round(primary.evidenceCoverage * 100)} unit="%" sub={`${pct(primary.verifiedShare)} verified`} />
          <Metric label="Awaiting your decision" value={data.approvals} sub={`${data.agents.running} agent run(s) active`} />
        </div>
      )}

      <div className="grid split" style={split(1.6, 1)}>
        <div className="stack" style={{ gap: 16 }}>
          <div className="grid grid--2">
            {data.frameworks.map((f) => (
              <div key={f.id} className="panel">
                <div className="panel__head">
                  <FrameworkBadge frameworkId={f.id} />
                  <h3>{f.shortName}</h3>
                  <span className="spacer" />
                  <span className="mono" style={{ fontSize: 18 }}>
                    {Math.round(f.readiness * 100)}%
                  </span>
                </div>
                <StatusBar counts={f.counts} />
                <div className="muted" style={{ fontSize: 12, marginTop: 8 }}>
                  {f.upcoming ? `${f.total} in force · ${f.upcoming.total} upcoming` : `${f.total} in scope`} · {f.gaps} gaps · evidence {pct(f.evidenceCoverage)}
                  {f.settings.soc2 ? ` · ${f.settings.soc2.reportType === "type1" ? "Type 1" : "Type 2"}` : ""}
                  {f.settings.rmf ? ` · ${f.settings.rmf.baseline?.toUpperCase()} baseline` : ""}
                </div>
                <div className="row" style={{ marginTop: 12 }}>
                  <Link className="btn btn--sm" to={`/w/${ws}/observatory/${f.id}`}>
                    <Telescope size={13} /> 3D
                  </Link>
                  <Link className="btn btn--quiet btn--sm" to={programPath(ws, f.id)}>
                    Program <ArrowRight size={13} />
                  </Link>
                </div>
              </div>
            ))}
          </div>
          {primary && <NextBestActions ws={data.workspace.id} frameworkId={primary.id} />}
          <div className="panel">
            <div className="panel__head">
              <h2>Recent agent runs</h2>
              <span className="spacer" />
              <Link to={`/w/${ws}/agents`} className="btn btn--quiet btn--sm">
                All runs <ArrowRight size={13} />
              </Link>
            </div>
            <div className="stack" style={{ gap: 8 }}>
              {(runs.data ?? []).slice(0, 5).map((r) => (
                <Link key={r.id} to={`/w/${ws}/agents/${r.id}`} className="row" style={{ color: "inherit", gap: 10 }}>
                  <AgentBadge label={r.agent} />
                  <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.goal}</span>
                  <span className="mono muted" style={{ fontSize: 11 }}>
                    {r.status} · {relativeTime(r.createdAt)}
                  </span>
                </Link>
              ))}
              {!runs.data?.length && <div className="muted">No agent runs yet.</div>}
            </div>
          </div>
        </div>

        <div className="stack" style={{ gap: 16 }}>
          {pending.data && pending.data.length > 0 && (
            <div className="panel" style={{ borderColor: "var(--color-tertiary-container)" }}>
              <div className="panel__head">
                <AgentBadge label="Awaiting approval" />
                <span className="spacer" />
                <Link to={`/w/${ws}/agents`} className="btn btn--agent btn--sm">
                  Review {pending.data.length}
                </Link>
              </div>
              <div className="stack" style={{ gap: 6 }}>
                {pending.data.slice(0, 5).map((pr) => (
                  <div key={pr.id} className="muted" style={{ fontSize: 13 }}>
                    • {truncate(pr.title, 90)}
                  </div>
                ))}
              </div>
            </div>
          )}
          {rec.data && (
            <div className="panel">
              <div className="panel__head">
                <h2>Your framework path</h2>
              </div>
              <ol className="stack" style={{ gap: 10, margin: 0, paddingLeft: 18 }}>
                {rec.data.frameworks.map((f) => (
                  <li key={f.frameworkId} style={{ fontSize: 13 }}>
                    <strong>{f.name}</strong> {f.availability === "roadmap" ? <span className="chip" style={{ height: 20, cursor: "default" }}>roadmap</span> : null}
                    <div className="muted">{f.reason}</div>
                  </li>
                ))}
              </ol>
              <details style={{ marginTop: 12 }}>
                <summary className="eyebrow" style={{ cursor: "pointer" }}>
                  Why these priorities
                </summary>
                <ul className="muted" style={{ fontSize: 12.5, lineHeight: 1.55, paddingLeft: 18 }}>
                  {rec.data.rationale.map((r) => (
                    <li key={r}>{r}</li>
                  ))}
                </ul>
              </details>
            </div>
          )}
          <div className="panel">
            <div className="panel__head">
              <h2>Audit trail</h2>
              <span className="spacer" />
              {audit.data && (
                <span className="row" style={{ gap: 6, fontSize: 12, color: audit.data.valid ? "var(--color-status-verified)" : "var(--color-status-at-risk)" }} title={audit.data.head ? `Chain head ${audit.data.head}` : undefined}>
                  <ShieldCheck size={14} />
                  {audit.data.valid ? `Hash chain verified · ${audit.data.events} events` : `Chain broken at #${audit.data.brokenAt}`}
                </span>
              )}
            </div>
            <div className="stack" style={{ gap: 8 }}>
              {(activity.data ?? []).map((a) => (
                <div key={a.id} className="row" style={{ alignItems: "flex-start", fontSize: 12.5, gap: 10 }}>
                  <span className="mono muted" style={{ width: 70, flexShrink: 0, fontSize: 11 }}>
                    {relativeTime(a.at)}
                  </span>
                  <span className="wrap-anywhere" style={{ minWidth: 0 }}>
                    <strong style={{ color: a.actor.startsWith("agent") ? "var(--color-tertiary)" : undefined }}>{truncate(a.actor, 30)}</strong> <span className="muted">{truncate(a.summary, 120)}</span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
