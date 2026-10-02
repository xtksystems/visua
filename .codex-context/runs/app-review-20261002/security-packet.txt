Independent full-application review: Visua
Run: app-review-20261002; node: security; integration owner: Codex.
Source: /Users/artem/visua, branch feat/light-workspace-design, commit 1dc5ed126dced52c364b403dd29f9ce62829b4da.
User request: commit/push all changes, review the full Visua app using Opus 5.5, and plan the next development phase.
Your bounded lens: Review API/authentication/tenancy, transactional integrity, event relays, connectors/egress, and local/production operation. Trace concrete unauthorized access, concurrency, restart, and failure cases. Recommend the next development phase from this platform lens.

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

FILE apps/server/src/auth/config.ts SHA256 0a14dc33a7a03a86cae0452c355c17eba586db957bc44f80d17da9685d747048
1: /**
2:  * Authentication settings, from the environment.
3:  *
4:  *   VISUA_AUTH_MODE             dev | oidc (default: oidc when NODE_ENV=production, else dev)
5:  *   VISUA_PUBLIC_URL            external base URL, e.g. https://visua.example.com (OIDC redirects, secure cookies)
6:  *   VISUA_SECRET                server secret (≥ 32 chars) that seals SSO client secrets at rest
7:  *   VISUA_OIDC_ISSUER           platform identity provider (optional): issuer URL
8:  *   VISUA_OIDC_CLIENT_ID        … client id
9:  *   VISUA_OIDC_CLIENT_SECRET    … client secret (omit for a public client; PKCE is always used)
10:  *   VISUA_OIDC_NAME             … button label (default "Single sign-on")
11:  *   VISUA_OIDC_ALLOW_HTTP=1     allow http:// issuers (local test IdPs only)
12:  *   VISUA_OIDC_PRIVATE_ISSUERS  hosts an organization's SSO connection may reach on a private address
13:  *                               (comma-separated names or IPs, e.g. keycloak.internal; "*" for any)
14:  *   VISUA_OIDC_TRUST_EMAIL=1    the platform IdP verifies every email it asserts, even without an email_verified claim
15:  *   VISUA_SSO_DOMAIN_VERIFICATION  dns (default): an SSO connection's email domains route sign-ins only once
16:  *                               proven by a DNS TXT record; off: trusted as claimed (single-organization installs)
17:  *   VISUA_SSO_DOMAIN_RECHECK_HOURS  how often a domain proven by DNS is looked up again (default 24; at least 1:
18:  *                               a smaller positive value counts as 1; 0 = never)
19:  *   VISUA_SSO_DOMAIN_RECHECK_GRACE_DAYS  how long its record may be missing before the domain lapses (default 7)
20:  *   VISUA_BOOTSTRAP_OWNER_EMAIL first owner, pre-provisioned when no organization has one
21:  *   VISUA_BOOTSTRAP_ORG_NAME    name of the organization created for that owner
22:  *   VISUA_SESSION_HOURS         absolute session lifetime (default 12)
23:  *   VISUA_SESSION_IDLE_MINUTES  idle timeout (default 120)
24:  */
25: export type AuthMode = "dev" | "oidc";
26:
27: export interface PlatformIdp {
28:   issuer: string;
29:   clientId: string;
30:   clientSecret?: string;
31:   name: string;
32: }
33:
34: export interface AuthConfig {
35:   mode: AuthMode;
36:   publicUrl: string;
37:   secureCookies: boolean;
38:   secret: string;
39:   secretIsDefault: boolean;
40:   platform?: PlatformIdp;
41:   allowHttpIssuers: boolean;
42:   /** Hosts organizations' identity providers may use on private addresses (see egress.ts). */
43:   privateIssuerHosts: string[];
44:   /** The platform IdP's email claim is verified even when it sends no email_verified claim. */
45:   trustPlatformEmail: boolean;
46:   /** How SSO connections' email domains are proven: a DNS TXT record, or not at all. */
47:   ssoDomainVerification: "dns" | "off";
48:   /** Hours between re-checks of a DNS-proven SSO domain; 0 turns re-checking off. */
49:   domainRecheckHours: number;
50:   /** Days a domain's record may be missing before the domain lapses. */
51:   domainRecheckGraceDays: number;
52:   bootstrapOwnerEmail?: string;
53:   bootstrapOrgName: string;
54:   sessionHours: number;
55:   sessionIdleMinutes: number;
56: }
57:
58: const DEV_SECRET = "visua-development-secret-do-not-use-in-production";
59:
60: export function loadAuthConfig(env: NodeJS.ProcessEnv = process.env): AuthConfig {
61:   const production = env["NODE_ENV"] === "production";
62:   const mode: AuthMode = env["VISUA_AUTH_MODE"] === "dev" ? "dev" : env["VISUA_AUTH_MODE"] === "oidc" || production ? "oidc" : "dev";
63:   if (production && mode === "dev") throw new Error("VISUA_AUTH_MODE=dev is refused when NODE_ENV=production: developer sign-in has no password.");
64:   const publicUrl = (env["VISUA_PUBLIC_URL"] ?? `http://localhost:${env["VISUA_PORT"] ?? 8787}`).replace(/\/+$/, "");
65:   const secret = env["VISUA_SECRET"] ?? "";
66:   if (mode === "oidc" && secret && secret.length < 32) throw new Error("VISUA_SECRET must be at least 32 characters.");
67:   const issuer = env["VISUA_OIDC_ISSUER"]?.trim();
68:   const clientId = env["VISUA_OIDC_CLIENT_ID"]?.trim();
69:   const number = (key: string, fallback: number) => {
70:     const v = Number(env[key]);
71:     return Number.isFinite(v) && v > 0 ? v : fallback;
72:   };
73:   const hoursRaw = (env["VISUA_SSO_DOMAIN_RECHECK_HOURS"] ?? "").trim();
74:   const hours = Number(hoursRaw);
75:   return {
76:     mode,
77:     publicUrl,
78:     secureCookies: publicUrl.startsWith("https://"),
79:     secret: secret || DEV_SECRET,
80:     secretIsDefault: !secret,
81:     platform: issuer && clientId ? { issuer, clientId, clientSecret: env["VISUA_OIDC_CLIENT_SECRET"] || undefined, name: env["VISUA_OIDC_NAME"] || "Single sign-on" } : undefined,
82:     allowHttpIssuers: env["VISUA_OIDC_ALLOW_HTTP"] === "1",
83:     privateIssuerHosts: (env["VISUA_OIDC_PRIVATE_ISSUERS"] ?? "").split(",").map((h) => h.trim()).filter(Boolean),
84:     trustPlatformEmail: env["VISUA_OIDC_TRUST_EMAIL"] === "1",
85:     ssoDomainVerification: env["VISUA_SSO_DOMAIN_VERIFICATION"] === "off" ? "off" : "dns",
86:     domainRecheckHours: hoursRaw && Number.isFinite(hours) && hours >= 0 ? (hours > 0 ? Math.max(1, hours) : 0) : 24,
87:     domainRecheckGraceDays: number("VISUA_SSO_DOMAIN_RECHECK_GRACE_DAYS", 7),
88:     bootstrapOwnerEmail: env["VISUA_BOOTSTRAP_OWNER_EMAIL"]?.trim().toLowerCase() || undefined,
89:     bootstrapOrgName: env["VISUA_BOOTSTRAP_ORG_NAME"]?.trim() || "My organization",
90:     sessionHours: number("VISUA_SESSION_HOURS", 12),
91:     sessionIdleMinutes: number("VISUA_SESSION_IDLE_MINUTES", 120),
92:   };
93: }

FILE apps/server/src/auth/crypto.ts SHA256 fe01496dfd2f1bfa357407d5fb6bf13baa98f031efff6c3021e24c0fde2fad81
1: import { createCipheriv, createDecipheriv, createHash, randomBytes, timingSafeEqual } from "node:crypto";
2:
3: /** URL-safe random token with `bytes` of entropy. */
4: export const randomToken = (bytes = 32) => randomBytes(bytes).toString("base64url");
5:
6: export const sha256 = (value: string) => createHash("sha256").update(value).digest("hex");
7:
8: export function safeEqual(a: string, b: string): boolean {
9:   const x = Buffer.from(a);
10:   const y = Buffer.from(b);
11:   return x.length === y.length && timingSafeEqual(x, y);
12: }
13:
14: const keyOf = (secret: string) => createHash("sha256").update(`visua:seal:v1:${secret}`).digest();
15:
16: /** AES-256-GCM with a key derived from the server secret: "v1.<iv>.<tag>.<ciphertext>". */
17: export function seal(plaintext: string, secret: string): string {
18:   const iv = randomBytes(12);
19:   const cipher = createCipheriv("aes-256-gcm", keyOf(secret), iv);
20:   const data = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
21:   return ["v1", iv.toString("base64url"), cipher.getAuthTag().toString("base64url"), data.toString("base64url")].join(".");
22: }
23:
24: export function unseal(sealed: string, secret: string): string {
25:   const [version, iv, tag, data] = sealed.split(".");
26:   if (version !== "v1" || !iv || !tag || data === undefined) throw new Error("Unrecognized sealed value");
27:   const decipher = createDecipheriv("aes-256-gcm", keyOf(secret), Buffer.from(iv, "base64url"));
28:   decipher.setAuthTag(Buffer.from(tag, "base64url"));
29:   return Buffer.concat([decipher.update(Buffer.from(data, "base64url")), decipher.final()]).toString("utf8");
30: }

FILE apps/server/src/auth/domain-recheck.ts SHA256 be05ae8023f486128a2a6eb2d668654d83df3532ad3d71b61e46e1cfdd2de989
1: /**
2:  * Re-checks of SSO domains proven by DNS: what one lookup says, and what it does to a domain's
3:  * verification record. Pure: AuthService.recheckDueDomains claims, looks up and records.
4:  *
5:  * A domain whose record is missing is "failing" from the first miss; if it is still missing
6:  * when its grace period ends it "lapses": it admits no one new and holds no claim, but keeps
7:  * routing its members (storage: byDomain) so nobody is locked out. DNS trouble never counts.
8:  */
9: import type { DomainVerification } from "../storage/index.ts";
10:
11: export type LookupOutcome = "found" | "missing" | "unknown";
12: export type RecheckEvent = "failing" | "lapsed" | "recovered";
13: export type DomainStanding = "pending" | "verified" | "failing" | "lapsed" | "not-proven";
14: export interface RecheckSettings {
15:   intervalMs: number;
16:   graceMs: number;
17: }
18:
19: /** How soon a lookup that got no clean answer is tried again. */
20: export const RETRY_MS = 3_600_000;
21:
22: export function classifyLookup(result: { records: string[][] } | { error: unknown }, expected: string): { outcome: LookupOutcome; code?: string } {
23:   if ("records" in result) return { outcome: result.records.some((chunks) => chunks.join("") === expected) ? "found" : "missing" };
24:   const code = (result.error as { code?: string } | null | undefined)?.code;
25:   return code === "ENOTFOUND" || code === "ENODATA" ? { outcome: "missing", code } : { outcome: "unknown", code };
26: }
27:
28: const iso = (ms: number) => new Date(ms).toISOString();
29:
30: export function applyOutcome(v: DomainVerification, outcome: LookupOutcome, at: Date, s: RecheckSettings): { next: DomainVerification; event?: RecheckEvent } {
31:   const t = at.getTime();
32:   if (outcome === "unknown") return { next: { ...v, nextCheckAt: iso(t + Math.min(RETRY_MS, s.intervalMs)) } };
33:   const checked = { ...v, lastCheckedAt: iso(t), nextCheckAt: iso(t + s.intervalMs) };
34:   if (outcome === "found") {
35:     const { failingSince, lapsesAt, lapsedAt, ...rest } = checked;
36:     const wasDown = !!(failingSince || lapsedAt);
37:     return { next: { ...rest, verifiedAt: v.verifiedAt ?? iso(t), method: "dns" }, event: wasDown ? "recovered" : undefined };
38:   }
39:   if (v.lapsedAt) return { next: checked };
40:   if (!v.failingSince) return { next: { ...checked, failingSince: iso(t), lapsesAt: iso(t + s.graceMs) }, event: "failing" };
41:   if (v.lapsesAt && t >= Date.parse(v.lapsesAt)) {
42:     const { verifiedAt, lapsesAt, ...rest } = checked;
43:     return { next: { ...rest, lapsedAt: iso(t) }, event: "lapsed" };
44:   }
45:   return { next: checked };
46: }
47:
48: export function standingOf(v: DomainVerification | undefined): DomainStanding {
49:   if (!v) return "pending";
50:   if (v.lapsedAt) return "lapsed";
51:   if (!v.verifiedAt) return "pending";
52:   if (v.method === "grandfathered" || v.method === "trusted") return "not-proven";
53:   return v.failingSince ? "failing" : "verified";
54: }

FILE apps/server/src/auth/egress.ts SHA256 412b2414bcf932c1f1c4ebe97b1214e6ad5df1cb303e6d8cec84ae620f2f7ebe
1: /**
2:  * Outbound requests to identity providers that organizations choose.
3:  *
4:  * An organization's owner picks its SSO connection's issuer, and the server then fetches
5:  * that issuer's discovery document and the token and key endpoints it names. Left open,
6:  * that lets a tenant make the server call addresses on its own network (cloud metadata,
7:  * admin consoles, databases). Requests for organization connections therefore go through
8:  * `guardedFetch`, which refuses private, loopback, link-local and other non-public
9:  * addresses unless the operator allows the host (VISUA_OIDC_PRIVATE_ISSUERS), as needed for
10:  * identity providers such as Keycloak on an internal network.
11:  *
12:  * The check runs in the socket's own DNS lookup, on the addresses the connection will use,
13:  * so a name that resolves to a public address when saved and a private one at sign-in (DNS
14:  * rebinding) is still refused. Every endpoint the discovery document names is checked the
15:  * same way.
16:  */
17: import { lookup as dnsLookup, type LookupAddress } from "node:dns";
18: import { request as httpRequest, type IncomingMessage } from "node:http";
19: import { request as httpsRequest } from "node:https";
20: import { BlockList, isIP, type LookupFunction } from "node:net";
21: import { brotliDecompressSync, gunzipSync, inflateSync } from "node:zlib";
22: import type { CustomFetch } from "openid-client";
23:
24: /** Largest response accepted from an identity provider (discovery, keys, tokens). */
25: const MAX_BODY = 1024 * 1024;
26:
27: const NON_PUBLIC = new BlockList();
28: for (const [net, prefix] of [
29:   ["0.0.0.0", 8], // "this network"
30:   ["10.0.0.0", 8], // private
31:   ["100.64.0.0", 10], // carrier-grade NAT
32:   ["127.0.0.0", 8], // loopback
33:   ["169.254.0.0", 16], // link-local, cloud metadata
34:   ["172.16.0.0", 12], // private
35:   ["192.0.0.0", 24], // IETF protocol assignments
36:   ["192.0.2.0", 24], // documentation
37:   ["192.168.0.0", 16], // private
38:   ["198.18.0.0", 15], // benchmarking
39:   ["198.51.100.0", 24], // documentation
40:   ["203.0.113.0", 24], // documentation
41:   ["224.0.0.0", 4], // multicast
42:   ["240.0.0.0", 4], // reserved, broadcast
43: ] as const) NON_PUBLIC.addSubnet(net, prefix, "ipv4");
44: for (const [net, prefix] of [
45:   ["::", 128], // unspecified
46:   ["::1", 128], // loopback
47:   ["64:ff9b:1::", 48], // local-use NAT64
48:   ["100::", 64], // discard
49:   ["2001:db8::", 32], // documentation
50:   ["fc00::", 7], // unique local
51:   ["fe80::", 10], // link-local
52:   ["ff00::", 8], // multicast
53: ] as const) NON_PUBLIC.addSubnet(net, prefix, "ipv6");
54:
55: /** The IPv4 address an IPv6 address carries (IPv4-mapped, NAT64 well-known prefix, 6to4), if any. */
56: function embeddedIPv4(address: string): string | undefined {
57:   const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/i.exec(address);
58:   if (mapped) return mapped[1];
59:   // Canonical form, e.g. "::ffff:a00:1" or "64:ff9b::a00:1".
60:   const canonical = new URL(`http://[${address}]`).hostname.slice(1, -1);
61:   const groups = canonical.split(":");
62:   const toV4 = (hi: string, lo: string) => {
63:     const a = parseInt(hi || "0", 16);
64:     const b = parseInt(lo || "0", 16);
65:     return `${a >> 8}.${a & 255}.${b >> 8}.${b & 255}`;
66:   };
67:   if (/^::ffff:[0-9a-f]{1,4}:[0-9a-f]{1,4}$/.test(canonical)) return toV4(groups.at(-2)!, groups.at(-1)!);
68:   if (canonical.startsWith("64:ff9b::")) return toV4(groups.at(-2)!, groups.at(-1)!);
69:   if (canonical.startsWith("2002:")) return toV4(groups[1]!, groups[2]!);
70:   return undefined;
71: }
72:
73: /** Whether an IP address is anything other than a public unicast address. */
74: export function isNonPublicAddress(address: string): boolean {
75:   const family = isIP(address);
76:   if (family === 4) return NON_PUBLIC.check(address, "ipv4");
77:   if (family === 6) {
78:     const v4 = embeddedIPv4(address);
79:     return (v4 !== undefined && NON_PUBLIC.check(v4, "ipv4")) || NON_PUBLIC.check(address, "ipv6");
80:   }
81:   return true;
82: }
83:
84: export class PrivateAddressError extends Error {
85:   readonly host: string;
86:   constructor(host: string, address: string) {
87:     super(
88:       `The identity provider ${host} is on a private or reserved address (${address}). ` +
89:         `If it is an internal provider this server should reach, the operator can allow it with VISUA_OIDC_PRIVATE_ISSUERS.`,
90:     );
91:     this.host = host;
92:   }
93: }
94:
95: /** The PrivateAddressError behind an error, however deeply a library wrapped it. */
96: export function privateAddressCause(err: unknown): PrivateAddressError | undefined {
97:   for (let e = err, depth = 0; e && depth < 5; e = (e as { cause?: unknown }).cause, depth++) {
98:     if (e instanceof PrivateAddressError) return e;
99:   }
100:   return undefined;
101: }
102:
103: /** Hosts the operator allows on private addresses: names or IP literals, or "*" for any. */
104: export function privateHostAllowed(allowed: readonly string[]): (host: string) => boolean {
105:   const set = new Set(allowed.map((h) => h.trim().toLowerCase().replace(/^\[|\]$/g, "")).filter(Boolean));
106:   return (host) => set.has("*") || set.has(host.toLowerCase());
107: }
108:
109: /** The host of a URL as a bare name or IP literal (IPv6 without brackets). */
110: export const bareHost = (url: URL) => url.hostname.toLowerCase().replace(/^\[|\]$/g, "");
111:
112: /** A literal address or `localhost` that would be refused: checked when an owner saves an issuer. */
113: export function refusedLiteral(url: URL, allow: (host: string) => boolean): boolean {
114:   const host = bareHost(url);
115:   if (allow(host)) return false;
116:   return host === "localhost" || host.endsWith(".localhost") || (isIP(host) !== 0 && isNonPublicAddress(host));
117: }
118:
119: function decode(body: Buffer, encoding: string | undefined): Buffer {
120:   switch (encoding?.trim().toLowerCase()) {
121:     case "gzip":
122:     case "x-gzip":
123:       return gunzipSync(body, { maxOutputLength: MAX_BODY });
124:     case "deflate":
125:       return inflateSync(body, { maxOutputLength: MAX_BODY });
126:     case "br":
127:       return brotliDecompressSync(body, { maxOutputLength: MAX_BODY });
128:     default:
129:       return body;
130:   }
131: }
132:
133: async function bodyBytes(body: unknown): Promise<Buffer | undefined> {
134:   if (body === undefined || body === null) return undefined;
135:   if (typeof body === "string" || body instanceof URLSearchParams) return Buffer.from(body.toString());
136:   if (body instanceof ArrayBuffer) return Buffer.from(body);
137:   if (ArrayBuffer.isView(body)) return Buffer.from(body.buffer, body.byteOffset, body.byteLength);
138:   if (body instanceof ReadableStream) return Buffer.from(await new Response(body).arrayBuffer());
139:   throw new TypeError("Unsupported request body");
140: }
141:
142: /**
143:  * A fetch for openid-client that refuses non-public addresses unless `allow(host)`.
144:  * Redirects are returned, never followed (openid-client asks for `redirect: "manual"`).
145:  */
146: export function guardedFetch(allow: (host: string) => boolean): CustomFetch {
147:   return async (url, options) => {
148:     const target = new URL(url);
149:     if (target.protocol !== "https:" && target.protocol !== "http:") throw new TypeError(`Unsupported protocol ${target.protocol}`);
150:     const host = bareHost(target);
151:     const open = allow(host);
152:     // Node connects to literal addresses without a lookup: check those here.
153:     if (!open && isIP(host) && isNonPublicAddress(host)) throw new PrivateAddressError(host, host);
154:     const lookup: LookupFunction = (hostname, lookupOptions, callback) => {
155:       dnsLookup(hostname, { ...lookupOptions, all: true }, (err, addresses: LookupAddress[]) => {
156:         if (err) return callback(err, "", 0);
157:         const refused = open ? undefined : addresses.find((a) => isNonPublicAddress(a.address));
158:         if (refused) return callback(new PrivateAddressError(host, refused.address), "", 0);
159:         if (lookupOptions.all) return callback(null, addresses);
160:         const first = addresses[0];
161:         if (!first) return callback(Object.assign(new Error(`No address for ${hostname}`), { code: "ENOTFOUND" }), "", 0);
162:         callback(null, first.address, first.family);
163:       });
164:     };
165:     const payload = await bodyBytes(options.body);
166:     return new Promise<Response>((resolve, reject) => {
167:       const send = target.protocol === "https:" ? httpsRequest : httpRequest;
168:       const req = send(target, { method: options.method, headers: options.headers, lookup, signal: options.signal }, (res: IncomingMessage) => {
169:         const chunks: Buffer[] = [];
170:         let size = 0;
171:         res.on("data", (chunk: Buffer) => {
172:           size += chunk.length;
173:           if (size > MAX_BODY) {
174:             req.destroy(new Error(`The identity provider's response exceeds ${MAX_BODY} bytes`));
175:             return;
176:           }
177:           chunks.push(chunk);
178:         });
179:         res.on("error", reject);
180:         res.on("end", () => {
181:           try {
182:             const status = res.statusCode ?? 502;
183:             const headers = new Headers();
184:             for (const [name, value] of Object.entries(res.headers)) {
185:               if (value === undefined || name === "content-encoding" || name === "content-length") continue;
186:               for (const v of Array.isArray(value) ? value : [value]) headers.append(name, v);
187:             }
188:             const empty = options.method === "HEAD" || [204, 205, 304].includes(status);
189:             const raw = Buffer.concat(chunks);
190:             resolve(new Response(empty ? null : decode(raw, res.headers["content-encoding"]), { status, statusText: res.statusMessage, headers }));
191:           } catch (err) {
192:             reject(err);
193:           }
194:         });
195:       });
196:       req.on("error", reject);
197:       req.end(payload);
198:     });
199:   };
200: }

FILE apps/server/src/auth/http.ts SHA256 f7eaacc011c3dd2c2721cb04a64af4d88028e834226c5d40b1c120023c413093
1: /**
2:  * HTTP side of authentication: session cookies, bearer tokens, CSRF and
3:  * origin checks, security headers, role guards, and the /api/auth and
4:  * /api/tenants routes.
5:  */
6: import type { Context, Hono, MiddlewareHandler } from "hono";
7: import { deleteCookie, getCookie, setCookie } from "hono/cookie";
8: import { z } from "zod";
9: import { ROLES, ROLE_LABELS, can, type Capability, type Role, type Workspace } from "@visua/core";
10: import { NotFoundError, ValidationError, principalContext } from "../services/visua.ts";
11: import { randomToken, safeEqual } from "./crypto.ts";
12: import { AuthService, ForbiddenError, UnauthorizedError, safeReturnTo, type Principal } from "./service.ts";
13:
14: export type AppEnv = {
15:   Variables: {
16:     principal: Principal | undefined;
17:     workspace: Workspace;
18:     role: Role;
19:     tenantId: string;
20:   };
21: };
22:
23: export const CSRF_HEADER = "x-visua-csrf";
24: const SAFE = new Set(["GET", "HEAD", "OPTIONS"]);
25:
26: /** Routes that answer without a signed-in principal. */
27: const PUBLIC_ROUTES = [/^\/api\/health$/, /^\/api\/auth\/(config|me|dev\/login|oidc\/start|oidc\/callback|sso\/discover|logout)$/, /^\/api\/trust\//];
28:
29: export const cookieName = (auth: AuthService) => (auth.config.secureCookies ? "__Host-visua_session" : "visua_session");
30: /** Pre-auth cookie that binds an OpenID Connect flow to the browser that started it. */
31: const flowCookieName = (auth: AuthService) => (auth.config.secureCookies ? "__Host-visua_oidc" : "visua_oidc");
32:
33: /** `?limit=` as a bounded positive integer (anything else: the default). */
34: export function limitParam(value: string | undefined, fallback: number, max: number): number {
35:   const n = Number(value);
36:   return Number.isInteger(n) && n > 0 ? Math.min(n, max) : fallback;
37: }
38:
39: export function principalOf(c: Context<AppEnv>): Principal {
40:   const p = c.get("principal");
41:   if (!p) throw new UnauthorizedError("Sign in to continue");
42:   return p;
43: }
44:
45: export const actorOf = (c: Context<AppEnv>) => principalOf(c).label;
46:
47: const CSP = [
48:   "default-src 'self'",
49:   // troika (3D text) loads its worker modules from blob: URLs.
50:   "script-src 'self' blob:",
51:   "worker-src 'self' blob:",
52:   "style-src 'self' 'unsafe-inline'",
53:   "img-src 'self' data: blob:",
54:   "font-src 'self' data:",
55:   "connect-src 'self'",
56:   "object-src 'none'",
57:   "base-uri 'self'",
58:   "form-action 'self'",
59:   "frame-ancestors 'none'",
60: ].join("; ");
61:
62: export function securityHeaders(auth: AuthService): MiddlewareHandler<AppEnv> {
63:   return async (c, next) => {
64:     await next();
65:     const h = c.res.headers;
66:     h.set("X-Content-Type-Options", "nosniff");
67:     h.set("Referrer-Policy", "same-origin");
68:     h.set("Cross-Origin-Opener-Policy", "same-origin");
69:     h.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=()");
70:     if (auth.config.secureCookies) h.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
71:     // Corpus documents open in the browser's own PDF viewer; everything else refuses framing.
72:     if (!c.req.path.startsWith("/api/corpus/file/")) {
73:       h.set("X-Frame-Options", "DENY");
74:       if ((h.get("content-type") ?? "").includes("text/html")) h.set("Content-Security-Policy", CSP);
75:     }
76:     if (c.req.path.startsWith("/api/") && !h.has("Cache-Control")) h.set("Cache-Control", "no-store");
77:   };
78: }
79:
80: /** Resolve the principal (bearer API token or session cookie) and run the request as it. */
81: export function authenticate(auth: AuthService): MiddlewareHandler<AppEnv> {
82:   return async (c, next) => {
83:     let principal: Principal | undefined;
84:     const header = c.req.header("authorization");
85:     if (header?.toLowerCase().startsWith("bearer ")) {
86:       principal = await auth.resolveApiToken(header.slice(7).trim());
87:       if (!principal) return c.json({ error: "Invalid, expired or revoked API token" }, 401);
88:     } else {
89:       const token = getCookie(c, cookieName(auth));
90:       if (token) principal = await auth.resolveSession(token);
91:     }
92:     c.set("principal", principal);
93:     if (!principal) return next();
94:     return principalContext.run({ id: principal.id, label: principal.label }, () => next());
95:   };
96: }
97:
98: /** Everything under /api needs a principal, except the public routes. */
99: export function requireSignIn(): MiddlewareHandler<AppEnv> {
100:   return async (c, next) => {
101:     if (c.get("principal") || PUBLIC_ROUTES.some((r) => r.test(c.req.path))) return next();
102:     return c.json({ error: "Sign in to continue" }, 401);
103:   };
104: }
105:
106: /**
107:  * State-changing requests from a browser session must carry the session's CSRF
108:  * token, and (outside developer mode) come from Visua's own origin.
109:  */
110: export function csrfProtection(auth: AuthService): MiddlewareHandler<AppEnv> {
111:   const allowed = new Set([new URL(auth.config.publicUrl).origin, ...(process.env["VISUA_ALLOWED_ORIGINS"] ?? "").split(",").map((o) => o.trim()).filter(Boolean)]);
112:   return async (c, next) => {
113:     if (SAFE.has(c.req.method)) return next();
114:     const origin = c.req.header("origin");
115:     if (origin && auth.config.mode === "oidc" && !allowed.has(origin)) return c.json({ error: "Cross-origin request refused" }, 403);
116:     // Browsers label requests another site started; none may change state (sign-in included), except from allowed origins.
117:     if (c.req.header("sec-fetch-site") === "cross-site" && !(origin && allowed.has(origin))) return c.json({ error: "Cross-site request refused" }, 403);
118:     const p = c.get("principal");
119:     if (p?.kind === "user" && !safeEqual(c.req.header(CSRF_HEADER) ?? "", p.session.csrf)) return c.json({ error: "Missing or invalid CSRF token — reload the page" }, 403);
120:     return next();
121:   };
122: }
123:
124: /**
125:  * Workspace routes: the workspace must belong to an organization the principal
126:  * can access (404 otherwise — other tenants' workspaces do not exist for you).
127:  * Reads need `workspace.read`; any write needs at least `work.write`; routes
128:  * that need more add `need()`.
129:  */
130: export function workspaceAccess(auth: AuthService): MiddlewareHandler<AppEnv> {
131:   return async (c, next) => {
132:     const ws = await auth.svc.store.workspaces.get(c.req.param("ws") ?? "");
133:     const role = ws ? await auth.roleIn(c.get("principal"), ws.tenantId) : undefined;
134:     if (!ws || !role) throw new NotFoundError("Workspace not found");
135:     c.set("workspace", ws);
136:     c.set("role", role);
137:     c.set("tenantId", ws.tenantId!);
138:     const floor: Capability = SAFE.has(c.req.method) ? "workspace.read" : "work.write";
139:     if (!can(role, floor)) throw new ForbiddenError(`The ${ROLE_LABELS[role].name.toLowerCase()} role is read-only`);
140:     return next();
141:   };
142: }
143:
144: /** Organization routes (/api/tenants/:tenant/...): membership required, 404 otherwise. */
145: export function tenantAccess(auth: AuthService): MiddlewareHandler<AppEnv> {
146:   return async (c, next) => {
147:     const id = c.req.param("tenant") ?? "";
148:     const tenant = (await auth.svc.store.identity.tenants.get(id)) ?? (await auth.svc.store.identity.tenants.getBySlug(id));
149:     const role = tenant ? await auth.roleIn(c.get("principal"), tenant.id) : undefined;
150:     if (!tenant || !role) throw new NotFoundError("Organization not found");
151:     c.set("tenantId", tenant.id);
152:     c.set("role", role);
153:     return next();
154:   };
155: }
156:
157: /** Require a capability beyond the route's floor. */
158: export const need =
159:   (capability: Capability): MiddlewareHandler<AppEnv> =>
160:   async (c, next) => {
161:     requireCapability(c, capability);
162:     return next();
163:   };
164:
165: export function requireCapability(c: Context<AppEnv>, capability: Capability): void {
166:   const role = c.get("role");
167:   if (!can(role, capability)) throw new ForbiddenError(`This needs the ${capabilityRole(capability)} role or higher (you are ${role ? ROLE_LABELS[role].name.toLowerCase() : "not a member"})`);
168: }
169:
170: const capabilityRole = (capability: Capability) => ROLE_LABELS[[...ROLES].reverse().find((r) => can(r, capability)) ?? "owner"].name.toLowerCase();
171:
172: // ---------------------------------------------------------------------------
173: // Routes
174: // ---------------------------------------------------------------------------
175:
176: const RoleSchema = z.enum(ROLES);
177:
178: async function json<T extends z.ZodType>(c: Context, schema: T): Promise<z.infer<T>> {
179:   let body: unknown;
180:   try {
181:     body = await c.req.json();
182:   } catch {
183:     throw new ValidationError("Request body must be JSON");
184:   }
185:   const parsed = schema.safeParse(body);
186:   if (!parsed.success) throw new ValidationError(z.prettifyError(parsed.error));
187:   return parsed.data;
188: }
189:
190: export function authRoutes(app: Hono<AppEnv>, auth: AuthService): void {
191:   const setSession = (c: Context, token: string) =>
192:     setCookie(c, cookieName(auth), token, {
193:       httpOnly: true,
194:       secure: auth.config.secureCookies,
195:       sameSite: "Lax",
196:       path: "/",
197:       maxAge: auth.config.sessionHours * 3600,
198:     });
199:
200:   app.get("/api/auth/config", async (c) =>
201:     c.json({
202:       mode: auth.config.mode,
203:       platform: auth.config.platform ? { name: auth.config.platform.name } : null,
204:       sso: true,
205:       personas: await auth.devPersonas(),
206:     }),
207:   );
208:
209:   app.post("/api/auth/dev/login", async (c) => {
210:     const input = await json(c, z.object({ email: z.string().max(200), name: z.string().max(120).optional() }));
211:     const { token } = await auth.devLogin(input.email, input.name, c.req.header("user-agent"));
212:     setSession(c, token);
213:     const principal = await auth.resolveSession(token);
214:     return c.json(await auth.me(principal!));
215:   });
216:
217:   app.post("/api/auth/sso/discover", async (c) => {
218:     const input = await json(c, z.object({ email: z.string().max(200) }));
219:     const found = await auth.discover(input.email);
220:     if (!found) throw new NotFoundError("No single sign-on is configured for this address");
221:     return c.json(found);
222:   });
223:
224:   app.get("/api/auth/oidc/start", async (c) => {
225:     // Sign-in starts from Visua's own pages (or a typed URL), never from another site's link.
226:     const site = c.req.header("sec-fetch-site");
227:     if (site && site !== "same-origin" && site !== "none") return c.redirect(`/login?error=${encodeURIComponent("Start signing in from the Visua sign-in page.")}`, 302);
228:     const browser = randomToken(24);
229:     const url = await auth.startLogin(c.req.query("connection") || "platform", safeReturnTo(c.req.query("returnTo")), browser);
230:     setCookie(c, flowCookieName(auth), browser, { httpOnly: true, secure: auth.config.secureCookies, sameSite: "Lax", path: "/", maxAge: 600 });
231:     return c.redirect(url.toString(), 302);
232:   });
233:
234:   app.get("/api/auth/oidc/callback", async (c) => {
235:     const browser = getCookie(c, flowCookieName(auth)) ?? "";
236:     deleteCookie(c, flowCookieName(auth), { path: "/", secure: auth.config.secureCookies });
237:     try {
238:       const { token, returnTo } = await auth.finishLogin(new URL(c.req.url), c.req.header("user-agent"), browser);
239:       setSession(c, token);
240:       return c.redirect(returnTo, 302);
241:     } catch (err) {
242:       const message = err instanceof UnauthorizedError || err instanceof ForbiddenError ? err.message : "Sign-in failed. Try again or contact your administrator.";
243:       if (!(err instanceof UnauthorizedError || err instanceof ForbiddenError)) console.error("[visua] OIDC callback failed", err);
244:       return c.redirect(`/login?error=${encodeURIComponent(message)}`, 302);
245:     }
246:   });
247:
248:   app.post("/api/auth/logout", async (c) => {
249:     const p = c.get("principal");
250:     if (p) await auth.endSession(p);
251:     deleteCookie(c, cookieName(auth), { path: "/", secure: auth.config.secureCookies });
252:     return c.json({ ok: true });
253:   });
254:
255:   // Signed out is a normal state for the sign-in screen: null, not an error.
256:   app.get("/api/auth/me", async (c) => {
257:     const p = c.get("principal");
258:     return c.json(p ? await auth.me(p) : null);
259:   });
260:
261:   app.post("/api/auth/tenant", async (c) => {
262:     const input = await json(c, z.object({ tenantId: z.string() }));
263:     const p = principalOf(c);
264:     await auth.switchTenant(p, input.tenantId);
265:     return c.json(await auth.me((await auth.resolveSession(getCookie(c, cookieName(auth)) ?? "")) ?? p));
266:   });
267:
268:   // ------------------------------------------------------------ organizations
269:   app.post("/api/tenants", async (c) => {
270:     const p = principalOf(c);
271:     if (p.kind !== "user") throw new ForbiddenError("API tokens cannot create organizations");
272:     if (p.session.tenantScope) throw new ForbiddenError("Sessions from an organization's SSO cannot create other organizations");
273:     const input = await json(c, z.object({ name: z.string().min(1).max(120) }));
274:     const tenant = await auth.createTenant(input.name, p.user, p);
275:     await auth.switchTenant(p, tenant.id);
276:     return c.json(tenant, 201);
277:   });
278:
279:   const t = tenantAccess(auth);
280:   app.use("/api/tenants/:tenant", t);
281:   app.use("/api/tenants/:tenant/*", t);
282:
283:   app.get("/api/tenants/:tenant", async (c) => {
284:     const tenant = await auth.tenant(c.get("tenantId"));
285:     return c.json({ ...tenant, role: c.get("role") });
286:   });
287:
288:   app.patch("/api/tenants/:tenant", need("tenant.manage"), async (c) => {
289:     const input = await json(c, z.object({ name: z.string().min(1).max(120).optional(), settings: z.object({ requireSso: z.boolean().optional() }).optional() }));
290:     if (input.settings) requireCapability(c, "tenant.own");
291:     return c.json(await auth.updateTenant(c.get("tenantId"), input, principalOf(c)));
292:   });
293:
294:   app.get("/api/tenants/:tenant/members", async (c) => c.json(await auth.members(c.get("tenantId"))));
295:
296:   app.post("/api/tenants/:tenant/members", need("tenant.manage"), async (c) => {
297:     const input = await json(c, z.object({ email: z.string().max(200), name: z.string().max(120).optional(), role: RoleSchema }));
298:     return c.json(await auth.addMember(c.get("tenantId"), input, principalOf(c)), 201);
299:   });
300:
301:   app.patch("/api/tenants/:tenant/members/:userId", need("tenant.manage"), async (c) => {
302:     const input = await json(c, z.object({ role: RoleSchema }));
303:     return c.json(await auth.setRole(c.get("tenantId"), c.req.param("userId"), input.role, principalOf(c)));
304:   });
305:
306:   app.delete("/api/tenants/:tenant/members/:userId", need("tenant.manage"), async (c) => {
307:     await auth.removeMember(c.get("tenantId"), c.req.param("userId"), principalOf(c));
308:     return c.body(null, 204);
309:   });
310:
311:   app.get("/api/tenants/:tenant/tokens", need("tenant.manage"), async (c) => c.json(await auth.svc.store.identity.apiTokens.forTenant(c.get("tenantId"))));
312:
313:   app.post("/api/tenants/:tenant/tokens", need("tenant.manage"), async (c) => {
314:     const input = await json(c, z.object({ name: z.string().min(1).max(120), role: RoleSchema, expiresInDays: z.number().int().min(1).max(730).optional() }));
315:     const { token, record } = await auth.createApiToken(c.get("tenantId"), input, principalOf(c));
316:     // The token is shown once; only its hash is stored.
317:     return c.json({ ...record, token }, 201);
318:   });
319:
320:   app.delete("/api/tenants/:tenant/tokens/:id", need("tenant.manage"), async (c) => {
321:     await auth.revokeApiToken(c.get("tenantId"), c.req.param("id"), principalOf(c));
322:     return c.body(null, 204);
323:   });
324:
325:   const SsoFields = z.object({
326:     name: z.string().max(120),
327:     issuer: z.string().min(1).max(500),
328:     clientId: z.string().min(1).max(300),
329:     clientSecret: z.string().max(2000).optional(),
330:     domains: z.array(z.string().max(200)).min(1).max(50),
331:     jitProvisioning: z.boolean().optional(),
332:     defaultRole: RoleSchema.optional(),
333:     enabled: z.boolean().optional(),
334:   });
335:   const SsoSchema = SsoFields.extend({ name: SsoFields.shape.name.default("Single sign-on") });
336:   // An update changes only the fields it sends (no defaults: a missing name keeps the current one).
337:   const SsoPatch = SsoFields.partial();
338:
339:   app.get("/api/tenants/:tenant/sso", need("tenant.manage"), async (c) =>
340:     c.json({
341:       redirectUri: auth.redirectUri,
342:       domainRechecks: auth.domainRecheckSchedule,
343:       connections: await auth.describeConnections(await auth.svc.store.identity.sso.forTenant(c.get("tenantId"))),
344:     }),
345:   );
346:
347:   app.post("/api/tenants/:tenant/sso", need("tenant.manage"), async (c) => {
348:     const input = await json(c, SsoSchema);
349:     return c.json(await auth.describeConnection(await auth.upsertSsoConnection(c.get("tenantId"), input, principalOf(c))), 201);
350:   });
351:
352:   app.patch("/api/tenants/:tenant/sso/:id", need("tenant.manage"), async (c) => {
353:     const input = await json(c, SsoPatch);
354:     const existing = await auth.svc.store.identity.sso.get(c.req.param("id"));
355:     if (!existing || existing.tenantId !== c.get("tenantId")) throw new NotFoundError("SSO connection not found");
356:     const merged = { name: existing.name, issuer: existing.issuer, clientId: existing.clientId, domains: existing.domains, jitProvisioning: existing.jitProvisioning, defaultRole: existing.defaultRole, enabled: existing.enabled, ...input };
357:     return c.json(await auth.describeConnection(await auth.upsertSsoConnection(c.get("tenantId"), { ...merged, id: existing.id }, principalOf(c))));
358:   });
359:
360:   // Checks the domain's TXT record now; admins may, since proving a domain chooses no provider.
361:   app.post("/api/tenants/:tenant/sso/:id/domains/:domain/verify", need("tenant.manage"), async (c) =>
362:     c.json(await auth.describeConnection(await auth.verifySsoDomain(c.get("tenantId"), c.req.param("id"), c.req.param("domain"), principalOf(c)))),
363:   );
364:
365:   app.delete("/api/tenants/:tenant/sso/:id", need("tenant.manage"), async (c) => {
366:     await auth.deleteSsoConnection(c.get("tenantId"), c.req.param("id"), principalOf(c));
367:     return c.body(null, 204);
368:   });
369:
370:   app.get("/api/tenants/:tenant/activity", need("workspace.export"), async (c) =>
371:     c.json(await auth.svc.store.activity.recent(c.get("tenantId"), limitParam(c.req.query("limit"), 100, 500))),
372:   );
373:   app.get("/api/tenants/:tenant/activity/verify", need("workspace.export"), async (c) => c.json(await auth.svc.verifyAuditTrail(c.get("tenantId"))));
374: }

FILE apps/server/src/auth/recheck-ticker.ts SHA256 66fdc476be948c710885d155e400c42d0648391dcb1b7444752f9752652b9efe
1: /**
2:  * Runs SSO domain re-checks on a timer (every instance runs one; the claims in
3:  * AuthService.recheckDueDomains keep instances from looking up the same domain). A run
4:  * still in progress makes the next tick skip; a failed run is logged and the ticker goes on.
5:  * The timers do not keep the process alive.
6:  */
7: export function startDomainRechecks(
8:   run: () => Promise<unknown>,
9:   { everyMs = 10 * 60_000, firstMs = 30_000, log = (m: string) => console.warn(m) }: { everyMs?: number; firstMs?: number; log?: (message: string) => void } = {},
10: ): () => void {
11:   let running = false;
12:   let stopped = false;
13:   const tick = async () => {
14:     if (running || stopped) return;
15:     running = true;
16:     try {
17:       await run();
18:     } catch (err) {
19:       log(`[visua] SSO domain re-check failed: ${(err as Error).message}`);
20:     } finally {
21:       running = false;
22:     }
23:   };
24:   const first = setTimeout(() => void tick(), firstMs);
25:   const every = setInterval(() => void tick(), everyMs);
26:   first.unref?.();
27:   every.unref?.();
28:   return () => {
29:     stopped = true;
30:     clearTimeout(first);
31:     clearInterval(every);
32:   };
33: }

FILE apps/server/src/auth/service.ts SHA256 7f660ebd0970cc08f152351d4e4783641585bb699a7e5f7bf67e9e6096b822bd
1: /**
2:  * Identity and access: organizations (tenants), members and roles, sessions,
3:  * API tokens, per-organization SSO connections and the OpenID Connect login
4:  * flow (authorization code + PKCE, state and nonce).
5:  *
6:  * Tenant separation rules:
7:  * - Every workspace belongs to one organization; access to it is the member's
8:  *   role in that organization, and nothing else.
9:  * - A session created through an organization's own SSO connection is scoped
10:  *   to that organization, so an identity provider configured by one tenant can
11:  *   never grant access to another tenant's data.
12:  * - An organization can require its own SSO for every session that touches it.
13:  */
14: import { randomBytes } from "node:crypto";
15: import { Resolver } from "node:dns/promises";
16: import * as oidc from "openid-client";
17: import { ROLE_CAPABILITIES, can, newId, roleRank, slugify, type Capability, type Membership, type Role, type Tenant, type TenantSettings, type User } from "@visua/core";
18: import type { ApiTokenRecord, DomainVerification, SessionRecord, SsoConnection } from "../storage/index.ts";
19: import { DEFAULT_TENANT_ID } from "../storage/index.ts";
20: import { NotFoundError, ValidationError, type Principal as AuditPrincipal, type VisuaService } from "../services/visua.ts";
21: import type { AuthConfig } from "./config.ts";
22: import { applyOutcome, classifyLookup, standingOf, type LookupOutcome, type RecheckEvent } from "./domain-recheck.ts";
23: import { randomToken, safeEqual, seal, sha256, unseal } from "./crypto.ts";
24: import { guardedFetch, privateAddressCause, privateHostAllowed, refusedLiteral } from "./egress.ts";
25:
26: export class UnauthorizedError extends Error {}
27: export class ForbiddenError extends Error {}
28:
29: export type Principal =
30:   | { kind: "user"; id: string; label: string; user: User; session: SessionRecord; sessionHash: string }
31:   | { kind: "token"; id: string; label: string; token: ApiTokenRecord };
32:
33: export const PLATFORM = "platform";
34: const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
35: const now = () => new Date().toISOString();
36: const addMinutes = (min: number, from = Date.now()) => new Date(from + min * 60_000).toISOString();
37:
38: export const userLabel = (u: Pick<User, "name" | "email">) => `${u.name} <${u.email}>`;
39:
40: export interface SsoConnectionInput {
41:   name: string;
42:   issuer: string;
43:   clientId: string;
44:   clientSecret?: string;
45:   domains: string[];
46:   jitProvisioning?: boolean;
47:   defaultRole?: Role;
48:   enabled?: boolean;
49: }
50:
51: /** The TXT record that proves control of a domain for one SSO connection. */
52: export const challengeRecord = (domain: string, token: string) => ({ name: `_visua-challenge.${domain}`, value: `visua-domain-verification=${token}` });
53:
54: /** The domains a connection has proven: the only ones that route sign-ins and admit people. */
55: export const verifiedDomains = (c: SsoConnection) => c.domains.filter((d) => !!c.verification?.[d]?.verifiedAt);
56:
57: /**
58:  * What the API returns for an SSO connection: never the secret; each domain with its status and
59:  * record. `owners` names, for the connection's lapsed domains, the connection that has proven
60:  * each one since (AuthService.describeConnection looks them up).
61:  */
62: export const publicConnection = (c: SsoConnection, owners: Record<string, string | undefined> = {}) => {
63:   const { clientSecretSealed, verification, ...rest } = c;
64:   const domainStatus = c.domains.map((domain) => {
65:     const v = verification?.[domain];
66:     const standing = standingOf(v);
67:     return {
68:       domain,
69:       verified: !!v?.verifiedAt,
70:       standing,
71:       method: v?.method,
72:       verifiedAt: v?.verifiedAt,
73:       lastCheckedAt: v?.lastCheckedAt,
74:       failingSince: v?.failingSince,
75:       lapsesAt: v?.lapsesAt,
76:       lapsedAt: v?.lapsedAt,
77:       takenOver: standing === "lapsed" && !!owners[domain] && owners[domain] !== c.id,
78:       record: v ? challengeRecord(domain, v.token) : undefined,
79:     };
80:   });
81:   return { ...rest, hasClientSecret: !!clientSecretSealed, domainStatus };
82: };
83:
84: const day = (iso: string | undefined) => (iso ? iso.slice(0, 10) : "");
85: function recheckSummary(event: RecheckEvent, domain: string, record: string, connection: string, v: DomainVerification): string {
86:   if (event === "failing") return `Domain ${domain}: its TXT record ${record} was not found on re-check; it lapses on ${day(v.lapsesAt)} unless the record is restored`;
87:   if (event === "lapsed")
88:     return `Domain ${domain} lapsed: its TXT record ${record} has been missing since ${day(v.failingSince)}; “${connection}” no longer admits new people from it, and another organization can prove it`;
89:   return `Domain ${domain}: its TXT record ${record} was found again`;
90: }
91:
92: /** How many due domains one tick claims. */
93: export const RECHECK_BATCH = 25;
94: /** How long a claimed re-check is hidden from other instances while it is looked up. */
95: const LEASE_MS = 15 * 60_000;
96:
97: /** TXT lookups for domain verification (replaceable in tests). */
98: export type ResolveTxt = (name: string) => Promise<string[][]>;
99: const resolveTxtWithTimeout: ResolveTxt = (name) => new Resolver({ timeout: 5000, tries: 2 }).resolveTxt(name);
100:
101: export class AuthService {
102:   readonly svc: VisuaService;
103:   readonly config: AuthConfig;
104:   private readonly oidcConfigs = new Map<string, { config: oidc.Configuration; at: number }>();
105:   private readonly resolveTxt: ResolveTxt;
106:
107:   constructor(svc: VisuaService, config: AuthConfig, deps: { resolveTxt?: ResolveTxt } = {}) {
108:     this.svc = svc;
109:     this.config = config;
110:     this.resolveTxt = deps.resolveTxt ?? resolveTxtWithTimeout;
111:   }
112:
113:   private get ids() {
114:     return this.svc.store.identity;
115:   }
116:
117:   /** Domains proven by DNS are looked up again on a schedule (VISUA_SSO_DOMAIN_RECHECK_HOURS, 0 = off). */
118:   get domainRechecksEnabled(): boolean {
119:     return this.config.ssoDomainVerification === "dns" && this.config.domainRecheckHours > 0;
120:   }
121:
122:   /** How the organization page describes the re-check schedule. */
123:   get domainRecheckSchedule(): { enabled: boolean; everyHours: number } {
124:     return { enabled: this.domainRechecksEnabled, everyHours: this.config.domainRecheckHours };
125:   }
126:
127:   /** A connection as the API returns it, with each lapsed domain's current holder looked up. */
128:   async describeConnection(c: SsoConnection): Promise<ReturnType<typeof publicConnection>> {
129:     const owners: Record<string, string | undefined> = {};
130:     for (const d of c.domains) if (c.verification?.[d]?.lapsedAt) owners[d] = await this.ids.sso.domainOwner(d);
131:     return publicConnection(c, owners);
132:   }
133:
134:   async describeConnections(list: SsoConnection[]): Promise<ReturnType<typeof publicConnection>[]> {
135:     const out: ReturnType<typeof publicConnection>[] = [];
136:     for (const c of list) out.push(await this.describeConnection(c));
137:     return out;
138:   }
139:
140:   private get recheckSettings() {
141:     return { intervalMs: this.config.domainRecheckHours * 3_600_000, graceMs: this.config.domainRecheckGraceDays * 86_400_000 };
142:   }
143:
144:   /** Look up a domain's challenge record. Never inside a transaction. */
145:   private async lookupChallenge(domain: string, token: string): Promise<{ outcome: LookupOutcome; code?: string }> {
146:     const record = challengeRecord(domain, token);
147:     try {
148:       return classifyLookup({ records: await this.resolveTxt(record.name) }, record.value);
149:     } catch (error) {
150:       return classifyLookup({ error }, record.value);
151:     }
152:   }
153:
154:   /** Organization-level audit trail: the same hash-chained log, keyed by the tenant id. */
155:   private async audit(tenantId: string, by: Principal | string, action: string, entity: string, entityId: string, summary: string, data?: Record<string, unknown>) {
156:     await this.svc.log(tenantId, typeof by === "string" ? by : by.label, action, entity, entityId, summary, data);
157:   }
158:
159:   // -------------------------------------------------------------------------
160:   // Organizations, users and memberships
161:   // -------------------------------------------------------------------------
162:
163:   async tenant(id: string): Promise<Tenant> {
164:     const t = await this.ids.tenants.get(id);
165:     if (!t) throw new NotFoundError("Organization not found");
166:     return t;
167:   }
168:
169:   async createTenant(name: string, owner: User, by: Principal | string, slugHint?: string): Promise<Tenant> {
170:     const clean = name.trim();
171:     if (!clean) throw new ValidationError("An organization needs a name");
172:     return this.svc.store.atomic(async () => {
173:       let slug = slugify(slugHint ?? clean) || "org";
174:       await this.svc.store.lock(`tenant-slug:${slug}`);
175:       if (await this.ids.tenants.getBySlug(slug)) slug = `${slug}-${randomToken(3).toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 4) || "x"}`;
176:       const ts = now();
177:       const tenant: Tenant = { id: newId("tnt"), slug, name: clean, settings: {}, createdAt: ts, updatedAt: ts };
178:       await this.ids.tenants.put(tenant);
179:       await this.ids.memberships.put({ tenantId: tenant.id, userId: owner.id, role: "owner", createdAt: ts, updatedAt: ts });
180:       await this.audit(tenant.id, by, "created", "organization", tenant.id, `Organization “${tenant.name}” created; ${owner.name} is its owner`);
181:       return tenant;
182:     });
183:   }
184:
185:   async updateTenant(tenantId: string, patch: { name?: string; settings?: Partial<TenantSettings> }, by: Principal): Promise<Tenant> {
186:     return this.svc.store.atomic(async () => {
187:       const t = await this.tenant(tenantId);
188:       if (patch.settings?.requireSso) {
189:         const connections = (await this.ids.sso.forTenant(tenantId)).filter((c) => c.enabled);
190:         if (!connections.length) throw new ValidationError("Add and enable an SSO connection before requiring SSO");
191:         // Verified domains route sign-ins (and lapsed ones, until another connection proves them),
192:         // but only a verified one can be required: a lapsed domain admits no one new.
193:         if (!connections.some((c) => verifiedDomains(c).length)) throw new ValidationError("Verify at least one of your SSO connection's domains before requiring SSO");
194:       }
195:       const next: Tenant = { ...t, name: patch.name?.trim() || t.name, settings: { ...t.settings, ...(patch.settings ?? {}) }, updatedAt: now() };
196:       await this.ids.tenants.put(next);
197:       await this.audit(tenantId, by, "updated", "organization", tenantId, `Organization settings updated (${Object.keys({ ...patch, ...(patch.settings ?? {}) }).filter((k) => k !== "settings").join(", ")})`);
198:       return next;
199:     });
200:   }
201:
202:   async ensureUser(email: string, name?: string): Promise<User> {
203:     const normalized = email.trim().toLowerCase();
204:     if (!EMAIL.test(normalized)) throw new ValidationError("Enter a valid email address");
205:     return this.svc.store.atomic(async () => {
206:       await this.svc.store.lock(`user:${normalized}`);
207:       const existing = await this.ids.users.getByEmail(normalized);
208:       if (existing) return existing;
209:       const ts = now();
210:       return this.ids.users.put({ id: newId("usr"), email: normalized, name: name?.trim() || normalized.split("@")[0]!, createdAt: ts, updatedAt: ts });
211:     });
212:   }
213:
214:   async members(tenantId: string) {
215:     return (await this.ids.memberships.forTenant(tenantId)).map(({ membership, user }) => ({ ...user, role: membership.role, memberSince: membership.createdAt }));
216:   }
217:
218:   /** Nobody grants a role above their own; only owners manage owners. */
219:   private assertCanGrant(actorRole: Role | undefined, role: Role) {
220:     if (!actorRole || !can(actorRole, "tenant.manage")) throw new ForbiddenError("Managing members requires the admin or owner role");
221:     if (role === "owner" && actorRole !== "owner") throw new ForbiddenError("Only owners can grant the owner role");
222:     if (roleRank(role) > roleRank(actorRole)) throw new ForbiddenError("You cannot grant a role above your own");
223:   }
224:
225:   async addMember(tenantId: string, input: { email: string; name?: string; role: Role }, by: Principal): Promise<Membership> {
226:     const actorRole = await this.roleIn(by, tenantId);
227:     this.assertCanGrant(actorRole, input.role);
228:     return this.svc.store.atomic(async () => {
229:       await this.svc.store.lock(`ws:${tenantId}`);
230:       const user = await this.ensureUser(input.email, input.name);
231:       const existing = await this.ids.memberships.get(tenantId, user.id);
232:       if (existing) throw new ValidationError(`${user.email} is already a member (${existing.role})`);
233:       const ts = now();
234:       const m = await this.ids.memberships.put({ tenantId, userId: user.id, role: input.role, addedBy: by.id, createdAt: ts, updatedAt: ts });
235:       await this.audit(tenantId, by, "added", "member", user.id, `${user.email} added as ${input.role}`);
236:       return m;
237:     });
238:   }
239:
240:   /** System grant (seeding, bootstrap): no actor role check, but audited. */
241:   async grantMembership(tenantId: string, user: User, role: Role, by: string): Promise<Membership> {
242:     return this.svc.store.atomic(async () => {
243:       await this.svc.store.lock(`ws:${tenantId}`);
244:       const ts = now();
245:       const existing = await this.ids.memberships.get(tenantId, user.id);
246:       const m = await this.ids.memberships.put({ tenantId, userId: user.id, role, addedBy: by, createdAt: existing?.createdAt ?? ts, updatedAt: ts });
247:       await this.audit(tenantId, by, existing ? "updated" : "added", "member", user.id, `${user.email} ${existing ? "now" : "added as"} ${role}`);
248:       return m;
249:     });
250:   }
251:
252:   async setRole(tenantId: string, userId: string, role: Role, by: Principal): Promise<Membership> {
253:     const actorRole = await this.roleIn(by, tenantId);
254:     return this.svc.store.atomic(async () => {
255:       await this.svc.store.lock(`ws:${tenantId}`);
256:       const m = await this.ids.memberships.get(tenantId, userId);
257:       if (!m) throw new NotFoundError("Member not found");
258:       this.assertCanGrant(actorRole, role);
259:       if (m.role === "owner" && actorRole !== "owner") throw new ForbiddenError("Only owners can change an owner's role");
260:       if (m.role === "owner" && role !== "owner" && (await this.ids.memberships.owners(tenantId)) <= 1) throw new ValidationError("An organization needs at least one owner");
261:       const next = await this.ids.memberships.put({ ...m, role, updatedAt: now() });
262:       const user = await this.ids.users.get(userId);
263:       await this.audit(tenantId, by, "updated", "member", userId, `${user?.email ?? userId}: ${m.role} → ${role}`);
264:       return next;
265:     });
266:   }
267:
268:   async removeMember(tenantId: string, userId: string, by: Principal): Promise<void> {
269:     const actorRole = await this.roleIn(by, tenantId);
270:     if (!can(actorRole, "tenant.manage")) throw new ForbiddenError("Managing members requires the admin or owner role");
271:     await this.svc.store.atomic(async () => {
272:       await this.svc.store.lock(`ws:${tenantId}`);
273:       const m = await this.ids.memberships.get(tenantId, userId);
274:       if (!m) throw new NotFoundError("Member not found");
275:       if (m.role === "owner" && actorRole !== "owner") throw new ForbiddenError("Only owners can remove an owner");
276:       if (m.role === "owner" && (await this.ids.memberships.owners(tenantId)) <= 1) throw new ValidationError("An organization needs at least one owner");
277:       await this.ids.memberships.delete(tenantId, userId);
278:       const user = await this.ids.users.get(userId);
279:       await this.audit(tenantId, by, "removed", "member", userId, `${user?.email ?? userId} removed (was ${m.role})`);
280:     });
281:   }
282:
283:   // -------------------------------------------------------------------------
284:   // Access
285:   // -------------------------------------------------------------------------
286:
287:   /** The principal's role in an organization, after scope and SSO-requirement checks. */
288:   async roleIn(principal: Principal | undefined, tenantId: string | undefined): Promise<Role | undefined> {
289:     if (!principal || !tenantId) return undefined;
290:     if (principal.kind === "token") return principal.token.tenantId === tenantId ? principal.token.role : undefined;
291:     if (principal.session.tenantScope && principal.session.tenantScope !== tenantId) return undefined;
292:     const m = await this.ids.memberships.get(tenantId, principal.user.id);
293:     if (!m) return undefined;
294:     const tenant = await this.ids.tenants.get(tenantId);
295:     if (tenant?.settings.requireSso) {
296:       const own = (await this.ids.sso.forTenant(tenantId)).filter((c) => c.enabled).map((c) => `oidc:${c.id}`);
297:       if (own.length && !own.includes(principal.session.method)) return undefined;
298:     }
299:     return m.role;
300:   }
301:
302:   async can(principal: Principal | undefined, tenantId: string | undefined, capability: Capability): Promise<boolean> {
303:     return can(await this.roleIn(principal, tenantId), capability);
304:   }
305:
306:   /** Organizations this principal can use right now. */
307:   async organizations(principal: Principal): Promise<{ tenant: Tenant; role: Role }[]> {
308:     if (principal.kind === "token") {
309:       const tenant = await this.ids.tenants.get(principal.token.tenantId);
310:       return tenant ? [{ tenant, role: principal.token.role }] : [];
311:     }
312:     const out: { tenant: Tenant; role: Role }[] = [];
313:     for (const { tenant } of await this.ids.memberships.forUser(principal.user.id)) {
314:       const role = await this.roleIn(principal, tenant.id);
315:       if (role) out.push({ tenant, role });
316:     }
317:     return out;
318:   }
319:
320:   /** The organization new workspaces go to and workspace lists come from. */
321:   async activeTenant(principal: Principal, orgs?: { tenant: Tenant; role: Role }[]): Promise<{ tenant: Tenant; role: Role } | undefined> {
322:     const list = orgs ?? (await this.organizations(principal));
323:     const wanted = principal.kind === "user" ? principal.session.activeTenantId : principal.token.tenantId;
324:     return list.find((o) => o.tenant.id === wanted) ?? list[0];
325:   }
326:
327:   async me(principal: Principal) {
328:     const orgs = await this.organizations(principal);
329:     const active = await this.activeTenant(principal, orgs);
330:     return {
331:       authMode: this.config.mode,
332:       principal: principal.kind,
333:       user: principal.kind === "user" ? { id: principal.user.id, email: principal.user.email, name: principal.user.name } : { id: principal.id, email: "", name: principal.label },
334:       method: principal.kind === "user" ? principal.session.method : "token",
335:       csrf: principal.kind === "user" ? principal.session.csrf : undefined,
336:       tenantScope: principal.kind === "user" ? principal.session.tenantScope ?? null : principal.token.tenantId,
337:       activeTenant: active ? { id: active.tenant.id, slug: active.tenant.slug, name: active.tenant.name, settings: active.tenant.settings, role: active.role, capabilities: ROLE_CAPABILITIES[active.role] } : null,
338:       organizations: orgs.map((o) => ({ id: o.tenant.id, slug: o.tenant.slug, name: o.tenant.name, role: o.role })),
339:     };
340:   }
341:
342:   // -------------------------------------------------------------------------
343:   // Sessions
344:   // -------------------------------------------------------------------------
345:
346:   async createSession(user: User, method: string, opts: { tenantScope?: string; userAgent?: string } = {}): Promise<{ token: string; session: SessionRecord }> {
347:     if (user.disabled) throw new ForbiddenError("This account is disabled");
348:     const token = randomToken(32);
349:     const ts = now();
350:     const session: SessionRecord = {
351:       userId: user.id,
352:       method,
353:       tenantScope: opts.tenantScope,
354:       activeTenantId: opts.tenantScope,
355:       csrf: randomToken(24),
356:       userAgent: opts.userAgent?.slice(0, 300),
357:       createdAt: ts,
358:       lastSeenAt: ts,
359:       expiresAt: addMinutes(this.config.sessionHours * 60),
360:     };
361:     await this.svc.store.atomic(async () => {
362:       await this.ids.sessions.create(sha256(token), session);
363:       await this.ids.users.put({ ...user, lastLoginAt: ts, updatedAt: ts });
364:     });
365:     return { token, session };
366:   }
367:
368:   async resolveSession(token: string): Promise<Principal | undefined> {
369:     const hash = sha256(token);
370:     const session = await this.ids.sessions.get(hash);
371:     if (!session) return undefined;
372:     const t = Date.now();
373:     const idleLimit = new Date(session.lastSeenAt).getTime() + this.config.sessionIdleMinutes * 60_000;
374:     if (new Date(session.expiresAt).getTime() <= t || idleLimit <= t) {
375:       await this.ids.sessions.delete(hash);
376:       return undefined;
377:     }
378:     const user = await this.ids.users.get(session.userId);
379:     if (!user || user.disabled) return undefined;
380:     // Sliding idle window, written at most once a minute.
381:     if (t - new Date(session.lastSeenAt).getTime() > 60_000) {
382:       session.lastSeenAt = new Date(t).toISOString();
383:       await this.ids.sessions.update(hash, session);
384:     }
385:     return { kind: "user", id: user.id, label: userLabel(user), user, session, sessionHash: hash };
386:   }
387:
388:   async endSession(principal: Principal): Promise<void> {
389:     if (principal.kind === "user") await this.ids.sessions.delete(principal.sessionHash);
390:   }
391:
392:   async switchTenant(principal: Principal, tenantId: string): Promise<void> {
393:     if (principal.kind !== "user") throw new ValidationError("API tokens belong to one organization");
394:     if (!(await this.roleIn(principal, tenantId))) throw new NotFoundError("Organization not found");
395:     await this.ids.sessions.update(principal.sessionHash, { ...principal.session, activeTenantId: tenantId });
396:   }
397:
398:   // -------------------------------------------------------------------------
399:   // API tokens
400:   // -------------------------------------------------------------------------
401:
402:   async createApiToken(tenantId: string, input: { name: string; role: Role; expiresInDays?: number }, by: Principal): Promise<{ token: string; record: ApiTokenRecord }> {
403:     const actorRole = await this.roleIn(by, tenantId);
404:     if (!can(actorRole, "tenant.manage")) throw new ForbiddenError("Creating API tokens requires the admin or owner role");
405:     if (input.role === "owner") throw new ValidationError("API tokens cannot hold the owner role");
406:     if (roleRank(input.role) > roleRank(actorRole!)) throw new ForbiddenError("A token cannot hold a role above your own");
407:     const name = input.name.trim();
408:     if (!name) throw new ValidationError("Name the token after what uses it");
409:     const token = `vsa_${randomToken(32)}`;
410:     const ts = now();
411:     const record: ApiTokenRecord = {
412:       id: newId("tok"),
413:       tenantId,
414:       name,
415:       role: input.role,
416:       prefix: token.slice(0, 10),
417:       createdBy: by.id,
418:       createdAt: ts,
419:       expiresAt: input.expiresInDays ? addMinutes(input.expiresInDays * 24 * 60) : undefined,
420:     };
421:     await this.svc.store.atomic(async () => {
422:       await this.ids.apiTokens.create(sha256(token), record);
423:       await this.audit(tenantId, by, "created", "api-token", record.id, `API token “${name}” created (${input.role}${record.expiresAt ? `, expires ${record.expiresAt.slice(0, 10)}` : ""})`);
424:     });
425:     return { token, record };
426:   }
427:
428:   async resolveApiToken(raw: string): Promise<Principal | undefined> {
429:     if (!raw.startsWith("vsa_")) return undefined;
430:     const record = await this.ids.apiTokens.byHash(sha256(raw));
431:     if (!record || record.revokedAt || (record.expiresAt && record.expiresAt <= now())) return undefined;
432:     const t = Date.now();
433:     if (!record.lastUsedAt || t - new Date(record.lastUsedAt).getTime() > 60_000) await this.ids.apiTokens.touch(record.id, new Date(t).toISOString());
434:     return { kind: "token", id: record.id, label: `API token “${record.name}”`, token: record };
435:   }
436:
437:   async revokeApiToken(tenantId: string, id: string, by: Principal): Promise<void> {
438:     if (!(await this.can(by, tenantId, "tenant.manage"))) throw new ForbiddenError("Revoking API tokens requires the admin or owner role");
439:     await this.svc.store.atomic(async () => {
440:       if (!(await this.ids.apiTokens.revoke(tenantId, id))) throw new NotFoundError("Token not found or already revoked");
441:       await this.audit(tenantId, by, "revoked", "api-token", id, `API token revoked`);
442:     });
443:   }
444:
445:   // -------------------------------------------------------------------------
446:   // SSO connections
447:   // -------------------------------------------------------------------------
448:
449:   /**
450:    * Create or change an SSO connection. Whoever controls a connection's identity provider
451:    * can sign in as any member on its domains, owners included: choosing the provider
452:    * (issuer, client, secret, domains) is an owner decision. Admins manage the rest.
453:    */
454:   async upsertSsoConnection(tenantId: string, input: SsoConnectionInput & { id?: string }, by: Principal): Promise<SsoConnection> {
455:     if (!(await this.can(by, tenantId, "tenant.manage"))) throw new ForbiddenError("Configuring SSO requires the admin or owner role");
456:     if (this.config.mode === "oidc" && this.config.secretIsDefault && input.clientSecret) throw new ValidationError("Set VISUA_SECRET on the server before storing SSO client secrets");
457:     let issuer: URL;
458:     try {
459:       issuer = new URL(input.issuer.trim());
460:     } catch {
461:       throw new ValidationError("The issuer must be a URL, e.g. https://login.example.com/");
462:     }
463:     if (issuer.protocol !== "https:" && !this.config.allowHttpIssuers) throw new ValidationError("The issuer must use https");
464:     // Names are checked again at every request, on the addresses they resolve to (egress.ts).
465:     if (refusedLiteral(issuer, privateHostAllowed(this.config.privateIssuerHosts))) {
466:       throw new ValidationError("The issuer is a private or local address. The server operator can allow an internal identity provider with VISUA_OIDC_PRIVATE_ISSUERS.");
467:     }
468:     const domains = [...new Set(input.domains.map((d) => d.trim().toLowerCase().replace(/^@/, "")).filter(Boolean))];
469:     if (!domains.length) throw new ValidationError("List at least one email domain this connection signs in");
470:     if (domains.some((d) => !/^[a-z0-9.-]+\.[a-z]{2,}$/.test(d))) throw new ValidationError("Email domains look like example.com");
471:     const role = input.defaultRole ?? "viewer";
472:     if (role === "owner" || role === "admin") throw new ValidationError("Provisioned members start at approver or below");
473:     return this.svc.store.atomic(async () => {
474:       await this.svc.store.lock("sso-domains");
475:       const existing = input.id ? await this.ids.sso.get(input.id) : undefined;
476:       if (input.id && (!existing || existing.tenantId !== tenantId)) throw new NotFoundError("SSO connection not found");
477:       const issuerUrl = issuer.toString().replace(/\/$/, "");
478:       const providerChanged =
479:         !existing || existing.issuer !== issuerUrl || existing.clientId !== input.clientId.trim() || !!input.clientSecret || existing.domains.join(",") !== domains.join(",");
480:       if (providerChanged && !(await this.can(by, tenantId, "tenant.own"))) {
481:         throw new ForbiddenError("Only owners choose an SSO connection's identity provider, client and domains: whoever controls it can sign in as any member");
482:       }
483:       const enabled = input.enabled ?? existing?.enabled ?? true;
484:       if (existing?.enabled && !enabled) {
485:         const tenant = await this.tenant(tenantId);
486:         const others = (await this.ids.sso.forTenant(tenantId)).filter((c) => c.enabled && c.id !== existing.id);
487:         if (tenant.settings.requireSso && !others.length) throw new ValidationError("Turn off “Require SSO” before disabling the last connection");
488:       }
489:       // Pending claims from different organizations can coexist (a claim alone proves nothing);
490:       // a verified one is final, and an organization lists each domain on one connection.
491:       for (const d of domains) {
492:         for (const claim of await this.ids.sso.claimants(d)) {
493:           if (claim.connectionId === existing?.id) continue;
494:           if (claim.verified) throw new ValidationError(`The domain ${d} is verified by another SSO connection`);
495:           if (claim.tenantId === tenantId) throw new ValidationError(`The domain ${d} is already listed on another of this organization's SSO connections`);
496:         }
497:       }
498:       const ts = now();
499:       // Each domain keeps its challenge (and proof) while it stays listed; a new one gets a fresh
500:       // challenge, or is trusted as claimed when the operator turned verification off.
501:       const trusted = this.config.ssoDomainVerification === "off";
502:       const verification: Record<string, DomainVerification> = {};
503:       for (const d of domains) {
504:         verification[d] = existing?.verification?.[d] ?? { token: randomBytes(16).toString("hex"), ...(trusted ? { verifiedAt: ts, method: "trusted" as const } : {}) };
505:       }
506:       // A stored secret belongs to its provider: a new issuer or client needs its own.
507:       const samePartner = !!existing && existing.issuer === issuerUrl && existing.clientId === input.clientId.trim();
508:       const connection: SsoConnection = {
509:         id: existing?.id ?? newId("sso"),
510:         tenantId,
511:         name: input.name.trim() || "Single sign-on",
512:         issuer: issuerUrl,
513:         clientId: input.clientId.trim(),
514:         clientSecretSealed: input.clientSecret ? seal(input.clientSecret, this.config.secret) : samePartner ? existing.clientSecretSealed : undefined,
515:         domains,
516:         verification,
517:         jitProvisioning: input.jitProvisioning ?? existing?.jitProvisioning ?? false,
518:         defaultRole: role,
519:         enabled,
520:         createdAt: existing?.createdAt ?? ts,
521:         updatedAt: ts,
522:       };
523:       if (!connection.clientId) throw new ValidationError("The client id is required");
524:       await this.ids.sso.put(connection);
525:       this.oidcConfigs.delete(connection.id);
526:       const pending = domains.filter((d) => !verification[d]!.verifiedAt);
527:       await this.audit(
528:         tenantId,
529:         by,
530:         existing ? "updated" : "created",
531:         "sso-connection",
532:         connection.id,
533:         `SSO connection “${connection.name}” ${existing ? "updated" : "added"} for ${domains.join(", ")}${pending.length ? ` (awaiting DNS verification: ${pending.join(", ")})` : ""}`,
534:       );
535:       return connection;
536:     });
537:   }
538:
539:   /**
540:    * Prove a connection's domain: its TXT record `_visua-challenge.<domain>` must carry the
541:    * connection's token. Only then are the domain's people routed to the connection and
542:    * admitted by it. DNS is asked outside any transaction; the result is recorded under the
543:    * domain lock, and the first organization to prove a domain holds it.
544:    */
545:   async verifySsoDomain(tenantId: string, id: string, domain: string, by: Principal): Promise<SsoConnection> {
546:     if (!(await this.can(by, tenantId, "tenant.manage"))) throw new ForbiddenError("Verifying SSO domains requires the admin or owner role");
547:     const d = domain.trim().toLowerCase();
548:     const before = await this.ids.sso.get(id);
549:     if (!before || before.tenantId !== tenantId) throw new NotFoundError("SSO connection not found");
550:     const challenge = before.verification?.[d];
551:     if (!before.domains.includes(d) || !challenge) throw new NotFoundError(`${d} is not one of this connection's domains`);
552:     if (challenge.verifiedAt && !challenge.failingSince) return before;
553:     const record = challengeRecord(d, challenge.token);
554:     const { outcome, code } = await this.lookupChallenge(d, challenge.token);
555:     if (outcome === "unknown") throw new ValidationError(`The DNS lookup of ${record.name} failed (${code ?? "error"}). Try again in a moment.`);
556:     if (outcome === "missing") throw new ValidationError(`No TXT record ${record.name} with the value ${record.value} was found. DNS changes can take a while to appear: try again later.`);
557:     return this.svc.store.atomic(async () => {
558:       await this.svc.store.lock("sso-domains");
559:       const c = await this.ids.sso.get(id);
560:       const current = c?.verification?.[d];
561:       if (!c || c.tenantId !== tenantId || !c.domains.includes(d) || current?.token !== challenge.token) {
562:         throw new ValidationError("The connection changed while its domain was being verified. Try again.");
563:       }
564:       const owner = await this.ids.sso.domainOwner(d);
565:       if (owner && owner !== c.id) throw new ValidationError(`The domain ${d} is verified by another SSO connection`);
566:       const ts = now();
567:       const { failingSince, lapsesAt, lapsedAt, ...kept } = current;
568:       const next: SsoConnection = {
569:         ...c,
570:         verification: {
571:           ...c.verification,
572:           // With re-checks off the schedule is still written, a day ahead, so turning them on later picks the domain up.
573:           [d]: { ...kept, verifiedAt: ts, method: "dns", lastCheckedAt: ts, nextCheckAt: new Date(Date.now() + (this.recheckSettings.intervalMs || 86_400_000)).toISOString() },
574:         },
575:         updatedAt: ts,
576:       };
577:       await this.ids.sso.put(next);
578:       await this.audit(tenantId, by, "verified", "sso-domain", c.id, `Domain ${d} verified by DNS for SSO connection “${c.name}”`, { domain: d, record: record.name });
579:       return next;
580:     });
581:   }
582:
583:   /**
584:    * Re-check SSO domains proven by DNS that are due at `at` (every server instance calls this
585:    * from its ticker). Claims up to RECHECK_BATCH due domains under the domain lock, pushing each
586:    * one's next check out by a lease so other instances skip it; looks each up outside any
587:    * transaction; records each result in its own transaction. Returns how many were claimed.
588:    */
589:   async recheckDueDomains(at: Date = new Date()): Promise<number> {
590:     if (!this.domainRechecksEnabled) return 0;
591:     const lease = new Date(at.getTime() + LEASE_MS).toISOString();
592:     const claimed = await this.svc.store.atomic(async () => {
593:       await this.svc.store.lock("sso-domains");
594:       const out: { connectionId: string; domain: string; token: string }[] = [];
595:       for (const due of await this.ids.sso.dueForRecheck(at.toISOString(), RECHECK_BATCH)) {
596:         const c = await this.ids.sso.get(due.connectionId);
597:         const v = c?.verification?.[due.domain];
598:         if (!c || !v) continue;
599:         // A lapsed domain another connection has proven is not looked up while that one holds it;
600:         // it is looked at again an interval later, so it can recover once the holder is gone.
601:         const owner = v.lapsedAt ? await this.ids.sso.domainOwner(due.domain) : undefined;
602:         const held = !!owner && owner !== c.id;
603:         const nextCheckAt = held ? new Date(at.getTime() + this.recheckSettings.intervalMs).toISOString() : lease;
604:         await this.ids.sso.put({ ...c, verification: { ...c.verification, [due.domain]: { ...v, nextCheckAt } } });
605:         if (!held) out.push({ connectionId: c.id, domain: due.domain, token: v.token });
606:       }
607:       return out;
608:     });
609:     for (const claim of claimed) await this.recordRecheck(claim, (await this.lookupChallenge(claim.domain, claim.token)).outcome, at);
610:     return claimed.length;
611:   }
612:
613:   private async recordRecheck(claim: { connectionId: string; domain: string; token: string }, outcome: LookupOutcome, at: Date): Promise<void> {
614:     await this.svc.store.atomic(async () => {
615:       await this.svc.store.lock("sso-domains");
616:       const c = await this.ids.sso.get(claim.connectionId);
617:       const v = c?.verification?.[claim.domain];
618:       // The connection changed while the domain was looked up: this answer is about an old challenge.
619:       if (!c || !v || !c.domains.includes(claim.domain) || v.token !== claim.token) return;
620:       if (outcome === "found" && v.lapsedAt) {
621:         const owner = await this.ids.sso.domainOwner(claim.domain);
622:         if (owner && owner !== c.id) return;
623:       }
624:       const { next, event } = applyOutcome(v, outcome, at, this.recheckSettings);
625:       await this.ids.sso.put({ ...c, verification: { ...c.verification, [claim.domain]: next } });
626:       if (event) {
627:         const record = challengeRecord(claim.domain, v.token);
628:         await this.audit(c.tenantId, "Domain re-check", event, "sso-domain", c.id, recheckSummary(event, claim.domain, record.name, c.name, next), { domain: claim.domain, record: record.name });
629:       }
630:     });
631:   }
632:
633:   async deleteSsoConnection(tenantId: string, id: string, by: Principal): Promise<void> {
634:     if (!(await this.can(by, tenantId, "tenant.own"))) throw new ForbiddenError("Only owners remove an SSO connection");
635:     await this.svc.store.atomic(async () => {
636:       // A re-check holding this lock may be about to write the connection back: wait for it.
637:       await this.svc.store.lock("sso-domains");
638:       const tenant = await this.tenant(tenantId);
639:       const remaining = (await this.ids.sso.forTenant(tenantId)).filter((c) => c.enabled && c.id !== id);
640:       if (tenant.settings.requireSso && !remaining.length) throw new ValidationError("Turn off “Require SSO” before removing the last connection");
641:       if (!(await this.ids.sso.delete(tenantId, id))) throw new NotFoundError("SSO connection not found");
642:       this.oidcConfigs.delete(id);
643:       await this.audit(tenantId, by, "deleted", "sso-connection", id, `SSO connection removed`);
644:     });
645:   }
646:
647:   /** Where an email address signs in: its organization's SSO, else the platform provider. */
648:   async discover(email: string): Promise<{ connection: string; name: string } | undefined> {
649:     const domain = email.trim().toLowerCase().split("@")[1];
650:     const c = domain ? await this.ids.sso.byDomain(domain) : undefined;
651:     if (c?.enabled) return { connection: c.id, name: c.name };
652:     if (this.config.platform) return { connection: PLATFORM, name: this.config.platform.name };
653:     return undefined;
654:   }
655:
656:   // -------------------------------------------------------------------------
657:   // OpenID Connect
658:   // -------------------------------------------------------------------------
659:
660:   get redirectUri(): string {
661:     return `${this.config.publicUrl}/api/auth/oidc/callback`;
662:   }
663:
664:   private async oidcFor(connectionId: string): Promise<{ config: oidc.Configuration; connection?: SsoConnection }> {
665:     const connection = connectionId === PLATFORM ? undefined : await this.ids.sso.get(connectionId);
666:     if (connectionId !== PLATFORM && (!connection || !connection.enabled)) throw new UnauthorizedError("This SSO connection is not available");
667:     const settings = connection
668:       ? { issuer: connection.issuer, clientId: connection.clientId, clientSecret: connection.clientSecretSealed ? unseal(connection.clientSecretSealed, this.config.secret) : undefined }
669:       : this.config.platform;
670:     if (!settings) throw new UnauthorizedError("No identity provider is configured");
671:     const cached = this.oidcConfigs.get(connectionId);
672:     if (cached && Date.now() - cached.at < 3_600_000) return { config: cached.config, connection };
673:     const execute = this.config.allowHttpIssuers ? [oidc.allowInsecureRequests] : [];
674:     const auth = settings.clientSecret ? oidc.ClientSecretPost(settings.clientSecret) : oidc.None();
675:     // An organization's provider is chosen by its owner: its requests may not reach private
676:     // addresses. The platform provider is the operator's own configuration.
677:     const fetchOptions = connection ? { [oidc.customFetch]: guardedFetch(privateHostAllowed(this.config.privateIssuerHosts)) } : {};
678:     const config = await explained(oidc.discovery(new URL(settings.issuer), settings.clientId, undefined, auth, { execute, ...fetchOptions }));
679:     this.oidcConfigs.set(connectionId, { config, at: Date.now() });
680:     return { config, connection };
681:   }
682:
683:   /**
684:    * Build the authorization request and remember its state, nonce and PKCE verifier
685:    * (single use, 10 minutes), bound to the browser that started it: `browser` is the
686:    * value of a pre-auth cookie only that browser holds.
687:    */
688:   async startLogin(connectionId: string, returnTo = "/", browser = ""): Promise<URL> {
689:     if (!browser) throw new UnauthorizedError("Sign-in could not be started in this browser");
690:     const { config } = await this.oidcFor(connectionId);
691:     const state = oidc.randomState();
692:     const nonce = oidc.randomNonce();
693:     const codeVerifier = oidc.randomPKCECodeVerifier();
694:     await this.ids.loginFlows.purgeExpired();
695:     await this.ids.loginFlows.put(sha256(state), { connection: connectionId, codeVerifier, nonce, returnTo: safeReturnTo(returnTo), binding: sha256(browser), createdAt: now() }, addMinutes(10));
696:     return oidc.buildAuthorizationUrl(config, {
697:       redirect_uri: this.redirectUri,
698:       scope: "openid email profile",
699:       state,
700:       nonce,
701:       code_challenge: await oidc.calculatePKCECodeChallenge(codeVerifier),
702:       code_challenge_method: "S256",
703:     });
704:   }
705:
706:   /** Complete the flow: verify the response, map the identity to a member, and open a session. */
707:   async finishLogin(callback: URL, userAgent?: string, browser = ""): Promise<{ token: string; returnTo: string }> {
708:     const state = callback.searchParams.get("state");
709:     if (!state) throw new UnauthorizedError("The sign-in response has no state");
710:     const flow = await this.ids.loginFlows.take(sha256(state));
711:     if (!flow) throw new UnauthorizedError("This sign-in link expired or was already used. Start again.");
712:     // A sign-in finishes only in the browser that started it (no login CSRF with a captured callback URL).
713:     if (!flow.binding || !browser || !safeEqual(flow.binding, sha256(browser))) throw new UnauthorizedError("This sign-in was started in another browser. Start again.");
714:     const idpError = callback.searchParams.get("error");
715:     if (idpError) throw new UnauthorizedError(`The identity provider refused the sign-in (${idpError})`);
716:     const { config, connection } = await this.oidcFor(flow.connection);
717:     const tokens = await explained(
718:       oidc.authorizationCodeGrant(
719:         config,
720:         new URL(`${this.redirectUri}${callback.search}`),
721:         { pkceCodeVerifier: flow.codeVerifier, expectedState: state, expectedNonce: flow.nonce, idTokenExpected: true },
722:       ),
723:     );
724:     const claims = tokens.claims();
725:     if (!claims) throw new UnauthorizedError("The identity provider returned no ID token");
726:     const email = typeof claims["email"] === "string" ? claims["email"].trim().toLowerCase() : undefined;
727:     // The platform provider's sessions reach every organization: its email must be verified
728:     // explicitly (VISUA_OIDC_TRUST_EMAIL=1 for providers that verify without saying so). An
729:     // organization's own provider only reaches that organization; it must not deny it.
730:     const emailVerified = claims["email_verified"] === true || (claims["email_verified"] === undefined && (!!connection || this.config.trustPlatformEmail));
731:     const displayName =
732:       (typeof claims["name"] === "string" && claims["name"]) ||
733:       [claims["given_name"], claims["family_name"]].filter((x) => typeof x === "string").join(" ") ||
734:       email?.split("@")[0] ||
735:       "Member";
736:     const user = await this.svc.store.atomic(() => this.resolveIdentity({ issuer: claims.iss, subject: claims.sub, email, emailVerified, name: displayName }, connection));
737:     const method = connection ? `oidc:${connection.id}` : `oidc:${PLATFORM}`;
738:     const { token } = await this.createSession(user, method, { tenantScope: connection?.tenantId, userAgent });
739:     return { token, returnTo: flow.returnTo };
740:   }
741:
742:   private async resolveIdentity(id: { issuer: string; subject: string; email?: string; emailVerified: boolean; name: string }, connection?: SsoConnection): Promise<User> {
743:     await this.svc.store.lock(`identity:${id.issuer}|${id.subject}`);
744:     const linked = await this.ids.identities.find(id.issuer, id.subject);
745:     let user = linked ? await this.ids.users.get(linked.userId) : undefined;
746:     if (!user) {
747:       if (!id.email || !id.emailVerified) throw new ForbiddenError("Your identity provider did not share a verified email address");
748:       // A connection admits new people only from domains its organization has proven.
749:       const proven = connection ? verifiedDomains(connection) : [];
750:       const emailDomain = id.email.split("@")[1]!;
751:       if (connection && !proven.includes(emailDomain)) {
752:         if (connection.domains.includes(emailDomain) && connection.verification?.[emailDomain]?.lapsedAt) {
753:           throw new ForbiddenError(`This sign-in no longer admits new people from ${emailDomain}: its DNS proof has lapsed. Ask an administrator of your organization.`);
754:         }
755:         throw new ForbiddenError(proven.length ? `This sign-in is for ${proven.join(", ")} addresses` : "This SSO connection has no verified email domain yet");
756:       }
757:       user = await this.ids.users.getByEmail(id.email);
758:       if (!user && connection?.jitProvisioning) user = await this.ensureUser(id.email, id.name);
759:       if (!user) throw new ForbiddenError("You have no access to Visua yet. Ask an administrator of your organization to add you.");
760:       await this.ids.identities.link(id.issuer, id.subject, user.id, id.email);
761:     } else {
762:       await this.ids.identities.link(id.issuer, id.subject, user.id, id.email);
763:     }
764:     if (user.disabled) throw new ForbiddenError("This account is disabled");
765:     if (connection) {
766:       const membership = await this.ids.memberships.get(connection.tenantId, user.id);
767:       if (!membership) {
768:         if (!connection.jitProvisioning) throw new ForbiddenError("You are not a member of this organization. Ask an administrator to add you.");
769:         const ts = now();
770:         await this.ids.memberships.put({ tenantId: connection.tenantId, userId: user.id, role: connection.defaultRole, addedBy: `sso:${connection.id}`, createdAt: ts, updatedAt: ts });
771:         await this.audit(connection.tenantId, `SSO “${connection.name}”`, "provisioned", "member", user.id, `${user.email} provisioned on first sign-in as ${connection.defaultRole}`);
772:       }
773:     } else if (!(await this.ids.memberships.forUser(user.id)).length) {
774:       throw new ForbiddenError("You have no access to Visua yet. Ask an administrator of your organization to add you.");
775:     }
776:     // A provider names the people it signs in for the first time, but an organization's own
777:     // provider never renames someone who also belongs to other organizations.
778:     if (id.name && id.name !== user.name && !linked) {
779:       const elsewhere = connection && (await this.ids.memberships.forUser(user.id)).some((m) => m.tenant.id !== connection.tenantId);
780:       if (!elsewhere) user = await this.ids.users.put({ ...user, name: id.name, updatedAt: now() });
781:     }
782:     return user;
783:   }
784:
785:   // -------------------------------------------------------------------------
786:   // Developer sign-in and bootstrap
787:   // -------------------------------------------------------------------------
788:
789:   /** Password-less sign-in for local development and demos. Refused unless VISUA_AUTH_MODE=dev. */
790:   async devLogin(email: string, name?: string, userAgent?: string): Promise<{ token: string; user: User }> {
791:     if (this.config.mode !== "dev") throw new ForbiddenError("Developer sign-in is disabled on this server");
792:     const user = await this.svc.store.atomic(async () => {
793:       const u = await this.ensureUser(email, name);
794:       if ((await this.ids.memberships.forUser(u.id)).length) return u;
795:       // First sign-in: claim an unowned default organization (an upgraded single-user install), else start a new one.
796:       const def = await this.ids.tenants.get(DEFAULT_TENANT_ID);
797:       if (def && (await this.ids.memberships.owners(def.id)) === 0) {
798:         const ts = now();
799:         await this.ids.memberships.put({ tenantId: def.id, userId: u.id, role: "owner", createdAt: ts, updatedAt: ts });
800:         await this.audit(def.id, userLabel(u), "claimed", "organization", def.id, `${u.email} became the owner of “${def.name}”`);
801:       } else {
802:         await this.createTenant(`${u.name}'s organization`, u, userLabel(u));
803:       }
804:       return u;
805:     });
806:     const { token } = await this.createSession(user, "dev", { userAgent });
807:     return { token, user };
808:   }
809:
810:   /** Personas offered on the developer sign-in screen. */
811:   async devPersonas(limit = 16): Promise<{ email: string; name: string; organizations: { name: string; role: Role }[] }[]> {
812:     if (this.config.mode !== "dev") return [];
813:     const out: { email: string; name: string; organizations: { name: string; role: Role }[] }[] = [];
814:     for (const tenant of await this.ids.tenants.list()) {
815:       for (const { user, membership } of await this.ids.memberships.forTenant(tenant.id)) {
816:         let entry = out.find((p) => p.email === user.email);
817:         if (!entry) {
818:           if (out.length >= limit) continue;
819:           entry = { email: user.email, name: user.name, organizations: [] };
820:           out.push(entry);
821:         }
822:         entry.organizations.push({ name: tenant.name, role: membership.role });
823:       }
824:     }
825:     return out;
826:   }
827:
828:   /** Startup: give an unowned organization its first owner, or create the first organization. */
829:   async bootstrap(): Promise<void> {
830:     const email = this.config.bootstrapOwnerEmail;
831:     if (!email) return;
832:     await this.svc.store.atomic(async () => {
833:       await this.svc.store.lock("bootstrap");
834:       const user = await this.ensureUser(email);
835:       const tenants = await this.ids.tenants.list();
836:       for (const t of tenants) {
837:         if ((await this.ids.memberships.owners(t.id)) === 0) {
838:           const ts = now();
839:           await this.ids.memberships.put({ tenantId: t.id, userId: user.id, role: "owner", createdAt: ts, updatedAt: ts });
840:           await this.audit(t.id, "bootstrap", "added", "member", user.id, `${user.email} added as owner (VISUA_BOOTSTRAP_OWNER_EMAIL)`);
841:         }
842:       }
843:       if (!tenants.length) await this.createTenant(this.config.bootstrapOrgName, user, "bootstrap");
844:     });
845:   }
846:
847:   /** The principal as recorded in the audit trail. */
848:   static auditPrincipal(p: Principal): AuditPrincipal {
849:     return { id: p.id, label: p.label };
850:   }
851: }
852:
853: /** A request refused for its address becomes a sign-in error that says why. */
854: async function explained<T>(request: Promise<T>): Promise<T> {
855:   try {
856:     return await request;
857:   } catch (err) {
858:     const refused = privateAddressCause(err);
859:     if (refused) throw new UnauthorizedError(refused.message);
860:     throw err;
861:   }
862: }
863:
864: /**
865:  * Only same-site relative paths: never an open redirect. Browsers drop tabs and line
866:  * breaks from URLs and read backslashes as slashes, so "/\t/evil.example" or
867:  * "/\\evil.example" would leave the site: such paths fall back to "/".
868:  */
869: export function safeReturnTo(value: string | undefined): string {
870:   if (!value || !/^\/(?![\/\\])[^\s\\\x00-\x1f\x7f]*$/.test(value)) return "/";
871:   return value.slice(0, 500);
872: }

FILE apps/server/src/bus.ts SHA256 36f2b9a2e2fc9d9c10912569732dd97a755ea8512adf58c71c3a49f48452426e
1: import { randomUUID } from "node:crypto";
2: import { EventEmitter } from "node:events";
3:
4: export type VisuaEventType =
5:   | "workspace.updated"
6:   | "state.updated"
7:   | "task.created"
8:   | "task.updated"
9:   | "task.deleted"
10:   | "evidence.created"
11:   | "evidence.updated"
12:   | "policy.created"
13:   | "policy.updated"
14:   | "risk.updated"
15:   | "check.completed"
16:   | "agent.run.created"
17:   | "agent.run.updated"
18:   | "agent.step"
19:   | "proposal.created"
20:   | "proposal.updated"
21:   | "activity";
22:
23: export interface VisuaEvent {
24:   type: VisuaEventType;
25:   workspaceId: string;
26:   at: string;
27:   data: unknown;
28:   /** Set when a large event crossed instances with only its identifying fields. */
29:   partial?: boolean;
30: }
31:
32: /** Forwards events to other server instances (see storage/events.ts). */
33: export interface BusRelay {
34:   send(event: VisuaEvent): void;
35: }
36:
37: /** In-process pub/sub, one channel per workspace, consumed by the SSE endpoint. */
38: export class EventBus {
39:   readonly instanceId = randomUUID();
40:   private readonly emitter = new EventEmitter();
41:   private relay?: BusRelay;
42:   private seq = 0;
43:
44:   constructor() {
45:     this.emitter.setMaxListeners(1000);
46:   }
47:
48:   attachRelay(relay: BusRelay): void {
49:     this.relay = relay;
50:   }
51:
52:   publish(workspaceId: string, type: VisuaEventType, data: unknown): VisuaEvent & { id: number } {
53:     const event = { id: ++this.seq, type, workspaceId, at: new Date().toISOString(), data };
54:     this.emitter.emit(workspaceId, event);
55:     this.relay?.send(event);
56:     return event;
57:   }
58:
59:   /** Deliver an event published by another instance to this instance's subscribers. */
60:   deliver(event: VisuaEvent): void {
61:     this.emitter.emit(event.workspaceId, { ...event, id: ++this.seq });
62:   }
63:
64:   subscribe(workspaceId: string, listener: (event: VisuaEvent & { id: number }) => void): () => void {
65:     this.emitter.on(workspaceId, listener);
66:     return () => this.emitter.off(workspaceId, listener);
67:   }
68: }

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

FILE apps/server/src/context.ts SHA256 3a203caaf66980c425915c7fb97768f597046ef87d446e4f67b601b936da747a
1: import { resolve } from "node:path";
2: import { FrameworkRegistry, REPO_ROOT } from "@visua/frameworks";
3: import { EventBus } from "./bus.ts";
4: import { PgEventRelay } from "./storage/events.ts";
5: import { openStore } from "./storage/index.ts";
6: import { VisuaService } from "./services/visua.ts";
7:
8: export interface ServiceOptions {
9:   /** `postgres://…` URL, SQLite file path, or ":memory:" for tests. */
10:   database?: string;
11:   registry?: FrameworkRegistry;
12: }
13:
14: /** The database URL: VISUA_DATABASE_URL (Postgres or SQLite), then VISUA_DB (SQLite path), then <repo>/data/visua.db. */
15: export function databaseUrl(): string {
16:   return process.env["VISUA_DATABASE_URL"] || process.env["VISUA_DB"] || resolve(REPO_ROOT, "data", "visua.db");
17: }
18:
19: export async function createService(options: ServiceOptions = {}): Promise<VisuaService> {
20:   const url = options.database ?? databaseUrl();
21:   const store = await openStore(url);
22:   const registry = options.registry ?? FrameworkRegistry.load();
23:   const bus = new EventBus();
24:   // Several instances on one Postgres database share live events through LISTEN/NOTIFY.
25:   if (store.dialect === "postgres") await PgEventRelay.start(url, bus, store);
26:   return new VisuaService(store, registry, bus);
27: }

FILE apps/server/src/index.ts SHA256 eece1726ae67040cade55da6147ba87e1921143ad9531d2a703adca7c7758b36
1: /**
2:  * Visua server entry point.
3:  *   VISUA_PORT (default 8787)
4:  *   VISUA_DATABASE_URL: postgres://… for PostgreSQL, or a SQLite file path (default <repo>/data/visua.db; VISUA_DB also accepted)
5:  *   VISUA_AGENT_MODE=auto|claude|offline · VISUA_MODEL (default claude-opus-5)
6:  *   Sign-in, roles and SSO: see src/auth/config.ts (VISUA_AUTH_MODE, VISUA_PUBLIC_URL, VISUA_OIDC_*, …)
7:  */
8: import { existsSync } from "node:fs";
9: import { resolve } from "node:path";
10: import { serve } from "@hono/node-server";
11: import { serveStatic } from "@hono/node-server/serve-static";
12: import { claudeEnabled, configuredModel } from "@visua/agents";
13: import { REPO_ROOT } from "@visua/frameworks";
14: import { createApp } from "./app.ts";
15: import { loadAuthConfig } from "./auth/config.ts";
16: import { AuthService, RECHECK_BATCH } from "./auth/service.ts";
17: import { startDomainRechecks } from "./auth/recheck-ticker.ts";
18: import { createService, databaseUrl } from "./context.ts";
19: import { describeDatabase } from "./storage/index.ts";
20: import { seedDemo } from "./seed/demo.ts";
21:
22: const port = Number(process.env["VISUA_PORT"] ?? 8787);
23: const svc = await createService();
24: const auth = new AuthService(svc, loadAuthConfig());
25:
26: if (!svc.registry.indexes.size) {
27:   console.error("[visua] No framework data found. Run `pnpm ingest` to build it from the local corpus.");
28:   process.exit(1);
29: }
30: if (process.env["VISUA_SEED"] !== "0" && (await svc.store.workspaces.list()).length === 0) {
31:   console.log("[visua] Seeding the Northwind Health demo workspace…");
32:   await seedDemo(svc, auth);
33: }
34: await auth.bootstrap();
35: // SSO domains proven by DNS are looked at again; each instance ticks, claims keep them apart.
36: if (auth.domainRechecksEnabled) {
37:   startDomainRechecks(async () => {
38:     while ((await auth.recheckDueDomains()) === RECHECK_BATCH);
39:   });
40: }
41: if (auth.config.mode === "oidc" && !auth.config.platform && !(await svc.store.identity.tenants.count())) {
42:   console.warn("[visua] No identity provider and no organization: set VISUA_OIDC_* and VISUA_BOOTSTRAP_OWNER_EMAIL to sign in.");
43: }
44:
45: const app = createApp(svc, auth);
46: const webDist = resolve(REPO_ROOT, "apps/web/dist");
47: if (existsSync(webDist)) {
48:   // Built assets carry a content hash in their names: they never change under the same URL.
49:   app.use("/assets/*", async (c, next) => {
50:     await next();
51:     if (c.res.ok) c.header("Cache-Control", "public, max-age=31536000, immutable");
52:   });
53:   app.use("/*", serveStatic({ root: webDist }));
54:   app.get("*", serveStatic({ path: resolve(webDist, "index.html") }));
55: }
56:
57: serve({ fetch: app.fetch, port }, (info) => {
58:   console.log(`[visua] API on http://localhost:${info.port} · frameworks: ${[...svc.registry.indexes.keys()].join(", ")}`);
59:   console.log(`[visua] Agents: ${claudeEnabled() ? `Claude (${configuredModel()})` : "offline playbooks (set ANTHROPIC_API_KEY to enable Claude)"}`);
60:   console.log(`[visua] Corpus index: ${svc.registry.search.size} passages · crosswalk: ${svc.registry.crosswalk.size} mappings`);
61:   console.log(`[visua] Storage: ${describeDatabase(databaseUrl())}`);
62:   console.log(
63:     `[visua] Sign-in: ${auth.config.mode === "dev" ? "developer mode (password-less personas; never expose this server)" : `OpenID Connect${auth.config.platform ? ` via ${auth.config.platform.issuer}` : ""} + per-organization SSO`}`,
64:   );
65:   console.log(`[visua] SSO domain re-checks: ${auth.domainRechecksEnabled ? `every ${auth.config.domainRecheckHours} h, lapse after ${auth.config.domainRecheckGraceDays} days` : "off"}`);
66: });

FILE apps/server/src/seed/cli.ts SHA256 e328ef55024a72453ee129fa644c31e97cbcae6f5b018aebb87cd2cb8eea6616
1: /** Re-create the demo workspace: `pnpm --filter @visua/server seed [--reset]`. */
2: import { loadAuthConfig } from "../auth/config.ts";
3: import { AuthService } from "../auth/service.ts";
4: import { createService } from "../context.ts";
5: import { seedDemo } from "./demo.ts";
6:
7: const svc = await createService();
8: // The workspace belongs to the demo organization, created with its personas when missing.
9: const auth = new AuthService(svc, loadAuthConfig());
10: if (process.argv.includes("--reset")) {
11:   const ws = await svc.store.workspaces.get("northwind-health");
12:   if (ws) await svc.deleteWorkspace(ws.id, "seed --reset");
13: }
14: const id = await seedDemo(svc, auth);
15: console.log(`[visua] Demo workspace ready: ${id}`);
16: await svc.store.close();

FILE apps/server/src/seed/demo.ts SHA256 a924f0dabb3cc619a33ce540e6b7251fd5b443cea54b9f0227d4377b25ded6ad
1: /**
2:  * Deterministic demo workspace: "Northwind Health", a fictional 120-person
3:  * digital-health SaaS company preparing for SOC 2 Type 2 and a FedRAMP
4:  * Moderate-style SP 800-53 program on top of a NIST CSF 2.0 foundation.
5:  * Everything is reproducible (seeded PRNG) so screenshots and tests are stable.
6:  */
7: import { CrosswalkIndex, codeOf, projectLevels, type RequirementNode, type RequirementState, type Role, type Task } from "@visua/core";
8: import { REPO_ROOT } from "@visua/frameworks";
9: import type { AuthService } from "../auth/service.ts";
10: import type { VisuaService } from "../services/visua.ts";
11:
12: function hash(s: string): number {
13:   let h = 2166136261;
14:   for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
15:   return h >>> 0;
16: }
17: function rand(seed: string): number {
18:   let t = (hash(seed) + 0x6d2b79f5) >>> 0;
19:   t = Math.imul(t ^ (t >>> 15), t | 1);
20:   t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
21:   return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
22: }
23:
24: /** Typical early-stage profile: governance and identity ahead, detection and recovery behind. */
25: const CURRENT_BY_CATEGORY: Record<string, [number, number]> = {
26:   "GV.OC": [2, 3],
27:   "GV.RM": [1, 2],
28:   "GV.RR": [2, 3],
29:   "GV.PO": [2, 3],
30:   "GV.OV": [1, 2],
31:   "GV.SC": [0, 2],
32:   "ID.AM": [1, 3],
33:   "ID.RA": [1, 2],
34:   "ID.IM": [0, 1],
35:   "PR.AA": [2, 3],
36:   "PR.AT": [1, 3],
37:   "PR.DS": [2, 3],
38:   "PR.PS": [1, 3],
39:   "PR.IR": [1, 2],
40:   "DE.CM": [1, 2],
41:   "DE.AE": [0, 2],
42:   "RS.MA": [1, 2],
43:   "RS.AN": [0, 1],
44:   "RS.CO": [1, 2],
45:   "RS.MI": [1, 2],
46:   "RC.RP": [0, 2],
47:   "RC.CO": [0, 1],
48: };
49:
50: /** Fictional people for the developer sign-in screen: one per role, plus a consultant who works for two organizations. */
51: export const DEMO_PERSONAS: { email: string; name: string; title: string; orgs: Partial<Record<"northwind-health" | "contoso-bank", Role>> }[] = [
52:   { email: "morgan.lee@northwind-health.example", name: "Morgan Lee", title: "CISO", orgs: { "northwind-health": "owner" } },
53:   { email: "casey.nguyen@northwind-health.example", name: "Casey Nguyen", title: "IT director", orgs: { "northwind-health": "admin" } },
54:   { email: "priya.shah@northwind-health.example", name: "Priya Shah", title: "Compliance lead", orgs: { "northwind-health": "approver" } },
55:   { email: "sam.ortiz@northwind-health.example", name: "Sam Ortiz", title: "IT lead", orgs: { "northwind-health": "contributor" } },
56:   { email: "alex.kim@audit-partners.example", name: "Alex Kim", title: "External auditor", orgs: { "northwind-health": "auditor" } },
57:   { email: "jordan.park@northwind-health.example", name: "Jordan Park", title: "Board observer", orgs: { "northwind-health": "viewer" } },
58:   { email: "riley.chen@visua-partners.example", name: "Riley Chen", title: "vCISO consultant", orgs: { "northwind-health": "admin", "contoso-bank": "admin" } },
59:   { email: "taylor.brooks@contoso-bank.example", name: "Taylor Brooks", title: "Security lead, Contoso Bank", orgs: { "contoso-bank": "owner" } },
60: ];
61:
62: /** Demo organizations: Northwind Health (the demo workspace) and Contoso Bank (to show tenant separation). */
63: export async function seedDemoOrganizations(auth: AuthService): Promise<string> {
64:   const ids = auth.svc.store.identity;
65:   const existing = await ids.tenants.getBySlug("northwind-health");
66:   if (existing) return existing.id;
67:   const users = new Map<string, Awaited<ReturnType<AuthService["ensureUser"]>>>();
68:   for (const p of DEMO_PERSONAS) users.set(p.email, await auth.ensureUser(p.email, p.name));
69:   const tenants: Record<string, string> = {};
70:   for (const [slug, name] of [["northwind-health", "Northwind Health"], ["contoso-bank", "Contoso Bank"]] as const) {
71:     const owner = DEMO_PERSONAS.find((p) => p.orgs[slug] === "owner")!;
72:     const tenant = await auth.createTenant(name, users.get(owner.email)!, "seed", slug);
73:     tenants[slug] = tenant.id;
74:     for (const p of DEMO_PERSONAS) {
75:       const role = p.orgs[slug];
76:       if (role && role !== "owner") await auth.grantMembership(tenant.id, users.get(p.email)!, role, "seed");
77:     }
78:   }
79:   return tenants["northwind-health"]!;
80: }
81:
82: const daysFromNow = (d: number) => new Date(Date.now() + d * 86_400_000).toISOString();
83: const dateFromNow = (d: number) => daysFromNow(d).slice(0, 10);
84:
85: /** The demo workspace, in the Northwind Health organization (created with its personas when missing). */
86: export async function seedDemo(svc: VisuaService, auth: AuthService): Promise<string> {
87:   const existing = await svc.store.workspaces.get("northwind-health");
88:   if (existing) return existing.id;
89:   const tenantId = await seedDemoOrganizations(auth);
90:   const actor = "seed";
91:   const frameworks = ["nist-csf-2.0", "aicpa-tsc-2017", "nist-sp-800-53-r5", "nist-ai-rmf", "us-state-ai-laws"].filter((id) => svc.registry.framework(id));
92:   const ws = await svc.createWorkspace(
93:     {
94:       tenantId,
95:       name: "Northwind Health",
96:       description: "Digital-health SaaS for outpatient clinics (fictional demo workspace).",
97:       profile: {
98:         industry: "healthcare",
99:         size: "51-200",
100:         dataTypes: ["phi", "pii"],
101:         drivers: ["enterprise-customers", "cyber-insurance", "federal-customers", "ai-systems"],
102:         environments: ["cloud"],
103:         maturityTier: 2,
104:         guidance: "guided",
105:         securityTeamSize: 3,
106:       },
107:       frameworks,
108:       soc2: { reportType: "type2", categories: ["security", "availability", "confidentiality"], observationStart: dateFromNow(-45), observationEnd: dateFromNow(135), auditFirm: "Independent CPA firm (to be engaged)" },
109:     },
110:     actor,
111:   );
112:   await svc.updateWorkspace(ws.id, { autonomy: { "create-task": false }, trustCenter: { enabled: true, headline: "Northwind Health security & compliance", contactEmail: "security@northwind-health.example" } }, actor);
113:   await svc.recordTierAssessment(ws.id, { "risk-strategy": 2, prioritization: 2, "executive-oversight": 2, awareness: 2, consistency: 2, "information-sharing": 3, monitoring: 2, "supplier-risk": 1 }, actor);
114:
115:   // CSF 2.0 current profile.
116:   // Historical assessment levels are seeded directly (bulk), then derived caches are invalidated.
117:   const seedStates = async (frameworkId: string, level: (node: RequirementNode, prev: RequirementState) => Partial<RequirementState> | undefined) => {
118:     const index = svc.registry.framework(frameworkId)!;
119:     const states = await svc.store.states.map(ws.id, frameworkId);
120:     const next: RequirementState[] = [];
121:     for (const node of index.assessable) {
122:       const prev = states.get(node.id);
123:       const patch = prev ? level(node, prev) : undefined;
124:       if (prev && patch) next.push({ ...prev, ...patch, updatedBy: actor });
125:     }
126:     await svc.store.states.putMany(ws.id, next);
127:     await svc.invalidate(ws.id);
128:   };
129:
130:   const csf = svc.registry.framework("nist-csf-2.0")!;
131:   await seedStates("nist-csf-2.0", (node) => {
132:     const [lo, hi] = CURRENT_BY_CATEGORY[node.code.slice(0, 5)] ?? [0, 2];
133:     return {
134:       current: Math.min(hi, lo + Math.floor(rand(`csf:${node.code}`) * (hi - lo + 1))),
135:       owner: node.code.startsWith("GV") ? "CISO" : node.code.startsWith("PR.AA") ? "IT Lead" : node.code.startsWith("DE") || node.code.startsWith("RS") ? "Security Engineer" : "Platform Lead",
136:       updatedAt: daysFromNow(-20),
137:     };
138:   });
139:
140:   // Project CSF progress onto SP 800-53 and SOC 2 through the authoritative crosswalks.
141:   const csfStates = await svc.store.states.map(ws.id, "nist-csf-2.0");
142:   for (const fw of frameworks.filter((f) => f !== "nist-csf-2.0")) {
143:     const index = svc.registry.framework(fw)!;
144:     const projected = projectLevels(svc.registry.crosswalk as CrosswalkIndex, index.assessable.map((n) => n.id), csfStates);
145:     const byId = new Map(projected.map((p) => [p.nodeId, p]));
146:     await seedStates(fw, (node, prev) => {
147:       if (!prev.applicable) return undefined;
148:       const p = byId.get(node.id);
149:       const jitter = rand(`${fw}:${node.code}`);
150:       return { current: Math.max(0, Math.min(prev.target, (p?.suggested ?? 0) + (jitter > 0.7 ? 1 : 0) + (fw === "aicpa-tsc-2017" ? 1 : 0))), updatedAt: daysFromNow(-15) };
151:     });
152:   }
153:
154:   // RMF Categorize (FIPS 199 via SP 800-60 information types): high-water mark → MODERATE baseline.
155:   if (svc.frameworkSettings(await svc.workspace(ws.id), "nist-sp-800-53-r5")) {
156:     await svc.categorizeSystem(
157:       ws.id,
158:       {
159:         systemName: "Northwind Clinic Cloud",
160:         systemDescription: "Multi-tenant SaaS for outpatient scheduling, e-prescribing and billing.",
161:         informationTypes: [
162:           { id: "health-care-delivery", name: "Health care delivery services (PHI)", confidentiality: "moderate", integrity: "moderate", availability: "low" },
163:           { id: "scheduling", name: "Patient scheduling", confidentiality: "low", integrity: "moderate", availability: "moderate" },
164:           { id: "billing", name: "Billing and payments", confidentiality: "moderate", integrity: "moderate", availability: "low" },
165:         ],
166:         privacyBaseline: true,
167:       },
168:       actor,
169:     );
170:     await svc.tailorControl(ws.id, "nist-sp-800-53-r5:PE-3", "remove", "Physical access control is inherited from the cloud provider's data centers (carve-out).", actor);
171:     // The no-show predictor is predictive AI: follow NIST's COSAiS overlay for it (pre-draft).
172:     if (svc.registry.overlay("nist-cosais-predictive-ai")) await svc.adoptOverlay(ws.id, "nist-cosais-predictive-ai", {}, actor);
173:   }
174:
175:   // RMF lifecycle: the demo system is prepared, categorized and has its baseline selected; implementation is under way.
176:   const rmf = svc.registry.framework("nist-rmf");
177:   if (rmf && svc.frameworkSettings(await svc.workspace(ws.id), "nist-rmf")) {
178:     const stepLevel: Record<string, number> = { P: 3, C: 3, S: 3, I: 2, A: 1, R: 0, M: 1 };
179:     await seedStates("nist-rmf", (node, prev) => {
180:       if (!prev.applicable) return undefined;
181:       const level = stepLevel[node.code.split("-")[0]!] ?? 0;
182:       return {
183:         current: Math.max(0, Math.min(prev.target, level - (rand(`rmf:${node.code}`) > 0.8 ? 1 : 0))),
184:         owner: node.code.startsWith("R-") ? "Authorizing Official" : "System Owner",
185:         updatedAt: daysFromNow(-10),
186:       };
187:     });
188:   }
189:
190:   // AI governance: an AI system inventory and a mid-maturity AI RMF profile (GOVERN ahead of MEASURE/MANAGE).
191:   const aiRmf = svc.registry.framework("nist-ai-rmf");
192:   if (aiRmf && svc.frameworkSettings(await svc.workspace(ws.id), "nist-ai-rmf")) {
193:     const systems: Parameters<typeof svc.upsertAiSystem>[1][] = [
194:       {
195:         name: "Clinical note summarizer",
196:         purpose: "Drafts visit summaries from clinician dictation for clinician review; never used for diagnosis or treatment decisions.",
197:         role: "deployer",
198:         lifecycle: "deploy-use",
199:         generative: true,
200:         provider: "Third-party LLM API under a business associate agreement (fictional)",
201:         riskTier: "high",
202:         owner: "Chief Medical Information Officer",
203:         dataTypes: ["phi", "pii"],
204:         humanOversight: "A clinician reviews, edits and signs every summary before it enters the record.",
205:       },
206:       {
207:         name: "Appointment no-show predictor",
208:         purpose: "Scores upcoming appointments for no-show likelihood so staff can send reminders; never blocks or reorders booking.",
209:         role: "developer-deployer",
210:         lifecycle: "operate-monitor",
211:         generative: false,
212:         provider: "In-house gradient-boosted model",
213:         riskTier: "moderate",
214:         owner: "Data Science Lead",
215:         dataTypes: ["pii"],
216:         humanOversight: "Front-desk staff decide whether to act on a score; monthly bias review across patient groups.",
217:       },
218:       {
219:         name: "Patient support assistant",
220:         purpose: "Answers scheduling and billing questions in the patient portal; hands off to staff for anything clinical.",
221:         role: "deployer",
222:         lifecycle: "verify-validate",
223:         generative: true,
224:         provider: "Third-party LLM API (fictional)",
225:         riskTier: "moderate",
226:         owner: "Patient Experience Manager",
227:         dataTypes: ["pii"],
228:         humanOversight: "Escalates to a person on clinical keywords, low confidence or on request.",
229:       },
230:     ];
231:     for (const s of systems) await svc.upsertAiSystem(ws.id, s, actor);
232:     const fnLevel: Record<string, number> = { GOVERN: 2, MAP: 2, MEASURE: 1, MANAGE: 1 };
233:     await seedStates("nist-ai-rmf", (node, prev) => {
234:       if (!prev.applicable) return undefined;
235:       const fn = aiRmf.ancestors(node.id)[0]?.code ?? "";
236:       const j = rand(`ai:${node.code}`);
237:       return {
238:         current: Math.max(0, Math.min(prev.target, (fnLevel[fn] ?? 1) + (j > 0.8 ? 1 : j < 0.2 ? -1 : 0))),
239:         owner: fn === "GOVERN" ? "AI Governance Committee" : "Data Science Lead",
240:         updatedAt: daysFromNow(-8),
241:       };
242:     });
243:   }
244:
245:   // Cyber AI Profile (draft): secure the AI systems Northwind deploys and thwart AI-enabled attacks.
246:   if (svc.registry.overlay("nist-ir-8596-iprd")) {
247:     await svc.adoptOverlay(ws.id, "nist-ir-8596-iprd", { lenses: ["secure", "thwart"] }, actor);
248:     await svc.applyOverlayPriorities(ws.id, "nist-ir-8596-iprd", actor);
249:   }
250:
251:   // U.S. state AI laws: the roles Northwind holds under the laws of the states it serves.
252:   // Roles a law does not define are skipped, so the seed follows the corpus as it evolves.
253:   const laws = svc.registry.framework("us-state-ai-laws");
254:   if (laws) {
255:     const decisions: [string, string[], string][] = [
256:       ["co-admt-act", ["deployer"], "Our patient-facing assistant helps route requests for health-care services in Colorado clinics."],
257:       ["tx-traiga", ["developer", "deployer"], "We build and operate AI features used by Texas clinics and their patients."],
258:       ["ca-ccpa-admt-regs", ["business"], "We process personal information of California residents above the CCPA thresholds."],
259:       ["ut-genai-disclosures", ["supplier"], "Patients in Utah interact with our generative AI assistant."],
260:     ];
261:     for (const [lawId, roles, note] of decisions) {
262:       const law = laws.graph.nodes.find((n) => n.kind === "law" && n.attributes?.["lawId"] === lawId);
263:       if (!law) continue;
264:       const defined = new Set(laws.childrenOf(law.id).flatMap((o) => (o.attributes?.["roles"] as string[] | undefined) ?? []));
265:       const held = roles.filter((r) => defined.has(r));
266:       if (held.length) await svc.setLawApplicability(ws.id, lawId, { roles: held, note }, "Dana Whitfield (CEO)");
267:     }
268:     await seedStates("us-state-ai-laws", (node, prev) => {
269:       if (!prev.applicable) return undefined;
270:       const j = rand(`law:${node.code}`);
271:       return { current: j > 0.75 ? 3 : j > 0.4 ? 2 : j > 0.15 ? 1 : 0, owner: "Privacy Counsel", updatedAt: daysFromNow(-12) };
272:     });
273:   }
274:
275:   // Policies (approved ones become evidence automatically).
276:   const nodesUnder = (code: string) => csf.assessableUnder(csf.get(code)!.id).map((n) => n.id);
277:   const isp = await svc.createPolicy(ws.id, { title: "Information Security Policy", body: policyBody("Information Security Policy", "establish management direction for protecting Northwind Health information"), requirementIds: [...nodesUnder("GV.PO"), ...nodesUnder("GV.OC").slice(0, 2)], owner: "CISO" }, actor);
278:   await svc.updatePolicy(ws.id, isp.id, { status: "approved" }, "Dana Whitfield (CEO)");
279:   const acp = await svc.createPolicy(ws.id, { title: "Identity and Access Control Policy", body: policyBody("Identity and Access Control Policy", "limit access to authorized users with MFA and least privilege"), requirementIds: nodesUnder("PR.AA"), owner: "IT Lead" }, actor);
280:   await svc.updatePolicy(ws.id, acp.id, { status: "approved" }, "Dana Whitfield (CEO)");
281:   await svc.createPolicy(ws.id, { title: "Incident Response Plan", body: policyBody("Incident Response Plan", "detect, contain and recover from incidents and notify affected parties"), requirementIds: nodesUnder("RS.MA"), owner: "Security Engineer", status: "in-review" } as never, actor);
282:
283:   // Evidence on file (a few stale to exercise at-risk status).
284:   const evidenceSeeds: [string, string, number, "document" | "configuration" | "screenshot" | "report" | "attestation"][] = [
285:     ["PR.AA-01", "Okta user lifecycle export (joiner/mover/leaver)", 200, "configuration"],
286:     ["PR.AA-03", "MFA enforcement policy screenshot — Okta", 250, "screenshot"],
287:     ["PR.AA-05", "Quarterly access review sign-off Q2", 60, "attestation"],
288:     ["PR.DS-01", "AWS KMS encryption-at-rest configuration", 300, "configuration"],
289:     ["PR.DS-02", "TLS 1.2+ enforcement on load balancers", 280, "configuration"],
290:     ["PR.DS-11", "Backup restore test report", -12, "report"],
291:     ["PR.AT-01", "Security awareness training completion report", 150, "report"],
292:     ["ID.AM-01", "Hardware inventory export (Jamf)", 90, "configuration"],
293:     ["ID.AM-02", "Software and SaaS inventory", 120, "document"],
294:     ["GV.RR-02", "Security roles and responsibilities matrix", 330, "document"],
295:     ["GV.OC-03", "HIPAA and state privacy law obligations register", 210, "document"],
296:     ["DE.CM-01", "Network monitoring — GuardDuty findings dashboard", 20, "screenshot"],
297:     ["PR.PS-02", "Patch management SLA report", -3, "report"],
298:     ["RS.MA-01", "Incident response tabletop exercise minutes", 180, "report"],
299:   ];
300:   for (const [code, title, validDays, kind] of evidenceSeeds) {
301:     const node = csf.get(code);
302:     if (!node) continue;
303:     await svc.createEvidence(
304:       ws.id,
305:       { title, kind, source: "manual", requirementIds: [node.id], status: "accepted", reviewedBy: "CISO", reviewedAt: daysFromNow(-10), collectedAt: daysFromNow(-30), validUntil: daysFromNow(validDays), content: `${title} — collected for ${code}.` },
306:       actor,
307:     );
308:   }
309:   const verified = new Set(["PR.AA-03", "PR.DS-01", "GV.RR-02"]);
310:   await seedStates("nist-csf-2.0", (node, s) => (verified.has(node.code) ? { current: Math.max(s.current, s.target), verifiedAt: daysFromNow(-5) } : undefined));
311:
312:   // Action plan grounded in the official Implementation Examples.
313:   const tasks = await svc.planWith(ws.id, "nist-csf-2.0", 18, actor);
314:   const statuses: Task["status"][] = ["done", "done", "in-progress", "in-progress", "in-review", "in-progress", "todo", "todo", "blocked"];
315:   for (const [i, t] of tasks.entries()) {
316:     const status = statuses[i] ?? "todo";
317:     const patch: Partial<Task> = { status };
318:     if (i === 2) patch.dueDate = dateFromNow(-4); // overdue → at-risk signal
319:     if (status === "done") patch.checklist = t.checklist.map((c) => ({ ...c, done: true }));
320:     if (status === "in-progress" || status === "in-review") patch.checklist = t.checklist.map((c, ci) => ({ ...c, done: ci < Math.ceil(t.checklist.length / 2) }));
321:     if (i % 3 === 0) patch.assignee = { type: "person", id: "u-ciso", name: "Morgan Lee (CISO)" };
322:     else if (i % 3 === 1) patch.assignee = { type: "person", id: "u-it", name: "Sam Ortiz (IT Lead)" };
323:     else patch.assignee = { type: "agent", id: t.automation?.agent ?? "task-executor", name: "Visua agent" };
324:     await svc.updateTask(ws.id, t.id, patch, actor);
325:   }
326:
327:   // Real, credential-free monitoring: scan this repository for secure-development signals.
328:   const repo = await svc.createConnector(ws.id, { kind: "repo-scan", name: "Platform repository", config: { path: REPO_ROOT } }, actor);
329:   await svc.runConnector(ws.id, repo.id, actor).catch(() => []);
330:   await svc.createConnector(ws.id, { kind: "web-posture", name: "Public website posture", config: { url: "https://www.nist.gov" } }, actor);
331:
332:   await svc.upsertRisk(ws.id, { title: "Ransomware disrupting clinic scheduling", description: "Encryption of production data stores would halt appointment scheduling for clinics.", likelihood: 3, impact: 5, treatment: "mitigate", status: "treating", requirementIds: nodesUnder("RC.RP").concat(nodesUnder("PR.DS").slice(-1)), owner: "CISO" }, actor);
333:   await svc.upsertRisk(ws.id, { title: "Third-party EHR integration compromise", description: "A compromised EHR integration partner could exfiltrate PHI through API credentials.", likelihood: 2, impact: 5, treatment: "mitigate", status: "open", requirementIds: nodesUnder("GV.SC"), owner: "Platform Lead" }, actor);
334:
335:   // A glass-box agent run awaiting approval, so the flight recorder has history.
336:   const run = await svc.startRun(ws.id, { agent: "auditor-prep", goal: "Prepare a SOC 2 readiness brief and flag audit blockers", input: frameworks.includes("aicpa-tsc-2017") ? { framework: "aicpa-tsc-2017" } : {} }, "Morgan Lee <morgan.lee@northwind-health.example>");
337:   await svc.waitForRun(run.id);
338:   const planner = await svc.startRun(ws.id, { agent: "evidence-collector", goal: "Find implemented CSF outcomes without evidence and propose collection tasks", input: {} }, "Morgan Lee <morgan.lee@northwind-health.example>");
339:   await svc.waitForRun(planner.id);
340:
341:   return ws.id;
342: }
343:
344: function policyBody(title: string, purpose: string): string {
345:   return [
346:     `# ${title}`,
347:     "",
348:     "## 1. Purpose",
349:     "",
350:     `The purpose of this policy is to ${purpose}.`,
351:     "",
352:     "## 2. Scope",
353:     "",
354:     "All Northwind Health workforce members, contractors, systems and data, including cloud services.",
355:     "",
356:     "## 3. Policy statements",
357:     "",
358:     "Northwind Health shall maintain, communicate and enforce the requirements in this document, review them annually, and track exceptions in the risk register.",
359:   ].join("\n");
360: }
361:
362: export async function describeSeed(svc: VisuaService, workspaceId: string): Promise<string> {
363:   const ws = await svc.workspace(workspaceId);
364:   return `${ws.name}: ${ws.frameworks.map((f) => codeOf(`x:${f.frameworkId}`)).join(", ")}`;
365: }

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

FILE apps/server/src/services/views.ts SHA256 2cb107b4ad2a82723c0ce7683c67667ee2274e3f74bda93dc96288b8c6651b50
1: /**
2:  * API view models: lean graphs for the 3D Observatory, full node detail for
3:  * the inspector, and per-framework state bundles.
4:  */
5: import { codeOf, frameworkOf, groupStatus, obligationTiming, trustCenterPublishes, type FrameworkGraph, type RequirementNode, type Workspace } from "@visua/core";
6: import { existsSync } from "node:fs";
7: import { resolve } from "node:path";
8: import { CORPUS_DIR, FRAMEWORK_ORDER } from "@visua/frameworks";
9: import { overlayLevelFor, overlayLevels } from "./overlays.ts";
10: import { threatDetail, threatStateBundle, threatsAddressedBy, type MinStatus } from "./threats.ts";
11: import type { VisuaService } from "./visua.ts";
12:
13: export interface LeanNode {
14:   id: string;
15:   code: string;
16:   kind: string;
17:   parentId: string | null;
18:   depth: number;
19:   order: number;
20:   title: string;
21:   text: string;
22:   assessable: boolean;
23:   /** Small, UI-relevant attributes only. */
24:   meta?: Record<string, unknown>;
25: }
26:
27: const LEAN_ATTRIBUTE_KEYS = ["baselines", "category", "cosoPrinciple", "level", "party", "label", "role", "effective", "section", "status", "tactics", "maturity"];
28:
29: export function leanGraph(graph: FrameworkGraph): { framework: FrameworkGraph["framework"]; nodes: LeanNode[]; profiles?: FrameworkGraph["profiles"] } {
30:   return {
31:     framework: graph.framework,
32:     profiles: graph.profiles,
33:     nodes: graph.nodes.map((n) => {
34:       const meta: Record<string, unknown> = {};
35:       for (const k of LEAN_ATTRIBUTE_KEYS) if (n.attributes?.[k] !== undefined) meta[k] = n.attributes[k];
36:       if (n.examples?.length) meta["examples"] = n.examples.length;
37:       return {
38:         id: n.id,
39:         code: n.code,
40:         kind: n.kind,
41:         parentId: n.parentId,
42:         depth: n.depth,
43:         order: n.order,
44:         title: n.title,
45:         text: n.text.length > 320 ? `${n.text.slice(0, 319)}…` : n.text,
46:         assessable: n.assessable,
47:         meta: Object.keys(meta).length ? meta : undefined,
48:       };
49:     }),
50:   };
51: }
52:
53: /** Everything the inspector needs for one requirement. */
54: export async function nodeDetail(svc: VisuaService, ws: Workspace, node: RequirementNode, opts: { minStatus?: MinStatus } = {}) {
55:   const index = svc.registry.framework(node.frameworkId)!;
56:   // Threat catalogs are not assessed: their nodes show derived coverage instead of a status.
57:   const isThreat = index.graph.framework.family === "threat";
58:   const related = svc.registry.crosswalk.related(node.id);
59:   const under = new Set(index.assessableUnder(node.id).map((n) => n.id));
60:   const [score, states, allTasks, allEvidence, allChecks, allProposals, recentActivity, threat] = await Promise.all([
61:     isThreat ? null : svc.score(ws.id, node.frameworkId),
62:     svc.store.states.getMany(ws.id, [node.id, ...related.map((e) => e.to)]),
63:     svc.store.tasks.list(ws.id),
64:     svc.store.evidence.list(ws.id),
65:     svc.store.checks.list(ws.id),
66:     svc.store.proposals.list(ws.id),
67:     svc.store.activity.recent(ws.id, 400),
68:     isThreat ? threatDetail(svc, ws, node, opts.minStatus) : null,
69:   ]);
70:   const state = node.assessable && !isThreat ? states.get(node.id) : undefined;
71:   const tasks = allTasks.filter((t) => t.requirementIds.some((id) => id === node.id || under.has(id)));
72:   const evidence = allEvidence.filter((e) => e.requirementIds.some((id) => id === node.id || under.has(id)));
73:   const checks = allChecks.filter((c) => c.requirementIds.includes(node.id)).slice(-20);
74:   const proposals = allProposals.filter((p) => p.nodeIds.includes(node.id)).slice(-20);
75:   const activity = recentActivity.filter((a) => a.entityId === node.id).slice(0, 20);
76:   const mappings = related.map((e) => {
77:     const target = svc.registry.node(e.to);
78:     const s = states.get(e.to);
79:     return {
80:       id: e.to,
81:       code: codeOf(e.to),
82:       framework: frameworkOf(e.to),
83:       title: target?.title ?? "",
84:       text: target?.text.slice(0, 200) ?? "",
85:       relationship: e.relationship,
86:       authority: e.authority,
87:       current: s?.current,
88:       target: s?.target,
89:       applicable: s?.applicable,
90:     };
91:   });
92:   const doc = svc.registry.documents.get(node.citation.documentId);
93:   return {
94:     node,
95:     ancestors: index.ancestors(node.id).map((a) => ({ id: a.id, code: a.code, title: a.title })),
96:     children: index.childrenOf(node.id).map((c) => ({ id: c.id, code: c.code, title: c.title, text: c.text.slice(0, 160), assessable: c.assessable })),
97:     state,
98:     status: score?.statuses.get(node.id) ?? null,
99:     score: score?.scores.get(node.id) ?? null,
100:     groupStatus: score && !node.assessable && score.scores.get(node.id) ? groupStatus(score.scores.get(node.id)!) : null,
101:     tasks,
102:     evidence,
103:     checks,
104:     proposals,
105:     activity,
106:     mappings,
107:     source: doc
108:       ? { id: doc.id, title: doc.title, identifier: doc.identifier, path: doc.path, url: doc.url, page: node.citation.page, locator: node.citation.locator, present: existsSync(resolve(CORPUS_DIR, doc.path)) }
109:       : null,
110:     contentNotice: svc.registry.framework(node.frameworkId)?.graph.framework.contentNotice,
111:     // Statutory obligations: when they bind (upcoming ones are not counted in today's readiness).
112:     timing:
113:       index.graph.framework.family === "law" && node.assessable
114:         ? { state: obligationTiming(node, new Date().toISOString().slice(0, 10)), effective: node.attributes?.["effective"] as string | undefined, until: node.attributes?.["until"] as string | undefined }
115:         : null,
116:     threat,
117:     threats: isThreat ? [] : threatsAddressedBy(svc, node.id),
118:     overlays: svc.registry.overlaysOf(node.id).map(({ overlay, entry }) => ({
119:       id: overlay.id,
120:       kind: overlay.kind,
121:       shortName: overlay.shortName,
122:       identifier: overlay.identifier,
123:       status: overlay.status,
124:       documentId: overlay.documentId,
125:       notice: overlay.notice,
126:       lenses: overlay.lenses?.map((l) => ({ id: l.id, short: l.short, title: l.title })),
127:       priorityLevels: overlay.priorityLevels?.map((p) => ({ level: p.level, label: p.label })),
128:       adoption: svc.frameworkSettings(ws, overlay.frameworkId)?.overlays?.find((a) => a.overlayId === overlay.id) ?? null,
129:       source: (() => {
130:         const d = svc.registry.documents.get(overlay.documentId);
131:         return d ? { path: d.path, title: d.title, present: existsSync(resolve(CORPUS_DIR, d.path)) } : null;
132:       })(),
133:       entry,
134:     })),
135:   };
136: }
137:
138: /** Per-framework state bundle driving the 3D colors, heights and HUD. */
139: export async function frameworkState(svc: VisuaService, ws: Workspace, frameworkId: string, opts: { minStatus?: MinStatus } = {}) {
140:   // Threat catalogs are not assessed: their bundle carries derived coverage.
141:   if (svc.registry.framework(frameworkId)?.graph.framework.family === "threat") return threatStateBundle(svc, ws, frameworkId, opts.minStatus);
142:   const [score, states, tasks, evidence] = await Promise.all([
143:     svc.score(ws.id, frameworkId),
144:     svc.store.states.list(ws.id, frameworkId),
145:     svc.store.tasks.list(ws.id),
146:     svc.store.evidence.list(ws.id),
147:   ]);
148:   const openTasks = new Map<string, number>();
149:   for (const t of tasks) if (t.status !== "done") for (const id of t.requirementIds) openTasks.set(id, (openTasks.get(id) ?? 0) + 1);
150:   // The framework's overlay, if any, drives the Observatory's overlay lens.
151:   const overlay = svc.registry.overlays.find((o) => o.frameworkId === frameworkId);
152:   const adoption = overlay ? svc.frameworkSettings(ws, frameworkId)?.overlays?.find((a) => a.overlayId === overlay.id) : undefined;
153:   const overlayLenses = overlay ? (adoption?.lenses ?? overlay.lenses?.map((l) => l.id) ?? []) : [];
154:   const evidenceCount = new Map<string, number>();
155:   for (const e of evidence) if (e.status === "accepted") for (const id of e.requirementIds) evidenceCount.set(id, (evidenceCount.get(id) ?? 0) + 1);
156:   // Statutory obligations: scoped by date when read (see VisuaService.scoreOf).
157:   const index = svc.registry.framework(frameworkId)!;
158:   const law = index.graph.framework.family === "law";
159:   const today = new Date().toISOString().slice(0, 10);
160:   const timing = (nodeId: string) => (law ? obligationTiming(index.byId.get(nodeId) ?? {}, today) : "in-force");
161:   return {
162:     frameworkId,
163:     overall: score.overall,
164:     ...(score.upcoming ? { upcoming: score.upcoming.overall } : {}),
165:     groups: Object.fromEntries([...score.scores.entries()].map(([id, s]) => [id, { ...s, status: groupStatus(s) }])),
166:     units: Object.fromEntries(
167:       states.map((s) => [
168:         s.nodeId,
169:         {
170:           current: s.current,
171:           target: s.target,
172:           priority: s.priority,
173:           applicable: s.applicable && timing(s.nodeId) !== "ended",
174:           owner: s.owner,
175:           ...(timing(s.nodeId) === "upcoming" ? { upcoming: String(index.byId.get(s.nodeId)?.attributes?.["effective"]) } : {}),
176:           status: score.statuses.get(s.nodeId)?.status ?? "not-started",
177:           reasons: score.statuses.get(s.nodeId)?.reasons ?? [],
178:           openTasks: openTasks.get(s.nodeId) ?? 0,
179:           evidence: evidenceCount.get(s.nodeId) ?? 0,
180:           mapped: svc.registry.crosswalk.related(s.nodeId).length,
181:           overlay: overlay ? overlayLevelFor(overlay, s.nodeId, overlayLenses) : undefined,
182:         },
183:       ]),
184:     ),
185:     overlay: overlay
186:       ? {
187:           id: overlay.id,
188:           shortName: overlay.shortName,
189:           status: overlay.status,
190:           adopted: !!adoption,
191:           lenses: overlayLenses.map((id) => overlay.lenses?.find((l) => l.id === id)?.short ?? id),
192:           levels: overlayLevels(overlay),
193:         }
194:       : null,
195:   };
196: }
197:
198: export async function workspaceSummary(svc: VisuaService, ws: Workspace) {
199:   const rank = (id: string) => (FRAMEWORK_ORDER.indexOf(id) === -1 ? 99 : FRAMEWORK_ORDER.indexOf(id));
200:   const enabled = ws.frameworks.filter((f) => f.enabled && svc.registry.framework(f.frameworkId)).sort((a, b) => rank(a.frameworkId) - rank(b.frameworkId));
201:   const scores = await Promise.all(enabled.map((f) => svc.score(ws.id, f.frameworkId)));
202:   const frameworks = enabled.map((f, i) => {
203:     const index = svc.registry.framework(f.frameworkId)!;
204:     const s = scores[i]!.overall;
205:     return {
206:       id: f.frameworkId,
207:       shortName: index.graph.framework.shortName,
208:       family: index.graph.framework.family,
209:       settings: f,
210:       readiness: s.readiness,
211:       gaps: s.gaps,
212:       total: s.total,
213:       evidenceCoverage: s.evidenceCoverage,
214:       verifiedShare: s.verifiedShare,
215:       counts: s.counts,
216:       /** Whether the public trust center publishes this framework's readiness. */
217:       onTrustCenter: trustCenterPublishes(ws.trustCenter, f.frameworkId, index.graph.framework.family),
218:       /** Statutory obligations in scope that are not in effect yet (not counted above). */
219:       ...(scores[i]!.upcoming ? { upcoming: { total: scores[i]!.upcoming!.overall.total, readiness: scores[i]!.upcoming!.overall.readiness } } : {}),
220:     };
221:   });
222:   const [tasks, proposals, runs, evidenceTotal, policies] = await Promise.all([
223:     svc.store.tasks.list(ws.id),
224:     svc.store.proposals.list(ws.id),
225:     svc.store.runs.recent(ws.id, 50),
226:     svc.store.evidence.count(ws.id),
227:     svc.store.policies.list(ws.id),
228:   ]);
229:   const today = new Date().toISOString().slice(0, 10);
230:   return {
231:     workspace: ws,
232:     frameworks,
233:     tasks: {
234:       total: tasks.length,
235:       open: tasks.filter((t) => t.status !== "done").length,
236:       done: tasks.filter((t) => t.status === "done").length,
237:       overdue: tasks.filter((t) => t.status !== "done" && t.dueDate && t.dueDate < today).length,
238:       byStatus: tasks.reduce<Record<string, number>>((acc, t) => ((acc[t.status] = (acc[t.status] ?? 0) + 1), acc), {}),
239:     },
240:     evidence: { total: evidenceTotal },
241:     policies: policies.map((p) => ({ id: p.id, title: p.title, status: p.status, version: p.version })),
242:     approvals: proposals.filter((p) => p.status === "pending").length,
243:     agents: { running: runs.filter((r) => r.status === "running" || r.status === "queued").length, recent: runs.length },
244:   };
245: }

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

FILE apps/server/src/storage/driver.ts SHA256 ca5b9b998d1e29d5d552a539a5614ca760129f5f6335a4a1100c4c284d8b5752
1: /**
2:  * SQL driver abstraction shared by the SQLite (embedded) and Postgres
3:  * (production) backends. SQL is written once with `?` placeholders; the
4:  * Postgres driver rewrites them to `$1…$n`. JSON documents go through
5:  * `json()` / `parseJson()` so they are TEXT in SQLite and JSONB in Postgres.
6:  */
7: import { AsyncLocalStorage } from "node:async_hooks";
8:
9: export type Dialect = "sqlite" | "postgres";
10: export type Row = Record<string, unknown>;
11:
12: export interface SqlDriver {
13:   readonly dialect: Dialect;
14:   query<R extends Row = Row>(sql: string, params?: unknown[]): Promise<R[]>;
15:   execute(sql: string, params?: unknown[]): Promise<number>;
16:   /** Run `fn` inside one transaction on one connection. */
17:   transaction<T>(fn: (tx: SqlDriver) => Promise<T>): Promise<T>;
18:   /** Serialize writers on a named key for the rest of the current transaction. */
19:   lock(key: string): Promise<void>;
20:   close(): Promise<void>;
21: }
22:
23: /**
24:  * The active transaction for the current async call chain. Every repository
25:  * resolves its driver through this, so code deep inside a service call joins
26:  * the outermost transaction instead of opening (and deadlocking on) another.
27:  */
28: export interface TxContext {
29:   driver: SqlDriver;
30:   /** Work to run after the outermost transaction commits (e.g. publishing events). */
31:   afterCommit: (() => void)[];
32:   /** False once the transaction has ended: late async work then uses the pool again. */
33:   open: boolean;
34: }
35: export const txContext = new AsyncLocalStorage<TxContext>();
36:
37: /** `?` → `$n` outside of quoted strings. */
38: export function toPostgresParams(sql: string): string {
39:   let n = 0;
40:   let out = "";
41:   let quote: string | null = null;
42:   for (const ch of sql) {
43:     if (quote) {
44:       if (ch === quote) quote = null;
45:       out += ch;
46:     } else if (ch === "'" || ch === '"') {
47:       quote = ch;
48:       out += ch;
49:     } else if (ch === "?") {
50:       out += `$${++n}`;
51:     } else out += ch;
52:   }
53:   return out;
54: }
55:
56: /** Placeholder for a JSON document parameter. */
57: export const jsonParam = (dialect: Dialect) => (dialect === "postgres" ? "?::jsonb" : "?");
58:
59: export function parseJson<T>(value: unknown): T {
60:   return (typeof value === "string" ? JSON.parse(value) : value) as T;
61: }
62:
63: /** Minimal async mutex (FIFO). */
64: export class Mutex {
65:   private tail: Promise<void> = Promise.resolve();
66:   acquire(): Promise<() => void> {
67:     let release!: () => void;
68:     const next = new Promise<void>((r) => (release = r));
69:     const ready = this.tail.then(() => release);
70:     this.tail = this.tail.then(() => next);
71:     return ready;
72:   }
73: }

FILE apps/server/src/storage/events.ts SHA256 0538bf546b8a072cc88fef0d3f947efd27892195a2053746b18c9d8fc93bddbc
1: /**
2:  * Cross-instance live events on Postgres. Each server instance LISTENs on one
3:  * channel and NOTIFYs it with every event it publishes, so a browser connected
4:  * to any instance sees changes made through any other.
5:  */
6: import pg from "pg";
7: import type { EventBus, VisuaEvent } from "../bus.ts";
8: import type { Store } from "./store.ts";
9:
10: /** Postgres NOTIFY payloads are limited to 8,000 bytes (UTF-8); the envelope adds a few dozen. */
11: const LIMIT = 7_500;
12: const bytes = (value: unknown) => Buffer.byteLength(JSON.stringify(value), "utf8");
13:
14: const pick = (o: unknown, keys: string[]) => {
15:   const src = (o ?? {}) as Record<string, unknown>;
16:   return Object.fromEntries(keys.filter((k) => src[k] !== undefined).map((k) => [k, src[k]]));
17: };
18:
19: /** Large events travel with their identifying fields only; clients refetch what they need. */
20: export function compactEvent(event: VisuaEvent): VisuaEvent {
21:   if (bytes(event) <= LIMIT) return event;
22:   const d = (event.data ?? {}) as Record<string, unknown>;
23:   const data =
24:     event.type === "agent.step"
25:       ? { runId: d["runId"], agent: d["agent"], step: pick(d["step"], ["id", "at", "type", "title", "nodeIds"]) }
26:       : pick(d, ["id", "runId", "agent", "status", "workspaceId", "nodeId", "connectorId", "title", "summary", "seq"]);
27:   const small: VisuaEvent = { ...event, data, partial: true };
28:   return bytes(small) <= LIMIT ? small : { ...event, data: pick(d, ["id"]), partial: true };
29: }
30:
31: export class PgEventRelay {
32:   private client?: pg.Client;
33:   private closed = false;
34:   private retry = 0;
35:   private timer?: ReturnType<typeof setTimeout>;
36:   private readonly connectionString: string;
37:   private readonly bus: EventBus;
38:   readonly channel: string;
39:
40:   private constructor(connectionString: string, bus: EventBus, channel: string) {
41:     this.connectionString = connectionString;
42:     this.bus = bus;
43:     this.channel = channel;
44:   }
45:
46:   static async start(connectionString: string, bus: EventBus, store: Store): Promise<PgEventRelay> {
47:     // One channel per schema, so installations sharing a database stay apart.
48:     const [row] = await store.driver.query<{ schema: string }>(`SELECT current_schema() AS schema`);
49:     const schema = (row?.schema ?? "public").toLowerCase().replace(/[^a-z0-9_]/g, "_");
50:     const relay = new PgEventRelay(connectionString, bus, `visua_events${schema === "public" ? "" : `_${schema}`}`.slice(0, 63));
51:     try {
52:       await relay.listen();
53:     } catch (err) {
54:       await relay.close();
55:       throw err;
56:     }
57:     bus.attachRelay({
58:       send: (event) => {
59:         const payload = JSON.stringify({ origin: bus.instanceId, event: compactEvent(event) });
60:         // Through the pool, never a caller's transaction.
61:         store.driver.execute(`SELECT pg_notify(?, ?)`, [relay.channel, payload]).catch((err: unknown) => console.error("[visua] event relay: notify failed", err));
62:       },
63:     });
64:     store.onClose(() => relay.close());
65:     return relay;
66:   }
67:
68:   private async listen(): Promise<void> {
69:     const client = new pg.Client({ connectionString: this.connectionString, application_name: "visua-events" });
70:     client.on("notification", (msg) => {
71:       if (msg.channel !== this.channel || !msg.payload) return;
72:       try {
73:         const { origin, event } = JSON.parse(msg.payload) as { origin: string; event: VisuaEvent };
74:         if (origin !== this.bus.instanceId) this.bus.deliver(event);
75:       } catch (err) {
76:         console.error("[visua] event relay: bad payload", err);
77:       }
78:     });
79:     // A connection that fails or drops, at any point, schedules the next attempt.
80:     let lost = false;
81:     const lose = (err?: Error) => {
82:       if (lost) return;
83:       lost = true;
84:       if (this.client === client) this.client = undefined;
85:       if (this.closed) return;
86:       if (err) console.error("[visua] event relay: connection lost, reconnecting", err.message);
87:       this.reconnectLater();
88:     };
89:     client.on("error", lose);
90:     client.on("end", () => lose());
91:     try {
92:       await client.connect();
93:       await client.query(`LISTEN ${this.channel}`);
94:     } catch (err) {
95:       lose(err as Error);
96:       void client.end().catch(() => undefined);
97:       throw err;
98:     }
99:     if (lost) return;
100:     if (this.closed) {
101:       void client.end().catch(() => undefined);
102:       return;
103:     }
104:     this.client = client;
105:     this.retry = 0;
106:   }
107:
108:   /** One pending attempt at a time, backing off up to 30 s, until the relay is closed. */
109:   private reconnectLater(): void {
110:     if (this.closed || this.timer) return;
111:     const delay = Math.min(30_000, 1_000 * 2 ** this.retry++);
112:     this.timer = setTimeout(() => {
113:       this.timer = undefined;
114:       // A failed attempt schedules the next one itself.
115:       this.listen().catch(() => undefined);
116:     }, delay);
117:     this.timer.unref?.();
118:   }
119:
120:   async close(): Promise<void> {
121:     this.closed = true;
122:     if (this.timer) clearTimeout(this.timer);
123:     this.timer = undefined;
124:     const client = this.client;
125:     this.client = undefined;
126:     await client?.end().catch(() => undefined);
127:   }
128: }

FILE apps/server/src/storage/identity.ts SHA256 d287e809b71e878825b3193ce9b2fb550c454ab0d51c7e332c5d437681d93d1d
1: /**
2:  * Tenancy and identity persistence: organizations, users, memberships,
3:  * federated identities, sessions, API tokens and SSO connections. Secrets
4:  * (session ids, API tokens, OIDC state) are stored only as SHA-256 hashes.
5:  */
6: import type { Membership, Role, Tenant, User } from "@visua/core";
7: import { parseJson } from "./driver.ts";
8: import { Repo, type StoreContext } from "./repo.ts";
9:
10: type DataRow = { data: unknown };
11: const now = () => new Date().toISOString();
12:
13: export interface SessionRecord {
14:   userId: string;
15:   /** Tenant selected for listing and creating workspaces. */
16:   activeTenantId?: string;
17:   /** When set, the session may only access this tenant (login through that tenant's SSO). */
18:   tenantScope?: string;
19:   /** "dev", "oidc:platform", "oidc:<connectionId>". */
20:   method: string;
21:   csrf: string;
22:   userAgent?: string;
23:   ip?: string;
24:   createdAt: string;
25:   expiresAt: string;
26:   lastSeenAt: string;
27: }
28:
29: export interface ApiTokenRecord {
30:   id: string;
31:   tenantId: string;
32:   name: string;
33:   role: Role;
34:   /** First characters of the token, for recognition in lists. */
35:   prefix: string;
36:   createdBy: string;
37:   createdAt: string;
38:   expiresAt?: string;
39:   revokedAt?: string;
40:   lastUsedAt?: string;
41: }
42:
43: export interface SsoConnection {
44:   id: string;
45:   tenantId: string;
46:   name: string;
47:   issuer: string;
48:   clientId: string;
49:   /** AES-256-GCM sealed with the server secret; never returned by the API. */
50:   clientSecretSealed?: string;
51:   /** Email domains the connection claims. Only verified ones route and admit people. */
52:   domains: string[];
53:   /** Per claimed domain: its DNS challenge and, once proven, how and when. */
54:   verification?: Record<string, DomainVerification>;
55:   /** Create a membership on first login for users of the connection's domains. */
56:   jitProvisioning: boolean;
57:   defaultRole: Role;
58:   enabled: boolean;
59:   createdAt: string;
60:   updatedAt: string;
61: }
62:
63: /**
64:  * Proof that an organization controls an email domain: a TXT record carrying `token` at
65:  * `_visua-challenge.<domain>` ("dns"), a domain claimed before verification existed
66:  * ("grandfathered"), or one accepted while the operator turned verification off ("trusted").
67:  */
68: export interface DomainVerification {
69:   token: string;
70:   verifiedAt?: string;
71:   method?: "dns" | "grandfathered" | "trusted";
72:   /** Last re-check that got an answer (found or missing). */
73:   lastCheckedAt?: string;
74:   /** When the domain is next looked up (DNS-proven and lapsed domains only). */
75:   nextCheckAt?: string;
76:   /** First re-check of the current failure that did not find the record. */
77:   failingSince?: string;
78:   /** When a failing domain lapses unless its record comes back. */
79:   lapsesAt?: string;
80:   /** When it lapsed: it then admits no one new and holds no claim (verifiedAt is cleared). */
81:   lapsedAt?: string;
82: }
83:
84: export interface LoginFlow {
85:   /** "platform" or an SSO connection id. */
86:   connection: string;
87:   codeVerifier: string;
88:   nonce: string;
89:   returnTo: string;
90:   /** SHA-256 of the pre-auth cookie of the browser that started the flow: only that browser can finish it. */
91:   binding?: string;
92:   createdAt: string;
93: }
94:
95: class Tenants extends Repo {
96:   async get(id: string): Promise<Tenant | undefined> {
97:     const [row] = await this.db.query<DataRow>(`SELECT data FROM tenants WHERE id = ?`, [id]);
98:     return row ? parseJson<Tenant>(row.data) : undefined;
99:   }
100:   async getBySlug(slug: string): Promise<Tenant | undefined> {
101:     const [row] = await this.db.query<DataRow>(`SELECT data FROM tenants WHERE slug = ?`, [slug]);
102:     return row ? parseJson<Tenant>(row.data) : undefined;
103:   }
104:   async list(): Promise<Tenant[]> {
105:     return (await this.db.query<DataRow>(`SELECT data FROM tenants ORDER BY created_at ASC`)).map((r) => parseJson<Tenant>(r.data));
106:   }
107:   async count(): Promise<number> {
108:     const [row] = await this.db.query<{ n: number }>(`SELECT COUNT(*) AS n FROM tenants`);
109:     return Number(row?.n ?? 0);
110:   }
111:   async put(t: Tenant): Promise<Tenant> {
112:     await this.db.execute(
113:       `INSERT INTO tenants (id, slug, data, created_at, updated_at) VALUES (?, ?, ${this.J}, ?, ?)
114:        ON CONFLICT (id) DO UPDATE SET slug = excluded.slug, data = excluded.data, updated_at = excluded.updated_at`,
115:       [t.id, t.slug, JSON.stringify(t), t.createdAt, t.updatedAt],
116:     );
117:     return t;
118:   }
119: }
120:
121: class Users extends Repo {
122:   async get(id: string): Promise<User | undefined> {
123:     const [row] = await this.db.query<DataRow>(`SELECT data FROM users WHERE id = ?`, [id]);
124:     return row ? parseJson<User>(row.data) : undefined;
125:   }
126:   async getByEmail(email: string): Promise<User | undefined> {
127:     const [row] = await this.db.query<DataRow>(`SELECT data FROM users WHERE email = ?`, [email.trim().toLowerCase()]);
128:     return row ? parseJson<User>(row.data) : undefined;
129:   }
130:   async put(u: User): Promise<User> {
131:     const user = { ...u, email: u.email.trim().toLowerCase() };
132:     await this.db.execute(
133:       `INSERT INTO users (id, email, data, created_at, updated_at) VALUES (?, ?, ${this.J}, ?, ?)
134:        ON CONFLICT (id) DO UPDATE SET email = excluded.email, data = excluded.data, updated_at = excluded.updated_at`,
135:       [user.id, user.email, JSON.stringify(user), user.createdAt, user.updatedAt],
136:     );
137:     return user;
138:   }
139: }
140:
141: type MembershipRow = { tenant_id: string; user_id: string; role: Role; created_at: string; updated_at: string };
142: const toMembership = (r: MembershipRow): Membership => ({ tenantId: r.tenant_id, userId: r.user_id, role: r.role, createdAt: r.created_at, updatedAt: r.updated_at });
143:
144: class Memberships extends Repo {
145:   async get(tenantId: string, userId: string): Promise<Membership | undefined> {
146:     const [row] = await this.db.query<MembershipRow>(`SELECT * FROM memberships WHERE tenant_id = ? AND user_id = ?`, [tenantId, userId]);
147:     return row ? toMembership(row) : undefined;
148:   }
149:   async forUser(userId: string): Promise<{ membership: Membership; tenant: Tenant }[]> {
150:     const rows = await this.db.query<MembershipRow & { tdata: unknown }>(
151:       `SELECT m.*, t.data AS tdata FROM memberships m JOIN tenants t ON t.id = m.tenant_id WHERE m.user_id = ? ORDER BY t.created_at ASC`,
152:       [userId],
153:     );
154:     return rows.map((r) => ({ membership: toMembership(r), tenant: parseJson<Tenant>(r.tdata) }));
155:   }
156:   async forTenant(tenantId: string): Promise<{ membership: Membership; user: User }[]> {
157:     const rows = await this.db.query<MembershipRow & { udata: unknown }>(
158:       `SELECT m.*, u.data AS udata FROM memberships m JOIN users u ON u.id = m.user_id WHERE m.tenant_id = ? ORDER BY m.created_at ASC`,
159:       [tenantId],
160:     );
161:     return rows.map((r) => ({ membership: toMembership(r), user: parseJson<User>(r.udata) }));
162:   }
163:   async put(m: Membership): Promise<Membership> {
164:     await this.db.execute(
165:       `INSERT INTO memberships (tenant_id, user_id, role, created_at, updated_at) VALUES (?, ?, ?, ?, ?)
166:        ON CONFLICT (tenant_id, user_id) DO UPDATE SET role = excluded.role, updated_at = excluded.updated_at`,
167:       [m.tenantId, m.userId, m.role, m.createdAt, m.updatedAt],
168:     );
169:     return m;
170:   }
171:   async delete(tenantId: string, userId: string): Promise<boolean> {
172:     return (await this.db.execute(`DELETE FROM memberships WHERE tenant_id = ? AND user_id = ?`, [tenantId, userId])) > 0;
173:   }
174:   async owners(tenantId: string): Promise<number> {
175:     const [row] = await this.db.query<{ n: number }>(`SELECT COUNT(*) AS n FROM memberships WHERE tenant_id = ? AND role = 'owner'`, [tenantId]);
176:     return Number(row?.n ?? 0);
177:   }
178: }
179:
180: class Identities extends Repo {
181:   async find(issuer: string, subject: string): Promise<{ userId: string; email?: string } | undefined> {
182:     const [row] = await this.db.query<{ user_id: string; email: string | null }>(`SELECT user_id, email FROM identities WHERE issuer = ? AND subject = ?`, [issuer, subject]);
183:     return row ? { userId: row.user_id, email: row.email ?? undefined } : undefined;
184:   }
185:   async link(issuer: string, subject: string, userId: string, email?: string): Promise<void> {
186:     const ts = now();
187:     await this.db.execute(
188:       `INSERT INTO identities (issuer, subject, user_id, email, created_at, last_login_at) VALUES (?, ?, ?, ?, ?, ?)
189:        ON CONFLICT (issuer, subject) DO UPDATE SET email = excluded.email, last_login_at = excluded.last_login_at`,
190:       [issuer, subject, userId, email ?? null, ts, ts],
191:     );
192:   }
193: }
194:
195: type SessionRow = { id_hash: string; user_id: string; tenant_id: string | null; data: unknown; expires_at: string; last_seen_at: string };
196:
197: class Sessions extends Repo {
198:   async create(idHash: string, s: SessionRecord): Promise<void> {
199:     await this.db.execute(`INSERT INTO sessions (id_hash, user_id, tenant_id, data, created_at, expires_at, last_seen_at) VALUES (?, ?, ?, ${this.J}, ?, ?, ?)`, [
200:       idHash,
201:       s.userId,
202:       s.activeTenantId ?? null,
203:       JSON.stringify(s),
204:       s.createdAt,
205:       s.expiresAt,
206:       s.lastSeenAt,
207:     ]);
208:   }
209:   async get(idHash: string): Promise<SessionRecord | undefined> {
210:     const [row] = await this.db.query<SessionRow>(`SELECT * FROM sessions WHERE id_hash = ?`, [idHash]);
211:     if (!row) return undefined;
212:     return { ...parseJson<SessionRecord>(row.data), activeTenantId: row.tenant_id ?? undefined, expiresAt: row.expires_at, lastSeenAt: row.last_seen_at };
213:   }
214:   async update(idHash: string, s: SessionRecord): Promise<void> {
215:     await this.db.execute(`UPDATE sessions SET tenant_id = ?, data = ${this.J}, expires_at = ?, last_seen_at = ? WHERE id_hash = ?`, [
216:       s.activeTenantId ?? null,
217:       JSON.stringify(s),
218:       s.expiresAt,
219:       s.lastSeenAt,
220:       idHash,
221:     ]);
222:   }
223:   async delete(idHash: string): Promise<void> {
224:     await this.db.execute(`DELETE FROM sessions WHERE id_hash = ?`, [idHash]);
225:   }
226:   async deleteForUser(userId: string): Promise<void> {
227:     await this.db.execute(`DELETE FROM sessions WHERE user_id = ?`, [userId]);
228:   }
229:   async purgeExpired(at = now()): Promise<number> {
230:     return this.db.execute(`DELETE FROM sessions WHERE expires_at < ?`, [at]);
231:   }
232: }
233:
234: type TokenRow = { data: unknown; last_used_at: string | null; revoked_at: string | null };
235:
236: class ApiTokens extends Repo {
237:   private read(r: TokenRow): ApiTokenRecord {
238:     return { ...parseJson<ApiTokenRecord>(r.data), lastUsedAt: r.last_used_at ?? undefined, revokedAt: r.revoked_at ?? undefined };
239:   }
240:   async create(hash: string, t: ApiTokenRecord): Promise<void> {
241:     await this.db.execute(`INSERT INTO api_tokens (id, tenant_id, token_hash, data, created_at, expires_at) VALUES (?, ?, ?, ${this.J}, ?, ?)`, [
242:       t.id,
243:       t.tenantId,
244:       hash,
245:       JSON.stringify(t),
246:       t.createdAt,
247:       t.expiresAt ?? null,
248:     ]);
249:   }
250:   async byHash(hash: string): Promise<ApiTokenRecord | undefined> {
251:     const [row] = await this.db.query<TokenRow>(`SELECT data, last_used_at, revoked_at FROM api_tokens WHERE token_hash = ?`, [hash]);
252:     return row ? this.read(row) : undefined;
253:   }
254:   async forTenant(tenantId: string): Promise<ApiTokenRecord[]> {
255:     const rows = await this.db.query<TokenRow>(`SELECT data, last_used_at, revoked_at FROM api_tokens WHERE tenant_id = ? ORDER BY created_at DESC`, [tenantId]);
256:     return rows.map((r) => this.read(r));
257:   }
258:   async revoke(tenantId: string, id: string): Promise<boolean> {
259:     return (await this.db.execute(`UPDATE api_tokens SET revoked_at = ? WHERE tenant_id = ? AND id = ? AND revoked_at IS NULL`, [now(), tenantId, id])) > 0;
260:   }
261:   async touch(id: string, at = now()): Promise<void> {
262:     await this.db.execute(`UPDATE api_tokens SET last_used_at = ? WHERE id = ?`, [at, id]);
263:   }
264: }
265:
266: class SsoConnections extends Repo {
267:   async get(id: string): Promise<SsoConnection | undefined> {
268:     const [row] = await this.db.query<DataRow>(`SELECT data FROM sso_connections WHERE id = ?`, [id]);
269:     return row ? parseJson<SsoConnection>(row.data) : undefined;
270:   }
271:   async forTenant(tenantId: string): Promise<SsoConnection[]> {
272:     return (await this.db.query<DataRow>(`SELECT data FROM sso_connections WHERE tenant_id = ? ORDER BY created_at ASC`, [tenantId])).map((r) => parseJson<SsoConnection>(r.data));
273:   }
274:   /**
275:    * The connection people of a domain are sent to: the one that has verified it, else the one
276:    * whose proof lapsed most recently (its members keep signing in until someone proves the domain).
277:    */
278:   async byDomain(domain: string): Promise<SsoConnection | undefined> {
279:     const [row] = await this.db.query<DataRow>(
280:       `SELECT c.data FROM sso_domains d JOIN sso_connections c ON c.id = d.connection_id
281:        WHERE d.domain = ? AND (d.verified_at IS NOT NULL OR d.lapsed_at IS NOT NULL)
282:        ORDER BY CASE WHEN d.verified_at IS NOT NULL THEN 0 ELSE 1 END, d.lapsed_at DESC LIMIT 1`,
283:       [domain.toLowerCase()],
284:     );
285:     return row ? parseJson<SsoConnection>(row.data) : undefined;
286:   }
287:   /** The id of the connection that has verified a domain. */
288:   async domainOwner(domain: string): Promise<string | undefined> {
289:     const [row] = await this.db.query<{ connection_id: string }>(`SELECT connection_id FROM sso_domains WHERE domain = ? AND verified_at IS NOT NULL`, [domain.toLowerCase()]);
290:     return row?.connection_id;
291:   }
292:   /** Every connection that claims a domain, verified or not. */
293:   async claimants(domain: string): Promise<{ connectionId: string; tenantId: string; verified: boolean }[]> {
294:     const rows = await this.db.query<{ connection_id: string; tenant_id: string; verified_at: string | null }>(
295:       `SELECT connection_id, tenant_id, verified_at FROM sso_domains WHERE domain = ?`,
296:       [domain.toLowerCase()],
297:     );
298:     return rows.map((r) => ({ connectionId: r.connection_id, tenantId: r.tenant_id, verified: !!r.verified_at }));
299:   }
300:   /** Domains whose re-check is due at `atIso`, oldest first. */
301:   async dueForRecheck(atIso: string, limit: number): Promise<{ connectionId: string; domain: string }[]> {
302:     const rows = await this.db.query<{ connection_id: string; domain: string }>(
303:       `SELECT connection_id, domain FROM sso_domains WHERE next_check_at IS NOT NULL AND next_check_at <= ? ORDER BY next_check_at LIMIT ?`,
304:       [atIso, limit],
305:     );
306:     return rows.map((r) => ({ connectionId: r.connection_id, domain: r.domain }));
307:   }
308:   async put(c: SsoConnection): Promise<SsoConnection> {
309:     await this.store.atomic(async () => {
310:       await this.db.execute(
311:         `INSERT INTO sso_connections (id, tenant_id, data, created_at, updated_at) VALUES (?, ?, ${this.J}, ?, ?)
312:          ON CONFLICT (id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at`,
313:         [c.id, c.tenantId, JSON.stringify(c), c.createdAt, c.updatedAt],
314:       );
315:       await this.db.execute(`DELETE FROM sso_domains WHERE connection_id = ?`, [c.id]);
316:       for (const d of c.domains) {
317:         const v = c.verification?.[d];
318:         await this.db.execute(`INSERT INTO sso_domains (domain, connection_id, tenant_id, verified_at, lapsed_at, next_check_at) VALUES (?, ?, ?, ?, ?, ?)`, [
319:           d.toLowerCase(),
320:           c.id,
321:           c.tenantId,
322:           v?.verifiedAt ?? null,
323:           v?.lapsedAt ?? null,
324:           v?.nextCheckAt ?? null,
325:         ]);
326:       }
327:     });
328:     return c;
329:   }
330:   async delete(tenantId: string, id: string): Promise<boolean> {
331:     return this.store.atomic(async () => {
332:       await this.db.execute(`DELETE FROM sso_domains WHERE connection_id = ?`, [id]);
333:       return (await this.db.execute(`DELETE FROM sso_connections WHERE tenant_id = ? AND id = ?`, [tenantId, id])) > 0;
334:     });
335:   }
336: }
337:
338: class LoginFlows extends Repo {
339:   async put(stateHash: string, flow: LoginFlow, expiresAt: string): Promise<void> {
340:     await this.db.execute(`INSERT INTO login_flows (state_hash, data, expires_at) VALUES (?, ${this.J}, ?)`, [stateHash, JSON.stringify(flow), expiresAt]);
341:   }
342:   /** Single use: returns the flow and deletes it. */
343:   async take(stateHash: string): Promise<LoginFlow | undefined> {
344:     return this.store.atomic(async () => {
345:       const [row] = await this.db.query<{ data: unknown; expires_at: string }>(`SELECT data, expires_at FROM login_flows WHERE state_hash = ?`, [stateHash]);
346:       if (!row) return undefined;
347:       await this.db.execute(`DELETE FROM login_flows WHERE state_hash = ?`, [stateHash]);
348:       return row.expires_at < now() ? undefined : parseJson<LoginFlow>(row.data);
349:     });
350:   }
351:   async purgeExpired(at = now()): Promise<number> {
352:     return this.db.execute(`DELETE FROM login_flows WHERE expires_at < ?`, [at]);
353:   }
354: }
355:
356: export class IdentityStore {
357:   readonly tenants: Tenants;
358:   readonly users: Users;
359:   readonly memberships: Memberships;
360:   readonly identities: Identities;
361:   readonly sessions: Sessions;
362:   readonly apiTokens: ApiTokens;
363:   readonly sso: SsoConnections;
364:   readonly loginFlows: LoginFlows;
365:
366:   constructor(store: StoreContext) {
367:     this.tenants = new Tenants(store);
368:     this.users = new Users(store);
369:     this.memberships = new Memberships(store);
370:     this.identities = new Identities(store);
371:     this.sessions = new Sessions(store);
372:     this.apiTokens = new ApiTokens(store);
373:     this.sso = new SsoConnections(store);
374:     this.loginFlows = new LoginFlows(store);
375:   }
376: }

FILE apps/server/src/storage/index.ts SHA256 2a804e9a6490508a8518d03be900937c71135dc235c7becb1295b2641d74ca82
1: /**
2:  * Storage entry point. `VISUA_DATABASE_URL` selects the backend:
3:  *   postgres://user:pass@host:5432/db   → PostgreSQL (production, multi-instance)
4:  *   file path or ":memory:"              → embedded SQLite (local use, demos, tests)
5:  */
6: import { migrate } from "./migrations.ts";
7: import { PostgresDriver } from "./postgres.ts";
8: import { SqliteDriver } from "./sqlite.ts";
9: import { Store } from "./store.ts";
10:
11: export { Collection, ActivityLog, StateTable, WorkspaceTable, Store } from "./store.ts";
12: export type { ApiTokenRecord, DomainVerification, LoginFlow, SessionRecord, SsoConnection } from "./identity.ts";
13: export { DEFAULT_TENANT_ID } from "./migrations.ts";
14: export type { Dialect, SqlDriver } from "./driver.ts";
15:
16: export const isPostgresUrl = (url: string) => /^postgres(ql)?:\/\//i.test(url);
17:
18: /** Human-readable backend description with credentials removed. */
19: export function describeDatabase(url: string): string {
20:   if (!isPostgresUrl(url)) return url === ":memory:" ? "SQLite (in memory)" : `SQLite (${url})`;
21:   try {
22:     const u = new URL(url);
23:     return `PostgreSQL (${u.hostname}${u.port ? `:${u.port}` : ""}${u.pathname})`;
24:   } catch {
25:     return "PostgreSQL";
26:   }
27: }
28:
29: export async function openStore(url: string): Promise<Store> {
30:   const driver = isPostgresUrl(url) ? new PostgresDriver(url) : new SqliteDriver(url);
31:   try {
32:     await migrate(driver);
33:   } catch (err) {
34:     await driver.close().catch(() => undefined);
35:     throw err;
36:   }
37:   return new Store(driver);
38: }

FILE apps/server/src/storage/migrations.ts SHA256 aaa78f8543f2d188c3668df35b2ac7d4ce712d5f93328b470f19fb80c69b9c41
1: /**
2:  * Versioned schema migrations for both backends. Each migration runs once, in
3:  * order, inside one transaction, under a lock so several instances starting
4:  * together cannot race. Version 1 is the baseline: it creates the complete
5:  * schema and upgrades SQLite databases written before migrations existed.
6:  */
7: import { createHash, randomBytes } from "node:crypto";
8: import { parseJson, type Dialect, type SqlDriver } from "./driver.ts";
9:
10: export interface Migration {
11:   version: number;
12:   name: string;
13:   up(db: SqlDriver): Promise<void>;
14: }
15:
16: /** Workspace-scoped JSON document tables (id, workspace_id, data, updated_at). */
17: export const DOCUMENT_TABLES = ["tasks", "evidence", "policies", "risks", "connectors", "check_results", "agent_runs", "proposals", "activity"] as const;
18:
19: const json = (d: Dialect) => (d === "postgres" ? "JSONB" : "TEXT");
20:
21: async function columns(db: SqlDriver, table: string): Promise<Set<string>> {
22:   if (db.dialect === "postgres") {
23:     const rows = await db.query<{ column_name: string }>(`SELECT column_name FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = ?`, [table]);
24:     return new Set(rows.map((r) => r.column_name));
25:   }
26:   const rows = await db.query<{ name: string }>(`SELECT name FROM pragma_table_info(?)`, [table]);
27:   return new Set(rows.map((r) => r.name));
28: }
29:
30: async function run(db: SqlDriver, statements: string[]): Promise<void> {
31:   for (const sql of statements) await db.execute(sql);
32: }
33:
34: export const DEFAULT_TENANT_ID = "tnt_default";
35:
36: const baseline: Migration = {
37:   version: 1,
38:   name: "baseline schema: tenancy, identity and workspace data",
39:   async up(db) {
40:     const J = json(db.dialect);
41:     // Postgres has no rowid: a serial column keeps insertion order stable for equal timestamps.
42:     const POS = db.dialect === "postgres" ? ", pos BIGSERIAL" : "";
43:     const FK = (table: string, column = "id") => `REFERENCES ${table}(${column}) ON DELETE CASCADE`;
44:     await run(db, [
45:       // Tenancy & identity
46:       `CREATE TABLE IF NOT EXISTS tenants (id TEXT PRIMARY KEY, slug TEXT NOT NULL UNIQUE, data ${J} NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL)`,
47:       `CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE, data ${J} NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL)`,
48:       `CREATE TABLE IF NOT EXISTS memberships (tenant_id TEXT NOT NULL ${FK("tenants")}, user_id TEXT NOT NULL ${FK("users")}, role TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, PRIMARY KEY (tenant_id, user_id))`,
49:       `CREATE INDEX IF NOT EXISTS memberships_user ON memberships(user_id)`,
50:       `CREATE TABLE IF NOT EXISTS identities (issuer TEXT NOT NULL, subject TEXT NOT NULL, user_id TEXT NOT NULL ${FK("users")}, email TEXT, created_at TEXT NOT NULL, last_login_at TEXT, PRIMARY KEY (issuer, subject))`,
51:       `CREATE INDEX IF NOT EXISTS identities_user ON identities(user_id)`,
52:       `CREATE TABLE IF NOT EXISTS sessions (id_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL ${FK("users")}, tenant_id TEXT, data ${J} NOT NULL, created_at TEXT NOT NULL, expires_at TEXT NOT NULL, last_seen_at TEXT NOT NULL)`,
53:       `CREATE INDEX IF NOT EXISTS sessions_user ON sessions(user_id)`,
54:       `CREATE INDEX IF NOT EXISTS sessions_expiry ON sessions(expires_at)`,
55:       `CREATE TABLE IF NOT EXISTS api_tokens (id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL ${FK("tenants")}, token_hash TEXT NOT NULL UNIQUE, data ${J} NOT NULL, created_at TEXT NOT NULL, expires_at TEXT, revoked_at TEXT, last_used_at TEXT)`,
56:       `CREATE INDEX IF NOT EXISTS api_tokens_tenant ON api_tokens(tenant_id)`,
57:       `CREATE TABLE IF NOT EXISTS sso_connections (id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL ${FK("tenants")}, data ${J} NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL)`,
58:       `CREATE INDEX IF NOT EXISTS sso_connections_tenant ON sso_connections(tenant_id)`,
59:       `CREATE TABLE IF NOT EXISTS sso_domains (domain TEXT PRIMARY KEY, connection_id TEXT NOT NULL ${FK("sso_connections")}, tenant_id TEXT NOT NULL)`,
60:       `CREATE TABLE IF NOT EXISTS login_flows (state_hash TEXT PRIMARY KEY, data ${J} NOT NULL, expires_at TEXT NOT NULL)`,
61:       // Workspace data
62:       `CREATE TABLE IF NOT EXISTS workspaces (id TEXT PRIMARY KEY, slug TEXT NOT NULL UNIQUE, data ${J} NOT NULL, updated_at TEXT NOT NULL${POS})`,
63:       `CREATE TABLE IF NOT EXISTS requirement_states (workspace_id TEXT NOT NULL, node_id TEXT NOT NULL, data ${J} NOT NULL, updated_at TEXT NOT NULL, PRIMARY KEY (workspace_id, node_id))`,
64:       ...DOCUMENT_TABLES.flatMap((t) => [
65:         `CREATE TABLE IF NOT EXISTS ${t} (id TEXT PRIMARY KEY, workspace_id TEXT NOT NULL, data ${J} NOT NULL, updated_at TEXT NOT NULL${POS})`,
66:         `CREATE INDEX IF NOT EXISTS ${t}_ws ON ${t}(workspace_id, updated_at)`,
67:       ]),
68:     ]);
69:
70:     // Columns added since the first release. A fresh database gets them here;
71:     // a SQLite database written by an earlier Visua version is upgraded in place.
72:     const ws = await columns(db, "workspaces");
73:     if (!ws.has("tenant_id")) await db.execute(`ALTER TABLE workspaces ADD COLUMN tenant_id TEXT`);
74:     if (!ws.has("rev")) await db.execute(`ALTER TABLE workspaces ADD COLUMN rev INTEGER NOT NULL DEFAULT 0`);
75:     const activity = await columns(db, "activity");
76:     if (!activity.has("seq")) {
77:       await db.execute(`ALTER TABLE activity ADD COLUMN seq INTEGER`);
78:       await db.execute(
79:         db.dialect === "postgres"
80:           ? `UPDATE activity SET seq = (data->>'seq')::int WHERE data->>'seq' IS NOT NULL`
81:           : `UPDATE activity SET seq = json_extract(data, '$.seq') WHERE json_extract(data, '$.seq') IS NOT NULL`,
82:       );
83:     }
84:     await run(db, [
85:       `CREATE INDEX IF NOT EXISTS workspaces_tenant ON workspaces(tenant_id, updated_at)`,
86:       // One link per position: the audit chain can never fork.
87:       `CREATE UNIQUE INDEX IF NOT EXISTS activity_chain ON activity(workspace_id, seq)`,
88:     ]);
89:
90:     // Workspaces from before tenancy belong to a default organization.
91:     const orphans = await db.query<{ n: number }>(`SELECT COUNT(*) AS n FROM workspaces WHERE tenant_id IS NULL`);
92:     if (Number(orphans[0]?.n ?? 0) > 0) {
93:       const ts = new Date().toISOString();
94:       const exists = await db.query(`SELECT id FROM tenants WHERE id = ?`, [DEFAULT_TENANT_ID]);
95:       if (!exists.length) {
96:         await db.execute(`INSERT INTO tenants (id, slug, data, created_at, updated_at) VALUES (?, ?, ${db.dialect === "postgres" ? "?::jsonb" : "?"}, ?, ?)`, [
97:           DEFAULT_TENANT_ID,
98:           "default",
99:           JSON.stringify({ id: DEFAULT_TENANT_ID, slug: "default", name: "Default organization", settings: {}, createdAt: ts, updatedAt: ts }),
100:           ts,
101:           ts,
102:         ]);
103:       }
104:       await db.execute(`UPDATE workspaces SET tenant_id = ? WHERE tenant_id IS NULL`, [DEFAULT_TENANT_ID]);
105:     }
106:   },
107: };
108:
109: /**
110:  * Version 1 created the default organization of an upgraded installation without its
111:  * settings, and access checks read them: give every organization settings.
112:  */
113: const tenantSettings: Migration = {
114:   version: 2,
115:   name: "every organization has settings",
116:   async up(db) {
117:     await db.execute(
118:       db.dialect === "postgres"
119:         ? `UPDATE tenants SET data = jsonb_set(data, '{settings}', '{}'::jsonb) WHERE data->'settings' IS NULL OR jsonb_typeof(data->'settings') <> 'object'`
120:         : `UPDATE tenants SET data = json_set(data, '$.settings', json('{}')) WHERE json_type(data, '$.settings') IS NULL OR json_type(data, '$.settings') <> 'object'`,
121:     );
122:   },
123: };
124:
125: /**
126:  * SSO domains are verified by DNS. Several organizations may claim a domain while it is
127:  * pending, but only one can hold it verified (a partial unique index), and only verified
128:  * domains route sign-ins. Domains claimed before this version keep working: they are
129:  * recorded as verified, method "grandfathered", so no organization is locked out.
130:  */
131: const ssoDomainVerification: Migration = {
132:   version: 3,
133:   name: "SSO domains verified by DNS; existing claims grandfathered",
134:   async up(db) {
135:     const ts = new Date().toISOString();
136:     const FK = `REFERENCES sso_connections(id) ON DELETE CASCADE`;
137:     await run(db, [
138:       `CREATE TABLE sso_domains_v3 (domain TEXT NOT NULL, connection_id TEXT NOT NULL ${FK}, tenant_id TEXT NOT NULL, verified_at TEXT, PRIMARY KEY (domain, connection_id))`,
139:     ]);
140:     await db.execute(`INSERT INTO sso_domains_v3 (domain, connection_id, tenant_id, verified_at) SELECT domain, connection_id, tenant_id, ? FROM sso_domains`, [ts]);
141:     await run(db, [
142:       `DROP TABLE sso_domains`,
143:       `ALTER TABLE sso_domains_v3 RENAME TO sso_domains`,
144:       `CREATE UNIQUE INDEX sso_domains_verified ON sso_domains(domain) WHERE verified_at IS NOT NULL`,
145:       `CREATE INDEX sso_domains_connection ON sso_domains(connection_id)`,
146:     ]);
147:     const cast = db.dialect === "postgres" ? "?::jsonb" : "?";
148:     for (const row of await db.query<{ id: string; data: unknown }>(`SELECT id, data FROM sso_connections`)) {
149:       const connection = parseJson<{ domains?: string[]; verification?: Record<string, unknown> }>(row.data);
150:       const verification = { ...(connection.verification ?? {}) };
151:       for (const d of connection.domains ?? []) verification[d] ??= { token: randomBytes(16).toString("hex"), verifiedAt: ts, method: "grandfathered" };
152:       await db.execute(`UPDATE sso_connections SET data = ${cast} WHERE id = ?`, [JSON.stringify({ ...connection, verification }), row.id]);
153:     }
154:   },
155: };
156:
157: /**
158:  * Domains proven by DNS are looked at again periodically (auth/service.ts: recheckDueDomains).
159:  * The schedule and a lapse live in each connection's verification record and are mirrored
160:  * here for querying and routing. Each DNS-proven domain gets a first re-check spread over
161:  * the next day by a stable hash, so an upgrade does not look up every domain at once.
162:  */
163: const ssoDomainRecheck: Migration = {
164:   version: 4,
165:   name: "SSO domains re-checked: schedule and lapse columns",
166:   async up(db) {
167:     await run(db, [
168:       `ALTER TABLE sso_domains ADD COLUMN lapsed_at TEXT`,
169:       `ALTER TABLE sso_domains ADD COLUMN next_check_at TEXT`,
170:       `CREATE INDEX sso_domains_next_check ON sso_domains(next_check_at)`,
171:     ]);
172:     const start = Date.now();
173:     const cast = db.dialect === "postgres" ? "?::jsonb" : "?";
174:     for (const row of await db.query<{ id: string; data: unknown }>(`SELECT id, data FROM sso_connections`)) {
175:       const connection = parseJson<{ domains?: string[]; verification?: Record<string, { method?: string; verifiedAt?: string; nextCheckAt?: string }> }>(row.data);
176:       const verification = { ...(connection.verification ?? {}) };
177:       let changed = false;
178:       for (const d of connection.domains ?? []) {
179:         const v = verification[d];
180:         if (!v?.verifiedAt || v.method !== "dns" || v.nextCheckAt) continue;
181:         const offset = createHash("sha256").update(`${d}|${row.id}`).digest().readUInt32BE(0) % 86_400_000;
182:         const nextCheckAt = new Date(start + offset).toISOString();
183:         verification[d] = { ...v, nextCheckAt };
184:         await db.execute(`UPDATE sso_domains SET next_check_at = ? WHERE domain = ? AND connection_id = ?`, [nextCheckAt, d.toLowerCase(), row.id]);
185:         changed = true;
186:       }
187:       if (changed) await db.execute(`UPDATE sso_connections SET data = ${cast} WHERE id = ?`, [JSON.stringify({ ...connection, verification }), row.id]);
188:     }
189:   },
190: };
191:
192: export const MIGRATIONS: Migration[] = [baseline, tenantSettings, ssoDomainVerification, ssoDomainRecheck];
193:
194: export async function migrate(driver: SqlDriver): Promise<number[]> {
195:   await driver.execute(`CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER PRIMARY KEY, name TEXT NOT NULL, applied_at TEXT NOT NULL)`);
196:   return driver.transaction(async (tx) => {
197:     await tx.lock("visua:migrations");
198:     const done = new Set((await tx.query<{ version: number }>(`SELECT version FROM schema_migrations`)).map((r) => Number(r.version)));
199:     const applied: number[] = [];
200:     for (const m of MIGRATIONS) {
201:       if (done.has(m.version)) continue;
202:       await m.up(tx);
203:       await tx.execute(`INSERT INTO schema_migrations (version, name, applied_at) VALUES (?, ?, ?)`, [m.version, m.name, new Date().toISOString()]);
204:       applied.push(m.version);
205:     }
206:     return applied;
207:   });
208: }

FILE apps/server/src/storage/postgres.ts SHA256 dc3686f017fe4f979d4bc775f9ec33a5b0d2050da6fa77b54208cb5d47518628
1: /**
2:  * Production backend on PostgreSQL (node-postgres pool). Documents are JSONB;
3:  * each transaction runs on one pooled client; `lock()` takes a transaction-
4:  * scoped advisory lock so writers that must be serialized (the hash-chained
5:  * audit trail) are, even across several server instances.
6:  */
7: import pg from "pg";
8: import { toPostgresParams, type Row, type SqlDriver } from "./driver.ts";
9:
10: // Keep int8 counters as numbers (they are small: sequence numbers, counts).
11: pg.types.setTypeParser(20, (v: string) => Number(v));
12:
13: class PgClientDriver implements SqlDriver {
14:   readonly dialect = "postgres" as const;
15:   private readonly client: pg.PoolClient;
16:   constructor(client: pg.PoolClient) {
17:     this.client = client;
18:   }
19:
20:   async query<R extends Row = Row>(sql: string, params: unknown[] = []): Promise<R[]> {
21:     const r = await this.client.query(toPostgresParams(sql), params);
22:     return r.rows as R[];
23:   }
24:
25:   async execute(sql: string, params: unknown[] = []): Promise<number> {
26:     const r = await this.client.query(toPostgresParams(sql), params);
27:     return r.rowCount ?? 0;
28:   }
29:
30:   async transaction<T>(fn: (tx: SqlDriver) => Promise<T>): Promise<T> {
31:     return fn(this);
32:   }
33:
34:   async lock(key: string): Promise<void> {
35:     await this.client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [key]);
36:   }
37:
38:   async close(): Promise<void> {
39:     // Pooled clients are released by the pool driver.
40:   }
41: }
42:
43: export class PostgresDriver implements SqlDriver {
44:   readonly dialect = "postgres" as const;
45:   readonly pool: pg.Pool;
46:
47:   constructor(connectionString: string, options: { max?: number } = {}) {
48:     this.pool = new pg.Pool({ connectionString, max: options.max ?? 10, application_name: "visua" });
49:   }
50:
51:   async query<R extends Row = Row>(sql: string, params: unknown[] = []): Promise<R[]> {
52:     const r = await this.pool.query(toPostgresParams(sql), params);
53:     return r.rows as R[];
54:   }
55:
56:   async execute(sql: string, params: unknown[] = []): Promise<number> {
57:     const r = await this.pool.query(toPostgresParams(sql), params);
58:     return r.rowCount ?? 0;
59:   }
60:
61:   async transaction<T>(fn: (tx: SqlDriver) => Promise<T>): Promise<T> {
62:     const client = await this.pool.connect();
63:     try {
64:       await client.query("BEGIN");
65:       try {
66:         const result = await fn(new PgClientDriver(client));
67:         await client.query("COMMIT");
68:         return result;
69:       } catch (err) {
70:         await client.query("ROLLBACK");
71:         throw err;
72:       }
73:     } finally {
74:       client.release();
75:     }
76:   }
77:
78:   async lock(key: string): Promise<void> {
79:     // Outside a transaction an advisory xact lock is released immediately; callers lock inside transactions.
80:     await this.pool.query("SELECT pg_advisory_xact_lock(hashtext($1))", [key]);
81:   }
82:
83:   async close(): Promise<void> {
84:     await this.pool.end();
85:   }
86: }

FILE apps/server/src/storage/repo.ts SHA256 f00d6b26d766b09f539f7d9de29452b94d23e68c1f1310d9f4673cf87842cbe5
1: import type { Dialect, SqlDriver } from "./driver.ts";
2:
3: /** What a repository needs from the store: the current connection and transactions. */
4: export interface StoreContext {
5:   readonly dialect: Dialect;
6:   db(): SqlDriver;
7:   atomic<T>(fn: () => Promise<T>): Promise<T>;
8: }
9:
10: export abstract class Repo {
11:   protected readonly store: StoreContext;
12:   constructor(store: StoreContext) {
13:     this.store = store;
14:   }
15:   protected get db(): SqlDriver {
16:     return this.store.db();
17:   }
18:   /** Placeholder for a JSON document parameter. */
19:   protected get J(): string {
20:     return this.store.dialect === "postgres" ? "?::jsonb" : "?";
21:   }
22:   /** Stable insertion order for rows with equal timestamps. */
23:   protected get pos(): string {
24:     return this.store.dialect === "postgres" ? "pos" : "rowid";
25:   }
26: }

FILE apps/server/src/storage/sqlite.ts SHA256 eb8a891df91057e305a612e3b748e886f882d939e0d12a0092abcf58d94fc85f
1: /**
2:  * Embedded backend on Node's built-in SQLite (node:sqlite): zero native
3:  * dependencies, ideal for local use, demos and tests. node:sqlite is
4:  * synchronous; a mutex serializes transactions so statements from concurrent
5:  * requests never interleave with an open transaction.
6:  */
7: import { mkdirSync } from "node:fs";
8: import { dirname } from "node:path";
9: import { DatabaseSync } from "node:sqlite";
10: import { Mutex, type Row, type SqlDriver } from "./driver.ts";
11:
12: type Param = null | number | bigint | string | Uint8Array;
13:
14: function bind(params: unknown[]): Param[] {
15:   return params.map((p) => {
16:     if (p === undefined || p === null) return null;
17:     if (typeof p === "boolean") return p ? 1 : 0;
18:     if (typeof p === "number" || typeof p === "bigint" || typeof p === "string" || p instanceof Uint8Array) return p;
19:     return JSON.stringify(p);
20:   });
21: }
22:
23: class SqliteConnection implements SqlDriver {
24:   readonly dialect = "sqlite" as const;
25:   protected readonly db: DatabaseSync;
26:   constructor(db: DatabaseSync) {
27:     this.db = db;
28:   }
29:
30:   async query<R extends Row = Row>(sql: string, params: unknown[] = []): Promise<R[]> {
31:     return this.db.prepare(sql).all(...bind(params)) as R[];
32:   }
33:
34:   async execute(sql: string, params: unknown[] = []): Promise<number> {
35:     if (!params.length && /;\s*\S/.test(sql.trim())) {
36:       this.db.exec(sql);
37:       return 0;
38:     }
39:     return Number(this.db.prepare(sql).run(...bind(params)).changes);
40:   }
41:
42:   async transaction<T>(fn: (tx: SqlDriver) => Promise<T>): Promise<T> {
43:     return fn(this);
44:   }
45:
46:   async lock(): Promise<void> {
47:     // Transactions are already serialized by the driver mutex.
48:   }
49:
50:   async close(): Promise<void> {
51:     this.db.close();
52:   }
53: }
54:
55: export class SqliteDriver extends SqliteConnection {
56:   private readonly mutex = new Mutex();
57:
58:   constructor(path: string) {
59:     if (path !== ":memory:") mkdirSync(dirname(path), { recursive: true });
60:     const db = new DatabaseSync(path);
61:     db.exec("PRAGMA journal_mode = WAL; PRAGMA synchronous = NORMAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;");
62:     super(db);
63:   }
64:
65:   override async query<R extends Row = Row>(sql: string, params: unknown[] = []): Promise<R[]> {
66:     const release = await this.mutex.acquire();
67:     try {
68:       return await super.query<R>(sql, params);
69:     } finally {
70:       release();
71:     }
72:   }
73:
74:   override async execute(sql: string, params: unknown[] = []): Promise<number> {
75:     const release = await this.mutex.acquire();
76:     try {
77:       return await super.execute(sql, params);
78:     } finally {
79:       release();
80:     }
81:   }
82:
83:   override async transaction<T>(fn: (tx: SqlDriver) => Promise<T>): Promise<T> {
84:     const release = await this.mutex.acquire();
85:     const tx = new SqliteConnection(this.db);
86:     try {
87:       this.db.exec("BEGIN IMMEDIATE");
88:       try {
89:         const result = await fn(tx);
90:         this.db.exec("COMMIT");
91:         return result;
92:       } catch (err) {
93:         this.db.exec("ROLLBACK");
94:         throw err;
95:       }
96:     } finally {
97:       release();
98:     }
99:   }
100: }

FILE apps/server/src/storage/store.ts SHA256 1b36452e0e5bf10ad0ea20f1b539fa4fe35e540e482087cf5b0a54e307eae31b
1: /**
2:  * Repositories over the SQL driver. Entities are JSON documents with indexed
3:  * columns, which keeps the domain model flexible while staying transactional
4:  * on both SQLite and Postgres.
5:  *
6:  * Every repository resolves its connection through `store.db()`: inside
7:  * `store.atomic()` / `store.transaction()` that is the open transaction, so a
8:  * service method and everything it calls commit or roll back together.
9:  */
10: import type { ActivityEvent, AgentRun, CheckResult, Connector, Evidence, Policy, Proposal, RequirementState, Risk, Task, Workspace } from "@visua/core";
11: import { parseJson, txContext, type Dialect, type SqlDriver, type TxContext } from "./driver.ts";
12: import { IdentityStore } from "./identity.ts";
13: import { Repo, type StoreContext } from "./repo.ts";
14:
15: type Entity = { id: string; workspaceId: string };
16: type DataRow = { data: unknown };
17:
18: const CHUNK = 200;
19: const now = () => new Date().toISOString();
20:
21: export class Collection<T extends Entity> extends Repo {
22:   readonly table: string;
23:   constructor(store: StoreContext, table: string) {
24:     super(store);
25:     this.table = table;
26:   }
27:
28:   async get(id: string): Promise<T | undefined> {
29:     const [row] = await this.db.query<DataRow>(`SELECT data FROM ${this.table} WHERE id = ?`, [id]);
30:     return row ? parseJson<T>(row.data) : undefined;
31:   }
32:
33:   async list(workspaceId: string): Promise<T[]> {
34:     const rows = await this.db.query<DataRow>(`SELECT data FROM ${this.table} WHERE workspace_id = ? ORDER BY updated_at ASC, ${this.pos} ASC`, [workspaceId]);
35:     return rows.map((r) => parseJson<T>(r.data));
36:   }
37:
38:   /** Most recent first. */
39:   async recent(workspaceId: string, limit: number): Promise<T[]> {
40:     const rows = await this.db.query<DataRow>(`SELECT data FROM ${this.table} WHERE workspace_id = ? ORDER BY updated_at DESC, ${this.pos} DESC LIMIT ?`, [
41:       workspaceId,
42:       Math.max(0, Math.floor(limit)),
43:     ]);
44:     return rows.map((r) => parseJson<T>(r.data));
45:   }
46:
47:   async put(entity: T, updatedAt: string = now()): Promise<T> {
48:     await this.db.execute(
49:       `INSERT INTO ${this.table} (id, workspace_id, data, updated_at) VALUES (?, ?, ${this.J}, ?)
50:        ON CONFLICT (id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at, workspace_id = excluded.workspace_id`,
51:       [entity.id, entity.workspaceId, JSON.stringify(entity), updatedAt],
52:     );
53:     return entity;
54:   }
55:
56:   /**
57:    * Atomic read-modify-write. The row is locked (Postgres) or the database
58:    * serialized (SQLite) until the surrounding transaction ends, so concurrent
59:    * writers never lose each other's updates. Returning `undefined` leaves the
60:    * row unchanged.
61:    */
62:   async update(id: string, fn: (current: T) => T | undefined, updatedAt?: string): Promise<T | undefined> {
63:     return this.store.atomic(async () => {
64:       const lock = this.store.dialect === "postgres" ? " FOR UPDATE" : "";
65:       const [row] = await this.db.query<DataRow>(`SELECT data FROM ${this.table} WHERE id = ?${lock}`, [id]);
66:       if (!row) return undefined;
67:       const current = parseJson<T>(row.data);
68:       const next = fn(current);
69:       if (!next) return current;
70:       await this.put(next, updatedAt);
71:       return next;
72:     });
73:   }
74:
75:   async delete(id: string): Promise<boolean> {
76:     return (await this.db.execute(`DELETE FROM ${this.table} WHERE id = ?`, [id])) > 0;
77:   }
78:
79:   async deleteWorkspace(workspaceId: string): Promise<void> {
80:     await this.db.execute(`DELETE FROM ${this.table} WHERE workspace_id = ?`, [workspaceId]);
81:   }
82:
83:   async count(workspaceId: string): Promise<number> {
84:     const [row] = await this.db.query<{ n: number }>(`SELECT COUNT(*) AS n FROM ${this.table} WHERE workspace_id = ?`, [workspaceId]);
85:     return Number(row?.n ?? 0);
86:   }
87: }
88:
89: /** The hash-chained audit trail: append-only, one row per link. */
90: export class ActivityLog extends Collection<ActivityEvent> {
91:   constructor(store: StoreContext) {
92:     super(store, "activity");
93:   }
94:
95:   async append(event: ActivityEvent): Promise<ActivityEvent> {
96:     await this.db.execute(`INSERT INTO activity (id, workspace_id, data, updated_at, seq) VALUES (?, ?, ${this.J}, ?, ?)`, [
97:       event.id,
98:       event.workspaceId,
99:       JSON.stringify(event),
100:       `${event.at}#${String(event.seq ?? 0).padStart(9, "0")}`,
101:       event.seq ?? null,
102:     ]);
103:     return event;
104:   }
105:
106:   /** The last link of the chain. */
107:   async head(workspaceId: string): Promise<ActivityEvent | undefined> {
108:     const [row] = await this.db.query<DataRow>(`SELECT data FROM activity WHERE workspace_id = ? AND seq IS NOT NULL ORDER BY seq DESC LIMIT 1`, [workspaceId]);
109:     return row ? parseJson<ActivityEvent>(row.data) : undefined;
110:   }
111:
112:   /** The whole chain in order. */
113:   async chain(workspaceId: string): Promise<ActivityEvent[]> {
114:     const rows = await this.db.query<DataRow>(`SELECT data FROM activity WHERE workspace_id = ? ORDER BY seq ASC, updated_at ASC`, [workspaceId]);
115:     return rows.map((r) => parseJson<ActivityEvent>(r.data));
116:   }
117: }
118:
119: export class StateTable extends Repo {
120:   async get(workspaceId: string, nodeId: string): Promise<RequirementState | undefined> {
121:     const [row] = await this.db.query<DataRow>(`SELECT data FROM requirement_states WHERE workspace_id = ? AND node_id = ?`, [workspaceId, nodeId]);
122:     return row ? parseJson<RequirementState>(row.data) : undefined;
123:   }
124:
125:   async getMany(workspaceId: string, nodeIds: Iterable<string>): Promise<Map<string, RequirementState>> {
126:     const ids = [...new Set(nodeIds)];
127:     const out = new Map<string, RequirementState>();
128:     for (let i = 0; i < ids.length; i += CHUNK) {
129:       const chunk = ids.slice(i, i + CHUNK);
130:       const rows = await this.db.query<DataRow>(`SELECT data FROM requirement_states WHERE workspace_id = ? AND node_id IN (${chunk.map(() => "?").join(", ")})`, [
131:         workspaceId,
132:         ...chunk,
133:       ]);
134:       for (const r of rows) {
135:         const s = parseJson<RequirementState>(r.data);
136:         out.set(s.nodeId, s);
137:       }
138:     }
139:     return out;
140:   }
141:
142:   /** All states of a workspace, optionally restricted to one framework. */
143:   async list(workspaceId: string, frameworkId?: string): Promise<RequirementState[]> {
144:     const rows = frameworkId
145:       ? await this.db.query<DataRow>(`SELECT data FROM requirement_states WHERE workspace_id = ? AND substr(node_id, 1, ?) = ?`, [workspaceId, frameworkId.length + 1, `${frameworkId}:`])
146:       : await this.db.query<DataRow>(`SELECT data FROM requirement_states WHERE workspace_id = ?`, [workspaceId]);
147:     return rows.map((r) => parseJson<RequirementState>(r.data));
148:   }
149:
150:   /** States of one framework keyed by node id. */
151:   async map(workspaceId: string, frameworkId?: string): Promise<Map<string, RequirementState>> {
152:     return new Map((await this.list(workspaceId, frameworkId)).map((s) => [s.nodeId, s]));
153:   }
154:
155:   async put(workspaceId: string, state: RequirementState): Promise<RequirementState> {
156:     await this.putMany(workspaceId, [state]);
157:     return state;
158:   }
159:
160:   async putMany(workspaceId: string, states: RequirementState[]): Promise<void> {
161:     for (let i = 0; i < states.length; i += CHUNK) {
162:       const chunk = states.slice(i, i + CHUNK);
163:       await this.db.execute(
164:         `INSERT INTO requirement_states (workspace_id, node_id, data, updated_at) VALUES ${chunk.map(() => `(?, ?, ${this.J}, ?)`).join(", ")}
165:          ON CONFLICT (workspace_id, node_id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at`,
166:         chunk.flatMap((s) => [workspaceId, s.nodeId, JSON.stringify(s), s.updatedAt]),
167:       );
168:     }
169:   }
170:
171:   async deleteWorkspace(workspaceId: string): Promise<void> {
172:     await this.db.execute(`DELETE FROM requirement_states WHERE workspace_id = ?`, [workspaceId]);
173:   }
174: }
175:
176: type WorkspaceRow = { data: unknown; tenant_id: string | null };
177:
178: export class WorkspaceTable extends Repo {
179:   private read(row: WorkspaceRow | undefined): Workspace | undefined {
180:     if (!row) return undefined;
181:     const ws = parseJson<Workspace>(row.data);
182:     return row.tenant_id ? { ...ws, tenantId: row.tenant_id } : ws;
183:   }
184:
185:   async get(idOrSlug: string): Promise<Workspace | undefined> {
186:     const [row] = await this.db.query<WorkspaceRow>(`SELECT data, tenant_id FROM workspaces WHERE id = ? OR slug = ?`, [idOrSlug, idOrSlug]);
187:     return this.read(row);
188:   }
189:
190:   /** Workspaces of one tenant (or all of them), most recently updated first. */
191:   async list(tenantId?: string): Promise<Workspace[]> {
192:     const rows = tenantId
193:       ? await this.db.query<WorkspaceRow>(`SELECT data, tenant_id FROM workspaces WHERE tenant_id = ? ORDER BY updated_at DESC, ${this.pos} DESC`, [tenantId])
194:       : await this.db.query<WorkspaceRow>(`SELECT data, tenant_id FROM workspaces ORDER BY updated_at DESC, ${this.pos} DESC`);
195:     return rows.map((r) => this.read(r)!);
196:   }
197:
198:   async slugTaken(slug: string): Promise<boolean> {
199:     return (await this.db.query(`SELECT 1 FROM workspaces WHERE slug = ?`, [slug])).length > 0;
200:   }
201:
202:   async put(ws: Workspace): Promise<Workspace> {
203:     await this.db.execute(
204:       `INSERT INTO workspaces (id, slug, data, updated_at, tenant_id) VALUES (?, ?, ${this.J}, ?, ?)
205:        ON CONFLICT (id) DO UPDATE SET slug = excluded.slug, data = excluded.data, updated_at = excluded.updated_at, tenant_id = excluded.tenant_id`,
206:       [ws.id, ws.slug, JSON.stringify(ws), ws.updatedAt, ws.tenantId ?? null],
207:     );
208:     return ws;
209:   }
210:
211:   async delete(id: string): Promise<void> {
212:     await this.db.execute(`DELETE FROM workspaces WHERE id = ?`, [id]);
213:   }
214:
215:   /** Revision counter: bumped by every audited change, it keys derived caches across instances. */
216:   async rev(id: string): Promise<number> {
217:     const [row] = await this.db.query<{ rev: number }>(`SELECT rev FROM workspaces WHERE id = ?`, [id]);
218:     return Number(row?.rev ?? 0);
219:   }
220:
221:   async bump(id: string): Promise<void> {
222:     await this.db.execute(`UPDATE workspaces SET rev = rev + 1 WHERE id = ?`, [id]);
223:   }
224: }
225:
226: export class Store implements StoreContext {
227:   readonly driver: SqlDriver;
228:   readonly workspaces: WorkspaceTable;
229:   readonly states: StateTable;
230:   readonly tasks: Collection<Task>;
231:   readonly evidence: Collection<Evidence>;
232:   readonly policies: Collection<Policy>;
233:   readonly risks: Collection<Risk>;
234:   readonly connectors: Collection<Connector>;
235:   readonly checks: Collection<CheckResult>;
236:   readonly runs: Collection<AgentRun>;
237:   readonly proposals: Collection<Proposal>;
238:   readonly activity: ActivityLog;
239:   readonly identity: IdentityStore;
240:   private savepoints = 0;
241:   private readonly closers: (() => Promise<void>)[] = [];
242:
243:   constructor(driver: SqlDriver) {
244:     this.driver = driver;
245:     this.workspaces = new WorkspaceTable(this);
246:     this.states = new StateTable(this);
247:     this.tasks = new Collection<Task>(this, "tasks");
248:     this.evidence = new Collection<Evidence>(this, "evidence");
249:     this.policies = new Collection<Policy>(this, "policies");
250:     this.risks = new Collection<Risk>(this, "risks");
251:     this.connectors = new Collection<Connector>(this, "connectors");
252:     this.checks = new Collection<CheckResult>(this, "check_results");
253:     this.runs = new Collection<AgentRun>(this, "agent_runs");
254:     this.proposals = new Collection<Proposal>(this, "proposals");
255:     this.activity = new ActivityLog(this);
256:     this.identity = new IdentityStore(this);
257:   }
258:
259:   get dialect(): Dialect {
260:     return this.driver.dialect;
261:   }
262:
263:   /** The connection for the current call chain: the open transaction, if any. */
264:   db(): SqlDriver {
265:     const ctx = txContext.getStore();
266:     return ctx?.open ? ctx.driver : this.driver;
267:   }
268:
269:   get inTransaction(): boolean {
270:     return !!txContext.getStore()?.open;
271:   }
272:
273:   /** Join the current transaction, or start one. */
274:   async atomic<T>(fn: () => Promise<T>): Promise<T> {
275:     return this.inTransaction ? fn() : this.transaction(fn);
276:   }
277:
278:   /**
279:    * Start a transaction; inside one, open a savepoint so a failure rolls back
280:    * only `fn`'s writes and the caller can recover.
281:    */
282:   async transaction<T>(fn: () => Promise<T>): Promise<T> {
283:     const parent = txContext.getStore();
284:     if (parent?.open) {
285:       const name = `visua_sp_${++this.savepoints}`;
286:       const child: TxContext = { driver: parent.driver, afterCommit: [], open: true };
287:       await parent.driver.execute(`SAVEPOINT ${name}`);
288:       try {
289:         const result = await txContext.run(child, fn);
290:         await parent.driver.execute(`RELEASE SAVEPOINT ${name}`);
291:         parent.afterCommit.push(...child.afterCommit);
292:         return result;
293:       } catch (err) {
294:         await parent.driver.execute(`ROLLBACK TO SAVEPOINT ${name}`);
295:         await parent.driver.execute(`RELEASE SAVEPOINT ${name}`);
296:         throw err;
297:       } finally {
298:         child.open = false;
299:       }
300:     }
301:     const ctx: TxContext = { driver: this.driver, afterCommit: [], open: true };
302:     const result = await this.driver.transaction((tx) => {
303:       ctx.driver = tx;
304:       return txContext.run(ctx, async () => {
305:         try {
306:           return await fn();
307:         } finally {
308:           ctx.open = false;
309:         }
310:       });
311:     });
312:     for (const task of ctx.afterCommit) {
313:       try {
314:         task();
315:       } catch (err) {
316:         console.error("[visua] after-commit task failed", err);
317:       }
318:     }
319:     return result;
320:   }
321:
322:   /** Run `fn` once the current transaction commits (immediately outside one); dropped on rollback. */
323:   afterCommit(fn: () => void): void {
324:     const ctx = txContext.getStore();
325:     if (ctx?.open) ctx.afterCommit.push(fn);
326:     else fn();
327:   }
328:
329:   /** Serialize writers on `key` until the current transaction ends (a no-op on SQLite, which serializes all writes). */
330:   async lock(key: string): Promise<void> {
331:     await this.db().lock(key);
332:   }
333:
334:   async deleteWorkspace(id: string): Promise<void> {
335:     await this.atomic(async () => {
336:       await this.states.deleteWorkspace(id);
337:       for (const c of [this.tasks, this.evidence, this.policies, this.risks, this.connectors, this.checks, this.runs, this.proposals, this.activity]) {
338:         await c.deleteWorkspace(id);
339:       }
340:       await this.workspaces.delete(id);
341:     });
342:   }
343:
344:   /** Resources to release with the store (listeners, relays). */
345:   onClose(fn: () => Promise<void>): void {
346:     this.closers.push(fn);
347:   }
348:
349:   async close(): Promise<void> {
350:     for (const fn of this.closers.splice(0)) await fn().catch(() => undefined);
351:     await this.driver.close();
352:   }
353: }

FILE apps/server/test/api.test.ts SHA256 6d41ff3ca00e4becef062c879c0a002569ceec18301186d3b36e5b1fdbe712b0
1: import { execFileSync } from "node:child_process";
2: import { mkdtempSync, rmSync } from "node:fs";
3: import { tmpdir } from "node:os";
4: import { join, resolve } from "node:path";
5: import { DatabaseSync } from "node:sqlite";
6: import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
7: import { FrameworkRegistry, REPO_ROOT } from "@visua/frameworks";
8: import { createApp } from "../src/app.ts";
9: import { loadAuthConfig } from "../src/auth/config.ts";
10: import { AuthService } from "../src/auth/service.ts";
11: import { CONNECTOR_KINDS } from "../src/connectors/index.ts";
12: import { createService } from "../src/context.ts";
13: import { seedDemo } from "../src/seed/demo.ts";
14: import { lawsOverview } from "../src/services/laws.ts";
15: import { nodeDetail } from "../src/services/views.ts";
16: import { TestClient } from "./client.ts";
17: import { testDatabase } from "./db.ts";
18:
19: process.env["VISUA_AGENT_MODE"] = "offline";
20:
21: const registry = FrameworkRegistry.load();
22: const db = await testDatabase("api");
23: const svc = await createService({ database: db.url, registry });
24: const auth = new AuthService(svc, { ...loadAuthConfig({}), mode: "dev" });
25: const app = createApp(svc, auth);
26:
27: afterAll(async () => {
28:   await svc.store.close();
29:   await db.cleanup();
30: });
31:
32: // The owner of a fresh organization: every capability.
33: const client = new TestClient(app);
34: await client.devLogin("owner@acme-fintech.example", "Ada Owner");
35: const api = <T = unknown>(method: string, path: string, body?: unknown) => client.request<T>(method, path, body ?? (method === "GET" ? undefined : {}));
36:
37: let wsId = "";
38:
39: describe("onboarding and assessment", () => {
40:   it("serves metadata about frameworks, agents and the corpus", async () => {
41:     const { status, json } = await api<{ frameworks: { id: string }[]; agents: unknown[]; corpus: unknown[]; ai: { mode: string } }>("GET", "/api/meta");
42:     expect(status).toBe(200);
43:     expect(json.frameworks.map((f) => f.id)).toEqual(expect.arrayContaining(["nist-csf-2.0", "nist-sp-800-53-r5", "nist-rmf"]));
44:     expect(json.agents).toHaveLength(8);
45:     expect(json.ai.mode).toBe("offline");
46:   });
47:
48:   it("creates a maturity- and niche-adapted workspace", async () => {
49:     const { status, json } = await api<{ workspace: { id: string; frameworks: { frameworkId: string }[] }; frameworks: { id: string; total: number }[] }>("POST", "/api/workspaces", {
50:       name: "Acme Fintech",
51:       profile: { industry: "fintech", size: "11-50", dataTypes: ["financial", "pii"], drivers: ["enterprise-customers"], environments: ["cloud"], maturityTier: 1, guidance: "guided", securityTeamSize: 1 },
52:       frameworks: ["nist-csf-2.0", "nist-sp-800-53-r5"],
53:       planInitialTasks: true,
54:     });
55:     expect(status).toBe(201);
56:     wsId = json.workspace.id;
57:     expect(json.frameworks.find((f) => f.id === "nist-csf-2.0")?.total).toBe(106);
58:     // Moderate baseline by default: 287 controls in scope.
59:     expect(json.frameworks.find((f) => f.id === "nist-sp-800-53-r5")?.total).toBe(287);
60:     const tasks = await api<unknown[]>("GET", `/api/workspaces/${wsId}/tasks`);
61:     expect(tasks.json.length).toBe(12);
62:   });
63:
64:   it("rejects invalid input with a 400", async () => {
65:     const res = await api("POST", "/api/workspaces", { name: "", profile: { industry: "unknown" } });
66:     expect(res.status).toBe(400);
67:   });
68:
69:   it("accepts every profile driver the onboarding and settings screens offer, including AI systems", async () => {
70:     const res = await api<{ workspace: { profile: { drivers: string[] } } }>("PATCH", `/api/workspaces/${wsId}`, { profile: { drivers: ["enterprise-customers", "ai-systems"] } });
71:     expect(res.status).toBe(200);
72:     expect(res.json.workspace.profile.drivers).toEqual(["enterprise-customers", "ai-systems"]);
73:     const rec = await api<{ frameworks: { frameworkId: string }[] }>("POST", "/api/recommend", { industry: "saas", size: "11-50", drivers: ["ai-systems"] });
74:     expect(rec.status).toBe(200);
75:     expect(rec.json.frameworks.map((f) => f.frameworkId)).toContain("nist-ai-rmf");
76:   });
77:
78:   it("updates a requirement and derives status", async () => {
79:     const res = await api<{ current: number }>("PATCH", `/api/workspaces/${wsId}/requirements/nist-csf-2.0:PR.AA-01`, { current: 3, target: 3, owner: "IT" });
80:     expect(res.status).toBe(200);
81:     expect(res.json.current).toBe(3);
82:     const detail = await api<{ status: { status: string }; mappings: unknown[]; source: { page: number } }>("GET", `/api/workspaces/${wsId}/requirements/nist-csf-2.0:PR.AA-01`);
83:     expect(detail.json.status.status).toBe("implemented");
84:     expect(detail.json.mappings.length).toBeGreaterThan(0);
85:     expect(detail.json.source.page).toBeGreaterThan(0);
86:     const state = await api<{ units: Record<string, { status: string }>; overall: { total: number } }>("GET", `/api/workspaces/${wsId}/frameworks/nist-csf-2.0/state`);
87:     expect(state.json.units["nist-csf-2.0:PR.AA-01"]?.status).toBe("implemented");
88:   });
89:
90:   it("records a CSF Tier assessment from the official Tier statements", async () => {
91:     const res = await api<{ workspace: { profile: { maturityTier: number }; tierAssessment: { governanceTier: number; managementTier: number } } }>("POST", `/api/workspaces/${wsId}/tiers`, {
92:       answers: { "risk-strategy": 3, prioritization: 3, "executive-oversight": 2, awareness: 2, consistency: 2, "information-sharing": 3, monitoring: 2, "supplier-risk": 2 },
93:     });
94:     expect(res.json.workspace.tierAssessment.governanceTier).toBe(2);
95:     expect(res.json.workspace.profile.maturityTier).toBe(2);
96:   });
97: });
98:
99: describe("RMF", () => {
100:   it("categorizes the system with FIPS 199 and re-scopes to the HIGH baseline", async () => {
101:     const res = await api<{ frameworks: { id: string; total: number; settings: { rmf: { baseline: string } } }[] }>("POST", `/api/workspaces/${wsId}/rmf/categorize`, {
102:       systemName: "Payments platform",
103:       informationTypes: [
104:         { id: "payments", name: "Payment transactions", confidentiality: "high", integrity: "high", availability: "moderate" },
105:         { id: "marketing", name: "Marketing content", confidentiality: "low", integrity: "low", availability: "low" },
106:       ],
107:     });
108:     const sp = res.json.frameworks.find((f) => f.id === "nist-sp-800-53-r5")!;
109:     expect(sp.settings.rmf.baseline).toBe("high");
110:     expect(sp.total).toBe(370);
111:   });
112:
113:   it("tailors a control out with a rationale, recorded in the audit trail", async () => {
114:     expect((await api("POST", `/api/workspaces/${wsId}/rmf/tailor`, { nodeId: "nist-sp-800-53-r5:PE-3", action: "remove", rationale: "  " })).status).toBe(400);
115:     const res = await api<{ frameworks: { id: string; total: number }[] }>("POST", `/api/workspaces/${wsId}/rmf/tailor`, { nodeId: "nist-sp-800-53-r5:PE-3", action: "remove", rationale: "Inherited from the cloud provider's physical controls" });
116:     expect(res.json.frameworks.find((f) => f.id === "nist-sp-800-53-r5")!.total).toBe(369);
117:     const activity = await api<{ summary: string; entityId: string }[]>("GET", `/api/workspaces/${wsId}/activity?limit=3`);
118:     expect(activity.json.find((a) => a.entityId === "nist-sp-800-53-r5:PE-3")?.summary).toBe("PE-3 tailored out of scope: Inherited from the cloud provider's physical controls");
119:   });
120:
121:   it("exports an OSCAL SSP and POA&M", async () => {
122:     const ssp = await api<{ "system-security-plan": { "control-implementation": { "implemented-requirements": unknown[] }; "system-characteristics": { "security-sensitivity-level": string } } }>("GET", `/api/workspaces/${wsId}/exports/oscal-ssp.json`);
123:     expect(ssp.json["system-security-plan"]["system-characteristics"]["security-sensitivity-level"]).toBe("fips-199-high");
124:     expect(ssp.json["system-security-plan"]["control-implementation"]["implemented-requirements"]).toHaveLength(369);
125:     const poam = await api<{ "plan-of-action-and-milestones": { "poam-items": unknown[] } }>("GET", `/api/workspaces/${wsId}/exports/oscal-poam.json`);
126:     expect(poam.json["plan-of-action-and-milestones"]["poam-items"].length).toBeGreaterThan(100);
127:   });
128: });
129:
130: describe("SOC 2 and the crosswalk", () => {
131:   it("scopes SOC 2 by trust services category", async () => {
132:     const res = await api<{ frameworks: { id: string; total: number }[] }>("PUT", `/api/workspaces/${wsId}/frameworks/aicpa-tsc-2017`, {
133:       enabled: true,
134:       soc2: { categories: ["security", "availability"], reportType: "type2" },
135:     });
136:     expect(res.status).toBe(200);
137:     // 33 Common Criteria + 3 Availability criteria.
138:     expect(res.json.frameworks.find((f) => f.id === "aicpa-tsc-2017")?.total).toBe(36);
139:   });
140:
141:   it("drafts DC 200 system description facts, never the description itself", async () => {
142:     await api("PATCH", `/api/workspaces/${wsId}/requirements/aicpa-tsc-2017:CC6.4`, { applicable: false, applicabilityRationale: "No physical facilities: all infrastructure is hosted by the cloud provider (carved out)." });
143:     const res = await api<{ items: { id: string; derived: { status: string; facts: string[] } }[] }>("GET", `/api/workspaces/${wsId}/soc2/description`);
144:     expect(res.json.items.map((i) => i.id)).toEqual(["DC1", "DC2", "DC3", "DC4", "DC5", "DC6", "DC7", "DC8", "DC9"]);
145:     const dc8 = res.json.items.find((i) => i.id === "DC8")!;
146:     expect(dc8.derived.facts.some((f) => f.startsWith("CC6.4 not relevant"))).toBe(true);
147:     expect(res.json.items.find((i) => i.id === "DC6")!.derived.status).toBe("needs-input");
148:   });
149:
150:   it("aggregates authoritative mappings into Nexus bundles and rows with live levels", async () => {
151:     const overview = await api<{ frameworks: { id: string; groups: { id: string }[] }[]; sets: { id: string; authority: string }[]; bundles: { a: string; b: string; count: number }[] }>("GET", `/api/workspaces/${wsId}/crosswalk`);
152:     expect(overview.json.frameworks.find((f) => f.id === "nist-csf-2.0")!.groups).toHaveLength(22);
153:     expect(overview.json.sets.find((s) => s.id === "sp-800-53-r5--csf-2.0")!.authority).toBe("NIST OLIR");
154:     const bundle = overview.json.bundles.find((b) => b.a === "nist-sp-800-53-r5:AC" && b.b === "nist-csf-2.0:PR.AA");
155:     expect(bundle?.count).toBeGreaterThan(5);
156:     const rows = await api<{ source: { code: string }; target: { code: string; current: number } }[]>("GET", `/api/workspaces/${wsId}/crosswalk/rows?node=${encodeURIComponent("nist-csf-2.0:PR.AA-01")}`);
157:     expect(rows.json.length).toBeGreaterThan(0);
158:     expect(rows.json.every((r) => r.target.code === "PR.AA-01" || r.source.code === "PR.AA-01")).toBe(true);
159:     expect(rows.json.find((r) => r.target.code === "PR.AA-01")?.target.current).toBe(3);
160:   });
161: });
162:
163: // Runs whenever the AI RMF corpus has been ingested (packages/frameworks/data/nist-ai-rmf.json).
164: describe.skipIf(!registry.framework("nist-ai-rmf"))("AI governance (NIST AI RMF)", () => {
165:   let systemId = "";
166:   it("enables the AI RMF with its four functions and 72 outcomes", async () => {
167:     const res = await api<{ frameworks: { id: string; total: number }[] }>("PUT", `/api/workspaces/${wsId}/frameworks/nist-ai-rmf`, { enabled: true });
168:     expect(res.status).toBe(200);
169:     expect(res.json.frameworks.find((f) => f.id === "nist-ai-rmf")?.total).toBe(72);
170:     const overview = await api<{ functions: { code: string; total: number }[]; genAi: { active: boolean } | null }>("GET", `/api/workspaces/${wsId}/ai`);
171:     expect(overview.json.functions.map((f) => [f.code, f.total])).toEqual([
172:       ["GOVERN", 19],
173:       ["MAP", 18],
174:       ["MEASURE", 22],
175:       ["MANAGE", 13],
176:     ]);
177:     expect(overview.json.genAi?.active).toBe(false);
178:   });
179:
180:   it("keeps an AI system inventory, validated and recorded in the audit trail", async () => {
181:     const missingPurpose = await api("POST", `/api/workspaces/${wsId}/ai/systems`, { name: "Underwriting model" });
182:     expect(missingPurpose.status).toBe(400);
183:     const created = await api<{ id: string; generative: boolean }>("POST", `/api/workspaces/${wsId}/ai/systems`, {
184:       name: "Support copilot",
185:       purpose: "Answers customer billing questions and hands off to staff",
186:       generative: true,
187:       riskTier: "moderate",
188:       dataTypes: ["pii"],
189:     });
190:     expect(created.status).toBe(201);
191:     systemId = created.json.id;
192:     const overview = await api<{ systems: { name: string }[]; genAi: { active: boolean; risks: { id: string; actions: number; outcomes: string[] }[] } }>("GET", `/api/workspaces/${wsId}/ai`);
193:     expect(overview.json.systems.map((s) => s.name)).toContain("Support copilot");
194:     // A generative system brings the NIST AI 600-1 Generative AI Profile into scope: 12 GAI risks, each addressed by actions.
195:     expect(overview.json.genAi.active).toBe(true);
196:     expect(overview.json.genAi.risks).toHaveLength(12);
197:     expect(overview.json.genAi.risks.every((r) => r.actions > 0 && r.outcomes.length > 0)).toBe(true);
198:     const updated = await api<{ riskTier: string; name: string }>("PATCH", `/api/workspaces/${wsId}/ai/systems/${systemId}`, { riskTier: "high" });
199:     expect(updated.json).toMatchObject({ riskTier: "high", name: "Support copilot" });
200:     const activity = await api<{ summary: string }[]>("GET", `/api/workspaces/${wsId}/activity?limit=20`);
201:     expect(activity.json.some((a) => a.summary.includes("AI system added to the inventory: Support copilot"))).toBe(true);
202:   });
203:
204:   it("plans AI RMF work from the Playbook and exports the AI RMF profile", async () => {
205:     const run = await api<{ status: string; proposals: { type: string; payload: { requirementIds: string[] } }[] }>("POST", `/api/workspaces/${wsId}/runs?wait=1`, { agent: "planner", goal: "Plan AI RMF work", input: { framework: "nist-ai-rmf", maxTasks: 3 } });
206:     // Agents propose, people approve: the run waits for a human decision on its task proposals.
207:     expect(run.json.status).toBe("awaiting-approval");
208:     const tasks = run.json.proposals.filter((p) => p.type === "create-task");
209:     expect(tasks.length).toBeGreaterThan(0);
210:     expect(tasks.every((t) => t.payload.requirementIds.every((id) => id.startsWith("nist-ai-rmf:")))).toBe(true);
211:     const csv = await api("GET", `/api/workspaces/${wsId}/exports/ai-rmf-profile.csv`);
212:     expect(csv.status).toBe(200);
213:     expect(csv.text.split("\n")[0]).toContain("Playbook suggested actions");
214:     expect(csv.text).toContain("GOVERN 1.1");
215:   });
216:
217:   it("removes a system from the inventory", async () => {
218:     const del = await api("DELETE", `/api/workspaces/${wsId}/ai/systems/${systemId}`);
219:     expect(del.status).toBe(204);
220:     const overview = await api<{ systems: unknown[] }>("GET", `/api/workspaces/${wsId}/ai`);
221:     expect(overview.json.systems).toHaveLength(0);
222:   });
223: });
224:
225: // Runs when the AI overlays are ingested (packages/frameworks/data/overlays/).
226: describe.skipIf(!registry.overlay("nist-ir-8596-iprd"))("AI security overlays: Cyber AI Profile and COSAiS (drafts)", () => {
227:   type LensSummary = { id: string; selected: boolean; byPriority: { level: number; count: number }[] };
228:   it("adopts the Cyber AI Profile for chosen focus areas and raises CSF priorities to its High priorities", async () => {
229:     const adopted = await api<{ adoption: { lenses: string[] }; lenses: LensSummary[]; high: { count: number }; raisable: number }>("PUT", `/api/workspaces/${wsId}/overlays/nist-ir-8596-iprd`, { lenses: ["secure"] });
230:     expect(adopted.status).toBe(200);
231:     expect(adopted.json.adoption.lenses).toEqual(["secure"]);
232:     expect(adopted.json.lenses.find((l) => l.id === "secure")?.byPriority.map((p) => p.count)).toEqual([23, 33, 50]);
233:     expect(adopted.json.high.count).toBe(23);
234:     const applied = await api<{ raised: number }>("POST", `/api/workspaces/${wsId}/overlays/nist-ir-8596-iprd/apply-priorities`);
235:     expect(applied.json.raised).toBeGreaterThan(0);
236:     expect(applied.json.raised).toBe(adopted.json.raisable);
237:     // The Observatory's overlay lens and the inspector read the same entries.
238:     const state = await api<{ overlay: { adopted: boolean; lenses: string[] }; units: Record<string, { overlay?: number; priority: string }> }>("GET", `/api/workspaces/${wsId}/frameworks/nist-csf-2.0/state`);
239:     expect(state.json.overlay).toMatchObject({ adopted: true, lenses: ["Secure"] });
240:     const high = Object.values(state.json.units).filter((u) => u.overlay === 1);
241:     expect(high).toHaveLength(23);
242:     expect(high.every((u) => u.priority === "high" || u.priority === "critical")).toBe(true);
243:     const detail = await api<{ overlays: { id: string; status: string; entry: { lenses: Record<string, { priority: number }> } }[] }>("GET", `/api/workspaces/${wsId}/requirements/nist-csf-2.0:GV.OC-01`);
244:     expect(detail.json.overlays[0]).toMatchObject({ id: "nist-ir-8596-iprd", status: "initial preliminary draft" });
245:     expect(detail.json.overlays[0]!.entry.lenses["secure"]!.priority).toBe(3);
246:     const activity = await api<{ summary: string }[]>("GET", `/api/workspaces/${wsId}/activity?limit=5`);
247:     expect(activity.json.some((a) => a.summary.startsWith("Cyber AI Profile: raised the priority"))).toBe(true);
248:   });
249:
250:   it("brings COSAiS controls into SP 800-53 scope on adoption, and out again when dropped", async () => {
251:     const before = (await api<{ frameworks: { id: string; total: number }[] }>("GET", `/api/workspaces/${wsId}`)).json.frameworks.find((f) => f.id === "nist-sp-800-53-r5")!.total;
252:     const adopted = await api<{ controls: { nodeId: string; applicable: boolean; addedByOverlay: boolean }[] }>("PUT", `/api/workspaces/${wsId}/overlays/nist-cosais-predictive-ai`, {});
253:     expect(adopted.status).toBe(200);
254:     const added = adopted.json.controls.filter((c) => c.addedByOverlay);
255:     expect(added.length).toBeGreaterThan(0);
256:     expect(adopted.json.controls.every((c) => c.applicable || c.nodeId === "nist-sp-800-53-r5:PE-3")).toBe(true);
257:     const during = (await api<{ frameworks: { id: string; total: number }[] }>("GET", `/api/workspaces/${wsId}`)).json.frameworks.find((f) => f.id === "nist-sp-800-53-r5")!.total;
258:     expect(during).toBe(before + added.length);
259:     const dropped = await api("DELETE", `/api/workspaces/${wsId}/overlays/nist-cosais-predictive-ai`);
260:     expect(dropped.status).toBe(200);
261:     const after = (await api<{ frameworks: { id: string; total: number }[] }>("GET", `/api/workspaces/${wsId}`)).json.frameworks.find((f) => f.id === "nist-sp-800-53-r5")!.total;
262:     expect(after).toBe(before);
263:   });
264: });
265:
266: // Runs when the U.S. state AI laws corpus is ingested (packages/frameworks/data/us-state-ai-laws.json).
267: describe.skipIf(!registry.framework("us-state-ai-laws"))("U.S. state AI laws: applicability decides scope", () => {
268:   const laws = registry.framework("us-state-ai-laws");
269:   // A law whose obligations fall on at least two different roles, so one role can scope some but not all of them.
270:   const law = laws?.graph.nodes.find((n) => {
271:     if (n.kind !== "law") return false;
272:     const roles = new Set(laws.childrenOf(n.id).flatMap((o) => (o.attributes?.["roles"] as string[]) ?? []));
273:     return roles.size >= 2;
274:   });
275:   const lawId = String(law?.attributes?.["lawId"] ?? "");
276:   type Overview = { enabled: boolean; jurisdictions: { laws: { lawId: string; obligations: number; inScope: number; applicability: { roles: string[] } | null; roles: { role: string; obligations: number }[] }[] }[] };
277:   const find = (o: Overview) => o.jurisdictions.flatMap((j) => j.laws).find((l) => l.lawId === lawId)!;
278:
279:   it("tracks laws without scoping any obligation until the organization records its role", async () => {
280:     const enabled = await api("PUT", `/api/workspaces/${wsId}/frameworks/us-state-ai-laws`, { enabled: true });
281:     expect(enabled.status).toBe(200);
282:     const res = await api<Overview>("GET", `/api/workspaces/${wsId}/laws`);
283:     expect(res.json.enabled).toBe(true);
284:     expect(res.json.jurisdictions.flatMap((j) => j.laws).every((l) => l.inScope === 0 && l.applicability === null)).toBe(true);
285:   });
286:
287:   it("scopes exactly the obligations of the roles held, and records the decision in the audit trail", async () => {
288:     const before = find((await api<Overview>("GET", `/api/workspaces/${wsId}/laws`)).json);
289:     const role = before.roles.find((r) => r.obligations > 0 && r.obligations < before.obligations)!;
290:     const res = await api<Overview>("PUT", `/api/workspaces/${wsId}/laws/${lawId}/applicability`, { roles: [role.role], note: "We deploy this kind of system in the state." });
291:     expect(res.status).toBe(200);
292:     const after = find(res.json);
293:     expect(after.applicability?.roles).toEqual([role.role]);
294:     // Obligations that name several roles count toward each, so scope is at least the role's own count and less than the whole law.
295:     expect(after.inScope).toBeGreaterThanOrEqual(role.obligations);
296:     expect(after.inScope).toBeLessThanOrEqual(before.obligations);
297:     const activity = await api<{ summary: string }[]>("GET", `/api/workspaces/${wsId}/activity?limit=5`);
298:     expect(activity.json.some((a) => a.summary.includes(`applies to us as ${role.role}`))).toBe(true);
299:     expect((await api("PUT", `/api/workspaces/${wsId}/laws/${lawId}/applicability`, { roles: ["astronaut"] })).status).toBe(400);
300:   });
301:
302:   it("takes obligations out of scope again when the law no longer applies", async () => {
303:     const res = await api<Overview>("PUT", `/api/workspaces/${wsId}/laws/${lawId}/applicability`, { roles: [] });
304:     expect(res.status).toBe(200);
305:     expect(find(res.json)).toMatchObject({ inScope: 0, applicability: null });
306:   });
307: });
308:
309: // Runs when the AI threat catalogs are ingested (packages/frameworks/data/mitre-atlas.json and friends).
310: describe.skipIf(!registry.framework("mitre-atlas"))("threat views: MITRE ATLAS, OWASP Top 10s, NIST AI 100-2", () => {
311:   type Coverage = { state: string; level: number | null; linked: number; inScope: number; met: number; progress: number; best: string | null };
312:   type Overview = { catalogs: { id: string; units: number; byState: Record<string, number> }[]; sources: { status: string; links: number }[] };
313:
314:   it("summarizes coverage per catalog from the linked requirements, labeled by link status", async () => {
315:     const res = await api<Overview>("GET", `/api/workspaces/${wsId}/threats`);
316:     expect(res.status).toBe(200);
317:     expect(res.json.catalogs.map((c) => [c.id, c.units])).toEqual([
318:       ["mitre-atlas", 208],
319:       ["owasp-llm-top10", 10],
320:       ["owasp-agentic-top10", 10],
321:       ["nist-ai-100-2", 25],
322:     ]);
323:     for (const c of res.json.catalogs) expect(Object.values(c.byState).reduce((a, b) => a + b, 0)).toBe(c.units);
324:     expect(new Set(res.json.sources.map((s) => s.status))).toEqual(new Set(["final", "draft", "unreviewed", "superseded"]));
325:     // Only final links: ATLAS reaches requirements through NIST's draft Cyber AI Profile, the Agentic Top 10 only through the unreviewed crosswalk.
326:     const final = await api<Overview>("GET", `/api/workspaces/${wsId}/threats?min=final`);
327:     const byId = new Map(final.json.catalogs.map((c) => [c.id, c.byState]));
328:     expect(byId.get("mitre-atlas")!["unmapped"]).toBe(208);
329:     expect(byId.get("owasp-agentic-top10")!["unmapped"]).toBe(10);
330:     expect(byId.get("owasp-llm-top10")!["unmapped"]).toBeLessThan(10);
331:     expect((await api("GET", `/api/workspaces/${wsId}/threats?min=anything`)).status).toBe(400);
332:   });
333:
334:   it("derives a threat's coverage from requirement progress and never assesses the threat itself", async () => {
335:     const before = await api<{ coverage: Record<string, Coverage> }>("GET", `/api/workspaces/${wsId}/threats/owasp-llm-top10?min=final`);
336:     expect(before.json.coverage["owasp-llm-top10:LLM01"]!.state).not.toBe("covered");
337:     const detail = await api<{ status: unknown; state: unknown; threat: { coverage: Coverage; requirements: { id: string; framework: string; best: string; target: number; applicable: boolean; paths: { kind: string }[] }[] } }>(
338:       "GET",
339:       `/api/workspaces/${wsId}/requirements/${encodeURIComponent("owasp-llm-top10:LLM01")}?min=final`,
340:     );
341:     expect(detail.json.status).toBeNull();
342:     expect(detail.json.state).toBeUndefined();
343:     const reqs = detail.json.threat.requirements;
344:     expect(reqs.length).toBe(before.json.coverage["owasp-llm-top10:LLM01"]!.linked);
345:     expect(reqs.every((r) => r.framework === "nist-ai-rmf" && r.best === "final" && r.paths.every((p) => p.kind === "direct"))).toBe(true);
346:     for (const r of reqs.filter((x) => x.applicable)) expect((await api("PATCH", `/api/workspaces/${wsId}/requirements/${encodeURIComponent(r.id)}`, { current: r.target })).status).toBe(200);
347:     const after = await api<{ coverage: Record<string, Coverage> }>("GET", `/api/workspaces/${wsId}/threats/owasp-llm-top10?min=final`);
348:     expect(after.json.coverage["owasp-llm-top10:LLM01"]).toMatchObject({ state: "covered", level: 4, progress: 1 });
349:     // Enabling a threat catalog as if it were a framework is refused.
350:     expect((await api("PUT", `/api/workspaces/${wsId}/frameworks/mitre-atlas`, { enabled: true })).status).toBe(400);
351:   });
352:
353:   it("reaches ATLAS techniques through their mitigations, and shows requirements the threats they address", async () => {
354:     const detail = await api<{ threat: { coverage: Coverage; requirements: { framework: string; paths: { kind: string; via?: { code: string } }[] }[]; related: { code: string; label: string; status: string }[] } }>(
355:       "GET",
356:       `/api/workspaces/${wsId}/requirements/${encodeURIComponent("mitre-atlas:AML.T0051")}`,
357:     );
358:     expect(detail.json.threat.coverage.best).toBe("draft");
359:     expect(detail.json.threat.requirements.some((r) => r.framework === "nist-csf-2.0" && r.paths.some((p) => p.kind === "mitigation" && p.via?.code.startsWith("AML.M")))).toBe(true);
360:     expect(detail.json.threat.related.some((r) => r.label === "mitigates" && r.status === "final")).toBe(true);
361:     const gvoc = await api<{ threats: { code: string; best: string; paths: { kind: string }[] }[] }>("GET", `/api/workspaces/${wsId}/requirements/${encodeURIComponent("nist-csf-2.0:GV.OC-01")}`);
362:     expect(gvoc.json.threats.some((t) => t.code === "AML.M0020" && t.best === "draft")).toBe(true);
363:     expect(gvoc.json.threats.some((t) => t.code === "AML.T0051" && t.paths.some((p) => p.kind === "mitigation"))).toBe(true);
364:   });
365:
366:   it("weighs each publication once, and each mitigation, edition or category once within it", async () => {
367:     type View = { publication: string; status: string; routes: number; linked: number; progress: number | null };
368:     type Req = { id: string; paths: { kind: string; group?: string; via?: { code: string }; links: { authority: string; status: string; citation: { page?: number } }[] }[] };
369:     const detail = await api<{ threat: { coverage: Coverage & { views: View[] }; requirements: Req[] } }>("GET", `/api/workspaces/${wsId}/requirements/${encodeURIComponent("owasp-llm-top10:LLM04")}`);
370:     const { coverage, requirements } = detail.json.threat;
371:     const views = new Map(coverage.views.map((v) => [v.publication, v]));
372:     // OWASP 2026 links LLM04 to five AI RMF categories: five routes, however many outcomes they hold.
373:     const owasp = views.get("OWASP LLM Top 10 2026, Appendix A")!;
374:     expect(owasp).toMatchObject({ status: "final", routes: 5 });
375:     expect(owasp.linked).toBeGreaterThan(5);
376:     // NIST's draft profile cites the 2025 edition's Supply Chain entry on 67 CSF outcomes: one route, through the other edition.
377:     const nist = views.get("NIST IR 8596 (Cyber AI Profile, draft)")!;
378:     expect(nist).toMatchObject({ status: "draft", routes: 1, linked: 67 });
379:     const edition = requirements.flatMap((r) => r.paths).find((p) => p.kind === "edition")!;
380:     expect(edition.via?.code).toBe("LLM03-2025");
381:     // The edition link is OWASP's own rank migration chart, labeled with its source.
382:     expect(edition.links[0]).toMatchObject({ authority: "OWASP LLM Top 10 2026, Figure 1", status: "final", citation: { page: 6 } });
383:     // Each publication counts once: coverage is the mean of the views that reach requirements in scope.
384:     const counted = coverage.views.filter((v) => v.progress !== null).map((v) => v.progress!);
385:     expect(coverage.progress).toBeCloseTo(counted.reduce((a, b) => a + b, 0) / counted.length, 2);
386:     expect(coverage.linked).toBe(requirements.length);
387:     // An entry of the superseded edition is no group: it shows the links published for it.
388:     const previous = await api<{ threat: { coverage: Coverage; requirements: Req[] } }>("GET", `/api/workspaces/${wsId}/requirements/${encodeURIComponent("owasp-llm-top10:LLM03-2025")}`);
389:     expect(previous.json.threat.coverage.state).not.toBe("unmapped");
390:     expect(previous.json.threat.requirements.some((r) => r.paths.some((p) => p.kind === "direct" && p.links[0]!.authority === "NIST IR 8596 (Cyber AI Profile, draft)"))).toBe(true);
391:   });
392:
393:   it("bundles threat links onto requirement groups for the Nexus threat ring", async () => {
394:     const ring = await api<{ catalogs: { id: string; groups: { id: string; units: number }[] }[]; bundles: { a: string; b: string; count: number; best: string }[] }>("GET", `/api/workspaces/${wsId}/crosswalk/threats`);
395:     expect(ring.status).toBe(200);
396:     const atlas = ring.json.catalogs.find((c) => c.id === "mitre-atlas")!;
397:     expect(atlas.groups).toHaveLength(16);
398:     expect(ring.json.bundles.some((b) => b.a.startsWith("mitre-atlas:AML.TA") && b.b.startsWith("nist-csf-2.0:") && b.best === "draft")).toBe(true);
399:     expect(ring.json.bundles.some((b) => b.a.startsWith("owasp-llm-top10:") && b.b.startsWith("nist-ai-rmf:") && b.best === "final")).toBe(true);
400:   });
401: });
402:
403: describe("assessment guardrails: threat catalogs, enabled frameworks and scope", () => {
404:   let gw = "";
405:   const threat = "mitre-atlas:AML.T0051";
406:   beforeAll(async () => {
407:     const created = await api<{ workspace: { id: string } }>("POST", "/api/workspaces", {
408:       name: "Guardrails Co",
409:       profile: { industry: "saas", size: "11-50", dataTypes: [], drivers: ["ai-systems"], environments: ["cloud"], maturityTier: 2, guidance: "guided", securityTeamSize: 2 },
410:       frameworks: ["nist-csf-2.0", "us-state-ai-laws"],
411:     });
412:     gw = created.json.workspace.id;
413:   });
414:   const patch = (nodeId: string, body: Record<string, unknown>) => api<{ error?: string; current?: number; owner?: string }>("PATCH", `/api/workspaces/${gw}/requirements/${encodeURIComponent(nodeId)}`, body);
415:
416:   it.skipIf(!registry.framework("mitre-atlas"))("never assesses a threat catalog node, through the API or an agent proposal", async () => {
417:     const res = await patch(threat, { current: 3 });
418:     expect(res.status).toBe(400);
419:     expect(res.json.error).toMatch(/threat catalog/);
420:     expect(await svc.store.states.list(gw, "mitre-atlas")).toHaveLength(0);
421:     // Agent proposals meet the same rule before they reach the approvals inbox.
422:     for (const [type, payload] of [
423:       ["set-level", { nodeId: threat, current: 3 }],
424:       ["set-target", { nodeId: threat, target: 4 }],
425:       ["set-applicability", { nodeId: threat, applicable: false, rationale: "Not relevant to our systems at all" }],
426:       ["create-task", { title: "Mitigate prompt injection", requirementIds: [threat] }],
427:     ] as const) {
428:       await expect(svc.createProposal(gw, "run_test", { type, title: type, rationale: "test", payload, citations: [], confidence: "low", nodeIds: [threat] })).rejects.toThrow(/threat/);
429:     }
430:     expect(await svc.store.proposals.list(gw)).toHaveLength(0);
431:     // A proposal already waiting (stored before this rule existed) fails on approval and changes nothing.
432:     await svc.store.proposals.put({ id: "prop_legacy", runId: "run_test", workspaceId: gw, type: "set-level", title: "legacy", rationale: "legacy", payload: { nodeId: threat, current: 3 }, citations: [], confidence: "low", status: "pending", nodeIds: [threat], createdAt: new Date().toISOString() });
433:     const decided = await api<{ status: string }>("POST", `/api/workspaces/${gw}/proposals/prop_legacy/decision`, { decision: "approved" });
434:     expect(decided.json.status).toBe("failed");
435:     expect(await svc.store.states.list(gw, "mitre-atlas")).toHaveLength(0);
436:     // Tasks and evidence link requirements, never threats; threat catalogs are not planned.
437:     expect((await api("POST", `/api/workspaces/${gw}/tasks`, { title: "Threat task", requirementIds: [threat] })).status).toBe(400);
438:     expect((await api("POST", `/api/workspaces/${gw}/evidence`, { title: "Threat evidence", requirementIds: [threat], content: "x" })).status).toBe(400);
439:     expect((await api("POST", `/api/workspaces/${gw}/plan`, { framework: "mitre-atlas" })).status).toBe(400);
440:   });
441:
442:   it.skipIf(!registry.framework("mitre-atlas"))("keeps offline agents off threat nodes", async () => {
443:     const run = async (agent: string, input: Record<string, unknown>) =>
444:       (await api<{ status: string; summary: string; proposals: unknown[] }>("POST", `/api/workspaces/${gw}/runs?wait=1`, { agent, goal: `Run ${agent}`, input })).json;
445:     const assessed = await run("assessor", { nodeIds: [threat, "mitre-atlas:AML.TA0005"] });
446:     expect(assessed.status).toBe("completed");
447:     expect(assessed.proposals).toHaveLength(0);
448:     const planned = await run("planner", { framework: "mitre-atlas" });
449:     expect(planned.status).toBe("completed");
450:     expect(planned.summary).toMatch(/threat catalog/);
451:     expect(planned.proposals).toHaveLength(0);
452:   });
453:
454:   it("refuses assessments in frameworks the workspace has not enabled", async () => {
455:     const res = await patch("nist-sp-800-53-r5:AC-2", { current: 2 });
456:     expect(res.status).toBe(400);
457:     expect(res.json.error).toMatch(/not enabled/);
458:     expect(await svc.store.states.list(gw, "nist-sp-800-53-r5")).toHaveLength(0);
459:     await expect(svc.createProposal(gw, "run_test", { type: "set-level", title: "x", rationale: "x", payload: { nodeId: "nist-sp-800-53-r5:AC-2", current: 2 }, citations: [], confidence: "low", nodeIds: [] })).rejects.toThrow(/not enabled/);
460:     expect((await api("POST", `/api/workspaces/${gw}/plan`, { framework: "nist-sp-800-53-r5" })).status).toBe(400);
461:   });
462:
463:   it.skipIf(!registry.framework("us-state-ai-laws"))("sets no levels on requirements out of scope, whoever asks", async () => {
464:     // No law applicability recorded: every obligation is out of scope by configuration.
465:     const obligation = registry.framework("us-state-ai-laws")!.assessable[0]!.id;
466:     for (const body of [{ current: 2 }, { target: 3 }, { verifiedAt: new Date().toISOString() }, { statusOverride: "implemented" }]) {
467:       const res = await patch(obligation, body);
468:       expect(res.status, JSON.stringify(body)).toBe(400);
469:       expect(res.json.error).toMatch(/out of scope/);
470:     }
471:     // Documentation stays editable.
472:     expect((await patch(obligation, { owner: "Legal" })).json.owner).toBe("Legal");
473:     await expect(svc.createProposal(gw, "run_test", { type: "set-level", title: "x", rationale: "x", payload: { nodeId: obligation, current: 2 }, citations: [], confidence: "low", nodeIds: [obligation] })).rejects.toThrow(/out of scope/);
474:     // A documented exclusion blocks levels too, until the requirement is brought back into scope.
475:     const outcome = "nist-csf-2.0:PR.IR-02";
476:     expect((await patch(outcome, { applicable: false, applicabilityRationale: "No on-premises facilities; inherited from the cloud provider." })).status).toBe(200);
477:     expect((await patch(outcome, { current: 2 })).status).toBe(400);
478:     expect((await patch(outcome, { applicable: false, applicabilityRationale: "Still excluded for audit purposes here", current: 1 })).status).toBe(400);
479:     expect((await patch(outcome, { applicable: true, current: 2 })).json.current).toBe(2);
480:   });
481: });
482:
483: describe.skipIf(!registry.framework("us-state-ai-laws") || !registry.framework("mitre-atlas"))("Copilot on threats and state AI laws (offline)", () => {
484:   let cw = "";
485:   type Run = { status: string; summary: string; proposals: unknown[]; steps: { type: string; citations?: { documentId: string; page?: number }[] }[] };
486:   const ask = async (goal: string) => (await api<Run>("POST", `/api/workspaces/${cw}/runs?wait=1`, { agent: "copilot", goal, input: {} })).json;
487:   const cited = (r: Run) => r.steps.flatMap((s) => s.citations ?? []);
488:   beforeAll(async () => {
489:     const created = await api<{ workspace: { id: string } }>("POST", "/api/workspaces", {
490:       name: "Copilot Co",
491:       profile: { industry: "saas", size: "11-50", dataTypes: [], drivers: ["ai-systems"], environments: ["cloud"], maturityTier: 2, guidance: "guided", securityTeamSize: 2 },
492:       frameworks: ["nist-csf-2.0", "nist-ai-rmf", "us-state-ai-laws"],
493:     });
494:     cw = created.json.workspace.id;
495:   });
496:
497:   it("explains an ATLAS technique through the requirements publishers link to it, and proposes nothing", async () => {
498:     const r = await ask("What is AML.T0051 and how are we covered?");
499:     expect(r.status).toBe("completed");
500:     expect(r.summary).toContain("AML.T0051");
501:     expect(r.summary).toMatch(/Cyber AI Profile, draft/);
502:     expect(r.summary).toMatch(/never assessed/);
503:     expect(cited(r).some((c) => c.documentId.startsWith("mitre-atlas"))).toBe(true);
504:     expect(r.proposals).toHaveLength(0);
505:   });
506:
507:   it("answers a state-law obligation from the statute, with its section, page, dates and roles", async () => {
508:     const r = await ask("What does CA-SB243-02 require?");
509:     expect(r.summary).toContain("CA-SB243-02");
510:     expect(r.summary).toContain("§ 22602(b)");
511:     expect(r.summary).toMatch(/Applies to: operator/);
512:     expect(r.summary).not.toContain("Related requirements");
513:     expect(cited(r)).toContainEqual(expect.objectContaining({ documentId: "ca-sb243-ch677-2025", page: 3 }));
514:   });
515:
516:   it("recognizes a law named in words, and a jurisdiction, but not a common word", async () => {
517:     const colorado = await ask("Does the Colorado AI Act apply to us?");
518:     expect(colorado.summary).toContain("CO-SB24-205");
519:     expect(colorado.summary).toMatch(/\*developer\*/);
520:     expect(cited(colorado).some((c) => c.documentId.startsWith("co-"))).toBe(true);
521:     const jurisdiction = await ask("Colorado AI law");
522:     for (const code of ["CO-SB24-205", "CO-SB26-189", "CO-HB26-1263"]) expect(jurisdiction.summary).toContain(code);
523:     expect((await ask("What does TRAIGA require?")).summary).toContain("TX-TRAIGA-01");
524:     expect((await ask("How do we raise our score?")).summary).not.toContain("NY-RAISE");
525:   });
526: });
527:
528: describe.skipIf(!registry.framework("us-state-ai-laws"))("state AI laws: dates decide what counts today", () => {
529:   const law = registry.framework("us-state-ai-laws")?.graph.nodes.find((n) => n.code === "CA-SB243");
530:   afterEach(() => {
531:     vi.useRealTimers();
532:   });
533:   it.skipIf(!law)("counts obligations in force, prepares upcoming ones apart, and drops ended ones when read", async () => {
534:     // Pinned to a day when CA-SB243-03 (until 2026-12-31) is still in force and CA-SB243-04
535:     // (from 2027-07-01) still ahead, so the test means the same whenever it runs.
536:     vi.useFakeTimers({ toFake: ["Date"], now: new Date("2026-10-15T12:00:00Z") });
537:     // The suite's session was opened on the real clock and may have expired on this one: sign in on it.
538:     const client = new TestClient(app);
539:     await client.devLogin("owner@acme-fintech.example", "Ada Owner");
540:     const api = <T = unknown>(method: string, path: string, body?: unknown) => client.request<T>(method, path, body ?? (method === "GET" ? undefined : {}));
541:     const created = await api<{ workspace: { id: string } }>("POST", "/api/workspaces", {
542:       name: "Chatbot Co",
543:       profile: { industry: "saas", size: "11-50", dataTypes: ["pii", "children"], drivers: ["ai-systems"], environments: ["cloud"], maturityTier: 2, guidance: "guided", securityTeamSize: 2 },
544:       frameworks: ["nist-csf-2.0", "us-state-ai-laws"],
545:     });
546:     const cw = created.json.workspace.id;
547:     await api("PUT", `/api/workspaces/${cw}/laws/ca-companion-chatbots/applicability`, { roles: ["operator"] });
548:     const obligation = (n: string) => `us-state-ai-laws:CA-SB243-0${n}`;
549:     // Everything in force today is met; the reporting duty (from 2027-07-01) is not started.
550:     for (const n of ["1", "2", "3", "5", "6"]) expect((await api("PATCH", `/api/workspaces/${cw}/requirements/${encodeURIComponent(obligation(n))}`, { current: 3, target: 3 })).status).toBe(200);
551:     type Law = { code: string; inScope: number; inForce: number; readiness: number; upcomingInScope: { total: number; readiness: number; next: string | null } };
552:     type Overview = { readiness: number; total: number; upcoming: { total: number; readiness: number }; jurisdictions: { laws: Law[] }[] };
553:     const ca = (o: Overview) => o.jurisdictions.flatMap((j) => j.laws).find((l) => l.code === "CA-SB243")!;
554:     const now = (await api<Overview>("GET", `/api/workspaces/${cw}/laws`)).json;
555:     expect(ca(now)).toMatchObject({ inScope: 6, inForce: 5, readiness: 1, upcomingInScope: { total: 1, readiness: 0, next: "2027-07-01" } });
556:     expect(now).toMatchObject({ readiness: 1, total: 5, upcoming: { total: 1, readiness: 0 } });
557:     const state = await api<{ units: Record<string, { upcoming?: string; applicable: boolean }>; upcoming: { total: number } }>("GET", `/api/workspaces/${cw}/frameworks/us-state-ai-laws/state`);
558:     expect(state.json.units[obligation("4")]).toMatchObject({ upcoming: "2027-07-01", applicable: true });
559:     expect(state.json.upcoming.total).toBe(1);
560:     // Months later, with nothing changed in the workspace: the minors duty ended on 2026-12-31, the reporting duty is in force.
561:     const ws = await svc.workspace(cw);
562:     vi.setSystemTime(new Date("2027-01-15T12:00:00Z"));
563:     const january = await lawsOverview(svc, ws);
564:     expect(ca(january as unknown as Overview)).toMatchObject({ inScope: 5, inForce: 4, readiness: 1 });
565:     const detail = await nodeDetail(svc, ws, registry.node(obligation("3"))!);
566:     expect(detail.status?.status).toBe("not-applicable");
567:     expect(detail.status?.reasons[0]).toBe("No longer in effect after 2026-12-31");
568:     expect(detail.timing).toMatchObject({ state: "ended", until: "2026-12-31" });
569:     vi.setSystemTime(new Date("2027-08-01T12:00:00Z"));
570:     const august = (await lawsOverview(svc, ws)) as unknown as Overview;
571:     expect(ca(august)).toMatchObject({ inScope: 5, inForce: 5, upcomingInScope: { total: 0 } });
572:     expect(ca(august).readiness).toBeLessThan(1);
573:   });
574: });
575:
576: describe("documented exclusions survive every scope change", () => {
577:   let xw = "";
578:   type State = { applicable: boolean; applicabilityRationale?: string; userExclusion?: { rationale: string } };
579:   const stateOf = async (nodeId: string) => (await api<{ state: State }>("GET", `/api/workspaces/${xw}/requirements/${encodeURIComponent(nodeId)}`)).json.state;
580:   const exclude = (nodeId: string, rationale: string) => api("PATCH", `/api/workspaces/${xw}/requirements/${encodeURIComponent(nodeId)}`, { applicable: false, applicabilityRationale: rationale });
581:   beforeAll(async () => {
582:     const created = await api<{ workspace: { id: string } }>("POST", "/api/workspaces", {
583:       name: "Exclusions Co",
584:       profile: { industry: "healthcare", size: "51-200", dataTypes: ["phi"], drivers: ["ai-systems"], environments: ["cloud"], maturityTier: 2, guidance: "guided", securityTeamSize: 3 },
585:       frameworks: ["nist-csf-2.0", "nist-sp-800-53-r5", "us-state-ai-laws"],
586:     });
587:     xw = created.json.workspace.id;
588:   });
589:
590:   it.skipIf(!registry.framework("us-state-ai-laws"))("keeps a not-applicable decision on an obligation when the law stops and starts applying", async () => {
591:     const laws = registry.framework("us-state-ai-laws")!;
592:     const obligation = laws.assessable.find((o) => ((o.attributes?.["roles"] as string[]) ?? []).length > 0 && !o.attributes?.["until"])!;
593:     const lawId = String(obligation.attributes?.["lawId"]);
594:     const role = (obligation.attributes?.["roles"] as string[])[0]!;
595:     await api("PUT", `/api/workspaces/${xw}/laws/${lawId}/applicability`, { roles: [role] });
596:     expect((await stateOf(obligation.id)).applicable).toBe(true);
597:     const why = "We never offer this service to consumers in the state; confirmed by counsel.";
598:     expect((await exclude(obligation.id, why)).status).toBe(200);
599:     // The law stops applying: out of scope by configuration, the person's decision kept underneath.
600:     await api("PUT", `/api/workspaces/${xw}/laws/${lawId}/applicability`, { roles: [] });
601:     const off = await stateOf(obligation.id);
602:     expect(off.applicable).toBe(false);
603:     expect(off.applicabilityRationale).toMatch(/Not in scope/);
604:     expect(off.userExclusion?.rationale).toBe(why);
605:     // It applies again: the documented exclusion stands.
606:     await api("PUT", `/api/workspaces/${xw}/laws/${lawId}/applicability`, { roles: [role] });
607:     expect(await stateOf(obligation.id)).toMatchObject({ applicable: false, applicabilityRationale: why, userExclusion: { rationale: why } });
608:   });
609:
610:   it.skipIf(!registry.overlay("nist-cosais-predictive-ai"))("keeps a not-applicable decision on a control an overlay adds, drops and adds again", async () => {
611:     const overlay = registry.overlay("nist-cosais-predictive-ai")!;
612:     const moderate = (id: string) => ((registry.node(id)?.attributes?.["baselines"] as string[]) ?? []).includes("moderate");
613:     const control = overlay.entries.map((e) => e.nodeId).find((id) => !moderate(id))!;
614:     expect((await stateOf(control)).applicable).toBe(false);
615:     await api("PUT", `/api/workspaces/${xw}/overlays/nist-cosais-predictive-ai`, {});
616:     expect((await stateOf(control)).applicable).toBe(true);
617:     const why = "The predictive model runs in a vendor-managed enclave; the vendor's SOC 2 covers this control.";
618:     expect((await exclude(control, why)).status).toBe(200);
619:     await api("DELETE", `/api/workspaces/${xw}/overlays/nist-cosais-predictive-ai`);
620:     const dropped = await stateOf(control);
621:     expect(dropped.applicable).toBe(false);
622:     expect(dropped.userExclusion?.rationale).toBe(why);
623:     await api("PUT", `/api/workspaces/${xw}/overlays/nist-cosais-predictive-ai`, {});
624:     expect(await stateOf(control)).toMatchObject({ applicable: false, applicabilityRationale: why });
625:     // Re-categorizing the system (a new baseline) does not overwrite it either.
626:     await api("POST", `/api/workspaces/${xw}/rmf/categorize`, { informationTypes: [{ id: "phi", name: "Patient records", confidentiality: "high", integrity: "high", availability: "high" }] });
627:     expect(await stateOf(control)).toMatchObject({ applicable: false, applicabilityRationale: why });
628:   });
629: });
630:
631: describe("agents (offline playbooks) with human-in-the-loop proposals", () => {
632:   const run = async (agent: string, goal: string, input: Record<string, unknown> = {}) =>
633:     (await api<{ status: string; mode: string; summary: string; steps: { type: string }[]; proposals: { id: string; type: string; status: string }[] }>("POST", `/api/workspaces/${wsId}/runs?wait=1`, { agent, goal, input })).json;
634:
635:   it("copilot answers with citations and drives the 3D focus", async () => {
636:     const r = await run("copilot", "What does PR.AA-05 require and how does it map to SP 800-53?");
637:     expect(r.mode).toBe("offline");
638:     expect(r.summary).toContain("PR.AA-05");
639:     expect(r.steps.some((s) => s.type === "citation")).toBe(true);
640:     expect(r.steps.some((s) => s.type === "ui")).toBe(true);
641:   });
642:
643:   it("planner proposes grounded tasks that apply on approval", async () => {
644:     const r = await run("planner", "Plan the next sprint", { framework: "nist-csf-2.0", maxTasks: 4 });
645:     expect(r.status).toBe("awaiting-approval");
646:     expect(r.proposals.length).toBe(4);
647:     const before = (await api<unknown[]>("GET", `/api/workspaces/${wsId}/tasks`)).json.length;
648:     const decided = await api<{ status: string }>("POST", `/api/workspaces/${wsId}/proposals/${r.proposals[0]!.id}/decision`, { decision: "approved" });
649:     expect(decided.json.status).toBe("applied");
650:     const after = (await api<unknown[]>("GET", `/api/workspaces/${wsId}/tasks`)).json.length;
651:     expect(after).toBe(before + 1);
652:     const rejected = await api<{ status: string }>("POST", `/api/workspaces/${wsId}/proposals/${r.proposals[1]!.id}/decision`, { decision: "rejected" });
653:     expect(rejected.json.status).toBe("rejected");
654:   });
655:
656:   it("assessor, policy author, evidence collector, crosswalk analyst, audit prep and task executor all complete", async () => {
657:     for (const [agent, input] of [
658:       ["assessor", { nodeIds: ["nist-csf-2.0:PR.AA"] }],
659:       ["policy-author", { nodeIds: ["nist-csf-2.0:PR.AT"] }],
660:       ["evidence-collector", {}],
661:       ["crosswalk-analyst", { framework: "nist-sp-800-53-r5" }],
662:       ["auditor-prep", { framework: "nist-csf-2.0" }],
663:     ] as const) {
664:       const r = await run(agent, `Run ${agent}`, input);
665:       expect(["completed", "awaiting-approval"], `${agent}: ${r.summary}`).toContain(r.status);
666:       expect(r.summary.length).toBeGreaterThan(20);
667:     }
668:     const tasks = (await api<{ id: string; automation?: { action: string } }[]>("GET", `/api/workspaces/${wsId}/tasks`)).json;
669:     const technical = tasks.find((t) => t.automation?.action === "implementation-guide") ?? tasks[0]!;
670:     const r = await run("task-executor", "Execute this task", { taskId: technical.id });
671:     expect(["completed", "awaiting-approval"]).toContain(r.status);
672:     expect(r.proposals.some((p) => p.type === "update-task" || p.type === "create-policy")).toBe(true);
673:   });
674:
675:   it("records a proposal in the flight recorder only once it is committed", async () => {
676:     const created = await api<{ workspace: { id: string } }>("POST", "/api/workspaces", {
677:       name: "Recorder Co",
678:       profile: { industry: "saas", size: "1-10", dataTypes: [], drivers: [], environments: ["cloud"], maturityTier: 1, guidance: "guided", securityTeamSize: 1 },
679:     });
680:     const rw = created.json.workspace.id;
681:     await api("PATCH", `/api/workspaces/${rw}`, { autonomy: { "create-task": true } });
682:     const steps: { data?: { proposalId?: string } }[] = [];
683:     const recorder = { step: (s: (typeof steps)[number]) => steps.push(s) };
684:     const input = { type: "create-task" as const, title: "Review access", rationale: "Quarterly review", payload: { title: "Review access", requirementIds: ["nist-csf-2.0:PR.AA-05"] }, citations: [], confidence: "low" as const, nodeIds: ["nist-csf-2.0:PR.AA-05"] };
685:     // Applying it under autonomy fails at the audit entry: the whole proposal rolls back, and nothing was recorded.
686:     const append = svc.store.activity.append.bind(svc.store.activity);
687:     svc.store.activity.append = async () => {
688:       throw new Error("audit trail unavailable");
689:     };
690:     try {
691:       await expect(svc.createProposal(rw, "run_rec", input, recorder as never)).rejects.toThrow(/audit trail unavailable/);
692:     } finally {
693:       svc.store.activity.append = append;
694:     }
695:     expect(steps).toHaveLength(0);
696:     expect(await svc.store.proposals.list(rw)).toHaveLength(0);
697:     const applied = await svc.createProposal(rw, "run_rec", input, recorder as never);
698:     expect(applied.status).toBe("applied");
699:     expect(steps.map((s) => s.data?.proposalId)).toEqual([applied.id]);
700:   });
701:
702:   it("autonomy lets an agent apply a proposal type without approval", async () => {
703:     await api("PATCH", `/api/workspaces/${wsId}`, { autonomy: { "create-task": true } });
704:     const r = await run("planner", "Plan more", { framework: "nist-csf-2.0", maxTasks: 1 });
705:     expect(r.proposals.every((p) => p.status === "applied")).toBe(true);
706:     expect(r.status).toBe("completed");
707:   });
708: });
709:
710: describe("transfer: compression and revalidation", () => {
711:   it("compresses API responses, revalidates framework data by ETag, and leaves sign-in responses alone", async () => {
712:     const gz = { "accept-encoding": "gzip" };
713:     const graph = await client.request("GET", "/api/frameworks/nist-csf-2.0", undefined, gz);
714:     expect(graph.status).toBe(200);
715:     expect(graph.headers.get("content-encoding")).toBe("gzip");
716:     const tag = graph.headers.get("etag");
717:     expect(tag).toMatch(/^W\//);
718:     expect((await client.request("GET", "/api/frameworks/nist-csf-2.0", undefined, { "if-none-match": tag! })).status).toBe(304);
719:     expect((await client.request("GET", `/api/workspaces/${wsId}/frameworks/nist-csf-2.0/state`, undefined, gz)).headers.get("content-encoding")).toBe("gzip");
720:     // Responses that carry the session's CSRF token are never compressed (no compression oracle on a secret).
721:     const probe = new TestClient(app);
722:     const login = await probe.request("POST", "/api/auth/dev/login", { email: "owner@acme-fintech.example" }, gz);
723:     expect(login.status).toBe(200);
724:     expect(login.headers.get("content-encoding")).toBeNull();
725:     expect((await probe.request("GET", "/api/auth/me", undefined, gz)).headers.get("content-encoding")).toBeNull();
726:   });
727: });
728:
729: describe("evidence, monitoring and exports", () => {
730:   it("runs the repository hygiene connector against this repository", async () => {
731:     const con = await api<{ id: string }>("POST", `/api/workspaces/${wsId}/connectors`, { kind: "repo-scan", config: { path: REPO_ROOT } });
732:     expect(con.status).toBe(201);
733:     const results = await api<{ checkId: string; outcome: string; requirementIds: string[] }[]>("POST", `/api/workspaces/${wsId}/connectors/${con.json.id}/run`);
734:     expect(results.json.find((r) => r.checkId === "lockfile")?.outcome).toBe("pass");
735:     expect(results.json.find((r) => r.checkId === "secrets")?.outcome).toBe("pass");
736:     expect(results.json.some((r) => r.requirementIds.length > 0)).toBe(true);
737:     // A person's run files each passing, linked check as machine-verified evidence.
738:     for (const r of results.json.filter((x) => x.outcome === "pass" && x.requirementIds.length)) expect(r).toHaveProperty("evidenceId");
739:   });
740:
741:   it("has an agent propose its passing checks as evidence, filed from the recorded check on approval", async () => {
742:     const created = await api<{ workspace: { id: string } }>("POST", "/api/workspaces", {
743:       name: "Checks Co",
744:       profile: { industry: "saas", size: "11-50", dataTypes: [], drivers: [], environments: ["cloud"], maturityTier: 2, guidance: "guided", securityTeamSize: 2 },
745:       frameworks: ["nist-csf-2.0"],
746:     });
747:     const cw = created.json.workspace.id;
748:     await api("POST", `/api/workspaces/${cw}/connectors`, { kind: "repo-scan", config: { path: REPO_ROOT } });
749:     type Evidence = { id: string; source: string; kind: string; status: string; reviewedBy?: string; sha256?: string; content?: string; requirementIds: string[] };
750:     const evidence = async () => (await api<Evidence[]>("GET", `/api/workspaces/${cw}/evidence`)).json;
751:     const before = (await evidence()).length;
752:     const run = await api<{ proposals: { id: string; type: string; title: string; status: string; payload: { checkResultId?: string } }[] }>("POST", `/api/workspaces/${cw}/runs?wait=1`, { agent: "evidence-collector", goal: "Collect evidence", input: {} });
753:     // The agent filed nothing itself: every passing check waits in the approvals inbox.
754:     expect((await evidence()).length).toBe(before);
755:     const proposed = run.json.proposals.filter((p) => p.type === "create-evidence" && p.payload.checkResultId);
756:     expect(proposed.length).toBeGreaterThan(0);
757:     expect(proposed.every((p) => p.status === "pending")).toBe(true);
758:     // Edits on approval cannot change what the check observed or what it is linked to.
759:     const decided = await api<{ status: string }>("POST", `/api/workspaces/${cw}/proposals/${proposed[0]!.id}/decision`, {
760:       decision: "approved",
761:       edits: { content: "Everything is perfect.", requirementIds: ["nist-csf-2.0:GV.OC-01"] },
762:     });
763:     expect(decided.json.status).toBe("applied");
764:     const filed = (await evidence()).filter((e) => e.source === "connector");
765:     expect(filed).toHaveLength(1);
766:     expect(filed[0]).toMatchObject({ kind: "automated-check", status: "accepted" });
767:     expect(filed[0]!.sha256).toHaveLength(64);
768:     expect(filed[0]!.content).not.toBe("Everything is perfect.");
769:     expect(filed[0]!.requirementIds).not.toContain("nist-csf-2.0:GV.OC-01");
770:     expect(filed[0]!.reviewedBy).not.toMatch(/^(agent|system)/);
771:     // A check is filed once, and a later run does not propose a check whose evidence is still current.
772:     const input = { type: "create-evidence" as const, title: "again", rationale: "again", payload: { checkResultId: proposed[0]!.payload.checkResultId }, citations: [], confidence: "high" as const, nodeIds: [] };
773:     await expect(svc.createProposal(cw, "run_again", input)).rejects.toThrow(/already filed/);
774:     const rerun = await api<{ proposals: { type: string; title: string }[] }>("POST", `/api/workspaces/${cw}/runs?wait=1`, { agent: "evidence-collector", goal: "Collect evidence", input: {} });
775:     const titles = rerun.json.proposals.filter((p) => p.type === "create-evidence").map((p) => p.title);
776:     expect(titles).not.toContain(proposed[0]!.title);
777:     expect(titles.length).toBe(proposed.length - 1);
778:   });
779:
780:   it("records a failed connector run in the audit trail", async () => {
781:     const con = await api<{ id: string }>("POST", `/api/workspaces/${wsId}/connectors`, { kind: "repo-scan", name: "Missing repository", config: { path: "/nonexistent/visua-repo" } });
782:     expect(con.status).toBe(201);
783:     const kind = CONNECTOR_KINDS.find((k) => k.kind === "repo-scan")!;
784:     const run = kind.run;
785:     kind.run = async () => {
786:       throw new Error("connection timed out");
787:     };
788:     try {
789:       expect((await api("POST", `/api/workspaces/${wsId}/connectors/${con.json.id}/run`)).status).toBe(500);
790:     } finally {
791:       kind.run = run;
792:     }
793:     const connectors = await api<{ id: string; status: string }[]>("GET", `/api/workspaces/${wsId}/connectors`);
794:     expect(connectors.json.find((c) => c.id === con.json.id)?.status).toBe("error");
795:     const activity = await api<{ summary: string }[]>("GET", `/api/workspaces/${wsId}/activity?limit=3`);
796:     expect(activity.json[0]!.summary).toMatch(/^Connector “Missing repository” failed/);
797:     expect((await api<{ valid: boolean }>("GET", `/api/workspaces/${wsId}/activity/verify`)).json.valid).toBe(true);
798:   });
799:
800:   it("accepts uploaded evidence with a content hash and review", async () => {
801:     const ev = await api<{ id: string; sha256: string; status: string }>("POST", `/api/workspaces/${wsId}/evidence`, { title: "Access review Q3", kind: "attestation", requirementIds: ["PR.AA-05"], content: "Reviewed 42 accounts; 3 removed." });
802:     expect(ev.json.sha256).toHaveLength(64);
803:     expect(ev.json.status).toBe("pending-review");
804:     const reviewed = await api<{ status: string }>("PATCH", `/api/workspaces/${wsId}/evidence/${ev.json.id}`, { decision: "accepted" });
805:     expect(reviewed.json.status).toBe("accepted");
806:     // Changing one field leaves the others as they were.
807:     const extended = await api<{ title: string; requirementIds: string[]; validUntil: string }>("PATCH", `/api/workspaces/${wsId}/evidence/${ev.json.id}`, { validUntil: "2027-12-31" });
808:     expect(extended.json).toMatchObject({ title: "Access review Q3", requirementIds: ["nist-csf-2.0:PR.AA-05"], validUntil: "2027-12-31" });
809:   });
810:
811:   it("exports the CSF Organizational Profile with the official template columns", async () => {
812:     const res = await api("GET", `/api/workspaces/${wsId}/exports/csf-profile.csv`);
813:     const header = res.text.split("\r\n")[0]!;
814:     expect(header).toContain("CSF Outcome (Function, Category, or Subcategory)");
815:     expect(header).toContain("Target CSF Tier");
816:     expect(res.text.split("\r\n").length).toBeGreaterThan(134);
817:   });
818:
819:   it("serves official corpus files but blocks traversal", async () => {
820:     const ok = await client.get("/api/corpus/file/nist-csf-2.0/core/NIST.CSWP.29.pdf");
821:     expect(ok.status).toBe(200);
822:     expect(ok.headers.get("content-type")).toBe("application/pdf");
823:     const bad = await client.get("/api/corpus/file/..%2F..%2Fpackage.json");
824:     expect(bad.status).toBe(400);
825:   });
826: });
827:
828: describe("integrity guardrails", () => {
829:   it("requires a written rationale to mark a requirement not applicable", async () => {
830:     const bad = await api("PATCH", `/api/workspaces/${wsId}/requirements/nist-csf-2.0:PR.IR-02`, { applicable: false });
831:     expect(bad.status).toBe(400);
832:     const ok = await api("PATCH", `/api/workspaces/${wsId}/requirements/nist-csf-2.0:PR.IR-02`, { applicable: false, applicabilityRationale: "No on-premises facilities; environmental threats are handled by the cloud provider (inherited)." });
833:     expect(ok.status).toBe(200);
834:   });
835:
836:   it("never lets a scope change overwrite a person's documented exclusion", async () => {
837:     const id = "nist-sp-800-53-r5:AC-8";
838:     const excluded = await api<{ applicable: boolean }>("PATCH", `/api/workspaces/${wsId}/requirements/${id}`, { applicable: false, applicabilityRationale: "System use notification is enforced by the upstream identity provider (inherited)." });
839:     expect(excluded.json.applicable).toBe(false);
840:     // Re-categorize (re-scopes every control); AC-8 stays in the baseline, so the person's decision must stand.
841:     await api("POST", `/api/workspaces/${wsId}/rmf/categorize`, {
842:       informationTypes: [{ id: "payments", name: "Payment transactions", confidentiality: "moderate", integrity: "moderate", availability: "low" }],
843:     });
844:     const after = (await api<{ state: { applicable: boolean; applicabilityRationale: string; userExclusion?: { rationale: string } } }>("GET", `/api/workspaces/${wsId}/requirements/${id}`)).json.state;
845:     expect(after.applicable).toBe(false);
846:     expect(after.userExclusion?.rationale).toMatch(/identity provider/);
847:     // Out-of-scope-by-configuration requirements cannot be forced back in without changing the scope.
848:     const outOfBaseline = await api("PATCH", `/api/workspaces/${wsId}/requirements/nist-sp-800-53-r5:AC-2(11)`, { applicable: true });
849:     expect(outOfBaseline.status).toBe(400);
850:     // Restoring applicability clears the exclusion and restores a target.
851:     const restored = await api<{ applicable: boolean; target: number; userExclusion?: unknown }>("PATCH", `/api/workspaces/${wsId}/requirements/${id}`, { applicable: true });
852:     expect(restored.json.applicable).toBe(true);
853:     expect(restored.json.userExclusion).toBeUndefined();
854:     expect(restored.json.target).toBeGreaterThan(0);
855:   });
856:
857:   it("keeps a tamper-evident, hash-chained audit trail", async () => {
858:     const verified = await api<{ valid: boolean; events: number }>("GET", `/api/workspaces/${wsId}/activity/verify`);
859:     expect(verified.json.valid).toBe(true);
860:     expect(verified.json.events).toBeGreaterThan(10);
861:     // Tamper with one historical event directly in storage: verification must fail.
862:     const events = await svc.store.activity.chain(wsId);
863:     const victim = events[3]!;
864:     await svc.store.activity.put({ ...victim, summary: `${victim.summary} (edited)` }, `${victim.at}#${String(victim.seq).padStart(9, "0")}`);
865:     const tampered = await api<{ valid: boolean; brokenAt: number }>("GET", `/api/workspaces/${wsId}/activity/verify`);
866:     expect(tampered.json.valid).toBe(false);
867:     expect(tampered.json.brokenAt).toBe(victim.seq);
868:     await svc.store.activity.put(victim, `${victim.at}#${String(victim.seq).padStart(9, "0")}`);
869:     expect((await api<{ valid: boolean }>("GET", `/api/workspaces/${wsId}/activity/verify`)).json.valid).toBe(true);
870:   });
871:
872:   it("never lets the task executor file an implementation guide as evidence", async () => {
873:     const tasks = (await api<{ id: string; automation?: { action: string } }[]>("GET", `/api/workspaces/${wsId}/tasks`)).json;
874:     const technical = tasks.find((t) => t.automation?.action === "implementation-guide");
875:     if (!technical) return;
876:     const r = (await api<{ proposals: { type: string }[] }>("POST", `/api/workspaces/${wsId}/runs?wait=1`, { agent: "task-executor", goal: "Execute", input: { taskId: technical.id } })).json;
877:     expect(r.proposals.some((p) => p.type === "create-evidence")).toBe(false);
878:     expect(r.proposals.some((p) => p.type === "update-task")).toBe(true);
879:   });
880: });
881:
882: describe("demo seed", () => {
883:   const morgan = new TestClient(app);
884:   beforeAll(async () => {
885:     await seedDemo(svc, auth);
886:     await morgan.devLogin("morgan.lee@northwind-health.example");
887:   });
888:   it("creates a realistic, deterministic demo workspace", async () => {
889:     const res = await morgan.get<{ workspace: { name: string }; frameworks: { id: string; readiness: number }[]; approvals: number; access: { role: string } }>("/api/workspaces/northwind-health");
890:     expect(res.json.access.role).toBe("owner");
891:     expect(res.json.workspace.name).toBe("Northwind Health");
892:     const csf = res.json.frameworks.find((f) => f.id === "nist-csf-2.0")!;
893:     expect(csf.readiness).toBeGreaterThan(0.3);
894:     expect(csf.readiness).toBeLessThan(0.9);
895:     expect(res.json.approvals).toBeGreaterThan(0);
896:     const trust = await new TestClient(app).get<{ name: string; frameworks: unknown[] }>("/api/trust/northwind-health");
897:     expect(trust.json.frameworks.length).toBeGreaterThan(0);
898:   });
899:
900:   it("re-creates the demo from the command line inside its organization", () => {
901:     // The seed CLI once created the workspace without an organization, so nobody could open it.
902:     const dir = mkdtempSync(join(tmpdir(), "visua-seed-"));
903:     try {
904:       const file = join(dir, "seed.db");
905:       const cli = resolve(REPO_ROOT, "apps/server/src/seed/cli.ts");
906:       const env = { ...process.env, VISUA_DATABASE_URL: file, VISUA_DB: "" };
907:       execFileSync(process.execPath, ["--disable-warning=ExperimentalWarning", cli], { env, stdio: "pipe" });
908:       execFileSync(process.execPath, ["--disable-warning=ExperimentalWarning", cli, "--reset"], { env, stdio: "pipe" });
909:       const check = new DatabaseSync(file);
910:       const ws = check.prepare(`SELECT tenant_id FROM workspaces WHERE slug = 'northwind-health'`).get() as { tenant_id: string | null };
911:       const org = check.prepare(`SELECT id FROM tenants WHERE slug = 'northwind-health'`).get() as { id: string };
912:       const trail = check.prepare(`SELECT data FROM activity WHERE workspace_id = ?`).all(org.id).map((r) => JSON.parse(String((r as { data: string }).data)) as { summary: string });
913:       check.close();
914:       expect(ws.tenant_id).toBe(org.id);
915:       // The reset's deletion is on the organization's own audit trail.
916:       expect(trail.some((e) => e.summary === "Workspace “Northwind Health” and its data deleted")).toBe(true);
917:     } finally {
918:       rmSync(dir, { recursive: true, force: true });
919:     }
920:   }, 120_000);
921:
922:   it("deletes a workspace and records it on the organization trail in one transaction", async () => {
923:     const created = await morgan.post<{ workspace: { id: string; tenantId: string } }>("/api/workspaces", {
924:       name: "Short-lived",
925:       profile: { industry: "saas", size: "1-10", dataTypes: [], drivers: [], environments: ["cloud"], maturityTier: 1, guidance: "guided", securityTeamSize: 1 },
926:     });
927:     const { id, tenantId } = created.json.workspace;
928:     // If the organization's audit entry cannot be written, nothing is deleted.
929:     const append = svc.store.activity.append.bind(svc.store.activity);
930:     svc.store.activity.append = async (e) => {
931:       if (e.workspaceId === tenantId) throw new Error("audit trail unavailable");
932:       return append(e);
933:     };
934:     try {
935:       expect((await morgan.del(`/api/workspaces/${id}`)).status).toBe(500);
936:     } finally {
937:       svc.store.activity.append = append;
938:     }
939:     expect((await morgan.get(`/api/workspaces/${id}`)).status).toBe(200);
940:     expect((await morgan.del(`/api/workspaces/${id}`)).status).toBe(200);
941:     expect((await morgan.get(`/api/workspaces/${id}`)).status).toBe(404);
942:     const trail = await morgan.get<{ summary: string }[]>(`/api/tenants/${tenantId}/activity?limit=5`);
943:     expect(trail.json.some((e) => e.summary === "Workspace “Short-lived” and its data deleted")).toBe(true);
944:     expect((await morgan.get<{ valid: boolean }>(`/api/tenants/${tenantId}/activity/verify`)).json.valid).toBe(true);
945:   });
946:
947:   it("publishes on the trust center only the frameworks the workspace chooses, state AI laws off by default", async () => {
948:     const visitor = new TestClient(app);
949:     const published = async () => (await visitor.get<{ frameworks: { id: string }[] }>("/api/trust/northwind-health")).json.frameworks.map((f) => f.id);
950:     const enabled = (await morgan.get<{ frameworks: { id: string; onTrustCenter: boolean }[] }>("/api/workspaces/northwind-health")).json.frameworks;
951:     expect(enabled.map((f) => f.id)).toContain("us-state-ai-laws");
952:     expect(enabled.find((f) => f.id === "us-state-ai-laws")?.onTrustCenter).toBe(false);
953:     expect(await published()).toEqual(enabled.filter((f) => f.id !== "us-state-ai-laws").map((f) => f.id));
954:     // Publish the laws and withdraw SOC 2: an audited decision.
955:     const res = await morgan.patch<{ frameworks: { id: string; onTrustCenter: boolean }[] }>("/api/workspaces/northwind-health", { trustCenter: { frameworks: { "us-state-ai-laws": true, "aicpa-tsc-2017": false } } });
956:     expect(res.status).toBe(200);
957:     expect(await published()).toContain("us-state-ai-laws");
958:     expect(await published()).not.toContain("aicpa-tsc-2017");
959:     const activity = await morgan.get<{ summary: string }[]>("/api/workspaces/northwind-health/activity?limit=3");
960:     expect(activity.json[0]!.summary).toBe("State AI laws published on the trust center; SOC 2 (TSC 2017) withdrawn on the trust center");
961:     // Saving the headline keeps the choices; threat catalogs and unknown ids are refused.
962:     await morgan.patch("/api/workspaces/northwind-health", { trustCenter: { enabled: true, headline: "Northwind Health trust" } });
963:     expect(await published()).toContain("us-state-ai-laws");
964:     expect((await morgan.patch("/api/workspaces/northwind-health", { trustCenter: { frameworks: { "mitre-atlas": true } } })).status).toBe(400);
965:     expect((await morgan.patch("/api/workspaces/northwind-health", { trustCenter: { frameworks: { nope: true } } })).status).toBe(400);
966:     // Only admins and owners decide what is public.
967:     const priya = new TestClient(app);
968:     await priya.devLogin("priya.shah@northwind-health.example");
969:     expect((await priya.patch("/api/workspaces/northwind-health", { trustCenter: { frameworks: { "us-state-ai-laws": false } } })).status).toBe(403);
970:     await morgan.patch("/api/workspaces/northwind-health", { trustCenter: { frameworks: { "us-state-ai-laws": false, "aicpa-tsc-2017": true } } });
971:     expect(await published()).not.toContain("us-state-ai-laws");
972:   });
973: });

FILE apps/server/test/auth.test.ts SHA256 9267bb4029dd8e4d90ffe71e376656f9f9e7d571c39b50474e4d136dff687556
1: import { afterAll, beforeAll, describe, expect, it } from "vitest";
2: import { FrameworkRegistry } from "@visua/frameworks";
3: import { createApp } from "../src/app.ts";
4: import { loadAuthConfig } from "../src/auth/config.ts";
5: import { AuthService, safeReturnTo } from "../src/auth/service.ts";
6: import { createService } from "../src/context.ts";
7: import { TestClient } from "./client.ts";
8: import { testDatabase } from "./db.ts";
9: import { startMockIdp } from "./mock-idp.ts";
10:
11: process.env["VISUA_AGENT_MODE"] = "offline";
12:
13: const registry = FrameworkRegistry.load();
14: const db = await testDatabase("auth");
15: const svc = await createService({ database: db.url, registry });
16: const idp = await startMockIdp();
17: /** The DNS this suite's server sees: TXT records by name, which tests publish. */
18: const txt = new Map<string, string[]>();
19: const resolveTxt = async (name: string) => {
20:   const values = txt.get(name);
21:   if (!values) throw Object.assign(new Error(`queryTxt ENOTFOUND ${name}`), { code: "ENOTFOUND" });
22:   return values.map((v) => [v]);
23: };
24: const auth = new AuthService(
25:   svc,
26:   {
27:     ...loadAuthConfig({}),
28:     mode: "dev",
29:     allowHttpIssuers: true,
30:     // The mock provider listens on 127.0.0.1: allowed as an operator allows an internal provider.
31:     privateIssuerHosts: [new URL(idp.issuer).hostname],
32:     platform: { issuer: idp.issuer, clientId: idp.clientId, clientSecret: idp.clientSecret, name: "Test IdP" },
33:   },
34:   { resolveTxt },
35: );
36: const app = createApp(svc, auth);
37:
38: afterAll(async () => {
39:   await idp.close();
40:   await svc.store.close();
41:   await db.cleanup();
42: });
43:
44: const profile = { industry: "saas", size: "11-50", dataTypes: [], drivers: [], environments: ["cloud"], maturityTier: 1, guidance: "guided", securityTeamSize: 1 };
45:
46: type Me = { user: { id: string; email: string }; activeTenant: { id: string; role: string } | null; organizations: { id: string; role: string }[]; tenantScope: string | null; method: string };
47:
48: async function signIn(email: string, name?: string) {
49:   const c = new TestClient(app);
50:   const res = await c.devLogin(email, name);
51:   expect(res.status).toBe(200);
52:   return c;
53: }
54:
55: type DomainStatus = { domain: string; verified: boolean; method?: string; record?: { name: string; value: string } };
56: type ConnectionJson = { id: string; domainStatus: DomainStatus[] };
57:
58: /** Publish a connection's TXT record for a domain and have the organization verify it. */
59: async function proveDomain(client: TestClient, tenant: string, connection: ConnectionJson, domain: string) {
60:   const record = connection.domainStatus.find((d) => d.domain === domain)!.record!;
61:   txt.set(record.name, [record.value]);
62:   const res = await client.post<ConnectionJson>(`/api/tenants/${tenant}/sso/${connection.id}/domains/${domain}/verify`);
63:   expect(res.status, JSON.stringify(res.json)).toBe(200);
64:   return res.json;
65: }
66:
67: /** Complete an OpenID Connect sign-in through the mock provider. */
68: async function oidcSignIn(connection: string, user: { sub: string; email?: string; name?: string; email_verified?: boolean }) {
69:   const c = new TestClient(app);
70:   idp.signInAs(user);
71:   const start = await c.get(`/api/auth/oidc/start?connection=${connection}&returnTo=${encodeURIComponent("/w/somewhere")}`);
72:   expect(start.status).toBe(302);
73:   const callback = await idp.authorize(start.headers.get("location")!);
74:   const done = await c.get(callback);
75:   expect(done.status).toBe(302);
76:   const me = await c.get<Me>("/api/auth/me");
77:   if (me.json) c.csrf = (me.json as unknown as { csrf: string }).csrf;
78:   return { client: c, redirect: done.headers.get("location")!, me, callback };
79: }
80:
81: let alice: TestClient;
82: let aliceTenant = "";
83: let wsId = "";
84:
85: describe("sign-in and tenant separation", () => {
86:   beforeAll(async () => {
87:     alice = await signIn("alice@acme.example", "Alice Admin");
88:     aliceTenant = (await alice.get<Me>("/api/auth/me")).json.activeTenant!.id;
89:     const ws = await alice.post<{ workspace: { id: string } }>("/api/workspaces", { name: "Acme program", profile, frameworks: ["nist-csf-2.0"] });
90:     expect(ws.status).toBe(201);
91:     wsId = ws.json.workspace.id;
92:   });
93:
94:   it("requires a signed-in principal for everything but health, sign-in and trust centers", async () => {
95:     const anon = new TestClient(app);
96:     expect((await anon.get("/api/health")).status).toBe(200);
97:     expect((await anon.get("/api/auth/config")).status).toBe(200);
98:     expect((await anon.get("/api/auth/me")).json).toBeNull();
99:     for (const path of ["/api/workspaces", "/api/meta", "/api/frameworks/nist-csf-2.0", "/api/search?q=access", "/api/corpus", "/api/corpus/file/nist-csf-2.0/core/NIST.CSWP.29.pdf", `/api/workspaces/${wsId}`]) {
100:       expect((await anon.get(path)).status, path).toBe(401);
101:     }
102:     expect((await anon.post("/api/workspaces", { name: "x", profile })).status).toBe(401);
103:   });
104:
105:   it("makes the first developer sign-in the owner of a new organization", async () => {
106:     const me = await alice.get<Me>("/api/auth/me");
107:     expect(me.json.activeTenant?.role).toBe("owner");
108:     expect(me.json.method).toBe("dev");
109:   });
110:
111:   it("hides one organization's workspaces from another", async () => {
112:     const bob = await signIn("bob@globex.example", "Bob");
113:     expect((await bob.get<unknown[]>("/api/workspaces")).json).toHaveLength(0);
114:     for (const [method, path] of [
115:       ["GET", `/api/workspaces/${wsId}`],
116:       ["GET", `/api/workspaces/${wsId}/tasks`],
117:       ["GET", `/api/workspaces/${wsId}/events`],
118:       ["GET", `/api/workspaces/${wsId}/exports/readiness.md`],
119:       ["PATCH", `/api/workspaces/${wsId}/requirements/nist-csf-2.0:GV.OC-01`],
120:       ["DELETE", `/api/workspaces/${wsId}`],
121:       ["GET", `/api/tenants/${aliceTenant}/members`],
122:     ] as const) {
123:       const res = await bob.request(method, path, method === "GET" ? undefined : { current: 1 });
124:       expect(res.status, `${method} ${path}`).toBe(404);
125:     }
126:     expect((await alice.get(`/api/workspaces/${wsId}`)).status).toBe(200);
127:   });
128:
129:   it("refuses state changes another site started, sign-in included", async () => {
130:     const res = await alice.request("PATCH", `/api/workspaces/${wsId}/requirements/nist-csf-2.0:GV.OC-01`, { current: 1 }, { "sec-fetch-site": "cross-site" });
131:     expect(res.status).toBe(403);
132:     const login = await new TestClient(app).request("POST", "/api/auth/dev/login", { email: "victim@acme.example" }, { "sec-fetch-site": "cross-site" });
133:     expect(login.status).toBe(403);
134:     expect(login.headers.get("set-cookie")).toBeNull();
135:   });
136:
137:   it("refuses state changes without the session's CSRF token", async () => {
138:     const csrf = alice.csrf;
139:     alice.csrf = "";
140:     const res = await alice.patch(`/api/workspaces/${wsId}/requirements/nist-csf-2.0:GV.OC-01`, { current: 1 });
141:     alice.csrf = csrf;
142:     expect(res.status).toBe(403);
143:   });
144:
145:   it("sends security headers", async () => {
146:     const res = await alice.get("/api/auth/me");
147:     expect(res.headers.get("x-content-type-options")).toBe("nosniff");
148:     expect(res.headers.get("x-frame-options")).toBe("DENY");
149:     expect(res.headers.get("cache-control")).toBe("no-store");
150:   });
151: });
152:
153: describe("roles", () => {
154:   const clients: Record<string, TestClient> = {};
155:   beforeAll(async () => {
156:     for (const role of ["viewer", "auditor", "contributor", "approver", "admin"] as const) {
157:       const email = `${role}@acme.example`;
158:       expect((await alice.post(`/api/tenants/${aliceTenant}/members`, { email, role })).status).toBe(201);
159:       clients[role] = await signIn(email);
160:       // The member's own personal organization is not active: switch to Acme.
161:       expect((await clients[role]!.post("/api/auth/tenant", { tenantId: aliceTenant })).status).toBe(200);
162:     }
163:   });
164:
165:   it("lets viewers read but not change or export", async () => {
166:     const v = clients["viewer"]!;
167:     const ws = await v.get<{ access: { role: string } }>(`/api/workspaces/${wsId}`);
168:     expect(ws.json.access.role).toBe("viewer");
169:     expect((await v.patch(`/api/workspaces/${wsId}/requirements/nist-csf-2.0:GV.OC-01`, { current: 2 })).status).toBe(403);
170:     expect((await v.post(`/api/workspaces/${wsId}/tasks`, { title: "Nope" })).status).toBe(403);
171:     expect((await v.get(`/api/workspaces/${wsId}/exports/readiness.md`)).status).toBe(403);
172:   });
173:
174:   it("lets auditors export but not change anything", async () => {
175:     const a = clients["auditor"]!;
176:     expect((await a.get(`/api/workspaces/${wsId}/exports/readiness.md`)).status).toBe(200);
177:     expect((await a.get(`/api/workspaces/${wsId}/activity/verify`)).status).toBe(200);
178:     expect((await a.patch(`/api/workspaces/${wsId}/requirements/nist-csf-2.0:GV.OC-01`, { current: 2 })).status).toBe(403);
179:   });
180:
181:   it("lets contributors do the work, and keeps decisions with approvers", async () => {
182:     const c = clients["contributor"]!;
183:     expect((await c.patch(`/api/workspaces/${wsId}/requirements/nist-csf-2.0:GV.OC-01`, { current: 2 })).status).toBe(200);
184:     const run = await c.post<{ proposals: { id: string }[]; status: string }>(`/api/workspaces/${wsId}/runs?wait=1`, { agent: "planner", goal: "Plan", input: { framework: "nist-csf-2.0", maxTasks: 2 } });
185:     expect(run.status).toBe(201);
186:     const proposal = run.json.proposals[0]!.id;
187:     expect((await c.post(`/api/workspaces/${wsId}/proposals/${proposal}/decision`, { decision: "approved" })).status).toBe(403);
188:     const policy = await c.post<{ id: string }>(`/api/workspaces/${wsId}/policies`, { title: "Access policy", body: "# Access policy\n\nAccess shall be reviewed quarterly." });
189:     expect(policy.status).toBe(201);
190:     expect((await c.patch(`/api/workspaces/${wsId}/policies/${policy.json.id}`, { status: "approved" })).status).toBe(403);
191:     expect((await c.put(`/api/workspaces/${wsId}/frameworks/nist-ai-rmf`, { enabled: true })).status).toBe(403);
192:     expect((await c.post(`/api/workspaces/${wsId}/connectors`, { kind: "web-posture", config: { url: "https://example.com" } })).status).toBe(403);
193:     // Scope, verification and status overrides are review decisions, like tailoring.
194:     const outcome = `/api/workspaces/${wsId}/requirements/nist-csf-2.0:GV.OC-03`;
195:     for (const decision of [{ applicable: false, applicabilityRationale: "Not relevant to our organization at all" }, { verifiedAt: new Date().toISOString() }, { statusOverride: "implemented" }]) {
196:       expect((await c.patch(outcome, decision)).status, JSON.stringify(decision)).toBe(403);
197:     }
198:     expect((await c.patch(outcome, { owner: "Legal", notes: "Contributors document the work" })).status).toBe(200);
199:
200:     const approver = clients["approver"]!;
201:     const decided = await approver.post<{ status: string; decidedBy: string }>(`/api/workspaces/${wsId}/proposals/${proposal}/decision`, { decision: "approved" });
202:     expect(decided.json.status).toBe("applied");
203:     expect(decided.json.decidedBy).toBe("approver <approver@acme.example>");
204:     expect((await approver.patch(`/api/workspaces/${wsId}/policies/${policy.json.id}`, { status: "approved" })).status).toBe(200);
205:     expect((await approver.patch(outcome, { applicable: false, applicabilityRationale: "Not relevant to our organization at all" })).status).toBe(200);
206:     expect((await approver.patch(outcome, { applicable: true })).status).toBe(200);
207:   });
208:
209:   it("records the authenticated person in the audit trail", async () => {
210:     const events = await alice.get<{ actor: string; actorId?: string; summary: string }[]>(`/api/workspaces/${wsId}/activity?limit=50`);
211:     const approval = events.json.find((e) => e.summary.startsWith("Approved:"))!;
212:     expect(approval.actor).toBe("approver <approver@acme.example>");
213:     expect(approval.actorId).toMatch(/^usr_/);
214:     expect((await alice.get<{ valid: boolean }>(`/api/workspaces/${wsId}/activity/verify`)).json.valid).toBe(true);
215:   });
216:
217:   it("never lets anyone grant a role above their own, or remove the last owner", async () => {
218:     const admin = clients["admin"]!;
219:     expect((await admin.post(`/api/tenants/${aliceTenant}/members`, { email: "mallory@acme.example", role: "owner" })).status).toBe(403);
220:     expect((await admin.post(`/api/tenants/${aliceTenant}/members`, { email: "grace@acme.example", role: "approver" })).status).toBe(201);
221:     const aliceId = (await alice.get<Me>("/api/auth/me")).json.user.id;
222:     expect((await admin.patch(`/api/tenants/${aliceTenant}/members/${aliceId}`, { role: "viewer" })).status).toBe(403);
223:     expect((await alice.patch(`/api/tenants/${aliceTenant}/members/${aliceId}`, { role: "admin" })).status).toBe(400);
224:     expect((await clients["contributor"]!.post(`/api/tenants/${aliceTenant}/members`, { email: "x@acme.example", role: "viewer" })).status).toBe(403);
225:   });
226:
227:   it("removes access when a member is removed", async () => {
228:     const members = await alice.get<{ id: string; email: string }[]>(`/api/tenants/${aliceTenant}/members`);
229:     const viewer = members.json.find((m) => m.email === "viewer@acme.example")!;
230:     expect((await alice.del(`/api/tenants/${aliceTenant}/members/${viewer.id}`)).status).toBe(204);
231:     expect((await clients["viewer"]!.get(`/api/workspaces/${wsId}`)).status).toBe(404);
232:   });
233: });
234:
235: describe("API tokens", () => {
236:   let token = "";
237:   let tokenId = "";
238:   it("authenticates automation with a scoped, revocable bearer token", async () => {
239:     expect((await alice.post(`/api/tenants/${aliceTenant}/tokens`, { name: "CI", role: "owner" })).status).toBe(400);
240:     const created = await alice.post<{ id: string; token: string; role: string }>(`/api/tenants/${aliceTenant}/tokens`, { name: "CI pipeline", role: "contributor", expiresInDays: 30 });
241:     expect(created.status).toBe(201);
242:     token = created.json.token;
243:     tokenId = created.json.id;
244:     expect(token).toMatch(/^vsa_/);
245:     const list = await alice.get<{ id: string; token?: string }[]>(`/api/tenants/${aliceTenant}/tokens`);
246:     expect(list.json.find((t) => t.id === tokenId)?.token).toBeUndefined();
247:
248:     const bot = new TestClient(app);
249:     bot.bearer = token;
250:     expect((await bot.patch(`/api/workspaces/${wsId}/requirements/nist-csf-2.0:GV.OC-02`, { current: 1 })).status).toBe(200);
251:     const events = await alice.get<{ actor: string }[]>(`/api/workspaces/${wsId}/activity?limit=5`);
252:     expect(events.json[0]!.actor).toBe("API token “CI pipeline”");
253:     expect((await bot.get("/api/workspaces")).json).toHaveLength(1);
254:   });
255:
256:   it("stops working when revoked", async () => {
257:     expect((await alice.del(`/api/tenants/${aliceTenant}/tokens/${tokenId}`)).status).toBe(204);
258:     const bot = new TestClient(app);
259:     bot.bearer = token;
260:     expect((await bot.get(`/api/workspaces/${wsId}`)).status).toBe(401);
261:   });
262:
263:   it("keeps an organization audit trail of membership, token and SSO changes", async () => {
264:     const trail = await alice.get<{ summary: string }[]>(`/api/tenants/${aliceTenant}/activity?limit=100`);
265:     expect(trail.json.some((e) => e.summary.includes("added as viewer"))).toBe(true);
266:     expect(trail.json.some((e) => e.summary.includes("API token “CI pipeline” created"))).toBe(true);
267:     expect((await alice.get<{ valid: boolean }>(`/api/tenants/${aliceTenant}/activity/verify`)).json.valid).toBe(true);
268:   });
269: });
270:
271: describe("single sign-on (OpenID Connect)", () => {
272:   it("signs in a pre-provisioned member through the platform identity provider", async () => {
273:     await alice.post(`/api/tenants/${aliceTenant}/members`, { email: "henry@corp.example", name: "Henry", role: "contributor" });
274:     const { me, redirect } = await oidcSignIn("platform", { sub: "idp|henry", email: "henry@corp.example", email_verified: true, name: "Henry Hughes" });
275:     expect(redirect).toBe("/w/somewhere");
276:     expect(me.json?.user.email).toBe("henry@corp.example");
277:     expect(me.json.method).toBe("oidc:platform");
278:     expect(me.json.organizations.find((o) => o.id === aliceTenant)?.role).toBe("contributor");
279:     // The identity is linked by issuer + subject: a later email change at the IdP still signs in the same person.
280:     const again = await oidcSignIn("platform", { sub: "idp|henry", email: "henry.hughes@corp.example", email_verified: true });
281:     expect(again.me.json.user.id).toBe(me.json.user.id);
282:   });
283:
284:   it("refuses people who have no membership, and replays of a used sign-in", async () => {
285:     const { redirect, client, callback } = await oidcSignIn("platform", { sub: "idp|stranger", email: "stranger@elsewhere.example", email_verified: true });
286:     expect(redirect).toMatch(/^\/login\?error=/);
287:     expect(decodeURIComponent(redirect)).toContain("no access");
288:     const replay = await client.get(callback);
289:     expect(decodeURIComponent(replay.headers.get("location") ?? "")).toMatch(/expired or was already used/);
290:   });
291:
292:   it("provisions members through an organization's own SSO connection, scoped to that organization", async () => {
293:     const created = await alice.post<ConnectionJson & { hasClientSecret: boolean; clientSecretSealed?: string }>(`/api/tenants/${aliceTenant}/sso`, {
294:       name: "Acme Okta",
295:       issuer: idp.issuer,
296:       clientId: idp.clientId,
297:       clientSecret: idp.clientSecret,
298:       domains: ["acme-sso.example"],
299:       jitProvisioning: true,
300:       defaultRole: "contributor",
301:     });
302:     expect(created.status).toBe(201);
303:     expect(created.json.hasClientSecret).toBe(true);
304:     expect(created.json.clientSecretSealed).toBeUndefined();
305:     // Claimed, not yet proven: the domain's people are not sent to this provider.
306:     expect(created.json.domainStatus).toMatchObject([{ domain: "acme-sso.example", verified: false, record: { name: "_visua-challenge.acme-sso.example" } }]);
307:     expect((await new TestClient(app).post<{ connection: string }>("/api/auth/sso/discover", { email: "ivy@acme-sso.example" })).json.connection).toBe("platform");
308:     await proveDomain(alice, aliceTenant, created.json, "acme-sso.example");
309:     const discovered = await new TestClient(app).post<{ connection: string }>("/api/auth/sso/discover", { email: "ivy@acme-sso.example" });
310:     expect(discovered.json.connection).toBe(created.json.id);
311:
312:     const { me, client } = await oidcSignIn(created.json.id, { sub: "okta|ivy", email: "ivy@acme-sso.example", email_verified: true, name: "Ivy" });
313:     expect(me.json.tenantScope).toBe(aliceTenant);
314:     expect(me.json.activeTenant?.role).toBe("contributor");
315:     expect((await client.get(`/api/workspaces/${wsId}`)).status).toBe(200);
316:
317:     // Even as a member elsewhere, an Acme-SSO session reaches only Acme.
318:     const bob = await signIn("bob@globex.example");
319:     const bobTenant = (await bob.get<Me>("/api/auth/me")).json.activeTenant!.id;
320:     const bobWs = await bob.post<{ workspace: { id: string } }>("/api/workspaces", { name: "Globex program", profile, frameworks: ["nist-csf-2.0"] });
321:     await bob.post(`/api/tenants/${bobTenant}/members`, { email: "ivy@acme-sso.example", role: "viewer" });
322:     expect((await client.get(`/api/workspaces/${bobWs.json.workspace.id}`)).status).toBe(404);
323:
324:     // Addresses outside the connection's domains are refused.
325:     const outsider = await oidcSignIn(created.json.id, { sub: "okta|eve", email: "eve@evil.example", email_verified: true });
326:     expect(decodeURIComponent(outsider.redirect)).toContain("acme-sso.example");
327:   });
328:
329:   it("can require an organization's own SSO for every session", async () => {
330:     expect((await alice.patch(`/api/tenants/${aliceTenant}`, { settings: { requireSso: true } })).status).toBe(200);
331:     // Alice's developer session no longer reaches Acme; an Acme SSO session does.
332:     expect((await alice.get(`/api/workspaces/${wsId}`)).status).toBe(404);
333:     const { client } = await oidcSignIn((await svc.store.identity.sso.forTenant(aliceTenant))[0]!.id, { sub: "okta|ivy", email: "ivy@acme-sso.example" });
334:     expect((await client.get(`/api/workspaces/${wsId}`)).status).toBe(200);
335:   });
336: });
337:
338: describe("single sign-on hardening", () => {
339:   let olivia: TestClient;
340:   let initech = "";
341:   let connectionId = "";
342:   beforeAll(async () => {
343:     olivia = await signIn("olivia@initech.example", "Olivia Owner");
344:     initech = (await olivia.get<Me>("/api/auth/me")).json.activeTenant!.id;
345:     const created = await olivia.post<ConnectionJson>(`/api/tenants/${initech}/sso`, {
346:       name: "Initech SSO",
347:       issuer: idp.issuer,
348:       clientId: idp.clientId,
349:       clientSecret: idp.clientSecret,
350:       domains: ["initech-sso.example"],
351:       jitProvisioning: true,
352:       defaultRole: "viewer",
353:     });
354:     expect(created.status).toBe(201);
355:     connectionId = created.json.id;
356:     await proveDomain(olivia, initech, created.json, "initech-sso.example");
357:   });
358:
359:   it("keeps an organization's identity provider off private addresses unless the operator allows them", async () => {
360:     // The same connection on a server that allows no private issuers: its provider is on 127.0.0.1.
361:     const closed = createApp(svc, new AuthService(svc, { ...auth.config, privateIssuerHosts: [] }));
362:     const refused = await closed.request(`/api/auth/oidc/start?connection=${connectionId}`);
363:     expect(refused.status).toBe(401);
364:     expect(await refused.text()).toMatch(/private or reserved address \(127\.0\.0\.1\).*VISUA_OIDC_PRIVATE_ISSUERS/);
365:     // Allowed, as on this suite's server, the sign-in starts.
366:     expect((await app.request(`/api/auth/oidc/start?connection=${connectionId}`)).status).toBe(302);
367:     // Owners learn it when they save a literal private address or localhost as the issuer.
368:     for (const issuer of ["https://10.0.0.5", "https://169.254.169.254/latest", "https://[::1]:8443", "https://[::ffff:a9fe:a9fe]", "https://localhost:8443"]) {
369:       expect((await olivia.patch(`/api/tenants/${initech}/sso/${connectionId}`, { issuer })).status, issuer).toBe(400);
370:     }
371:   });
372:
373:   it("finishes a sign-in only in the browser that started it", async () => {
374:     idp.signInAs({ sub: "okta|walter", email: "walter@initech-sso.example", email_verified: true });
375:     const attacker = new TestClient(app);
376:     const start = await attacker.get(`/api/auth/oidc/start?connection=${connectionId}`);
377:     const callback = await idp.authorize(start.headers.get("location")!);
378:     // The victim opens the attacker's unused callback link: no session, and the flow is spent.
379:     const victim = new TestClient(app);
380:     const done = await victim.get(callback);
381:     expect(decodeURIComponent(done.headers.get("location") ?? "")).toContain("started in another browser");
382:     expect((await victim.get<Me | null>("/api/auth/me")).json).toBeNull();
383:     expect(decodeURIComponent((await attacker.get(callback)).headers.get("location") ?? "")).toMatch(/expired or was already used/);
384:     // Another site cannot start a sign-in either.
385:     const crossSite = await new TestClient(app).request("GET", `/api/auth/oidc/start?connection=${connectionId}`, undefined, { "sec-fetch-site": "cross-site" });
386:     expect(crossSite.headers.get("location")).toMatch(/^\/login\?error=/);
387:   });
388:
389:   it("lets only owners choose a connection's identity provider, and never sends its secret to another one", async () => {
390:     await olivia.post(`/api/tenants/${initech}/members`, { email: "adam@initech.example", role: "admin" });
391:     const adam = await signIn("adam@initech.example");
392:     await adam.post("/api/auth/tenant", { tenantId: initech });
393:     // Admins run the connection...
394:     const renamed = await adam.patch<{ name: string; jitProvisioning: boolean }>(`/api/tenants/${initech}/sso/${connectionId}`, { jitProvisioning: false });
395:     expect(renamed.status).toBe(200);
396:     // ...an update without a name keeps the name...
397:     expect(renamed.json).toMatchObject({ name: "Initech SSO", jitProvisioning: false });
398:     await adam.patch(`/api/tenants/${initech}/sso/${connectionId}`, { jitProvisioning: true });
399:     // ...but cannot point it at another provider, add one or remove it.
400:     expect((await adam.patch(`/api/tenants/${initech}/sso/${connectionId}`, { issuer: "https://idp.attacker.example" })).status).toBe(403);
401:     expect((await adam.patch(`/api/tenants/${initech}/sso/${connectionId}`, { domains: ["initech-sso.example", "initech.example"] })).status).toBe(403);
402:     expect((await adam.post(`/api/tenants/${initech}/sso`, { issuer: "https://idp.attacker.example", clientId: "x", domains: ["other.example"] })).status).toBe(403);
403:     expect((await adam.del(`/api/tenants/${initech}/sso/${connectionId}`)).status).toBe(403);
404:     // An owner's new issuer does not inherit the old provider's client secret.
405:     const moved = await olivia.patch<{ hasClientSecret: boolean }>(`/api/tenants/${initech}/sso/${connectionId}`, { issuer: "https://idp.elsewhere.example" });
406:     expect(moved.json.hasClientSecret).toBe(false);
407:     const back = await olivia.patch<{ hasClientSecret: boolean }>(`/api/tenants/${initech}/sso/${connectionId}`, { issuer: idp.issuer, clientSecret: idp.clientSecret });
408:     expect(back.json.hasClientSecret).toBe(true);
409:   });
410:
411:   it("never lets an organization's provider rename someone who belongs to other organizations", async () => {
412:     const carol = await signIn("carol@initech-sso.example", "Carol Carter");
413:     const { me } = await oidcSignIn(connectionId, { sub: "okta|carol", email: "carol@initech-sso.example", email_verified: true, name: "Mallory" });
414:     expect(me.json.activeTenant?.id).toBe(initech);
415:     expect((await carol.get<{ user: { name: string } }>("/api/auth/me")).json.user.name).toBe("Carol Carter");
416:     // Someone new to Visua takes the name their provider gives.
417:     const fresh = await oidcSignIn(connectionId, { sub: "okta|nina", email: "nina@initech-sso.example", email_verified: true, name: "Nina Nakamura" });
418:     expect(fresh.me.json.user).toMatchObject({ email: "nina@initech-sso.example" });
419:     expect((await fresh.client.get<{ user: { name: string } }>("/api/auth/me")).json.user.name).toBe("Nina Nakamura");
420:   });
421:
422:   it("links an existing account through the platform provider only for a verified email", async () => {
423:     // henry@corp.example exists (linked to idp|henry above); a new subject claiming his address without verification is refused.
424:     const unverified = await oidcSignIn("platform", { sub: "idp|imposter", email: "henry@corp.example" });
425:     expect(decodeURIComponent(unverified.redirect)).toContain("verified email");
426:     expect(unverified.me.json).toBeNull();
427:   });
428:
429:   it("keeps Require SSO in force: the last connection cannot be disabled while it is on", async () => {
430:     const token = await olivia.post<{ token: string }>(`/api/tenants/${initech}/tokens`, { name: "Automation", role: "admin" });
431:     expect((await olivia.patch(`/api/tenants/${initech}`, { settings: { requireSso: true } })).status).toBe(200);
432:     const bot = new TestClient(app);
433:     bot.bearer = token.json.token;
434:     const disabled = await bot.patch<{ error: string }>(`/api/tenants/${initech}/sso/${connectionId}`, { enabled: false });
435:     expect(disabled.status).toBe(400);
436:     expect(disabled.json.error).toMatch(/Require SSO/);
437:     expect((await svc.store.identity.sso.get(connectionId))?.enabled).toBe(true);
438:   });
439:
440:   it("allows only same-site relative return paths", () => {
441:     for (const bad of ["//evil.example", "/\\evil.example", "/\t/evil.example", "/\n/evil.example", "https://evil.example", "evil", "/ok\\..\\..\\x"]) expect(safeReturnTo(bad), JSON.stringify(bad)).toBe("/");
442:     for (const good of ["/", "/w/acme/agents?tab=inbox", "/w/acme/observatory/nist-csf-2.0?select=nist-csf-2.0%3AGV.OC-01"]) expect(safeReturnTo(good)).toBe(good);
443:   });
444: });
445:
446: describe("SSO domains are proven by DNS before they route or admit anyone", () => {
447:   let owner: TestClient;
448:   let tenant = "";
449:   let connection: ConnectionJson;
450:   const create = (client: TestClient, t: string, domains: string[]) =>
451:     client.post<ConnectionJson & { error?: string }>(`/api/tenants/${t}/sso`, { name: "Umbrella SSO", issuer: idp.issuer, clientId: idp.clientId, clientSecret: idp.clientSecret, domains, jitProvisioning: true });
452:   beforeAll(async () => {
453:     owner = await signIn("uma@umbrella.example", "Uma Owner");
454:     tenant = (await owner.get<Me>("/api/auth/me")).json.activeTenant!.id;
455:     const created = await create(owner, tenant, ["umbrella-sso.example"]);
456:     expect(created.status).toBe(201);
457:     connection = created.json;
458:   });
459:
460:   it("neither routes, admits nor can be required while a domain is pending", async () => {
461:     expect((await new TestClient(app).post<{ connection: string }>("/api/auth/sso/discover", { email: "val@umbrella-sso.example" })).json.connection).toBe("platform");
462:     const stranger = await oidcSignIn(connection.id, { sub: "okta|val", email: "val@umbrella-sso.example", email_verified: true });
463:     expect(decodeURIComponent(stranger.redirect)).toContain("no verified email domain yet");
464:     const required = await owner.patch<{ error: string }>(`/api/tenants/${tenant}`, { settings: { requireSso: true } });
465:     expect(required.status).toBe(400);
466:     expect(required.json.error).toMatch(/Verify at least one/);
467:   });
468:
469:   it("verifies only the exact TXT record, lets admins do it, and records it in the organization's trail", async () => {
470:     const record = connection.domainStatus[0]!.record!;
471:     expect(record).toEqual({ name: "_visua-challenge.umbrella-sso.example", value: expect.stringMatching(/^visua-domain-verification=[0-9a-f]{32}$/) });
472:     const verify = (client: TestClient) => client.post<ConnectionJson & { error?: string }>(`/api/tenants/${tenant}/sso/${connection.id}/domains/umbrella-sso.example/verify`);
473:     const missing = await verify(owner);
474:     expect(missing.status).toBe(400);
475:     expect(missing.json.error).toContain(record.name);
476:     txt.set(record.name, ["visua-domain-verification=someone-elses-token"]);
477:     expect((await verify(owner)).status).toBe(400);
478:     // Other organizations and members below admin cannot.
479:     const outsider = await signIn("xavier@elsewhere-dns.example");
480:     expect((await verify(outsider)).status).toBe(404);
481:     await owner.post(`/api/tenants/${tenant}/members`, { email: "carl@umbrella.example", role: "contributor" });
482:     await owner.post(`/api/tenants/${tenant}/members`, { email: "ada@umbrella.example", role: "admin" });
483:     expect((await verify(await signIn("carl@umbrella.example"))).status).toBe(403);
484:     // Records may be split into several strings, and sit beside others.
485:     txt.set(record.name, ["v=spf1 -all", record.value]);
486:     const done = await verify(await signIn("ada@umbrella.example"));
487:     expect(done.status).toBe(200);
488:     expect(done.json.domainStatus).toMatchObject([{ domain: "umbrella-sso.example", verified: true, method: "dns" }]);
489:     const trail = await owner.get<{ action: string; entity: string; summary: string }[]>(`/api/tenants/${tenant}/activity`);
490:     expect(trail.json.some((e) => e.action === "verified" && e.entity === "sso-domain" && e.summary.includes("umbrella-sso.example"))).toBe(true);
491:     expect((await new TestClient(app).post<{ connection: string }>("/api/auth/sso/discover", { email: "val@umbrella-sso.example" })).json.connection).toBe(connection.id);
492:     const member = await oidcSignIn(connection.id, { sub: "okta|val", email: "val@umbrella-sso.example", email_verified: true });
493:     expect(member.me.json.tenantScope).toBe(tenant);
494:   });
495:
496:   it("lets claims wait side by side, and gives a domain to the first organization that proves it", async () => {
497:     // Two other organizations claim the same domain: a claim alone holds nothing.
498:     const first = await signIn("fay@first-dns.example");
499:     const firstTenant = (await first.get<Me>("/api/auth/me")).json.activeTenant!.id;
500:     const second = await signIn("sid@second-dns.example");
501:     const secondTenant = (await second.get<Me>("/api/auth/me")).json.activeTenant!.id;
502:     const a = await create(first, firstTenant, ["shared-dns.example"]);
503:     const b = await create(second, secondTenant, ["shared-dns.example"]);
504:     expect([a.status, b.status]).toEqual([201, 201]);
505:     expect(a.json.domainStatus[0]!.record!.value).not.toBe(b.json.domainStatus[0]!.record!.value);
506:     // Within one organization, a domain goes on one connection only.
507:     expect((await create(first, firstTenant, ["shared-dns.example"])).status).toBe(400);
508:     await proveDomain(second, secondTenant, b.json, "shared-dns.example");
509:     // Even with its own record published too, the first organization can no longer take it...
510:     const record = a.json.domainStatus[0]!.record!;
511:     txt.set(record.name, [record.value, b.json.domainStatus[0]!.record!.value]);
512:     const late = await first.post<{ error: string }>(`/api/tenants/${firstTenant}/sso/${a.json.id}/domains/shared-dns.example/verify`);
513:     expect(late.status).toBe(400);
514:     expect(late.json.error).toMatch(/verified by another SSO connection/);
515:     // ...and nobody can claim it anew.
516:     const third = await signIn("tia@third-dns.example");
517:     expect((await create(third, (await third.get<Me>("/api/auth/me")).json.activeTenant!.id, ["shared-dns.example"])).status).toBe(400);
518:   });
519:
520:   it("gives a domain that is removed and listed again a new challenge", async () => {
521:     const before = connection.domainStatus[0]!.record!.value;
522:     await owner.patch(`/api/tenants/${tenant}/sso/${connection.id}`, { domains: ["umbrella-sso.example", "umbrella-two.example"] });
523:     await owner.patch(`/api/tenants/${tenant}/sso/${connection.id}`, { domains: ["umbrella-two.example"] });
524:     const back = await owner.patch<ConnectionJson>(`/api/tenants/${tenant}/sso/${connection.id}`, { domains: ["umbrella-two.example", "umbrella-sso.example"] });
525:     const again = back.json.domainStatus.find((d) => d.domain === "umbrella-sso.example")!;
526:     expect(again.verified).toBe(false);
527:     expect(again.record!.value).not.toBe(before);
528:   });
529:
530:   it("trusts domains as claimed when the operator turns verification off", async () => {
531:     const trusting = createApp(svc, new AuthService(svc, { ...auth.config, ssoDomainVerification: "off" }, { resolveTxt }));
532:     const client = new TestClient(trusting);
533:     await client.devLogin("otto@trusting.example");
534:     const t = (await client.get<Me>("/api/auth/me")).json.activeTenant!.id;
535:     const created = await create(client, t, ["trusting-sso.example"]);
536:     expect(created.json.domainStatus).toMatchObject([{ domain: "trusting-sso.example", verified: true, method: "trusted" }]);
537:   });
538: });
539:
540: describe("corpus files and list limits", () => {
541:   it("serves official HTML pages sandboxed, and never a .local folder in any letter case", async () => {
542:     const c = await signIn("reader@files.example");
543:     const html = await c.get("/api/corpus/file/us-state-ai-laws/illinois/ilcs-225-155-wopr-act.html");
544:     expect(html.status).toBe(200);
545:     expect(html.headers.get("content-security-policy")).toBe("sandbox");
546:     expect((await c.get("/api/corpus/file/nist-rmf/controls/.LOCAL/anything.pdf")).status).toBe(400);
547:     expect((await c.get("/api/corpus/file/nist-rmf/controls/%2Elocal/anything.pdf")).status).toBe(400);
548:     const pdf = await c.get("/api/corpus/file/nist-csf-2.0/core/NIST.CSWP.29.pdf");
549:     expect(pdf.headers.get("content-security-policy")).toBeNull();
550:   });
551:
552:   it("treats a malformed ?limit= as the default instead of failing", async () => {
553:     const c = await signIn("lister@files.example");
554:     const tenant = (await c.get<Me>("/api/auth/me")).json.activeTenant!.id;
555:     const ws = (await c.post<{ workspace: { id: string } }>("/api/workspaces", { name: "Lists", profile, frameworks: ["nist-csf-2.0"] })).json.workspace.id;
556:     for (const path of [`/api/tenants/${tenant}/activity?limit=abc`, `/api/workspaces/${ws}/activity?limit=abc`, `/api/workspaces/${ws}/runs?limit=-5`, `/api/workspaces/${ws}/activity?limit=1.5`]) {
557:       const res = await c.get<unknown[]>(path);
558:       expect(res.status, path).toBe(200);
559:       expect(Array.isArray(res.json), path).toBe(true);
560:     }
561:     expect((await c.get<unknown[]>(`/api/workspaces/${ws}/activity?limit=1`)).json).toHaveLength(1);
562:   });
563: });

FILE apps/server/test/client.ts SHA256 e04c07b0c3f68c8eca08127304e0c3ba92f485b20b93867de41c6d2856e186d5
1: /** A cookie-keeping API client for tests: signs in like the browser does (session cookie + CSRF header). */
2: import type { Hono } from "hono";
3: import type { AppEnv } from "../src/auth/http.ts";
4:
5: export interface Res<T> {
6:   status: number;
7:   json: T;
8:   text: string;
9:   headers: Headers;
10: }
11:
12: export class TestClient {
13:   /** Cookies the server set (a minimal cookie jar: session and sign-in flow cookies). */
14:   readonly jar = new Map<string, string>();
15:   csrf = "";
16:   bearer = "";
17:   readonly app: Hono<AppEnv>;
18:
19:   constructor(app: Hono<AppEnv>) {
20:     this.app = app;
21:   }
22:
23:   async request<T = unknown>(method: string, path: string, body?: unknown, extra: Record<string, string> = {}): Promise<Res<T>> {
24:     const headers: Record<string, string> = { ...(body !== undefined ? { "content-type": "application/json" } : {}) };
25:     if (this.jar.size) headers["cookie"] = [...this.jar].map(([k, v]) => `${k}=${v}`).join("; ");
26:     if (this.csrf && method !== "GET" && method !== "HEAD") headers["x-visua-csrf"] = this.csrf;
27:     if (this.bearer) headers["authorization"] = `Bearer ${this.bearer}`;
28:     const res = await this.app.request(path, { method, headers: { ...headers, ...extra }, body: body !== undefined ? JSON.stringify(body) : undefined });
29:     for (const set of res.headers.getSetCookie()) {
30:       const pair = set.split(";")[0]!;
31:       const name = pair.slice(0, pair.indexOf("="));
32:       const value = pair.slice(pair.indexOf("=") + 1);
33:       if (!value || /max-age=0/i.test(set)) this.jar.delete(name);
34:       else this.jar.set(name, value);
35:     }
36:     const text = await res.text();
37:     let json: T;
38:     try {
39:       json = JSON.parse(text) as T;
40:     } catch {
41:       json = undefined as T;
42:     }
43:     return { status: res.status, json, text, headers: res.headers };
44:   }
45:
46:   get = <T = unknown>(path: string) => this.request<T>("GET", path);
47:   post = <T = unknown>(path: string, body?: unknown) => this.request<T>("POST", path, body ?? {});
48:   patch = <T = unknown>(path: string, body: unknown) => this.request<T>("PATCH", path, body);
49:   put = <T = unknown>(path: string, body: unknown) => this.request<T>("PUT", path, body);
50:   del = <T = unknown>(path: string) => this.request<T>("DELETE", path);
51:
52:   async devLogin(email: string, name?: string): Promise<Res<{ csrf: string; user: { id: string; email: string }; activeTenant: { id: string; role: string } | null }>> {
53:     const res = await this.post<{ csrf: string; user: { id: string; email: string }; activeTenant: { id: string; role: string } | null }>("/api/auth/dev/login", { email, name });
54:     if (res.status === 200) this.csrf = res.json.csrf;
55:     return res;
56:   }
57: }

FILE apps/server/test/db.ts SHA256 287b4313e448fed3f89758820fd1c6e7c4e15e1b17228688a9993ff2b78bdb6e
1: /**
2:  * Test database: SQLite in memory by default. Set VISUA_TEST_DATABASE_URL to a
3:  * Postgres URL to run the same suites on Postgres; each run gets its own
4:  * schema, dropped afterwards, so the database is never polluted.
5:  */
6: import { randomBytes } from "node:crypto";
7: import pg from "pg";
8:
9: export const TEST_PG_URL = process.env["VISUA_TEST_DATABASE_URL"];
10:
11: export interface TestDatabase {
12:   url: string;
13:   dialect: "sqlite" | "postgres";
14:   cleanup(): Promise<void>;
15: }
16:
17: export async function testDatabase(label = "t"): Promise<TestDatabase> {
18:   if (!TEST_PG_URL) return { url: ":memory:", dialect: "sqlite", cleanup: async () => undefined };
19:   const schema = `visua_${label}_${Date.now().toString(36)}_${randomBytes(3).toString("hex")}`;
20:   const admin = new pg.Client({ connectionString: TEST_PG_URL });
21:   await admin.connect();
22:   await admin.query(`CREATE SCHEMA ${schema}`);
23:   await admin.end();
24:   const url = new URL(TEST_PG_URL);
25:   url.searchParams.set("options", `-c search_path=${schema}`);
26:   return {
27:     url: url.toString(),
28:     dialect: "postgres",
29:     cleanup: async () => {
30:       const c = new pg.Client({ connectionString: TEST_PG_URL });
31:       await c.connect();
32:       await c.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`);
33:       await c.end();
34:     },
35:   };
36: }

FILE apps/server/test/domain-recheck.test.ts SHA256 e30f3a14b2046990e780eb0ee546f23c410425f29f58805927bc58d9f236339d
1: import { afterEach, describe, expect, it, vi } from "vitest";
2: import { loadAuthConfig } from "../src/auth/config.ts";
3: import { applyOutcome, classifyLookup, standingOf } from "../src/auth/domain-recheck.ts";
4: import { startDomainRechecks } from "../src/auth/recheck-ticker.ts";
5:
6: const DAY = 86_400_000;
7: const s = { intervalMs: DAY, graceMs: 7 * DAY };
8: const t0 = new Date("2026-10-01T00:00:00.000Z");
9: const at = (days: number) => new Date(t0.getTime() + days * DAY);
10: const proven = { token: "a".repeat(32), verifiedAt: "2026-09-01T00:00:00.000Z", method: "dns" as const, nextCheckAt: t0.toISOString() };
11:
12: describe("classifying a TXT lookup", () => {
13:   const expected = "visua-domain-verification=abc";
14:   it("finds the exact value among the records, joining split strings", () => {
15:     expect(classifyLookup({ records: [["other"], ["visua-domain-", "verification=abc"]] }, expected).outcome).toBe("found");
16:   });
17:   it("counts only a clean negative answer as missing", () => {
18:     expect(classifyLookup({ records: [["visua-domain-verification=zzz"]] }, expected).outcome).toBe("missing");
19:     expect(classifyLookup({ error: Object.assign(new Error("x"), { code: "ENOTFOUND" }) }, expected).outcome).toBe("missing");
20:     expect(classifyLookup({ error: Object.assign(new Error("x"), { code: "ENODATA" }) }, expected).outcome).toBe("missing");
21:   });
22:   it("treats timeouts and server failures as unknown", () => {
23:     expect(classifyLookup({ error: Object.assign(new Error("x"), { code: "ETIMEOUT" }) }, expected)).toEqual({ outcome: "unknown", code: "ETIMEOUT" });
24:     expect(classifyLookup({ error: Object.assign(new Error("x"), { code: "ESERVFAIL" }) }, expected).outcome).toBe("unknown");
25:     expect(classifyLookup({ error: new Error("no code") }, expected).outcome).toBe("unknown");
26:     expect(classifyLookup({ error: null }, expected).outcome).toBe("unknown");
27:   });
28: });
29:
30: describe("what one re-check does to a domain", () => {
31:   it("keeps a found domain verified and schedules the next check", () => {
32:     const { next, event } = applyOutcome(proven, "found", t0, s);
33:     expect(event).toBeUndefined();
34:     expect(next).toMatchObject({ verifiedAt: proven.verifiedAt, lastCheckedAt: t0.toISOString(), nextCheckAt: at(1).toISOString() });
35:     expect(standingOf(next)).toBe("verified");
36:   });
37:
38:   it("starts a failure at the first miss, lapses it at the end of the grace period, and recovers it", () => {
39:     const first = applyOutcome(proven, "missing", t0, s);
40:     expect(first.event).toBe("failing");
41:     expect(first.next).toMatchObject({ verifiedAt: proven.verifiedAt, failingSince: t0.toISOString(), lapsesAt: at(7).toISOString() });
42:     expect(standingOf(first.next)).toBe("failing");
43:     const middle = applyOutcome(first.next, "missing", at(3), s);
44:     expect(middle.event).toBeUndefined();
45:     expect(middle.next.failingSince).toBe(t0.toISOString());
46:     const lapsed = applyOutcome(middle.next, "missing", at(7), s);
47:     expect(lapsed.event).toBe("lapsed");
48:     expect(lapsed.next.verifiedAt).toBeUndefined();
49:     expect(lapsed.next).toMatchObject({ lapsedAt: at(7).toISOString(), nextCheckAt: at(8).toISOString() });
50:     expect(standingOf(lapsed.next)).toBe("lapsed");
51:     expect(applyOutcome(lapsed.next, "missing", at(8), s).event).toBeUndefined();
52:     const back = applyOutcome(lapsed.next, "found", at(9), s);
53:     expect(back.event).toBe("recovered");
54:     expect(back.next).toMatchObject({ verifiedAt: at(9).toISOString(), method: "dns" });
55:     expect(back.next.lapsedAt ?? back.next.failingSince ?? back.next.lapsesAt).toBeUndefined();
56:     expect(standingOf(back.next)).toBe("verified");
57:   });
58:
59:   it("recovers a failing domain without changing when it was proven", () => {
60:     const failing = applyOutcome(proven, "missing", t0, s).next;
61:     const back = applyOutcome(failing, "found", at(2), s);
62:     expect(back.event).toBe("recovered");
63:     expect(back.next.verifiedAt).toBe(proven.verifiedAt);
64:   });
65:
66:   it("lets DNS trouble neither start nor advance a failure", () => {
67:     const unknown = applyOutcome(proven, "unknown", t0, s);
68:     expect(unknown.event).toBeUndefined();
69:     expect(unknown.next).toEqual({ ...proven, nextCheckAt: new Date(t0.getTime() + 3_600_000).toISOString() });
70:     // Days of timeouts after a first miss never lapse the domain.
71:     let v = applyOutcome(proven, "missing", t0, s).next;
72:     for (let d = 1; d <= 10; d++) v = applyOutcome(v, "unknown", at(d), s).next;
73:     expect(standingOf(v)).toBe("failing");
74:   });
75:
76:   it("names the standing of domains that were never looked up", () => {
77:     expect(standingOf(undefined)).toBe("pending");
78:     expect(standingOf({ token: "t" })).toBe("pending");
79:     expect(standingOf({ token: "t", verifiedAt: "x", method: "grandfathered" })).toBe("not-proven");
80:     expect(standingOf({ token: "t", verifiedAt: "x", method: "trusted" })).toBe("not-proven");
81:   });
82: });
83:
84: describe("re-check settings", () => {
85:   it("checks daily and lapses after a week by default", () => {
86:     expect(loadAuthConfig({})).toMatchObject({ domainRecheckHours: 24, domainRecheckGraceDays: 7 });
87:   });
88:   it("turns re-checking off with 0 and ignores nonsense", () => {
89:     expect(loadAuthConfig({ VISUA_SSO_DOMAIN_RECHECK_HOURS: "0" }).domainRecheckHours).toBe(0);
90:     expect(loadAuthConfig({ VISUA_SSO_DOMAIN_RECHECK_HOURS: "-3", VISUA_SSO_DOMAIN_RECHECK_GRACE_DAYS: "soon" })).toMatchObject({ domainRecheckHours: 24, domainRecheckGraceDays: 7 });
91:     expect(loadAuthConfig({ VISUA_SSO_DOMAIN_RECHECK_HOURS: "6", VISUA_SSO_DOMAIN_RECHECK_GRACE_DAYS: "14" })).toMatchObject({ domainRecheckHours: 6, domainRecheckGraceDays: 14 });
92:   });
93:   it("re-checks at most hourly: a positive interval below an hour counts as one hour", () => {
94:     expect(loadAuthConfig({ VISUA_SSO_DOMAIN_RECHECK_HOURS: "0.25" }).domainRecheckHours).toBe(1);
95:     expect(loadAuthConfig({ VISUA_SSO_DOMAIN_RECHECK_HOURS: "0.001" }).domainRecheckHours).toBe(1);
96:     expect(loadAuthConfig({ VISUA_SSO_DOMAIN_RECHECK_HOURS: "0" }).domainRecheckHours).toBe(0);
97:   });
98:   it("treats a blank value as unset", () => {
99:     expect(loadAuthConfig({ VISUA_SSO_DOMAIN_RECHECK_HOURS: "" }).domainRecheckHours).toBe(24);
100:     expect(loadAuthConfig({ VISUA_SSO_DOMAIN_RECHECK_HOURS: "  " }).domainRecheckHours).toBe(24);
101:   });
102: });
103:
104: describe("the re-check ticker", () => {
105:   afterEach(() => vi.useRealTimers());
106:
107:   it("runs shortly after start and then on every interval, never overlapping, until stopped", async () => {
108:     vi.useFakeTimers();
109:     let runs = 0;
110:     let release: () => void = () => undefined;
111:     const stop = startDomainRechecks(
112:       () => {
113:         runs++;
114:         return new Promise<void>((r) => (release = r));
115:       },
116:       { firstMs: 1000, everyMs: 10_000 },
117:     );
118:     await vi.advanceTimersByTimeAsync(999);
119:     expect(runs).toBe(0);
120:     await vi.advanceTimersByTimeAsync(1);
121:     expect(runs).toBe(1);
122:     // Still running at the next interval: that tick is skipped.
123:     await vi.advanceTimersByTimeAsync(10_000);
124:     expect(runs).toBe(1);
125:     release();
126:     await vi.advanceTimersByTimeAsync(10_000);
127:     expect(runs).toBe(2);
128:     release();
129:     stop();
130:     await vi.advanceTimersByTimeAsync(50_000);
131:     expect(runs).toBe(2);
132:   });
133:
134:   it("logs a failed run and keeps ticking", async () => {
135:     vi.useFakeTimers();
136:     const logged: string[] = [];
137:     let runs = 0;
138:     const stop = startDomainRechecks(
139:       async () => {
140:         runs++;
141:         throw new Error("database gone");
142:       },
143:       { firstMs: 10, everyMs: 100, log: (m) => logged.push(m) },
144:     );
145:     await vi.advanceTimersByTimeAsync(210);
146:     expect(runs).toBe(3);
147:     expect(logged[0]).toContain("database gone");
148:     stop();
149:   });
150: });

FILE apps/server/test/egress.test.ts SHA256 f95629c69358d876b419019f8469dbf70eb93e77b775792a2f25bcdb10cc6b6e
1: import { createServer, type Server } from "node:http";
2: import type { AddressInfo } from "node:net";
3: import { afterAll, beforeAll, describe, expect, it } from "vitest";
4: import { guardedFetch, isNonPublicAddress, privateAddressCause, privateHostAllowed, PrivateAddressError, refusedLiteral } from "../src/auth/egress.ts";
5:
6: describe("non-public addresses", () => {
7:   it.each([
8:     "10.1.2.3",
9:     "127.0.0.1",
10:     "169.254.169.254",
11:     "172.20.0.1",
12:     "192.168.1.1",
13:     "100.64.0.1",
14:     "0.0.0.0",
15:     "224.0.0.1",
16:     "::1",
17:     "::",
18:     "fd12:3456::1",
19:     "fe80::1",
20:     "::ffff:10.0.0.1",
21:     "::ffff:a9fe:a9fe",
22:     "64:ff9b::7f00:1",
23:     "2002:c0a8:101::1",
24:   ])("%s is not public", (address) => {
25:     expect(isNonPublicAddress(address)).toBe(true);
26:   });
27:
28:   it.each(["8.8.8.8", "1.1.1.1", "172.32.0.1", "2606:4700:4700::1111", "::ffff:8.8.8.8", "64:ff9b::808:808"])("%s is public", (address) => {
29:     expect(isNonPublicAddress(address)).toBe(false);
30:   });
31:
32:   it("refuses literal private issuers and localhost when saved, unless the operator allows the host", () => {
33:     const none = privateHostAllowed([]);
34:     expect(refusedLiteral(new URL("https://10.0.0.5"), none)).toBe(true);
35:     expect(refusedLiteral(new URL("https://[fe80::1]/"), none)).toBe(true);
36:     expect(refusedLiteral(new URL("https://localhost:8443"), none)).toBe(true);
37:     expect(refusedLiteral(new URL("https://login.example.com"), none)).toBe(false);
38:     expect(refusedLiteral(new URL("https://10.0.0.5"), privateHostAllowed(["10.0.0.5"]))).toBe(false);
39:     expect(refusedLiteral(new URL("https://localhost"), privateHostAllowed(["*"]))).toBe(false);
40:   });
41: });
42:
43: describe("guarded fetch", () => {
44:   let server: Server;
45:   let port = 0;
46:   beforeAll(async () => {
47:     server = createServer((req, res) => {
48:       if (req.url === "/huge") {
49:         res.writeHead(200, { "content-type": "application/json" });
50:         res.end("x".repeat(2 * 1024 * 1024));
51:         return;
52:       }
53:       let body = "";
54:       req.on("data", (c: Buffer) => (body += c.toString()));
55:       req.on("end", () => {
56:         res.writeHead(200, { "content-type": "application/json" });
57:         res.end(JSON.stringify({ method: req.method, body }));
58:       });
59:     });
60:     await new Promise<void>((r) => server.listen(0, "127.0.0.1", () => r()));
61:     port = (server.address() as AddressInfo).port;
62:   });
63:   afterAll(() => new Promise<void>((r) => server.close(() => r())));
64:
65:   const options = { method: "GET", headers: {}, body: null, redirect: "manual" as const };
66:
67:   it("refuses a literal private address unless the operator allows it", async () => {
68:     const refused = await guardedFetch(privateHostAllowed([]))(`http://127.0.0.1:${port}/`, options).catch((e: unknown) => e);
69:     expect(refused).toBeInstanceOf(PrivateAddressError);
70:     const res = await guardedFetch(privateHostAllowed(["127.0.0.1"]))(`http://127.0.0.1:${port}/`, options);
71:     expect(await res.json()).toEqual({ method: "GET", body: "" });
72:   });
73:
74:   it("refuses a name that resolves to a private address, on the addresses the connection would use", async () => {
75:     // `localhost` is a name, so this goes through the socket's DNS lookup (the rebinding path).
76:     const refused = await guardedFetch(privateHostAllowed([]))(`http://localhost:${port}/`, options).catch((e: unknown) => e);
77:     expect(privateAddressCause(refused)).toBeInstanceOf(PrivateAddressError);
78:     expect(String((refused as Error).message)).toMatch(/localhost is on a private or reserved address/);
79:     const res = await guardedFetch(privateHostAllowed(["localhost"]))(`http://localhost:${port}/`, { ...options, method: "POST", body: new URLSearchParams({ code: "abc" }) }).catch(
80:       // On a machine where localhost resolves to ::1 only, the server (on 127.0.0.1) is not there.
81:       (e: unknown) => e,
82:     );
83:     if (res instanceof Response) expect(await res.json()).toEqual({ method: "POST", body: "code=abc" });
84:     else expect(privateAddressCause(res)).toBeUndefined();
85:   });
86:
87:   it("refuses a response larger than an identity provider needs", async () => {
88:     const err = await guardedFetch(privateHostAllowed(["127.0.0.1"]))(`http://127.0.0.1:${port}/huge`, options).catch((e: unknown) => e);
89:     expect(String((err as Error).message)).toMatch(/exceeds 1048576 bytes/);
90:   });
91: });

FILE apps/server/test/mock-idp.ts SHA256 8feff328a439efe53100dff2a7c0ee18cf537824383efd1af503cdec87d855c6
1: /**
2:  * A minimal OpenID Connect provider for tests: discovery, JWKS, an
3:  * authorization endpoint that signs in whoever the test chose, and a token
4:  * endpoint that checks the code, redirect URI, client secret and PKCE
5:  * verifier before issuing an RS256-signed ID token.
6:  */
7: import { createHash, generateKeyPairSync, randomBytes, sign } from "node:crypto";
8: import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
9: import type { AddressInfo } from "node:net";
10:
11: export interface IdpUser {
12:   sub: string;
13:   email?: string;
14:   email_verified?: boolean;
15:   name?: string;
16: }
17:
18: const b64 = (v: string | Buffer) => Buffer.from(v).toString("base64url");
19:
20: export async function startMockIdp(clientId = "visua-test", clientSecret = "test-secret-value") {
21:   const { publicKey, privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
22:   const jwk = { ...publicKey.export({ format: "jwk" }), kid: "test-key", alg: "RS256", use: "sig" };
23:   const codes = new Map<string, { user: IdpUser; nonce: string; challenge: string; redirect: string }>();
24:   let next: IdpUser | undefined;
25:   let issuer = "";
26:
27:   const send = (res: ServerResponse, status: number, body: unknown) => {
28:     res.writeHead(status, { "content-type": "application/json" });
29:     res.end(JSON.stringify(body));
30:   };
31:   const read = (req: IncomingMessage) =>
32:     new Promise<string>((resolve) => {
33:       let data = "";
34:       req.on("data", (c: Buffer) => (data += c.toString()));
35:       req.on("end", () => resolve(data));
36:     });
37:   const jwt = (claims: Record<string, unknown>) => {
38:     const head = b64(JSON.stringify({ alg: "RS256", kid: "test-key", typ: "JWT" }));
39:     const body = b64(JSON.stringify(claims));
40:     return `${head}.${body}.${sign("RSA-SHA256", Buffer.from(`${head}.${body}`), privateKey).toString("base64url")}`;
41:   };
42:
43:   const server = createServer(async (req, res) => {
44:     const url = new URL(req.url ?? "/", issuer);
45:     if (url.pathname === "/.well-known/openid-configuration") {
46:       return send(res, 200, {
47:         issuer,
48:         authorization_endpoint: `${issuer}/authorize`,
49:         token_endpoint: `${issuer}/token`,
50:         jwks_uri: `${issuer}/jwks`,
51:         response_types_supported: ["code"],
52:         subject_types_supported: ["public"],
53:         id_token_signing_alg_values_supported: ["RS256"],
54:         code_challenge_methods_supported: ["S256"],
55:         token_endpoint_auth_methods_supported: ["client_secret_post"],
56:         scopes_supported: ["openid", "email", "profile"],
57:       });
58:     }
59:     if (url.pathname === "/jwks") return send(res, 200, { keys: [jwk] });
60:     if (url.pathname === "/authorize") {
61:       const p = url.searchParams;
62:       if (p.get("client_id") !== clientId || p.get("response_type") !== "code" || p.get("code_challenge_method") !== "S256") return send(res, 400, { error: "invalid_request" });
63:       if (!next) return send(res, 400, { error: "no user chosen by the test" });
64:       const code = randomBytes(16).toString("hex");
65:       codes.set(code, { user: next, nonce: p.get("nonce") ?? "", challenge: p.get("code_challenge") ?? "", redirect: p.get("redirect_uri") ?? "" });
66:       res.writeHead(302, { location: `${p.get("redirect_uri")}?code=${code}&state=${encodeURIComponent(p.get("state") ?? "")}` });
67:       return res.end();
68:     }
69:     if (url.pathname === "/token" && req.method === "POST") {
70:       const form = new URLSearchParams(await read(req));
71:       const entry = codes.get(form.get("code") ?? "");
72:       codes.delete(form.get("code") ?? "");
73:       if (!entry) return send(res, 400, { error: "invalid_grant" });
74:       if (form.get("client_id") !== clientId || form.get("client_secret") !== clientSecret) return send(res, 401, { error: "invalid_client" });
75:       if (form.get("redirect_uri") !== entry.redirect) return send(res, 400, { error: "invalid_grant", error_description: "redirect_uri mismatch" });
76:       const verifier = form.get("code_verifier") ?? "";
77:       if (createHash("sha256").update(verifier).digest("base64url") !== entry.challenge) return send(res, 400, { error: "invalid_grant", error_description: "PKCE verification failed" });
78:       const now = Math.floor(Date.now() / 1000);
79:       return send(res, 200, {
80:         access_token: randomBytes(16).toString("hex"),
81:         token_type: "Bearer",
82:         expires_in: 300,
83:         id_token: jwt({ iss: issuer, aud: clientId, iat: now, exp: now + 300, nonce: entry.nonce, ...entry.user }),
84:       });
85:     }
86:     send(res, 404, { error: "not_found" });
87:   });
88:   await new Promise<void>((r) => server.listen(0, "127.0.0.1", () => r()));
89:   issuer = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
90:
91:   return {
92:     issuer,
93:     clientId,
94:     clientSecret,
95:     /** The identity the next authorization request signs in. */
96:     signInAs(user: IdpUser | undefined) {
97:       next = user;
98:     },
99:     /** Follow the authorization redirect like a browser would; returns the callback path + query. */
100:     async authorize(location: string): Promise<string> {
101:       const res = await fetch(location, { redirect: "manual" });
102:       const to = res.headers.get("location");
103:       if (!to) throw new Error(`The mock IdP refused: ${res.status} ${await res.text()}`);
104:       const u = new URL(to);
105:       return `${u.pathname}${u.search}`;
106:     },
107:     close: () => new Promise<void>((r) => server.close(() => r())),
108:   };
109: }

FILE apps/server/test/relay.test.ts SHA256 b5453258e87ecf1c95a3166384fc96279733f2bab5479efdea24c26eac1e1efc
1: /**
2:  * The Postgres live-event relay, with a fake `pg` client: it must keep
3:  * reconnecting after failed attempts, and keep NOTIFY payloads under Postgres's
4:  * 8,000-byte limit however many bytes each character takes.
5:  */
6: import { EventEmitter } from "node:events";
7: import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
8:
9: const clients: FakeClient[] = [];
10: let failConnects = 0;
11:
12: class FakeClient extends EventEmitter {
13:   listening = false;
14:   ended = false;
15:   constructor() {
16:     super();
17:     clients.push(this);
18:   }
19:   async connect() {
20:     if (failConnects > 0) {
21:       failConnects--;
22:       throw new Error("connect ECONNREFUSED");
23:     }
24:   }
25:   async query(sql: string) {
26:     if (sql.startsWith("LISTEN")) this.listening = true;
27:   }
28:   async end() {
29:     this.ended = true;
30:   }
31:   /** The server drops the connection. */
32:   drop() {
33:     this.listening = false;
34:     this.emit("error", new Error("terminating connection due to administrator command"));
35:     this.emit("end");
36:   }
37: }
38:
39: vi.mock("pg", () => ({ default: { Client: FakeClient } }));
40:
41: const { PgEventRelay, compactEvent } = await import("../src/storage/events.ts");
42: const { EventBus } = await import("../src/bus.ts");
43:
44: const fakeStore = () => ({
45:   driver: { query: async () => [{ schema: "public" }], execute: async () => undefined },
46:   onClose: () => undefined,
47: });
48:
49: describe("Postgres event relay", () => {
50:   beforeEach(() => {
51:     clients.length = 0;
52:     failConnects = 0;
53:     vi.useFakeTimers();
54:     vi.spyOn(console, "error").mockImplementation(() => undefined);
55:   });
56:   afterEach(() => {
57:     vi.useRealTimers();
58:     vi.restoreAllMocks();
59:   });
60:
61:   it("keeps reconnecting, with backoff, while the database is unreachable", async () => {
62:     const relay = await PgEventRelay.start("postgres://fake", new EventBus(), fakeStore() as never);
63:     expect(clients).toHaveLength(1);
64:     expect(clients[0]!.listening).toBe(true);
65:     // The database goes away for a while: the first two attempts fail.
66:     failConnects = 2;
67:     clients[0]!.drop();
68:     await vi.advanceTimersByTimeAsync(1_000);
69:     expect(clients).toHaveLength(2);
70:     await vi.advanceTimersByTimeAsync(2_000);
71:     expect(clients).toHaveLength(3);
72:     await vi.advanceTimersByTimeAsync(4_000);
73:     expect(clients).toHaveLength(4);
74:     expect(clients[3]!.listening).toBe(true);
75:     // Connected again: a later drop starts over from a short delay.
76:     clients[3]!.drop();
77:     await vi.advanceTimersByTimeAsync(1_000);
78:     expect(clients).toHaveLength(5);
79:     expect(clients[4]!.listening).toBe(true);
80:     await relay.close();
81:     expect(clients[4]!.ended).toBe(true);
82:     // Closed: no more attempts.
83:     await vi.advanceTimersByTimeAsync(60_000);
84:     expect(clients).toHaveLength(5);
85:   });
86:
87:   it("fails fast at startup when the database is unreachable, without retrying in the background", async () => {
88:     failConnects = 1;
89:     await expect(PgEventRelay.start("postgres://fake", new EventBus(), fakeStore() as never)).rejects.toThrow(/ECONNREFUSED/);
90:     await vi.advanceTimersByTimeAsync(60_000);
91:     expect(clients).toHaveLength(1);
92:   });
93:
94:   it("sizes NOTIFY payloads in bytes, so text with multibyte characters is compacted", () => {
95:     // 3,000 “ characters are 3,000 UTF-16 units but 9,000 UTF-8 bytes.
96:     const summary = "“".repeat(3_000);
97:     const event = { type: "activity" as const, workspaceId: "ws_1", at: "2026-09-26T00:00:00Z", data: { id: "act_1", summary: "short", detail: summary } };
98:     const compacted = compactEvent(event);
99:     expect(compacted.partial).toBe(true);
100:     expect(Buffer.byteLength(JSON.stringify(compacted), "utf8")).toBeLessThan(8_000);
101:     const small = { ...event, data: { id: "act_2", summary: "“quoted”" } };
102:     expect(compactEvent(small)).toBe(small);
103:   });
104: });

FILE apps/server/test/sso-recheck.test.ts SHA256 c1a175cc85596ab39c38f33a71fa17e62abc995ec59bc1fe6f7cd4e1ca91c657
1: import { afterAll, beforeAll, describe, expect, it } from "vitest";
2: import { FrameworkRegistry } from "@visua/frameworks";
3: import { createApp } from "../src/app.ts";
4: import { loadAuthConfig } from "../src/auth/config.ts";
5: import { AuthService } from "../src/auth/service.ts";
6: import { createService } from "../src/context.ts";
7: import { TestClient } from "./client.ts";
8: import { TEST_PG_URL, testDatabase } from "./db.ts";
9: import { startMockIdp } from "./mock-idp.ts";
10:
11: process.env["VISUA_AGENT_MODE"] = "offline";
12:
13: const registry = FrameworkRegistry.load();
14: const db = await testDatabase("recheck");
15: const svc = await createService({ database: db.url, registry });
16: const idp = await startMockIdp();
17: const txt = new Map<string, string[]>();
18: const failing = new Map<string, string>(); // name → error code to throw
19: const lookups: string[] = [];
20: const resolveTxt = async (name: string) => {
21:   lookups.push(name);
22:   const code = failing.get(name);
23:   if (code) throw Object.assign(new Error(`queryTxt ${code} ${name}`), { code });
24:   const values = txt.get(name);
25:   if (!values) throw Object.assign(new Error(`queryTxt ENOTFOUND ${name}`), { code: "ENOTFOUND" });
26:   return values.map((v) => [v]);
27: };
28: const config = {
29:   ...loadAuthConfig({}),
30:   mode: "dev" as const,
31:   allowHttpIssuers: true,
32:   privateIssuerHosts: [new URL(idp.issuer).hostname],
33:   platform: { issuer: idp.issuer, clientId: idp.clientId, clientSecret: idp.clientSecret, name: "Test IdP" },
34: };
35: const auth = new AuthService(svc, config, { resolveTxt });
36: const app = createApp(svc, auth);
37:
38: afterAll(async () => {
39:   await idp.close();
40:   await svc.store.close();
41:   await db.cleanup();
42: });
43:
44: const DAY = 86_400_000;
45: type Me = { user: { id: string; email: string }; activeTenant: { id: string; role: string } | null };
46: type DomainStatus = { domain: string; verified: boolean; standing: string; lapsesAt?: string; takenOver: boolean; record?: { name: string; value: string } };
47: type ConnectionJson = { id: string; domainStatus: DomainStatus[] };
48:
49: async function signIn(email: string) {
50:   const c = new TestClient(app);
51:   expect((await c.devLogin(email)).status).toBe(200);
52:   return c;
53: }
54: async function oidcSignIn(connection: string, user: { sub: string; email: string }) {
55:   const c = new TestClient(app);
56:   idp.signInAs({ ...user, email_verified: true });
57:   const start = await c.get(`/api/auth/oidc/start?connection=${connection}&returnTo=%2F`);
58:   const done = await c.get(await idp.authorize(start.headers.get("location")!));
59:   const me = await c.get<Me & { csrf: string }>("/api/auth/me");
60:   if (me.json) c.csrf = me.json.csrf;
61:   return { client: c, redirect: done.headers.get("location")!, me };
62: }
63: /** An organization with one SSO connection whose domain is proven by DNS. */
64: async function provenOrg(owner: string, domain: string) {
65:   const client = await signIn(owner);
66:   const tenant = (await client.get<Me>("/api/auth/me")).json.activeTenant!.id;
67:   const created = await client.post<ConnectionJson>(`/api/tenants/${tenant}/sso`, { name: `${domain} SSO`, issuer: idp.issuer, clientId: idp.clientId, clientSecret: idp.clientSecret, domains: [domain], jitProvisioning: true });
68:   expect(created.status).toBe(201);
69:   const record = created.json.domainStatus[0]!.record!;
70:   txt.set(record.name, [record.value]);
71:   const verified = await client.post<ConnectionJson>(`/api/tenants/${tenant}/sso/${created.json.id}/domains/${domain}/verify`);
72:   expect(verified.status).toBe(200);
73:   return { client, tenant, connection: verified.json, record };
74: }
75: const status = async (client: TestClient, tenant: string, id: string) =>
76:   (await client.get<{ connections: ConnectionJson[] }>(`/api/tenants/${tenant}/sso`)).json.connections.find((c) => c.id === id)!.domainStatus[0]!;
77: const trail = async (client: TestClient, tenant: string) => (await client.get<{ action: string; actor: string; summary: string }[]>(`/api/tenants/${tenant}/activity`)).json;
78: /** Run every re-check due at `at` (the ticker does this every 10 minutes). */
79: async function recheckAll(at: Date, via = auth) {
80:   let n = 0;
81:   while ((n = await via.recheckDueDomains(at)) > 0);
82: }
83:
84: describe("re-checking SSO domains proven by DNS", () => {
85:   it("looks a proven domain up again after a day and keeps it verified while the record is there", async () => {
86:     const { client, tenant, connection, record } = await provenOrg("pat@found.example", "found-sso.example");
87:     lookups.length = 0;
88:     await recheckAll(new Date(Date.now() + DAY / 2));
89:     expect(lookups).not.toContain(record.name);
90:     await recheckAll(new Date(Date.now() + DAY + 60_000));
91:     expect(lookups.filter((n) => n === record.name)).toHaveLength(1);
92:     expect(await status(client, tenant, connection.id)).toMatchObject({ standing: "verified", verified: true });
93:   });
94:
95:   it("marks a missing record failing, lapses it after the grace period, and keeps members signing in", async () => {
96:     const { client, tenant, connection, record } = await provenOrg("quinn@lapse.example", "lapse-sso.example");
97:     const member = await oidcSignIn(connection.id, { sub: "okta|rhea", email: "rhea@lapse-sso.example" });
98:     expect(member.me.json?.user.email).toBe("rhea@lapse-sso.example");
99:     txt.delete(record.name);
100:     const t = Date.now();
101:     await recheckAll(new Date(t + DAY + 60_000));
102:     const failingNow = await status(client, tenant, connection.id);
103:     expect(failingNow).toMatchObject({ standing: "failing", verified: true });
104:     expect(Date.parse(failingNow.lapsesAt!)).toBeCloseTo(t + 8 * DAY + 60_000, -5);
105:     expect((await trail(client, tenant)).some((e) => e.action === "failing" && e.actor === "Domain re-check" && e.summary.includes("lapse-sso.example"))).toBe(true);
106:     // Still failing, still admitting, still routing.
107:     expect((await new TestClient(app).post<{ connection: string }>("/api/auth/sso/discover", { email: "new@lapse-sso.example" })).json.connection).toBe(connection.id);
108:     for (let d = 2; d <= 8; d++) await recheckAll(new Date(t + d * DAY + 120_000));
109:     expect(await status(client, tenant, connection.id)).toMatchObject({ standing: "lapsed", verified: false, takenOver: false });
110:     expect((await trail(client, tenant)).some((e) => e.action === "lapsed" && e.summary.includes("lapse-sso.example"))).toBe(true);
111:     // Lapsed: a new person is refused, a linked member still gets in, and the domain still routes.
112:     const stranger = await oidcSignIn(connection.id, { sub: "okta|sam", email: "sam@lapse-sso.example" });
113:     expect(decodeURIComponent(stranger.redirect)).toContain("no longer admits new people from lapse-sso.example: its DNS proof has lapsed");
114:     expect(stranger.me.json?.user).toBeUndefined();
115:     const again = await oidcSignIn(connection.id, { sub: "okta|rhea", email: "rhea@lapse-sso.example" });
116:     expect(again.me.json?.user.email).toBe("rhea@lapse-sso.example");
117:     expect((await new TestClient(app).post<{ connection: string }>("/api/auth/sso/discover", { email: "rhea@lapse-sso.example" })).json.connection).toBe(connection.id);
118:     // The record comes back: the next re-check recovers the domain.
119:     txt.set(record.name, [record.value]);
120:     await recheckAll(new Date(t + 10 * DAY));
121:     expect(await status(client, tenant, connection.id)).toMatchObject({ standing: "verified", verified: true });
122:     expect((await trail(client, tenant)).some((e) => e.action === "recovered")).toBe(true);
123:   });
124:
125:   it("never counts DNS trouble against a domain", async () => {
126:     const { client, tenant, connection, record } = await provenOrg("ravi@flaky.example", "flaky-sso.example");
127:     failing.set(record.name, "ETIMEOUT");
128:     const t = Date.now();
129:     for (let h = 24; h <= 24 * 10; h += 1) await recheckAll(new Date(t + h * 3_600_000 + 60_000));
130:     expect(await status(client, tenant, connection.id)).toMatchObject({ standing: "verified" });
131:     expect((await trail(client, tenant)).some((e) => e.action === "failing")).toBe(false);
132:     failing.delete(record.name);
133:   });
134:
135:   it("keeps a Require-SSO organization signing in after its domain lapses, and lets its owner verify again", async () => {
136:     // The owner's address is in the SSO domain, so their first SSO sign-in links to their account.
137:     const { client, tenant, connection, record } = await provenOrg("sara@strict-sso.example", "strict-sso.example");
138:     const first = await oidcSignIn(connection.id, { sub: "okta|sara", email: "sara@strict-sso.example" });
139:     expect(first.me.json?.user.email).toBe("sara@strict-sso.example");
140:     expect((await client.patch(`/api/tenants/${tenant}`, { settings: { requireSso: true } })).status).toBe(200);
141:     txt.delete(record.name);
142:     const t = Date.now();
143:     for (let d = 1; d <= 9; d++) await recheckAll(new Date(t + d * DAY + 60_000));
144:     // The owner signs in the normal way: discovery still sends the domain to the connection.
145:     const found = await new TestClient(app).post<{ connection: string }>("/api/auth/sso/discover", { email: "sara@strict-sso.example" });
146:     expect(found.json.connection).toBe(connection.id);
147:     const owner = await oidcSignIn(found.json.connection, { sub: "okta|sara", email: "sara@strict-sso.example" });
148:     expect(owner.me.json?.activeTenant?.id).toBe(tenant);
149:     expect(await status(owner.client, tenant, connection.id)).toMatchObject({ standing: "lapsed" });
150:     // With "Require SSO" on, only that SSO session can manage the organization: it restores the record and verifies again.
151:     txt.set(record.name, [record.value]);
152:     const verified = await owner.client.post<ConnectionJson>(`/api/tenants/${tenant}/sso/${connection.id}/domains/strict-sso.example/verify`);
153:     expect(verified.status).toBe(200);
154:     expect(verified.json.domainStatus[0]).toMatchObject({ standing: "verified" });
155:   });
156:
157:   it("lets another organization prove a lapsed domain, and never gives it back", async () => {
158:     const old = await provenOrg("uri@old-owner.example", "moved-sso.example");
159:     txt.delete(old.record.name);
160:     const t = Date.now();
161:     for (let d = 1; d <= 9; d++) await recheckAll(new Date(t + d * DAY + 60_000));
162:     expect(await status(old.client, old.tenant, old.connection.id)).toMatchObject({ standing: "lapsed", takenOver: false });
163:     const fresh = await provenOrg("vera@new-owner.example", "moved-sso.example");
164:     // Taken over as soon as the other organization proves it, without waiting for a re-check.
165:     expect(await status(old.client, old.tenant, old.connection.id)).toMatchObject({ standing: "lapsed", takenOver: true });
166:     expect((await new TestClient(app).post<{ connection: string }>("/api/auth/sso/discover", { email: "x@moved-sso.example" })).json.connection).toBe(fresh.connection.id);
167:     // The old record reappears: the old connection is not looked up again and stays lapsed.
168:     txt.set(old.record.name, [old.record.value]);
169:     lookups.length = 0;
170:     for (let d = 10; d <= 12; d++) await recheckAll(new Date(t + d * DAY + 60_000));
171:     // Both connections share the record name (it depends on the domain only): the three lookups
172:     // are the new holder's daily re-checks, one per tick; none is the old connection's.
173:     expect(lookups.filter((n) => n === old.record.name)).toHaveLength(3);
174:     expect(await status(old.client, old.tenant, old.connection.id)).toMatchObject({ standing: "lapsed", takenOver: true });
175:     // Restoring the old record cannot take it back while the other organization holds it.
176:     expect((await old.client.post(`/api/tenants/${old.tenant}/sso/${old.connection.id}/domains/moved-sso.example/verify`)).status).toBe(400);
177:   });
178:
179:   it("gives a taken-over domain back to its old organization once the new holder removes its connection", async () => {
180:     const old = await provenOrg("abe@first-holder.example", "handback-sso.example");
181:     txt.delete(old.record.name);
182:     const t = Date.now();
183:     for (let d = 1; d <= 9; d++) await recheckAll(new Date(t + d * DAY + 60_000));
184:     const fresh = await provenOrg("bea@second-holder.example", "handback-sso.example");
185:     expect(await status(old.client, old.tenant, old.connection.id)).toMatchObject({ standing: "lapsed", takenOver: true });
186:     for (let d = 10; d <= 11; d++) await recheckAll(new Date(t + d * DAY + 60_000));
187:     expect((await fresh.client.request("DELETE", `/api/tenants/${fresh.tenant}/sso/${fresh.connection.id}`)).status).toBe(204);
188:     expect(await status(old.client, old.tenant, old.connection.id)).toMatchObject({ standing: "lapsed", takenOver: false });
189:     // The old record is back: a later re-check recovers the old organization's domain.
190:     txt.set(old.record.name, [old.record.value]);
191:     for (let d = 12; d <= 14; d++) await recheckAll(new Date(t + d * DAY + 60_000));
192:     expect(await status(old.client, old.tenant, old.connection.id)).toMatchObject({ standing: "verified", verified: true, takenOver: false });
193:     expect((await trail(old.client, old.tenant)).some((e) => e.action === "recovered" && e.summary.includes("handback-sso.example"))).toBe(true);
194:   });
195:
196:   it("tells the organization page how often domains are re-checked", async () => {
197:     const { client, tenant } = await provenOrg("cy@schedule.example", "schedule-sso.example");
198:     const on = await client.get<{ domainRechecks: unknown }>(`/api/tenants/${tenant}/sso`);
199:     expect(on.json.domainRechecks).toEqual({ enabled: true, everyHours: 24 });
200:     const offApp = createApp(svc, new AuthService(svc, { ...config, domainRecheckHours: 0 }, { resolveTxt }));
201:     const offClient = new TestClient(offApp);
202:     await offClient.devLogin("cy@schedule.example");
203:     const off = await offClient.get<{ domainRechecks: unknown }>(`/api/tenants/${tenant}/sso`);
204:     expect(off.json.domainRechecks).toEqual({ enabled: false, everyHours: 0 });
205:   });
206:
207:   it("never looks up domains that were not proven by DNS, nor anything when re-checks are off", async () => {
208:     const trusting = new AuthService(svc, { ...config, ssoDomainVerification: "off" }, { resolveTxt });
209:     expect(trusting.domainRechecksEnabled).toBe(false);
210:     const off = new AuthService(svc, { ...config, domainRecheckHours: 0 }, { resolveTxt });
211:     expect(off.domainRechecksEnabled).toBe(false);
212:     expect(await off.recheckDueDomains(new Date(Date.now() + 30 * DAY))).toBe(0);
213:     const client = new TestClient(createApp(svc, trusting));
214:     await client.devLogin("wes@trusted.example");
215:     const t = (await client.get<Me>("/api/auth/me")).json.activeTenant!.id;
216:     await client.post(`/api/tenants/${t}/sso`, { name: "Trusted", issuer: idp.issuer, clientId: idp.clientId, clientSecret: idp.clientSecret, domains: ["trusted-sso.example"] });
217:     lookups.length = 0;
218:     await recheckAll(new Date(Date.now() + 30 * DAY));
219:     expect(lookups).not.toContain("_visua-challenge.trusted-sso.example");
220:   });
221:
222:   it("looks each due domain up once when two instances tick together", async () => {
223:     const { record } = await provenOrg("xia@race.example", "race-sso.example");
224:     // On Postgres, a second service is a second instance with its own connections.
225:     const otherSvc = TEST_PG_URL ? await createService({ database: db.url, registry }) : svc;
226:     const other = new AuthService(otherSvc, config, { resolveTxt });
227:     try {
228:       lookups.length = 0;
229:       const at = new Date(Date.now() + DAY + 60_000);
230:       await Promise.all([recheckAll(at), recheckAll(at, other)]);
231:       expect(lookups.filter((n) => n === record.name)).toHaveLength(1);
232:     } finally {
233:       if (otherSvc !== svc) await otherSvc.store.close();
234:     }
235:   });
236:
237:   it.skipIf(!TEST_PG_URL)("removes a connection only under the domain lock, so a re-check in flight cannot bring it back", async () => {
238:     const { client, tenant, connection } = await provenOrg("zoe@delete.example", "delete-sso.example");
239:     // A second instance holds the domain lock, as a re-check does between reading a connection and writing it back.
240:     const otherSvc = await createService({ database: db.url, registry });
241:     let release!: () => void;
242:     const released = new Promise<void>((resolve) => (release = resolve));
243:     let locked!: () => void;
244:     const lockHeld = new Promise<void>((resolve) => (locked = resolve));
245:     const holder = otherSvc.store.atomic(async () => {
246:       await otherSvc.store.lock("sso-domains");
247:       locked();
248:       await released;
249:     });
250:     try {
251:       await lockHeld;
252:       let settled = false;
253:       const deletion = client.request("DELETE", `/api/tenants/${tenant}/sso/${connection.id}`).finally(() => (settled = true));
254:       await new Promise((resolve) => setTimeout(resolve, 300));
255:       expect(settled).toBe(false);
256:       release();
257:       await holder;
258:       expect((await deletion).status).toBe(204);
259:       const left = (await client.get<{ connections: ConnectionJson[] }>(`/api/tenants/${tenant}/sso`)).json.connections;
260:       expect(left.some((c) => c.id === connection.id)).toBe(false);
261:     } finally {
262:       release();
263:       await holder.catch(() => undefined);
264:       await otherSvc.store.close();
265:     }
266:   });
267:
268:   it("drops a result when the challenge changed meanwhile", async () => {
269:     const { client, tenant, connection, record } = await provenOrg("yan@edit.example", "edit-sso.example");
270:     txt.delete(record.name);
271:     // While the lookup is in flight, the admin removes the domain and lists it again (a new challenge).
272:     let edit: Promise<unknown> | undefined;
273:     const slow = new AuthService(svc, config, {
274:       resolveTxt: async (name) => {
275:         if (name === record.name && !edit) {
276:           edit = (async () => {
277:             await client.patch(`/api/tenants/${tenant}/sso/${connection.id}`, { domains: ["edit-two.example"] });
278:             await client.patch(`/api/tenants/${tenant}/sso/${connection.id}`, { domains: ["edit-two.example", "edit-sso.example"] });
279:           })();
280:           await edit;
281:         }
282:         return resolveTxt(name);
283:       },
284:     });
285:     await recheckAll(new Date(Date.now() + DAY + 60_000), slow);
286:     const now = (await client.get<{ connections: ConnectionJson[] }>(`/api/tenants/${tenant}/sso`)).json.connections.find((c) => c.id === connection.id)!;
287:     expect(now.domainStatus.find((d) => d.domain === "edit-sso.example")).toMatchObject({ standing: "pending" });
288:     expect((await trail(client, tenant)).some((e) => e.action === "failing")).toBe(false);
289:   });
290: });

FILE apps/server/test/storage.test.ts SHA256 5b7061298be7937abecc54f16afb639a3a255da3c7575123ce3e44243a17dc28
1: import { mkdtempSync, rmSync } from "node:fs";
2: import { tmpdir } from "node:os";
3: import { join } from "node:path";
4: import { DatabaseSync } from "node:sqlite";
5: import { afterAll, beforeAll, describe, expect, it } from "vitest";
6: import type { ActivityEvent, OrganizationProfile, Workspace } from "@visua/core";
7: import { FrameworkRegistry } from "@visua/frameworks";
8: import { createApp } from "../src/app.ts";
9: import { loadAuthConfig } from "../src/auth/config.ts";
10: import { AuthService } from "../src/auth/service.ts";
11: import { createService } from "../src/context.ts";
12: import { chainHash } from "../src/services/visua.ts";
13: import { toPostgresParams } from "../src/storage/driver.ts";
14: import { DEFAULT_TENANT_ID } from "../src/storage/index.ts";
15: import { MIGRATIONS } from "../src/storage/migrations.ts";
16: import { PostgresDriver } from "../src/storage/postgres.ts";
17: import { SqliteDriver } from "../src/storage/sqlite.ts";
18: import { TestClient } from "./client.ts";
19: import { TEST_PG_URL, testDatabase } from "./db.ts";
20:
21: const registry = FrameworkRegistry.load();
22: const db = await testDatabase("store");
23: const svc = await createService({ database: db.url, registry });
24: const profile: OrganizationProfile = { industry: "saas", size: "11-50", dataTypes: [], drivers: [], environments: ["cloud"], maturityTier: 1, guidance: "guided", securityTeamSize: 1 };
25:
26: afterAll(async () => {
27:   await svc.store.close();
28:   await db.cleanup();
29: });
30:
31: describe(`storage (${db.dialect})`, () => {
32:   it("rewrites ? placeholders for Postgres outside string literals", () => {
33:     expect(toPostgresParams("SELECT * FROM t WHERE a = ? AND b = '?' AND c = ?")).toBe("SELECT * FROM t WHERE a = $1 AND b = '?' AND c = $2");
34:   });
35:
36:   it("rolls back a failed transaction, including events it would have published", async () => {
37:     const ws = await svc.createWorkspace({ name: "Rollback", profile, frameworks: ["nist-csf-2.0"] });
38:     const published: string[] = [];
39:     const off = svc.bus.subscribe(ws.id, (e) => published.push(e.type));
40:     await expect(
41:       svc.store.transaction(async () => {
42:         await svc.createTask(ws.id, { title: "Doomed task" });
43:         throw new Error("boom");
44:       }),
45:     ).rejects.toThrow("boom");
46:     off();
47:     expect((await svc.store.tasks.list(ws.id)).map((t) => t.title)).not.toContain("Doomed task");
48:     expect(published).toEqual([]);
49:     expect((await svc.verifyAuditTrail(ws.id)).valid).toBe(true);
50:   });
51:
52:   it("rolls back only the inner savepoint when a nested transaction fails", async () => {
53:     const ws = await svc.createWorkspace({ name: "Savepoint", profile, frameworks: ["nist-csf-2.0"] });
54:     await svc.store.transaction(async () => {
55:       await svc.createTask(ws.id, { title: "Kept" });
56:       await expect(
57:         svc.store.transaction(async () => {
58:           await svc.createTask(ws.id, { title: "Discarded" });
59:           throw new Error("inner");
60:         }),
61:       ).rejects.toThrow("inner");
62:     });
63:     const titles = (await svc.store.tasks.list(ws.id)).map((t) => t.title);
64:     expect(titles).toContain("Kept");
65:     expect(titles).not.toContain("Discarded");
66:     const trail = await svc.verifyAuditTrail(ws.id);
67:     expect(trail.valid).toBe(true);
68:   });
69:
70:   it("keeps the audit chain linear under concurrent writers", async () => {
71:     const ws = await svc.createWorkspace({ name: "Concurrency", profile, frameworks: ["nist-csf-2.0"] });
72:     // A second service instance on the same database stands in for a second server.
73:     const other = TEST_PG_URL ? await createService({ database: db.url, registry }) : svc;
74:     try {
75:       await Promise.all(
76:         Array.from({ length: 24 }, (_, i) => (i % 2 ? other : svc).createTask(ws.id, { title: `Parallel task ${i}` })),
77:       );
78:       const chain = await svc.store.activity.chain(ws.id);
79:       const seqs = chain.map((e) => e.seq);
80:       expect(new Set(seqs).size).toBe(chain.length);
81:       expect(seqs).toEqual(Array.from({ length: chain.length }, (_, i) => i + 1));
82:       expect((await svc.verifyAuditTrail(ws.id)).valid).toBe(true);
83:       expect((await svc.store.tasks.list(ws.id)).length).toBe(24);
84:     } finally {
85:       if (other !== svc) await other.store.close();
86:     }
87:   });
88:
89:   it("serializes read-modify-write changes to a workspace across instances", async () => {
90:     const ws = await svc.createWorkspace({ name: "Inventory race", profile, frameworks: ["nist-csf-2.0", "nist-ai-rmf"] });
91:     const other = TEST_PG_URL ? await createService({ database: db.url, registry }) : svc;
92:     try {
93:       await Promise.all(
94:         Array.from({ length: 10 }, (_, i) => (i % 2 ? other : svc).upsertAiSystem(ws.id, { name: `Model ${i}`, purpose: "Concurrency test system" })),
95:       );
96:       const settings = (await svc.workspace(ws.id)).frameworks.find((f) => f.frameworkId === "nist-ai-rmf");
97:       expect(settings?.ai?.systems.map((s) => s.name).sort()).toEqual(Array.from({ length: 10 }, (_, i) => `Model ${i}`).sort());
98:     } finally {
99:       if (other !== svc) await other.store.close();
100:     }
101:   });
102:
103:   it.skipIf(!TEST_PG_URL)("relays live events between instances through Postgres", async () => {
104:     const ws = await svc.createWorkspace({ name: "Relay", profile, frameworks: ["nist-csf-2.0"] });
105:     const other = await createService({ database: db.url, registry });
106:     try {
107:       const received = new Promise<string[]>((resolve) => {
108:         const types: string[] = [];
109:         const off = other.bus.subscribe(ws.id, (e) => {
110:           types.push(e.type);
111:           if (e.type === "task.created") {
112:             off();
113:             resolve(types);
114:           }
115:         });
116:       });
117:       await svc.createTask(ws.id, { title: "Seen elsewhere", description: "x".repeat(9_000) });
118:       const types = await Promise.race([received, new Promise<string[]>((_, reject) => setTimeout(() => reject(new Error("no relayed event")), 5_000))]);
119:       expect(types).toContain("task.created");
120:     } finally {
121:       await other.store.close();
122:     }
123:   });
124:
125:   it("invalidates cached scores when another instance changes the workspace", async () => {
126:     const ws = await svc.createWorkspace({ name: "Cache", profile, frameworks: ["nist-csf-2.0"] });
127:     const before = await svc.score(ws.id, "nist-csf-2.0");
128:     const other = TEST_PG_URL ? await createService({ database: db.url, registry }) : svc;
129:     try {
130:       await other.updateState(ws.id, "nist-csf-2.0:GV.OC-01", { current: 4, target: 4 });
131:       const after = await svc.score(ws.id, "nist-csf-2.0");
132:       expect(after.statuses.get("nist-csf-2.0:GV.OC-01")?.status).not.toBe(before.statuses.get("nist-csf-2.0:GV.OC-01")?.status);
133:     } finally {
134:       if (other !== svc) await other.store.close();
135:     }
136:   });
137: });
138:
139: describe("upgrading a SQLite database written before migrations", () => {
140:   const dir = mkdtempSync(join(tmpdir(), "visua-legacy-"));
141:   afterAll(() => rmSync(dir, { recursive: true, force: true }));
142:
143:   it("adds tenancy and chain columns and keeps the audit trail valid", async () => {
144:     const file = join(dir, "legacy.db");
145:     const legacy = new DatabaseSync(file);
146:     legacy.exec(`CREATE TABLE workspaces (id TEXT PRIMARY KEY, slug TEXT UNIQUE NOT NULL, data TEXT NOT NULL, updated_at TEXT NOT NULL);
147:       CREATE TABLE requirement_states (workspace_id TEXT NOT NULL, node_id TEXT NOT NULL, data TEXT NOT NULL, updated_at TEXT NOT NULL, PRIMARY KEY (workspace_id, node_id));
148:       CREATE TABLE activity (id TEXT PRIMARY KEY, workspace_id TEXT NOT NULL, data TEXT NOT NULL, updated_at TEXT NOT NULL);
149:       CREATE INDEX activity_ws ON activity(workspace_id, updated_at);`);
150:     const ts = new Date().toISOString();
151:     const ws: Workspace = { id: "ws_legacy", name: "Legacy", slug: "legacy", profile, frameworks: [], autonomy: {}, trustCenter: { enabled: false }, createdAt: ts, updatedAt: ts };
152:     legacy.prepare(`INSERT INTO workspaces VALUES (?, ?, ?, ?)`).run(ws.id, ws.slug, JSON.stringify(ws), ts);
153:     let prev = "0".repeat(64);
154:     for (let seq = 1; seq <= 3; seq++) {
155:       const body: ActivityEvent = { id: `act_${seq}`, workspaceId: ws.id, at: ts, actor: "user", action: "updated", entity: "workspace", entityId: ws.id, summary: `Legacy event ${seq}`, seq, prevHash: prev };
156:       const event = { ...body, hash: chainHash(prev, body) };
157:       prev = event.hash;
158:       legacy.prepare(`INSERT INTO activity VALUES (?, ?, ?, ?)`).run(event.id, ws.id, JSON.stringify(event), `${ts}#${String(seq).padStart(9, "0")}`);
159:     }
160:     legacy.close();
161:
162:     const upgraded = await createService({ database: file, registry });
163:     try {
164:       const got = await upgraded.workspace("legacy");
165:       expect(got.tenantId).toBe(DEFAULT_TENANT_ID);
166:       expect((await upgraded.store.identity.tenants.get(DEFAULT_TENANT_ID))?.name).toBe("Default organization");
167:       // Its first person claims it and can open the workspace (access checks read the organization's settings).
168:       const auth = new AuthService(upgraded, { ...loadAuthConfig({}), mode: "dev" });
169:       const client = new TestClient(createApp(upgraded, auth));
170:       expect((await client.devLogin("first@legacy.example")).json.activeTenant?.role).toBe("owner");
171:       expect((await client.get("/api/workspaces/legacy")).status).toBe(200);
172:       expect((await upgraded.store.activity.head(ws.id))?.seq).toBe(3);
173:       await upgraded.updateWorkspace(ws.id, { description: "Upgraded in place" });
174:       const trail = await upgraded.verifyAuditTrail(ws.id);
175:       expect(trail).toMatchObject({ valid: true, events: 4 });
176:     } finally {
177:       await upgraded.store.close();
178:     }
179:     // Opening again runs no migration twice.
180:     const again = await createService({ database: file, registry });
181:     expect((await again.workspace("legacy")).description).toBe("Upgraded in place");
182:     await again.store.close();
183:   });
184: });
185:
186: describe(`upgrading SSO domains to DNS verification (${db.dialect})`, () => {
187:   const dir = mkdtempSync(join(tmpdir(), "visua-sso-"));
188:   afterAll(() => rmSync(dir, { recursive: true, force: true }));
189:
190:   it("grandfathers every domain claimed before verification existed, and holds each domain verified once", async () => {
191:     const target = TEST_PG_URL ? await testDatabase("ssomig") : { url: join(dir, "sso.db"), cleanup: async () => undefined };
192:     const J = TEST_PG_URL ? "?::jsonb" : "?";
193:     const ts = new Date().toISOString();
194:     // A database at version 2, with a connection claiming a domain the old way.
195:     const old = TEST_PG_URL ? new PostgresDriver(target.url) : new SqliteDriver(target.url);
196:     await old.execute(`CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER PRIMARY KEY, name TEXT NOT NULL, applied_at TEXT NOT NULL)`);
197:     for (const m of MIGRATIONS.filter((m) => m.version < 3)) {
198:       await old.transaction(async (tx) => {
199:         await m.up(tx);
200:         await tx.execute(`INSERT INTO schema_migrations (version, name, applied_at) VALUES (?, ?, ?)`, [m.version, m.name, ts]);
201:       });
202:     }
203:     await old.execute(`INSERT INTO tenants (id, slug, data, created_at, updated_at) VALUES (?, ?, ${J}, ?, ?)`, ["tnt_legacy", "legacy", JSON.stringify({ id: "tnt_legacy", slug: "legacy", name: "Legacy", settings: {}, createdAt: ts, updatedAt: ts }), ts, ts]);
204:     const legacy = { id: "sso_legacy", tenantId: "tnt_legacy", name: "Legacy SSO", issuer: "https://login.legacy.example", clientId: "visua", domains: ["legacy-sso.example"], jitProvisioning: false, defaultRole: "viewer", enabled: true, createdAt: ts, updatedAt: ts };
205:     await old.execute(`INSERT INTO sso_connections (id, tenant_id, data, created_at, updated_at) VALUES (?, ?, ${J}, ?, ?)`, [legacy.id, legacy.tenantId, JSON.stringify(legacy), ts, ts]);
206:     await old.execute(`INSERT INTO sso_domains (domain, connection_id, tenant_id) VALUES (?, ?, ?)`, ["legacy-sso.example", legacy.id, legacy.tenantId]);
207:     await old.close();
208:
209:     const upgraded = await createService({ database: target.url, registry });
210:     try {
211:       // Still routes: nobody is locked out by the upgrade.
212:       expect((await upgraded.store.identity.sso.byDomain("legacy-sso.example"))?.id).toBe("sso_legacy");
213:       expect((await upgraded.store.identity.sso.get("sso_legacy"))?.verification?.["legacy-sso.example"]).toMatchObject({
214:         method: "grandfathered",
215:         verifiedAt: expect.any(String),
216:         token: expect.stringMatching(/^[0-9a-f]{32}$/),
217:       });
218:       // The database itself refuses a second verified claim on the domain.
219:       const rival = { ...legacy, id: "sso_rival", verification: { "legacy-sso.example": { token: "0".repeat(32), verifiedAt: ts, method: "dns" as const } } };
220:       await expect(upgraded.store.identity.sso.put({ ...rival, defaultRole: "viewer" })).rejects.toThrow();
221:       // A pending claim beside it is fine.
222:       await upgraded.store.identity.sso.put({ ...rival, defaultRole: "viewer", verification: { "legacy-sso.example": { token: "0".repeat(32) } } });
223:       expect((await upgraded.store.identity.sso.claimants("legacy-sso.example")).map((c) => [c.connectionId, c.verified]).sort()).toEqual([
224:         ["sso_legacy", true],
225:         ["sso_rival", false],
226:       ]);
227:     } finally {
228:       await upgraded.store.close();
229:       await target.cleanup();
230:     }
231:   });
232: });
233:
234: describe(`SSO domain re-check columns (${db.dialect})`, () => {
235:   const dir = mkdtempSync(join(tmpdir(), "visua-recheck-"));
236:   afterAll(() => rmSync(dir, { recursive: true, force: true }));
237:   // Nothing else in this file gives the shared `svc` a tenant row for DEFAULT_TENANT_ID (it is only
238:   // created by migration 1 when upgrading a database that has orphaned, pre-tenancy workspaces); the
239:   // sso_connections FK needs the row to exist before these tests can save a connection under it.
240:   beforeAll(async () => {
241:     if (await svc.store.identity.tenants.get(DEFAULT_TENANT_ID)) return;
242:     const ts = new Date().toISOString();
243:     await svc.store.identity.tenants.put({ id: DEFAULT_TENANT_ID, slug: "default", name: "Default organization", settings: {}, createdAt: ts, updatedAt: ts });
244:   });
245:   const ts = "2026-09-01T00:00:00.000Z";
246:   const base = { tenantId: DEFAULT_TENANT_ID, issuer: "https://login.example", clientId: "visua", jitProvisioning: false, defaultRole: "viewer" as const, enabled: true, createdAt: ts, updatedAt: ts };
247:
248:   it("keeps the schedule and a lapse in the domain rows when a connection is saved again", async () => {
249:     const sso = svc.store.identity.sso;
250:     await sso.put({ ...base, id: "sso_cols", name: "Cols", domains: ["cols.example"], verification: { "cols.example": { token: "a".repeat(32), verifiedAt: ts, method: "dns", nextCheckAt: "2026-09-02T00:00:00.000Z" } } });
251:     expect(await sso.dueForRecheck("2026-09-02T00:00:00.000Z", 25)).toContainEqual({ connectionId: "sso_cols", domain: "cols.example" });
252:     expect(await sso.dueForRecheck("2026-09-01T23:59:59.000Z", 25)).not.toContainEqual({ connectionId: "sso_cols", domain: "cols.example" });
253:     // An unrelated edit (rename) rewrites the rows: the schedule must survive.
254:     const c = (await sso.get("sso_cols"))!;
255:     await sso.put({ ...c, name: "Renamed" });
256:     expect(await sso.dueForRecheck("2026-09-02T00:00:00.000Z", 25)).toContainEqual({ connectionId: "sso_cols", domain: "cols.example" });
257:     await sso.delete(DEFAULT_TENANT_ID, "sso_cols");
258:   });
259:
260:   it("routes a lapsed domain to its connection until another connection proves it", async () => {
261:     const sso = svc.store.identity.sso;
262:     const lapsed = { token: "b".repeat(32), method: "dns" as const, lapsedAt: "2026-09-10T00:00:00.000Z", nextCheckAt: "2026-09-11T00:00:00.000Z" };
263:     await sso.put({ ...base, id: "sso_old", name: "Old", domains: ["lapse.example"], verification: { "lapse.example": lapsed } });
264:     expect((await sso.byDomain("lapse.example"))?.id).toBe("sso_old");
265:     expect(await sso.domainOwner("lapse.example")).toBeUndefined();
266:     // Another connection may now prove it (the verified unique index does not see a lapsed row)...
267:     await sso.put({ ...base, id: "sso_new", name: "New", domains: ["lapse.example"], verification: { "lapse.example": { token: "c".repeat(32), verifiedAt: ts, method: "dns" } } });
268:     // ...and then routing moves to it.
269:     expect((await sso.byDomain("lapse.example"))?.id).toBe("sso_new");
270:     await sso.delete(DEFAULT_TENANT_ID, "sso_old");
271:     await sso.delete(DEFAULT_TENANT_ID, "sso_new");
272:   });
273:
274:   it("schedules the first re-check of every DNS-verified domain within a day when upgrading", async () => {
275:     const target = TEST_PG_URL ? await testDatabase("recheckmig") : { url: join(dir, "recheck.db"), cleanup: async () => undefined };
276:     const J = TEST_PG_URL ? "?::jsonb" : "?";
277:     const old = TEST_PG_URL ? new PostgresDriver(target.url) : new SqliteDriver(target.url);
278:     await old.execute(`CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER PRIMARY KEY, name TEXT NOT NULL, applied_at TEXT NOT NULL)`);
279:     for (const m of MIGRATIONS.filter((m) => m.version < 4)) {
280:       await old.transaction(async (tx) => {
281:         await m.up(tx);
282:         await tx.execute(`INSERT INTO schema_migrations (version, name, applied_at) VALUES (?, ?, ?)`, [m.version, m.name, ts]);
283:       });
284:     }
285:     await old.execute(`INSERT INTO tenants (id, slug, data, created_at, updated_at) VALUES (?, ?, ${J}, ?, ?)`, ["tnt_m4", "m4", JSON.stringify({ id: "tnt_m4", slug: "m4", name: "M4", settings: {}, createdAt: ts, updatedAt: ts }), ts, ts]);
286:     const conn = {
287:       ...base, id: "sso_m4", tenantId: "tnt_m4", name: "M4", domains: ["dns-m4.example", "old-m4.example"],
288:       verification: { "dns-m4.example": { token: "d".repeat(32), verifiedAt: ts, method: "dns" }, "old-m4.example": { token: "e".repeat(32), verifiedAt: ts, method: "grandfathered" } },
289:     };
290:     await old.execute(`INSERT INTO sso_connections (id, tenant_id, data, created_at, updated_at) VALUES (?, ?, ${J}, ?, ?)`, [conn.id, conn.tenantId, JSON.stringify(conn), ts, ts]);
291:     for (const d of conn.domains) await old.execute(`INSERT INTO sso_domains (domain, connection_id, tenant_id, verified_at) VALUES (?, ?, ?, ?)`, [d, conn.id, conn.tenantId, ts]);
292:     await old.close();
293:
294:     const before = Date.now();
295:     const upgraded = await createService({ database: target.url, registry });
296:     try {
297:       const v = (await upgraded.store.identity.sso.get("sso_m4"))!.verification!;
298:       const next = Date.parse(v["dns-m4.example"]!.nextCheckAt!);
299:       expect(next).toBeGreaterThanOrEqual(before - 1000);
300:       expect(next).toBeLessThanOrEqual(Date.now() + 24 * 3_600_000);
301:       expect(v["old-m4.example"]!.nextCheckAt).toBeUndefined();
302:       const due = await upgraded.store.identity.sso.dueForRecheck(new Date(Date.now() + 25 * 3_600_000).toISOString(), 25);
303:       expect(due).toEqual([{ connectionId: "sso_m4", domain: "dns-m4.example" }]);
304:     } finally {
305:       await upgraded.store.close();
306:       await target.cleanup();
307:     }
308:   });
309: });

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

FILE apps/web/src/lib/auth.ts SHA256 c00f8f4dc512401fcd40d13d15b79494de06eaf9b2720bcccbea65d5ac772a36
1: /** Who is signed in, what they may do, and the sign-in configuration. */
2: import { useQuery, useQueryClient } from "@tanstack/react-query";
3: import { useParams } from "react-router-dom";
4: import type { Capability, Role } from "@visua/core";
5: import { api, ApiError, setCsrfToken } from "./api.ts";
6: import { useWorkspace } from "./queries.ts";
7:
8: export interface Me {
9:   authMode: "dev" | "oidc";
10:   principal: "user" | "token";
11:   user: { id: string; email: string; name: string };
12:   method: string;
13:   csrf?: string;
14:   tenantScope: string | null;
15:   activeTenant: { id: string; slug: string; name: string; role: Role; capabilities: Capability[]; settings: { requireSso?: boolean } } | null;
16:   organizations: { id: string; slug: string; name: string; role: Role }[];
17: }
18:
19: export interface AuthConfig {
20:   mode: "dev" | "oidc";
21:   platform: { name: string } | null;
22:   sso: boolean;
23:   personas: { email: string; name: string; organizations: { name: string; role: Role }[] }[];
24: }
25:
26: export const meKey = ["auth", "me"] as const;
27:
28: async function fetchMe(): Promise<Me | null> {
29:   try {
30:     const me = await api.get<Me | null>("/auth/me");
31:     setCsrfToken(me?.csrf);
32:     return me;
33:   } catch (err) {
34:     if (err instanceof ApiError && err.status === 401) {
35:       setCsrfToken(undefined);
36:       return null;
37:     }
38:     throw err;
39:   }
40: }
41:
42: /** The signed-in principal, or null when signed out. */
43: export function useMe() {
44:   return useQuery({ queryKey: meKey, queryFn: fetchMe, staleTime: 60_000, retry: false });
45: }
46:
47: export const useAuthConfig = () => useQuery({ queryKey: ["auth", "config"], queryFn: () => api.get<AuthConfig>("/auth/config"), staleTime: Infinity });
48:
49: /** Forget everything cached for the previous principal and load the new one. */
50: export function useResetSession() {
51:   const qc = useQueryClient();
52:   return async () => {
53:     qc.removeQueries({ predicate: (q) => q.queryKey[0] !== "auth" });
54:     await qc.fetchQuery({ queryKey: meKey, queryFn: fetchMe, staleTime: 0 });
55:   };
56: }
57:
58: /**
59:  * Whether the signed-in principal may do something in the current workspace
60:  * (its organization's role), or in the active organization outside one.
61:  * The server enforces the same rule; this only shapes the interface.
62:  */
63: export function useCan(capability: Capability): boolean {
64:   const { ws } = useParams();
65:   const summary = useWorkspace(ws);
66:   const me = useMe();
67:   if (ws) return !!summary.data?.access?.capabilities.includes(capability);
68:   return !!me.data?.activeTenant?.capabilities.includes(capability);
69: }
70:
71: export const ROLE_NAMES: Record<Role, string> = {
72:   owner: "Owner",
73:   admin: "Admin",
74:   approver: "Approver",
75:   contributor: "Contributor",
76:   auditor: "Auditor",
77:   viewer: "Viewer",
78: };

FILE apps/web/src/lib/api.ts SHA256 5417d89f1332af444345e26c618fe693ac41faa84723df4b42c559532b9bb512
1: /** Minimal typed API client: same-origin session cookie, CSRF header on writes, sign-in prompt on 401. */
2: export class ApiError extends Error {
3:   readonly status: number;
4:   constructor(status: number, message: string) {
5:     super(message);
6:     this.status = status;
7:   }
8: }
9:
10: let csrfToken = "";
11: /** The session's CSRF token (from /api/auth/me); sent with every state-changing request. */
12: export const setCsrfToken = (token: string | undefined) => {
13:   csrfToken = token ?? "";
14: };
15:
16: const unauthorizedListeners = new Set<() => void>();
17: /** Called when the server says the session is gone (expired, signed out elsewhere). */
18: export const onUnauthorized = (fn: () => void) => {
19:   unauthorizedListeners.add(fn);
20:   return () => void unauthorizedListeners.delete(fn);
21: };
22:
23: async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
24:   const headers: Record<string, string> = {};
25:   if (body !== undefined) headers["content-type"] = "application/json";
26:   if (method !== "GET" && csrfToken) headers["x-visua-csrf"] = csrfToken;
27:   const res = await fetch(`/api${path}`, { method, headers, body: body !== undefined ? JSON.stringify(body) : undefined, credentials: "same-origin" });
28:   const text = await res.text();
29:   let data: unknown;
30:   try {
31:     data = text ? (JSON.parse(text) as unknown) : undefined;
32:   } catch {
33:     data = undefined;
34:   }
35:   if (!res.ok) {
36:     if (res.status === 401 && !path.startsWith("/auth/")) for (const fn of unauthorizedListeners) fn();
37:     const message = (data as { error?: string } | undefined)?.error ?? `${res.status} ${res.statusText}`;
38:     throw new ApiError(res.status, message);
39:   }
40:   return data as T;
41: }
42:
43: export const api = {
44:   get: <T>(path: string) => request<T>("GET", path),
45:   post: <T>(path: string, body?: unknown) => request<T>("POST", path, body ?? {}),
46:   patch: <T>(path: string, body: unknown) => request<T>("PATCH", path, body),
47:   put: <T>(path: string, body: unknown) => request<T>("PUT", path, body),
48:   del: <T>(path: string) => request<T>("DELETE", path),
49: };
50:
51: export const corpusFileUrl = (path: string, page?: number) => `/api/corpus/file/${path.split("/").map(encodeURIComponent).join("/")}${page ? `#page=${page}` : ""}`;
52: export const exportUrl = (ws: string, kind: string) => `/api/workspaces/${encodeURIComponent(ws)}/exports/${kind}`;

FILE apps/web/src/lib/events.ts SHA256 8e98cd76f3391907d21a22f5e513d8fd227a98f6ce41b8c1fbdbc0bad590422d
1: /** Live workspace events over SSE → cache invalidation + live agent activity. */
2: import { useQueryClient } from "@tanstack/react-query";
3: import { useEffect } from "react";
4: import { useAgentActivity } from "../state/agentActivity.ts";
5: import { keys } from "./queries.ts";
6: import type { AgentStep } from "@visua/core";
7: import type { VisuaEvent } from "./types.ts";
8:
9: export function useWorkspaceEvents(ws: string | undefined): void {
10:   const qc = useQueryClient();
11:   useEffect(() => {
12:     if (!ws) return;
13:     const source = new EventSource(`/api/workspaces/${encodeURIComponent(ws)}/events`);
14:     const pending = new Set<string>();
15:     let timer: ReturnType<typeof setTimeout> | undefined;
16:     const invalidate = (...groups: string[]) => {
17:       for (const g of groups) pending.add(g);
18:       if (timer) return;
19:       timer = setTimeout(() => {
20:         timer = undefined;
21:         const groups = [...pending];
22:         pending.clear();
23:         for (const g of groups) {
24:           if (g === "all") void qc.invalidateQueries({ queryKey: ["ws", ws] });
25:           else void qc.invalidateQueries({ queryKey: ["ws", ws, g] });
26:         }
27:         void qc.invalidateQueries({ queryKey: keys.workspace(ws), exact: true });
28:         void qc.invalidateQueries({ queryKey: keys.workspaces });
29:       }, 250);
30:     };
31:     source.addEventListener("visua", (msg) => {
32:       const event = JSON.parse((msg as MessageEvent<string>).data) as VisuaEvent;
33:       const activity = useAgentActivity.getState();
34:       switch (event.type) {
35:         case "agent.step": {
36:           const { runId, agent, step } = event.data as { runId: string; agent: string; step: AgentStep };
37:           activity.pushStep(runId, agent, step);
38:           invalidate("run");
39:           break;
40:         }
41:         case "agent.run.created":
42:         case "agent.run.updated": {
43:           const run = event.data as { id: string; status: string; agent: string };
44:           activity.setRunStatus(run.id, run.agent, run.status);
45:           invalidate("runs", "run", "proposals");
46:           break;
47:         }
48:         case "proposal.created":
49:         case "proposal.updated":
50:           invalidate("proposals", "run", "node");
51:           break;
52:         case "state.updated":
53:           invalidate("state", "node");
54:           break;
55:         case "task.created":
56:         case "task.updated":
57:         case "task.deleted":
58:           invalidate("tasks", "state", "node");
59:           break;
60:         case "evidence.created":
61:         case "evidence.updated":
62:           invalidate("evidence", "state", "node");
63:           break;
64:         case "policy.created":
65:         case "policy.updated":
66:           invalidate("policies");
67:           break;
68:         case "risk.updated":
69:           invalidate("risks");
70:           break;
71:         case "check.completed":
72:           invalidate("checks", "connectors", "state", "node", "evidence");
73:           break;
74:         case "activity":
75:           invalidate("activity", "audit");
76:           break;
77:         case "workspace.updated":
78:           invalidate("all");
79:           break;
80:       }
81:     });
82:     return () => {
83:       if (timer) clearTimeout(timer);
84:       source.close();
85:     };
86:   }, [ws, qc]);
87: }

FILE apps/web/src/App.tsx SHA256 03b4a69f7a44202ec514089856f01427915a7ed206d26aa4087f9a765f74b268
1: import { useQueryClient } from "@tanstack/react-query";
2: import { lazy, Suspense, useEffect, type ReactNode } from "react";
3: import { BrowserRouter, Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
4: import { Shell } from "./components/shell/Shell.tsx";
5: import { onUnauthorized } from "./lib/api.ts";
6: import { meKey, useMe } from "./lib/auth.ts";
7: import { useWorkspaces } from "./lib/queries.ts";
8: import { LoginPage } from "./pages/LoginPage.tsx";
9:
10: // three.js (1.1 MB, 290 KB compressed) loads with the 3D pages only.
11: const ObservatoryPage = lazy(() => import("./pages/ObservatoryPage.tsx").then((m) => ({ default: m.ObservatoryPage })));
12: const HomePage = lazy(() => import("./pages/HomePage.tsx").then((m) => ({ default: m.HomePage })));
13: const PlanPage = lazy(() => import("./pages/PlanPage.tsx").then((m) => ({ default: m.PlanPage })));
14: const EvidencePage = lazy(() => import("./pages/EvidencePage.tsx").then((m) => ({ default: m.EvidencePage })));
15: const AgentsPage = lazy(() => import("./pages/AgentsPage.tsx").then((m) => ({ default: m.AgentsPage })));
16: const PoliciesPage = lazy(() => import("./pages/PoliciesPage.tsx").then((m) => ({ default: m.PoliciesPage })));
17: const ProfilePage = lazy(() => import("./pages/ProfilePage.tsx").then((m) => ({ default: m.ProfilePage })));
18: const CrosswalkPage = lazy(() => import("./pages/CrosswalkPage.tsx").then((m) => ({ default: m.CrosswalkPage })));
19: const Soc2Page = lazy(() => import("./pages/Soc2Page.tsx").then((m) => ({ default: m.Soc2Page })));
20: const RmfPage = lazy(() => import("./pages/RmfPage.tsx").then((m) => ({ default: m.RmfPage })));
21: const AiPage = lazy(() => import("./pages/AiPage.tsx").then((m) => ({ default: m.AiPage })));
22: const LawsPage = lazy(() => import("./pages/LawsPage.tsx").then((m) => ({ default: m.LawsPage })));
23: const ThreatsPage = lazy(() => import("./pages/ThreatsPage.tsx").then((m) => ({ default: m.ThreatsPage })));
24: const ReportsPage = lazy(() => import("./pages/ReportsPage.tsx").then((m) => ({ default: m.ReportsPage })));
25: const SettingsPage = lazy(() => import("./pages/SettingsPage.tsx").then((m) => ({ default: m.SettingsPage })));
26: const OnboardingPage = lazy(() => import("./pages/OnboardingPage.tsx").then((m) => ({ default: m.OnboardingPage })));
27: const TrustPage = lazy(() => import("./pages/TrustPage.tsx").then((m) => ({ default: m.TrustPage })));
28: const OrganizationPage = lazy(() => import("./pages/OrganizationPage.tsx").then((m) => ({ default: m.OrganizationPage })));
29:
30: function Landing() {
31:   const { data, isLoading } = useWorkspaces();
32:   const me = useMe();
33:   const navigate = useNavigate();
34:   const canCreate = !!me.data?.activeTenant?.capabilities.includes("workspace.configure");
35:   useEffect(() => {
36:     if (isLoading || !data) return;
37:     if (data.length) navigate(`/w/${data[0]!.workspace.slug}`, { replace: true });
38:     else if (canCreate) navigate("/onboarding", { replace: true });
39:   }, [data, isLoading, navigate, canCreate]);
40:   if (data && !data.length && !canCreate) {
41:     return (
42:       <div className="login">
43:         <div className="login__card panel">
44:           <h1 style={{ margin: 0 }}>No workspaces yet</h1>
45:           <p className="muted">{me.data?.activeTenant ? `${me.data.activeTenant.name} has no workspace you can see. An admin creates workspaces and invites people.` : "You are not a member of any organization yet. Ask an administrator to add you."}</p>
46:         </div>
47:       </div>
48:     );
49:   }
50:   return <div className="page muted">Loading Visua…</div>;
51: }
52:
53: /** Everything except sign-in and public trust centers needs a signed-in principal. */
54: function RequireSignIn({ children }: { children: ReactNode }) {
55:   const me = useMe();
56:   const qc = useQueryClient();
57:   const location = useLocation();
58:   useEffect(() => onUnauthorized(() => qc.setQueryData(meKey, null)), [qc]);
59:   if (me.isLoading) return <div className="page muted">Loading Visua…</div>;
60:   if (!me.data) return <Navigate to={`/login?returnTo=${encodeURIComponent(location.pathname + location.search)}`} replace />;
61:   return <>{children}</>;
62: }
63:
64: const Fallback = () => <div className="page muted">Loading…</div>;
65:
66: export function App() {
67:   return (
68:     <BrowserRouter>
69:       <Suspense fallback={<Fallback />}>
70:         <Routes>
71:           <Route path="/login" element={<LoginPage />} />
72:           <Route path="/trust/:slug" element={<TrustPage />} />
73:           <Route path="/" element={<RequireSignIn><Landing /></RequireSignIn>} />
74:           <Route path="/onboarding" element={<RequireSignIn><OnboardingPage /></RequireSignIn>} />
75:           <Route path="/w/:ws" element={<RequireSignIn><Shell /></RequireSignIn>}>
76:             <Route index element={<HomePage />} />
77:             <Route path="observatory" element={<ObservatoryPage />} />
78:             <Route path="observatory/:fw" element={<ObservatoryPage />} />
79:             <Route path="plan" element={<PlanPage />} />
80:             <Route path="evidence" element={<EvidencePage />} />
81:             <Route path="agents" element={<AgentsPage />} />
82:             <Route path="agents/:runId" element={<AgentsPage />} />
83:             <Route path="policies" element={<PoliciesPage />} />
84:             <Route path="profile" element={<ProfilePage />} />
85:             <Route path="crosswalk" element={<CrosswalkPage />} />
86:             <Route path="soc2" element={<Soc2Page />} />
87:             <Route path="rmf" element={<RmfPage />} />
88:             <Route path="ai" element={<AiPage />} />
89:             <Route path="laws" element={<LawsPage />} />
90:             <Route path="threats" element={<ThreatsPage />} />
91:             <Route path="threats/:catalog" element={<ThreatsPage />} />
92:             <Route path="reports" element={<ReportsPage />} />
93:             <Route path="settings" element={<SettingsPage />} />
94:             <Route path="organization" element={<OrganizationPage />} />
95:           </Route>
96:           <Route path="*" element={<Navigate to="/" replace />} />
97:         </Routes>
98:       </Suspense>
99:     </BrowserRouter>
100:   );
101: }

FILE apps/web/src/pages/OrganizationPage.tsx SHA256 6375b785a6357643ddc827160b69b67800f7b899c93a7ccbdb6cd676c837fcf7
1: /**
2:  * Organization administration: members and roles, API tokens, single sign-on
3:  * connections, the SSO requirement and the organization's own audit trail.
4:  * Everything here is enforced by the server; the page only hides what the
5:  * signed-in role cannot do.
6:  */
7: import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
8: import { Copy, KeyRound, Plus, ShieldCheck, Trash2, UserPlus } from "lucide-react";
9: import { useState } from "react";
10: import { useNavigate, useParams } from "react-router-dom";
11: import { ROLES, ROLE_LABELS, can, roleRank, type ActivityEvent, type Role } from "@visua/core";
12: import { Empty, StatusChip, Tabs, toast } from "../components/ui/index.tsx";
13: import { api } from "../lib/api.ts";
14: import { ROLE_NAMES, useMe, useResetSession } from "../lib/auth.ts";
15: import { shortDate } from "../lib/format.ts";
16: import { useWorkspace } from "../lib/queries.ts";
17:
18: interface Member {
19:   id: string;
20:   email: string;
21:   name: string;
22:   role: Role;
23:   memberSince: string;
24:   lastLoginAt?: string;
25: }
26: interface Token {
27:   id: string;
28:   name: string;
29:   role: Role;
30:   prefix: string;
31:   createdAt: string;
32:   expiresAt?: string;
33:   revokedAt?: string;
34:   lastUsedAt?: string;
35: }
36: interface Connection {
37:   id: string;
38:   name: string;
39:   issuer: string;
40:   clientId: string;
41:   hasClientSecret: boolean;
42:   domains: string[];
43:   /** Each domain's proof: only verified domains route sign-ins and admit people. */
44:   domainStatus: {
45:     domain: string;
46:     verified: boolean;
47:     standing: "pending" | "verified" | "failing" | "lapsed" | "not-proven";
48:     method?: "dns" | "grandfathered" | "trusted";
49:     verifiedAt?: string;
50:     failingSince?: string;
51:     lapsesAt?: string;
52:     lapsedAt?: string;
53:     takenOver: boolean;
54:     record?: { name: string; value: string };
55:   }[];
56:   jitProvisioning: boolean;
57:   defaultRole: Role;
58:   enabled: boolean;
59: }
60:
61: const PROOF: Record<string, string> = {
62:   dns: "Verified",
63:   grandfathered: "Verified before DNS checks",
64:   trusted: "Trusted (checks off)",
65: };
66: /** How often this installation looks proven domains up again (GET /sso). */
67: interface DomainRechecks {
68:   enabled: boolean;
69:   everyHours: number;
70: }
71: const every = (hours: number) => (hours === 24 ? "every day" : hours === 1 ? "every hour" : `every ${hours} hours`);
72: function DomainChip({ d, rechecks }: { d: Connection["domainStatus"][number]; rechecks?: DomainRechecks }) {
73:   // With re-checks off, a failing domain never lapses: no date to announce.
74:   if (d.standing === "failing") return <StatusChip status="at-risk" label={rechecks?.enabled === false ? "Record missing" : `Record missing · lapses ${shortDate(d.lapsesAt)}`} />;
75:   if (d.standing === "lapsed") return <StatusChip status="at-risk" label={d.takenOver ? "Held by another organization" : "Lapsed · admits no one new"} />;
76:   if (d.standing === "pending") return <StatusChip status="in-progress" label="Awaiting DNS proof" />;
77:   return <StatusChip status="verified" label={PROOF[d.method ?? "dns"]} />;
78: }
79: interface TenantInfo {
80:   id: string;
81:   name: string;
82:   slug: string;
83:   settings: { requireSso?: boolean };
84:   role: Role;
85: }
86:
87: type Tab = "members" | "tokens" | "sso" | "audit";
88: const day = (iso?: string) => (iso ? iso.slice(0, 10) : "—");
89:
90: function RoleSelect({ value, onChange, max, label, exclude = [], compact }: { value: Role; onChange: (r: Role) => void; max: Role; label: string; exclude?: Role[]; compact?: boolean }) {
91:   return (
92:     <select className="select" aria-label={label} value={value} onChange={(e) => onChange(e.target.value as Role)} style={compact ? { minHeight: 32, height: 32, padding: "0 8px", width: 160 } : { width: 160 }}>
93:       {ROLES.filter((r) => roleRank(r) <= roleRank(max) && !exclude.includes(r)).map((r) => (
94:         <option key={r} value={r} title={ROLE_LABELS[r].description}>
95:           {ROLE_NAMES[r]}
96:         </option>
97:       ))}
98:     </select>
99:   );
100: }
101:
102: export function OrganizationPage() {
103:   const { ws = "" } = useParams();
104:   const summary = useWorkspace(ws);
105:   const tenantId = summary.data?.workspace.tenantId;
106:   const qc = useQueryClient();
107:   const [tab, setTab] = useState<Tab>("members");
108:   const tenant = useQuery({ queryKey: ["tenant", tenantId], queryFn: () => api.get<TenantInfo>(`/tenants/${tenantId}`), enabled: !!tenantId });
109:   const role = tenant.data?.role;
110:   const manage = can(role, "tenant.manage");
111:   const audit = can(role, "workspace.export");
112:   const refresh = () => qc.invalidateQueries({ queryKey: ["tenant", tenantId] });
113:
114:   if (!tenantId || !tenant.data) return <div className="page muted">Loading…</div>;
115:   const tabs: { id: Tab; label: string }[] = [{ id: "members", label: "Members" }];
116:   if (manage) tabs.push({ id: "tokens", label: "API tokens" }, { id: "sso", label: "Single sign-on" });
117:   if (audit) tabs.push({ id: "audit", label: "Audit trail" });
118:
119:   return (
120:     <div className="page">
121:       <header className="page__header">
122:         <div>
123:           <div className="eyebrow">Organization</div>
124:           <h1>{tenant.data.name}</h1>
125:           <p>
126:             Every workspace belongs to one organization. People see an organization's workspaces only through a membership, and what they can do follows their role.
127:             You are <strong>{ROLE_NAMES[tenant.data.role]}</strong>.
128:           </p>
129:         </div>
130:       </header>
131:       <Tabs tabs={tabs} value={tab} onChange={setTab} />
132:       <div style={{ marginTop: 16 }}>
133:         {tab === "members" && <Members tenantId={tenantId} role={tenant.data.role} onChange={refresh} />}
134:         {tab === "tokens" && manage && <Tokens tenantId={tenantId} role={tenant.data.role} />}
135:         {tab === "sso" && manage && <Sso tenant={tenant.data} onChange={refresh} />}
136:         {tab === "audit" && audit && <Audit tenantId={tenantId} />}
137:       </div>
138:     </div>
139:   );
140: }
141:
142: function Members({ tenantId, role, onChange }: { tenantId: string; role: Role; onChange: () => void }) {
143:   const qc = useQueryClient();
144:   const me = useMe();
145:   const manage = can(role, "tenant.manage");
146:   const members = useQuery({ queryKey: ["tenant", tenantId, "members"], queryFn: () => api.get<Member[]>(`/tenants/${tenantId}/members`) });
147:   const [email, setEmail] = useState("");
148:   const [name, setName] = useState("");
149:   const [newRole, setNewRole] = useState<Role>("contributor");
150:   const done = () => {
151:     void qc.invalidateQueries({ queryKey: ["tenant", tenantId, "members"] });
152:     onChange();
153:   };
154:   const add = useMutation({
155:     mutationFn: () => api.post(`/tenants/${tenantId}/members`, { email, name: name || undefined, role: newRole }),
156:     onSuccess: () => {
157:       toast(`${email} added as ${ROLE_NAMES[newRole].toLowerCase()}`);
158:       setEmail("");
159:       setName("");
160:       done();
161:     },
162:     onError: (e: Error) => toast(e.message, "error"),
163:   });
164:   const setMemberRole = useMutation({
165:     mutationFn: (v: { id: string; role: Role }) => api.patch(`/tenants/${tenantId}/members/${v.id}`, { role: v.role }),
166:     onSuccess: done,
167:     onError: (e: Error) => toast(e.message, "error"),
168:   });
169:   const remove = useMutation({
170:     mutationFn: (id: string) => api.del(`/tenants/${tenantId}/members/${id}`),
171:     onSuccess: done,
172:     onError: (e: Error) => toast(e.message, "error"),
173:   });
174:   return (
175:     <div className="stack" style={{ gap: 16 }}>
176:       {manage && (
177:         <form
178:           className="panel row row--wrap"
179:           style={{ gap: 10, alignItems: "flex-end" }}
180:           onSubmit={(e) => {
181:             e.preventDefault();
182:             add.mutate();
183:           }}
184:         >
185:           <div className="field" style={{ flex: "2 1 220px" }}>
186:             <label htmlFor="member-email">Email</label>
187:             <input id="member-email" className="input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="colleague@company.com" />
188:           </div>
189:           <div className="field" style={{ flex: "1 1 160px" }}>
190:             <label htmlFor="member-name">Name</label>
191:             <input id="member-name" className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Optional" />
192:           </div>
193:           <div className="field">
194:             <label>Role</label>
195:             <RoleSelect label="Role for the new member" value={newRole} onChange={setNewRole} max={role} />
196:           </div>
197:           <button className="btn btn--primary" type="submit" disabled={add.isPending || !email.includes("@")}>
198:             <UserPlus size={15} aria-hidden /> Add member
199:           </button>
200:           <p className="field__hint" style={{ flexBasis: "100%", margin: 0 }}>
201:             Members sign in through your SSO or the platform identity provider with this email address. {ROLE_LABELS[newRole].description}
202:           </p>
203:         </form>
204:       )}
205:       <div className="panel" style={{ padding: 0 }}>
206:         <table className="table table--members">
207:           <thead>
208:             <tr>
209:               <th>Member</th>
210:               <th>Role</th>
211:               <th>Member since</th>
212:               <th>Last sign-in</th>
213:               {manage && <th aria-label="Actions" />}
214:             </tr>
215:           </thead>
216:           <tbody>
217:             {(members.data ?? []).map((m) => {
218:               const self = m.id === me.data?.user.id;
219:               const editable = manage && !self && (m.role !== "owner" || role === "owner");
220:               return (
221:                 <tr key={m.id}>
222:                   <td>
223:                     <div className="stack" style={{ gap: 2 }}>
224:                       <strong>
225:                         {m.name}
226:                         {self ? " (you)" : ""}
227:                       </strong>
228:                       <span className="muted" style={{ fontSize: 12 }}>
229:                         {m.email}
230:                       </span>
231:                     </div>
232:                   </td>
233:                   <td>{editable ? <RoleSelect compact label={`Role of ${m.email}`} value={m.role} onChange={(r) => setMemberRole.mutate({ id: m.id, role: r })} max={role} /> : <span className="role-badge">{ROLE_NAMES[m.role]}</span>}</td>
234:                   <td className="mono">{day(m.memberSince)}</td>
235:                   <td className="mono">{day(m.lastLoginAt)}</td>
236:                   {manage && (
237:                     <td style={{ textAlign: "right" }}>
238:                       {editable && (
239:                         <button className="btn btn--quiet btn--sm btn--icon" aria-label={`Remove ${m.email}`} title="Remove from organization" onClick={() => confirm(`Remove ${m.email} from this organization?`) && remove.mutate(m.id)}>
240:                           <Trash2 size={14} />
241:                         </button>
242:                       )}
243:                     </td>
244:                   )}
245:                 </tr>
246:               );
247:             })}
248:           </tbody>
249:         </table>
250:       </div>
251:       <NewOrganization />
252:     </div>
253:   );
254: }
255:
256: function NewOrganization() {
257:   const me = useMe();
258:   const reset = useResetSession();
259:   const navigate = useNavigate();
260:   const [name, setName] = useState("");
261:   const create = useMutation({
262:     mutationFn: () => api.post<{ id: string }>("/tenants", { name }),
263:     onSuccess: async () => {
264:       toast(`Organization “${name}” created — you are its owner.`);
265:       await reset();
266:       navigate("/onboarding");
267:     },
268:     onError: (e: Error) => toast(e.message, "error"),
269:   });
270:   if (me.data?.principal !== "user" || me.data.tenantScope) return null;
271:   return (
272:     <form
273:       className="panel row row--wrap"
274:       style={{ gap: 10, alignItems: "flex-end" }}
275:       onSubmit={(e) => {
276:         e.preventDefault();
277:         create.mutate();
278:       }}
279:     >
280:       <div className="field" style={{ flex: "1 1 260px" }}>
281:         <label htmlFor="org-name">Start another organization</label>
282:         <input id="org-name" className="input" required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. a client you advise" />
283:         <span className="field__hint">For consultants and groups: each organization's workspaces, members and SSO stay separate.</span>
284:       </div>
285:       <button className="btn" type="submit" disabled={!name.trim() || create.isPending}>
286:         <Plus size={15} aria-hidden /> Create organization
287:       </button>
288:     </form>
289:   );
290: }
291:
292: function Tokens({ tenantId, role }: { tenantId: string; role: Role }) {
293:   const qc = useQueryClient();
294:   const tokens = useQuery({ queryKey: ["tenant", tenantId, "tokens"], queryFn: () => api.get<Token[]>(`/tenants/${tenantId}/tokens`) });
295:   const [name, setName] = useState("");
296:   const [tokenRole, setTokenRole] = useState<Role>("contributor");
297:   const [days, setDays] = useState(90);
298:   const [created, setCreated] = useState<{ name: string; token: string } | null>(null);
299:   const create = useMutation({
300:     mutationFn: () => api.post<Token & { token: string }>(`/tenants/${tenantId}/tokens`, { name, role: tokenRole, expiresInDays: days || undefined }),
301:     onSuccess: (t) => {
302:       setCreated({ name: t.name, token: t.token });
303:       setName("");
304:       void qc.invalidateQueries({ queryKey: ["tenant", tenantId, "tokens"] });
305:     },
306:     onError: (e: Error) => toast(e.message, "error"),
307:   });
308:   const revoke = useMutation({
309:     mutationFn: (id: string) => api.del(`/tenants/${tenantId}/tokens/${id}`),
310:     onSuccess: () => void qc.invalidateQueries({ queryKey: ["tenant", tenantId, "tokens"] }),
311:     onError: (e: Error) => toast(e.message, "error"),
312:   });
313:   const now = new Date().toISOString();
314:   return (
315:     <div className="stack" style={{ gap: 16 }}>
316:       <form
317:         className="panel row row--wrap"
318:         style={{ gap: 10, alignItems: "flex-end" }}
319:         onSubmit={(e) => {
320:           e.preventDefault();
321:           create.mutate();
322:         }}
323:       >
324:         <div className="field" style={{ flex: "2 1 220px" }}>
325:           <label htmlFor="token-name">Token name</label>
326:           <input id="token-name" className="input" required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. CI evidence upload" />
327:         </div>
328:         <div className="field">
329:           <label>Role</label>
330:           <RoleSelect label="Token role" value={tokenRole} onChange={setTokenRole} max={role} exclude={["owner"]} />
331:         </div>
332:         <div className="field" style={{ width: 130 }}>
333:           <label htmlFor="token-days">Expires in (days)</label>
334:           <input id="token-days" className="input" type="number" min={1} max={730} value={days} onChange={(e) => setDays(Number(e.target.value))} />
335:         </div>
336:         <button className="btn btn--primary" type="submit" disabled={!name.trim() || create.isPending}>
337:           <KeyRound size={15} aria-hidden /> Create token
338:         </button>
339:         <p className="field__hint" style={{ flexBasis: "100%", margin: 0 }}>
340:           Tokens act in this organization only, with the role you choose, and every change they make is recorded under their name. Send them as <span className="mono">Authorization: Bearer …</span>.
341:         </p>
342:       </form>
343:       {created && (
344:         <div className="panel stack" role="status" style={{ gap: 8 }}>
345:           <strong>Copy “{created.name}” now — it will not be shown again.</strong>
346:           <div className="row" style={{ gap: 8 }}>
347:             <code className="secret" style={{ flex: 1 }}>
348:               {created.token}
349:             </code>
350:             <button className="btn btn--sm" onClick={() => void navigator.clipboard?.writeText(created.token).then(() => toast("Token copied"))} aria-label="Copy token">
351:               <Copy size={14} />
352:             </button>
353:           </div>
354:         </div>
355:       )}
356:       <div className="panel" style={{ padding: 0 }}>
357:         {tokens.data?.length ? (
358:           <table className="table table--tokens">
359:             <thead>
360:               <tr>
361:                 <th>Token</th>
362:                 <th>Role</th>
363:                 <th>Created</th>
364:                 <th>Last used</th>
365:                 <th>Expires</th>
366:                 <th aria-label="Actions" />
367:               </tr>
368:             </thead>
369:             <tbody>
370:               {tokens.data.map((t) => {
371:                 const expired = !!t.expiresAt && t.expiresAt <= now;
372:                 return (
373:                   <tr key={t.id}>
374:                     <td>
375:                       <div className="stack" style={{ gap: 2 }}>
376:                         <strong>{t.name}</strong>
377:                         <span className="mono muted" style={{ fontSize: 12 }}>
378:                           {t.prefix}…
379:                         </span>
380:                       </div>
381:                     </td>
382:                     <td>
383:                       <span className="role-badge">{ROLE_NAMES[t.role]}</span>
384:                     </td>
385:                     <td className="mono">{day(t.createdAt)}</td>
386:                     <td className="mono">{day(t.lastUsedAt)}</td>
387:                     <td className="mono">{t.revokedAt ? `revoked ${day(t.revokedAt)}` : expired ? `expired ${day(t.expiresAt)}` : day(t.expiresAt)}</td>
388:                     <td style={{ textAlign: "right" }}>
389:                       {!t.revokedAt && !expired && (
390:                         <button className="btn btn--quiet btn--sm" onClick={() => confirm(`Revoke “${t.name}”? Anything using it stops working immediately.`) && revoke.mutate(t.id)}>
391:                           Revoke
392:                         </button>
393:                       )}
394:                     </td>
395:                   </tr>
396:                 );
397:               })}
398:             </tbody>
399:           </table>
400:         ) : (
401:           <Empty title="No API tokens">Create one for CI pipelines, evidence uploads or integrations.</Empty>
402:         )}
403:       </div>
404:     </div>
405:   );
406: }
407:
408: const emptyConnection = { name: "", issuer: "", clientId: "", clientSecret: "", domains: "", jitProvisioning: false, defaultRole: "viewer" as Role };
409:
410: function Sso({ tenant, onChange }: { tenant: TenantInfo; onChange: () => void }) {
411:   const qc = useQueryClient();
412:   const sso = useQuery({ queryKey: ["tenant", tenant.id, "sso"], queryFn: () => api.get<{ redirectUri: string; domainRechecks: DomainRechecks; connections: Connection[] }>(`/tenants/${tenant.id}/sso`) });
413:   const [form, setForm] = useState(emptyConnection);
414:   const done = () => {
415:     void qc.invalidateQueries({ queryKey: ["tenant", tenant.id, "sso"] });
416:     onChange();
417:   };
418:   const save = useMutation({
419:     mutationFn: () =>
420:       api.post(`/tenants/${tenant.id}/sso`, {
421:         name: form.name || "Single sign-on",
422:         issuer: form.issuer,
423:         clientId: form.clientId,
424:         clientSecret: form.clientSecret || undefined,
425:         domains: form.domains.split(/[\s,]+/).filter(Boolean),
426:         jitProvisioning: form.jitProvisioning,
427:         defaultRole: form.defaultRole,
428:       }),
429:     onSuccess: () => {
430:       toast("SSO connection added");
431:       setForm(emptyConnection);
432:       done();
433:     },
434:     onError: (e: Error) => toast(e.message, "error"),
435:   });
436:   const update = useMutation({
437:     mutationFn: (v: { id: string; patch: Partial<Connection> }) => api.patch(`/tenants/${tenant.id}/sso/${v.id}`, v.patch),
438:     onSuccess: done,
439:     onError: (e: Error) => toast(e.message, "error"),
440:   });
441:   const remove = useMutation({
442:     mutationFn: (id: string) => api.del(`/tenants/${tenant.id}/sso/${id}`),
443:     onSuccess: done,
444:     onError: (e: Error) => toast(e.message, "error"),
445:   });
446:   const verify = useMutation({
447:     mutationFn: (v: { id: string; domain: string }) => api.post(`/tenants/${tenant.id}/sso/${v.id}/domains/${encodeURIComponent(v.domain)}/verify`, {}),
448:     onSuccess: (_, v) => {
449:       toast(`${v.domain} verified: its people now sign in through your provider`);
450:       done();
451:     },
452:     onError: (e: Error) => toast(e.message, "error"),
453:   });
454:   const copy = (text: string, what: string) => void navigator.clipboard?.writeText(text).then(() => toast(`${what} copied`));
455:   const attention = (sso.data?.connections ?? []).flatMap((c) =>
456:     c.domainStatus.filter((d) => d.record && (d.standing === "pending" || d.standing === "failing" || (d.standing === "lapsed" && !d.takenOver))).map((d) => ({ connection: c, ...d, record: d.record! })),
457:   );
458:   const requireSso = useMutation({
459:     mutationFn: (value: boolean) => api.patch(`/tenants/${tenant.id}`, { settings: { requireSso: value } }),
460:     onSuccess: (_, value) => {
461:       toast(value ? "SSO is now required for this organization" : "SSO is no longer required");
462:       onChange();
463:     },
464:     onError: (e: Error) => toast(e.message, "error"),
465:   });
466:   const owner = tenant.role === "owner";
467:   return (
468:     <div className="stack" style={{ gap: 16 }}>
469:       <div className="panel stack" style={{ gap: 8 }}>
470:         <h2 className="section-title" style={{ margin: 0 }}>
471:           How it works
472:         </h2>
473:         <p className="muted" style={{ margin: 0 }}>
474:           Connect your identity provider (Okta, Microsoft Entra ID, Google Workspace, Keycloak…) with OpenID Connect. Once you prove a domain with a DNS record, people
475:           whose email is in it are sent to your provider when they sign in. Sessions it creates reach this organization only. Register this redirect URI with your provider:
476:         </p>
477:         <code className="secret">{sso.data?.redirectUri ?? "…"}</code>
478:       </div>
479:       <div className="panel" style={{ padding: 0 }}>
480:         {sso.data?.connections.length ? (
481:           <table className="table table--sso table--stack">
482:             <thead>
483:               <tr>
484:                 <th>Connection</th>
485:                 <th>Domains</th>
486:                 <th>New people</th>
487:                 <th>Status</th>
488:                 <th aria-label="Actions" />
489:               </tr>
490:             </thead>
491:             <tbody>
492:               {sso.data.connections.map((c) => (
493:                 <tr key={c.id}>
494:                   <td>
495:                     <div className="stack" style={{ gap: 2 }}>
496:                       <strong>{c.name}</strong>
497:                       <span className="mono muted" style={{ fontSize: 12 }}>
498:                         {c.issuer} · {c.clientId}
499:                         {c.hasClientSecret ? " · secret stored (encrypted)" : " · public client"}
500:                       </span>
501:                     </div>
502:                   </td>
503:                   <td data-label="Domains">
504:                     <ul className="stack" style={{ gap: 4, listStyle: "none", margin: 0, padding: 0 }}>
505:                       {c.domainStatus.map((d) => (
506:                         <li key={d.domain} className="row" style={{ gap: 8, flexWrap: "wrap" }}>
507:                           <span className="mono">{d.domain}</span>
508:                           <DomainChip d={d} rechecks={sso.data.domainRechecks} />
509:                         </li>
510:                       ))}
511:                     </ul>
512:                   </td>
513:                   <td data-label="New people">{c.jitProvisioning ? `Join as ${ROLE_NAMES[c.defaultRole].toLowerCase()}` : "Admins add them first"}</td>
514:                   <td data-label="Status">
515:                     <button className="btn btn--quiet btn--sm" onClick={() => update.mutate({ id: c.id, patch: { enabled: !c.enabled } })}>
516:                       {c.enabled ? "Enabled — disable" : "Disabled — enable"}
517:                     </button>
518:                   </td>
519:                   <td style={{ textAlign: "right" }}>
520:                     {owner && (
521:                       <button className="btn btn--quiet btn--sm btn--icon" aria-label={`Remove ${c.name}`} onClick={() => confirm(`Remove the SSO connection “${c.name}”?`) && remove.mutate(c.id)}>
522:                         <Trash2 size={14} />
523:                       </button>
524:                     )}
525:                   </td>
526:                 </tr>
527:               ))}
528:             </tbody>
529:           </table>
530:         ) : (
531:           <Empty title="No SSO connection">Add your identity provider below.</Empty>
532:         )}
533:       </div>
534:       {attention.map((p) => (
535:         <section key={`${p.connection.id}:${p.domain}`} className="panel stack" style={{ gap: 10 }} aria-labelledby={`proof-${p.connection.id}-${p.domain}`}>
536:           <h2 className="section-title" id={`proof-${p.connection.id}-${p.domain}`} style={{ margin: 0 }}>
537:             {p.standing === "pending" ? `Prove you control ${p.domain}` : p.standing === "failing" ? `Restore the DNS record for ${p.domain}` : `${p.domain} has lapsed`}
538:           </h2>
539:           <p className="muted" style={{ margin: 0 }}>
540:             {p.standing === "pending" && (
541:               <>Until then, nobody is sent to “{p.connection.name}” for this domain, and it admits no one from it. Add this TXT record at your DNS provider, then verify. Another organization can claim the domain too; the first to prove it holds it.</>
542:             )}
543:             {p.standing === "failing" &&
544:               (sso.data?.domainRechecks.enabled === false ? (
545:                 <>
546:                   Visua has not found this record since {shortDate(p.failingSince)}. Re-checks are off on this installation, so the domain will not lapse on its own, and “{p.connection.name}”
547:                   keeps admitting people from it. Restore this TXT record, then verify.
548:                 </>
549:               ) : (
550:                 <>
551:                   Visua looks at this record again {every(sso.data?.domainRechecks.everyHours ?? 24)} and has not found it since {shortDate(p.failingSince)}. Unless it is back by{" "}
552:                   {shortDate(p.lapsesAt)}, the domain lapses: “{p.connection.name}” then admits no one new from it, and another organization can prove it. Until then it keeps
553:                   admitting people as usual. People who already sign in with it keep doing so either way.
554:                 </>
555:               ))}
556:             {p.standing === "lapsed" && (
557:               <>Since {shortDate(p.lapsedAt)}, “{p.connection.name}” admits no one new from this domain, and another organization can prove it. People who already sign in with it still can. Restore this TXT record, then verify.</>
558:             )}
559:           </p>
560:           <dl className="stack" style={{ gap: 6, margin: 0 }}>
561:             {(
562:               [
563:                 ["Name", p.record.name],
564:                 ["Value", p.record.value],
565:               ] as const
566:             ).map(([label, value]) => (
567:               <div key={label} className="row" style={{ gap: 8, flexWrap: "wrap", alignItems: "center" }}>
568:                 <dt className="muted" style={{ width: 48 }}>
569:                   {label}
570:                 </dt>
571:                 <dd style={{ margin: 0, minWidth: 0, flex: "0 1 auto" }}>
572:                   <code className="secret" style={{ display: "block", overflowWrap: "anywhere" }}>
573:                     {value}
574:                   </code>
575:                 </dd>
576:                 <button className="btn btn--quiet btn--sm btn--icon" aria-label={`Copy the record ${label.toLowerCase()} for ${p.domain}`} onClick={() => copy(value, `Record ${label.toLowerCase()}`)}>
577:                   <Copy size={14} />
578:                 </button>
579:               </div>
580:             ))}
581:           </dl>
582:           <div>
583:             <button className="btn btn--primary" disabled={verify.isPending} onClick={() => verify.mutate({ id: p.connection.id, domain: p.domain })}>
584:               <ShieldCheck size={15} aria-hidden /> Verify {p.domain}
585:             </button>
586:           </div>
587:         </section>
588:       ))}
589:       {!owner && (
590:         <div className="panel muted" role="note">
591:           Only owners add, remove or re-point identity providers: whoever controls a provider can sign in as any member on its domains, owners included. Admins can
592:           enable or disable connections.
593:         </div>
594:       )}
595:       {owner && (
596:       <form
597:         className="panel stack"
598:         style={{ gap: 12 }}
599:         onSubmit={(e) => {
600:           e.preventDefault();
601:           save.mutate();
602:         }}
603:       >
604:         <h2 className="section-title" style={{ margin: 0 }}>
605:           Add an OpenID Connect provider
606:         </h2>
607:         <div className="grid grid--2" style={{ gap: 12 }}>
608:           <div className="field">
609:             <label htmlFor="sso-name">Name</label>
610:             <input id="sso-name" className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Okta" />
611:           </div>
612:           <div className="field">
613:             <label htmlFor="sso-issuer">Issuer URL</label>
614:             <input id="sso-issuer" className="input" required value={form.issuer} onChange={(e) => setForm({ ...form, issuer: e.target.value })} placeholder="https://login.example.com/" />
615:           </div>
616:           <div className="field">
617:             <label htmlFor="sso-client">Client ID</label>
618:             <input id="sso-client" className="input" required value={form.clientId} onChange={(e) => setForm({ ...form, clientId: e.target.value })} />
619:           </div>
620:           <div className="field">
621:             <label htmlFor="sso-secret">Client secret</label>
622:             <input id="sso-secret" className="input" type="password" autoComplete="off" value={form.clientSecret} onChange={(e) => setForm({ ...form, clientSecret: e.target.value })} placeholder="Leave empty for a public client (PKCE)" />
623:           </div>
624:           <div className="field">
625:             <label htmlFor="sso-domains">Email domains</label>
626:             <input id="sso-domains" className="input" required value={form.domains} onChange={(e) => setForm({ ...form, domains: e.target.value })} placeholder="example.com, example.co.uk" />
627:           </div>
628:           <div className="field">
629:             <label>New people from these domains</label>
630:             <div className="row" style={{ gap: 8 }}>
631:               <select className="select" aria-label="Provisioning" value={form.jitProvisioning ? "jit" : "invite"} onChange={(e) => setForm({ ...form, jitProvisioning: e.target.value === "jit" })}>
632:                 <option value="invite">Admins add them first</option>
633:                 <option value="jit">Join automatically as…</option>
634:               </select>
635:               {form.jitProvisioning && <RoleSelect label="Default role" value={form.defaultRole} onChange={(r) => setForm({ ...form, defaultRole: r })} max="approver" />}
636:             </div>
637:           </div>
638:         </div>
639:         <div>
640:           <button className="btn btn--primary" type="submit" disabled={save.isPending}>
641:             <Plus size={15} aria-hidden /> Add connection
642:           </button>
643:         </div>
644:       </form>
645:       )}
646:       <div className="panel row" style={{ gap: 12, justifyContent: "space-between" }}>
647:         <div className="stack" style={{ gap: 4 }}>
648:           <strong>
649:             <ShieldCheck size={15} aria-hidden style={{ verticalAlign: "-2px" }} /> Require SSO for everyone
650:           </strong>
651:           <span className="muted" style={{ fontSize: 13 }}>
652:             When on, only sessions from this organization's own SSO can open its workspaces — including yours. {owner ? "" : "Only owners can change this."}
653:           </span>
654:         </div>
655:         <button className={`btn ${tenant.settings.requireSso ? "" : "btn--primary"}`} disabled={!owner || requireSso.isPending} onClick={() => requireSso.mutate(!tenant.settings.requireSso)}>
656:           {tenant.settings.requireSso ? "Required — turn off" : "Require SSO"}
657:         </button>
658:       </div>
659:     </div>
660:   );
661: }
662:
663: function Audit({ tenantId }: { tenantId: string }) {
664:   const events = useQuery({ queryKey: ["tenant", tenantId, "activity"], queryFn: () => api.get<ActivityEvent[]>(`/tenants/${tenantId}/activity?limit=200`) });
665:   const verify = useQuery({ queryKey: ["tenant", tenantId, "verify"], queryFn: () => api.get<{ valid: boolean; events: number; head?: string }>(`/tenants/${tenantId}/activity/verify`) });
666:   return (
667:     <div className="stack" style={{ gap: 12 }}>
668:       {verify.data && (
669:         <div className="panel row" role="status" style={{ gap: 8 }}>
670:           <span className={`status status--${verify.data.valid ? "verified" : "at-risk"}`}>{verify.data.valid ? "✓ Chain intact" : "! Chain broken"}</span>
671:           <span className="muted">
672:             {verify.data.events} organization events, hash-chained like workspace audit trails
673:             {verify.data.head ? ` · head ${verify.data.head.slice(0, 12)}…` : ""}
674:           </span>
675:         </div>
676:       )}
677:       <div className="panel" style={{ padding: 0 }}>
678:         <table className="table">
679:           <thead>
680:             <tr>
681:               <th>When</th>
682:               <th>Who</th>
683:               <th>What</th>
684:             </tr>
685:           </thead>
686:           <tbody>
687:             {(events.data ?? []).map((e) => (
688:               <tr key={e.id}>
689:                 <td className="mono" style={{ whiteSpace: "nowrap" }}>
690:                   {e.at.slice(0, 16).replace("T", " ")}
691:                 </td>
692:                 <td>{e.actor}</td>
693:                 <td>{e.summary}</td>
694:               </tr>
695:             ))}
696:           </tbody>
697:         </table>
698:       </div>
699:     </div>
700:   );
701: }

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

FILE Dockerfile SHA256 3b6a96616e2d15f8f110b0f63c7d7de17ec496555151b6e3ab4505b2de398d2b
1: FROM node:22-bookworm-slim AS build
2:
3: WORKDIR /app
4: RUN corepack enable
5:
6: COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
7: COPY apps/server/package.json apps/server/package.json
8: COPY apps/web/package.json apps/web/package.json
9: COPY packages/agents/package.json packages/agents/package.json
10: COPY packages/core/package.json packages/core/package.json
11: COPY packages/design/package.json packages/design/package.json
12: COPY packages/frameworks/package.json packages/frameworks/package.json
13: RUN pnpm install --frozen-lockfile
14:
15: COPY . .
16: RUN pnpm build
17:
18: FROM node:22-bookworm-slim
19:
20: WORKDIR /app
21: COPY --from=build --chown=node:node /app /app
22: RUN mkdir -p /app/data && chown node:node /app/data
23:
24: USER node
25: EXPOSE 8787
26: CMD ["node", "--disable-warning=ExperimentalWarning", "apps/server/src/index.ts"]

FILE compose.yaml SHA256 34296e6c30d03095d8483fbc331900caf6c1943d9e33c4a08530922ab2c93ab9
1: services:
2:   visua:
3:     build: .
4:     ports:
5:       - "127.0.0.1:${VISUA_HOST_PORT:-8787}:8787"
6:     environment:
7:       NODE_ENV: development
8:       VISUA_PORT: "8787"
9:       VISUA_PUBLIC_URL: "http://localhost:${VISUA_HOST_PORT:-8787}"
10:       VISUA_AUTH_MODE: dev
11:       VISUA_AGENT_MODE: offline
12:       VISUA_DATABASE_URL: /app/data/visua.db
13:     volumes:
14:       - visua-data:/app/data
15:     healthcheck:
16:       test: ["CMD", "node", "-e", "fetch('http://127.0.0.1:8787/api/health').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"]
17:       interval: 10s
18:       timeout: 5s
19:       retries: 12
20:       start_period: 30s
21:     init: true
22:     restart: unless-stopped
23:
24: volumes:
25:   visua-data:

FILE .dockerignore SHA256 b69c12617a8a40e5ecde492305757c2b3b7a8a2466285d092e7d33597ea89eec
1: .git
2: **/node_modules
3: **/dist
4: **/.local
5: .screens
6: .check
7: test-results
8: playwright-report
9: blob-report
10: data
11: apps/server/data
12: docs
13: e2e
14: .env
15: .env.*
16: **/.env
17: **/.env.*
18: *.db
19: *.db-*
20: *.log
21:
22: # Keep licensed AICPA material and derived data out of the image.
23: corpus/aicpa-soc2
24: packages/frameworks/data/aicpa-*.json
25: packages/frameworks/data/mappings/*tsc-2017*.json
26: packages/frameworks/data/chunks/aicpa-soc2.json

FILE scripts/check.ts SHA256 bd2720e33a2a0400328f2db509a6087ea4f0a35854d394a8d149435978c6df1b
1: /**
2:  * Local CI: every check the repository expects before a change lands, in one command,
3:  * with a summary and a non-zero exit code when anything fails. Each step's full output
4:  * goes to .check/<step>.log (git-ignored); a failing step's tail is printed.
5:  *
6:  *   pnpm check                 everything: licensing guard, typecheck, unit tests on SQLite
7:  *                              and Postgres, e2e, corpus hashes, DESIGN.md lint
8:  *   pnpm check --quick         licensing guard, typecheck and unit tests on SQLite only
9:  *   pnpm check --no-e2e        skip the Playwright suite
10:  *   pnpm check --no-postgres   skip the Postgres run
11:  *
12:  * The Postgres run uses VISUA_TEST_DATABASE_URL when it is set. Otherwise it starts a
13:  * throwaway postgres:17 container on a free local port and removes it afterwards, so it
14:  * never touches another database on this machine. Without either, the step fails:
15:  * pass --no-postgres to skip it deliberately.
16:  */
17: import { spawn, spawnSync } from "node:child_process";
18: import { createWriteStream, mkdirSync, readFileSync } from "node:fs";
19: import { dirname, join, relative, resolve } from "node:path";
20: import { fileURLToPath } from "node:url";
21:
22: const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
23: const LOGS = join(ROOT, ".check");
24: const flag = (name: string) => process.argv.includes(`--${name}`);
25: const quick = flag("quick");
26: const withE2e = !quick && !flag("no-e2e");
27: const withPostgres = !quick && !flag("no-postgres");
28:
29: type Outcome = "passed" | "failed" | "skipped";
30: interface Result {
31:   name: string;
32:   outcome: Outcome;
33:   seconds: number;
34:   note?: string;
35: }
36: const results: Result[] = [];
37:
38: // ------------------------------------------------------------------ running steps
39:
40: function slug(name: string): string {
41:   return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
42: }
43:
44: /** Runs a command with its output in .check/<step>.log; resolves with the exit code. */
45: function run(name: string, command: string, args: string[], env: NodeJS.ProcessEnv = {}): Promise<{ code: number; log: string }> {
46:   const log = join(LOGS, `${slug(name)}.log`);
47:   const out = createWriteStream(log);
48:   return new Promise((done) => {
49:     const child = spawn(command, args, { cwd: ROOT, env: { ...process.env, NO_COLOR: "1", FORCE_COLOR: "0", ...env }, stdio: ["ignore", "pipe", "pipe"] });
50:     child.stdout.pipe(out, { end: false });
51:     child.stderr.pipe(out, { end: false });
52:     child.on("close", (code) => out.end(() => done({ code: code ?? 1, log })));
53:   });
54: }
55:
56: function tail(log: string, lines = 40): string {
57:   return readFileSync(log, "utf8").trimEnd().split("\n").slice(-lines).join("\n");
58: }
59:
60: /** Vitest's and Playwright's own count line, for the summary. */
61: function counts(log: string): string | undefined {
62:   const text = readFileSync(log, "utf8").replace(/\x1b\[[0-9;]*m/g, "");
63:   const vitest = text.match(/^\s*Tests\s+(.+?)\s*$/m)?.[1];
64:   if (vitest) return vitest.replace(/\s+\(\d+\)$/, "");
65:   const playwright = [...text.matchAll(/^\s*(\d+ (?:passed|failed|flaky|skipped))/gm)].map((m) => m[1]);
66:   return playwright.length ? playwright.join(", ") : undefined;
67: }
68:
69: async function step(name: string, command: string, args: string[], env: NodeJS.ProcessEnv = {}): Promise<void> {
70:   process.stdout.write(`▸ ${name} … `);
71:   const started = Date.now();
72:   const { code, log } = await run(name, command, args, env);
73:   const seconds = (Date.now() - started) / 1000;
74:   const outcome: Outcome = code === 0 ? "passed" : "failed";
75:   results.push({ name, outcome, seconds, note: counts(log) });
76:   console.log(`${outcome} (${seconds.toFixed(0)}s)`);
77:   if (outcome === "failed") console.log(`\n${tail(log)}\n  full log: ${relative(ROOT, log)}\n`);
78: }
79:
80: function skip(name: string, note: string): void {
81:   results.push({ name, outcome: "skipped", seconds: 0, note });
82:   console.log(`▸ ${name} … skipped (${note})`);
83: }
84:
85: function fail(name: string, note: string): void {
86:   results.push({ name, outcome: "failed", seconds: 0, note });
87:   console.log(`▸ ${name} … failed (${note})`);
88: }
89:
90: // ------------------------------------------------------------------ licensing guard
91:
92: /** Licensed text must never be tracked: no file in the index may match an ignore rule. */
93: function licensingGuard(): void {
94:   const name = "Licensing guard";
95:   const res = spawnSync("git", ["ls-files", "--cached", "--ignored", "--exclude-standard"], { cwd: ROOT, encoding: "utf8" });
96:   const tracked = res.stdout.split("\n").filter(Boolean);
97:   if (res.status !== 0) fail(name, `git ls-files exited with ${res.status}`);
98:   else if (tracked.length) {
99:     fail(name, `${tracked.length} git-ignored file(s) are tracked or staged`);
100:     console.log(tracked.map((f) => `    ${f}`).join("\n"));
101:   } else {
102:     results.push({ name, outcome: "passed", seconds: 0, note: "no git-ignored file tracked or staged" });
103:     console.log(`▸ ${name} … passed`);
104:   }
105: }
106:
107: // ------------------------------------------------------------------ Postgres
108:
109: interface Postgres {
110:   url: string;
111:   stop(): void;
112: }
113:
114: function docker(...args: string[]) {
115:   return spawnSync("docker", args, { encoding: "utf8" });
116: }
117:
118: /** A throwaway postgres:17 container on a free 127.0.0.1 port, or a reason why not. */
119: async function throwawayPostgres(): Promise<Postgres | string> {
120:   if (docker("info", "--format", "{{.ServerVersion}}").status !== 0) return "Docker is not running and VISUA_TEST_DATABASE_URL is not set";
121:   const name = `visua-check-${process.pid}`;
122:   const started = docker("run", "-d", "--rm", "--name", name, "-e", "POSTGRES_USER=visua", "-e", "POSTGRES_PASSWORD=visua", "-e", "POSTGRES_DB=visua_test", "-p", "127.0.0.1::5432", "postgres:17");
123:   if (started.status !== 0) return `docker run failed: ${started.stderr.trim()}`;
124:   const stop = () => void docker("rm", "-f", name);
125:   const port = docker("port", name, "5432/tcp").stdout.trim().split(":").pop();
126:   // pg_isready answers during the image's first-start restart too; a query through the
127:   // published port only succeeds once the final server is up.
128:   const deadline = Date.now() + 60_000;
129:   while (Date.now() < deadline) {
130:     const ready = docker("exec", name, "psql", "-h", "127.0.0.1", "-U", "visua", "-d", "visua_test", "-Atc", "select 1");
131:     if (ready.status === 0 && port) return { url: `postgres://visua:visua@127.0.0.1:${port}/visua_test`, stop };
132:     await new Promise((r) => setTimeout(r, 500));
133:   }
134:   stop();
135:   return "the Postgres container did not become ready within 60 s";
136: }
137:
138: // ------------------------------------------------------------------ main
139:
140: mkdirSync(LOGS, { recursive: true });
141: const began = Date.now();
142: let pgHandle: Postgres | undefined;
143: const cleanup = () => pgHandle?.stop();
144: process.on("SIGINT", () => {
145:   cleanup();
146:   process.exit(130);
147: });
148:
149: try {
150:   licensingGuard();
151:   await step("Typecheck", "pnpm", ["typecheck"]);
152:   await step("Unit tests (SQLite)", "pnpm", ["test"], { VISUA_TEST_DATABASE_URL: "" });
153:
154:   if (!withPostgres) skip("Unit tests (Postgres)", quick ? "--quick" : "--no-postgres");
155:   else {
156:     const given = process.env["VISUA_TEST_DATABASE_URL"];
157:     const pg = given ? { url: given, stop: () => undefined } : await throwawayPostgres();
158:     if (typeof pg === "string") fail("Unit tests (Postgres)", `${pg}; pass --no-postgres to skip`);
159:     else {
160:       pgHandle = pg;
161:       await step("Unit tests (Postgres)", "pnpm", ["test"], { VISUA_TEST_DATABASE_URL: pg.url });
162:       cleanup();
163:       pgHandle = undefined;
164:     }
165:   }
166:
167:   if (withE2e) await step("End-to-end (Playwright)", "pnpm", ["test:e2e"]);
168:   else skip("End-to-end (Playwright)", quick ? "--quick" : "--no-e2e");
169:
170:   if (quick) {
171:     skip("Corpus hashes", "--quick");
172:     skip("DESIGN.md lint", "--quick");
173:   } else {
174:     await step("Corpus hashes", "pnpm", ["corpus:verify"]);
175:     await step("DESIGN.md lint", "pnpm", ["design:lint"]);
176:   }
177: } finally {
178:   cleanup();
179: }
180:
181: const failed = results.filter((r) => r.outcome === "failed");
182: const width = Math.max(...results.map((r) => r.name.length));
183: const mark: Record<Outcome, string> = { passed: "✓", failed: "✗", skipped: "–" };
184: console.log(`\n${"─".repeat(width + 30)}`);
185: for (const r of results) console.log(`${mark[r.outcome]} ${r.name.padEnd(width)}  ${r.outcome.padEnd(7)} ${r.seconds ? `${r.seconds.toFixed(0).padStart(4)}s` : "     "}  ${r.note ?? ""}`);
186: console.log(`${"─".repeat(width + 30)}\n${failed.length ? `${failed.length} failed` : "All checks passed"} in ${((Date.now() - began) / 1000).toFixed(0)}s · logs in ${relative(ROOT, LOGS)}/`);
187: process.exit(failed.length ? 1 : 0);
