Fresh independent source review. Run visual-quality-20260929 node review. Owner Codex. User requested visualization quality improvements and explicitly Claude Opus 5.5 review. Review the supplied CURRENT uncommitted source at base c3ad38c, plus diff. No previous designer conversation is included. You have no tools. Read-only report, no edits. Focus on actual rendering failures: incorrect winding/height/semantics, stale instance updates after same-count view changes, pointer interception, transparent ordering, resource lifetime on repeated selections, O(N) draw calls, and reduced-motion behavior. Desired outcome: higher visual quality in both Observatory layouts without changing data semantics, measured heights, lens colors, accessible 2D twin, or adding idle motion/postprocessing/dependencies. Report only supported regressions or consequential defects in changed behavior; mark old issues separately if necessary. At most 5 findings and 1000 words. Stop after this bounded source review; do not claim browser/tests run. Lead has run typecheck and 204 unit tests passed (2 skipped); full e2e running, screenshots inspected separately. Judge source independently. Return required review schema.

SOURCE CLAUDE.md
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

SOURCE DESIGN.md
1: ---
2: version: alpha
3: name: Visua
4: description: >-
5:   The visual identity of Visua, a spatial compliance workspace. Warm, open
6:   surfaces make frameworks, requirements, tasks, evidence and agent work easy to
7:   scan in two or three dimensions. Precise, evidence-first, never alarmist.
8: colors:
9:   # Warm neutrals. The 3D scene sits directly on `neutral`.
10:   primary: "#366B53"
11:   primary-hover: "#285740"
12:   on-primary: "#FFFFFF"
13:   primary-container: "#E3F0E7"
14:   on-primary-container: "#285740"
15:   secondary: "#52665A"
16:   on-secondary: "#FFFFFF"
17:   tertiary: "#A3553F"
18:   tertiary-hover: "#8A432F"
19:   on-tertiary: "#FFFFFF"
20:   tertiary-container: "#F8EBE5"
21:   on-tertiary-container: "#81422F"
22:   neutral: "#F7F8F4"
23:   surface: "#FFFFFF"
24:   surface-raised: "#F2F5F0"
25:   surface-overlay: "#FFFFFF"
26:   surface-bright: "#E8EEE7"
27:   surface-glass: "#FFFFFFE8"
28:   on-surface: "#1D3028"
29:   on-surface-muted: "#5B6C61"
30:   outline: "#D9E1D8"
31:   outline-strong: "#BFCFC2"
32:   scene-grid: "#DFE7DE"
33:   # Status semantics: the only colors allowed to encode implementation state.
34:   status-not-started: "#607168"
35:   status-not-started-container: "#EEF2EE"
36:   status-in-progress: "#8A6222"
37:   status-in-progress-container: "#FBF1DE"
38:   status-implemented: "#2F7350"
39:   status-implemented-container: "#E7F3E9"
40:   status-verified: "#286C80"
41:   status-verified-container: "#E4F2F5"
42:   status-at-risk: "#B3473E"
43:   status-at-risk-container: "#FBEAE7"
44:   status-not-applicable: "#626B65"
45:   status-not-applicable-container: "#F0F1EF"
46:   on-status: "#FFFFFF"
47:   error: "#B3473E"
48:   on-error: "#FFFFFF"
49:   # Framework identity: used only where several frameworks share one view.
50:   framework-csf: "#3E6386"
51:   framework-csf-container: "#E9F1F8"
52:   framework-soc2: "#805576"
53:   framework-soc2-container: "#F5EBF2"
54:   framework-rmf: "#57703B"
55:   framework-rmf-container: "#EFF3E6"
56:   framework-ai: "#97552A"
57:   framework-ai-container: "#F8EEE6"
58:   framework-law: "#705994"
59:   framework-law-container: "#F0ECF7"
60: typography:
61:   display-lg:
62:     fontFamily: Space Grotesk
63:     fontSize: 40px
64:     fontWeight: 600
65:     lineHeight: 1.1
66:     letterSpacing: -0.02em
67:   headline-lg:
68:     fontFamily: Space Grotesk
69:     fontSize: 28px
70:     fontWeight: 600
71:     lineHeight: 1.2
72:     letterSpacing: -0.01em
73:   headline-md:
74:     fontFamily: Space Grotesk
75:     fontSize: 20px
76:     fontWeight: 600
77:     lineHeight: 1.3
78:   title-md:
79:     fontFamily: IBM Plex Sans
80:     fontSize: 15px
81:     fontWeight: 600
82:     lineHeight: 1.4
83:   body-lg:
84:     fontFamily: IBM Plex Sans
85:     fontSize: 16px
86:     fontWeight: 400
87:     lineHeight: 1.6
88:   body-md:
89:     fontFamily: IBM Plex Sans
90:     fontSize: 14px
91:     fontWeight: 400
92:     lineHeight: 1.55
93:   body-sm:
94:     fontFamily: IBM Plex Sans
95:     fontSize: 13px
96:     fontWeight: 400
97:     lineHeight: 1.5
98:   label-lg:
99:     fontFamily: IBM Plex Sans
100:     fontSize: 13px
101:     fontWeight: 500
102:     lineHeight: 1.2
103:     letterSpacing: 0.01em
104:   label-md:
105:     fontFamily: IBM Plex Sans
106:     fontSize: 12px
107:     fontWeight: 500
108:     lineHeight: 1.2
109:     letterSpacing: 0.02em
110:   label-caps:
111:     fontFamily: Space Grotesk
112:     fontSize: 11px
113:     fontWeight: 600
114:     lineHeight: 1
115:     letterSpacing: 0.12em
116:   code-md:
117:     fontFamily: IBM Plex Mono
118:     fontSize: 13px
119:     fontWeight: 500
120:     lineHeight: 1.4
121:   code-sm:
122:     fontFamily: IBM Plex Mono
123:     fontSize: 11px
124:     fontWeight: 500
125:     lineHeight: 1.3
126:   metric-xl:
127:     fontFamily: Space Grotesk
128:     fontSize: 44px
129:     fontWeight: 500
130:     lineHeight: 1
131:     letterSpacing: -0.03em
132: rounded:
133:   none: 0px
134:   xs: 2px
135:   sm: 4px
136:   md: 8px
137:   lg: 12px
138:   xl: 16px
139:   full: 9999px
140: spacing:
141:   base: 4px
142:   xs: 4px
143:   sm: 8px
144:   md: 12px
145:   lg: 16px
146:   xl: 24px
147:   2xl: 32px
148:   3xl: 48px
149:   4xl: 64px
150:   gutter: 16px
151: components:
152:   app-shell:
153:     backgroundColor: "{colors.neutral}"
154:     textColor: "{colors.on-surface}"
155:     typography: "{typography.body-md}"
156:   scene-space:
157:     backgroundColor: "{colors.neutral}"
158:     textColor: "{colors.on-surface-muted}"
159:   scene-grid:
160:     backgroundColor: "{colors.scene-grid}"
161:   nav-rail:
162:     backgroundColor: "{colors.surface}"
163:     textColor: "{colors.on-surface-muted}"
164:     width: 220px
165:   nav-rail-item-active:
166:     backgroundColor: "{colors.primary-container}"
167:     textColor: "{colors.on-primary-container}"
168:     rounded: "{rounded.md}"
169:     size: 40px
170:   top-bar:
171:     backgroundColor: "{colors.surface}"
172:     textColor: "{colors.on-surface}"
173:     height: 52px
174:   panel:
175:     backgroundColor: "{colors.surface}"
176:     textColor: "{colors.on-surface}"
177:     rounded: "{rounded.lg}"
178:     padding: 16px
179:   panel-raised:
180:     backgroundColor: "{colors.surface-raised}"
181:     textColor: "{colors.on-surface}"
182:     rounded: "{rounded.lg}"
183:     padding: 16px
184:   hud-glass:
185:     backgroundColor: "{colors.surface-glass}"
186:     textColor: "{colors.on-surface}"
187:     rounded: "{rounded.lg}"
188:     padding: 12px
189:   inspector:
190:     backgroundColor: "{colors.surface}"
191:     textColor: "{colors.on-surface}"
192:     width: 440px
193:     padding: 20px
194:   divider:
195:     backgroundColor: "{colors.outline}"
196:   divider-strong:
197:     backgroundColor: "{colors.outline-strong}"
198:   button-primary:
199:     backgroundColor: "{colors.primary}"
200:     textColor: "{colors.on-primary}"
201:     typography: "{typography.label-lg}"
202:     rounded: "{rounded.md}"
203:     height: 36px
204:     padding: 14px
205:   button-primary-hover:
206:     backgroundColor: "{colors.primary-hover}"
207:     textColor: "{colors.on-primary}"
208:   button-secondary:
209:     backgroundColor: "{colors.surface-overlay}"
210:     textColor: "{colors.on-surface}"
211:     typography: "{typography.label-lg}"
212:     rounded: "{rounded.md}"
213:     height: 36px
214:     padding: 14px
215:   button-secondary-hover:
216:     backgroundColor: "{colors.surface-bright}"
217:     textColor: "{colors.on-surface}"
218:   button-quiet:
219:     backgroundColor: "{colors.surface}"
220:     textColor: "{colors.secondary}"
221:     typography: "{typography.label-lg}"
222:     rounded: "{rounded.md}"
223:     height: 32px
224:   button-agent:
225:     backgroundColor: "{colors.tertiary}"
226:     textColor: "{colors.on-tertiary}"
227:     typography: "{typography.label-lg}"
228:     rounded: "{rounded.md}"
229:     height: 36px
230:     padding: 14px
231:   button-agent-hover:
232:     backgroundColor: "{colors.tertiary-hover}"
233:     textColor: "{colors.on-tertiary}"
234:   button-danger:
235:     backgroundColor: "{colors.error}"
236:     textColor: "{colors.on-error}"
237:     typography: "{typography.label-lg}"
238:     rounded: "{rounded.md}"
239:     height: 36px
240:   input:
241:     backgroundColor: "{colors.surface-raised}"
242:     textColor: "{colors.on-surface}"
243:     typography: "{typography.body-md}"
244:     rounded: "{rounded.md}"
245:     height: 36px
246:     padding: 10px
247:   chip-filter:
248:     backgroundColor: "{colors.surface-raised}"
249:     textColor: "{colors.on-surface-muted}"
250:     typography: "{typography.label-md}"
251:     rounded: "{rounded.full}"
252:     height: 26px
253:   chip-filter-selected:
254:     backgroundColor: "{colors.primary-container}"
255:     textColor: "{colors.on-primary-container}"
256:     typography: "{typography.label-md}"
257:     rounded: "{rounded.full}"
258:     height: 26px
259:   chip-status-not-started:
260:     backgroundColor: "{colors.status-not-started-container}"
261:     textColor: "{colors.status-not-started}"
262:     typography: "{typography.label-md}"
263:     rounded: "{rounded.full}"
264:     height: 22px
265:   chip-status-in-progress:
266:     backgroundColor: "{colors.status-in-progress-container}"
267:     textColor: "{colors.status-in-progress}"
268:     typography: "{typography.label-md}"
269:     rounded: "{rounded.full}"
270:     height: 22px
271:   chip-status-implemented:
272:     backgroundColor: "{colors.status-implemented-container}"
273:     textColor: "{colors.status-implemented}"
274:     typography: "{typography.label-md}"
275:     rounded: "{rounded.full}"
276:     height: 22px
277:   chip-status-verified:
278:     backgroundColor: "{colors.status-verified-container}"
279:     textColor: "{colors.status-verified}"
280:     typography: "{typography.label-md}"
281:     rounded: "{rounded.full}"
282:     height: 22px
283:   chip-status-at-risk:
284:     backgroundColor: "{colors.status-at-risk-container}"
285:     textColor: "{colors.status-at-risk}"
286:     typography: "{typography.label-md}"
287:     rounded: "{rounded.full}"
288:     height: 22px
289:   chip-status-not-applicable:
290:     backgroundColor: "{colors.status-not-applicable-container}"
291:     textColor: "{colors.on-surface-muted}"
292:     typography: "{typography.label-md}"
293:     rounded: "{rounded.full}"
294:     height: 22px
295:   badge-agent:
296:     backgroundColor: "{colors.tertiary-container}"
297:     textColor: "{colors.on-tertiary-container}"
298:     typography: "{typography.label-md}"
299:     rounded: "{rounded.sm}"
300:   badge-framework-csf:
301:     backgroundColor: "{colors.framework-csf-container}"
302:     textColor: "{colors.framework-csf}"
303:     typography: "{typography.code-sm}"
304:     rounded: "{rounded.sm}"
305:   badge-framework-soc2:
306:     backgroundColor: "{colors.framework-soc2-container}"
307:     textColor: "{colors.framework-soc2}"
308:     typography: "{typography.code-sm}"
309:     rounded: "{rounded.sm}"
310:   badge-framework-rmf:
311:     backgroundColor: "{colors.framework-rmf-container}"
312:     textColor: "{colors.framework-rmf}"
313:     typography: "{typography.code-sm}"
314:     rounded: "{rounded.sm}"
315:   badge-framework-ai:
316:     backgroundColor: "{colors.framework-ai-container}"
317:     textColor: "{colors.framework-ai}"
318:     typography: "{typography.code-sm}"
319:     rounded: "{rounded.sm}"
320:   badge-framework-law:
321:     backgroundColor: "{colors.framework-law-container}"
322:     textColor: "{colors.framework-law}"
323:     typography: "{typography.code-sm}"
324:     rounded: "{rounded.sm}"
325:   requirement-code:
326:     backgroundColor: "{colors.surface-raised}"
327:     textColor: "{colors.primary}"
328:     typography: "{typography.code-md}"
329:     rounded: "{rounded.xs}"
330:   tooltip:
331:     backgroundColor: "{colors.surface-overlay}"
332:     textColor: "{colors.on-surface}"
333:     typography: "{typography.body-sm}"
334:     rounded: "{rounded.sm}"
335:     padding: 8px
336:   command-palette:
337:     backgroundColor: "{colors.surface-overlay}"
338:     textColor: "{colors.on-surface}"
339:     typography: "{typography.body-lg}"
340:     rounded: "{rounded.xl}"
341:     width: 680px
342:   dialog:
343:     backgroundColor: "{colors.surface-raised}"
344:     textColor: "{colors.on-surface}"
345:     rounded: "{rounded.xl}"
346:     padding: 24px
347:     width: 560px
348:   table-header:
349:     backgroundColor: "{colors.surface-raised}"
350:     textColor: "{colors.on-surface-muted}"
351:     typography: "{typography.label-caps}"
352:     height: 36px
353:   table-row:
354:     backgroundColor: "{colors.surface}"
355:     textColor: "{colors.on-surface}"
356:     typography: "{typography.body-md}"
357:     height: 40px
358:   table-row-hover:
359:     backgroundColor: "{colors.surface-raised}"
360:     textColor: "{colors.on-surface}"
361:   metric-tile:
362:     backgroundColor: "{colors.surface}"
363:     textColor: "{colors.on-surface}"
364:     typography: "{typography.metric-xl}"
365:     rounded: "{rounded.lg}"
366:     padding: 16px
367:   progress-track:
368:     backgroundColor: "{colors.outline}"
369:     height: 6px
370:     rounded: "{rounded.full}"
371:   progress-fill:
372:     backgroundColor: "{colors.primary}"
373:     height: 6px
374:     rounded: "{rounded.full}"
375:   agent-step:
376:     backgroundColor: "{colors.tertiary-container}"
377:     textColor: "{colors.on-tertiary-container}"
378:     typography: "{typography.body-sm}"
379:     rounded: "{rounded.md}"
380:     padding: 10px
381:   agent-step-tool:
382:     backgroundColor: "{colors.surface-raised}"
383:     textColor: "{colors.on-surface-muted}"
384:     typography: "{typography.code-sm}"
385:     rounded: "{rounded.md}"
386:     padding: 10px
387:   citation:
388:     backgroundColor: "{colors.surface-raised}"
389:     textColor: "{colors.secondary}"
390:     typography: "{typography.body-sm}"
391:     rounded: "{rounded.sm}"
392:     padding: 8px
393:   toast:
394:     backgroundColor: "{colors.surface-overlay}"
395:     textColor: "{colors.on-surface}"
396:     typography: "{typography.body-sm}"
397:     rounded: "{rounded.lg}"
398:     padding: 12px
399:   toast-error:
400:     backgroundColor: "{colors.status-at-risk-container}"
401:     textColor: "{colors.status-at-risk}"
402:     typography: "{typography.body-sm}"
403:     rounded: "{rounded.lg}"
404:     padding: 12px
405:   scene-label:
406:     backgroundColor: "{colors.surface-glass}"
407:     textColor: "{colors.on-surface}"
408:     typography: "{typography.code-sm}"
409:     rounded: "{rounded.sm}"
410:     padding: 4px
411:   scene-sector-label:
412:     backgroundColor: "{colors.neutral}"
413:     textColor: "{colors.on-surface-muted}"
414:     typography: "{typography.label-caps}"
415:   scene-node-not-started:
416:     backgroundColor: "{colors.status-not-started}"
417:     textColor: "{colors.on-status}"
418:   scene-node-in-progress:
419:     backgroundColor: "{colors.status-in-progress}"
420:     textColor: "{colors.on-status}"
421:   scene-node-implemented:
422:     backgroundColor: "{colors.status-implemented}"
423:     textColor: "{colors.on-status}"
424:   scene-node-verified:
425:     backgroundColor: "{colors.status-verified}"
426:     textColor: "{colors.on-status}"
427:   scene-node-at-risk:
428:     backgroundColor: "{colors.status-at-risk}"
429:     textColor: "{colors.on-status}"
430:   scene-node-not-applicable:
431:     backgroundColor: "{colors.status-not-applicable}"
432:     textColor: "{colors.on-status}"
433:   scene-node-selected:
434:     backgroundColor: "{colors.primary}"
435:     textColor: "{colors.on-primary}"
436:   scene-agent-signal:
437:     backgroundColor: "{colors.tertiary}"
438:     textColor: "{colors.on-tertiary}"
439:   secondary-action:
440:     backgroundColor: "{colors.secondary}"
441:     textColor: "{colors.on-secondary}"
442:     typography: "{typography.label-lg}"
443:     rounded: "{rounded.md}"
444:     height: 32px
445: ---
446: 
447: # Visua design system
448: 
449: This file is the single source of truth for Visua's visual identity. The YAML
450: front matter holds the normative tokens; everything below explains how to apply
451: them. `pnpm design:lint` validates this file with the official
452: `@google/design.md` linter, and `pnpm design:tokens` compiles the tokens into
453: CSS custom properties (for the 2D interface) and a typed module (for the 3D
454: scene materials). Never hard-code a color, font, radius or spacing value in
455: product code — reference the generated token instead.
456: 
457: ## Overview
458: 
459: **Brand personality: "A clear view of what matters."** Visua gives a
460: security team a calm place to see and move its compliance program forward.
461: Warm backgrounds, readable information and restrained color help people find
462: the next action without hiding the surrounding context. The spatial view is a
463: useful map of the work, and each object has a clear path to its details.
464: 
465: - **Audience:** CISOs, GRC leads, security engineers, auditors and first-time
466:   founders facing their first SOC 2 — any niche, any cyber-maturity level.
467:   Novices must never feel lost; experts must never feel slowed down.
468: - **Emotional target:** composure and progress. Compliance work is stressful;
469:   Visua makes the whole picture legible and the next step easy to identify.
470: - **Character:** precise, evidence-first and quietly approachable. Avoid
471:   decorative complexity and product claims that outpace the evidence.
472: - **Signature:** the 3D *Observatory* canvas shows relationships between
473:   requirements. Clear 2D panels show the details and actions beside it. Every
474:   3D object has a 2D twin in an outline view.
475: - **AI presence:** agents are colleagues whose work is always visible,
476:   attributable (terracotta), cited and reversible.
477: 
478: ## Colors
479: 
480: The palette uses warm, nearly white surfaces and dark forest ink. Color has
481: three roles outside of status: interaction (Sage), AI agency (Terracotta) and
482: framework identity (used only when frameworks share a view). Large surfaces
483: stay neutral so dense information remains readable.
484: 
485: - **Primary — Sage (#366B53):** the single interaction color:
486:   primary buttons, focus rings, selection, the selected 3D node and the active
487:   camera target. `primary-hover` (#285740) is its hover state. Text on primary
488:   uses white `on-primary` (#FFFFFF). The pale `primary-container` (#E3F0E7)
489:   identifies selected filters and navigation without flooding the page.
490: - **Secondary — Quiet green (#52665A):** secondary actions and citation text;
491:   a quieter voice than primary.
492: - **Tertiary — Terracotta (#A3553F):** reserved for AI agent
493:   presence: agent buttons, agent-authored drafts awaiting approval, agent
494:   signals and activity indicators. Pair the color with a label that names the
495:   agent or action.
496: - **Neutral — Porcelain (#F7F8F4):** the workspace canvas. `surface`
497:   (#FFFFFF) is the main panel color; `surface-raised` (#F2F5F0) groups cards
498:   and inputs; `surface-overlay` (#FFFFFF) holds popovers and the command
499:   palette; `surface-bright` (#E8EEE7) gives hover feedback. `surface-glass`
500:   (#FFFFFFE8) keeps labels legible over the 3D canvas.
501: - **Text:** `on-surface` Forest Ink (#1D3028) is primary text and
502:   `on-surface-muted` (#5B6C61) is secondary text. Both meet WCAG AA on the
503:   specified light surfaces.
504: - **Status (the only colors that encode implementation state):**
505:   - Not started — Slate (#607168)
506:   - In progress — Ochre (#8A6222)
507:   - Implemented — Fern (#2F7350)
508:   - Verified (evidence accepted or assessed) — Teal (#286C80)
509:   - At risk (failing, expired evidence, overdue) — Clay (#B3473E)
510:   - Not applicable — Grey (#626B65)
511: 
512:   Each status has a `-container` tint for chips; chip text uses the status
513:   color itself (or `on-surface-muted` for Not applicable). Solid status nodes
514:   use white labels. These hues are distinct from the action colors and remain
515:   legible on the specified light surfaces.
516: - **Framework identity:** NIST CSF (#3E6386), SOC 2 (#805576), NIST RMF /
517:   SP 800-53 (#57703B), NIST AI RMF (#97552A) and U.S. state AI laws
518:   (#705994). Use these colors for framework badges and the Crosswalk Nexus,
519:   never for status. Framework color always travels with a text label. Threat
520:   catalogs (MITRE ATLAS, OWASP) use neutral ink and an inner Nexus ring, so
521:   position and text carry their meaning.
522: 
523: ## Typography
524: 
525: Three families with strict roles:
526: 
527: - **Space Grotesk** (display, headlines, capitalized labels, metrics): its
528:   geometric construction gives headings a distinct, friendly voice. Headlines
529:   are Semi-Bold with slight negative tracking.
530: - **IBM Plex Sans** (all body copy, UI labels, form content): institutional,
531:   trustworthy and highly legible at 13–16px on light backgrounds.
532: - **IBM Plex Mono** (every requirement identifier and machine value): control
533:   codes such as `GV.OC-01`, `CC6.1`, `AC-2(1)`, hashes, timestamps and tool
534:   calls. A requirement ID is always monospace so it is scannable in lists and
535:   in 3D labels.
536: 
537: Rules: `label-caps` is uppercase with 0.12em tracking and is used for section
538: eyebrows and table headers only. `metric-xl` keeps proportional figures (tabular
539: figures make large standalone numbers look loose); use `font-variant-numeric:
540: tabular-nums` only where numbers align in columns — tables and chart axes.
541: Never use more than two weights on one panel.
542: 
543: ## Layout
544: 
545: A **three-zone** layout keeps navigation and context visible:
546: 
547: 1. **Navigation** (220px, left): labeled destinations and clear groups make
548:    Observatory, Frameworks, Plan, Evidence, Agents, Policies, Trust and Settings
549:    easy to find. Icons help scanning, but labels remain visible on desktop.
550: 2. **Canvas** (fluid, center): the 3D Observatory or the 2D view for the current
551:    destination. Compact controls sit on a 16px inset over spatial views.
552: 3. **Inspector** (440px, right, collapsible): details and actions for the
553:    current selection. It never covers the camera target: the scene re-frames
554:    when the inspector opens.
555: 
556: A 52px top bar holds the workspace switcher, framework switcher, global
557: search / command palette (⌘K) and agent activity indicator.
558: 
559: Spacing follows a strict **4px base scale** (`xs` 4, `sm` 8, `md` 12, `lg` 16,
560: `xl` 24, `2xl` 32, `3xl` 48, `4xl` 64). Panels use 16px padding; the inspector
561: uses 20px; dialogs 24px. Dense data views (tables, outlines) use 40px rows.
562: Below 1024px the inspector becomes a bottom sheet and the rail collapses into
563: a labeled navigation drawer available from the top bar; the current section
564: stays named in the header. The 3D canvas remains available but defaults to the
565: 2D outline on touch devices smaller than 768px.
566: 
567: ## Elevation & Depth
568: 
569: Depth in the 2D layer comes from **gentle tonal layering**, a 1px `outline`
570: (#D9E1D8) border and restrained shadows. The porcelain canvas holds white
571: panels; softly tinted raised surfaces group related details within them.
572: Overlays (command palette, dialogs) add a soft ambient shadow so their bounds
573: remain clear. Panels over the spatial canvas use `surface-glass` with a 12px
574: backdrop blur. Borders and shadows mark groups without turning every row into
575: a separate card.
576: 
577: ## Spatial System
578: 
579: The 3D Observatory is Visua's signature surface and follows these rules.
580: 
581: - **Coordinates:** Y is up. A framework is laid out on the XZ plane around the
582:   origin; hierarchy depth maps to radius (root at the center, leaves at the
583:   rim). Height (Y) is reserved for a *measured value* — maturity, readiness or
584:   time — never decoration.
585: - **Geometry vocabulary** (one shape per object kind, so kind is readable
586:   without color):
587:   - Framework core — an icosahedron at the origin with a clear silhouette.
588:   - Function / family / criteria series — a sector arc with a floating
589:     `label-caps` title.
590:   - Category / control — a ring-mounted beacon (low cylinder).
591:   - Subcategory / criterion / control enhancement (the unit of work) — a
592:     hexagonal prism node. Its height encodes current maturity; a translucent
593:     ghost prism encodes the target, so the gap is literally visible.
594:   - Task — a small satellite (octahedron) orbiting its requirement.
595:   - Evidence — a crystal (tetrahedron) docked on its requirement; changes to
596:     the at-risk color when expired.
597:   - Agent — a terracotta marker travelling along links while work is active.
598: - **Materials:** physically based and matte (roughness 0.55–0.7, metalness
599:   ≤ 0.2).
600:   Node base color is the status token. Use an outline, scale or clear selection
601:   ring for hover and selection; keep emissive effects subtle on the light scene.
602: - **Lighting:** one soft key light, one hemisphere fill tinted from `neutral`
603:   to `primary-container`, and gentle atmospheric fade in `neutral` so distant
604:   objects recede without losing their silhouettes. No hard shadows.
605: - **Camera:** 45° field of view, damped orbit (damping 0.08). Selecting an
606:   object flies the camera to it in 800ms with ease-in-out. The camera never
607:   flips below the XZ plane. Double-click frames the object's subtree.
608: - **Semantic zoom (level of detail):** far — framework and function titles;
609:   middle — category codes; near — requirement codes and task satellites.
610:   Labels are billboards using `code-sm`, clamped between 11px and 14px on
611:   screen, and never overlap: lower-priority labels hide first.
612: - **Lenses:** the same space can be re-encoded without moving objects —
613:   Status, Gap (target − current), Evidence freshness, Ownership, Priority and
614:   Crosswalk coverage. The active lens is always named in the HUD legend.
615: - **Performance budget:** 60 fps on an integrated GPU with the full SP 800-53
616:   catalog visible; instanced meshes for every repeated object; device pixel
617:   ratio capped at 1.75; no post-processing pass in the light scene.
618: 
619: ## Shapes
620: 
621: The shape language is **precise, softened geometry**. Interactive 2D
622: elements use an 8px radius (`md`); cards and panels 12px (`lg`); overlays 16px
623: (`xl`). Chips and status pills are fully rounded (`full`). Requirement code
624: tags use a 2px radius (`xs`) so they read as technical labels. In 3D, hexagonal
625: prisms echo the hexagonal grid of the Readiness Terrain. Never mix sharp and
626: rounded corners inside one component.
627: 
628: ## Motion
629: 
630: Motion always means something changed or someone (a person or an agent) is
631: working. Durations: 120ms (hover, press), 200ms (panels, chips), 320ms
632: (layout), 800ms (camera flights). Easing is cubic ease-in-out for camera
633: moves and ease-out for UI entrances. Status transitions morph color and
634: prism height over 600ms so progress is felt. The scene is still when nothing
635: happens. When the user prefers reduced motion, camera flights become 150ms
636: cross-fades, particles and pulses are replaced by static halos, and idle
637: drift is disabled.
638: 
639: ## Interaction principles
640: 
641: Each interaction makes its state visible. Keep the page structure stable while
642: content, progress and recommendations change within it.
643: 
644: - Keep primary navigation labeled and visible on desktop. Remove duplicate
645:   actions before hiding useful information.
646: - Show a pressed or pending state immediately after an action. Mark saved,
647:   failed and reversible outcomes near the item that changed.
648: - Use a skeleton or named loading state when content takes time to appear.
649:   Preserve space so the layout does not jump when the result arrives.
650: - Keep one clear next action in each task context. Use relevant defaults and
651:   recent selections to shorten routine work without rearranging navigation.
652: - Surface agent suggestions where they help with the current task. Identify
653:   their source and approval state, and keep citations available on demand.
654: - Group dense information with headings, alignment and typographic hierarchy.
655:   Reveal details on request without hiding the fields needed to decide.
656: 
657: ## Components
658: 
659: These component roles keep actions, status and evidence consistent across the
660: workspace.
661: 
662: - **Buttons:** `button-primary` (Sage) for the single most
663:   important action in a view; `button-secondary` for everything else;
664:   `button-quiet` for tertiary actions in dense panels; `button-agent`
665:   (Terracotta) for any action that starts or approves AI agent work;
666:   `button-danger` only for destructive actions, always confirmed.
667: - **Status chips:** `chip-status-*` pair a colored dot, a text label and the
668:   status color on its container tint — status is never conveyed by color
669:   alone.
670: - **Filter chips:** `chip-filter` / `chip-filter-selected` drive lenses and
671:   facet filters in the HUD and outline.
672: - **Requirement code:** `requirement-code` renders IDs (`PR.AA-05`) in mono on a
673:   raised surface; clicking one always flies the camera to that requirement.
674: - **Framework badges:** `badge-framework-csf|soc2|rmf|ai|law` appear wherever
675:   items from multiple frameworks are listed together.
676: - **Agent components:** `badge-agent` marks agent-authored content until a
677:   human approves it; `agent-step` renders a reasoning step in the flight
678:   recorder; `agent-step-tool` renders a tool call and its result in mono;
679:   `citation` renders a quoted passage from the official corpus with document,
680:   section and page.
681: - **Inspector:** 440px docked panel with a header (code, title, status chip),
682:   tabbed body (Overview, Tasks, Evidence, Mappings, History) and a sticky
683:   footer holding the primary action.
684: - **HUD (`hud-glass`):** floating read-outs over the canvas: legend, lens
685:   switcher, minimap and camera breadcrumbs.
686: - **Command palette:** ⌘K / Ctrl+K opens a 680px palette that accepts both
687:   commands ("go to PR.AA") and natural-language requests to the copilot.
688: - **Metric tiles:** `metric-tile` shows one number with a label and a trend;
689:   used sparingly (max four per view).
690: - **Tables & outline:** `table-header` in `label-caps`, 40px `table-row` with
691:   `table-row-hover`; the outline is a keyboard-navigable tree mirroring the 3D
692:   hierarchy one-to-one.
693: - **Progress:** `progress-track` + `progress-fill`; fills may take a status
694:   color when they represent status distribution.
695: - **Toasts and dialogs:** `toast` for confirmations, `toast-error` for
696:   failures, `dialog` for decisions that need focus.
697: 
698: ## Agent Presence
699: 
700: AI is first-class and fully transparent:
701: 
702: 1. Every agent run has a **flight recorder**: goal, plan, each step, each tool
703:    call with inputs and outputs, citations and the final proposal.
704: 2. Changes that alter compliance state (statuses, policies, evidence acceptance)
705:    are staged as agent-marked drafts and
706:    applied only after approval, unless the workspace explicitly grants the
707:    agent autonomy for that action type.
708: 3. Claims about a framework must carry a **citation** into the local official
709:    corpus (document, section, page). No citation, no claim.
710: 4. Confidence is shown in words (low / medium / high) with the reason, never
711:    as a bare percentage.
712: 5. In the scene, an agent marker moves to the node being worked on, and a
713:    labeled activity state remains visible until the run ends.
714: 
715: ## Do's and Don'ts
716: 
717: Use these rules when adding or revising a view.
718: 
719: - Do give every 3D view an equivalent, keyboard-navigable 2D outline.
720: - Do use Sage for the primary action in a view.
721: - Do reserve Terracotta for AI agent activity and actions.
722: - Do encode status with color **and** shape/icon **and** text.
723: - Do show requirement IDs in IBM Plex Mono and make them navigable.
724: - Do cite the official source for every framework statement.
725: - Do maintain WCAG 2.2 AA contrast (4.5:1 for text, 3:1 for UI shapes).
726: - Don't use height, glow or motion decoratively — each must encode data or
727:   activity.
728: - Don't use red or amber outside of status semantics.
729: - Don't auto-rotate the camera or animate idle scenes by default.
730: - Don't hide information only in 3D; don't make 3D the only way to act.
731: - Don't show more than four metric tiles in a view, or more than two font
732:   weights in one panel.
733: - Don't use gradients as decoration; use them only when they clarify depth or
734:   active spatial content.
735: 
736: ## Accessibility
737: 
738: Visua targets WCAG 2.2 AA. Focus is always visible (2px Sage ring
739: with 2px offset). Minimum pointer targets are 32px (24px absolute minimum per
740: WCAG 2.2). Every 3D interaction has a keyboard path: arrow keys walk
741: siblings, Enter drills down, Backspace/Escape goes up, `/` searches, `F` frames
742: the selection, `L` cycles lenses. Agent events are announced through a polite
743: live region. Reduced-motion and high-contrast preferences are honored
744: automatically.
745: 
746: ## Voice & Tone
747: 
748: Precise, calm and specific. Use the framework's own vocabulary: *outcomes*
749: (CSF subcategories), *criteria* (SOC 2), *controls* (SP 800-53), *tasks* (RMF).
750: Prefer "3 subcategories have no evidence" to "You're at risk!". Explain why a
751: recommendation matters and cite where it comes from. Never promise
752: certification; Visua prepares organizations for assessment and audit.

SOURCE apps/web/src/scene/FrameworkScene.tsx
1: /**
2:  * The framework space: every object encodes data (DESIGN.md › Spatial System).
3:  * Units of work are instanced hex prisms (height = current level) topped with
4:  * translucent "gap glass" up to the target level; groups are beacons; tasks
5:  * orbit as satellites; evidence docks as crystals; agents travel as comets.
6:  */
7: import { Line } from "@react-three/drei";
8: import { useFrame, type ThreeEvent } from "@react-three/fiber";
9: import { memo, useEffect, useLayoutEffect, useMemo, useRef } from "react";
10: import {
11:   BufferGeometry,
12:   Color,
13:   CylinderGeometry,
14:   Float32BufferAttribute,
15:   IcosahedronGeometry,
16:   InstancedMesh,
17:   Object3D,
18:   OctahedronGeometry,
19:   QuadraticBezierCurve3,
20:   TetrahedronGeometry,
21:   Vector3,
22:   type Group,
23:   type Mesh,
24: } from "three";
25: import type { FrameworkStateBundle } from "../lib/types.ts";
26: import { useAgentActivity } from "../state/agentActivity.ts";
27: import type { Lens } from "../state/ui.ts";
28: import { TOKENS, unitColor } from "./colors.ts";
29: import { SpatialGround } from "./SpatialGround.tsx";
30: import { hexRimGeometry } from "./spatialGeometry.ts";
31: import type { Layout, Vec3 } from "./layout.ts";
32: import { ScreenLabels, type ScreenLabel } from "./ScreenLabels.tsx";
33: 
34: 
35: export interface SceneProps {
36:   layout: Layout;
37:   state: FrameworkStateBundle | undefined;
38:   lens: Lens;
39:   selectedId: string | null;
40:   hoveredId: string | null;
41:   focusIds: string[];
42:   reducedMotion: boolean;
43:   onHover: (id: string | null, clientX?: number, clientY?: number) => void;
44:   onSelect: (id: string | null) => void;
45: }
46: 
47: const tmp = new Object3D();
48: const tmpColor = new Color();
49: const rimGeometry = hexRimGeometry();
50: const targetRimGeometry = hexRimGeometry(0.8);
51: const beaconGeometry = new CylinderGeometry(1, 1, 1, 32, 1).translate(0, 0.5, 0);
52: const hexGeometry = new CylinderGeometry(1, 1, 1, 6, 1);
53: hexGeometry.translate(0, 0.5, 0);
54: 
55: export function heightFor(level: number, view: Layout["view"]) {
56:   return view === "terrain" ? 0.3 + level * 0.9 : 0.22 + level * 0.46;
57: }
58: 
59: // ---------------------------------------------------------------------------
60: 
61: function UnitField({ layout, state, lens, onHover, onSelect, reducedMotion }: SceneProps) {
62:   const mesh = useRef<InstancedMesh>(null);
63:   const glass = useRef<InstancedMesh>(null);
64:   const targets = useRef<InstancedMesh>(null);
65:   const crowns = useRef<InstancedMesh>(null);
66:   const ids = layout.units;
67:   const count = ids.length;
68:   const shown = useRef<Float32Array>(new Float32Array(count));
69:   const goal = useRef<Float32Array>(new Float32Array(count));
70:   const tops = useRef<Float32Array>(new Float32Array(count));
71:   // Units out of scope (not applicable, or no link for a threat) shrink to small dots so the ones that count stand out.
72:   const widths = useRef<Float32Array>(new Float32Array(count).fill(1));
73:   const animating = useRef(true);
74: 
75:   // Targets for heights whenever state changes.
76:   useLayoutEffect(() => {
77:     const g = new Float32Array(count);
78:     const t = new Float32Array(count);
79:     const w = new Float32Array(count);
80:     ids.forEach((id, i) => {
81:       const u = state?.units[id];
82:       const out = !!u && !u.applicable;
83:       g[i] = out ? 0.08 : heightFor(u ? u.current : 0, layout.view);
84:       t[i] = u && u.applicable ? heightFor(Math.max(u.current, u.target), layout.view) : g[i]!;
85:       w[i] = out ? 0.42 : 1;
86:     });
87:     goal.current = g;
88:     tops.current = t;
89:     widths.current = w;
90:     if (shown.current.length !== count) shown.current = new Float32Array(g);
91:     if (reducedMotion) shown.current = new Float32Array(g);
92:     animating.current = true;
93:   }, [ids, state, count, layout.view, reducedMotion]);
94: 
95:   // The layout can change with the same number of units; always rewrite transforms.
96:   useLayoutEffect(() => { animating.current = true; }, [layout]);
97: 
98:   // Colors per lens.
99:   useLayoutEffect(() => {
100:     const m = mesh.current;
101:     if (!m) return;
102:     ids.forEach((id, i) => {
103:       unitColor(lens, state?.units[id], tmpColor);
104:       m.setColorAt(i, tmpColor);
105:       crowns.current?.setColorAt(i, tmpColor.lerp(TOKENS.onSurface, 0.22));
106:     });
107:     if (m.instanceColor) m.instanceColor.needsUpdate = true;
108:     if (crowns.current?.instanceColor) crowns.current.instanceColor.needsUpdate = true;
109:   }, [ids, state, lens]);
110: 
111:   useFrame((_, dt) => {
112:     const m = mesh.current;
113:     const gl = glass.current;
114:     if (!m || !gl || !animating.current) return;
115:     let moving = false;
116:     const k = Math.min(1, dt * 6);
117:     for (let i = 0; i < count; i++) {
118:       const cur = shown.current[i] ?? 0;
119:       const tgt = goal.current[i] ?? 0;
120:       const next = Math.abs(tgt - cur) < 0.002 ? tgt : cur + (tgt - cur) * k;
121:       if (next !== tgt) moving = true;
122:       shown.current[i] = next;
123:       const p = layout.positions.get(ids[i]!)!;
124:       const r = layout.cell * (layout.view === "terrain" ? 0.9 : 1) * (widths.current[i] ?? 1);
125:       tmp.rotation.set(0, 0, 0);
126:       tmp.position.set(p[0], 0, p[2]);
127:       tmp.scale.set(r, next, r);
128:       tmp.updateMatrix();
129:       m.setMatrixAt(i, tmp.matrix);
130:       const top = tops.current[i] ?? next;
131:       const gapH = Math.max(0, top - next);
132:       tmp.position.set(p[0], next, p[2]);
133:       tmp.scale.set(gapH > 0.002 ? r * 0.98 : 0, gapH, gapH > 0.002 ? r * 0.98 : 0);
134:       tmp.updateMatrix();
135:       gl.setMatrixAt(i, tmp.matrix);
136:       tmp.position.set(p[0], top + 0.008, p[2]);
137:       tmp.scale.setScalar(top > (goal.current[i] ?? 0) + 0.002 ? r * 0.98 : 0);
138:       tmp.updateMatrix();
139:       targets.current?.setMatrixAt(i, tmp.matrix);
140:       tmp.position.y = next + 0.006;
141:       tmp.scale.setScalar(r);
142:       tmp.updateMatrix();
143:       crowns.current?.setMatrixAt(i, tmp.matrix);
144:     }
145:     m.instanceMatrix.needsUpdate = true;
146:     gl.instanceMatrix.needsUpdate = true;
147:     if (targets.current) targets.current.instanceMatrix.needsUpdate = true;
148:     if (crowns.current) crowns.current.instanceMatrix.needsUpdate = true;
149:     if (!moving) m.computeBoundingSphere();
150:     animating.current = moving;
151:   });
152: 
153:   const handleMove = (e: ThreeEvent<PointerEvent>) => {
154:     e.stopPropagation();
155:     if (e.instanceId === undefined) return;
156:     onHover(ids[e.instanceId] ?? null, e.nativeEvent.clientX, e.nativeEvent.clientY);
157:     document.body.style.cursor = "pointer";
158:   };
159:   const handleOut = () => {
160:     onHover(null);
161:     document.body.style.cursor = "";
162:   };
163:   const handleClick = (e: ThreeEvent<MouseEvent>) => {
164:     e.stopPropagation();
165:     if (e.instanceId !== undefined) onSelect(ids[e.instanceId] ?? null);
166:   };
167: 
168:   return (
169:     <group>
170:       <instancedMesh ref={mesh} args={[hexGeometry, undefined, count]} onPointerMove={handleMove} onPointerOut={handleOut} onClick={handleClick} frustumCulled={false}>
171:         <meshStandardMaterial roughness={0.62} metalness={0.08} flatShading />
172:       </instancedMesh>
173:       <instancedMesh ref={glass} renderOrder={1} args={[hexGeometry, undefined, count]} raycast={() => null} frustumCulled={false}>
174:         <meshStandardMaterial color={TOKENS.primary} transparent opacity={0.12} roughness={0.7} metalness={0} depthWrite={false} />
175:       </instancedMesh>
176:       <instancedMesh ref={targets} renderOrder={2} args={[targetRimGeometry, undefined, count]} raycast={() => null} frustumCulled={false}>
177:         <meshBasicMaterial color={TOKENS.primary} transparent opacity={0.55} depthWrite={false} />
178:       </instancedMesh>
179:       <instancedMesh ref={crowns} args={[rimGeometry, undefined, count]} raycast={() => null} frustumCulled={false}>
180:         <meshBasicMaterial />
181:       </instancedMesh>
182:     </group>
183:   );
184: }
185: 
186: // ---------------------------------------------------------------------------
187: 
188: function Beacons({ layout, state, onSelect, onHover }: SceneProps) {
189:   const hubs = layout.hubs;
190:   const mids = layout.mids.filter((id) => layout.positions.has(id) && layout.view === "constellation");
191:   const hubMesh = useRef<InstancedMesh>(null);
192:   const midMesh = useRef<InstancedMesh>(null);
193:   useLayoutEffect(() => {
194:     const place = (mesh: InstancedMesh | null, list: string[], radius: number, height: number) => {
195:       if (!mesh) return;
196:       list.forEach((id, i) => {
197:         const p = layout.positions.get(id) ?? [0, 0, 0];
198:         tmp.rotation.set(0, 0, 0);
199:         tmp.position.set(p[0], 0, p[2]);
200:         tmp.scale.set(radius, height, radius);
201:         tmp.updateMatrix();
202:         mesh.setMatrixAt(i, tmp.matrix);
203:         const g = state?.groups[id];
204:         tmpColor.copy(g ? TOKENS.status[g.status] : TOKENS.status["not-started"]);
205:         mesh.setColorAt(i, tmpColor);
206:       });
207:       mesh.instanceMatrix.needsUpdate = true;
208:       if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
209:       mesh.computeBoundingSphere();
210:     };
211:     place(hubMesh.current, hubs, layout.view === "terrain" ? 0.9 : 1.15, 0.5);
212:     place(midMesh.current, mids, 0.5, 0.28);
213:   }, [layout, state, hubs, mids]);
214: 
215:   const click = (list: string[]) => (e: ThreeEvent<MouseEvent>) => {
216:     e.stopPropagation();
217:     if (e.instanceId !== undefined) onSelect(list[e.instanceId] ?? null);
218:   };
219:   const move = (list: string[]) => (e: ThreeEvent<PointerEvent>) => {
220:     e.stopPropagation();
221:     if (e.instanceId !== undefined) onHover(list[e.instanceId] ?? null, e.nativeEvent.clientX, e.nativeEvent.clientY);
222:     document.body.style.cursor = "pointer";
223:   };
224:   const out = () => {
225:     onHover(null);
226:     document.body.style.cursor = "";
227:   };
228:   return (
229:     <group>
230:       {hubs.length > 0 && (
231:         <instancedMesh key={`h${hubs.length}`} ref={hubMesh} args={[beaconGeometry, undefined, hubs.length]} onClick={click(hubs)} onPointerMove={move(hubs)} onPointerOut={out}>
232:           <meshStandardMaterial roughness={0.68} metalness={0.06} />
233:         </instancedMesh>
234:       )}
235:       {mids.length > 0 && (
236:         <instancedMesh key={`m${mids.length}`} ref={midMesh} args={[beaconGeometry, undefined, mids.length]} onClick={click(mids)} onPointerMove={move(mids)} onPointerOut={out}>
237:           <meshStandardMaterial roughness={0.7} metalness={0.05} />
238:         </instancedMesh>
239:       )}
240:     </group>
241:   );
242: }
243: 
244: // ---------------------------------------------------------------------------
245: 
246: function Links({ layout }: { layout: Layout }) {
247:   const geometry = useMemo(() => {
248:     const pts: number[] = [];
249:     for (const [a, b] of layout.links) {
250:       const pa = layout.positions.get(a);
251:       const pb = layout.positions.get(b);
252:       if (!pa || !pb) continue;
253:       pts.push(pa[0], 0.05, pa[2], pb[0], 0.05, pb[2]);
254:     }
255:     // Rays from the core to each top-level group.
256:     for (const h of layout.hubs) {
257:       const p = layout.positions.get(h)!;
258:       pts.push(0, 0.05, 0, p[0], 0.05, p[2]);
259:     }
260:     const g = new BufferGeometry();
261:     g.setAttribute("position", new Float32BufferAttribute(pts, 3));
262:     return g;
263:   }, [layout]);
264:   useEffect(() => () => geometry.dispose(), [geometry]);
265:   if (layout.view === "terrain") return null;
266:   return (
267:     <lineSegments geometry={geometry} raycast={() => null}>
268:       <lineBasicMaterial color={TOKENS.outlineStrong} transparent opacity={0.78} />
269:     </lineSegments>
270:   );
271: }
272: 
273: function Rings({ layout }: { layout: Layout }) {
274:   const rings = useMemo(() => {
275:     if (layout.view === "terrain") return [layout.sectors[0]?.radius ?? 10];
276:     const radii = new Set<number>();
277:     for (const id of [...layout.hubs, ...layout.mids.slice(0, 1)]) {
278:       const p = layout.positions.get(id);
279:       if (p) radii.add(Math.round(Math.hypot(p[0], p[2]) * 10) / 10);
280:     }
281:     radii.add(layout.sectors[0]?.radius ?? 0);
282:     return [...radii].filter((r) => r > 0);
283:   }, [layout]);
284:   return (
285:     <group rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
286:       {rings.map((r) => (
287:         <mesh key={r} raycast={() => null}>
288:           <ringGeometry args={[r - 0.03, r + 0.03, 192]} />
289:           <meshBasicMaterial color={TOKENS.grid} transparent opacity={0.95} />
290:         </mesh>
291:       ))}
292:     </group>
293:   );
294: }
295: 
296: // ---------------------------------------------------------------------------
297: 
298: function Core({ active }: { active: boolean }) {
299:   const ref = useRef<Mesh>(null);
300:   const geometry = useMemo(() => new IcosahedronGeometry(1.4, 0), []);
301:   useFrame(({ clock }, dt) => {
302:     if (!ref.current) return;
303:     ref.current.rotation.y += active ? Math.min(dt, 0.1) * 0.6 : 0;
304:     const mat = ref.current.material as unknown as { emissiveIntensity: number };
305:     mat.emissiveIntensity = active ? 0.18 + Math.sin(clock.elapsedTime * 3) * 0.06 : 0.04;
306:   });
307:   return (
308:     <mesh ref={ref} geometry={geometry} position={[0, 1.6, 0]} raycast={() => null}>
309:       <meshStandardMaterial color={TOKENS.primary} emissive={TOKENS.primary} emissiveIntensity={0.04} roughness={0.58} metalness={0.12} flatShading />
310:     </mesh>
311:   );
312: }
313: 
314: /** Selection halo + highlighted ancestry path. */
315: function Selection({ layout, selectedId, state }: SceneProps) {
316:   // The ancestry path changes with the selection only (see Sectors on why points stay stable).
317:   const path = useMemo(() => {
318:     const out: Vec3[] = [];
319:     let cur = selectedId ? layout.byId.get(selectedId) : undefined;
320:     while (cur) {
321:       const q = layout.positions.get(cur.id);
322:       if (q) out.push([q[0], 0.08, q[2]]);
323:       cur = cur.parentId ? layout.byId.get(cur.parentId) : undefined;
324:     }
325:     out.push([0, 0.08, 0]);
326:     return out;
327:   }, [layout, selectedId]);
328:   if (!selectedId) return null;
329:   const p = layout.positions.get(selectedId);
330:   if (!p) return null;
331:   const node = layout.byId.get(selectedId);
332:   const u = state?.units[selectedId];
333:   const h = node?.assessable ? heightFor(Math.max(u?.current ?? 0, u?.target ?? 0), layout.view) : 0.6;
334:   const r = node?.assessable ? layout.cell * 1.6 : layout.view === "terrain" ? 1.6 : 1.9;
335:   return (
336:     <group>
337:       <mesh position={[p[0], 0.04, p[2]]} rotation={[-Math.PI / 2, 0, 0]} raycast={() => null}>
338:         <ringGeometry args={[r * 0.82, r, 6]} />
339:         <meshBasicMaterial color={TOKENS.primary} toneMapped={false} />
340:       </mesh>
341:       <mesh position={[p[0], h + 0.05, p[2]]} rotation={[-Math.PI / 2, 0, 0]} raycast={() => null}>
342:         <ringGeometry args={[r * 0.55, r * 0.62, 6]} />
343:         <meshBasicMaterial color={TOKENS.primary} toneMapped={false} transparent opacity={0.7} />
344:       </mesh>
345:       {layout.view === "constellation" && path.length > 1 && <Line points={path} color={TOKENS.primary} lineWidth={2.2} />}
346:     </group>
347:   );
348: }
349: 
350: /** Open tasks occupy fixed satellite slots; only active agent work moves. */
351: function Satellites({ layout, state }: SceneProps) {
352:   const ref = useRef<InstancedMesh>(null);
353:   const slots = useMemo(() => {
354:     const out: { p: Vec3; k: number; n: number; h: number }[] = [];
355:     for (const id of layout.units) {
356:       const u = state?.units[id];
357:       if (!u || !u.openTasks) continue;
358:       const p = layout.positions.get(id)!;
359:       const n = Math.min(3, u.openTasks);
360:       for (let k = 0; k < n; k++) out.push({ p, k, n, h: heightFor(Math.max(u.current, u.target), layout.view) });
361:     }
362:     return out;
363:   }, [layout, state]);
364:   const geometry = useMemo(() => new OctahedronGeometry(0.13, 0), []);
365:   useLayoutEffect(() => {
366:     const m = ref.current;
367:     if (!m) return;
368:     slots.forEach((s, i) => {
369:       const a = (s.k / s.n) * Math.PI * 2;
370:       const rr = layout.cell * 1.55;
371:       tmp.position.set(s.p[0] + Math.cos(a) * rr, s.h + 0.25, s.p[2] + Math.sin(a) * rr);
372:       tmp.rotation.set(0, a, 0);
373:       tmp.scale.setScalar(1);
374:       tmp.updateMatrix();
375:       m.setMatrixAt(i, tmp.matrix);
376:     });
377:     m.instanceMatrix.needsUpdate = true;
378:   }, [slots, layout]);
379:   if (!slots.length) return null;
380:   return (
381:     <instancedMesh key={slots.length} ref={ref} args={[geometry, undefined, slots.length]} raycast={() => null} frustumCulled={false}>
382:       <meshStandardMaterial color={TOKENS.onSurface} roughness={0.65} />
383:     </instancedMesh>
384:   );
385: }
386: 
387: /** Evidence crystals docked on units with accepted evidence. */
388: function Crystals({ layout, state }: SceneProps) {
389:   const ref = useRef<InstancedMesh>(null);
390:   const items = useMemo(() => layout.units.filter((id) => (state?.units[id]?.evidence ?? 0) > 0), [layout, state]);
391:   const geometry = useMemo(() => new TetrahedronGeometry(0.17, 0), []);
392:   useLayoutEffect(() => {
393:     const m = ref.current;
394:     if (!m) return;
395:     items.forEach((id, i) => {
396:       const p = layout.positions.get(id)!;
397:       const u = state!.units[id]!;
398:       tmp.position.set(p[0], heightFor(Math.max(u.current, u.target), layout.view) + 0.28, p[2]);
399:       tmp.rotation.set(0.6, 0.8, 0);
400:       tmp.scale.setScalar(1);
401:       tmp.updateMatrix();
402:       m.setMatrixAt(i, tmp.matrix);
403:       tmpColor.copy(u.status === "at-risk" ? TOKENS.status["at-risk"] : TOKENS.status.verified);
404:       m.setColorAt(i, tmpColor);
405:     });
406:     m.instanceMatrix.needsUpdate = true;
407:     if (m.instanceColor) m.instanceColor.needsUpdate = true;
408:   }, [items, layout, state]);
409:   if (!items.length) return null;
410:   return (
411:     <instancedMesh key={items.length} ref={ref} args={[geometry, undefined, items.length]} raycast={() => null} frustumCulled={false}>
412:       <meshStandardMaterial roughness={0.6} metalness={0.04} />
413:     </instancedMesh>
414:   );
415: }
416: 
417: /** Warm comets travelling from the core to nodes an agent is working on. */
418: function AgentComets({ layout, reducedMotion }: { layout: Layout; reducedMotion: boolean }) {
419:   const hot = useAgentActivity((s) => s.hot);
420:   const targets = useMemo(() => Object.keys(hot).filter((id) => layout.positions.has(id)).slice(0, 24), [hot, layout]);
421:   return <Comets layout={layout} targets={targets} reducedMotion={reducedMotion} />;
422: }
423: 
424: function Comets({ layout, targets, reducedMotion }: { layout: Layout; targets: string[]; reducedMotion: boolean }) {
425:   const curves = useMemo(
426:     () =>
427:       targets.map((id) => {
428:         const p = layout.positions.get(id)!;
429:         const end = new Vector3(p[0], 0.9, p[2]);
430:         const mid = new Vector3(p[0] * 0.5, 4 + Math.hypot(p[0], p[2]) * 0.18, p[2] * 0.5);
431:         return new QuadraticBezierCurve3(new Vector3(0, 1.6, 0), mid, end);
432:       }),
433:     [targets, layout],
434:   );
435:   const trails = useMemo(() => curves.map((c) => c.getPoints(32)), [curves]);
436:   const heads = useRef<(Mesh | null)[]>([]);
437:   useFrame(({ clock }) => {
438:     curves.forEach((curve, i) => {
439:       const m = heads.current[i];
440:       if (!m) return;
441:       const t = reducedMotion ? 1 : (clock.elapsedTime * 0.45 + i * 0.13) % 1;
442:       m.position.copy(curve.getPoint(t));
443:       m.scale.setScalar(reducedMotion ? 1 : 0.7 + Math.sin(t * Math.PI) * 0.6);
444:     });
445:   });
446:   if (!curves.length) return null;
447:   return (
448:     <group>
449:       {curves.map((curve, i) => (
450:         <group key={targets[i]}>
451:           <Line points={trails[i]!} color={TOKENS.tertiary} lineWidth={1.5} transparent opacity={0.62} />
452:           <mesh ref={(el) => (heads.current[i] = el)} raycast={() => null}>
453:             <sphereGeometry args={[0.22, 12, 12]} />
454:             <meshBasicMaterial color={TOKENS.tertiary} toneMapped={false} />
455:           </mesh>
456:           <mesh position={curve.getPoint(1)} rotation={[-Math.PI / 2, 0, 0]} raycast={() => null}>
457:             <ringGeometry args={[layout.cell * 1.2, layout.cell * 1.45, 6]} />
458:             <meshBasicMaterial color={TOKENS.tertiary} toneMapped={false} transparent opacity={0.8} />
459:           </mesh>
460:         </group>
461:       ))}
462:     </group>
463:   );
464: }
465: 
466: const pct = (x: number) => `${Math.round(x * 100)}%`;
467: 
468: /**
469:  * Titles and codes, placed in screen space (ScreenLabels): sector titles outside the
470:  * ring; codes for the selection, hover, agent focus, the selected group's members and
471:  * the mid-level groups when there are few. Higher priority wins where labels collide.
472:  */
473: function SceneLabels({ layout, state, selectedId, hoveredId, focusIds, onSelect }: SceneProps) {
474:   const labels = useMemo<ScreenLabel[]>(() => {
475:     const out: ScreenLabel[] = [];
476:     const selected = selectedId ? layout.byId.get(selectedId) : undefined;
477:     let root = selected;
478:     while (root?.parentId) root = layout.byId.get(root.parentId);
479:     for (const s of layout.sectors) {
480:       const g = state?.groups[s.id];
481:       const mid = (s.start + s.end) / 2;
482:       const position: Vec3 = layout.view === "constellation" ? [Math.cos(mid) * (s.radius + 1), 0.3, Math.sin(mid) * (s.radius + 1)] : s.labelPos;
483:       const titled = !!s.title && s.title.toUpperCase() !== s.code.toUpperCase();
484:       const sub = g ? (state?.threat ? `${pct(g.readiness)} covered · ${g.total} with links` : `${pct(g.readiness)} ready · ${g.gaps} gaps`) : undefined;
485:       const priority = root ? (root.id === s.id ? 700 : 300) : 500;
486:       const sector = { variant: "sector" as const, position, outwardFrom: [0, 0, 0] as Vec3, group: `sector:${s.id}`, active: selectedId === s.id, onClick: () => onSelect(s.id) };
487:       out.push({ ...sector, id: `sector:${s.id}`, code: titled ? s.code : undefined, title: titled ? s.title : s.code, sub, priority });
488:       // Where its title does not fit (twenty SP 800-53 families), a sector keeps its code, with its read-out if there is room.
489:       if (titled) {
490:         out.push({ ...sector, id: `sector:${s.id}:code`, title: s.code, sub, priority: priority - 12 });
491:         if (sub) out.push({ ...sector, id: `sector:${s.id}:bare`, title: s.code, priority: priority - 14 });
492:       }
493:     }
494:     const focus = new Set(focusIds);
495:     const members = new Set<string>();
496:     const group = selected ? (selected.assessable && selected.parentId ? selected.parentId : selected.id) : undefined;
497:     if (group) {
498:       const walk = (id: string) => {
499:         for (const k of layout.children.get(id) ?? []) {
500:           members.add(k.id);
501:           if (members.size < 90) walk(k.id);
502:         }
503:       };
504:       walk(group);
505:     }
506:     const ids = new Set<string>([selectedId, hoveredId, ...focusIds, ...members].filter((id): id is string => !!id && layout.positions.has(id)));
507:     if (layout.view === "constellation" && layout.mids.length <= 40) for (const id of layout.mids) ids.add(id);
508:     for (const id of ids) {
509:       const node = layout.byId.get(id);
510:       const p = layout.positions.get(id)!;
511:       const u = state?.units[id];
512:       const emphasized = id === selectedId || id === hoveredId;
513:       const y = node?.assessable ? heightFor(Math.max(u?.current ?? 0, u?.target ?? 0), layout.view) + 0.3 : 0.9;
514:       out.push({
515:         id: `code:${id}`,
516:         variant: emphasized ? "selected" : "code",
517:         position: [p[0], y, p[2]],
518:         title: (node?.meta?.["label"] as string | undefined) ?? node?.code ?? "",
519:         // Groups with units in scope (a law that applies) outrank the rest when space is short.
520:         priority: id === selectedId ? 1000 : id === hoveredId ? 900 : focus.has(id) ? 450 : members.has(id) ? 350 : state?.groups[id]?.total ? 260 : 200,
521:         active: id === selectedId,
522:       });
523:     }
524:     return out;
525:   }, [layout, state, selectedId, hoveredId, focusIds, onSelect]);
526:   return <ScreenLabels labels={labels} />;
527: }
528: 
529: /**
530:  * Compiles, as soon as the scene is up, the shader programs that only a selection and agent
531:  * activity use: the selection halo and path, and agent comets. Compiled on first use, they
532:  * stalled the frame that answered the first click by 60 to 100 ms. The real components are
533:  * drawn for a couple of frames, for one unit, shrunk inside the opaque core where the depth
534:  * test hides them, so they compile through the same tone-mapping pipeline
535:  * as the real ones. Then they are hidden, not removed, and never re-rendered by a selection:
536:  * disposing their materials would let three.js delete the programs again. They are drawn
537:  * again when the layout changes. (`renderer.compileAsync` does not reliably warm
538:  * the same program variants as the real components.)
539:  */
540: const ShaderWarmup = memo(function ShaderWarmup({ layout }: { layout: Layout }) {
541:   const group = useRef<Group>(null);
542:   const frames = useRef(0);
543:   const unit = layout.units[0];
544:   const targets = useMemo(() => (unit ? [unit] : []), [unit]);
545:   // Shown again for each layout, drawn however far they are from the camera's view.
546:   useLayoutEffect(() => {
547:     frames.current = 0;
548:     if (!group.current) return;
549:     group.current.visible = true;
550:     group.current.traverse((o) => (o.frustumCulled = false));
551:   }, [layout]);
552:   useFrame(() => {
553:     if (group.current?.visible && ++frames.current > 2) group.current.visible = false;
554:   });
555:   if (!unit) return null;
556:   const noop = () => undefined;
557:   return (
558:     <group ref={group} position={[0, 1.6, 0]} scale={0.001}>
559:       <Selection layout={layout} state={undefined} selectedId={unit} lens="status" hoveredId={null} focusIds={[]} reducedMotion onHover={noop} onSelect={noop} />
560:       <Comets layout={layout} targets={targets} reducedMotion />
561:     </group>
562:   );
563: });
564: 
565: export function FrameworkScene(props: SceneProps & { agentActive: boolean }) {
566:   return (
567:     <group>
568:       <SpatialGround {...props} />
569:       <Rings layout={props.layout} />
570:       <Links layout={props.layout} />
571:       <Core active={props.agentActive && !props.reducedMotion} />
572:       <Beacons {...props} />
573:       <UnitField {...props} />
574:       <Satellites {...props} />
575:       <Crystals {...props} />
576:       <Selection {...props} />
577:       <AgentComets layout={props.layout} reducedMotion={props.reducedMotion} />
578:       <ShaderWarmup layout={props.layout} />
579:       <SceneLabels {...props} />
580:     </group>
581:   );
582: }

SOURCE apps/web/src/scene/SpatialGround.tsx
1: /** Batched cartographic surfaces: hierarchy in constellation, districts in terrain. */
2: import { useEffect, useMemo } from "react";
3: import { Color, Float32BufferAttribute } from "three";
4: import type { SceneProps } from "./FrameworkScene.tsx";
5: import { TOKENS } from "./colors.ts";
6: import { arcTriangles, districtHulls, hullTriangles, positionGeometry, rootOf } from "./spatialGeometry.ts";
7: 
8: export function SpatialGround({ layout, state, selectedId }: SceneProps) {
9:   const selectedRoot = rootOf(layout, selectedId);
10:   const hulls = useMemo(() => districtHulls(layout), [layout]);
11:   const geometry = useMemo(() => {
12:     const surfaces: number[] = [];
13:     const colors: number[] = [];
14:     const borders: number[] = [];
15:     const rails: number[] = [];
16:     const railColors: number[] = [];
17:     const add = (target: number[], palette: number[], vertices: number[], color: Color) => {
18:       target.push(...vertices);
19:       for (let i = 0; i < vertices.length / 3; i++) palette.push(color.r, color.g, color.b);
20:     };
21:     for (const sector of layout.sectors) {
22:       const active = sector.id === selectedRoot;
23:       const color = active ? TOKENS.primaryContainer : TOKENS.surfaceBright;
24:       if (layout.view === "constellation") {
25:         const hub = layout.positions.get(sector.id);
26:         const inner = Math.max(2.2, Math.hypot(hub?.[0] ?? 0, hub?.[2] ?? 0) - 2);
27:         const outer = sector.radius - 0.7;
28:         add(surfaces, colors, arcTriangles(inner, outer, sector.start, sector.end, -0.055), color);
29:         for (const a of [sector.start, sector.end]) {
30:           borders.push(Math.cos(a) * inner, -0.025, Math.sin(a) * inner, Math.cos(a) * outer, -0.025, Math.sin(a) * outer);
31:         }
32:         const score = state?.groups[sector.id];
33:         const width = Math.max(0.12, Math.min(0.28, sector.radius * 0.007));
34:         const gap = Math.min((sector.end - sector.start) * 0.25, 0.35 / sector.radius);
35:         const start = sector.start + gap / 2;
36:         const end = sector.end - gap / 2;
37:         const share = score && score.total > 0 ? Math.max(0, Math.min(1, score.readiness)) : 0;
38:         const filled = start + (end - start) * share;
39:         add(rails, railColors, arcTriangles(sector.radius - width * 0.35, sector.radius + width * 0.35, filled, end, 0.03), TOKENS.outlineStrong);
40:         if (score && share > 0) add(rails, railColors, arcTriangles(sector.radius - width, sector.radius + width, start, filled, 0.03), TOKENS.status[score.status]);
41:         for (const q of [0, 0.25, 0.5, 0.75, 1]) {
42:           const angle = start + (end - start) * q;
43:           const half = 0.035 / sector.radius;
44:           add(rails, railColors, arcTriangles(sector.radius + width, sector.radius + width * 2.4, angle - half, angle + half, 0.03), TOKENS.outlineStrong);
45:         }
46:       } else {
47:         const hub = layout.positions.get(sector.id);
48:         const score = state?.groups[sector.id];
49:         if (hub) {
50:           const ring = (end: number, y: number) => {
51:             const pts = arcTriangles(1.16, 1.34, -Math.PI / 2, end, y);
52:             for (let i = 0; i < pts.length; i += 3) {
53:               pts[i] = pts[i]! + hub[0];
54:               pts[i + 2] = pts[i + 2]! + hub[2];
55:             }
56:             return pts;
57:           };
58:           add(rails, railColors, ring(Math.PI * 1.5, 0.025), TOKENS.outlineStrong);
59:           if (score && score.total > 0) add(rails, railColors, ring(-Math.PI / 2 + Math.PI * 2 * Math.max(0, Math.min(1, score.readiness)), 0.035), TOKENS.status[score.status]);
60:         }
61:         const hull = hulls.get(sector.id);
62:         if (!hull?.length) continue;
63:         add(surfaces, colors, hullTriangles(hull, -0.055), color);
64:         for (let i = 0; i < hull.length; i++) {
65:           const a = hull[i]!;
66:           const b = hull[(i + 1) % hull.length]!;
67:           borders.push(a[0], -0.025, a[1], b[0], -0.025, b[1]);
68:         }
69:       }
70:     }
71:     const ground = positionGeometry(surfaces);
72:     ground.setAttribute("color", new Float32BufferAttribute(colors, 3));
73:     const progress = positionGeometry(rails);
74:     progress.setAttribute("color", new Float32BufferAttribute(railColors, 3));
75:     return { ground, progress, borders: positionGeometry(borders) };
76:   }, [layout, state, selectedRoot, hulls]);
77:   useEffect(() => () => Object.values(geometry).forEach((g) => g.dispose()), [geometry]);
78:   return (
79:     <group raycast={() => null}>
80:       <mesh geometry={geometry.ground} raycast={() => null}>
81:         <meshBasicMaterial vertexColors />
82:       </mesh>
83:       <lineSegments geometry={geometry.borders} raycast={() => null}>
84:         <lineBasicMaterial color={TOKENS.outlineStrong} transparent opacity={0.65} />
85:       </lineSegments>
86:       <mesh geometry={geometry.progress} raycast={() => null}>
87:         <meshBasicMaterial vertexColors />
88:       </mesh>
89:     </group>
90:   );
91: }

SOURCE apps/web/src/scene/spatialGeometry.ts
1: /** Ground geometry stays on XZ: surface offsets prevent z-fighting, never encode data. */
2: import { BufferGeometry, Float32BufferAttribute } from "three";
3: import type { Layout, Vec3 } from "./layout.ts";
4: 
5: export type Point2 = [number, number];
6: 
7: /** Counter-clockwise convex hull in XZ, including the footprint of every cell. */
8: export function convexHull(points: Point2[]): Point2[] {
9:   const sorted = [...new Map(points.map((p) => [`${p[0]},${p[1]}`, p])).values()].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
10:   if (sorted.length < 3) return sorted;
11:   const cross = (a: Point2, b: Point2, c: Point2) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
12:   const half = (list: Point2[]) => {
13:     const out: Point2[] = [];
14:     for (const p of list) {
15:       while (out.length > 1 && cross(out.at(-2)!, out.at(-1)!, p) <= 0) out.pop();
16:       out.push(p);
17:     }
18:     return out;
19:   };
20:   return [...half(sorted).slice(0, -1), ...half([...sorted].reverse()).slice(0, -1)];
21: }
22: 
23: export function rootOf(layout: Layout, id: string | null): string | undefined {
24:   let node = id ? layout.byId.get(id) : undefined;
25:   while (node?.parentId) node = layout.byId.get(node.parentId);
26:   return node?.id;
27: }
28: 
29: export function districtHulls(layout: Layout): Map<string, Point2[]> {
30:   const points = new Map<string, Point2[]>();
31:   for (const id of layout.units) {
32:     const root = rootOf(layout, id);
33:     const p = layout.positions.get(id);
34:     if (!root || !p) continue;
35:     const list = points.get(root) ?? [];
36:     for (let i = 0; i < 6; i++) {
37:       const a = i * Math.PI / 3;
38:       list.push([p[0] + Math.sin(a) * layout.cell * 1.3, p[2] + Math.cos(a) * layout.cell * 1.3]);
39:     }
40:     points.set(root, list);
41:   }
42:   return new Map([...points].map(([id, pts]) => [id, convexHull(pts)]));
43: }
44: 
45: /** Explicit upward winding for a triangle fan on XZ. */
46: export function hullTriangles(hull: Point2[], y: number): number[] {
47:   const out: number[] = [];
48:   for (let i = 1; i + 1 < hull.length; i++) {
49:     for (const p of [hull[0]!, hull[i + 1]!, hull[i]!]) out.push(p[0], y, p[1]);
50:   }
51:   return out;
52: }
53: 
54: /** An annular strip, with subdivision proportional to its angular span. */
55: export function arcTriangles(inner: number, outer: number, start: number, end: number, y: number): number[] {
56:   if (end <= start || outer <= inner) return [];
57:   const out: number[] = [];
58:   const steps = Math.max(1, Math.ceil((end - start) * 40));
59:   const p = (r: number, a: number): Vec3 => [Math.cos(a) * r, y, Math.sin(a) * r];
60:   for (let i = 0; i < steps; i++) {
61:     const a = start + (end - start) * i / steps;
62:     const b = start + (end - start) * (i + 1) / steps;
63:     for (const v of [p(inner, a), p(inner, b), p(outer, a), p(outer, a), p(inner, b), p(outer, b)]) out.push(...v);
64:   }
65:   return out;
66: }
67: 
68: export function positionGeometry(positions: number[]): BufferGeometry {
69:   const geometry = new BufferGeometry();
70:   geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
71:   return geometry;
72: }
73: 
74: /** A flat six-sided rim aligned with Three's CylinderGeometry, for instancing. */
75: export function hexRimGeometry(inner = 0.9): BufferGeometry {
76:   const out: number[] = [];
77:   for (let i = 0; i < 6; i++) {
78:     const a = i * Math.PI / 3;
79:     const b = (i + 1) * Math.PI / 3;
80:     const p = (r: number, angle: number) => [Math.sin(angle) * r, 0, Math.cos(angle) * r];
81:     for (const v of [p(inner, a), p(1, a), p(inner, b), p(1, a), p(1, b), p(inner, b)]) out.push(...v);
82:   }
83:   return positionGeometry(out);
84: }

SOURCE apps/web/src/scene/Observatory.tsx
1: /**
2:  * The Observatory canvas: camera, soft daylight, fog and the framework space.
3:  * Camera: 45° FOV, damped orbit, fly-to on selection, never below the plane.
4:  */
5: import { CameraControls } from "@react-three/drei";
6: import { Canvas, useThree } from "@react-three/fiber";
7: import { useEffect, useMemo, useRef, useState } from "react";
8: import { FogExp2, Sphere, Vector3, type PerspectiveCamera } from "three";
9: import { TOKENS } from "./colors.ts";
10: import { FrameworkScene, heightFor, type SceneProps } from "./FrameworkScene.tsx";
11: import type { Layout } from "./layout.ts";
12: import { fitRing, titleSize, useSafeArea } from "./framing.ts";
13: import { hudRects, type Rect } from "./ScreenLabels.tsx";
14: 
15: /** The Observatory's home view: its ring and sector titles, seen from the front at ~43°. */
16: function homePose(layout: Layout, camera: PerspectiveCamera, width: number, height: number, safe: Rect, panels: Rect[]) {
17:   const R = layout.view === "constellation" && layout.sectors[0] ? layout.sectors[0].radius : layout.radius - 3;
18:   const titles = layout.sectors.map((s) => {
19:     const mid = (s.start + s.end) / 2;
20:     const r = layout.view === "constellation" ? s.radius + 1 : Math.hypot(s.labelPos[0], s.labelPos[2]);
21:     const titled = !!s.title && s.title.toUpperCase() !== s.code.toUpperCase();
22:     return { anchor: new Vector3(Math.cos(mid) * r, 0.3, Math.sin(mid) * r), ...titleSize(titled ? s.title : s.code, { code: titled }) };
23:   });
24:   return fitRing({ camera, width, height, safe, panels, radius: R, top: heightFor(4, layout.view), titles, dir: new Vector3(0, 1.42, 1.52) });
25: }
26: 
27: function CameraRig({ layout, selectedId, focusIds, focusSeq, reducedMotion }: { layout: Layout; selectedId: string | null; focusIds: string[]; focusSeq: number; reducedMotion: boolean }) {
28:   const controls = useRef<CameraControls>(null);
29:   const camera = useThree((s) => s.camera) as PerspectiveCamera;
30:   const gl = useThree((s) => s.gl);
31:   const scene = useThree((s) => s.scene);
32:   const size = useThree((s) => s.size);
33:   const animate = !reducedMotion;
34:   const safe = useSafeArea();
35:   // Whether the camera still shows the home view (a HUD change then re-frames it).
36:   const atHome = useRef(true);
37: 
38:   const home = (transition: boolean) => {
39:     if (!safe || !controls.current) return;
40:     const pose = homePose(layout, camera, size.width, size.height, safe, hudRects(gl.domElement));
41:     // Keep the fog's depth cue the same however far back the canvas needs the camera.
42:     if (scene.fog instanceof FogExp2) scene.fog.density = 0.55 / Math.max(40, pose.distance * 1.15);
43:     void controls.current.setLookAt(pose.position.x, pose.position.y, pose.position.z, pose.target.x, pose.target.y, pose.target.z, transition);
44:     atHome.current = true;
45:   };
46: 
47:   useEffect(() => {
48:     const c = controls.current;
49:     if (!c) return;
50:     const away = () => {
51:       atHome.current = false;
52:     };
53:     c.addEventListener("controlstart", away);
54:     return () => c.removeEventListener("controlstart", away);
55:   }, []);
56: 
57:   useEffect(() => {
58:     atHome.current = true;
59:     home(false);
60:     // eslint-disable-next-line react-hooks/exhaustive-deps
61:   }, [layout]);
62: 
63:   useEffect(() => {
64:     if (atHome.current && !selectedId) home(animate);
65:     // eslint-disable-next-line react-hooks/exhaustive-deps
66:   }, [safe]);
67: 
68:   useEffect(() => {
69:     if (!selectedId) return;
70:     const p = layout.positions.get(selectedId);
71:     if (!p) return;
72:     atHome.current = false;
73:     const node = layout.byId.get(selectedId);
74:     const scale = layout.radius > 60 ? 1.8 : 1;
75:     const dist = (node?.assessable ? 17 : node?.depth === 0 ? 30 : 22) * scale;
76:     const len = Math.hypot(p[0], p[2]) || 1;
77:     const dx = p[0] / len;
78:     const dz = p[2] / len;
79:     const y = node?.assessable ? heightFor(2, layout.view) : 0.4;
80:     void controls.current?.setLookAt(p[0] + dx * dist * 0.65, dist * 0.8, p[2] + dz * dist * 0.65, p[0], y, p[2], animate);
81:     // eslint-disable-next-line react-hooks/exhaustive-deps
82:   }, [selectedId, layout]);
83: 
84:   useEffect(() => {
85:     if (focusSeq === 0) return;
86:     const pts = focusIds.map((id) => layout.positions.get(id)).filter((p): p is [number, number, number] => !!p);
87:     if (!pts.length) return home(animate);
88:     if (pts.length === 1) return;
89:     atHome.current = false;
90:     const center = new Vector3(pts.reduce((s, p) => s + p[0], 0) / pts.length, 0, pts.reduce((s, p) => s + p[2], 0) / pts.length);
91:     const radius = Math.max(4, ...pts.map((p) => Math.hypot(p[0] - center.x, p[2] - center.z))) + 2;
92:     void controls.current?.fitToSphere(new Sphere(center, radius), animate);
93:     // eslint-disable-next-line react-hooks/exhaustive-deps
94:   }, [focusSeq]);
95: 
96:   return (
97:     <CameraControls
98:       ref={controls}
99:       makeDefault
100:       minDistance={2.5}
101:       maxDistance={layout.radius * 8}
102:       maxPolarAngle={Math.PI * 0.46}
103:       smoothTime={animate ? 0.32 : 0.001}
104:       dollySpeed={0.7}
105:     />
106:   );
107: }
108: 
109: export interface ObservatoryProps extends Omit<SceneProps, "reducedMotion"> {
110:   focusSeq: number;
111:   agentActive: boolean;
112: }
113: 
114: export function usePrefersReducedMotion(): boolean {
115:   const [reduced, setReduced] = useState(() => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
116:   useEffect(() => {
117:     const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
118:     const on = () => setReduced(mq.matches);
119:     mq.addEventListener("change", on);
120:     return () => mq.removeEventListener("change", on);
121:   }, []);
122:   return reduced;
123: }
124: 
125: export function Observatory(props: ObservatoryProps) {
126:   const reducedMotion = usePrefersReducedMotion();
127:   const fogDensity = useMemo(() => 0.55 / Math.max(40, props.layout.radius * 2.4), [props.layout.radius]);
128:   return (
129:     <Canvas
130:       dpr={[1, 1.75]}
131:       camera={{ fov: 45, near: 0.1, far: 4000, position: [0, 40, 60] }}
132:       gl={{ antialias: true, powerPreference: "high-performance", preserveDrawingBuffer: true }}
133:       onPointerMissed={() => props.onSelect(null)}
134:       aria-label="3D Observatory of the framework. Use the outline panel for keyboard navigation."
135:     >
136:       <color attach="background" args={[TOKENS.neutral]} />
137:       <fogExp2 attach="fog" args={[TOKENS.neutral, fogDensity]} />
138:       <hemisphereLight args={[TOKENS.surface, TOKENS.primaryContainer, 0.85]} />
139:       <ambientLight intensity={0.25} />
140:       <directionalLight position={[30, 60, 20]} intensity={2.1} />
141:       <directionalLight position={[-40, 20, -30]} intensity={0.45} color={TOKENS.neutral} />
142:       <FrameworkScene {...props} reducedMotion={reducedMotion} />
143:       <CameraRig layout={props.layout} selectedId={props.selectedId} focusIds={props.focusIds} focusSeq={props.focusSeq} reducedMotion={reducedMotion} />
144:     </Canvas>
145:   );
146: }

SOURCE apps/web/src/scene/layout.ts
1: /**
2:  * Spatial layouts for any framework graph (DESIGN.md › Spatial System).
3:  *
4:  * - Constellation: radial hierarchy on the XZ plane. Top-level groups get
5:  *   angular sectors proportional to their size; units of work sit on outer
6:  *   rings; SP 800-53 enhancements form radial stalks beyond their control.
7:  * - Terrain: each top-level group is a honeycomb "district" of hex cells, one
8:  *   cell per unit of work; districts ring the framework core.
9:  *
10:  * Y is reserved for measured values (current / target level), never decoration.
11:  */
12: import type { LeanNode } from "../lib/types.ts";
13: 
14: export type Vec3 = [number, number, number];
15: export type ViewMode = "constellation" | "terrain";
16: 
17: export interface Sector {
18:   id: string;
19:   code: string;
20:   title: string;
21:   start: number;
22:   end: number;
23:   radius: number;
24:   labelPos: Vec3;
25: }
26: 
27: export interface Layout {
28:   view: ViewMode;
29:   positions: Map<string, Vec3>;
30:   /** Hex radius for unit cells in this layout. */
31:   cell: number;
32:   units: string[];
33:   hubs: string[];
34:   mids: string[];
35:   links: [string, string][];
36:   sectors: Sector[];
37:   radius: number;
38:   byId: Map<string, LeanNode>;
39:   children: Map<string | null, LeanNode[]>;
40: }
41: 
42: function index(nodes: LeanNode[]) {
43:   const byId = new Map(nodes.map((n) => [n.id, n]));
44:   const children = new Map<string | null, LeanNode[]>();
45:   for (const n of nodes) {
46:     const list = children.get(n.parentId) ?? [];
47:     list.push(n);
48:     children.set(n.parentId, list);
49:   }
50:   for (const list of children.values()) list.sort((a, b) => a.order - b.order);
51:   return { byId, children };
52: }
53: 
54: function weightOf(id: string, children: Map<string | null, LeanNode[]>, byId: Map<string, LeanNode>, memo: Map<string, number>): number {
55:   const cached = memo.get(id);
56:   if (cached !== undefined) return cached;
57:   const kids = children.get(id) ?? [];
58:   const self = byId.get(id)?.assessable ? 1 : 0;
59:   const w = Math.max(1, self + kids.reduce((s, k) => s + weightOf(k.id, children, byId, memo), 0));
60:   memo.set(id, w);
61:   return w;
62: }
63: 
64: const polar = (r: number, a: number, y = 0): Vec3 => [Math.cos(a) * r, y, Math.sin(a) * r];
65: 
66: /**
67:  * The scene draws units of work and the groups that hold them. Nodes with no unit
68:  * below them (MITRE ATLAS's mitigations, a law with no tracked obligation) stay in
69:  * the outline and the inspector but take no place in space: `positions` has only
70:  * what is drawn, while `byId` and `children` keep every node for navigation.
71:  */
72: export function computeLayout(nodes: LeanNode[], view: ViewMode): Layout {
73:   const { children } = index(nodes);
74:   const holds = new Map<string, boolean>();
75:   const hasUnit = (n: LeanNode): boolean => {
76:     const known = holds.get(n.id);
77:     if (known !== undefined) return known;
78:     const v = n.assessable || (children.get(n.id) ?? []).some(hasUnit);
79:     holds.set(n.id, v);
80:     return v;
81:   };
82:   const drawn = nodes.filter(hasUnit);
83:   const layout = view === "terrain" ? terrain(drawn) : constellation(drawn);
84:   const all = index(nodes);
85:   return { ...layout, byId: all.byId, children: all.children };
86: }
87: 
88: function constellation(nodes: LeanNode[]): Layout {
89:   const { byId, children } = index(nodes);
90:   const memo = new Map<string, number>();
91:   const roots = children.get(null) ?? [];
92:   const positions = new Map<string, Vec3>();
93:   const units: string[] = [];
94:   const hubs: string[] = [];
95:   const mids: string[] = [];
96:   const links: [string, string][] = [];
97:   const sectors: Sector[] = [];
98: 
99:   // Ring radii grow with density so nodes never overlap.
100:   const byDepth = new Map<number, number>();
101:   for (const n of nodes) {
102:     const parent = n.parentId ? byId.get(n.parentId) : undefined;
103:     const stalk = parent?.assessable && n.assessable;
104:     if (!stalk) byDepth.set(n.depth, (byDepth.get(n.depth) ?? 0) + 1);
105:   }
106:   const spacing = 1.15;
107:   const usable = 2 * Math.PI * 0.86;
108:   const radii: number[] = [];
109:   let r = 0;
110:   for (let d = 0; d <= 4; d++) {
111:     const count = byDepth.get(d) ?? 0;
112:     const min = d === 0 ? Math.max(6.5, (count * 3.2) / usable) : r + 7;
113:     r = Math.max(min, (count * spacing) / usable);
114:     radii.push(r);
115:   }
116: 
117:   // A ring of labeled groups (up to 40, e.g. the state laws between jurisdictions and
118:   // obligations) moves out toward the units so the group codes have room to be read.
119:   const labeledMids = nodes.filter((n) => n.depth === 1 && !n.assessable).length;
120:   if (labeledMids > 0 && labeledMids <= 40 && radii[2] !== undefined && byDepth.get(2)) radii[1] = Math.max(radii[1]!, Math.min(radii[2] * 0.58, radii[2] - 7));
121: 
122:   const totalWeight = roots.reduce((s, n) => s + weightOf(n.id, children, byId, memo), 0);
123:   const gap = roots.length > 1 ? 0.14 * Math.PI * 2 * (1 / roots.length) * 0.35 : 0;
124:   const available = Math.PI * 2 - gap * roots.length;
125:   let angle = -Math.PI / 2 + gap / 2;
126:   let outer = radii[0]!;
127: 
128:   const place = (node: LeanNode, a0: number, a1: number) => {
129:     const mid = (a0 + a1) / 2;
130:     const r0 = radii[node.depth] ?? radii[radii.length - 1]!;
131:     positions.set(node.id, polar(r0, mid));
132:     outer = Math.max(outer, r0);
133:     if (node.depth === 0) hubs.push(node.id);
134:     else if (node.assessable) units.push(node.id);
135:     else mids.push(node.id);
136:     if (node.parentId) links.push([node.parentId, node.id]);
137:     const kids = children.get(node.id) ?? [];
138:     if (!kids.length) return;
139:     if (node.assessable) {
140:       // Stalk: enhancements continue radially outward, zig-zagging slightly.
141:       kids.forEach((k, i) => {
142:         const rr = r0 + 1.25 * (i + 1);
143:         const wobble = ((i % 2 === 0 ? 1 : -1) * 0.32) / Math.max(rr, 1);
144:         positions.set(k.id, polar(rr, mid + wobble));
145:         outer = Math.max(outer, rr);
146:         units.push(k.id);
147:         links.push([i === 0 ? node.id : kids[i - 1]!.id, k.id]);
148:         for (const g of children.get(k.id) ?? []) place(g, mid, mid);
149:       });
150:       return;
151:     }
152:     const w = kids.reduce((s, k) => s + weightOf(k.id, children, byId, memo), 0);
153:     let a = a0;
154:     for (const k of kids) {
155:       const span = ((a1 - a0) * weightOf(k.id, children, byId, memo)) / w;
156:       place(k, a, a + span);
157:       a += span;
158:     }
159:   };
160: 
161:   for (const root of roots) {
162:     const span = (available * weightOf(root.id, children, byId, memo)) / totalWeight;
163:     place(root, angle, angle + span);
164:     sectors.push({ id: root.id, code: root.code, title: root.title, start: angle, end: angle + span, radius: 0, labelPos: [0, 0, 0] });
165:     angle += span + gap;
166:   }
167:   const sectorRadius = outer + 3.2;
168:   for (const s of sectors) {
169:     s.radius = sectorRadius;
170:     s.labelPos = polar(sectorRadius + 3.4, (s.start + s.end) / 2, 0.2);
171:   }
172:   return { view: "constellation", positions, cell: 0.46, units, hubs, mids, links, sectors, radius: sectorRadius + 6, byId, children };
173: }
174: 
175: /** Axial hex coordinates of a spiral fill (center first, then rings). */
176: function hexSpiral(count: number): [number, number][] {
177:   const out: [number, number][] = [[0, 0]];
178:   const dirs: [number, number][] = [
179:     [1, 0],
180:     [1, -1],
181:     [0, -1],
182:     [-1, 0],
183:     [-1, 1],
184:     [0, 1],
185:   ];
186:   for (let ring = 1; out.length < count; ring++) {
187:     let q = -ring;
188:     let r = ring;
189:     for (const [dq, dr] of dirs) {
190:       for (let s = 0; s < ring && out.length < count; s++) {
191:         out.push([q, r]);
192:         q += dq;
193:         r += dr;
194:       }
195:     }
196:   }
197:   return out.slice(0, count);
198: }
199: 
200: function terrain(nodes: LeanNode[]): Layout {
201:   const { byId, children } = index(nodes);
202:   const roots = children.get(null) ?? [];
203:   const positions = new Map<string, Vec3>();
204:   const units: string[] = [];
205:   const hubs: string[] = [];
206:   const mids: string[] = [];
207:   const links: [string, string][] = [];
208:   const sectors: Sector[] = [];
209:   const cell = 0.82;
210:   const w = Math.sqrt(3) * cell;
211: 
212:   const collect = (id: string): LeanNode[] => {
213:     const out: LeanNode[] = [];
214:     const walk = (pid: string) => {
215:       for (const k of children.get(pid) ?? []) {
216:         if (k.assessable) out.push(k);
217:         else mids.push(k.id);
218:         walk(k.id);
219:       }
220:     };
221:     walk(id);
222:     return out;
223:   };
224: 
225:   const districts = roots.map((root) => {
226:     const cells = collect(root.id);
227:     const spiral = hexSpiral(Math.max(1, cells.length));
228:     const radius = cell * 1.9 * Math.sqrt(Math.max(1, cells.length)) * 0.62 + cell * 1.6;
229:     return { root, cells, spiral, radius };
230:   });
231:   const circumference = districts.reduce((s, d) => s + d.radius * 2 + 3, 0);
232:   const ringRadius = Math.max(9, circumference / (2 * Math.PI));
233:   let angle = -Math.PI / 2;
234:   for (const d of districts) {
235:     const span = ((d.radius * 2 + 3) / circumference) * Math.PI * 2;
236:     const mid = angle + span / 2;
237:     const center = polar(ringRadius + d.radius * 0.35, mid);
238:     hubs.push(d.root.id);
239:     positions.set(d.root.id, [center[0] * 0.42, 0, center[2] * 0.42]);
240:     d.cells.forEach((c, i) => {
241:       const [q, r] = d.spiral[i]!;
242:       const x = center[0] + w * (q + r / 2);
243:       const z = center[2] + cell * 1.5 * r;
244:       positions.set(c.id, [x, 0, z]);
245:       units.push(c.id);
246:     });
247:     // Mid-level groups (categories/controls) sit at the centroid of their cells for navigation.
248:     for (const mid of children.get(d.root.id) ?? []) {
249:       if (mid.assessable) continue;
250:       const pts = (function gather(id: string): Vec3[] {
251:         return (children.get(id) ?? []).flatMap((k) => (k.assessable ? [positions.get(k.id)!] : gather(k.id)));
252:       })(mid.id).filter(Boolean);
253:       if (!pts.length) continue;
254:       const cx = pts.reduce((s, p) => s + p[0], 0) / pts.length;
255:       const cz = pts.reduce((s, p) => s + p[2], 0) / pts.length;
256:       positions.set(mid.id, [cx, 0, cz]);
257:     }
258:     sectors.push({ id: d.root.id, code: d.root.code, title: d.root.title, start: angle, end: angle + span, radius: ringRadius, labelPos: polar(ringRadius + d.radius * 0.35 + d.radius + 2.2, mid, 0.2) });
259:     angle += span;
260:   }
261:   for (const id of mids) if (!positions.has(id)) positions.set(id, [0, 0, 0]);
262:   return { view: "terrain", positions, cell, units, hubs, mids, links, sectors, radius: ringRadius + Math.max(...districts.map((d) => d.radius)) + 3, byId, children };
263: }

SOURCE apps/web/test/spatial-geometry.test.ts
1: import { CylinderGeometry, Vector3 } from "three";
2: import { describe, expect, it } from "vitest";
3: import type { LeanNode } from "../src/lib/types.ts";
4: import { computeLayout } from "../src/scene/layout.ts";
5: import { arcTriangles, convexHull, districtHulls, hexRimGeometry, hullTriangles, rootOf } from "../src/scene/spatialGeometry.ts";
6: 
7: function expectUpward(positions: number[]) {
8:   for (let i = 0; i < positions.length; i += 9) {
9:     const a = new Vector3().fromArray(positions, i);
10:     const b = new Vector3().fromArray(positions, i + 3);
11:     const c = new Vector3().fromArray(positions, i + 6);
12:     expect(b.sub(a).cross(c.sub(a)).y).toBeGreaterThan(0);
13:   }
14: }
15: 
16: const node = (id: string, parentId: string | null, depth: number, assessable: boolean): LeanNode => ({ id, parentId, depth, assessable, code: id, title: id, text: "", order: 0, kind: assessable ? "subcategory" : "function" });
17: 
18: describe("cartographic ground geometry", () => {
19:   it("keeps annular strips facing the above-ground camera across wraparound angles", () => {
20:     for (const [start, end] of [[-Math.PI / 2, Math.PI * 1.5], [5.8, 6.6], [0, 0.0001]]) {
21:       const pts = arcTriangles(5, 9, start!, end!, -0.05);
22:       expectUpward(pts);
23:       for (let i = 0; i < pts.length; i += 3) {
24:         expect(Math.hypot(pts[i]!, pts[i + 2]!)).toBeGreaterThanOrEqual(5 - 1e-9);
25:         expect(Math.hypot(pts[i]!, pts[i + 2]!)).toBeLessThanOrEqual(9 + 1e-9);
26:         expect(pts[i + 1]).toBe(-0.05);
27:       }
28:     }
29:     expect(arcTriangles(5, 9, 1, 1, 0)).toEqual([]);
30:   });
31: 
32:   it("handles duplicate/collinear points and produces upward district surfaces", () => {
33:     const hull = convexHull([[0, 0], [2, 0], [1, 0], [2, 2], [0, 2], [1, 1], [0, 0]]);
34:     expect(hull).toHaveLength(4);
35:     expectUpward(hullTriangles(hull, -0.05));
36:     expect(convexHull([])).toEqual([]);
37:     expect(hullTriangles(convexHull([[0, 0], [1, 0]]), 0)).toEqual([]);
38:   });
39: 
40:   it("encloses every terrain cell in its own root district, including deep descendants", () => {
41:     const nodes = [node("a", null, 0, false), node("b", null, 0, false), node("group", "a", 1, false)];
42:     for (let i = 0; i < 180; i++) nodes.push(node(`u${i}`, i % 2 ? "group" : "b", i % 2 ? 2 : 1, true));
43:     const layout = computeLayout(nodes, "terrain");
44:     const hulls = districtHulls(layout);
45:     expect(hulls.size).toBe(2);
46:     expect(rootOf(layout, "u1")).toBe("a");
47:     expect(rootOf(layout, "missing")).toBeUndefined();
48:     for (const id of layout.units) {
49:       const hull = hulls.get(rootOf(layout, id)!)!;
50:       const p = layout.positions.get(id)!;
51:       for (let vertex = 0; vertex < 6; vertex++) {
52:         const angle = vertex * Math.PI / 3;
53:         const x = p[0] + Math.sin(angle) * layout.cell;
54:         const z = p[2] + Math.cos(angle) * layout.cell;
55:         for (let i = 0; i < hull.length; i++) {
56:           const a = hull[i]!;
57:           const b = hull[(i + 1) % hull.length]!;
58:           expect((b[0] - a[0]) * (z - a[1]) - (b[1] - a[1]) * (x - a[0])).toBeGreaterThanOrEqual(-1e-8);
59:         }
60:       }
61:     }
62:   });
63: 
64:   it("aligns target rims with the hex prism corners, with upward winding", () => {
65:     const rim = hexRimGeometry();
66:     const prism = new CylinderGeometry(1, 1, 1, 6);
67:     const points = rim.getAttribute("position");
68:     expectUpward(Array.from(points.array));
69:     const corners = prism.getAttribute("position");
70:     for (let i = 0; i < points.count; i++) {
71:       const x = points.getX(i), z = points.getZ(i);
72:       if (Math.hypot(x, z) < 0.95) continue;
73:       expect(Array.from({ length: corners.count }, (_, j) => Math.hypot(x - corners.getX(j), z - corners.getZ(j))).some((d) => d < 1e-6)).toBe(true);
74:     }
75:     rim.dispose();
76:     prism.dispose();
77:   });
78: });

DIFF
diff --git a/apps/web/src/pages/ObservatoryPage.tsx b/apps/web/src/pages/ObservatoryPage.tsx
index 9016ab3..d230e58 100644
--- a/apps/web/src/pages/ObservatoryPage.tsx
+++ b/apps/web/src/pages/ObservatoryPage.tsx
@@ -415,8 +415,8 @@ export function ObservatoryPage() {
                 </div>
                 <div className="muted" style={{ fontSize: 11, marginTop: 8, maxWidth: 230 }}>
                   {threat
-                    ? `Height = coverage level · glass = gap to full coverage · small dots: no link in your frameworks${fw === "mitre-atlas" ? " · mitigations are listed in each technique's inspector" : ""}`
-                    : "Height = current level · glass = gap to target · small dots: out of scope · ◆ task · ▲ evidence"}
+                    ? `Height = coverage level · outlined glass = full coverage gap · ${view === "constellation" ? "outer arc" : "beacon ring"} = coverage · small dots: no link in your frameworks${fw === "mitre-atlas" ? " · mitigations are listed in each technique's inspector" : ""}`
+                    : `Height = current level · outlined glass = target gap · ${view === "constellation" ? "outer arc" : "beacon ring"} = readiness · small dots: out of scope · ◆ task · ▲ evidence`}
                 </div>
               </>
             )}
diff --git a/apps/web/src/scene/FrameworkScene.tsx b/apps/web/src/scene/FrameworkScene.tsx
index faaebf7..3bae1ca 100644
--- a/apps/web/src/scene/FrameworkScene.tsx
+++ b/apps/web/src/scene/FrameworkScene.tsx
@@ -6,7 +6,7 @@
  */
 import { Line } from "@react-three/drei";
 import { useFrame, type ThreeEvent } from "@react-three/fiber";
-import { memo, useLayoutEffect, useMemo, useRef } from "react";
+import { memo, useEffect, useLayoutEffect, useMemo, useRef } from "react";
 import {
   BufferGeometry,
   Color,
@@ -26,6 +26,8 @@ import type { FrameworkStateBundle } from "../lib/types.ts";
 import { useAgentActivity } from "../state/agentActivity.ts";
 import type { Lens } from "../state/ui.ts";
 import { TOKENS, unitColor } from "./colors.ts";
+import { SpatialGround } from "./SpatialGround.tsx";
+import { hexRimGeometry } from "./spatialGeometry.ts";
 import type { Layout, Vec3 } from "./layout.ts";
 import { ScreenLabels, type ScreenLabel } from "./ScreenLabels.tsx";
 
@@ -44,6 +46,9 @@ export interface SceneProps {
 
 const tmp = new Object3D();
 const tmpColor = new Color();
+const rimGeometry = hexRimGeometry();
+const targetRimGeometry = hexRimGeometry(0.8);
+const beaconGeometry = new CylinderGeometry(1, 1, 1, 32, 1).translate(0, 0.5, 0);
 const hexGeometry = new CylinderGeometry(1, 1, 1, 6, 1);
 hexGeometry.translate(0, 0.5, 0);
 
@@ -56,6 +61,8 @@ export function heightFor(level: number, view: Layout["view"]) {
 function UnitField({ layout, state, lens, onHover, onSelect, reducedMotion }: SceneProps) {
   const mesh = useRef<InstancedMesh>(null);
   const glass = useRef<InstancedMesh>(null);
+  const targets = useRef<InstancedMesh>(null);
+  const crowns = useRef<InstancedMesh>(null);
   const ids = layout.units;
   const count = ids.length;
   const shown = useRef<Float32Array>(new Float32Array(count));
@@ -85,6 +92,9 @@ function UnitField({ layout, state, lens, onHover, onSelect, reducedMotion }: Sc
     animating.current = true;
   }, [ids, state, count, layout.view, reducedMotion]);
 
+  // The layout can change with the same number of units; always rewrite transforms.
+  useLayoutEffect(() => { animating.current = true; }, [layout]);
+
   // Colors per lens.
   useLayoutEffect(() => {
     const m = mesh.current;
@@ -92,8 +102,10 @@ function UnitField({ layout, state, lens, onHover, onSelect, reducedMotion }: Sc
     ids.forEach((id, i) => {
       unitColor(lens, state?.units[id], tmpColor);
       m.setColorAt(i, tmpColor);
+      crowns.current?.setColorAt(i, tmpColor.lerp(TOKENS.onSurface, 0.22));
     });
     if (m.instanceColor) m.instanceColor.needsUpdate = true;
+    if (crowns.current?.instanceColor) crowns.current.instanceColor.needsUpdate = true;
   }, [ids, state, lens]);
 
   useFrame((_, dt) => {
@@ -109,21 +121,32 @@ function UnitField({ layout, state, lens, onHover, onSelect, reducedMotion }: Sc
       if (next !== tgt) moving = true;
       shown.current[i] = next;
       const p = layout.positions.get(ids[i]!)!;
-      const r = layout.cell * (widths.current[i] ?? 1);
+      const r = layout.cell * (layout.view === "terrain" ? 0.9 : 1) * (widths.current[i] ?? 1);
+      tmp.rotation.set(0, 0, 0);
       tmp.position.set(p[0], 0, p[2]);
       tmp.scale.set(r, next, r);
       tmp.updateMatrix();
       m.setMatrixAt(i, tmp.matrix);
       const top = tops.current[i] ?? next;
-      const gapH = Math.max(0.0001, top - next);
+      const gapH = Math.max(0, top - next);
       tmp.position.set(p[0], next, p[2]);
-      tmp.scale.set(r * 0.98, gapH, r * 0.98);
+      tmp.scale.set(gapH > 0.002 ? r * 0.98 : 0, gapH, gapH > 0.002 ? r * 0.98 : 0);
       tmp.updateMatrix();
       gl.setMatrixAt(i, tmp.matrix);
+      tmp.position.set(p[0], top + 0.008, p[2]);
+      tmp.scale.setScalar(top > (goal.current[i] ?? 0) + 0.002 ? r * 0.98 : 0);
+      tmp.updateMatrix();
+      targets.current?.setMatrixAt(i, tmp.matrix);
+      tmp.position.y = next + 0.006;
+      tmp.scale.setScalar(r);
+      tmp.updateMatrix();
+      crowns.current?.setMatrixAt(i, tmp.matrix);
     }
     m.instanceMatrix.needsUpdate = true;
     gl.instanceMatrix.needsUpdate = true;
-    m.computeBoundingSphere();
+    if (targets.current) targets.current.instanceMatrix.needsUpdate = true;
+    if (crowns.current) crowns.current.instanceMatrix.needsUpdate = true;
+    if (!moving) m.computeBoundingSphere();
     animating.current = moving;
   });
 
@@ -145,10 +168,16 @@ function UnitField({ layout, state, lens, onHover, onSelect, reducedMotion }: Sc
   return (
     <group>
       <instancedMesh ref={mesh} args={[hexGeometry, undefined, count]} onPointerMove={handleMove} onPointerOut={handleOut} onClick={handleClick} frustumCulled={false}>
-        <meshStandardMaterial roughness={0.72} metalness={0.04} />
+        <meshStandardMaterial roughness={0.62} metalness={0.08} flatShading />
       </instancedMesh>
-      <instancedMesh ref={glass} args={[hexGeometry, undefined, count]} raycast={() => null} frustumCulled={false}>
-        <meshStandardMaterial color={TOKENS.primary} transparent opacity={0.27} roughness={0.7} metalness={0} depthWrite={false} />
+      <instancedMesh ref={glass} renderOrder={1} args={[hexGeometry, undefined, count]} raycast={() => null} frustumCulled={false}>
+        <meshStandardMaterial color={TOKENS.primary} transparent opacity={0.12} roughness={0.7} metalness={0} depthWrite={false} />
+      </instancedMesh>
+      <instancedMesh ref={targets} renderOrder={2} args={[targetRimGeometry, undefined, count]} raycast={() => null} frustumCulled={false}>
+        <meshBasicMaterial color={TOKENS.primary} transparent opacity={0.55} depthWrite={false} />
+      </instancedMesh>
+      <instancedMesh ref={crowns} args={[rimGeometry, undefined, count]} raycast={() => null} frustumCulled={false}>
+        <meshBasicMaterial />
       </instancedMesh>
     </group>
   );
@@ -166,6 +195,7 @@ function Beacons({ layout, state, onSelect, onHover }: SceneProps) {
       if (!mesh) return;
       list.forEach((id, i) => {
         const p = layout.positions.get(id) ?? [0, 0, 0];
+        tmp.rotation.set(0, 0, 0);
         tmp.position.set(p[0], 0, p[2]);
         tmp.scale.set(radius, height, radius);
         tmp.updateMatrix();
@@ -198,12 +228,12 @@ function Beacons({ layout, state, onSelect, onHover }: SceneProps) {
   return (
     <group>
       {hubs.length > 0 && (
-        <instancedMesh key={`h${hubs.length}`} ref={hubMesh} args={[hexGeometry, undefined, hubs.length]} onClick={click(hubs)} onPointerMove={move(hubs)} onPointerOut={out}>
+        <instancedMesh key={`h${hubs.length}`} ref={hubMesh} args={[beaconGeometry, undefined, hubs.length]} onClick={click(hubs)} onPointerMove={move(hubs)} onPointerOut={out}>
           <meshStandardMaterial roughness={0.68} metalness={0.06} />
         </instancedMesh>
       )}
       {mids.length > 0 && (
-        <instancedMesh key={`m${mids.length}`} ref={midMesh} args={[new CylinderGeometry(1, 1, 1, 24, 1).translate(0, 0.5, 0), undefined, mids.length]} onClick={click(mids)} onPointerMove={move(mids)} onPointerOut={out}>
+        <instancedMesh key={`m${mids.length}`} ref={midMesh} args={[beaconGeometry, undefined, mids.length]} onClick={click(mids)} onPointerMove={move(mids)} onPointerOut={out}>
           <meshStandardMaterial roughness={0.7} metalness={0.05} />
         </instancedMesh>
       )}
@@ -231,6 +261,7 @@ function Links({ layout }: { layout: Layout }) {
     g.setAttribute("position", new Float32BufferAttribute(pts, 3));
     return g;
   }, [layout]);
+  useEffect(() => () => geometry.dispose(), [geometry]);
   if (layout.view === "terrain") return null;
   return (
     <lineSegments geometry={geometry} raycast={() => null}>
@@ -262,53 +293,20 @@ function Rings({ layout }: { layout: Layout }) {
   );
 }
 
-/**
- * A billboard that hides itself when the camera comes closer than `near`, so
- * large sector titles never fill the foreground after a fly-in.
- */
-function Sectors({ layout, state, selectedId }: SceneProps) {
-  // Stable per layout: drei's Line disposes its material whenever its points change, and three.js
-  // then deletes the shared shader program, re-linked (blocking) on the next frame.
-  const arcs = useMemo(
-    () =>
-      layout.sectors.map((s) => {
-        const points: Vec3[] = [];
-        const steps = 48;
-        for (let i = 0; i <= steps; i++) {
-          const a = s.start + ((s.end - s.start) * i) / steps;
-          points.push([Math.cos(a) * s.radius, 0.02, Math.sin(a) * s.radius]);
-        }
-        return points;
-      }),
-    [layout],
-  );
-  if (layout.view !== "constellation") return null;
-  return (
-    <group>
-      {layout.sectors.map((s, i) => {
-        const g = state?.groups[s.id];
-        const color = g ? TOKENS.status[g.status] : TOKENS.outlineStrong;
-        const active = selectedId === s.id;
-        return <Line key={s.id} points={arcs[i]!} color={active ? TOKENS.primary : color} lineWidth={active ? 3 : 1.5} transparent opacity={active ? 1 : 0.72} />;
-      })}
-    </group>
-  );
-}
-
 // ---------------------------------------------------------------------------
 
 function Core({ active }: { active: boolean }) {
   const ref = useRef<Mesh>(null);
-  const geometry = useMemo(() => new IcosahedronGeometry(1.4, 1), []);
-  useFrame(({ clock }) => {
+  const geometry = useMemo(() => new IcosahedronGeometry(1.4, 0), []);
+  useFrame(({ clock }, dt) => {
     if (!ref.current) return;
-    ref.current.rotation.y += active ? 0.01 : 0;
+    ref.current.rotation.y += active ? Math.min(dt, 0.1) * 0.6 : 0;
     const mat = ref.current.material as unknown as { emissiveIntensity: number };
     mat.emissiveIntensity = active ? 0.18 + Math.sin(clock.elapsedTime * 3) * 0.06 : 0.04;
   });
   return (
     <mesh ref={ref} geometry={geometry} position={[0, 1.6, 0]} raycast={() => null}>
-      <meshStandardMaterial color={TOKENS.primary} emissive={TOKENS.primary} emissiveIntensity={0.04} roughness={0.6} metalness={0.06} flatShading />
+      <meshStandardMaterial color={TOKENS.primary} emissive={TOKENS.primary} emissiveIntensity={0.04} roughness={0.58} metalness={0.12} flatShading />
     </mesh>
   );
 }
@@ -349,8 +347,8 @@ function Selection({ layout, selectedId, state }: SceneProps) {
   );
 }
 
-/** Tasks as satellites orbiting their requirement (up to three per unit). */
-function Satellites({ layout, state, reducedMotion }: SceneProps) {
+/** Open tasks occupy fixed satellite slots; only active agent work moves. */
+function Satellites({ layout, state }: SceneProps) {
   const ref = useRef<InstancedMesh>(null);
   const slots = useMemo(() => {
     const out: { p: Vec3; k: number; n: number; h: number }[] = [];
@@ -364,12 +362,11 @@ function Satellites({ layout, state, reducedMotion }: SceneProps) {
     return out;
   }, [layout, state]);
   const geometry = useMemo(() => new OctahedronGeometry(0.13, 0), []);
-  useFrame(({ clock }) => {
+  useLayoutEffect(() => {
     const m = ref.current;
     if (!m) return;
-    const t = reducedMotion ? 0 : clock.elapsedTime * 0.8;
     slots.forEach((s, i) => {
-      const a = t + (s.k / s.n) * Math.PI * 2;
+      const a = (s.k / s.n) * Math.PI * 2;
       const rr = layout.cell * 1.55;
       tmp.position.set(s.p[0] + Math.cos(a) * rr, s.h + 0.25, s.p[2] + Math.sin(a) * rr);
       tmp.rotation.set(0, a, 0);
@@ -378,7 +375,7 @@ function Satellites({ layout, state, reducedMotion }: SceneProps) {
       m.setMatrixAt(i, tmp.matrix);
     });
     m.instanceMatrix.needsUpdate = true;
-  });
+  }, [slots, layout]);
   if (!slots.length) return null;
   return (
     <instancedMesh key={slots.length} ref={ref} args={[geometry, undefined, slots.length]} raycast={() => null} frustumCulled={false}>
@@ -412,7 +409,7 @@ function Crystals({ layout, state }: SceneProps) {
   if (!items.length) return null;
   return (
     <instancedMesh key={items.length} ref={ref} args={[geometry, undefined, items.length]} raycast={() => null} frustumCulled={false}>
-      <meshStandardMaterial roughness={0.45} metalness={0.04} />
+      <meshStandardMaterial roughness={0.6} metalness={0.04} />
     </instancedMesh>
   );
 }
@@ -568,12 +565,12 @@ const ShaderWarmup = memo(function ShaderWarmup({ layout }: { layout: Layout })
 export function FrameworkScene(props: SceneProps & { agentActive: boolean }) {
   return (
     <group>
+      <SpatialGround {...props} />
       <Rings layout={props.layout} />
       <Links layout={props.layout} />
-      <Core active={props.agentActive} />
+      <Core active={props.agentActive && !props.reducedMotion} />
       <Beacons {...props} />
       <UnitField {...props} />
-      <Sectors {...props} />
       <Satellites {...props} />
       <Crystals {...props} />
       <Selection {...props} />
diff --git a/apps/web/src/scene/Observatory.tsx b/apps/web/src/scene/Observatory.tsx
index 9f14a80..1b09091 100644
--- a/apps/web/src/scene/Observatory.tsx
+++ b/apps/web/src/scene/Observatory.tsx
@@ -135,9 +135,9 @@ export function Observatory(props: ObservatoryProps) {
     >
       <color attach="background" args={[TOKENS.neutral]} />
       <fogExp2 attach="fog" args={[TOKENS.neutral, fogDensity]} />
-      <hemisphereLight args={[TOKENS.surface, TOKENS.primaryContainer, 1.15]} />
-      <ambientLight intensity={0.45} />
-      <directionalLight position={[30, 60, 20]} intensity={1.65} />
+      <hemisphereLight args={[TOKENS.surface, TOKENS.primaryContainer, 0.85]} />
+      <ambientLight intensity={0.25} />
+      <directionalLight position={[30, 60, 20]} intensity={2.1} />
       <directionalLight position={[-40, 20, -30]} intensity={0.45} color={TOKENS.neutral} />
       <FrameworkScene {...props} reducedMotion={reducedMotion} />
       <CameraRig layout={props.layout} selectedId={props.selectedId} focusIds={props.focusIds} focusSeq={props.focusSeq} reducedMotion={reducedMotion} />
diff --git a/apps/web/src/scene/colors.ts b/apps/web/src/scene/colors.ts
index 8e9f051..b12a6c4 100644
--- a/apps/web/src/scene/colors.ts
+++ b/apps/web/src/scene/colors.ts
@@ -11,6 +11,7 @@ const hex = (v: string) => new Color(v.slice(0, 7));
 export const TOKENS = {
   neutral: hex(c.neutral),
   surface: hex(c.surface),
+  surfaceBright: hex(c["surface-bright"]),
   primary: hex(c.primary),
   tertiary: hex(c.tertiary),
   outline: hex(c.outline),
diff --git a/apps/web/src/styles/global.css b/apps/web/src/styles/global.css
index c6cef09..29e1931 100644
--- a/apps/web/src/styles/global.css
+++ b/apps/web/src/styles/global.css
@@ -1749,8 +1749,13 @@ p {
   text-transform: uppercase;
 }
 .scene-label--selected {
-  color: var(--color-on-surface);
+  color: var(--color-on-primary-container);
   font-size: 13px;
+  padding: 4px 8px;
+  border: 1px solid var(--color-primary);
+  border-radius: var(--radius-xs);
+  background: var(--color-primary-container);
+  text-shadow: none;
 }
 .scene-label.is-active .scene-label__title {
   color: var(--color-primary);
diff --git a/scripts/screens.ts b/scripts/screens.ts
index 779abb4..729fb79 100644
--- a/scripts/screens.ts
+++ b/scripts/screens.ts
@@ -144,6 +144,21 @@ function shots(meta: Meta, runId: string | undefined): Shot[] {
       }
     },
   });
+  // Both layouts need visual coverage, including the dense control catalog.
+  for (const fw of ["nist-csf-2.0", "nist-sp-800-53-r5"]) {
+    if (!has(fw)) continue;
+    list.push({
+      name: `terrain-${fw}`,
+      path: `${WS}/observatory/${fw}`,
+      kind: "scene",
+      act: async (page) => {
+        const enter = page.getByRole("button", { name: "3D", exact: true });
+        if (await enter.count()) await enter.click();
+        await page.getByRole("button", { name: "Terrain", exact: true }).click();
+        await page.waitForTimeout(2500);
+      },
+    });
+  }
   list.push(
     { name: "nexus-threat-ring", path: `${WS}/crosswalk`, kind: "scene" },
     {
