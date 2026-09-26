/**
 * Maturity-adaptive, niche-aware recommendations.
 *
 * Given an organization profile, decide the framework path, default targets
 * and which CSF 2.0 categories deserve priority. Every rule carries a
 * human-readable reason so agents and the UI can explain *why*.
 */
import type { DataType, Driver, Industry, OrganizationProfile, Priority } from "./types.ts";

export interface FrameworkRecommendation {
  frameworkId: string;
  name: string;
  order: number;
  availability: "available" | "roadmap";
  reason: string;
}

export interface Recommendation {
  frameworks: FrameworkRecommendation[];
  /** Default target implementation level (0–4) for in-scope requirements. */
  defaultTarget: number;
  /** Target level for requirements whose priority is critical/high. */
  elevatedTarget: number;
  /** CSF 2.0 category code → priority. Categories not listed default to "medium". */
  categoryPriorities: Record<string, Priority>;
  /** Categories to explore first in the Observatory, most important first. */
  focus: string[];
  rationale: string[];
  guidance: OrganizationProfile["guidance"];
}

/** Categories every organization should treat as high priority (CSF 2.0 foundations). */
const FOUNDATION: Record<string, string> = {
  "GV.OC": "Organizational context anchors every other decision",
  "GV.RM": "A risk management strategy sets priorities and risk appetite",
  "GV.RR": "Clear roles, responsibilities and authorities make work assignable",
  "GV.PO": "Policy is the backbone auditors and customers ask for first",
  "ID.AM": "You cannot protect assets you have not inventoried",
  "ID.RA": "Risk assessment focuses effort where it matters",
  "PR.AA": "Identity, authentication and access control stop most intrusions",
  "PR.DS": "Data security protects the information you are accountable for",
  "DE.CM": "Continuous monitoring shortens time to detect",
  "RS.MA": "Incident management limits the damage when something happens",
  "RC.RP": "Recovery plan execution restores operations",
};

const INDUSTRY_EMPHASIS: Record<Industry, { categories: string[]; reason: string }> = {
  saas: { categories: ["PR.PS", "PR.AA", "GV.SC", "DE.CM", "PR.DS", "ID.IM"], reason: "multi-tenant platform security and supplier assurance drive customer trust" },
  fintech: { categories: ["PR.AA", "PR.DS", "DE.AE", "DE.CM", "GV.SC", "GV.OV", "RS.MA"], reason: "fraud, financial data and regulator scrutiny demand strong access, detection and oversight" },
  healthcare: { categories: ["PR.DS", "PR.AA", "ID.AM", "RC.RP", "RS.CO", "GV.SC"], reason: "patient data confidentiality and availability of care are paramount" },
  manufacturing: { categories: ["ID.AM", "PR.IR", "DE.CM", "RC.RP", "GV.SC", "PR.PS"], reason: "OT/ICS environments need asset visibility, resilient infrastructure and recovery" },
  "public-sector": { categories: ["GV.PO", "GV.RR", "GV.OV", "ID.RA", "PR.AT", "RS.CO"], reason: "public accountability requires formal governance, oversight and communication" },
  "defense-contractor": { categories: ["PR.AA", "PR.DS", "PR.AT", "DE.CM", "GV.SC", "ID.RA"], reason: "protecting CUI requires rigorous access control, awareness and supply-chain risk management" },
  education: { categories: ["PR.AA", "PR.AT", "DE.CM", "RC.RP", "PR.DS"], reason: "large, transient user populations need identity hygiene and awareness" },
  retail: { categories: ["PR.DS", "PR.AA", "DE.CM", "PR.PS", "GV.SC"], reason: "payment and customer data attract financially motivated attackers" },
  "energy-utilities": { categories: ["PR.IR", "ID.AM", "DE.CM", "RS.MA", "RC.RP", "GV.SC"], reason: "critical-infrastructure operations must stay resilient" },
  nonprofit: { categories: ["PR.AT", "PR.AA", "RC.RP", "PR.DS"], reason: "lean teams benefit most from awareness, MFA and backups" },
  "professional-services": { categories: ["PR.DS", "PR.AA", "PR.AT", "GV.SC"], reason: "client confidentiality is the product" },
  other: { categories: ["PR.AA", "PR.DS", "DE.CM"], reason: "core protective and detective outcomes apply to every organization" },
};

const DATA_EMPHASIS: Partial<Record<DataType, { categories: string[]; reason: string }>> = {
  phi: { categories: ["PR.DS", "PR.AA", "GV.OC"], reason: "PHI brings HIPAA obligations and high breach impact" },
  pii: { categories: ["PR.DS", "PR.AA", "GV.OC"], reason: "personal data is subject to privacy laws and breach notification" },
  cardholder: { categories: ["PR.DS", "PR.AA", "PR.PS", "DE.CM"], reason: "cardholder data brings PCI DSS obligations" },
  cui: { categories: ["PR.DS", "PR.AA", "PR.AT", "DE.CM"], reason: "CUI is subject to NIST SP 800-171 / CMMC requirements" },
  financial: { categories: ["PR.DS", "PR.AA", "DE.AE"], reason: "financial data is a prime fraud target" },
  "intellectual-property": { categories: ["PR.DS", "PR.AA", "DE.CM"], reason: "IP theft is hard to detect and irreversible" },
  children: { categories: ["GV.OC", "PR.DS"], reason: "children's data carries heightened legal protections" },
  biometric: { categories: ["GV.OC", "PR.DS"], reason: "biometric identifiers cannot be rotated once exposed" },
};

const DRIVER_EMPHASIS: Partial<Record<Driver, { categories: string[]; reason: string }>> = {
  "cyber-insurance": { categories: ["PR.AA", "PR.DS", "RC.RP", "DE.CM"], reason: "insurers underwrite on MFA, backups, EDR and recovery" },
  "incident-recovery": { categories: ["RS.MA", "RS.AN", "RS.MI", "RC.RP", "RC.CO", "DE.AE", "ID.IM"], reason: "recent incidents call for stronger response, recovery and lessons learned" },
  "board-mandate": { categories: ["GV.OV", "GV.RM", "GV.RR"], reason: "boards need oversight, risk strategy and accountable roles" },
  "investor-due-diligence": { categories: ["GV.RM", "GV.PO", "ID.RA"], reason: "diligence reviews focus on governance maturity and known risks" },
  regulator: { categories: ["GV.OC", "GV.PO", "GV.OV"], reason: "regulators examine legal/regulatory context, policy and oversight" },
};

function bump(p: Priority | undefined, to: Priority): Priority {
  const order: Priority[] = ["low", "medium", "high", "critical"];
  if (!p) return to;
  return order.indexOf(to) > order.indexOf(p) ? to : p;
}

export function recommend(profile: OrganizationProfile): Recommendation {
  const priorities: Record<string, Priority> = {};
  const rationale: string[] = [];
  const focusScore = new Map<string, number>();
  const addFocus = (code: string, w: number) => focusScore.set(code, (focusScore.get(code) ?? 0) + w);

  for (const [code] of Object.entries(FOUNDATION)) {
    priorities[code] = "high";
    addFocus(code, 1);
  }
  rationale.push("Foundational CSF 2.0 categories (governance, assets, risk, access, data, monitoring, response, recovery) start at high priority.");

  const industry = INDUSTRY_EMPHASIS[profile.industry];
  for (const code of industry.categories) {
    priorities[code] = bump(priorities[code], "high");
    addFocus(code, 2);
  }
  rationale.push(`Industry (${profile.industry}): ${industry.reason}.`);

  for (const dt of profile.dataTypes) {
    const rule = DATA_EMPHASIS[dt];
    if (!rule) continue;
    for (const code of rule.categories) {
      priorities[code] = bump(priorities[code], "critical");
      addFocus(code, 3);
    }
    rationale.push(`Data (${dt}): ${rule.reason}.`);
  }
  for (const d of profile.drivers) {
    const rule = DRIVER_EMPHASIS[d];
    if (!rule) continue;
    for (const code of rule.categories) {
      priorities[code] = bump(priorities[code], "high");
      addFocus(code, 2);
    }
    rationale.push(`Driver (${d}): ${rule.reason}.`);
  }
  if (profile.environments.includes("ot")) {
    for (const code of ["PR.IR", "ID.AM", "DE.CM"]) {
      priorities[code] = bump(priorities[code], "critical");
      addFocus(code, 2);
    }
    rationale.push("Operational technology in scope: infrastructure resilience and asset visibility are critical.");
  }

  // Targets scale with current maturity and organization size so goals stay achievable.
  const tier = profile.maturityTier;
  const small = profile.size === "1-10" || profile.size === "11-50";
  let defaultTarget = Math.min(4, tier + 1);
  if (small) defaultTarget = Math.min(defaultTarget, 3);
  defaultTarget = Math.max(2, defaultTarget);
  const elevatedTarget = Math.min(4, Math.max(defaultTarget, tier >= 3 ? 4 : 3));
  rationale.push(
    `Current maturity is Tier ${tier}; Visua sets a default target of level ${defaultTarget} and level ${elevatedTarget} for high-priority outcomes — ambitious but reachable${small ? " for a small team" : ""}.`,
  );

  const frameworks: FrameworkRecommendation[] = [
    {
      frameworkId: "nist-csf-2.0",
      name: "NIST CSF 2.0",
      order: 1,
      availability: "available",
      reason: "The foundation: a common language for your whole program, adaptable to any size, sector or maturity.",
    },
  ];
  const wantsSoc2 =
    profile.drivers.includes("enterprise-customers") ||
    ["saas", "fintech", "professional-services", "healthcare"].includes(profile.industry);
  const wantsRmf =
    profile.drivers.includes("federal-customers") ||
    ["public-sector", "defense-contractor"].includes(profile.industry) ||
    profile.dataTypes.includes("cui");
  let order = 2;
  if (wantsSoc2) {
    frameworks.push({
      frameworkId: "aicpa-tsc-2017",
      name: "SOC 2 (AICPA Trust Services Criteria)",
      order: order++,
      availability: "available",
      reason: "Enterprise buyers expect a SOC 2 report; most of the work is reused from your CSF program via crosswalks.",
    });
  }
  if (wantsRmf) {
    frameworks.push({
      frameworkId: "nist-sp-800-53-r5",
      name: "NIST RMF with SP 800-53 Rev. 5",
      order: order++,
      availability: "available",
      reason: "Federal customers and authorizations (ATO, FedRAMP) run on the RMF and the SP 800-53 control baselines.",
    });
  }
  if (!wantsSoc2) {
    frameworks.push({
      frameworkId: "aicpa-tsc-2017",
      name: "SOC 2 (AICPA Trust Services Criteria)",
      order: order++,
      availability: "available",
      reason: "Optional next step once customers ask for independent assurance.",
    });
  }
  if (!wantsRmf) {
    frameworks.push({
      frameworkId: "nist-sp-800-53-r5",
      name: "NIST RMF with SP 800-53 Rev. 5",
      order: order++,
      availability: "available",
      reason: "The most detailed control catalog — use it to deepen specific CSF outcomes even without federal drivers.",
    });
  }
  const roadmap: [boolean, string, string, string][] = [
    [profile.dataTypes.includes("phi"), "hipaa-security-rule", "HIPAA Security Rule", "PHI is in scope"],
    [profile.dataTypes.includes("cardholder"), "pci-dss-4", "PCI DSS v4.0.1", "cardholder data is in scope"],
    [profile.dataTypes.includes("cui"), "nist-sp-800-171-r3", "NIST SP 800-171 Rev. 3 / CMMC", "CUI is in scope"],
    [true, "iso-27001-2022", "ISO/IEC 27001:2022", "international customers often require certification"],
  ];
  for (const [applies, id, name, why] of roadmap) {
    if (!applies) continue;
    frameworks.push({ frameworkId: id, name, order: order++, availability: "roadmap", reason: `On the Visua roadmap — ${why}.` });
  }

  const focus = [...focusScore.entries()].sort((a, b) => b[1] - a[1]).map(([code]) => code).slice(0, 6);
  return { frameworks, defaultTarget, elevatedTarget, categoryPriorities: priorities, focus, rationale, guidance: profile.guidance };
}

/** Target level for a requirement given its priority. */
export function targetFor(priority: Priority, rec: Pick<Recommendation, "defaultTarget" | "elevatedTarget">): number {
  return priority === "critical" || priority === "high" ? rec.elevatedTarget : rec.defaultTarget;
}

/** Estimate a CSF Tier (1–4) from ten quick-check answers scored 0–3. */
export function estimateTier(answers: number[]): 1 | 2 | 3 | 4 {
  if (!answers.length) return 1;
  const avg = answers.reduce((a, b) => a + Math.max(0, Math.min(3, b)), 0) / answers.length;
  if (avg >= 2.5) return 4;
  if (avg >= 1.75) return 3;
  if (avg >= 0.9) return 2;
  return 1;
}
