# Hosted pilot acceptance

Use this worksheet with the [operations guide](operations.md) when the hosted
target and pilot team are selected. All application packages are delivered
locally. The preflight and disposable rehearsal help prepare the environment;
they do not establish hosted readiness or user acceptance.

## Select the environment and owners

Record decisions before provisioning or admitting real evidence. Store secret
values in the deployment's secret manager; record references here, not values.

| Input | Current state | Required record |
| --- | --- | --- |
| Hosting target and public origin | Not selected | Provider/project, region, HTTPS origin, release revision |
| Database and object storage | Not selected | PostgreSQL service, private bucket/prefix, encryption and access policy references |
| Identity provider | Not selected | Issuer, client registration reference, callback URI, verified email behavior |
| Accountable owners | Not assigned | Service, identity, backup/restore, review, and incident-response owners |
| Retention and deletion | Not decided | Artifact, review, audit, access, export, backup, log, and key retention; deletion rights |
| Recovery objectives | Not measured | Intended recovery point/time, independently retained checkpoint and key custody |
| Pilot team | Not selected | Named participants for owner, contributor, approver, and auditor roles |

## Verify the configured deployment

Run the steps in order. Keep the source revision, environment, time, operator,
expected result, actual result, and evidence location for every check. A missing
or failed check remains open.

1. Run the configuration preflight against the intended environment. Resolve
   errors and record decisions for review flags. Keep external checks open.
2. Provision an empty isolated pilot installation with HTTPS and production OIDC.
   Confirm no demo data exists, developer sign-in fails, and the designated owner
   signs in through the real provider. Check secure cookies and tenant boundaries.
3. Provision the remaining roles. Assign a CSF outcome and SOC 2 criterion to a
   contributor, upload a dated binary observation, reject it with a reason,
   replace it, and accept it as an approver. Confirm the contributor cannot
   approve and the auditor cannot mutate assessment state.
4. Inspect provenance, validity, requirement coverage, and replacement history.
   Download exact artifact bytes and verify an auditor package using an
   independently retained receipt and a trusted verifier.
5. Remove a member with an open event stream and verify access ends. Test IdP
   configuration changes, application restart, and recovery after disconnected
   event streams across the selected application instances.
6. Stop writers and perform the coordinated database/object backup and restore
   into an isolated environment. Verify original bytes, reviews, access records,
   audit checkpoint, restored identity/key configuration, and fresh export.
   Record elapsed recovery time and backup age. Test missing or corrupt objects.
7. Exercise the expected workspace size, user mix, write/read/export workload,
   and sustained concurrency against the configured deployment. Record latency,
   rejection/error rates, queue age, resource use, and recovery behavior before
   selecting service targets. Confirm alert ownership and response procedures.

The local rehearsal automates parts of steps 2–4, 6, and a bounded read sample
from step 7. It does not execute this hosted acceptance procedure.

## Measure the team workflow

Have the actual pilot team complete the workflow without a side spreadsheet.
Record a baseline and the observed pilot period before making efficiency claims.

| Measure | Start/end or denominator | Evidence to retain |
| --- | --- | --- |
| Time to first accepted artifact | Start of assigned collection work to bound acceptance | Task timestamps and evidence review history |
| Unowned and overdue work | Scoped open tasks, with the evaluation time | Task list and assignment/due-date snapshot |
| Review backlog | Pending review items at the evaluation time | Evidence/proposal counts and oldest waiting item |
| Failed runs | Failed/interrupted runs divided by attempted runs in the period | Run records, failure categories, and retry outcomes |
| Expired evidence without replacement | Expired evidence and requirements losing effective coverage | Renewal view and alternative-evidence assessment |
| Human effort | Collection, review, correction, and administration time | Participant observations with period and method |

No pilot baseline, human time savings, or completion-rate result is recorded yet.
An accountable owner must review the evidence, unresolved failures, retention
decisions, and operational responsibilities before admitting broader use.
