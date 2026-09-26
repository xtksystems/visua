/**
 * CSF 2.0 Tiers assessment. The statements are quoted verbatim from NIST
 * CSWP 29, Appendix B, Table 2 ("Notional Illustration of the CSF Tiers"),
 * PDF pages 29–30. Each dimension asks which statement best describes the
 * organization; the answer's position is the Tier for that dimension.
 */

export const TIER_NAMES = ["Partial", "Risk Informed", "Repeatable", "Adaptive"] as const;

export const TIER_SOURCE = { documentId: "nist-cswp-29-csf-2-0", locator: "Appendix B, Table 2 — Notional Illustration of the CSF Tiers", pages: [29, 30] };

export interface TierDimension {
  id: string;
  area: "governance" | "management";
  question: string;
  /** Four statements, Tier 1 → Tier 4. */
  statements: [string, string, string, string];
}

export const TIER_DIMENSIONS: TierDimension[] = [
  {
    id: "risk-strategy",
    area: "governance",
    question: "How is the cybersecurity risk strategy applied?",
    statements: [
      "Application of the organizational cybersecurity risk strategy is managed in an ad hoc manner.",
      "Risk management practices are approved by management but may not be established as organization-wide policy.",
      "The organization’s risk management practices are formally approved and expressed as policy.",
      "There is an organization-wide approach to managing cybersecurity risks that uses risk-informed policies, processes, and procedures to address potential cybersecurity events.",
    ],
  },
  {
    id: "prioritization",
    area: "governance",
    question: "How are cybersecurity activities prioritized?",
    statements: [
      "Prioritization is ad hoc and not formally based on objectives or threat environment.",
      "The prioritization of cybersecurity activities and protection needs is directly informed by organizational risk objectives, the threat environment, or business/mission requirements.",
      "Risk-informed policies, processes, and procedures are defined, implemented as intended, and reviewed.",
      "The relationship between cybersecurity risks and organizational objectives is clearly understood and considered when making decisions.",
    ],
  },
  {
    id: "executive-oversight",
    area: "governance",
    question: "How do leadership and budgeting treat cybersecurity risk?",
    statements: [
      "There is limited awareness of cybersecurity risks at the organizational level.",
      "Consideration of cybersecurity in organizational objectives and programs may occur at some but not all levels of the organization.",
      "Organizational cybersecurity practices are regularly updated based on the application of risk management processes to changes in business/mission requirements, threats, and technological landscape.",
      "Executives monitor cybersecurity risks in the same context as financial and other organizational risks. The organizational budget is based on an understanding of the current and predicted risk environment and risk tolerance.",
    ],
  },
  {
    id: "awareness",
    area: "management",
    question: "What is the level of cybersecurity risk awareness?",
    statements: [
      "There is limited awareness of cybersecurity risks at the organizational level.",
      "There is an awareness of cybersecurity risks at the organizational level, but an organization-wide approach to managing cybersecurity risks has not been established.",
      "There is an organization-wide approach to managing cybersecurity risks.",
      "Cybersecurity risk management is part of the organizational culture. It evolves from an awareness of previous activities and continuous awareness of activities on organizational systems and networks.",
    ],
  },
  {
    id: "consistency",
    area: "management",
    question: "How consistently is cybersecurity risk managed?",
    statements: [
      "The organization implements cybersecurity risk management on an irregular, case-by-case basis.",
      "Cyber risk assessment of organizational and external assets occurs but is not typically repeatable or reoccurring.",
      "Consistent methods are in place to respond effectively to changes in risk. Personnel possess the knowledge and skills to perform their appointed roles and responsibilities.",
      "The organization adapts its cybersecurity practices based on previous and current cybersecurity activities, including lessons learned and predictive indicators.",
    ],
  },
  {
    id: "information-sharing",
    area: "management",
    question: "How is cybersecurity information shared?",
    statements: [
      "The organization may not have processes that enable cybersecurity information to be shared within the organization.",
      "Cybersecurity information is shared within the organization on an informal basis.",
      "Cybersecurity information is routinely shared throughout the organization.",
      "Cybersecurity information is constantly shared throughout the organization and with authorized third parties.",
    ],
  },
  {
    id: "monitoring",
    area: "management",
    question: "How are the cybersecurity risks of assets monitored and communicated?",
    statements: [
      "The organization implements cybersecurity risk management on an irregular, case-by-case basis.",
      "Consideration of cybersecurity in organizational objectives and programs may occur at some but not all levels of the organization.",
      "The organization consistently and accurately monitors the cybersecurity risks of assets. Senior cybersecurity and non-cybersecurity executives communicate regularly regarding cybersecurity risks.",
      "Through a process of continuous improvement that incorporates advanced cybersecurity technologies and practices, the organization actively adapts to a changing technological landscape and responds in a timely and effective manner to evolving, sophisticated threats.",
    ],
  },
  {
    id: "supplier-risk",
    area: "management",
    question: "How are supplier and acquired-product risks handled?",
    statements: [
      "The organization is generally unaware of the cybersecurity risks associated with its suppliers and the products and services it acquires and uses.",
      "The organization is aware of the cybersecurity risks associated with its suppliers and the products and services it acquires and uses, but it does not act consistently or formally in response to those risks.",
      "The organization risk strategy is informed by the cybersecurity risks associated with its suppliers and the products and services it acquires and uses. Personnel formally act upon those risks through mechanisms such as written agreements to communicate baseline requirements, governance structures (e.g., risk councils), and policy implementation and monitoring.",
      "The organization uses real-time or near real-time information to understand and consistently act upon the cybersecurity risks associated with its suppliers and the products and services it acquires and uses.",
    ],
  },
];

export interface TierAssessment {
  answers: Record<string, 1 | 2 | 3 | 4>;
  governanceTier: 1 | 2 | 3 | 4;
  managementTier: 1 | 2 | 3 | 4;
  overallTier: 1 | 2 | 3 | 4;
  assessedAt: string;
}

const clampTier = (n: number): 1 | 2 | 3 | 4 => Math.max(1, Math.min(4, n)) as 1 | 2 | 3 | 4;

/**
 * Score answers. Each area's Tier is the floor of the mean — a Tier is only
 * credited when practices consistently meet it — and the overall Tier is the
 * lower of the two areas.
 */
export function assessTiers(answers: Record<string, number>, now: Date = new Date()): TierAssessment {
  const valid: Record<string, 1 | 2 | 3 | 4> = {};
  for (const d of TIER_DIMENSIONS) {
    const a = answers[d.id];
    if (a !== undefined) valid[d.id] = clampTier(Math.round(a));
  }
  const areaTier = (area: TierDimension["area"]) => {
    const values = TIER_DIMENSIONS.filter((d) => d.area === area && valid[d.id]).map((d) => valid[d.id]!);
    return clampTier(values.length ? Math.floor(values.reduce((a, b) => a + b, 0) / values.length) : 1);
  };
  const governanceTier = areaTier("governance");
  const managementTier = areaTier("management");
  return {
    answers: valid,
    governanceTier,
    managementTier,
    overallTier: clampTier(Math.min(governanceTier, managementTier)),
    assessedAt: now.toISOString(),
  };
}
