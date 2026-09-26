# Visua architecture

Visua has five layers. The official corpus is ingested into normalized framework
graphs. A domain engine scores a workspace against those graphs. Agents read through a
narrow host contract and *propose* changes. An API persists state and streams events.
A web client renders all of it as navigable 3D space with a 2D twin.

```
corpus/                     official publications, manifests (SHA-256, license), structure notes
  │ pnpm ingest  (packages/frameworks/scripts/ingest.ts)
  ▼
packages/frameworks/data/   <framework>.json graphs · mappings/*.json · chunks/<corpus>.json
  │ FrameworkRegistry.load()
  ▼
packages/core               FrameworkIndex · scoring · status · planner · crosswalk · tiers · FIPS 199
packages/agents             AgentHost contract · 16 tools · Claude runtime · offline playbooks
apps/server                 VisuaService · storage (SQLite or Postgres) · Hono API · SSE · connectors · exports
apps/web                    React 19 · react-three-fiber scenes · TanStack Query · DESIGN.md tokens
packages/design             DESIGN.md → CSS variables + typed tokens (shared by web and scenes)
```

## 1. Corpus → framework graphs

**Graph model.** Every framework is a `FrameworkGraph`: a descriptor plus a flat list of
`RequirementNode`s. Node ids are global (`<frameworkId>:<code>`, for example
`nist-csf-2.0:PR.AA-01` or `nist-sp-800-53-r5:AC-2(1)`). Each node carries its official
text, its parent, its depth, and whether it is *assessable* (a unit of work). Each node
also carries a **citation**: the corpus document id, a locator, and the PDF page where
one exists.

| Framework | Source of truth | Units of work |
|---|---|---|
| NIST CSF 2.0 | CSF 2.0 Reference Tool JSON (elements + OLIR metadata), page citations from CSWP 29 | 106 subcategories (6 functions, 22 categories), 363 Implementation Examples |
| SP 800-53 Rev. 5.2.0 | OSCAL catalog 5.2.0 + SP 800-53B baseline profiles; SP 800-53A objectives; page citations from the 2020 PDF (OSCAL release locator for controls added later) | 1,014 active controls and enhancements in 20 families; LOW 149 · MODERATE 287 · HIGH 370 · PRIVACY 96 |
| NIST RMF | SP 800-37r2, extracted to `corpus/nist-rmf/rmf-tasks.json` | 47 tasks across 7 steps |
| SOC 2 (TSC 2017) | Visua's skeleton; overlaid with the verbatim criteria and points of focus from a licensed local copy | 61 criteria in 20 series across 5 categories |
| NIST AI RMF 1.0 | `ai-rmf-core.json`, extracted from the AI 100-1 PDF with page citations (NIST's CPRT and Playbook JSON differ from the final text in dozens of statements, so they are not used for statements); the AI RMF Playbook JSON; `genai-profile.json` extracted from NIST AI 600-1 | 72 outcomes in 19 categories across 4 functions (GOVERN 19, MAP 18, MEASURE 22, MANAGE 13); 460 Playbook suggested actions; the Generative AI Profile's 12 GAI risks and 212 actions, attached to 49 outcomes |
| U.S. state AI laws | `corpus/us-state-ai-laws/obligations.json`: obligations quoted from the enrolled statutes and adopted regulations, each with its section and page | jurisdiction → law → obligation; each obligation names the roles it falls on (developer, deployer, employer, operator…), its category and its effective date |
| Threat catalogs (never assessed) | `corpus/ai-threats/`: the MITRE ATLAS 2026.09 release YAML; the OWASP Top 10 for LLM Applications 2026 (and 2025) and for Agentic Applications 2026, extracted from the PDFs; NIST AI 100-2 E2025 from NIST's taxonomy export | ATLAS: 16 tactics, 120 techniques, 88 sub-techniques, 40 mitigations · OWASP LLM: 10 risks per edition · OWASP Agentic: 10 risks · AI 100-2: 5 objectives, 25 attacks |

Tests in `packages/frameworks/test` pin these official counts. Ingestion is
deterministic: the same corpus in produces the same data out.

**Framework profiles.** A graph can carry profiles layered on it
(`FrameworkGraph.profiles`). The NIST AI 600-1 Generative AI Profile is the first: its
12 risks live on the graph, and each of its 212 actions is attached to the AI RMF
outcome it serves (`attributes.profileActions`, with its risk tags and page). The AI
governance view rolls outcome progress up to each risk. For dense 3D views, AI RMF
nodes carry short labels in NIST AI 600-1's tag style (`GV-1.1`, `MS-2.11`); the
official ids stay everywhere else.

NIST publishes AI RMF crosswalks (to ISO/IEC 42001 and 23894, the OECD principles, the
EU AI Act and others) only as PDFs, and none targets a framework Visua models, so the
AI RMF has no requirement-to-requirement mapping set. It joins the Crosswalk Nexus
through the threat links below.

**Overlays.** NIST's AI security drafts attach to frameworks Visua already models
instead of becoming frameworks of their own (`data/overlays/`, `FrameworkOverlay`):

- the *Cyber AI Profile* (NIST IR 8596, initial preliminary draft), a CSF 2.0 Community
  Profile: for each of the 106 subcategories, general considerations and, per focus
  area (Secure, Defend, Thwart), a proposed priority, considerations and example
  informative references;
- *COSAiS* (SP 800-53 Control Overlays for Securing AI Systems), the annotated outline
  of the "Using and Fine-Tuning Predictive AI" overlay: 59 SP 800-53 controls, 11 of
  them annotated with tailoring and the NIST AI 100-2 attacks they address.

Every entry must attach to an existing node or ingestion fails. A workspace *adopts*
an overlay (and, for the profile, chooses focus areas). Adopting COSAiS brings its
controls into SP 800-53 scope as tailoring entries with a `source`, which dropping the
overlay removes again; the Cyber AI Profile's High priorities can raise CSF priorities
on request. Drafts are always labeled as drafts.

**Threat links.** `corpus/ai-threats/mappings.json` keeps every published link between
threats and requirements, each with its publisher and status. Ingestion turns them into
mapping sets in `data/threat-mappings/`, loaded into `registry.threatLinks`, apart
from the requirement crosswalk: a threat link says a requirement is relevant to a
threat, not that one requirement satisfies another.

| Authority | Status | Links |
|---|---|---|
| MITRE ATLAS 2026.09: mitigation → technique | final | 361 |
| OWASP LLM Top 10 2026, Appendix A: → AI RMF categories, ATLAS tactics, Agentic Top 10 | final | 102 |
| OWASP Agentic Top 10 2026, Appendix A: → LLM Top 10 2025 | final | 23 |
| NIST AI 100-2 E2025: attack → ATLAS mitigations it cites | final | 4 |
| NIST IR 8596 (Cyber AI Profile, draft): CSF 2.0 → ATLAS mitigations, → LLM03:2025 | draft | 183 |
| NIST COSAiS outline (draft): SP 800-53 control → AI 100-2 attack | draft | 21 |
| OWASP GenAI Security Crosswalk: OWASP → CSF 2.0, AI RMF, SP 800-53, ATLAS | unreviewed | 237 |
| OWASP LLM Top 10 2025: → ATLAS techniques | superseded | 15 |

Links to catalogs Visua does not model (MITRE ATT&CK, CWE, CSA AICM, OWASP AIVSS and
data-security entries, NIST AI 600-1 risks) stay on the threat as references. No
publisher maps ATLAS to CSF 2.0, SP 800-53 or the AI RMF, or the OWASP Top 10s to CSF
2.0 or SP 800-53, in a final document; the table above is everything there is.

OWASP renumbered its LLM Top 10 in 2026 (Supply Chain moved from LLM03 to LLM04). The
current edition keeps the bare codes (`LLM04`), the superseded one gains the year
(`LLM03-2025`), and each entry records its counterpart in the other edition.

**Crosswalk mapping sets.** Each set records its authority. The UI and the agents
show that authority wherever a mapping appears.

| Set | Authority | Links |
|---|---|---|
| SP 800-53 r5 → CSF 2.0 | NIST OLIR (concept crosswalk, 5.2.0) | 745 |
| SP 800-37r2 tasks → CSF 2.0 | NIST OLIR | 176 |
| SP 800-53 → RMF tasks | Visua editorial (flagged) | 77 |
| SP 800-53 r5 → TSC | AICPA workbook (local copy only) | 1,033 |
| CSF 2.0 → TSC | AICPA TSC → CSF v1.1, carried to 2.0 via NIST OLIR v1.1 → v2.0 (composed, weaker) | 157 |

**Corpus search.** Search is a BM25 index over two kinds of chunk. *Structured chunks*
hold one requirement each, with its text, examples or points of focus, and discussion.
*Page chunks* come from the core PDFs, one per page. The tokenizer keeps identifiers
such as `gv.oc-01` and `ac-2(1)` intact. A hit returns a verbatim quote and a page
citation. Chunks are stored per corpus (`chunks/<corpus>.json`), so licensed corpora
stay local.

## 2. Domain engine (`packages/core`)

- **Workspace.** An organization profile (industry, size, data types, drivers,
  environments, CSF tier, guidance mode). It also holds the enabled frameworks and their
  settings (the SOC 2 scope and report type; the RMF system, categorization, baseline,
  tailoring and authorization), agent autonomy per proposal type, and the trust-center
  settings.
- **RequirementState.** The state of one assessable requirement: current and target on
  a 0–4 scale per framework family, priority, owner, notes, `verifiedAt`, applicability
  and the rationale for it. The scales are:
  - CSF: tier-aligned, Not performed → Adaptive
  - SOC 2: control readiness, Not designed → Assured
  - RMF/800-53: OSCAL-aligned implementation status, Not implemented → Assessed — satisfied
- **Scope engine.** `scopeOf()` derives applicability from the settings: SOC 2
  categories, the 800-53B baseline plus the optional PRIVACY baseline, and tailoring
  decisions. A person's documented "not applicable" is stored separately as
  `userExclusion`. When scope changes, the settings are applied first and the person's
  exclusion is then re-applied. A settings change therefore never silently overwrites a
  documented human decision.
- **Status derivation** (`deriveStatus`). The first rule that matches wins:
  1. not applicable
  2. manual override
  3. **at risk**: a failing monitoring check, expired evidence on an implemented
     requirement, or overdue work
  4. **verified**: the target is met, the requirement is verified, and it has valid
     evidence
  5. **implemented**: the target is met
  6. **in progress**
  7. **not started**

  Each status comes with human-readable reasons.
- **Scoring.** Readiness is `min(current/target, 1)`, weighted by priority (critical 4,
  high 3, medium 2, low 1). It rolls up the hierarchy together with the gap count, gap
  score, evidence coverage and verified share.
- **Planner.** Turns gaps into tasks, ordered by governance first and then by
  priority × gap. Checklists come from the official material: CSF Implementation
  Examples, SOC 2 point-of-focus titles, SP 800-53A objectives, or the control statement
  items. Each task records its basis.
- **Crosswalk engine.** A bidirectional index with relationship strengths. It projects
  progress onto another framework with an explicit confidence. Projections only ever
  become *proposals*: a mapping is never evidence.
- **CSF Tiers** (the CSWP 29 Appendix B statements, verbatim) and **FIPS 199**
  categorization (the high-water mark selects the baseline).
- **U.S. state AI laws.** Laws impose obligations, not maturity levels, so obligations
  use a Visua-authored status scale (Not addressed → Met and reviewed). Nothing is in
  scope until the organization records, per law, the roles it holds under that law's
  own definitions (`LawSettings.applicability`, a decision reserved for approvers and
  recorded in the audit trail). `scopeOf()` then scopes exactly the obligations of
  those roles, and an obligation whose `until` date has passed drops out.
- **Threat coverage** (`apps/server/src/services/threats.ts`). Threat catalogs are
  never enabled or assessed. A threat's coverage is derived from the requirements linked
  to it, reached three ways: directly; through an ATLAS mitigation of it (CSF 2.0 →
  mitigation, from the Cyber AI Profile draft; mitigation → technique, from MITRE);
  or through the same OWASP entry in the other edition. A link to a group (an AI RMF
  category) stands for that group's units. A path is only as strong as its weakest
  link's status, and views choose the weakest status they count (final, final and
  draft, or all published links). Coverage on the 0–4 threat scale is the mean
  progress toward target of the linked requirements in the workspace's frameworks
  (4 when all are at target); a threat is *unmapped* without links at the chosen
  status and *out of scope* when its links lead only to frameworks the workspace does
  not follow. Tactics, editions and objectives pool their threats' coverage.
- **AI governance.** The NIST AI RMF defines no maturity tiers, so outcomes use a
  Visua-authored scale (Not addressed → Measured and improving). The AI system inventory
  lives in the AI RMF framework settings: purpose and context of use, the
  organization's role, lifecycle stage, generative or not, value-chain provider, risk
  tier, data and human oversight. Every inventory change goes through the service and
  lands in the audit trail. A generative system brings the Generative AI Profile into
  scope.

## 3. Agents (`packages/agents`)

**Contract.** Agents never touch storage. They read through `AgentHost` (workspace,
states, scores, tasks, evidence, policies, connectors, registry) and change things only
through `propose()`. The host decides from the workspace's autonomy settings whether a
proposal is applied at once or waits in the approvals inbox. Every step (plan, thought,
tool call, citation, proposal, message) is written to the run's **flight recorder** and
streamed over SSE. The 3D scene shows agent activity as violet comets on the
requirements being touched.

**Agents.** Copilot, Assessor, Planner, Policy Author, Evidence Collector, Crosswalk
Analyst, Audit Prep and Task Executor. They share 16 tools:

- Read tools: `workspace_overview`, `search_corpus`, `get_requirement`,
  `list_requirements`, `crosswalk`, `list_tasks`, `list_evidence`, `focus`
- Proposal tools: `propose_assessment`, `propose_target`, `propose_applicability`,
  `propose_task`, `propose_policy`, `propose_evidence`
- Action tools: `update_task`, `run_checks`

The system prompt sets two principles: *propose, don't mutate*, and *no citation, no
claim*.

**Claude runtime.** A streamed, manual tool loop on `client.beta.messages.stream`:

- Default model `claude-opus-5` (override with `VISUA_MODEL`), adaptive thinking with
  summarized display (reasoning appears in the flight recorder), and `effort` per agent.
- The static system prompt is prompt-cached.
- `eager_input_streaming`, with zod validation of every tool input before it runs.
- Server-side refusal fallbacks. `refusal`, `pause_turn` and `max_tokens` are handled.

**Offline playbooks.** Deterministic implementations of all eight agents on the same
tools. They are used when no API key is configured, and they are what the tests
exercise.

**Integrity rules in code:**

- The Task Executor records implementation guides as task notes and never files them
  as evidence.
- Marking something not applicable requires a written rationale.
- Evidence proposals are restricted, and the trust center publishes computed facts only.

**Licensed text gate.** When agents run on Claude, AICPA criterion text, points of
focus and AICPA corpus passages are replaced in tool results with Visua's summary and a
notice. They are sent only when the operator sets `VISUA_AICPA_AI_USE=permitted`.

## 4. Server (`apps/server`)

- **Storage** (`src/storage/`). One async driver interface with two backends, chosen by
  `VISUA_DATABASE_URL`: embedded SQLite (`node:sqlite`, the default, for local use,
  demos and tests) and PostgreSQL (`pg`, for production and several server instances).
  - Entities are JSON documents with indexed columns (TEXT in SQLite, JSONB in
    Postgres): workspaces, requirement states, tasks, evidence, policies, risks,
    connectors, checks, agent runs, proposals and activity, plus the tenancy and
    identity tables.
  - Versioned migrations run at startup under a lock, so several instances can start
    together. Version 1 also upgrades SQLite databases written before migrations
    existed (their workspaces move to a default organization).
  - Repositories resolve their connection through an `AsyncLocalStorage` transaction
    context: a service method and everything it calls commit or roll back together.
    Nested `store.transaction()` calls use savepoints.
- **Consistency.** Every service mutation runs in one transaction, holds a per-workspace
  lock (a Postgres advisory lock; SQLite serializes writers) and re-reads the workspace
  after taking it, so concurrent requests on different instances never lose updates.
  Bus events are published only after the transaction commits.
- **Identity and access** (`src/auth/`). Organizations (tenants), users, memberships
  with one role each, federated identities keyed by issuer and subject, sessions, API
  tokens and per-organization SSO connections.
  - Middleware resolves the principal (bearer API token or session cookie), requires
    one for every `/api` route except health, sign-in and public trust centers, checks
    the CSRF token and origin on writes, and sets security headers.
  - Every `/api/workspaces/:ws` route resolves the workspace, then the principal's role
    in the workspace's organization. No role means 404, so other tenants' workspaces do
    not exist for you. Reads need `workspace.read`, writes at least `work.write`, and
    routes that need more (`work.approve`, `workspace.configure`, `workspace.export`)
    declare it: marking a requirement not applicable or verified, or overriding its
    status, is an approver decision like tailoring. Roles map to capabilities in
    `packages/core/src/access.ts`. Requests another site started (`Sec-Fetch-Site:
    cross-site`) never change state, sign-in included.
  - OpenID Connect uses `openid-client` (authorization code + PKCE, state, nonce; the
    flow state is single-use and stored hashed). A flow is bound to the browser that
    started it by a short-lived pre-auth cookie, and it can only be started from Visua's
    own pages (`Sec-Fetch-Site`), so a captured callback URL cannot sign someone else in.
    A session created through an organization's own SSO connection is scoped to that
    organization, so one tenant's identity provider can never grant access to another
    tenant.
  - A connection's provider can sign in as any member on its domains, owners included,
    so choosing it (issuer, client, secret, domains; adding or removing a connection) needs
    `tenant.own`. Admins enable, disable and set provisioning. A secret never follows a
    connection to a new issuer or client, and the last enabled connection cannot be
    disabled while "Require SSO" is on.
  - A new identity links to an existing account by email only when the email is verified:
    the platform provider must say so (`email_verified`, or `VISUA_OIDC_TRUST_EMAIL=1`); an
    organization's own provider must not deny it. An organization's provider never
    renames someone who also belongs to other organizations.
  - The request principal travels in `AsyncLocalStorage`, so the service records it as
    `actorId` on every audit event without changing method signatures.
- **Audit trail.** Every change is an `ActivityEvent` with `seq`, `prevHash` and
  `hash = SHA-256(prevHash ‖ canonical(event))`, chained from a zero genesis. The
  event is written in the same transaction as the change it records, under the
  workspace lock, and a unique `(workspace_id, seq)` index means the chain can never
  fork. `GET /activity/verify` recomputes the chain and reports the first broken link.
- **Live events across instances.** On Postgres, every instance LISTENs on one channel
  per schema and NOTIFYs it with each event it publishes, so a browser connected to any
  instance sees changes made through any other. Events over NOTIFY's 8,000-byte limit
  travel with their identifying fields only (`partial: true`).
- **Derived caches.** Each audited change bumps the workspace's revision counter;
  readiness scores are cached per revision, so every instance sees fresh scores.
- **Agent host.** Agents read from a snapshot of the workspace taken when the run starts
  and refreshed after every change their own actions apply. `propose()` is async and
  goes through the service; run steps stream to the bus at once and are persisted in
  order through a queue, outside the caller's transaction.
- **API.** A Hono app with about 55 routes. They cover:
  - metadata, the recommendation engine and framework graphs
  - corpus search and corpus files (path-traversal safe; `.local/` never served)
  - workspace CRUD, framework settings, requirement states, tiers, and RMF
    categorize/tailor/authorize
  - tasks, the plan, evidence (with SHA-256), policies (lifecycle), risks, connectors,
    checks, agent runs, proposals and decisions
  - activity, crosswalk overview and rows, the SOC 2 description
  - overlays (adopt, drop, apply priorities), U.S. state AI laws (overview and
    applicability), AI governance
  - threat views: catalog overviews, one catalog's coverage (`?min=final|draft|unreviewed`),
    and the Nexus threat ring (`/crosswalk/threats`); a threat catalog's `frameworks/:fw/state`
    returns coverage in the shape of a state bundle for the 3D Observatory
  - exports and the public trust center
  - `GET /events` (SSE) pushes invalidations and agent steps to clients.
- **Connectors.** *Web posture* (HTTPS redirect, HSTS, TLS protocol and certificate
  expiry, security headers, `security.txt`) and *repository hygiene* (SECURITY.md,
  CODEOWNERS, CI, dependency automation, lockfile, secret patterns). Results become
  checks mapped to CSF, SOC 2 and 800-53 requirements. Passing results become hashed
  evidence.
- **Exports.**
  - CSF Organizational Profile (NIST template columns)
  - action plan, evidence index and SOC 2 PBC list (CSV)
  - readiness report (Markdown)
  - OSCAL 1.1.2 SSP and POA&M (JSON)

## 5. Web (`apps/web`)

- **Shell.** A rail with Mission control, Observatory, Plan, Evidence, Agents, Policies,
  Profile, Crosswalk, SOC 2, RMF, AI governance, State AI laws, AI threats, Reports,
  Organization and Settings. It also has a command palette
  (⌘K: search requirements or ask the copilot), a live approvals badge and toasts.
- **Observatory.** Instanced hex prisms in two layouts:
  - *constellation*: radial sectors per top-level group
  - *readiness terrain*: a honeycomb

  Height is the current level; translucent "gap glass" rises to the target. Task
  satellites, evidence crystals and agent comets orbit the prisms. The five lenses
  recolor the scene without moving anything.

  CameraControls fly to a selection. Labels are billboards with level-of-detail
  sizing, and large labels fade out when the camera comes close. Bloom and vignette
  are applied under a performance monitor.

  The outline is a full 2D twin with tree semantics and keyboard control (←/→ siblings,
  Enter drill in, Esc up, F frame, L lens, / filter). Deep links use `?select=`.
- **Crosswalk Nexus.** Frameworks sit as sectors on one ring and requirement groups as
  pillars. Pillar height is log(units) and color is group status. Arcs bundle the
  unit-level mappings, with width ∝ √count and a color gradient from the source
  framework to the target. Selecting a group flies the camera behind it, animates its
  arcs and lists every mapping with live status. A searchable group list is the
  keyboard path. An inner **threat ring** holds ATLAS tactics, the OWASP entries and
  the NIST AI 100-2 objectives in neutral ink (threat catalogs have no identity hue);
  their pillars take the status color of their pooled coverage, and their arcs bundle
  the threat links onto requirement groups.
- **Threat views.** The Threats page shows the ATLAS matrix (tactics as columns,
  techniques colored by coverage, with glyphs), the OWASP LLM Top 10 by edition, the
  OWASP Agentic Top 10 and the NIST AI 100-2 attacks by objective. A link filter (all
  published, final and draft, final only) is shared with the threat Observatory and
  the Nexus ring. The threat inspector lists the linked requirements with live status
  and why each is linked (every link with its publisher and status); a requirement's
  inspector lists the threats it helps address. Threat catalogs also open in the 3D
  Observatory, where height is the coverage level.
- **Laws.** The State AI laws page records which laws apply and in what role, shows an
  effective-date timeline, safe harbors and enforcement, and scopes the obligations.
- **Programs.**
  - *CSF*: Profile with bullet charts and the Tier assessment
  - *SOC 2*: scope, observation window, DC 200 checklist, readiness by series
  - *RMF*: lifecycle, FIPS 199, tailoring, authorization, readiness by family
- **Design system.** All colors, type, spacing, radii and component tokens come from
  `DESIGN.md`, compiled by `packages/design` into CSS variables and typed tokens.
  - Status colors are semantic and always come with a glyph.
  - Framework hues identify frameworks.
  - Aurora Violet is reserved for AI.

## 6. Testing

- `packages/*/test` and `apps/server/test` (Vitest, 98 tests):
  - official counts and citations
  - identifier normalization
  - the SOC 2 skeleton and the licensed overlay
  - agent licensing gates
  - API flows: onboarding, RMF categorize/tailor/OSCAL, SOC 2 scoping and DC 200,
    Nexus bundles
  - all eight offline agents, autonomy, connectors, evidence hashing
  - integrity guardrails: N/A rationale, scope preservation, audit-chain tamper
    detection, and no plan-as-evidence
  - AI governance: AI RMF official counts, the Generative AI Profile's risks and actions,
    the AI system inventory API, Playbook-based planning and the AI RMF profile export
  - overlays: the Cyber AI Profile's priorities for all 106 subcategories and COSAiS's
    59 controls, adoption and dropping through the API
  - state AI laws: nothing in scope until a role is recorded, exactly that role's
    obligations after, and out of scope again when the law no longer applies
  - threat views: official catalog counts, every link's endpoints, OWASP edition
    lineage, coverage under each link filter, coverage rising to "covered" as linked
    requirements reach target, ATLAS reached through mitigations, and the Nexus ring
  - storage (`storage.test.ts`): rollback and savepoints, a linear audit chain and no
    lost updates under two concurrent server instances, cross-instance cache
    invalidation, and the in-place upgrade of a pre-migration SQLite database
  - identity and access (`auth.test.ts`): sign-in requirements, tenant separation (404
    across organizations), every role's limits, CSRF, API tokens, the organization audit
    trail, and OpenID Connect against a mock provider (PKCE, replay, JIT provisioning,
    domain checks, tenant-scoped sessions, Require SSO)
  - `VISUA_TEST_DATABASE_URL=postgres://…` runs the server suites on Postgres, each run
    in its own schema
- `e2e/` (Playwright, 13 tests) runs against the production bundle served by the API,
  with an in-memory seeded database and WebGL on SwiftShader. It covers Home, the
  Observatory and its 2D twin, the Nexus, RMF, SOC 2, AI governance, an agent run with
  citations, the trust center, persona sign-in, a viewer's read-only view, tenant
  separation, organization administration, and the threat views (ATLAS matrix, the
  coverage inspector and its link filter, OWASP editions, the Nexus threat ring).

## 7. Known limitations

- Email domains of SSO connections are asserted by organization owners, not verified by
  DNS. Sessions from a connection are scoped to its organization, so a false claim cannot
  reach other tenants' data. But a false claim still routes that domain's people to the
  claiming organization's provider when they sign in (where a hostile provider could
  phish them), and first come holds a domain until an operator intervenes. DNS
  verification is on the roadmap; until then, run a shared installation only for
  organizations you trust with their domain claims.
- SAML and SCIM provisioning are not implemented; OpenID Connect covers the major
  identity providers.
- Connectors cover web posture and repository hygiene only. Cloud, IdP, HRIS and MDM
  integrations are on the roadmap.
- The SOC 2 structured extraction tooling is not in the repository. Installations
  without a local copy run on the skeleton.
- Threat coverage is only as good as the published links: most links to CSF 2.0 and
  SP 800-53 come from NIST drafts or OWASP's unreviewed community crosswalk, and 98 ATLAS
  techniques have no link to any requirement. Coverage is never a guarantee of
  protection. ATLAS case studies and the OWASP example scenarios are not ingested.
- The OWASP site serves its PDFs only to browsers, so `pnpm corpus:sync` cannot
  re-download them; the committed copies are hash-checked.
- State AI laws change often. The corpus records what was retrieved and when; Visua
  tracks obligations and is not legal advice.
