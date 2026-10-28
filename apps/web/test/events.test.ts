import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const harness = vi.hoisted(() => ({ invalidateQueries: vi.fn(), cleanup: undefined as (() => void) | undefined }));
vi.mock("@tanstack/react-query", () => ({ useQueryClient: () => ({ invalidateQueries: harness.invalidateQueries }) }));
vi.mock("react", async (original) => ({ ...await original<typeof import("react")>(), useEffect: (effect: () => (() => void) | undefined) => { harness.cleanup = effect(); } }));

import { useWorkspaceEvents } from "../src/lib/events.ts";
import { useAgentActivity } from "../src/state/agentActivity.ts";

class Source extends EventTarget {
  static latest: Source;
  closed = false;
  readonly url: string;
  constructor(url: string) { super(); this.url = url; Source.latest = this; }
  close() { this.closed = true; }
  message(type: string, data: unknown) { this.dispatchEvent(new MessageEvent(type, { data: JSON.stringify(data) })); }
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal("EventSource", Source);
  harness.invalidateQueries.mockReset();
  harness.cleanup = undefined;
  useAgentActivity.getState().reset();
  useAgentActivity.getState().setWorkspace("canonical");
});
afterEach(() => {
  harness.cleanup?.();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

const calledGroups = () => harness.invalidateQueries.mock.calls.map(([options]) => options.queryKey);
const staleActivity = () => {
  useAgentActivity.getState().setRunStatus("old-run", "copilot", "running");
  useAgentActivity.getState().pushStep("old-run", "copilot", { id: "old-step", at: "2026-10-13T00:00:00Z", type: "message", title: "Old", nodeIds: ["node"] });
};

describe("workspace event resync", () => {
  it.each(["open", "resync"])("refreshes canonical queries and removes stale activity on %s", async (event) => {
    staleActivity();
    useWorkspaceEvents("canonical");
    Source.latest.message(event, { workspaceId: "canonical" });
    expect(useAgentActivity.getState()).toMatchObject({ workspaceId: "canonical", steps: [], running: {}, hot: {} });
    await vi.advanceTimersByTimeAsync(250);
    expect(calledGroups()).toContainEqual(["ws", "canonical"]);
  });

  it.each(["state.updated", "evidence.updated", "task.updated", "check.completed"])("refreshes evidence lineage after %s", async (type) => {
    useWorkspaceEvents("canonical");
    Source.latest.message("visua", { workspaceId: "canonical", type, data: {} });
    await vi.advanceTimersByTimeAsync(250);
    expect(calledGroups()).toContainEqual(["ws", "canonical", "evidence-lineage"]);
  });

  it("refetches compacted events without treating missing step fields as live data", async () => {
    staleActivity();
    useWorkspaceEvents("canonical");
    Source.latest.message("visua", { workspaceId: "canonical", type: "agent.step", data: {}, partial: true });
    await vi.advanceTimersByTimeAsync(250);
    expect(useAgentActivity.getState().steps).toEqual([]);
    expect(calledGroups()).toContainEqual(["ws", "canonical"]);
  });

  it("ignores foreign workspace events and stale callbacks after session/workspace changes", async () => {
    useWorkspaceEvents("canonical");
    const old = Source.latest;
    old.message("visua", { workspaceId: "other", type: "agent.step", data: {} });
    old.message("resync", { workspaceId: "other" });
    useAgentActivity.getState().setWorkspace("next");
    staleActivity();
    old.message("open", {});
    old.message("resync", { workspaceId: "canonical" });
    old.message("visua", { workspaceId: "canonical", type: "state.updated", data: {} });
    await vi.advanceTimersByTimeAsync(250);
    expect(harness.invalidateQueries).not.toHaveBeenCalled();
    expect(useAgentActivity.getState().steps).toHaveLength(1);
    harness.cleanup?.();
    useAgentActivity.getState().reset();
    old.message("open", {});
    old.message("resync", { workspaceId: "canonical" });
    expect(old.closed).toBe(true);
    expect(vi.getTimerCount()).toBe(0);
  });
});
