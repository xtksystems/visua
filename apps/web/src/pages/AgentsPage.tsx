/**
 * Agents: glass-box flight recorders, the approvals inbox and the launcher.
 */
import { AlertTriangle, ArrowLeft, BookOpen, Brain, CheckCheck, Compass, MessageSquare, Play, Square, Wrench } from "lucide-react";
import { useEffect, useId, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import type { AgentStep } from "@visua/core";
import { ProposalCard } from "../components/agents/Proposals.tsx";
import { AgentBadge, CitationBlock, CodeTag, Empty, TabPanel, Tabs, toast } from "../components/ui/index.tsx";
import { useWorkspaceId } from "../lib/workspace.ts";
import { api } from "../lib/api.ts";
import { useCan } from "../lib/auth.ts";
import { relativeTime, truncate } from "../lib/format.ts";
import { Markdown } from "../lib/markdown.tsx";
import { NARROW, useMediaQuery } from "../lib/media.ts";
import { useMeta, useProposals, useRun, useRuns, useWorkspace, useWsMutation } from "../lib/queries.ts";
import type { RunWithProposals } from "../lib/types.ts";
import { useUi } from "../state/ui.ts";

const STEP_ICON: Record<AgentStep["type"], React.ReactNode> = {
  plan: <Compass size={14} />,
  thought: <Brain size={14} />,
  "tool-call": <Wrench size={14} />,
  "tool-result": <Wrench size={14} />,
  citation: <BookOpen size={14} />,
  proposal: <CheckCheck size={14} />,
  message: <MessageSquare size={14} />,
  ui: <Compass size={14} />,
  error: <AlertTriangle size={14} />,
};

function RunStatus({ status }: { status: string }) {
  const color =
    status === "completed" ? "var(--color-status-implemented)" : status === "failed" ? "var(--color-status-at-risk)" : status === "awaiting-approval" ? "var(--color-tertiary)" : status === "cancelled" ? "var(--color-on-surface-muted)" : "var(--color-status-in-progress)";
  return (
    <span className="row mono" style={{ gap: 6, fontSize: 11, color }}>
      <span className={status === "running" || status === "queued" ? "pulse" : ""} style={{ width: 7, height: 7, borderRadius: 99, background: color }} />
      {status}
    </span>
  );
}

function StepView({ step }: { step: AgentStep }) {
  const focus = useUi((s) => s.focus);
  const navigate = useNavigate();
  const ws = useWorkspaceId();
  const tool = step.type === "tool-call" || step.type === "tool-result";
  const [open, setOpen] = useState(false);
  return (
    <li className="flight__step">
      <span className={`flight__dot flight__dot--${step.type}`}>{STEP_ICON[step.type]}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="row" style={{ gap: 8 }}>
          <span className="eyebrow" style={{ fontSize: 10 }}>
            {step.type}
          </span>
          <span className="mono muted" style={{ fontSize: 10.5 }}>
            {new Date(step.at).toLocaleTimeString()}
          </span>
        </div>
        <div className={tool ? "agent-step agent-step--tool" : step.type === "error" ? "toast toast--error" : "agent-step"} style={{ marginTop: 4, cursor: step.data || step.detail ? "pointer" : undefined }} onClick={() => setOpen(!open)}>
          <div style={{ fontWeight: tool ? 500 : 500 }}>{step.title}</div>
          {open && step.detail && step.type !== "message" && <div style={{ marginTop: 6, whiteSpace: "pre-wrap", opacity: 0.9 }}>{step.detail}</div>}
          {open && step.data !== undefined && (
            <pre className="mono" style={{ marginTop: 8, whiteSpace: "pre-wrap", fontSize: 11, maxHeight: 260, overflow: "auto" }}>
              {JSON.stringify(step.data, null, 2).slice(0, 4000)}
            </pre>
          )}
        </div>
        {step.type === "message" && step.detail && (
          <div className="panel" style={{ marginTop: 8 }}>
            <Markdown text={step.detail} />
          </div>
        )}
        {step.citations?.length ? (
          <div className="stack" style={{ marginTop: 8, gap: 6 }}>
            {step.citations.slice(0, 3).map((c, i) => (
              <CitationBlock key={i} citation={c} />
            ))}
          </div>
        ) : null}
        {step.nodeIds?.length ? (
          <div className="row row--wrap" style={{ gap: 4, marginTop: 6 }}>
            {step.nodeIds.slice(0, 10).map((id) => (
              <CodeTag
                key={id}
                id={id}
                onNavigate={(nid) => {
                  navigate(`/w/${ws}/observatory/${nid.slice(0, nid.lastIndexOf(":"))}?select=${encodeURIComponent(nid)}`);
                  focus([nid]);
                }}
              />
            ))}
          </div>
        ) : null}
      </div>
    </li>
  );
}

function FlightRecorder({ runId }: { runId: string }) {
  const ws = useWorkspaceId();
  const { data: run } = useRun(ws, runId);
  const cancel = useWsMutation(ws, () => api.post(`/workspaces/${encodeURIComponent(ws)}/runs/${runId}/cancel`));
  const approveAll = useWsMutation(ws, () => api.post(`/workspaces/${encodeURIComponent(ws)}/runs/${runId}/approve-all`));
  const canWrite = useCan("work.write");
  const canDecide = useCan("work.approve");
  if (!run) return <div className="muted">Loading run…</div>;
  const pending = run.proposals.filter((p) => p.status === "pending");
  const duration = run.startedAt && run.finishedAt ? Math.max(0, (new Date(run.finishedAt).getTime() - new Date(run.startedAt).getTime()) / 1000) : undefined;
  return (
    <div className="stack" style={{ gap: 16 }}>
      <div className="panel">
        <div className="row row--wrap" style={{ alignItems: "flex-start", gap: 12 }}>
          <div style={{ flex: "1 1 260px", minWidth: 0 }}>
            <div className="row row--wrap" style={{ gap: 8 }}>
              <AgentBadge label={run.agent} />
              <RunStatus status={run.status} />
              <span className="muted mono" style={{ fontSize: 11 }}>
                {run.mode === "claude" ? run.model : "offline playbook"}
                {duration !== undefined ? ` · ${duration.toFixed(1)}s` : ""}
                {run.usage ? ` · ${run.usage.inputTokens.toLocaleString()} in / ${run.usage.outputTokens.toLocaleString()} out tokens` : ""}
              </span>
            </div>
            <h2 className="section-title" style={{ marginTop: 10, marginBottom: 0 }}>
              {run.goal}
            </h2>
          </div>
          {canWrite && (run.status === "running" || run.status === "queued") && (
            <button className="btn btn--sm" disabled={cancel.isPending} onClick={() => cancel.mutate(undefined)}>
              <Square size={12} /> Stop
            </button>
          )}
          {pending.length > 1 && canDecide && (
            <button className="btn btn--agent btn--sm" onClick={() => approveAll.mutate(undefined, { onSuccess: () => toast(`Approved ${pending.length} proposals`) })}>
              <CheckCheck size={13} /> Approve all {pending.length}
            </button>
          )}
        </div>
        {run.error && <div className="toast toast--error" style={{ marginTop: 12 }}>{run.error}</div>}
      </div>
      {run.proposals.length > 0 && (
        <section>
          <div className="eyebrow" style={{ marginBottom: 8 }}>
            Proposals ({pending.length} pending of {run.proposals.length})
          </div>
          <div className="stack" style={{ gap: 8 }}>
            {run.proposals.map((p) => (
              <ProposalCard key={p.id} proposal={p} />
            ))}
          </div>
        </section>
      )}
      <section>
        <div className="eyebrow" style={{ marginBottom: 8 }}>
          Flight recorder · {run.steps.length} steps
        </div>
        <ol className="flight">
          {run.steps.map((s) => (
            <StepView key={s.id} step={s} />
          ))}
        </ol>
      </section>
    </div>
  );
}

const PRESETS: Record<string, string> = {
  copilot: "What are our largest gaps and what should we do first?",
  assessor: "Assess our current implementation levels from evidence and monitoring",
  planner: "Plan the next sprint of work for our highest-priority gaps",
  "policy-author": "Draft the policy that governs our weakest category",
  "evidence-collector": "Run monitoring checks and find implemented requirements without evidence",
  "crosswalk-analyst": "Project our CSF progress onto our other frameworks",
  "auditor-prep": "Prepare an audit readiness brief with blocking items",
  "task-executor": "Execute the selected task",
};

function Launcher() {
  const ws = useWorkspaceId();
  const meta = useMeta();
  const workspace = useWorkspace(ws);
  const navigate = useNavigate();
  const [agent, setAgent] = useState("copilot");
  const [goal, setGoal] = useState(PRESETS["copilot"]!);
  const [framework, setFramework] = useState("");
  const start = useWsMutation(ws, () => api.post<RunWithProposals>(`/workspaces/${encodeURIComponent(ws)}/runs`, { agent, goal, input: framework ? { framework } : {} }));
  const canWrite = useCan("work.write");
  if (!canWrite) return null;
  return (
    <div className="panel">
      <div className="panel__head">
        <h2>Launch an agent</h2>
        <span className="spacer" />
        <span className="muted" style={{ fontSize: 12 }}>
          {meta.data?.ai.mode === "claude" ? `Claude · ${meta.data.ai.model}` : "Offline playbooks"}
        </span>
      </div>
      <div className="stack" style={{ gap: 10 }}>
        <div className="row row--wrap" style={{ gap: 6 }}>
          {(meta.data?.agents ?? []).filter((a) => a.kind !== "task-executor").map((a) => (
            <button
              key={a.kind}
              className="chip"
              aria-pressed={agent === a.kind}
              title={a.tagline}
              onClick={() => {
                setAgent(a.kind);
                setGoal(PRESETS[a.kind] ?? "");
              }}
            >
              {a.name}
            </button>
          ))}
        </div>
        <textarea className="textarea" style={{ minHeight: 70 }} value={goal} onChange={(e) => setGoal(e.target.value)} aria-label="Goal" />
        <div className="row">
          <select className="select" style={{ maxWidth: 220 }} value={framework} onChange={(e) => setFramework(e.target.value)} aria-label="Framework scope">
            <option value="">All enabled frameworks</option>
            {workspace.data?.frameworks.map((f) => (
              <option key={f.id} value={f.id}>
                {f.shortName}
              </option>
            ))}
          </select>
          <span style={{ flex: 1 }} />
          <button
            className="btn btn--agent"
            disabled={!goal.trim() || start.isPending}
            onClick={() =>
              start.mutate(undefined, {
                onSuccess: (run) => navigate(`/w/${ws}/agents/${run.id}`),
                onError: (e) => toast((e as Error).message, "error"),
              })
            }
          >
            <Play size={14} /> Run {meta.data?.agents.find((a) => a.kind === agent)?.name ?? agent}
          </button>
        </div>
      </div>
    </div>
  );
}

export function AgentsPage() {
  const ws = useWorkspaceId();
  const { runId } = useParams();
  const navigate = useNavigate();
  const runs = useRuns(ws);
  const pending = useProposals(ws, "pending");
  const selected = runId ?? runs.data?.[0]?.id;
  const [tab, setTab] = useState<"runs" | "inbox">("runs");
  const tabsId = useId();
  // Narrow screens show one pane at a time: the list, or the run someone opened.
  const narrow = useMediaQuery(NARROW);
  useEffect(() => {
    if (!narrow && !runId && runs.data?.[0]) navigate(`/w/${ws}/agents/${runs.data[0].id}`, { replace: true });
  }, [narrow, runId, runs.data, navigate, ws]);
  const inbox = useMemo(() => pending.data ?? [], [pending.data]);
  return (
    <div className="page master-detail" data-pane={runId ? "detail" : "list"} style={{ ["--master" as string]: "420px" }}>
      <aside className="stack master-detail__master">
        <div>
          <h1 style={{ fontFamily: "var(--font-headline-lg-family)", fontSize: 24, fontWeight: 600 }}>Agents</h1>
          <p className="muted" style={{ fontSize: 13, marginTop: 4 }}>
            Every run is recorded step by step. Agents propose; you decide. Nothing changes your compliance state without approval unless you grant autonomy in Settings.
          </p>
        </div>
        <Launcher />
        <Tabs<"runs" | "inbox">
          id={tabsId}
          label="Agent activity"
          style={{ marginTop: 8 }}
          value={tab}
          onChange={setTab}
          tabs={[{ id: "runs", label: "Runs", count: runs.data?.length ?? 0 }, { id: "inbox", label: "Approvals inbox", count: inbox.length }]}
        />
        <TabPanel groupId={tabsId} id="runs" active={tab === "runs"}>
          <div className="stack" style={{ gap: 6 }}>
            {(runs.data ?? []).map((r) => (
              <button key={r.id} className={`runrow ${selected === r.id ? "is-selected" : ""}`} onClick={() => navigate(`/w/${ws}/agents/${r.id}`)}>
                <div className="row" style={{ gap: 8 }}>
                  <AgentBadge label={r.agent} />
                  <RunStatus status={r.status} />
                  <span style={{ flex: 1 }} />
                  <span className="muted mono" style={{ fontSize: 10.5 }}>
                    {relativeTime(r.createdAt)}
                  </span>
                </div>
                <div style={{ marginTop: 6, textAlign: "left" }}>{truncate(r.goal, 110)}</div>
              </button>
            ))}
            {!runs.data?.length && <Empty title="No runs yet">Launch an agent above.</Empty>}
          </div>
        </TabPanel>
        <TabPanel groupId={tabsId} id="inbox" active={tab === "inbox"}>
          <div className="stack" style={{ gap: 8 }}>
            {inbox.map((p) => (
              <ProposalCard key={p.id} proposal={p} compact />
            ))}
            {!inbox.length && <Empty title="Inbox zero">No proposals are waiting for a decision.</Empty>}
          </div>
        </TabPanel>
      </aside>
      <section className="master-detail__detail">
        <Link to={`/w/${ws}/agents`} className="btn btn--quiet btn--sm master-detail__back">
          <ArrowLeft size={14} aria-hidden /> All runs and approvals
        </Link>
        {selected ? <FlightRecorder runId={selected} /> : <Empty title="Select a run" />}
      </section>
    </div>
  );
}
