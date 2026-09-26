/**
 * RMF Categorize step helpers: FIPS 199 security categorization with the
 * high-water mark (FIPS 200) used to select the SP 800-53B baseline.
 */
import type { ImpactLevel, RmfSettings } from "./types.ts";

const ORDER: ImpactLevel[] = ["low", "moderate", "high"];

export const maxImpact = (...levels: ImpactLevel[]): ImpactLevel =>
  levels.reduce<ImpactLevel>((m, l) => (ORDER.indexOf(l) > ORDER.indexOf(m) ? l : m), "low");

/**
 * FIPS 199: SC(system) = {(confidentiality, impact), (integrity, impact), (availability, impact)}
 * where each objective takes the highest value among the information types it processes.
 * FIPS 200: the overall system impact level is the high-water mark across the three objectives.
 */
export function categorize(types: RmfSettings["informationTypes"]): NonNullable<RmfSettings["categorization"]> {
  if (!types.length) return { confidentiality: "low", integrity: "low", availability: "low", overall: "low" };
  const confidentiality = maxImpact(...types.map((t) => t.confidentiality));
  const integrity = maxImpact(...types.map((t) => t.integrity));
  const availability = maxImpact(...types.map((t) => t.availability));
  return { confidentiality, integrity, availability, overall: maxImpact(confidentiality, integrity, availability) };
}

/** Example information types an organization can start from (values are provisional and must be reviewed). */
export const EXAMPLE_INFORMATION_TYPES: RmfSettings["informationTypes"] = [
  { id: "customer-pii", name: "Customer personally identifiable information", confidentiality: "moderate", integrity: "moderate", availability: "low" },
  { id: "financial-records", name: "Financial management records", confidentiality: "moderate", integrity: "moderate", availability: "low" },
  { id: "system-security", name: "System and network security information", confidentiality: "moderate", integrity: "moderate", availability: "moderate" },
  { id: "public-information", name: "Public website content", confidentiality: "low", integrity: "moderate", availability: "moderate" },
  { id: "health-records", name: "Health care records (PHI)", confidentiality: "high", integrity: "moderate", availability: "moderate" },
  { id: "cui", name: "Controlled unclassified information", confidentiality: "moderate", integrity: "moderate", availability: "low" },
];
