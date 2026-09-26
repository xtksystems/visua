/**
 * NIST RMF (SP 800-37 Rev. 2) process ingestion: the seven steps and their 47
 * tasks with outcomes, inputs, outputs, roles and SDLC phases, extracted from
 * the official PDF and verified against NIST's CPRT rendering
 * (corpus/nist-rmf/rmf-tasks.json).
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { FrameworkGraph, Mapping, MappingSet, RequirementNode } from "@visua/core";
import { CORPUS_DIR } from "../paths.ts";

export const RMF_ID = "nist-rmf";
const DOC = "nist-sp-800-37r2";

interface RawTask {
  step: string;
  level: "organization" | "system";
  id: string;
  title: string;
  task: string;
  outcome: string;
  outcomes: { text: string; cybersecurityFramework: string[] }[];
  potentialInputs: string[];
  expectedOutputs: string[];
  primaryResponsibility: string[];
  supportingRoles: string[];
  sdlcPhase: { new?: string; existing?: string } | null;
  discussionExcerpt: string;
  references: string;
  source: { section?: string; pdfPage?: number; printedPage?: string | number; page?: number };
}

export const RMF_STEPS: { key: string; code: string; title: string; purpose: string }[] = [
  { key: "prepare", code: "P", title: "Prepare", purpose: "Carry out essential activities at the organization, mission and business process, and information system levels to help prepare the organization to manage its security and privacy risks using the Risk Management Framework." },
  { key: "categorize", code: "C", title: "Categorize", purpose: "Inform organizational risk management processes and tasks by determining the adverse impact to organizational operations and assets, individuals, other organizations, and the Nation with respect to the loss of confidentiality, integrity, and availability of organizational systems and the information processed, stored, and transmitted by those systems." },
  { key: "select", code: "S", title: "Select", purpose: "Select, tailor, and document the controls necessary to protect the information system and organization commensurate with risk to organizational operations and assets, individuals, other organizations, and the Nation." },
  { key: "implement", code: "I", title: "Implement", purpose: "Implement the controls in the security and privacy plans for the system and for the organization and to document in a baseline configuration, the specific details of the control implementation." },
  { key: "assess", code: "A", title: "Assess", purpose: "Determine if the controls selected for implementation are implemented correctly, operating as intended, and producing the desired outcome with respect to meeting the security and privacy requirements for the system and the organization." },
  { key: "authorize", code: "R", title: "Authorize", purpose: "Provide organizational accountability by requiring a senior management official to determine if the security and privacy risk (including supply chain risk) to organizational operations and assets, individuals, other organizations, or the Nation based on the operation of a system or the use of common controls, is acceptable." },
  { key: "monitor", code: "M", title: "Monitor", purpose: "Maintain an ongoing situational awareness about the security and privacy posture of the information system and the organization in support of risk management decisions." },
];

/** "ID.AM-6" (CSF 1.1 notation in SP 800-37r2) → CSF 2.0 style is not 1:1; keep as provenance only. */
export function ingestRmf(): { graph: FrameworkGraph; csfMentions: { taskId: string; csf11: string[] }[] } {
  const tasks = JSON.parse(readFileSync(resolve(CORPUS_DIR, "nist-rmf/rmf-tasks.json"), "utf8")) as RawTask[];
  const nodes: RequirementNode[] = [];
  const csfMentions: { taskId: string; csf11: string[] }[] = [];
  RMF_STEPS.forEach((step, si) => {
    const stepId = `${RMF_ID}:${step.code}`;
    const stepTasks = tasks.filter((t) => t.step === step.key);
    nodes.push({
      id: stepId,
      frameworkId: RMF_ID,
      code: step.code,
      kind: "step",
      parentId: null,
      depth: 0,
      order: si,
      title: step.title,
      text: step.purpose,
      citation: { documentId: DOC, locator: `Chapter 3, ${step.title} step`, page: stepTasks[0]?.source.pdfPage ?? stepTasks[0]?.source.page },
      assessable: false,
      attributes: { taskCount: stepTasks.length },
    });
    stepTasks.forEach((t, ti) => {
      const id = `${RMF_ID}:${t.id}`;
      nodes.push({
        id,
        frameworkId: RMF_ID,
        code: t.id,
        kind: "task",
        parentId: stepId,
        depth: 1,
        order: ti,
        title: t.title,
        text: t.task,
        guidance: t.discussionExcerpt,
        attributes: {
          level: t.level,
          outcome: t.outcome,
          outcomes: t.outcomes.map((o) => o.text),
          potentialInputs: t.potentialInputs,
          expectedOutputs: t.expectedOutputs,
          primaryResponsibility: t.primaryResponsibility,
          supportingRoles: t.supportingRoles,
          sdlcPhase: t.sdlcPhase,
          references: t.references,
          statementItems: t.expectedOutputs.map((o) => `Produce: ${o}`),
        },
        citation: { documentId: DOC, locator: `${t.source.section ?? "Chapter 3"} — Task ${t.id} ${t.title}`, page: t.source.pdfPage ?? t.source.page },
        assessable: true,
      });
      const csf = t.outcomes.flatMap((o) => o.cybersecurityFramework).filter((c) => /^[A-Z]{2}\.[A-Z]{2}/.test(c));
      if (csf.length) csfMentions.push({ taskId: id, csf11: csf });
    });
  });
  return {
    graph: {
      framework: {
        id: RMF_ID,
        family: "rmf",
        shortName: "NIST RMF",
        name: "NIST Risk Management Framework (SP 800-37 Rev. 2)",
        publisher: "National Institute of Standards and Technology",
        version: "Rev. 2",
        published: "2018-12-20",
        description:
          "The seven-step process — Prepare, Categorize, Select, Implement, Assess, Authorize, Monitor — for managing security and privacy risk and authorizing systems, applied with the SP 800-53 control catalog.",
        levels: [
          { kind: "step", label: "Step", pluralLabel: "Steps" },
          { kind: "task", label: "Task", pluralLabel: "Tasks" },
        ],
        assessableKind: "task",
        sources: [{ documentId: DOC }, { documentId: "cprt-sp-800-37r2-json" }],
        unitLabel: "task",
        unitLabelPlural: "tasks",
      },
      nodes,
    },
    csfMentions,
  };
}

/** RMF tasks → SP 800-53 controls that implement them (per SP 800-37r2 references to the control catalog). */
export function rmfToControls(exists: (id: string) => boolean): MappingSet {
  // Editorial links from each SP 800-37r2 task to the SP 800-53 controls that operationalize it
  // (e.g. C-2 Security Categorization ↔ RA-2, R-4 Authorization Decision ↔ CA-6). Labelled as editorial.
  const pairs: [string, string[]][] = [
    ["P-1", ["PM-2", "PM-29"]],
    ["P-2", ["PM-9", "PM-28"]],
    ["P-3", ["RA-3", "PM-16", "PM-28"]],
    ["P-4", ["PL-10", "PL-11"]],
    ["P-5", ["PM-1"]],
    ["P-7", ["PM-31", "CA-7"]],
    ["P-8", ["PM-11"]],
    ["P-10", ["CM-8", "PM-5"]],
    ["P-11", ["PL-2"]],
    ["P-12", ["RA-2", "PM-11"]],
    ["P-13", ["SI-12"]],
    ["P-14", ["RA-3", "RA-5"]],
    ["P-15", ["SA-4", "PM-11"]],
    ["P-16", ["PM-7", "PL-8", "SA-17"]],
    ["P-17", ["PL-8"]],
    ["P-18", ["PM-5"]],
    ["C-1", ["PL-2", "CM-8"]],
    ["C-2", ["RA-2"]],
    ["C-3", ["RA-2"]],
    ["S-1", ["PL-2", "PL-10"]],
    ["S-2", ["PL-11"]],
    ["S-3", ["PL-2", "PL-8"]],
    ["S-4", ["PL-2", "SA-4"]],
    ["S-5", ["CA-7"]],
    ["S-6", ["PL-2"]],
    ["I-1", ["CM-2", "CM-6"]],
    ["I-2", ["PL-2", "CM-2"]],
    ["A-1", ["CA-2", "CA-2(1)"]],
    ["A-2", ["CA-2"]],
    ["A-3", ["CA-2", "CA-8"]],
    ["A-4", ["CA-2"]],
    ["A-5", ["CA-2", "SI-2"]],
    ["A-6", ["CA-5", "PM-4"]],
    ["R-1", ["CA-6", "PL-2"]],
    ["R-2", ["RA-3", "PM-9"]],
    ["R-3", ["CA-5", "PM-4", "PM-9"]],
    ["R-4", ["CA-6"]],
    ["R-5", ["CA-6"]],
    ["M-1", ["CM-3", "CM-4"]],
    ["M-2", ["CA-2", "CA-7"]],
    ["M-3", ["CA-5", "CA-7"]],
    ["M-4", ["CA-6", "CA-7", "PL-2"]],
    ["M-5", ["CA-7"]],
    ["M-6", ["CA-6"]],
    ["M-7", ["MP-6", "CM-8"]],
  ];
  const mappings: Mapping[] = [];
  for (const [task, controls] of pairs) {
    for (const c of controls) {
      const source = `nist-sp-800-53-r5:${c}`;
      const target = `${RMF_ID}:${task}`;
      if (!exists(source) || !exists(target)) continue;
      mappings.push({ source, target, relationship: "supports", origin: { documentId: DOC, authority: "Visua editorial mapping of SP 800-37 Rev. 2 tasks to supporting SP 800-53 controls" } });
    }
  }
  return {
    id: "sp-800-53-r5--rmf-tasks",
    title: "SP 800-53 controls supporting RMF tasks",
    sourceFramework: "nist-sp-800-53-r5",
    targetFramework: RMF_ID,
    authority: "Visua editorial (SP 800-37 Rev. 2)",
    mappings,
  };
}
