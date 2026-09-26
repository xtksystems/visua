"""Utah — generative AI consumer disclosures (ch. 77), Artificial Intelligence Policy Act (ch. 72), mental health chatbots
(ch. 72a and § 58-60-118), Digital Content Provenance Standards Act (ch. 72c) and Digital Voyeurism Prevention Act (ch. 72b)."""
from common import Q

C77 = "ut-code-13-77"
C72 = "ut-code-13-72"
C72A = "ut-code-13-72a"
C72B = "ut-code-13-72b"
C72C = "ut-code-13-72c"
S58 = "ut-code-58-60-118"
REPEAL = "ut-code-63i-2-213"

LAWS = [
    # ------------------------------------------------------------------ chapter 77
    dict(
        id="ut-genai-disclosures",
        jurisdiction="Utah",
        title="Utah Generative AI Consumer Disclosures and Enforcement",
        citation="Utah Code §§ 13-77-101 to 13-77-106 (S.B. 226, Laws of Utah 2025, ch. 465; §§ 13-77-101 and -102 amended by Laws 2026, ch. 95)",
        status="in force",
        statusNote=("Effective 2025-05-07. Replaced the 2024 disclosure rule in former § 13-2-12 (S.B. 149). Not subject to the "
                    "2027-07-01 repeal of the Artificial Intelligence Policy Act (§ 63I-2-213 names only chapter 72)."),
        enacted="2025-03-27", effective="2025-05-07", sunset=None,
        appliesTo=[
            dict(role="supplier", condition=[
                "Suppliers (as defined in § 13-11-3) that use generative AI in consumer transactions; ",
                Q(C77, "(4) \"Generative artificial intelligence\" means an artificial intelligence technology system that:", "human oversight."),
                " (§ 13-77-101(4))"]),
            dict(role="licensed-professional", condition=[
                Q(C77, "(8) \"Regulated occupation\" means an occupation that:", "state certification to practice the occupation."),
                " (§ 13-77-101(8)); ",
                Q(C77, "(5) \"High-risk artificial intelligence interaction\" means an interaction", "(c) other applications as defined by division rule."),
                " (§ 13-77-101(5))"]),
        ],
        enforcement=dict(
            authority=[Q(C77, "(1) A violation of this chapter constitutes a violation of Subsection 13-11-4(1).", "in accordance with Chapter 2, Division of Consumer Protection."),
                       " (§ 13-77-105(1)–(2)); the Attorney General acts as the Division's counsel (§ 13-77-105(3))."],
            penalties=[Q(C77, "(a) the division director may impose an administrative fine of up to $2,500 for each violation of", "this chapter; and"),
                       " (§ 13-77-105(4)(a)); ",
                       Q(C77, "(e) impose a fine of up to $2,500 for each violation of this chapter; or", "(e) impose a fine of up to $2,500 for each violation of this chapter; or"),
                       " (§ 13-77-105(5)(e)); ",
                       Q(C77, "(a) A person who violates an administrative or court order issued for a violation of this chapter is", "subject to a civil penalty of up to $5,000 for each violation."),
                       " (§ 13-77-105(7)(a))"],
            privateRightOfAction=True,
            privateRightOfActionNote=("Indirect and untested: chapter 77 has no private action of its own, but a violation 'constitutes a "
                                      "violation of Subsection 13-11-4(1)' of the Utah Consumer Sales Practices Act, whose remedies include "
                                      "consumer actions (§ 13-11-19; not in this corpus). § 13-77-106 preserves other remedies."),
        ),
        safeHarbors=[
            dict(text=Q(C77, "(1) A person is not subject to an enforcement action for violating Section 13-77-103 if the person's", "(iii) is an artificial intelligence assistant."),
                 section="Utah Code § 13-77-104(1) (the Division may define compliant forms of disclosure by rule, § 13-77-104(2))", references=[]),
        ],
        sources=[
            dict(documentId=C77, section="Utah Code title 13, chapter 77"),
            dict(documentId="ut-sb226-2025", section="S.B. 226 (2025), enrolled"),
        ],
        obligations=[
            dict(id="ut-genai-disclose-when-asked", title="Disclose generative AI when a consumer asks", doc=C77,
                 start="(a) A supplier that uses generative artificial intelligence to interact", end="with a human or with artificial intelligence.",
                 section="Utah Code § 13-77-103(1)", role="supplier", effective="2025-05-07", category="disclosure",
                 evidence=["Bot response configuration for 'am I talking to AI?' prompts", "Test log of clear and unambiguous prompts and responses"]),
            dict(id="ut-genai-regulated-services-disclosure", title="Licensed professionals disclose high-risk generative AI use", doc=C77,
                 start="(2) An individual providing services in a regulated occupation shall:", end="(b) in writing before the start of a written interaction.",
                 section="Utah Code § 13-77-103(2)–(3)", role="licensed-professional", effective="2025-05-07", category="disclosure",
                 evidence=["Verbal disclosure script at the start of calls", "Written disclosure shown before chat or messaging interactions",
                           "Inventory of generative AI uses that are high-risk interactions (health, financial, biometric data; advice)"]),
            dict(id="ut-genai-no-ai-defense", title="AI involvement is no defense to consumer-law violations", doc=C77,
                 start="It is not a defense to the violation of any statute administered and enforced by the division under", end="(3) was used in furtherance of the violation.",
                 section="Utah Code § 13-77-102", role="supplier", effective="2025-05-07", category="other",
                 evidence=["Review and approval controls over AI-generated consumer statements and actions", "Monitoring of AI outputs for deceptive or unfair content"]),
        ],
    ),
    # ------------------------------------------------------------------ chapter 72 (AI Policy Act)
    dict(
        id="ut-ai-policy-act",
        jurisdiction="Utah",
        title="Utah Artificial Intelligence Policy Act (Office of AI Policy and learning laboratory)",
        citation="Utah Code §§ 13-72-101 to 13-72-403 (S.B. 149, Laws of Utah 2024, ch. 186; amended by S.B. 226 and S.B. 332 (2025) and H.B. 320, Laws of Utah 2026, ch. 127)",
        status="in force",
        statusNote=("Effective 2024-05-01; repeal date extended to 2027-07-01 by S.B. 332 (2025) ('(2) Title 13, Chapter 72, Artificial "
                    "Intelligence Policy Act, is repealed July 1, 2027.' — § 63I-2-213). H.B. 320 (effective 2026-05-06) added joint "
                    "interpretation agreements and renumbered Part 4. The 2024 disclosure duty (former § 13-2-12) now lives in chapter 77 "
                    "(see ut-genai-disclosures)."),
        enacted="2024-03-13", effective="2024-05-01", sunset="2027-07-01",
        appliesTo=[
            dict(role="sandbox participant", condition=[
                Q(C72, "(16) \"Participant\" means a person seeking or holding a regulatory mitigation agreement", "joint interpretation agreement with the office."),
                " (§ 13-72-101(16))"]),
        ],
        enforcement=dict(
            authority="Office of Artificial Intelligence Policy (Department of Commerce): grants, audits and may terminate agreements (§ 13-72-401(2), (6), (8)(a)).",
            penalties=[Q(C72, "(b) A participant using or deploying an artificial intelligence technology that violates legal", "to all applicable civil and criminal penalties."),
                       " (§ 13-72-401(8)(b))"],
            privateRightOfAction=False,
        ),
        safeHarbors=[
            dict(text=Q(C72, "(2) The office may grant, on a temporary basis, regulatory mitigation to a participant by entering", "relevant agency heads or governmental entity heads."),
                 section="Utah Code § 13-72-401(2) (regulatory mitigation; demonstration period up to 12 months plus up to two 12-month extensions, § 13-72-403)",
                 references=[]),
        ],
        sources=[
            dict(documentId=C72, section="Utah Code title 13, chapter 72"),
            dict(documentId=REPEAL, section="§ 63I-2-213(2) (repeal July 1, 2027)"),
            dict(documentId="ut-sb149-2024", section="S.B. 149 (2024), enrolled"),
            dict(documentId="ut-sb332-2025", section="S.B. 332 (2025), enrolled"),
            dict(documentId="ut-hb320-2026", section="H.B. 320 (2026), enrolled"),
        ],
        obligations=[
            dict(id="ut-aipa-eligibility-showing", title="Show capability, resources and risk plan to join", doc=C72,
                 start="(1) To be eligible for a regulatory mitigation agreement or a joint interpretation agreement, a", end="based on risk assessments.",
                 section="Utah Code § 13-72-402(1)", role="sandbox participant", effective="2024-05-01", until="2027-06-30", category="risk-assessment",
                 evidence=["Application package: technical capability, financial resources, consumer benefit analysis", "Risk monitoring and minimization plan; risk-based limits on testing scale and duration"]),
            dict(id="ut-aipa-agreement-terms", title="Follow agreement safeguards, disclosures and audit reporting", doc=C72,
                 start="(4) A regulatory mitigation agreement or a joint interpretation agreement between a participant and", end="(e) reporting requirements to comply with audits from the office.",
                 section="Utah Code § 13-72-401(4)", role="sandbox participant", effective="2024-05-01", until="2027-06-30", category="other",
                 notes="Participants remain subject to every legal requirement not expressly waived or modified by the agreement (§ 13-72-401(7)).",
                 evidence=["Signed agreement and its safeguard, disclosure and reporting schedule", "Reports provided for Office audits", "Consumer disclosure copies"]),
        ],
    ),
    # ------------------------------------------------------------------ chapter 72a + § 58-60-118
    dict(
        id="ut-mental-health-chatbots",
        jurisdiction="Utah",
        title="Utah mental health chatbot requirements (H.B. 452)",
        citation="Utah Code §§ 13-72a-101 to 13-72a-301 and § 58-60-118 (H.B. 452, Laws of Utah 2025, ch. 269; §§ 13-72a-101 and -204 amended by Laws 2026, ch. 95)",
        status="in force",
        statusNote=("Effective 2025-05-07. le.utah.gov flags chapters 72a–72c as 'Affected by 63I-2-213 on 7/1/2027', but § 63I-2-213(2) "
                    "repeals only chapter 72; no repeal date applies to chapter 72a."),
        enacted="2025-03-25", effective="2025-05-07", sunset=None,
        appliesTo=[
            dict(role="supplier", condition=[
                Q(C72A, "(10) (a) \"Mental health chatbot\" means an artificial intelligence technology that:", "for the purpose of connecting the individual with a human mental health therapist."),
                " (§ 13-72a-101(10)); protections run to Utah users, i.e. individuals located in the state when they use the chatbot (§ 13-72a-101(16))."]),
        ],
        enforcement=dict(
            authority=[Q(C72A, "(1) The division shall administer and enforce the provisions of this chapter in accordance with", "Chapter 2, Division of Consumer Protection.",
                         after="13-72a-204 Violations"),
                       " (§ 13-72a-204(1))"],
            penalties=[Q(C72A, "(a) the division director may impose an administrative fine of up to $2,500 for each violation of", "this chapter; and"),
                       " (§ 13-72a-204(2)(a)); ",
                       Q(C72A, "(5) A court may impose a civil penalty of no more than $5,000 for each violation of an", "administrative or court order issued for a violation of this chapter."),
                       " (§ 13-72a-204(5))"],
            privateRightOfAction=False,
        ),
        safeHarbors=[
            dict(text=Q(S58, "(2) It is an affirmative defense to liability in an action brought under Subsection 58-1-501(1) or",
                        "(d) complied with all requirements of the filed policy at the time of the alleged violation."),
                 section="Utah Code § 58-60-118(2) (policy contents in (3), filing with the Division of Professional Licensing in (4); applies only to unlicensed-practice actions, (6))",
                 references=["45 C.F.R. Parts 160 and 164 (HIPAA Privacy and Security Rules), § 58-60-118(3)(c)(xv)"]),
        ],
        sources=[
            dict(documentId=C72A, section="Utah Code title 13, chapter 72a"),
            dict(documentId=S58, section="Utah Code § 58-60-118"),
            dict(documentId="ut-hb452-2025", section="H.B. 452 (2025), enrolled"),
        ],
        obligations=[
            dict(id="ut-mhc-no-sale-of-health-data", title="No selling or sharing users' health data or inputs", doc=C72A,
                 start="(1) A supplier of a mental health chatbot may not sell to or share with any third party any:", end="(c) shared in compliance with Subsection (3).",
                 section="Utah Code § 13-72a-201(1)–(2)", role="supplier", effective="2025-05-07", category="prohibition",
                 evidence=["Data-flow inventory showing no sale or sharing of health information or user input", "Consent records for provider or health-plan disclosures"]),
            dict(id="ut-mhc-hipaa-for-vendors", title="Apply HIPAA safeguards when sharing with vendors", doc=C72A,
                 start="(3) (a) A supplier may share individually identifiable health information necessary to ensure", end="as such terms are defined in 45 C.F.R. 160.103.",
                 section="Utah Code § 13-72a-201(3)", role="supplier", effective="2025-05-07", category="other",
                 evidence=["Business-associate-style agreements with functionality vendors", "HIPAA Privacy and Security Rule gap assessment"]),
            dict(id="ut-mhc-advertising-limits", title="Label in-chat ads; no ad targeting on user input", doc=C72A,
                 start="(1) A supplier may not use a mental health chatbot to advertise a specific product or service to a", end="(c) customize how an advertisement is presented to the Utah user.",
                 section="Utah Code § 13-72a-202(1)–(2)", role="supplier", effective="2025-05-07", category="prohibition",
                 evidence=["Advertisement labeling and sponsorship disclosure in conversations", "Ad-system configuration excluding user input from targeting"]),
            dict(id="ut-mhc-ai-disclosure", title="Disclose AI before access, after 7 days, on request", doc=C72A,
                 start="(1) A supplier of a mental health chatbot shall cause the mental health chatbot to clearly and", end="about whether artificial intelligence is being used.",
                 section="Utah Code § 13-72a-203", role="supplier", effective="2025-05-07", category="disclosure",
                 evidence=["Pre-access disclosure screen", "Re-disclosure logic after seven days of inactivity", "Responses to 'are you AI?' prompts"]),
        ],
    ),
    # ------------------------------------------------------------------ chapter 72c
    dict(
        id="ut-content-provenance",
        jurisdiction="Utah",
        title="Utah Digital Content Provenance Standards Act (H.B. 276)",
        citation="Utah Code §§ 13-72c-101 to 13-72c-301 (H.B. 276, Laws of Utah 2026, ch. 352)",
        status="enacted, not yet effective",
        statusNote="Signed 2026-03-24; effective 2027-01-01. Capture device duties apply to devices produced for sale in Utah on or after 2028-01-01 (§ 13-72c-202(4)).",
        enacted="2026-03-24", effective="2027-01-01", sunset=None,
        appliesTo=[
            dict(role="covered-provider", condition=[Q(C72C, "(5) (a) \"Covered provider\" means a person that creates, codes, or otherwise produces a generative", "internal business operations and is not made publicly accessible."), " (§ 13-72c-101(5))"]),
            dict(role="platform", condition=[Q(C72C, "(8) (a) \"Large online platform\" means a public-facing social media platform, mass messaging", "(ii) a telecommunications service, as defined in 47 U.S.C. Sec. 153."), " (§ 13-72c-101(8))"]),
            dict(role="manufacturer", condition=[Q(C72C, "(3) (a) \"Capture device manufacturer\" means a person who produces a capture device for sale in", "exclusively engaged in the assembly of a capture device."), " (§ 13-72c-101(3))"]),
        ],
        enforcement=dict(
            authority=[Q(C72C, "(1) The Division of Consumer Protection shall administer and enforce the provisions of Part 2,", "Consumer Protection."), " (§ 13-72c-301(1))"],
            penalties=[Q(C72C, "(a) the division director may impose an administrative fine of up to $2,500 for each violation of", "this chapter; and"),
                       " (§ 13-72c-301(2)(a)); ",
                       Q(C72C, "(5) A court may impose a civil penalty of no more than $5,000 for each violation of an", "administrative or court order issued for a violation of this chapter."),
                       " (§ 13-72c-301(5))"],
            privateRightOfAction=False,
        ),
        safeHarbors=[],
        sources=[dict(documentId=C72C, section="Utah Code title 13, chapter 72c (version effective 2027-01-01)"),
                 dict(documentId="ut-hb276-2026", section="H.B. 276 (2026), enrolled")],
        obligations=[
            dict(id="ut-prov-platform-provenance-display", title="Platforms detect and let users inspect provenance data", doc=C72C,
                 start="(1) A large online platform shall:", end="provided either by the large online platform or a third party.",
                 section="Utah Code § 13-72c-201(1)", role="platform", effective="2027-01-01", category="transparency",
                 evidence=["Provenance detection pipeline (e.g., C2PA manifests)", "User interface for inspecting or downloading provenance data"]),
            dict(id="ut-prov-platform-no-stripping", title="Platforms must not strip provenance data or signatures", doc=C72C,
                 start="(2) A large online platform may not, to the extent technically feasible, knowingly strip any system", end="large online platform.",
                 after="13-72c-201",
                 section="Utah Code § 13-72c-201(2)", role="platform", effective="2027-01-01", category="prohibition",
                 evidence=["Upload/transcode pipeline tests showing provenance data and signatures are preserved"]),
            dict(id="ut-prov-capture-device-disclosure", title="Capture devices embed latent manufacturer and time data", doc=C72C,
                 start="(1) A capture device manufacturer shall include a latent disclosure in content captured by the", end="on or after January 1, 2028.",
                 section="Utah Code § 13-72c-202", role="manufacturer", effective="2028-01-01", category="disclosure",
                 evidence=["Device firmware specification embedding latent disclosures (manufacturer or signature, time and date)", "Standards conformance evidence (e.g., C2PA)"]),
            dict(id="ut-prov-genai-latent-disclosure", title="Embed latent disclosures in generated image, video, audio", doc=C72C,
                 start="A covered provider shall include a latent disclosure in image, video, or audio content, or content that", end="(2) the disclosure is consistent with widely accepted industry standards.",
                 section="Utah Code § 13-72c-203", role="covered-provider", effective="2027-01-01", category="disclosure",
                 evidence=["Watermark/provenance embedding specification for generated media", "Test results showing time/date and signature data in outputs"]),
        ],
    ),
    # ------------------------------------------------------------------ chapter 72b
    dict(
        id="ut-digital-voyeurism",
        jurisdiction="Utah",
        title="Utah Digital Voyeurism Prevention Act (H.B. 276)",
        citation="Utah Code §§ 13-72b-101 to 13-72b-401 (H.B. 276, Laws of Utah 2026, ch. 352)",
        status="enacted, not yet effective",
        statusNote="Signed 2026-03-24; effective 2027-01-01. Covered-platform duties track the federal TAKE IT DOWN Act (Pub. L. 119-12) notice-and-removal rules.",
        enacted="2026-03-24", effective="2027-01-01", sunset=None,
        appliesTo=[
            dict(role="generation-service", condition=[Q(C72B, "(7) \"Generation service\" means a person that operates, maintains, or provides an interactive", "(c) distributes generated intimate images to users through the service."), " (§ 13-72b-101(7))"]),
            dict(role="platform", condition=[Q(C72B, "(4) \"Covered platform\" means the same as that term is defined in Section 3 of the Take It", "codified at 47 U.S.C. 230 note."), " (§ 13-72b-101(4))"]),
        ],
        enforcement=dict(
            authority="Private civil actions by injured individuals or their heirs (§§ 13-72b-202, 13-72b-303); no public enforcer is named.",
            penalties=[Q(C72B, "(4) A plaintiff in an action under this section is entitled to recover:", "(c) reasonable attorney fees and costs."),
                       " (§ 13-72b-202(4); same remedies against covered platforms, § 13-72b-303(4)); ",
                       Q(C72B, "(5) Each distribution of a counterfeit intimate image depicting an identifiable individual without", "consent constitutes a separate violation."),
                       " (§ 13-72b-202(5))"],
            privateRightOfAction=True,
        ),
        safeHarbors=[
            dict(text=Q(C72B, "(1) A generation service is not liable under Section 13-72b-202 if the generation service", "took prompt action to prevent further distribution.",
                        after="13-72b-203 Safe harbor for generation services."),
                 section="Utah Code § 13-72b-203(1) (see also (2)–(3); heightened pleading standard, § 13-72b-204)", references=[]),
            dict(text=Q(C72B, "(1) A covered platform is not liable under Section 13-72b-303 if the covered platform demonstrates", "counterfeit intimate images.",
                        after="13-72b-304 Safe harbor for covered platforms."),
                 section="Utah Code § 13-72b-304(1) (see also (2); heightened pleading standard, § 13-72b-305)", references=["TAKE IT DOWN Act § 3(a) (47 U.S.C. § 230 note)"]),
        ],
        sources=[dict(documentId=C72B, section="Utah Code title 13, chapter 72b (version effective 2027-01-01)"),
                 dict(documentId="ut-hb276-2026", section="H.B. 276 (2026), enrolled")],
        obligations=[
            dict(id="ut-dv-verified-consent", title="Verified consent before distributing counterfeit intimate images", doc=C72B,
                 start="(2) A generation service may not distribute a counterfeit intimate image without first obtaining", end="identity and obtain valid consent.",
                 section="Utah Code § 13-72b-201(2)–(4)", role="generation-service", effective="2027-01-01", category="prohibition",
                 evidence=["Consent system design (affirmative consent, identity assurance)", "Consent records retained at least seven years", "Data-minimization review of identity checks"]),
            dict(id="ut-dv-user-information-and-reporting", title="Publish policy, safeguards and violation reporting procedures", doc=C72B,
                 start="(1) A generation service shall take reasonable measures to inform users that:", end="circumvent the safeguards.",
                 after="13-72b-205 Transparency and reporting requirements.",
                 section="Utah Code § 13-72b-205", role="generation-service", effective="2027-01-01", category="transparency",
                 evidence=["User notices on prohibited content and liability", "Public written policy and safeguards description", "Violation reporting channel"]),
            dict(id="ut-dv-platform-no-knowing-distribution", title="Platforms must not knowingly allow non-consensual images", doc=C72B,
                 start="(1) A covered platform may not knowingly allow the distribution of a counterfeit intimate image", end="(b) fails to comply with the takedown requirements in Section 13-72b-302.",
                 section="Utah Code § 13-72b-301", role="platform", effective="2027-01-01", category="prohibition",
                 evidence=["Takedown SLA metrics", "Records of notices and removals"]),
            dict(id="ut-dv-notice-and-takedown", title="Notice-and-removal process; remove within 48 hours", doc=C72B,
                 start="(1) A covered platform shall establish and implement notice and removal procedures that comply", end="identical copy of the counterfeit intimate image.",
                 section="Utah Code § 13-72b-302(1)–(2)", role="platform", effective="2027-01-01", category="other",
                 evidence=["Published notice mechanism for depicted individuals", "Removal log showing action within 48 hours", "Hash-matching or similar process for identical copies"]),
        ],
    ),
]
