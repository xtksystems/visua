import { createHash } from "node:crypto";
import type { Evidence } from "@visua/core";
import { canonical } from "../audit.ts";

/** Compute from artifacts, never a caller-supplied digest. Preserve the connector observation recipe. */
export function artifactHash(e: Pick<Evidence, "source" | "content" | "data" | "collectedAt">): string | undefined {
  let artifact: string;
  if (e.source === "connector") {
    if (!e.data || typeof e.data["checkId"] !== "string" || e.data["observed"] === undefined) return undefined;
    artifact = canonical({ checkId: e.data["checkId"], observed: e.data["observed"], observedAt: e.collectedAt });
  } else if (e.content !== undefined || e.data !== undefined) {
    // One encoding for every artifact shape: raw text that resembles JSON must
    // never alias an artifact containing different text and structured data.
    artifact = canonical({ content: e.content, data: e.data });
  } else return undefined;
  return createHash("sha256").update(artifact).digest("hex");
}

/** Audit metadata and artifact identity without copying raw observations into the log. */
export function evidenceAuditSnapshot(e: Evidence): Record<string, unknown> {
  return {
    title: e.title, description: e.description, fileName: e.fileName,
    sha256: e.sha256, requirementIds: e.requirementIds, collectedAt: e.collectedAt,
    validUntil: e.validUntil, status: e.status, reviewedBy: e.reviewedBy,
    reviewedAt: e.reviewedAt, reviewCount: e.reviewHistory?.length ?? 0,
  };
}

export type EvidencePatch = Partial<Pick<Evidence, "title" | "description" | "content" | "data" | "fileName" | "requirementIds" | "collectedAt">> & { validUntil?: string | null };
