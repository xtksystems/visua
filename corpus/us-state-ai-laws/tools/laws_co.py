"""Colorado — SB 26-189 (ADMT Act), SB 24-205 (Colorado AI Act, stayed/replaced), HB 26-1263 (conversational AI services).

Session-law text prints new statutory material in capital letters; quotations keep that casing.
"""
from common import Q

SB189 = "co-sb26-189-sl-ch131"
FN189 = "co-sb26-189-fiscal-note"
HB1263 = "co-hb26-1263-sl-ch208"
FN1263 = "co-hb26-1263-fiscal-note"
SB205 = "co-sb24-205-sl-ch198"
SB25B = "co-sb25b-004-sl-ch3"

STAY = ("X.AI LLC v. Weiser, No. 1:26-cv-01515 (D. Colo.): on 2026-04-27 the court granted the parties' joint motion and ordered the "
        "Attorney General not to initiate enforcement of SB 24-205 'or any legislation amending SB 24-205' until the AG completes "
        "rulemaking and the court rules (SB 26-189 final fiscal note, p. 5). Press and docket summaries (not verified from court "
        "records) report that the plaintiff may file an amended complaint and a preliminary-injunction motion within 28 days after "
        "final adoption of rules implementing SB 26-189, and that the United States intervened on the plaintiff's side.")

CCPA_PENALTY = Q(FN189, "Under the Colorado Consumer Protection Act, a person committing a deceptive trade practice",
                 "for subsequent violations of a court order or injunction.", suffix=" (SB 26-189 final fiscal note, p. 5)")

LAWS = [
    # ------------------------------------------------------------------ SB 26-189
    dict(
        id="co-admt-act",
        jurisdiction="Colorado",
        title="Colorado Automated Decision-Making Technology Act (SB 26-189)",
        citation="C.R.S. §§ 6-1-1701 to 6-1-1709 (part 17 of article 1 of title 6, repealed and reenacted by SB 26-189, Colo. Sess. Laws 2026, ch. 131); C.R.S. § 6-1-105(1)(uuuu); § 10-3-1104.9(3)(e)",
        status="enacted, not yet effective",
        statusNote=("Approved 2026-05-14; takes effect 2027-01-01 and applies to consequential decisions made on or after that date "
                    "(SB 26-189 § 5). Rulemaking sections took effect on passage: the Attorney General must adopt rules on post-adverse "
                    "outcome disclosures and consumer rights by 2027-01-01; proposed rules 4 CCR 904-6 were filed 2026-08-11 with a "
                    "hearing on 2026-10-26 (proposed text kept in .local/, not extracted). " + STAY + " The court order therefore "
                    "also reaches this Act. The 60-day cure right in § 6-1-1706(3) is repealed 2030-01-01."),
        enacted="2026-05-14", effective="2027-01-01", sunset=None,
        appliesTo=[
            dict(role="developer", condition=[
                Q(SB189, "(8) (a) \"DEVELOPER\" MEANS A PERSON DOING BUSINESS IN COLORADO THAT:", "SUCH THAT IT BECOMES A COVERED ADMT."),
                " (§ 6-1-1701(8)(a)); ",
                Q(SB189, "(5) THIS SECTION APPLIES WHEN A DEVELOPER CREATES A COVERED ADMT THAT", "IN A MANNER CONSISTENT WITH THE INTENDED AND CONTRACTED USES."),
                " (§ 6-1-1702(5))"]),
            dict(role="deployer", condition=[
                Q(SB189, "(7) \"DEPLOYER\" MEANS A PERSON DOING BUSINESS IN COLORADO THAT DEPLOYS", "A COVERED ADMT."),
                " (§ 6-1-1701(7)); ",
                Q(SB189, "(5) \"COVERED ADMT\" MEANS AUTOMATED DECISION-MAKING TECHNOLOGY", "USED TO MATERIALLY INFLUENCE A CONSEQUENTIAL DECISION."),
                " (§ 6-1-1701(5)); ",
                Q(SB189, "(6) \"COVERED DOMAIN\" MEANS:", "INCLUDING ELIGIBILITY AND RENEWAL DETERMINATIONS."),
                " (§ 6-1-1701(6))"]),
        ],
        enforcement=dict(
            authority=[Q(SB189, "(1) (a) THE ATTORNEY GENERAL SHALL ENFORCE THIS PART 17 THROUGH THE", "WITHOUT REGARD TO ANY OTHER PROVISION IN THIS TITLE 6."),
                       " (§ 6-1-1706(1)); ",
                       Q(SB189, "(2) (a) A VIOLATION OF THIS PART 17 IS A DECEPTIVE TRADE PRACTICE AND IS", "THIS ARTICLE 1.", after="(2) (a) A VIOLATION OF THIS PART 17"),
                       " (§ 6-1-1706(2)(a))"],
            penalties=CCPA_PENALTY,
            privateRightOfAction=False,
            privateRightOfActionNote=[Q(SB189, "(4) NOTHING IN THIS PART 17 CREATES A NEW PRIVATE RIGHT OF ACTION.", "PRODUCT LIABILITY LAW; OR OTHER APPLICABLE LAW."),
                                      " (§ 6-1-1706(4)); developers and deployers may be held liable under state anti-discrimination law for "
                                      "consequential decisions materially influenced by a covered ADMT (§ 6-1-1707(1))."],
        ),
        safeHarbors=[
            dict(text=Q(SB189, "(3) (a) PRIOR TO ANY ENFORCEMENT ACTION FOR A VIOLATION OF THIS PART 17,", "BRING AN ACTION PURSUANT TO THIS SECTION."),
                 section="C.R.S. § 6-1-1706(3)(a)–(b) (notice and 60-day cure; not available for knowing or repeated violations, § 6-1-1706(3)(c); repealed 2030-01-01, § 6-1-1706(3)(f))", references=[]),
            dict(text=Q(SB189, "(2) A DEPLOYER COMPLIES WITH SUBSECTION (1) OF THIS SECTION BY", "IN WHICH A CONSEQUENTIAL DECISION MAY OCCUR."),
                 section="C.R.S. § 6-1-1704(2) (public notice satisfies the point-of-interaction notice)", references=[]),
            dict(text=Q(SB189, "(6) (a) A CREDITOR, WITH RESPECT TO A CONSEQUENTIAL DECISION INVOLVING", "A SEPARATE OR DUPLICATIVE NOTICE PURSUANT TO THIS SECTION."),
                 section="C.R.S. § 6-1-1704(6)(a)–(b)", references=["Equal Credit Opportunity Act / Regulation B (12 CFR 1002)", "Fair Credit Reporting Act"]),
            dict(text=Q(SB189, "(9) (a) FOR A CONSEQUENTIAL DECISION RELATING TO EDUCATION, A DEPLOYER", "ESTABLISHED A NOTICE OR DISCLOSURE PROCESS TO COMPLY WITH FERPA."),
                 section="C.R.S. § 6-1-1704(9)", references=["FERPA (20 U.S.C. § 1232g)"]),
            dict(text=Q(SB189, "(2) (a) FOR A CONSEQUENTIAL DECISION RELATING TO EDUCATION, A DEPLOYER", "RECONSIDERATION PROCESS TO COMPLY WITH FERPA."),
                 section="C.R.S. § 6-1-1705(2)", references=["FERPA (20 U.S.C. § 1232g)"]),
            dict(text=Q(SB189, "(1) (a) AN INSURER, AS DEFINED IN SECTION 10-1-102 (13), AND AFFILIATED", "COMPLIANCE WITH THIS PART 17 IN THE PRACTICE OF INSURANCE."),
                 section="C.R.S. § 6-1-1708(1)(a) (employment uses by insurers stay covered, § 6-1-1708(2))", references=["C.R.S. § 10-3-1104.9"]),
            dict(text=Q(SB189, "(3) (a) SECTIONS 6-1-1701, 6-1-1702, 6-1-1703, 6-1-1704, 6-1-1705, AND", "RELATED TO EMPLOYMENT OR AN EMPLOYMENT OPPORTUNITY."),
                 section="C.R.S. § 6-1-1708(3)(a) (HIPAA covered entities and business associates; providers only when operating from a Colorado location, § 6-1-1708(3)(b))",
                 references=["HIPAA (42 U.S.C. §§ 1320d to 1320d-9)"]),
            dict(text=Q(SB189, "(4) SECTIONS 6-1-1701, 6-1-1702, 6-1-1703, 6-1-1704, 6-1-1705, AND 6-1-1706", "INCLUDING CLINICAL INVESTIGATIONS CONDUCTED UNDER 21 CFR 312."),
                 section="C.R.S. § 6-1-1708(4)", references=["FDA oversight (21 CFR 312)"]),
        ],
        sources=[
            dict(documentId=SB189, section="SB 26-189 §§ 1–6 (C.R.S. §§ 6-1-1701 to 6-1-1709, 6-1-105(1)(uuuu), 10-3-1104.9(3)(e))"),
            dict(documentId=FN189, section="Final fiscal note: enforcement, legal proceedings, civil penalties"),
            dict(documentId="co-ag-4ccr904-6-proposed", section="Proposed rules 4 CCR 904-6 (not adopted; .local)"),
            dict(documentId="co-ag-4ccr904-6-notice", section="Notice of proposed rulemaking (.local)"),
        ],
        obligations=[
            dict(id="co-admt-developer-documentation", title="Give deployers documentation on covered ADMT", doc=SB189,
                 start="(1) ON AND AFTER JANUARY 1, 2027, A DEVELOPER SHALL MAKE AVAILABLE TO", end="IF INFORMATION IS WITHHELD, THE DEVELOPER SHALL NOTIFY THE DEPLOYER.",
                 section="C.R.S. § 6-1-1702(1)", role="developer", effective="2027-01-01", category="documentation",
                 evidence=["Deployer documentation package per covered ADMT (intended and harmful uses, training data categories, limitations, use/monitoring/human-review instructions)",
                           "Record of delivery to each deployer", "Log of withheld information and notices sent to deployers"]),
            dict(id="co-admt-developer-update-notices", title="Notify deployers of material updates and changes", doc=SB189,
                 start="(2) (a) A DEVELOPER SHALL PROVIDE TO EACH DEPLOYER OF A COVERED ADMT", end="RELEASE TO EACH DEPLOYER OF THE COVERED ADMT.",
                 section="C.R.S. § 6-1-1702(2)", role="developer", effective="2027-01-01", category="notice",
                 evidence=["Release notes or change notices for each material update or intentional and substantial modification",
                           "Direct notification records to each deployer (when relying on public release notes)"]),
            dict(id="co-admt-developer-records", title="Developers keep compliance records three years", doc=SB189,
                 start="(4) A DEVELOPER SHALL RETAIN, FOR NOT LESS THAN THREE YEARS AFTER THE", end="PROVIDED TO DEPLOYERS PURSUANT TO SUBSECTION (2) OF THIS SECTION.",
                 section="C.R.S. § 6-1-1702(4)", role="developer", effective="2027-01-01", category="record-keeping",
                 evidence=["Retention schedule (at least three years)", "Archived version identifiers, changelogs and deployer notices"]),
            dict(id="co-admt-deployer-records", title="Deployers keep compliance records three years", doc=SB189,
                 start="A DEPLOYER SHALL RETAIN, FOR NOT LESS THAN THREE YEARS AFTER THE DATE", end="DOCUMENTATION OF MATERIAL MITIGATION CHANGES.",
                 section="C.R.S. § 6-1-1703", role="deployer", effective="2027-01-01", category="record-keeping",
                 evidence=["Retention schedule (at least three years after each consequential decision)", "Records of ADMT versions and mitigation changes in use at decision time"]),
            dict(id="co-admt-pre-decision-notice", title="Notify consumers before ADMT-influenced consequential decisions", doc=SB189,
                 start="(1) PRIOR TO A DEPLOYER USING A COVERED ADMT TO MATERIALLY INFLUENCE", end="INFORMATION DESCRIBED IN THIS SECTION.",
                 section="C.R.S. § 6-1-1704(1)", role="deployer", effective="2027-01-01", category="notice",
                 evidence=["Consumer notice text and placement at points of interaction", "Screenshots of the public notice or link near the transaction"]),
            dict(id="co-admt-adverse-outcome-disclosure", title="Explain adverse outcomes within thirty days", doc=SB189,
                 start="(3) IF A DEPLOYER USES A COVERED ADMT TO MATERIALLY INFLUENCE A", end="SECTION 6-1-1705 AND HOW TO EXERCISE THEM.",
                 section="C.R.S. § 6-1-1704(3)", role="deployer", effective="2027-01-01", category="disclosure",
                 evidence=["Adverse-outcome disclosure template (decision, ADMT role, how to request more information, rights)",
                           "Delivery log showing disclosures sent within 30 days", "Process for answering requests for ADMT name, version, developer and data categories"]),
            dict(id="co-admt-withholding-notice", title="Tell consumers when information is withheld", doc=SB189,
                 start="(5) NOTHING IN THIS SECTION REQUIRES A DEPLOYER TO DISCLOSE A TRADE", end="THE DEPLOYER SHALL NOTIFY THE CONSUMER.",
                 section="C.R.S. § 6-1-1704(5)", role="deployer", effective="2027-01-01", category="notice",
                 evidence=["Withholding notice template", "Log of disclosures withheld as trade secrets or legally protected information"]),
            dict(id="co-admt-accessible-notices", title="Make notices accessible to disabled and LEP consumers", doc=SB189,
                 start="(8) A DEPLOYER OR DEVELOPER SHALL PROVIDE THE NOTICES AND DISCLOSURES", end="CONSISTENT WITH APPLICABLE STATE AND FEDERAL LAW.",
                 section="C.R.S. § 6-1-1704(8)", role="deployer, developer", effective="2027-01-01", category="disclosure",
                 evidence=["Accessibility review (e.g., WCAG conformance) of notices", "Translated notices for the main languages of consumers served"]),
            dict(id="co-admt-correction-and-human-review", title="Offer data correction and meaningful human review", doc=SB189,
                 start="(1) (a) WHEN A CONSUMER EXPERIENCES AN ADVERSE OUTCOME RESULTING", end="OF THE CONSEQUENTIAL DECISION, TO THE EXTENT COMMERCIALLY REASONABLE.",
                 section="C.R.S. § 6-1-1705(1)(a)", role="deployer", effective="2027-01-01", category="appeal",
                 evidence=["Consumer request intake for personal data access and correction", "Human-review procedure naming trained reviewers with authority to override",
                           "Case log of reconsideration requests and outcomes"]),
            dict(id="co-admt-no-indemnity-for-discrimination", title="Indemnity for own discriminatory ADMT use is void", doc=SB189,
                 start="(7) (a) NOTWITHSTANDING ANY OTHER PROVISION OF LAW, IF A PROVISION OF A", end="POLICY AND VOID.",
                 fix=[("CO N SEQ U EN TIAL D ECISIO NS IN V IO LA TIO N OF THE \"CO LO RA D O", "CONSEQUENTIAL DECISIONS IN VIOLATION OF THE \"COLORADO")],
                 section="C.R.S. § 6-1-1707(7)(a)", role="developer, deployer", effective="2027-01-01", category="other",
                 notes="The PDF text layer letter-spaces one justified line ('CO N SEQ U EN TIAL …'); the quotation restores the printed words.",
                 evidence=["Contract review of developer–deployer indemnity clauses", "Updated ADMT contract templates"]),
            dict(id="co-admt-insurer-disclosures", title="Insurers not deemed compliant give adverse-outcome disclosures", doc=SB189,
                 start="(b) IF AN INSURER IS NOT DEEMED IN COMPLIANCE PURSUANT TO SUBSECTION", end="SECTION 6-1-1704 (3), TO THE EXTENT APPLICABLE.",
                 section="C.R.S. § 6-1-1708(1)(b)", role="insurer", effective="2027-01-01", category="disclosure",
                 evidence=["Analysis of whether C.R.S. § 10-3-1104.9 applies", "Adverse-outcome disclosure template for insurance decisions"]),
            dict(id="co-admt-hipaa-patient-notice", title="Covered entities give patients general ADMT notice", doc=SB189,
                 start="(c) A COVERED ENTITY SHALL PROVIDE PATIENTS WITH A GENERAL NOTICE OF USE", end="COVERED ENTITY PROVIDES CARE.",
                 section="C.R.S. § 6-1-1708(3)(c)", role="health-care-provider", effective="2027-01-01", category="notice",
                 evidence=["Patient notice of advanced technology use (may be combined with patient-rights notices)"]),
            dict(id="co-admt-financial-assistance-disclosures", title="Disclose ADMT use in patient financial-assistance decisions", doc=SB189,
                 start="(d) NOTWITHSTANDING SUBSECTION (3)(a) OF THIS SECTION, A COVERED ENTITY", end="SUBSECTION (3)(d) OF THIS SECTION ARE PROVIDED.",
                 section="C.R.S. § 6-1-1708(3)(d)–(e)", role="health-care-provider", effective="2027-01-01", category="disclosure",
                 evidence=["Financial-assistance eligibility disclosure (advance or within 30 days of an adverse outcome)",
                           "Correction and human-review request procedure for patients"]),
        ],
    ),
    # ------------------------------------------------------------------ SB 24-205
    dict(
        id="co-ai-act-2024",
        jurisdiction="Colorado",
        title="Colorado Artificial Intelligence Act (SB 24-205)",
        citation="C.R.S. §§ 6-1-1701 to 6-1-1707 as enacted by SB 24-205 (Colo. Sess. Laws 2024, ch. 198) and amended by SB 25B-004 (2025 1st Ex. Sess., ch. 3)",
        status="enjoined",
        statusNote=("Operative dates moved from 2026-02-01 to 2026-06-30 by SB 25B-004. " + STAY + " SB 26-189 repeals and reenacts part 17 "
                    "effective 2027-01-01, so these duties end on that date. No obligations are extracted: enforcement is barred until "
                    "rules are complete, and the pending rules implement SB 26-189 (proposed effective 2027-01-01). Whether conduct between "
                    "2026-06-30 and 2026-12-31 could be pursued later is unresolved."),
        enacted="2024-05-17", effective="2026-06-30", sunset="2027-01-01",
        appliesTo=[
            dict(role="developer", condition=[Q(SB205, "(7) \"DEVELOPER\" MEANS A PERSON DOING BUSINESS IN THIS STATE THAT", "INTELLIGENCE SYSTEM."),
                                              " (§ 6-1-1701(7) as enacted by SB 24-205)"]),
            dict(role="deployer", condition=[Q(SB205, "(6) \"DEPLOYER\" MEANS A PERSON DOING BUSINESS IN THIS STATE THAT DEPLOYS", "A HIGH-RISK ARTIFICIAL INTELLIGENCE SYSTEM."),
                                             " (§ 6-1-1701(6)); ",
                                             Q(SB205, "(9) (a) \"HIGH-RISK ARTIFICIAL INTELLIGENCE SYSTEM\" MEANS ANY ARTIFICIAL", "FACTOR IN MAKING, A CONSEQUENTIAL DECISION."),
                                             " (§ 6-1-1701(9)(a))"]),
        ],
        enforcement=dict(
            authority=[Q(SB205, "(1) NOTWITHSTANDING SECTION 6-1-103, THE ATTORNEY GENERAL HAS EXCLUSIVE AUTHORITY TO ENFORCE THIS", "PRACTICE PURSUANT TO SECTION 6-1-105 (1)(hhhh)."),
                       " (§ 6-1-1706(1)–(2) as enacted by SB 24-205). Enforcement stayed by court order of 2026-04-27."],
            penalties=CCPA_PENALTY,
            privateRightOfAction=False,
        ),
        safeHarbors=[],
        sources=[
            dict(documentId=SB205, section="SB 24-205 (C.R.S. §§ 6-1-1701 to 6-1-1707 as enacted)"),
            dict(documentId=SB25B, section="SB 25B-004 (dates moved to June 30, 2026)"),
            dict(documentId=FN189, section="Final fiscal note p. 5 (court order of 2026-04-27)"),
            dict(documentId=SB189, section="SB 26-189 § 1 (repeal and reenactment of part 17, effective 2027-01-01)"),
        ],
        obligations=[],
    ),
    # ------------------------------------------------------------------ HB 26-1263
    dict(
        id="co-chatbot-safety-act",
        jurisdiction="Colorado",
        title="Colorado Conversational AI Service Operator Requirements (HB 26-1263)",
        citation="C.R.S. § 6-1-1701(3.5), (10.5), (12.5), (15.3), (15.5), (16.5), (18) and § 6-1-1708 (added by HB 26-1263, Colo. Sess. Laws 2026, ch. 208)",
        status="in force",
        statusNote=("Approved 2026-05-29; the Act took effect 2026-08-12 (no referendum petition). Operator duties apply on and after "
                    "2027-01-01 and annual reporting from 2027-07-01; the Attorney General's rulemaking notice (2026-08-11) calls it the "
                    "'Chatbot Safety Act' and describes it as effective 2027-01-01. SB 26-189 (approved earlier, effective 2027-01-01) "
                    "repeals and reenacts part 17 and enacts a different § 6-1-1708; the Revisor of Statutes must reconcile the two, and "
                    "the AG's proposed rules treat both acts as operative. The 2026-04-27 order in X.AI LLC v. Weiser bars enforcement of "
                    "'any legislation amending SB 24-205' until rulemaking and a ruling; whether that reaches this Act is not settled."),
        enacted="2026-05-29", effective="2026-08-12", sunset=None,
        appliesTo=[
            dict(role="operator", condition=[
                Q(HB1263, "(15.5) (a) \"OPERATOR\" MEANS A PERSON, PARTNERSHIP, CORPORATION, OR", "CONVERSATIONAL ARTIFICIAL INTELLIGENCE SERVICE.",
                  after="(15.5) (a)", occ=1),
                " (§ 6-1-1701(15.5)); ",
                Q(HB1263, "(3.5) (a) \"CONVERSATIONAL ARTIFICIAL INTELLIGENCE SERVICE\" MEANS AN", "ADAPTIVE TEXTUAL, VISUAL, OR AURAL COMMUNICATIONS."),
                " (§ 6-1-1701(3.5)(a)). Excluded (§ 6-1-1701(3.5)(b)): developer or research tools, commerce and customer-service assistants, "
                "narrow-topic tools that cannot produce sexual content or sustain self-harm dialogue, business productivity tools, device voice "
                "assistants, internal-only uses, video-game and theme-park features, HIPAA covered entities and business associates, Health Care "
                "Availability Act entities, school tools, and features inside other software that are not designed for emotional companionship."]),
        ],
        enforcement=dict(
            authority=["No enforcement section of its own; the Act is part of part 17 of article 1 of title 6 (Colorado Consumer Protection Act). From 2027-01-01: ",
                       Q(SB189, "(1) (a) THE ATTORNEY GENERAL SHALL ENFORCE THIS PART 17 THROUGH THE", "\"COLORADO CONSUMER PROTECTION ACT\", THIS ARTICLE 1."),
                       " (§ 6-1-1706(1)(a) as reenacted by SB 26-189); ",
                       Q(SB189, "(2) (a) A VIOLATION OF THIS PART 17 IS A DECEPTIVE TRADE PRACTICE AND IS", "THIS ARTICLE 1.", after="(2) (a) A VIOLATION OF THIS PART 17"),
                       " (§ 6-1-1706(2)(a))."],
            penalties=CCPA_PENALTY,
            privateRightOfAction=False,
            privateRightOfActionNote=[Q(SB189, "(1) NOTHING IN THIS PART 17 CREATES A NEW PRIVATE RIGHT OF ACTION.", "(1) NOTHING IN THIS PART 17 CREATES A NEW PRIVATE RIGHT OF ACTION."),
                                      " (§ 6-1-1709(1) as reenacted by SB 26-189)"],
        ),
        safeHarbors=[],
        sources=[
            dict(documentId=HB1263, section="HB 26-1263 §§ 1–3"),
            dict(documentId=FN1263, section="Final fiscal note (effective date, summary)"),
            dict(documentId=SB189, section="SB 26-189 § 1 (§§ 6-1-1706, 6-1-1709 as reenacted)"),
            dict(documentId="co-ag-4ccr904-6-proposed", section="Proposed rules 4 CCR 904-6 (not adopted; .local)"),
        ],
        obligations=[
            dict(id="co-chatbot-age-estimation", title="Estimate user age; do not ignore evidence of minors", doc=HB1263,
                 start="(2) Minor account holders and minor users. AN OPERATOR SHALL USE", end="OF THE MINOR'S AGE.",
                 section="C.R.S. § 6-1-1708(2) (first three sentences)", role="operator", effective="2026-08-12", category="other",
                 notes="These sentences carry no operative date of their own (the rest of subsection (2) applies on and after 2027-01-01); the AG treats the Act as effective 2027-01-01.",
                 evidence=["Age-estimation method description and accuracy evaluation", "Escalation procedure for clear and convincing signals that a user is a minor"]),
            dict(id="co-chatbot-minor-ai-disclosure", title="Tell known minors they are talking to AI", doc=HB1263,
                 start="ON AND AFTER JANUARY 1, 2027, IF AN OPERATOR KNOWS", end="INTELLIGENCE SERVICE INTERACTION;",
                 after="(2) Minor account holders and minor users.",
                 section="C.R.S. § 6-1-1708(2) (lead-in) and (2)(a)", role="operator", effective="2027-01-01", category="disclosure",
                 evidence=["Screenshots of persistent disclaimers (screen) or audio disclaimers (no screen)", "Test log of responses to 'are you human?' prompts",
                           "Timer configuration showing reminders at least every three hours"]),
            dict(id="co-chatbot-minor-no-variable-rewards", title="No unpredictable engagement rewards for minors", doc=HB1263,
                 start="(b) NOT PROVIDE THE MINOR ACCOUNT HOLDER OR MINOR USER WITH POINTS OR", end="SERVICE;",
                 section="C.R.S. § 6-1-1708(2)(b)", role="operator", effective="2027-01-01", category="prohibition",
                 evidence=["Product review of rewards and gamification features shown to minors"]),
            dict(id="co-chatbot-minor-sexual-content-measures", title="Block sexual content and interactions with minors", doc=HB1263,
                 start="(c) INSTITUTE TECHNICALLY FEASIBLE MEASURES TO PREVENT A", end="ACCOUNT HOLDER OR MINOR USER;",
                 after="(b) NOT PROVIDE THE MINOR ACCOUNT HOLDER",
                 section="C.R.S. § 6-1-1708(2)(c)", role="operator", effective="2027-01-01", category="prohibition",
                 evidence=["Content classifiers and filters for minors (configuration and test results)", "Red-team results for sexual content with minor personas"]),
            dict(id="co-chatbot-minor-emotional-dependence", title="Prevent emotional-dependence and romantic role-play with minors", doc=HB1263,
                 start="(d) INSTITUTE REASONABLE MEASURES TO PREVENT A CONVERSATIONAL", end="ROLE-PLAYING OF AN ADULT-MINOR ROMANTIC RELATIONSHIP;",
                 section="C.R.S. § 6-1-1708(2)(d)", role="operator", effective="2027-01-01", category="prohibition",
                 evidence=["Response-policy rules against sentience claims and romantic companionship for minors", "Evaluation results for isolation and dependence scenarios"]),
            dict(id="co-chatbot-minor-sexual-conduct-protocols", title="Protocols stopping sexual conduct with minors", doc=HB1263,
                 start="(e) IMPLEMENT A PROTOCOL TO PROHIBIT A CONVERSATIONAL ARTIFICIAL", end="USER PROMPT REGARDING EXPLICIT SEXUAL CONDUCT WITH A MINOR;",
                 section="C.R.S. § 6-1-1708(2)(e)–(f)", role="operator", effective="2027-01-01", category="prohibition",
                 evidence=["Written protocol and its test results", "Incident log of stopped interactions"]),
            dict(id="co-chatbot-minor-privacy", title="Comply with Colorado Privacy Act for minors", doc=HB1263,
                 start="(g) COMPLY WITH PART 13 OF THIS ARTICLE 1 REGARDING PROTECTING THE", end="PRIVACY AND DATA OF A MINOR; AND",
                 section="C.R.S. § 6-1-1708(2)(g)", role="operator", effective="2027-01-01", category="other",
                 evidence=["Colorado Privacy Act compliance assessment covering minors' data (including consent and data protection assessments)"]),
            dict(id="co-chatbot-minor-privacy-tools", title="Privacy and memory controls for minors and parents", doc=HB1263,
                 start="(h) (I) OFFER TOOLS FOR THE MINOR ACCOUNT HOLDER OR MINOR USER TO", end="PRIVACY AND ACCOUNT SETTINGS.",
                 after="(h) (I) OFFER TOOLS",
                 section="C.R.S. § 6-1-1708(2)(h)", role="operator", effective="2027-01-01", category="other",
                 evidence=["Settings screens for memory/personalization and training-data opt-out", "Parent or guardian controls documentation"]),
            dict(id="co-chatbot-ai-disclosure-all-users", title="Disclose AI to all users daily and periodically", doc=HB1263,
                 start="(3) Consumer disclosures. ON AND AFTER JANUARY 1, 2027, AN OPERATOR", end="AND NOT HUMAN.",
                 after="(3) Consumer disclosures.",
                 section="C.R.S. § 6-1-1708(3)", role="operator", effective="2027-01-01", category="disclosure",
                 evidence=["Screenshots of first-interaction-of-day disclosure", "Persistent or three-hourly disclosure configuration", "Test log of responses to 'are you human?' prompts"]),
            dict(id="co-chatbot-suicide-protocol", title="Suicide and self-harm referral and escalation protocol", doc=HB1263,
                 start="(4) Suicide and self-harm protocol. ON AND AFTER JANUARY 1, 2027, AN", end="ESCALATION PROCEDURES FOR REPEATED OR SEVERE CRISIS INDICATORS.",
                 section="C.R.S. § 6-1-1708(4)", role="operator", effective="2027-01-01", category="other",
                 evidence=["Crisis-response protocol with referral resources (not law enforcement)", "Escalation procedure for repeated or severe indicators",
                           "Detection and referral test results"]),
            dict(id="co-chatbot-no-professional-claims", title="No claims outputs come from licensed professionals", doc=HB1263,
                 start="(5) False representation. ON AND AFTER JANUARY 1, 2027, AN OPERATOR SHALL", end="(d) A QUALIFIED DIETITIAN, AS DESCRIBED IN SECTION 6-1-707 (1)(b).",
                 section="C.R.S. § 6-1-1708(5)", role="operator", effective="2027-01-01", category="prohibition",
                 evidence=["Marketing and UI copy review for health, legal, mental-health and dietitian claims", "Output filters for professional-endorsement statements"]),
            dict(id="co-chatbot-annual-report-ag", title="Report crisis referrals and protocols to AG annually", doc=HB1263,
                 start="(a) ON AND AFTER JULY 1, 2027, AN OPERATOR SHALL ANNUALLY REPORT TO THE", end="CONVERSATIONAL ARTIFICIAL INTELLIGENCE SERVICE.",
                 after="(6) Annual reporting.",
                 section="C.R.S. § 6-1-1708(6)(a)–(b)", role="operator", effective="2027-07-01", category="documentation",
                 evidence=["Annual report to the Attorney General (referral counts, protocols, AG-specified metrics)", "De-identification review of the report"]),
            dict(id="co-chatbot-evidence-based-measurement", title="Measure suicidal ideation with evidence-based methods", doc=HB1263,
                 start="(d) FOR THE PURPOSE OF CREATING A REPORT AS REQUIRED BY SUBSECTION (6)(a)", end="MEASURING SUICIDAL IDEATION OR SELF-HARM.",
                 section="C.R.S. § 6-1-1708(6)(d)", role="operator", effective="2027-07-01", category="other",
                 evidence=["Documentation of the validated measurement method used (e.g., a clinically validated screening scale)"]),
        ],
    ),
]
