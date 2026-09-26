/**
 * Application service: the single place where workspace state changes.
 * Every mutation is validated, persisted, written to the audit trail and
 * published on the event bus (which drives the live 3D Observatory).
 */
import {
  assessTiers,
  buildSnapshot,
  categorize,
  clampLevel,
  codeOf,
  frameworkOf,
  newId,
  planTasks,
  recommend,
  scoreFramework,
  slugify,
  targetFor,
  type ActivityEvent,
  type AgentKind,
  type AiRmfSettings,
  type AiSystem,
  type AgentRun,
  type AgentStep,
  type CheckResult,
  type Connector,
  type Evidence,
  type FrameworkScore,
  type OrganizationProfile,
  type Policy,
  type Priority,
  type Proposal,
  type RequirementState,
  type Risk,
  type RmfSettings,
  type Soc2Settings,
  type Task,
  type Workspace,
  type WorkspaceFramework,
} from "@visua/core";
import { executeAgent, type AgentHost, type ProposalInput } from "@visua/agents";
import type { FrameworkRegistry } from "@visua/frameworks";
import { createHash } from "node:crypto";
import type { EventBus, VisuaEventType } from "../bus.ts";
import { FRAMEWORK_OF_REF, connectorKind, type RequirementRefs } from "../connectors/index.ts";
import type { Store } from "../db.ts";

export class NotFoundError extends Error {}

const GENESIS = "0".repeat(64);

/** Canonical JSON (sorted keys) so the hash is independent of property order. */
function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value as Record<string, unknown>)
      .filter((k) => (value as Record<string, unknown>)[k] !== undefined)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${canonical((value as Record<string, unknown>)[k])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

export function chainHash(prevHash: string, event: ActivityEvent): string {
  const { hash: _ignored, ...body } = event;
  void _ignored;
  return createHash("sha256").update(prevHash).update(canonical(body)).digest("hex");
}
export class ValidationError extends Error {}

const PRIORITY_ORDER: Priority[] = ["low", "medium", "high", "critical"];
const maxPriority = (a: Priority, b: Priority): Priority => (PRIORITY_ORDER.indexOf(a) >= PRIORITY_ORDER.indexOf(b) ? a : b);
const now = () => new Date().toISOString();

export interface CreateWorkspaceInput {
  name: string;
  description?: string;
  profile: OrganizationProfile;
  frameworks?: string[];
  soc2?: Partial<Soc2Settings>;
  rmf?: Partial<RmfSettings>;
  planInitialTasks?: boolean;
}

/** Scope settings win; otherwise a person's documented exclusion stands. */
function effectiveScope(scope: { applicable: boolean; rationale?: string }, exclusion: RequirementState["userExclusion"]): { applicable: boolean; rationale?: string } {
  if (!scope.applicable) return scope;
  if (exclusion) return { applicable: false, rationale: exclusion.rationale };
  return scope;
}

export class VisuaService {
  readonly store: Store;
  readonly registry: FrameworkRegistry;
  readonly bus: EventBus;
  private readonly scoreCache = new Map<string, { version: number; score: FrameworkScore }>();
  private readonly versions = new Map<string, number>();
  private readonly running = new Map<string, AbortController>();

  constructor(store: Store, registry: FrameworkRegistry, bus: EventBus) {
    this.store = store;
    this.registry = registry;
    this.bus = bus;
  }

  // -------------------------------------------------------------------------
  // Infrastructure
  // -------------------------------------------------------------------------

  private touch(workspaceId: string) {
    this.versions.set(workspaceId, (this.versions.get(workspaceId) ?? 0) + 1);
  }

  private emit(workspaceId: string, type: VisuaEventType, data: unknown) {
    this.touch(workspaceId);
    this.bus.publish(workspaceId, type, data);
  }

  private readonly chainHead = new Map<string, { seq: number; hash: string }>();

  /** Append to the workspace's hash-chained, tamper-evident audit trail. */
  log(workspaceId: string, actor: string, action: string, entity: string, entityId: string, summary: string, data?: Record<string, unknown>): ActivityEvent {
    const head = this.chainHead.get(workspaceId) ?? this.loadChainHead(workspaceId);
    const body: ActivityEvent = { id: newId("act"), workspaceId, at: now(), actor, action, entity, entityId, summary, data, seq: head.seq + 1, prevHash: head.hash };
    const event: ActivityEvent = { ...body, hash: chainHash(head.hash, body) };
    this.chainHead.set(workspaceId, { seq: event.seq!, hash: event.hash! });
    this.store.activity.put(event, `${event.at}#${String(event.seq).padStart(9, "0")}`);
    this.bus.publish(workspaceId, "activity", event);
    return event;
  }

  private loadChainHead(workspaceId: string): { seq: number; hash: string } {
    const last = this.store.activity.recent(workspaceId, 1)[0];
    return last?.hash ? { seq: last.seq ?? 0, hash: last.hash } : { seq: 0, hash: GENESIS };
  }

  /** Recompute every link of the audit trail; any edit, deletion or reordering breaks the chain. */
  verifyAuditTrail(workspaceId: string): { valid: boolean; events: number; brokenAt?: number; head?: string } {
    const events = this.store.activity.list(workspaceId).sort((a, b) => (a.seq ?? 0) - (b.seq ?? 0));
    let prev = GENESIS;
    for (const e of events) {
      const { hash, ...body } = e;
      if (e.prevHash !== prev || chainHash(prev, body as ActivityEvent) !== hash) return { valid: false, events: events.length, brokenAt: e.seq };
      prev = hash!;
    }
    return { valid: true, events: events.length, head: prev };
  }

  workspace(idOrSlug: string): Workspace {
    const ws = this.store.workspaces.get(idOrSlug);
    if (!ws) throw new NotFoundError(`Workspace '${idOrSlug}' not found`);
    return ws;
  }

  frameworkSettings(ws: Workspace, frameworkId: string): WorkspaceFramework | undefined {
    return ws.frameworks.find((f) => f.frameworkId === frameworkId);
  }

  // -------------------------------------------------------------------------
  // Workspaces & onboarding
  // -------------------------------------------------------------------------

  createWorkspace(input: CreateWorkspaceInput, actor = "user"): Workspace {
    if (!input.name?.trim()) throw new ValidationError("Workspace name is required");
    const rec = recommend(input.profile);
    const requested = input.frameworks?.length ? input.frameworks : [rec.frameworks[0]!.frameworkId];
    const frameworkIds = requested.filter((id) => this.registry.framework(id));
    if (!frameworkIds.includes("nist-csf-2.0") && this.registry.framework("nist-csf-2.0")) frameworkIds.unshift("nist-csf-2.0");
    // The SP 800-53 control catalog is operated through the RMF process: track its 47 tasks too.
    if (frameworkIds.includes("nist-sp-800-53-r5") && !frameworkIds.includes("nist-rmf") && this.registry.framework("nist-rmf")) frameworkIds.push("nist-rmf");
    let slug = slugify(input.name) || "workspace";
    if (this.store.workspaces.get(slug)) slug = `${slug}-${Math.random().toString(36).slice(2, 6)}`;
    const ts = now();
    const ws: Workspace = {
      id: newId("ws"),
      name: input.name.trim(),
      slug,
      description: input.description,
      profile: input.profile,
      frameworks: frameworkIds.map((frameworkId) => this.defaultFrameworkSettings(frameworkId, rec.defaultTarget, input)),
      autonomy: {},
      trustCenter: { enabled: false },
      createdAt: ts,
      updatedAt: ts,
    };
    this.store.transaction(() => {
      this.store.workspaces.put(ws);
      for (const f of ws.frameworks) this.initializeStates(ws, f.frameworkId, actor);
    });
    this.log(ws.id, actor, "created", "workspace", ws.id, `Workspace “${ws.name}” created with ${frameworkIds.length} framework(s)`, { rationale: rec.rationale });
    if (input.planInitialTasks) this.planWith(ws.id, "nist-csf-2.0", 12, actor);
    return ws;
  }

  private defaultFrameworkSettings(frameworkId: string, defaultTarget: number, input?: Partial<CreateWorkspaceInput>): WorkspaceFramework {
    const settings: WorkspaceFramework = { frameworkId, enabled: true, defaultTarget };
    if (frameworkId === "aicpa-tsc-2017") {
      settings.defaultTarget = input?.soc2?.reportType === "type1" ? 2 : 3;
      const start = new Date();
      const end = new Date(start.getTime() + 180 * 86_400_000);
      settings.soc2 = {
        categories: input?.soc2?.categories?.length ? input.soc2.categories : ["security", "availability", "confidentiality"],
        reportType: input?.soc2?.reportType ?? "type2",
        observationStart: input?.soc2?.observationStart ?? start.toISOString().slice(0, 10),
        observationEnd: input?.soc2?.observationEnd ?? end.toISOString().slice(0, 10),
        auditFirm: input?.soc2?.auditFirm,
      };
    }
    if (frameworkId === "nist-ai-rmf") {
      settings.ai = { systems: [] };
    }
    if (frameworkId === "nist-sp-800-53-r5") {
      settings.defaultTarget = 3;
      settings.rmf = {
        systemName: input?.rmf?.systemName ?? `${input?.name ?? "Primary"} system`,
        systemDescription: input?.rmf?.systemDescription,
        informationTypes: input?.rmf?.informationTypes ?? [],
        categorization: input?.rmf?.categorization,
        baseline: input?.rmf?.baseline ?? "moderate",
        privacyBaseline: input?.rmf?.privacyBaseline ?? false,
        tailoring: input?.rmf?.tailoring ?? [],
        authorization: input?.rmf?.authorization ?? { decision: "pending" },
      };
    }
    return settings;
  }

  /** Priority of a requirement: CSF categories via recommendation; other frameworks via crosswalk to CSF. */
  private priorityFor(nodeId: string, categoryPriorities: Record<string, Priority>): Priority {
    const fw = frameworkOf(nodeId);
    if (fw === "nist-csf-2.0") {
      const code = codeOf(nodeId);
      return categoryPriorities[code.slice(0, 5)] ?? "medium";
    }
    let p: Priority | undefined;
    for (const e of this.registry.crosswalk.related(nodeId, "nist-csf-2.0")) {
      const cat = codeOf(e.to).slice(0, 5);
      const q = categoryPriorities[cat];
      if (q) p = p ? maxPriority(p, q) : q;
    }
    return p ?? "medium";
  }

  /** Whether a requirement is in scope for the workspace's framework settings. */
  scopeOf(ws: Workspace, nodeId: string): { applicable: boolean; rationale?: string } {
    const fw = frameworkOf(nodeId);
    const settings = this.frameworkSettings(ws, fw);
    const node = this.registry.node(nodeId);
    if (!node) return { applicable: false, rationale: "Unknown requirement" };
    if (fw === "aicpa-tsc-2017" && settings?.soc2) {
      const category = String(node.attributes?.["category"] ?? "security");
      if (!settings.soc2.categories.includes(category as Soc2Settings["categories"][number])) {
        return { applicable: false, rationale: `The ${category.replace("-", " ")} category is not in the SOC 2 examination scope` };
      }
    }
    if (fw === "nist-sp-800-53-r5" && settings?.rmf) {
      const tailored = settings.rmf.tailoring.find((t) => t.nodeId === nodeId);
      if (tailored) return tailored.action === "add" ? { applicable: true, rationale: tailored.rationale } : { applicable: false, rationale: `Tailored out: ${tailored.rationale}` };
      const baselines = (node.attributes?.["baselines"] as string[] | undefined) ?? [];
      const inBaseline = settings.rmf.baseline ? baselines.includes(settings.rmf.baseline) : true;
      const inPrivacy = settings.rmf.privacyBaseline && baselines.includes("privacy");
      if (!inBaseline && !inPrivacy) {
        return { applicable: false, rationale: `Not selected in the ${settings.rmf.baseline?.toUpperCase()} baseline (SP 800-53B)` };
      }
    }
    return { applicable: true };
  }

  initializeStates(ws: Workspace, frameworkId: string, actor = "system"): void {
    const index = this.registry.framework(frameworkId);
    if (!index) return;
    const rec = recommend(ws.profile);
    const settings = this.frameworkSettings(ws, frameworkId);
    const ts = now();
    for (const node of index.assessable) {
      const existing = this.store.states.get(ws.id, node.id);
      const priority = this.priorityFor(node.id, rec.categoryPriorities);
      const scope = this.scopeOf(ws, node.id);
      const baseTarget = frameworkId === "nist-csf-2.0" ? targetFor(priority, rec) : settings?.defaultTarget ?? 3;
      if (existing) {
        const effective = effectiveScope(scope, existing.userExclusion);
        const becameApplicable = effective.applicable && !existing.applicable;
        this.store.states.put(ws.id, {
          ...existing,
          applicable: effective.applicable,
          applicabilityRationale: effective.rationale,
          target: becameApplicable && existing.target === 0 ? baseTarget : existing.target,
        });
        continue;
      }
      this.store.states.put(ws.id, {
        nodeId: node.id,
        current: 0,
        target: scope.applicable ? baseTarget : 0,
        priority,
        applicable: scope.applicable,
        applicabilityRationale: scope.rationale,
        updatedAt: ts,
        updatedBy: actor,
      });
    }
  }

  updateWorkspace(id: string, patch: Partial<Pick<Workspace, "name" | "description" | "profile" | "autonomy" | "trustCenter">>, actor = "user"): Workspace {
    const ws = this.workspace(id);
    const next: Workspace = { ...ws, ...patch, profile: { ...ws.profile, ...(patch.profile ?? {}) }, updatedAt: now() };
    this.store.workspaces.put(next);
    this.emit(ws.id, "workspace.updated", next);
    this.log(ws.id, actor, "updated", "workspace", ws.id, "Workspace settings updated", { fields: Object.keys(patch) });
    return next;
  }

  enableFramework(id: string, frameworkId: string, settings: Partial<WorkspaceFramework> = {}, actor = "user"): Workspace {
    const ws = this.workspace(id);
    if (!this.registry.framework(frameworkId)) throw new ValidationError(`Framework '${frameworkId}' is not available`);
    const rec = recommend(ws.profile);
    const existing = this.frameworkSettings(ws, frameworkId);
    const base = existing ?? this.defaultFrameworkSettings(frameworkId, rec.defaultTarget, { name: ws.name });
    const merged: WorkspaceFramework = {
      ...base,
      ...settings,
      frameworkId,
      enabled: settings.enabled ?? true,
      soc2: settings.soc2 ? { ...base.soc2!, ...settings.soc2 } : base.soc2,
      rmf: settings.rmf ? { ...base.rmf!, ...settings.rmf } : base.rmf,
      ai: settings.ai ? { ...(base.ai ?? { systems: [] }), ...settings.ai } : base.ai,
    };
    const next: Workspace = {
      ...ws,
      frameworks: existing ? ws.frameworks.map((f) => (f.frameworkId === frameworkId ? merged : f)) : [...ws.frameworks, merged],
      updatedAt: now(),
    };
    this.store.transaction(() => {
      this.store.workspaces.put(next);
      this.initializeStates(next, frameworkId, actor);
    });
    this.emit(ws.id, "workspace.updated", next);
    this.log(ws.id, actor, existing ? "updated" : "enabled", "framework", frameworkId, `${existing ? "Updated" : "Enabled"} ${this.registry.framework(frameworkId)!.graph.framework.shortName}`);
    if (frameworkId === "nist-sp-800-53-r5" && merged.enabled && !this.frameworkSettings(next, "nist-rmf")?.enabled && this.registry.framework("nist-rmf")) {
      return this.enableFramework(id, "nist-rmf", {}, actor);
    }
    return next;
  }

  /** CSF Tier self-assessment (CSWP 29, Appendix B). Updates the workspace's maturity tier. */
  recordTierAssessment(id: string, answers: Record<string, number>, actor = "user"): Workspace {
    const ws = this.workspace(id);
    const assessment = assessTiers(answers);
    const next: Workspace = { ...ws, tierAssessment: assessment, profile: { ...ws.profile, maturityTier: assessment.overallTier }, updatedAt: now() };
    this.store.workspaces.put(next);
    this.emit(ws.id, "workspace.updated", next);
    this.log(ws.id, actor, "assessed", "tiers", ws.id, `CSF Tiers: governance Tier ${assessment.governanceTier}, management Tier ${assessment.managementTier}`);
    return next;
  }

  /** RMF Categorize: FIPS 199 categorization → SP 800-53B baseline → re-scope controls. */
  categorizeSystem(
    id: string,
    input: { systemName?: string; systemDescription?: string; informationTypes: RmfSettings["informationTypes"]; privacyBaseline?: boolean },
    actor = "user",
  ): Workspace {
    const ws = this.workspace(id);
    const current = this.frameworkSettings(ws, "nist-sp-800-53-r5");
    const categorization = categorize(input.informationTypes);
    const rmf: RmfSettings = {
      ...(current?.rmf ?? { systemName: `${ws.name} system`, informationTypes: [], tailoring: [] }),
      systemName: input.systemName ?? current?.rmf?.systemName ?? `${ws.name} system`,
      systemDescription: input.systemDescription ?? current?.rmf?.systemDescription,
      informationTypes: input.informationTypes,
      categorization,
      baseline: categorization.overall,
      privacyBaseline: input.privacyBaseline ?? current?.rmf?.privacyBaseline ?? false,
    };
    const next = this.enableFramework(id, "nist-sp-800-53-r5", { rmf }, actor);
    this.log(ws.id, actor, "categorized", "system", ws.id, `FIPS 199 categorization: C=${categorization.confidentiality}, I=${categorization.integrity}, A=${categorization.availability} → ${categorization.overall.toUpperCase()} baseline`);
    return next;
  }

  tailorControl(id: string, nodeId: string, action: "add" | "remove" | "reset", rationale: string, actor = "user"): Workspace {
    const ws = this.workspace(id);
    const settings = this.frameworkSettings(ws, "nist-sp-800-53-r5");
    if (!settings?.rmf) throw new ValidationError("Enable NIST RMF / SP 800-53 first");
    const node = this.registry.node(nodeId);
    if (!node || node.frameworkId !== "nist-sp-800-53-r5") throw new ValidationError(`'${nodeId}' is not an SP 800-53 control`);
    const tailoring = settings.rmf.tailoring.filter((t) => t.nodeId !== node.id);
    if (action !== "reset") tailoring.push({ nodeId: node.id, action, rationale });
    return this.enableFramework(id, "nist-sp-800-53-r5", { rmf: { ...settings.rmf, tailoring } }, actor);
  }

  // -------------------------------------------------------------------------
  // AI governance (NIST AI RMF): the AI system inventory
  // -------------------------------------------------------------------------

  private aiSettings(ws: Workspace): AiRmfSettings {
    const settings = this.frameworkSettings(ws, "nist-ai-rmf");
    if (!settings?.enabled) throw new ValidationError("Enable the NIST AI RMF for this workspace first");
    return settings.ai ?? { systems: [] };
  }

  upsertAiSystem(id: string, input: Partial<Omit<AiSystem, "createdAt" | "updatedAt">> & { id?: string }, actor = "user"): AiSystem {
    const ws = this.workspace(id);
    const ai = this.aiSettings(ws);
    const existing = input.id ? ai.systems.find((s) => s.id === input.id) : undefined;
    if (input.id && !existing) throw new NotFoundError(`AI system '${input.id}' not found`);
    const ts = now();
    const system: AiSystem = {
      id: existing?.id ?? newId("ai"),
      name: (input.name ?? existing?.name ?? "").trim(),
      purpose: (input.purpose ?? existing?.purpose ?? "").trim(),
      role: input.role ?? existing?.role ?? "deployer",
      lifecycle: input.lifecycle ?? existing?.lifecycle ?? "plan-design",
      generative: input.generative ?? existing?.generative ?? false,
      provider: input.provider ?? existing?.provider,
      riskTier: input.riskTier ?? existing?.riskTier ?? "moderate",
      owner: input.owner ?? existing?.owner,
      dataTypes: input.dataTypes ?? existing?.dataTypes ?? [],
      humanOversight: input.humanOversight ?? existing?.humanOversight,
      createdAt: existing?.createdAt ?? ts,
      updatedAt: ts,
    };
    if (!system.name) throw new ValidationError("An AI system needs a name");
    if (!system.purpose) throw new ValidationError("Describe the AI system's intended purpose and context of use");
    const systems = existing ? ai.systems.map((s) => (s.id === system.id ? system : s)) : [...ai.systems, system];
    this.enableFramework(id, "nist-ai-rmf", { ai: { ...ai, systems } }, actor);
    this.log(ws.id, actor, existing ? "updated" : "created", "ai-system", system.id, `AI system ${existing ? "updated" : "added to the inventory"}: ${system.name} (${system.riskTier} risk${system.generative ? ", generative" : ""})`);
    return system;
  }

  removeAiSystem(id: string, systemId: string, actor = "user"): void {
    const ws = this.workspace(id);
    const ai = this.aiSettings(ws);
    const system = ai.systems.find((s) => s.id === systemId);
    if (!system) throw new NotFoundError(`AI system '${systemId}' not found`);
    this.enableFramework(id, "nist-ai-rmf", { ai: { ...ai, systems: ai.systems.filter((s) => s.id !== systemId) } }, actor);
    this.log(ws.id, actor, "deleted", "ai-system", systemId, `AI system removed from the inventory: ${system.name}`);
  }

  setAuthorization(id: string, input: NonNullable<RmfSettings["authorization"]>, actor = "user"): Workspace {
    const ws = this.workspace(id);
    const settings = this.frameworkSettings(ws, "nist-sp-800-53-r5");
    if (!settings?.rmf) throw new ValidationError("Enable NIST RMF / SP 800-53 first");
    const next = this.enableFramework(id, "nist-sp-800-53-r5", { rmf: { ...settings.rmf, authorization: { ...input, decidedAt: input.decidedAt ?? now() } } }, actor);
    this.log(ws.id, actor, "authorized", "system", ws.id, `Authorization decision: ${input.decision.toUpperCase()}${input.authorizingOfficial ? ` by ${input.authorizingOfficial}` : ""}`);
    return next;
  }

  // -------------------------------------------------------------------------
  // Assessment
  // -------------------------------------------------------------------------

  score(workspaceId: string, frameworkId: string): FrameworkScore {
    const index = this.registry.framework(frameworkId);
    if (!index) throw new NotFoundError(`Framework '${frameworkId}' not found`);
    const version = this.versions.get(workspaceId) ?? 0;
    const key = `${workspaceId}|${frameworkId}`;
    const cached = this.scoreCache.get(key);
    if (cached && cached.version === version) return cached.score;
    const snapshot = buildSnapshot({
      states: this.store.states.list(workspaceId, frameworkId),
      evidence: this.store.evidence.list(workspaceId),
      tasks: this.store.tasks.list(workspaceId),
      checks: this.store.checks.list(workspaceId),
    });
    const score = scoreFramework(index, snapshot);
    this.scoreCache.set(key, { version, score });
    return score;
  }

  updateState(
    workspaceId: string,
    nodeId: string,
    patch: Partial<Pick<RequirementState, "current" | "target" | "priority" | "applicable" | "applicabilityRationale" | "owner" | "notes" | "statusOverride" | "verifiedAt">>,
    actor = "user",
  ): RequirementState {
    const ws = this.workspace(workspaceId);
    const node = this.registry.node(nodeId);
    if (!node || !node.assessable) throw new ValidationError(`'${nodeId}' is not an assessable requirement`);
    const prev =
      this.store.states.get(ws.id, node.id) ??
      ({ nodeId: node.id, current: 0, target: 3, priority: "medium", applicable: true, updatedAt: now(), updatedBy: actor } satisfies RequirementState);
    const scope = this.scopeOf(ws, node.id);
    let scoping: Partial<RequirementState> = {};
    if (patch.applicable === false) {
      const rationale = patch.applicabilityRationale?.trim() || (prev.userExclusion ? prev.applicabilityRationale?.trim() : "");
      if (!rationale) throw new ValidationError("Marking a requirement not applicable requires a written rationale that auditors can review");
      scoping = { applicable: false, applicabilityRationale: rationale, userExclusion: { rationale, at: now(), by: actor } };
    } else if (patch.applicable === true) {
      if (!scope.applicable) throw new ValidationError(`Out of scope by configuration — ${scope.rationale}. Change the scope (SOC 2 categories or RMF baseline/tailoring) instead.`);
      scoping = { applicable: true, applicabilityRationale: scope.rationale, userExclusion: undefined };
      if (prev.target === 0 && patch.target === undefined) scoping.target = this.frameworkSettings(ws, node.frameworkId)?.defaultTarget ?? 3;
    }
    const next: RequirementState = {
      ...prev,
      ...patch,
      ...scoping,
      nodeId: node.id,
      current: patch.current !== undefined ? clampLevel(patch.current) : prev.current,
      target: patch.target !== undefined ? clampLevel(patch.target) : scoping.target ?? prev.target,
      updatedAt: now(),
      updatedBy: actor,
    };
    if (patch.statusOverride === null) delete next.statusOverride;
    if (!next.userExclusion) delete next.userExclusion;
    this.store.states.put(ws.id, next);
    this.emit(ws.id, "state.updated", next);
    const changes = Object.entries(patch)
      .filter(([k, v]) => (prev as unknown as Record<string, unknown>)[k] !== v)
      .map(([k, v]) => `${k}: ${String((prev as unknown as Record<string, unknown>)[k] ?? "—")} → ${String(v)}`);
    this.log(ws.id, actor, "assessed", "requirement", node.id, `${node.code} ${changes.join(", ") || "updated"}`, { patch });
    return next;
  }

  // -------------------------------------------------------------------------
  // Tasks
  // -------------------------------------------------------------------------

  createTask(workspaceId: string, input: Partial<Task> & Pick<Task, "title">, actor = "user"): Task {
    const ws = this.workspace(workspaceId);
    const requirementIds = (input.requirementIds ?? []).map((id) => this.registry.node(id)?.id).filter((x): x is string => !!x);
    const ts = now();
    const task: Task = {
      id: newId("task"),
      workspaceId: ws.id,
      title: input.title.trim(),
      description: input.description ?? "",
      kind: input.kind ?? "procedure",
      status: input.status ?? "todo",
      priority: input.priority ?? "medium",
      requirementIds,
      assignee: input.assignee,
      startDate: input.startDate,
      dueDate: input.dueDate,
      effortHours: input.effortHours,
      checklist: (input.checklist ?? []).map((c) => ({ id: c.id ?? newId("chk"), text: c.text, done: !!c.done })),
      dependsOn: input.dependsOn ?? [],
      automation: input.automation,
      source: input.source,
      targetLevel: input.targetLevel,
      origin: input.origin ?? "user",
      createdAt: ts,
      updatedAt: ts,
    };
    this.store.tasks.put(task);
    this.emit(ws.id, "task.created", task);
    this.log(ws.id, actor, "created", "task", task.id, `Task “${task.title}” created`);
    return task;
  }

  updateTask(workspaceId: string, taskId: string, patch: Partial<Task>, actor = "user"): { task: Task; suggestedLevels: { nodeId: string; code: string; from: number; to: number }[] } {
    const prev = this.store.tasks.get(taskId);
    if (!prev || prev.workspaceId !== workspaceId) throw new NotFoundError(`Task '${taskId}' not found`);
    const next: Task = { ...prev, ...patch, id: prev.id, workspaceId: prev.workspaceId, updatedAt: now() };
    if (patch.status === "done" && prev.status !== "done") next.completedAt = now();
    if (patch.status && patch.status !== "done") delete next.completedAt;
    this.store.tasks.put(next);
    this.emit(workspaceId, "task.updated", next);
    this.log(workspaceId, actor, "updated", "task", next.id, `Task “${next.title}”${patch.status && patch.status !== prev.status ? ` → ${patch.status}` : " updated"}`);
    const suggestedLevels: { nodeId: string; code: string; from: number; to: number }[] = [];
    if (patch.status === "done" && prev.status !== "done") {
      for (const nodeId of next.requirementIds) {
        const s = this.store.states.get(workspaceId, nodeId);
        if (!s || !s.applicable) continue;
        const to = Math.min(next.targetLevel ?? s.target, s.target, s.current + 1);
        if (to > s.current) suggestedLevels.push({ nodeId, code: codeOf(nodeId), from: s.current, to });
      }
    }
    return { task: next, suggestedLevels };
  }

  deleteTask(workspaceId: string, taskId: string, actor = "user"): void {
    const task = this.store.tasks.get(taskId);
    if (!task || task.workspaceId !== workspaceId) throw new NotFoundError(`Task '${taskId}' not found`);
    this.store.tasks.delete(taskId);
    this.emit(workspaceId, "task.deleted", { id: taskId });
    this.log(workspaceId, actor, "deleted", "task", taskId, `Task “${task.title}” deleted`);
  }

  planWith(workspaceId: string, frameworkId: string, maxTasks: number, actor = "system"): Task[] {
    const ws = this.workspace(workspaceId);
    const index = this.registry.framework(frameworkId);
    if (!index) return [];
    const states = new Map(this.store.states.list(ws.id, frameworkId).map((s) => [s.nodeId, s]));
    const open = new Set(this.store.tasks.list(ws.id).filter((t) => t.status !== "done").flatMap((t) => t.requirementIds));
    const planned = planTasks(index, states, {
      workspaceId: ws.id,
      startDate: new Date(),
      weeklyCapacityHours: Math.max(8, ws.profile.securityTeamSize * 12),
      existingTaskNodeIds: open,
      maxTasks,
      idFactory: () => newId("task"),
    });
    const ts = now();
    const created: Task[] = [];
    this.store.transaction(() => {
      for (const p of planned) {
        const task: Task = { ...p, createdAt: ts, updatedAt: ts };
        this.store.tasks.put(task);
        created.push(task);
      }
    });
    for (const t of created) this.bus.publish(ws.id, "task.created", t);
    this.touch(ws.id);
    if (created.length) this.log(ws.id, actor, "planned", "task", frameworkId, `${created.length} task(s) planned from official implementation guidance`);
    return created;
  }

  // -------------------------------------------------------------------------
  // Evidence
  // -------------------------------------------------------------------------

  createEvidence(workspaceId: string, input: Partial<Evidence> & Pick<Evidence, "title">, actor = "user"): Evidence {
    const ws = this.workspace(workspaceId);
    const ts = now();
    const requirementIds = (input.requirementIds ?? []).map((id) => this.registry.node(id)?.id).filter((x): x is string => !!x);
    const evidence: Evidence = {
      id: newId("ev"),
      workspaceId: ws.id,
      title: input.title.trim(),
      description: input.description,
      kind: input.kind ?? "document",
      source: input.source ?? "manual",
      connectorId: input.connectorId,
      requirementIds,
      status: input.status ?? "pending-review",
      collectedAt: input.collectedAt ?? ts,
      validUntil: input.validUntil,
      content: input.content,
      data: input.data,
      fileName: input.fileName,
      sha256: input.sha256,
      reviewedBy: input.reviewedBy,
      reviewedAt: input.reviewedAt,
      createdAt: ts,
    };
    this.store.evidence.put(evidence);
    this.emit(ws.id, "evidence.created", evidence);
    this.log(ws.id, actor, "collected", "evidence", evidence.id, `Evidence “${evidence.title}” added for ${requirementIds.map(codeOf).join(", ") || "no requirement"}`);
    return evidence;
  }

  reviewEvidence(workspaceId: string, evidenceId: string, decision: "accepted" | "rejected", actor = "user", note?: string): Evidence {
    const prev = this.store.evidence.get(evidenceId);
    if (!prev || prev.workspaceId !== workspaceId) throw new NotFoundError(`Evidence '${evidenceId}' not found`);
    const next: Evidence = { ...prev, status: decision, reviewedBy: actor, reviewedAt: now(), description: note ? `${prev.description ?? ""}\n\nReview note: ${note}`.trim() : prev.description };
    this.store.evidence.put(next);
    this.emit(workspaceId, "evidence.updated", next);
    this.log(workspaceId, actor, decision, "evidence", next.id, `Evidence “${next.title}” ${decision}`);
    return next;
  }

  updateEvidence(workspaceId: string, evidenceId: string, patch: Partial<Evidence>, actor = "user"): Evidence {
    const prev = this.store.evidence.get(evidenceId);
    if (!prev || prev.workspaceId !== workspaceId) throw new NotFoundError(`Evidence '${evidenceId}' not found`);
    const next: Evidence = { ...prev, ...patch, id: prev.id, workspaceId };
    this.store.evidence.put(next);
    this.emit(workspaceId, "evidence.updated", next);
    this.log(workspaceId, actor, "updated", "evidence", next.id, `Evidence “${next.title}” updated`);
    return next;
  }

  // -------------------------------------------------------------------------
  // Policies
  // -------------------------------------------------------------------------

  createPolicy(workspaceId: string, input: Partial<Policy> & Pick<Policy, "title" | "body">, actor = "user"): Policy {
    const ws = this.workspace(workspaceId);
    const ts = now();
    const policy: Policy = {
      id: newId("pol"),
      workspaceId: ws.id,
      title: input.title.trim(),
      slug: slugify(input.title),
      version: 1,
      status: input.status ?? "draft",
      body: input.body,
      requirementIds: (input.requirementIds ?? []).map((id) => this.registry.node(id)?.id).filter((x): x is string => !!x),
      owner: input.owner,
      reviewCadenceDays: input.reviewCadenceDays ?? 365,
      origin: input.origin ?? "user",
      agentRunId: input.agentRunId,
      createdAt: ts,
      updatedAt: ts,
    };
    this.store.policies.put(policy);
    this.emit(ws.id, "policy.created", policy);
    this.log(ws.id, actor, "created", "policy", policy.id, `Policy “${policy.title}” created (${policy.status})`);
    return policy;
  }

  updatePolicy(workspaceId: string, policyId: string, patch: Partial<Pick<Policy, "title" | "body" | "status" | "owner" | "requirementIds" | "reviewCadenceDays">>, actor = "user"): Policy {
    const prev = this.store.policies.get(policyId);
    if (!prev || prev.workspaceId !== workspaceId) throw new NotFoundError(`Policy '${policyId}' not found`);
    const bodyChanged = patch.body !== undefined && patch.body !== prev.body;
    const next: Policy = {
      ...prev,
      ...patch,
      version: bodyChanged && (prev.status === "approved" || prev.status === "published") ? prev.version + 1 : prev.version,
      updatedAt: now(),
    };
    if (bodyChanged && (prev.status === "approved" || prev.status === "published") && !patch.status) next.status = "in-review";
    if (patch.status === "approved" && prev.status !== "approved") {
      next.approvedBy = actor;
      next.approvedAt = now();
    }
    this.store.policies.put(next);
    this.emit(workspaceId, "policy.updated", next);
    this.log(workspaceId, actor, patch.status ?? "updated", "policy", next.id, `Policy “${next.title}” v${next.version} ${patch.status ?? "updated"}`);
    if (patch.status === "approved" || patch.status === "published") {
      // An approved policy is evidence for the requirements it governs.
      const exists = this.store.evidence.list(workspaceId).some((e) => e.kind === "policy" && e.data?.["policyId"] === next.id && e.data?.["version"] === next.version);
      if (!exists && next.requirementIds.length) {
        this.createEvidence(
          workspaceId,
          {
            title: `${next.title} v${next.version} (approved)`,
            kind: "policy",
            source: "manual",
            requirementIds: next.requirementIds,
            status: "accepted",
            reviewedBy: actor,
            reviewedAt: now(),
            validUntil: new Date(Date.now() + next.reviewCadenceDays * 86_400_000).toISOString(),
            data: { policyId: next.id, version: next.version },
            content: next.body,
          },
          actor,
        );
      }
    }
    return next;
  }

  // -------------------------------------------------------------------------
  // Risks
  // -------------------------------------------------------------------------

  upsertRisk(workspaceId: string, input: Partial<Risk> & Pick<Risk, "title">, actor = "user"): Risk {
    const ws = this.workspace(workspaceId);
    const prev = input.id ? this.store.risks.get(input.id) : undefined;
    const ts = now();
    const risk: Risk = {
      id: prev?.id ?? newId("risk"),
      workspaceId: ws.id,
      title: input.title,
      description: input.description ?? prev?.description ?? "",
      likelihood: input.likelihood ?? prev?.likelihood ?? 3,
      impact: input.impact ?? prev?.impact ?? 3,
      treatment: input.treatment ?? prev?.treatment ?? "mitigate",
      status: input.status ?? prev?.status ?? "open",
      requirementIds: input.requirementIds ?? prev?.requirementIds ?? [],
      owner: input.owner ?? prev?.owner,
      createdAt: prev?.createdAt ?? ts,
      updatedAt: ts,
    };
    this.store.risks.put(risk);
    this.emit(ws.id, "risk.updated", risk);
    this.log(ws.id, actor, prev ? "updated" : "created", "risk", risk.id, `Risk “${risk.title}” ${prev ? "updated" : "registered"}`);
    return risk;
  }

  // -------------------------------------------------------------------------
  // Connectors & monitoring
  // -------------------------------------------------------------------------

  createConnector(workspaceId: string, input: { kind: string; name?: string; config: Record<string, unknown> }, actor = "user"): Connector {
    const ws = this.workspace(workspaceId);
    const kind = connectorKind(input.kind);
    if (!kind) throw new ValidationError(`Unknown connector kind '${input.kind}'`);
    for (const field of kind.configFields) {
      if (field.required && !String(input.config[field.key] ?? "").trim()) throw new ValidationError(`${field.label} is required`);
    }
    const connector: Connector = {
      id: newId("con"),
      workspaceId: ws.id,
      kind: kind.kind,
      name: input.name?.trim() || kind.name,
      config: input.config,
      status: "active",
      createdAt: now(),
    };
    this.store.connectors.put(connector);
    this.log(ws.id, actor, "connected", "connector", connector.id, `Connector “${connector.name}” added`);
    return connector;
  }

  private resolveRefs(ws: Workspace, refs: RequirementRefs): string[] {
    const ids: string[] = [];
    for (const [key, codes] of Object.entries(refs) as [keyof RequirementRefs, string[]][]) {
      const fw = FRAMEWORK_OF_REF[key];
      if (!this.frameworkSettings(ws, fw)?.enabled) continue;
      const index = this.registry.framework(fw);
      for (const code of codes ?? []) {
        const node = index?.get(code);
        if (node) ids.push(node.id);
      }
    }
    return ids;
  }

  async runConnector(workspaceId: string, connectorId: string, actor = "user"): Promise<CheckResult[]> {
    const ws = this.workspace(workspaceId);
    const connector = this.store.connectors.get(connectorId);
    if (!connector || connector.workspaceId !== ws.id) throw new NotFoundError(`Connector '${connectorId}' not found`);
    const kind = connectorKind(connector.kind);
    if (!kind) throw new ValidationError(`Unknown connector kind '${connector.kind}'`);
    let outputs;
    try {
      outputs = await kind.run(connector.config);
      this.store.connectors.put({ ...connector, status: "active", lastRunAt: now() });
    } catch (err) {
      this.store.connectors.put({ ...connector, status: "error", lastRunAt: now() });
      throw err;
    }
    const observedAt = now();
    const results: CheckResult[] = outputs.map((o) => ({
      id: newId("chk"),
      workspaceId: ws.id,
      connectorId: connector.id,
      checkId: o.checkId,
      title: o.title,
      outcome: o.outcome,
      detail: o.detail,
      requirementIds: this.resolveRefs(ws, o.requirements),
      observed: o.observed,
      observedAt,
    }));
    this.store.transaction(() => {
      for (const r of results) this.store.checks.put(r, observedAt);
    });
    // Passing checks are machine-verified evidence, valid for 30 days.
    for (const r of results.filter((x) => x.outcome === "pass" && x.requirementIds.length)) {
      const ev = this.createEvidence(
        ws.id,
        {
          title: `${connector.name}: ${r.title}`,
          kind: "automated-check",
          source: "connector",
          connectorId: connector.id,
          requirementIds: r.requirementIds,
          status: "accepted",
          reviewedBy: "system:connector",
          reviewedAt: observedAt,
          collectedAt: observedAt,
          validUntil: new Date(Date.now() + 30 * 86_400_000).toISOString(),
          content: r.detail,
          data: { checkId: r.checkId, observed: r.observed, automation: "api-automated" },
          sha256: createHash("sha256").update(canonical({ checkId: r.checkId, observed: r.observed, observedAt })).digest("hex"),
        },
        `connector:${connector.kind}`,
      );
      r.evidenceId = ev.id;
      this.store.checks.put(r, observedAt);
    }
    this.emit(ws.id, "check.completed", { connectorId: connector.id, results });
    const passed = results.filter((r) => r.outcome === "pass").length;
    this.log(ws.id, actor, "ran", "connector", connector.id, `${connector.name}: ${passed}/${results.length} checks passing`);
    return results;
  }

  // -------------------------------------------------------------------------
  // Agents & proposals
  // -------------------------------------------------------------------------

  startRun(workspaceId: string, input: { agent: AgentKind; goal: string; input?: Record<string, unknown> }, actor = "user"): AgentRun {
    const ws = this.workspace(workspaceId);
    const run: AgentRun = {
      id: newId("run"),
      workspaceId: ws.id,
      agent: input.agent,
      goal: input.goal.trim() || `Run ${input.agent}`,
      input: input.input ?? {},
      status: "queued",
      mode: "offline",
      steps: [],
      focusNodeIds: [],
      taskId: typeof input.input?.["taskId"] === "string" ? (input.input["taskId"] as string) : undefined,
      createdAt: now(),
    };
    this.store.runs.put(run, run.createdAt);
    this.emit(ws.id, "agent.run.created", run);
    this.log(ws.id, actor, "started", "agent-run", run.id, `${input.agent} started: ${run.goal.slice(0, 120)}`);
    const controller = new AbortController();
    this.running.set(run.id, controller);
    void this.executeRun(run.id, controller.signal).finally(() => this.running.delete(run.id));
    return run;
  }

  /** Resolves when the run finishes (used by tests and synchronous API callers). */
  async waitForRun(runId: string, timeoutMs = 120_000): Promise<AgentRun> {
    const started = Date.now();
    for (;;) {
      const run = this.store.runs.get(runId);
      if (!run) throw new NotFoundError(`Run '${runId}' not found`);
      if (["completed", "failed", "cancelled", "awaiting-approval"].includes(run.status)) return run;
      if (Date.now() - started > timeoutMs) throw new Error("Timed out waiting for agent run");
      await new Promise((r) => setTimeout(r, 25));
    }
  }

  cancelRun(workspaceId: string, runId: string, actor = "user"): AgentRun {
    const run = this.store.runs.get(runId);
    if (!run || run.workspaceId !== workspaceId) throw new NotFoundError(`Run '${runId}' not found`);
    this.running.get(runId)?.abort();
    const next: AgentRun = { ...run, status: "cancelled", finishedAt: now() };
    this.store.runs.put(next);
    this.emit(workspaceId, "agent.run.updated", next);
    this.log(workspaceId, actor, "cancelled", "agent-run", runId, `${run.agent} run cancelled`);
    return next;
  }

  private async executeRun(runId: string, signal: AbortSignal): Promise<void> {
    let run = this.store.runs.get(runId)!;
    const workspaceId = run.workspaceId;
    const save = (patch: Partial<AgentRun>) => {
      run = { ...this.store.runs.get(runId)!, ...patch };
      this.store.runs.put(run);
      this.emit(workspaceId, "agent.run.updated", { ...run, steps: undefined });
      return run;
    };
    save({ status: "running", startedAt: now() });
    const host = this.hostFor(workspaceId, runId, signal);
    try {
      const result = await executeAgent(host, { agent: run.agent, goal: run.goal, input: run.input });
      if (signal.aborted) return;
      const pending = this.store.proposals.list(workspaceId).filter((p) => p.runId === runId && p.status === "pending").length;
      save({
        status: pending ? "awaiting-approval" : "completed",
        summary: result.summary,
        mode: result.mode,
        model: result.model,
        usage: result.usage,
        finishedAt: now(),
      });
      this.log(workspaceId, `agent:${run.agent}`, "finished", "agent-run", runId, `${run.agent} finished${pending ? ` — ${pending} proposal(s) await approval` : ""}`);
    } catch (err) {
      if (signal.aborted) return;
      const message = err instanceof Error ? err.message : String(err);
      host.step({ type: "error", title: "Run failed", detail: message });
      save({ status: "failed", error: message, finishedAt: now() });
      this.log(workspaceId, `agent:${run.agent}`, "failed", "agent-run", runId, `${run.agent} failed: ${message.slice(0, 160)}`);
    }
  }

  hostFor(workspaceId: string, runId: string, signal: AbortSignal): AgentHost {
    const service = this;
    return {
      registry: this.registry,
      runId,
      signal,
      workspace: () => service.workspace(workspaceId),
      states: (frameworkId?: string) => service.store.states.list(workspaceId, frameworkId),
      state: (nodeId: string) => service.store.states.get(workspaceId, nodeId),
      score: (frameworkId: string) => service.score(workspaceId, frameworkId),
      tasks: () => service.store.tasks.list(workspaceId),
      evidence: () => service.store.evidence.list(workspaceId),
      policies: () => service.store.policies.list(workspaceId),
      connectors: () => service.store.connectors.list(workspaceId),
      runConnector: (connectorId: string) => service.runConnector(workspaceId, connectorId, `agent:${runId}`),
      propose: (input: ProposalInput) => service.createProposal(workspaceId, runId, input),
      step: (step: Omit<AgentStep, "id" | "at">) => service.appendStep(workspaceId, runId, step),
    };
  }

  appendStep(workspaceId: string, runId: string, step: Omit<AgentStep, "id" | "at">): AgentStep {
    const full: AgentStep = { ...step, id: newId("stp"), at: now() };
    const run = this.store.runs.get(runId);
    if (!run) return full;
    const focusNodeIds = step.nodeIds?.length ? [...new Set([...run.focusNodeIds, ...step.nodeIds])].slice(-60) : run.focusNodeIds;
    this.store.runs.put({ ...run, steps: [...run.steps, full], focusNodeIds });
    this.bus.publish(workspaceId, "agent.step", { runId, agent: run.agent, step: full });
    return full;
  }

  createProposal(workspaceId: string, runId: string, input: ProposalInput): Proposal {
    const ws = this.workspace(workspaceId);
    const proposal: Proposal = {
      id: newId("prop"),
      runId,
      workspaceId,
      type: input.type,
      title: input.title,
      rationale: input.rationale,
      payload: input.payload,
      citations: input.citations,
      confidence: input.confidence,
      status: "pending",
      nodeIds: input.nodeIds,
      createdAt: now(),
    };
    this.store.proposals.put(proposal, proposal.createdAt);
    this.appendStep(workspaceId, runId, { type: "proposal", title: proposal.title, detail: proposal.rationale, data: { proposalId: proposal.id, type: proposal.type }, nodeIds: proposal.nodeIds, citations: proposal.citations });
    this.emit(workspaceId, "proposal.created", proposal);
    if (ws.autonomy[proposal.type]) return this.decideProposal(workspaceId, proposal.id, "approved", "autonomy");
    return proposal;
  }

  decideProposal(workspaceId: string, proposalId: string, decision: "approved" | "rejected", actor = "user", edits?: Record<string, unknown>): Proposal {
    const prev = this.store.proposals.get(proposalId);
    if (!prev || prev.workspaceId !== workspaceId) throw new NotFoundError(`Proposal '${proposalId}' not found`);
    if (prev.status !== "pending") throw new ValidationError(`Proposal already ${prev.status}`);
    let next: Proposal = { ...prev, payload: { ...prev.payload, ...(edits ?? {}) }, status: decision, decidedBy: actor, decidedAt: now() };
    if (decision === "approved") {
      try {
        this.applyProposal(next, actor);
        next = { ...next, status: "applied" };
      } catch (err) {
        next = { ...next, status: "failed", rationale: `${next.rationale}\n\nApply failed: ${(err as Error).message}` };
      }
    }
    this.store.proposals.put(next);
    this.emit(workspaceId, "proposal.updated", next);
    this.log(workspaceId, actor, next.status, "proposal", next.id, `${next.status === "applied" ? "Approved" : next.status === "rejected" ? "Rejected" : "Failed"}: ${next.title}`);
    this.refreshRunStatus(workspaceId, next.runId);
    return next;
  }

  private refreshRunStatus(workspaceId: string, runId: string) {
    const run = this.store.runs.get(runId);
    if (!run || run.status !== "awaiting-approval") return;
    const pending = this.store.proposals.list(workspaceId).some((p) => p.runId === runId && p.status === "pending");
    if (!pending) {
      const next = { ...run, status: "completed" as const };
      this.store.runs.put(next);
      this.emit(workspaceId, "agent.run.updated", { ...next, steps: undefined });
    }
  }

  private applyProposal(p: Proposal, actor: string): void {
    const by = `${actor} (via ${p.runId})`;
    const payload = p.payload;
    switch (p.type) {
      case "set-level":
        this.updateState(p.workspaceId, String(payload["nodeId"]), { current: Number(payload["current"]) }, by);
        return;
      case "set-target":
        this.updateState(p.workspaceId, String(payload["nodeId"]), { target: Number(payload["target"]) }, by);
        return;
      case "set-applicability":
        this.updateState(p.workspaceId, String(payload["nodeId"]), { applicable: Boolean(payload["applicable"]), applicabilityRationale: String(payload["rationale"] ?? "") }, by);
        return;
      case "create-task": {
        const checklist = Array.isArray(payload["checklist"]) ? (payload["checklist"] as string[]).map((text) => ({ id: newId("chk"), text, done: false })) : [];
        this.createTask(
          p.workspaceId,
          {
            title: String(payload["title"]),
            description: String(payload["description"] ?? ""),
            kind: payload["kind"] as Task["kind"],
            priority: payload["priority"] as Priority,
            requirementIds: payload["requirementIds"] as string[],
            dueDate: payload["dueDate"] as string | undefined,
            effortHours: payload["effortHours"] as number | undefined,
            checklist,
            origin: "agent",
          },
          by,
        );
        return;
      }
      case "update-task": {
        const task = this.store.tasks.get(String(payload["taskId"]));
        if (!task) throw new NotFoundError("Task no longer exists");
        const done = new Set((payload["completeChecklistItems"] as string[] | undefined) ?? []);
        const patch: Partial<Task> = { checklist: task.checklist.map((c) => (done.has(c.id) ? { ...c, done: true } : c)) };
        if (payload["status"]) patch.status = payload["status"] as Task["status"];
        if (payload["note"]) patch.description = `${task.description}\n\n— ${new Date().toISOString().slice(0, 10)}: ${String(payload["note"])}`.trim();
        this.updateTask(p.workspaceId, task.id, patch, by);
        return;
      }
      case "create-evidence":
        this.createEvidence(
          p.workspaceId,
          {
            title: String(payload["title"]),
            kind: payload["kind"] as Evidence["kind"],
            source: "agent",
            requirementIds: payload["requirementIds"] as string[],
            content: String(payload["content"] ?? ""),
            status: "accepted",
            reviewedBy: actor,
            reviewedAt: now(),
            validUntil: payload["validDays"] ? new Date(Date.now() + Number(payload["validDays"]) * 86_400_000).toISOString() : undefined,
          },
          by,
        );
        return;
      case "review-evidence":
        this.reviewEvidence(p.workspaceId, String(payload["evidenceId"]), payload["decision"] === "rejected" ? "rejected" : "accepted", by);
        return;
      case "create-policy":
        this.createPolicy(
          p.workspaceId,
          { title: String(payload["title"]), body: String(payload["body"]), requirementIds: payload["requirementIds"] as string[], status: "in-review", origin: "agent", agentRunId: p.runId },
          by,
        );
        return;
      case "create-risk":
        this.upsertRisk(p.workspaceId, payload as unknown as Risk, by);
        return;
      case "set-rmf": {
        const ws = this.workspace(p.workspaceId);
        const settings = this.frameworkSettings(ws, "nist-sp-800-53-r5");
        this.enableFramework(p.workspaceId, "nist-sp-800-53-r5", { rmf: { ...settings!.rmf!, ...(payload as Partial<RmfSettings>) } }, by);
        return;
      }
    }
  }
}
