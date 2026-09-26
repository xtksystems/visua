# AICPA SOC 2 (Trust Services Criteria) corpus — structure and notes

Retrieved 2026-09-26. Everything in this folder is described in `manifest.json` (33 source documents, plus the
two derived JSON files documented below). Total size ~17 MB.

## Currency (as of 2026-09-26)

* **Criteria in force:** TSP Section 100, *2017 Trust Services Criteria … (With Revised Points of Focus — 2022)*, and
  DC Section 200, *2018 Description Criteria … (With Revised Implementation Guidance — 2022)*. The 2022 revision changed
  points of focus and implementation guidance only. All 61 criteria and DC1–DC9 are verified text-identical to the
  earlier editions.
* **Nothing newer has been issued.** The live AICPA pages still offer the 2022 editions, and no TSC exposure draft
  appears on aicpa-cima.com. ASEC has said publicly (AICPA Engage, June 2026) that it expects an exposure draft of a
  revised TSC in fall 2026, with a final version in 2027. The previewed changes include removing explicit COSO
  references, restructuring and consolidating criteria, and adding AI-related criteria and points of focus. Check for
  that draft before relying on this corpus after late 2026. The February 2026 AICPA exposure drafts revise the
  attestation standards (AT-C 105/205/210), not the TSC.

## Layout

| Folder | Contents |
|---|---|
| `criteria/` | The current 2022 TSC (clean) and its official red-line. Also three superseded editions: March 2020 (clean and red-line) and the April 2017 original volume, which bundles the 2016 and 2014 TSPC. |
| `description-criteria/` | The current DC 200 (2022). Also the superseded 2018 original DC 200 and DC 200A (2015 description criteria). |
| `mappings/` | AICPA mapping workbooks. TSC 2022 → NIST SP 800-53 r5 (current). TSC 2017 → NIST CSF v1.1, ISO/IEC 27001:2013, COBIT 5, GDPR, NIST 800-53 r4, and the 2016 TSPC. SOC 2 → HITRUST CSF v9 (AICPA-hosted, but authored by a third party). The NIST-hosted Privacy Framework ↔ TSC crosswalk. |
| `guides/` | Free or formerly free AICPA SOC 2 guidance PDFs, plus two HTML pages: the archived AICPA SOC 2 overview page and the current SOC suite landing page. The HTML is kept only where no PDF exists. |
| `supplementary/` | COSO 2013 Internal Control — Integrated Framework Executive Summary and the 17-principles poster (free from coso.org). |
| `tsc-2017-rev2022.json` | Structured extraction of the 2022 TSC (see below). |
| `dc200-description-criteria.json` | Structured extraction of DC 200 (2022) (see below). |
| `manifest.json` | One record per source document. Each record gives the id, title, identifier, version, dates, role, url, landing page, sha256, bytes, the verbatim license notice, and notes. |

## How the files were obtained (provenance)

Every current AICPA download on aicpa-cima.com is gated. Most need a free AICPA account; some are for AICPA members
only. I did not log in or create accounts. Each file came from one of three official sources:

1. **AICPA's own asset CDN** (`assets.ctfassets.net/rb9cdnjh59cm/…`). This is the Contentful space that aicpa-cima.com
   serves its downloads from. The one ungated page checked, "Business arrangements with SOC tool providers", exposes a
   link on this host. The URLs used are publicly indexed by search engines.
   * Nine of these files have exactly the size that the gated landing page lists for its file. This includes the 2022
     TSC (554.3 KB, 567,612 bytes).
   * Five differ, meaning AICPA now serves a later reprint that I could not retrieve publicly: DC 200, the ISO 27001
     mapping, and three guides. `manifest.json` notes which.
2. **Internet Archive captures** of files that AICPA published openly on `us.aicpa.org` / `www.aicpa.org` before
   2023. All 23 were downloaded in raw (`id_`) mode. The SHA-1 of every retained file matches the archive's CDX
   payload digest, so each is a byte-exact copy of what AICPA served. One truncated capture (1 MiB) was discarded.
3. **Direct public downloads** from coso.org, NIST (raw.githubusercontent.com) and aicpa-cima.com (HTML page).

All PDFs open and parse fully with PyMuPDF and pypdf. All spreadsheets open with openpyxl. No HTML error pages were
kept.

## Licensing (read before any use beyond personal reference)

* **AICPA documents are "All rights reserved" and grant no reuse permission.** For example, the current TSC notice is:
  "© 2024 American Institute of Certified Public Accountants. All rights reserved. AICPA and American Institute of CPAs
  are trademarks of the American Institute of Certified Public Accountants and are registered in the US, the EU and
  other countries. SOC 1®, SOC 2® and SOC 3® trademarks are registered trademarks of the AICPA. The Globe Design is a
  trademark of the Association of International Certified Professional Accountants and licensed to the AICPA.
  2403-036758".
  * The TSC also carries "©2019, Committee of Sponsoring Organizations of the Treadway Commission (COSO). All rights
    reserved. See www.coso.org."
  * The older PDFs say: "For more information about the procedure for requesting permission to make copies of any part
    of this work, please email copyright@aicpa.org …".
  * Each file's exact notice is in the `license` field of `manifest.json`.
* **AICPA & CIMA website Terms & Conditions (Version 4)**, verbatim:
  * "These Terms and Conditions permit you to use the Website and related Website Content for your personal,
    non-commercial use only. You may not access or use the Website for any commercial purpose."
  * "You may download material displayed on the Website for non-commercial, personal use provided you also retain all
    copyright and other proprietary notices contained on the materials and you may not modify or create derivative
    works of the material. You may not distribute, modify, transmit, reuse, repost or use the Website Content for
    public or commercial purposes, including the text and images, without our written permission."
  * "We do not consent and specifically object to use of this website, including any and all content, to train
    artificial intelligence (AI) platforms or machine learning algorithms and to inclusion of content from this website
    in the knowledge base of Large Language Models (LLMs) and similar AI platforms."
  * Permissions: Association of International Certified Professional Accountants, Permissions Department, 220 Leigh
    Farm Road, Durham, NC 27707, copyright-permissions@aicpa-cima.com.
* **COSO Executive Summary:** "No part of this publication may be reproduced, redistributed, transmitted or displayed in
  any form or by any means without written permission." AICPA is COSO's permissions agent.
* **Practical consequence for a commercial compliance platform:** get written AICPA permission before any of the
  following:
  * shipping criteria or point-of-focus text (including the derived JSON) in a product;
  * redistributing these files, including committing them to a shared or public repository;
  * loading them into an LLM or retrieval index.
  * Criterion IDs such as "CC6.1" and your own paraphrases are the usual low-risk alternative.
* Nothing here has been committed to git.

## `tsc-2017-rev2022.json`

Top-level keys:

* `source`: document id, title, sha256, verbatim copyright, license note, extraction method, and the `scope` and
  `origin` vocabularies.
* `counts`, `categories` (5), `series` (20), `criteria` (61), `footnotes`, `revisions2022`.

Fields:

* **categories:** `id`, `name`, `description` (the one-sentence definition from TSP 100.12), `elaboration`,
  `criteriaApplied`.
* **series:** `id`, `title`, `category`, `kind`, `headingVerbatim`, `headingRowId` (P1.0–P8.0), `description` (from
  TSP 100.08, .10 and .12(e); null for A1/C1/PI1, for which the document gives no series description), `criteriaCount`,
  `pointsOfFocusCount`.
* **criteria:**
  * `id`, `series`, `category`, `cosoPrinciple` (1–17 for CC1.1–CC5.3; otherwise null).
  * `criterionType`: `coso-principle` / `supplemental-common-criterion` / `category-specific-criterion`.
  * `appliesToCategories`: all five for CC.
  * `text` (verbatim), `textUnchangedSince2020`, `sourcePage`, `pointsOfFocus[]`.
* **pointsOfFocus[]:**
  * `ref`: a local id such as `CC6.1-POF03`. AICPA does not number points of focus.
  * `title`, `text`. Nested lists are kept as newline-separated items; level-2 items are indented by two spaces.
  * `scope` and `scopeHeading`. `scopeHeading` is the verbatim group heading; `scope` is one of `all`,
    `system-level`, `availability-specific`, `confidentiality-specific`, `processing-integrity-specific`,
    `processing-integrity-products-specific` or `privacy-specific`.
  * `origin`: `coso-framework` or `trust-services-criteria`.
  * `typeface`: `regular` = COSO, `italic` = TSC supplemental, `bold-italic` = system-level. These are the document's
    own conventions (TSP 100.29).
  * `subgroup`: CC3.1 only (Operations / External Financial Reporting / External Nonfinancial Reporting / Internal
    Reporting / Compliance Objectives).
  * `privacyRoleTags` / `privacyRoles`: the 2022 `[P]`/`[C]` markers, meaning "likely to be relevant to a data
    processor / data controller" (footnote 21).
  * `addedIn2022`, `revisedIn2022`, `change2022` (`added` / `revised` / `unchanged`).
  * For revised items: `titleIn2020`, `textIn2020`, `editorialOnly`, and sometimes `revisionNote`.
  * `footnoteRefs`, `sourcePage`.

### Counts

61 criteria: 33 CC + 3 A + 5 PI + 2 C + 18 P, exactly as expected. The document also has eight privacy series-heading
rows (P1.0–P8.0), which are not criteria.

| Series | Criteria | Points of focus | added | revised | unchanged |
|---|---|---|---|---|---|
| CC1 Control Environment | 5 | 28 | 2 | 0 | 26 |
| CC2 Information and Communication | 3 | 34 | 8 | 5 | 21 |
| CC3 Risk Assessment | 4 | 36 | 2 | 5 | 29 |
| CC4 Monitoring Activities | 2 | 11 | 0 | 1 | 10 |
| CC5 Control Activities | 3 | 16 | 0 | 0 | 16 |
| CC6 Logical and Physical Access Controls | 8 | 38 | 5 | 21 | 12 |
| CC7 System Operations | 5 | 36 | 3 | 16 | 17 |
| CC8 Change Management | 1 | 18 | 3 | 11 | 4 |
| CC9 Risk Mitigation | 2 | 15 | 1 | 10 | 4 |
| A1 Availability | 3 | 16 | 1 | 5 | 10 |
| C1 Confidentiality | 2 | 5 | 1 | 3 | 1 |
| PI1 Processing Integrity | 5 | 19 | 0 | 4 | 15 |
| P1–P8 Privacy | 18 | 58 | 9 | 11 | 38 |
| **Total** | **61** | **330** | **35** | **92** | **203** |

Points of focus by scope:

* 201 `all`: 85 COSO-specified and 116 TSC-supplemental.
* 74 `privacy-specific`, 18 `processing-integrity-specific`, 17 `availability-specific`, 12
  `confidentiality-specific`, 7 `system-level` (all in CC2.2/CC2.3), and 1 `processing-integrity-products-specific`.

58 privacy points of focus carry role tags: 40 are `[P][C]`, 15 `[C]` and 3 `[P]`.

### How the 2022 change flags were derived

* **Primary source: AICPA's red-lined 2022 edition** (`criteria/tsc-2017-rev-pof-2022-redlined.pdf`).
  * I classified every red glyph at character level: a rule through the middle of the glyph means a deletion; an
    underline means an insertion.
  * I then located each clean-2022 point of focus in the red-line's "new text" stream; all 330 were found.
  * `added` means at least 95% of the point of focus's letters are insertions. `revised` means any inserted letters,
    deleted letters or changed punctuation. `unchanged` means none. The `[P]`/`[C]` tags are ignored for this.
* **Cross-check:** an independent point-of-focus diff against the March 2020 edition (299 points of focus), parsed with
  the same code. The two methods agree on 317 of 330 points of focus. The 13 differences:
  * 10 points of focus that the red-line shows as **rewritten in place**, so they count as revised rather than added.
    Examples: "Protects Encryption Keys" became "Protects Cryptographic Keys"; "Protects Mobile Devices" became
    "Protects Endpoint Devices"; "Uses Role-Based Access Controls" became "Uses Access Control Structures". Their 2020
    predecessors were paired by similarity to the struck-through text (`revisionNote`). P6.4-POF01 keeps only one
    sentence of its predecessor.
  * 3 CC9.2 title-capitalization edits ("from" to "From"), flagged `editorialOnly`.
* **Removed:** four 2020 points of focus have no 2022 counterpart in their criterion
  (`revisions2022.pointsOfFocusRemovedFromCriterion`). Two of them still exist under other privacy criteria.

### Reconciliation with AICPA's own "302 points of focus"

AICPA's 2017 mapping workbooks report "Total Points of Focus: 302". That figure is:

* 297 points of focus in the April 2017 original,
* plus the 5 CC3.1 objective sub-headings, which the workbooks count as rows.

The March 2020 edition has 299 because it adds CC6.3 "Reviews Access Roles and Rules" and PI1.1 "Defines Information
Necessary to Support the Use of a Good or Product". The 2022 edition has 330 (299 − 14 dropped or replaced + 45 new
titles).

### Extraction caveats

* **Method.** Text comes from the PDF text layer with PyMuPDF, classified by column position and typeface.
  * Page headers, folios, footnote bodies and superscript "fn N" references were removed from the running text.
  * Footnotes 15–21 are kept in `footnotes`, and items point to them through `footnoteRefs`.
* **Soft hyphens.**
  * Line-end hyphens are rejoined using the document's own vocabulary, with `wordfreq` as the fallback.
  * All 335 line-break decisions were reviewed. The only hyphens kept at a line break are genuine compounds
    ("bring-your-own", and in 2020 "change-detection" and "sub-objectives").
  * Legitimate constructions such as "first- and second-line" remain.
* **Other normalization.** Curly quotes, "—" and "®" are preserved. One missing space caused by a white-coloured
  space glyph ("software, rule sets", CC6.1) was restored.
* **Verification.**
  * All 61 criterion texts match, alphanumerically, the criterion text that AICPA embeds in its own TSC 2022 → NIST
    800-53 r5 workbook. That workbook misspells "COSO Principle" as "COSO Principal".
  * All 61 texts are also identical to the 2020 edition.
* **Title splitting.** Point-of-focus titles are split from their text at the first " — ". One source item lacks the
  space ("Identifies Threats to Objectives —The entity…") and is handled.

## `dc200-description-criteria.json`

The file is an array of 9 objects, one per criterion DC1–DC9, with these fields:

* `id`
* `text`: the full criterion, with lettered and roman sub-items on new lines.
* `leadIn`: "The description contains the following information:"
* `criterion`: the lead sentence only.
* `items[]` (`level`, `marker`, `text`): DC3, DC4 and DC7.
* `implementationGuidance[]`: 127 paragraphs in total; bullets are prefixed "• ".
* `textUnchangedSince2018`: true for all nine. Verified by parsing the 2018 original with the same column-aware code.
* `source`, `sourcePage`.

Caveats:

* The criteria table pages are rotated 90°. Coordinates were mapped through each page's rotation matrix and the two
  columns split by x-position.
* Guidance paragraphs are segmented heuristically: bullet glyphs, indentation, and gaps of more than 16.5 pt. Across a
  page break, a paragraph is continued if the previous one did not end a sentence.
* The guidance is the 2022 revised implementation guidance, including disclosures about risk assessment, specific
  risks and control frameworks.

## Not obtained, and why

* **Paid publications:**
  * AICPA Guide *SOC 2® Reporting on an Examination of Controls at a Service Organization Relevant to Security,
    Availability, Processing Integrity, Confidentiality, or Privacy* (the "SOC 2 Guide"). Skipped as instructed.
  * The full COSO 2013 framework volume.
* **AICPA members only:**
  * Illustrative SOC 2® report with description and assertion.
  * Illustrative management representation letters (SOC 2 type 1 and type 2).
  * Illustrative SOC 3® report.
  * SOC for Service Organizations Toolkit.
  * The current edition of the TSC→ISO 27001 mapping.
* **Free-login pages with no public copy found:**
  * Illustrative service auditor's SOC 2 type 2 report (SSAE 21).
  * Privacy Considerations in a SOC 2® Examination.
  * FAQs for SOC 2 and SOC 3 examinations; FAQs on the effect of software tools on SOC 2 examinations.
  * TQA 9561 (effect of a service organization's use of AI on SOC 1 and SOC 2 examinations).
  * SOC overview document; 2023 SOC survey brochure; SOC logo guidelines.
  * TSC→CSA Cloud Controls Matrix mapping (.xls). CSA publishes its own CCM v3.0.1/v4 ↔ TSC 2017 mappings.
  * TSC→ISACA Blockchain Framework mapping.
  * The 2022 **red-lined** DC 200.
  * The current reprints of DC 200 (330.9 KB) and of "Information for Service Organization Management in a SOC 2
    Engagement" (1.4 MB). The copies here are the 2022 clean DC 200 and the 2018 edition of the guide.
* **Do not exist as official AICPA or NIST products:**
  * AICPA mappings to NIST CSF 2.0, ISO/IEC 27001:2022 or COBIT 2019.
  * A NIST OLIR/CPRT informative reference for AICPA TSC. NIST's CSF 2.0 informative-reference list and community
    resources page contain none.
  * A separate TSC→COSO mapping. CC1.1–CC5.3 are COSO principles 1–17, recorded in `cosoPrinciple`.
* **Out of scope:** SOC for Cybersecurity and SOC for Supply Chain description criteria (DC 100/DC 300), and the AT-C
  attestation standards. These were found on AICPA's CDN but not kept.
