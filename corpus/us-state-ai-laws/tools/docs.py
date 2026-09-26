"""Document registry for corpus/us-state-ai-laws (manifest metadata + extraction mode)."""

LIC_TX = ("Public legislative record. Neither capitol.texas.gov (Texas Legislature Online) nor statutes.capitol.texas.gov "
          "(Texas Legislative Council) shows a copyright or reuse notice; the TLC privacy policy "
          "(capitol.texas.gov/resources/privacyPolicy.aspx) covers only data collection.")
LIC_CA_LEG = ("Public legislative record. leginfo.legislature.ca.gov states: \"Pursuant to Section 10248.5 of the Government Code, "
              "the information described in subdivision (a) of Section 10248 of the Government Code and made available on this "
              "Web site is within the public domain and the State of California retains no copyright or other proprietary interest "
              "in the information.\" The PDF is marked \"STATE OF CALIFORNIA AUTHENTICATED ELECTRONIC LEGAL MATERIAL\".")
LIC_CA_AGENCY = ("Public regulatory record. The agency site footer reads \"Copyright © State of California\"; the State Conditions of Use "
                 "(https://www.ca.gov/legal/conditions-of-use/) state: \"In general, information presented on this website, unless "
                 "otherwise indicated, is considered in the public domain. It may be distributed or copied as permitted by law.\"")
LIC_CO = ("Public legislative record. leg.colorado.gov shows no copyright or reuse notice (its privacy policy, "
          "content.leg.colorado.gov/privacy-policy, covers personal data only). The compiled Colorado Revised Statutes are "
          "published separately by LexisNexis for the General Assembly and were not downloaded.")
LIC_CO_AG = ("coag.gov footer: \"Copyright 2026 The Office of the Attorney General. All rights reserved.\" Proposed rules are not law "
             "and reuse terms are not stated, so the file is kept in .local/ (git-ignored).")
LIC_NY = ("Public legislative record. Retrieved from the New York State Senate Open Legislation service "
          "(legislation.nysenate.gov); neither it nor nyassembly.gov shows a copyright or reuse notice.")
LIC_NYC_LL = ("Public legislative record (certified local law filed by the Office of the City Clerk, from the NYC Council's "
              "Legistar record). No copyright notice appears on the Legistar record.")
LIC_NYC_GOV = ("nyc.gov Terms of Use §IV: \"All other design, information, text, graphics, images, pages, interfaces, links, software, "
               "and other items and materials contained in or displayed on NYC.gov, and the selection and arrangements thereof, are "
               "the property of the City of New York. All rights are reserved.\"")
LIC_IL = ("Public legislative record. ilga.gov footer: \"2026 ILGA.gov | All Rights Reserved\"; the ILGA \"Privacy, Security, and "
          "Legal Notices (April 2002)\" (www.ilga.gov/Disclaimers) disclaim warranties and liability but state no restriction on "
          "reuse of statutory text.")
LIC_UT = ("Public legislative record. le.utah.gov: \"The Office of Legislative Research and General Counsel is the official "
          "publisher of the Utah Code. The code provisions available above constitute the current and official electronic record "
          "of the Utah Code.\" Terms of Use §4 (le.utah.gov/documents/disclaimer.htm): \"The Legislature makes no warranty that "
          "information on a legislative web site is free from copyright claims or other restrictions or limitations on free use "
          "or display.\"")

PDF = "application/pdf"
HTML = "text/html"
DOCX = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"

B = "us-state-ai-laws/"

DOCS = [
    # ------------------------------------------------------------------ Texas
    dict(id="tx-hb149-enrolled", title="Texas Responsible Artificial Intelligence Governance Act (H.B. No. 149), enrolled version",
         identifier="Tex. H.B. 149, 89th Leg., R.S. (2025); Acts 2025, 89th Leg., R.S., Ch. 1174",
         publisher="Texas Legislature (Texas Legislature Online)", version="Enrolled (reported enrolled 2025-05-31; signed by the Governor 2025-06-22)",
         published="2025-05-31", role="statute", mediaType=PDF, path=B + "texas/HB00149F.pdf",
         url="https://capitol.texas.gov/tlodocs/89R/billtext/pdf/HB00149F.pdf",
         landingPage="https://capitol.texas.gov/BillLookup/History.aspx?LegSess=89R&Bill=HB149", license=LIC_TX,
         notes=("Citation target for TRAIGA obligations (physical pages). The enrolled PDF prints non-breaking spaces as 'A' glyphs in "
                "its text layer and sets apostrophes as a separate smaller span with a leading space; the extraction removes both artifacts. Bill history: signed by the Governor 06/22/2025, 'Effective on 1/1/26'. "
                "30 pages."),
         mode="tx-enrolled", family="plain"),
    dict(id="tx-hb149-enrolled-html", title="Texas H.B. No. 149, enrolled version (HTML)",
         identifier="Tex. H.B. 149, 89th Leg., R.S. (2025)", publisher="Texas Legislature (Texas Legislature Online)",
         version="Enrolled", published="2025-05-31", role="statute", mediaType=HTML, path=B + "texas/HB00149F.htm",
         url="https://capitol.texas.gov/tlodocs/89R/billtext/html/HB00149F.htm",
         landingPage="https://capitol.texas.gov/BillLookup/Text.aspx?LegSess=89R&Bill=HB149", license=LIC_TX,
         notes="Same text as the enrolled PDF with clean spacing; scanned for embedded tokens (none).", mode=None, family=None),
] + [
    dict(id=f"tx-bcc-ch{c}", title=f"Texas Business and Commerce Code, Chapter {c}. {t}",
         identifier=f"Tex. Bus. & Com. Code ch. {c}", publisher="Texas Legislative Council (Texas Constitution and Statutes)",
         version="Current text; all sections 'Added by Acts 2025, 89th Leg., R.S., Ch. 1174 (H.B. 149), Sec. 4, eff. January 1, 2026' (no later amendments)",
         published="2026-01-01", role="statute", mediaType=HTML, path=B + f"texas/codified/BC.{c}.htm",
         url=f"https://tcss.legis.texas.gov/resources/BC/htm/BC.{c}.htm",
         landingPage=f"https://statutes.capitol.texas.gov/Docs/BC/htm/BC.{c}.htm", license=LIC_TX,
         notes=("Codified chapter from the Texas Legislative Council file server behind statutes.capitol.texas.gov (the viewer is a "
                "JavaScript application). Text compared with the enrolled bill: identical. Scanned for embedded tokens (none)."),
         mode=None, family=None)
    for c, t in [(551, "General Provisions"), (552, "Artificial Intelligence Protection"),
                 (553, "Artificial Intelligence Regulatory Sandbox Program"), (554, "Texas Artificial Intelligence Council")]
] + [
    # ------------------------------------------------------------------ California
    dict(id="ca-sb53-ch138-2025", title="Senate Bill No. 53 (Transparency in Frontier Artificial Intelligence Act), chaptered",
         identifier="Cal. SB 53 (2025–2026 Reg. Sess.), Stats. 2025, ch. 138", publisher="California Legislature (Legislative Counsel)",
         version="Chaptered (approved by Governor and filed with Secretary of State 2025-09-29)", published="2025-09-29",
         role="statute", mediaType=PDF, path=B + "california/sb53/SB53-ch138-stats2025.pdf",
         url="https://leginfo.legislature.ca.gov/faces/billPdf.xhtml?bill_id=202520260SB53&version=20250SB5390CHP",
         landingPage="https://leginfo.legislature.ca.gov/faces/billTextClient.xhtml?bill_id=202520260SB53", license=LIC_CA_LEG,
         notes=("Adds Bus. & Prof. Code §§ 22757.10–22757.16, Gov. Code § 11546.8 (CalCompute) and Lab. Code §§ 1107–1107.2. No "
                "operative-date clause, so it took effect 2026-01-01 (Cal. Const., art. IV, § 8(c)). Not amended by any 2026 statute "
                "as of 2026-09-26. The PDF is served by a JSF form post; the URL above opens the download page."),
         mode="default", family="ca-chaptered"),
    dict(id="ca-sb942-ch291-2024", title="Senate Bill No. 942 (California AI Transparency Act), chaptered",
         identifier="Cal. SB 942 (2023–2024 Reg. Sess.), Stats. 2024, ch. 291", publisher="California Legislature (Legislative Counsel)",
         version="Chaptered (approved and filed 2024-09-19)", published="2024-09-19", role="statute", mediaType=PDF,
         path=B + "california/ai-transparency-act/SB942-ch291-stats2024.pdf",
         url="https://leginfo.legislature.ca.gov/faces/billPdf.xhtml?bill_id=202320240SB942&version=20230SB94291CHP",
         landingPage="https://leginfo.legislature.ca.gov/faces/billTextClient.xhtml?bill_id=202320240SB942", license=LIC_CA_LEG,
         notes=("Adds Bus. & Prof. Code §§ 22757–22757.6. Sections 22757.1, 22757.4 and 22757.6 were amended by AB 853 (2025); cite "
                "AB 853 for those. Operative date moved from 2026-01-01 to 2026-08-02 by AB 853."),
         mode="default", family="ca-chaptered"),
    dict(id="ca-ab853-ch674-2025", title="Assembly Bill No. 853 (California AI Transparency Act amendments), chaptered",
         identifier="Cal. AB 853 (2025–2026 Reg. Sess.), Stats. 2025, ch. 674", publisher="California Legislature (Legislative Counsel)",
         version="Chaptered (approved and filed 2025-10-13)", published="2025-10-13", role="statute", mediaType=PDF,
         path=B + "california/ai-transparency-act/AB853-ch674-stats2025.pdf",
         url="https://leginfo.legislature.ca.gov/faces/billPdf.xhtml?bill_id=202520260AB853&version=20250AB85393CHP",
         landingPage="https://leginfo.legislature.ca.gov/faces/billTextClient.xhtml?bill_id=202520260AB853", license=LIC_CA_LEG,
         notes=("Amends §§ 22757.1, 22757.4, 22757.6 (operative 2026-08-02) and adds §§ 22757.3.1 (large online platforms, operative "
                "2027-01-01), 22757.3.2 (GenAI hosting platforms, 2027-01-01) and 22757.3.3 (capture devices, 2028-01-01). "
                "Pending on 2026-09-26: SB 1000 (urgency) and AB 2713 would amend the Act again; the Governor must act by 2026-09-30."),
         mode="default", family="ca-chaptered"),
    dict(id="ca-ab2013-ch817-2024", title="Assembly Bill No. 2013 (Generative artificial intelligence: training data transparency), chaptered",
         identifier="Cal. AB 2013 (2023–2024 Reg. Sess.), Stats. 2024, ch. 817", publisher="California Legislature (Legislative Counsel)",
         version="Chaptered (approved and filed 2024-09-28)", published="2024-09-28", role="statute", mediaType=PDF,
         path=B + "california/ab2013/AB2013-ch817-stats2024.pdf",
         url="https://leginfo.legislature.ca.gov/faces/billPdf.xhtml?bill_id=202320240AB2013&version=20230AB201393CHP",
         landingPage="https://leginfo.legislature.ca.gov/faces/billTextClient.xhtml?bill_id=202320240AB2013", license=LIC_CA_LEG,
         notes="Adds Civ. Code Title 15.2, §§ 3110–3111 (Artificial Intelligence Training Data Transparency). Not amended since.",
         mode="default", family="ca-chaptered"),
    dict(id="ca-sb1001-ch892-2018", title="Senate Bill No. 1001 (Bots: disclosure), chaptered",
         identifier="Cal. SB 1001 (2017–2018 Reg. Sess.), Stats. 2018, ch. 892", publisher="California Legislature (Legislative Counsel)",
         version="Chaptered (approved and filed 2018-09-28)", published="2018-09-28", role="statute", mediaType=PDF,
         path=B + "california/bot-disclosure/SB1001-ch892-stats2018.pdf",
         url="https://leginfo.legislature.ca.gov/faces/billPdf.xhtml?bill_id=201720180SB1001&version=20170SB100192CHP",
         landingPage="https://leginfo.legislature.ca.gov/faces/billTextClient.xhtml?bill_id=201720180SB1001", license=LIC_CA_LEG,
         notes=("Adds Bus. & Prof. Code ch. 6 (§§ 17940–17943, 'Bots'), operative 2019-07-01. Codified history notes on 2026-09-26: "
                "'(Added by Stats. 2018, Ch. 892, Sec. 1. (SB 1001) Effective January 1, 2019. Operative July 1, 2019 ...)' — never amended."),
         mode="default", family="ca-chaptered"),
    dict(id="ca-ab489-ch615-2025", title="Assembly Bill No. 489 (Health care professions: deceptive terms or letters: artificial intelligence), chaptered",
         identifier="Cal. AB 489 (2025–2026 Reg. Sess.), Stats. 2025, ch. 615", publisher="California Legislature (Legislative Counsel)",
         version="Chaptered (approved and filed 2025-10-11)", published="2025-10-11", role="statute", mediaType=PDF,
         path=B + "california/ab489/AB489-ch615-stats2025.pdf",
         url="https://leginfo.legislature.ca.gov/faces/billPdf.xhtml?bill_id=202520260AB489&version=20250AB48994CHP",
         landingPage="https://leginfo.legislature.ca.gov/faces/billTextClient.xhtml?bill_id=202520260AB489", license=LIC_CA_LEG,
         notes=("Adds Bus. & Prof. Code ch. 15.5, §§ 4999.8–4999.9 (Health Advice From Artificial Intelligence). Codified history note: "
                "'(Added by Stats. 2025, Ch. 615, Sec. 1. (AB 489) Effective January 1, 2026.)' — not amended as of 2026-09-26."),
         mode="default", family="ca-chaptered"),
    dict(id="ca-sb243-ch677-2025", title="Senate Bill No. 243 (Companion chatbots), chaptered",
         identifier="Cal. SB 243 (2025–2026 Reg. Sess.), Stats. 2025, ch. 677", publisher="California Legislature (Legislative Counsel)",
         version="Chaptered (approved and filed 2025-10-13)", published="2025-10-13", role="statute", mediaType=PDF,
         path=B + "california/companion-chatbots/SB243-ch677-stats2025.pdf",
         url="https://leginfo.legislature.ca.gov/faces/billPdf.xhtml?bill_id=202520260SB243&version=20250SB24392CHP",
         landingPage="https://leginfo.legislature.ca.gov/faces/billTextClient.xhtml?bill_id=202520260SB243", license=LIC_CA_LEG,
         notes=("Adds Bus. & Prof. Code §§ 22601–22606, effective 2026-01-01. § 22602 is amended by SB 1119 (2026; subdivision (c) "
                "on known minors is deleted from 2027-01-01) and § 22601 by SB 867 (2026; adds \"toy\")."),
         mode="default", family="ca-chaptered"),
    dict(id="ca-sb1119-ch190-2026", title="Senate Bill No. 1119 (Companion chatbots: children's safety — \"Adam's Law\"), chaptered",
         identifier="Cal. SB 1119 (2025–2026 Reg. Sess.), Stats. 2026, ch. 190", publisher="California Legislature (Legislative Counsel)",
         version="Chaptered (approved and filed 2026-09-10)", published="2026-09-10", role="statute", mediaType=PDF,
         path=B + "california/companion-chatbots/SB1119-ch190-stats2026.pdf",
         url="https://leginfo.legislature.ca.gov/faces/billPdf.xhtml?bill_id=202520260SB1119&version=20250SB111992CHP",
         landingPage="https://leginfo.legislature.ca.gov/faces/billTextClient.xhtml?bill_id=202520260SB1119", license=LIC_CA_LEG,
         notes=("Amends § 22602 and adds Bus. & Prof. Code Chapter 11.6, §§ 21810–21818 (\"Adam's Law\"). Effective 2027-01-01; "
                "§§ 21812, 21812.5 and 21813 operative 2027-07-01. Contains two versions of § 21814 (child safety audits); the version "
                "operative only if AB 1405 (2025–26) is chaptered and takes effect on or before 2027-01-01 applies, because AB 1405 was "
                "chaptered on 2026-09-09 (Stats. 2026, ch. 178)."),
         mode="default", family="ca-chaptered"),
    dict(id="ca-sb867-ch189-2026", title="Senate Bill No. 867 (Toys: companion chatbots), chaptered",
         identifier="Cal. SB 867 (2025–2026 Reg. Sess.), Stats. 2026, ch. 189", publisher="California Legislature (Legislative Counsel)",
         version="Chaptered (approved and filed 2026-09-10)", published="2026-09-10", role="statute", mediaType=PDF,
         path=B + "california/companion-chatbots/SB867-ch189-stats2026.pdf",
         url="https://leginfo.legislature.ca.gov/faces/billPdf.xhtml?bill_id=202520260SB867&version=20250SB86793CHP",
         landingPage="https://leginfo.legislature.ca.gov/faces/billTextClient.xhtml?bill_id=202520260SB867", license=LIC_CA_LEG,
         notes="Amends § 22601 (adds \"toy\") and adds § 22604.5 (ban on toys that include a companion chatbot), effective 2027-01-01, repealed 2031-01-01.",
         mode="default", family="ca-chaptered"),
    dict(id="ca-cppa-ccpa-regs-2026", title="California Consumer Privacy Act Regulations (effective January 1, 2026)",
         identifier="Cal. Code Regs., tit. 11, § 7000 et seq.", publisher="California Privacy Protection Agency (CalPrivacy)",
         version="Consolidated text effective 2026-01-01 (includes the 2025 ADMT, risk-assessment, cybersecurity-audit and insurance amendments)",
         published="2025-10-09", role="regulation", mediaType=PDF, path=B + "california/cppa/ccpa-regulations-eff-2026-01-01.pdf",
         url="https://cppa.ca.gov/regulations/pdf/ccpa_statute_eff_20260101.pdf", landingPage="https://cppa.ca.gov/regulations/",
         license=LIC_CA_AGENCY,
         notes=("Citation target for CCPA regulation obligations (physical pages; the printed page labels 'Page N of 103' equal the "
                "physical page). Despite the file name ('ccpa_statute_…'), the agency lists it as 'CCPA Regulations (Effective January "
                "1, 2026)'. CalPrivacy lists no proposed regulation packages as of 2026-09-26."),
         mode="default", family="cppa"),
    dict(id="ca-cppa-admt-approved-text", title="Text of Regulations (CCPA Updates, Cyber, Risk, ADMT, and Insurance Regulations) — final text approved by OAL",
         identifier="OAL Matter No. 2025-0808-04 (Cal. Code Regs., tit. 11, §§ 7001–7302 as amended)",
         publisher="California Privacy Protection Agency", version="Final regulations text (underline/strikeout against prior text)",
         published="2025-09-24", role="regulation", mediaType=PDF, path=B + "california/cppa/ccpa-updates-cyber-risk-admt-approved-text.pdf",
         url="https://cppa.ca.gov/regulations/pdf/ccpa_updates_cyber_risk_admt_appr_text.pdf",
         landingPage="https://cppa.ca.gov/regulations/ccpa_updates.html", license=LIC_CA_AGENCY,
         notes="The rulemaking's approved text (127 pages). Obligations cite the consolidated text instead because it has no strikeout markup.",
         mode=None, family=None),
    dict(id="ca-cppa-admt-oal-approval", title="Notice of Approval of Regulatory Action — CCPA Updates, Cyber, Risk, ADMT, and Insurance Regulations",
         identifier="OAL Matter No. 2025-0808-04", publisher="California Office of Administrative Law (posted by CPPA)",
         version="Approved 2025-09-22; effective 2026-01-01", published="2025-09-22", role="regulation", mediaType=PDF,
         path=B + "california/cppa/ccpa-updates-cyber-risk-admt-oal-notice-of-approval.pdf",
         url="https://cppa.ca.gov/regulations/pdf/ccpa_updates_cyber_risk_admt_noa.pdf",
         landingPage="https://cppa.ca.gov/regulations/ccpa_updates.html", license=LIC_CA_AGENCY,
         notes="OAL: 'This regulatory action becomes effective on January 1, 2026.' Dated September 22, 2025 (CPPA announced 2025-09-23).",
         mode=None, family=None),
    dict(id="ca-ccpa-statute-2026", title="California Consumer Privacy Act of 2018, as amended (effective January 1, 2026)",
         identifier="Cal. Civ. Code § 1798.100 et seq.", publisher="California Privacy Protection Agency (compilation)",
         version="Compilation effective 2026-01-01", published="2026-01-07", role="statute", mediaType=PDF,
         path=B + "california/cppa/ccpa-statute-eff-2026-01-01.pdf", url="https://cppa.ca.gov/pdf/20260101_ccpa_statute.pdf",
         landingPage="https://cppa.ca.gov/regulations/", license=LIC_CA_AGENCY,
         notes=("Agency compilation of the statute; used for the 'business' definition (§ 1798.140(d)) and penalties (§§ 1798.155, "
                "1798.199.90). Monetary amounts marked * are CPI-adjusted under § 1798.199.95(d); see CalPrivacy's 'Monetary Thresholds'."),
         mode="default", family="cppa"),
    dict(id="ca-crd-ads-final-text", title="Final Text of Modifications to Employment Regulations Regarding Automated-Decision Systems (OAL-approved)",
         identifier="Cal. Code Regs., tit. 2, §§ 11008–11079 as amended; OAL Matter No. 2025-0515-01",
         publisher="California Civil Rights Council / Civil Rights Department", version="Final text approved by OAL 2025-06-27; effective 2025-10-01",
         published="2025-06-30", role="regulation", mediaType=PDF,
         path=B + "california/crd-ads-regulations/crd-ads-regulations-final-text-oal-approved.pdf",
         url="https://calcivilrights.ca.gov/wp-content/uploads/sites/32/2025/06/Final-Text-regulations-automated-employment-decision-systems.pdf",
         landingPage="https://calcivilrights.ca.gov/civilrightscouncil/rulemaking-actions/", license=LIC_CA_AGENCY,
         notes=("Image-only scan (no text layer), 39 pages, colour underline/strikeout. Citation target for the CRD obligations: page "
                "numbers were read from the page images; the wording was verified against the text layer of Attachment B "
                "(ca-crd-ads-attachment-b) after removing struck-through text. OAL Notice of Approval dated 2025-06-27: 'This "
                "regulatory action becomes effective on 10/1/2025.'"),
         mode=None, family=None),
    dict(id="ca-crd-ads-attachment-b", title="Attachment B — Final Unmodified Text of Proposed Employment Regulations Regarding Automated-Decision Systems (version 3/17/2025)",
         identifier="Cal. Code Regs., tit. 2, §§ 11008–11079 (proposed modifications)", publisher="California Civil Rights Council",
         version="Final unmodified text adopted by the Council (3/17/2025), later approved by OAL without change to the cited provisions",
         published="2025-03-18", role="regulation", mediaType=PDF,
         path=B + "california/crd-ads-regulations/crd-ads-regulations-attachment-b-final-unmodified-text-2025-03-17.pdf",
         url="https://calcivilrights.ca.gov/wp-content/uploads/sites/32/2025/03/Attachment-B-Final-Unmodified-Text-of-Proposed-Employment-Regulations-Regarding-Automated-Decision-Systems.pdf",
         landingPage="https://calcivilrights.ca.gov/civilrightscouncil/rulemaking-actions/", license=LIC_CA_AGENCY,
         notes=("Text-layer copy of the final text (underline = added, strikethrough = deleted). Used to verify the wording of the "
                "OAL-approved scan; its pagination differs slightly from the scan."),
         mode="strike", family="plain"),
    # ------------------------------------------------------------------ Colorado
    dict(id="co-sb26-189-sl-ch131", title="Session Laws of Colorado 2026, Chapter 131 — Senate Bill 26-189 (Automated Decision-Making Technology)",
         identifier="SB 26-189 (2026 Reg. Sess.); Colo. Sess. Laws 2026, ch. 131, pp. 569–585", publisher="Colorado General Assembly",
         version="Session law (Approved: May 14, 2026)", published="2026-05-21", role="statute", mediaType=PDF,
         path=B + "colorado/SB26-189-session-laws-2026-ch131.pdf",
         url="https://leg.colorado.gov/laws/session-laws/SB26-189/131/download", landingPage="https://leg.colorado.gov/bills/sb26-189",
         license=LIC_CO,
         notes=("Repeals and reenacts C.R.S. part 17 of article 1 of title 6 (the SB 24-205 Colorado AI Act) as §§ 6-1-1701 to "
                "6-1-1709; adds § 6-1-105(1)(uuuu) and § 10-3-1104.9(3)(e). Effective 2027-01-01 (rulemaking and appropriation "
                "sections on passage); applies to consequential decisions made on or after 2027-01-01. New statutory text is printed "
                "in capital letters (Colorado's convention for new material); quotations keep that casing. Physical page = printed "
                "page − 568."),
         mode="default", family="co-session"),
    dict(id="co-sb26-189-fiscal-note", title="SB 26-189 Final Fiscal Note (Legislative Council Staff), September 8, 2026",
         identifier="Fiscal note LLS 26-0974", publisher="Colorado Legislative Council Staff", version="Final fiscal note (reflects enacted bill)",
         published="2026-09-08", role="guide", mediaType=PDF, path=B + "colorado/SB26-189-final-fiscal-note-2026-09-08.pdf",
         url="https://leg.colorado.gov/bill_files/117715/download", landingPage="https://leg.colorado.gov/bills/sb26-189",
         license="Public legislative record (nonpartisan staff analysis); no copyright notice shown.",
         notes=("Official status source: 'On April 27, 2026, the Attorney General was ordered by U.S. District Court to not initiate "
                "enforcement of SB 24-205 or any legislation amending SB 24-205 until the Attorney General completes rulemaking for AI "
                "enforcement and the court issues a ruling on \"X. AI LLC v. Weiser.\"' Also: Colorado Consumer Protection Act civil "
                "penalty up to $20,000 per violation."),
         mode="default", family="plain"),
    dict(id="co-hb26-1263-sl-ch208", title="Session Laws of Colorado 2026, Chapter 208 — House Bill 26-1263 (Conversational AI service operator requirements)",
         identifier="HB 26-1263 (2026 Reg. Sess.); Colo. Sess. Laws 2026, ch. 208, pp. 1197–1203", publisher="Colorado General Assembly",
         version="Session law (Approved: May 29, 2026)", published="2026-05-29", role="statute", mediaType=PDF,
         path=B + "colorado/HB26-1263-session-laws-2026-ch208.pdf",
         url="https://leg.colorado.gov/laws/session-laws/HB26-1263/208/download", landingPage="https://leg.colorado.gov/bills/hb26-1263",
         license=LIC_CO,
         notes=("Adds definitions to C.R.S. § 6-1-1701 and a new § 6-1-1708 (operator duties). Act effective 2026-08-12 (90 days after "
                "adjournment, no referendum petition); duties apply on and after 2027-01-01, annual reporting from 2027-07-01. SB 26-189 "
                "also enacts a § 6-1-1708 (insurers/covered entities) and repeals-and-reenacts § 6-1-1701 from 2027-01-01; the "
                "numbering conflict is left to the Revisor of Statutes. Physical page = printed page − 1196."),
         mode="default", family="co-session"),
    dict(id="co-hb26-1263-fiscal-note", title="HB 26-1263 Final Fiscal Note (Legislative Council Staff), July 13, 2026",
         identifier="Fiscal note LLS 26-0420", publisher="Colorado Legislative Council Staff", version="Final fiscal note (reflects enacted bill)",
         published="2026-07-13", role="guide", mediaType=PDF, path=B + "colorado/HB26-1263-final-fiscal-note-2026-07-13.pdf",
         url="https://leg.colorado.gov/bill_files/117340/download", landingPage="https://leg.colorado.gov/bills/hb26-1263",
         license="Public legislative record (nonpartisan staff analysis); no copyright notice shown.",
         notes="'The bill was signed into law by the Governor on May 29, 2026, and takes effect August 12, 2026, assuming no referendum petition is filed.'",
         mode="default", family="plain"),
    dict(id="co-sb24-205-sl-ch198", title="Session Laws of Colorado 2024, Chapter 198 — Senate Bill 24-205 (Consumer Protections for Artificial Intelligence)",
         identifier="SB 24-205 (2024 Reg. Sess.); Colo. Sess. Laws 2024, ch. 198", publisher="Colorado General Assembly",
         version="Session law (Approved: May 17, 2024) — repealed and reenacted by SB 26-189 effective 2027-01-01",
         published="2024-05-17", role="statute", mediaType=PDF, path=B + "colorado/SB24-205-session-laws-2024-ch198.pdf",
         url="https://leg.colorado.gov/laws/session-laws/SB24-205/198/download", landingPage="https://leg.colorado.gov/bills/sb24-205",
         license=LIC_CO,
         notes=("Historical: the original Colorado AI Act (C.R.S. §§ 6-1-1701 to 6-1-1707). Its effective date was moved to "
                "2026-06-30 by SB 25B-004; enforcement is stayed by court order (see co-sb26-189-fiscal-note); replaced by SB 26-189 "
                "from 2027-01-01. No obligations are extracted from it."),
         mode="default", family="co-session"),
    dict(id="co-sb25b-004-sl-ch3", title="Session Laws of Colorado 2025, First Extraordinary Session, Chapter 3 — Senate Bill 25B-004",
         identifier="SB 25B-004 (2025 1st Extraordinary Sess.); Colo. Sess. Laws 2025 (1st Ex. Sess.), ch. 3", publisher="Colorado General Assembly",
         version="Session law (Approved: August 28, 2025)", published="2025-08-28", role="statute", mediaType=PDF,
         path=B + "colorado/SB25B-004-session-laws-2025-1st-extraordinary-ch3.pdf",
         url="https://leg.colorado.gov/laws/session-laws/SB25B-004/3/download", landingPage="https://leg.colorado.gov/bills/sb25b-004",
         license=LIC_CO, notes="Delayed SB 24-205's operative dates to June 30, 2026 ('measures effective no later than June 30, 2026').",
         mode="default", family="co-session"),
    dict(id="co-ag-4ccr904-6-proposed", title="Proposed Automated Decision-Making Technology & Conversational Artificial Intelligence Service Rules (4 CCR 904-6)",
         identifier="4 CCR 904-6 (proposed)", publisher="Colorado Department of Law (Attorney General)",
         version="PROPOSED — filed with the Secretary of State 2026-08-11; hearing 2026-10-26; NOT ADOPTED", published="2026-08-11",
         role="regulation", mediaType=DOCX, path=B + "colorado/.local/4-CCR-904-6-proposed-rules-2026-08-11.docx",
         url="https://coag.gov/app/uploads/2026/08/2026.08.11-ADMT-Chatbot-Act-Rulemaking.docx", landingPage="https://coag.gov/ai/",
         license=LIC_CO_AG,
         notes=("Draft rules implementing SB 26-189 and HB 26-1263 (proposed Rule 1.3: effective 2027-01-01). Examples: human-review "
                "requests acknowledged within 10 days and completed within 45 days; age assurance by reference to ISO/IEC 27566. No "
                "obligations are extracted from proposed text."),
         mode=None, family=None),
    dict(id="co-ag-4ccr904-6-notice", title="Notice of Proposed Rulemaking — ADMT and Chatbot Safety Acts (4 CCR 904-6)",
         identifier="4 CCR 904-6 (notice)", publisher="Colorado Department of Law (Attorney General)",
         version="Notice dated 2026-08-11; hearing Monday, October 26, 2026, 10:00 AM", published="2026-08-11", role="guide",
         mediaType=DOCX, path=B + "colorado/.local/4-CCR-904-6-notice-of-hearing-2026-08-11.docx",
         url="https://coag.gov/app/uploads/2026/08/2026.08.11-Notice-of-Hearing.docx", landingPage="https://coag.gov/ai/",
         license=LIC_CO_AG, notes="Written comments accepted through 2026-10-26 (or the last hearing day).", mode=None, family=None),
    # ------------------------------------------------------------------ New York
    dict(id="ny-s6953b-ch699-2025", title="S.6953-B / A.6453-B — Responsible AI Safety and Education (RAISE) Act as passed (Chapter 699 of 2025)",
         identifier="N.Y. S.6953-B/A.6453-B (2025); L. 2025, ch. 699", publisher="New York State Legislature (Senate Open Legislation)",
         version="Print B as passed 2025-06-12; signed 2025-12-19 as Chapter 699 (approval memo 76)", published="2025-06-09",
         role="statute", mediaType=PDF, path=B + "new-york/raise-act/S6953B-ch699-laws2025.pdf",
         url="https://legislation.nysenate.gov/pdf/bills/2025/S6953B",
         landingPage="https://nyassembly.gov/leg/?default_fld=&leg_video=&bn=S06953&term=2025&Summary=Y&Actions=Y&Text=Y", license=LIC_NY,
         notes=("Historical: its Article 44-B (§§ 1420–1425) was repealed and replaced by Chapter 96 of 2026 before taking effect; "
                "§ 3 (effective date) was amended to January 1, 2027. Obligations cite ny-s8828-ch96-2026. nysenate.gov pages are "
                "behind a bot challenge; the PDF endpoint and nyassembly.gov were used."),
         mode="ny-bill", family="plain"),
    dict(id="ny-s8828-ch96-2026", title="S.8828 / A.9449 — RAISE Act chapter amendment (Chapter 96 of 2026)",
         identifier="N.Y. S.8828/A.9449 (2026); L. 2026, ch. 96", publisher="New York State Legislature (Senate Open Legislation)",
         version="As introduced 2026-01-08 and passed (Senate 2026-01-28, Assembly 2026-03-11); signed 2026-03-27 as Chapter 96",
         published="2026-01-08", role="statute", mediaType=PDF, path=B + "new-york/raise-act/S8828-ch96-laws2026.pdf",
         url="https://legislation.nysenate.gov/pdf/bills/2025/S8828",
         landingPage="https://nyassembly.gov/leg/?default_fld=&leg_video=&bn=S08828&term=2025&Summary=Y&Actions=Y&Text=Y", license=LIC_NY,
         notes=("Repeals and re-adds Gen. Bus. Law Article 44-B (§§ 1420–1429) and sets the effective date of Chapter 699 to "
                "2027-01-01. Citation target for RAISE obligations. LBD line-numbered text; line-end hyphenation removed in quotations."),
         mode="ny-bill", family="plain"),
    dict(id="ny-s3008c-ch58-2025", title="S.3008-C / A.3008-C — FY2026 TED Article VII budget bill (Chapter 58 of 2025), Part U: AI companion models",
         identifier="N.Y. S.3008-C/A.3008-C (2025); L. 2025, ch. 58, part U", publisher="New York State Legislature (Senate Open Legislation)",
         version="Print C as passed 2025-05-07; signed 2025-05-09 as Chapter 58", published="2025-05-06", role="statute",
         mediaType=PDF, path=B + "new-york/gbl-art47/S3008C-ch58-laws2025.pdf",
         url="https://legislation.nysenate.gov/pdf/bills/2025/S3008C",
         landingPage="https://nyassembly.gov/leg/?default_fld=&leg_video=&bn=S03008&term=2025&Summary=Y&Actions=Y", license=LIC_NY,
         notes=("Part U (physical pages 58–60) adds Gen. Bus. Law Article 47 (§§ 1700–1704) and State Finance Law § 99-ss; takes "
                "effect on the 180th day after enactment (2025-11-05)."),
         mode="ny-bill", family="plain"),
    dict(id="ny-a10008c-ch58-2026", title="S.9008-C / A.10008-C — FY2027 TED Article VII budget bill (Chapter 58 of 2026), Part Y: Safe by Design Act",
         identifier="N.Y. A.10008-C/S.9008-C (2026); L. 2026, ch. 58, part Y; Gen. Bus. Law art. 45-B (§§ 1539–1547)",
         publisher="New York State Legislature (Senate Open Legislation)",
         version="Print C as passed 2026-05-26; signed 2026-05-26 as Chapter 58 (Assembly bill history: 'signed chap.58')",
         published="2026-05-25", role="statute", mediaType=PDF, path=B + "new-york/safe-by-design/A10008C-ch58-laws2026.pdf",
         url="https://legislation.nysenate.gov/pdf/bills/2025/A10008C",
         landingPage="https://nyassembly.gov/leg/?default_fld=&leg_video=&bn=A10008&term=2025&Summary=Y&Actions=Y&Text=Y", license=LIC_NY,
         notes=("Part Y (physical pages 62–68) adds Gen. Bus. Law Article 45-B, the 'Safe by Design Act', effective 2027-01-01 "
                "(Part Y § 4). Only § 1540(7) (integrated AI companions) and the age-assurance rules it relies on are extracted; the "
                "Act's other duties (privacy defaults, parental approvals, spending limits) are not AI-specific. The other Parts of "
                "this 189-page budget bill are unrelated."),
         mode="ny-bill", family="plain"),
    dict(id="nyc-ll144-2021", title="Local Law No. 144 of 2021 (Int. No. 1894-A) — Automated employment decision tools",
         identifier="N.Y.C. Local Law 144 of 2021; N.Y.C. Admin. Code §§ 20-870 to 20-874", publisher="New York City Council / Office of the City Clerk",
         version="Certified local law (passed 2021-11-10; returned unsigned 2021-12-13; Legistar enactment date 2021-12-11)",
         published="2022-01-12", role="statute", mediaType=PDF, path=B + "new-york/nyc-ll144/local-law-144-of-2021.pdf",
         url="https://legistar.council.nyc.gov/View.ashx?M=F&ID=10399761&GUID=F99584B7-57C8-469E-9637-46A0E780690E",
         landingPage="https://legistar.council.nyc.gov/LegislationDetail.aspx?ID=4344524&GUID=B051915D-A9AC-451E-81F8-6596032FA3F9",
         license=LIC_NYC_LL, notes="Takes effect 2023-01-01; DCWP began enforcement 2023-07-05. Not amended as of 2026-09-26.",
         mode="default", family="nyc-ll"),
    dict(id="nyc-city-record-2023-04-06", title="The City Record, Thursday, April 6, 2023 — DCWP Notice of Adoption of Final Rule (6 RCNY §§ 5-300 to 5-304)",
         identifier="6 RCNY §§ 5-300–5-304 (Subchapter T: Automated Employment Decision Tools)",
         publisher="City of New York, Department of Citywide Administrative Services (The City Record)",
         version="Official print edition, pp. 1495–1498 (PDF pages 15–18)", published="2023-04-06", role="regulation", mediaType=PDF,
         path=B + "new-york/nyc-ll144/.local/city-record-2023-04-06.pdf",
         url="https://www.nyc.gov/assets/dcas/downloads/pdf/cityrecord/2023/cityrecord-04-06-23.pdf",
         landingPage="https://a856-cityrecord.nyc.gov/RequestDetail/20230330013",
         license=LIC_NYC_GOV + (" The rule text itself is a public regulatory record; the issue also carries unrelated notices, so the "
                                "file is kept in .local/ (git-ignored)."),
         notes=("Official publication of DCWP's final AEDT rule (the City Record is 'the official paper of the City of New York'). "
                "rules.cityofnewyork.us and codelibrary.amlegal.com were blocked by a bot challenge; the CROL attachment link returned "
                "an empty file. Three-column layout; extraction reads columns in order."),
         mode="city-record", family="plain"),
    dict(id="nyc-dcwp-aedt-faq", title="Automated Employment Decision Tools: Frequently Asked Questions (DCWP, 06/29/2023)",
         identifier="DCWP AEDT FAQ", publisher="NYC Department of Consumer and Worker Protection", version="06/29/2023",
         published="2023-06-29", role="guide", mediaType=PDF, path=B + "new-york/nyc-ll144/.local/DCWP-AEDT-FAQ-2023-06-29.pdf",
         url="https://www.nyc.gov/assets/dca/downloads/pdf/about/DCWP-AEDT-FAQ.pdf",
         landingPage="https://www.nyc.gov/site/dca/about/automated-employment-decision-tools.page",
         license=LIC_NYC_GOV + " Kept in .local/ (git-ignored).",
         notes="Agency guidance: law took effect 2023-01-01; enforcement began 2023-07-05; notice must be given 10 business days before use.",
         mode=None, family=None),
    # ------------------------------------------------------------------ Illinois
    dict(id="il-pa-103-0804", title="Public Act 103-0804 (HB 3773) — Illinois Human Rights Act: use of artificial intelligence",
         identifier="Ill. P.A. 103-0804 (HB 3773, 103rd G.A.)", publisher="Illinois General Assembly",
         version="Public Act (Governor approved 2024-08-09; effective 2026-01-01)", published="2024-08-09", role="statute", mediaType=PDF,
         path=B + "illinois/PA-103-0804.pdf", url="https://www.ilga.gov/legislation/publicacts/103/PDF/103-0804.pdf",
         landingPage="https://www.ilga.gov/Legislation/PublicActs/View/103-0804", license=LIC_IL,
         notes=("Amends 775 ILCS 5/2-101 (adds (M) artificial intelligence, (N) generative AI) and 5/2-102 (adds (L)). ilga.gov "
                "serves an incomplete TLS chain (missing Sectigo intermediate); fetched with the intermediate from Sectigo's AIA URL "
                "added to the CA bundle (full verification)."),
         mode="default", family="il-pa"),
    dict(id="il-ilcs-775-5-art2", title="775 ILCS 5 (Illinois Human Rights Act), Article 2 — Employment (current ILCS text)",
         identifier="775 ILCS 5/2-101 et seq.", publisher="Illinois General Assembly (Legislative Information System)",
         version="ILCS database as retrieved 2026-09-26 (shows § 2-102 before and after P.A. 104-793, eff. 2027-01-01)",
         published="2026-09-26", role="statute", mediaType=HTML, path=B + "illinois/ilcs-775-5-article-2.html",
         url="https://www.ilga.gov/legislation/ILCS/details?MajorTopic=&Chapter=&ActName=Illinois%20Human%20Rights%20Act.&ActID=2266&ChapterID=64&ChapAct=775%2BILCS%2B5%2F&SeqStart=600000&SeqEnd=1900000",
         landingPage="https://www.ilga.gov/Legislation/ILCS/Articles?ActID=2266&ChapterID=64", license=LIC_IL,
         notes=("Currency check: § 2-102(L) wording is unchanged by P.A. 104-417 (eff. 2025-08-15) and P.A. 104-793 (eff. "
                "2027-01-01). ILGA: 'Updating the database of the Illinois Compiled Statutes (ILCS) is an ongoing process.' Scanned "
                "for embedded tokens (none)."),
         mode=None, family=None),
    dict(id="il-pa-101-0260", title="Public Act 101-0260 (HB 2557) — Artificial Intelligence Video Interview Act",
         identifier="Ill. P.A. 101-0260 (HB 2557, 101st G.A.); 820 ILCS 42/1–15", publisher="Illinois General Assembly",
         version="Public Act (Governor approved 2019-08-09; effective 2020-01-01)", published="2019-08-09", role="statute", mediaType=PDF,
         path=B + "illinois/PA-101-0260.pdf", url="https://www.ilga.gov/legislation/publicacts/101/PDF/101-0260.pdf",
         landingPage="https://www.ilga.gov/Legislation/PublicActs/View/101-0260", license=LIC_IL, notes="Enacts §§ 1, 5, 10, 15.",
         mode="default", family="il-pa"),
    dict(id="il-pa-102-0047", title="Public Act 102-0047 (HB 53) — AI Video Interview Act: report of demographic data",
         identifier="Ill. P.A. 102-0047 (HB 53, 102nd G.A.); 820 ILCS 42/20", publisher="Illinois General Assembly",
         version="Public Act (Governor approved 2021-07-09; effective 2022-01-01)", published="2021-07-09", role="statute", mediaType=PDF,
         path=B + "illinois/PA-102-0047.pdf", url="https://www.ilga.gov/legislation/publicacts/102/PDF/102-0047.pdf",
         landingPage="https://www.ilga.gov/Legislation/PublicActs/View/102-0047", license=LIC_IL, notes="Adds § 20.",
         mode="default", family="il-pa"),
    dict(id="il-ilcs-820-42", title="820 ILCS 42 — Artificial Intelligence Video Interview Act (current ILCS text)",
         identifier="820 ILCS 42/1–20", publisher="Illinois General Assembly (Legislative Information System)",
         version="ILCS database as retrieved 2026-09-26 (sources P.A. 101-260; P.A. 102-47)", published="2026-09-26", role="statute",
         mediaType=HTML, path=B + "illinois/ilcs-820-42-ai-video-interview-act.html",
         url="https://www.ilga.gov/legislation/ILCS/Articles?ActID=4015&ChapterID=68",
         landingPage="https://www.ilga.gov/legislation/ILCS/Articles?ActID=4015&ChapterID=68", license=LIC_IL,
         notes="Consolidated current text; identical to the two public acts. Scanned for embedded tokens (none).", mode=None, family=None),
    dict(id="il-pa-104-0054", title="Public Act 104-0054 (HB 1806) — Wellness and Oversight for Psychological Resources Act",
         identifier="Ill. P.A. 104-0054 (HB 1806, 104th G.A.); 225 ILCS 155", publisher="Illinois General Assembly",
         version="Public Act (Governor approved 2025-08-01; effective 2025-08-01)", published="2025-08-01", role="statute", mediaType=PDF,
         path=B + "illinois/PA-104-0054.pdf", url="https://www.ilga.gov/Documents/Legislation/PublicActs/104/PDF/104-0054.pdf",
         landingPage="https://www.ilga.gov/Legislation/PublicActs/View/104-0054", license=LIC_IL,
         notes="Enacts 225 ILCS 155 (§§ 1–99). Bill status: 'Governor Approved 8/01/2025', 'Effective Date August 1, 2025'.",
         mode="default", family="il-pa"),
    dict(id="il-ilcs-225-155", title="225 ILCS 155 — Wellness and Oversight for Psychological Resources Act (current ILCS text)",
         identifier="225 ILCS 155/1–99", publisher="Illinois General Assembly (Legislative Information System)",
         version="ILCS database as retrieved 2026-09-26 (every section: '(Source: P.A. 104-54, eff. 8-1-25.)')", published="2026-09-26",
         role="statute", mediaType=HTML, path=B + "illinois/ilcs-225-155-wopr-act.html",
         url="https://www.ilga.gov/Legislation/ILCS/Articles?ActID=4608&ChapterID=24",
         landingPage="https://www.ilga.gov/Legislation/ILCS/Articles?ActID=4608&ChapterID=24", license=LIC_IL,
         notes="Currency check: no amendments since P.A. 104-54. Scanned for embedded tokens (none).", mode=None, family=None),
    # ------------------------------------------------------------------ Maine
    dict(id="me-pl-2025-c294", title="Laws of Maine 2025, Public Law chapter 294 (L.D. 1727) — An Act to Ensure Transparency in Consumer Transactions Involving Artificial Intelligence",
         identifier="Me. P.L. 2025, c. 294 (H.P. 1154, L.D. 1727); 10 M.R.S. § 1500-DD (enacted as § 1500-Y)", publisher="Maine Legislature (Revisor of Statutes; Law and Legislative Digital Library)",
         version="Session law as published in the Laws of the State of Maine, 132nd Legislature, First Special Session (signed 2025-06-12; general effective date 2025-09-24)",
         published="2025-06-12", role="statute", mediaType=PDF, path=B + "maine/PL-2025-c294-LD1727.pdf",
         url="https://lldc.mainelegislature.org/Open/Laws/2025/2025_PL_c294.pdf",
         landingPage="https://legislature.maine.gov/LawMakerWeb/summary.asp?paper=HP1154&SessionID=16",
         license=("Public legislative record (session law published by the Revisor of Statutes, reproduced by the Maine State Law and "
                  "Legislative Reference Library); the document carries no copyright notice. The State of Maine claims copyright in its "
                  "codified statutes, so the codified section is kept in .local/ (see me-mrs-10-1500-dd)."),
         notes=("Page 3 (printed p. 510) holds chapter 294; the page also shows the end of chapter 293 and the start of chapter 295. "
                "The Revisor reallocated § 1500-Y to § 1500-DD (chapter 239 to 241) by R.R. 2025, c. 1, Pt. A, § 16. Line-end "
                "hyphenation is removed in quotations (reviewed)."),
         mode="default", family="plain", dehyphenate=True),
    dict(id="me-mrs-10-1500-dd", title="Maine Revised Statutes, Title 10, § 1500-DD — Required disclosure of use of artificial intelligence chatbot to engage in trade and commerce",
         identifier="10 M.R.S. § 1500-DD", publisher="Maine Legislature — Office of the Revisor of Statutes",
         version="Generated 10.20.2025; 'current through October 1, 2025' (no later version listed on 2026-09-26)", published="2025-10-20",
         role="statute", mediaType=PDF, path=B + "maine/.local/MRS-title10-sec1500-DD.pdf",
         url="https://legislature.maine.gov/statutes/10/title10sec1500-DD.pdf",
         landingPage="https://legislature.maine.gov/statutes/10/title10sec1500-DD.html",
         license=("The document states: \"The State of Maine claims a copyright in its codified statutes. If you intend to republish this "
                  "material, we require that you include the following disclaimer in your publication: All copyrights and other rights "
                  "to statutory text are reserved by the State of Maine.\" Kept in .local/ (git-ignored)."),
         notes="Codified text (identical wording to P.L. 2025, c. 294, § 1); used to confirm the current section number.",
         mode="default", family="plain"),
    # ------------------------------------------------------------------ Utah
] + [
    dict(id=f"ut-code-{cid}", title=f"Utah Code {t}", identifier=ident, publisher="Utah Legislature — Office of Legislative Research and General Counsel",
         version=ver, published=pub, role="statute", mediaType=PDF, path=B + f"utah/code/{fn}",
         url=f"https://le.utah.gov/xcode/{sub}/{fn}", landingPage=f"https://le.utah.gov/xcode/{sub}/{land}", license=LIC_UT,
         notes=note, mode="default", family="ut-code")
    for cid, t, ident, ver, pub, sub, fn, land, note in [
        ("13-72", "Title 13, Chapter 72 — Artificial Intelligence Policy Act", "Utah Code §§ 13-72-101 to 13-72-403",
         "Current version (chapter version 2024-05-01; §§ 13-72-101, -201, -301, -401 to -403 as amended by Laws 2026, ch. 127, eff. 2026-05-06); PDF generated 2026-06-13",
         "2026-05-06", "Title13/Chapter72", "C13-72_2024050120240501.pdf", "13-72.html",
         "Enacted by S.B. 149 (2024) as ch. 70 of the bill, codified as ch. 72; repealed July 1, 2027 by § 63I-2-213(2)."),
        ("13-72a", "Title 13, Chapter 72a — Artificial Intelligence Applications Relating to Mental Health", "Utah Code §§ 13-72a-101 to 13-72a-301",
         "Current version (effective 2025-05-07; §§ 13-72a-101 and -204 amended by Laws 2026, ch. 95); PDF generated 2026-06-13",
         "2025-05-07", "Title13/Chapter72a", "C13-72a_2025050720250507.pdf", "13-72a.html",
         "Enacted by H.B. 452 (Laws of Utah 2025, ch. 269). The site shows an 'Affected by 63I-2-213 on 7/1/2027' flag for chapters 72a–72c, but § 63I-2-213 repeals only chapter 72."),
        ("13-72b", "Title 13, Chapter 72b — Digital Voyeurism Prevention Act", "Utah Code §§ 13-72b-101 to 13-72b-401",
         "Future version effective 2027-01-01 (enacted by Laws 2026, ch. 352); PDF generated 2026-06-13", "2027-01-01",
         "Title13/Chapter72b", "C13-72b_2026050620270101.pdf", "13-72b.html", "Enacted by H.B. 276 (2026)."),
        ("13-72c", "Title 13, Chapter 72c — Digital Content Provenance Standards Act", "Utah Code §§ 13-72c-101 to 13-72c-301",
         "Future version effective 2027-01-01 (enacted by Laws 2026, ch. 352); PDF generated 2026-06-13", "2027-01-01",
         "Title13/Chapter72c", "C13-72c_2026050620270101.pdf", "13-72c.html", "Enacted by H.B. 276 (2026)."),
        ("13-77", "Title 13, Chapter 77 — Generative Artificial Intelligence — Consumer Disclosures and Enforcement", "Utah Code §§ 13-77-101 to 13-77-106",
         "Current version (effective 2025-05-07; §§ 13-77-101 and -102 amended by Laws 2026, ch. 95); PDF generated 2026-05-08",
         "2025-05-07", "Title13/Chapter77", "C13-77_2025050820250508.pdf", "13-77.html",
         "Enacted by S.B. 226 (Laws of Utah 2025, ch. 465) as chapter 75 and renumbered 77 on codification; replaces § 13-2-12 (S.B. 149, 2024). Not subject to the July 1, 2027 repeal."),
        ("58-60-118", "§ 58-60-118 — Mental health chatbots — Affirmative defense", "Utah Code § 58-60-118",
         "Current version (effective 2025-05-07; the section page lists no other version); PDF retrieved 2026-09-26", "2025-05-07",
         "Title58/Chapter60", "C58-60-S118_2025050720250507.pdf", "58-60-S118.html",
         "Enacted by H.B. 452 (2025) § 8: affirmative defense to unlicensed-practice actions under § 58-1-501(1)–(2) for mental "
         "health chatbot suppliers that maintain documentation and file a compliant policy with the Division of Professional Licensing."),
        ("63i-2-213", "§ 63I-2-213 — Repeal dates: Title 13", "Utah Code § 63I-2-213",
         "Current version (effective 2025-05-07; amended by Laws 2025, ch. 277)", "2025-05-07", "Title63I/Chapter2",
         "C63I-2-S213_2025050720250507.pdf", "63I-2-S213.html",
         "'(2) Title 13, Chapter 72, Artificial Intelligence Policy Act, is repealed July 1, 2027.'"),
    ]
] + [
    dict(id=f"ut-{bid}", title=f"Utah {bill} ({yr} General Session), enrolled copy — {name}", identifier=f"Utah {bill} ({yr} G.S.){ch}",
         publisher="Utah Legislature", version=ver, published=pub, role="statute", mediaType=PDF, path=B + f"utah/bills/{fn}",
         url=url, landingPage=land, license=LIC_UT, notes=note, mode=None, family=None)
    for bid, bill, yr, name, ch, ver, pub, fn, url, land, note in [
        ("sb149-2024", "S.B. 149", 2024, "Artificial Intelligence Amendments", "; Laws of Utah 2024, ch. 186",
         "Enrolled; signed 2024-03-13; effective 2024-05-01", "2024-03-08", "SB0149-2024.pdf",
         "https://le.utah.gov/~2024/bills/sbillenr/SB0149.pdf", "https://le.utah.gov/~2024/bills/static/SB0149.html",
         "Created the Artificial Intelligence Policy Act and § 13-2-12 (disclosure); original repeal date May 1, 2025."),
        ("sb226-2025", "S.B. 226", 2025, "Artificial Intelligence Consumer Protection Amendments", "; Laws of Utah 2025, ch. 465",
         "Enrolled; signed 2025-03-27; effective 2025-05-07", "2025-03-13", "SB0226-2025.pdf",
         "https://le.utah.gov/Session/2025/bills/enrolled/SB0226.pdf", "https://le.utah.gov/~2025/bills/static/SB0226.html",
         "Repeals § 13-2-12, enacts §§ 13-75-101 to -106 (codified as 13-77), extends the AI Policy Act repeal to July 1, 2027."),
        ("sb332-2025", "S.B. 332", 2025, "Artificial Intelligence Revisions", "",
         "Enrolled; signed 2025-03-25", "2025-03-07", "SB0332-2025.pdf",
         "https://le.utah.gov/Session/2025/bills/enrolled/SB0332.pdf", "https://le.utah.gov/~2025/bills/static/SB0332.html",
         "Extends the repeal date of the Artificial Intelligence Policy Act to July 1, 2027 (§ 63I-2-213)."),
        ("hb452-2025", "H.B. 452", 2025, "Artificial Intelligence Amendments (mental health chatbots)", "; Laws of Utah 2025, ch. 269",
         "Enrolled; signed 2025-03-25; effective 2025-05-07", "2025-03-12", "HB0452-2025.pdf",
         "https://le.utah.gov/Session/2025/bills/enrolled/HB0452.pdf", "https://le.utah.gov/~2025/bills/static/HB0452.html",
         "Enacts Title 13, Chapter 72a."),
        ("hb276-2026", "H.B. 276", 2026, "Artificial Intelligence Modifications", "; Laws of Utah 2026, ch. 352",
         "Enrolled; signed 2026-03-24; effective 2027-01-01", "2026-03-11", "HB0276-2026.pdf",
         "https://le.utah.gov/Session/2026/bills/enrolled/HB0276.pdf", "https://le.utah.gov/~2026/bills/static/HB0276.html",
         "Enacts the Digital Voyeurism Prevention Act (ch. 72b) and the Digital Content Provenance Standards Act (ch. 72c)."),
        ("hb320-2026", "H.B. 320", 2026, "Office of Artificial Intelligence Policy Amendments", "; Laws of Utah 2026, ch. 127",
         "Enrolled; signed 2026-03-18; effective 2026-05-06", "2026-03-06", "HB0320-2026.pdf",
         "https://le.utah.gov/Session/2026/bills/enrolled/HB0320.pdf", "https://le.utah.gov/~2026/bills/static/HB0320.html",
         "Amends chapter 72 (office duties, learning laboratory, regulatory mitigation and joint interpretation agreements)."),
    ]
]

DOC = {d["id"]: d for d in DOCS}
