import { X509Certificate } from "node:crypto";
import { describe, expect, it } from "vitest";
import { assertionAnswers, certificateStanding, parseIdpMetadata, precheckResponse, samlIdentity } from "../src/auth/saml.ts";
import { assertion, encryptedResponse, fingerprint, KEYS, response, sign } from "./saml-idp.ts";
import { adfsMetadata, entraMetadata, oktaMetadata } from "./saml-samples.ts";

const ENTITY = "https://idp.test/saml/visua";
const SSO = "https://idp.test/sso";
const ACS = "https://visua.test/api/auth/saml/sso_1/acs";
const okta = (over: Partial<{ entityId: string; ssoUrl: string; certs: string[] }> = {}) => oktaMetadata({ entityId: ENTITY, ssoUrl: SSO, certs: [KEYS.a.cert], ...over });
const refused = (xml: string, allowHttp = false) => {
  try {
    parseIdpMetadata(xml, { allowHttp });
  } catch (e) {
    return (e as Error).message;
  }
  return "accepted";
};
const decoded = (b64: string) => Buffer.from(b64, "base64").toString("utf8");

describe("identity provider metadata", () => {
  it("reads Okta-shaped metadata: entity ID, redirect sign-in URL, the certificate's expiry and SHA-256 fingerprint", () => {
    const idp = parseIdpMetadata(okta(), { allowHttp: false });
    expect(idp.entityId).toBe(ENTITY);
    expect(idp.ssoUrl).toBe(SSO);
    expect(idp.certificates).toHaveLength(1);
    expect(idp.certificates[0]!.fingerprint).toBe(fingerprint("a"));
    expect(idp.certificates[0]!.notAfter).toBe(new Date(new X509Certificate(KEYS.a.cert).validTo).toISOString());
    expect(new X509Certificate(idp.certificates[0]!.pem).fingerprint256).toBe(fingerprint("a"));
  });

  it("reads Entra-shaped metadata: both IdP keys (with and without use), never the metadata's own signer", () => {
    const idp = parseIdpMetadata(entraMetadata({ entityId: "https://sts.windows.net/tid/", ssoUrl: SSO, certs: [KEYS.a.cert, KEYS.b.cert], metadataSigner: KEYS.rogue.cert }), { allowHttp: false });
    expect(idp.entityId).toBe("https://sts.windows.net/tid/");
    expect(idp.certificates.map((c) => c.fingerprint)).toEqual([fingerprint("a"), fingerprint("b")]);
  });

  it("reads AD FS-shaped metadata: only the IdP role's signing key", () => {
    const idp = parseIdpMetadata(adfsMetadata({ entityId: "http://adfs.test/adfs/services/trust", ssoUrl: SSO, signingCert: KEYS.a.cert, otherCert: KEYS.rogue.cert }), { allowHttp: false });
    expect(idp.certificates.map((c) => c.fingerprint)).toEqual([fingerprint("a")]);
  });

  it("lists a certificate repeated in several KeyDescriptors once", () => {
    expect(parseIdpMetadata(okta({ certs: [KEYS.a.cert, KEYS.a.cert] }), { allowHttp: false }).certificates).toHaveLength(1);
  });

  it("refuses metadata it cannot trust", () => {
    expect(refused(okta().replace(/entityID="[^"]+"/, ""))).toBe("The metadata has no entity ID");
    expect(refused(okta().replace(/<md:SingleSignOnService Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Redirect"[^>]*\/>/, ""))).toBe("The metadata has no sign-in URL for the HTTP-Redirect binding");
    expect(refused(okta().replace('use="signing"', 'use="encryption"'))).toBe("The metadata has no signing certificate");
    expect(refused(okta({ ssoUrl: "http://idp.test/sso" }))).toBe("The sign-in URL in the metadata must use https");
    expect(refused(okta({ ssoUrl: "http://idp.test/sso" }), true)).toBe("accepted");
    const one = okta().replace('<?xml version="1.0" encoding="UTF-8"?>', "");
    expect(refused(`<EntitiesDescriptor xmlns="urn:oasis:names:tc:SAML:2.0:metadata">${one}${one}</EntitiesDescriptor>`)).toBe("The metadata describes several entities: paste your identity provider's metadata for Visua only");
    expect(refused(okta().replace('<?xml version="1.0" encoding="UTF-8"?>', '<!DOCTYPE x [<!ENTITY boom "boom">]>'))).toBe("The metadata must not contain a DOCTYPE");
    expect(refused("<md:EntityDescriptor")).toBe("The metadata is not well-formed XML");
    expect(refused(okta().replace(/<md:IDPSSODescriptor[\s\S]*<\/md:IDPSSODescriptor>/, ""))).toBe("The metadata describes no identity provider (IDPSSODescriptor)");
    expect(refused(" ".repeat(262_145))).toBe("The metadata is larger than 256 KB");
  });
});

describe("certificate standing", () => {
  const at = Date.parse("2026-09-27T00:00:00Z");
  it("warns 30 days ahead and after expiry", () => {
    expect(certificateStanding("2026-12-31T00:00:00Z", at)).toBe("valid");
    expect(certificateStanding("2026-10-20T00:00:00Z", at)).toBe("expiring");
    expect(certificateStanding("2026-09-26T00:00:00Z", at)).toBe("expired");
  });
});

describe("what Visua checks beyond node-saml", () => {
  const base = { issuer: ENTITY, audience: "https://visua.test/api/auth/saml/sso_1", acs: ACS, nameId: "ada@acme.example", inResponseTo: "_req1" };

  it("accepts SHA-256 signatures and refuses SHA-1, a DOCTYPE and encrypted assertions", () => {
    expect(precheckResponse(decoded(response({ issuer: ENTITY, acs: ACS, inResponseTo: "_req1" }, sign(assertion(base)))))).toBeUndefined();
    expect(precheckResponse(decoded(response({ issuer: ENTITY, acs: ACS, inResponseTo: "_req1" }, sign(assertion(base), "a", "sha1"))))).toBe(
      "The SAML response is signed with an algorithm Visua does not accept: use RSA-SHA256",
    );
    expect(precheckResponse(`<!DOCTYPE r [<!ENTITY a "a">]><r/>`)).toBe("The SAML response contains a DOCTYPE");
    expect(precheckResponse("<samlp:Response")).toBe("The SAML response is not well-formed XML");
    expect(precheckResponse(decoded(encryptedResponse({ issuer: ENTITY, acs: ACS, inResponseTo: "_req1" })))).toBe(
      "Encrypted assertions are not supported: turn assertion encryption off for Visua in your identity provider",
    );
  });

  it("requires the assertion itself to answer the request, at Visua's ACS", () => {
    const signed = sign(assertion(base));
    expect(assertionAnswers(signed, "_req1", ACS)).toBe(true);
    expect(assertionAnswers(signed, "_req2", ACS)).toBe(false);
    expect(assertionAnswers(signed, "_req1", "https://elsewhere.test/acs")).toBe(false);
    expect(assertionAnswers(sign(assertion({ ...base, inResponseTo: null })), "_req1", ACS)).toBe(false);
  });

  it("reads the email from an email NameID, else from the usual attributes, and the name", () => {
    const p = (fields: Record<string, unknown>) => ({ issuer: ENTITY, nameID: "", nameIDFormat: "", ...fields });
    expect(samlIdentity(p({ nameID: "Ada@Acme.example", nameIDFormat: "urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress", displayName: "Ada Lovelace" }))).toEqual({
      subject: "Ada@Acme.example",
      email: "ada@acme.example",
      name: "Ada Lovelace",
    });
    expect(samlIdentity(p({ nameID: "grace@acme.example", nameIDFormat: "urn:oasis:names:tc:SAML:1.1:nameid-format:unspecified", givenName: "Grace", sn: "Hopper" }))).toEqual({
      subject: "grace@acme.example",
      email: "grace@acme.example",
      name: "Grace Hopper",
    });
    const claims = "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/";
    expect(
      samlIdentity(p({ nameID: "00u1abc", nameIDFormat: "urn:oasis:names:tc:SAML:2.0:nameid-format:persistent", [`${claims}emailaddress`]: "Ann@Acme.example", [`${claims}givenname`]: "Ann", [`${claims}surname`]: "Lee" })),
    ).toEqual({ subject: "00u1abc", email: "ann@acme.example", name: "Ann Lee" });
    expect(samlIdentity(p({ nameID: "someone@acme.example", nameIDFormat: "urn:oasis:names:tc:SAML:2.0:nameid-format:persistent", mail: ["m@acme.example", "x@acme.example"] }))).toEqual({
      subject: "someone@acme.example",
      email: "m@acme.example",
      name: undefined,
    });
    expect(samlIdentity(p({ nameID: "00u2", nameIDFormat: "urn:oasis:names:tc:SAML:2.0:nameid-format:persistent" }))).toEqual({ subject: "00u2", email: undefined, name: undefined });
  });
});
