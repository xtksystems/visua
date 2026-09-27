/** Plan: board (drag between statuses), timeline, and task execution. */
import { Bot, CalendarRange, Columns3, Plus, Sparkles, Wand2 } from "lucide-react";
import { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { useRunAgent } from "../components/inspector/Inspector.tsx";
import { AgentBadge, CodeTag, Dialog, Empty, Segmented, toast } from "../components/ui/index.tsx";
import { api } from "../lib/api.ts";
import { TASK_STATUS_LABEL, codeOf, frameworkOf, shortDate } from "../lib/format.ts";
import { badgeOf } from "../lib/frameworks.ts";
import { Markdown } from "../lib/markdown.tsx";
import { useTasks, useWorkspace, useWsMutation } from "../lib/queries.ts";
import type { Task } from "../lib/types.ts";
import { split } from "../lib/media.ts";

const COLUMNS: Task["status"][] = ["backlog", "todo", "in-progress", "in-review", "blocked", "done"];
const PRIORITY_COLOR: Record<string, string> = {
  critical: "var(--color-status-at-risk)",
  high: "var(--color-status-in-progress)",
  medium: "var(--color-primary)",
  low: "var(--color-status-not-started)",
};

function TaskCard({ task, onOpen }: { task: Task; onOpen: () => void }) {
  const done = task.checklist.filter((c) => c.done).length;
  const overdue = task.status !== "done" && task.dueDate && task.dueDate < new Date().toISOString().slice(0, 10);
  return (
    <div className="card" draggable onDragStart={(e) => e.dataTransfer.setData("text/task", task.id)} onClick={onOpen} role="button" tabIndex={0} onKeyDown={(e) => e.key === "Enter" && onOpen()}>
      <div className="row" style={{ alignItems: "flex-start", gap: 8 }}>
        <span style={{ width: 3, alignSelf: "stretch", borderRadius: 2, background: PRIORITY_COLOR[task.priority] }} title={`${task.priority} priority`} />
        <div style={{ flex: 1, minWidth: 0, fontWeight: 500 }}>{task.title}</div>
      </div>
      <div className="card__meta">
        {task.requirementIds.slice(0, 2).map((id) => (
          <span key={id} className="mono" style={{ color: "var(--color-primary)" }}>
            {codeOf(id)}
          </span>
        ))}
        <span>· {task.kind}</span>
        {task.checklist.length ? <span>· {done}/{task.checklist.length}</span> : null}
        {task.dueDate ? <span style={{ color: overdue ? "var(--color-status-at-risk)" : undefined }}>· due {shortDate(task.dueDate)}</span> : null}
        {task.assignee?.type === "agent" ? <AgentBadge label="agent" /> : task.assignee ? <span>· {task.assignee.name.split(" (")[0]}</span> : null}
      </div>
    </div>
  );
}

function TaskDialog({ task, onClose }: { task: Task; onClose: () => void }) {
  const { ws = "" } = useParams();
  const run = useRunAgent();
  const update = useWsMutation(ws, (patch: Partial<Task>) =>
    api.patch<{ task: Task; suggestedLevels: { nodeId: string; code: string; from: number; to: number }[] }>(`/workspaces/${encodeURIComponent(ws)}/tasks/${task.id}`, patch),
  );
  const raise = useWsMutation(ws, (s: { nodeId: string; to: number }) => api.patch(`/workspaces/${encodeURIComponent(ws)}/requirements/${encodeURIComponent(s.nodeId)}`, { current: s.to }));
  const setStatus = (status: Task["status"]) =>
    update.mutate(
      { status },
      {
        onSuccess: (r) => {
          for (const s of r.suggestedLevels) {
            if (window.confirm(`Task done. Raise ${s.code} from level ${s.from} to ${s.to}?`)) raise.mutate({ nodeId: s.nodeId, to: s.to });
          }
        },
      },
    );
  return (
    <Dialog wide title={task.title} onClose={onClose}>
      <div className="grid split" style={split(1.4, 1)}>
        <div className="stack" style={{ gap: 12 }}>
          {task.description && (
            <div style={{ maxHeight: 280, overflow: "auto" }} className="panel">
              <Markdown text={task.description} />
            </div>
          )}
          <div>
            <div className="eyebrow" style={{ marginBottom: 8 }}>
              Checklist {task.source?.basis ? `· from ${task.source.basis}` : ""}
            </div>
            <div className="stack" style={{ gap: 6 }}>
              {task.checklist.map((c) => (
                <label key={c.id} className="row" style={{ alignItems: "flex-start", gap: 10, fontSize: 13, cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={c.done}
                    onChange={() => update.mutate({ checklist: task.checklist.map((x) => (x.id === c.id ? { ...x, done: !x.done } : x)) })}
                    style={{ marginTop: 3 }}
                  />
                  <span style={{ textDecoration: c.done ? "line-through" : undefined, opacity: c.done ? 0.6 : 1 }}>{c.text}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
        <div className="stack" style={{ gap: 12 }}>
          <dl className="kv">
            <dt>Status</dt>
            <dd>
              <select className="select" value={task.status} onChange={(e) => setStatus(e.target.value as Task["status"])}>
                {COLUMNS.map((c) => (
                  <option key={c} value={c}>
                    {TASK_STATUS_LABEL[c]}
                  </option>
                ))}
              </select>
            </dd>
            <dt>Priority</dt>
            <dd>{task.priority}</dd>
            <dt>Kind</dt>
            <dd>{task.kind}</dd>
            <dt>Dates</dt>
            <dd>
              {shortDate(task.startDate)} → {shortDate(task.dueDate)} {task.effortHours ? `· ${task.effortHours} h` : ""}
            </dd>
            <dt>Assignee</dt>
            <dd>{task.assignee?.name ?? "Unassigned"}</dd>
            <dt>Origin</dt>
            <dd>{task.origin}</dd>
            <dt>Requirements</dt>
            <dd className="row row--wrap" style={{ gap: 4 }}>
              {task.requirementIds.map((id) => (
                <CodeTag key={id} id={id} />
              ))}
            </dd>
          </dl>
          {task.status !== "done" && (
            <button className="btn btn--agent" onClick={() => (run("task-executor", `Execute task: ${task.title}`, { taskId: task.id }), onClose())}>
              <Bot size={14} /> Execute with agent
            </button>
          )}
          <p className="muted" style={{ fontSize: 12 }}>
            The agent carries the task as far as software can — drafting policies, writing an implementation guide, running checks — and proposes updates for your approval. It never files plans as evidence.
          </p>
        </div>
      </div>
    </Dialog>
  );
}

function Timeline({ tasks, onOpen }: { tasks: Task[]; onOpen: (t: Task) => void }) {
  const dated = tasks.filter((t) => t.startDate && t.dueDate).sort((a, b) => a.startDate!.localeCompare(b.startDate!));
  if (!dated.length) return <Empty title="No scheduled tasks" />;
  const min = new Date(dated[0]!.startDate!).getTime() - 3 * 86_400_000;
  const max = Math.max(...dated.map((t) => new Date(t.dueDate!).getTime())) + 5 * 86_400_000;
  const span = max - min;
  const today = Date.now();
  const x = (d: number) => `${((d - min) / span) * 100}%`;
  const months: { label: string; at: number }[] = [];
  const cursor = new Date(min);
  cursor.setDate(1);
  while (cursor.getTime() < max) {
    if (cursor.getTime() > min) months.push({ label: cursor.toLocaleDateString("en", { month: "short", year: "2-digit" }), at: cursor.getTime() });
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return (
    <div className="panel" style={{ position: "relative", overflowX: "auto" }}>
      <div style={{ position: "relative", minWidth: 900 }}>
        <div style={{ position: "relative", height: 22, borderBottom: "1px solid var(--color-outline)", marginBottom: 8 }}>
          {months.map((m) => (
            <span key={m.at} className="eyebrow" style={{ position: "absolute", left: x(m.at) }}>
              {m.label}
            </span>
          ))}
        </div>
        {today > min && today < max && <div style={{ position: "absolute", top: 0, bottom: 0, left: x(today), width: 2, background: "var(--color-primary)", opacity: 0.7 }} title="Today" />}
        {dated.map((t) => {
          const s = new Date(t.startDate!).getTime();
          const e = new Date(t.dueDate!).getTime() + 86_400_000;
          const late = t.status !== "done" && e < today;
          return (
            <div key={t.id} style={{ position: "relative", height: 30 }}>
              <button
                onClick={() => onOpen(t)}
                title={`${t.title} · ${TASK_STATUS_LABEL[t.status]}`}
                style={{
                  position: "absolute",
                  left: x(s),
                  width: `max(${((e - s) / span) * 100}%, 6px)`,
                  top: 4,
                  height: 22,
                  borderRadius: 6,
                  border: `1px solid ${late ? "var(--color-status-at-risk)" : "var(--color-outline-strong)"}`,
                  background: t.status === "done" ? "var(--color-status-implemented-container)" : t.status === "in-progress" || t.status === "in-review" ? "var(--color-status-in-progress-container)" : "var(--color-surface-raised)",
                  color: "var(--color-on-surface)",
                  fontSize: 11.5,
                  textAlign: "left",
                  padding: "0 8px",
                  overflow: "hidden",
                  whiteSpace: "nowrap",
                  textOverflow: "ellipsis",
                  cursor: "pointer",
                }}
              >
                {t.title}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function PlanPage() {
  const { ws = "" } = useParams();
  const { data: tasks = [] } = useTasks(ws);
  const workspace = useWorkspace(ws);
  const run = useRunAgent();
  const [view, setView] = useState<"board" | "timeline">("board");
  const [open, setOpen] = useState<Task | null>(null);
  const [over, setOver] = useState<string | null>(null);
  const [framework, setFramework] = useState("all");
  const [newTitle, setNewTitle] = useState("");
  const move = useWsMutation(ws, (v: { id: string; status: Task["status"] }) => api.patch(`/workspaces/${encodeURIComponent(ws)}/tasks/${v.id}`, { status: v.status }));
  const plan = useWsMutation(ws, (fw: string) => api.post<Task[]>(`/workspaces/${encodeURIComponent(ws)}/plan`, { framework: fw, maxTasks: 10 }));
  const create = useWsMutation(ws, (title: string) => api.post(`/workspaces/${encodeURIComponent(ws)}/tasks`, { title, status: "todo" }));
  const filtered = useMemo(() => (framework === "all" ? tasks : tasks.filter((t) => t.requirementIds.some((id) => frameworkOf(id) === framework))), [tasks, framework]);
  const current = open ? tasks.find((t) => t.id === open.id) ?? open : null;
  const primary = workspace.data?.frameworks[0]?.id ?? "nist-csf-2.0";
  return (
    <div className="page">
      <header className="page__header">
        <div>
          <div className="eyebrow">Plan</div>
          <h1>Action plan</h1>
          <p>Tasks are grounded in official implementation examples, points of focus and assessment objectives. Drag cards between columns; open one to work its checklist or hand it to an agent.</p>
        </div>
        <div className="page__actions">
          <Segmented
            label="View"
            value={view}
            onChange={setView}
            options={[
              { id: "board", label: "Board" },
              { id: "timeline", label: "Timeline" },
            ]}
          />
          <button
            className="btn"
            onClick={() =>
              plan.mutate(primary, {
                onSuccess: (created) => toast(created.length ? `Planned ${created.length} task(s) from official guidance` : "Every gap already has an open task"),
              })
            }
          >
            <Wand2 size={14} /> Generate plan
          </button>
          <button className="btn btn--agent" onClick={() => run("planner", "Plan the next sprint of work for our highest-priority gaps", { framework: primary })}>
            <Sparkles size={14} /> Plan with agent
          </button>
        </div>
      </header>
      <div className="row row--wrap" style={{ marginBottom: 16, gap: 8 }}>
        <select className="select" style={{ width: 220, maxWidth: "100%" }} value={framework} onChange={(e) => setFramework(e.target.value)} aria-label="Filter by framework">
          <option value="all">All frameworks</option>
          {workspace.data?.frameworks.map((f) => (
            <option key={f.id} value={f.id}>
              {badgeOf(f.id)}
            </option>
          ))}
        </select>
        <span className="muted" style={{ fontSize: 13 }}>
          {filtered.length} task(s) · {filtered.filter((t) => t.status === "done").length} done
        </span>
        <span style={{ flex: 1 }} />
        <form
          className="row"
          style={{ minWidth: 0, maxWidth: "100%" }}
          onSubmit={(e) => {
            e.preventDefault();
            if (newTitle.trim()) create.mutate(newTitle.trim(), { onSuccess: () => setNewTitle("") });
          }}
        >
          <input className="input" style={{ width: 280, maxWidth: "100%", minWidth: 0 }} placeholder="Quick add a task…" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} />
          <button className="btn btn--icon" aria-label="Add task">
            <Plus size={15} />
          </button>
        </form>
      </div>
      {view === "board" ? (
        <div className="board">
          {COLUMNS.map((col) => {
            const items = filtered.filter((t) => t.status === col);
            return (
              <section
                key={col}
                className={`board__col ${over === col ? "is-over" : ""}`}
                onDragOver={(e) => {
                  e.preventDefault();
                  setOver(col);
                }}
                onDragLeave={() => setOver(null)}
                onDrop={(e) => {
                  const id = e.dataTransfer.getData("text/task");
                  setOver(null);
                  if (id) move.mutate({ id, status: col });
                }}
                aria-label={TASK_STATUS_LABEL[col]}
              >
                <div className="board__head">
                  <span className="eyebrow">{TASK_STATUS_LABEL[col]}</span>
                  <span className="mono muted" style={{ fontSize: 11 }}>
                    {items.length}
                  </span>
                </div>
                {items.map((t) => (
                  <TaskCard key={t.id} task={t} onOpen={() => setOpen(t)} />
                ))}
              </section>
            );
          })}
        </div>
      ) : (
        <Timeline tasks={filtered} onOpen={setOpen} />
      )}
      {view === "board" && !filtered.length && (
        <div style={{ marginTop: 16 }}>
          <Empty title="No tasks yet">
            Use <strong>Generate plan</strong> to turn your gaps into scheduled work, or ask the Planner agent. <Columns3 size={12} /> <CalendarRange size={12} />
          </Empty>
        </div>
      )}
      {current && <TaskDialog task={current} onClose={() => setOpen(null)} />}
    </div>
  );
}
