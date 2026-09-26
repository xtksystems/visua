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
Generative AI Profile adds an AI governance program on the same foundation.

![The Observatory: NIST CSF 2.0 as a navigable constellation](docs/images/observatory-csf.jpg)

## What it does

| Area | What you get |
|---|---|
| **Observatory (3D + 2D twin)** | Every framework as a constellation or readiness terrain: 106 CSF outcomes, 61 SOC 2 criteria, all 1,014 SP 800-53 controls and enhancements, 47 RMF tasks and 72 AI RMF outcomes. Lenses (status, gap, evidence, priority, crosswalk) recolor the same space. A keyboard-first outline mirrors every object, and the scene respects reduced motion. |
| **Crosswalk Nexus (3D)** | All frameworks on one ring, with 2,188 authoritative mappings bundled into arcs (998 in a fresh clone; the AICPA sets need the local AICPA copy): NIST OLIR (CSF 2.0 ↔ SP 800-53 5.2.0, ↔ SP 800-37r2), AICPA (TSC ↔ SP 800-53 r5), and composed and editorial sets that are labeled as such. Select a group to see every unit-level mapping with live status on both sides. *A mapping is never evidence.* |
| **Agents** | Eight glass-box agents: Copilot, Assessor, Planner, Policy Author, Evidence Collector, Crosswalk Analyst, Audit Prep and Task Executor. They run on Claude (streamed tool loop, adaptive thinking, prompt caching, server-side fallbacks) or as deterministic offline playbooks. Either way they use the same tools, citations and approval flow. |
| **NIST CSF 2.0** | Organizational Profiles (Current/Target, official CSV template), the CSWP 29 Tier self-assessment, 363 Implementation Examples as checklists, maturity-adaptive targets and priorities. |
| **SOC 2** | Scope by Trust Services Category, Type 1 or Type 2, and the observation window. Readiness by series, the DC 200 system-description checklist drafted from recorded facts, and a PBC request list. |
| **NIST RMF / SP 800-53** | The seven-step lifecycle. FIPS 199 categorization (high-water mark) selects the SP 800-53B baseline. Tailoring requires a rationale. The authorization decision is recorded, never made by Visua. OSCAL 1.1.2 SSP and POA&M export. |
| **AI governance (NIST AI RMF)** | An AI system inventory (purpose, role, lifecycle stage, risk tier, data, human oversight) and readiness across GOVERN, MAP, MEASURE and MANAGE, with 460 Playbook suggested actions as checklists. When any system is generative, the NIST AI 600-1 Generative AI Profile applies: its 12 GAI risks and 212 actions, tracked through the outcomes they attach to. Texas's TRAIGA makes substantial compliance with that profile an affirmative defense. An AI RMF profile export and an AI governance policy template are included. |
| **Evidence & monitoring** | Evidence with provenance (source, SHA-256, reviewer, validity window, freshness), plus connectors for web posture (TLS, HSTS, security headers, security.txt) and repository hygiene. |
| **Integrity guardrails** | A hash-chained, tamper-evident audit trail. "Not applicable" requires a written rationale, and scope changes never overwrite it. Agents never file plans as evidence. The trust center publishes computed facts only. Visua never issues audit opinions. |

| | |
|---|---|
| ![Crosswalk Nexus](docs/images/crosswalk-nexus.jpg) | ![SP 800-53 Rev. 5, full catalog](docs/images/observatory-800-53.jpg) |
| ![Mission control](docs/images/home.jpg) | ![NIST RMF program](docs/images/rmf.jpg) |
| ![AI governance with the NIST AI RMF](docs/images/ai-governance.jpg) | ![SOC 2 program](docs/images/soc2.jpg) |

## Quick start

Requirements: **Node.js ≥ 22.18** (native TypeScript and `node:sqlite`) and **pnpm 10**.

```sh
pnpm install
pnpm dev            # API on :8787 (seeds the Northwind Health demo), web on :5173
```

Open <http://localhost:5173>. The framework data is pre-built in
`packages/frameworks/data/`. To rebuild it from the local corpus, run `pnpm ingest`.

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

> **Security note.** This version has no user authentication or tenant isolation. Run it
> locally or behind your own SSO proxy. Do not expose it to the internet.

## Official documentation corpus and licensing

Every requirement and citation traces to local, hash-verified copies of the official
publications in [`corpus/`](corpus/). There are 191 documents with manifests, SHA-256
hashes and verbatim license notices. `pnpm corpus:verify` checks them all.

- **NIST** material (CSF 2.0, SP 800-37/53/53A/53B/60, FIPS 199/200, OSCAL, OLIR
  crosswalks, the AI RMF with its Playbook and the Generative AI Profile, and related
  AI guidance) is public domain and ships in the repository.
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
packages/frameworks ── graphs · crosswalk mapping sets · BM25 corpus index (page-level citations)
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
pnpm typecheck       # all packages (TypeScript 7)
pnpm test            # 53 unit and API integration tests (Vitest)
pnpm test:e2e        # 8 Playwright end-to-end tests against the production build (WebGL via SwiftShader)
pnpm design:lint     # DESIGN.md lint
pnpm design:tokens   # regenerate tokens from DESIGN.md
pnpm corpus:verify   # SHA-256 check of the local corpus
pnpm ingest          # rebuild framework data from the corpus
```

## Status

Version 0.1: a working foundation across CSF 2.0, SOC 2, NIST RMF / SP 800-53 and the
NIST AI RMF. It includes the 3D Observatory and Nexus, eight agents, an evidence engine,
exports and a trust center. It is not yet a hosted multi-tenant service. See the
roadmap, and [`docs/research/ai-governance-landscape.md`](docs/research/ai-governance-landscape.md)
for the AI governance options that come next.
