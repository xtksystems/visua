import { afterAll, afterEach, describe, expect, it, vi } from "vitest";
import { evidenceReviewScope, type Mapping, type MappingSet, type OrganizationProfile } from "@visua/core";
import { FrameworkRegistry } from "@visua/frameworks";
import { createApp } from "../src/app.ts";
import { loadAuthConfig } from "../src/auth/config.ts";
import { AuthService } from "../src/auth/service.ts";
import { createService } from "../src/context.ts";
import { crosswalkComparison } from "../src/services/crosswalk-comparison.ts";
import { TestClient } from "./client.ts";
import { testDatabase } from "./db.ts";

const loaded = FrameworkRegistry.load();
const CSF = "nist-csf-2.0", SP = "nist-sp-800-53-r5", AI = "nist-ai-rmf", THREAT = "mitre-atlas";
const A = `${CSF}:PR.AA-01`, B = `${CSF}:PR.AA-02`, G = `${CSF}:PR.AA`, C = `${SP}:AC-1`;
const mapping: Mapping = { source: A, target: C, relationship: "subset-of", origin: { authority: "Fixture publisher", documentId: "fixture-document", locator: "Table 2", page: 4 } };
const mappingSets: MappingSet[] = [
  { id: "first", title: "Published example", sourceFramework: CSF, targetFramework: SP, authority: "Fixture publisher", status: "draft", mappings: [mapping, { ...mapping, source: B }] },
  { id: "second", title: "Composed example", sourceFramework: SP, targetFramework: CSF, authority: "Fixture composed authority", mappings: [{ ...mapping, source: C, target: A, relationship: "supports" }] },
  { id: "editorial", title: "Editorial example", sourceFramework: CSF, targetFramework: SP, authority: "Visua editorial fixture", mappings: [{ ...mapping, source: `${CSF}:MISSING` }] },
  { id: "duplicate", title: "Repeated published record", sourceFramework: CSF, targetFramework: SP, authority: "Fixture publisher", mappings: [{ ...mapping }] },
];
const graph = (fw: string, ids?: string[]) => {
  const g = loaded.framework(fw)!.graph;
  return { ...g, nodes: ids ? g.nodes.filter(node => ids.includes(node.id)) : g.nodes.slice(0, 1) };
};
const registry = new FrameworkRegistry({ graphs: [graph(CSF, [`${CSF}:PR`, G, A, B]), graph(SP, [`${SP}:AC`, C]), graph(AI), graph(THREAT)], mappings: mappingSets, chunks: [], manifests: [] });
const db = await testDatabase("crosswalk_comparison");
const svc = await createService({ database: db.url, registry });
const auth = new AuthService(svc, { ...loadAuthConfig({}), mode: "dev" });
const app = createApp(svc, auth);
const owner = await auth.ensureUser("crosswalk-owner@example.test", "Comparison owner");
const tenant = await auth.createTenant("Comparison", owner, "fixture");
const profile: OrganizationProfile = { industry: "saas", size: "11-50", dataTypes: [], drivers: [], environments: ["cloud"], maturityTier: 1, guidance: "guided", securityTeamSize: 1 };
const ws = await svc.createWorkspace({ name: "Comparison", tenantId: tenant.id, profile, frameworks: [CSF, SP] });
const pair = { source: CSF, target: SP };
const compare = (opts: Record<string, string | undefined> = {}) => crosswalkComparison(svc, ws, { ...pair, ...opts });
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });
afterAll(async () => { await svc.store.close(); await db.cleanup(); });

describe(`crosswalk comparison (${db.dialect})`, () => {
  it("counts every record across sets, including duplicate links, and retains missing endpoints", async () => {
    const result = await compare();
    expect(result.pairTotal).toBe(5);
    expect(result.rows).toHaveLength(5);
    expect(new Set(result.rows.map(row => row.id)).size).toBe(5);
    expect(result.cells.reduce((sum, cell) => sum + cell.count, 0)).toBe(5);
    expect(result.sourceGroups.reduce((sum, group) => sum + group.total, 0)).toBe(5);
    expect(result.unresolvedTotal).toBe(1);
    expect(result.rows[3]?.source).toMatchObject({ id: `${CSF}:MISSING`, resolved: false });
    expect(result.sourceGroups.find(group => group.code === "Unresolved")?.total).toBe(1);
    expect(result.rows[0]).toMatchObject({ status: "draft", origin: mapping.origin });
    expect(result.rows[2]).toMatchObject({ status: null, setAuthority: "Fixture composed authority" });
    expect(result.rows[3]).toMatchObject({ setAuthority: "Visua editorial fixture" });
  });

  it("reverses axes without reversing the original published endpoints or directional labels", async () => {
    const first = await compare(), reversed = await compare({ source: SP, target: CSF });
    expect(reversed.pairTotal).toBe(first.pairTotal);
    for (const row of first.rows) {
      expect(reversed.rows.find(r => r.id === row.id)).toMatchObject({ source: row.source, target: row.target, relationship: row.relationship, origin: row.origin, sourceGroup: row.targetGroup, targetGroup: row.sourceGroup });
    }
    expect(reversed.rows[0]?.relationship).toBe("subset-of");
    expect(reversed.rows[2]?.relationship).toBe("supports");
  });

  it("supports an available pair with no mappings and excludes threat catalogs", async () => {
    const result = await compare({ target: AI });
    expect(result.pairTotal).toBe(0); expect(result.rows).toEqual([]); expect(result.cells).toEqual([]);
    expect(result.frameworks.some(f => f.id === AI)).toBe(true);
    expect(result.frameworks.some(f => f.id === THREAT)).toBe(false);
    await expect(compare({ target: THREAT })).rejects.toThrow("requirement frameworks");
  });

  it("paginates beyond the former 2,000/3,000 caps without losing record identity or totals", async () => {
    const original = mappingSets[0]!.mappings;
    mappingSets[0]!.mappings = Array.from({ length: 3101 }, () => ({ ...mapping }));
    try {
      const page = await compare({ page: "32", pageSize: "100" });
      expect(page.pairTotal).toBe(3104); expect(page.filteredTotal).toBe(3104); expect(page.pages).toBe(32);
      expect(page.rows).toHaveLength(4); expect(page.rows[0]?.recordIndex).toBe(3100);
      const filter = await compare({ sourceGroup: G, targetGroup: `${SP}:AC`, pageSize: "100" });
      expect(filter.filteredTotal).toBe(3103); expect(filter.pairTotal).toBe(3104); expect(filter.rows).toHaveLength(100);
      const ids = new Set<string>();
      for (let p = 1; p <= 32; p++) for (const row of (await compare({ page: String(p), pageSize: "100" })).rows) ids.add(row.id);
      expect(ids.size).toBe(3104);
    } finally { mappingSets[0]!.mappings = original; }
  });

  it.each([{ target: CSF }, { source: "missing" }, { sourceGroup: `${SP}:AC` }, { targetGroup: A }, { page: "0" }, { page: "1.5" }, { page: "2" }, { pageSize: "101" }, { pageSize: "0" }, { evidence: "" }, { unknown: "x" }])("rejects invalid filters %j", async (input) => {
    await expect(compare(input)).rejects.toThrow();
  });

  it("projects only direct evidence links from metadata, with bound review and date validity independent", async () => {
    const now = new Date("2026-10-12T12:00:00Z");
    vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(now);
    const artifact = await svc.createEvidence(ws.id, { title: "Observed configuration", content: "Do not read this artifact body", requirementIds: [A, G, C], collectedAt: "2026-10-01", validUntil: "2026-10-31" });
    const get = vi.spyOn(svc.store.evidence, "get").mockRejectedValue(new Error("Body access forbidden"));
    const list = vi.spyOn(svc.store.evidence, "list").mockRejectedValue(new Error("Body list forbidden"));
    const pending = await crosswalkComparison(svc, ws, { ...pair, evidence: artifact.id }, now);
    expect(pending.selectedEvidence).toMatchObject({ status: "pending-review", validity: "current", currentlyValid: false, acceptanceBound: false });
    expect(pending.selectedEvidence?.links.map(ref => [ref.id, ref.kind])).toEqual([[A, "requirement"], [G, "group"], [C, "requirement"]]);
    expect(pending.selectedEvidence?.links.some(ref => ref.id === B)).toBe(false);
    expect(JSON.stringify(pending)).not.toContain("Do not read this artifact body");
    expect(get).not.toHaveBeenCalled(); expect(list).not.toHaveBeenCalled();
    get.mockRestore(); list.mockRestore();
    await svc.reviewEvidence(ws.id, artifact.id, "accepted", "fixture reviewer", undefined, evidenceReviewScope(artifact));
    const accepted = await crosswalkComparison(svc, ws, { ...pair, evidence: artifact.id }, now);
    expect(accepted.selectedEvidence).toMatchObject({ currentlyValid: true, acceptanceBound: true });
    expect(accepted.selectedEvidence?.links).toHaveLength(3);
    const expired = await crosswalkComparison(svc, ws, { ...pair, evidence: artifact.id }, new Date("2026-11-01T00:00:00Z"));
    expect(expired.selectedEvidence).toMatchObject({ validity: "expired", currentlyValid: false, acceptanceBound: true });
  });

  it("allows viewer reads, returns tenant-safe 404s, validates HTTP filters, and produces no audit writes", async () => {
    const viewer = new TestClient(app);
    const login = await viewer.devLogin("crosswalk-viewer@example.test", "Comparison viewer");
    await svc.store.identity.memberships.put({ tenantId: tenant.id, userId: login.json.user.id, role: "viewer", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
    const other = await svc.createWorkspace({ name: "Other workspace", tenantId: tenant.id, profile, frameworks: [CSF] });
    const foreign = await svc.createEvidence(other.id, { title: "Other artifact", content: "Private content", requirementIds: [A] });
    const before = await svc.store.activity.recent(ws.id, 1000);
    const path = `/api/workspaces/${ws.id}/crosswalk/comparison?source=${CSF}&target=${SP}`;
    const ok = await viewer.get(path); expect(ok.status).toBe(200); expect(ok.headers.get("cache-control")).toBe("private, no-store");
    expect((await viewer.get(`${path}&sourceGroup=${encodeURIComponent(`${SP}:AC`)}`)).status).toBe(400);
    const foreignResult = await viewer.get(`${path}&evidence=${foreign.id}`), missingResult = await viewer.get(`${path}&evidence=absent`);
    expect(foreignResult.status).toBe(404); expect(foreignResult.json).toEqual(missingResult.json);
    const outsider = new TestClient(app); await outsider.devLogin("outside-crosswalk@example.test");
    expect((await outsider.get(path)).status).toBe(404);
    expect((await new TestClient(app).get(path)).status).toBe(401);
    expect(await svc.store.activity.recent(ws.id, 1000)).toEqual(before);
  });
});
