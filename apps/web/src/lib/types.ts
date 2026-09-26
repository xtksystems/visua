import type {
  ActivityEvent,
  AgentRun,
  Capability,
  Role,
  CheckResult,
  Connector,
  Evidence,
  FrameworkDescriptor,
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
  family: "csf" | "soc2" | "rmf" | "ai";
  settings: WorkspaceFramework;
  readiness: number;
  gaps: number;
  total: number;
  evidenceCoverage: number;
  verifiedShare: number;
  counts: Record<Status, number>;
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
