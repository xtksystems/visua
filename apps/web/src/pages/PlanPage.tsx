/** Plan: board (drag between statuses), timeline, and task execution. */
import { Bot, CalendarRange, Columns3, Plus, Sparkles, Wand2 } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useRunAgent } from "../components/inspector/Inspector.tsx";
import { AgentBadge, CodeTag, Dialog, Empty, Segmented, toast } from "../components/ui/index.tsx";
import { QueryError } from "../components/ui/QueryError.tsx";
import { MemberPicker, type MemberAssignment } from "../components/work/MemberPicker.tsx";
import { useWorkspaceId } from "../lib/workspace.ts";
import { useCan } from "../lib/auth.ts";
import { api } from "../lib/api.ts";
import { TASK_STATUS_LABEL, codeOf, frameworkOf, shortDate } from "../lib/format.ts";
import { badgeOf, isThreatCatalog } from "../lib/frameworks.ts";
import { Markdown } from "../lib/markdown.tsx";
import { keys, useSearch, useTasks, useWorkspace, useWsMutation } from "../lib/queries.ts";
import type { MyWork, Task } from "../lib/types.ts";
import { split } from "../lib/media.ts";

const COLUMNS: Task["status"][] = ["backlog", "todo", "in-progress", "in-review", "blocked", "done"];
const PRIORITY_COLOR: Record<string, string> = {
  critical: "var(--color-status-at-risk)",
  high: "var(--color-status-in-progress)",
  medium: "var(--color-primary)",
  low: "var(--color-status-not-started)",
};

function TaskCard({ task, onOpen, saving, canWrite }: { task: Task; onOpen: () => void; saving: boolean; canWrite: boolean }) {
  const done = task.checklist.filter((c) => c.done).length;
  const overdue = task.status !== "done" && task.dueDate && task.dueDate < new Date().toISOString().slice(0, 10);
  return (
    <div className="card" draggable={canWrite && !saving} aria-busy={saving} onDragStart={(e) => e.dataTransfer.setData("text/task", task.id)} onClick={onOpen} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onOpen(); } }}>
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
        {task.dueDate ? <span style={{ color: overdue ? "var(--color-status-at-risk)" : undefined }}>· {overdue ? "Overdue" : "Due"} {shortDate(/^\d{4}-\d{2}-\d{2}$/.test(task.dueDate) ? `${task.dueDate}T12:00:00` : task.dueDate)}</span> : null}
        {task.assignee?.type === "agent" ? <AgentBadge label="agent" /> : task.assignee ? <span>· {task.assignee.name.split(" (")[0]}</span> : null}
        {saving && <span className="card__saving">Saving…</span>}
      </div>
    </div>
  );
}

type TaskPatch = Omit<Partial<Task>, "assignee" | "dueDate"> & { assignee?: MemberAssignment | null; dueDate?: string | null };
type TaskUpdate = { task: Task; suggestedLevels: { nodeId: string; code: string; from: number; to: number }[] };
type DetailsDraft = { assignee?: MemberAssignment | null; dueDate?: string; requirementIds?: string[] };

function sameAssignment(a: MemberAssignment | undefined, b: MemberAssignment | undefined) {
  return a?.type === b?.type && a?.id === b?.id && a?.name === b?.name;
}

/** The draft and pending callbacks belong to one workspace and task. */
export function TaskDialog(props: { task: Task; onClose: () => void; saving?: boolean }) {
  const ws = useWorkspaceId();
  return <TaskDialogDetails key={`${ws}:${props.task.id}`} {...props} />;
}

function TaskDialogDetails({ task, onClose, saving = false }: { task: Task; onClose: () => void; saving?: boolean }) {
  const ws = useWorkspaceId();
  const canWrite = useCan("work.write");
  const queryClient = useQueryClient();
  const workspace = useWorkspace(ws);
  const run = useRunAgent();
  const [draft, setDraft] = useState<DetailsDraft>({});
  const [searchText, setSearchText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const active = useRef(false);
  const writing = useRef(false);
  useEffect(() => {
    active.current = true;
    return () => { active.current = false; };
  }, []);
  const update = useWsMutation(ws, (patch: TaskPatch) =>
    api.patch<TaskUpdate>(`/workspaces/${encodeURIComponent(ws)}/tasks/${encodeURIComponent(task.id)}`, patch),
    { onError: (failure) => { if (active.current) setError(`Could not save task: ${failure.message}`); } },
  );
  const raise = useWsMutation(ws, (s: { nodeId: string; to: number }) => api.patch(`/workspaces/${encodeURIComponent(ws)}/requirements/${encodeURIComponent(s.nodeId)}`, { current: s.to }), {
    onError: (failure) => { if (active.current) setError(`Could not raise requirement level: ${failure.message}`); },
  });
  const blocked = !canWrite || saving || update.isPending;
  const assignee = draft.assignee === undefined ? task.assignee : draft.assignee ?? undefined;
  const dueDate = draft.dueDate ?? task.dueDate ?? "";
  const requirementIds = draft.requirementIds ?? task.requirementIds;
  const assigneeChanged = !sameAssignment(assignee, task.assignee);
  const dueDateChanged = dueDate !== (task.dueDate ?? "");
  const requirementsChanged = requirementIds.length !== task.requirementIds.length || requirementIds.some((id, i) => id !== task.requirementIds[i]);
  const dirty = assigneeChanged || dueDateChanged || requirementsChanged;
  const search = useSearch(searchText);
  const enabledFrameworks = new Set(workspace.data?.workspace.frameworks.filter((f) => f.enabled).map((f) => f.frameworkId));
  const results = searchText.trim().length >= 2 && !search.isPlaceholderData
    ? (search.data?.nodes ?? []).filter((n) => n.assessable && !isThreatCatalog(n.framework) && enabledFrameworks.has(n.framework))
    : [];

  const write = (patch: TaskPatch, onSuccess?: (result: TaskUpdate) => void) => {
    if (blocked || writing.current) return;
    writing.current = true;
    setError(null);
    update.mutate(patch, {
      onSuccess: (result) => {
        queryClient.setQueryData<Task[]>(keys.tasks(ws), (previous) => previous?.map((item) => item.id === task.id ? result.task : item));
        queryClient.setQueriesData<MyWork>({ queryKey: keys.myWork(ws) }, (previous) => previous ? { ...previous, tasks: previous.tasks.map((item) => item.id === task.id ? result.task : item) } : previous);
        if (active.current) onSuccess?.(result);
      },
      onSettled: () => { writing.current = false; },
    });
  };
  const setStatus = (status: Task["status"]) => write({ status }, (result) => {
    for (const s of result.suggestedLevels) {
      if (window.confirm(`Task done. Raise ${s.code} from level ${s.from} to ${s.to}?`)) raise.mutate({ nodeId: s.nodeId, to: s.to });
    }
  });
  return (
    <Dialog wide title={task.title} onClose={onClose}>
      {!canWrite && <p className="muted" role="note">Read-only access. You can view task details and open linked requirements.</p>}
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
                    disabled={blocked}
                    onChange={() => write({ checklist: task.checklist.map((x) => (x.id === c.id ? { ...x, done: !x.done } : x)) })}
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
              <select className="select" value={task.status} disabled={blocked} aria-label="Task status" onChange={(e) => setStatus(e.target.value as Task["status"])}>
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
            <dt>Start date</dt>
            <dd>
              {shortDate(task.startDate)} {task.effortHours ? `· ${task.effortHours} h` : ""}
            </dd>
            <dt>Origin</dt>
            <dd>{task.origin}</dd>
          </dl>
          <form
            className="panel stack"
            aria-label="Task details"
            style={{ gap: 12, minWidth: 0 }}
            onSubmit={(event) => {
              event.preventDefault();
              if (!dirty || (assignee?.type === "external" && !assignee.name.trim())) return;
              const patch: TaskPatch = {};
              if (assigneeChanged) patch.assignee = assignee ?? null;
              if (dueDateChanged) patch.dueDate = dueDate || null;
              if (requirementsChanged) patch.requirementIds = requirementIds;
              write(patch, () => {
                setDraft({});
                setSearchText("");
                toast("Task details saved");
              });
            }}
          >
            <MemberPicker label="Assignee" value={assignee} disabled={blocked} onChange={(next) => { setDraft((previous) => ({ ...previous, assignee: next ?? null })); setError(null); }} />
            <label className="field">
              <span className="label">Due date</span>
              <input className="input" type="date" value={dueDate} disabled={blocked} onChange={(event) => { setDraft((previous) => ({ ...previous, dueDate: event.target.value })); setError(null); }} />
            </label>
            <div className="stack" style={{ gap: 8 }}>
              <span className="label">Linked requirements</span>
              {requirementIds.length ? (
                <ul className="stack" aria-label="Linked requirements" style={{ margin: 0, padding: 0, gap: 6, listStyle: "none" }}>
                  {requirementIds.map((id) => (
                    <li key={id} className="row row--wrap" style={{ gap: 8 }}>
                      <CodeTag id={id} />
                      <button type="button" className="btn btn--quiet btn--sm" disabled={blocked} aria-label={`Remove ${codeOf(id)} requirement`} onClick={() => { setDraft((previous) => ({ ...previous, requirementIds: requirementIds.filter((linked) => linked !== id) })); setError(null); }}>Remove</button>
                    </li>
                  ))}
                </ul>
              ) : <span className="muted" style={{ fontSize: 12 }}>No linked requirements.</span>}
              <label className="field">
                <span className="label">Search requirements to link</span>
                <input className="input" aria-label="Search requirements to link" type="search" value={searchText} disabled={blocked} placeholder="Search a code or title…" onChange={(event) => setSearchText(event.target.value)} />
                <span className="field__hint">Choose an assessable requirement from an enabled framework.</span>
              </label>
              {searchText.trim().length >= 2 && (
                <div aria-live="polite">
                  {search.isFetching ? <p className="muted" style={{ margin: 0, fontSize: 12 }}>Searching requirements…</p> : null}
                  {search.error ? <div className="stack" role="alert" style={{ gap: 8 }}><span>Could not search requirements.</span><button type="button" className="btn btn--sm" disabled={blocked} onClick={() => void search.refetch()}>Retry search</button></div> : null}
                  {!search.error && !search.isPlaceholderData && results.length > 0 && (
                    <ul className="stack" aria-label="Matching requirements" style={{ margin: 0, padding: 0, gap: 8, listStyle: "none", maxHeight: 240, overflow: "auto" }}>
                      {results.map((node) => {
                        const linked = requirementIds.includes(node.id);
                        return <li key={node.id} className="stack" style={{ gap: 4 }}>
                          <div className="row row--wrap" style={{ gap: 8 }}>
                            <CodeTag id={node.id} />
                            <button type="button" className="btn btn--sm" disabled={blocked || linked} aria-label={linked ? `${node.code} already linked` : `Add ${node.code} requirement`} onClick={() => { setDraft((previous) => ({ ...previous, requirementIds: [...requirementIds, node.id] })); setError(null); }}>{linked ? "Linked" : "Add"}</button>
                          </div>
                          <span className="muted" style={{ fontSize: 12 }}>{node.title || node.text}</span>
                        </li>;
                      })}
                    </ul>
                  )}
                  {!search.error && !search.isFetching && !search.isPlaceholderData && !results.length && <p className="muted" style={{ margin: 0, fontSize: 12 }}>No assessable requirements match in enabled frameworks.</p>}
                </div>
              )}
            </div>
            {canWrite && <div className="row row--wrap" style={{ justifyContent: "flex-end", gap: 8 }}>
              <button type="button" className="btn btn--sm" disabled={!dirty || blocked} onClick={() => { setDraft({}); setSearchText(""); setError(null); }}>Cancel task changes</button>
              <button type="submit" className="btn btn--primary btn--sm" disabled={!dirty || blocked || (assignee?.type === "external" && !assignee.name.trim())}>{update.isPending ? "Saving…" : "Save task details"}</button>
            </div>}
          </form>
          {error && <div role="alert">{error}</div>}
          {canWrite && task.status !== "done" && (
            <button className="btn btn--agent" disabled={blocked} onClick={() => (run("task-executor", `Execute task: ${task.title}`, { taskId: task.id }), onClose())}>
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
                title={`${late ? "Overdue · " : ""}${t.title} · ${TASK_STATUS_LABEL[t.status]}`}
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
                {late ? "Overdue · " : ""}{t.title}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function PlanPage() {
  const ws = useWorkspaceId();
  const canWrite = useCan("work.write");
  const queryClient = useQueryClient();
  const taskQuery = useTasks(ws);
  const tasks = taskQuery.data ?? [];
  const workspace = useWorkspace(ws);
  const run = useRunAgent();
  const [searchParams, setSearchParams] = useSearchParams();
  const [view, setView] = useState<"board" | "timeline">("board");
  const [over, setOver] = useState<string | null>(null);
  const [framework, setFramework] = useState("all");
  const [newTitle, setNewTitle] = useState("");
  const pendingMovesRef = useRef<Record<string, Task["status"]>>({});
  const [pendingMoves, setPendingMoves] = useState<Record<string, Task["status"]>>({});
  const clearPendingMove = (id: string) => {
    const next = { ...pendingMovesRef.current };
    delete next[id];
    pendingMovesRef.current = next;
    setPendingMoves(next);
  };
  const move = useMutation({
    mutationFn: (v: { id: string; status: Task["status"] }) => api.patch<{ task: Task }>(`/workspaces/${encodeURIComponent(ws)}/tasks/${v.id}`, { status: v.status }),
    onSuccess: ({ task }, { id }) => {
      queryClient.setQueryData<Task[]>(keys.tasks(ws), (current) => current?.map((item) => item.id === id ? task : item));
      void Promise.allSettled([
        queryClient.invalidateQueries({ queryKey: ["ws", ws] }),
        queryClient.invalidateQueries({ queryKey: keys.workspaces }),
      ]).then(() => clearPendingMove(id));
    },
    onError: (error, { id }) => {
      clearPendingMove(id);
      toast(`Could not move task: ${(error as Error).message}`, "error");
      void queryClient.invalidateQueries({ queryKey: ["ws", ws] });
    },
  });
  const plan = useWsMutation(ws, (fw: string) => api.post<Task[]>(`/workspaces/${encodeURIComponent(ws)}/plan`, { framework: fw, maxTasks: 10 }), {
    onError: (error) => toast(`Could not generate plan: ${error.message}`, "error"),
  });
  const create = useWsMutation(ws, (title: string) => api.post(`/workspaces/${encodeURIComponent(ws)}/tasks`, { title, status: "todo" }), {
    onError: (error) => toast(`Could not add task: ${error.message}`, "error"),
  });
  const filtered = useMemo(() => (framework === "all" ? tasks : tasks.filter((t) => t.requirementIds.some((id) => frameworkOf(id) === framework))).map((task) => {
    const status = pendingMoves[task.id];
    return status ? { ...task, status } : task;
  }), [tasks, framework, pendingMoves]);
  const selectedId = searchParams.get("task");
  const selectedTask = selectedId ? tasks.find((t) => t.id === selectedId) : undefined;
  const current = selectedTask ? { ...selectedTask, status: pendingMoves[selectedTask.id] ?? selectedTask.status } : null;
  const openTask = (task: Task) => setSearchParams((previous) => {
    const next = new URLSearchParams(previous);
    next.set("task", task.id);
    return next;
  });
  const closeTask = () => setSearchParams((previous) => {
    const next = new URLSearchParams(previous);
    next.delete("task");
    return next;
  }, { replace: true });
  useEffect(() => {
    if (!selectedId || selectedTask || !taskQuery.isSuccess || taskQuery.isFetching) return;
    setSearchParams((previous) => {
      const next = new URLSearchParams(previous);
      next.delete("task");
      return next;
    }, { replace: true });
    toast("This task is no longer available in this workspace");
  }, [selectedId, selectedTask, taskQuery.isSuccess, taskQuery.isFetching, setSearchParams]);
  const primary = workspace.data?.frameworks[0]?.id ?? "nist-csf-2.0";
  if (taskQuery.error && !taskQuery.data) return <QueryError title="Unable to load the action plan" error={taskQuery.error} retry={() => taskQuery.refetch()} />;
  if (!taskQuery.data) return <div className="page muted" role="status">Loading action plan…</div>;
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
            disabled={!canWrite || plan.isPending}
            onClick={() =>
              plan.mutate(primary, {
                onSuccess: (created) => toast(created.length ? `Planned ${created.length} task(s) from official guidance` : "Every gap already has an open task"),
              })
            }
          >
            <Wand2 size={14} /> {plan.isPending ? "Generating…" : "Generate plan"}
          </button>
          <button className="btn btn--agent" disabled={!canWrite} onClick={() => run("planner", "Plan the next sprint of work for our highest-priority gaps", { framework: primary })}>
            <Sparkles size={14} /> Plan with agent
          </button>
        </div>
      </header>
      {!canWrite && <p className="muted" role="note">Read-only access. You can view tasks, checklists and the timeline; contributors and above manage the plan.</p>}
      {taskQuery.error && <div className="panel row row--wrap" role="alert" style={{ marginBottom: 16, gap: 12 }}><span>Could not refresh the action plan. Showing the last loaded tasks.</span><button className="btn btn--sm" onClick={() => void taskQuery.refetch()}>Retry</button></div>}
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
            if (canWrite && newTitle.trim()) create.mutate(newTitle.trim(), {
              onSuccess: () => { setNewTitle(""); toast("Task added to To do"); },
            });
          }}
        >
          <input className="input" style={{ width: 280, maxWidth: "100%", minWidth: 0 }} disabled={!canWrite} aria-label="Task title" placeholder="Quick add a task…" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} />
          <button className="btn btn--icon" aria-label={create.isPending ? "Adding task" : "Add task"} disabled={!canWrite || create.isPending || !newTitle.trim()}>
            {create.isPending ? <span className="btn__spinner" aria-hidden /> : <Plus size={15} />}
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
                  if (!canWrite) return;
                  e.preventDefault();
                  setOver(col);
                }}
                onDragLeave={() => setOver(null)}
                onDrop={(e) => {
                  if (!canWrite) return;
                  const id = e.dataTransfer.getData("text/task");
                  setOver(null);
                  if (!id || tasks.find((task) => task.id === id)?.status === col) return;
                  if (pendingMovesRef.current[id]) {
                    toast("This task is still saving its previous move");
                    return;
                  }
                  const next = { ...pendingMovesRef.current, [id]: col };
                  pendingMovesRef.current = next;
                  setPendingMoves(next);
                  move.mutate({ id, status: col });
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
                  <TaskCard key={t.id} task={t} canWrite={canWrite} saving={!!pendingMoves[t.id]} onOpen={() => openTask(t)} />
                ))}
              </section>
            );
          })}
        </div>
      ) : (
        <Timeline tasks={filtered} onOpen={openTask} />
      )}
      {view === "board" && !filtered.length && (
        <div style={{ marginTop: 16 }}>
          <Empty title="No tasks yet">
            Use <strong>Generate plan</strong> to turn your gaps into scheduled work, or ask the Planner agent. <Columns3 size={12} /> <CalendarRange size={12} />
          </Empty>
        </div>
      )}
      {current && <TaskDialog key={current.id} task={current} saving={!!pendingMoves[current.id]} onClose={closeTask} />}
    </div>
  );
}
