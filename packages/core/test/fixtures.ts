import type { FrameworkGraph, RequirementNode, RequirementState } from "../src/index.ts";

const node = (partial: Partial<RequirementNode> & Pick<RequirementNode, "code" | "kind" | "parentId">): RequirementNode => ({
  id: `test-csf:${partial.code}`,
  frameworkId: "test-csf",
  depth: partial.parentId ? partial.parentId.split(".").length : 0,
  order: 0,
  title: partial.code,
  text: `${partial.code} statement`,
  citation: { documentId: "test-doc" },
  assessable: partial.kind === "subcategory",
  ...partial,
});

/** A miniature CSF-shaped graph: 2 functions, 3 categories, 5 subcategories. */
export const miniGraph: FrameworkGraph = {
  framework: {
    id: "test-csf",
    family: "csf",
    shortName: "Test CSF",
    name: "Test Cybersecurity Framework",
    publisher: "Test",
    version: "1",
    published: "2024-02-26",
    description: "fixture",
    levels: [
      { kind: "function", label: "Function", pluralLabel: "Functions" },
      { kind: "category", label: "Category", pluralLabel: "Categories" },
      { kind: "subcategory", label: "Subcategory", pluralLabel: "Subcategories" },
    ],
    assessableKind: "subcategory",
    sources: [{ documentId: "test-doc" }],
    unitLabel: "outcome",
    unitLabelPlural: "outcomes",
  },
  nodes: [
    node({ code: "GV", kind: "function", parentId: null, order: 0, title: "GOVERN", depth: 0 }),
    node({ code: "GV.PO", kind: "category", parentId: "test-csf:GV", order: 0, title: "Policy", depth: 1 }),
    node({
      code: "GV.PO-01",
      kind: "subcategory",
      parentId: "test-csf:GV.PO",
      order: 0,
      depth: 2,
      text: "Policy for managing cybersecurity risks is established based on organizational context, cybersecurity strategy, and priorities and is communicated and enforced",
      examples: [
        { code: "GV.PO-01 Ex1", text: "Create, disseminate, and maintain an understandable, usable risk management policy" },
        { code: "GV.PO-01 Ex2", text: "Include statements of management intent and expectations" },
      ],
    }),
    node({ code: "PR", kind: "function", parentId: null, order: 1, title: "PROTECT", depth: 0 }),
    node({ code: "PR.AA", kind: "category", parentId: "test-csf:PR", order: 0, title: "Identity Management, Authentication, and Access Control", depth: 1 }),
    node({ code: "PR.AA-01", kind: "subcategory", parentId: "test-csf:PR.AA", order: 0, depth: 2, text: "Identities and credentials for authorized users, services, and hardware are managed by the organization" }),
    node({ code: "PR.AA-03", kind: "subcategory", parentId: "test-csf:PR.AA", order: 1, depth: 2, text: "Users, services, and hardware are authenticated" }),
    node({ code: "PR.DS", kind: "category", parentId: "test-csf:PR", order: 1, title: "Data Security", depth: 1 }),
    node({ code: "PR.DS-01", kind: "subcategory", parentId: "test-csf:PR.DS", order: 0, depth: 2, text: "The confidentiality, integrity, and availability of data-at-rest are protected" }),
    node({ code: "PR.DS-11", kind: "subcategory", parentId: "test-csf:PR.DS", order: 1, depth: 2, text: "Backups of data are created, protected, maintained, and tested" }),
  ],
};

export const state = (code: string, current: number, target: number, extra: Partial<RequirementState> = {}): RequirementState => ({
  nodeId: `test-csf:${code}`,
  current,
  target,
  priority: "medium",
  applicable: true,
  updatedAt: "2026-01-01T00:00:00.000Z",
  updatedBy: "test",
  ...extra,
});
