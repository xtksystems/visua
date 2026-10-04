/** The signed-in member's assigned tasks and requirements. */
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CodeTag, Empty, FrameworkBadge, StatusChip } from "../components/ui/index.tsx";
import { QueryError } from "../components/ui/QueryError.tsx";
import { useCan } from "../lib/auth.ts";
import { frameworkOf, shortDate, TASK_STATUS_LABEL } from "../lib/format.ts";
import { useMyWork } from "../lib/queries.ts";
import { useWorkspaceId } from "../lib/workspace.ts";
import { TaskDialog } from "./PlanPage.tsx";

function DueDate({ date, completed = false }: { date?: string; completed?: boolean }) {
  if (!date) return <span className="muted">No due date</span>;
  const overdue = !completed && date < new Date().toISOString().slice(0, 10);
  return <span style={{ color: overdue ? "var(--color-status-at-risk)" : undefined }}>{overdue ? "Overdue" : "Due"} {shortDate(/^\d{4}-\d{2}-\d{2}$/.test(date) ? `${date}T12:00:00` : date)}</span>;
}

export function MyWorkPage() {
  const ws = useWorkspaceId();
  const canWrite = useCan("work.write");
  const work = useMyWork(ws);
  const [showCompleted, setShowCompleted] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selectedTask = work.data?.tasks.find((task) => task.id === selectedId);
  // A refreshed assignment set owns the selection; removed work must not retain a dialog snapshot.
  useEffect(() => {
    if (selectedId && work.isSuccess && !selectedTask) setSelectedId(null);
  }, [selectedId, selectedTask, work.isSuccess]);

  if (work.error && !work.data) return <QueryError title="Unable to load your work" error={work.error} retry={() => work.refetch()} />;
  if (!work.data) return <div className="page muted" role="status">Loading your work…</div>;
  const tasks = [...work.data.tasks]
    .filter((task) => showCompleted || task.status !== "done")
    .sort((a, b) => (a.dueDate ?? "9999-12-31").localeCompare(b.dueDate ?? "9999-12-31") || a.title.localeCompare(b.title));
  const requirements = [...work.data.requirements]
    .sort((a, b) => (a.state.dueDate ?? "9999-12-31").localeCompare(b.state.dueDate ?? "9999-12-31") || a.code.localeCompare(b.code));
  const completed = work.data.tasks.filter((task) => task.status === "done").length;

  return (
    <div className="page stack" style={{ gap: 24 }}>
      <header className="page__header">
        <div>
          <div className="eyebrow">My work</div>
          <h1>Assigned to you</h1>
          <p>Your tasks and requirements in this workspace. Open a task to work its checklist or update its details; open a requirement to review its assessment.</p>
        </div>
        <div className="page__actions"><Link className="btn" to={`/w/${encodeURIComponent(ws)}/plan`}>View action plan</Link></div>
      </header>
      {!canWrite && <p className="muted" role="note">Read-only access. You can view assigned work and open linked requirements.</p>}
      {work.error && <div className="panel row row--wrap" role="alert" style={{ gap: 12 }}><span>Could not refresh your work. Showing the last loaded assignments.</span><button className="btn btn--sm" onClick={() => void work.refetch()}>Retry</button></div>}
      <section className="stack" aria-labelledby="my-work-tasks" style={{ gap: 12 }}>
        <div className="row row--wrap" style={{ gap: 12 }}>
          <h2 id="my-work-tasks" className="section-title" style={{ margin: 0 }}>Tasks <span className="muted">({tasks.length})</span></h2>
          <span style={{ flex: 1 }} />
          <label className="row" style={{ gap: 8, fontSize: 13 }}><input type="checkbox" checked={showCompleted} onChange={(event) => setShowCompleted(event.target.checked)} />Show completed{completed ? ` (${completed})` : ""}</label>
        </div>
        {tasks.length ? tasks.map((task) => (
          <article className="panel stack" key={task.id} style={{ gap: 10 }}>
            <div className="row row--wrap" style={{ alignItems: "flex-start", gap: 12 }}>
              <button className="btn btn--quiet" style={{ textAlign: "left", whiteSpace: "normal", overflowWrap: "anywhere", justifyContent: "flex-start", minWidth: 0, padding: 0, fontWeight: 500 }} aria-label={`Open task ${task.title}`} onClick={() => setSelectedId(task.id)}>{task.title}</button>
              <span style={{ flex: 1 }} />
              <span className="muted" style={{ fontSize: 12 }}>{TASK_STATUS_LABEL[task.status]}</span>
            </div>
            <div className="row row--wrap" style={{ gap: 12, fontSize: 12 }}>
              <DueDate date={task.dueDate} completed={task.status === "done"} />
              <span className="muted">{task.priority} priority · {task.kind}</span>
              {task.checklist.length > 0 && <span className="muted">Checklist {task.checklist.filter((item) => item.done).length}/{task.checklist.length}</span>}
            </div>
            {task.requirementIds.length > 0 && <div className="row row--wrap" aria-label="Linked requirements" style={{ gap: 6 }}>{task.requirementIds.map((id) => <CodeTag key={id} id={id} />)}</div>}
          </article>
        )) : <Empty title={showCompleted ? "No tasks assigned to you" : "No open tasks assigned to you"}>{completed && !showCompleted ? "Show completed to review your finished tasks." : "Assign a task to your member account from the action plan."}</Empty>}
      </section>
      <section className="stack" aria-labelledby="my-work-requirements" style={{ gap: 12 }}>
        <h2 id="my-work-requirements" className="section-title" style={{ margin: 0 }}>Requirements <span className="muted">({requirements.length})</span></h2>
        {requirements.length ? requirements.map((requirement) => (
          <article className="panel stack" key={requirement.id} style={{ gap: 10 }}>
            <div className="row row--wrap" style={{ gap: 8 }}>
              <FrameworkBadge frameworkId={frameworkOf(requirement.id)} />
              <CodeTag id={requirement.id} />
              <span style={{ flex: 1 }} />
              <StatusChip status={requirement.status} />
            </div>
            {requirement.title && <div style={{ fontWeight: 500, overflowWrap: "anywhere" }}>{requirement.title}</div>}
            <div style={{ fontSize: 12 }}><DueDate date={requirement.state.dueDate} completed={requirement.status === "implemented" || requirement.status === "verified" || requirement.status === "not-applicable"} /></div>
          </article>
        )) : <Empty title="No requirements assigned to you">Choose your member account as the owner in a requirement's assessment.</Empty>}
      </section>
      {selectedTask && <TaskDialog key={selectedTask.id} task={selectedTask} onClose={() => setSelectedId(null)} />}
    </div>
  );
}
