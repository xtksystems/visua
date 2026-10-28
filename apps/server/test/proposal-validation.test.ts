import { describe, expect, it } from "vitest";
import { mayApplyAutonomously, parseAutonomy, parseProposalPayload } from "../src/services/proposal-validation.ts";

describe("proposal payload boundary", () => {
  it("refuses coercions and hidden authorization or identity fields", () => {
    expect(() => parseProposalPayload("set-level", { nodeId: "requirement", current: "4" })).toThrow();
    expect(() => parseProposalPayload("set-applicability", { nodeId: "requirement", applicable: "false", rationale: "Scope" })).toThrow();
    expect(() => parseProposalPayload("create-risk", { id: "existing", title: "Rewrite risk" })).toThrow();
    expect(() => parseProposalPayload("set-rmf", { authorization: { decision: "ato" } })).toThrow();
    expect(() => parseProposalPayload("create-task", { title: "Task", status: "done", workspaceId: "other" })).toThrow();
  });

  it("keeps a recorded check reference separate from generated narrative", () => {
    expect(parseProposalPayload("create-evidence", { checkResultId: "check" })).toEqual({ checkResultId: "check" });
    for (const extra of [{ content: "Invented observation" }, { requirementIds: ["other"] }, { kind: "attestation" }, { provenance: { origin: "connector-check" } }]) {
      expect(() => parseProposalPayload("create-evidence", { checkResultId: "check", ...extra })).toThrow();
    }
    expect(() => parseProposalPayload("create-evidence", { title: "Witnessed", content: "I attest", kind: "attestation" })).toThrow();
    expect(parseProposalPayload("create-evidence", { title: "Narrative", content: "Described observation" })).toMatchObject({ kind: "document", content: "Described observation" });
  });

  it("requires an explicit evidence decision and a rejection reason", () => {
    expect(() => parseProposalPayload("review-evidence", { evidenceId: "artifact" })).toThrow();
    expect(() => parseProposalPayload("review-evidence", { evidenceId: "artifact", decision: "rejected", note: " " })).toThrow();
    expect(parseProposalPayload("review-evidence", { evidenceId: "artifact", decision: "rejected", note: "Wrong environment", expectedReviewId: null })).toMatchObject({ decision: "rejected", note: "Wrong environment", expectedReviewId: null });
  });

  it("requires bounded valid task work while keeping explicit clear operations", () => {
    expect(() => parseProposalPayload("update-task", { taskId: "task" })).toThrow();
    expect(() => parseProposalPayload("create-task", { title: "Task", dueDate: "2026-02-30" })).toThrow();
    expect(() => parseProposalPayload("create-task", { title: "Task", effortHours: -1 })).toThrow();
    expect(parseProposalPayload("update-task", { taskId: "task", dueDate: null, assignee: null })).toEqual({ taskId: "task", dueDate: null, assignee: null });
  });

  it("ignores legacy broad grants and keeps narrative evidence under review", () => {
    expect(() => parseAutonomy({ "set-level": true })).toThrow();
    const legacy = { "set-level": true, "create-policy": true, "create-task": true, "create-evidence": true };
    expect(mayApplyAutonomously("set-level", { nodeId: "requirement", current: 4 }, legacy)).toBe(false);
    expect(mayApplyAutonomously("create-policy", { title: "Policy" }, legacy)).toBe(false);
    expect(mayApplyAutonomously("create-task", { title: "Task" }, legacy)).toBe(true);
    expect(mayApplyAutonomously("create-evidence", { title: "Narrative", content: "Observation" }, legacy)).toBe(false);
    expect(mayApplyAutonomously("create-evidence", { checkResultId: "check" }, legacy)).toBe(true);
    expect(mayApplyAutonomously("create-evidence", { checkResultId: "check", content: "Invented" }, legacy)).toBe(false);
    expect(mayApplyAutonomously("create-evidence", { checkResultId: "check" }, {})).toBe(false);
  });
});
