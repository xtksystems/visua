import assert from "node:assert/strict";
import { createService } from "../../../../apps/server/src/context.ts";
import { requirementEvidenceLineage } from "../../../../apps/server/src/services/evidence-lineage.ts";
import { evidenceReviewScope, effectiveEvidenceState, isEvidenceValid, deriveStatus, buildSnapshot } from "../../../../packages/core/src/index.ts";

const svc = await createService({ database: ":memory:" });
const A = "nist-csf-2.0:PR.AA-01";
const ws = await svc.createWorkspace({ name: "Isolated lifecycle review", frameworks: ["nist-csf-2.0"], profile: { industry: "saas", size: "11-50", dataTypes: [], drivers: [], environments: ["cloud"], maturityTier: 1, guidance: "guided", securityTeamSize: 1 } });
const results: Record<string, unknown> = {};
try {
  let item = await svc.createEvidence(ws.id, { title: "Synthetic observation", content: "Synthetic observation body", requirementIds: [A], collectedAt: "2026-01-01", validUntil: "2099-12-31", assurance: { kind: "operating", scope: "Synthetic identity observation" } });
  item = await svc.reviewEvidence(ws.id, item.id, "accepted", "first-reviewer", undefined, evidenceReviewScope(item));
  const staleSnapshot = evidenceReviewScope(item);
  const withdrawn = await svc.reviewEvidence(ws.id, item.id, "withdrawn", "second-reviewer", "Source invalidated", evidenceReviewScope(item));
  assert.equal(withdrawn.status, "withdrawn");
  let staleResult;
  try { staleResult = await svc.reviewEvidence(ws.id, item.id, "accepted", "stale-reviewer", undefined, staleSnapshot); }
  catch (error) { staleResult = { rejected: String(error) }; }
  results.staleAcceptanceAfterWithdrawal = { resultStatus: staleResult.status ?? null, error: staleResult.rejected ?? null, history: staleResult.reviewHistory?.map((r) => r.decision) ?? null };

  const current = await svc.store.evidence.get(item.id);
  const beforeReview = new Date("2026-06-01");
  const lineage = await requirementEvidenceLineage(svc, ws, A, beforeReview.toISOString());
  results.clockBeforeAcceptance = { at: beforeReview.toISOString(), reviewedAt: current!.reviewedAt, isValid: isEvidenceValid(current!, beforeReview), effective: effectiveEvidenceState(current!, [current!], beforeReview, A), lineageEffective: lineage.items[0]?.effective };

  const checks = [
    { id: "failure-original-target", workspaceId: ws.id, connectorId: "one-connector", checkId: "same-check", title: "Original target failure", outcome: "fail", detail: "Synthetic failure", requirementIds: [A], observed: {}, observedAt: "2026-01-01T00:00:00.000Z", source: { connectorKind: "synthetic", connectorName: "First", configHash: "first" } },
    { id: "pass-new-target", workspaceId: ws.id, connectorId: "one-connector", checkId: "same-check", title: "New target pass", outcome: "pass", detail: "Synthetic pass", requirementIds: [A], observed: {}, observedAt: "2026-01-02T00:00:00.000Z", source: { connectorKind: "synthetic", connectorName: "Second", configHash: "second" } },
  ] as const;
  const snapshot = buildSnapshot({ states: [], tasks: [], evidence: [], checks: [...checks] as never });
  results.independentCheckTargets = { checkIds: snapshot.checksByNode.get(A)?.map((c) => c.id), status: deriveStatus({ state: undefined, evidence: [], tasks: [], checks: snapshot.checksByNode.get(A) ?? [], now: new Date("2026-06-01") }).status };

  const policy = await svc.createPolicy(ws.id, { title: "Synthetic policy", body: "Original approved body", requirementIds: [A] });
  await svc.updatePolicy(ws.id, policy.id, { status: "approved" }, "policy-approver");
  const policyEvidence = (await svc.store.evidence.list(ws.id)).find((e) => e.provenance?.policy?.id === policy.id)!;
  try {
    const mutated = await svc.updateEvidence(ws.id, policyEvidence.id, { content: "Changed after approval" });
    results.approvedPolicyBodyEdit = { rejected: false, sourceHashStillOriginal: mutated.provenance?.policy?.sha256 === policyEvidence.provenance?.policy?.sha256 };
  } catch (error) { results.approvedPolicyBodyEdit = { rejected: true, error: String(error) }; }
  console.log(JSON.stringify(results, null, 2));
} finally { await svc.store.close(); }
