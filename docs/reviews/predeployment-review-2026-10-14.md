# Predeployment review — October 14, 2026

**Recommendation: hold live deployment.** The application has strong tested
foundations, but this review identified eleven supported issues, an incomplete
independent security pass, and a failed browser check. Complete remediation and
the real-provider gates in the [deployment plan](../live-deployment-plan.md)
before admitting live evidence. This report describes source and isolated local
checks, not an assessment of your Google Workspace or Cloudflare accounts.

The deployment target subsequently changed to XTK Systems' office infrastructure
for three users. The [current plan](../live-deployment-plan.md) supersedes the
Google Cloud hosting proposal reviewed in this report. Application findings and
the incomplete independent security assessment remain open.

## Scope and independence

The reviewed revision is `cb438d1083e9ae3e2a38dd8e5d7dba4c778b2e89` on
`feat/light-workspace-design`. Product source remained unchanged throughout the
review. Six fresh-context native agents were assigned separate lenses; five
returned complete reports. A seventh reviewer completed an independent
[deployment-plan review](../../.codex-context/runs/predeploy-review-20261014/deployment-plan/review.json)
with no supported technical findings; actual provider acceptance remains open.
The [run ledger](../../.codex-context/runs/predeploy-review-20261014/plan.json)
records inputs, hashes, outputs, and acceptance.

| Dimension | Evidence and result |
| --- | --- |
| Identity, authorization, tenant isolation | Independent worker stopped under a platform cybersecurity safety restriction before returning a report. Lead inspected the admission path and route/middleware boundaries; F01 is source-supported, not runtime-reproduced. This is an explicit coverage gap. |
| Evidence, audit, storage, recovery | Independent source review and isolated rollback, bound-review, tenant-file, pinned-bundle, and local recovery fixtures; F04 reproduced. [Report](../../.codex-context/runs/predeploy-review-20261014/integrity/review.json). |
| Agents, connectors, events | Independent source review plus five isolated fixture cases for capacity/retry, cancellation fencing, stream resync/revocation, and licensed task redaction; F05 reproduced. [Report](../../.codex-context/runs/predeploy-review-20261014/automation/review.json). |
| Product, accessibility, frontend performance | Independent journey and query review, isolated browser observations, and eight narrow-viewport page checks; F06/F08 reproduced, F07 source-supported. [Report](../../.codex-context/runs/predeploy-review-20261014/product/review.json). |
| Corpus, licensing, claims, exports | Independent source/metadata/schema-pin review and synthetic service reproductions for F09/F10. [Report](../../.codex-context/runs/predeploy-review-20261014/assurance/review.json). |
| Architecture, capacity, operations | Independent source review and local PostgreSQL wire fixtures for F02/F03; lead repeated them in the deployed Node 22 image. [Report](../../.codex-context/runs/predeploy-review-20261014/operations/review.json). |
| Supply chain and verification | Lead ran full local checks, production/full dependency audits, a bounded credential-format scan, and read-only runtime inspection. [Lead assessment](../../.codex-context/runs/predeploy-review-20261014/lead-review.json). |

Independent reports are evidence, not votes. Findings below retain their actual
confidence and counterevidence. The stopped security worker was not retried or
redirected to another provider. No clean independent security verdict exists.

## Prioritized findings

Severity reflects application impact and prerequisites. The proposed repair
order prioritizes admission and resilience, then consistent decision data and
release packaging. None of these defects was fixed during this review.

| ID | Severity | Finding | Evidence | Release treatment |
| --- | --- | --- | --- | --- |
| F01 | High, conditional | Globally linked identities bypass the proven-domain check when a new organization membership is created through JIT. | Source-supported | Fix and independently review before enabling organization JIT; use explicit members and a verified Internal Google OAuth client for the initial pilot. |
| F02 | Medium | Losing an idle PostgreSQL connection can terminate the application. | Reproduced on Node 26 and deployed Node 22 | Fix before hosted database maintenance/failover is relied on. |
| F03 | Medium | PostgreSQL connection and pool acquisition lack default application deadlines. | Bounded stall reproduced; indefinite continuation inferred from source | Implement deadlines/resource release and rehearse recovery before hosting. |
| F04 | Medium | Inspector can retain verified status after evidence expires within the same hour. | Reproduced | Fix before using inspector values for review decisions. |
| F05 | Medium | Temporary connector overload removes the connector from future agent retries. | Reproduced | Preserve transient retry eligibility; manual Run is the present workaround. |
| F06 | Medium | An open Crosswalk Nexus does not refresh after ordinary external assessment changes. | Reproduced in Chromium | Correct live invalidation and add a second-client regression. |
| F07 | Medium | Monitoring read failures appear as empty monitoring history. | Source-supported | Separate failed/loading reads from genuine empty states. |
| F08 | Low | Opening the mobile navigation drawer leaves forward Tab order in background content. | Reproduced in Chromium | Improve drawer focus ownership before mobile keyboard acceptance. |
| F09 | Medium | Applicable zero-current/zero-target overlay rows count as fully implemented. | Reproduced | Reuse the core completion rule before relying on overlay scores. |
| F10 | Medium | SOC 2 DC9 omits changes on the final observation date. | Reproduced | Correct inclusive calendar-day semantics before period reporting. |
| F11 | Medium | The runtime image includes development packages with known advisories. | Audit and image inventory confirmed; application exploitability not established | Patch/prune, scan the actual release image, and document any accepted remainder. |

### F01: New membership must satisfy target admission policy

In [identity resolution](../../apps/server/src/auth/service.ts), verified email
and proven-domain checks at lines 794–808 run only when the issuer/subject has
no global user link. The separate missing-membership branch at lines 813–818
checks JIT enablement and then adds the user with the connection's default role.
Recognizing an existing identity does not establish membership in a different
organization.

This requires JIT to be enabled and the target provider/client to authenticate
the same issuer/subject. It is not a way to substitute an arbitrary issuer or
avoid OIDC verification. Existing-member continuity after an email change is
intentional; apply admission checks when creating a new membership rather than
breaking that continuity. Add tests for pre-linked users, mismatched/unverified
or lapsed domains, disabled JIT, and legitimate existing members. No runtime
reproduction or complete independent security report was returned in this pass.

### F02–F03: PostgreSQL failure handling

[PostgresDriver](../../apps/server/src/storage/postgres.ts) creates the pool at
line 48 without a pool error listener. Closing a previously successful idle
connection caused an uncaught error and process exit. The event relay has its
own error handling, but it does not protect the main pool. Register a sanitized,
nonthrowing handler and test later-query recovery.

The same pool supplies no connection/acquisition/query deadlines. A mock that
accepted TCP and never completed the PostgreSQL handshake held ten connection
attempts and two waiters at 1.2 seconds. Source shows no application timer to
release them; this short observation does not measure an indefinite outage.
Readiness returns after its own deadline but does not cancel those operations.
Add explicit connection/pool and SQL policies with genuine cancellation or
client destruction, allowing separate migration budgets.

The lead repeated both fixtures in a new read-only, network-isolated container
using the deployed image and Node 22.23.3. It mounted only the fixture and no
application data. [Runtime evidence](../../.codex-context/runs/predeploy-review-20261014/pg-node22.json).

### F04–F07: Freshness, retries, and visible failures

The [hourly score cache](../../apps/server/src/services/visua.ts) at line 933
remains a dependency of [node detail](../../apps/server/src/services/views.ts)
at line 61. A 12:10 inspector read followed by a 12:40 read, with evidence
expiring at 12:30, still showed verified and full coverage. A fresh framework
read correctly showed at-risk and no valid evidence. Use the same fresh clock
and evidence state for both surfaces.

Connector admission refusal is persisted as `status=error` at
`services/visua.ts:1585`, while [agent checks](../../packages/agents/src/tools.ts)
at line 757 select only active connectors. Releasing capacity does not restore
agent eligibility. A manual retry succeeds, limiting the impact. Separate
transient admission from connector health and enabled state.

[Live invalidation](../../apps/web/src/lib/events.ts) at line 86 updates state
and inspector queries without invalidating Nexus/row/threat Crosswalk queries.
An isolated external update changed the fresh API value from 0% to 16.7%, while
the open Nexus stayed at 0%. Local writes and reconnect resync do refresh it;
the newer comparison matrix polls separately. Correct the ordinary external
event path rather than assuming every Crosswalk surface is broken.

[EvidencePage](../../apps/web/src/pages/EvidencePage.tsx) at lines 109–110
discards connector/check query loading and error states and substitutes empty
arrays. Its resulting zero counts/first-results messages cannot distinguish
failed reads. The attempted browser error injection stopped at an incorrect
review-harness selector, so this finding is source-supported only. Preserve
query states, show retry, and label retained cached data when a refresh fails.

### F08–F10: Focus and calculation consistency

The narrow-screen [navigation drawer](../../apps/web/src/components/shell/Shell.tsx)
opens without moving focus from its trigger. Forward Tab reaches background
controls covered by the pointer backdrop; Shift+Tab can reach navigation and
Escape closes it. This is a limited focus-order issue, not a claimed total
keyboard lockout or demonstrated WCAG failure. Move focus to the current/first
destination, restore it on close, and define whether the drawer is modal before
choosing a focus trap.

[Overlay readiness](../../apps/server/src/services/overlays.ts) at line 74 treats
every nonpositive target as complete. An applicable current=0/target=0 fixture
returned 100%, while core scoring returned 0%. Reuse the core per-row completion
rule and preserve any deliberately different aggregation weighting.

[SOC 2 description](../../apps/server/src/services/soc2.ts) at line 37 parses a
date-only observation end as midnight starting that date. An event at noon on
the selected last day was omitted and produced a no-changes statement. Use an
exclusive next-day boundary for inclusive date-only periods, and test both the
final day and next-day exclusion.

### F11: Audit the packages that are actually shipped

The production dependency audit reports zero advisories across 138 dependencies.
The complete audit reports eleven advisories: eight high and three moderate
upstream labels across `ajv@8.17.1`, `fast-uri@3.1.2`, `uuid@8.3.2`, and
`source-map-js@1.2.1`. The [Dockerfile](../../Dockerfile) copies the whole build
workspace, and a read-only image inventory confirms all four are installed.

Inspected imports place Ajv in export tests, ExcelJS/UUID in ingestion, and
source-map tooling in the web build chain. No remotely reachable vulnerable
operation was established. Patch the dependency graph and remove unnecessary
development tools from the runtime image; preserve required runtime files and
public corpus. Do not equate advisory labels with eleven demonstrated remote
application vulnerabilities. An OS/base-image scan is still required for the
future immutable release.

## Verification and limits

The fresh `pnpm check` ran with an allowlisted environment and disposable
PostgreSQL, avoiding inherited live database or provider settings. Types,
licensing guard, corpus hashes, design lint, 944 SQLite tests, and 953 PostgreSQL
tests passed; nine PostgreSQL-only cases were skipped in the SQLite lane.
Playwright passed 151 cases and failed one mobile-history keyboard-scroll case.
The full command exited 1. [Execution record](../../.codex-context/runs/predeploy-review-20261014/check-result.json).

The history failure focused the chart but observed `scrollLeft=0` after
ArrowRight. Its trace and snapshot were retained. A single unchanged-source
[targeted rerun](../../.codex-context/runs/predeploy-review-20261014/history-rerun.json)
failed at the same assertion. This remains a release-verification gap, T01;
the underlying cause was not established. Resolve it before the release gate.

A fresh `pnpm pilot:rehearse --requests 80 --concurrency 4` passed using two
application processes, disposable PostgreSQL and MinIO, and a mock OIDC provider.
It exercised four roles, 167 recorded requirements, a 64 KiB evidence file, and
80 reads at concurrency four. A fresh database/object-prefix restore preserved
reviewed bytes, entity digests, audit, encrypted SSO, and externally pinned
auditor verification. Owned rehearsal resources were cleaned up. These are
local integration and recovery results, not Google Cloud, R2, or hosted-capacity
acceptance. [Rehearsal evidence](../../.codex-context/runs/predeploy-review-20261014/rehearsal-result.json).

The product review's two custom browser scripts also exited nonzero due to
locator mistakes after producing useful observations. Eight 390×844 page visits
showed no document overflow or page exceptions, but these are smoke observations,
not eight complete workflow passes. No screen-reader audit, slow-device profile,
tenant-scale benchmark, or measured Web Vitals result was produced.

The read-only local deployment check found a healthy non-root image at
`0af9520`. The difference from reviewed HEAD consists only of delivery/context
documentation; it contains no application-source change. Health still does not
establish future Google/Cloudflare readiness. No local assessment data or live
service configuration was changed.

Manifest and schema-pin checks support corpus integrity, not current legal
coverage. Installed corpus access is scoped at installation level; entitlement
for separately mounted restricted text remains unverified. The standard image
excludes restricted local material. Keep that default until rights are reviewed.

Hosted TLS/IAM, Google login, R2 behavior, external model behavior, provider
recovery, retention ownership, cost, and pilot acceptance remain open. The
deployment plan records Google Cloud setup and your selected identity/domain
providers, while leaving the domain names, region, budget, and workload explicit.
