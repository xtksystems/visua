# Working in the Visua repository

Visua is a pnpm monorepo (Node ≥ 22.18, native TypeScript, `node:sqlite`). Read
`README.md` for the product and `docs/architecture.md` for the internals.

## Commands

- `pnpm dev`: API on :8787 (seeds the demo) and web on :5173
- `pnpm typecheck`, `pnpm test` (Vitest), `pnpm test:e2e` (Playwright against the production build)
- `VISUA_TEST_DATABASE_URL=postgres://… pnpm test` runs the server suites on Postgres too
  (each run uses its own schema and drops it afterwards)
- `pnpm design:lint` after any change to `DESIGN.md`, then `pnpm design:tokens`
- `pnpm ingest` after any change to `corpus/` or `packages/frameworks/src/ingest/*`
- `pnpm corpus:verify` to hash-check the corpus
- `pnpm screens` photographs every view at 1440×900, 1024×768 and 390×844 into `.screens/`
  (git-ignored) with a contact sheet and an overflow report; `pnpm screens --docs` refreshes
  the README images

Run `pnpm typecheck && pnpm test` before committing. Run `pnpm test:e2e` when you
change the web app. `pnpm check` is the local CI (there is no hosted CI): a licensing
guard (no git-ignored file tracked or staged), typecheck, unit tests on SQLite and on
Postgres (`VISUA_TEST_DATABASE_URL`, or a throwaway Docker container), e2e, corpus
hashes and the DESIGN.md lint; `--quick` runs the first three.

## Rules

- **Design.** All visual values come from `DESIGN.md` tokens: CSS variables
  (`var(--color-…)`) in the web app, and `designSystem` / `TOKENS` in scenes. Never
  hard-code colors.
  - Status colors are semantic and always paired with a glyph or label.
  - Aurora Violet (`tertiary`) is reserved for agent activity. AI governance frameworks
    (NIST AI RMF) use Circuit Copper (`framework-ai`), never violet.
- **Citations.** Framework statements must come from the ingested graphs or the
  corpus index, with a citation (document id, locator, page). Do not write requirement
  text by hand. The one exception is the Visua-authored SOC 2 skeleton, which must stay
  in Visua's own words.
- **Official counts are tested.** If an ingest change moves a count (106 CSF outcomes,
  1,014 SP 800-53 units, 47 RMF tasks, 61 TSC criteria, 72 AI RMF outcomes, 12 GAI
  risks and 212 Generative AI Profile actions; ATLAS 2026.09's 16 tactics, 120
  techniques, 88 sub-techniques and 40 mitigations; 10 entries in each OWASP Top 10;
  25 NIST AI 100-2 attacks), the change is wrong unless the official source changed.
  The state-law counts (26 laws, 187 obligations) are Visua's compilation: change them
  only with a deliberate corpus refresh.
- **Threat catalogs are views, not frameworks.** Never enable or assess a threat catalog.
  Its coverage derives from published threat links (`registry.threatLinks`), and every
  link keeps its authority and status (final, draft, unreviewed, superseded). Don't add
  links Visua wrote itself, and keep them out of the requirement crosswalk.
- **Law codes are node ids.** Never change a published law code; add new ones to
  `CODE_OVERRIDES` in `packages/frameworks/src/ingest/state-laws.ts` when needed.
- **AI RMF text comes from the PDF-based extraction** (`corpus/nist-ai-rmf/ai-rmf-core.json`).
  NIST's own CPRT and Playbook JSON differ from the final AI 100-1 text in dozens of
  statements; don't switch the ingest to them.
- **Licensing.** Never commit framework text whose license does not allow
  redistribution (AICPA, ISO, PCI SSC, MITRE SAFE-AI…), including derived JSON,
  mappings and search chunks; keep such files in a git-ignored `.local/` folder.
  Openly licensed catalogs may be committed with their notices: MITRE ATLAS
  (Apache-2.0) and OWASP (CC BY-SA 4.0; files derived from OWASP text stay CC BY-SA,
  see `packages/frameworks/data/NOTICE.md`).
  - `.gitignore` covers `corpus/aicpa-soc2/**` (except `manifest.json` and
    `STRUCTURE.md`), `packages/frameworks/data/aicpa-*.json`,
    `mappings/*tsc-2017*.json` and `chunks/aicpa-soc2.json`. Check `git status` before
    committing.
  - Licensed text must pass through `modelText()` / `licensedTextToModel()` in
    `packages/agents` before it can reach a language model.
- **Agents propose, people approve.** Agents change state only through
  `host.propose()`. Never let an agent file a plan, guide or template as evidence, mark
  anything verified, or make an authorization or audit decision.
- **Tenancy and access.** Every workspace route must go through `workspaceAccess`
  (404 across organizations) and declare any capability above its floor with `need()` or
  `requireCapability()`. Never trust a client-supplied actor: the actor is the signed-in
  principal. Developer sign-in must stay refused in production.
- **Integrity.**
  - Every state change goes through `VisuaService` so it lands in the hash-chained
    audit trail, in the same transaction. Storage is async: `await` every store and
    service call, never hold a transaction open across network calls, and don't
    publish bus events directly from a mutation (the service publishes after commit).
  - "Not applicable" requires a rationale, and scope recomputation must preserve
    `userExclusion`.
- **Claude API.** The default model is `claude-opus-5` (`VISUA_MODEL` overrides it).
  Use adaptive thinking, streaming, prompt caching of the system prompt, and zod
  validation of tool inputs. Follow the existing pattern in
  `packages/agents/src/claude.ts`.
