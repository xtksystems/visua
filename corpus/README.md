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
| [`aicpa-soc2/`](aicpa-soc2/) | 33 — 2017 Trust Services Criteria (points of focus revised 2022), DC 200, AICPA mapping workbooks, SOC 2 guides, COSO summaries | 2026-09-26 | **© AICPA / COSO — all rights reserved** | Manifest and notes only |

## Commands

```sh
pnpm corpus:verify                               # SHA-256 check of every local file against its manifest
pnpm corpus:sync                                 # download missing public-domain documents from the official URLs
pnpm corpus:sync aicpa-soc2 --include-restricted # AICPA documents, for this installation's own use (read below first)
pnpm ingest                                      # rebuild packages/frameworks/data from the local corpus
```

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

Checked on 2026-09-26: CSF 2.0 (Feb 2024) is current; SP 800-53 is at Release 5.2.0
(the ingest uses the 5.2.0 OSCAL catalog, with page citations to the 2020 PDF where a
control exists there); SP 800-37 Rev. 2 is current; the 2017 TSC with points of focus
revised in 2022 is current. AICPA's Assurance Services Executive Committee has said a
revised TSC exposure draft is expected in late 2026. Re-check before relying on this
corpus after that.
