/** Live agent activity from SSE: drives terracotta comets in the scene and the activity ticker. */
import { create } from "zustand";
import type { AgentStep } from "@visua/core";

export interface LiveStep {
  runId: string;
  agent: string;
  step: AgentStep;
  receivedAt: number;
}

interface AgentActivityState {
  steps: LiveStep[];
  running: Record<string, { agent: string; status: string }>;
  /** Node ids touched in the last few seconds → pulse + comet targets. */
  hot: Record<string, number>;
  pushStep: (runId: string, agent: string, step: AgentStep) => void;
  setRunStatus: (runId: string, agent: string, status: string) => void;
}

export const useAgentActivity = create<AgentActivityState>((set) => ({
  steps: [],
  running: {},
  hot: {},
  pushStep: (runId, agent, step) =>
    set((s) => {
      const now = Date.now();
      const hot = { ...s.hot };
      for (const id of step.nodeIds ?? []) hot[id] = now;
      for (const [id, t] of Object.entries(hot)) if (now - t > 12_000) delete hot[id];
      return { steps: [...s.steps.slice(-80), { runId, agent, step, receivedAt: now }], hot };
    }),
  setRunStatus: (runId, agent, status) =>
    set((s) => {
      const running = { ...s.running };
      if (status === "running" || status === "queued") running[runId] = { agent, status };
      else delete running[runId];
      return { running };
    }),
}));
