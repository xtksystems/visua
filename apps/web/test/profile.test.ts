import { describe, expect, it } from "vitest";
import { profileCategories, readProfileQuery, sortProfileCategories, writeProfileQuery } from "../src/lib/profile.ts";
import type { LeanNode, UnitState } from "../src/lib/types.ts";

const node = (id: string, kind: string, parentId: string | null, order = 0): LeanNode => ({ id, kind, parentId, order, code: id, title: id, text: "", depth: kind === "function" ? 0 : kind === "category" ? 1 : 2, assessable: kind === "outcome" });
const unit = (patch: Partial<UnitState> = {}): UnitState => ({ current: 0, target: 2, priority: "medium", applicable: true, inScope: true, status: "not-started", reasons: [], openTasks: 0, evidence: 0, mapped: 0, ...patch });
const nodes = [node("fn-a", "function", null, 0), node("fn-b", "function", null, 1), node("a", "category", "fn-a", 0), node("b", "category", "fn-a", 1), node("c", "category", "fn-b", 0), node("a1", "outcome", "a", 0), node("a2", "outcome", "a", 1), node("a3", "outcome", "a", 2), node("b1", "outcome", "b", 0), node("c1", "outcome", "c", 0)];

describe("CSF category profiles", () => {
  it("uses fresh scope and applicability, without counting excluded work as zero", () => {
    const rows = profileCategories(nodes, { a1: unit({ current: 1, target: 3 }), a2: unit({ current: 4, target: 4, inScope: false }), a3: unit({ current: 4, applicable: false }), b1: unit({ status: "not-applicable" }), c1: unit({ current: 2, target: 2 }) }, true);
    expect(rows[0]).toMatchObject({ current: 1, target: 3, gap: 2, belowTarget: 1, excluded: 2, unavailable: 0 });
    expect(rows[0]!.requirements.map((item) => item.node.id)).toEqual(["a1"]);
    expect(rows[1]).toMatchObject({ current: null, target: null, gap: null, belowTarget: 0, excluded: 1 });
    expect(rows[2]).toMatchObject({ current: 2, target: 2, gap: 0 });
  });

  it("keeps means unweighted and exposes shortfalls even when aggregate levels match", () => {
    const rows = profileCategories(nodes, { a1: unit({ current: 4, target: 2, priority: "critical" }), a2: unit({ current: 0, target: 2, priority: "low" }), a3: unit({ inScope: false }), b1: unit({ inScope: false }), c1: unit({ inScope: false }) }, true);
    expect(rows[0]).toMatchObject({ current: 2, target: 2, gap: 0, belowTarget: 1 });
  });

  it("never substitutes missing assessments or unknown scope with a zero level", () => {
    const rows = profileCategories(nodes, { a1: unit({ current: 3 }), a2: unit({ inScope: undefined }), b1: unit({ current: 0, target: 0 }), c1: unit({ inScope: false }) }, true);
    expect(rows[0]).toMatchObject({ current: null, target: null, gap: null, unavailable: 2, excluded: 0 });
    expect(rows[0]!.requirements).toHaveLength(1);
    expect(rows[1]).toMatchObject({ current: 0, target: 0, gap: 0, unavailable: 0 });
  });

  it("shows disabled framework categories as unscored, even with saved assessments", () => {
    const rows = profileCategories(nodes, { a1: unit({ current: 4 }), a2: unit(), a3: unit(), b1: unit(), c1: unit() }, false);
    expect(rows.every((row) => row.current === null && row.target === null && row.requirements.length === 0 && row.unavailable === 0)).toBe(true);
    expect(rows[0]!.excluded).toBe(3);
  });

  it("preserves exact requirement status and valid-evidence counts in detail", () => {
    const recorded = unit({ current: 3, target: 3, status: "at-risk", evidence: 2, reasons: ["Overdue task"] });
    const rows = profileCategories(nodes, { a1: recorded, a2: unit({ inScope: false }), a3: unit({ inScope: false }), b1: unit(), c1: unit() }, true);
    expect(rows[0]!.requirements[0]!.state).toBe(recorded);
    expect(rows[0]!.belowTarget).toBe(0);
  });

  it("ignores non-assessable children and preserves deterministic requirement order", () => {
    const extra = node("guidance", "reference", "a", -1);
    const rows = profileCategories([...nodes].reverse().concat(extra), { a1: unit(), a2: unit(), a3: unit(), b1: unit(), c1: unit() }, true);
    expect(rows.find((row) => row.node.id === "a")!.requirements.map((item) => item.node.id)).toEqual(["a1", "a2", "a3"]);
  });
});

describe("Profile sorting and navigation", () => {
  const units = { a1: unit({ current: 1, target: 2 }), a2: unit({ inScope: false }), a3: unit({ inScope: false }), b1: unit({ current: 0, target: 3 }), c1: unit({ current: 2, target: 2 }) };
  const rows = profileCategories(nodes, units, true);
  const ids = (sort: Parameters<typeof sortProfileCategories>[1]) => sortProfileCategories([...rows].reverse(), sort).map((row) => row.node.id);

  it("sorts category means across functions with stable hierarchy ties", () => {
    expect(ids("function")).toEqual(["a", "b", "c"]);
    expect(ids("gap")).toEqual(["b", "a", "c"]);
    expect(ids("current")).toEqual(["b", "a", "c"]);
    expect(ids("target")).toEqual(["b", "a", "c"]);
    expect(rows.map((row) => row.node.id)).toEqual(["a", "b", "c"]);
  });

  it("sorts unscored categories after actual zero values", () => {
    const mixed = profileCategories(nodes, { ...units, b1: unit({ inScope: false }), c1: unit({ current: 0, target: 0 }) }, true);
    expect(sortProfileCategories(mixed, "current").map((row) => row.node.id)).toEqual(["c", "a", "b"]);
    expect(sortProfileCategories(mixed, "gap").map((row) => row.node.id)).toEqual(["a", "c", "b"]);
  });

  it("round-trips tab, sort and category without discarding unrelated route state", () => {
    const original = new URLSearchParams("other=kept");
    const next = writeProfileQuery(original, { tab: "tiers", sort: "gap", category: "nist-csf-2.0:PR.AA" });
    expect(readProfileQuery(next)).toEqual({ tab: "tiers", sort: "gap", category: "nist-csf-2.0:PR.AA" });
    expect(next.get("other")).toBe("kept");
    expect(writeProfileQuery(next, { tab: "profile", sort: "function", category: null }).toString()).toBe(original.toString());
    expect(original.toString()).toBe("other=kept");
  });

  it("uses safe defaults for unknown tab and sort while keeping an invalid selection explicit", () => {
    expect(readProfileQuery(new URLSearchParams("tab=unknown&sort=unknown&category=missing"))).toEqual({ tab: "profile", sort: "function", category: "missing" });
    expect(readProfileQuery(new URLSearchParams())).toEqual({ tab: "profile", sort: "function", category: null });
  });
});
