/**
 * A SAML identity provider for tests: reads Visua's AuthnRequest from its redirect and builds
 * assertions and responses signed with the test-only keys in fixtures/saml. Tests compose the
 * pieces to forge the responses Visua must refuse.
 */
import { randomUUID, X509Certificate } from "node:crypto";
import { readFileSync } from "node:fs";
import { inflateRawSync } from "node:zlib";
import { signXml } from "@node-saml/node-saml/lib/xml.js";
import { DOMParser } from "@xmldom/xmldom";

const fixture = (name: string) => readFileSync(new URL(`./fixtures/saml/${name}`, import.meta.url), "utf8");
export const KEYS = {
  a: { key: fixture("idp-a.key"), cert: fixture("idp-a.crt") },
  b: { key: fixture("idp-b.key"), cert: fixture("idp-b.crt") },
  rogue: { key: fixture("rogue.key"), cert: fixture("rogue.crt") },
};
export type TestKey = keyof typeof KEYS;
export const fingerprint = (k: TestKey) => new X509Certificate(KEYS[k].cert).fingerprint256;

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const EMAIL_FORMAT = "urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress";

export interface AssertionOptions {
  issuer: string;
  audience: string;
  acs: string;
  nameId: string;
  nameIdFormat?: string;
  /** The request the assertion answers (in its SubjectConfirmationData); null leaves it out. */
  inResponseTo: string | null;
  attributes?: Record<string, string>;
  issuedAt?: Date;
  notBefore?: Date;
  notOnOrAfter?: Date;
}

/** An unsigned assertion. */
export function assertion(o: AssertionOptions): string {
  const issued = o.issuedAt ?? new Date();
  const notBefore = o.notBefore ?? new Date(issued.getTime() - 30_000);
  const until = o.notOnOrAfter ?? new Date(issued.getTime() + 5 * 60_000);
  const attributes = Object.entries(o.attributes ?? {})
    .map(([name, value]) => `<saml:Attribute Name="${esc(name)}"><saml:AttributeValue>${esc(value)}</saml:AttributeValue></saml:Attribute>`)
    .join("");
  return (
    `<saml:Assertion xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion" ID="_a${randomUUID()}" Version="2.0" IssueInstant="${issued.toISOString()}">` +
    `<saml:Issuer>${esc(o.issuer)}</saml:Issuer>` +
    `<saml:Subject><saml:NameID Format="${esc(o.nameIdFormat ?? EMAIL_FORMAT)}">${esc(o.nameId)}</saml:NameID>` +
    `<saml:SubjectConfirmation Method="urn:oasis:names:tc:SAML:2.0:cm:bearer"><saml:SubjectConfirmationData${o.inResponseTo === null ? "" : ` InResponseTo="${esc(o.inResponseTo)}"`} NotOnOrAfter="${until.toISOString()}" Recipient="${esc(o.acs)}"/></saml:SubjectConfirmation></saml:Subject>` +
    `<saml:Conditions NotBefore="${notBefore.toISOString()}" NotOnOrAfter="${until.toISOString()}"><saml:AudienceRestriction><saml:Audience>${esc(o.audience)}</saml:Audience></saml:AudienceRestriction></saml:Conditions>` +
    `<saml:AuthnStatement AuthnInstant="${issued.toISOString()}" SessionIndex="_s${randomUUID()}"><saml:AuthnContext><saml:AuthnContextClassRef>urn:oasis:names:tc:SAML:2.0:ac:classes:PasswordProtectedTransport</saml:AuthnContextClassRef></saml:AuthnContext></saml:AuthnStatement>` +
    (attributes ? `<saml:AttributeStatement>${attributes}</saml:AttributeStatement>` : "") +
    `</saml:Assertion>`
  );
}

/** Sign an assertion (enveloped signature after its Issuer, as providers do). */
export function sign(xml: string, key: TestKey = "a", algorithm: "sha256" | "sha1" = "sha256"): string {
  return signXml(
    xml,
    "//*[local-name(.)='Assertion']",
    { reference: "//*[local-name(.)='Assertion']/*[local-name(.)='Issuer']", action: "after" },
    { privateKey: KEYS[key].key, publicCert: KEYS[key].cert, signatureAlgorithm: algorithm, digestAlgorithm: algorithm },
  );
}

/** A Response around the given assertions, base64 as the browser posts it. `inResponseTo: null` leaves it out (IdP-initiated). */
export function response(o: { issuer: string; acs: string; inResponseTo: string | null }, ...assertions: string[]): string {
  const xml =
    `<samlp:Response xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol" ID="_r${randomUUID()}" Version="2.0" IssueInstant="${new Date().toISOString()}" Destination="${esc(o.acs)}"${o.inResponseTo === null ? "" : ` InResponseTo="${esc(o.inResponseTo)}"`}>` +
    `<saml:Issuer xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion">${esc(o.issuer)}</saml:Issuer>` +
    `<samlp:Status><samlp:StatusCode Value="urn:oasis:names:tc:SAML:2.0:status:Success"/></samlp:Status>` +
    assertions.join("") +
    `</samlp:Response>`;
  return Buffer.from(xml).toString("base64");
}

/** A Response carrying an EncryptedAssertion (its content does not matter: Visua refuses it first). */
export function encryptedResponse(o: { issuer: string; acs: string; inResponseTo: string }): string {
  return response(o, `<saml:EncryptedAssertion xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion"><xenc:EncryptedData xmlns:xenc="http://www.w3.org/2001/04/xmlenc#"/></saml:EncryptedAssertion>`);
}

/** The AuthnRequest in Visua's redirect to the provider (HTTP-Redirect binding: deflated, base64). */
export function readRequest(location: string): { id: string; acs: string; issuer: string; url: URL } {
  const url = new URL(location);
  const xml = inflateRawSync(Buffer.from(url.searchParams.get("SAMLRequest") ?? "", "base64")).toString("utf8");
  const request = new DOMParser().parseFromString(xml, "text/xml").documentElement;
  if (!request) throw new Error(`Not an AuthnRequest: ${xml}`);
  return {
    id: request.getAttribute("ID") ?? "",
    acs: request.getAttribute("AssertionConsumerServiceURL") ?? "",
    issuer: request.getElementsByTagNameNS("urn:oasis:names:tc:SAML:2.0:assertion", "Issuer")[0]?.textContent ?? "",
    url,
  };
}
