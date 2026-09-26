"""Maine — AI chatbot disclosure in trade and commerce (P.L. 2025, c. 294; 10 M.R.S. § 1500-DD)."""
from common import Q

ME = "me-pl-2025-c294"

LAWS = [dict(
    id="me-ai-chatbot-disclosure",
    jurisdiction="Maine",
    title="Maine AI chatbot disclosure in trade and commerce",
    citation="10 M.R.S. § 1500-DD (enacted as § 1500-Y by P.L. 2025, c. 294 (L.D. 1727); reallocated by R.R. 2025, c. 1, Pt. A, § 16)",
    status="in force",
    statusNote=("Signed 2025-06-12 as P.L. 2025, c. 294; effective 2025-09-24, the general effective date for nonemergency laws of the "
                "132nd Legislature's First Special Session. The Revisor's statute page (current through 2025-10-01) shows no later "
                "amendment; 2026 session laws were not searched section by section. Included because it applies to any business that "
                "uses a chatbot with Maine consumers."),
    enacted="2025-06-12", effective="2025-09-24", sunset=None,
    appliesTo=[
        dict(role="business", condition=[
            Q(ME, "A. \"Artificial intelligence chatbot\" means a software application,", "through textual or aural communications."),
            " (§ 1500-DD(1)(A)); the duty applies to any person using such a chatbot or other computer technology to engage in trade and "
            "commerce with a consumer (§ 1500-DD(2))."]),
    ],
    enforcement=dict(
        authority=[Q(ME, "3. Violation. A violation of subsection 2 is a violation of the Maine Unfair Trade Practices Act.",
                     "3. Violation. A violation of subsection 2 is a violation of the Maine Unfair Trade Practices Act."),
                   " (§ 1500-DD(3)); the Attorney General enforces the Unfair Trade Practices Act (5 M.R.S. § 209; not in this corpus)."],
        penalties="Remedies under the Maine Unfair Trade Practices Act (injunctions and civil penalties, 5 M.R.S. § 209); not in this corpus.",
        privateRightOfAction=True,
        privateRightOfActionNote="Through the Unfair Trade Practices Act's private remedy for consumers who suffer a loss (5 M.R.S. § 213; not in this corpus).",
    ),
    safeHarbors=[],
    sources=[
        dict(documentId=ME, section="P.L. 2025, c. 294, § 1 (enacting 10 M.R.S. § 1500-Y)"),
        dict(documentId="me-mrs-10-1500-dd", section="10 M.R.S. § 1500-DD (codified text; .local)"),
    ],
    obligations=[
        dict(id="me-chatbot-not-human-notice", title="Tell consumers a chatbot is not human", doc=ME,
             start="2. Required disclosure of use of artificial intelligence chatbot to engage in trade and commerce. A person may not use",
             end="notified in a clear and conspicuous manner that the consumer is not engaging with a human being.",
             section="10 M.R.S. § 1500-DD(2) (enacted as § 1500-Y(2))", role="business", effective="2025-09-24", category="disclosure",
             evidence=["Inventory of customer-facing chatbots and voice bots used with Maine consumers",
                       "Screenshots or scripts of the clear and conspicuous 'not a human' notice", "UX review for designs that could mislead consumers into thinking they talk to a person"]),
    ],
)]
