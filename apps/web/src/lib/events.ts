/** Live workspace events over SSE → cache invalidation + live agent activity. */
import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { useAgentActivity } from "../state/agentActivity.ts";
import { keys } from "./queries.ts";
import type { AgentStep } from "@visua/core";
import type { VisuaEvent } from "./types.ts";

export function useWorkspaceEvents(ws: string | undefined): void {
  const qc = useQueryClient();
  useEffect(() => {
    if (!ws) return;
    const source = new EventSource(`/api/workspaces/${encodeURIComponent(ws)}/events`);
    const pending = new Set<string>();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const invalidate = (...groups: string[]) => {
      for (const g of groups) pending.add(g);
      if (timer) return;
      timer = setTimeout(() => {
        timer = undefined;
        const groups = [...pending];
        pending.clear();
        for (const g of groups) {
          if (g === "all") void qc.invalidateQueries({ queryKey: ["ws", ws] });
          else void qc.invalidateQueries({ queryKey: ["ws", ws, g] });
        }
        void qc.invalidateQueries({ queryKey: keys.workspace(ws), exact: true });
        void qc.invalidateQueries({ queryKey: keys.workspaces });
      }, 250);
    };
    source.addEventListener("visua", (msg) => {
      const event = JSON.parse((msg as MessageEvent<string>).data) as VisuaEvent;
      const activity = useAgentActivity.getState();
      switch (event.type) {
        case "agent.step": {
          const { runId, agent, step } = event.data as { runId: string; agent: string; step: AgentStep };
          activity.pushStep(runId, agent, step);
          invalidate("run");
          break;
        }
        case "agent.run.created":
        case "agent.run.updated": {
          const run = event.data as { id: string; status: string; agent: string };
          activity.setRunStatus(run.id, run.agent, run.status);
          invalidate("runs", "run", "proposals");
          break;
        }
        case "proposal.created":
        case "proposal.updated":
          invalidate("proposals", "run", "node");
          break;
        case "state.updated":
          invalidate("state", "node");
          break;
        case "task.created":
        case "task.updated":
        case "task.deleted":
          invalidate("tasks", "state", "node");
          break;
        case "evidence.created":
        case "evidence.updated":
          invalidate("evidence", "state", "node");
          break;
        case "policy.created":
        case "policy.updated":
          invalidate("policies");
          break;
        case "risk.updated":
          invalidate("risks");
          break;
        case "check.completed":
          invalidate("checks", "connectors", "state", "node", "evidence");
          break;
        case "activity":
          invalidate("activity", "audit");
          break;
        case "workspace.updated":
          invalidate("all");
          break;
      }
    });
    return () => {
      if (timer) clearTimeout(timer);
      source.close();
    };
  }, [ws, qc]);
}
