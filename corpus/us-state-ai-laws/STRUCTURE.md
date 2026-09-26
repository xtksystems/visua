# U.S. state AI laws corpus: structure reference

This folder holds the official texts of the U.S. state and New York City laws and rules on artificial intelligence that a
company building or deploying AI has to track, and a structured extraction of their obligations. Everything was retrieved
and checked on **2026-09-26**. Paths are relative to `corpus/us-state-ai-laws/`, except in `manifest.json`, where they are
relative to `corpus/` (house style).

- `manifest.json` lists **58 documents** (53 committed, 5 under git-ignored `.local/` folders, 18.6 MB in total) with
  official URL, landing page, SHA-256, size and the licence or usage notice.
- `obligations.json` has **26 law entries** in 8 jurisdictions with **187 obligations** and **28 safe harbours**. Every
  obligation carries the verbatim operative text, the section, the document id and the physical PDF page.
- `tools/` re-creates both JSON files byte for byte from the downloaded documents and verifies the corpus.

The titles, status notes, notes and evidence suggestions are Visua's own words. They are summaries for compliance tracking,
not legal advice.

## 1. Currency on 2026-09-26

**In force:** Texas TRAIGA; California SB 53, the AI Transparency Act (operative 2026-08-02), AB 2013, SB 243, the CCPA
ADMT/risk-assessment/cybersecurity-audit regulations (phased), the Civil Rights Council ADS employment regulations, AB 489 and
the 2018 bot-disclosure law; Colorado HB 26-1263 (the act is in effect, most duties start 2027-01-01); New York's AI companion
law; NYC Local Law 144 with the DCWP rules; Illinois HB 3773, the AI Video Interview Act and the WOPR Act; Utah chapters 77, 72
(until 2027-07-01) and 72a; Maine's chatbot disclosure law.
**Enacted, not yet effective:** Colorado SB 26-189 (2027-01-01); California SB 1119 "Adam's Law" and the SB 867 toy ban
(2027-01-01); the New York RAISE Act and the Safe by Design Act (2027-01-01); Utah H.B. 276 (chapters 72b and 72c,
2027-01-01). **Enjoined:** Colorado SB 24-205 (in effect since 2026-06-30, enforcement stayed by a federal court, replaced on
2027-01-01). Nothing in scope has been repealed yet.

| Law (`obligations.json` id) | Status on 2026-09-26 | Key dates | Evidence |
|---|---|---|---|
| Texas Responsible AI Governance Act, H.B. 149 (`tx-traiga`) | **In force** | Signed 2025-06-22; effective 2026-01-01 (H.B. 149 § 10) | [Bill history](https://capitol.texas.gov/BillLookup/History.aspx?LegSess=89R&Bill=HB149) ("Effective on 1/1/26"); codified chapters 551–554 from the [Texas Constitution and Statutes](https://statutes.capitol.texas.gov/Docs/BC/htm/BC.552.htm) file server; the AG complaint mechanism required by § 552.102 is live as ["Consumer AI Rights"](https://www.texasattorneygeneral.gov/consumer-protection/file-consumer-complaint/consumer-ai-rights). No amendment in the 89th Legislature's called sessions; next regular session January 2027. The § 552.105(e) defence names the NIST AI RMF Generative AI Profile (NIST AI 600-1) |
| California SB 53, Transparency in Frontier AI Act (`ca-tfaia`) | **In force** | Approved 2025-09-29; effective 2026-01-01 | [leginfo](https://leginfo.legislature.ca.gov/faces/billTextClient.xhtml?bill_id=202520260SB53). Not amended. SB 813 and AB 1405 (Stats. 2026, chs. 179 and 178, signed 2026-09-09) add a voluntary verification-organization framework and an AI auditor registry, not new developer duties. [Executive Order N-9-26](https://www.gov.ca.gov/2026/09/18/governor-newsom-issues-executive-order-to-accelerate-independent-oversight-and-advance-the-creation-of-an-ai-kill-switch/) (2026-09-18) asks for recommendations to strengthen the Act |
| California AI Transparency Act, SB 942 as amended by AB 853 (`ca-ai-transparency-act`) | **In force** | Operative 2026-08-02 (AB 853 moved it from 2026-01-01); large online platform and GenAI hosting duties 2027-01-01; capture devices 2028-01-01 | [SB 942](https://leginfo.legislature.ca.gov/faces/billTextClient.xhtml?bill_id=202320240SB942), [AB 853](https://leginfo.legislature.ca.gov/faces/billTextClient.xhtml?bill_id=202520260AB853). **SB 1000** (urgency) and **AB 2713** would amend it; both were "Enrolled and presented to the Governor" (2026-09-02, 2026-09-08). Governor's deadline 2026-09-30 |
| California AB 2013, training-data transparency (`ca-genai-training-data-transparency`) | **In force**, not enjoined | Effective 2025-01-01; documentation due by 2026-01-01 and before each later release | [leginfo](https://leginfo.legislature.ca.gov/faces/billTextClient.xhtml?bill_id=202320240AB2013). *X.AI LLC v. Bonta*: preliminary injunction denied 2026-03-04 (C.D. Cal.); appeal No. 26-1591 argued in the Ninth Circuit in July 2026, no injunction pending appeal ([Justia docket](https://dockets.justia.com/docket/circuit-courts/ca9/26-1591); press reports, not court records) |
| California SB 243, companion chatbots (`ca-companion-chatbots`) | **In force** | Effective 2026-01-01; annual reports from 2027-07-01; SB 1119 deletes § 22602(c) from 2027-01-01; SB 867 toy ban 2027-01-01 to 2031-01-01 | [SB 243](https://leginfo.legislature.ca.gov/faces/billTextClient.xhtml?bill_id=202520260SB243); SB 867 and SB 1119 signed 2026-09-10 ([Governor](https://www.gov.ca.gov/2026/09/10/governor-newsom-signs-the-strongest-child-safety-chatbot-and-social-media-laws-in-the-nation/)) |
| California SB 1119, "Adam's Law" (`ca-adams-law`) | **Enacted, not yet effective** | Effective 2027-01-01; §§ 21812–21813 operative 2027-07-01; first child-safety audit by 2029-01-01 (the § 21814 version conditioned on AB 1405, which was chaptered) | [leginfo](https://leginfo.legislature.ca.gov/faces/billTextClient.xhtml?bill_id=202520260SB1119) |
| CCPA regulations: ADMT, risk assessments, cybersecurity audits (`ca-ccpa-admt-regs`) | **In force**, phased | OAL approval 2025-09-22; effective 2026-01-01. Risk assessments from 2026-01-01 (pre-2026 processing by 2027-12-31; first submission 2028-04-01); ADMT duties from 2027-01-01; first audit reports 2028-04-01 / 2029-04-01 / 2030-04-01 by revenue tier | [CalPrivacy regulations page](https://cppa.ca.gov/regulations/) and [rulemaking page](https://cppa.ca.gov/regulations/ccpa_updates.html); no proposed packages listed on 2026-09-26 |
| California Civil Rights Council ADS employment regulations (`ca-feha-ads-regs`) | **In force** | OAL approval 2025-06-27; effective 2025-10-01 | [Rulemaking actions](https://calcivilrights.ca.gov/civilrightscouncil/rulemaking-actions/) |
| California AB 489, AI implying health licensure (`ca-ai-health-license-claims`) | **In force** | Approved 2025-10-11; effective 2026-01-01 | [leginfo](https://leginfo.legislature.ca.gov/faces/billTextClient.xhtml?bill_id=202520260AB489); codified §§ 4999.8–4999.9 show no amendment |
| California SB 1001, bot disclosure (`ca-bot-disclosure`) | **In force** | Operative 2019-07-01 | [leginfo](https://leginfo.legislature.ca.gov/faces/billTextClient.xhtml?bill_id=201720180SB1001); §§ 17940–17943 never amended |
| Colorado SB 26-189, ADMT Act (`co-admt-act`) | **Enacted, not yet effective** | Approved 2026-05-14; effective 2027-01-01 for decisions made on or after that date; rulemaking sections effective on passage; cure right repealed 2030-01-01 | [Bill page](https://leg.colorado.gov/bills/sb26-189); final fiscal note (2026-09-08); AG proposed rules 4 CCR 904-6 filed 2026-08-11, hearing 2026-10-26 ([coag.gov/ai](https://coag.gov/ai/)). Enforcement is also covered by the stay in *X.AI v. Weiser* (§ 3) |
| Colorado SB 24-205, Colorado AI Act (`co-ai-act-2024`) | **Enjoined** (enforcement stayed) | In effect 2026-06-30 (SB 25B-004 moved the date from 2026-02-01); repealed and reenacted by SB 26-189 on 2027-01-01 | [Bill page](https://leg.colorado.gov/bills/sb24-205); SB 26-189 final fiscal note p. 5: "On April 27, 2026, the Attorney General was ordered by U.S. District Court to not initiate enforcement of SB 24-205 or any legislation amending SB 24-205 until the Attorney General completes rulemaking for AI enforcement and the court issues a ruling on 'X. AI LLC v. Weiser.'" No obligations extracted |
| Colorado HB 26-1263, conversational AI services (`co-chatbot-safety-act`) | **In force** (act); duties from 2027-01-01 | Approved 2026-05-29; effective 2026-08-12; operator duties 2027-01-01; AG reports from 2027-07-01 | [Bill page](https://leg.colorado.gov/bills/hb26-1263); final fiscal note (2026-07-13). The AG calls it the "Chatbot Safety Act" and treats it as effective 2027-01-01 |
| New York RAISE Act (`ny-raise-act`) | **Enacted, not yet effective** | Chapter 699 of 2025 signed 2025-12-19; chapter amendment S.8828 signed 2026-03-27 (chapter 96 of 2026) re-wrote Article 44-B; effective 2027-01-01 | [S.8828](https://nyassembly.gov/leg/?default_fld=&leg_video=&bn=S08828&term=2025&Summary=Y&Actions=Y&Text=Y), [S.6953-B](https://nyassembly.gov/leg/?default_fld=&leg_video=&bn=S06953&term=2025&Summary=Y&Actions=Y&Text=Y). No DFS rules under § 1429 found |
| New York AI companion models, GBL art. 47 (`ny-ai-companion-models`) | **In force** | Chapter 58 of 2025 (Part U) signed 2025-05-09; effective 2025-11-05 | [S.3008-C](https://nyassembly.gov/leg/?default_fld=&leg_video=&bn=S03008&term=2025&Summary=Y&Actions=Y). Not amended |
| New York Safe by Design Act, GBL art. 45-B (`ny-safe-by-design-ai-companions`) | **Enacted, not yet effective** | Chapter 58 of 2026 (Part Y) signed 2026-05-26; effective 2027-01-01 | [A.10008-C history](https://nyassembly.gov/leg/?default_fld=&leg_video=&bn=A10008&term=2025&Summary=Y&Actions=Y&Text=Y) ("signed chap.58"). Only the integrated-AI-companion duties are extracted |
| NYC Local Law 144 and DCWP rules (`nyc-aedt`) | **In force** | Law effective 2023-01-01; DCWP rule adopted 2023-04-06; enforcement since 2023-07-05 | [Legistar](https://legistar.council.nyc.gov/LegislationDetail.aspx?ID=4344524&GUID=B051915D-A9AC-451E-81F8-6596032FA3F9); [DCWP AEDT page](https://www.nyc.gov/site/dca/about/automated-employment-decision-tools.page). Neither amended |
| Illinois HB 3773, Human Rights Act AI amendments (`il-ihra-ai`) | **In force** | Approved 2024-08-09; effective 2026-01-01 | [P.A. 103-0804](https://www.ilga.gov/Legislation/PublicActs/View/103-0804); ILCS shows § 2-102(L) unchanged by P.A. 104-417 and 104-793. IDHR's proposed notice rules (Subpart J) were published 2026-05-15 and withdrawn 2026-06-10 (law-firm reports; not checked in the Illinois Register) |
| Illinois AI Video Interview Act (`il-ai-video-interview`) | **In force** | Effective 2020-01-01; § 20 reporting from 2022-01-01 | [P.A. 101-0260](https://www.ilga.gov/Legislation/PublicActs/View/101-0260), [P.A. 102-0047](https://www.ilga.gov/Legislation/PublicActs/View/102-0047), [820 ILCS 42](https://www.ilga.gov/legislation/ILCS/Articles?ActID=4015&ChapterID=68) |
| Illinois Wellness and Oversight for Psychological Resources Act (`il-wopr-act`) | **In force** | Approved and effective 2025-08-01 | [P.A. 104-0054](https://www.ilga.gov/Legislation/PublicActs/View/104-0054); every 225 ILCS 155 section is sourced only to P.A. 104-54 |
| Utah generative AI disclosures, ch. 77 (`ut-genai-disclosures`) | **In force** | S.B. 226 signed 2025-03-27; effective 2025-05-07 (amended by Laws 2026, ch. 95) | [Utah Code 13-77](https://le.utah.gov/xcode/Title13/Chapter77/13-77.html). Not affected by the ch. 72 repeal |
| Utah AI Policy Act, ch. 72 (`ut-ai-policy-act`) | **In force until 2027-07-01** | Effective 2024-05-01; repealed 2027-07-01 (§ 63I-2-213(2)); H.B. 320 amendments effective 2026-05-06 | [Utah Code 13-72](https://le.utah.gov/xcode/Title13/Chapter72/13-72.html), [§ 63I-2-213](https://le.utah.gov/xcode/Title63I/Chapter2/63I-2-S213.html) |
| Utah mental health chatbots, ch. 72a and § 58-60-118 (`ut-mental-health-chatbots`) | **In force** | Effective 2025-05-07 | [Utah Code 13-72a](https://le.utah.gov/xcode/Title13/Chapter72a/13-72a.html), [§ 58-60-118](https://le.utah.gov/xcode/Title58/Chapter60/58-60-S118.html). The site's "Affected by 63I-2-213 on 7/1/2027" flag is wrong for ch. 72a: § 63I-2-213(2) names only ch. 72 |
| Utah Digital Content Provenance Standards Act, ch. 72c (`ut-content-provenance`) | **Enacted, not yet effective** | H.B. 276 signed 2026-03-24; effective 2027-01-01; capture devices from 2028-01-01 | [Utah Code 13-72c](https://le.utah.gov/xcode/Title13/Chapter72c/13-72c.html) (future version) |
| Utah Digital Voyeurism Prevention Act, ch. 72b (`ut-digital-voyeurism`) | **Enacted, not yet effective** | H.B. 276 signed 2026-03-24; effective 2027-01-01 | [Utah Code 13-72b](https://le.utah.gov/xcode/Title13/Chapter72b/13-72b.html) (future version) |
| Maine AI chatbot disclosure, 10 M.R.S. § 1500-DD (`me-ai-chatbot-disclosure`) | **In force** | Signed 2025-06-12 (P.L. 2025, c. 294); effective 2025-09-24 | [LD 1727 status](https://legislature.maine.gov/LawMakerWeb/summary.asp?paper=HP1154&SessionID=16) ("Signed by the Governor", chapter 294, 6/12/2025); [statute page](https://legislature.maine.gov/statutes/10/title10sec1500-DD.html) (current through 2025-10-01; 2026 session laws not checked section by section) |

### Why the laws beyond the requested list are included

The request named Texas, California (SB 53, SB 942/AB 853, AB 2013, SB 243, the CPPA regulations), Colorado, New York (RAISE,
Local Law 144), Illinois HB 3773 and Utah. The other entries were added because they impose duties on the same companies and
products and are in force or scheduled:

- **California SB 1119 and SB 867** amend SB 243 (companion chatbots) and replace its minor-protection duties.
- **California Civil Rights Council ADS regulations** are binding employment rules for automated-decision systems.
- **California AB 489, Colorado HB 26-1263 § 6-1-1708(5), Illinois WOPR, Utah ch. 72a** stop AI products from posing as
  licensed health or mental health professionals or from offering therapy.
- **California SB 1001, Maine § 1500-DD, Utah ch. 77** are cross-sector chatbot and generative-AI disclosure duties.
- **Colorado HB 26-1263, New York art. 47 and the Safe by Design Act** regulate conversational AI and AI companions.
- **Illinois AI Video Interview Act** regulates AI analysis of recorded interviews.
- **Utah chapters 72b and 72c** regulate generative image services and content provenance.

## 2. Pending changes to watch

| Where | What | State on 2026-09-26 |
|---|---|---|
| California | SB 1000 and AB 2713 (AI Transparency Act); AB 1609 (customer-service chatbots: disclose automation, offer a human); SB 947 (employers' use of ADS for discipline and termination); AB 1883 (workplace AI surveillance: neural data, emotion recognition); AB 2025 (digitally altered images in rental listings); SB 1111 (digital replicas) | All "Enrolled and presented to the Governor" (leginfo bill histories). Deadline 2026-09-30. Re-check after that date |
| New York | S.9051-B/A.10379-C (new GBL art. 48, unsafe AI companion features for minors); A.6578-B/S.6955-A (AI Training Data Transparency Act, art. 44-C); S.6954-B/A.6540-E (provenance data for synthetic content, art. 45-C); S.8451-B/A.8962-B (FAIR News Act); A.3411-B/S.934-A (generative AI "may be inaccurate" notice); A.9349-B/S.8623-B (surveillance pricing) | Passed both houses; the nyassembly.gov bill histories end with "returned to senate/assembly" and show no delivery to or action by the Governor |
| Colorado | AG rules 4 CCR 904-6 for SB 26-189 and HB 26-1263 (proposed effective 2027-01-01; hearing 2026-10-26); *X.AI v. Weiser* | Proposed; litigation stayed pending rules |
| Illinois | IDHR notice rules under 775 ILCS 5/2-102(L)(2) | Withdrawn 2026-06-10; may be re-proposed |
| New York | DFS office rules under GBL § 1429 (RAISE) | None found |
| Utah | Repeal of ch. 72 on 2027-07-01 | Could be extended in the 2027 General Session |
| Texas | 90th Legislature | Convenes January 2027 |

## 3. Litigation and federal preemption

- ***X.AI LLC v. Weiser*, No. 1:26-cv-01515 (D. Colo.).** On 2026-04-27 the court granted the parties' joint motion and
  ordered the Attorney General not to enforce SB 24-205 "or any legislation amending SB 24-205" until rulemaking is complete
  and the court rules (SB 26-189 final fiscal note, p. 5, an official source). Docket summaries report that the United States
  intervened for the plaintiff and that the plaintiff may amend and move for a preliminary injunction within 28 days after
  final rules implementing SB 26-189 ([CourtListener](https://www.courtlistener.com/docket/73171074/x-ai-llc-v-weiser/);
  not read from the filings). Whether the order reaches HB 26-1263, which also adds to part 17, is not settled.
- ***X.AI LLC v. Bonta* (C.D. Cal.; 9th Cir. No. 26-1591).** Challenge to AB 2013. Preliminary injunction denied
  2026-03-04; appeal argued July 2026; the law remains enforceable (press reports).
- **Federal preemption.** Executive Order 14365, "Ensuring a National Policy Framework for Artificial Intelligence"
  (2025-12-11, [text](https://www.presidency.ucsb.edu/documents/executive-order-14365-ensuring-national-policy-framework-for-artificial-intelligence)),
  set up a DOJ AI Litigation Task Force and ordered a Commerce Department review of "onerous" state AI laws, an FTC policy
  statement, an FCC proceeding and a legislative proposal, with carve-outs such as child safety. Per the secondary sources
  cited in `docs/research/ai-governance-landscape.md` § 3.3, the task force was formed on 2026-01-09 and a White House
  legislative framework followed on 2026-03-20. On 2026-09-26 no federal statute preempts any law in this corpus, and
  publication of the Commerce review could not be confirmed. DOJ's intervention in *X.AI v. Weiser* is reported as the first use of the
  task force against a state AI law.
- **TAKE IT DOWN Act** (Pub. L. 119-12): Utah ch. 72b adopts its notice-and-removal procedure for covered platforms; the
  federal duty applies on its own terms.

## 4. Layout

```
us-state-ai-laws/
├── manifest.json                 58 documents (sha256, bytes, url, landing page, licence)
├── obligations.json              ← INGEST: 26 laws, 187 obligations, 28 safe harbours (verbatim, page-cited)
├── STRUCTURE.md                  this file
├── texas/                        H.B. 149 enrolled (PDF = citation target; HTML), codified/ Bus. & Com. Code ch. 551–554 (HTML)
├── california/
│   ├── sb53/  ai-transparency-act/ (SB 942, AB 853)  ab2013/  ab489/  bot-disclosure/ (SB 1001)
│   ├── companion-chatbots/       SB 243, SB 1119, SB 867 (chaptered)
│   ├── cppa/                     consolidated CCPA regulations and statute (eff. 2026-01-01), approved text, OAL notice
│   └── crd-ads-regulations/      OAL-approved final text (image scan) + Attachment B (text layer)
├── colorado/                     session laws SB 26-189, HB 26-1263, SB 24-205, SB 25B-004; final fiscal notes
│   └── .local/                   AG proposed rules 4 CCR 904-6 and hearing notice (DOCX)
├── new-york/
│   ├── raise-act/                S.6953-B (ch. 699 of 2025), S.8828 (ch. 96 of 2026)
│   ├── gbl-art47/                S.3008-C (ch. 58 of 2025), Part U
│   ├── safe-by-design/           A.10008-C (ch. 58 of 2026), Part Y
│   └── nyc-ll144/                Local Law 144 of 2021; .local/ City Record of 2023-04-06 (DCWP rule), DCWP FAQ
├── illinois/                     P.A. 103-0804, 101-0260, 102-0047, 104-0054; current ILCS pages (HTML)
├── utah/code/                    Utah Code chapters 13-72, 72a, 72b, 72c, 77; §§ 58-60-118, 63I-2-213 (official PDFs)
├── utah/bills/                   enrolled S.B. 149 (2024), S.B. 226, S.B. 332, H.B. 452 (2025), H.B. 276, H.B. 320 (2026)
├── maine/                        P.L. 2025, c. 294; .local/ codified 10 M.R.S. § 1500-DD
└── tools/                        build.py, laws_*.py (anchors per law), docs.py (registry), pagetext.py, spans.py,
                                  verify_corpus.py, reports/ (verify.json, review-hyphens.txt)
```

Citation targets: obligations cite the chaptered or enrolled bill, session law, public act, official code PDF or regulation
text that a reader can open and page through. Codified HTML copies (Texas, Illinois) and later session laws are sources for
currency checks.

## 5. `manifest.json`

Same document schema as the NIST manifests: `id`, `title`, `identifier`, `publisher`, `version`, `published`, `role`
(`statute` 47, `regulation` 7, `guide` 4), `mediaType`, `path`, `url`, `landingPage`, `sha256`, `bytes`, `license`,
`notes`. `framework` is `us-state-ai-laws`.

**Licences.** Each record quotes the publisher's notice:

- Legislatures (Texas, California, Colorado, New York, Illinois, Utah, Maine session laws) and NYC Council local laws:
  public legislative record. California quotes Gov. Code § 10248.5 ("within the public domain"); Illinois quotes
  "2026 ILGA.gov | All Rights Reserved" plus its disclaimer page, which does not restrict reuse of statutory text; Utah quotes
  its official-publisher statement and Terms of Use § 4.
- California agencies (CalPrivacy, Civil Rights Council): State Conditions of Use ("considered in the public domain").
- **`.local/` (git-ignored by `corpus/**/.local/`):** the Colorado AG's proposed rules and notice ("Copyright 2026 The Office
  of the Attorney General. All rights reserved."; proposed, not law), the NYC City Record issue of 2023-04-06 and the DCWP
  FAQ (nyc.gov Terms § IV: "All rights are reserved"; the issue also carries unrelated notices), and the codified Maine
  section ("The State of Maine claims a copyright in its codified statutes"). The obligations still quote the operative rule
  text from these files, because statutes and binding regulations are not subject to copyright (edicts of government);
  the files themselves are not redistributed.
- No file contains AICPA, ISO or other licensed framework text.

## 6. `obligations.json`

```json
{
  "retrieved": "2026-09-26",
  "disclaimer": "Summaries of official texts for compliance tracking; not legal advice.",
  "laws": [{
    "id", "jurisdiction", "title", "citation",
    "status": "in force | enacted, not yet effective | enjoined | repealed",
    "statusNote", "enacted", "effective", "sunset",
    "appliesTo": [{"role", "condition"}],
    "enforcement": {"authority", "penalties", "privateRightOfAction", "privateRightOfActionNote"?},
    "safeHarbors": [{"text", "section", "references", "note"?}],
    "sources": [{"documentId", "section"}],
    "notes"?: [ ... ],
    "obligations": [{
      "id", "title", "text", "section", "documentId", "page", "pageEnd"?, "role", "effective", "until"?,
      "category", "evidence": [ ... ], "notes"?, "textVerifiedAgainst"?: {"documentId", "page", "pageEnd"?}
    }]
  }]
}
```

**What is verbatim.** `obligations[].text` and `safeHarbors[].text` are verbatim quotations only. Where a passage is
quoted in parts (a lead-in plus a later paragraph, or text separated by a worked example), the parts are joined with
" … "; one NYC passage that continues across a column break is joined with a space and says so in `notes`. In
`appliesTo[].condition`, `enforcement.*` and law-level `notes`, quoted passages start with their own subdivision label and
end with a parenthetical section cite; connecting phrases and summaries of exclusions around them are Visua's wording.
`title` (at most 10 words), `statusNote`, obligation `notes` and `evidence` are Visua's.

**Pages.** `page` is the 1-based physical page of the cited PDF; `pageEnd` appears when a passage runs onto later pages.
Printed page numbers differ in session laws (Colorado ch. 131: printed = physical + 568; ch. 208: + 1196). `page` is `null`
only for HTML citations (none at present). `textVerifiedAgainst` marks obligations whose wording was checked in a
different file than the one cited: the California Civil Rights Council's OAL-approved final text is an image scan, so its
pages were read visually and the wording was verified against Attachment B's text layer (strikethrough removed).

**Dates.** `enacted` is the signing or approval date (NYC: Legistar enactment date; regulations: OAL approval).
`effective` is the date the law or its first duties apply; each obligation has its own `effective` and, when a duty ends
before the law does, `until` (four obligations: the SB 243 § 22602(c) duties to 2026-12-31, the SB 867 toy ban to
2030-12-31, and the Utah ch. 72 participant duties to 2027-06-30). `sunset` is the date the whole law ends (Utah ch. 72:
2027-07-01; Colorado SB 24-205: 2027-01-01).

**Roles** (obligation counts): `operator` 37, `business` 30, `employer` 29, `developer` 14, `deployer` 13,
`frontier-developer` 13, `large-frontier-developer` 12, `platform` 12, `employment-agency` 11, `covered-provider` 8,
`supplier` 6, `government` 3, `health-care-provider` 3, `licensed-professional` 3, `manufacturer` 3,
`sandbox participant` 3, `generation-service` 2, and one each of `distributor`, `insurer`, `licensee`, `processor`,
`provider`, `seller`, `service-provider`. Multiple roles are comma-separated. The defined term behind each role is quoted in
`appliesTo`.

**Categories** (counts): `prohibition` 41, `other` 33, `disclosure` 23, `documentation` 16, `notice` 13,
`transparency` 13, `risk-assessment` 12, `audit` 8, `record-keeping` 8, `incident-reporting` 6, `bias-audit` 5,
`safety-framework` 4, `opt-out` 3, `appeal` 2. `audit` (independent audits other than bias audits: CCPA cybersecurity
audits, SB 1119 child-safety audits) extends the requested list; `impact-assessment` is unused because no law in scope
requires one under that name. `other` covers age assurance, safety protocols, contract terms, consent and deletion.

**Other fields.** `privateRightOfAction` is `true` for SB 53 (covered employees' whistleblower actions only), SB 243
and SB 1119 private suits, FEHA and IHRA claims, Utah ch. 72b, Utah ch. 77 (indirect, through the Utah Consumer Sales
Practices Act) and Maine (through the Unfair Trade Practices Act); `privateRightOfActionNote` explains each case and quotes
the statute where one says there is no private action. `safeHarbors[].references` names frameworks a safe harbour relies on (Texas
§ 552.105(e): NIST AI 600-1).

## 7. Counts per law

| id | Jurisdiction | Status | Effective | Obligations | Safe harbours |
|---|---|---|---|---:|---:|
| `tx-traiga` | Texas | in force | 2026-01-01 | 13 | 5 |
| `ca-tfaia` | California | in force | 2026-01-01 | 12 | 2 |
| `ca-ai-transparency-act` | California | in force | 2026-08-02 | 12 | 0 |
| `ca-genai-training-data-transparency` | California | in force | 2025-01-01 | 1 | 0 |
| `ca-companion-chatbots` | California | in force | 2026-01-01 | 7 | 0 |
| `ca-adams-law` | California | enacted, not yet effective | 2027-01-01 | 16 | 0 |
| `ca-ccpa-admt-regs` | California | in force | 2026-01-01 | 28 | 2 |
| `ca-feha-ads-regs` | California | in force | 2025-10-01 | 11 | 0 |
| `ca-ai-health-license-claims` | California | in force | 2026-01-01 | 2 | 0 |
| `ca-bot-disclosure` | California | in force | 2019-07-01 | 1 | 1 |
| `co-admt-act` | Colorado | enacted, not yet effective | 2027-01-01 | 13 | 8 |
| `co-ai-act-2024` | Colorado | enjoined | 2026-06-30 | 0 | 0 |
| `co-chatbot-safety-act` | Colorado | in force | 2026-08-12 | 13 | 0 |
| `ny-raise-act` | New York | enacted, not yet effective | 2027-01-01 | 12 | 3 |
| `ny-ai-companion-models` | New York | in force | 2025-11-05 | 2 | 0 |
| `ny-safe-by-design-ai-companions` | New York | enacted, not yet effective | 2027-01-01 | 5 | 0 |
| `nyc-aedt` | New York City | in force | 2023-01-01 | 11 | 2 |
| `il-ihra-ai` | Illinois | in force | 2026-01-01 | 2 | 0 |
| `il-ai-video-interview` | Illinois | in force | 2020-01-01 | 5 | 0 |
| `il-wopr-act` | Illinois | in force | 2025-08-01 | 3 | 0 |
| `ut-genai-disclosures` | Utah | in force | 2025-05-07 | 3 | 1 |
| `ut-ai-policy-act` | Utah | in force (sunset 2027-07-01) | 2024-05-01 | 2 | 1 |
| `ut-mental-health-chatbots` | Utah | in force | 2025-05-07 | 4 | 1 |
| `ut-content-provenance` | Utah | enacted, not yet effective | 2027-01-01 | 4 | 0 |
| `ut-digital-voyeurism` | Utah | enacted, not yet effective | 2027-01-01 | 4 | 2 |
| `me-ai-chatbot-disclosure` | Maine | in force | 2025-09-24 | 1 | 0 |
| **Total** | | | | **187** | **28** |

Coverage: the extraction aims to include every operative duty, prohibition and reporting requirement that each extracted
law places on companies (and, for Texas, on governmental entities); definitions, findings, agency duties and severability
clauses are not extracted, and optional ways of complying appear as safe harbours only where they matter (e.g., Colorado
§ 6-1-1704(2)). Colorado SB 24-205 has no obligations on purpose (enjoined and
replaced; §§ 1 and 3). The New York Safe by Design Act entry covers only the AI-companion duties (§ 1540(1)(b)–(c), (7),
§§ 1541, 1546).

## 8. How it was built and verified

`python3 tools/build.py` (Python with PyMuPDF) regenerates `obligations.json`, `manifest.json` and
`tools/reports/review-hyphens.txt`; `python3 tools/verify_corpus.py` writes `tools/reports/verify.json`.

1. **Anchored extraction.** Each quotation is defined in `tools/laws_*.py` by a start and an end anchor in a registered
   document. The text between them is taken from a cleaned page-text stream (running headers, footers, line numbers and
   print marks removed per document family), and its physical page range is recorded.
2. **Independent re-location.** Every quotation is located again, separately, on the cited page with a matcher that
   ignores whitespace, dashes and quote style but nothing else. A page mismatch or a miss fails the build (0 errors).
3. **Text-layer repairs, all reviewed and listed in `notes`:** Texas enrolled bills print spaces as small "A" glyphs
   (dropped) and set apostrophes as a separate span with a leading space ("system ’s" becomes "system’s"); one Colorado line is letter-spaced in the text layer ("CO N SEQ U EN TIAL") and is restored to the printed
   words; the Texas § 541.104 quote drops the bracketed deleted words " [the requirement]"; New York LBD bills and the Maine
   session law hyphenate at line ends — 51 joins inside quotations were checked by hand in `review-hyphens.txt` (all
   syllable breaks; real hyphens such as "pre-employment" are kept). Kept as printed: New York prints "10º26" for 10 to the
   26th power; Utah § 13-72b-101(4) prints "47 U.S.C. 230 note" without a section sign; Colorado session laws print new text
   in capitals.
4. **Layout cases.** The City Record is read column by column; the two § 5-302 fragments separated by a table are joined
   without omission. Illinois public acts put one word per text line; the stream is rejoined before matching.
5. **Visual spot checks** of rendered pages (City Record p. 17, New York § 1420(9), Utah § 13-72b-101(4), the California
   Civil Rights Council scan).
6. **`verify_corpus.py` (2026-09-26):** 58/58 documents present with matching SHA-256 and size; every PDF opens (the
   Civil Rights Council scan has no text layer, as noted); every HTML file has readable text; 0 files outside the
   manifest; 387 quotation probes re-found, 0 failed, 1 tolerated because of the documented Texas bracket removal.
7. **Secret scan.** All files, including decompressed PDF streams and DOCX parts, were scanned for access tokens and keys
   (`pk.eyJ`, `sk.eyJ`, `AIza…`, `AKIA…`/`ASIA…`, GitHub and Slack tokens, private-key blocks, `api_key=` strings). No
   matches, so no file had to move to `.local/` for that reason.

## 9. Caveats

- Court and rulemaking status for *X.AI v. Weiser*, *X.AI v. Bonta* and the Illinois IDHR rules comes partly from press
  and docket summaries; the Colorado stay itself is quoted from the official fiscal note.
- **Colorado numbering.** SB 26-189 and HB 26-1263 each enact a § 6-1-1708, and SB 26-189 repeals and reenacts part 17
  (including the § 6-1-1701 definitions HB 26-1263 added). The Revisor of Statutes has to reconcile them; this corpus cites
  each act's own numbering. Whether conduct under SB 24-205 between 2026-06-30 and 2026-12-31 could be pursued later is
  unresolved.
- **Indirect private actions** (Utah ch. 77, Maine) depend on general consumer-protection statutes that are not in this
  corpus. Penalty amounts for Colorado come from the fiscal note's description of the Colorado Consumer Protection Act.
- **CCPA regulations** are cited to CalPrivacy's consolidated text effective 2026-01-01 (physical page = "Page N of 103").
- **Maine** 2026 session laws were not searched section by section; the Revisor's page is current through 2025-10-01.
- The pending bills in § 2 can change California (by 2026-09-30) and New York (by year-end) before most of these dates.
- Summaries, roles, categories and evidence are Visua's reading of the texts, for tracking only.

## 10. Considered and not included

| Law | Why not |
|---|---|
| Texas S.B. 1188 (2025; clinicians' diagnostic AI use and EHR localisation) | Clinical-practice and health-records rule for licensed practitioners; TRAIGA § 552.051(f) covers health-care AI disclosure |
| California AB 3030 (Stats. 2024, ch. 848; generative AI patient communications) and SB 1120 (Stats. 2024, ch. 879; utilization review) | Health-care facility and health-plan rules |
| California SB 1050 (Stats. 2026, ch. 246; synthetic performers in advertising, eff. 2027-01-01) and New York GBL § 396-b (S.8420-A, signed 2025-12-11, eff. 2026-06-09) | Advertising-content disclosure rules for marketers, not for building or operating AI systems |
| California SB 813 and AB 1405 (Stats. 2026, chs. 179 and 178) | Voluntary verification-organization framework and an auditor registry; no duties for developers or deployers (AB 1405 matters to SB 1119 audits, noted there) |
| New Jersey FAIR Act (algorithmic rent-setting ban, signed 2026-07-20) | Sector-specific pricing rule for landlords |
| Utah 2026 bills S.B. 319 (insurer preauthorization), S.B. 150 (AI in medical practice), H.B. 289 (AI-generated CSAM), S.B. 256 (AI content and defamation) | Sector-specific, criminal or defamation rules; enactment status not verified here |
| Colorado insurance AI rules (C.R.S. § 10-3-1104.9 and Division of Insurance regulations) | Insurance-specific; SB 26-189 defers to them (`co-admt-act` safe harbour) |
| Pending bills in § 2 | Not law on 2026-09-26 |
