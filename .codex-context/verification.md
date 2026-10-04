# Verification and control lifecycle

Run commands below from the repository root. The existing authorities are
[CLAUDE.md](../CLAUDE.md), [package scripts](../package.json), and
[the local check runner](../scripts/check.ts). No hosted CI or format script
is configured. Python 3 is needed only for the context helper; application
checks need Node >=22.18, pnpm 10.33.0, and installed workspace dependencies.
No dependencies were installed for adoption.

## Commands and delivery boundaries

Costs below are relative estimates from the scripts, not measured timings.
Every application command in this table was **not run during adoption**.

| Command | Tier and trigger / delivery boundary | Prerequisites, cost, and side effects |
| --- | --- | --- |
| `pnpm exec vitest run packages/core/test/core.test.ts` | Focused example for domain changes; substitute the affected suite. | Same runner/config as `pnpm test`; small relative to integration. Test inputs and dependencies must exist. |
| `pnpm typecheck` | Integration; required with tests before committing by `CLAUDE.md`. | All workspace TypeScript projects; low/moderate cost, no service startup. |
| `pnpm test` | Integration; required with typecheck before committing. | Vitest unit/API/storage/auth suites; default SQLite memory stores. Unset `VISUA_TEST_DATABASE_URL` for SQLite-only execution. Tests can bind local mock servers. 30-second per-test timeout. |
| `VISUA_TEST_DATABASE_URL='<test database URL>' pnpm test` | Integration for database, tenancy, transactions, or multi-instance changes; included in full local check. | Dedicated test PostgreSQL with schema creation rights; creates unique schemas and drops them afterward. Do not record credentials. Greater cost than SQLite. |
| `pnpm check --quick` | Integration feedback: licensing guard, typecheck, SQLite tests. | Explicitly clears `VISUA_TEST_DATABASE_URL` for its SQLite step; overwrites `.check/<step>.log`. Skips Postgres, e2e, corpus, and design lint. |
| `pnpm check` | Full local delivery check described by `CLAUDE.md`; use for changes needing all lanes. | Adds PostgreSQL, e2e, corpus hashes, design lint. Uses configured test DB or starts/removes a `postgres:17` Docker container; may download the image. Fails the PostgreSQL step if neither is available. Multi-minute expectation, unmeasured. `--no-e2e` / `--no-postgres` are explicit omissions, not equivalent full passes. |
| `pnpm test:e2e` | Integration required when changing the web app. | Installed Playwright Chromium, free port 8799, dev auth and demo seeding enabled. Rebuilds web output, starts API with offline agents and `VISUA_DB=:memory:`. Unset `VISUA_DATABASE_URL`, which overrides that setting; avoid production auth settings. One worker, 90-second tests, 240-second server startup. Retains failure traces. |
| `pnpm design:lint` then `pnpm design:tokens` | Targeted integration after `DESIGN.md` changes. | Lints design source, then overwrites tracked CSS/TS tokens. Review generated diff; low cost. |
| `pnpm corpus:verify` | Targeted integration after corpus changes; part of full check. | Hashes local files against manifests. Missing restricted files are allowed; missing redistributable files or mismatches fail. Read-only corpus scan, no downloads. |
| `pnpm ingest` | Regeneration required after corpus or ingestion changes, followed by framework tests and corpus verification. | Reads local corpus and rewrites generated framework data. Restricted local copies affect generated outputs; inspect licensing exclusions before staging. Moderate cost, unmeasured. |
| `pnpm screens` | Extended visual review for scene/layout changes. | Playwright browser, free port 8813 by default; rebuilds web, starts offline demo API, captures three viewport sizes in ignored `.screens/`. Same database/auth environment precautions as e2e. Multi-view browser cost. |
| `pnpm screens --docs` | Extended, only when intentionally refreshing documentation images. | Also rewrites tracked `docs/images/` screenshots. |

The e2e and screenshot harnesses inherit environment variables; their memory
DB setting alone does not override `VISUA_DATABASE_URL`. Inspect the selected
harness and current configuration before running it.

## Evidence and invalidation

A focused pass doesn't replace an applicable integration boundary. Reuse a
result only while source, tests, lockfile/dependencies, runner configuration,
runtime, environment, database backend, and relevant corpus artifacts remain
unchanged. Clock-driven scope, evidence expiry, and SSO checks also depend on
time inputs. Record the command, revision/diff, backend, and result at delivery.

Existing failure coverage includes
[transaction rollback/concurrency tests](../apps/server/test/storage.test.ts),
[relay reconnect tests](../apps/server/test/relay.test.ts),
[DNS outcome tests](../apps/server/test/domain-recheck.test.ts),
[SSO recheck tests](../apps/server/test/sso-recheck.test.ts), and
[egress tests](../apps/server/test/egress.test.ts). They are regression tests,
not evidence of executed production failure drills. No dedicated load-test
runner or live failure-testing facility was identified.

## Recurring controls and retention

Keep checks in `scripts/check.ts`, Vitest, or Playwright. The licensing guard
rejects tracked/staged files matching ignore rules. Adding a recurring check
requires a concrete coverage gap and an appropriate existing suite; review
scope, incremental cost, owner, and maintenance needs in the normal change.
There is no separate control admission/lifecycle registry, assigned control
owner, automated review cadence, or total runtime budget configured.

Vitest and Playwright enforce the per-test/startup timeouts above, not an
overall delivery budget. `.check/` logs are overwritten per step;
Playwright retains traces on failure; `.screens/` is ignored. No automatic
age/count retention or context-byte budget is configured. Context notes remain
project-owned; a retention observation is not authorization to delete them.

Before adoption, the loaded global instruction file was 1,657 bytes, with no
on-disk ancestor/root Codex instructions or configured fallback filenames.
It mandated no extra routine startup files. `CLAUDE.md` was 5,397 bytes and
its referenced README/architecture were 18,990/43,349 bytes; these were existing
project guidance, not active Codex fallback instructions. New routine startup
loads the root router plus `project.md`, leaving deeper docs task-driven.
Measure with `wc -c AGENTS.md .codex-context/project.md`; add the effective
global instructions to calculate the full routine instruction/context bytes.
At adoption, the root router was 971 bytes and `project.md` was 2,472 bytes:
3,443 project bytes, or 5,100 including the global instruction file. This is
a byte count, not a token or total conversation-context measurement.

## Adoption validation

The adoption boundary is valid startup paths, resolvable local context links,
a working read-only status helper, an idempotent install preview, and preserved
existing files. It does not require application execution or a commit.
Validated on September 29, 2026, at HEAD
`c3ad38c36497ad9b25b055055908d9e4fb0fd1ce`:

- `python3 .codex-context/bin/context.py status --repo .`: passed; branch
  `feat/light-workspace-design`, valid startup declaration, no session notes.
- Bundled `adopt.py --repo /Users/artem/visua` preview after installation:
  all destinations preserved; no pending installation changes.
- Local Markdown link scan: all 70 context links resolved.
- SHA-256 comparison with the pre-install snapshot: all 524 existing files
  unchanged, including the user's README and Docker working changes.
- Workflow, continuity, optional review, templates, and helper match the
  installed skill bundle. The helper was not customized.
- `git diff --check`: passed for the tracked working diff. All 15 new files
  passed `git diff --no-index --check` against empty files as well.

Application checks, browsers, database services, and deployments were not run.
Reading scripts and previous test claims does not establish a current pass.
