import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { type CheckResult, type OrganizationProfile, type Policy } from "@visua/core";
import { FrameworkRegistry } from "@visua/frameworks";
import { createService } from "../src/context.ts";
import { captureExportSnapshot, EXPORT_SNAPSHOT_BASIS } from "../src/services/export-snapshot.ts";
import { testDatabase } from "./db.ts";

const registry = FrameworkRegistry.load();
const db = await testDatabase("export_snapshot");
const svc = await createService({ database: db.url, registry });
const CSF = "nist-csf-2.0", AI = "nist-ai-rmf", A = `${CSF}:PR.AA-01`;
const NOW = "2026-10-13T12:00:00.000Z";
const profile: OrganizationProfile = { industry: "saas", size: "11-50", dataTypes: [], drivers: [], environments: ["cloud"], maturityTier: 1, guidance: "guided", securityTeamSize: 1 };
let n = 0;
const fixture = () => svc.createWorkspace({ name: `Export snapshot ${++n}`, profile, frameworks: [CSF, AI] });
beforeEach(() => { vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(new Date(NOW)); });
afterEach(() => { vi.restoreAllMocks(); vi.useRealTimers(); });
afterAll(async () => { await svc.store.close(); await db.cleanup(); });

describe(`export capture (${db.dialect})`, () => {
  it("rereads a coherent revision and retains inline bodies without mutating the workspace or audit chain", async () => {
    const stale = await fixture();
    await svc.updateState(stale.id, A, { current: 2, notes: "Frozen state" });
    const item = await svc.createEvidence(stale.id, { title: "Frozen artifact", content: "Exact inline body", requirementIds: [A] });
    await svc.store.workspaces.put({ ...await svc.workspace(stale.id), name: "Fresh workspace name" });
    const revision = await svc.store.workspaces.rev(stale.id), audit = await svc.store.activity.chain(stale.id);
    const lock = vi.spyOn(svc.store, "lock");
    const snap = await captureExportSnapshot(svc, stale, { frameworkIds: [CSF], asOf: "2026-10-13T08:00:00-04:00", periodStart: "2026-01-01T00:00:00Z" });
    expect(lock).toHaveBeenCalledWith(`ws:${stale.id}`);
    expect(snap).toMatchObject({ schemaVersion: 1, workspace: { name: "Fresh workspace name" }, revision, capturedAt: NOW, asOf: NOW, periodStart: "2026-01-01T00:00:00.000Z", frameworkIds: [CSF] });
    expect(snap.evidence.find(e => e.id === item.id)?.content).toBe("Exact inline body");
    expect(snap.states.every(s => s.nodeId.startsWith(`${CSF}:`))).toBe(true);
    expect(snap.activity).toEqual(audit);
    expect(snap.auditCheckpoint).toEqual({ seq: audit.at(-1)!.seq, hash: audit.at(-1)!.hash });
    expect(await svc.store.workspaces.rev(stale.id)).toBe(revision);
    expect(await svc.store.activity.chain(stale.id)).toEqual(audit);
    expect(JSON.parse(JSON.stringify(snap))).toEqual(snap);
    expect(EXPORT_SNAPSHOT_BASIS.audit).toContain("Complete workspace audit chain");
  });

  it("holds capture together while a normal service mutation waits for the workspace transaction", async () => {
    const ws = await fixture();
    const revision = await svc.store.workspaces.rev(ws.id);
    const original = svc.store.states.list.bind(svc.store.states);
    let enter!: () => void, release!: () => void;
    const entered = new Promise<void>(resolve => { enter = resolve; });
    const gate = new Promise<void>(resolve => { release = resolve; });
    vi.spyOn(svc.store.states, "list").mockImplementationOnce(async (...args) => { enter(); await gate; return original(...args); });
    const capture = captureExportSnapshot(svc, ws, { frameworkIds: [CSF] });
    await entered;
    const mutation = svc.updateState(ws.id, A, { current: 3 });
    release();
    const snap = await capture;
    await mutation;
    expect(snap.revision).toBe(revision);
    expect(snap.states.find(s => s.nodeId === A)?.current).toBe(0);
    expect((await svc.store.states.get(ws.id, A))?.current).toBe(3);
    expect((await svc.store.workspaces.rev(ws.id))).toBeGreaterThan(snap.revision);
  });

  it("keeps selected artifact lineage and recorded source dependencies, and exposes missing references", async () => {
    const ws = await fixture();
    const otherRequirement = registry.framework(AI)!.assessable[0]!.id;
    const outside = await svc.createEvidence(ws.id, { title: "Previous", content: "predecessor bytes", requirementIds: [otherRequirement] });
    const selected = await svc.createEvidence(ws.id, { title: "Selected", content: "selected bytes", requirementIds: [A] });
    const successor = await svc.createEvidence(ws.id, { title: "Successor", content: "successor bytes", requirementIds: [otherRequirement] });
    const policy = { id: "policy-source", workspaceId: ws.id, title: "Source policy", slug: "source-policy", body: "body", origin: "user", reviewCadenceDays: 365, version: 1, status: "retired", requirementIds: [otherRequirement], createdAt: NOW, updatedAt: NOW } as Policy;
    const check: CheckResult = { id: "check-source", workspaceId: ws.id, connectorId: "connector", checkId: "test", title: "Recorded", outcome: "pass", detail: "", requirementIds: [otherRequirement], observed: {}, observedAt: NOW };
    await svc.store.policies.put(policy); await svc.store.checks.put(check);
    await svc.store.evidence.put({ ...selected, supersedesId: outside.id, provenance: { ...selected.provenance!, policy: { id: policy.id, version: 1, sha256: "a".repeat(64) }, check: { resultId: check.id, connectorId: "connector", connectorKind: "test", connectorName: "Test", checkId: "test", observedAt: NOW } } });
    await svc.store.evidence.put({ ...successor, supersedesId: selected.id });
    await svc.store.evidence.put({ ...outside, supersedesId: "deleted-predecessor" });
    const snap = await captureExportSnapshot(svc, ws, { frameworkIds: [CSF] });
    expect(snap.evidence.map(e => e.id)).toEqual([outside.id, selected.id, successor.id].sort());
    expect(snap.dependencies).toEqual({ evidenceIds: [outside.id, successor.id].sort(), policyIds: [policy.id], checkIds: [check.id], missing: [{ kind: "evidence", id: "deleted-predecessor", referencedByEvidenceId: outside.id }] });
    expect(snap.policies).toContainEqual(policy); expect(snap.checks).toContainEqual(check);
    expect(snap.states.some(s => s.nodeId === otherRequirement)).toBe(false);
  });

  it("sorts selected IDs and collections and leaves the full audit outside period filtering", async () => {
    const ws = await fixture();
    await svc.createEvidence(ws.id, { title: "Older record", content: "retained", requirementIds: [A], collectedAt: "2026-01-01" });
    const snap = await captureExportSnapshot(svc, ws, { frameworkIds: [CSF, AI, CSF], periodStart: "2026-10-12T00:00:00Z" });
    expect(snap.frameworkIds).toEqual([CSF, AI].sort());
    expect(snap.states.map(s => s.nodeId)).toEqual(snap.states.map(s => s.nodeId).sort());
    expect(snap.evidence).toHaveLength(1);
    expect(snap.activity).toEqual(await svc.store.activity.chain(ws.id));
  });

  it.each([
    { frameworkIds: [] }, { frameworkIds: ["mitre-atlas"] }, { frameworkIds: ["unknown"] },
    { asOf: "2026-10-14T00:00:00Z" }, { asOf: "2026-02-30T00:00:00Z" }, { asOf: "2026-10-13" },
    { asOf: "2026-10-13T12:00Z" }, { asOf: "2026-10-13T12:00:00+99:99" },
    { asOf: "Infinity" }, { periodStart: "2026-10-13T12:00:01Z" },
  ])("rejects invalid scope or time %j", async selection => {
    const ws = await fixture();
    await expect(captureExportSnapshot(svc, ws, selection)).rejects.toThrow();
  });

  it.each(["records", "evidence", "bytes"] as const)("rejects excessive %s before any body hydration", async limit => {
    const ws = await fixture();
    const dbMethod = svc.store.db.bind(svc.store);
    vi.spyOn(svc.store, "db").mockImplementation(() => {
      const connection = dbMethod();
      return new Proxy(connection, { get(target, key) {
        if (key !== "query") { const value = Reflect.get(target, key); return typeof value === "function" ? value.bind(target) : value; }
        return (sql: string, args: unknown[]) => {
          if ((limit === "records" && sql.includes("export_counts")) || (limit === "evidence" && sql.startsWith("SELECT COUNT(*) AS total FROM evidence")) || (limit === "bytes" && sql.includes("FROM evidence_content c JOIN"))) return Promise.resolve([{ total: limit === "records" ? 20_001 : limit === "evidence" ? 1_001 : 32 * 1024 * 1024 + 1 }]);
          return target.query(sql, args);
        };
      } });
    });
    const hydrate = vi.spyOn(svc.store.evidence, "list");
    await expect(captureExportSnapshot(svc, ws)).rejects.toThrow("Export unavailable");
    expect(hydrate).not.toHaveBeenCalled();
  });
});
