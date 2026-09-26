# NIST AI RMF corpus: structure reference

This file describes the NIST AI Risk Management Framework (AI RMF) corpus and the three structured extractions built from it. It was written for the ingestion pipeline. Everything was retrieved on 2026-09-26, and every count below was computed from the downloaded bytes. Paths are relative to `corpus/nist-ai-rmf/`. `manifest.json` lists all 45 documents with URL, landing page, SHA-256, size and licence.

## 1. Currency on 2026-09-26

**Verdict: AI RMF 1.0 (NIST AI 100-1, 26 January 2023) is still the current and only final version.** NIST says it is being revised under America's AI Action Plan, but no revised text, draft, concept paper or request for information for that revision has been published.

| Publication | Status on 2026-09-26 | Evidence |
|---|---|---|
| **NIST AI 100-1**, AI RMF 1.0 | **Current final** (2023-01-26). Revision announced, nothing published | The [AI RMF page](https://www.nist.gov/itl/ai-risk-management-framework) and the [Engage page](https://www.nist.gov/itl/ai-risk-management-framework/ai-risk-management-framework-engage) (updated 2026-08-13) say: "The AI RMF 1.0 is being revised as part of the White House AI Action Plan." The [FAQ](https://www.nist.gov/itl/ai-risk-management-framework/ai-risk-management-framework-faqs) (updated 2026-08-13) says: "The White House AI Action Plan (July 23, 2025) tasked NIST with several actions. Among the actions include revising the NIST AI RMF (1.0)." The [AIRC](https://airc.nist.gov/airmf-resources/airmf/) says: "The AI RMF 1.0 is being updated. A revised version is in progress." The mandate is in [America's AI Action Plan](https://www.whitehouse.gov/wp-content/uploads/2025/07/Americas-AI-Action-Plan.pdf) (2025-07-23, printed p. 4): "revise the NIST AI Risk Management Framework to eliminate references to misinformation, Diversity, Equity, and Inclusion, and climate change." Checks that found nothing: the nvlpubs URLs `NIST.AI.100-1r1.pdf`, `NIST.AI.100-1r1.ipd.pdf`, `NIST.AI.100-1r1.iprd.pdf`, `NIST.AI.100-1r1.2pd.pdf`, `NIST.AI.100-1.upd1.pdf`, `NIST.AI.100-1.1.pdf` and `NIST.AI.100-1v1.1.pdf` all return 404; a Federal Register full-text search since 2025-01-01 for NIST notices matching "risk management framework" and artificial intelligence returns only CAISI's AI-agent-security RFI of 2026-01-08; the AI RMF page, the AIRC and the CSRC drafts list show no draft. The nvlpubs PDF was re-saved on 2025-06-04, but its content is unchanged and still dated January 2023 |
| AI RMF Playbook | Content last revised **March 2023**. The data files were regenerated on **2026-06-11** | The [AIRC audit log](https://airc.nist.gov/airmf-resources/playbook/audit-log/) records content changes up to March 2023; August 2023 added tagging, formatting and a PDF. `playbook.json`, `.csv` and `.xlsx` have Last-Modified 2026-06-11 (see §6.1 for what changed). The PDF is dated 2024-08-02. The AIRC and the [nist.gov Playbook page](https://www.nist.gov/itl/ai-risk-management-framework/nist-ai-rmf-playbook) (updated 2026-06-10) say: "The Playbook will be updated after the AI RMF 1.0 is revised." |
| **NIST AI 600-1**, Generative AI Profile | **Current final** (2024-07-26). No update | Listed as current on the AI RMF and AIRC pages. Probes for a revision (`NIST.AI.600-1r1.ipd.pdf`, `NIST.AI.600-1.upd1.pdf`) return 404. The PDF was re-saved on 2025-03-24 |
| AI RMF Trustworthy AI in Critical Infrastructure Profile | **Concept note only** (2026-04-07). No draft | The [project page](https://www.nist.gov/programs-projects/concept-note-ai-rmf-profile-trustworthy-ai-critical-infrastructure) was updated 2026-07-17 and shows status "Ongoing" |
| **NIST IR 8596**, Cyber AI Profile (a CSF 2.0 Community Profile) | **Initial preliminary draft** (2025-12-16). The comment period closed 2026-01-30. No initial public draft yet | The [CSRC page](https://csrc.nist.gov/pubs/ir/8596/iprd) document history lists only the 12/16/25 draft. The CSRC drafts list has no later version. A planning note of 2026-04-21 announced spring 2026 working sessions |
| COSAiS, the SP 800-53 Control Overlays for Securing AI Systems | **Concept paper** (2025-08-14) and **annotated outline / discussion draft** (2026-01-08). No public draft | The [project page](https://csrc.nist.gov/projects/cosais) was last updated 2026-01-08. The outline says NIST intended to issue NISTIR 8605 and 8605A drafts "by Q3 FY2026". Neither exists: CSRC `pubs/ir/8605/{ipd,iprd,final}` return 404 and nvlpubs `NIST.IR.8605.ipd.pdf` returns 404 |
| NIST AI 100-2, Adversarial ML taxonomy | **E2025 is current** (final, 2025-03-24; corrected PDF 2025-04-01; errata 2025-06-03) | [CSRC](https://csrc.nist.gov/pubs/ai/100/2/e2025/final). The CSRC AI series lists only E2023 and E2025. `NIST.AI.100-2e2026.pdf` and `NIST.AI.100-2e2026.ipd.pdf` return 404 |
| NIST AI 100-4, synthetic content | **Final** (2024-11-20) | [nist.gov publication page](https://www.nist.gov/publications/reducing-risks-posed-synthetic-content-overview-technical-approaches-digital-content). The AIRC Technical Reports page still links the April 2024 draft |
| NIST AI 800-1, misuse risk of dual-use foundation models | **Second public draft** (2025-01-15, from the U.S. AI Safety Institute, now CAISI). The comment period closed 2025-03-15. **No final** | Federal Register 2025-00698. `NIST.AI.800-1.pdf` returns 404. DOI `10.6028/NIST.AI.800-1.2pd` resolves to `NIST.AI.800-1.ipd2.pdf` |
| NIST SP 1270, bias | Final (2022-03-15), current | nist.gov publication page |
| NISTIR 8312, explainability principles | Final (2021-09-29), current | nist.gov publication page |
| AI RMF Roadmap | Web page only (2023-01-26, updated 2023-03-14) | [Roadmap page](https://www.nist.gov/itl/ai-risk-management-framework/roadmap-nist-artificial-intelligence-risk-management-framework-ai) and [AIRC](https://airc.nist.gov/airmf-resources/roadmap/) |
| AI RMF crosswalks | 12 crosswalks on the [AIRC list](https://airc.nist.gov/airmf-resources/crosswalks/). The newest are dated 2025-08-14. The nist.gov crosswalk page was updated 2024-12-17 | See §7 |
| CPRT / OLIR | CPRT `AI_100_1_0_0` v1.1.0 (release 2024-07-26) and `AI_TAXONOMY_1_0_0` (2025-03-20). The AI RMF is an OLIR focal document with 7 non-NIST mappings. **NIST has published no mapping of the AI RMF to CSF 2.0 or SP 800-53** | See §6.2–6.4 |
| Glossary | "Beta" Google Sheet. [NIST AI 100-3](https://doi.org/10.6028/NIST.AI.100-3) (2023-03-29) describes it. The AIRC says: "A final glossary release will be published at a later date" | [AIRC glossary](https://airc.nist.gov/glossary/) |

## 2. Layout and what to ingest

```
nist-ai-rmf/
├── manifest.json                  45 documents (sha256, bytes, url, licence)
├── STRUCTURE.md                   this file
├── ai-rmf-core.json               ← INGEST: 4 functions / 19 categories / 72 subcategories, verbatim from AI 100-1, page-cited
├── ai-rmf-playbook.json           ← INGEST: 72 Playbook entries (about, suggested actions, documentation, references)
├── genai-profile.json             ← INGEST: AI 600-1: 12 risks, 212 actions, 49 subcategory headers
├── core/NIST.AI.100-1.pdf         AI RMF 1.0 (citation target of ai-rmf-core.json)
├── machine-readable/              CPRT exports (AI RMF + Playbook; AI 100-2 E2025 taxonomy), OLIR catalog snapshot
├── playbook/                      AIRC Playbook: PDF (citation target) + JSON (source) + CSV + XLSX
├── profiles/NIST.AI.600-1.pdf     GenAI Profile (citation target of genai-profile.json)
├── drafts/                        IR 8596 iprd, CI-profile concept note, AI 800-1 2pd, COSAiS concept paper + outline
├── crosswalks/                    NIST-authored crosswalks (2); crosswalks/.local/ = 10 non-NIST or joint crosswalks (git-ignored)
├── guides/                        AI 100-2 E2025 (+ errata), AI 100-4, SP 1270, NISTIR 8312, SP 800-218A
├── supplementary/                 fact sheet, Roadmap (HTML + PNG), AI 100-3, AI 100-5e2025, America's AI Action Plan
│   └── .local/                    glossary exports (verbatim ISO/IEEE text), Japanese + Arabic translations (git-ignored)
└── tools/                         extraction, manifest and verification scripts + tools/reports/*.json
```

| Priority | File | Use it for |
|---|---|---|
| **Primary** | `ai-rmf-core.json` | AI RMF Core outcome text, exactly as printed in AI 100-1, with physical and printed page numbers |
| **Primary** | `ai-rmf-playbook.json` | Playbook guidance per subcategory. Cite `playbook/AI_RMF_Playbook.pdf` with the `page` field |
| **Primary** | `genai-profile.json` | GenAI risks and suggested actions (IDs such as `GV-1.1-001`), with page numbers |
| Full text for search | the PDFs in `core/`, `profiles/`, `guides/`, `drafts/` and `supplementary/` | Passage retrieval. Mark everything in `drafts/` as **draft** |
| Cross-check only | `machine-readable/cprt-AI_100_1_0_0-export.json` | Official NIST structured copy of the Core and Playbook. **Do not use its Core wording**: 36 of the 91 category and subcategory statements are worded or punctuated differently from the final PDF (§3.4) |
| Optional | `machine-readable/cprt-AI_TAXONOMY_1_0_0-export.json` | AI 100-2 E2025 attack taxonomy (`NISTAML.*` IDs, which COSAiS cites), glossary and references |

Roles in `manifest.json`: `core` (1), `machine-readable` (4), `playbook` (4), `profile` (3: AI 600-1, IR 8596 iprd, CI concept note), `mapping` (13: 12 crosswalk PDFs and the OLIR catalog), `guide` (9) and `supplementary` (11). Drafts carry "DRAFT", "concept" or "discussion draft" in `version` and sit in `drafts/`.

## 3. `ai-rmf-core.json`

### 3.1 Schema

```jsonc
{
  "source": {"documentId": "nist-ai-100-1", "title": "...", "identifier": "NIST AI 100-1", "version": "AI RMF 1.0 (January 2023)",
             "path": "nist-ai-rmf/core/NIST.AI.100-1.pdf", "sha256": "7576edb5…", "url": "...", "doi": "...",
             "pageNumbering": "...", "extraction": "...", "crossCheck": {"cprtDataset": "AI_100_1_0_0", "cprtSha256": "...", "playbookJsonSha256": "..."}},
  "functions":     [{"id", "code", "title", "text", "page", "printedPage", "textSource", "section", "sectionPage", "codeSource"}],
  "categories":    [{"id", "function", "text", "page", "pageEnd"?, "printedPage"}],
  "subcategories": [{"id", "category", "function", "text", "page", "pageEnd"?, "printedPage"}]
}
```

- `page` is the 1-based **physical** page of the PDF. `printedPage` is the footer label. In the body, printed = physical − 5.
- `pageEnd` appears only when the text continues onto the next page. This happens once: `GOVERN 4`, pages 28–29.
- `functions[].text` is the one-line description from **Figure 5** (physical page 25). The figure is a raster image, so the text was read from the image. It is identical to the CPRT function text, which adds a final period.
- Each function also carries `section` (5.1–5.4) and `sectionPage`, the page where the section heading is printed.
- `code` (GV/MP/MS/MG) comes from AI 600-1 (physical page 17): "GV = Govern; MP = Map; MS = Measure; MG = Manage". AI 100-1 itself defines no two-letter codes.

Real records:

```json
{"id": "MAP", "code": "MP", "title": "Map", "text": "Context is recognized and risks related to context are identified", "page": 25, "printedPage": "20", "section": "5.2", "sectionPage": 29}
{"id": "GOVERN 4", "function": "GOVERN", "text": "Organizational teams are committed to a culture that considers and communicates AI risk.", "page": 28, "pageEnd": 29, "printedPage": "23"}
{"id": "MAP 1.4", "category": "MAP 1", "function": "MAP", "text": "The business value or context of business use has been clearly defined or – in the case of assessing existing AI systems – re-evaluated.", "page": 31, "printedPage": "26"}
```

### 3.2 Verified counts

The counts match the expected official numbers exactly.

| Function | Categories | Subcategories | Table (physical pages) |
|---|---|---|---|
| GOVERN | 6 | 19 | Table 1 (27–29) |
| MAP | 5 | 18 | Table 2 (31–33) |
| MEASURE | 4 | 22 | Table 3 (34–36) |
| MANAGE | 4 | 13 | Table 4 (37–38) |
| **Total** | **19** | **72** | |

The ID set is identical to the CPRT dataset `AI_100_1_0_0`.

### 3.3 Method and verification

Tool: `tools/extract_core.py`.

**Extraction.**
1. The PyMuPDF text layer of Tables 1–4 is split into the Categories column (x < 201 pt) and the Subcategories column, and lines are ordered by baseline.
2. A table ends at its "Continued on next page" line or at the first body-text line (x < 94 pt).
3. Ligature code points (U+FB00–FB06) become plain letters. Nothing else is normalised: en dashes, curly quotes and apostrophes are kept as printed.

**Hyphenation.** The PDF is LaTeX-typeset, so there are 53 end-of-line hyphens. Each was resolved against the element's CPRT wording and against the words of the whole document.
- 51 were joined, for example "decom-missioning" → "decommissioning".
- 2 were kept as real hyphens: "context-specific" in MAP 1.1 and "context-relevant" in MEASURE 4.3.
- None was left unresolved.

**Verification.**
- Independent containment check: all 91 category and subcategory texts occur, ignoring whitespace and hyphens, in the clipped text of their own column and page(s).
- Every text was compared with CPRT and with the Playbook `description`. The reports are in `tools/reports/core-verification.json`.

### 3.4 The NIST machine-readable copies do not match the final text

The wording of CPRT `AI_100_1_0_0` and of the AIRC Playbook `description` field predates the final AI 100-1. Both sources share the same pre-final wording.

- **CPRT differs from the PDF in 36 of the 91 statements**:
  - Categories: GOVERN 1, MANAGE 2, MANAGE 4.
  - Subcategories: GOVERN 1.2, 1.3, 1.5, 1.7, 3.1, 4.1, 4.2, 5.2, 6.1; MAP 1.1, 1.2, 1.3, 2.1, 2.2, 2.3, 3.4, 3.5, 4.1, 4.2; MEASURE 1.2, 2.1, 2.2, 2.6, 2.9, 2.11, 4.2, 4.3; MANAGE 1.1, 1.2, 1.3, 2.1, 2.4, 4.3.
- **The Playbook differs from the PDF in 30 subcategories**: the same list minus MAP 2.3, MEASURE 2.2 and MEASURE 2.11, which differ in CPRT only.
- Some differences are substantive:
  - GOVERN 5.2: CPRT and the Playbook say "enable AI actors to regularly incorporate …"; the PDF says "enable the team that developed or deployed AI systems to regularly incorporate …".
  - MEASURE 2.6: they say "Safety metrics implicate system reliability"; the PDF says "Safety metrics reflect system reliability".
  - MEASURE 2.1: they spell out "test, evaluation, validation, and verification (TEVV)"; the PDF says "TEVV".
- Others are punctuation only, for example the serial comma in GOVERN 1.
- **Use `ai-rmf-core.json` for AI 100-1 text.**

## 4. `ai-rmf-playbook.json`

### 4.1 Schema

```jsonc
{
  "source": {"documentId": "ai-rmf-playbook-json", "title", "publisher", "version", "path": "nist-ai-rmf/playbook/playbook.json",
             "sha256", "url": "https://airc.nist.gov/docs/playbook.json", "landingPage",
             "pdf": {"documentId": "ai-rmf-playbook-pdf", "path", "sha256", "url", "pageNumbering"}, "extraction"},
  "counts": {...},
  "entries": [{
    "id": "GOVERN 1.1", "function": "GOVERN", "category": "GOVERN 1",
    "playbookStatement": "...",            // subcategory text as worded in the Playbook
    "statementMatchesAi100_1": true,       // false for the 30 subcategories listed in 3.4
    "about": "...",                        // paragraphs separated by \n\n; bullet lines as "- ..."
    "suggestedActionsIntro": "...",        // only GOVERN 1.2 and GOVERN 3.1 (lead-in sentence before the bullets)
    "suggestedActions": ["...", ...],      // top-level bullets; nested bullets kept inside the parent as "\n- child" ("\n  - grandchild")
    "transparencyDocumentation": ["..."],  // "Transparency & Documentation — Organizations can document the following" items
    "transparencyResources": [{"text", "urls": [...]}],   // "AI Transparency Resources" items
    "references": ["..."],                 // citation text as printed (link words "URL"/"LINK"/"PDF" removed)
    "referenceDetails": [{"text", "urls": [...], "group"}],  // same order; group = reference sub-heading, e.g. "Software Resources"
    "aiActors": ["Governance and Oversight"], "topics": ["Legal and Regulatory", ...],
    "page": 6, "pageEnd": 7                // physical pages of AI_RMF_Playbook.pdf spanned by the entry
  }]
}
```

### 4.2 Counts

All 72 subcategories have a Playbook entry.

| Function | Entries | Suggested actions (top-level) | Documentation items | Transparency resources | References |
|---|---|---|---|---|---|
| GOVERN | 19 | 100 | 78 | 50 | 106 |
| MAP | 18 | 105 | 70 | 62 | 146 |
| MEASURE | 22 | 179 | 103 | 54 | 260 |
| MANAGE | 13 | 76 | 43 | 30 | 118 |
| **Total** | **72** | **460** (607 counting nested items) | **294** | **196** | **630** |

Every entry has at least one suggested action, one documentation item and one reference. The CPRT itemisation has 575 suggested actions, 292 documentation items, 195 resources and 631 references. The gaps come from different splitting: CPRT flattens some nested lists into their parent and drops lead-in sentences. Of the 575 CPRT suggested actions, 97 do not match an item here verbatim:
- 92 differ only in typos or punctuation (similarity > 0.9), for example "AI actors contact informations" (Playbook) versus "contact information" (CPRT).
- 5 are itemised differently (GOVERN 2.1, 2.2, 6.1; MAP 3.3; MANAGE 2.2).

### 4.3 Method and verification

Tool: `tools/extract_playbook.py`.

- **Source.** The source is `playbook/playbook.json`. The CSV and XLSX were checked cell by cell and carry identical text for the four sections.
- **Markdown.** The fields are parsed as follows:
  - Bullets `-`, `*` and `-Establish…` (no space) are recognised.
  - Nesting follows indentation: tab = 4 spaces, with levels 0, 4 and 8 in use.
  - A link `[label](url)` becomes its label. The bare link words URL, LINK and PDF are dropped, and every target goes to `urls`.
  - Malformed links are tolerated: `[URL] (https…)`, `[URL]( http…)`, a missing closing parenthesis, `https://a or http://b` as one target, and a URL containing `(1)`.
  - Brackets without a target, such as `[cs]` or `[Technical Report]`, are kept as printed.
- **Pages.** `page` and `pageEnd` come from the subcategory headings (Calibri-Bold 13 pt) in the Playbook PDF.
- **Verification.** Every about paragraph and every action, documentation item, resource and reference was searched for in the PDF pages of its entry, ignoring whitespace, hyphens and the "N of 142" footer.
  - 1,911 of 1,916 text pieces were found. The pieces are about lines, action items including nested ones, documentation items, resources and references.
  - The 5 misses are defects in how the PDF renders the text; the content is the same:
    - MANAGE 2.2 prints "stablish" for "Establish".
    - The PDF drops text that follows an inline link: MAP 1.5 "See Table 3." and MEASURE 2.2 "Note: Federal Policy for Protection of Human Subjects (Common Rule)…".
    - MAP 1.3 shows raw `[LINK](…)` markdown and loses the second link.
  - Details are in `tools/reports/playbook-verification.json`.

## 5. `genai-profile.json` (NIST AI 600-1)

### 5.1 Schema

```jsonc
{
  "source": {"documentId": "nist-ai-600-1", "identifier": "NIST AI 600-1", "version": "July 2024 (final)", "path", "sha256", "url", "doi",
             "pageNumbering": "physical pages; printed = physical − 4 in the body", "extraction", "machineReadableSource"},
  "counts": {"risks": 12, "actions": 212, "actionsPerFunction": {...}, "subcategoriesWithActions": 49},
  "risks": [{"id", "number", "title", "description", "page", "section", "sectionTitle", "sectionPage", "trustworthyCharacteristics": [...]}],
  "subcategories": [{"id": "GOVERN 1.1", "function", "text", "page", "aiActorTasks": [...], "aiActorTasksLabel"?}],
  "actions": [{"id": "GV-1.1-001", "subcategory": "GOVERN 1.1", "text", "risks": [risk ids], "riskLabels": [labels as printed],
               "page", "pageEnd"?, "idAsPrinted"?}]
}
```

- `risks[].title` and `description` are the numbered definitions in Section 2 (physical pages 8–9).
- `sectionTitle`, `sectionPage` and `trustworthyCharacteristics` come from the Section 2.x heading and its "Trustworthy AI Characteristic(s):" line.
- `subcategories` holds the subcategory statements **as printed in AI 600-1** and their "AI Actor Tasks". This is an extra key beyond the requested schema.

### 5.2 Risks

All 12 are verified; the list is numbered 1–12. `actions` is the number of actions tagged with the risk.

The [AIRC Technical Reports page](https://airc.nist.gov/technical-reports/) describes AI 600-1 as centring on "13 risks and more than 400 actions". The final PDF has 12 risks and 212 actions; the figures in this file follow the PDF.

| # | id | Title (Section 2 list) | Section 2.x title | Actions |
|---|---|---|---|---|
| 1 | `cbrn` | CBRN Information or Capabilities | same | 31 |
| 2 | `confabulation` | Confabulation | same | 18 |
| 3 | `dangerous-violent-hateful-content` | Dangerous, Violent, or Hateful Content | same | 31 |
| 4 | `data-privacy` | Data Privacy | same | 29 |
| 5 | `environmental-impacts` | Environmental Impacts | same | 4 |
| 6 | `harmful-bias-homogenization` | Harmful Bias **or** Homogenization | Harmful Bias **and** Homogenization | 57 |
| 7 | `human-ai-configuration` | Human-AI Configuration | same | 58 |
| 8 | `information-integrity` | Information Integrity | same | 73 |
| 9 | `information-security` | Information Security | same | 51 |
| 10 | `intellectual-property` | Intellectual Property | same | 28 |
| 11 | `obscene-degrading-abusive-content` | Obscene, Degrading, and/or Abusive Content | same | 14 |
| 12 | `value-chain-component-integration` | Value Chain and Component Integration | same | 36 |

### 5.3 Actions

There are **212 suggested actions**:

| Function | Actions | Subcategories with actions |
|---|---|---|
| GOVERN (GV) | 58 | 15 |
| MAP (MP) | 39 | 9 |
| MEASURE (MS) | 72 | 16 |
| MANAGE (MG) | 43 | 9 |

- AI 600-1 covers **49 of the 72 subcategories**. It has no actions for: GOVERN 2.2, 2.3, 3.1, 5.2; MAP 1.3, 1.4, 1.5, 1.6, 3.1, 3.2, 3.3, 3.5, 4.2; MEASURE 1.2, 2.1, 2.4, 3.1, 4.1, 4.3; MANAGE 1.1, 1.2, 1.4, 2.1.
- The most actions per subcategory are 10, in GOVERN 6.1 and MAP 4.1.
- Action IDs are unique and numbered 001…n without gaps within each subcategory.
- A 213th ID string, `GV-1.1-002`, appears only in the explanatory text on page 17 and is not an action.

### 5.4 Anomalies in the source

These are kept as printed and flagged:

- **Printed action ID.** `GV-4.3-001` is printed as `GV4.3--001`. The record uses the canonical ID and adds `"idAsPrinted": "GV4.3--001"`.
- **Risk labels.** The GAI Risks column spells some risks differently from the Section 2 list. `riskLabels` keeps the printed text; `risks` holds the mapped IDs:
  - "Harmful Bias and Homogenization" (57 times).
  - "CBRN Information and Capability" (GV-1.3-007, GV-4.1-002).
  - "Environmental" (MS-2.11-003, MS-2.12-002, MS-2.12-003, MS-2.12-004).
  - "Human AI Configuration" (MS-2.2-002).
- **Comma instead of semicolon.** MG-3.2-004 has the single label "Human-AI Configuration, Dangerous, Violent, or Hateful Content". It maps to two risk IDs.
- **Label outside the 12 risks.** GV-1.4-002 carries "Civil Rights violations". It stays in `riskLabels` with no risk ID.
- **Actor label.** GOVERN 3.2 labels its actor line "AI Actors:" instead of "AI Actor Tasks:", recorded as `aiActorTasksLabel`.
- **Subcategory wording.** AI 600-1 prints four subcategory statements differently from AI 100-1:
  - GOVERN 1.5: "planned, and … are clearly defined".
  - MAP 1.1: "context specific".
  - MAP 2.3: no final period.
  - MAP 4.1: "third-party's".

### 5.5 Method and verification

Tool: `tools/extract_genai.py`.

- **Parsing.** The Section 3 tables are cut into rows at the table's own horizontal rules. Only rules that start at a column boundary count, so hyperlink underlines are ignored. Rows are split into columns by x-position:
  - Action ID: x < 70 pt.
  - GAI Risks: x ≥ 420 pt.
- **Cleanup.**
  - Superscript footnote markers are dropped: 7 pt spans flagged superscript. PyMuPDF's flag alone is unreliable here.
  - Ligatures become plain letters.
  - A wrapped line ending in "-" or "/" is joined without a space. All 13 such breaks inside action text are real compounds, for example "red-teaming" and "AI-generated".
- **Checks.**
  - All 212 action texts occur in the PDF text layer.
  - The ID count equals an independent regex count over the same pages, less the example `GV-1.1-002`.
  - Rows were compared visually against a page render.
  - The report is in `tools/reports/genai-verification.json`.
- **No machine-readable source.** NIST publishes no machine-readable version of AI 600-1: there is no CPRT dataset and no AIRC download.

## 6. Machine-readable sources

### 6.1 AIRC Playbook files (`playbook/`)

**`playbook.json`** is an array of 72 objects with these keys:

| Key | Content |
|---|---|
| `type` | `"Govern"` |
| `title` | `"GOVERN 1.1"` |
| `category` | `"GOVERN-1"` |
| `description` | Playbook wording of the statement |
| `section_about` | Markdown |
| `section_actions` | Markdown |
| `section_doc` | Markdown with two `###` headings: "Organizations can document the following" and "AI Transparency Resources" |
| `section_ref` | Markdown, with optional `###` topic headings such as "Software Resources" |
| `AI Actors` | List of strings |
| `Topic` | List of strings |

The file is byte-identical on repeated download.

**`playbook.csv` and `playbook.xlsx`** are transposed tables of 5 rows × 73 columns:
- Rows: header, section_about, section_actions, section_doc, section_ref.
- Columns: a label column plus the 72 subcategories.
- They have no description, actor or topic fields.

**How the copies relate.** The JSON text matches the AIRC Playbook PDF (§4.3), so the June 2026 files carry the same content as the August 2024 PDF. No earlier copy of `playbook.json` was available to diff, because web.archive.org is unreachable from this session (§9).

The CPRT copy (release 2024-07-26) is a separately edited version:

| Section | Compared with the AIRC JSON |
|---|---|
| About texts | Differ in 36 entries, all at similarity ≥ 0.98: typos and punctuation in both directions (CPRT "Polices" versus JSON "Policies"; JSON "e.g," versus CPRT "e.g.,") |
| Suggested actions | See §4.2 |
| Documentation items | 254 exact, 33 close (> 0.9), 5 other |
| References | 333 exact, 218 close, 80 other. CPRT citations add or drop details such as "Retrieved on …" or page hints |
| Resources | 146 exact, 3 close, 46 other |

### 6.2 CPRT `AI_100_1_0_0`

Files:
- `machine-readable/cprt-AI_100_1_0_0-export.json` (deterministic).
- `machine-readable/cprt-AI_100_1_0_0-export.xlsx` (contains a generation timestamp).

Source: `GET https://csrc.nist.gov/extensions/nudp/services/json/nudp/framework/version/AI_100_1_0_0/export/{json|excel}?element=all`. CPRT metadata for the dataset:

| Field | Value |
|---|---|
| name | "Artificial Intelligence Risk Management Framework" |
| shortName | "AI RMF 1.0" |
| version | "1.1.0" |
| publicationReleaseDate | 2024-07-26 |
| publicationStatus | Final |

The JSON is a flat graph with this top level:

```jsonc
{"response": {"requestType": 4, "elements": {
  "documents": [{"doc_identifier": "AI_100_1_0_0", "name": "Artificial Intelligence Risk Management Framework (AI RMF 1.0)", "version": "1.1.0", "website": "https://www.nist.gov/itl/ai-risk-management-framework"}],
  "relationship_types": [{"relationship_identifier": "projection", ...}],
  "elements": [ /* 1,960 */ ], "relationships": [ /* 1,956 projection edges */ ]}}}
```

**Element types and counts:**

| Type | Count | Example `element_identifier` | Fields used |
|---|---|---|---|
| `function` | 4 | `GOVERN` | `text` = Figure 5 one-liner with a final period |
| `category` | 19 | `GOVERN 1` | `text` |
| `subcategory` | 72 | `GOVERN 1.1` | `text` (pre-final wording, see §3.4) |
| `about` | 77 | `A-GOVERN 1.1` | `text` |
| `suggested_action` | 575 | `SA-GOVERN 1.1-1`; nested items `SA-GOVERN 1.4-1.1` | `text` |
| `documentation` | 292 | `D-GOVERN 1.1-1` | `text` |
| `resource` | 195 | `R-GOVERN 1.1-1` | `title` = citation, `text` = URL |
| `reference` | 631 | `REF-GOVERN 1.1-1` | `title` = citation, `text` = URL |
| `sort` | 95 | `S-GOVERN 1` | `title` = `00001.00001` |

**Edges:** function→category, category→subcategory, subcategory→(about | suggested_action | documentation | resource | reference | sort).

**Quirks:**
- MANAGE 4.2 has no `A-MANAGE 4.2`. Its about text is `A-MANAGE 4.2-1`, and its five suggested actions are mistyped as `about` (`A-MANAGE 4.2-2` … `-6`). That is why there are 77 about elements.
- There are no relationships to any other framework.

The XLSX has one sheet, `NIST AI RMF`, with columns `Function | Category | Subcategory | About | Suggested Actions | Documentation | Resources | References`. It has one row per subcategory, items are separated by newlines, and cells read like `GOVERN 1.1 - Legal and …`.

### 6.3 CPRT `AI_TAXONOMY_1_0_0` (NIST AI 100-2 E2025)

This is the same flat graph format.

**Element types:**

| Type | Count | Example `element_identifier` |
|---|---|---|
| `domain` | 3 | `2` Predictive AI Taxonomy |
| `category` | 12 | `2.2` Evasion Attacks and Mitigation |
| `subcategory` | 42 | `2.2.1` White-Box Evasion Attacks |
| `taxonomy` | 30 | `NISTAML.033` Membership Inference |
| `glossary` | 77 | `G.27` |
| `reference` | 426 | `[132]`; `title` = citation, `text` = URL |
| `figure` | 8 | `FIG-3.1.1a`; `text` = `data:image/png;base64,…` |

Relationships: 845 `projection` edges.

The XLSX has one sheet, `NIST AI Taxonomy`: `Domain | Category | Subcategory | Reference | Glossary | Taxonomy`.

### 6.4 OLIR catalog snapshot (`machine-readable/olir-informative-reference-catalog.json`)

Source: `GET https://csrc.nist.gov/extensions/nudp/services/json/olir/informative-reference-catalog`. The `response` object has these keys:

| Key | Content |
|---|---|
| `searchResults` | 102 informative references |
| `focalDocs` | 16 focal-document entries |
| `referenceDocs` | 92 |
| `informativeReferenceDocs` | 102 |
| `authorities` | Lookup values |
| `statuses` | Lookup values |
| `submissionCategories` | Lookup values |

**AI RMF 1.0 is a focal document** (`focalFrameworkVersionId` 190) with 7 informative references. All are by non-NIST developers:

| frameworkVersionIdentifier | Developer | Posted | Status |
|---|---|---|---|
| Evidence Continuity-AI-RMF-1.0 | Yarion | 2026-08-27 | Draft |
| IPACS-AI-to-AI-RMF-1.0 | Independent | 2026-08-06 | Final |
| MOEM-to-AI-RMF-1.0 | Yarion | 2026-08-06 | Final |
| SDOS-Runtime-Gov-to-AI-RMF-v1.0 | AAM Cyber | 2026-06-15 | Final |
| GuardianSDK-to-AIRMF1.0 | Oracles Technologies LLC | 2026-06-15 | Final |
| GATE-Operational-Control-Model-to-AI-RMF-1.0 | Yarion | 2026-05-26 | Final |
| BXAI-OS-to-AI-RMF-1.0 | Independent | 2026-05-26 | Final |

These map vendor or product control sets onto the AI RMF. The mapping files are hosted by their developers and were **not** downloaded.

- The 40 catalog entries developed by NIST have CSF 1.1, CSF 2.0, SP 800-53 (Rev. 4 to Rev. 5.2.0), SP 800-171 Rev. 3, SP 800-221A, NICE or the Privacy Framework as focal document. **None involves the AI RMF.**
- The AI-related OLIR entries with other focal documents are also third-party. Examples: OWASP LLM Top 10 → CSF 2.0; AI-SOC → CSF 2.0; AISVS → SP 800-53 Rev 5.2.0.

## 7. Crosswalks: what exists and where it is

These are the 12 crosswalks listed on the [AIRC crosswalk page](https://airc.nist.gov/airmf-resources/crosswalks/). The AIRC notes: "Inclusion of a crosswalk below does not imply NIST endorsement".

| Target framework | Document (path) | Provider | Granularity | Date | In git? |
|---|---|---|---|---|---|
| **ISO/IEC 42001** | `crosswalks/.local/NIST_AI_RMF_to_ISO_IEC_42001_Crosswalk.pdf` | Microsoft | Subcategory → 42001 clauses and Annex A/B controls (numbers and titles) | undated (PDF 2023-05-23) | no (.local) |
| ISO/IEC 23894:2023 | `crosswalks/.local/ai-2025-00109_revised_ISO_IEC_23894_Crosswalk_to_the_NIST_AI_RMF.pdf` | INCITS/AI | Function → clauses | 2025-08-14 | no (.local) |
| ISO/IEC FDIS 23894 (superseded) | `crosswalks/crosswalk_AI_RMF_1_0_ISO_IEC_23894.pdf` | NIST | Function → clause numbers and titles | 2023-01-26 (draft for comment) | **yes** |
| ISO/IEC 42005 (DIS) | `crosswalks/.local/ai-2025-00108_ISO_IEC_42005_to_NIST_AI_RMF_Crosswalk.pdf` | INCITS/AI | Category → clauses | 2025-08-14 | no (.local) |
| ISO/IEC 5338 and 5339 | `crosswalks/.local/Crosswalk_NIST_AI_RMF_and_ISO_5338_5339.pdf` | INCITS | Narrative | 2024-04-11 | no (.local) |
| OECD AI Recommendation, proposed EU AI Act, EO 13960, Blueprint for an AI Bill of Rights | `crosswalks/crosswalk_AI_RMF_1_0_OECD_EO_AIA_BoR.pdf` | NIST | Trustworthiness characteristics → terms | 2023-01-26 (draft for comment) | **yes** |
| Singapore AI Verify | `crosswalks/.local/NIST_AI_RMF_to_AI_Verify_Crosswalk.pdf` | NIST, per the AIRC; PDF authored by Singapore PDPC | Category → AI Verify process numbers | 2023-10-12 | no (.local, joint work) |
| Singapore AI Verify (for **AI 600-1**) | `crosswalks/.local/20250527-Crosswalk_NIST_600-1_IMDA_AI_Verify.pdf` | Singapore IMDA | AI 600-1 action ID → AI Verify process numbers | 2025-05-28 | no (.local) |
| Japan AI Guidelines for Business | `crosswalks/.local/FINAL_Crosswalk1_Terminology_RMF_GfB.pdf` and `FINAL_Crosswalk2_Concepts_RMF_GfB.pdf` | Japan AISI with NIST | Terminology; concepts → subcategories | 2024-04-29; 2024-09-17 | no (.local) |
| Korea TTA Trustworthy AI Guidebook 2023 | `crosswalks/.local/20241216-Crosswalk_NIST_AI_RMF_TTA_Guidebook3.pdf` | TTA (Korea) | Requirement / checklist → subcategory | 2024-12-23 | no (.local) |
| CLTC Taxonomy of Trustworthiness for AI | `crosswalks/.local/Taxonomy_of_AI_Trustworthiness_tables.pdf` | UC Berkeley CLTC | Property → subcategories | 2023-12-07 | no (.local) |
| BSA Framework to Build Trust in AI | **not obtained** (see §9) | BSA | — | 2023-04-12 | — |

All crosswalks are PDFs only. None is published as a spreadsheet or JSON. The two NIST crosswalks from January 2023 are still marked "Draft for comment"; NIST never issued final versions, and the ISO/IEC 23894 one is listed as superseded. They sit in `crosswalks/`, not `drafts/`, because they are the versions NIST lists.

**CSF 2.0 and SP 800-53: no official crosswalk exists.** NIST has published no AI RMF ↔ CSF 2.0 or AI RMF ↔ SP 800-53 mapping, either as a crosswalk document or as an OLIR/CPRT dataset. The CPRT `AI_100_1_0_0` dataset has no external relationships. NIST's work in progress on these links:
- The **Cyber AI Profile** (IR 8596 iprd, `drafts/`) is organised by CSF 2.0 outcomes. It is a CSF community profile, not a crosswalk.
- **COSAiS** (`drafts/`) will publish SP 800-53 overlays as NISTIR 8605 and 8605A–D. The outline says the overlays will be "made available online in different data formats through the NIST Cybersecurity and Privacy Reference Tool when finalized."

**ISO/IEC 42001:** the only crosswalk listed by NIST is the Microsoft one above.

## 8. Licensing

- **NIST and U.S. Government works** are public domain in the U.S. (17 U.S.C. §105). This covers every file outside a `.local/` folder, including America's AI Action Plan (Executive Office of the President), and the three JSON extractions derived from them. They may be committed.
- **`.local/` folders** are git-ignored by the repository rule `corpus/**/.local/`. They hold 15 files, each listed in `manifest.json` with the reason:
  - 9 non-NIST crosswalks (INCITS/AI ×3, Microsoft, Singapore IMDA, Korea TTA, Japan AISI/NIST ×2, UC Berkeley CLTC). None carries a licence notice.
  - The AI Verify crosswalk. The AIRC names NIST as provider, but the PDF was authored by Singapore PDPC, so its public-domain status is not established.
  - The AIRC glossary exports (XLSX, CSV, PDF). NIST publishes them, but most definitions are quoted verbatim from ISO/IEC TS 5723:2022, IEEE standards and other copyrighted sources. Under the repository rule "Never commit … ISO … text", they stay local.
  - The Japanese and Arabic translations of AI 100-1. They are labelled "Official U.S. Government Translation" and "Official Government Translation", but were produced by the Government of Japan and by TaikaTranslation LLC; their copyright status is not stated. They are not authoritative.
- **ISO text in committed files.** The two NIST crosswalks in git contain only ISO/IEC clause numbers and titles (the 23894 crosswalk) or short terms and phrases (the OECD/EU/EO/Blueprint crosswalk). The Playbook's about, action and documentation text contains no ISO text; its references cite standards only bibliographically.

## 9. Not obtained or deliberately not included

| Item | Why |
|---|---|
| BSA crosswalk (`https://www.bsa.org/files/policy-filings/04122023aiframeworknistcrosswalk.pdf`) | bsa.org answers with a Cloudflare 403 "Sorry, you have been blocked" page. A Wayback Machine capture exists (20260415193427), but web.archive.org is unreachable from this session: the egress proxy closes the tunnel. It would be a third-party `.local/` file in any case |
| NCCoE Cyber AI Profile project page | Cloudflare JavaScript challenge (HTTP 403). Status was taken from CSRC instead |
| A revised AI RMF (1.1 or 2.0), revision drafts, a revision RFI | Do not exist as of 2026-09-26 (§1) |
| An official machine-readable AI 600-1 | Does not exist (not in CPRT or on the AIRC); built from the PDF |
| NIST AI RMF ↔ CSF 2.0 or SP 800-53 mappings | Do not exist (§7) |
| NISTIR 8605 / 8605A (COSAiS drafts), IR 8596 initial public draft, CI profile draft, AI 800-1 final | Not yet published |
| Superseded or preliminary versions: AI 100-2 E2023 (`NIST.AI.100-2e2023.pdf`), AI 800-1 ipd (`NIST.AI.800-1.ipd.pdf`), AI 600-1 ipd and AI 100-4 ipd (AIRC `docs/`), AI RMF concept paper (2021-12-13), first draft (2022-03-17) and second draft (2022-08-18), NISTIR 8269 draft (superseded by AI 100-2) | Superseded; not needed for citation. URLs are on the AI RMF development and resources pages |
| Related NIST AI publications that do not reference the AI RMF or are outside its scope: AI 300-1 ipd (AI documentation "zero draft", 2026-07-29, input closed 2026-09-16), AI 800-2 ipd (automated benchmark evaluations, 2026-01, comments closed 2026-03-31), AI 800-3 (statistical models for evaluation, 2026-02), AI 800-4 (monitoring deployed AI systems, 2026-03), AI 700-1/700-2 (evaluation reports), SP 800-239 ipd (AI data-centre security, 2026-07-27), NISTIR 8367, NISTIR 8332 draft, SP 800-218 Rev. 1 ipd (SSDF 1.2, 2025-12-17) | Out of scope for the AI RMF corpus. AI 300-1, 800-3 and 800-4 were downloaded and checked, found to contain no reference to the AI RMF, and dropped. SP 1353 ipd (AI for CSF analysis) is in `nist-csf-2.0/` |
| AIRC "Example of Use Cases" files (City of San José, Workday, Google DeepMind template, ElevenLabs, University of Michigan–Dearborn traffic-sign profile, PEAT framework, CRI financial-services profile) | Third-party use cases, not framework text |

## 10. Tools and reproduction

All scripts are ours. Paths resolve relative to `corpus/nist-ai-rmf/`. They need Python 3 (tested with 3.11), PyMuPDF and openpyxl. Run them from anywhere:

```sh
python3 tools/extract_core.py        # -> ai-rmf-core.json      (+ tools/reports/core-verification.json)
python3 tools/extract_playbook.py    # -> ai-rmf-playbook.json  (+ tools/reports/playbook-verification.json); needs ai-rmf-core.json
python3 tools/extract_genai.py       # -> genai-profile.json    (+ tools/reports/genai-verification.json); needs ai-rmf-core.json
python3 tools/build_manifest.py      # -> manifest.json (sha256/bytes recomputed from disk)
python3 tools/verify_corpus.py       # hashes, sizes, parseability, unlisted files, extraction counts
```

- Each extractor accepts `--check` to compare without writing.
- `tools/common.py` holds the shared helpers: ligature fix, comparison normalisation and the hyphenation oracle.
- The extractions are deterministic. Re-running them on the files listed in `manifest.json` reproduces the committed JSON byte for byte.
- After re-downloading, run `build_manifest.py` and then `verify_corpus.py`. The XLSX exports and the Google-Sheets glossary change bytes on every download.
