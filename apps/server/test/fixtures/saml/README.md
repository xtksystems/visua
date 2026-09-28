# SAML test fixtures

Keys and self-signed certificates generated for Visua's SAML tests by `generate.sh`
(RSA 2048, valid 20 years). `idp-a` and `idp-b` are the test provider's signing keys
(rotation), `rogue` is a key no connection trusts. `okta-metadata.xml` is what the
end-to-end test pastes. They protect nothing: never use them outside the tests.
