/**
 * Visua domain model.
 *
 * Every framework (NIST CSF 2.0, AICPA TSC / SOC 2, NIST SP 800-53 + RMF) is
 * normalized into the same *framework graph* shape so that scoring, planning,
 * crosswalks, agents and the 3D Observatory work identically across them.
 */
import type { OverlayAdoption } from "./overlays.ts";

import type { TierAssessment } from "./tiers.ts";

// ---------------------------------------------------------------------------
// Frameworks
// ---------------------------------------------------------------------------

/**
 * csf, soc2, rmf and ai are frameworks a workspace implements; law holds
 * statutory obligations (U.S. state AI laws); threat holds threat catalogs
 * (MITRE ATLAS, OWASP Top 10s, NIST AI 100-2), which are viewed through the
 * requirements that address them and never assessed or enabled themselves.
 */
export type FrameworkFamily = "csf" | "soc2" | "rmf" | "ai" | "law" | "threat";

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
  /** Compact label for badges and dense views, e.g. "SOC 2" (falls back to shortName). */
  badge?: string;
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

/** A risk defined by a framework profile (e.g. the 12 GAI risks of NIST AI 600-1). */
export interface ProfileRisk {
  id: string;
  title: string;
  description: string;
  citation: CorpusCitation;
}

/**
 * A profile layered on a framework (e.g. the NIST AI 600-1 Generative AI Profile on
 * the AI RMF). Its actions live on the framework's nodes (`attributes.profileActions`).
 */
export interface FrameworkProfile {
  id: string;
  title: string;
  documentId: string;
  /** When the profile applies, e.g. "generative" for systems that use generative AI. */
  appliesWhen: string;
  risks: ProfileRisk[];
}

/** One profile action attached to a requirement node. */
export interface ProfileAction {
  profileId: string;
  /** Verbatim action id, e.g. "GV-1.1-001". */
  id: string;
  text: string;
  /** Ids of the profile risks this action addresses. */
  risks: string[];
  citation: CorpusCitation;
}

export interface FrameworkGraph {
  framework: FrameworkDescriptor;
  nodes: RequirementNode[];
  profiles?: FrameworkProfile[];
}

export type MappingRelationship =
  | "equivalent"
  | "subset-of"
  | "superset-of"
  | "intersects-with"
  | "related-to"
  | "supports";

/**
 * Publication status of a mapping: final (a published catalog or standard), draft (a
 * NIST draft), unreviewed (a community crosswalk) or superseded (an older edition).
 */
export type MappingStatus = "final" | "draft" | "unreviewed" | "superseded";

export interface Mapping {
  source: string;
  target: string;
  relationship: MappingRelationship;
  origin: CorpusCitation & { authority: string };
  /** The publisher's own term for the link, e.g. "mitigates" (MITRE ATLAS). */
  label?: string;
  status?: MappingStatus;
  /** "primary" or "supporting" where the publisher grades its links (OWASP Appendix A). */
  strength?: string;
  /** Publisher text for the link, e.g. how an ATLAS mitigation applies to a technique. */
  note?: string;
}

export interface MappingSet {
  id: string;
  title: string;
  sourceFramework: string;
  targetFramework: string;
  authority: string;
  status?: MappingStatus;
  mappings: Mapping[];
}

/** A published link from a threat to a catalog Visua does not model (CWE, ATT&CK, CSA AICM, …). */
export interface ExternalReference {
  scheme: string;
  schemeName: string;
  id: string | null;
  label?: string;
  url?: string;
  relationship: string;
  strength?: string;
  authority: string;
  status: MappingStatus;
  citation: CorpusCitation;
}

// ---------------------------------------------------------------------------
// Workspaces & organization profile (any niche, any maturity)
// ---------------------------------------------------------------------------

/** Profile vocabularies: the API validates against these, so they cannot drift from the types. */
export const PROFILE_INDUSTRIES = [
  "saas",
  "fintech",
  "healthcare",
  "manufacturing",
  "public-sector",
  "defense-contractor",
  "education",
  "retail",
  "energy-utilities",
  "nonprofit",
  "professional-services",
  "other",
] as const;
export type Industry = (typeof PROFILE_INDUSTRIES)[number];

export const PROFILE_SIZES = ["1-10", "11-50", "51-200", "201-1000", "1000+"] as const;
export type OrgSize = (typeof PROFILE_SIZES)[number];

export const PROFILE_DATA_TYPES = ["pii", "phi", "cardholder", "cui", "financial", "intellectual-property", "children", "biometric"] as const;
export type DataType = (typeof PROFILE_DATA_TYPES)[number];

export const PROFILE_DRIVERS = [
  "enterprise-customers",
  "federal-customers",
  "regulator",
  "board-mandate",
  "cyber-insurance",
  "investor-due-diligence",
  "incident-recovery",
  "build-program",
  "ai-systems",
] as const;
export type Driver = (typeof PROFILE_DRIVERS)[number];

export const PROFILE_ENVIRONMENTS = ["cloud", "on-prem", "hybrid", "ot"] as const;

export type GuidanceMode = "guided" | "expert";

export interface OrganizationProfile {
  industry: Industry;
  size: OrgSize;
  dataTypes: DataType[];
  drivers: Driver[];
  environments: (typeof PROFILE_ENVIRONMENTS)[number][];
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
  tailoring: { nodeId: string; action: "add" | "remove"; rationale: string; /** Set when an adopted overlay made the decision. */ source?: string }[];
  authorization?: {
    decision: "ato" | "iatt" | "dato" | "pending";
    authorizingOfficial?: string;
    decidedAt?: string;
    expiresAt?: string;
    rationale?: string;
  };
}

/** AI lifecycle stages (NIST AI 100-1, AI lifecycle and key dimensions). */
export type AiLifecycleStage = "plan-design" | "collect-process-data" | "build-use-model" | "verify-validate" | "deploy-use" | "operate-monitor" | "retired";

/** One AI system in the organization's inventory (AI RMF GOVERN / MAP work starts here). */
export interface AiSystem {
  id: string;
  name: string;
  /** Intended purpose and context of use. */
  purpose: string;
  /** The organization's role for this system. */
  role: "developer" | "deployer" | "developer-deployer";
  lifecycle: AiLifecycleStage;
  /** Generative AI: the NIST AI 600-1 Generative AI Profile applies. */
  generative: boolean;
  /** Third-party model, API or platform the system depends on (value chain). */
  provider?: string;
  /** The organization's own risk tier for the system (AI RMF leaves tiering to the organization). */
  riskTier: "low" | "moderate" | "high";
  owner?: string;
  dataTypes: DataType[];
  /** How people oversee or can override the system's outputs. */
  humanOversight?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AiRmfSettings {
  systems: AiSystem[];
}

export interface WorkspaceFramework {
  frameworkId: string;
  enabled: boolean;
  /** Default target implementation level for in-scope requirements. */
  defaultTarget: number;
  soc2?: Soc2Settings;
  rmf?: RmfSettings;
  ai?: AiRmfSettings;
  /** Overlays (community profiles, control overlays) adopted on this framework. */
  overlays?: OverlayAdoption[];
  law?: LawSettings;
}

/**
 * How statutory obligations apply: per law, the roles the organization holds
 * under that law's own definitions (e.g. "deployer", "employer"). A law with
 * no role selected is out of scope.
 */
export interface LawSettings {
  applicability: Record<string, { roles: string[]; note?: string; decidedAt: string; decidedBy: string }>;
}

export interface Workspace {
  id: string;
  /** Owning organization (tenant). */
  tenantId?: string;
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
  /** User id of the person (or token) that started the run. */
  startedBy?: string;
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
  /** Authenticated principal behind the actor (user or API token id), when there is one. */
  actorId?: string;
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
