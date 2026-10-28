import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { createService } from "../../../apps/server/src/context.ts";
import { createApp } from "../../../apps/server/src/app.ts";
import { AuthService } from "../../../apps/server/src/auth/service.ts";
import { loadAuthConfig } from "../../../apps/server/src/auth/config.ts";
import { TestClient } from "../../../apps/server/test/client.ts";
import { canonical } from "../../../apps/server/src/audit.ts";
import { artifactHash } from "../../../apps/server/src/services/evidence.ts";
import { evidenceReviewScope, hasCurrentEvidenceReview, isEvidenceValid, type Evidence, type OrganizationProfile } from "../../../packages/core/src/index.ts";
import { MIGRATIONS, migrate } from "../../../apps/server/src/storage/migrations.ts";
import { SqliteDriver } from "../../../apps/server/src/storage/sqlite.ts";
import { Store } from "../../../apps/server/src/storage/store.ts";
import { VisuaService } from "../../../apps/server/src/services/visua.ts";
import { EventBus } from "../../../apps/server/src/bus.ts";
import { FrameworkRegistry } from "../../../packages/frameworks/src/index.ts";

const profile: OrganizationProfile = { industry: "saas", size: "11-50", dataTypes: [], drivers: [], environments: ["cloud"], maturityTier: 1, guidance: "guided", securityTeamSize: 1 };
const A = "nist-csf-2.0:PR.AA-01";
const observed: unknown[] = [];
const svc = await createService({ database: ":memory:" });
try {
  const client = new TestClient(createApp(svc, new AuthService(svc, { ...loadAuthConfig({}), mode: "dev" })));
  assert.equal((await client.devLogin("fix-review@example.test", "Independent reviewer")).status, 200);
  const ws = await client.post<{ workspace: { id: string } }>("/api/workspaces", { name: "Corrected API fixture", profile, frameworks: ["nist-csf-2.0"] });
  assert.equal(ws.status, 201);
  const path = `/api/workspaces/${ws.json.workspace.id}/evidence`;
  const replacement = { content: "MFA disabled", data: { enabled: false } };
  const created = await client.post<Evidence>(path, { title: "Inspected original JSON document", content: canonical(replacement), requirementIds: [A], collectedAt: "2026-01-01", validUntil: "2027-12-31" });
  const approved = await client.patch<Evidence>(`${path}/${created.json.id}`, { decision: "accepted", expectedScope: evidenceReviewScope(created.json) });
  const edited = await client.patch<Evidence>(`${path}/${created.json.id}`, replacement);
  assert.equal(approved.status, 200);
  assert.equal(edited.status, 200);
  assert.notEqual(edited.json.sha256, approved.json.sha256);
  assert.equal(edited.json.status, "pending-review");
  assert.equal(edited.json.reviewHistory?.length, 1);
  assert.equal(hasCurrentEvidenceReview(edited.json), false);
  assert.equal(isEvidenceValid(edited.json), false);
  const stale = await client.patch(`${path}/${created.json.id}`, { decision: "accepted", expectedScope: evidenceReviewScope(approved.json) });
  assert.equal(stale.status, 400);
  observed.push({ case: "artifact_shape_alias_refused", reviewStatus: approved.status, editStatus: edited.status, changedSha: edited.json.sha256 !== approved.json.sha256, editState: edited.json.status, staleReviewStatus: stale.status });
  const c = await svc.createEvidence(ws.json.workspace.id, { title: "Immutable observation", source: "connector", content: "Enabled", data: { checkId: "mfa", observed: { enabled: true } }, requirementIds: [A], collectedAt: "2026-01-01T00:00:00.000Z", validUntil: "2027-12-31", status: "accepted" });
  const recipe = createHash("sha256").update(canonical({ checkId: "mfa", observed: { enabled: true }, observedAt: c.collectedAt })).digest("hex");
  assert.equal(c.sha256, recipe);
  for (const patch of [{ content: "Changed" }, { data: { checkId: "mfa", observed: { enabled: false } } }, { collectedAt: "2026-01-02" }]) await assert.rejects(svc.updateEvidence(ws.json.workspace.id, c.id, patch), /immutable/);
  assert.equal((await svc.store.evidence.get(c.id))?.sha256, recipe);
  assert.equal((await svc.verifyAuditTrail(ws.json.workspace.id)).valid, true);
  observed.push({ case: "connector_recipe_and_immutability_preserved", sha256: recipe, rejectedProtectedChanges: 3, auditValid: true });
} finally { await svc.store.close(); }

const driver = new SqliteDriver(":memory:");
const store = new Store(driver);
const legacySvc = new VisuaService(store, FrameworkRegistry.load(), new EventBus());
try {
  await driver.execute("CREATE TABLE schema_migrations (version INTEGER PRIMARY KEY, name TEXT NOT NULL, applied_at TEXT NOT NULL)");
  for (const m of MIGRATIONS.filter((m) => m.version < 5)) await driver.transaction(async (tx) => {
    await m.up(tx);
    await tx.execute("INSERT INTO schema_migrations (version, name, applied_at) VALUES (?, ?, ?)", [m.version, m.name, new Date().toISOString()]);
  });
  const ws = await legacySvc.createWorkspace({ name: "Corrected migration fixture", profile, frameworks: ["nist-csf-2.0"] });
  const prior: Evidence[] = [];
  for (const status of ["accepted", "rejected", "pending-review"] as const) {
    const e = await legacySvc.createEvidence(ws.id, { title: `Legacy ${status}`, content: `Artifact ${status}`, requirementIds: [A], collectedAt: "2026-01-01", validUntil: "2027-12-31" });
    const hadDecision = status !== "pending-review";
    const old: Evidence = { ...e, status, sha256: status === "pending-review" ? createHash("sha256").update(e.content!).digest("hex") : undefined, reviewedBy: hadDecision ? "Prior reviewer" : undefined, reviewedAt: hadDecision ? "2026-01-02T00:00:00.000Z" : undefined, reviewHistory: undefined };
    prior.push(old);
    await store.evidence.put(old);
  }
  const noArtifact = await legacySvc.createEvidence(ws.id, { title: "No actual artifact", requirementIds: [A], collectedAt: "2026-01-01" });
  const auditedBefore = (await store.activity.chain(ws.id)).length;
  assert.deepEqual(await migrate(driver), [5]);
  assert.equal((await store.activity.chain(ws.id)).length, auditedBefore + 3);
  assert.equal((await legacySvc.verifyAuditTrail(ws.id)).valid, true);
  for (const old of prior) {
    const next = (await store.evidence.get(old.id))!;
    assert.equal(next.sha256, artifactHash(next));
    assert.notEqual(next.sha256, old.sha256);
    assert.equal(hasCurrentEvidenceReview(next), false);
    assert.equal(next.status, old.status === "accepted" ? "pending-review" : old.status);
    const historySize = old.status === "pending-review" ? 0 : 1;
    assert.equal(next.reviewHistory?.length, historySize);
    if (historySize) {
      assert.equal(next.reviewHistory![0]!.legacy, true);
      assert.equal(next.reviewHistory![0]!.scope, undefined);
      assert.equal(next.reviewHistory![0]!.decision, old.status);
    }
    const event = (await store.activity.chain(ws.id)).find((x) => x.entityId === old.id && x.action === "approval-binding-upgraded")!;
    assert.equal(event.data?.before && (event.data.before as { sha256?: string }).sha256, old.sha256);
    assert.equal((event.data?.after as { sha256: string }).sha256, next.sha256);
    const reviewed = await legacySvc.reviewEvidence(ws.id, next.id, "accepted", "Current reviewer", undefined, evidenceReviewScope(next));
    assert.equal(reviewed.reviewHistory?.length, historySize + 1);
    assert.equal(hasCurrentEvidenceReview(reviewed), true);
    observed.push({ case: `legacy_${old.status}_reviewable`, migrationState: next.status, migratedHash: next.sha256, archivedDecisions: historySize, renewedReviewValid: true, auditBeforeAfter: true });
  }
  assert.equal((await store.evidence.get(noArtifact.id))?.sha256, undefined);
  await assert.rejects(legacySvc.reviewEvidence(ws.id, noArtifact.id, "accepted", "Current reviewer", undefined, evidenceReviewScope(noArtifact)), /requires an artifact/);
  const head = await store.activity.head(ws.id);
  assert.deepEqual(await migrate(driver), []);
  assert.deepEqual(await store.activity.head(ws.id), head);
  assert.equal((await legacySvc.verifyAuditTrail(ws.id)).valid, true);
  observed.push({ case: "migration_idempotent_and_missing_artifact_refused", idempotent: true, noArtifactHash: null, noArtifactAcceptanceRefused: true, auditValid: true });
} finally { await store.close(); }
console.log(JSON.stringify({ status: "passed", database: "isolated SQLite in memory", checks: observed }, null, 2));
