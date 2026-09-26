/**
 * Visua HTTP API (Hono). JSON everywhere, SSE for live events, strict input
 * validation with Zod, and a local file route that serves the official
 * corpus so every citation opens the source PDF at the right page.
 */
import { createReadStream, existsSync, statSync } from "node:fs";
import { extname, isAbsolute, relative, resolve, sep } from "node:path";
import { Readable } from "node:stream";
import { Hono, type Context } from "hono";
import { streamSSE } from "hono/streaming";
import { z } from "zod";
import {
  EXAMPLE_INFORMATION_TYPES,
  LEVEL_SCALES,
  TIER_DIMENSIONS,
  TIER_NAMES,
  TIER_SOURCE,
  recommend,
  type AgentKind,
} from "@visua/core";
import { AGENTS, claudeEnabled, configuredModel } from "@visua/agents";
import { CORPUS_DIR } from "@visua/frameworks";
import { CONNECTOR_KINDS } from "./connectors/index.ts";
import { actionPlanCsv, aiRmfProfileCsv, csfProfileCsv, evidenceIndexCsv, oscalPoam, oscalSsp, readinessMarkdown, soc2PbcCsv } from "./services/exports.ts";
import { aiOverview } from "./services/ai.ts";
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
  industry: z.enum(["saas", "fintech", "healthcare", "manufacturing", "public-sector", "defense-contractor", "education", "retail", "energy-utilities", "nonprofit", "professional-services", "other"]),
  size: z.enum(["1-10", "11-50", "51-200", "201-1000", "1000+"]),
  dataTypes: z.array(z.enum(["pii", "phi", "cardholder", "cui", "financial", "intellectual-property", "children", "biometric"])).default([]),
  drivers: z.array(z.enum(["enterprise-customers", "federal-customers", "regulator", "board-mandate", "cyber-insurance", "investor-due-diligence", "incident-recovery", "build-program"])).default([]),
  environments: z.array(z.enum(["cloud", "on-prem", "hybrid", "ot"])).default(["cloud"]),
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
  dataTypes: z.array(z.enum(["pii", "phi", "cardholder", "cui", "financial", "intellectual-property", "children", "biometric"])).optional(),
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

const ACTOR_HEADER = "x-visua-actor";
const actorOf = (c: Context) => (c.req.header(ACTOR_HEADER) ?? "user").slice(0, 80);

const MIME: Record<string, string> = {
  ".pdf": "application/pdf",
  ".json": "application/json",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".md": "text/markdown; charset=utf-8",
  ".html": "text/html; charset=utf-8",
};

export function createApp(svc: VisuaService): Hono {
  const app = new Hono();

  app.onError((err, c) => {
    if (err instanceof NotFoundError) return c.json({ error: err.message }, 404);
    if (err instanceof ValidationError) return c.json({ error: err.message }, 400);
    console.error("[visua] unhandled error", err);
    return c.json({ error: "Internal error", detail: err instanceof Error ? err.message : String(err) }, 500);
  });

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
      exampleInformationTypes: EXAMPLE_INFORMATION_TYPES,
    }),
  );

  app.post("/api/recommend", async (c) => c.json(recommend(await body(c, ProfileSchema))));

  // ---------------------------------------------------------------- frameworks & corpus
  app.get("/api/frameworks/:id", (c) => {
    const index = svc.registry.framework(c.req.param("id"));
    if (!index) throw new NotFoundError(`Framework '${c.req.param("id")}' not found`);
    c.header("Cache-Control", "public, max-age=300");
    return c.json(leanGraph(index.graph));
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
        "cache-control": "public, max-age=86400",
      },
    });
  });

  // ---------------------------------------------------------------- workspaces
  app.get("/api/workspaces", (c) => c.json(svc.store.workspaces.list().map((ws) => workspaceSummary(svc, ws))));

  app.post("/api/workspaces", async (c) => {
    const input = await body(c, Schemas.createWorkspace);
    const ws = svc.createWorkspace(input, actorOf(c));
    return c.json(workspaceSummary(svc, ws), 201);
  });

  app.get("/api/workspaces/:ws", (c) => c.json(workspaceSummary(svc, svc.workspace(c.req.param("ws")))));

  app.patch("/api/workspaces/:ws", async (c) => {
    const input = await body(c, Schemas.updateWorkspace);
    const ws = svc.updateWorkspace(c.req.param("ws"), input as never, actorOf(c));
    return c.json(workspaceSummary(svc, ws));
  });

  app.delete("/api/workspaces/:ws", (c) => {
    const ws = svc.workspace(c.req.param("ws"));
    svc.store.deleteWorkspace(ws.id);
    return c.json({ ok: true });
  });

  app.get("/api/workspaces/:ws/recommendation", (c) => c.json(recommend(svc.workspace(c.req.param("ws")).profile)));

  app.put("/api/workspaces/:ws/frameworks/:fw", async (c) => {
    const input = await body(c, Schemas.enableFramework);
    const ws = svc.enableFramework(c.req.param("ws"), c.req.param("fw"), input as never, actorOf(c));
    return c.json(workspaceSummary(svc, ws));
  });

  app.get("/api/workspaces/:ws/frameworks/:fw/state", (c) => {
    const ws = svc.workspace(c.req.param("ws"));
    if (!svc.registry.framework(c.req.param("fw"))) throw new NotFoundError("Framework not found");
    return c.json(frameworkState(svc, ws, c.req.param("fw")));
  });

  app.get("/api/workspaces/:ws/requirements/:nodeId", (c) => {
    const ws = svc.workspace(c.req.param("ws"));
    const node = svc.registry.node(decodeURIComponent(c.req.param("nodeId")));
    if (!node) throw new NotFoundError("Requirement not found");
    return c.json(nodeDetail(svc, ws, node));
  });

  app.patch("/api/workspaces/:ws/requirements/:nodeId", async (c) => {
    const input = await body(c, Schemas.updateState);
    const state = svc.updateState(c.req.param("ws"), decodeURIComponent(c.req.param("nodeId")), input as never, actorOf(c));
    return c.json(state);
  });

  app.post("/api/workspaces/:ws/tiers", async (c) => {
    const input = await body(c, Schemas.tiers);
    return c.json(workspaceSummary(svc, svc.recordTierAssessment(c.req.param("ws"), input.answers, actorOf(c))));
  });

  // ---------------------------------------------------------------- RMF
  app.post("/api/workspaces/:ws/rmf/categorize", async (c) => {
    const input = await body(c, Schemas.categorize);
    return c.json(workspaceSummary(svc, svc.categorizeSystem(c.req.param("ws"), input, actorOf(c))));
  });
  app.post("/api/workspaces/:ws/rmf/tailor", async (c) => {
    const input = await body(c, Schemas.tailor);
    return c.json(workspaceSummary(svc, svc.tailorControl(c.req.param("ws"), input.nodeId, input.action, input.rationale, actorOf(c))));
  });
  app.post("/api/workspaces/:ws/rmf/authorize", async (c) => {
    const input = await body(c, Schemas.authorize);
    return c.json(workspaceSummary(svc, svc.setAuthorization(c.req.param("ws"), input, actorOf(c))));
  });

  // ---------------------------------------------------------------- AI governance
  app.get("/api/workspaces/:ws/ai", (c) => c.json(aiOverview(svc, svc.workspace(c.req.param("ws")))));
  app.post("/api/workspaces/:ws/ai/systems", async (c) => {
    const input = await body(c, AiSystemSchema);
    return c.json(svc.upsertAiSystem(c.req.param("ws"), input, actorOf(c)), 201);
  });
  app.patch("/api/workspaces/:ws/ai/systems/:id", async (c) => {
    const input = await body(c, AiSystemSchema.partial());
    return c.json(svc.upsertAiSystem(c.req.param("ws"), { ...input, id: c.req.param("id") }, actorOf(c)));
  });
  app.delete("/api/workspaces/:ws/ai/systems/:id", (c) => {
    svc.removeAiSystem(c.req.param("ws"), c.req.param("id"), actorOf(c));
    return c.body(null, 204);
  });

  // ---------------------------------------------------------------- tasks
  app.get("/api/workspaces/:ws/tasks", (c) => c.json(svc.store.tasks.list(svc.workspace(c.req.param("ws")).id)));
  app.post("/api/workspaces/:ws/tasks", async (c) => {
    const input = await body(c, Schemas.createTask);
    const checklist = input.checklist?.map((i) => ({ id: "", text: i.text, done: !!i.done }));
    return c.json(svc.createTask(svc.workspace(c.req.param("ws")).id, { ...input, checklist } as never, actorOf(c)), 201);
  });
  app.patch("/api/workspaces/:ws/tasks/:id", async (c) => {
    const input = await body(c, Schemas.updateTask);
    const clean = Object.fromEntries(Object.entries(input).map(([k, v]) => [k, v === null ? undefined : v]));
    return c.json(svc.updateTask(svc.workspace(c.req.param("ws")).id, c.req.param("id"), clean as never, actorOf(c)));
  });
  app.delete("/api/workspaces/:ws/tasks/:id", (c) => {
    svc.deleteTask(svc.workspace(c.req.param("ws")).id, c.req.param("id"), actorOf(c));
    return c.json({ ok: true });
  });
  app.post("/api/workspaces/:ws/plan", async (c) => {
    const input = await body(c, Schemas.plan);
    const ws = svc.workspace(c.req.param("ws"));
    return c.json(svc.planWith(ws.id, input.framework, input.maxTasks, actorOf(c)), 201);
  });

  // ---------------------------------------------------------------- evidence
  app.get("/api/workspaces/:ws/evidence", (c) => c.json(svc.store.evidence.list(svc.workspace(c.req.param("ws")).id)));
  app.post("/api/workspaces/:ws/evidence", async (c) => {
    const input = await body(c, Schemas.createEvidence);
    const { createHash } = await import("node:crypto");
    const sha256 = input.content ? createHash("sha256").update(input.content).digest("hex") : undefined;
    return c.json(svc.createEvidence(svc.workspace(c.req.param("ws")).id, { ...input, source: "upload", sha256 }, actorOf(c)), 201);
  });
  app.patch("/api/workspaces/:ws/evidence/:id", async (c) => {
    const input = await body(c, Schemas.updateEvidence);
    const wsId = svc.workspace(c.req.param("ws")).id;
    if (input.decision) return c.json(svc.reviewEvidence(wsId, c.req.param("id"), input.decision, actorOf(c), input.note));
    return c.json(svc.updateEvidence(wsId, c.req.param("id"), { title: input.title, requirementIds: input.requirementIds, validUntil: input.validUntil } as never, actorOf(c)));
  });

  // ---------------------------------------------------------------- policies & risks
  app.get("/api/workspaces/:ws/policies", (c) => c.json(svc.store.policies.list(svc.workspace(c.req.param("ws")).id)));
  app.post("/api/workspaces/:ws/policies", async (c) => {
    const input = await body(c, Schemas.createPolicy);
    return c.json(svc.createPolicy(svc.workspace(c.req.param("ws")).id, input, actorOf(c)), 201);
  });
  app.patch("/api/workspaces/:ws/policies/:id", async (c) => {
    const input = await body(c, Schemas.updatePolicy);
    return c.json(svc.updatePolicy(svc.workspace(c.req.param("ws")).id, c.req.param("id"), input, actorOf(c)));
  });
  app.get("/api/workspaces/:ws/risks", (c) => c.json(svc.store.risks.list(svc.workspace(c.req.param("ws")).id)));
  app.post("/api/workspaces/:ws/risks", async (c) => {
    const input = await body(c, Schemas.risk);
    return c.json(svc.upsertRisk(svc.workspace(c.req.param("ws")).id, input as never, actorOf(c)), 201);
  });

  // ---------------------------------------------------------------- connectors
  app.get("/api/workspaces/:ws/connectors", (c) => c.json(svc.store.connectors.list(svc.workspace(c.req.param("ws")).id)));
  app.post("/api/workspaces/:ws/connectors", async (c) => {
    const input = await body(c, Schemas.connector);
    return c.json(svc.createConnector(svc.workspace(c.req.param("ws")).id, input, actorOf(c)), 201);
  });
  app.post("/api/workspaces/:ws/connectors/:id/run", async (c) => c.json(await svc.runConnector(svc.workspace(c.req.param("ws")).id, c.req.param("id"), actorOf(c))));
  app.get("/api/workspaces/:ws/checks", (c) => c.json(svc.store.checks.recent(svc.workspace(c.req.param("ws")).id, 200)));

  // ---------------------------------------------------------------- agents
  app.get("/api/workspaces/:ws/runs", (c) =>
    c.json(svc.store.runs.recent(svc.workspace(c.req.param("ws")).id, Number(c.req.query("limit") ?? 50)).map((r) => ({ ...r, steps: undefined, stepCount: r.steps.length }))),
  );
  app.post("/api/workspaces/:ws/runs", async (c) => {
    const input = await body(c, Schemas.run);
    const run = svc.startRun(svc.workspace(c.req.param("ws")).id, { agent: input.agent as AgentKind, goal: input.goal, input: input.input }, actorOf(c));
    if (c.req.query("wait") === "1") {
      const done = await svc.waitForRun(run.id);
      return c.json({ ...done, proposals: svc.store.proposals.list(done.workspaceId).filter((p) => p.runId === done.id) }, 201);
    }
    return c.json(run, 202);
  });
  app.get("/api/workspaces/:ws/runs/:id", (c) => {
    const run = svc.store.runs.get(c.req.param("id"));
    if (!run || run.workspaceId !== svc.workspace(c.req.param("ws")).id) throw new NotFoundError("Run not found");
    const proposals = svc.store.proposals.list(run.workspaceId).filter((p) => p.runId === run.id);
    return c.json({ ...run, proposals });
  });
  app.post("/api/workspaces/:ws/runs/:id/cancel", (c) => c.json(svc.cancelRun(svc.workspace(c.req.param("ws")).id, c.req.param("id"), actorOf(c))));
  app.post("/api/workspaces/:ws/runs/:id/approve-all", (c) => {
    const wsId = svc.workspace(c.req.param("ws")).id;
    const pending = svc.store.proposals.list(wsId).filter((p) => p.runId === c.req.param("id") && p.status === "pending");
    return c.json(pending.map((p) => svc.decideProposal(wsId, p.id, "approved", actorOf(c))));
  });
  app.get("/api/workspaces/:ws/proposals", (c) => {
    const status = c.req.query("status");
    return c.json(svc.store.proposals.list(svc.workspace(c.req.param("ws")).id).filter((p) => !status || p.status === status));
  });
  app.post("/api/workspaces/:ws/proposals/:id/decision", async (c) => {
    const input = await body(c, Schemas.decision);
    return c.json(svc.decideProposal(svc.workspace(c.req.param("ws")).id, c.req.param("id"), input.decision, actorOf(c), input.edits));
  });

  // ---------------------------------------------------------------- activity & events
  app.get("/api/workspaces/:ws/crosswalk", (c) => c.json(crosswalkOverview(svc, svc.workspace(c.req.param("ws")))));
  app.get("/api/workspaces/:ws/crosswalk/rows", (c) =>
    c.json(
      crosswalkRows(svc, svc.workspace(c.req.param("ws")), {
        setId: c.req.query("set") || undefined,
        groupId: c.req.query("group") || undefined,
        nodeId: c.req.query("node") || undefined,
        limit: c.req.query("limit") ? Math.min(5000, Number(c.req.query("limit"))) : undefined,
      }),
    ),
  );
  app.get("/api/workspaces/:ws/soc2/description", (c) => c.json(soc2Description(svc, svc.workspace(c.req.param("ws")))));

  app.get("/api/workspaces/:ws/activity", (c) => c.json(svc.store.activity.recent(svc.workspace(c.req.param("ws")).id, Number(c.req.query("limit") ?? 100))));
  app.get("/api/workspaces/:ws/activity/verify", (c) => c.json(svc.verifyAuditTrail(svc.workspace(c.req.param("ws")).id)));

  app.get("/api/workspaces/:ws/events", (c) => {
    const ws = svc.workspace(c.req.param("ws"));
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
  app.get("/api/workspaces/:ws/exports/:kind", (c) => {
    const ws = svc.workspace(c.req.param("ws"));
    const kind = c.req.param("kind");
    const file = (content: string, type: string, name: string) =>
      new Response(content, { headers: { "content-type": type, "content-disposition": `attachment; filename="${ws.slug}-${name}"` } });
    switch (kind) {
      case "csf-profile.csv":
        return file(csfProfileCsv(svc, ws), "text/csv; charset=utf-8", "csf-2.0-organizational-profile.csv");
      case "action-plan.csv":
        return file(actionPlanCsv(svc, ws), "text/csv; charset=utf-8", "action-plan.csv");
      case "evidence-index.csv":
        return file(evidenceIndexCsv(svc, ws), "text/csv; charset=utf-8", "evidence-index.csv");
      case "ai-rmf-profile.csv":
        return file(aiRmfProfileCsv(svc, ws), "text/csv; charset=utf-8", "nist-ai-rmf-profile.csv");
      case "soc2-pbc.csv":
        return file(soc2PbcCsv(svc, ws), "text/csv; charset=utf-8", "soc2-pbc-request-list.csv");
      case "readiness.md":
        return file(readinessMarkdown(svc, ws), "text/markdown; charset=utf-8", "readiness-report.md");
      case "oscal-ssp.json":
        return file(JSON.stringify(oscalSsp(svc, ws), null, 2), "application/json", "oscal-ssp.json");
      case "oscal-poam.json":
        return file(JSON.stringify(oscalPoam(svc, ws), null, 2), "application/json", "oscal-poam.json");
      default:
        throw new NotFoundError(`Unknown export '${kind}'`);
    }
  });

  app.get("/api/trust/:slug", (c) => {
    const ws = svc.store.workspaces.get(c.req.param("slug"));
    if (!ws || !ws.trustCenter.enabled) throw new NotFoundError("Trust center not found");
    const summary = workspaceSummary(svc, ws);
    return c.json({
      name: ws.name,
      headline: ws.trustCenter.headline ?? `${ws.name} security & compliance`,
      contactEmail: ws.trustCenter.contactEmail,
      frameworks: summary.frameworks.map((f) => ({ id: f.id, name: f.shortName, readiness: Math.round(f.readiness * 100), evidenceCoverage: Math.round(f.evidenceCoverage * 100) })),
      policies: summary.policies.filter((p) => p.status === "approved" || p.status === "published").map((p) => ({ title: p.title, version: p.version })),
      monitoring: svc.store.checks
        .recent(ws.id, 100)
        .filter((ch, i, all) => all.findIndex((x) => x.checkId === ch.checkId) === i)
        .map((ch) => ({ title: ch.title, outcome: ch.outcome, observedAt: ch.observedAt })),
      updatedAt: ws.updatedAt,
    });
  });

  return app;
}
