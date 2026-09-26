import type {
  ActivityEvent,
  AgentRun,
  Capability,
  Role,
  CheckResult,
  Connector,
  Evidence,
  FrameworkDescriptor,
  FrameworkFamily,
  LevelScale,
  NodeScore,
  Policy,
  Proposal,
  RequirementNode,
  RequirementState,
  Risk,
  Status,
  Task,
  TierDimension,
  Workspace,
  WorkspaceFramework,
  RmfSettings,
  FrameworkProfile,
  OverlayAdoption,
  OverlayEntry,
} from "@visua/core";

export type { ActivityEvent, AgentRun, CheckResult, Connector, Evidence, Policy, Proposal, RequirementNode, RequirementState, Risk, Status, Task, Workspace };

export interface Meta {
  product: { name: string; version: string };
  frameworks: (FrameworkDescriptor & { units: number })[];
  levelScales: Record<string, LevelScale>;
  tiers: { names: string[]; dimensions: TierDimension[]; source: { documentId: string; locator: string; pages: number[] } };
  agents: { kind: string; name: string; tagline: string; tools: string[] }[];
  connectorKinds: { kind: string; name: string; description: string; configFields: { key: string; label: string; placeholder: string; required: boolean }[] }[];
  ai: { mode: "claude" | "offline"; model: string | null };
  corpus: { framework: string; title: string; retrieved: string; documents: number }[];
  crosswalk: { id: string; title: string; authority: string; count: number }[];
  exampleInformationTypes: RmfSettings["informationTypes"];
}

export interface FrameworkSummary {
  id: string;
  shortName: string;
  family: FrameworkFamily;
  settings: WorkspaceFramework;
  readiness: number;
  gaps: number;
  total: number;
  evidenceCoverage: number;
  verifiedShare: number;
  counts: Record<Status, number>;
  /** Whether the public trust center publishes this framework's readiness. */
  onTrustCenter: boolean;
}

export interface WorkspaceSummary {
  workspace: Workspace;
  frameworks: FrameworkSummary[];
  tasks: { total: number; open: number; done: number; overdue: number; byStatus: Record<string, number> };
  evidence: { total: number };
  policies: { id: string; title: string; status: string; version: number }[];
  approvals: number;
  agents: { running: number; recent: number };
  /** The signed-in principal's role in the workspace's organization. */
  access: { role: Role; capabilities: Capability[] } | null;
}

export interface LeanNode {
  id: string;
  code: string;
  kind: string;
  parentId: string | null;
  depth: number;
  order: number;
  title: string;
  text: string;
  assessable: boolean;
  meta?: Record<string, unknown>;
}

export interface LeanGraph {
  framework: FrameworkDescriptor;
  nodes: LeanNode[];
  profiles?: FrameworkProfile[];
}

export interface UnitState {
  current: number;
  target: number;
  priority: "critical" | "high" | "medium" | "low";
  applicable: boolean;
  owner?: string;
  status: Status;
  reasons: string[];
  openTasks: number;
  evidence: number;
  /** Authoritative crosswalk mappings to other frameworks. */
  mapped: number;
  /** Level in the framework's overlay lens (profile priority 1–3, or control-overlay selection 1–2). */
  overlay?: number;
}

export interface FrameworkStateBundle {
  frameworkId: string;
  overall: NodeScore;
  groups: Record<string, NodeScore & { status: Status }>;
  units: Record<string, UnitState>;
  overlay: { id: string; shortName: string; status: string; adopted: boolean; lenses: string[]; levels: { level: number; label: string }[] } | null;
  /** Threat catalogs: the bundle carries derived coverage (THREAT_SCALE), not assessments. */
  threat?: { minStatus: MinStatus; levels: { level: number; label: string; description: string }[] };
}

export interface MappingView {
  id: string;
  code: string;
  framework: string;
  title: string;
  text: string;
  relationship: string;
  authority: string;
  current?: number;
  target?: number;
  applicable?: boolean;
}

export interface NodeDetail {
  node: RequirementNode;
  ancestors: { id: string; code: string; title: string }[];
  children: { id: string; code: string; title: string; text: string; assessable: boolean }[];
  state?: RequirementState;
  status: { status: Status; reasons: string[] } | null;
  score: NodeScore | null;
  groupStatus: Status | null;
  tasks: Task[];
  evidence: Evidence[];
  checks: CheckResult[];
  proposals: Proposal[];
  activity: ActivityEvent[];
  mappings: MappingView[];
  source: { id: string; title: string; identifier?: string; path: string; url: string; page?: number; locator?: string; present: boolean } | null;
  /** Licensing / provenance notice for the requirement text (e.g. AICPA). */
  contentNotice?: string;
  /** Overlays (Cyber AI Profile, COSAiS…) with an entry for this requirement. */
  overlays: NodeOverlay[];
  /** Threat-catalog nodes only: derived coverage and the requirements linked to the threat. */
  threat: ThreatSection | null;
  /** Requirements only: threats this requirement helps address, by published links. */
  threats: ThreatAddressed[];
}

// ---------------------------------------------------------------------------
// Threat views (MITRE ATLAS, OWASP Top 10s, NIST AI 100-2)
// ---------------------------------------------------------------------------

export type LinkStatus = "final" | "draft" | "unreviewed" | "superseded";
export type MinStatus = "final" | "draft" | "unreviewed";
export type CoverageState = "covered" | "partial" | "open" | "out-of-scope" | "unmapped";

export interface ThreatCoverage {
  state: CoverageState;
  level: number | null;
  linked: number;
  inScope: number;
  met: number;
  atRisk: number;
  progress: number;
  best: LinkStatus | null;
  frameworks: string[];
}

export interface BriefNode {
  id: string;
  code: string;
  title: string;
  kind: string;
  framework: string;
}

export interface LinkView {
  label: string;
  status: LinkStatus;
  authority: string;
  strength?: string;
  note?: string;
  citation: { documentId: string; locator?: string; page?: number };
}

export interface ThreatPathView {
  kind: "direct" | "mitigation" | "edition";
  via?: BriefNode;
  group?: string;
  links: LinkView[];
  status: LinkStatus;
}

export interface ThreatRequirement extends BriefNode {
  enabled: boolean;
  current?: number;
  target?: number;
  applicable?: boolean;
  status: Status | null;
  best: LinkStatus | null;
  paths: ThreatPathView[];
}

export interface ExternalReference {
  scheme: string;
  schemeName: string;
  id: string | null;
  label?: string;
  url?: string;
  relationship: string;
  strength?: string;
  authority: string;
  status: LinkStatus;
  citation: { documentId: string; locator?: string; page?: number };
}

export interface ThreatSection {
  minStatus: MinStatus;
  coverage: ThreatCoverage;
  /** Set for a tactic, edition or objective: its threats' coverage, pooled. */
  group: { units: number; byState: Record<CoverageState, number> } | null;
  requirements: ThreatRequirement[];
  related: (BriefNode & LinkView & { direction: "out" | "in" })[];
  externalRefs: ExternalReference[];
}

export interface ThreatAddressed extends BriefNode {
  best: LinkStatus;
  paths: ThreatPathView[];
}

export interface ThreatCatalogSummary {
  id: string;
  shortName: string;
  name: string;
  publisher: string;
  version: string;
  published: string;
  description: string;
  unitLabel: string;
  unitLabelPlural: string;
  contentNotice?: string;
  units: number;
  byState: Record<CoverageState, number>;
  linkedFrameworks: { id: string; shortName: string; enabled: boolean; threats: number }[];
  weakest: { id: string; code: string; title: string; coverage: ThreatCoverage }[];
}

export interface ThreatsOverview {
  minStatus: MinStatus;
  catalogs: ThreatCatalogSummary[];
  sources: { id: string; authority: string; status: LinkStatus; source: { id: string; shortName: string }; target: { id: string; shortName: string }; links: number }[];
}

export interface ThreatNode {
  id: string;
  code: string;
  kind: string;
  parentId: string | null;
  order: number;
  title: string;
  summary: string;
  assessable: boolean;
  label?: string;
  tactics?: string[];
  maturity?: string;
  status?: string;
  edition?: string;
  objectives?: string[];
  taxonomies?: string[];
  previousEdition?: { key: string; nodeId: string };
  nextEdition?: { key: string; nodeId: string };
}

export interface ThreatCatalogState {
  catalog: { id: string; shortName: string; name: string; publisher: string; version: string; published: string; description: string; unitLabel: string; unitLabelPlural: string; contentNotice?: string };
  minStatus: MinStatus;
  enabledFrameworks: string[];
  nodes: ThreatNode[];
  coverage: Record<string, ThreatCoverage>;
}

export interface ThreatRing {
  minStatus: MinStatus;
  catalogs: { id: string; shortName: string; groups: { id: string; code: string; title: string; units: number; byState: Record<CoverageState, number>; readiness: number | null; status: Status | null }[] }[];
  bundles: { a: string; b: string; count: number; best: LinkStatus }[];
}

export interface NodeOverlay {
  id: string;
  kind: "community-profile" | "control-overlay";
  shortName: string;
  identifier: string;
  status: string;
  documentId: string;
  notice: { text: string; citation: { documentId: string; locator?: string; page?: number } };
  lenses?: { id: string; short: string; title: string }[];
  priorityLevels?: { level: number; label: string }[];
  adoption: OverlayAdoption | null;
  source: { path: string; title: string; present: boolean } | null;
  entry: OverlayEntry;
}

export interface RunWithProposals extends AgentRun {
  proposals: Proposal[];
  stepCount?: number;
}

export interface SearchResult {
  nodes: { id: string; code: string; title: string; text: string; framework: string; kind: string }[];
  passages: { documentId: string; documentTitle: string; page?: number; locator?: string; quote: string; score: number }[];
}

export interface VisuaEvent {
  id: number;
  type: string;
  workspaceId: string;
  at: string;
  data: unknown;
}
