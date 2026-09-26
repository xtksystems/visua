import { afterEach, describe, expect, it } from "vitest";
import type { RequirementNode, Task, Workspace } from "@visua/core";
import type { AgentHost } from "../src/host.ts";
import { licensedTextToModel } from "../src/mode.ts";
import { workspaceContext } from "../src/runtime.ts";
import { listTasks, modelText } from "../src/tools.ts";

const licensedNode: RequirementNode = {
  id: "aicpa-tsc-2017:CC6.1",
  frameworkId: "aicpa-tsc-2017",
  code: "CC6.1",
  kind: "criterion",
  parentId: "aicpa-tsc-2017:CC6",
  depth: 2,
  order: 0,
  title: "Logical access architecture",
  text: "VERBATIM LICENSED TEXT",
  attributes: {
    licensed: true,
    summary: "Logical access software, infrastructure and architecture protect information assets.",
    pointsOfFocus: [{ title: "VERBATIM POINT OF FOCUS TITLE", text: "VERBATIM POINT OF FOCUS TEXT" }],
  },
  citation: { documentId: "tsc-2017-rev-pof-2022" },
  assessable: true,
};

const saved = { ...process.env };
afterEach(() => {
  process.env = { ...saved };
});

describe("licensed content never reaches the model without permission", () => {
  it("withholds AICPA text from Claude by default", () => {
    process.env["VISUA_AGENT_MODE"] = "claude";
    delete process.env["VISUA_AICPA_AI_USE"];
    expect(licensedTextToModel()).toBe(false);
    const text = modelText(licensedNode);
    expect(text).not.toContain("VERBATIM");
    expect(text).toContain("Logical access architecture");
    expect(text).toContain("withheld");
  });

  it("allows it when the operator declares AICPA permission", () => {
    process.env["VISUA_AGENT_MODE"] = "claude";
    process.env["VISUA_AICPA_AI_USE"] = "permitted";
    expect(modelText(licensedNode)).toBe("VERBATIM LICENSED TEXT");
  });

  it("offline playbooks run locally and keep the text", () => {
    process.env["VISUA_AGENT_MODE"] = "offline";
    expect(modelText(licensedNode)).toBe("VERBATIM LICENSED TEXT");
  });

  it("public-domain NIST text is never withheld", () => {
    process.env["VISUA_AGENT_MODE"] = "claude";
    expect(modelText({ ...licensedNode, attributes: {} })).toBe("VERBATIM LICENSED TEXT");
  });
});

describe("licensed text copied into tasks never reaches the model either", () => {
  // A task the planner built from the licensed criterion: its text as description, a point of focus as a checklist item.
  const task: Task = {
    id: "task_1",
    workspaceId: "ws_1",
    title: "CC6.1 · Logical access architecture",
    description: "VERBATIM LICENSED TEXT",
    kind: "technical",
    status: "todo",
    priority: "high",
    requirementIds: [licensedNode.id],
    checklist: [
      { id: "chk_1", text: "VERBATIM POINT OF FOCUS TITLE", done: false },
      { id: "chk_2", text: "Attach evidence and request verification.", done: false },
    ],
    dependsOn: [],
    origin: "template",
    createdAt: "2026-09-26T00:00:00Z",
    updatedAt: "2026-09-26T00:00:00Z",
  };
  const ws = { id: "ws_1", name: "Acme", profile: { industry: "saas", size: "11-50", dataTypes: [], drivers: [], environments: ["cloud"], maturityTier: 1, guidance: "guided", securityTeamSize: 1 }, frameworks: [] } as unknown as Workspace;
  const host = { registry: { node: (id: string) => (id === licensedNode.id ? licensedNode : undefined) }, workspace: () => ws, tasks: () => [task], score: () => ({}) } as unknown as AgentHost;

  it("withholds it from list_tasks and the task context when agents run on Claude", async () => {
    process.env["VISUA_AGENT_MODE"] = "claude";
    delete process.env["VISUA_AICPA_AI_USE"];
    const listed = JSON.stringify(await listTasks.run(host, {}));
    const context = workspaceContext(host, { agent: "task-executor", goal: "Execute", input: { taskId: task.id } });
    for (const out of [listed, context]) {
      expect(out).not.toContain("VERBATIM");
      expect(out).toContain("withheld");
      expect(out).toContain("Attach evidence and request verification.");
    }
  });

  it("keeps it for offline playbooks and with the operator's permission", async () => {
    process.env["VISUA_AGENT_MODE"] = "offline";
    expect(JSON.stringify(await listTasks.run(host, {}))).toContain("VERBATIM POINT OF FOCUS TITLE");
    process.env["VISUA_AGENT_MODE"] = "claude";
    process.env["VISUA_AICPA_AI_USE"] = "permitted";
    expect(workspaceContext(host, { agent: "task-executor", goal: "Execute", input: { taskId: task.id } })).toContain("VERBATIM LICENSED TEXT");
  });
});
