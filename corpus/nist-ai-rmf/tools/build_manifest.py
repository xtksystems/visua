#!/usr/bin/env python3
"""Write manifest.json for corpus/nist-ai-rmf from the document table below.

sha256 and bytes are computed from the files on disk, so re-running after a re-download refreshes
them. Usage (from anywhere):  python3 tools/build_manifest.py
"""
import json
from collections import OrderedDict

from common import ROOT, sha256

PD = "Public domain — U.S. Government work (17 U.S.C. §105); not subject to copyright in the United States"
NIST = "National Institute of Standards and Technology"
PDF = "application/pdf"
JSONT = "application/json"
XLSX = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
CSV = "text/csv"
AIRC_XW = "https://airc.nist.gov/airmf-resources/crosswalks/"
LOCAL_NOTE = " Stored under a .local/ folder, which the repository .gitignore excludes (corpus/**/.local/), because redistribution terms are not stated."


def third_party(org):
    return (f"No copyright or license notice in the file. Authored by {org}; not a U.S. Government work, "
            "so the 17 U.S.C. §105 public-domain status does not apply; reuse terms are not stated.")


DOCS = [
    # ------------------------------------------------------------------ core
    dict(id="nist-ai-100-1",
         title="Artificial Intelligence Risk Management Framework (AI RMF 1.0)",
         identifier="NIST AI 100-1", publisher=NIST, version="AI RMF 1.0 (January 2023)", published="2023-01-26",
         role="core", mediaType=PDF, path="core/NIST.AI.100-1.pdf",
         url="https://nvlpubs.nist.gov/nistpubs/ai/NIST.AI.100-1.pdf",
         landingPage="https://www.nist.gov/publications/artificial-intelligence-risk-management-framework-ai-rmf-10",
         license=PD,
         notes="DOI 10.6028/NIST.AI.100-1. CURRENT: no newer final, draft, RFI or concept paper for a revision exists as of 2026-09-26. "
               "NIST's AI RMF page (https://www.nist.gov/itl/ai-risk-management-framework) and FAQ (updated 2026-08-13) state that "
               "'The AI RMF 1.0 is being revised as part of the White House AI Action Plan'; the AIRC says 'A revised version is in progress'. "
               "The nvlpubs file was re-saved on 2025-06-04 (PDF ModDate; created 2023-01-24); its content is still dated January 2023 and the "
               "'Update Schedule and Versions' note (PDF page 3) still says a review with formal input from the AI community is expected no later than 2028. 48 pages; Core in Section 5, "
               "Tables 1-4 (physical pages 27-38). Source of ai-rmf-core.json."),
    # ------------------------------------------------------------------ machine-readable
    dict(id="cprt-ai-rmf-export-json",
         title="CPRT export of the AI RMF 1.0 with the AI RMF Playbook (AI_100_1_0_0), all elements (JSON)",
         identifier="CPRT framework version AI_100_1_0_0", publisher=NIST,
         version="CPRT dataset version 1.1.0 (release date 2024-07-26); export generated 2026-09-26", published="2024-07-26",
         role="machine-readable", mediaType=JSONT, path="machine-readable/cprt-AI_100_1_0_0-export.json",
         url="https://csrc.nist.gov/extensions/nudp/services/json/nudp/framework/version/AI_100_1_0_0/export/json?element=all",
         landingPage="https://csrc.nist.gov/projects/cprt/catalog#/cprt/framework/version/AI_100_1_0_0/home",
         license=PD,
         notes="Official Cybersecurity and Privacy Reference Tool (CPRT) export; server file name cprt-AI_100_1_0_0-<timestamp>.json; byte-identical "
               "on repeated download. Flat graph: 4 function, 19 category, 72 subcategory elements plus the Playbook itemised as 77 about, 575 "
               "suggested_action, 292 documentation, 195 resource and 631 reference elements, 95 sort keys, 1,956 'projection' (parent-child) "
               "relationships; no mappings to other frameworks. The function texts are the one-liners of AI 100-1 Figure 5. In 36 of the 91 "
               "categories/subcategories the wording or punctuation differs from the final AI 100-1 PDF (pre-final wording, e.g. GOVERN 5.2, MEASURE 2.6); "
               "use ai-rmf-core.json for AI 100-1 text. Quirk: the MANAGE 4.2 suggested actions are typed 'about' (A-MANAGE 4.2-1...-6)."),
    dict(id="cprt-ai-rmf-export-xlsx",
         title="CPRT export of the AI RMF 1.0 with the AI RMF Playbook (AI_100_1_0_0) (Excel)",
         identifier="CPRT framework version AI_100_1_0_0", publisher=NIST,
         version="CPRT dataset version 1.1.0 (release date 2024-07-26); export generated 2026-09-26", published="2024-07-26",
         role="machine-readable", mediaType=XLSX, path="machine-readable/cprt-AI_100_1_0_0-export.xlsx",
         url="https://csrc.nist.gov/extensions/nudp/services/json/nudp/framework/version/AI_100_1_0_0/export/excel?element=all",
         landingPage="https://csrc.nist.gov/projects/cprt/catalog#/cprt/framework/version/AI_100_1_0_0/home",
         license=PD,
         notes="Official CPRT 'MS Excel' export (server file name AI_RMF.xlsx). One sheet 'NIST AI RMF', 73 rows x 8 columns: Function | Category | "
               "Subcategory | About | Suggested Actions | Documentation | Resources | References (one row per subcategory, items newline-separated). "
               "Contains a generation timestamp, so bytes differ per download."),
    dict(id="cprt-ai-100-2e2025-export-json",
         title="CPRT export of NIST AI 100-2 E2025 'Adversarial Machine Learning: A Taxonomy and Terminology of Attacks and Mitigations' (AI_TAXONOMY_1_0_0), all elements (JSON)",
         identifier="CPRT framework version AI_TAXONOMY_1_0_0", publisher=NIST,
         version="CPRT dataset version 1.0.0 (release date 2025-03-20); export generated 2026-09-26", published="2025-03-20",
         role="machine-readable", mediaType=JSONT, path="machine-readable/cprt-AI_TAXONOMY_1_0_0-export.json",
         url="https://csrc.nist.gov/extensions/nudp/services/json/nudp/framework/version/AI_TAXONOMY_1_0_0/export/json?element=all",
         landingPage="https://csrc.nist.gov/projects/cprt/catalog#/cprt/framework/version/AI_TAXONOMY_1_0_0/home",
         license=PD,
         notes="Machine-readable form of guides/NIST.AI.100-2e2025.pdf. Byte-identical on repeated download. Elements: 3 domain, 12 category, "
               "42 subcategory, 30 taxonomy (NISTAML.* attack/violation IDs), 77 glossary, 426 reference, 8 figure (base64 PNG); 845 "
               "'projection' relationships."),
    dict(id="cprt-ai-100-2e2025-export-xlsx",
         title="CPRT export of NIST AI 100-2 E2025 (AI_TAXONOMY_1_0_0) (Excel)",
         identifier="CPRT framework version AI_TAXONOMY_1_0_0", publisher=NIST,
         version="CPRT dataset version 1.0.0 (release date 2025-03-20); export generated 2026-09-26", published="2025-03-20",
         role="machine-readable", mediaType=XLSX, path="machine-readable/cprt-AI_TAXONOMY_1_0_0-export.xlsx",
         url="https://csrc.nist.gov/extensions/nudp/services/json/nudp/framework/version/AI_TAXONOMY_1_0_0/export/excel?element=all",
         landingPage="https://csrc.nist.gov/projects/cprt/catalog#/cprt/framework/version/AI_TAXONOMY_1_0_0/home",
         license=PD,
         notes="Server file name AI_RMF.xlsx (same name as the AI RMF export). One sheet 'NIST AI Taxonomy', 53 rows x 6 columns: Domain | Category | "
               "Subcategory | Reference | Glossary | Taxonomy. Contains a generation timestamp, so bytes differ per download."),
    dict(id="olir-informative-reference-catalog-json",
         title="NIST OLIR Informative Reference Catalog (JSON snapshot)",
         identifier="OLIR catalog API: olir/informative-reference-catalog", publisher=NIST,
         version="Live snapshot retrieved 2026-09-26", published="2026-09-26",
         role="mapping", mediaType=JSONT, path="machine-readable/olir-informative-reference-catalog.json",
         url="https://csrc.nist.gov/extensions/nudp/services/json/olir/informative-reference-catalog",
         landingPage="https://csrc.nist.gov/projects/olir/informative-reference-catalog",
         license=PD,
         notes="Backing data of the OLIR catalog page: 102 informative references across 16 focal-document entries. 'AI RMF 1.0' (focalFrameworkVersionId 190) "
               "is an OLIR focal document with 7 informative references, all by non-NIST developers (Yarion x3, AAM Cyber, Oracles Technologies LLC, "
               "2 independent submitters; posted 2026-05-26 to 2026-08-27; 6 Final, 1 Draft). NIST has posted no OLIR mapping of the AI RMF to "
               "CSF 2.0, SP 800-53 or any other framework. The mapping files themselves are hosted by their developers and were not downloaded. "
               "Entries list third-party submissions whose content may be subject to the contributors' own terms."),
    # ------------------------------------------------------------------ playbook
    dict(id="ai-rmf-playbook-pdf", title="NIST AI RMF Playbook", identifier="NIST AI RMF Playbook (PDF)", publisher=NIST,
         version="Playbook for AI RMF 1.0; content as revised March 2023; PDF generated 2024-08-02", published="2023-03-30",
         role="playbook", mediaType=PDF, path="playbook/AI_RMF_Playbook.pdf",
         url="https://airc.nist.gov/docs/AI_RMF_Playbook.pdf", landingPage="https://airc.nist.gov/airmf-resources/playbook/",
         license=PD,
         notes="First complete version announced 2023-03-30. AIRC Playbook audit log: last content changes March 2023; August 2023 added tagging, "
               "formatting and a PDF version. This file: PDF created 2024-08-02 (python-docx/Word), served since 2024-09-16; 147 pages (footer "
               "'N of 142'). AIRC and nist.gov (page updated 2026-06-10): 'The Playbook will be updated after the AI RMF 1.0 is revised.' "
               "Rendering artifacts versus playbook.json: text after an inline link is dropped in a few places (e.g. MAP 1.5 'See Table 3.', "
               "MEASURE 2.2 'Note: ...'), MAP 1.3 shows raw '[LINK](...)' markdown, MANAGE 2.2 prints 'stablish'. Used for the page numbers in ai-rmf-playbook.json."),
    dict(id="ai-rmf-playbook-json", title="NIST AI RMF Playbook (JSON)", identifier="NIST AI RMF Playbook (JSON)", publisher=NIST,
         version="Playbook for AI RMF 1.0; content as revised March 2023; file Last-Modified 2026-06-11", published="2023-03-30",
         role="playbook", mediaType=JSONT, path="playbook/playbook.json",
         url="https://airc.nist.gov/docs/playbook.json", landingPage="https://airc.nist.gov/airmf-resources/playbook/",
         license=PD,
         notes="PRIMARY source of ai-rmf-playbook.json. Array of 72 objects (one per subcategory): type, title (e.g. 'GOVERN 1.1'), category "
               "('GOVERN-1'), description (subcategory statement as worded in the Playbook; differs from the final AI 100-1 wording for 30 "
               "subcategories), section_about, section_actions, section_doc, section_ref (markdown), 'AI Actors', 'Topic'. Byte-identical on "
               "repeated download. Same four text sections as playbook.csv/.xlsx (verified identical)."),
    dict(id="ai-rmf-playbook-csv", title="NIST AI RMF Playbook (CSV)", identifier="NIST AI RMF Playbook (CSV)", publisher=NIST,
         version="Playbook for AI RMF 1.0; content as revised March 2023; file Last-Modified 2026-06-11", published="2023-03-30",
         role="playbook", mediaType=CSV, path="playbook/playbook.csv",
         url="https://airc.nist.gov/docs/playbook.csv", landingPage="https://airc.nist.gov/airmf-resources/playbook/",
         license=PD,
         notes="Transposed table: 5 rows (header, section_about, section_actions, section_doc, section_ref) x 73 columns (label + 72 subcategories). "
               "No description, AI Actors or Topic fields. Cell text identical to playbook.json."),
    dict(id="ai-rmf-playbook-xlsx", title="NIST AI RMF Playbook (Excel)", identifier="NIST AI RMF Playbook (Excel)", publisher=NIST,
         version="Playbook for AI RMF 1.0; content as revised March 2023; file Last-Modified 2026-06-11", published="2023-03-30",
         role="playbook", mediaType=XLSX, path="playbook/playbook.xlsx",
         url="https://airc.nist.gov/docs/playbook.xlsx", landingPage="https://airc.nist.gov/airmf-resources/playbook/",
         license=PD,
         notes="Sheet 'Playbook', same transposed layout and cell text as playbook.csv."),
    # ------------------------------------------------------------------ profiles
    dict(id="nist-ai-600-1",
         title="Artificial Intelligence Risk Management Framework: Generative Artificial Intelligence Profile",
         identifier="NIST AI 600-1", publisher=NIST, version="July 2024 (final)", published="2024-07-26",
         role="profile", mediaType=PDF, path="profiles/NIST.AI.600-1.pdf",
         url="https://nvlpubs.nist.gov/nistpubs/ai/NIST.AI.600-1.pdf",
         landingPage="https://www.nist.gov/publications/artificial-intelligence-risk-management-framework-generative-artificial-intelligence",
         license=PD,
         notes="DOI 10.6028/NIST.AI.600-1. CURRENT: no revision, update or new draft as of 2026-09-26 (AI RMF and AIRC pages list the July 2024 "
               "edition; nvlpubs probes for a revision, NIST.AI.600-1r1.ipd.pdf and NIST.AI.600-1.upd1.pdf, return 404). File re-saved 2025-03-24 (ModDate; created 2024-08-05). No official machine-readable "
               "form (not in CPRT, not on the AIRC). Source of genai-profile.json: 12 risks, 212 suggested actions (GV 58, MP 39, MS 72, MG 43) "
               "for 49 of the 72 subcategories."),
    # ------------------------------------------------------------------ drafts
    dict(id="nist-ir-8596-iprd",
         title="Cybersecurity Framework Profile for Artificial Intelligence (Cyber AI Profile): NIST Community Profile",
         identifier="NIST IR 8596 (Initial Preliminary Draft)", publisher=NIST, version="Initial Preliminary Draft (iprd) — DRAFT",
         published="2025-12-16", role="profile", mediaType=PDF, path="drafts/NIST.IR.8596.iprd.pdf",
         url="https://nvlpubs.nist.gov/nistpubs/ir/2025/NIST.IR.8596.iprd.pdf", landingPage="https://csrc.nist.gov/pubs/ir/8596/iprd",
         license=PD,
         notes="DRAFT. DOI 10.6028/NIST.IR.8596.iprd. Comment period 2025-12-16 to 2026-01-30 (closed). Latest version as of 2026-09-26: the CSRC "
               "document history lists only this draft and the drafts list shows no initial public draft; CSRC planning note of 2026-04-21 "
               "announced spring 2026 virtual working sessions. Organised by CSF 2.0 Functions/Categories/Subcategories across three focus "
               "areas (Secure, Defend, Thwart); a CSF 2.0 profile, not an AI RMF profile. Same file (same SHA-256) as "
               "nist-csf-2.0/profiles/NIST.IR.8596.iprd.pdf (id nist-ir-8596-iprd-cyber-ai-profile in that manifest)."),
    dict(id="nist-ai-rmf-critical-infrastructure-profile-concept-note",
         title="Concept Note: Development of the NIST AI RMF Trustworthy Use of AI in Critical Infrastructure Profile",
         identifier="NIST AI RMF Trustworthy AI in Critical Infrastructure Profile — concept note", publisher=NIST,
         version="Concept note (pre-draft) dated 2026-04-07", published="2026-04-07",
         role="profile", mediaType=PDF,
         path="drafts/Concept_Note_Development_of_the_NIST_AI_RMF_Trustworthy_Use_of_AI_in_Critical_Infrastructure_Profile.pdf",
         url="https://www.nist.gov/system/files/documents/2026/04/08/Concept%20Note_%20Development%20of%20the%20NIST%20AI%20RMF%20Trustworthy%20Use%20of%20AI%20in%20Critical%20Infrastructure%20Profile.pdf",
         landingPage="https://www.nist.gov/programs-projects/concept-note-ai-rmf-profile-trustworthy-ai-critical-infrastructure",
         license=PD,
         notes="Not a draft profile: 2-page concept note (authors Raymond Sheh, Martin Stanley) announcing development of an AI RMF profile for "
               "critical infrastructure. NIST AI RMF page: released April 7, 2026; project page updated 2026-07-17, status 'Ongoing'; no draft "
               "profile published as of 2026-09-26. Official file name has spaces ('Concept Note_ Development of ... Profile.pdf')."),
    dict(id="nist-ai-800-1-2pd",
         title="Managing Misuse Risk for Dual-Use Foundation Models",
         identifier="NIST AI 800-1 (Second Public Draft)", publisher=NIST + " (U.S. AI Safety Institute, now the Center for AI Standards and Innovation)",
         version="Second public draft (2pd) — DRAFT", published="2025-01-15",
         role="guide", mediaType=PDF, path="drafts/NIST.AI.800-1.ipd2.pdf",
         url="https://nvlpubs.nist.gov/nistpubs/ai/NIST.AI.800-1.ipd2.pdf",
         landingPage="https://www.nist.gov/news-events/news/2025/01/updated-guidelines-managing-misuse-risk-dual-use-foundation-models",
         license=PD,
         notes="DRAFT. DOI 10.6028/NIST.AI.800-1.2pd (resolves to this file). Request for comments: Federal Register 2025-00698 (2025-01-15); "
               "comments closed 2025-03-15. Latest version as of 2026-09-26: no final (nvlpubs NIST.AI.800-1.pdf returns 404; the AIRC "
               "Technical Reports page still links the July 2024 initial public draft, which this draft supersedes and which was not downloaded). "
               "File re-saved 2025-05-02."),
    dict(id="nist-cosais-concept-paper",
         title="SP 800-53 Control Overlays for Securing AI Systems Concept Paper",
         identifier="NIST COSAiS concept paper", publisher=NIST, version="Concept paper (pre-draft)", published="2025-08-14",
         role="guide", mediaType=PDF, path="drafts/NIST-Overlays-SecuringAI-concept-paper.pdf",
         url="https://csrc.nist.gov/csrc/media/Projects/cosais/documents/NIST-Overlays-SecuringAI-concept-paper.pdf",
         landingPage="https://csrc.nist.gov/projects/cosais",
         license=PD,
         notes="Control Overlays for Securing AI Systems (COSAiS): proposes SP 800-53 overlays for five use cases (adapting and using generative AI "
               "assistants/LLMs; using and fine-tuning predictive AI; single-agent; multi-agent; security controls for AI developers), leveraging "
               "SP 800-218A, draft AI 800-1 and AI 100-2 E2025. States the goal of a first public draft 'in early FY26'; none published on CSRC as "
               "of 2026-09-26."),
    dict(id="nist-cosais-predictive-ai-annotated-outline",
         title="NIST SP 800-53 Control Overlays for Securing AI Systems: Using and Fine-Tuning Predictive AI — Draft Annotated Outline (January 2026)",
         identifier="NIST COSAiS annotated outline (NISTIR 8605 / 8605A preview)", publisher=NIST,
         version="Discussion draft (annotated outline), January 2026", published="2026-01-08",
         role="guide", mediaType=PDF, path="drafts/COSAiS-Predictive-AI-annotated-outline-Jan2026.pdf",
         url="https://csrc.nist.gov/csrc/media/Projects/cosais/documents/COSAiS-Predictive-AI-annotated-outline-Jan2026.pdf",
         landingPage="https://csrc.nist.gov/projects/cosais",
         license=PD,
         notes="DISCUSSION DRAFT for the Cyber AI Profile Workshop #2 (2026-01-14); feedback requested by 2026-02-13. Previews NISTIR 8605 (Overview "
               "and Methodology) and NISTIR 8605A (Using and Fine-Tuning Predictive AI); plans 8605B (generative AI), 8605C (AI developers), 8605D "
               "(agentic AI) and says NIST intended to issue 8605/8605A drafts by Q3 FY2026. As of 2026-09-26 no NIST IR 8605 draft exists on CSRC "
               "or nvlpubs. Overlay control entries cite AI 100-2 E2025 attack IDs (NISTAML.*)."),
    # ------------------------------------------------------------------ crosswalks (NIST-authored, in git)
    dict(id="nist-ai-rmf-crosswalk-iso-iec-fdis-23894",
         title="Crosswalk AI RMF (1.0) and ISO/IEC FDIS 23894 Information technology - Artificial intelligence - Guidance on risk management",
         identifier="NIST AI RMF crosswalk — ISO/IEC FDIS 23894", publisher=NIST,
         version="Draft for comment, January 26, 2023 (listed as superseded on the AIRC)", published="2023-01-26",
         role="mapping", mediaType=PDF, path="crosswalks/crosswalk_AI_RMF_1_0_ISO_IEC_23894.pdf",
         url="https://www.nist.gov/system/files/documents/2023/01/26/crosswalk_AI_RMF_1_0_ISO_IEC_23894.pdf", landingPage=AIRC_XW,
         license=PD,
         notes="NIST-authored. Maps the four AI RMF functions to ISO/IEC FDIS 23894 clause numbers and clause titles (no other ISO text). The AIRC "
               "crosswalk list labels it 'ISO/IEC 23894 FDIS (superseded)'; its successor is the INCITS/AI revised crosswalk of 2025-08-14 "
               "(crosswalks/.local/). Also linked from https://www.nist.gov/document/ai-rmf-crosswalk-iso."),
    dict(id="nist-ai-rmf-crosswalk-oecd-eu-ai-act-eo13960-bor",
         title="Crosswalk: An illustration of how NIST AI RMF trustworthiness characteristics relate to the OECD Recommendation on AI, Proposed EU AI Act, Executive Order 13960, and Blueprint for an AI Bill of Rights",
         identifier="NIST AI RMF crosswalk — OECD / EU AI Act (proposed) / EO 13960 / AI Bill of Rights", publisher=NIST,
         version="Draft for comment, January 26, 2023", published="2023-01-26",
         role="mapping", mediaType=PDF, path="crosswalks/crosswalk_AI_RMF_1_0_OECD_EO_AIA_BoR.pdf",
         url="https://www.nist.gov/system/files/documents/2023/01/26/crosswalk_AI_RMF_1_0_OECD_EO_AIA_BoR.pdf", landingPage=AIRC_XW,
         license=PD,
         notes="NIST-authored, 2 pages. Maps the seven AI RMF trustworthiness characteristics to terms in the OECD AI Recommendation, the proposed "
               "EU AI Act, EO 13960 and the Blueprint for an AI Bill of Rights (characteristic level, not subcategory level)."),
    # ------------------------------------------------------------------ crosswalks (.local)
    dict(id="nist-imda-ai-rmf-ai-verify-crosswalk",
         title="Crosswalk NIST AI Risk Management Framework (AI RMF 1.0) and Singapore’s AI Verify Testing Framework",
         identifier="NIST AI RMF crosswalk — Singapore AI Verify", publisher="NIST with Singapore IMDA/PDPC",
         version="October 12, 2023", published="2023-10-12",
         role="mapping", mediaType=PDF, path="crosswalks/.local/NIST_AI_RMF_to_AI_Verify_Crosswalk.pdf",
         url="https://airc.nist.gov/docs/NIST_AI_RMF_to_AI_Verify_Crosswalk.pdf", landingPage=AIRC_XW,
         license="No copyright or license notice in the file. The AIRC lists NIST as provider, but the PDF metadata author is 'Wen Rui TAN (PDPC)' "
                 "(Singapore Personal Data Protection Commission), i.e. a joint product; public-domain status of the non-NIST contribution is not established.",
         notes="Maps AI RMF categories (GOVERN 1 ... MANAGE 4) to AI Verify Testing Framework principle/process numbers. AIRC date October 10, 2023; "
               "document date October 12, 2023." + LOCAL_NOTE),
    dict(id="incits-ai-iso-iec-23894-ai-rmf-crosswalk-revised",
         title="Crosswalk NIST AI RMF (1.0) and ISO/IEC 23894:2023 (Information technology — Artificial intelligence — Guidance on risk management) (Revised)",
         identifier="INCITS/AI document ai-2025-00109", publisher="INCITS/AI (U.S. TAG to ISO/IEC JTC 1/SC 42)",
         version="Revised, August 14, 2025", published="2025-08-14",
         role="mapping", mediaType=PDF, path="crosswalks/.local/ai-2025-00109_revised_ISO_IEC_23894_Crosswalk_to_the_NIST_AI_RMF.pdf",
         url="https://airc.nist.gov/documents/3/ai-2025-00109_revised_ISO_IEC_23894_Crosswalk_to_the_NIST_AI_RMF.pdf", landingPage=AIRC_XW,
         license=third_party("INCITS/AI"),
         notes="Current crosswalk to ISO/IEC 23894:2023 (replaces NIST's January 2023 FDIS crosswalk). Function-level; ISO clause numbers and titles." + LOCAL_NOTE),
    dict(id="incits-ai-iso-iec-42005-ai-rmf-crosswalk",
         title="Crosswalk ISO/IEC 42005 Information technology - Artificial intelligence - AI system impact assessment to NIST AI RMF (1.0)",
         identifier="INCITS/AI document ai-2025-00108", publisher="INCITS/AI (U.S. TAG to ISO/IEC JTC 1/SC 42)",
         version="August 14, 2025 (mapped against ISO/IEC DIS 42005)", published="2025-08-14",
         role="mapping", mediaType=PDF, path="crosswalks/.local/ai-2025-00108_ISO_IEC_42005_to_NIST_AI_RMF_Crosswalk.pdf",
         url="https://airc.nist.gov/documents/2/ai-2025-00108_ISO_IEC_42005_to_NIST_AI_RMF_Crosswalk.pdf", landingPage=AIRC_XW,
         license=third_party("INCITS/AI"),
         notes="Category-level mapping of AI RMF categories to ISO/IEC DIS 42005 clauses." + LOCAL_NOTE),
    dict(id="incits-ai-rmf-iso-iec-5338-5339-crosswalk",
         title="Crosswalk between NIST AI RMF 1.0 and ISO/IEC 5338:2023 AI system life cycle processes and ISO/IEC 5339 Guidance for AI applications",
         identifier="INCITS-AI crosswalk (ISO/IEC 5338 & 5339)", publisher="INCITS (InterNational Committee for Information Technology Standards), AI committee",
         version="April 11, 2024", published="2024-04-11",
         role="mapping", mediaType=PDF, path="crosswalks/.local/Crosswalk_NIST_AI_RMF_and_ISO_5338_5339.pdf",
         url="https://airc.nist.gov/docs/Crosswalk_NIST_AI_RMF_and_ISO_5338_5339.pdf", landingPage=AIRC_XW,
         license=third_party("INCITS"),
         notes="4-page narrative crosswalk." + LOCAL_NOTE),
    dict(id="microsoft-ai-rmf-iso-iec-42001-crosswalk",
         title="NIST AI Risk Management Framework to ISO-IEC-42001 Crosswalk",
         identifier="AI RMF to ISO/IEC 42001 crosswalk (Microsoft)", publisher="Microsoft",
         version="Undated on the AIRC (PDF created 2023-05-23)", published="2023-05-23",
         role="mapping", mediaType=PDF, path="crosswalks/.local/NIST_AI_RMF_to_ISO_IEC_42001_Crosswalk.pdf",
         url="https://airc.nist.gov/docs/NIST_AI_RMF_to_ISO_IEC_42001_Crosswalk.pdf", landingPage=AIRC_XW,
         license=third_party("Microsoft"),
         notes="Only AI RMF-to-ISO/IEC 42001 crosswalk listed by NIST. Subcategory-level: each AI RMF subcategory mapped to ISO/IEC 42001 clause "
               "and Annex A/B control numbers and titles. The PDF was created 2023-05-23, before ISO/IEC 42001:2023 was published (December 2023). "
               "Contains ISO/IEC clause and control titles." + LOCAL_NOTE),
    dict(id="imda-ai-600-1-ai-verify-crosswalk",
         title="Crosswalk Between NIST AI Risk Management Framework: Generative AI Profile (AI 600-1) and Singapore / IMDA AI Verify Testing Framework",
         identifier="AI 600-1 to AI Verify crosswalk", publisher="Singapore Infocomm Media Development Authority (IMDA)",
         version="May 2025", published="2025-05-28",
         role="mapping", mediaType=PDF, path="crosswalks/.local/20250527-Crosswalk_NIST_600-1_IMDA_AI_Verify.pdf",
         url="https://airc.nist.gov/documents/1/20250527-Crosswalk_NIST_600-1_IMDA_AI_Verify.pdf", landingPage=AIRC_XW,
         license=third_party("Singapore / IMDA (AIRC provider attribution; PDF metadata author 'Michael D Garris')"),
         notes="Maps AI 600-1 action IDs (GV-1.1-001 ... MG-4.3-003) to AI Verify testing framework process numbers." + LOCAL_NOTE),
    dict(id="tta-ai-rmf-trustworthy-ai-guidebook-crosswalk",
         title="Crosswalk Between NIST AI Risk Management Framework (AI RMF 1.0) and TTA Guidebook for Development of Trustworthy AI 2023 - General Sector",
         identifier="AI RMF to Korea TTA Guidebook crosswalk", publisher="Telecommunications Technology Association (TTA), Republic of Korea",
         version="December 2024", published="2024-12-23",
         role="mapping", mediaType=PDF, path="crosswalks/.local/20241216-Crosswalk_NIST_AI_RMF_TTA_Guidebook3.pdf",
         url="https://airc.nist.gov/docs/20241216-Crosswalk_NIST_AI_RMF_TTA_Guidebook3.pdf", landingPage=AIRC_XW,
         license=third_party("TTA (Korea); the document states it was done in consultation with NIST"),
         notes="Maps TTA Guidebook requirements and checklist items to AI RMF subcategories." + LOCAL_NOTE),
    dict(id="japan-aisi-nist-crosswalk-1-terminology",
         title="Crosswalk 1 – Terminology: NIST AI Risk Management Framework (NIST AI RMF) and Japan AI Guidelines for Business (AI GfB)",
         identifier="J-AISI/NIST Crosswalk-1 Terminology", publisher="Japan AI Safety Institute (J-AISI) and NIST",
         version="April 29, 2024", published="2024-04-29",
         role="mapping", mediaType=PDF, path="crosswalks/.local/FINAL_Crosswalk1_Terminology_RMF_GfB.pdf",
         url="https://airc.nist.gov/docs/FINAL_Crosswalk1_Terminology_RMF_GfB.pdf", landingPage=AIRC_XW,
         license=third_party("Japan AISI with NIST (AIRC provider: Japan AISI)"),
         notes="Compares AI RMF trustworthiness characteristics with the Japan AI GfB common guiding principles; quotes both documents." + LOCAL_NOTE),
    dict(id="japan-aisi-nist-crosswalk-2-concepts",
         title="Crosswalk 2 – Concepts: NIST AI Risk Management Framework and Japan AI Guidelines for Business",
         identifier="J-AISI/NIST Crosswalk-2 Concepts", publisher="Japan AI Safety Institute (J-AISI) and NIST",
         version="September 17, 2024", published="2024-09-17",
         role="mapping", mediaType=PDF, path="crosswalks/.local/FINAL_Crosswalk2_Concepts_RMF_GfB.pdf",
         url="https://airc.nist.gov/docs/FINAL_Crosswalk2_Concepts_RMF_GfB.pdf", landingPage=AIRC_XW,
         license=third_party("Japan AISI with NIST (AIRC provider: Japan AISI)"),
         notes="Concept-level mapping of AI GfB parts/appendices to AI RMF subcategories." + LOCAL_NOTE),
    dict(id="cltc-taxonomy-of-trustworthiness-for-ai",
         title="A Taxonomy of Trustworthiness for Artificial Intelligence: Connecting Properties of Trustworthiness with Risk Management and the AI Lifecycle (tables)",
         identifier="CLTC White Paper Series", publisher="UC Berkeley Center for Long-Term Cybersecurity (CLTC)",
         version="December 2023", published="2023-12-07",
         role="mapping", mediaType=PDF, path="crosswalks/.local/Taxonomy_of_AI_Trustworthiness_tables.pdf",
         url="https://cltc.berkeley.edu/wp-content/uploads/2023/12/Taxonomy_of_AI_Trustworthiness_tables.pdf", landingPage=AIRC_XW,
         license=third_party("UC Berkeley CLTC (Jessica Newman)"),
         notes="Trustworthiness properties with guiding questions, each mapped to AI RMF subcategories. Listed on the AIRC crosswalk page." + LOCAL_NOTE),
    # ------------------------------------------------------------------ guides
    dict(id="nist-ai-100-2e2025",
         title="Adversarial Machine Learning: A Taxonomy and Terminology of Attacks and Mitigations",
         identifier="NIST AI 100-2 E2025", publisher=NIST, version="2025 edition (E2025), final; corrected PDF uploaded 2025-04-01",
         published="2025-03-24", role="guide", mediaType=PDF, path="guides/NIST.AI.100-2e2025.pdf",
         url="https://nvlpubs.nist.gov/nistpubs/ai/NIST.AI.100-2e2025.pdf", landingPage="https://csrc.nist.gov/pubs/ai/100/2/e2025/final",
         license=PD,
         notes="DOI 10.6028/NIST.AI.100-2e2025. Latest edition (supersedes AI 100-2 E2023 of 2024-01-04; no later edition or draft on CSRC or "
               "nvlpubs as of 2026-09-26). CSRC planning notes: 2025-04-01 corrected PDF (author affiliations, alt text); 2025-06-03 an error on "
               "page x, see the errata file. Machine-readable version: CPRT AI_TAXONOMY_1_0_0."),
    dict(id="nist-ai-100-2e2025-errata",
         title="Errata (potential updates) for NIST AI 100-2e2025", identifier="NIST AI 100-2 E2025 (supplemental material)",
         publisher=NIST, version="Last updated June 3, 2025", published="2025-06-03",
         role="guide", mediaType=PDF, path="guides/nist.ai.100-2e2025_potential_updates.pdf",
         url="https://csrc.nist.gov/files/pubs/ai/100/2/e2025/final/docs/nist.ai.100-2e2025_potential_updates.pdf",
         landingPage="https://csrc.nist.gov/pubs/ai/100/2/e2025/final", license=PD,
         notes="Known typographical/editorial errors; 'not official changes to the document'."),
    dict(id="nist-ai-100-4",
         title="Reducing Risks Posed by Synthetic Content: An Overview of Technical Approaches to Digital Content Transparency",
         identifier="NIST AI 100-4", publisher=NIST, version="Final (November 2024)", published="2024-11-20",
         role="guide", mediaType=PDF, path="guides/NIST.AI.100-4.pdf",
         url="https://nvlpubs.nist.gov/nistpubs/ai/NIST.AI.100-4.pdf",
         landingPage="https://www.nist.gov/publications/reducing-risks-posed-synthetic-content-overview-technical-approaches-digital-content",
         license=PD,
         notes="DOI 10.6028/NIST.AI.100-4. Current final. The AIRC Technical Reports page still links the April 2024 initial public draft "
               "(airc.nist.gov/docs/NIST.AI.100-4.SyntheticContent.ipd.pdf; not downloaded). File re-saved 2025-03-24."),
    dict(id="nist-sp-1270",
         title="Towards a Standard for Identifying and Managing Bias in Artificial Intelligence",
         identifier="NIST SP 1270", publisher=NIST, version="Final", published="2022-03-15",
         role="guide", mediaType=PDF, path="guides/NIST.SP.1270.pdf",
         url="https://nvlpubs.nist.gov/nistpubs/SpecialPublications/NIST.SP.1270.pdf",
         landingPage="https://www.nist.gov/publications/towards-standard-identifying-and-managing-bias-artificial-intelligence",
         license=PD, notes="DOI 10.6028/NIST.SP.1270. Current (no revision). Cited by AI 100-1."),
    dict(id="nist-ir-8312",
         title="Four Principles of Explainable Artificial Intelligence",
         identifier="NISTIR 8312", publisher=NIST, version="Final", published="2021-09-29",
         role="guide", mediaType=PDF, path="guides/NIST.IR.8312.pdf",
         url="https://nvlpubs.nist.gov/nistpubs/ir/2021/NIST.IR.8312.pdf",
         landingPage="https://www.nist.gov/publications/four-principles-explainable-artificial-intelligence",
         license=PD, notes="DOI 10.6028/NIST.IR.8312. Current (no revision). File re-saved 2024-06-13 (created 2021-09-29)."),
    dict(id="nist-sp-800-218a",
         title="Secure Software Development Practices for Generative AI and Dual-Use Foundation Models: An SSDF Community Profile",
         identifier="NIST SP 800-218A", publisher=NIST, version="Final", published="2024-07-26",
         role="guide", mediaType=PDF, path="guides/NIST.SP.800-218A.pdf",
         url="https://nvlpubs.nist.gov/nistpubs/SpecialPublications/NIST.SP.800-218A.pdf",
         landingPage="https://csrc.nist.gov/pubs/sp/800/218/a/final",
         license=PD,
         notes="DOI 10.6028/NIST.SP.800-218A. Current final (initial public draft 2024-04-29). Listed on the AIRC Technical Reports page; one of the "
               "inputs named for COSAiS."),
    # ------------------------------------------------------------------ supplementary
    dict(id="ai-rmf-fact-sheet",
         title="NIST Artificial Intelligence Risk Management Framework (AI RMF): About the AI RMF (fact sheet)",
         identifier="AI RMF fact sheet", publisher=NIST, version="May 2025", published="2025-05-30",
         role="supplementary", mediaType=PDF, path="supplementary/09-24-about-the-ai-rmf-for-distro-9-25_508-edit.pdf",
         url="https://www.nist.gov/system/files/documents/2024/10/07/09-24-about-the-ai-rmf-for-distro-9-25_508-edit.pdf",
         landingPage="https://www.nist.gov/document/about-nist-ai-rmf", license=PD,
         notes="One-page overview ('Fact Sheet' link on the AI RMF page). Dated May 2025 on the sheet; PDF created 2025-05-30 (the storage path "
               "dates from an October 2024 upload)."),
    dict(id="ai-rmf-roadmap-page",
         title="Roadmap for the NIST Artificial Intelligence Risk Management Framework (AI RMF 1.0)",
         identifier="AI RMF Roadmap (web page)", publisher=NIST, version="Page created 2023-01-24, updated 2023-03-14", published="2023-01-26",
         role="supplementary", mediaType="text/html",
         path="supplementary/roadmap/roadmap-nist-artificial-intelligence-risk-management-framework-ai.html",
         url="https://www.nist.gov/itl/ai-risk-management-framework/roadmap-nist-artificial-intelligence-risk-management-framework-ai",
         landingPage="https://airc.nist.gov/airmf-resources/roadmap/", license=PD,
         notes="The Roadmap is published only as a web page (nist.gov and AIRC); no PDF exists. Saved as served on 2026-09-26 (includes site "
               "navigation). Lists the top-priority roadmap areas (alignment with international standards and crosswalks, TEVV, profiles, "
               "trustworthiness tradeoffs, measuring effectiveness, case studies, human factors, explainability, risk tolerances, tutorials)."),
    dict(id="ai-rmf-roadmap-graphic",
         title="AI RMF Roadmap graphic", identifier="AI RMF Roadmap (image)", publisher=NIST,
         version="AIRC 'Download the Roadmap' image (file dated 2023-06-07)", published="2023-01-26",
         role="supplementary", mediaType="image/png", path="supplementary/roadmap/roadmap_final.png",
         url="https://airc.nist.gov/img/roadmap_final.png", landingPage="https://airc.nist.gov/airmf-resources/roadmap/", license=PD,
         notes="672 x 306 PNG; the only downloadable form of the Roadmap."),
    dict(id="nist-ai-100-3",
         title="The Language of Trustworthy AI: An In-Depth Glossary of Terms", identifier="NIST AI 100-3", publisher=NIST,
         version="Final (March 2023)", published="2023-03-29",
         role="supplementary", mediaType=PDF, path="supplementary/NIST.AI.100-3.pdf",
         url="https://nvlpubs.nist.gov/nistpubs/ai/NIST.AI.100-3.pdf",
         landingPage="https://www.nist.gov/publications/language-trustworthy-ai-depth-glossary-terms", license=PD,
         notes="DOI 10.6028/NIST.AI.100-3. Describes the motivation and development of the AIRC glossary (the glossary itself is the Google Sheet in "
               "supplementary/.local/glossary/). The AIRC notes 'A final glossary release will be published at a later date'. File re-saved 2025-03-24."),
    dict(id="nist-trustworthy-ai-glossary-xlsx",
         title="The Language of Trustworthy AI: An In-Depth Glossary of Terms (glossary spreadsheet, Excel export)",
         identifier="NIST AIRC Glossary (beta)", publisher=NIST, version="Beta; live Google Sheets export retrieved 2026-09-26",
         published="2026-09-26", role="supplementary", mediaType=XLSX,
         path="supplementary/.local/glossary/language-of-trustworthy-ai-glossary.xlsx",
         url="https://docs.google.com/spreadsheets/d/e/2PACX-1vTRBYglcOtgaMrdF11aFxfEY3EmB31zslYI4q2_7ZZ8z_1lKm7OHtF0t4xIsckuogNZ3hRZAaDQuv_K/pub?output=xlsx",
         landingPage="https://airc.nist.gov/glossary/",
         license="Published by NIST, but most definitions are quoted verbatim from the cited sources (e.g. ISO/IEC TS 5723:2022, IEEE standards, "
                 "OECD, FDA), which keep their own copyright; no license notice in the file.",
         notes="Sheets 'Glossary' (447 terms x up to 5 definitions with citation IDs, related terms, legal-definition flag) and 'Citations' (379 "
               "sources). Kept under .local/ because it contains verbatim ISO/IEC and IEEE text (repository licensing rule). Google-generated "
               "export, bytes may differ per download."),
    dict(id="nist-trustworthy-ai-glossary-csv",
         title="The Language of Trustworthy AI: An In-Depth Glossary of Terms (glossary sheet, CSV export)",
         identifier="NIST AIRC Glossary (beta)", publisher=NIST, version="Beta; live Google Sheets export retrieved 2026-09-26",
         published="2026-09-26", role="supplementary", mediaType=CSV,
         path="supplementary/.local/glossary/language-of-trustworthy-ai-glossary.csv",
         url="https://docs.google.com/spreadsheets/d/e/2PACX-1vTRBYglcOtgaMrdF11aFxfEY3EmB31zslYI4q2_7ZZ8z_1lKm7OHtF0t4xIsckuogNZ3hRZAaDQuv_K/pub?output=csv",
         landingPage="https://airc.nist.gov/glossary/",
         license="Published by NIST, but most definitions are quoted verbatim from the cited sources (e.g. ISO/IEC TS 5723:2022, IEEE standards, "
                 "OECD, FDA), which keep their own copyright; no license notice in the file.",
         notes="First sheet ('Glossary') only; 448 rows x 13 columns. Kept under .local/ (verbatim ISO/IEC and IEEE text)."),
    dict(id="nist-trustworthy-ai-glossary-pdf",
         title="The Language of Trustworthy AI: An In-Depth Glossary of Terms (glossary sheet, PDF export)",
         identifier="NIST AIRC Glossary (beta)", publisher=NIST, version="Beta; live Google Sheets export retrieved 2026-09-26",
         published="2026-09-26", role="supplementary", mediaType=PDF,
         path="supplementary/.local/glossary/language-of-trustworthy-ai-glossary.pdf",
         url="https://docs.google.com/spreadsheets/d/e/2PACX-1vTRBYglcOtgaMrdF11aFxfEY3EmB31zslYI4q2_7ZZ8z_1lKm7OHtF0t4xIsckuogNZ3hRZAaDQuv_K/pub?output=pdf",
         landingPage="https://airc.nist.gov/glossary/",
         license="Published by NIST, but most definitions are quoted verbatim from the cited sources (e.g. ISO/IEC TS 5723:2022, IEEE standards, "
                 "OECD, FDA), which keep their own copyright; no license notice in the file.",
         notes="Google Sheets PDF rendering (22 pages). Kept under .local/ (verbatim ISO/IEC and IEEE text)."),
    dict(id="nist-ai-100-5e2025",
         title="A Plan for Global Engagement on AI Standards", identifier="NIST AI 100-5e2025", publisher=NIST,
         version="2025 edition (revised April 2025; first edition July 26, 2024)", published="2025-04-29",
         role="supplementary", mediaType=PDF, path="supplementary/NIST.AI.100-5e2025.pdf",
         url="https://nvlpubs.nist.gov/nistpubs/ai/NIST.AI.100-5e2025.pdf",
         landingPage="https://www.nist.gov/artificial-intelligence/ai-standards", license=PD,
         notes="DOI 10.6028/NIST.AI.100-5e2025. Standards-engagement plan 'guided by principles set out in the NIST AI Risk Management Framework' "
               "(AIRC). Date = PDF creation/upload date of the E2025 edition (2025-04-29)."),
    dict(id="americas-ai-action-plan",
         title="Winning the Race: America’s AI Action Plan", identifier="America's AI Action Plan",
         publisher="The White House (Executive Office of the President)", version="July 2025", published="2025-07-23",
         role="supplementary", mediaType=PDF, path="supplementary/Americas-AI-Action-Plan.pdf",
         url="https://www.whitehouse.gov/wp-content/uploads/2025/07/Americas-AI-Action-Plan.pdf",
         landingPage="https://www.whitehouse.gov/releases/2025/07/white-house-unveils-americas-ai-action-plan/", license=PD,
         notes="Not a NIST publication; kept as the source of the AI RMF revision mandate. Recommended policy action (printed page 4, PDF page 7): 'Led by the Department "
               "of Commerce (DOC) through the National Institute of Standards and Technology (NIST), revise the NIST AI Risk Management Framework "
               "to eliminate references to misinformation, Diversity, Equity, and Inclusion, and climate change.' The NIST AI RMF FAQ cites this plan."),
    dict(id="nist-ai-100-1-japanese",
         title="Artificial Intelligence Risk Management Framework (AI RMF 1.0) - Japanese translation", identifier="NIST AI 100-1 (jpn)",
         publisher=NIST, version="Official translation of AI RMF 1.0 (PDF created 2024-07-31)", published="2024-07-31",
         role="supplementary", mediaType=PDF, path="supplementary/.local/translations/NIST.AI.100-1.jpn.pdf",
         url="https://nvlpubs.nist.gov/nistpubs/ai/NIST.AI.100-1.jpn.pdf",
         landingPage="https://www.nist.gov/itl/ai-risk-management-framework/ai-risk-management-framework-resources",
         license="Official U.S. Government Translation. Translated by the Government of Japan with review for NIST by TaikaTranslation LLC. The "
                 "official English language version of this publication is available free of charge from NIST at https://doi.org/10.6028/NIST.AI.100-1.",
         notes="Translation not authored by NIST (translated by the Government of Japan); its copyright status is not stated, so it is kept under "
               ".local/. Not authoritative: the English AI 100-1 is the official version. Date = PDF creation date; file re-saved 2025-03-24."),
    dict(id="nist-ai-100-1-arabic",
         title="Artificial Intelligence Risk Management Framework (AI RMF 1.0) - Arabic translation", identifier="NIST AI 100-1 (ara)",
         publisher=NIST, version="Official translation of AI RMF 1.0 (PDF created 2023-12-05)", published="2023-12-05",
         role="supplementary", mediaType=PDF, path="supplementary/.local/translations/NIST.AI.100-1.ara.pdf",
         url="https://nvlpubs.nist.gov/nistpubs/ai/NIST.AI.100-1.ara.pdf",
         landingPage="https://www.nist.gov/itl/ai-risk-management-framework/ai-risk-management-framework-resources",
         license="Official Government Translation. Document translated by TaikaTranslation LLC. The official English language version of this "
                 "publication is available free of charge from NIST at https://doi.org/10.6028/NIST.AI.100-1.",
         notes="Translation produced by a contractor (TaikaTranslation LLC); copyright status not stated, so it is kept under .local/. Not "
               "authoritative. Date = PDF creation date; file re-saved 2025-03-24."),
]

KEYS = ["id", "title", "identifier", "publisher", "version", "published", "role", "mediaType", "path", "url", "landingPage",
        "sha256", "bytes", "license", "notes"]


def main():
    docs = []
    ids = set()
    for d in DOCS:
        assert d["id"] not in ids, d["id"]
        ids.add(d["id"])
        p = ROOT / d["path"]
        rec = OrderedDict()
        for k in KEYS:
            if k == "path":
                rec[k] = "nist-ai-rmf/" + d["path"]
            elif k == "sha256":
                rec[k] = sha256(p)
            elif k == "bytes":
                rec[k] = p.stat().st_size
            else:
                rec[k] = d[k]
        docs.append(rec)
    man = OrderedDict([("framework", "nist-ai-rmf"),
                       ("title", "NIST AI Risk Management Framework (AI RMF) — official documentation corpus"),
                       ("retrieved", "2026-09-26"), ("documents", docs)])
    (ROOT / "manifest.json").write_text(json.dumps(man, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"wrote {ROOT / 'manifest.json'}: {len(docs)} documents")


if __name__ == "__main__":
    main()
