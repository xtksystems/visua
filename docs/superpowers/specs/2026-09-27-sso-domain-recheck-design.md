# Periodic re-checks of verified SSO domains

Status: design approved in conversation on 2026-09-27; this spec awaits review.
Roadmap: "Next: platform foundations", item 1 (identity follow-ups). Closes the first
point of `docs/architecture.md` §7 ("SSO domains are proven once").

## Problem

An SSO connection's domain is proven once, by a TXT record
`_visua-challenge.<domain>` carrying the connection's token. Afterwards nothing looks
again. An organization that loses control of a domain (it lets the domain expire, sells
it, or a subsidiary leaves) keeps it: its connection still admits new people with that
domain's addresses, and the domain's real owner cannot prove it for its own
organization, because the first organization to prove a domain holds it.

## Goals

- A domain proven by DNS is looked at again periodically.
- A domain whose proof is gone for a grace period stops admitting new people and
  releases its claim, so its real owner can prove it.
- No organization is locked out by a re-check, including one that requires SSO.
- DNS trouble (timeouts, SERVFAIL) never counts against a domain.
- Every change of a domain's standing lands in the organization's audit trail.
- Works the same on SQLite and on Postgres with several server instances.

## Non-goals

- Email or other notifications: Visua has no mail system. Status is shown in
  Organization settings and in the audit trail.
- Re-checking domains that were never proven by DNS (methods `grandfathered` and
  `trusted`). They are shown as not proven by DNS; their organizations can remove and
  verify them again, as §7 already advises.
- SAML and SCIM (separate roadmap items).

## Domain standing

A domain listed on a connection is in exactly one standing:

| Standing | Meaning | Routes sign-ins | Admits new people | Holds the claim |
|---|---|---|---|---|
| pending | listed, never proven | no | no | no |
| verified | proven; last re-check found the record (or none yet) | yes | yes | yes |
| failing | verified, but re-checks have not found the record since `failingSince` | yes | yes | yes |
| lapsed | failing for longer than the grace period | yes, until another connection proves it (only people already linked get in) | no | no |
| not proven by DNS | `grandfathered` or `trusted` | yes | yes | yes |

- **failing → verified:** a re-check finds the record again (audited "recovered").
- **failing → lapsed:** a re-check misses the record when `failingSince` is older than
  the grace period (audited "lapsed").
- **lapsed → verified:** the organization's admin verifies the domain again (the
  existing `verifySsoDomain`, same token, so restoring the same TXT record works), or a
  scheduled re-check finds the record (audited "recovered"), but only while no other
  connection holds the domain.
- **lapsed, taken over:** once another connection proves the domain, the lapsed domain
  is no longer re-checked (`nextCheckAt` cleared) and stays lapsed; its organization
  sees that another organization holds it.
- A lapsed domain keeps routing so that members, owners included, can still sign in,
  see the warning and fix the record: with "Require SSO" on, a member's only way in is
  a session from the organization's own connection, and discovery is the only way the
  sign-in page reaches it. When another connection proves the domain, routing moves to
  it.

## Re-check outcome of one lookup

- The TXT set contains the expected value: **found**.
- NXDOMAIN (`ENOTFOUND`), NODATA (`ENODATA`), or TXT records without the expected
  value: **missing**.
- Any other error (timeout, `ESERVFAIL`, refused): **unknown**. It changes nothing
  except the schedule: the domain is retried after one tick-interval backoff (at most
  one hour later), and the audit trail records nothing.

## Settings

| Variable | Default | Meaning |
|---|---|---|
| `VISUA_SSO_DOMAIN_RECHECK_HOURS` | `24` | Time between re-checks of a domain. `0` turns re-checking off. |
| `VISUA_SSO_DOMAIN_RECHECK_GRACE_DAYS` | `7` | How long a domain may be failing before it lapses. |

With `VISUA_SSO_DOMAIN_VERIFICATION=off`, re-checking is off too: domains added then
are `trusted` and have no record to look for. Both variables are documented in
`apps/server/src/auth/config.ts` and the README's configuration table.

## Storage

The connection's JSON `verification[domain]` record stays the source of truth, as for
verification today. It gains optional fields:

```ts
interface DomainVerification {
  token: string;
  verifiedAt?: string;          // unchanged: set while verified or failing
  method?: "dns" | "grandfathered" | "trusted";
  lastCheckedAt?: string;       // last re-check with a found or missing outcome
  nextCheckAt?: string;         // when the domain is next due (dns-verified or lapsed only)
  failingSince?: string;        // first missing outcome of the current failure
  lapsedAt?: string;            // set when it lapses; verifiedAt is cleared then
}
```

`verifiedDomains()` keeps its meaning (a `verifiedAt` is set), so lapsed domains stop
admitting new people and cannot be used to turn on "Require SSO" with no other code
change.

**Migration 4** adds two columns to `sso_domains`: `lapsed_at TEXT` and
`next_check_at TEXT`, with an index on `next_check_at`. `SsoConnections.put()` (which
rewrites a connection's rows on every save) copies both fields from the JSON, as it
does `verified_at`. The migration backfills `nextCheckAt` in the JSON and the column
for every domain verified by DNS, spread over the first interval by a stable hash of
domain and connection id, so an upgrade does not look up every domain at once.

The unique index `sso_domains_verified` (one verified holder per domain) is unchanged.
A lapsed row has `verified_at` NULL, so another connection can prove the domain.

**Routing (`byDomain`)**: the verified row if there is one; otherwise the lapsed row
with the latest `lapsed_at` whose connection is enabled.

## Scheduling across instances

Each server instance runs a ticker (every 10 minutes, and once shortly after start)
that calls `AuthService.recheckDueDomains(at)`:

1. **Claim** (one short transaction under the existing `sso-domains` lock): select up
   to 25 rows with `next_check_at <= at`; for each, move `nextCheckAt` to a lease
   (`at` + 15 minutes) in the JSON and the row. Another instance ticking at the same
   time finds nothing due.
2. **Look up** each claimed domain's record outside any transaction (the existing
   `resolveTxt`, 5 s timeout, 2 tries).
3. **Record** each outcome in its own transaction under the same lock, only if the
   domain's token is unchanged and it is still listed (the connection may have been
   edited meanwhile); otherwise drop the result. Found and missing set `lastCheckedAt`
   and `nextCheckAt = at + interval`; unknown sets `nextCheckAt = at + backoff`.

A crashed instance's claims expire with their lease and are picked up by the next tick.
`recheckDueDomains(at)` takes the time as an argument so tests drive the clock; the
ticker lives in `apps/server/src/index.ts` and stops on shutdown.

## Audit trail

Entries use the existing `AuthService.audit` (through `VisuaService`, in the same
transaction as the change), with the actor `Domain re-check`:

- `failing` on `sso-domain`: "Domain acme.com: its TXT record `_visua-challenge.acme.com` was not found on re-check; it lapses on 2026-10-04 unless the record is restored"
- `lapsed`: "Domain acme.com lapsed: … no longer admits new people and can be proven by another organization"
- `recovered`: "Domain acme.com: its TXT record was found again"

## API and web

- `publicConnection().domainStatus[]` gains `standing` (`pending | verified | failing |
  lapsed | not-proven`), `lastCheckedAt`, `failingSince`, `lapsesAt` and `lapsedAt`.
  No new routes; the existing ones already go through `workspaceAccess` and
  `tenant.manage`.
- Organization settings, SSO section: each domain shows its standing with a status
  glyph and label (DESIGN.md tokens; status colors are semantic and always paired with
  a label), the date it lapses or lapsed, and the TXT record to restore, with the
  existing "Verify" action for failing and lapsed domains.

## Testing

Server (Vitest, on SQLite and on Postgres), with an injected `resolveTxt` and explicit
times:

1. A DNS-verified domain found on re-check stays verified; `nextCheckAt` moves one
   interval on.
2. Missing: failing (audited), still routes and admits; missing past the grace period:
   lapsed (audited), no longer admits a new person, still routes and signs in a linked
   member.
3. Found again while failing or lapsed: verified, audited "recovered".
4. Timeouts and SERVFAIL never start or advance a failure; the domain is retried after
   the backoff.
5. An organization requiring SSO whose only domain lapses: its linked owner still signs
   in through discovery and can verify again.
6. Another organization proves a lapsed domain; routing moves to it.
7. Grandfathered and trusted domains are never looked up; re-checking off (`0`, or
   verification off) looks up nothing.
8. Two instances (two `AuthService`s on one store) ticking at once: each due domain is
   looked up exactly once.
9. Editing a connection (a `put()`) keeps `next_check_at` and `lapsed_at` in the rows.
10. Migration 4 on a pre-migration database: DNS-verified domains get a `nextCheckAt`
    within the first interval; others get none.
11. A result recorded after the connection changed (new token, domain removed) is
    dropped.

12. A lapsed domain proven by another connection is not re-checked and not recovered,
    even when its own record reappears.

No new e2e test: putting a domain into a failing or lapsed standing needs a DNS answer,
and a switch to fake DNS in the served app would itself be a way to fake proofs. The
standings in Organization settings are covered by the API tests above and checked by
hand in a dev build (`pnpm dev` with an injected resolver) and with `pnpm screens`; the
existing e2e suite runs unchanged.

## Documentation

- `docs/architecture.md`: §4 (identity) describes re-checks; §7 drops the "proven
  once" limitation and keeps the note about grandfathered and trusted domains.
- README configuration table: the two variables.
- `docs/roadmap.md`: identity follow-ups keep SAML and SCIM only.
