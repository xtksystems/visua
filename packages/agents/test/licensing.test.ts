import { afterEach, describe, expect, it } from "vitest";
import type { RequirementNode } from "@visua/core";
import { licensedTextToModel } from "../src/mode.ts";
import { modelText } from "../src/tools.ts";

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
  attributes: { licensed: true, summary: "Logical access software, infrastructure and architecture protect information assets." },
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
