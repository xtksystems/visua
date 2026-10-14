import { describe, expect, it } from "vitest";
import type { AgentRun, Proposal } from "@visua/core";
import { agentStages } from "../src/lib/agent-stages.ts";

const at = "2026-10-13T10:00:00.000Z";
const history: NonNullable<AgentRun["stageHistory"]> = [
  { stage: "collect", status: "started", at }, { stage: "collect", status: "completed", at },
  { stage: "analyze", status: "started", at }, { stage: "analyze", status: "completed", at },
];
const run = (patch: Partial<AgentRun> = {}): AgentRun => ({ id: "run", workspaceId: "ws", agent: "copilot", goal: "Review", input: {}, status: "completed", mode: "offline", steps: [], stageHistory: history, focusNodeIds: [], createdAt: at, ...patch });
const proposal = (status: Proposal["status"], patch: Partial<Proposal> = {}): Proposal => ({ id: "p", runId: "run", workspaceId: "ws", type: "set-level", title: "Proposed change", rationale: "Source", payload: {}, citations: [], confidence: "high", status, nodeIds: [], createdAt: at, ...patch });
const states = (value: ReturnType<typeof agentStages>) => Object.fromEntries(value.stages.map((stage) => [stage.id, stage.state]));

describe("actual agent stages", () => {
  it("distinguishes queued tracking from absent legacy history", () => {
    expect(states(agentStages(run({ status: "queued", stageHistory: [] }), []))).toEqual({ collect: "waiting", analyze: "waiting", propose: "waiting", review: "waiting", apply: "waiting" });
    const legacy = agentStages(run({ stageHistory: undefined, steps: [{ id: "invented", at, type: "message", title: "All stages complete" }] }), []);
    expect(Object.values(states(legacy))).toEqual(Array(5).fill("not-recorded"));
    expect(legacy.summary).toBe("Run finished");
  });

  it("records answer-only completion without inventing proposals, review or changes", () => {
    const value = agentStages(run(), []);
    expect(states(value)).toEqual({ collect: "complete", analyze: "complete", propose: "not-needed", review: "not-needed", apply: "not-needed" });
    expect(value.summary).toBe("Completed without proposed changes");
  });

  it("keeps analysis active while proposals await an overlapping decision", () => {
    const value = agentStages(run({ status: "running", stageHistory: history.slice(0, 3) }), [proposal("pending")]);
    expect(value.current).toBe("analyze");
    expect(states(value)).toMatchObject({ analyze: "active", propose: "active", review: "active", apply: "waiting" });
    expect(value.blocker).toContain("needs a decision");
  });

  it("shows review as current without implying that pending changes were applied", () => {
    const value = agentStages(run({ status: "awaiting-approval" }), [proposal("pending"), proposal("pending", { id: "p2" })]);
    expect(value.current).toBe("review");
    expect(value.summary).toBe("Current stage: Review");
    expect(value.stages[4]!.detail).toBe("2 pending.");
  });

  it("does not claim human review for applications under granted autonomy", () => {
    const value = agentStages(run(), [proposal("applied", { decidedBy: "autonomy" })]);
    expect(states(value)).toMatchObject({ review: "not-needed", apply: "complete" });
    expect(value.stages[3]!.detail).toContain("under granted autonomy");
    expect(value.stages[3]!.detail).not.toContain("human");
  });

  it("does not invent a review source for legacy applications", () => {
    const value = agentStages(run({ stageHistory: undefined }), [proposal("applied")]);
    expect(states(value)).toMatchObject({ collect: "not-recorded", analyze: "not-recorded", propose: "complete", review: "not-recorded", apply: "complete" });
    expect(value.stages[3]!.detail).toContain("decision source not recorded");
  });

  it("separates human review completion from rejected or failed application", () => {
    expect(states(agentStages(run(), [proposal("rejected", { decidedBy: "user_1" })]))).toMatchObject({ review: "complete", apply: "rejected" });
    const failed = agentStages(run(), [proposal("failed", { decidedBy: "user_1" })]);
    expect(states(failed)).toMatchObject({ review: "complete", apply: "failed" });
    expect(failed.summary).toBe("Changes need attention");
  });

  it("retains every mixed outcome and pending blocker", () => {
    const value = agentStages(run({ status: "awaiting-approval" }), [proposal("applied", { decidedBy: "autonomy" }), proposal("failed", { decidedBy: "user_1" }), proposal("rejected", { decidedBy: "user_1" }), proposal("pending")]);
    expect(states(value).apply).toBe("partial");
    expect(value.stages[4]!.detail).toBe("1 applied · 1 failed · 1 rejected · 1 pending.");
    expect(value.current).toBe("review");
    expect(value.stages[3]!.detail).toContain("2 recorded decisions · 1 under granted autonomy");
  });

  it("does not turn an approved legacy decision into a successful application", () => {
    const value = agentStages(run(), [proposal("approved", { decidedBy: "user_1" })]);
    expect(states(value).apply).toBe("not-recorded");
    expect(value.stages[4]!.detail).toContain("application not recorded");
  });

  it.each(["failed", "cancelled"] as const)("retains %s as the terminal run state with interrupted analysis", (status) => {
    const value = agentStages(run({ status, stageHistory: history.slice(0, 3), error: status === "failed" ? "Tool unavailable" : undefined }), [proposal("pending")]);
    expect(value.current).toBe("analyze");
    expect(value.summary).toBe(`Run ${status} during Analyze`);
    expect(states(value)).toMatchObject({ collect: "complete", analyze: status, propose: "recorded", apply: "not-reached" });
    expect(value.blocker).toBeTruthy();
  });

  it("does not attribute a runtime failure to a proposal's application failure", () => {
    const value = agentStages(run({ status: "failed", stageHistory: undefined, error: "Model connection failed" }), [proposal("failed", { decidedBy: "reviewer" })]);
    expect(value.current).toBeNull();
    expect(value.summary).toBe("Run failed");
    expect(value.blocker).toBe("Model connection failed");
    expect(states(value).apply).toBe("failed");
  });

  it("does not claim an API token's decision was made by a person", () => {
    const value = agentStages(run(), [proposal("applied", { decidedBy: "API token “integration”" })]);
    expect(value.stages[3]!.detail).toBe("1 recorded decision.");
    expect(value.stages[3]!.detail).not.toContain("human");
    expect(states(value).review).toBe("complete");
  });

  it("does not infer a failed legacy stage or cross-run outcomes", () => {
    const value = agentStages(run({ status: "failed", stageHistory: undefined }), [proposal("applied", { workspaceId: "other" }), proposal("applied", { runId: "other" })]);
    expect(value.current).toBeNull();
    expect(value.summary).toBe("Run failed");
    expect(states(value).apply).toBe("not-recorded");
  });
});
