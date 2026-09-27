# Visua

**See your compliance. Prove every claim.**

Visua is an AI-first, agentic compliance automation platform with a working 3D interface.
Frameworks are rendered as navigable space: requirements are objects, implementation
maturity is height, the gap to target is visible glass, tasks and evidence orbit the
requirements they serve, and agents move through the scene as they work. Every agent
action is cited to the official framework text, recorded in a flight recorder and applied
only after a person approves it, unless that person has granted autonomy for that kind
of change.

Visua is built for any niche and any cyber-maturity level. It starts with NIST CSF 2.0 as
the common language, then adds SOC 2 and the NIST Risk Management Framework with
SP 800-53 Rev. 5. The frameworks are ordered by increasing depth, and one program
connects them. For organizations that build or deploy AI, the NIST AI RMF with its
Generative AI Profile adds an AI governance program on the same foundation, NIST's
draft Cyber AI Profile and SP 800-53 AI overlays specialize CSF and SP 800-53 for AI
systems, the U.S. state AI laws become scoped obligations, and MITRE ATLAS and the
OWASP Top 10s show which AI threats the program addresses.

![The Observatory: NIST CSF 2.0 as a navigable constellation](docs/images/observatory-csf.jpg)

## What it does

| Area | What you get |
|---|---|
| **Observatory (3D + 2D twin)** | Every framework as a constellation or readiness terrain: 106 CSF outcomes, 61 SOC 2 criteria, all 1,014 SP 800-53 controls and enhancements, 47 RMF tasks, 72 AI RMF outcomes and 187 state-law obligations. Lenses (status, gap, evidence, priority, crosswalk, AI overlay) recolor the same space. Threat catalogs open in the same space with height = coverage. Labels are drawn at the type scale and never overlap each other or the HUD, and the camera frames the scene around the panels at any window size. A keyboard-first outline mirrors every object (on phones it opens first, with the 3D scene one tap away), and the scene respects reduced motion. |
| **Crosswalk Nexus (3D)** | All frameworks on one ring, with 2,188 authoritative mappings bundled into arcs (998 in a fresh clone; the AICPA sets need the local AICPA copy): NIST OLIR (CSF 2.0 ↔ SP 800-53 5.2.0, ↔ SP 800-37r2), AICPA (TSC ↔ SP 800-53 r5), and composed and editorial sets that are labeled as such. An inner **threat ring** bundles the published links from ATLAS tactics, OWASP entries and NIST AI 100-2 objectives onto requirement groups; each arc shows its strongest link's status (final solid, draft dashed, unreviewed dotted). Select a group to see every unit-level mapping with live status on both sides. *A mapping is never evidence.* |
| **Agents** | Eight glass-box agents: Copilot, Assessor, Planner, Policy Author, Evidence Collector, Crosswalk Analyst, Audit Prep and Task Executor. They run on Claude (streamed tool loop, adaptive thinking, prompt caching, server-side fallbacks) or as deterministic offline playbooks. Either way they use the same tools, citations and approval flow: the Copilot answers about a state law or an ATLAS technique with citations, and even an automated check's result reaches the evidence locker only as a proposal. |
| **NIST CSF 2.0** | Organizational Profiles (Current/Target, official CSV template), the CSWP 29 Tier self-assessment, 363 Implementation Examples as checklists, maturity-adaptive targets and priorities. |
| **SOC 2** | Scope by Trust Services Category, Type 1 or Type 2, and the observation window. Readiness by series, the DC 200 system-description checklist drafted from recorded facts, and a PBC request list. |
| **NIST RMF / SP 800-53** | The seven-step lifecycle. FIPS 199 categorization (high-water mark) selects the SP 800-53B baseline. Tailoring requires a rationale. The authorization decision is recorded, never made by Visua. OSCAL 1.1.2 SSP and POA&M export. |
| **AI governance (NIST AI RMF)** | An AI system inventory (purpose, role, lifecycle stage, risk tier, data, human oversight) and readiness across GOVERN, MAP, MEASURE and MANAGE, with 460 Playbook suggested actions as checklists. When any system is generative, the NIST AI 600-1 Generative AI Profile applies: its 12 GAI risks and 212 actions, tracked through the outcomes they attach to. Texas's TRAIGA makes substantial compliance with that profile an affirmative defense. An AI RMF profile export and an AI governance policy template are included. |
| **AI security overlays (NIST drafts)** | The Cyber AI Profile (NIST IR 8596 iprd) on CSF 2.0: considerations and a proposed priority for each of the 106 subcategories per focus area (Secure, Defend, Thwart), adoptable per workspace, with an overlay lens and an optional priority raise. COSAiS (SP 800-53 Control Overlays for Securing AI Systems) on SP 800-53: the predictive-AI overlay's 59 controls brought into scope on adoption, with their tailoring and NIST AI 100-2 attacks. Drafts are always labeled as drafts. |
| **U.S. state AI laws** | 26 laws and regulations in California, Colorado, Illinois, Maine, New York, New York City, Texas and Utah, with 187 obligations quoted from the enrolled statutes and adopted regulations. Record the role you hold under each law's own definitions (developer, deployer, employer, operator…) and Visua scopes exactly those obligations, with an effective-date timeline (by month, with a list view), safe harbors (including those that recognize the NIST AI RMF) and enforcement. Readiness counts the obligations in force today; upcoming ones are prepared for and tracked apart, and ended ones drop out on their date. A tracking tool, not legal advice. |
| **AI threat views** | MITRE ATLAS 2026.09 (the tactic × technique matrix), the OWASP Top 10 for LLM Applications 2026 (and 2025, with each entry's counterpart) and for Agentic Applications 2026, and NIST AI 100-2's 25 attacks. Threats are never assessed: coverage is derived from the requirements that MITRE, OWASP and NIST link to each threat, directly, through an ATLAS mitigation or through the other OWASP edition. Every link shows its publisher and status (final, draft, unreviewed, superseded), and one filter decides which count. A threat's linked requirements are grouped by publication and by route, and the ATLAS matrix is navigable with the arrow keys. |
| **Evidence & monitoring** | Evidence with provenance (source, SHA-256, reviewer, validity window, freshness), plus connectors for web posture (TLS, HSTS, security headers, security.txt) and repository hygiene. |
| **Integrity guardrails** | A hash-chained, tamper-evident audit trail. "Not applicable" requires a written rationale, and scope changes never overwrite it. Agents never file plans as evidence. The trust center publishes computed facts only. Visua never issues audit opinions. |

| | |
|---|---|
| ![Crosswalk Nexus](docs/images/crosswalk-nexus.jpg) | ![SP 800-53 Rev. 5, full catalog](docs/images/observatory-800-53.jpg) |
| ![Mission control](docs/images/home.jpg) | ![NIST RMF program](docs/images/rmf.jpg) |
| ![AI governance with the NIST AI RMF](docs/images/ai-governance.jpg) | ![SOC 2 program](docs/images/soc2.jpg) |
| ![MITRE ATLAS matrix with coverage from linked requirements](docs/images/threats-atlas.jpg) | ![The Nexus threat ring: OWASP LLM01 linked to AI RMF, SP 800-53 and CSF groups](docs/images/nexus-threat-ring.jpg) |

## Quick start

Requirements: **Node.js ≥ 22.18** (native TypeScript and `node:sqlite`) and **pnpm 10**.

```sh
pnpm install
pnpm dev            # API on :8787 (seeds the Northwind Health demo), web on :5173
```

Open <http://localhost:5173> and pick a demo persona on the sign-in screen (developer
mode). Each persona has a different role in the fictional Northwind Health organization;
Taylor Brooks belongs to a second organization, Contoso Bank, and cannot see Northwind's
data. The framework data is pre-built in `packages/frameworks/data/`. To rebuild it from
the local corpus, run `pnpm ingest`.

Production-style run: `pnpm build && pnpm start`. The API serves the built web app on
:8787.

### AI engine

| Variable | Default | Meaning |
|---|---|---|
| `ANTHROPIC_API_KEY` | — | Enables Claude-powered agents (`VISUA_AGENT_MODE=auto`). Without it, agents run the offline playbooks. |
| `VISUA_AGENT_MODE` | `auto` | `auto`, `claude` or `offline` |
| `VISUA_MODEL` | `claude-opus-5` | Model used by the agents |
| `VISUA_AICPA_AI_USE` | — | Set to `permitted` only if your organization holds AICPA's written permission to send AICPA text to AI services (see below). |
| `VISUA_PORT` / `VISUA_SEED` | `8787` / on | Server port, demo seeding |
| `VISUA_DATABASE_URL` | `data/visua.db` | `postgres://user:pass@host:5432/db` for PostgreSQL, or a SQLite file path (`:memory:` works). `VISUA_DB` is accepted as a SQLite path too. |

### Sign-in, roles and organizations

Every workspace belongs to an **organization** (tenant). People reach an organization's
workspaces only through a membership, and their **role** decides what they can do:

| Role | Can |
|---|---|
| Owner | everything, including owners, the "Require SSO" setting and which identity provider an SSO connection trusts |
| Admin | workspaces, frameworks, scope, agent autonomy, connectors, members, API tokens, and running SSO connections (enable, disable, provisioning) |
| Approver | decide agent proposals, approve policies, accept evidence, mark requirements not applicable or verified, categorize, tailor and record authorization decisions |
| Contributor | assess requirements (levels, priority, owner, notes), manage tasks, upload evidence, draft policies, run agents and connectors |
| Auditor | read everything, export reports and verify the audit trail |
| Viewer | read dashboards and the 3D views |

- **Single sign-on.** Each organization can connect its own OpenID Connect provider
  (Okta, Microsoft Entra ID, Google Workspace, Keycloak…): authorization code flow with
  PKCE, state and nonce, bound to the browser that started it. People are routed to it
  by email domain once the organization proves the domain with a DNS TXT record, can be
  provisioned on first sign-in with a default role, and their sessions reach that
  organization only. The first organization to prove a domain holds it. Whoever controls a connection's provider can
  sign in as any member on its domains, so only owners choose the provider, client and
  domains; a new provider never inherits the old one's client secret. An owner can
  require the organization's SSO for every session. The server never reaches an
  organization's provider (discovery, token and key endpoints) on a private, loopback or
  link-local address unless the operator allows that host (`VISUA_OIDC_PRIVATE_ISSUERS`).
  A platform-wide provider (`VISUA_OIDC_*`) can be configured too; it links an existing
  account by email only when the email is verified.
- **API tokens** act in one organization with a chosen role (never owner), are shown
  once and stored as SHA-256 hashes, and can expire or be revoked.
- **Sessions** are random tokens in an HttpOnly, SameSite=Lax cookie (`__Host-` and
  Secure over HTTPS), stored hashed, with absolute and idle timeouts. State-changing
  requests carry a per-session CSRF token and, in production, must come from Visua's
  own origin. Security headers include a Content-Security-Policy.
- **Audit.** Every change records the authenticated person (`actorId`) in the
  hash-chained audit trail. Membership, token and SSO changes go to the organization's
  own chained trail.

| Variable | Default | Meaning |
|---|---|---|
| `VISUA_AUTH_MODE` | `dev` (`oidc` when `NODE_ENV=production`) | `dev` adds password-less developer sign-in with demo personas. It is refused in production. |
| `VISUA_PUBLIC_URL` | `http://localhost:8787` | External URL: OIDC redirect URI (`/api/auth/oidc/callback`), secure cookies over HTTPS, allowed origin |
| `VISUA_SECRET` | — | At least 32 characters. Encrypts SSO client secrets at rest (AES-256-GCM). Required in production before storing a client secret. |
| `VISUA_OIDC_ISSUER`, `VISUA_OIDC_CLIENT_ID`, `VISUA_OIDC_CLIENT_SECRET`, `VISUA_OIDC_NAME` | — | Optional platform identity provider |
| `VISUA_OIDC_PRIVATE_ISSUERS` | — | Hosts an organization's SSO connection may reach on a private address, e.g. `keycloak.internal,10.0.0.5` (`*` for any). Needed for an internal identity provider; otherwise refused, so a tenant cannot make the server call your internal network. |
| `VISUA_SSO_DOMAIN_VERIFICATION` | `dns` | `dns`: an SSO connection's email domains route sign-ins and admit people only once proven by a TXT record at `_visua-challenge.<domain>`. `off`: domains are trusted as claimed (single-organization installations). Domains added before this check existed stay verified ("grandfathered"). |
| `VISUA_OIDC_TRUST_EMAIL` | — | Set to `1` only if the platform provider verifies every email it asserts but sends no `email_verified` claim. Otherwise an unverified email never links to an existing account. |
| `VISUA_BOOTSTRAP_OWNER_EMAIL`, `VISUA_BOOTSTRAP_ORG_NAME` | — | First owner of a new installation (or of an unowned upgraded one) |
| `VISUA_SESSION_HOURS`, `VISUA_SESSION_IDLE_MINUTES` | `12`, `120` | Session lifetime and idle timeout |
| `VISUA_ALLOWED_ORIGINS` | — | Extra origins allowed to send state-changing requests (comma-separated) |

A production start looks like:

```sh
NODE_ENV=production VISUA_PUBLIC_URL=https://visua.example.com VISUA_SECRET=… \
VISUA_DATABASE_URL=postgres://visua:…@db:5432/visua \
VISUA_OIDC_ISSUER=https://login.example.com VISUA_OIDC_CLIENT_ID=visua VISUA_OIDC_CLIENT_SECRET=… \
VISUA_BOOTSTRAP_OWNER_EMAIL=ciso@example.com pnpm start
```

## Official documentation corpus and licensing

Every requirement and citation traces to local, hash-verified copies of the official
publications in [`corpus/`](corpus/). There are 277 documents with manifests, SHA-256
hashes and verbatim license notices. `pnpm corpus:verify` checks them all.

- **NIST** material (CSF 2.0, SP 800-37/53/53A/53B/60, FIPS 199/200, OSCAL, OLIR
  crosswalks, the AI RMF with its Playbook and the Generative AI Profile, and related
  AI guidance) is public domain and ships in the repository.
- **State statutes and regulations** are public legislative and regulatory records.
  Five files whose publishers claim copyright are kept local, outside git.
- **MITRE ATLAS** (Apache-2.0) and the **OWASP** Top 10s and GenAI Security Crosswalk
  (CC BY-SA 4.0) ship with their notices; files derived from OWASP text stay
  CC BY-SA 4.0 ([`packages/frameworks/data/NOTICE.md`](packages/frameworks/data/NOTICE.md)).
  MITRE's SAFE-AI report is all rights reserved and stays local.
- **AICPA** material (Trust Services Criteria, DC 200, AICPA mappings) is © AICPA and is
  **not redistributed**. A fresh clone runs SOC 2 on Visua's own skeleton: criterion IDs
  with titles and summaries written by Visua. An installation that holds its own copy
  gets the verbatim criteria, 330 points of focus and 1,190 AICPA mapping links. By
  default that text is withheld from language models. See
  [`corpus/README.md`](corpus/README.md).

## Architecture

```
corpus/ (official PDFs, JSON, XLSX, OSCAL)
   │  pnpm ingest
   ▼
packages/frameworks ── graphs · overlays · crosswalk and threat-link sets · BM25 corpus index (page-level citations)
packages/core ──────── domain model · scoring · status · planner · crosswalk projection · CSF tiers · FIPS 199
packages/agents ────── 8 agents · 16 tools · Claude runtime · offline playbooks · policy composer
apps/server ────────── Hono API · SQLite or Postgres storage · SSE events · connectors · exports (CSV, Markdown, OSCAL)
apps/web ───────────── React 19 · react-three-fiber Observatory & Nexus · TanStack Query · DESIGN.md tokens
packages/design ────── DESIGN.md → CSS variables + typed tokens
```

Details: [`docs/architecture.md`](docs/architecture.md). Design system:
[`DESIGN.md`](DESIGN.md) (Google Labs DESIGN.md format, lint-clean). Roadmap:
[`docs/roadmap.md`](docs/roadmap.md). Market research:
[`docs/research/delve-competitive-analysis.md`](docs/research/delve-competitive-analysis.md).

## Development

```sh
pnpm check           # local CI: every check below, with a summary (--quick: guard, typecheck, SQLite tests)
pnpm typecheck       # all packages (TypeScript 7)
pnpm test            # 171 unit, API, storage and auth tests (Vitest; add VISUA_TEST_DATABASE_URL=postgres://… for Postgres)
pnpm test:e2e        # 21 Playwright end-to-end tests against the production build (WebGL via SwiftShader)
pnpm screens         # screenshots of every view at 1440×900, 1024×768 and 390×844 into .screens/ (git-ignored)
pnpm screens --docs  # regenerate the README images in docs/images/
pnpm design:lint     # DESIGN.md lint
pnpm design:tokens   # regenerate tokens from DESIGN.md
pnpm corpus:verify   # SHA-256 check of the local corpus
pnpm ingest          # rebuild framework data from the corpus
```

## Status

Version 0.1: a working foundation across CSF 2.0, SOC 2, NIST RMF / SP 800-53, the
NIST AI RMF with NIST's AI security overlays, the U.S. state AI laws, and AI threat views
(MITRE ATLAS, OWASP, NIST AI 100-2). It includes the 3D Observatory and Nexus, eight
agents, an evidence engine, exports and a trust center, with organizations, roles, SSO
and PostgreSQL storage for multi-tenant hosting. See the
roadmap, and [`docs/research/ai-governance-landscape.md`](docs/research/ai-governance-landscape.md)
for the AI governance options that come next.
