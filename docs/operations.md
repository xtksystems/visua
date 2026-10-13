# Operating and recovering Visua

Use this guide to deploy, upgrade, and recover a Visua workspace with its evidence.
The repository's Compose configuration is a **local demonstration deployment**:
loopback access, developer sign-in, offline agents, SQLite, and private local blobs.
The automated recovery fixture verifies SQLite plus referenced local files.
Hosted PostgreSQL, object storage, identity-provider recovery, retention periods,
and production capacity require an operator's environment and validation.

## Deployment and authentication

Install the pinned pnpm version and Node version from [setup](../README.md).
Build and test a specific source revision before delivery. `pnpm check` exercises
licensing, types, SQLite, disposable PostgreSQL, browser journeys, corpus hashes,
and design rules. Do not point test database variables at a live database.

For the local Compose service:

```sh
VISUA_REVISION="$(git rev-parse HEAD)" docker compose build visua
docker compose up -d visua
curl --fail http://localhost:8787/api/health
curl --fail http://localhost:8787/api/ready
```

Health establishes process availability. Readiness checks database access and
fails during shutdown; neither verifies user journeys or recovery. Confirm the
container's revision label, sign in, inspect an existing requirement, and download
an existing artifact after deployment. Never remove the `visua-data` volume as an
upgrade step.

A hosted operator must configure HTTPS, the public origin, production OIDC,
durable database and blob storage, trusted outbound access, and the existing
[authentication settings](../README.md#sign-in-roles-and-organizations). Production refuses
developer sign-in. Retain `VISUA_SECRET` in the deployment's secret manager:
restoring SQL alone cannot decrypt SSO client secrets without the corresponding
key. Preserve provider registration, redirect configuration, and recovery access
separately. API/session records and encrypted secrets make backups sensitive.
Do not put credentials or raw artifact content in operational logs.

## Upgrades

Use a maintenance window to stop all writers, including other Visua instances,
agent jobs, and external tools that can change the database or blob root. Capture
and verify a database-plus-artifact backup before replacing the image. Record the
old and new revisions, database migrations, backup location, and an external copy
of the backup manifest digest.

Migrations run at startup. If an upgrade fails, stop the new process and preserve
its data for diagnosis. Restore the verified backup to **new paths** and run the
compatible prior image against those paths. A code rollback alone does not undo
a database migration. Confirm audit continuity, reviewed artifact bytes, scope,
and permissions before switching service traffic.

## SQLite and local-file backup

The helper snapshots SQLite with `VACUUM INTO` and copies every file currently
referenced by evidence metadata. It verifies database and blob digests and rejects
inconsistent or missing references. It also preserves inline evidence, reviews,
workspace data, identities, audit history, and access records inside SQLite.
It does not retain unreferenced or previously deleted file bytes.

The `--quiesced` flag is the operator's assertion that **every writer is stopped**;
it does not acquire an application maintenance lock. Keep backup parents private,
canonical, and under operator control. Outputs must be new paths. The helper
rejects SQLite sidecars in a backup or restore destination so they cannot alter
the state represented by the main database digest.

For the supplied Compose volume, choose a fresh output name for each backup:

```sh
docker compose stop visua
docker compose run --rm --no-deps visua node scripts/backup-local.ts create \
  --database /app/data/visua.db --blobs /app/data/blobs \
  --output /app/data/backup-CHANGE-ID --quiesced
docker compose run --rm --no-deps visua node scripts/backup-local.ts verify \
  --backup /app/data/backup-CHANGE-ID
docker compose up -d visua
```

Replace `CHANGE-ID` before running. Copy the completed backup directory to the
operator's independently protected backup storage, preserving private permissions.
A backup retained only in the application volume will not survive loss of that
volume. Store its manifest digest separately; hashes inside a mutable backup prove
consistency, not independent authenticity. Encryption and offsite retention are
operator responsibilities.

To drill recovery, copy the backup to a separate machine or isolated directory
with dependencies installed, then use new database and blob paths:

```sh
node scripts/backup-local.ts verify --backup /recovery/backup-CHANGE-ID
node scripts/backup-local.ts restore --backup /recovery/backup-CHANGE-ID \
  --database /recovery/restored.sqlite --blobs /recovery/restored-blobs
```

The parent `/recovery` must already exist and be controlled by the operator.
The helper refuses existing destinations and validates the backup before writing.
Only start a test service against restored paths after the command succeeds.
Use an isolated origin and port; avoid sending mail, contacting production
providers, running connectors, or exposing restored session credentials. Check:

- The expected workspace, requirement scope, targets, tasks, and reviews exist.
- Original binary downloads match retained digests; inline bodies are readable.
- Audit verification reaches the retained checkpoint, and access records remain.
- A new auditor bundle can be prepared and verified from the restored service.
- Restored authentication works with the intended provider/key configuration.

Record elapsed recovery time, the backup's age, results, and operator. The tests
exercise data recovery and bundle generation; they do not establish a production
recovery-time or recovery-point objective, or recover a live identity provider.

## PostgreSQL and object storage

The local helper deliberately refuses to stand in for a PostgreSQL/object-store
backup system. Stop all writers while pairing the database snapshot with evidence
objects, or use an operator-proven coordinated backup strategy with retained
object versions. Preserve the object prefix, tenant/workspace identifiers, artifact
IDs, size, digest, and object-version manifest. Restoring SQL with an empty bucket
leaves evidence references unusable.

For PostgreSQL, use a compatible `pg_dump` custom-format archive and restore it
with `pg_restore` into a freshly created database. A database dump is internally
consistent, but does not capture cluster roles or external blob objects. Preserve
required roles, grants, extensions, encryption keys, and object policies through
the operator's separate configuration backup. Use `--exit-on-error`, inspect every
restore result, and never run destructive cleanup options against the live target.
See the official [pg_dump](https://www.postgresql.org/docs/17/app-pgdump.html) and
[pg_restore](https://www.postgresql.org/docs/17/app-pgrestore.html) guidance.

Use a private restored bucket/prefix and fresh database, then execute the same
artifact/review/audit/access checks as the local drill. Verify exact downloads
through Visua, not merely the existence of object keys. Hosted restore, key
recovery, failover, and storage-provider version retention remain unverified until
run against the selected deployment.

## Access records and auditor receipts

Auditor view preparation, exports, and evidence downloads append separate access
records with the server-authenticated actor. `prepared` means the server prepared
the response; it does not prove delivery, reading, or agreement. Access recording
must succeed before returning bytes. It does not change assessment revision or
the assessment hash chain. Workspace deletion removes its access records, so
archive them externally before deletion if the retention policy requires them.

Retain a bundle receipt's manifest digest and audit checkpoint outside the ZIP.
Use a separately trusted copy of `bundle-verifier.mjs` when verifying an untrusted
extracted package. A bundled verifier cannot authenticate itself. A manifest pin
binds all listed file bytes; a checkpoint pin binds the retained audit prefix.
Neither constitutes an auditor conclusion, independent signature, or compliance
certification. Without a separately retained pin, verification checks internal
consistency and cannot detect a fully rewritten package.

## Retention and resource limits

Before a hosted pilot, designate a service owner, backup/restore owner, and
reviewer. Choose retention durations and deletion rights for artifacts, review
history, access records, audit checkpoints, exports, backups, logs, and encryption
keys. Visua does not implement legal holds, an archive schedule, automatic backup
rotation, object lifecycle policy, or physical-file garbage collection. Coordinate
object deletion with database references and retained backups. Do not infer
permission to erase evidence from a withdrawn review or a supersession link.

Request and automation bounds are documented in [architecture](architecture.md).
Rate limits and most diagnostics are per process; they are not a distributed
quota or measured hosted capacity. Put admission controls at the trusted edge
when operating multiple instances. Diagnostics avoid artifact content and user
identifiers; monitor queue age, interrupted runs, storage failures, denied access,
stream resynchronization, and request rejection. Run configured-size, multi-user
capacity and recovery drills before setting production commitments.
