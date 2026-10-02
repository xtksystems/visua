# Full Visua application review

Visua has broad framework coverage and a working visual workspace. The next
release needs stronger evidence integrity and reliable team workflows before
a hosted pilot. The recommended development phase is
[trustworthy evidence operations](../development-phase-2.md).

This review covers commit `1dc5ed1` on `feat/light-workspace-design` on
October 2, 2026. Application source is unchanged from visualization commit
`5c497c3`; `1dc5ed1` adds the existing Docker setup and project context.
The review request authorizes analysis and planning, not implementation.

## Coverage and method

Three fresh Claude Opus 5.5 reviews examined security and operations, product
workflows, and agents and compliance data. The orchestrate runner verified the
existing Claude Max subscription before every call. All three CLI usage
reports name `claude-opus-5-5`; this is routing evidence, not independent
attestation of the provider's backend.

The packets contain all 129 source files under the server, web, core, agents,
frameworks, and design source directories, plus relevant tests, documentation,
and configuration: 168 distinct input files. Reviewers received numbered
source text, with no tools, repository access, or inherited conversation.
Codex reconciled their conclusions against source and local reproductions.
The [run ledger](../../.codex-context/runs/app-review-20261002/plan.json)
records packet hashes, model reports, coverage, and acceptance artifacts.

The review includes local behavior, not production operational measurements.
Corpus hash verification establishes retrieved-file integrity, not the current
legal status of a law or draft. Generated corpus text and official publication
wording were not independently revalidated.

## Verification

The existing suite passes while the focused checks below expose gaps in its
coverage. The
[verification summary](../../.codex-context/runs/app-review-20261002/evidence/verification-summary.json)
records the command, revision, environment, and outcome.

| Check | Result |
| --- | --- |
| Full `pnpm check` | Exit 0; all seven lanes passed in 427 seconds |
| Typecheck | Passed |
| SQLite | 214 passed, 2 skipped |
| PostgreSQL | 216 passed |
| Playwright | 23 passed |
| Licensing, corpus hashes, design lint | Passed |
| Additional browser sweep | 48 checks across 1440×900 and 390×844; no page, console, request, or document-overflow errors |
| Deployment source comparison | All 131 application source and generated-token files checked match the review snapshot |

Browser evidence includes 16 screenshots, with 10 inspected, and read-only
interaction checks. Every attempted product mutation in the focused browser
reproductions was intercepted and aborted. The running Docker service and its
persistent database were preserved. Browser evidence is in the
[browser summary](../../.codex-context/runs/app-review-20261002/evidence/browser-summary.json);
the source comparison is recorded
[separately](../../.codex-context/runs/app-review-20261002/evidence/deployed-source.json).
Software-rendered WebGL checks do not establish hardware GPU performance.

## Confirmed release blockers

Resolve these before exposing a shared hosted pilot. Severity reflects the
specific deployment or actor described, not the current loopback-only Compose
deployment.

| ID | Severity | Trigger and consequence | Evidence and next action |
| --- | --- | --- | --- |
| R01 | High | A contributor extends or relinks accepted evidence. Its accepted status and reviewer survive; expired evidence becomes valid and can make a newly linked requirement verified without a new review. Invalid date strings also remain valid. | [Route](../../apps/server/src/app.ts#L520), [mutation](../../apps/server/src/services/visua.ts#L1059), [status](../../packages/core/src/status.ts#L19). Reproduced with in-process API calls and memory SQLite. Bind approval to artifact hash, links, and validity; re-review changes; reject invalid dates. |
| R02 | High | A tenant admin configures a connector for an internal target or arbitrary server path. Web posture reaches loopback and records response metadata; repository hygiene scans operator-selected filesystem paths without confinement. | [Web connector](../../apps/server/src/connectors/web-posture.ts#L18), [repository connector](../../apps/server/src/connectors/repo-scan.ts#L56). Loopback HTTP access reproduced against an ephemeral fixture. Guard resolved addresses and redirects; confine paths and resource use. No cloud-metadata exfiltration was attempted. |
| R03 | High | Fresh production startup seeds owned demo organizations before bootstrap. The configured bootstrap owner receives no membership. | [Startup](../../apps/server/src/index.ts#L30), [bootstrap](../../apps/server/src/auth/service.ts#L829). Identity-seeding order reproduced in memory: two demo organizations, zero bootstrap memberships. Make demo seeding explicit in production and test first-owner sign-in through a mock IdP. |
| R04 | High when exposed | With no explicit production/auth environment, sign-in defaults to passwordless developer mode. The server's omitted hostname binds all interfaces; `pnpm start` does not set production mode. | [Config](../../apps/server/src/auth/config.ts#L60), [entry point](../../apps/server/src/index.ts#L57), [start script](../../apps/server/package.json). Installed Hono adapter reproduced binding `::`. Require safe auth configuration and loopback development binding. Compose already restricts its published port to loopback. |
| R05 | High | Switching among cached inspector selections preserves a previous owner's uncontrolled input. Blurring the unchanged field attempts an owner write to the wrong requirement. | [Assessment](../../apps/web/src/components/inspector/Inspector.tsx#L301). Browser A→B→A→B values were A,B,B,B; blurring cached A attempted `PATCH A {owner: B}`. Key/reset selection state and save explicitly. |

API and connector reproductions are in
[reproductions.json](../../.codex-context/runs/app-review-20261002/evidence/reproductions.json),
startup checks in
[production-bootstrap.json](../../.codex-context/runs/app-review-20261002/evidence/production-bootstrap.json),
and inspector cases in
[browser-inspector-cases.json](../../.codex-context/runs/app-review-20261002/evidence/browser-inspector-cases.json).
These are local fixtures, not production intrusion tests.

## Workflow and reliability findings

The remaining defects affect a real team's ability to use and trust the
workspace. Source-derived findings are marked below; they are not runtime
reproductions unless stated.

| ID | Priority | Finding and evidence | Required behavior |
| --- | --- | --- | --- |
| R06 | P1 | Viewer sessions have enabled Quick add, Generate plan, Plan with agent, Add connector, Collect with agent, and Run controls. Browser-confirmed on Plan and Evidence. Server authorization still refuses writes. [Evidence](../../.codex-context/runs/app-review-20261002/evidence/browser-viewer-controls.json). | Gate every action by capability and show mutation failures. Retain server checks. |
| R07 | P1 | Escape on the scope dialog's Cancel button closes the dialog and changes selection to the parent. Browser-confirmed. Outline rows lack managed focus; dialog and tabs lack complete focus behavior. [Keyboard handler](../../apps/web/src/pages/ObservatoryPage.tsx#L174), [UI primitives](../../apps/web/src/components/ui/index.tsx#L252). | Scope keyboard shortcuts to their surface; implement outline focus, dialog focus restoration, and keyboard tabs. |
| R08 | P1 | SSE invalidates id-keyed queries while many screens use route-slug keys. New workspace ids and slugs differ. Reconnect also lacks an explicit resync. [Shell](../../apps/web/src/components/shell/Shell.tsx#L421), [events](../../apps/web/src/lib/events.ts#L13), [queries](../../apps/web/src/lib/queries.ts#L25). Source-derived. | Use canonical query identity and refetch after event gaps. |
| R09 | P1 | Revoked members retain already-open SSE streams; authorization runs at connection time. Whole entity payloads and an unbounded queue add exposure. [Stream route](../../apps/server/src/app.ts#L612). Source-derived. | Recheck access, close revoked streams, bound queues, and emit identifiers/resync signals. |
| R10 | P1 | Runs use process-local abort controllers with no durable lease or startup recovery. Cross-instance cancellation can leave execution active; in-flight tools can propose after cancellation. [Run lifecycle](../../apps/server/src/services/visua.ts#L1344). Source-derived. | Persist run ownership, reconcile interruption, reject proposals from cancelled runs, and bound concurrency. |
| R11 | P1 for multiple instances | Replacing an SSO provider clears only the handling process's OIDC cache. Another instance can retain the old provider until its one-hour cache expires. Disabled/deleted connections are checked immediately. [OIDC cache](../../apps/server/src/auth/service.ts#L664). Source-derived. | Version cached provider configuration and validate it against persisted settings. |
| R12 | P1 | Corpus citations accept model-provided quote/page values when the document id exists, without verifying the passage. Some proposal types carry no citations despite broad documentation claims. [Citation normalization](../../packages/agents/src/tools.ts#L52). Source-derived. | Reference verified chunk identities and record claim/citation provenance. |
| R13 | P1 before corpus refresh | Obligation node ids depend on array position. Inserting or reordering a source obligation can attach existing evidence and decisions to different text. [Ingestion](../../packages/frameworks/src/ingest/state-laws.ts#L173). Source-derived. | Freeze source-obligation-to-published-code mappings and test insertion/reordering stability. |
| R14 | P1 | Trust-center monitoring deduplicates by check id across connectors, so a later pass can hide another target's failure. Its editable headline also permits unsupported claims beside a computed-facts promise. [Public endpoint](../../apps/server/src/app.ts#L675), [headline](../../apps/web/src/pages/ReportsPage.tsx#L213). Source-derived. | Identify target plus check, label measure basis/time, and restrict or explicitly qualify public statements. |
| R15 | P1 | Evidence visuals count accepted items without checking expiry. Exports map level zero to planned, omit explicit tailoring rationale, and do not neutralize spreadsheet formulas. [State bundle](../../apps/server/src/services/views.ts#L154), [exports](../../apps/server/src/services/exports.ts#L10). Source-derived. | Share effective-state logic across views/exports; test spreadsheet safety and export fidelity. OSCAL conformance still needs official schema validation. |
| R16 | P2 | Requirement tags often change hidden selection without navigating; approval links open Runs instead of Inbox; transient load errors redirect or remain loading. [Code tags](../../apps/web/src/components/ui/index.tsx#L126), [Shell](../../apps/web/src/components/shell/Shell.tsx#L449), [Landing](../../apps/web/src/App.tsx#L30). Source-derived. | Make traceability links navigable, preserve failed deep links with retry, and link to the exact run/inbox. |
| R17 | P2 | Unmatched policy codes fall back to the first template, AI governance, including unrelated SP 800-53 controls. [Template selection](../../packages/agents/src/policies.ts#L203). Source-derived. | Select an explicit appropriate fallback or ask for a template; avoid claiming mappings satisfy other requirements. |

## Policy choices and qualified findings

The independent review raised several concerns that need narrower treatment.
The source adjudications are retained with the raw Opus results rather than
silently converting every recommendation into a defect.

- Agent-generated narratives can become accepted evidence after proposal
  approval or explicitly granted evidence autonomy. This is documented opt-in
  behavior, not an authorization bypass. Artifact origin, kind, hashing, and
  review semantics still need stronger server contracts. Approval edits can
  remove a check reference and switch to narrative evidence; this requires an
  approver but weakens provenance. Shipped tools cannot emit the reported
  `set-rmf`/ATO or `review-evidence` scenarios.
- Person-run connectors intentionally auto-file passing checks as accepted
  evidence. Presence heuristics have limited assurance and need honest labels;
  the contributor route itself does not demonstrate a capability bypass.
- An expired item can keep a requirement at risk despite newer valid evidence.
  This follows today's documented status precedence. Introduce explicit
  supersession and distinguish rejected/pending items before changing it.
- Weak crosswalk relationships can propose level 3 with medium confidence.
  That is overconfident projection, not proof that mappings are stored as
  evidence. Family-scale interpretation, authority labels, and autonomy
  treatment need review.
- Organization API tokens deliberately follow their assigned role, can outlive
  their creator, and are separate from session Require SSO. Admin tokens
  cannot manage owners or change provider trust. Tightening expiry and token
  scope is a policy decision, not a newly demonstrated tenant escape.
- Authorized workspace deletion removes its chain. Independent checkpoints
  are needed to detect database-level suffix truncation; no external anchor
  currently exists. Plan retention, audit payload hashes, and export manifests
  without claiming today's chain detects every form of tampering.
- Licensed corpus access is installation-wide. A hosted multi-organization
  deployment needs an explicit entitlement model. Separately, task licensing
  suppression based on current requirement links can lose original provenance
  after relinking. This is a conditional text-routing issue, not a legal
  conclusion about redistribution rights.
- Hosted rate/body limits, evidence metadata-only reads, and explicit
  organization selection need work. Scale-related failure predictions have
  not been load-tested. PostgreSQL row-level security is defense in depth;
  this review found no confirmed cross-tenant workspace route escape.

## What to preserve

The current product already has useful foundations: tenant and capability
checks, transactional mutations and chained audit records, cited framework
structure, distinct threat coverage, proposal approval, licensing gates,
responsive navigation, reduced-motion support, and demand-rendered 3D scenes.
The phase plan strengthens these foundations and completes one usable team
workflow. Additional frameworks, identity protocols, and connector breadth
follow the evidence and hosting gates.

## Next action

Use the [phase plan](../development-phase-2.md) to start its first bounded work
package. Confirmed defects remain unfixed by this review. Application Claude
API mode, production IdP behavior, load limits, official OSCAL schema
conformance, corpus currency, and live user usability remain unverified.
