/**
 * Identity provider metadata shaped like Okta's, Microsoft Entra ID's and AD FS's, written
 * for the tests around the test-only certificates (fixtures/saml). No dependencies.
 */
export const certBody = (pem: string) => pem.replace(/-----[^-]+-----/g, "").replace(/\s+/g, "");
const MD = "urn:oasis:names:tc:SAML:2.0:metadata";
const DS = "http://www.w3.org/2000/09/xmldsig#";
const REDIRECT = "urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Redirect";
const POST = "urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST";
/** A KeyDescriptor in the default (metadata) namespace. */
const key = (pem: string, use?: "signing" | "encryption") =>
  `<KeyDescriptor${use ? ` use="${use}"` : ""}><KeyInfo xmlns="${DS}"><X509Data><X509Certificate>${certBody(pem)}</X509Certificate></X509Data></KeyInfo></KeyDescriptor>`;

/** Okta: prefixed md:/ds:, one signing key per KeyDescriptor, POST and Redirect sign-in. */
export function oktaMetadata(o: { entityId: string; ssoUrl: string; certs: string[] }): string {
  const keys = o.certs.map((c) => `<md:KeyDescriptor use="signing"><ds:KeyInfo xmlns:ds="${DS}"><ds:X509Data><ds:X509Certificate>${certBody(c)}</ds:X509Certificate></ds:X509Data></ds:KeyInfo></md:KeyDescriptor>`).join("");
  return (
    `<?xml version="1.0" encoding="UTF-8"?><md:EntityDescriptor xmlns:md="${MD}" entityID="${o.entityId}">` +
    `<md:IDPSSODescriptor WantAuthnRequestsSigned="false" protocolSupportEnumeration="urn:oasis:names:tc:SAML:2.0:protocol">${keys}` +
    `<md:NameIDFormat>urn:oasis:names:tc:SAML:1.1:nameid-format:unspecified</md:NameIDFormat><md:NameIDFormat>urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress</md:NameIDFormat>` +
    `<md:SingleSignOnService Binding="${POST}" Location="${o.ssoUrl}"/><md:SingleSignOnService Binding="${REDIRECT}" Location="${o.ssoUrl}"/>` +
    `</md:IDPSSODescriptor></md:EntityDescriptor>`
  );
}

/**
 * Entra ID: default namespace, a signed EntityDescriptor (its Signature carries a certificate
 * that is not a signing key of the IdP role), a WS-Federation RoleDescriptor with its own key,
 * and IdP keys with and without `use`.
 */
export function entraMetadata(o: { entityId: string; ssoUrl: string; certs: string[]; metadataSigner: string }): string {
  return (
    `<?xml version="1.0" encoding="utf-8"?><EntityDescriptor ID="_entra" entityID="${o.entityId}" xmlns="${MD}">` +
    `<Signature xmlns="${DS}"><SignedInfo><CanonicalizationMethod Algorithm="http://www.w3.org/2001/10/xml-exc-c14n#"/><SignatureMethod Algorithm="http://www.w3.org/2001/04/xmldsig-more#rsa-sha256"/>` +
    `<Reference URI="#_entra"><DigestMethod Algorithm="http://www.w3.org/2001/04/xmlenc#sha256"/><DigestValue>AAAA</DigestValue></Reference></SignedInfo><SignatureValue>AAAA</SignatureValue>` +
    `<KeyInfo><X509Data><X509Certificate>${certBody(o.metadataSigner)}</X509Certificate></X509Data></KeyInfo></Signature>` +
    `<RoleDescriptor xsi:type="fed:SecurityTokenServiceType" protocolSupportEnumeration="http://docs.oasis-open.org/wsfed/federation/200706" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:fed="http://docs.oasis-open.org/wsfed/federation/200706">${key(o.metadataSigner, "signing")}</RoleDescriptor>` +
    `<IDPSSODescriptor protocolSupportEnumeration="urn:oasis:names:tc:SAML:2.0:protocol">${o.certs.map((c, i) => key(c, i === 0 ? "signing" : undefined)).join("")}` +
    `<SingleLogoutService Binding="${REDIRECT}" Location="${o.ssoUrl}"/><SingleSignOnService Binding="${REDIRECT}" Location="${o.ssoUrl}"/><SingleSignOnService Binding="${POST}" Location="${o.ssoUrl}"/>` +
    `</IDPSSODescriptor></EntityDescriptor>`
  );
}

/** AD FS: an SPSSODescriptor with its own keys, and an IdP role with an encryption and a signing key. */
export function adfsMetadata(o: { entityId: string; ssoUrl: string; signingCert: string; otherCert: string }): string {
  return (
    `<?xml version="1.0" encoding="utf-8"?><EntityDescriptor ID="_adfs" entityID="${o.entityId}" xmlns="${MD}">` +
    `<SPSSODescriptor WantAssertionsSigned="true" protocolSupportEnumeration="urn:oasis:names:tc:SAML:2.0:protocol">${key(o.otherCert, "signing")}<AssertionConsumerService Binding="${POST}" Location="${o.ssoUrl}" index="0"/></SPSSODescriptor>` +
    `<IDPSSODescriptor protocolSupportEnumeration="urn:oasis:names:tc:SAML:2.0:protocol">${key(o.otherCert, "encryption")}${key(o.signingCert, "signing")}` +
    `<NameIDFormat>urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress</NameIDFormat><SingleSignOnService Binding="${REDIRECT}" Location="${o.ssoUrl}"/><SingleSignOnService Binding="${POST}" Location="${o.ssoUrl}"/>` +
    `</IDPSSODescriptor></EntityDescriptor>`
  );
}
