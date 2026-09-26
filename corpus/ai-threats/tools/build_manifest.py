#!/usr/bin/env python3
"""Write manifest.json for corpus/ai-threats from the document table below.

sha256 and bytes are computed from the files on disk, so re-running after a re-download refreshes them.
Documents under a .local/ folder are git-ignored; if one is absent, its last recorded sha256/bytes are kept.
Usage (from anywhere):  python3 tools/build_manifest.py
"""
import json
from collections import OrderedDict

from common import ROOT, RETRIEVED, sha256

MITRE = "The MITRE Corporation"
OWASP = "OWASP GenAI Security Project (OWASP Foundation)"
PDF = "application/pdf"
JSONT = "application/json"
YAML = "application/yaml"
MD = "text/markdown"
TXT = "text/plain"
ATLAS_SHA = "3259f388d19cbcca11bacf12a0ef97f4198f711b"
CW_SHA = "922350d5d6a251914001f73b721ed0fa7b58d752"
ATLAS_REL = "https://github.com/mitre-atlas/atlas-data/releases/tag/v2026.09"
CW_LANDING = "https://genai.owasp.org/resource/genai-security-industry-framework-crosswalk/"

APACHE = ("Apache License 2.0 — LICENSE file of mitre-atlas/atlas-data, verbatim: 'Copyright 2021-2026 MITRE  Licensed under "
          "the Apache License, Version 2.0 (the \"License\"); you may not use this file except in compliance with the License. You "
          "may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0  Unless required by applicable law or "
          "agreed to in writing, software distributed under the License is distributed on an \"AS IS\" BASIS, WITHOUT WARRANTIES OR "
          "CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions "
          "and limitations under the License.' The repository README adds the release statement '©2021-2026 The MITRE "
          "Corporation. ALL RIGHTS RESERVED. Approved for Public Release; Distribution Unlimited. Public Release Case Numbers "
          "21-2363, 26-1162.' There is no NOTICE file.")
OWASP_PDF_LICENSE = ("CC BY-SA 4.0 — 'This document is licensed under Creative Commons, CC BY-SA 4.0.' (License and Usage page). "
                     "Attribution — 'You must give appropriate credit, provide a link to the license, and indicate if changes were "
                     "made.' ShareAlike — 'If you remix, transform, or build upon the material, you must distribute your "
                     "contributions under the same license as the original.' Full text: https://creativecommons.org/licenses/by-sa/4.0/legalcode")
CW_LICENSE = ("CC BY-SA 4.0 — LICENSE.md of GenAI-Security-Project/crosswalk: 'Creative Commons Attribution-ShareAlike 4.0 "
              "International (CC BY-SA 4.0) Copyright (c) 2026 OWASP GenAI Data Security Initiative'. File headers: 'License : CC BY-SA 4.0'.")
OWASP_DL_NOTE = ("genai.owasp.org serves the file only to browser-like User-Agents (a plain curl/fetch request is redirected to a "
                 "'You do not have permission to access this download' page), so 'pnpm corpus:sync' cannot re-fetch it; download "
                 "it in a browser from the landing page.")


def cw(rel, title, role, notes, media=MD):
    return dict(id="owasp-genai-crosswalk-" + (rel.split("/")[-1].rsplit(".", 1)[0].lower().replace("_", "-")),
                title=f"OWASP GenAI Security Crosswalk — {title}", identifier=f"GenAI-Security-Project/crosswalk {rel}",
                publisher="OWASP GenAI Security Project — GenAI Data Security Initiative",
                version=f"Crosswalk v4.0.0 (2026-08-28) + main at commit {CW_SHA[:7]} (2026-09-18)", published="2026-09-18",
                role=role, mediaType=media, path=f"owasp-genai-crosswalk/{rel}",
                url=f"https://raw.githubusercontent.com/GenAI-Security-Project/crosswalk/{CW_SHA}/{rel}",
                landingPage=CW_LANDING, license=CW_LICENSE, notes=notes)


CW_MAP_NOTE = ("OWASP-published crosswalk mapping file (source of rows with authority 'owasp-genai-crosswalk' in mappings.json). "
               "Rows carry confidence 'unreviewed' under the crosswalk's own schema v2; see STRUCTURE.md §6.4 for the checks.")

DOCS = [
    # ------------------------------------------------------------------ MITRE ATLAS
    dict(id="mitre-atlas-2026-09-yaml", title="MITRE ATLAS data, content release 2026.09 (format 6.0.0)",
         identifier="ATLAS-2026.09.yaml (atlas-data release v2026.09)", publisher=MITRE,
         version="Content 2026.09, format-version 6.0.0; collection modified-date 2026-09-15", published="2026-09-15",
         role="catalog", mediaType=YAML, path="mitre-atlas/ATLAS-2026.09.yaml",
         url="https://github.com/mitre-atlas/atlas-data/releases/download/v2026.09/ATLAS-2026.09.yaml",
         landingPage=ATLAS_REL, license=APACHE,
         notes=("CURRENT as of 2026-09-26: GitHub release v2026.09 published 2026-09-15 15:03 UTC (tag commit "
                f"{ATLAS_SHA}); dist/manifest.yaml lists release 2026.09 with release-date 2026-09-15; CHANGELOG: 'This version of "
                "ATLAS data contains 1 matrix, 16 tactics, 120 techniques, 88 sub-techniques, 40 mitigations, and 73 case studies.' "
                "Byte-identical to dist/v6/ATLAS-2026.09.yaml at the tag commit. ATLAS now releases monthly (content YYYY.MM, "
                "format semver); dist/ATLAS.yaml is deprecated ('no longer being updated', frozen at legacy format 5.6.0) and was not "
                "downloaded; dist/ATLAS-latest.yaml is a symlink to v6/ATLAS-latest.yaml. Source of atlas.json.")),
    dict(id="mitre-atlas-2026-09-dist-manifest", title="MITRE ATLAS distribution manifest (dist/manifest.yaml)",
         identifier="atlas-data dist/manifest.yaml", publisher=MITRE, version="As of tag v2026.09", published="2026-09-15",
         role="machine-readable", mediaType=YAML, path="mitre-atlas/manifest.yaml",
         url=f"https://raw.githubusercontent.com/mitre-atlas/atlas-data/{ATLAS_SHA}/dist/manifest.yaml",
         landingPage=ATLAS_REL, license=APACHE,
         notes="Lists every content release (2021 onwards) with release-date and the file implementing each format-version; used for the release date."),
    dict(id="mitre-atlas-2026-09-stix", title="MITRE ATLAS 2026.09 as a STIX 2.1 bundle (stix-atlas.json)",
         identifier="stix-atlas.json (atlas-data release v2026.09 asset)", publisher=MITRE,
         version="Content 2026.09", published="2026-09-15", role="machine-readable", mediaType=JSONT,
         path="mitre-atlas/stix-atlas.json",
         url="https://github.com/mitre-atlas/atlas-data/releases/download/v2026.09/stix-atlas.json",
         landingPage=ATLAS_REL, license=APACHE,
         notes=("Generated by the release workflow (tools/atlas_to_stix.py). 16 x-mitre-tactic, 208 attack-pattern, 40 "
                "course-of-action, 73 campaign, 1,114 relationships (665 uses, 361 mitigates, 88 subtechnique-of); its 361 "
                "mitigates pairs equal the YAML's (tools/reports/atlas-verification.json). Other release assets not kept: "
                "stix-atlas-realized.json (realized techniques only), stix-atlas-attack-enterprise.json and "
                "stix-atlas-realized-attack-enterprise.json (~40 MB each, bundled with ATT&CK Enterprise), 6 Excel workbooks, "
                "75 ATT&CK Navigator layers.")),
    dict(id="mitre-atlas-license", title="MITRE ATLAS data LICENSE", identifier="atlas-data LICENSE", publisher=MITRE,
         version="As of tag v2026.09", published="2026-09-15", role="license", mediaType=TXT, path="mitre-atlas/LICENSE",
         url=f"https://raw.githubusercontent.com/mitre-atlas/atlas-data/{ATLAS_SHA}/LICENSE",
         landingPage="https://github.com/mitre-atlas/atlas-data", license=APACHE,
         notes="Apache-2.0 notice; must accompany every redistribution of ATLAS data or of atlas.json. Full license text: licenses/Apache-2.0.txt."),
    dict(id="mitre-atlas-readme", title="MITRE ATLAS data README (versioning, format, release statement)",
         identifier="atlas-data README.md", publisher=MITRE, version="As of tag v2026.09", published="2026-09-15",
         role="supplementary", mediaType=MD, path="mitre-atlas/README.md",
         url=f"https://raw.githubusercontent.com/mitre-atlas/atlas-data/{ATLAS_SHA}/README.md",
         landingPage="https://github.com/mitre-atlas/atlas-data", license=APACHE,
         notes="Kept for the release statement (the repository has no NOTICE file) and the format/versioning description."),
    dict(id="mitre-atlas-changelog", title="MITRE ATLAS data CHANGELOG", identifier="atlas-data CHANGELOG.md", publisher=MITRE,
         version="As of tag v2026.09 (top entry 2026.09, dated 2026-09-14)", published="2026-09-15", role="supplementary",
         mediaType=MD, path="mitre-atlas/CHANGELOG.md",
         url=f"https://raw.githubusercontent.com/mitre-atlas/atlas-data/{ATLAS_SHA}/CHANGELOG.md",
         landingPage="https://github.com/mitre-atlas/atlas-data", license=APACHE,
         notes="Per-release object counts and added/updated/renamed objects (e.g. 2026.08 renamed AML.TA0001 'AI Attack Staging' to 'AI Attack Adaptation')."),
    # ------------------------------------------------------------------ license texts
    dict(id="apache-license-2-0-text", title="Apache License, Version 2.0 (full text)", identifier="Apache-2.0",
         publisher="The Apache Software Foundation", version="Version 2.0, January 2004", published="2004-01-01",
         role="license", mediaType=TXT, path="licenses/Apache-2.0.txt",
         url="https://www.apache.org/licenses/LICENSE-2.0.txt", landingPage="https://www.apache.org/licenses/LICENSE-2.0",
         license="License text of the Apache License 2.0, reproduced unmodified; §4(a) requires giving recipients of the Work or Derivative Works a copy of this License.",
         notes="Accompanies mitre-atlas/ (the repository LICENSE file is only the short notice) and atlas.json / mappings.json rows derived from ATLAS."),
    dict(id="cc-by-sa-4-0-legalcode", title="Creative Commons Attribution-ShareAlike 4.0 International — legal code (plain text)",
         identifier="CC BY-SA 4.0", publisher="Creative Commons", version="4.0", published="2013-11-25", role="license",
         mediaType=TXT, path="licenses/CC-BY-SA-4.0-legalcode.txt",
         url="https://creativecommons.org/licenses/by-sa/4.0/legalcode.txt",
         landingPage="https://creativecommons.org/licenses/by-sa/4.0/",
         license="'The text of the Creative Commons public licenses is dedicated to the public domain under the CC0 Public Domain Dedication.' (legal code footer)",
         notes="License of the OWASP documents, of owasp-llm-top10.json / owasp-agentic-top10.json and of the OWASP-derived texts in mappings.json."),
    # ------------------------------------------------------------------ OWASP LLM Top 10
    dict(id="owasp-llm-top10-2026-pdf", title="OWASP Top 10 for LLM Applications 2026", identifier="OWASP GenAI LLM Top 10 2026 v1.0",
         publisher=OWASP, version="Version 2026 (v1.0)", published="2026-08-03", role="catalog", mediaType=PDF,
         path="owasp-llm-top10/OWASP-GenAI-LLM-Top-10-2026-v1.0.pdf", url="https://genai.owasp.org/download/56857/",
         landingPage="https://genai.owasp.org/resource/owasp-genai-llm-top-10-2026/", license=OWASP_PDF_LICENSE,
         notes=("CURRENT edition (supersedes 2025). Resource page dated August 3, 2026 ('OWASP GenAI LLM Top 10 2026'); cover reads "
                "'Version 2026 [Publication date to be set] August 4th, 2026' and the revision history still says '[2026 release "
                "date] Version 2026 Release' (placeholders left in v1.0); PDF CreationDate 2026-08-01, ModDate 2026-08-03. Served as "
                "'OWASP-GenAI-LLM-Top-10-2026-v1.0.pdf'. 122 pages; entries LLM01:2026-LLM10:2026 on pp. 10-57; Appendix A "
                "'Related Framework Mappings' (pp. 58-105) replaces the per-entry Related Frameworks sections and maps every entry "
                "to ASI 2026, DSGAI 2026, MITRE ATLAS (content v2026.06), ATT&CK v19.1, CWE 4.20, NIST AI 600-1, NIST AI RMF, CSA "
                "AICM v1.1 and OWASP AIVSS v0.8. " + OWASP_DL_NOTE + " Source of owasp-llm-top10.json (edition 2026).")),
    dict(id="owasp-llm-top10-2025-pdf", title="OWASP Top 10 for LLM Applications 2025", identifier="OWASP Top 10 for LLM Applications v2.0 (2025)",
         publisher=OWASP, version="Version 2025 (PDF build 'OWASP PDF v4.2.0a 20241114-202703')", published="2024-11-18",
         role="catalog", mediaType=PDF, path="owasp-llm-top10/LLMAll_en-US_FINAL.pdf", url="https://genai.owasp.org/download/43299/",
         landingPage="https://genai.owasp.org/resource/owasp-top-10-for-llm-applications-2025/", license=OWASP_PDF_LICENSE,
         notes=("SUPERSEDED by the 2026 edition; kept because the Agentic Top 10 2026 (Appendix A) and NIST IR 8596 iprd cite "
                "2025 entry IDs (LLMxx:2025), and because its per-entry 'Related Frameworks and Taxonomies' sections are the only "
                "OWASP mapping at ATLAS technique level. Resource page datePublished 2024-11-18 (modified 2025-04-28); served as "
                "'LLMAll_en-US_FINAL.pdf'. 45 pages, entries on pp. 7-42. " + OWASP_DL_NOTE + " Source of owasp-llm-top10.json (edition 2025).")),
    # ------------------------------------------------------------------ OWASP Agentic Top 10
    dict(id="owasp-agentic-top10-2026-pdf", title="OWASP Top 10 for Agentic Applications for 2026",
         identifier="OWASP Top 10 for Agentic Applications 2026 (ASI01-ASI10)",
         publisher="OWASP GenAI Security Project — Agentic Security Initiative (OWASP Foundation)",
         version="Version 2026 (December 2025; Word file 'OWASP Top 10 for Agentic Applications 2026 12.6')", published="2025-12-09",
         role="catalog", mediaType=PDF, path="owasp-agentic-top10/OWASP-Top-10-for-Agentic-Applications-2026-12.6-1.pdf",
         url="https://genai.owasp.org/download/52117/",
         landingPage="https://genai.owasp.org/resource/owasp-top-10-for-agentic-applications-for-2026/",
         license=OWASP_PDF_LICENSE + (" Its License and Usage page also names 'Attribution Guidelines - must include the project "
                                      "name as well as the name of the asset Referenced' (the example printed there is "
                                      "'OWASP Top 10 for LLMs - GenAI Red Teaming Guide')."),
         notes=("CURRENT: the only edition; the resource page (dated December 9, 2025) and the Agentic Security Initiative page "
                "still list this file on 2026-09-26. PDF created 2025-12-10 (macOS Quartz from Word). 57 pages; ASI01-ASI10 on pp. "
                "10-39; Appendix A (pp. 40-41) maps each ASI entry to OWASP LLM Top 10 2025 entries, Agentic AI Threats & "
                "Mitigations T-codes and AIVSS core risks; Appendix C maps OWASP NHI Top 10 to ASI (not extracted). No ATLAS or "
                "NIST mapping. " + OWASP_DL_NOTE + " Source of owasp-agentic-top10.json.")),
    # ------------------------------------------------------------------ OWASP GenAI Security Crosswalk
    cw("llm-top10/LLM_NISTCSF2.md", "LLM Top 10 2026 × NIST CSF 2.0", "mapping", CW_MAP_NOTE + " 40 rows (4 per entry)."),
    cw("llm-top10/LLM_NISTAIRMF.md", "LLM Top 10 2026 × NIST AI RMF 1.0", "mapping",
       CW_MAP_NOTE + " 40 rows; IDs written in the AI 600-1 short form (GV-1.7) with crosswalk-authored labels that do not describe the AI RMF subcategory."),
    cw("llm-top10/LLM_MITREATLAS.md", "LLM Top 10 2026 × MITRE ATLAS", "mapping",
       CW_MAP_NOTE + (" 24 rows; mapped against ATLAS '4.0' per data/stats.json (current 2026.09). 8 rows are marked by the "
                      "crosswalk itself '**DRAFT — not an ATLAS technique name; retarget pending SME review (#93)**' (one: "
                      "'AML.T0045 is not an ATLAS technique id') and are excluded from mappings.json.")),
    cw("llm-top10/LLM_FedRAMP.md", "LLM Top 10 2026 × FedRAMP (SP 800-53 controls)", "mapping", CW_MAP_NOTE + " 41 rows of SP 800-53 control IDs."),
    cw("agentic-top10/Agentic_NISTCSF2.md", "Agentic Top 10 2026 × NIST CSF 2.0", "mapping", CW_MAP_NOTE + " 40 rows."),
    cw("agentic-top10/Agentic_NISTAIRMF.md", "Agentic Top 10 2026 × NIST AI RMF 1.0", "mapping", CW_MAP_NOTE + " 40 rows (same ID/label caveat as the LLM file)."),
    cw("agentic-top10/Agentic_MITREATLAS.md", "Agentic Top 10 2026 × MITRE ATLAS", "mapping",
       CW_MAP_NOTE + " 30 rows; 9 are marked DRAFT by the crosswalk in the same way and are excluded from mappings.json."),
    cw("agentic-top10/Agentic_FedRAMP.md", "Agentic Top 10 × FedRAMP (SP 800-53 controls)", "mapping",
       CW_MAP_NOTE + (" 40 rows, all EXCLUDED from mappings.json: the file's entries carry titles of a different ASI list "
                      "(e.g. 'ASI02 – Misconfigured Access Controls', 'ASI09 – Emerging Agentic Patterns'), not the published "
                      "OWASP Top 10 for Agentic Applications 2026.")),
    cw("README.md", "README (scope, source lists, frameworks, data layer)", "supplementary",
       "Describes the crosswalk (created and led by the OWASP GenAI Data Security Initiative lead; 4 source lists, 26 frameworks, "
       "77 mapping files) and its review state ('2 of 26 carry candidate DRAFT rows only')."),
    cw("LICENSE.md", "LICENSE (CC BY-SA 4.0)", "license", "License notice of the crosswalk."),
    cw("CHANGELOG.md", "CHANGELOG", "supplementary", "Release 4.0.0 (2026-08-28) retargeted the LLM entries to the 2026 list; 'Unreleased' adds OWASP AISVS 1.0."),
    cw("MIGRATION.md", "MIGRATION (LLM Top 10 2025 → 2026 entry map)", "supplementary",
       "Official 2025→2026 renumbering used by the crosswalk (LLM03→LLM04, LLM04→LLM05, LLM05→LLM10, LLM06→LLM03, LLM07→LLM08, LLM08→LLM09, LLM09→LLM07, LLM10→LLM06)."),
    cw("GOVERNANCE.md", "GOVERNANCE", "supplementary", "Maintainer roles, review SLOs and dispute process."),
    cw("docs/SCHEMA_V2_MIGRATION.md", "Mapping schema v2 (relationship, rationale, confidence, reviewed_by)", "supplementary",
       "Defines confidence 'unreviewed' for rows without a named reviewer and states that the markdown files are the source of the data layer."),
    cw("docs/FRESHNESS_SLA.md", "Framework freshness SLA", "supplementary", "How framework versions are tracked against upstream."),
    cw("data/stats.json", "stats.json (generated statistics)", "supplementary",
       "Version 4.0.0: 51 entries, 3,771 mappings, 26 frameworks, 286 draft rows; freshness: MITRE ATLAS mapped '4.0' vs current '2026.09' (checked 2026-09-17).",
       media=JSONT),
    # ------------------------------------------------------------------ MITRE SAFE-AI (local only)
    dict(id="mitre-safe-ai-report", title="SAFE-AI: A Framework for Securing AI-Enabled Systems", identifier="MITRE MP250397",
         publisher=MITRE, version="April 2025 (PDF created 2025-05-30)", published="2025-04-01", role="mapping", mediaType=PDF,
         path="mitre-safe-ai/.local/SAFEAI_Full_Report.pdf", url="https://atlas.mitre.org/pdf-files/SAFEAI_Full_Report.pdf",
         landingPage="https://atlas.mitre.org/",
         license=("'©2025 The MITRE Corporation. All rights reserved. Approved for Public Release; Distribution Unlimited. Public "
                  "Release Case Number 25-1028.' No open license."),
         notes=("MITRE work product hosted on the ATLAS website (Last-Modified 2026-09-16). Appendix C, Table 1 lists 40 AI threats "
                "with SP 800-53 Rev. 5 controls per system element (Environment, AI Platform, AI Models, AI Data) and 'Related ATLAS "
                "ID' for reference; Appendix D lists 100 AI-affected controls. The only MITRE publication that links ATLAS "
                "techniques to SP 800-53 controls. Stored under a .local/ folder (git-ignored by corpus/**/.local/) because it is "
                "all rights reserved; its extraction (mitre-safe-ai/.local/safe-ai-mappings.json) stays local too.")),
]

KEYS = ["id", "title", "identifier", "publisher", "version", "published", "role", "mediaType", "path", "url", "landingPage",
        "sha256", "bytes", "license", "notes"]

RELATED = [
    OrderedDict(id="cprt-ai-100-2e2025-export-json", manifest="nist-ai-rmf/manifest.json",
                use="Source of nist-ai-100-2.json (referenced, not copied)."),
    OrderedDict(id="nist-ai-100-2e2025", manifest="nist-ai-rmf/manifest.json",
                use="Page citations for nist-ai-100-2.json; Sec. 3.3.3 citations of ATLAS mitigations (mappings.json)."),
    OrderedDict(id="nist-ai-100-2e2025-errata", manifest="nist-ai-rmf/manifest.json",
                use="Correction of the GenAI availability branch of the taxonomy index."),
    OrderedDict(id="nist-ir-8596-iprd", manifest="nist-ai-rmf/manifest.json",
                use="Example Informative References CSF 2.0 → ATLAS mitigations / OWASP LLM03 (mappings.json, draft)."),
    OrderedDict(id="nist-cosais-predictive-ai-annotated-outline", manifest="nist-ai-rmf/manifest.json",
                use="SP 800-53 control → NIST AI 100-2 attack IDs (mappings.json, draft)."),
    OrderedDict(id="nist-ai-600-1", manifest="nist-ai-rmf/manifest.json",
                use="AI 600-1 risk identifiers used as mapping targets (via genai-profile.json)."),
    OrderedDict(id="nist-ai-100-1", manifest="nist-ai-rmf/manifest.json",
                use="AI RMF identifiers used as mapping targets (via ai-rmf-core.json)."),
]


def main():
    old = {}
    mp = ROOT / "manifest.json"
    if mp.exists():
        old = {d["id"]: d for d in json.loads(mp.read_text(encoding="utf-8"))["documents"]}
    docs, ids = [], set()
    for d in DOCS:
        assert d["id"] not in ids, d["id"]
        ids.add(d["id"])
        p = ROOT / d["path"]
        rec = OrderedDict()
        for k in KEYS:
            if k == "path":
                rec[k] = "ai-threats/" + d["path"]
            elif k in ("sha256", "bytes"):
                if p.exists():
                    rec[k] = sha256(p) if k == "sha256" else p.stat().st_size
                else:
                    assert "/.local/" in "/" + d["path"], f"missing non-local file {d['path']}"
                    rec[k] = old[d["id"]][k]
            else:
                rec[k] = d[k]
        docs.append(rec)
    man = OrderedDict([("framework", "ai-threats"),
                       ("title", "AI threat catalogs (MITRE ATLAS, OWASP Top 10 for LLM and Agentic Applications) and their "
                                 "authoritative mappings — official documentation corpus"),
                       ("retrieved", RETRIEVED), ("documents", docs), ("relatedDocuments", RELATED)])
    mp.write_text(json.dumps(man, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"wrote {mp}: {len(docs)} documents")


if __name__ == "__main__":
    main()
