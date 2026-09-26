# NIST CSF 2.0 machine-readable data: structure reference

This file describes the machine-readable NIST Cybersecurity Framework (CSF) 2.0 files in this corpus. It was written for the ingestion pipeline. The files were retrieved on 2026-09-26. Every count below was computed from the downloaded bytes. Paths are relative to `corpus/nist-csf-2.0/`.

## 1. Which file to ingest

| Priority | File | What it is | Use it for |
|---|---|---|---|
| **Primary** | `machine-readable/csf-2.0-reference-tool-elements.json` | Backing data of NIST's official CSF 2.0 Reference Tool (`GET https://csrc.nist.gov/extensions/nudp/services/json/csf/elements`), 2,164,530 bytes | Functions, Categories, Subcategories, Implementation Examples, 1st/3rd-party-risk tags, withdrawn CSF 1.1 elements, and **all** Informative References, in one nested tree |
| Companion | `machine-readable/csf-2.0-reference-tool-olirs.json` | `GET .../csf/olirs`, 18,105 bytes | Metadata for each Informative Reference dataset (developer, release date, source spreadsheet). Join on `olirName` |
| Alternative | `machine-readable/cprt-CSF_2_0_0-export.json` | Official CPRT "JSON" export of `CSF_2_0_0` | Flat graph with CPRT sort keys. Its only references are the SP 800-53 Rev 5.1.1 control-family ones |
| Alternative | `machine-readable/NIST_CSF_v2.0_catalog.json` | NIST OSCAL catalog (usnistgov/oscal-content v1.5.0) | OSCAL tooling. Contains no Informative References |
| Human-readable | `machine-readable/csf2-informative-references.xlsx`, `machine-readable/cprt-CSF_2_0_0-export.xlsx`, `machine-readable/CSF_2.0_Implementation_Examples.xlsx` | Excel exports | Spot checks and QA |

Both JSON API responses were byte-identical across repeated downloads. The Informative Reference content still changes whenever NIST posts a new mapping to the Online Informative References (OLIR) catalog, so re-download the file to refresh it (see `manifest.json` for URLs and sha256 values).

### Counts in the primary JSON

| Element | Active (CSF 2.0) | Withdrawn (CSF 1.1 lineage) | Total nodes |
|---|---|---|---|
| Function (`function`) | **6** | 0 | 6 |
| Category (`category`) | **22** | 12 | 34 |
| Subcategory (`subcategory`) | **106** | 79 | 185 |
| Implementation Example (`implementation_example`) | **363** | – | 363 |
| Party-risk tag (`party`) | 125 tags on 103 subcategories | – | 125 |
| Withdrawal reason (`withdraw_reason`) | – | 91 (12 on categories, 79 on subcategories) | 91 |
| Withdrawal target stubs (see 2.5) | – | 134 | 134 |
| Informative References (`externalRelationships`) | **7,021** | 0 | 7,021 |

The 7,021 Informative References split as follows:

- 6,643 are `olir_focal` entries, drawn from 24 OLIR datasets:
  - 54 hang off Functions.
  - 495 hang off Categories.
  - 6,094 hang off Subcategories.
- 378 are `external_reference` entries. These are SP 800-53 Rev 5.1.1 control families on Subcategories, and they come from the CSF 2.0 dataset itself.

Every active Subcategory has at least one Implementation Example and at least one Informative Reference. No withdrawn element has either.

Per-Function breakdown of active elements:

| Function | Categories | Subcategories | Impl. Examples | Withdrawn cats / subcats |
|---|---|---|---|---|
| GV GOVERN | 6 | 31 | 119 | 0 / 0 |
| ID IDENTIFY | 3 | 21 | 74 | 4 / 18 |
| PR PROTECT | 5 | 22 | 77 | 4 / 35 |
| DE DETECT | 2 | 11 | 37 | 1 / 11 |
| RS RESPOND | 4 | 13 | 38 | 2 / 11 |
| RC RECOVER | 2 | 8 | 18 | 1 / 4 |
| **Total** | **22** | **106** | **363** | **12 / 79** |

---

## 2. Primary file: `csf-2.0-reference-tool-elements.json`

### 2.1 Top level

The file is one line of minified UTF-8 JSON. Some characters are `\uXXXX` escapes, for example `’` (the curly apostrophe).

```json
{"response": {"elements": [ <Function node GV>, <ID>, <PR>, <DE>, <RS>, <RC> ]}}
```

`response` has exactly one key, `elements`. It holds an array of 6 Function nodes in CSF order: GV, ID, PR, DE, RS, RC.

### 2.2 Node object

Every level uses the same recursive node shape:

| Key | Type | Present on | Meaning |
|---|---|---|---|
| `elementIdentifier` | string | all | ID. See 2.3 |
| `elementTypeIdentifier` | string | all | `function` \| `category` \| `subcategory` \| `implementation_example` \| `party` \| `withdraw_reason` |
| `title` | string | all | Function: `"GOVERN"`. Category: `"Organizational Context"`. **Subcategory: always `""`**. Impl. Example: `"Ex1"`, `"Ex2"`, and so on. Party: `"1st"`/`"3rd"`. Withdrawal reason and stubs: `""` |
| `text` | string | all except stubs | Outcome statement or description. Withdrawn Categories have `""` |
| `elements` | array of nodes | Function, Category, Subcategory, `withdraw_reason` (when it has targets) | Children. The key is **absent** on leaves; it is never `null` or `[]` |
| `externalRelationships` | array | active Function, Category, Subcategory only | Informative References. See 2.7. The key is absent when there are none |
| `relationIdentifier` | string | only on withdrawal target stubs | `"incorporated_into"` or `"moved_to"` |

Keys present on each node type, as observed:

| Node type (location) | Keys |
|---|---|
| `function` | `elementIdentifier, elementTypeIdentifier, title, text, elements, externalRelationships` |
| `category` / `subcategory` (real node) | `elementIdentifier, elementTypeIdentifier, title, text, elements`, plus `externalRelationships` when active |
| `implementation_example`, `party` | `elementIdentifier, elementTypeIdentifier, title, text` |
| `withdraw_reason` | `elementIdentifier, elementTypeIdentifier, title, text`, plus `elements` when targets exist |
| target stub (`category`/`subcategory` under `withdraw_reason`) | `elementIdentifier, elementTypeIdentifier, title, relationIdentifier`. **No `text`** |

### 2.3 Hierarchy and identifier formats

```
function                       GV
└── category                   GV.OC
    ├── subcategory            GV.OC-01
    │   ├── party              first | third                    (0–2 per active subcategory)
    │   ├── implementation_example  GV.OC-01.001  title "Ex1"   (1+ per active subcategory)
    │   └── withdraw_reason    WR-ID.AM-06                      (withdrawn subcategories only)
    │       └── subcategory|category stub  GV.RR-02  relationIdentifier "incorporated_into"
    └── withdraw_reason        WR-ID.BE                         (withdrawn categories only)
        └── category|subcategory stub  GV.OC  relationIdentifier "incorporated_into"
```

| Type | Pattern | Examples |
|---|---|---|
| Function | `^[A-Z]{2}$` | `GV`, `ID`, `PR`, `DE`, `RS`, `RC` |
| Category | `^[A-Z]{2}\.[A-Z]{2}$` | `GV.OC`, `PR.AA`; withdrawn: `ID.BE`, `PR.AC` |
| Subcategory | `^[A-Z]{2}\.[A-Z]{2}-\d{2}$` | `GV.OC-01`; withdrawn: `ID.AM-06`, `ID.BE-01` |
| Implementation Example | `^[A-Z]{2}\.[A-Z]{2}-\d{2}\.\d{3}$` | `GV.OC-01.001`, `GV.OC-02.002` |
| Party tag | `first` / `third` | text `1st Party Risk` / `3rd Party Risk` |
| Withdrawal reason | `WR-` + withdrawn element ID | `WR-ID.AM-06`, `WR-ID.BE` |

> **Implementation Example numbering trap.** The 3-digit suffix of an Implementation Example ID is a **global running sequence from 001 to 363** across the whole Core, in document order. It is **not** the example number within the Subcategory. For example, `GV.OC-02.002` is Example 1 of GV.OC-02 (`"title": "Ex1"`), and `GV.OC-03.004` is Ex1 of GV.OC-03. Use `title` (`Ex1`, `Ex2`, …) for the per-Subcategory label. Use `elementIdentifier` as the stable unique key. The prefix before the last `.` always equals the parent Subcategory ID.

Withdrawn CSF 1.1 elements are renumbered with two-digit suffixes. CSF 1.1 `ID.BE-2` appears here as `ID.BE-02`.

### 2.4 Real snippets (abridged only where marked)

Function node. `elements` and `externalRelationships` are abridged:

```jsonc
{
  "elementIdentifier": "GV",
  "elementTypeIdentifier": "function",
  "title": "GOVERN",
  "text": "The organization's cybersecurity risk management strategy, expectations, and policy are established, communicated, and monitored",
  "elements": [ { "elementIdentifier": "GV.OC", ... }, /* GV.RM, GV.RR, GV.PO, GV.OV, GV.SC */ ],
  "externalRelationships": [
    {"elementIdentifier": "GV.PO", "elementTypeIdentifier": "category", "title": "", "text": "The policies to manage and monitor the organization’s regulatory, legal, risk, environmental, and operational requirements are understood.", "relationIdentifier": "olir_focal", "olirEntryElementId": 142167, "shortName": "SP 800-221A", "olirName": "SP-800-221A-to-Cybersecurity-Framework-v2.0"}
    /* … 10 more */
  ]
}
```

Category node. Children are abridged:

```jsonc
{
  "elementIdentifier": "GV.OC",
  "elementTypeIdentifier": "category",
  "title": "Organizational Context",
  "text": "The circumstances - mission, stakeholder expectations, dependencies, and legal, regulatory, and contractual requirements - surrounding the organization's cybersecurity risk management decisions are understood",
  "elements": [ /* GV.OC-01 … GV.OC-05 */ ],
  "externalRelationships": [ /* olir_focal entries */ ]
}
```

Active Subcategory, verbatim. Only `externalRelationships` is cut down from 37 entries to 4 representative ones:

```jsonc
{
  "elementIdentifier": "GV.OC-01",
  "elementTypeIdentifier": "subcategory",
  "title": "",
  "text": "The organizational mission is understood and informs cybersecurity risk management",
  "elements": [
    {"elementIdentifier": "first", "elementTypeIdentifier": "party", "title": "1st", "text": "1st Party Risk"},
    {"elementIdentifier": "GV.OC-01.001", "elementTypeIdentifier": "implementation_example", "title": "Ex1",
     "text": "Share the organization's mission (e.g., through vision and mission statements, marketing, and service strategies) to provide a basis for identifying risks that may impede that mission"}
  ],
  "externalRelationships": [
    {"elementIdentifier": "ID.BE-2", "elementTypeIdentifier": "subcategory", "title": "", "text": "The organization’s place in critical infrastructure and its industry sector is identified and communicated", "relationIdentifier": "olir_focal", "olirEntryElementId": 142435, "shortName": "CSF v1.1", "olirName": "Cybersecurity-Framework-v1.1-to-Cybersecurity-Framework-v2.0"},
    {"elementIdentifier": "PM-11", "elementTypeIdentifier": "control", "title": "", "text": "", "relationIdentifier": "olir_focal", "olirEntryElementId": 272720, "shortName": "SP 800-53 Rev 5.2.0", "olirName": "Cybersecurity-Framework-v2.0-to-SP-800-53-Rev-5-2-0"},
    {"elementIdentifier": "OG-WRL-002", "elementTypeIdentifier": "layer_1", "title": "", "text": "Cybersecurity Policy and Planning", "relationIdentifier": "olir_focal", "olirEntryElementId": 261735, "shortName": "NICE Framework", "olirName": "NICE-v2.0.0-to-CSF-v2.0"},
    {"elementIdentifier": "PT", "elementTypeIdentifier": "family", "title": "PERSONALLY IDENTIFIABLE INFORMATION PROCESSING AND TRANSPARENCY", "text": "", "relationIdentifier": "external_reference", "shortName": "SP 800-53 Rev 5.1.1", "frameworkVersionIdentifier": "SP_800_53_5_1_1"}
  ]
}
```

Withdrawn Subcategory inside an active Category, verbatim:

```json
{
  "elementIdentifier": "ID.AM-06",
  "elementTypeIdentifier": "subcategory",
  "title": "",
  "text": "Cybersecurity roles and responsibilities for the entire workforce and third-party stakeholders (e.g., suppliers, customers, partners) are established",
  "elements": [
    {
      "elementIdentifier": "WR-ID.AM-06",
      "elementTypeIdentifier": "withdraw_reason",
      "title": "",
      "text": "Incorporated into GV.RR-02, GV.SC-02",
      "elements": [
        {"elementIdentifier": "GV.RR-02", "elementTypeIdentifier": "subcategory", "title": "", "relationIdentifier": "incorporated_into"},
        {"elementIdentifier": "GV.SC-02", "elementTypeIdentifier": "subcategory", "title": "", "relationIdentifier": "incorporated_into"}
      ]
    }
  ]
}
```

Withdrawn Category. Its withdrawn Subcategories are abridged:

```jsonc
{
  "elementIdentifier": "ID.BE",
  "elementTypeIdentifier": "category",
  "title": "Business Environment",
  "text": "",
  "elements": [
    {"elementIdentifier": "ID.BE-01", "elementTypeIdentifier": "subcategory", "title": "", "text": "The organization’s role in the supply chain is identified and communicated",
     "elements": [{"elementIdentifier": "WR-ID.BE-01", "elementTypeIdentifier": "withdraw_reason", "title": "", "text": "Incorporated into GV.OC-05",
                   "elements": [{"elementIdentifier": "GV.OC-05", "elementTypeIdentifier": "subcategory", "title": "", "relationIdentifier": "incorporated_into"}]}]},
    /* ID.BE-02 … ID.BE-05 */
    {"elementIdentifier": "WR-ID.BE", "elementTypeIdentifier": "withdraw_reason", "title": "", "text": "Incorporated into GV.OC",
     "elements": [{"elementIdentifier": "GV.OC", "elementTypeIdentifier": "category", "title": "", "relationIdentifier": "incorporated_into"}]}
  ]
}
```

### 2.5 Active and withdrawn elements

- **Rule.** A Category or Subcategory is withdrawn if it has a direct child with `elementTypeIdentifier == "withdraw_reason"`. Nothing else flags it: there is no status key.
- Withdrawn Categories: ID.BE, ID.GV, ID.RM, ID.SC, PR.AC, PR.IP, PR.MA, PR.PT, DE.DP, RS.RP, RS.IM, RC.IM. Their `text` is `""`. Only `title` carries the old name.
- Withdrawn Subcategories keep their CSF 1.1 wording. They sit either under withdrawn Categories (for example `ID.BE-01`) or interleaved inside active Categories (for example `ID.AM-06`, `PR.DS-03`…`PR.DS-08`, `RS.AN-01`). They have no Implementation Examples, no party tags, and no `externalRelationships`.
- `withdraw_reason.text` is the authoritative human-readable reason, for example `"Incorporated into GV.RR-02, GV.SC-02"` or `"Moved to PR.IR-04"`. Its child **stubs** are the machine-readable targets:
  - 99 Subcategory and 10 Category targets with `incorporated_into`.
  - 24 Subcategory and 1 Category targets with `moved_to`.
  - 134 stubs in total.
- The stubs are **incomplete**. Five reasons have no stub children at all:
  - `WR-ID.GV` "Incorporated into GV". The Function-level target is not modelled here. The CPRT export has it.
  - `WR-PR.IP`, `WR-PR.PT` and `WR-DE.DP` ("Incorporated into other …").
  - `WR-RS.RP` "Incorporated into RS.MA".
- **Identifiers are not unique across the tree.** Stubs repeat the IDs of real nodes. For example, `GV.OC-05` appears once as the real Subcategory and again as a stub under `WR-ID.BE-01` and others. When building an ID index, skip everything beneath a `withdraw_reason` node, or skip nodes that have `relationIdentifier`.

### 2.6 Ordering

- The order of `response.elements` gives Functions in CSF order.
- Within a Function, the **active Categories come first** in CSWP 29 order, followed by the withdrawn Categories. For ID the order is `ID.AM, ID.RA, ID.IM, ID.BE, ID.GV, ID.RM, ID.SC`.
- Within a Category, Subcategories are in numeric order, with withdrawn ones interleaved. For PR.DS: `PR.DS-01, PR.DS-02, PR.DS-03(W) … PR.DS-08(W), PR.DS-10, PR.DS-11`.
- Within a Subcategory, `party` and `implementation_example` children are mixed in no fixed order, so filter by type. Implementation Examples themselves always appear in `Ex1, Ex2, …` order.
- Filtering out withdrawn nodes gives exactly the CSWP 29 Appendix A order.

### 2.7 Informative References (`externalRelationships`)

Two shapes exist:

**(a) `relationIdentifier: "olir_focal"`: 6,643 entries from NIST's OLIR program.** Each entry is one mapping row from an OLIR dataset whose focal document is CSF 2.0.

| Key | Meaning |
|---|---|
| `elementIdentifier` | Element ID in the *reference* document, for example `PM-11`, `BCR-01`, `OG-WRL-002`, `ID.BE-2`. For some datasets it is free text, for example SP 800-37 tasks `"RMF Prepare Step (Organization & Mission/Business Levels): TASK P-2 Risk Management Strategy"` |
| `elementTypeIdentifier` | Type of the reference element. Counts: `layer_1` 4,539 (generic, used by most non-NIST datasets), `control` 1,447, `requirement` 313, `subcategory` 242, `task` 35, `control_enhancement` 33, `category` 23, `family` 6, `function` 5 |
| `title` | Always `""` |
| `text` | Description of the reference element. Often `""` |
| `olirEntryElementId` | Integer, unique per mapping row |
| `shortName` | Display label of the reference document, for example `"SP 800-53 Rev 5.2.0"`. **Not unique.** Two different ISO/IEC 27001:2022 datasets share `"ISO/IEC 27001:2022"` |
| `olirName` | OLIR dataset name, for example `"Cybersecurity-Framework-v2.0-to-SP-800-53-Rev-5-2-0"`. **Use this as the dataset key.** It joins 1:1 to `csf-2.0-reference-tool-olirs.json` → `response.informativeReferenceDocs[].name`. All 24 names join |

**(b) `relationIdentifier: "external_reference"`: 378 entries.** These are SP 800-53 Rev 5.1.1 **control-family** pointers that are part of the CSF 2.0 dataset itself. They appear on Subcategories only.

| Key | Value |
|---|---|
| `elementIdentifier` | Family code, for example `PT`, `SR`, `PM` |
| `elementTypeIdentifier` | `"family"` |
| `title` | Family name, for example `"SUPPLY CHAIN RISK MANAGEMENT"` |
| `text` | `""` |
| `shortName` | `"SP 800-53 Rev 5.1.1"` |
| `frameworkVersionIdentifier` | `"SP_800_53_5_1_1"`. There is no `olirName` and no `olirEntryElementId` |

Informative References per dataset. F/C/S = attached to Function/Category/Subcategory nodes; developer and release date come from the companion file.

| shortName | olirName (dataset key) | Developer | OLIR release | Kind | Refs (F/C/S) |
|---|---|---|---|---|---|
| NICE Framework | NICE-v2.0.0-to-CSF-v2.0 | NIST | 2025-11-17 | olir_focal | 850 (0/203/647) |
| SP 800-53 Rev 5.2.0 | Cybersecurity-Framework-v2.0-to-SP-800-53-Rev-5-2-0 | NIST | 2025-11-17 | olir_focal | 746 (0/6/740) |
| SP 800-53 Rev 5.1.1 | SP-800-53-Rev-5-to-Cybersecurity-Framework-v2.0 | NIST (**archived** OLIR 131, superseded by 5.2.0) | 2025-12-12 | olir_focal | 740 (0/6/734) |
| CCMv4.0 | Cloud-Controls-Matrix-(CCM)-Version-4.0-to-Cybersecurity-Framework-v2.0 | Cloud Security Alliance | 2024-09-30 | olir_focal | 657 (0/0/657) |
| PCI DSS | Payment-Card-Industry-Data-Security-Standards-(PCI-DSS)-4.0.1-to-Cybersecurity-Framework-v2.0 | Independent | 2025-12-23 | olir_focal | 552 (0/0/552) |
| ISO/IEC 27001:2022 | ISO/IEC-27001:2022-to-Cybersecurity-Framework-v2.0 | Razilio | 2025-07-18 | olir_focal | 492 (19/78/395) |
| SCF | NIST CSF 2.0 To Secure Controls Framework (SCF) | SCF Council | 2025-04-07 | olir_focal | 473 (22/88/363) |
| CRI Profile v2.0 | CRI-Profile-v2.0-to-CSF-v2.0 | Cyber Risk Institute | 2024-03-28 | olir_focal | 433 (6/22/405) |
| SP 800-53 Rev 5.1.1 | *(embedded in CSF_2_0_0, `frameworkVersionIdentifier` SP_800_53_5_1_1)* | NIST | – | external_reference | 378 (0/0/378) |
| SP 800-171 Rev 3 | CSF 2.0 to SP 800-171 Rev 3 | NIST | 2025-08-18 | olir_focal | 313 (0/3/310) |
| SP-800-37 Rev 2 | SP-800-37-Rev-2-to-Cybersecurity-Framework-v2.0 | NIST | 2025-04-01 | olir_focal | 217 (0/51/166) |
| CSF v1.1 | Cybersecurity-Framework-v1.1-to-Cybersecurity-Framework-v2.0 | NIST | 2024-03-28 | olir_focal | 185 (6/23/156) |
| SDOS | SDOS-RuntimeGov-to-CSF-2.0-v1.0 | AAM Cyber | 2026-06-22 | olir_focal | 183 (0/0/183) |
| OWASP Top 10 LLM Applications | OWASP-LLM-Top10-v2.0-to-CSF-v2.0 | Independent | 2026-05-08 | olir_focal | 169 (0/0/169) |
| ISO/IEC 27001:2022 | ISO/IEC-27001:2022-to-NIST-Cybersecurity-Framework-v2.0 | Independent | 2026-07-09 | olir_focal | 93 (0/0/93) |
| SP 800-221A | SP-800-221A-to-Cybersecurity-Framework-v2.0 | NIST | 2024-03-28 | olir_focal | 85 (1/10/74) |
| AI-SOC | AI-Driven-Threat-Detection-and-Autonomous-SOC-Controls-Catalog-1.0-to-Cybersecurity-Framework-v2.0 | Cyberoon Enterprise Corp. | 2026-06-15 | olir_focal | 82 (0/0/82) |
| CIS Controls v8.1 | CIS-Controls-8.1-to-Cybersecurity-Framework-v2.0 | Center for Internet Security | 2025-12-23 | olir_focal | 62 (0/0/62) |
| CoP | Cyber-Governance-Code-of-Practice-to-Cybersecurity-Framework-v2.0 | UK DSIT | 2025-11-17 | olir_focal | 61 (0/0/61) |
| CIS Controls v8.0 | CIS-Controls-8.0-to-Cybersecurity-Framework-v2.0 | Center for Internet Security | 2024-03-28 | olir_focal | 60 (0/0/60) |
| SP 800-81r3 | SP-800-81-r3-to-Cybersecurity-Framework-v2.0 | Infoblox | 2026-05-26 | olir_focal | 60 (0/0/60) |
| IRP | Invariant-Reality-Prism-Framework-to-Cybersecurity-Framework-v2.0 | LexaryNova·IusTech | 2026-03-09 | olir_focal | 48 (0/3/45) |
| Guardian-SDK | Ethicore Engine™ Guardian SDK to NIST Cybersecurity Framework 2.0 | Oracles Technologies LLC | 2026-06-15 | olir_focal | 40 (0/0/40) |
| SSDF | SSDF-Version-1.1-to-Cybersecurity-Framework-v2.0 | NIST | 2024-03-28 | olir_focal | 35 (0/2/33) |
| BXAIOS | BXAI-OS-to-CSF-v2.0 | Independent | 2026-05-26 | olir_focal | 7 (0/0/7) |
| **Total** | | | | | **7,021** |

Data-quality notes for Informative References:

- **Mixed provenance.** NIST authored 8 of the 24 OLIR datasets: NICE, SP 800-53 5.2.0, SP 800-53 5.1.1, SP 800-171r3, SP 800-37r2, CSF 1.1, SP 800-221A and SSDF. The rest were contributed by third parties. Filter on the companion file's `developerId` if only NIST-authored mappings are wanted. The NIST-authored source spreadsheets are also in `mappings/`.
- **Archived dataset still present.** The tool still serves the archived SP 800-53 **Rev 5.1.1** OLIR next to the current **Rev 5.2.0** one. Choose by `olirName`.
- **Duplicates.** Some rows repeat. For example, `GV.OC-01` carries `IRP-Sec-1` three times with different `olirEntryElementId`. Deduplicate on (`olirName`, `elementIdentifier`) if needed.
- **Messy third-party identifiers.** Irregular whitespace and punctuation are passed through as-is, for example ISO `"Mandatory Clause:  6.1,"` and `"Annex A Controls:"`.
- **Punctuation differs from the PDF.** Core text uses ASCII `" - "` where the CSWP 29 PDF prints an em dash ("The circumstances — mission …"). Curly apostrophes (`’`) occur mainly in withdrawn CSF 1.1 wording. Normalise before comparing against the PDF.

### 2.8 Companion file `csf-2.0-reference-tool-olirs.json`

```jsonc
{"response": {
  "informativeReferenceDocs": [   // 24 records, one per OLIR dataset (join key: name == olirName)
    {"frameworkVersionId": 196, "frameworkVersionIdentifier": "SSDFv1.1-CSFv2.0",
     "name": "SSDF-Version-1.1-to-Cybersecurity-Framework-v2.0", "version": "1.0.0",
     "webSite": "https://csrc.nist.gov/csrc/media/Projects/olir/documents/submissions/SSDF_to_CSF_2_0_0_CROSSWALK.xlsx",
     "shortName": "SSDF-V1.1-to-CSF-v2.0", "releaseDate": "2024-03-28",
     "developerId": "National Institute of Standards and Technology",
     "referenceFrameworkVersionIdentifier": "SP_800_218_1_1_0"}, ...],
  "referenceDocs": [              // 24 records describing the reference documents
    {"referenceFrameworkVersionIdentifier": "SP_800_218_1_1_0",
     "name": "Secure Software Development Framework (SSDF): Recommendations for Mitigating the Risk of Software Vulnerabilities",
     "shortName": "SSDF", "version": "Version 1.1",
     "webSite": "https://csrc.nist.gov/publications/detail/sp/800-218/final",
     "developerId": "National Institute of Standards and Technology"}, ...],
  "party": [{"elementIdentifier": "third", "title": "3rd", "text": "3rd Party Risk"},
            {"elementIdentifier": "first", "title": "1st", "text": "1st Party Risk"}],
  "elementStatus": [{"elementIdentifier": "active", "text": "Active"},
                    {"elementIdentifier": "withdraw_reason", "text": "Withdrawn"}]
}}
```

Two joins connect this file to the elements file:

- `informativeReferenceDocs[].referenceFrameworkVersionIdentifier` joins `referenceDocs[].referenceFrameworkVersionIdentifier`.
- The `shortName` values in the *elements* file equal `referenceDocs[].shortName`, not `informativeReferenceDocs[].shortName`.

### 2.9 Party-risk tags

Party-risk tags are not part of the CSWP 29 text. They are a Reference Tool filter attribute. Of the 106 active Subcategories:

- 66 are tagged `first` only.
- 15 are tagged `third` only.
- 22 are tagged both.
- 3 have no tag.

### 2.10 Minimal parsing recipe

This recipe was tested and reproduces the counts above: 6 / 22 / 106 / 363 / 7,021, plus 12 / 79 withdrawn.

```python
import json

def is_withdrawn(node):
    return any(c["elementTypeIdentifier"] == "withdraw_reason" for c in node.get("elements", []))

def withdrawal(node):
    wr = next((c for c in node.get("elements", []) if c["elementTypeIdentifier"] == "withdraw_reason"), None)
    return None if wr is None else {"reason": wr["text"],
            "targets": [(s["relationIdentifier"], s["elementIdentifier"]) for s in wr.get("elements", [])]}

def flatten(path):
    functions = json.load(open(path, encoding="utf-8"))["response"]["elements"]
    out = {"functions": [], "categories": [], "subcategories": [], "examples": [], "references": []}
    def refs(node):
        for r in node.get("externalRelationships", []):
            out["references"].append({"csf": node["elementIdentifier"], "kind": r["relationIdentifier"],
                "dataset": r.get("olirName") or r.get("frameworkVersionIdentifier"), "source": r["shortName"],
                "ref": r["elementIdentifier"], "refType": r["elementTypeIdentifier"], "refText": r.get("text", "")})
    for fn in functions:
        out["functions"].append({"id": fn["elementIdentifier"], "name": fn["title"], "text": fn["text"]}); refs(fn)
        for cat in fn.get("elements", []):
            out["categories"].append({"id": cat["elementIdentifier"], "function": fn["elementIdentifier"],
                "name": cat["title"], "text": cat["text"], "withdrawn": is_withdrawn(cat), "withdrawal": withdrawal(cat)}); refs(cat)
            for sub in cat.get("elements", []):
                if sub["elementTypeIdentifier"] != "subcategory":
                    continue                      # skips the category's own withdraw_reason
                kids = sub.get("elements", [])
                out["subcategories"].append({"id": sub["elementIdentifier"], "category": cat["elementIdentifier"],
                    "text": sub["text"], "withdrawn": is_withdrawn(sub), "withdrawal": withdrawal(sub),
                    "party": [k["elementIdentifier"] for k in kids if k["elementTypeIdentifier"] == "party"]}); refs(sub)
                for k in kids:
                    if k["elementTypeIdentifier"] == "implementation_example":
                        out["examples"].append({"id": k["elementIdentifier"], "subcategory": sub["elementIdentifier"],
                                                "label": k["title"], "text": k["text"]})
    return out
```

---

## 3. Alternative: `cprt-CSF_2_0_0-export.json` (CPRT flat graph)

Source: `GET https://csrc.nist.gov/extensions/nudp/services/json/nudp/framework/version/CSF_2_0_0/export/json?element=all`. The server names the file `cprt-CSF_2_0_0-<timestamp>.json`. It is pretty-printed, 753,380 bytes, and its content is deterministic.

```jsonc
{"response": {
  "requestType": 4,
  "elements": {
    "documents": [{"doc_identifier": "CSF_2_0_0", "name": "NIST Cybersecurity Framework", "version": "Version  2.0",
                   "website": "https://nvlpubs.nist.gov/nistpubs/CSWP/NIST.CSWP.29.pdf"}],
    "relationship_types": [ {"relationship_identifier": "projection", "description": "Represents a relationship between two elements."},
                            {"relationship_identifier": "incorporated_into", ...}, {"relationship_identifier": "moved_to", ...},
                            {"relationship_identifier": "external_reference", "description": "Represents a relationship to an external source of information"} ],
    "elements": [ /* 906 */ ],
    "relationships": [ /* 1566 */ ]
}}}
```

- **Element fields:** `element_type`, `element_identifier`, `title`, `text`, `doc_identifier` (always `CSF_2_0_0`). IDs are unique here: 906 elements, no duplicates.
- **Element counts:**
  - `implementation_example` 363
  - `sort` 225
  - `subcategory` 185
  - `withdraw_reason` 91
  - `category` 34
  - `function` 6
  - `party` 2 (one shared `first` element and one shared `third` element)
- **Relationship fields:** `source_element_identifier`, `source_doc_identifier`, `dest_element_identifier`, `dest_doc_identifier`, `relationship_identifier`, `provenance_doc_identifier`.
- **Relationship counts:**
  - `projection` 1,023. These are parent → child edges: function→category 34, category→subcategory 185, subcategory→implementation_example 363, subcategory→party 125, element→withdraw_reason 91, and element→sort 225.
  - `incorporated_into` 110 and `moved_to` 25. These are withdraw_reason → target edges, including `WR-ID.GV → GV`, which the primary file lacks.
  - `external_reference` 408. These point to SP 800-53 Rev 5.1.1 families (`dest_doc_identifier: "SP_800_53_5_1_1"`): 378 on Subcategories, the same set as the primary file, plus **30 on Categories** (GV.PO, GV.RR, DE.AE), which the primary file does *not* carry.
- **No OLIR mappings.** This file has none of the 6,643 `olir_focal` references. Use the primary file for those.
- **Sort keys.** The `sort` elements are named `S-<id>` and their `title` is a dotted 5-digit path, for example `S-GV.OC-01` → `"00001.00001.00001"`. The keys interleave withdrawn Categories in CSF 1.1 position: `ID.AM 00002.00001`, `ID.BE 00002.00002`, `ID.GV 00002.00003`, `ID.RA 00002.00004`. Sorting active elements by sort key still yields CSWP 29 order.
- **Implementation Examples** use the same IDs and titles as the primary file, for example `{"element_type": "implementation_example", "element_identifier": "GV.OC-01.001", "title": "Ex1", ...}`.

Example relationships:

```json
{"source_element_identifier": "GV.OC", "source_doc_identifier": "CSF_2_0_0", "dest_element_identifier": "GV.OC-01", "dest_doc_identifier": "CSF_2_0_0", "relationship_identifier": "projection", "provenance_doc_identifier": "CSF_2_0_0"}
{"source_element_identifier": "WR-ID.AM-06", "source_doc_identifier": "CSF_2_0_0", "dest_element_identifier": "GV.RR-02", "dest_doc_identifier": "CSF_2_0_0", "relationship_identifier": "incorporated_into", "provenance_doc_identifier": "CSF_2_0_0"}
{"source_element_identifier": "GV.OC-01", "source_doc_identifier": "CSF_2_0_0", "dest_element_identifier": "PT", "dest_doc_identifier": "SP_800_53_5_1_1", "relationship_identifier": "external_reference", "provenance_doc_identifier": "CSF_2_0_0"}
```

The Reference Tool's "Export → JSON" button (`csf-export.json`) is generated client-side in the browser in this same flat format, from the primary file plus whatever OLIR datasets the user selected. It is not a server download, so it is not in the corpus.

## 4. Alternative: `NIST_CSF_v2.0_catalog.json` (OSCAL)

Source: usnistgov/oscal-content tag v1.5.0, `nist.gov/CSF/v2.0/json/`. The catalog `metadata.version` is `1.2.0`, `oscal-version` is `v1.2.2`, `published` is `2026-05-13T12:30:00-00:00`, and the generator is CAPORDINO from CPRT (`framework-version-identifier` = `CSF_2_0_0`).

```
catalog
├── metadata, back-matter (4 resources)
└── groups[]  (6 total)   id "GV", class "function", title "GOVERN", props sort-id/label, parts[name=overview]
    └── controls[]  (34 categories in total)    id "GV.OC", class "category", title "Organizational Context",
        │                                        props sort-id/label[/status], parts[name=statement], links (withdrawn only)
        └── controls[]  (185 subcategories in total)  id "GV.OC-01", class "subcategory", title "GV.OC-01"
                          props: risk-party (ns https://csrc.nist.gov/ns/csf, value "1st"/"3rd", 125 total),
                                 sort-id, label, status="withdrawn" (79 subcats + 12 cats)
                          parts: statement (185) + example (363; id = IE id, ns https://csrc.nist.gov/ns/csf)
                          links: rel incorporated_into (103) / moved_to (24), href = bare target id (e.g. "GV.RR-02")
```

```json
{"id": "GV.OC-01", "class": "subcategory", "title": "GV.OC-01",
 "props": [{"name": "risk-party", "ns": "https://csrc.nist.gov/ns/csf", "value": "1st", "remarks": "1st Party Risk"},
           {"name": "sort-id", "value": "00001.00001.00001"}, {"name": "label", "value": "GV.OC-01"}],
 "parts": [{"id": "GV.OC-01_statement", "name": "statement", "prose": "The organizational mission is understood and informs cybersecurity risk management"},
           {"id": "GV.OC-01.001", "name": "example", "ns": "https://csrc.nist.gov/ns/csf", "prose": "Share the organization's mission (e.g., through vision and mission statements, marketing, and service strategies) to provide a basis for identifying risks that may impede that mission"}]}
```

Caveats for the OSCAL catalog:

- It has no Informative References.
- Example parts have no `Ex1` label. The per-Subcategory number is implied by array order.
- Link `href`s are bare IDs, not `#fragment`s.
- Withdrawn Categories have a `statement` part with no `prose`.
- The back-matter points at the CSF 2.0 *draft* PDF and DOI (`NIST.CSWP.29.ipd`). This is an upstream data bug. The final is `NIST.CSWP.29`.

## 5. Excel files

### 5.1 `csf2-informative-references.xlsx` and `cprt-CSF_2_0_0-export.xlsx`

These two files have an identical layout. The server names both `csf2.xlsx`. Each embeds its generation timestamp, so the bytes differ on every download.

- **Sheet `Introduction`** holds key/value pairs in columns A/B. Row 1 has A1 empty and B1 = "NIST Cybersecurity Framework (CSF) 2.0 Reference Tool". Rows 2–5 are `Title`, `Read Me`, `Change Log` (= `Final`) and `Generated Date` (for example `2026-09-26 03:46:47.202000`).
- **Sheet `CSF 2.0`** spans A1:E233. Row 1 is a banner with images and merged B1:C1. Row 2 is the header: `Function | Category | Subcategory | Implementation Examples | Informative References`. Panes are frozen at A3.
- **Row sequence for each Function:**
  - A header row with outline level 1: col A = `GOVERN (GV): <function text>`, plus col E refs.
  - Category rows: col B = `Organizational Context (GV.OC): <text>`.
  - Subcategory rows: col C = `GV.OC-01: <text>`. Col D = `Ex1: …\nEx2: …`, newline-separated. Col E = one `<shortName>: <reference element id>` per line, for example `SP 800-53 Rev 5.2.0: PM-11`.
  - A trailing collapsed summary row with outline level 0: col A = `GOVERN (GV)`.
- **Row totals:** 2 + 6 function header rows + 34 category rows + 185 subcategory rows + 6 summary rows = 233.
- **Withdrawn rows** carry only the label, for example `ID.AM-06: [Withdrawn: Incorporated into GV.RR-02, GV.SC-02]` and `Business Environment (ID.BE): [Withdrawn: Incorporated into GV.OC]`.
- **Column E differs between the two files:**
  - In `csf2-informative-references.xlsx`, col E holds 6,608 reference lines. These are the `olir_focal` references with some exact duplicates collapsed. The 378 SP 800-53 5.1.1 family `external_reference` entries are **not** shown.
  - In `cprt-CSF_2_0_0-export.xlsx`, col E is empty.
- Col D holds 363 `ExN:` lines in both files.

### 5.2 `CSF_2.0_Implementation_Examples.xlsx` (static, February 2024)

- `Sheet1` spans A1:D386: `Function | Category | Subcategory | Implementation Examples`. Subcategory cells read `GV.OC-01: <text>`. Example cells hold `Ex1:  <text>` lines. It contains 363 examples.
- `Sheet2` lists the 6 Functions.
- After normalising quotes and dashes, the text matches the primary JSON except for one difference. ID.AM-08 Ex3 reads `(i.e., "shadow IT")` in the spreadsheet and `(i.e., shadow IT)` in the JSON.

### 5.3 Mapping and profile spreadsheets

**NIST OLIR crosswalks in `mappings/*.xlsx`.** Sheet `Relationships` has these columns:

`Focal Document Element | Focal Document Element Description | Reference Document Element | Reference Document Element Description (Optional) | Comments (Optional) | Strength of Relationship (Optional)`

- The focal document is CSF 2.0 (`GV.OC-01`). The reference element is, for example, `PM-11`, `ID.BE-2` or `OG-WRL-002`.
- Some files carry extra lookup sheets: `CSF 2.0 Subcats` and `221A Subcats` in the 221A crosswalk, and `Sheet1` (RMF tasks) in the SP 800-37r2 crosswalk.

**`mappings/CSF_1.1_to_2.0_Core_Transition_Changes.xlsx`.** Sheet `Change Analysis CSF 1.1-2.0` (212 rows) has these columns:

`CSF 1.1 Identifier | CSF 1.1 Description | CSF 1.1 SORT-ID | Relocation | Noteworthy Modifications | CSF 2.0 Identifier | CSF 2.0 Description | New in CSF 2.0 | CSF 2.0 SORT-ID | Implementation Examples`

**`profiles/CSF_2.0_Organizational_Profile_Template.xlsx`.** Sheet `Current and Target Profile` has 134 outcome rows (6 + 22 + 106) and these columns:

`CSF Outcome (Function, Category, or Subcategory) | CSF Outcome Description | Included in Profile? | Rationale | Current Priority | Current Status | Current Policies, Processes, and Procedures | Current Internal Practices | Current Roles and Responsibilities | Current Selected Informative References | Current Artifacts and Evidence | Target Priority | Target CSF Tier | Target Policies, Processes, and Procedures | Target Internal Practices | Target Roles and Responsibilities | Target Selected Informative References | Notes | Considerations`

There is also a `Column Descriptions` sheet.

**`profiles/CSF_2-0_community_profile_template_draft.xlsx`.** It has four sheets: `About`, `Profile Metadata`, `Community Profile` and `Column Descriptions`. The `Community Profile` sheet has 134 outcome rows and these columns:

`CSF 2.0 Core | CSF 2.0 Outcomes | Priority (recommended) | Rationale (recommended) | Informative References/Mappings (recommended) | Recommendations and Considerations (optional) | Implementation Examples (optional) | Notes (optional)`

**`supplementary/2018-04-16_framework_v1.1_core1.xlsx`** is the CSF 1.1 Core. `Sheet1` has the columns `Function | Category | Subcategory | Informative References`, with one reference per row, continuing downward.
