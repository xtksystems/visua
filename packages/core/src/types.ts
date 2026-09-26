/**
 * Visua domain model.
 *
 * Every framework (NIST CSF 2.0, AICPA TSC / SOC 2, NIST SP 800-53 + RMF) is
 * normalized into the same *framework graph* shape so that scoring, planning,
 * crosswalks, agents and the 3D Observatory work identically across them.
 */

import type { TierAssessment } from "./tiers.ts";

// ---------------------------------------------------------------------------
// Frameworks
// ---------------------------------------------------------------------------

export type FrameworkFamily = "csf" | "soc2" | "rmf";

export interface CorpusCitation {
  /** `id` of a document in corpus/<framework>/manifest.json */
  documentId: string;
  /** Human-readable locator: section, table, page, OSCAL part id… */
  locator?: string;
  page?: number;
}

export interface LevelDescriptor {
  kind: string;
  label: string;
  pluralLabel: string;
}

export interface FrameworkDescriptor {
  id: string;
  family: FrameworkFamily;
  shortName: string;
  name: string;
  publisher: string;
  version: string;
  published: string;
  description: string;
  /** Hierarchy from the top level down to the unit of work. */
  levels: LevelDescriptor[];
  /** Node kind that is assessed and scored (the unit of work). */
  assessableKind: string;
  /** Corpus documents this graph was ingested from. */
  sources: CorpusCitation[];
  /** Vocabulary used in the UI and by agents ("outcome", "criterion", "control"). */
  unitLabel: string;
  unitLabelPlural: string;
  /** Licensing / provenance notice for the requirement text shown to users. */
  contentNotice?: string;
}

export interface ImplementationExample {
  code: string;
  text: string;
}

export interface InformativeReference {
  /** Reference source, e.g. "SP 800-53 Rev 5.2.0" or "CIS Controls v8.1". */
  source: string;
  /** Identifier inside that source, e.g. "AC-02". */
  ref: string;
  /** Resolved Visua node id when the reference points at an ingested framework. */
  nodeId?: string;
  /** Mapping dataset the reference comes from (e.g. a NIST OLIR dataset name). */
  dataset?: string;
  /** Who authored the mapping dataset. */
  developer?: string;
  url?: string;
}

export interface RequirementNode {
  /** Globally unique: `${frameworkId}:${code}` */
  id: string;
  frameworkId: string;
  code: string;
  kind: string;
  parentId: string | null;
  depth: number;
  order: number;
  title: string;
  text: string;
  guidance?: string;
  examples?: ImplementationExample[];
  references?: InformativeReference[];
  /** Free-form framework-specific attributes (baselines, points of focus, …). */
  attributes?: Record<string, unknown>;
  citation: CorpusCitation;
  assessable: boolean;
  /** Withdrawn / deprecated items stay in the graph for traceability. */
  withdrawn?: boolean;
}

export interface FrameworkGraph {
  framework: FrameworkDescriptor;
  nodes: RequirementNode[];
}

export type MappingRelationship =
  | "equivalent"
  | "subset-of"
  | "superset-of"
  | "intersects-with"
  | "related-to"
  | "supports";

export interface Mapping {
  source: string;
  target: string;
  relationship: MappingRelationship;
  origin: CorpusCitation & { authority: string };
}

export interface MappingSet {
  id: string;
  title: string;
  sourceFramework: string;
  targetFramework: string;
  authority: string;
  mappings: Mapping[];
}

// ---------------------------------------------------------------------------
// Workspaces & organization profile (any niche, any maturity)
// ---------------------------------------------------------------------------

export type Industry =
  | "saas"
  | "fintech"
  | "healthcare"
  | "manufacturing"
  | "public-sector"
  | "defense-contractor"
  | "education"
  | "retail"
  | "energy-utilities"
  | "nonprofit"
  | "professional-services"
  | "other";

export type OrgSize = "1-10" | "11-50" | "51-200" | "201-1000" | "1000+";

export type DataType = "pii" | "phi" | "cardholder" | "cui" | "financial" | "intellectual-property" | "children" | "biometric";

export type Driver =
  | "enterprise-customers"
  | "federal-customers"
  | "regulator"
  | "board-mandate"
  | "cyber-insurance"
  | "investor-due-diligence"
  | "incident-recovery"
  | "build-program";

export type GuidanceMode = "guided" | "expert";

export interface OrganizationProfile {
  industry: Industry;
  size: OrgSize;
  dataTypes: DataType[];
  drivers: Driver[];
  environments: ("cloud" | "on-prem" | "hybrid" | "ot")[];
  /** Self-assessed or measured CSF tier (1–4). */
  maturityTier: 1 | 2 | 3 | 4;
  guidance: GuidanceMode;
  securityTeamSize: number;
}

export interface Soc2Settings {
  categories: ("security" | "availability" | "processing-integrity" | "confidentiality" | "privacy")[];
  reportType: "type1" | "type2";
  observationStart?: string;
  observationEnd?: string;
  auditFirm?: string;
}

export type ImpactLevel = "low" | "moderate" | "high";

export interface RmfSettings {
  systemName: string;
  systemDescription?: string;
  informationTypes: { id: string; name: string; confidentiality: ImpactLevel; integrity: ImpactLevel; availability: ImpactLevel }[];
  categorization?: { confidentiality: ImpactLevel; integrity: ImpactLevel; availability: ImpactLevel; overall: ImpactLevel };
  baseline?: "low" | "moderate" | "high";
  privacyBaseline?: boolean;
  /** Controls added (+) or removed (−) by tailoring, with rationale. */
  tailoring: { nodeId: string; action: "add" | "remove"; rationale: string }[];
  authorization?: {
    decision: "ato" | "iatt" | "dato" | "pending";
    authorizingOfficial?: string;
    decidedAt?: string;
    expiresAt?: string;
    rationale?: string;
  };
}

export interface WorkspaceFramework {
  frameworkId: string;
  enabled: boolean;
  /** Default target implementation level for in-scope requirements. */
  defaultTarget: number;
  soc2?: Soc2Settings;
  rmf?: RmfSettings;
}

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  description?: string;
  profile: OrganizationProfile;
  frameworks: WorkspaceFramework[];
  /** Which proposal types agents may apply without human approval. */
  autonomy: Partial<Record<ProposalType, boolean>>;
  trustCenter: { enabled: boolean; headline?: string; contactEmail?: string };
  /** Latest CSF Tier assessment (CSWP 29, Appendix B). */
  tierAssessment?: TierAssessment;
  createdAt: string;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// Assessment state (per workspace × assessable requirement)
// ---------------------------------------------------------------------------

export const STATUSES = [
  "not-started",
  "in-progress",
  "implemented",
  "verified",
  "at-risk",
  "not-applicable",
] as const;
export type Status = (typeof STATUSES)[number];

export type Priority = "critical" | "high" | "medium" | "low";

export interface RequirementState {
  nodeId: string;
  /** Current implementation level on the framework's level scale (0–4). */
  current: number;
  /** Target implementation level (0–4). */
  target: number;
  priority: Priority;
  /** Effective applicability: scope settings (SOC 2 categories, RMF baseline/tailoring) first, then a person's documented exclusion. */
  applicable: boolean;
  applicabilityRationale?: string;
  /** A person's documented "not applicable" decision. Kept separately so scope changes never overwrite it. */
  userExclusion?: { rationale: string; at: string; by: string };
  owner?: string;
  notes?: string;
  /** Set when an assessor (human or approved agent) verified the implementation. */
  verifiedAt?: string;
  /** Manual override; when absent the status is derived. */
  statusOverride?: Status;
  updatedAt: string;
  updatedBy: string;
}

// ---------------------------------------------------------------------------
// Work: tasks, evidence, policies, risks
// ---------------------------------------------------------------------------

export type TaskStatus = "backlog" | "todo" | "in-progress" | "in-review" | "done" | "blocked";
export type TaskKind =
  | "governance"
  | "policy"
  | "procedure"
  | "technical"
  | "evidence"
  | "training"
  | "assessment"
  | "vendor"
  | "monitoring";

export type AgentKind =
  | "copilot"
  | "assessor"
  | "planner"
  | "policy-author"
  | "evidence-collector"
  | "crosswalk-analyst"
  | "auditor-prep"
  | "task-executor";

export interface TaskAutomation {
  agent: AgentKind;
  action: string;
  params?: Record<string, unknown>;
}

export interface ChecklistItem {
  id: string;
  text: string;
  done: boolean;
}

export interface Task {
  id: string;
  workspaceId: string;
  title: string;
  description: string;
  kind: TaskKind;
  status: TaskStatus;
  priority: Priority;
  requirementIds: string[];
  assignee?: { type: "person" | "agent"; id: string; name: string };
  startDate?: string;
  dueDate?: string;
  effortHours?: number;
  checklist: ChecklistItem[];
  dependsOn: string[];
  automation?: TaskAutomation;
  /** Where the task came from: an official implementation example, point of focus, objective… */
  source?: CorpusCitation & { basis: string };
  /** Implementation level the linked requirements should reach when done. */
  targetLevel?: number;
  origin: "user" | "agent" | "template";
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

export type EvidenceKind =
  | "document"
  | "screenshot"
  | "configuration"
  | "log"
  | "attestation"
  | "automated-check"
  | "policy"
  | "report";

export type EvidenceStatus = "pending-review" | "accepted" | "rejected" | "expired";

export interface Evidence {
  id: string;
  workspaceId: string;
  title: string;
  description?: string;
  kind: EvidenceKind;
  source: "upload" | "connector" | "agent" | "manual";
  connectorId?: string;
  requirementIds: string[];
  status: EvidenceStatus;
  collectedAt: string;
  validUntil?: string;
  content?: string;
  data?: Record<string, unknown>;
  fileName?: string;
  sha256?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  createdAt: string;
}

export type PolicyStatus = "draft" | "in-review" | "approved" | "published" | "retired";

export interface Policy {
  id: string;
  workspaceId: string;
  title: string;
  slug: string;
  version: number;
  status: PolicyStatus;
  body: string;
  requirementIds: string[];
  owner?: string;
  reviewCadenceDays: number;
  approvedBy?: string;
  approvedAt?: string;
  origin: "user" | "agent" | "template";
  agentRunId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Risk {
  id: string;
  workspaceId: string;
  title: string;
  description: string;
  likelihood: 1 | 2 | 3 | 4 | 5;
  impact: 1 | 2 | 3 | 4 | 5;
  treatment: "mitigate" | "accept" | "transfer" | "avoid";
  status: "open" | "treating" | "accepted" | "closed";
  requirementIds: string[];
  owner?: string;
  createdAt: string;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// Monitoring
// ---------------------------------------------------------------------------

export type CheckOutcome = "pass" | "warn" | "fail" | "error";

export interface CheckResult {
  id: string;
  workspaceId: string;
  connectorId: string;
  checkId: string;
  title: string;
  outcome: CheckOutcome;
  detail: string;
  requirementIds: string[];
  observed: Record<string, unknown>;
  observedAt: string;
  evidenceId?: string;
}

export interface Connector {
  id: string;
  workspaceId: string;
  kind: string;
  name: string;
  config: Record<string, unknown>;
  status: "active" | "paused" | "error";
  lastRunAt?: string;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Agents (glass-box, human-in-the-loop)
// ---------------------------------------------------------------------------

export type AgentRunStatus = "queued" | "running" | "awaiting-approval" | "completed" | "failed" | "cancelled";

export type AgentStepType =
  | "plan"
  | "thought"
  | "tool-call"
  | "tool-result"
  | "citation"
  | "proposal"
  | "message"
  | "ui"
  | "error";

export interface Citation {
  documentId: string;
  documentTitle: string;
  locator?: string;
  page?: number;
  quote: string;
}

export interface AgentStep {
  id: string;
  at: string;
  type: AgentStepType;
  title: string;
  detail?: string;
  data?: unknown;
  citations?: Citation[];
  /** Requirement nodes this step touched (drives the 3D agent comet). */
  nodeIds?: string[];
}

export type ProposalType =
  | "set-level"
  | "set-target"
  | "set-applicability"
  | "create-task"
  | "update-task"
  | "create-evidence"
  | "review-evidence"
  | "create-policy"
  | "create-risk"
  | "set-rmf";

export type ProposalStatus = "pending" | "approved" | "rejected" | "applied" | "failed";

export interface Proposal {
  id: string;
  runId: string;
  workspaceId: string;
  type: ProposalType;
  title: string;
  rationale: string;
  payload: Record<string, unknown>;
  citations: Citation[];
  confidence: "low" | "medium" | "high";
  status: ProposalStatus;
  nodeIds: string[];
  decidedBy?: string;
  decidedAt?: string;
  createdAt: string;
}

export interface AgentRun {
  id: string;
  workspaceId: string;
  agent: AgentKind;
  goal: string;
  input: Record<string, unknown>;
  status: AgentRunStatus;
  mode: "claude" | "offline";
  model?: string;
  steps: AgentStep[];
  summary?: string;
  focusNodeIds: string[];
  taskId?: string;
  usage?: { inputTokens: number; outputTokens: number };
  error?: string;
  createdAt: string;
  startedAt?: string;
  finishedAt?: string;
}

// ---------------------------------------------------------------------------
// Audit trail
// ---------------------------------------------------------------------------

export interface ActivityEvent {
  id: string;
  workspaceId: string;
  at: string;
  actor: string;
  action: string;
  entity: string;
  entityId: string;
  summary: string;
  data?: Record<string, unknown>;
  /** Monotonic position in the workspace's audit trail. */
  seq?: number;
  /** SHA-256 of the previous event (hash chain → tamper-evident audit trail). */
  prevHash?: string;
  /** SHA-256 over (prevHash + canonical event body). */
  hash?: string;
}
