# NIST RMF corpus — structure notes

This file documents (1) the OSCAL JSON rendering of **NIST SP 800-53 Rev. 5, Release 5.2.0** (controls + SP 800-53A assessment procedures) and the **SP 800-53B** baseline profiles in `oscal/`, and (2) the RMF task list in `rmf-tasks.json` extracted from **NIST SP 800-37 Rev. 2**. All JSON snippets are cut verbatim from the files in this corpus (long arrays/prose are truncated and marked `…`). All counts were computed from the files on 2026-09-26.

## 1. Files and provenance

| File (under `oscal/`) | OSCAL model | `metadata.version` | `metadata.last-modified` | `oscal-version` |
|---|---|---|---|---|
| `NIST_SP-800-53_rev5_HIGH-baseline-resolved-profile_catalog.json` | catalog | 5.2.0 | 2026-05-13T05:08:48.658671Z | 1.2.2 |
| `NIST_SP-800-53_rev5_HIGH-baseline_profile.json` | profile | 5.2.0 | 2026-05-11T16:10:16.00000-00:00 | 1.2.2 |
| `NIST_SP-800-53_rev5_LOW-baseline-resolved-profile_catalog.json` | catalog | 5.2.0 | 2026-05-13T05:08:56.112817Z | 1.2.2 |
| `NIST_SP-800-53_rev5_LOW-baseline_profile.json` | profile | 5.2.0 | 2026-05-11T16:10:16.00000-00:00 | 1.2.2 |
| `NIST_SP-800-53_rev5_MODERATE-baseline-resolved-profile_catalog.json` | catalog | 5.2.0 | 2026-05-13T05:08:58.668341Z | 1.2.2 |
| `NIST_SP-800-53_rev5_MODERATE-baseline_profile.json` | profile | 5.2.0 | 2026-05-11T16:10:16.00000-00:00 | 1.2.2 |
| `NIST_SP-800-53_rev5_PRIVACY-baseline-resolved-profile_catalog.json` | catalog | 5.2.0 | 2026-05-13T05:08:47.708155Z | 1.2.2 |
| `NIST_SP-800-53_rev5_PRIVACY-baseline_profile.json` | profile | 5.2.0 | 2026-05-11T16:10:16.00000-00:00 | 1.2.2 |
| `NIST_SP-800-53_rev5_catalog.json` | catalog | 5.2.0 | 2026-05-11T16:01:09.00000-00:00 | 1.2.2 |

Source: GitHub `usnistgov/oscal-content`, branch `main` = tag **`v1.5.0`** = commit `78650f02ad9321bb7b817846f8fbd4f2bcd620de` (2026-05-13), path `nist.gov/SP800-53/rev5/json/`. The CSRC SP 800-53 page still links tag `v1.4.0` (catalog `last-modified` 2025-08-26, OSCAL 1.1.3), which already contains Release 5.2.0. Compared with `v1.4.0`, all 1,196 control/enhancement objects in `v1.5.0` are identical; only the catalog metadata changed (OSCAL 1.2.2, new `last-modified`, the 5.2.0 note moved from `metadata.remarks` into a new `revisions` entry) plus one added back-matter resource (the 5.2.0 version-history link). The `-min.json`, XML and YAML variants in that repo carry identical information and were not copied.

Other machine-readable files in the corpus (not OSCAL, or not SP 800-53): `controls/cprt/cprt_SP_800_53_5_2_0.xlsx`, `cprt_SP_800_53_A_5_2_0.xlsx`, `cprt_SP_800_53_B_5_2_0.xlsx` (NIST CPRT spreadsheet exports of Release 5.2.0 — the current equivalents of the older `sp800-53r5-control-catalog.xlsx` / `sp800-53ar5-assessment-procedures.xlsx` / `sp800-53b-control-baselines.xlsx`, which hold 5.1 content), `core/cprt/cprt_SP800_37_2_0_0.json|.xlsx` (CPRT dataset of the SP 800-37r2 tasks) and `supplementary/oscal/NIST_SP800-171_rev3_catalog.json` (OSCAL SP 800-171r3, 17 families / 130 requirement ids such as `SP_800_171_03.01.01`). `manifest.json` lists every file with hashes.

Upstream quirks worth knowing:

* `catalog.metadata.revisions` stops at the 5.2.0 entry of 2025-08-26; the 2026-05-11 OSCAL 1.2.2 re-issue has no revision entry of its own.
* `catalog.metadata.links[rel="cprt"]` resolves to back-matter resource titled `Cybersecurity and Privacy Reference Tool: *Security and Privacy Controls for Information Systems and Organizations, 5.1.1*` (`https://csrc.nist.gov/projects/cprt/catalog#/cprt/framework/version/SP_800_53_5_1_1/home`) — i.e. it still points at 5.1.1, not 5.2.0.
* The HIGH profile/resolved catalog `metadata.title` reads "Electronic (OSCAL) Version of NIST Special Publication 800-53 Revision 5.1.1 HIGH IMPACT BASELINE" while `metadata.version` is `5.2.0`.

## 2. Catalog top level

```json
{
  "catalog": {
    "uuid": "ea7c7688-79c5-463b-a91b-0650f2d98623",
    "metadata": {
      "title": "Electronic (OSCAL) Version of NIST SP 800-53 Rev 5.2.0 Controls and SP 800-53A Rev 5.2.0 Assessment Procedures",
      "last-modified": "2026-05-11T16:01:09.00000-00:00",
      "version": "5.2.0",
      "oscal-version": "1.2.2",
      "revisions": "[7 entries: 5.1.1, 5.1.1+u1, 5.1.1+u2, 5.1.1+u3, 5.1.1+u4, 5.1.1+u5, 5.2.0]",
      "props": "[keywords]",
      "links": "[alternate, canonical, cprt]",
      "roles": "[...]",
      "parties": "[...]",
      "responsible-parties": "[...]"
    },
    "groups": "[20 control families]",
    "back-matter": {
      "resources": "[201 citation resources]"
    }
  }
}
```

Hierarchy: `catalog.groups[]` (families) → `group.controls[]` (base controls) → `control.controls[]` (control enhancements). Enhancements never contain further `controls` (max depth 2). `groups` carry no `groups` of their own.

## 3. Groups (control families)

```json
{
  "id": "ac",
  "class": "family",
  "title": "Access Control",
  "props": [
    {
      "name": "label",
      "value": "AC"
    }
  ],
  "controls": "[25 base controls]"
}
```

Only `pm` (Program Management) also has a group-level `parts` entry: `{"id": "pm_ovw", "name": "overview", "title": "Program Management Controls", "prose": "…"}`.

Per-family counts (B = base controls, E = enhancements, W = withdrawn; "active" = B+E−W; baseline columns count ids in each profile’s `with-ids`):

| Family | Title | B | E | W(B) | W(E) | Active | LOW | MOD | HIGH | PRIVACY |
|---|---|---|---|---|---|---|---|---|---|---|
| AC | Access Control | 25 | 122 | 2 | 14 | 131 | 11 | 39 | 46 | 2 |
| AT | Awareness and Training | 6 | 11 | 1 | 1 | 15 | 5 | 6 | 6 | 5 |
| AU | Audit and Accountability | 16 | 53 | 1 | 12 | 56 | 10 | 16 | 25 | 4 |
| CA | Assessment, Authorization, and Monitoring | 9 | 23 | 1 | 6 | 25 | 8 | 10 | 14 | 6 |
| CM | Configuration Management | 14 | 52 | 0 | 10 | 56 | 9 | 24 | 32 | 2 |
| CP | Contingency Planning | 13 | 43 | 1 | 6 | 49 | 6 | 23 | 35 | 0 |
| IA | Identification and Authentication | 13 | 61 | 0 | 15 | 59 | 16 | 24 | 26 | 0 |
| IR | Incident Response | 10 | 32 | 1 | 1 | 40 | 7 | 13 | 18 | 10 |
| MA | Maintenance | 7 | 23 | 0 | 2 | 28 | 4 | 9 | 12 | 0 |
| MP | Media Protection | 8 | 22 | 0 | 10 | 20 | 4 | 7 | 10 | 2 |
| PE | Physical and Environmental Protection | 23 | 36 | 1 | 7 | 51 | 10 | 18 | 25 | 1 |
| PL | Planning | 11 | 6 | 3 | 3 | 11 | 6 | 7 | 7 | 6 |
| PM | Program Management | 32 | 5 | 0 | 0 | 37 | 0 | 0 | 0 | 24 |
| PS | Personnel Security | 9 | 9 | 0 | 1 | 17 | 9 | 9 | 10 | 1 |
| PT | Personally Identifiable Information Processing and Transparency | 8 | 13 | 0 | 0 | 21 | 0 | 0 | 0 | 13 |
| RA | Risk Assessment | 10 | 16 | 1 | 3 | 22 | 8 | 10 | 11 | 4 |
| SA | System and Services Acquisition | 24 | 123 | 7 | 32 | 108 | 9 | 17 | 21 | 7 |
| SC | System and Communications Protection | 51 | 111 | 4 | 19 | 139 | 10 | 25 | 30 | 1 |
| SI | System and Information Integrity | 23 | 96 | 1 | 16 | 102 | 6 | 18 | 28 | 8 |
| SR | Supply Chain Risk Management | 12 | 15 | 0 | 0 | 27 | 11 | 12 | 14 | 0 |
| **Total** | 20 families | **324** | **872** | **24** | **158** | **1014** | **149** | **287** | **370** | **96** |

## 4. Controls and enhancements

* **Families:** 20
* **Base controls:** 324 (300 active, 24 withdrawn)
* **Control enhancements:** 872 (714 active, 158 withdrawn)
* **Total controls + enhancements:** 1196 (1014 active, 182 withdrawn)
* Release 5.2.0 additions present: `sa-24` (Design For Cyber Resiliency), `sa-15.13` (Logging Syntax), `si-2.7` (Root Cause Analysis); 5.1.1 additions: `ia-13` + `ia-13.1`–`ia-13.3`. None of these are in any baseline (Release 5.2.0 of SP 800-53B changed no baselines).

### 4.1 Identifiers

| Thing | `id` format | Example |
|---|---|---|
| family (group) | 2-letter lowercase | `ac` |
| base control | `<fam>-<n>` (no zero padding) | `ac-2` |
| enhancement | `<fam>-<n>.<m>` | `ac-2.1` |
| statement / items | `<ctrl>_smt`, `<ctrl>_smt.<a>`, `<ctrl>_smt.<a>.<1>`, `<ctrl>_smt.<a>.<1>.<a>` | `ac-1_smt.a.1.a` |
| guidance | `<ctrl>_gdn` | `ac-2_gdn` |
| assessment objective | `<ctrl>_obj`, `<ctrl>_obj.<a>`, `<ctrl>_obj.<a>-<n>`, `<ctrl>_obj-<n>` | `ac-1_obj.a-1`, `ac-2.1_obj` |
| assessment method | `<ctrl>_asm-examine` / `-interview` / `-test` | `ac-1_asm-examine` |
| ODP parameter (53A style) | `<fam>-<nn>[.<mm>]_odp[.<kk>]` — **zero-padded, unlike control ids** | `ac-01_odp.01`, `ac-02.02_odp.01` |
| legacy 800-53 parameter | `<ctrl>_prm_<k>` | `ac-1_prm_1` |

Human-readable labels live in `props` (see 4.3); the OSCAL `id` is always lowercase and unpadded for controls.

### 4.2 `class` and `title`

`class` is `"SP800-53"` for every base control and `"SP800-53-enhancement"` for every enhancement; `title` is the control name (enhancement titles do not repeat the base title, e.g. `ac-2.1` = "Automated System Account Management").

### 4.3 `props`

| `name` | `class` | count | meaning / example |
|---|---|---|---|
| `label` | `zero-padded` | 1196 | `AC-02`, `AC-02(01)` |
| `label` | — | 1196 | `AC-2`, `AC-2(1)` — label as printed in SP 800-53 |
| `sort-id` | — | 1196 | `ac-02`, `ac-02.01` — lexical sort key |
| `label` | `sp800-53a` | 1195 | `AC-02(01)` — SP 800-53A style (missing only on withdrawn `sa-18.2`) |
| `implementation-level` | — | 1165 | ns `http://csrc.nist.gov/ns/rmf`; `organization` (764) / `system` (401); a control may carry both |
| `contributes-to-assurance` | — | 427 | ns `http://csrc.nist.gov/ns/rmf`; value `true` |
| `status` | — | 182 | `withdrawn` (only value used) |

Example — `ac-2` (keys and props; other members truncated):

```json
{
  "id": "ac-2",
  "class": "SP800-53",
  "title": "Account Management",
  "params": "[10 params]",
  "props": [
    {
      "name": "label",
      "value": "AC-02",
      "class": "zero-padded"
    },
    {
      "name": "label",
      "value": "AC-2"
    },
    {
      "name": "label",
      "value": "AC-02",
      "class": "sp800-53a"
    },
    {
      "name": "sort-id",
      "value": "ac-02"
    },
    {
      "name": "implementation-level",
      "ns": "http://csrc.nist.gov/ns/rmf",
      "value": "organization"
    }
  ],
  "links": [
    {
      "href": "#2956e175-f674-43f4-b1b9-e074ad9fc39c",
      "rel": "reference"
    },
    {
      "href": "#388a3aa2-5d85-4bad-b8a3-77db80d63c4f",
      "rel": "reference"
    },
    {
      "href": "#53df282b-8b3f-483a-bad1-6a8b8ac00114",
      "rel": "reference"
    },
    "... 28 more (truncated)"
  ],
  "parts": [
    "statement (ac-2_smt)",
    "guidance (ac-2_gdn)",
    "assessment-objective (ac-2_obj)",
    "assessment-method (ac-2_asm-examine)",
    "assessment-method (ac-2_asm-interview)",
    "assessment-method (ac-2_asm-test)"
  ],
  "controls": "[13 enhancements: ac-2.1, ac-2.2, ac-2.3, ac-2.4, ac-2.5, …]"
}
```

Example — enhancement `ac-2.1` (statement shown, assessment parts elided):

```json
{
  "id": "ac-2.1",
  "class": "SP800-53-enhancement",
  "title": "Automated System Account Management",
  "params": [
    {
      "id": "ac-02.01_odp",
      "props": [
        {
          "name": "alt-identifier",
          "value": "ac-2.1_prm_1"
        },
        {
          "name": "label",
          "value": "AC-02(01)_ODP",
          "class": "sp800-53a"
        }
      ],
      "label": "automated mechanisms",
      "guidelines": [
        {
          "prose": "automated mechanisms used to support the management of system accounts are defined; "
        }
      ]
    }
  ],
  "props": [
    {
      "name": "label",
      "value": "AC-02(01)",
      "class": "zero-padded"
    },
    {
      "name": "label",
      "value": "AC-2(1)"
    },
    {
      "name": "label",
      "value": "AC-02(01)",
      "class": "sp800-53a"
    },
    {
      "name": "sort-id",
      "value": "ac-02.01"
    },
    {
      "name": "implementation-level",
      "ns": "http://csrc.nist.gov/ns/rmf",
      "value": "organization"
    }
  ],
  "links": [
    {
      "href": "#ac-2",
      "rel": "required"
    }
  ],
  "parts": [
    {
      "id": "ac-2.1_smt",
      "name": "statement",
      "prose": "Support the management of system accounts using {{ insert: param, ac-02.01_odp }}."
    },
    "… guidance, assessment-objective, assessment-method ×3"
  ]
}
```

### 4.4 `params` (organization-defined parameters, ODPs)

1600 params in total: 1458 SP 800-53A-style ODPs (`…_odp…`) and 142 legacy SP 800-53 params (`…_prm_…`). Every `_prm_` param is an **aggregate** (`props[name=aggregates]`, ns `http://csrc.nist.gov/ns/rmf`) listing the ODP ids it bundles; 1124 ODPs carry `props[name=alt-identifier]` pointing back to the legacy `_prm_` id. Keys used on params: `id`, `props`, `label`, `guidelines[].prose`, `select` (133 params). `select.how-many` is `"one-or-more"` on 97 params and absent (= choose exactly one) on 36; no param has `values` or `constraints`. Params are referenced from prose as `{{ insert: param, <param-id> }}`.

```json
[
  {
    "id": "ac-1_prm_1",
    "props": [
      {
        "name": "aggregates",
        "ns": "http://csrc.nist.gov/ns/rmf",
        "value": "ac-01_odp.01"
      },
      {
        "name": "aggregates",
        "ns": "http://csrc.nist.gov/ns/rmf",
        "value": "ac-01_odp.02"
      }
    ],
    "label": "organization-defined personnel or roles"
  },
  {
    "id": "ac-01_odp.01",
    "props": [
      {
        "name": "label",
        "value": "AC-01_ODP[01]",
        "class": "sp800-53a"
      }
    ],
    "label": "personnel or roles",
    "guidelines": [
      {
        "prose": "personnel or roles to whom the access control policy is to be disseminated is/are defined;"
      }
    ]
  },
  {
    "id": "ac-01_odp.03",
    "props": [
      {
        "name": "alt-identifier",
        "value": "ac-1_prm_2"
      },
      {
        "name": "label",
        "value": "AC-01_ODP[03]",
        "class": "sp800-53a"
      }
    ],
    "select": {
      "how-many": "one-or-more",
      "choice": [
        "organization-level",
        "mission/business process-level",
        "system-level"
      ]
    }
  }
]
```

Select-exactly-one (no `how-many`) and `alt-label` examples from `ac-2.2`:

```json
[
  {
    "id": "ac-02.02_odp.01",
    "props": [
      {
        "name": "alt-identifier",
        "value": "ac-2.2_prm_1"
      },
      {
        "name": "label",
        "value": "AC-02(02)_ODP[01]",
        "class": "sp800-53a"
      }
    ],
    "select": {
      "choice": [
        "remove",
        "disable"
      ]
    }
  },
  {
    "id": "ac-02.02_odp.02",
    "props": [
      {
        "name": "alt-identifier",
        "value": "ac-2.2_prm_2"
      },
      {
        "name": "alt-label",
        "value": "time period for each type of account",
        "class": "sp800-53"
      },
      {
        "name": "label",
        "value": "AC-02(02)_ODP[02]",
        "class": "sp800-53a"
      }
    ],
    "label": "time period",
    "guidelines": [
      {
        "prose": "the time period after which to automatically remove or disable temporary or emergency accounts is defined;"
      }
    ]
  }
]
```

### 4.5 `links`

| `rel` | count | target | meaning |
|---|---|---|---|
| `related` | 3512 | `#<control-id>` | "Related Controls" list of the printed control |
| `reference` | 838 | `#<back-matter uuid>` | citation in `back-matter.resources` |
| `required` | 715 | `#<control-id>` | enhancement → its base control (all 714 active enhancements); `sc-42.2` additionally requires `sc-42.1` |
| `incorporated-into` | 166 | `#<control-id>` or `#<statement-item-id>` (e.g. `#ac-2_smt.k`) | withdrawn control merged into another control/item |
| `moved-to` | 34 | `#<control-id>` | withdrawn control relocated |

Withdrawn controls (24 base + 158 enhancements = 182): 146 with incorporated-into, 34 with moved-to, 2 with (none). Withdrawn entries normally have only `id`, `class`, `title`, `props` (incl. `status`) and `links`; the two without links (`cp-10.3`, `sc-19`) instead keep a one-line `statement` explaining why ("Addressed through tailoring." / "Technology-specific; addressed as any other technology or protocol.").

```json
[
  {
    "id": "ac-2.10",
    "class": "SP800-53-enhancement",
    "title": "Shared and Group Account Credential Change",
    "props": [
      {
        "name": "label",
        "value": "AC-02(10)",
        "class": "zero-padded"
      },
      {
        "name": "label",
        "value": "AC-2(10)"
      },
      {
        "name": "label",
        "value": "AC-02(10)",
        "class": "sp800-53a"
      },
      {
        "name": "sort-id",
        "value": "ac-02.10"
      },
      {
        "name": "status",
        "value": "withdrawn"
      }
    ],
    "links": [
      {
        "href": "#ac-2_smt.k",
        "rel": "incorporated-into"
      }
    ]
  },
  {
    "id": "at-3.4",
    "title": "Suspicious Communications and Anomalous System Behavior",
    "links": [
      {
        "href": "#at-2.4",
        "rel": "moved-to"
      }
    ]
  }
]
```

A `reference` link and the back-matter resource it resolves to:

```json
{
  "link (in ac-1)": {
    "href": "#27847491-5ce1-4f6a-a1e4-9e483782f0ef",
    "rel": "reference"
  },
  "back-matter.resources[]": {
    "uuid": "27847491-5ce1-4f6a-a1e4-9e483782f0ef",
    "title": "OMB A-130",
    "citation": {
      "text": "Office of Management and Budget Memorandum Circular A-130, *Managing Information as a Strategic Resource* , July 2016."
    },
    "rlinks": [
      {
        "href": "https://www.whitehouse.gov/sites/whitehouse.gov/files/omb/circulars/A130/a130revised.pdf"
      }
    ]
  }
}
```

### 4.6 `parts`

Top-level part names on controls: `assessment-method` ×2931, `statement` ×1016, `guidance` ×1014, `assessment-objective` ×1014. Assessment methods by `props[name=method]` (ns `http://csrc.nist.gov/ns/rmf`): `EXAMINE` ×1013, `INTERVIEW` ×1012, `TEST` ×906. Every active control/enhancement has exactly one `statement`, `guidance` and `assessment-objective`; 904 have all three assessment methods, 109 have two and 1 has one.

**`statement`** — nested `item` parts, each with a `label` prop (`a.`, `1.`, `(a)`) and `prose` containing ODP insertions:

```json
{
  "id": "ac-1_smt",
  "name": "statement",
  "parts": [
    {
      "id": "ac-1_smt.a",
      "name": "item",
      "props": [
        {
          "name": "label",
          "value": "a."
        }
      ],
      "prose": "Develop, document, and disseminate to {{ insert: param, ac-1_prm_1 }}:",
      "parts": [
        {
          "id": "ac-1_smt.a.1",
          "name": "item",
          "props": [
            {
              "name": "label",
              "value": "1."
            }
          ],
          "prose": "{{ insert: param, ac-01_odp.03 }} access control policy that:",
          "parts": [
            {
              "id": "ac-1_smt.a.1.a",
              "name": "item",
              "props": [
                {
                  "name": "label",
                  "value": "(a)"
                }
              ],
              "prose": "Addresses purpose, scope, roles, responsibilities, management commitment, coordination among organizational entities, and compliance; and"
            },
            {
              "id": "ac-1_smt.a.1.b",
              "name": "item",
              "props": [
                {
                  "name": "label",
                  "value": "(b)"
                }
              ],
              "prose": "Is consistent with applicable laws, executive orders, directives, regulations, policies, standards, and guidelines; and"
            }
          ]
        },
        {
          "id": "ac-1_smt.a.2",
          "name": "item",
          "props": [
            {
              "name": "label",
              "value": "2."
            }
          ],
          "prose": "Procedures to facilitate the implementation of the access control policy and the associated access controls;"
        }
      ]
    },
    {
      "id": "ac-1_smt.b",
      "name": "item",
      "props": [
        {
          "name": "label",
          "value": "b."
        }
      ],
      "prose": "Designate an {{ insert: param, ac-01_odp.04 }} to manage the development, documentation, and dissemination of the access control policy and procedures; and"
    },
    "... 1 more sibling parts"
  ]
}
```

**`guidance`** — the SP 800-53 "Discussion" text; prose uses Markdown-style links to back-matter uuids and to controls (example `pm-5`):

```json
{
  "id": "pm-5_gdn",
  "name": "guidance",
  "prose": "[OMB A-130](#27847491-5ce1-4f6a-a1e4-9e483782f0ef) provides guidance on developing systems inventories and associated reporting requirements. System inventory refers to an organization-wide inventory of systems, not system components as described in [CM-8](#cm-8)."
}
```

**`assessment-objective`** — SP 800-53A determination statements, nested recursively (depth histogram: depth 0: 1014, depth 1: 1401, depth 2: 911, depth 3: 256, depth 4: 133). Each carries a `label` prop with class `sp800-53a` and a `links[rel="assessment-for"]` back to the statement item it assesses:

```json
{
  "id": "ac-1_obj",
  "name": "assessment-objective",
  "props": [
    {
      "name": "label",
      "value": "AC-01",
      "class": "sp800-53a"
    }
  ],
  "links": [
    {
      "href": "#ac-1_smt",
      "rel": "assessment-for"
    }
  ],
  "parts": [
    {
      "id": "ac-1_obj.a",
      "name": "assessment-objective",
      "props": [
        {
          "name": "label",
          "value": "AC-01a.",
          "class": "sp800-53a"
        }
      ],
      "links": [
        {
          "href": "#ac-1_smt.a",
          "rel": "assessment-for"
        }
      ],
      "parts": [
        {
          "id": "ac-1_obj.a-1",
          "name": "assessment-objective",
          "props": [
            {
              "name": "label",
              "value": "AC-01a.[01]",
              "class": "sp800-53a"
            }
          ],
          "prose": "an access control policy is developed and documented;",
          "links": [
            {
              "href": "#ac-1_smt.a",
              "rel": "assessment-for"
            }
          ]
        },
        {
          "id": "ac-1_obj.a-2",
          "name": "assessment-objective",
          "props": [
            {
              "name": "label",
              "value": "AC-01a.[02]",
              "class": "sp800-53a"
            }
          ],
          "prose": "the access control policy is disseminated to {{ insert: param, ac-01_odp.01 }};",
          "links": [
            {
              "href": "#ac-1_smt.a",
              "rel": "assessment-for"
            }
          ]
        },
        "... 3 more sibling parts"
      ]
    },
    {
      "id": "ac-1_obj.b",
      "name": "assessment-objective",
      "props": [
        {
          "name": "label",
          "value": "AC-01b.",
          "class": "sp800-53a"
        }
      ],
      "prose": "the {{ insert: param, ac-01_odp.04 }} is designated to manage the development, documentation, and dissemination of the access control policy and procedures;",
      "links": [
        {
          "href": "#ac-1_smt.b",
          "rel": "assessment-for"
        }
      ]
    },
    "... 1 more sibling parts"
  ]
}
```

**`assessment-method`** — one part per method (EXAMINE / INTERVIEW / TEST) holding a child `assessment-objects` part (potential assessment objects separated by blank lines):

```json
[
  {
    "id": "ac-2_asm-examine",
    "name": "assessment-method",
    "props": [
      {
        "name": "method",
        "ns": "http://csrc.nist.gov/ns/rmf",
        "value": "EXAMINE"
      },
      {
        "name": "label",
        "value": "AC-02-Examine",
        "class": "sp800-53a"
      }
    ],
    "parts": [
      {
        "name": "assessment-objects",
        "prose": "Access control policy\n\npersonnel termination policy and procedure\n\npersonnel transfer policy and procedure\n\nprocedures for addressing account management\n\nsystem …"
      }
    ]
  },
  {
    "id": "ac-2_asm-interview",
    "name": "assessment-method",
    "props": [
      {
        "name": "method",
        "ns": "http://csrc.nist.gov/ns/rmf",
        "value": "INTERVIEW"
      },
      {
        "name": "label",
        "value": "AC-02-Interview",
        "class": "sp800-53a"
      }
    ],
    "parts": [
      {
        "name": "assessment-objects",
        "prose": "Organizational personnel with account management responsibilities\n\nsystem/network administrators\n\norganizational personnel with information security with inform …"
      }
    ]
  },
  {
    "id": "ac-2_asm-test",
    "name": "assessment-method",
    "props": [
      {
        "name": "method",
        "ns": "http://csrc.nist.gov/ns/rmf",
        "value": "TEST"
      },
      {
        "name": "label",
        "value": "AC-02-Test",
        "class": "sp800-53a"
      }
    ],
    "parts": [
      {
        "name": "assessment-objects",
        "prose": "Organizational processes for account management on the system\n\nmechanisms for implementing account management"
      }
    ]
  }
]
```

## 5. Baseline profiles (SP 800-53B)

Each `*-baseline_profile.json` is an OSCAL **profile** that selects controls from the catalog by id. There is exactly one `import`, one `include-controls` entry and one flat `with-ids` array; no `exclude-controls`, no `include-all`, no `modify`/`set-parameters`/`alters`, and `merge` is `{"as-is": true}`. Enhancement ids are listed explicitly (a parent id does not imply its enhancements), so **baseline membership = the `with-ids` set**, using the same ids as the catalog.

```json
{
  "profile": {
    "uuid": "201765f8-6d45-4941-8789-9eef2effd7d0",
    "metadata": {
      "title": "Electronic (OSCAL) Version of NIST Special Publication 800-53 Revision 5.2.0 LOW IMPACT BASELINE",
      "last-modified": "2026-05-11T16:10:16.00000-00:00",
      "version": "5.2.0",
      "oscal-version": "1.2.2",
      "…": "…"
    },
    "imports": [
      {
        "href": "#84cbf061-eb87-4ec1-8112-1f529232e907",
        "include-controls": [
          {
            "with-ids": [
              "ac-1",
              "ac-2",
              "ac-3",
              "ac-7",
              "ac-8",
              "ac-14",
              "ac-17",
              "ac-18",
              "... 141 more (truncated)"
            ]
          }
        ]
      }
    ],
    "merge": {
      "as-is": true
    },
    "back-matter": {
      "resources": [
        {
          "uuid": "84cbf061-eb87-4ec1-8112-1f529232e907",
          "description": "NIST Special Publication 800-53 Revision 5: Security and Privacy Controls for Federal Information Systems and Organizations",
          "rlinks": [
            {
              "href": "../../../../nist.gov/SP800-53/rev5/xml/NIST_SP-800-53_rev5_catalog.xml",
              "media-type": "application/oscal.catalog+xml"
            },
            {
              "href": "../../../../nist.gov/SP800-53/rev5/json/NIST_SP-800-53_rev5_catalog.json",
              "media-type": "application/oscal.catalog+json"
            },
            {
              "href": "../../../../nist.gov/SP800-53/rev5/yaml/NIST_SP-800-53_rev5_catalog.yaml",
              "media-type": "application/oscal.catalog+yaml"
            }
          ]
        }
      ]
    }
  }
}
```

`imports[0].href` is a fragment (`#<uuid>`) resolving to the profile’s own `back-matter` resource, whose `rlinks` give the catalog location **relative to the upstream repository layout**. In this corpus the catalog is simply the sibling file `oscal/NIST_SP-800-53_rev5_catalog.json` — map any `*/NIST_SP-800-53_rev5_catalog.json` rlink to it.

| Baseline | ids in `with-ids` | base controls | enhancements | families |
|---|---|---|---|---|
| LOW | 149 | 131 | 18 | 18 |
| MODERATE | 287 | 177 | 110 | 18 |
| HIGH | 370 | 188 | 182 | 18 |
| PRIVACY | 96 | 75 | 21 | 16 |

* LOW ⊂ MODERATE ⊂ HIGH: True (strict nesting). PRIVACY is independent: 43 of its 96 ids are also in HIGH; SP 800-53B intends it to be applied in addition to a security baseline.
* No baseline lists a withdrawn control; every id resolves in the catalog.
* Union of all four baselines: 423 ids; 591 active controls/enhancements are in no baseline.
* Cross-check: the four sets are identical to the "x" marks in `controls/sp800-53b-control-baselines.xlsx`.

Computing membership:

```python
import json
def baseline_ids(path):
    prof = json.load(open(path))["profile"]
    return {cid for imp in prof["imports"]
                for inc in imp.get("include-controls", [])
                for cid in inc.get("with-ids", [])}
low = baseline_ids("oscal/NIST_SP-800-53_rev5_LOW-baseline_profile.json")      # 149 ids
# per control: {b for b in ("LOW","MODERATE","HIGH","PRIVACY") if cid in ids[b]}
```

## 6. Resolved-profile catalogs

`*-baseline-resolved-profile_catalog.json` are OSCAL **catalogs** (same schema as §2–4) produced by running the profile against the catalog (`metadata.props[name=resolution-tool]` = "OSCAL Profile Resolver XSLT Pipeline OPRXP"; `metadata.links[rel=source-profile]`). They contain only the selected controls with full params/props/parts/links.

| Baseline | controls+enhancements | groups | same id set as profile | enhancements placed directly under a group |
|---|---|---|---|---|
| LOW | 149 | 18 | True | 0 |
| MODERATE | 287 | 18 | True | 0 |
| HIGH | 370 | 18 | True | 0 |
| PRIVACY | 96 | 16 | True | 6 (`ac-3.14`, `au-3.3`, `pe-8.3`, `pm-5.1`, `sa-8.33`, `sc-7.24`) |

When a baseline includes an enhancement but not its base control (only in PRIVACY), the resolver places the enhancement as a top-level control of its family group — so walk `controls` recursively and do not assume `id` with a dot is always nested. `related` links inside resolved catalogs may point to controls that are not part of that baseline.

## 7. Counting recipe

```python
import json
cat = json.load(open("oscal/NIST_SP-800-53_rev5_catalog.json"))["catalog"]
def withdrawn(c): return any(p["name"] == "status" and p["value"] == "withdrawn" for p in c.get("props", []))
base = [c for g in cat["groups"] for c in g["controls"]]
enh  = [e for c in base for e in c.get("controls", [])]
print(len(cat["groups"]), len(base), len(enh), sum(map(withdrawn, base + enh)))   # 20 324 872 182
```

## 8. RMF tasks (`rmf-tasks.json`, from SP 800-37 Rev. 2, Chapter 3)

`rmf-tasks.json` is a JSON array of the 47 RMF tasks. Extraction: text and font metadata were read from `core/NIST.SP.800-37r2.pdf` with PyMuPDF; superscript footnote markers, footnotes, running headers/footers and the DOI side-bar were dropped by font size/flags; each Chapter 3 task block was split on its bold labels (`TASK`, `Potential Inputs:`, `Expected Outputs:`, `Primary Responsibility:`, `Supporting Roles:` [written `Supporting Role:` for P-12 and P-18], `System Development Life Cycle Phase:`, `Discussion:`, `References:`). Outcomes (and the Cybersecurity Framework constructs in brackets) come from the step summary Tables 1–8 at the start of each Chapter 3 section; title-case task names come from Appendix E (Tables E-1…E-8) and match the Chapter 3 upper-case headings.

Record fields:

| Field | Content |
|---|---|
| `step` | `prepare` `categorize` `select` `implement` `assess` `authorize` `monitor` |
| `level` | `organization` for P-1…P-7 (Table 1 "Prepare Tasks—Organization Level"), `system` for P-8…P-18 (Table 2). SP 800-37r2 splits only the Prepare step by level; the Categorize…Monitor tasks are executed per system (or set of common controls) and are recorded as `system`. |
| `id`, `title` | e.g. `P-1`, "Risk Management Roles" (Appendix E wording) |
| `task` | the TASK statement |
| `outcome` | all outcomes for the task joined into one string; `outcomes[]` keeps each outcome with its `cybersecurityFramework` constructs (e.g. `ID.AM-6`, `Profile`, `Implementation Tiers`) |
| `potentialInputs`, `expectedOutputs`, `primaryResponsibility`, `supportingRoles` | the semicolon-separated source lists split into arrays (splitting ignores semicolons inside brackets/parentheses; the closing period is removed) — source capitalisation kept |
| `sdlcPhase` | `{"new": …, "existing": …}` from "System Development Life Cycle Phase"; `null` for the 7 organization-level tasks, which have none |
| `discussionExcerpt` | first two sentences of the Discussion |
| `references` | the References line verbatim |
| `source` | section (3.1–3.7), PDF page and printed page of the task block |

Verification: every field was compared with NIST’s own structured rendering of SP 800-37r2 in the Cybersecurity and Privacy Reference Tool (`core/cprt/cprt_SP800_37_2_0_0.json`, export of CPRT dataset `SP800_37_2_0_0`). All 47 task statements, 59 outcomes, inputs, outputs, role lists, SDLC phases and discussion texts agree, except where the CPRT copy itself deviates from the PDF: CPRT’s R-5 record repeats R-4’s content (task, inputs, outputs, roles, discussion); C-2 outcome 1 reads "organizationidentified" (PDF: "organization-identified"); P-4 discussion cites "[SP 800160 v1]" (PDF: "[SP 800-160 v1]"); A-3 discussion keeps footnote marker "deficiencies90"; P-6 output reads "subcategories" (PDF: "sub-categories"); CPRT omits the non-Core constructs "Profile"/"Implementation Tiers" from its CSF links. `rmf-tasks.json` follows the PDF, including its own typos (e.g. P-6 discussion "see Task C1", S-3 "i.e,").

| Step | Level | ID | Title | Primary responsibility |
|---|---|---|---|---|
| prepare | organization | P-1 | Risk Management Roles | Head of Agency; Chief Information Officer; Senior Agency Official for Privacy |
| prepare | organization | P-2 | Risk Management Strategy | Head of Agency |
| prepare | organization | P-3 | Risk Assessment—Organization | Senior Accountable Official for Risk Management or Risk Executive (Function); Senior Agency Information Security Officer; Senior Agency Official for Privacy |
| prepare | organization | P-4 | Organizationally-Tailored Control Baselines and Cybersecurity Framework Profiles (Optional) | Mission or Business Owner; Senior Accountable Official for Risk Management or Risk Executive (Function) |
| prepare | organization | P-5 | Common Control Identification | Senior Agency Information Security Officer; Senior Agency Official for Privacy |
| prepare | organization | P-6 | Impact-Level Prioritization (Optional) | Senior Accountable Official for Risk Management or Risk Executive (Function) |
| prepare | organization | P-7 | Continuous Monitoring Strategy—Organization | Senior Accountable Official for Risk Management or Risk Executive (Function) |
| prepare | system | P-8 | Mission or Business Focus | Mission or Business Owner |
| prepare | system | P-9 | System Stakeholders | Mission or Business Owner; System Owner |
| prepare | system | P-10 | Asset Identification | System Owner |
| prepare | system | P-11 | Authorization Boundary | Authorizing Official |
| prepare | system | P-12 | Information Types | System Owner; Information Owner or Steward |
| prepare | system | P-13 | Information Life Cycle | Senior Agency Official for Privacy; System Owner; Information Owner or Steward |
| prepare | system | P-14 | Risk Assessment—System | System Owner; System Security Officer; System Privacy Officer |
| prepare | system | P-15 | Requirements Definition | Mission or Business Owner; System Owner; Information Owner or Steward; System Privacy Officer |
| prepare | system | P-16 | Enterprise Architecture | Mission or Business Owner; Enterprise Architect; Security Architect; Privacy Architect |
| prepare | system | P-17 | Requirements Allocation | Security Architect; Privacy Architect; System Security Officer; System Privacy Officer |
| prepare | system | P-18 | System Registration | System Owner |
| categorize | system | C-1 | System Description | System Owner |
| categorize | system | C-2 | Security Categorization | System Owner; Information Owner or Steward |
| categorize | system | C-3 | Security Categorization Review and Approval | Authorizing Official or Authorizing Official Designated Representative; Senior Agency Official for Privacy |
| select | system | S-1 | Control Selection | System Owner; Common Control Provider |
| select | system | S-2 | Control Tailoring | System Owner; Common Control Provider |
| select | system | S-3 | Control Allocation | Security Architect; Privacy Architect; System Security Officer; System Privacy Officer |
| select | system | S-4 | Documentation of Planned Control Implementations | System Owner; Common Control Provider |
| select | system | S-5 | Continuous Monitoring Strategy—System | System Owner; Common Control Provider |
| select | system | S-6 | Plan Review and Approval | Authorizing Official or Authorizing Official Designated Representative |
| implement | system | I-1 | Control Implementation | System Owner; Common Control Provider |
| implement | system | I-2 | Update Control Implementation Information | System Owner; Common Control Provider |
| assess | system | A-1 | Assessor Selection | Authorizing Official or Authorizing Official Designated Representative |
| assess | system | A-2 | Assessment Plan | Authorizing Official or Authorizing Official Designated Representative; Control Assessor |
| assess | system | A-3 | Control Assessments | Control Assessor |
| assess | system | A-4 | Assessment Reports | Control Assessor |
| assess | system | A-5 | Remediation Actions | System Owner; Common Control Provider; Control Assessor |
| assess | system | A-6 | Plan of Action and Milestones | System Owner; Common Control Provider |
| authorize | system | R-1 | Authorization Package | System Owner; Common Control Provider; Senior Agency Official for Privacy |
| authorize | system | R-2 | Risk Analysis and Determination | Authorizing Official or Authorizing Official Designated Representative |
| authorize | system | R-3 | Risk Response | Authorizing Official or Authorizing Official Designated Representative |
| authorize | system | R-4 | Authorization Decision | Authorizing Official |
| authorize | system | R-5 | Authorization Reporting | Authorizing Official or Authorizing Official Designated Representative |
| monitor | system | M-1 | System and Environment Changes | System Owner or Common Control Provider; Senior Agency Information Security Officer; Senior Agency Official for Privacy |
| monitor | system | M-2 | Ongoing Assessments | Control Assessor |
| monitor | system | M-3 | Ongoing Risk Response | Authorizing Official; System Owner; Common Control Provider |
| monitor | system | M-4 | Authorization Package Updates | System Owner; Common Control Provider |
| monitor | system | M-5 | Security and Privacy Reporting | System Owner; Common Control Provider; Senior Agency Information Security Officer; Senior Agency Official for Privacy |
| monitor | system | M-6 | Ongoing Authorization | Authorizing Official |
| monitor | system | M-7 | System Disposal | System Owner |

