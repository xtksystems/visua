/**
 * Framework metadata in the web app comes from /api/meta: each framework's family,
 * names and compact badge label, in the server's presentation order. This module
 * also holds the one map from a framework to its program page. The shell renders
 * its pages only once the metadata has loaded, so these lookups are always filled.
 */
import type { FrameworkDescriptor, FrameworkFamily } from "@visua/core";

export type Family = FrameworkFamily;
export type FrameworkMeta = FrameworkDescriptor & { units?: number };

let ordered: FrameworkMeta[] = [];
let byId = new Map<string, FrameworkMeta>();

/** Called with /api/meta's frameworks. */
export function registerFrameworks(list: FrameworkMeta[]): void {
  ordered = list;
  byId = new Map(list.map((f) => [f.id, f]));
}

export const frameworkMeta = (id: string): FrameworkMeta | undefined => byId.get(id);

/** Every framework and threat catalog, in presentation order. */
export const allFrameworks = (): readonly FrameworkMeta[] => ordered;

/** Threat catalogs (MITRE ATLAS, the OWASP Top 10s, NIST AI 100-2): viewed, never assessed. */
export const threatCatalogs = (): FrameworkMeta[] => ordered.filter((f) => f.family === "threat");

export const familyOf = (frameworkId: string): Family | undefined => byId.get(frameworkId)?.family;

export const isThreatCatalog = (frameworkId: string): boolean => familyOf(frameworkId) === "threat";

/** Compact label for badges and dense views ("SOC 2", "ATLAS"). */
export const badgeOf = (frameworkId: string): string => {
  const f = byId.get(frameworkId);
  return f?.badge ?? f?.shortName ?? frameworkId;
};

/** Where each family's program lives. */
const PROGRAM_PAGE: Record<Family, string> = {
  csf: "profile",
  soc2: "soc2",
  rmf: "rmf",
  ai: "ai",
  law: "laws",
  threat: "threats",
};

/** The program page of a framework (a threat catalog opens its own view on the threats page). */
export function programPath(ws: string, frameworkId: string): string {
  const family = familyOf(frameworkId);
  if (!family) return `/w/${ws}/observatory/${frameworkId}`;
  return family === "threat" ? `/w/${ws}/threats/${frameworkId}` : `/w/${ws}/${PROGRAM_PAGE[family]}`;
}
