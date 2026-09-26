/**
 * A minimal OpenID Connect provider for tests: discovery, JWKS, an
 * authorization endpoint that signs in whoever the test chose, and a token
 * endpoint that checks the code, redirect URI, client secret and PKCE
 * verifier before issuing an RS256-signed ID token.
 */
import { createHash, generateKeyPairSync, randomBytes, sign } from "node:crypto";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import type { AddressInfo } from "node:net";

export interface IdpUser {
  sub: string;
  email?: string;
  email_verified?: boolean;
  name?: string;
}

const b64 = (v: string | Buffer) => Buffer.from(v).toString("base64url");

export async function startMockIdp(clientId = "visua-test", clientSecret = "test-secret-value") {
  const { publicKey, privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
  const jwk = { ...publicKey.export({ format: "jwk" }), kid: "test-key", alg: "RS256", use: "sig" };
  const codes = new Map<string, { user: IdpUser; nonce: string; challenge: string; redirect: string }>();
  let next: IdpUser | undefined;
  let issuer = "";

  const send = (res: ServerResponse, status: number, body: unknown) => {
    res.writeHead(status, { "content-type": "application/json" });
    res.end(JSON.stringify(body));
  };
  const read = (req: IncomingMessage) =>
    new Promise<string>((resolve) => {
      let data = "";
      req.on("data", (c: Buffer) => (data += c.toString()));
      req.on("end", () => resolve(data));
    });
  const jwt = (claims: Record<string, unknown>) => {
    const head = b64(JSON.stringify({ alg: "RS256", kid: "test-key", typ: "JWT" }));
    const body = b64(JSON.stringify(claims));
    return `${head}.${body}.${sign("RSA-SHA256", Buffer.from(`${head}.${body}`), privateKey).toString("base64url")}`;
  };

  const server = createServer(async (req, res) => {
    const url = new URL(req.url ?? "/", issuer);
    if (url.pathname === "/.well-known/openid-configuration") {
      return send(res, 200, {
        issuer,
        authorization_endpoint: `${issuer}/authorize`,
        token_endpoint: `${issuer}/token`,
        jwks_uri: `${issuer}/jwks`,
        response_types_supported: ["code"],
        subject_types_supported: ["public"],
        id_token_signing_alg_values_supported: ["RS256"],
        code_challenge_methods_supported: ["S256"],
        token_endpoint_auth_methods_supported: ["client_secret_post"],
        scopes_supported: ["openid", "email", "profile"],
      });
    }
    if (url.pathname === "/jwks") return send(res, 200, { keys: [jwk] });
    if (url.pathname === "/authorize") {
      const p = url.searchParams;
      if (p.get("client_id") !== clientId || p.get("response_type") !== "code" || p.get("code_challenge_method") !== "S256") return send(res, 400, { error: "invalid_request" });
      if (!next) return send(res, 400, { error: "no user chosen by the test" });
      const code = randomBytes(16).toString("hex");
      codes.set(code, { user: next, nonce: p.get("nonce") ?? "", challenge: p.get("code_challenge") ?? "", redirect: p.get("redirect_uri") ?? "" });
      res.writeHead(302, { location: `${p.get("redirect_uri")}?code=${code}&state=${encodeURIComponent(p.get("state") ?? "")}` });
      return res.end();
    }
    if (url.pathname === "/token" && req.method === "POST") {
      const form = new URLSearchParams(await read(req));
      const entry = codes.get(form.get("code") ?? "");
      codes.delete(form.get("code") ?? "");
      if (!entry) return send(res, 400, { error: "invalid_grant" });
      if (form.get("client_id") !== clientId || form.get("client_secret") !== clientSecret) return send(res, 401, { error: "invalid_client" });
      if (form.get("redirect_uri") !== entry.redirect) return send(res, 400, { error: "invalid_grant", error_description: "redirect_uri mismatch" });
      const verifier = form.get("code_verifier") ?? "";
      if (createHash("sha256").update(verifier).digest("base64url") !== entry.challenge) return send(res, 400, { error: "invalid_grant", error_description: "PKCE verification failed" });
      const now = Math.floor(Date.now() / 1000);
      return send(res, 200, {
        access_token: randomBytes(16).toString("hex"),
        token_type: "Bearer",
        expires_in: 300,
        id_token: jwt({ iss: issuer, aud: clientId, iat: now, exp: now + 300, nonce: entry.nonce, ...entry.user }),
      });
    }
    send(res, 404, { error: "not_found" });
  });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", () => r()));
  issuer = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;

  return {
    issuer,
    clientId,
    clientSecret,
    /** The identity the next authorization request signs in. */
    signInAs(user: IdpUser | undefined) {
      next = user;
    },
    /** Follow the authorization redirect like a browser would; returns the callback path + query. */
    async authorize(location: string): Promise<string> {
      const res = await fetch(location, { redirect: "manual" });
      const to = res.headers.get("location");
      if (!to) throw new Error(`The mock IdP refused: ${res.status} ${await res.text()}`);
      const u = new URL(to);
      return `${u.pathname}${u.search}`;
    },
    close: () => new Promise<void>((r) => server.close(() => r())),
  };
}
