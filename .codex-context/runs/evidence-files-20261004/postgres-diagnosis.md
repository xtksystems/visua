# Seed and startup timeout diagnosis

The measured delay comes from real repository scans during demo seeding and
cold startup under concurrent machine load. Baseline source also exceeds the
existing 10-second waits against today's checkout. Evidence content separation
adds 17 small body upserts during a 17-artifact seed. It does not add
transactions or explain the measured scan delays. These findings support
targeted test isolation and waits sized for the work the test actually performs.
They do not
support an SDK or production performance change.

## Scope and source binding

This investigation runs on October 4, 2026, UTC in `/Users/artem/visua`.
It reads source and existing logs and profiles two sequential in-memory seeds.
It measures two fresh loopback startup children and checks two small seed
isolation options.
It changes only this diagnosis file. No full suite, browser run, PostgreSQL
service, customer database, or unrelated process is started or modified.

The failed run is recorded in [the full check log](full-check.log) and bound by
[its source snapshot](full-check-source.json). Temporary source copies preserve
the comparison independently of root's later review fixes:

| Comparison source | Binding |
| --- | --- |
| Baseline server source | `git show 3b50f1b:<path>` for every `apps/server/src` file |
| Profiled current store | `f514139bd12d9bd06e312ebadb71daf68f00851aa46657bfa5de68cae5cdb55e` |
| Profiled current service | `34203d00106d1f2e3d1e3ceb99d344c01bc8d2ee8b849b413e4da5ad6dc1ed4d` |
| Profiled current context | `0a400ee6179dce5e394d63392b2f6a478bd6d6fadbfb7557077f8f504ced8b2d` |

The profiled current hashes match `full-check-source.json`. The seed,
startup orchestration, server lifecycle, API/startup tests, PostgreSQL driver,
and Vitest configuration in that snapshot match baseline `3b50f1b`. Native
package imports resolve to this checkout's installed dependencies in both
copies. The registry and scanned repository are today's checkout in both
variants; this compares code paths against the same ambient repository, not a
clean historical checkout or historical dependency installation.

## Hypotheses and observed failures

The initial hypothesis is that split metadata/body persistence substantially
increases seed queries and pushes PostgreSQL beyond the 10-second hook. Its
prediction is a large increase in SQL work or transactions near the evidence
creation stages. A competing hypothesis is that real connector scans and cold
startup consume the waits under concurrent load, even with baseline source.
Its prediction is long scan/import/registry stages in both versions.

The first check reports the following relevant failures:

- SQLite: the seed-drain test waits for `waitForRun` and fails after 12,404 ms.
  Both real-entrypoint signal tests receive no readiness output within their
  10-second waits. The lane lasts 95.66 seconds.
- PostgreSQL: the API demo `beforeAll` fails with `Hook timed out in 10000ms`.
  The seed-drain test again fails waiting for `waitForRun`, after 10,612 ms.
  The lane lasts 81.15 seconds; the API file alone lasts 72,078 ms.

The SQLite seed-drain test explicitly uses `database: ":memory:"` in both lanes.
Both real-entrypoint children explicitly set `VISUA_SEED=0` and an in-memory
database. A PostgreSQL-specific query regression cannot explain those failures.

Root reports that a review-focused suite overlapped the first SQLite lane.
A read-only process/cwd snapshot at 01:23:30 UTC confirms concurrent Vitest
workers in `/Users/artem/jelly` and Playwright workers in
`/Users/artem/entraai/apps/web`. Those processes remain untouched. This confirms
ambient contention exists during diagnosis; it does not reconstruct CPU or
filesystem contention at every failed assertion.

## Sequential seed profiles

The measurement uses fresh Node processes, separate temporary base/current
server source copies, and SQLite `:memory:`. All inherited `VISUA_*` settings
are removed; `VISUA_AGENT_MODE=offline` is set. Registry loading occurs before
the seed timer. Process-local wrappers count driver `query`, `execute`, `lock`,
and transaction calls, including transaction drivers, and time selected service
methods. Each upload's actual metadata/body persistence remains enabled. The
existing real repository connector and the seed's offline agents run normally.

| Measurement | Baseline | Current |
| --- | ---: | ---: |
| Module imports | 3,242 ms | 1,914 ms |
| Framework registry loading | 5,849 ms | 4,774 ms |
| Service creation/migrations | 130 ms | 7 ms |
| Complete seed | 32,664 ms | 25,296 ms |
| First repository scan, before first `waitForRun` | 15,505 ms | 11,737 ms |
| Repository scan in evidence-collector agent | 15,041 ms | 12,289 ms |
| Evidence-collector `waitForRun`, including scan | 15,713 ms | 12,609 ms |
| Created evidence items | 17 | 17 |
| Driver queries | 782 | 800 |
| Driver executes | 380 | 397 |
| Driver transactions | 131 | 131 |
| Driver lock calls | 213 | 213 |
| Evidence metadata upserts | 17 | 17 |
| Evidence body upserts | 0 | 17 |
| Evidence read statements | 7 | 7 |

Counts include one final evidence-list query used to check the artifact count;
they exclude initial migration statements and driver-internal BEGIN/COMMIT SQL.
Every current inline `createEvidence` stage takes 0–1 ms at this timer's rounded
resolution. It executes six data statements instead of five. Nested
`EvidenceCollection.put` uses `store.atomic`, which joins the existing service
mutation transaction. Hydrated `get/list/recent` already use a single joined
query; metadata reads use a single metadata query.

The extra 17 execute calls are exactly the new body upserts. The remaining
18-query difference is in non-evidence SELECTs; variable 25 ms polling in
`waitForRun` and concurrent agent work prevent attributing that difference to
the body split. This sample does not measure PostgreSQL round-trip cost.

The competing scan hypothesis is confirmed for the seeded failures. The first
scan alone exceeds the seed-drain wait in both code versions. The complete seed
contains a second scan and exceeds the API hook in both versions. The scanner
permits up to 15 seconds per run and walks generated directories it does not
exclude. At diagnosis, the checkout contains 1,446 `.screens` files, 513 context
files, and 418 `test-results` files. Their contribution to each scan's duration
is plausible but is not separately instrumented or claimed as proven.

## Fresh real-entrypoint startup

Two sequential fresh children execute the temporary baseline/current
`apps/server/src/index.ts`. Both use clean Visua settings, developer auth,
offline agents, port zero on loopback, `VISUA_SEED=0`, and SQLite `:memory:`.
The parent measures from spawn until it receives `SSO domain re-checks:`.

| Source | Readiness marker |
| --- | ---: |
| Baseline | 11,668 ms |
| Current | 10,147 ms |

Both exceed 10 seconds; current is faster in this sample. Combined with the
earlier import/registry timings, these results support cold startup and ambient
load as a sufficient mechanism. They provide no evidence of a material eager
AWS SDK regression. Sequential measurements have cache and scheduling effects
and cannot establish a precise performance improvement or isolate SDK cost.

The baseline child exits zero after SIGINT. The current diagnostic child exits
from SIGINT immediately after the marker. The entrypoint prints the marker
before installing its signal handlers, so that direct diagnostic timing can
race handler registration. This diagnostic child exit is not treated as a
passing signal-lifecycle test or as the cause of the recorded empty-output wait.

## Isolation options and chosen fix

Two additional in-memory probes retain actual service persistence and stop
seeding at the first `waitForRun`. They drain detached work before closing
storage. The registry is already loaded, and both probes use the profiled
current source snapshot.

| Probe | Time to first wait |
| --- | ---: |
| `createService({ connectorRoots: [] })` | 447 ms |
| Actual repo scanner redirected to a tiny approved temporary repository | 297 ms |

The tiny fixture contains `SECURITY.md`, `CODEOWNERS`, and `pnpm-lock.yaml`.
Its real scan takes 53 ms, visits four entries, reads 67 bytes, and reports a
complete scan with no findings. Redirecting the underlying
`repoScanConnector.run` preserves service-level check persistence and audit
behavior; mocking `VisuaService.runConnector` directly would bypass that work.
Dedicated `repo-scan.test.ts` already verifies real scans and boundaries using
explicit temporary roots.

A global `VISUA_REPO_SCAN_ROOTS=[]` on the full check is insufficient by itself.
The API monitoring tests require a passing lockfile check, linked connector
evidence, and agent evidence proposals. Global disablement would break those
assertions. An API fixture therefore requires a targeted connector override,
whereas the startup seed-drain test can directly pass `connectorRoots: []`.

Root chooses the following smallest changes for this delivery:

1. Pass `connectorRoots: []` in the seed-drain startup test. The test measures
   execution cleanup ordering and can omit unrelated repository traversal.
2. Give the API demo seed hook 60 seconds because it intentionally retains two
   real scans, each bounded at 15 seconds, plus SQL and agent work.
3. Give fresh-entrypoint readiness 30 seconds and the containing test 45
   seconds, based on both measured baseline/current cold starts exceeding 10
   seconds under ambient load.

No SDK or production timeout change is justified by this evidence. The root's
later service/test patches change the source state, so the first mixed full
check is not reusable as final validation.

## Reproduction and remaining verification

For a focused recheck, run the two affected files serially after final source
patches, with database settings removed for SQLite. Then run the same files
against a throwaway PostgreSQL instance with their normal isolated schemas.
Root owns the database and final full check.

```sh
env -u VISUA_DATABASE_URL -u VISUA_DB -u VISUA_TEST_DATABASE_URL \
  VISUA_AGENT_MODE=offline pnpm exec vitest run \
  apps/server/test/startup.test.ts apps/server/test/api.test.ts \
  --maxWorkers=1
```

If the PostgreSQL hook still overruns its revised wait, instrument individual
driver statement durations and first/second connector stage durations in that
focused lane. Record server wait events and query timings before changing SQL.
There is no measured PostgreSQL seed profile here, no controlled idle-machine
baseline, and no complete historical dependency/filesystem comparison.

All diagnostic jobs finish before root restarts the full check. Temporary
source copies and tiny fixtures are removed after this report is written.
