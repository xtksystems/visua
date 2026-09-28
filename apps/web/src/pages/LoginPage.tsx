/**
 * Sign-in. Organizations with their own identity provider are found from the
 * email domain; a platform identity provider may also be offered. Developer
 * mode (local use and demos only) adds one-click personas.
 */
import { ArrowRight, KeyRound, ShieldAlert, UserRound } from "lucide-react";
import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Logo, Toasts } from "../components/ui/index.tsx";
import { api, ApiError, setCsrfToken } from "../lib/api.ts";
import { ROLE_NAMES, useAuthConfig, useResetSession, type Me } from "../lib/auth.ts";

const safe = (to: string | null) => (to && to.startsWith("/") && !to.startsWith("//") ? to : "/");
const startUrl = (connection: string, returnTo: string, protocol: "oidc" | "saml" = "oidc") =>
  `/api/auth/${protocol}/start?connection=${encodeURIComponent(connection)}&returnTo=${encodeURIComponent(returnTo)}`;

export function LoginPage() {
  const [params] = useSearchParams();
  const returnTo = safe(params.get("returnTo"));
  const config = useAuthConfig();
  const reset = useResetSession();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [devEmail, setDevEmail] = useState("");
  const [devName, setDevName] = useState("");
  const [error, setError] = useState(params.get("error") ?? "");
  const [busy, setBusy] = useState(false);

  const continueWithSso = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const found = await api.post<{ connection: string; protocol?: "oidc" | "saml" }>("/auth/sso/discover", { email });
      window.location.assign(startUrl(found.connection, returnTo, found.protocol));
    } catch (err) {
      setError(err instanceof ApiError && err.status === 404 ? "There is no single sign-on for this address. Ask your administrator how your organization signs in to Visua." : (err as Error).message);
      setBusy(false);
    }
  };

  const devSignIn = async (address: string, name?: string) => {
    setError("");
    setBusy(true);
    try {
      const me = await api.post<Me>("/auth/dev/login", { email: address, name: name || undefined });
      setCsrfToken(me.csrf);
      await reset();
      navigate(returnTo, { replace: true });
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  };

  const cfg = config.data;
  return (
    <div className="login">
      <main className="login__card panel" aria-labelledby="login-title">
        <div className="row" style={{ gap: 12 }}>
          <Logo size={40} />
          <div>
            <div className="eyebrow">Visua</div>
            <h1 id="login-title" style={{ margin: 0 }}>
              Sign in
            </h1>
          </div>
        </div>
        <p className="muted" style={{ margin: 0 }}>
          The spatial, AI-first compliance workspace. Your organization decides how you sign in and what you can do.
        </p>

        {error && (
          <div className="login__error" role="alert">
            <ShieldAlert size={16} aria-hidden />
            <span>{error}</span>
          </div>
        )}

        <form className="stack" style={{ gap: 10 }} onSubmit={continueWithSso}>
          <div className="field">
            <label htmlFor="login-email">Work email</label>
            <input id="login-email" className="input" type="email" autoComplete="email" required placeholder="you@company.com" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <button className="btn btn--primary" type="submit" disabled={busy || !email.includes("@")}>
            <KeyRound size={15} aria-hidden /> Continue with single sign-on <ArrowRight size={15} aria-hidden />
          </button>
        </form>

        {cfg?.platform && (
          <button className="btn" onClick={() => window.location.assign(startUrl("platform", returnTo))} disabled={busy}>
            Continue with {cfg.platform.name}
          </button>
        )}

        {cfg?.mode === "dev" && (
          <section className="stack login__dev" aria-labelledby="dev-title" style={{ gap: 10 }}>
            <div>
              <h2 id="dev-title" className="section-title" style={{ margin: 0 }}>
                Developer sign-in
              </h2>
              <p className="field__hint" style={{ margin: "4px 0 0" }}>
                No password: for local use and demos only. Production servers run with <span className="mono">VISUA_AUTH_MODE=oidc</span>.
              </p>
            </div>
            {!!cfg.personas.length && (
              <ul className="login__personas" aria-label="Demo personas">
                {cfg.personas.map((p) => (
                  <li key={p.email}>
                    <button className="login__persona" onClick={() => void devSignIn(p.email)} disabled={busy}>
                      <span className="login__avatar" aria-hidden>
                        {initials(p.name)}
                      </span>
                      <span className="stack" style={{ gap: 2, minWidth: 0, alignItems: "flex-start" }}>
                        <span style={{ fontWeight: 600 }}>{p.name}</span>
                        <span className="muted" style={{ fontSize: 12 }}>
                          {p.organizations.map((o) => `${ROLE_NAMES[o.role]} · ${o.name}`).join(" — ")}
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <form
              className="row row--wrap"
              style={{ gap: 8, alignItems: "flex-end" }}
              onSubmit={(e) => {
                e.preventDefault();
                void devSignIn(devEmail, devName);
              }}
            >
              <div className="field" style={{ flex: "1 1 180px" }}>
                <label htmlFor="dev-email">Email</label>
                <input id="dev-email" className="input" type="email" required value={devEmail} onChange={(e) => setDevEmail(e.target.value)} placeholder="you@example.com" />
              </div>
              <div className="field" style={{ flex: "1 1 140px" }}>
                <label htmlFor="dev-name">Name</label>
                <input id="dev-name" className="input" value={devName} onChange={(e) => setDevName(e.target.value)} placeholder="Optional" />
              </div>
              <button className="btn" type="submit" disabled={busy || !devEmail.includes("@")}>
                <UserRound size={15} aria-hidden /> Sign in
              </button>
            </form>
          </section>
        )}
      </main>
      <Toasts />
    </div>
  );
}

export const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("") || "?";
