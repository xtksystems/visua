import { createHash } from "node:crypto";
import { afterAll, afterEach, describe, expect, it, vi } from "vitest";
import { buildSnapshot, deriveStatus, evidenceCoverageTimeline, evidenceFreshness, isEvidenceValid, effectiveEvidenceState, evidenceReviewScope, hasCurrentEvidenceReview, type Evidence, type OrganizationProfile, type RequirementEvidenceLineage } from "@visua/core";
import { FrameworkRegistry } from "@visua/frameworks";
import { createApp } from "../src/app.ts";
import { loadAuthConfig } from "../src/auth/config.ts";
import { AuthService } from "../src/auth/service.ts";
import { VisuaService } from "../src/services/visua.ts";
import { canonical } from "../src/audit.ts";
import { createService } from "../src/context.ts";
import { TestClient } from "./client.ts";
import { testDatabase } from "./db.ts";

const registry = FrameworkRegistry.load();
const db = await testDatabase("evidence_lifecycle");
const svc = await createService({ database: db.url, registry });
const client = new TestClient(createApp(svc, new AuthService(svc, { ...loadAuthConfig({}), mode: "dev" })));
await client.devLogin("lifecycle@example.test", "Lifecycle reviewer");
const profile: OrganizationProfile = { industry: "saas", size: "11-50", dataTypes: [], drivers: [], environments: ["cloud"], maturityTier: 1, guidance: "guided", securityTeamSize: 1 };
const A = "nist-csf-2.0:PR.AA-01", B = "nist-csf-2.0:PR.AA-02";
const assurance = { kind: "operating" as const, scope: "Identity configuration" };
async function workspace() {
  const response = await client.post<{ workspace: { id: string } }>("/api/workspaces", { name: "Lifecycle", profile, frameworks: ["nist-csf-2.0", "aicpa-tsc-2017"] });
  expect(response.status).toBe(201);
  return response.json.workspace.id;
}
async function artifact(ws: string, extra: Partial<Evidence> = {}) {
  return svc.createEvidence(ws, { title: "Identity configuration", content: "An observed artifact", requirementIds: [A, B], collectedAt: "2026-01-01", validUntil: "2026-12-31", assurance, ...extra });
}
const accept = (ws: string, e: Evidence) => svc.reviewEvidence(ws, e.id, "accepted", "reviewer", undefined, evidenceReviewScope(e));
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });
afterAll(async () => { await svc.store.close(); await db.cleanup(); });

describe(`evidence lifecycle (${db.dialect})`, () => {
  it("records server-owned provenance, preserves licensing after relinking, and leaves legacy origins unknown", async () => {
    const ws = await workspace();
    const node = registry.node(A)!;
    const old = node.attributes;
    node.attributes = { ...old, licensed: true };
    let e: Evidence;
    try { e = await artifact(ws, { provenance: { origin: "connector-check" } as never, contentRequirementIds: ["forged"] }); }
    finally { node.attributes = old; }
    expect(e!.provenance).toMatchObject({ origin: "manual", originalRequirementIds: [A, B], restrictedContent: true });
    const changed = await svc.updateEvidence(ws, e!.id, { requirementIds: [B] });
    expect(changed.provenance).toEqual(e!.provenance);
    expect(changed.contentRequirementIds).toEqual([A, B]);
    expect(changed.restrictedContent).toBe(true);
    expect(changed.contentSourceDocumentIds).toContain(node.citation.documentId);
    await svc.store.evidence.put({ ...changed, provenance: undefined, assurance: undefined });
    const result = await client.get<RequirementEvidenceLineage>(`/api/workspaces/${ws}/evidence/lineage?requirementId=${B}`);
    expect(result.json.items[0]!.unknowns).toContain("Collection provenance not recorded");
    expect(result.json.items[0]!.evidence.provenance).toBeUndefined();
  });

  it("binds assurance and replacement scope; rejects stale edits/reviews and malformed observation periods", async () => {
    const ws = await workspace(), e = await accept(ws, await artifact(ws));
    const changed = await svc.updateEvidence(ws, e.id, { assurance: { ...assurance, scope: "Different scope" }, expectedScope: evidenceReviewScope(e) });
    expect(changed.status).toBe("pending-review");
    expect(changed.reviewHistory).toEqual(e.reviewHistory);
    expect(hasCurrentEvidenceReview(changed)).toBe(false);
    await expect(svc.updateEvidence(ws, e.id, { assurance, expectedScope: evidenceReviewScope(e) })).rejects.toThrow("changed");
    await expect(accept(ws, e)).rejects.toThrow("changed");
    for (const period of [{ observationStart: "2026-01-01" }, { observationStart: "2026-02-02", observationEnd: "2026-02-01" }, { observationStart: "2026-02-30", observationEnd: "2026-03-01" }]) {
      await expect(artifact(ws, { assurance: { ...assurance, ...period } })).rejects.toThrow();
    }
  });

  it("requires rejection and withdrawal reasons and retains append-only inspection history", async () => {
    const ws = await workspace(), e = await artifact(ws);
    const path = `/api/workspaces/${ws}/evidence/${e.id}`;
    for (const decision of ["rejected", "withdrawn"]) expect((await client.patch(path, { decision, note: " ", expectedScope: evidenceReviewScope(e) })).status).toBe(400);
    const rejected = await svc.reviewEvidence(ws, e.id, "rejected", "reviewer", "Wrong environment", evidenceReviewScope(e));
    const accepted = await accept(ws, rejected);
    const withdrawn = await svc.reviewEvidence(ws, e.id, "withdrawn", "reviewer", "Source invalidated", evidenceReviewScope(accepted));
    expect(withdrawn.reviewHistory?.map((r) => r.decision)).toEqual(["rejected", "accepted", "withdrawn"]);
    expect(effectiveEvidenceState(withdrawn, [withdrawn], new Date("2026-10-01")).status).toBe("withdrawn");
    expect((await svc.verifyAuditTrail(ws)).valid).toBe(true);
  });

  it("rejects all stale HTTP review decisions after withdrawal and allows a newly inspected decision", async () => {
    const ws = await workspace(), e = await artifact(ws);
    const path = `/api/workspaces/${ws}/evidence/${e.id}`;
    const first = await client.patch<Evidence>(path, { decision: "accepted", expectedScope: evidenceReviewScope(e), expectedReviewId: null });
    expect(first.status).toBe(200);
    const reviewId = first.json.reviewHistory!.at(-1)!.id;
    const withdrawal = await client.patch<Evidence>(path, { decision: "withdrawn", note: "Withdrawn after new information", expectedScope: evidenceReviewScope(first.json), expectedReviewId: reviewId });
    expect(withdrawal.status).toBe(200);
    const head = await svc.store.activity.head(ws);
    for (const decision of ["accepted", "rejected", "withdrawn"]) {
      const stale = await client.patch(path, { decision, note: "Stale decision", expectedScope: evidenceReviewScope(first.json), expectedReviewId: reviewId });
      expect(stale.status).toBe(400);
      expect(stale.text).toContain("review changed");
    }
    // Omitting the new field is safe only when the artifact has no previous review.
    expect((await client.patch(path, { decision: "accepted", expectedScope: evidenceReviewScope(e) })).status).toBe(400);
    expect(await svc.store.activity.head(ws)).toEqual(head);
    expect((await svc.store.evidence.metadataGet(e.id))!.reviewHistory).toHaveLength(2);
    const fresh = await client.patch<Evidence>(path, { decision: "accepted", expectedScope: evidenceReviewScope(withdrawal.json), expectedReviewId: withdrawal.json.reviewHistory!.at(-1)!.id });
    expect(fresh.status).toBe(200);
    expect(fresh.json.reviewHistory?.map((r) => r.decision)).toEqual(["accepted", "withdrawn", "accepted"]);
  });

  it("evaluates acceptance time consistently without reconstructing earlier decisions", async () => {
    vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(new Date("2026-06-10"));
    const ws = await workspace(), e = await accept(ws, await artifact(ws));
    const before = new Date("2026-06-09"), after = new Date("2026-06-11");
    expect(isEvidenceValid(e, before)).toBe(false);
    expect(evidenceFreshness(e, before)).toBe("none");
    expect(evidenceCoverageTimeline([e], before).coveredNow).toBe(false);
    expect(isEvidenceValid(e, after)).toBe(true);
    expect(evidenceCoverageTimeline([e], after).coveredNow).toBe(true);
    const lineage = await client.get<RequirementEvidenceLineage>(`/api/workspaces/${ws}/evidence/lineage?requirementId=${A}&at=2026-06-09`);
    expect(lineage.json.items[0]!.effective).toMatchObject({ status: "pending-review", currentlyValid: false, validity: "current" });
    expect(lineage.json.items[0]!.effective.reasons.join(" ")).toContain("acceptance had not occurred");
    vi.setSystemTime(new Date("2026-06-12"));
    const withdrawn = await svc.reviewEvidence(ws, e.id, "withdrawn", "reviewer", "Reconsider source", evidenceReviewScope(e));
    vi.setSystemTime(new Date("2026-06-13"));
    const again = await accept(ws, withdrawn);
    expect(isEvidenceValid(again, after)).toBe(false); // Current metadata does not replay the first decision.
    expect(isEvidenceValid(again, new Date("2026-06-14"))).toBe(true);
  });

  it("binds agent review proposals to the inspected decision and refuses a later withdrawal override", async () => {
    const ws = await workspace(), accepted = await accept(ws, await artifact(ws));
    const propose = () => svc.createProposal(ws, "run", { type: "review-evidence", title: "Review artifact", rationale: "Inspect recorded evidence", payload: { evidenceId: accepted.id, decision: "accepted", expectedReviewId: "forged" }, confidence: "high", citations: [], nodeIds: [A] });
    const stale = await propose();
    const withdrawn = await svc.reviewEvidence(ws, accepted.id, "withdrawn", "reviewer", "New source information", evidenceReviewScope(accepted));
    const decision = await svc.decideProposal(ws, stale.id, "approved", "approver");
    expect(decision.status).toBe("failed");
    expect(decision.rationale).toContain("review changed");
    expect((await svc.store.evidence.metadataGet(accepted.id))!.reviewHistory).toEqual(withdrawn.reviewHistory);
    expect(stale.payload["expectedReviewId"]).toBe(accepted.reviewHistory!.at(-1)!.id);
    const edited = await propose();
    expect((await svc.decideProposal(ws, edited.id, "approved", "approver", { expectedReviewId: null })).status).toBe("failed");
    const fresh = await propose();
    expect((await svc.decideProposal(ws, fresh.id, "approved", "approver")).status).toBe("applied");
    expect((await svc.store.evidence.metadataGet(accepted.id))!.reviewHistory?.map(r => r.decision)).toEqual(["accepted", "withdrawn", "accepted"]);
  });

  it("only suppresses expired risk after compatible acceptance and per covered requirement", async () => {
    vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(new Date("2026-06-01"));
    const ws = await workspace(), old = await accept(ws, await artifact(ws, { validUntil: "2026-05-31" }));
    const replacement = await artifact(ws, { supersedesId: old.id, requirementIds: [A], collectedAt: "2026-06-01" });
    expect(effectiveEvidenceState(old, [old, replacement], new Date("2026-06-02"), A).supersededByIds).toEqual([]);
    vi.setSystemTime(new Date("2026-06-03"));
    const accepted = await accept(ws, replacement);
    expect(effectiveEvidenceState(old, [old, accepted], new Date("2026-06-02"), A).supersededByIds).toEqual([]);
    expect(effectiveEvidenceState(old, [old, accepted], new Date("2026-06-04"), A).supersededByIds).toEqual([accepted.id]);
    expect(effectiveEvidenceState(old, [old, accepted], new Date("2026-06-04"), B).supersededByIds).toEqual([]);
    const state = { nodeId: A, applicable: true, current: 2, target: 2, priority: "medium" as const, updatedAt: "2026-06-01", updatedBy: "fixture", verifiedAt: "2026-06-01" };
    expect(deriveStatus({ state, evidence: [old, accepted], tasks: [], checks: [], now: new Date("2026-06-04") }).status).toBe("verified");
    expect(deriveStatus({ state, evidence: [old, accepted], tasks: [], checks: [{ id: "fail", workspaceId: ws, connectorId: "other", checkId: "check", title: "Independent failure", outcome: "fail", detail: "Failed", requirementIds: [A], observed: {}, observedAt: "2026-06-01" }], now: new Date("2026-06-04") }).status).toBe("at-risk");
    const withdrawn = await svc.reviewEvidence(ws, accepted.id, "withdrawn", "reviewer", "Invalid source", evidenceReviewScope(accepted));
    expect(effectiveEvidenceState(old, [old, withdrawn], new Date("2026-06-04"), A).supersededByIds).toEqual([]);
  });

  it("refuses incompatible, foreign and forged replacement references", async () => {
    const ws = await workspace(), other = await workspace(), old = await artifact(ws);
    await expect(artifact(other, { supersedesId: old.id })).rejects.toThrow("workspace");
    await expect(artifact(ws, { supersedesId: old.id, assurance: { kind: "design", scope: assurance.scope } })).rejects.toThrow("assurance");
    await expect(svc.updateEvidence(ws, old.id, { supersedesId: "other" } as never)).rejects.toThrow("cannot be edited");
    const path = `/api/workspaces/${ws}/evidence`;
    expect((await client.post(path, { title: "Spoof", requirementIds: [A], content: "x", kind: "automated-check" })).status).toBe(400);
    expect((await client.post(path, { title: "Spoof", requirementIds: [A], content: "x", provenance: { origin: "connector-check" } })).status).toBe(400);
    for (const kind of ["attestation", "automated-check", "policy"]) await expect(svc.createProposal(ws, "run", { type: "create-evidence", title: "Narrative", rationale: "Narrative", payload: { title: "Narrative", content: "x", requirementIds: [A], kind }, citations: [], confidence: "high", nodeIds: [A] })).rejects.toThrow("Agent narrative");
  });

  it("serves lineage using metadata only and refuses foreign workspace records", async () => {
    const ws = await workspace(), other = await workspace();
    const e = await artifact(ws), foreign = await artifact(other);
    vi.spyOn(svc.store.evidence, "get").mockRejectedValue(new Error("Inline body read forbidden"));
    vi.spyOn(svc.store.evidence, "list").mockRejectedValue(new Error("Inline body list forbidden"));
    vi.spyOn(svc.blobs, "get").mockRejectedValue(new Error("Blob read forbidden"));
    const result = await client.get<RequirementEvidenceLineage>(`/api/workspaces/${ws}/evidence/lineage?requirementId=${A}&at=2026-10-01`);
    expect(result.status).toBe(200);
    expect(result.json.asOf).toBe("2026-10-01T00:00:00.000Z");
    expect(result.json.items.map((i) => i.evidence.id)).toEqual([e.id]);
    expect(JSON.stringify(result.json)).not.toContain("An observed artifact");
    expect(JSON.stringify(result.json)).not.toContain(foreign.id);
    expect((await client.get(`/api/workspaces/${ws}/evidence/lineage?requirementId=${A}&at=invalid`)).status).toBe(400);
  });

  it("pins stored check target identity before later connector edits and keeps different targets in separate series", async () => {
    vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(new Date("2026-06-01"));
    const ws = await workspace();
    const collected = new VisuaService(svc.store, registry, svc.bus, [{
      kind: "fixture", name: "Fixture", description: "No external calls", configFields: [],
      run: async (config) => [{ checkId: "access", title: "Access check", outcome: "pass", detail: "Access observed", requirements: { csf: ["PR.AA-01"] }, observed: { target: config["target"] } }],
    }], svc.blobs);
    const connector = await collected.createConnector(ws, { kind: "fixture", name: "Original target", config: { target: "first" } });
    const [check] = await collected.runConnector(ws, connector.id, "collector", { fileEvidence: false });
    const configHash = createHash("sha256").update(canonical({ kind: "fixture", config: { target: "first" } })).digest("hex");
    expect(check!.source).toEqual({ connectorKind: "fixture", connectorName: "Original target", configHash });
    await svc.store.connectors.put({ ...connector, name: "Changed target", config: { target: "second" } });
    const proposal = await collected.createProposal(ws, "run", { type: "create-evidence", title: "File check", rationale: "Observed", payload: { checkResultId: check!.id }, citations: [], confidence: "high", nodeIds: [A] });
    expect((await collected.decideProposal(ws, proposal.id, "approved", "reviewer")).status).toBe("applied");
    const old = (await svc.store.evidence.metadataList(ws))[0]!;
    expect(old.provenance).toMatchObject({ origin: "connector-check", check: { resultId: check!.id, connectorName: "Original target", sourceConfigHash: configHash }, agent: { runId: "run", proposalId: proposal.id } });
    expect(old.title).toBe("Original target: Access check");
    vi.setSystemTime(new Date("2026-07-02"));
    const [second] = await collected.runConnector(ws, connector.id);
    const replacement = (await svc.store.evidence.metadataGet(second!.evidenceId!))!;
    expect(replacement.provenance!.seriesKey).not.toBe(old.provenance!.seriesKey);
    expect(effectiveEvidenceState(old, [old, replacement], new Date("2026-07-03"), A).supersededByIds).toEqual([]);
    const independentFailure = { ...check!, id: "failed-original-target", outcome: "fail" as const };
    const snapshot = buildSnapshot({ states: [], evidence: [old, replacement], tasks: [], checks: [independentFailure, second!] });
    expect(snapshot.checksByNode.get(A)?.map((c) => c.outcome).sort()).toEqual(["fail", "pass"]);
    expect(deriveStatus({ state: undefined, evidence: [old, replacement], tasks: [], checks: snapshot.checksByNode.get(A)!, now: new Date("2026-07-03") }).status).toBe("at-risk");
    await svc.store.connectors.put({ ...connector, name: "Same target new label" });
    vi.setSystemTime(new Date("2026-07-03"));
    const [third] = await collected.runConnector(ws, connector.id);
    const sameTarget = (await svc.store.evidence.metadataGet(third!.evidenceId!))!;
    expect(sameTarget.provenance!.seriesKey).toBe(old.provenance!.seriesKey);
    expect(effectiveEvidenceState(old, [old, replacement, sameTarget], new Date("2026-07-04"), A).supersededByIds).toEqual([sameTarget.id]);
  });

  it("captures approved policy versions without following later policy edits", async () => {
    const ws = await workspace();
    const p = await svc.createPolicy(ws, { title: "Identity policy", body: "First version", requirementIds: [A] });
    await expect(svc.updatePolicy(ws, p.id, { status: "published" })).rejects.toThrow("approval");
    // Caller-supplied policy-looking data must not block the real approved version.
    const spoof = await client.post<Evidence>(`/api/workspaces/${ws}/evidence`, { title: "Uploaded assertion", kind: "policy", content: "Not the approved policy", requirementIds: [A], data: { policyId: p.id, version: 1 } });
    expect(spoof.status).toBe(201);
    await svc.updatePolicy(ws, p.id, { status: "approved" }, "approver");
    const before = (await svc.store.evidence.metadataList(ws)).find((e) => e.provenance?.policy?.version === 1)!;
    await expect(svc.updateEvidence(ws, before.id, { content: "Unapproved rewritten policy" })).rejects.toThrow("Approved policy artifacts are immutable");
    await svc.updatePolicy(ws, p.id, { body: "Second version", status: "approved" }, "second approver");
    const after = (await svc.store.evidence.metadataList(ws)).find((e) => e.provenance?.policy?.version === 2)!;
    expect(before.provenance?.policy).toMatchObject({ id: p.id, version: 1, sha256: createHash("sha256").update("First version").digest("hex"), approvedBy: "approver" });
    expect(after.provenance?.policy).toMatchObject({ id: p.id, version: 2, approvedBy: "second approver" });
    expect((await svc.store.evidence.metadataGet(before.id))?.provenance).toEqual(before.provenance);
  });
});
