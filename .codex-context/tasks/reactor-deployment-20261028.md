# Deploy Visua to SSH reactor

Status: private runtime installed; identity and live admission pending.
The user explicitly selected SSH `reactor`. This authorizes the dedicated
installation; earlier application release findings remain open.

## Delivered

The [runbook](../../deploy/reactor/README.md) describes `/opt/visua`, immutable
image references, production OIDC, PostgreSQL, private local evidence, restart
policy, profile checks, backup, and SSH forwarding. No public listener or
passwordless developer access was enabled. No demo or assessment data was copied.
The existing Ubuntu host supplies Docker; no Windows/Hyper-V change was needed.

[State](../runs/reactor-deploy-20261028/state.json) and
[run ledger](../runs/reactor-deploy-20261028/plan.json) bind source, target and
checks. Application source remains at `5450fc7`; host helpers are separately
versioned. The two healthy containers preserve five unrelated running services.
All 265 selected runtime source/data files match; the app DB role is not superuser.

## Verification and limits

Fresh `pnpm check --no-e2e` passed types, licensing, 944 SQLite tests plus nine
skips, 953 PostgreSQL tests, corpus and design checks. Browser suite was skipped;
its prior mobile-history failure remains open. Actual target smoke passed health,
readiness, anonymous refusal, developer-login refusal, and desktop/phone login
pages through a temporary SSH forward, with no overflow or page exceptions.

The current stopped-writer backup restored into a fresh database and artifact
volume; row counts matched all 24 tables. A separate synthetic 64 KiB binary and
accepted review restored with audit/revision and auditor content. Its first
attempt failed because the fixture compared different evaluation times; retained
failure evidence precedes the corrected fixed-time pass. All scratch databases,
volumes and temporary credentials were cleaned. This is same-host logical
recovery, not off-host disaster recovery or actual Google login.

Independent infrastructure review found overlapping backup and permissive-parent
issues. Both were fixed; six mocked/tempfile checks and an independent correction
pass passed. Original review evidence is preserved. This review does not fill
the previous missing application-security assessment.

## Pending inputs and next action

Await the final hostname, Workspace owner email, and OAuth credential file path
on reactor, plus access preference (SSH/VPN or Cloudflare). These were requested
asynchronously; no answer has arrived. Configure HTTPS and real Google sign-in,
then verify owner/nonmember/role/removal behaviour. Keep JIT disabled pending F01.
Resolve the earlier F01–F11/T01 findings, retain the missing security coverage,
and prove independent encrypted backup retention before admitting live evidence.
No firewall, DNS or Cloudflare settings were changed. Temporary browser forward
will be closed after verification; the runbook supplies the user's command.
