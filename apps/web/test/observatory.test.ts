import { describe, expect, it } from "vitest";
import { matchesOutlinePreset, outlineMode, outlineResults, outlineUserId, readOutlineQuery, writeOutlineQuery } from "../src/lib/observatory.ts";
import type { FrameworkStateBundle, LeanNode, UnitState } from "../src/lib/types.ts";

const node = (id: string, parentId: string | null, assessable = true): LeanNode => ({ id, parentId, assessable, code: id, title: id === "a" ? "Access review" : id, text: "Observed configuration", kind: assessable ? "unit" : "group", order: 0, depth: parentId ? 1 : 0 });
const nodes = [node("root", null, false), node("group", "root", false), node("a", "group"), node("b", "group"), node("c", "group"), node("excluded", "root"), node("upcoming", "root")];
const unit = (changes: Partial<UnitState> = {}): UnitState => ({ current: 0, target: 2, priority: "medium", applicable: true, inScope: true, status: "not-started", reasons: [], openTasks: 0, evidence: 0, mapped: 0, ...changes });
const snapshot: FrameworkStateBundle = {
  frameworkId: "framework", overlay: null, groups: {},
  overall: { nodeId: "framework", total: 3, current: 0, target: 2, gapScore: 6, gaps: 3, readiness: 0, evidenceCoverage: 0, verifiedShare: 0, counts: { "not-started": 1, "in-progress": 0, implemented: 0, verified: 0, "at-risk": 2, "not-applicable": 0 } },
  units: {
    a: unit({ status: "at-risk", ownerUserId: "member-1", owner: "Morgan" }),
    b: unit({ status: "at-risk", owner: "Morgan", evidence: 1 }),
    c: unit({ ownerUserId: "member-2" }),
    excluded: unit({ inScope: false, applicable: false, status: "at-risk", ownerUserId: "member-1" }),
    upcoming: unit({ inScope: false, upcoming: "2030-01-01", status: "at-risk", ownerUserId: "member-1" }),
  },
};
const result = (overrides: Partial<Parameters<typeof outlineResults>[0]> = {}) => outlineResults({ nodes, state: snapshot, mode: "assessed", preset: "all", query: "", selectedId: null, ...overrides });

describe("Observatory outline presets", () => {
  it("round-trips query state without losing selection or unrelated parameters", () => {
    const params = new URLSearchParams("select=a&other=kept");
    const filtered = writeOutlineQuery(params, { preset: "at-risk", query: "Access & Review" });
    expect(readOutlineQuery(filtered)).toEqual({ preset: "at-risk", query: "Access & Review" });
    expect(filtered.get("select")).toBe("a");
    expect(filtered.get("other")).toBe("kept");
    expect(writeOutlineQuery(filtered, { preset: "all", query: "" }).toString()).toBe(params.toString());
    expect(readOutlineQuery(new URLSearchParams("preset=unknown"))).toEqual({ preset: "all", query: "" });
  });

  it("uses derived risk status and intersects case-insensitive code/title/text search", () => {
    expect([...result({ preset: "at-risk" }).matches]).toEqual(["a", "b"]);
    expect([...result({ preset: "at-risk", query: " ACCESS " }).matches]).toEqual(["a"]);
    expect([...result({ preset: "at-risk", query: "observed" }).matches]).toEqual(["a", "b"]);
    expect(result({ preset: "at-risk", query: "c" }).matches.has("c")).toBe(false);
    expect(matchesOutlinePreset(nodes[4]!, snapshot.units.c, "at-risk")).toBe(false);
  });

  it("requires an assessable current-scope unit, never inferred applicability", () => {
    const state = unit({ status: "at-risk" });
    expect(matchesOutlinePreset(nodes[0]!, state, "at-risk")).toBe(false);
    expect(matchesOutlinePreset(nodes[2]!, { ...state, inScope: undefined }, "at-risk")).toBe(false);
    expect(matchesOutlinePreset(nodes[2]!, undefined, "missing-evidence")).toBe(false);
    expect([...result({ preset: "missing-evidence" }).matches]).toEqual(["a", "c"]);
  });

  it("matches stable user identity rather than owner display names or token principals", () => {
    const userId = outlineUserId({ principal: "user", user: { id: "member-1" } });
    expect([...result({ preset: "assigned-to-me", userId }).matches]).toEqual(["a"]);
    expect(outlineUserId({ principal: "token", user: { id: "member-1" } })).toBeUndefined();
    expect(result({ preset: "assigned-to-me" }).matches.size).toBe(0);
    expect(outlineUserId(null)).toBeUndefined();
  });

  it("retains ancestors and the selected path without counting them as hits", () => {
    const filtered = result({ preset: "at-risk", query: "Access", selectedId: "c" });
    expect(filtered.count).toBe(1);
    expect([...filtered.matches]).toEqual(["a"]);
    expect([...filtered.visible].sort()).toEqual(["a", "c", "group", "root"]);
    expect([...filtered.context].sort()).toEqual(["c", "group", "root"]);
    expect(filtered.selectedOutside).toBe(true);
  });

  it("distinguishes zero matches from unavailable assessment data", () => {
    const zero = result({ preset: "at-risk", query: "no such requirement", selectedId: "c" });
    expect(zero.count).toBe(0);
    expect(zero.matches.size).toBe(0);
    expect([...zero.visible].sort()).toEqual(["c", "group", "root"]);
    expect(result({ state: undefined, preset: "at-risk" }).count).toBeNull();
    expect(result({ state: undefined, preset: "at-risk" }).matches.size).toBe(0);
  });

  it("keeps the full graph navigable for All/search while counting only in-scope units", () => {
    expect(result().visible.size).toBe(nodes.length);
    expect(result().count).toBe(3);
    expect([...result({ query: "group" }).matches]).toEqual(["group"]);
    expect(result({ query: "group" }).count).toBe(0);
    expect([...result({ query: "excluded" }).matches]).toEqual(["excluded"]);
    expect(result({ query: "excluded" }).count).toBe(0);
  });

  it("treats threats and disabled guides as full searchable graphs without assessment counts", () => {
    expect(outlineMode("framework", ["framework"], false)).toBe("assessed");
    expect(outlineMode("framework", [], false)).toBe("guide");
    expect(outlineMode("catalog", ["catalog"], true)).toBe("threat");
    for (const mode of ["guide", "threat"] as const) {
      const filtered = result({ mode, preset: "at-risk", query: "group" });
      expect([...filtered.matches]).toEqual(["group"]);
      expect(filtered.count).toBeNull();
      expect(result({ mode, preset: "assigned-to-me" }).visible.size).toBe(nodes.length);
    }
  });
});
