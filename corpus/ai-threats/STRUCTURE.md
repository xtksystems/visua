# AI threat catalogs corpus: structure reference

This folder holds the AI threat catalogs behind Visua's threat views and every mapping between them and requirements that an authoritative source has published:

- **MITRE ATLAS** (data release 2026.09).
- **OWASP Top 10 for LLM Applications** (2026, current; 2025, superseded).
- **OWASP Top 10 for Agentic Applications** (2026).
- **NIST AI 100-2 E2025**, the adversarial machine learning taxonomy. Its source files stay in `../nist-ai-rmf/`; this folder only references them.

Everything was retrieved on 2026-09-26, and every count below was computed from the downloaded bytes. Paths are relative to `corpus/ai-threats/`. `manifest.json` (framework `ai-threats`, same schema as the NIST manifests) lists 28 documents with URL, landing page, SHA-256, size, verbatim licence and notes. Its `relatedDocuments` names 7 documents of `nist-ai-rmf/manifest.json` that are used here but not copied.

> **Read §6 before building a threat view.** Only four of the eight sources in `mappings.json` are final publications, and **the only final, direct links from a threat to a NIST requirement are the OWASP LLM Top 10 2026 links to AI RMF *categories* and AI 600-1 *risk categories***. All CSF 2.0 and SP 800-53 links are either NIST drafts or come from an unreviewed community crosswalk. No authoritative ATLAS → SP 800-53 or ATLAS → CSF 2.0 mapping exists (§6.1).

## 1. Currency on 2026-09-26

| Catalog | Current version | Released | Evidence | In this corpus |
|---|---|---|---|---|
| **MITRE ATLAS** | Data release **v2026.09**: content 2026.09, format-version 6.0.0 | **2026-09-15** | The [GitHub release v2026.09](https://github.com/mitre-atlas/atlas-data/releases/tag/v2026.09) was published 2026-09-15 15:03 UTC (tag commit `3259f388d19cbcca11bacf12a0ef97f4198f711b`). `dist/manifest.yaml` lists 2026.09 as the newest release, with release-date 2026-09-15. The CHANGELOG entry for 2026.09 is dated 2026-09-14 and states: "This version of ATLAS data contains 1 matrix, 16 tactics, 120 techniques, 88 sub-techniques, 40 mitigations, and 73 case studies." ATLAS now releases monthly (2026.06 on 06-30, 2026.07 on 07-31, 2026.08 on 08-31). The legacy `dist/ATLAS.yaml` is deprecated ("no longer being updated") and frozen at format 5.6.0, whose last build came with release 2026.04 | Release YAML, STIX bundle, dist manifest, LICENSE, README, CHANGELOG. All raw files are pinned to the tag commit |
| **OWASP Top 10 for LLM Applications** | **2026 (v1.0)** | **2026-08-03** | [Resource page](https://genai.owasp.org/resource/owasp-genai-llm-top-10-2026/) dated August 3, 2026. PDF ModDate 2026-08-03. The cover still carries a placeholder ("Version 2026 [Publication date to be set] August 4th, 2026") | 2026 PDF, plus the **2025** PDF ([resource page](https://genai.owasp.org/resource/owasp-top-10-for-llm-applications-2025/), 2024-11-18, superseded). The 2025 edition is kept because the Agentic Top 10 and NIST IR 8596 cite 2025 IDs, and because only 2025 maps entries to ATLAS *techniques* |
| **OWASP Top 10 for Agentic Applications** | **2026** (the only edition) | **2025-12-09** | [Resource page](https://genai.owasp.org/resource/owasp-top-10-for-agentic-applications-for-2026/) dated December 9, 2025. That page and the Agentic Security Initiative page still list the same file on 2026-09-26 | PDF |
| **NIST AI 100-2** | **E2025**: final 2025-03-24, corrected PDF 2025-04-01, errata 2025-06-03. CPRT dataset `AI_TAXONOMY_1_0_0` v1.0.0 (2025-03-20) | 2025-03-24 | `../nist-ai-rmf/STRUCTURE.md` §1: CSRC lists only E2023 and E2025, and the E2026 URLs return 404 | Referenced (`relatedDocuments`), not copied |
| OWASP GenAI Security Crosswalk (community mapping) | **v4.0.0** (2026-08-28), plus `main` at commit `922350d` (2026-09-18) | 2026-09-18 | [GitHub](https://github.com/GenAI-Security-Project/crosswalk). Listed as an OWASP GenAI Security Project resource on 2026-09-01 ([resource page](https://genai.owasp.org/resource/genai-security-industry-framework-crosswalk/)) | 8 mapping files and 8 governance, schema and changelog files, pinned to the commit |
| NIST IR 8596 iprd (Cyber AI Profile) and the COSAiS predictive-AI annotated outline | Drafts of 2025-12-16 and 2026-01-08 | — | `../nist-ai-rmf/STRUCTURE.md` §11.1, re-checked 2026-09-26: no newer draft of either | Referenced, not copied |
| MITRE SAFE-AI report | April 2025 (MP250397) | 2025 | [atlas.mitre.org](https://atlas.mitre.org/pdf-files/SAFEAI_Full_Report.pdf), Last-Modified 2026-09-16 | **`.local/` only** (© MITRE, all rights reserved) |

## 2. Layout and what to ingest

```
ai-threats/
├── manifest.json                 28 documents (sha256, bytes, url, licence, notes) + 7 relatedDocuments in nist-ai-rmf/
├── STRUCTURE.md                  this file
├── atlas.json                    ← INGEST: ATLAS 2026.09: 16 tactics, 208 techniques (120 + 88 sub-techniques), 40 mitigations
├── owasp-llm-top10.json          ← INGEST: LLM Top 10 2026 (current) and 2025 (superseded): descriptions, prevention strategies, mappings
├── owasp-agentic-top10.json      ← INGEST: Agentic Top 10 2026 (ASI01–ASI10): descriptions, prevention guidelines, Appendix A matrix
├── nist-ai-100-2.json            ← INGEST: AI 100-2 E2025: 2 taxonomies, 5 objectives, 25 attacks, 9 mitigation entries, page-cited
├── mappings.json                 ← INGEST: 1,292 published links, each with authority, status, documentId and locator (+155 excluded, listed)
├── mitre-atlas/                  ATLAS-2026.09.yaml (source), stix-atlas.json, manifest.yaml, LICENSE, README.md, CHANGELOG.md
├── owasp-llm-top10/              OWASP-GenAI-LLM-Top-10-2026-v1.0.pdf, LLMAll_en-US_FINAL.pdf (2025)
├── owasp-agentic-top10/          OWASP-Top-10-for-Agentic-Applications-2026-12.6-1.pdf
├── owasp-genai-crosswalk/        llm-top10/ and agentic-top10/ (8 mapping files), README, LICENSE, CHANGELOG, MIGRATION, GOVERNANCE, docs/, data/stats.json
├── licenses/                     Apache-2.0.txt, CC-BY-SA-4.0-legalcode.txt
├── mitre-safe-ai/.local/         git-ignored: SAFEAI_Full_Report.pdf and its extraction safe-ai-mappings.json
└── tools/                        extractors, verifiers and reports/ (§10)
```

**Identifiers.** The same `scheme` / `id` pairs are used in every file.

| `scheme` | `id` format | Validated against |
|---|---|---|
| `atlas` | `AML.TA0001` (tactic), `AML.T0051` / `AML.T0051.000` (technique / sub-technique), `AML.M0015` (mitigation) | `atlas.json` (2026.09) |
| `owasp-llm-top10` | Edition-qualified key: `LLM01:2026`, `LLM03:2025`. **Bare numbers change meaning between editions**: LLM03 is Excessive Agency in 2026 but Supply Chain in 2025 | `owasp-llm-top10.json` |
| `owasp-agentic-top10` | `ASI01` … `ASI10` | `owasp-agentic-top10.json` |
| `nist-ai-100-2` | `NISTAML.01`–`NISTAML.05` (objectives), `NISTAML.011` … `NISTAML.051` (attacks) | `nist-ai-100-2.json` |
| `nist-csf-2.0` | `GV.OC-01` (subcategory) | 106 active subcategories of `../nist-csf-2.0/machine-readable/cprt-CSF_2_0_0-export.json` |
| `nist-sp-800-53-r5` | `AC-6`, `SA-11(2)` (Visua form; printed forms such as `SA-11(02)` are kept in `idAsPrinted`) | Rev. 5.2.0 OSCAL catalog in `../nist-rmf/oscal/`, withdrawn controls excluded |
| `nist-ai-rmf` | `GOVERN 1.7` (subcategory), `MEASURE 2` (category) | `../nist-ai-rmf/ai-rmf-core.json` |
| `nist-ai-600-1` | Risk slug from `../nist-ai-rmf/genai-profile.json`, e.g. `information-security` | same |
| `mitre-attack`, `cwe`, `csa-aicm`, `owasp-genai-data-security`, `owasp-aivss`, `owasp-agentic-threats`, `owasp-ml-top10`, `owasp-api-top10` | As printed by the source (`TA0043`, `CWE-1427`, `AIS`, `DSGAI01`, `AIVSS-1`, `T6`, `ML05:2023`, `API4:2023`) | Not validated: these catalogs are not in the corpus (`checks.targetKnown` is null) |

## 3. `atlas.json` (MITRE ATLAS 2026.09)

### 3.1 Schema

```jsonc
{
  "source": {"documentId": "mitre-atlas-2026-09-yaml", "title", "publisher": "The MITRE Corporation",
             "version": "2026.09", "formatVersion": "6.0.0", "released": "2026-09-15", "collectionModified": "2026-09-15",
             "path": "ai-threats/mitre-atlas/ATLAS-2026.09.yaml", "sha256", "url", "repository", "gitTag": "v2026.09", "gitCommit",
             "retrieved": "2026-09-26", "license": "Apache-2.0",
             "licenseNotice": "Copyright 2021-2026 MITRE\n\nLicensed under the Apache License, Version 2.0 …",   // LICENSE, verbatim
             "licenseFile": "ai-threats/mitre-atlas/LICENSE", "licenseText": "ai-threats/licenses/Apache-2.0.txt",
             "releaseStatement": "©2021-2026 The MITRE Corporation. ALL RIGHTS RESERVED. …",   // README 'Release Statement', verbatim
             "trademark": "MITRE ATLAS™ is a trademark of The MITRE Corporation.",
             "modifications": "Derivative work prepared by Visua on 2026-09-26 …",          // Apache-2.0 §4(b) change notice
             "notes"},
  "counts": {"tactics": 16, "techniques": 120, "subTechniques": 88, "mitigations": 40, "caseStudies": 73,
             "mitigationTechniqueLinks": 361, "techniqueTacticLinks": 225, "caseStudyTechniqueSteps": 665},
  "matrix": {"id": "ATLAS-matrix", "name": "ATLAS", "tacticOrder": ["AML.TA0002", "AML.TA0003", "AML.TA0001", …]},
  "tactics": [{"id": "AML.TA0002", "name": "Reconnaissance", "description": "…", "matrixPosition": 1,
               "attackReference"?: {"id": "TA0043", "url": "https://attack.mitre.org/tactics/TA0043/"},
               "created": "2022-01-24", "modified": "2025-04-09"}],
  "techniques": [{"id": "AML.T0000.001", "name": "Pre-Print Repositories",
                  "fullName"?: "Search Open Technical Databases: Pre-Print Repositories",   // sub-techniques only, as the ATLAS website shows them
                  "description": "…", "tactics": ["AML.TA0002"], "parent": "AML.T0000" | null,
                  "maturity": "Feasible" | "Demonstrated" | "Realized",
                  "platforms": ["Enterprise", "Predictive AI", "Generative AI", "Agentic AI"],
                  "attackReference"?: {"id": "T1596", "url": "…"}, "references"?: [{"id", "title", "url"}],
                  "created", "modified"}],
  "mitigations": [{"id": "AML.M0011", "name": "Restrict Library Loading", "description": "…",
                   "categories": ["Technical - Cyber"],            // Policy | Technical - AI | Technical - Cyber
                   "lifecyclePhases": ["Deployment"],
                   "techniques": [{"id": "AML.T0011", "use": "Restricting binaries from loading external libraries …"}],
                   "attackReference"?: {"id": "M1044", "url": "…"}, "references"?: [...], "created", "modified"}],
  "caseStudies": 73                                                 // counted, not extracted
}
```

- **Text is verbatim.** Names, descriptions and the per-technique `use` text of each mitigation are copied from the YAML unchanged. They are markdown and keep internal links such as `(/techniques/AML.T0051.000)`.
- **Relationships are folded into the objects.** `achieves` (technique → tactic) becomes `tactics`, `specializes` becomes `parent`, and `mitigates` becomes `mitigations[].techniques[]` with the relationship's `description` as `use`. Tactic order comes from the matrix's `sequences`.
- **Sorting.** Techniques are in numeric id order (parent before its sub-techniques). Mitigations are in id order.

### 3.2 Counts

- 16 tactics.
- 208 techniques: 120 top-level and 88 sub-techniques. 14 techniques sit in more than one tactic.
- Maturity: 101 Realized, 83 Demonstrated, 24 Feasible.
- Platforms (a technique can list several): Agentic AI 139, Generative AI 106, Enterprise 85, Predictive AI 82.
- 40 mitigations: Technical - AI 21, Technical - Cyber 14, Policy 8. AML.M0035 is in all three categories and AML.M0039 in two.
- 361 mitigation → technique links. **74 of the 208 techniques have no mitigation.**
- 62 ATT&CK references: 14 tactics, 44 techniques, 4 mitigations.

### 3.3 Method and verification

Tool: `tools/extract_atlas.py`. The report is `tools/reports/atlas-verification.json`.

- **Counts** equal the release statement in the CHANGELOG, which the tool re-reads.
- **Relationships.** Every relationship end resolves, every sub-technique id starts with its parent's id, every technique has a tactic, and every `use` text is non-empty.
- **STIX cross-check.** `mitre-atlas/stix-atlas.json` (built by ATLAS's own release workflow) has 16 `x-mitre-tactic`, 208 `attack-pattern`, 40 `course-of-action` and 73 `campaign` objects, and 1,114 relationships (665 uses, 361 mitigates, 88 subtechnique-of). **Its 361 mitigates pairs are identical to the YAML's.**
- **Source identity.** The release asset is byte-identical to `dist/v6/ATLAS-2026.09.yaml` at the tag commit.
- **Determinism.** `--check` reproduces `atlas.json` and the report byte for byte.

## 4. `owasp-llm-top10.json` and `owasp-agentic-top10.json`

### 4.1 Schema

```jsonc
// owasp-llm-top10.json
{
  "source": {"catalog": "OWASP Top 10 for LLM Applications", "publisher", "currentEdition": "2026",
             "editions": [{"edition": "2026", "status": "current", "documentId": "owasp-llm-top10-2026-pdf", "title", "version",
                           "released": "2026-08-03", "path", "sha256", "url", "landingPage", "pageNumbering", "mappings"},
                          {"edition": "2025", "status": "superseded by 2026", "documentId": "owasp-llm-top10-2025-pdf", …}],
             "license": "CC BY-SA 4.0", "licenseUrl", "licenseNotice": "This document is licensed under Creative Commons, CC BY-SA 4.0.",
             "attribution": "OWASP Top 10 for LLM Applications 2026 and 2025, OWASP GenAI Security Project (https://genai.owasp.org), licensed under CC BY-SA 4.0 (…)",
             "changes": "Adapted by Visua on 2026-09-26: … The wording is unchanged. …",   // CC BY-SA 'indicate changes'
             "retrieved"},
  "counts": {"risks2026": 10, "risks2025": 10, "preventionStrategies2026": 96, "preventionStrategies2025": 87,
             "appendixMappings2026": 331, "relatedFrameworks2025": 19},
  "appendixA2026": {"startPage": 58, "endPage": 105,
                    "coverage": {"LLM01": {"ASI": "primary", "DSGAI": "primary", "ATLAS": "primary", "ATT&CK": "primary", "CWE": "primary",
                                           "600-1": "primary", "RMF": "supporting", "AICM": "primary", "AIVSS": "primary"}},   // ● ○ — matrix
                    "frameworks": [{"heading": "NIST AI RMF (AI 100-1) — v1.0 (2023)", "framework", "version", "column": "RMF",
                                    "scheme": "nist", "targetScheme": "nist-ai-rmf", "note": "Each row maps …", "page"}],
                    "frameworkSources": [{"framework", "version", "source": "https://…", "page": 105}]},   // 'Framework Sources & Versions'
  "risks": [{
    "id": "LLM01", "edition": "2026", "key": "LLM01:2026", "title": "Prompt Injection",
    "description": "…",                               // first paragraph of 'Description'
    "descriptionParagraphs": ["…"],                   // the whole 'Description' section
    "preventionIntro"?: ["…"],                        // paragraphs before the first strategy
    "preventionStrategies": [{"label": "1", "title"?: "…", "text": "…", "group"?: "Tier 1: Foundational (every deployment)",
                              "page": 13, "pageEnd"?: 14}],
    "preventionNotes"?: ["…"],                        // text after the last strategy
    "sections": [{"name": "Description", "page": 10}],
    "page": 10, "pageEnd": 17,
    // 2026 only
    "coverage": {…},                                  // the entry's row of the coverage matrix
    "relatedFrameworks": [{"scheme": "nist", "framework": "NIST AI RMF (AI 100-1)", "targetScheme": "nist-ai-rmf",
                           "id": "MEASURE 1", "element": "MEASURE 1 (methods & metrics)", "strength": "primary" | "supporting",
                           "text": "…",                // the 'Relevance' cell, verbatim
                           "page": 89, "pageEnd"?: 90, "source": "appendix"}],
    "previousEdition": {"key": "LLM07:2025", "basis": "2026 edition p. 7: 'What used to be System Prompt Leakage is now Hidden Context Exposure'"},
    // 2025 only
    "relatedFrameworksIntro"?: "…",
    "relatedFrameworks": [{"scheme": "atlas" | "nist" | "other", "id"?: "AML.T0051.000", "ids"?: [...],
                           "idSource"?: "link target (the printed text carries no identifier)",
                           "text": "AML.T0051.000 - LLM Prompt Injection: Direct MITRE ATLAS", "urls"?: ["https://atlas.mitre.org/…"], "page": 10}]
  }]
}

// owasp-agentic-top10.json: the same risk record (key "ASI01"; 'Prevention and Mitigation Guidelines' → preventionStrategies)
{
  "source": {"catalog": "OWASP Top 10 for Agentic Applications", "publisher": "OWASP GenAI Security Project — Agentic Security Initiative …",
             "edition": "2026", "version", "released": "2025-12-09", "documentId": "owasp-agentic-top10-2026-pdf", "path", "sha256", "url",
             "landingPage", "pageNumbering", "license", "licenseUrl", "licenseNotice", "attribution", "changes", "retrieved", "mappings"},
  "counts": {"risks": 10, "preventionStrategies": 86, "appendixMappings": 62},
  "risks": [{…,
    "relatedFrameworks": [{"scheme": "other", "framework": "OWASP Top 10 for LLM Applications", "frameworkVersion": "2025",
                           "targetScheme": "owasp-llm-top10" | "owasp-agentic-threats" | "owasp-aivss",
                           "id": "LLM01:2025" | "T6" | null,        // AIVSS core risks are printed as names only
                           "text": "…", "column": "OWASP LLM Top 10 (2025)", "page": 40, "pageEnd"?: 41, "source": "appendix"}]}]
}
```

- **What is included.** Only each entry's Description, Prevention and Mitigation section, and mappings. Common Examples, Example Attack Scenarios and References are left out.
- **Text is verbatim** from the PDF text layer. Wrapped lines are re-joined: a line that ends in a letter or digit followed by `-` joins without a space, so compounds such as "adversary-chosen" and dates such as "2026-03-17" stay intact. List labels ("1.", "•") are split off into `label`, and ligatures are expanded. Nothing else is changed.
- **Pages.** `page` is the 1-based physical page of the PDF. In the 2026 and Agentic PDFs it equals the printed "Page N" footer. In the 2025 PDF, printed page = physical page − 4.
- **Lineage.** `previousEdition` records only what OWASP states: the same entry title in 2025, or, for LLM08:2026 Hidden Context Exposure, the "What's New" sentence on p. 7.

### 4.2 Counts

| | LLM 2026 | LLM 2025 | Agentic 2026 |
|---|---|---|---|
| PDF | 122 pages; entries pp. 10–57; Appendix A pp. 58–105 | 45 pages; entries pp. 7–42 | 57 pages; entries pp. 10–39; Appendix A pp. 40–41 |
| Entries | LLM01–LLM10 | LLM01–LLM10 | ASI01–ASI10 |
| Prevention items | 96 (11, 19, 9, 7, 12, 10, 10, 3, 6, 9) | 87 (7, 12, 10, 10, 7, 10, 4, 4, 8, 15) | 86 (9, 8, 9, 9, 7, 9, 9, 10, 9, 7) |
| Mappings | 331 appendix rows: CWE 48, ATLAS 46, AICM 44, DSGAI 39, AI 600-1 39, ASI 31, AIVSS 30, ATT&CK 29, AI RMF 25; 139 primary, 192 supporting | 19 items in 7 entries (LLM05, LLM06 and LLM08 have none) | 62 cells: LLM 2025 23, T-codes 27, AIVSS 12 |

2026 → 2025 renumbering (by title): LLM01 = LLM01, LLM02 = LLM02, LLM03 Excessive Agency = LLM06:2025, LLM04 Supply Chain = LLM03:2025, LLM05 Data and Model Poisoning = LLM04:2025, LLM06 Unbounded Consumption = LLM10:2025, LLM07 Misinformation = LLM09:2025, LLM08 Hidden Context Exposure = LLM07:2025 System Prompt Leakage, LLM09 Vector and Embedding Weaknesses = LLM08:2025, LLM10 Improper Output Handling = LLM05:2025.

### 4.3 Method and verification

Tool: `tools/extract_owasp.py` (PyMuPDF, with pypdf as an independent check). The report is `tools/reports/owasp-verification.json`.

- **Layout rules per document.** Titles, headings, group lead-ins, numbered and bulleted items and paragraphs are recognized by font, size and x-position. There is one configuration per document.
- **Line assembly.** Lines whose tops lie within 2.5 pt are merged, so a list label printed 1 pt lower than its text stays on the same line.
- **Table cells** (Appendix A of both documents) come from word positions: spans are split at x-gaps over 8 pt, each page's own header row gives the column positions, and a cell that crosses a page break is kept as one cell.
- **Completeness.** Every printed line of an entry's Description and Prevention sections is found in the extracted texts, and numbered labels run 1, 2, 3 … within each group.
- **Independent containment check.** All 871 extracted texts (descriptions, strategies, appendix element + relevance pairs, ASI cells) are searched for in pypdf's text of their pages, letters and digits only, with running footers removed. All are found. An appendix row must appear as its element immediately followed by its relevance text. An ASI cell split by a page break must appear as two halves on the two pages.
- **Other checks.**
  - Ids are LLM01–LLM10 and ASI01–ASI10 in order.
  - Every 2026 title equals its PDF bookmark.
  - The coverage matrix is complete (10 × 9) and agrees with the rows: a column marked "—" has no rows, and a column marked ● or ○ has rows of that strength (● rows also satisfy ○).
  - Every appendix row has an identifier, except the AIVSS column of the Agentic matrix, which prints names only.
- **Determinism.** `--check` reproduces both JSONs and the report byte for byte.

### 4.4 Source quirks kept as printed

- **2026 Appendix A (ATLAS column).** It was mapped against ATLAS **content v2026.06** ("Framework Sources & Versions", p. 105). It prints AML.TA0001 as "AI Attack Staging"; ATLAS 2026.08 renamed that tactic "AI Attack Adaptation". Rows keep the printed element. `atlas.json` gives the current name.
- **2026 cover and revision history** still carry placeholders ("[Publication date to be set]", "[2026 release date]").
- **2025 "Related Frameworks".** Written against ATLAS 4.x (2024), so several names have changed since, e.g. "ML" → "AI". `mappings.json` adds `checks.targetNameNow`. One item ("ML Supply Chain Compromise") prints no id. Its id comes from the link target, and `idSource` says so.
- **Agentic Appendix A**, ASI01, first cell: "LLM01:2025Prompt Injection" is printed without a space.
- **Agentic Top 10 edition label.** The document calls itself "2026" but was published in December 2025. The file name ends "12.6-1" (Word file "… 2026 12.6").

## 5. `nist-ai-100-2.json` (NIST AI 100-2 E2025)

### 5.1 Schema

```jsonc
{
  "source": {"documentId": "cprt-ai-100-2e2025-export-json", "manifest": "nist-ai-rmf/manifest.json",
             "path": "nist-ai-rmf/machine-readable/cprt-AI_TAXONOMY_1_0_0-export.json", "sha256",
             "dataset": "AI_TAXONOMY_1_0_0", "datasetName", "datasetVersion": "1.0.0", "datasetReleased": "2025-03-20", "version",
             "publication": {"documentId": "nist-ai-100-2e2025", "identifier": "NIST AI 100-2 E2025", "title", "published": "2025-03-24",
                             "path": "nist-ai-rmf/guides/NIST.AI.100-2e2025.pdf", "sha256", "doi": "10.6028/NIST.AI.100-2e2025", "url",
                             "pageNumbering": "page = 1-based physical page of the PDF (the index is printed on pages x-xi = physical 10-11)"},
             "errata": {"documentId": "nist-ai-100-2e2025-errata", "path", "published": "2025-06-03"},
             "license": "Public domain — U.S. Government work (17 U.S.C. §105) …", "retrieved", "extraction": "…"},
  "counts": {"taxonomies": 2, "objectives": 5, "attacks": 25, "taxonomyElements": 30, "sections": 57,
             "mitigationSections": 5, "inlineMitigationParagraphs": 4},
  "taxonomies": [{"id": "PredAI" | "GenAI", "name": "Generative AI Attacks Taxonomy", "domainSection": "3",
                  "objectives": [{"objective": "NISTAML.01", "attacks": ["NISTAML.016", "NISTAML.017"],
                                  "attacksAsPrinted"?: ["NISTAML.013", "NISTAML.015", "NISTAML.018"],
                                  "errata"?: {"asPrinted", "corrected", "source", "status": "NIST: 'these proposed corrections are not official changes to the document'"}}],
                  "indexPage": 10, "indexPageEnd": 11}],
  "objectives": [{"id": "NISTAML.01", "name": "Availability Violations", "kind": "objective", "taxonomies": ["PredAI", "GenAI"],
                  "description": "…", "definitions": [...]}],
  "attacks": [{"id": "NISTAML.051", "name": "Model Poisoning", "kind": "attack",
               "objectives": [{"taxonomy": "PredAI", "objective": "NISTAML.05"}, {"taxonomy": "GenAI", "objective": "NISTAML.01", "onlyAsPrinted"?: true}],
               "taxonomies": ["PredAI", "GenAI"],
               "description": "…",                               // = definitions[0].text
               "definitions": [{"section": "3.2.2", "sectionTitle": "Model Poisoning Attacks", "taxonomy": "GenAI", "page": 55,
                                "text": "…",                    // CPRT text, verbatim, bracketed ID markers kept
                                "textSelection": "paragraph carrying the ID marker" | "first paragraph after the section-level ID marker",
                                "cprtVersusPdf"?: [{"cprt": "itis", "pdf": "it is"}]}]}],
  "mitigations": [{"id": "3.3.3" | "2.3.1#mitigations", "kind": "section" | "inline-paragraph", "title", "parentSection", "parentTitle",
                   "page", "attackIdsInParentSection": ["NISTAML.018", …], "firstParagraph": "…"}],
  "sections": [{"id": "2.2.5", "type", "title", "parent", "page", "taxonomyIds": [...], "isMitigation": true}]
}
```

- **Sources of each part.**
  - Ids and names come from the CPRT export's taxonomy elements.
  - The hierarchy (taxonomy > objective > attack) comes from the PDF's taxonomy index on printed pages x–xi. The GenAI availability branch is corrected per the errata of 2025-06-03: printed [013, 015, 018], corrected [016, 017]. The printed list is kept in `attacksAsPrinted`, and affected attack-objective pairs carry `onlyAsPrinted`.
  - Definitions are the CPRT section paragraphs that carry each ID marker.
  - Section pages come from the PDF bookmarks, corrected to the page where the heading is printed.
- **Mitigations have no NIST ids.** They are keyed by section number: 5 "Mitigations" sections (2.2.5, 2.4.5, 3.2.3, 3.3.3, 3.4.4) and 4 inline "Mitigations." paragraphs (2.3.1–2.3.4).
- **Not copied.** The CPRT export and the PDF stay in `../nist-ai-rmf/` and are referenced by document id.

### 5.2 Counts and verification

- **Taxonomy.** 2 taxonomies, 5 objectives (NISTAML.01–05), 25 attacks, 57 sections, 9 mitigation entries. One name covers three ids: Model Poisoning is NISTAML.011 (availability), NISTAML.026 (integrity) and NISTAML.051 (supply chain). Show the id with the name.
- **Definitions.** All **36 of 36** are found word for word in the PDF text of their page. Line-break hyphenation and figure text are ignored. The report is `tools/reports/nist-ai-100-2-verification.json`.
- **Two word-level defects in the CPRT text** are recorded in `cprtVersusPdf` and not corrected: "pa rameters" (NISTAML.03, §2.4) and "itis" (NISTAML.051, §3.2.2).
- **Determinism.** `--check` reproduces the files byte for byte.

## 6. `mappings.json`

### 6.1 What exists and what does not (checked 2026-09-26)

| Mapping | Exists? | Authority / status | In `mappings.json` |
|---|---|---|---|
| ATLAS mitigation → ATLAS technique | Yes | MITRE, final (ATLAS data) | 361 rows |
| ATLAS object → ATT&CK object | Yes | MITRE, final (`attack-reference`) | 62 rows |
| **ATLAS → SP 800-53 or CSF 2.0 (MITRE / CTID)** | **No machine-readable mapping.** CTID Mappings Explorer covers ATT&CK only. The only MITRE document that links ATLAS to SP 800-53 is the SAFE-AI report (threat → controls, with "Related ATLAS ID" given for reference). It is © MITRE, all rights reserved | MITRE | Local only (§6.6) |
| ATLAS → AI RMF | **No** | — | — |
| OWASP LLM Top 10 **2026** → ATLAS tactics, ATT&CK tactics, CWE, **NIST AI 600-1 risk categories**, **NIST AI RMF categories**, CSA AICM domains, OWASP ASI / DSGAI / AIVSS | Yes: Appendix A | OWASP, final | 331 rows |
| OWASP LLM Top 10 2025 → ATLAS techniques (+ 1 CWE, 1 API, 1 ML Top 10) | Yes: per-entry "Related Frameworks and Taxonomies" | OWASP, **superseded** | 18 rows |
| **OWASP LLM Top 10 → CSF 2.0 or SP 800-53 in the official document** | **No** | — | — |
| OWASP Agentic Top 10 → OWASP LLM 2025, Agentic Threats T-codes, AIVSS | Yes: Appendix A | OWASP, final | 62 rows |
| **OWASP Agentic Top 10 → ATLAS or any NIST framework in the official document** | **No** | — | — |
| OWASP LLM / Agentic Top 10 → CSF 2.0, AI RMF subcategories, SP 800-53 (FedRAMP), ATLAS techniques | Yes, as the **OWASP GenAI Security Crosswalk** (a community resource of the OWASP GenAI Security Project, not part of the Top 10 documents) | OWASP community, **unreviewed** | 238 rows (57 excluded, §6.4) |
| OWASP LLM Top 10 v2.0 → CSF 2.0 in the NIST OLIR catalog | Exists, but its developer is an *Independent Non-Owner*, not OWASP or NIST | Third party | Not downloaded, not included |
| CSF 2.0 subcategory → ATLAS mitigation / OWASP LLM03:2025 | Yes: NIST IR 8596 iprd, "Example Informative References" | NIST, **draft** | 195 rows |
| SP 800-53 control → AI 100-2 attack (NISTAML) | Yes: COSAiS predictive-AI annotated outline | NIST, **draft** | 21 rows |
| AI 100-2 → ATLAS | Only citations: §3.3.3 cites AML.M0000–M0002 and AML.M0004 as sources of "Usage restrictions" | NIST, final | 4 rows |
| **Final NIST mapping of CSF 2.0, SP 800-53, AI RMF or AI 600-1 to ATLAS or OWASP** | **No** | — | — |

### 6.2 Schema

```jsonc
{
  "description": "…", "generated": "2026-09-26", "license": "Mixed. …",
  "authorities": {"<authority>": {"name", "publisher", "kind": "catalog-data" | "publication" | "community-crosswalk",
                                  "status", "documentIds": [...], "manifest"?: "nist-ai-rmf/manifest.json", "license", "notes"?,
                                  "relationships"?: {...}, "files"?: {...}}},
  "counts": {"total": 1292, "byAuthority": {...}, "byAuthorityAndSchemes": [{"authority", "source", "target", "rows"}],
             "excluded": 155, "unknownIdentifiers": 0},
  "localOnly": {"mitre-safe-ai": {"path": "ai-threats/mitre-safe-ai/.local/safe-ai-mappings.json", "rows": 470, "threats": 40, "reason"}},
  "excluded": [{"authority", "source", …, "reason": "…"}],
  "mappings": [{
    "source": {"scheme": "nist-sp-800-53-r5", "id": "AC-6", "idAsPrinted"?: "AC-06", "label"?: "Least Privilege", "note"?: "…"},
    "target": {"scheme": "nist-ai-100-2", "id": "NISTAML.011", "label"?: "Model Poisoning", "frameworkVersion"?: "v1.0 (2023)"},
    "relationship": "relevant-attack",
    "strength"?: "primary" | "supporting",           // OWASP LLM 2026 only
    "authority": "nist-cosais-outline",
    "status": "final" | "draft" | "superseded" | "unreviewed",
    "documentId": "nist-cosais-predictive-ai-annotated-outline",   // in ai-threats/manifest.json or nist-ai-rmf/manifest.json
    "locator": "Control ID: AC-06 — 'Relevant NIST AI 100-2e2025 Attack ID: NIST AML.011, NIST AML.013'",
    "page"?: 8, "pageEnd"?: 9,                       // 1-based physical PDF page
    "text"?: "…",                                    // the authority's own statement for this link, verbatim
    "context"?: {...},                               // IR 8596: focusArea, proposedPriority, referencesAsPrinted; crosswalk: Function / Family / Tactic
    "checks"?: {"sourceKnown"?, "targetKnown", "targetNameNow"?, …}   // §6.4
  }]
}
```

**Direction is as published** (source → target). Nothing is composed or inferred: every row is one printed or published link.

| `relationship` | Authority | Meaning |
|---|---|---|
| `mitigates` | `mitre-atlas-2026.09` | ATLAS mitigation → technique; `text` = the mitigation's use for that technique |
| `attack-reference` | `mitre-atlas-2026.09` | ATLAS tactic / technique / mitigation → the ATT&CK object it references |
| `related-framework-mapping` | `owasp-llm-top10-2026` | Appendix A row; `strength` from ● (primary) / ○ (supporting); `text` = the "Relevance" cell |
| `related-framework` | `owasp-llm-top10-2025` | Item of an entry's "Related Frameworks and Taxonomies" list |
| `cross-mapping` | `owasp-agentic-top10-2026` | Cell of the Appendix A matrix |
| `example-informative-reference` | `nist-ir-8596-iprd` | CSF 2.0 subcategory → reference cited in a focus-area column |
| `relevant-attack` | `nist-cosais-outline` | Tailored SP 800-53 control → "Relevant NIST AI 100-2e2025 Attack ID" |
| `mitigation-cites` | `nist-ai-100-2e2025` | AI 100-2 attack (its mitigation text) → ATLAS mitigation cited as a source |
| `maps-to` | `owasp-genai-crosswalk` | Row of a crosswalk mapping table; `text` = its "How it applies" / "Description" / "Agentic context" cell |

### 6.3 Counts

**1,292 rows**: 820 final, 216 draft, 18 superseded, 238 unreviewed. 155 more are excluded and listed, and 0 identifiers are unknown.

| Authority | Status | Rows | Source → target |
|---|---|---|---|
| `mitre-atlas-2026.09` | final | 423 | ATLAS → ATLAS 361; ATLAS → ATT&CK 62 |
| `owasp-llm-top10-2026` | final | 331 | LLM 2026 → CWE 48, ATLAS tactics 46, CSA AICM 44, DSGAI 39, **AI 600-1 39** (8 risk categories; 18 primary), ASI 31, AIVSS 30, ATT&CK tactics 29, **AI RMF 25** (9 categories: GOVERN 6, MAP 4, MAP 5, MEASURE 1–3, MANAGE 1, 3, 4; 4 primary) |
| `owasp-agentic-top10-2026` | final | 62 | ASI → LLM 2025 23, Agentic Threats T-codes 27, AIVSS 12 |
| `nist-ai-100-2e2025` | final | 4 | NISTAML.018 → AML.M0000, M0001, M0002, M0004 |
| `nist-ir-8596-iprd` | draft | 195 | CSF 2.0 → ATLAS mitigations 128 (26 distinct); CSF 2.0 → LLM03:2025 67. In all, 92 distinct subcategories. Focus areas: Secure 114, Defend 71, Thwart 10 |
| `nist-cosais-outline` | draft | 21 | 11 SP 800-53 controls (AC-6, CM-2, CM-4, RA-5, SA-11(2), SA-15(1), SA-15(8), SC-5(3), SC-7(10), SI-3(8), SI-4(2)) → 12 AI 100-2 ids |
| `owasp-llm-top10-2025` | superseded | 18 | LLM 2025 → ATLAS 15, CWE 1, OWASP API Top 10 1, ML Top 10 1 |
| `owasp-genai-crosswalk` | unreviewed | 238 | LLM 2026 → CSF 40, AI RMF 40, SP 800-53 41, ATLAS 16; ASI → CSF 40, AI RMF 40, ATLAS 21 |

The rows that reach a NIST requirement:

| Requirement | Final | Draft | Unreviewed |
|---|---|---|---|
| AI RMF (categories) | 25 (OWASP LLM 2026) | — | — |
| AI RMF (subcategories) | — | — | 80 (crosswalk; 12 distinct) |
| AI 600-1 risk categories | 39 (OWASP LLM 2026) | — | — |
| CSF 2.0 subcategories | — | 195 (IR 8596) | 80 (crosswalk; 22 distinct) |
| SP 800-53 controls | — | 21 (COSAiS) | 41 (crosswalk; 21 distinct) |

### 6.4 Checks on every row, and the crosswalk checks

**Checks on all rows.**
- **Ids.** Every id whose catalog is in the repository is checked (`checks.sourceKnown` / `checks.targetKnown`, §2), and all are known.
- **Current ATLAS names.** Rows whose ATLAS target was printed by a publication (OWASP 2026 and 2025, IR 8596, the crosswalk) carry `checks.targetNameNow` with the 2026.09 name, so renamed objects are visible. The only rename among OWASP 2026 targets is AML.TA0001, printed "AI Attack Staging", now "AI Attack Adaptation".
- **Document ids.** Every `documentId` is in `manifest.json` or in `../nist-ai-rmf/manifest.json` (`tools/verify_corpus.py`).
- **AI 100-2 citations.** The tool re-reads the PDF: p. 62 cites [250], [252, 266], [249] and [251] under "Usage restrictions", and the bibliography on p. 99 resolves them to AML.M0002, AML.M0000, AML.M0001 and AML.M0004.

**IR 8596 and COSAiS cross-check.** Both are compared with the independent extractions in `../nist-ai-rmf/` (`cyber-ai-profile.json` and `cosais.json`), which use a different method (row bands from table rules instead of subcategory tokens). The result is in `tools/reports/mappings-report.json` under `crossChecks`, and all parts are **identical**:
- IR 8596: all 195 element references by (subcategory, focus-area column, id), all 96 document-level references, and all 136 printed reference lists (compared on letters and digits).
- COSAiS: all 21 control–attack pairs.
- One typo is normalised: "ATLAS AML-M0028" (PR.AA-05, Defend) becomes AML.M0028, and the row says so in `target.note`.

**OWASP GenAI Security Crosswalk (`owasp-genai-crosswalk`).** The crosswalk is published by the OWASP GenAI Security Project but maintained as a community repository. By its own mapping schema v2, its rows have **no named reviewer** ("unreviewed"), so every row has `status: "unreviewed"` and carries these checks:

| Check | Values | Result |
|---|---|---|
| `entryTitleMatch`: crosswalk entry title vs. the official OWASP title with the same id | exact / close / different | 218 exact. 20 close: the rows of ASI05 ("Unexpected Code Execution" vs. "… (RCE)") and ASI08 ("Cascading Agent Failures" vs. "Cascading Failures") |
| `targetKnown` | true / false | All kept rows are true |
| ATLAS: `targetNameNow`, `labelMatch` (crosswalk label vs. ATLAS 2026.09 name) | exact / close / different | 37 of 37 exact |
| CSF 2.0: `categoryNow`, `categoryLabelMatch`. The crosswalk labels a subcategory with its *category* name, so only the category can be checked | exact / close / different | 70 exact, 10 close (abbreviated names such as "Supply Chain Risk Management" and "Communication") |
| SP 800-53: `targetTitleNow`, `labelMatch` | exact / close / different | 35 exact, 2 close, 4 different. The four are Rev. 4 titles: RA-5 "Vulnerability Scanning" (twice), AU-6 "Audit Review", AU-2 "Audit Events" |
| AI RMF: `labelSource` | — | Labels are crosswalk-authored: AI RMF subcategories have no titles. Ids are printed in the AI 600-1 short form `GV-1.7` and converted to `GOVERN 1.7` |

**Excluded crosswalk rows (57).**
- All 40 rows of `owasp-genai-crosswalk/agentic-top10/Agentic_FedRAMP.md`. Its entries are keyed to a different ASI list: at least half of the entry titles differ, e.g. "ASI02 – Misconfigured Access Controls" and "ASI09 – Emerging Agentic Patterns".
- 17 ATLAS rows that the crosswalk itself marks "**DRAFT — not an ATLAS technique name; retarget pending SME review (#93)**" (8 in the LLM file, 9 in the Agentic file). In two of them, AML.T0045 is not an ATLAS id at all.

`owasp-genai-crosswalk/data/stats.json` also shows that the crosswalk was mapped against ATLAS "4.0" (current: 2026.09). **Use crosswalk rows as leads for an analyst, never as authoritative requirement links.**

### 6.5 Excluded rows (155)

`excluded` lists every published link that was not turned into a row, with the reason:

| Rows | Authority | Reason |
|---|---|---|
| 96 | `nist-ir-8596-iprd` | Document-level references: "AI 100-2e2025" / "NIST AI 100-2e2025" (95) and "ATLAS" (1, ID.RA-03 Thwart), with no element identifier |
| 40 | `owasp-genai-crosswalk` | `Agentic_FedRAMP.md` is keyed to a different ASI list |
| 17 | `owasp-genai-crosswalk` | Marked DRAFT by the crosswalk (§6.4) |
| 2 | `owasp-llm-top10-2025` | Framework-level references without an element id (LLM04: NIST AI RMF; LLM10: OWASP Resource Management / Secure Coding Practices) |

**Not treated as mappings at all.**
- IR 8596's DASF, ENISA, OWASP AI Exchange, arXiv, ATT&CK-mitigation (26) and AI 600-1-action (2) references. These are not AI threat catalogs. All of them are in `../nist-ai-rmf/cyber-ai-profile.json`.
- IR 8596's General-column SP 800-53 lists. NIST's generic CSF → SP 800-53 mapping is in `../nist-csf-2.0/`.

### 6.6 MITRE SAFE-AI (local only)

`mitre-safe-ai/.local/SAFEAI_Full_Report.pdf` is git-ignored by `corpus/**/.local/`. It is "©2025 The MITRE Corporation. All rights reserved. Approved for Public Release; Distribution Unlimited. Public Release Case Number 25-1028." There is no open licence.

- **What it contains.** Appendix C, Table 1 lists 40 AI threats, each with SP 800-53 Rev. 5 controls per system element (Environment, AI Platform, AI Models, AI Data) and "Related ATLAS ID" for reference.
- **Extraction.** `tools/build_mappings.py` parses the table into `mitre-safe-ai/.local/safe-ai-mappings.json`: 470 rows, made of 45 threat → ATLAS links and 425 threat → control links across 100 distinct controls, all known in Rev. 5. The file stays local too.
- **What `mappings.json` records.** Only the row count, under `localOnly`.
- **Caveat.** SAFE-AI is a MITRE work product about an AI assurance approach, not an ATLAS mapping. Its threats are SAFE-AI's own list, and its ATLAS ids are given "for reference". Do not present it as MITRE's ATLAS → SP 800-53 mapping, and do not redistribute it. If Visua ever uses it, treat it like other licensed text: it stays in this installation, and it passes through `modelText()` / `licensedTextToModel()` before reaching a model.

## 7. Licensing and obligations

| Material | Licence | What Visua must do when it redistributes or displays it |
|---|---|---|
| ATLAS data (`mitre-atlas/*`), `atlas.json`, the ATLAS texts in `mappings.json` (`mitigates` `text`, ATLAS labels) | **Apache-2.0**, "Copyright 2021-2026 MITRE" | §4(a): include the licence (`licenses/Apache-2.0.txt`) and the notice (`mitre-atlas/LICENSE`). §4(b): modified files carry a change notice (`atlas.json` `source.modifications`; `mappings.json` `license`). §4(c): keep the copyright notice (`source.licenseNotice`). §4(d): there is **no NOTICE file** to propagate. §6: "MITRE ATLAS™" may be named only to identify the source, with no implied endorsement. Keep the README release statement with the data (`source.releaseStatement`). Its "ALL RIGHTS RESERVED" wording sits beside the Apache-2.0 grant in LICENSE; the LICENSE governs the repository's files, but let counsel confirm before commercial use |
| OWASP PDFs, `owasp-llm-top10.json`, `owasp-agentic-top10.json`, OWASP texts in `mappings.json` (`text` of OWASP rows, OWASP labels) | **CC BY-SA 4.0** | Attribution: give credit (title, "OWASP GenAI Security Project", link), link the licence and indicate changes. Each JSON's `source.attribution` and `source.changes` hold the text. The Agentic document's "Attribution Guidelines" require the project name and the asset name. **ShareAlike**: the JSONs are adaptations and are licensed CC BY-SA 4.0. Anyone who adapts them further must keep that licence and add no further restrictions (no DRM, no terms that override it). Verbatim display with attribution is allowed. OWASP® is a registered trademark of the OWASP Foundation: use the name only for attribution |
| OWASP GenAI Security Crosswalk files and their rows in `mappings.json` | **CC BY-SA 4.0**, "Copyright (c) 2026 OWASP GenAI Data Security Initiative" | The same attribution and ShareAlike duties. The `text` cells of `maps-to` rows are the crosswalk's own words |
| NIST texts (AI 100-2, IR 8596, COSAiS) and NIST rows in `mappings.json` | Public domain (17 U.S.C. §105) | None. Cite the document id and page as a courtesy, and keep draft status visible |
| `licenses/CC-BY-SA-4.0-legalcode.txt` | CC0 | — |
| MITRE SAFE-AI and `safe-ai-mappings.json` | All rights reserved | **Never commit and never redistribute.** Both stay under `.local/` (§6.6) |

**`mappings.json` licence.** Its identifiers and relationships are facts. Its `text` fields keep the licence of their authority, as stated in `license` and in `authorities[].license`. Distribute it with the Apache-2.0 notice and the CC BY-SA 4.0 attribution. Alternatively, strip the `text` fields of ATLAS and OWASP rows before redistributing.

**Nothing here is AICPA, ISO or PCI SSC text.** Target names from CSA AICM, CWE, ATT&CK, DSGAI and AIVSS appear only as the short element labels printed in OWASP's Appendix A, which is itself CC BY-SA 4.0.

## 8. Not obtained or deliberately not included

- **ATLAS.**
  - The deprecated `dist/ATLAS.yaml` (legacy format, not updated).
  - Other release assets: `stix-atlas-realized.json`, the ~40 MB `stix-atlas-attack-enterprise.json` and `stix-atlas-realized-attack-enterprise.json` (ATLAS bundled with ATT&CK), 6 Excel workbooks and 75 ATT&CK Navigator layers.
  - Case-study content (only counted).
- **OWASP.**
  - The landing-page HTML (not saved; no HTML is stored in this corpus).
  - Common Examples, Example Attack Scenarios and References of each entry.
  - The Agentic document's other appendices (e.g. Appendix C, the NHI Top 10 → ASI mapping).
  - The documents behind the target schemes: Agentic AI Threats & Mitigations (T-codes), DSGAI 2026, AIVSS, CSA AICM, CWE, ATT&CK. Their ids appear only as mapping targets.
- **Third-party mappings.**
  - The NIST OLIR informative reference "OWASP LLM Top 10 v2.0 → CSF 2.0" by an Independent Non-Owner developer: not authoritative.
  - Vendor and blog crosswalks.
- **Mappings that do not exist** (§6.1): ATLAS → SP 800-53 / CSF 2.0 / AI RMF from MITRE or CTID; OWASP Top 10 documents → CSF 2.0 / SP 800-53; Agentic Top 10 → ATLAS / NIST; any final NIST mapping to ATLAS or OWASP.
- **Download gate.** genai.owasp.org serves the PDFs only to browser-like User-Agents. A plain `curl`/`fetch` request is redirected to a "You do not have permission to access this download" page, so `pnpm corpus:sync` cannot re-fetch the three OWASP PDFs. Download them in a browser from the landing pages in `manifest.json`; the SHA-256 in the manifest confirms the file.

## 9. Caveats for the product

- **Labels to show.** Show `authority` and `status` on every link. Only `final` rows are published statements of the named authority. `draft` rows are NIST pre-publication material: IR 8596 says "This preliminary draft reflects examples of Informative References", and COSAiS is an annotated outline. `superseded` rows use 2025 ids. `unreviewed` rows are community mappings.
- **No composition.** `mappings.json` never chains links. A view such as "ATLAS technique ← ATLAS mitigation ← CSF subcategory (IR 8596)" combines two authorities and one of them is a draft. If the product shows it, label both hops separately.
- **Granularity differs.**
  - OWASP 2026 maps to ATLAS *tactics*, AI RMF *categories* and AI 600-1 *risk categories*, not to techniques or subcategories.
  - IR 8596 maps CSF subcategories to ATLAS *mitigations*, not techniques.
  - COSAiS maps controls to AI 100-2 attacks, including the category-level ids NISTAML.03 and NISTAML.05, which are valid ids.
- **Version drift in the sources.**
  - OWASP 2026 used ATLAS v2026.06: AML.TA0001 is printed "AI Attack Staging", now "AI Attack Adaptation".
  - OWASP 2025 used ATLAS 4.x.
  - The crosswalk used ATLAS "4.0".
  - IR 8596 cites the LLM Top 10 2025 (`LLM03:2025` = Supply Chain = `LLM04:2026`).
  - The Agentic Top 10 cites the LLM Top 10 2025.
- **IR 8596 cites exactly one OWASP entry**, LLM03 Supply Chain (67 cells). It cites no AI RMF subcategory (its footnote 5: the AI RMF is in revision).
- **Errata.** AI 100-2's GenAI availability branch is corrected per the errata, which NIST calls "not official changes to the document"; the printed version is kept alongside.

## 10. Tools and reproduction

```sh
cd corpus/ai-threats
python3 tools/extract_atlas.py          # atlas.json            (+ tools/reports/atlas-verification.json)
python3 tools/extract_nist_ai_100_2.py  # nist-ai-100-2.json    (+ tools/reports/nist-ai-100-2-verification.json)
python3 tools/extract_owasp.py          # owasp-llm-top10.json, owasp-agentic-top10.json (+ tools/reports/owasp-verification.json)
python3 tools/build_mappings.py         # mappings.json (+ tools/reports/mappings-report.json; SAFE-AI into .local/ when its PDF is present)
python3 tools/build_manifest.py         # manifest.json
python3 tools/verify_corpus.py          # hashes, sizes, parsing, unlisted files, credential scan, extraction counts, mapping authorities
pnpm corpus:verify                      # repository-wide hash check (ai-threats: 28 verified)
```

- **Environment.** Python 3.11 with PyMuPDF 1.28, pypdf 6.19 and PyYAML 6.0.
- **Helper modules.**
  - `common.py`: paths, hashing, JSON writer.
  - `pdflines.py`: PDF line assembly.
  - `nist_drafts.py`: IR 8596 and COSAiS parsers.
  - `crosswalk.py`: crosswalk markdown tables.
  - `safe_ai.py`: SAFE-AI Table 1, local only.
- **Check mode.** Every extractor and `build_mappings.py` accept `--check`: they rebuild in memory, compare with the files on disk, write nothing, and exit 1 on any difference or failed check. All currently pass.
- **Read-only inputs** from other corpora:
  - `../nist-ai-rmf/`: the CPRT AI 100-2 export and PDF, the errata, the IR 8596 and COSAiS drafts, `ai-rmf-core.json`, `genai-profile.json`, and `cyber-ai-profile.json` / `cosais.json` for the cross-checks.
  - `../nist-csf-2.0/machine-readable/cprt-CSF_2_0_0-export.json`.
  - `../nist-rmf/oscal/NIST_SP-800-53_rev5_catalog.json`.
- **Credential scan.** `verify_corpus.py` scans every text file for `pk.eyJ`, `sk.eyJ`, `AIza`, `AKIA`, GitHub and Slack tokens and private keys. None were found.
