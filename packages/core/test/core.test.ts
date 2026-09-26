import { describe, expect, it } from "vitest";
import {
  CrosswalkIndex,
  FrameworkIndex,
  buildSnapshot,
  deriveStatus,
  estimateTier,
  groupStatus,
  planTasks,
  projectLevels,
  recommend,
  scoreFramework,
  targetFor,
  type Evidence,
  type MappingSet,
  type Task,
} from "../src/index.ts";
import { miniGraph, state } from "./fixtures.ts";

const index = new FrameworkIndex(miniGraph);
const NOW = new Date("2026-06-01T00:00:00Z");

const evidence = (nodeCode: string, extra: Partial<Evidence> = {}): Evidence => ({
  id: `ev-${nodeCode}`,
  workspaceId: "ws",
  title: `Evidence for ${nodeCode}`,
  kind: "document",
  source: "upload",
  requirementIds: [`test-csf:${nodeCode}`],
  status: "accepted",
  collectedAt: "2026-05-01T00:00:00Z",
  validUntil: "2027-05-01T00:00:00Z",
  createdAt: "2026-05-01T00:00:00Z",
  ...extra,
});

describe("FrameworkIndex", () => {
  it("indexes hierarchy, codes and units of work", () => {
    expect(index.roots().map((n) => n.code)).toEqual(["GV", "PR"]);
    expect(index.childrenOf("test-csf:PR").map((n) => n.code)).toEqual(["PR.AA", "PR.DS"]);
    expect(index.get("pr.aa-03")?.id).toBe("test-csf:PR.AA-03");
    expect(index.ancestors("test-csf:PR.DS-11").map((n) => n.code)).toEqual(["PR", "PR.DS"]);
    expect(index.assessable).toHaveLength(5);
    expect(index.assessableUnder("test-csf:PR").map((n) => n.code)).toEqual(["PR.AA-01", "PR.AA-03", "PR.DS-01", "PR.DS-11"]);
  });

  it("searches codes before prose", () => {
    const hits = index.search("backups");
    expect(hits[0]?.code).toBe("PR.DS-11");
    expect(index.search("PR.AA")[0]?.code).toBe("PR.AA");
  });
});

describe("deriveStatus", () => {
  const base = { evidence: [], tasks: [], checks: [], now: NOW };
  it("covers the status lifecycle", () => {
    expect(deriveStatus({ ...base, state: undefined }).status).toBe("not-started");
    expect(deriveStatus({ ...base, state: state("PR.AA-01", 1, 3) }).status).toBe("in-progress");
    expect(deriveStatus({ ...base, state: state("PR.AA-01", 3, 3) }).status).toBe("implemented");
    expect(
      deriveStatus({ ...base, state: state("PR.AA-01", 3, 3, { verifiedAt: "2026-05-02" }), evidence: [evidence("PR.AA-01")] }).status,
    ).toBe("verified");
    expect(deriveStatus({ ...base, state: state("PR.AA-01", 0, 3, { applicable: false }) }).status).toBe("not-applicable");
  });

  it("flags expired evidence and overdue tasks as at-risk", () => {
    const expired = evidence("PR.AA-01", { validUntil: "2026-01-01T00:00:00Z" });
    const r1 = deriveStatus({ ...base, state: state("PR.AA-01", 3, 3), evidence: [expired] });
    expect(r1.status).toBe("at-risk");
    expect(r1.reasons[0]).toMatch(/expired/);
    const overdue = { id: "t", status: "todo", dueDate: "2026-05-01", requirementIds: [] } as unknown as Task;
    expect(deriveStatus({ ...base, state: state("PR.AA-01", 1, 3), tasks: [overdue] }).status).toBe("at-risk");
  });
});

describe("scoreFramework", () => {
  it("rolls readiness, gaps and evidence coverage up the hierarchy", () => {
    const snapshot = buildSnapshot({
      states: [
        state("GV.PO-01", 3, 3, { priority: "high" }),
        state("PR.AA-01", 2, 4, { priority: "critical" }),
        state("PR.AA-03", 4, 4),
        state("PR.DS-01", 0, 3),
        state("PR.DS-11", 0, 3, { applicable: false }),
      ],
      evidence: [evidence("GV.PO-01"), evidence("PR.AA-03")],
      tasks: [],
      checks: [],
    });
    const result = scoreFramework(index, snapshot, NOW);
    const overall = result.overall;
    expect(overall.total).toBe(4);
    expect(overall.counts["not-applicable"]).toBe(1);
    // readiness: GV.PO-01 1×3, PR.AA-01 0.5×4, PR.AA-03 1×2, PR.DS-01 0×2 → (3+2+2)/(3+4+2+2)
    expect(overall.readiness).toBeCloseTo(7 / 11, 5);
    expect(overall.gaps).toBe(2);
    expect(overall.evidenceCoverage).toBeCloseTo(0.5);
    const aa = result.scores.get("test-csf:PR.AA")!;
    expect(aa.total).toBe(2);
    expect(groupStatus(aa)).toBe("in-progress");
    expect(groupStatus(result.scores.get("test-csf:GV")!)).toBe("implemented");
  });
});

describe("recommend", () => {
  it("adapts framework path, targets and priorities to the organization", () => {
    const rec = recommend({
      industry: "healthcare",
      size: "11-50",
      dataTypes: ["phi"],
      drivers: ["enterprise-customers"],
      environments: ["cloud"],
      maturityTier: 1,
      guidance: "guided",
      securityTeamSize: 1,
    });
    expect(rec.frameworks[0]?.frameworkId).toBe("nist-csf-2.0");
    expect(rec.frameworks[1]?.frameworkId).toBe("aicpa-tsc-2017");
    expect(rec.frameworks.some((f) => f.frameworkId === "hipaa-security-rule" && f.availability === "roadmap")).toBe(true);
    expect(rec.categoryPriorities["PR.DS"]).toBe("critical");
    expect(rec.defaultTarget).toBe(2);
    expect(targetFor("critical", rec)).toBeGreaterThanOrEqual(rec.defaultTarget);
    expect(rec.rationale.length).toBeGreaterThan(2);

    const federal = recommend({
      industry: "defense-contractor",
      size: "201-1000",
      dataTypes: ["cui"],
      drivers: ["federal-customers"],
      environments: ["hybrid"],
      maturityTier: 3,
      guidance: "expert",
      securityTeamSize: 8,
    });
    expect(federal.frameworks[1]?.frameworkId).toBe("nist-sp-800-53-r5");
    expect(federal.defaultTarget).toBe(4);
  });

  it("estimates a CSF tier from quick-check answers", () => {
    expect(estimateTier([0, 0, 1, 0])).toBe(1);
    expect(estimateTier([1, 1, 1, 2])).toBe(2);
    expect(estimateTier([2, 2, 2, 1])).toBe(3);
    expect(estimateTier([3, 3, 2, 3])).toBe(4);
  });
});

describe("planTasks", () => {
  it("creates grounded, prioritized, scheduled tasks for every gap", () => {
    let n = 0;
    const states = new Map(
      [
        state("GV.PO-01", 0, 3, { priority: "high" }),
        state("PR.AA-01", 1, 4, { priority: "critical" }),
        state("PR.AA-03", 4, 4),
        state("PR.DS-11", 0, 2, { priority: "low" }),
      ].map((s) => [s.nodeId, s]),
    );
    const tasks = planTasks(index, states, {
      workspaceId: "ws",
      startDate: new Date("2026-06-01T00:00:00Z"),
      weeklyCapacityHours: 20,
      idFactory: () => `id${++n}`,
    });
    expect(tasks.map((t) => t.requirementIds[0])).toEqual(["test-csf:PR.AA-01", "test-csf:GV.PO-01", "test-csf:PR.DS-11"]);
    const policy = tasks.find((t) => t.requirementIds[0] === "test-csf:GV.PO-01")!;
    expect(policy.kind).toBe("policy");
    expect(policy.automation?.agent).toBe("policy-author");
    expect(policy.checklist[0]?.text).toMatch(/risk management policy/);
    expect(policy.source?.basis).toBe("Official Implementation Examples");
    for (const t of tasks) expect(t.dueDate! >= t.startDate!).toBe(true);
  });
});

describe("crosswalk", () => {
  const set: MappingSet = {
    id: "m1",
    title: "test",
    sourceFramework: "test-csf",
    targetFramework: "test-soc2",
    authority: "Test",
    mappings: [
      { source: "test-csf:PR.AA-01", target: "test-soc2:CC6.1", relationship: "intersects-with", origin: { documentId: "d", authority: "Test" } },
      { source: "test-csf:PR.AA-03", target: "test-soc2:CC6.1", relationship: "equivalent", origin: { documentId: "d", authority: "Test" } },
      { source: "test-soc2:CC6.1", target: "test-800-53:AC-2", relationship: "related-to", origin: { documentId: "d", authority: "Test" } },
    ],
  };
  const cw = new CrosswalkIndex([set]);

  it("indexes mappings bidirectionally and reaches across frameworks", () => {
    expect(cw.related("test-soc2:CC6.1").map((e) => e.to).sort()).toEqual(["test-800-53:AC-2", "test-csf:PR.AA-01", "test-csf:PR.AA-03"]);
    expect(cw.related("test-soc2:CC6.1", "test-csf")).toHaveLength(2);
    const reach = cw.reach("test-csf:PR.AA-03", 2);
    expect(reach.get("test-800-53:AC-2")?.via).toEqual(["test-soc2:CC6.1"]);
  });

  it("projects progress with confidence", () => {
    const states = new Map([state("PR.AA-01", 2, 3), state("PR.AA-03", 3, 3)].map((s) => [s.nodeId, s]));
    const [p] = projectLevels(cw, ["test-soc2:CC6.1"], states);
    expect(p?.sources).toHaveLength(2);
    expect(p?.suggested).toBeGreaterThanOrEqual(2);
    expect(p?.confidence).toBe("high");
  });
});
