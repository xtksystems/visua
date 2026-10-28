Independent full-application review: Visua
Run: app-review-20261002; node: governance; integration owner: Codex.
Source: /Users/artem/visua, branch feat/light-workspace-design, commit 1dc5ed126dced52c364b403dd29f9ce62829b4da.
User request: commit/push all changes, review the full Visua app using Opus 5.5, and plan the next development phase.
Your bounded lens: Review agents, tool permissions, proposal validation/autonomy, licensed-text boundaries, corpus ingestion/search/citations, framework scope/status/scoring, threat mappings, trust claims, and report/export fidelity. Trace whether recorded facts support every emitted claim. Recommend the next development phase, comparing evidence foundations, real connector depth, framework expansion, identity features, and auditor workflows. Do not give legal advice or claim corpus laws are current.

Access: packet only, no tools, no repository or web access. All numbered contents below are actual source. Review read-only. Never claim you ran tests or inspected anything outside this packet. Other Opus lanes cover the complementary concerns; focus on your assigned lens and cite exact paths/line numbers.
Acceptance: review all delivered areas; return supported concrete findings, strengths, and ordered development opportunities. Defects require a reproducible trigger, mechanism, source evidence and practical recommendation. Missing roadmap capabilities are opportunities, not bugs. Distinguish source inference from executed observations. Return a complete schema-conforming JSON object. At most 12 findings and 8 opportunities; prefer important actionable items.
Budget: one call, 420 seconds, four turns, at most 20,000 output words; one total transient correction across all three lanes, no authentication/model fallback.
Preserve: tenant/capability gates, principal actor identity, transactional hash-chained audit, approved agent proposals, evidence acceptance/freshness, corpus licensing and citations, threat views distinct from assessment, tokens and accessible 2D navigation.
Scope limits: no implementation or remote mutation; no live paid application agent execution, production validation, hardware GPU performance claims, or legal-corpus freshness attestation. Dates are reviewed as code behavior, not confirmation of current laws.
Fresh verification run by lead before this packet: typecheck completed, SQLite Vitest reports 214 passed / 2 skipped; integration evidence will be independently run and reconciled.
Output priorities: distinguish launch blockers from growth features. A proposed next phase must include acceptance evidence and dependencies; favor one coherent delivered user workflow.


FILE CLAUDE.md SHA256 f07489e80dd75e51209f766e954d46239fe79809451bffd33defd6269ad3ba1e
1: # Working in the Visua repository
2:
3: Visua is a pnpm monorepo (Node ≥ 22.18, native TypeScript, `node:sqlite`). Read
4: `README.md` for the product and `docs/architecture.md` for the internals.
5:
6: ## Commands
7:
8: - `pnpm dev`: API on :8787 (seeds the demo) and web on :5173
9: - `pnpm typecheck`, `pnpm test` (Vitest), `pnpm test:e2e` (Playwright against the production build)
10: - `VISUA_TEST_DATABASE_URL=postgres://… pnpm test` runs the server suites on Postgres too
11:   (each run uses its own schema and drops it afterwards)
12: - `pnpm design:lint` after any change to `DESIGN.md`, then `pnpm design:tokens`
13: - `pnpm ingest` after any change to `corpus/` or `packages/frameworks/src/ingest/*`
14: - `pnpm corpus:verify` to hash-check the corpus
15: - `pnpm screens` photographs every view at 1440×900, 1024×768 and 390×844 into `.screens/`
16:   (git-ignored) with a contact sheet and an overflow report; `pnpm screens --docs` refreshes
17:   the README images
18:
19: Run `pnpm typecheck && pnpm test` before committing. Run `pnpm test:e2e` when you
20: change the web app. `pnpm check` is the local CI (there is no hosted CI): a licensing
21: guard (no git-ignored file tracked or staged), typecheck, unit tests on SQLite and on
22: Postgres (`VISUA_TEST_DATABASE_URL`, or a throwaway Docker container), e2e, corpus
23: hashes and the DESIGN.md lint; `--quick` runs the first three.
24:
25: ## Rules
26:
27: - **Design.** All visual values come from `DESIGN.md` tokens: CSS variables
28:   (`var(--color-…)`) in the web app, and `designSystem` / `TOKENS` in scenes. Never
29:   hard-code colors.
30:   - Status colors are semantic and always paired with a glyph or label.
31:   - Aurora Violet (`tertiary`) is reserved for agent activity. AI governance frameworks
32:     (NIST AI RMF) use Circuit Copper (`framework-ai`), never violet.
33: - **Citations.** Framework statements must come from the ingested graphs or the
34:   corpus index, with a citation (document id, locator, page). Do not write requirement
35:   text by hand. The one exception is the Visua-authored SOC 2 skeleton, which must stay
36:   in Visua's own words.
37: - **Official counts are tested.** If an ingest change moves a count (106 CSF outcomes,
38:   1,014 SP 800-53 units, 47 RMF tasks, 61 TSC criteria, 72 AI RMF outcomes, 12 GAI
39:   risks and 212 Generative AI Profile actions; ATLAS 2026.09's 16 tactics, 120
40:   techniques, 88 sub-techniques and 40 mitigations; 10 entries in each OWASP Top 10;
41:   25 NIST AI 100-2 attacks), the change is wrong unless the official source changed.
42:   The state-law counts (26 laws, 187 obligations) are Visua's compilation: change them
43:   only with a deliberate corpus refresh.
44: - **Threat catalogs are views, not frameworks.** Never enable or assess a threat catalog.
45:   Its coverage derives from published threat links (`registry.threatLinks`), and every
46:   link keeps its authority and status (final, draft, unreviewed, superseded). Don't add
47:   links Visua wrote itself, and keep them out of the requirement crosswalk.
48: - **Law codes are node ids.** Never change a published law code; add new ones to
49:   `CODE_OVERRIDES` in `packages/frameworks/src/ingest/state-laws.ts` when needed.
50: - **AI RMF text comes from the PDF-based extraction** (`corpus/nist-ai-rmf/ai-rmf-core.json`).
51:   NIST's own CPRT and Playbook JSON differ from the final AI 100-1 text in dozens of
52:   statements; don't switch the ingest to them.
53: - **Licensing.** Never commit framework text whose license does not allow
54:   redistribution (AICPA, ISO, PCI SSC, MITRE SAFE-AI…), including derived JSON,
55:   mappings and search chunks; keep such files in a git-ignored `.local/` folder.
56:   Openly licensed catalogs may be committed with their notices: MITRE ATLAS
57:   (Apache-2.0) and OWASP (CC BY-SA 4.0; files derived from OWASP text stay CC BY-SA,
58:   see `packages/frameworks/data/NOTICE.md`).
59:   - `.gitignore` covers `corpus/aicpa-soc2/**` (except `manifest.json` and
60:     `STRUCTURE.md`), `packages/frameworks/data/aicpa-*.json`,
61:     `mappings/*tsc-2017*.json` and `chunks/aicpa-soc2.json`. Check `git status` before
62:     committing.
63:   - Licensed text must pass through `modelText()` / `licensedTextToModel()` in
64:     `packages/agents` before it can reach a language model.
65: - **Agents propose, people approve.** Agents change state only through
66:   `host.propose()`. Never let an agent file a plan, guide or template as evidence, mark
67:   anything verified, or make an authorization or audit decision.
68: - **Tenancy and access.** Every workspace route must go through `workspaceAccess`
69:   (404 across organizations) and declare any capability above its floor with `need()` or
70:   `requireCapability()`. Never trust a client-supplied actor: the actor is the signed-in
71:   principal. Developer sign-in must stay refused in production.
72: - **Integrity.**
73:   - Every state change goes through `VisuaService` so it lands in the hash-chained
74:     audit trail, in the same transaction. Storage is async: `await` every store and
75:     service call, never hold a transaction open across network calls, and don't
76:     publish bus events directly from a mutation (the service publishes after commit).
77:   - "Not applicable" requires a rationale, and scope recomputation must preserve
78:     `userExclusion`.
79: - **Claude API.** The default model is `claude-opus-5` (`VISUA_MODEL` overrides it).
80:   Use adaptive thinking, streaming, prompt caching of the system prompt, and zod
81:   validation of tool inputs. Follow the existing pattern in
82:   `packages/agents/src/claude.ts`.

FILE AGENTS.md SHA256 79b0d193cc2456596c657ceb3ca30482bc9eb11f80b0eb5e585409c158e23258
1: <!-- codex-context:begin -->
2: ## Codex project context
3:
4: At session start, read the files declared by `startup_context` in
5: `.codex-context/system.json`. If the field is absent, read
6: `.codex-context/workflow.md` and `.codex-context/project.md`. Report invalid or
7: missing declared files. For substantial or resumed work, also read
8: `.codex-context/workflow.md`; otherwise load only task-relevant extra context.
9: Keep existing project instructions and canonical documentation authoritative.
10: Before editing a nested area, read its applicable instruction files.
11:
12: Use `$prime` to orient at session start and `$wrapup` to preserve results at
13: session end. If those skills aren't installed, follow the equivalent procedures
14: in `.codex-context/workflow.md`. Treat `/prime` and `/wrapup` messages as those
15: requests when the client passes them through. Carry the task's relevant
16: invariants into implementation, and verify behavior before reporting completion.
17: <!-- codex-context:end -->

FILE README.md SHA256 ffcce1bce68f3e23f1c43fcddb1013da2a29b5856d0d16fbb3aab839068d0fa6
1: # Visua
2:
3: **See your compliance. Prove every claim.**
4:
5: Visua is an AI-first, agentic compliance automation platform with a working 3D interface.
6: Frameworks are rendered as navigable space: requirements are objects, implementation
7: maturity is height, the gap to target is visible glass, tasks and evidence orbit the
8: requirements they serve, and agents move through the scene as they work. Every agent
9: action is cited to the official framework text, recorded in a flight recorder and applied
10: only after a person approves it, unless that person has granted autonomy for that kind
11: of change.
12:
13: Visua is built for any niche and any cyber-maturity level. It starts with NIST CSF 2.0 as
14: the common language, then adds SOC 2 and the NIST Risk Management Framework with
15: SP 800-53 Rev. 5. The frameworks are ordered by increasing depth, and one program
16: connects them. For organizations that build or deploy AI, the NIST AI RMF with its
17: Generative AI Profile adds an AI governance program on the same foundation, NIST's
18: draft Cyber AI Profile and SP 800-53 AI overlays specialize CSF and SP 800-53 for AI
19: systems, the U.S. state AI laws become scoped obligations, and MITRE ATLAS and the
20: OWASP Top 10s show which AI threats the program addresses.
21:
22: ![The Observatory: NIST CSF 2.0 as a navigable constellation](docs/images/observatory-csf.jpg)
23:
24: ## What it does
25:
26: | Area | What you get |
27: |---|---|
28: | **Observatory (3D + 2D twin)** | Every framework as a constellation or readiness terrain: 106 CSF outcomes, 61 SOC 2 criteria, all 1,014 SP 800-53 controls and enhancements, 47 RMF tasks, 72 AI RMF outcomes and 187 state-law obligations. Lenses (status, gap, evidence, priority, crosswalk, AI overlay) recolor the same space. Threat catalogs open in the same space with height = coverage. Labels are drawn at the type scale and never overlap each other or the HUD, and the camera frames the scene around the panels at any window size. A keyboard-first outline mirrors every object (on phones it opens first, with the 3D scene one tap away), and the scene respects reduced motion. |
29: | **Crosswalk Nexus (3D)** | All frameworks on one ring, with 2,188 authoritative mappings bundled into arcs (998 in a fresh clone; the AICPA sets need the local AICPA copy): NIST OLIR (CSF 2.0 ↔ SP 800-53 5.2.0, ↔ SP 800-37r2), AICPA (TSC ↔ SP 800-53 r5), and composed and editorial sets that are labeled as such. An inner **threat ring** bundles the published links from ATLAS tactics, OWASP entries and NIST AI 100-2 objectives onto requirement groups; each arc shows its strongest link's status (final solid, draft dashed, unreviewed dotted). Select a group to see every unit-level mapping with live status on both sides. *A mapping is never evidence.* |
30: | **Agents** | Eight glass-box agents: Copilot, Assessor, Planner, Policy Author, Evidence Collector, Crosswalk Analyst, Audit Prep and Task Executor. They run on Claude (streamed tool loop, adaptive thinking, prompt caching, server-side fallbacks) or as deterministic offline playbooks. Either way they use the same tools, citations and approval flow: the Copilot answers about a state law or an ATLAS technique with citations, and even an automated check's result reaches the evidence locker only as a proposal. |
31: | **NIST CSF 2.0** | Organizational Profiles (Current/Target, official CSV template), the CSWP 29 Tier self-assessment, 363 Implementation Examples as checklists, maturity-adaptive targets and priorities. |
32: | **SOC 2** | Scope by Trust Services Category, Type 1 or Type 2, and the observation window. Readiness by series, the DC 200 system-description checklist drafted from recorded facts, and a PBC request list. |
33: | **NIST RMF / SP 800-53** | The seven-step lifecycle. FIPS 199 categorization (high-water mark) selects the SP 800-53B baseline. Tailoring requires a rationale. The authorization decision is recorded, never made by Visua. OSCAL 1.1.2 SSP and POA&M export. |
34: | **AI governance (NIST AI RMF)** | An AI system inventory (purpose, role, lifecycle stage, risk tier, data, human oversight) and readiness across GOVERN, MAP, MEASURE and MANAGE, with 460 Playbook suggested actions as checklists. When any system is generative, the NIST AI 600-1 Generative AI Profile applies: its 12 GAI risks and 212 actions, tracked through the outcomes they attach to. Texas's TRAIGA makes substantial compliance with that profile an affirmative defense. An AI RMF profile export and an AI governance policy template are included. |
35: | **AI security overlays (NIST drafts)** | The Cyber AI Profile (NIST IR 8596 iprd) on CSF 2.0: considerations and a proposed priority for each of the 106 subcategories per focus area (Secure, Defend, Thwart), adoptable per workspace, with an overlay lens and an optional priority raise. COSAiS (SP 800-53 Control Overlays for Securing AI Systems) on SP 800-53: the predictive-AI overlay's 59 controls brought into scope on adoption, with their tailoring and NIST AI 100-2 attacks. Drafts are always labeled as drafts. |
36: | **U.S. state AI laws** | 26 laws and regulations in California, Colorado, Illinois, Maine, New York, New York City, Texas and Utah, with 187 obligations quoted from the enrolled statutes and adopted regulations. Record the role you hold under each law's own definitions (developer, deployer, employer, operator…) and Visua scopes exactly those obligations, with an effective-date timeline (by month, with a list view), safe harbors (including those that recognize the NIST AI RMF) and enforcement. Readiness counts the obligations in force today; upcoming ones are prepared for and tracked apart, and ended ones drop out on their date. A tracking tool, not legal advice. |
37: | **AI threat views** | MITRE ATLAS 2026.09 (the tactic × technique matrix), the OWASP Top 10 for LLM Applications 2026 (and 2025, with each entry's counterpart) and for Agentic Applications 2026, and NIST AI 100-2's 25 attacks. Threats are never assessed: coverage is derived from the requirements that MITRE, OWASP and NIST link to each threat, directly, through an ATLAS mitigation or through the other OWASP edition. Every link shows its publisher and status (final, draft, unreviewed, superseded), and one filter decides which count. A threat's linked requirements are grouped by publication and by route, and the ATLAS matrix is navigable with the arrow keys. |
38: | **Evidence & monitoring** | Evidence with provenance (source, SHA-256, reviewer, validity window, freshness), plus connectors for web posture (TLS, HSTS, security headers, security.txt) and repository hygiene. |
39: | **Integrity guardrails** | A hash-chained, tamper-evident audit trail. "Not applicable" requires a written rationale, and scope changes never overwrite it. Agents never file plans as evidence. The trust center publishes computed facts only. Visua never issues audit opinions. |
40:
41: | | |
42: |---|---|
43: | ![Crosswalk Nexus](docs/images/crosswalk-nexus.jpg) | ![SP 800-53 Rev. 5, full catalog](docs/images/observatory-800-53.jpg) |
44: | ![Overview dashboard with readiness summary and labeled navigation](docs/images/home.jpg) | ![NIST RMF program](docs/images/rmf.jpg) |
45: | ![AI governance with the NIST AI RMF](docs/images/ai-governance.jpg) | ![SOC 2 program](docs/images/soc2.jpg) |
46: | ![MITRE ATLAS matrix with coverage from linked requirements](docs/images/threats-atlas.jpg) | ![The Nexus threat ring: OWASP LLM01 linked to AI RMF, SP 800-53 and CSF groups](docs/images/nexus-threat-ring.jpg) |
47:
48: ## Quick start
49:
50: Requirements: **Node.js ≥ 22.18** (native TypeScript and `node:sqlite`) and **pnpm 10**.
51:
52: ```sh
53: pnpm install
54: pnpm dev            # API on :8787 (seeds the Northwind Health demo), web on :5173
55: ```
56:
57: Open <http://localhost:5173> and pick a demo persona on the sign-in screen (developer
58: mode). Each persona has a different role in the fictional Northwind Health organization;
59: Taylor Brooks belongs to a second organization, Contoso Bank, and cannot see Northwind's
60: data. The framework data is pre-built in `packages/frameworks/data/`. To rebuild it from
61: the local corpus, run `pnpm ingest`.
62:
63: Production-style run: `pnpm build && pnpm start`. The API serves the built web app on
64: :8787.
65:
66: ### Local Docker deployment
67:
68: Docker Compose builds the web app and starts the API at <http://localhost:8787>:
69:
70: ```sh
71: docker compose up -d --build
72: docker compose ps
73: ```
74:
75: Open the URL and choose a demo persona. The Compose setup binds only to this Mac,
76: uses password-less developer sign-in and offline agent playbooks, and keeps the
77: SQLite database in the `visua-data` Docker volume. The volume remains when you
78: stop the app with `docker compose down`.
79:
80: If port 8787 is occupied, set `VISUA_HOST_PORT` before starting Compose; for
81: example, `VISUA_HOST_PORT=8788 docker compose up -d --build` opens the app at
82: <http://localhost:8788>. Use `docker compose logs -f visua` to inspect startup.
83:
84: ### AI engine
85:
86: | Variable | Default | Meaning |
87: |---|---|---|
88: | `ANTHROPIC_API_KEY` | — | Enables Claude-powered agents (`VISUA_AGENT_MODE=auto`). Without it, agents run the offline playbooks. |
89: | `VISUA_AGENT_MODE` | `auto` | `auto`, `claude` or `offline` |
90: | `VISUA_MODEL` | `claude-opus-5` | Model used by the agents |
91: | `VISUA_AICPA_AI_USE` | — | Set to `permitted` only if your organization holds AICPA's written permission to send AICPA text to AI services (see below). |
92: | `VISUA_PORT` / `VISUA_SEED` | `8787` / on | Server port, demo seeding |
93: | `VISUA_DATABASE_URL` | `data/visua.db` | `postgres://user:pass@host:5432/db` for PostgreSQL, or a SQLite file path (`:memory:` works). `VISUA_DB` is accepted as a SQLite path too. |
94:
95: ### Sign-in, roles and organizations
96:
97: Every workspace belongs to an **organization** (tenant). People reach an organization's
98: workspaces only through a membership, and their **role** decides what they can do:
99:
100: | Role | Can |
101: |---|---|
102: | Owner | everything, including owners, the "Require SSO" setting and which identity provider an SSO connection trusts |
103: | Admin | workspaces, frameworks, scope, agent autonomy, connectors, members, API tokens, and running SSO connections (enable, disable, provisioning) |
104: | Approver | decide agent proposals, approve policies, accept evidence, mark requirements not applicable or verified, categorize, tailor and record authorization decisions |
105: | Contributor | assess requirements (levels, priority, owner, notes), manage tasks, upload evidence, draft policies, run agents and connectors |
106: | Auditor | read everything, export reports and verify the audit trail |
107: | Viewer | read dashboards and the 3D views |
108:
109: - **Single sign-on.** Each organization can connect its own OpenID Connect provider
110:   (Okta, Microsoft Entra ID, Google Workspace, Keycloak…): authorization code flow with
111:   PKCE, state and nonce, bound to the browser that started it. People are routed to it
112:   by email domain once the organization proves the domain with a DNS TXT record, can be
113:   provisioned on first sign-in with a default role, and their sessions reach that
114:   organization only. The first organization to prove a domain holds it. Whoever controls a connection's provider can
115:   sign in as any member on its domains, so only owners choose the provider, client and
116:   domains; a new provider never inherits the old one's client secret. An owner can
117:   require the organization's SSO for every session. The server never reaches an
118:   organization's provider (discovery, token and key endpoints) on a private, loopback or
119:   link-local address unless the operator allows that host (`VISUA_OIDC_PRIVATE_ISSUERS`).
120:   A platform-wide provider (`VISUA_OIDC_*`) can be configured too; it links an existing
121:   account by email only when the email is verified.
122: - **API tokens** act in one organization with a chosen role (never owner), are shown
123:   once and stored as SHA-256 hashes, and can expire or be revoked.
124: - **Sessions** are random tokens in an HttpOnly, SameSite=Lax cookie (`__Host-` and
125:   Secure over HTTPS), stored hashed, with absolute and idle timeouts. State-changing
126:   requests carry a per-session CSRF token and, in production, must come from Visua's
127:   own origin. Security headers include a Content-Security-Policy.
128: - **Audit.** Every change records the authenticated person (`actorId`) in the
129:   hash-chained audit trail. Membership, token and SSO changes go to the organization's
130:   own chained trail.
131:
132: | Variable | Default | Meaning |
133: |---|---|---|
134: | `VISUA_AUTH_MODE` | `dev` (`oidc` when `NODE_ENV=production`) | `dev` adds password-less developer sign-in with demo personas. It is refused in production. |
135: | `VISUA_PUBLIC_URL` | `http://localhost:8787` | External URL: OIDC redirect URI (`/api/auth/oidc/callback`), secure cookies over HTTPS, allowed origin |
136: | `VISUA_SECRET` | — | At least 32 characters. Encrypts SSO client secrets at rest (AES-256-GCM). Required in production before storing a client secret. |
137: | `VISUA_OIDC_ISSUER`, `VISUA_OIDC_CLIENT_ID`, `VISUA_OIDC_CLIENT_SECRET`, `VISUA_OIDC_NAME` | — | Optional platform identity provider |
138: | `VISUA_OIDC_PRIVATE_ISSUERS` | — | Hosts an organization's SSO connection may reach on a private address, e.g. `keycloak.internal,10.0.0.5` (`*` for any). Needed for an internal identity provider; otherwise refused, so a tenant cannot make the server call your internal network. |
139: | `VISUA_SSO_DOMAIN_VERIFICATION` | `dns` | `dns`: an SSO connection's email domains route sign-ins and admit people only once proven by a TXT record at `_visua-challenge.<domain>`. `off`: domains are trusted as claimed (single-organization installations). Domains added before this check existed stay verified ("grandfathered"). |
140: | `VISUA_SSO_DOMAIN_RECHECK_HOURS` | `24` | How often a domain proven by DNS is looked up again, at most hourly (a positive value below `1` counts as `1`). A domain whose record is missing is shown as failing; still missing after the grace period, it lapses: it admits no one new and another organization can prove it, but its members keep signing in. `0` turns re-checks off (they are off whenever `VISUA_SSO_DOMAIN_VERIFICATION=off`). |
141: | `VISUA_SSO_DOMAIN_RECHECK_GRACE_DAYS` | `7` | How long a domain's record may be missing before the domain lapses. |
142: | `VISUA_OIDC_TRUST_EMAIL` | — | Set to `1` only if the platform provider verifies every email it asserts but sends no `email_verified` claim. Otherwise an unverified email never links to an existing account. |
143: | `VISUA_BOOTSTRAP_OWNER_EMAIL`, `VISUA_BOOTSTRAP_ORG_NAME` | — | First owner of a new installation (or of an unowned upgraded one) |
144: | `VISUA_SESSION_HOURS`, `VISUA_SESSION_IDLE_MINUTES` | `12`, `120` | Session lifetime and idle timeout |
145: | `VISUA_ALLOWED_ORIGINS` | — | Extra origins allowed to send state-changing requests (comma-separated) |
146:
147: A production start looks like:
148:
149: ```sh
150: NODE_ENV=production VISUA_PUBLIC_URL=https://visua.example.com VISUA_SECRET=… \
151: VISUA_DATABASE_URL=postgres://visua:…@db:5432/visua \
152: VISUA_OIDC_ISSUER=https://login.example.com VISUA_OIDC_CLIENT_ID=visua VISUA_OIDC_CLIENT_SECRET=… \
153: VISUA_BOOTSTRAP_OWNER_EMAIL=ciso@example.com pnpm start
154: ```
155:
156: ## Official documentation corpus and licensing
157:
158: Every requirement and citation traces to local, hash-verified copies of the official
159: publications in [`corpus/`](corpus/). There are 277 documents with manifests, SHA-256
160: hashes and verbatim license notices. `pnpm corpus:verify` checks them all.
161:
162: - **NIST** material (CSF 2.0, SP 800-37/53/53A/53B/60, FIPS 199/200, OSCAL, OLIR
163:   crosswalks, the AI RMF with its Playbook and the Generative AI Profile, and related
164:   AI guidance) is public domain and ships in the repository.
165: - **State statutes and regulations** are public legislative and regulatory records.
166:   Five files whose publishers claim copyright are kept local, outside git.
167: - **MITRE ATLAS** (Apache-2.0) and the **OWASP** Top 10s and GenAI Security Crosswalk
168:   (CC BY-SA 4.0) ship with their notices; files derived from OWASP text stay
169:   CC BY-SA 4.0 ([`packages/frameworks/data/NOTICE.md`](packages/frameworks/data/NOTICE.md)).
170:   MITRE's SAFE-AI report is all rights reserved and stays local.
171: - **AICPA** material (Trust Services Criteria, DC 200, AICPA mappings) is © AICPA and is
172:   **not redistributed**. A fresh clone runs SOC 2 on Visua's own skeleton: criterion IDs
173:   with titles and summaries written by Visua. An installation that holds its own copy
174:   gets the verbatim criteria, 330 points of focus and 1,190 AICPA mapping links. By
175:   default that text is withheld from language models. See
176:   [`corpus/README.md`](corpus/README.md).
177:
178: ## Architecture
179:
180: ```
181: corpus/ (official PDFs, JSON, XLSX, OSCAL)
182:    │  pnpm ingest
183:    ▼
184: packages/frameworks ── graphs · overlays · crosswalk and threat-link sets · BM25 corpus index (page-level citations)
185: packages/core ──────── domain model · scoring · status · planner · crosswalk projection · CSF tiers · FIPS 199
186: packages/agents ────── 8 agents · 16 tools · Claude runtime · offline playbooks · policy composer
187: apps/server ────────── Hono API · SQLite or Postgres storage · SSE events · connectors · exports (CSV, Markdown, OSCAL)
188: apps/web ───────────── React 19 · react-three-fiber Observatory & Nexus · TanStack Query · DESIGN.md tokens
189: packages/design ────── DESIGN.md → CSS variables + typed tokens
190: ```
191:
192: Details: [`docs/architecture.md`](docs/architecture.md). Design system:
193: [`DESIGN.md`](DESIGN.md) (Google Labs DESIGN.md format, lint-clean). Roadmap:
194: [`docs/roadmap.md`](docs/roadmap.md). Market research:
195: [`docs/research/delve-competitive-analysis.md`](docs/research/delve-competitive-analysis.md).
196:
197: ## Development
198:
199: ```sh
200: pnpm check           # local CI: every check below, with a summary (--quick: guard, typecheck, SQLite tests)
201: pnpm typecheck       # all packages (TypeScript 7)
202: pnpm test            # 202 unit, API, storage and auth tests (Vitest; add VISUA_TEST_DATABASE_URL=postgres://… for Postgres)
203: pnpm test:e2e        # 22 Playwright end-to-end tests against the production build (WebGL via SwiftShader)
204: pnpm screens         # screenshots of every view at 1440×900, 1024×768 and 390×844 into .screens/ (git-ignored)
205: pnpm screens --docs  # regenerate the README images in docs/images/
206: pnpm design:lint     # DESIGN.md lint
207: pnpm design:tokens   # regenerate tokens from DESIGN.md
208: pnpm corpus:verify   # SHA-256 check of the local corpus
209: pnpm ingest          # rebuild framework data from the corpus
210: ```
211:
212: ## Status
213:
214: Version 0.1: a working foundation across CSF 2.0, SOC 2, NIST RMF / SP 800-53, the
215: NIST AI RMF with NIST's AI security overlays, the U.S. state AI laws, and AI threat views
216: (MITRE ATLAS, OWASP, NIST AI 100-2). It includes the 3D Observatory and Nexus, eight
217: agents, an evidence engine, exports and a trust center, with organizations, roles, SSO
218: and PostgreSQL storage for multi-tenant hosting. See the
219: roadmap, and [`docs/research/ai-governance-landscape.md`](docs/research/ai-governance-landscape.md)
220: for the AI governance options that come next.

FILE docs/architecture.md SHA256 8aaafc770a1a0e7f852fa76d03137d51cf8beac03df37e09d31635223e5e8aa6
1: # Visua architecture
2:
3: Visua has five layers. The official corpus is ingested into normalized framework
4: graphs. A domain engine scores a workspace against those graphs. Agents read through a
5: narrow host contract and *propose* changes. An API persists state and streams events.
6: The web client presents an overview and action plan alongside 3D maps with 2D paths.
7: For the user workflow, see [Using the workspace](workspace.md).
8:
9: ```
10: corpus/                     official publications, manifests (SHA-256, license), structure notes
11:   │ pnpm ingest  (packages/frameworks/scripts/ingest.ts)
12:   ▼
13: packages/frameworks/data/   <framework>.json graphs · mappings/*.json · chunks/<corpus>.json
14:   │ FrameworkRegistry.load()
15:   ▼
16: packages/core               FrameworkIndex · scoring · status · planner · crosswalk · tiers · FIPS 199
17: packages/agents             AgentHost contract · 16 tools · Claude runtime · offline playbooks
18: apps/server                 VisuaService · storage (SQLite or Postgres) · Hono API · SSE · connectors · exports
19: apps/web                    React 19 · react-three-fiber scenes · TanStack Query · DESIGN.md tokens
20: packages/design             DESIGN.md → CSS variables + typed tokens (shared by web and scenes)
21: ```
22:
23: ## 1. Corpus → framework graphs
24:
25: **Graph model.** Every framework is a `FrameworkGraph`: a descriptor plus a flat list of
26: `RequirementNode`s. Node ids are global (`<frameworkId>:<code>`, for example
27: `nist-csf-2.0:PR.AA-01` or `nist-sp-800-53-r5:AC-2(1)`). Each node carries its official
28: text, its parent, its depth, and whether it is *assessable* (a unit of work). Each node
29: also carries a **citation**: the corpus document id, a locator, and the PDF page where
30: one exists.
31:
32: | Framework | Source of truth | Units of work |
33: |---|---|---|
34: | NIST CSF 2.0 | CSF 2.0 Reference Tool JSON (elements + OLIR metadata), page citations from CSWP 29 | 106 subcategories (6 functions, 22 categories), 363 Implementation Examples |
35: | SP 800-53 Rev. 5.2.0 | OSCAL catalog 5.2.0 + SP 800-53B baseline profiles; SP 800-53A objectives; page citations from the 2020 PDF (OSCAL release locator for controls added later) | 1,014 active controls and enhancements in 20 families; LOW 149 · MODERATE 287 · HIGH 370 · PRIVACY 96 |
36: | NIST RMF | SP 800-37r2, extracted to `corpus/nist-rmf/rmf-tasks.json` | 47 tasks across 7 steps |
37: | SOC 2 (TSC 2017) | Visua's skeleton; overlaid with the verbatim criteria and points of focus from a licensed local copy | 61 criteria in 20 series across 5 categories |
38: | NIST AI RMF 1.0 | `ai-rmf-core.json`, extracted from the AI 100-1 PDF with page citations (NIST's CPRT and Playbook JSON differ from the final text in dozens of statements, so they are not used for statements); the AI RMF Playbook JSON; `genai-profile.json` extracted from NIST AI 600-1 | 72 outcomes in 19 categories across 4 functions (GOVERN 19, MAP 18, MEASURE 22, MANAGE 13); 460 Playbook suggested actions; the Generative AI Profile's 12 GAI risks and 212 actions, attached to 49 outcomes |
39: | U.S. state AI laws | `corpus/us-state-ai-laws/obligations.json`: obligations quoted from the enrolled statutes and adopted regulations, each with its section and page | jurisdiction → law → obligation; each obligation names the roles it falls on (developer, deployer, employer, operator…), its category and its effective date |
40: | Threat catalogs (never assessed) | `corpus/ai-threats/`: the MITRE ATLAS 2026.09 release YAML; the OWASP Top 10 for LLM Applications 2026 (and 2025) and for Agentic Applications 2026, extracted from the PDFs; NIST AI 100-2 E2025 from NIST's taxonomy export | ATLAS: 16 tactics, 120 techniques, 88 sub-techniques, 40 mitigations · OWASP LLM: 10 risks per edition · OWASP Agentic: 10 risks · AI 100-2: 5 objectives, 25 attacks |
41:
42: Tests in `packages/frameworks/test` pin these official counts. Ingestion is
43: deterministic: the same corpus in produces the same data out.
44:
45: **Framework profiles.** A graph can carry profiles layered on it
46: (`FrameworkGraph.profiles`). The NIST AI 600-1 Generative AI Profile is the first: its
47: 12 risks live on the graph, and each of its 212 actions is attached to the AI RMF
48: outcome it serves (`attributes.profileActions`, with its risk tags and page). The AI
49: governance view rolls outcome progress up to each risk. For dense 3D views, AI RMF
50: nodes carry short labels in NIST AI 600-1's tag style (`GV-1.1`, `MS-2.11`); the
51: official ids stay everywhere else.
52:
53: NIST publishes AI RMF crosswalks (to ISO/IEC 42001 and 23894, the OECD principles, the
54: EU AI Act and others) only as PDFs, and none targets a framework Visua models, so the
55: AI RMF has no requirement-to-requirement mapping set. It joins the Crosswalk Nexus
56: through the threat links below.
57:
58: **Overlays.** NIST's AI security drafts attach to frameworks Visua already models
59: instead of becoming frameworks of their own (`data/overlays/`, `FrameworkOverlay`):
60:
61: - the *Cyber AI Profile* (NIST IR 8596, initial preliminary draft), a CSF 2.0 Community
62:   Profile: for each of the 106 subcategories, general considerations and, per focus
63:   area (Secure, Defend, Thwart), a proposed priority, considerations and example
64:   informative references;
65: - *COSAiS* (SP 800-53 Control Overlays for Securing AI Systems), the annotated outline
66:   of the "Using and Fine-Tuning Predictive AI" overlay: 59 SP 800-53 controls, 11 of
67:   them annotated with tailoring and the NIST AI 100-2 attacks they address.
68:
69: Every entry must attach to an existing node or ingestion fails. A workspace *adopts*
70: an overlay (and, for the profile, chooses focus areas). Adopting COSAiS brings its
71: controls into SP 800-53 scope as tailoring entries with a `source`, which dropping the
72: overlay removes again; the Cyber AI Profile's High priorities can raise CSF priorities
73: on request. Drafts are always labeled as drafts.
74:
75: **Threat links.** `corpus/ai-threats/mappings.json` keeps every published link between
76: threats and requirements, each with its publisher and status. Ingestion turns them into
77: mapping sets in `data/threat-mappings/`, loaded into `registry.threatLinks`, apart
78: from the requirement crosswalk: a threat link says a requirement is relevant to a
79: threat, not that one requirement satisfies another.
80:
81: | Authority | Status | Links |
82: |---|---|---|
83: | MITRE ATLAS 2026.09: mitigation → technique | final | 361 |
84: | OWASP LLM Top 10 2026, Appendix A: → AI RMF categories, ATLAS tactics, Agentic Top 10 | final | 102 |
85: | OWASP Agentic Top 10 2026, Appendix A: → LLM Top 10 2025 | final | 23 |
86: | NIST AI 100-2 E2025: attack → ATLAS mitigations it cites | final | 4 |
87: | NIST IR 8596 (Cyber AI Profile, draft): CSF 2.0 → ATLAS mitigations, → LLM03:2025 | draft | 183 |
88: | NIST COSAiS outline (draft): SP 800-53 control → AI 100-2 attack | draft | 21 |
89: | OWASP GenAI Security Crosswalk: OWASP → CSF 2.0, AI RMF, SP 800-53, ATLAS | unreviewed | 237 |
90: | OWASP LLM Top 10 2025: → ATLAS techniques | superseded | 15 |
91:
92: Links to catalogs Visua does not model (MITRE ATT&CK, CWE, CSA AICM, OWASP AIVSS and
93: data-security entries, NIST AI 600-1 risks) stay on the threat as references. No
94: publisher maps ATLAS to CSF 2.0, SP 800-53 or the AI RMF, or the OWASP Top 10s to CSF
95: 2.0 or SP 800-53, in a final document; the table above is everything there is.
96:
97: OWASP renumbered its LLM Top 10 in 2026 (Supply Chain moved from LLM03 to LLM04). The
98: current edition keeps the bare codes (`LLM04`), the superseded one gains the year
99: (`LLM03-2025`), and each entry records its counterpart in the other edition.
100:
101: **Crosswalk mapping sets.** Each set records its authority. The UI and the agents
102: show that authority wherever a mapping appears.
103:
104: | Set | Authority | Links |
105: |---|---|---|
106: | SP 800-53 r5 → CSF 2.0 | NIST OLIR (concept crosswalk, 5.2.0) | 745 |
107: | SP 800-37r2 tasks → CSF 2.0 | NIST OLIR | 176 |
108: | SP 800-53 → RMF tasks | Visua editorial (flagged) | 77 |
109: | SP 800-53 r5 → TSC | AICPA workbook (local copy only) | 1,033 |
110: | CSF 2.0 → TSC | AICPA TSC → CSF v1.1, carried to 2.0 via NIST OLIR v1.1 → v2.0 (composed, weaker) | 157 |
111:
112: **Corpus search.** Search is a BM25 index over two kinds of chunk. *Structured chunks*
113: hold one requirement each, with its text, examples or points of focus, and discussion.
114: *Page chunks* come from the core PDFs, one per page. The tokenizer keeps identifiers
115: such as `gv.oc-01` and `ac-2(1)` intact. A hit returns a verbatim quote and a page
116: citation. Chunks are stored per corpus (`chunks/<corpus>.json`), so licensed corpora
117: stay local.
118:
119: ## 2. Domain engine (`packages/core`)
120:
121: - **Workspace.** An organization profile (industry, size, data types, drivers,
122:   environments, CSF tier, guidance mode). It also holds the enabled frameworks and their
123:   settings (the SOC 2 scope and report type; the RMF system, categorization, baseline,
124:   tailoring and authorization), agent autonomy per proposal type, and the trust-center
125:   settings.
126: - **RequirementState.** The state of one assessable requirement: current and target on
127:   a 0–4 scale per framework family, priority, owner, notes, `verifiedAt`, applicability
128:   and the rationale for it. The scales are:
129:   - CSF: tier-aligned, Not performed → Adaptive
130:   - SOC 2: control readiness, Not designed → Assured
131:   - RMF/800-53: OSCAL-aligned implementation status, Not implemented → Assessed — satisfied
132: - **Scope engine.** `scopeOf()` derives applicability from the settings: SOC 2
133:   categories, the 800-53B baseline plus the optional PRIVACY baseline, and tailoring
134:   decisions. A person's documented "not applicable" is stored separately as
135:   `userExclusion`. When scope changes, the settings are applied first and the person's
136:   exclusion is then re-applied. A settings change therefore never silently overwrites a
137:   documented human decision.
138: - **Status derivation** (`deriveStatus`). The first rule that matches wins:
139:   1. not applicable
140:   2. manual override
141:   3. **at risk**: a failing monitoring check, expired evidence on an implemented
142:      requirement, or overdue work
143:   4. **verified**: the target is met, the requirement is verified, and it has valid
144:      evidence
145:   5. **implemented**: the target is met
146:   6. **in progress**
147:   7. **not started**
148:
149:   Each status comes with human-readable reasons.
150: - **Scoring.** Readiness is `min(current/target, 1)`, weighted by priority (critical 4,
151:   high 3, medium 2, low 1). It rolls up the hierarchy together with the gap count, gap
152:   score, evidence coverage and verified share.
153: - **Planner.** Turns gaps into tasks, ordered by governance first and then by
154:   priority × gap. Checklists come from the official material: CSF Implementation
155:   Examples, SOC 2 point-of-focus titles, SP 800-53A objectives, or the control statement
156:   items. Each task records its basis.
157: - **Crosswalk engine.** A bidirectional index with relationship strengths. It projects
158:   progress onto another framework with an explicit confidence. Projections only ever
159:   become *proposals*: a mapping is never evidence.
160: - **CSF Tiers** (the CSWP 29 Appendix B statements, verbatim) and **FIPS 199**
161:   categorization (the high-water mark selects the baseline).
162: - **U.S. state AI laws.** Laws impose obligations, not maturity levels, so obligations
163:   use a Visua-authored status scale (Not addressed → Met and reviewed). Nothing is in
164:   scope until the organization records, per law, the roles it holds under that law's
165:   own definitions (`LawSettings.applicability`, a decision reserved for approvers and
166:   recorded in the audit trail). `scopeOf()` then scopes exactly the obligations of
167:   those roles. Dates are applied when a score is read, not only when settings change:
168:   an obligation past its `until` date is out of scope ("No longer in effect after …"),
169:   and one whose effective date is still ahead is *upcoming*: it stays in scope so it can
170:   be assessed and planned, has a status of its own, and is scored apart (`upcoming`,
171:   "prepared") instead of counting toward today's readiness. Scores are cached per
172:   workspace revision and per hour, so date-driven changes (and overdue tasks or expired
173:   evidence) show up without any edit to the workspace.
174: - **Threat coverage** (paths in `packages/frameworks/src/threat-paths.ts`, coverage in
175:   `apps/server/src/services/threats.ts`). Threat catalogs are never enabled or assessed.
176:   A threat's coverage is derived from the requirements linked to it, reached three ways:
177:   directly; through an ATLAS mitigation of it (CSF 2.0 → mitigation, from the Cyber AI
178:   Profile draft; mitigation → technique, from MITRE); or through the same OWASP entry in
179:   the other edition (OWASP's own 2025 → 2026 rank migration, Figure 1 of the 2026
180:   edition). A link to a group (an AI RMF category) stands for that group's units. A path
181:   is only as strong as its weakest link's status, and views choose the weakest status
182:   they count (final, final and draft, or all published links).
183:   - Coverage weighs publications, not requirement counts. The linked requirements are
184:     grouped by the publication that links them and, within it, by route: an ATLAS
185:     mitigation, the other edition's entry, a group such as an AI RMF category, or the
186:     requirement itself. A route's progress is the mean progress toward target of its
187:     requirements in scope; a publication's is the mean over its routes; a threat's is the
188:     mean over its publications. So NIST's draft profile citing the 2025 Supply Chain entry
189:     on 67 CSF outcomes counts as one view of LLM04:2026, next to OWASP's own five
190:     AI RMF category links and the community crosswalk, and an AI RMF category counts
191:     once however many outcomes it holds. Every view is listed with its status.
192:   - On the 0–4 threat scale, 4 means every linked requirement in scope is at target; a
193:     threat is *unmapped* without links at the chosen status and *out of scope* when its
194:     links lead only to frameworks the workspace does not follow. Tactics, editions and
195:     objectives pool their threats' coverage.
196: - **AI governance.** The NIST AI RMF defines no maturity tiers, so outcomes use a
197:   Visua-authored scale (Not addressed → Measured and improving). The AI system inventory
198:   lives in the AI RMF framework settings: purpose and context of use, the
199:   organization's role, lifecycle stage, generative or not, value-chain provider, risk
200:   tier, data and human oversight. Every inventory change goes through the service and
201:   lands in the audit trail. A generative system brings the Generative AI Profile into
202:   scope.
203:
204: ## 3. Agents (`packages/agents`)
205:
206: **Contract.** Agents never touch storage. They read through `AgentHost` (workspace,
207: states, scores, tasks, evidence, policies, connectors, registry) and change things only
208: through `propose()`. The host decides from the workspace's autonomy settings whether a
209: proposal is applied at once or waits in the approvals inbox. Every step (plan, thought,
210: tool call, citation, proposal, message) is written to the run's **flight recorder** and
211: streamed over SSE. The 3D scene shows agent activity in terracotta on the
212: requirements being touched.
213:
214: **Agents.** Copilot, Assessor, Planner, Policy Author, Evidence Collector, Crosswalk
215: Analyst, Audit Prep and Task Executor. They share 16 tools:
216:
217: - Read tools: `workspace_overview`, `search_corpus`, `get_requirement`,
218:   `list_requirements`, `crosswalk`, `list_tasks`, `list_evidence`, `focus`
219: - Proposal tools: `propose_assessment`, `propose_target`, `propose_applicability`,
220:   `propose_task`, `propose_policy`, `propose_evidence`, `update_task` (a task update)
221: - `run_checks` runs the workspace's connectors, records their checks and proposes each
222:   passing check as evidence
223:
224: Every write is a proposal. The system prompt's operating principles are *propose, don't
225: mutate*; *no citation, no claim*; each framework's vocabulary (state-law obligations
226: apply only to the roles an organization recorded); and *threat catalogs are views*:
227: `get_requirement` on a threat returns the requirements publishers link to it, grouped
228: by publication with each link's status, and proposal tools refuse threats, frameworks
229: the workspace has not enabled, and levels on requirements out of scope.
230:
231: **Claude runtime.** A streamed, manual tool loop on `client.beta.messages.stream`:
232:
233: - Default model `claude-opus-5` (override with `VISUA_MODEL`), adaptive thinking with
234:   summarized display (reasoning appears in the flight recorder), and `effort` per agent.
235: - The static system prompt is prompt-cached.
236: - `eager_input_streaming`, with zod validation of every tool input before it runs.
237: - Server-side refusal fallbacks. `refusal`, `pause_turn` and `max_tokens` are handled.
238:
239: **Offline playbooks.** Deterministic implementations of all eight agents on the same
240: tools. They are used when no API key is configured, and they are what the tests
241: exercise.
242:
243: **Integrity rules in code:**
244:
245: - The Task Executor records implementation guides as task notes and never files them
246:   as evidence.
247: - Marking something not applicable requires a written rationale.
248: - Evidence proposals are restricted, and the trust center publishes computed facts only.
249:
250: **Licensed text gate.** When agents run on Claude, AICPA criterion text, points of
251: focus and AICPA corpus passages are replaced in tool results with Visua's summary and a
252: notice. They are sent only when the operator sets `VISUA_AICPA_AI_USE=permitted`.
253:
254: ## 4. Server (`apps/server`)
255:
256: - **Storage** (`src/storage/`). One async driver interface with two backends, chosen by
257:   `VISUA_DATABASE_URL`: embedded SQLite (`node:sqlite`, the default, for local use,
258:   demos and tests) and PostgreSQL (`pg`, for production and several server instances).
259:   - Entities are JSON documents with indexed columns (TEXT in SQLite, JSONB in
260:     Postgres): workspaces, requirement states, tasks, evidence, policies, risks,
261:     connectors, checks, agent runs, proposals and activity, plus the tenancy and
262:     identity tables.
263:   - Versioned migrations run at startup under a lock, so several instances can start
264:     together. Version 1 also upgrades SQLite databases written before migrations
265:     existed (their workspaces move to a default organization).
266:   - Repositories resolve their connection through an `AsyncLocalStorage` transaction
267:     context: a service method and everything it calls commit or roll back together.
268:     Nested `store.transaction()` calls use savepoints.
269: - **Consistency.** Every service mutation runs in one transaction, holds a per-workspace
270:   lock (a Postgres advisory lock; SQLite serializes writers) and re-reads the workspace
271:   after taking it, so concurrent requests on different instances never lose updates.
272:   Bus events are published only after the transaction commits.
273: - **Identity and access** (`src/auth/`). Organizations (tenants), users, memberships
274:   with one role each, federated identities keyed by issuer and subject, sessions, API
275:   tokens and per-organization SSO connections.
276:   - Middleware resolves the principal (bearer API token or session cookie), requires
277:     one for every `/api` route except health, sign-in and public trust centers, checks
278:     the CSRF token and origin on writes, and sets security headers.
279:   - Every `/api/workspaces/:ws` route resolves the workspace, then the principal's role
280:     in the workspace's organization. No role means 404, so other tenants' workspaces do
281:     not exist for you. Reads need `workspace.read`, writes at least `work.write`, and
282:     routes that need more (`work.approve`, `workspace.configure`, `workspace.export`)
283:     declare it: marking a requirement not applicable or verified, or overriding its
284:     status, is an approver decision like tailoring. Roles map to capabilities in
285:     `packages/core/src/access.ts`. Requests another site started (`Sec-Fetch-Site:
286:     cross-site`) never change state, sign-in included.
287:   - OpenID Connect uses `openid-client` (authorization code + PKCE, state, nonce; the
288:     flow state is single-use and stored hashed). A flow is bound to the browser that
289:     started it by a short-lived pre-auth cookie, and it can only be started from Visua's
290:     own pages (`Sec-Fetch-Site`), so a captured callback URL cannot sign someone else in.
291:     A session created through an organization's own SSO connection is scoped to that
292:     organization, so one tenant's identity provider can never grant access to another
293:     tenant.
294:   - An organization's provider is its owner's choice, so every request to it (discovery,
295:     token, keys) goes through `auth/egress.ts`: private, loopback, link-local and other
296:     non-public addresses are refused unless the operator allows the host
297:     (`VISUA_OIDC_PRIVATE_ISSUERS`). The check runs in the connection's own DNS lookup, on
298:     the addresses the socket will use, so DNS rebinding cannot bypass it, and responses are
299:     capped at 1 MB. Literal private addresses and `localhost` are refused when the issuer is
300:     saved. The platform provider is the operator's own configuration and is not filtered.
301:   - A connection's email domains are proven by DNS: each claimed domain gets a token, and
302:     once `_visua-challenge.<domain>` carries `visua-domain-verification=<token>` an admin
303:     verifies it (the lookup runs outside any transaction; the result is recorded and
304:     audited under the domain lock). Verified domains route sign-ins (`discover`), link
305:     or provision people, and count for "Require SSO"; a lapsed domain (see below) keeps
306:     routing its own members until another connection proves it, but admits no one new.
307:     Pending claims from several
308:     organizations can coexist; a partial unique index lets only one hold a domain
309:     verified. Migration 3 grandfathered domains claimed before verification existed, and
310:     `VISUA_SSO_DOMAIN_VERIFICATION=off` trusts domains as claimed.
311:   - Domains proven by DNS are re-checked on a schedule (`VISUA_SSO_DOMAIN_RECHECK_HOURS`,
312:     default daily, at most hourly): a clean negative answer — NXDOMAIN, NODATA, or a TXT set without the
313:     expected value — is the only kind of miss that counts against a domain; any other lookup
314:     error just reschedules the next try. A domain's standing moves from verified to failing
315:     at its first miss, and from failing to lapsed if it is still missing when its grace
316:     period (`VISUA_SSO_DOMAIN_RECHECK_GRACE_DAYS`, default a week) ends; found again, it
317:     recovers to verified. A lapsed domain admits no one new and releases its claim, so
318:     another organization can prove it, but keeps routing its own members (`byDomain`) so
319:     nobody is locked out. While another connection holds a lapsed domain, the old one is not
320:     looked up (the page shows it as held by another organization); it is looked at again an
321:     interval later, so it can recover once that holder is gone. Every instance's ticker
322:     claims up to 25 due domains under the domain lock with a 15-minute lease, looks each one
323:     up outside any transaction, and records the result in its own transaction, with an
324:     audit entry under the actor "Domain re-check" only when the standing changes (failing,
325:     lapsed, recovered); a manual Verify clears a failure the same way. Keep the instances'
326:     clocks NTP-synced: skew beyond the 15-minute lease only causes a duplicate lookup, since
327:     recording an outcome is idempotent. Grandfathered and trusted domains were never proven
328:     and are never re-checked.
329:   - A connection's provider can sign in as any member on its domains, owners included,
330:     so choosing it (issuer, client, secret, domains; adding or removing a connection) needs
331:     `tenant.own`. Admins enable, disable and set provisioning. A secret never follows a
332:     connection to a new issuer or client, and the last enabled connection cannot be
333:     disabled while "Require SSO" is on.
334:   - A new identity links to an existing account by email only when the email is verified:
335:     the platform provider must say so (`email_verified`, or `VISUA_OIDC_TRUST_EMAIL=1`); an
336:     organization's own provider must not deny it. An organization's provider never
337:     renames someone who also belongs to other organizations.
338:   - The request principal travels in `AsyncLocalStorage`, so the service records it as
339:     `actorId` on every audit event without changing method signatures.
340: - **Audit trail.** Every change is an `ActivityEvent` with `seq`, `prevHash` and
341:   `hash = SHA-256(prevHash ‖ canonical(event))`, chained from a zero genesis. The
342:   event is written in the same transaction as the change it records, under the
343:   workspace lock, and a unique `(workspace_id, seq)` index means the chain can never
344:   fork. `GET /activity/verify` recomputes the chain and reports the first broken link.
345: - **Live events across instances.** On Postgres, every instance LISTENs on one channel
346:   per schema and NOTIFYs it with each event it publishes, so a browser connected to any
347:   instance sees changes made through any other. Events over NOTIFY's 8,000-byte limit
348:   travel with their identifying fields only (`partial: true`).
349: - **Derived caches.** Each audited change bumps the workspace's revision counter;
350:   readiness scores are cached per revision, so every instance sees fresh scores.
351: - **Agent host.** Agents read from a snapshot of the workspace taken when the run starts
352:   and refreshed after every change their own actions apply. `propose()` is async and
353:   goes through the service; run steps stream to the bus at once and are persisted in
354:   order through a queue, outside the caller's transaction.
355: - **API.** A Hono app with about 55 routes. They cover:
356:   - metadata, the recommendation engine and framework graphs
357:   - corpus search and corpus files (path-traversal safe; `.local/` never served)
358:   - workspace CRUD, framework settings, requirement states, tiers, and RMF
359:     categorize/tailor/authorize
360:   - tasks, the plan, evidence (with SHA-256), policies (lifecycle), risks, connectors,
361:     checks, agent runs, proposals and decisions
362:   - activity, crosswalk overview and rows, the SOC 2 description
363:   - overlays (adopt, drop, apply priorities), U.S. state AI laws (overview and
364:     applicability), AI governance
365:   - threat views: catalog overviews, one catalog's coverage (`?min=final|draft|unreviewed`),
366:     and the Nexus threat ring (`/crosswalk/threats`); a threat catalog's `frameworks/:fw/state`
367:     returns coverage in the shape of a state bundle for the 3D Observatory
368:   - exports and the public trust center
369:   - `GET /events` (SSE) pushes invalidations and agent steps to clients.
370: - **Transfer.** JSON, JavaScript and CSS are compressed (`hono/compress`; the SP 800-53
371:   state bundle is 518 KB and travels as 16 KB). Sign-in responses carry the session's
372:   CSRF token and are never compressed, so compression cannot become an oracle on it;
373:   server-sent events are never compressed either. Framework graphs and `/api/meta`
374:   revalidate by ETag, and the web build's hashed assets are cached as immutable.
375: - **Connectors.** *Web posture* (HTTPS redirect, HSTS, TLS protocol and certificate
376:   expiry, security headers, `security.txt`) and *repository hygiene* (SECURITY.md,
377:   CODEOWNERS, CI, dependency automation, lockfile, secret patterns). Results become
378:   checks mapped to CSF, SOC 2 and 800-53 requirements. When a person runs a connector,
379:   passing results become hashed evidence at once; when an agent runs one (`run_checks`),
380:   it proposes each passing result as evidence, and approval files it from the recorded
381:   check (edits cannot change what the check observed).
382: - **Exports.**
383:   - CSF Organizational Profile (NIST template columns)
384:   - action plan, evidence index and SOC 2 PBC list (CSV)
385:   - readiness report (Markdown)
386:   - OSCAL 1.1.2 SSP and POA&M (JSON)
387:
388: ## 5. Web (`apps/web`)
389:
390: The web client presents a light workspace with labeled navigation, readable
391: status colors and a 2D path through every spatial view.
392:
393: - **Shell.** A 220px labeled sidebar groups the primary destinations under
394:   Workspace, Explore and Manage. It includes Overview, Action plan, Evidence,
395:   Agents, Policies, Reports & trust, Observatory, CSF profile & tiers, Crosswalk
396:   nexus, SOC 2 program, RMF program, AI governance, State AI laws, AI threats,
397:   Organization and Settings. The shell also has a command palette
398:   (⌘K: search requirements or ask the copilot), a live approvals badge and toasts.
399:   - Below 1024px the sidebar folds into a labeled menu opened from the top bar,
400:     as described in [the design layout](../DESIGN.md#layout), and the inspector
401:     becomes a bottom sheet with a handle. Two-pane pages stack below
402:     900px; Agents and Policies show one pane at a time. No page, panel or table scrolls
403:     sideways at 1024px or on a phone (the ATLAS matrix scrolls within itself): a table's
404:     secondary columns hide when its panel is narrow (container queries on `.table-box`)
405:     or the screen is a phone, the FIPS 199 editor becomes one card per row, and chart
406:     rows wrap.
407:   - Breakpoints live in `lib/media.ts` (`NARROW`, `PHONE`, `split()`) and `global.css`.
408: - **Overview and action plan.** Overview groups the primary framework's
409:   readiness, gaps, evidence coverage, and pending decisions above framework
410:   cards and next actions. It shows placeholders while the workspace loads.
411:   The action plan offers a framework filter, board, timeline, quick add,
412:   generated tasks, and agent planning. On the board, a pending status move is
413:   held by task ID and layered over query results so event-driven refreshes
414:   cannot briefly restore the old column. The card shows a saving state and
415:   cannot be dragged again until the request settles. A failed request clears
416:   only that task's pending move, returns the card to its previous status, and
417:   shows an error toast.
418: - **Observatory.** Instanced hex prisms in two layouts:
419:   - *constellation*: radial sectors per top-level group
420:   - *readiness terrain*: a honeycomb
421:
422:   Height is the current level; translucent "gap glass" rises to the target. Task
423:   satellites, evidence crystals and agent comets orbit the prisms. The five lenses
424:   recolor the scene without moving anything.
425:
426:   CameraControls fly to a selection. The light scene uses matte materials without
427:   bloom or vignette. The selection halo, its path and agent comets warm their shader
428:   programs while the scene loads: the real components draw for a few frames inside
429:   the opaque core, then stay mounted so the first selection does not compile them.
430:   Line points are memoized because drei's `Line` disposes its material when its
431:   points change, which deletes the shared program in three.js. Units out of scope
432:   (an undecided law's obligations, controls outside the baseline) shrink to small
433:   dots; nodes with no unit below them (ATLAS's mitigations) stay in the outline
434:   and inspector but take no place in the scene.
435:
436:   *Labels* are drawn in screen space (`scene/ScreenLabels.tsx`): code-sm and label-caps
437:   at 11–13px, placed by priority whenever the camera moves, and hidden rather than drawn
438:   where they would overlap another label, a HUD panel or the canvas edge. Sector titles
439:   sit outside the ring on the side they face, and a sector whose title does not fit
440:   keeps its code (twenty SP 800-53 families, sixteen ATLAS tactics); a ring of up to 40
441:   labeled groups (the state laws) moves out so their codes have room.
442:
443:   *Framing* (`scene/framing.ts`): the projection is offset so the camera target sits in
444:   the middle of the area no HUD band covers, so the scene re-frames when the inspector
445:   opens or a bottom sheet covers the canvas; the home view fits the ring and its
446:   titles inside the canvas and clear of every panel. The HUD's top bar wraps rather than
447:   overlaps, its chips become selects on a narrow canvas (container queries on the
448:   stage), and the legend collapses to the lens name and swatches.
449:
450:   Below 1024px the outline opens over the scene; phones open the Observatory on its
451:   outline with the 3D scene one tap away, as described in
452:   [the design layout](../DESIGN.md#layout).
453:
454:   The outline is a full 2D twin with tree semantics and keyboard control (←/→ siblings,
455:   Enter drill in, Esc up, F frame, L lens, / filter). Deep links use `?select=`.
456: - **Crosswalk Nexus.** Frameworks sit as sectors on one ring and requirement groups as
457:   pillars. Pillar height is log(units) and color is group status. Arcs bundle the
458:   unit-level mappings, with width ∝ √count and a color gradient from the source
459:   framework to the target. The home view aggregates counts by framework pair and
460:   mapping set; selecting a group restores its exact group-to-group connections,
461:   flies the camera behind it, and lists every mapping with live status. A searchable group list is the
462:   keyboard path. An inner **threat ring** holds ATLAS tactics, the OWASP entries and
463:   the NIST AI 100-2 objectives in neutral ink (threat catalogs have no identity hue);
464:   their pillars take the status color of their pooled coverage, and their arcs bundle
465:   the threat links onto requirement groups. A threat arc shows the status of its
466:   strongest link: final solid, draft dashed, unreviewed densely dotted, and
467:   superseded sparsely dotted. Patterns restart at each relationship; selection
468:   does not animate them. Parallel publication sets use separate curve lanes.
469:
470:   Labels use the same screen-space layer (framework names with an identity swatch, the
471:   threat ring's codes once a pillar is in focus) and the camera frames the ring around
472:   the HUD. Arcs are batched into a few draw calls by width and dash style.
473:   Pillars and their footprints use one instanced field per shape; sector grounds
474:   and rails are batched. Focus dims instance colors without transparent sorting. Focusing
475:   a pillar hides unrelated arcs and draws its own links in framework color. Below
476:   1024px the scene and its details
477:   stack as one scrolling page.
478: - **Demand rendering.** Both 3D canvases stop drawing when idle. Camera controls,
479:   height transitions, and active agent work request frames while moving. DOM
480:   mutation, resize, scroll, and font observers wake labels and camera framing
481:   when panels change. Scene label writes are excluded from mutation wakeups.
482:   Camera deltas are capped after idle so a new flight still eases in. Completed
483:   agent runs remove comet subscriptions. Use `node scripts/scene-profile.ts
484:   --url http://localhost:8787 --out .screens/profile.json` against a seeded
485:   development server to count WebGL draw calls and idle frames with SwiftShader;
486:   these counts do not measure hardware GPU frame rate.
487: - **Threat views.** The Threats page shows the ATLAS matrix (tactics as columns,
488:   techniques colored by coverage, with glyphs), the OWASP LLM Top 10 by edition, the
489:   OWASP Agentic Top 10 and the NIST AI 100-2 attacks by objective. A link filter (all
490:   published, final and draft, final only) is shared with the threat Observatory and
491:   the Nexus ring. In the matrix each tactic is a labeled group; the matrix takes one tab
492:   stop and arrow keys move within and across tactics. The threat inspector groups the
493:   linked requirements as coverage counts them: a summary per publication (status,
494:   requirements at target, progress), then collapsible publication groups split by route
495:   (directly, through an ATLAS mitigation, through the other edition's entry, through a
496:   group), with live status and why each is linked; a requirement's inspector lists the
497:   threats it helps address. Threat catalogs also open in the 3D Observatory, where
498:   height is the coverage level.
499: - **Laws.** The State AI laws page records which laws apply and in what role, shows an
500:   effective-date timeline, safe harbors and enforcement, and scopes the obligations.
501:   The timeline has one column per month (height: obligations taking effect; filled in
502:   force, outlined upcoming), labels only the next wave and the largest month in force,
503:   shows every month's laws on hover and keyboard focus, and has a list view.
504: - **Programs.**
505:   - *CSF*: Profile with bullet charts and the Tier assessment
506:   - *SOC 2*: scope, observation window, DC 200 checklist, readiness by series
507:   - *RMF*: lifecycle, FIPS 199, tailoring, authorization, readiness by family
508: - **Build.** Vite (rolldown) splits the bundle with code-splitting groups: packages in
509:   `vendor`, the 3D stack (three.js, react-three-fiber, drei) in `three`,
510:   loaded only by the Observatory and the Nexus. Pages are lazy routes.
511: - **Design system.** All colors, type, spacing, radii and component tokens come from
512:   `DESIGN.md`, compiled by `packages/design` into CSS variables and typed tokens.
513:   The palette uses a warm porcelain canvas, white surfaces, forest ink and sage
514:   interaction color.
515:   - Status colors are semantic and always come with a glyph.
516:   - Framework hues identify frameworks.
517:   - Terracotta is reserved for AI activity and actions.
518:
519: ## 6. Testing
520:
521: - `packages/*/test`, `apps/server/test` and `apps/web/test` (Vitest, 202 tests):
522:   - official counts and citations
523:   - identifier normalization
524:   - the SOC 2 skeleton and the licensed overlay
525:   - agent licensing gates
526:   - API flows: onboarding, RMF categorize/tailor/OSCAL, SOC 2 scoping and DC 200,
527:     Nexus bundles
528:   - all eight offline agents, autonomy, connectors, evidence hashing
529:   - integrity guardrails: N/A rationale, scope preservation (documented exclusions
530:     survive every scope change), audit-chain tamper detection, no plan-as-evidence, and
531:     assessments refused on threat catalogs, frameworks a workspace has not enabled and
532:     requirements out of scope, whether a person or an agent's proposal asks
533:   - agents: threat, AI RMF and state-law codes read out of a question; the Copilot
534:     explaining an ATLAS technique through its published links (and proposing nothing)
535:     and a state-law obligation from the statute with section, page, dates and roles;
536:     agents proposing passing checks as evidence, filed from the recorded check on
537:     approval; licensed text copied into tasks withheld from the model
538:   - the trust center publishing only the frameworks a workspace chooses (state AI laws
539:     off by default), and transfer: compressed responses, ETag revalidation, and sign-in
540:     responses left uncompressed
541:   - AI governance: AI RMF official counts, the Generative AI Profile's risks and actions,
542:     the AI system inventory API, Playbook-based planning and the AI RMF profile export
543:   - overlays: the Cyber AI Profile's priorities for all 106 subcategories and COSAiS's
544:     59 controls, adoption and dropping through the API
545:   - state AI laws: nothing in scope until a role is recorded, exactly that role's
546:     obligations after, and out of scope again when the law no longer applies
547:   - threat views: official catalog counts, every link's endpoints, OWASP edition
548:     lineage, coverage under each link filter, coverage rising to "covered" as linked
549:     requirements reach target, ATLAS reached through mitigations, and the Nexus ring
550:   - storage (`storage.test.ts`): rollback and savepoints, a linear audit chain and no
551:     lost updates under two concurrent server instances, cross-instance cache
552:     invalidation, the in-place upgrade of a pre-migration SQLite database, migration 4's
553:     `lapsed_at`/`next_check_at` columns surviving an unrelated save and routing to a
554:     lapsed claim, and the first re-check schedule spread over a day when upgrading
555:     existing DNS-proven domains
556:   - identity and access (`auth.test.ts`): sign-in requirements, tenant separation (404
557:     across organizations), every role's limits, CSRF (sign-in included), API tokens, the
558:     organization audit trail, and OpenID Connect against a mock provider (PKCE, replay,
559:     the browser that started the flow, JIT provisioning, domain checks, tenant-scoped
560:     sessions, Require SSO, owner-only provider changes, verified email linking,
561:     same-site return paths), organization providers kept off private addresses unless the
562:     operator allows them (`egress.test.ts`: address classes, literal and DNS-resolved
563:     refusals, the response cap), DNS proof of SSO domains before they route or admit
564:     anyone, first-to-prove ownership, and the upgrade that grandfathers existing domains
565:     (`storage.test.ts`)
566:   - re-checking SSO domains proven by DNS: classifying a lookup, the standings a re-check
567:     moves a domain through (failing, lapsed, recovered), re-check settings, and the
568:     ticker's timing and error handling (`domain-recheck.test.ts`); end to end on SQLite
569:     and Postgres (`sso-recheck.test.ts`): the daily schedule, the grace period, DNS
570:     trouble never counting against a domain, a Require-SSO organization staying signed in
571:     through a lapse, another organization proving a lapsed domain, two instances claiming
572:     the same batch without a duplicate lookup, a result dropped when the challenge
573:     changed meanwhile, and, on Postgres, the domain lock
574:   - the Postgres event relay (`relay.test.ts`): reconnection with backoff, failing fast
575:     at startup, NOTIFY payloads sized in bytes
576:   - `VISUA_TEST_DATABASE_URL=postgres://…` runs the server suites on Postgres, each run
577:     in its own schema
578:   - 3D labels (`apps/web/test`): placed for the camera of the frame being drawn, not the
579:     previous one (the camera controls leave its world matrix to the renderer), and shown
580:     and hidden by opacity, a compositor change, so a busy machine never draws new
581:     positions over old raster
582: - `e2e/` (Playwright, 21 tests) runs against the production bundle served by the API,
583:   with an in-memory seeded database and WebGL on SwiftShader. It covers the
584:   Overview and its program links, the Observatory and its 2D twin, the Nexus,
585:   RMF, SOC 2, AI governance, an agent run with citations, the trust center and
586:   its per-framework
587:   choice, persona sign-in, a viewer's read-only view, tenant separation, organization
588:   administration, the threat views (ATLAS matrix and its keyboard navigation, the
589:   coverage inspector and its link filter, OWASP editions, the Nexus threat ring), a
590:   threat catalog in the Observatory, no shader compiled by a selection in the
591:   Observatory, the State AI laws page (roles deciding scope, the
592:   timeline and its list view, obligations in 3D), and layout: labels in the 3D scenes
593:   stay inside the canvas and clear of the HUD and of each other at 1440 and 1024
594:   pixels, the sidebar folds into a menu on a phone, no page, panel or table
595:   scrolls sideways at 1024 pixels or on a phone, and the Observatory opens on
596:   its outline on a phone.
597: - `pnpm screens` (`scripts/screens.ts`) photographs every view at 1440×900, 1024×768
598:   and 390×844 into the git-ignored `.screens/` folder, with a contact sheet and a
599:   report of horizontal overflow and console errors; `--docs` regenerates the README
600:   images.
601:
602: ## 7. Known limitations
603:
604: - Domains grandfathered by the upgrade, or trusted while `VISUA_SSO_DOMAIN_VERIFICATION=off`,
605:   were never proven and are never re-checked; on a shared installation, ask their
606:   organizations to remove and verify them again. Domains proven by DNS are re-checked
607:   every `VISUA_SSO_DOMAIN_RECHECK_HOURS` (default 24) and lapse after
608:   `VISUA_SSO_DOMAIN_RECHECK_GRACE_DAYS` (default 7) without their record; with re-checks
609:   off, no record is looked up again and a failing domain never lapses.
610: - An organization's identity provider may be on a host the operator allows on a private
611:   address (`VISUA_OIDC_PRIVATE_ISSUERS`); every organization can then point its connection
612:   at that host. Allow only the internal providers you run, not `*`, in a shared
613:   installation.
614: - SAML and SCIM provisioning are not implemented; OpenID Connect covers the major
615:   identity providers.
616: - The demo's historical assessment levels are written to storage in bulk when it is
617:   seeded (they are history, not changes anyone made); everything after seeding goes
618:   through `VisuaService` and the audit trail.
619: - Connectors cover web posture and repository hygiene only. Cloud, IdP, HRIS and MDM
620:   integrations are on the roadmap.
621: - The SOC 2 structured extraction tooling is not in the repository. Installations
622:   without a local copy run on the skeleton.
623: - Threat coverage is only as good as the published links: most links to CSF 2.0 and
624:   SP 800-53 come from NIST drafts or OWASP's unreviewed community crosswalk, and 98 ATLAS
625:   techniques have no link to any requirement. Coverage is never a guarantee of
626:   protection. ATLAS case studies and the OWASP example scenarios are not ingested.
627: - The OWASP site serves its PDFs only to browsers, so `pnpm corpus:sync` cannot
628:   re-download them; the committed copies are hash-checked.
629: - State AI laws change often. The corpus records what was retrieved and when; Visua
630:   tracks obligations and is not legal advice.

FILE docs/roadmap.md SHA256 397c7c621aadc6bdb7b4886fb5bf57d5bf8e4d1e84dfd534d37d793582950327
1: # Visua roadmap
2:
3: Visua deepens one framework at a time, in order of increasing complexity. Each framework
4: ships only when it has real depth: official structure, a local corpus, crosswalks with
5: authority labels, evidence, agents and exports. The coverage claim for each framework is
6: generated from the product, not written by marketing.
7:
8: ## Shipped in v0.1
9:
10: - **NIST CSF 2.0 (flagship).**
11:   - Full Core with Implementation Examples and CSWP 29 page citations.
12:   - Organizational Profiles and the official CSV template.
13:   - Tier self-assessment, maturity-adaptive targets and priorities.
14:   - 3D Observatory with a 2D twin.
15: - **SOC 2 (TSC 2017, points of focus revised 2022).**
16:   - Scoping by Trust Services Category, Type 1 and Type 2, the observation window.
17:   - The DC 200 checklist, drafted from recorded facts, and the PBC list.
18:   - License-aware: Visua skeleton by default, a local licensed overlay when available.
19: - **NIST RMF and SP 800-53 Rev. 5.2.0.**
20:   - The seven-step lifecycle, FIPS 199 categorization, 800-53B baselines (including
21:     PRIVACY), and tailoring with rationale.
22:   - The authorization record.
23:   - SP 800-53A objectives.
24:   - OSCAL SSP and POA&M export.
25: - **NIST AI RMF 1.0 with the Generative AI Profile.**
26:   - 72 outcomes with page citations to AI 100-1, 460 Playbook suggested actions as
27:     checklists, and the 12 GAI risks and 212 actions of NIST AI 600-1.
28:   - An AI system inventory, readiness per function, GAI risk coverage, an AI RMF
29:     profile export and an AI governance policy template.
30: - **NIST's AI security drafts as overlays.** The Cyber AI Profile (NIST IR 8596 iprd) on
31:   CSF 2.0 with per-focus-area priorities, and the COSAiS predictive-AI overlay on
32:   SP 800-53, both adoptable per workspace and labeled as drafts.
33: - **U.S. state AI laws.** 26 laws in 8 jurisdictions with 187 obligations quoted from the
34:   statutes and regulations, scoped by the roles the organization records under each law.
35: - **AI threat views.** MITRE ATLAS 2026.09, the OWASP Top 10s for LLM (2026, 2025) and
36:   agentic applications, and NIST AI 100-2, with coverage derived from published links
37:   labeled by status; a Threats page, threat catalogs in the 3D Observatory, and a threat
38:   ring in the Nexus.
39: - **Crosswalk Nexus.** 2,188 authoritative mappings with authority labels; composed and
40:   editorial sets are flagged.
41: - **Organizations, roles and SSO** (OpenID Connect, per-organization connections, API
42:   tokens) and **PostgreSQL storage** for multi-instance hosting, alongside SQLite.
43: - **Agents.** Eight agents on Claude or offline playbooks, with a flight recorder,
44:   proposals, autonomy per change type, and citations to the local corpus.
45: - **Integrity.**
46:   - A hash-chained audit trail.
47:   - "Not applicable" requires a rationale, and scope changes preserve it.
48:   - Evidence provenance and freshness.
49:   - A computed-facts trust center.
50:
51: ## Next: platform foundations
52:
53: 1. **Identity follow-ups.** SAML and SCIM provisioning.
54: 2. **Evidence file storage.** Object storage for evidence files, content-addressed by
55:    SHA-256, and Postgres row-level security as a second tenancy guard.
56: 3. **Connector depth.** Label each connector by automation depth (API-automated,
57:    agent-assisted, manual):
58:    - AWS (Config, IAM, CloudTrail, KMS), Azure and GCP
59:    - Okta and Entra ID
60:    - GitHub and GitLab
61:    - Google Workspace and Microsoft 365
62:    - Jamf, Intune and Kandji
63:    - HRIS (onboarding and offboarding evidence)
64: 4. **Claim-consistency agent.** Block any policy, trust-center or questionnaire
65:    statement that evidence does not support.
66: 5. **Questionnaire agent** (SIG, CAIQ, custom). Every answer cites evidence and policy
67:    clauses.
68: 6. **Time scrubber.** Replay status and evidence freshness across a SOC 2 Type 2
69:    observation window in the Observatory.
70: 7. **Evidence lineage trace.** Follow one chain in 3D, in both directions: system →
71:    connector or agent run → evidence (hash) → requirement → framework → trust-center
72:    statement.
73: 8. **SOC 2 extraction tooling in the repository.** A Node extractor (unpdf) that
74:    rebuilds the structured TSC and DC 200 files from an installation's own licensed
75:    PDFs.
76: 9. **Auditor workspace.** Read-only, logged access. OSCAL assessment-plan and
77:    assessment-results import and export. Visua never drafts auditor conclusions.
78:
79: ## Next frameworks
80:
81: Each framework comes with its own local corpus, graph, crosswalks and tests. There
82: are two tracks. The AI governance track was pulled forward in September 2026 when the
83: NIST AI RMF became a requirement.
84:
85: ### AI governance track (after the NIST AI RMF and the Generative AI Profile)
86:
87: Order and reasoning come from `docs/research/ai-governance-landscape.md` (status as of
88: 2026-09-26, with sources).
89:
90: | # | Framework | Model it as | Why | Corpus and licensing |
91: |---|---|---|---|---|
92: | 1 | ISO/IEC 42001:2023 (AI management system), with ISO/IEC 42005 and 23894 as references | Certifiable framework: clauses 4–10 plus 38 Annex A controls, Statement of Applicability | The strongest buyer pull: accredited certification, required by some large buyers of AI services and by CSA STAR for AI Level 2. A crosswalk to the AI RMF is published on NIST's site. Shares its structure with ISO 27001. | © ISO: Visua skeleton with its own titles; verbatim text only from the customer's licensed copy, withheld from language models by default (the SOC 2 pattern) |
93: | 2 | EU AI Act, as amended by Regulation (EU) 2026/1744 | Regulatory obligations with deadlines, by role (provider, deployer…) and risk class | Binding law. Upcoming dates: 2 Dec 2026, 2 Aug 2027, 2 Dec 2027 (Annex III high-risk) and 2 Aug 2028 (Annex I) | EUR-Lex (reusable with attribution) |
94: | 3 | ~~NIST Cyber AI Profile (NIST IR 8596) and the SP 800-53 control overlays for AI (COSAiS)~~ | Shipped as overlays; follow the drafts to final (COSAiS's other four use cases, the Cyber AI Profile's next draft) | | NIST (public domain) |
95: | 4 | ~~U.S. state AI obligations~~ | Shipped: 26 laws in 8 jurisdictions. Next: re-check the bills pending on 2026-09-26 (California, New York) and add states as laws take effect | Volatile under federal preemption efforts | Public legislative texts |
96: | 5 | ~~MITRE ATLAS and the OWASP Top 10 for LLM and agentic applications~~ | Shipped as threat views. Next: the CSA AI Controls Matrix (needs a CSA license) and ATLAS case studies | | Apache-2.0 / CC BY-SA 4.0 |
97:
98: All of these reuse the same primitives, which the AI RMF work puts in place: the AI
99: system inventory, the organization's role, the system's risk tier, impact assessments,
100: and lifecycle evidence (evaluations, red-team results, human-oversight records,
101: incidents). Next platform work for this track: AI impact assessments (AI RMF MAP,
102: ISO/IEC 42005) and an obligation model with deadlines.
103:
104: ### Security and privacy track
105:
106: | Framework | Why next | Corpus and licensing |
107: |---|---|---|
108: | NIST SP 800-171 Rev. 3 / CMMC Level 2 | The defense supply chain; reuses 800-53 work. Confirm which revision CMMC requires (currently Rev. 2). | NIST (public domain); DoD CMMC documents (public) |
109: | FedRAMP (Low / Moderate / High, 20x) | The federal path from the RMF work already in place | GSA/FedRAMP baselines (public), OSCAL |
110: | HIPAA Security Rule | Healthcare, which is common in onboarding | 45 CFR Part 164 (public domain) |
111: | ISO/IEC 27001:2022 / 27002 | International certification | © ISO: IDs and short titles only; full text from the customer's licensed copy |
112: | PCI DSS v4.0.1 | Payments | © PCI SSC: IDs only; licensed text overlay |
113: | NIST Privacy Framework, GDPR | Privacy programs | NIST (public domain); EUR-Lex (reusable) |
114:
115: ## Research-driven principles (from the Delve analysis)
116:
117: Match the value customers pay for: speed to readiness, less busywork, sales enablement
118: and continuous monitoring. Invert the trust model behind it:
119:
120: - Readiness is computed from evidence and never promises a pass.
121: - Every framework statement is cited, and every change is approved or covered by
122:   explicitly granted autonomy.
123: - Mappings are never evidence.
124: - Integrations are labeled with their real automation depth.
125: - The trust center publishes only facts that evidence backs.
126:
127: See `docs/research/delve-competitive-analysis.md` §7.

FILE docs/workspace.md SHA256 eeb26fac7f2bd645f397efcbf009b10e303a2bec1f2613f17f70ab882c42da56
1: # Using the workspace
2:
3: The Visua workspace brings program health, tasks, evidence, and framework
4: relationships into one place. This guide shows where to find the next action
5: and what to expect when you make a change.
6:
7: ## Find a destination
8:
9: The labeled sidebar groups destinations by purpose. **Workspace** contains
10: **Overview**, **Action plan**, **Evidence**, **Agents**, **Policies**, and
11: **Reports & trust**. **Explore** contains the Observatory, Crosswalk nexus,
12: and framework programs. **Manage** contains organization and workspace
13: settings.
14:
15: Use search in the top bar, or press `⌘K` on macOS or `Ctrl+K` on Windows and
16: Linux, to find requirements or ask the copilot. On screens narrower than 1024
17: pixels, open the labeled menu from the top bar.
18:
19: ## Review program health
20:
21: **Overview** shows readiness for the primary framework, open gaps, evidence
22: coverage, and decisions awaiting approval. Framework cards show readiness,
23: status distribution, scope, and evidence coverage. Choose **Program** to open
24: the framework's 2D view or **View in 3D** to explore it in the Observatory.
25:
26: ![Overview with labeled navigation, program metrics, and framework cards](images/home.jpg)
27:
28: Use **Next best actions** to open a requirement that needs work. If agent
29: drafts are waiting, the approval panel links to the review queue. While the
30: overview loads, placeholders show where its content will appear.
31:
32: ## Move work forward
33:
34: **Action plan** offers a board and a timeline. The board keeps all six task
35: statuses visible in groups of three columns on typical desktop screens and
36: stacks them on a phone. The framework filter narrows both views. The
37: **Generate plan** action always uses the workspace's primary framework.
38:
39: 1. Use **Generate plan** to create tasks from official implementation
40:    guidance for the primary framework, or use **Plan with agent** to request
41:    a proposed plan.
42: 2. Enter a title in **Quick add a task**, then select **Add task** to create
43:    it in **To do**.
44: 3. Open a card to review its checklist, status, dates, assignee, and linked
45:    requirements. You can change its status in the task details.
46: 4. On the board, drag a card to another status when you want to move it. The
47:    card moves immediately and shows **Saving…** until the server responds.
48:
49: A card cannot be dragged again while its move is saving. If the save fails,
50: the card returns to its previous status and an error message appears. A
51: successful move remains in place while the workspace refreshes.
52:
53: ## Explore requirements and mappings
54:
55: **Observatory** shows framework requirements as a spatial map. Open a
56: requirement to inspect its status, evidence, and tasks. Its 2D outline gives
57: you the same path through the framework; on a phone, the outline opens first
58: and the 3D scene is one tap away.
59:
60: **Crosswalk nexus** shows how groups in different frameworks relate. Select a
61: group to hide unrelated links and see its mappings in the detail panel. The
62: opening view summarizes connections between frameworks; selecting a group
63: shows its individual connections. Solid, dashed, densely dotted, and sparsely
64: dotted threat links indicate final, draft, unreviewed, and superseded sources. The
65: searchable group list provides a 2D path through the same information. The
66: inner threat ring shows published links from threat catalogs to requirement
67: groups. A mapping suggests where work may apply; each requirement still needs
68: its own evidence.
69:
70: ![Selected Nexus threat showing its linked groups and mapping details](images/nexus-threat-ring.jpg)
71:
72: For implementation details, see the [web architecture](architecture.md#5-web-appsweb)
73: and the [design system](../DESIGN.md).

FILE package.json SHA256 9c039485e240321449eff8db06de41cb73c5a2e6056118e54059c4d41987d453
1: {
2:   "name": "visua",
3:   "version": "0.1.0",
4:   "private": true,
5:   "description": "Visua — the spatial, AI-first compliance automation platform. See, navigate and execute NIST CSF 2.0, SOC 2 and NIST RMF programs in 3D.",
6:   "license": "UNLICENSED",
7:   "type": "module",
8:   "packageManager": "pnpm@10.33.0",
9:   "engines": {
10:     "node": ">=22.18"
11:   },
12:   "scripts": {
13:     "dev": "pnpm --filter @visua/design build && pnpm -r --parallel --filter @visua/server --filter @visua/web dev",
14:     "build": "pnpm --filter @visua/design build && pnpm --filter @visua/web build",
15:     "start": "pnpm --filter @visua/server start",
16:     "design:lint": "designmd lint DESIGN.md",
17:     "design:tokens": "pnpm --filter @visua/design build",
18:     "corpus:verify": "node scripts/corpus.ts verify",
19:     "corpus:sync": "node scripts/corpus.ts sync",
20:     "ingest": "pnpm --filter @visua/frameworks ingest",
21:     "typecheck": "pnpm -r typecheck",
22:     "test": "vitest run",
23:     "test:watch": "vitest",
24:     "test:e2e": "playwright test",
25:     "screens": "node scripts/screens.ts",
26:     "check": "node scripts/check.ts"
27:   },
28:   "devDependencies": {
29:     "@google/design.md": "0.4.0",
30:     "@playwright/test": "1.56.1",
31:     "@types/node": "^22.20.4",
32:     "tsx": "^4.23.15",
33:     "typescript": "^7.0.2",
34:     "vitest": "^5.0.2"
35:   }
36: }

FILE .codex-context/invariants.md SHA256 40213766a29c6708c0b5b7df4b995c6016a817e8b5e02af4e818237596e01893
1: # Contracts to preserve
2:
3: [Repository rules](../CLAUDE.md) are authoritative. The contracts below link
4: those requirements to inspected source and existing verification paths;
5: source inspection does not establish that tests currently pass.
6:
7: | Contract | Evidence and verification |
8: | --- | --- |
9: | Workspace routes enforce tenant access, return 404 across organizations, and require capabilities above the route floor. Actors come from the signed-in principal. Production refuses developer sign-in. | `apps/server/src/app.ts`, `auth/http.ts`, `auth/config.ts`; `apps/server/test/auth.test.ts`, `api.test.ts`. |
10: | Workspace mutations, the hash-chained audit record, and revision changes share a transaction. Await storage calls; keep network calls outside transactions. Events publish only after commit, and rollback discards them. | `VisuaService.mutate/log/emit` in `apps/server/src/services/visua.ts`; `Store.transaction/afterCommit` in `storage/store.ts`; `apps/server/test/storage.test.ts`. |
11: | Concurrent PostgreSQL writers serialize by workspace and reread state after obtaining the lock. Nested transactions use savepoints. | `apps/server/src/services/visua.ts`, `storage/store.ts`, `storage/postgres.ts`; PostgreSQL cases in `apps/server/test/storage.test.ts`. |
12: | Agent mutations go through `host.propose()`, followed by human approval or explicitly granted autonomy. Agents cannot verify requirements, issue audit or authorization decisions, or file plans/templates as evidence. | `packages/agents/src/host.ts`, `tools.ts`, `apps/server/src/services/visua.ts`; `packages/agents/test/tools.test.ts`, `apps/server/test/api.test.ts`. |
13: | Not-applicable decisions require a rationale; scope recomputation preserves `userExclusion`. | `effectiveScope`, `updateState`, and framework scope updates in `apps/server/src/services/visua.ts`; `apps/server/test/api.test.ts`. |
14: | Status precedence is not-applicable, override, at-risk, verified, implemented, in-progress, not-started. Verification needs a positive target met, `verifiedAt`, and accepted unexpired evidence. Scores depend on workspace revision and the current hour; uncommitted computed results must not enter the score cache. | `packages/core/src/status.ts`, `apps/server/src/services/visua.ts`; `packages/core/test/core.test.ts`, `apps/server/test/storage.test.ts`. |
15: | Requirement statements retain corpus citations. Preserve published node IDs and law codes. AI RMF statements use the PDF extraction, not alternate CPRT/Playbook wording. Official catalog counts change only with an intentional source update. | `packages/frameworks/src/ingest/`, `packages/core/src/ids.ts`; `packages/frameworks/test/frameworks.test.ts`, `pnpm corpus:verify`. |
16: | Threat catalogs are derived coverage views, never assessable frameworks. Published threat links retain authority/status and stay separate from requirement crosswalks. A mapping is never evidence. | `packages/frameworks/src/threat-links.ts`, `threat-paths.ts`, `apps/server/src/services/threats.ts`, `packages/core/src/crosswalk.ts`; framework, agent, and API tests. |
17: | Restricted corpus text and derived artifacts stay out of Git. Licensed text must pass through `modelText()` / `licensedTextToModel()` before reaching a model. Preserve open-license notices. | `.gitignore`, `corpus/README.md`, `packages/frameworks/data/NOTICE.md`, `packages/agents/src/mode.ts`, `tools.ts`; `packages/agents/test/licensing.test.ts`, licensing guard in `scripts/check.ts`. |
18: | DNS timeout/server failure is unknown, not proof of a missing SSO ownership record. Domain lapse blocks new admission without locking existing members out of their route. | `apps/server/src/auth/domain-recheck.ts`, `auth/service.ts`, `storage/identity.ts`; `domain-recheck.test.ts`, `sso-recheck.test.ts`, and the canonical SSO design. |
19: | Visual values come from `DESIGN.md` tokens. Pair status colors with labels/glyphs; reserve tertiary violet for agents and framework-ai copper for AI frameworks. Preserve accessible 2D navigation. | `CLAUDE.md`, `DESIGN.md`, `packages/design/scripts/build.ts`, `apps/web/src/scene/`; design lint, `apps/web/test/screen-labels.test.ts`, and `e2e/visua.spec.ts`. |
20:
21: Use [verification commands](verification.md) to select the appropriate suite.
22: For SSO changes, also read the
23: [domain recheck specification](../docs/superpowers/specs/2026-09-27-sso-domain-recheck-design.md).

FILE packages/agents/src/agents.ts SHA256 786686e13245de781cbf15fe5efb727e58b59577b5c2830da4bc82ea4d76668f
1: /**
2:  * Agent definitions: role prompts, tool subsets and effort levels.
3:  * System prompts are static per agent (cache-friendly); workspace context is
4:  * supplied in the first user turn.
5:  */
6: import type { AgentKind } from "@visua/core";
7: import { levelScaleText } from "./tools.ts";
8:
9: export interface AgentDefinition {
10:   kind: AgentKind;
11:   name: string;
12:   tagline: string;
13:   tools: string[];
14:   effort: "low" | "medium" | "high" | "xhigh";
15:   role: string;
16:   maxTurns: number;
17: }
18:
19: const READ = ["workspace_overview", "search_corpus", "get_requirement", "list_requirements", "crosswalk", "list_tasks", "list_evidence", "focus"];
20:
21: export const AGENTS: Record<AgentKind, AgentDefinition> = {
22:   copilot: {
23:     kind: "copilot",
24:     name: "Copilot",
25:     tagline: "Answers questions and navigates the Observatory",
26:     tools: [...READ, "propose_task"],
27:     effort: "medium",
28:     maxTurns: 8,
29:     role:
30:       "You are the Visua Copilot. Answer the user's compliance questions precisely and briefly, grounded in the workspace data and the official corpus. " +
31:       "Use `focus` to fly the 3D Observatory to the requirements you discuss. Only propose tasks when the user asks for action.",
32:   },
33:   assessor: {
34:     kind: "assessor",
35:     name: "Assessor",
36:     tagline: "Assesses current implementation levels with evidence",
37:     tools: [...READ, "propose_assessment", "propose_applicability"],
38:     effort: "high",
39:     maxTurns: 14,
40:     role:
41:       "You are the Visua Assessor. For each requirement in scope, weigh the evidence, completed tasks, monitoring results and notes, then propose a current implementation level on the framework's scale. " +
42:       "Be conservative: without accepted evidence, do not propose levels above 2. Cite the official text that defines the outcome.",
43:   },
44:   planner: {
45:     kind: "planner",
46:     name: "Planner",
47:     tagline: "Turns gaps into a prioritized, scheduled action plan",
48:     tools: [...READ, "propose_task"],
49:     effort: "high",
50:     maxTurns: 14,
51:     role:
52:       "You are the Visua Planner. Build an action plan that closes the largest, highest-priority gaps first. Ground each task in the official implementation examples, points of focus or assessment objectives. " +
53:       "Sequence governance work (policy, roles, risk strategy) before dependent technical work. Avoid duplicating existing open tasks.",
54:   },
55:   "policy-author": {
56:     kind: "policy-author",
57:     name: "Policy Author",
58:     tagline: "Drafts tailored policies mapped to requirements",
59:     tools: [...READ, "propose_policy"],
60:     effort: "high",
61:     maxTurns: 10,
62:     role:
63:       "You are the Visua Policy Author. Draft a complete, tailored policy document in Markdown: Purpose, Scope, Roles and Responsibilities, Policy Statements ('shall' language derived from the requirement outcomes and implementation examples), Exceptions, Enforcement, Review cadence, and a Requirements Mapping table (codes across frameworks via crosswalk). " +
64:       "Fit the organization's size, industry and maturity; avoid boilerplate the organization cannot operate.",
65:   },
66:   "evidence-collector": {
67:     kind: "evidence-collector",
68:     name: "Evidence Collector",
69:     tagline: "Runs connectors and gathers audit-ready evidence",
70:     tools: [...READ, "run_checks", "propose_evidence", "propose_task"],
71:     effort: "medium",
72:     maxTurns: 10,
73:     role:
74:       "You are the Visua Evidence Collector. Run monitoring checks, turn results into evidence linked to the right requirements, and flag missing or expiring evidence with follow-up tasks.",
75:   },
76:   "crosswalk-analyst": {
77:     kind: "crosswalk-analyst",
78:     name: "Crosswalk Analyst",
79:     tagline: "Reuses work across frameworks",
80:     tools: [...READ, "propose_assessment"],
81:     effort: "high",
82:     maxTurns: 14,
83:     role:
84:       "You are the Visua Crosswalk Analyst. Use authoritative mappings to project progress from one framework onto another, proposing levels only where the mapping relationship and the evidence justify it. State the mapping authority in every rationale.",
85:   },
86:   "auditor-prep": {
87:     kind: "auditor-prep",
88:     name: "Audit Prep",
89:     tagline: "Prepares readiness reports and evidence requests",
90:     tools: [...READ, "propose_task"],
91:     effort: "high",
92:     maxTurns: 12,
93:     role:
94:       "You are the Visua Audit Prep agent. Review readiness like an independent assessor would: missing evidence, stale evidence, unapproved policies, open gaps. Produce a concise readiness brief and propose tasks for the blocking items. Never promise an audit outcome.",
95:   },
96:   "task-executor": {
97:     kind: "task-executor",
98:     name: "Task Executor",
99:     tagline: "Executes tasks end-to-end with approvals",
100:     tools: [...READ, "propose_policy", "propose_evidence", "update_task", "run_checks"],
101:     effort: "high",
102:     maxTurns: 14,
103:     role:
104:       "You are the Visua Task Executor. Carry out the given task as far as software can: draft the policy or procedure, write an implementation guide into the task update, run checks, and propose evidence only for artifacts that prove something is actually in place. Then propose a task update (checklist items completed, status). Humans approve every change; never present plans or drafts as evidence.",
105:   },
106: };
107:
108: export function systemPrompt(def: AgentDefinition): string {
109:   return [
110:     `You are an agent inside Visua, an AI-first compliance automation platform with a 3D Observatory. ${def.role}`,
111:     "",
112:     "Operating principles:",
113:     "1. Propose, don't mutate. Every change goes through a propose_* tool; a human approves unless the workspace granted autonomy.",
114:     "2. No citation, no claim. Before stating what a framework requires, call search_corpus and cite the official document and page. Never invent requirement codes — resolve them with get_requirement or list_requirements.",
115:     "3. Use each framework's vocabulary: CSF 2.0 'outcomes' (subcategories), SOC 2 'criteria' and 'points of focus', SP 800-53 'controls', RMF 'tasks', AI RMF 'outcomes' (subcategories such as GOVERN 1.1), Playbook 'suggested actions' and Generative AI Profile 'actions' tied to its 12 GAI risks. U.S. state AI laws impose 'obligations' (such as CA-SB243-02) on the roles each law defines; an obligation is in scope only for the roles the organization recorded, and one not yet in effect is upcoming. Quote obligations and cite the statute; never give legal advice.",
116:     "4. Threat catalogs (MITRE ATLAS tactics, techniques and mitigations such as AML.T0051; the OWASP Top 10 for LLM and Agentic Applications, e.g. LLM04:2026 or ASI01; NIST AI 100-2 attacks) are views, never assessed. Their coverage comes from the requirements publishers link to each threat, and every link has a publisher and a status (final, draft, unreviewed, superseded): say which. Never propose levels, tasks, evidence or policies on a threat; propose them on the linked requirements.",
117:     "5. Be specific and proportionate to the organization's size, industry and maturity. Prefer a few high-leverage actions over long generic lists.",
118:     "6. Express confidence as low/medium/high with the reason. Never promise certification or audit outcomes.",
119:     "7. Finish with a short Markdown summary for the user: what you found, what you proposed, and what needs their decision.",
120:     "",
121:     "Implementation level scales (0–4):",
122:     levelScaleText(),
123:   ].join("\n");
124: }

FILE packages/agents/src/claude.ts SHA256 ef0b1d282540052229e8487eaf58ea7a67caa41769c2d8d4bca1ed03f6b388c5
1: /**
2:  * Claude runtime: a streamed, manual tool-use loop with glass-box step
3:  * recording. Uses adaptive thinking (summarized, so reasoning is visible in
4:  * the flight recorder), prompt caching of the static system prompt, eager
5:  * tool-input streaming with schema validation before execution, and
6:  * server-side refusal fallbacks.
7:  */
8: import Anthropic from "@anthropic-ai/sdk";
9: import { z } from "zod";
10: import type { AgentDefinition } from "./agents.ts";
11: import { systemPrompt } from "./agents.ts";
12: import type { AgentHost, AgentResult } from "./host.ts";
13: import { toolByName, type AgentTool } from "./tools.ts";
14:
15: import { claudeEnabled, configuredModel, DEFAULT_MODEL } from "./mode.ts";
16:
17: export { claudeEnabled, configuredModel, DEFAULT_MODEL };
18:
19: type BetaTool = Anthropic.Beta.BetaTool;
20: type BetaMessageParam = Anthropic.Beta.BetaMessageParam;
21: type BetaToolResult = Anthropic.Beta.BetaToolResultBlockParam;
22:
23: export function toolSchema(tool: AgentTool): BetaTool["input_schema"] {
24:   const json = z.toJSONSchema(tool.schema) as Record<string, unknown>;
25:   delete json["$schema"];
26:   return json as BetaTool["input_schema"];
27: }
28:
29: function toBetaTool(tool: AgentTool): BetaTool {
30:   return {
31:     name: tool.name,
32:     description: tool.description,
33:     input_schema: toolSchema(tool),
34:     // Stream large tool inputs (policy bodies) as they are generated; inputs are
35:     // validated against the Zod schema before any tool runs.
36:     eager_input_streaming: true,
37:   };
38: }
39:
40: function firstLine(text: string, max = 110): string {
41:   const line = text.trim().split("\n").find((l) => l.trim()) ?? "";
42:   const clean = line.replace(/^[#*\-\s]+/, "").trim();
43:   return clean.length > max ? `${clean.slice(0, max - 1)}…` : clean;
44: }
45:
46: function summarizeResult(value: unknown): string {
47:   if (value && typeof value === "object") {
48:     const v = value as Record<string, unknown>;
49:     if (typeof v["error"] === "string") return `Error: ${v["error"]}`;
50:     if (typeof v["proposalId"] === "string") return `Proposal ${v["status"] === "applied" ? "applied" : "staged for approval"}`;
51:     for (const key of ["hits", "rows", "tasks", "evidence", "mappings", "connectors"]) {
52:       if (Array.isArray(v[key])) return `${(v[key] as unknown[]).length} ${key}`;
53:     }
54:   }
55:   return "Done";
56: }
57:
58: export async function runWithClaude(host: AgentHost, def: AgentDefinition, contextText: string, goal: string): Promise<AgentResult> {
59:   const model = configuredModel();
60:   const client = new Anthropic();
61:   const tools = def.tools.map((name) => toolByName(name)).filter((t): t is AgentTool => !!t);
62:   const betaTools = tools.map(toBetaTool);
63:   const messages: BetaMessageParam[] = [
64:     {
65:       role: "user",
66:       content: [
67:         { type: "text", text: contextText },
68:         { type: "text", text: `Request: ${goal}` },
69:       ],
70:     },
71:   ];
72:   const usage = { inputTokens: 0, outputTokens: 0 };
73:   let finalText = "";
74:   let jsonRetries = 0;
75:
76:   host.step({ type: "plan", title: `${def.name} started with ${model}`, detail: goal });
77:
78:   for (let turn = 0; turn < def.maxTurns; turn++) {
79:     if (host.signal.aborted) throw new Error("Run cancelled");
80:     const stream = client.beta.messages.stream(
81:       {
82:         model,
83:         max_tokens: 32000,
84:         betas: ["server-side-fallback-2026-07-01"],
85:         fallbacks: "default",
86:         thinking: { type: "adaptive", display: "summarized" },
87:         output_config: { effort: def.effort },
88:         system: [{ type: "text", text: systemPrompt(def), cache_control: { type: "ephemeral" } }],
89:         tools: betaTools,
90:         messages,
91:       },
92:       { signal: host.signal },
93:     );
94:
95:     let message: Anthropic.Beta.BetaMessage;
96:     try {
97:       message = await stream.finalMessage();
98:       jsonRetries = 0;
99:     } catch (err) {
100:       // Only an unparseable eager tool input is retried; API errors propagate.
101:       if (err instanceof Anthropic.APIError || host.signal.aborted || jsonRetries++ >= 2) throw err;
102:       host.step({ type: "error", title: "A tool input could not be parsed — retrying the turn" });
103:       continue;
104:     }
105:
106:     usage.inputTokens += message.usage.input_tokens + (message.usage.cache_read_input_tokens ?? 0) + (message.usage.cache_creation_input_tokens ?? 0);
107:     usage.outputTokens += message.usage.output_tokens;
108:
109:     let turnText = "";
110:     for (const block of message.content) {
111:       if (block.type === "thinking" && block.thinking.trim()) {
112:         host.step({ type: "thought", title: firstLine(block.thinking), detail: block.thinking });
113:       } else if (block.type === "text" && block.text.trim()) {
114:         turnText += block.text;
115:       }
116:     }
117:
118:     if (message.stop_reason === "refusal") {
119:       host.step({
120:         type: "error",
121:         title: "The model declined this request",
122:         detail: message.stop_details?.explanation ?? undefined,
123:       });
124:       finalText = turnText || "The request was declined by the model's safety systems. Try rephrasing the goal.";
125:       break;
126:     }
127:     if (message.stop_reason === "pause_turn") {
128:       messages.push({ role: "assistant", content: message.content });
129:       continue;
130:     }
131:
132:     const toolUses = message.content.filter((b): b is Anthropic.Beta.BetaToolUseBlock => b.type === "tool_use");
133:     if (!toolUses.length) {
134:       finalText = turnText;
135:       break;
136:     }
137:     if (message.stop_reason === "max_tokens") {
138:       throw new Error("A tool input was truncated at max_tokens; the run was stopped before executing it.");
139:     }
140:     if (turnText.trim()) host.step({ type: "message", title: firstLine(turnText), detail: turnText });
141:
142:     messages.push({ role: "assistant", content: message.content });
143:
144:     const results = await Promise.all(
145:       toolUses.map(async (use): Promise<BetaToolResult> => {
146:         const tool = toolByName(use.name);
147:         if (!tool || !def.tools.includes(use.name)) {
148:           return { type: "tool_result", tool_use_id: use.id, is_error: true, content: `Unknown tool '${use.name}'` };
149:         }
150:         const parsed = tool.schema.safeParse(use.input);
151:         if (!parsed.success) {
152:           return {
153:             type: "tool_result",
154:             tool_use_id: use.id,
155:             is_error: true,
156:             content: JSON.stringify({ INVALID_INPUT: z.prettifyError(parsed.error), received: use.input }),
157:           };
158:         }
159:         host.step({ type: "tool-call", title: use.name, data: parsed.data });
160:         try {
161:           const out = await tool.run(host, parsed.data);
162:           host.step({ type: "tool-result", title: `${use.name}: ${summarizeResult(out)}`, data: out });
163:           return { type: "tool_result", tool_use_id: use.id, content: JSON.stringify(out) };
164:         } catch (err) {
165:           const detail = err instanceof Error ? err.message : String(err);
166:           host.step({ type: "error", title: `${use.name} failed`, detail });
167:           return { type: "tool_result", tool_use_id: use.id, is_error: true, content: detail };
168:         }
169:       }),
170:     );
171:     // All tool results go back in a single user message.
172:     messages.push({ role: "user", content: results });
173:   }
174:
175:   if (!finalText) finalText = "Reached the step limit for this run. Review the proposals and continue with a narrower goal if needed.";
176:   host.step({ type: "message", title: firstLine(finalText) || "Summary", detail: finalText });
177:   return { summary: finalText, mode: "claude", model, usage };
178: }

FILE packages/agents/src/host.ts SHA256 6666b11d09f754df78e2acce35464b4453001429ad45835249b9e7a0ee418ba7
1: /**
2:  * The contract between agents and the platform. Agents never touch storage
3:  * directly: they read through the host and *propose* changes. The host
4:  * decides (per workspace autonomy settings) whether a proposal is applied
5:  * immediately or waits for a human decision.
6:  */
7: import type {
8:   AgentKind,
9:   AgentStep,
10:   CheckResult,
11:   Citation,
12:   Connector,
13:   Evidence,
14:   FrameworkScore,
15:   Policy,
16:   Proposal,
17:   ProposalType,
18:   RequirementState,
19:   Task,
20:   Workspace,
21: } from "@visua/core";
22: import type { FrameworkRegistry } from "@visua/frameworks";
23:
24: export interface ProposalInput {
25:   type: ProposalType;
26:   title: string;
27:   rationale: string;
28:   payload: Record<string, unknown>;
29:   citations: Citation[];
30:   confidence: "low" | "medium" | "high";
31:   nodeIds: string[];
32: }
33:
34: export interface AgentHost {
35:   readonly registry: FrameworkRegistry;
36:   readonly runId: string;
37:   readonly signal: AbortSignal;
38:   workspace(): Workspace;
39:   states(frameworkId?: string): RequirementState[];
40:   state(nodeId: string): RequirementState | undefined;
41:   score(frameworkId: string): FrameworkScore;
42:   tasks(): Task[];
43:   evidence(): Evidence[];
44:   policies(): Policy[];
45:   connectors(): Connector[];
46:   runConnector(connectorId: string): Promise<CheckResult[]>;
47:   /** Stage a change. Resolves to the stored proposal (possibly already applied). */
48:   propose(input: ProposalInput): Promise<Proposal>;
49:   /** Append a step to the run's flight recorder (persisted + streamed). */
50:   step(step: Omit<AgentStep, "id" | "at">): AgentStep;
51: }
52:
53: export interface AgentRequest {
54:   agent: AgentKind;
55:   goal: string;
56:   input: Record<string, unknown>;
57: }
58:
59: export interface AgentResult {
60:   summary: string;
61:   mode: "claude" | "offline";
62:   model?: string;
63:   usage?: { inputTokens: number; outputTokens: number };
64: }

FILE packages/agents/src/index.ts SHA256 7dd25053ae8074f58904026b290f3326373571fb95c34db5eadd68cbffa64a2a
1: export { AGENTS, systemPrompt, type AgentDefinition } from "./agents.ts";
2: export { executeAgent, workspaceContext } from "./runtime.ts";
3: export { toolSchema } from "./claude.ts";
4: export { claudeEnabled, configuredModel, DEFAULT_MODEL, licensedTextToModel, WITHHELD_NOTICE } from "./mode.ts";
5: export { runOffline, extractCodes, PLAYBOOKS } from "./offline.ts";
6: export { ALL_TOOLS, toolByName, type AgentTool } from "./tools.ts";
7: export { POLICY_TEMPLATES, templateFor, composePolicy, frameworkLabel } from "./policies.ts";
8: export type { AgentHost, AgentRequest, AgentResult, ProposalInput } from "./host.ts";

FILE packages/agents/src/mode.ts SHA256 bba8c149025adaabf2581597bc62a6c9911a717c60f1f8a195b69ecff7843ee6
1: /**
2:  * Runtime mode and content-licensing policy for agents.
3:  *
4:  * AICPA content (SOC 2 criterion text, points of focus, AICPA guides) is ©
5:  * AICPA; its terms object to inclusion in LLM knowledge bases without written
6:  * permission. When agents run on Claude, that text is withheld from tool
7:  * results unless the operator declares permission with
8:  * VISUA_AICPA_AI_USE=permitted. Offline playbooks run locally and are
9:  * unaffected.
10:  */
11:
12: /** Default model: override with VISUA_MODEL. */
13: export const DEFAULT_MODEL = "claude-opus-5";
14:
15: export function configuredModel(): string {
16:   return process.env["VISUA_MODEL"]?.trim() || DEFAULT_MODEL;
17: }
18:
19: /**
20:  * Agent mode resolution. `VISUA_AGENT_MODE=claude|offline|auto` (default auto):
21:  * auto uses Claude when an API credential is present in the environment.
22:  */
23: export function claudeEnabled(): boolean {
24:   const mode = (process.env["VISUA_AGENT_MODE"] ?? "auto").toLowerCase();
25:   if (mode === "offline") return false;
26:   if (mode === "claude") return true;
27:   return Boolean(process.env["ANTHROPIC_API_KEY"] || process.env["ANTHROPIC_AUTH_TOKEN"]);
28: }
29:
30: /** Whether licensed (AICPA) text may be placed in content sent to the language model. */
31: export function licensedTextToModel(): boolean {
32:   return !claudeEnabled() || (process.env["VISUA_AICPA_AI_USE"] ?? "").trim().toLowerCase() === "permitted";
33: }
34:
35: export const WITHHELD_NOTICE =
36:   "[Official AICPA text withheld from the AI model: AICPA's terms object to LLM use without written permission. Visua's summary is shown instead; the full text is visible to people in the Visua UI. Operators with AICPA permission can set VISUA_AICPA_AI_USE=permitted.]";

FILE packages/agents/src/offline.ts SHA256 cde1f40facecfa0637c6cac07a0b91fa40a75286453ed4419cf54635d72f38e8
1: /**
2:  * Offline playbooks: deterministic, explainable implementations of every
3:  * agent that use exactly the same tools as the Claude runtime. They keep
4:  * Visua fully functional without an API key and make tests reproducible.
5:  */
6: import {
7:   CrosswalkIndex,
8:   codeOf,
9:   frameworkOf,
10:   isEvidenceValid,
11:   levelLabel,
12:   newId,
13:   planTasks,
14:   projectLevels,
15:   shortStatement,
16:   type AgentKind,
17:   type Citation,
18:   type RequirementNode,
19:   type Task,
20: } from "@visua/core";
21: import type { AgentHost, AgentResult } from "./host.ts";
22: import { composePolicy, frameworkLabel, templateFor } from "./policies.ts";
23: import {
24:   corpusOf,
25:   crosswalk,
26:   focus,
27:   frameworkEnabled,
28:   getRequirement,
29:   hitToCitation,
30:   isThreat,
31:   lawBrief,
32:   listRequirements,
33:   resolveNode,
34:   threatBrief,
35:   proposeAssessment,
36:   proposePolicy,
37:   proposeTask,
38:   runChecks,
39:   statusOf,
40:   updateTask,
41:   workspaceOverview,
42: } from "./tools.ts";
43:
44: type Playbook = (host: AgentHost, goal: string, input: Record<string, unknown>) => Promise<string>;
45:
46: const CODE_PATTERNS = [
47:   /\b(?:GV|ID|PR|DE|RS|RC)\.[A-Z]{2}(?:-\d{2})?\b/g,
48:   /\b(?:CC\d\.\d|A1\.\d|PI1\.\d|C1\.\d|P\d\.\d)\b/g,
49:   /\b[A-Z]{2}-\d{1,2}(?:\(\d{1,2}\))?\b/g,
50:   /\b[PCSIAR]-\d{1,2}\b/g,
51:   // MITRE ATLAS tactics, techniques, sub-techniques and mitigations.
52:   /\bAML\.(?:TA\d{4}|T\d{4}(?:\.\d{3})?|M\d{4})\b/g,
53:   // OWASP entries, optionally edition-qualified (LLM04:2026, LLM03:2025, ASI01).
54:   /\b(?:LLM|ASI)\d{2}(?::20\d{2})?\b/g,
55:   // NIST AI 100-2 objectives and attacks.
56:   /\bNISTAML\.\d{2,3}\b/g,
57:   // State AI laws and obligations (CA-SB243, CA-SB243-02, CO-SB26-189, NY-RAISE).
58:   /\b(?:CA|CO|IL|ME|NY|NYC|TX|UT)-[A-Z][A-Z0-9]*(?:-[A-Z0-9]+)*\b/g,
59: ];
60: /** AI RMF outcomes and categories, written as NIST writes them (GOVERN 1.1, MAP 2). */
61: const AI_RMF_CODE = /\b(?:GOVERN|MAP|MEASURE|MANAGE) \d{1,2}(?:\.\d{1,2})?\b/g;
62:
63: export function extractCodes(text: string): string[] {
64:   const found = new Set<string>();
65:   for (const re of CODE_PATTERNS) for (const m of text.toUpperCase().matchAll(re)) found.add(m[0]);
66:   for (const m of text.matchAll(AI_RMF_CODE)) found.add(m[0]);
67:   return [...found];
68: }
69:
70: function citeFor(host: AgentHost, node: RequirementNode, limit = 2): Citation[] {
71:   const hits = host.registry.search.search(`${node.code} ${node.title} ${node.text}`, { limit, framework: corpusOf(host, node.frameworkId) });
72:   return hits.map(hitToCitation);
73: }
74:
75: const STOPWORDS = new Set("a an and are as at be by do does for from how in is it of on or our the this to us we what which who why with about".split(" "));
76:
77: /** Words of a question or a law's names, with "AI" spelled out and bill numbers joined (SB 24-205 → sb24 205, H.B. 149 → hb149). */
78: function lawWords(text: string): string[] {
79:   const t = text
80:     .toLowerCase()
81:     .replace(/\bai\b/g, "artificial intelligence")
82:     .replace(/\b([shal])\.\s?b\.\s*(\d)/g, "$1b$2")
83:     .replace(/\b(sb|ab|hb|ld)[\s.-]*(\d)/g, "$1$2")
84:     .replace(/\blocal law (\d+)/g, "ll$1");
85:   return (t.match(/[a-z0-9]+/g) ?? []).map((w) => (w.length > 4 && w.endsWith("s") ? w.slice(0, -1) : w)).filter((w) => !STOPWORDS.has(w));
86: }
87:
88: /**
89:  * A state AI law named in words ("the Colorado AI Act", "TRAIGA", "SB 53", "the Texas law"),
90:  * if the question clearly names one. A law is a candidate only when the question names its
91:  * jurisdiction, one of its bill numbers or its acronym (in capitals, so "raise" is not the
92:  * RAISE Act); candidates are ranked by their distinctive words, and a tie names none.
93:  */
94: function lawNamed(host: AgentHost, goal: string): RequirementNode | undefined {
95:   const asked = new Set(lawWords(goal));
96:   const laws: { node: RequirementNode; words: Set<string>; named: boolean }[] = [];
97:   for (const f of host.registry.frameworks.filter((x) => x.family === "law")) {
98:     const index = host.registry.framework(f.id)!;
99:     for (const law of index.graph.nodes.filter((n) => n.kind === "law")) {
100:       const jurisdiction = law.parentId ? (index.byId.get(law.parentId)?.title ?? "") : "";
101:       const bills = `${law.title} ${law.text}`.match(/\b(?:[SAH]\.\s?B\.|[SAH]B|LD|Local Law)\s*\d[\d-]*/gi) ?? [];
102:       const acronyms = law.code.split("-").slice(1).filter((w) => /^[A-Z]{3,}$/.test(w) && w !== "AI");
103:       const billWords = lawWords(`${bills.join(" ")} ${law.code.split("-").slice(1).join(" ")}`).filter((w) => /^(sb|ab|hb|ld|ll)\d/.test(w));
104:       const named =
105:         (jurisdiction !== "" && lawWords(jurisdiction).every((w) => asked.has(w))) ||
106:         (jurisdiction === "New York City" && asked.has("nyc")) ||
107:         billWords.some((w) => asked.has(w)) ||
108:         acronyms.some((a) => new RegExp(`\\b${a}\\b`).test(goal));
109:       laws.push({ node: law, words: new Set([...lawWords(`${law.title} ${jurisdiction} ${bills.join(" ")}`), ...billWords, ...acronyms.map((a) => a.toLowerCase())]), named });
110:     }
111:   }
112:   // Inverse document frequency: "artificial intelligence" and "act" say little, "colorado" or "traiga" a lot.
113:   const idf = (w: string) => Math.log(laws.length / Math.max(1, laws.filter((l) => l.words.has(w)).length));
114:   const ranked = laws
115:     .filter((l) => l.named)
116:     .map((l) => ({ node: l.node, score: [...asked].filter((w) => l.words.has(w)).reduce((sum, w) => sum + idf(w), 0) }))
117:     .sort((a, b) => b.score - a.score);
118:   const [best, next] = ranked;
119:   if (best && best.score > 0 && (!next || best.score - next.score >= 0.5)) return best.node;
120:   // No single law: a question about one jurisdiction ("Colorado AI law") gets the jurisdiction's laws.
121:   const jurisdictions = [...new Set(ranked.map((r) => r.node.parentId))]
122:     .map((id) => (id ? host.registry.node(id) : undefined))
123:     .filter((j): j is RequirementNode => !!j && (lawWords(j.title).every((w) => asked.has(w)) || (j.title === "New York City" && asked.has("nyc"))));
124:   // "New York City" names New York too: keep the most specific.
125:   const specific = jurisdictions.filter((j) => !jurisdictions.some((o) => o !== j && o.title.startsWith(`${j.title} `)));
126:   return specific.length === 1 ? specific[0] : undefined;
127: }
128:
129: function enabledFrameworks(host: AgentHost): string[] {
130:   return host
131:     .workspace()
132:     .frameworks.filter((f) => f.enabled && host.registry.framework(f.frameworkId))
133:     .map((f) => f.frameworkId);
134: }
135:
136: /**
137:  * Why a run cannot work on the framework it was given: threat catalogs are never
138:  * assessed or planned, and a framework the workspace does not follow has no scope.
139:  */
140: function unusableFramework(host: AgentHost, input: Record<string, unknown>): string | undefined {
141:   const requested = typeof input["framework"] === "string" ? (input["framework"] as string) : undefined;
142:   if (!requested) return undefined;
143:   const index = host.registry.framework(requested);
144:   if (!index) return `Unknown framework '${requested}'.`;
145:   const fw = index.graph.framework;
146:   if (fw.family === "threat") return `${fw.shortName} is a threat catalog: its threats are never assessed or planned. Their coverage comes from the requirements linked to them; open a threat on the AI threats page to see those requirements and work on them.`;
147:   if (!frameworkEnabled(host, requested)) return `${fw.shortName} is not enabled in this workspace. An admin can enable it in Settings.`;
148:   return undefined;
149: }
150:
151: function primaryFramework(host: AgentHost, input: Record<string, unknown>): string {
152:   const requested = typeof input["framework"] === "string" ? (input["framework"] as string) : undefined;
153:   if (requested && !unusableFramework(host, input)) return requested;
154:   return enabledFrameworks(host)[0] ?? "nist-csf-2.0";
155: }
156:
157: /** Resolve the scope of nodes for a run: explicit ids, a parent code, a task, or top gaps. Never threats. */
158: function scopeNodes(host: AgentHost, input: Record<string, unknown>, fallbackLimit = 10): RequirementNode[] {
159:   const ids = Array.isArray(input["nodeIds"]) ? (input["nodeIds"] as string[]) : [];
160:   const out: RequirementNode[] = [];
161:   const push = (n: RequirementNode | undefined) => {
162:     if (n && !isThreat(host, n.id) && frameworkEnabled(host, n.frameworkId) && !out.some((x) => x.id === n.id)) out.push(n);
163:   };
164:   for (const id of ids) {
165:     const node = host.registry.node(id);
166:     if (!node) continue;
167:     if (node.assessable) push(node);
168:     else for (const n of host.registry.framework(node.frameworkId)!.assessableUnder(node.id)) push(n);
169:   }
170:   if (typeof input["taskId"] === "string") {
171:     const task = host.tasks().find((t) => t.id === input["taskId"]);
172:     for (const id of task?.requirementIds ?? []) push(host.registry.node(id));
173:   }
174:   if (out.length) return out;
175:   const fw = primaryFramework(host, input);
176:   const index = host.registry.framework(fw)!;
177:   return index.assessable
178:     .map((n) => ({ n, s: host.state(n.id) }))
179:     .filter((x) => x.s?.applicable && x.s.target > x.s.current)
180:     .sort((a, b) => b.s!.target - b.s!.current - (a.s!.target - a.s!.current))
181:     .slice(0, fallbackLimit)
182:     .map((x) => x.n);
183: }
184:
185: const isThreatFramework = (host: AgentHost, frameworkId: string) => host.registry.framework(frameworkId)?.graph.framework.family === "threat";
186:
187: function pct(n: number): string {
188:   return `${Math.round(n * 100)}%`;
189: }
190:
191: // ---------------------------------------------------------------------------
192: // Copilot
193: // ---------------------------------------------------------------------------
194:
195: /** A threat, in words: what it is, and what publishers link to it (never an assessment of it). */
196: function threatAnswer(host: AgentHost, node: RequirementNode, focusIds: string[]): string[] {
197:   const t = threatBrief(host, node);
198:   const lines = [`**${t.code}** — ${t.title} (${t.catalog} ${node.kind})`, shortStatement(node.text.replace(/\[([^\]]+)\]\([^)]*\)/g, "$1"), 420)];
199:   const mitigations = t.related.filter((r) => r.label === "mitigates");
200:   if (mitigations.length) lines.push(`Mitigations (${mitigations[0]!.authority}, ${mitigations[0]!.status}): ${mitigations.slice(0, 8).map((m) => `${m.code} ${m.title}`).join("; ")}.`);
201:   if (!t.linkedRequirements.length) lines.push("No publisher links this threat to a requirement Visua models yet.");
202:   else {
203:     lines.push("Requirements publishers link to it:");
204:     for (const g of t.linkedRequirements) {
205:       const examples = g.examples.filter((r) => r.inScope).slice(0, 5);
206:       lines.push(`- *${g.publication}*${g.publication.toLowerCase().includes(g.status) ? "" : ` (${g.status})`}: ${g.requirements} requirement(s), ${g.inYourFrameworks} in your frameworks, ${g.atTarget} at target${examples.length ? ` — e.g. ${examples.map((r) => `**${r.code}**${r.via ? ` via ${r.via}` : ""}`).join(", ")}` : ""}.`);
207:       focusIds.push(...examples.map((r) => r.id));
208:     }
209:   }
210:   lines.push("Threats are never assessed: coverage comes from these linked requirements, at the status of their weakest link.");
211:   return lines;
212: }
213:
214: /** A state AI law or obligation, in words, with the organization's own scoping decision. */
215: function lawAnswer(host: AgentHost, node: RequirementNode): string[] {
216:   if (node.kind === "jurisdiction") {
217:     const index = host.registry.framework(node.frameworkId)!;
218:     const laws = index.childrenOf(node.id).filter((n) => n.kind === "law");
219:     const decisions = host.workspace().frameworks.find((f) => f.frameworkId === node.frameworkId)?.law?.applicability ?? {};
220:     return [
221:       `**${node.title}** — ${laws.length} AI law(s) or regulation(s) tracked:`,
222:       ...laws.map((law) => {
223:         const a = law.attributes ?? {};
224:         const roles = decisions[String(a["lawId"] ?? "")]?.roles ?? [];
225:         return `- **${law.code}** ${law.title}: ${String(a["status"] ?? "")}${a["effective"] ? `, effective ${String(a["effective"])}` : ""}; ${roles.length ? `your recorded role: ${roles.join(", ")}` : "your role is not recorded"}.`;
226:       }),
227:       "Ask about one of them by name or code for its obligations and who it applies to.",
228:     ];
229:   }
230:   const l = lawBrief(host, node);
231:   const roles = (l.roles as string[] | undefined) ?? [];
232:   if (node.kind === "law") {
233:     const lines = [`**${l.code}** — ${l.title}: ${String(l.law?.status ?? "")}${l.law?.effective ? `, effective ${String(l.law.effective)}` : ""}.`, shortStatement(node.text, 360)];
234:     if (l.law?.statusNote) lines.push(`Status: ${shortStatement(String(l.law.statusNote), 420)}`);
235:     if (l.obligations?.length) {
236:       lines.push(`${l.obligations.length} obligation(s), on ${roles.join(", ")}:`);
237:       for (const o of l.obligations.slice(0, 8)) lines.push(`- **${o.code}** ${o.title} (${((o.roles as string[] | undefined) ?? []).join(", ")}; from ${String(o.effective)})`);
238:     } else lines.push("No obligations are tracked for this law.");
239:     if (l.yourRoles?.length) lines.push(`Your role under this law (recorded): ${l.yourRoles.join(", ")}.`);
240:     else {
241:       lines.push("You have not recorded how this law applies to you. The law's own definitions decide it; an approver records the roles you hold on the State AI laws page:");
242:       for (const d of l.definitions.slice(0, 4)) lines.push(`- *${d.role}*: “${shortStatement(d.definition, 240)}”`);
243:     }
244:     return lines;
245:   }
246:   const lines = [`**${l.code}** — ${l.title}: ${shortStatement(node.text, 480)}`];
247:   if (l.law) lines.push(`Law: ${l.law.code}, ${l.law.title} (${String(l.law.status)})${l.section ? `, ${String(l.section)}` : ""}.`);
248:   lines.push(`Applies to: ${roles.join(", ")}; ${l.timing === "upcoming" ? `takes effect on ${String(l.effective)}` : l.timing === "ended" ? `no longer in effect after ${String(l.until)}` : `in force since ${String(l.effective)}`}.`);
249:   lines.push(l.yourRoles?.length ? `Your role under this law (recorded): ${l.yourRoles.join(", ")}.` : "You have not recorded how this law applies to you.");
250:   if (l.assessment?.applicable) lines.push(`Your implementation: level ${l.assessment.current} of target ${l.assessment.target}.`);
251:   return lines;
252: }
253:
254: const copilot: Playbook = async (host, goal, input) => {
255:   const q = goal.toLowerCase();
256:   const codes = extractCodes(goal);
257:   const contextNode = typeof input["nodeId"] === "string" ? host.registry.node(input["nodeId"] as string) : undefined;
258:   host.step({ type: "plan", title: "Understand the question", detail: codes.length ? `Requirements mentioned: ${codes.join(", ")}` : "No explicit requirement codes — interpreting intent" });
259:
260:   const lines: string[] = [];
261:   const focusIds: string[] = [];
262:
263:   const nodes: RequirementNode[] = [];
264:   for (const n of codes.map((c) => resolveNode(host, c))) if (n && !nodes.some((x) => x.id === n.id)) nodes.push(n);
265:   if (!nodes.length && contextNode && /\b(this|it|here|selected)\b/.test(q)) nodes.push(contextNode);
266:   if (!nodes.length) {
267:     const law = lawNamed(host, goal);
268:     if (law) nodes.push(law);
269:   }
270:
271:   const wantsMap = /\b(map|mapping|crosswalk|soc ?2|800-53|also satisf|reuse)\b/.test(q);
272:   const wantsGaps = /\b(gap|gaps|priorit|next|focus|biggest|weakest|worst|start)\b/.test(q);
273:   const wantsStatus = /\b(status|readiness|progress|how are we|summary|overview|score|ready)\b/.test(q);
274:   const wantsEvidence = /\b(evidence|proof|artifact)\b/.test(q);
275:   const wantsTasks = /\b(task|overdue|todo|plan|deadline)\b/.test(q);
276:
277:   for (const node of nodes.slice(0, 4)) {
278:     const family = host.registry.framework(node.frameworkId)?.graph.framework.family;
279:     if (family === "threat") {
280:       lines.push(...threatAnswer(host, node, focusIds), "");
281:       continue;
282:     }
283:     if (family === "law") {
284:       lines.push(...lawAnswer(host, node), "");
285:       focusIds.push(node.id);
286:       continue;
287:     }
288:     const detail = (await getRequirement.run(host, { id: node.id })) as Record<string, unknown>;
289:     const a = detail["assessment"] as Record<string, unknown> | null;
290:     lines.push(`**${node.code}** — ${node.title && node.title !== node.code ? `${node.title}: ` : ""}${node.text}`);
291:     if (a) lines.push(`Current: ${a["currentLabel"]} (level ${a["current"]}) · Target: ${a["targetLabel"]} (level ${a["target"]}) · Status: ${detail["status"]}`);
292:     const examples = (detail["examples"] as string[] | undefined) ?? [];
293:     if (examples.length) lines.push(`Official implementation examples: ${examples.slice(0, 3).map((e) => `“${shortStatement(e, 110)}”`).join("; ")}`);
294:     if (wantsMap) {
295:       const cw = (await crosswalk.run(host, { nodeId: node.id })) as { mappings: { code: string; framework: string; relationship: string }[] };
296:       if (cw.mappings.length) lines.push(`Crosswalk: ${cw.mappings.slice(0, 10).map((m) => `${m.code} (${frameworkLabel(m.framework)}, ${m.relationship})`).join(", ")}`);
297:       else lines.push("No authoritative crosswalk mappings are loaded for this requirement yet.");
298:     }
299:     lines.push("");
300:     focusIds.push(node.id);
301:   }
302:
303:   if (!nodes.length && (wantsStatus || (!wantsGaps && !wantsEvidence && !wantsTasks && /\b(we|our|us)\b/.test(q)))) {
304:     const overview = (await workspaceOverview.run(host, {})) as {
305:       frameworks: { id: string; name: string; readinessPercent: number; gaps: number; evidenceCoveragePercent: number; topGaps: string[] }[];
306:       tasks: { open: number; overdue: number };
307:       evidence: { pendingReview: number };
308:     };
309:     for (const f of overview.frameworks) {
310:       lines.push(`**${f.name}** — readiness ${f.readinessPercent}%, ${f.gaps} open gaps, evidence coverage ${f.evidenceCoveragePercent}%.`);
311:       if (f.topGaps.length) lines.push(`Largest gaps: ${f.topGaps.slice(0, 5).join(", ")}.`);
312:     }
313:     lines.push(`Work: ${overview.tasks.open} open tasks (${overview.tasks.overdue} overdue), ${overview.evidence.pendingReview} evidence items awaiting review.`);
314:   }
315:
316:   if (!nodes.length && wantsGaps) {
317:     const fw = primaryFramework(host, input);
318:     const res = (await listRequirements.run(host, { framework: fw, minGap: 1, limit: 8 })) as { rows: { id: string; code: string; text: string; current: number; target: number; priority?: string }[] };
319:     if (res.rows.length) {
320:       lines.push(`Highest-leverage gaps in ${frameworkLabel(fw)} (largest distance to target first):`);
321:       for (const r of res.rows) {
322:         lines.push(`- **${r.code}** (${r.current}→${r.target}${r.priority ? `, ${r.priority}` : ""}) ${shortStatement(r.text, 110)}`);
323:         focusIds.push(r.id);
324:       }
325:       lines.push("");
326:       lines.push("Ask the Planner to turn these into scheduled tasks, or open one in the Observatory to act on it.");
327:     } else lines.push(`No open gaps in ${frameworkLabel(fw)} — every in-scope outcome meets its target.`);
328:   }
329:
330:   if (!nodes.length && wantsEvidence) {
331:     const missing = [];
332:     for (const fw of enabledFrameworks(host)) {
333:       const index = host.registry.framework(fw)!;
334:       for (const n of index.assessable) {
335:         const s = host.state(n.id);
336:         if (!s?.applicable || s.current < 2) continue;
337:         const ev = host.evidence().filter((e) => e.requirementIds.includes(n.id) && isEvidenceValid(e));
338:         if (!ev.length) missing.push(n);
339:       }
340:     }
341:     lines.push(missing.length ? `${missing.length} implemented requirement(s) have no valid evidence yet. First ten:` : "Every implemented requirement has valid evidence.");
342:     for (const n of missing.slice(0, 10)) {
343:       lines.push(`- **${n.code}** ${shortStatement(n.text, 100)}`);
344:       focusIds.push(n.id);
345:     }
346:   }
347:
348:   if (!nodes.length && wantsTasks) {
349:     const today = new Date().toISOString().slice(0, 10);
350:     const open = host.tasks().filter((t) => t.status !== "done");
351:     const overdue = open.filter((t) => t.dueDate && t.dueDate < today);
352:     lines.push(`${open.length} open task(s), ${overdue.length} overdue.`);
353:     for (const t of (overdue.length ? overdue : open).slice(0, 8)) lines.push(`- ${t.title} — ${t.status}${t.dueDate ? `, due ${t.dueDate}` : ""}`);
354:   }
355:
356:   // Ground the answer in the official corpus: the corpus of the requirement, law or threat asked about.
357:   const first = nodes[0];
358:   const searchQuery = !first
359:     ? goal
360:     : first.kind === "jurisdiction"
361:       ? (host.registry.framework(first.frameworkId)?.childrenOf(first.id).map((l) => l.title).join(" ") ?? first.title)
362:       : `${first.code} ${first.title} ${first.text}`;
363:   const hits = host.registry.search.search(searchQuery, { limit: 3, framework: first ? corpusOf(host, first.frameworkId) : undefined });
364:   if (hits.length) {
365:     const citations = hits.map(hitToCitation);
366:     host.step({ type: "citation", title: "Grounding in the official corpus", citations });
367:     if (!lines.length) {
368:       lines.push("From the official documentation:");
369:       for (const c of citations) lines.push(`> ${c.quote}\n> — *${c.documentTitle}${c.page ? `, p. ${c.page}` : ""}*`);
370:       // Related requirements from the framework the best passage belongs to (never a threat catalog).
371:       const fw = host.registry.frameworks.find((f) => f.family !== "threat" && corpusOf(host, f.id) === hits[0]!.chunk.framework && frameworkEnabled(host, f.id))?.id;
372:       const related = fw ? host.registry.framework(fw)!.search(goal, 5).filter((n) => n.assessable) : [];
373:       if (related.length) {
374:         lines.push("");
375:         lines.push(`Related requirements: ${related.map((n) => `**${n.code}**`).join(", ")}.`);
376:         focusIds.push(...related.map((n) => n.id));
377:       }
378:     } else {
379:       lines.push(`Sources: ${[...new Set(citations.map((c) => `*${c.documentTitle}${c.page ? `, p. ${c.page}` : ""}*`))].join("; ")}.`);
380:     }
381:   }
382:   if (!lines.length) lines.push("I couldn't find anything specific. Try naming a requirement code (e.g. PR.AA-01) or ask about readiness, gaps, evidence or tasks.");
383:
384:   if (focusIds.length) await focus.run(host, { nodeIds: [...new Set(focusIds)].slice(0, 20), lens: wantsGaps ? "gap" : wantsEvidence ? "evidence" : undefined });
385:   return lines.join("\n").trim();
386: };
387:
388: // ---------------------------------------------------------------------------
389: // Assessor
390: // ---------------------------------------------------------------------------
391:
392: const assessor: Playbook = async (host, _goal, input) => {
393:   const refused = !Array.isArray(input["nodeIds"]) && typeof input["taskId"] !== "string" ? unusableFramework(host, input) : undefined;
394:   if (refused) return refused;
395:   const nodes = scopeNodes(host, input, 12);
396:   host.step({ type: "plan", title: `Assess ${nodes.length} requirement(s)`, detail: "Weigh accepted evidence, completed tasks and monitoring results; stay conservative without evidence.", nodeIds: nodes.map((n) => n.id) });
397:   let proposed = 0;
398:   const rows: string[] = [];
399:   for (const node of nodes) {
400:     const s = host.state(node.id);
401:     if (!s || !s.applicable) continue;
402:     const family = host.registry.framework(node.frameworkId)!.graph.framework.family;
403:     const evidence = host.evidence().filter((e) => e.requirementIds.includes(node.id));
404:     const valid = evidence.filter((e) => isEvidenceValid(e));
405:     const doneTasks = host.tasks().filter((t) => t.requirementIds.includes(node.id) && t.status === "done");
406:     const passing = valid.filter((e) => e.kind === "automated-check").length;
407:     let level = s.current;
408:     const reasons: string[] = [];
409:     if (valid.length >= 1 && level < 2) {
410:       level = 2;
411:       reasons.push(`${valid.length} accepted, unexpired evidence item(s)`);
412:     }
413:     if ((valid.length >= 2 || passing >= 1) && doneTasks.length >= 1 && level < 3) {
414:       level = Math.min(3, Math.max(level, s.target));
415:       reasons.push(`${doneTasks.length} completed task(s) plus ${passing ? "passing automated checks" : "multiple evidence items"}`);
416:     }
417:     if (!valid.length && s.current > 2) {
418:       level = 2;
419:       reasons.push("no valid evidence supports a level above 2 — evidence is required to sustain it");
420:     }
421:     if (level === s.current) {
422:       rows.push(`- ${node.code}: confirmed at ${levelLabel(family, s.current)} (${valid.length} valid evidence, ${doneTasks.length} completed tasks)`);
423:       continue;
424:     }
425:     const citations = citeFor(host, node, 1);
426:     await proposeAssessment.run(host, {
427:       nodeId: node.id,
428:       current: level,
429:       rationale: `Proposed ${levelLabel(family, level)}: ${reasons.join("; ")}.`,
430:       confidence: valid.length >= 2 ? "high" : valid.length ? "medium" : "low",
431:       citations: citations.map((c) => ({ documentId: c.documentId, page: c.page, locator: c.locator, quote: c.quote })),
432:     });
433:     proposed++;
434:     rows.push(`- ${node.code}: ${levelLabel(family, s.current)} → **${levelLabel(family, level)}** — ${reasons.join("; ")}`);
435:   }
436:   return [`Assessed ${nodes.length} requirement(s); ${proposed} level change(s) proposed for your approval.`, "", ...rows].join("\n");
437: };
438:
439: // ---------------------------------------------------------------------------
440: // Planner
441: // ---------------------------------------------------------------------------
442:
443: const planner: Playbook = async (host, _goal, input) => {
444:   const refused = unusableFramework(host, input);
445:   if (refused) return refused;
446:   const fw = primaryFramework(host, input);
447:   const index = host.registry.framework(fw)!;
448:   const scoped = Array.isArray(input["nodeIds"]) || typeof input["taskId"] === "string" ? scopeNodes(host, input) : undefined;
449:   const openTaskNodes = new Set(host.tasks().filter((t) => t.status !== "done").flatMap((t) => t.requirementIds));
450:   const states = new Map(host.states(fw).map((s) => [s.nodeId, s]));
451:   const capacity = Number(input["weeklyCapacityHours"] ?? Math.max(8, host.workspace().profile.securityTeamSize * 12));
452:   const maxTasks = Number(input["maxTasks"] ?? 10);
453:   host.step({ type: "plan", title: `Plan ${frameworkLabel(fw)} work`, detail: `Capacity ${capacity} h/week; skipping ${openTaskNodes.size} requirement(s) that already have open tasks.` });
454:   const planned = planTasks(index, states, {
455:     workspaceId: host.workspace().id,
456:     startDate: new Date(),
457:     weeklyCapacityHours: capacity,
458:     nodeIds: scoped?.map((n) => n.id),
459:     existingTaskNodeIds: openTaskNodes,
460:     maxTasks,
461:     idFactory: () => newId("chk"),
462:   });
463:   const lines = [`Planned ${planned.length} task(s) for ${frameworkLabel(fw)}, highest priority × gap first:`, ""];
464:   for (const t of planned) {
465:     await proposeTask.run(host, {
466:       title: t.title,
467:       description: t.description,
468:       kind: t.kind,
469:       priority: t.priority,
470:       requirementIds: t.requirementIds,
471:       dueDate: t.dueDate,
472:       effortHours: t.effortHours,
473:       checklist: t.checklist.map((c) => c.text),
474:     });
475:     lines.push(`- **${t.title}** — ${t.kind}, ${t.priority}, ${t.effortHours} h, due ${t.dueDate} (basis: ${t.source?.basis})`);
476:   }
477:   if (!planned.length) lines.push("No gaps without open tasks — the plan is already complete for this scope.");
478:   if (planned.length) await focus.run(host, { nodeIds: planned.flatMap((t) => t.requirementIds).slice(0, 30), lens: "gap", note: "Planned work" });
479:   return lines.join("\n");
480: };
481:
482: // ---------------------------------------------------------------------------
483: // Policy author
484: // ---------------------------------------------------------------------------
485:
486: const policyAuthor: Playbook = async (host, _goal, input) => {
487:   let nodes = scopeNodes(host, input, 0);
488:   if (!nodes.length) {
489:     const code = typeof input["category"] === "string" ? (input["category"] as string) : "GV.PO";
490:     const node = host.registry.node(code);
491:     nodes = node ? host.registry.framework(node.frameworkId)!.assessableUnder(node.id) : [];
492:   }
493:   if (!nodes.length) return "Tell me which requirements or category the policy should cover.";
494:   const template = templateFor(nodes[0]!);
495:   // Pull in sibling outcomes the same template governs so the policy is complete.
496:   const index = host.registry.framework(nodes[0]!.frameworkId)!;
497:   const parent = nodes[0]!.parentId ? index.byId.get(nodes[0]!.parentId) : undefined;
498:   if (parent && nodes.length < 3) {
499:     for (const sibling of index.assessableUnder(parent.id)) if (!nodes.some((n) => n.id === sibling.id)) nodes.push(sibling);
500:   }
501:   host.step({ type: "plan", title: `Draft “${template.title}”`, detail: `Covering ${nodes.map((n) => n.code).join(", ")}`, nodeIds: nodes.map((n) => n.id) });
502:   const ws = host.workspace();
503:   const mappings = new Map<string, string[]>();
504:   for (const n of nodes) {
505:     const related = host.registry.crosswalk.related(n.id).filter((e) => frameworkOf(e.to) !== n.frameworkId);
506:     mappings.set(n.id, related.map((e) => `${codeOf(e.to)} (${frameworkLabel(frameworkOf(e.to))})`));
507:   }
508:   const citations = citeFor(host, nodes[0]!, 2);
509:   if (citations.length) host.step({ type: "citation", title: "Official basis", citations });
510:   const body = composePolicy({
511:     template,
512:     org: ws.name,
513:     industry: ws.profile.industry,
514:     size: ws.profile.size,
515:     nodes,
516:     mappings,
517:     citations: citations.map((c) => ({ title: c.documentTitle, page: c.page })),
518:     effectiveDate: new Date().toISOString().slice(0, 10),
519:   });
520:   await proposePolicy.run(host, {
521:     title: template.title,
522:     requirementIds: nodes.map((n) => n.id),
523:     body,
524:     citations: citations.map((c) => ({ documentId: c.documentId, page: c.page, quote: c.quote })),
525:   });
526:   if (typeof input["taskId"] === "string") {
527:     await updateTask.run(host, { taskId: input["taskId"] as string, status: "in-review", note: `Draft “${template.title}” proposed — approve the policy to complete this task.` });
528:   }
529:   return `Drafted **${template.title}** covering ${nodes.length} requirement(s) (${nodes.map((n) => n.code).join(", ")}). Review the draft in the approvals queue, tailor it, and approve to publish.`;
530: };
531:
532: // ---------------------------------------------------------------------------
533: // Evidence collector
534: // ---------------------------------------------------------------------------
535:
536: const evidenceCollector: Playbook = async (host, _goal, input) => {
537:   const lines: string[] = [];
538:   const connectors = host.connectors().filter((c) => c.status === "active");
539:   host.step({ type: "plan", title: "Collect evidence", detail: `${connectors.length} active connector(s); then look for missing and expiring evidence.` });
540:   if (connectors.length) {
541:     const res = (await runChecks.run(host, {})) as { connectors?: { connector: string; results: { check: string; outcome: string; detail: string; requirements: string[] }[]; evidenceProposals: number }[] };
542:     for (const c of res.connectors ?? []) {
543:       const pass = c.results.filter((r) => r.outcome === "pass").length;
544:       lines.push(`**${c.connector}** — ${pass}/${c.results.length} checks passing${c.evidenceProposals ? `; ${c.evidenceProposals} proposed as evidence` : ""}.`);
545:       for (const r of c.results.filter((x) => x.outcome !== "pass")) lines.push(`- ${r.outcome.toUpperCase()}: ${r.check} — ${r.detail}`);
546:     }
547:   } else lines.push("No active connectors — add a Web Posture or Repository connector to automate evidence.");
548:
549:   const scope = Array.isArray(input["nodeIds"]) ? scopeNodes(host, input) : undefined;
550:   const now = Date.now();
551:   const expiring = host.evidence().filter((e) => e.status === "accepted" && e.validUntil && new Date(e.validUntil).getTime() - now < 30 * 86_400_000);
552:   const missing: RequirementNode[] = [];
553:   for (const fw of enabledFrameworks(host)) {
554:     for (const n of host.registry.framework(fw)!.assessable) {
555:       if (scope && !scope.some((x) => x.id === n.id)) continue;
556:       const s = host.state(n.id);
557:       if (!s?.applicable || s.current < 2) continue;
558:       if (!host.evidence().some((e) => e.requirementIds.includes(n.id) && isEvidenceValid(e))) missing.push(n);
559:     }
560:   }
561:   const openEvidenceTasks = new Set(host.tasks().filter((t) => t.kind === "evidence" && t.status !== "done").flatMap((t) => t.requirementIds));
562:   let created = 0;
563:   for (const n of missing) {
564:     if (created >= 6 || openEvidenceTasks.has(n.id)) continue;
565:     await proposeTask.run(host, {
566:       title: `${n.code} · Collect evidence of implementation`,
567:       description: `The requirement is assessed at level ${host.state(n.id)?.current} but has no valid evidence. Collect artifacts that demonstrate: ${n.text}`,
568:       kind: "evidence",
569:       priority: host.state(n.id)?.priority ?? "medium",
570:       requirementIds: [n.id],
571:       checklist: ["Identify the system of record", "Export or screenshot the configuration / record", "Upload and link the evidence", "Request review"],
572:     });
573:     created++;
574:   }
575:   for (const e of expiring.slice(0, 4)) {
576:     await proposeTask.run(host, {
577:       title: `Refresh evidence: ${shortStatement(e.title, 80)}`,
578:       description: `Evidence “${e.title}” expires on ${e.validUntil?.slice(0, 10)}. Collect a current version before it lapses.`,
579:       kind: "evidence",
580:       priority: "high",
581:       requirementIds: e.requirementIds,
582:       dueDate: e.validUntil?.slice(0, 10),
583:     });
584:   }
585:   lines.push("");
586:   lines.push(`${missing.length} implemented requirement(s) lack valid evidence; proposed ${created} collection task(s). ${expiring.length} accepted item(s) expire within 30 days.`);
587:   if (missing.length) await focus.run(host, { nodeIds: missing.slice(0, 20).map((n) => n.id), lens: "evidence", note: "Requirements missing evidence" });
588:   return lines.join("\n");
589: };
590:
591: // ---------------------------------------------------------------------------
592: // Crosswalk analyst
593: // ---------------------------------------------------------------------------
594:
595: const crosswalkAnalyst: Playbook = async (host, _goal, input) => {
596:   const refused = unusableFramework(host, input);
597:   if (refused) return refused;
598:   const targets = (typeof input["framework"] === "string" ? [input["framework"] as string] : enabledFrameworks(host).filter((f) => f !== "nist-csf-2.0")).filter((f) => !isThreatFramework(host, f));
599:   const allStates = new Map(host.states().map((s) => [s.nodeId, s]));
600:   const lines: string[] = [];
601:   host.step({ type: "plan", title: "Project progress across frameworks", detail: `Targets: ${targets.map(frameworkLabel).join(", ") || "none"} · ${host.registry.crosswalk.size} authoritative mappings loaded` });
602:   let total = 0;
603:   for (const fw of targets) {
604:     const index = host.registry.framework(fw);
605:     if (!index) continue;
606:     const projections = projectLevels(host.registry.crosswalk as CrosswalkIndex, index.assessable.map((n) => n.id), allStates);
607:     const candidates = projections
608:       .filter((p) => {
609:         const s = host.state(p.nodeId);
610:         return s?.applicable && p.suggested > s.current && p.confidence !== "low";
611:       })
612:       .slice(0, Number(input["maxProposals"] ?? 15));
613:     lines.push(`**${frameworkLabel(fw)}** — ${projections.length} requirement(s) have mapped progress; ${candidates.length} can be raised with medium/high confidence.`);
614:     for (const p of candidates) {
615:       const node = index.byId.get(p.nodeId)!;
616:       const family = index.graph.framework.family;
617:       const sources = p.sources.slice(0, 5).map((s) => `${codeOf(s.nodeId)} at level ${s.level} (${s.relationship})`).join(", ");
618:       await proposeAssessment.run(host, {
619:         nodeId: p.nodeId,
620:         current: p.suggested,
621:         rationale: `Crosswalk projection: ${sources}. Suggested ${levelLabel(family, p.suggested)}; confirm with evidence before audit.`,
622:         confidence: p.confidence,
623:       });
624:       lines.push(`- ${node.code} → ${levelLabel(family, p.suggested)} (${p.confidence}) via ${sources}`);
625:       total++;
626:     }
627:   }
628:   if (!total) lines.push("No projections strong enough to propose — progress in the source framework or more mappings are needed.");
629:   return lines.join("\n");
630: };
631:
632: // ---------------------------------------------------------------------------
633: // Audit prep
634: // ---------------------------------------------------------------------------
635:
636: const auditorPrep: Playbook = async (host, _goal, input) => {
637:   const refused = unusableFramework(host, input);
638:   if (refused) return refused;
639:   const fw = typeof input["framework"] === "string" ? (input["framework"] as string) : enabledFrameworks(host).includes("aicpa-tsc-2017") ? "aicpa-tsc-2017" : primaryFramework(host, input);
640:   const index = host.registry.framework(fw)!;
641:   const score = host.score(fw);
642:   host.step({ type: "plan", title: `Readiness review: ${frameworkLabel(fw)}`, detail: "Check gaps, evidence, policies and overdue work like an independent assessor." });
643:   const now = new Date();
644:   const gaps = index.assessable.filter((n) => {
645:     const s = host.state(n.id);
646:     return s?.applicable && s.target > s.current;
647:   });
648:   const noEvidence = index.assessable.filter((n) => {
649:     const s = host.state(n.id);
650:     return s?.applicable && s.current >= 2 && !host.evidence().some((e) => e.requirementIds.includes(n.id) && isEvidenceValid(e, now));
651:   });
652:   const atRisk = index.assessable.filter((n) => statusOf(host, n.id)?.status === "at-risk");
653:   const draftPolicies = host.policies().filter((p) => p.status === "draft" || p.status === "in-review");
654:   const overdue = host.tasks().filter((t) => t.status !== "done" && t.dueDate && t.dueDate < now.toISOString().slice(0, 10));
655:   const lines = [
656:     `## Readiness brief — ${frameworkLabel(fw)}`,
657:     "",
658:     `- Readiness: **${pct(score.overall.readiness)}** across ${score.overall.total} in-scope ${index.graph.framework.unitLabelPlural}`,
659:     `- Evidence coverage: **${pct(score.overall.evidenceCoverage)}**; verified: ${pct(score.overall.verifiedShare)}`,
660:     `- Open gaps: ${gaps.length} · Implemented without evidence: ${noEvidence.length} · At risk: ${atRisk.length}`,
661:     `- Policies awaiting approval: ${draftPolicies.length} · Overdue tasks: ${overdue.length}`,
662:     "",
663:   ];
664:   const blockers: { node: RequirementNode; why: string }[] = [
665:     ...atRisk.map((n) => ({ node: n, why: statusOf(host, n.id)?.reasons.join("; ") ?? "at risk" })),
666:     ...noEvidence.map((n) => ({ node: n, why: "no valid evidence for an implemented requirement" })),
667:   ].slice(0, 8);
668:   if (blockers.length) {
669:     lines.push("### Blocking items an assessor would flag");
670:     for (const b of blockers) lines.push(`- **${b.node.code}** — ${b.why}`);
671:     lines.push("");
672:   }
673:   const existing = new Set(host.tasks().filter((t) => t.status !== "done").flatMap((t) => t.requirementIds));
674:   let proposed = 0;
675:   for (const b of blockers) {
676:     if (existing.has(b.node.id) || proposed >= 5) continue;
677:     await proposeTask.run(host, {
678:       title: `${b.node.code} · Resolve audit blocker`,
679:       description: `${b.why}. Requirement: ${b.node.text}`,
680:       kind: "evidence",
681:       priority: "high",
682:       requirementIds: [b.node.id],
683:     });
684:     proposed++;
685:   }
686:   if (fw === "aicpa-tsc-2017") {
687:     const settings = host.workspace().frameworks.find((f) => f.frameworkId === fw)?.soc2;
688:     lines.push(`Report: SOC 2 ${settings?.reportType === "type1" ? "Type 1" : "Type 2"}${settings?.observationStart ? `, observation ${settings.observationStart} → ${settings.observationEnd}` : ""}. Export the PBC (provided-by-client) evidence request list from Reports.`);
689:   }
690:   lines.push(`Proposed ${proposed} remediation task(s). This brief does not predict an audit opinion; it shows what an assessor is likely to request.`);
691:   await focus.run(host, { nodeIds: blockers.map((b) => b.node.id).concat(gaps.slice(0, 10).map((n) => n.id)).slice(0, 30), lens: "status", note: "Audit blockers and gaps" });
692:   return lines.join("\n");
693: };
694:
695: // ---------------------------------------------------------------------------
696: // Task executor
697: // ---------------------------------------------------------------------------
698:
699: const taskExecutor: Playbook = async (host, goal, input) => {
700:   const taskId = typeof input["taskId"] === "string" ? (input["taskId"] as string) : undefined;
701:   const task: Task | undefined = taskId ? host.tasks().find((t) => t.id === taskId) : undefined;
702:   if (!task) return "Select a task to execute.";
703:   const action = task.automation?.action ?? "implementation-guide";
704:   host.step({ type: "plan", title: `Execute “${task.title}”`, detail: `Action: ${action}`, nodeIds: task.requirementIds });
705:   if (action === "draft-policy" || action === "draft-procedure") return policyAuthor(host, goal, { taskId: task.id });
706:   if (action === "collect-evidence" || action === "run-checks") {
707:     const out = await evidenceCollector(host, goal, { nodeIds: task.requirementIds });
708:     await updateTask.run(host, { taskId: task.id, status: "in-review", note: "Checks run and evidence proposals staged." });
709:     return out;
710:   }
711:   if (action === "assess-requirement") {
712:     const out = await assessor(host, goal, { nodeIds: task.requirementIds });
713:     await updateTask.run(host, { taskId: task.id, status: "in-review", note: "Assessment proposals staged." });
714:     return out;
715:   }
716:   // Implementation guide: a concrete, reviewable runbook grounded in the requirement and its mappings.
717:   const nodes = task.requirementIds.map((id) => host.registry.node(id)).filter((n): n is RequirementNode => !!n);
718:   const guide: string[] = [`# Implementation guide — ${task.title}`, "", `Prepared for ${host.workspace().name}.`, ""];
719:   for (const node of nodes) {
720:     guide.push(`## ${node.code}`, "", `**Outcome:** ${node.text}`, "");
721:     const related = host.registry.crosswalk.related(node.id).filter((e) => frameworkOf(e.to) === "nist-sp-800-53-r5").slice(0, 6);
722:     if (related.length) {
723:       guide.push("**Control guidance (SP 800-53 Rev. 5 mappings):**", "");
724:       for (const e of related) {
725:         const c = host.registry.node(e.to);
726:         if (c) guide.push(`- **${c.code} ${c.title}** — ${shortStatement(c.text, 220)}`);
727:       }
728:       guide.push("");
729:     }
730:   }
731:   guide.push("## Steps", "");
732:   task.checklist.forEach((c, i) => guide.push(`${i + 1}. ${c.text}`));
733:   guide.push("", "## Verification", "", "- Confirm the outcome is achieved in production, not only documented.", "- Capture evidence (configuration export, screenshot, record) with a date.", "- Link evidence to the requirement(s) and request review in Visua.");
734:   const citations = nodes[0] ? citeFor(host, nodes[0], 2) : [];
735:   if (citations.length) host.step({ type: "citation", title: "Official basis", citations });
736:   // A plan is not proof: the guide is attached to the task, never filed as evidence.
737:   await updateTask.run(host, { taskId: task.id, status: "in-progress", note: guide.join("\n") });
738:   return `Prepared an implementation guide for **${task.title}** with ${task.checklist.length} step(s) and mapped control guidance. Approve it to attach the guide to the task; evidence is collected only after the work is done.`;
739: };
740:
741: export const PLAYBOOKS: Record<AgentKind, Playbook> = {
742:   copilot,
743:   assessor,
744:   planner,
745:   "policy-author": policyAuthor,
746:   "evidence-collector": evidenceCollector,
747:   "crosswalk-analyst": crosswalkAnalyst,
748:   "auditor-prep": auditorPrep,
749:   "task-executor": taskExecutor,
750: };
751:
752: export async function runOffline(host: AgentHost, agent: AgentKind, goal: string, input: Record<string, unknown>): Promise<AgentResult> {
753:   const summary = await PLAYBOOKS[agent](host, goal, input);
754:   host.step({ type: "message", title: summary.split("\n").find((l) => l.trim())?.replace(/^[#*\-\s]+/, "").slice(0, 110) ?? "Done", detail: summary });
755:   return { summary, mode: "offline" };
756: }

FILE packages/agents/src/policies.ts SHA256 43377066e739248aa2660969217857ec5db68c1fdb41203b418d8d3f84eeeae5
1: /**
2:  * Policy library used by the Policy Author. Each template names the
3:  * requirement groups it governs across frameworks; the body is composed from
4:  * the official outcome text and implementation examples, so drafts are
5:  * grounded rather than boilerplate.
6:  */
7: import { codeOf, frameworkOf, type RequirementNode } from "@visua/core";
8:
9: export interface PolicyTemplate {
10:   id: string;
11:   title: string;
12:   purpose: string;
13:   scope: string;
14:   roles: [string, string][];
15:   /** Code prefixes that route to this template (CSF categories, SOC 2 series, SP 800-53 families). */
16:   matches: string[];
17:   reviewCadenceDays: number;
18: }
19:
20: export const POLICY_TEMPLATES: PolicyTemplate[] = [
21:   {
22:     id: "ai-governance-policy",
23:     title: "Artificial Intelligence Governance and Risk Management Policy",
24:     purpose:
25:       "set how {org} governs, maps, measures and manages the risks of the AI systems it develops, procures or deploys, so that they remain trustworthy, lawful and aligned with {org}'s values and risk tolerance",
26:     scope: "every AI system {org} develops, fine-tunes, procures or deploys — including third-party models and generative AI services — and everyone who designs, operates, oversees or uses them",
27:     roles: [
28:       ["Executive leadership", "Sets AI risk tolerance, approves this policy and is accountable for AI risk decisions."],
29:       ["AI governance committee", "Maintains the AI system inventory, reviews high-risk systems before deployment and tracks AI incidents."],
30:       ["System owners", "Document each AI system's intended purpose, context of use, limitations and human oversight, and keep its risk assessment current."],
31:       ["Test, evaluation, verification and validation (TEVV) roles", "Measure performance, robustness, bias and other trustworthiness characteristics before and after deployment."],
32:       ["All workforce members", "Use AI systems only as approved and report unexpected or harmful behavior."],
33:     ],
34:     matches: ["GOVERN", "MAP", "MEASURE", "MANAGE"],
35:     reviewCadenceDays: 365,
36:   },
37:   {
38:     id: "information-security-policy",
39:     title: "Information Security Policy",
40:     purpose:
41:       "establish management's direction, commitment and expectations for protecting {org}'s information and systems, and to set the framework within which all other security policies operate",
42:     scope: "all workforce members, contractors, systems, data and facilities of {org}",
43:     roles: [
44:       ["Executive leadership / board", "Approves this policy, sets risk appetite and provides resources and oversight."],
45:       ["Security lead (CISO or delegate)", "Owns the security program, maintains policies and reports on risk."],
46:       ["All workforce members", "Comply with this policy and report suspected incidents."],
47:     ],
48:     matches: ["GV.PO", "GV.OC", "GV.RM", "GV.OV", "CC1", "CC2", "CC5", "PL", "PM"],
49:     reviewCadenceDays: 365,
50:   },
51:   {
52:     id: "roles-responsibilities-charter",
53:     title: "Security Roles, Responsibilities and Authorities Charter",
54:     purpose: "define accountable roles, responsibilities and decision authorities for cybersecurity risk management at {org}",
55:     scope: "leadership, managers and every role with security responsibilities at {org}",
56:     roles: [
57:       ["Executive leadership", "Accountable for cybersecurity risk and for allocating resources."],
58:       ["Security lead", "Coordinates the program and escalates risk decisions."],
59:       ["Human resources", "Integrates security into hiring, onboarding, role changes and offboarding."],
60:     ],
61:     matches: ["GV.RR", "PS"],
62:     reviewCadenceDays: 365,
63:   },
64:   {
65:     id: "risk-management-policy",
66:     title: "Risk Assessment and Management Policy",
67:     purpose: "define how {org} identifies, analyzes, prioritizes, responds to and monitors cybersecurity risk",
68:     scope: "all systems, processes, suppliers and data that support {org}'s mission",
69:     roles: [
70:       ["Risk owner", "Accepts, mitigates, transfers or avoids assigned risks within appetite."],
71:       ["Security lead", "Maintains the risk register and methodology."],
72:     ],
73:     matches: ["ID.RA", "ID.IM", "GV.RM", "CC3", "CC9.1", "RA", "CA"],
74:     reviewCadenceDays: 365,
75:   },
76:   {
77:     id: "asset-management-policy",
78:     title: "Asset Management Policy",
79:     purpose: "ensure {org}'s hardware, software, services, data and systems are inventoried, owned, classified and managed through their life cycle",
80:     scope: "all assets that store, process or transmit {org} data, including cloud services",
81:     roles: [
82:       ["Asset owners", "Keep inventory records accurate and approve access."],
83:       ["IT / platform team", "Operate discovery tooling and disposal procedures."],
84:     ],
85:     matches: ["ID.AM", "CM-8", "PM-5"],
86:     reviewCadenceDays: 365,
87:   },
88:   {
89:     id: "access-control-policy",
90:     title: "Identity and Access Control Policy",
91:     purpose: "ensure access to {org}'s systems and data is limited to authorized users, services and devices, following least privilege and strong authentication",
92:     scope: "all identities (workforce, service accounts, devices) and all systems holding {org} data",
93:     roles: [
94:       ["System owners", "Approve access and review it periodically."],
95:       ["IT / identity team", "Operate identity provider, MFA and provisioning."],
96:       ["Managers", "Request and attest to their team's access."],
97:     ],
98:     matches: ["PR.AA", "CC6.1", "CC6.2", "CC6.3", "CC6.4", "CC6.5", "AC", "IA", "PE"],
99:     reviewCadenceDays: 365,
100:   },
101:   {
102:     id: "data-protection-policy",
103:     title: "Data Protection and Cryptography Policy",
104:     purpose: "protect the confidentiality, integrity and availability of {org}'s data at rest, in transit and in use, including backups",
105:     scope: "all data created, received, stored or processed by {org}",
106:     roles: [
107:       ["Data owners", "Classify data and approve its handling."],
108:       ["Engineering / IT", "Implement encryption, backups and secure disposal."],
109:     ],
110:     matches: ["PR.DS", "CC6.1", "CC6.7", "C1", "PI1", "SC", "MP"],
111:     reviewCadenceDays: 365,
112:   },
113:   {
114:     id: "secure-configuration-change-policy",
115:     title: "Secure Configuration and Change Management Policy",
116:     purpose: "ensure {org}'s platforms are securely configured, patched and changed in a controlled, reviewed manner, and that software is developed securely",
117:     scope: "all hardware, software, cloud services and code repositories operated by {org}",
118:     roles: [
119:       ["Engineering leads", "Approve changes and enforce secure development practices."],
120:       ["Platform / IT", "Maintain baselines, patching and configuration monitoring."],
121:     ],
122:     matches: ["PR.PS", "CC7.1", "CC8", "CM", "SA-8", "SA-10", "SA-11", "SA-15", "SI-2", "MA"],
123:     reviewCadenceDays: 365,
124:   },
125:   {
126:     id: "resilience-policy",
127:     title: "Technology Infrastructure Resilience Policy",
128:     purpose: "ensure {org}'s networks and infrastructure are protected and resilient enough to meet availability commitments",
129:     scope: "networks, environments and capacity supporting {org} services",
130:     roles: [["Platform / network team", "Design segmentation, redundancy and capacity management."]],
131:     matches: ["PR.IR", "A1", "SC-7", "CP-7", "CP-8"],
132:     reviewCadenceDays: 365,
133:   },
134:   {
135:     id: "logging-monitoring-standard",
136:     title: "Logging and Continuous Monitoring Standard",
137:     purpose: "ensure {org} detects anomalies, indicators of compromise and adverse events quickly through continuous monitoring and log analysis",
138:     scope: "networks, endpoints, cloud services, applications and personnel activity relevant to security",
139:     roles: [
140:       ["Security operations", "Triage alerts and escalate incidents."],
141:       ["System owners", "Enable required logging and retain logs."],
142:     ],
143:     matches: ["DE.CM", "DE.AE", "CC7.2", "CC7.3", "AU", "SI-4", "CA-7"],
144:     reviewCadenceDays: 365,
145:   },
146:   {
147:     id: "incident-response-plan",
148:     title: "Incident Response Plan",
149:     purpose: "define how {org} prepares for, detects, analyzes, contains, eradicates and recovers from cybersecurity incidents and communicates about them",
150:     scope: "all suspected or confirmed cybersecurity incidents affecting {org} or its customers",
151:     roles: [
152:       ["Incident commander", "Leads the response and declares severity."],
153:       ["Communications lead", "Coordinates internal, customer and regulatory communications."],
154:       ["Legal / privacy", "Assesses notification obligations."],
155:     ],
156:     matches: ["RS.MA", "RS.AN", "RS.CO", "RS.MI", "CC7.4", "CC7.5", "IR"],
157:     reviewCadenceDays: 365,
158:   },
159:   {
160:     id: "business-continuity-dr-plan",
161:     title: "Business Continuity and Disaster Recovery Plan",
162:     purpose: "ensure {org} can restore assets and operations affected by incidents and disruptions within agreed recovery objectives",
163:     scope: "critical business processes, systems and data of {org}",
164:     roles: [
165:       ["Recovery lead", "Executes and coordinates recovery activities."],
166:       ["System owners", "Maintain and test recovery procedures and backups."],
167:     ],
168:     matches: ["RC.RP", "RC.CO", "A1.2", "A1.3", "CP"],
169:     reviewCadenceDays: 365,
170:   },
171:   {
172:     id: "supplier-risk-policy",
173:     title: "Supplier and Third-Party Risk Management Policy",
174:     purpose: "manage cybersecurity risks arising from {org}'s suppliers, service providers and technology supply chain",
175:     scope: "all suppliers and third parties that access {org} data or provide critical products or services",
176:     roles: [
177:       ["Procurement", "Ensures due diligence and contractual security requirements."],
178:       ["Supplier owners", "Monitor supplier performance and risk."],
179:     ],
180:     matches: ["GV.SC", "CC9.2", "SA-4", "SA-9", "SR"],
181:     reviewCadenceDays: 365,
182:   },
183:   {
184:     id: "security-awareness-policy",
185:     title: "Security Awareness and Training Policy",
186:     purpose: "ensure everyone at {org} has the awareness and skills to perform their tasks with cybersecurity risks in mind",
187:     scope: "all workforce members and contractors, with role-based training for privileged and specialized roles",
188:     roles: [["Security lead", "Runs the awareness program and tracks completion."], ["Managers", "Ensure their teams complete training."]],
189:     matches: ["PR.AT", "CC1.4", "CC2.2", "AT"],
190:     reviewCadenceDays: 365,
191:   },
192:   {
193:     id: "privacy-policy",
194:     title: "Privacy Program Policy",
195:     purpose: "govern how {org} collects, uses, retains, discloses and disposes of personal information in line with its privacy commitments",
196:     scope: "all personal information processed by {org}",
197:     roles: [["Privacy officer", "Owns privacy notices, consent, rights requests and privacy risk."]],
198:     matches: ["P1", "P2", "P3", "P4", "P5", "P6", "P7", "P8", "PT"],
199:     reviewCadenceDays: 365,
200:   },
201: ];
202:
203: export function templateFor(node: RequirementNode): PolicyTemplate {
204:   const code = node.code.toUpperCase();
205:   let best: { t: PolicyTemplate; len: number } | undefined;
206:   for (const t of POLICY_TEMPLATES) {
207:     for (const m of t.matches) {
208:       if ((code === m || code.startsWith(`${m}.`) || code.startsWith(`${m}-`) || code.startsWith(m)) && (!best || m.length > best.len)) {
209:         best = { t, len: m.length };
210:       }
211:     }
212:   }
213:   return best?.t ?? POLICY_TEMPLATES[0]!;
214: }
215:
216: /** "Share the organization's mission…" → "The organization shall share the organization's mission…" */
217: export function toShall(example: string, org: string): string {
218:   const text = example.trim().replace(/\.$/, "");
219:   const first = text.charAt(0).toLowerCase() + text.slice(1);
220:   return `${org} shall ${first.replace(/\bthe organization's\b/gi, `${org}'s`).replace(/\bthe organization\b/gi, org)}.`;
221: }
222:
223: /** Outcome statement ("X is Y") → normative requirement. */
224: export function outcomeToShall(text: string, org: string): string {
225:   const clean = text.trim().replace(/\.$/, "");
226:   return `${org} shall ensure that ${clean.charAt(0).toLowerCase()}${clean.slice(1)}.`;
227: }
228:
229: export interface ComposeInput {
230:   template: PolicyTemplate;
231:   org: string;
232:   industry: string;
233:   size: string;
234:   nodes: RequirementNode[];
235:   /** Requirement id → codes of mapped requirements in other frameworks. */
236:   mappings: Map<string, string[]>;
237:   citations: { title: string; page?: number }[];
238:   effectiveDate: string;
239: }
240:
241: export function composePolicy(input: ComposeInput): string {
242:   const { template: t, org } = input;
243:   const fill = (s: string) => s.replaceAll("{org}", org);
244:   const lines: string[] = [];
245:   lines.push(`# ${t.title}`);
246:   lines.push("");
247:   lines.push(`| Field | Value |`);
248:   lines.push(`|---|---|`);
249:   lines.push(`| Organization | ${org} |`);
250:   lines.push(`| Version | 1.0 (draft) |`);
251:   lines.push(`| Effective date | ${input.effectiveDate} (upon approval) |`);
252:   lines.push(`| Review cadence | Every ${Math.round(t.reviewCadenceDays / 30)} months, or after significant change |`);
253:   lines.push(`| Owner | Security lead |`);
254:   lines.push("");
255:   lines.push("## 1. Purpose");
256:   lines.push("");
257:   lines.push(`The purpose of this policy is to ${fill(t.purpose)}.`);
258:   lines.push("");
259:   lines.push("## 2. Scope");
260:   lines.push("");
261:   lines.push(`This policy applies to ${fill(t.scope)}.`);
262:   lines.push("");
263:   lines.push("## 3. Roles and responsibilities");
264:   lines.push("");
265:   for (const [role, duty] of t.roles) lines.push(`- **${role}** — ${duty}`);
266:   lines.push("");
267:   lines.push("## 4. Policy statements");
268:   lines.push("");
269:   let n = 1;
270:   for (const node of input.nodes) {
271:     lines.push(`### 4.${n++} ${node.code} — ${node.title && node.title !== node.code ? node.title : shortText(node.text)}`);
272:     lines.push("");
273:     lines.push(outcomeToShall(node.text, org));
274:     const examples = node.examples ?? [];
275:     const pof = (node.attributes?.["pointsOfFocus"] as { title: string; text?: string }[] | undefined) ?? [];
276:     const suggested = (node.attributes?.["suggestedActions"] as string[] | undefined) ?? [];
277:     if (examples.length || pof.length || suggested.length) {
278:       lines.push("");
279:       lines.push("To achieve this:");
280:       lines.push("");
281:       for (const ex of examples) lines.push(`- ${toShall(ex.text, org)}`);
282:       for (const p of pof.slice(0, 8)) lines.push(`- ${org} shall address *${p.title}*${p.text ? ` — ${p.text.replace(/\.$/, "")}` : ""}.`);
283:       for (const a of suggested.slice(0, 5)) lines.push(`- ${toShall(a, org)}`);
284:     }
285:     lines.push("");
286:   }
287:   lines.push("## 5. Exceptions");
288:   lines.push("");
289:   lines.push(
290:     "Exceptions require a documented business justification, compensating controls, an expiry date, and approval by the security lead and the accountable risk owner. Exceptions are tracked in the risk register and reviewed at least quarterly.",
291:   );
292:   lines.push("");
293:   lines.push("## 6. Enforcement");
294:   lines.push("");
295:   lines.push(`Violations may result in revocation of access and disciplinary action consistent with ${org}'s HR policies. Suspected violations must be reported to the security lead.`);
296:   lines.push("");
297:   lines.push("## 7. Review");
298:   lines.push("");
299:   lines.push(`This policy is reviewed at least every ${Math.round(t.reviewCadenceDays / 30)} months and after significant changes to ${org}'s environment, threats or obligations. Approval is recorded in Visua with version history.`);
300:   lines.push("");
301:   lines.push("## 8. Requirements mapping");
302:   lines.push("");
303:   lines.push("| Requirement | Framework | Also satisfies |");
304:   lines.push("|---|---|---|");
305:   for (const node of input.nodes) {
306:     const mapped = input.mappings.get(node.id) ?? [];
307:     lines.push(`| ${node.code} | ${frameworkLabel(node.frameworkId)} | ${mapped.length ? mapped.slice(0, 10).join(", ") : "—"} |`);
308:   }
309:   if (input.citations.length) {
310:     lines.push("");
311:     lines.push("## 9. References");
312:     lines.push("");
313:     for (const c of input.citations) lines.push(`- ${c.title}${c.page ? `, p. ${c.page}` : ""}`);
314:   }
315:   lines.push("");
316:   lines.push(`> Drafted by the Visua Policy Author for a ${input.size}-person ${input.industry} organization. Review, tailor and approve before publishing.`);
317:   return lines.join("\n");
318: }
319:
320: function shortText(text: string): string {
321:   const t = text.replace(/\s+/g, " ").trim();
322:   return t.length > 70 ? `${t.slice(0, 69)}…` : t;
323: }
324:
325: export function frameworkLabel(frameworkId: string): string {
326:   switch (frameworkId) {
327:     case "nist-csf-2.0":
328:       return "NIST CSF 2.0";
329:     case "aicpa-tsc-2017":
330:       return "SOC 2 (TSC)";
331:     case "nist-sp-800-53-r5":
332:       return "SP 800-53 Rev. 5";
333:     case "nist-rmf":
334:       return "NIST RMF";
335:     case "nist-ai-rmf":
336:       return "NIST AI RMF";
337:     default:
338:       return frameworkId;
339:   }
340: }
341:
342: export function mappedCodes(ids: string[]): string[] {
343:   return ids.map((id) => `${codeOf(id)} (${frameworkLabel(frameworkOf(id))})`);
344: }

FILE packages/agents/src/runtime.ts SHA256 584be8aee4f40aac3edf34d7b3b2d65fcd2a7564a3a7e04a9d1ced0342145def
1: /**
2:  * Agent runtime entry point: resolves the mode (Claude or offline), builds
3:  * the workspace context for the model, and runs the agent against a host.
4:  */
5: import { levelLabel } from "@visua/core";
6: import { AGENTS } from "./agents.ts";
7: import { claudeEnabled, runWithClaude } from "./claude.ts";
8: import type { AgentHost, AgentRequest, AgentResult } from "./host.ts";
9: import { runOffline } from "./offline.ts";
10: import { modelTask } from "./tools.ts";
11:
12: /** Compact, deterministic workspace context for the first user turn. */
13: export function workspaceContext(host: AgentHost, request: AgentRequest): string {
14:   const ws = host.workspace();
15:   const p = ws.profile;
16:   const lines = [
17:     `<workspace name="${ws.name}">`,
18:     `Industry: ${p.industry}; size: ${p.size}; security team: ${p.securityTeamSize}; environments: ${p.environments.join(", ")}.`,
19:     `Data: ${p.dataTypes.join(", ") || "none declared"}; drivers: ${p.drivers.join(", ") || "none declared"}; CSF tier (self-assessed): ${p.maturityTier}; guidance mode: ${p.guidance}.`,
20:   ];
21:   for (const f of ws.frameworks.filter((x) => x.enabled)) {
22:     const index = host.registry.framework(f.frameworkId);
23:     if (!index) continue;
24:     const score = host.score(f.frameworkId);
25:     const fam = index.graph.framework.family;
26:     lines.push(
27:       `Framework ${index.graph.framework.shortName} (${f.frameworkId}): readiness ${Math.round(score.overall.readiness * 100)}%, ` +
28:         `${score.overall.gaps} gaps, evidence coverage ${Math.round(score.overall.evidenceCoverage * 100)}%, default target ${levelLabel(fam, f.defaultTarget)}.`,
29:     );
30:   }
31:   lines.push("</workspace>");
32:   const input = Object.entries(request.input).filter(([, v]) => v !== undefined && v !== null && v !== "");
33:   if (input.length) lines.push(`<run_input>${JSON.stringify(Object.fromEntries(input))}</run_input>`);
34:   if (typeof request.input["taskId"] === "string") {
35:     const found = host.tasks().find((t) => t.id === request.input["taskId"]);
36:     // Licensed criterion text in a task never reaches the model (see modelTask).
37:     const task = found ? modelTask(host, found) : undefined;
38:     if (task) {
39:       lines.push(
40:         `<task id="${task.id}" status="${task.status}" kind="${task.kind}">${task.title}\n${task.description}\nChecklist:\n` +
41:           task.checklist.map((c) => `- [${c.done ? "x" : " "}] (${c.id}) ${c.text}`).join("\n") +
42:           `\nRequirements: ${task.requirementIds.join(", ")}</task>`,
43:       );
44:     }
45:   }
46:   return lines.join("\n");
47: }
48:
49: export async function executeAgent(host: AgentHost, request: AgentRequest): Promise<AgentResult> {
50:   const def = AGENTS[request.agent];
51:   if (!def) throw new Error(`Unknown agent '${request.agent}'`);
52:   if (claudeEnabled()) {
53:     return runWithClaude(host, def, workspaceContext(host, request), request.goal);
54:   }
55:   return runOffline(host, request.agent, request.goal, request.input);
56: }

FILE packages/agents/src/tools.ts SHA256 af052d213644cf45c2ef7b0080c61715141f40411e1643b159f7f4cb0b671a40
1: /**
2:  * Agent tools shared by the Claude runtime and the offline playbooks.
3:  * Read tools return compact JSON; write tools only *propose* changes.
4:  */
5: import { z } from "zod";
6: import {
7:   LEVEL_SCALES,
8:   STATUSES,
9:   codeOf,
10:   frameworkOf,
11:   isEvidenceValid,
12:   levelLabel,
13:   obligationTiming,
14:   type Citation,
15:   type FrameworkFamily,
16:   type RequirementNode,
17:   type Task,
18: } from "@visua/core";
19: import { STATUS_RANK, coverageGroup, threatPaths, type SearchHit } from "@visua/frameworks";
20: import type { AgentHost } from "./host.ts";
21: import { licensedTextToModel, WITHHELD_NOTICE } from "./mode.ts";
22:
23: export interface AgentTool<S extends z.ZodType = z.ZodType> {
24:   name: string;
25:   description: string;
26:   schema: S;
27:   /** Tools that change state (via proposals) — used to label steps. */
28:   writes?: boolean;
29:   run(host: AgentHost, input: z.infer<S>): Promise<unknown>;
30: }
31:
32: const defineTool = <S extends z.ZodType>(tool: AgentTool<S>): AgentTool<S> => tool;
33:
34: const Level = z.number().int().min(0).max(4);
35: const CitationInput = z.object({
36:   documentId: z.string().describe("Corpus document id returned by search_corpus"),
37:   page: z.number().int().optional(),
38:   locator: z.string().optional(),
39:   quote: z.string().describe("Short verbatim quote from the corpus passage"),
40: });
41:
42: export function hitToCitation(hit: SearchHit): Citation {
43:   return {
44:     documentId: hit.chunk.documentId,
45:     documentTitle: hit.chunk.documentTitle,
46:     locator: hit.chunk.locator,
47:     page: hit.chunk.page,
48:     quote: hit.quote,
49:   };
50: }
51:
52: function normalizeCitations(host: AgentHost, input: z.infer<typeof CitationInput>[] | undefined): Citation[] {
53:   return (input ?? [])
54:     .filter((c) => host.registry.documents.has(c.documentId))
55:     .map((c) => ({
56:       documentId: c.documentId,
57:       documentTitle: host.registry.documentTitle(c.documentId),
58:       page: c.page,
59:       locator: c.locator,
60:       quote: c.quote.slice(0, 600),
61:     }));
62: }
63:
64: function familyOf(host: AgentHost, nodeId: string): FrameworkFamily {
65:   return host.registry.framework(frameworkOf(nodeId))?.graph.framework.family ?? "csf";
66: }
67:
68: /**
69:  * A node by id or code. OWASP entries are also found by their edition-qualified keys:
70:  * "LLM04:2026" is the current entry LLM04, "LLM03:2025" the superseded LLM03-2025.
71:  */
72: export function resolveNode(host: AgentHost, idOrCode: string): RequirementNode | undefined {
73:   const code = idOrCode.trim();
74:   const found = host.registry.node(code);
75:   if (found) return found;
76:   const edition = /^((?:LLM|ASI)\d{2}):(20\d{2})$/i.exec(code);
77:   if (!edition) return undefined;
78:   const current = host.registry.node(edition[1]!.toUpperCase());
79:   const key = `${edition[1]!.toUpperCase()}:${edition[2]}`;
80:   return current?.attributes?.["key"] === key ? current : host.registry.node(`${edition[1]!.toUpperCase()}-${edition[2]}`);
81: }
82:
83: /** The corpus that holds a framework's official text (from the documents it was ingested from). */
84: export function corpusOf(host: AgentHost, frameworkId: string): string | undefined {
85:   const sources = host.registry.framework(frameworkId)?.graph.framework.sources ?? [];
86:   for (const s of sources) {
87:     const corpus = host.registry.documents.get(s.documentId)?.framework;
88:     if (corpus) return corpus;
89:   }
90:   return undefined;
91: }
92:
93: /** Threat catalogs (ATLAS, OWASP, NIST AI 100-2) are views: never assessed, planned or linked as requirements. */
94: export function isThreat(host: AgentHost, nodeId: string): boolean {
95:   return familyOf(host, nodeId) === "threat";
96: }
97:
98: export function frameworkEnabled(host: AgentHost, frameworkId: string): boolean {
99:   return host.workspace().frameworks.some((f) => f.frameworkId === frameworkId && f.enabled);
100: }
101:
102: /**
103:  * What an agent may say about a threat: its description, related threats, and the
104:  * requirements publishers link to it, grouped by publication with each group's status,
105:  * and the workspace's levels on them. Threats themselves are never assessed.
106:  */
107: /** A threat's code as its catalog writes it (OWASP entries carry their edition: LLM03:2025). */
108: const threatCode = (host: AgentHost, id: string): string => {
109:   const n = host.registry.node(id);
110:   return n ? String(n.attributes?.["key"] ?? n.code) : codeOf(id);
111: };
112:
113: export function threatBrief(host: AgentHost, node: RequirementNode) {
114:   const g = threatPaths(host.registry);
115:   const enabled = new Set(host.workspace().frameworks.filter((f) => f.enabled).map((f) => f.frameworkId));
116:   const groups = new Map<string, { publication: string; status: string; requirements: Map<string, { via?: string; group?: string }> }>();
117:   for (const [reqId, paths] of g.forward.get(node.id) ?? []) {
118:     for (const p of paths) {
119:       const { publication } = coverageGroup(p, reqId);
120:       const group = groups.get(publication) ?? { publication, status: p.status, requirements: new Map() };
121:       if (STATUS_RANK[p.status] < STATUS_RANK[group.status as keyof typeof STATUS_RANK]) group.status = p.status;
122:       if (!group.requirements.has(reqId)) group.requirements.set(reqId, { ...(p.via ? { via: threatCode(host, p.via) } : {}), ...(p.group ? { group: p.group } : {}) });
123:       groups.set(publication, group);
124:     }
125:   }
126:   const linked = [...groups.values()]
127:     .sort((a, b) => STATUS_RANK[b.status as keyof typeof STATUS_RANK] - STATUS_RANK[a.status as keyof typeof STATUS_RANK] || b.requirements.size - a.requirements.size)
128:     .map((group) => {
129:       const reqs = [...group.requirements].map(([id, how]) => {
130:         const req = host.registry.node(id);
131:         const s = host.state(id);
132:         const inScope = enabled.has(frameworkOf(id)) && !!s?.applicable;
133:         return { id, code: codeOf(id), framework: frameworkOf(id), text: req ? short(modelText(req), 110) : "", ...how, inScope, current: s?.current, target: s?.target };
134:       });
135:       const inScope = reqs.filter((r) => r.inScope);
136:       return {
137:         publication: group.publication,
138:         status: group.status,
139:         requirements: reqs.length,
140:         inYourFrameworks: inScope.length,
141:         atTarget: inScope.filter((r) => (r.target ?? 0) > 0 && (r.current ?? 0) >= (r.target ?? 0)).length,
142:         examples: [...inScope, ...reqs.filter((r) => !r.inScope)].slice(0, 12),
143:       };
144:     });
145:   const related = host.registry.threatLinks
146:     .of(node.id)
147:     .filter((l) => g.isThreat(l.nodeId))
148:     .slice(0, 20)
149:     .map((l) => ({ code: threatCode(host, l.nodeId), title: host.registry.node(l.nodeId)?.title ?? "", label: l.label, status: l.status, authority: l.authority }));
150:   const a = node.attributes ?? {};
151:   return {
152:     id: node.id,
153:     code: String(a["key"] ?? node.code),
154:     kind: node.kind,
155:     catalog: host.registry.framework(node.frameworkId)?.graph.framework.shortName,
156:     title: node.title,
157:     text: short(node.text, 1400),
158:     tactics: a["tactics"],
159:     maturity: a["maturity"],
160:     related,
161:     linkedRequirements: linked,
162:     note: "Threats are never assessed. Coverage comes from the requirements publishers link to the threat; every link keeps its publisher and status (final, draft, unreviewed, superseded). Work on the linked requirements, not on the threat.",
163:     citation: node.citation,
164:   };
165: }
166:
167: /** What an agent may say about a state AI law or one of its obligations, with the workspace's scoping decision. */
168: export function lawBrief(host: AgentHost, node: RequirementNode) {
169:   const index = host.registry.framework(node.frameworkId)!;
170:   const law = node.kind === "law" ? node : node.parentId ? index.byId.get(node.parentId) : undefined;
171:   const la = law?.attributes ?? {};
172:   const lawId = String(la["lawId"] ?? "");
173:   const decision = host.workspace().frameworks.find((f) => f.frameworkId === node.frameworkId)?.law?.applicability[lawId];
174:   const today = new Date().toISOString().slice(0, 10);
175:   const obligations = law ? index.childrenOf(law.id) : [];
176:   const s = node.assessable ? host.state(node.id) : undefined;
177:   return {
178:     id: node.id,
179:     code: node.code,
180:     kind: node.kind,
181:     title: node.title,
182:     text: short(node.text, 1400),
183:     law: law ? { code: law.code, title: law.title, status: la["status"], statusNote: la["statusNote"] ? short(String(la["statusNote"]), 600) : undefined, effective: la["effective"], sunset: la["sunset"] } : undefined,
184:     roles: node.kind === "law" ? [...new Set(obligations.flatMap((o) => (o.attributes?.["roles"] as string[] | undefined) ?? []))] : node.attributes?.["roles"],
185:     // The law's own definitions of those roles, so the organization can decide which it holds.
186:     definitions: ((la["appliesTo"] as { role: string; condition?: string }[] | undefined) ?? [])
187:       .filter((a) => node.kind === "law" || ((node.attributes?.["roles"] as string[] | undefined) ?? []).includes(a.role))
188:       .map((a) => ({ role: a.role, definition: short(a.condition ?? "", 500) })),
189:     obligations: node.kind === "law" ? obligations.map((o) => ({ code: o.code, title: o.title, roles: o.attributes?.["roles"], effective: o.attributes?.["effective"] })).slice(0, 30) : undefined,
190:     effective: node.attributes?.["effective"],
191:     until: node.attributes?.["until"],
192:     timing: node.assessable ? obligationTiming(node, today) : undefined,
193:     section: node.attributes?.["section"],
194:     yourRoles: decision?.roles ?? null,
195:     assessment: s ? { applicable: s.applicable, current: s.current, target: s.target, applicabilityRationale: s.applicabilityRationale } : null,
196:     note: "Obligations are quoted from the enacted statute or adopted regulation. They are in scope only for the roles the organization records under each law's own definitions. This is tracking, not legal advice.",
197:     citation: node.citation,
198:   };
199: }
200:
201: /** Why this node cannot take an assessment proposal in this workspace, if it cannot. */
202: function cannotAssess(host: AgentHost, node: RequirementNode | undefined, asked: string, levels: boolean): string | undefined {
203:   if (!node || !node.assessable) return `'${asked}' is not an assessable requirement`;
204:   const fw = host.registry.framework(node.frameworkId)!.graph.framework;
205:   if (fw.family === "threat") return `${node.code} is a threat in ${fw.shortName}: threats are never assessed. Propose changes to the requirements linked to it instead (get_requirement lists them).`;
206:   if (!frameworkEnabled(host, node.frameworkId)) return `${fw.shortName} is not enabled in this workspace`;
207:   const s = host.state(node.id);
208:   if (levels && s && !s.applicable) return `${node.code} is out of scope (${s.applicabilityRationale ?? "not applicable"}): levels apply only to requirements in scope`;
209:   return undefined;
210: }
211:
212: /** Requirements a task, policy or evidence item may link to: known nodes that are not threats. */
213: function linkable(host: AgentHost, ids: string[]): { nodes: RequirementNode[]; error?: string } {
214:   const nodes = ids.map((id) => resolveNode(host, id)).filter((n): n is RequirementNode => !!n);
215:   const threats = nodes.filter((n) => isThreat(host, n.id));
216:   if (threats.length) return { nodes: [], error: `${threats.map((n) => n.code).join(", ")} ${threats.length > 1 ? "are threats" : "is a threat"}, not requirements: link the requirements that address ${threats.length > 1 ? "them" : "it"} instead (get_requirement on a threat lists them).` };
217:   return { nodes };
218: }
219:
220: function short(text: string, n = 180): string {
221:   const t = text.replace(/\s+/g, " ").trim();
222:   return t.length > n ? `${t.slice(0, n - 1)}…` : t;
223: }
224:
225: /** Requirement text as it may be sent to the model (licensed AICPA text is withheld unless permitted). */
226: export function modelText(node: RequirementNode): string {
227:   if (node.attributes?.["licensed"] === true && !licensedTextToModel()) return `${node.title}. ${String(node.attributes["summary"] ?? "")} ${WITHHELD_NOTICE}`;
228:   return node.text;
229: }
230:
231: /**
232:  * A task as it may be sent to the model. Tasks planned from licensed AICPA criteria carry
233:  * the criterion text (description) and point-of-focus titles (checklist): they are
234:  * withheld like the criteria themselves, unless the operator declared permission.
235:  */
236: export function modelTask<T extends Pick<Task, "title" | "description" | "checklist" | "requirementIds">>(host: AgentHost, task: T): T {
237:   if (licensedTextToModel()) return task;
238:   const withheld: [string, string][] = [];
239:   for (const id of task.requirementIds) {
240:     const node = host.registry.node(id);
241:     if (node?.attributes?.["licensed"] !== true) continue;
242:     withheld.push([node.text.trim(), `[${node.code}: ${String(node.attributes["summary"] ?? node.title)} (AICPA text withheld)]`]);
243:     for (const p of (node.attributes["pointsOfFocus"] as { title?: string; text?: string }[] | undefined) ?? []) {
244:       for (const t of [p.text, p.title]) if (t?.trim()) withheld.push([t.trim(), "[AICPA point of focus withheld]"]);
245:     }
246:   }
247:   if (!withheld.length) return task;
248:   // Longest first, so a criterion's text is replaced whole before any fragment of it.
249:   withheld.sort((a, b) => b[0].length - a[0].length);
250:   const clean = (s: string) => withheld.reduce((acc, [text, notice]) => (text.length >= 12 ? acc.split(text).join(notice) : acc), s);
251:   return { ...task, title: clean(task.title), description: clean(task.description), checklist: task.checklist.map((c) => ({ ...c, text: clean(c.text) })) };
252: }
253:
254: /** Whether a corpus document's passages may be sent to the model. */
255: function passageAllowed(host: AgentHost, documentId: string): boolean {
256:   if (licensedTextToModel()) return true;
257:   return host.registry.documents.get(documentId)?.framework !== "aicpa-soc2";
258: }
259:
260: export function statusOf(host: AgentHost, nodeId: string) {
261:   return host.score(frameworkOf(nodeId)).statuses.get(nodeId);
262: }
263:
264: // ---------------------------------------------------------------------------
265:
266: export const searchCorpus = defineTool({
267:   name: "search_corpus",
268:   description:
269:     "Search the local official documentation corpus (NIST CSF 2.0, NIST RMF / SP 800-53 family, AICPA SOC 2, NIST AI RMF with the Generative AI Profile, NIST AI 100-2 and NIST's AI overlays, U.S. state AI laws, and the AI threat catalogs: MITRE ATLAS and the OWASP Top 10s) and return citable passages with document id, title and page. Use it before making any claim about what a framework, law or threat catalog says.",
270:   schema: z.object({
271:     query: z.string().min(2).describe("Keywords or a question, e.g. 'backups tested restore', 'GV.SC-07 supplier risk', 'CA-SB243 suicide protocol' or 'AML.T0051 prompt injection'"),
272:     framework: z
273:       .enum(["nist-csf-2.0", "nist-rmf", "aicpa-soc2", "nist-ai-rmf", "us-state-ai-laws", "ai-threats"])
274:       .optional()
275:       .describe("Restrict to one corpus: nist-ai-rmf also holds NIST AI 100-2 and the AI overlays; ai-threats holds MITRE ATLAS and OWASP"),
276:     limit: z.number().int().min(1).max(8).optional(),
277:   }),
278:   async run(host, input) {
279:     const hits = host.registry.search.search(input.query, { limit: input.limit ?? 5, framework: input.framework });
280:     const citations = hits.map(hitToCitation);
281:     if (citations.length) host.step({ type: "citation", title: `Corpus: “${short(input.query, 60)}”`, citations });
282:     return {
283:       hits: citations.map((c) => ({ documentId: c.documentId, documentTitle: c.documentTitle, page: c.page, locator: c.locator, quote: passageAllowed(host, c.documentId) ? c.quote : WITHHELD_NOTICE })),
284:     };
285:   },
286: });
287:
288: export const getRequirement = defineTool({
289:   name: "get_requirement",
290:   description:
291:     "Get one requirement (CSF outcome, SOC 2 criterion, SP 800-53 control, RMF task, AI RMF outcome, state-law obligation) by id or code, with its official text, implementation examples / points of focus, the workspace's current and target level, status, tasks, evidence and crosswalk mappings. Also describes a state AI law (its obligations, roles and dates) or a threat (ATLAS technique or mitigation, OWASP entry, NIST AI 100-2 attack) with the requirements publishers link to it.",
292:   schema: z.object({ id: z.string().describe("Node id ('nist-csf-2.0:PR.AA-01') or code ('PR.AA-01', 'CC6.1', 'AC-2', 'GOVERN 1.1', 'CA-SB243-02', 'AML.T0051', 'LLM04:2026')") }),
293:   async run(host, input) {
294:     const node = resolveNode(host, input.id);
295:     if (!node) return { error: `Unknown requirement '${input.id}'. Use list_requirements or search_corpus to find valid codes.` };
296:     const fam = familyOf(host, node.id);
297:     if (fam === "threat") {
298:       host.step({ type: "thought", title: `Reviewed ${node.code} and the requirements linked to it`, nodeIds: [node.id] });
299:       return threatBrief(host, node);
300:     }
301:     if (fam === "law" && !node.assessable) {
302:       host.step({ type: "thought", title: `Reviewed ${node.code}`, nodeIds: [node.id] });
303:       return lawBrief(host, node);
304:     }
305:     const index = host.registry.framework(node.frameworkId)!;
306:     const state = host.state(node.id);
307:     const status = statusOf(host, node.id);
308:     const family = index.graph.framework.family;
309:     const tasks = host.tasks().filter((t) => t.requirementIds.includes(node.id));
310:     const evidence = host.evidence().filter((e) => e.requirementIds.includes(node.id));
311:     const mappings = host.registry.crosswalk.related(node.id).slice(0, 24).map((e) => {
312:       const target = host.registry.node(e.to);
313:       const s = host.state(e.to);
314:       return { id: e.to, code: codeOf(e.to), framework: frameworkOf(e.to), relationship: e.relationship, text: target ? short(modelText(target), 120) : undefined, current: s?.current };
315:     });
316:     host.step({ type: "thought", title: `Reviewed ${node.code}`, nodeIds: [node.id] });
317:     return {
318:       id: node.id,
319:       code: node.code,
320:       kind: node.kind,
321:       framework: node.frameworkId,
322:       title: node.title,
323:       text: modelText(node),
324:       ...(family === "law" ? { law: lawBrief(host, node) } : {}),
325:       guidance: node.guidance ? short(node.guidance, 900) : undefined,
326:       ancestors: index.ancestors(node.id).map((a) => ({ code: a.code, title: a.title })),
327:       examples: node.examples?.map((e) => e.text),
328:       pointsOfFocus: licensedTextToModel() ? (node.attributes?.["pointsOfFocus"] as { title: string }[] | undefined)?.map((p) => p.title) : undefined,
329:       citation: node.citation,
330:       assessment: state
331:         ? {
332:             current: state.current,
333:             currentLabel: levelLabel(family, state.current),
334:             target: state.target,
335:             targetLabel: levelLabel(family, state.target),
336:             priority: state.priority,
337:             applicable: state.applicable,
338:             owner: state.owner,
339:             notes: state.notes,
340:           }
341:         : null,
342:       status: status?.status,
343:       statusReasons: status?.reasons,
344:       tasks: tasks.map((t) => ({ id: t.id, title: t.title, status: t.status, dueDate: t.dueDate, kind: t.kind })),
345:       evidence: evidence.map((e) => ({ id: e.id, title: e.title, status: e.status, kind: e.kind, validUntil: e.validUntil })),
346:       mappings,
347:     };
348:   },
349: });
350:
351: export const listRequirements = defineTool({
352:   name: "list_requirements",
353:   description:
354:     "List units of work (assessable requirements) in a framework with their status, current/target level and priority. Filter by parent (function/category/family code), status, priority or minimum gap.",
355:   schema: z.object({
356:     framework: z.string().describe("Framework id, e.g. 'nist-csf-2.0', 'aicpa-tsc-2017', 'nist-sp-800-53-r5', 'nist-ai-rmf'"),
357:     parent: z.string().optional().describe("Restrict to descendants of this code, e.g. 'PR' or 'PR.AA' or 'AC'"),
358:     status: z.array(z.enum(STATUSES)).optional(),
359:     priority: z.array(z.enum(["critical", "high", "medium", "low"])).optional(),
360:     minGap: z.number().int().min(0).max(4).optional(),
361:     limit: z.number().int().min(1).max(120).optional(),
362:   }),
363:   async run(host, input) {
364:     const index = host.registry.framework(input.framework);
365:     if (!index) return { error: `Unknown framework '${input.framework}'. Known: ${[...host.registry.indexes.keys()].join(", ")}` };
366:     if (index.graph.framework.family === "threat") return { error: `${index.graph.framework.shortName} is a threat catalog: its threats are never assessed. Call get_requirement on a threat to see the requirements linked to it.` };
367:     const score = host.score(input.framework);
368:     let nodes = index.assessable;
369:     if (input.parent) {
370:       const parent = index.get(input.parent);
371:       if (!parent) return { error: `Unknown parent '${input.parent}' in ${input.framework}` };
372:       nodes = index.assessableUnder(parent.id);
373:     }
374:     const rows = [];
375:     for (const node of nodes) {
376:       const s = host.state(node.id);
377:       const status = score.statuses.get(node.id)?.status;
378:       if (input.status && (!status || !input.status.includes(status))) continue;
379:       if (input.priority && (!s || !input.priority.includes(s.priority))) continue;
380:       const gap = s ? Math.max(0, s.target - s.current) : 0;
381:       if (input.minGap !== undefined && gap < input.minGap) continue;
382:       rows.push({ id: node.id, code: node.code, text: short(modelText(node), 140), status, current: s?.current ?? 0, target: s?.target ?? 0, gap, priority: s?.priority });
383:     }
384:     // Highest leverage first: gap weighted by priority.
385:     const weight = { critical: 4, high: 3, medium: 2, low: 1 } as const;
386:     rows.sort((a, b) => b.gap * weight[b.priority ?? "medium"] - a.gap * weight[a.priority ?? "medium"]);
387:     return { total: rows.length, rows: rows.slice(0, input.limit ?? 40) };
388:   },
389: });
390:
391: export const workspaceOverview = defineTool({
392:   name: "workspace_overview",
393:   description:
394:     "Summarize the workspace: organization profile, enabled frameworks with readiness, gaps, evidence coverage and status counts, plus task, evidence and policy totals. Call this first when the question is broad.",
395:   schema: z.object({}),
396:   async run(host) {
397:     const ws = host.workspace();
398:     const frameworks = ws.frameworks
399:       .filter((f) => f.enabled && host.registry.framework(f.frameworkId))
400:       .map((f) => {
401:         const index = host.registry.framework(f.frameworkId)!;
402:         const score = host.score(f.frameworkId);
403:         const topGaps = index.assessable
404:           .map((n) => ({ n, s: host.state(n.id) }))
405:           .filter((x) => x.s && x.s.applicable && x.s.target > x.s.current)
406:           .sort((a, b) => b.s!.target - b.s!.current - (a.s!.target - a.s!.current))
407:           .slice(0, 8)
408:           .map((x) => `${x.n.code} (${x.s!.current}→${x.s!.target})`);
409:         return {
410:           id: f.frameworkId,
411:           name: index.graph.framework.shortName,
412:           readinessPercent: Math.round(score.overall.readiness * 100),
413:           units: score.overall.total,
414:           gaps: score.overall.gaps,
415:           evidenceCoveragePercent: Math.round(score.overall.evidenceCoverage * 100),
416:           statusCounts: score.overall.counts,
417:           topGaps,
418:         };
419:       });
420:     const tasks = host.tasks();
421:     const evidence = host.evidence();
422:     const policies = host.policies();
423:     return {
424:       organization: { name: ws.name, ...ws.profile },
425:       frameworks,
426:       tasks: {
427:         total: tasks.length,
428:         open: tasks.filter((t) => t.status !== "done").length,
429:         overdue: tasks.filter((t) => t.dueDate && t.status !== "done" && t.dueDate < new Date().toISOString().slice(0, 10)).length,
430:       },
431:       evidence: { total: evidence.length, accepted: evidence.filter((e) => e.status === "accepted").length, pendingReview: evidence.filter((e) => e.status === "pending-review").length },
432:       policies: policies.map((p) => ({ title: p.title, status: p.status, version: p.version })),
433:     };
434:   },
435: });
436:
437: export const proposeAssessment = defineTool({
438:   name: "propose_assessment",
439:   description:
440:     "Propose the current implementation level (0–4 on the framework's scale) for a requirement, with rationale, confidence and citations. A human approves before it takes effect unless the workspace granted autonomy.",
441:   writes: true,
442:   schema: z.object({
443:     nodeId: z.string(),
444:     current: Level,
445:     rationale: z.string().min(10),
446:     confidence: z.enum(["low", "medium", "high"]),
447:     citations: z.array(CitationInput).optional(),
448:   }),
449:   async run(host, input) {
450:     const node = resolveNode(host, input.nodeId);
451:     const refused = cannotAssess(host, node, input.nodeId, true);
452:     if (refused || !node) return { error: refused };
453:     const family = familyOf(host, node.id);
454:     const prev = host.state(node.id);
455:     const proposal = await host.propose({
456:       type: "set-level",
457:       title: `${node.code}: ${levelLabel(family, prev?.current ?? 0)} → ${levelLabel(family, input.current)}`,
458:       rationale: input.rationale,
459:       payload: { nodeId: node.id, current: input.current },
460:       citations: normalizeCitations(host, input.citations),
461:       confidence: input.confidence,
462:       nodeIds: [node.id],
463:     });
464:     return { proposalId: proposal.id, status: proposal.status };
465:   },
466: });
467:
468: export const proposeTarget = defineTool({
469:   name: "propose_target",
470:   description: "Propose a target implementation level (Target Profile) for a requirement, with rationale.",
471:   writes: true,
472:   schema: z.object({ nodeId: z.string(), target: Level, rationale: z.string().min(10) }),
473:   async run(host, input) {
474:     const node = resolveNode(host, input.nodeId);
475:     const refused = cannotAssess(host, node, input.nodeId, true);
476:     if (refused || !node) return { error: refused };
477:     const family = familyOf(host, node.id);
478:     const proposal = await host.propose({
479:       type: "set-target",
480:       title: `${node.code}: target ${levelLabel(family, input.target)}`,
481:       rationale: input.rationale,
482:       payload: { nodeId: node.id, target: input.target },
483:       citations: [],
484:       confidence: "medium",
485:       nodeIds: [node.id],
486:     });
487:     return { proposalId: proposal.id, status: proposal.status };
488:   },
489: });
490:
491: export const proposeApplicability = defineTool({
492:   name: "propose_applicability",
493:   description: "Propose marking a requirement applicable or not applicable, with a justification suitable for auditors.",
494:   writes: true,
495:   schema: z.object({ nodeId: z.string(), applicable: z.boolean(), rationale: z.string().min(10) }),
496:   async run(host, input) {
497:     const node = resolveNode(host, input.nodeId);
498:     const refused = cannotAssess(host, node, input.nodeId, false);
499:     if (refused || !node) return { error: refused };
500:     const proposal = await host.propose({
501:       type: "set-applicability",
502:       title: `${node.code}: ${input.applicable ? "applicable" : "not applicable"}`,
503:       rationale: input.rationale,
504:       payload: { nodeId: node.id, applicable: input.applicable, rationale: input.rationale },
505:       citations: [],
506:       confidence: "medium",
507:       nodeIds: [node.id],
508:     });
509:     return { proposalId: proposal.id, status: proposal.status };
510:   },
511: });
512:
513: export const proposeTask = defineTool({
514:   name: "propose_task",
515:   description: "Propose a new task that advances one or more requirements. Keep titles imperative and specific.",
516:   writes: true,
517:   schema: z.object({
518:     title: z.string().min(4).max(140),
519:     description: z.string(),
520:     kind: z.enum(["governance", "policy", "procedure", "technical", "evidence", "training", "assessment", "vendor", "monitoring"]),
521:     priority: z.enum(["critical", "high", "medium", "low"]),
522:     requirementIds: z.array(z.string()).min(1),
523:     dueDate: z.string().optional().describe("YYYY-MM-DD"),
524:     effortHours: z.number().optional(),
525:     checklist: z.array(z.string()).optional(),
526:   }),
527:   async run(host, input) {
528:     const { nodes, error } = linkable(host, input.requirementIds);
529:     if (error) return { error };
530:     if (!nodes.length) return { error: "None of the requirementIds are known" };
531:     const proposal = await host.propose({
532:       type: "create-task",
533:       title: input.title,
534:       rationale: input.description,
535:       payload: { ...input, requirementIds: nodes.map((n) => n.id) },
536:       citations: [],
537:       confidence: "high",
538:       nodeIds: nodes.map((n) => n.id),
539:     });
540:     return { proposalId: proposal.id, status: proposal.status };
541:   },
542: });
543:
544: export const proposePolicy = defineTool({
545:   name: "propose_policy",
546:   description:
547:     "Propose a policy, standard or procedure document (Markdown) mapped to requirements. The document should be tailored to the organization, use 'shall' statements, and include a requirements mapping section.",
548:   writes: true,
549:   schema: z.object({
550:     title: z.string().min(4),
551:     requirementIds: z.array(z.string()).min(1),
552:     body: z.string().min(200).describe("Complete Markdown document"),
553:     citations: z.array(CitationInput).optional(),
554:   }),
555:   async run(host, input) {
556:     const { nodes, error } = linkable(host, input.requirementIds);
557:     if (error) return { error };
558:     if (!nodes.length) return { error: "None of the requirementIds are known" };
559:     const proposal = await host.propose({
560:       type: "create-policy",
561:       title: `Draft: ${input.title}`,
562:       rationale: `Policy draft covering ${nodes.map((n) => n.code).join(", ")}`,
563:       payload: { title: input.title, body: input.body, requirementIds: nodes.map((n) => n.id) },
564:       citations: normalizeCitations(host, input.citations),
565:       confidence: "medium",
566:       nodeIds: nodes.map((n) => n.id),
567:     });
568:     return { proposalId: proposal.id, status: proposal.status };
569:   },
570: });
571:
572: export const proposeEvidence = defineTool({
573:   name: "propose_evidence",
574:   description:
575:     "Propose an evidence record for an artifact that demonstrates an implemented control — a configuration export, log extract, system record or signed attestation — linked to requirements. Never use it for plans, drafts, guides or anything that describes intended work: evidence must show what is actually in place.",
576:   writes: true,
577:   schema: z.object({
578:     title: z.string().min(4),
579:     requirementIds: z.array(z.string()).min(1),
580:     kind: z.enum(["document", "screenshot", "configuration", "log", "attestation", "automated-check", "policy", "report"]),
581:     content: z.string().min(20),
582:     validDays: z.number().int().min(1).max(730).optional(),
583:   }),
584:   async run(host, input) {
585:     const { nodes, error } = linkable(host, input.requirementIds);
586:     if (error) return { error };
587:     if (!nodes.length) return { error: "None of the requirementIds are known" };
588:     const proposal = await host.propose({
589:       type: "create-evidence",
590:       title: input.title,
591:       rationale: `Evidence for ${nodes.map((n) => n.code).join(", ")}`,
592:       payload: { ...input, requirementIds: nodes.map((n) => n.id) },
593:       citations: [],
594:       confidence: "medium",
595:       nodeIds: nodes.map((n) => n.id),
596:     });
597:     return { proposalId: proposal.id, status: proposal.status };
598:   },
599: });
600:
601: export const updateTask = defineTool({
602:   name: "update_task",
603:   description: "Propose a task update: status change, completed checklist items (by id) and a progress note.",
604:   writes: true,
605:   schema: z.object({
606:     taskId: z.string(),
607:     status: z.enum(["backlog", "todo", "in-progress", "in-review", "done", "blocked"]).optional(),
608:     completeChecklistItems: z.array(z.string()).optional(),
609:     note: z.string().optional(),
610:   }),
611:   async run(host, input) {
612:     const task = host.tasks().find((t) => t.id === input.taskId);
613:     if (!task) return { error: `Unknown task '${input.taskId}'` };
614:     const proposal = await host.propose({
615:       type: "update-task",
616:       title: `Update “${short(task.title, 60)}”${input.status ? ` → ${input.status}` : ""}`,
617:       rationale: input.note ?? "Task progress update",
618:       payload: { ...input },
619:       citations: [],
620:       confidence: "high",
621:       nodeIds: task.requirementIds,
622:     });
623:     return { proposalId: proposal.id, status: proposal.status };
624:   },
625: });
626:
627: export const listTasks = defineTool({
628:   name: "list_tasks",
629:   description: "List tasks, optionally filtered by status or requirement.",
630:   schema: z.object({
631:     status: z.array(z.enum(["backlog", "todo", "in-progress", "in-review", "done", "blocked"])).optional(),
632:     requirementId: z.string().optional(),
633:     limit: z.number().int().min(1).max(100).optional(),
634:   }),
635:   async run(host, input) {
636:     const req = input.requirementId ? resolveNode(host, input.requirementId)?.id : undefined;
637:     const tasks = host
638:       .tasks()
639:       .filter((t) => (!input.status || input.status.includes(t.status)) && (!req || t.requirementIds.includes(req)))
640:       .slice(0, input.limit ?? 40);
641:     return {
642:       tasks: tasks.map((task) => {
643:         const t = modelTask(host, task);
644:         return {
645:           id: t.id,
646:           title: t.title,
647:           status: t.status,
648:           kind: t.kind,
649:           priority: t.priority,
650:           dueDate: t.dueDate,
651:           requirements: t.requirementIds.map(codeOf),
652:           checklist: t.checklist.map((c) => ({ id: c.id, text: short(c.text, 100), done: c.done })),
653:         };
654:       }),
655:     };
656:   },
657: });
658:
659: export const listEvidence = defineTool({
660:   name: "list_evidence",
661:   description: "List evidence records, optionally filtered by requirement or status.",
662:   schema: z.object({
663:     requirementId: z.string().optional(),
664:     status: z.array(z.enum(["pending-review", "accepted", "rejected", "expired"])).optional(),
665:   }),
666:   async run(host, input) {
667:     const req = input.requirementId ? resolveNode(host, input.requirementId)?.id : undefined;
668:     return {
669:       evidence: host
670:         .evidence()
671:         .filter((e) => (!req || e.requirementIds.includes(req)) && (!input.status || input.status.includes(e.status)))
672:         .slice(0, 60)
673:         .map((e) => ({ id: e.id, title: e.title, kind: e.kind, status: e.status, source: e.source, collectedAt: e.collectedAt, validUntil: e.validUntil, requirements: e.requirementIds.map(codeOf) })),
674:     };
675:   },
676: });
677:
678: export const runChecks = defineTool({
679:   name: "run_checks",
680:   description:
681:     "Run the workspace's monitoring connectors (e.g. web security posture, repository hygiene) and return check outcomes. Each passing check linked to requirements is proposed as automated-check evidence, built from the recorded check itself; it is filed once approved (or at once, if the workspace's autonomy settings allow evidence proposals).",
682:   writes: true,
683:   schema: z.object({ connectorId: z.string().optional() }),
684:   async run(host, input) {
685:     const connectors = host.connectors().filter((c) => c.status === "active" && (!input.connectorId || c.id === input.connectorId));
686:     if (!connectors.length) return { error: "No active connectors. Ask the user to add one in Evidence → Connectors." };
687:     const out = [];
688:     // Evidence from the same check that stays valid for another week needs no new proposal.
689:     const onFile = (connectorId: string, checkId: string) =>
690:       host
691:         .evidence()
692:         .some((e) => e.connectorId === connectorId && (e.data as { checkId?: string } | undefined)?.checkId === checkId && isEvidenceValid(e, new Date(Date.now() + 7 * 86_400_000)));
693:     for (const c of connectors) {
694:       const results = await host.runConnector(c.id);
695:       const proposed: string[] = [];
696:       for (const r of results.filter((x) => x.outcome === "pass" && x.requirementIds.length && !x.evidenceId && !onFile(c.id, x.checkId))) {
697:         const proposal = await host.propose({
698:           type: "create-evidence",
699:           title: `${c.name}: ${r.title}`,
700:           rationale: `Passing automated check from the ${c.name} connector, observed ${r.observedAt.slice(0, 16).replace("T", " ")} UTC: ${short(r.detail, 200)}`,
701:           payload: { checkResultId: r.id, title: `${c.name}: ${r.title}`, kind: "automated-check", requirementIds: r.requirementIds, content: r.detail },
702:           citations: [],
703:           confidence: "high",
704:           nodeIds: r.requirementIds,
705:         });
706:         proposed.push(proposal.id);
707:       }
708:       out.push({
709:         connector: c.name,
710:         results: results.map((r) => ({ check: r.title, outcome: r.outcome, detail: r.detail, requirements: r.requirementIds.map(codeOf) })),
711:         evidenceProposals: proposed.length,
712:       });
713:     }
714:     return { connectors: out };
715:   },
716: });
717:
718: export const crosswalk = defineTool({
719:   name: "crosswalk",
720:   description:
721:     "Show authoritative crosswalk mappings for a requirement (e.g. CSF outcome ↔ SP 800-53 controls ↔ SOC 2 criteria) with the workspace's levels, to reuse work across frameworks.",
722:   schema: z.object({ nodeId: z.string(), targetFramework: z.string().optional() }),
723:   async run(host, input) {
724:     const node = resolveNode(host, input.nodeId);
725:     if (!node) return { error: `Unknown requirement '${input.nodeId}'` };
726:     const edges = host.registry.crosswalk.related(node.id, input.targetFramework);
727:     host.step({ type: "thought", title: `Crosswalk for ${node.code}: ${edges.length} mapping(s)`, nodeIds: [node.id, ...edges.slice(0, 12).map((e) => e.to)] });
728:     return {
729:       node: node.code,
730:       mappings: edges.slice(0, 40).map((e) => {
731:         const t = host.registry.node(e.to);
732:         return { id: e.to, code: codeOf(e.to), framework: frameworkOf(e.to), relationship: e.relationship, authority: e.authority, text: t ? short(modelText(t), 120) : undefined, current: host.state(e.to)?.current };
733:       }),
734:     };
735:   },
736: });
737:
738: export const focus = defineTool({
739:   name: "focus",
740:   description:
741:     "Direct the user's 3D Observatory: fly the camera to requirements and optionally switch the lens. Use it to show the user what you are talking about.",
742:   schema: z.object({
743:     nodeIds: z.array(z.string()).min(1).max(40),
744:     lens: z.enum(["status", "gap", "evidence", "priority", "crosswalk"]).optional(),
745:     note: z.string().optional(),
746:   }),
747:   async run(host, input) {
748:     const nodes = input.nodeIds.map((id) => resolveNode(host, id)).filter((n): n is RequirementNode => !!n);
749:     host.step({
750:       type: "ui",
751:       title: input.note ?? `Focus on ${nodes.map((n) => n.code).slice(0, 6).join(", ")}`,
752:       data: { action: "focus", nodeIds: nodes.map((n) => n.id), lens: input.lens },
753:       nodeIds: nodes.map((n) => n.id),
754:     });
755:     return { focused: nodes.map((n) => n.code) };
756:   },
757: });
758:
759: export const ALL_TOOLS = [
760:   workspaceOverview,
761:   searchCorpus,
762:   getRequirement,
763:   listRequirements,
764:   crosswalk,
765:   listTasks,
766:   listEvidence,
767:   focus,
768:   proposeAssessment,
769:   proposeTarget,
770:   proposeApplicability,
771:   proposeTask,
772:   proposePolicy,
773:   proposeEvidence,
774:   updateTask,
775:   runChecks,
776: ] as AgentTool[];
777:
778: export function toolByName(name: string): AgentTool | undefined {
779:   return ALL_TOOLS.find((t) => t.name === name);
780: }
781:
782: /** Level scale reference used in prompts. */
783: export function levelScaleText(): string {
784:   return Object.values(LEVEL_SCALES)
785:     .map((s) => `${s.family.toUpperCase()} — ${s.name}: ${s.levels.map((l) => `${l.level} ${l.label}`).join(", ")}`)
786:     .join("\n");
787: }

FILE packages/agents/test/licensing.test.ts SHA256 d20bb31281a9c663bbb7f4d61c8a736c234dad87f8b6013b702fa68d24ccffd7
1: import { afterEach, describe, expect, it } from "vitest";
2: import type { RequirementNode, Task, Workspace } from "@visua/core";
3: import type { AgentHost } from "../src/host.ts";
4: import { licensedTextToModel } from "../src/mode.ts";
5: import { workspaceContext } from "../src/runtime.ts";
6: import { listTasks, modelText } from "../src/tools.ts";
7:
8: const licensedNode: RequirementNode = {
9:   id: "aicpa-tsc-2017:CC6.1",
10:   frameworkId: "aicpa-tsc-2017",
11:   code: "CC6.1",
12:   kind: "criterion",
13:   parentId: "aicpa-tsc-2017:CC6",
14:   depth: 2,
15:   order: 0,
16:   title: "Logical access architecture",
17:   text: "VERBATIM LICENSED TEXT",
18:   attributes: {
19:     licensed: true,
20:     summary: "Logical access software, infrastructure and architecture protect information assets.",
21:     pointsOfFocus: [{ title: "VERBATIM POINT OF FOCUS TITLE", text: "VERBATIM POINT OF FOCUS TEXT" }],
22:   },
23:   citation: { documentId: "tsc-2017-rev-pof-2022" },
24:   assessable: true,
25: };
26:
27: const saved = { ...process.env };
28: afterEach(() => {
29:   process.env = { ...saved };
30: });
31:
32: describe("licensed content never reaches the model without permission", () => {
33:   it("withholds AICPA text from Claude by default", () => {
34:     process.env["VISUA_AGENT_MODE"] = "claude";
35:     delete process.env["VISUA_AICPA_AI_USE"];
36:     expect(licensedTextToModel()).toBe(false);
37:     const text = modelText(licensedNode);
38:     expect(text).not.toContain("VERBATIM");
39:     expect(text).toContain("Logical access architecture");
40:     expect(text).toContain("withheld");
41:   });
42:
43:   it("allows it when the operator declares AICPA permission", () => {
44:     process.env["VISUA_AGENT_MODE"] = "claude";
45:     process.env["VISUA_AICPA_AI_USE"] = "permitted";
46:     expect(modelText(licensedNode)).toBe("VERBATIM LICENSED TEXT");
47:   });
48:
49:   it("offline playbooks run locally and keep the text", () => {
50:     process.env["VISUA_AGENT_MODE"] = "offline";
51:     expect(modelText(licensedNode)).toBe("VERBATIM LICENSED TEXT");
52:   });
53:
54:   it("public-domain NIST text is never withheld", () => {
55:     process.env["VISUA_AGENT_MODE"] = "claude";
56:     expect(modelText({ ...licensedNode, attributes: {} })).toBe("VERBATIM LICENSED TEXT");
57:   });
58: });
59:
60: describe("licensed text copied into tasks never reaches the model either", () => {
61:   // A task the planner built from the licensed criterion: its text as description, a point of focus as a checklist item.
62:   const task: Task = {
63:     id: "task_1",
64:     workspaceId: "ws_1",
65:     title: "CC6.1 · Logical access architecture",
66:     description: "VERBATIM LICENSED TEXT",
67:     kind: "technical",
68:     status: "todo",
69:     priority: "high",
70:     requirementIds: [licensedNode.id],
71:     checklist: [
72:       { id: "chk_1", text: "VERBATIM POINT OF FOCUS TITLE", done: false },
73:       { id: "chk_2", text: "Attach evidence and request verification.", done: false },
74:     ],
75:     dependsOn: [],
76:     origin: "template",
77:     createdAt: "2026-09-26T00:00:00Z",
78:     updatedAt: "2026-09-26T00:00:00Z",
79:   };
80:   const ws = { id: "ws_1", name: "Acme", profile: { industry: "saas", size: "11-50", dataTypes: [], drivers: [], environments: ["cloud"], maturityTier: 1, guidance: "guided", securityTeamSize: 1 }, frameworks: [] } as unknown as Workspace;
81:   const host = { registry: { node: (id: string) => (id === licensedNode.id ? licensedNode : undefined) }, workspace: () => ws, tasks: () => [task], score: () => ({}) } as unknown as AgentHost;
82:
83:   it("withholds it from list_tasks and the task context when agents run on Claude", async () => {
84:     process.env["VISUA_AGENT_MODE"] = "claude";
85:     delete process.env["VISUA_AICPA_AI_USE"];
86:     const listed = JSON.stringify(await listTasks.run(host, {}));
87:     const context = workspaceContext(host, { agent: "task-executor", goal: "Execute", input: { taskId: task.id } });
88:     for (const out of [listed, context]) {
89:       expect(out).not.toContain("VERBATIM");
90:       expect(out).toContain("withheld");
91:       expect(out).toContain("Attach evidence and request verification.");
92:     }
93:   });
94:
95:   it("keeps it for offline playbooks and with the operator's permission", async () => {
96:     process.env["VISUA_AGENT_MODE"] = "offline";
97:     expect(JSON.stringify(await listTasks.run(host, {}))).toContain("VERBATIM POINT OF FOCUS TITLE");
98:     process.env["VISUA_AGENT_MODE"] = "claude";
99:     process.env["VISUA_AICPA_AI_USE"] = "permitted";
100:     expect(workspaceContext(host, { agent: "task-executor", goal: "Execute", input: { taskId: task.id } })).toContain("VERBATIM LICENSED TEXT");
101:   });
102: });

FILE packages/agents/test/tools.test.ts SHA256 609e7b955f27c685fdeb1a2d373f671e41e2c87ce5a6d66efbd005647ebf2769
1: import { describe, expect, it } from "vitest";
2: import type { RequirementState, Workspace } from "@visua/core";
3: import { FrameworkRegistry } from "@visua/frameworks";
4: import type { AgentHost } from "../src/host.ts";
5: import { extractCodes } from "../src/offline.ts";
6: import { getRequirement, listRequirements, searchCorpus } from "../src/tools.ts";
7:
8: const registry = FrameworkRegistry.load();
9: const hasThreats = !!registry.framework("mitre-atlas") && !!registry.framework("owasp-llm-top10");
10: const hasLaws = !!registry.framework("us-state-ai-laws");
11:
12: /** A read-only host over a workspace with CSF 2.0, the AI RMF and the state AI laws enabled. */
13: function hostWith(states: RequirementState[] = [], lawRoles: Record<string, string[]> = {}): AgentHost {
14:   const ws = {
15:     id: "ws_tools",
16:     name: "Tools Co",
17:     frameworks: [
18:       { frameworkId: "nist-csf-2.0", enabled: true },
19:       { frameworkId: "nist-ai-rmf", enabled: true },
20:       { frameworkId: "us-state-ai-laws", enabled: true, law: { applicability: Object.fromEntries(Object.entries(lawRoles).map(([lawId, roles]) => [lawId, { roles }])) } },
21:     ],
22:   } as unknown as Workspace;
23:   const byId = new Map(states.map((s) => [s.nodeId, s]));
24:   const steps: unknown[] = [];
25:   return {
26:     registry,
27:     runId: "run_tools",
28:     signal: new AbortController().signal,
29:     workspace: () => ws,
30:     states: () => states,
31:     state: (id: string) => byId.get(id),
32:     tasks: () => [],
33:     evidence: () => [],
34:     policies: () => [],
35:     connectors: () => [],
36:     score: () => ({ statuses: new Map() }),
37:     step: (s: unknown) => (steps.push(s), s),
38:   } as unknown as AgentHost;
39: }
40:
41: describe("agent tools on threats and state laws", () => {
42:   it.skipIf(!hasThreats)("describes a threat with the requirements publishers link to it, never an assessment", async () => {
43:     const out = (await getRequirement.run(hostWith(), { id: "AML.T0051" })) as Record<string, unknown> & {
44:       linkedRequirements: { publication: string; status: string; requirements: number; examples: { code: string; via?: string }[] }[];
45:       related: { code: string; label: string }[];
46:     };
47:     expect(out["code"]).toBe("AML.T0051");
48:     expect(out).not.toHaveProperty("current");
49:     expect(out).not.toHaveProperty("status");
50:     expect(out["note"]).toMatch(/never assessed/);
51:     expect(out.linkedRequirements.length).toBeGreaterThan(0);
52:     for (const g of out.linkedRequirements) {
53:       expect(g.publication.length).toBeGreaterThan(0);
54:       expect(["final", "draft", "unreviewed", "superseded"]).toContain(g.status);
55:       expect(g.requirements).toBeGreaterThan(0);
56:     }
57:     // ATLAS reaches requirements only through its mitigations and NIST's draft Cyber AI Profile.
58:     expect(out.linkedRequirements.map((g) => g.status)).toEqual(["draft"]);
59:     expect(out.linkedRequirements[0]!.examples.every((r) => r.via?.startsWith("AML.M"))).toBe(true);
60:     expect(out.related.some((r) => r.code.startsWith("AML.M") && r.label === "mitigates")).toBe(true);
61:   });
62:
63:   it.skipIf(!hasThreats)("resolves OWASP entries by edition and names the other edition as a catalog writes it", async () => {
64:     const host = hostWith();
65:     const current = (await getRequirement.run(host, { id: "LLM04:2026" })) as { code: string; title: string; linkedRequirements: { examples: { via?: string }[] }[] };
66:     const previous = (await getRequirement.run(host, { id: "LLM04:2025" })) as { code: string; title: string };
67:     expect(current.code).toBe("LLM04:2026");
68:     expect(previous.code).toBe("LLM04:2025");
69:     expect(current.title).not.toBe(previous.title);
70:     const vias = current.linkedRequirements.flatMap((g) => g.examples.map((r) => r.via)).filter(Boolean);
71:     expect(vias).toContain("LLM03:2025");
72:     expect(vias.some((v) => v!.includes("-2025"))).toBe(false);
73:   });
74:
75:   it.skipIf(!hasThreats)("refuses to list a threat catalog as requirements", async () => {
76:     const out = (await listRequirements.run(hostWith(), { framework: "mitre-atlas" })) as { error?: string };
77:     expect(out.error).toMatch(/threat catalog/);
78:   });
79:
80:   it.skipIf(!hasLaws)("describes a state law and an obligation with dates, roles, definitions and the recorded decision", async () => {
81:     const lawId = String(registry.node("us-state-ai-laws:CA-SB243")?.attributes?.["lawId"]);
82:     const law = (await getRequirement.run(hostWith([], { [lawId]: ["operator"] }), { id: "CA-SB243" })) as Record<string, unknown> & {
83:       obligations: { code: string }[];
84:       definitions: { role: string; definition: string }[];
85:       yourRoles: string[] | null;
86:     };
87:     expect(law["kind"]).toBe("law");
88:     expect(law.obligations.map((o) => o.code)).toContain("CA-SB243-02");
89:     expect(law.definitions.map((d) => d.role)).toContain("operator");
90:     expect(law.definitions.find((d) => d.role === "operator")!.definition).toMatch(/operator/i);
91:     expect(law.yourRoles).toEqual(["operator"]);
92:     const obligation = (await getRequirement.run(hostWith(), { id: "CA-SB243-02" })) as Record<string, unknown> & { law: { code: string; effective: string; timing: string; yourRoles: string[] | null; citation: { documentId: string; page?: number } } };
93:     expect(obligation["code"]).toBe("CA-SB243-02");
94:     expect(obligation.law).toMatchObject({ code: "CA-SB243-02", timing: "in-force", yourRoles: null });
95:     expect(obligation.law.citation.documentId).toBe("ca-sb243-ch677-2025");
96:     expect(obligation.law.citation.page).toBeGreaterThan(0);
97:   });
98:
99:   it.skipIf(!hasLaws)("searches the state-law corpus on its own", async () => {
100:     const out = (await searchCorpus.run(hostWith(), { query: "companion chatbot suicide protocol", framework: "us-state-ai-laws", limit: 3 })) as { hits: { documentId: string }[] };
101:     expect(out.hits.length).toBeGreaterThan(0);
102:     const laws = new Set([...registry.documents.values()].filter((d) => d.framework === "us-state-ai-laws").map((d) => d.id));
103:     expect(out.hits.every((h) => laws.has(h.documentId))).toBe(true);
104:   });
105:
106:   it("reads threat, AI RMF and state-law codes out of a question", () => {
107:     expect(extractCodes("Is AML.T0051.001 covered, and AML.M0019? What about LLM04:2026, ASI01 and NISTAML.018?")).toEqual(
108:       expect.arrayContaining(["AML.T0051.001", "AML.M0019", "LLM04:2026", "ASI01", "NISTAML.018"]),
109:     );
110:     expect(extractCodes("What does CA-SB243-02 say, and GOVERN 1.1?")).toEqual(expect.arrayContaining(["CA-SB243-02", "GOVERN 1.1"]));
111:   });
112: });

FILE packages/frameworks/src/index.ts SHA256 a6a6909e080d4377a23b79b532c20e1a11d51a2a14d1815aa2ba3adc8f5a6edd
1: /**
2:  * Runtime access to the ingested framework graphs, mapping sets, corpus
3:  * manifests and the corpus search index.
4:  */
5: import { existsSync, readFileSync, readdirSync } from "node:fs";
6: import { resolve } from "node:path";
7: import { CrosswalkIndex, FrameworkIndex, type FrameworkGraph, type FrameworkOverlay, type MappingSet, type OverlayEntry } from "@visua/core";
8: import { CORPUS_DIR, DATA_DIR } from "./paths.ts";
9: import { CorpusSearch, type CorpusChunk } from "./search.ts";
10: import { buildTscGraph, loadDescriptionCriteria, TSC_ID, type DescriptionCriterion } from "./ingest/tsc.ts";
11: import { ThreatLinkIndex } from "./threat-links.ts";
12:
13: export { CORPUS_DIR, DATA_DIR, REPO_ROOT } from "./paths.ts";
14: export { CorpusSearch, tokenize, bestQuote, type CorpusChunk, type SearchHit } from "./search.ts";
15: export { buildTscGraph, loadDescriptionCriteria, TSC_ID, type DescriptionCriterion } from "./ingest/tsc.ts";
16: export { CYBER_AI_PROFILE_ID, COSAIS_PREDICTIVE_ID } from "./ingest/ai-overlays.ts";
17: export { STATE_LAWS_ID } from "./ingest/state-laws.ts";
18: export { ATLAS_ID, ATLAS_MITIGATIONS, OWASP_LLM_ID, OWASP_AGENTIC_ID, AI_100_2_ID, THREAT_CATALOG_IDS, EXTERNAL_SCHEMES } from "./ingest/threats.ts";
19: export { ThreatLinkIndex, type ThreatLink } from "./threat-links.ts";
20: export { STATUS_RANK, coverageGroup, linkView, threatPaths, weakest, type LinkView, type PathKind, type ThreatPath, type ThreatPathGraph } from "./threat-paths.ts";
21:
22: export interface CorpusDocument {
23:   id: string;
24:   title: string;
25:   identifier?: string;
26:   publisher: string;
27:   version?: string;
28:   published?: string;
29:   role: string;
30:   mediaType: string;
31:   path: string;
32:   url: string;
33:   landingPage?: string;
34:   sha256: string;
35:   bytes: number;
36:   license: string;
37:   notes?: string;
38: }
39:
40: export interface CorpusManifest {
41:   framework: string;
42:   title: string;
43:   retrieved: string;
44:   documents: CorpusDocument[];
45: }
46:
47: /** Order in which frameworks are presented (increasing complexity). */
48: export const FRAMEWORK_ORDER = [
49:   "nist-csf-2.0",
50:   "aicpa-tsc-2017",
51:   "nist-sp-800-53-r5",
52:   "nist-rmf",
53:   "nist-ai-rmf",
54:   "us-state-ai-laws",
55:   // Threat catalogs, viewed through the requirements above.
56:   "mitre-atlas",
57:   "owasp-llm-top10",
58:   "owasp-agentic-top10",
59:   "nist-ai-100-2",
60: ];
61:
62: function readJson<T>(path: string): T {
63:   return JSON.parse(readFileSync(path, "utf8")) as T;
64: }
65:
66: export function loadFrameworkGraphs(dataDir: string = DATA_DIR): FrameworkGraph[] {
67:   if (!existsSync(dataDir)) return [];
68:   const graphs = readdirSync(dataDir)
69:     .filter((f) => f.endsWith(".json") && !f.startsWith("corpus-") && !f.startsWith("_"))
70:     .map((f) => readJson<FrameworkGraph>(resolve(dataDir, f)))
71:     .filter((g) => g?.framework?.id && Array.isArray(g.nodes));
72:   // SOC 2 criteria are not redistributed: without a local ingest, run on Visua's skeleton
73:   // (overlaid with a licensed local copy of the official text when one is present).
74:   if (!graphs.some((g) => g.framework.id === TSC_ID)) graphs.push(buildTscGraph());
75:   return graphs.sort((a, b) => {
76:     const ia = FRAMEWORK_ORDER.indexOf(a.framework.id);
77:     const ib = FRAMEWORK_ORDER.indexOf(b.framework.id);
78:     return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
79:   });
80: }
81:
82: export function loadMappingSets(dataDir: string = DATA_DIR): MappingSet[] {
83:   const dir = resolve(dataDir, "mappings");
84:   if (!existsSync(dir)) return [];
85:   return readdirSync(dir)
86:     .filter((f) => f.endsWith(".json"))
87:     .map((f) => readJson<MappingSet>(resolve(dir, f)));
88: }
89:
90: /** Links between threats and requirements (data/threat-mappings), kept apart from the requirement crosswalk. */
91: export function loadThreatMappingSets(dataDir: string = DATA_DIR): MappingSet[] {
92:   const dir = resolve(dataDir, "threat-mappings");
93:   if (!existsSync(dir)) return [];
94:   return readdirSync(dir)
95:     .filter((f) => f.endsWith(".json"))
96:     .sort()
97:     .map((f) => readJson<MappingSet>(resolve(dir, f)));
98: }
99:
100: export function loadOverlays(dataDir: string = DATA_DIR): FrameworkOverlay[] {
101:   const dir = resolve(dataDir, "overlays");
102:   if (!existsSync(dir)) return [];
103:   return readdirSync(dir)
104:     .filter((f) => f.endsWith(".json"))
105:     .sort()
106:     .map((f) => readJson<FrameworkOverlay>(resolve(dir, f)));
107: }
108:
109: /** Search chunks are stored per corpus (data/chunks/<corpus>.json) so licensed corpora stay local. */
110: export function loadCorpusChunks(dataDir: string = DATA_DIR): CorpusChunk[] {
111:   const dir = resolve(dataDir, "chunks");
112:   if (!existsSync(dir)) return [];
113:   return readdirSync(dir)
114:     .filter((f) => f.endsWith(".json"))
115:     .sort()
116:     .flatMap((f) => readJson<CorpusChunk[]>(resolve(dir, f)));
117: }
118:
119: export function loadCorpusManifests(corpusDir: string = CORPUS_DIR): CorpusManifest[] {
120:   if (!existsSync(corpusDir)) return [];
121:   return readdirSync(corpusDir, { withFileTypes: true })
122:     .filter((d) => d.isDirectory() && existsSync(resolve(corpusDir, d.name, "manifest.json")))
123:     .map((d) => readJson<CorpusManifest>(resolve(corpusDir, d.name, "manifest.json")));
124: }
125:
126: /** Everything the server and agents need, indexed once. */
127: export class FrameworkRegistry {
128:   readonly indexes = new Map<string, FrameworkIndex>();
129:   readonly crosswalk: CrosswalkIndex;
130:   readonly search: CorpusSearch;
131:   readonly documents = new Map<string, CorpusDocument & { framework: string }>();
132:   readonly manifests: CorpusManifest[];
133:   /** AICPA DC 200 description criteria (Visua titles; official text only from a licensed local copy). */
134:   readonly descriptionCriteria: DescriptionCriterion[] = loadDescriptionCriteria();
135:   /** Community profiles and control overlays on the frameworks above. */
136:   readonly overlays: FrameworkOverlay[];
137:   /** Published links between threat catalogs and requirements. */
138:   readonly threatLinks: ThreatLinkIndex;
139:   private readonly overlayByNode = new Map<string, { overlay: FrameworkOverlay; entry: OverlayEntry }[]>();
140:
141:   constructor(input: { graphs: FrameworkGraph[]; mappings: MappingSet[]; chunks: CorpusChunk[]; manifests: CorpusManifest[]; overlays?: FrameworkOverlay[]; threatMappings?: MappingSet[] }) {
142:     for (const g of input.graphs) this.indexes.set(g.framework.id, new FrameworkIndex(g));
143:     this.crosswalk = new CrosswalkIndex(input.mappings);
144:     this.threatLinks = new ThreatLinkIndex((input.threatMappings ?? []).filter((s) => this.indexes.has(s.sourceFramework) && this.indexes.has(s.targetFramework)));
145:     this.search = new CorpusSearch(input.chunks);
146:     this.manifests = input.manifests;
147:     for (const m of input.manifests) for (const d of m.documents) this.documents.set(d.id, { ...d, framework: m.framework });
148:     this.overlays = (input.overlays ?? []).filter((o) => this.indexes.has(o.frameworkId));
149:     for (const overlay of this.overlays) {
150:       for (const entry of overlay.entries) this.overlayByNode.set(entry.nodeId, [...(this.overlayByNode.get(entry.nodeId) ?? []), { overlay, entry }]);
151:     }
152:   }
153:
154:   static load(): FrameworkRegistry {
155:     return new FrameworkRegistry({
156:       graphs: loadFrameworkGraphs(),
157:       mappings: loadMappingSets(),
158:       chunks: loadCorpusChunks(),
159:       manifests: loadCorpusManifests(),
160:       overlays: loadOverlays(),
161:       threatMappings: loadThreatMappingSets(),
162:     });
163:   }
164:
165:   overlay(id: string): FrameworkOverlay | undefined {
166:     return this.overlays.find((o) => o.id === id);
167:   }
168:
169:   /** Overlay entries that attach to one node. */
170:   overlaysOf(nodeId: string): { overlay: FrameworkOverlay; entry: OverlayEntry }[] {
171:     return this.overlayByNode.get(nodeId) ?? [];
172:   }
173:
174:   get frameworks() {
175:     return [...this.indexes.values()].map((i) => i.graph.framework);
176:   }
177:
178:   framework(id: string): FrameworkIndex | undefined {
179:     return this.indexes.get(id);
180:   }
181:
182:   /** Resolve a node by global id (`framework:code`) or by code across all frameworks. */
183:   node(idOrCode: string) {
184:     const i = idOrCode.lastIndexOf(":");
185:     if (i > 0) {
186:       const index = this.indexes.get(idOrCode.slice(0, i));
187:       const node = index?.byId.get(idOrCode);
188:       if (node) return node;
189:     }
190:     for (const index of this.indexes.values()) {
191:       const node = index.get(idOrCode);
192:       if (node) return node;
193:     }
194:     return undefined;
195:   }
196:
197:   documentTitle(documentId: string): string {
198:     return this.documents.get(documentId)?.title ?? documentId;
199:   }
200: }

FILE packages/frameworks/src/ingest/ai-overlays.ts SHA256 0d528cf12c2b6da416108699e3bd0f39cb639b073c654e82c01a330114776d64
1: /**
2:  * NIST's AI security drafts as overlays on frameworks Visua already models:
3:  *
4:  * - the Cyber AI Profile (NIST IR 8596, initial preliminary draft), a CSF 2.0
5:  *   Community Profile: for each of the 106 subcategories, general
6:  *   considerations and, per focus area (Secure, Defend, Thwart), a proposed
7:  *   priority, considerations and example informative references;
8:  * - COSAiS, the SP 800-53 Control Overlays for Securing AI Systems: the
9:  *   annotated outline of the "Using and Fine-Tuning Predictive AI" overlay
10:  *   (planned NISTIR 8605A), with its 59 controls.
11:  *
12:  * Both come from the structured extractions in corpus/nist-ai-rmf/ (see
13:  * STRUCTURE.md §11, reproducible with the scripts in tools/). Every entry
14:  * must attach to an existing node, or ingestion fails.
15:  */
16: import { existsSync, readFileSync } from "node:fs";
17: import { resolve } from "node:path";
18: import type { FrameworkOverlay, OverlayEntry, OverlayLensEntry } from "@visua/core";
19: import { CORPUS_DIR } from "../paths.ts";
20:
21: interface ProfileSource {
22:   source: { documentId: string; title: string; identifier: string; status: string; published: string; landingPage: string; draftNotice: { text: string; page: number } };
23:   focusAreas: { id: string; short: string; title: string; description: string; page: number; section: string }[];
24:   priorityLevels: { level: number; label: string; description: string }[];
25:   entries: {
26:     subcategory: string;
27:     page: number;
28:     general: { considerations: string | null; note?: string | null; references: string[]; sp80053: string[] };
29:     focus: Record<string, { priority: number; considerations?: string | null; opportunities?: string | null; references?: string[]; referencesNote?: string }>;
30:     refs: { scheme: string; id: string | null; text: string; column: string }[];
31:   }[];
32: }
33:
34: interface CosaisSource {
35:   status: string;
36:   sources: { documentId: string; published: string }[];
37:   overlays: {
38:     id: string;
39:     title: string;
40:     status: string;
41:     note: string;
42:     notePage: number;
43:     documentId: string;
44:     useCases: { id: string; text: string; page: number }[];
45:     assumptions: string[];
46:     lifecyclePhases: string[];
47:     controls: {
48:       id: string;
49:       idAsPrinted: string;
50:       inSummaryTable: boolean;
51:       annotated: boolean;
52:       proposedAdditional: boolean;
53:       lifecyclePhases: string[] | null;
54:       tailoring: { controlRequirement: boolean; organizationDefinedParameter: boolean; discussion: boolean } | null;
55:       annotation: {
56:         selectedInModerateBaseline?: string;
57:         assumptions?: string;
58:         controlTailoringSections?: { label: string; text: string }[];
59:         attackIdsNormalized?: string[];
60:       } | null;
61:       page: number;
62:     }[];
63:   }[];
64: }
65:
66: const clean = <T extends Record<string, unknown>>(o: T): T => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined && v !== null)) as T;
67:
68: export const CYBER_AI_PROFILE_ID = "nist-ir-8596-iprd";
69: export const COSAIS_PREDICTIVE_ID = "nist-cosais-predictive-ai";
70:
71: export function ingestCyberAiProfile(nodeIds: Set<string>, corpusDir = CORPUS_DIR): FrameworkOverlay | undefined {
72:   const file = resolve(corpusDir, "nist-ai-rmf", "cyber-ai-profile.json");
73:   if (!existsSync(file)) return undefined;
74:   const src = JSON.parse(readFileSync(file, "utf8")) as ProfileSource;
75:   const doc = src.source.documentId;
76:   const entries: OverlayEntry[] = src.entries.map((e) => {
77:     const nodeId = `nist-csf-2.0:${e.subcategory}`;
78:     if (!nodeIds.has(nodeId)) throw new Error(`Cyber AI Profile: ${e.subcategory} is not a CSF 2.0 subcategory`);
79:     const lenses: Record<string, OverlayLensEntry> = {};
80:     for (const [lens, f] of Object.entries(e.focus)) {
81:       lenses[lens] = clean({ priority: f.priority, considerations: f.considerations ?? undefined, opportunities: f.opportunities ?? undefined, references: f.references ?? [], referencesNote: f.referencesNote });
82:     }
83:     return {
84:       nodeId,
85:       citation: { documentId: doc, locator: `Cyber AI Profile, ${e.subcategory}`, page: e.page },
86:       general: clean({ considerations: e.general.considerations ?? undefined, note: e.general.note ?? undefined, references: e.general.references, sp80053: e.general.sp80053 }),
87:       lenses,
88:       refs: e.refs.map((r) => ({ scheme: r.scheme, id: r.id, text: r.text, column: r.column })),
89:     };
90:   });
91:   return {
92:     id: CYBER_AI_PROFILE_ID,
93:     frameworkId: "nist-csf-2.0",
94:     kind: "community-profile",
95:     title: src.source.title,
96:     shortName: "Cyber AI Profile",
97:     identifier: src.source.identifier,
98:     documentId: doc,
99:     status: src.source.status,
100:     notice: { text: src.source.draftNotice.text, citation: { documentId: doc, locator: "Section 2.2", page: src.source.draftNotice.page } },
101:     published: src.source.published,
102:     landingPage: src.source.landingPage,
103:     lenses: src.focusAreas.map((f) => ({ id: f.id, short: f.short, title: f.title, description: f.description, citation: { documentId: doc, locator: `Section ${f.section}`, page: f.page } })),
104:     priorityLevels: src.priorityLevels.map((p) => ({ level: p.level, label: p.label, description: p.description })),
105:     entries,
106:   };
107: }
108:
109: export function ingestCosais(nodeIds: Set<string>, corpusDir = CORPUS_DIR): FrameworkOverlay | undefined {
110:   const file = resolve(corpusDir, "nist-ai-rmf", "cosais.json");
111:   if (!existsSync(file)) return undefined;
112:   const src = JSON.parse(readFileSync(file, "utf8")) as CosaisSource;
113:   const o = src.overlays.find((x) => x.id === "predictive-ai-use-finetune");
114:   if (!o) return undefined;
115:   const doc = o.documentId;
116:   const entries: OverlayEntry[] = o.controls.map((c) => {
117:     const nodeId = `nist-sp-800-53-r5:${c.id}`;
118:     if (!nodeIds.has(nodeId)) throw new Error(`COSAiS: ${c.id} is not an SP 800-53 Rev. 5 control`);
119:     const where = c.annotated ? "control annotation" : c.inSummaryTable ? "summary table" : "additional proposed controls";
120:     const attackIds = c.annotation?.attackIdsNormalized ?? [];
121:     return {
122:       nodeId,
123:       citation: { documentId: doc, locator: `${c.idAsPrinted}, ${where}`, page: c.page },
124:       control: clean({
125:         inSummaryTable: c.inSummaryTable,
126:         annotated: c.annotated,
127:         proposedAdditional: c.proposedAdditional,
128:         lifecyclePhases: c.lifecyclePhases ?? undefined,
129:         selectedInModerateBaseline: c.annotation?.selectedInModerateBaseline,
130:         assumptions: c.annotation?.assumptions,
131:         tailoring: c.tailoring ?? undefined,
132:         tailoringSections: c.annotation?.controlTailoringSections,
133:         attackIds: attackIds.length ? attackIds : undefined,
134:       }),
135:       refs: attackIds.map((id) => ({ scheme: "nist-ai-100-2", id, text: id })),
136:     };
137:   });
138:   return {
139:     id: COSAIS_PREDICTIVE_ID,
140:     frameworkId: "nist-sp-800-53-r5",
141:     kind: "control-overlay",
142:     title: o.title,
143:     shortName: "COSAiS · Predictive AI",
144:     identifier: "COSAiS annotated outline (planned NISTIR 8605A)",
145:     documentId: doc,
146:     status: o.status,
147:     notice: { text: `${src.status} ${o.note}`, citation: { documentId: doc, locator: "Additional proposed controls", page: o.notePage } },
148:     published: src.sources.find((s) => s.documentId === doc)?.published,
149:     landingPage: "https://csrc.nist.gov/projects/cosais",
150:     scope: {
151:       useCases: o.useCases.map((u) => ({ id: u.id, text: u.text, citation: { documentId: doc, locator: `Use case ${u.id}`, page: u.page } })),
152:       assumptions: o.assumptions,
153:       lifecyclePhases: o.lifecyclePhases,
154:     },
155:     entries,
156:   };
157: }

FILE packages/frameworks/src/ingest/ai-rmf.ts SHA256 edd438e6541598425d6a3c2dd151bd1d5a48283e4a523bc725ba92c7977428d7
1: /**
2:  * NIST AI Risk Management Framework (AI RMF 1.0, NIST AI 100-1) ingestion, with the
3:  * AI RMF Playbook and the NIST AI 600-1 Generative AI Profile.
4:  *
5:  *   corpus/nist-ai-rmf/ai-rmf-core.json      functions → categories → subcategories (verbatim, page-cited)
6:  *   corpus/nist-ai-rmf/ai-rmf-playbook.json  About, Suggested Actions, Transparency & Documentation per subcategory
7:  *   corpus/nist-ai-rmf/genai-profile.json    12 GAI risks and the profile's actions, each tied to a subcategory
8:  *
9:  * All three are extracted from NIST publications (U.S. Government works, public domain).
10:  */
11: import { existsSync, readFileSync } from "node:fs";
12: import { resolve } from "node:path";
13: import type { FrameworkGraph, FrameworkProfile, ProfileAction, RequirementNode } from "@visua/core";
14: import { CORPUS_DIR } from "../paths.ts";
15:
16: export const AI_RMF_ID = "nist-ai-rmf";
17: export const GENAI_PROFILE_ID = "nist-ai-600-1";
18:
19: interface Source {
20:   documentId: string;
21:   title?: string;
22:   version?: string;
23: }
24:
25: interface CoreJson {
26:   source: Source;
27:   functions: { id: string; code?: string; title?: string; text?: string; page?: number }[];
28:   categories: { id: string; function: string; text: string; page?: number }[];
29:   subcategories: { id: string; category: string; function: string; text: string; page?: number }[];
30: }
31:
32: interface PlaybookJson {
33:   source: Source;
34:   entries: { id: string; about?: string; suggestedActions?: string[]; transparencyDocumentation?: string[]; references?: string[] }[];
35: }
36:
37: interface GenAiJson {
38:   source: Source;
39:   risks: { id: string; title: string; description: string; page?: number }[];
40:   actions: { id: string; subcategory: string; text: string; risks: string[]; page?: number }[];
41: }
42:
43: const readJson = <T>(path: string): T => JSON.parse(readFileSync(path, "utf8")) as T;
44: const TITLE: Record<string, string> = { GOVERN: "Govern", MAP: "Map", MEASURE: "Measure", MANAGE: "Manage" };
45: /** Two-letter function tags used by NIST AI 600-1 (GV, MP, MS, MG) — compact labels for dense 3D views. */
46: const TAG: Record<string, string> = { GOVERN: "GV", MAP: "MP", MEASURE: "MS", MANAGE: "MG" };
47: const shortLabel = (id: string) => id.replace(/^(GOVERN|MAP|MEASURE|MANAGE) /, (_, f: string) => `${TAG[f]}-`);
48:
49: /** Numeric-aware ordering for ids like "GOVERN 1.10" vs "GOVERN 1.2". */
50: function byId(a: string, b: string): number {
51:   const na = a.match(/\d+/g)?.map(Number) ?? [];
52:   const nb = b.match(/\d+/g)?.map(Number) ?? [];
53:   for (let i = 0; i < Math.max(na.length, nb.length); i++) {
54:     const d = (na[i] ?? -1) - (nb[i] ?? -1);
55:     if (d) return d;
56:   }
57:   return a.localeCompare(b);
58: }
59:
60: export function ingestAiRmf(dir = resolve(CORPUS_DIR, "nist-ai-rmf")): FrameworkGraph | null {
61:   const corePath = resolve(dir, "ai-rmf-core.json");
62:   if (!existsSync(corePath)) return null;
63:   const core = readJson<CoreJson>(corePath);
64:   const playbookPath = resolve(dir, "ai-rmf-playbook.json");
65:   const playbook = existsSync(playbookPath) ? readJson<PlaybookJson>(playbookPath) : null;
66:   const genaiPath = resolve(dir, "genai-profile.json");
67:   const genai = existsSync(genaiPath) ? readJson<GenAiJson>(genaiPath) : null;
68:   const coreDoc = core.source.documentId;
69:
70:   const nodes: RequirementNode[] = [];
71:   const order = ["GOVERN", "MAP", "MEASURE", "MANAGE"];
72:   const functions = [...core.functions].sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
73:   functions.forEach((f, fi) => {
74:     const fid = `${AI_RMF_ID}:${f.id}`;
75:     nodes.push({
76:       id: fid,
77:       frameworkId: AI_RMF_ID,
78:       code: f.id,
79:       kind: "function",
80:       parentId: null,
81:       depth: 0,
82:       order: fi,
83:       title: f.title ?? TITLE[f.id] ?? f.id,
84:       text: f.text ?? f.title ?? f.id,
85:       citation: { documentId: coreDoc, locator: `AI RMF Core — ${f.id}`, page: f.page },
86:       assessable: false,
87:     });
88:     core.categories
89:       .filter((c) => c.function === f.id)
90:       .sort((a, b) => byId(a.id, b.id))
91:       .forEach((c, ci) => {
92:         const cid = `${AI_RMF_ID}:${c.id}`;
93:         nodes.push({
94:           id: cid,
95:           frameworkId: AI_RMF_ID,
96:           code: c.id,
97:           kind: "category",
98:           parentId: fid,
99:           depth: 1,
100:           order: ci,
101:           title: "",
102:           text: c.text,
103:           attributes: { label: shortLabel(c.id) },
104:           citation: { documentId: coreDoc, locator: `AI RMF Core — ${c.id}`, page: c.page },
105:           assessable: false,
106:         });
107:         core.subcategories
108:           .filter((s) => s.category === c.id)
109:           .sort((a, b) => byId(a.id, b.id))
110:           .forEach((s, si) => {
111:             const pb = playbook?.entries.find((e) => e.id === s.id);
112:             const actions: ProfileAction[] = (genai?.actions ?? [])
113:               .filter((a) => a.subcategory === s.id)
114:               .sort((a, b) => byId(a.id, b.id))
115:               .map((a) => ({ profileId: GENAI_PROFILE_ID, id: a.id, text: a.text, risks: a.risks, citation: { documentId: genai!.source.documentId, locator: a.id, page: a.page } }));
116:             nodes.push({
117:               id: `${AI_RMF_ID}:${s.id}`,
118:               frameworkId: AI_RMF_ID,
119:               code: s.id,
120:               kind: "subcategory",
121:               parentId: cid,
122:               depth: 2,
123:               order: si,
124:               title: "",
125:               text: s.text,
126:               attributes: {
127:                 label: shortLabel(s.id),
128:                 ...(pb?.suggestedActions?.length ? { suggestedActions: pb.suggestedActions } : {}),
129:                 ...(pb?.transparencyDocumentation?.length ? { transparency: pb.transparencyDocumentation } : {}),
130:                 ...(pb?.about ? { about: pb.about } : {}),
131:                 ...(pb?.references?.length ? { playbookReferences: pb.references } : {}),
132:                 ...(actions.length ? { profileActions: actions } : {}),
133:               },
134:               citation: { documentId: coreDoc, locator: `AI RMF Core — ${s.id}`, page: s.page },
135:               assessable: true,
136:             });
137:           });
138:       });
139:   });
140:
141:   const profiles: FrameworkProfile[] = genai
142:     ? [
143:         {
144:           id: GENAI_PROFILE_ID,
145:           title: "Generative AI Profile (NIST AI 600-1)",
146:           documentId: genai.source.documentId,
147:           appliesWhen: "generative",
148:           risks: genai.risks.map((r) => ({ id: r.id, title: r.title, description: r.description, citation: { documentId: genai.source.documentId, locator: r.title, page: r.page } })),
149:         },
150:       ]
151:     : [];
152:
153:   return {
154:     framework: {
155:       id: AI_RMF_ID,
156:       family: "ai",
157:       shortName: "NIST AI RMF",
158:       badge: "AI RMF",
159:       name: "NIST Artificial Intelligence Risk Management Framework (AI RMF 1.0)",
160:       publisher: "National Institute of Standards and Technology (NIST)",
161:       version: core.source.version ?? "1.0",
162:       published: "2023-01",
163:       description:
164:         "A voluntary framework for managing risks of AI systems to individuals, organizations and society. Four functions — GOVERN, MAP, MEASURE and MANAGE — organize outcomes that the AI RMF Playbook supports with suggested actions; the Generative AI Profile (NIST AI 600-1) adds actions for 12 risks unique to or exacerbated by generative AI.",
165:       levels: [
166:         { kind: "function", label: "Function", pluralLabel: "Functions" },
167:         { kind: "category", label: "Category", pluralLabel: "Categories" },
168:         { kind: "subcategory", label: "Subcategory", pluralLabel: "Subcategories" },
169:       ],
170:       assessableKind: "subcategory",
171:       sources: [{ documentId: coreDoc }, ...(playbook ? [{ documentId: playbook.source.documentId }] : []), ...(genai ? [{ documentId: genai.source.documentId }] : [])],
172:       unitLabel: "outcome",
173:       unitLabelPlural: "outcomes",
174:       contentNotice: "NIST publications (public domain). The AI RMF is voluntary; outcome levels are Visua's convention because the AI RMF defines no tiers.",
175:     },
176:     nodes,
177:     profiles,
178:   };
179: }

FILE packages/frameworks/src/ingest/csf.ts SHA256 3c30d4a2baea99d90b955629589e07c911893245765bc0d7c4f8c393bc95d6be
1: /**
2:  * NIST CSF 2.0 ingestion from the official CSF 2.0 Reference Tool data
3:  * (corpus/nist-csf-2.0/machine-readable/csf-2.0-reference-tool-elements.json),
4:  * with page citations resolved against NIST CSWP 29 and the Implementation
5:  * Examples PDF. Withdrawn CSF 1.1 elements are excluded from the graph.
6:  */
7: import { readFileSync } from "node:fs";
8: import { resolve } from "node:path";
9: import type { FrameworkGraph, ImplementationExample, InformativeReference, Mapping, MappingSet, RequirementNode } from "@visua/core";
10: import { CORPUS_DIR } from "../paths.ts";
11: import { findPage, pdfPages } from "./pdf.ts";
12:
13: export const CSF_ID = "nist-csf-2.0";
14: const CSWP29 = "nist-cswp-29-csf-2-0";
15: const ELEMENTS = "csf-2-0-reference-tool-elements-json";
16: const EXAMPLES_PDF = "csf-2-0-implementation-examples-pdf";
17:
18: /** Archived OLIR dataset superseded by the Rev 5.2.0 mapping. */
19: const ARCHIVED_DATASETS = new Set(["SP-800-53-Rev-5-to-Cybersecurity-Framework-v2.0"]);
20: export const OLIR_800_53 = "Cybersecurity-Framework-v2.0-to-SP-800-53-Rev-5-2-0";
21: export const OLIR_800_37 = "SP-800-37-Rev-2-to-Cybersecurity-Framework-v2.0";
22:
23: interface RawNode {
24:   elementIdentifier: string;
25:   elementTypeIdentifier: string;
26:   title: string;
27:   text?: string;
28:   elements?: RawNode[];
29:   externalRelationships?: RawRef[];
30:   relationIdentifier?: string;
31: }
32:
33: interface RawRef {
34:   elementIdentifier: string;
35:   elementTypeIdentifier: string;
36:   title: string;
37:   text?: string;
38:   relationIdentifier: string;
39:   shortName: string;
40:   olirName?: string;
41:   frameworkVersionIdentifier?: string;
42: }
43:
44: interface OlirDoc {
45:   name: string;
46:   developerId: string;
47:   releaseDate: string;
48:   webSite?: string;
49: }
50:
51: const isWithdrawn = (n: RawNode) => (n.elements ?? []).some((c) => c.elementTypeIdentifier === "withdraw_reason");
52:
53: const titleCase = (s: string) => s.charAt(0) + s.slice(1).toLowerCase();
54:
55: /** "SR-03" → "SR-3", "AC-02(01)" → "AC-2(1)" (SP 800-53 display labels). */
56: export function normalize80053(ref: string): string {
57:   const m = /^([A-Z]{2})-0*(\d+)(?:\(0*(\d+)\))?$/.exec(ref.trim().toUpperCase());
58:   if (!m) return ref.trim().toUpperCase();
59:   return `${m[1]}-${m[2]}${m[3] ? `(${m[3]})` : ""}`;
60: }
61:
62: /** "RMF Prepare Step (...): TASK P-2 Risk Management Strategy" → "P-2" */
63: export function rmfTaskCode(ref: string): string | undefined {
64:   return /TASK\s+([PCSIAR]-\d{1,2})\b/.exec(ref)?.[1];
65: }
66:
67: export interface CsfIngestResult {
68:   graph: FrameworkGraph;
69:   /** Raw references kept for building mapping sets once all graphs exist. */
70:   crosswalkRefs: { csfId: string; dataset: string; ref: string }[];
71: }
72:
73: export async function ingestCsf(): Promise<CsfIngestResult> {
74:   const dir = resolve(CORPUS_DIR, "nist-csf-2.0");
75:   const elements = JSON.parse(readFileSync(resolve(dir, "machine-readable/csf-2.0-reference-tool-elements.json"), "utf8")) as {
76:     response: { elements: RawNode[] };
77:   };
78:   const olirs = JSON.parse(readFileSync(resolve(dir, "machine-readable/csf-2.0-reference-tool-olirs.json"), "utf8")) as {
79:     response: { informativeReferenceDocs: OlirDoc[] };
80:   };
81:   const developers = new Map(olirs.response.informativeReferenceDocs.map((d) => [d.name, d.developerId]));
82:
83:   const cswp = await pdfPages(resolve(dir, "core/NIST.CSWP.29.pdf"));
84:   const examplesPdf = await pdfPages(resolve(dir, "core/CSF_2.0_Implementation_Examples.pdf"));
85:   // The CSF Core listing (Appendix A) starts where GV.OC-01 is first spelled out.
86:   const coreStart = (findPage(cswp, "GV.OC-01:") ?? 1) - 1;
87:
88:   const nodes: RequirementNode[] = [];
89:   const crosswalkRefs: CsfIngestResult["crosswalkRefs"] = [];
90:
91:   const refsOf = (raw: RawNode, csfId: string): InformativeReference[] => {
92:     const seen = new Set<string>();
93:     const out: InformativeReference[] = [];
94:     for (const r of raw.externalRelationships ?? []) {
95:       if (r.relationIdentifier !== "olir_focal") continue;
96:       const dataset = r.olirName ?? r.shortName;
97:       if (ARCHIVED_DATASETS.has(dataset)) continue;
98:       const key = `${dataset}|${r.elementIdentifier.trim()}`;
99:       if (seen.has(key)) continue;
100:       seen.add(key);
101:       const ref: InformativeReference = { source: r.shortName, ref: r.elementIdentifier.replace(/\s+/g, " ").trim(), dataset, developer: developers.get(dataset) };
102:       if (dataset === OLIR_800_53) {
103:         ref.ref = normalize80053(r.elementIdentifier);
104:         ref.nodeId = `nist-sp-800-53-r5:${ref.ref}`;
105:         crosswalkRefs.push({ csfId, dataset, ref: ref.ref });
106:       } else if (dataset === OLIR_800_37) {
107:         const code = rmfTaskCode(r.elementIdentifier);
108:         if (code) {
109:           ref.nodeId = `nist-rmf:${code}`;
110:           crosswalkRefs.push({ csfId, dataset, ref: code });
111:         }
112:       }
113:       out.push(ref);
114:     }
115:     return out;
116:   };
117:
118:   const families = (raw: RawNode) =>
119:     [...new Set((raw.externalRelationships ?? []).filter((r) => r.relationIdentifier === "external_reference").map((r) => r.elementIdentifier))];
120:
121:   let fnOrder = 0;
122:   for (const fn of elements.response.elements) {
123:     const fnId = `${CSF_ID}:${fn.elementIdentifier}`;
124:     nodes.push({
125:       id: fnId,
126:       frameworkId: CSF_ID,
127:       code: fn.elementIdentifier,
128:       kind: "function",
129:       parentId: null,
130:       depth: 0,
131:       order: fnOrder++,
132:       title: titleCase(fn.title),
133:       text: fn.text ?? "",
134:       references: refsOf(fn, fnId),
135:       attributes: { officialTitle: fn.title },
136:       citation: { documentId: CSWP29, locator: `Appendix A — ${fn.title} (${fn.elementIdentifier})`, page: findPage(cswp, `(${fn.elementIdentifier}):`, coreStart) },
137:       assessable: false,
138:     });
139:     let catOrder = 0;
140:     for (const cat of fn.elements ?? []) {
141:       if (cat.elementTypeIdentifier !== "category" || cat.relationIdentifier || isWithdrawn(cat)) continue;
142:       const catId = `${CSF_ID}:${cat.elementIdentifier}`;
143:       nodes.push({
144:         id: catId,
145:         frameworkId: CSF_ID,
146:         code: cat.elementIdentifier,
147:         kind: "category",
148:         parentId: fnId,
149:         depth: 1,
150:         order: catOrder++,
151:         title: cat.title,
152:         text: cat.text ?? "",
153:         references: refsOf(cat, catId),
154:         citation: { documentId: CSWP29, locator: `Appendix A — ${cat.title} (${cat.elementIdentifier})`, page: findPage(cswp, `(${cat.elementIdentifier}):`, coreStart) },
155:         assessable: false,
156:       });
157:       let subOrder = 0;
158:       for (const sub of cat.elements ?? []) {
159:         if (sub.elementTypeIdentifier !== "subcategory" || sub.relationIdentifier || isWithdrawn(sub)) continue;
160:         const subId = `${CSF_ID}:${sub.elementIdentifier}`;
161:         const kids = sub.elements ?? [];
162:         const examples: ImplementationExample[] = kids
163:           .filter((k) => k.elementTypeIdentifier === "implementation_example")
164:           .map((k) => ({ code: `${sub.elementIdentifier} ${k.title}`, text: (k.text ?? "").trim() }));
165:         const party = kids.filter((k) => k.elementTypeIdentifier === "party").map((k) => k.elementIdentifier);
166:         nodes.push({
167:           id: subId,
168:           frameworkId: CSF_ID,
169:           code: sub.elementIdentifier,
170:           kind: "subcategory",
171:           parentId: catId,
172:           depth: 2,
173:           order: subOrder++,
174:           title: "",
175:           text: (sub.text ?? "").trim(),
176:           examples,
177:           references: refsOf(sub, subId),
178:           attributes: {
179:             party,
180:             sp80053Families: families(sub),
181:             examplesPage: findPage(examplesPdf, `${sub.elementIdentifier}:`) ?? findPage(examplesPdf, sub.elementIdentifier),
182:           },
183:           citation: { documentId: CSWP29, locator: `Appendix A — ${sub.elementIdentifier}`, page: findPage(cswp, `${sub.elementIdentifier}:`, coreStart) },
184:           assessable: true,
185:         });
186:       }
187:     }
188:   }
189:
190:   const graph: FrameworkGraph = {
191:     framework: {
192:       id: CSF_ID,
193:       family: "csf",
194:       shortName: "NIST CSF 2.0",
195:       badge: "CSF 2.0",
196:       name: "The NIST Cybersecurity Framework (CSF) 2.0",
197:       publisher: "National Institute of Standards and Technology",
198:       version: "2.0",
199:       published: "2024-02-26",
200:       description:
201:         "A taxonomy of high-level cybersecurity outcomes that any organization — regardless of size, sector or maturity — can use to understand, assess, prioritize and communicate its cybersecurity efforts. Six Functions (Govern, Identify, Protect, Detect, Respond, Recover), 22 Categories and 106 Subcategories, with official Implementation Examples and Informative References.",
202:       levels: [
203:         { kind: "function", label: "Function", pluralLabel: "Functions" },
204:         { kind: "category", label: "Category", pluralLabel: "Categories" },
205:         { kind: "subcategory", label: "Subcategory", pluralLabel: "Subcategories" },
206:       ],
207:       assessableKind: "subcategory",
208:       sources: [{ documentId: CSWP29 }, { documentId: ELEMENTS }, { documentId: EXAMPLES_PDF }],
209:       unitLabel: "outcome",
210:       unitLabelPlural: "outcomes",
211:     },
212:     nodes,
213:   };
214:   return { graph, crosswalkRefs };
215: }
216:
217: /** Build CSF crosswalk mapping sets, keeping only mappings whose endpoints exist. */
218: export function csfMappingSets(refs: CsfIngestResult["crosswalkRefs"], exists: (id: string) => boolean): MappingSet[] {
219:   const toControls: Mapping[] = [];
220:   const toRmf: Mapping[] = [];
221:   const seen = new Set<string>();
222:   for (const r of refs) {
223:     if (r.dataset === OLIR_800_53) {
224:       const source = `nist-sp-800-53-r5:${r.ref}`;
225:       const key = `${source}|${r.csfId}`;
226:       if (seen.has(key) || !exists(source) || !exists(r.csfId)) continue;
227:       seen.add(key);
228:       toControls.push({
229:         source,
230:         target: r.csfId,
231:         relationship: "supports",
232:         origin: { documentId: "olir-csf-2-0-to-sp-800-53r5-2-0", authority: "NIST OLIR — CSF 2.0 to SP 800-53 Rev. 5.2.0 concept crosswalk" },
233:       });
234:     } else if (r.dataset === OLIR_800_37) {
235:       const source = `nist-rmf:${r.ref}`;
236:       const key = `${source}|${r.csfId}`;
237:       if (seen.has(key) || !exists(source) || !exists(r.csfId)) continue;
238:       seen.add(key);
239:       toRmf.push({
240:         source,
241:         target: r.csfId,
242:         relationship: "related-to",
243:         origin: { documentId: "olir-sp-800-37r2-to-csf-2-0", authority: "NIST OLIR — SP 800-37 Rev. 2 to CSF 2.0 concept crosswalk" },
244:       });
245:     }
246:   }
247:   return [
248:     {
249:       id: "sp-800-53-r5--csf-2.0",
250:       title: "SP 800-53 Rev. 5.2.0 controls supporting CSF 2.0 outcomes",
251:       sourceFramework: "nist-sp-800-53-r5",
252:       targetFramework: CSF_ID,
253:       authority: "NIST OLIR",
254:       mappings: toControls,
255:     },
256:     {
257:       id: "rmf-tasks--csf-2.0",
258:       title: "RMF (SP 800-37 Rev. 2) tasks related to CSF 2.0",
259:       sourceFramework: "nist-rmf",
260:       targetFramework: CSF_ID,
261:       authority: "NIST OLIR",
262:       mappings: toRmf,
263:     },
264:   ];
265: }

FILE packages/frameworks/src/ingest/pdf.ts SHA256 5f7987c6ca710ef0a2a1f4408602b1865cf548daf555041f2f2d108be609ad6d
1: /**
2:  * PDF → page text → citation-ready chunks.
3:  * Chunks never cross page boundaries so every citation carries an exact page.
4:  */
5: import { readFileSync } from "node:fs";
6: import { extractText, getDocumentProxy } from "unpdf";
7: import type { CorpusChunk } from "../search.ts";
8:
9: export async function pdfPages(path: string): Promise<string[]> {
10:   const pdf = await getDocumentProxy(new Uint8Array(readFileSync(path)));
11:   const { text } = await extractText(pdf, { mergePages: false });
12:   return (text as string[]).map((p) => p ?? "");
13: }
14:
15: /** Lines repeated on most pages (running headers/footers) are noise for retrieval. */
16: function boilerplateLines(pages: string[]): Set<string> {
17:   const counts = new Map<string, number>();
18:   for (const page of pages) {
19:     const lines = new Set(
20:       page
21:         .split("\n")
22:         .map((l) => l.trim())
23:         .filter((l) => l.length > 3 && l.length < 140),
24:     );
25:     for (const l of lines) counts.set(l, (counts.get(l) ?? 0) + 1);
26:   }
27:   const threshold = Math.max(3, pages.length * 0.4);
28:   return new Set([...counts.entries()].filter(([, n]) => n >= threshold).map(([l]) => l));
29: }
30:
31: export function cleanPage(page: string, boilerplate: Set<string>): string {
32:   return page
33:     .split("\n")
34:     .map((l) => l.trim())
35:     .filter((l) => l && !boilerplate.has(l) && !/^\d{1,4}$/.test(l))
36:     .join("\n")
37:     .replace(/(\w)-\n(\w)/g, "$1$2") // re-join hyphenated words
38:     .replace(/[ \t]+/g, " ")
39:     .replace(/\n{2,}/g, "\n")
40:     .trim();
41: }
42:
43: export interface ChunkSource {
44:   documentId: string;
45:   documentTitle: string;
46:   framework: string;
47: }
48:
49: export function chunkPages(source: ChunkSource, pages: string[], size = 1300): CorpusChunk[] {
50:   const boilerplate = boilerplateLines(pages);
51:   const chunks: CorpusChunk[] = [];
52:   pages.forEach((raw, i) => {
53:     const text = cleanPage(raw, boilerplate);
54:     if (text.length < 60) return;
55:     const paragraphs = text.split(/\n(?=[A-Z•o\-–(0-9])/);
56:     let buf = "";
57:     let n = 0;
58:     const flush = () => {
59:       const t = buf.replace(/\n/g, " ").replace(/\s+/g, " ").trim();
60:       if (t.length >= 60) {
61:         chunks.push({ id: `${source.documentId}#p${i + 1}-${n++}`, documentId: source.documentId, documentTitle: source.documentTitle, framework: source.framework, page: i + 1, text: t });
62:       }
63:       buf = "";
64:     };
65:     for (const p of paragraphs) {
66:       if (buf.length + p.length > size && buf.length > 200) flush();
67:       buf += (buf ? "\n" : "") + p;
68:     }
69:     flush();
70:   });
71:   return chunks;
72: }
73:
74: /** Find the first PDF page (1-based) whose text contains the needle. */
75: export function findPage(pages: string[], needle: string, from = 0): number | undefined {
76:   for (let i = from; i < pages.length; i++) if (pages[i]!.includes(needle)) return i + 1;
77:   return undefined;
78: }

FILE packages/frameworks/src/ingest/rmf.ts SHA256 259899ab8b06568d78b81b6b69af54c5cde62fbbd329081dfa3dd11be0b107dd
1: /**
2:  * NIST RMF (SP 800-37 Rev. 2) process ingestion: the seven steps and their 47
3:  * tasks with outcomes, inputs, outputs, roles and SDLC phases, extracted from
4:  * the official PDF and verified against NIST's CPRT rendering
5:  * (corpus/nist-rmf/rmf-tasks.json).
6:  */
7: import { readFileSync } from "node:fs";
8: import { resolve } from "node:path";
9: import type { FrameworkGraph, Mapping, MappingSet, RequirementNode } from "@visua/core";
10: import { CORPUS_DIR } from "../paths.ts";
11:
12: export const RMF_ID = "nist-rmf";
13: const DOC = "nist-sp-800-37r2";
14:
15: interface RawTask {
16:   step: string;
17:   level: "organization" | "system";
18:   id: string;
19:   title: string;
20:   task: string;
21:   outcome: string;
22:   outcomes: { text: string; cybersecurityFramework: string[] }[];
23:   potentialInputs: string[];
24:   expectedOutputs: string[];
25:   primaryResponsibility: string[];
26:   supportingRoles: string[];
27:   sdlcPhase: { new?: string; existing?: string } | null;
28:   discussionExcerpt: string;
29:   references: string;
30:   source: { section?: string; pdfPage?: number; printedPage?: string | number; page?: number };
31: }
32:
33: export const RMF_STEPS: { key: string; code: string; title: string; purpose: string }[] = [
34:   { key: "prepare", code: "P", title: "Prepare", purpose: "Carry out essential activities at the organization, mission and business process, and information system levels to help prepare the organization to manage its security and privacy risks using the Risk Management Framework." },
35:   { key: "categorize", code: "C", title: "Categorize", purpose: "Inform organizational risk management processes and tasks by determining the adverse impact to organizational operations and assets, individuals, other organizations, and the Nation with respect to the loss of confidentiality, integrity, and availability of organizational systems and the information processed, stored, and transmitted by those systems." },
36:   { key: "select", code: "S", title: "Select", purpose: "Select, tailor, and document the controls necessary to protect the information system and organization commensurate with risk to organizational operations and assets, individuals, other organizations, and the Nation." },
37:   { key: "implement", code: "I", title: "Implement", purpose: "Implement the controls in the security and privacy plans for the system and for the organization and to document in a baseline configuration, the specific details of the control implementation." },
38:   { key: "assess", code: "A", title: "Assess", purpose: "Determine if the controls selected for implementation are implemented correctly, operating as intended, and producing the desired outcome with respect to meeting the security and privacy requirements for the system and the organization." },
39:   { key: "authorize", code: "R", title: "Authorize", purpose: "Provide organizational accountability by requiring a senior management official to determine if the security and privacy risk (including supply chain risk) to organizational operations and assets, individuals, other organizations, or the Nation based on the operation of a system or the use of common controls, is acceptable." },
40:   { key: "monitor", code: "M", title: "Monitor", purpose: "Maintain an ongoing situational awareness about the security and privacy posture of the information system and the organization in support of risk management decisions." },
41: ];
42:
43: /** "ID.AM-6" (CSF 1.1 notation in SP 800-37r2) → CSF 2.0 style is not 1:1; keep as provenance only. */
44: export function ingestRmf(): { graph: FrameworkGraph; csfMentions: { taskId: string; csf11: string[] }[] } {
45:   const tasks = JSON.parse(readFileSync(resolve(CORPUS_DIR, "nist-rmf/rmf-tasks.json"), "utf8")) as RawTask[];
46:   const nodes: RequirementNode[] = [];
47:   const csfMentions: { taskId: string; csf11: string[] }[] = [];
48:   RMF_STEPS.forEach((step, si) => {
49:     const stepId = `${RMF_ID}:${step.code}`;
50:     const stepTasks = tasks.filter((t) => t.step === step.key);
51:     nodes.push({
52:       id: stepId,
53:       frameworkId: RMF_ID,
54:       code: step.code,
55:       kind: "step",
56:       parentId: null,
57:       depth: 0,
58:       order: si,
59:       title: step.title,
60:       text: step.purpose,
61:       citation: { documentId: DOC, locator: `Chapter 3, ${step.title} step`, page: stepTasks[0]?.source.pdfPage ?? stepTasks[0]?.source.page },
62:       assessable: false,
63:       attributes: { taskCount: stepTasks.length },
64:     });
65:     stepTasks.forEach((t, ti) => {
66:       const id = `${RMF_ID}:${t.id}`;
67:       nodes.push({
68:         id,
69:         frameworkId: RMF_ID,
70:         code: t.id,
71:         kind: "task",
72:         parentId: stepId,
73:         depth: 1,
74:         order: ti,
75:         title: t.title,
76:         text: t.task,
77:         guidance: t.discussionExcerpt,
78:         attributes: {
79:           level: t.level,
80:           outcome: t.outcome,
81:           outcomes: t.outcomes.map((o) => o.text),
82:           potentialInputs: t.potentialInputs,
83:           expectedOutputs: t.expectedOutputs,
84:           primaryResponsibility: t.primaryResponsibility,
85:           supportingRoles: t.supportingRoles,
86:           sdlcPhase: t.sdlcPhase,
87:           references: t.references,
88:           statementItems: t.expectedOutputs.map((o) => `Produce: ${o}`),
89:         },
90:         citation: { documentId: DOC, locator: `${t.source.section ?? "Chapter 3"} — Task ${t.id} ${t.title}`, page: t.source.pdfPage ?? t.source.page },
91:         assessable: true,
92:       });
93:       const csf = t.outcomes.flatMap((o) => o.cybersecurityFramework).filter((c) => /^[A-Z]{2}\.[A-Z]{2}/.test(c));
94:       if (csf.length) csfMentions.push({ taskId: id, csf11: csf });
95:     });
96:   });
97:   return {
98:     graph: {
99:       framework: {
100:         id: RMF_ID,
101:         family: "rmf",
102:         shortName: "NIST RMF",
103:         badge: "RMF",
104:         name: "NIST Risk Management Framework (SP 800-37 Rev. 2)",
105:         publisher: "National Institute of Standards and Technology",
106:         version: "Rev. 2",
107:         published: "2018-12-20",
108:         description:
109:           "The seven-step process — Prepare, Categorize, Select, Implement, Assess, Authorize, Monitor — for managing security and privacy risk and authorizing systems, applied with the SP 800-53 control catalog.",
110:         levels: [
111:           { kind: "step", label: "Step", pluralLabel: "Steps" },
112:           { kind: "task", label: "Task", pluralLabel: "Tasks" },
113:         ],
114:         assessableKind: "task",
115:         sources: [{ documentId: DOC }, { documentId: "cprt-sp-800-37r2-json" }],
116:         unitLabel: "task",
117:         unitLabelPlural: "tasks",
118:       },
119:       nodes,
120:     },
121:     csfMentions,
122:   };
123: }
124:
125: /** RMF tasks → SP 800-53 controls that implement them (per SP 800-37r2 references to the control catalog). */
126: export function rmfToControls(exists: (id: string) => boolean): MappingSet {
127:   // Editorial links from each SP 800-37r2 task to the SP 800-53 controls that operationalize it
128:   // (e.g. C-2 Security Categorization ↔ RA-2, R-4 Authorization Decision ↔ CA-6). Labelled as editorial.
129:   const pairs: [string, string[]][] = [
130:     ["P-1", ["PM-2", "PM-29"]],
131:     ["P-2", ["PM-9", "PM-28"]],
132:     ["P-3", ["RA-3", "PM-16", "PM-28"]],
133:     ["P-4", ["PL-10", "PL-11"]],
134:     ["P-5", ["PM-1"]],
135:     ["P-7", ["PM-31", "CA-7"]],
136:     ["P-8", ["PM-11"]],
137:     ["P-10", ["CM-8", "PM-5"]],
138:     ["P-11", ["PL-2"]],
139:     ["P-12", ["RA-2", "PM-11"]],
140:     ["P-13", ["SI-12"]],
141:     ["P-14", ["RA-3", "RA-5"]],
142:     ["P-15", ["SA-4", "PM-11"]],
143:     ["P-16", ["PM-7", "PL-8", "SA-17"]],
144:     ["P-17", ["PL-8"]],
145:     ["P-18", ["PM-5"]],
146:     ["C-1", ["PL-2", "CM-8"]],
147:     ["C-2", ["RA-2"]],
148:     ["C-3", ["RA-2"]],
149:     ["S-1", ["PL-2", "PL-10"]],
150:     ["S-2", ["PL-11"]],
151:     ["S-3", ["PL-2", "PL-8"]],
152:     ["S-4", ["PL-2", "SA-4"]],
153:     ["S-5", ["CA-7"]],
154:     ["S-6", ["PL-2"]],
155:     ["I-1", ["CM-2", "CM-6"]],
156:     ["I-2", ["PL-2", "CM-2"]],
157:     ["A-1", ["CA-2", "CA-2(1)"]],
158:     ["A-2", ["CA-2"]],
159:     ["A-3", ["CA-2", "CA-8"]],
160:     ["A-4", ["CA-2"]],
161:     ["A-5", ["CA-2", "SI-2"]],
162:     ["A-6", ["CA-5", "PM-4"]],
163:     ["R-1", ["CA-6", "PL-2"]],
164:     ["R-2", ["RA-3", "PM-9"]],
165:     ["R-3", ["CA-5", "PM-4", "PM-9"]],
166:     ["R-4", ["CA-6"]],
167:     ["R-5", ["CA-6"]],
168:     ["M-1", ["CM-3", "CM-4"]],
169:     ["M-2", ["CA-2", "CA-7"]],
170:     ["M-3", ["CA-5", "CA-7"]],
171:     ["M-4", ["CA-6", "CA-7", "PL-2"]],
172:     ["M-5", ["CA-7"]],
173:     ["M-6", ["CA-6"]],
174:     ["M-7", ["MP-6", "CM-8"]],
175:   ];
176:   const mappings: Mapping[] = [];
177:   for (const [task, controls] of pairs) {
178:     for (const c of controls) {
179:       const source = `nist-sp-800-53-r5:${c}`;
180:       const target = `${RMF_ID}:${task}`;
181:       if (!exists(source) || !exists(target)) continue;
182:       mappings.push({ source, target, relationship: "supports", origin: { documentId: DOC, authority: "Visua editorial mapping of SP 800-37 Rev. 2 tasks to supporting SP 800-53 controls" } });
183:     }
184:   }
185:   return {
186:     id: "sp-800-53-r5--rmf-tasks",
187:     title: "SP 800-53 controls supporting RMF tasks",
188:     sourceFramework: "nist-sp-800-53-r5",
189:     targetFramework: RMF_ID,
190:     authority: "Visua editorial (SP 800-37 Rev. 2)",
191:     mappings,
192:   };
193: }

FILE packages/frameworks/src/ingest/sp80053.ts SHA256 8b380b7407dfaeb5fbeaa31ad8848e4ad97019e3ce317bbfe597a743e4a6a1b9
1: /**
2:  * NIST SP 800-53 Rev. 5 (Release 5.2.0) ingestion from the official OSCAL
3:  * catalog, with SP 800-53A assessment objectives/methods (embedded in the
4:  * catalog) and SP 800-53B baseline membership from the OSCAL profiles.
5:  * Withdrawn controls are excluded from the graph.
6:  */
7: import { readFileSync } from "node:fs";
8: import { resolve } from "node:path";
9: import type { FrameworkGraph, RequirementNode } from "@visua/core";
10: import { CORPUS_DIR } from "../paths.ts";
11: import { pdfPages } from "./pdf.ts";
12:
13: export const SP80053_ID = "nist-sp-800-53-r5";
14: const CATALOG_DOC = "oscal-sp-800-53r5-catalog";
15: const PDF_DOC = "nist-sp-800-53r5";
16:
17: interface Prop {
18:   name: string;
19:   value: string;
20:   class?: string;
21:   ns?: string;
22: }
23: interface Part {
24:   id?: string;
25:   name: string;
26:   props?: Prop[];
27:   prose?: string;
28:   parts?: Part[];
29:   links?: { href: string; rel: string }[];
30: }
31: interface Param {
32:   id: string;
33:   label?: string;
34:   props?: Prop[];
35:   select?: { "how-many"?: string; choice?: string[] };
36:   guidelines?: { prose: string }[];
37: }
38: interface Control {
39:   id: string;
40:   class: string;
41:   title: string;
42:   props?: Prop[];
43:   params?: Param[];
44:   links?: { href: string; rel: string }[];
45:   parts?: Part[];
46:   controls?: Control[];
47: }
48: interface Group {
49:   id: string;
50:   title: string;
51:   props?: Prop[];
52:   controls: Control[];
53: }
54:
55: const labelOf = (props: Prop[] | undefined, cls?: string) =>
56:   props?.find((p) => p.name === "label" && (cls ? p.class === cls : !p.class))?.value;
57:
58: const isWithdrawn = (c: Control) => c.props?.some((p) => p.name === "status" && p.value === "withdrawn") ?? false;
59:
60: /** Resolve `{{ insert: param, id }}` to SP 800-53 printed style. */
61: function renderProse(prose: string, params: Map<string, Param>): string {
62:   return prose.replace(/\{\{\s*insert:\s*param,\s*([^\s}]+)\s*\}\}/g, (_m, id: string) => {
63:     const p = params.get(id);
64:     if (!p) return "[Assignment: organization-defined value]";
65:     if (p.select?.choice?.length) {
66:       const how = p.select["how-many"] === "one-or-more" ? "Selection (one or more)" : "Selection";
67:       return `[${how}: ${p.select.choice.map((c) => renderProse(c, params)).join("; ")}]`;
68:     }
69:     return `[Assignment: organization-defined ${p.label ?? "value"}]`;
70:   });
71: }
72:
73: /** Strip OSCAL markdown links: "[CM-8](#cm-8)" → "CM-8". */
74: const stripLinks = (text: string) => text.replace(/\[([^\]]+)\]\(#[^)]+\)/g, "$1");
75:
76: function renderStatement(part: Part | undefined, params: Map<string, Param>, depth = 0): string[] {
77:   if (!part) return [];
78:   const lines: string[] = [];
79:   const label = labelOf(part.props);
80:   if (part.prose) lines.push(`${"  ".repeat(Math.max(0, depth - 1))}${label ? `${label} ` : ""}${renderProse(part.prose, params)}`);
81:   for (const child of part.parts ?? []) if (child.name === "item") lines.push(...renderStatement(child, params, depth + 1));
82:   return lines;
83: }
84:
85: function leafObjectives(part: Part | undefined, params: Map<string, Param>, out: string[] = []): string[] {
86:   if (!part) return out;
87:   const kids = (part.parts ?? []).filter((p) => p.name === "assessment-objective");
88:   if (!kids.length && part.prose) {
89:     const label = labelOf(part.props, "sp800-53a");
90:     out.push(`${label ? `${label} ` : ""}${renderProse(part.prose, params)}`);
91:   }
92:   for (const k of kids) leafObjectives(k, params, out);
93:   return out;
94: }
95:
96: function methods(control: Control): Record<string, string[]> {
97:   const out: Record<string, string[]> = {};
98:   for (const part of control.parts ?? []) {
99:     if (part.name !== "assessment-method") continue;
100:     const method = part.props?.find((p) => p.name === "method")?.value?.toLowerCase();
101:     const objects = part.parts?.find((p) => p.name === "assessment-objects")?.prose ?? "";
102:     if (method) out[method] = objects.split(/\n\s*\n/).map((s) => s.trim()).filter(Boolean);
103:   }
104:   return out;
105: }
106:
107: function baselineIds(file: string): Set<string> {
108:   const profile = JSON.parse(readFileSync(file, "utf8")) as {
109:     profile: { imports: { "include-controls"?: { "with-ids"?: string[] }[] }[] };
110:   };
111:   const ids = new Set<string>();
112:   for (const imp of profile.profile.imports) for (const inc of imp["include-controls"] ?? []) for (const id of inc["with-ids"] ?? []) ids.add(id);
113:   return ids;
114: }
115:
116: export async function ingest80053(): Promise<FrameworkGraph> {
117:   const dir = resolve(CORPUS_DIR, "nist-rmf");
118:   const catalog = JSON.parse(readFileSync(resolve(dir, "oscal/NIST_SP-800-53_rev5_catalog.json"), "utf8")) as {
119:     catalog: { groups: Group[]; metadata: { version: string } };
120:   };
121:   const baselines: Record<string, Set<string>> = {
122:     low: baselineIds(resolve(dir, "oscal/NIST_SP-800-53_rev5_LOW-baseline_profile.json")),
123:     moderate: baselineIds(resolve(dir, "oscal/NIST_SP-800-53_rev5_MODERATE-baseline_profile.json")),
124:     high: baselineIds(resolve(dir, "oscal/NIST_SP-800-53_rev5_HIGH-baseline_profile.json")),
125:     privacy: baselineIds(resolve(dir, "oscal/NIST_SP-800-53_rev5_PRIVACY-baseline_profile.json")),
126:   };
127:   const pdf = await pdfPages(resolve(dir, "controls/NIST.SP.800-53r5.pdf"));
128:   // Control catalog (Chapter 3) begins at the first family heading.
129:   // Skip the table of contents: the catalog starts on the page holding AC-1's heading.
130:   const chapterStart = Math.max(0, pdf.findIndex((p) => p.includes("AC-1 POLICY AND PROCEDURES")) - 1);
131:   const idToLabel = new Map<string, string>();
132:   for (const g of catalog.catalog.groups) {
133:     for (const c of g.controls) {
134:       idToLabel.set(c.id, labelOf(c.props) ?? c.id.toUpperCase());
135:       for (const e of c.controls ?? []) idToLabel.set(e.id, labelOf(e.props) ?? e.id.toUpperCase());
136:     }
137:   }
138:
139:   const releaseVersion = catalog.catalog.metadata.version;
140:   const familyPage = (index: number, title: string) => {
141:     const heading = `3.${index + 1} ${title.toUpperCase()}`;
142:     const i = pdf.findIndex((p, pi) => pi >= chapterStart && p.includes(heading));
143:     return i >= 0 ? i + 1 : undefined;
144:   };
145:   const nodes: RequirementNode[] = [];
146:   let pageCursor = Math.max(0, chapterStart);
147:   const findControlPage = (label: string, title: string) => {
148:     const heading = `${label} ${title.toUpperCase()}`;
149:     for (let i = pageCursor; i < pdf.length; i++) {
150:       if (pdf[i]!.includes(heading)) {
151:         pageCursor = i;
152:         return i + 1;
153:       }
154:     }
155:     return undefined;
156:   };
157:
158:   const controlNode = (c: Control, parentId: string, depth: number, order: number, basePage?: number, baseTitle?: string): RequirementNode => {
159:     const label = labelOf(c.props) ?? c.id.toUpperCase();
160:     const params = new Map((c.params ?? []).map((p) => [p.id, p]));
161:     const statementPart = c.parts?.find((p) => p.name === "statement");
162:     const statementLines = renderStatement(statementPart, params);
163:     const topItems = (statementPart?.parts ?? []).filter((p) => p.name === "item").map((p) => `${labelOf(p.props) ?? ""} ${renderProse(p.prose ?? "", params)}`.trim());
164:     const guidance = c.parts?.find((p) => p.name === "guidance")?.prose;
165:     const objective = c.parts?.find((p) => p.name === "assessment-objective");
166:     const memberOf = Object.entries(baselines).filter(([, ids]) => ids.has(c.id)).map(([b]) => b);
167:     const related = (c.links ?? []).filter((l) => l.rel === "related").map((l) => idToLabel.get(l.href.replace(/^#/, "")) ?? l.href.replace(/^#/, "").toUpperCase());
168:     const implementationLevel = (c.props ?? []).filter((p) => p.name === "implementation-level").map((p) => p.value);
169:     const enhancement = c.class === "SP800-53-enhancement";
170:     const page = enhancement ? basePage : findControlPage(label, c.title);
171:     return {
172:       id: `${SP80053_ID}:${label}`,
173:       frameworkId: SP80053_ID,
174:       code: label,
175:       kind: enhancement ? "enhancement" : "control",
176:       parentId,
177:       depth,
178:       order,
179:       title: enhancement && baseTitle ? `${c.title}` : c.title,
180:       text: statementLines.join("\n") || c.title,
181:       guidance: guidance ? stripLinks(guidance) : undefined,
182:       attributes: {
183:         oscalId: c.id,
184:         baselines: memberOf,
185:         statementItems: topItems,
186:         objectives: leafObjectives(objective, params),
187:         methods: methods(c),
188:         related,
189:         implementationLevel,
190:         contributesToAssurance: (c.props ?? []).some((p) => p.name === "contributes-to-assurance" && p.value === "true"),
191:         parameters: (c.params ?? []).filter((p) => p.id.includes("_odp")).length,
192:       },
193:       // Controls added after the 2020 PDF (e.g. SA-24, IA-13) are cited from the OSCAL release.
194:       citation: page ? { documentId: PDF_DOC, locator: `${label} ${c.title}`, page } : { documentId: CATALOG_DOC, locator: `${label} ${c.title} (Release ${releaseVersion})` },
195:       assessable: true,
196:     };
197:   };
198:
199:   catalog.catalog.groups.forEach((g, gi) => {
200:     const familyCode = labelOf(g.props) ?? g.id.toUpperCase();
201:     const familyId = `${SP80053_ID}:${familyCode}`;
202:     nodes.push({
203:       id: familyId,
204:       frameworkId: SP80053_ID,
205:       code: familyCode,
206:       kind: "family",
207:       parentId: null,
208:       depth: 0,
209:       order: gi,
210:       title: g.title,
211:       text: `${g.title} (${familyCode}) control family`,
212:       citation: familyPage(gi, g.title) ? { documentId: PDF_DOC, locator: `3.${gi + 1} ${g.title}`, page: familyPage(gi, g.title) } : { documentId: CATALOG_DOC, locator: `Family ${familyCode}` },
213:       assessable: false,
214:     });
215:     let order = 0;
216:     for (const c of g.controls) {
217:       if (isWithdrawn(c)) continue;
218:       const base = controlNode(c, familyId, 1, order++);
219:       nodes.push(base);
220:       let eo = 0;
221:       for (const e of c.controls ?? []) {
222:         if (isWithdrawn(e)) continue;
223:         nodes.push(controlNode(e, base.id, 2, eo++, base.citation.page, c.title));
224:       }
225:     }
226:   });
227:
228:   return {
229:     framework: {
230:       id: SP80053_ID,
231:       family: "rmf",
232:       shortName: "SP 800-53 Rev. 5",
233:       badge: "SP 800-53",
234:       name: "NIST SP 800-53 Rev. 5 — Security and Privacy Controls for Information Systems and Organizations (Release 5.2.0)",
235:       publisher: "National Institute of Standards and Technology",
236:       version: catalog.catalog.metadata.version,
237:       published: "2025-08-26",
238:       description:
239:         "The comprehensive catalog of security and privacy controls used by the NIST Risk Management Framework: 20 families, base controls and enhancements with SP 800-53A assessment objectives and SP 800-53B LOW / MODERATE / HIGH / PRIVACY baselines.",
240:       levels: [
241:         { kind: "family", label: "Family", pluralLabel: "Families" },
242:         { kind: "control", label: "Control", pluralLabel: "Controls" },
243:         { kind: "enhancement", label: "Enhancement", pluralLabel: "Enhancements" },
244:       ],
245:       assessableKind: "control",
246:       sources: [{ documentId: CATALOG_DOC }, { documentId: PDF_DOC }, { documentId: "nist-sp-800-53b" }, { documentId: "nist-sp-800-53ar5" }],
247:       unitLabel: "control",
248:       unitLabelPlural: "controls",
249:     },
250:     nodes,
251:   };
252: }

FILE packages/frameworks/src/ingest/state-laws.ts SHA256 58e881f36d88bc1685d087ea773572cb43e1dc534f0015c0999a50ca3d2fdd29
1: /**
2:  * U.S. state AI laws as a framework of the "law" family:
3:  *
4:  *   jurisdiction (Texas, California, …) → law → obligation (the unit of work)
5:  *
6:  * Built from corpus/us-state-ai-laws/obligations.json (see STRUCTURE.md in that
7:  * folder). Obligation text is quoted from the enrolled statute or the adopted
8:  * regulation with its section and page. Titles and suggested evidence are
9:  * Visua's short summaries, labeled as such. Nothing here is legal advice.
10:  */
11: import { existsSync, readFileSync } from "node:fs";
12: import { resolve } from "node:path";
13: import type { FrameworkGraph, RequirementNode } from "@visua/core";
14: import { LAW_SCALE } from "@visua/core";
15: import { CORPUS_DIR } from "../paths.ts";
16:
17: export const STATE_LAWS_ID = "us-state-ai-laws";
18:
19: interface LawSource {
20:   retrieved: string;
21:   disclaimer: string;
22:   laws: {
23:     id: string;
24:     jurisdiction: string;
25:     title: string;
26:     shortName?: string;
27:     citation: string;
28:     status: string;
29:     statusNote?: string;
30:     enacted?: string | null;
31:     effective?: string | null;
32:     sunset?: string | null;
33:     appliesTo: { role: string; condition: string }[];
34:     enforcement?: Record<string, unknown>;
35:     safeHarbors?: { text: string; section: string; references?: string[]; note?: string }[];
36:     sources: { documentId: string; section?: string }[];
37:     obligations: {
38:       id: string;
39:       title: string;
40:       text: string;
41:       section: string;
42:       documentId: string;
43:       page?: number | null;
44:       pageEnd?: number | null;
45:       role: string;
46:       effective?: string | null;
47:       until?: string | null;
48:       category: string;
49:       evidence?: string[];
50:       notes?: string;
51:     }[];
52:   }[];
53: }
54:
55: const STATE_CODES: Record<string, string> = {
56:   Alabama: "AL", Alaska: "AK", Arizona: "AZ", Arkansas: "AR", California: "CA", Colorado: "CO", Connecticut: "CT", Delaware: "DE",
57:   Florida: "FL", Georgia: "GA", Hawaii: "HI", Idaho: "ID", Illinois: "IL", Indiana: "IN", Iowa: "IA", Kansas: "KS", Kentucky: "KY",
58:   Louisiana: "LA", Maine: "ME", Maryland: "MD", Massachusetts: "MA", Michigan: "MI", Minnesota: "MN", Mississippi: "MS", Missouri: "MO",
59:   Montana: "MT", Nebraska: "NE", Nevada: "NV", "New Hampshire": "NH", "New Jersey": "NJ", "New Mexico": "NM", "New York": "NY",
60:   "New York City": "NYC", "North Carolina": "NC", "North Dakota": "ND", Ohio: "OH", Oklahoma: "OK", Oregon: "OR", Pennsylvania: "PA",
61:   "Rhode Island": "RI", "South Carolina": "SC", "South Dakota": "SD", Tennessee: "TN", Texas: "TX", Utah: "UT", Vermont: "VT",
62:   Virginia: "VA", Washington: "WA", "West Virginia": "WV", Wisconsin: "WI", Wyoming: "WY",
63: };
64:
65: const BILL = /\b(H\.?\s?B\.?|S\.?\s?B\.?|A\.?\s?B\.?|Local Law)\s*(\d+(?:-\d+)?)/i;
66: const billCode = (text: string) => {
67:   const m = BILL.exec(text);
68:   return m ? `${m[1]!.replace(/[.\s]/g, "").toUpperCase().replace("LOCALLAW", "LL")}${m[2]}` : undefined;
69: };
70:
71: /**
72:  * Codes for laws whose rules below would give a long or ambiguous code: the name the
73:  * law is known by, or the bill plus the act it enacts when one bill enacts two acts.
74:  * Codes are node ids, so they must never change once published.
75:  */
76: const CODE_OVERRIDES: Record<string, string> = {
77:   "ny-raise-act": "NY-RAISE",
78:   "ny-ai-companion-models": "NY-AI-COMPANION",
79:   "ny-safe-by-design-ai-companions": "NY-SAFE-BY-DESIGN",
80:   "il-ai-video-interview": "IL-AIVIA",
81:   "me-ai-chatbot-disclosure": "ME-CHATBOT",
82:   "ut-content-provenance": "UT-HB276-PROVENANCE",
83:   "ut-digital-voyeurism": "UT-HB276-VOYEURISM",
84: };
85:
86: /**
87:  * Short, stable law codes: an override, else a single-acronym id ("tx-traiga" →
88:  * TX-TRAIGA), else the bill in the title ("(SB 243)" → CA-SB243), else a regulation's
89:  * acronym ("ca-ccpa-admt-regs" → CA-CCPA-ADMT), else the first bill in the citation.
90:  */
91: export function lawCode(law: { id: string; title: string; citation: string; shortName?: string; jurisdiction: string }): string {
92:   const state = STATE_CODES[law.jurisdiction] ?? law.id.split("-")[0]!.toUpperCase();
93:   if (CODE_OVERRIDES[law.id]) return CODE_OVERRIDES[law.id]!;
94:   if (law.shortName) return `${state}-${law.shortName.replace(/\s+/g, "").toUpperCase()}`;
95:   const parts = law.id.split("-").slice(1);
96:   if (parts.length === 1) return `${state}-${parts[0]!.toUpperCase()}`;
97:   const titled = /\(([^)]*)\)/.exec(law.title)?.[1];
98:   const fromTitle = titled ? billCode(titled) : undefined;
99:   if (fromTitle) return `${state}-${fromTitle}`;
100:   if (parts.at(-1) === "regs") return `${state}-${parts.slice(0, -1).join("-").toUpperCase()}`;
101:   const fromCitation = billCode(law.citation);
102:   if (fromCitation) return `${state}-${fromCitation}`;
103:   return `${state}-${parts.join("-").toUpperCase()}`;
104: }
105:
106: /** Role tokens an obligation applies to ("developer, deployer" → ["developer", "deployer"]). */
107: export const roleTokens = (role: string) =>
108:   role
109:     .split(/[,/]| and /)
110:     .map((r) => r.trim().toLowerCase().replace(/\s+/g, "-"))
111:     .filter(Boolean);
112:
113: export function ingestStateLaws(corpusDir = CORPUS_DIR): FrameworkGraph | undefined {
114:   const file = resolve(corpusDir, "us-state-ai-laws", "obligations.json");
115:   if (!existsSync(file)) return undefined;
116:   const src = JSON.parse(readFileSync(file, "utf8")) as LawSource;
117:   const fw = STATE_LAWS_ID;
118:   const nodes: RequirementNode[] = [];
119:   const jurisdictions = [...new Set(src.laws.map((l) => l.jurisdiction))].sort((a, b) => a.localeCompare(b));
120:   const codes = new Set<string>();
121:   for (const [ji, j] of jurisdictions.entries()) {
122:     const jcode = STATE_CODES[j] ?? j.slice(0, 2).toUpperCase();
123:     const jid = `${fw}:${jcode}`;
124:     const laws = src.laws.filter((l) => l.jurisdiction === j);
125:     nodes.push({
126:       id: jid,
127:       frameworkId: fw,
128:       code: jcode,
129:       kind: "jurisdiction",
130:       parentId: null,
131:       depth: 0,
132:       order: ji,
133:       title: j,
134:       text: `${laws.length} AI law${laws.length === 1 ? "" : "s"} or regulation${laws.length === 1 ? "" : "s"} tracked for ${j}.`,
135:       assessable: false,
136:       citation: { documentId: laws[0]!.sources[0]?.documentId ?? laws[0]!.obligations[0]!.documentId, locator: j },
137:       attributes: { label: jcode },
138:     });
139:     for (const [li, law] of laws.entries()) {
140:       const code = lawCode(law);
141:       // Codes are node ids: two laws must never share one (add an override instead).
142:       if (codes.has(code)) throw new Error(`State AI laws: ${law.id} would reuse the code ${code}; add it to CODE_OVERRIDES`);
143:       codes.add(code);
144:       const lid = `${fw}:${code}`;
145:       nodes.push({
146:         id: lid,
147:         frameworkId: fw,
148:         code,
149:         kind: "law",
150:         parentId: jid,
151:         depth: 1,
152:         order: li,
153:         title: law.title,
154:         text: `${law.citation}. Status: ${law.status}${law.effective ? `, effective ${law.effective}` : ""}${law.sunset ? `, sunsets ${law.sunset}` : ""}.`,
155:         assessable: false,
156:         citation: { documentId: law.sources[0]?.documentId ?? law.obligations[0]!.documentId, locator: law.citation },
157:         attributes: {
158:           label: code,
159:           lawId: law.id,
160:           jurisdiction: j,
161:           status: law.status,
162:           statusNote: law.statusNote,
163:           enacted: law.enacted ?? undefined,
164:           effective: law.effective ?? undefined,
165:           sunset: law.sunset ?? undefined,
166:           // One entry per role token ("developer, deployer" defines both), in the obligations' vocabulary.
167:           appliesTo: law.appliesTo.flatMap((a) => roleTokens(a.role).map((role) => ({ role, condition: a.condition }))),
168:           enforcement: law.enforcement,
169:           safeHarbors: law.safeHarbors ?? [],
170:           sources: law.sources,
171:         },
172:       });
173:       for (const [oi, o] of law.obligations.entries()) {
174:         const ocode = `${code}-${String(oi + 1).padStart(2, "0")}`;
175:         nodes.push({
176:           id: `${fw}:${ocode}`,
177:           frameworkId: fw,
178:           code: ocode,
179:           kind: "obligation",
180:           parentId: lid,
181:           depth: 2,
182:           order: oi,
183:           title: o.title,
184:           text: o.text,
185:           assessable: true,
186:           citation: { documentId: o.documentId, locator: o.section, page: o.page ?? undefined },
187:           attributes: {
188:             label: ocode,
189:             obligationId: o.id,
190:             lawId: law.id,
191:             jurisdiction: j,
192:             section: o.section,
193:             role: o.role,
194:             roles: roleTokens(o.role),
195:             category: o.category,
196:             effective: o.effective ?? law.effective ?? undefined,
197:             until: o.until ?? undefined,
198:             pageEnd: o.pageEnd ?? undefined,
199:             suggestedEvidence: o.evidence ?? [],
200:             notes: o.notes,
201:           },
202:         });
203:       }
204:     }
205:   }
206:   const obligations = nodes.filter((n) => n.assessable).length;
207:   return {
208:     framework: {
209:       id: fw,
210:       family: "law",
211:       shortName: "State AI laws",
212:       badge: "State AI laws",
213:       name: "U.S. state AI laws",
214:       publisher: "State legislatures and agencies (compiled by Visua)",
215:       version: src.retrieved,
216:       published: src.retrieved,
217:       description: `${src.laws.length} state AI laws and regulations with ${obligations} obligations, quoted from the enrolled statutes and adopted regulations.`,
218:       levels: [
219:         { kind: "jurisdiction", label: "Jurisdiction", pluralLabel: "Jurisdictions" },
220:         { kind: "law", label: "Law", pluralLabel: "Laws" },
221:         { kind: "obligation", label: "Obligation", pluralLabel: "Obligations" },
222:       ],
223:       assessableKind: "obligation",
224:       sources: [...new Set(src.laws.flatMap((l) => l.sources.map((s) => s.documentId)))].map((documentId) => ({ documentId })),
225:       unitLabel: "obligation",
226:       unitLabelPlural: "obligations",
227:       contentNotice: `${src.disclaimer} Obligation text is quoted from the official statute or regulation with its section; titles and suggested evidence are Visua summaries. Laws change: check the status and effective dates, and consult counsel.`,
228:     },
229:     nodes,
230:   };
231: }
232:
233: /** The level scale obligations use (re-exported for the ingest report). */
234: export const STATE_LAW_SCALE = LAW_SCALE;

FILE packages/frameworks/src/ingest/threats.ts SHA256 904b831c34b95cd628939f1b592a7d445c7ed73fba75869fbe7a6ef2f29e52e6
1: /**
2:  * AI threat catalogs as graphs of the "threat" family, and the published links
3:  * between threats and requirements.
4:  *
5:  *   MITRE ATLAS 2026.09        tactics → techniques → sub-techniques; mitigations
6:  *   OWASP Top 10 for LLM Apps  2026 edition (current) and 2025 (superseded)
7:  *   OWASP Top 10 for Agentic Applications 2026
8:  *   NIST AI 100-2 E2025        attacker objectives → attacks
9:  *
10:  * Built from the structured extractions in corpus/ai-threats (see its
11:  * STRUCTURE.md). Links come from corpus/ai-threats/mappings.json, which keeps only
12:  * links that someone published (MITRE, OWASP, NIST final and draft publications,
13:  * and OWASP's unreviewed community crosswalk), each with its status. Threat
14:  * catalogs are never assessed: Visua views them through the linked requirements.
15:  */
16: import { existsSync, readFileSync } from "node:fs";
17: import { resolve } from "node:path";
18: import type { ExternalReference, FrameworkGraph, Mapping, MappingSet, MappingStatus, RequirementNode } from "@visua/core";
19: import { CORPUS_DIR } from "../paths.ts";
20: import { normalize80053 } from "./csf.ts";
21:
22: export const ATLAS_ID = "mitre-atlas";
23: export const OWASP_LLM_ID = "owasp-llm-top10";
24: export const OWASP_AGENTIC_ID = "owasp-agentic-top10";
25: export const AI_100_2_ID = "nist-ai-100-2";
26: export const THREAT_CATALOG_IDS = [ATLAS_ID, OWASP_LLM_ID, OWASP_AGENTIC_ID, AI_100_2_ID];
27:
28: const THREATS_DIR = resolve(CORPUS_DIR, "ai-threats");
29: const read = <T>(file: string): T | undefined => (existsSync(file) ? (JSON.parse(readFileSync(file, "utf8")) as T) : undefined);
30: const oneLine = (s: string) => s.replace(/\s+/g, " ").trim();
31: const paragraphs = (list: string[] | undefined, fallback: string) => (list?.length ? list : [fallback]).map(oneLine).join("\n\n");
32:
33: // ---------------------------------------------------------------------------
34: // MITRE ATLAS
35: // ---------------------------------------------------------------------------
36:
37: interface AtlasSource {
38:   source: { documentId: string; version: string; released: string };
39:   matrix: { tacticOrder: string[] };
40:   tactics: { id: string; name: string; description: string }[];
41:   techniques: { id: string; name: string; description: string; tactics: string[]; parent: string | null; maturity?: string; platforms?: string[] }[];
42:   mitigations: { id: string; name: string; description: string; categories?: string[]; lifecyclePhases?: string[] }[];
43: }
44:
45: export const ATLAS_MITIGATIONS = "AML.MITIGATIONS";
46:
47: function atlasGraph(dir: string): FrameworkGraph | undefined {
48:   const src = read<AtlasSource>(resolve(dir, "atlas.json"));
49:   if (!src) return undefined;
50:   const fw = ATLAS_ID;
51:   const doc = src.source.documentId;
52:   const order = new Map(src.matrix.tacticOrder.map((id, i) => [id, i]));
53:   const rank = (id: string) => order.get(id) ?? Number.MAX_SAFE_INTEGER;
54:   const tactics = [...src.tactics].sort((a, b) => rank(a.id) - rank(b.id));
55:   const parents = src.techniques.filter((t) => !t.parent);
56:   const subs = src.techniques.filter((t) => t.parent);
57:   const nodes: RequirementNode[] = [];
58:   for (const [i, t] of tactics.entries()) {
59:     nodes.push({ id: `${fw}:${t.id}`, frameworkId: fw, code: t.id, kind: "tactic", parentId: null, depth: 0, order: i, title: t.name, text: oneLine(t.description), assessable: false, citation: { documentId: doc, locator: t.id }, attributes: { label: t.name } });
60:   }
61:   // A technique can serve several tactics: the tree places it under the first in matrix
62:   // order, and `tactics` keeps them all (the matrix view shows it in every column).
63:   for (const [i, t] of parents.entries()) {
64:     const tacticIds = [...t.tactics].sort((a, b) => rank(a) - rank(b));
65:     nodes.push({
66:       id: `${fw}:${t.id}`,
67:       frameworkId: fw,
68:       code: t.id,
69:       kind: "technique",
70:       parentId: tacticIds[0] ? `${fw}:${tacticIds[0]}` : null,
71:       depth: 1,
72:       order: i,
73:       title: t.name,
74:       text: oneLine(t.description),
75:       assessable: true,
76:       citation: { documentId: doc, locator: t.id },
77:       attributes: { label: t.id.replace("AML.", ""), tactics: tacticIds.map((id) => `${fw}:${id}`), maturity: t.maturity, platforms: t.platforms },
78:     });
79:   }
80:   for (const [i, t] of subs.entries()) {
81:     nodes.push({
82:       id: `${fw}:${t.id}`,
83:       frameworkId: fw,
84:       code: t.id,
85:       kind: "sub-technique",
86:       parentId: `${fw}:${t.parent}`,
87:       depth: 2,
88:       order: i,
89:       title: t.name,
90:       text: oneLine(t.description),
91:       assessable: true,
92:       citation: { documentId: doc, locator: t.id },
93:       attributes: { label: t.id.replace("AML.", ""), tactics: t.tactics.map((id) => `${fw}:${id}`), maturity: t.maturity, platforms: t.platforms },
94:     });
95:   }
96:   nodes.push({
97:     id: `${fw}:${ATLAS_MITIGATIONS}`,
98:     frameworkId: fw,
99:     code: ATLAS_MITIGATIONS,
100:     kind: "mitigation-group",
101:     parentId: null,
102:     depth: 0,
103:     order: tactics.length,
104:     title: "Mitigations",
105:     text: `The ${src.mitigations.length} ATLAS mitigations: security concepts and classes of technologies that can prevent a technique or sub-technique from succeeding.`,
106:     assessable: false,
107:     citation: { documentId: doc, locator: "mitigations" },
108:     attributes: { label: "Mitigations" },
109:   });
110:   for (const [i, m] of src.mitigations.entries()) {
111:     nodes.push({
112:       id: `${fw}:${m.id}`,
113:       frameworkId: fw,
114:       code: m.id,
115:       kind: "mitigation",
116:       parentId: `${fw}:${ATLAS_MITIGATIONS}`,
117:       depth: 1,
118:       order: i,
119:       title: m.name,
120:       text: oneLine(m.description),
121:       assessable: false,
122:       citation: { documentId: doc, locator: m.id },
123:       attributes: { label: m.id.replace("AML.", ""), categories: m.categories, lifecyclePhases: m.lifecyclePhases },
124:     });
125:   }
126:   return {
127:     framework: {
128:       id: fw,
129:       family: "threat",
130:       shortName: "MITRE ATLAS",
131:       badge: "ATLAS",
132:       name: "MITRE ATLAS (Adversarial Threat Landscape for Artificial-Intelligence Systems)",
133:       publisher: "The MITRE Corporation",
134:       version: src.source.version,
135:       published: src.source.released,
136:       description: `Adversary tactics and techniques against AI systems, from real-world observations and red-team demonstrations: ${tactics.length} tactics, ${parents.length} techniques, ${subs.length} sub-techniques and ${src.mitigations.length} mitigations.`,
137:       levels: [
138:         { kind: "tactic", label: "Tactic", pluralLabel: "Tactics" },
139:         { kind: "technique", label: "Technique", pluralLabel: "Techniques" },
140:         { kind: "sub-technique", label: "Sub-technique", pluralLabel: "Sub-techniques" },
141:       ],
142:       assessableKind: "technique",
143:       sources: [{ documentId: doc }],
144:       unitLabel: "technique",
145:       unitLabelPlural: "techniques",
146:       contentNotice: `MITRE ATLAS™ data ${src.source.version} © 2021–2026 The MITRE Corporation, used under the Apache License 2.0 (corpus/ai-threats/mitre-atlas/LICENSE). Modified by Visua: restructured into a framework graph; text unchanged. MITRE ATLAS is a trademark of The MITRE Corporation.`,
147:     },
148:     nodes,
149:   };
150: }
151:
152: // ---------------------------------------------------------------------------
153: // OWASP Top 10s
154: // ---------------------------------------------------------------------------
155:
156: interface OwaspStrategy {
157:   label: string;
158:   title?: string;
159:   text: string;
160:   page?: number;
161: }
162:
163: interface OwaspRisk {
164:   id: string;
165:   edition: string;
166:   key: string;
167:   title: string;
168:   description: string;
169:   descriptionParagraphs?: string[];
170:   preventionIntro?: string[];
171:   preventionStrategies?: OwaspStrategy[];
172:   page?: number;
173:   pageEnd?: number;
174:   previousEdition?: { key: string; basis: string } | null;
175: }
176:
177: interface OwaspLicense {
178:   license: string;
179:   licenseUrl: string;
180:   attribution: string;
181:   changes: string;
182: }
183:
184: interface OwaspLlmSource {
185:   source: OwaspLicense & { catalog: string; currentEdition: string; editions: { edition: string; status: string; documentId: string; title: string; released: string }[] };
186:   risks: OwaspRisk[];
187: }
188:
189: interface OwaspAgenticSource {
190:   source: OwaspLicense & { catalog: string; edition: string; released: string; documentId: string };
191:   risks: OwaspRisk[];
192: }
193:
194: /** Node codes cannot contain ":" — the current edition keeps the bare id ("LLM01"), older ones gain the year ("LLM01-2025"). */
195: export const owaspLlmCode = (key: string, current: string) => {
196:   const [id, edition] = key.split(":");
197:   return !edition || edition === current ? id! : `${id}-${edition}`;
198: };
199:
200: const owaspNotice = (s: OwaspLicense) => `${s.attribution} ${s.changes}`;
201:
202: const owaspRiskNode = (fw: string, code: string, parentId: string, order: number, r: OwaspRisk, documentId: string, extra: Record<string, unknown>): RequirementNode => ({
203:   id: `${fw}:${code}`,
204:   frameworkId: fw,
205:   code,
206:   kind: "risk",
207:   parentId,
208:   depth: 1,
209:   order,
210:   title: r.title,
211:   text: paragraphs(r.descriptionParagraphs, r.description),
212:   assessable: true,
213:   citation: { documentId, locator: r.key, page: r.page },
214:   attributes: {
215:     label: r.key,
216:     key: r.key,
217:     edition: r.edition,
218:     pageEnd: r.pageEnd,
219:     preventionIntro: r.preventionIntro?.map(oneLine),
220:     preventionStrategies: (r.preventionStrategies ?? []).map((p) => ({ label: p.label, title: p.title, text: oneLine(p.text), page: p.page })),
221:     ...extra,
222:   },
223: });
224:
225: function owaspLlmGraph(dir: string): FrameworkGraph | undefined {
226:   const src = read<OwaspLlmSource>(resolve(dir, "owasp-llm-top10.json"));
227:   if (!src) return undefined;
228:   const fw = OWASP_LLM_ID;
229:   const current = src.source.currentEdition;
230:   const editions = [...src.source.editions].sort((a, b) => b.edition.localeCompare(a.edition));
231:   // Edition lineage in both directions: 2026 entries name their 2025 predecessor.
232:   const next = new Map<string, string>();
233:   for (const r of src.risks) if (r.previousEdition) next.set(r.previousEdition.key, r.key);
234:   const nodes: RequirementNode[] = [];
235:   for (const [ei, e] of editions.entries()) {
236:     const root = `${fw}:EDITION-${e.edition}`;
237:     const isCurrent = e.edition === current;
238:     nodes.push({
239:       id: root,
240:       frameworkId: fw,
241:       code: `EDITION-${e.edition}`,
242:       kind: "edition",
243:       parentId: null,
244:       depth: 0,
245:       order: ei,
246:       title: isCurrent ? e.title : `${e.title} (superseded)`,
247:       text: `${e.title}, released ${e.released}.${isCurrent ? "" : ` Superseded by the ${current} edition; kept because other publications cite its identifiers.`}`,
248:       assessable: false,
249:       citation: { documentId: e.documentId },
250:       attributes: { label: e.edition, edition: e.edition, status: isCurrent ? "current" : "superseded" },
251:     });
252:     for (const [i, r] of src.risks.filter((x) => x.edition === e.edition).entries()) {
253:       const prev = r.previousEdition;
254:       const later = next.get(r.key);
255:       const node = owaspRiskNode(fw, owaspLlmCode(r.key, current), root, i, r, e.documentId, {
256:         status: isCurrent ? "current" : "superseded",
257:         previousEdition: prev ? { key: prev.key, nodeId: `${fw}:${owaspLlmCode(prev.key, current)}`, basis: prev.basis } : undefined,
258:         nextEdition: later ? { key: later, nodeId: `${fw}:${owaspLlmCode(later, current)}` } : undefined,
259:       });
260:       // Superseded entries stay for traceability but are not units of the current catalog.
261:       node.assessable = isCurrent;
262:       nodes.push(node);
263:     }
264:   }
265:   const cur = editions.find((e) => e.edition === current)!;
266:   const older = editions.filter((e) => e.edition !== current).map((e) => e.edition);
267:   return {
268:     framework: {
269:       id: fw,
270:       family: "threat",
271:       shortName: "OWASP LLM Top 10",
272:       badge: "OWASP LLM",
273:       name: "OWASP Top 10 for LLM Applications",
274:       publisher: "OWASP GenAI Security Project",
275:       version: cur.edition,
276:       published: cur.released,
277:       description: `The ten most critical security risks of applications built on large language models (${cur.edition} edition${older.length ? `; the ${older.join(", ")} edition is kept because other publications cite it` : ""}).`,
278:       levels: [
279:         { kind: "edition", label: "Edition", pluralLabel: "Editions" },
280:         { kind: "risk", label: "Risk", pluralLabel: "Risks" },
281:       ],
282:       assessableKind: "risk",
283:       sources: editions.map((e) => ({ documentId: e.documentId })),
284:       unitLabel: "risk",
285:       unitLabelPlural: "risks",
286:       contentNotice: owaspNotice(src.source),
287:     },
288:     nodes,
289:   };
290: }
291:
292: function owaspAgenticGraph(dir: string): FrameworkGraph | undefined {
293:   const src = read<OwaspAgenticSource>(resolve(dir, "owasp-agentic-top10.json"));
294:   if (!src) return undefined;
295:   const fw = OWASP_AGENTIC_ID;
296:   const doc = src.source.documentId;
297:   const root = `${fw}:EDITION-${src.source.edition}`;
298:   const nodes: RequirementNode[] = [
299:     {
300:       id: root,
301:       frameworkId: fw,
302:       code: `EDITION-${src.source.edition}`,
303:       kind: "edition",
304:       parentId: null,
305:       depth: 0,
306:       order: 0,
307:       title: `${src.source.catalog} ${src.source.edition}`,
308:       text: `${src.source.catalog} ${src.source.edition}, released ${src.source.released}.`,
309:       assessable: false,
310:       citation: { documentId: doc },
311:       attributes: { label: src.source.edition, edition: src.source.edition, status: "current" },
312:     },
313:     ...src.risks.map((r, i) => owaspRiskNode(fw, r.id, root, i, r, doc, { status: "current" })),
314:   ];
315:   return {
316:     framework: {
317:       id: fw,
318:       family: "threat",
319:       shortName: "OWASP Agentic Top 10",
320:       badge: "OWASP Agentic",
321:       name: "OWASP Top 10 for Agentic Applications",
322:       publisher: "OWASP GenAI Security Project (Agentic Security Initiative)",
323:       version: src.source.edition,
324:       published: src.source.released,
325:       description: "The ten highest-impact security risks of autonomous, tool-using AI agents.",
326:       levels: [
327:         { kind: "edition", label: "Edition", pluralLabel: "Editions" },
328:         { kind: "risk", label: "Risk", pluralLabel: "Risks" },
329:       ],
330:       assessableKind: "risk",
331:       sources: [{ documentId: doc }],
332:       unitLabel: "risk",
333:       unitLabelPlural: "risks",
334:       contentNotice: owaspNotice(src.source),
335:     },
336:     nodes,
337:   };
338: }
339:
340: // ---------------------------------------------------------------------------
341: // NIST AI 100-2 E2025
342: // ---------------------------------------------------------------------------
343:
344: interface Ai1002Source {
345:   source: { publication: { documentId: string; identifier: string; title: string; published: string } };
346:   objectives: { id: string; name: string; description: string; taxonomies: string[] }[];
347:   attacks: {
348:     id: string;
349:     name: string;
350:     objectives: { taxonomy: string; objective: string }[];
351:     taxonomies: string[];
352:     description: string;
353:     definitions?: { section: string; sectionTitle?: string; page: number; text: string; taxonomy: string }[];
354:   }[];
355: }
356:
357: function ai1002Graph(dir: string): FrameworkGraph | undefined {
358:   const src = read<Ai1002Source>(resolve(dir, "nist-ai-100-2.json"));
359:   if (!src) return undefined;
360:   const fw = AI_100_2_ID;
361:   const pub = src.source.publication;
362:   const nodes: RequirementNode[] = [];
363:   for (const [i, o] of src.objectives.entries()) {
364:     nodes.push({ id: `${fw}:${o.id}`, frameworkId: fw, code: o.id, kind: "objective", parentId: null, depth: 0, order: i, title: o.name, text: oneLine(o.description), assessable: false, citation: { documentId: pub.documentId, locator: o.id }, attributes: { label: o.name, taxonomies: o.taxonomies } });
365:   }
366:   for (const [i, a] of src.attacks.entries()) {
367:     const def = a.definitions?.[0];
368:     nodes.push({
369:       id: `${fw}:${a.id}`,
370:       frameworkId: fw,
371:       code: a.id,
372:       kind: "attack",
373:       parentId: a.objectives[0] ? `${fw}:${a.objectives[0].objective}` : null,
374:       depth: 1,
375:       order: i,
376:       title: a.name,
377:       text: oneLine(def?.text ?? a.description),
378:       assessable: true,
379:       citation: { documentId: pub.documentId, locator: def ? `Section ${def.section}` : a.id, page: def?.page },
380:       attributes: {
381:         label: a.id,
382:         taxonomies: a.taxonomies,
383:         objectives: [...new Set(a.objectives.map((o) => `${fw}:${o.objective}`))],
384:         definitions: (a.definitions ?? []).map((d) => ({ section: d.section, title: d.sectionTitle, taxonomy: d.taxonomy, page: d.page })),
385:       },
386:     });
387:   }
388:   return {
389:     framework: {
390:       id: fw,
391:       family: "threat",
392:       shortName: "NIST AI 100-2",
393:       badge: "AI 100-2",
394:       name: `${pub.identifier}: ${pub.title}`,
395:       publisher: "National Institute of Standards and Technology",
396:       version: "E2025",
397:       published: pub.published,
398:       description: `NIST's taxonomy of adversarial machine learning: ${src.attacks.length} attacks on predictive and generative AI, grouped by the attacker's objective.`,
399:       levels: [
400:         { kind: "objective", label: "Objective", pluralLabel: "Objectives" },
401:         { kind: "attack", label: "Attack", pluralLabel: "Attacks" },
402:       ],
403:       assessableKind: "attack",
404:       sources: [{ documentId: pub.documentId }],
405:       unitLabel: "attack",
406:       unitLabelPlural: "attacks",
407:     },
408:     nodes,
409:   };
410: }
411:
412: export function ingestThreatCatalogs(dir = THREATS_DIR): FrameworkGraph[] {
413:   return [atlasGraph(dir), owaspLlmGraph(dir), owaspAgenticGraph(dir), ai1002Graph(dir)].filter((g): g is FrameworkGraph => !!g);
414: }
415:
416: // ---------------------------------------------------------------------------
417: // Links
418: // ---------------------------------------------------------------------------
419:
420: interface LinkEnd {
421:   scheme: string;
422:   id: string | null;
423:   label?: string;
424:   url?: string;
425: }
426:
427: interface LinkRow {
428:   source: LinkEnd;
429:   target: LinkEnd;
430:   relationship: string;
431:   strength?: string;
432:   authority: string;
433:   status: MappingStatus;
434:   documentId: string;
435:   locator?: string;
436:   page?: number;
437:   text?: string;
438: }
439:
440: interface LinkSource {
441:   authorities: Record<string, { name: string; publisher: string; status: string }>;
442:   mappings: LinkRow[];
443: }
444:
445: /** Catalogs that appear only as link targets: shown as references, not modeled. */
446: export const EXTERNAL_SCHEMES: Record<string, string> = {
447:   "mitre-attack": "MITRE ATT&CK",
448:   cwe: "CWE",
449:   "csa-aicm": "CSA AI Controls Matrix",
450:   "owasp-aivss": "OWASP AIVSS",
451:   "owasp-genai-data-security": "OWASP GenAI Data Security Risks",
452:   "owasp-agentic-threats": "OWASP Agentic AI Threats and Mitigations",
453:   "owasp-ml-top10": "OWASP Machine Learning Security Top 10",
454:   "owasp-api-top10": "OWASP API Security Top 10",
455:   "nist-ai-600-1": "NIST AI 600-1 risk",
456: };
457:
458: const RELATIONSHIP_LABELS: Record<string, string> = {
459:   "attack-reference": "ATT&CK reference",
460:   "related-framework-mapping": "related framework mapping",
461:   "example-informative-reference": "example informative reference",
462: };
463:
464: /** Short names of the publishing authorities, for mapping-set titles and badges. */
465: const AUTHORITY_NAMES: Record<string, string> = {
466:   "mitre-atlas-2026.09": "MITRE ATLAS 2026.09",
467:   "owasp-llm-top10-2026": "OWASP LLM Top 10 2026, Appendix A",
468:   "owasp-llm-top10-2025": "OWASP LLM Top 10 2025",
469:   "owasp-agentic-top10-2026": "OWASP Agentic Top 10 2026, Appendix A",
470:   "nist-ir-8596-iprd": "NIST IR 8596 (Cyber AI Profile, draft)",
471:   "nist-cosais-outline": "NIST COSAiS outline (draft)",
472:   "nist-ai-100-2e2025": "NIST AI 100-2 E2025",
473:   "owasp-genai-crosswalk": "OWASP GenAI Security Crosswalk (unreviewed)",
474: };
475:
476: export interface ThreatLinkResult {
477:   sets: MappingSet[];
478:   /** External references by node id. */
479:   external: Map<string, ExternalReference[]>;
480:   kept: number;
481:   dropped: Record<string, number>;
482: }
483:
484: /** Published links between threats and requirements (and between threat catalogs): one mapping set per authority and pair of frameworks. */
485: export function threatLinks(exists: (nodeId: string) => boolean, dir = THREATS_DIR): ThreatLinkResult {
486:   const src = read<LinkSource>(resolve(dir, "mappings.json"));
487:   const current = read<OwaspLlmSource>(resolve(dir, "owasp-llm-top10.json"))?.source.currentEdition ?? "";
488:   const result: ThreatLinkResult = { sets: [], external: new Map(), kept: 0, dropped: {} };
489:   if (!src) return result;
490:   const nodeOf = (end: LinkEnd): string | undefined => {
491:     if (!end.id) return undefined;
492:     switch (end.scheme) {
493:       case "atlas":
494:         return `${ATLAS_ID}:${end.id}`;
495:       case "owasp-llm-top10":
496:         return `${OWASP_LLM_ID}:${owaspLlmCode(end.id, current)}`;
497:       case "owasp-agentic-top10":
498:         return `${OWASP_AGENTIC_ID}:${end.id}`;
499:       case "nist-ai-100-2":
500:         return `${AI_100_2_ID}:${end.id}`;
501:       case "nist-csf-2.0":
502:         return `nist-csf-2.0:${end.id}`;
503:       case "nist-ai-rmf":
504:         return `nist-ai-rmf:${end.id}`;
505:       case "nist-sp-800-53-r5":
506:         return `nist-sp-800-53-r5:${normalize80053(end.id)}`;
507:       default:
508:         return undefined;
509:     }
510:   };
511:   const drop = (why: string) => (result.dropped[why] = (result.dropped[why] ?? 0) + 1);
512:   const sets = new Map<string, MappingSet>();
513:   for (const row of src.mappings) {
514:     const authority = AUTHORITY_NAMES[row.authority] ?? src.authorities[row.authority]?.name ?? row.authority;
515:     const label = RELATIONSHIP_LABELS[row.relationship] ?? row.relationship.replace(/-/g, " ");
516:     const from = nodeOf(row.source);
517:     if (!from || !exists(from)) {
518:       drop(from ? `unknown source ${from}` : `unmodeled source scheme ${row.source.scheme}`);
519:       continue;
520:     }
521:     const schemeName = EXTERNAL_SCHEMES[row.target.scheme];
522:     if (schemeName) {
523:       const refs = result.external.get(from) ?? [];
524:       if (!refs.some((r) => r.scheme === row.target.scheme && r.id === row.target.id && r.label === row.target.label && r.authority === authority)) {
525:         refs.push({
526:           scheme: row.target.scheme,
527:           schemeName,
528:           id: row.target.id,
529:           ...(row.target.label ? { label: row.target.label } : {}),
530:           ...(row.target.url ? { url: row.target.url } : {}),
531:           relationship: label,
532:           ...(row.strength ? { strength: row.strength } : {}),
533:           authority,
534:           status: row.status,
535:           citation: { documentId: row.documentId, locator: row.locator, page: row.page },
536:         });
537:         result.external.set(from, refs);
538:       }
539:       continue;
540:     }
541:     const to = nodeOf(row.target);
542:     if (!to || !exists(to)) {
543:       drop(to ? `unknown target ${to}` : `unmodeled target scheme ${row.target.scheme}`);
544:       continue;
545:     }
546:     const sourceFramework = from.slice(0, from.indexOf(":"));
547:     const targetFramework = to.slice(0, to.indexOf(":"));
548:     const id = `threat--${row.authority}--${sourceFramework}--${targetFramework}`;
549:     let set = sets.get(id);
550:     if (!set) {
551:       set = { id, title: authority, sourceFramework, targetFramework, authority, status: row.status, mappings: [] };
552:       sets.set(id, set);
553:     }
554:     if (set.mappings.some((m) => m.source === from && m.target === to)) continue;
555:     const mapping: Mapping = {
556:       source: from,
557:       target: to,
558:       relationship: "related-to",
559:       origin: { documentId: row.documentId, locator: row.locator, page: row.page, authority },
560:       label,
561:       status: row.status,
562:       ...(row.strength ? { strength: row.strength } : {}),
563:       ...(row.relationship === "mitigates" && row.text ? { note: oneLine(row.text) } : {}),
564:     };
565:     set.mappings.push(mapping);
566:     result.kept++;
567:   }
568:   result.sets = [...sets.values()].sort((a, b) => a.id.localeCompare(b.id));
569:   return result;
570: }

FILE packages/frameworks/src/ingest/tsc-mappings.ts SHA256 486e4fb1a3fcd30c23b6de45dd4f2057eaa3d1e7e4e6aaf6e6058deef2fd4559
1: /**
2:  * AICPA Trust Services Criteria mappings (ingest-time only; reads .xlsx).
3:  *
4:  *  - TSC 2017 (rev. 2022) → NIST SP 800-53 Rev. 5: AICPA's current workbook,
5:  *    which lists SP 800-53 requirements as framework-specific points of focus
6:  *    for each criterion → "control supports criterion".
7:  *  - TSC 2017 → NIST CSF v1.1 (AICPA), carried forward to CSF 2.0 through
8:  *    NIST's official OLIR CSF v1.1 → v2.0 crosswalk. Composed mappings are
9:  *    labelled as such and treated as weaker ("related-to").
10:  *
11:  * Both workbooks are AICPA works: the resulting mapping files stay local
12:  * (git-ignored) like the rest of the AICPA corpus.
13:  */
14: import { existsSync } from "node:fs";
15: import { resolve } from "node:path";
16: import ExcelJS from "exceljs";
17: import type { Mapping, MappingSet } from "@visua/core";
18: import { CORPUS_DIR } from "../paths.ts";
19: import { TSC_ID } from "./tsc.ts";
20:
21: const AICPA_80053 = "aicpa-soc2/mappings/tsc-2022-to-nist-sp800-53r5.xlsx";
22: const AICPA_CSF11 = "aicpa-soc2/mappings/tsc-2017-to-nist-csf-v1.1.xlsx";
23: const OLIR_CSF11_TO_20 = "nist-csf-2.0/mappings/CSFv1-1_to_CSFv2-0_CROSSWALK_20240326.xlsx";
24:
25: const CRITERION = /^(CC\d|A1|PI1|C1|P\d)\.\d+$/;
26:
27: function cellText(v: ExcelJS.CellValue): string {
28:   if (v === null || v === undefined) return "";
29:   if (typeof v === "object") {
30:     if ("richText" in v && Array.isArray(v.richText)) return v.richText.map((r) => r.text).join("");
31:     if ("text" in v && typeof v.text === "string") return v.text;
32:     if ("result" in v) return cellText(v.result as ExcelJS.CellValue);
33:   }
34:   return String(v);
35: }
36:
37: async function rows(path: string, sheet: string | number): Promise<string[][]> {
38:   const wb = new ExcelJS.Workbook();
39:   await wb.xlsx.readFile(path);
40:   const ws = typeof sheet === "number" ? wb.worksheets[sheet] : wb.getWorksheet(sheet);
41:   if (!ws) throw new Error(`Worksheet '${sheet}' not found in ${path}`);
42:   const out: string[][] = [];
43:   ws.eachRow({ includeEmpty: false }, (row) => {
44:     const values = row.values as ExcelJS.CellValue[];
45:     out.push(values.slice(1).map((v) => cellText(v).trim()));
46:   });
47:   return out;
48: }
49:
50: /** "PS-6a" → "PS-6"; "AC-2(1)(a)" → "AC-2(1)"; "SA-08(21)" → "SA-8(21)". */
51: export function normalize80053(ref: string): string | null {
52:   const m = /^([A-Z]{2})-0*(\d+)\s*(?:\(0*(\d+)\))?/.exec(ref.trim());
53:   if (!m) return null;
54:   return `${m[1]}-${m[2]}${m[3] ? `(${m[3]})` : ""}`;
55: }
56:
57: export async function aicpaTscMappingSets(exists: (id: string) => boolean): Promise<{ sets: MappingSet[]; report: Record<string, number> }> {
58:   const sets: MappingSet[] = [];
59:   const report: Record<string, number> = {};
60:
61:   const p80053 = resolve(CORPUS_DIR, AICPA_80053);
62:   if (existsSync(p80053)) {
63:     const mappings: Mapping[] = [];
64:     const seen = new Set<string>();
65:     let skipped = 0;
66:     for (const r of await rows(p80053, "NIST 800-53 as Points of Focus")) {
67:       const criterion = r[0] ?? "";
68:       if (!CRITERION.test(criterion) || !r[1]) continue;
69:       const control = normalize80053(r[1]);
70:       const source = control ? `nist-sp-800-53-r5:${control}` : "";
71:       const target = `${TSC_ID}:${criterion}`;
72:       if (!control || !exists(source) || !exists(target)) {
73:         skipped++;
74:         continue;
75:       }
76:       const key = `${source}|${target}`;
77:       if (seen.has(key)) continue;
78:       seen.add(key);
79:       mappings.push({ source, target, relationship: "supports", origin: { documentId: "map-tsc2022-nist-sp800-53r5", locator: `${criterion} ↔ ${r[1]}`, authority: "AICPA — TSC 2017 (rev. 2022) to NIST SP 800-53 Rev. 5 mapping" } });
80:     }
81:     sets.push({ id: "sp-800-53-r5--tsc-2017", title: "SP 800-53 Rev. 5 controls supporting SOC 2 criteria (AICPA mapping)", sourceFramework: "nist-sp-800-53-r5", targetFramework: TSC_ID, authority: "AICPA", mappings });
82:     report["sp-800-53-r5--tsc-2017"] = mappings.length;
83:     report["sp-800-53-r5--tsc-2017:skipped"] = skipped;
84:   }
85:
86:   const pCsf11 = resolve(CORPUS_DIR, AICPA_CSF11);
87:   const pOlir = resolve(CORPUS_DIR, OLIR_CSF11_TO_20);
88:   if (existsSync(pCsf11) && existsSync(pOlir)) {
89:     // NIST OLIR: focal = CSF 2.0 element, reference = CSF 1.1 element.
90:     const v11to20 = new Map<string, Set<string>>();
91:     for (const r of await rows(pOlir, "Relationships")) {
92:       const v20 = r[0] ?? "";
93:       const v11 = r[2] ?? "";
94:       if (!/^[A-Z]{2}\.[A-Z]{2}-\d{2}$/.test(v20) || !/^[A-Z]{2}\.[A-Z]{2}-\d+$/.test(v11)) continue;
95:       const set = v11to20.get(v11) ?? new Set<string>();
96:       set.add(v20);
97:       v11to20.set(v11, set);
98:     }
99:     const mappings: Mapping[] = [];
100:     const seen = new Set<string>();
101:     let current = "";
102:     let unresolved = 0;
103:     for (const r of await rows(pCsf11, "TS to NIST CSF")) {
104:       if (CRITERION.test(r[0] ?? "")) current = r[0]!;
105:       const refs = (r[3] ?? "").split(/[\s,;]+/).filter((x) => /^[A-Z]{2}\.[A-Z]{2}-\d+$/.test(x));
106:       if (!current) continue;
107:       for (const v11 of refs) {
108:         const targets = v11to20.get(v11);
109:         if (!targets?.size) {
110:           unresolved++;
111:           continue;
112:         }
113:         for (const v20 of targets) {
114:           const source = `nist-csf-2.0:${v20}`;
115:           const target = `${TSC_ID}:${current}`;
116:           const key = `${source}|${target}`;
117:           if (seen.has(key) || !exists(source) || !exists(target)) continue;
118:           seen.add(key);
119:           mappings.push({ source, target, relationship: "related-to", origin: { documentId: "map-tsc2017-nist-csf-v1.1", locator: `${current} ↔ CSF 1.1 ${v11} → CSF 2.0 ${v20} (via NIST OLIR v1.1→v2.0)`, authority: "AICPA TSC→CSF v1.1 mapping, carried to CSF 2.0 via NIST's OLIR crosswalk (composed)" } });
120:         }
121:       }
122:     }
123:     sets.push({ id: "csf-2.0--tsc-2017", title: "CSF 2.0 outcomes related to SOC 2 criteria (AICPA → CSF 1.1, carried to 2.0 via NIST OLIR)", sourceFramework: "nist-csf-2.0", targetFramework: TSC_ID, authority: "AICPA + NIST OLIR (composed)", mappings });
124:     report["csf-2.0--tsc-2017"] = mappings.length;
125:     report["csf-2.0--tsc-2017:unresolved-csf-1.1-refs"] = unresolved;
126:   }
127:   return { sets, report };
128: }

FILE packages/frameworks/src/ingest/tsc-skeleton.ts SHA256 e7e0d834db010fa00da24ad767a366781e728b4cadba6e06e92d2c2635f48ecf
1: /**
2:  * Structure of the AICPA 2017 Trust Services Criteria and DC 200 description
3:  * criteria — identifiers, series, categories and COSO principle numbers — with
4:  * short titles and plain-language summaries written by Visua.
5:  *
6:  * The official criterion text, points of focus and description criteria are
7:  * © AICPA and are not redistributed with Visua. When a licensed local copy is
8:  * present in corpus/aicpa-soc2/ the ingest overlays the verbatim text; without
9:  * it, Visua runs on this skeleton so SOC 2 readiness still works end to end.
10:  */
11:
12: export type TscCategory = "security" | "availability" | "processing-integrity" | "confidentiality" | "privacy";
13:
14: export const TSC_CATEGORIES: { id: TscCategory; name: string; summary: string }[] = [
15:   { id: "security", name: "Security", summary: "Information and systems are protected against unauthorized access, disclosure and damage. Required in every SOC 2 examination (the Common Criteria)." },
16:   { id: "availability", name: "Availability", summary: "Systems are available for operation and use as committed or agreed." },
17:   { id: "processing-integrity", name: "Processing Integrity", summary: "System processing is complete, valid, accurate, timely and authorized." },
18:   { id: "confidentiality", name: "Confidentiality", summary: "Information designated as confidential is protected as committed or agreed." },
19:   { id: "privacy", name: "Privacy", summary: "Personal information is collected, used, retained, disclosed and disposed of in line with the entity's commitments." },
20: ];
21:
22: export const TSC_SERIES: { id: string; title: string; category: TscCategory }[] = [
23:   { id: "CC1", title: "Control Environment", category: "security" },
24:   { id: "CC2", title: "Information and Communication", category: "security" },
25:   { id: "CC3", title: "Risk Assessment", category: "security" },
26:   { id: "CC4", title: "Monitoring Activities", category: "security" },
27:   { id: "CC5", title: "Control Activities", category: "security" },
28:   { id: "CC6", title: "Logical and Physical Access Controls", category: "security" },
29:   { id: "CC7", title: "System Operations", category: "security" },
30:   { id: "CC8", title: "Change Management", category: "security" },
31:   { id: "CC9", title: "Risk Mitigation", category: "security" },
32:   { id: "A1", title: "Availability", category: "availability" },
33:   { id: "PI1", title: "Processing Integrity", category: "processing-integrity" },
34:   { id: "C1", title: "Confidentiality", category: "confidentiality" },
35:   { id: "P1", title: "Notice", category: "privacy" },
36:   { id: "P2", title: "Choice and Consent", category: "privacy" },
37:   { id: "P3", title: "Collection", category: "privacy" },
38:   { id: "P4", title: "Use, Retention and Disposal", category: "privacy" },
39:   { id: "P5", title: "Access", category: "privacy" },
40:   { id: "P6", title: "Disclosure and Notification", category: "privacy" },
41:   { id: "P7", title: "Quality", category: "privacy" },
42:   { id: "P8", title: "Monitoring and Enforcement", category: "privacy" },
43: ];
44:
45: /** [id, COSO principle | null, Visua short title, Visua summary] */
46: type Row = [string, number | null, string, string];
47:
48: const ROWS: Row[] = [
49:   ["CC1.1", 1, "Integrity and ethical values", "Leadership sets and enforces standards of conduct, and deviations are addressed."],
50:   ["CC1.2", 2, "Board oversight", "An independent governing body oversees how internal control is designed and performs."],
51:   ["CC1.3", 3, "Structure, authority and responsibility", "Management defines reporting lines, authorities and responsibilities, with board oversight."],
52:   ["CC1.4", 4, "Commitment to competence", "People are recruited, developed and retained with the skills their roles require."],
53:   ["CC1.5", 5, "Accountability", "Individuals are held accountable for their internal control responsibilities."],
54:   ["CC2.1", 13, "Quality information", "Relevant, quality information is obtained or produced to support internal control."],
55:   ["CC2.2", 14, "Internal communication", "Control objectives and responsibilities are communicated inside the organization."],
56:   ["CC2.3", 15, "External communication", "Matters affecting internal control are communicated with external parties."],
57:   ["CC3.1", 6, "Suitable objectives", "Objectives are specified clearly enough to identify and assess the risks to them."],
58:   ["CC3.2", 7, "Risk identification and analysis", "Risks to objectives are identified across the organization and analyzed to decide how to manage them."],
59:   ["CC3.3", 8, "Fraud risk", "The potential for fraud is considered when assessing risks."],
60:   ["CC3.4", 9, "Significant change", "Changes that could significantly affect internal control are identified and assessed."],
61:   ["CC4.1", 16, "Ongoing and separate evaluations", "Evaluations confirm that the components of internal control are present and functioning."],
62:   ["CC4.2", 17, "Deficiency communication", "Control deficiencies are evaluated and communicated promptly to those who must act."],
63:   ["CC5.1", 10, "Control activities", "Control activities are selected and developed to reduce risks to acceptable levels."],
64:   ["CC5.2", 11, "Technology general controls", "General controls over technology are selected and developed to support objectives."],
65:   ["CC5.3", 12, "Policies and procedures", "Control activities are put into practice through policies and the procedures that carry them out."],
66:   ["CC6.1", null, "Logical access architecture", "Logical access software, infrastructure and architecture protect information assets."],
67:   ["CC6.2", null, "User registration and authorization", "Users are registered and authorized before access is issued, and removed when no longer needed."],
68:   ["CC6.3", null, "Least privilege and segregation of duties", "Access is granted, changed and removed based on roles, least privilege and segregation of duties."],
69:   ["CC6.4", null, "Physical access", "Physical access to facilities and protected assets is limited to authorized people."],
70:   ["CC6.5", null, "Asset disposal", "Asset protections end only after the ability to read or recover their data has been removed."],
71:   ["CC6.6", null, "Boundary protection", "Measures protect against threats from sources outside the system's boundaries."],
72:   ["CC6.7", null, "Transmission and movement of data", "Transmission, movement and removal of information are restricted and protected."],
73:   ["CC6.8", null, "Malicious software", "Unauthorized or malicious software is prevented or detected and acted on."],
74:   ["CC7.1", null, "Configuration and vulnerability detection", "Detection and monitoring surface configuration changes and newly discovered vulnerabilities."],
75:   ["CC7.2", null, "Anomaly monitoring", "System components are monitored for anomalies that indicate malicious acts, disasters or errors."],
76:   ["CC7.3", null, "Security event evaluation", "Security events are evaluated to decide whether they are incidents."],
77:   ["CC7.4", null, "Incident response", "A defined incident response program is executed to understand, contain, remediate and communicate."],
78:   ["CC7.5", null, "Incident recovery", "Activities to recover from security incidents are identified, developed and carried out."],
79:   ["CC8.1", null, "Change management", "Changes to infrastructure, data, software and procedures are authorized, tested, approved and implemented."],
80:   ["CC9.1", null, "Business disruption", "Risk mitigation activities address potential business disruptions."],
81:   ["CC9.2", null, "Vendor and partner risk", "Risks from vendors and business partners are assessed and managed."],
82:   ["A1.1", null, "Capacity management", "Processing capacity and usage are monitored and managed to meet availability commitments."],
83:   ["A1.2", null, "Environmental protection and recovery infrastructure", "Environmental protections, backups and recovery infrastructure are designed, operated and monitored."],
84:   ["A1.3", null, "Recovery testing", "Recovery plan procedures are tested to support system recovery."],
85:   ["PI1.1", null, "Processing definitions", "Information about processing objectives and specifications is obtained or produced and communicated."],
86:   ["PI1.2", null, "Input controls", "System inputs are complete and accurate."],
87:   ["PI1.3", null, "Processing controls", "Processing is complete, accurate and timely."],
88:   ["PI1.4", null, "Output controls", "Outputs are complete and accurate, reach only intended parties and are delivered on time."],
89:   ["PI1.5", null, "Stored data", "Stored inputs, items in processing and outputs are kept complete, accurate and protected."],
90:   ["C1.1", null, "Confidential information identification", "Confidential information is identified and maintained to meet confidentiality objectives."],
91:   ["C1.2", null, "Confidential information disposal", "Confidential information is disposed of in line with confidentiality objectives."],
92:   ["P1.1", null, "Privacy notice", "Data subjects are told about the entity's privacy practices."],
93:   ["P2.1", null, "Choice and consent", "Choices about how personal information is handled are communicated, and consent is obtained where needed."],
94:   ["P3.1", null, "Collection limitation", "Personal information is collected only as needed for privacy objectives."],
95:   ["P3.2", null, "Explicit consent", "Explicit consent is obtained and documented when it is required."],
96:   ["P4.1", null, "Use limitation", "Personal information is used only for its intended purposes."],
97:   ["P4.2", null, "Retention", "Personal information is kept only as long as objectives require."],
98:   ["P4.3", null, "Secure disposal", "Personal information is disposed of securely."],
99:   ["P5.1", null, "Data subject access", "Data subjects can access the personal information held about them."],
100:   ["P5.2", null, "Correction", "Data subjects can ask for corrections, and those requests are handled."],
101:   ["P6.1", null, "Disclosure to third parties", "Personal information is disclosed to third parties only as intended and consented."],
102:   ["P6.2", null, "Record of authorized disclosures", "Authorized disclosures are recorded completely and accurately."],
103:   ["P6.3", null, "Record of unauthorized disclosures", "Unauthorized disclosures, including breaches, are recorded completely and accurately."],
104:   ["P6.4", null, "Third-party commitments", "Vendors and third parties that receive personal information commit to protecting it."],
105:   ["P6.5", null, "Third-party breach notification", "Vendors and third parties report unauthorized disclosures to the entity."],
106:   ["P6.6", null, "Breach notification", "Affected data subjects, regulators and others are notified of breaches and incidents."],
107:   ["P6.7", null, "Accounting of disclosures", "Data subjects can get an accounting of the personal information held and disclosed."],
108:   ["P7.1", null, "Data quality", "Personal information is kept accurate, complete and relevant."],
109:   ["P8.1", null, "Inquiries, complaints and disputes", "Privacy inquiries, complaints and disputes are received, resolved and monitored."],
110: ];
111:
112: export const TSC_CRITERIA = ROWS.map(([id, coso, title, summary]) => {
113:   const series = id.split(".")[0]!;
114:   return { id, series, category: TSC_SERIES.find((s) => s.id === series)!.category, cosoPrinciple: coso, title, summary };
115: });
116:
117: /** DC 200 description criteria: identifiers with Visua short titles. */
118: export const DC200_SKELETON: { id: string; title: string; typeTwoOnly?: boolean }[] = [
119:   { id: "DC1", title: "Types of services provided" },
120:   { id: "DC2", title: "Principal service commitments and system requirements" },
121:   { id: "DC3", title: "System components: infrastructure, software, people, procedures and data" },
122:   { id: "DC4", title: "Significant system incidents" },
123:   { id: "DC5", title: "Applicable trust services criteria and the related controls" },
124:   { id: "DC6", title: "Complementary user entity controls (CUECs)" },
125:   { id: "DC7", title: "Subservice organizations and complementary subservice organization controls" },
126:   { id: "DC8", title: "Criteria that are not relevant to the system, with reasons" },
127:   { id: "DC9", title: "Significant changes to the system during the period", typeTwoOnly: true },
128: ];

FILE packages/frameworks/src/ingest/tsc.ts SHA256 e235f29116d3ef49aa2f122a72c484e4c5e836379b2ada666af9c0a8aef24694
1: /**
2:  * AICPA 2017 Trust Services Criteria (points of focus revised 2022): the
3:  * criteria used in SOC 2 examinations.
4:  *
5:  * Licensing: the criteria text, points of focus and DC 200 description criteria
6:  * are © AICPA ("all rights reserved"; the AICPA site terms allow personal,
7:  * non-commercial use and object to use in LLM knowledge bases). Visua does not
8:  * redistribute them. The graph is built from Visua's own skeleton
9:  * (./tsc-skeleton.ts) and, when a licensed local copy of the structured
10:  * extraction exists (corpus/aicpa-soc2/tsc-2017-rev2022.json, git-ignored),
11:  * overlaid with the verbatim text for that installation only.
12:  */
13: import { existsSync, readFileSync } from "node:fs";
14: import { resolve } from "node:path";
15: import type { FrameworkGraph, RequirementNode } from "@visua/core";
16: import { CORPUS_DIR } from "../paths.ts";
17: import { DC200_SKELETON, TSC_CATEGORIES, TSC_CRITERIA, TSC_SERIES } from "./tsc-skeleton.ts";
18:
19: export const TSC_ID = "aicpa-tsc-2017";
20: export const TSC_DOCUMENT = "tsc-2017-rev-pof-2022";
21: export const DC200_DOCUMENT = "dc200-2018-rev-ig-2022";
22:
23: const LICENSED_TSC = resolve(CORPUS_DIR, "aicpa-soc2/tsc-2017-rev2022.json");
24: const LICENSED_DC200 = resolve(CORPUS_DIR, "aicpa-soc2/dc200-description-criteria.json");
25:
26: export interface LicensedTsc {
27:   criteria: {
28:     id: string;
29:     text: string;
30:     sourcePage?: number;
31:     pointsOfFocus?: { ref?: string; title: string; text?: string; scope?: string; origin?: string; addedIn2022?: boolean; revisedIn2022?: boolean; sourcePage?: number }[];
32:   }[];
33:   categories?: { id: string; description?: string }[];
34: }
35:
36: export function loadLicensedTsc(): LicensedTsc | null {
37:   if (!existsSync(LICENSED_TSC)) return null;
38:   return JSON.parse(readFileSync(LICENSED_TSC, "utf8")) as LicensedTsc;
39: }
40:
41: const CATEGORY_GROUPS: { code: string; category: string; title: string }[] = [
42:   { code: "CC", category: "security", title: "Common Criteria (Security)" },
43:   { code: "A", category: "availability", title: "Availability" },
44:   { code: "PI", category: "processing-integrity", title: "Processing Integrity" },
45:   { code: "C", category: "confidentiality", title: "Confidentiality" },
46:   { code: "P", category: "privacy", title: "Privacy" },
47: ];
48:
49: /** Build the TSC graph: Visua skeleton, overlaid with licensed verbatim text when available. */
50: export function buildTscGraph(licensed: LicensedTsc | null = loadLicensedTsc()): FrameworkGraph {
51:   const nodes: RequirementNode[] = [];
52:   CATEGORY_GROUPS.forEach((group, gi) => {
53:     const cat = TSC_CATEGORIES.find((c) => c.id === group.category)!;
54:     const groupId = `${TSC_ID}:${group.code}`;
55:     nodes.push({
56:       id: groupId,
57:       frameworkId: TSC_ID,
58:       code: group.code,
59:       kind: "category",
60:       parentId: null,
61:       depth: 0,
62:       order: gi,
63:       title: group.title,
64:       text: cat.summary,
65:       attributes: { category: group.category, licensed: false },
66:       citation: { documentId: TSC_DOCUMENT, locator: `TSP Section 100 — ${cat.name}` },
67:       assessable: false,
68:     });
69:     TSC_SERIES.filter((s) => s.category === group.category).forEach((s, si) => {
70:       const seriesId = `${TSC_ID}:${s.id}`;
71:       nodes.push({
72:         id: seriesId,
73:         frameworkId: TSC_ID,
74:         code: s.id,
75:         kind: "series",
76:         parentId: groupId,
77:         depth: 1,
78:         order: si,
79:         title: s.title,
80:         text: `${s.id} — ${s.title}`,
81:         attributes: { category: group.category, licensed: false },
82:         citation: { documentId: TSC_DOCUMENT, locator: `TSP Section 100 — ${s.id} ${s.title}` },
83:         assessable: false,
84:       });
85:       TSC_CRITERIA.filter((c) => c.series === s.id).forEach((c, ci) => {
86:         const official = licensed?.criteria.find((x) => x.id === c.id);
87:         nodes.push({
88:           id: `${TSC_ID}:${c.id}`,
89:           frameworkId: TSC_ID,
90:           code: c.id,
91:           kind: "criterion",
92:           parentId: seriesId,
93:           depth: 2,
94:           order: ci,
95:           title: c.title,
96:           text: official?.text.trim() ?? c.summary,
97:           attributes: {
98:             category: c.category,
99:             cosoPrinciple: c.cosoPrinciple,
100:             summary: c.summary,
101:             licensed: !!official,
102:             ...(official?.pointsOfFocus
103:               ? {
104:                   pointsOfFocus: official.pointsOfFocus.map((p) => ({
105:                     ref: p.ref,
106:                     title: p.title.trim(),
107:                     text: p.text?.trim(),
108:                     scope: p.scope,
109:                     origin: p.origin,
110:                     change2022: p.addedIn2022 ? "added" : p.revisedIn2022 ? "revised" : "unchanged",
111:                   })),
112:                 }
113:               : {}),
114:           },
115:           citation: { documentId: TSC_DOCUMENT, locator: `TSP Section 100 — ${c.id}`, page: official?.sourcePage },
116:           assessable: true,
117:         });
118:       });
119:     });
120:   });
121:   const licensedText = nodes.some((n) => n.attributes?.["licensed"] === true);
122:   return {
123:     framework: {
124:       id: TSC_ID,
125:       family: "soc2",
126:       shortName: "SOC 2 (TSC 2017)",
127:       badge: "SOC 2",
128:       name: "AICPA 2017 Trust Services Criteria for Security, Availability, Processing Integrity, Confidentiality, and Privacy (points of focus revised 2022)",
129:       publisher: "American Institute of Certified Public Accountants (AICPA)",
130:       version: "2017 (points of focus revised 2022)",
131:       published: "2022",
132:       description:
133:         "The criteria used in SOC 2 examinations: the Common Criteria (Security, built on the 17 COSO 2013 principles) plus additional criteria for Availability, Processing Integrity, Confidentiality and Privacy.",
134:       levels: [
135:         { kind: "category", label: "Category", pluralLabel: "Categories" },
136:         { kind: "series", label: "Series", pluralLabel: "Series" },
137:         { kind: "criterion", label: "Criterion", pluralLabel: "Criteria" },
138:       ],
139:       assessableKind: "criterion",
140:       sources: [{ documentId: TSC_DOCUMENT }],
141:       unitLabel: "criterion",
142:       unitLabelPlural: "criteria",
143:       contentNotice: licensedText
144:         ? "Criterion text and points of focus © AICPA, loaded from this installation's local copy. Not redistributed by Visua."
145:         : "Criterion titles and summaries are Visua's plain-language descriptions. The official AICPA text is not bundled; add a licensed copy to corpus/aicpa-soc2 to display it.",
146:     },
147:     nodes,
148:   };
149: }
150:
151: export interface DescriptionCriterion {
152:   id: string;
153:   title: string;
154:   /** Verbatim criterion text — only with a licensed local copy. */
155:   text?: string;
156:   items?: { marker: string; text: string }[];
157:   page?: number;
158:   typeTwoOnly?: boolean;
159:   licensed: boolean;
160: }
161:
162: /** DC 200 description criteria: Visua titles, overlaid with licensed text when available. */
163: export function loadDescriptionCriteria(): DescriptionCriterion[] {
164:   const licensed = existsSync(LICENSED_DC200)
165:     ? (JSON.parse(readFileSync(LICENSED_DC200, "utf8")) as { id: string; criterion?: string; text: string; items?: { marker: string; text: string }[]; sourcePage?: number }[])
166:     : null;
167:   return DC200_SKELETON.map((d) => {
168:     const official = licensed?.find((x) => x.id === d.id);
169:     return {
170:       id: d.id,
171:       title: d.title,
172:       text: official ? (official.criterion ?? official.text) : undefined,
173:       items: official?.items?.map((i) => ({ marker: i.marker, text: i.text })),
174:       page: official?.sourcePage,
175:       typeTwoOnly: d.typeTwoOnly,
176:       licensed: !!official,
177:     };
178:   });
179: }

FILE packages/frameworks/src/paths.ts SHA256 219bd0dc92b882721e8d271ea2d4f109b8efe48f016b24f658c63d661ac002c1
1: import { dirname, resolve } from "node:path";
2: import { fileURLToPath } from "node:url";
3:
4: const here = dirname(fileURLToPath(import.meta.url));
5:
6: /** Repository root (…/visua). */
7: export const REPO_ROOT = resolve(here, "../../..");
8: /** Local official documentation corpus. */
9: export const CORPUS_DIR = resolve(REPO_ROOT, "corpus");
10: /** Generated, normalized framework data. */
11: export const DATA_DIR = resolve(here, "../data");

FILE packages/frameworks/src/search.ts SHA256 4b709b81e7b0195cd9927656ae5bbd5955a50f206038db3af72d76a450ba05a1
1: /**
2:  * Citation-ready lexical retrieval (Okapi BM25) over the local official corpus.
3:  *
4:  * Chunks are produced at ingest time from the official PDFs / machine-readable
5:  * sources and carry document id, title, locator and page so every agent answer
6:  * can cite exactly where a statement comes from. BM25 needs no network, no
7:  * embeddings service and is fully deterministic — ideal for audit-grade work.
8:  */
9:
10: export interface CorpusChunk {
11:   /** Stable id: `${documentId}#p${page}-${n}` */
12:   id: string;
13:   documentId: string;
14:   documentTitle: string;
15:   framework: string;
16:   page?: number;
17:   locator?: string;
18:   text: string;
19: }
20:
21: export interface SearchHit {
22:   chunk: CorpusChunk;
23:   score: number;
24:   /** Best matching sentence(s) for display as a quote. */
25:   quote: string;
26: }
27:
28: const STOPWORDS = new Set(
29:   (
30:     "a an and are as at be been but by can could did do does for from had has have how i if in into is it its may " +
31:     "might must no not of on or our shall should so such than that the their them then there these they this those " +
32:     "to under up upon was we were what when where which while who whom why will with within without would you your " +
33:     "also any each other more most all both only same own too very s t just over between through during before after"
34:   ).split(/\s+/),
35: );
36:
37: /** Light stemmer: strips common English suffixes so "controls" ≈ "control". */
38: export function stem(token: string): string {
39:   if (token.length <= 4) return token;
40:   for (const suffix of ["ations", "ation", "ments", "ment", "ities", "ity", "ings", "ing", "ies", "ed", "es", "s"]) {
41:     if (token.endsWith(suffix) && token.length - suffix.length >= 4) {
42:       return suffix === "ies" ? token.slice(0, -3) + "y" : token.slice(0, -suffix.length);
43:     }
44:   }
45:   return token;
46: }
47:
48: export function tokenize(text: string): string[] {
49:   const out: string[] = [];
50:   const raw = text.toLowerCase().match(/[a-z0-9][a-z0-9.\-()]*[a-z0-9)]|[a-z0-9]/g) ?? [];
51:   for (const t of raw) {
52:     // Keep identifiers such as "gv.oc-01", "ac-2(1)", "cc6.1" intact, plus their parts.
53:     if (/[.\-()]/.test(t)) {
54:       out.push(t);
55:       for (const part of t.split(/[.\-()]+/)) if (part && !STOPWORDS.has(part)) out.push(stem(part));
56:       continue;
57:     }
58:     if (STOPWORDS.has(t)) continue;
59:     out.push(stem(t));
60:   }
61:   return out;
62: }
63:
64: export class CorpusSearch {
65:   private readonly chunks: CorpusChunk[];
66:   private readonly docTerms: Map<string, number>[] = [];
67:   private readonly docLength: number[] = [];
68:   private readonly df = new Map<string, number>();
69:   private readonly postings = new Map<string, number[]>();
70:   private readonly avgLength: number;
71:   private readonly k1 = 1.4;
72:   private readonly b = 0.72;
73:
74:   constructor(chunks: CorpusChunk[]) {
75:     this.chunks = chunks;
76:     let total = 0;
77:     chunks.forEach((chunk, i) => {
78:       const terms = tokenize(`${chunk.locator ?? ""} ${chunk.text}`);
79:       const tf = new Map<string, number>();
80:       for (const t of terms) tf.set(t, (tf.get(t) ?? 0) + 1);
81:       this.docTerms.push(tf);
82:       this.docLength.push(terms.length);
83:       total += terms.length;
84:       for (const t of tf.keys()) {
85:         this.df.set(t, (this.df.get(t) ?? 0) + 1);
86:         const list = this.postings.get(t);
87:         if (list) list.push(i);
88:         else this.postings.set(t, [i]);
89:       }
90:     });
91:     this.avgLength = chunks.length ? total / chunks.length : 1;
92:   }
93:
94:   get size(): number {
95:     return this.chunks.length;
96:   }
97:
98:   search(query: string, opts: { limit?: number; framework?: string; documentId?: string } = {}): SearchHit[] {
99:     const limit = opts.limit ?? 6;
100:     const terms = [...new Set(tokenize(query))];
101:     if (!terms.length) return [];
102:     const n = this.chunks.length;
103:     const scores = new Map<number, number>();
104:     for (const term of terms) {
105:       const posting = this.postings.get(term);
106:       if (!posting) continue;
107:       const df = this.df.get(term) ?? 0;
108:       const idf = Math.log(1 + (n - df + 0.5) / (df + 0.5));
109:       for (const i of posting) {
110:         const chunk = this.chunks[i]!;
111:         if (opts.framework && chunk.framework !== opts.framework) continue;
112:         if (opts.documentId && chunk.documentId !== opts.documentId) continue;
113:         const tf = this.docTerms[i]!.get(term) ?? 0;
114:         const norm = tf + this.k1 * (1 - this.b + (this.b * this.docLength[i]!) / this.avgLength);
115:         scores.set(i, (scores.get(i) ?? 0) + idf * ((tf * (this.k1 + 1)) / norm));
116:       }
117:     }
118:     return [...scores.entries()]
119:       .sort((a, b) => b[1] - a[1])
120:       .slice(0, limit)
121:       .map(([i, score]) => ({ chunk: this.chunks[i]!, score, quote: bestQuote(this.chunks[i]!.text, terms) }));
122:   }
123: }
124:
125: /** Pick the sentence window with the highest query-term density. */
126: export function bestQuote(text: string, terms: string[], maxLength = 420): string {
127:   const sentences = text.replace(/\s+/g, " ").match(/[^.!?]+[.!?]*(\s|$)/g) ?? [text];
128:   let best = 0;
129:   let bestScore = -1;
130:   for (let i = 0; i < sentences.length; i++) {
131:     const window = sentences.slice(i, i + 2).join(" ");
132:     const tokens = new Set(tokenize(window));
133:     const score = terms.reduce((s, t) => s + (tokens.has(t) ? 1 : 0), 0);
134:     if (score > bestScore) {
135:       bestScore = score;
136:       best = i;
137:     }
138:   }
139:   const quote = sentences.slice(best, best + 2).join(" ").trim();
140:   return quote.length > maxLength ? `${quote.slice(0, maxLength - 1).trimEnd()}…` : quote;
141: }

FILE packages/frameworks/src/threat-links.ts SHA256 9fd23d5c139a13262859b4b4eea069307006ac0f396c88cd321d0ab74cad9e2f
1: /**
2:  * Published links between threats (MITRE ATLAS, OWASP Top 10s, NIST AI 100-2)
3:  * and requirements, kept apart from the requirement crosswalk: they say which
4:  * requirements address a threat, not how far one requirement satisfies another.
5:  */
6: import type { CorpusCitation, MappingSet, MappingStatus } from "@visua/core";
7:
8: export interface ThreatLink {
9:   /** The node at the other end of the link. */
10:   nodeId: string;
11:   /** "out" when the indexed node is the mapping's source. */
12:   direction: "out" | "in";
13:   /** The publisher's term, e.g. "mitigates" or "example informative reference". */
14:   label: string;
15:   status: MappingStatus;
16:   strength?: string;
17:   note?: string;
18:   authority: string;
19:   mappingSetId: string;
20:   citation: CorpusCitation;
21: }
22:
23: export class ThreatLinkIndex {
24:   readonly sets: MappingSet[];
25:   private readonly byNode = new Map<string, ThreatLink[]>();
26:
27:   constructor(sets: MappingSet[]) {
28:     this.sets = sets;
29:     for (const set of sets) {
30:       for (const m of set.mappings) {
31:         const base = {
32:           label: m.label ?? "related to",
33:           status: m.status ?? set.status ?? "final",
34:           ...(m.strength ? { strength: m.strength } : {}),
35:           ...(m.note ? { note: m.note } : {}),
36:           authority: m.origin.authority,
37:           mappingSetId: set.id,
38:           citation: { documentId: m.origin.documentId, locator: m.origin.locator, page: m.origin.page },
39:         };
40:         this.add(m.source, { ...base, nodeId: m.target, direction: "out" });
41:         this.add(m.target, { ...base, nodeId: m.source, direction: "in" });
42:       }
43:     }
44:   }
45:
46:   private add(nodeId: string, link: ThreatLink) {
47:     const list = this.byNode.get(nodeId);
48:     if (list) list.push(link);
49:     else this.byNode.set(nodeId, [link]);
50:   }
51:
52:   /** Every published link that touches a node, in either direction. */
53:   of(nodeId: string): ThreatLink[] {
54:     return this.byNode.get(nodeId) ?? [];
55:   }
56:
57:   get size(): number {
58:     return this.sets.reduce((n, s) => n + s.mappings.length, 0);
59:   }
60: }

FILE packages/frameworks/src/threat-paths.ts SHA256 322e4eb10275500e777ba1db6f6da1c4bdfcf07e8569174a31db25197ebce7b6
1: /**
2:  * How each threat (MITRE ATLAS, the OWASP Top 10s, NIST AI 100-2) reaches the
3:  * requirements that address it, through published links only:
4:  *
5:  *   - directly (e.g. OWASP LLM Top 10 2026 → AI RMF categories, COSAiS SP 800-53
6:  *     controls → NIST AI 100-2 attacks, the OWASP community crosswalk);
7:  *   - through an ATLAS mitigation (technique → mitigation, MITRE; mitigation →
8:  *     CSF subcategory, NIST IR 8596 draft);
9:  *   - through the same entry in the other OWASP LLM Top 10 edition (OWASP's own
10:  *     2025 → 2026 rank migration, Figure 1 of the 2026 edition).
11:  *
12:  * Every path keeps its links, each with its publisher and status, and a path is only
13:  * as strong as its weakest link (final > draft > unreviewed > superseded). The graph is
14:  * static: it depends on the registry only, and is shared by the server and the agents.
15:  */
16: import type { MappingStatus, RequirementNode } from "@visua/core";
17: import type { FrameworkRegistry } from "./index.ts";
18: import { ATLAS_ID } from "./ingest/threats.ts";
19: import type { ThreatLink } from "./threat-links.ts";
20:
21: export const STATUS_RANK: Record<MappingStatus, number> = { final: 3, draft: 2, unreviewed: 1, superseded: 0 };
22:
23: export type PathKind = "direct" | "mitigation" | "edition";
24:
25: export interface LinkView {
26:   label: string;
27:   status: MappingStatus;
28:   authority: string;
29:   strength?: string;
30:   note?: string;
31:   citation: ThreatLink["citation"];
32: }
33:
34: export interface ThreatPath {
35:   kind: PathKind;
36:   /** The intermediate threat-catalog node (an ATLAS mitigation, or the other OWASP edition). */
37:   via?: string;
38:   /** Set when the link names a group (e.g. an AI RMF category) and the requirement is one of its units. */
39:   group?: string;
40:   links: LinkView[];
41:   status: MappingStatus;
42: }
43:
44: export interface ThreatPathGraph {
45:   isThreat: (nodeId: string) => boolean;
46:   /** Threat node → requirement node → paths. */
47:   forward: Map<string, Map<string, ThreatPath[]>>;
48:   /** Requirement node → threat node → paths. */
49:   reverse: Map<string, Map<string, ThreatPath[]>>;
50: }
51:
52: export const weakest = (links: { status: MappingStatus }[]): MappingStatus => links.reduce<MappingStatus>((w, l) => (STATUS_RANK[l.status] < STATUS_RANK[w] ? l.status : w), "final");
53:
54: export const linkView = (l: ThreatLink): LinkView => ({
55:   label: l.label,
56:   status: l.status,
57:   authority: l.authority,
58:   ...(l.strength ? { strength: l.strength } : {}),
59:   ...(l.note ? { note: l.note } : {}),
60:   citation: l.citation,
61: });
62:
63: /** OWASP publishes the 2025 → 2026 counterparts in its rank migration chart (2026 edition, p. 6). */
64: const EDITION_LINK: LinkView = {
65:   label: "same entry in the other edition",
66:   status: "final",
67:   authority: "OWASP LLM Top 10 2026, Figure 1",
68:   citation: { documentId: "owasp-llm-top10-2026-pdf", locator: "Figure 1: rank migration from the 2025 to the 2026 Top 10", page: 6 },
69: };
70:
71: /**
72:  * Coverage groups: the publication that links the requirement (the path's last link)
73:  * and, within it, the route (an ATLAS mitigation, the other edition's entry, a group
74:  * such as an AI RMF category, or the requirement itself). Coverage weighs every
75:  * publication equally and, within one, every route equally.
76:  */
77: export function coverageGroup(path: ThreatPath, requirementId: string): { publication: string; route: string } {
78:   return { publication: path.links[path.links.length - 1]!.authority, route: path.via ?? (path.group ? `group:${path.group}` : requirementId) };
79: }
80:
81: const graphs = new WeakMap<FrameworkRegistry, ThreatPathGraph>();
82:
83: export function threatPaths(registry: FrameworkRegistry): ThreatPathGraph {
84:   const cached = graphs.get(registry);
85:   if (cached) return cached;
86:   const threatFrameworks = new Set(registry.frameworks.filter((f) => f.family === "threat").map((f) => f.id));
87:   const fwOf = (id: string) => id.slice(0, id.indexOf(":"));
88:   const isThreat = (id: string) => threatFrameworks.has(fwOf(id));
89:   const node = (id: string): RequirementNode | undefined => registry.framework(fwOf(id))?.byId.get(id);
90:   // A link to a group (an AI RMF category, a CSF category) stands for its units.
91:   const units = (id: string): { id: string; group?: string }[] => {
92:     const n = node(id);
93:     if (!n) return [];
94:     if (n.assessable) return [{ id }];
95:     return registry
96:       .framework(n.frameworkId)!
97:       .assessableUnder(id)
98:       .map((u) => ({ id: u.id, group: n.code }));
99:   };
100:   const forward = new Map<string, Map<string, ThreatPath[]>>();
101:   const add = (threatId: string, reqId: string, path: ThreatPath) => {
102:     const byReq = forward.get(threatId) ?? new Map<string, ThreatPath[]>();
103:     byReq.set(reqId, [...(byReq.get(reqId) ?? []), path]);
104:     forward.set(threatId, byReq);
105:   };
106:   const direct = (threatId: string, kind: PathKind, via: string | undefined, first: LinkView[]) => {
107:     for (const l of registry.threatLinks.of(via ?? threatId)) {
108:       if (isThreat(l.nodeId)) continue;
109:       const links = [...first, linkView(l)];
110:       for (const u of units(l.nodeId)) add(threatId, u.id, { kind, ...(via ? { via } : {}), ...(u.group ? { group: u.group } : {}), links, status: weakest(links) });
111:     }
112:   };
113:   for (const fw of threatFrameworks) {
114:     for (const t of registry.framework(fw)!.graph.nodes) {
115:       direct(t.id, "direct", undefined, []);
116:       for (const l of registry.threatLinks.of(t.id)) {
117:         // Through an ATLAS mitigation of this technique, or an ATLAS mitigation a publication cites for this attack.
118:         const other = node(l.nodeId);
119:         if (other && other.frameworkId === ATLAS_ID && other.kind === "mitigation" && t.kind !== "mitigation") direct(t.id, "mitigation", other.id, [linkView(l)]);
120:       }
121:       // Through the same entry in the other OWASP LLM Top 10 edition.
122:       for (const key of ["previousEdition", "nextEdition"]) {
123:         const edition = t.attributes?.[key] as { nodeId: string } | undefined;
124:         if (edition && node(edition.nodeId)) direct(t.id, "edition", edition.nodeId, [EDITION_LINK]);
125:       }
126:     }
127:   }
128:   const reverse = new Map<string, Map<string, ThreatPath[]>>();
129:   for (const [threatId, byReq] of forward) {
130:     for (const [reqId, paths] of byReq) {
131:       const byThreat = reverse.get(reqId) ?? new Map<string, ThreatPath[]>();
132:       byThreat.set(threatId, paths);
133:       reverse.set(reqId, byThreat);
134:     }
135:   }
136:   const g = { isThreat, forward, reverse };
137:   graphs.set(registry, g);
138:   return g;
139: }

FILE packages/frameworks/test/frameworks.test.ts SHA256 60f9cf0876943113622f53945dc89a6459a5f5a1bc50dc72b21ae29801fecc8d
1: import { describe, expect, it } from "vitest";
2: import { FrameworkRegistry, loadCorpusManifests, loadFrameworkGraphs, loadMappingSets } from "../src/index.ts";
3: import { normalize80053, rmfTaskCode } from "../src/ingest/csf.ts";
4: import { buildTscGraph, loadLicensedTsc } from "../src/ingest/tsc.ts";
5: import { normalize80053 as normalizeAicpa80053 } from "../src/ingest/tsc-mappings.ts";
6: import { tokenize } from "../src/search.ts";
7:
8: const registry = FrameworkRegistry.load();
9:
10: describe("ingested framework graphs match the official sources", () => {
11:   it("describes every framework with a family, names and a compact badge label for the UI", () => {
12:     for (const f of registry.frameworks) {
13:       expect(["csf", "soc2", "rmf", "ai", "law", "threat"], f.id).toContain(f.family);
14:       expect(f.badge, f.id).toBeTruthy();
15:       expect(f.badge!.length, f.id).toBeLessThanOrEqual(f.shortName.length);
16:     }
17:     // The skeleton built without the licensed AICPA copy carries it too.
18:     expect(buildTscGraph().framework.badge).toBe("SOC 2");
19:   });
20:
21:   it("NIST CSF 2.0: 6 Functions, 22 Categories, 106 Subcategories, 363 Implementation Examples", () => {
22:     const csf = registry.framework("nist-csf-2.0")!;
23:     const byKind = (k: string) => csf.graph.nodes.filter((n) => n.kind === k);
24:     expect(byKind("function").map((n) => n.code)).toEqual(["GV", "ID", "PR", "DE", "RS", "RC"]);
25:     expect(byKind("category")).toHaveLength(22);
26:     expect(byKind("subcategory")).toHaveLength(106);
27:     expect(byKind("subcategory").reduce((s, n) => s + (n.examples?.length ?? 0), 0)).toBe(363);
28:     const gvoc01 = csf.get("GV.OC-01")!;
29:     expect(gvoc01.text).toBe("The organizational mission is understood and informs cybersecurity risk management");
30:     expect(gvoc01.citation.page).toBeGreaterThan(0);
31:     expect(csf.graph.nodes.every((n) => n.citation.page)).toBe(true);
32:   });
33:
34:   it("SP 800-53 Rev. 5.2.0: 20 families, 1,014 active controls and enhancements, SP 800-53B baselines", () => {
35:     const sp = registry.framework("nist-sp-800-53-r5")!;
36:     expect(sp.roots()).toHaveLength(20);
37:     expect(sp.assessable).toHaveLength(1014);
38:     const count = (b: string) => sp.assessable.filter((n) => (n.attributes?.["baselines"] as string[]).includes(b)).length;
39:     expect(count("low")).toBe(149);
40:     expect(count("moderate")).toBe(287);
41:     expect(count("high")).toBe(370);
42:     expect(count("privacy")).toBe(96);
43:     const ac2 = sp.get("AC-2")!;
44:     expect(ac2.title).toBe("Account Management");
45:     expect(ac2.text).toContain("[Assignment: organization-defined");
46:     expect((ac2.attributes?.["objectives"] as string[]).length).toBeGreaterThan(10);
47:     expect(sp.get("SA-24")).toBeDefined(); // Release 5.2.0 addition
48:   });
49:
50:   it("NIST RMF: 7 steps and 47 tasks", () => {
51:     const rmf = registry.framework("nist-rmf")!;
52:     expect(rmf.roots().map((n) => n.code)).toEqual(["P", "C", "S", "I", "A", "R", "M"]);
53:     expect(rmf.assessable).toHaveLength(47);
54:     expect(rmf.get("C-2")!.title).toBe("Security Categorization");
55:   });
56:
57:   it("AICPA TSC 2017 (SOC 2): 5 categories, 20 series, 61 criteria — runs without the licensed text", () => {
58:     const skeleton = buildTscGraph(null);
59:     const byKind = (k: string) => skeleton.nodes.filter((n) => n.kind === k);
60:     expect(byKind("category").map((n) => n.code)).toEqual(["CC", "A", "PI", "C", "P"]);
61:     expect(byKind("series")).toHaveLength(20);
62:     expect(byKind("criterion")).toHaveLength(61);
63:     const count = (prefix: RegExp) => byKind("criterion").filter((n) => prefix.test(n.code)).length;
64:     expect([count(/^CC/), count(/^A/), count(/^PI/), count(/^C\d/), count(/^P\d/)]).toEqual([33, 3, 5, 2, 18]);
65:     // COSO principles 1–17 map to CC1.1–CC5.3; the skeleton carries no AICPA text.
66:     expect(byKind("criterion").filter((n) => n.attributes?.["cosoPrinciple"]).map((n) => n.attributes?.["cosoPrinciple"]).sort((a, b) => Number(a) - Number(b))).toEqual(Array.from({ length: 17 }, (_, i) => i + 1));
67:     expect(skeleton.nodes.every((n) => n.attributes?.["licensed"] === false)).toBe(true);
68:     expect(skeleton.framework.contentNotice).toMatch(/not bundled/);
69:   });
70:
71:   it("overlays the verbatim criteria from a licensed local copy when present", () => {
72:     const licensed = loadLicensedTsc();
73:     if (!licensed) return; // Fresh clones do not include AICPA content.
74:     const graph = buildTscGraph(licensed);
75:     const cc61 = graph.nodes.find((n) => n.code === "CC6.1")!;
76:     expect(cc61.attributes?.["licensed"]).toBe(true);
77:     expect(cc61.text).toMatch(/^The entity implements logical access security software/);
78:     expect(cc61.citation.page).toBeGreaterThan(0);
79:     const pof = graph.nodes.filter((n) => n.kind === "criterion").reduce((s, n) => s + ((n.attributes?.["pointsOfFocus"] as unknown[]) ?? []).length, 0);
80:     expect(pof).toBe(330);
81:   });
82:
83:   // Runs whenever the AI RMF corpus has been ingested (packages/frameworks/data/nist-ai-rmf.json).
84:   it.skipIf(!registry.framework("nist-ai-rmf"))("NIST AI RMF 1.0: 4 functions, 19 categories, 72 subcategories, Playbook actions and the Generative AI Profile", () => {
85:     const ai = registry.framework("nist-ai-rmf")!;
86:     const byKind = (k: string) => ai.graph.nodes.filter((n) => n.kind === k);
87:     expect(byKind("function").map((n) => n.code)).toEqual(["GOVERN", "MAP", "MEASURE", "MANAGE"]);
88:     expect(byKind("category")).toHaveLength(19);
89:     expect(byKind("subcategory")).toHaveLength(72);
90:     const perFunction = (f: string) => byKind("subcategory").filter((n) => n.code.startsWith(`${f} `)).length;
91:     expect(["GOVERN", "MAP", "MEASURE", "MANAGE"].map(perFunction)).toEqual([19, 18, 22, 13]);
92:     expect(ai.graph.nodes.every((n) => n.citation.page && n.citation.page > 0)).toBe(true);
93:     // The Playbook gives suggested actions for every outcome.
94:     expect(byKind("subcategory").every((n) => ((n.attributes?.["suggestedActions"] as unknown[]) ?? []).length > 0)).toBe(true);
95:     // NIST AI 600-1: 12 GAI risks; every action is tied to an existing outcome and to known risks.
96:     const profile = ai.graph.profiles?.find((p) => p.id === "nist-ai-600-1");
97:     expect(profile?.risks).toHaveLength(12);
98:     const riskIds = new Set(profile!.risks.map((r) => r.id));
99:     const actions = byKind("subcategory").flatMap((n) => (n.attributes?.["profileActions"] as { id: string; risks: string[] }[] | undefined) ?? []);
100:     expect(actions.length).toBeGreaterThan(150);
101:     expect(actions.every((a) => /^(GV|MP|MS|MG)-\d+\.\d+-\d{3}$/.test(a.id) && a.risks.every((r) => riskIds.has(r)))).toBe(true);
102:   });
103:
104:   it("every mapping endpoint exists", () => {
105:     for (const set of loadMappingSets()) {
106:       expect(set.mappings.length).toBeGreaterThan(0);
107:       for (const m of set.mappings) {
108:         expect(registry.node(m.source), m.source).toBeDefined();
109:         expect(registry.node(m.target), m.target).toBeDefined();
110:       }
111:     }
112:     expect(registry.crosswalk.related("nist-csf-2.0:PR.AA-05", "nist-sp-800-53-r5").length).toBeGreaterThan(3);
113:   });
114:
115:   it("every cited document is in a corpus manifest", () => {
116:     const docs = new Set(loadCorpusManifests().flatMap((m) => m.documents.map((d) => d.id)));
117:     for (const g of loadFrameworkGraphs()) for (const n of g.nodes) expect(docs.has(n.citation.documentId), `${n.id} → ${n.citation.documentId}`).toBe(true);
118:   });
119: });
120:
121: describe("corpus search", () => {
122:   it("retrieves citable passages from the official corpus", () => {
123:     const hits = registry.search.search("security categorization FIPS 199 impact level", { limit: 5, framework: "nist-rmf" });
124:     expect(hits.length).toBeGreaterThan(0);
125:     expect(hits[0]!.chunk.page).toBeGreaterThan(0);
126:     expect(hits[0]!.quote.length).toBeGreaterThan(20);
127:     const byCode = registry.search.search("PR.AA-05 access permissions", { limit: 3 });
128:     expect(byCode.some((h) => h.chunk.text.includes("PR.AA-05"))).toBe(true);
129:   });
130:
131:   it("tokenizes framework identifiers intact", () => {
132:     expect(tokenize("See GV.OC-01 and AC-2(1)")).toEqual(expect.arrayContaining(["gv.oc-01", "ac-2(1)"]));
133:   });
134: });
135:
136: describe("identifier normalization", () => {
137:   it("normalizes SP 800-53 and RMF identifiers", () => {
138:     expect(normalize80053("SR-03")).toBe("SR-3");
139:     expect(normalize80053("AC-02(01)")).toBe("AC-2(1)");
140:     expect(rmfTaskCode("RMF Prepare Step (System Level): TASK P-14 Risk Assessment—System")).toBe("P-14");
141:     expect(normalizeAicpa80053("PS-6a")).toBe("PS-6");
142:     expect(normalizeAicpa80053("AC-2(1)(a)")).toBe("AC-2(1)");
143:     expect(normalizeAicpa80053("SA-08(21)")).toBe("SA-8(21)");
144:   });
145: });
146:
147: // Runs when the AI overlays are ingested (packages/frameworks/data/overlays/).
148: describe.skipIf(!registry.overlay("nist-ir-8596-iprd"))("AI security overlays (NIST drafts)", () => {
149:   it("Cyber AI Profile (IR 8596 iprd): all 106 CSF subcategories with a priority for each focus area", () => {
150:     const o = registry.overlay("nist-ir-8596-iprd")!;
151:     expect(o.frameworkId).toBe("nist-csf-2.0");
152:     expect(o.status).toBe("initial preliminary draft");
153:     expect(o.entries).toHaveLength(106);
154:     expect(o.lenses?.map((l) => l.id)).toEqual(["secure", "defend", "thwart"]);
155:     const count = (lens: string, p: number) => o.entries.filter((e) => e.lenses?.[lens]?.priority === p).length;
156:     // Proposed priorities as printed in Tables 1–6: 1 High, 2 Moderate, 3 Foundational.
157:     expect([1, 2, 3].map((p) => count("secure", p))).toEqual([23, 33, 50]);
158:     expect([1, 2, 3].map((p) => count("defend", p))).toEqual([28, 43, 35]);
159:     expect([1, 2, 3].map((p) => count("thwart", p))).toEqual([24, 44, 38]);
160:     const csf = registry.framework("nist-csf-2.0")!;
161:     expect(new Set(o.entries.map((e) => e.nodeId))).toEqual(new Set(csf.assessable.map((n) => n.id)));
162:     expect(o.entries.every((e) => e.citation.documentId === "nist-ir-8596-iprd" && (e.citation.page ?? 0) >= 25)).toBe(true);
163:     // Its example informative references include MITRE ATLAS mitigations and the OWASP LLM Top 10.
164:     const refs = o.entries.flatMap((e) => e.refs);
165:     expect(refs.some((r) => r.scheme === "atlas" && /^AML\.M\d{4}$/.test(r.id ?? ""))).toBe(true);
166:     expect(refs.some((r) => r.scheme === "owasp-llm" && r.id === "LLM03")).toBe(true);
167:   });
168:
169:   it("COSAiS predictive-AI overlay (annotated outline): 59 SP 800-53 controls, 11 annotated", () => {
170:     const o = registry.overlay("nist-cosais-predictive-ai")!;
171:     expect(o.frameworkId).toBe("nist-sp-800-53-r5");
172:     expect(o.entries).toHaveLength(59);
173:     const annotated = o.entries.filter((e) => e.control?.annotated);
174:     expect(annotated.map((e) => e.nodeId.split(":")[1])).toEqual(["AC-6", "CM-2", "CM-4", "RA-5", "SA-11(2)", "SA-15(1)", "SA-15(8)", "SC-5(3)", "SC-7(10)", "SI-3(8)", "SI-4(2)"]);
175:     for (const e of o.entries) expect(registry.node(e.nodeId)?.frameworkId, e.nodeId).toBe("nist-sp-800-53-r5");
176:     expect(o.scope?.lifecyclePhases).toEqual(["Model Training", "Model Deployment", "Model Maintenance", "Continuous"]);
177:     expect(annotated.every((e) => e.control?.attackIds?.every((id) => /^NISTAML\.\d{2,3}$/.test(id)) ?? true)).toBe(true);
178:   });
179:
180:   it("indexes overlay entries by node", () => {
181:     const at = registry.overlaysOf("nist-sp-800-53-r5:AC-6").map((x) => x.overlay.id);
182:     expect(at).toContain("nist-cosais-predictive-ai");
183:     expect(registry.overlaysOf("nist-csf-2.0:GV.OC-01").map((x) => x.overlay.id)).toContain("nist-ir-8596-iprd");
184:   });
185: });
186:
187: describe("AI threat catalogs", () => {
188:   const kinds = (id: string) => registry.framework(id)!.graph.nodes.reduce<Record<string, number>>((acc, n) => ((acc[n.kind] = (acc[n.kind] ?? 0) + 1), acc), {});
189:
190:   it("MITRE ATLAS 2026.09: 16 tactics, 120 techniques, 88 sub-techniques, 40 mitigations", () => {
191:     const atlas = registry.framework("mitre-atlas")!;
192:     expect(atlas.graph.framework.family).toBe("threat");
193:     expect(atlas.graph.framework.version).toBe("2026.09");
194:     expect(kinds("mitre-atlas")).toMatchObject({ tactic: 16, technique: 120, "sub-technique": 88, mitigation: 40 });
195:     expect(atlas.assessable).toHaveLength(208);
196:     // Matrix order starts with Reconnaissance; a technique sits under its first tactic and keeps every tactic it serves.
197:     expect(atlas.roots()[0]!.code).toBe("AML.TA0002");
198:     const techniques = atlas.graph.nodes.filter((n) => n.kind === "technique");
199:     for (const n of techniques) expect((n.attributes!["tactics"] as string[])[0]).toBe(n.parentId);
200:     expect(techniques.some((n) => (n.attributes!["tactics"] as string[]).length > 1)).toBe(true);
201:     expect(atlas.graph.framework.contentNotice).toMatch(/Apache License 2\.0/);
202:   });
203:
204:   it("OWASP LLM Top 10: the 2026 edition is current, 2025 is kept with its lineage", () => {
205:     const owasp = registry.framework("owasp-llm-top10")!;
206:     expect(kinds("owasp-llm-top10")).toMatchObject({ edition: 2, risk: 20 });
207:     expect(owasp.assessable.map((n) => n.code)).toEqual(["LLM01", "LLM02", "LLM03", "LLM04", "LLM05", "LLM06", "LLM07", "LLM08", "LLM09", "LLM10"]);
208:     // 2026 renumbered the list: Supply Chain moved from LLM03 to LLM04.
209:     const supply = owasp.get("LLM04")!;
210:     expect(supply.title).toBe("Supply Chain");
211:     expect(supply.attributes?.["previousEdition"]).toMatchObject({ key: "LLM03:2025", nodeId: "owasp-llm-top10:LLM03-2025" });
212:     expect(owasp.get("LLM03-2025")!.attributes?.["nextEdition"]).toMatchObject({ key: "LLM04:2026" });
213:     expect(owasp.graph.framework.contentNotice).toMatch(/CC BY-SA 4\.0/);
214:   });
215:
216:   it("OWASP Agentic Top 10 2026 and NIST AI 100-2 E2025", () => {
217:     expect(registry.framework("owasp-agentic-top10")!.assessable.map((n) => n.code)).toEqual(["ASI01", "ASI02", "ASI03", "ASI04", "ASI05", "ASI06", "ASI07", "ASI08", "ASI09", "ASI10"]);
218:     expect(kinds("nist-ai-100-2")).toMatchObject({ objective: 5, attack: 25 });
219:   });
220:
221:   it("keeps every published link with its authority and status, apart from the requirement crosswalk", () => {
222:     const sets = registry.threatLinks.sets;
223:     const count = (authority: RegExp, status: string) => sets.filter((s) => authority.test(s.authority) && s.status === status).reduce((n, s) => n + s.mappings.length, 0);
224:     expect(count(/^MITRE ATLAS/, "final")).toBe(361);
225:     expect(count(/^NIST COSAiS/, "draft")).toBe(21);
226:     expect(count(/^OWASP LLM Top 10 2026/, "final")).toBe(102);
227:     expect(count(/unreviewed/, "unreviewed")).toBe(237);
228:     for (const set of sets) for (const m of set.mappings) {
229:       expect(registry.node(m.source), m.source).toBeDefined();
230:       expect(registry.node(m.target), m.target).toBeDefined();
231:     }
232:     // Threat links never enter the requirement crosswalk.
233:     expect(registry.crosswalk.sets.some((s) => s.id.startsWith("threat--"))).toBe(false);
234:     const threat = new Set(registry.frameworks.filter((f) => f.family === "threat").map((f) => f.id));
235:     const fw = (id: string) => id.slice(0, id.lastIndexOf(":"));
236:     expect(registry.crosswalk.sets.flatMap((s) => s.mappings).filter((m) => threat.has(fw(m.source)) || threat.has(fw(m.target)))).toEqual([]);
237:     const gvoc = registry.threatLinks.of("nist-csf-2.0:GV.OC-01");
238:     expect(gvoc.some((l) => l.nodeId === "mitre-atlas:AML.M0020" && l.status === "draft")).toBe(true);
239:     // Catalogs Visua does not model are kept as references on the threat.
240:     const refs = registry.node("owasp-llm-top10:LLM01")!.attributes?.["externalRefs"] as { scheme: string }[];
241:     expect(new Set(refs.map((r) => r.scheme))).toEqual(new Set(["mitre-attack", "cwe", "csa-aicm", "owasp-aivss", "owasp-genai-data-security", "nist-ai-600-1"]));
242:   });
243: });
244:
245: describe.skipIf(!registry.framework("us-state-ai-laws"))("U.S. state AI laws", () => {
246:   const laws = registry.framework("us-state-ai-laws")!;
247:   const byKind = (k: string) => laws?.graph.nodes.filter((n) => n.kind === k) ?? [];
248:
249:   it("26 laws in 8 jurisdictions with 187 obligations quoted from the statutes and regulations", () => {
250:     expect(laws.graph.framework.family).toBe("law");
251:     expect(byKind("jurisdiction").map((n) => n.code)).toEqual(["CA", "CO", "IL", "ME", "NY", "NYC", "TX", "UT"]);
252:     expect(byKind("law")).toHaveLength(26);
253:     expect(byKind("obligation")).toHaveLength(187);
254:     expect(laws.assessable).toHaveLength(187);
255:     // Codes are node ids: unique, short and stable.
256:     const codes = byKind("law").map((n) => n.code);
257:     expect(new Set(codes).size).toBe(codes.length);
258:     expect(codes.every((c) => /^[A-Z]{2,3}-[A-Z0-9-]+$/.test(c) && c.length <= 20)).toBe(true);
259:     expect(codes).toEqual(expect.arrayContaining(["TX-TRAIGA", "CA-TFAIA", "CO-SB26-189", "NY-RAISE", "NYC-AEDT", "UT-HB276-PROVENANCE", "UT-HB276-VOYEURISM"]));
260:   });
261:
262:   it("cites every obligation to its section and page, and names the roles it falls on", () => {
263:     const docs = new Set(loadCorpusManifests().flatMap((m) => m.documents.map((d) => d.id)));
264:     for (const o of byKind("obligation")) {
265:       expect(docs.has(o.citation.documentId), `${o.code} → ${o.citation.documentId}`).toBe(true);
266:       expect(o.citation.locator, o.code).toBeTruthy();
267:       expect(o.citation.page, o.code).toBeGreaterThan(0);
268:       expect((o.attributes?.["roles"] as string[]).length, o.code).toBeGreaterThan(0);
269:       expect(o.text.length, o.code).toBeGreaterThan(20);
270:     }
271:   });
272:
273:   it("keeps an enjoined law with its status and no obligations to track", () => {
274:     const co = laws.get("CO-SB24-205")!;
275:     expect(co.attributes?.["status"]).toBe("enjoined");
276:     expect(laws.childrenOf(co.id)).toHaveLength(0);
277:     expect(laws.get("TX-TRAIGA")!.attributes?.["safeHarbors"]).toEqual(expect.arrayContaining([expect.objectContaining({ references: expect.arrayContaining([expect.stringMatching(/600-1/)]) })]));
278:   });
279: });

FILE packages/core/src/access.ts SHA256 a1c10babf8b00c16929ddf7d238b199c217088f34c0287aef115e6b2a57bd64e
1: /**
2:  * Tenancy and access control. A tenant is an organization (a company, or a
3:  * consultancy's client); users belong to tenants through memberships, each
4:  * with one role. Roles map to capabilities; the API checks capabilities.
5:  */
6:
7: export const ROLES = ["owner", "admin", "approver", "contributor", "auditor", "viewer"] as const;
8: export type Role = (typeof ROLES)[number];
9:
10: export type Capability =
11:   /** See workspaces, frameworks, tasks, evidence, activity. */
12:   | "workspace.read"
13:   /** Download reports, OSCAL, CSVs and PBC lists. */
14:   | "workspace.export"
15:   /** Assess requirements (levels, priority, owner, notes), manage tasks, upload evidence, draft policies, run agents and connectors. */
16:   | "work.write"
17:   /** Decide agent proposals, approve policies, accept evidence, mark requirements not applicable or verified, categorize, tailor and authorize. */
18:   | "work.approve"
19:   /** Create and delete workspaces; enable frameworks; set scope, autonomy and the trust center. */
20:   | "workspace.configure"
21:   /** Manage members (except owners), API tokens, and run SSO connections (enable, disable, provisioning). */
22:   | "tenant.manage"
23:   /** Manage owners and organization-wide security settings, including which identity provider SSO trusts. */
24:   | "tenant.own";
25:
26: const READ: Capability[] = ["workspace.read"];
27: const AUDIT: Capability[] = [...READ, "workspace.export"];
28: const WRITE: Capability[] = [...AUDIT, "work.write"];
29: const APPROVE: Capability[] = [...WRITE, "work.approve"];
30: const ADMIN: Capability[] = [...APPROVE, "workspace.configure", "tenant.manage"];
31:
32: export const ROLE_CAPABILITIES: Record<Role, readonly Capability[]> = {
33:   owner: [...ADMIN, "tenant.own"],
34:   admin: ADMIN,
35:   approver: APPROVE,
36:   contributor: WRITE,
37:   auditor: AUDIT,
38:   viewer: READ,
39: };
40:
41: export const ROLE_LABELS: Record<Role, { name: string; description: string }> = {
42:   owner: { name: "Owner", description: "Full control, including owners, organization security settings and SSO identity providers." },
43:   admin: { name: "Admin", description: "Workspaces, frameworks, members, API tokens and running single sign-on." },
44:   approver: { name: "Approver", description: "Decides agent proposals, approves policies and evidence, scopes and verifies requirements, records authorization decisions." },
45:   contributor: { name: "Contributor", description: "Assesses requirements, runs agents and connectors, manages tasks, evidence and drafts." },
46:   auditor: { name: "Auditor", description: "Read-only access with exports and audit-trail verification." },
47:   viewer: { name: "Viewer", description: "Read-only access to dashboards and the 3D views." },
48: };
49:
50: export function can(role: Role | undefined, capability: Capability): boolean {
51:   return !!role && ROLE_CAPABILITIES[role].includes(capability);
52: }
53:
54: /** Rank for "may this role grant that role" checks: nobody grants above their own rank. */
55: export const roleRank = (role: Role): number => ROLES.length - ROLES.indexOf(role);
56:
57: export interface TenantSettings {
58:   /** Only sessions from this tenant's own SSO connection may access it. */
59:   requireSso?: boolean;
60: }
61:
62: export interface Tenant {
63:   id: string;
64:   slug: string;
65:   name: string;
66:   settings: TenantSettings;
67:   createdAt: string;
68:   updatedAt: string;
69: }
70:
71: export interface User {
72:   id: string;
73:   /** Lower-case. */
74:   email: string;
75:   name: string;
76:   disabled?: boolean;
77:   lastLoginAt?: string;
78:   createdAt: string;
79:   updatedAt: string;
80: }
81:
82: export interface Membership {
83:   tenantId: string;
84:   userId: string;
85:   role: Role;
86:   addedBy?: string;
87:   createdAt: string;
88:   updatedAt: string;
89: }

FILE packages/core/src/crosswalk.ts SHA256 2d28065612fc08dd51d509ee81d2b3462ff90e2efcd63f46defe67ae2a80395c
1: /**
2:  * Crosswalk engine: "do the work once, satisfy many frameworks".
3:  *
4:  * Mapping sets come from authoritative sources (NIST CSF 2.0 informative
5:  * references to SP 800-53 via CPRT/OLIR, AICPA TSC mapping spreadsheets).
6:  * The engine indexes them bidirectionally and projects implementation
7:  * progress from one framework onto another with explicit confidence.
8:  */
9: import { frameworkOf } from "./graph.ts";
10: import type { Mapping, MappingRelationship, MappingSet, RequirementState } from "./types.ts";
11:
12: const INVERSE: Record<MappingRelationship, MappingRelationship> = {
13:   equivalent: "equivalent",
14:   "subset-of": "superset-of",
15:   "superset-of": "subset-of",
16:   "intersects-with": "intersects-with",
17:   "related-to": "related-to",
18:   supports: "related-to",
19: };
20:
21: /** How much implementation of the source says about the target (0..1). */
22: const STRENGTH: Record<MappingRelationship, number> = {
23:   equivalent: 1,
24:   "superset-of": 0.9,
25:   "subset-of": 0.6,
26:   "intersects-with": 0.5,
27:   supports: 0.4,
28:   "related-to": 0.35,
29: };
30:
31: export interface Edge {
32:   from: string;
33:   to: string;
34:   relationship: MappingRelationship;
35:   authority: string;
36:   mappingSetId: string;
37: }
38:
39: export class CrosswalkIndex {
40:   private readonly out = new Map<string, Edge[]>();
41:   readonly sets: MappingSet[];
42:
43:   constructor(sets: MappingSet[]) {
44:     this.sets = sets;
45:     for (const set of sets) {
46:       for (const m of set.mappings) {
47:         this.add({ from: m.source, to: m.target, relationship: m.relationship, authority: m.origin.authority, mappingSetId: set.id });
48:         this.add({ from: m.target, to: m.source, relationship: INVERSE[m.relationship], authority: m.origin.authority, mappingSetId: set.id });
49:       }
50:     }
51:   }
52:
53:   private add(edge: Edge) {
54:     const list = this.out.get(edge.from);
55:     if (list) {
56:       if (!list.some((e) => e.to === edge.to && e.mappingSetId === edge.mappingSetId)) list.push(edge);
57:     } else this.out.set(edge.from, [edge]);
58:   }
59:
60:   /** Direct mappings of a node, optionally restricted to one target framework. */
61:   related(nodeId: string, targetFramework?: string): Edge[] {
62:     const edges = this.out.get(nodeId) ?? [];
63:     return targetFramework ? edges.filter((e) => frameworkOf(e.to) === targetFramework) : edges;
64:   }
65:
66:   /** Nodes reachable in up to `depth` hops (e.g. TSC → CSF → SP 800-53). */
67:   reach(nodeId: string, depth = 2): Map<string, { via: string[]; strength: number }> {
68:     const result = new Map<string, { via: string[]; strength: number }>();
69:     // `via` holds the intermediate nodes between the start node and the reached node.
70:     let frontier: { id: string; via: string[]; strength: number }[] = [{ id: nodeId, via: [], strength: 1 }];
71:     for (let d = 0; d < depth; d++) {
72:       const next: typeof frontier = [];
73:       for (const f of frontier) {
74:         const via = f.id === nodeId ? [] : [...f.via, f.id];
75:         for (const e of this.out.get(f.id) ?? []) {
76:           if (e.to === nodeId) continue;
77:           const strength = f.strength * STRENGTH[e.relationship];
78:           const prev = result.get(e.to);
79:           if (!prev || prev.strength < strength) {
80:             result.set(e.to, { via, strength });
81:             next.push({ id: e.to, via, strength });
82:           }
83:         }
84:       }
85:       frontier = next;
86:     }
87:     return result;
88:   }
89:
90:   get size(): number {
91:     let n = 0;
92:     for (const list of this.out.values()) n += list.length;
93:     return n / 2;
94:   }
95: }
96:
97: export interface ProjectedLevel {
98:   nodeId: string;
99:   /** Suggested level on the target framework's 0–4 scale. */
100:   suggested: number;
101:   confidence: "low" | "medium" | "high";
102:   sources: { nodeId: string; level: number; relationship: MappingRelationship }[];
103: }
104:
105: /**
106:  * Project progress from source requirement states onto target nodes.
107:  * Uses the strongest-evidence source; confidence reflects relationship types
108:  * and how many independent sources agree.
109:  */
110: export function projectLevels(
111:   crosswalk: CrosswalkIndex,
112:   targetNodeIds: string[],
113:   sourceStates: Map<string, RequirementState>,
114: ): ProjectedLevel[] {
115:   const out: ProjectedLevel[] = [];
116:   for (const nodeId of targetNodeIds) {
117:     const sources: ProjectedLevel["sources"] = [];
118:     let best = 0;
119:     let weighted = 0;
120:     let weights = 0;
121:     for (const edge of crosswalk.related(nodeId)) {
122:       const s = sourceStates.get(edge.to);
123:       if (!s || !s.applicable) continue;
124:       sources.push({ nodeId: edge.to, level: s.current, relationship: edge.relationship });
125:       const strength = STRENGTH[edge.relationship];
126:       best = Math.max(best, s.current * strength);
127:       weighted += s.current * strength;
128:       weights += strength;
129:     }
130:     if (!sources.length) continue;
131:     const mean = weights ? weighted / weights : 0;
132:     const suggested = Math.round(Math.min(4, (best + mean) / 2));
133:     const strong = sources.filter((s) => STRENGTH[s.relationship] >= 0.9).length;
134:     const confidence = strong >= 1 && sources.length >= 2 ? "high" : sources.length >= 2 || strong >= 1 ? "medium" : "low";
135:     out.push({ nodeId, suggested, confidence, sources });
136:   }
137:   return out;
138: }
139:
140: /** Share of target nodes that have at least one mapping into the source framework. */
141: export function mappingCoverage(crosswalk: CrosswalkIndex, targetNodeIds: string[], sourceFramework: string): number {
142:   if (!targetNodeIds.length) return 0;
143:   const covered = targetNodeIds.filter((id) => crosswalk.related(id, sourceFramework).length > 0).length;
144:   return covered / targetNodeIds.length;
145: }
146:
147: export function mappingsToEdges(set: MappingSet): Mapping[] {
148:   return set.mappings;
149: }

FILE packages/core/src/graph.ts SHA256 d8bb2955f1f536f12cda0bed218aef53f16cff91c723db2015347ec4fe679b1d
1: import type { FrameworkGraph, RequirementNode } from "./types.ts";
2:
3: /** Fast, immutable lookups over a framework graph. */
4: export class FrameworkIndex {
5:   readonly graph: FrameworkGraph;
6:   readonly byId = new Map<string, RequirementNode>();
7:   readonly byCode = new Map<string, RequirementNode>();
8:   readonly children = new Map<string | null, RequirementNode[]>();
9:   readonly assessable: RequirementNode[] = [];
10:
11:   constructor(graph: FrameworkGraph) {
12:     this.graph = graph;
13:     for (const node of graph.nodes) {
14:       this.byId.set(node.id, node);
15:       this.byCode.set(node.code.toUpperCase(), node);
16:       const siblings = this.children.get(node.parentId) ?? [];
17:       siblings.push(node);
18:       this.children.set(node.parentId, siblings);
19:       if (node.assessable && !node.withdrawn) this.assessable.push(node);
20:     }
21:     for (const list of this.children.values()) list.sort((a, b) => a.order - b.order);
22:   }
23:
24:   get id(): string {
25:     return this.graph.framework.id;
26:   }
27:
28:   roots(): RequirementNode[] {
29:     return this.children.get(null) ?? [];
30:   }
31:
32:   childrenOf(id: string): RequirementNode[] {
33:     return this.children.get(id) ?? [];
34:   }
35:
36:   get(idOrCode: string): RequirementNode | undefined {
37:     return this.byId.get(idOrCode) ?? this.byCode.get(idOrCode.toUpperCase());
38:   }
39:
40:   ancestors(id: string): RequirementNode[] {
41:     const out: RequirementNode[] = [];
42:     let node = this.byId.get(id);
43:     while (node?.parentId) {
44:       const parent = this.byId.get(node.parentId);
45:       if (!parent) break;
46:       out.unshift(parent);
47:       node = parent;
48:     }
49:     return out;
50:   }
51:
52:   /** All assessable (unit-of-work) descendants of a node, or the node itself. */
53:   assessableUnder(id: string): RequirementNode[] {
54:     const node = this.byId.get(id);
55:     if (!node) return [];
56:     if (node.assessable && !node.withdrawn) {
57:       // Assessable nodes may still have assessable children (e.g. 800-53 enhancements).
58:       return [node, ...this.descendants(id).filter((n) => n.assessable && !n.withdrawn)];
59:     }
60:     return this.descendants(id).filter((n) => n.assessable && !n.withdrawn);
61:   }
62:
63:   descendants(id: string): RequirementNode[] {
64:     const out: RequirementNode[] = [];
65:     const stack = [...this.childrenOf(id)].reverse();
66:     while (stack.length) {
67:       const node = stack.pop()!;
68:       out.push(node);
69:       const kids = this.childrenOf(node.id);
70:       for (let i = kids.length - 1; i >= 0; i--) stack.push(kids[i]!);
71:     }
72:     return out;
73:   }
74:
75:   /** Depth-first traversal in display order. */
76:   walk(visit: (node: RequirementNode, depth: number) => void): void {
77:     const recur = (parentId: string | null, depth: number) => {
78:       for (const node of this.children.get(parentId) ?? []) {
79:         visit(node, depth);
80:         recur(node.id, depth + 1);
81:       }
82:     };
83:     recur(null, 0);
84:   }
85:
86:   /** Simple scored text search over codes, titles and statements. */
87:   search(query: string, limit = 20): RequirementNode[] {
88:     const q = query.trim().toLowerCase();
89:     if (!q) return [];
90:     const terms = q.split(/\s+/).filter(Boolean);
91:     const scored: { node: RequirementNode; score: number }[] = [];
92:     for (const node of this.graph.nodes) {
93:       const code = node.code.toLowerCase();
94:       const hay = `${node.title} ${node.text}`.toLowerCase();
95:       let score = 0;
96:       if (code === q) score += 100;
97:       else if (code.startsWith(q)) score += 50;
98:       for (const term of terms) {
99:         if (code.includes(term)) score += 10;
100:         if (node.title.toLowerCase().includes(term)) score += 6;
101:         if (hay.includes(term)) score += 2;
102:       }
103:       if (score > 0) scored.push({ node, score: score - node.depth * 0.1 });
104:     }
105:     return scored.sort((a, b) => b.score - a.score).slice(0, limit).map((s) => s.node);
106:   }
107: }
108:
109: export function nodeId(frameworkId: string, code: string): string {
110:   return `${frameworkId}:${code}`;
111: }
112:
113: export function frameworkOf(id: string): string {
114:   const i = id.lastIndexOf(":");
115:   return i === -1 ? "" : id.slice(0, i);
116: }
117:
118: export function codeOf(id: string): string {
119:   const i = id.lastIndexOf(":");
120:   return i === -1 ? id : id.slice(i + 1);
121: }

FILE packages/core/src/ids.ts SHA256 59d7ac4b3e9cff2e804400644697a0ba07033023be738b409e5551c35cdf7cbd
1: const ALPHABET = "0123456789abcdefghijklmnopqrstuvwxyz";
2:
3: /** Short, URL-safe, time-sortable id: `<prefix>_<time36><random>`. Works in Node and browsers. */
4: export function newId(prefix: string): string {
5:   const time = Date.now().toString(36).padStart(9, "0");
6:   const bytes = new Uint8Array(8);
7:   globalThis.crypto.getRandomValues(bytes);
8:   let rand = "";
9:   for (const b of bytes) rand += ALPHABET[b % ALPHABET.length];
10:   return `${prefix}_${time}${rand}`;
11: }
12:
13: export function slugify(input: string): string {
14:   return input
15:     .toLowerCase()
16:     .normalize("NFKD")
17:     .replace(/[̀-ͯ]/g, "")
18:     .replace(/[^a-z0-9]+/g, "-")
19:     .replace(/^-+|-+$/g, "")
20:     .slice(0, 64);
21: }

FILE packages/core/src/index.ts SHA256 ffc588ab695497ab64505d7aa773610c90e3d7a4100f5fb9037ef9820abacc2d
1: export * from "./types.ts";
2: export * from "./levels.ts";
3: export * from "./graph.ts";
4: export * from "./status.ts";
5: export * from "./scoring.ts";
6: export * from "./planner.ts";
7: export * from "./crosswalk.ts";
8: export * from "./recommend.ts";
9: export * from "./ids.ts";
10: export * from "./tiers.ts";
11: export * from "./rmf.ts";
12: export * from "./access.ts";
13: export * from "./overlays.ts";
14: export * from "./trust.ts";
15: export * from "./laws.ts";

FILE packages/core/src/laws.ts SHA256 33f28bbd4e1532e35e68230480f5aad93b7dcaff2864332c07780eb66c464fd0
1: import type { RequirementNode } from "./types.ts";
2:
3: /**
4:  * When a statutory obligation binds: upcoming before its effective date, in force from
5:  * it, ended after its `until` date (a sunset or a replaced provision). Dates are
6:  * ISO days (YYYY-MM-DD) compared as strings; `today` is today's date in UTC.
7:  */
8: export type ObligationTiming = "upcoming" | "in-force" | "ended";
9:
10: export function obligationTiming(node: Pick<RequirementNode, "attributes">, today: string): ObligationTiming {
11:   const effective = node.attributes?.["effective"] as string | undefined;
12:   const until = node.attributes?.["until"] as string | undefined;
13:   if (until && until < today) return "ended";
14:   if (effective && effective > today) return "upcoming";
15:   return "in-force";
16: }

FILE packages/core/src/levels.ts SHA256 78f0ee61440af2d9bf70210ffeb051f37dafb95c6fa302bba46b1ed50045ca01
1: import type { FrameworkFamily } from "./types.ts";
2:
3: export interface LevelDefinition {
4:   level: number;
5:   label: string;
6:   description: string;
7: }
8:
9: export interface LevelScale {
10:   family: FrameworkFamily;
11:   name: string;
12:   /** Why this scale exists and what it is (and is not) grounded in. */
13:   basis: string;
14:   levels: LevelDefinition[];
15: }
16:
17: /**
18:  * NIST CSF 2.0 does not prescribe a per-outcome maturity scale. Visua uses a
19:  * Tier-aligned implementation scale so that Organizational Profiles (current vs.
20:  * target) read naturally against the four CSF Tiers (CSWP 29, §3.2 / Appendix B).
21:  */
22: export const CSF_SCALE: LevelScale = {
23:   family: "csf",
24:   name: "Tier-aligned implementation level",
25:   basis:
26:     "Visua convention aligned to the CSF 2.0 Tier characteristics (Partial, Risk Informed, Repeatable, Adaptive). " +
27:     "CSF Tiers officially characterize organization-wide governance and management practices; Visua applies the same " +
28:     "vocabulary per outcome so current and target Organizational Profiles can be compared.",
29:   levels: [
30:     { level: 0, label: "Not performed", description: "The outcome is not being achieved and no practice exists." },
31:     {
32:       level: 1,
33:       label: "Partial",
34:       description: "Ad hoc and reactive. The outcome is achieved inconsistently, with limited awareness of the risk.",
35:     },
36:     {
37:       level: 2,
38:       label: "Risk Informed",
39:       description:
40:         "Practices are approved by management and informed by risk, but not yet established as organization-wide policy.",
41:     },
42:     {
43:       level: 3,
44:       label: "Repeatable",
45:       description:
46:         "Formally approved and expressed as policy; consistently implemented and regularly updated as requirements change.",
47:     },
48:     {
49:       level: 4,
50:       label: "Adaptive",
51:       description:
52:         "Continuously improved using lessons learned and predictive indicators; part of the organizational culture.",
53:     },
54:   ],
55: };
56:
57: /** SOC 2: design → implementation (Type I) → operating effectiveness (Type II). */
58: export const SOC2_SCALE: LevelScale = {
59:   family: "soc2",
60:   name: "Control readiness",
61:   basis:
62:     "Visua convention mirroring the SOC 2 examination: a Type 1 report addresses the suitability of design of controls " +
63:     "at a point in time; a Type 2 report additionally addresses operating effectiveness over a period.",
64:   levels: [
65:     { level: 0, label: "Not designed", description: "No control addresses the criterion yet." },
66:     { level: 1, label: "Designed", description: "Controls are designed and documented but not yet in operation." },
67:     { level: 2, label: "Implemented", description: "Controls are in place at a point in time — Type 1 ready." },
68:     {
69:       level: 3,
70:       label: "Operating",
71:       description: "Controls operate consistently with evidence across the observation period — Type 2 ready.",
72:     },
73:     { level: 4, label: "Assured", description: "Tested without exceptions (internal or auditor testing)." },
74:   ],
75: };
76:
77: /** SP 800-53 / RMF: aligned to OSCAL implementation-status and SP 800-53A outcomes. */
78: export const RMF_SCALE: LevelScale = {
79:   family: "rmf",
80:   name: "Control implementation status",
81:   basis:
82:     "Aligned to OSCAL SSP implementation-status tokens (planned, partial, implemented) and SP 800-53A assessment " +
83:     "determinations (satisfied / other than satisfied).",
84:   levels: [
85:     { level: 0, label: "Not implemented", description: "The control is not implemented and not yet planned." },
86:     { level: 1, label: "Planned", description: "Implementation is planned (OSCAL: planned)." },
87:     { level: 2, label: "Partially implemented", description: "Some parts of the control are in place (OSCAL: partial)." },
88:     { level: 3, label: "Implemented", description: "The control is fully implemented (OSCAL: implemented)." },
89:     {
90:       level: 4,
91:       label: "Assessed — satisfied",
92:       description: "SP 800-53A assessment determined all objectives are satisfied.",
93:     },
94:   ],
95: };
96:
97: /**
98:  * NIST AI RMF 1.0 defines outcomes (functions, categories, subcategories) but no
99:  * implementation tiers or maturity levels. Visua tracks each outcome on its own
100:  * scale, from not addressed to measured and continually improved.
101:  */
102: export const AI_SCALE: LevelScale = {
103:   family: "ai",
104:   name: "AI RMF outcome implementation",
105:   basis:
106:     "Visua convention. The AI RMF (NIST AI 100-1) sets outcomes without tiers or maturity levels; this scale records " +
107:     "how far each outcome is achieved across the organization's AI systems, from not addressed to measured and improved.",
108:   levels: [
109:     { level: 0, label: "Not addressed", description: "No practice addresses the outcome for in-scope AI systems." },
110:     { level: 1, label: "Initial", description: "Ad hoc practices exist for some AI systems; not documented or consistently applied." },
111:     {
112:       level: 2,
113:       label: "Defined",
114:       description: "Policies, roles and procedures for the outcome are documented and applied to the highest-risk AI systems.",
115:     },
116:     {
117:       level: 3,
118:       label: "Implemented",
119:       description: "Applied consistently across the AI portfolio and lifecycle, with accountable owners and documentation.",
120:     },
121:     {
122:       level: 4,
123:       label: "Measured and improving",
124:       description: "Effectiveness is measured (testing, evaluation, monitoring) and practices improve from incidents, feedback and metrics.",
125:     },
126:   ],
127: };
128:
129: /**
130:  * Statutory obligations have no maturity levels. This scale records progress
131:  * toward meeting each obligation; it is not a legal determination.
132:  */
133: export const LAW_SCALE: LevelScale = {
134:   family: "law",
135:   name: "Obligation status",
136:   basis:
137:     "Visua convention. Laws impose obligations without maturity levels; this scale records how far the organization has " +
138:     "gone in meeting each obligation that applies to it. It is not legal advice or a determination of compliance.",
139:   levels: [
140:     { level: 0, label: "Not addressed", description: "No measure addresses the obligation yet." },
141:     { level: 1, label: "Planned", description: "An owner and an approach are agreed; measures are not yet in place." },
142:     { level: 2, label: "Partially met", description: "Measures are in place for some in-scope systems, products or activities." },
143:     { level: 3, label: "Met", description: "Measures are in place for everything in scope and documented." },
144:     { level: 4, label: "Met and reviewed", description: "Met, evidenced, and periodically reviewed (for example by counsel or internal audit)." },
145:   ],
146: };
147:
148: /**
149:  * Threat catalogs are never assessed. Coverage is derived from the workspace's
150:  * implementation of the requirements that authorities link to each threat.
151:  */
152: export const THREAT_SCALE: LevelScale = {
153:   family: "threat",
154:   name: "Coverage",
155:   basis:
156:     "Derived, not assessed: the implementation of the requirements that the publishing authorities (NIST, MITRE, OWASP) link " +
157:     "to the threat, in the frameworks the workspace follows. Coverage is not a guarantee of protection.",
158:   levels: [
159:     { level: 0, label: "None", description: "No linked requirement is implemented." },
160:     { level: 1, label: "Minimal", description: "Linked requirements are mostly not started." },
161:     { level: 2, label: "Partial", description: "Linked requirements are partly implemented." },
162:     { level: 3, label: "Substantial", description: "Most linked requirements are implemented." },
163:     { level: 4, label: "Full", description: "All linked requirements are at their targets." },
164:   ],
165: };
166:
167: export const LEVEL_SCALES: Record<FrameworkFamily, LevelScale> = {
168:   csf: CSF_SCALE,
169:   soc2: SOC2_SCALE,
170:   rmf: RMF_SCALE,
171:   ai: AI_SCALE,
172:   law: LAW_SCALE,
173:   threat: THREAT_SCALE,
174: };
175:
176: export const MAX_LEVEL = 4;
177:
178: export function levelLabel(family: FrameworkFamily, level: number): string {
179:   return LEVEL_SCALES[family].levels.find((l) => l.level === level)?.label ?? `Level ${level}`;
180: }
181:
182: export function clampLevel(level: number): number {
183:   if (!Number.isFinite(level)) return 0;
184:   return Math.max(0, Math.min(MAX_LEVEL, Math.round(level)));
185: }

FILE packages/core/src/overlays.ts SHA256 1e1f48b154ad8957758a8d9927deeb708156e6dfa70a0dc2de25e9674510fdc4
1: /**
2:  * Overlays: official documents that specialize an existing framework without
3:  * being frameworks themselves. A community profile (the NIST Cyber AI Profile
4:  * on CSF 2.0) sets priorities and considerations per subcategory and focus
5:  * area; a control overlay (NIST COSAiS on SP 800-53) selects and tailors
6:  * controls for a use case. Entries attach to the framework's own nodes, so
7:  * the workspace's assessment, evidence and tasks stay in one place.
8:  */
9: import type { CorpusCitation } from "./types.ts";
10:
11: export interface OverlayLens {
12:   /** e.g. "secure", "defend", "thwart" */
13:   id: string;
14:   short: string;
15:   title: string;
16:   description: string;
17:   citation: CorpusCitation;
18: }
19:
20: export interface OverlayPriorityLevel {
21:   level: number;
22:   label: string;
23:   description: string;
24: }
25:
26: /** A reference printed in the overlay (ATLAS mitigation, OWASP entry, SP 800-53 control…). */
27: export interface OverlayReference {
28:   scheme: string;
29:   id: string | null;
30:   text: string;
31:   /** Which part of the entry printed it: "general" or a lens id. */
32:   column?: string;
33: }
34:
35: export interface OverlayLensEntry {
36:   priority?: number;
37:   considerations?: string;
38:   opportunities?: string;
39:   references: string[];
40:   referencesNote?: string;
41: }
42:
43: export interface OverlayControlEntry {
44:   inSummaryTable: boolean;
45:   annotated: boolean;
46:   proposedAdditional: boolean;
47:   lifecyclePhases?: string[];
48:   selectedInModerateBaseline?: string;
49:   assumptions?: string;
50:   tailoring?: { controlRequirement: boolean; organizationDefinedParameter: boolean; discussion: boolean };
51:   tailoringSections?: { label: string; text: string }[];
52:   /** NIST AI 100-2 attack ids, normalized (e.g. "NISTAML.011"). */
53:   attackIds?: string[];
54: }
55:
56: export interface OverlayEntry {
57:   /** Node of the target framework (e.g. "nist-csf-2.0:GV.OC-01"). */
58:   nodeId: string;
59:   citation: CorpusCitation;
60:   general?: { considerations?: string; note?: string; references?: string[]; sp80053?: string[] };
61:   lenses?: Record<string, OverlayLensEntry>;
62:   control?: OverlayControlEntry;
63:   refs: OverlayReference[];
64: }
65:
66: export interface FrameworkOverlay {
67:   id: string;
68:   /** The framework the overlay specializes. */
69:   frameworkId: string;
70:   kind: "community-profile" | "control-overlay";
71:   title: string;
72:   shortName: string;
73:   identifier: string;
74:   documentId: string;
75:   /** Publication status as NIST states it ("initial preliminary draft", "annotated outline"…). */
76:   status: string;
77:   /** Shown wherever the overlay is: drafts are not requirements. */
78:   notice: { text: string; citation: CorpusCitation };
79:   published?: string;
80:   landingPage?: string;
81:   lenses?: OverlayLens[];
82:   priorityLevels?: OverlayPriorityLevel[];
83:   scope?: { useCases?: { id: string; text: string; citation: CorpusCitation }[]; assumptions?: string[]; lifecyclePhases?: string[] };
84:   entries: OverlayEntry[];
85: }
86:
87: /** A workspace's adoption of an overlay. */
88: export interface OverlayAdoption {
89:   overlayId: string;
90:   /** Selected lenses (focus areas) for community profiles. */
91:   lenses?: string[];
92:   adoptedAt: string;
93:   adoptedBy: string;
94: }
95:
96: /** Highest priority (lowest number) an entry has across the given lenses. */
97: export function overlayPriority(entry: OverlayEntry | undefined, lenses: string[]): number | undefined {
98:   let best: number | undefined;
99:   for (const l of lenses) {
100:     const p = entry?.lenses?.[l]?.priority;
101:     if (p !== undefined && (best === undefined || p < best)) best = p;
102:   }
103:   return best;
104: }

FILE packages/core/src/planner.ts SHA256 06cbb841fec2c994b9b392989ed45887fdd030282d51df42a74aa4fbae275f3f
1: /**
2:  * Action planner: turns gaps (target > current) into a prioritized, scheduled
3:  * plan of tasks. Every task is grounded in official material — CSF 2.0
4:  * Implementation Examples, SOC 2 points of focus, or SP 800-53 statements /
5:  * SP 800-53A assessment objectives — and cites where it came from.
6:  */
7: import type { FrameworkIndex } from "./graph.ts";
8: import { PRIORITY_WEIGHT } from "./scoring.ts";
9: import type { AgentKind, ChecklistItem, Priority, RequirementNode, RequirementState, Task, TaskKind } from "./types.ts";
10:
11: export interface PlanOptions {
12:   workspaceId: string;
13:   startDate: Date;
14:   /** Hours per week the team can dedicate to compliance work. */
15:   weeklyCapacityHours: number;
16:   /** Only plan for these nodes (default: all assessable). */
17:   nodeIds?: string[];
18:   /** Skip nodes that already have open tasks. */
19:   existingTaskNodeIds?: Set<string>;
20:   maxTasks?: number;
21:   idFactory: () => string;
22:   now?: Date;
23: }
24:
25: const KIND_RULES: [RegExp, TaskKind][] = [
26:   [/\b(polic(y|ies))\b/i, "policy"],
27:   [/\b(train|awareness|educat)/i, "training"],
28:   [/\b(supplier|third[- ]part|vendor|acquisition|contract)/i, "vendor"],
29:   [/\b(monitor|detect|log(s|ging)?|alert|anomal)/i, "monitoring"],
30:   [/\b(assess|test|exercis|audit|review(ed)?|evaluat)/i, "assessment"],
31:   [/\b(role|responsibilit|authorit|oversight|strategy|mission|leadership|accountab|stakeholder|legal|regulatory)/i, "governance"],
32:   [/\b(procedure|process|plan(s|ned)?|playbook|runbook)/i, "procedure"],
33:   [/\b(configur|software|hardware|network|backup|encrypt|access|authenticat|credential|patch|vulnerab|inventor|platform|infrastructure|firmware)/i, "technical"],
34: ];
35:
36: export function inferTaskKind(text: string): TaskKind {
37:   for (const [re, kind] of KIND_RULES) if (re.test(text)) return kind;
38:   return "procedure";
39: }
40:
41: const BASE_EFFORT: Record<TaskKind, number> = {
42:   governance: 6,
43:   policy: 8,
44:   procedure: 8,
45:   technical: 16,
46:   evidence: 3,
47:   training: 6,
48:   assessment: 8,
49:   vendor: 10,
50:   monitoring: 12,
51: };
52:
53: const AUTOMATION: Partial<Record<TaskKind, { agent: AgentKind; action: string }>> = {
54:   policy: { agent: "policy-author", action: "draft-policy" },
55:   governance: { agent: "policy-author", action: "draft-policy" },
56:   procedure: { agent: "policy-author", action: "draft-procedure" },
57:   evidence: { agent: "evidence-collector", action: "collect-evidence" },
58:   assessment: { agent: "assessor", action: "assess-requirement" },
59:   monitoring: { agent: "evidence-collector", action: "run-checks" },
60:   technical: { agent: "task-executor", action: "implementation-guide" },
61:   training: { agent: "task-executor", action: "implementation-guide" },
62:   vendor: { agent: "task-executor", action: "implementation-guide" },
63: };
64:
65: /** Compact a requirement statement into a short task title fragment. */
66: export function shortStatement(text: string, max = 88): string {
67:   const clean = text.replace(/\s+/g, " ").trim().replace(/\.$/, "");
68:   if (clean.length <= max) return clean;
69:   const cut = clean.slice(0, max);
70:   const lastSpace = cut.lastIndexOf(" ");
71:   return `${cut.slice(0, lastSpace > 40 ? lastSpace : max)}…`;
72: }
73:
74: /** Checklist items from the node's official material. */
75: export function checklistFor(node: RequirementNode, idFactory: () => string): ChecklistItem[] {
76:   const items: string[] = [];
77:   if (node.examples?.length) items.push(...node.examples.map((e) => e.text));
78:   const actions = node.attributes?.["suggestedActions"];
79:   if (!items.length && Array.isArray(actions)) items.push(...(actions as string[]).slice(0, 8));
80:   const pof = node.attributes?.["pointsOfFocus"];
81:   if (Array.isArray(pof)) {
82:     // Point-of-focus titles only: concise checklist items (the full text stays on the requirement).
83:     for (const p of pof as { title?: string; text?: string }[]) items.push(p.title?.trim() || (p.text ?? ""));
84:   }
85:   const objectives = node.attributes?.["objectives"];
86:   if (!items.length && Array.isArray(objectives)) items.push(...(objectives as string[]).slice(0, 8));
87:   const statementItems = node.attributes?.["statementItems"];
88:   if (!items.length && Array.isArray(statementItems)) items.push(...(statementItems as string[]).slice(0, 8));
89:   if (!items.length) items.push(`Define how ${node.code} is achieved, who owns it, and what evidence proves it.`);
90:   items.push("Attach evidence and request verification.");
91:   return items.filter(Boolean).map((text) => ({ id: idFactory(), text, done: false }));
92: }
93:
94: function basisFor(node: RequirementNode): string {
95:   if (node.examples?.length) return "Official Implementation Examples";
96:   if (node.attributes?.["suggestedActions"]) return "AI RMF Playbook suggested actions";
97:   if (node.attributes?.["pointsOfFocus"]) return "AICPA points of focus";
98:   if (node.attributes?.["objectives"]) return "SP 800-53A assessment objectives";
99:   if (node.attributes?.["statementItems"]) return "SP 800-53 control statement";
100:   return "Requirement statement";
101: }
102:
103: /** Order functions/families so governance-type work is scheduled first. */
104: function topLevelOrder(index: FrameworkIndex, node: RequirementNode): number {
105:   const root = index.ancestors(node.id)[0] ?? node;
106:   if (/^GV/.test(root.code)) return 0;
107:   return 1 + root.order;
108: }
109:
110: export interface PlannedTask extends Omit<Task, "createdAt" | "updatedAt"> {}
111:
112: export function planTasks(
113:   index: FrameworkIndex,
114:   states: Map<string, RequirementState>,
115:   opts: PlanOptions,
116: ): PlannedTask[] {
117:   const wanted = opts.nodeIds ? new Set(opts.nodeIds) : null;
118:   const candidates = index.assessable.filter((node) => {
119:     if (wanted && !wanted.has(node.id)) return false;
120:     if (opts.existingTaskNodeIds?.has(node.id)) return false;
121:     const s = states.get(node.id);
122:     if (!s || !s.applicable) return false;
123:     return s.target > s.current;
124:   });
125:
126:   candidates.sort((a, b) => {
127:     const sa = states.get(a.id)!;
128:     const sb = states.get(b.id)!;
129:     const wa = PRIORITY_WEIGHT[sa.priority] * (sa.target - sa.current);
130:     const wb = PRIORITY_WEIGHT[sb.priority] * (sb.target - sb.current);
131:     if (wb !== wa) return wb - wa;
132:     const oa = topLevelOrder(index, a);
133:     const ob = topLevelOrder(index, b);
134:     if (oa !== ob) return oa - ob;
135:     return a.order - b.order;
136:   });
137:
138:   const limited = opts.maxTasks ? candidates.slice(0, opts.maxTasks) : candidates;
139:   const tasks: PlannedTask[] = [];
140:   const hoursPerDay = Math.max(1, opts.weeklyCapacityHours / 5);
141:   let cursor = new Date(opts.startDate);
142:
143:   for (const node of limited) {
144:     const state = states.get(node.id)!;
145:     const kind = inferTaskKind(`${node.title} ${node.text}`);
146:     const gap = state.target - state.current;
147:     const effortHours = Math.round(BASE_EFFORT[kind] * (0.6 + 0.4 * gap));
148:     const days = Math.max(1, Math.ceil(effortHours / hoursPerDay));
149:     const start = new Date(cursor);
150:     const due = addBusinessDays(start, days);
151:     cursor = addBusinessDays(start, Math.max(1, Math.ceil(days / 2))); // allow overlap: two work streams
152:     const automation = AUTOMATION[kind];
153:     const priority: Priority = state.priority;
154:     tasks.push({
155:       id: opts.idFactory(),
156:       workspaceId: opts.workspaceId,
157:       title: `${node.code} · ${shortStatement(node.title && node.title !== node.code ? node.title : node.text, 72)}`,
158:       description: node.text,
159:       kind,
160:       status: "todo",
161:       priority,
162:       requirementIds: [node.id],
163:       startDate: isoDate(start),
164:       dueDate: isoDate(due),
165:       effortHours,
166:       checklist: checklistFor(node, opts.idFactory),
167:       dependsOn: [],
168:       automation: automation ? { ...automation, params: { nodeId: node.id } } : undefined,
169:       source: { ...node.citation, basis: basisFor(node) },
170:       targetLevel: state.target,
171:       origin: "template",
172:     });
173:   }
174:
175:   // Governance policy work unblocks the rest: link non-GV tasks to the GV.PO task when present.
176:   const policyTask = tasks.find((t) => t.requirementIds.some((id) => /:GV\.PO-01$/.test(id)));
177:   if (policyTask) {
178:     for (const t of tasks) {
179:       if (t === policyTask) continue;
180:       if (t.kind === "policy" || t.kind === "procedure") t.dependsOn.push(policyTask.id);
181:     }
182:   }
183:   return tasks;
184: }
185:
186: export function addBusinessDays(date: Date, days: number): Date {
187:   const d = new Date(date);
188:   let added = 0;
189:   while (added < days) {
190:     d.setUTCDate(d.getUTCDate() + 1);
191:     const wd = d.getUTCDay();
192:     if (wd !== 0 && wd !== 6) added++;
193:   }
194:   return d;
195: }
196:
197: export function isoDate(d: Date): string {
198:   return d.toISOString().slice(0, 10);
199: }

FILE packages/core/src/recommend.ts SHA256 de86aa881801a5d638a4c0bcb0ba195d45a49a5ab6e2f274a3e6de8e26688739
1: /**
2:  * Maturity-adaptive, niche-aware recommendations.
3:  *
4:  * Given an organization profile, decide the framework path, default targets
5:  * and which CSF 2.0 categories deserve priority. Every rule carries a
6:  * human-readable reason so agents and the UI can explain *why*.
7:  */
8: import type { DataType, Driver, Industry, OrganizationProfile, Priority } from "./types.ts";
9:
10: export interface FrameworkRecommendation {
11:   frameworkId: string;
12:   name: string;
13:   order: number;
14:   availability: "available" | "roadmap";
15:   reason: string;
16: }
17:
18: export interface Recommendation {
19:   frameworks: FrameworkRecommendation[];
20:   /** Default target implementation level (0–4) for in-scope requirements. */
21:   defaultTarget: number;
22:   /** Target level for requirements whose priority is critical/high. */
23:   elevatedTarget: number;
24:   /** CSF 2.0 category code → priority. Categories not listed default to "medium". */
25:   categoryPriorities: Record<string, Priority>;
26:   /** Categories to explore first in the Observatory, most important first. */
27:   focus: string[];
28:   rationale: string[];
29:   guidance: OrganizationProfile["guidance"];
30: }
31:
32: /** Categories every organization should treat as high priority (CSF 2.0 foundations). */
33: const FOUNDATION: Record<string, string> = {
34:   "GV.OC": "Organizational context anchors every other decision",
35:   "GV.RM": "A risk management strategy sets priorities and risk appetite",
36:   "GV.RR": "Clear roles, responsibilities and authorities make work assignable",
37:   "GV.PO": "Policy is the backbone auditors and customers ask for first",
38:   "ID.AM": "You cannot protect assets you have not inventoried",
39:   "ID.RA": "Risk assessment focuses effort where it matters",
40:   "PR.AA": "Identity, authentication and access control stop most intrusions",
41:   "PR.DS": "Data security protects the information you are accountable for",
42:   "DE.CM": "Continuous monitoring shortens time to detect",
43:   "RS.MA": "Incident management limits the damage when something happens",
44:   "RC.RP": "Recovery plan execution restores operations",
45: };
46:
47: const INDUSTRY_EMPHASIS: Record<Industry, { categories: string[]; reason: string }> = {
48:   saas: { categories: ["PR.PS", "PR.AA", "GV.SC", "DE.CM", "PR.DS", "ID.IM"], reason: "multi-tenant platform security and supplier assurance drive customer trust" },
49:   fintech: { categories: ["PR.AA", "PR.DS", "DE.AE", "DE.CM", "GV.SC", "GV.OV", "RS.MA"], reason: "fraud, financial data and regulator scrutiny demand strong access, detection and oversight" },
50:   healthcare: { categories: ["PR.DS", "PR.AA", "ID.AM", "RC.RP", "RS.CO", "GV.SC"], reason: "patient data confidentiality and availability of care are paramount" },
51:   manufacturing: { categories: ["ID.AM", "PR.IR", "DE.CM", "RC.RP", "GV.SC", "PR.PS"], reason: "OT/ICS environments need asset visibility, resilient infrastructure and recovery" },
52:   "public-sector": { categories: ["GV.PO", "GV.RR", "GV.OV", "ID.RA", "PR.AT", "RS.CO"], reason: "public accountability requires formal governance, oversight and communication" },
53:   "defense-contractor": { categories: ["PR.AA", "PR.DS", "PR.AT", "DE.CM", "GV.SC", "ID.RA"], reason: "protecting CUI requires rigorous access control, awareness and supply-chain risk management" },
54:   education: { categories: ["PR.AA", "PR.AT", "DE.CM", "RC.RP", "PR.DS"], reason: "large, transient user populations need identity hygiene and awareness" },
55:   retail: { categories: ["PR.DS", "PR.AA", "DE.CM", "PR.PS", "GV.SC"], reason: "payment and customer data attract financially motivated attackers" },
56:   "energy-utilities": { categories: ["PR.IR", "ID.AM", "DE.CM", "RS.MA", "RC.RP", "GV.SC"], reason: "critical-infrastructure operations must stay resilient" },
57:   nonprofit: { categories: ["PR.AT", "PR.AA", "RC.RP", "PR.DS"], reason: "lean teams benefit most from awareness, MFA and backups" },
58:   "professional-services": { categories: ["PR.DS", "PR.AA", "PR.AT", "GV.SC"], reason: "client confidentiality is the product" },
59:   other: { categories: ["PR.AA", "PR.DS", "DE.CM"], reason: "core protective and detective outcomes apply to every organization" },
60: };
61:
62: const DATA_EMPHASIS: Partial<Record<DataType, { categories: string[]; reason: string }>> = {
63:   phi: { categories: ["PR.DS", "PR.AA", "GV.OC"], reason: "PHI brings HIPAA obligations and high breach impact" },
64:   pii: { categories: ["PR.DS", "PR.AA", "GV.OC"], reason: "personal data is subject to privacy laws and breach notification" },
65:   cardholder: { categories: ["PR.DS", "PR.AA", "PR.PS", "DE.CM"], reason: "cardholder data brings PCI DSS obligations" },
66:   cui: { categories: ["PR.DS", "PR.AA", "PR.AT", "DE.CM"], reason: "CUI is subject to NIST SP 800-171 / CMMC requirements" },
67:   financial: { categories: ["PR.DS", "PR.AA", "DE.AE"], reason: "financial data is a prime fraud target" },
68:   "intellectual-property": { categories: ["PR.DS", "PR.AA", "DE.CM"], reason: "IP theft is hard to detect and irreversible" },
69:   children: { categories: ["GV.OC", "PR.DS"], reason: "children's data carries heightened legal protections" },
70:   biometric: { categories: ["GV.OC", "PR.DS"], reason: "biometric identifiers cannot be rotated once exposed" },
71: };
72:
73: const DRIVER_EMPHASIS: Partial<Record<Driver, { categories: string[]; reason: string }>> = {
74:   "cyber-insurance": { categories: ["PR.AA", "PR.DS", "RC.RP", "DE.CM"], reason: "insurers underwrite on MFA, backups, EDR and recovery" },
75:   "incident-recovery": { categories: ["RS.MA", "RS.AN", "RS.MI", "RC.RP", "RC.CO", "DE.AE", "ID.IM"], reason: "recent incidents call for stronger response, recovery and lessons learned" },
76:   "board-mandate": { categories: ["GV.OV", "GV.RM", "GV.RR"], reason: "boards need oversight, risk strategy and accountable roles" },
77:   "investor-due-diligence": { categories: ["GV.RM", "GV.PO", "ID.RA"], reason: "diligence reviews focus on governance maturity and known risks" },
78:   regulator: { categories: ["GV.OC", "GV.PO", "GV.OV"], reason: "regulators examine legal/regulatory context, policy and oversight" },
79:   "ai-systems": { categories: ["GV.SC", "GV.RM", "ID.RA", "PR.DS"], reason: "AI systems add model and data supply-chain risk that governance, risk assessment and data protection must cover" },
80: };
81:
82: function bump(p: Priority | undefined, to: Priority): Priority {
83:   const order: Priority[] = ["low", "medium", "high", "critical"];
84:   if (!p) return to;
85:   return order.indexOf(to) > order.indexOf(p) ? to : p;
86: }
87:
88: export function recommend(profile: OrganizationProfile): Recommendation {
89:   const priorities: Record<string, Priority> = {};
90:   const rationale: string[] = [];
91:   const focusScore = new Map<string, number>();
92:   const addFocus = (code: string, w: number) => focusScore.set(code, (focusScore.get(code) ?? 0) + w);
93:
94:   for (const [code] of Object.entries(FOUNDATION)) {
95:     priorities[code] = "high";
96:     addFocus(code, 1);
97:   }
98:   rationale.push("Foundational CSF 2.0 categories (governance, assets, risk, access, data, monitoring, response, recovery) start at high priority.");
99:
100:   const industry = INDUSTRY_EMPHASIS[profile.industry];
101:   for (const code of industry.categories) {
102:     priorities[code] = bump(priorities[code], "high");
103:     addFocus(code, 2);
104:   }
105:   rationale.push(`Industry (${profile.industry}): ${industry.reason}.`);
106:
107:   for (const dt of profile.dataTypes) {
108:     const rule = DATA_EMPHASIS[dt];
109:     if (!rule) continue;
110:     for (const code of rule.categories) {
111:       priorities[code] = bump(priorities[code], "critical");
112:       addFocus(code, 3);
113:     }
114:     rationale.push(`Data (${dt}): ${rule.reason}.`);
115:   }
116:   for (const d of profile.drivers) {
117:     const rule = DRIVER_EMPHASIS[d];
118:     if (!rule) continue;
119:     for (const code of rule.categories) {
120:       priorities[code] = bump(priorities[code], "high");
121:       addFocus(code, 2);
122:     }
123:     rationale.push(`Driver (${d}): ${rule.reason}.`);
124:   }
125:   if (profile.environments.includes("ot")) {
126:     for (const code of ["PR.IR", "ID.AM", "DE.CM"]) {
127:       priorities[code] = bump(priorities[code], "critical");
128:       addFocus(code, 2);
129:     }
130:     rationale.push("Operational technology in scope: infrastructure resilience and asset visibility are critical.");
131:   }
132:
133:   // Targets scale with current maturity and organization size so goals stay achievable.
134:   const tier = profile.maturityTier;
135:   const small = profile.size === "1-10" || profile.size === "11-50";
136:   let defaultTarget = Math.min(4, tier + 1);
137:   if (small) defaultTarget = Math.min(defaultTarget, 3);
138:   defaultTarget = Math.max(2, defaultTarget);
139:   const elevatedTarget = Math.min(4, Math.max(defaultTarget, tier >= 3 ? 4 : 3));
140:   rationale.push(
141:     `Current maturity is Tier ${tier}; Visua sets a default target of level ${defaultTarget} and level ${elevatedTarget} for high-priority outcomes — ambitious but reachable${small ? " for a small team" : ""}.`,
142:   );
143:
144:   const frameworks: FrameworkRecommendation[] = [
145:     {
146:       frameworkId: "nist-csf-2.0",
147:       name: "NIST CSF 2.0",
148:       order: 1,
149:       availability: "available",
150:       reason: "The foundation: a common language for your whole program, adaptable to any size, sector or maturity.",
151:     },
152:   ];
153:   const wantsSoc2 =
154:     profile.drivers.includes("enterprise-customers") ||
155:     ["saas", "fintech", "professional-services", "healthcare"].includes(profile.industry);
156:   const wantsRmf =
157:     profile.drivers.includes("federal-customers") ||
158:     ["public-sector", "defense-contractor"].includes(profile.industry) ||
159:     profile.dataTypes.includes("cui");
160:   const wantsAi = profile.drivers.includes("ai-systems");
161:   let order = 2;
162:   if (wantsAi) {
163:     frameworks.push({
164:       frameworkId: "nist-ai-rmf",
165:       name: "NIST AI RMF (with the Generative AI Profile)",
166:       order: order++,
167:       availability: "available",
168:       reason: "You build or deploy AI systems: the AI RMF governs, maps, measures and manages their risks, and its GOVERN function builds on your CSF governance.",
169:     });
170:   }
171:   if (wantsAi || profile.drivers.includes("regulator")) {
172:     frameworks.push({
173:       frameworkId: "us-state-ai-laws",
174:       name: "U.S. state AI laws (Texas, California, Colorado and more)",
175:       order: order++,
176:       availability: "available",
177:       reason: wantsAi
178:         ? "State AI laws already bind developers, deployers, employers and chatbot operators: track the obligations that apply to your roles, with the statute text and effective dates."
179:         : "Regulators increasingly enforce state AI laws: track which obligations apply to you and when they take effect.",
180:     });
181:   }
182:   if (wantsSoc2) {
183:     frameworks.push({
184:       frameworkId: "aicpa-tsc-2017",
185:       name: "SOC 2 (AICPA Trust Services Criteria)",
186:       order: order++,
187:       availability: "available",
188:       reason: "Enterprise buyers expect a SOC 2 report; most of the work is reused from your CSF program via crosswalks.",
189:     });
190:   }
191:   if (wantsRmf) {
192:     frameworks.push({
193:       frameworkId: "nist-sp-800-53-r5",
194:       name: "NIST RMF with SP 800-53 Rev. 5",
195:       order: order++,
196:       availability: "available",
197:       reason: "Federal customers and authorizations (ATO, FedRAMP) run on the RMF and the SP 800-53 control baselines.",
198:     });
199:   }
200:   if (!wantsSoc2) {
201:     frameworks.push({
202:       frameworkId: "aicpa-tsc-2017",
203:       name: "SOC 2 (AICPA Trust Services Criteria)",
204:       order: order++,
205:       availability: "available",
206:       reason: "Optional next step once customers ask for independent assurance.",
207:     });
208:   }
209:   if (!wantsRmf) {
210:     frameworks.push({
211:       frameworkId: "nist-sp-800-53-r5",
212:       name: "NIST RMF with SP 800-53 Rev. 5",
213:       order: order++,
214:       availability: "available",
215:       reason: "The most detailed control catalog — use it to deepen specific CSF outcomes even without federal drivers.",
216:     });
217:   }
218:   const roadmap: [boolean, string, string, string][] = [
219:     [profile.dataTypes.includes("phi"), "hipaa-security-rule", "HIPAA Security Rule", "PHI is in scope"],
220:     [profile.dataTypes.includes("cardholder"), "pci-dss-4", "PCI DSS v4.0.1", "cardholder data is in scope"],
221:     [profile.dataTypes.includes("cui"), "nist-sp-800-171-r3", "NIST SP 800-171 Rev. 3 / CMMC", "CUI is in scope"],
222:     [true, "iso-27001-2022", "ISO/IEC 27001:2022", "international customers often require certification"],
223:     [wantsAi, "iso-iec-42001-2023", "ISO/IEC 42001:2023 (AI management system)", "the certifiable AI management system standard customers increasingly ask for"],
224:     [wantsAi, "eu-ai-act", "EU AI Act (Regulation (EU) 2024/1689)", "binding obligations apply if you place AI systems on the EU market"],
225:   ];
226:   for (const [applies, id, name, why] of roadmap) {
227:     if (!applies) continue;
228:     frameworks.push({ frameworkId: id, name, order: order++, availability: "roadmap", reason: `On the Visua roadmap — ${why}.` });
229:   }
230:
231:   const focus = [...focusScore.entries()].sort((a, b) => b[1] - a[1]).map(([code]) => code).slice(0, 6);
232:   return { frameworks, defaultTarget, elevatedTarget, categoryPriorities: priorities, focus, rationale, guidance: profile.guidance };
233: }
234:
235: /** Target level for a requirement given its priority. */
236: export function targetFor(priority: Priority, rec: Pick<Recommendation, "defaultTarget" | "elevatedTarget">): number {
237:   return priority === "critical" || priority === "high" ? rec.elevatedTarget : rec.defaultTarget;
238: }
239:
240: /** Estimate a CSF Tier (1–4) from ten quick-check answers scored 0–3. */
241: export function estimateTier(answers: number[]): 1 | 2 | 3 | 4 {
242:   if (!answers.length) return 1;
243:   const avg = answers.reduce((a, b) => a + Math.max(0, Math.min(3, b)), 0) / answers.length;
244:   if (avg >= 2.5) return 4;
245:   if (avg >= 1.75) return 3;
246:   if (avg >= 0.9) return 2;
247:   return 1;
248: }

FILE packages/core/src/rmf.ts SHA256 3a02dbe92e7ac1b3f4d5d131b5bf4ef44c093744bc7eed44e8180dea6b6a70ad
1: /**
2:  * RMF Categorize step helpers: FIPS 199 security categorization with the
3:  * high-water mark (FIPS 200) used to select the SP 800-53B baseline.
4:  */
5: import type { ImpactLevel, RmfSettings } from "./types.ts";
6:
7: const ORDER: ImpactLevel[] = ["low", "moderate", "high"];
8:
9: export const maxImpact = (...levels: ImpactLevel[]): ImpactLevel =>
10:   levels.reduce<ImpactLevel>((m, l) => (ORDER.indexOf(l) > ORDER.indexOf(m) ? l : m), "low");
11:
12: /**
13:  * FIPS 199: SC(system) = {(confidentiality, impact), (integrity, impact), (availability, impact)}
14:  * where each objective takes the highest value among the information types it processes.
15:  * FIPS 200: the overall system impact level is the high-water mark across the three objectives.
16:  */
17: export function categorize(types: RmfSettings["informationTypes"]): NonNullable<RmfSettings["categorization"]> {
18:   if (!types.length) return { confidentiality: "low", integrity: "low", availability: "low", overall: "low" };
19:   const confidentiality = maxImpact(...types.map((t) => t.confidentiality));
20:   const integrity = maxImpact(...types.map((t) => t.integrity));
21:   const availability = maxImpact(...types.map((t) => t.availability));
22:   return { confidentiality, integrity, availability, overall: maxImpact(confidentiality, integrity, availability) };
23: }
24:
25: /** Example information types an organization can start from (values are provisional and must be reviewed). */
26: export const EXAMPLE_INFORMATION_TYPES: RmfSettings["informationTypes"] = [
27:   { id: "customer-pii", name: "Customer personally identifiable information", confidentiality: "moderate", integrity: "moderate", availability: "low" },
28:   { id: "financial-records", name: "Financial management records", confidentiality: "moderate", integrity: "moderate", availability: "low" },
29:   { id: "system-security", name: "System and network security information", confidentiality: "moderate", integrity: "moderate", availability: "moderate" },
30:   { id: "public-information", name: "Public website content", confidentiality: "low", integrity: "moderate", availability: "moderate" },
31:   { id: "health-records", name: "Health care records (PHI)", confidentiality: "high", integrity: "moderate", availability: "moderate" },
32:   { id: "cui", name: "Controlled unclassified information", confidentiality: "moderate", integrity: "moderate", availability: "low" },
33: ];

FILE packages/core/src/scoring.ts SHA256 871a01e83417c1139e348652de2e62df5b272098888e76c80ba097f1338ff7d9
1: import type { FrameworkIndex } from "./graph.ts";
2: import { deriveStatus, isEvidenceValid, type DerivedStatus } from "./status.ts";
3: import type { CheckResult, Evidence, Priority, RequirementNode, RequirementState, Status, Task } from "./types.ts";
4: import { STATUSES } from "./types.ts";
5:
6: export const PRIORITY_WEIGHT: Record<Priority, number> = { critical: 4, high: 3, medium: 2, low: 1 };
7:
8: export interface WorkspaceSnapshot {
9:   states: Map<string, RequirementState>;
10:   evidenceByNode: Map<string, Evidence[]>;
11:   tasksByNode: Map<string, Task[]>;
12:   checksByNode: Map<string, CheckResult[]>;
13: }
14:
15: export interface NodeScore {
16:   nodeId: string;
17:   /** Weighted readiness 0..1: mean of min(current/target, 1) across applicable units of work. */
18:   readiness: number;
19:   /** Mean current level across applicable units of work. */
20:   current: number;
21:   /** Mean target level across applicable units of work. */
22:   target: number;
23:   /** Weighted sum of positive gaps (target − current) × priority weight. */
24:   gapScore: number;
25:   /** Count of applicable units with current < target. */
26:   gaps: number;
27:   counts: Record<Status, number>;
28:   /** Applicable units of work under this node. */
29:   total: number;
30:   /** Fraction of applicable units with at least one valid (accepted, unexpired) evidence item. */
31:   evidenceCoverage: number;
32:   /** Fraction of applicable units whose status is verified. */
33:   verifiedShare: number;
34: }
35:
36: export interface FrameworkScore {
37:   frameworkId: string;
38:   statuses: Map<string, DerivedStatus>;
39:   scores: Map<string, NodeScore>;
40:   overall: NodeScore;
41: }
42:
43: export interface ScoreOptions {
44:   /**
45:    * Which units count toward the roll-ups (readiness, gaps, totals); by default all.
46:    * Units left out still get a status: e.g. statutory obligations not yet in effect.
47:    */
48:   counts?: (node: RequirementNode) => boolean;
49: }
50:
51: interface Acc {
52:   weight: number;
53:   readinessW: number;
54:   currentSum: number;
55:   targetSum: number;
56:   gapScore: number;
57:   gaps: number;
58:   counts: Record<Status, number>;
59:   total: number;
60:   withEvidence: number;
61:   verified: number;
62: }
63:
64: const emptyCounts = (): Record<Status, number> =>
65:   Object.fromEntries(STATUSES.map((s) => [s, 0])) as Record<Status, number>;
66:
67: const emptyAcc = (): Acc => ({
68:   weight: 0,
69:   readinessW: 0,
70:   currentSum: 0,
71:   targetSum: 0,
72:   gapScore: 0,
73:   gaps: 0,
74:   counts: emptyCounts(),
75:   total: 0,
76:   withEvidence: 0,
77:   verified: 0,
78: });
79:
80: function merge(into: Acc, from: Acc): void {
81:   into.weight += from.weight;
82:   into.readinessW += from.readinessW;
83:   into.currentSum += from.currentSum;
84:   into.targetSum += from.targetSum;
85:   into.gapScore += from.gapScore;
86:   into.gaps += from.gaps;
87:   into.total += from.total;
88:   into.withEvidence += from.withEvidence;
89:   into.verified += from.verified;
90:   for (const s of STATUSES) into.counts[s] += from.counts[s];
91: }
92:
93: function finalize(nodeId: string, acc: Acc): NodeScore {
94:   const n = acc.total || 1;
95:   return {
96:     nodeId,
97:     readiness: acc.weight ? acc.readinessW / acc.weight : 0,
98:     current: acc.total ? acc.currentSum / n : 0,
99:     target: acc.total ? acc.targetSum / n : 0,
100:     gapScore: acc.gapScore,
101:     gaps: acc.gaps,
102:     counts: acc.counts,
103:     total: acc.total,
104:     evidenceCoverage: acc.total ? acc.withEvidence / n : 0,
105:     verifiedShare: acc.total ? acc.verified / n : 0,
106:   };
107: }
108:
109: /** Unit-level contribution of one assessable requirement. */
110: function unitAcc(status: DerivedStatus, state: RequirementState | undefined, evidence: Evidence[], now: Date): Acc {
111:   const acc = emptyAcc();
112:   acc.counts[status.status] += 1;
113:   if (status.status === "not-applicable") return acc;
114:   const current = state?.current ?? 0;
115:   const target = state?.target ?? 0;
116:   const weight = PRIORITY_WEIGHT[state?.priority ?? "medium"];
117:   const ratio = target > 0 ? Math.min(current / target, 1) : current > 0 ? 1 : 0;
118:   acc.weight = weight;
119:   acc.readinessW = ratio * weight;
120:   acc.currentSum = current;
121:   acc.targetSum = target;
122:   acc.total = 1;
123:   if (target > current) {
124:     acc.gaps = 1;
125:     acc.gapScore = (target - current) * weight;
126:   }
127:   if (evidence.some((e) => isEvidenceValid(e, now))) acc.withEvidence = 1;
128:   if (status.status === "verified") acc.verified = 1;
129:   return acc;
130: }
131:
132: /** Derive statuses and roll readiness up the framework hierarchy. */
133: export function scoreFramework(index: FrameworkIndex, snapshot: WorkspaceSnapshot, now: Date = new Date(), opts: ScoreOptions = {}): FrameworkScore {
134:   const statuses = new Map<string, DerivedStatus>();
135:   const scores = new Map<string, NodeScore>();
136:
137:   const visit = (nodeId: string | null): Acc => {
138:     const acc = emptyAcc();
139:     const node = nodeId ? index.byId.get(nodeId) : undefined;
140:     if (node && node.assessable && !node.withdrawn) {
141:       const state = snapshot.states.get(node.id);
142:       const evidence = snapshot.evidenceByNode.get(node.id) ?? [];
143:       const status = deriveStatus({
144:         state,
145:         evidence,
146:         tasks: snapshot.tasksByNode.get(node.id) ?? [],
147:         checks: snapshot.checksByNode.get(node.id) ?? [],
148:         now,
149:       });
150:       statuses.set(node.id, status);
151:       if (opts.counts?.(node) !== false) merge(acc, unitAcc(status, state, evidence, now));
152:     }
153:     const kids = nodeId === null ? index.roots() : index.childrenOf(nodeId);
154:     for (const child of kids) merge(acc, visit(child.id));
155:     if (nodeId) scores.set(nodeId, finalize(nodeId, acc));
156:     return acc;
157:   };
158:
159:   const overallAcc = visit(null);
160:   return { frameworkId: index.id, statuses, scores, overall: finalize(index.id, overallAcc) };
161: }
162:
163: /** Roll-up status for a group node: worst-first summary used to tint beacons/sectors. */
164: export function groupStatus(score: NodeScore): Status {
165:   const c = score.counts;
166:   if (score.total === 0) return c["not-applicable"] > 0 ? "not-applicable" : "not-started";
167:   if (c["at-risk"] > 0) return "at-risk";
168:   const done = c["implemented"] + c["verified"];
169:   if (c["verified"] === score.total) return "verified";
170:   if (done === score.total) return "implemented";
171:   if (done > 0 || c["in-progress"] > 0) return "in-progress";
172:   return "not-started";
173: }
174:
175: export function buildSnapshot(input: {
176:   states: RequirementState[];
177:   evidence: Evidence[];
178:   tasks: Task[];
179:   checks: CheckResult[];
180: }): WorkspaceSnapshot {
181:   const states = new Map(input.states.map((s) => [s.nodeId, s]));
182:   const push = <T>(map: Map<string, T[]>, key: string, value: T) => {
183:     const list = map.get(key);
184:     if (list) list.push(value);
185:     else map.set(key, [value]);
186:   };
187:   const evidenceByNode = new Map<string, Evidence[]>();
188:   for (const e of input.evidence) for (const id of e.requirementIds) push(evidenceByNode, id, e);
189:   const tasksByNode = new Map<string, Task[]>();
190:   for (const t of input.tasks) for (const id of t.requirementIds) push(tasksByNode, id, t);
191:   // Only the latest result per (connector, check, requirement) counts.
192:   const latest = new Map<string, CheckResult>();
193:   for (const c of input.checks) {
194:     for (const id of c.requirementIds) {
195:       const key = `${c.connectorId}|${c.checkId}|${id}`;
196:       const prev = latest.get(key);
197:       if (!prev || prev.observedAt < c.observedAt) latest.set(key, c);
198:     }
199:   }
200:   const checksByNode = new Map<string, CheckResult[]>();
201:   for (const [key, c] of latest) push(checksByNode, key.split("|")[2]!, c);
202:   return { states, evidenceByNode, tasksByNode, checksByNode };
203: }

FILE packages/core/src/status.ts SHA256 133b453b9b30cba6b0228e9e6da4a6568a06af0735382172fd21e00fca0e9a09
1: import type { CheckResult, Evidence, RequirementState, Status, Task } from "./types.ts";
2:
3: export interface StatusSignals {
4:   state: RequirementState | undefined;
5:   evidence: Evidence[];
6:   tasks: Task[];
7:   checks: CheckResult[];
8:   now?: Date;
9: }
10:
11: export interface DerivedStatus {
12:   status: Status;
13:   /** Human-readable reasons, most important first. */
14:   reasons: string[];
15: }
16:
17: const DAY = 86_400_000;
18:
19: export function isEvidenceValid(e: Evidence, now: Date = new Date()): boolean {
20:   if (e.status !== "accepted") return false;
21:   if (e.validUntil && new Date(e.validUntil).getTime() < now.getTime()) return false;
22:   return true;
23: }
24:
25: export function evidenceFreshness(e: Evidence, now: Date = new Date()): "fresh" | "expiring" | "expired" | "none" {
26:   if (!e.validUntil) return e.status === "expired" ? "expired" : "fresh";
27:   const remaining = new Date(e.validUntil).getTime() - now.getTime();
28:   if (remaining < 0 || e.status === "expired") return "expired";
29:   if (remaining < 30 * DAY) return "expiring";
30:   return "fresh";
31: }
32:
33: export function isTaskOverdue(t: Task, now: Date = new Date()): boolean {
34:   return !!t.dueDate && t.status !== "done" && new Date(t.dueDate).getTime() < now.getTime();
35: }
36:
37: /**
38:  * Derive a requirement's status from its assessment state and live signals.
39:  *
40:  * Precedence: not-applicable → manual override → at-risk (failing check,
41:  * expired evidence on an implemented requirement, overdue work) → verified →
42:  * implemented → in-progress → not-started.
43:  */
44: export function deriveStatus({ state, evidence, tasks, checks, now = new Date() }: StatusSignals): DerivedStatus {
45:   if (state && !state.applicable) {
46:     return { status: "not-applicable", reasons: [state.applicabilityRationale ?? "Marked not applicable"] };
47:   }
48:   if (state?.statusOverride) {
49:     return { status: state.statusOverride, reasons: ["Status set manually"] };
50:   }
51:
52:   const current = state?.current ?? 0;
53:   const target = state?.target ?? 0;
54:   const reasons: string[] = [];
55:
56:   const failing = checks.filter((c) => c.outcome === "fail");
57:   if (failing.length) reasons.push(`${failing.length} monitoring check(s) failing: ${failing.map((c) => c.title).join(", ")}`);
58:
59:   const expired = evidence.filter((e) => evidenceFreshness(e, now) === "expired");
60:   if (expired.length && current > 0) reasons.push(`${expired.length} evidence item(s) expired`);
61:
62:   const overdue = tasks.filter((t) => isTaskOverdue(t, now));
63:   if (overdue.length) reasons.push(`${overdue.length} task(s) overdue`);
64:
65:   if (reasons.length) return { status: "at-risk", reasons };
66:
67:   const validEvidence = evidence.filter((e) => isEvidenceValid(e, now));
68:   const meetsTarget = target > 0 && current >= target;
69:
70:   if (meetsTarget && state?.verifiedAt && validEvidence.length > 0) {
71:     return { status: "verified", reasons: ["Target met, verified, with valid evidence"] };
72:   }
73:   if (meetsTarget) {
74:     return {
75:       status: "implemented",
76:       reasons: [validEvidence.length ? "Target level met — awaiting verification" : "Target level met — evidence needed"],
77:     };
78:   }
79:   const activeTasks = tasks.filter((t) => t.status === "in-progress" || t.status === "in-review");
80:   if (current > 0 || activeTasks.length > 0) {
81:     return {
82:       status: "in-progress",
83:       reasons: [`Level ${current} of target ${target}` + (activeTasks.length ? `, ${activeTasks.length} task(s) active` : "")],
84:     };
85:   }
86:   return { status: "not-started", reasons: ["No implementation recorded yet"] };
87: }

FILE packages/core/src/tiers.ts SHA256 067d0071b97c40935db2d8803cc56aa6e7a264fb5851c7fb9171d02b6223c2f9
1: /**
2:  * CSF 2.0 Tiers assessment. The statements are quoted verbatim from NIST
3:  * CSWP 29, Appendix B, Table 2 ("Notional Illustration of the CSF Tiers"),
4:  * PDF pages 29–30. Each dimension asks which statement best describes the
5:  * organization; the answer's position is the Tier for that dimension.
6:  */
7:
8: export const TIER_NAMES = ["Partial", "Risk Informed", "Repeatable", "Adaptive"] as const;
9:
10: export const TIER_SOURCE = { documentId: "nist-cswp-29-csf-2-0", locator: "Appendix B, Table 2 — Notional Illustration of the CSF Tiers", pages: [29, 30] };
11:
12: export interface TierDimension {
13:   id: string;
14:   area: "governance" | "management";
15:   question: string;
16:   /** Four statements, Tier 1 → Tier 4. */
17:   statements: [string, string, string, string];
18: }
19:
20: export const TIER_DIMENSIONS: TierDimension[] = [
21:   {
22:     id: "risk-strategy",
23:     area: "governance",
24:     question: "How is the cybersecurity risk strategy applied?",
25:     statements: [
26:       "Application of the organizational cybersecurity risk strategy is managed in an ad hoc manner.",
27:       "Risk management practices are approved by management but may not be established as organization-wide policy.",
28:       "The organization’s risk management practices are formally approved and expressed as policy.",
29:       "There is an organization-wide approach to managing cybersecurity risks that uses risk-informed policies, processes, and procedures to address potential cybersecurity events.",
30:     ],
31:   },
32:   {
33:     id: "prioritization",
34:     area: "governance",
35:     question: "How are cybersecurity activities prioritized?",
36:     statements: [
37:       "Prioritization is ad hoc and not formally based on objectives or threat environment.",
38:       "The prioritization of cybersecurity activities and protection needs is directly informed by organizational risk objectives, the threat environment, or business/mission requirements.",
39:       "Risk-informed policies, processes, and procedures are defined, implemented as intended, and reviewed.",
40:       "The relationship between cybersecurity risks and organizational objectives is clearly understood and considered when making decisions.",
41:     ],
42:   },
43:   {
44:     id: "executive-oversight",
45:     area: "governance",
46:     question: "How do leadership and budgeting treat cybersecurity risk?",
47:     statements: [
48:       "There is limited awareness of cybersecurity risks at the organizational level.",
49:       "Consideration of cybersecurity in organizational objectives and programs may occur at some but not all levels of the organization.",
50:       "Organizational cybersecurity practices are regularly updated based on the application of risk management processes to changes in business/mission requirements, threats, and technological landscape.",
51:       "Executives monitor cybersecurity risks in the same context as financial and other organizational risks. The organizational budget is based on an understanding of the current and predicted risk environment and risk tolerance.",
52:     ],
53:   },
54:   {
55:     id: "awareness",
56:     area: "management",
57:     question: "What is the level of cybersecurity risk awareness?",
58:     statements: [
59:       "There is limited awareness of cybersecurity risks at the organizational level.",
60:       "There is an awareness of cybersecurity risks at the organizational level, but an organization-wide approach to managing cybersecurity risks has not been established.",
61:       "There is an organization-wide approach to managing cybersecurity risks.",
62:       "Cybersecurity risk management is part of the organizational culture. It evolves from an awareness of previous activities and continuous awareness of activities on organizational systems and networks.",
63:     ],
64:   },
65:   {
66:     id: "consistency",
67:     area: "management",
68:     question: "How consistently is cybersecurity risk managed?",
69:     statements: [
70:       "The organization implements cybersecurity risk management on an irregular, case-by-case basis.",
71:       "Cyber risk assessment of organizational and external assets occurs but is not typically repeatable or reoccurring.",
72:       "Consistent methods are in place to respond effectively to changes in risk. Personnel possess the knowledge and skills to perform their appointed roles and responsibilities.",
73:       "The organization adapts its cybersecurity practices based on previous and current cybersecurity activities, including lessons learned and predictive indicators.",
74:     ],
75:   },
76:   {
77:     id: "information-sharing",
78:     area: "management",
79:     question: "How is cybersecurity information shared?",
80:     statements: [
81:       "The organization may not have processes that enable cybersecurity information to be shared within the organization.",
82:       "Cybersecurity information is shared within the organization on an informal basis.",
83:       "Cybersecurity information is routinely shared throughout the organization.",
84:       "Cybersecurity information is constantly shared throughout the organization and with authorized third parties.",
85:     ],
86:   },
87:   {
88:     id: "monitoring",
89:     area: "management",
90:     question: "How are the cybersecurity risks of assets monitored and communicated?",
91:     statements: [
92:       "The organization implements cybersecurity risk management on an irregular, case-by-case basis.",
93:       "Consideration of cybersecurity in organizational objectives and programs may occur at some but not all levels of the organization.",
94:       "The organization consistently and accurately monitors the cybersecurity risks of assets. Senior cybersecurity and non-cybersecurity executives communicate regularly regarding cybersecurity risks.",
95:       "Through a process of continuous improvement that incorporates advanced cybersecurity technologies and practices, the organization actively adapts to a changing technological landscape and responds in a timely and effective manner to evolving, sophisticated threats.",
96:     ],
97:   },
98:   {
99:     id: "supplier-risk",
100:     area: "management",
101:     question: "How are supplier and acquired-product risks handled?",
102:     statements: [
103:       "The organization is generally unaware of the cybersecurity risks associated with its suppliers and the products and services it acquires and uses.",
104:       "The organization is aware of the cybersecurity risks associated with its suppliers and the products and services it acquires and uses, but it does not act consistently or formally in response to those risks.",
105:       "The organization risk strategy is informed by the cybersecurity risks associated with its suppliers and the products and services it acquires and uses. Personnel formally act upon those risks through mechanisms such as written agreements to communicate baseline requirements, governance structures (e.g., risk councils), and policy implementation and monitoring.",
106:       "The organization uses real-time or near real-time information to understand and consistently act upon the cybersecurity risks associated with its suppliers and the products and services it acquires and uses.",
107:     ],
108:   },
109: ];
110:
111: export interface TierAssessment {
112:   answers: Record<string, 1 | 2 | 3 | 4>;
113:   governanceTier: 1 | 2 | 3 | 4;
114:   managementTier: 1 | 2 | 3 | 4;
115:   overallTier: 1 | 2 | 3 | 4;
116:   assessedAt: string;
117: }
118:
119: const clampTier = (n: number): 1 | 2 | 3 | 4 => Math.max(1, Math.min(4, n)) as 1 | 2 | 3 | 4;
120:
121: /**
122:  * Score answers. Each area's Tier is the floor of the mean — a Tier is only
123:  * credited when practices consistently meet it — and the overall Tier is the
124:  * lower of the two areas.
125:  */
126: export function assessTiers(answers: Record<string, number>, now: Date = new Date()): TierAssessment {
127:   const valid: Record<string, 1 | 2 | 3 | 4> = {};
128:   for (const d of TIER_DIMENSIONS) {
129:     const a = answers[d.id];
130:     if (a !== undefined) valid[d.id] = clampTier(Math.round(a));
131:   }
132:   const areaTier = (area: TierDimension["area"]) => {
133:     const values = TIER_DIMENSIONS.filter((d) => d.area === area && valid[d.id]).map((d) => valid[d.id]!);
134:     return clampTier(values.length ? Math.floor(values.reduce((a, b) => a + b, 0) / values.length) : 1);
135:   };
136:   const governanceTier = areaTier("governance");
137:   const managementTier = areaTier("management");
138:   return {
139:     answers: valid,
140:     governanceTier,
141:     managementTier,
142:     overallTier: clampTier(Math.min(governanceTier, managementTier)),
143:     assessedAt: now.toISOString(),
144:   };
145: }

FILE packages/core/src/trust.ts SHA256 128abb7844d7a999e3ec5060da8aa6697854eb7dbe6d0e71377b3e722ea8345c
1: import type { FrameworkFamily, TrustCenterSettings } from "./types.ts";
2:
3: /**
4:  * Whether the public trust center publishes a framework's readiness: the workspace's
5:  * own choice when it made one. By default every framework is published except the
6:  * state AI laws, whose obligations are legal-compliance tracking rather than a security
7:  * attestation (and reveal which laws an organization considers itself subject to).
8:  * Threat catalogs are never enabled, so never published.
9:  */
10: export function trustCenterPublishes(settings: TrustCenterSettings, frameworkId: string, family: FrameworkFamily): boolean {
11:   if (family === "threat") return false;
12:   return settings.frameworks?.[frameworkId] ?? family !== "law";
13: }

FILE packages/core/src/types.ts SHA256 82f706888fff34ecea734d1558ee5c8d89fcb2ed8dece6ded45f5342e0b39637
1: /**
2:  * Visua domain model.
3:  *
4:  * Every framework (NIST CSF 2.0, AICPA TSC / SOC 2, NIST SP 800-53 + RMF) is
5:  * normalized into the same *framework graph* shape so that scoring, planning,
6:  * crosswalks, agents and the 3D Observatory work identically across them.
7:  */
8: import type { OverlayAdoption } from "./overlays.ts";
9:
10: import type { TierAssessment } from "./tiers.ts";
11:
12: // ---------------------------------------------------------------------------
13: // Frameworks
14: // ---------------------------------------------------------------------------
15:
16: /**
17:  * csf, soc2, rmf and ai are frameworks a workspace implements; law holds
18:  * statutory obligations (U.S. state AI laws); threat holds threat catalogs
19:  * (MITRE ATLAS, OWASP Top 10s, NIST AI 100-2), which are viewed through the
20:  * requirements that address them and never assessed or enabled themselves.
21:  */
22: export type FrameworkFamily = "csf" | "soc2" | "rmf" | "ai" | "law" | "threat";
23:
24: export interface CorpusCitation {
25:   /** `id` of a document in corpus/<framework>/manifest.json */
26:   documentId: string;
27:   /** Human-readable locator: section, table, page, OSCAL part id… */
28:   locator?: string;
29:   page?: number;
30: }
31:
32: export interface LevelDescriptor {
33:   kind: string;
34:   label: string;
35:   pluralLabel: string;
36: }
37:
38: export interface FrameworkDescriptor {
39:   id: string;
40:   family: FrameworkFamily;
41:   shortName: string;
42:   /** Compact label for badges and dense views, e.g. "SOC 2" (falls back to shortName). */
43:   badge?: string;
44:   name: string;
45:   publisher: string;
46:   version: string;
47:   published: string;
48:   description: string;
49:   /** Hierarchy from the top level down to the unit of work. */
50:   levels: LevelDescriptor[];
51:   /** Node kind that is assessed and scored (the unit of work). */
52:   assessableKind: string;
53:   /** Corpus documents this graph was ingested from. */
54:   sources: CorpusCitation[];
55:   /** Vocabulary used in the UI and by agents ("outcome", "criterion", "control"). */
56:   unitLabel: string;
57:   unitLabelPlural: string;
58:   /** Licensing / provenance notice for the requirement text shown to users. */
59:   contentNotice?: string;
60: }
61:
62: export interface ImplementationExample {
63:   code: string;
64:   text: string;
65: }
66:
67: export interface InformativeReference {
68:   /** Reference source, e.g. "SP 800-53 Rev 5.2.0" or "CIS Controls v8.1". */
69:   source: string;
70:   /** Identifier inside that source, e.g. "AC-02". */
71:   ref: string;
72:   /** Resolved Visua node id when the reference points at an ingested framework. */
73:   nodeId?: string;
74:   /** Mapping dataset the reference comes from (e.g. a NIST OLIR dataset name). */
75:   dataset?: string;
76:   /** Who authored the mapping dataset. */
77:   developer?: string;
78:   url?: string;
79: }
80:
81: export interface RequirementNode {
82:   /** Globally unique: `${frameworkId}:${code}` */
83:   id: string;
84:   frameworkId: string;
85:   code: string;
86:   kind: string;
87:   parentId: string | null;
88:   depth: number;
89:   order: number;
90:   title: string;
91:   text: string;
92:   guidance?: string;
93:   examples?: ImplementationExample[];
94:   references?: InformativeReference[];
95:   /** Free-form framework-specific attributes (baselines, points of focus, …). */
96:   attributes?: Record<string, unknown>;
97:   citation: CorpusCitation;
98:   assessable: boolean;
99:   /** Withdrawn / deprecated items stay in the graph for traceability. */
100:   withdrawn?: boolean;
101: }
102:
103: /** A risk defined by a framework profile (e.g. the 12 GAI risks of NIST AI 600-1). */
104: export interface ProfileRisk {
105:   id: string;
106:   title: string;
107:   description: string;
108:   citation: CorpusCitation;
109: }
110:
111: /**
112:  * A profile layered on a framework (e.g. the NIST AI 600-1 Generative AI Profile on
113:  * the AI RMF). Its actions live on the framework's nodes (`attributes.profileActions`).
114:  */
115: export interface FrameworkProfile {
116:   id: string;
117:   title: string;
118:   documentId: string;
119:   /** When the profile applies, e.g. "generative" for systems that use generative AI. */
120:   appliesWhen: string;
121:   risks: ProfileRisk[];
122: }
123:
124: /** One profile action attached to a requirement node. */
125: export interface ProfileAction {
126:   profileId: string;
127:   /** Verbatim action id, e.g. "GV-1.1-001". */
128:   id: string;
129:   text: string;
130:   /** Ids of the profile risks this action addresses. */
131:   risks: string[];
132:   citation: CorpusCitation;
133: }
134:
135: export interface FrameworkGraph {
136:   framework: FrameworkDescriptor;
137:   nodes: RequirementNode[];
138:   profiles?: FrameworkProfile[];
139: }
140:
141: export type MappingRelationship =
142:   | "equivalent"
143:   | "subset-of"
144:   | "superset-of"
145:   | "intersects-with"
146:   | "related-to"
147:   | "supports";
148:
149: /**
150:  * Publication status of a mapping: final (a published catalog or standard), draft (a
151:  * NIST draft), unreviewed (a community crosswalk) or superseded (an older edition).
152:  */
153: export type MappingStatus = "final" | "draft" | "unreviewed" | "superseded";
154:
155: export interface Mapping {
156:   source: string;
157:   target: string;
158:   relationship: MappingRelationship;
159:   origin: CorpusCitation & { authority: string };
160:   /** The publisher's own term for the link, e.g. "mitigates" (MITRE ATLAS). */
161:   label?: string;
162:   status?: MappingStatus;
163:   /** "primary" or "supporting" where the publisher grades its links (OWASP Appendix A). */
164:   strength?: string;
165:   /** Publisher text for the link, e.g. how an ATLAS mitigation applies to a technique. */
166:   note?: string;
167: }
168:
169: export interface MappingSet {
170:   id: string;
171:   title: string;
172:   sourceFramework: string;
173:   targetFramework: string;
174:   authority: string;
175:   status?: MappingStatus;
176:   mappings: Mapping[];
177: }
178:
179: /** A published link from a threat to a catalog Visua does not model (CWE, ATT&CK, CSA AICM, …). */
180: export interface ExternalReference {
181:   scheme: string;
182:   schemeName: string;
183:   id: string | null;
184:   label?: string;
185:   url?: string;
186:   relationship: string;
187:   strength?: string;
188:   authority: string;
189:   status: MappingStatus;
190:   citation: CorpusCitation;
191: }
192:
193: // ---------------------------------------------------------------------------
194: // Workspaces & organization profile (any niche, any maturity)
195: // ---------------------------------------------------------------------------
196:
197: /** Profile vocabularies: the API validates against these, so they cannot drift from the types. */
198: export const PROFILE_INDUSTRIES = [
199:   "saas",
200:   "fintech",
201:   "healthcare",
202:   "manufacturing",
203:   "public-sector",
204:   "defense-contractor",
205:   "education",
206:   "retail",
207:   "energy-utilities",
208:   "nonprofit",
209:   "professional-services",
210:   "other",
211: ] as const;
212: export type Industry = (typeof PROFILE_INDUSTRIES)[number];
213:
214: export const PROFILE_SIZES = ["1-10", "11-50", "51-200", "201-1000", "1000+"] as const;
215: export type OrgSize = (typeof PROFILE_SIZES)[number];
216:
217: export const PROFILE_DATA_TYPES = ["pii", "phi", "cardholder", "cui", "financial", "intellectual-property", "children", "biometric"] as const;
218: export type DataType = (typeof PROFILE_DATA_TYPES)[number];
219:
220: export const PROFILE_DRIVERS = [
221:   "enterprise-customers",
222:   "federal-customers",
223:   "regulator",
224:   "board-mandate",
225:   "cyber-insurance",
226:   "investor-due-diligence",
227:   "incident-recovery",
228:   "build-program",
229:   "ai-systems",
230: ] as const;
231: export type Driver = (typeof PROFILE_DRIVERS)[number];
232:
233: export const PROFILE_ENVIRONMENTS = ["cloud", "on-prem", "hybrid", "ot"] as const;
234:
235: export type GuidanceMode = "guided" | "expert";
236:
237: export interface OrganizationProfile {
238:   industry: Industry;
239:   size: OrgSize;
240:   dataTypes: DataType[];
241:   drivers: Driver[];
242:   environments: (typeof PROFILE_ENVIRONMENTS)[number][];
243:   /** Self-assessed or measured CSF tier (1–4). */
244:   maturityTier: 1 | 2 | 3 | 4;
245:   guidance: GuidanceMode;
246:   securityTeamSize: number;
247: }
248:
249: export interface Soc2Settings {
250:   categories: ("security" | "availability" | "processing-integrity" | "confidentiality" | "privacy")[];
251:   reportType: "type1" | "type2";
252:   observationStart?: string;
253:   observationEnd?: string;
254:   auditFirm?: string;
255: }
256:
257: export type ImpactLevel = "low" | "moderate" | "high";
258:
259: export interface RmfSettings {
260:   systemName: string;
261:   systemDescription?: string;
262:   informationTypes: { id: string; name: string; confidentiality: ImpactLevel; integrity: ImpactLevel; availability: ImpactLevel }[];
263:   categorization?: { confidentiality: ImpactLevel; integrity: ImpactLevel; availability: ImpactLevel; overall: ImpactLevel };
264:   baseline?: "low" | "moderate" | "high";
265:   privacyBaseline?: boolean;
266:   /** Controls added (+) or removed (−) by tailoring, with rationale. */
267:   tailoring: { nodeId: string; action: "add" | "remove"; rationale: string; /** Set when an adopted overlay made the decision. */ source?: string }[];
268:   authorization?: {
269:     decision: "ato" | "iatt" | "dato" | "pending";
270:     authorizingOfficial?: string;
271:     decidedAt?: string;
272:     expiresAt?: string;
273:     rationale?: string;
274:   };
275: }
276:
277: /** AI lifecycle stages (NIST AI 100-1, AI lifecycle and key dimensions). */
278: export type AiLifecycleStage = "plan-design" | "collect-process-data" | "build-use-model" | "verify-validate" | "deploy-use" | "operate-monitor" | "retired";
279:
280: /** One AI system in the organization's inventory (AI RMF GOVERN / MAP work starts here). */
281: export interface AiSystem {
282:   id: string;
283:   name: string;
284:   /** Intended purpose and context of use. */
285:   purpose: string;
286:   /** The organization's role for this system. */
287:   role: "developer" | "deployer" | "developer-deployer";
288:   lifecycle: AiLifecycleStage;
289:   /** Generative AI: the NIST AI 600-1 Generative AI Profile applies. */
290:   generative: boolean;
291:   /** Third-party model, API or platform the system depends on (value chain). */
292:   provider?: string;
293:   /** The organization's own risk tier for the system (AI RMF leaves tiering to the organization). */
294:   riskTier: "low" | "moderate" | "high";
295:   owner?: string;
296:   dataTypes: DataType[];
297:   /** How people oversee or can override the system's outputs. */
298:   humanOversight?: string;
299:   createdAt: string;
300:   updatedAt: string;
301: }
302:
303: export interface AiRmfSettings {
304:   systems: AiSystem[];
305: }
306:
307: export interface WorkspaceFramework {
308:   frameworkId: string;
309:   enabled: boolean;
310:   /** Default target implementation level for in-scope requirements. */
311:   defaultTarget: number;
312:   soc2?: Soc2Settings;
313:   rmf?: RmfSettings;
314:   ai?: AiRmfSettings;
315:   /** Overlays (community profiles, control overlays) adopted on this framework. */
316:   overlays?: OverlayAdoption[];
317:   law?: LawSettings;
318: }
319:
320: /**
321:  * How statutory obligations apply: per law, the roles the organization holds
322:  * under that law's own definitions (e.g. "deployer", "employer"). A law with
323:  * no role selected is out of scope.
324:  */
325: export interface LawSettings {
326:   applicability: Record<string, { roles: string[]; note?: string; decidedAt: string; decidedBy: string }>;
327: }
328:
329: /** The public trust center: computed facts only, for the frameworks the workspace chooses to publish. */
330: export interface TrustCenterSettings {
331:   enabled: boolean;
332:   headline?: string;
333:   contactEmail?: string;
334:   /** Per-framework choice to publish readiness; unset means the default (see trustCenterPublishes). */
335:   frameworks?: Record<string, boolean>;
336: }
337:
338: export interface Workspace {
339:   id: string;
340:   /** Owning organization (tenant). */
341:   tenantId?: string;
342:   name: string;
343:   slug: string;
344:   description?: string;
345:   profile: OrganizationProfile;
346:   frameworks: WorkspaceFramework[];
347:   /** Which proposal types agents may apply without human approval. */
348:   autonomy: Partial<Record<ProposalType, boolean>>;
349:   trustCenter: TrustCenterSettings;
350:   /** Latest CSF Tier assessment (CSWP 29, Appendix B). */
351:   tierAssessment?: TierAssessment;
352:   createdAt: string;
353:   updatedAt: string;
354: }
355:
356: // ---------------------------------------------------------------------------
357: // Assessment state (per workspace × assessable requirement)
358: // ---------------------------------------------------------------------------
359:
360: export const STATUSES = [
361:   "not-started",
362:   "in-progress",
363:   "implemented",
364:   "verified",
365:   "at-risk",
366:   "not-applicable",
367: ] as const;
368: export type Status = (typeof STATUSES)[number];
369:
370: export type Priority = "critical" | "high" | "medium" | "low";
371:
372: export interface RequirementState {
373:   nodeId: string;
374:   /** Current implementation level on the framework's level scale (0–4). */
375:   current: number;
376:   /** Target implementation level (0–4). */
377:   target: number;
378:   priority: Priority;
379:   /** Effective applicability: scope settings (SOC 2 categories, RMF baseline/tailoring) first, then a person's documented exclusion. */
380:   applicable: boolean;
381:   applicabilityRationale?: string;
382:   /** A person's documented "not applicable" decision. Kept separately so scope changes never overwrite it. */
383:   userExclusion?: { rationale: string; at: string; by: string };
384:   owner?: string;
385:   notes?: string;
386:   /** Set when an assessor (human or approved agent) verified the implementation. */
387:   verifiedAt?: string;
388:   /** Manual override; when absent the status is derived. */
389:   statusOverride?: Status;
390:   updatedAt: string;
391:   updatedBy: string;
392: }
393:
394: // ---------------------------------------------------------------------------
395: // Work: tasks, evidence, policies, risks
396: // ---------------------------------------------------------------------------
397:
398: export type TaskStatus = "backlog" | "todo" | "in-progress" | "in-review" | "done" | "blocked";
399: export type TaskKind =
400:   | "governance"
401:   | "policy"
402:   | "procedure"
403:   | "technical"
404:   | "evidence"
405:   | "training"
406:   | "assessment"
407:   | "vendor"
408:   | "monitoring";
409:
410: export type AgentKind =
411:   | "copilot"
412:   | "assessor"
413:   | "planner"
414:   | "policy-author"
415:   | "evidence-collector"
416:   | "crosswalk-analyst"
417:   | "auditor-prep"
418:   | "task-executor";
419:
420: export interface TaskAutomation {
421:   agent: AgentKind;
422:   action: string;
423:   params?: Record<string, unknown>;
424: }
425:
426: export interface ChecklistItem {
427:   id: string;
428:   text: string;
429:   done: boolean;
430: }
431:
432: export interface Task {
433:   id: string;
434:   workspaceId: string;
435:   title: string;
436:   description: string;
437:   kind: TaskKind;
438:   status: TaskStatus;
439:   priority: Priority;
440:   requirementIds: string[];
441:   assignee?: { type: "person" | "agent"; id: string; name: string };
442:   startDate?: string;
443:   dueDate?: string;
444:   effortHours?: number;
445:   checklist: ChecklistItem[];
446:   dependsOn: string[];
447:   automation?: TaskAutomation;
448:   /** Where the task came from: an official implementation example, point of focus, objective… */
449:   source?: CorpusCitation & { basis: string };
450:   /** Implementation level the linked requirements should reach when done. */
451:   targetLevel?: number;
452:   origin: "user" | "agent" | "template";
453:   createdAt: string;
454:   updatedAt: string;
455:   completedAt?: string;
456: }
457:
458: export type EvidenceKind =
459:   | "document"
460:   | "screenshot"
461:   | "configuration"
462:   | "log"
463:   | "attestation"
464:   | "automated-check"
465:   | "policy"
466:   | "report";
467:
468: export type EvidenceStatus = "pending-review" | "accepted" | "rejected" | "expired";
469:
470: export interface Evidence {
471:   id: string;
472:   workspaceId: string;
473:   title: string;
474:   description?: string;
475:   kind: EvidenceKind;
476:   source: "upload" | "connector" | "agent" | "manual";
477:   connectorId?: string;
478:   requirementIds: string[];
479:   status: EvidenceStatus;
480:   collectedAt: string;
481:   validUntil?: string;
482:   content?: string;
483:   data?: Record<string, unknown>;
484:   fileName?: string;
485:   sha256?: string;
486:   reviewedBy?: string;
487:   reviewedAt?: string;
488:   createdAt: string;
489: }
490:
491: export type PolicyStatus = "draft" | "in-review" | "approved" | "published" | "retired";
492:
493: export interface Policy {
494:   id: string;
495:   workspaceId: string;
496:   title: string;
497:   slug: string;
498:   version: number;
499:   status: PolicyStatus;
500:   body: string;
501:   requirementIds: string[];
502:   owner?: string;
503:   reviewCadenceDays: number;
504:   approvedBy?: string;
505:   approvedAt?: string;
506:   origin: "user" | "agent" | "template";
507:   agentRunId?: string;
508:   createdAt: string;
509:   updatedAt: string;
510: }
511:
512: export interface Risk {
513:   id: string;
514:   workspaceId: string;
515:   title: string;
516:   description: string;
517:   likelihood: 1 | 2 | 3 | 4 | 5;
518:   impact: 1 | 2 | 3 | 4 | 5;
519:   treatment: "mitigate" | "accept" | "transfer" | "avoid";
520:   status: "open" | "treating" | "accepted" | "closed";
521:   requirementIds: string[];
522:   owner?: string;
523:   createdAt: string;
524:   updatedAt: string;
525: }
526:
527: // ---------------------------------------------------------------------------
528: // Monitoring
529: // ---------------------------------------------------------------------------
530:
531: export type CheckOutcome = "pass" | "warn" | "fail" | "error";
532:
533: export interface CheckResult {
534:   id: string;
535:   workspaceId: string;
536:   connectorId: string;
537:   checkId: string;
538:   title: string;
539:   outcome: CheckOutcome;
540:   detail: string;
541:   requirementIds: string[];
542:   observed: Record<string, unknown>;
543:   observedAt: string;
544:   evidenceId?: string;
545: }
546:
547: export interface Connector {
548:   id: string;
549:   workspaceId: string;
550:   kind: string;
551:   name: string;
552:   config: Record<string, unknown>;
553:   status: "active" | "paused" | "error";
554:   lastRunAt?: string;
555:   createdAt: string;
556: }
557:
558: // ---------------------------------------------------------------------------
559: // Agents (glass-box, human-in-the-loop)
560: // ---------------------------------------------------------------------------
561:
562: export type AgentRunStatus = "queued" | "running" | "awaiting-approval" | "completed" | "failed" | "cancelled";
563:
564: export type AgentStepType =
565:   | "plan"
566:   | "thought"
567:   | "tool-call"
568:   | "tool-result"
569:   | "citation"
570:   | "proposal"
571:   | "message"
572:   | "ui"
573:   | "error";
574:
575: export interface Citation {
576:   documentId: string;
577:   documentTitle: string;
578:   locator?: string;
579:   page?: number;
580:   quote: string;
581: }
582:
583: export interface AgentStep {
584:   id: string;
585:   at: string;
586:   type: AgentStepType;
587:   title: string;
588:   detail?: string;
589:   data?: unknown;
590:   citations?: Citation[];
591:   /** Requirement nodes this step touched (drives the 3D agent comet). */
592:   nodeIds?: string[];
593: }
594:
595: export type ProposalType =
596:   | "set-level"
597:   | "set-target"
598:   | "set-applicability"
599:   | "create-task"
600:   | "update-task"
601:   | "create-evidence"
602:   | "review-evidence"
603:   | "create-policy"
604:   | "create-risk"
605:   | "set-rmf";
606:
607: export type ProposalStatus = "pending" | "approved" | "rejected" | "applied" | "failed";
608:
609: export interface Proposal {
610:   id: string;
611:   runId: string;
612:   workspaceId: string;
613:   type: ProposalType;
614:   title: string;
615:   rationale: string;
616:   payload: Record<string, unknown>;
617:   citations: Citation[];
618:   confidence: "low" | "medium" | "high";
619:   status: ProposalStatus;
620:   nodeIds: string[];
621:   decidedBy?: string;
622:   decidedAt?: string;
623:   createdAt: string;
624: }
625:
626: export interface AgentRun {
627:   id: string;
628:   workspaceId: string;
629:   agent: AgentKind;
630:   goal: string;
631:   input: Record<string, unknown>;
632:   status: AgentRunStatus;
633:   mode: "claude" | "offline";
634:   model?: string;
635:   steps: AgentStep[];
636:   summary?: string;
637:   focusNodeIds: string[];
638:   taskId?: string;
639:   usage?: { inputTokens: number; outputTokens: number };
640:   error?: string;
641:   /** User id of the person (or token) that started the run. */
642:   startedBy?: string;
643:   createdAt: string;
644:   startedAt?: string;
645:   finishedAt?: string;
646: }
647:
648: // ---------------------------------------------------------------------------
649: // Audit trail
650: // ---------------------------------------------------------------------------
651:
652: export interface ActivityEvent {
653:   id: string;
654:   workspaceId: string;
655:   at: string;
656:   actor: string;
657:   /** Authenticated principal behind the actor (user or API token id), when there is one. */
658:   actorId?: string;
659:   action: string;
660:   entity: string;
661:   entityId: string;
662:   summary: string;
663:   data?: Record<string, unknown>;
664:   /** Monotonic position in the workspace's audit trail. */
665:   seq?: number;
666:   /** SHA-256 of the previous event (hash chain → tamper-evident audit trail). */
667:   prevHash?: string;
668:   /** SHA-256 over (prevHash + canonical event body). */
669:   hash?: string;
670: }

FILE packages/core/test/core.test.ts SHA256 52304704274db913c7375781fe31ae80353aef24e3696624ce86c0d2eba5d120
1: import { describe, expect, it } from "vitest";
2: import {
3:   CrosswalkIndex,
4:   FrameworkIndex,
5:   buildSnapshot,
6:   deriveStatus,
7:   estimateTier,
8:   groupStatus,
9:   planTasks,
10:   projectLevels,
11:   recommend,
12:   scoreFramework,
13:   targetFor,
14:   type Evidence,
15:   type MappingSet,
16:   type Task,
17: } from "../src/index.ts";
18: import { miniGraph, state } from "./fixtures.ts";
19:
20: const index = new FrameworkIndex(miniGraph);
21: const NOW = new Date("2026-06-01T00:00:00Z");
22:
23: const evidence = (nodeCode: string, extra: Partial<Evidence> = {}): Evidence => ({
24:   id: `ev-${nodeCode}`,
25:   workspaceId: "ws",
26:   title: `Evidence for ${nodeCode}`,
27:   kind: "document",
28:   source: "upload",
29:   requirementIds: [`test-csf:${nodeCode}`],
30:   status: "accepted",
31:   collectedAt: "2026-05-01T00:00:00Z",
32:   validUntil: "2027-05-01T00:00:00Z",
33:   createdAt: "2026-05-01T00:00:00Z",
34:   ...extra,
35: });
36:
37: describe("FrameworkIndex", () => {
38:   it("indexes hierarchy, codes and units of work", () => {
39:     expect(index.roots().map((n) => n.code)).toEqual(["GV", "PR"]);
40:     expect(index.childrenOf("test-csf:PR").map((n) => n.code)).toEqual(["PR.AA", "PR.DS"]);
41:     expect(index.get("pr.aa-03")?.id).toBe("test-csf:PR.AA-03");
42:     expect(index.ancestors("test-csf:PR.DS-11").map((n) => n.code)).toEqual(["PR", "PR.DS"]);
43:     expect(index.assessable).toHaveLength(5);
44:     expect(index.assessableUnder("test-csf:PR").map((n) => n.code)).toEqual(["PR.AA-01", "PR.AA-03", "PR.DS-01", "PR.DS-11"]);
45:   });
46:
47:   it("searches codes before prose", () => {
48:     const hits = index.search("backups");
49:     expect(hits[0]?.code).toBe("PR.DS-11");
50:     expect(index.search("PR.AA")[0]?.code).toBe("PR.AA");
51:   });
52: });
53:
54: describe("deriveStatus", () => {
55:   const base = { evidence: [], tasks: [], checks: [], now: NOW };
56:   it("covers the status lifecycle", () => {
57:     expect(deriveStatus({ ...base, state: undefined }).status).toBe("not-started");
58:     expect(deriveStatus({ ...base, state: state("PR.AA-01", 1, 3) }).status).toBe("in-progress");
59:     expect(deriveStatus({ ...base, state: state("PR.AA-01", 3, 3) }).status).toBe("implemented");
60:     expect(
61:       deriveStatus({ ...base, state: state("PR.AA-01", 3, 3, { verifiedAt: "2026-05-02" }), evidence: [evidence("PR.AA-01")] }).status,
62:     ).toBe("verified");
63:     expect(deriveStatus({ ...base, state: state("PR.AA-01", 0, 3, { applicable: false }) }).status).toBe("not-applicable");
64:   });
65:
66:   it("flags expired evidence and overdue tasks as at-risk", () => {
67:     const expired = evidence("PR.AA-01", { validUntil: "2026-01-01T00:00:00Z" });
68:     const r1 = deriveStatus({ ...base, state: state("PR.AA-01", 3, 3), evidence: [expired] });
69:     expect(r1.status).toBe("at-risk");
70:     expect(r1.reasons[0]).toMatch(/expired/);
71:     const overdue = { id: "t", status: "todo", dueDate: "2026-05-01", requirementIds: [] } as unknown as Task;
72:     expect(deriveStatus({ ...base, state: state("PR.AA-01", 1, 3), tasks: [overdue] }).status).toBe("at-risk");
73:   });
74: });
75:
76: describe("scoreFramework", () => {
77:   it("rolls readiness, gaps and evidence coverage up the hierarchy", () => {
78:     const snapshot = buildSnapshot({
79:       states: [
80:         state("GV.PO-01", 3, 3, { priority: "high" }),
81:         state("PR.AA-01", 2, 4, { priority: "critical" }),
82:         state("PR.AA-03", 4, 4),
83:         state("PR.DS-01", 0, 3),
84:         state("PR.DS-11", 0, 3, { applicable: false }),
85:       ],
86:       evidence: [evidence("GV.PO-01"), evidence("PR.AA-03")],
87:       tasks: [],
88:       checks: [],
89:     });
90:     const result = scoreFramework(index, snapshot, NOW);
91:     const overall = result.overall;
92:     expect(overall.total).toBe(4);
93:     expect(overall.counts["not-applicable"]).toBe(1);
94:     // readiness: GV.PO-01 1×3, PR.AA-01 0.5×4, PR.AA-03 1×2, PR.DS-01 0×2 → (3+2+2)/(3+4+2+2)
95:     expect(overall.readiness).toBeCloseTo(7 / 11, 5);
96:     expect(overall.gaps).toBe(2);
97:     expect(overall.evidenceCoverage).toBeCloseTo(0.5);
98:     const aa = result.scores.get("test-csf:PR.AA")!;
99:     expect(aa.total).toBe(2);
100:     expect(groupStatus(aa)).toBe("in-progress");
101:     expect(groupStatus(result.scores.get("test-csf:GV")!)).toBe("implemented");
102:   });
103: });
104:
105: describe("recommend", () => {
106:   it("adapts framework path, targets and priorities to the organization", () => {
107:     const rec = recommend({
108:       industry: "healthcare",
109:       size: "11-50",
110:       dataTypes: ["phi"],
111:       drivers: ["enterprise-customers"],
112:       environments: ["cloud"],
113:       maturityTier: 1,
114:       guidance: "guided",
115:       securityTeamSize: 1,
116:     });
117:     expect(rec.frameworks[0]?.frameworkId).toBe("nist-csf-2.0");
118:     expect(rec.frameworks[1]?.frameworkId).toBe("aicpa-tsc-2017");
119:     expect(rec.frameworks.some((f) => f.frameworkId === "hipaa-security-rule" && f.availability === "roadmap")).toBe(true);
120:     expect(rec.categoryPriorities["PR.DS"]).toBe("critical");
121:     expect(rec.defaultTarget).toBe(2);
122:     expect(targetFor("critical", rec)).toBeGreaterThanOrEqual(rec.defaultTarget);
123:     expect(rec.rationale.length).toBeGreaterThan(2);
124:
125:     const federal = recommend({
126:       industry: "defense-contractor",
127:       size: "201-1000",
128:       dataTypes: ["cui"],
129:       drivers: ["federal-customers"],
130:       environments: ["hybrid"],
131:       maturityTier: 3,
132:       guidance: "expert",
133:       securityTeamSize: 8,
134:     });
135:     expect(federal.frameworks[1]?.frameworkId).toBe("nist-sp-800-53-r5");
136:     expect(federal.defaultTarget).toBe(4);
137:   });
138:
139:   it("estimates a CSF tier from quick-check answers", () => {
140:     expect(estimateTier([0, 0, 1, 0])).toBe(1);
141:     expect(estimateTier([1, 1, 1, 2])).toBe(2);
142:     expect(estimateTier([2, 2, 2, 1])).toBe(3);
143:     expect(estimateTier([3, 3, 2, 3])).toBe(4);
144:   });
145: });
146:
147: describe("planTasks", () => {
148:   it("creates grounded, prioritized, scheduled tasks for every gap", () => {
149:     let n = 0;
150:     const states = new Map(
151:       [
152:         state("GV.PO-01", 0, 3, { priority: "high" }),
153:         state("PR.AA-01", 1, 4, { priority: "critical" }),
154:         state("PR.AA-03", 4, 4),
155:         state("PR.DS-11", 0, 2, { priority: "low" }),
156:       ].map((s) => [s.nodeId, s]),
157:     );
158:     const tasks = planTasks(index, states, {
159:       workspaceId: "ws",
160:       startDate: new Date("2026-06-01T00:00:00Z"),
161:       weeklyCapacityHours: 20,
162:       idFactory: () => `id${++n}`,
163:     });
164:     expect(tasks.map((t) => t.requirementIds[0])).toEqual(["test-csf:PR.AA-01", "test-csf:GV.PO-01", "test-csf:PR.DS-11"]);
165:     const policy = tasks.find((t) => t.requirementIds[0] === "test-csf:GV.PO-01")!;
166:     expect(policy.kind).toBe("policy");
167:     expect(policy.automation?.agent).toBe("policy-author");
168:     expect(policy.checklist[0]?.text).toMatch(/risk management policy/);
169:     expect(policy.source?.basis).toBe("Official Implementation Examples");
170:     for (const t of tasks) expect(t.dueDate! >= t.startDate!).toBe(true);
171:   });
172: });
173:
174: describe("crosswalk", () => {
175:   const set: MappingSet = {
176:     id: "m1",
177:     title: "test",
178:     sourceFramework: "test-csf",
179:     targetFramework: "test-soc2",
180:     authority: "Test",
181:     mappings: [
182:       { source: "test-csf:PR.AA-01", target: "test-soc2:CC6.1", relationship: "intersects-with", origin: { documentId: "d", authority: "Test" } },
183:       { source: "test-csf:PR.AA-03", target: "test-soc2:CC6.1", relationship: "equivalent", origin: { documentId: "d", authority: "Test" } },
184:       { source: "test-soc2:CC6.1", target: "test-800-53:AC-2", relationship: "related-to", origin: { documentId: "d", authority: "Test" } },
185:     ],
186:   };
187:   const cw = new CrosswalkIndex([set]);
188:
189:   it("indexes mappings bidirectionally and reaches across frameworks", () => {
190:     expect(cw.related("test-soc2:CC6.1").map((e) => e.to).sort()).toEqual(["test-800-53:AC-2", "test-csf:PR.AA-01", "test-csf:PR.AA-03"]);
191:     expect(cw.related("test-soc2:CC6.1", "test-csf")).toHaveLength(2);
192:     const reach = cw.reach("test-csf:PR.AA-03", 2);
193:     expect(reach.get("test-800-53:AC-2")?.via).toEqual(["test-soc2:CC6.1"]);
194:   });
195:
196:   it("projects progress with confidence", () => {
197:     const states = new Map([state("PR.AA-01", 2, 3), state("PR.AA-03", 3, 3)].map((s) => [s.nodeId, s]));
198:     const [p] = projectLevels(cw, ["test-soc2:CC6.1"], states);
199:     expect(p?.sources).toHaveLength(2);
200:     expect(p?.suggested).toBeGreaterThanOrEqual(2);
201:     expect(p?.confidence).toBe("high");
202:   });
203: });

FILE packages/core/test/fixtures.ts SHA256 ca5f1ad3ecd03db3cc89e6a83338be35ca05b763a308cc50f89943062f72f745
1: import type { FrameworkGraph, RequirementNode, RequirementState } from "../src/index.ts";
2:
3: const node = (partial: Partial<RequirementNode> & Pick<RequirementNode, "code" | "kind" | "parentId">): RequirementNode => ({
4:   id: `test-csf:${partial.code}`,
5:   frameworkId: "test-csf",
6:   depth: partial.parentId ? partial.parentId.split(".").length : 0,
7:   order: 0,
8:   title: partial.code,
9:   text: `${partial.code} statement`,
10:   citation: { documentId: "test-doc" },
11:   assessable: partial.kind === "subcategory",
12:   ...partial,
13: });
14:
15: /** A miniature CSF-shaped graph: 2 functions, 3 categories, 5 subcategories. */
16: export const miniGraph: FrameworkGraph = {
17:   framework: {
18:     id: "test-csf",
19:     family: "csf",
20:     shortName: "Test CSF",
21:     name: "Test Cybersecurity Framework",
22:     publisher: "Test",
23:     version: "1",
24:     published: "2024-02-26",
25:     description: "fixture",
26:     levels: [
27:       { kind: "function", label: "Function", pluralLabel: "Functions" },
28:       { kind: "category", label: "Category", pluralLabel: "Categories" },
29:       { kind: "subcategory", label: "Subcategory", pluralLabel: "Subcategories" },
30:     ],
31:     assessableKind: "subcategory",
32:     sources: [{ documentId: "test-doc" }],
33:     unitLabel: "outcome",
34:     unitLabelPlural: "outcomes",
35:   },
36:   nodes: [
37:     node({ code: "GV", kind: "function", parentId: null, order: 0, title: "GOVERN", depth: 0 }),
38:     node({ code: "GV.PO", kind: "category", parentId: "test-csf:GV", order: 0, title: "Policy", depth: 1 }),
39:     node({
40:       code: "GV.PO-01",
41:       kind: "subcategory",
42:       parentId: "test-csf:GV.PO",
43:       order: 0,
44:       depth: 2,
45:       text: "Policy for managing cybersecurity risks is established based on organizational context, cybersecurity strategy, and priorities and is communicated and enforced",
46:       examples: [
47:         { code: "GV.PO-01 Ex1", text: "Create, disseminate, and maintain an understandable, usable risk management policy" },
48:         { code: "GV.PO-01 Ex2", text: "Include statements of management intent and expectations" },
49:       ],
50:     }),
51:     node({ code: "PR", kind: "function", parentId: null, order: 1, title: "PROTECT", depth: 0 }),
52:     node({ code: "PR.AA", kind: "category", parentId: "test-csf:PR", order: 0, title: "Identity Management, Authentication, and Access Control", depth: 1 }),
53:     node({ code: "PR.AA-01", kind: "subcategory", parentId: "test-csf:PR.AA", order: 0, depth: 2, text: "Identities and credentials for authorized users, services, and hardware are managed by the organization" }),
54:     node({ code: "PR.AA-03", kind: "subcategory", parentId: "test-csf:PR.AA", order: 1, depth: 2, text: "Users, services, and hardware are authenticated" }),
55:     node({ code: "PR.DS", kind: "category", parentId: "test-csf:PR", order: 1, title: "Data Security", depth: 1 }),
56:     node({ code: "PR.DS-01", kind: "subcategory", parentId: "test-csf:PR.DS", order: 0, depth: 2, text: "The confidentiality, integrity, and availability of data-at-rest are protected" }),
57:     node({ code: "PR.DS-11", kind: "subcategory", parentId: "test-csf:PR.DS", order: 1, depth: 2, text: "Backups of data are created, protected, maintained, and tested" }),
58:   ],
59: };
60:
61: export const state = (code: string, current: number, target: number, extra: Partial<RequirementState> = {}): RequirementState => ({
62:   nodeId: `test-csf:${code}`,
63:   current,
64:   target,
65:   priority: "medium",
66:   applicable: true,
67:   updatedAt: "2026-01-01T00:00:00.000Z",
68:   updatedBy: "test",
69:   ...extra,
70: });

FILE packages/frameworks/scripts/ingest.ts SHA256 d4429a057357e38f30750e6a17d9491db606d067e634154c75062541d744c8d0
1: /**
2:  * Ingestion pipeline: official corpus → normalized Visua data.
3:  *
4:  *   corpus/<framework>/…  ──►  packages/frameworks/data/<framework-id>.json
5:  *                              packages/frameworks/data/mappings/*.json
6:  *                              packages/frameworks/data/threat-mappings/*.json
7:  *                              packages/frameworks/data/overlays/*.json
8:  *                              packages/frameworks/data/chunks/<corpus>.json
9:  *                              packages/frameworks/data/_ingest-report.json
10:  *
11:  * Run with `pnpm ingest`. Deterministic: same corpus in, same data out.
12:  */
13: import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
14: import { resolve } from "node:path";
15: import type { FrameworkGraph, FrameworkOverlay, MappingSet, RequirementNode } from "@visua/core";
16: import { loadCorpusManifests, type CorpusDocument } from "../src/index.ts";
17: import { CORPUS_DIR, DATA_DIR } from "../src/paths.ts";
18: import type { CorpusChunk } from "../src/search.ts";
19: import { csfMappingSets, ingestCsf } from "../src/ingest/csf.ts";
20: import { chunkPages, pdfPages } from "../src/ingest/pdf.ts";
21: import { ingestRmf, rmfToControls } from "../src/ingest/rmf.ts";
22: import { ingest80053 } from "../src/ingest/sp80053.ts";
23: import { ingestAiRmf } from "../src/ingest/ai-rmf.ts";
24: import { ingestCosais, ingestCyberAiProfile } from "../src/ingest/ai-overlays.ts";
25: import { ingestStateLaws } from "../src/ingest/state-laws.ts";
26: import { ingestThreatCatalogs, threatLinks } from "../src/ingest/threats.ts";
27: import { buildTscGraph } from "../src/ingest/tsc.ts";
28: import { aicpaTscMappingSets } from "../src/ingest/tsc-mappings.ts";
29:
30: const started = Date.now();
31: const log = (msg: string) => console.log(`[ingest ${((Date.now() - started) / 1000).toFixed(1)}s] ${msg}`);
32:
33: mkdirSync(resolve(DATA_DIR, "mappings"), { recursive: true });
34:
35: const graphs: FrameworkGraph[] = [];
36: const csf = await ingestCsf();
37: graphs.push(csf.graph);
38: log(`NIST CSF 2.0: ${csf.graph.nodes.length} nodes (${csf.graph.nodes.filter((n) => n.assessable).length} outcomes)`);
39:
40: const sp80053 = await ingest80053();
41: graphs.push(sp80053);
42: log(`SP 800-53 Rev. 5: ${sp80053.nodes.length} nodes (${sp80053.nodes.filter((n) => n.assessable).length} controls + enhancements)`);
43:
44: const rmf = ingestRmf();
45: graphs.push(rmf.graph);
46: log(`NIST RMF: ${rmf.graph.nodes.length} nodes (${rmf.graph.nodes.filter((n) => n.assessable).length} tasks)`);
47:
48: const aiRmf = ingestAiRmf();
49: if (aiRmf) {
50:   graphs.push(aiRmf);
51:   const actions = aiRmf.nodes.reduce((n, x) => n + ((x.attributes?.["profileActions"] as unknown[]) ?? []).length, 0);
52:   log(`NIST AI RMF: ${aiRmf.nodes.length} nodes (${aiRmf.nodes.filter((n) => n.assessable).length} outcomes; ${aiRmf.profiles?.[0]?.risks.length ?? 0} GAI risks, ${actions} Generative AI Profile actions)`);
53: } else {
54:   log("NIST AI RMF: corpus not available — skipped");
55: }
56:
57: const laws = ingestStateLaws();
58: if (laws) {
59:   graphs.push(laws);
60:   const count = (kind: string) => laws.nodes.filter((n) => n.kind === kind).length;
61:   log(`U.S. state AI laws: ${count("jurisdiction")} jurisdictions, ${count("law")} laws, ${count("obligation")} obligations`);
62: } else {
63:   log("U.S. state AI laws: corpus not available — skipped");
64: }
65:
66: // Threat catalogs (never assessed; viewed through the requirements linked to them).
67: const threatGraphs = ingestThreatCatalogs();
68: for (const g of threatGraphs) {
69:   graphs.push(g);
70:   const byKind = g.nodes.reduce<Record<string, number>>((acc, n) => ((acc[n.kind] = (acc[n.kind] ?? 0) + 1), acc), {});
71:   log(`${g.framework.shortName} ${g.framework.version}: ${Object.entries(byKind).map(([k, v]) => `${v} ${k}`).join(", ")}`);
72: }
73: if (!threatGraphs.length) log("AI threat catalogs: corpus not available — skipped");
74:
75: const tsc = buildTscGraph();
76: graphs.push(tsc);
77: const tscLicensed = tsc.nodes.filter((n) => n.attributes?.["licensed"] === true).length;
78: log(`AICPA TSC (SOC 2): ${tsc.nodes.length} nodes (${tsc.nodes.filter((n) => n.assessable).length} criteria; ${tscLicensed ? `official text from the local licensed copy for ${tscLicensed}` : "Visua skeleton — no licensed local copy"})`);
79:
80: const ids = new Set(graphs.flatMap((g) => g.nodes.map((n) => n.id)));
81: const exists = (id: string) => ids.has(id);
82:
83: // Drop dangling cross-framework node links in informative references.
84: for (const g of graphs) for (const n of g.nodes) for (const r of n.references ?? []) if (r.nodeId && !exists(r.nodeId)) delete r.nodeId;
85:
86: const aicpa = await aicpaTscMappingSets(exists);
87: for (const [k, v] of Object.entries(aicpa.report)) log(`  ${k}: ${v}`);
88: const mappingSets: MappingSet[] = [...csfMappingSets(csf.crosswalkRefs, exists), rmfToControls(exists), ...aicpa.sets];
89: for (const set of mappingSets) {
90:   writeFileSync(resolve(DATA_DIR, "mappings", `${set.id}.json`), JSON.stringify(set, null, 1));
91:   log(`mapping ${set.id}: ${set.mappings.length}`);
92: }
93:
94: // Threat links: one set per publishing authority, labeled with its status (final, draft,
95: // unreviewed, superseded). Links to catalogs Visua does not model become node references.
96: const threats = threatLinks(exists);
97: rmSync(resolve(DATA_DIR, "threat-mappings"), { recursive: true, force: true });
98: if (threats.sets.length) mkdirSync(resolve(DATA_DIR, "threat-mappings"), { recursive: true });
99: for (const set of threats.sets) {
100:   writeFileSync(resolve(DATA_DIR, "threat-mappings", `${set.id}.json`), JSON.stringify(set, null, 1));
101:   log(`threat links ${set.id} (${set.status}): ${set.mappings.length}`);
102: }
103: const nodeIndex = new Map(graphs.flatMap((g) => g.nodes.map((n) => [n.id, n] as const)));
104: for (const [nodeId, refs] of threats.external) {
105:   const node = nodeIndex.get(nodeId)!;
106:   node.attributes = { ...node.attributes, externalRefs: refs };
107: }
108: if (threatGraphs.length) {
109:   log(`threat links kept: ${threats.kept}; external references: ${[...threats.external.values()].reduce((n, r) => n + r.length, 0)}`);
110:   for (const [why, n] of Object.entries(threats.dropped)) log(`  dropped ${n}: ${why}`);
111: }
112:
113: for (const g of graphs) writeFileSync(resolve(DATA_DIR, `${g.framework.id}.json`), JSON.stringify(g));
114:
115: // Overlays: NIST drafts that specialize CSF 2.0 and SP 800-53 for AI systems.
116: mkdirSync(resolve(DATA_DIR, "overlays"), { recursive: true });
117: const overlays = [ingestCyberAiProfile(ids), ingestCosais(ids)].filter((o): o is FrameworkOverlay => !!o);
118: for (const o of overlays) {
119:   writeFileSync(resolve(DATA_DIR, "overlays", `${o.id}.json`), JSON.stringify(o));
120:   const priorities = o.lenses?.map((l) => `${l.short} ${[1, 2, 3].map((p) => o.entries.filter((e) => e.lenses?.[l.id]?.priority === p).length).join("/")}`).join(", ");
121:   log(`overlay ${o.id} (${o.status}) on ${o.frameworkId}: ${o.entries.length} entries${priorities ? `; priorities 1/2/3: ${priorities}` : ""}`);
122: }
123:
124: // ---------------------------------------------------------------------------
125: // Corpus search index
126: // ---------------------------------------------------------------------------
127:
128: const manifests = loadCorpusManifests();
129: const docs = new Map<string, CorpusDocument & { framework: string }>();
130: for (const m of manifests) for (const d of m.documents) docs.set(d.id, { ...d, framework: m.framework });
131:
132: const chunks: CorpusChunk[] = [];
133:
134: /** Structured chunks: one per requirement, citing its official source location. */
135: function nodeChunk(n: RequirementNode): CorpusChunk {
136:   const doc = docs.get(n.citation.documentId);
137:   const parts = [`${n.code}${n.title ? ` ${n.title}` : ""}: ${n.text}`];
138:   if (n.examples?.length) parts.push(`Implementation examples: ${n.examples.map((e) => e.text).join(" ")}`);
139:   const pof = n.attributes?.["pointsOfFocus"] as { title: string; text?: string }[] | undefined;
140:   if (pof?.length) parts.push(`Points of focus: ${pof.map((p) => `${p.title}. ${p.text ?? ""}`).join(" ")}`);
141:   const suggested = n.attributes?.["suggestedActions"] as string[] | undefined;
142:   if (suggested?.length) parts.push(`Suggested actions (AI RMF Playbook): ${suggested.join(" ")}`);
143:   const profileActions = n.attributes?.["profileActions"] as { id: string; text: string }[] | undefined;
144:   if (profileActions?.length) parts.push(`Generative AI Profile actions: ${profileActions.map((a) => `${a.id} ${a.text}`).join(" ")}`);
145:   const prevention = n.attributes?.["preventionStrategies"] as { title?: string; text: string }[] | undefined;
146:   if (prevention?.length) parts.push(`Prevention and mitigation strategies: ${prevention.map((p) => `${p.title ? `${p.title}. ` : ""}${p.text}`).join(" ")}`);
147:   if (n.guidance) parts.push(`Discussion: ${n.guidance.slice(0, 1600)}`);
148:   return {
149:     id: `node:${n.id}`,
150:     documentId: n.citation.documentId,
151:     documentTitle: doc?.title ?? n.citation.documentId,
152:     framework: doc?.framework ?? (n.frameworkId === "aicpa-tsc-2017" ? "aicpa-soc2" : n.frameworkId === "nist-csf-2.0" ? "nist-csf-2.0" : n.frameworkId === "nist-ai-rmf" ? "nist-ai-rmf" : "nist-rmf"),
153:     page: n.citation.page,
154:     locator: n.citation.locator ?? n.code,
155:     text: parts.join("\n"),
156:   };
157: }
158: for (const g of graphs) for (const n of g.nodes) if (n.text) chunks.push(nodeChunk(n));
159:
160: /** Overlay entries are searchable too, always labeled with the draft's status. */
161: const nodeById = new Map(graphs.flatMap((g) => g.nodes.map((n) => [n.id, n] as const)));
162: for (const o of overlays) {
163:   const doc = docs.get(o.documentId);
164:   for (const e of o.entries) {
165:     const node = nodeById.get(e.nodeId);
166:     const parts = [`${o.shortName} (${o.identifier}, ${o.status}) for ${node?.code ?? e.nodeId}${node?.title ? ` ${node.title}` : ""}.`];
167:     if (e.general?.considerations) parts.push(`General considerations: ${e.general.considerations}`);
168:     for (const l of o.lenses ?? []) {
169:       const f = e.lenses?.[l.id];
170:       if (!f) continue;
171:       const level = o.priorityLevels?.find((p) => p.level === f.priority)?.label;
172:       parts.push(`${l.short}: proposed priority ${f.priority}${level ? ` (${level})` : ""}.${f.opportunities ? ` Opportunities: ${f.opportunities}` : ""}${f.considerations ? ` Considerations: ${f.considerations}` : ""}${f.references.length ? ` Example informative references: ${f.references.join("; ")}.` : ""}`);
173:     }
174:     if (e.control) {
175:       const c = e.control;
176:       parts.push(`Selected in the overlay${c.annotated ? " (annotated)" : c.proposedAdditional ? " (additional proposed control)" : ""}.${c.lifecyclePhases?.length ? ` AI lifecycle phases: ${c.lifecyclePhases.join(", ")}.` : ""}${c.assumptions ? ` Assumptions: ${c.assumptions}` : ""}`);
177:       for (const t of c.tailoringSections ?? []) parts.push(`${t.label}: ${t.text}`);
178:       if (c.attackIds?.length) parts.push(`NIST AI 100-2 attacks: ${c.attackIds.join(", ")}.`);
179:     }
180:     chunks.push({
181:       id: `overlay:${o.id}:${e.nodeId}`,
182:       documentId: o.documentId,
183:       documentTitle: doc?.title ?? o.title,
184:       framework: doc?.framework ?? "nist-ai-rmf",
185:       page: e.citation.page,
186:       locator: e.citation.locator ?? e.nodeId,
187:       text: parts.join("\n"),
188:     });
189:   }
190: }
191: log(`structured chunks: ${chunks.length}`);
192:
193: const INCLUDED_ROLES = new Set(["core", "quick-start-guide", "categorization", "criteria", "description-criteria", "guide", "profile"]);
194: const EXCLUDED_DOCS = new Set([
195:   "csf-2-0-implementation-examples-pdf",
196:   "nist-sp-800-53r5",
197:   "nist-sp-800-53ar5",
198:   "nist-sp-800-60r2-iwd",
199:   // Superseded AICPA editions and red-lines: the current 2022 editions are indexed instead.
200:   "tsc-2017-rev-pof-2022-redlined",
201:   "tsc-2017-march-2020-updates",
202:   "tsc-2017-march-2020-updates-redlined",
203:   "tsc-2017-original-april-2017",
204:   "dc200-2018-original",
205:   "dc200a-2015-description-criteria",
206: ]);
207: const isDraft = (d: CorpusDocument) => /draft|\(ipd\)|\(iprd\)|\(2pd\)|\(iwd\)/i.test(`${d.version ?? ""} ${d.identifier ?? ""}`) || /\/drafts\/|\.ipd\.|\.iprd\.|\.2pd\.|\.iwd\./.test(d.path);
208:
209: let pdfCount = 0;
210: for (const d of docs.values()) {
211:   if (d.mediaType !== "application/pdf" || !INCLUDED_ROLES.has(d.role) || EXCLUDED_DOCS.has(d.id) || isDraft(d)) continue;
212:   const path = resolve(CORPUS_DIR, d.path);
213:   if (!existsSync(path)) continue;
214:   try {
215:     const pages = await pdfPages(path);
216:     const docChunks = chunkPages({ documentId: d.id, documentTitle: d.title, framework: d.framework }, pages);
217:     chunks.push(...docChunks);
218:     pdfCount++;
219:     log(`  ${d.id}: ${pages.length} pages → ${docChunks.length} chunks`);
220:   } catch (err) {
221:     log(`  ${d.id}: FAILED (${(err as Error).message})`);
222:   }
223: }
224: // One file per corpus: licensed corpora (AICPA) stay local and git-ignored.
225: mkdirSync(resolve(DATA_DIR, "chunks"), { recursive: true });
226: const byCorpus = new Map<string, CorpusChunk[]>();
227: for (const c of chunks) byCorpus.set(c.framework, [...(byCorpus.get(c.framework) ?? []), c]);
228: for (const [corpus, list] of byCorpus) {
229:   writeFileSync(resolve(DATA_DIR, "chunks", `${corpus}.json`), JSON.stringify(list));
230:   log(`  chunks/${corpus}.json: ${list.length}`);
231: }
232: if (existsSync(resolve(DATA_DIR, "corpus-chunks.json"))) rmSync(resolve(DATA_DIR, "corpus-chunks.json"));
233: log(`corpus index: ${chunks.length} chunks from ${pdfCount} PDFs + structured requirements`);
234:
235: const report = {
236:   generatedAt: new Date().toISOString(),
237:   frameworks: graphs.map((g) => ({
238:     id: g.framework.id,
239:     nodes: g.nodes.length,
240:     assessable: g.nodes.filter((n) => n.assessable).length,
241:     byKind: g.nodes.reduce<Record<string, number>>((acc, n) => ((acc[n.kind] = (acc[n.kind] ?? 0) + 1), acc), {}),
242:   })),
243:   mappings: mappingSets.map((m) => ({ id: m.id, count: m.mappings.length, authority: m.authority })),
244:   threatMappings: threats.sets.map((m) => ({ id: m.id, count: m.mappings.length, authority: m.authority, status: m.status })),
245:   overlays: overlays.map((o) => ({ id: o.id, frameworkId: o.frameworkId, status: o.status, entries: o.entries.length })),
246:   corpus: { chunks: chunks.length, pdfDocuments: pdfCount, manifests: manifests.map((m) => ({ framework: m.framework, documents: m.documents.length })) },
247:   sources: manifests.flatMap((m) => m.documents.filter((d) => d.role === "machine-readable" || d.role === "criteria").map((d) => ({ id: d.id, sha256: d.sha256 }))),
248: };
249: writeFileSync(resolve(DATA_DIR, "_ingest-report.json"), JSON.stringify(report, null, 2));
250: log("done");
251:
252: // Keep TypeScript happy about unused imports when optional corpora are absent.
253: void readFileSync;

FILE packages/frameworks/data/NOTICE.md SHA256 9e7710e21af201d8875ab432e48632d33ac3cae8a3bc6b06ab85098ce3f59481
1: # Third-party data in this folder
2:
3: Most files here are derived from U.S. Government works (NIST) and from state legislative
4: and regulatory records, which are not subject to copyright. Files derived from openly
5: licensed catalogs keep those licenses:
6:
7: | Files | Source | License |
8: |---|---|---|
9: | `mitre-atlas.json`, `threat-mappings/threat--mitre-atlas-*.json`, the ATLAS entries in `chunks/ai-threats.json` | MITRE ATLAS™ data, release 2026.09. © 2021–2026 The MITRE Corporation. | [Apache License 2.0](../../../corpus/ai-threats/licenses/Apache-2.0.txt) ([MITRE's LICENSE](../../../corpus/ai-threats/mitre-atlas/LICENSE)). Modified by Visua: restructured into a framework graph and mapping sets; text unchanged. MITRE ATLAS is a trademark of The MITRE Corporation, used here only to identify the source. |
10: | `owasp-llm-top10.json`, `owasp-agentic-top10.json`, `threat-mappings/threat--owasp-*.json`, the OWASP entries in `chunks/ai-threats.json` | OWASP Top 10 for LLM Applications 2026 and 2025, OWASP Top 10 for Agentic Applications 2026, and the OWASP GenAI Security Crosswalk — OWASP GenAI Security Project (https://genai.owasp.org). | [CC BY-SA 4.0](../../../corpus/ai-threats/licenses/CC-BY-SA-4.0-legalcode.txt). Adapted by Visua: descriptions, prevention strategies and mappings extracted from the published PDFs and crosswalk files and restructured; wording unchanged. **These files are licensed under CC BY-SA 4.0.** |
11:
12: Material that may not be redistributed (AICPA criteria and mappings, MITRE SAFE-AI) is
13: never committed: see `corpus/README.md` and `.gitignore`.

FILE corpus/README.md SHA256 3aa3f5c5cee1c79f929b01325cf4b7b946cd4344a5c73c335328e71efdb16876
1: # Official documentation corpus
2:
3: Visua grounds every requirement, citation and agent answer in **local copies of the
4: official publications**. Each corpus folder has a `manifest.json` with one record per
5: document: title, identifier, version, publication date, role, official URL, landing page,
6: byte size, SHA-256 and the verbatim license notice. `STRUCTURE.md` in each folder
7: explains how the files are organized and how they were ingested.
8:
9: | Corpus | Documents | Retrieved | License | In git |
10: |---|---|---|---|---|
11: | [`nist-csf-2.0/`](nist-csf-2.0/) | 47 — CSWP 29, the CSF 2.0 Reference Tool data, Implementation Examples, Quick-Start Guides, Community Profiles, OLIR crosswalks | 2026-09-26 | Public domain (U.S. Government work, 17 U.S.C. §105) | Yes |
12: | [`nist-rmf/`](nist-rmf/) | 66 — SP 800-37r2 (RMF), SP 800-53 Rev. 5 / 5.2.0 (+ OSCAL catalog and 800-53B baselines), SP 800-53A, FIPS 199/200, SP 800-60, Quick-Start Guides | 2026-09-26 | Public domain (one third-party workbook is kept in `.local/`, not in git) | Yes |
13: | [`nist-ai-rmf/`](nist-ai-rmf/) | 45 — NIST AI 100-1 (AI RMF 1.0), the AI RMF Playbook (PDF, JSON, CSV, XLSX), NIST AI 600-1 (Generative AI Profile), CPRT exports, NIST crosswalks, AI 100-2/100-4, SP 1270, NISTIR 8312, SP 800-218A, and drafts (Cyber AI Profile IR 8596, COSAiS, AI 800-1) | 2026-09-26 | Public domain (15 third-party files — non-NIST crosswalks, glossary exports, translations — are kept in `.local/`, not in git) | Yes |
14: | [`aicpa-soc2/`](aicpa-soc2/) | 33 — 2017 Trust Services Criteria (points of focus revised 2022), DC 200, AICPA mapping workbooks, SOC 2 guides, COSO summaries | 2026-09-26 | **© AICPA / COSO — all rights reserved** | Manifest and notes only |
15: | [`us-state-ai-laws/`](us-state-ai-laws/) | 58 — enrolled bills, codified statutes and adopted regulations of 26 AI laws in California, Colorado, Illinois, Maine, New York, New York City, Texas and Utah, with `obligations.json` (187 obligations quoted with section and page) | 2026-09-26 | Public legislative and regulatory records (each site's notice quoted in the manifest); 5 files whose sites claim copyright (Colorado AG proposed rules, NYC City Record and DCWP FAQ, Maine's codified section) are kept in `.local/`, not in git | Yes |
16: | [`ai-threats/`](ai-threats/) | 28 — MITRE ATLAS 2026.09 (release YAML, STIX bundle, license), the OWASP Top 10 for LLM Applications 2026 and 2025 and for Agentic Applications 2026, the OWASP GenAI Security Crosswalk, with structured extractions and `mappings.json` (1,292 published links, each with its authority and status) | 2026-09-26 | MITRE ATLAS: Apache-2.0 · OWASP: CC BY-SA 4.0 (files derived from OWASP text stay CC BY-SA) · NIST: public domain · MITRE SAFE-AI (all rights reserved) is kept in `.local/`, not in git | Yes |
17:
18: ## Commands
19:
20: ```sh
21: pnpm corpus:verify                               # SHA-256 check of every local file against its manifest
22: pnpm corpus:sync                                 # download missing public-domain documents from the official URLs
23: pnpm corpus:sync aicpa-soc2 --include-restricted # AICPA documents, for this installation's own use (read below first)
24: pnpm ingest                                      # rebuild packages/frameworks/data from the local corpus
25: ```
26:
27: ## NIST AI RMF extractions
28:
29: `nist-ai-rmf/ai-rmf-core.json`, `ai-rmf-playbook.json` and `genai-profile.json` are
30: extracted from the NIST publications by the scripts in `nist-ai-rmf/tools/`, which
31: re-create the JSON byte for byte. Statement text comes from the AI 100-1 PDF (with
32: physical and printed page numbers), because NIST's own machine-readable copies (CPRT,
33: Playbook JSON) differ from the final text in dozens of statements; see
34: `nist-ai-rmf/STRUCTURE.md`. The scripts are development-time tools that need Python with
35: PyMuPDF (AGPL-3.0) and openpyxl (MIT); Visua itself does not depend on them.
36:
37: ## U.S. state AI laws
38:
39: `us-state-ai-laws/obligations.json` is built from the downloaded statutes and
40: regulations by `us-state-ai-laws/tools/build.py`, which re-creates it byte for byte; every
41: quotation is re-found on its cited page by `tools/verify_corpus.py`. Titles, role
42: labels and suggested evidence are Visua summaries. Laws change quickly: `STRUCTURE.md`
43: records each law's status on the retrieval date and the bills still pending then.
44: Nothing in the corpus or in Visua is legal advice.
45:
46: ## AI threat catalogs
47:
48: `ai-threats/atlas.json`, `owasp-llm-top10.json`, `owasp-agentic-top10.json` and
49: `nist-ai-100-2.json` are extracted by the scripts in `ai-threats/tools/`, which
50: reproduce them byte for byte. `mappings.json` keeps only links that someone published,
51: each labeled with its publisher and status: *final* (MITRE ATLAS, the OWASP
52: appendices, NIST AI 100-2), *draft* (NIST IR 8596 and the COSAiS outline), *unreviewed*
53: (OWASP's community crosswalk) or *superseded* (the OWASP 2025 edition). No publisher
54: maps ATLAS to CSF 2.0, SP 800-53 or the AI RMF, or the OWASP Top 10s to CSF 2.0 or
55: SP 800-53, in a final document.
56:
57: - **MITRE ATLAS** is © The MITRE Corporation under the Apache License 2.0: the license
58:   ships in `ai-threats/mitre-atlas/LICENSE` and every derived file keeps the copyright
59:   line and a change notice.
60: - **OWASP** material is CC BY-SA 4.0: attribution and the list of changes are in each
61:   extraction, and the files derived from OWASP text (`packages/frameworks/data/owasp-*.json`,
62:   the OWASP threat-mapping sets and `chunks/ai-threats.json`) are licensed CC BY-SA 4.0
63:   too (see `packages/frameworks/data/NOTICE.md`).
64: - **MITRE SAFE-AI** is all rights reserved and not redistributable; its report and
65:   extraction stay in `ai-threats/mitre-safe-ai/.local/`.
66: - The OWASP site serves its PDFs only to browsers, so `pnpm corpus:sync` cannot
67:   re-download them; the committed copies are hash-checked.
68:
69: ## AICPA content (SOC 2)
70:
71: The Trust Services Criteria, points of focus, DC 200 description criteria and AICPA
72: mapping workbooks are © AICPA. AICPA grants no reuse permission for them. Its website
73: terms allow download for **personal, non-commercial use** only and state that AICPA
74: *"specifically object[s] … to inclusion of content from this website in the knowledge
75: base of Large Language Models (LLMs) and similar AI platforms."* The COSO material is
76: © COSO, which does not allow reproduction without written permission.
77:
78: Visua therefore:
79:
80: 1. **Does not redistribute AICPA content.** Only `manifest.json` (metadata and license
81:    notices) and `STRUCTURE.md` from `aicpa-soc2/` are committed. The documents, the
82:    structured extractions (`tsc-2017-rev2022.json`, `dc200-description-criteria.json`)
83:    and everything derived from them (`packages/frameworks/data/aicpa-*.json`,
84:    `mappings/*tsc-2017*.json`, `chunks/aicpa-soc2.json`) are git-ignored.
85: 2. **Works without it.** A fresh clone runs SOC 2 on Visua's own skeleton
86:    (`packages/frameworks/src/ingest/tsc-skeleton.ts`): the criterion identifiers,
87:    series, categories and COSO principle numbers, with short titles and plain-language
88:    summaries written by Visua. SOC 2 scoping, readiness, planning, evidence, the PBC
89:    list and the DC 200 checklist all work on it.
90: 3. **Overlays the official text when you hold a local copy.** When
91:    `aicpa-soc2/tsc-2017-rev2022.json` and `dc200-description-criteria.json` are present,
92:    ingestion shows the verbatim criteria, all 330 points of focus with their page
93:    citations, and builds the AICPA mappings (TSC → SP 800-53 Rev. 5: 1,033 control
94:    links; TSC → CSF v1.1, carried to CSF 2.0 through NIST's OLIR crosswalk: 157
95:    links). The UI labels this text "© AICPA — local copy".
96: 4. **Keeps AICPA text away from language models by default.** When agents run on
97:    Claude, AICPA text and AICPA corpus passages are replaced in tool results with
98:    Visua's summary and a notice. Operators whose organization holds AICPA's written
99:    permission can set `VISUA_AICPA_AI_USE=permitted`. Offline playbooks run locally and
100:    are unaffected.
101:
102: Commercial use, redistribution, or sending AICPA text to an AI service requires written
103: permission from AICPA (copyright-permissions@aicpa-cima.com). Visua shows the
104: provenance of every file in **Reports → Official documentation corpus**.
105:
106: ### Provenance of the AICPA files
107:
108: AICPA's current downloads are behind a free login. The local copies were obtained
109: without logging in, from AICPA's own asset CDN (publicly indexed URLs; nine files match
110: the sizes AICPA lists), from byte-exact Internet Archive captures of files AICPA once
111: published openly (checksums verified against the archive), and directly from coso.org
112: and NIST. See `aicpa-soc2/STRUCTURE.md` for per-file details and what could not be
113: obtained (the paid SOC 2 Guide, member-only illustrative reports).
114:
115: The structured TSC extraction was produced with a PDF text-layer parser and verified
116: against AICPA's own TSC → SP 800-53 workbook (all 61 criterion texts match). The
117: extraction tooling is not yet part of this repository. Until it is, installations
118: without the JSON run on the skeleton (see the roadmap in `docs/roadmap.md`).
119:
120: ## Currency
121:
122: Checked on 2026-09-26: AI RMF 1.0 (January 2023) is the only final version; NIST says a
123: revision is in progress under the 2025 AI Action Plan, but no draft has been published.
124: NIST AI 600-1 (July 2024) is final. CSF 2.0 (Feb 2024) is current; SP 800-53 is at Release 5.2.0
125: (the ingest uses the 5.2.0 OSCAL catalog, with page citations to the 2020 PDF where a
126: control exists there); SP 800-37 Rev. 2 is current; the 2017 TSC with points of focus
127: revised in 2022 is current. AICPA's Assurance Services Executive Committee has said a
128: revised TSC exposure draft is expected in late 2026. Re-check before relying on this
129: corpus after that.

FILE apps/server/src/services/visua.ts SHA256 7943c0d67e97c60feef9f9ddde61cc7a14bb91a8a7ddc4406063e9d2392d6dc5
1: /**
2:  * Application service: the single place where workspace state changes.
3:  * Every mutation is validated and runs in one transaction, serialized per
4:  * workspace, together with its entry in the hash-chained audit trail. Events
5:  * reach the bus (which drives the live 3D Observatory) once it commits.
6:  */
7: import {
8:   assessTiers,
9:   buildSnapshot,
10:   categorize,
11:   clampLevel,
12:   codeOf,
13:   frameworkOf,
14:   newId,
15:   obligationTiming,
16:   overlayPriority,
17:   planTasks,
18:   recommend,
19:   scoreFramework,
20:   slugify,
21:   targetFor,
22:   trustCenterPublishes,
23:   type ActivityEvent,
24:   type AgentKind,
25:   type AiRmfSettings,
26:   type AiSystem,
27:   type AgentRun,
28:   type AgentStep,
29:   type CheckResult,
30:   type Connector,
31:   type Evidence,
32:   type FrameworkIndex,
33:   type FrameworkOverlay,
34:   type FrameworkScore,
35:   type OrganizationProfile,
36:   type Policy,
37:   type Priority,
38:   type Proposal,
39:   type RequirementNode,
40:   type RequirementState,
41:   type Risk,
42:   type RmfSettings,
43:   type Soc2Settings,
44:   type Task,
45:   type TrustCenterSettings,
46:   type Workspace,
47:   type WorkspaceFramework,
48: } from "@visua/core";
49: import { executeAgent, type AgentHost, type ProposalInput } from "@visua/agents";
50: import type { FrameworkRegistry } from "@visua/frameworks";
51: import { AsyncLocalStorage } from "node:async_hooks";
52: import { createHash } from "node:crypto";
53: import type { EventBus, VisuaEventType } from "../bus.ts";
54: import { FRAMEWORK_OF_REF, connectorKind, type RequirementRefs } from "../connectors/index.ts";
55: import { txContext } from "../storage/driver.ts";
56: import type { Store } from "../storage/index.ts";
57:
58: export class NotFoundError extends Error {}
59:
60: /** The authenticated principal of the current request; its id is recorded with every audit event. */
61: export interface Principal {
62:   id: string;
63:   label: string;
64: }
65: export const principalContext = new AsyncLocalStorage<Principal>();
66:
67: const GENESIS = "0".repeat(64);
68:
69: /** Canonical JSON (sorted keys) so the hash is independent of property order. */
70: function canonical(value: unknown): string {
71:   if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
72:   if (value && typeof value === "object") {
73:     return `{${Object.keys(value as Record<string, unknown>)
74:       .filter((k) => (value as Record<string, unknown>)[k] !== undefined)
75:       .sort()
76:       .map((k) => `${JSON.stringify(k)}:${canonical((value as Record<string, unknown>)[k])}`)
77:       .join(",")}}`;
78:   }
79:   return JSON.stringify(value);
80: }
81:
82: export function chainHash(prevHash: string, event: ActivityEvent): string {
83:   const { hash: _ignored, ...body } = event;
84:   void _ignored;
85:   return createHash("sha256").update(prevHash).update(canonical(body)).digest("hex");
86: }
87: export class ValidationError extends Error {}
88:
89: const PRIORITY_ORDER: Priority[] = ["low", "medium", "high", "critical"];
90: const STATE_LAWS = "us-state-ai-laws";
91: const maxPriority = (a: Priority, b: Priority): Priority => (PRIORITY_ORDER.indexOf(a) >= PRIORITY_ORDER.indexOf(b) ? a : b);
92: const now = () => new Date().toISOString();
93:
94: export interface CreateWorkspaceInput {
95:   name: string;
96:   description?: string;
97:   profile: OrganizationProfile;
98:   frameworks?: string[];
99:   soc2?: Partial<Soc2Settings>;
100:   rmf?: Partial<RmfSettings>;
101:   planInitialTasks?: boolean;
102:   /** Owning organization. */
103:   tenantId?: string;
104: }
105:
106: /** A framework's score; statutory obligations not yet in effect are scored apart. */
107: export type WorkspaceScore = FrameworkScore & { upcoming?: FrameworkScore };
108:
109: /** Scope settings win; otherwise a person's documented exclusion stands. */
110: function effectiveScope(scope: { applicable: boolean; rationale?: string }, exclusion: RequirementState["userExclusion"]): { applicable: boolean; rationale?: string } {
111:   if (!scope.applicable) return scope;
112:   if (exclusion) return { applicable: false, rationale: exclusion.rationale };
113:   return scope;
114: }
115:
116: /** Everything an agent reads, loaded once per run and refreshed after each change it applies. */
117: interface AgentSnapshot {
118:   workspace: Workspace;
119:   states: RequirementState[];
120:   byNode: Map<string, RequirementState>;
121:   tasks: Task[];
122:   evidence: Evidence[];
123:   policies: Policy[];
124:   connectors: Connector[];
125:   score(frameworkId: string): FrameworkScore;
126: }
127:
128: /**
129:  * The flight recorder of one agent run. Steps stream to the bus immediately
130:  * and are persisted in order, off the caller's transaction, through a queue.
131:  */
132: class RunRecorder {
133:   private chain: Promise<unknown> = Promise.resolve();
134:   private readonly svc: VisuaService;
135:   private readonly workspaceId: string;
136:   private readonly run: Pick<AgentRun, "id" | "agent">;
137:
138:   constructor(svc: VisuaService, workspaceId: string, run: Pick<AgentRun, "id" | "agent">) {
139:     this.svc = svc;
140:     this.workspaceId = workspaceId;
141:     this.run = run;
142:   }
143:
144:   step(step: Omit<AgentStep, "id" | "at">): AgentStep {
145:     const full: AgentStep = { ...step, id: newId("stp"), at: now() };
146:     this.svc.bus.publish(this.workspaceId, "agent.step", { runId: this.run.id, agent: this.run.agent, step: full });
147:     txContext.exit(() => {
148:       this.chain = this.chain
149:         .then(() =>
150:           this.svc.store.runs.update(this.run.id, (r) => ({
151:             ...r,
152:             steps: [...r.steps, full],
153:             focusNodeIds: step.nodeIds?.length ? [...new Set([...r.focusNodeIds, ...step.nodeIds])].slice(-60) : r.focusNodeIds,
154:           })),
155:         )
156:         .catch((err: unknown) => console.error("[visua] could not record agent step", err));
157:     });
158:     return full;
159:   }
160:
161:   /** Resolves when every recorded step is persisted. */
162:   flush(): Promise<unknown> {
163:     return this.chain;
164:   }
165: }
166:
167: export class VisuaService {
168:   readonly store: Store;
169:   readonly registry: FrameworkRegistry;
170:   readonly bus: EventBus;
171:   private readonly scoreCache = new Map<string, { rev: number; hour: string; score: WorkspaceScore }>();
172:   private readonly running = new Map<string, AbortController>();
173:
174:   constructor(store: Store, registry: FrameworkRegistry, bus: EventBus) {
175:     this.store = store;
176:     this.registry = registry;
177:     this.bus = bus;
178:   }
179:
180:   // -------------------------------------------------------------------------
181:   // Infrastructure
182:   // -------------------------------------------------------------------------
183:
184:   /** Publish once the current transaction commits; dropped if it rolls back. */
185:   private emit(workspaceId: string, type: VisuaEventType, data: unknown) {
186:     this.store.afterCommit(() => this.bus.publish(workspaceId, type, data));
187:   }
188:
189:   /**
190:    * Run a change to one workspace atomically: one transaction (joined when
191:    * already inside one), serialized per workspace across server instances, on
192:    * data read after the lock is held.
193:    */
194:   private async mutate<T>(idOrSlug: string, fn: (ws: Workspace) => Promise<T>): Promise<T> {
195:     return this.store.atomic(async () => {
196:       const found = await this.workspace(idOrSlug);
197:       await this.store.lock(`ws:${found.id}`);
198:       const ws = this.store.dialect === "postgres" ? await this.workspace(found.id) : found;
199:       return fn(ws);
200:     });
201:   }
202:
203:   /** Append to the workspace's hash-chained, tamper-evident audit trail. */
204:   async log(workspaceId: string, actor: string, action: string, entity: string, entityId: string, summary: string, data?: Record<string, unknown>): Promise<ActivityEvent> {
205:     return this.store.atomic(async () => {
206:       await this.store.lock(`ws:${workspaceId}`);
207:       const last = await this.store.activity.head(workspaceId);
208:       const head = last?.hash ? { seq: last.seq ?? 0, hash: last.hash } : { seq: 0, hash: GENESIS };
209:       const actorId = principalContext.getStore()?.id;
210:       const body: ActivityEvent = {
211:         id: newId("act"),
212:         workspaceId,
213:         at: now(),
214:         actor,
215:         ...(actorId ? { actorId } : {}),
216:         action,
217:         entity,
218:         entityId,
219:         summary,
220:         data,
221:         seq: head.seq + 1,
222:         prevHash: head.hash,
223:       };
224:       const event: ActivityEvent = { ...body, hash: chainHash(head.hash, body) };
225:       await this.store.activity.append(event);
226:       // Every audited change moves the workspace revision, which keys derived caches.
227:       await this.store.workspaces.bump(workspaceId);
228:       this.emit(workspaceId, "activity", event);
229:       return event;
230:     });
231:   }
232:
233:   /** Recompute every link of the audit trail; any edit, deletion or reordering breaks the chain. */
234:   async verifyAuditTrail(workspaceId: string): Promise<{ valid: boolean; events: number; brokenAt?: number; head?: string }> {
235:     const events = (await this.store.activity.chain(workspaceId)).sort((a, b) => (a.seq ?? 0) - (b.seq ?? 0));
236:     let prev = GENESIS;
237:     for (const e of events) {
238:       const { hash, ...body } = e;
239:       if (e.prevHash !== prev || chainHash(prev, body as ActivityEvent) !== hash) return { valid: false, events: events.length, brokenAt: e.seq };
240:       prev = hash!;
241:     }
242:     return { valid: true, events: events.length, head: prev };
243:   }
244:
245:   /** Invalidate derived caches after writing states outside the service (demo seeding). */
246:   async invalidate(workspaceId: string): Promise<void> {
247:     await this.store.workspaces.bump(workspaceId);
248:   }
249:
250:   async workspace(idOrSlug: string): Promise<Workspace> {
251:     const ws = await this.store.workspaces.get(idOrSlug);
252:     if (!ws) throw new NotFoundError(`Workspace '${idOrSlug}' not found`);
253:     return ws;
254:   }
255:
256:   frameworkSettings(ws: Workspace, frameworkId: string): WorkspaceFramework | undefined {
257:     return ws.frameworks.find((f) => f.frameworkId === frameworkId);
258:   }
259:
260:   /**
261:    * A unit of work the workspace can assess: an assessable requirement of a framework it
262:    * has enabled. Threat catalogs are never assessed, whatever their nodes' shape.
263:    */
264:   assessableIn(ws: Workspace, nodeId: string): RequirementNode {
265:     const node = this.registry.node(nodeId);
266:     if (!node || !node.assessable) throw new ValidationError(`'${nodeId}' is not an assessable requirement`);
267:     const fw = this.registry.framework(node.frameworkId)!.graph.framework;
268:     if (fw.family === "threat") throw new ValidationError(`${node.code} is in ${fw.shortName}, a threat catalog: threats are never assessed. Its coverage comes from the requirements linked to it.`);
269:     if (!this.frameworkSettings(ws, node.frameworkId)?.enabled) throw new ValidationError(`${fw.shortName} is not enabled in this workspace: enable it before assessing ${node.code}`);
270:     return node;
271:   }
272:
273:   /**
274:    * The requirements a task, evidence item, policy or risk links to: known nodes, never
275:    * threats (a threat is addressed through the requirements linked to it). Unknown ids
276:    * are dropped, as before.
277:    */
278:   linkedRequirements(ids: readonly string[] | undefined): string[] {
279:     const out: string[] = [];
280:     for (const id of ids ?? []) {
281:       const node = this.registry.node(id);
282:       if (!node) continue;
283:       const fw = this.registry.framework(node.frameworkId)!.graph.framework;
284:       if (fw.family === "threat") throw new ValidationError(`${node.code} is a threat in ${fw.shortName}: link the requirements that address it instead`);
285:       if (!out.includes(node.id)) out.push(node.id);
286:     }
287:     return out;
288:   }
289:
290:   /**
291:    * The one rule for changing a requirement's assessment, for people and agents alike.
292:    * A requirement out of scope (by configuration or a documented exclusion) keeps no
293:    * levels, verification or status override; owner, notes and priority stay editable.
294:    */
295:   private checkAssessment(node: RequirementNode, applicable: boolean, patch: Partial<RequirementState>, rationale: string | undefined): void {
296:     const touches: string[] = (["current", "target"] as const).filter((k) => patch[k] !== undefined);
297:     if (patch.verifiedAt) touches.push("verifiedAt");
298:     if (patch.statusOverride) touches.push("statusOverride");
299:     if (!applicable && touches.length) {
300:       throw new ValidationError(`${node.code} is out of scope${rationale ? ` (${rationale})` : ""}: ${touches.join(", ")} can only be set on requirements in scope`);
301:     }
302:   }
303:
304:   // -------------------------------------------------------------------------
305:   // Workspaces & onboarding
306:   // -------------------------------------------------------------------------
307:
308:   async createWorkspace(input: CreateWorkspaceInput, actor = "user"): Promise<Workspace> {
309:     if (!input.name?.trim()) throw new ValidationError("Workspace name is required");
310:     const rec = recommend(input.profile);
311:     const requested = input.frameworks?.length ? input.frameworks : [rec.frameworks[0]!.frameworkId];
312:     const frameworkIds = requested.filter((id) => this.registry.framework(id));
313:     if (!frameworkIds.includes("nist-csf-2.0") && this.registry.framework("nist-csf-2.0")) frameworkIds.unshift("nist-csf-2.0");
314:     // The SP 800-53 control catalog is operated through the RMF process: track its 47 tasks too.
315:     if (frameworkIds.includes("nist-sp-800-53-r5") && !frameworkIds.includes("nist-rmf") && this.registry.framework("nist-rmf")) frameworkIds.push("nist-rmf");
316:     return this.store.atomic(async () => {
317:       let slug = slugify(input.name) || "workspace";
318:       await this.store.lock(`slug:${slug}`);
319:       if (await this.store.workspaces.slugTaken(slug)) slug = `${slug}-${Math.random().toString(36).slice(2, 6)}`;
320:       const ts = now();
321:       const ws: Workspace = {
322:         id: newId("ws"),
323:         tenantId: input.tenantId,
324:         name: input.name.trim(),
325:         slug,
326:         description: input.description,
327:         profile: input.profile,
328:         frameworks: frameworkIds.map((frameworkId) => this.defaultFrameworkSettings(frameworkId, rec.defaultTarget, input)),
329:         autonomy: {},
330:         trustCenter: { enabled: false },
331:         createdAt: ts,
332:         updatedAt: ts,
333:       };
334:       await this.store.lock(`ws:${ws.id}`);
335:       await this.store.workspaces.put(ws);
336:       for (const f of ws.frameworks) await this.initializeStates(ws, f.frameworkId, actor);
337:       await this.log(ws.id, actor, "created", "workspace", ws.id, `Workspace “${ws.name}” created with ${frameworkIds.length} framework(s)`, { rationale: rec.rationale });
338:       if (input.planInitialTasks && frameworkIds.includes("nist-csf-2.0")) await this.planWith(ws.id, "nist-csf-2.0", 12, actor);
339:       return ws;
340:     });
341:   }
342:
343:   /** Delete a workspace and its data; the organization's own trail records it in the same transaction. */
344:   async deleteWorkspace(idOrSlug: string, actor = "user"): Promise<Workspace> {
345:     return this.mutate(idOrSlug, async (ws) => {
346:       const running: AbortController[] = [];
347:       for (const [runId, controller] of this.running) {
348:         const run = await this.store.runs.get(runId);
349:         if (run?.workspaceId === ws.id) running.push(controller);
350:       }
351:       await this.store.deleteWorkspace(ws.id);
352:       if (ws.tenantId) await this.log(ws.tenantId, actor, "deleted", "workspace", ws.id, `Workspace “${ws.name}” and its data deleted`);
353:       this.store.afterCommit(() => {
354:         for (const controller of running) controller.abort();
355:         for (const key of [...this.scoreCache.keys()]) if (key.startsWith(`${ws.id}|`)) this.scoreCache.delete(key);
356:       });
357:       return ws;
358:     });
359:   }
360:
361:   private defaultFrameworkSettings(frameworkId: string, defaultTarget: number, input?: Partial<CreateWorkspaceInput>): WorkspaceFramework {
362:     const settings: WorkspaceFramework = { frameworkId, enabled: true, defaultTarget };
363:     if (frameworkId === "aicpa-tsc-2017") {
364:       settings.defaultTarget = input?.soc2?.reportType === "type1" ? 2 : 3;
365:       const start = new Date();
366:       const end = new Date(start.getTime() + 180 * 86_400_000);
367:       settings.soc2 = {
368:         categories: input?.soc2?.categories?.length ? input.soc2.categories : ["security", "availability", "confidentiality"],
369:         reportType: input?.soc2?.reportType ?? "type2",
370:         observationStart: input?.soc2?.observationStart ?? start.toISOString().slice(0, 10),
371:         observationEnd: input?.soc2?.observationEnd ?? end.toISOString().slice(0, 10),
372:         auditFirm: input?.soc2?.auditFirm,
373:       };
374:     }
375:     if (frameworkId === "nist-ai-rmf") {
376:       settings.ai = { systems: [] };
377:     }
378:     if (frameworkId === STATE_LAWS) {
379:       settings.law = { applicability: {} };
380:     }
381:     if (frameworkId === "nist-sp-800-53-r5") {
382:       settings.defaultTarget = 3;
383:       settings.rmf = {
384:         systemName: input?.rmf?.systemName ?? `${input?.name ?? "Primary"} system`,
385:         systemDescription: input?.rmf?.systemDescription,
386:         informationTypes: input?.rmf?.informationTypes ?? [],
387:         categorization: input?.rmf?.categorization,
388:         baseline: input?.rmf?.baseline ?? "moderate",
389:         privacyBaseline: input?.rmf?.privacyBaseline ?? false,
390:         tailoring: input?.rmf?.tailoring ?? [],
391:         authorization: input?.rmf?.authorization ?? { decision: "pending" },
392:       };
393:     }
394:     return settings;
395:   }
396:
397:   /** Priority of a requirement: CSF categories via recommendation; other frameworks via crosswalk to CSF. */
398:   private priorityFor(nodeId: string, categoryPriorities: Record<string, Priority>): Priority {
399:     const fw = frameworkOf(nodeId);
400:     if (fw === "nist-csf-2.0") {
401:       const code = codeOf(nodeId);
402:       return categoryPriorities[code.slice(0, 5)] ?? "medium";
403:     }
404:     let p: Priority | undefined;
405:     for (const e of this.registry.crosswalk.related(nodeId, "nist-csf-2.0")) {
406:       const cat = codeOf(e.to).slice(0, 5);
407:       const q = categoryPriorities[cat];
408:       if (q) p = p ? maxPriority(p, q) : q;
409:     }
410:     return p ?? "medium";
411:   }
412:
413:   /** Whether a requirement is in scope for the workspace's framework settings. */
414:   scopeOf(ws: Workspace, nodeId: string): { applicable: boolean; rationale?: string } {
415:     const fw = frameworkOf(nodeId);
416:     const settings = this.frameworkSettings(ws, fw);
417:     const node = this.registry.node(nodeId);
418:     if (!node) return { applicable: false, rationale: "Unknown requirement" };
419:     if (fw === "aicpa-tsc-2017" && settings?.soc2) {
420:       const category = String(node.attributes?.["category"] ?? "security");
421:       if (!settings.soc2.categories.includes(category as Soc2Settings["categories"][number])) {
422:         return { applicable: false, rationale: `The ${category.replace("-", " ")} category is not in the SOC 2 examination scope` };
423:       }
424:     }
425:     if (node.frameworkId === STATE_LAWS && node.kind === "obligation") {
426:       const lawId = String(node.attributes?.["lawId"] ?? "");
427:       const law = this.registry.framework(fw)?.byId.get(node.parentId ?? "");
428:       const chosen = settings?.law?.applicability[lawId]?.roles ?? [];
429:       if (!chosen.length) return { applicable: false, rationale: `Not in scope: you have not said how ${law?.code ?? "this law"} applies to your organization` };
430:       const roles = (node.attributes?.["roles"] as string[] | undefined) ?? [];
431:       if (!roles.some((r) => chosen.includes(r))) return { applicable: false, rationale: `Applies to ${roles.join(", ")}; your role under ${law?.code ?? "this law"}: ${chosen.join(", ")}` };
432:       const until = node.attributes?.["until"] as string | undefined;
433:       if (until && until < now().slice(0, 10)) return { applicable: false, rationale: `No longer in effect after ${until}` };
434:       return { applicable: true };
435:     }
436:     if (fw === "nist-sp-800-53-r5" && settings?.rmf) {
437:       const tailored = settings.rmf.tailoring.find((t) => t.nodeId === nodeId);
438:       if (tailored) return tailored.action === "add" ? { applicable: true, rationale: tailored.rationale } : { applicable: false, rationale: `Tailored out: ${tailored.rationale}` };
439:       const baselines = (node.attributes?.["baselines"] as string[] | undefined) ?? [];
440:       const inBaseline = settings.rmf.baseline ? baselines.includes(settings.rmf.baseline) : true;
441:       const inPrivacy = settings.rmf.privacyBaseline && baselines.includes("privacy");
442:       if (!inBaseline && !inPrivacy) {
443:         return { applicable: false, rationale: `Not selected in the ${settings.rmf.baseline?.toUpperCase()} baseline (SP 800-53B)` };
444:       }
445:     }
446:     return { applicable: true };
447:   }
448:
449:   /** Create missing states and re-apply scope to existing ones, preserving each person's documented exclusion. */
450:   async initializeStates(ws: Workspace, frameworkId: string, actor = "system"): Promise<void> {
451:     const index = this.registry.framework(frameworkId);
452:     if (!index) return;
453:     const rec = recommend(ws.profile);
454:     const settings = this.frameworkSettings(ws, frameworkId);
455:     const ts = now();
456:     const current = await this.store.states.map(ws.id, frameworkId);
457:     const changed: RequirementState[] = [];
458:     for (const node of index.assessable) {
459:       const existing = current.get(node.id);
460:       const priority = this.priorityFor(node.id, rec.categoryPriorities);
461:       const scope = this.scopeOf(ws, node.id);
462:       const baseTarget = frameworkId === "nist-csf-2.0" ? targetFor(priority, rec) : settings?.defaultTarget ?? 3;
463:       if (existing) {
464:         const effective = effectiveScope(scope, existing.userExclusion);
465:         const becameApplicable = effective.applicable && !existing.applicable;
466:         const target = becameApplicable && existing.target === 0 ? baseTarget : existing.target;
467:         if (effective.applicable === existing.applicable && effective.rationale === existing.applicabilityRationale && target === existing.target) continue;
468:         changed.push({ ...existing, applicable: effective.applicable, applicabilityRationale: effective.rationale, target });
469:         continue;
470:       }
471:       changed.push({
472:         nodeId: node.id,
473:         current: 0,
474:         target: scope.applicable ? baseTarget : 0,
475:         priority,
476:         applicable: scope.applicable,
477:         applicabilityRationale: scope.rationale,
478:         updatedAt: ts,
479:         updatedBy: actor,
480:       });
481:     }
482:     await this.store.states.putMany(ws.id, changed);
483:   }
484:
485:   async updateWorkspace(
486:     id: string,
487:     patch: Partial<Pick<Workspace, "name" | "description" | "profile" | "autonomy">> & { trustCenter?: Partial<TrustCenterSettings> },
488:     actor = "user",
489:   ): Promise<Workspace> {
490:     return this.mutate(id, async (ws) => {
491:       // Trust center settings merge: saving the headline never drops the publishing choices.
492:       let trustCenter = ws.trustCenter;
493:       const notes: string[] = [];
494:       if (patch.trustCenter) {
495:         const choices = patch.trustCenter.frameworks ?? {};
496:         for (const [fw, on] of Object.entries(choices)) {
497:           const index = this.registry.framework(fw);
498:           if (!index || index.graph.framework.family === "threat") throw new ValidationError(`'${fw}' is not a framework the trust center can publish`);
499:           if (trustCenterPublishes(ws.trustCenter, fw, index.graph.framework.family) !== on) notes.push(`${index.graph.framework.shortName} ${on ? "published" : "withdrawn"} on the trust center`);
500:         }
501:         trustCenter = { ...ws.trustCenter, ...patch.trustCenter, frameworks: { ...(ws.trustCenter.frameworks ?? {}), ...choices } };
502:         if (patch.trustCenter.enabled !== undefined && patch.trustCenter.enabled !== ws.trustCenter.enabled) notes.unshift(patch.trustCenter.enabled ? "Trust center made public" : "Trust center taken offline");
503:       }
504:       const next: Workspace = { ...ws, ...patch, trustCenter, profile: { ...ws.profile, ...(patch.profile ?? {}) }, updatedAt: now() };
505:       await this.store.workspaces.put(next);
506:       this.emit(ws.id, "workspace.updated", next);
507:       await this.log(ws.id, actor, "updated", "workspace", ws.id, notes.length ? notes.join("; ") : "Workspace settings updated", { fields: Object.keys(patch) });
508:       return next;
509:     });
510:   }
511:
512:   async enableFramework(id: string, frameworkId: string, settings: Partial<WorkspaceFramework> = {}, actor = "user"): Promise<Workspace> {
513:     const index = this.registry.framework(frameworkId);
514:     if (!index) throw new ValidationError(`Framework '${frameworkId}' is not available`);
515:     if (index.graph.framework.family === "threat") throw new ValidationError(`${index.graph.framework.shortName} is a threat catalog: it is viewed through your frameworks, not enabled`);
516:     return this.mutate(id, async (ws) => {
517:       const rec = recommend(ws.profile);
518:       const existing = this.frameworkSettings(ws, frameworkId);
519:       const base = existing ?? this.defaultFrameworkSettings(frameworkId, rec.defaultTarget, { name: ws.name });
520:       const merged: WorkspaceFramework = {
521:         ...base,
522:         ...settings,
523:         frameworkId,
524:         enabled: settings.enabled ?? true,
525:         soc2: settings.soc2 ? { ...base.soc2!, ...settings.soc2 } : base.soc2,
526:         rmf: settings.rmf ? { ...base.rmf!, ...settings.rmf } : base.rmf,
527:         ai: settings.ai ? { ...(base.ai ?? { systems: [] }), ...settings.ai } : base.ai,
528:         // Law applicability is replaced as a whole, so a law can be taken out of scope.
529:         law: settings.law ?? base.law,
530:       };
531:       const next: Workspace = {
532:         ...ws,
533:         frameworks: existing ? ws.frameworks.map((f) => (f.frameworkId === frameworkId ? merged : f)) : [...ws.frameworks, merged],
534:         updatedAt: now(),
535:       };
536:       await this.store.workspaces.put(next);
537:       await this.initializeStates(next, frameworkId, actor);
538:       this.emit(ws.id, "workspace.updated", next);
539:       await this.log(ws.id, actor, existing ? "updated" : "enabled", "framework", frameworkId, `${existing ? "Updated" : "Enabled"} ${this.registry.framework(frameworkId)!.graph.framework.shortName}`);
540:       if (frameworkId === "nist-sp-800-53-r5" && merged.enabled && !this.frameworkSettings(next, "nist-rmf")?.enabled && this.registry.framework("nist-rmf")) {
541:         return this.enableFramework(ws.id, "nist-rmf", {}, actor);
542:       }
543:       return next;
544:     });
545:   }
546:
547:   /** CSF Tier self-assessment (CSWP 29, Appendix B). Updates the workspace's maturity tier. */
548:   async recordTierAssessment(id: string, answers: Record<string, number>, actor = "user"): Promise<Workspace> {
549:     return this.mutate(id, async (ws) => {
550:       const assessment = assessTiers(answers);
551:       const next: Workspace = { ...ws, tierAssessment: assessment, profile: { ...ws.profile, maturityTier: assessment.overallTier }, updatedAt: now() };
552:       await this.store.workspaces.put(next);
553:       this.emit(ws.id, "workspace.updated", next);
554:       await this.log(ws.id, actor, "assessed", "tiers", ws.id, `CSF Tiers: governance Tier ${assessment.governanceTier}, management Tier ${assessment.managementTier}`);
555:       return next;
556:     });
557:   }
558:
559:   /** RMF Categorize: FIPS 199 categorization → SP 800-53B baseline → re-scope controls. */
560:   async categorizeSystem(
561:     id: string,
562:     input: { systemName?: string; systemDescription?: string; informationTypes: RmfSettings["informationTypes"]; privacyBaseline?: boolean },
563:     actor = "user",
564:   ): Promise<Workspace> {
565:     return this.mutate(id, async (ws) => {
566:       const current = this.frameworkSettings(ws, "nist-sp-800-53-r5");
567:       const categorization = categorize(input.informationTypes);
568:       const rmf: RmfSettings = {
569:         ...(current?.rmf ?? { systemName: `${ws.name} system`, informationTypes: [], tailoring: [] }),
570:         systemName: input.systemName ?? current?.rmf?.systemName ?? `${ws.name} system`,
571:         systemDescription: input.systemDescription ?? current?.rmf?.systemDescription,
572:         informationTypes: input.informationTypes,
573:         categorization,
574:         baseline: categorization.overall,
575:         privacyBaseline: input.privacyBaseline ?? current?.rmf?.privacyBaseline ?? false,
576:       };
577:       const next = await this.enableFramework(ws.id, "nist-sp-800-53-r5", { rmf }, actor);
578:       await this.log(
579:         ws.id,
580:         actor,
581:         "categorized",
582:         "system",
583:         ws.id,
584:         `FIPS 199 categorization: C=${categorization.confidentiality}, I=${categorization.integrity}, A=${categorization.availability} → ${categorization.overall.toUpperCase()} baseline`,
585:       );
586:       return next;
587:     });
588:   }
589:
590:   /** Tailor a control in or out of the baseline (SP 800-53B): a documented decision with its rationale in the audit trail. */
591:   async tailorControl(id: string, nodeId: string, action: "add" | "remove" | "reset", rationale: string, actor = "user"): Promise<Workspace> {
592:     return this.mutate(id, async (ws) => {
593:       const settings = this.frameworkSettings(ws, "nist-sp-800-53-r5");
594:       if (!settings?.rmf) throw new ValidationError("Enable NIST RMF / SP 800-53 first");
595:       const node = this.registry.node(nodeId);
596:       if (!node || node.frameworkId !== "nist-sp-800-53-r5") throw new ValidationError(`'${nodeId}' is not an SP 800-53 control`);
597:       const why = rationale.trim();
598:       if (action !== "reset" && !why) throw new ValidationError("Tailoring a control requires a written rationale that auditors can review");
599:       const tailoring = settings.rmf.tailoring.filter((t) => t.nodeId !== node.id);
600:       if (action !== "reset") tailoring.push({ nodeId: node.id, action, rationale: why });
601:       const next = await this.enableFramework(ws.id, "nist-sp-800-53-r5", { rmf: { ...settings.rmf, tailoring } }, actor);
602:       await this.log(ws.id, actor, "tailored", "requirement", node.id, action === "reset" ? `${node.code}: tailoring reset to the baseline` : `${node.code} tailored ${action === "add" ? "into" : "out of"} scope: ${why}`);
603:       return next;
604:     });
605:   }
606:
607:   // -------------------------------------------------------------------------
608:   // Overlays: community profiles and control overlays on enabled frameworks
609:   // -------------------------------------------------------------------------
610:
611:   private overlayOrThrow(overlayId: string): FrameworkOverlay {
612:     const overlay = this.registry.overlay(overlayId);
613:     if (!overlay) throw new NotFoundError(`Overlay '${overlayId}' not found`);
614:     return overlay;
615:   }
616:
617:   /**
618:    * Adopt an overlay. A community profile records the focus areas (lenses) the
619:    * workspace follows. A control overlay brings its controls into the SP 800-53
620:    * scope through tailoring entries marked with the overlay as their source; a
621:    * person's own tailoring decision on the same control always stands.
622:    */
623:   async adoptOverlay(id: string, overlayId: string, input: { lenses?: string[] }, actor = "user"): Promise<Workspace> {
624:     const overlay = this.overlayOrThrow(overlayId);
625:     return this.mutate(id, async (ws) => {
626:       const settings = this.frameworkSettings(ws, overlay.frameworkId);
627:       if (!settings?.enabled) throw new ValidationError(`Enable ${this.registry.framework(overlay.frameworkId)?.graph.framework.shortName ?? overlay.frameworkId} before adopting ${overlay.shortName}`);
628:       const known = new Set(overlay.lenses?.map((l) => l.id) ?? []);
629:       const lenses = overlay.kind === "community-profile" ? [...new Set(input.lenses?.length ? input.lenses : [...known])] : undefined;
630:       if (lenses?.some((l) => !known.has(l))) throw new ValidationError(`Unknown focus area — choose from ${[...known].join(", ")}`);
631:       const previous = settings.overlays?.find((a) => a.overlayId === overlayId);
632:       const adoption = { overlayId, ...(lenses ? { lenses } : {}), adoptedAt: previous?.adoptedAt ?? now(), adoptedBy: previous?.adoptedBy ?? actor };
633:       const overlays = [...(settings.overlays ?? []).filter((a) => a.overlayId !== overlayId), adoption];
634:       let added = 0;
635:       let next: Workspace;
636:       if (overlay.kind === "control-overlay" && settings.rmf) {
637:         const tailoring = settings.rmf.tailoring.filter((t) => t.source !== overlayId);
638:         const decided = new Set(tailoring.map((t) => t.nodeId));
639:         const probe: Workspace = { ...ws, frameworks: ws.frameworks.map((f) => (f.frameworkId === overlay.frameworkId ? { ...f, rmf: { ...settings.rmf!, tailoring } } : f)) };
640:         for (const e of overlay.entries) {
641:           if (decided.has(e.nodeId) || this.scopeOf(probe, e.nodeId).applicable) continue;
642:           tailoring.push({ nodeId: e.nodeId, action: "add", rationale: `Selected by the ${overlay.shortName} overlay (${overlay.status}, ${overlay.identifier})`, source: overlayId });
643:           added++;
644:         }
645:         next = await this.enableFramework(ws.id, overlay.frameworkId, { rmf: { ...settings.rmf, tailoring }, overlays }, actor);
646:       } else {
647:         next = await this.enableFramework(ws.id, overlay.frameworkId, { overlays }, actor);
648:       }
649:       const lensNames = lenses?.map((l) => overlay.lenses?.find((x) => x.id === l)?.short ?? l).join(", ");
650:       await this.log(
651:         ws.id,
652:         actor,
653:         previous ? "updated" : "adopted",
654:         "overlay",
655:         overlayId,
656:         `${previous ? "Updated" : "Adopted"} ${overlay.shortName} (${overlay.status})${lensNames ? ` — focus areas: ${lensNames}` : ""}${overlay.kind === "control-overlay" ? ` — ${added} control(s) brought into scope` : ""}`,
657:       );
658:       return next;
659:     });
660:   }
661:
662:   async dropOverlay(id: string, overlayId: string, actor = "user"): Promise<Workspace> {
663:     const overlay = this.overlayOrThrow(overlayId);
664:     return this.mutate(id, async (ws) => {
665:       const settings = this.frameworkSettings(ws, overlay.frameworkId);
666:       if (!settings?.overlays?.some((a) => a.overlayId === overlayId)) throw new ValidationError(`${overlay.shortName} is not adopted`);
667:       const overlays = settings.overlays.filter((a) => a.overlayId !== overlayId);
668:       const removed = settings.rmf?.tailoring.filter((t) => t.source === overlayId).length ?? 0;
669:       const next = await this.enableFramework(ws.id, overlay.frameworkId, settings.rmf ? { overlays, rmf: { ...settings.rmf, tailoring: settings.rmf.tailoring.filter((t) => t.source !== overlayId) } } : { overlays }, actor);
670:       await this.log(ws.id, actor, "dropped", "overlay", overlayId, `Stopped following ${overlay.shortName}${removed ? ` — ${removed} control(s) it had added left the scope` : ""}`);
671:       return next;
672:     });
673:   }
674:
675:   /**
676:    * Raise requirement priorities to the community profile's proposed priorities
677:    * for the adopted focus areas (1 → high, 2 → at least medium). Never lowers a
678:    * priority; one audited change.
679:    */
680:   async applyOverlayPriorities(id: string, overlayId: string, actor = "user"): Promise<{ raised: number }> {
681:     const overlay = this.overlayOrThrow(overlayId);
682:     if (overlay.kind !== "community-profile") throw new ValidationError(`${overlay.shortName} has no priorities`);
683:     return this.mutate(id, async (ws) => {
684:       const adoption = this.frameworkSettings(ws, overlay.frameworkId)?.overlays?.find((a) => a.overlayId === overlayId);
685:       if (!adoption) throw new ValidationError(`Adopt ${overlay.shortName} first`);
686:       const states = await this.store.states.map(ws.id, overlay.frameworkId);
687:       const ts = now();
688:       const changed: RequirementState[] = [];
689:       for (const e of overlay.entries) {
690:         const s = states.get(e.nodeId);
691:         const p = overlayPriority(e, adoption.lenses ?? []);
692:         if (!s || !s.applicable || p === undefined) continue;
693:         const wanted: Priority | undefined = p === 1 ? "high" : p === 2 ? "medium" : undefined;
694:         if (!wanted || maxPriority(s.priority, wanted) === s.priority) continue;
695:         changed.push({ ...s, priority: wanted, updatedAt: ts, updatedBy: actor });
696:       }
697:       await this.store.states.putMany(ws.id, changed);
698:       if (changed.length) this.emit(ws.id, "state.updated", { bulk: true, count: changed.length });
699:       await this.log(ws.id, actor, "prioritized", "overlay", overlayId, `${overlay.shortName}: raised the priority of ${changed.length} requirement(s) to the profile's proposed priorities`, {
700:         nodeIds: changed.map((c) => c.nodeId),
701:       });
702:       return { raised: changed.length };
703:     });
704:   }
705:
706:   // -------------------------------------------------------------------------
707:   // U.S. state AI laws: applicability per law
708:   // -------------------------------------------------------------------------
709:
710:   /** Record the roles the organization holds under one law (none = the law does not apply). Re-scopes its obligations. */
711:   async setLawApplicability(id: string, lawId: string, input: { roles: string[]; note?: string }, actor = "user"): Promise<Workspace> {
712:     const index = this.registry.framework(STATE_LAWS);
713:     const law = index?.graph.nodes.find((n) => n.kind === "law" && n.attributes?.["lawId"] === lawId);
714:     if (!index || !law) throw new NotFoundError(`Law '${lawId}' not found`);
715:     const known = new Set(
716:       index
717:         .childrenOf(law.id)
718:         .flatMap((o) => (o.attributes?.["roles"] as string[] | undefined) ?? [])
719:         .concat(((law.attributes?.["appliesTo"] as { role: string }[] | undefined) ?? []).map((a) => a.role.toLowerCase().replace(/\s+/g, "-"))),
720:     );
721:     const roles = [...new Set(input.roles)];
722:     const unknown = roles.filter((r) => !known.has(r));
723:     if (unknown.length) throw new ValidationError(`${law.code} does not define the role(s) ${unknown.join(", ")} — choose from ${[...known].join(", ")}`);
724:     return this.mutate(id, async (ws) => {
725:       const settings = this.frameworkSettings(ws, STATE_LAWS);
726:       if (!settings?.enabled) throw new ValidationError("Enable U.S. state AI laws for this workspace first");
727:       const applicability = { ...(settings.law?.applicability ?? {}) };
728:       if (roles.length) applicability[lawId] = { roles, note: input.note?.trim() || undefined, decidedAt: now(), decidedBy: actor };
729:       else delete applicability[lawId];
730:       const result = await this.enableFramework(ws.id, STATE_LAWS, { law: { applicability } }, actor);
731:       await this.log(ws.id, actor, "scoped", "law", lawId, roles.length ? `${law.code} applies to us as ${roles.join(", ")}${input.note ? ` — ${input.note.trim()}` : ""}` : `${law.code} marked as not applying to us`);
732:       return result;
733:     });
734:   }
735:
736:   // -------------------------------------------------------------------------
737:   // AI governance (NIST AI RMF): the AI system inventory
738:   // -------------------------------------------------------------------------
739:
740:   private aiSettings(ws: Workspace): AiRmfSettings {
741:     const settings = this.frameworkSettings(ws, "nist-ai-rmf");
742:     if (!settings?.enabled) throw new ValidationError("Enable the NIST AI RMF for this workspace first");
743:     return settings.ai ?? { systems: [] };
744:   }
745:
746:   async upsertAiSystem(id: string, input: Partial<Omit<AiSystem, "createdAt" | "updatedAt">> & { id?: string }, actor = "user"): Promise<AiSystem> {
747:     return this.mutate(id, async (ws) => {
748:       const ai = this.aiSettings(ws);
749:       const existing = input.id ? ai.systems.find((s) => s.id === input.id) : undefined;
750:       if (input.id && !existing) throw new NotFoundError(`AI system '${input.id}' not found`);
751:       const ts = now();
752:       const system: AiSystem = {
753:         id: existing?.id ?? newId("ai"),
754:         name: (input.name ?? existing?.name ?? "").trim(),
755:         purpose: (input.purpose ?? existing?.purpose ?? "").trim(),
756:         role: input.role ?? existing?.role ?? "deployer",
757:         lifecycle: input.lifecycle ?? existing?.lifecycle ?? "plan-design",
758:         generative: input.generative ?? existing?.generative ?? false,
759:         provider: input.provider ?? existing?.provider,
760:         riskTier: input.riskTier ?? existing?.riskTier ?? "moderate",
761:         owner: input.owner ?? existing?.owner,
762:         dataTypes: input.dataTypes ?? existing?.dataTypes ?? [],
763:         humanOversight: input.humanOversight ?? existing?.humanOversight,
764:         createdAt: existing?.createdAt ?? ts,
765:         updatedAt: ts,
766:       };
767:       if (!system.name) throw new ValidationError("An AI system needs a name");
768:       if (!system.purpose) throw new ValidationError("Describe the AI system's intended purpose and context of use");
769:       const systems = existing ? ai.systems.map((s) => (s.id === system.id ? system : s)) : [...ai.systems, system];
770:       await this.enableFramework(ws.id, "nist-ai-rmf", { ai: { ...ai, systems } }, actor);
771:       await this.log(
772:         ws.id,
773:         actor,
774:         existing ? "updated" : "created",
775:         "ai-system",
776:         system.id,
777:         `AI system ${existing ? "updated" : "added to the inventory"}: ${system.name} (${system.riskTier} risk${system.generative ? ", generative" : ""})`,
778:       );
779:       return system;
780:     });
781:   }
782:
783:   async removeAiSystem(id: string, systemId: string, actor = "user"): Promise<void> {
784:     await this.mutate(id, async (ws) => {
785:       const ai = this.aiSettings(ws);
786:       const system = ai.systems.find((s) => s.id === systemId);
787:       if (!system) throw new NotFoundError(`AI system '${systemId}' not found`);
788:       await this.enableFramework(ws.id, "nist-ai-rmf", { ai: { ...ai, systems: ai.systems.filter((s) => s.id !== systemId) } }, actor);
789:       await this.log(ws.id, actor, "deleted", "ai-system", systemId, `AI system removed from the inventory: ${system.name}`);
790:     });
791:   }
792:
793:   async setAuthorization(id: string, input: NonNullable<RmfSettings["authorization"]>, actor = "user"): Promise<Workspace> {
794:     return this.mutate(id, async (ws) => {
795:       const settings = this.frameworkSettings(ws, "nist-sp-800-53-r5");
796:       if (!settings?.rmf) throw new ValidationError("Enable NIST RMF / SP 800-53 first");
797:       const next = await this.enableFramework(ws.id, "nist-sp-800-53-r5", { rmf: { ...settings.rmf, authorization: { ...input, decidedAt: input.decidedAt ?? now() } } }, actor);
798:       await this.log(ws.id, actor, "authorized", "system", ws.id, `Authorization decision: ${input.decision.toUpperCase()}${input.authorizingOfficial ? ` by ${input.authorizingOfficial}` : ""}`);
799:       return next;
800:     });
801:   }
802:
803:   // -------------------------------------------------------------------------
804:   // Assessment
805:   // -------------------------------------------------------------------------
806:
807:   /**
808:    * Score one framework as of now. Statutory obligations are scoped by date when read:
809:    * one past its end date is out of scope, one not yet in effect is scored apart
810:    * (`upcoming`) and never counts toward today's readiness.
811:    */
812:   scoreOf(index: FrameworkIndex, input: { states: RequirementState[]; evidence: Evidence[]; tasks: Task[]; checks: CheckResult[] }, at = new Date()): WorkspaceScore {
813:     if (index.graph.framework.family !== "law") return scoreFramework(index, buildSnapshot(input), at);
814:     const today = at.toISOString().slice(0, 10);
815:     const states = input.states.map((s) => {
816:       const node = index.byId.get(s.nodeId);
817:       return node && s.applicable && obligationTiming(node, today) === "ended" ? { ...s, applicable: false, applicabilityRationale: `No longer in effect after ${String(node.attributes?.["until"])}` } : s;
818:     });
819:     const snapshot = buildSnapshot({ ...input, states });
820:     const upcoming = (node: RequirementNode) => obligationTiming(node, today) === "upcoming";
821:     return { ...scoreFramework(index, snapshot, at, { counts: (node) => !upcoming(node) }), upcoming: scoreFramework(index, snapshot, at, { counts: upcoming }) };
822:   }
823:
824:   async score(workspaceId: string, frameworkId: string): Promise<WorkspaceScore> {
825:     const index = this.registry.framework(frameworkId);
826:     if (!index) throw new NotFoundError(`Framework '${frameworkId}' not found`);
827:     const rev = await this.store.workspaces.rev(workspaceId);
828:     const key = `${workspaceId}|${frameworkId}`;
829:     // Statuses also move with the clock (overdue tasks, expired evidence, effective dates).
830:     const hour = now().slice(0, 13);
831:     const cached = this.scoreCache.get(key);
832:     if (cached && cached.rev === rev && cached.hour === hour) return cached.score;
833:     const [states, evidence, tasks, checks] = await Promise.all([
834:       this.store.states.list(workspaceId, frameworkId),
835:       this.store.evidence.list(workspaceId),
836:       this.store.tasks.list(workspaceId),
837:       this.store.checks.list(workspaceId),
838:     ]);
839:     const score = this.scoreOf(index, { states, evidence, tasks, checks });
840:     // Only committed revisions are cached: a transaction's own revision may still roll back.
841:     if (!this.store.inTransaction) this.scoreCache.set(key, { rev, hour, score });
842:     return score;
843:   }
844:
845:   async updateState(
846:     workspaceId: string,
847:     nodeId: string,
848:     patch: Partial<Pick<RequirementState, "current" | "target" | "priority" | "applicable" | "applicabilityRationale" | "owner" | "notes" | "statusOverride" | "verifiedAt">>,
849:     actor = "user",
850:   ): Promise<RequirementState> {
851:     return this.mutate(workspaceId, async (ws) => {
852:       const node = this.assessableIn(ws, nodeId);
853:       const scope = this.scopeOf(ws, node.id);
854:       const defaultTarget = this.frameworkSettings(ws, node.frameworkId)?.defaultTarget ?? 3;
855:       const prev =
856:         (await this.store.states.get(ws.id, node.id)) ??
857:         ({
858:           nodeId: node.id,
859:           current: 0,
860:           target: scope.applicable ? defaultTarget : 0,
861:           priority: "medium",
862:           applicable: scope.applicable,
863:           applicabilityRationale: scope.rationale,
864:           updatedAt: now(),
865:           updatedBy: actor,
866:         } satisfies RequirementState);
867:       let scoping: Partial<RequirementState> = {};
868:       if (patch.applicable === false) {
869:         const rationale = patch.applicabilityRationale?.trim() || (prev.userExclusion ? prev.applicabilityRationale?.trim() : "");
870:         if (!rationale) throw new ValidationError("Marking a requirement not applicable requires a written rationale that auditors can review");
871:         scoping = { applicable: false, applicabilityRationale: rationale, userExclusion: { rationale, at: now(), by: actor } };
872:       } else if (patch.applicable === true) {
873:         if (!scope.applicable) throw new ValidationError(`Out of scope by configuration — ${scope.rationale}. Change the scope instead (SOC 2 categories, RMF baseline or tailoring, or the roles a law applies to).`);
874:         scoping = { applicable: true, applicabilityRationale: scope.rationale, userExclusion: undefined };
875:         if (prev.target === 0 && patch.target === undefined) scoping.target = defaultTarget;
876:       }
877:       this.checkAssessment(node, scoping.applicable ?? prev.applicable, patch, scoping.applicabilityRationale ?? prev.applicabilityRationale);
878:       const next: RequirementState = {
879:         ...prev,
880:         ...patch,
881:         ...scoping,
882:         nodeId: node.id,
883:         current: patch.current !== undefined ? clampLevel(patch.current) : prev.current,
884:         target: patch.target !== undefined ? clampLevel(patch.target) : scoping.target ?? prev.target,
885:         updatedAt: now(),
886:         updatedBy: actor,
887:       };
888:       if (patch.statusOverride === null) delete next.statusOverride;
889:       if (!next.userExclusion) delete next.userExclusion;
890:       await this.store.states.put(ws.id, next);
891:       this.emit(ws.id, "state.updated", next);
892:       const changes = Object.entries(patch)
893:         .filter(([k, v]) => (prev as unknown as Record<string, unknown>)[k] !== v)
894:         .map(([k, v]) => `${k}: ${String((prev as unknown as Record<string, unknown>)[k] ?? "—")} → ${String(v)}`);
895:       await this.log(ws.id, actor, "assessed", "requirement", node.id, `${node.code} ${changes.join(", ") || "updated"}`, { patch });
896:       return next;
897:     });
898:   }
899:
900:   // -------------------------------------------------------------------------
901:   // Tasks
902:   // -------------------------------------------------------------------------
903:
904:   async createTask(workspaceId: string, input: Partial<Task> & Pick<Task, "title">, actor = "user"): Promise<Task> {
905:     return this.mutate(workspaceId, async (ws) => {
906:       const requirementIds = this.linkedRequirements(input.requirementIds);
907:       const ts = now();
908:       const task: Task = {
909:         id: newId("task"),
910:         workspaceId: ws.id,
911:         title: input.title.trim(),
912:         description: input.description ?? "",
913:         kind: input.kind ?? "procedure",
914:         status: input.status ?? "todo",
915:         priority: input.priority ?? "medium",
916:         requirementIds,
917:         assignee: input.assignee,
918:         startDate: input.startDate,
919:         dueDate: input.dueDate,
920:         effortHours: input.effortHours,
921:         checklist: (input.checklist ?? []).map((c) => ({ id: c.id || newId("chk"), text: c.text, done: !!c.done })),
922:         dependsOn: input.dependsOn ?? [],
923:         automation: input.automation,
924:         source: input.source,
925:         targetLevel: input.targetLevel,
926:         origin: input.origin ?? "user",
927:         createdAt: ts,
928:         updatedAt: ts,
929:       };
930:       await this.store.tasks.put(task);
931:       this.emit(ws.id, "task.created", task);
932:       await this.log(ws.id, actor, "created", "task", task.id, `Task “${task.title}” created`);
933:       return task;
934:     });
935:   }
936:
937:   async updateTask(
938:     workspaceId: string,
939:     taskId: string,
940:     patch: Partial<Task>,
941:     actor = "user",
942:   ): Promise<{ task: Task; suggestedLevels: { nodeId: string; code: string; from: number; to: number }[] }> {
943:     return this.mutate(workspaceId, async (ws) => {
944:       const prev = await this.store.tasks.get(taskId);
945:       if (!prev || prev.workspaceId !== ws.id) throw new NotFoundError(`Task '${taskId}' not found`);
946:       if (patch.requirementIds) patch = { ...patch, requirementIds: this.linkedRequirements(patch.requirementIds) };
947:       const next: Task = { ...prev, ...patch, id: prev.id, workspaceId: prev.workspaceId, updatedAt: now() };
948:       if (patch.status === "done" && prev.status !== "done") next.completedAt = now();
949:       if (patch.status && patch.status !== "done") delete next.completedAt;
950:       await this.store.tasks.put(next);
951:       this.emit(ws.id, "task.updated", next);
952:       await this.log(ws.id, actor, "updated", "task", next.id, `Task “${next.title}”${patch.status && patch.status !== prev.status ? ` → ${patch.status}` : " updated"}`);
953:       const suggestedLevels: { nodeId: string; code: string; from: number; to: number }[] = [];
954:       if (patch.status === "done" && prev.status !== "done") {
955:         const states = await this.store.states.getMany(ws.id, next.requirementIds);
956:         for (const nodeId of next.requirementIds) {
957:           const s = states.get(nodeId);
958:           if (!s || !s.applicable) continue;
959:           const to = Math.min(next.targetLevel ?? s.target, s.target, s.current + 1);
960:           if (to > s.current) suggestedLevels.push({ nodeId, code: codeOf(nodeId), from: s.current, to });
961:         }
962:       }
963:       return { task: next, suggestedLevels };
964:     });
965:   }
966:
967:   async deleteTask(workspaceId: string, taskId: string, actor = "user"): Promise<void> {
968:     await this.mutate(workspaceId, async (ws) => {
969:       const task = await this.store.tasks.get(taskId);
970:       if (!task || task.workspaceId !== ws.id) throw new NotFoundError(`Task '${taskId}' not found`);
971:       await this.store.tasks.delete(taskId);
972:       this.emit(ws.id, "task.deleted", { id: taskId });
973:       await this.log(ws.id, actor, "deleted", "task", taskId, `Task “${task.title}” deleted`);
974:     });
975:   }
976:
977:   async planWith(workspaceId: string, frameworkId: string, maxTasks: number, actor = "system"): Promise<Task[]> {
978:     const index = this.registry.framework(frameworkId);
979:     if (!index) throw new NotFoundError(`Framework '${frameworkId}' not found`);
980:     if (index.graph.framework.family === "threat") throw new ValidationError(`${index.graph.framework.shortName} is a threat catalog: plan the requirements linked to its threats instead`);
981:     return this.mutate(workspaceId, async (ws) => {
982:       if (!this.frameworkSettings(ws, frameworkId)?.enabled) throw new ValidationError(`${index.graph.framework.shortName} is not enabled in this workspace`);
983:       const states = await this.store.states.map(ws.id, frameworkId);
984:       const open = new Set((await this.store.tasks.list(ws.id)).filter((t) => t.status !== "done").flatMap((t) => t.requirementIds));
985:       const planned = planTasks(index, states, {
986:         workspaceId: ws.id,
987:         startDate: new Date(),
988:         weeklyCapacityHours: Math.max(8, ws.profile.securityTeamSize * 12),
989:         existingTaskNodeIds: open,
990:         maxTasks,
991:         idFactory: () => newId("task"),
992:       });
993:       const ts = now();
994:       const created: Task[] = [];
995:       for (const p of planned) {
996:         const task: Task = { ...p, createdAt: ts, updatedAt: ts };
997:         await this.store.tasks.put(task);
998:         created.push(task);
999:       }
1000:       for (const t of created) this.emit(ws.id, "task.created", t);
1001:       if (created.length) await this.log(ws.id, actor, "planned", "task", frameworkId, `${created.length} task(s) planned from official implementation guidance`);
1002:       return created;
1003:     });
1004:   }
1005:
1006:   // -------------------------------------------------------------------------
1007:   // Evidence
1008:   // -------------------------------------------------------------------------
1009:
1010:   async createEvidence(workspaceId: string, input: Partial<Evidence> & Pick<Evidence, "title">, actor = "user"): Promise<Evidence> {
1011:     return this.mutate(workspaceId, async (ws) => {
1012:       const ts = now();
1013:       const requirementIds = this.linkedRequirements(input.requirementIds);
1014:       const evidence: Evidence = {
1015:         id: newId("ev"),
1016:         workspaceId: ws.id,
1017:         title: input.title.trim(),
1018:         description: input.description,
1019:         kind: input.kind ?? "document",
1020:         source: input.source ?? "manual",
1021:         connectorId: input.connectorId,
1022:         requirementIds,
1023:         status: input.status ?? "pending-review",
1024:         collectedAt: input.collectedAt ?? ts,
1025:         validUntil: input.validUntil,
1026:         content: input.content,
1027:         data: input.data,
1028:         fileName: input.fileName,
1029:         sha256: input.sha256,
1030:         reviewedBy: input.reviewedBy,
1031:         reviewedAt: input.reviewedAt,
1032:         createdAt: ts,
1033:       };
1034:       await this.store.evidence.put(evidence);
1035:       this.emit(ws.id, "evidence.created", evidence);
1036:       await this.log(ws.id, actor, "collected", "evidence", evidence.id, `Evidence “${evidence.title}” added for ${requirementIds.map(codeOf).join(", ") || "no requirement"}`);
1037:       return evidence;
1038:     });
1039:   }
1040:
1041:   async reviewEvidence(workspaceId: string, evidenceId: string, decision: "accepted" | "rejected", actor = "user", note?: string): Promise<Evidence> {
1042:     return this.mutate(workspaceId, async (ws) => {
1043:       const prev = await this.store.evidence.get(evidenceId);
1044:       if (!prev || prev.workspaceId !== ws.id) throw new NotFoundError(`Evidence '${evidenceId}' not found`);
1045:       const next: Evidence = {
1046:         ...prev,
1047:         status: decision,
1048:         reviewedBy: actor,
1049:         reviewedAt: now(),
1050:         description: note ? `${prev.description ?? ""}\n\nReview note: ${note}`.trim() : prev.description,
1051:       };
1052:       await this.store.evidence.put(next);
1053:       this.emit(ws.id, "evidence.updated", next);
1054:       await this.log(ws.id, actor, decision, "evidence", next.id, `Evidence “${next.title}” ${decision}`);
1055:       return next;
1056:     });
1057:   }
1058:
1059:   async updateEvidence(workspaceId: string, evidenceId: string, patch: Partial<Evidence>, actor = "user"): Promise<Evidence> {
1060:     return this.mutate(workspaceId, async (ws) => {
1061:       const prev = await this.store.evidence.get(evidenceId);
1062:       if (!prev || prev.workspaceId !== ws.id) throw new NotFoundError(`Evidence '${evidenceId}' not found`);
1063:       // Only the fields the caller sent: an absent title or link list is not a request to erase it.
1064:       const changes = Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== undefined)) as Partial<Evidence>;
1065:       if (changes.requirementIds) changes.requirementIds = this.linkedRequirements(changes.requirementIds);
1066:       const next: Evidence = { ...prev, ...changes, id: prev.id, workspaceId: ws.id };
1067:       await this.store.evidence.put(next);
1068:       this.emit(ws.id, "evidence.updated", next);
1069:       await this.log(ws.id, actor, "updated", "evidence", next.id, `Evidence “${next.title}” updated`);
1070:       return next;
1071:     });
1072:   }
1073:
1074:   // -------------------------------------------------------------------------
1075:   // Policies
1076:   // -------------------------------------------------------------------------
1077:
1078:   async createPolicy(workspaceId: string, input: Partial<Policy> & Pick<Policy, "title" | "body">, actor = "user"): Promise<Policy> {
1079:     return this.mutate(workspaceId, async (ws) => {
1080:       const ts = now();
1081:       const policy: Policy = {
1082:         id: newId("pol"),
1083:         workspaceId: ws.id,
1084:         title: input.title.trim(),
1085:         slug: slugify(input.title),
1086:         version: 1,
1087:         status: input.status ?? "draft",
1088:         body: input.body,
1089:         requirementIds: this.linkedRequirements(input.requirementIds),
1090:         owner: input.owner,
1091:         reviewCadenceDays: input.reviewCadenceDays ?? 365,
1092:         origin: input.origin ?? "user",
1093:         agentRunId: input.agentRunId,
1094:         createdAt: ts,
1095:         updatedAt: ts,
1096:       };
1097:       await this.store.policies.put(policy);
1098:       this.emit(ws.id, "policy.created", policy);
1099:       await this.log(ws.id, actor, "created", "policy", policy.id, `Policy “${policy.title}” created (${policy.status})`);
1100:       return policy;
1101:     });
1102:   }
1103:
1104:   async updatePolicy(
1105:     workspaceId: string,
1106:     policyId: string,
1107:     patch: Partial<Pick<Policy, "title" | "body" | "status" | "owner" | "requirementIds" | "reviewCadenceDays">>,
1108:     actor = "user",
1109:   ): Promise<Policy> {
1110:     return this.mutate(workspaceId, async (ws) => {
1111:       const prev = await this.store.policies.get(policyId);
1112:       if (!prev || prev.workspaceId !== ws.id) throw new NotFoundError(`Policy '${policyId}' not found`);
1113:       if (patch.requirementIds) patch = { ...patch, requirementIds: this.linkedRequirements(patch.requirementIds) };
1114:       const bodyChanged = patch.body !== undefined && patch.body !== prev.body;
1115:       const next: Policy = {
1116:         ...prev,
1117:         ...patch,
1118:         version: bodyChanged && (prev.status === "approved" || prev.status === "published") ? prev.version + 1 : prev.version,
1119:         updatedAt: now(),
1120:       };
1121:       if (bodyChanged && (prev.status === "approved" || prev.status === "published") && !patch.status) next.status = "in-review";
1122:       if (patch.status === "approved" && prev.status !== "approved") {
1123:         next.approvedBy = actor;
1124:         next.approvedAt = now();
1125:       }
1126:       await this.store.policies.put(next);
1127:       this.emit(ws.id, "policy.updated", next);
1128:       await this.log(ws.id, actor, patch.status ?? "updated", "policy", next.id, `Policy “${next.title}” v${next.version} ${patch.status ?? "updated"}`);
1129:       if (patch.status === "approved" || patch.status === "published") {
1130:         // An approved policy is evidence for the requirements it governs.
1131:         const exists = (await this.store.evidence.list(ws.id)).some((e) => e.kind === "policy" && e.data?.["policyId"] === next.id && e.data?.["version"] === next.version);
1132:         if (!exists && next.requirementIds.length) {
1133:           await this.createEvidence(
1134:             ws.id,
1135:             {
1136:               title: `${next.title} v${next.version} (approved)`,
1137:               kind: "policy",
1138:               source: "manual",
1139:               requirementIds: next.requirementIds,
1140:               status: "accepted",
1141:               reviewedBy: actor,
1142:               reviewedAt: now(),
1143:               validUntil: new Date(Date.now() + next.reviewCadenceDays * 86_400_000).toISOString(),
1144:               data: { policyId: next.id, version: next.version },
1145:               content: next.body,
1146:             },
1147:             actor,
1148:           );
1149:         }
1150:       }
1151:       return next;
1152:     });
1153:   }
1154:
1155:   // -------------------------------------------------------------------------
1156:   // Risks
1157:   // -------------------------------------------------------------------------
1158:
1159:   async upsertRisk(workspaceId: string, input: Partial<Risk> & Pick<Risk, "title">, actor = "user"): Promise<Risk> {
1160:     return this.mutate(workspaceId, async (ws) => {
1161:       const prev = input.id ? await this.store.risks.get(input.id) : undefined;
1162:       if (input.id && prev && prev.workspaceId !== ws.id) throw new NotFoundError(`Risk '${input.id}' not found`);
1163:       const ts = now();
1164:       const risk: Risk = {
1165:         id: prev?.id ?? newId("risk"),
1166:         workspaceId: ws.id,
1167:         title: input.title,
1168:         description: input.description ?? prev?.description ?? "",
1169:         likelihood: input.likelihood ?? prev?.likelihood ?? 3,
1170:         impact: input.impact ?? prev?.impact ?? 3,
1171:         treatment: input.treatment ?? prev?.treatment ?? "mitigate",
1172:         status: input.status ?? prev?.status ?? "open",
1173:         requirementIds: input.requirementIds ? this.linkedRequirements(input.requirementIds) : prev?.requirementIds ?? [],
1174:         owner: input.owner ?? prev?.owner,
1175:         createdAt: prev?.createdAt ?? ts,
1176:         updatedAt: ts,
1177:       };
1178:       await this.store.risks.put(risk);
1179:       this.emit(ws.id, "risk.updated", risk);
1180:       await this.log(ws.id, actor, prev ? "updated" : "created", "risk", risk.id, `Risk “${risk.title}” ${prev ? "updated" : "registered"}`);
1181:       return risk;
1182:     });
1183:   }
1184:
1185:   // -------------------------------------------------------------------------
1186:   // Connectors & monitoring
1187:   // -------------------------------------------------------------------------
1188:
1189:   async createConnector(workspaceId: string, input: { kind: string; name?: string; config: Record<string, unknown> }, actor = "user"): Promise<Connector> {
1190:     const kind = connectorKind(input.kind);
1191:     if (!kind) throw new ValidationError(`Unknown connector kind '${input.kind}'`);
1192:     for (const field of kind.configFields) {
1193:       if (field.required && !String(input.config[field.key] ?? "").trim()) throw new ValidationError(`${field.label} is required`);
1194:     }
1195:     return this.mutate(workspaceId, async (ws) => {
1196:       const connector: Connector = {
1197:         id: newId("con"),
1198:         workspaceId: ws.id,
1199:         kind: kind.kind,
1200:         name: input.name?.trim() || kind.name,
1201:         config: input.config,
1202:         status: "active",
1203:         createdAt: now(),
1204:       };
1205:       await this.store.connectors.put(connector);
1206:       await this.log(ws.id, actor, "connected", "connector", connector.id, `Connector “${connector.name}” added`);
1207:       return connector;
1208:     });
1209:   }
1210:
1211:   private resolveRefs(ws: Workspace, refs: RequirementRefs): string[] {
1212:     const ids: string[] = [];
1213:     for (const [key, codes] of Object.entries(refs) as [keyof RequirementRefs, string[]][]) {
1214:       const fw = FRAMEWORK_OF_REF[key];
1215:       if (!this.frameworkSettings(ws, fw)?.enabled) continue;
1216:       const index = this.registry.framework(fw);
1217:       for (const code of codes ?? []) {
1218:         const node = index?.get(code);
1219:         if (node) ids.push(node.id);
1220:       }
1221:     }
1222:     return ids;
1223:   }
1224:
1225:   /**
1226:    * Run a connector and record its checks. A person's run files each passing check as
1227:    * accepted, machine-verified evidence; an agent's run (`fileEvidence: false`) only
1228:    * records the checks, and the agent proposes the evidence (see `evidenceFromCheck`).
1229:    */
1230:   async runConnector(workspaceId: string, connectorId: string, actor = "user", opts: { fileEvidence?: boolean } = {}): Promise<CheckResult[]> {
1231:     const ws = await this.workspace(workspaceId);
1232:     const connector = await this.store.connectors.get(connectorId);
1233:     if (!connector || connector.workspaceId !== ws.id) throw new NotFoundError(`Connector '${connectorId}' not found`);
1234:     const kind = connectorKind(connector.kind);
1235:     if (!kind) throw new ValidationError(`Unknown connector kind '${connector.kind}'`);
1236:     // The external call happens outside any transaction.
1237:     let outputs;
1238:     try {
1239:       outputs = await kind.run(connector.config);
1240:     } catch (err) {
1241:       await this.mutate(ws.id, async () => {
1242:         await this.store.connectors.update(connector.id, (c) => ({ ...c, status: "error", lastRunAt: now() }));
1243:         await this.log(ws.id, actor, "failed", "connector", connector.id, `Connector “${connector.name}” failed: ${(err as Error).message.slice(0, 200)}`);
1244:       });
1245:       throw err;
1246:     }
1247:     return this.mutate(ws.id, async (ws) => {
1248:       await this.store.connectors.update(connector.id, (c) => ({ ...c, status: "active", lastRunAt: now() }));
1249:       const observedAt = now();
1250:       const results: CheckResult[] = outputs.map((o) => ({
1251:         id: newId("chk"),
1252:         workspaceId: ws.id,
1253:         connectorId: connector.id,
1254:         checkId: o.checkId,
1255:         title: o.title,
1256:         outcome: o.outcome,
1257:         detail: o.detail,
1258:         requirementIds: this.resolveRefs(ws, o.requirements),
1259:         observed: o.observed,
1260:         observedAt,
1261:       }));
1262:       for (const r of results) await this.store.checks.put(r, observedAt);
1263:       // Passing checks are machine-verified evidence, valid for 30 days.
1264:       if (opts.fileEvidence !== false) for (const r of results.filter((x) => x.outcome === "pass" && x.requirementIds.length)) await this.evidenceFromCheck(ws.id, connector, r, "system:connector");
1265:       this.emit(ws.id, "check.completed", { connectorId: connector.id, results });
1266:       const passed = results.filter((r) => r.outcome === "pass").length;
1267:       await this.log(ws.id, actor, "ran", "connector", connector.id, `${connector.name}: ${passed}/${results.length} checks passing`);
1268:       return results;
1269:     });
1270:   }
1271:
1272:   /**
1273:    * File a passing check as accepted evidence, built from the stored check result only:
1274:    * its title, detail, requirements and observation, hashed. Nobody (and no agent) can
1275:    * change what a check observed on its way into the evidence locker.
1276:    */
1277:   private async evidenceFromCheck(workspaceId: string, connector: Connector, check: CheckResult, reviewer: string): Promise<Evidence> {
1278:     const ev = await this.createEvidence(
1279:       workspaceId,
1280:       {
1281:         title: `${connector.name}: ${check.title}`,
1282:         kind: "automated-check",
1283:         source: "connector",
1284:         connectorId: connector.id,
1285:         requirementIds: check.requirementIds,
1286:         status: "accepted",
1287:         reviewedBy: reviewer,
1288:         reviewedAt: now(),
1289:         collectedAt: check.observedAt,
1290:         validUntil: new Date(new Date(check.observedAt).getTime() + 30 * 86_400_000).toISOString(),
1291:         content: check.detail,
1292:         data: { checkId: check.checkId, observed: check.observed, automation: "api-automated" },
1293:         sha256: createHash("sha256").update(canonical({ checkId: check.checkId, observed: check.observed, observedAt: check.observedAt })).digest("hex"),
1294:       },
1295:       `connector:${connector.kind}`,
1296:     );
1297:     check.evidenceId = ev.id;
1298:     await this.store.checks.put(check, check.observedAt);
1299:     return ev;
1300:   }
1301:
1302:   /** A passing check of this workspace, not yet filed as evidence: what an agent may propose as evidence. */
1303:   private async passingCheck(workspaceId: string, checkResultId: string): Promise<{ check: CheckResult; connector: Connector }> {
1304:     const check = await this.store.checks.get(checkResultId);
1305:     if (!check || check.workspaceId !== workspaceId) throw new NotFoundError(`Check result '${checkResultId}' not found`);
1306:     if (check.outcome !== "pass") throw new ValidationError(`Check “${check.title}” did not pass: only passing checks become evidence`);
1307:     if (check.evidenceId) throw new ValidationError(`Check “${check.title}” is already filed as evidence`);
1308:     if (!check.requirementIds.length) throw new ValidationError(`Check “${check.title}” is not linked to any requirement in scope`);
1309:     const connector = await this.store.connectors.get(check.connectorId);
1310:     if (!connector || connector.workspaceId !== workspaceId) throw new NotFoundError(`Connector '${check.connectorId}' not found`);
1311:     return { check, connector };
1312:   }
1313:
1314:   // -------------------------------------------------------------------------
1315:   // Agents & proposals
1316:   // -------------------------------------------------------------------------
1317:
1318:   async startRun(workspaceId: string, input: { agent: AgentKind; goal: string; input?: Record<string, unknown> }, actor = "user"): Promise<AgentRun> {
1319:     return this.mutate(workspaceId, async (ws) => {
1320:       const principal = principalContext.getStore();
1321:       const run: AgentRun = {
1322:         id: newId("run"),
1323:         workspaceId: ws.id,
1324:         agent: input.agent,
1325:         goal: input.goal.trim() || `Run ${input.agent}`,
1326:         input: input.input ?? {},
1327:         status: "queued",
1328:         mode: "offline",
1329:         steps: [],
1330:         focusNodeIds: [],
1331:         taskId: typeof input.input?.["taskId"] === "string" ? (input.input["taskId"] as string) : undefined,
1332:         ...(principal ? { startedBy: principal.id } : {}),
1333:         createdAt: now(),
1334:       };
1335:       await this.store.runs.put(run, run.createdAt);
1336:       this.emit(ws.id, "agent.run.created", run);
1337:       await this.log(ws.id, actor, "started", "agent-run", run.id, `${input.agent} started: ${run.goal.slice(0, 120)}`);
1338:       // Launch only once the run is committed, detached from the request.
1339:       this.store.afterCommit(() => this.launch(run.id));
1340:       return run;
1341:     });
1342:   }
1343:
1344:   private launch(runId: string): void {
1345:     const controller = new AbortController();
1346:     this.running.set(runId, controller);
1347:     principalContext.exit(() =>
1348:       txContext.exit(() => {
1349:         void this.executeRun(runId, controller.signal)
1350:           .catch((err: unknown) => console.error(`[visua] agent run ${runId} crashed`, err))
1351:           .finally(() => this.running.delete(runId));
1352:       }),
1353:     );
1354:   }
1355:
1356:   /** Resolves when the run finishes (used by tests and synchronous API callers). */
1357:   async waitForRun(runId: string, timeoutMs = 120_000): Promise<AgentRun> {
1358:     const started = Date.now();
1359:     for (;;) {
1360:       const run = await this.store.runs.get(runId);
1361:       if (!run) throw new NotFoundError(`Run '${runId}' not found`);
1362:       if (["completed", "failed", "cancelled", "awaiting-approval"].includes(run.status)) return run;
1363:       if (Date.now() - started > timeoutMs) throw new Error("Timed out waiting for agent run");
1364:       await new Promise((r) => setTimeout(r, 25));
1365:     }
1366:   }
1367:
1368:   async cancelRun(workspaceId: string, runId: string, actor = "user"): Promise<AgentRun> {
1369:     return this.mutate(workspaceId, async (ws) => {
1370:       const run = await this.store.runs.get(runId);
1371:       if (!run || run.workspaceId !== ws.id) throw new NotFoundError(`Run '${runId}' not found`);
1372:       const next = (await this.store.runs.update(runId, (r) => ({ ...r, status: "cancelled", finishedAt: now() })))!;
1373:       this.store.afterCommit(() => this.running.get(runId)?.abort());
1374:       this.emit(ws.id, "agent.run.updated", { ...next, steps: undefined });
1375:       await this.log(ws.id, actor, "cancelled", "agent-run", runId, `${run.agent} run cancelled`);
1376:       return next;
1377:     });
1378:   }
1379:
1380:   private async executeRun(runId: string, signal: AbortSignal): Promise<void> {
1381:     const initial = await this.store.runs.get(runId);
1382:     if (!initial) return;
1383:     const workspaceId = initial.workspaceId;
1384:     const recorder = new RunRecorder(this, workspaceId, initial);
1385:     const save = async (patch: Partial<AgentRun>) => {
1386:       await recorder.flush();
1387:       // A cancellation wins over anything the run reports afterwards.
1388:       const run = await this.store.runs.update(runId, (r) => (r.status === "cancelled" ? undefined : { ...r, ...patch }));
1389:       if (run && run.status !== "cancelled") this.emit(workspaceId, "agent.run.updated", { ...run, steps: undefined });
1390:       return run;
1391:     };
1392:     await save({ status: "running", startedAt: now() });
1393:     try {
1394:       const host = await this.hostFor(workspaceId, runId, signal, recorder);
1395:       const result = await executeAgent(host, { agent: initial.agent, goal: initial.goal, input: initial.input });
1396:       if (signal.aborted) return;
1397:       const pending = (await this.store.proposals.list(workspaceId)).filter((p) => p.runId === runId && p.status === "pending").length;
1398:       await save({
1399:         status: pending ? "awaiting-approval" : "completed",
1400:         summary: result.summary,
1401:         mode: result.mode,
1402:         model: result.model,
1403:         usage: result.usage,
1404:         finishedAt: now(),
1405:       });
1406:       await this.log(workspaceId, `agent:${initial.agent}`, "finished", "agent-run", runId, `${initial.agent} finished${pending ? ` — ${pending} proposal(s) await approval` : ""}`);
1407:     } catch (err) {
1408:       if (signal.aborted) return;
1409:       const message = err instanceof Error ? err.message : String(err);
1410:       recorder.step({ type: "error", title: "Run failed", detail: message });
1411:       await save({ status: "failed", error: message, finishedAt: now() });
1412:       await this.log(workspaceId, `agent:${initial.agent}`, "failed", "agent-run", runId, `${initial.agent} failed: ${message.slice(0, 160)}`);
1413:     } finally {
1414:       await recorder.flush();
1415:     }
1416:   }
1417:
1418:   private async agentSnapshot(workspaceId: string): Promise<AgentSnapshot> {
1419:     const [workspace, states, tasks, evidence, policies, connectors, checks] = await Promise.all([
1420:       this.workspace(workspaceId),
1421:       this.store.states.list(workspaceId),
1422:       this.store.tasks.list(workspaceId),
1423:       this.store.evidence.list(workspaceId),
1424:       this.store.policies.list(workspaceId),
1425:       this.store.connectors.list(workspaceId),
1426:       this.store.checks.list(workspaceId),
1427:     ]);
1428:     const scores = new Map<string, FrameworkScore>();
1429:     return {
1430:       workspace,
1431:       states,
1432:       byNode: new Map(states.map((s) => [s.nodeId, s])),
1433:       tasks,
1434:       evidence,
1435:       policies,
1436:       connectors,
1437:       score: (frameworkId: string) => {
1438:         let score = scores.get(frameworkId);
1439:         if (!score) {
1440:           const index = this.registry.framework(frameworkId);
1441:           if (!index) throw new NotFoundError(`Framework '${frameworkId}' not found`);
1442:           score = this.scoreOf(index, { states: states.filter((s) => frameworkOf(s.nodeId) === frameworkId), evidence, tasks, checks });
1443:           scores.set(frameworkId, score);
1444:         }
1445:         return score;
1446:       },
1447:     };
1448:   }
1449:
1450:   /**
1451:    * The agent's view of the platform. Reads come from a snapshot taken when
1452:    * the run starts and refreshed after every change the agent's own actions
1453:    * apply (auto-approved proposals, connector runs); writes are proposals.
1454:    */
1455:   private async hostFor(workspaceId: string, runId: string, signal: AbortSignal, recorder: RunRecorder): Promise<AgentHost> {
1456:     let snap = await this.agentSnapshot(workspaceId);
1457:     const refresh = async () => {
1458:       snap = await this.agentSnapshot(workspaceId);
1459:     };
1460:     return {
1461:       registry: this.registry,
1462:       runId,
1463:       signal,
1464:       workspace: () => snap.workspace,
1465:       states: (frameworkId?: string) => (frameworkId ? snap.states.filter((s) => frameworkOf(s.nodeId) === frameworkId) : snap.states),
1466:       state: (nodeId: string) => snap.byNode.get(nodeId),
1467:       score: (frameworkId: string) => snap.score(frameworkId),
1468:       tasks: () => snap.tasks,
1469:       evidence: () => snap.evidence,
1470:       policies: () => snap.policies,
1471:       connectors: () => snap.connectors,
1472:       // Agents observe; evidence from the checks goes through proposals like everything else.
1473:       runConnector: async (connectorId: string) => {
1474:         const results = await this.runConnector(workspaceId, connectorId, `agent:${runId}`, { fileEvidence: false });
1475:         await refresh();
1476:         return results;
1477:       },
1478:       propose: async (input: ProposalInput) => {
1479:         const proposal = await this.createProposal(workspaceId, runId, input, recorder);
1480:         if (proposal.status !== "pending") await refresh();
1481:         return proposal;
1482:       },
1483:       step: (step: Omit<AgentStep, "id" | "at">) => recorder.step(step),
1484:     };
1485:   }
1486:
1487:   /**
1488:    * An agent proposal meets the rules of the change it would make before it reaches the
1489:    * approvals inbox: no threat nodes, no frameworks the workspace has not enabled, no
1490:    * levels on requirements out of scope. Applying it checks again (state can change).
1491:    */
1492:   private async checkProposal(ws: Workspace, input: ProposalInput): Promise<void> {
1493:     const payload = input.payload;
1494:     switch (input.type) {
1495:       case "set-level":
1496:       case "set-target":
1497:       case "set-applicability": {
1498:         const node = this.assessableIn(ws, String(payload["nodeId"] ?? ""));
1499:         const state = await this.store.states.get(ws.id, node.id);
1500:         const scope = this.scopeOf(ws, node.id);
1501:         if (input.type === "set-applicability") {
1502:           if (payload["applicable"] === true && !scope.applicable) throw new ValidationError(`${node.code} is out of scope by configuration — ${scope.rationale}`);
1503:           if (payload["applicable"] === false && !String(payload["rationale"] ?? "").trim()) throw new ValidationError("Marking a requirement not applicable requires a written rationale that auditors can review");
1504:           return;
1505:         }
1506:         const patch = input.type === "set-level" ? { current: Number(payload["current"]) } : { target: Number(payload["target"]) };
1507:         this.checkAssessment(node, state ? state.applicable : scope.applicable, patch, state ? state.applicabilityRationale : scope.rationale);
1508:         return;
1509:       }
1510:       case "create-evidence":
1511:         if (typeof payload["checkResultId"] === "string") {
1512:           await this.passingCheck(ws.id, payload["checkResultId"]);
1513:           return;
1514:         }
1515:         this.linkedRequirements(payload["requirementIds"] as string[] | undefined);
1516:         return;
1517:       case "create-task":
1518:       case "create-policy":
1519:       case "create-risk":
1520:         this.linkedRequirements(payload["requirementIds"] as string[] | undefined);
1521:         return;
1522:       default:
1523:         return;
1524:     }
1525:   }
1526:
1527:   async createProposal(workspaceId: string, runId: string, input: ProposalInput, recorder?: RunRecorder): Promise<Proposal> {
1528:     return this.mutate(workspaceId, async (ws) => {
1529:       await this.checkProposal(ws, input);
1530:       const proposal: Proposal = {
1531:         id: newId("prop"),
1532:         runId,
1533:         workspaceId: ws.id,
1534:         type: input.type,
1535:         title: input.title,
1536:         rationale: input.rationale,
1537:         payload: input.payload,
1538:         citations: input.citations,
1539:         confidence: input.confidence,
1540:         status: "pending",
1541:         nodeIds: input.nodeIds,
1542:         createdAt: now(),
1543:       };
1544:       await this.store.proposals.put(proposal, proposal.createdAt);
1545:       // The flight recorder streams and stores steps at once: record the proposal only once it exists.
1546:       this.store.afterCommit(() =>
1547:         recorder?.step({ type: "proposal", title: proposal.title, detail: proposal.rationale, data: { proposalId: proposal.id, type: proposal.type }, nodeIds: proposal.nodeIds, citations: proposal.citations }),
1548:       );
1549:       this.emit(ws.id, "proposal.created", proposal);
1550:       if (ws.autonomy[proposal.type]) return this.decideProposal(ws.id, proposal.id, "approved", "autonomy");
1551:       return proposal;
1552:     });
1553:   }
1554:
1555:   async decideProposal(workspaceId: string, proposalId: string, decision: "approved" | "rejected", actor = "user", edits?: Record<string, unknown>): Promise<Proposal> {
1556:     return this.mutate(workspaceId, async (ws) => {
1557:       const prev = await this.store.proposals.get(proposalId);
1558:       if (!prev || prev.workspaceId !== ws.id) throw new NotFoundError(`Proposal '${proposalId}' not found`);
1559:       if (prev.status !== "pending") throw new ValidationError(`Proposal already ${prev.status}`);
1560:       let next: Proposal = { ...prev, payload: { ...prev.payload, ...(edits ?? {}) }, status: decision, decidedBy: actor, decidedAt: now() };
1561:       if (decision === "approved") {
1562:         try {
1563:           // A savepoint: a change that fails half-way leaves nothing behind.
1564:           await this.store.transaction(() => this.applyProposal(next, actor));
1565:           next = { ...next, status: "applied" };
1566:         } catch (err) {
1567:           next = { ...next, status: "failed", rationale: `${next.rationale}\n\nApply failed: ${(err as Error).message}` };
1568:         }
1569:       }
1570:       await this.store.proposals.put(next);
1571:       this.emit(ws.id, "proposal.updated", next);
1572:       await this.log(ws.id, actor, next.status, "proposal", next.id, `${next.status === "applied" ? "Approved" : next.status === "rejected" ? "Rejected" : "Failed"}: ${next.title}`);
1573:       await this.refreshRunStatus(ws.id, next.runId);
1574:       return next;
1575:     });
1576:   }
1577:
1578:   private async refreshRunStatus(workspaceId: string, runId: string): Promise<void> {
1579:     const pending = (await this.store.proposals.list(workspaceId)).some((p) => p.runId === runId && p.status === "pending");
1580:     if (pending) return;
1581:     const next = await this.store.runs.update(runId, (run) => (run.status === "awaiting-approval" ? { ...run, status: "completed" } : undefined));
1582:     if (next?.status === "completed") this.emit(workspaceId, "agent.run.updated", { ...next, steps: undefined });
1583:   }
1584:
1585:   private async applyProposal(p: Proposal, actor: string): Promise<void> {
1586:     const by = `${actor} (via ${p.runId})`;
1587:     const payload = p.payload;
1588:     switch (p.type) {
1589:       case "set-level":
1590:         await this.updateState(p.workspaceId, String(payload["nodeId"]), { current: Number(payload["current"]) }, by);
1591:         return;
1592:       case "set-target":
1593:         await this.updateState(p.workspaceId, String(payload["nodeId"]), { target: Number(payload["target"]) }, by);
1594:         return;
1595:       case "set-applicability":
1596:         await this.updateState(p.workspaceId, String(payload["nodeId"]), { applicable: Boolean(payload["applicable"]), applicabilityRationale: String(payload["rationale"] ?? "") }, by);
1597:         return;
1598:       case "create-task": {
1599:         const checklist = Array.isArray(payload["checklist"]) ? (payload["checklist"] as string[]).map((text) => ({ id: newId("chk"), text, done: false })) : [];
1600:         await this.createTask(
1601:           p.workspaceId,
1602:           {
1603:             title: String(payload["title"]),
1604:             description: String(payload["description"] ?? ""),
1605:             kind: payload["kind"] as Task["kind"],
1606:             priority: payload["priority"] as Priority,
1607:             requirementIds: payload["requirementIds"] as string[],
1608:             dueDate: payload["dueDate"] as string | undefined,
1609:             effortHours: payload["effortHours"] as number | undefined,
1610:             checklist,
1611:             origin: "agent",
1612:           },
1613:           by,
1614:         );
1615:         return;
1616:       }
1617:       case "update-task": {
1618:         const task = await this.store.tasks.get(String(payload["taskId"]));
1619:         if (!task || task.workspaceId !== p.workspaceId) throw new NotFoundError("Task no longer exists");
1620:         const done = new Set((payload["completeChecklistItems"] as string[] | undefined) ?? []);
1621:         const patch: Partial<Task> = { checklist: task.checklist.map((c) => (done.has(c.id) ? { ...c, done: true } : c)) };
1622:         if (payload["status"]) patch.status = payload["status"] as Task["status"];
1623:         if (payload["note"]) patch.description = `${task.description}\n\n— ${new Date().toISOString().slice(0, 10)}: ${String(payload["note"])}`.trim();
1624:         await this.updateTask(p.workspaceId, task.id, patch, by);
1625:         return;
1626:       }
1627:       case "create-evidence":
1628:         if (typeof payload["checkResultId"] === "string") {
1629:           const { check, connector } = await this.passingCheck(p.workspaceId, payload["checkResultId"]);
1630:           await this.evidenceFromCheck(p.workspaceId, connector, check, actor);
1631:           return;
1632:         }
1633:         await this.createEvidence(
1634:           p.workspaceId,
1635:           {
1636:             title: String(payload["title"]),
1637:             kind: payload["kind"] as Evidence["kind"],
1638:             source: "agent",
1639:             requirementIds: payload["requirementIds"] as string[],
1640:             content: String(payload["content"] ?? ""),
1641:             status: "accepted",
1642:             reviewedBy: actor,
1643:             reviewedAt: now(),
1644:             validUntil: payload["validDays"] ? new Date(Date.now() + Number(payload["validDays"]) * 86_400_000).toISOString() : undefined,
1645:           },
1646:           by,
1647:         );
1648:         return;
1649:       case "review-evidence":
1650:         await this.reviewEvidence(p.workspaceId, String(payload["evidenceId"]), payload["decision"] === "rejected" ? "rejected" : "accepted", by);
1651:         return;
1652:       case "create-policy":
1653:         await this.createPolicy(
1654:           p.workspaceId,
1655:           { title: String(payload["title"]), body: String(payload["body"]), requirementIds: payload["requirementIds"] as string[], status: "in-review", origin: "agent", agentRunId: p.runId },
1656:           by,
1657:         );
1658:         return;
1659:       case "create-risk": {
1660:         // Agents register new risks; an id in the payload must not overwrite another record.
1661:         const { id: _id, workspaceId: _ws, ...risk } = payload as unknown as Risk;
1662:         void _id;
1663:         void _ws;
1664:         await this.upsertRisk(p.workspaceId, risk, by);
1665:         return;
1666:       }
1667:       case "set-rmf": {
1668:         const ws = await this.workspace(p.workspaceId);
1669:         const settings = this.frameworkSettings(ws, "nist-sp-800-53-r5");
1670:         await this.enableFramework(p.workspaceId, "nist-sp-800-53-r5", { rmf: { ...settings!.rmf!, ...(payload as Partial<RmfSettings>) } }, by);
1671:         return;
1672:       }
1673:     }
1674:   }
1675: }

FILE apps/server/src/services/exports.ts SHA256 c5c130dc397a5cc3a364972b5a338bf6bac750090a9836ded7424ee0dd25c5b2
1: /**
2:  * Auditor-ready exports: the NIST CSF 2.0 Organizational Profile (official
3:  * template columns), the action plan, a readiness report, the SOC 2 PBC
4:  * (provided-by-client) evidence request list, and OSCAL SSP / POA&M.
5:  */
6: import { randomUUID } from "node:crypto";
7: import { codeOf, frameworkOf, groupStatus, isEvidenceValid, levelLabel, type RequirementNode, type Workspace } from "@visua/core";
8: import type { VisuaService } from "./visua.ts";
9:
10: const csvCell = (v: unknown) => {
11:   const s = v === undefined || v === null ? "" : String(v);
12:   return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
13: };
14: export const toCsv = (rows: unknown[][]) => rows.map((r) => r.map(csvCell).join(",")).join("\r\n") + "\r\n";
15:
16: async function context(svc: VisuaService, ws: Workspace) {
17:   const [evidence, tasks, policies] = await Promise.all([svc.store.evidence.list(ws.id), svc.store.tasks.list(ws.id), svc.store.policies.list(ws.id)]);
18:   return {
19:     evidenceFor: (id: string) => evidence.filter((e) => e.requirementIds.includes(id)),
20:     tasksFor: (id: string) => tasks.filter((t) => t.requirementIds.includes(id)),
21:     policiesFor: (id: string) => policies.filter((p) => p.requirementIds.includes(id)),
22:     tasks,
23:     evidence,
24:     policies,
25:   };
26: }
27:
28: /** NIST CSF 2.0 Organizational Profile, using the official template's columns. */
29: export async function csfProfileCsv(svc: VisuaService, ws: Workspace): Promise<string> {
30:   const index = svc.registry.framework("nist-csf-2.0");
31:   if (!index) throw new Error("CSF 2.0 is not loaded");
32:   const [score, ctx, states] = await Promise.all([svc.score(ws.id, index.id), context(svc, ws), svc.store.states.map(ws.id, index.id)]);
33:   const header = [
34:     "CSF Outcome (Function, Category, or Subcategory)",
35:     "CSF Outcome Description",
36:     "Included in Profile?",
37:     "Rationale",
38:     "Current Priority",
39:     "Current Status",
40:     "Current Policies, Processes, and Procedures",
41:     "Current Internal Practices",
42:     "Current Roles and Responsibilities",
43:     "Current Selected Informative References",
44:     "Current Artifacts and Evidence",
45:     "Target Priority",
46:     "Target CSF Tier",
47:     "Target Policies, Processes, and Procedures",
48:     "Target Internal Practices",
49:     "Target Roles and Responsibilities",
50:     "Target Selected Informative References",
51:     "Notes",
52:     "Considerations",
53:   ];
54:   const rows: unknown[][] = [header];
55:   index.walk((node) => {
56:     const refs = (node.references ?? []).filter((r) => r.source.startsWith("SP 800-53")).map((r) => r.ref).slice(0, 10).join("; ");
57:     if (!node.assessable) {
58:       const s = score.scores.get(node.id);
59:       rows.push([
60:         node.code,
61:         `${node.title}: ${node.text}`,
62:         "Yes",
63:         "",
64:         "",
65:         s ? `${groupStatus(s)} — readiness ${Math.round(s.readiness * 100)}%, ${s.gaps} gap(s)` : "",
66:         "",
67:         "",
68:         "",
69:         refs,
70:         "",
71:         "",
72:         "",
73:         "",
74:         "",
75:         "",
76:         refs,
77:         "",
78:         "",
79:       ]);
80:       return;
81:     }
82:     const st = states.get(node.id);
83:     const status = score.statuses.get(node.id);
84:     const approved = ctx.policiesFor(node.id).filter((p) => p.status === "approved" || p.status === "published");
85:     const openPolicyWork = ctx.tasksFor(node.id).filter((t) => t.status !== "done" && (t.kind === "policy" || t.kind === "procedure"));
86:     const openWork = ctx.tasksFor(node.id).filter((t) => t.status !== "done");
87:     const evidence = ctx.evidenceFor(node.id).filter((e) => isEvidenceValid(e));
88:     rows.push([
89:       node.code,
90:       node.text,
91:       st?.applicable === false ? "No" : "Yes",
92:       st?.applicabilityRationale ?? "",
93:       st?.priority ?? "",
94:       st ? `${levelLabel("csf", st.current)} (level ${st.current}) — ${status?.status ?? ""}` : "",
95:       approved.map((p) => `${p.title} v${p.version}`).join("; "),
96:       st?.notes ?? "",
97:       st?.owner ?? "",
98:       refs,
99:       evidence.map((e) => e.title).join("; "),
100:       st?.priority ?? "",
101:       st ? `${levelLabel("csf", st.target)} (level ${st.target})` : "",
102:       openPolicyWork.map((t) => t.title).join("; "),
103:       openWork.filter((t) => !openPolicyWork.includes(t)).map((t) => t.title).join("; "),
104:       st?.owner ?? "",
105:       refs,
106:       st && st.target > st.current ? `Gap of ${st.target - st.current} level(s)` : "",
107:       status?.reasons.join("; ") ?? "",
108:     ]);
109:   });
110:   return toCsv(rows);
111: }
112:
113: export async function actionPlanCsv(svc: VisuaService, ws: Workspace): Promise<string> {
114:   const rows: unknown[][] = [["Task", "Status", "Priority", "Kind", "Requirements", "Start", "Due", "Effort (h)", "Assignee", "Checklist done", "Basis", "Origin"]];
115:   for (const t of (await svc.store.tasks.list(ws.id)).sort((a, b) => (a.dueDate ?? "").localeCompare(b.dueDate ?? ""))) {
116:     rows.push([
117:       t.title,
118:       t.status,
119:       t.priority,
120:       t.kind,
121:       t.requirementIds.map(codeOf).join("; "),
122:       t.startDate ?? "",
123:       t.dueDate ?? "",
124:       t.effortHours ?? "",
125:       t.assignee?.name ?? "",
126:       `${t.checklist.filter((c) => c.done).length}/${t.checklist.length}`,
127:       t.source?.basis ?? "",
128:       t.origin,
129:     ]);
130:   }
131:   return toCsv(rows);
132: }
133:
134: export async function evidenceIndexCsv(svc: VisuaService, ws: Workspace): Promise<string> {
135:   const rows: unknown[][] = [["Evidence", "Kind", "Source", "Status", "Requirements", "Collected", "Valid until", "Reviewed by", "SHA-256"]];
136:   for (const e of await svc.store.evidence.list(ws.id)) {
137:     rows.push([e.title, e.kind, e.source, e.status, e.requirementIds.map((id) => `${codeOf(id)} (${frameworkOf(id)})`).join("; "), e.collectedAt, e.validUntil ?? "", e.reviewedBy ?? "", e.sha256 ?? ""]);
138:   }
139:   return toCsv(rows);
140: }
141:
142: /**
143:  * NIST AI RMF profile: current and target state for every outcome, with the Playbook
144:  * suggested actions and (for generative systems) Generative AI Profile actions in scope.
145:  */
146: export async function aiRmfProfileCsv(svc: VisuaService, ws: Workspace): Promise<string> {
147:   const index = svc.registry.framework("nist-ai-rmf");
148:   if (!index) throw new Error("The NIST AI RMF is not loaded");
149:   const [score, ctx, states] = await Promise.all([svc.score(ws.id, index.id), context(svc, ws), svc.store.states.map(ws.id, index.id)]);
150:   const generative = (svc.frameworkSettings(ws, "nist-ai-rmf")?.ai?.systems ?? []).some((s) => s.generative);
151:   const rows: unknown[][] = [["Function", "Category", "Outcome", "Outcome description", "In scope", "Current", "Target", "Status", "Owner", "Playbook suggested actions", "Generative AI Profile actions", "Open tasks", "Evidence on file", "Source"]];
152:   for (const node of index.assessable) {
153:     const [fn, cat] = index.ancestors(node.id);
154:     const st = states.get(node.id);
155:     const actions = (node.attributes?.["suggestedActions"] as string[] | undefined) ?? [];
156:     const gai = (node.attributes?.["profileActions"] as { id: string }[] | undefined) ?? [];
157:     rows.push([
158:       fn?.code ?? "",
159:       cat?.code ?? "",
160:       node.code,
161:       node.text,
162:       st?.applicable === false ? "No" : "Yes",
163:       levelLabel("ai", st?.current ?? 0),
164:       levelLabel("ai", st?.target ?? 0),
165:       score.statuses.get(node.id)?.status ?? "",
166:       st?.owner ?? "",
167:       actions.length,
168:       generative ? gai.map((a) => a.id).join("; ") : "",
169:       ctx.tasksFor(node.id).filter((t) => t.status !== "done").length,
170:       ctx.evidenceFor(node.id).filter((e) => isEvidenceValid(e)).map((e) => e.title).join("; "),
171:       `${node.citation.locator ?? node.code}${node.citation.page ? `, p. ${node.citation.page}` : ""}`,
172:     ]);
173:   }
174:   return toCsv(rows);
175: }
176:
177: /** SOC 2 PBC list: what an auditor will request per criterion, and what is already on file. */
178: export async function soc2PbcCsv(svc: VisuaService, ws: Workspace): Promise<string> {
179:   const index = svc.registry.framework("aicpa-tsc-2017");
180:   if (!index) throw new Error("SOC 2 (TSC) is not loaded");
181:   const [score, ctx, states] = await Promise.all([svc.score(ws.id, index.id), context(svc, ws), svc.store.states.map(ws.id, index.id)]);
182:   const rows: unknown[][] = [["Criterion", "Criterion text", "In scope", "Points of focus", "Evidence requested", "Evidence on file", "Status", "Owner"]];
183:   for (const node of index.assessable) {
184:     const st = states.get(node.id);
185:     const pof = (node.attributes?.["pointsOfFocus"] as { title: string }[] | undefined) ?? [];
186:     const onFile = ctx.evidenceFor(node.id).filter((e) => isEvidenceValid(e));
187:     rows.push([
188:       node.code,
189:       node.text,
190:       st?.applicable === false ? "No" : "Yes",
191:       pof.length,
192:       pof.slice(0, 6).map((p) => `Evidence that the entity ${p.title.charAt(0).toLowerCase()}${p.title.slice(1)}`).join("; "),
193:       onFile.map((e) => e.title).join("; "),
194:       score.statuses.get(node.id)?.status ?? "",
195:       st?.owner ?? "",
196:     ]);
197:   }
198:   return toCsv(rows);
199: }
200:
201: export async function readinessMarkdown(svc: VisuaService, ws: Workspace): Promise<string> {
202:   const lines = [`# ${ws.name} — Compliance readiness report`, "", `Generated ${new Date().toISOString().slice(0, 16).replace("T", " ")} UTC by Visua.`, ""];
203:   for (const f of ws.frameworks.filter((x) => x.enabled)) {
204:     const index = svc.registry.framework(f.frameworkId);
205:     if (!index) continue;
206:     const [score, states] = await Promise.all([svc.score(ws.id, f.frameworkId), svc.store.states.map(ws.id, f.frameworkId)]);
207:     const fw = index.graph.framework;
208:     lines.push(`## ${fw.shortName}`, "");
209:     lines.push(`- Readiness: **${Math.round(score.overall.readiness * 100)}%** across ${score.overall.total} in-scope ${fw.unitLabelPlural}`);
210:     lines.push(`- Evidence coverage: ${Math.round(score.overall.evidenceCoverage * 100)}% · Verified: ${Math.round(score.overall.verifiedShare * 100)}% · Open gaps: ${score.overall.gaps}`);
211:     const counts = score.overall.counts;
212:     lines.push(`- Status: ${Object.entries(counts).filter(([, n]) => n > 0).map(([s, n]) => `${s} ${n}`).join(", ")}`, "");
213:     lines.push(`| ${fw.levels[0]!.label} | Readiness | Gaps | Evidence |`, "|---|---|---|---|");
214:     for (const root of index.roots()) {
215:       const s = score.scores.get(root.id);
216:       if (!s || !s.total) continue;
217:       lines.push(`| ${root.code} ${root.title} | ${Math.round(s.readiness * 100)}% | ${s.gaps} | ${Math.round(s.evidenceCoverage * 100)}% |`);
218:     }
219:     const gaps = index.assessable
220:       .map((n) => ({ n, s: states.get(n.id) }))
221:       .filter((x) => x.s?.applicable && x.s.target > x.s.current)
222:       .sort((a, b) => b.s!.target - b.s!.current - (a.s!.target - a.s!.current))
223:       .slice(0, 10);
224:     if (gaps.length) {
225:       lines.push("", "Largest gaps:", "");
226:       for (const g of gaps) lines.push(`- **${g.n.code}** (${levelLabel(fw.family, g.s!.current)} → ${levelLabel(fw.family, g.s!.target)}): ${g.n.text.slice(0, 160)}`);
227:     }
228:     lines.push("");
229:   }
230:   lines.push("> Readiness reflects self-assessed implementation levels, evidence and monitoring in Visua. It is not an audit opinion or certification.");
231:   return lines.join("\n");
232: }
233:
234: // ---------------------------------------------------------------------------
235: // OSCAL
236: // ---------------------------------------------------------------------------
237:
238: const OSCAL_VERSION = "1.1.2";
239:
240: function implementationStatus(current: number, applicable: boolean): string {
241:   if (!applicable) return "not-applicable";
242:   if (current >= 3) return "implemented";
243:   if (current === 2) return "partial";
244:   if (current === 1) return "planned";
245:   return "planned";
246: }
247:
248: export async function oscalSsp(svc: VisuaService, ws: Workspace): Promise<Record<string, unknown>> {
249:   const index = svc.registry.framework("nist-sp-800-53-r5");
250:   const settings = ws.frameworks.find((f) => f.frameworkId === "nist-sp-800-53-r5")?.rmf;
251:   if (!index || !settings) throw new Error("Enable NIST RMF / SP 800-53 for this workspace to export an SSP");
252:   const now = new Date().toISOString();
253:   const cat = settings.categorization;
254:   const level = cat?.overall ?? settings.baseline ?? "moderate";
255:   const ownerParty = randomUUID();
256:   const thisSystem = randomUUID();
257:   const states = await svc.store.states.map(ws.id, index.id);
258:   const inScope = index.assessable.filter((n) => states.get(n.id)?.applicable);
259:   return {
260:     "system-security-plan": {
261:       uuid: randomUUID(),
262:       metadata: {
263:         title: `${settings.systemName} System Security Plan`,
264:         "last-modified": now,
265:         version: "1.0",
266:         "oscal-version": OSCAL_VERSION,
267:         roles: [{ id: "system-owner", title: "System Owner" }, { id: "authorizing-official", title: "Authorizing Official" }],
268:         parties: [{ uuid: ownerParty, type: "organization", name: ws.name }],
269:         "responsible-parties": [{ "role-id": "system-owner", "party-uuids": [ownerParty] }],
270:         remarks: "Generated by Visua from the workspace's SP 800-53 Rev. 5 implementation state.",
271:       },
272:       "import-profile": { href: `https://raw.githubusercontent.com/usnistgov/oscal-content/main/nist.gov/SP800-53/rev5/json/NIST_SP-800-53_rev5_${level.toUpperCase()}-baseline_profile.json` },
273:       "system-characteristics": {
274:         "system-ids": [{ "identifier-type": "https://ietf.org/rfc/rfc4122", id: ws.id }],
275:         "system-name": settings.systemName,
276:         description: settings.systemDescription ?? `${settings.systemName} operated by ${ws.name}.`,
277:         "security-sensitivity-level": `fips-199-${level}`,
278:         "system-information": {
279:           "information-types": (settings.informationTypes.length ? settings.informationTypes : [{ id: "generic", name: "Organizational information", confidentiality: level, integrity: level, availability: level }]).map((t) => ({
280:             uuid: randomUUID(),
281:             title: t.name,
282:             description: `${t.name} (${t.id})`,
283:             "confidentiality-impact": { base: `fips-199-${t.confidentiality}` },
284:             "integrity-impact": { base: `fips-199-${t.integrity}` },
285:             "availability-impact": { base: `fips-199-${t.availability}` },
286:           })),
287:         },
288:         "security-impact-level": {
289:           "security-objective-confidentiality": `fips-199-${cat?.confidentiality ?? level}`,
290:           "security-objective-integrity": `fips-199-${cat?.integrity ?? level}`,
291:           "security-objective-availability": `fips-199-${cat?.availability ?? level}`,
292:         },
293:         status: { state: settings.authorization?.decision === "ato" ? "operational" : "under-development" },
294:         "authorization-boundary": { description: `The authorization boundary of ${settings.systemName} as defined by ${ws.name}.` },
295:       },
296:       "system-implementation": {
297:         users: [{ uuid: randomUUID(), title: "System administrators", "role-ids": ["system-owner"] }],
298:         components: [{ uuid: thisSystem, type: "this-system", title: "This System", description: settings.systemName, status: { state: "operational" } }],
299:       },
300:       "control-implementation": {
301:         description: `Control implementation for the ${level.toUpperCase()} baseline${settings.tailoring.length ? " with tailoring" : ""}.`,
302:         "implemented-requirements": inScope.map((n) => {
303:           const st = states.get(n.id);
304:           return {
305:             uuid: randomUUID(),
306:             "control-id": String(n.attributes?.["oscalId"] ?? n.code.toLowerCase()),
307:             props: [{ name: "implementation-status", value: implementationStatus(st?.current ?? 0, st?.applicable ?? true) }],
308:             "by-components": [
309:               {
310:                 "component-uuid": thisSystem,
311:                 uuid: randomUUID(),
312:                 description: st?.notes || `${n.code} ${n.title} — ${levelLabel("rmf", st?.current ?? 0)}.`,
313:                 "implementation-status": { state: implementationStatus(st?.current ?? 0, st?.applicable ?? true) },
314:               },
315:             ],
316:           };
317:         }),
318:       },
319:     },
320:   };
321: }
322:
323: export async function oscalPoam(svc: VisuaService, ws: Workspace): Promise<Record<string, unknown>> {
324:   const now = new Date().toISOString();
325:   const items: Record<string, unknown>[] = [];
326:   const tasks = await svc.store.tasks.list(ws.id);
327:   for (const f of ws.frameworks.filter((x) => x.enabled)) {
328:     const index = svc.registry.framework(f.frameworkId);
329:     if (!index) continue;
330:     const states = await svc.store.states.map(ws.id, f.frameworkId);
331:     for (const n of index.assessable) {
332:       const st = states.get(n.id);
333:       if (!st?.applicable || st.current >= st.target) continue;
334:       const related = tasks.filter((t) => t.requirementIds.includes(n.id) && t.status !== "done");
335:       items.push({
336:         uuid: randomUUID(),
337:         title: `${n.code} below target (${levelLabel(index.graph.framework.family, st.current)} → ${levelLabel(index.graph.framework.family, st.target)})`,
338:         description: n.text,
339:         props: [
340:           { name: "framework", ns: "https://visua.dev/ns/oscal", value: f.frameworkId },
341:           { name: "priority", ns: "https://visua.dev/ns/oscal", value: st.priority },
342:         ],
343:         remarks: related.length ? `Milestones: ${related.map((t) => `${t.title}${t.dueDate ? ` (due ${t.dueDate})` : ""}`).join("; ")}` : "No remediation task scheduled yet.",
344:       });
345:     }
346:   }
347:   return {
348:     "plan-of-action-and-milestones": {
349:       uuid: randomUUID(),
350:       metadata: { title: `${ws.name} Plan of Action and Milestones`, "last-modified": now, version: "1.0", "oscal-version": OSCAL_VERSION },
351:       "poam-items": items,
352:     },
353:   };
354: }
355:
356: export function nodeLabel(n: RequirementNode): string {
357:   return `${n.code}${n.title ? ` ${n.title}` : ""}`;
358: }

FILE apps/server/src/services/laws.ts SHA256 4bbea8f5012fc9f6dfa61d60656ca954631225e23d7664cb30fcea6bd4ae9904
1: /**
2:  * U.S. state AI laws view: jurisdictions → laws with their status, dates,
3:  * enforcement and safe harbors, the roles each law defines, what the
4:  * workspace said applies, and progress on the obligations in scope.
5:  *
6:  * Readiness counts the obligations in force today. Obligations in scope that take
7:  * effect later are upcoming: they can be prepared for, and have their own figure.
8:  */
9: import { groupStatus, obligationTiming, type Status, type Workspace } from "@visua/core";
10: import { STATE_LAWS_ID } from "@visua/frameworks";
11: import { NotFoundError, type VisuaService } from "./visua.ts";
12:
13: const norm = (role: string) => role.trim().toLowerCase().replace(/\s+/g, "-");
14:
15: export async function lawsOverview(svc: VisuaService, ws: Workspace) {
16:   const index = svc.registry.framework(STATE_LAWS_ID);
17:   if (!index) throw new NotFoundError("U.S. state AI laws are not ingested — run `pnpm ingest`");
18:   const settings = svc.frameworkSettings(ws, STATE_LAWS_ID);
19:   const enabled = !!settings?.enabled;
20:   const [score, states] = enabled ? await Promise.all([svc.score(ws.id, STATE_LAWS_ID), svc.store.states.map(ws.id, STATE_LAWS_ID)]) : [null, new Map()];
21:   const today = new Date().toISOString().slice(0, 10);
22:   const timeline: { date: string; lawCode: string; lawId: string; label: string; obligations: number; past: boolean }[] = [];
23:
24:   const jurisdictions = index.roots().map((j) => ({
25:     id: j.id,
26:     code: j.code,
27:     name: j.title,
28:     laws: index.childrenOf(j.id).map((l) => {
29:       const a = (l.attributes ?? {}) as Record<string, unknown>;
30:       const lawId = String(a["lawId"]);
31:       const obligations = index.childrenOf(l.id);
32:       const appliesTo = (a["appliesTo"] as { role: string; condition: string }[] | undefined) ?? [];
33:       const roleCounts = new Map<string, number>();
34:       for (const o of obligations) for (const r of (o.attributes?.["roles"] as string[] | undefined) ?? []) roleCounts.set(r, (roleCounts.get(r) ?? 0) + 1);
35:       for (const x of appliesTo) if (!roleCounts.has(norm(x.role))) roleCounts.set(norm(x.role), 0);
36:       // A role can have several definitions (California's "platform": large online platforms and GenAI hosting platforms).
37:       const roles = [...roleCounts.entries()].map(([role, count]) => ({
38:         role,
39:         obligations: count,
40:         definition: appliesTo.filter((x) => norm(x.role) === role).map((x) => x.condition).join("\n\n") || undefined,
41:       }));
42:       const s = score?.scores.get(l.id);
43:       const byDate = new Map<string, number>();
44:       for (const o of obligations) {
45:         const d = (o.attributes?.["effective"] as string | undefined) ?? (a["effective"] as string | undefined);
46:         if (d) byDate.set(d, (byDate.get(d) ?? 0) + 1);
47:       }
48:       for (const [date, n] of byDate) timeline.push({ date, lawCode: l.code, lawId, label: l.title, obligations: n, past: date <= today });
49:       const applicability = settings?.law?.applicability[lawId] ?? null;
50:       const inScope = obligations.filter((o) => states.get(o.id)?.applicable && obligationTiming(o, today) !== "ended");
51:       const upcomingInScope = inScope.filter((o) => obligationTiming(o, today) === "upcoming");
52:       const u = score?.upcoming?.scores.get(l.id);
53:       return {
54:         id: l.id,
55:         lawId,
56:         code: l.code,
57:         title: l.title,
58:         citation: l.citation,
59:         summary: l.text,
60:         status: a["status"] as string,
61:         statusNote: a["statusNote"] as string | undefined,
62:         enacted: a["enacted"] as string | undefined,
63:         effective: a["effective"] as string | undefined,
64:         sunset: a["sunset"] as string | undefined,
65:         enforcement: a["enforcement"] as Record<string, unknown> | undefined,
66:         safeHarbors: (a["safeHarbors"] as { text: string; section: string; references?: string[]; note?: string }[] | undefined) ?? [],
67:         roles,
68:         applicability,
69:         obligations: obligations.length,
70:         inScope: inScope.length,
71:         /** In force today and in scope. */
72:         inForce: inScope.length - upcomingInScope.length,
73:         readiness: s && s.total ? s.readiness : 0,
74:         gaps: s?.gaps ?? 0,
75:         counts: s?.counts,
76:         status_: (s && s.total ? groupStatus(s) : null) as Status | null,
77:         upcoming: [...byDate.keys()].filter((d) => d > today).sort()[0] ?? null,
78:         /** In scope but not yet in effect: prepared share, not counted in today's readiness. */
79:         upcomingInScope: { total: upcomingInScope.length, readiness: u && u.total ? u.readiness : 0, next: upcomingInScope.map((o) => String(o.attributes?.["effective"])).sort()[0] ?? null },
80:       };
81:     }),
82:   }));
83:   timeline.sort((x, y) => x.date.localeCompare(y.date) || x.lawCode.localeCompare(y.lawCode));
84:   const upcoming = score?.upcoming?.overall;
85:   return {
86:     enabled,
87:     framework: index.graph.framework,
88:     /** Obligations in force today and in scope. */
89:     readiness: score?.overall.readiness ?? 0,
90:     gaps: score?.overall.gaps ?? 0,
91:     total: score?.overall.total ?? 0,
92:     upcoming: { total: upcoming?.total ?? 0, readiness: upcoming?.readiness ?? 0, gaps: upcoming?.gaps ?? 0 },
93:     obligations: index.assessable.length,
94:     laws: jurisdictions.reduce((n, j) => n + j.laws.length, 0),
95:     jurisdictions,
96:     timeline,
97:     today,
98:   };
99: }

FILE apps/server/src/services/threats.ts SHA256 c77cc9e2a0e32782edd296e5d97f69e70699d050ba486f2bb3e5fb58bcae240d
1: /**
2:  * Threat views: MITRE ATLAS, the OWASP Top 10s and NIST AI 100-2 seen through
3:  * the requirements a workspace implements.
4:  *
5:  * Threat catalogs are never assessed. A threat's coverage is derived from the
6:  * requirements that a publisher linked to it, along the published paths of
7:  * @visua/frameworks (threat-paths.ts): directly, through an ATLAS mitigation, or
8:  * through the same entry in the other OWASP LLM Top 10 edition. Every path keeps
9:  * its links, and a path is only as strong as its weakest link's status.
10:  *
11:  * Coverage weighs publications, not requirement counts: the linked requirements
12:  * are grouped by the publication that links them and, within it, by route (an ATLAS
13:  * mitigation, the other edition's entry, a group such as an AI RMF category, or the
14:  * requirement itself). Each route counts once within its publication, and each
15:  * publication counts once for the threat, however many requirements it names.
16:  */
17: import { groupStatus, LEVEL_SCALES, type MappingStatus, type RequirementNode, type RequirementState, type Status, type Workspace } from "@visua/core";
18: import { AI_100_2_ID, ATLAS_ID, FRAMEWORK_ORDER, OWASP_AGENTIC_ID, OWASP_LLM_ID, STATUS_RANK, coverageGroup, linkView, threatPaths, type FrameworkRegistry, type ThreatPath } from "@visua/frameworks";
19: import { groupOf } from "./crosswalk.ts";
20: import { NotFoundError, ValidationError, type VisuaService } from "./visua.ts";
21:
22: const MIN_STATUSES = ["final", "draft", "unreviewed"] as const;
23: export type MinStatus = (typeof MIN_STATUSES)[number];
24:
25: export function parseMinStatus(value: string | undefined): MinStatus {
26:   if (!value) return "unreviewed";
27:   if (!(MIN_STATUSES as readonly string[]).includes(value)) throw new ValidationError(`min must be one of ${MIN_STATUSES.join(", ")}`);
28:   return value as MinStatus;
29: }
30:
31: export type CoverageState = "covered" | "partial" | "open" | "out-of-scope" | "unmapped";
32:
33: /** One publication's view of a threat: its links, grouped into routes that count once each. */
34: export interface CoverageView {
35:   /** The publisher of the requirement-side links, e.g. "NIST IR 8596 (Cyber AI Profile, draft)". */
36:   publication: string;
37:   /** Weakest link status on this publication's paths. */
38:   status: MappingStatus;
39:   /** Mitigations, editions, groups or single requirements, each counted once. */
40:   routes: number;
41:   linked: number;
42:   inScope: number;
43:   met: number;
44:   /** Mean over routes of their in-scope requirements' progress toward target (null when none is in scope). */
45:   progress: number | null;
46: }
47:
48: export interface ThreatCoverage {
49:   state: CoverageState;
50:   /** THREAT_SCALE level (0–4) when any linked requirement is in scope. */
51:   level: number | null;
52:   /** Linked requirements (all frameworks), after the status filter. */
53:   linked: number;
54:   /** Linked requirements in the workspace's enabled frameworks and applicable. */
55:   inScope: number;
56:   met: number;
57:   atRisk: number;
58:   /** Mean progress over the publications that link in-scope requirements (0–1); see CoverageView. */
59:   progress: number;
60:   /** Strongest link status among the paths. */
61:   best: MappingStatus | null;
62:   /** Frameworks the linked requirements belong to. */
63:   frameworks: string[];
64:   /** Each publication's view, strongest status first. */
65:   views: CoverageView[];
66: }
67:
68: const threatGraph = (registry: FrameworkRegistry) => threatPaths(registry);
69: const view = linkView;
70:
71: /** Paths that pass the status filter. */
72: const passing = (paths: ThreatPath[], min: MinStatus) => paths.filter((p) => STATUS_RANK[p.status] >= STATUS_RANK[min]);
73:
74: interface WorkspaceSignals {
75:   enabled: Set<string>;
76:   states: Map<string, RequirementState>;
77:   statuses: Map<string, Status>;
78: }
79:
80: /** States and statuses of the workspace's enabled frameworks that threat links reach. */
81: async function signals(svc: VisuaService, ws: Workspace, frameworks: Iterable<string>): Promise<WorkspaceSignals> {
82:   const enabled = new Set(ws.frameworks.filter((f) => f.enabled).map((f) => f.frameworkId));
83:   const wanted = [...new Set(frameworks)].filter((f) => enabled.has(f));
84:   const loaded = await Promise.all(wanted.map(async (f) => [await svc.store.states.map(ws.id, f), await svc.score(ws.id, f)] as const));
85:   const states = new Map<string, RequirementState>();
86:   const statuses = new Map<string, Status>();
87:   for (const [m, score] of loaded) {
88:     for (const [id, s] of m) states.set(id, s);
89:     for (const [id, s] of score.statuses) statuses.set(id, s.status);
90:   }
91:   return { enabled, states, statuses };
92: }
93:
94: const fwOf = (id: string) => id.slice(0, id.indexOf(":"));
95: const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
96: const round = (x: number) => Math.round(x * 1000) / 1000;
97:
98: function coverageOf(byReq: Map<string, ThreatPath[]> | undefined, min: MinStatus, sig: WorkspaceSignals): ThreatCoverage {
99:   const linked: string[] = [];
100:   let best: MappingStatus | null = null;
101:   const publications = new Map<string, { status: MappingStatus; requirements: Set<string>; routes: Map<string, Set<string>> }>();
102:   for (const [reqId, paths] of byReq ?? []) {
103:     const ok = passing(paths, min);
104:     if (!ok.length) continue;
105:     linked.push(reqId);
106:     for (const p of ok) {
107:       if (!best || STATUS_RANK[p.status] > STATUS_RANK[best]) best = p.status;
108:       const { publication, route } = coverageGroup(p, reqId);
109:       const pub = publications.get(publication) ?? { status: p.status, requirements: new Set<string>(), routes: new Map<string, Set<string>>() };
110:       if (STATUS_RANK[p.status] < STATUS_RANK[pub.status]) pub.status = p.status;
111:       pub.requirements.add(reqId);
112:       pub.routes.set(route, (pub.routes.get(route) ?? new Set<string>()).add(reqId));
113:       publications.set(publication, pub);
114:     }
115:   }
116:   const frameworks = [...new Set(linked.map(fwOf))].sort((a, b) => FRAMEWORK_ORDER.indexOf(a) - FRAMEWORK_ORDER.indexOf(b));
117:   const isInScope = (id: string) => sig.enabled.has(fwOf(id)) && sig.states.has(id) && sig.states.get(id)!.applicable !== false;
118:   const progressOf = (id: string) => {
119:     const s = sig.states.get(id)!;
120:     return s.target > 0 ? Math.min(s.current / s.target, 1) : s.current > 0 ? 1 : 0;
121:   };
122:   const isMet = (id: string) => {
123:     const s = sig.states.get(id)!;
124:     return s.target > 0 && s.current >= s.target;
125:   };
126:   const inScope = linked.filter(isInScope);
127:   const views: CoverageView[] = [...publications]
128:     .map(([publication, pub]) => {
129:       const routeProgress = [...pub.routes.values()].map((reqs) => [...reqs].filter(isInScope)).filter((reqs) => reqs.length).map((reqs) => mean(reqs.map(progressOf)));
130:       const reqsInScope = [...pub.requirements].filter(isInScope);
131:       return {
132:         publication,
133:         status: pub.status,
134:         routes: pub.routes.size,
135:         linked: pub.requirements.size,
136:         inScope: reqsInScope.length,
137:         met: reqsInScope.filter(isMet).length,
138:         progress: routeProgress.length ? round(mean(routeProgress)) : null,
139:       };
140:     })
141:     .sort((a, b) => STATUS_RANK[b.status] - STATUS_RANK[a.status] || b.linked - a.linked);
142:   if (!linked.length) return { state: "unmapped", level: null, linked: 0, inScope: 0, met: 0, atRisk: 0, progress: 0, best, frameworks, views };
143:   if (!inScope.length) return { state: "out-of-scope", level: null, linked: linked.length, inScope: 0, met: 0, atRisk: 0, progress: 0, best, frameworks, views };
144:   const met = inScope.filter(isMet).length;
145:   const atRisk = inScope.filter((id) => sig.statuses.get(id) === "at-risk").length;
146:   // Each publication's view counts once (see the module comment).
147:   const progress = mean(views.filter((v) => v.progress !== null).map((v) => v.progress!));
148:   const level = met === inScope.length ? 4 : progress >= 2 / 3 ? 3 : progress >= 1 / 3 ? 2 : progress > 0 ? 1 : 0;
149:   const state: CoverageState = level === 4 ? "covered" : level === 0 ? "open" : "partial";
150:   return { state, level, linked: linked.length, inScope: inScope.length, met, atRisk, progress: round(progress), best, frameworks, views };
151: }
152:
153: function catalogIndex(svc: VisuaService, catalogId: string) {
154:   const index = svc.registry.framework(catalogId);
155:   if (!index || index.graph.framework.family !== "threat") throw new NotFoundError(`Threat catalog '${catalogId}' not found`);
156:   return index;
157: }
158:
159: const threatCatalogs = (svc: VisuaService) => svc.registry.frameworks.filter((f) => f.family === "threat");
160:
161: const leanNode = (n: RequirementNode) => {
162:   const a = n.attributes ?? {};
163:   return {
164:     id: n.id,
165:     code: n.code,
166:     kind: n.kind,
167:     parentId: n.parentId,
168:     order: n.order,
169:     title: n.title,
170:     summary: n.text.length > 240 ? `${n.text.slice(0, 237).replace(/\s+\S*$/, "")}…` : n.text,
171:     assessable: n.assessable,
172:     label: a["label"] as string | undefined,
173:     tactics: a["tactics"] as string[] | undefined,
174:     maturity: a["maturity"] as string | undefined,
175:     status: a["status"] as string | undefined,
176:     edition: a["edition"] as string | undefined,
177:     objectives: a["objectives"] as string[] | undefined,
178:     taxonomies: a["taxonomies"] as string[] | undefined,
179:     previousEdition: a["previousEdition"] as { key: string; nodeId: string } | undefined,
180:     nextEdition: a["nextEdition"] as { key: string; nodeId: string } | undefined,
181:   };
182: };
183:
184: /** Every threat catalog with coverage counts, and the link sets that feed them. */
185: export async function threatsOverview(svc: VisuaService, ws: Workspace, min: MinStatus) {
186:   const g = threatGraph(svc.registry);
187:   const catalogs = threatCatalogs(svc);
188:   const reached = new Set<string>();
189:   for (const byReq of g.forward.values()) for (const id of byReq.keys()) reached.add(fwOf(id));
190:   const sig = await signals(svc, ws, reached);
191:   const shortName = (id: string) => svc.registry.framework(id)?.graph.framework.shortName ?? id;
192:   return {
193:     minStatus: min,
194:     catalogs: catalogs.map((c) => {
195:       const index = svc.registry.framework(c.id)!;
196:       const byState: Record<CoverageState, number> = { covered: 0, partial: 0, open: 0, "out-of-scope": 0, unmapped: 0 };
197:       const linkedFrameworks = new Map<string, number>();
198:       const open: { id: string; code: string; title: string; coverage: ThreatCoverage }[] = [];
199:       for (const u of index.assessable) {
200:         const coverage = coverageOf(g.forward.get(u.id), min, sig);
201:         byState[coverage.state]++;
202:         for (const f of coverage.frameworks) linkedFrameworks.set(f, (linkedFrameworks.get(f) ?? 0) + 1);
203:         if (coverage.state === "open" || coverage.state === "partial") open.push({ id: u.id, code: u.code, title: u.title, coverage });
204:       }
205:       open.sort((a, b) => a.coverage.progress - b.coverage.progress || b.coverage.inScope - a.coverage.inScope);
206:       return {
207:         id: c.id,
208:         shortName: c.shortName,
209:         name: c.name,
210:         publisher: c.publisher,
211:         version: c.version,
212:         published: c.published,
213:         description: c.description,
214:         unitLabel: c.unitLabel,
215:         unitLabelPlural: c.unitLabelPlural,
216:         contentNotice: c.contentNotice,
217:         units: index.assessable.length,
218:         byState,
219:         linkedFrameworks: [...linkedFrameworks.entries()]
220:           .sort((a, b) => FRAMEWORK_ORDER.indexOf(a[0]) - FRAMEWORK_ORDER.indexOf(b[0]))
221:           .map(([id, threats]) => ({ id, shortName: shortName(id), enabled: sig.enabled.has(id), threats })),
222:         weakest: open.slice(0, 5),
223:       };
224:     }),
225:     sources: svc.registry.threatLinks.sets.map((s) => ({
226:       id: s.id,
227:       authority: s.authority,
228:       status: s.status ?? "final",
229:       source: { id: s.sourceFramework, shortName: shortName(s.sourceFramework) },
230:       target: { id: s.targetFramework, shortName: shortName(s.targetFramework) },
231:       links: s.mappings.length,
232:     })),
233:   };
234: }
235:
236: /** One catalog's nodes with the coverage of each. */
237: export async function threatCatalogState(svc: VisuaService, ws: Workspace, catalogId: string, min: MinStatus) {
238:   const index = catalogIndex(svc, catalogId);
239:   const g = threatGraph(svc.registry);
240:   const reached = new Set<string>();
241:   for (const n of index.graph.nodes) for (const id of g.forward.get(n.id)?.keys() ?? []) reached.add(fwOf(id));
242:   const sig = await signals(svc, ws, reached);
243:   const coverage: Record<string, ThreatCoverage> = {};
244:   for (const n of index.graph.nodes) if (n.assessable || n.kind === "mitigation") coverage[n.id] = coverageOf(g.forward.get(n.id), min, sig);
245:   const f = index.graph.framework;
246:   return {
247:     catalog: { id: f.id, shortName: f.shortName, name: f.name, publisher: f.publisher, version: f.version, published: f.published, description: f.description, levels: f.levels, unitLabel: f.unitLabel, unitLabelPlural: f.unitLabelPlural, contentNotice: f.contentNotice },
248:     minStatus: min,
249:     enabledFrameworks: [...sig.enabled],
250:     nodes: index.graph.nodes.map(leanNode),
251:     coverage,
252:   };
253: }
254:
255: /** Coverage of a group of threats (a tactic, an edition, an objective): its threats' coverage, pooled. */
256: function pooled(coverages: ThreatCoverage[]): { coverage: ThreatCoverage; byState: Record<CoverageState, number> } {
257:   const byState: Record<CoverageState, number> = { covered: 0, partial: 0, open: 0, "out-of-scope": 0, unmapped: 0 };
258:   let best: MappingStatus | null = null;
259:   const frameworks = new Set<string>();
260:   let progress = 0;
261:   let counted = 0;
262:   const sum = { linked: 0, inScope: 0, met: 0, atRisk: 0 };
263:   for (const c of coverages) {
264:     byState[c.state]++;
265:     if (c.best && (!best || STATUS_RANK[c.best] > STATUS_RANK[best])) best = c.best;
266:     for (const f of c.frameworks) frameworks.add(f);
267:     sum.linked += c.linked;
268:     sum.inScope += c.inScope;
269:     sum.met += c.met;
270:     sum.atRisk += c.atRisk;
271:     if (c.level !== null) {
272:       progress += c.progress;
273:       counted++;
274:     }
275:   }
276:   const mean = counted ? progress / counted : 0;
277:   const state: CoverageState = !counted ? (byState["out-of-scope"] ? "out-of-scope" : "unmapped") : byState.covered === counted ? "covered" : mean > 0 ? "partial" : "open";
278:   const level = !counted ? null : state === "covered" ? 4 : mean >= 2 / 3 ? 3 : mean >= 1 / 3 ? 2 : mean > 0 ? 1 : 0;
279:   return { coverage: { state, level, ...sum, progress: Math.round(mean * 1000) / 1000, best, frameworks: [...frameworks], views: [] }, byState };
280: }
281:
282: /** Inspector section for a threat node: its coverage and the requirements and threats linked to it. */
283: export async function threatDetail(svc: VisuaService, ws: Workspace, node: RequirementNode, min: MinStatus = "unreviewed") {
284:   const g = threatGraph(svc.registry);
285:   const related = svc.registry.threatLinks
286:     .of(node.id)
287:     .filter((l) => g.isThreat(l.nodeId))
288:     .map((l) => ({ ...briefOf(svc, l.nodeId), direction: l.direction, ...view(l) }));
289:   const externalRefs = (node.attributes?.["externalRefs"] as unknown[] | undefined) ?? [];
290:   // A tactic, edition or objective: pooled coverage of its threats. (An entry of the superseded
291:   // OWASP edition is not a group: it has links of its own, below.)
292:   const units = node.assessable || node.kind === "mitigation" ? [] : (ringGroups(svc.registry, node.frameworkId).find((x) => x.group.id === node.id)?.units ?? svc.registry.framework(node.frameworkId)!.assessableUnder(node.id));
293:   if (units.length) {
294:     const reached = new Set<string>();
295:     for (const u of units) for (const id of g.forward.get(u.id)?.keys() ?? []) reached.add(fwOf(id));
296:     const sig = await signals(svc, ws, reached);
297:     const { coverage, byState } = pooled(units.map((u) => coverageOf(g.forward.get(u.id), min, sig)));
298:     return { minStatus: min, coverage, group: { units: units.length, byState }, requirements: [], related, externalRefs };
299:   }
300:   const byReq = g.forward.get(node.id);
301:   const sig = await signals(svc, ws, [...(byReq?.keys() ?? [])].map(fwOf));
302:   const brief = (id: string) => briefOf(svc, id);
303:   const requirements = [...(byReq ?? new Map<string, ThreatPath[]>())]
304:     .map(([id, paths]) => {
305:       const ok = passing(paths, min);
306:       const s = sig.states.get(id);
307:       return {
308:         ...brief(id),
309:         enabled: sig.enabled.has(fwOf(id)),
310:         current: s?.current,
311:         target: s?.target,
312:         applicable: s?.applicable,
313:         status: sig.statuses.get(id) ?? null,
314:         best: ok.reduce<MappingStatus | null>((b, p) => (!b || STATUS_RANK[p.status] > STATUS_RANK[b] ? p.status : b), null),
315:         paths: ok.map((p) => ({ ...p, via: p.via ? brief(p.via) : undefined })),
316:       };
317:     })
318:     .filter((r) => r.paths.length)
319:     .sort((a, b) => STATUS_RANK[b.best!] - STATUS_RANK[a.best!] || FRAMEWORK_ORDER.indexOf(a.framework) - FRAMEWORK_ORDER.indexOf(b.framework) || a.code.localeCompare(b.code, undefined, { numeric: true }));
320:   return { minStatus: min, coverage: coverageOf(byReq, min, sig), group: null, requirements, related, externalRefs };
321: }
322:
323: /** Id, code and a readable title (CSF subcategories have no title: their text stands in). */
324: function briefOf(svc: VisuaService, id: string) {
325:   const n = svc.registry.node(id);
326:   const title = n ? (n.title && n.title !== n.code ? n.title : n.text.length > 140 ? `${n.text.slice(0, 137)}…` : n.text) : "";
327:   return { id, code: n?.code ?? id, title, kind: n?.kind ?? "", framework: fwOf(id) };
328: }
329:
330: /** Inspector section for a requirement: the threats it helps address. */
331: export function threatsAddressedBy(svc: VisuaService, nodeId: string) {
332:   const g = threatGraph(svc.registry);
333:   const byThreat = g.reverse.get(nodeId);
334:   if (!byThreat) return [];
335:   const brief = (id: string) => briefOf(svc, id);
336:   return [...byThreat]
337:     .map(([id, paths]) => {
338:       const best = paths.reduce<MappingStatus>((b, p) => (STATUS_RANK[p.status] > STATUS_RANK[b] ? p.status : b), "superseded");
339:       return { ...brief(id), best, paths: paths.map((p) => ({ ...p, via: p.via ? brief(p.via) : undefined })) };
340:     })
341:     .filter((t) => svc.registry.framework(t.framework)?.byId.get(t.id)?.assessable || t.kind === "mitigation")
342:     .sort((a, b) => FRAMEWORK_ORDER.indexOf(a.framework) - FRAMEWORK_ORDER.indexOf(b.framework) || STATUS_RANK[b.best] - STATUS_RANK[a.best] || a.code.localeCompare(b.code, undefined, { numeric: true }));
343: }
344:
345: // ---------------------------------------------------------------------------
346: // The Nexus threat ring
347: // ---------------------------------------------------------------------------
348:
349: /** Ring groups: ATLAS tactics, OWASP entries (current editions), NIST AI 100-2 objectives. */
350: function ringGroups(registry: FrameworkRegistry, catalogId: string): { group: RequirementNode; units: RequirementNode[] }[] {
351:   const index = registry.framework(catalogId);
352:   if (!index) return [];
353:   const listed = (n: RequirementNode, key: string) => ((n.attributes?.[key] as string[] | undefined) ?? []);
354:   switch (catalogId) {
355:     case ATLAS_ID: {
356:       const techniques = index.assessable;
357:       // Sub-techniques serve their parent's tactics when they list none of their own.
358:       const tacticsOf = (n: RequirementNode) => (listed(n, "tactics").length ? listed(n, "tactics") : n.parentId ? listed(index.byId.get(n.parentId)!, "tactics") : []);
359:       return index.roots().filter((r) => r.kind === "tactic").map((t) => ({ group: t, units: techniques.filter((n) => tacticsOf(n).includes(t.id)) }));
360:     }
361:     case OWASP_LLM_ID:
362:     case OWASP_AGENTIC_ID:
363:       return index.assessable.map((n) => ({ group: n, units: [n] }));
364:     case AI_100_2_ID:
365:       return index.roots().map((o) => ({ group: o, units: index.assessable.filter((a) => listed(a, "objectives").includes(o.id)) }));
366:     default:
367:       return [];
368:   }
369: }
370:
371: export async function threatRing(svc: VisuaService, ws: Workspace, min: MinStatus) {
372:   const g = threatGraph(svc.registry);
373:   const reached = new Set<string>();
374:   for (const byReq of g.forward.values()) for (const id of byReq.keys()) reached.add(fwOf(id));
375:   const sig = await signals(svc, ws, reached);
376:   const bundles = new Map<string, { a: string; b: string; count: number; best: MappingStatus }>();
377:   const catalogs = threatCatalogs(svc)
378:     .map((c) => ({
379:       id: c.id,
380:       shortName: c.shortName,
381:       groups: ringGroups(svc.registry, c.id)
382:         .filter((x) => x.units.length)
383:         .map(({ group, units }) => {
384:           const byState: Record<CoverageState, number> = { covered: 0, partial: 0, open: 0, "out-of-scope": 0, unmapped: 0 };
385:           let progress = 0;
386:           let counted = 0;
387:           for (const u of units) {
388:             const cov = coverageOf(g.forward.get(u.id), min, sig);
389:             byState[cov.state]++;
390:             if (cov.level !== null) {
391:               progress += cov.progress;
392:               counted++;
393:             }
394:             for (const [reqId, paths] of g.forward.get(u.id) ?? []) {
395:               const ok = passing(paths, min);
396:               const reqGroup = ok.length ? groupOf(svc, reqId) : null;
397:               if (!reqGroup) continue;
398:               const key = `${group.id}|${reqGroup}`;
399:               const best = ok.reduce<MappingStatus>((b, p) => (STATUS_RANK[p.status] > STATUS_RANK[b] ? p.status : b), "superseded");
400:               const bundle = bundles.get(key) ?? { a: group.id, b: reqGroup, count: 0, best };
401:               bundle.count++;
402:               if (STATUS_RANK[best] > STATUS_RANK[bundle.best]) bundle.best = best;
403:               bundles.set(key, bundle);
404:             }
405:           }
406:           const mean = counted ? progress / counted : null;
407:           const status: Status | null = mean === null ? null : byState.covered === counted ? "implemented" : mean > 0 ? "in-progress" : "not-started";
408:           // Entries show their key (LLM01:2026, ASI01); tactics and objectives their identifier.
409:           const code = group.kind === "risk" ? String(group.attributes?.["label"] ?? group.code) : group.code;
410:           return { id: group.id, code, title: group.title, units: units.length, byState, readiness: mean, status };
411:         }),
412:     }))
413:     .filter((c) => c.groups.length);
414:   return { minStatus: min, catalogs, bundles: [...bundles.values()] };
415: }
416:
417: // ---------------------------------------------------------------------------
418: // Observatory bundle: coverage in the shape of a framework state bundle
419: // ---------------------------------------------------------------------------
420:
421: const COVERAGE_STATUS: Record<CoverageState, Status> = { covered: "implemented", partial: "in-progress", open: "not-started", "out-of-scope": "not-applicable", unmapped: "not-applicable" };
422:
423: const COVERAGE_REASON: Record<CoverageState, string> = {
424:   covered: "Every linked requirement in scope is at its target",
425:   partial: "Linked requirements are partly implemented",
426:   open: "No linked requirement is implemented yet",
427:   "out-of-scope": "Linked requirements are in frameworks this workspace does not follow",
428:   unmapped: "No published link to a requirement (at this link status)",
429: };
430:
431: const emptyCounts = (): Record<Status, number> => ({ "not-started": 0, "in-progress": 0, implemented: 0, verified: 0, "at-risk": 0, "not-applicable": 0 });
432:
433: /**
434:  * A threat catalog for the 3D Observatory: each threat's height is its coverage level
435:  * (THREAT_SCALE, target 4) and its color the status its coverage corresponds to. Nothing
436:  * here is an assessment of the threat.
437:  */
438: export async function threatStateBundle(svc: VisuaService, ws: Workspace, catalogId: string, min: MinStatus = "unreviewed") {
439:   const index = catalogIndex(svc, catalogId);
440:   const g = threatGraph(svc.registry);
441:   const reached = new Set<string>();
442:   for (const n of index.assessable) for (const id of g.forward.get(n.id)?.keys() ?? []) reached.add(fwOf(id));
443:   const sig = await signals(svc, ws, reached);
444:   const units: Record<string, { current: number; target: number; priority: "medium"; applicable: boolean; status: Status; reasons: string[]; openTasks: number; evidence: number; mapped: number; coverage: ThreatCoverage }> = {};
445:   for (const n of index.assessable) {
446:     const coverage = coverageOf(g.forward.get(n.id), min, sig);
447:     const applicable = coverage.level !== null;
448:     // A linked requirement at risk is a reason, not the threat's color: one at-risk outcome would redden dozens of threats.
449:     const status: Status = COVERAGE_STATUS[coverage.state];
450:     const reasons = [COVERAGE_REASON[coverage.state], ...(coverage.inScope ? [`${coverage.met} of ${coverage.inScope} linked requirements at target`] : []), ...(coverage.atRisk ? [`${coverage.atRisk} linked requirement(s) at risk`] : [])];
451:     units[n.id] = { current: coverage.level ?? 0, target: 4, priority: "medium", applicable, status, reasons, openTasks: 0, evidence: 0, mapped: coverage.linked, coverage };
452:   }
453:   const aggregate = (nodeId: string, ids: string[]) => {
454:     const counts = emptyCounts();
455:     let progress = 0;
456:     let total = 0;
457:     let gaps = 0;
458:     let current = 0;
459:     for (const id of ids) {
460:       const u = units[id]!;
461:       counts[u.status]++;
462:       if (!u.applicable) continue;
463:       total++;
464:       progress += u.coverage.progress;
465:       current += u.current;
466:       if (u.current < u.target) gaps++;
467:     }
468:     const score = {
469:       nodeId,
470:       readiness: total ? progress / total : 0,
471:       current: total ? current / total : 0,
472:       target: total ? 4 : 0,
473:       gapScore: gaps,
474:       gaps,
475:       counts,
476:       total,
477:       evidenceCoverage: 0,
478:       verifiedShare: 0,
479:     };
480:     return { ...score, status: groupStatus(score) };
481:   };
482:   const groups: Record<string, ReturnType<typeof aggregate>> = {};
483:   for (const n of index.graph.nodes) if (!n.assessable) {
484:     const under = index.assessableUnder(n.id).map((u) => u.id);
485:     if (under.length) groups[n.id] = aggregate(n.id, under);
486:   }
487:   return {
488:     frameworkId: catalogId,
489:     overall: aggregate(catalogId, index.assessable.map((n) => n.id)),
490:     groups,
491:     units,
492:     overlay: null,
493:     threat: { minStatus: min, levels: LEVEL_SCALES.threat.levels },
494:   };
495: }

FILE apps/server/src/services/ai.ts SHA256 8d2f0ca14fb1435270b374ca5ef4692b8227cc94027b99a8d2416b387905a35e
1: /**
2:  * AI governance view for the NIST AI RMF: the AI system inventory, readiness per
3:  * function (GOVERN, MAP, MEASURE, MANAGE) and — when any inventoried system is
4:  * generative — coverage of the NIST AI 600-1 Generative AI Profile risks through
5:  * the AI RMF outcomes its actions attach to.
6:  */
7: import { groupStatus, type ProfileAction, type Status, type Workspace } from "@visua/core";
8: import { NotFoundError, type VisuaService } from "./visua.ts";
9:
10: export const AI_RMF = "nist-ai-rmf";
11:
12: export async function aiOverview(svc: VisuaService, ws: Workspace) {
13:   const index = svc.registry.framework(AI_RMF);
14:   if (!index) throw new NotFoundError("The NIST AI RMF is not ingested — run `pnpm ingest`");
15:   const settings = svc.frameworkSettings(ws, AI_RMF);
16:   const enabled = !!settings?.enabled;
17:   const systems = settings?.ai?.systems ?? [];
18:   const [score, states] = enabled ? await Promise.all([svc.score(ws.id, AI_RMF), svc.store.states.map(ws.id, AI_RMF)]) : [null, new Map()];
19:
20:   const functions = index.roots().map((f) => {
21:     const s = score?.scores.get(f.id);
22:     return {
23:       id: f.id,
24:       code: f.code,
25:       title: f.title,
26:       text: f.text,
27:       readiness: s?.readiness ?? 0,
28:       gaps: s?.gaps ?? 0,
29:       total: s?.total ?? index.assessableUnder(f.id).length,
30:       counts: s?.counts,
31:       status: s ? groupStatus(s) : ("not-started" as Status),
32:     };
33:   });
34:
35:   const generativeSystems = systems.filter((s) => s.generative && s.lifecycle !== "retired");
36:   const profile = index.graph.profiles?.find((p) => p.appliesWhen === "generative");
37:   const risks = (profile?.risks ?? []).map((risk) => {
38:     const nodes = index.assessable.filter((n) => ((n.attributes?.["profileActions"] as ProfileAction[] | undefined) ?? []).some((a) => a.profileId === profile!.id && a.risks.includes(risk.id)));
39:     const actions = nodes.reduce((sum, n) => sum + ((n.attributes?.["profileActions"] as ProfileAction[]) ?? []).filter((a) => a.profileId === profile!.id && a.risks.includes(risk.id)).length, 0);
40:     let weighted = 0;
41:     let gaps = 0;
42:     for (const n of nodes) {
43:       const st = states.get(n.id);
44:       if (!st || !st.applicable) continue;
45:       weighted += st.target > 0 ? Math.min(st.current / st.target, 1) : 0;
46:       if (st.target > st.current) gaps++;
47:     }
48:     return {
49:       id: risk.id,
50:       title: risk.title,
51:       description: risk.description,
52:       citation: risk.citation,
53:       actions,
54:       outcomes: nodes.map((n) => n.id),
55:       readiness: nodes.length ? weighted / nodes.length : 0,
56:       gaps,
57:     };
58:   });
59:
60:   return {
61:     enabled,
62:     framework: index.graph.framework,
63:     readiness: score?.overall.readiness ?? 0,
64:     gaps: score?.overall.gaps ?? 0,
65:     total: score?.overall.total ?? index.assessable.length,
66:     systems,
67:     functions,
68:     genAi: profile
69:       ? { profileId: profile.id, title: profile.title, documentId: profile.documentId, active: generativeSystems.length > 0, generativeSystems: generativeSystems.map((s) => s.name), risks }
70:       : null,
71:   };
72: }

FILE apps/server/src/services/soc2.ts SHA256 7ed653976a54affe2c0cc20114310ac3ee13627c9a421b27afd592b216549a6c
1: /**
2:  * SOC 2 system description support (AICPA DC 200). Visua drafts only facts it
3:  * can derive from the workspace record — scope, exclusions with their
4:  * rationale, controls and evidence on file, changes during the period — and
5:  * marks everything else as needing management's input. It never writes the
6:  * description for management.
7:  */
8: import { isEvidenceValid, type Workspace } from "@visua/core";
9: import { TSC_ID } from "@visua/frameworks";
10: import { NotFoundError, type VisuaService } from "./visua.ts";
11:
12: export type DescriptionStatus = "drafted" | "needs-input" | "not-applicable";
13:
14: export async function soc2Description(svc: VisuaService, ws: Workspace) {
15:   const settings = svc.frameworkSettings(ws, TSC_ID)?.soc2;
16:   const index = svc.registry.framework(TSC_ID);
17:   if (!settings || !index) throw new NotFoundError("SOC 2 is not enabled for this workspace");
18:   const [states, tasks, allEvidence, allPolicies, connectors, risks, activity] = await Promise.all([
19:     svc.store.states.list(ws.id, TSC_ID),
20:     svc.store.tasks.list(ws.id),
21:     svc.store.evidence.list(ws.id),
22:     svc.store.policies.list(ws.id),
23:     svc.store.connectors.list(ws.id),
24:     svc.store.risks.list(ws.id),
25:     svc.store.activity.list(ws.id),
26:   ]);
27:   const evidence = allEvidence.filter((e) => isEvidenceValid(e));
28:   const policies = allPolicies.filter((p) => p.status === "approved" || p.status === "published");
29:   const inCategories = index.assessable.filter((n) => settings.categories.includes(String(n.attributes?.["category"]) as never));
30:   const applicable = inCategories.filter((n) => states.find((s) => s.nodeId === n.id)?.applicable !== false);
31:   const excluded = inCategories
32:     .map((n) => ({ n, s: states.find((s) => s.nodeId === n.id) }))
33:     .filter((x) => x.s && !x.s.applicable && x.s.userExclusion);
34:   const withTasks = applicable.filter((n) => tasks.some((t) => t.requirementIds.includes(n.id))).length;
35:   const withEvidence = applicable.filter((n) => evidence.some((e) => e.requirementIds.includes(n.id))).length;
36:   const start = settings.observationStart ? new Date(settings.observationStart).getTime() : 0;
37:   const end = settings.observationEnd ? new Date(settings.observationEnd).getTime() : Date.now();
38:   const changes = activity
39:     .filter((a) => {
40:       const t = new Date(a.at).getTime();
41:       return t >= start && t <= end && ["framework", "policy", "connector"].includes(a.entity) && a.actor !== "system";
42:     });
43:
44:   const derive = (id: string): { status: DescriptionStatus; facts: string[] } => {
45:     switch (id) {
46:       case "DC1":
47:         return ws.description?.trim() ? { status: "drafted", facts: [`Workspace description: ${ws.description.trim()}`] } : { status: "needs-input", facts: [] };
48:       case "DC2":
49:         return policies.length
50:           ? { status: "needs-input", facts: [`${policies.length} approved polic${policies.length === 1 ? "y" : "ies"} state system requirements: ${policies.map((p) => p.title).slice(0, 6).join("; ")}`, "Service commitments made to customers (contracts, SLAs, public statements) must be added by management."] }
51:           : { status: "needs-input", facts: [] };
52:       case "DC3": {
53:         const facts = [
54:           connectors.length ? `Monitored components: ${connectors.map((c) => c.name).join("; ")}` : "",
55:           `People: security team of ${ws.profile.securityTeamSize}; owners assigned on ${states.filter((s) => s.owner).length} criteria`,
56:           policies.length ? `Procedures: ${policies.length} approved policies` : "",
57:           ws.profile.dataTypes.length ? `Data: ${ws.profile.dataTypes.join(", ")}` : "",
58:           `Environments: ${ws.profile.environments.join(", ")}`,
59:         ].filter(Boolean);
60:         return { status: "drafted", facts };
61:       }
62:       case "DC4": {
63:         const serious = risks.filter((r) => r.status !== "closed" && r.likelihood * r.impact >= 15);
64:         return { status: "needs-input", facts: serious.length ? serious.map((r) => `Open high risk (not necessarily an incident): ${r.title}`) : ["Visua has no incident register — management must confirm whether any system incidents occurred."] };
65:       }
66:       case "DC5":
67:         return {
68:           status: "drafted",
69:           facts: [
70:             `${applicable.length} applicable criteria across ${settings.categories.join(", ")}`,
71:             `${withTasks} have implementation work items; ${withEvidence} have accepted, current evidence`,
72:             ...(policies.length ? [`Related policies: ${policies.map((p) => p.title).slice(0, 5).join("; ")}`] : []),
73:           ],
74:         };
75:       case "DC6":
76:         return { status: "needs-input", facts: [] };
77:       case "DC7":
78:         return { status: "needs-input", facts: [] };
79:       case "DC8":
80:         return {
81:           status: "drafted",
82:           facts: excluded.length ? excluded.map((x) => `${x.n.code} not relevant — ${x.s!.userExclusion!.rationale}`) : ["No applicable criterion has been marked not relevant."],
83:         };
84:       case "DC9":
85:         if (settings.reportType !== "type2") return { status: "not-applicable", facts: ["Type 1 reports describe the system as of a date."] };
86:         return { status: "drafted", facts: changes.length ? changes.slice(0, 8).map((a) => `${a.at.slice(0, 10)} — ${a.summary}`) : ["No framework, policy or monitoring changes recorded during the period."] };
87:       default:
88:         return { status: "needs-input", facts: [] };
89:     }
90:   };
91:
92:   const doc = svc.registry.documents.get("dc200-2018-rev-ig-2022");
93:   return {
94:     source: { documentId: "dc200-2018-rev-ig-2022", title: doc?.title ?? "AICPA DC 200 — 2018 Description Criteria for a Description of a Service Organization's System in a SOC 2 Report (revised implementation guidance, 2022)", path: doc?.path },
95:     items: svc.registry.descriptionCriteria.map((d) => ({ ...d, derived: derive(d.id) })),
96:   };
97: }

FILE apps/server/src/services/crosswalk.ts SHA256 f0100c7b88088aa1486a2b99483bf29472198fc300b53be702f17721b2806acf
1: /**
2:  * Crosswalk views for the Nexus: authoritative mapping sets aggregated into
3:  * group-level bundles (CSF category ↔ SP 800-53 family, TSC series ↔ CSF
4:  * category, …) and unit-level rows with the workspace's live progress on both
5:  * sides. A mapping says two requirements are related — never that evidence for
6:  * one satisfies the other.
7:  */
8: import { codeOf, frameworkOf, groupStatus, type MappingRelationship, type Status, type Workspace } from "@visua/core";
9: import type { VisuaService } from "./visua.ts";
10:
11: /** Depth of the node level used to bundle mappings in the Nexus. */
12: const BUNDLE_DEPTH: Record<string, number> = { "nist-csf-2.0": 1, "aicpa-tsc-2017": 1 };
13:
14: export interface NexusGroup {
15:   id: string;
16:   code: string;
17:   title: string;
18:   units: number;
19:   readiness: number | null;
20:   status: Status | null;
21: }
22:
23: export interface NexusFramework {
24:   id: string;
25:   shortName: string;
26:   family: string;
27:   enabled: boolean;
28:   groups: NexusGroup[];
29: }
30:
31: export interface NexusBundle {
32:   a: string;
33:   b: string;
34:   count: number;
35:   setId: string;
36:   relationships: Partial<Record<MappingRelationship, number>>;
37: }
38:
39: export function groupOf(svc: VisuaService, nodeId: string): string | null {
40:   const fw = frameworkOf(nodeId);
41:   const index = svc.registry.framework(fw);
42:   if (!index) return null;
43:   const depth = BUNDLE_DEPTH[fw] ?? 0;
44:   const node = index.byId.get(nodeId);
45:   if (!node) return null;
46:   if (node.depth === depth) return node.id;
47:   return index.ancestors(nodeId).find((a) => a.depth === depth)?.id ?? null;
48: }
49:
50: export async function crosswalkOverview(svc: VisuaService, ws: Workspace) {
51:   const sets = svc.registry.crosswalk.sets;
52:   // Frameworks that only threat catalogs link to (the AI RMF) join the ring for the Nexus threat ring.
53:   const threatLinked = svc.registry.threatLinks.sets.flatMap((s) => [s.sourceFramework, s.targetFramework]).filter((id) => svc.registry.framework(id)?.graph.framework.family !== "threat");
54:   const ids = [...new Set([...sets.flatMap((s) => [s.sourceFramework, s.targetFramework]), ...threatLinked])].filter((id) => svc.registry.framework(id));
55:   const enabled = new Set(ws.frameworks.filter((f) => f.enabled).map((f) => f.frameworkId));
56:   const scores = await Promise.all(ids.map((id) => (enabled.has(id) ? svc.score(ws.id, id) : null)));
57:   const frameworks: NexusFramework[] = ids.map((id, i) => {
58:     const index = svc.registry.framework(id)!;
59:     const depth = BUNDLE_DEPTH[id] ?? 0;
60:     const score = scores[i];
61:     const groups = index.graph.nodes
62:       .filter((n) => n.depth === depth && !n.withdrawn)
63:       .map((n) => {
64:         const s = score?.scores.get(n.id);
65:         return { id: n.id, code: n.code, title: n.title, units: index.assessableUnder(n.id).length, readiness: s && s.total ? s.readiness : null, status: s ? groupStatus(s) : null };
66:       })
67:       .filter((g) => g.units > 0);
68:     return { id, shortName: index.graph.framework.shortName, family: index.graph.framework.family, enabled: enabled.has(id), groups };
69:   });
70:   const bundles = new Map<string, NexusBundle>();
71:   for (const set of sets) {
72:     for (const m of set.mappings) {
73:       const a = groupOf(svc, m.source);
74:       const b = groupOf(svc, m.target);
75:       if (!a || !b) continue;
76:       const key = `${set.id}|${a}|${b}`;
77:       const bundle = bundles.get(key) ?? { a, b, count: 0, setId: set.id, relationships: {} };
78:       bundle.count++;
79:       bundle.relationships[m.relationship] = (bundle.relationships[m.relationship] ?? 0) + 1;
80:       bundles.set(key, bundle);
81:     }
82:   }
83:   return {
84:     frameworks,
85:     sets: sets.map((s) => ({
86:       id: s.id,
87:       title: s.title,
88:       authority: s.authority,
89:       source: s.sourceFramework,
90:       target: s.targetFramework,
91:       count: s.mappings.length,
92:       documentId: s.mappings[0]?.origin.documentId,
93:       documentTitle: s.mappings[0] ? svc.registry.documentTitle(s.mappings[0].origin.documentId) : undefined,
94:     })),
95:     bundles: [...bundles.values()],
96:   };
97: }
98:
99: interface Side {
100:   id: string;
101:   code: string;
102:   title: string;
103:   framework: string;
104:   group: string | null;
105:   current: number | null;
106:   target: number | null;
107:   applicable: boolean | null;
108:   status: Status | null;
109: }
110:
111: export async function crosswalkRows(svc: VisuaService, ws: Workspace, opts: { setId?: string; groupId?: string; nodeId?: string; limit?: number }) {
112:   const sets = svc.registry.crosswalk.sets.filter((s) => !opts.setId || s.id === opts.setId);
113:   const enabled = new Set(ws.frameworks.filter((f) => f.enabled).map((f) => f.frameworkId));
114:   const involved = [...new Set(sets.flatMap((s) => [s.sourceFramework, s.targetFramework]))].filter((fw) => enabled.has(fw) && svc.registry.framework(fw));
115:   const loaded = await Promise.all(involved.map(async (fw) => [fw, await svc.score(ws.id, fw), await svc.store.states.map(ws.id, fw)] as const));
116:   const scores = new Map(loaded.map(([fw, score]) => [fw, score]));
117:   const states = new Map(loaded.map(([fw, , map]) => [fw, map]));
118:   const side = (id: string): Side => {
119:     const fw = frameworkOf(id);
120:     const node = svc.registry.node(id);
121:     const st = states.get(fw)?.get(id);
122:     return {
123:       id,
124:       code: node?.code ?? codeOf(id),
125:       title: node?.title || node?.text.slice(0, 120) || "",
126:       framework: fw,
127:       group: groupOf(svc, id),
128:       current: st?.current ?? null,
129:       target: st?.target ?? null,
130:       applicable: st ? st.applicable : null,
131:       status: scores.get(fw)?.statuses.get(id)?.status ?? null,
132:     };
133:   };
134:   const rows: { setId: string; authority: string; documentId: string; relationship: MappingRelationship; source: Side; target: Side }[] = [];
135:   for (const set of sets) {
136:     for (const m of set.mappings) {
137:       if (opts.nodeId && m.source !== opts.nodeId && m.target !== opts.nodeId) continue;
138:       if (opts.groupId) {
139:         const ga = groupOf(svc, m.source);
140:         const gb = groupOf(svc, m.target);
141:         if (ga !== opts.groupId && gb !== opts.groupId) continue;
142:       }
143:       rows.push({ setId: set.id, authority: m.origin.authority, documentId: m.origin.documentId, relationship: m.relationship, source: side(m.source), target: side(m.target) });
144:       if (rows.length >= (opts.limit ?? 2000)) return rows;
145:     }
146:   }
147:   return rows;
148: }

FILE apps/server/src/services/overlays.ts SHA256 4a987c7482892be3360d1e0af5407e785d630d68d97bfc8f6b8d535c280e4480
1: /**
2:  * Overlay views: how a workspace stands against a community profile (the
3:  * Cyber AI Profile's priorities per focus area) or a control overlay (COSAiS
4:  * controls in and out of scope), using the framework's own assessment.
5:  */
6: import { groupStatus, overlayPriority, type FrameworkOverlay, type Status, type Workspace } from "@visua/core";
7: import { NotFoundError, type VisuaService } from "./visua.ts";
8:
9: /** Overlay metadata without entries, for lists and headers. */
10: export const overlayMeta = (o: FrameworkOverlay) => ({
11:   id: o.id,
12:   frameworkId: o.frameworkId,
13:   kind: o.kind,
14:   title: o.title,
15:   shortName: o.shortName,
16:   identifier: o.identifier,
17:   documentId: o.documentId,
18:   status: o.status,
19:   notice: o.notice,
20:   published: o.published,
21:   landingPage: o.landingPage,
22:   lenses: o.lenses,
23:   priorityLevels: o.priorityLevels,
24:   scope: o.scope,
25:   entries: o.entries.length,
26: });
27:
28: /** Legend levels for the Observatory's overlay lens. */
29: export function overlayLevels(o: FrameworkOverlay): { level: number; label: string }[] {
30:   if (o.kind === "community-profile") return (o.priorityLevels ?? []).map((p) => ({ level: p.level, label: `${p.level} ${p.label}` }));
31:   return [
32:     { level: 1, label: "Annotated in the overlay" },
33:     { level: 2, label: "Proposed additional control" },
34:   ];
35: }
36:
37: const entryIndex = new WeakMap<FrameworkOverlay, Map<string, FrameworkOverlay["entries"][number]>>();
38:
39: /** The unit's level in the overlay's lens: a profile's priority, or a control overlay's selection. */
40: export function overlayLevelFor(o: FrameworkOverlay, nodeId: string, lenses: string[]): number | undefined {
41:   // Called for every unit of a state bundle (1,014 for SP 800-53): index the entries once per overlay.
42:   let index = entryIndex.get(o);
43:   if (!index) entryIndex.set(o, (index = new Map(o.entries.map((e) => [e.nodeId, e]))));
44:   const entry = index.get(nodeId);
45:   if (!entry) return undefined;
46:   if (o.kind === "community-profile") return overlayPriority(entry, lenses);
47:   return entry.control?.annotated || entry.control?.inSummaryTable ? 1 : 2;
48: }
49:
50: export async function overlaySummary(svc: VisuaService, ws: Workspace, overlayId: string) {
51:   const o = svc.registry.overlay(overlayId);
52:   if (!o) throw new NotFoundError(`Overlay '${overlayId}' not found`);
53:   const settings = svc.frameworkSettings(ws, o.frameworkId);
54:   const adoption = settings?.overlays?.find((a) => a.overlayId === o.id) ?? null;
55:   const enabled = !!settings?.enabled;
56:   const [score, states] = enabled ? await Promise.all([svc.score(ws.id, o.frameworkId), svc.store.states.map(ws.id, o.frameworkId)]) : [null, new Map()];
57:   const unit = (nodeId: string) => {
58:     const node = svc.registry.node(nodeId);
59:     const st = states.get(nodeId);
60:     return {
61:       nodeId,
62:       code: node?.code ?? nodeId,
63:       title: node?.title || node?.text.slice(0, 120) || "",
64:       applicable: st?.applicable ?? null,
65:       current: st?.current ?? null,
66:       target: st?.target ?? null,
67:       priority: st?.priority ?? null,
68:       status: (score?.statuses.get(nodeId)?.status ?? null) as Status | null,
69:     };
70:   };
71:   const readinessOf = (ids: string[]) => {
72:     const inScope = ids.map((id) => states.get(id)).filter((s) => s?.applicable);
73:     if (!inScope.length) return { readiness: 0, gaps: 0, inScope: 0 };
74:     const readiness = inScope.reduce((sum, s) => sum + (s!.target > 0 ? Math.min(s!.current / s!.target, 1) : 1), 0) / inScope.length;
75:     return { readiness, gaps: inScope.filter((s) => s!.target > s!.current).length, inScope: inScope.length };
76:   };
77:
78:   if (o.kind === "community-profile") {
79:     const lenses = (o.lenses ?? []).map((l) => {
80:       const byPriority = (o.priorityLevels ?? []).map((p) => {
81:         const ids = o.entries.filter((e) => e.lenses?.[l.id]?.priority === p.level).map((e) => e.nodeId);
82:         return { level: p.level, label: p.label, count: ids.length, ...readinessOf(ids) };
83:       });
84:       return { ...l, selected: adoption?.lenses?.includes(l.id) ?? false, byPriority };
85:     });
86:     const followed = adoption?.lenses ?? (o.lenses ?? []).map((l) => l.id);
87:     const high = o.entries.filter((e) => overlayPriority(e, followed) === 1);
88:     const gaps = high
89:       .map((e) => unit(e.nodeId))
90:       .filter((u) => u.applicable && u.target !== null && u.current !== null && u.target > u.current)
91:       .sort((a, b) => b.target! - b.current! - (a.target! - a.current!) || a.code.localeCompare(b.code))
92:       .slice(0, 12);
93:     const raisable = high.filter((e) => {
94:       const s = states.get(e.nodeId);
95:       return s?.applicable && s.priority !== "high" && s.priority !== "critical";
96:     }).length;
97:     return { overlay: overlayMeta(o), enabled, adoption, lenses, high: { count: high.length, ...readinessOf(high.map((e) => e.nodeId)) }, gaps, raisable };
98:   }
99:
100:   const tailoring = settings?.rmf?.tailoring ?? [];
101:   const controls = o.entries.map((e) => ({
102:     ...unit(e.nodeId),
103:     annotated: !!e.control?.annotated,
104:     proposedAdditional: !!e.control?.proposedAdditional,
105:     lifecyclePhases: e.control?.lifecyclePhases ?? [],
106:     addedByOverlay: tailoring.some((t) => t.nodeId === e.nodeId && t.source === o.id),
107:     tailoredByPerson: tailoring.find((t) => t.nodeId === e.nodeId && t.source !== o.id)?.action ?? null,
108:     citation: e.citation,
109:   }));
110:   const groups = o.frameworkId && score ? [...new Set(controls.map((c) => svc.registry.framework(o.frameworkId)?.ancestors(c.nodeId)[0]?.id).filter((x): x is string => !!x))] : [];
111:   return {
112:     overlay: overlayMeta(o),
113:     enabled,
114:     adoption,
115:     controls,
116:     ...readinessOf(controls.map((c) => c.nodeId)),
117:     families: groups.map((g) => ({ id: g, code: svc.registry.node(g)?.code ?? g, status: score?.scores.get(g) ? groupStatus(score.scores.get(g)!) : null })),
118:   };
119: }

FILE apps/server/src/connectors/index.ts SHA256 84796a4aef733278a340cfd3984eb4ca2d89d848ae808bef7e896ad8b9f13881
1: /**
2:  * Monitoring connectors produce check results that become evidence and feed
3:  * requirement status. Each check declares the requirements it evidences in
4:  * every framework Visua models, so one run updates CSF, SOC 2 and SP 800-53.
5:  */
6: import type { CheckOutcome } from "@visua/core";
7: import { repoScanConnector } from "./repo-scan.ts";
8: import { webPostureConnector } from "./web-posture.ts";
9:
10: export interface RequirementRefs {
11:   csf?: string[];
12:   soc2?: string[];
13:   sp80053?: string[];
14: }
15:
16: export interface CheckOutput {
17:   checkId: string;
18:   title: string;
19:   outcome: CheckOutcome;
20:   detail: string;
21:   observed: Record<string, unknown>;
22:   requirements: RequirementRefs;
23: }
24:
25: export interface ConnectorKind {
26:   kind: string;
27:   name: string;
28:   description: string;
29:   configFields: { key: string; label: string; placeholder: string; required: boolean }[];
30:   run(config: Record<string, unknown>, signal?: AbortSignal): Promise<CheckOutput[]>;
31: }
32:
33: export const CONNECTOR_KINDS: ConnectorKind[] = [webPostureConnector, repoScanConnector];
34:
35: export function connectorKind(kind: string): ConnectorKind | undefined {
36:   return CONNECTOR_KINDS.find((k) => k.kind === kind);
37: }
38:
39: export const FRAMEWORK_OF_REF: Record<keyof RequirementRefs, string> = {
40:   csf: "nist-csf-2.0",
41:   soc2: "aicpa-tsc-2017",
42:   sp80053: "nist-sp-800-53-r5",
43: };

FILE apps/server/src/connectors/repo-scan.ts SHA256 08a0137a4891fb85ca3be39a52c4f8567b87016102a07077bc19615d11aed08b
1: /**
2:  * Repository Hygiene connector — scans a local source repository for secure
3:  * software development signals: disclosure policy, code ownership, CI,
4:  * automated dependency updates, lockfiles and committed secrets.
5:  */
6: import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
7: import { join, relative, resolve } from "node:path";
8: import type { CheckOutput, ConnectorKind } from "./index.ts";
9:
10: const SKIP_DIRS = new Set(["node_modules", ".git", "dist", "build", "coverage", ".venv", "venv", "__pycache__", "corpus", ".next", "target"]);
11: const SECRET_PATTERNS: [string, RegExp][] = [
12:   ["AWS access key id", /\bAKIA[0-9A-Z]{16}\b/],
13:   ["Private key block", /-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/],
14:   ["GitHub token", /\bgh[pousr]_[A-Za-z0-9]{36,}\b/],
15:   ["Slack token", /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/],
16:   ["Anthropic API key", /\bsk-ant-[A-Za-z0-9_-]{20,}\b/],
17:   ["Stripe live key", /\bsk_live_[A-Za-z0-9]{20,}\b/],
18: ];
19: const TEXT_EXT = /\.(ts|tsx|js|jsx|mjs|cjs|json|ya?ml|toml|env|ini|cfg|conf|py|rb|go|java|kt|cs|php|sh|tf|md|txt|properties|xml)$/i;
20:
21: function walk(root: string, limit = 4000): string[] {
22:   const out: string[] = [];
23:   const stack = [root];
24:   while (stack.length && out.length < limit) {
25:     const dir = stack.pop()!;
26:     let entries: string[];
27:     try {
28:       entries = readdirSync(dir);
29:     } catch {
30:       continue;
31:     }
32:     for (const name of entries) {
33:       if (SKIP_DIRS.has(name)) continue;
34:       const full = join(dir, name);
35:       let st;
36:       try {
37:         st = statSync(full);
38:       } catch {
39:         continue;
40:       }
41:       if (st.isDirectory()) stack.push(full);
42:       else if (st.size < 512_000) out.push(full);
43:       if (out.length >= limit) break;
44:     }
45:   }
46:   return out;
47: }
48:
49: const any = (root: string, paths: string[]) => paths.find((p) => existsSync(join(root, p)));
50:
51: export const repoScanConnector: ConnectorKind = {
52:   kind: "repo-scan",
53:   name: "Repository Hygiene",
54:   description: "Scans a local source repository for secure development practices: SECURITY.md, CODEOWNERS, CI, dependency automation, lockfiles and committed secrets.",
55:   configFields: [{ key: "path", label: "Repository path on the Visua server", placeholder: "/srv/repos/app", required: true }],
56:   async run(config) {
57:     const root = resolve(String(config["path"] ?? "."));
58:     if (!existsSync(root) || !statSync(root).isDirectory()) {
59:       return [
60:         {
61:           checkId: "repo-exists",
62:           title: "Repository is accessible",
63:           outcome: "error",
64:           detail: `Path not found or not a directory: ${root}`,
65:           observed: { root },
66:           requirements: {},
67:         },
68:       ];
69:     }
70:     const out: CheckOutput[] = [];
71:     const disclosure = any(root, ["SECURITY.md", ".github/SECURITY.md", "docs/SECURITY.md"]);
72:     out.push({
73:       checkId: "security-policy",
74:       title: "Vulnerability disclosure policy (SECURITY.md)",
75:       outcome: disclosure ? "pass" : "warn",
76:       detail: disclosure ? `Found ${disclosure}` : "No SECURITY.md — add a disclosure policy so researchers know how to report issues",
77:       observed: { file: disclosure ?? null },
78:       requirements: { csf: ["ID.RA-08"], soc2: ["CC2.3"], sp80053: ["RA-5(11)"] },
79:     });
80:     const owners = any(root, ["CODEOWNERS", ".github/CODEOWNERS", "docs/CODEOWNERS"]);
81:     out.push({
82:       checkId: "code-owners",
83:       title: "Code ownership and review routing (CODEOWNERS)",
84:       outcome: owners ? "pass" : "warn",
85:       detail: owners ? `Found ${owners}` : "No CODEOWNERS file — changes may merge without an accountable reviewer",
86:       observed: { file: owners ?? null },
87:       requirements: { csf: ["PR.PS-06"], soc2: ["CC8.1"], sp80053: ["CM-3"] },
88:     });
89:     const workflowsDir = join(root, ".github", "workflows");
90:     const workflows = existsSync(workflowsDir) ? readdirSync(workflowsDir).filter((f) => /\.ya?ml$/.test(f)) : [];
91:     const otherCi = any(root, [".gitlab-ci.yml", "azure-pipelines.yml", ".circleci/config.yml", "Jenkinsfile", "bitbucket-pipelines.yml"]);
92:     out.push({
93:       checkId: "ci-pipeline",
94:       title: "Automated build and test pipeline",
95:       outcome: workflows.length || otherCi ? "pass" : "fail",
96:       detail: workflows.length ? `${workflows.length} GitHub Actions workflow(s): ${workflows.join(", ")}` : otherCi ? `Found ${otherCi}` : "No CI configuration found",
97:       observed: { workflows, otherCi: otherCi ?? null },
98:       requirements: { csf: ["PR.PS-06"], soc2: ["CC8.1"], sp80053: ["SA-11"] },
99:     });
100:     const depBot = any(root, [".github/dependabot.yml", ".github/dependabot.yaml", "renovate.json", ".github/renovate.json", "renovate.json5"]);
101:     out.push({
102:       checkId: "dependency-updates",
103:       title: "Automated dependency vulnerability updates",
104:       outcome: depBot ? "pass" : "warn",
105:       detail: depBot ? `Found ${depBot}` : "No Dependabot/Renovate configuration — vulnerable dependencies may go unpatched",
106:       observed: { file: depBot ?? null },
107:       requirements: { csf: ["ID.RA-01", "PR.PS-02"], soc2: ["CC7.1"], sp80053: ["RA-5", "SI-2"] },
108:     });
109:     const lock = any(root, ["pnpm-lock.yaml", "package-lock.json", "yarn.lock", "poetry.lock", "Pipfile.lock", "go.sum", "Cargo.lock", "Gemfile.lock", "composer.lock"]);
110:     out.push({
111:       checkId: "lockfile",
112:       title: "Dependency versions are pinned (lockfile)",
113:       outcome: lock ? "pass" : "warn",
114:       detail: lock ? `Found ${lock}` : "No lockfile — builds may pull unreviewed dependency versions",
115:       observed: { file: lock ?? null },
116:       requirements: { csf: ["PR.PS-06"], soc2: ["CC8.1"], sp80053: ["SA-10"] },
117:     });
118:     const findings: { file: string; kind: string }[] = [];
119:     for (const file of walk(root)) {
120:       if (!TEXT_EXT.test(file) && !/\.env/.test(file)) continue;
121:       let content: string;
122:       try {
123:         content = readFileSync(file, "utf8");
124:       } catch {
125:         continue;
126:       }
127:       for (const [kind, re] of SECRET_PATTERNS) {
128:         if (re.test(content)) findings.push({ file: relative(root, file), kind });
129:       }
130:       if (findings.length > 20) break;
131:     }
132:     out.push({
133:       checkId: "secrets",
134:       title: "No credentials committed to the repository",
135:       outcome: findings.length ? "fail" : "pass",
136:       detail: findings.length ? `${findings.length} potential secret(s): ${findings.slice(0, 5).map((f) => `${f.kind} in ${f.file}`).join("; ")}` : "No high-confidence secret patterns found",
137:       observed: { findings: findings.slice(0, 20) },
138:       requirements: { csf: ["PR.AA-01", "PR.DS-01"], soc2: ["CC6.1"], sp80053: ["IA-5"] },
139:     });
140:     return out;
141:   },
142: };

FILE apps/server/src/connectors/web-posture.ts SHA256 0d25c1bcd7b44c9d367cdd87eb7b0a52823fb57ebeac71c91312c1a98acfb148
1: /**
2:  * Web Security Posture connector — credential-free, real checks against a
3:  * public endpoint: HTTPS, HTTP→HTTPS redirect, HSTS, TLS certificate and
4:  * protocol, browser security headers and a vulnerability disclosure contact.
5:  */
6: import { connect } from "node:tls";
7: import type { CheckOutput, ConnectorKind } from "./index.ts";
8:
9: const TRANSIT = { csf: ["PR.DS-02"], soc2: ["CC6.7"], sp80053: ["SC-8", "SC-8(1)"] };
10:
11: function normalizeUrl(raw: string): URL {
12:   const withScheme = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
13:   const url = new URL(withScheme);
14:   url.protocol = "https:";
15:   return url;
16: }
17:
18: async function fetchWithTimeout(url: string, init: RequestInit = {}, ms = 12_000): Promise<Response> {
19:   return fetch(url, { ...init, signal: AbortSignal.timeout(ms), headers: { "user-agent": "Visua-Posture-Check/1.0", ...(init.headers ?? {}) } });
20: }
21:
22: function tlsDetails(host: string, port = 443, ms = 10_000): Promise<{ validTo: Date; protocol: string | null; issuer: string; subject: string }> {
23:   return new Promise((resolve, reject) => {
24:     const socket = connect({ host, port, servername: host, timeout: ms }, () => {
25:       const cert = socket.getPeerCertificate();
26:       const protocol = socket.getProtocol();
27:       socket.end();
28:       if (!cert || !cert.valid_to) return reject(new Error("No certificate presented"));
29:       resolve({
30:         validTo: new Date(cert.valid_to),
31:         protocol,
32:         issuer: String(cert.issuer?.O ?? cert.issuer?.CN ?? "unknown"),
33:         subject: String(cert.subject?.CN ?? host),
34:       });
35:     });
36:     socket.on("timeout", () => {
37:       socket.destroy();
38:       reject(new Error("TLS handshake timed out"));
39:     });
40:     socket.on("error", reject);
41:   });
42: }
43:
44: export const webPostureConnector: ConnectorKind = {
45:   kind: "web-posture",
46:   name: "Web Security Posture",
47:   description: "Checks a public web endpoint for HTTPS, HSTS, TLS certificate health, security headers and a security.txt disclosure contact.",
48:   configFields: [{ key: "url", label: "Public URL", placeholder: "https://example.com", required: true }],
49:   async run(config) {
50:     const url = normalizeUrl(String(config["url"] ?? ""));
51:     const out: CheckOutput[] = [];
52:     let response: Response | undefined;
53:
54:     try {
55:       response = await fetchWithTimeout(url.toString(), { redirect: "follow" });
56:       out.push({
57:         checkId: "https-reachable",
58:         title: "Service is served over HTTPS",
59:         outcome: response.status < 500 ? "pass" : "fail",
60:         detail: `GET ${url.origin} returned HTTP ${response.status}`,
61:         observed: { status: response.status, finalUrl: response.url },
62:         requirements: TRANSIT,
63:       });
64:     } catch (err) {
65:       out.push({
66:         checkId: "https-reachable",
67:         title: "Service is served over HTTPS",
68:         outcome: "fail",
69:         detail: `HTTPS request failed: ${(err as Error).message}`,
70:         observed: {},
71:         requirements: TRANSIT,
72:       });
73:     }
74:
75:     try {
76:       const http = await fetchWithTimeout(`http://${url.host}/`, { redirect: "manual" });
77:       const location = http.headers.get("location") ?? "";
78:       const redirects = [301, 302, 307, 308].includes(http.status) && location.startsWith("https://");
79:       out.push({
80:         checkId: "http-redirect",
81:         title: "Plain HTTP redirects to HTTPS",
82:         outcome: redirects ? "pass" : http.status < 400 ? "fail" : "warn",
83:         detail: redirects ? `HTTP ${http.status} → ${location}` : `HTTP responded ${http.status} without redirecting to HTTPS`,
84:         observed: { status: http.status, location },
85:         requirements: TRANSIT,
86:       });
87:     } catch (err) {
88:       out.push({
89:         checkId: "http-redirect",
90:         title: "Plain HTTP redirects to HTTPS",
91:         outcome: "warn",
92:         detail: `Port 80 not reachable (${(err as Error).message}) — acceptable if HTTP is disabled`,
93:         observed: {},
94:         requirements: TRANSIT,
95:       });
96:     }
97:
98:     if (response) {
99:       const hsts = response.headers.get("strict-transport-security");
100:       const maxAge = Number(/max-age=(\d+)/i.exec(hsts ?? "")?.[1] ?? 0);
101:       out.push({
102:         checkId: "hsts",
103:         title: "HTTP Strict Transport Security is enforced",
104:         outcome: hsts ? (maxAge >= 15_552_000 ? "pass" : "warn") : "fail",
105:         detail: hsts ? `strict-transport-security: ${hsts}` : "No Strict-Transport-Security header",
106:         observed: { header: hsts, maxAge },
107:         requirements: TRANSIT,
108:       });
109:
110:       const headers = {
111:         "content-security-policy": response.headers.get("content-security-policy"),
112:         "x-content-type-options": response.headers.get("x-content-type-options"),
113:         "x-frame-options": response.headers.get("x-frame-options"),
114:         "referrer-policy": response.headers.get("referrer-policy"),
115:       };
116:       const present = Object.entries(headers).filter(([k, v]) => v || (k === "x-frame-options" && /frame-ancestors/i.test(headers["content-security-policy"] ?? "")));
117:       out.push({
118:         checkId: "security-headers",
119:         title: "Browser security headers are configured",
120:         outcome: present.length >= 3 ? "pass" : present.length >= 1 ? "warn" : "fail",
121:         detail: `${present.length}/4 recommended headers present: ${present.map(([k]) => k).join(", ") || "none"}`,
122:         observed: headers,
123:         requirements: { csf: ["PR.PS-01"], soc2: ["CC6.6"], sp80053: ["CM-6"] },
124:       });
125:     }
126:
127:     try {
128:       const tls = await tlsDetails(url.hostname, Number(url.port || 443));
129:       const days = Math.floor((tls.validTo.getTime() - Date.now()) / 86_400_000);
130:       const modern = tls.protocol === "TLSv1.3" || tls.protocol === "TLSv1.2";
131:       out.push({
132:         checkId: "tls-certificate",
133:         title: "TLS certificate is valid and protocol is modern",
134:         outcome: days >= 30 && modern ? "pass" : days >= 7 && modern ? "warn" : "fail",
135:         detail: `${tls.protocol ?? "unknown protocol"}; certificate for ${tls.subject} issued by ${tls.issuer} expires in ${days} day(s)`,
136:         observed: { protocol: tls.protocol, validTo: tls.validTo.toISOString(), daysRemaining: days, issuer: tls.issuer },
137:         requirements: { csf: ["PR.DS-02"], soc2: ["CC6.7"], sp80053: ["SC-8(1)", "SC-13"] },
138:       });
139:     } catch (err) {
140:       out.push({
141:         checkId: "tls-certificate",
142:         title: "TLS certificate is valid and protocol is modern",
143:         outcome: "warn",
144:         detail: `Could not inspect the TLS handshake directly (${(err as Error).message}); HTTPS reachability is checked separately`,
145:         observed: {},
146:         requirements: { csf: ["PR.DS-02"], soc2: ["CC6.7"], sp80053: ["SC-8(1)", "SC-13"] },
147:       });
148:     }
149:
150:     try {
151:       const res = await fetchWithTimeout(`${url.origin}/.well-known/security.txt`, { redirect: "follow" });
152:       const body = res.ok ? await res.text() : "";
153:       const ok = res.ok && /^contact:/im.test(body);
154:       out.push({
155:         checkId: "security-txt",
156:         title: "Vulnerability disclosure contact is published (security.txt)",
157:         outcome: ok ? "pass" : "warn",
158:         detail: ok ? "security.txt with Contact field found" : `security.txt not found (HTTP ${res.status})`,
159:         observed: { status: res.status },
160:         requirements: { csf: ["ID.RA-08"], soc2: ["CC2.3"], sp80053: ["RA-5(11)"] },
161:       });
162:     } catch (err) {
163:       out.push({
164:         checkId: "security-txt",
165:         title: "Vulnerability disclosure contact is published (security.txt)",
166:         outcome: "warn",
167:         detail: `Could not fetch security.txt (${(err as Error).message})`,
168:         observed: {},
169:         requirements: { csf: ["ID.RA-08"], soc2: ["CC2.3"], sp80053: ["RA-5(11)"] },
170:       });
171:     }
172:     return out;
173:   },
174: };

FILE apps/server/src/app.ts SHA256 31abeaf5d381a0a8b3533e3183159d692bb5cb7f87bf1498d4d602d0dd8936ca
1: /**
2:  * Visua HTTP API (Hono). JSON everywhere, SSE for live events, strict input
3:  * validation with Zod, and a local file route that serves the official
4:  * corpus so every citation opens the source PDF at the right page.
5:  */
6: import { createHash } from "node:crypto";
7: import { createReadStream, existsSync, realpathSync, statSync } from "node:fs";
8: import { extname, isAbsolute, relative, resolve, sep } from "node:path";
9: import { Readable } from "node:stream";
10: import { Hono, type Context } from "hono";
11: import { compress } from "hono/compress";
12: import { etag } from "hono/etag";
13: import { streamSSE } from "hono/streaming";
14: import { z } from "zod";
15: import {
16:   EXAMPLE_INFORMATION_TYPES,
17:   LEVEL_SCALES,
18:   PROFILE_DATA_TYPES,
19:   PROFILE_DRIVERS,
20:   PROFILE_ENVIRONMENTS,
21:   PROFILE_INDUSTRIES,
22:   PROFILE_SIZES,
23:   TIER_DIMENSIONS,
24:   TIER_NAMES,
25:   TIER_SOURCE,
26:   ROLE_CAPABILITIES,
27:   recommend,
28:   type AgentKind,
29:   type Workspace,
30: } from "@visua/core";
31: import { AGENTS, claudeEnabled, configuredModel } from "@visua/agents";
32: import { CORPUS_DIR } from "@visua/frameworks";
33: import { loadAuthConfig } from "./auth/config.ts";
34: import { actorOf, authenticate, authRoutes, csrfProtection, limitParam, need, principalOf, requireCapability, requireSignIn, securityHeaders, workspaceAccess, type AppEnv } from "./auth/http.ts";
35: import { AuthService, ForbiddenError, UnauthorizedError } from "./auth/service.ts";
36: import { CONNECTOR_KINDS } from "./connectors/index.ts";
37: import { actionPlanCsv, aiRmfProfileCsv, csfProfileCsv, evidenceIndexCsv, oscalPoam, oscalSsp, readinessMarkdown, soc2PbcCsv } from "./services/exports.ts";
38: import { aiOverview } from "./services/ai.ts";
39: import { lawsOverview } from "./services/laws.ts";
40: import { parseMinStatus, threatCatalogState, threatRing, threatsOverview } from "./services/threats.ts";
41: import { overlayMeta, overlaySummary } from "./services/overlays.ts";
42: import { crosswalkOverview, crosswalkRows } from "./services/crosswalk.ts";
43: import { soc2Description } from "./services/soc2.ts";
44: import { frameworkState, leanGraph, nodeDetail, workspaceSummary } from "./services/views.ts";
45: import { NotFoundError, ValidationError, type VisuaService } from "./services/visua.ts";
46:
47: const Level = z.number().int().min(0).max(4);
48: const Priority = z.enum(["critical", "high", "medium", "low"]);
49: const ImpactLevel = z.enum(["low", "moderate", "high"]);
50: const AgentKindSchema = z.enum(["copilot", "assessor", "planner", "policy-author", "evidence-collector", "crosswalk-analyst", "auditor-prep", "task-executor"]);
51: const TaskStatus = z.enum(["backlog", "todo", "in-progress", "in-review", "done", "blocked"]);
52: const TaskKind = z.enum(["governance", "policy", "procedure", "technical", "evidence", "training", "assessment", "vendor", "monitoring"]);
53:
54: const ProfileSchema = z.object({
55:   industry: z.enum(PROFILE_INDUSTRIES),
56:   size: z.enum(PROFILE_SIZES),
57:   dataTypes: z.array(z.enum(PROFILE_DATA_TYPES)).default([]),
58:   drivers: z.array(z.enum(PROFILE_DRIVERS)).default([]),
59:   environments: z.array(z.enum(PROFILE_ENVIRONMENTS)).default(["cloud"]),
60:   maturityTier: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]).default(1),
61:   guidance: z.enum(["guided", "expert"]).default("guided"),
62:   securityTeamSize: z.number().int().min(0).max(10_000).default(1),
63: });
64:
65: const AiSystemSchema = z.object({
66:   name: z.string().min(1).max(160),
67:   purpose: z.string().min(1).max(2000),
68:   role: z.enum(["developer", "deployer", "developer-deployer"]).optional(),
69:   lifecycle: z.enum(["plan-design", "collect-process-data", "build-use-model", "verify-validate", "deploy-use", "operate-monitor", "retired"]).optional(),
70:   generative: z.boolean().optional(),
71:   provider: z.string().max(200).optional(),
72:   riskTier: z.enum(["low", "moderate", "high"]).optional(),
73:   owner: z.string().max(120).optional(),
74:   dataTypes: z.array(z.enum(PROFILE_DATA_TYPES)).optional(),
75:   humanOversight: z.string().max(2000).optional(),
76: });
77:
78: const InfoTypeSchema = z.object({ id: z.string().min(1), name: z.string().min(1), confidentiality: ImpactLevel, integrity: ImpactLevel, availability: ImpactLevel });
79:
80: const Schemas = {
81:   createWorkspace: z.object({
82:     name: z.string().min(1).max(120),
83:     description: z.string().max(2000).optional(),
84:     profile: ProfileSchema,
85:     frameworks: z.array(z.string()).optional(),
86:     soc2: z
87:       .object({
88:         categories: z.array(z.enum(["security", "availability", "processing-integrity", "confidentiality", "privacy"])).optional(),
89:         reportType: z.enum(["type1", "type2"]).optional(),
90:         observationStart: z.string().optional(),
91:         observationEnd: z.string().optional(),
92:         auditFirm: z.string().optional(),
93:       })
94:       .optional(),
95:     planInitialTasks: z.boolean().optional(),
96:   }),
97:   updateWorkspace: z.object({
98:     name: z.string().min(1).max(120).optional(),
99:     description: z.string().max(2000).optional(),
100:     profile: ProfileSchema.partial().optional(),
101:     autonomy: z.record(z.string(), z.boolean()).optional(),
102:     trustCenter: z
103:       .object({ enabled: z.boolean(), headline: z.string().max(200), contactEmail: z.string().max(200), frameworks: z.record(z.string().max(80), z.boolean()) })
104:       .partial()
105:       .optional(),
106:   }),
107:   enableFramework: z.object({
108:     enabled: z.boolean().optional(),
109:     defaultTarget: Level.optional(),
110:     soc2: z
111:       .object({
112:         categories: z.array(z.enum(["security", "availability", "processing-integrity", "confidentiality", "privacy"])),
113:         reportType: z.enum(["type1", "type2"]),
114:         observationStart: z.string().optional(),
115:         observationEnd: z.string().optional(),
116:         auditFirm: z.string().optional(),
117:       })
118:       .partial()
119:       .optional(),
120:   }),
121:   updateState: z.object({
122:     current: Level.optional(),
123:     target: Level.optional(),
124:     priority: Priority.optional(),
125:     applicable: z.boolean().optional(),
126:     applicabilityRationale: z.string().max(2000).optional(),
127:     owner: z.string().max(200).optional(),
128:     notes: z.string().max(10_000).optional(),
129:     verifiedAt: z.string().nullable().optional(),
130:     statusOverride: z.enum(["not-started", "in-progress", "implemented", "verified", "at-risk", "not-applicable"]).nullable().optional(),
131:   }),
132:   createTask: z.object({
133:     title: z.string().min(1).max(200),
134:     description: z.string().max(20_000).optional(),
135:     kind: TaskKind.optional(),
136:     status: TaskStatus.optional(),
137:     priority: Priority.optional(),
138:     requirementIds: z.array(z.string()).optional(),
139:     dueDate: z.string().optional(),
140:     startDate: z.string().optional(),
141:     effortHours: z.number().min(0).max(10_000).optional(),
142:     checklist: z.array(z.object({ text: z.string().min(1), done: z.boolean().optional() })).optional(),
143:     assignee: z.object({ type: z.enum(["person", "agent"]), id: z.string(), name: z.string() }).optional(),
144:   }),
145:   updateTask: z.object({
146:     title: z.string().min(1).max(200).optional(),
147:     description: z.string().max(20_000).optional(),
148:     kind: TaskKind.optional(),
149:     status: TaskStatus.optional(),
150:     priority: Priority.optional(),
151:     requirementIds: z.array(z.string()).optional(),
152:     dueDate: z.string().nullable().optional(),
153:     startDate: z.string().nullable().optional(),
154:     effortHours: z.number().min(0).max(10_000).optional(),
155:     checklist: z.array(z.object({ id: z.string(), text: z.string(), done: z.boolean() })).optional(),
156:     assignee: z.object({ type: z.enum(["person", "agent"]), id: z.string(), name: z.string() }).nullable().optional(),
157:   }),
158:   createEvidence: z.object({
159:     title: z.string().min(1).max(300),
160:     description: z.string().max(10_000).optional(),
161:     kind: z.enum(["document", "screenshot", "configuration", "log", "attestation", "automated-check", "policy", "report"]).optional(),
162:     requirementIds: z.array(z.string()).min(1),
163:     content: z.string().max(2_000_000).optional(),
164:     fileName: z.string().max(300).optional(),
165:     validUntil: z.string().optional(),
166:   }),
167:   updateEvidence: z.object({
168:     decision: z.enum(["accepted", "rejected"]).optional(),
169:     note: z.string().max(2000).optional(),
170:     title: z.string().max(300).optional(),
171:     requirementIds: z.array(z.string()).optional(),
172:     validUntil: z.string().optional(),
173:   }),
174:   createPolicy: z.object({ title: z.string().min(1).max(200), body: z.string().min(1).max(500_000), requirementIds: z.array(z.string()).optional(), owner: z.string().optional() }),
175:   updatePolicy: z.object({
176:     title: z.string().min(1).max(200).optional(),
177:     body: z.string().max(500_000).optional(),
178:     status: z.enum(["draft", "in-review", "approved", "published", "retired"]).optional(),
179:     owner: z.string().optional(),
180:     requirementIds: z.array(z.string()).optional(),
181:   }),
182:   risk: z.object({
183:     id: z.string().optional(),
184:     title: z.string().min(1).max(200),
185:     description: z.string().max(10_000).optional(),
186:     likelihood: z.number().int().min(1).max(5).optional(),
187:     impact: z.number().int().min(1).max(5).optional(),
188:     treatment: z.enum(["mitigate", "accept", "transfer", "avoid"]).optional(),
189:     status: z.enum(["open", "treating", "accepted", "closed"]).optional(),
190:     requirementIds: z.array(z.string()).optional(),
191:     owner: z.string().optional(),
192:   }),
193:   connector: z.object({ kind: z.string(), name: z.string().max(120).optional(), config: z.record(z.string(), z.unknown()) }),
194:   run: z.object({ agent: AgentKindSchema, goal: z.string().max(4000).default(""), input: z.record(z.string(), z.unknown()).optional() }),
195:   decision: z.object({ decision: z.enum(["approved", "rejected"]), edits: z.record(z.string(), z.unknown()).optional() }),
196:   plan: z.object({ framework: z.string().default("nist-csf-2.0"), maxTasks: z.number().int().min(1).max(200).default(15) }),
197:   tiers: z.object({ answers: z.record(z.string(), z.number().int().min(1).max(4)) }),
198:   categorize: z.object({
199:     systemName: z.string().max(200).optional(),
200:     systemDescription: z.string().max(4000).optional(),
201:     informationTypes: z.array(InfoTypeSchema).min(1),
202:     privacyBaseline: z.boolean().optional(),
203:   }),
204:   tailor: z.object({ nodeId: z.string(), action: z.enum(["add", "remove", "reset"]), rationale: z.string().max(2000).default("") }),
205:   authorize: z.object({
206:     decision: z.enum(["ato", "iatt", "dato", "pending"]),
207:     authorizingOfficial: z.string().max(200).optional(),
208:     expiresAt: z.string().optional(),
209:     rationale: z.string().max(4000).optional(),
210:   }),
211: };
212:
213: async function body<T extends z.ZodType>(c: Context, schema: T): Promise<z.infer<T>> {
214:   let json: unknown;
215:   try {
216:     json = await c.req.json();
217:   } catch {
218:     throw new ValidationError("Request body must be JSON");
219:   }
220:   const parsed = schema.safeParse(json);
221:   if (!parsed.success) throw new ValidationError(z.prettifyError(parsed.error));
222:   return parsed.data;
223: }
224:
225: const MIME: Record<string, string> = {
226:   ".pdf": "application/pdf",
227:   ".json": "application/json",
228:   ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
229:   ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
230:   ".md": "text/markdown; charset=utf-8",
231:   ".html": "text/html; charset=utf-8",
232:   ".htm": "text/html; charset=utf-8",
233: };
234:
235: /** Inside the corpus and outside every non-redistributable `.local/` folder (in any letter case). */
236: const servable = (path: string) => !!path && !path.startsWith("..") && !isAbsolute(path) && !path.split(sep).some((p) => p.toLowerCase() === ".local");
237:
238: export function createApp(svc: VisuaService, auth: AuthService = new AuthService(svc, loadAuthConfig())): Hono<AppEnv> {
239:   const app = new Hono<AppEnv>();
240:
241:   app.onError((err, c) => {
242:     if (err instanceof NotFoundError) return c.json({ error: err.message }, 404);
243:     if (err instanceof ValidationError) return c.json({ error: err.message }, 400);
244:     if (err instanceof UnauthorizedError) return c.json({ error: err.message }, 401);
245:     if (err instanceof ForbiddenError) return c.json({ error: err.message }, 403);
246:     console.error("[visua] unhandled error", err);
247:     return c.json({ error: "Internal error" }, 500);
248:   });
249:
250:   // ---------------------------------------------------------------- transfer
251:   // Compress JSON, JavaScript and CSS (the SP 800-53 state bundle: 518 KB → 16 KB). Sign-in
252:   // responses carry the CSRF token and are left alone (no compression oracle on a secret);
253:   // hono/compress never touches server-sent events.
254:   const compressed = compress();
255:   app.use("*", (c, next) => (c.req.path.startsWith("/api/auth/") ? next() : compressed(c, next)));
256:   // Framework graphs and metadata change only with a deploy: revalidate them by ETag.
257:   app.use("/api/meta", etag({ weak: true }));
258:   app.use("/api/frameworks/*", etag({ weak: true }));
259:
260:   // ---------------------------------------------------------------- security & identity
261:   app.use("*", securityHeaders(auth));
262:   app.use("*", authenticate(auth));
263:   app.use("/api/*", requireSignIn());
264:   app.use("/api/*", csrfProtection(auth));
265:   authRoutes(app, auth);
266:
267:   // ---------------------------------------------------------------- meta
268:   app.get("/api/health", (c) => c.json({ ok: true, frameworks: svc.registry.indexes.size, corpusChunks: svc.registry.search.size }));
269:
270:   app.get("/api/meta", (c) =>
271:     c.json({
272:       product: { name: "Visua", version: "0.1.0" },
273:       frameworks: svc.registry.frameworks.map((f) => ({ ...f, units: svc.registry.framework(f.id)!.assessable.length })),
274:       levelScales: LEVEL_SCALES,
275:       tiers: { names: TIER_NAMES, dimensions: TIER_DIMENSIONS, source: TIER_SOURCE },
276:       agents: Object.values(AGENTS).map((a) => ({ kind: a.kind, name: a.name, tagline: a.tagline, tools: a.tools })),
277:       connectorKinds: CONNECTOR_KINDS.map((k) => ({ kind: k.kind, name: k.name, description: k.description, configFields: k.configFields })),
278:       ai: { mode: claudeEnabled() ? "claude" : "offline", model: claudeEnabled() ? configuredModel() : null },
279:       corpus: svc.registry.manifests.map((m) => ({ framework: m.framework, title: m.title, retrieved: m.retrieved, documents: m.documents.length })),
280:       crosswalk: svc.registry.crosswalk.sets.map((s) => ({ id: s.id, title: s.title, authority: s.authority, count: s.mappings.length })),
281:       overlays: svc.registry.overlays.map(overlayMeta),
282:       exampleInformationTypes: EXAMPLE_INFORMATION_TYPES,
283:     }),
284:   );
285:
286:   app.post("/api/recommend", async (c) => c.json(recommend(await body(c, ProfileSchema))));
287:
288:   // ---------------------------------------------------------------- frameworks & corpus
289:   app.get("/api/frameworks/:id", (c) => {
290:     const index = svc.registry.framework(c.req.param("id"));
291:     if (!index) throw new NotFoundError(`Framework '${c.req.param("id")}' not found`);
292:     c.header("Cache-Control", "private, max-age=300");
293:     return c.json(leanGraph(index.graph));
294:   });
295:
296:   app.get("/api/overlays/:id", (c) => {
297:     const overlay = svc.registry.overlay(c.req.param("id"));
298:     if (!overlay) throw new NotFoundError("Overlay not found");
299:     c.header("Cache-Control", "private, max-age=300");
300:     return c.json(overlay);
301:   });
302:
303:   app.get("/api/frameworks/:id/nodes/:code", (c) => {
304:     const index = svc.registry.framework(c.req.param("id"));
305:     const node = index?.get(decodeURIComponent(c.req.param("code")));
306:     if (!node) throw new NotFoundError("Requirement not found");
307:     return c.json(node);
308:   });
309:
310:   app.get("/api/search", (c) => {
311:     const q = c.req.query("q") ?? "";
312:     const framework = c.req.query("framework");
313:     const nodes = [];
314:     for (const index of svc.registry.indexes.values()) {
315:       if (framework && index.id !== framework) continue;
316:       for (const n of index.search(q, 8)) nodes.push({ id: n.id, code: n.code, title: n.title, text: n.text.slice(0, 200), framework: n.frameworkId, kind: n.kind });
317:     }
318:     const passages = svc.registry.search.search(q, { limit: 6 }).map((h) => ({
319:       documentId: h.chunk.documentId,
320:       documentTitle: h.chunk.documentTitle,
321:       page: h.chunk.page,
322:       locator: h.chunk.locator,
323:       quote: h.quote,
324:       score: h.score,
325:     }));
326:     return c.json({ nodes: nodes.slice(0, 20), passages });
327:   });
328:
329:   app.get("/api/corpus", (c) =>
330:     c.json(
331:       svc.registry.manifests.map((m) => ({
332:         ...m,
333:         // AICPA documents are © AICPA and only present where the installation holds its own copy.
334:         restricted: m.framework === "aicpa-soc2",
335:         documents: m.documents.map((d) => ({ ...d, present: existsSync(resolve(CORPUS_DIR, d.path)) })),
336:       })),
337:     ),
338:   );
339:
340:   app.get("/api/corpus/file/*", (c) => {
341:     const rel = decodeURIComponent(c.req.path.replace(/^\/api\/corpus\/file\//, ""));
342:     const full = resolve(CORPUS_DIR, rel);
343:     // Only files inside the corpus, never the non-redistributable `.local/` folders, and no symlink out of it.
344:     if (!servable(relative(CORPUS_DIR, full))) throw new ValidationError("Invalid corpus path");
345:     if (!existsSync(full) || !statSync(full).isFile()) throw new NotFoundError("Corpus file not found");
346:     if (!servable(relative(realpathSync(CORPUS_DIR), realpathSync(full)))) throw new ValidationError("Invalid corpus path");
347:     const type = MIME[extname(full).toLowerCase()] ?? "application/octet-stream";
348:     const stream = Readable.toWeb(createReadStream(full)) as ReadableStream;
349:     return new Response(stream, {
350:       headers: {
351:         "content-type": type,
352:         "content-length": String(statSync(full).size),
353:         "cache-control": "private, max-age=86400",
354:         // Official web pages (statutes published as HTML) load their publisher's scripts: render them
355:         // sandboxed, so nothing they contain runs with Visua's origin.
356:         ...(type.startsWith("text/html") ? { "content-security-policy": "sandbox" } : {}),
357:       },
358:     });
359:   });
360:
361:   // ---------------------------------------------------------------- workspaces
362:   const summary = async (c: Context<AppEnv>, ws: Workspace) => {
363:     const role = c.get("role") ?? (await auth.roleIn(c.get("principal"), ws.tenantId));
364:     return { ...(await workspaceSummary(svc, ws)), access: role ? { role, capabilities: ROLE_CAPABILITIES[role] } : null };
365:   };
366:
367:   app.get("/api/workspaces", async (c) => {
368:     const active = await auth.activeTenant(principalOf(c));
369:     if (!active) return c.json([]);
370:     const list = await svc.store.workspaces.list(active.tenant.id);
371:     return c.json(await Promise.all(list.map(async (ws) => ({ ...(await workspaceSummary(svc, ws)), access: { role: active.role, capabilities: ROLE_CAPABILITIES[active.role] } }))));
372:   });
373:
374:   app.post("/api/workspaces", async (c) => {
375:     const active = await auth.activeTenant(principalOf(c));
376:     if (!active) throw new ForbiddenError("Join or create an organization first");
377:     c.set("role", active.role);
378:     requireCapability(c, "workspace.configure");
379:     const input = await body(c, Schemas.createWorkspace);
380:     const ws = await svc.createWorkspace({ ...input, tenantId: active.tenant.id }, actorOf(c));
381:     return c.json(await summary(c, ws), 201);
382:   });
383:
384:   // Every /api/workspaces/:ws route: the workspace's organization must be one the principal can access.
385:   app.use("/api/workspaces/:ws", workspaceAccess(auth));
386:   app.use("/api/workspaces/:ws/*", workspaceAccess(auth));
387:   const wsOf = (c: Context<AppEnv>) => c.get("workspace");
388:   const wsId = (c: Context<AppEnv>) => c.get("workspace").id;
389:
390:   app.get("/api/workspaces/:ws", async (c) => c.json(await summary(c, wsOf(c))));
391:
392:   app.patch("/api/workspaces/:ws", need("workspace.configure"), async (c) => {
393:     const input = await body(c, Schemas.updateWorkspace);
394:     const ws = await svc.updateWorkspace(wsId(c), input as never, actorOf(c));
395:     return c.json(await summary(c, ws));
396:   });
397:
398:   app.delete("/api/workspaces/:ws", need("workspace.configure"), async (c) => {
399:     await svc.deleteWorkspace(wsId(c), actorOf(c));
400:     return c.json({ ok: true });
401:   });
402:
403:   app.get("/api/workspaces/:ws/recommendation", async (c) => c.json(recommend(wsOf(c).profile)));
404:
405:   app.put("/api/workspaces/:ws/frameworks/:fw", need("workspace.configure"), async (c) => {
406:     const input = await body(c, Schemas.enableFramework);
407:     const ws = await svc.enableFramework(wsId(c), c.req.param("fw"), input as never, actorOf(c));
408:     return c.json(await summary(c, ws));
409:   });
410:
411:   app.get("/api/workspaces/:ws/frameworks/:fw/state", async (c) => {
412:     if (!svc.registry.framework(c.req.param("fw"))) throw new NotFoundError("Framework not found");
413:     return c.json(await frameworkState(svc, wsOf(c), c.req.param("fw"), { minStatus: parseMinStatus(c.req.query("min")) }));
414:   });
415:
416:   app.get("/api/workspaces/:ws/requirements/:nodeId", async (c) => {
417:     const node = svc.registry.node(decodeURIComponent(c.req.param("nodeId")));
418:     if (!node) throw new NotFoundError("Requirement not found");
419:     return c.json(await nodeDetail(svc, wsOf(c), node, { minStatus: parseMinStatus(c.req.query("min")) }));
420:   });
421:
422:   app.patch("/api/workspaces/:ws/requirements/:nodeId", async (c) => {
423:     const input = await body(c, Schemas.updateState);
424:     // Scope (not applicable), verification and status overrides are review decisions, like tailoring and accepting evidence.
425:     if (input.applicable !== undefined || input.verifiedAt !== undefined || input.statusOverride !== undefined) requireCapability(c, "work.approve");
426:     return c.json(await svc.updateState(wsId(c), decodeURIComponent(c.req.param("nodeId")), input as never, actorOf(c)));
427:   });
428:
429:   app.post("/api/workspaces/:ws/tiers", async (c) => {
430:     const input = await body(c, Schemas.tiers);
431:     return c.json(await summary(c, await svc.recordTierAssessment(wsId(c), input.answers, actorOf(c))));
432:   });
433:
434:   // ---------------------------------------------------------------- RMF
435:   app.post("/api/workspaces/:ws/rmf/categorize", need("work.approve"), async (c) => {
436:     const input = await body(c, Schemas.categorize);
437:     return c.json(await summary(c, await svc.categorizeSystem(wsId(c), input, actorOf(c))));
438:   });
439:   app.post("/api/workspaces/:ws/rmf/tailor", need("work.approve"), async (c) => {
440:     const input = await body(c, Schemas.tailor);
441:     return c.json(await summary(c, await svc.tailorControl(wsId(c), input.nodeId, input.action, input.rationale, actorOf(c))));
442:   });
443:   app.post("/api/workspaces/:ws/rmf/authorize", need("work.approve"), async (c) => {
444:     const input = await body(c, Schemas.authorize);
445:     return c.json(await summary(c, await svc.setAuthorization(wsId(c), input, actorOf(c))));
446:   });
447:
448:   // ---------------------------------------------------------------- overlays (Cyber AI Profile, COSAiS)
449:   app.get("/api/workspaces/:ws/overlays/:id", async (c) => c.json(await overlaySummary(svc, wsOf(c), c.req.param("id"))));
450:   app.put("/api/workspaces/:ws/overlays/:id", need("workspace.configure"), async (c) => {
451:     const input = await body(c, z.object({ lenses: z.array(z.string().max(40)).max(10).optional() }));
452:     await svc.adoptOverlay(wsId(c), c.req.param("id"), input, actorOf(c));
453:     return c.json(await overlaySummary(svc, await svc.workspace(wsId(c)), c.req.param("id")));
454:   });
455:   app.delete("/api/workspaces/:ws/overlays/:id", need("workspace.configure"), async (c) => {
456:     await svc.dropOverlay(wsId(c), c.req.param("id"), actorOf(c));
457:     return c.json(await overlaySummary(svc, await svc.workspace(wsId(c)), c.req.param("id")));
458:   });
459:   app.post("/api/workspaces/:ws/overlays/:id/apply-priorities", need("work.approve"), async (c) => {
460:     const result = await svc.applyOverlayPriorities(wsId(c), c.req.param("id"), actorOf(c));
461:     return c.json({ ...result, summary: await overlaySummary(svc, await svc.workspace(wsId(c)), c.req.param("id")) });
462:   });
463:
464:   // ---------------------------------------------------------------- Threat views (MITRE ATLAS, OWASP, NIST AI 100-2)
465:   app.get("/api/workspaces/:ws/threats", async (c) => c.json(await threatsOverview(svc, wsOf(c), parseMinStatus(c.req.query("min")))));
466:   app.get("/api/workspaces/:ws/threats/:catalog", async (c) => c.json(await threatCatalogState(svc, wsOf(c), c.req.param("catalog"), parseMinStatus(c.req.query("min")))));
467:
468:   // ---------------------------------------------------------------- U.S. state AI laws
469:   app.get("/api/workspaces/:ws/laws", async (c) => c.json(await lawsOverview(svc, wsOf(c))));
470:   // Whether a law applies, and in which role, is a compliance decision: approvers and above.
471:   app.put("/api/workspaces/:ws/laws/:lawId/applicability", need("work.approve"), async (c) => {
472:     const input = await body(c, z.object({ roles: z.array(z.string().max(60)).max(20), note: z.string().max(2000).optional() }));
473:     await svc.setLawApplicability(wsId(c), c.req.param("lawId"), input, actorOf(c));
474:     return c.json(await lawsOverview(svc, await svc.workspace(wsId(c))));
475:   });
476:
477:   // ---------------------------------------------------------------- AI governance
478:   app.get("/api/workspaces/:ws/ai", async (c) => c.json(await aiOverview(svc, wsOf(c))));
479:   app.post("/api/workspaces/:ws/ai/systems", async (c) => {
480:     const input = await body(c, AiSystemSchema);
481:     return c.json(await svc.upsertAiSystem(wsId(c), input, actorOf(c)), 201);
482:   });
483:   app.patch("/api/workspaces/:ws/ai/systems/:id", async (c) => {
484:     const input = await body(c, AiSystemSchema.partial());
485:     return c.json(await svc.upsertAiSystem(wsId(c), { ...input, id: c.req.param("id") }, actorOf(c)));
486:   });
487:   app.delete("/api/workspaces/:ws/ai/systems/:id", async (c) => {
488:     await svc.removeAiSystem(wsId(c), c.req.param("id"), actorOf(c));
489:     return c.body(null, 204);
490:   });
491:
492:   // ---------------------------------------------------------------- tasks
493:   app.get("/api/workspaces/:ws/tasks", async (c) => c.json(await svc.store.tasks.list(wsId(c))));
494:   app.post("/api/workspaces/:ws/tasks", async (c) => {
495:     const input = await body(c, Schemas.createTask);
496:     const checklist = input.checklist?.map((i) => ({ id: "", text: i.text, done: !!i.done }));
497:     return c.json(await svc.createTask(wsId(c), { ...input, checklist } as never, actorOf(c)), 201);
498:   });
499:   app.patch("/api/workspaces/:ws/tasks/:id", async (c) => {
500:     const input = await body(c, Schemas.updateTask);
501:     const clean = Object.fromEntries(Object.entries(input).map(([k, v]) => [k, v === null ? undefined : v]));
502:     return c.json(await svc.updateTask(wsId(c), c.req.param("id"), clean as never, actorOf(c)));
503:   });
504:   app.delete("/api/workspaces/:ws/tasks/:id", async (c) => {
505:     await svc.deleteTask(wsId(c), c.req.param("id"), actorOf(c));
506:     return c.json({ ok: true });
507:   });
508:   app.post("/api/workspaces/:ws/plan", async (c) => {
509:     const input = await body(c, Schemas.plan);
510:     return c.json(await svc.planWith(wsId(c), input.framework, input.maxTasks, actorOf(c)), 201);
511:   });
512:
513:   // ---------------------------------------------------------------- evidence
514:   app.get("/api/workspaces/:ws/evidence", async (c) => c.json(await svc.store.evidence.list(wsId(c))));
515:   app.post("/api/workspaces/:ws/evidence", async (c) => {
516:     const input = await body(c, Schemas.createEvidence);
517:     const sha256 = input.content ? createHash("sha256").update(input.content).digest("hex") : undefined;
518:     return c.json(await svc.createEvidence(wsId(c), { ...input, source: "upload", sha256 }, actorOf(c)), 201);
519:   });
520:   app.patch("/api/workspaces/:ws/evidence/:id", async (c) => {
521:     const input = await body(c, Schemas.updateEvidence);
522:     if (input.decision) {
523:       // Accepting or rejecting evidence is a review decision.
524:       requireCapability(c, "work.approve");
525:       return c.json(await svc.reviewEvidence(wsId(c), c.req.param("id"), input.decision, actorOf(c), input.note));
526:     }
527:     return c.json(await svc.updateEvidence(wsId(c), c.req.param("id"), { title: input.title, requirementIds: input.requirementIds, validUntil: input.validUntil } as never, actorOf(c)));
528:   });
529:
530:   // ---------------------------------------------------------------- policies & risks
531:   app.get("/api/workspaces/:ws/policies", async (c) => c.json(await svc.store.policies.list(wsId(c))));
532:   app.post("/api/workspaces/:ws/policies", async (c) => {
533:     const input = await body(c, Schemas.createPolicy);
534:     return c.json(await svc.createPolicy(wsId(c), input, actorOf(c)), 201);
535:   });
536:   app.patch("/api/workspaces/:ws/policies/:id", async (c) => {
537:     const input = await body(c, Schemas.updatePolicy);
538:     // Approving, publishing or retiring a policy is a management decision.
539:     if (input.status === "approved" || input.status === "published" || input.status === "retired") requireCapability(c, "work.approve");
540:     return c.json(await svc.updatePolicy(wsId(c), c.req.param("id"), input, actorOf(c)));
541:   });
542:   app.get("/api/workspaces/:ws/risks", async (c) => c.json(await svc.store.risks.list(wsId(c))));
543:   app.post("/api/workspaces/:ws/risks", async (c) => {
544:     const input = await body(c, Schemas.risk);
545:     return c.json(await svc.upsertRisk(wsId(c), input as never, actorOf(c)), 201);
546:   });
547:
548:   // ---------------------------------------------------------------- connectors
549:   app.get("/api/workspaces/:ws/connectors", async (c) => c.json(await svc.store.connectors.list(wsId(c))));
550:   // Connectors reach systems and paths from the server, so configuring them is an admin action.
551:   app.post("/api/workspaces/:ws/connectors", need("workspace.configure"), async (c) => {
552:     const input = await body(c, Schemas.connector);
553:     return c.json(await svc.createConnector(wsId(c), input, actorOf(c)), 201);
554:   });
555:   app.post("/api/workspaces/:ws/connectors/:id/run", async (c) => c.json(await svc.runConnector(wsId(c), c.req.param("id"), actorOf(c))));
556:   app.get("/api/workspaces/:ws/checks", async (c) => c.json(await svc.store.checks.recent(wsId(c), 200)));
557:
558:   // ---------------------------------------------------------------- agents
559:   app.get("/api/workspaces/:ws/runs", async (c) =>
560:     c.json((await svc.store.runs.recent(wsId(c), limitParam(c.req.query("limit"), 50, 500))).map((r) => ({ ...r, steps: undefined, stepCount: r.steps.length }))),
561:   );
562:   app.post("/api/workspaces/:ws/runs", async (c) => {
563:     const input = await body(c, Schemas.run);
564:     const run = await svc.startRun(wsId(c), { agent: input.agent as AgentKind, goal: input.goal, input: input.input }, actorOf(c));
565:     if (c.req.query("wait") === "1") {
566:       const done = await svc.waitForRun(run.id);
567:       return c.json({ ...done, proposals: (await svc.store.proposals.list(done.workspaceId)).filter((p) => p.runId === done.id) }, 201);
568:     }
569:     return c.json(run, 202);
570:   });
571:   app.get("/api/workspaces/:ws/runs/:id", async (c) => {
572:     const run = await svc.store.runs.get(c.req.param("id"));
573:     if (!run || run.workspaceId !== wsId(c)) throw new NotFoundError("Run not found");
574:     const proposals = (await svc.store.proposals.list(run.workspaceId)).filter((p) => p.runId === run.id);
575:     return c.json({ ...run, proposals });
576:   });
577:   app.post("/api/workspaces/:ws/runs/:id/cancel", async (c) => c.json(await svc.cancelRun(wsId(c), c.req.param("id"), actorOf(c))));
578:   app.post("/api/workspaces/:ws/runs/:id/approve-all", need("work.approve"), async (c) => {
579:     const pending = (await svc.store.proposals.list(wsId(c))).filter((p) => p.runId === c.req.param("id") && p.status === "pending");
580:     const decided = [];
581:     for (const p of pending) decided.push(await svc.decideProposal(wsId(c), p.id, "approved", actorOf(c)));
582:     return c.json(decided);
583:   });
584:   app.get("/api/workspaces/:ws/proposals", async (c) => {
585:     const status = c.req.query("status");
586:     return c.json((await svc.store.proposals.list(wsId(c))).filter((p) => !status || p.status === status));
587:   });
588:   app.post("/api/workspaces/:ws/proposals/:id/decision", need("work.approve"), async (c) => {
589:     const input = await body(c, Schemas.decision);
590:     return c.json(await svc.decideProposal(wsId(c), c.req.param("id"), input.decision, actorOf(c), input.edits));
591:   });
592:
593:   // ---------------------------------------------------------------- crosswalk, SOC 2 description, activity & events
594:   app.get("/api/workspaces/:ws/crosswalk", async (c) => c.json(await crosswalkOverview(svc, wsOf(c))));
595:   // The Nexus inner ring: threat catalogs bundled onto the requirement groups linked to them.
596:   app.get("/api/workspaces/:ws/crosswalk/threats", async (c) => c.json(await threatRing(svc, wsOf(c), parseMinStatus(c.req.query("min")))));
597:   app.get("/api/workspaces/:ws/crosswalk/rows", async (c) =>
598:     c.json(
599:       await crosswalkRows(svc, wsOf(c), {
600:         setId: c.req.query("set") || undefined,
601:         groupId: c.req.query("group") || undefined,
602:         nodeId: c.req.query("node") || undefined,
603:         limit: c.req.query("limit") ? limitParam(c.req.query("limit"), 500, 5000) : undefined,
604:       }),
605:     ),
606:   );
607:   app.get("/api/workspaces/:ws/soc2/description", async (c) => c.json(await soc2Description(svc, wsOf(c))));
608:
609:   app.get("/api/workspaces/:ws/activity", async (c) => c.json(await svc.store.activity.recent(wsId(c), limitParam(c.req.query("limit"), 100, 1000))));
610:   app.get("/api/workspaces/:ws/activity/verify", async (c) => c.json(await svc.verifyAuditTrail(wsId(c))));
611:
612:   app.get("/api/workspaces/:ws/events", async (c) => {
613:     const ws = wsOf(c);
614:     return streamSSE(c, async (stream) => {
615:       const queue: string[] = [];
616:       let wake: (() => void) | undefined;
617:       const unsubscribe = svc.bus.subscribe(ws.id, (event) => {
618:         queue.push(JSON.stringify(event));
619:         wake?.();
620:       });
621:       let open = true;
622:       stream.onAbort(() => {
623:         open = false;
624:         unsubscribe();
625:         wake?.();
626:       });
627:       await stream.writeSSE({ event: "ready", data: JSON.stringify({ workspaceId: ws.id }) });
628:       while (open) {
629:         while (queue.length) {
630:           const data = queue.shift()!;
631:           await stream.writeSSE({ event: "visua", data });
632:         }
633:         // Wake on the next event, or after 15 s for a keep-alive ping (one timer at a time).
634:         await new Promise<void>((r) => {
635:           const timer = setTimeout(r, 15_000);
636:           wake = () => {
637:             clearTimeout(timer);
638:             r();
639:           };
640:         });
641:         wake = undefined;
642:         if (open && !queue.length) await stream.writeSSE({ event: "ping", data: String(Date.now()) });
643:       }
644:     });
645:   });
646:
647:   // ---------------------------------------------------------------- exports & trust
648:   app.get("/api/workspaces/:ws/exports/:kind", need("workspace.export"), async (c) => {
649:     const ws = wsOf(c);
650:     const kind = c.req.param("kind");
651:     const file = (content: string, type: string, name: string) =>
652:       new Response(content, { headers: { "content-type": type, "content-disposition": `attachment; filename="${ws.slug}-${name}"` } });
653:     switch (kind) {
654:       case "csf-profile.csv":
655:         return file(await csfProfileCsv(svc, ws), "text/csv; charset=utf-8", "csf-2.0-organizational-profile.csv");
656:       case "action-plan.csv":
657:         return file(await actionPlanCsv(svc, ws), "text/csv; charset=utf-8", "action-plan.csv");
658:       case "evidence-index.csv":
659:         return file(await evidenceIndexCsv(svc, ws), "text/csv; charset=utf-8", "evidence-index.csv");
660:       case "ai-rmf-profile.csv":
661:         return file(await aiRmfProfileCsv(svc, ws), "text/csv; charset=utf-8", "nist-ai-rmf-profile.csv");
662:       case "soc2-pbc.csv":
663:         return file(await soc2PbcCsv(svc, ws), "text/csv; charset=utf-8", "soc2-pbc-request-list.csv");
664:       case "readiness.md":
665:         return file(await readinessMarkdown(svc, ws), "text/markdown; charset=utf-8", "readiness-report.md");
666:       case "oscal-ssp.json":
667:         return file(JSON.stringify(await oscalSsp(svc, ws), null, 2), "application/json", "oscal-ssp.json");
668:       case "oscal-poam.json":
669:         return file(JSON.stringify(await oscalPoam(svc, ws), null, 2), "application/json", "oscal-poam.json");
670:       default:
671:         throw new NotFoundError(`Unknown export '${kind}'`);
672:     }
673:   });
674:
675:   app.get("/api/trust/:slug", async (c) => {
676:     const ws = await svc.store.workspaces.get(c.req.param("slug"));
677:     if (!ws || ws.slug !== c.req.param("slug") || !ws.trustCenter.enabled) throw new NotFoundError("Trust center not found");
678:     const [summary, checks] = await Promise.all([workspaceSummary(svc, ws), svc.store.checks.recent(ws.id, 100)]);
679:     return c.json({
680:       name: ws.name,
681:       headline: ws.trustCenter.headline ?? `${ws.name} security & compliance`,
682:       contactEmail: ws.trustCenter.contactEmail,
683:       // Only the frameworks the workspace publishes (state AI laws stay private unless chosen).
684:       frameworks: summary.frameworks.filter((f) => f.onTrustCenter).map((f) => ({ id: f.id, name: f.shortName, readiness: Math.round(f.readiness * 100), evidenceCoverage: Math.round(f.evidenceCoverage * 100) })),
685:       policies: summary.policies.filter((p) => p.status === "approved" || p.status === "published").map((p) => ({ title: p.title, version: p.version })),
686:       monitoring: checks
687:         .filter((ch, i, all) => all.findIndex((x) => x.checkId === ch.checkId) === i)
688:         .map((ch) => ({ title: ch.title, outcome: ch.outcome, observedAt: ch.observedAt })),
689:       updatedAt: ws.updatedAt,
690:     });
691:   });
692:
693:   return app;
694: }
