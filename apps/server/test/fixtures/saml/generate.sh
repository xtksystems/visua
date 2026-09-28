#!/bin/sh
# Regenerates the SAML test-only keys and certificates (valid 20 years) and the metadata the
# end-to-end test pastes. These keys sign test responses only: never use them anywhere else.
set -eu
cd "$(dirname "$0")"
for name in idp-a idp-b rogue; do
  openssl req -x509 -newkey rsa:2048 -nodes -sha256 -days 7300 -subj "/CN=Visua SAML test ($name)" -keyout "$name.key" -out "$name.crt" 2>/dev/null
done
cert=$(grep -v -- '-----' idp-a.crt | tr -d '\n')
cat > okta-metadata.xml <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<md:EntityDescriptor xmlns:md="urn:oasis:names:tc:SAML:2.0:metadata" entityID="http://www.okta.com/exkVisuaE2E">
  <md:IDPSSODescriptor WantAuthnRequestsSigned="false" protocolSupportEnumeration="urn:oasis:names:tc:SAML:2.0:protocol">
    <md:KeyDescriptor use="signing"><ds:KeyInfo xmlns:ds="http://www.w3.org/2000/09/xmldsig#"><ds:X509Data><ds:X509Certificate>$cert</ds:X509Certificate></ds:X509Data></ds:KeyInfo></md:KeyDescriptor>
    <md:NameIDFormat>urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress</md:NameIDFormat>
    <md:SingleSignOnService Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST" Location="https://idp.test/app/visua/sso/saml"/>
    <md:SingleSignOnService Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Redirect" Location="https://idp.test/app/visua/sso/saml"/>
  </md:IDPSSODescriptor>
</md:EntityDescriptor>
EOF
