/**
 * The contract between agents and the platform. Agents never touch storage
 * directly: they read through the host and *propose* changes. The host
 * decides (per workspace autonomy settings) whether a proposal is applied
 * immediately or waits for a human decision.
 */
import type {
  AgentKind,
  AgentStep,
  CheckResult,
  Citation,
  Connector,
  Evidence,
  FrameworkScore,
  Policy,
  Proposal,
  ProposalType,
  RequirementState,
  Task,
  Workspace,
} from "@visua/core";
import type { FrameworkRegistry } from "@visua/frameworks";

export interface ProposalInput {
  type: ProposalType;
  title: string;
  rationale: string;
  payload: Record<string, unknown>;
  citations: Citation[];
  confidence: "low" | "medium" | "high";
  nodeIds: string[];
}

export interface AgentHost {
  readonly registry: FrameworkRegistry;
  readonly runId: string;
  readonly signal: AbortSignal;
  workspace(): Workspace;
  states(frameworkId?: string): RequirementState[];
  state(nodeId: string): RequirementState | undefined;
  score(frameworkId: string): FrameworkScore;
  tasks(): Task[];
  evidence(): Evidence[];
  policies(): Policy[];
  connectors(): Connector[];
  runConnector(connectorId: string): Promise<CheckResult[]>;
  /** Stage a change. Returns the stored proposal (possibly already applied). */
  propose(input: ProposalInput): Proposal;
  /** Append a step to the run's flight recorder (persisted + streamed). */
  step(step: Omit<AgentStep, "id" | "at">): AgentStep;
}

export interface AgentRequest {
  agent: AgentKind;
  goal: string;
  input: Record<string, unknown>;
}

export interface AgentResult {
  summary: string;
  mode: "claude" | "offline";
  model?: string;
  usage?: { inputTokens: number; outputTokens: number };
}
