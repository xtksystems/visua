import { describe, expect, it } from "vitest";
import { changeComparison, comparisonQuery } from "../src/lib/crosswalk-comparison.ts";

describe("comparison URL state", () => {
  it("keeps evidence selected while pair changes reset group and page scope", () => {
    const params = new URLSearchParams({ view: "matrix", source: "a", target: "b", sourceGroup: "a:1", targetGroup: "b:2", page: "4", evidence: "ev-1" });
    const next = changeComparison(params, { source: "b", target: "a" });
    expect(Object.fromEntries(next)).toEqual({ view: "matrix", source: "b", target: "a", evidence: "ev-1" });
    expect(params.get("page")).toBe("4");
  });
  it("selects a cell and resets page without changing the pair or evidence", () => {
    const next = changeComparison(new URLSearchParams("source=a&target=b&page=4&evidence=ev"), { sourceGroup: "a:1", targetGroup: "b:2" });
    expect(next.has("page")).toBe(false); expect(next.get("evidence")).toBe("ev");
    expect(comparisonQuery(next)).toBe("source=a&target=b&sourceGroup=a%3A1&targetGroup=b%3A2&evidence=ev");
  });
  it("excludes Nexus and unrelated params without silently correcting invalid comparison filters", () => {
    expect(comparisonQuery(new URLSearchParams("view=matrix&group=old&source=a&target=&page=bad"))).toBe("source=a&target=&page=bad");
  });
});
