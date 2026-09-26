# AI governance frameworks: landscape and recommendation for Visua

Prepared on 2026-09-26 for the Visua product owner, who asked: "what are other choices for AI Governance?" Visua is adding the NIST AI RMF (AI 100-1) with the Generative AI Profile (AI 600-1). This report maps the alternatives, checks each one's status on 2026-09-26, and ranks what to add next.

---

## How to read this report

Each factual statement cites a numbered source listed in §7.

| Label | Meaning |
|---|---|
| **[P]** | Primary: the publisher, regulator, legislature or standards body, fetched on 2026-09-26. |
| **[P-M]** | Primary mirror: a national standards body's copy of ISO project data. |
| **[3P]** | Third party: law firms, trade press, vendors. Used only where I could not open a primary source. |
| **[V]** | Visua's own count or analysis of primary data (method stated). |
| **[U]** | Unverified or conflicting. Treat as provisional. |

**Method and coverage**

- I read the full EUR-Lex text of Regulation (EU) 2026/1744, the Texas and California bill texts, the OCC bulletin, the OMB memoranda and the AI Action Plan. I counted AI RMF and AI 600-1 elements from NIST's own files.
- iso.org, coe.int, consilium.europa.eu and oecd.org press pages blocked automated access, and EUR-Lex rate-limited later requests.

---

## Executive summary

- **The choices fall into five kinds.** (1) ISO/IEC 42001, the certifiable management-system standard, and its ISO family. (2) Binding law: the EU AI Act, U.S. state laws and Asian statutes. (3) NIST profiles and overlays on frameworks Visua already ships: the Cyber AI Profile (CSF 2.0) and COSAiS (SP 800-53). (4) Assurance schemes: CSA AICM and STAR for AI, HITRUST AI, AIUC-1, IEEE CertifAIEd. (5) Threat taxonomies (OWASP, MITRE ATLAS, SAIF/CoSAI) and principles (OECD, G7, UNESCO, Council of Europe).
- **EU AI Act dates changed.** Regulation (EU) 2026/1744, the Digital Omnibus on AI, in force since 27 July 2026, moves Annex III high-risk obligations to **2 December 2027** and Annex I (product) high-risk obligations to **2 August 2028**. It adds nudification and CSAM prohibitions from **2 December 2026**, the same date by which generative systems already on the market must meet Article 50(2) marking [1]. Prohibitions (since 2 February 2025), GPAI obligations (since 2 August 2025) and the general date (2 August 2026, which includes Article 50) are unchanged [2]. The first harmonised standard, EN 18286 (quality management), was approved in June 2026, but I found no Official Journal citation yet [10, 11].
- **U.S. federal policy is deregulatory and favors preemption.** EO 14110 and OMB M-24-10 were replaced [78, 79]. The AI Action Plan told NIST to revise the AI RMF [81], but I found no revision draft [25]. EO 14365 created a DOJ litigation task force against state AI laws [83].
- **U.S. states moved in opposite directions.**
  - Colorado repealed and replaced its AI Act. SB 26-189 takes effect on 1 January 2027 and drops the risk-management program and impact assessments [88, 89].
  - Texas TRAIGA (in force since 1 January 2026) gives a defense for substantial compliance with NIST AI 600-1 "or another nationally or internationally recognized" AI risk framework [93], which directly rewards Visua's AI RMF work.
- **Banking model risk guidance changed.** SR 11-7 was superseded on 17 April 2026 by interagency guidance that excludes generative and agentic AI [108].
- **ISO/IEC 42001 has the strongest buyer pull among voluntary options.** Microsoft requires it from suppliers whose AI services involve "Sensitive Use" [48], and CSA STAR for AI Level 2 requires it [52].

**Recommendation: what to add after the AI RMF and AI 600-1**

| Rank | Add | Model it as | Why |
|---|---|---|---|
| 1 | **ISO/IEC 42001:2023** (with 42005 and 23894 as references) | Framework (certifiable), license-aware skeleton | Buyer demand, accredited certification, an AI RMF crosswalk, shared ISO engine with ISO 27001 |
| 2 | **EU AI Act** as amended by 2026/1744 | Regulatory obligations with deadlines, by role and risk class | Binding; deadlines on 2 Dec 2026, 2 Aug 2027, 2 Dec 2027 and 2 Aug 2028; reusable text |
| 3 | **NIST Cyber AI Profile (IR 8596) and COSAiS** | Draft-labelled profiles and overlays on CSF 2.0 and SP 800-53 | Public domain; reuses Visua's flagship graphs; the federal path |
| 4 | **U.S. state AI obligations** (TX, CA, CO, NY, NYC, IL) | Regulatory obligations with deadlines | Texas AI 600-1 defense; California and Colorado dates in 2026–2028; volatile under preemption |
| 5 | **MITRE ATLAS and OWASP LLM/Agentic Top 10** (CSA AICM optional, under license) | Threat lenses mapped to controls | Open licenses, machine-readable data, demand for agentic security |

---

## 1. What an AI governance offering needs in Visua

All of these regimes hinge on the same primitives: an **AI system inventory**, each organization's **role** (developer or provider, deployer, importer), a **risk or impact classification**, **impact assessments**, and **lifecycle evidence** such as evaluations, red-team results, human-oversight records and incident logs. The AI RMF's MAP function, ISO/IEC 42005, the EU AI Act classification, and the Colorado and CCPA "automated decision-making technology" (ADMT) rules all consume them [27, 36, 1, 88, 92][V]. Build them once, and each framework becomes a lens on shared evidence.

---

## 2. Voluntary frameworks and standards

### 2.1 Core candidates

| Item | Publisher · type | Status as of 2026-09-26 | Scope · structure · certification | AI RMF overlap · crosswalk | License · machine-readable | Demand · Visua effort |
|---|---|---|---|---|---|---|
| **NIST AI RMF 1.0 + AI 600-1** (baseline) | NIST (US) · voluntary framework and profile | AI RMF 1.0 (Jan 2023) [26] is current and "being revised as part of the White House AI Action Plan"; no draft found [25]. The plan asks NIST to remove references to misinformation, DEI and climate [81]. AI 600-1 (26 Jul 2024) is current [25]. Critical-infrastructure profile concept note: 7 Apr 2026 [30]. | Any organization across the AI lifecycle. Core: 4 functions, 19 categories, **72 subcategories** (GOVERN 19, MAP 18, MEASURE 22, MANAGE 13) [27][V]. AI 600-1: **12 GAI risks** and **212 suggested actions** (GV 58, MP 39, MS 72, MG 43) covering 49 subcategories [28][V: count of unique action IDs]. No certification. | Baseline. NIST's AI Resource Center lists 12 crosswalks (§4) [29]. | Public domain. Playbook in JSON, CSV and XLSX (72 entries) [27]; AI 600-1 is PDF only, as far as I found; not in the CPRT exports I probed [34][V]. | Texas defense [93]; CSA AICM maps it [49]. OMB M-25-21 does not cite it [79][V]. In progress. |
| **ISO/IEC 42001:2023** AI management system | ISO/IEC JTC 1/SC 42 · certifiable standard | Edition 1 (published 18 Dec 2023, stage 60.60); no amendment or revision project listed [35]. Adopted unchanged as EN ISO/IEC 42001:2026 [44][3P]. | Organizations that provide, develop or use AI. Clauses 4–10 (ISO harmonized structure) plus Annex A: **38 controls under 9 objectives** (A.2–A.10) [45][3P]. Accredited third-party audit; ISO/IEC 42006:2025 governs certification bodies [37]. | A 42001 ↔ AI RMF crosswalk written by **Microsoft** is hosted by NIST (undated PDF) [29]. CSA AICM maps both [49]. EN 18286 Annex D reportedly maps to 42001 Annex A [14][3P]. | © ISO: IDs and Visua-written titles only. ISO's license reportedly forbids AI/ML ingestion and opts out of the EU text-and-data-mining exception [46][U]. No machine-readable edition. | Microsoft SSPA: **required** for Sensitive Use AI suppliers [48]. STAR for AI Level 2 [52]. About 350 certified organizations by spring 2026 [47][3P][U]. Effort M–L. |
| **NIST Cyber AI Profile** (IR 8596) | NIST · CSF 2.0 Community Profile | Initial preliminary draft of 16 Dec 2025; comments closed 30 Jan 2026. No later draft on CSRC [31, 33]. | Organized by CSF 2.0 Functions, Categories and Subcategories across three focus areas: Secure, Defend and Thwart [31]. No certification. | Native to CSF 2.0, which already links to SP 800-53 through OLIR in Visua. | Public domain · PDF | CSF users; federal. Effort S. |
| **COSAiS**: SP 800-53 overlays for AI | NIST · control overlays | Concept paper (14 Aug 2025); annotated outline for predictive AI (8 Jan 2026). Five overlays planned: GenAI assistant, predictive AI, single-agent, multi-agent, AI developers [32]. No public draft overlay yet [33]. | Tailors SP 800-53 controls per use case; assessed within the RMF [V]. | Native to SP 800-53. | Public domain · format of future releases unknown [U] | Federal and FedRAMP. Effort S–M once drafts exist. |
| **CSA AI Controls Matrix (AICM) v1.1 + STAR for AI** | Cloud Security Alliance · control catalog and assurance program | v1.1 released 22 Jun 2026: **247 control objectives, 18 domains**, a 320-question AI-CAIQ [49, 50]. STAR for AI Level 1 is a self-assessment; Level 2 needs ISO/IEC 42001 certification plus a validated AI-CAIQ [52]. | Organizations building or buying AI services [V]. | Maps to ISO/IEC 42001, NIST AI RMF and AI 600-1, the EU AI Act, BSI AIC4 and AIUC-1 [49]. | Free download; commercial use in products needs a CSA license (FAQ dated 2026-03-13; terms not read) [51][U]. **JSON, YAML and OSCAL bundle** [50]. | Vendor questionnaires (the planned questionnaire agent). Effort M plus a license. |
| **HITRUST AI Security (ai1/ai2) and AI Risk Management** | HITRUST · certifiable add-on | HAA 2024-008 (6 Dec 2024) for CSF v11.4.0+. ai1 builds on e1 or i1 (minimum score 83); ai2 builds on r2 (minimum 62) [54]. Up to 44 AI requirement statements [55]. The AI Risk Management assessment has "51 controls aligned with ISO/NIST" [53]. | Added to e1, i1 or r2, or standalone [53, 54]. | "Harmonized to NIST, ISO, and OWASP" [53]. | Licensed CSF; not redistributable [U] | Healthcare [V]. Effort L; pair with a future HITRUST roadmap item. |
| **AIUC-1** | Artificial Intelligence Underwriting Company · AI-agent certification | Launched 22 Jul 2025; quarterly releases, the latest on 15 Jul 2026 [56]. | 51 requirements and 130 controls in six pillars [57][3P]. | Publishes crosswalks; list not verified [56]. | License unknown [U] | Early market [U]. Watch. |

### 2.2 ISO/IEC supporting standards

| Standard | Status as of 2026-09-26 | Use in Visua (IDs only) |
|---|---|---|
| ISO/IEC 42005:2025, AI system impact assessment | Published 28 May 2025 [36]; INCITS crosswalk to the AI RMF (14 Aug 2025) [29] | Impact-assessment workflow shared by 42001 and AI RMF MAP |
| ISO/IEC 42006:2025, certification body requirements | Published 7 Jul 2025 [37] | Auditor-workspace context |
| ISO/IEC 23894:2023, AI risk management guidance | Published 6 Feb 2023 [40]; revised INCITS crosswalk to the AI RMF (14 Aug 2025) [29] | Risk-process guidance reference |
| ISO/IEC 38507:2022, governance implications of AI | Published 8 Apr 2022 [41] | Board-level governance reference |
| ISO/IEC 22989:2022 (terminology) and 23053:2022 (ML framework) | Published; amendments in progress (22989 FDAmd 1 and CD Amd 2; 23053 FDAmd 1 and AWI Amd 2) [42, 43] | Glossary and ontology |
| ISO/IEC 27090, AI security threats guidance | Stage 60.00, "under publication", since 19 Aug 2026; **not yet published** [38] | Future AI security overlay |
| ISO/IEC 27091, AI privacy protection | FDIS, stage 50.00, since 13 Jul 2026 [39] | Future privacy overlay |

### 2.3 Principles, national and professional frameworks

| Item | Publisher · type | Status as of 2026-09-26 | Notes for Visua |
|---|---|---|---|
| OECD AI Principles | OECD · intergovernmental recommendation | Updated May 2024. The page shows 47 adherents; a third party reports 49 [21][U]. Five values-based principles and five policy recommendations [21]. | Reference only. © OECD. |
| OECD Hiroshima AI Process (HAIP) Reporting Framework | OECD for the G7 · voluntary transparency report | Version 2.0 launched on 28 May 2026, with role-based tracks and SME access; reports due 30 Sep 2026; more than 50 organizations pledged [22] | Possible later **export** from Visua evidence. |
| G7 Hiroshima Code of Conduct | G7 · voluntary | Published 30 Oct 2023 [23] | Reference only. |
| UNESCO Recommendation on the Ethics of AI | UNESCO · intergovernmental | Adopted 2021; the Readiness Assessment Methodology is for states and the Ethical Impact Assessment is for projects [24] | Low commercial demand. |
| Singapore Model AI Governance Framework for **Agentic AI**, and AI Verify | IMDA/MDDI · voluntary | Launched 22 Jan 2026 with four dimensions: bound risks, human accountability, technical controls, end-user responsibility [60]. Updated 20 May 2026 [61][3P]. The AI Verify toolkit is Apache-2.0 [62]. NIST and IMDA crosswalks exist [29]. | Fits **governing Visua's own agents** [V]. |
| UK: AI Security Institute, AIME, AI Cyber Security Code of Practice, ICO | DSIT, NCSC, ICO · voluntary guidance | The AI Safety Institute was renamed the AI Security Institute on 14 Feb 2025 [66]. The AIME tool was **not finalized**; DSIT's Dec 2025 response pivots to guidance on foundational governance for SMEs [63]. The Code of Practice (Jan 2025) was the basis for ETSI TS 104 223 and EN 304 223 [64, 65]. ICO consulted on ADM guidance until 29 May 2026 [67]. | Monitor. |
| Canada Voluntary Code (generative AI) | ISED · voluntary | Active [69]. The AIDA bill died on 6 Jan 2025 [70][3P]. | Reference only. |
| Japan AI Guidelines for Business | METI/MIC · voluntary | v1.2 dated 31 Mar 2026 [103][3P]. Japan's AI Safety Institute published a crosswalk to the AI RMF [29]. | Monitor. |
| IEEE CertifAIEd / 7000-series | IEEE · product and professional certification | Active. Criteria: transparency, accountability, algorithmic bias, privacy [58]. IEEE 7003-2024 covers algorithmic bias [59]. | Low demand. © IEEE. |

### 2.4 AI security taxonomies and baselines

| Item | Status as of 2026-09-26 | Structure | License · data |
|---|---|---|---|
| OWASP Top 10 for LLM Applications **2026** | Published 3 Aug 2026 [71] | 10 risks | CC BY-SA 4.0 [71] |
| OWASP Top 10 for Agentic Applications 2026 | Published 9 Dec 2025 [72] | ASI01–ASI10 [72] | Likely CC BY-SA, as [71] [U] |
| OWASP AI Exchange | Active; contributed text to ISO/IEC 27090 and prEN 18282 [73] | Threats and controls | **CC0** [73] |
| MITRE ATLAS | v2026.09 released 15 Sep 2026 [74] | 16 tactics, 120 techniques, 88 sub-techniques, 40 mitigations, 73 case studies [74] | **Apache-2.0** data repository [75]; YAML, with STIX tooling [74] |
| Google SAIF / CoSAI | SAIF risk-map data published [76]; CoSAI (under OASIS) published an MCP security taxonomy on 27 Jan 2026 [77] | Risk map of risks and controls | SAIF data is Apache-2.0 [76] |
| ETSI EN 304 223 V2.1.1 | Published Dec 2025 [65] | 13 principles; 72 provision IDs [65][V] | © ETSI: free PDF, no reproduction [65] |

---

## 3. Laws and regulations

### 3.1 EU AI Act (Regulation (EU) 2024/1689), timeline as amended

| Date | What applies | Source |
|---|---|---|
| 2 Feb 2025 | Chapters I–II: definitions, AI literacy (Article 4, reworded by the Omnibus as a duty to "take measures to support" literacy) and prohibitions | [2, 1] |
| 2 Aug 2025 | GPAI model obligations (Chapter V), governance, notified bodies, penalties (except Article 101) | [2] |
| 2 Aug 2026 | General application, including Article 50 transparency and Commission fines on GPAI providers | [2, 7] |
| **2 Dec 2026** | New prohibitions (Article 5(1)(ba) and (bb): non-consensual intimate imagery and CSAM). Article 50(2) marking for generative systems placed on the market before 2 Aug 2026 | [1] |
| 2 Aug 2027 | GPAI models placed on the market before 2 Aug 2025 must comply; national sandboxes must be operational | [3, 1] |
| **2 Dec 2027** | High-risk obligations for Annex III systems (Chapter III, Sections 1–3) | [1] |
| **2 Aug 2028** | High-risk obligations for Annex I systems (products) | [1] |
| 2 Aug 2030 | Legacy high-risk systems used by public authorities | [1] |

| Attribute | Finding |
|---|---|
| Legislative path of the Omnibus | Proposed 19 Nov 2025; political agreement 7 May 2026 [15][3P]; Parliament position 16 Jun 2026; Council decision 29 Jun 2026; signed 8 Jul 2026; published as OJ L 2026/1744 on 24 Jul 2026 [1] |
| Who it applies to | Providers placing AI systems or GPAI models on the EU market wherever they are established; deployers in the EU; non-EU providers and deployers whose output is used in the EU; importers, distributors, product manufacturers and authorised representatives [4]. The Omnibus adds Article 4a (special-category data for bias correction), proportionality for SMEs and small mid-caps, and an AI Office template for fundamental rights impact assessments (FRIA) [1]. |
| Conformity route | Presumption of conformity comes only from harmonised standards cited in the OJ [14]. EN 18286 (QMS) was approved in June 2026, with the OJ reference "expected … later in 2026" [11]. Other JTC 21 drafts (risk management, logging, cybersecurity, data, bias, conformity assessment) are at enquiry or drafting, targeted for Q4 2026 [8, 12, 13]. ISO/IEC 42001 gives **no** presumption [14][3P]. |
| Codes of practice | GPAI Code: published 10 Jul 2025 and confirmed adequate; 21 signatories, with xAI signing only the safety and security chapter [6]. Marking and labelling code: final on 10 Jun 2026; about 190 signatories by the end of July 2026 [7]. |
| Guidelines | Draft high-risk classification guidelines published 19 May 2026; I found no final version [9]. |
| AI RMF overlap | NIST's crosswalk (Jan 2023) predates the final Act [29]. CSA AICM maps the Act [49]. |
| License · data | EUR-Lex documents are reusable, including commercially [5]; HTML and PDF with ELI identifiers [1]. Harmonised standards are copyrighted and sold [U]. |
| Demand · effort | Legal force for any AI provider or deployer with EU exposure [4]. Effort L. |

### 3.2 United States: federal

| Instrument | Status as of 2026-09-26 |
|---|---|
| EO 14110 (2023) | Revoked by EO 14148 on 20 Jan 2025 [78] |
| EO 14179, "Removing Barriers to American Leadership in AI" (23 Jan 2025) | In force; the basis for OMB M-25-21 [79] |
| OMB M-25-21 (3 Apr 2025) | Replaces M-24-10. Requires chief AI officers, AI strategies and use-case inventories, plus minimum practices for "high-impact AI" (pre-deployment testing, AI impact assessment) within 365 days [79]. It does not cite the AI RMF [79][V]. |
| OMB M-25-22 (3 Apr 2025) | Replaces M-24-18 on AI acquisition [80][3P] |
| America's AI Action Plan (Jul 2025) | Directs the AI RMF revision and gives NIST's Center for AI Standards and Innovation (CAISI) an evaluation role [81] |
| EO 14319 and OMB M-26-04 (11 Dec 2025) | "Unbiased AI Principles" become contract terms for LLMs; agency policies due by 11 Mar 2026 [82] |
| EO 14365 (11 Dec 2025) | Orders a DOJ task force, a Commerce review of "onerous" state laws, an FTC statement, an FCC proceeding and a preemption bill, with carve-outs such as child safety [83]. The task force was formed on 9 Jan 2026 [87][3P]. A White House legislative framework followed on 20 Mar 2026 [84][3P]. A congressional preemption draft has stalled [85][3P]. **Commerce's evaluation: publication not confirmed** [U]. |

### 3.3 United States: states

| Law | Status as of 2026-09-26 | Duties · framework hook |
|---|---|---|
| Colorado SB 24-205 → **SB 26-189** | Signed 14 May 2026; effective **1 Jan 2027** [88, 89]. xAI sued in the District of Colorado; DOJ intervened on 24 Apr 2026; enforcement has been suspended by court order since 27 Apr 2026 [86][3P]. | ADMT in consequential decisions: developer documentation, deployer notice, explanation of adverse outcomes within 30 days, correction, human review; AG rules [88, 89]. **No NIST or ISO reference; the risk program and impact assessments were removed** [88, 89]. |
| **Texas TRAIGA** (HB 149) | Effective **1 Jan 2026** [93] | Prohibited practices and AG enforcement. **Defense for substantial compliance with NIST AI 600-1 or another recognized framework** [93]. |
| California SB 53 (Transparency in Frontier AI Act, TFAIA) | Approved 29 Sep 2025 [90]; effective 1 Jan 2026 [98][3P] | Large frontier developers must publish a frontier AI framework, including how it incorporates national and international standards [90]. |
| California AI Transparency Act (SB 942 as amended by AB 853) | Operative **2 Aug 2026**. Platform duties from 1 Jan 2027; capture devices from 1 Jan 2028 [91]. | Provenance disclosures and a detection tool |
| California CCPA regulations (ADMT, risk assessments, cybersecurity audits) | Effective 1 Jan 2026; ADMT compliance from **1 Jan 2027**; risk-assessment attestations due **1 Apr 2028**; audits 2028–2030 by revenue [92] | ADMT notices, opt-outs and risk assessments |
| New York RAISE Act | Chapter amendment signed 27 Mar 2026; effective **1 Jan 2027** [94][3P] | Frontier developers; 72-hour incident reports [94][3P] |
| NYC Local Law 144 | In force. A Dec 2025 State Comptroller audit criticized enforcement [95]. | Annual bias audits and notices for automated employment decision tools |
| Illinois HB 3773 | Effective 1 Jan 2026 [96] | Bans discriminatory AI in employment decisions; requires notice |
| Utah AI Policy Act | Amended in 2025; sunsets 1 Jul 2027 [97][3P] | Disclosure on request and for high-risk interactions |

### 3.4 Other jurisdictions

| Jurisdiction · instrument | Status as of 2026-09-26 |
|---|---|
| Council of Europe Framework Convention (CETS 225), a treaty | The EU deposited its ratification on 15 May 2026, after Council Decision (EU) 2026/1080 [17, 18, 19]. Entry into force needs five ratifications, including three member states. Sources **conflict** on whether it is in force; the most recent says it is not [19, 20][U]. |
| China | Labeling Measures and GB 45438-2025, effective 1 Sep 2025 [100][3P]. Cybersecurity Law amendments with AI provisions, effective 1 Jan 2026 [101][3P]. Anthropomorphic AI measures, effective 15 Jul 2026 [102][3P]. |
| South Korea, AI Basic Act | Effective 22 Jan 2026. Duties: notices for high-impact and generative AI, risk management, impact assessment, and a domestic representative above revenue thresholds. Fines are deferred for at least one year [99]. |
| Japan, AI Promotion Act | Enacted 28 May 2025, with no penalties; AI Basic Plan approved 23 Dec 2025 [103][3P] |
| Brazil, PL 2338/2023 | Passed the Senate on 10 Dec 2024; awaiting a rapporteur's opinion in the Chamber [104][3P] |
| India | Voluntary AI Governance Guidelines (5 Nov 2025). Labeling rules for synthetic content took effect on 20 Feb 2026 [105][3P]. |
| Canada | Bill C-36 (privacy, with no AI part) had its first reading on 15 Jun 2026 [68] |
| Italy, Law 132/2025 | In force since 10 Oct 2025 [106][3P] |
| Vietnam, AI Law 134/2025/QH15 | Effective 1 Mar 2026, with grace periods into 2027 [107][3P] |

### 3.5 Sectoral

| Regime | Status as of 2026-09-26 |
|---|---|
| FDA, AI-enabled device software functions | The lifecycle guidance is still a **draft** (Jan 2025; docket FDA-2024-D-4488) [110]. PCCP guidance is final [111]. |
| U.S. bank model risk | OCC Bulletin 2026-13 and SR 26-2 (17 Apr 2026) rescind the SR 11-7 guidance stack. The new guidance is principles-based and aimed at banks with more than $30 billion in assets. **Generative and agentic AI are out of scope**, and an RFI on AI is planned [108, 109]. |
| NAIC Model Bulletin on insurers' AI | Adopted by 24 states and DC as of 1 Apr 2026. CA, CO, NY and TX have their own AI rules for insurers [112]. A 12-state pilot of an AI evaluation tool is running in 2026 [113][3P]. |
| EU DORA | Applies since 17 Jan 2025 [16]. AI used by financial entities falls under DORA's ICT and third-party risk rules [V]. |

---

## 4. Crosswalks: where AI RMF work can be reused

Every official AI RMF crosswalk is a PDF; none is in NIST's OLIR format. Each needs extraction and an authority label in the Nexus [29][V].

| Pair | Producer | Date · format | Suggested Visua authority label |
|---|---|---|---|
| AI RMF ↔ ISO/IEC 42001 | **Microsoft**, hosted by NIST | Undated · PDF [29] | Third party, listed by NIST |
| AI RMF ↔ ISO/IEC 23894 (revised); AI RMF ↔ ISO/IEC 42005 | INCITS/AI | 14 Aug 2025 · PDF [29] | Standards body (U.S. national body) |
| AI RMF ↔ OECD, draft EU AI Act and EO 13960 | NIST | 26 Jan 2023 · PDF [29] | NIST, **stale** (written against the draft Act) |
| AI RMF ↔ AI Verify; AI 600-1 ↔ AI Verify | NIST (2023); IMDA (28 May 2025) [29] | PDF | Government |
| AI RMF ↔ Japan and Korea guidance; ISO 5338/5339 | Japan's AISI, Korea's TTA, INCITS [29] | PDF | Government or standards body |
| AICM ↔ 42001, AI RMF and 600-1, EU AI Act, AIC4, AIUC-1 | CSA | v1.1, 2026 · XLSX, JSON, OSCAL [49, 50] | Industry (licensed) |
| EN 18286 Annex D ↔ 42001 Annex A | CEN-CENELEC | 2026 · licensed [14][3P] | Standards body (licensed) |
| Cyber AI Profile ↔ CSF 2.0; COSAiS ↔ SP 800-53 | NIST | Draft, or not yet published [31, 32] | NIST (draft) |

---

## 5. Recommendation

**1. ISO/IEC 42001:2023 (framework, certifiable).**
- It is certifiable by accredited bodies, with ISO/IEC 42006:2025 setting their requirements [37].
- Buyers require it: Microsoft for Sensitive Use AI suppliers [48]; CSA STAR for AI Level 2 [52].
- It reuses AI RMF work through the NIST-hosted Microsoft crosswalk and CSA's mappings [29, 49].
- It shares clauses 4–10 with ISO 27001, which is already on the roadmap [45].
- **Model:** clause requirements plus 38 Annex A controls with a Statement of Applicability. Use Visua-written titles, as with the SOC 2 skeleton, and overlay the customer's licensed text.
- **Extend `licensedTextToModel()` to ISO text** by default, given ISO's reported restriction on AI use [46][U].
- Add ISO/IEC 42005 as the impact-assessment workflow (IDs only) [36].

**2. EU AI Act as amended (regulatory obligations with deadlines).**
- It is binding, including on non-EU providers [4]. Obligations already apply: prohibitions, GPAI duties, Article 50 and AI literacy. The next deadlines are 2 Dec 2026, 2 Aug 2027, 2 Dec 2027 and 2 Aug 2028 [1, 2, 3].
- The text is reusable, so Visua can quote it verbatim with article citations [5].
- **Model:** a new *Obligation* object: role × classification × trigger × effective date × citation. Pin the dates in tests, as Visua does for official counts.
- Treat the codes of practice as optional overlays [6, 7]. Add EN 18286 as a licensed overlay only once the OJ cites it [11].
- Do not claim a "presumption of conformity" from ISO/IEC 42001 [14].

**3. NIST Cyber AI Profile and COSAiS (profiles and overlays).**
- Both are public domain and attach AI directly to CSF 2.0's 106 outcomes and SP 800-53's 1,014 controls and enhancements, which Visua already ships [31, 32].
- Both are drafts: the Profile is at initial preliminary draft, and COSAiS has only an outline [31, 32, 33].
- Ship the Profile labelled "draft" and re-ingest on each release. Hold COSAiS until an overlay draft appears.

**4. U.S. state obligations pack (regulatory obligations with deadlines).**
- Start with Texas: its AI 600-1 defense makes Visua's AI RMF and 600-1 evidence legally useful [93].
- Then California's dates (2 Aug 2026, 1 Jan 2027, 1 Apr 2028), Colorado SB 26-189 (1 Jan 2027), NY RAISE, NYC LL 144 and Illinois [88, 91, 92, 94–96].
- Keep this pack light. Federal preemption efforts and litigation (EO 14365; the xAI case) can change it quickly [83, 86].

**5. Threat lenses: MITRE ATLAS and OWASP (optionally with CSA AICM).**
- ATLAS (Apache-2.0, versioned YAML releases) and OWASP (CC BY-SA 4.0 and CC0) are cheap to ingest and cover agentic risks [71, 73, 74, 75].
- Model them as lenses that link threats to AI 600-1 actions and 42001 or 800-53 controls, not as compliance frameworks. OWASP's share-alike license means Visua should store IDs and links, not derived text [71].
- Add CSA AICM, and its OSCAL bundle, only with a CSA commercial license and customer demand for STAR for AI [50, 51].

**Deprioritize for now**
- HITRUST AI: pair it with a future HITRUST roadmap item [53, 54].
- AIUC-1: fast-moving; watch [56].
- IEEE CertifAIEd [58].
- OECD, G7, UNESCO and the Council of Europe instruments: keep as references; a HAIP report export can come later [21–24].
- Singapore's agentic framework: use it internally to govern Visua's own agents [60].
- Other national statutes (§3.4): add obligation packs when customers operate there [99–107].

**Design notes**
- Keep the AI RMF ingestion version-aware, because a revision is pending [25, 81].
- Pin the counts in tests: 72 subcategories, and 12 risks and 212 actions for AI 600-1 [27, 28][V].
- NIST SP 1353 ipd (using AI for CSF analysis) describes Visua's own use case; comments close 15 Oct 2026 [33].

---

## 6. What I could not confirm

- Whether the Council of Europe Convention is in force. Sources conflict, and the treaty office blocked access [17, 19, 20].
- Whether Commerce published its EO 14365 evaluation of state laws, and which laws it names.
- An OJ citation for EN 18286. The publication date of ISO/IEC 27090 (it was "under publication" on 19 Aug 2026) [38].
- ISO's license text on AI use, which I saw only as a search extract [46]. CSA's AICM license terms [51].
- Third-party figures: about 350 ISO 42001 certificates [47], AIUC-1's counts [57], NY RAISE details [94], and OECD adherents (47 or 49) [21].
- Whether the NIST AI RMF revision has a release date [25].
- Whether Korea extends its grace on fines beyond January 2027 [99].

---

## 7. Sources

All accessed on 2026-09-26 unless another date is noted. "Search" means I relied on a search-engine extract because the page could not be opened.

### EU and European standards
- [1] [P] EUR-Lex, Regulation (EU) 2026/1744 (Digital Omnibus on AI): https://eur-lex.europa.eu/eli/reg/2026/1744/oj/eng
- [2] [P] AI Act Service Desk, Article 113: https://ai-act-service-desk.ec.europa.eu/en/ai-act/article-113
- [3] [P] AI Act Service Desk, Article 111: https://ai-act-service-desk.ec.europa.eu/en/ai-act/article-111
- [4] [P] AI Act Service Desk, Article 2 (scope): https://ai-act-service-desk.ec.europa.eu/en/ai-act/article-2
- [5] [P] EUR-Lex legal notice (reuse): https://eur-lex.europa.eu/content/legal-notice/legal-notice.html
- [6] [P] Commission, GPAI Code of Practice: https://digital-strategy.ec.europa.eu/en/policies/contents-code-gpai
- [7] [P] Commission, Code of Practice on AI-generated content: https://digital-strategy.ec.europa.eu/en/policies/code-practice-ai-generated-content
- [8] [P] Commission, AI Act standardisation: https://digital-strategy.ec.europa.eu/en/policies/ai-act-standardisation
- [9] [P] Commission, draft high-risk classification guidelines: https://digital-strategy.ec.europa.eu/en/library/draft-commission-guidelines-classification-high-risk-ai-systems
- [10] [P] CEN-CENELEC, EN 18286 in the spotlight: https://www.cencenelec.eu/news-events/news/2026/en-in-the-spotlight/2026-07-30-ai-quality-management/
- [11] [P] CEN-CENELEC, first standard approved under the AI Act: https://www.cencenelec.eu/news-events/news/2026/newsletter/ots-75-anec/
- [12] [P] CEN-CENELEC, acceleration decision (2025-10-23): https://www.cencenelec.eu/news-events/news/2025/brief-news/2025-10-23-ai-standardization/
- [13] [3P] KLA Digital, JTC 21 tracker (2026-06-29 snapshot): https://kla.digital/blog/jtc-21-standards-tracker
- [14] [3P] CSA research note, prEN 18286 and ISO/IEC 42001: https://labs.cloudsecurityalliance.org/research/csa-research-note-eu-ai-act-pren-18286-iso-42001-20260428-cs/
- [15] [3P] Bird & Bird, Omnibus provisional agreement: https://www.twobirds.com/en/insights/2026/digital-omnibus-on-ai-provisional-agreement-reached-at-the-may-trilogue
- [16] [P] (search) EIOPA, DORA: https://www.eiopa.europa.eu/digital-operational-resilience-act-dora_en

### International
- [17] [P] (blocked; search) Council of Europe, EU ratifies the Convention: https://www.coe.int/en/web/artificial-intelligence/-/european-union-ratifies-the-council-of-europe-framework-convention-on-artificial-intelligence
- [18] [P] (search) EUR-Lex, Council Decision (EU) 2026/1080: https://eur-lex.europa.eu/eli/dec/2026/1080/oj/eng
- [19] [3P] NicFab, EU ratification of CETS 225: https://www.nicfab.eu/en/posts/cets225-ratifica-ue/
- [20] [3P] BPDATA (2026-09-25): https://news.bpdata.com/article/why-ratification-of-the-first-binding-international-ai-8b4a61ab
- [21] [P] OECD.AI, AI Principles: https://oecd.ai/en/ai-principles
- [22] [P] OECD.AI, HAIP Reporting Framework 2.0: https://oecd.ai/en/haip-2-launch
- [23] [P] Commission library, Hiroshima Code of Conduct: https://digital-strategy.ec.europa.eu/en/library/hiroshima-process-international-code-conduct-advanced-ai-systems
- [24] [P] (search) UNESCO, Recommendation and RAM: https://www.unesco.org/en/artificial-intelligence/recommendation-ethics ; https://www.unesco.org/ethics-ai/en/ram

### NIST
- [25] [P] NIST, AI RMF: https://www.nist.gov/itl/ai-risk-management-framework
- [26] [P] NIST AI 100-1: https://nvlpubs.nist.gov/nistpubs/ai/nist.ai.100-1.pdf
- [27] [P] AI RMF Playbook and JSON: https://airc.nist.gov/airmf-resources/playbook/ ; https://airc.nist.gov/docs/playbook.json
- [28] [P] NIST AI 600-1: https://nvlpubs.nist.gov/nistpubs/ai/NIST.AI.600-1.pdf
- [29] [P] NIST AIRC, crosswalks: https://airc.nist.gov/airmf-resources/crosswalks/
- [30] [P] (search) NIST, critical-infrastructure profile concept note: https://www.nist.gov/programs-projects/concept-note-ai-rmf-profile-trustworthy-ai-critical-infrastructure
- [31] [P] NIST IR 8596 iprd: https://csrc.nist.gov/pubs/ir/8596/iprd
- [32] [P] NIST COSAiS: https://csrc.nist.gov/Projects/cosais
- [33] [P] CSRC AI news: https://csrc.nist.gov/news?sortBy-lg=NewsDateTime+DESC&ipp-lg=50&topics-lg=27491%7Cartificial+intelligence&topicsMatch-lg=ANY
- [34] [P] CPRT export API (pattern used by Visua's corpus): https://csrc.nist.gov/extensions/nudp/services/json/nudp/framework/version/CSF_2_0_0/export/json?element=all

### ISO/IEC and certification schemes
- [35] [P-M] ISO/IEC 42001: https://iss.rs/en/project/show/iso:proj:81230
- [36] [P-M] ISO/IEC 42005: https://iss.rs/en/project/show/iso:proj:44545
- [37] [P-M] ISO/IEC 42006: https://iss.rs/en/project/show/iso:proj:44546
- [38] [P-M] ISO/IEC 27090: https://iss.rs/en/project/show/iso:proj:56581
- [39] [P-M] ISO/IEC 27091: https://iss.rs/en/project/show/iso:proj:56582
- [40] [P-M] ISO/IEC 23894: https://iss.rs/en/project/show/iso:proj:77304
- [41] [P-M] ISO/IEC 38507: https://iss.rs/en/project/show/iso:proj:56641
- [42] [P-M] ISO/IEC 22989: https://iss.rs/en/project/show/iso:proj:74296
- [43] [P-M] ISO/IEC 23053: https://iss.rs/en/project/show/iso:proj:74438
- [44] [3P] iTeh, EN ISO/IEC 42001:2026: https://standards.iteh.ai/catalog/standards/cen/adc675e8-4669-4965-b4c1-c8f724832217/en-iso-iec-42001-2026
- [45] [3P] (search) Annex A structure: https://www.isms.online/iso-42001/annex-a-controls/ ; https://www.konfirmity.com/blog/iso-42001-controls
- [46] [P] (blocked; search) ISO licence agreement: https://www.iso.org/terms-conditions-licence-agreement.html
- [47] [3P] (search) Atoro, certificate count: https://atoro.io/how-many-companies-are-iso-42001-certified/
- [48] [P] Microsoft SSPA Program Guide v11 (Apr 2025): https://cdn-dynmedia-1.microsoft.com/is/content/microsoftcorp/microsoft/accex/documents/presentations/FY25-Program-Guide-v11_en-US.pdf
- [49] [P] CSA, AICM v1.1: https://cloudsecurityalliance.org/blog/2026/07/14/ai-controls-matrix-v1-1-strengthening-the-foundation-for-trustworthy-ai
- [50] [P] CSA, AICM artifact: https://cloudsecurityalliance.org/artifacts/ai-controls-matrix-v1-1
- [51] [P] CSA, licensing FAQ: https://cloudsecurityalliance.org/artifacts/ccm-aicm-licensing-faq
- [52] [P] CSA, STAR for AI: https://cloudsecurityalliance.org/star/ai
- [53] [P] HITRUST, AI Security Assessment: https://hitrustalliance.net/assessments-and-certifications/aisecurityassessment
- [54] [P] HITRUST, HAA 2024-008: https://hitrustalliance.net/advisories/haa-2024-008
- [55] [P] HITRUST, AI Security Assessment help: https://hitrustalliance.net/help/ai-sec-assessment
- [56] [P] AIUC-1 changelog: https://standard.aiuc-1.com/changelog/
- [57] [3P] (search) Workstreet, AIUC-1: https://www.workstreet.com/blog/what-is-aiuc-1
- [58] [P] IEEE CertifAIEd: https://standards.ieee.org/products-programs/icap/ieee-certifaied/
- [59] [P] (search) IEEE 7003-2024: https://ieeexplore.ieee.org/document/10851955

### National voluntary frameworks
- [60] [P] Singapore MDDI, agentic framework: https://www.mddi.gov.sg/newsroom/singapore-launches-new-model-ai-governance-framework-for-agentic-ai--/
- [61] [3P] Baker McKenzie, framework update: https://www.bakermckenzie.com/en/insight/publications/2026/06/singapore-imda-updates-model-ai-governance-framework-for-agentic-ai
- [62] [P] (search) AI Verify: https://github.com/aiverify-foundation/aiverify
- [63] [P] DSIT, AIME response (Dec 2025): https://assets.publishing.service.gov.uk/media/6981d0758c1e89ed1e91bb55/AI_Management_Essentials_tool_government_response.pdf
- [64] [P] (search) GOV.UK, AI Cyber Security Code of Practice: https://www.gov.uk/government/publications/ai-cyber-security-code-of-practice
- [65] [P] ETSI EN 304 223 V2.1.1: https://www.etsi.org/deliver/etsi_en/304200_304299/304223/02.01.01_60/en_304223v020101p.pdf
- [66] [P] (search) GOV.UK, AI Security Institute: https://www.gov.uk/government/organisations/ai-security-institute
- [67] [P] (search) ICO, ADM consultation: https://ico.org.uk/about-the-ico/ico-and-stakeholder-consultations/2026/03/ico-consultation-on-the-draft-guidance-about-automated-decision-making-including-profiling/
- [68] [P] (search) Parliament of Canada, C-36: https://www.parl.ca/legisinfo/en/bill/45-1/c-36
- [69] [P] (search) ISED, voluntary code: https://ised-isde.canada.ca/site/ised/en/voluntary-code-conduct-responsible-development-and-management-advanced-generative-ai-systems
- [70] [3P] (search) Canada after AIDA: https://compliancehub.wiki/canada-ai-regulation-2026-no-ai-act-what-actually-applies/

### AI security
- [71] [P] OWASP LLM Top 10 2026: https://genai.owasp.org/resource/owasp-genai-llm-top-10-2026/
- [72] [P] (search) OWASP Agentic Top 10: https://genai.owasp.org/2025/12/09/owasp-top-10-for-agentic-applications-the-benchmark-for-agentic-security-in-the-age-of-autonomous-ai/
- [73] [P] (search) OWASP AI Exchange: https://owaspai.org/
- [74] [P] MITRE ATLAS v2026.09: https://github.com/mitre-atlas/atlas-data/releases/tag/v2026.09
- [75] [P] ATLAS license: https://raw.githubusercontent.com/mitre-atlas/atlas-data/main/LICENSE
- [76] [P] Google SAIF data: https://github.com/google/saif-data
- [77] [P] (search) OASIS/CoSAI: https://www.oasis-open.org/2026/01/27/coalition-for-secure-ai-releases-extensive-taxonomy-for-model-context-protocol-security/

### U.S. federal
- [78] [P] (search) Federal Register, EO 14148: https://www.federalregister.gov/documents/2025/01/28/2025-01901/initial-rescissions-of-harmful-executive-orders-and-actions
- [79] [P] OMB M-25-21: https://www.whitehouse.gov/wp-content/uploads/2025/02/M-25-21-Accelerating-Federal-Use-of-AI-through-Innovation-Governance-and-Public-Trust.pdf
- [80] [3P] (search) FedScoop, M-25-22: https://fedscoop.com/trump-white-house-ai-use-acquisition-guidance-government/
- [81] [P] America's AI Action Plan: https://www.whitehouse.gov/wp-content/uploads/2025/07/Americas-AI-Action-Plan.pdf
- [82] [P] OMB M-26-04: https://www.whitehouse.gov/wp-content/uploads/2025/12/M-26-04-Increasing-Public-Trust-in-Artificial-Intelligence-Through-Unbiased-AI-Principles-1.pdf
- [83] [P] EO 14365 text: https://www.presidency.ucsb.edu/documents/executive-order-14365-ensuring-national-policy-framework-for-artificial-intelligence
- [84] [3P] (search) WilmerHale, National Policy Framework: https://www.wilmerhale.com/en/insights/blogs/wilmerhale-privacy-and-cybersecurity-law/20260323-white-house-releases-national-policy-framework-for-artificial-intelligence
- [85] [3P] CASRAI, preemption fight (2026-09-20): https://casrai.org/news/federal-ai-moratorium-state-preemption-fight-2026
- [86] [3P] Norton Rose Fulbright, xAI v. Colorado: https://www.nortonrosefulbright.com/en/knowledge/publications/de3ad9de/xai-sues-doj-intervenes-enforcement-of-colorado-ai-act-suspended
- [87] [3P] (search) BakerHostetler, DOJ task force: https://www.bakerlaw.com/insights/navigating-the-emerging-federal-state-ai-showdown-doj-establishes-ai-litigation-task-force/

### U.S. states
- [88] [P] Colorado SB26-189: https://leg.colorado.gov/bills/sb26-189
- [89] [3P] Norton Rose Fulbright, Colorado revised law: https://www.nortonrosefulbright.com/en/knowledge/publications/18733d31/colorado-enacts-revised-ai-law
- [90] [P] California SB 53: https://leginfo.legislature.ca.gov/faces/billTextClient.xhtml?bill_id=202520260SB53
- [91] [P] California AB 853: https://leginfo.legislature.ca.gov/faces/billTextClient.xhtml?bill_id=202520260AB853
- [92] [P] CPPA (2025-09-23): https://cppa.ca.gov/announcements/2025/20250923.html
- [93] [P] Texas HB 149 (enrolled): https://capitol.texas.gov/tlodocs/89R/billtext/pdf/HB00149F.pdf
- [94] [3P] Wiley, NY RAISE Act: https://www.wiley.law/alert-New-York-Finalizes-RAISE-Act-for-Frontier-AI-Models-Law-Takes-Effect-January-1-2027
- [95] [P] (search) NY State Comptroller, LL 144 audit: https://www.osc.ny.gov/state-agencies/audits/2025/12/02/enforcement-local-law-144-automated-employment-decision-tools
- [96] [P] (search) Illinois HB 3773: https://www.ilga.gov/ftp/legislation/103/BillStatus/HTML/10300HB3773.html
- [97] [3P] (search) Davis Polk, Utah: https://www.davispolk.com/insights/client-update/utah-scales-back-reach-generative-ai-consumer-protection-law
- [98] [3P] WilmerHale, SB 53: https://www.wilmerhale.com/en/insights/blogs/wilmerhale-privacy-and-cybersecurity-law/20251001-transparency-in-frontier-artificial-intelligence-act-sb-53-california-requires-new-standardized-ai-safety-disclosures

### Other jurisdictions
- [99] [P] U.S. ITA, South Korea AI Basic Act (2026-05-29): https://www.trade.gov/market-intelligence/south-korea-ai-basic-act
- [100] [3P] (search) Covington, China labeling: https://www.insideprivacy.com/international/china/china-releases-new-labeling-requirements-for-ai-generated-content/
- [101] [3P] (search) DLA Piper, China Cybersecurity Law: https://privacymatters.dlapiper.com/2025/11/china-amendments-to-cybersecurity-law-effective-1-january-2026/
- [102] [3P] (search) Bird & Bird, China anthropomorphic AI: https://www.twobirds.com/en/insights/2026/china/china's-new-regulations-on-ai-anthropomorphic-interactive-services
- [103] [3P] (search) White & Case, Japan: https://www.whitecase.com/insight-our-thinking/ai-watch-global-regulatory-tracker-japan
- [104] [3P] (search) CASRAI, Brazil PL 2338: https://casrai.org/guides/brazil-ai-bill-pl-2338-status
- [105] [3P] (search) Khaitan, India IT Rules 2026: https://www.khaitanco.com/thought-leadership/MeitY-notifies-the-IT-Amendment-Rules-2026
- [106] [3P] (search) Norton Rose Fulbright, Italy: https://www.nortonrosefulbright.com/en/knowledge/publications/9bfedfea/italy-enacts-law-no-132-2025-on-artificial-intelligence-sector-rules-and-next-steps
- [107] [3P] (search) VILAF, Vietnam: https://www.vilaf.com.vn/blog/vietnam-enacts-its-first-law-on-artificial-intelligence-key-regulatory-obligations-from-1-march-2026/

### Sectoral
- [108] [P] OCC Bulletin 2026-13: https://www.occ.gov/news-issuances/bulletins/2026/bulletin-2026-13.html
- [109] [P] (search) Federal Reserve SR 26-2: https://www.federalreserve.gov/supervisionreg/srletters/SR2602.pdf
- [110] [P] FDA, AI-enabled device guidance (draft): https://www.fda.gov/regulatory-information/search-fda-guidance-documents/artificial-intelligence-enabled-device-software-functions-lifecycle-management-and-marketing
- [111] [P] FDA, AI in SaMD: https://www.fda.gov/medical-devices/software-medical-device-samd/artificial-intelligence-software-medical-device
- [112] [P] NAIC adoption map (as of 2026-04-01): https://content.naic.org/sites/default/files/cmte-h-big-data-artificial-intelligence-wg-map-ai-model-bulletin.pdf
- [113] [3P] (search) NAIC evaluation-tool pilot: https://aipmo.co/naic-ai-bulletin-q2-2026-status/

### Visua internal references
- `/home/user/visua/README.md`, `/home/user/visua/docs/roadmap.md`, `/home/user/visua/docs/architecture.md`, `/home/user/visua/corpus/README.md`
