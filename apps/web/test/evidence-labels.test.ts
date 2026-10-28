import { describe, expect, it } from "vitest";
import type { Evidence } from "@visua/core";
import { assuranceDraft, assuranceError, canUploadReplacement, provenance } from "../src/components/work/evidence-labels.ts";

const evidence: Evidence = { id: "legacy", workspaceId: "ws", title: "Observed record", kind: "document", source: "connector", requirementIds: ["nist-csf-2.0:PR.AA-01"], collectedAt: "2026-01-01", createdAt: "2026-01-01", status: "pending-review" };
const recorded = { recordedBy: "member", recordedAt: "2026-01-01", originalRequirementIds: [], sourceDocumentIds: [], restrictedContent: false };
describe("evidence collection labels and form validation", () => {
  it("never infers a legacy collection claim from current source or links", () => {
    expect(provenance(evidence).label).toBe("Origin not recorded");
    expect(provenance({ ...evidence, source: "agent" }).label).toBe("Origin not recorded");
    expect(assuranceDraft(evidence)).toEqual({ kind: "unspecified", scope: "" });
  });
  it("distinguishes recorded agent narratives, policy design and connector observations", () => {
    expect(provenance({ ...evidence, provenance: { ...recorded, origin: "agent-proposal" } }).title).toContain("not an automated observation");
    expect(provenance({ ...evidence, provenance: { ...recorded, origin: "approved-policy" } }).title).toContain("does not show that the policy operated");
    expect(provenance({ ...evidence, provenance: { ...recorded, origin: "connector-check" } }).label).toBe("Recorded connector check");
  });
  it("offers human replacements without presenting unknown origins as certified", () => {
    expect(canUploadReplacement(evidence)).toBe(false);
    expect(canUploadReplacement({ ...evidence, source: "upload" })).toBe(true);
    expect(canUploadReplacement({ ...evidence, source: "upload", provenance: { ...recorded, origin: "agent-proposal" } })).toBe(false);
  });
  it("requires stated scope and complete, ordered observation periods", () => {
    expect(assuranceError({ kind: "operating", scope: " " })).toBeTruthy();
    expect(assuranceError({ kind: "operating", scope: "Identity access", observationStart: "2026-01-01" })).toContain("both observation dates");
    expect(assuranceError({ kind: "operating", scope: "Identity access", observationStart: "2026-02-01", observationEnd: "2026-01-31" })).toContain("on or after");
    expect(assuranceError({ kind: "unspecified", scope: "" })).toBeUndefined();
    expect(assuranceError({ kind: "operating", scope: "Identity access", observationStart: "2026-02-01", observationEnd: "2026-02-01" })).toBeUndefined();
  });
});
