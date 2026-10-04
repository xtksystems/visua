# Connector boundaries

Status: complete

## Outcome and acceptance

Milestone 1 package 2 is implemented. All connector HTTP/TLS connections use
public-only DNS guards. Redirects are checked individually; repository scans
stay inside operator roots and skip symlinks and special files. Time, bytes,
and process concurrency are bounded. Previous uncommitted startup work and
access, requirement mapping, and transactional audit behavior are preserved.

## Evidence and decisions

Before this change, web requests used unrestricted fetch/TLS and local scans
followed links from arbitrary paths. The worker reproduced an escaping link
reading an external fake key and accepting an external SECURITY.md; sanitized
[evidence](../runs/connector-boundaries-20261003/repo-worker-repro.json) retains
no credential bytes.

HTTP/TLS reuse shared egress with no connector private-host exception. OIDC
operator exceptions still work. Redirects allow five hops and no HTTPS
downgrade. Caps are four runs per process, 30-second caller wait, 12-second
network operations, 1 MiB encoded/decoded responses, and repository cancellation
at 15 seconds with 4,000 entries, 512,000 bytes/file, and 32 MiB total reads.
Tenant configuration cannot increase these limits. Hosted/OIDC scans default
to disabled; `VISUA_REPO_SCAN_ROOTS` supplies operator-approved absolute roots.

Pending DNS callbacks and filesystem operations keep their capacity until
physical completion even after caller cancellation. Portable Node lacks atomic
parent-directory openat operations, so root directory structures must be
operator-controlled. Kernel filesystem stalls can outlast scan cancellation;
caller wait remains bounded. Oversized framework JSON means this project's
secret scan correctly warns with no findings and incomplete coverage.

## Plan and progress

The [run ledger](../runs/connector-boundaries-20261003/plan.json) accounts for
three accepted native nodes: repository implementation, fresh independent
review, and targeted fix review. The coordinator integrated shared transport,
budgets, runtime root policy, service/API behavior, tests, and docs.

Independent review reproduced pending DNS work escaping capacity. Work scopes
now retain those callbacks. Follow-up found a synchronous cancellation race;
deferred work startup closes it. The final
[review](../runs/connector-boundaries-20261003/fix-review.json) has no unresolved
findings and passed 90 affected network/auth tests. Durable regressions cover
both failures, DNS rebinding/mixed answers, private redirects, response caps,
symlink escapes, scan truncation, and audited HTTP 503 capacity refusal.

The final full `pnpm check` passed all seven lanes in 182 seconds: typecheck,
licensing, SQLite (299 pass, 2 PostgreSQL-only skips), PostgreSQL (301 pass),
Playwright (23 pass), corpus hashes, and design lint. The
[verification record](../runs/connector-boundaries-20261003/verification-summary.json)
records exact command, environment, source fingerprints, and logs. Earlier
passing runs precede fixes and are kept as historical evidence. Only completion
prose and context records changed after the final gate.

## Next action

No remaining connector package work. The next development task is milestone 1
package 3: evidence approval binding, with validated dates, artifact/link/window
binding, supersession, immutable connector observations, and review history.
Changes remain unstaged and uncommitted. No deployment or PR was requested;
the existing localhost:8787 Docker service is unchanged and healthy.
