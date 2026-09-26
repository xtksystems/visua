/**
 * Inspector: details and actions for the current selection (DESIGN.md › Inspector).
 * Header (code, title, status), tabbed body, sticky footer with the primary action.
 */
import { Bot, ExternalLink, FileText, ListChecks, Plus, Sparkles, X } from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { levelLabel, type FrameworkFamily } from "@visua/core";
import { api, corpusFileUrl } from "../../lib/api.ts";
import { FRAMEWORK_SHORT, STATUS_LABEL, TASK_STATUS_LABEL, familyOf, relativeTime, shortDate, truncate } from "../../lib/format.ts";
import { useMeta, useNodeDetail, useWsMutation } from "../../lib/queries.ts";
import type { NodeDetail } from "../../lib/types.ts";
import { useUi } from "../../state/ui.ts";
import { AgentBadge, CodeTag, Dialog, Empty, FrameworkBadge, LevelPips, StatusBar, StatusChip, Tabs, toast } from "../ui/index.tsx";

type Tab = "overview" | "tasks" | "evidence" | "mappings" | "history";

export function Inspector({ nodeId, onClose }: { nodeId: string; onClose: () => void }) {
  const { ws = "" } = useParams();
  const { data, isLoading } = useNodeDetail(ws, nodeId);
  const [tab, setTab] = useState<Tab>("overview");
  if (isLoading || !data) {
    return (
      <aside className="inspector" aria-busy="true">
        <div className="muted">Loading…</div>
      </aside>
    );
  }
  const { node } = data;
  const status = data.status?.status ?? data.groupStatus ?? "not-started";
  return (
    <aside className="inspector" aria-label={`${node.code} details`}>
      <header className="inspector__head">
        <div className="row" style={{ gap: 6, flexWrap: "wrap" }}>
          <FrameworkBadge frameworkId={node.frameworkId} />
          {data.ancestors.map((a) => (
            <CodeTag key={a.id} id={a.id} />
          ))}
          <span style={{ flex: 1 }} />
          <button className="btn btn--quiet btn--sm btn--icon" onClick={onClose} aria-label="Close inspector">
            <X size={14} />
          </button>
        </div>
        <div className="row" style={{ marginTop: 10, gap: 10, alignItems: "flex-start" }}>
          <span className="mono" style={{ fontSize: 20, fontWeight: 600, color: "var(--color-primary)", lineHeight: 1.2 }}>
            {node.code}
          </span>
          <StatusChip status={status} />
        </div>
        {node.title && node.title !== node.code ? <h2 className="inspector__title">{node.title}</h2> : null}
      </header>
      <Tabs<Tab>
        value={tab}
        onChange={setTab}
        tabs={[
          { id: "overview", label: "Overview" },
          { id: "tasks", label: "Tasks", count: data.tasks.length },
          { id: "evidence", label: "Evidence", count: data.evidence.length },
          { id: "mappings", label: "Mappings", count: data.mappings.length },
          { id: "history", label: "History" },
        ]}
      />
      <div className="inspector__body">
        {tab === "overview" && <Overview data={data} />}
        {tab === "tasks" && <TasksTab data={data} />}
        {tab === "evidence" && <EvidenceTab data={data} />}
        {tab === "mappings" && <MappingsTab data={data} />}
        {tab === "history" && <HistoryTab data={data} />}
      </div>
      <AgentFooter data={data} />
    </aside>
  );
}

function Overview({ data }: { data: NodeDetail }) {
  const { node } = data;
  const family = familyOf(node.frameworkId) as FrameworkFamily;
  const examples = node.examples ?? [];
  const pof = (node.attributes?.["pointsOfFocus"] as { title: string; text?: string }[] | undefined) ?? [];
  const objectives = (node.attributes?.["objectives"] as string[] | undefined) ?? [];
  const baselines = (node.attributes?.["baselines"] as string[] | undefined) ?? [];
  const rmf = node.frameworkId === "nist-rmf" ? (node.attributes as Record<string, unknown>) : undefined;
  return (
    <div className="stack" style={{ gap: 16 }}>
      <p style={{ whiteSpace: "pre-line", lineHeight: 1.6 }}>{node.text}</p>
      {data.source && (
        <div className="muted" style={{ fontSize: 12 }}>
          Source:{" "}
          {data.source.present ? (
            <a href={corpusFileUrl(data.source.path, data.source.page)} target="_blank" rel="noreferrer">
              {data.source.identifier ?? data.source.title}
              {data.source.page ? `, p. ${data.source.page}` : ""} <ExternalLink size={11} style={{ verticalAlign: -1 }} />
            </a>
          ) : (
            <span>{data.source.identifier ?? data.source.title}</span>
          )}
          {data.source.locator ? ` · ${data.source.locator}` : ""}
        </div>
      )}
      {data.contentNotice && node.attributes?.["licensed"] !== undefined && (
        <div className="muted" style={{ fontSize: 11.5, fontStyle: "italic" }}>
          {data.contentNotice}
        </div>
      )}
      {node.assessable && data.state ? <Assessment data={data} family={family} /> : null}
      {!node.assessable && data.score ? (
        <div className="panel panel--raised stack">
          <div className="row">
            <span className="eyebrow">Readiness</span>
            <span style={{ flex: 1 }} />
            <span className="mono">{Math.round(data.score.readiness * 100)}%</span>
          </div>
          <StatusBar counts={data.score.counts} />
          <span className="muted" style={{ fontSize: 12 }}>
            {data.score.total} in scope · {data.score.gaps} gaps · evidence {Math.round(data.score.evidenceCoverage * 100)}%
          </span>
        </div>
      ) : null}
      {baselines.length > 0 && (
        <div className="row row--wrap">
          <span className="eyebrow">SP 800-53B baselines</span>
          {baselines.map((b) => (
            <span key={b} className="chip" style={{ cursor: "default" }}>
              {b.toUpperCase()}
            </span>
          ))}
        </div>
      )}
      {examples.length > 0 && (
        <section>
          <div className="eyebrow" style={{ marginBottom: 8 }}>
            Official implementation examples
          </div>
          <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 1.55 }}>
            {examples.map((e) => (
              <li key={e.code} style={{ marginBottom: 6 }}>
                {e.text}
              </li>
            ))}
          </ul>
        </section>
      )}
      {pof.length > 0 && (
        <section>
          <div className="eyebrow" style={{ marginBottom: 8 }}>
            Points of focus
          </div>
          <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 1.55 }}>
            {pof.map((p) => (
              <li key={p.title} style={{ marginBottom: 6 }}>
                <strong>{p.title}</strong>
                {p.text ? ` — ${p.text}` : ""}
              </li>
            ))}
          </ul>
        </section>
      )}
      {rmf && (
        <section className="stack">
          <div className="eyebrow">Task details (SP 800-37 Rev. 2)</div>
          <div className="muted" style={{ fontSize: 13 }}>
            <strong style={{ color: "var(--color-on-surface)" }}>Outcome:</strong> {String(rmf["outcome"] ?? "")}
          </div>
          <div className="muted" style={{ fontSize: 13 }}>
            <strong style={{ color: "var(--color-on-surface)" }}>Primary responsibility:</strong> {((rmf["primaryResponsibility"] as string[]) ?? []).join("; ")}
          </div>
          <div className="muted" style={{ fontSize: 13 }}>
            <strong style={{ color: "var(--color-on-surface)" }}>Expected outputs:</strong> {((rmf["expectedOutputs"] as string[]) ?? []).join("; ")}
          </div>
        </section>
      )}
      {objectives.length > 0 && (
        <details>
          <summary className="eyebrow" style={{ cursor: "pointer" }}>
            SP 800-53A assessment objectives ({objectives.length})
          </summary>
          <ul style={{ margin: "8px 0 0", paddingLeft: 18, lineHeight: 1.5, fontSize: 13 }}>
            {objectives.map((o) => (
              <li key={o}>{o}</li>
            ))}
          </ul>
        </details>
      )}
      {node.guidance && (
        <details>
          <summary className="eyebrow" style={{ cursor: "pointer" }}>
            Discussion
          </summary>
          <p className="muted" style={{ marginTop: 8, lineHeight: 1.6, fontSize: 13 }}>
            {node.guidance}
          </p>
        </details>
      )}
      {data.children.length > 0 && (
        <section>
          <div className="eyebrow" style={{ marginBottom: 8 }}>
            Contains
          </div>
          <div className="stack" style={{ gap: 6 }}>
            {data.children.slice(0, 60).map((c) => (
              <div key={c.id} className="row" style={{ alignItems: "flex-start" }}>
                <CodeTag id={c.id} />
                <span className="muted" style={{ fontSize: 13 }}>
                  {truncate(c.title || c.text, 110)}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function Assessment({ data, family }: { data: NodeDetail; family: FrameworkFamily }) {
  const { ws = "" } = useParams();
  const meta = useMeta();
  const state = data.state!;
  const scale = meta.data?.levelScales[family];
  const [naOpen, setNaOpen] = useState(false);
  const [rationale, setRationale] = useState(state.applicabilityRationale ?? "");
  const update = useWsMutation(ws, (patch: Record<string, unknown>) => api.patch(`/workspaces/${encodeURIComponent(ws)}/requirements/${encodeURIComponent(data.node.id)}`, patch));
  const set = (patch: Record<string, unknown>) =>
    update.mutate(patch, {
      onError: (e) => toast((e as Error).message, "error"),
    });
  const levels = scale?.levels ?? [0, 1, 2, 3, 4].map((l) => ({ level: l, label: levelLabel(family, l), description: "" }));
  return (
    <div className="panel panel--raised stack" style={{ gap: 12 }}>
      <div className="row">
        <span className="eyebrow">{scale?.name ?? "Implementation level"}</span>
        <span style={{ flex: 1 }} />
        <LevelPips current={state.current} target={state.target} />
      </div>
      <LevelRow label="Current" value={state.current} levels={levels} onChange={(v) => set({ current: v })} disabled={!state.applicable} />
      <LevelRow label="Target" value={state.target} levels={levels} onChange={(v) => set({ target: v })} disabled={!state.applicable} />
      {data.status?.reasons.length ? <div className="muted" style={{ fontSize: 12 }}>{data.status.reasons.join(" · ")}</div> : null}
      <div className="row row--wrap" style={{ gap: 8 }}>
        <label className="field" style={{ flex: 1, minWidth: 120 }}>
          <span className="label">Priority</span>
          <select className="select" value={state.priority} onChange={(e) => set({ priority: e.target.value })}>
            {["critical", "high", "medium", "low"].map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </label>
        <label className="field" style={{ flex: 1, minWidth: 120 }}>
          <span className="label">Owner</span>
          <input className="input" defaultValue={state.owner ?? ""} placeholder="Unassigned" onBlur={(e) => e.target.value !== (state.owner ?? "") && set({ owner: e.target.value })} />
        </label>
      </div>
      <div className="row">
        {state.applicable ? (
          <button className="btn btn--quiet btn--sm" onClick={() => setNaOpen(true)}>
            Mark not applicable…
          </button>
        ) : (
          <>
            <span className="muted" style={{ fontSize: 12, flex: 1 }}>
              Not applicable: {state.applicabilityRationale}
            </span>
            <button className="btn btn--sm" onClick={() => set({ applicable: true })}>
              Bring into scope
            </button>
          </>
        )}
        <span style={{ flex: 1 }} />
        {state.applicable && state.current >= state.target && !state.verifiedAt && (
          <button className="btn btn--sm" onClick={() => set({ verifiedAt: new Date().toISOString() })} title="Record that an assessor verified the implementation and its evidence">
            Mark verified
          </button>
        )}
      </div>
      {naOpen && (
        <Dialog
          title={`Mark ${data.node.code} not applicable`}
          onClose={() => setNaOpen(false)}
          footer={
            <>
              <button className="btn" onClick={() => setNaOpen(false)}>
                Cancel
              </button>
              <button
                className="btn btn--primary"
                disabled={rationale.trim().length < 12}
                onClick={() => {
                  set({ applicable: false, applicabilityRationale: rationale.trim() });
                  setNaOpen(false);
                }}
              >
                Record decision
              </button>
            </>
          }
        >
          <div className="field">
            <label htmlFor="na-rationale">Rationale (visible to auditors)</label>
            <textarea id="na-rationale" className="textarea" value={rationale} onChange={(e) => setRationale(e.target.value)} placeholder="e.g. No on-premises facilities; physical controls are inherited from the cloud provider." />
            <span className="field__hint">Scoping decisions are first-class, reviewable artifacts in Visua — a written justification is required.</span>
          </div>
        </Dialog>
      )}
    </div>
  );
}

function LevelRow({ label, value, levels, onChange, disabled }: { label: string; value: number; levels: { level: number; label: string; description: string }[]; onChange: (v: number) => void; disabled?: boolean }) {
  return (
    <div className="stack" style={{ gap: 6 }}>
      <div className="row">
        <span style={{ width: 56, fontSize: 12 }} className="muted">
          {label}
        </span>
        <div className="segmented" role="radiogroup" aria-label={`${label} level`} style={{ flex: 1, justifyContent: "space-between" }}>
          {levels.map((l) => (
            <button key={l.level} role="radio" aria-checked={value === l.level} aria-pressed={value === l.level} disabled={disabled} onClick={() => onChange(l.level)} title={`${l.label}: ${l.description}`} style={{ flex: 1 }}>
              {l.level}
            </button>
          ))}
        </div>
      </div>
      <span className="muted" style={{ fontSize: 12, marginLeft: 64 }}>
        {levels.find((l) => l.level === value)?.label}
      </span>
    </div>
  );
}

function TasksTab({ data }: { data: NodeDetail }) {
  const { ws = "" } = useParams();
  const [title, setTitle] = useState("");
  const create = useWsMutation(ws, (t: string) => api.post(`/workspaces/${encodeURIComponent(ws)}/tasks`, { title: t, requirementIds: [data.node.id], kind: "procedure" }));
  const run = useRunAgent();
  return (
    <div className="stack" style={{ gap: 10 }}>
      {data.tasks.length === 0 && <Empty title="No tasks yet">Plan work with an agent or add one below.</Empty>}
      {data.tasks.map((t) => (
        <div key={t.id} className="panel panel--raised" style={{ padding: 12 }}>
          <div className="row" style={{ alignItems: "flex-start" }}>
            <ListChecks size={15} style={{ marginTop: 2, color: "var(--color-on-surface-muted)" }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 500 }}>{t.title}</div>
              <div className="muted" style={{ fontSize: 12 }}>
                {TASK_STATUS_LABEL[t.status]} · {t.priority} · due {shortDate(t.dueDate)} · {t.checklist.filter((c) => c.done).length}/{t.checklist.length} steps
                {t.origin === "agent" ? " · " : ""}
                {t.origin === "agent" ? <AgentBadge label="agent" /> : null}
              </div>
            </div>
            {t.status !== "done" && (
              <button className="btn btn--agent btn--sm" onClick={() => run("task-executor", `Execute task: ${t.title}`, { taskId: t.id })} title="Let an agent carry this task as far as software can (with your approval)">
                <Bot size={13} /> Execute
              </button>
            )}
          </div>
        </div>
      ))}
      <form
        className="row"
        onSubmit={(e) => {
          e.preventDefault();
          if (title.trim()) create.mutate(title.trim(), { onSuccess: () => setTitle("") });
        }}
      >
        <input className="input" placeholder="Add a task for this requirement…" value={title} onChange={(e) => setTitle(e.target.value)} />
        <button className="btn btn--icon" aria-label="Add task" disabled={!title.trim()}>
          <Plus size={15} />
        </button>
      </form>
    </div>
  );
}

function EvidenceTab({ data }: { data: NodeDetail }) {
  const { ws = "" } = useParams();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [kind, setKind] = useState("document");
  const add = useWsMutation(ws, () => api.post(`/workspaces/${encodeURIComponent(ws)}/evidence`, { title, content, kind, requirementIds: [data.node.id] }));
  return (
    <div className="stack" style={{ gap: 10 }}>
      {data.evidence.length === 0 && <Empty title="No evidence yet">Evidence must show what is actually in place — configuration exports, logs, records or signed attestations.</Empty>}
      {data.evidence.map((e) => (
        <div key={e.id} className="panel panel--raised" style={{ padding: 12 }}>
          <div className="row" style={{ alignItems: "flex-start" }}>
            <FileText size={15} style={{ marginTop: 2, color: "var(--color-on-surface-muted)" }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 500 }}>{e.title}</div>
              <div className="muted" style={{ fontSize: 12 }}>
                {e.kind} · {e.source === "connector" ? "API-automated" : e.source === "agent" ? "agent-assisted" : "manual"} · {e.status}
                {e.validUntil ? ` · valid until ${shortDate(e.validUntil)}` : ""}
              </div>
              {e.sha256 && (
                <div className="mono muted" style={{ fontSize: 11, marginTop: 4 }} title="SHA-256 content hash (provenance)">
                  sha256 {e.sha256.slice(0, 16)}…
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
      <button className="btn" onClick={() => setOpen(true)}>
        <Plus size={14} /> Add evidence
      </button>
      {open && (
        <Dialog
          title={`Add evidence for ${data.node.code}`}
          onClose={() => setOpen(false)}
          footer={
            <>
              <button className="btn" onClick={() => setOpen(false)}>
                Cancel
              </button>
              <button className="btn btn--primary" disabled={!title.trim()} onClick={() => add.mutate(undefined, { onSuccess: () => (setOpen(false), setTitle(""), setContent(""), toast("Evidence added — it awaits review")) })}>
                Add for review
              </button>
            </>
          }
        >
          <div className="stack" style={{ gap: 12 }}>
            <div className="field">
              <label>Title</label>
              <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. MFA enforcement configuration export" />
            </div>
            <div className="field">
              <label>Kind</label>
              <select className="select" value={kind} onChange={(e) => setKind(e.target.value)}>
                {["document", "configuration", "screenshot", "log", "attestation", "report"].map((k) => (
                  <option key={k}>{k}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Content or reference</label>
              <textarea className="textarea" value={content} onChange={(e) => setContent(e.target.value)} placeholder="Paste the export, link the system of record, or describe the artifact. Visua stores a SHA-256 hash for provenance." />
            </div>
          </div>
        </Dialog>
      )}
    </div>
  );
}

function MappingsTab({ data }: { data: NodeDetail }) {
  const navigate = useNavigate();
  const { ws = "" } = useParams();
  const grouped = useMemo(() => {
    const m = new Map<string, NodeDetail["mappings"]>();
    for (const x of data.mappings) m.set(x.framework, [...(m.get(x.framework) ?? []), x]);
    return [...m.entries()];
  }, [data.mappings]);
  if (!data.mappings.length) return <Empty title="No authoritative mappings">No crosswalk in the local corpus maps this requirement yet.</Empty>;
  return (
    <div className="stack" style={{ gap: 14 }}>
      <p className="muted" style={{ fontSize: 12 }}>
        Mappings show where work can be reused. A mapping is never evidence on its own.
      </p>
      {grouped.map(([fw, list]) => (
        <section key={fw}>
          <div className="row" style={{ marginBottom: 8 }}>
            <FrameworkBadge frameworkId={fw} />
            <span className="muted" style={{ fontSize: 12 }}>
              {list.length} · {list[0]?.authority}
            </span>
          </div>
          <div className="stack" style={{ gap: 6 }}>
            {list.map((m) => (
              <div key={m.id} className="row" style={{ alignItems: "flex-start" }}>
                <CodeTag id={m.id} onNavigate={(id) => navigate(`/w/${ws}/observatory/${fw}?select=${encodeURIComponent(id)}`)} />
                <span className="muted" style={{ fontSize: 13, flex: 1 }}>
                  {truncate(m.title ? `${m.title}: ${m.text}` : m.text, 110)}
                </span>
                <span className="mono muted" style={{ fontSize: 11 }} title="Current / target level">
                  {m.applicable === false ? "N/A" : m.current !== undefined ? `${m.current}/${m.target}` : ""}
                </span>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function HistoryTab({ data }: { data: NodeDetail }) {
  if (!data.activity.length && !data.proposals.length) return <Empty title="No history yet" />;
  return (
    <div className="stack" style={{ gap: 8 }}>
      {data.proposals.map((p) => (
        <div key={p.id} className="agent-step">
          <div className="row">
            <AgentBadge label={p.status} />
            <span style={{ fontWeight: 500 }}>{p.title}</span>
          </div>
          <div style={{ marginTop: 4, opacity: 0.85 }}>{truncate(p.rationale, 200)}</div>
        </div>
      ))}
      {data.activity.map((a) => (
        <div key={a.id} className="row" style={{ alignItems: "flex-start", fontSize: 13 }}>
          <span className="mono muted" style={{ width: 88, flexShrink: 0, fontSize: 11 }}>
            {relativeTime(a.at)}
          </span>
          <span>
            <strong>{a.actor}</strong> {a.summary}
          </span>
        </div>
      ))}
    </div>
  );
}

export function useRunAgent() {
  const { ws = "" } = useParams();
  const navigate = useNavigate();
  return async (agent: string, goal: string, input: Record<string, unknown>, opts: { stay?: boolean } = {}) => {
    try {
      await api.post(`/workspaces/${encodeURIComponent(ws)}/runs`, { agent, goal, input });
      toast(`${agent} started — watch it work in the scene or in Agents.`, "agent");
      if (!opts.stay) void navigate;
    } catch (e) {
      toast((e as Error).message, "error");
    }
  };
}

function AgentFooter({ data }: { data: NodeDetail }) {
  const run = useRunAgent();
  const { node } = data;
  const input = { nodeIds: [node.id], framework: node.frameworkId, nodeId: node.id };
  const label = node.code;
  return (
    <footer className="inspector__foot">
      <div className="eyebrow" style={{ marginBottom: 8 }}>
        Agents
      </div>
      <div className="row row--wrap" style={{ gap: 6 }}>
        <button className="btn btn--agent btn--sm" onClick={() => run("assessor", `Assess ${label} from evidence and monitoring`, input)}>
          <Sparkles size={13} /> Assess
        </button>
        <button className="btn btn--sm" onClick={() => run("planner", `Plan the work to reach target for ${label}`, input)}>
          Plan
        </button>
        <button className="btn btn--sm" onClick={() => run("policy-author", `Draft the policy that governs ${label}`, input)}>
          Draft policy
        </button>
        <button className="btn btn--sm" onClick={() => run("copilot", `Explain ${label}: what it requires, how we are doing, and the next step`, input)}>
          Explain
        </button>
      </div>
      <div className="muted" style={{ fontSize: 11, marginTop: 8 }}>
        Agents propose; you approve in <strong>Agents</strong>. {STATUS_LABEL[data.status?.status ?? "not-started"]} · {FRAMEWORK_SHORT[node.frameworkId] ?? node.frameworkId}
      </div>
    </footer>
  );
}
