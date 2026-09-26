# Visua roadmap

Visua deepens one framework at a time, in order of increasing complexity. Each framework
ships only when it has real depth: official structure, a local corpus, crosswalks with
authority labels, evidence, agents and exports. The coverage claim for each framework is
generated from the product, not written by marketing.

## Shipped in v0.1

- **NIST CSF 2.0 (flagship).**
  - Full Core with Implementation Examples and CSWP 29 page citations.
  - Organizational Profiles and the official CSV template.
  - Tier self-assessment, maturity-adaptive targets and priorities.
  - 3D Observatory with a 2D twin.
- **SOC 2 (TSC 2017, points of focus revised 2022).**
  - Scoping by Trust Services Category, Type 1 and Type 2, the observation window.
  - The DC 200 checklist, drafted from recorded facts, and the PBC list.
  - License-aware: Visua skeleton by default, a local licensed overlay when available.
- **NIST RMF and SP 800-53 Rev. 5.2.0.**
  - The seven-step lifecycle, FIPS 199 categorization, 800-53B baselines (including
    PRIVACY), and tailoring with rationale.
  - The authorization record.
  - SP 800-53A objectives.
  - OSCAL SSP and POA&M export.
- **NIST AI RMF 1.0 with the Generative AI Profile.**
  - 72 outcomes with page citations to AI 100-1, 460 Playbook suggested actions as
    checklists, and the 12 GAI risks and 212 actions of NIST AI 600-1.
  - An AI system inventory, readiness per function, GAI risk coverage, an AI RMF
    profile export and an AI governance policy template.
- **Crosswalk Nexus.** 2,188 authoritative mappings with authority labels; composed and
  editorial sets are flagged.
- **Agents.** Eight agents on Claude or offline playbooks, with a flight recorder,
  proposals, autonomy per change type, and citations to the local corpus.
- **Integrity.**
  - A hash-chained audit trail.
  - "Not applicable" requires a rationale, and scope changes preserve it.
  - Evidence provenance and freshness.
  - A computed-facts trust center.

## Next: platform foundations

1. **Identity and tenancy.** OIDC/SAML SSO, roles (owner, practitioner, reviewer,
   auditor read-only), per-tenant isolation, and scoped API tokens. This is the
   prerequisite for any hosted deployment.
2. **Postgres storage** with row-level tenancy and object storage for evidence files
   (content-addressed by SHA-256). SQLite stays the local and single-user mode.
3. **Connector depth.** Label each connector by automation depth (API-automated,
   agent-assisted, manual):
   - AWS (Config, IAM, CloudTrail, KMS), Azure and GCP
   - Okta and Entra ID
   - GitHub and GitLab
   - Google Workspace and Microsoft 365
   - Jamf, Intune and Kandji
   - HRIS (onboarding and offboarding evidence)
4. **Claim-consistency agent.** Block any policy, trust-center or questionnaire
   statement that evidence does not support.
5. **Questionnaire agent** (SIG, CAIQ, custom). Every answer cites evidence and policy
   clauses.
6. **Time scrubber.** Replay status and evidence freshness across a SOC 2 Type 2
   observation window in the Observatory.
7. **Evidence lineage trace.** Follow one chain in 3D, in both directions: system →
   connector or agent run → evidence (hash) → requirement → framework → trust-center
   statement.
8. **SOC 2 extraction tooling in the repository.** A Node extractor (unpdf) that
   rebuilds the structured TSC and DC 200 files from an installation's own licensed
   PDFs.
9. **Auditor workspace.** Read-only, logged access. OSCAL assessment-plan and
   assessment-results import and export. Visua never drafts auditor conclusions.

## Next frameworks

Each framework comes with its own local corpus, graph, crosswalks and tests. There
are two tracks. The AI governance track was pulled forward in September 2026 when the
NIST AI RMF became a requirement.

### AI governance track (after the NIST AI RMF and the Generative AI Profile)

Order and reasoning come from `docs/research/ai-governance-landscape.md` (status as of
2026-09-26, with sources).

| # | Framework | Model it as | Why | Corpus and licensing |
|---|---|---|---|---|
| 1 | ISO/IEC 42001:2023 (AI management system), with ISO/IEC 42005 and 23894 as references | Certifiable framework: clauses 4–10 plus 38 Annex A controls, Statement of Applicability | The strongest buyer pull: accredited certification, required by some large buyers of AI services and by CSA STAR for AI Level 2. A crosswalk to the AI RMF is published on NIST's site. Shares its structure with ISO 27001. | © ISO: Visua skeleton with its own titles; verbatim text only from the customer's licensed copy, withheld from language models by default (the SOC 2 pattern) |
| 2 | EU AI Act, as amended by Regulation (EU) 2026/1744 | Regulatory obligations with deadlines, by role (provider, deployer…) and risk class | Binding law. Upcoming dates: 2 Dec 2026, 2 Aug 2027, 2 Dec 2027 (Annex III high-risk) and 2 Aug 2028 (Annex I) | EUR-Lex (reusable with attribution) |
| 3 | NIST Cyber AI Profile (NIST IR 8596) and the SP 800-53 control overlays for AI (COSAiS) | Profiles and overlays on the CSF 2.0 and SP 800-53 graphs Visua already ships, labeled as drafts | Brings AI into the flagship frameworks at no licensing cost; the federal path | NIST (public domain), drafts only so far |
| 4 | U.S. state AI obligations (Texas, California, Colorado, New York, NYC, Illinois) | A light obligations pack with deadlines | Texas TRAIGA makes substantial compliance with the NIST AI RMF Generative AI Profile an affirmative defense; the California and Colorado dates fall in 2026–2028. Volatile under federal preemption efforts. | Public legislative texts |
| 5 | MITRE ATLAS and the OWASP Top 10 for LLM and agentic applications (CSA AI Controls Matrix optional) | Threat lenses mapped to controls, not frameworks | Open licenses and machine-readable data; demand for agentic AI security | Apache-2.0 / CC licenses; CSA AICM needs a CSA license |

All of these reuse the same primitives, which the AI RMF work puts in place: the AI
system inventory, the organization's role, the system's risk tier, impact assessments,
and lifecycle evidence (evaluations, red-team results, human-oversight records,
incidents). Next platform work for this track: AI impact assessments (AI RMF MAP,
ISO/IEC 42005) and an obligation model with deadlines.

### Security and privacy track

| Framework | Why next | Corpus and licensing |
|---|---|---|
| NIST SP 800-171 Rev. 3 / CMMC Level 2 | The defense supply chain; reuses 800-53 work. Confirm which revision CMMC requires (currently Rev. 2). | NIST (public domain); DoD CMMC documents (public) |
| FedRAMP (Low / Moderate / High, 20x) | The federal path from the RMF work already in place | GSA/FedRAMP baselines (public), OSCAL |
| HIPAA Security Rule | Healthcare, which is common in onboarding | 45 CFR Part 164 (public domain) |
| ISO/IEC 27001:2022 / 27002 | International certification | © ISO: IDs and short titles only; full text from the customer's licensed copy |
| PCI DSS v4.0.1 | Payments | © PCI SSC: IDs only; licensed text overlay |
| NIST Privacy Framework, GDPR | Privacy programs | NIST (public domain); EUR-Lex (reusable) |

## Research-driven principles (from the Delve analysis)

Match the value customers pay for: speed to readiness, less busywork, sales enablement
and continuous monitoring. Invert the trust model behind it:

- Readiness is computed from evidence and never promises a pass.
- Every framework statement is cited, and every change is approved or covered by
  explicitly granted autonomy.
- Mappings are never evidence.
- Integrations are labeled with their real automation depth.
- The trust center publishes only facts that evidence backs.

See `docs/research/delve-competitive-analysis.md` §7.
