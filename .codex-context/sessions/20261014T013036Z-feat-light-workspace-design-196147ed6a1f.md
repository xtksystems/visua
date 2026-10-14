---
system: "codex-context"
session_id: "20261014T013036Z-feat-light-workspace-design-196147ed6a1f"
created_utc: "2026-10-14T01:30:36+00:00"
updated_utc: "2026-10-14T01:50:05.631494+00:00"
task: "Prepare portable hosted pilot validation"
status: "active"
repo_root: "/Users/artem/visua"
worktree_id: "fbce6dbefa7b12a8"
branch: "feat/light-workspace-design"
head: "a0fee8b5b4101a489163d499265c64d33ab51e11"
---

# Portable hosted pilot preparation

All portable preparation is implemented and verified; source delivery is next.
The [task](../tasks/pilot-readiness-20261013.md) and
[run ledger](../runs/pilot-readiness-20261013/plan.json) own acceptance. All three
native nodes are accepted with intact envelopes; no worker remains active.

Preflight inspects only intended environment, emits no values or secrets, and
keeps external checks required. Rehearsal creates disposable PG17/MinIO fixtures,
two production-mode app processes and local mock OIDC. Four roles,167requirements,
64KiB binary evidence,80reads/concurrency4,real PGdump/freshDB+objectprefixrestore,
all entity digests/reviews/audit/access/SSO/bundle checks passed. Resources removed.

Final pnpmcheck --no-e2e passes944SQLite+9PG-onlyskips,953PG,types/license/corpus/
design. No web changes, so browser suite not rerun. Focused utility61tests pass.
Independentreview found startup cleanup reporting and bracketed wildcard input;
both fixed, actualmodule fault-injection checks pass. Fixture-only initial wrong
Evidence field and regression argvpath failures retained in logs; finalpassed.
See source-verification.json and rehearsal-release-result.json in the run.

Next: commit/push; build image, stoplocalwriters, take fresh quiesced backup at
/app/data/pilot-readiness-20261014-backup (newpath), verify/copy/restart. Check209
runtimepins and originaldata againstbackup. No database migration expected.
Do not reuse older create-onlybackup destinations. Localservice8787 currently
healthyate9ad8c2 with originalvolumevisua_visua-data. Existingapp/runtimeunchanged.

Hostedtarget/domain/IdP question remainsunanswered; actualhosted/TLS/IAM/provider
recovery/retentionownership/capacity/useracceptance notclaimed. Optionalroadmap
expansion remainsdeferred. Historicaluntrackeddiagnostics untouched. New private
rehearsalarchives/bytes/results underignored.check/pilot-*; no secretsintracked
records. Use explicitstaging and preserve all originaldata.
