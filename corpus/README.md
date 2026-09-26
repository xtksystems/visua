# Official documentation corpus

Visua grounds every requirement, citation and agent answer in **local copies of the
official publications**. Each corpus folder has a `manifest.json` with one record per
document: title, identifier, version, publication date, role, official URL, landing page,
byte size, SHA-256 and the verbatim license notice. `STRUCTURE.md` in each folder
explains how the files are organized and how they were ingested.

| Corpus | Documents | Retrieved | License | In git |
|---|---|---|---|---|
| [`nist-csf-2.0/`](nist-csf-2.0/) | 47 — CSWP 29, the CSF 2.0 Reference Tool data, Implementation Examples, Quick-Start Guides, Community Profiles, OLIR crosswalks | 2026-09-26 | Public domain (U.S. Government work, 17 U.S.C. §105) | Yes |
| [`nist-rmf/`](nist-rmf/) | 66 — SP 800-37r2 (RMF), SP 800-53 Rev. 5 / 5.2.0 (+ OSCAL catalog and 800-53B baselines), SP 800-53A, FIPS 199/200, SP 800-60, Quick-Start Guides | 2026-09-26 | Public domain (one third-party workbook is kept in `.local/`, not in git) | Yes |
| [`nist-ai-rmf/`](nist-ai-rmf/) | 45 — NIST AI 100-1 (AI RMF 1.0), the AI RMF Playbook (PDF, JSON, CSV, XLSX), NIST AI 600-1 (Generative AI Profile), CPRT exports, NIST crosswalks, AI 100-2/100-4, SP 1270, NISTIR 8312, SP 800-218A, and drafts (Cyber AI Profile IR 8596, COSAiS, AI 800-1) | 2026-09-26 | Public domain (15 third-party files — non-NIST crosswalks, glossary exports, translations — are kept in `.local/`, not in git) | Yes |
| [`aicpa-soc2/`](aicpa-soc2/) | 33 — 2017 Trust Services Criteria (points of focus revised 2022), DC 200, AICPA mapping workbooks, SOC 2 guides, COSO summaries | 2026-09-26 | **© AICPA / COSO — all rights reserved** | Manifest and notes only |
| [`us-state-ai-laws/`](us-state-ai-laws/) | 58 — enrolled bills, codified statutes and adopted regulations of 26 AI laws in California, Colorado, Illinois, Maine, New York, New York City, Texas and Utah, with `obligations.json` (187 obligations quoted with section and page) | 2026-09-26 | Public legislative and regulatory records (each site's notice quoted in the manifest); 5 files whose sites claim copyright (Colorado AG proposed rules, NYC City Record and DCWP FAQ, Maine's codified section) are kept in `.local/`, not in git | Yes |
| [`ai-threats/`](ai-threats/) | 28 — MITRE ATLAS 2026.09 (release YAML, STIX bundle, license), the OWASP Top 10 for LLM Applications 2026 and 2025 and for Agentic Applications 2026, the OWASP GenAI Security Crosswalk, with structured extractions and `mappings.json` (1,292 published links, each with its authority and status) | 2026-09-26 | MITRE ATLAS: Apache-2.0 · OWASP: CC BY-SA 4.0 (files derived from OWASP text stay CC BY-SA) · NIST: public domain · MITRE SAFE-AI (all rights reserved) is kept in `.local/`, not in git | Yes |

## Commands

```sh
pnpm corpus:verify                               # SHA-256 check of every local file against its manifest
pnpm corpus:sync                                 # download missing public-domain documents from the official URLs
pnpm corpus:sync aicpa-soc2 --include-restricted # AICPA documents, for this installation's own use (read below first)
pnpm ingest                                      # rebuild packages/frameworks/data from the local corpus
```

## NIST AI RMF extractions

`nist-ai-rmf/ai-rmf-core.json`, `ai-rmf-playbook.json` and `genai-profile.json` are
extracted from the NIST publications by the scripts in `nist-ai-rmf/tools/`, which
re-create the JSON byte for byte. Statement text comes from the AI 100-1 PDF (with
physical and printed page numbers), because NIST's own machine-readable copies (CPRT,
Playbook JSON) differ from the final text in dozens of statements; see
`nist-ai-rmf/STRUCTURE.md`. The scripts are development-time tools that need Python with
PyMuPDF (AGPL-3.0) and openpyxl (MIT); Visua itself does not depend on them.

## U.S. state AI laws

`us-state-ai-laws/obligations.json` is built from the downloaded statutes and
regulations by `us-state-ai-laws/tools/build.py`, which re-creates it byte for byte; every
quotation is re-found on its cited page by `tools/verify_corpus.py`. Titles, role
labels and suggested evidence are Visua summaries. Laws change quickly: `STRUCTURE.md`
records each law's status on the retrieval date and the bills still pending then.
Nothing in the corpus or in Visua is legal advice.

## AI threat catalogs

`ai-threats/atlas.json`, `owasp-llm-top10.json`, `owasp-agentic-top10.json` and
`nist-ai-100-2.json` are extracted by the scripts in `ai-threats/tools/`, which
reproduce them byte for byte. `mappings.json` keeps only links that someone published,
each labeled with its publisher and status: *final* (MITRE ATLAS, the OWASP
appendices, NIST AI 100-2), *draft* (NIST IR 8596 and the COSAiS outline), *unreviewed*
(OWASP's community crosswalk) or *superseded* (the OWASP 2025 edition). No publisher
maps ATLAS to CSF 2.0, SP 800-53 or the AI RMF, or the OWASP Top 10s to CSF 2.0 or
SP 800-53, in a final document.

- **MITRE ATLAS** is © The MITRE Corporation under the Apache License 2.0: the license
  ships in `ai-threats/mitre-atlas/LICENSE` and every derived file keeps the copyright
  line and a change notice.
- **OWASP** material is CC BY-SA 4.0: attribution and the list of changes are in each
  extraction, and the files derived from OWASP text (`packages/frameworks/data/owasp-*.json`,
  the OWASP threat-mapping sets and `chunks/ai-threats.json`) are licensed CC BY-SA 4.0
  too (see `packages/frameworks/data/NOTICE.md`).
- **MITRE SAFE-AI** is all rights reserved and not redistributable; its report and
  extraction stay in `ai-threats/mitre-safe-ai/.local/`.
- The OWASP site serves its PDFs only to browsers, so `pnpm corpus:sync` cannot
  re-download them; the committed copies are hash-checked.

## AICPA content (SOC 2)

The Trust Services Criteria, points of focus, DC 200 description criteria and AICPA
mapping workbooks are © AICPA. AICPA grants no reuse permission for them. Its website
terms allow download for **personal, non-commercial use** only and state that AICPA
*"specifically object[s] … to inclusion of content from this website in the knowledge
base of Large Language Models (LLMs) and similar AI platforms."* The COSO material is
© COSO, which does not allow reproduction without written permission.

Visua therefore:

1. **Does not redistribute AICPA content.** Only `manifest.json` (metadata and license
   notices) and `STRUCTURE.md` from `aicpa-soc2/` are committed. The documents, the
   structured extractions (`tsc-2017-rev2022.json`, `dc200-description-criteria.json`)
   and everything derived from them (`packages/frameworks/data/aicpa-*.json`,
   `mappings/*tsc-2017*.json`, `chunks/aicpa-soc2.json`) are git-ignored.
2. **Works without it.** A fresh clone runs SOC 2 on Visua's own skeleton
   (`packages/frameworks/src/ingest/tsc-skeleton.ts`): the criterion identifiers,
   series, categories and COSO principle numbers, with short titles and plain-language
   summaries written by Visua. SOC 2 scoping, readiness, planning, evidence, the PBC
   list and the DC 200 checklist all work on it.
3. **Overlays the official text when you hold a local copy.** When
   `aicpa-soc2/tsc-2017-rev2022.json` and `dc200-description-criteria.json` are present,
   ingestion shows the verbatim criteria, all 330 points of focus with their page
   citations, and builds the AICPA mappings (TSC → SP 800-53 Rev. 5: 1,033 control
   links; TSC → CSF v1.1, carried to CSF 2.0 through NIST's OLIR crosswalk: 157
   links). The UI labels this text "© AICPA — local copy".
4. **Keeps AICPA text away from language models by default.** When agents run on
   Claude, AICPA text and AICPA corpus passages are replaced in tool results with
   Visua's summary and a notice. Operators whose organization holds AICPA's written
   permission can set `VISUA_AICPA_AI_USE=permitted`. Offline playbooks run locally and
   are unaffected.

Commercial use, redistribution, or sending AICPA text to an AI service requires written
permission from AICPA (copyright-permissions@aicpa-cima.com). Visua shows the
provenance of every file in **Reports → Official documentation corpus**.

### Provenance of the AICPA files

AICPA's current downloads are behind a free login. The local copies were obtained
without logging in, from AICPA's own asset CDN (publicly indexed URLs; nine files match
the sizes AICPA lists), from byte-exact Internet Archive captures of files AICPA once
published openly (checksums verified against the archive), and directly from coso.org
and NIST. See `aicpa-soc2/STRUCTURE.md` for per-file details and what could not be
obtained (the paid SOC 2 Guide, member-only illustrative reports).

The structured TSC extraction was produced with a PDF text-layer parser and verified
against AICPA's own TSC → SP 800-53 workbook (all 61 criterion texts match). The
extraction tooling is not yet part of this repository. Until it is, installations
without the JSON run on the skeleton (see the roadmap in `docs/roadmap.md`).

## Currency

Checked on 2026-09-26: AI RMF 1.0 (January 2023) is the only final version; NIST says a
revision is in progress under the 2025 AI Action Plan, but no draft has been published.
NIST AI 600-1 (July 2024) is final. CSF 2.0 (Feb 2024) is current; SP 800-53 is at Release 5.2.0
(the ingest uses the 5.2.0 OSCAL catalog, with page citations to the 2020 PDF where a
control exists there); SP 800-37 Rev. 2 is current; the 2017 TSC with points of focus
revised in 2022 is current. AICPA's Assurance Services Executive Committee has said a
revised TSC exposure draft is expected in late 2026. Re-check before relying on this
corpus after that.
