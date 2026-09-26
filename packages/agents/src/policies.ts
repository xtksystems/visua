/**
 * Policy library used by the Policy Author. Each template names the
 * requirement groups it governs across frameworks; the body is composed from
 * the official outcome text and implementation examples, so drafts are
 * grounded rather than boilerplate.
 */
import { codeOf, frameworkOf, type RequirementNode } from "@visua/core";

export interface PolicyTemplate {
  id: string;
  title: string;
  purpose: string;
  scope: string;
  roles: [string, string][];
  /** Code prefixes that route to this template (CSF categories, SOC 2 series, SP 800-53 families). */
  matches: string[];
  reviewCadenceDays: number;
}

export const POLICY_TEMPLATES: PolicyTemplate[] = [
  {
    id: "information-security-policy",
    title: "Information Security Policy",
    purpose:
      "establish management's direction, commitment and expectations for protecting {org}'s information and systems, and to set the framework within which all other security policies operate",
    scope: "all workforce members, contractors, systems, data and facilities of {org}",
    roles: [
      ["Executive leadership / board", "Approves this policy, sets risk appetite and provides resources and oversight."],
      ["Security lead (CISO or delegate)", "Owns the security program, maintains policies and reports on risk."],
      ["All workforce members", "Comply with this policy and report suspected incidents."],
    ],
    matches: ["GV.PO", "GV.OC", "GV.RM", "GV.OV", "CC1", "CC2", "CC5", "PL", "PM"],
    reviewCadenceDays: 365,
  },
  {
    id: "roles-responsibilities-charter",
    title: "Security Roles, Responsibilities and Authorities Charter",
    purpose: "define accountable roles, responsibilities and decision authorities for cybersecurity risk management at {org}",
    scope: "leadership, managers and every role with security responsibilities at {org}",
    roles: [
      ["Executive leadership", "Accountable for cybersecurity risk and for allocating resources."],
      ["Security lead", "Coordinates the program and escalates risk decisions."],
      ["Human resources", "Integrates security into hiring, onboarding, role changes and offboarding."],
    ],
    matches: ["GV.RR", "PS"],
    reviewCadenceDays: 365,
  },
  {
    id: "risk-management-policy",
    title: "Risk Assessment and Management Policy",
    purpose: "define how {org} identifies, analyzes, prioritizes, responds to and monitors cybersecurity risk",
    scope: "all systems, processes, suppliers and data that support {org}'s mission",
    roles: [
      ["Risk owner", "Accepts, mitigates, transfers or avoids assigned risks within appetite."],
      ["Security lead", "Maintains the risk register and methodology."],
    ],
    matches: ["ID.RA", "ID.IM", "GV.RM", "CC3", "CC9.1", "RA", "CA"],
    reviewCadenceDays: 365,
  },
  {
    id: "asset-management-policy",
    title: "Asset Management Policy",
    purpose: "ensure {org}'s hardware, software, services, data and systems are inventoried, owned, classified and managed through their life cycle",
    scope: "all assets that store, process or transmit {org} data, including cloud services",
    roles: [
      ["Asset owners", "Keep inventory records accurate and approve access."],
      ["IT / platform team", "Operate discovery tooling and disposal procedures."],
    ],
    matches: ["ID.AM", "CM-8", "PM-5"],
    reviewCadenceDays: 365,
  },
  {
    id: "access-control-policy",
    title: "Identity and Access Control Policy",
    purpose: "ensure access to {org}'s systems and data is limited to authorized users, services and devices, following least privilege and strong authentication",
    scope: "all identities (workforce, service accounts, devices) and all systems holding {org} data",
    roles: [
      ["System owners", "Approve access and review it periodically."],
      ["IT / identity team", "Operate identity provider, MFA and provisioning."],
      ["Managers", "Request and attest to their team's access."],
    ],
    matches: ["PR.AA", "CC6.1", "CC6.2", "CC6.3", "CC6.4", "CC6.5", "AC", "IA", "PE"],
    reviewCadenceDays: 365,
  },
  {
    id: "data-protection-policy",
    title: "Data Protection and Cryptography Policy",
    purpose: "protect the confidentiality, integrity and availability of {org}'s data at rest, in transit and in use, including backups",
    scope: "all data created, received, stored or processed by {org}",
    roles: [
      ["Data owners", "Classify data and approve its handling."],
      ["Engineering / IT", "Implement encryption, backups and secure disposal."],
    ],
    matches: ["PR.DS", "CC6.1", "CC6.7", "C1", "PI1", "SC", "MP"],
    reviewCadenceDays: 365,
  },
  {
    id: "secure-configuration-change-policy",
    title: "Secure Configuration and Change Management Policy",
    purpose: "ensure {org}'s platforms are securely configured, patched and changed in a controlled, reviewed manner, and that software is developed securely",
    scope: "all hardware, software, cloud services and code repositories operated by {org}",
    roles: [
      ["Engineering leads", "Approve changes and enforce secure development practices."],
      ["Platform / IT", "Maintain baselines, patching and configuration monitoring."],
    ],
    matches: ["PR.PS", "CC7.1", "CC8", "CM", "SA-8", "SA-10", "SA-11", "SA-15", "SI-2", "MA"],
    reviewCadenceDays: 365,
  },
  {
    id: "resilience-policy",
    title: "Technology Infrastructure Resilience Policy",
    purpose: "ensure {org}'s networks and infrastructure are protected and resilient enough to meet availability commitments",
    scope: "networks, environments and capacity supporting {org} services",
    roles: [["Platform / network team", "Design segmentation, redundancy and capacity management."]],
    matches: ["PR.IR", "A1", "SC-7", "CP-7", "CP-8"],
    reviewCadenceDays: 365,
  },
  {
    id: "logging-monitoring-standard",
    title: "Logging and Continuous Monitoring Standard",
    purpose: "ensure {org} detects anomalies, indicators of compromise and adverse events quickly through continuous monitoring and log analysis",
    scope: "networks, endpoints, cloud services, applications and personnel activity relevant to security",
    roles: [
      ["Security operations", "Triage alerts and escalate incidents."],
      ["System owners", "Enable required logging and retain logs."],
    ],
    matches: ["DE.CM", "DE.AE", "CC7.2", "CC7.3", "AU", "SI-4", "CA-7"],
    reviewCadenceDays: 365,
  },
  {
    id: "incident-response-plan",
    title: "Incident Response Plan",
    purpose: "define how {org} prepares for, detects, analyzes, contains, eradicates and recovers from cybersecurity incidents and communicates about them",
    scope: "all suspected or confirmed cybersecurity incidents affecting {org} or its customers",
    roles: [
      ["Incident commander", "Leads the response and declares severity."],
      ["Communications lead", "Coordinates internal, customer and regulatory communications."],
      ["Legal / privacy", "Assesses notification obligations."],
    ],
    matches: ["RS.MA", "RS.AN", "RS.CO", "RS.MI", "CC7.4", "CC7.5", "IR"],
    reviewCadenceDays: 365,
  },
  {
    id: "business-continuity-dr-plan",
    title: "Business Continuity and Disaster Recovery Plan",
    purpose: "ensure {org} can restore assets and operations affected by incidents and disruptions within agreed recovery objectives",
    scope: "critical business processes, systems and data of {org}",
    roles: [
      ["Recovery lead", "Executes and coordinates recovery activities."],
      ["System owners", "Maintain and test recovery procedures and backups."],
    ],
    matches: ["RC.RP", "RC.CO", "A1.2", "A1.3", "CP"],
    reviewCadenceDays: 365,
  },
  {
    id: "supplier-risk-policy",
    title: "Supplier and Third-Party Risk Management Policy",
    purpose: "manage cybersecurity risks arising from {org}'s suppliers, service providers and technology supply chain",
    scope: "all suppliers and third parties that access {org} data or provide critical products or services",
    roles: [
      ["Procurement", "Ensures due diligence and contractual security requirements."],
      ["Supplier owners", "Monitor supplier performance and risk."],
    ],
    matches: ["GV.SC", "CC9.2", "SA-4", "SA-9", "SR"],
    reviewCadenceDays: 365,
  },
  {
    id: "security-awareness-policy",
    title: "Security Awareness and Training Policy",
    purpose: "ensure everyone at {org} has the awareness and skills to perform their tasks with cybersecurity risks in mind",
    scope: "all workforce members and contractors, with role-based training for privileged and specialized roles",
    roles: [["Security lead", "Runs the awareness program and tracks completion."], ["Managers", "Ensure their teams complete training."]],
    matches: ["PR.AT", "CC1.4", "CC2.2", "AT"],
    reviewCadenceDays: 365,
  },
  {
    id: "privacy-policy",
    title: "Privacy Program Policy",
    purpose: "govern how {org} collects, uses, retains, discloses and disposes of personal information in line with its privacy commitments",
    scope: "all personal information processed by {org}",
    roles: [["Privacy officer", "Owns privacy notices, consent, rights requests and privacy risk."]],
    matches: ["P1", "P2", "P3", "P4", "P5", "P6", "P7", "P8", "PT"],
    reviewCadenceDays: 365,
  },
];

export function templateFor(node: RequirementNode): PolicyTemplate {
  const code = node.code.toUpperCase();
  let best: { t: PolicyTemplate; len: number } | undefined;
  for (const t of POLICY_TEMPLATES) {
    for (const m of t.matches) {
      if ((code === m || code.startsWith(`${m}.`) || code.startsWith(`${m}-`) || code.startsWith(m)) && (!best || m.length > best.len)) {
        best = { t, len: m.length };
      }
    }
  }
  return best?.t ?? POLICY_TEMPLATES[0]!;
}

/** "Share the organization's mission…" → "The organization shall share the organization's mission…" */
export function toShall(example: string, org: string): string {
  const text = example.trim().replace(/\.$/, "");
  const first = text.charAt(0).toLowerCase() + text.slice(1);
  return `${org} shall ${first.replace(/\bthe organization's\b/gi, `${org}'s`).replace(/\bthe organization\b/gi, org)}.`;
}

/** Outcome statement ("X is Y") → normative requirement. */
export function outcomeToShall(text: string, org: string): string {
  const clean = text.trim().replace(/\.$/, "");
  return `${org} shall ensure that ${clean.charAt(0).toLowerCase()}${clean.slice(1)}.`;
}

export interface ComposeInput {
  template: PolicyTemplate;
  org: string;
  industry: string;
  size: string;
  nodes: RequirementNode[];
  /** Requirement id → codes of mapped requirements in other frameworks. */
  mappings: Map<string, string[]>;
  citations: { title: string; page?: number }[];
  effectiveDate: string;
}

export function composePolicy(input: ComposeInput): string {
  const { template: t, org } = input;
  const fill = (s: string) => s.replaceAll("{org}", org);
  const lines: string[] = [];
  lines.push(`# ${t.title}`);
  lines.push("");
  lines.push(`| Field | Value |`);
  lines.push(`|---|---|`);
  lines.push(`| Organization | ${org} |`);
  lines.push(`| Version | 1.0 (draft) |`);
  lines.push(`| Effective date | ${input.effectiveDate} (upon approval) |`);
  lines.push(`| Review cadence | Every ${Math.round(t.reviewCadenceDays / 30)} months, or after significant change |`);
  lines.push(`| Owner | Security lead |`);
  lines.push("");
  lines.push("## 1. Purpose");
  lines.push("");
  lines.push(`The purpose of this policy is to ${fill(t.purpose)}.`);
  lines.push("");
  lines.push("## 2. Scope");
  lines.push("");
  lines.push(`This policy applies to ${fill(t.scope)}.`);
  lines.push("");
  lines.push("## 3. Roles and responsibilities");
  lines.push("");
  for (const [role, duty] of t.roles) lines.push(`- **${role}** — ${duty}`);
  lines.push("");
  lines.push("## 4. Policy statements");
  lines.push("");
  let n = 1;
  for (const node of input.nodes) {
    lines.push(`### 4.${n++} ${node.code} — ${node.title && node.title !== node.code ? node.title : shortText(node.text)}`);
    lines.push("");
    lines.push(outcomeToShall(node.text, org));
    const examples = node.examples ?? [];
    const pof = (node.attributes?.["pointsOfFocus"] as { title: string; text?: string }[] | undefined) ?? [];
    if (examples.length || pof.length) {
      lines.push("");
      lines.push("To achieve this:");
      lines.push("");
      for (const ex of examples) lines.push(`- ${toShall(ex.text, org)}`);
      for (const p of pof.slice(0, 8)) lines.push(`- ${org} shall address *${p.title}*${p.text ? ` — ${p.text.replace(/\.$/, "")}` : ""}.`);
    }
    lines.push("");
  }
  lines.push("## 5. Exceptions");
  lines.push("");
  lines.push(
    "Exceptions require a documented business justification, compensating controls, an expiry date, and approval by the security lead and the accountable risk owner. Exceptions are tracked in the risk register and reviewed at least quarterly.",
  );
  lines.push("");
  lines.push("## 6. Enforcement");
  lines.push("");
  lines.push(`Violations may result in revocation of access and disciplinary action consistent with ${org}'s HR policies. Suspected violations must be reported to the security lead.`);
  lines.push("");
  lines.push("## 7. Review");
  lines.push("");
  lines.push(`This policy is reviewed at least every ${Math.round(t.reviewCadenceDays / 30)} months and after significant changes to ${org}'s environment, threats or obligations. Approval is recorded in Visua with version history.`);
  lines.push("");
  lines.push("## 8. Requirements mapping");
  lines.push("");
  lines.push("| Requirement | Framework | Also satisfies |");
  lines.push("|---|---|---|");
  for (const node of input.nodes) {
    const mapped = input.mappings.get(node.id) ?? [];
    lines.push(`| ${node.code} | ${frameworkLabel(node.frameworkId)} | ${mapped.length ? mapped.slice(0, 10).join(", ") : "—"} |`);
  }
  if (input.citations.length) {
    lines.push("");
    lines.push("## 9. References");
    lines.push("");
    for (const c of input.citations) lines.push(`- ${c.title}${c.page ? `, p. ${c.page}` : ""}`);
  }
  lines.push("");
  lines.push(`> Drafted by the Visua Policy Author for a ${input.size}-person ${input.industry} organization. Review, tailor and approve before publishing.`);
  return lines.join("\n");
}

function shortText(text: string): string {
  const t = text.replace(/\s+/g, " ").trim();
  return t.length > 70 ? `${t.slice(0, 69)}…` : t;
}

export function frameworkLabel(frameworkId: string): string {
  switch (frameworkId) {
    case "nist-csf-2.0":
      return "NIST CSF 2.0";
    case "aicpa-tsc-2017":
      return "SOC 2 (TSC)";
    case "nist-sp-800-53-r5":
      return "SP 800-53 Rev. 5";
    case "nist-rmf":
      return "NIST RMF";
    default:
      return frameworkId;
  }
}

export function mappedCodes(ids: string[]): string[] {
  return ids.map((id) => `${codeOf(id)} (${frameworkLabel(frameworkOf(id))})`);
}
