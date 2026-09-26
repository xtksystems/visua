# Delve (delve.co): competitive analysis for Visua

Prepared on 2026-09-26 for the Visua founding team. The research covered the live web on that date and Internet Archive snapshots of Delve-controlled pages from 2024 to 2026.

---

## How to read this report

Every factual statement carries a source label.

| Label | Meaning |
|---|---|
| **[P]** | Primary source: Delve's live website (delve.co), fetched on 2026-09-26. |
| **[P-A]** | Primary source, archived: a Delve page captured by the Internet Archive (the snapshot date is given). Many of these pages have since been deleted from delve.co. |
| **[P-L]** | Primary source, other listing written by Delve: the YC company profile and YC Launch posts, the founders' Launch HN post, the AWS Marketplace listing and the G2 vendor description. |
| **[3P]** | Third-party reporting or analysis: press, analysts and review sites. Sources written by competitors are marked "(competitor)". |
| **[AL]** | Anonymous allegation, not verified. This label covers the "DeepDelver" Substack and material it attributes to a Delve employee whistleblower. Delve disputes these claims. They appear here because they are the most detailed public description of how the product works inside. They are not established facts. |

**Method and coverage**

- I crawled the full sitemap (`https://www.delve.co/sitemap.xml`, 45 URLs) and read every page.
- I used the Wayback Machine CDX index to list about 120 historical page paths on delve.co. Most product, case-study, testimonial and "platform" pages now return 404. I read those from archived snapshots.
- `trust.delve.co` and `app.delve.co` sit behind a Vercel bot checkpoint (HTTP 429) and could not be read.
- G2 blocks direct fetches. G2 data comes from an archived snapshot plus third-party summaries.
- The Capterra listing named "Delve" (ID 196428) is a different product, a qualitative-research tool, and is excluded.
- Delve publishes no documentation site, changelog, public pricing page or integrations page. `/docs`, `/changelog`, `/pricing`, `/integrations`, `/trust`, `/security` and `/frameworks` all return 404.

---

## Executive summary

- **Who they are.** Delve Technologies Inc. is based in San Francisco. It was founded in 2023 by MIT dropouts Karun Kaushik (CEO) and Selin Kocalar (COO) and was in YC's Winter 2024 batch. It raised about $35.3M: a $3.3M seed and a $32M Series A at a $300M valuation, led by Insight Partners in July 2025.
- **What they sell.** An "AI-native" compliance platform bundled with services: audits through partner firms, a penetration test, vCISO help and Slack support. The pitch is speed: "Compliance in days, Security that lasts."
- **Frameworks.** Seven frameworks have a dedicated framework page: SOC 2, HIPAA, ISO 27001, GDPR, PCI DSS, ISO 42001 and CMMC. Marketing also names HITRUST, FedRAMP, NIST SP 800-53, GovRAMP, EU AI Act, NIST AI RMF, CCPA, CASA and 21 CFR Part 11. More appear only in demo-request dropdowns. Leaked internal material alleges that only SOC 2, ISO 27001, HIPAA and GDPR were ever mapped inside the platform, with everything else handled off-platform by vCISOs [AL].
- **Crisis.** Since March 2026 Delve has been in a credibility crisis. Anonymous posts alleged near-identical, template-generated SOC 2 reports (493 of 494 sharing boilerplate), pre-filled "evidence", rubber-stamp audit firms and a workflow tool forked from open source without a license agreement.
  - YC "parted ways" with Delve in April 2026.
  - Delve is named as a co-defendant in a federal class action filed in April 2026.
  - Notable customers publicly left: LiteLLM moved to Vanta, and Lovable said it had already moved to Vanta in late 2025.
  - Delve denies fraud and blames a malicious actor. It also apologized for "fall[ing] short", offered free re-audits and penetration tests, and halted "any automation that interacts with audit workflows".
- **User experience.** The interface is conventional. It uses tabs (Dashboard, Team, Tech, Company, Policies, Trust), cards reading "X of Y controls", checklists and progress bars. There is no spatial or advanced visualization. Graph-style diagrams appear only in marketing art.
- **Opening for Visua.** Visua can deliver the same outcomes: fast audit readiness, less busywork, sales enablement and continuous monitoring. The difference is that every agent action, framework claim, mapping and trust-center statement would be cited, evidenced, human-approved and visible in 3D. The market's new skepticism of "AI compliance in days" becomes Visua's differentiator.

---

## 1. Company snapshot

| Attribute | Finding | Source |
|---|---|---|
| Legal entity | Delve Technologies Inc. The Mercor class action names the defendant as "Delve AI Inc." | [P] footer and Services License Agreement; [3P] LegalClarity |
| Founded | 2023 | [P-L] YC profile (archived 2026-03-01); [3P] PR Newswire |
| Founders | **Karun Kaushik**, Co-founder and CEO ("Studied AI at MIT. Built an AI COVID diagnostic that scaled internationally."). **Selin Kocalar**, Co-founder and COO ("Studied AI at MIT. Published 8 research papers. Launched an experiment to the ISS."). They met as MIT freshmen and dropped out in 2023; both were 21 in July 2025. | [P-L] YC profile; [3P] TechCrunch 2025-07-22 |
| Origin story | They first built an AI medical scribe, hit HIPAA pain and pivoted. The first product (Feb 2024) was "HIPAA compliance as a service": one-click HIPAA-compliant AWS infrastructure via Terraform, policies, and a monitoring dashboard. | [3P] TechCrunch; [P-L] Launch HN 2024-02-26 |
| YC batch | **Winter 2024 (W24)**. YC Launch posts on 2024-01-26 ("Your fast track to HIPAA compliance") and 2025-01-28. YC removed the company profile about 2026-04-03 (it has returned 404 since 2026-04-04). The COO posted "YC and Delve have parted ways." | [P-L] archived YC profile; [3P] TechCrunch 2026-04-04; X post |
| Headquarters | 301 Howard St #1050, San Francisco, CA 94105 (current). Previously 360 Pine Street, San Francisco, CA 94104 (August 2025 footer). | [P]; [P-A] |
| Domains and handles | delve.co (getdelve.com redirects to it), app.delve.co, trust.delve.co, founders@getdelve.com, x.com/getdelve, linkedin.com/company/getdelve, YouTube channel UCZjUvdQOPFt4az2303KDFoA (2 public Shorts) | [P] |
| Seed | **$3.3M**, announced 2025-01-28. Delve says the round itself was in 2024. Investors: Y Combinator, General Catalyst (lead per TechCrunch), FundersClub, Soma Capital and angels. Delve said it was "already profitable" with "millions in run rate". | [P] /press and Series A blog; [3P] WebWire PR, TechCrunch |
| Series A | **$32M at a $300M valuation**, announced 2025-07-22. Led by **Insight Partners**, with YC, FundersClub, General Catalyst and "CISOs at Fortune 500 companies". | [P] /blog/series-a; [3P] TechCrunch, PR Newswire, Insight Partners post |
| Total raised | About **$35.3M**. No later round was found as of 2026-09-26. | Derived |
| Headcount | YC profile: **33** (snapshot 2026-03-01). Tracxn: **24** "as of Jul 31, 2026" (third-party; low confidence). Estimate: about 25 to 35, probably trending down after the scandal (uncertain). | [P-L]; [3P] |
| Customer-count claims | 100+ (Jan 2025) → 500+ (Jul 2025) → 700+ (/competitors page and AWS listing, undated) → 1,000+ (Feb 2026 homepage; /deals/yc) → **1,500+** (homepage since about Mar 2026) → "more than 1,700" (2026-03-20 blog). "50+ countries" (/deals/yc). "Over 1/3 of YC's S25 batch chose Delve" (/deals/yc). | [P], [P-A], [P-L] |
| Revenue signals | "Profitable, doubled revenue this quarter" (Jul 2025). Founder-led sales write-up: $1M+ ARR before the first sales hire and ACV about $15k. Getlatka estimate: $2.6M ARR (third-party; low confidence). | [P]; [3P] |
| Recognition | Forbes 30 Under 30 2026 (AI category). | [3P] The Tech (MIT), 2026-04-09; Forbes profile (search result) |
| Marketing signals | Fall 2025 out-of-home campaign in San Francisco, New York City and Austin, described as "one of the largest out-of-home campaigns of all time". RSAC 2026 booth 2339 with F1 simulators. About 20 partner "deals" pages (fintechs, funds, accelerators, communities) existed in 2025–26; only /deals/yc is still live, and the rest return 404. $1,000 per closed referral. | [P] billboard blog, /partnership, /deals/yc; [P-A] /rsac, CDX |
| Status on 2026-09-26 | The site is live and still takes demo bookings (sitemap lastmod 2026-08-20). There have been no blog posts since 2026-04-03. Case studies, testimonials and logo walls were removed after March 2026. Litigation is pending. | [P]; [P-A]; [3P] |

**Positioning taglines, verbatim**

- "Compliance in days, Security that lasts." (current hero) and "Compliance in days, security that lasts." (footer) [P]
- "Delve AI agents eliminate compliance busywork by automating evidence collection, continuous monitoring, and security workflows, so you can close deals faster." [P]
- "Welcome to the agentic compliance experience." [P]
- "We're a compliance partner, not a platform." [P]
- "You need a compliance partner, not a spreadsheet wrapper." [P] (/competitors, /partnership, /deals/yc)
- "Compliance automation was yesterday. AI is today." [P]
- "Frameworks and checklists don't close deals. Delve does." [P]
- "Delve is the fastest-growing compliance platform in history" [P] (/competitors)
- "The Bottom Line: With Delve, you'll save 75% of time spent on compliance compared to other platforms." [P]
- "Spoiler: we passed our audits." (next to Delve's own certification badges) [P]
- "Delve is automating busywork for humanity, starting with compliance." and "Delve Is the Agentic Layer for Compliance" [P] (Series A blog)
- "AI that makes compliance effortless" [P-L] (YC one-liner)
- "AI-Native Compliance. Delve lets fast-growing companies get compliant by Friday." Page title: "Delve | SOC 2, HIPAA by Friday" [P-A] (January 2025)
- "HIPAA compliance as a service" [P-L] (Launch HN, February 2024)

---

## 2. Supported compliance frameworks, standards and regulations

Delve publishes no canonical framework list. Claims differ from page to page, so the evidence is graded in three tiers:

- **Tier A:** a dedicated, live framework product page.
- **Tier B:** named as supported or selectable in live marketing copy, the AWS Marketplace listing, blog posts or case studies. These are claims of support; depth is unknown.
- **Tier C:** appears only as an option in demo-request forms. These forms qualify leads; they are not product claims.

| Framework | Evidence it's supported (URL) | Notes |
|---|---|---|
| **SOC 2 Type I and Type II** (AICPA Trust Services Criteria) | https://delve.co/product/framework/soc-2 | **Tier A.** The flagship framework. Published path for Type I: 30-minute onboarding, then 10–15 hours of platform setup, then a 1–3 week audit. Type II adds a 3-month observation period. Delve displays its own SOC 2 badge (links to trust.delve.co/delve-compliance). Archived case studies cover Bland, 11x, Wispr, Remi, HockeyStack and Lovable. |
| **HIPAA** | https://delve.co/product/framework/hipaa | **Tier A.** The founding framework (YC launch in January 2024). Path: 30 minutes, then 10–15 hours; the startup page adds "BAA Collection 1–2 weeks". HIPAA has no certifying audit. [AL] Delve's internal Notion (December 2024) says "We also don't have confidence that these sufficiently cover all requirements particularly for HIPAA." |
| **ISO/IEC 27001** | https://delve.co/product/framework/iso-27001 | **Tier A.** Path: 30 minutes, then 10–15 hours of gap analysis and ISMS work, then 1–2 weeks of platform setup, then a 1–3 week audit. [AL] Certification bodies used included Glocert and Gradient Certification. [AL] The platform reportedly lacks an asset register and a PII register. |
| **GDPR** | https://delve.co/product/framework/gdpr | **Tier A.** Path: 30 minutes, then 10–15 hours. /deals/yc says Delve will "auto-create RoPa's". [AL] Built as GDPR forms: RoPA, DPIA, data-subject requests, breach log, consent withdrawal and others. |
| **PCI DSS** | https://delve.co/product/framework/pci-dss | **Tier A.** Path: 30 minutes, then 10–15 hours of scoping and gap analysis, then 10–15 hours of setup, then a 1–3 week audit. The PCI blog (2026-02-06) says it covers "260+ micro-controls". |
| **ISO/IEC 42001** (AI management system) | https://delve.co/product/framework/iso-42001 | **Tier A.** Same path as ISO 27001, with "Gap Analysis / AIMS". Delve showed its **own** ISO 42001 badge from 2025 to July 2026; the badge was **gone on 2026-09-26**. [AL] Delivered off-platform by vCISOs. |
| **CMMC** (Levels 1–3; with NIST SP 800-171) | https://delve.co/product/framework/cmmc | **Tier A.** The page is in the sitemap but not in the main navigation. Offers "Policy & Procedure Generator" (policies "aligned to NIST SP 800-171 and CMMC"), requirement mapping, preparation for the C3PAO assessment, and continuous monitoring. Six /learn/cmmc/ articles are published. |
| **HITRUST CSF** (e1, i1, r2) | https://delve.co/ (framework list and badge image); https://delve.co/blog/get-hitrust-ready-with-delve-and-comsec ; https://aws.amazon.com/marketplace/pp/prodview-nrt542cwf6epa | **Tier B.** Delivered with partner **Com-Sec** as vCISO. The blog claims a "control library aligned to HITRUST CSF", "maturity scoring" and MyCSF coordination. Stated timelines: e1 6–8 weeks, i1 8–12 weeks, r2 4–9 months. |
| **FedRAMP** (Low, Moderate, High; "FedRAMP 20x") | https://delve.co/ (list and image); https://delve.co/book-demo (four FedRAMP options); https://delve.co/blog/inside-delve-trusted-compliance-process ; archived Knowtex case study | **Tier B.** The only public outcome is Knowtex's "FedRAMP Moderate-aligned" readiness, which led to a **VA Interim ATO in 85 days** on AWS GovCloud. That is not a FedRAMP authorization, yet the case-study header read "FEDRAMP compliant in 85 Days". |
| **NIST SP 800-53** (Rev. 5) | https://delve.co/deals/yc ("Frameworks supported by Delve … NIST 800-53: Looking for GovRAMP or FedRAMP? Join Delve customers using our Pathways tooling"); https://delve.co/book-demo | **Tier B.** Positioned as the route to FedRAMP and GovRAMP through **Pathways**, Delve's workflow builder (see §3). Knowtex controls were "aligned to FedRAMP Moderate / NIST 800-53". |
| **GovRAMP** (StateRAMP was renamed GovRAMP in 2025) | https://delve.co/competitors (form option); https://delve.co/deals/yc | **Tier B/C.** Mentioned only alongside FedRAMP. "StateRAMP" is not named. |
| **NIST SP 800-171** | https://delve.co/product/framework/cmmc ; /learn/cmmc/* | **Tier B**, but only as part of CMMC; there is no standalone offer. In February 2024 the founders wrote: "No plans for NIST at the moment but potentially down the line." |
| **EU AI Act** | https://delve.co/ ("Pick Your Compliance Frameworks" list); https://delve.co/book-demo | **Tier B.** Named only. No page, process or timeline. |
| **NIST AI RMF** | https://delve.co/ (list, plus "NIST AI … Monitored by Delve" badge image); AWS Marketplace listing | **Tier B.** Named only. |
| **CCPA** | https://delve.co/ (list); archived Lovable case study | **Tier B.** The Lovable case study says Delve "implemented CCPA" but also lists CCPA among "certifications". CCPA has no certification. |
| **CASA** (App Defense Alliance Cloud Application Security Assessment) | https://delve.co/ (framework badge image) | **Tier B**, from the image only ("CASA … Monitored by Delve"). |
| **21 CFR Part 11** | https://delve.co/ (badge image); https://delve.co/book-demo | **Tier B**, from the image and form only. |
| **Custom frameworks / custom Common Control Frameworks** | https://delve.co/ ("Built for every stage": mid-market "Support for custom frameworks"; enterprise "Support for custom Common Control Frameworks"); WebWire press release, 2025-01-28 | **Tier B.** Marketing images show a common-control ID scheme ("CCF 113", "CCF 138", "DCF 23", "DCF 48"). |
| **Penetration testing** (a service, not a framework) | https://delve.co/competitors ; https://delve.co/book-demo | **Tier B.** A "complimentary manual, greybox penetration test" by GWAPT- or OSCP-certified testers comes with every audited framework. The advanced test starts at $4,500 [P-A]. |
| **CJIS** | https://delve.co/book-demo (also /referral and /deals/yc forms) | **Tier C.** Form option only. |
| **PIPEDA** | https://delve.co/book-demo | **Tier C.** Form option only. |
| **FERPA** | https://delve.co/book-demo | **Tier C.** Form option only. |
| **ISO/IEC 27701** | https://delve.co/book-demo | **Tier C.** Form option only. |
| **COPPA** | https://delve.co/book-demo | **Tier C.** Form option only. |
| **SOC 1** | https://delve.co/book-demo | **Tier C.** Form option only. |
| **LGPD** (Brazil) | https://delve.co/book-demo | **Tier C.** Form option only. |
| **NIS2** (EU) | https://delve.co/book-demo | **Tier C.** Form option only. |
| **"US Privacy"** (state privacy laws, unspecified) | https://delve.co/book-demo | **Tier C.** Form option only. |
| **ISO 9001** (quality management) | https://delve.co/book-demo | **Tier C.** Form option only. |

**Mentioned, but not claimed as frameworks Delve supports**

- **SOC 3.** Mentioned as a public-report option in the Trust Report (blog, 2026-01-09).
- **Saudi PDPL.** Appears in a marketing screenshot of a vCISO sharing a "SAUDIPDPL_to_GDPR" mapping spreadsheet in Slack, which is off-platform advisory work (/competitors).

**"Coming soon"**

- **Nothing is labelled "coming soon" anywhere on delve.co today.**
- Historical roadmap statements:
  - February 2024 (Launch HN): "We're rolling out SOC2 in a month! GDPR, HITRUST, etc. are down the line." On NIST SP 800-171: "No plans … potentially down the line." On ITAR: "can't promise that we'll get to it anytime soon."
  - January 2025 press release: "additional certifications in development".
- [AL] An internal note the whistleblower dates to early November (2025): "As of now, Delve's control system is not built for rapidly onboarding frameworks in a stable manner. It was built off of the initial SOC 2 control system, and then amended and modified for HIPAA, ISO 27001, and GDPR. Since January 15th, no new frameworks have been released in the platform." It continues: "we've asked vCISO's to instead support them off-platform … A services company."

**Searched for, with no evidence found on delve.co or in any third-party source reviewed**

NIST CSF (1.1 or 2.0), DORA, TX-RAMP, StateRAMP under that name, CSA STAR, ISO 27017/27018, ISO 22301, SOX ITGC, NYDFS Part 500, Cyber Essentials, C5, IRAP, TISAX, APRA CPS 234, MAS TRM, HDS and ENS. Delve also shows no sign of **OSCAL** support.

**Depth caveat.** The whistleblower's analysis of the platform's backend responses [AL] found only four framework tags (`"frameworks": ["HIPAA","ISO27001","SOC2","GDPR"]`) across forms, integrations and controls. It concluded that "the platform only ever had (partial) support for four frameworks" and that ISO 42001, HITRUST, CMMC, FedRAMP and CCPA went to off-platform vCISO services. Delve has not published a coverage matrix that would settle the question.

---

## 3. Product capabilities in detail

### 3.1 Architecture at a glance

Delve sells four layers.

1. **Platform:** Dashboard, Team, Tech, Company, Policies, Trust and a Controls tab [P marketing art; P blog 2026-03-24].
2. **AI layer:** evidence agents, a copilot, a policy assistant, questionnaire autofill, SAST code scanning and infrastructure scanning [P].
3. **Services layer:** a dedicated CSM, a Slack or Teams channel, vCISO support, audit management through partner firms, a penetration test, legal and privacy drafting, and migrations [P].
4. **Enterprise layer:** **Pathways**, a no-code AI workflow and "evidence pathway" builder; custom Common Control Frameworks; "custom risk management" [P].

Delve's own contract describes the service as "recommendations only … not legal advice … no warranty or guaranty that by using the Services Licensee will be fully compliant … (including … SOC2 and HIPAA)" [P, Services License Agreement §5.6; the original is in capitals].

### 3.2 AI agents and AI features

| Capability | What Delve claims | Independent or third-party view | Assessment |
|---|---|---|---|
| **Evidence collection** (API integrations plus browser and computer-use agents for screenshots) | "Autonomous AI agents to take screenshots, write reports, and perform validation of your evidence for you" [P]. "Delve's browser agents automate screenshots" [P-A 2025-08]. Enterprise tier: "Delve's computer use agent for screenshot automation" [P]. "Leverage our browser agents to collect evidence where API's don't cut it" [P /deals/yc]. YC launch, January 2025: "customers write a single instruction and AI agents automatically collect the required evidence" from web apps, internal tools and custom software [P-L]. | Insight Partners (investor): agents collect evidence by "screenshotting infrastructure configurations, verifying access controls, and monitoring permission changes" [3P]. [AL] Most "integrations" are containers for manual screenshots and forms. [AL] An engineer posted on 2025-08-09 that "v0 of Delve AI was live". | Claimed but not demonstrated publicly. There are no public agent logs or demos. Depth is disputed. |
| **AI evidence validation** | "AI validation runs analysis on every upload. Screenshots get matched against the controls they claim to satisfy. Policy documents get scanned for required sections. Access logs get verified for correct permissions. Drift gets flagged immediately" [P blog 2026-01-09] | None found | Claimed only. |
| **Copilot and remediation** | January 2025: "Compliance copilot to fix issues", "how-to's, code patches, and links to live documentation", "Auto-submit PRs to resolve vulnerabilities" [P-A]. The current marketing mock shows a "Delve AI" panel with "Fix in Console" and "Run via CLI" buttons [P]. "Pick back up from where you left off with a simple prompt" [P]. | Insight: agents "remediate 90% of surfaced issues without human intervention" [3P, investor]. [AL] The copilot gives generic advice with little context and often links to other GRC vendors' content. | Claimed. The 90% autonomous-remediation claim has no public support. |
| **Policy generation and AI policy assistant** | "Pre-written, auditor-approved policies" [P-A 2025-07]. "Pre-built policies: Customized to you" [P]. "AI policy assistant: throw vendor questions at our AI policy assistant" [P]. CMMC: "Generate policies aligned to NIST SP 800-171 … fully editable" [P]. "Generates policies based on your actual setup" [P /learn]. Auditors use "Delve's AI policy chat" [P]. | [AL] Policies are pre-created, recommended "as they are", and assert measures (such as MDM) that the process never implements. After the scandal Delve committed to "clearer template disclosures" and says templates are "starting points only" [P 2026-03-24, 2026-04-03]. | Templates are real. How much tailoring happens is disputed. |
| **Security questionnaire autofill** | Answers vendor questionnaires "from your compliance policies and technical set-up" [P]. Parses DOCX, PDF and XLSX and claims to "answer every question correctly 95% of the time*" [P /deals/yc]. | [AL] The tool answered about 70% of one customer's questionnaire, including assertions that controls existed when they did not. Delve's rebuttal accepts the 70% figure as proof the AI works [P 2026-04-03]. | Real feature. The accuracy claim has no published methodology. |
| **AI SAST code scanning** | "Delve checks every PR for code security" [P]. January 2025: "Scan every git push for security" [P-A]. | Monaco testimonial [P]. | Claimed. |
| **AI infrastructure scanning** | "Scans your infrastructure everyday for compliance issues" [P]. The AWS mock shows tests such as S3 encryption at rest, encryption in transit, AWS Inspector enabled and KMS permissions, with pass or fail and "13 hrs ago" timestamps. | Remi case study: AWS encryption checks, CloudWatch alarm checks and PostHog [P-A]. | Partially corroborated for AWS. |
| **Vendor risk** | "Automate vendor security reviews at scale … auto-analyzing vendor responses, highlighting gaps, and surfacing risks" [P mid-market and enterprise pages]. The pre-audit checklist covers critical vendors, vendor SOC 2 reports, BAAs and vendor risk assessments [P]. | Vanta (competitor) says Delve "lacks native Vendor Risk Management" [3P]. [AL] Vendors are added in the Tech tab as "integrations" backed by forms (TechOnboarding, TechRiskAssesment, TechOffboarding). | Thin. |
| **Access reviews** | No dedicated feature found. The only traces are questionnaire sample text ("quarterly access reviews"), the checklist item "access request logs" and an "Access Request Form" [AL]. | None found | **Not evidenced. This is a gap.** |
| **Penetration testing** | Complimentary manual grey-box test with every audited framework: "Internal & external network testing, API & application security, 24-hr retesting" [P]. Advanced test from **$4,500** [P-A]. "Leverage autonomous penetration testing" [P /deals/yc]. RSAC 2026: "our AI-powered pentesting platform" [P-A]. Free penetration test for all customers since 2026-03-24 [P]. | HockeyStack case: a GWAPT-certified tester, 6 days [P-A]. [AL] One customer was told a pentest-tools.com vulnerability scan was sufficient. | A mix of real service and marketing. |
| **Risk assessment and risk register** | Enterprise: "Custom risk management" [P]. Marketing art links a finding ("John — Missing MFA in google") to controls and then to three risks [P]. | [AL] The risk assessment is a form with ten default risks that customers accept. | Marketing concept; the risk register itself is thin. |
| **Auditor coordination** | "End-to-end audit management", an "auditor network", and a 9-step process (§4). Auditors get platform access to evidence, controls and the system description, plus JSON logs from integration tests [P]. The platform "builds your Section 3 system description" [P]. | [AL] Delve generated draft reports, with conclusions, before the auditor's review. After the scandal Delve moved auditor communication into customer channels, offers engagement letters and has "halt[ed] any automation that interacts with audit workflows" [P 2026-03-24, 2026-04-03]. | The core differentiator became the core liability. |
| **Pathways** (no-code AI workflow and evidence builder) | Mid-market: "Delve's AI evidence pathway builder". /competitors: "Automation Workflow Builder — Scale any compliance data task". /deals/yc: "Pathways tooling" for FedRAMP and GovRAMP. RSAC 2026: "Build a Pathway", "Pathways for GRC teams" [P], [P-A]. | TechCrunch (2026-04-01) reported the allegation that Pathways is a fork of Sim.ai's Apache-2.0 **SimStudio**. Sim's CEO said "Delve had no license agreement with Sim.ai whatsoever." Delve says it "built on an Apache 2.0 open-source repository … and significantly rebuilt it" [P 2026-04-03]. [AL] Pathways was sold to enterprises for $20k to $200k+. | Real product with disputed provenance. Pathways mentions were scrubbed from marketing [3P]. |
| **AI onboarding and program customization** | "AI collects information about your team members, integrations, risk tolerance, and more. We then remove 'checkbox' requirements and customize compliance" [P]. The mock shows controls toggled "Applicable" or "Not applicable". | [AL] "For any particular framework, Delve rolls out the same program for every client." The leak analysis found near-identical report text across clients. | Disputed. |

### 3.3 Continuous monitoring

Delve's claims:

- "Compliance testing runs continuously. Not weekly. Not monthly. Daily." [P 2026-01-09]
- "600+ automated tests" [P 2026-04-03]
- Drift flagged, renewal tracking and evidence collection year-round [P]
- Integrations run "automated tests daily to confirm their health" [P-A 2025-07]

The counterclaim [AL]: the evidence model is point-in-time. Screenshots of laptop settings are taken once, and forms recur at most every six months, which the whistleblower calls "structurally incompatible" with SOC 2 Type II operating-effectiveness evidence.

### 3.4 Integrations

**Counts claimed over time**

- "Over 100 integrations out of the box" (July 2025) [P-A]
- "120+ automated integrations and subservices" (2026-03-20) [P]
- "600+ automated tests" (2026-04-03) [P]

**Counts disputed**

- [AL] "Delve only has 14 real integrations" (those with `authRequired: true`). The rest are "placeholders for manual evidence".
- An independent front-end bundle analysis (security.redeux.ai, 2026-03-21/22) found **14 OAuth providers**: GOOGLE, JIRA, LINEAR, SLACK, GITHUB, GITHUB_REPO, X, CONFLUENCE, AIRTABLE, SUPABASE, NOTION, DISCORD, MICROSOFT, HUBSPOT [3P].
- G2's integration list (November 2025) showed only GitHub.

**Named integrations found in Delve-controlled sources**

| Category | Named | Source |
|---|---|---|
| Cloud (IaaS) | AWS (including GovCloud for Knowtex), GCP, Azure, DigitalOcean | [P-A] blog 2025-07; Knowtex case |
| PaaS and hosting | Railway, Vercel, Fly.io, Render, Heroku | [P-A] |
| Code and source control | GitHub (daily checks: branch protection, MFA, secret scanning, audit logs), GitLab, Bitbucket | [P] GitHub checklist blog; [P-A] |
| Databases and data | Supabase, MongoDB, Neon, Pinecone | [P-A] |
| Identity and workspace | Google (Workspace MFA example), Microsoft | [P] art; [3P] bundle |
| Communication | Slack (plus support in Slack or Microsoft Teams), Discord | [P]; [3P] |
| Ticketing, project management and docs | Linear, Jira, Confluence, Notion, Airtable | [P-A] Lovable; [3P] bundle |
| Product analytics, CRM and marketing tools | PostHog, Customer.io, Dub, HubSpot | [P-A] Lovable, Remi, Wispr; [3P] |
| AI vendors (as in-scope subservices) | OpenAI, Anthropic, Baseten, Hugging Face | [P] art; [P-A] Lovable, Wispr (custom integrations) |
| HR and background checks | Certn for background checks [AL]. **No HRIS named** (no Rippling, Gusto, BambooHR, Deel or Workday integration). | [AL] |
| MDM and endpoint | **None named.** Device security is handled by manual screenshots [AL]. | [AL] |
| Custom | "Add Custom Integration" and "Custom Integrations" store data and run tests. On-premise systems go through custom integrations. "If they don't have an API … a manual workaround with our AI agents" | [P-A]; [P] |

### 3.5 Trust center ("Trust Report")

- It is free and runs at `trust.delve.co/<company>` or a custom domain (for example trust.wisprflow.ai) [P].
- The UI has tabs for **Certifications, Resources, Controls, Subprocessors and FAQs**, plus a **Request access** button [P].
- Features: an NDA workflow, custom data rooms, and "dynamic badge management" that removes the badge when a report expires. Customers choose what to publish, such as a SOC 3 or an ISO certificate [P 2026-01-09].
- Delve issues compliance badges reading "Monitored by Delve" and "Secured by Delve" [P].
- Wispr says it "onboard[ed] 400 enterprises … by just sending a single email and a link to our trust center" [P-A].
- [AL] Trust pages come "fully populated" with security measures such as pentests and data-recovery simulations **before any work is done**, and do not change after it.

### 3.6 Policies

See the policy row in §3.2. Delve supplies pre-written templates and an AI policy assistant. After the scandal it added disclosures stating that templates are only starting points.

### 3.7 Employee onboarding, security training and HR evidence (the "Team" tab)

Per [AL], corroborated by Delve's own pre-audit checklist [P]:

- Background checks, via Certn per [AL]
- Security training: videos and quizzes ("Compliance Policies Training", "Computer Settings Training")
- Device security screenshots
- Performance evaluations
- Onboarding, offboarding and position-change checklists

A G2 reviewer praised the "pre-filled policies and easy means of background checks" [3P].

### 3.8 Device monitoring

There is **no evidence of an endpoint agent or MDM integration**. Evidence is manual screenshots of laptop settings [AL], plus a "Computer Settings Training" [AL].

### 3.9 Vendor management

See the vendor-risk row in §3.2. Delve's checklist covers critical vendors, collected vendor SOC 2 reports, BAAs and vendor risk assessments [P]. There is no evidence of a dedicated vendor-management module.

### 3.10 Risk register

See the risk row in §3.2. The only evidence is a marketing graph linking findings to risks and [AL] a default-risk form.

### 3.11 Audits and the auditor network

**Delve's position**

- "Hand-picked roster of top-tier firms" [P]. Customers may bring their own auditor [P].
- After the scandal: "Rebuilding our auditor network and removing firms that don't meet our standards" [P 2026-04-03].

**Firms named in various sources**

- **Insight Assurance** mapped Delve's HIPAA workflow in 2024 [P-L Launch HN].
- **Prescient Assurance, Johanson Group LLP and Insight Assurance** are listed as partner auditors on soc2vendors.com [3P].
- [AL] Almost all recent clients went through **Accorp** or **Gradient Certification**. The allegations also name **Glocert, DKPC, Accorian, Prudence Advisors and BQC**.
- Accorp publicly denied that the leaked reports were its own [3P].
- Intentional Cybersecurity reports that Accorp failed its AICPA Peer Review [3P].
- [AL] Delve told clients it was moving their SOC 2 audits to **Ezzy & Associates**. DeepDelver advises clients to accept a Delve re-audit only if it is performed by **A-LIGN**, which implies A-LIGN is one of the re-audit options (unconfirmed).

### 3.12 Human services layer

- A dedicated CSM and a shared Slack or Teams channel.
- A vCISO "in every Slack channel", plus security engineers who "join your enterprise calls" [P-A 2025-07].
- Legal and privacy drafting: T&Cs, SLAs, cookie banner and GDPR (Lovable case) [P-A].
- "Free migrations from any platform … even if you're in the middle of an observation period!" [P /deals/yc].
- Partner vCISO firm: Com-Sec (HITRUST).

**Response-time claims don't match the contract**

- Marketing says "<5m", "<4 minutes", "~1min response time" and "365 days a year, 7 days a week" [P], [P-A].
- The Services License Agreement commits to support "on weekdays during the hours of 10:00 am through 6:00 pm Pacific time … commercially reasonable efforts to respond … within one (1) business day" [P]. The AWS Marketplace listing says the same [P-L].

### 3.13 Timelines promised

| Framework | Delve's stated timeline | Source |
|---|---|---|
| SOC 2 Type I | 30-minute onboarding → 10–15 hours of setup → 1–3 week audit | [P] /product/framework/soc-2 |
| SOC 2 Type II | The same, plus a 3-month observation period | [P] |
| SOC 2 (other claims) | "get compliant by Friday", "7 days" (January 2025) [P-A]. "<7 Days average time to SOC 2 readiness" [P /competitors]. "~30-minute onboarding, 10-15 hours in the platform, can be completed in 5-7 days"; "Another YC team of just two founders finished SOC 2 in 4 days" [P-A 2025-07]. "Get SOC 2 certified in 2-3 weeks" [P startup page meta description]. "In as little as 15 hours" [P /referral]. | as shown |
| HIPAA | 30 minutes → 10–15 hours (+ 1–2 weeks of BAA collection). "As little as one day" [P-A 2025-07] | [P] |
| ISO 27001 | 30 minutes → 10–15 hours of gap analysis and ISMS → 1–2 weeks of setup → 1–3 week audit. Up to "2x faster" when paired with another framework [P-A] | [P] |
| ISO 42001 | 30 minutes → 10–15 hours of gap analysis and AIMS → 1–2 weeks → 1–3 week audit | [P] |
| PCI DSS | 30 minutes → 10–15 hours of scoping → 10–15 hours of setup → 1–3 week audit | [P] |
| GDPR | 30 minutes → 10–15 hours | [P] |
| HITRUST | e1 6–8 weeks; i1 8–12 weeks; r2 4–9 months | [P] Com-Sec blog |
| CMMC | "weeks, not months"; manual workload cut "from 200+ hours to 10-15 hours" | [P] /learn/cmmc |
| FedRAMP-aligned | 85 days to a VA Interim ATO (Knowtex) | [P-A] |

### 3.14 Pricing

| Data point | Value | Source |
|---|---|---|
| Model | Quote-based and demo-gated. No public pricing page. "Radically simple pricing … one cost for everything": platform, audit, manual grey-box pentest and all features. "No hidden fees, no upsells" | [P] /deals/yc |
| Contradictions | The homepage lists paid add-ons ("Advanced penetration test", "vCISO support"). /competitors calls vCISO support "Complimentary" and promises "No constant upsells". [AL] One customer was quoted "$40,000+" for the GRC workflow builder. | [P]; [AL] |
| Published list price | AWS Marketplace "Foundation Package": **$12,000 for a 12-month contract, 1–20 employees**, scaling with headcount | [P-L] |
| Renewal | "Your price stays the same year over year unless you cross employee thresholds (15, 30, or 45 employees)" | [P-A] 2025-07 |
| Typical deal size | ACV about **$15,000** | [3P] founder-led sales write-up (2025-07-25); startups.rip |
| Negotiation (one account) | SOC 2 "starting at $15,000" → $13,000 → **$6,000** including ISO 27001 and a pentest | [AL] |
| Bundle example | $15,000 for SOC 2 Type 1 + Type 2 + HIPAA (April 2025 call notes) | [AL] (notes provided by Sim.ai) |
| Pentest add-on | From $4,500 | [P-A] |
| Discounts | YC: the lesser of $2,000 or 25% off, annual upfront, plus merchandise. Accelerator promo codes (YC, Techstars, Antler). About 20 archived partner "deals" pages (Brex, Ramp, Rho, Deel, Railway, Thrive Capital, Morning Brew and others). On 2026-09-26 only /deals/yc is live; the others checked return 404. | [P]; [P-A] CDX |
| Referral | $1,000 per closed referral | [P] /partnership |
| Payment and refunds | Invoices due within 7 days. "No obligation to refund any payments … except in the case of material breach." [AL] HIPAA refunds were refused after the scandal. | [P] Services License Agreement §4 |
| Estimates (competitors) | $10k to $30k per year; total cost of ownership about $22k | [3P] (competitor) ComplyJet; soc2auditors.org |

### 3.15 Target customer segments

- **Startups**, especially AI-native and YC companies: "Over 1/3 of YC's S25 batch". Named examples include Lovable, Bland, Wispr Flow, 11x, HockeyStack, Remi, Knowtex, Thoughtly, Greptile, Whop, Slash, Micro1 and Levels.fyi.
- **Mid-market:** custom AI workflows and custom frameworks.
- **Enterprise:** a computer-use agent, custom Common Control Frameworks and custom risk management.
- **Verticals:** healthtech (HIPAA), defense contractors (CMMC), federal (FedRAMP or GovRAMP) and "regulated fintech".
- The demo form's size bands run from 1–10 to 1000+ employees.

All from [P], [P-A].

### 3.16 Product evolution

- **2024:** HIPAA-as-a-service, AWS-only one-click infrastructure (Terraform), policies and a monitoring dashboard [P-L].
- **2025:** "AI-native" platform with evidence agents, a copilot, questionnaire autofill, SAST, trust report and bundled audits and pentests. Series A in July. Pathways work reportedly began around April 2025 [AL].
- **2026:** enterprise push (Pathways, HITRUST, CMMC, FedRAMP content; RSAC booth), then the crisis. After it, Delve promised "platform demos to be even more transparent" [P 2026-04-03]. None had been published as of 2026-09-26.

---

## 4. UX and UI observations

Sources: Delve's marketing art and mockups [P], customer and whistleblower descriptions [AL], independent bundle analysis [3P] and archived pages [P-A]. There was no direct access to app.delve.co.

**Information architecture**

- Top-level tabs: **Dashboard, Team, Tech, Company, Policies, Trust** [P mock]. A **Controls** tab where customers "view their control set" and "JSON logs for all integration tests" [P 2026-03-24].
- The whistleblower describes "four categories" of work (Policies, Team, Tech, Company) plus the Trust tab [AL].
- Delve markets an "Action-based workflow" against competitors' "Control-based workflow" [P /competitors]. The product is organized around tasks and forms, not requirements.

**How framework progress is shown**

- Framework cards: "SOC 2 Type II — 19 of 82 controls — 23%" and "HIPAA — 19 of 79 controls — 24%", each with a horizontal progress bar [P mock].
- An "Overview" row with three cards: **Team** "72% · 28/40 members complete", **Tech** "67% · 10/16 integrations compliant", **Company** "73% · 57 of 82 controls" [P mock].
- A per-integration view, for example "AWS: 90% Compliant · 1 Failed". It lists named tests with pass or fail icons and relative timestamps, and a "Delve AI" side panel explains the failure and offers "Fix in Console", "Run via CLI" or a chat box [P mock].
- Audit views: "Upcoming tasks" with due dates ("Upload Access Logs, Aug 10"; "Respond to Auditor Question, Aug 11") and an evidence progress meter ("19 of 82 collected, 23%") [P mock, /competitors].
- Questionnaire tool: a progress bar ("63 of 75 completed"), question-and-answer cards and an **Auto-Fill** button. The mock answers carry **no citations or evidence links** [P mock].
- Trust Report: a branded header, the tabs listed in §3.5, certification cards ("SOC 2 Type 2 — Last audit: July 2025"; "HIPAA — Continuously monitored") and a resources library [P mock].

**Onboarding flow**

1. Book a demo through a 3-step form: personal details, then frameworks and timeline and size, then referral source.
2. Receive a quote and a Slack or Teams channel on the same day.
3. A 30-minute white-glove onboarding with a CSM.
4. "AI onboarding" collects team members, integrations and risk tolerance, then marks controls Applicable or Not applicable.
5. Tasks across Team, Tech, Company and Policies.
6. Trigger the audit from the platform.

The audit itself runs in nine steps: 01 Audit Trigger → 02 Engagement Letter → 03 Auditor Access → 04 Fieldwork → 05 Audit Management → 06 Exception Handling → 07 Draft Report → 08 Final Report → 09 Trust Center Update [P].

Per [AL], a customer can activate and publish the trust page before doing any work.

**Visualizations**

- In the product (as far as the evidence shows): progress bars, percentages, checklists, cards and tables. **Nothing spatial, interactive or graph-based.**
- In marketing art only: node-link diagrams. One is a SOC 2 "CCF 138 Ensure all team members have MFA enabled" → "Export list of users with MFA in GitHub" (screenshot taken) → "Remind Jerry Lee to enable MFA". Another runs "John — Missing MFA in google" → controls "DCF 23 Multi-factor Authentication" and "DCF 48 Access to Production & MFA" → three risk cards. These show the right idea, a chain from finding to control to risk to remediation, but there is **no evidence it exists as an interactive product surface.**
- No crosswalk or coverage visualization, no maturity view, no time or drift history view and no agent-activity view was found.

**Under the hood**

- [AL] Almost every task is a form. `formType` takes the values FORM, TABLE and TRAINING; entity `type` takes INTEGRATION, USER and ORG. There are forms for board meetings, risk committee, IT leadership meetings, security simulations, GDPR artifacts and more, most with default values.
- An internal note from December 2024 [AL] says the UI was "organized by evidence requests", which confused auditors, and planned a "redesign [of] the auditor dashboard to be by control".
- [3P] Next.js front end; Descope authentication; PostHog; Socket.io; OpenAI and Anthropic API keys referenced.
- [3P] RBAC roles: ADMIN, TECH_ADMIN, TEAM_ADMIN, AUDITOR, GHOST, MEMBER, CONTRACTOR.
- [3P] Researchers found a hard-coded staging backend URL and authentication flows named "impersonate" and "testing" deployed to production.
- The marketing site runs on Webflow. Several product pages were published with placeholder copy ("# Need copy") before being deleted. The live homepage HTML still contains a "Cutting-edge AI agents" block with *Lorem ipsum* text, which may be hidden when rendered [P], [P-A].

**What this means for Visua.** Delve's UX bet is simplicity plus human hand-holding in Slack. Its visual vocabulary is the generic SaaS dashboard. There is clear room for a product that makes **structure** (frameworks, requirements, crosswalks), **state** (status, evidence freshness, drift) and **activity** (agents, approvals) legible at once. Visua's Observatory concept in `DESIGN.md` does exactly that.

---

## 5. Customer sentiment

### 5.1 Praise

Most of this comes from Delve's own curated pages, so it carries selection bias.

- "I bought another vendor and ended up double paying for Delve. They're amazing – don't make my mistake." (Torrey Leonard, CEO, Thoughtly) [P /book-demo]
- "Our previous platform took 4 months. Delve took 2 weeks." (Keith Fearon, 11x) [P]
- "Beautiful UI, intuitive UX. Probably one of the best products I've ever seen." (Avi Schiffmann, Tab) [P-A January 2025]
- "HIPAA compliant in 1 week." (Sumanyu Sharma, Hamming AI) [P-A]
- Lovable: SOC 2, ISO 27001 and GDPR "in under 20 days" with fewer than 20 team hours [P-A 2025-08]. **But** in March 2026 Lovable posted: "Lovable is not a Delve customer. We proactively moved to Vanta in late 2025 … Our SOC 2 Type II was independently audited by Prescient Assurance" [3P X].
- Remi picked Delve after "glowing reviews … on YC's internal Bookface forum" [P-A].
- G2 themes: a responsive, hands-on team; clear, structured guidance; "pre-filled policies"; easy background checks [3P].

### 5.2 Ratings

- **G2:** 4.4/5 on **7 reviews** in the archived snapshot of 2025-11-05 (71% five-star, 14% four-star, 14% two-star). By mid-2026 about **135 reviews at 4.7/5** (soc2auditors.org, "as of July 24, 2026"; the G2 seller page shows 136). That is roughly 20 times more reviews in eight months, straddling the scandal. Cons reported: slow load times, minor bugs, a navigation learning curve, unclear task instructions and limited customization [3P].
- **AWS Marketplace:** 5 stars on 3 reviews [P-L].
- **Capterra:** the listing named "Delve" (ID 196428) is a different company.

### 5.3 Complaints and criticism before the crisis

- **Launch HN (2024-02-26):** a healthcare CIO criticized the "too thin" website and reliance on demos ("companies … who want to share everything in demos/meetings have a lot of warts they try to hide"). Others noted there was no public pricing and support was AWS-only. They asked how Delve differs from Aptible, Vanta, Drata, Secureframe and OneTrust/Tugboat; the founder answered "Think of us like Aptible + Vanta". Commenters predicted early-stage customers would churn as they grow [P-L thread].
- **Sales experience:** "the vibe was that it was 'cheap and quick'" (HN commenter, 2026-03) [3P]. [AL] High-pressure discounting ("sign within 24 hours").
- **[AL] May 2025 client call (Salesmsg):** the client said a CSM told staff it was "okay" to enter a board meeting that "doesn't exist" into evidence.

### 5.4 Controversy timeline (2025–2026)

| Date | Event | Source |
|---|---|---|
| Late December 2025 | An email to hundreds of Delve clients revealed a **publicly accessible Google Sheet linking to hundreds of confidential draft audit reports**. The CEO's reply called it "human error" and said "no external party gained access to the Delve platform … or any databases". | [AL] DeepDelver Part I (quotes the CEO email); [3P] startups.rip |
| 2026-01-09 | Delve publishes "Inside Delve's Trusted Compliance Process": three layers (platform validates, the Customer Success (CS) team verifies, the auditor examines). | [P] |
| 2026-03-19 | **DeepDelver Part I, "Delve – Fake Compliance as a Service"** (about 19,000 words). It analyzed 575 files (494 SOC 2, 81 ISO 27001) and found **493 of 494** SOC 2 reports sharing the same boilerplate, including the same grammatical errors. All 259 Type II reports carried identical conclusions ("no security incidents", "no significant changes", "no customer terminations"). It named auditors, product details and affected companies. The Hacker News thread reached 836 points and 296 comments. | [AL]; [3P] Hacker News |
| 2026-03-20 | Delve's "Response to Misleading Claims": it does not issue reports, uses independent auditors, standardization is inherent, templates are not fake evidence, and it has "120+ automated integrations" and "more than 1,700 customers". | [P] |
| About 2026-03-20 | Lovable publicly distances itself: not a Delve customer, moved to Vanta in late 2025. | [3P] X |
| 2026-03-21/22 | Bundle analysis finds a staging backend URL, an "impersonate" auth flow and 14 OAuth providers. A researcher reports access to sensitive employee data, and a Dvuln founder documents external exposure. | [3P] redeux.ai; TechCrunch |
| 2026-03-22 | TechCrunch: "Delve accused of misleading customers with 'fake compliance'". Independent index (trustcompliance.xyz): 533 reports, 455 companies, 99.8% identical. | [3P] |
| 2026-03-23 | Insight Partners removes its Series A thesis post; it is later restored. | [3P] TechCrunch |
| 2026-03-23/26 | Delve exhibits at RSAC 2026 (Pathways, "AI-powered pentesting platform"). | [P-A] |
| 2026-03-24 | Delve announces free re-audits by an "AICPA-accredited" auditor, free pentests, auditor engagement letters, direct auditor communication and template disclosures. | [P] |
| 2026-03-26 | TechCrunch: LiteLLM, which obtained its SOC 2 and ISO 27001 through Delve, is hit by supply-chain malware. | [3P] |
| 2026-03-28 | DeepDelver Part II, Day 1: an employee whistleblower supplies recordings (the CEO asks "Does Accorp actually look at our platform at all?"), a "report generator" screenshot, the internal note on frameworks and the switch to Ezzy & Associates. | [AL] |
| 2026-03-30 | LiteLLM drops Delve for Vanta. | [3P] TechCrunch |
| 2026-03-31 / 04-01 | The Pathways and SimStudio allegation; Sim.ai's CEO confirms there was no license agreement. Pathways mentions are scrubbed from Delve's site. | [AL]; [3P] TechCrunch |
| 2026-04-03 | Delve (CEO and COO) publishes "sets the record straight". It apologizes ("We moved quickly to scale and as we did, fell short of the standard we hold ourselves to") and lists actions: rebuilding the auditor network, halting automation that touches audit workflows, free re-audits and pentests. It alleges "a coordinated, targeted cyberattack" by a buyer who "purchased Delve under false pretenses". | [P] |
| 2026-04-03/04 | YC profile removed; COO: "YC and Delve have parted ways". | [P] (verified 404); [3P] TechCrunch, X |
| 2026-04-09 | TechCrunch: a Mercor contractor lawsuit names LiteLLM and Delve (Mercor was not a Delve customer). The MIT student paper covers the fraud allegations. | [3P] |
| 2026-04-15/19 | DeepDelver "Hawaii edition": alleges a company offsite during the crisis, refusals of HIPAA refunds, the December 2024 internal note doubting HIPAA coverage, and advises clients to accept re-audits only through A-LIGN. | [AL] |
| 2026-04-21 | ***Ananthula et al. v. Mercor.io Corp. et al.***, N.D. Cal. No. 3:26-cv-03362, a 10-count class action. It names "Delve AI Inc." as a defendant over alleged "fake compliance" and "sham security audits" for LiteLLM (Berrie AI). Status: early. No government action reported as of June 2026. | [3P] LegalClarity; Justia docket listing |
| Between 2026-04-21 and 2026-07-18 | The homepage mock email signed "Sam Altman, sama@openai.com" is replaced with a fictional "Jordan Reyes". | [P-A] |
| Between 2026-07-18 and 2026-09-26 | The ISO 42001 badge disappears from "Delve's Compliance Certifications". | [P-A] vs [P] |
| 2026-09-26 | Site live and still selling. No blog posts since 2026-04-03. | [P] |

### 5.5 How Delve changed its website

Comparing Wayback snapshots from 2026-02-14 and 2026-03-14 with 2026-04-21 and today:

- Removed: the case-studies menu and all case-study pages, the testimonials page, the customer quotes block, the "Logos we've helped close" grid (PayPal, Walmart, Microsoft, Amazon, American Express, Stripe, GitHub and others), the customer-logo marquee (Flow, Bland, Greptile, Whop, 11x, Slash, Micro1, Levels.fyi), all Pathways mentions except /deals/yc, and the /product/platform/* pages.
- Added: the three rebuttal blog posts and a media-inquiries link.

### 5.6 Market commentary

- **IANS (2026-04-19):** buyers should obtain written confirmation that auditors "designed and executed their own tests", spot-check 5 to 10 controls against evidence, and vet auditors' "AICPA accreditation status" and independence from platform vendors [3P].
- **Intentional Cybersecurity:** "If these auditors, and the systems behind them, can't be trusted, then neither can the reports." [3P]
- **Hacker News:** "The damage this will do to the reputation of the SOC2 Security Attestation is incalculable." (tptacek) [3P]

---

## 6. Strengths, weaknesses and gaps an AI-first competitor can exploit

### 6.1 Delve's real strengths

1. **A sharp promise aimed at a clear ICP.** Founders who need SOC 2 to close a deal now. The messaging ("close deals", "days, not months") speaks the buyer's language.
2. **One bundle, one price.** Platform, audit, pentest, vCISO and Slack support in a single purchase removes the work of sourcing an auditor and a pentester.
3. **High-touch service.** Shared Slack channels, fast replies, white-glove onboarding, free migrations and experts on customer calls. Most praise in reviews is about **people, not software**.
4. **Sales enablement first.** A free trust report, badges, questionnaire autofill and data rooms map directly to revenue.
5. **Distribution.** YC network effects ("1/3 of S25"), accelerator deals pages, referral payouts, billboards and RSAC.
6. **A simple, jargon-free UI.** Customers called it "TurboTax for compliance".
7. **Early bets on AI governance frameworks.** ISO 42001, the EU AI Act and NIST AI RMF, suited to AI-native customers.

### 6.2 Weaknesses and gaps

| # | Weakness or gap | Evidence | Opportunity for an AI-first competitor |
|---|---|---|---|
| 1 | **Collapse of trust in how outcomes are produced.** Templated reports, pre-filled evidence, auditor independence and conflicting accounts of the auditor network. | §5.4 | Make **verifiability** the product: provenance, independence guardrails and auditor verification. |
| 2 | **Automation depth disputed.** "120+ integrations" against "14 real". A forms-first architecture. Point-in-time screenshots. No MDM or HRIS depth. | §3.4, §3.3 | Publish an integration catalog labelled by automation depth. Collect continuous, API-sourced evidence with timestamps and hashes. |
| 3 | **Shallow framework support behind a long menu.** A demo-form list of about 30 items against an alleged four frameworks mapped in-platform. No NIST CSF. No OSCAL. | §2 | Go deep on NIST CSF 2.0, SOC 2 and 800-53. Publish a machine-readable coverage matrix. Be OSCAL-native. |
| 4 | **AI that asserts rather than proves.** Questionnaire answers without citations and a "95% correct" claim without methodology. [AL] Answers asserted controls that did not exist. Automation touching audit workflows was halted in April 2026. | §3.2 | Cited, evidence-grounded answers with confidence and human approval. Consistency checks across claims. |
| 5 | **Trust pages decoupled from reality** [AL]. | §3.5 | A trust center generated only from verified evidence, showing freshness and scope. |
| 6 | **Promising outcomes that belong to auditors.** "How Every Delve Customer Passes Their SOC 2 Audit" [P-A]. "Delivering a exception-free SOC 2 report" [P]. "Clean report delivered to your customers" [P]. "An auditors goal is to find problems in your set-up … You don't have time to waste on satisfying those requests" [P-A]. | §3, §4 | Never promise certification. Position as preparation for independent assessment, as `DESIGN.md` already says. |
| 7 | **Security hygiene of the vendor itself.** A public Google Sheet with draft reports, a staging URL in the production bundle, "impersonate" auth flows, exfiltration via file.io (in Delve's own telling), and a privacy policy allowing data sharing "to improve services (e.g. ChatGPT…)". | §4, §5 | Hold Visua to a publicly evidenced security bar: its own verified trust center, bug bounty, SBOM and clear LLM data-handling terms. |
| 8 | **Opaque, inconsistent commercial terms.** Demo-gated pricing, "no upsells" against paid add-ons, a no-refund clause, and support times that differ between marketing and contract. | §3.12, §3.14 | Published pricing and SLA; clear refund terms; honest support hours. |
| 9 | **UX that stops at progress bars.** No crosswalk, maturity, drift or agent-activity views. Organized by tasks and forms, not requirements. | §4 | 3D Observatory with a 2D twin, lenses, and requirement-centric structure with tasks as satellites. |
| 10 | **Unresolved questions about open-source provenance** (the Pathways fork). | §3.2 | License-clean engineering and a public attribution page. |
| 11 | **An ICP prone to churn.** First-SOC 2 startups outgrow or abandon checklist tools (Launch HN critique). Services margins pressure the model (the internal "services company" note [AL]). | §5.3 | Maturity-adaptive paths that grow with the customer: CSF tiers, then SOC 2, then 800-53 and FedRAMP. |
| 12 | **Distressed install base.** Delve claims 1,000 to 1,700 customers, many now facing questions from their own buyers. | §5 | A factual, respectful "integrity re-baseline" migration offer (see §7.10). |

**Market context** (competitor-sourced, so treat with caution): Vanta advertises 35+ frameworks and 400+ integrations and describes Delve as supporting about 6 frameworks with "limited integration depth" [3P competitor, 2025-12-16]. Low-price entrants such as CompAI (about $500 a month) compete on the same speed narrative [AL]. The category's weak point is now **credibility**, not features.

---

## 7. Visua differentiation strategy

**Thesis: same value, opposite trust model.** Delve's value to customers was real. Customers want to be audit-ready fast, with little busywork, able to close deals and stay compliant. The failure (alleged, and in part acknowledged) was that **speed came from assertion rather than evidence**. Visua should match the value and invert the mechanism. Every claim should be *seen* (3D), *sourced* (cited to official text), *evidenced* (provenance) and *approved* (human-in-the-loop).

### 7.1 Value parity map

| Value Delve sells | Visua equivalent | How it is distinct |
|---|---|---|
| "Compliance in days" | **Honest speed.** Agents pre-collect evidence and draft artifacts on day one. The **Readiness Terrain** shows real readiness per requirement: current maturity as prism height and target as a ghost prism. | Readiness is computed from verified evidence, not from accepted defaults. No promised pass dates. |
| 10–15 hours of customer effort | An **inbox of agent drafts** (Aurora Violet) that people approve, edit or reject. Hours saved are measured from agent run logs, not asserted. | People dispose; agents propose. Every draft has a flight recorder. |
| Bundled audit and pentest | A **verified auditor and pentester directory**: AICPA Peer Review status, state CPA licensure, ISO certification-body accreditation through IAF CertSearch, and OSCP/GWAPT credentials. Optional bundles with published prices. | Visua never drafts auditor conclusions and never picks "friendly" auditors. Independence is enforced by the product. |
| Slack-first human help | A **cited copilot** plus optional human experts. An honest SLA. | Answers cite the local official corpus (document, section, page). "No citation, no claim." |
| Trust Report, badges, questionnaire autofill | A **Trust center compiled from verified evidence** (scope, period, auditor, last-verified time) and a **questionnaire agent** that cites evidence and policy clauses for each answer. | A **claim-consistency agent** blocks publishing any statement that evidence does not back. |
| Daily monitoring | Continuous API and agent evidence with **provenance** (source, time, collector, hash) and **freshness decay**: evidence crystals dim as they age, per `DESIGN.md`. | Drift is visible spatially and over time (time scrubber). Auditors can replay the history. |
| Multi-framework reuse ("map your next framework") | The **Crosswalk Nexus**: cited, typed crosswalks (set-theory relationship types, per NIST IR 8477) across CSF 2.0, SOC 2, 800-53, 800-171 and others. | "Mapping ≠ evidence." Residual gaps are shown explicitly and nothing is auto-claimed. |
| Custom frameworks and Common Control Frameworks | **OSCAL-native** custom catalogs and profiles that import and export. | Portable. No lock-in. Machine-readable for auditors and for FedRAMP-style packages. |
| Pathways workflow builder | **Agent playbooks** with explicit autonomy policies, sandboxed browser and computer-use runs with recorded sessions, and approval gates. | License-clean. Every run is inspectable and reversible. |
| Right-sizing ("remove checkbox requirements") | **Maturity-adaptive scoping** through CSF 2.0 Organizational Profiles and Tiers. "Not applicable" requires a written rationale that auditors can see. | Right-sizing without faking. Scoping decisions are first-class, reviewable artifacts. |
| Migration from other tools | An **integrity re-baseline** (§7.10). | It detects template-derived or unsupported artifacts instead of carrying them over. |

### 7.2 3D spatial visualization: make the invisible structure legible

Delve's product shows progress bars. Its best ideas, the chains from finding to control to risk and from control to agent to evidence, exist only as static marketing art. Visua's signature surface should make those chains **real, interactive and at catalog scale**. The views below build on the geometry and lenses already defined in `DESIGN.md`.

1. **Framework Observatory.**
   - Each framework is a radial layout: its core at the origin, functions or families as sectors, categories and controls as beacons, and units of work (subcategories, criteria, control enhancements) as hexagonal prisms.
   - Height encodes measured maturity, and a ghost prism shows the target, so the gap is literally visible.
   - Lenses (Status, Gap, Evidence freshness, Ownership, Priority, Crosswalk coverage) re-encode the same space without moving objects.
   - This is where Visua can show the whole SP 800-53 catalog, which Delve never attempted. The corpus holds 1,196 control and enhancement objects; the design budget is 60 fps on an integrated GPU.
2. **Crosswalk Nexus.**
   - Stacked framework planes (CSF, SOC 2, RMF) joined by typed edges: subset of, intersects with, equal to, superset of.
   - Selecting SOC 2 CC6.1 lights up its CSF and 800-53 counterparts and shows **which evidence satisfies which side** and what remains uncovered.
   - This directly answers Delve's "we show which controls already satisfy new requirements", but with rationale and citations.
3. **Evidence lineage trace.**
   - Click any evidence crystal (for example the GitHub MFA export) and trace system → integration or agent run → evidence (hash, time) → test → requirement(s) → framework(s) → trust-center statement(s) → questionnaire answers.
   - It works in reverse: click a trust-center claim and see the evidence behind it, or see the claim flagged coral if nothing supports it.
4. **Agent traffic.**
   - Agents appear as violet comets traveling along links. Pending approvals pulse as beacons.
   - A "flight recorder" timeline replays each run: goal, plan, tool calls, screenshots or DOM snapshots, and citations.
   - This makes "agentic compliance" auditable instead of mystical, which is the direct counter to the "is there actually AI here?" critique of Delve.
5. **Time scrubber and drift.**
   - Scrub the observation period and watch status and evidence freshness evolve.
   - Type II operating effectiveness becomes visible: gaps, exceptions, detection and remediation. This targets the point-in-time weakness alleged against Delve.
6. **Scope slicer (for auditors).**
   - Carve out the in-scope system boundary, meaning components, subservice organizations and the carve-outs listed in the system description, as a 3D volume.
   - Export it as an OSCAL SSP component and inventory view.

**Guardrails.**

- Every 3D object has a keyboard-navigable 2D twin.
- 3D is never the only way to act.
- Target 60 fps using instanced meshes, per `DESIGN.md`.
- Measure whether 3D actually speeds up triage (time-to-answer tests) so it cannot be dismissed as a gimmick.

### 7.3 Transparent, explainable agents with human-in-the-loop

**Flight recorder for every run.** Goal, plan, steps, tool calls with inputs and outputs, sources consulted, and the final proposal.

**Propose and dispose.** Anything that changes compliance state is staged as an agent draft and applied only after approval, unless the workspace has granted a scoped autonomy policy. Examples:

- accepting evidence
- changing a status
- editing a policy
- publishing a trust-center claim
- sending a questionnaire

**Citations or silence.**

- Framework statements cite the local official corpus (document, section, page or paragraph).
- Customer-specific statements cite evidence IDs.
- Confidence is given in words with the reason.

**Guarantees Delve lacked.**

- A **claim-consistency agent** cross-checks policies, trust-center text and questionnaire answers against evidence. It flags cases such as "the policy claims MDM, but there is no MDM integration or device evidence", which are exactly the failure modes the whistleblower describes.
- **Template quarantine.** Template text is marked as "unattested" until a named person attests it. Board or committee minutes cannot be "accepted" from a template at all. They must be uploaded or recorded from an actual meeting.
- **Evidence provenance.** Every artifact records its source (API endpoint or agent session), a SHA-256 hash, its collection time, the collector (human or agent) and a scope tag. Browser-agent evidence includes the recorded session.

### 7.4 Maturity-adaptive guidance for any niche and any maturity level

**Intake.** Build an organizational profile: size, sector, data types, cloud footprint, current practices and business drivers (for example "sell to enterprise", "federal", "DoD supply chain", "EU customers", "AI product").

**Current Profile.** Auto-draft a CSF 2.0 Current Profile from integrations and short interviews. Then propose a Target Profile and Implementation Tier (1 Partial, 2 Risk Informed, 3 Repeatable, 4 Adaptive) that fits the drivers.

**Novice and expert modes.**

- Novices get plain-language steps grounded in CSF 2.0 Implementation Examples (363 in the corpus) and the Quick-Start Guides, including the small-business one. Every step is cited.
- Experts see raw requirement IDs, OSCAL, and the relationship types in crosswalks.

**Right-size honestly.** Controls may be marked Not applicable only with a rationale and an approver. Rationales are exported to auditors. This is the principled version of Delve's "remove checkbox requirements", which was alleged to mean "adopt the defaults".

**Niche overlays, delivered as OSCAL profiles:**

- healthcare (HIPAA Security Rule)
- payments (PCI DSS)
- defense (SP 800-171 and CMMC)
- public sector (FedRAMP and GovRAMP)
- AI products (ISO 42001, NIST AI RMF, EU AI Act)
- EU (GDPR, NIS2)

Each overlay should ship only when it has **real depth**, published in the coverage matrix.

### 7.5 NIST-first depth: CSF 2.0 → SOC 2 → NIST RMF / SP 800-53

Visua's corpus already holds the backbone. These counts come from `corpus/*/STRUCTURE.md` as of 2026-09-26.

**NIST CSF 2.0 as the organizing backbone.**

- 6 Functions, including Govern; 22 Categories; 106 Subcategories; 363 Implementation Examples.
- **7,021 Informative References**, including 6,643 OLIR entries from 24 datasets.
- Official crosswalks to SP 800-53 5.2.0, SP 800-171r3, SP 800-37r2, the Privacy Framework and SSDF.

**SOC 2 (AICPA TSC) as the commercial on-ramp.** SOC 2 is what most startups need first. Visua can show how each criterion maps to CSF outcomes and 800-53 controls, so work done for SOC 2 counts toward the NIST path. The AICPA corpus (`corpus/aicpa-soc2/`) was acquired on 2026-09-26 and is kept local-only because of the AICPA copyright (see §7.7 and `corpus/README.md`).

**NIST RMF and SP 800-53 as the depth tier.**

- The SP 800-53 Rev. 5, Release 5.2.0 OSCAL catalog, which includes the SP 800-53A assessment procedures.
- SP 800-53B baselines: Low, Moderate, High and Privacy.
- SP 800-37r2 RMF tasks: Prepare, Categorize, Select, Implement, Assess, Authorize, Monitor.
- SP 800-171r3 in OSCAL, 17 families. The DoD's CMMC program references SP 800-171 **Rev. 2**; confirm which revision applies before building CMMC content.

**Result.** A credible, evidence-backed route to FedRAMP Moderate, GovRAMP, TX-RAMP and CMMC Level 2. Delve could offer these only through vCISO services and Pathways.

### 7.6 OSCAL-native data

- Model Visua's internal data on OSCAL:
  - `catalog` and `profile` for frameworks and overlays
  - `component-definition` for integrations and the controls they implement
  - `system-security-plan` for scope and implementation statements
  - `assessment-plan` and `assessment-results` for auditor work
  - `plan-of-action-and-milestones` for gaps
- **Import and export everything.** Customers are never locked in. That matters to buyers after Delve, and a migration story is the adoption wedge.
- Give auditors OSCAL assessment-results export and read-only workspaces. Federal authorization is moving toward machine-readable, automated validation (FedRAMP 20x), and OSCAL positions Visua ahead of that shift.

### 7.7 Local official documentation corpus

**Ground every framework statement in versioned, hashed local copies of official sources.** `corpus/*/manifest.json` already records the URL, SHA-256 and license. Citations then survive vendor-site changes and work offline.

**Licensing discipline.**

| Material | Handling |
|---|---|
| NIST publications and U.S. regulations (45 CFR Parts 160/164; 32 CFR Part 170) | Public domain. Bundle freely. |
| EU law from EUR-Lex (GDPR, NIS2, the AI Act) | Reusable under the Commission's reuse policy. |
| ISO/IEC standards, AICPA TSC and guides, PCI DSS, HITRUST CSF, CIS Controls | Copyrighted or licensed. Store requirement IDs and short quotes. Load the full text only from customer-supplied licensed copies, or under a license agreement. |

**Version pinning.** Every citation records the document version, for example "SP 800-53 5.2.0 (OSCAL 1.2.2, oscal-content v1.5.0)". Updates arrive as reviewable diffs.

### 7.8 Crosswalks done right

- **Start from official and authoritative mappings:** NIST OLIR datasets, the CSF 2.0 informative references and concept crosswalks, and AICPA's published TSC mappings (verify versions).
- **Type every edge** with a NIST IR 8477 set-theory relationship (equal, subset, superset, intersects, not related). Record the rationale (syntactic, semantic or functional) and the source.
- **Human review for any AI-proposed mapping.** Keep a mapping-review queue.
- **Mapping is not evidence.** A crosswalk can suggest reuse. Status carries over only when the evidence actually satisfies the target requirement's assessment objective. Show residual gaps in the Nexus.

### 7.9 Integrity guardrails

These are table stakes after the Delve affair.

1. **Independence by design.** Visua never authors auditor sections: opinion, tests of controls or results. Auditors get separate, logged workspaces. There are no "exception-free" or "you will pass" promises, anywhere.
2. **Auditor verification.** Show each auditor's AICPA Peer Review result, licensure and ISO certification-body accreditation. Customers choose freely.
3. **An honest trust center.** Only statements backed by verified evidence are published. Each shows its scope, period, auditor, last-verified time and in-progress items.
4. **Integration honesty.** Every connector is labelled **API-automated** (with the number of tests), **agent-assisted** (recorded sessions) or **manual upload**. Publish the counts.
5. **A public coverage matrix** per framework: requirements, mapped share, automated tests, evidence types and known gaps.
6. **Visua's own security.** Its own trust center built on its own evidence, an independent audit by a peer-reviewed firm, a bug bounty, an SBOM and a clean open-source attribution page. Tenant isolation and least privilege. A clear policy that customer data does not train models, with zero-retention LLM options.
7. **Commercial honesty.** Published pricing and SLA, a clear refund policy and no pressure tactics.

### 7.10 Go-to-market and brand distinctness

**Messaging.** Avoid Delve's lexicon: "busywork", "by Friday", "compliance in days", "partner, not a platform". Suggested lines:

- "See your compliance. Prove every claim."
- "Audit-ready, verifiably."
- "Agents that show their work."

The voice rules in `DESIGN.md` (precise, calm, no alarmism, never promise certification) already set Visua apart from Delve's urgency-driven copy.

**Visual identity.** Visua's "Deep-night observatory" (Observatory Blue, Aurora Violet reserved for AI) is already distinct from Delve's teal, black and orange gradients and flat SaaS mockups. Keep it.

**Wedge offers.**

- **Integrity re-baseline** for teams whose current reports face buyer scrutiny. Import (OSCAL, CSV or exports), re-verify evidence, flag template-derived or unsupported statements, and produce a gap plan for a re-audit with a verified auditor.
- **Maturity on-ramp** for first-timers. CSF 2.0 Tier 1 → 2 builds toward SOC 2 without shortcuts.
- **Federal path** for growth-stage teams: SOC 2 → 800-53 Moderate → FedRAMP or GovRAMP readiness, in OSCAL.

**Communications risk.** When referring to Delve, stick to documented public facts, and do not repeat allegations as fact. Lead with Visua's positive guarantees, not attacks.

### 7.11 Top 8 differentiation opportunities, ranked

1. **Verifiable-by-design compliance.** Evidence provenance (source, hash, time, collector), independence guardrails, a verified auditor directory and "never promise a pass". This turns the post-Delve skepticism into Visua's moat.
2. **Transparent agents.** Flight recorders, citations to official framework text, human approval before any change to compliance state, and reversible runs.
3. **The 3D Observatory with a 2D twin.** Scope, status, gaps (current against target maturity), evidence freshness and agent activity visible together, at full-catalog scale. The category's UIs, Delve's included, stop at progress bars.
4. **Crosswalk Nexus.** Cited crosswalks typed per NIST IR 8477, across CSF 2.0, SOC 2, SP 800-53 and SP 800-171, showing real reuse and residual gaps. Mapping is never treated as evidence.
5. **NIST-first depth plus OSCAL-native data.** CSF 2.0 → SOC 2 → RMF/800-53 → FedRAMP, GovRAMP and CMMC, with SSP, SAR and POA&M import and export, built on the corpus Visua already has.
6. **Maturity-adaptive guidance.** CSF Profiles and Tiers, Quick-Start Guides, novice and expert modes, and justified "Not applicable" decisions. Right-sizing without pre-filled evidence.
7. **Claim-consistency checking.** An agent that blocks policy, trust-center or questionnaire statements not backed by evidence. This addresses Delve's alleged failure mode directly.
8. **Radical commercial and technical honesty.** A published coverage matrix and integration automation-depth labels, transparent pricing, SLA and refunds, license-clean open-source use, and a factual migration path for teams re-baselining after other platforms.

### 7.12 Risks for Visua

- **3D can look like a gimmick.** Prove task-speed gains, keep 2D parity and meet accessibility targets.
- **AI mistakes on framework text.** Enforce citation-or-silence, add retrieval evaluations and keep human review queues.
- **Licensing.** The ISO, AICPA and PCI text in the corpus must be handled carefully (see §7.7).
- **Auditor adoption.** Auditor adoption of OSCAL and of Visua workspaces will vary. Also export PDF and CSV.
- **Speed perception.** A verification-first product may look slower in demos than "SOC 2 by Friday". Counter this with agent pre-collection on day one and a live Readiness Terrain.
- **Reputation risk of the category.** Buyers may now distrust all "AI compliance". Visua's public evidence of its own security and its independence guarantees must come first in sales.

---

## 8. Sources

All URLs were accessed on 2026-09-26 unless another date is noted. "Wayback" means an Internet Archive snapshot; the timestamp is in the URL.

### Delve primary sources, live

- https://www.delve.co/sitemap.xml (redirects to https://delve.co/sitemap.xml)
- https://delve.co/robots.txt
- https://delve.co/
- https://delve.co/product/framework/soc-2
- https://delve.co/product/framework/hipaa
- https://delve.co/product/framework/gdpr
- https://delve.co/product/framework/iso-27001
- https://delve.co/product/framework/iso-42001
- https://delve.co/product/framework/pci-dss
- https://delve.co/product/framework/cmmc
- https://delve.co/product/company/startup
- https://delve.co/product/company/midmarket
- https://delve.co/product/company/enterprise
- https://delve.co/competitors
- https://delve.co/partnership
- https://delve.co/referral
- https://delve.co/book-demo
- https://delve.co/deals/yc
- https://delve.co/press
- https://delve.co/careers (embeds https://jobs.ashbyhq.com/delve/embed; the Ashby board API returned no public board)
- https://delve.co/blogs
- https://delve.co/privacy-policy
- https://delve.co/services-license-agreement
- https://delve.co/services-license-agreement-r9-25
- https://delve.co/demo-404
- https://delve.co/demo-book/superbowllxpromo
- https://delve.co/blog/series-a
- https://delve.co/blog/inside-delve-trusted-compliance-process
- https://delve.co/blog/response-to-misleading-claims
- https://delve.co/blog/delve-announces-changes-and-new-customer-support-measures
- https://delve.co/blog/delve-sets-the-record-straight-on-anonymous-attacks
- https://delve.co/blog/get-hitrust-ready-with-delve-and-comsec
- https://delve.co/blog/what-security-questionnaires-should-ask-ai-vendors
- https://delve.co/blog/github-configuration-checklist-for-soc-2-compliance
- https://delve.co/blog/soc-2-vs-iso-27001
- https://delve.co/blog/what-is-a-soc-2-report
- https://delve.co/blog/pci-compliance-process
- https://delve.co/blog/mcp-future-of-ai-data-strategy
- https://delve.co/blog/how-to-build-and-run-a-billboard-campaign
- https://delve.co/blog/hipaa-compliance-guide-tips
- https://delve.co/learn/cmmc/cmmc-compliance-checklist
- https://delve.co/learn/cmmc/cmmc-documentation-requirements
- https://delve.co/learn/cmmc/cmmc-guide-for-small-businesses
- https://delve.co/learn/cmmc/cmmc-level-2-requirements
- https://delve.co/learn/cmmc/cmmc-level1-vs-level-2-vs-level-3
- https://delve.co/learn/cmmc/consultant-requirements-for-cmmc-certification
- https://delve.co/learn/grc/ai-transforming-grc-compliance
- https://delve.co/learn/soc2/soc2-audit-readiness-guide
- https://trust.delve.co/delve-compliance (Vercel checkpoint, HTTP 429; not readable)
- https://app.delve.co/login (Vercel checkpoint, HTTP 429; not readable)
- Marketing images used for UX observations:
  - https://cdn.prod.website-files.com/686c116534831e8f603168b9/69140436bf1f2bd1a100c769_ai-native_1.webp
  - https://cdn.prod.website-files.com/686c116534831e8f603168b9/687f5e035910007d87c56116_ai-native_2.webp
  - https://cdn.prod.website-files.com/686c116534831e8f603168b9/687f5e0243bc55c7d7b8a84f_ai-native_3.webp
  - https://cdn.prod.website-files.com/686c116534831e8f603168b9/687f5e02cbe23e5141dccc6a_ai-native_5.webp
  - https://cdn.prod.website-files.com/686c116534831e8f603168b9/687212891048141aca471e9c_7d2afd0e89015ed94c9e3241d3b38974_Illustration%20%281%29.webp
  - https://cdn.prod.website-files.com/686c116534831e8f603168b9/68721236f5ae9dcebc87bfa8_734901ad289eda2d7efbb950db2d29f1_Illustration.webp
  - https://cdn.prod.website-files.com/686c116534831e8f603168b9/687f6ceb9622d0be6826e9b8_a26ce102f39480207e9a5ecced5dd567_compliance-graph.webp
  - https://cdn.prod.website-files.com/686c116534831e8f603168b9/687ea555205b7ad056feb7f3_Turn%20compliance%20from%20reactive%20to%20proactive.webp
  - https://cdn.prod.website-files.com/686c116534831e8f603168b9/687ea342c0029ef8cf8c95c0_Fly%20through%20security%20reviews.webp
  - https://cdn.prod.website-files.com/686c194bb54b92e3b680d9f9/696559c9e7647e57d958143b_DelveComplianceProcess_StarttoFinish.webp
  - https://cdn.prod.website-files.com/686c194bb54b92e3b680d9f9/69653c433697f0adf34644e8_Delve%E2%80%99s%20Verification%20Layers%20Performed%20with%20Every%20Customer.webp
  - https://cdn.prod.website-files.com/686c194bb54b92e3b680d9f9/69617dd2373ba37e23ce97e1_What%20Our%20CS%20Team%20Checks%20Before%20Your%20Audit.webp

### Delve primary sources, archived (Wayback)

- https://web.archive.org/cdx/search/cdx?url=delve.co/* (enumeration of historical paths)
- https://web.archive.org/web/20250115063732/https://delve.co/
- https://web.archive.org/web/20250509001907/https://delve.co/
- https://web.archive.org/web/20260214184416/https://delve.co/
- https://web.archive.org/web/20260314044757/https://delve.co/
- https://web.archive.org/web/20260421073018/https://delve.co/
- https://web.archive.org/web/20260718073603/https://delve.co/
- https://web.archive.org/web/20250813190609/https://delve.co/blog/how-every-delve-customer-passes-their-soc-2-audit
- https://web.archive.org/web/20250813200949/https://delve.co/product/platform/agentic-ai-compliance
- https://web.archive.org/web/20250813195205/https://delve.co/product/platform/ai-code-scanning
- https://web.archive.org/web/20250813203311/https://delve.co/product/platform/ai-infrastructure-scanning
- https://web.archive.org/web/20250813195007/https://delve.co/product/platform/ai-policy-assistant
- https://web.archive.org/web/20250813191745/https://delve.co/product/platform/ai-security-questionnaire-automation
- https://web.archive.org/web/20250813192807/https://delve.co/product/platform/trust-center
- https://web.archive.org/web/20250813201027/https://delve.co/case-study
- https://web.archive.org/web/20250414215726/https://delve.co/case-study/11x-soc2-compliance-success-delve
- https://web.archive.org/web/20250414215726/https://delve.co/case-study/bland-soc2-compliance-delve-success
- https://web.archive.org/web/20250414215728/https://delve.co/case-study/remi-soc2-compliance-enterprise-growth
- https://web.archive.org/web/20250813203448/https://delve.co/case-study/hockeystack
- https://web.archive.org/web/20250813203628/https://delve.co/case-study/lovable
- https://web.archive.org/web/20250813185108/https://delve.co/case-study/wisprflow
- https://web.archive.org/web/20260215143607/https://delve.co/case-study/knowtex
- https://web.archive.org/web/20260321031126/https://delve.co/rsac
- https://web.archive.org/web/20260301045026/https://www.ycombinator.com/companies/delve
- https://web.archive.org/cdx/search/cdx?url=ycombinator.com/companies/delve (200 until 2026-03-01; 404 from 2026-04-04)
- https://web.archive.org/web/20251105184310/https://www.g2.com/products/delve-delve/reviews

### Listings written by Delve

- https://www.ycombinator.com/companies/delve (404 on 2026-09-26)
- https://www.ycombinator.com/launches/KG8-delve-your-fast-track-to-hipaa-compliance
- https://www.ycombinator.com/launches/Mgw-delve-ai-that-helps-companies-automate-hours-of-compliance-busywork
- https://news.ycombinator.com/item?id=39513054 (Launch HN, 2024-02-26)
- https://aws.amazon.com/marketplace/pp/prodview-nrt542cwf6epa
- https://www.youtube.com/feeds/videos.xml?channel_id=UCZjUvdQOPFt4az2303KDFoA

### Funding and company press

- https://techcrunch.com/2025/07/22/21-year-old-mit-dropouts-raise-32m-at-300m-valuation-led-by-insight/
- https://www.prnewswire.com/news-releases/delve-raises-32m-series-a-to-build-ai-agents-for-compliance-302510121.html
- https://www.webwire.com/ViewPressRel.asp?aId=333210
- https://www.businessinsider.com/ai-agent-compliance-startup-delve-seed-funding-2025-1 (listed on delve.co/press; not directly accessible)
- https://www.insightpartners.com/ideas/scaling-ai-native-compliance-how-delve-is-saving-companies-time-and-money-on-compliance-busywork/
- https://founderledsalesstories.substack.com/p/delve-sell-to-your-uncle-and-other-tips
- https://thetech.com/2026/04/09/delve-fraud-reports
- https://www.forbes.com/profile/delve/ (search-result reference)
- https://tracxn.com/d/companies/delve/__8DGgUndfx0unHfHO1FRsSJaTSSmJqCUPD-qjQazUYRA (HTTP 403; headcount via search snippet)
- https://getlatka.com/companies/delve.co (search-result reference; low confidence)
- https://startups.rip/company/delve

### Controversy: allegations, reporting and responses

- https://deepdelver.substack.com/p/delve-fake-compliance-as-a-service
- https://deepdelver.substack.com/p/delve-fake-compliance-as-a-service-61d
- https://deepdelver.substack.com/p/delve-fake-compliance-as-a-service-98a
- https://deepdelver.substack.com/p/delve-hawaii-edition-part-ii-post
- https://deepdelver.substack.com/api/v1/archive?sort=new&limit=50 (post enumeration)
- https://techcrunch.com/2026/03/22/delve-accused-of-misleading-customers-with-fake-compliance/
- https://techcrunch.com/2026/03/23/insight-partners-scrubs-investment-post-amid-fake-compliance-allegations/
- https://techcrunch.com/2026/03/26/delve-did-the-security-compliance-on-litellm-an-ai-project-hit-by-malware/
- https://techcrunch.com/2026/03/30/popular-ai-gateway-startup-litellm-ditches-controversial-startup-delve/
- https://techcrunch.com/2026/04/01/the-reputation-of-troubled-yc-startup-delve-has-gotten-even-worse/
- https://techcrunch.com/2026/04/04/embattled-startup-delve-has-parted-ways-with-y-combinator/
- https://techcrunch.com/2026/04/09/after-data-breach-10b-valued-startup-mercor-is-having-a-month/
- https://x.com/kocalars/status/2040262537166618887
- https://x.com/Lovable/status/2035040341536251943
- https://x.com/amitpgupta/status/2035584092239179966
- https://news.ycombinator.com/item?id=47444319
- https://news.ycombinator.com/item?id=47481729
- https://security.redeux.ai/research/delve-compliance-posture
- https://www.iansresearch.com/resources/all-blogs/post/security-blog/2026/04/19/delve-allegations-expose-weak-points-in-modern-compliance (redirects to https://www.ians.com/news/delve-allegations-expose-weak-points-in-modern-compliance)
- https://www.intentionalcyber.com/blog/trust-is-dead-on-delves-fake-compliance-accusations
- https://legalclarity.org/delve-lawsuit-and-scandal-fake-compliance-reports-exposed/
- https://dockets.justia.com/docket/california/candce/3:2026cv03362/468321 (search-result reference; HTTP 403)
- https://soc2auditors.org/software/delve/

### Reviews and market (competitor sources marked)

- https://www.g2.com/products/delve-delve/reviews (HTTP 403; see the Wayback snapshot above)
- https://www.g2.com/sellers/delve-7f4853c3-d5f3-426c-a6ff-2fc37d20a2ce (search-result reference)
- https://www.capterra.com/p/196428/Delve/reviews/ (a different product; excluded)
- https://www.vanta.com/resources/vanta-vs-drata-vs-delve (competitor)
- https://www.complyjet.com/blog/delve-pricing (competitor)
- https://soc2vendors.com/vendors/delve/
- https://www.eesel.ai/blog/delve-reviews (competitor)

### Framework context

- https://govramp.org/blog/stateramp-announces-rebrand-to-govramp-reflecting-mission-to-unite-public-and-private-sectors-in-advancing-cybersecurity/

### Visua internal references

- `/home/user/visua/DESIGN.md`
- `/home/user/visua/corpus/nist-csf-2.0/STRUCTURE.md` and `manifest.json`
- `/home/user/visua/corpus/nist-rmf/STRUCTURE.md`
