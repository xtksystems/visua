/**
 * Structure of the AICPA 2017 Trust Services Criteria and DC 200 description
 * criteria — identifiers, series, categories and COSO principle numbers — with
 * short titles and plain-language summaries written by Visua.
 *
 * The official criterion text, points of focus and description criteria are
 * © AICPA and are not redistributed with Visua. When a licensed local copy is
 * present in corpus/aicpa-soc2/ the ingest overlays the verbatim text; without
 * it, Visua runs on this skeleton so SOC 2 readiness still works end to end.
 */

export type TscCategory = "security" | "availability" | "processing-integrity" | "confidentiality" | "privacy";

export const TSC_CATEGORIES: { id: TscCategory; name: string; summary: string }[] = [
  { id: "security", name: "Security", summary: "Information and systems are protected against unauthorized access, disclosure and damage. Required in every SOC 2 examination (the Common Criteria)." },
  { id: "availability", name: "Availability", summary: "Systems are available for operation and use as committed or agreed." },
  { id: "processing-integrity", name: "Processing Integrity", summary: "System processing is complete, valid, accurate, timely and authorized." },
  { id: "confidentiality", name: "Confidentiality", summary: "Information designated as confidential is protected as committed or agreed." },
  { id: "privacy", name: "Privacy", summary: "Personal information is collected, used, retained, disclosed and disposed of in line with the entity's commitments." },
];

export const TSC_SERIES: { id: string; title: string; category: TscCategory }[] = [
  { id: "CC1", title: "Control Environment", category: "security" },
  { id: "CC2", title: "Information and Communication", category: "security" },
  { id: "CC3", title: "Risk Assessment", category: "security" },
  { id: "CC4", title: "Monitoring Activities", category: "security" },
  { id: "CC5", title: "Control Activities", category: "security" },
  { id: "CC6", title: "Logical and Physical Access Controls", category: "security" },
  { id: "CC7", title: "System Operations", category: "security" },
  { id: "CC8", title: "Change Management", category: "security" },
  { id: "CC9", title: "Risk Mitigation", category: "security" },
  { id: "A1", title: "Availability", category: "availability" },
  { id: "PI1", title: "Processing Integrity", category: "processing-integrity" },
  { id: "C1", title: "Confidentiality", category: "confidentiality" },
  { id: "P1", title: "Notice", category: "privacy" },
  { id: "P2", title: "Choice and Consent", category: "privacy" },
  { id: "P3", title: "Collection", category: "privacy" },
  { id: "P4", title: "Use, Retention and Disposal", category: "privacy" },
  { id: "P5", title: "Access", category: "privacy" },
  { id: "P6", title: "Disclosure and Notification", category: "privacy" },
  { id: "P7", title: "Quality", category: "privacy" },
  { id: "P8", title: "Monitoring and Enforcement", category: "privacy" },
];

/** [id, COSO principle | null, Visua short title, Visua summary] */
type Row = [string, number | null, string, string];

const ROWS: Row[] = [
  ["CC1.1", 1, "Integrity and ethical values", "Leadership sets and enforces standards of conduct, and deviations are addressed."],
  ["CC1.2", 2, "Board oversight", "An independent governing body oversees how internal control is designed and performs."],
  ["CC1.3", 3, "Structure, authority and responsibility", "Management defines reporting lines, authorities and responsibilities, with board oversight."],
  ["CC1.4", 4, "Commitment to competence", "People are recruited, developed and retained with the skills their roles require."],
  ["CC1.5", 5, "Accountability", "Individuals are held accountable for their internal control responsibilities."],
  ["CC2.1", 13, "Quality information", "Relevant, quality information is obtained or produced to support internal control."],
  ["CC2.2", 14, "Internal communication", "Control objectives and responsibilities are communicated inside the organization."],
  ["CC2.3", 15, "External communication", "Matters affecting internal control are communicated with external parties."],
  ["CC3.1", 6, "Suitable objectives", "Objectives are specified clearly enough to identify and assess the risks to them."],
  ["CC3.2", 7, "Risk identification and analysis", "Risks to objectives are identified across the organization and analyzed to decide how to manage them."],
  ["CC3.3", 8, "Fraud risk", "The potential for fraud is considered when assessing risks."],
  ["CC3.4", 9, "Significant change", "Changes that could significantly affect internal control are identified and assessed."],
  ["CC4.1", 16, "Ongoing and separate evaluations", "Evaluations confirm that the components of internal control are present and functioning."],
  ["CC4.2", 17, "Deficiency communication", "Control deficiencies are evaluated and communicated promptly to those who must act."],
  ["CC5.1", 10, "Control activities", "Control activities are selected and developed to reduce risks to acceptable levels."],
  ["CC5.2", 11, "Technology general controls", "General controls over technology are selected and developed to support objectives."],
  ["CC5.3", 12, "Policies and procedures", "Control activities are put into practice through policies and the procedures that carry them out."],
  ["CC6.1", null, "Logical access architecture", "Logical access software, infrastructure and architecture protect information assets."],
  ["CC6.2", null, "User registration and authorization", "Users are registered and authorized before access is issued, and removed when no longer needed."],
  ["CC6.3", null, "Least privilege and segregation of duties", "Access is granted, changed and removed based on roles, least privilege and segregation of duties."],
  ["CC6.4", null, "Physical access", "Physical access to facilities and protected assets is limited to authorized people."],
  ["CC6.5", null, "Asset disposal", "Asset protections end only after the ability to read or recover their data has been removed."],
  ["CC6.6", null, "Boundary protection", "Measures protect against threats from sources outside the system's boundaries."],
  ["CC6.7", null, "Transmission and movement of data", "Transmission, movement and removal of information are restricted and protected."],
  ["CC6.8", null, "Malicious software", "Unauthorized or malicious software is prevented or detected and acted on."],
  ["CC7.1", null, "Configuration and vulnerability detection", "Detection and monitoring surface configuration changes and newly discovered vulnerabilities."],
  ["CC7.2", null, "Anomaly monitoring", "System components are monitored for anomalies that indicate malicious acts, disasters or errors."],
  ["CC7.3", null, "Security event evaluation", "Security events are evaluated to decide whether they are incidents."],
  ["CC7.4", null, "Incident response", "A defined incident response program is executed to understand, contain, remediate and communicate."],
  ["CC7.5", null, "Incident recovery", "Activities to recover from security incidents are identified, developed and carried out."],
  ["CC8.1", null, "Change management", "Changes to infrastructure, data, software and procedures are authorized, tested, approved and implemented."],
  ["CC9.1", null, "Business disruption", "Risk mitigation activities address potential business disruptions."],
  ["CC9.2", null, "Vendor and partner risk", "Risks from vendors and business partners are assessed and managed."],
  ["A1.1", null, "Capacity management", "Processing capacity and usage are monitored and managed to meet availability commitments."],
  ["A1.2", null, "Environmental protection and recovery infrastructure", "Environmental protections, backups and recovery infrastructure are designed, operated and monitored."],
  ["A1.3", null, "Recovery testing", "Recovery plan procedures are tested to support system recovery."],
  ["PI1.1", null, "Processing definitions", "Information about processing objectives and specifications is obtained or produced and communicated."],
  ["PI1.2", null, "Input controls", "System inputs are complete and accurate."],
  ["PI1.3", null, "Processing controls", "Processing is complete, accurate and timely."],
  ["PI1.4", null, "Output controls", "Outputs are complete and accurate, reach only intended parties and are delivered on time."],
  ["PI1.5", null, "Stored data", "Stored inputs, items in processing and outputs are kept complete, accurate and protected."],
  ["C1.1", null, "Confidential information identification", "Confidential information is identified and maintained to meet confidentiality objectives."],
  ["C1.2", null, "Confidential information disposal", "Confidential information is disposed of in line with confidentiality objectives."],
  ["P1.1", null, "Privacy notice", "Data subjects are told about the entity's privacy practices."],
  ["P2.1", null, "Choice and consent", "Choices about how personal information is handled are communicated, and consent is obtained where needed."],
  ["P3.1", null, "Collection limitation", "Personal information is collected only as needed for privacy objectives."],
  ["P3.2", null, "Explicit consent", "Explicit consent is obtained and documented when it is required."],
  ["P4.1", null, "Use limitation", "Personal information is used only for its intended purposes."],
  ["P4.2", null, "Retention", "Personal information is kept only as long as objectives require."],
  ["P4.3", null, "Secure disposal", "Personal information is disposed of securely."],
  ["P5.1", null, "Data subject access", "Data subjects can access the personal information held about them."],
  ["P5.2", null, "Correction", "Data subjects can ask for corrections, and those requests are handled."],
  ["P6.1", null, "Disclosure to third parties", "Personal information is disclosed to third parties only as intended and consented."],
  ["P6.2", null, "Record of authorized disclosures", "Authorized disclosures are recorded completely and accurately."],
  ["P6.3", null, "Record of unauthorized disclosures", "Unauthorized disclosures, including breaches, are recorded completely and accurately."],
  ["P6.4", null, "Third-party commitments", "Vendors and third parties that receive personal information commit to protecting it."],
  ["P6.5", null, "Third-party breach notification", "Vendors and third parties report unauthorized disclosures to the entity."],
  ["P6.6", null, "Breach notification", "Affected data subjects, regulators and others are notified of breaches and incidents."],
  ["P6.7", null, "Accounting of disclosures", "Data subjects can get an accounting of the personal information held and disclosed."],
  ["P7.1", null, "Data quality", "Personal information is kept accurate, complete and relevant."],
  ["P8.1", null, "Inquiries, complaints and disputes", "Privacy inquiries, complaints and disputes are received, resolved and monitored."],
];

export const TSC_CRITERIA = ROWS.map(([id, coso, title, summary]) => {
  const series = id.split(".")[0]!;
  return { id, series, category: TSC_SERIES.find((s) => s.id === series)!.category, cosoPrinciple: coso, title, summary };
});

/** DC 200 description criteria: identifiers with Visua short titles. */
export const DC200_SKELETON: { id: string; title: string; typeTwoOnly?: boolean }[] = [
  { id: "DC1", title: "Types of services provided" },
  { id: "DC2", title: "Principal service commitments and system requirements" },
  { id: "DC3", title: "System components: infrastructure, software, people, procedures and data" },
  { id: "DC4", title: "Significant system incidents" },
  { id: "DC5", title: "Applicable trust services criteria and the related controls" },
  { id: "DC6", title: "Complementary user entity controls (CUECs)" },
  { id: "DC7", title: "Subservice organizations and complementary subservice organization controls" },
  { id: "DC8", title: "Criteria that are not relevant to the system, with reasons" },
  { id: "DC9", title: "Significant changes to the system during the period", typeTwoOnly: true },
];
