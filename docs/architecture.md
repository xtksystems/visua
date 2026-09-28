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
  those roles. Dates are applied when a score is read, not only when settings change:
  an obligation past its `until` date is out of scope ("No longer in effect after …"),
  and one whose effective date is still ahead is *upcoming*: it stays in scope so it can
  be assessed and planned, has a status of its own, and is scored apart (`upcoming`,
  "prepared") instead of counting toward today's readiness. Scores are cached per
  workspace revision and per hour, so date-driven changes (and overdue tasks or expired
  evidence) show up without any edit to the workspace.
- **Threat coverage** (paths in `packages/frameworks/src/threat-paths.ts`, coverage in
  `apps/server/src/services/threats.ts`). Threat catalogs are never enabled or assessed.
  A threat's coverage is derived from the requirements linked to it, reached three ways:
  directly; through an ATLAS mitigation of it (CSF 2.0 → mitigation, from the Cyber AI
  Profile draft; mitigation → technique, from MITRE); or through the same OWASP entry in
  the other edition (OWASP's own 2025 → 2026 rank migration, Figure 1 of the 2026
  edition). A link to a group (an AI RMF category) stands for that group's units. A path
  is only as strong as its weakest link's status, and views choose the weakest status
  they count (final, final and draft, or all published links).
  - Coverage weighs publications, not requirement counts. The linked requirements are
    grouped by the publication that links them and, within it, by route: an ATLAS
    mitigation, the other edition's entry, a group such as an AI RMF category, or the
    requirement itself. A route's progress is the mean progress toward target of its
    requirements in scope; a publication's is the mean over its routes; a threat's is the
    mean over its publications. So NIST's draft profile citing the 2025 Supply Chain entry
    on 67 CSF outcomes counts as one view of LLM04:2026, next to OWASP's own five
    AI RMF category links and the community crosswalk, and an AI RMF category counts
    once however many outcomes it holds. Every view is listed with its status.
  - On the 0–4 threat scale, 4 means every linked requirement in scope is at target; a
    threat is *unmapped* without links at the chosen status and *out of scope* when its
    links lead only to frameworks the workspace does not follow. Tactics, editions and
    objectives pool their threats' coverage.
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
  `propose_task`, `propose_policy`, `propose_evidence`, `update_task` (a task update)
- `run_checks` runs the workspace's connectors, records their checks and proposes each
  passing check as evidence

Every write is a proposal. The system prompt's operating principles are *propose, don't
mutate*; *no citation, no claim*; each framework's vocabulary (state-law obligations
apply only to the roles an organization recorded); and *threat catalogs are views*:
`get_requirement` on a threat returns the requirements publishers link to it, grouped
by publication with each link's status, and proposal tools refuse threats, frameworks
the workspace has not enabled, and levels on requirements out of scope.

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
  - An organization's provider is its owner's choice, so every request to it (discovery,
    token, keys) goes through `auth/egress.ts`: private, loopback, link-local and other
    non-public addresses are refused unless the operator allows the host
    (`VISUA_OIDC_PRIVATE_ISSUERS`). The check runs in the connection's own DNS lookup, on
    the addresses the socket will use, so DNS rebinding cannot bypass it, and responses are
    capped at 1 MB. Literal private addresses and `localhost` are refused when the issuer is
    saved. The platform provider is the operator's own configuration and is not filtered.
  - A connection's email domains are proven by DNS: each claimed domain gets a token, and
    once `_visua-challenge.<domain>` carries `visua-domain-verification=<token>` an admin
    verifies it (the lookup runs outside any transaction; the result is recorded and
    audited under the domain lock). Only verified domains route sign-ins (`discover`),
    link or provision people, and count for "Require SSO". Pending claims from several
    organizations can coexist; a partial unique index lets only one hold a domain
    verified. Migration 3 grandfathered domains claimed before verification existed, and
    `VISUA_SSO_DOMAIN_VERIFICATION=off` trusts domains as claimed.
  - Domains proven by DNS are re-checked on a schedule (`VISUA_SSO_DOMAIN_RECHECK_HOURS`,
    default daily, at most hourly): a clean negative answer — NXDOMAIN, NODATA, or a TXT set without the
    expected value — is the only kind of miss that counts against a domain; any other lookup
    error just reschedules the next try. A domain's standing moves from verified to failing
    at its first miss, and from failing to lapsed if it is still missing when its grace
    period (`VISUA_SSO_DOMAIN_RECHECK_GRACE_DAYS`, default a week) ends; found again, it
    recovers to verified. A lapsed domain admits no one new and releases its claim, so
    another organization can prove it, but keeps routing its own members (`byDomain`) so
    nobody is locked out. While another connection holds a lapsed domain, the old one is not
    looked up (the page shows it as held by another organization); it is looked at again an
    interval later, so it can recover once that holder is gone. Every instance's ticker
    claims up to 25 due domains under the domain lock with a 15-minute lease, looks each one
    up outside any transaction, and records the result in its own transaction, with an
    audit entry under the actor "Domain re-check" only when the standing changes (failing,
    lapsed, recovered); a manual Verify clears a failure the same way. Keep the instances'
    clocks NTP-synced: skew beyond the 15-minute lease only causes a duplicate lookup, since
    recording an outcome is idempotent. Grandfathered and trusted domains were never proven
    and are never re-checked.
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
- **Transfer.** JSON, JavaScript and CSS are compressed (`hono/compress`; the SP 800-53
  state bundle is 518 KB and travels as 16 KB). Sign-in responses carry the session's
  CSRF token and are never compressed, so compression cannot become an oracle on it;
  server-sent events are never compressed either. Framework graphs and `/api/meta`
  revalidate by ETag, and the web build's hashed assets are cached as immutable.
- **Connectors.** *Web posture* (HTTPS redirect, HSTS, TLS protocol and certificate
  expiry, security headers, `security.txt`) and *repository hygiene* (SECURITY.md,
  CODEOWNERS, CI, dependency automation, lockfile, secret patterns). Results become
  checks mapped to CSF, SOC 2 and 800-53 requirements. When a person runs a connector,
  passing results become hashed evidence at once; when an agent runs one (`run_checks`),
  it proposes each passing result as evidence, and approval files it from the recorded
  check (edits cannot change what the check observed).
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
  - Below 1024px the rail folds into a menu opened from the top bar (DESIGN.md › Layout)
    and the inspector becomes a bottom sheet with a handle. Two-pane pages stack below
    900px; Agents and Policies show one pane at a time. No page, panel or table scrolls
    sideways at 1024px or on a phone (the ATLAS matrix scrolls within itself): a table's
    secondary columns hide when its panel is narrow (container queries on `.table-box`)
    or the screen is a phone, the FIPS 199 editor becomes one card per row, and chart
    rows wrap.
  - Breakpoints live in `lib/media.ts` (`NARROW`, `PHONE`, `split()`) and `global.css`.
- **Observatory.** Instanced hex prisms in two layouts:
  - *constellation*: radial sectors per top-level group
  - *readiness terrain*: a honeycomb

  Height is the current level; translucent "gap glass" rises to the target. Task
  satellites, evidence crystals and agent comets orbit the prisms. The five lenses
  recolor the scene without moving anything.

  CameraControls fly to a selection. Bloom and vignette are applied under a performance
  monitor. A selection compiles no shaders: the programs only the selection halo, its path
  and agent comets use are compiled while the scene loads (the real components, drawn for
  a few frames hidden inside the core, then kept hidden so their programs stay alive, and
  drawn again when the performance monitor drops post-processing, since drawing straight
  to the screen needs other programs), and
  line points are memoized, because drei's `Line` disposes its material whenever its points
  change and three.js then deletes the shared program. Units out of scope (an undecided law's obligations, controls outside the
  baseline) shrink to small dots; nodes with no unit below them (ATLAS's mitigations)
  stay in the outline and the inspector but take no place in the scene.

  *Labels* are drawn in screen space (`scene/ScreenLabels.tsx`): code-sm and label-caps
  at 11–13px, placed by priority whenever the camera moves, and hidden rather than drawn
  where they would overlap another label, a HUD panel or the canvas edge. Sector titles
  sit outside the ring on the side they face, and a sector whose title does not fit
  keeps its code (twenty SP 800-53 families, sixteen ATLAS tactics); a ring of up to 40
  labeled groups (the state laws) moves out so their codes have room.

  *Framing* (`scene/framing.ts`): the projection is offset so the camera target sits in
  the middle of the area no HUD band covers, so the scene re-frames when the inspector
  opens or a bottom sheet covers the canvas; the home view fits the ring and its
  titles inside the canvas and clear of every panel. The HUD's top bar wraps rather than
  overlaps, its chips become selects on a narrow canvas (container queries on the
  stage), and the legend collapses to the lens name and swatches.

  Below 1024px the outline opens over the scene; phones open the Observatory on its
  outline with the 3D scene one tap away (DESIGN.md › Layout).

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
  the threat links onto requirement groups. A threat arc shows the status of its
  strongest link: final solid, draft dashed, unreviewed dotted.

  Labels use the same screen-space layer (framework names with an identity swatch, the
  threat ring's codes once a pillar is in focus) and the camera frames the ring around
  the HUD. Arcs are batched into a few draw calls by width, opacity and dash style (the
  focused pillar's arcs are drawn again on top). Below 1024px the scene and its details
  stack as one scrolling page.
- **Threat views.** The Threats page shows the ATLAS matrix (tactics as columns,
  techniques colored by coverage, with glyphs), the OWASP LLM Top 10 by edition, the
  OWASP Agentic Top 10 and the NIST AI 100-2 attacks by objective. A link filter (all
  published, final and draft, final only) is shared with the threat Observatory and
  the Nexus ring. In the matrix each tactic is a labeled group; the matrix takes one tab
  stop and arrow keys move within and across tactics. The threat inspector groups the
  linked requirements as coverage counts them: a summary per publication (status,
  requirements at target, progress), then collapsible publication groups split by route
  (directly, through an ATLAS mitigation, through the other edition's entry, through a
  group), with live status and why each is linked; a requirement's inspector lists the
  threats it helps address. Threat catalogs also open in the 3D Observatory, where
  height is the coverage level.
- **Laws.** The State AI laws page records which laws apply and in what role, shows an
  effective-date timeline, safe harbors and enforcement, and scopes the obligations.
  The timeline has one column per month (height: obligations taking effect; filled in
  force, outlined upcoming), labels only the next wave and the largest month in force,
  shows every month's laws on hover and keyboard focus, and has a list view.
- **Programs.**
  - *CSF*: Profile with bullet charts and the Tier assessment
  - *SOC 2*: scope, observation window, DC 200 checklist, readiness by series
  - *RMF*: lifecycle, FIPS 199, tailoring, authorization, readiness by family
- **Build.** Vite (rolldown) splits the bundle with code-splitting groups: packages in
  `vendor`, the 3D stack (three.js, react-three-fiber, drei, postprocessing) in `three`,
  loaded only by the Observatory and the Nexus. Pages are lazy routes.
- **Design system.** All colors, type, spacing, radii and component tokens come from
  `DESIGN.md`, compiled by `packages/design` into CSS variables and typed tokens.
  - Status colors are semantic and always come with a glyph.
  - Framework hues identify frameworks.
  - Aurora Violet is reserved for AI.

## 6. Testing

- `packages/*/test`, `apps/server/test` and `apps/web/test` (Vitest, 199 tests):
  - official counts and citations
  - identifier normalization
  - the SOC 2 skeleton and the licensed overlay
  - agent licensing gates
  - API flows: onboarding, RMF categorize/tailor/OSCAL, SOC 2 scoping and DC 200,
    Nexus bundles
  - all eight offline agents, autonomy, connectors, evidence hashing
  - integrity guardrails: N/A rationale, scope preservation (documented exclusions
    survive every scope change), audit-chain tamper detection, no plan-as-evidence, and
    assessments refused on threat catalogs, frameworks a workspace has not enabled and
    requirements out of scope, whether a person or an agent's proposal asks
  - agents: threat, AI RMF and state-law codes read out of a question; the Copilot
    explaining an ATLAS technique through its published links (and proposing nothing)
    and a state-law obligation from the statute with section, page, dates and roles;
    agents proposing passing checks as evidence, filed from the recorded check on
    approval; licensed text copied into tasks withheld from the model
  - the trust center publishing only the frameworks a workspace chooses (state AI laws
    off by default), and transfer: compressed responses, ETag revalidation, and sign-in
    responses left uncompressed
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
    invalidation, the in-place upgrade of a pre-migration SQLite database, migration 4's
    `lapsed_at`/`next_check_at` columns surviving an unrelated save and routing to a
    lapsed claim, and the first re-check schedule spread over a day when upgrading
    existing DNS-proven domains
  - identity and access (`auth.test.ts`): sign-in requirements, tenant separation (404
    across organizations), every role's limits, CSRF (sign-in included), API tokens, the
    organization audit trail, and OpenID Connect against a mock provider (PKCE, replay,
    the browser that started the flow, JIT provisioning, domain checks, tenant-scoped
    sessions, Require SSO, owner-only provider changes, verified email linking,
    same-site return paths), organization providers kept off private addresses unless the
    operator allows them (`egress.test.ts`: address classes, literal and DNS-resolved
    refusals, the response cap), DNS proof of SSO domains before they route or admit
    anyone, first-to-prove ownership, and the upgrade that grandfathers existing domains
    (`storage.test.ts`)
  - re-checking SSO domains proven by DNS: classifying a lookup, the standings a re-check
    moves a domain through (failing, lapsed, recovered), re-check settings, and the
    ticker's timing and error handling (`domain-recheck.test.ts`); end to end on SQLite
    and Postgres (`sso-recheck.test.ts`): the daily schedule, the grace period, DNS
    trouble never counting against a domain, a Require-SSO organization staying signed in
    through a lapse, another organization proving a lapsed domain, two instances claiming
    the same batch without a duplicate lookup, a result dropped when the challenge
    changed meanwhile, and, on Postgres, the domain lock
  - the Postgres event relay (`relay.test.ts`): reconnection with backoff, failing fast
    at startup, NOTIFY payloads sized in bytes
  - `VISUA_TEST_DATABASE_URL=postgres://…` runs the server suites on Postgres, each run
    in its own schema
  - 3D labels (`apps/web/test`): placed for the camera of the frame being drawn, not the
    previous one (the camera controls leave its world matrix to the renderer), and shown
    and hidden by opacity, a compositor change, so a busy machine never draws new
    positions over old raster
- `e2e/` (Playwright, 22 tests) runs against the production bundle served by the API,
  with an in-memory seeded database and WebGL on SwiftShader. It covers Home and Mission
  control's program links, the Observatory and its 2D twin, the Nexus, RMF, SOC 2, AI
  governance, an agent run with citations, the trust center and its per-framework
  choice, persona sign-in, a viewer's read-only view, tenant separation, organization
  administration, the threat views (ATLAS matrix and its keyboard navigation, the
  coverage inspector and its link filter, OWASP editions, the Nexus threat ring), a
  threat catalog in the Observatory, no shader compiled by a selection in the Observatory (with post-processing and after slow frames drop it), the State AI laws page (roles deciding scope, the
  timeline and its list view, obligations in 3D), and layout: labels in the 3D scenes
  stay inside the canvas and clear of the HUD and of each other at 1440 and 1024
  pixels, the rail folds into a menu on a phone, no page, panel or table scrolls sideways
  at 1024 pixels or on a phone, and the Observatory opens on its outline on a phone.
- `pnpm screens` (`scripts/screens.ts`) photographs every view at 1440×900, 1024×768
  and 390×844 into the git-ignored `.screens/` folder, with a contact sheet and a
  report of horizontal overflow and console errors; `--docs` regenerates the README
  images.

## 7. Known limitations

- Domains grandfathered by the upgrade, or trusted while `VISUA_SSO_DOMAIN_VERIFICATION=off`,
  were never proven and are never re-checked; on a shared installation, ask their
  organizations to remove and verify them again. Domains proven by DNS are re-checked
  every `VISUA_SSO_DOMAIN_RECHECK_HOURS` (default 24) and lapse after
  `VISUA_SSO_DOMAIN_RECHECK_GRACE_DAYS` (default 7) without their record; with re-checks
  off, no record is looked up again and a failing domain never lapses.
- An organization's identity provider may be on a host the operator allows on a private
  address (`VISUA_OIDC_PRIVATE_ISSUERS`); every organization can then point its connection
  at that host. Allow only the internal providers you run, not `*`, in a shared
  installation.
- SAML and SCIM provisioning are not implemented; OpenID Connect covers the major
  identity providers.
- The demo's historical assessment levels are written to storage in bulk when it is
  seeded (they are history, not changes anyone made); everything after seeding goes
  through `VisuaService` and the audit trail.
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
