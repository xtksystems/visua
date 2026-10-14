import assert from "node:assert/strict";
import { createService } from "../../../apps/server/src/context.ts";
import { createApp } from "../../../apps/server/src/app.ts";
import { AuthService } from "../../../apps/server/src/auth/service.ts";
import { loadAuthConfig } from "../../../apps/server/src/auth/config.ts";
import { TestClient } from "../../../apps/server/test/client.ts";
import { canonical } from "../../../apps/server/src/audit.ts";
import { evidenceReviewScope, hasCurrentEvidenceReview, isEvidenceValid, type Evidence, type OrganizationProfile } from "../../../packages/core/src/index.ts";
import { MIGRATIONS, migrate } from "../../../apps/server/src/storage/migrations.ts";
import { SqliteDriver } from "../../../apps/server/src/storage/sqlite.ts";
import { Store } from "../../../apps/server/src/storage/store.ts";
import { VisuaService } from "../../../apps/server/src/services/visua.ts";
import { EventBus } from "../../../apps/server/src/bus.ts";
import { FrameworkRegistry } from "../../../packages/frameworks/src/index.ts";

if (!process.argv.includes("--legacy-only")) {
const svc = await createService({ database: ":memory:" });
const client = new TestClient(createApp(svc, new AuthService(svc, { ...loadAuthConfig({}), mode: "dev" })));
try {
  assert.equal((await client.devLogin("review-repro@example.test", "Independent reviewer")).status, 200);
  const profile: OrganizationProfile = { industry: "saas", size: "11-50", dataTypes: [], drivers: [], environments: ["cloud"], maturityTier: 1, guidance: "guided", securityTeamSize: 1 };
  const ws = await client.post<{ workspace: { id: string } }>("/api/workspaces", { name: "Read-only review fixture", profile, frameworks: ["nist-csf-2.0"] });
  assert.equal(ws.status, 201);
  const path = `/api/workspaces/${ws.json.workspace.id}/evidence`;
  const collision = { content: "MFA disabled", data: { enabled: false } };
  const created = await client.post<Evidence>(path, { title: "Inspected original JSON document", content: canonical(collision), requirementIds: ["nist-csf-2.0:PR.AA-01"], collectedAt: "2026-01-01", validUntil: "2027-12-31" });
  assert.equal(created.status, 201);
  const reviewed = await client.patch<Evidence>(`${path}/${created.json.id}`, { decision: "accepted", expectedScope: evidenceReviewScope(created.json) });
  assert.equal(reviewed.status, 200);
  const edited = await client.patch<Evidence>(`${path}/${created.json.id}`, collision);
  assert.equal(edited.status, 200);
  assert.notEqual(edited.json.content, reviewed.json.content);
  assert.equal(edited.json.sha256, reviewed.json.sha256);
  assert.equal(edited.json.status, "accepted");
  assert.equal(hasCurrentEvidenceReview(edited.json), true);
  assert.equal(isEvidenceValid(edited.json, new Date("2026-10-03")), true);
  console.log(JSON.stringify({ case: "ambiguous_artifact_encoding", createStatus: created.status, reviewStatus: reviewed.status, editStatus: edited.status, previousContent: reviewed.json.content, nextContent: edited.json.content, previousData: reviewed.json.data ?? null, nextData: edited.json.data, unchangedSha256: edited.json.sha256, statusAfterProtectedEdit: edited.json.status, historyCount: edited.json.reviewHistory?.length, currentReview: hasCurrentEvidenceReview(edited.json), valid: isEvidenceValid(edited.json, new Date("2026-10-03")) }, null, 2));
} finally {
  await svc.store.close();
}
}

const legacyDriver = new SqliteDriver(":memory:");
const legacyStore = new Store(legacyDriver);
const legacySvc = new VisuaService(legacyStore, FrameworkRegistry.load(), new EventBus());
try {
  await legacyDriver.execute("CREATE TABLE schema_migrations (version INTEGER PRIMARY KEY, name TEXT NOT NULL, applied_at TEXT NOT NULL)");
  for (const migration of MIGRATIONS.filter((m) => m.version < 5)) await legacyDriver.transaction(async (tx) => {
    await migration.up(tx);
    await tx.execute("INSERT INTO schema_migrations (version, name, applied_at) VALUES (?, ?, ?)", [migration.version, migration.name, new Date().toISOString()]);
  });
  const profile: OrganizationProfile = { industry: "saas", size: "11-50", dataTypes: [], drivers: [], environments: ["cloud"], maturityTier: 1, guidance: "guided", securityTeamSize: 1 };
  const ws = await legacySvc.createWorkspace({ name: "Legacy review fixture", profile, frameworks: ["nist-csf-2.0"] });
  const e = await legacySvc.createEvidence(ws.id, { title: "Legacy approved policy", content: "Approved access control policy", requirementIds: ["nist-csf-2.0:PR.AA-01"], collectedAt: "2026-01-01", validUntil: "2027-12-31" });
  await legacyStore.evidence.put({ ...e, sha256: undefined, status: "accepted", reviewedBy: "Legacy approver", reviewedAt: "2026-01-02T00:00:00.000Z", reviewHistory: undefined });
  await migrate(legacyDriver);
  const pending = (await legacyStore.evidence.get(e.id))!;
  let error = "";
  try { await legacySvc.reviewEvidence(ws.id, e.id, "accepted", "Current approver", undefined, evidenceReviewScope(pending)); }
  catch (err) { error = (err as Error).message; }
  assert.equal(pending.status, "pending-review");
  assert.equal(pending.sha256, undefined);
  assert.equal(error, "Evidence artifact does not match its recorded hash");
  console.log(JSON.stringify({ case: "legacy_missing_digest_cannot_be_reviewed", migrationStatus: pending.status, artifactPresent: !!pending.content, migratedSha256: pending.sha256 ?? null, archivedDecision: pending.reviewHistory, reviewError: error }, null, 2));
} finally {
  await legacyStore.close();
}
