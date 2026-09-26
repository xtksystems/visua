"""Illinois — Human Rights Act AI amendments (HB 3773, P.A. 103-0804) and the AI Video Interview Act (820 ILCS 42)."""
from common import Q

PA804 = "il-pa-103-0804"
PA260 = "il-pa-101-0260"
PA047 = "il-pa-102-0047"
PA054 = "il-pa-104-0054"

LAWS = [
    dict(
        id="il-ihra-ai",
        jurisdiction="Illinois",
        title="Illinois Human Rights Act — employer use of artificial intelligence (HB 3773)",
        citation="775 ILCS 5/2-101(M)–(N), 5/2-102(L) (P.A. 103-0804)",
        status="in force",
        statusNote=("Approved 2024-08-09; effective 2026-01-01. The Department of Human Rights must adopt rules on notice "
                    "(§ 2-102(L)(2)); its proposed 'Subpart J: Use of Artificial Intelligence in Employment' was published in the "
                    "Illinois Register on 2026-05-15 and temporarily withdrawn on 2026-06-10 (reported by law-firm alerts; not verified "
                    "in the Register). The statutory duties apply without rules. The ILCS database shows § 2-102(L) unchanged by "
                    "P.A. 104-417 and P.A. 104-793."),
        enacted="2024-08-09", effective="2026-01-01", sunset=None,
        appliesTo=[
            dict(role="employer", condition=[
                Q(PA804, "(B) Employer. (1) \"Employer\" includes:", "A joint apprenticeship or training committee without regard to the number of employees."),
                " (775 ILCS 5/2-101(B)(1); exclusions for religious organizations in (B)(2)); ",
                Q(PA804, "(M) Artificial Intelligence. \"Artificial intelligence\" means", "includes generative artificial intelligence."),
                " (§ 2-101(M))"]),
        ],
        enforcement=dict(
            authority=("Illinois Department of Human Rights (charges) and Illinois Human Rights Commission; after the Department's "
                       "process a complainant may sue in circuit court (775 ILCS 5/7A-102; not in this corpus)."),
            penalties="Remedies under 775 ILCS 5/8A-104 and 10-102 (e.g., actual damages, back pay, hiring or reinstatement, attorney's fees); not in this corpus.",
            privateRightOfAction=True,
            privateRightOfActionNote="Civil action in circuit court after the Department of Human Rights process (775 ILCS 5/7A-102, 10-102; not in this corpus).",
        ),
        safeHarbors=[],
        sources=[
            dict(documentId=PA804, section="P.A. 103-0804 (775 ILCS 5/2-101, 5/2-102)"),
            dict(documentId="il-ilcs-775-5-art2", section="775 ILCS 5 Article 2 (current ILCS text)"),
        ],
        obligations=[
            dict(id="il-ihra-ai-no-discriminatory-effect", title="No AI with discriminatory effect or zip-code proxies", doc=PA804,
                 spans=[("Sec. 2-102. Civil rights violations - employment.", "It is a civil rights violation:"),
                        ("(L) Use of artificial intelligence. (1) With respect to recruitment,", "to use zip codes as a proxy for protected classes under this Article.")],
                 section="775 ILCS 5/2-102(L)(1)", page=20, pageEnd=20, role="employer", effective="2026-01-01", category="prohibition",
                 notes="The lead-in 'It is a civil rights violation:' is quoted from physical page 8 (start of § 2-102); subsection (L) is on page 20.",
                 evidence=["Inventory of AI used in recruitment, hiring, promotion, discipline, discharge and other employment terms",
                           "Adverse-impact testing results by protected class and remediation records", "Feature review confirming zip codes are not used as proxies"]),
            dict(id="il-ihra-ai-employee-notice", title="Notify employees when AI is used in employment decisions", doc=PA804,
                 spans=[("Sec. 2-102. Civil rights violations - employment.", "It is a civil rights violation:"),
                        ("(2) For an employer to fail to provide notice to an employee that the", "the time period for providing notice, and the means for providing notice.")],
                 section="775 ILCS 5/2-102(L)(2)", page=20, pageEnd=20, role="employer", effective="2026-01-01", category="notice",
                 notes="The lead-in 'It is a civil rights violation:' is quoted from physical page 8 (start of § 2-102); subsection (L) is on page 20.",
                 evidence=["AI-use notice to employees and applicants (content, timing and channel)", "Record of notice delivery"]),
        ],
    ),
    dict(
        id="il-ai-video-interview",
        jurisdiction="Illinois",
        title="Illinois Artificial Intelligence Video Interview Act",
        citation="820 ILCS 42/1–20 (P.A. 101-0260; § 20 added by P.A. 102-0047)",
        status="in force",
        statusNote="Effective 2020-01-01; the demographic reporting duty (§ 20) took effect 2022-01-01. Not amended since.",
        enacted="2019-08-09", effective="2020-01-01", sunset=None,
        appliesTo=[
            dict(role="employer", condition=[
                Q(PA260, "An employer that asks applicants to record video interviews", "before asking applicants to submit video interviews:"),
                " (820 ILCS 42/5)"]),
        ],
        enforcement=dict(
            authority="Not specified: the Act has no enforcement or penalty section.",
            penalties="None specified in the Act.",
            privateRightOfAction=False,
            privateRightOfActionNote="The Act creates no express private right of action; whether one is implied has not been settled.",
        ),
        safeHarbors=[],
        sources=[
            dict(documentId=PA260, section="P.A. 101-0260 (820 ILCS 42/1–15)"),
            dict(documentId=PA047, section="P.A. 102-0047 (820 ILCS 42/20)"),
            dict(documentId="il-ilcs-820-42", section="820 ILCS 42 (current ILCS text)"),
        ],
        obligations=[
            dict(id="il-aivia-notice-and-explanation", title="Tell applicants AI analyzes video interviews and how", doc=PA260,
                 start="An employer that asks applicants to record video interviews", end="general types of characteristics it uses to evaluate applicants.",
                 section="820 ILCS 42/5(1)–(2)", role="employer", effective="2020-01-01", category="notice",
                 evidence=["Pre-interview notice to applicants", "Plain-language explanation of how the AI works and the characteristics it evaluates"]),
            dict(id="il-aivia-consent", title="Obtain consent before AI evaluation of video interviews", doc=PA260,
                 spans=[("An employer that asks applicants to record video interviews", "before asking applicants to submit video interviews:"),
                        ("(3) Obtain, before the interview, consent from the applicant", "who have not consented to the use of artificial intelligence analysis.")],
                 section="820 ILCS 42/5(3)", role="employer", effective="2020-01-01", category="other",
                 evidence=["Consent records captured before each interview", "Control preventing AI evaluation without consent"]),
            dict(id="il-aivia-limit-sharing", title="Share interview videos only with necessary evaluators", doc=PA260,
                 start="Section 10. Sharing videos limited.", end="to evaluate an applicant's fitness for a position.",
                 section="820 ILCS 42/10", role="employer", effective="2020-01-01", category="prohibition",
                 evidence=["Access list of persons and vendors receiving applicant videos", "Vendor contracts limiting use to evaluation"]),
            dict(id="il-aivia-delete-on-request", title="Delete interview videos within 30 days on request", doc=PA260,
                 start="Section 15. Destruction of videos.", end="Any other such person shall comply with the employer's instructions.",
                 section="820 ILCS 42/15", role="employer", effective="2020-01-01", category="other",
                 evidence=["Deletion request log with completion dates (within 30 days)", "Deletion instructions sent to vendors, including backups"]),
            dict(id="il-aivia-demographic-report", title="Report race and ethnicity data to DCEO annually", doc=PA047,
                 start="(a) An employer that relies solely upon an artificial intelligence analysis", end="preceding the filing of the report.",
                 section="820 ILCS 42/20(a)–(b)", role="employer", effective="2022-01-01", category="documentation",
                 evidence=["Annual demographic report filed with the Department of Commerce and Economic Opportunity by December 31",
                           "Data collection covering the 12 months ending November 30"]),
        ],
    ),
    dict(
        id="il-wopr-act",
        jurisdiction="Illinois",
        title="Illinois Wellness and Oversight for Psychological Resources Act (AI in therapy)",
        citation="225 ILCS 155 (P.A. 104-0054, HB 1806)",
        status="in force",
        statusNote=("Approved and effective 2025-08-01 (§ 99: takes effect upon becoming law). The ILCS database shows every section "
                    "sourced only to P.A. 104-54 (no amendments as of 2026-09-26). Included because it bars offering AI 'therapy' to the "
                    "Illinois public and limits how licensed professionals may use AI."),
        enacted="2025-08-01", effective="2025-08-01", sunset=None,
        appliesTo=[
            dict(role="business", condition=[
                "Any individual, corporation, or entity that provides, advertises, or offers therapy or psychotherapy services to the public in Illinois (§ 20(a)); ",
                Q(PA054, "\"Therapy or psychotherapy services\" means services provided to diagnose,", "does not include religious counseling or peer support."),
                " (§ 10); the Act does not apply to religious counseling, peer support, or public self-help and educational materials that do not purport to offer therapy (§ 35)."]),
            dict(role="licensed-professional", condition=[
                Q(PA054, "\"Licensed professional\" means an individual who holds a valid license", "except for a physician."),
                " (§ 10)"]),
        ],
        enforcement=dict(
            authority="Illinois Department of Financial and Professional Regulation: investigates and assesses civil penalties after a hearing (§ 30).",
            penalties=[Q(PA054, "(a) Any individual, corporation, or entity found in violation of this Act shall pay a civil penalty", "the circumstances of the violation."),
                       " (§ 30(a))"],
            privateRightOfAction=False,
        ),
        safeHarbors=[],
        sources=[
            dict(documentId=PA054, section="P.A. 104-0054 (225 ILCS 155/1–99)"),
            dict(documentId="il-ilcs-225-155", section="225 ILCS 155 (current ILCS text)"),
        ],
        obligations=[
            dict(id="il-wopr-no-unlicensed-ai-therapy", title="No AI therapy services without a licensed professional", doc=PA054,
                 start="(a) An individual, corporation, or entity may not provide, advertise, or otherwise offer therapy", end="conducted by an individual who is a licensed professional.",
                 section="225 ILCS 155/20(a)", role="business", effective="2025-08-01", category="prohibition",
                 evidence=["Product and marketing review confirming no therapy or psychotherapy claims for AI features offered in Illinois",
                           "Geo-controls or licensed-professional delivery model for Illinois users", "Classification of features as self-help, peer support or educational (§ 35)"]),
            dict(id="il-wopr-professional-ai-limits", title="Professionals may not let AI decide or counsel", doc=PA054,
                 start="(b) A licensed professional may use artificial intelligence only to the extent the use meets", end="(4) detect emotions or mental states.",
                 section="225 ILCS 155/20(b)", role="licensed-professional", effective="2025-08-01", category="prohibition",
                 evidence=["Practice policy limiting AI to administrative and supplementary support", "Review-and-approval records for AI-drafted recommendations or plans",
                           "Tool configuration disabling emotion or mental-state detection"]),
            dict(id="il-wopr-consent-recorded-sessions", title="Written notice and consent for AI on recorded sessions", doc=PA054,
                 start="(a) As used in this Section, \"permitted use of artificial intelligence\" means", end="provides consent to the use of artificial intelligence.",
                 section="225 ILCS 155/15", role="licensed-professional", effective="2025-08-01", category="notice",
                 evidence=["Written notice naming the AI tool and its purpose", "Signed (or electronic) client consent meeting the § 10 definition of consent"]),
        ],
    ),
]
