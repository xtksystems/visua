# SAML 2.0 single sign-on for organization connections

Status: design approved in conversation on 2026-09-27; this spec awaits review.
Roadmap: "Next: platform foundations", item 1 (identity follow-ups: SAML). SCIM is a
separate project with its own spec. The user allowed the new dependencies.

## Problem

Organizations sign in to Visua through their own identity provider only over OpenID
Connect. Many enterprise identity providers, or the way a customer's IT has set them up,
offer SAML 2.0 only (ADFS, PingFederate, older Okta and Entra ID app templates).
`docs/architecture.md` §7 lists SAML as not implemented.

## Goals

- An organization owner can add a SAML connection next to (or instead of) an OpenID
  Connect one, by pasting the identity provider's metadata.
- Everything that is protocol-neutral works unchanged for SAML: claimed domains, DNS
  proof, re-checks and lapses, routing (`discover`), just-in-time provisioning, the
  default role, enable/disable, "Require SSO", the audit trail.
- A SAML sign-in has the same guarantees as today's OIDC sign-in: it starts at Visua,
  answers a request Visua issued (single use, 10 minutes), completes in the browser
  that started it, and produces a session that reaches the connection's organization
  only.
- Works on several server instances (SQLite and Postgres).

## Non-goals (v1, stated in the UI and the docs)

- IdP-initiated sign-in (unsolicited responses from a dashboard tile). A tile can point
  at Visua's start URL for the connection instead.
- Single logout. Signing out of Visua ends the Visua session only.
- Encrypted assertions, and signed authentication requests: both need a Visua private
  key per installation. Requests are sent unsigned, which identity providers accept.
- Fetching metadata from a URL; SAML for the platform provider (`VISUA_OIDC_*` stays
  OIDC-only); SCIM.

## Connection model

`SsoConnection` gains a protocol and a SAML block; everything else is shared.

```ts
interface SsoConnection {
  id: string;
  tenantId: string;
  name: string;
  /** Missing on connections created before SAML existed: read as "oidc". */
  protocol?: "oidc" | "saml";
  // OIDC only (required when protocol is "oidc"):
  issuer?: string;
  clientId?: string;
  clientSecretSealed?: string;
  // SAML only (required when protocol is "saml"):
  saml?: SamlIdp;
  domains: string[];
  verification?: Record<string, DomainVerification>;
  jitProvisioning: boolean;
  defaultRole: Role;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

interface SamlIdp {
  /** The identity provider's entity ID (the Issuer of its responses). */
  entityId: string;
  /** Its SingleSignOnService location for the HTTP-Redirect binding. */
  ssoUrl: string;
  /** Its signing certificates (PEM), each with its validity, for rotation. */
  certificates: { pem: string; notAfter: string; fingerprint: string }[];
}
```

No migration: existing rows have no `protocol` and read as OIDC. `issuer` and `clientId`
become optional in the type; every OIDC code path keeps requiring them.

## Visua's side of the trust (per connection)

- Entity ID: `<VISUA_PUBLIC_URL>/api/auth/saml/<connectionId>`.
- Assertion consumer service (ACS): `<VISUA_PUBLIC_URL>/api/auth/saml/<connectionId>/acs`, HTTP-POST binding.
- Metadata: `GET <VISUA_PUBLIC_URL>/api/auth/saml/<connectionId>/metadata` — public
  (identity providers fetch it), XML with the entity ID, the ACS and the NameID format
  `urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress`, `AuthnRequestsSigned="false"`,
  `WantAssertionsSigned="true"`. Returns 404 for a disabled or non-SAML connection.

## Setup (Organization settings → Single sign-on)

- Only owners add, change or remove connections (the existing rule).
- "Add a provider" offers OpenID Connect (as today) or SAML. For SAML the owner pastes
  the metadata XML (at most 256 KB). The server parses it with `@xmldom/xmldom`:
  the `EntityDescriptor`'s `entityID`; the `IDPSSODescriptor`'s `SingleSignOnService`
  with the HTTP-Redirect binding; its `KeyDescriptor` certificates with `use="signing"`
  or no `use`. Each certificate is read with `node:crypto` `X509Certificate` for its
  expiry and SHA-256 fingerprint. It refuses metadata with no entity ID, no redirect-binding
  sign-in URL, no signing certificate, a sign-in URL that is not `https:` (`http:` allowed
  only with `VISUA_OIDC_ALLOW_HTTP=1`, as for OIDC issuers), several `EntityDescriptor`s,
  or a DOCTYPE (XML entity expansion).
- A preview step (`POST /api/tenants/:tenant/sso/saml/preview`, owner only, no state
  change) returns what was parsed; the page shows it for confirmation before saving.
- The connection's page shows Visua's entity ID, ACS URL and metadata URL (with copy
  buttons) to enter in the identity provider, and the certificates with their expiry.
  A certificate that expires within 30 days, or has expired, is shown with a warning
  (status chip with glyph and label). Rotation: paste the new metadata (the connection is
  updated in place; domains and their proof are kept).
- Updating a SAML connection's metadata is audited like any connection change, naming
  the certificate fingerprints added and removed.

## Sign-in flow

1. The sign-in page's discovery (`POST /api/auth/sso/discover`) returns the connection
   and its protocol; the page goes to `/api/auth/oidc/start` or `/api/auth/saml/start`
   accordingly.
2. `GET /api/auth/saml/start?connection=<id>&returnTo=<path>` refuses requests another
   site started (`Sec-Fetch-Site` other than `same-origin`/`none`), as OIDC start does.
   It builds the AuthnRequest with `@node-saml/node-saml` (HTTP-Redirect binding); the
   library records the request ID through the database-backed cache provider (below).
   Beside it Visua stores its own login flow (single use, 10 minutes) keyed by the same
   request ID: the connection, `returnTo`, and the SHA-256 of a random browser token set
   as an `HttpOnly`, `SameSite=Lax` cookie (`__Host-visua_saml` on https). The ACS takes
   this flow by the response's `InResponseTo` once the library has accepted the response.
   `RelayState` is not trusted for anything; it is left empty.
3. The identity provider POSTs the response to the ACS. That request is cross-site, so it
   carries no Lax cookie and would be refused by the cross-origin guard: exactly the ACS
   path (`POST /api/auth/saml/:id/acs`) is exempted from the origin check and the CSRF
   token (it authenticates by the signed response and the stored request instead) and is
   public. The ACS validates the response (below), consumes the stored request atomically,
   and stores the result (connection, email, name, identity key, `returnTo`, browser-token
   hash) under a random one-time code (single use, 2 minutes). It answers
   `303 See Other` to `/api/auth/saml/finish?code=<code>`. It creates no session.
4. `GET /api/auth/saml/finish?code=` is a top-level same-site navigation, so the browser
   sends the Lax cookie. It takes the code (single use), compares the cookie's token hash
   with the stored one (constant time), resolves the identity, creates the session and
   redirects to `returnTo`. A missing or different cookie ends the sign-in with the same
   message OIDC gives for a flow started in another browser.
5. Errors go to `/login?error=` with the message only for authentication and access
   errors; anything else is logged and shown as "Sign-in failed" (as OIDC does).

## Response validation

`@node-saml/node-saml` with, per connection:

- `idpCert`: every stored certificate (rotation); `wantAssertionsSigned: true`;
  `wantAuthnResponseSigned: false` (many providers sign only the assertion); an unsigned
  assertion is always refused.
- `issuer`/`audience`: the connection's Visua entity ID; `callbackUrl`: its ACS.
- `validateInResponseTo: "always"` with a cache provider backed by the database
  (the login-flow table) whose `consumeAsync` removes and returns the request atomically,
  so a replayed response is refused on every instance.
- `acceptedClockSkewMs: 60_000`; `maxAssertionAgeMs`: 5 minutes.
- The response's Issuer must equal the connection's IdP entity ID.
- SHA-1 signatures are refused if the library allows turning them off; otherwise this is
  recorded as a known limit.

## Identity

- Email: the NameID when its format is emailAddress (or unspecified and it looks like an
  address), else the first of the attributes `email`, `mail`,
  `http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress`. No email: refused
  ("Your identity provider did not share an email address").
- Name: `displayName`, or `givenName` + `sn`/`surname`, or the matching
  `…/identity/claims/givenname` and `…/surname` claims; else the email's local part.
- Identity key: issuer = the IdP entity ID, subject = the NameID. The email is treated as
  verified for the organization's own connection, as for OIDC organization connections,
  and then goes through the existing `resolveIdentity`: a connection admits new people
  only from its verified domains (and not from lapsed ones), links existing accounts,
  provisions just in time, and never renames people who belong to other organizations.
- Session method `saml:<connectionId>`, scoped to the connection's organization.
  "Require SSO" accepts a session from any of the organization's own enabled connections,
  whichever protocol.

## Storage

- No schema change: SAML settings live in the connection's JSON; pending requests and
  one-time codes use the existing `login_flows` table (`state_hash` = SHA-256 of
  `saml-request:<id>` or `saml-code:<code>`), with a new atomic `consume` (a single
  `DELETE … RETURNING` on both dialects) used for both.

## Dependencies

- `@node-saml/node-saml` (MIT): request building and response validation (XML signatures
  through `xml-crypto`).
- `@xmldom/xmldom` (MIT): parsing pasted metadata (already a dependency of node-saml;
  made direct). Both added to `apps/server/package.json` only.

## Testing

Server (Vitest, on SQLite and Postgres), with a test identity provider that signs
responses with a key and certificate committed as test-only fixtures under
`apps/server/test/fixtures/saml/` (generated for these tests, never used elsewhere):

1. Metadata: parses Okta-, Entra- and ADFS-shaped samples (fixtures written for the
   tests); refuses no entity ID, no redirect binding, no signing certificate, `http:`
   without the allow flag, several entities, a DOCTYPE; reads certificate expiry and
   fingerprint.
2. Visua metadata endpoint: entity ID and ACS for the connection; 404 for disabled or
   OIDC connections.
3. Happy path: start → IdP → ACS → finish → session with method `saml:<id>`, reaching the
   organization only; JIT provisioning from a verified domain.
4. Refused: unsigned assertion; signed with an unknown certificate; wrong audience; wrong
   Issuer; expired or not-yet-valid assertion; a response with no InResponseTo
   (IdP-initiated); an InResponseTo Visua never issued; the same response twice (replay);
   the finish step in a browser without the flow cookie; a reused one-time code; a
   signature-wrapping attempt (a signed assertion plus an injected unsigned one).
5. Certificate rotation: a response signed by either of two stored certificates is
   accepted; after the old one is removed, only the new one.
6. Domains: a new person from a pending or lapsed domain is refused; a linked member of
   a lapsed domain still signs in.
7. "Require SSO" with only a SAML connection: its members keep their role; a platform
   session gets none.
8. Two instances: a request issued by one service is completed on another; a response
   replayed to both is accepted once.
9. The ACS exemption covers only `POST /api/auth/saml/:id/acs`: another cross-site POST is
   still refused.
10. Discovery returns the protocol (`oidc` or `saml`) with the connection; the sign-in page
    starts the matching flow (e2e: an address on a SAML connection's verified domain is
    sent to `/api/auth/saml/start`).

Web: e2e — the SSO tab adds a SAML connection from pasted metadata (fixture), shows Visua's
URLs and the certificate expiry; `pnpm screens` before and after.

## Documentation

- `docs/architecture.md` §4: SAML connections, the flow, validation, the ACS exemption;
  §6 tests; §7: drop "SAML is not implemented", add the v1 limits (no single logout,
  no encrypted assertions, no IdP-initiated sign-in).
- README: SAML in the SSO feature description.
- `docs/roadmap.md`: identity follow-ups keep SCIM only.
