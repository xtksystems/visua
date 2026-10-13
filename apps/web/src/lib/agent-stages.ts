import type { AgentRun, AgentStage, Proposal } from "@visua/core";

export type StageState = "waiting" | "active" | "complete" | "recorded" | "not-needed" | "not-recorded" | "not-reached" | "failed" | "cancelled" | "partial" | "rejected";
export interface RunStage {
  id: AgentStage;
  label: string;
  state: StageState;
  detail: string;
}
export interface RunStages {
  stages: RunStage[];
  current: AgentStage | null;
  summary: string;
  blocker?: string;
}

export const STAGE_STATE_LABELS: Record<StageState, string> = {
  waiting: "Not yet reached", active: "In progress", complete: "Complete", recorded: "Recorded before interruption",
  "not-needed": "Not needed", "not-recorded": "Not recorded", "not-reached": "Not reached",
  failed: "Failed", cancelled: "Cancelled", partial: "Mixed outcomes", rejected: "Rejected",
};

/** Project only persisted lifecycle facts and proposal outcomes, never step title text. */
export function agentStages(run: AgentRun, proposals: readonly Proposal[]): RunStages {
  // Keep this usable even if a caller accidentally passes a workspace-wide proposal list.
  const changes = proposals.filter((p) => p.workspaceId === run.workspaceId && p.runId === run.id);
  const tracked = run.stageHistory !== undefined;
  const history = run.stageHistory ?? [];
  const interrupted = run.status === "failed" || run.status === "cancelled";
  const generating = run.status === "running" || run.status === "queued";
  const analyzed = history.some((event) => event.stage === "analyze" && event.status === "completed");
  const emptyState: StageState = !tracked ? "not-recorded" : interrupted ? "not-reached" : analyzed && !changes.length ? "not-needed" : "waiting";
  const stages: RunStage[] = ["collect", "analyze"].map((value) => {
    const id = value as "collect" | "analyze";
    const facts = history.filter((event) => event.stage === id);
    const completed = facts.some((event) => event.status === "completed");
    const started = facts.some((event) => event.status === "started");
    const state: StageState = completed ? "complete" : started && interrupted ? run.status as "failed" | "cancelled" : started && generating ? "active" : started ? "not-recorded" : !tracked ? "not-recorded" : interrupted ? "not-reached" : "waiting";
    return {
      id, label: id === "collect" ? "Collect" : "Analyze", state,
      detail: completed ? id === "collect" ? "Initial workspace snapshot loaded." : "Agent execution finished. Its assessment still requires review."
        : started && interrupted ? id === "collect" ? "Initial snapshot collection did not finish." : "Agent execution did not finish."
        : started ? id === "collect" ? "Loading the initial workspace snapshot." : "Agent execution, including any tool calls and proposal generation."
        : !tracked ? "This run predates recorded stage boundaries." : id === "collect" ? "Waiting for the run to start." : "Analysis has not started.",
    };
  });
  const count = (status: Proposal["status"]) => changes.filter((p) => p.status === status).length;
  const pending = count("pending"), applied = count("applied"), failed = count("failed"), rejected = count("rejected"), approved = count("approved");
  const decided = changes.filter((p) => p.status !== "pending");
  const automatic = decided.filter((p) => p.decidedBy === "autonomy").length;
  const reviewed = decided.filter((p) => p.decidedBy && p.decidedBy !== "autonomy").length;
  const unknown = decided.length - automatic - reviewed;
  const decisionParts = [pending ? `${pending} awaiting a decision` : "", reviewed ? `${reviewed} recorded decision${reviewed === 1 ? "" : "s"}` : "", automatic ? `${automatic} under granted autonomy` : "", unknown ? `${unknown} decision source not recorded` : ""].filter(Boolean);
  const reviewState: StageState = pending ? "active" : reviewed ? "complete" : automatic && !unknown ? "not-needed" : changes.length ? "not-recorded" : emptyState;
  const outcomes = [applied ? `${applied} applied` : "", failed ? `${failed} failed` : "", rejected ? `${rejected} rejected` : "", pending ? `${pending} pending` : "", approved ? `${approved} approved, application not recorded` : ""].filter(Boolean);
  let applyState: StageState = emptyState;
  if (changes.length) {
    if (applied === changes.length) applyState = "complete";
    else if (applied || (failed && (rejected || pending || approved))) applyState = "partial";
    else if (failed) applyState = "failed";
    else if (rejected === changes.length) applyState = "rejected";
    else if (approved) applyState = "not-recorded";
    else applyState = interrupted ? "not-reached" : "waiting";
  }
  stages.push(
    { id: "propose", label: "Propose", state: changes.length ? generating ? "active" : interrupted ? "recorded" : "complete" : emptyState, detail: changes.length ? `${changes.length} proposed change${changes.length === 1 ? "" : "s"} recorded.${generating ? " More may follow." : ""}` : analyzed ? "The agent produced no proposed changes." : "No proposed changes recorded." },
    { id: "review", label: "Review", state: reviewState, detail: decisionParts.length ? `${decisionParts.join(" · ")}.` : analyzed && !changes.length ? "No proposed changes to review." : "Review begins when proposals are available." },
    { id: "apply", label: "Apply", state: applyState, detail: outcomes.length ? `${outcomes.join(" · ")}.` : analyzed && !changes.length ? "No changes to apply." : "Only successfully applied changes count as complete." },
  );
  const activeRuntime = stages.find((stage) => stage.state === "active" && (stage.id === "collect" || stage.id === "analyze"));
  const current = interrupted ? stages.find((stage) => (stage.id === "collect" || stage.id === "analyze") && stage.state === run.status)?.id ?? null : generating ? activeRuntime?.id ?? null : pending ? "review" : null;
  let summary = current && !interrupted ? `Current stage: ${stages.find((stage) => stage.id === current)!.label}` : run.status === "queued" ? "Queued — waiting to start" : generating ? "Running — stage not recorded" : "Run finished";
  let blocker: string | undefined;
  if (interrupted) {
    summary = `Run ${run.status}${current ? ` during ${stages.find((stage) => stage.id === current)!.label}` : ""}`;
    blocker = run.status === "failed" ? run.error || "Agent execution failed. Inspect the flight recorder before starting another run." : "Execution was stopped. Any recorded proposal outcomes are shown below.";
  } else if (pending) blocker = `${pending} proposal${pending === 1 ? " needs" : "s need"} a decision. Inspect exact changes and sources before approval.`;
  else if (failed) { summary = "Changes need attention"; blocker = `${failed} proposed change${failed === 1 ? " could" : "s could"} not be applied. Inspect the proposal failure before creating a replacement.`; }
  else if (!generating && changes.length) summary = applied === changes.length ? "All proposed changes applied" : applied ? "Some proposed changes applied" : rejected === changes.length ? "All proposed changes rejected" : "Application outcome not recorded";
  else if (analyzed && !generating) summary = "Completed without proposed changes";
  return { stages, current, summary, ...(blocker ? { blocker } : {}) };
}
