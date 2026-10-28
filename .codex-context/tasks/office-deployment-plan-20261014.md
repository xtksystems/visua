# XTK Systems office deployment plan

Status: planning revision delivered; independent architecture review passed.
Placement, access, and recovery inputs remain pending.
This revises the deployment target for the existing predeployment task. No
product fixes, office provisioning, remote scans, or network changes are in scope.

## Requirements and inputs

The user selected XTK Systems office hosting and three users. Reported inventory:
six Dell 7920 local servers, two Windows Server Hyper-V hosts with three Windows
11 VDIs each, and two Windows 11 workstations. Do not assume the Windows hosts
are additional to the six Dells or infer their capacity from the machine model.
Google Workspace and Cloudflare remain the prior identity/DNS choices; names
will be provided later. Questions about host versions/free resources, access
path, backup storage, and UPS were sent; answers remain pending.

## Proposed result and acceptance

The [plan](../../docs/live-deployment-plan.md) proposes one dedicated Linux VM,
one Visua instance, PostgreSQL, local evidence files, and independent backups.
Initial VM sizing is an estimate pending measured VDI/host headroom. It preserves
the prior release hold and records that office preflight and a PostgreSQL/local
file recovery procedure are not yet implemented or validated. The current demo
Compose configuration must not be used as production packaging.

Check source/configuration compatibility, official vendor guidance, links,
historical-review attribution, and one independent bounded feasibility review.
[Run ledger](../runs/office-plan-20261014/plan.json). The returned review passed with no supported findings; all eleven input digests
match. One result-envelope formatting correction preserved the review and plan
bytes. Product tests are not rerun
for documentation-only changes; prior checks remain explicitly mixed, with
T01 failing twice and the security review incomplete.

## Remaining execution

Resolve F01–F11/T01 and missing security coverage in implementation/review work.
Confirm placement/access/backups, adapt the pilot worksheet for local storage,
prepare production packaging and the office
preflight/recovery procedure, then run staging and real-provider acceptance.
The current plan does not authorize live changes or attest to office capacity.

On October 28 the user selected SSH `reactor`. The
[reactor deployment task](reactor-deployment-20261028.md) records the private
installation on existing Ubuntu with implemented profile checks and backup.
The Hyper-V VM proposal is superseded for initial placement. Identity, final
access, independent retention, and earlier application release gates remain open.
