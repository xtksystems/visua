# Visua on reactor

The October 28, 2026 installation runs on SSH host `reactor` under `/opt/visua`.
It uses production authentication mode, PostgreSQL 17, and private local evidence
files. The application image was built from source `5450fc7`; deployment helpers
are installed separately. Its initial listener is **127.0.0.1:8787 only**.
Google OAuth and the first owner are pending, so the sign-in page is available
but users cannot sign in yet. The earlier application review findings remain
open; this private installation is not a live admission signoff.

## Access and status

Use SSH forwarding from an authorized workstation:

```sh
ssh -N -L 18787:127.0.0.1:8787 reactor
```

Open <http://127.0.0.1:18787>. Stop forwarding with Ctrl+C. This is a private
transport path. The final hostname, HTTPS routing, and OAuth callback must be
configured together before user sign-in.

Inspect the stack without rendering secret environment values:

```sh
ssh reactor
cd /opt/visua
docker compose --env-file images.env ps
python3 preflight.py /opt/visua
```

`images.env` pins the application image ID and PostgreSQL registry digest.
The private configuration lives in `shared/app.env`; SQL initialization and
administrator credentials live alongside it. `/opt/visua` and `shared` must be
owned by the deployment operator with mode 0700. The app environment is 0600.
The two PostgreSQL-readable mounts are 0444 behind that private host directory.
Never paste environment contents or unfiltered Docker inspection into reports.

## Complete Google sign-in

Provide the final HTTPS hostname, the named Workspace owner email, and a private
credential file on reactor for the Google OAuth client. Use an Internal client
under the Workspace organization for the employee-only pilot, with the exact
callback `https://<HOSTNAME>/api/auth/oidc/callback` and scopes
`openid email profile`. Preserve the generated `VISUA_SECRET`.

Update the protected environment with `VISUA_PUBLIC_URL`, `VISUA_OIDC_ISSUER`,
`VISUA_OIDC_CLIENT_ID`, `VISUA_OIDC_CLIENT_SECRET`, and
`VISUA_BOOTSTRAP_OWNER_EMAIL`. The issuer is `https://accounts.google.com`.
Select the private HTTPS proxy or Cloudflare route before changing exposure.
Do not switch to developer sign-in to bypass configuration.

Check identity syntax and recreate only the app after configuration:

```sh
python3 preflight.py /opt/visua --require-identity
docker compose --env-file images.env up -d --no-deps --wait app
```

The reactor preflight is a bounded static check for this supplied profile. It
cannot validate Google registration, actual network bindings, login, TLS,
retention, or release correctness. The repository's `pnpm pilot:preflight`
remains the separate PostgreSQL/S3 profile. Verify owner login, denied nonmember
access, roles, removal, uploads, downloads, and recovery before admitting users.
Keep JIT disabled until the existing admission finding is resolved.

## Backup and restore

The installed backup command stops the sole app writer, captures PostgreSQL,
roles, evidence files, image/Compose references, and private configuration, then
restarts the app and waits for health. An exclusive installation lock prevents
overlapping invocations. Only this project may write its database and volumes.
Do not start another writer during capture.

```sh
python3 backup.py /opt/visua
```

A successful result includes the private backup path and manifest digest. Keep
that digest separately. Backup sets contain credentials, sessions, and evidence;
retain them encrypted on an independent backup destination. Current copies are
on reactor only. No off-host retention or scheduled backup policy is configured.

Restore into a freshly created PostgreSQL database and artifact volume, using a
compatible `pg_restore --exit-on-error` and the retained application image. Retain
SQL roles and the original server/OAuth secrets through protected recovery
custody. Verify every archive against the independently kept manifest digest
before restoring. Do not overwrite live data or assume an image rollback reverses
startup migrations. The [operations guide](../../docs/operations.md) describes
recovery invariants and the [office plan](../../docs/live-deployment-plan.md)
records the remaining release and identity gates.

The target verification restored the initial backup into a fresh database and
artifact volume and compared all table counts. A separate synthetic PostgreSQL
and local-file drill checked exact binary bytes, bound review, audit/revision,
and stable auditor content at a fixed evaluation time. These checks do not
establish off-host disaster recovery or real Google sign-in.

## Release and rollback

Keep the previous image ID, Compose/configuration, and a verified coordinated
backup before replacing a release. Stop writers for database/artifact capture.
If acceptance fails, stop and preserve the new state, restore to new destinations,
and run the compatible prior image. Reconcile later writes explicitly.

The initial source archive and build log remain under `releases` and `evidence`.
The [deployment record](../../.codex-context/runs/reactor-deploy-20261028/state.json)
links verification and pending inputs. Existing Wazuh, Suricata, ntfy, firewall,
DNS, and Cloudflare service configuration were preserved.
