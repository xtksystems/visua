/**
 * Visua HTTP API (Hono). JSON everywhere, SSE for live events, strict input
 * validation with Zod, and a local file route that serves the official
 * corpus so every citation opens the source PDF at the right page.
 */
import { createHash } from "node:crypto";
import { createReadStream, existsSync, statSync } from "node:fs";
import { extname, isAbsolute, relative, resolve, sep } from "node:path";
import { Readable } from "node:stream";
import { Hono, type Context } from "hono";
import { streamSSE } from "hono/streaming";
import { z } from "zod";
import {
  EXAMPLE_INFORMATION_TYPES,
  LEVEL_SCALES,
  PROFILE_DATA_TYPES,
  PROFILE_DRIVERS,
  PROFILE_ENVIRONMENTS,
  PROFILE_INDUSTRIES,
  PROFILE_SIZES,
  TIER_DIMENSIONS,
  TIER_NAMES,
  TIER_SOURCE,
  ROLE_CAPABILITIES,
  recommend,
  type AgentKind,
  type Workspace,
} from "@visua/core";
import { AGENTS, claudeEnabled, configuredModel } from "@visua/agents";
import { CORPUS_DIR } from "@visua/frameworks";
import { loadAuthConfig } from "./auth/config.ts";
import { actorOf, authenticate, authRoutes, csrfProtection, need, principalOf, requireCapability, requireSignIn, securityHeaders, workspaceAccess, type AppEnv } from "./auth/http.ts";
import { AuthService, ForbiddenError, UnauthorizedError } from "./auth/service.ts";
import { CONNECTOR_KINDS } from "./connectors/index.ts";
import { actionPlanCsv, aiRmfProfileCsv, csfProfileCsv, evidenceIndexCsv, oscalPoam, oscalSsp, readinessMarkdown, soc2PbcCsv } from "./services/exports.ts";
import { aiOverview } from "./services/ai.ts";
import { lawsOverview } from "./services/laws.ts";
import { parseMinStatus, threatCatalogState, threatRing, threatsOverview } from "./services/threats.ts";
import { overlayMeta, overlaySummary } from "./services/overlays.ts";
import { crosswalkOverview, crosswalkRows } from "./services/crosswalk.ts";
import { soc2Description } from "./services/soc2.ts";
import { frameworkState, leanGraph, nodeDetail, workspaceSummary } from "./services/views.ts";
import { NotFoundError, ValidationError, type VisuaService } from "./services/visua.ts";

const Level = z.number().int().min(0).max(4);
const Priority = z.enum(["critical", "high", "medium", "low"]);
const ImpactLevel = z.enum(["low", "moderate", "high"]);
const AgentKindSchema = z.enum(["copilot", "assessor", "planner", "policy-author", "evidence-collector", "crosswalk-analyst", "auditor-prep", "task-executor"]);
const TaskStatus = z.enum(["backlog", "todo", "in-progress", "in-review", "done", "blocked"]);
const TaskKind = z.enum(["governance", "policy", "procedure", "technical", "evidence", "training", "assessment", "vendor", "monitoring"]);

const ProfileSchema = z.object({
  industry: z.enum(PROFILE_INDUSTRIES),
  size: z.enum(PROFILE_SIZES),
  dataTypes: z.array(z.enum(PROFILE_DATA_TYPES)).default([]),
  drivers: z.array(z.enum(PROFILE_DRIVERS)).default([]),
  environments: z.array(z.enum(PROFILE_ENVIRONMENTS)).default(["cloud"]),
  maturityTier: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]).default(1),
  guidance: z.enum(["guided", "expert"]).default("guided"),
  securityTeamSize: z.number().int().min(0).max(10_000).default(1),
});

const AiSystemSchema = z.object({
  name: z.string().min(1).max(160),
  purpose: z.string().min(1).max(2000),
  role: z.enum(["developer", "deployer", "developer-deployer"]).optional(),
  lifecycle: z.enum(["plan-design", "collect-process-data", "build-use-model", "verify-validate", "deploy-use", "operate-monitor", "retired"]).optional(),
  generative: z.boolean().optional(),
  provider: z.string().max(200).optional(),
  riskTier: z.enum(["low", "moderate", "high"]).optional(),
  owner: z.string().max(120).optional(),
  dataTypes: z.array(z.enum(PROFILE_DATA_TYPES)).optional(),
  humanOversight: z.string().max(2000).optional(),
});

const InfoTypeSchema = z.object({ id: z.string().min(1), name: z.string().min(1), confidentiality: ImpactLevel, integrity: ImpactLevel, availability: ImpactLevel });

const Schemas = {
  createWorkspace: z.object({
    name: z.string().min(1).max(120),
    description: z.string().max(2000).optional(),
    profile: ProfileSchema,
    frameworks: z.array(z.string()).optional(),
    soc2: z
      .object({
        categories: z.array(z.enum(["security", "availability", "processing-integrity", "confidentiality", "privacy"])).optional(),
        reportType: z.enum(["type1", "type2"]).optional(),
        observationStart: z.string().optional(),
        observationEnd: z.string().optional(),
        auditFirm: z.string().optional(),
      })
      .optional(),
    planInitialTasks: z.boolean().optional(),
  }),
  updateWorkspace: z.object({
    name: z.string().min(1).max(120).optional(),
    description: z.string().max(2000).optional(),
    profile: ProfileSchema.partial().optional(),
    autonomy: z.record(z.string(), z.boolean()).optional(),
    trustCenter: z.object({ enabled: z.boolean(), headline: z.string().max(200).optional(), contactEmail: z.string().max(200).optional() }).optional(),
  }),
  enableFramework: z.object({
    enabled: z.boolean().optional(),
    defaultTarget: Level.optional(),
    soc2: z
      .object({
        categories: z.array(z.enum(["security", "availability", "processing-integrity", "confidentiality", "privacy"])),
        reportType: z.enum(["type1", "type2"]),
        observationStart: z.string().optional(),
        observationEnd: z.string().optional(),
        auditFirm: z.string().optional(),
      })
      .partial()
      .optional(),
  }),
  updateState: z.object({
    current: Level.optional(),
    target: Level.optional(),
    priority: Priority.optional(),
    applicable: z.boolean().optional(),
    applicabilityRationale: z.string().max(2000).optional(),
    owner: z.string().max(200).optional(),
    notes: z.string().max(10_000).optional(),
    verifiedAt: z.string().nullable().optional(),
    statusOverride: z.enum(["not-started", "in-progress", "implemented", "verified", "at-risk", "not-applicable"]).nullable().optional(),
  }),
  createTask: z.object({
    title: z.string().min(1).max(200),
    description: z.string().max(20_000).optional(),
    kind: TaskKind.optional(),
    status: TaskStatus.optional(),
    priority: Priority.optional(),
    requirementIds: z.array(z.string()).optional(),
    dueDate: z.string().optional(),
    startDate: z.string().optional(),
    effortHours: z.number().min(0).max(10_000).optional(),
    checklist: z.array(z.object({ text: z.string().min(1), done: z.boolean().optional() })).optional(),
    assignee: z.object({ type: z.enum(["person", "agent"]), id: z.string(), name: z.string() }).optional(),
  }),
  updateTask: z.object({
    title: z.string().min(1).max(200).optional(),
    description: z.string().max(20_000).optional(),
    kind: TaskKind.optional(),
    status: TaskStatus.optional(),
    priority: Priority.optional(),
    requirementIds: z.array(z.string()).optional(),
    dueDate: z.string().nullable().optional(),
    startDate: z.string().nullable().optional(),
    effortHours: z.number().min(0).max(10_000).optional(),
    checklist: z.array(z.object({ id: z.string(), text: z.string(), done: z.boolean() })).optional(),
    assignee: z.object({ type: z.enum(["person", "agent"]), id: z.string(), name: z.string() }).nullable().optional(),
  }),
  createEvidence: z.object({
    title: z.string().min(1).max(300),
    description: z.string().max(10_000).optional(),
    kind: z.enum(["document", "screenshot", "configuration", "log", "attestation", "automated-check", "policy", "report"]).optional(),
    requirementIds: z.array(z.string()).min(1),
    content: z.string().max(2_000_000).optional(),
    fileName: z.string().max(300).optional(),
    validUntil: z.string().optional(),
  }),
  updateEvidence: z.object({
    decision: z.enum(["accepted", "rejected"]).optional(),
    note: z.string().max(2000).optional(),
    title: z.string().max(300).optional(),
    requirementIds: z.array(z.string()).optional(),
    validUntil: z.string().optional(),
  }),
  createPolicy: z.object({ title: z.string().min(1).max(200), body: z.string().min(1).max(500_000), requirementIds: z.array(z.string()).optional(), owner: z.string().optional() }),
  updatePolicy: z.object({
    title: z.string().min(1).max(200).optional(),
    body: z.string().max(500_000).optional(),
    status: z.enum(["draft", "in-review", "approved", "published", "retired"]).optional(),
    owner: z.string().optional(),
    requirementIds: z.array(z.string()).optional(),
  }),
  risk: z.object({
    id: z.string().optional(),
    title: z.string().min(1).max(200),
    description: z.string().max(10_000).optional(),
    likelihood: z.number().int().min(1).max(5).optional(),
    impact: z.number().int().min(1).max(5).optional(),
    treatment: z.enum(["mitigate", "accept", "transfer", "avoid"]).optional(),
    status: z.enum(["open", "treating", "accepted", "closed"]).optional(),
    requirementIds: z.array(z.string()).optional(),
    owner: z.string().optional(),
  }),
  connector: z.object({ kind: z.string(), name: z.string().max(120).optional(), config: z.record(z.string(), z.unknown()) }),
  run: z.object({ agent: AgentKindSchema, goal: z.string().max(4000).default(""), input: z.record(z.string(), z.unknown()).optional() }),
  decision: z.object({ decision: z.enum(["approved", "rejected"]), edits: z.record(z.string(), z.unknown()).optional() }),
  plan: z.object({ framework: z.string().default("nist-csf-2.0"), maxTasks: z.number().int().min(1).max(200).default(15) }),
  tiers: z.object({ answers: z.record(z.string(), z.number().int().min(1).max(4)) }),
  categorize: z.object({
    systemName: z.string().max(200).optional(),
    systemDescription: z.string().max(4000).optional(),
    informationTypes: z.array(InfoTypeSchema).min(1),
    privacyBaseline: z.boolean().optional(),
  }),
  tailor: z.object({ nodeId: z.string(), action: z.enum(["add", "remove", "reset"]), rationale: z.string().max(2000).default("") }),
  authorize: z.object({
    decision: z.enum(["ato", "iatt", "dato", "pending"]),
    authorizingOfficial: z.string().max(200).optional(),
    expiresAt: z.string().optional(),
    rationale: z.string().max(4000).optional(),
  }),
};

async function body<T extends z.ZodType>(c: Context, schema: T): Promise<z.infer<T>> {
  let json: unknown;
  try {
    json = await c.req.json();
  } catch {
    throw new ValidationError("Request body must be JSON");
  }
  const parsed = schema.safeParse(json);
  if (!parsed.success) throw new ValidationError(z.prettifyError(parsed.error));
  return parsed.data;
}

const MIME: Record<string, string> = {
  ".pdf": "application/pdf",
  ".json": "application/json",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".md": "text/markdown; charset=utf-8",
  ".html": "text/html; charset=utf-8",
};

export function createApp(svc: VisuaService, auth: AuthService = new AuthService(svc, loadAuthConfig())): Hono<AppEnv> {
  const app = new Hono<AppEnv>();

  app.onError((err, c) => {
    if (err instanceof NotFoundError) return c.json({ error: err.message }, 404);
    if (err instanceof ValidationError) return c.json({ error: err.message }, 400);
    if (err instanceof UnauthorizedError) return c.json({ error: err.message }, 401);
    if (err instanceof ForbiddenError) return c.json({ error: err.message }, 403);
    console.error("[visua] unhandled error", err);
    return c.json({ error: "Internal error" }, 500);
  });

  // ---------------------------------------------------------------- security & identity
  app.use("*", securityHeaders(auth));
  app.use("*", authenticate(auth));
  app.use("/api/*", requireSignIn());
  app.use("/api/*", csrfProtection(auth));
  authRoutes(app, auth);

  // ---------------------------------------------------------------- meta
  app.get("/api/health", (c) => c.json({ ok: true, frameworks: svc.registry.indexes.size, corpusChunks: svc.registry.search.size }));

  app.get("/api/meta", (c) =>
    c.json({
      product: { name: "Visua", version: "0.1.0" },
      frameworks: svc.registry.frameworks.map((f) => ({ ...f, units: svc.registry.framework(f.id)!.assessable.length })),
      levelScales: LEVEL_SCALES,
      tiers: { names: TIER_NAMES, dimensions: TIER_DIMENSIONS, source: TIER_SOURCE },
      agents: Object.values(AGENTS).map((a) => ({ kind: a.kind, name: a.name, tagline: a.tagline, tools: a.tools })),
      connectorKinds: CONNECTOR_KINDS.map((k) => ({ kind: k.kind, name: k.name, description: k.description, configFields: k.configFields })),
      ai: { mode: claudeEnabled() ? "claude" : "offline", model: claudeEnabled() ? configuredModel() : null },
      corpus: svc.registry.manifests.map((m) => ({ framework: m.framework, title: m.title, retrieved: m.retrieved, documents: m.documents.length })),
      crosswalk: svc.registry.crosswalk.sets.map((s) => ({ id: s.id, title: s.title, authority: s.authority, count: s.mappings.length })),
      overlays: svc.registry.overlays.map(overlayMeta),
      exampleInformationTypes: EXAMPLE_INFORMATION_TYPES,
    }),
  );

  app.post("/api/recommend", async (c) => c.json(recommend(await body(c, ProfileSchema))));

  // ---------------------------------------------------------------- frameworks & corpus
  app.get("/api/frameworks/:id", (c) => {
    const index = svc.registry.framework(c.req.param("id"));
    if (!index) throw new NotFoundError(`Framework '${c.req.param("id")}' not found`);
    c.header("Cache-Control", "private, max-age=300");
    return c.json(leanGraph(index.graph));
  });

  app.get("/api/overlays/:id", (c) => {
    const overlay = svc.registry.overlay(c.req.param("id"));
    if (!overlay) throw new NotFoundError("Overlay not found");
    c.header("Cache-Control", "private, max-age=300");
    return c.json(overlay);
  });

  app.get("/api/frameworks/:id/nodes/:code", (c) => {
    const index = svc.registry.framework(c.req.param("id"));
    const node = index?.get(decodeURIComponent(c.req.param("code")));
    if (!node) throw new NotFoundError("Requirement not found");
    return c.json(node);
  });

  app.get("/api/search", (c) => {
    const q = c.req.query("q") ?? "";
    const framework = c.req.query("framework");
    const nodes = [];
    for (const index of svc.registry.indexes.values()) {
      if (framework && index.id !== framework) continue;
      for (const n of index.search(q, 8)) nodes.push({ id: n.id, code: n.code, title: n.title, text: n.text.slice(0, 200), framework: n.frameworkId, kind: n.kind });
    }
    const passages = svc.registry.search.search(q, { limit: 6 }).map((h) => ({
      documentId: h.chunk.documentId,
      documentTitle: h.chunk.documentTitle,
      page: h.chunk.page,
      locator: h.chunk.locator,
      quote: h.quote,
      score: h.score,
    }));
    return c.json({ nodes: nodes.slice(0, 20), passages });
  });

  app.get("/api/corpus", (c) =>
    c.json(
      svc.registry.manifests.map((m) => ({
        ...m,
        // AICPA documents are © AICPA and only present where the installation holds its own copy.
        restricted: m.framework === "aicpa-soc2",
        documents: m.documents.map((d) => ({ ...d, present: existsSync(resolve(CORPUS_DIR, d.path)) })),
      })),
    ),
  );

  app.get("/api/corpus/file/*", (c) => {
    const rel = decodeURIComponent(c.req.path.replace(/^\/api\/corpus\/file\//, ""));
    const full = resolve(CORPUS_DIR, rel);
    const inside = relative(CORPUS_DIR, full);
    // Only files inside the corpus, never the non-redistributable `.local/` folders.
    if (!inside || inside.startsWith("..") || isAbsolute(inside) || inside.split(sep).includes(".local")) throw new ValidationError("Invalid corpus path");
    if (!existsSync(full) || !statSync(full).isFile()) throw new NotFoundError("Corpus file not found");
    const stream = Readable.toWeb(createReadStream(full)) as ReadableStream;
    return new Response(stream, {
      headers: {
        "content-type": MIME[extname(full).toLowerCase()] ?? "application/octet-stream",
        "content-length": String(statSync(full).size),
        "cache-control": "private, max-age=86400",
      },
    });
  });

  // ---------------------------------------------------------------- workspaces
  const summary = async (c: Context<AppEnv>, ws: Workspace) => {
    const role = c.get("role") ?? (await auth.roleIn(c.get("principal"), ws.tenantId));
    return { ...(await workspaceSummary(svc, ws)), access: role ? { role, capabilities: ROLE_CAPABILITIES[role] } : null };
  };

  app.get("/api/workspaces", async (c) => {
    const active = await auth.activeTenant(principalOf(c));
    if (!active) return c.json([]);
    const list = await svc.store.workspaces.list(active.tenant.id);
    return c.json(await Promise.all(list.map(async (ws) => ({ ...(await workspaceSummary(svc, ws)), access: { role: active.role, capabilities: ROLE_CAPABILITIES[active.role] } }))));
  });

  app.post("/api/workspaces", async (c) => {
    const active = await auth.activeTenant(principalOf(c));
    if (!active) throw new ForbiddenError("Join or create an organization first");
    c.set("role", active.role);
    requireCapability(c, "workspace.configure");
    const input = await body(c, Schemas.createWorkspace);
    const ws = await svc.createWorkspace({ ...input, tenantId: active.tenant.id }, actorOf(c));
    return c.json(await summary(c, ws), 201);
  });

  // Every /api/workspaces/:ws route: the workspace's organization must be one the principal can access.
  app.use("/api/workspaces/:ws", workspaceAccess(auth));
  app.use("/api/workspaces/:ws/*", workspaceAccess(auth));
  const wsOf = (c: Context<AppEnv>) => c.get("workspace");
  const wsId = (c: Context<AppEnv>) => c.get("workspace").id;

  app.get("/api/workspaces/:ws", async (c) => c.json(await summary(c, wsOf(c))));

  app.patch("/api/workspaces/:ws", need("workspace.configure"), async (c) => {
    const input = await body(c, Schemas.updateWorkspace);
    const ws = await svc.updateWorkspace(wsId(c), input as never, actorOf(c));
    return c.json(await summary(c, ws));
  });

  app.delete("/api/workspaces/:ws", need("workspace.configure"), async (c) => {
    const ws = await svc.deleteWorkspace(wsId(c));
    await svc.log(ws.tenantId!, actorOf(c), "deleted", "workspace", ws.id, `Workspace “${ws.name}” and its data deleted`);
    return c.json({ ok: true });
  });

  app.get("/api/workspaces/:ws/recommendation", async (c) => c.json(recommend(wsOf(c).profile)));

  app.put("/api/workspaces/:ws/frameworks/:fw", need("workspace.configure"), async (c) => {
    const input = await body(c, Schemas.enableFramework);
    const ws = await svc.enableFramework(wsId(c), c.req.param("fw"), input as never, actorOf(c));
    return c.json(await summary(c, ws));
  });

  app.get("/api/workspaces/:ws/frameworks/:fw/state", async (c) => {
    if (!svc.registry.framework(c.req.param("fw"))) throw new NotFoundError("Framework not found");
    return c.json(await frameworkState(svc, wsOf(c), c.req.param("fw"), { minStatus: parseMinStatus(c.req.query("min")) }));
  });

  app.get("/api/workspaces/:ws/requirements/:nodeId", async (c) => {
    const node = svc.registry.node(decodeURIComponent(c.req.param("nodeId")));
    if (!node) throw new NotFoundError("Requirement not found");
    return c.json(await nodeDetail(svc, wsOf(c), node, { minStatus: parseMinStatus(c.req.query("min")) }));
  });

  app.patch("/api/workspaces/:ws/requirements/:nodeId", async (c) => {
    const input = await body(c, Schemas.updateState);
    return c.json(await svc.updateState(wsId(c), decodeURIComponent(c.req.param("nodeId")), input as never, actorOf(c)));
  });

  app.post("/api/workspaces/:ws/tiers", async (c) => {
    const input = await body(c, Schemas.tiers);
    return c.json(await summary(c, await svc.recordTierAssessment(wsId(c), input.answers, actorOf(c))));
  });

  // ---------------------------------------------------------------- RMF
  app.post("/api/workspaces/:ws/rmf/categorize", need("work.approve"), async (c) => {
    const input = await body(c, Schemas.categorize);
    return c.json(await summary(c, await svc.categorizeSystem(wsId(c), input, actorOf(c))));
  });
  app.post("/api/workspaces/:ws/rmf/tailor", need("work.approve"), async (c) => {
    const input = await body(c, Schemas.tailor);
    return c.json(await summary(c, await svc.tailorControl(wsId(c), input.nodeId, input.action, input.rationale, actorOf(c))));
  });
  app.post("/api/workspaces/:ws/rmf/authorize", need("work.approve"), async (c) => {
    const input = await body(c, Schemas.authorize);
    return c.json(await summary(c, await svc.setAuthorization(wsId(c), input, actorOf(c))));
  });

  // ---------------------------------------------------------------- overlays (Cyber AI Profile, COSAiS)
  app.get("/api/workspaces/:ws/overlays/:id", async (c) => c.json(await overlaySummary(svc, wsOf(c), c.req.param("id"))));
  app.put("/api/workspaces/:ws/overlays/:id", need("workspace.configure"), async (c) => {
    const input = await body(c, z.object({ lenses: z.array(z.string().max(40)).max(10).optional() }));
    await svc.adoptOverlay(wsId(c), c.req.param("id"), input, actorOf(c));
    return c.json(await overlaySummary(svc, await svc.workspace(wsId(c)), c.req.param("id")));
  });
  app.delete("/api/workspaces/:ws/overlays/:id", need("workspace.configure"), async (c) => {
    await svc.dropOverlay(wsId(c), c.req.param("id"), actorOf(c));
    return c.json(await overlaySummary(svc, await svc.workspace(wsId(c)), c.req.param("id")));
  });
  app.post("/api/workspaces/:ws/overlays/:id/apply-priorities", need("work.approve"), async (c) => {
    const result = await svc.applyOverlayPriorities(wsId(c), c.req.param("id"), actorOf(c));
    return c.json({ ...result, summary: await overlaySummary(svc, await svc.workspace(wsId(c)), c.req.param("id")) });
  });

  // ---------------------------------------------------------------- Threat views (MITRE ATLAS, OWASP, NIST AI 100-2)
  app.get("/api/workspaces/:ws/threats", async (c) => c.json(await threatsOverview(svc, wsOf(c), parseMinStatus(c.req.query("min")))));
  app.get("/api/workspaces/:ws/threats/:catalog", async (c) => c.json(await threatCatalogState(svc, wsOf(c), c.req.param("catalog"), parseMinStatus(c.req.query("min")))));

  // ---------------------------------------------------------------- U.S. state AI laws
  app.get("/api/workspaces/:ws/laws", async (c) => c.json(await lawsOverview(svc, wsOf(c))));
  // Whether a law applies, and in which role, is a compliance decision: approvers and above.
  app.put("/api/workspaces/:ws/laws/:lawId/applicability", need("work.approve"), async (c) => {
    const input = await body(c, z.object({ roles: z.array(z.string().max(60)).max(20), note: z.string().max(2000).optional() }));
    await svc.setLawApplicability(wsId(c), c.req.param("lawId"), input, actorOf(c));
    return c.json(await lawsOverview(svc, await svc.workspace(wsId(c))));
  });

  // ---------------------------------------------------------------- AI governance
  app.get("/api/workspaces/:ws/ai", async (c) => c.json(await aiOverview(svc, wsOf(c))));
  app.post("/api/workspaces/:ws/ai/systems", async (c) => {
    const input = await body(c, AiSystemSchema);
    return c.json(await svc.upsertAiSystem(wsId(c), input, actorOf(c)), 201);
  });
  app.patch("/api/workspaces/:ws/ai/systems/:id", async (c) => {
    const input = await body(c, AiSystemSchema.partial());
    return c.json(await svc.upsertAiSystem(wsId(c), { ...input, id: c.req.param("id") }, actorOf(c)));
  });
  app.delete("/api/workspaces/:ws/ai/systems/:id", async (c) => {
    await svc.removeAiSystem(wsId(c), c.req.param("id"), actorOf(c));
    return c.body(null, 204);
  });

  // ---------------------------------------------------------------- tasks
  app.get("/api/workspaces/:ws/tasks", async (c) => c.json(await svc.store.tasks.list(wsId(c))));
  app.post("/api/workspaces/:ws/tasks", async (c) => {
    const input = await body(c, Schemas.createTask);
    const checklist = input.checklist?.map((i) => ({ id: "", text: i.text, done: !!i.done }));
    return c.json(await svc.createTask(wsId(c), { ...input, checklist } as never, actorOf(c)), 201);
  });
  app.patch("/api/workspaces/:ws/tasks/:id", async (c) => {
    const input = await body(c, Schemas.updateTask);
    const clean = Object.fromEntries(Object.entries(input).map(([k, v]) => [k, v === null ? undefined : v]));
    return c.json(await svc.updateTask(wsId(c), c.req.param("id"), clean as never, actorOf(c)));
  });
  app.delete("/api/workspaces/:ws/tasks/:id", async (c) => {
    await svc.deleteTask(wsId(c), c.req.param("id"), actorOf(c));
    return c.json({ ok: true });
  });
  app.post("/api/workspaces/:ws/plan", async (c) => {
    const input = await body(c, Schemas.plan);
    return c.json(await svc.planWith(wsId(c), input.framework, input.maxTasks, actorOf(c)), 201);
  });

  // ---------------------------------------------------------------- evidence
  app.get("/api/workspaces/:ws/evidence", async (c) => c.json(await svc.store.evidence.list(wsId(c))));
  app.post("/api/workspaces/:ws/evidence", async (c) => {
    const input = await body(c, Schemas.createEvidence);
    const sha256 = input.content ? createHash("sha256").update(input.content).digest("hex") : undefined;
    return c.json(await svc.createEvidence(wsId(c), { ...input, source: "upload", sha256 }, actorOf(c)), 201);
  });
  app.patch("/api/workspaces/:ws/evidence/:id", async (c) => {
    const input = await body(c, Schemas.updateEvidence);
    if (input.decision) {
      // Accepting or rejecting evidence is a review decision.
      requireCapability(c, "work.approve");
      return c.json(await svc.reviewEvidence(wsId(c), c.req.param("id"), input.decision, actorOf(c), input.note));
    }
    return c.json(await svc.updateEvidence(wsId(c), c.req.param("id"), { title: input.title, requirementIds: input.requirementIds, validUntil: input.validUntil } as never, actorOf(c)));
  });

  // ---------------------------------------------------------------- policies & risks
  app.get("/api/workspaces/:ws/policies", async (c) => c.json(await svc.store.policies.list(wsId(c))));
  app.post("/api/workspaces/:ws/policies", async (c) => {
    const input = await body(c, Schemas.createPolicy);
    return c.json(await svc.createPolicy(wsId(c), input, actorOf(c)), 201);
  });
  app.patch("/api/workspaces/:ws/policies/:id", async (c) => {
    const input = await body(c, Schemas.updatePolicy);
    // Approving, publishing or retiring a policy is a management decision.
    if (input.status === "approved" || input.status === "published" || input.status === "retired") requireCapability(c, "work.approve");
    return c.json(await svc.updatePolicy(wsId(c), c.req.param("id"), input, actorOf(c)));
  });
  app.get("/api/workspaces/:ws/risks", async (c) => c.json(await svc.store.risks.list(wsId(c))));
  app.post("/api/workspaces/:ws/risks", async (c) => {
    const input = await body(c, Schemas.risk);
    return c.json(await svc.upsertRisk(wsId(c), input as never, actorOf(c)), 201);
  });

  // ---------------------------------------------------------------- connectors
  app.get("/api/workspaces/:ws/connectors", async (c) => c.json(await svc.store.connectors.list(wsId(c))));
  // Connectors reach systems and paths from the server, so configuring them is an admin action.
  app.post("/api/workspaces/:ws/connectors", need("workspace.configure"), async (c) => {
    const input = await body(c, Schemas.connector);
    return c.json(await svc.createConnector(wsId(c), input, actorOf(c)), 201);
  });
  app.post("/api/workspaces/:ws/connectors/:id/run", async (c) => c.json(await svc.runConnector(wsId(c), c.req.param("id"), actorOf(c))));
  app.get("/api/workspaces/:ws/checks", async (c) => c.json(await svc.store.checks.recent(wsId(c), 200)));

  // ---------------------------------------------------------------- agents
  app.get("/api/workspaces/:ws/runs", async (c) =>
    c.json((await svc.store.runs.recent(wsId(c), Number(c.req.query("limit") ?? 50))).map((r) => ({ ...r, steps: undefined, stepCount: r.steps.length }))),
  );
  app.post("/api/workspaces/:ws/runs", async (c) => {
    const input = await body(c, Schemas.run);
    const run = await svc.startRun(wsId(c), { agent: input.agent as AgentKind, goal: input.goal, input: input.input }, actorOf(c));
    if (c.req.query("wait") === "1") {
      const done = await svc.waitForRun(run.id);
      return c.json({ ...done, proposals: (await svc.store.proposals.list(done.workspaceId)).filter((p) => p.runId === done.id) }, 201);
    }
    return c.json(run, 202);
  });
  app.get("/api/workspaces/:ws/runs/:id", async (c) => {
    const run = await svc.store.runs.get(c.req.param("id"));
    if (!run || run.workspaceId !== wsId(c)) throw new NotFoundError("Run not found");
    const proposals = (await svc.store.proposals.list(run.workspaceId)).filter((p) => p.runId === run.id);
    return c.json({ ...run, proposals });
  });
  app.post("/api/workspaces/:ws/runs/:id/cancel", async (c) => c.json(await svc.cancelRun(wsId(c), c.req.param("id"), actorOf(c))));
  app.post("/api/workspaces/:ws/runs/:id/approve-all", need("work.approve"), async (c) => {
    const pending = (await svc.store.proposals.list(wsId(c))).filter((p) => p.runId === c.req.param("id") && p.status === "pending");
    const decided = [];
    for (const p of pending) decided.push(await svc.decideProposal(wsId(c), p.id, "approved", actorOf(c)));
    return c.json(decided);
  });
  app.get("/api/workspaces/:ws/proposals", async (c) => {
    const status = c.req.query("status");
    return c.json((await svc.store.proposals.list(wsId(c))).filter((p) => !status || p.status === status));
  });
  app.post("/api/workspaces/:ws/proposals/:id/decision", need("work.approve"), async (c) => {
    const input = await body(c, Schemas.decision);
    return c.json(await svc.decideProposal(wsId(c), c.req.param("id"), input.decision, actorOf(c), input.edits));
  });

  // ---------------------------------------------------------------- crosswalk, SOC 2 description, activity & events
  app.get("/api/workspaces/:ws/crosswalk", async (c) => c.json(await crosswalkOverview(svc, wsOf(c))));
  // The Nexus inner ring: threat catalogs bundled onto the requirement groups linked to them.
  app.get("/api/workspaces/:ws/crosswalk/threats", async (c) => c.json(await threatRing(svc, wsOf(c), parseMinStatus(c.req.query("min")))));
  app.get("/api/workspaces/:ws/crosswalk/rows", async (c) =>
    c.json(
      await crosswalkRows(svc, wsOf(c), {
        setId: c.req.query("set") || undefined,
        groupId: c.req.query("group") || undefined,
        nodeId: c.req.query("node") || undefined,
        limit: c.req.query("limit") ? Math.min(5000, Number(c.req.query("limit"))) : undefined,
      }),
    ),
  );
  app.get("/api/workspaces/:ws/soc2/description", async (c) => c.json(await soc2Description(svc, wsOf(c))));

  app.get("/api/workspaces/:ws/activity", async (c) => c.json(await svc.store.activity.recent(wsId(c), Math.min(1000, Number(c.req.query("limit") ?? 100)))));
  app.get("/api/workspaces/:ws/activity/verify", async (c) => c.json(await svc.verifyAuditTrail(wsId(c))));

  app.get("/api/workspaces/:ws/events", async (c) => {
    const ws = wsOf(c);
    return streamSSE(c, async (stream) => {
      const queue: string[] = [];
      let wake: (() => void) | undefined;
      const unsubscribe = svc.bus.subscribe(ws.id, (event) => {
        queue.push(JSON.stringify(event));
        wake?.();
      });
      let open = true;
      stream.onAbort(() => {
        open = false;
        unsubscribe();
        wake?.();
      });
      await stream.writeSSE({ event: "ready", data: JSON.stringify({ workspaceId: ws.id }) });
      while (open) {
        while (queue.length) {
          const data = queue.shift()!;
          await stream.writeSSE({ event: "visua", data });
        }
        await new Promise<void>((r) => {
          wake = r;
          setTimeout(r, 15_000);
        });
        wake = undefined;
        if (open && !queue.length) await stream.writeSSE({ event: "ping", data: String(Date.now()) });
      }
    });
  });

  // ---------------------------------------------------------------- exports & trust
  app.get("/api/workspaces/:ws/exports/:kind", need("workspace.export"), async (c) => {
    const ws = wsOf(c);
    const kind = c.req.param("kind");
    const file = (content: string, type: string, name: string) =>
      new Response(content, { headers: { "content-type": type, "content-disposition": `attachment; filename="${ws.slug}-${name}"` } });
    switch (kind) {
      case "csf-profile.csv":
        return file(await csfProfileCsv(svc, ws), "text/csv; charset=utf-8", "csf-2.0-organizational-profile.csv");
      case "action-plan.csv":
        return file(await actionPlanCsv(svc, ws), "text/csv; charset=utf-8", "action-plan.csv");
      case "evidence-index.csv":
        return file(await evidenceIndexCsv(svc, ws), "text/csv; charset=utf-8", "evidence-index.csv");
      case "ai-rmf-profile.csv":
        return file(await aiRmfProfileCsv(svc, ws), "text/csv; charset=utf-8", "nist-ai-rmf-profile.csv");
      case "soc2-pbc.csv":
        return file(await soc2PbcCsv(svc, ws), "text/csv; charset=utf-8", "soc2-pbc-request-list.csv");
      case "readiness.md":
        return file(await readinessMarkdown(svc, ws), "text/markdown; charset=utf-8", "readiness-report.md");
      case "oscal-ssp.json":
        return file(JSON.stringify(await oscalSsp(svc, ws), null, 2), "application/json", "oscal-ssp.json");
      case "oscal-poam.json":
        return file(JSON.stringify(await oscalPoam(svc, ws), null, 2), "application/json", "oscal-poam.json");
      default:
        throw new NotFoundError(`Unknown export '${kind}'`);
    }
  });

  app.get("/api/trust/:slug", async (c) => {
    const ws = await svc.store.workspaces.get(c.req.param("slug"));
    if (!ws || ws.slug !== c.req.param("slug") || !ws.trustCenter.enabled) throw new NotFoundError("Trust center not found");
    const [summary, checks] = await Promise.all([workspaceSummary(svc, ws), svc.store.checks.recent(ws.id, 100)]);
    return c.json({
      name: ws.name,
      headline: ws.trustCenter.headline ?? `${ws.name} security & compliance`,
      contactEmail: ws.trustCenter.contactEmail,
      frameworks: summary.frameworks.map((f) => ({ id: f.id, name: f.shortName, readiness: Math.round(f.readiness * 100), evidenceCoverage: Math.round(f.evidenceCoverage * 100) })),
      policies: summary.policies.filter((p) => p.status === "approved" || p.status === "published").map((p) => ({ title: p.title, version: p.version })),
      monitoring: checks
        .filter((ch, i, all) => all.findIndex((x) => x.checkId === ch.checkId) === i)
        .map((ch) => ({ title: ch.title, outcome: ch.outcome, observedAt: ch.observedAt })),
      updatedAt: ws.updatedAt,
    });
  });

  return app;
}
