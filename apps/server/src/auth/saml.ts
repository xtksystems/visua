/**
 * SAML 2.0 pieces that need no database: reading an identity provider's metadata, the checks
 * Visua adds to node-saml's validation, and the identity a verified assertion names.
 *
 * What node-saml 5.1.0 leaves to Visua: it accepts SHA-1 signatures, and it matches a response
 * to its request by the Response's InResponseTo, which a provider that signs only the assertion
 * does not sign. Visua refuses SHA-1 before the library runs and requires the verified assertion
 * itself to answer the request (assertionAnswers).
 */
import { X509Certificate } from "node:crypto";
import type { Profile } from "@node-saml/node-saml";
import { DOMParser } from "@xmldom/xmldom";
import { ValidationError } from "../services/visua.ts";
import type { SamlCertificate, SamlIdp } from "../storage/index.ts";

const MD = "urn:oasis:names:tc:SAML:2.0:metadata";
const DS = "http://www.w3.org/2000/09/xmldsig#";
const ASSERTION = "urn:oasis:names:tc:SAML:2.0:assertion";
const REDIRECT_BINDING = "urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Redirect";
const BEARER = "urn:oasis:names:tc:SAML:2.0:cm:bearer";
export const NAMEID_EMAIL = "urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress";
const NAMEID_UNSPECIFIED = "urn:oasis:names:tc:SAML:1.1:nameid-format:unspecified";
/** Pasted metadata is refused above 256 KB. */
export const METADATA_MAX = 256 * 1024;
const SIGNATURE_METHODS = new Set(["http://www.w3.org/2001/04/xmldsig-more#rsa-sha256", "http://www.w3.org/2001/04/xmldsig-more#rsa-sha512"]);
const DIGEST_METHODS = new Set(["http://www.w3.org/2001/04/xmlenc#sha256", "http://www.w3.org/2001/04/xmlenc#sha512"]);
const CLAIMS = "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/";
const EMAIL_ATTRIBUTES = ["email", "mail", `${CLAIMS}emailaddress`];
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DAY = 86_400_000;

/** Untrusted XML: a DOCTYPE (entity expansion) or any parser error refuses it. */
function readXml(xml: string): Document | "doctype" | undefined {
  if (/<!DOCTYPE/i.test(xml)) return "doctype";
  let failed = false;
  const fail = () => void (failed = true);
  const doc = new DOMParser({ errorHandler: { warning: () => undefined, error: fail, fatalError: fail } }).parseFromString(xml, "text/xml");
  return failed || !doc?.documentElement ? undefined : doc;
}
const all = (root: Document | Element, ns: string, name: string): Element[] => Array.from(root.getElementsByTagNameNS(ns, name));
const children = (parent: Element, ns: string, name: string): Element[] =>
  Array.from(parent.childNodes).filter((n): n is Element => n.nodeType === 1 && (n as Element).namespaceURI === ns && (n as Element).localName === name);
const attr = (el: Element, name: string) => (el.getAttribute(name) ?? "").trim();

function readCertificate(base64: string): SamlCertificate {
  const body = base64.replace(/\s+/g, "");
  const pem = `-----BEGIN CERTIFICATE-----\n${(body.match(/.{1,64}/g) ?? []).join("\n")}\n-----END CERTIFICATE-----\n`;
  let x509: X509Certificate;
  try {
    x509 = new X509Certificate(pem);
  } catch {
    throw new ValidationError("A signing certificate in the metadata could not be read");
  }
  return { pem, notAfter: new Date(x509.validTo).toISOString(), fingerprint: x509.fingerprint256 };
}

/** Read pasted identity provider metadata: its entity ID, redirect sign-in URL and signing certificates. */
export function parseIdpMetadata(xml: string, opts: { allowHttp: boolean }): SamlIdp {
  if (xml.length > METADATA_MAX) throw new ValidationError("The metadata is larger than 256 KB");
  const doc = readXml(xml);
  if (doc === "doctype") throw new ValidationError("The metadata must not contain a DOCTYPE");
  if (!doc) throw new ValidationError("The metadata is not well-formed XML");
  const entities = all(doc, MD, "EntityDescriptor");
  if (entities.length !== 1) throw new ValidationError(entities.length ? "The metadata describes several entities: paste your identity provider's metadata for Visua only" : "The metadata has no EntityDescriptor");
  const entity = entities[0]!;
  const entityId = attr(entity, "entityID");
  if (!entityId) throw new ValidationError("The metadata has no entity ID");
  const idp = children(entity, MD, "IDPSSODescriptor")[0];
  if (!idp) throw new ValidationError("The metadata describes no identity provider (IDPSSODescriptor)");
  const service = children(idp, MD, "SingleSignOnService").find((s) => attr(s, "Binding") === REDIRECT_BINDING);
  if (!service || !attr(service, "Location")) throw new ValidationError("The metadata has no sign-in URL for the HTTP-Redirect binding");
  let ssoUrl: URL;
  try {
    ssoUrl = new URL(attr(service, "Location"));
  } catch {
    throw new ValidationError("The sign-in URL in the metadata is not a URL");
  }
  if (ssoUrl.protocol !== "https:" && !(ssoUrl.protocol === "http:" && opts.allowHttp)) throw new ValidationError("The sign-in URL in the metadata must use https");
  const certificates: SamlCertificate[] = [];
  for (const key of children(idp, MD, "KeyDescriptor")) {
    const use = attr(key, "use");
    if (use && use !== "signing") continue;
    for (const node of all(key, DS, "X509Certificate")) {
      const cert = readCertificate(node.textContent ?? "");
      if (!certificates.some((c) => c.fingerprint === cert.fingerprint)) certificates.push(cert);
    }
  }
  if (!certificates.length) throw new ValidationError("The metadata has no signing certificate");
  return { entityId, ssoUrl: ssoUrl.href, certificates };
}

export type CertificateStanding = "valid" | "expiring" | "expired";

/** A signing certificate expiring within 30 days, or expired, is shown with a warning. */
export function certificateStanding(notAfter: string, at = Date.now()): CertificateStanding {
  const t = Date.parse(notAfter);
  return t <= at ? "expired" : t - at <= 30 * DAY ? "expiring" : "valid";
}

/**
 * Checks on a decoded response before node-saml sees it: well-formed XML without a DOCTYPE, no
 * encrypted assertion (not supported), and only SHA-256/512 signatures and digests. Returns why
 * the response is refused, or undefined.
 */
export function precheckResponse(xml: string): string | undefined {
  const doc = readXml(xml);
  if (doc === "doctype") return "The SAML response contains a DOCTYPE";
  if (!doc) return "The SAML response is not well-formed XML";
  if (all(doc, ASSERTION, "EncryptedAssertion").length) return "Encrypted assertions are not supported: turn assertion encryption off for Visua in your identity provider";
  if (all(doc, DS, "SignatureMethod").some((m) => !SIGNATURE_METHODS.has(attr(m, "Algorithm")))) return "The SAML response is signed with an algorithm Visua does not accept: use RSA-SHA256";
  if (all(doc, DS, "DigestMethod").some((m) => !DIGEST_METHODS.has(attr(m, "Algorithm")))) return "The SAML response uses a digest Visua does not accept: use SHA-256";
  return undefined;
}

/**
 * Whether a verified assertion itself answers Visua's request: a bearer SubjectConfirmationData
 * naming the request and the connection's ACS (SAML profiles §4.1.4.2).
 */
export function assertionAnswers(assertionXml: string, requestId: string, acsUrl: string): boolean {
  const doc = readXml(assertionXml);
  if (!doc || doc === "doctype") return false;
  return all(doc, ASSERTION, "SubjectConfirmation").some(
    (sc) => attr(sc, "Method") === BEARER && children(sc, ASSERTION, "SubjectConfirmationData").some((d) => attr(d, "InResponseTo") === requestId && attr(d, "Recipient") === acsUrl),
  );
}

const first = (v: unknown): string | undefined => {
  const x = Array.isArray(v) ? v[0] : v;
  return typeof x === "string" && x.trim() ? x.trim() : undefined;
};

/**
 * The person a verified assertion names: the NameID as subject; the email from an emailAddress
 * (or unspecified) NameID that looks like an address, else the first of the usual attributes;
 * the name from displayName, else given name and surname.
 */
export function samlIdentity(profile: Profile): { subject: string; email?: string; name?: string } {
  const subject = (profile.nameID ?? "").trim();
  const format = profile.nameIDFormat ?? "";
  const nameIdIsEmail = EMAIL.test(subject) && (!format || format === NAMEID_EMAIL || format === NAMEID_UNSPECIFIED);
  const email = (nameIdIsEmail ? subject : EMAIL_ATTRIBUTES.map((a) => first(profile[a])).find((v) => !!v && EMAIL.test(v)))?.toLowerCase();
  const given = first(profile["givenName"]) ?? first(profile[`${CLAIMS}givenname`]);
  const family = first(profile["sn"]) ?? first(profile["surname"]) ?? first(profile[`${CLAIMS}surname`]);
  const name = first(profile["displayName"]) ?? ([given, family].filter(Boolean).join(" ") || undefined);
  return { subject, email, name };
}
