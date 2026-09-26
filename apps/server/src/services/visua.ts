/**
 * Application service: the single place where workspace state changes.
 * Every mutation is validated and runs in one transaction, serialized per
 * workspace, together with its entry in the hash-chained audit trail. Events
 * reach the bus (which drives the live 3D Observatory) once it commits.
 */
import {
  assessTiers,
  buildSnapshot,
  categorize,
  clampLevel,
  codeOf,
  frameworkOf,
  newId,
  overlayPriority,
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
  type FrameworkOverlay,
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
import { AsyncLocalStorage } from "node:async_hooks";
import { createHash } from "node:crypto";
import type { EventBus, VisuaEventType } from "../bus.ts";
import { FRAMEWORK_OF_REF, connectorKind, type RequirementRefs } from "../connectors/index.ts";
import { txContext } from "../storage/driver.ts";
import type { Store } from "../storage/index.ts";

export class NotFoundError extends Error {}

/** The authenticated principal of the current request; its id is recorded with every audit event. */
export interface Principal {
  id: string;
  label: string;
}
export const principalContext = new AsyncLocalStorage<Principal>();

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
const STATE_LAWS = "us-state-ai-laws";
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
  /** Owning organization. */
  tenantId?: string;
}

/** Scope settings win; otherwise a person's documented exclusion stands. */
function effectiveScope(scope: { applicable: boolean; rationale?: string }, exclusion: RequirementState["userExclusion"]): { applicable: boolean; rationale?: string } {
  if (!scope.applicable) return scope;
  if (exclusion) return { applicable: false, rationale: exclusion.rationale };
  return scope;
}

/** Everything an agent reads, loaded once per run and refreshed after each change it applies. */
interface AgentSnapshot {
  workspace: Workspace;
  states: RequirementState[];
  byNode: Map<string, RequirementState>;
  tasks: Task[];
  evidence: Evidence[];
  policies: Policy[];
  connectors: Connector[];
  score(frameworkId: string): FrameworkScore;
}

/**
 * The flight recorder of one agent run. Steps stream to the bus immediately
 * and are persisted in order, off the caller's transaction, through a queue.
 */
class RunRecorder {
  private chain: Promise<unknown> = Promise.resolve();
  private readonly svc: VisuaService;
  private readonly workspaceId: string;
  private readonly run: Pick<AgentRun, "id" | "agent">;

  constructor(svc: VisuaService, workspaceId: string, run: Pick<AgentRun, "id" | "agent">) {
    this.svc = svc;
    this.workspaceId = workspaceId;
    this.run = run;
  }

  step(step: Omit<AgentStep, "id" | "at">): AgentStep {
    const full: AgentStep = { ...step, id: newId("stp"), at: now() };
    this.svc.bus.publish(this.workspaceId, "agent.step", { runId: this.run.id, agent: this.run.agent, step: full });
    txContext.exit(() => {
      this.chain = this.chain
        .then(() =>
          this.svc.store.runs.update(this.run.id, (r) => ({
            ...r,
            steps: [...r.steps, full],
            focusNodeIds: step.nodeIds?.length ? [...new Set([...r.focusNodeIds, ...step.nodeIds])].slice(-60) : r.focusNodeIds,
          })),
        )
        .catch((err: unknown) => console.error("[visua] could not record agent step", err));
    });
    return full;
  }

  /** Resolves when every recorded step is persisted. */
  flush(): Promise<unknown> {
    return this.chain;
  }
}

export class VisuaService {
  readonly store: Store;
  readonly registry: FrameworkRegistry;
  readonly bus: EventBus;
  private readonly scoreCache = new Map<string, { rev: number; score: FrameworkScore }>();
  private readonly running = new Map<string, AbortController>();

  constructor(store: Store, registry: FrameworkRegistry, bus: EventBus) {
    this.store = store;
    this.registry = registry;
    this.bus = bus;
  }

  // -------------------------------------------------------------------------
  // Infrastructure
  // -------------------------------------------------------------------------

  /** Publish once the current transaction commits; dropped if it rolls back. */
  private emit(workspaceId: string, type: VisuaEventType, data: unknown) {
    this.store.afterCommit(() => this.bus.publish(workspaceId, type, data));
  }

  /**
   * Run a change to one workspace atomically: one transaction (joined when
   * already inside one), serialized per workspace across server instances, on
   * data read after the lock is held.
   */
  private async mutate<T>(idOrSlug: string, fn: (ws: Workspace) => Promise<T>): Promise<T> {
    return this.store.atomic(async () => {
      const found = await this.workspace(idOrSlug);
      await this.store.lock(`ws:${found.id}`);
      const ws = this.store.dialect === "postgres" ? await this.workspace(found.id) : found;
      return fn(ws);
    });
  }

  /** Append to the workspace's hash-chained, tamper-evident audit trail. */
  async log(workspaceId: string, actor: string, action: string, entity: string, entityId: string, summary: string, data?: Record<string, unknown>): Promise<ActivityEvent> {
    return this.store.atomic(async () => {
      await this.store.lock(`ws:${workspaceId}`);
      const last = await this.store.activity.head(workspaceId);
      const head = last?.hash ? { seq: last.seq ?? 0, hash: last.hash } : { seq: 0, hash: GENESIS };
      const actorId = principalContext.getStore()?.id;
      const body: ActivityEvent = {
        id: newId("act"),
        workspaceId,
        at: now(),
        actor,
        ...(actorId ? { actorId } : {}),
        action,
        entity,
        entityId,
        summary,
        data,
        seq: head.seq + 1,
        prevHash: head.hash,
      };
      const event: ActivityEvent = { ...body, hash: chainHash(head.hash, body) };
      await this.store.activity.append(event);
      // Every audited change moves the workspace revision, which keys derived caches.
      await this.store.workspaces.bump(workspaceId);
      this.emit(workspaceId, "activity", event);
      return event;
    });
  }

  /** Recompute every link of the audit trail; any edit, deletion or reordering breaks the chain. */
  async verifyAuditTrail(workspaceId: string): Promise<{ valid: boolean; events: number; brokenAt?: number; head?: string }> {
    const events = (await this.store.activity.chain(workspaceId)).sort((a, b) => (a.seq ?? 0) - (b.seq ?? 0));
    let prev = GENESIS;
    for (const e of events) {
      const { hash, ...body } = e;
      if (e.prevHash !== prev || chainHash(prev, body as ActivityEvent) !== hash) return { valid: false, events: events.length, brokenAt: e.seq };
      prev = hash!;
    }
    return { valid: true, events: events.length, head: prev };
  }

  /** Invalidate derived caches after writing states outside the service (demo seeding). */
  async invalidate(workspaceId: string): Promise<void> {
    await this.store.workspaces.bump(workspaceId);
  }

  async workspace(idOrSlug: string): Promise<Workspace> {
    const ws = await this.store.workspaces.get(idOrSlug);
    if (!ws) throw new NotFoundError(`Workspace '${idOrSlug}' not found`);
    return ws;
  }

  frameworkSettings(ws: Workspace, frameworkId: string): WorkspaceFramework | undefined {
    return ws.frameworks.find((f) => f.frameworkId === frameworkId);
  }

  // -------------------------------------------------------------------------
  // Workspaces & onboarding
  // -------------------------------------------------------------------------

  async createWorkspace(input: CreateWorkspaceInput, actor = "user"): Promise<Workspace> {
    if (!input.name?.trim()) throw new ValidationError("Workspace name is required");
    const rec = recommend(input.profile);
    const requested = input.frameworks?.length ? input.frameworks : [rec.frameworks[0]!.frameworkId];
    const frameworkIds = requested.filter((id) => this.registry.framework(id));
    if (!frameworkIds.includes("nist-csf-2.0") && this.registry.framework("nist-csf-2.0")) frameworkIds.unshift("nist-csf-2.0");
    // The SP 800-53 control catalog is operated through the RMF process: track its 47 tasks too.
    if (frameworkIds.includes("nist-sp-800-53-r5") && !frameworkIds.includes("nist-rmf") && this.registry.framework("nist-rmf")) frameworkIds.push("nist-rmf");
    return this.store.atomic(async () => {
      let slug = slugify(input.name) || "workspace";
      await this.store.lock(`slug:${slug}`);
      if (await this.store.workspaces.slugTaken(slug)) slug = `${slug}-${Math.random().toString(36).slice(2, 6)}`;
      const ts = now();
      const ws: Workspace = {
        id: newId("ws"),
        tenantId: input.tenantId,
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
      await this.store.lock(`ws:${ws.id}`);
      await this.store.workspaces.put(ws);
      for (const f of ws.frameworks) await this.initializeStates(ws, f.frameworkId, actor);
      await this.log(ws.id, actor, "created", "workspace", ws.id, `Workspace “${ws.name}” created with ${frameworkIds.length} framework(s)`, { rationale: rec.rationale });
      if (input.planInitialTasks) await this.planWith(ws.id, "nist-csf-2.0", 12, actor);
      return ws;
    });
  }

  async deleteWorkspace(idOrSlug: string): Promise<Workspace> {
    return this.mutate(idOrSlug, async (ws) => {
      for (const [runId, controller] of this.running) {
        const run = await this.store.runs.get(runId);
        if (run?.workspaceId === ws.id) controller.abort();
      }
      await this.store.deleteWorkspace(ws.id);
      this.store.afterCommit(() => {
        for (const key of [...this.scoreCache.keys()]) if (key.startsWith(`${ws.id}|`)) this.scoreCache.delete(key);
      });
      return ws;
    });
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
    if (frameworkId === STATE_LAWS) {
      settings.law = { applicability: {} };
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
    if (node.frameworkId === STATE_LAWS && node.kind === "obligation") {
      const lawId = String(node.attributes?.["lawId"] ?? "");
      const law = this.registry.framework(fw)?.byId.get(node.parentId ?? "");
      const chosen = settings?.law?.applicability[lawId]?.roles ?? [];
      if (!chosen.length) return { applicable: false, rationale: `Not in scope: you have not said how ${law?.code ?? "this law"} applies to your organization` };
      const roles = (node.attributes?.["roles"] as string[] | undefined) ?? [];
      if (!roles.some((r) => chosen.includes(r))) return { applicable: false, rationale: `Applies to ${roles.join(", ")}; your role under ${law?.code ?? "this law"}: ${chosen.join(", ")}` };
      const until = node.attributes?.["until"] as string | undefined;
      if (until && until < now().slice(0, 10)) return { applicable: false, rationale: `No longer in effect after ${until}` };
      return { applicable: true };
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

  /** Create missing states and re-apply scope to existing ones, preserving each person's documented exclusion. */
  async initializeStates(ws: Workspace, frameworkId: string, actor = "system"): Promise<void> {
    const index = this.registry.framework(frameworkId);
    if (!index) return;
    const rec = recommend(ws.profile);
    const settings = this.frameworkSettings(ws, frameworkId);
    const ts = now();
    const current = await this.store.states.map(ws.id, frameworkId);
    const changed: RequirementState[] = [];
    for (const node of index.assessable) {
      const existing = current.get(node.id);
      const priority = this.priorityFor(node.id, rec.categoryPriorities);
      const scope = this.scopeOf(ws, node.id);
      const baseTarget = frameworkId === "nist-csf-2.0" ? targetFor(priority, rec) : settings?.defaultTarget ?? 3;
      if (existing) {
        const effective = effectiveScope(scope, existing.userExclusion);
        const becameApplicable = effective.applicable && !existing.applicable;
        const target = becameApplicable && existing.target === 0 ? baseTarget : existing.target;
        if (effective.applicable === existing.applicable && effective.rationale === existing.applicabilityRationale && target === existing.target) continue;
        changed.push({ ...existing, applicable: effective.applicable, applicabilityRationale: effective.rationale, target });
        continue;
      }
      changed.push({
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
    await this.store.states.putMany(ws.id, changed);
  }

  async updateWorkspace(id: string, patch: Partial<Pick<Workspace, "name" | "description" | "profile" | "autonomy" | "trustCenter">>, actor = "user"): Promise<Workspace> {
    return this.mutate(id, async (ws) => {
      const next: Workspace = { ...ws, ...patch, profile: { ...ws.profile, ...(patch.profile ?? {}) }, updatedAt: now() };
      await this.store.workspaces.put(next);
      this.emit(ws.id, "workspace.updated", next);
      await this.log(ws.id, actor, "updated", "workspace", ws.id, "Workspace settings updated", { fields: Object.keys(patch) });
      return next;
    });
  }

  async enableFramework(id: string, frameworkId: string, settings: Partial<WorkspaceFramework> = {}, actor = "user"): Promise<Workspace> {
    const index = this.registry.framework(frameworkId);
    if (!index) throw new ValidationError(`Framework '${frameworkId}' is not available`);
    if (index.graph.framework.family === "threat") throw new ValidationError(`${index.graph.framework.shortName} is a threat catalog: it is viewed through your frameworks, not enabled`);
    return this.mutate(id, async (ws) => {
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
        // Law applicability is replaced as a whole, so a law can be taken out of scope.
        law: settings.law ?? base.law,
      };
      const next: Workspace = {
        ...ws,
        frameworks: existing ? ws.frameworks.map((f) => (f.frameworkId === frameworkId ? merged : f)) : [...ws.frameworks, merged],
        updatedAt: now(),
      };
      await this.store.workspaces.put(next);
      await this.initializeStates(next, frameworkId, actor);
      this.emit(ws.id, "workspace.updated", next);
      await this.log(ws.id, actor, existing ? "updated" : "enabled", "framework", frameworkId, `${existing ? "Updated" : "Enabled"} ${this.registry.framework(frameworkId)!.graph.framework.shortName}`);
      if (frameworkId === "nist-sp-800-53-r5" && merged.enabled && !this.frameworkSettings(next, "nist-rmf")?.enabled && this.registry.framework("nist-rmf")) {
        return this.enableFramework(ws.id, "nist-rmf", {}, actor);
      }
      return next;
    });
  }

  /** CSF Tier self-assessment (CSWP 29, Appendix B). Updates the workspace's maturity tier. */
  async recordTierAssessment(id: string, answers: Record<string, number>, actor = "user"): Promise<Workspace> {
    return this.mutate(id, async (ws) => {
      const assessment = assessTiers(answers);
      const next: Workspace = { ...ws, tierAssessment: assessment, profile: { ...ws.profile, maturityTier: assessment.overallTier }, updatedAt: now() };
      await this.store.workspaces.put(next);
      this.emit(ws.id, "workspace.updated", next);
      await this.log(ws.id, actor, "assessed", "tiers", ws.id, `CSF Tiers: governance Tier ${assessment.governanceTier}, management Tier ${assessment.managementTier}`);
      return next;
    });
  }

  /** RMF Categorize: FIPS 199 categorization → SP 800-53B baseline → re-scope controls. */
  async categorizeSystem(
    id: string,
    input: { systemName?: string; systemDescription?: string; informationTypes: RmfSettings["informationTypes"]; privacyBaseline?: boolean },
    actor = "user",
  ): Promise<Workspace> {
    return this.mutate(id, async (ws) => {
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
      const next = await this.enableFramework(ws.id, "nist-sp-800-53-r5", { rmf }, actor);
      await this.log(
        ws.id,
        actor,
        "categorized",
        "system",
        ws.id,
        `FIPS 199 categorization: C=${categorization.confidentiality}, I=${categorization.integrity}, A=${categorization.availability} → ${categorization.overall.toUpperCase()} baseline`,
      );
      return next;
    });
  }

  async tailorControl(id: string, nodeId: string, action: "add" | "remove" | "reset", rationale: string, actor = "user"): Promise<Workspace> {
    return this.mutate(id, async (ws) => {
      const settings = this.frameworkSettings(ws, "nist-sp-800-53-r5");
      if (!settings?.rmf) throw new ValidationError("Enable NIST RMF / SP 800-53 first");
      const node = this.registry.node(nodeId);
      if (!node || node.frameworkId !== "nist-sp-800-53-r5") throw new ValidationError(`'${nodeId}' is not an SP 800-53 control`);
      const tailoring = settings.rmf.tailoring.filter((t) => t.nodeId !== node.id);
      if (action !== "reset") tailoring.push({ nodeId: node.id, action, rationale });
      return this.enableFramework(ws.id, "nist-sp-800-53-r5", { rmf: { ...settings.rmf, tailoring } }, actor);
    });
  }

  // -------------------------------------------------------------------------
  // Overlays: community profiles and control overlays on enabled frameworks
  // -------------------------------------------------------------------------

  private overlayOrThrow(overlayId: string): FrameworkOverlay {
    const overlay = this.registry.overlay(overlayId);
    if (!overlay) throw new NotFoundError(`Overlay '${overlayId}' not found`);
    return overlay;
  }

  /**
   * Adopt an overlay. A community profile records the focus areas (lenses) the
   * workspace follows. A control overlay brings its controls into the SP 800-53
   * scope through tailoring entries marked with the overlay as their source; a
   * person's own tailoring decision on the same control always stands.
   */
  async adoptOverlay(id: string, overlayId: string, input: { lenses?: string[] }, actor = "user"): Promise<Workspace> {
    const overlay = this.overlayOrThrow(overlayId);
    return this.mutate(id, async (ws) => {
      const settings = this.frameworkSettings(ws, overlay.frameworkId);
      if (!settings?.enabled) throw new ValidationError(`Enable ${this.registry.framework(overlay.frameworkId)?.graph.framework.shortName ?? overlay.frameworkId} before adopting ${overlay.shortName}`);
      const known = new Set(overlay.lenses?.map((l) => l.id) ?? []);
      const lenses = overlay.kind === "community-profile" ? [...new Set(input.lenses?.length ? input.lenses : [...known])] : undefined;
      if (lenses?.some((l) => !known.has(l))) throw new ValidationError(`Unknown focus area — choose from ${[...known].join(", ")}`);
      const previous = settings.overlays?.find((a) => a.overlayId === overlayId);
      const adoption = { overlayId, ...(lenses ? { lenses } : {}), adoptedAt: previous?.adoptedAt ?? now(), adoptedBy: previous?.adoptedBy ?? actor };
      const overlays = [...(settings.overlays ?? []).filter((a) => a.overlayId !== overlayId), adoption];
      let added = 0;
      let next: Workspace;
      if (overlay.kind === "control-overlay" && settings.rmf) {
        const tailoring = settings.rmf.tailoring.filter((t) => t.source !== overlayId);
        const decided = new Set(tailoring.map((t) => t.nodeId));
        const probe: Workspace = { ...ws, frameworks: ws.frameworks.map((f) => (f.frameworkId === overlay.frameworkId ? { ...f, rmf: { ...settings.rmf!, tailoring } } : f)) };
        for (const e of overlay.entries) {
          if (decided.has(e.nodeId) || this.scopeOf(probe, e.nodeId).applicable) continue;
          tailoring.push({ nodeId: e.nodeId, action: "add", rationale: `Selected by the ${overlay.shortName} overlay (${overlay.status}, ${overlay.identifier})`, source: overlayId });
          added++;
        }
        next = await this.enableFramework(ws.id, overlay.frameworkId, { rmf: { ...settings.rmf, tailoring }, overlays }, actor);
      } else {
        next = await this.enableFramework(ws.id, overlay.frameworkId, { overlays }, actor);
      }
      const lensNames = lenses?.map((l) => overlay.lenses?.find((x) => x.id === l)?.short ?? l).join(", ");
      await this.log(
        ws.id,
        actor,
        previous ? "updated" : "adopted",
        "overlay",
        overlayId,
        `${previous ? "Updated" : "Adopted"} ${overlay.shortName} (${overlay.status})${lensNames ? ` — focus areas: ${lensNames}` : ""}${overlay.kind === "control-overlay" ? ` — ${added} control(s) brought into scope` : ""}`,
      );
      return next;
    });
  }

  async dropOverlay(id: string, overlayId: string, actor = "user"): Promise<Workspace> {
    const overlay = this.overlayOrThrow(overlayId);
    return this.mutate(id, async (ws) => {
      const settings = this.frameworkSettings(ws, overlay.frameworkId);
      if (!settings?.overlays?.some((a) => a.overlayId === overlayId)) throw new ValidationError(`${overlay.shortName} is not adopted`);
      const overlays = settings.overlays.filter((a) => a.overlayId !== overlayId);
      const removed = settings.rmf?.tailoring.filter((t) => t.source === overlayId).length ?? 0;
      const next = await this.enableFramework(ws.id, overlay.frameworkId, settings.rmf ? { overlays, rmf: { ...settings.rmf, tailoring: settings.rmf.tailoring.filter((t) => t.source !== overlayId) } } : { overlays }, actor);
      await this.log(ws.id, actor, "dropped", "overlay", overlayId, `Stopped following ${overlay.shortName}${removed ? ` — ${removed} control(s) it had added left the scope` : ""}`);
      return next;
    });
  }

  /**
   * Raise requirement priorities to the community profile's proposed priorities
   * for the adopted focus areas (1 → high, 2 → at least medium). Never lowers a
   * priority; one audited change.
   */
  async applyOverlayPriorities(id: string, overlayId: string, actor = "user"): Promise<{ raised: number }> {
    const overlay = this.overlayOrThrow(overlayId);
    if (overlay.kind !== "community-profile") throw new ValidationError(`${overlay.shortName} has no priorities`);
    return this.mutate(id, async (ws) => {
      const adoption = this.frameworkSettings(ws, overlay.frameworkId)?.overlays?.find((a) => a.overlayId === overlayId);
      if (!adoption) throw new ValidationError(`Adopt ${overlay.shortName} first`);
      const states = await this.store.states.map(ws.id, overlay.frameworkId);
      const ts = now();
      const changed: RequirementState[] = [];
      for (const e of overlay.entries) {
        const s = states.get(e.nodeId);
        const p = overlayPriority(e, adoption.lenses ?? []);
        if (!s || !s.applicable || p === undefined) continue;
        const wanted: Priority | undefined = p === 1 ? "high" : p === 2 ? "medium" : undefined;
        if (!wanted || maxPriority(s.priority, wanted) === s.priority) continue;
        changed.push({ ...s, priority: wanted, updatedAt: ts, updatedBy: actor });
      }
      await this.store.states.putMany(ws.id, changed);
      if (changed.length) this.emit(ws.id, "state.updated", { bulk: true, count: changed.length });
      await this.log(ws.id, actor, "prioritized", "overlay", overlayId, `${overlay.shortName}: raised the priority of ${changed.length} requirement(s) to the profile's proposed priorities`, {
        nodeIds: changed.map((c) => c.nodeId),
      });
      return { raised: changed.length };
    });
  }

  // -------------------------------------------------------------------------
  // U.S. state AI laws: applicability per law
  // -------------------------------------------------------------------------

  /** Record the roles the organization holds under one law (none = the law does not apply). Re-scopes its obligations. */
  async setLawApplicability(id: string, lawId: string, input: { roles: string[]; note?: string }, actor = "user"): Promise<Workspace> {
    const index = this.registry.framework(STATE_LAWS);
    const law = index?.graph.nodes.find((n) => n.kind === "law" && n.attributes?.["lawId"] === lawId);
    if (!index || !law) throw new NotFoundError(`Law '${lawId}' not found`);
    const known = new Set(
      index
        .childrenOf(law.id)
        .flatMap((o) => (o.attributes?.["roles"] as string[] | undefined) ?? [])
        .concat(((law.attributes?.["appliesTo"] as { role: string }[] | undefined) ?? []).map((a) => a.role.toLowerCase().replace(/\s+/g, "-"))),
    );
    const roles = [...new Set(input.roles)];
    const unknown = roles.filter((r) => !known.has(r));
    if (unknown.length) throw new ValidationError(`${law.code} does not define the role(s) ${unknown.join(", ")} — choose from ${[...known].join(", ")}`);
    return this.mutate(id, async (ws) => {
      const settings = this.frameworkSettings(ws, STATE_LAWS);
      if (!settings?.enabled) throw new ValidationError("Enable U.S. state AI laws for this workspace first");
      const applicability = { ...(settings.law?.applicability ?? {}) };
      if (roles.length) applicability[lawId] = { roles, note: input.note?.trim() || undefined, decidedAt: now(), decidedBy: actor };
      else delete applicability[lawId];
      const result = await this.enableFramework(ws.id, STATE_LAWS, { law: { applicability } }, actor);
      await this.log(ws.id, actor, "scoped", "law", lawId, roles.length ? `${law.code} applies to us as ${roles.join(", ")}${input.note ? ` — ${input.note.trim()}` : ""}` : `${law.code} marked as not applying to us`);
      return result;
    });
  }

  // -------------------------------------------------------------------------
  // AI governance (NIST AI RMF): the AI system inventory
  // -------------------------------------------------------------------------

  private aiSettings(ws: Workspace): AiRmfSettings {
    const settings = this.frameworkSettings(ws, "nist-ai-rmf");
    if (!settings?.enabled) throw new ValidationError("Enable the NIST AI RMF for this workspace first");
    return settings.ai ?? { systems: [] };
  }

  async upsertAiSystem(id: string, input: Partial<Omit<AiSystem, "createdAt" | "updatedAt">> & { id?: string }, actor = "user"): Promise<AiSystem> {
    return this.mutate(id, async (ws) => {
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
      await this.enableFramework(ws.id, "nist-ai-rmf", { ai: { ...ai, systems } }, actor);
      await this.log(
        ws.id,
        actor,
        existing ? "updated" : "created",
        "ai-system",
        system.id,
        `AI system ${existing ? "updated" : "added to the inventory"}: ${system.name} (${system.riskTier} risk${system.generative ? ", generative" : ""})`,
      );
      return system;
    });
  }

  async removeAiSystem(id: string, systemId: string, actor = "user"): Promise<void> {
    await this.mutate(id, async (ws) => {
      const ai = this.aiSettings(ws);
      const system = ai.systems.find((s) => s.id === systemId);
      if (!system) throw new NotFoundError(`AI system '${systemId}' not found`);
      await this.enableFramework(ws.id, "nist-ai-rmf", { ai: { ...ai, systems: ai.systems.filter((s) => s.id !== systemId) } }, actor);
      await this.log(ws.id, actor, "deleted", "ai-system", systemId, `AI system removed from the inventory: ${system.name}`);
    });
  }

  async setAuthorization(id: string, input: NonNullable<RmfSettings["authorization"]>, actor = "user"): Promise<Workspace> {
    return this.mutate(id, async (ws) => {
      const settings = this.frameworkSettings(ws, "nist-sp-800-53-r5");
      if (!settings?.rmf) throw new ValidationError("Enable NIST RMF / SP 800-53 first");
      const next = await this.enableFramework(ws.id, "nist-sp-800-53-r5", { rmf: { ...settings.rmf, authorization: { ...input, decidedAt: input.decidedAt ?? now() } } }, actor);
      await this.log(ws.id, actor, "authorized", "system", ws.id, `Authorization decision: ${input.decision.toUpperCase()}${input.authorizingOfficial ? ` by ${input.authorizingOfficial}` : ""}`);
      return next;
    });
  }

  // -------------------------------------------------------------------------
  // Assessment
  // -------------------------------------------------------------------------

  async score(workspaceId: string, frameworkId: string): Promise<FrameworkScore> {
    const index = this.registry.framework(frameworkId);
    if (!index) throw new NotFoundError(`Framework '${frameworkId}' not found`);
    const rev = await this.store.workspaces.rev(workspaceId);
    const key = `${workspaceId}|${frameworkId}`;
    const cached = this.scoreCache.get(key);
    if (cached && cached.rev === rev) return cached.score;
    const [states, evidence, tasks, checks] = await Promise.all([
      this.store.states.list(workspaceId, frameworkId),
      this.store.evidence.list(workspaceId),
      this.store.tasks.list(workspaceId),
      this.store.checks.list(workspaceId),
    ]);
    const score = scoreFramework(index, buildSnapshot({ states, evidence, tasks, checks }));
    // Only committed revisions are cached: a transaction's own revision may still roll back.
    if (!this.store.inTransaction) this.scoreCache.set(key, { rev, score });
    return score;
  }

  async updateState(
    workspaceId: string,
    nodeId: string,
    patch: Partial<Pick<RequirementState, "current" | "target" | "priority" | "applicable" | "applicabilityRationale" | "owner" | "notes" | "statusOverride" | "verifiedAt">>,
    actor = "user",
  ): Promise<RequirementState> {
    const node = this.registry.node(nodeId);
    if (!node || !node.assessable) throw new ValidationError(`'${nodeId}' is not an assessable requirement`);
    return this.mutate(workspaceId, async (ws) => {
      const prev =
        (await this.store.states.get(ws.id, node.id)) ??
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
      await this.store.states.put(ws.id, next);
      this.emit(ws.id, "state.updated", next);
      const changes = Object.entries(patch)
        .filter(([k, v]) => (prev as unknown as Record<string, unknown>)[k] !== v)
        .map(([k, v]) => `${k}: ${String((prev as unknown as Record<string, unknown>)[k] ?? "—")} → ${String(v)}`);
      await this.log(ws.id, actor, "assessed", "requirement", node.id, `${node.code} ${changes.join(", ") || "updated"}`, { patch });
      return next;
    });
  }

  // -------------------------------------------------------------------------
  // Tasks
  // -------------------------------------------------------------------------

  async createTask(workspaceId: string, input: Partial<Task> & Pick<Task, "title">, actor = "user"): Promise<Task> {
    return this.mutate(workspaceId, async (ws) => {
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
        checklist: (input.checklist ?? []).map((c) => ({ id: c.id || newId("chk"), text: c.text, done: !!c.done })),
        dependsOn: input.dependsOn ?? [],
        automation: input.automation,
        source: input.source,
        targetLevel: input.targetLevel,
        origin: input.origin ?? "user",
        createdAt: ts,
        updatedAt: ts,
      };
      await this.store.tasks.put(task);
      this.emit(ws.id, "task.created", task);
      await this.log(ws.id, actor, "created", "task", task.id, `Task “${task.title}” created`);
      return task;
    });
  }

  async updateTask(
    workspaceId: string,
    taskId: string,
    patch: Partial<Task>,
    actor = "user",
  ): Promise<{ task: Task; suggestedLevels: { nodeId: string; code: string; from: number; to: number }[] }> {
    return this.mutate(workspaceId, async (ws) => {
      const prev = await this.store.tasks.get(taskId);
      if (!prev || prev.workspaceId !== ws.id) throw new NotFoundError(`Task '${taskId}' not found`);
      const next: Task = { ...prev, ...patch, id: prev.id, workspaceId: prev.workspaceId, updatedAt: now() };
      if (patch.status === "done" && prev.status !== "done") next.completedAt = now();
      if (patch.status && patch.status !== "done") delete next.completedAt;
      await this.store.tasks.put(next);
      this.emit(ws.id, "task.updated", next);
      await this.log(ws.id, actor, "updated", "task", next.id, `Task “${next.title}”${patch.status && patch.status !== prev.status ? ` → ${patch.status}` : " updated"}`);
      const suggestedLevels: { nodeId: string; code: string; from: number; to: number }[] = [];
      if (patch.status === "done" && prev.status !== "done") {
        const states = await this.store.states.getMany(ws.id, next.requirementIds);
        for (const nodeId of next.requirementIds) {
          const s = states.get(nodeId);
          if (!s || !s.applicable) continue;
          const to = Math.min(next.targetLevel ?? s.target, s.target, s.current + 1);
          if (to > s.current) suggestedLevels.push({ nodeId, code: codeOf(nodeId), from: s.current, to });
        }
      }
      return { task: next, suggestedLevels };
    });
  }

  async deleteTask(workspaceId: string, taskId: string, actor = "user"): Promise<void> {
    await this.mutate(workspaceId, async (ws) => {
      const task = await this.store.tasks.get(taskId);
      if (!task || task.workspaceId !== ws.id) throw new NotFoundError(`Task '${taskId}' not found`);
      await this.store.tasks.delete(taskId);
      this.emit(ws.id, "task.deleted", { id: taskId });
      await this.log(ws.id, actor, "deleted", "task", taskId, `Task “${task.title}” deleted`);
    });
  }

  async planWith(workspaceId: string, frameworkId: string, maxTasks: number, actor = "system"): Promise<Task[]> {
    const index = this.registry.framework(frameworkId);
    if (!index) return [];
    return this.mutate(workspaceId, async (ws) => {
      const states = await this.store.states.map(ws.id, frameworkId);
      const open = new Set((await this.store.tasks.list(ws.id)).filter((t) => t.status !== "done").flatMap((t) => t.requirementIds));
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
      for (const p of planned) {
        const task: Task = { ...p, createdAt: ts, updatedAt: ts };
        await this.store.tasks.put(task);
        created.push(task);
      }
      for (const t of created) this.emit(ws.id, "task.created", t);
      if (created.length) await this.log(ws.id, actor, "planned", "task", frameworkId, `${created.length} task(s) planned from official implementation guidance`);
      return created;
    });
  }

  // -------------------------------------------------------------------------
  // Evidence
  // -------------------------------------------------------------------------

  async createEvidence(workspaceId: string, input: Partial<Evidence> & Pick<Evidence, "title">, actor = "user"): Promise<Evidence> {
    return this.mutate(workspaceId, async (ws) => {
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
      await this.store.evidence.put(evidence);
      this.emit(ws.id, "evidence.created", evidence);
      await this.log(ws.id, actor, "collected", "evidence", evidence.id, `Evidence “${evidence.title}” added for ${requirementIds.map(codeOf).join(", ") || "no requirement"}`);
      return evidence;
    });
  }

  async reviewEvidence(workspaceId: string, evidenceId: string, decision: "accepted" | "rejected", actor = "user", note?: string): Promise<Evidence> {
    return this.mutate(workspaceId, async (ws) => {
      const prev = await this.store.evidence.get(evidenceId);
      if (!prev || prev.workspaceId !== ws.id) throw new NotFoundError(`Evidence '${evidenceId}' not found`);
      const next: Evidence = {
        ...prev,
        status: decision,
        reviewedBy: actor,
        reviewedAt: now(),
        description: note ? `${prev.description ?? ""}\n\nReview note: ${note}`.trim() : prev.description,
      };
      await this.store.evidence.put(next);
      this.emit(ws.id, "evidence.updated", next);
      await this.log(ws.id, actor, decision, "evidence", next.id, `Evidence “${next.title}” ${decision}`);
      return next;
    });
  }

  async updateEvidence(workspaceId: string, evidenceId: string, patch: Partial<Evidence>, actor = "user"): Promise<Evidence> {
    return this.mutate(workspaceId, async (ws) => {
      const prev = await this.store.evidence.get(evidenceId);
      if (!prev || prev.workspaceId !== ws.id) throw new NotFoundError(`Evidence '${evidenceId}' not found`);
      const next: Evidence = { ...prev, ...patch, id: prev.id, workspaceId: ws.id };
      await this.store.evidence.put(next);
      this.emit(ws.id, "evidence.updated", next);
      await this.log(ws.id, actor, "updated", "evidence", next.id, `Evidence “${next.title}” updated`);
      return next;
    });
  }

  // -------------------------------------------------------------------------
  // Policies
  // -------------------------------------------------------------------------

  async createPolicy(workspaceId: string, input: Partial<Policy> & Pick<Policy, "title" | "body">, actor = "user"): Promise<Policy> {
    return this.mutate(workspaceId, async (ws) => {
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
      await this.store.policies.put(policy);
      this.emit(ws.id, "policy.created", policy);
      await this.log(ws.id, actor, "created", "policy", policy.id, `Policy “${policy.title}” created (${policy.status})`);
      return policy;
    });
  }

  async updatePolicy(
    workspaceId: string,
    policyId: string,
    patch: Partial<Pick<Policy, "title" | "body" | "status" | "owner" | "requirementIds" | "reviewCadenceDays">>,
    actor = "user",
  ): Promise<Policy> {
    return this.mutate(workspaceId, async (ws) => {
      const prev = await this.store.policies.get(policyId);
      if (!prev || prev.workspaceId !== ws.id) throw new NotFoundError(`Policy '${policyId}' not found`);
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
      await this.store.policies.put(next);
      this.emit(ws.id, "policy.updated", next);
      await this.log(ws.id, actor, patch.status ?? "updated", "policy", next.id, `Policy “${next.title}” v${next.version} ${patch.status ?? "updated"}`);
      if (patch.status === "approved" || patch.status === "published") {
        // An approved policy is evidence for the requirements it governs.
        const exists = (await this.store.evidence.list(ws.id)).some((e) => e.kind === "policy" && e.data?.["policyId"] === next.id && e.data?.["version"] === next.version);
        if (!exists && next.requirementIds.length) {
          await this.createEvidence(
            ws.id,
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
    });
  }

  // -------------------------------------------------------------------------
  // Risks
  // -------------------------------------------------------------------------

  async upsertRisk(workspaceId: string, input: Partial<Risk> & Pick<Risk, "title">, actor = "user"): Promise<Risk> {
    return this.mutate(workspaceId, async (ws) => {
      const prev = input.id ? await this.store.risks.get(input.id) : undefined;
      if (input.id && prev && prev.workspaceId !== ws.id) throw new NotFoundError(`Risk '${input.id}' not found`);
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
      await this.store.risks.put(risk);
      this.emit(ws.id, "risk.updated", risk);
      await this.log(ws.id, actor, prev ? "updated" : "created", "risk", risk.id, `Risk “${risk.title}” ${prev ? "updated" : "registered"}`);
      return risk;
    });
  }

  // -------------------------------------------------------------------------
  // Connectors & monitoring
  // -------------------------------------------------------------------------

  async createConnector(workspaceId: string, input: { kind: string; name?: string; config: Record<string, unknown> }, actor = "user"): Promise<Connector> {
    const kind = connectorKind(input.kind);
    if (!kind) throw new ValidationError(`Unknown connector kind '${input.kind}'`);
    for (const field of kind.configFields) {
      if (field.required && !String(input.config[field.key] ?? "").trim()) throw new ValidationError(`${field.label} is required`);
    }
    return this.mutate(workspaceId, async (ws) => {
      const connector: Connector = {
        id: newId("con"),
        workspaceId: ws.id,
        kind: kind.kind,
        name: input.name?.trim() || kind.name,
        config: input.config,
        status: "active",
        createdAt: now(),
      };
      await this.store.connectors.put(connector);
      await this.log(ws.id, actor, "connected", "connector", connector.id, `Connector “${connector.name}” added`);
      return connector;
    });
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
    const ws = await this.workspace(workspaceId);
    const connector = await this.store.connectors.get(connectorId);
    if (!connector || connector.workspaceId !== ws.id) throw new NotFoundError(`Connector '${connectorId}' not found`);
    const kind = connectorKind(connector.kind);
    if (!kind) throw new ValidationError(`Unknown connector kind '${connector.kind}'`);
    // The external call happens outside any transaction.
    let outputs;
    try {
      outputs = await kind.run(connector.config);
    } catch (err) {
      await this.store.connectors.update(connector.id, (c) => ({ ...c, status: "error", lastRunAt: now() }));
      throw err;
    }
    return this.mutate(ws.id, async (ws) => {
      await this.store.connectors.update(connector.id, (c) => ({ ...c, status: "active", lastRunAt: now() }));
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
      for (const r of results) await this.store.checks.put(r, observedAt);
      // Passing checks are machine-verified evidence, valid for 30 days.
      for (const r of results.filter((x) => x.outcome === "pass" && x.requirementIds.length)) {
        const ev = await this.createEvidence(
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
        await this.store.checks.put(r, observedAt);
      }
      this.emit(ws.id, "check.completed", { connectorId: connector.id, results });
      const passed = results.filter((r) => r.outcome === "pass").length;
      await this.log(ws.id, actor, "ran", "connector", connector.id, `${connector.name}: ${passed}/${results.length} checks passing`);
      return results;
    });
  }

  // -------------------------------------------------------------------------
  // Agents & proposals
  // -------------------------------------------------------------------------

  async startRun(workspaceId: string, input: { agent: AgentKind; goal: string; input?: Record<string, unknown> }, actor = "user"): Promise<AgentRun> {
    return this.mutate(workspaceId, async (ws) => {
      const principal = principalContext.getStore();
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
        ...(principal ? { startedBy: principal.id } : {}),
        createdAt: now(),
      };
      await this.store.runs.put(run, run.createdAt);
      this.emit(ws.id, "agent.run.created", run);
      await this.log(ws.id, actor, "started", "agent-run", run.id, `${input.agent} started: ${run.goal.slice(0, 120)}`);
      // Launch only once the run is committed, detached from the request.
      this.store.afterCommit(() => this.launch(run.id));
      return run;
    });
  }

  private launch(runId: string): void {
    const controller = new AbortController();
    this.running.set(runId, controller);
    principalContext.exit(() =>
      txContext.exit(() => {
        void this.executeRun(runId, controller.signal)
          .catch((err: unknown) => console.error(`[visua] agent run ${runId} crashed`, err))
          .finally(() => this.running.delete(runId));
      }),
    );
  }

  /** Resolves when the run finishes (used by tests and synchronous API callers). */
  async waitForRun(runId: string, timeoutMs = 120_000): Promise<AgentRun> {
    const started = Date.now();
    for (;;) {
      const run = await this.store.runs.get(runId);
      if (!run) throw new NotFoundError(`Run '${runId}' not found`);
      if (["completed", "failed", "cancelled", "awaiting-approval"].includes(run.status)) return run;
      if (Date.now() - started > timeoutMs) throw new Error("Timed out waiting for agent run");
      await new Promise((r) => setTimeout(r, 25));
    }
  }

  async cancelRun(workspaceId: string, runId: string, actor = "user"): Promise<AgentRun> {
    return this.mutate(workspaceId, async (ws) => {
      const run = await this.store.runs.get(runId);
      if (!run || run.workspaceId !== ws.id) throw new NotFoundError(`Run '${runId}' not found`);
      const next = (await this.store.runs.update(runId, (r) => ({ ...r, status: "cancelled", finishedAt: now() })))!;
      this.store.afterCommit(() => this.running.get(runId)?.abort());
      this.emit(ws.id, "agent.run.updated", { ...next, steps: undefined });
      await this.log(ws.id, actor, "cancelled", "agent-run", runId, `${run.agent} run cancelled`);
      return next;
    });
  }

  private async executeRun(runId: string, signal: AbortSignal): Promise<void> {
    const initial = await this.store.runs.get(runId);
    if (!initial) return;
    const workspaceId = initial.workspaceId;
    const recorder = new RunRecorder(this, workspaceId, initial);
    const save = async (patch: Partial<AgentRun>) => {
      await recorder.flush();
      // A cancellation wins over anything the run reports afterwards.
      const run = await this.store.runs.update(runId, (r) => (r.status === "cancelled" ? undefined : { ...r, ...patch }));
      if (run && run.status !== "cancelled") this.emit(workspaceId, "agent.run.updated", { ...run, steps: undefined });
      return run;
    };
    await save({ status: "running", startedAt: now() });
    try {
      const host = await this.hostFor(workspaceId, runId, signal, recorder);
      const result = await executeAgent(host, { agent: initial.agent, goal: initial.goal, input: initial.input });
      if (signal.aborted) return;
      const pending = (await this.store.proposals.list(workspaceId)).filter((p) => p.runId === runId && p.status === "pending").length;
      await save({
        status: pending ? "awaiting-approval" : "completed",
        summary: result.summary,
        mode: result.mode,
        model: result.model,
        usage: result.usage,
        finishedAt: now(),
      });
      await this.log(workspaceId, `agent:${initial.agent}`, "finished", "agent-run", runId, `${initial.agent} finished${pending ? ` — ${pending} proposal(s) await approval` : ""}`);
    } catch (err) {
      if (signal.aborted) return;
      const message = err instanceof Error ? err.message : String(err);
      recorder.step({ type: "error", title: "Run failed", detail: message });
      await save({ status: "failed", error: message, finishedAt: now() });
      await this.log(workspaceId, `agent:${initial.agent}`, "failed", "agent-run", runId, `${initial.agent} failed: ${message.slice(0, 160)}`);
    } finally {
      await recorder.flush();
    }
  }

  private async agentSnapshot(workspaceId: string): Promise<AgentSnapshot> {
    const [workspace, states, tasks, evidence, policies, connectors, checks] = await Promise.all([
      this.workspace(workspaceId),
      this.store.states.list(workspaceId),
      this.store.tasks.list(workspaceId),
      this.store.evidence.list(workspaceId),
      this.store.policies.list(workspaceId),
      this.store.connectors.list(workspaceId),
      this.store.checks.list(workspaceId),
    ]);
    const scores = new Map<string, FrameworkScore>();
    return {
      workspace,
      states,
      byNode: new Map(states.map((s) => [s.nodeId, s])),
      tasks,
      evidence,
      policies,
      connectors,
      score: (frameworkId: string) => {
        let score = scores.get(frameworkId);
        if (!score) {
          const index = this.registry.framework(frameworkId);
          if (!index) throw new NotFoundError(`Framework '${frameworkId}' not found`);
          score = scoreFramework(index, buildSnapshot({ states: states.filter((s) => frameworkOf(s.nodeId) === frameworkId), evidence, tasks, checks }));
          scores.set(frameworkId, score);
        }
        return score;
      },
    };
  }

  /**
   * The agent's view of the platform. Reads come from a snapshot taken when
   * the run starts and refreshed after every change the agent's own actions
   * apply (auto-approved proposals, connector runs); writes are proposals.
   */
  private async hostFor(workspaceId: string, runId: string, signal: AbortSignal, recorder: RunRecorder): Promise<AgentHost> {
    let snap = await this.agentSnapshot(workspaceId);
    const refresh = async () => {
      snap = await this.agentSnapshot(workspaceId);
    };
    return {
      registry: this.registry,
      runId,
      signal,
      workspace: () => snap.workspace,
      states: (frameworkId?: string) => (frameworkId ? snap.states.filter((s) => frameworkOf(s.nodeId) === frameworkId) : snap.states),
      state: (nodeId: string) => snap.byNode.get(nodeId),
      score: (frameworkId: string) => snap.score(frameworkId),
      tasks: () => snap.tasks,
      evidence: () => snap.evidence,
      policies: () => snap.policies,
      connectors: () => snap.connectors,
      runConnector: async (connectorId: string) => {
        const results = await this.runConnector(workspaceId, connectorId, `agent:${runId}`);
        await refresh();
        return results;
      },
      propose: async (input: ProposalInput) => {
        const proposal = await this.createProposal(workspaceId, runId, input, recorder);
        if (proposal.status !== "pending") await refresh();
        return proposal;
      },
      step: (step: Omit<AgentStep, "id" | "at">) => recorder.step(step),
    };
  }

  async createProposal(workspaceId: string, runId: string, input: ProposalInput, recorder?: RunRecorder): Promise<Proposal> {
    return this.mutate(workspaceId, async (ws) => {
      const proposal: Proposal = {
        id: newId("prop"),
        runId,
        workspaceId: ws.id,
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
      await this.store.proposals.put(proposal, proposal.createdAt);
      recorder?.step({ type: "proposal", title: proposal.title, detail: proposal.rationale, data: { proposalId: proposal.id, type: proposal.type }, nodeIds: proposal.nodeIds, citations: proposal.citations });
      this.emit(ws.id, "proposal.created", proposal);
      if (ws.autonomy[proposal.type]) return this.decideProposal(ws.id, proposal.id, "approved", "autonomy");
      return proposal;
    });
  }

  async decideProposal(workspaceId: string, proposalId: string, decision: "approved" | "rejected", actor = "user", edits?: Record<string, unknown>): Promise<Proposal> {
    return this.mutate(workspaceId, async (ws) => {
      const prev = await this.store.proposals.get(proposalId);
      if (!prev || prev.workspaceId !== ws.id) throw new NotFoundError(`Proposal '${proposalId}' not found`);
      if (prev.status !== "pending") throw new ValidationError(`Proposal already ${prev.status}`);
      let next: Proposal = { ...prev, payload: { ...prev.payload, ...(edits ?? {}) }, status: decision, decidedBy: actor, decidedAt: now() };
      if (decision === "approved") {
        try {
          // A savepoint: a change that fails half-way leaves nothing behind.
          await this.store.transaction(() => this.applyProposal(next, actor));
          next = { ...next, status: "applied" };
        } catch (err) {
          next = { ...next, status: "failed", rationale: `${next.rationale}\n\nApply failed: ${(err as Error).message}` };
        }
      }
      await this.store.proposals.put(next);
      this.emit(ws.id, "proposal.updated", next);
      await this.log(ws.id, actor, next.status, "proposal", next.id, `${next.status === "applied" ? "Approved" : next.status === "rejected" ? "Rejected" : "Failed"}: ${next.title}`);
      await this.refreshRunStatus(ws.id, next.runId);
      return next;
    });
  }

  private async refreshRunStatus(workspaceId: string, runId: string): Promise<void> {
    const pending = (await this.store.proposals.list(workspaceId)).some((p) => p.runId === runId && p.status === "pending");
    if (pending) return;
    const next = await this.store.runs.update(runId, (run) => (run.status === "awaiting-approval" ? { ...run, status: "completed" } : undefined));
    if (next?.status === "completed") this.emit(workspaceId, "agent.run.updated", { ...next, steps: undefined });
  }

  private async applyProposal(p: Proposal, actor: string): Promise<void> {
    const by = `${actor} (via ${p.runId})`;
    const payload = p.payload;
    switch (p.type) {
      case "set-level":
        await this.updateState(p.workspaceId, String(payload["nodeId"]), { current: Number(payload["current"]) }, by);
        return;
      case "set-target":
        await this.updateState(p.workspaceId, String(payload["nodeId"]), { target: Number(payload["target"]) }, by);
        return;
      case "set-applicability":
        await this.updateState(p.workspaceId, String(payload["nodeId"]), { applicable: Boolean(payload["applicable"]), applicabilityRationale: String(payload["rationale"] ?? "") }, by);
        return;
      case "create-task": {
        const checklist = Array.isArray(payload["checklist"]) ? (payload["checklist"] as string[]).map((text) => ({ id: newId("chk"), text, done: false })) : [];
        await this.createTask(
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
        const task = await this.store.tasks.get(String(payload["taskId"]));
        if (!task || task.workspaceId !== p.workspaceId) throw new NotFoundError("Task no longer exists");
        const done = new Set((payload["completeChecklistItems"] as string[] | undefined) ?? []);
        const patch: Partial<Task> = { checklist: task.checklist.map((c) => (done.has(c.id) ? { ...c, done: true } : c)) };
        if (payload["status"]) patch.status = payload["status"] as Task["status"];
        if (payload["note"]) patch.description = `${task.description}\n\n— ${new Date().toISOString().slice(0, 10)}: ${String(payload["note"])}`.trim();
        await this.updateTask(p.workspaceId, task.id, patch, by);
        return;
      }
      case "create-evidence":
        await this.createEvidence(
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
        await this.reviewEvidence(p.workspaceId, String(payload["evidenceId"]), payload["decision"] === "rejected" ? "rejected" : "accepted", by);
        return;
      case "create-policy":
        await this.createPolicy(
          p.workspaceId,
          { title: String(payload["title"]), body: String(payload["body"]), requirementIds: payload["requirementIds"] as string[], status: "in-review", origin: "agent", agentRunId: p.runId },
          by,
        );
        return;
      case "create-risk": {
        // Agents register new risks; an id in the payload must not overwrite another record.
        const { id: _id, workspaceId: _ws, ...risk } = payload as unknown as Risk;
        void _id;
        void _ws;
        await this.upsertRisk(p.workspaceId, risk, by);
        return;
      }
      case "set-rmf": {
        const ws = await this.workspace(p.workspaceId);
        const settings = this.frameworkSettings(ws, "nist-sp-800-53-r5");
        await this.enableFramework(p.workspaceId, "nist-sp-800-53-r5", { rmf: { ...settings!.rmf!, ...(payload as Partial<RmfSettings>) } }, by);
        return;
      }
    }
  }
}
