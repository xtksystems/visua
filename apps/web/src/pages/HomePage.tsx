/** Overview: where the program stands and what to do next. */
import { ArrowRight, Bot, ShieldCheck, Telescope } from "lucide-react";
import { Link } from "react-router-dom";
import type { Recommendation } from "@visua/core";
import { useQuery } from "@tanstack/react-query";
import { AgentBadge, FrameworkBadge, StatusBar } from "../components/ui/index.tsx";
import { useWorkspaceId } from "../lib/workspace.ts";
import { api } from "../lib/api.ts";
import { pct, relativeTime, truncate } from "../lib/format.ts";
import { programPath } from "../lib/frameworks.ts";
import { useActivity, useAuditVerification, useRuns, useWorkspace } from "../lib/queries.ts";
import { split } from "../lib/media.ts";
import { OverviewMetrics } from "../components/work/OverviewMetrics.tsx";
import { AttentionQueue } from "../components/work/AttentionQueue.tsx";
import { QueryError } from "../components/ui/QueryError.tsx";
import "../components/work/overview.css";

export function HomePage() {
  const ws = useWorkspaceId();
  const workspace = useWorkspace(ws, { refetchInterval: 60_000 });
  const { data } = workspace;
  const runs = useRuns(ws);
  const activity = useActivity(ws, 12);
  const audit = useAuditVerification(ws);
  const rec = useQuery({ queryKey: ["ws", ws, "recommendation"], queryFn: () => api.get<Recommendation>(`/workspaces/${encodeURIComponent(ws)}/recommendation`), enabled: !!ws });
  if (workspace.error) return <QueryError title="Could not load workspace overview" error={workspace.error} retry={() => workspace.refetch()} />;
  if (!data) {
    return (
      <div className="page home home__loading" aria-busy="true">
        <span className="sr-only">Loading workspace overview</span>
        <div className="skeleton skeleton--title" />
        <div className="grid grid--4">
          {Array.from({ length: 4 }, (_, i) => <div className="skeleton skeleton--metric" key={i} />)}
        </div>
        <div className="skeleton skeleton--content" />
      </div>
    );
  }
  const p = data.workspace.profile;
  return (
    <div className="page home">
      <header className="page__header home__hero">
        <div className="home__hero-copy">
          <div className="eyebrow">Workspace overview</div>
          <h1>{data.workspace.name}</h1>
          <p>
            {p.industry.replace("-", " ")} · {p.size} people · security team {p.securityTeamSize} · CSF Tier {p.maturityTier}
            {data.workspace.tierAssessment ? ` (governance ${data.workspace.tierAssessment.governanceTier}, management ${data.workspace.tierAssessment.managementTier})` : ""}
          </p>
        </div>
        <div className="page__actions">
          <Link className="btn" to={`/w/${ws}/agents`}>
            <Bot size={15} /> {data.approvals} awaiting approval
          </Link>
          <Link className="btn btn--primary" to={`/w/${ws}/observatory`}>
            <Telescope size={15} /> Explore Observatory <ArrowRight size={15} />
          </Link>
        </div>
      </header>

      <OverviewMetrics key={ws} data={data} />
      <AttentionQueue key={ws} ws={ws} />

      <div className="grid split home__body" style={split(1.6, 1)}>
        <div className="stack" style={{ gap: 16 }}>
          <div className="home__section-head">
            <div><div className="eyebrow">Your program</div><h2>Frameworks in scope</h2></div>
            <span className="home__section-count">{data.frameworks.length} frameworks</span>
          </div>
          <div className="grid grid--2 home__framework-grid">
            {data.frameworks.map((f) => (
              <div key={f.id} className="panel home__framework">
                <div className="panel__head home__framework-head">
                  <FrameworkBadge frameworkId={f.id} />
                  <span className="spacer" />
                  <span className="home__framework-value" aria-label={f.total ? `Implementation progress ${Math.round(f.readiness * 100)}%` : "No in-scope requirements"}>{f.total ? Math.round(f.readiness * 100) : "—"}{f.total ? <small>%</small> : null}</span>
                </div>
                <h3 className="home__framework-name">{f.shortName}</h3>
                <StatusBar counts={f.counts} />
                <div className="muted home__framework-meta">
                  {f.upcoming ? `${f.total} in force · ${f.upcoming.total} upcoming` : `${f.total} in scope`} · {f.gaps} implementation gaps · valid evidence {pct(f.evidenceCoverage)}
                  {f.settings.soc2 ? ` · ${f.settings.soc2.reportType === "type1" ? "Type 1" : "Type 2"}` : ""}
                  {f.settings.rmf ? ` · ${f.settings.rmf.baseline?.toUpperCase()} baseline` : ""}
                </div>
                <div className="row home__framework-links">
                  <Link className="home__text-link" to={programPath(ws, f.id)}>
                    Program <ArrowRight size={14} />
                  </Link>
                  <Link className="home__text-link home__text-link--muted" to={`/w/${ws}/observatory/${f.id}`}>
                    <Telescope size={13} /> View in 3D
                  </Link>
                </div>
              </div>
            ))}
          </div>
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
