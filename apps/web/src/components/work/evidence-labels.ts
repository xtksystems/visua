import type { Evidence, EvidenceAssurance } from "@visua/core";

export const ASSURANCE_LABELS: Record<EvidenceAssurance["kind"], string> = {
  design: "Design", operating: "Operating", attestation: "Attestation", unspecified: "Unspecified",
};

/** Collection claims come only from recorded provenance, never from today's links. */
export function provenance(evidence: Evidence): { label: string; title: string } {
  switch (evidence.provenance?.origin) {
    case "connector-check": return { label: "Recorded connector check", title: "Collected from a stored check observation. Inspect its source and observation time." };
    case "agent-proposal": return { label: "Agent-assisted", title: "Agent-generated narrative approved by a person. It is not an automated observation or human attestation." };
    case "upload": return { label: "Uploaded", title: "A person uploaded this artifact. An uploaded assertion does not independently verify identity or operation." };
    case "manual": return { label: "Manually recorded", title: "A person recorded this artifact. Inspect the content and assurance scope." };
    case "approved-policy": return { label: "Approved policy version", title: "A recorded policy version documents design; it does not show that the policy operated." };
    default: return { label: "Origin not recorded", title: "This legacy artifact has no recorded collection provenance. Its current links do not establish its origin." };
  }
}

export function canUploadReplacement(evidence: Evidence): boolean {
  const origin = evidence.provenance?.origin;
  return origin ? origin === "upload" || origin === "manual" : evidence.source === "upload" || evidence.source === "manual";
}

export function assuranceDraft(evidence?: Evidence): EvidenceAssurance {
  return evidence?.assurance ? { ...evidence.assurance } : { kind: "unspecified", scope: "" };
}

export function assuranceError(value: EvidenceAssurance): string | undefined {
  if (value.kind !== "unspecified" && !value.scope.trim()) return "Describe what this evidence covers.";
  if (value.scope.trim().length > 2_000) return "Keep the assurance scope within 2,000 characters.";
  if (!!value.observationStart !== !!value.observationEnd) return "Enter both observation dates, or leave both blank.";
  if (value.observationStart && value.observationEnd && Date.parse(value.observationEnd) < Date.parse(value.observationStart)) return "Observation end must be on or after its start.";
  return undefined;
}
