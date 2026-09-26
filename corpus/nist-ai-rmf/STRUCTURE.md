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

## 11. Draft extractions: Cyber AI Profile (`cyber-ai-profile.json`) and COSAiS (`cosais.json`)

> **Both files are built from drafts.** `cyber-ai-profile.json` comes from the *initial preliminary draft* of NIST IR 8596; `cosais.json` comes from a *concept paper* and an *annotated outline issued for discussion*. Neither source is a final NIST publication, and NIST says both will change. Label everything derived from them as draft, cite the draft's document id and page, and do not treat priorities, considerations or control selections as NIST requirements.

### 11.1 Currency, re-checked on 2026-09-26

**Verdict: no newer draft of either publication exists.** The files in `drafts/` are still the latest versions, so `manifest.json` is unchanged.

| What was checked | Result |
|---|---|
| [CSRC IR 8596 page](https://csrc.nist.gov/pubs/ir/8596/iprd) | Document history lists only "12/16/25: IR 8596 (Draft)". Planning note of 04/21/2026 (spring 2026 working sessions). Comment period closed 2026-01-30 |
| CSRC [draft list](https://csrc.nist.gov/publications/draft-pubs) (newest entry 2026-09-21) and [IR list](https://csrc.nist.gov/publications/ir) | IR 8596 appears only as the iprd of 12/16/2025. No IR 8605 entry |
| CSRC `pubs/ir/8596/{ipd,2iprd,final}`, `pubs/ir/8605/{ipd,iprd,final}`, `pubs/ir/8605/a/ipd` | All 404 |
| nvlpubs `ir/2025/` and `ir/2026/NIST.IR.8596.ipd.pdf`, `ir/2026/NIST.IR.8596.pdf`, `NIST.IR.8605.pdf`, `NIST.IR.8605.ipd.pdf`, `NIST.IR.8605.iprd.pdf`, `NIST.IR.8605A.pdf`, `NIST.IR.8605A.ipd.pdf`, `NIST.IR.8605B.ipd.pdf`, `NIST.IR.8605C.ipd.pdf`, `NIST.IR.8605D.ipd.pdf` | All 404 (GET) |
| DOI registrations (doi.org handle API) | **Reserved but not live:** `10.6028/NIST.IR.8596.ipd` (registered 2025-09-29) and `10.6028/NIST.IR.8605`, `8605.ipd`, `8605A`, `8605A.ipd`, `8605B.ipd`, `8605C.ipd`, `8605D.ipd` (registered 2026-01-06). Every target URL returns 404. The DOIs show the planned identifiers, not published documents |
| [COSAiS project page](https://csrc.nist.gov/projects/cosais) | Created 2025-07-10, updated 2026-01-08. Newest item: the annotated outline (2026-01-08, feedback by 2026-02-13). The Publications tab lists only AI 100-2 E2025. The FAQ still says a first public draft was the goal for "early FY26" |
| **New related documents (not drafts of either publication)** | [NIST IR 8578](https://csrc.nist.gov/pubs/ir/8578/final) and [NIST IR 8607](https://csrc.nist.gov/pubs/ir/8607/final), *Workshop Summary Report for "Cyber AI Profile" Hybrid Workshop #1 / #2*, both final, published 2026-08-03 ("August 2026"). IR 8607, §4 (printed p. 22): NIST will use the workshop and comment input "to guide the next version of the Cyber AI Profile (the IPD) for public comment in summer 2026". That IPD had not appeared by 2026-09-26. IR 8607 §2.5.2 also summarises the COSAiS breakout: participants suggested the Low baseline instead of the proposed Moderate baseline and a modular approach. The two reports were read but not added to the corpus, because they are workshop summaries, not profile or overlay content |
| nist.gov news RSS (newest item 2026-09-18) and CSRC news | Last Cyber AI Profile item: "Draft NIST Guidelines Rethink Cybersecurity for the AI Era" (2025-12-16). Nothing on COSAiS after 2026-01-08 |
| NCCoE Cyber AI Profile project page | Not reachable: Cloudflare challenge (HTTP 403), as in §9 |

### 11.2 `cyber-ai-profile.json` (NIST IR 8596 iprd, Tables 1–6)

Source: `drafts/NIST.IR.8596.iprd.pdf` (document id `nist-ir-8596-iprd`, 107 pages). Tables 1–6 cover physical pages 25–96 (landscape). In the body, printed page = physical page − 9. All pages in this file are physical pages.

#### Schema

```jsonc
{
  "source": {"documentId": "nist-ir-8596-iprd", "title", "identifier": "NIST IR 8596 iprd", "version", "status": "initial preliminary draft",
             "published": "2025-12-16", "path", "sha256", "url", "doi", "landingPage", "commentPeriod",
             "draftNotice": {"text": "NOTE: Work remains ongoing … significant changes are possible …", "page": 24}, "pageNumbering", "extraction"},
  "focusAreas": [{"id": "secure", "short": "Secure", "title": "Securing AI System Components",
                  "description": "…",          // first paragraph of §2.1.1 / 2.1.2 / 2.1.3, verbatim
                  "page": 18, "section": "2.1.1",
                  "summary": "Focuses on managing …", "summaryPage": 16, "summarySection": "2.1"}],   // the §2.1 bullet
  "priorityLevels": [{"level": 1, "label": "High", "description": "…", "printedAs": "“1” for High Priority", "page": 23, "section": "2.2"}],
  "counts": {"entries": 106, "priorities": {...}, "refs": 2640, "refsByScheme": {...}},
  "entries": [{
    "subcategory": "GV.OC-01",
    "text": "The organizational mission is understood and informs cybersecurity risk management",   // CSF statement as printed
    "page": 25, "pageEnd": 25,                  // pageEnd is always present (= page when the row fits on one page)
    "general": {"considerations": "…" | null,
                "note": "No general considerations identified—see Focus Area Considerations." | null,
                "references": ["NIST SP 800-53, Rev 5: PM-11"],   // verbatim, split on ';'
                "referencesNote"?: "AI-specific Example Informative References pending additional inputs.",
                "sp80053": ["PM-11"]},                               // Visua ids; family-only tokens (PT, CP, IR) kept out
    "focus": {
      "secure": {"priority": 3, "considerations": "…" | null, "references": [...], "referencesNote"?: "…"},
      "defend": {"priority": 3, "opportunities": "…" | null, "considerations": "…" | null, "references": [...], "referencesNote"?: "…"},
      "thwart": {"priority": 3, "considerations": "…" | null, "references": [...], "referencesNote"?: "…"}},
    "refs": [{"scheme": "nist-sp-800-53", "id": "PM-11", "text": "NIST SP 800-53, Rev 5: PM-11", "column": "general", "note"?: "…"}],
    "footnotes"?: [{"marker": "6", "column": "general", "text": "America’s AI Action Plan, …", "page": 51}]
  }]
}
```

Field notes:
- **Text is verbatim.** Runs of white space are collapsed. Typos are kept, and so are the four dash spellings of the "No general considerations identified" note. A superscript "TM" is written as "™", and superscript footnote markers are removed (see `footnotes`).
- **`references`** holds the printed strings split on `;` only. **`refs`** is our classification layer on top of them:
  - A string that holds several ids becomes several records: `DASF 13, 40, 51-53` gives DASF 13, 40, 51, 52, 53; `NIST SP 800-53, Rev 5: CP-06, CP-09` gives CP-6 and CP-9. Each record keeps the verbatim string in `text`.
  - Two references printed without a separator are split, and the split is noted in `note`. Example: "OWASP AI Exchange: AI Security Overview https://arxiv.org/pdf/2311.05232".
- **`referencesNote`** carries the placeholder sentence "AI-specific Example Informative References pending additional inputs." That sentence is not a reference, so it is kept out of `references`.
- **Schemes** and their `id` values:

  | Scheme | `id` |
  |---|---|
  | `atlas` | `AML.M0020` |
  | `owasp-llm` | `LLM03` |
  | `owasp-ai-exchange` | Section or control name as printed, e.g. "General Governance Controls" |
  | `owasp-genai` | Name as printed ("Monitor") |
  | `dasf` | `DASF 50` |
  | `nist-ai-100-2` | null (whole document) |
  | `nist-sp-800-53` | Visua id, e.g. `SC-7(10)`. A family-only token such as `PT` is kept as id `PT` with a note |
  | `nist-ai-rmf` | AI 600-1 action id, e.g. `MP-5.1-002`, checked against `genai-profile.json` |
  | `enisa` | null |
  | **`mitre-attack`** | ATT&CK mitigation id, e.g. `M1047`, or null for "ATT&CK" alone. **This scheme was added because the requested list had none for ATT&CK** |
  | `other` | `arXiv:<id>` for arXiv URLs, otherwise null. Covers NIST SP 800-161/172/207/218/218A, NTIA SBOM, "Reflections from the First Cyber AI Profile Workshop", "OWASP (all)" and URLs |

  Printed names without the "AI Exchange" qualifier are attributed to the OWASP AI Exchange, and `note` says so. Examples: "OWASP Conventional Runtime Controls", "OWASP Model Input Confidentiality", "OWASP General". The attribution is based on the section and control names on owaspai.org (1.1 General governance controls, 1.3 Controls to limit the effects of unwanted behaviour, #MODEL INPUT CONFIDENTIALITY, and so on).
- **`general.sp80053`**: §2.2 says these General-column controls "are listed exactly as they appear in the crosswalk available through the NIST … OLIR Catalog" (CSF 2.0 ↔ SP 800-53 Rev 5, referenceId 131, accessed 2025-12-05). **They are NIST's generic CSF-to-800-53 mapping, not an AI-specific control selection.**

#### Counts

The file has **106 entries**: every CSF 2.0 subcategory, in CSF order, and no extra ids. It also has 6 function rows and 22 category rows, which are reported but not stored. All **318 priorities** were parsed.

| Focus area | Priority 1 (High) | 2 (Moderate) | 3 (Foundational) | Considerations | Of which exactly "Standard cybersecurity practices apply." | "(Rationale)" given | Placeholder instead of references |
|---|---|---|---|---|---|---|---|
| Secure | 23 | 33 | 50 | 106 | 47 | 9 | 1 |
| Defend | 28 | 43 | 35 | 105 | 18 | 1 | 1 |
| Thwart | 24 | 44 | 38 | 106 | 37 | 20 | 43 |

- **General column**: 56 entries have general considerations; 50 have the "No general considerations identified" note instead.
- **Defend opportunities**: 42 entries have "Sample Opportunities". One of them is exactly "Standard cybersecurity practices apply.".
- **The most common priority patterns** (Secure-Defend-Thwart) are 3-3-3 (14 entries), 2-2-2 (10) and 3-2-2 (9). There are 23 patterns in all.

References: 1,810 printed strings (General 741, Secure 565, Defend 357, Thwart 147), classified into 2,640 `refs`.

| Scheme | refs | Distinct ids |
|---|---|---|
| `dasf` | 1,045 | 63 (DASF 1–64 except 49) |
| `nist-sp-800-53` | 739 (737 General, 2 Thwart) | 210 controls in `general.sp80053` (734 list entries), plus family-only tokens PT (GV.OC-03), CP and IR (PR.IR-03); CP-6 and CP-9 in the Thwart column of PR.DS-11 |
| `enisa` | 184 | ENISA Threat Landscape 2025 only |
| `owasp-ai-exchange` | 169 | 22 names |
| `other` | 164 | 10 distinct arXiv papers; `https://arxiv.org/html/2503.11917v3` is cited 82 times |
| `atlas` | 129 | 26 mitigations (AML.M0000–AML.M0028 except M0001, M0010, M0022) |
| `nist-ai-100-2` | 95 | whole document |
| `owasp-llm` | 67 | **1**: LLM03 (Supply Chain) is the only OWASP LLM Top 10 item cited |
| `mitre-attack` | 26 | 16 mitigations (M1015–M1057) |
| `owasp-genai` | 20 | "Monitor" |
| `nist-ai-rmf` | 2 | AI 600-1 action MP-5.1-002 (PR.AT-01 and PR.AT-02, Thwart) |

**No AI 100-1 (AI RMF) subcategory is cited.** Footnote 5 of the draft (physical page 23) explains why: "Per the AI Action Plan, the AI RMF is currently in revision and will be included in a future version."

#### Method

Tool: `tools/extract_cyber_ai_profile.py`.

- **Rows** are the bands between the table's own horizontal rules. Only rules that start at a column boundary count, so hyperlink underlines are ignored. A band also has to lie on the table's left border, so the heading and caption of a table that starts mid-page are never read as cell text. This happens on pages 60, 83 and 91.
- **Columns** are cut at the page's six vertical rules. There are two rule sets: pages 25–44 and pages 45–96.
- **Continuations.** A band whose CSF cell does not start a Function, Category or Subcategory continues the previous row. 61 of the 106 rows cross a page break.
- **Dropped text:** the line-number margin (x < 36 pt), the running header and footer, and the repeated header rows. After this, the only text left outside the bands is the six section headings and six table captions.
- **Cell sections** begin at their bold labels. A label counts only if at least 60 % of its letters are bold, so running text such as "see Focus Area Considerations." is never read as a label.
- **Line joins.** Wrapped lines are joined with a space, with these exceptions:
  - 194 joins after a line-final hyphen with no trailing space, for example "AI-" + "enabled" and "SR-" + "06".
  - 1 join after an em dash ("cybersecurity—including").
  - 105 joins inside a URL that wraps, for example "https://arxiv.org/html/2503.1191" + "7v3", including across page breaks.
  - Every join is logged in the report.

#### Verification

The report is `tools/reports/cyber-ai-profile-verification.json`.

- **Ids and statements.** The id set and order are identical to the 106 subcategories in `packages/frameworks/data/nist-csf-2.0.json`. All 106 printed statements match the CSF 2.0 text when quotes, dashes and a final period are ignored. The function and category rows match too, with one exception: the draft prints the PR.AA category as "**Identify** Management, Authentication, and Access Control" (a typo in the source).
- **SP 800-53 ids.** Every `general.sp80053` id is a node in `nist-sp-800-53-r5.json` except **RA-4**, cited by DE.AE-06. RA-4 is withdrawn in Rev. 5 ("[Withdrawn: Incorporated into RA-3.]", `nist-rmf/controls/sp800-53r5-control-catalog.xlsx`). NIST's own OLIR mapping carries it for DE.AE-06 as well.
- **Comparison with the OLIR mapping.** 103 of the 106 lists are identical to the CSF 2.0 → SP 800-53 Rev 5.2.0 mapping in Visua's CSF data. In the other three, the draft omits one control from its printed list:
  - ID.IM-03: SR-5.
  - PR.PS-04: SA-15(13).
  - RS.MA-03: IR-6.
  - All three were checked against the page.
- **Independent containment check (pypdf).** 2,426 extracted fields (statements, considerations, opportunities, notes and every reference string) were searched for, ignoring white space, in pypdf's text of the entry's pages. A field that crosses a page break may be split once per break. 2,425 were found. The one miss is ID.RA-02's general considerations: pypdf keeps its footnote markers 6 and 7 inline.
- **Visual spot-check.** Rendered pages were compared field by field for GV.OC-01, GV.RR-03, GV.RR-04, ID.RA-01, ID.RA-02, PR.DS-10, PR.DS-11, PR.PS-05, PR.PS-06, DE.AE-08 and RS.MA-01, and for the row tails of ID.AM-08, ID.RA-03 and PR.PS-04. All matched. These include the page-break rows, the footnotes, the ™ sign, URL joins, both label variants and the missing label.
- **Determinism.** `--check` reproduces the JSON and the report byte for byte.

#### Source defects kept as printed

The report lists them in `sourceAnomalies`, `labelVariants` and `cellsWithoutAnExpectedLabel`.

**Missing or variant labels**
- GV.RR-03 Defend has no "Sample Focus Area Considerations:" label, so its `considerations` is null.
- PR.DS-10 Defend prints "Example Informative References" without a colon.
- PR.PS-06 Secure prints "Focus Area Consideration:".

**References printed without a `;` separator** (split in `refs`)
- GV.OC-01 Defend.
- ID.RA-01 Secure: "https://arxiv.org/pdf/2409.08831v1 Governance". The leftover "Governance" becomes an `other` record with a note.
- PR.AA-05 Secure.
- PR.DS-01 Defend.
- RS.AN-06 Defend: "DASF 25,39,41, ENISA …".
- RS.CO-02 Defend.
- GV.OV-01 Thwart: references and the "pending" placeholder with no separator.

**Typos in reference strings**
- "WASP AI Exchange" (PR.AA-01 Defend).
- "AML.M0014)" (PR.AA-02 Defend).
- "ATLAS AML-M0028" (PR.AA-05 Defend); the id is normalized to AML.M0028.
- "ENISA Theat Landscape 2025" (RC.RP-05 and RC.RP-06).
- "ENISA Threat Landscape 202" (PR.AT-01 and DE.CM-03).
- A stray `"` (PR.DS-10 Defend).
- "CM-07 (09)" with a space (PR.PS-03 General).
- "NIST SP 800-281 (all)": no such publication exists, probably SP 800-218 (ID.AM-08 Thwart).
- "55" after a DASF list (GV.SC-07 Secure); read as DASF 55.

**DASF list items not expanded** (no ids recorded for them)
- "v30" (PR.IR-04).
- "4-42" (DE.CM-09; probably 41-42).
- "35-339" (DE.AE-02; probably 35-39).

**Footnotes**
- 6 and 7 are attached to ID.RA-02 General.
- 8 is attached to ID.RA-05 Defend.

### 11.3 `cosais.json` (COSAiS concept paper and predictive-AI annotated outline)

Sources:
- `drafts/NIST-Overlays-SecuringAI-concept-paper.pdf` (`nist-cosais-concept-paper`, 2025-08-14, 7 pages).
- `drafts/COSAiS-Predictive-AI-annotated-outline-Jan2026.pdf` (`nist-cosais-predictive-ai-annotated-outline`, 2026-01-08, 12 pages).

#### Schema

```jsonc
{
  "sources": [{"documentId", "title", "status", "published", "path", "sha256", "url"}],
  "status": "Pre-draft material: …",
  "publicationPlan": {"volumes": [{"identifier": "NISTIR 8605A", "title": "Control Overlays for Securing AI Systems: Using and Fine-Tuning Predictive AI", "page": 2}],
                      "timeline": "NIST intends to issue NISTIR 8605 and NISTIR 8605A as drafts for public comment by Q3 FY2026 …", "page": 2, "documentId"},
  "plannedOverlays": [{"id": "predictive-ai-use-finetune", "useCase": 2, "title": "Using and Fine-Tuning Predictive AI",
                       "description": "…" | null, "audience": "…", "purpose": "…",
                       "scenarios": [{"id": "A", "text": "…", "page": 5}], "note"?: "…", "page": 4,
                       "plannedPublication": {"identifier": "NISTIR 8605A", "title", "documentId", "page"}}],
  "overlays": [{
    "id": "predictive-ai-use-finetune",
    "title": "NIST SP 800-53 Control Overlay for Securing AI Systems: Using and Fine-Tuning Predictive AI",
    "subtitle": "Annotated Outline for Cyber AI Profile Workshop #2",
    "status": "annotated outline (draft)", "complete": false,
    "note": "The list of controls identified for potential inclusion in this overlay is not complete. …", "notePage": 6,
    "summaryTableNote": "All selected controls … The table below is populated with only a subset of example controls …",
    "documentId", "plannedPublication",
    "useCasesIntro", "useCases": [{"id": "A", "text", "page": 3}], "useCasesNote": {"text", "page"},
    "assumptions": ["…"],                        // bullets of "Development Approach and Assumptions" that state an assumption
    "developmentApproach": [{"text", "page"}],   // all bullets of that section; sub-bullets as "\n- …"
    "footnotes": {"1": {"text", "page"}},
    "lifecyclePhases": ["Model Training", "Model Deployment", "Model Maintenance", "Continuous"],
    "controls": [{
      "id": "SA-11(2)", "idAsPrinted": "SA-11(02)",
      "title": "Developer Testing and Evaluation | Threat Modeling and Vulnerability Analyses",
      "titleAsPrinted": null | {"summaryTable": "…", "annotation": "…"},     // only when the printed titles differ
      "inSummaryTable": true, "annotated": true, "proposedAdditional": false,
      "lifecyclePhases": ["Model Training", "Model Deployment"] | null,    // summary-table checkboxes; null when not in the table
      "tailoring": {"controlRequirement": false, "organizationDefinedParameter": false, "discussion": true} | null,
      "annotation": {"selectedInModerateBaseline": "No", "lifecyclePhases": [...],   // as printed in the annotation
                     "assumptions": "…", "controlTailoring": "[Discussion] …",       // paragraphs separated by "\n"
                     "controlTailoringSections": [{"label": "Discussion", "text": "…"}],
                     "attackIds": ["NISTAML.013", …], "attackIdsNormalized": [...],
                     "text": "Control ID: SA-11(02), …\nSelected in …\n…", "page": 9, "pageEnd": 9} | null,
      "page": 5, "summaryTablePage"?: 5, "additionalListPage"?: 6}]
  }]
}
```

- **`plannedOverlays`** holds the concept paper's five use cases, with `title`, `audience`, `purpose` and `description` verbatim. Use Case 4 has a `note`. Use Case 5 has no description row, so `description` is null.
- **`plannedPublication`** pairs each use case with a NISTIR volume from the outline's "Proposed Deliverables and Timeline". The pairing is ours, and the extractor asserts it on key phrases present in both titles:

  | Use case | Volume |
  |---|---|
  | 1 | 8605B |
  | 2 | 8605A |
  | 3 and 4 | 8605D |
  | 5 | 8605C |

- **`controls`** are in SP 800-53 catalog order, with ids normalized to Visua form ("AC-06" → "AC-6", "SC-07(10)" → "SC-7(10)"). `title` comes from the annotation if the control has one, otherwise from the additional-controls list or the summary table.
- **`attackIdsNormalized`** makes one change: "NIST AML.011" becomes "NISTAML.011". "NISTAML.03" and "NISTAML.05" are valid category-level ids (Privacy Compromises, Supply Chain Attacks). **Do not "correct" them.**

#### Counts

- **Planned overlays:** 5, with 2 + 4 + 2 + 0 + 0 lettered scenarios.
- **Predictive-AI overlay controls: 59.**
  - 11 are in the summary table, and all 11 are annotated.
  - 48 are in the "Additional controls and control enhancements proposed" list.
  - No control is both in the table and in the list.
  - 26 are enhancements.
  - By family: AC 3, AU 2, CA 3, CM 6, PE 2, PT 4, RA 2, SA 11, SC 8, SI 16, SR 2.
- **Summary-table tailoring:** Discussion is marked for all 11 controls, Organization-Defined Parameter only for RA-5, Control Requirement for none.
- **Attack ids:** 12 distinct AI 100-2 attack ids are cited.

#### Lifecycle checkboxes

The phases are determinable from the PDF, but not from its text layer: the checkboxes have no glyphs.
- Each box is an 11 pt square drawn as vector graphics.
- A marked box has two diagonal strokes drawn inside it.
- The extractor reads the geometry and cross-checks the result against each annotation's printed "Applicable AI Lifecycle Phase(s)".
- A render of pages 5–6 confirmed all 44 boxes.
- `lifecyclePhases` is null for the 48 list-only controls, because the outline gives them no phases.

#### Verification

The report is `tools/reports/cosais-verification.json`.

- **All 59 ids** are nodes in `nist-sp-800-53-r5.json`. None is withdrawn.
- **Moderate baseline.** For all 11 annotated controls, "Selected in SP 800-53B Moderate Baseline: Yes/No" agrees with `nist-rmf/controls/sp800-53b-control-baselines.xlsx`.
- **Attack ids.** All 12 are ids of the CPRT `AI_TAXONOMY_1_0_0` taxonomy.
- **Summary-table tailoring marks** agree with the bracketed sections of every annotation ([Organization-Defined Parameters] only in RA-5).
- **Lifecycle phases: two disagreements between the summary table and the annotation.** Both values are kept.
  - CM-4: the table marks Model Training, Model Maintenance and Continuous; the annotation says "Continuous".
  - SA-15(8): the table marks Model Training and Model Deployment; the annotation adds Model Maintenance.
- **Titles differ from SP 800-53 in four places:**
  - The summary table prints SA-15(1) and SA-15(8) as "**System and Services Acquisition** | …" instead of "Development Process, Standards, and Tools | …". The annotations are correct.
  - SI-19(7) is printed "De-Identification | Algorithms and Software" (SP 800-53: "Validated Algorithms and Software").
  - SI-12(2) lacks the serial comma.
- **Other anomaly:** SC-7(10)'s attack-id list ends in "NISTAML.034)".
- **Independent pypdf check.** 203 extracted strings were searched for in pypdf's text with running headers and footers removed. All were found except "…(use cases):", where pypdf keeps footnote marker 3 inline.
- **Determinism.** `--check` reproduces the files byte for byte.

#### Caveats for the product

- **COSAiS is not a publication.** There is no draft NISTIR 8605 or 8605A. The outline calls its control list illustrative: "The list of controls identified for potential inclusion in this overlay is not complete". Its summary table holds "only a subset of example controls".
- **The plan has slipped.** NIST said it would issue the NISTIR 8605/8605A drafts "by Q3 FY2026" (ended 2026-06-30), and they have not appeared.
- **The baseline assumption may change.** The overlay assumes the SP 800-53B **moderate** baseline is implemented, and footnote 1 says NIST "intends to revisit this assumption". Workshop participants proposed the Low baseline (IR 8607).
- **18 of the 48 "additional" controls are already in the moderate baseline** (AC-3, AC-22, AU-2, AU-6, CA-3, CA-7, CM-3, CM-5, CM-6, SC-5, SC-23, SC-28, SC-39, SI-3, SI-4, SI-7, SI-10, SR-11). The outline gives no tailoring for them.
- **Use cases changed between documents.** The outline replaced the concept paper's four predictive-AI scenarios (A–D) with two (A, B) that each cover on-premises and third-party models (footnote 3).
- **Cyber AI Profile:** show `status` and `draftNotice`. §2.2 calls the priorities "a subjective exercise", and "Foundational" (3) "does not equate to low priority".
- **Informative references are examples.** 43 Thwart cells, one Secure cell (GV.RR-03) and one Defend cell (GV.RR-03) say references are still pending.
- **Third-party names only.** Neither file contains third-party text. OWASP, DASF, ENISA, MITRE ATLAS and ATT&CK appear only as names and ids; the NIST text is public domain.

### 11.4 Tools

```sh
python3 tools/extract_cyber_ai_profile.py   # -> cyber-ai-profile.json (+ tools/reports/cyber-ai-profile-verification.json)
python3 tools/extract_cosais.py             # -> cosais.json (+ tools/reports/cosais-verification.json)
```

- **Dependencies.** Both tools need PyMuPDF and pypdf. The COSAiS tool also needs openpyxl for the baseline check.
- **`--check`** rebuilds both the JSON and the report in memory and compares them with the files on disk. It writes nothing and exits with status 1 on any difference.
- **Cross-check inputs** are read-only:
  - `packages/frameworks/data/nist-csf-2.0.json` and `nist-sp-800-53-r5.json`.
  - `../nist-rmf/controls/sp800-53r5-control-catalog.xlsx` and `sp800-53b-control-baselines.xlsx`.
  - `machine-readable/cprt-AI_TAXONOMY_1_0_0-export.json` and `genai-profile.json`.
  - If one of them is missing, its report section is empty, and `--check` then reports the report file as different.
- **`tools/verify_corpus.py`** now also checks both files: source hashes against `manifest.json`, 106 entries with 318 parsed priorities, and 5 planned overlays with 59 controls, 11 of them annotated.
