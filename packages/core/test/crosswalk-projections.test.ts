import { describe, expect, it } from "vitest";
import { CrosswalkIndex, projectLevels } from "../src/crosswalk.ts";
import type { FrameworkFamily, Mapping, MappingSet, RequirementState } from "../src/types.ts";

const families: Record<string, FrameworkFamily> = { csf: "csf", csf2: "csf", soc: "soc2", rmf: "rmf", law: "law", threat: "threat" };
const familyFor = (id: string) => families[id];
const state = (nodeId: string, current: number, applicable = true): RequirementState => ({ nodeId, current, target: 4, applicable, priority: "medium", updatedAt: "2026-10-13T00:00:00Z", updatedBy: "tester" });
const mapping = (source: string, target: string, relationship: Mapping["relationship"] = "equivalent", extra: Partial<Mapping> = {}): Mapping => ({ source, target, relationship, origin: { authority: "Test publisher", documentId: "mapping-document", page: 7, locator: "Row 12" }, ...extra });
const index = (mappings: Mapping[], extra: Partial<MappingSet> = {}) => new CrosswalkIndex([{ id: "official-mapping", title: "Synthetic mapping", authority: "Test publisher", sourceFramework: "csf", targetFramework: "soc", status: "final", mappings, ...extra }]);
const states = (...values: RequirementState[]) => new Map(values.map(value => [value.nodeId, value]));

describe("family-aware implementation projections", () => {
  it("translates semantic stages rather than copying level numbers and retains publisher references", () => {
    const [p] = projectLevels(index([mapping("soc:A", "csf:B")]), ["csf:B"], states(state("soc:A", 1)), familyFor);
    expect(p).toMatchObject({ kind: "implementation-projection", version: 1, targetFamily: "csf", suggested: 2, confidence: "medium" });
    expect(p!.sources[0]).toMatchObject({ family: "soc2", level: 1, levelLabel: "Designed", projectedLevel: 2, relationship: "equivalent", authority: "Test publisher", mappingSetId: "official-mapping", status: "final", citation: { documentId: "mapping-document", page: 7, locator: "Row 12" } });
    expect(p!.reasons.join(" ")).toMatch(/not observed evidence/);
  });

  it.each(["soc", "law", "rmf", "csf2"])("caps %s projection below operating, met, assessed or adaptive status", target => {
    const [p] = projectLevels(index([mapping("csf:A", `${target}:B`)]), [`${target}:B`], states(state("csf:A", 4)), familyFor);
    expect(p!.suggested).toBe(target === "soc" || target === "law" ? 2 : 3);
  });

  it("never upgrades confidence by accumulating weak related links", () => {
    const sources = Array.from({ length: 8 }, (_, i) => `csf:A${i}`);
    const [p] = projectLevels(index(sources.map(source => mapping(source, "soc:B", "related-to"))), ["soc:B"], states(...sources.map(source => state(source, 4))), familyFor);
    expect(p!.sources).toHaveLength(8);
    expect(p!.confidence).toBe("low");
    expect(p!.suggested).toBe(0);
  });

  it.each([
    { status: undefined }, { status: "draft" }, { status: "unreviewed" }, { status: "superseded" },
  ] as const)("keeps missing or nonfinal publication status low: %j", extra => {
    const [p] = projectLevels(index([mapping("csf:A", "soc:B")], extra), ["soc:B"], states(state("csf:A", 4)), familyFor);
    expect(p!.confidence).toBe("low");
  });

  it.each([
    { strength: "supporting" }, { strength: "unknown grade" }, { origin: { documentId: "editorial", authority: "Visua editorial" } },
  ])("does not turn supporting or editorial metadata into authoritative confidence: %j", extra => {
    const [p] = projectLevels(index([mapping("csf:A", "soc:B", "equivalent", extra)]), ["soc:B"], states(state("csf:A", 4)), familyFor);
    expect(p!.confidence).toBe("low");
  });

  it("preserves subset/superset direction when traversing the index backward", () => {
    const cw = index([mapping("csf:A", "soc:B", "superset-of")]);
    const [forward] = projectLevels(cw, ["soc:B"], states(state("csf:A", 4)), familyFor);
    const [reverse] = projectLevels(cw, ["csf:A"], states(state("soc:B", 4)), familyFor);
    expect(forward!.sources[0]!.relationship).toBe("superset-of");
    expect(forward!.confidence).toBe("medium");
    expect(reverse!.sources[0]!.relationship).toBe("subset-of");
    expect(reverse!.confidence).toBe("low");
  });

  it("does not lose the forward supports relationship during reverse lookup", () => {
    const [p] = projectLevels(index([mapping("csf:A", "soc:B", "supports")]), ["soc:B"], states(state("csf:A", 4)), familyFor);
    expect(p!.sources[0]!.relationship).toBe("supports");
    expect(p!.confidence).toBe("low");
  });

  it("surfaces conflicting strong source assessments instead of selecting confident optimism", () => {
    const [p] = projectLevels(index([mapping("csf:A", "soc:C"), mapping("csf:B", "soc:C")]), ["soc:C"], states(state("csf:A", 4), state("csf:B", 0)), familyFor);
    expect(p!.confidence).toBe("low");
    expect(p!.reasons.join(" ")).toMatch(/disagree/);
  });

  it("skips unknown families, threats, excluded sources and invalid source levels", () => {
    const cw = index([mapping("threat:A", "soc:B"), mapping("unknown:A", "soc:B"), mapping("csf:A", "soc:B"), mapping("rmf:A", "soc:B")]);
    expect(projectLevels(cw, ["soc:B"], states(state("threat:A", 4), state("unknown:A", 4), state("csf:A", 4, false), state("rmf:A", 99)), familyFor)).toEqual([]);
    expect(projectLevels(cw, ["unknown:A", "threat:A"], states(state("soc:B", 4)), familyFor)).toEqual([]);
  });
});
