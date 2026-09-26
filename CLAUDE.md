# Working in the Visua repository

Visua is a pnpm monorepo (Node ≥ 22.18, native TypeScript, `node:sqlite`). Read
`README.md` for the product and `docs/architecture.md` for the internals.

## Commands

- `pnpm dev`: API on :8787 (seeds the demo) and web on :5173
- `pnpm typecheck`, `pnpm test` (Vitest), `pnpm test:e2e` (Playwright against the production build)
- `pnpm design:lint` after any change to `DESIGN.md`, then `pnpm design:tokens`
- `pnpm ingest` after any change to `corpus/` or `packages/frameworks/src/ingest/*`
- `pnpm corpus:verify` to hash-check the corpus

Run `pnpm typecheck && pnpm test` before committing. Run `pnpm test:e2e` when you
change the web app.

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
  risks and 212 Generative AI Profile actions), the change is wrong unless the official
  source changed.
- **AI RMF text comes from the PDF-based extraction** (`corpus/nist-ai-rmf/ai-rmf-core.json`).
  NIST's own CPRT and Playbook JSON differ from the final AI 100-1 text in dozens of
  statements; don't switch the ingest to them.
- **Licensing.** Never commit AICPA, ISO, PCI SSC or other copyrighted framework text,
  including derived JSON, mappings and search chunks.
  - `.gitignore` covers `corpus/aicpa-soc2/**` (except `manifest.json` and
    `STRUCTURE.md`), `packages/frameworks/data/aicpa-*.json`,
    `mappings/*tsc-2017*.json` and `chunks/aicpa-soc2.json`. Check `git status` before
    committing.
  - Licensed text must pass through `modelText()` / `licensedTextToModel()` in
    `packages/agents` before it can reach a language model.
- **Agents propose, people approve.** Agents change state only through
  `host.propose()`. Never let an agent file a plan, guide or template as evidence, mark
  anything verified, or make an authorization or audit decision.
- **Integrity.**
  - Every state change goes through `VisuaService` so it lands in the hash-chained
    audit trail.
  - "Not applicable" requires a rationale, and scope recomputation must preserve
    `userExclusion`.
- **Claude API.** The default model is `claude-opus-5` (`VISUA_MODEL` overrides it).
  Use adaptive thinking, streaming, prompt caching of the system prompt, and zod
  validation of tool inputs. Follow the existing pattern in
  `packages/agents/src/claude.ts`.
