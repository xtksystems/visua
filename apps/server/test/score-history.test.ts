import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { evidenceReviewScope, type FrameworkGraph, type OrganizationProfile, type RequirementNode, type ScoreHistory, type ScoreObservation } from "@visua/core";
import { FrameworkRegistry } from "@visua/frameworks";
import { createService } from "../src/context.ts";
import { createApp } from "../src/app.ts";
import { AuthService } from "../src/auth/service.ts";
import { loadAuthConfig } from "../src/auth/config.ts";
import { recordScoreObservation, captureDueScoreObservations } from "../src/services/score-history.ts";
import { startScoreHistory } from "../src/services/score-history-ticker.ts";
import { MIGRATIONS, migrate } from "../src/storage/migrations.ts";
import { SqliteDriver } from "../src/storage/sqlite.ts";
import { PostgresDriver } from "../src/storage/postgres.ts";
import { testDatabase, TEST_PG_URL } from "./db.ts";
import { TestClient } from "./client.ts";

const corpus = FrameworkRegistry.load();
const CSF = "nist-csf-2.0", LAW = "us-state-ai-laws", THREAT = "mitre-atlas";
const A = `${CSF}:PR.AA-01`, B = `${CSF}:PR.AA-02`;
const lawNodes = corpus.framework(LAW)!.assessable.slice(0, 3).map((node, index) => ({ ...node, attributes: { ...node.attributes, effective: index === 1 ? "2026-10-14" : "2026-01-01", until: index === 2 ? "2026-10-12" : undefined } }));
const graph = (id: string, nodes: RequirementNode[]): FrameworkGraph => ({ framework: corpus.framework(id)!.graph.framework, nodes: nodes.map(node => ({ ...node, parentId: null, depth: 0 })) });
const registry = new FrameworkRegistry({ graphs: [graph(CSF, [corpus.node(A)!, corpus.node(B)!]), graph(LAW, lawNodes), graph(THREAT, corpus.framework(THREAT)!.graph.nodes.slice(0, 1))], mappings: [], chunks: [], manifests: [] });
const db = await testDatabase("score_history");
const svc = await createService({ database: db.url, registry });
const auth = new AuthService(svc, { ...loadAuthConfig({}), mode: "dev" });
const app = createApp(svc, auth);
const owner = await auth.ensureUser("history-owner@example.test", "History owner");
const tenant = await auth.createTenant("History", owner, "fixture");
const profile: OrganizationProfile = { industry: "saas", size: "11-50", dataTypes: [], drivers: [], environments: ["cloud"], maturityTier: 1, guidance: "guided", securityTeamSize: 1 };
const NOW = "2026-10-13T12:00:00.000Z";
let sequence = 0;
const fixture = () => svc.createWorkspace({ name: `History ${++sequence}`, profile, tenantId: tenant.id, frameworks: [CSF] });
const record = (id: string) => recordScoreObservation(svc, id, "fixture") as Promise<ScoreObservation>;
beforeEach(() => { vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(new Date(NOW)); });
afterEach(() => { vi.restoreAllMocks(); vi.useRealTimers(); });
afterAll(async () => { await svc.store.close(); await db.cleanup(); });

describe(`score observations (${db.dialect})`, () => {
  it("records exact weighted denominators, scoped valid proof and metadata only at one instant", async () => {
    const ws = await fixture();
    await svc.updateState(ws.id, A, { current: 1, target: 2, priority: "critical" });
    await svc.updateState(ws.id, B, { current: 2, target: 4, priority: "low" });
    const artifact = await svc.createEvidence(ws.id, { title: "Observed", content: "Private body never enters history", requirementIds: [A], collectedAt: "2026-01-01", validUntil: "2026-10-13T12:00:01Z" });
    await svc.reviewEvidence(ws.id, artifact.id, "accepted", "fixture", undefined, evidenceReviewScope(artifact));
    const before = await svc.store.workspaces.rev(ws.id);
    const body = vi.spyOn(svc.store.evidence, "list").mockRejectedValue(new Error("Body read forbidden"));
    const observation = await record(ws.slug);
    expect(observation).toMatchObject({ workspaceId: ws.id, observedAt: NOW, reason: "manual", revision: before });
    expect(observation.frameworks[0]).toMatchObject({ progress: { numerator: 2.5, denominator: 5, value: 0.5 }, evidence: { covered: 1, denominator: 2, value: 0.5 }, scope: { inScope: 2, requirementIds: [A, B] } });
    expect(body).not.toHaveBeenCalled(); expect(JSON.stringify(observation)).not.toContain("Private body");
    expect((await svc.verifyAuditTrail(ws.id)).valid).toBe(true);
    const audit = (await svc.store.activity.recent(ws.id, 1))[0]!;
    expect(audit).toMatchObject({ entity: "score-snapshot", entityId: observation.id, actor: "fixture", data: { revision: before, observedAt: NOW } });
    expect(await svc.store.workspaces.rev(ws.id)).toBe(before + 1);
    vi.setSystemTime(new Date("2026-10-13T12:00:02Z"));
    expect((await record(ws.id)).frameworks[0]!.evidence.covered).toBe(0);
    expect((await svc.store.scoreHistory.recent(ws.id)).observations[0]!.frameworks[0]!.evidence.covered).toBe(1);
  });

  it("stores readable scope and target changes and preserves earlier observations", async () => {
    const ws = await fixture();
    const first = await record(ws.id);
    await svc.updateState(ws.id, A, { target: 4, priority: "critical" });
    const second = await record(ws.id);
    expect(second.frameworks[0]!.scopeFingerprint).toBe(first.frameworks[0]!.scopeFingerprint);
    expect(second.frameworks[0]!.targetsFingerprint).not.toBe(first.frameworks[0]!.targetsFingerprint);
    expect(second.frameworks[0]!.targets.requirements.find(item => item.id === A)).toMatchObject({ target: 4, priority: "critical" });
    await svc.updateState(ws.id, B, { applicable: false, applicabilityRationale: "Not used by this service" });
    const third = await record(ws.id);
    expect(third.frameworks[0]!.scope).toMatchObject({ inScope: 1, excluded: 1, requirementIds: [A] });
    expect(third.scopeFingerprint).not.toBe(first.scopeFingerprint);
    expect((await svc.store.scoreHistory.recent(ws.id)).observations[0]).toEqual(first);
    await expect(svc.store.scoreHistory.append({ ...first, reason: "scheduled" })).rejects.toThrow();
  });

  it("keeps no-scope metrics empty and never assesses threat catalogs", async () => {
    const ws = await fixture();
    await svc.updateState(ws.id, A, { applicable: false, applicabilityRationale: "Fixture exclusion" });
    await svc.updateState(ws.id, B, { applicable: false, applicabilityRationale: "Fixture exclusion" });
    ws.frameworks.push({ frameworkId: THREAT, enabled: true, defaultTarget: 2 });
    await svc.store.workspaces.put(ws);
    const observation = await record(ws.id);
    expect(observation.frameworks).toHaveLength(1);
    expect(observation.frameworks[0]).toMatchObject({ progress: { denominator: 0, value: null }, evidence: { denominator: 0, value: null }, risk: { denominator: 0, value: null } });
  });

  it("applies statutory upcoming and ended boundaries at the observation time", async () => {
    const ws = await svc.createWorkspace({ name: `Law history ${++sequence}`, profile, frameworks: [LAW] });
    for (const node of lawNodes) await svc.store.states.put(ws.id, { nodeId: node.id, applicable: true, current: 1, target: 2, priority: "medium", updatedAt: NOW, updatedBy: "fixture" });
    const first = await record(ws.id);
    expect(first.frameworks.find(item => item.frameworkId === LAW)!.scope).toMatchObject({ inScope: 1, upcoming: 1, excluded: 1 });
    vi.setSystemTime(new Date("2026-10-14T00:00:00.000Z"));
    const second = await record(ws.id);
    expect(second.frameworks.find(item => item.frameworkId === LAW)!.scope).toMatchObject({ inScope: 2, upcoming: 0, excluded: 1 });
    expect(second.scopeFingerprint).not.toBe(first.scopeFingerprint);
  });

  it("rolls observation, audit and revision back together on a late failure", async () => {
    const ws = await fixture();
    const before = await svc.store.activity.chain(ws.id), revision = await svc.store.workspaces.rev(ws.id);
    const log = svc.log.bind(svc);
    vi.spyOn(svc, "log").mockImplementation(async (...args) => { await log(...args); throw new Error("rollback after audit"); });
    await expect(record(ws.id)).rejects.toThrow("rollback after audit");
    expect((await svc.store.scoreHistory.recent(ws.id)).observations).toEqual([]);
    expect(await svc.store.activity.chain(ws.id)).toEqual(before);
    expect(await svc.store.workspaces.rev(ws.id)).toBe(revision);
  });

  it("serializes concurrent manual observations and deduplicates scheduled work under the lock", async () => {
    const ws = await fixture();
    const concurrent = await Promise.all(Array.from({ length: 4 }, () => record(ws.id)));
    expect(new Set(concurrent.map(item => item.id)).size).toBe(4);
    expect(new Set(concurrent.map(item => item.revision)).size).toBe(4);
    const other = db.dialect === "postgres" ? await createService({ database: db.url, registry }) : svc;
    try {
      const scheduled = await Promise.all([recordScoreObservation(svc, ws.id, "system", { reason: "scheduled" }), recordScoreObservation(other, ws.id, "system", { reason: "scheduled" })]);
      expect(scheduled.filter(Boolean)).toHaveLength(1);
    } finally { if (other !== svc) await other.store.close(); }
    expect((await svc.verifyAuditTrail(ws.id)).valid).toBe(true);
    vi.setSystemTime(new Date("2026-10-14T11:59:59.999Z"));
    expect(await recordScoreObservation(svc, ws.id, "system", { reason: "scheduled" })).toBeUndefined();
    vi.setSystemTime(new Date("2026-10-18T12:00:00.000Z"));
    await recordScoreObservation(svc, ws.id, "system", { reason: "scheduled" });
    expect((await svc.store.scoreHistory.recent(ws.id)).observations.filter(item => item.reason === "scheduled")).toHaveLength(2);
  });

  it("bounds reads chronologically and deletes all observations with their workspace", async () => {
    const ws = await fixture(), other = await fixture();
    const one = await record(ws.id); vi.setSystemTime(new Date("2026-10-13T12:01:00Z"));
    const two = await record(ws.id); vi.setSystemTime(new Date("2026-10-13T12:02:00Z"));
    const three = await record(ws.id); await record(other.id);
    expect(await svc.store.scoreHistory.recent(ws.id, 2)).toEqual({ workspaceId: ws.id, observations: [two, three], hasOlder: true });
    expect((await svc.store.scoreHistory.recent(ws.id, 3)).observations).toEqual([one, two, three]);
    await svc.deleteWorkspace(ws.id);
    expect((await svc.store.scoreHistory.recent(ws.id)).observations).toEqual([]);
    expect((await svc.store.scoreHistory.recent(other.id)).observations).toHaveLength(1);
  });

  it("allows authorized reads without writes; contributor capture uses CSRF and signed-in actor", async () => {
    const ws = await fixture(), viewer = new TestClient(app), contributor = new TestClient(app);
    for (const [client, role] of [[viewer, "viewer"], [contributor, "contributor"]] as const) {
      const login = await client.devLogin(`history-${role}@example.test`);
      await svc.store.identity.memberships.put({ tenantId: tenant.id, userId: login.json.user.id, role, createdAt: NOW, updatedAt: NOW });
    }
    const path = `/api/workspaces/${ws.id}/score-history`;
    const audit = await svc.store.activity.chain(ws.id);
    const empty = await viewer.get<ScoreHistory>(path); expect(empty.status).toBe(200); expect(empty.json.observations).toEqual([]);
    expect(empty.headers.get("cache-control")).toBe("private, no-store");
    expect(await svc.store.activity.chain(ws.id)).toEqual(audit);
    expect((await viewer.post(path)).status).toBe(403);
    const csrf = contributor.csrf; contributor.csrf = "";
    expect((await contributor.post(path)).status).toBe(403); contributor.csrf = csrf;
    const captured = await contributor.post<ScoreObservation>(path, { actor: "spoofed", observedAt: "2000-01-01", reason: "scheduled" });
    expect(captured.status).toBe(201); expect(captured.json).toMatchObject({ reason: "manual", observedAt: NOW });
    expect((await svc.store.activity.recent(ws.id, 1))[0]!.actor).not.toBe("spoofed");
    for (const invalid of ["0", "201", "NaN", "1.5"]) expect((await viewer.get(`${path}?limit=${invalid}`)).status).toBe(400);
    const outsider = new TestClient(app); await outsider.devLogin("history-outsider@example.test");
    expect((await outsider.get(path)).status).toBe(404); expect((await outsider.post(path)).status).toBe(404);
    expect((await new TestClient(app).get(path)).status).toBe(401);
  });

  it("scheduled capture continues after one workspace fails and honors stop before new work", async () => {
    const first = await fixture(), second = await fixture();
    vi.spyOn(svc.store.workspaces, "list").mockResolvedValue([first, second]);
    const original = svc.workspace.bind(svc);
    vi.spyOn(svc, "workspace").mockImplementation(id => id === first.id ? Promise.reject(new Error("fixture failure")) : original(id));
    const onError = vi.fn();
    await captureDueScoreObservations(svc, { onError });
    expect(onError).toHaveBeenCalledOnce(); expect((await svc.store.scoreHistory.recent(second.id)).observations).toHaveLength(1);
    await captureDueScoreObservations(svc, { stopped: () => true, onError });
    expect(onError).toHaveBeenCalledOnce();
  });
});

it("migration 7 upgrades an existing database without fabricating history or changing prior data", async () => {
  const target = await testDatabase("history_migration");
  const driver = TEST_PG_URL ? new PostgresDriver(target.url) : new SqliteDriver(":memory:");
  try {
    await driver.execute(`CREATE TABLE schema_migrations (version INTEGER PRIMARY KEY, name TEXT NOT NULL, applied_at TEXT NOT NULL)`);
    for (const migration of MIGRATIONS.filter(item => item.version < 7)) await driver.transaction(async tx => {
      await migration.up(tx); await tx.execute(`INSERT INTO schema_migrations VALUES (?, ?, ?)`, [migration.version, migration.name, NOW]);
    });
    const json = driver.dialect === "postgres" ? "?::jsonb" : "?";
    await driver.execute(`INSERT INTO workspaces (id, slug, data, updated_at, rev) VALUES (?, ?, ${json}, ?, ?)`, ["old", "old", JSON.stringify({ id: "old", name: "Old" }), NOW, 17]);
    expect(await migrate(driver)).toEqual([7]); expect(await migrate(driver)).toEqual([]);
    expect(await driver.query(`SELECT id, rev FROM workspaces`)).toEqual([{ id: "old", rev: 17 }]);
    expect(await driver.query(`SELECT id FROM score_snapshots`)).toEqual([]);
  } finally { await driver.close(); await target.cleanup(); }
});

it("ticker skips overlapping ticks, handles failure and drains active capture on stop", async () => {
  vi.useFakeTimers();
  let release!: () => void;
  const run = vi.fn().mockImplementationOnce(() => new Promise<void>(resolve => { release = resolve; })).mockRejectedValueOnce(new Error("fixture failure")).mockResolvedValue(undefined);
  const log = vi.fn();
  const stop = startScoreHistory(run, { firstMs: 10, everyMs: 20, log });
  await vi.advanceTimersByTimeAsync(90); expect(run).toHaveBeenCalledTimes(1);
  release(); await vi.advanceTimersByTimeAsync(30); expect(log).toHaveBeenCalledOnce();
  let drain!: () => void;
  run.mockImplementationOnce(() => new Promise<void>(resolve => { drain = resolve; }));
  await vi.advanceTimersByTimeAsync(20);
  let stopped = false; const pending = stop().then(() => { stopped = true; });
  await vi.advanceTimersByTimeAsync(100); expect(stopped).toBe(false);
  drain(); await pending; const count = run.mock.calls.length;
  await vi.advanceTimersByTimeAsync(100); expect(run).toHaveBeenCalledTimes(count);
});
