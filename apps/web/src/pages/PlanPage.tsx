/** Plan: urgency list, board (drag between statuses), timeline, and task execution. */
import { Bot, Plus, Sparkles, Wand2 } from "lucide-react";
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
import { DAY_MS, PLAN_STATUSES, filterPlanTasks, planStatusCounts, projectTaskTimeline, readPlanQuery, sortPlanTasks, taskDay, taskNextAction, taskOverdue, taskUrgency, writePlanQuery, type PlanQuery, type PlanStatus, type PlanView } from "../lib/plan-urgency.ts";
import "./plan.css";

const COLUMNS = PLAN_STATUSES;
const PRIORITY_COLOR: Record<string, string> = {
  critical: "var(--color-status-at-risk)",
  high: "var(--color-status-in-progress)",
  medium: "var(--color-primary)",
  low: "var(--color-status-not-started)",
};

function TaskCard({ task, onOpen, saving, canWrite }: { task: Task; onOpen: () => void; saving: boolean; canWrite: boolean }) {
  const done = task.checklist.filter((c) => c.done).length;
  const overdue = taskOverdue(task);
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
        {task.dueDate ? <span style={{ color: overdue ? "var(--color-status-at-risk)" : undefined }}>· {taskDay(task.dueDate) === null ? "Invalid due date" : `${overdue ? "Overdue" : "Due"} ${planDate(taskDay(task.dueDate))}`}</span> : null}
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

function planDate(day: number | null): string {
  return day === null ? "—" : new Date(day).toLocaleDateString("en", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
}

function TaskOwner({ task }: { task: Task }) {
  if (!task.assignee) return <span className="muted">Unassigned</span>;
  if (task.assignee.type === "agent") return <AgentBadge label={task.assignee.name} />;
  return <span>{task.assignee.name}{task.assignee.type === "external" ? " (external)" : ""}</span>;
}

function TaskDue({ task, now }: { task: Task; now: number }) {
  const due = taskDay(task.dueDate);
  const overdue = taskOverdue(task, now);
  return <span className={overdue ? "plan-overdue" : undefined}>{due === null ? task.dueDate ? "Invalid due date" : "No due date" : <>{overdue ? "Overdue · " : ""}<time dateTime={new Date(due).toISOString().slice(0, 10)}>{planDate(due)}</time></>}</span>;
}

function UrgencyList({ tasks, now, onOpen }: { tasks: Task[]; now: number; onOpen: (task: Task) => void }) {
  return <section aria-labelledby="plan-list-title">
    <h2 className="section-title" id="plan-list-title">Tasks by urgency</h2>
    <p className="muted plan-caption">Blocked, overdue, then awaiting review; followed by due today, the next 7 days, and upcoming work. Priority and due date break ties. Completed work is last.</p>
    <ol className="plan-list">
      {tasks.map((task) => {
        const urgency = taskUrgency(task, now);
        const statusLabel = TASK_STATUS_LABEL[task.status] ?? task.status;
        return <li key={task.id} className="panel plan-task" data-task-id={task.id}>
          <div className="plan-task__reason">
            <span className={`plan-urgency plan-urgency--${urgency.tone}`}>{urgency.label}</span>
            <span className="muted">{urgency.label.toLowerCase() === statusLabel.toLowerCase() ? "" : `${statusLabel} · `}{task.priority}</span>
          </div>
          <div className="plan-task__subject">
            <button className="btn btn--quiet plan-task__title" aria-label={`Open task ${task.title}`} onClick={() => onOpen(task)}>{task.title}</button>
            {task.requirementIds.length ? <div className="row row--wrap" aria-label="Affected requirements">{task.requirementIds.map((id) => <CodeTag key={id} id={id} />)}</div> : <span className="muted">No linked requirements</span>}
          </div>
          <dl className="plan-task__facts">
            <div><dt>Owner</dt><dd><TaskOwner task={task} /></dd></div>
            <div><dt>Due date · UTC</dt><dd><TaskDue task={task} now={now} /></dd></div>
            <div><dt>Next action</dt><dd>{taskNextAction(task)}</dd></div>
          </dl>
        </li>;
      })}
    </ol>
  </section>;
}

function Timeline({ tasks, now, onOpen }: { tasks: Task[]; now: number; onOpen: (t: Task) => void }) {
  const entries = projectTaskTimeline(tasks);
  const dated = entries.filter((entry) => entry.due !== null);
  const min = dated.length ? Math.min(...dated.map((entry) => entry.start ?? entry.due!)) - 3 * DAY_MS : 0;
  const max = dated.length ? Math.max(...dated.map((entry) => entry.due!)) + 5 * DAY_MS : DAY_MS;
  const span = max - min;
  const x = (day: number) => `${((day - min) / span) * 100}%`;
  const today = Math.floor(now / DAY_MS) * DAY_MS;
  return <section className="stack" aria-labelledby="plan-timeline-title">
    <div>
      <h2 className="section-title" id="plan-timeline-title">Task timeline</h2>
      <p className="muted plan-caption">Dates use UTC. A diamond marks a due date without a usable start; a bar spans recorded start and due dates. Every task also appears in the schedule table.</p>
    </div>
    {dated.length ? <div className="panel plan-scroll" role="region" aria-label="Task timeline chart" tabIndex={0}>
      <div className="plan-timeline">
        <div className="plan-timeline__row plan-timeline__axis"><span>Task</span><div><span>{planDate(min)}</span><span>{planDate(max)}</span></div></div>
        {dated.map((entry) => {
          const late = taskOverdue(entry.task, now);
          const description = entry.kind === "due" ? `Due date only: ${planDate(entry.due)}` : `${planDate(entry.start)} to ${planDate(entry.due)}`;
          return <div className="plan-timeline__row" key={entry.task.id}>
            <span className="plan-timeline__label">{entry.task.title}</span>
            <div className="plan-timeline__track">
              {today >= min && today <= max && <span className="plan-timeline__today" style={{ left: x(today) }} title={`Today · ${planDate(today)}`} />}
              <button
                className={`plan-timeline__event ${entry.kind === "due" ? "plan-timeline__event--due" : ""} ${late ? "is-overdue" : ""} ${entry.task.status === "done" ? "is-done" : ""}`}
                data-task-id={entry.task.id}
                data-schedule-kind={entry.kind}
                style={{ left: x(entry.start ?? entry.due!), width: entry.kind === "interval" ? `max(${((entry.due! + DAY_MS - entry.start!) / span) * 100}%, 24px)` : undefined }}
                aria-label={`${entry.task.title} · ${description}${late ? " · Overdue" : ""}`}
                title={`${entry.task.title} · ${description}${late ? " · Overdue" : ""}${entry.note ? ` · ${entry.note}` : ""}`}
                onClick={() => onOpen(entry.task)}
              >{entry.kind === "due" ? "◆" : late ? "Overdue" : TASK_STATUS_LABEL[entry.task.status]}</button>
            </div>
          </div>;
        })}
      </div>
    </div> : <Empty title="No scheduled tasks">Add a due date in task details to place work on the timeline. All filtered tasks are listed below.</Empty>}
    <div className="plan-scroll" role="region" aria-label="Task schedule table" tabIndex={0}>
      <table className="table plan-schedule">
        <caption>Task schedule · {tasks.length} filtered tasks · UTC dates</caption>
        <thead><tr><th scope="col">Task</th><th scope="col">Status</th><th scope="col">Start date</th><th scope="col">Due date</th><th scope="col">Schedule</th></tr></thead>
        <tbody>{entries.map((entry) => <tr key={entry.task.id}>
          <th scope="row"><button className="btn btn--quiet plan-task__title" onClick={() => onOpen(entry.task)}>{entry.task.title}</button></th>
          <td>{TASK_STATUS_LABEL[entry.task.status]}</td>
          <td>{entry.task.startDate ? planDate(taskDay(entry.task.startDate)) : "Not set"}</td>
          <td><TaskDue task={entry.task} now={now} /></td>
          <td>{entry.note ?? (entry.kind === "due" ? "Due date only" : "Start to due date")}</td>
        </tr>)}</tbody>
      </table>
    </div>
  </section>;
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
  const { view, framework, status } = readPlanQuery(searchParams);
  const setFilters = (patch: Partial<PlanQuery>) => setSearchParams((previous) => writePlanQuery(previous, patch));
  const [over, setOver] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    // Refresh an open plan at the UTC day boundary, including after tab suspension.
    const refresh = () => setNow(Date.now());
    const timer = window.setTimeout(refresh, DAY_MS - now % DAY_MS + 50);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [now]);
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
  const scoped = useMemo(() => filterPlanTasks(tasks.map((task) => {
    const nextStatus = pendingMoves[task.id];
    return nextStatus ? { ...task, status: nextStatus } : task;
  }), framework), [tasks, framework, pendingMoves]);
  const filtered = useMemo(() => sortPlanTasks(filterPlanTasks(scoped, "all", status), now), [scoped, status, now]);
  const counts = planStatusCounts(scoped);
  const frameworks = [...new Set([...(workspace.data?.frameworks.map((item) => item.id) ?? []), ...tasks.flatMap((task) => task.requirementIds.map(frameworkOf))])].filter((id) => id && !isThreatCatalog(id));
  const selectedId = searchParams.get("task");
  const selectedTask = selectedId ? tasks.find((t) => t.id === selectedId) : undefined;
  const current = selectedTask ? { ...selectedTask, status: pendingMoves[selectedTask.id] ?? selectedTask.status } : null;
  const statusSummaryRef = useRef<HTMLElement>(null);
  const previousSelectedRef = useRef<string | null>(null);
  useEffect(() => {
    const previous = previousSelectedRef.current;
    previousSelectedRef.current = current?.id ?? null;
    if (!previous || current) return;
    // The shared dialog restores its trigger; a status edit can filter that trigger out.
    queueMicrotask(() => {
      if (document.activeElement === document.body) statusSummaryRef.current?.querySelector<HTMLButtonElement>('button[aria-pressed="true"]')?.focus();
    });
  }, [current?.id]);
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
    <div className="page plan-page">
      <header className="page__header">
        <div>
          <div className="eyebrow">Plan</div>
          <h1>Action plan</h1>
          <p>Resolve blockers, review finished work, and act on approaching due dates. Open a task to work its checklist, update details, or hand it to an agent.</p>
        </div>
        <div className="page__actions">
          <Segmented<PlanView>
            label="View"
            value={view}
            onChange={(next) => setFilters({ view: next })}
            options={[
              { id: "list", label: "List" },
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
      {workspace.error && <div className="panel row row--wrap" role="alert"><span>Could not load workspace framework details.</span><button className="btn btn--sm" onClick={() => void workspace.refetch()}>Retry framework details</button></div>}
      <div className="row row--wrap" style={{ marginBottom: 16, gap: 8 }}>
        <select className="select" style={{ width: 220, maxWidth: "100%" }} value={framework} onChange={(e) => setFilters({ framework: e.target.value })} aria-label="Filter by framework">
          <option value="all">All frameworks</option>
          {framework !== "all" && !frameworks.includes(framework) && <option value={framework}>Unavailable framework ({framework})</option>}
          {frameworks.map((id) => (
            <option key={id} value={id}>
              {badgeOf(id)}
            </option>
          ))}
        </select>
        <span className="muted" style={{ fontSize: 13 }} role="status">
          Showing {filtered.length} of {scoped.length} task(s) in {framework === "all" ? "all frameworks" : badgeOf(framework)}
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
      <section ref={statusSummaryRef} className="plan-status-summary" aria-label="Task status counts">
        <p className="muted plan-caption">Counts include every status in {framework === "all" ? "all frameworks" : badgeOf(framework)}, before the status filter.</p>
        <Segmented<PlanStatus> label="Filter tasks by status" value={status} onChange={(next) => setFilters({ status: next })} options={[
          { id: "all", label: `All statuses (${scoped.length})` },
          ...COLUMNS.map((column) => ({ id: column, label: `${TASK_STATUS_LABEL[column]} (${counts[column]})` })),
        ]} />
      </section>
      {!filtered.length ? <Empty title={tasks.length ? "No tasks match these filters" : "No tasks yet"}>
        {tasks.length ? <button className="btn btn--sm" onClick={() => setFilters({ framework: "all", status: "all" })}>Clear task filters</button> : canWrite ? "Add a task or use Generate plan to turn your gaps into work." : "No tasks have been added to this workspace."}
      </Empty> : view === "list" ? <UrgencyList tasks={filtered} now={now} onOpen={openTask} /> : view === "board" ? (
        <div className="plan-scroll" role="region" aria-label="Task board" tabIndex={0}>
        <p className="muted plan-caption">Scroll to see all six statuses. Open a card for task details{canWrite ? ", or drag it to another column" : ""}.</p>
        <div className="board plan-board">
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
        </div>
      ) : (
        <Timeline tasks={filtered} now={now} onOpen={openTask} />
      )}
      {current && <TaskDialog key={current.id} task={current} saving={!!pendingMoves[current.id]} onClose={closeTask} />}
    </div>
  );
}
