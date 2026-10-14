import type { Evidence, EvidenceRenewalDates, MappingRelationship, MappingStatus } from "@visua/core";

export interface ComparisonEndpoint {
  id: string; code: string; title: string; framework: string; group: string | null; resolved: boolean;
}
export interface ComparisonGroup { id: string; code: string; title: string; total: number }
export interface ComparisonRow {
  id: string; recordIndex: number; setId: string; setTitle: string; setAuthority: string;
  relationship: MappingRelationship; label?: string; status: MappingStatus | null; strength?: string; note?: string;
  origin: { authority: string; documentId: string; documentTitle: string; path?: string; locator?: string; page?: number };
  source: ComparisonEndpoint; target: ComparisonEndpoint; sourceGroup: string; targetGroup: string;
}
export interface CrosswalkComparison {
  workspaceId: string; asOf: string;
  frameworks: { id: string; shortName: string }[]; source: string; target: string;
  sourceGroups: ComparisonGroup[]; targetGroups: ComparisonGroup[];
  cells: { sourceGroup: string; targetGroup: string; count: number }[];
  pairTotal: number; unresolvedTotal: number; ungroupedTotal: number;
  sets: { id: string; title: string; authority: string; status: MappingStatus | null; source: string; target: string; count: number }[];
  sourceGroup: string | null; targetGroup: string | null; filteredTotal: number; page: number; pageSize: number; pages: number;
  rows: ComparisonRow[]; evidence: { id: string; title: string }[];
  selectedEvidence: (EvidenceRenewalDates & {
    id: string; title: string; status: Evidence["status"]; source: Evidence["source"]; acceptanceBound: boolean; currentlyValid: boolean;
    links: (ComparisonEndpoint & { kind: "requirement" | "group" | "unresolved"; frameworkLabel: string })[];
  }) | null;
}

/** URL state is the comparison state; never carry previous-pair data as placeholder rows. */
export function comparisonQuery(params: URLSearchParams): string {
  const query = new URLSearchParams();
  for (const key of ["source", "target", "sourceGroup", "targetGroup", "page", "evidence"]) {
    const value = params.get(key); if (value !== null) query.set(key, value);
  }
  return query.toString();
}

export function changeComparison(params: URLSearchParams, changes: Record<string, string | null>): URLSearchParams {
  const next = new URLSearchParams(params);
  const pairChanged = "source" in changes || "target" in changes;
  if (pairChanged) { next.delete("sourceGroup"); next.delete("targetGroup"); }
  if (pairChanged || "sourceGroup" in changes || "targetGroup" in changes) next.delete("page");
  for (const [key, value] of Object.entries(changes)) { if (value === null) next.delete(key); else next.set(key, value); }
  return next;
}
