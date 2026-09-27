/**
 * Onboarding: any niche, any maturity. Four short steps produce a tailored
 * framework path, targets and priorities — with the reasons shown.
 */
import { ArrowLeft, ArrowRight, Check, Sparkles } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { estimateTier, type OrganizationProfile, type Recommendation } from "@visua/core";
import { Toasts, toast } from "../components/ui/index.tsx";
import { api } from "../lib/api.ts";
import type { WorkspaceSummary } from "../lib/types.ts";
import { DATA_TYPES, DRIVERS, INDUSTRIES } from "./SettingsPage.tsx";

const QUICK_CHECK = [
  "Leadership has approved a written information security policy that people follow",
  "Multi-factor authentication is enforced for every workforce account",
  "You keep an up-to-date inventory of hardware, software, cloud services and data",
  "An incident response plan exists and has been exercised in the last year",
  "Backups are protected and restores are tested",
  "Supplier and third-party security risks are assessed before and during engagements",
  "Security events are centrally logged, monitored and triaged",
  "Everyone completes security awareness training at least annually",
];
const ANSWERS = ["Not at all", "Partially", "Mostly", "Fully, and reviewed"];

export function OnboardingPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [profile, setProfile] = useState<OrganizationProfile>({
    industry: "saas",
    size: "11-50",
    dataTypes: ["pii"],
    drivers: ["enterprise-customers"],
    environments: ["cloud"],
    maturityTier: 1,
    guidance: "guided",
    securityTeamSize: 1,
  });
  const [answers, setAnswers] = useState<number[]>(() => QUICK_CHECK.map(() => -1));
  const [rec, setRec] = useState<Recommendation | null>(null);
  const [frameworks, setFrameworks] = useState<string[]>(["nist-csf-2.0"]);
  const [plan, setPlan] = useState(true);
  const [meta, setMeta] = useState<{ id: string }[]>([]);

  useEffect(() => {
    void api.get<{ frameworks: { id: string }[] }>("/meta").then((m) => setMeta(m.frameworks));
  }, []);

  const tier = estimateTier(answers.filter((a) => a >= 0));
  useEffect(() => {
    if (step !== 3) return;
    const p = { ...profile, maturityTier: tier };
    void api.post<Recommendation>("/recommend", p).then((r) => {
      setRec(r);
      setFrameworks(r.frameworks.filter((f) => f.availability === "available" && meta.some((m) => m.id === f.frameworkId)).slice(0, 2).map((f) => f.frameworkId));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  const create = useMutation({
    mutationFn: () => api.post<WorkspaceSummary>("/workspaces", { name, profile: { ...profile, maturityTier: tier }, frameworks, planInitialTasks: plan }),
    onSuccess: (ws) => navigate(`/w/${ws.workspace.slug}`),
    onError: (e) => toast((e as Error).message, "error"),
  });

  const toggle = <T,>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);
  const steps = ["Organization", "Data & drivers", "Maturity", "Your path"];
  const canNext = step === 0 ? name.trim().length > 1 : step === 2 ? answers.every((a) => a >= 0) : true;

  return (
    <div style={{ height: "100%", overflow: "auto" }}>
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "48px 24px" }}>
        <div className="row" style={{ gap: 12, marginBottom: 28 }}>
          <svg width="34" height="34" viewBox="0 0 64 64" aria-hidden>
            <path d="M14 18 L32 48 L50 18" fill="none" stroke="var(--color-primary)" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="32" cy="27" r="5" fill="var(--color-tertiary)" />
          </svg>
          <div>
            <div className="eyebrow">Welcome to Visua</div>
            <h1 style={{ fontFamily: "var(--font-display-lg-family)", fontSize: 30, fontWeight: 600 }}>Set up your compliance observatory</h1>
          </div>
        </div>
        <ol className="row row--wrap" style={{ listStyle: "none", padding: 0, gap: 8, marginBottom: 24 }}>
          {steps.map((s, i) => (
            <li key={s} className="chip" aria-current={i === step ? "step" : undefined} aria-pressed={i === step} style={{ cursor: "default" }}>
              {i < step ? <Check size={12} /> : <span className="mono">{i + 1}</span>} {s}
            </li>
          ))}
        </ol>

        <div className="panel" style={{ padding: 24 }}>
          {step === 0 && (
            <div className="stack" style={{ gap: 16 }}>
              <div className="field">
                <label htmlFor="org">Organization name</label>
                <input id="org" className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Acme Corp" autoFocus />
              </div>
              <div className="field">
                <span className="label">Industry</span>
                <div className="row row--wrap" style={{ gap: 6 }}>
                  {INDUSTRIES.map(([v, l]) => (
                    <button key={v} className="chip" aria-pressed={profile.industry === v} onClick={() => setProfile({ ...profile, industry: v })}>
                      {l}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid--3" style={{ gap: 12 }}>
                <div className="field">
                  <label>People</label>
                  <select className="select" value={profile.size} onChange={(e) => setProfile({ ...profile, size: e.target.value as OrganizationProfile["size"] })}>
                    {["1-10", "11-50", "51-200", "201-1000", "1000+"].map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label>Security team (people)</label>
                  <input className="input" type="number" min={0} value={profile.securityTeamSize} onChange={(e) => setProfile({ ...profile, securityTeamSize: Number(e.target.value) })} />
                </div>
                <div className="field">
                  <span className="label">Environments</span>
                  <div className="row row--wrap" style={{ gap: 6 }}>
                    {(["cloud", "on-prem", "hybrid", "ot"] as const).map((env) => (
                      <button key={env} className="chip" aria-pressed={profile.environments.includes(env)} onClick={() => setProfile({ ...profile, environments: toggle(profile.environments, env) })}>
                        {env === "ot" ? "OT / ICS" : env}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
          {step === 1 && (
            <div className="stack" style={{ gap: 18 }}>
              <div className="field">
                <span className="label">Which data do you handle?</span>
                <div className="row row--wrap" style={{ gap: 6 }}>
                  {DATA_TYPES.map(([v, l]) => (
                    <button key={v} className="chip" aria-pressed={profile.dataTypes.includes(v)} onClick={() => setProfile({ ...profile, dataTypes: toggle(profile.dataTypes, v) })}>
                      {l}
                    </button>
                  ))}
                </div>
              </div>
              <div className="field">
                <span className="label">Why now?</span>
                <div className="row row--wrap" style={{ gap: 6 }}>
                  {DRIVERS.map(([v, l]) => (
                    <button key={v} className="chip" aria-pressed={profile.drivers.includes(v)} onClick={() => setProfile({ ...profile, drivers: toggle(profile.drivers, v) })}>
                      {l}
                    </button>
                  ))}
                </div>
              </div>
              <div className="field">
                <span className="label">How much guidance do you want?</span>
                <div className="row" style={{ gap: 6 }}>
                  <button className="chip" aria-pressed={profile.guidance === "guided"} onClick={() => setProfile({ ...profile, guidance: "guided" })}>
                    Guided — I'm new to this
                  </button>
                  <button className="chip" aria-pressed={profile.guidance === "expert"} onClick={() => setProfile({ ...profile, guidance: "expert" })}>
                    Expert — keep it terse
                  </button>
                </div>
              </div>
            </div>
          )}
          {step === 2 && (
            <div className="stack" style={{ gap: 14 }}>
              <p className="muted">A two-minute quick check. It estimates your starting CSF Tier so targets stay ambitious but reachable. You can take the full Tier assessment later.</p>
              {QUICK_CHECK.map((q, i) => (
                <div key={q} className="stack" style={{ gap: 6 }}>
                  <div style={{ fontWeight: 500 }}>{q}</div>
                  <div className="segmented" role="radiogroup" aria-label={q}>
                    {ANSWERS.map((a, ai) => (
                      <button key={a} role="radio" aria-checked={answers[i] === ai} aria-pressed={answers[i] === ai} onClick={() => setAnswers(answers.map((x, xi) => (xi === i ? ai : x)))}>
                        {a}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
              {answers.every((a) => a >= 0) && (
                <div className="panel panel--raised">
                  Estimated starting point: <strong>CSF Tier {tier}</strong> — {["Partial", "Risk Informed", "Repeatable", "Adaptive"][tier - 1]}.
                </div>
              )}
            </div>
          )}
          {step === 3 && (
            <div className="stack" style={{ gap: 16 }}>
              {!rec && <div className="muted">Composing your path…</div>}
              {rec && (
                <>
                  <p>
                    Visua recommends starting with <strong>NIST CSF 2.0</strong> as your program's foundation, with a default target of <strong>level {rec.defaultTarget}</strong> and <strong>level {rec.elevatedTarget}</strong> for high-priority outcomes.
                  </p>
                  <div className="stack" style={{ gap: 8 }}>
                    {rec.frameworks.map((f) => {
                      const available = f.availability === "available" && meta.some((m) => m.id === f.frameworkId);
                      const on = frameworks.includes(f.frameworkId);
                      return (
                        <label key={f.frameworkId} className="panel panel--raised row" style={{ gap: 12, alignItems: "flex-start", opacity: available ? 1 : 0.6, cursor: available ? "pointer" : "default" }}>
                          <input
                            type="checkbox"
                            disabled={!available || f.frameworkId === "nist-csf-2.0"}
                            checked={on}
                            onChange={() => setFrameworks(toggle(frameworks, f.frameworkId))}
                            style={{ marginTop: 3 }}
                          />
                          <div>
                            <strong>{f.name}</strong> {!available && <span className="chip" style={{ height: 20, cursor: "default" }}>roadmap</span>}
                            <div className="muted" style={{ fontSize: 13 }}>
                              {f.reason}
                            </div>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                  <div>
                    <div className="eyebrow" style={{ marginBottom: 6 }}>
                      Focus first
                    </div>
                    <div className="row row--wrap" style={{ gap: 6 }}>
                      {rec.focus.map((c) => (
                        <span key={c} className="code" style={{ cursor: "default" }}>
                          {c}
                        </span>
                      ))}
                    </div>
                  </div>
                  <details>
                    <summary className="eyebrow" style={{ cursor: "pointer" }}>
                      Why
                    </summary>
                    <ul className="muted" style={{ fontSize: 13, lineHeight: 1.55, paddingLeft: 18 }}>
                      {rec.rationale.map((r) => (
                        <li key={r}>{r}</li>
                      ))}
                    </ul>
                  </details>
                  <label className="row" style={{ gap: 8 }}>
                    <input type="checkbox" checked={plan} onChange={(e) => setPlan(e.target.checked)} /> Generate an initial action plan from NIST's official implementation examples
                  </label>
                </>
              )}
            </div>
          )}
          <div className="row" style={{ marginTop: 24 }}>
            {step > 0 && (
              <button className="btn" onClick={() => setStep(step - 1)}>
                <ArrowLeft size={14} /> Back
              </button>
            )}
            <span style={{ flex: 1 }} />
            {step < 3 ? (
              <button className="btn btn--primary" disabled={!canNext} onClick={() => setStep(step + 1)}>
                Continue <ArrowRight size={14} />
              </button>
            ) : (
              <button className="btn btn--primary" disabled={!rec || create.isPending} onClick={() => create.mutate()}>
                <Sparkles size={14} /> Create workspace
              </button>
            )}
          </div>
        </div>
      </div>
      <Toasts />
    </div>
  );
}
