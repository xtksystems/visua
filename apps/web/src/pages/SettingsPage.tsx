/** Workspace settings: organization profile, frameworks, agent autonomy, AI engine. */
import { Globe, Sparkles, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import type { OrganizationProfile, ProposalType } from "@visua/core";
import { AgentBadge, FrameworkBadge, toast } from "../components/ui/index.tsx";
import { api } from "../lib/api.ts";
import { useCan } from "../lib/auth.ts";
import { useMeta, useWorkspace, useWsMutation } from "../lib/queries.ts";

export const INDUSTRIES: [OrganizationProfile["industry"], string][] = [
  ["saas", "SaaS / software"],
  ["fintech", "Fintech & financial services"],
  ["healthcare", "Healthcare & life sciences"],
  ["manufacturing", "Manufacturing & OT"],
  ["public-sector", "Public sector"],
  ["defense-contractor", "Defense contractor"],
  ["education", "Education"],
  ["retail", "Retail & e-commerce"],
  ["energy-utilities", "Energy & utilities"],
  ["nonprofit", "Nonprofit"],
  ["professional-services", "Professional services"],
  ["other", "Other"],
];
export const DATA_TYPES: [OrganizationProfile["dataTypes"][number], string][] = [
  ["pii", "Personal data (PII)"],
  ["phi", "Health data (PHI)"],
  ["cardholder", "Cardholder data"],
  ["cui", "Controlled unclassified info (CUI)"],
  ["financial", "Financial data"],
  ["intellectual-property", "Intellectual property"],
  ["children", "Children's data"],
  ["biometric", "Biometric data"],
];
export const DRIVERS: [OrganizationProfile["drivers"][number], string][] = [
  ["enterprise-customers", "Enterprise customers ask for assurance"],
  ["federal-customers", "Federal customers / ATO"],
  ["regulator", "Regulatory expectations"],
  ["board-mandate", "Board mandate"],
  ["cyber-insurance", "Cyber insurance"],
  ["investor-due-diligence", "Investor due diligence"],
  ["incident-recovery", "Recovering from an incident"],
  ["build-program", "Building a security program"],
  ["ai-systems", "We build or deploy AI systems"],
];

const AUTONOMY: [ProposalType, string, string][] = [
  ["create-task", "Create tasks", "Low risk: planned work items grounded in official guidance."],
  ["update-task", "Update tasks", "Checklist progress and status changes proposed by agents."],
  ["set-target", "Set targets", "Changes to the Target Profile."],
  ["set-level", "Set implementation levels", "Changes to the Current Profile. Recommended: keep human approval."],
  ["create-policy", "Create policy drafts", "Drafts land as in-review; approval is always separate."],
  ["create-evidence", "Create evidence", "Recommended: keep human approval. Evidence must reflect reality."],
  ["set-applicability", "Scope decisions", "Marking requirements not applicable. Recommended: keep human approval."],
];

/** A switch; agent autonomy switches use the terracotta agent tone. */
function Toggle({ checked, onChange, label, tone = "primary" }: { checked: boolean; onChange: (v: boolean) => void; label: string; tone?: "primary" | "agent" }) {
  const on = tone === "agent" ? "var(--color-tertiary)" : "var(--color-primary)";
  const knob = tone === "agent" ? "var(--color-on-tertiary)" : "var(--color-on-primary)";
  return (
    <button role="switch" aria-checked={checked} aria-label={label} onClick={() => onChange(!checked)} style={{ width: 38, height: 22, borderRadius: 99, border: "1px solid var(--color-outline-strong)", background: checked ? on : "var(--color-surface-raised)", position: "relative", cursor: "pointer", flexShrink: 0 }}>
      <span style={{ position: "absolute", top: 2, left: checked ? 18 : 2, width: 16, height: 16, borderRadius: 99, background: checked ? knob : "var(--color-on-surface-muted)", transition: "left var(--dur-fast)" }} />
    </button>
  );
}

export function SettingsPage() {
  const { ws = "" } = useParams();
  const navigate = useNavigate();
  const { data } = useWorkspace(ws);
  const meta = useMeta();
  const [profile, setProfile] = useState<OrganizationProfile | null>(null);
  const [name, setName] = useState("");
  useEffect(() => {
    if (data) {
      setProfile(data.workspace.profile);
      setName(data.workspace.name);
    }
  }, [data]);
  const save = useWsMutation(ws, (body: Record<string, unknown>) => api.patch(`/workspaces/${encodeURIComponent(ws)}`, body));
  const enable = useWsMutation(ws, (v: { fw: string; enabled: boolean }) => api.put(`/workspaces/${encodeURIComponent(ws)}/frameworks/${v.fw}`, { enabled: v.enabled }));
  const canConfigure = useCan("workspace.configure");
  if (!data || !profile) return <div className="page muted">Loading…</div>;
  const autonomy = data.workspace.autonomy;
  const toggleList = <T extends string>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);
  return (
    <div className="page">
      <header className="page__header">
        <div>
          <div className="eyebrow">Settings</div>
          <h1>Workspace settings</h1>
          <p>Visua adapts priorities, targets and guidance to your niche and maturity. Changing the profile re-weights recommendations; it never rewrites your assessments.</p>
        </div>
      </header>
      {!canConfigure && (
        <div className="panel muted" role="note" style={{ marginBottom: 16 }}>
          Only admins and owners change workspace settings. You can review them here.
        </div>
      )}
      <fieldset disabled={!canConfigure} style={{ border: 0, margin: 0, padding: 0, minWidth: 0 }}>
      <div className="grid grid--2" style={{ alignItems: "start" }}>
        <div className="panel stack" style={{ gap: 14 }}>
          <h2 className="section-title" style={{ margin: 0 }}>
            Organization profile
          </h2>
          <div className="field">
            <label>Name</label>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="grid grid--2" style={{ gap: 12 }}>
            <div className="field">
              <label>Industry</label>
              <select className="select" value={profile.industry} onChange={(e) => setProfile({ ...profile, industry: e.target.value as OrganizationProfile["industry"] })}>
                {INDUSTRIES.map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Size</label>
              <select className="select" value={profile.size} onChange={(e) => setProfile({ ...profile, size: e.target.value as OrganizationProfile["size"] })}>
                {["1-10", "11-50", "51-200", "201-1000", "1000+"].map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Security team size</label>
              <input className="input" type="number" min={0} value={profile.securityTeamSize} onChange={(e) => setProfile({ ...profile, securityTeamSize: Number(e.target.value) })} />
            </div>
            <div className="field">
              <label>Guidance</label>
              <select className="select" value={profile.guidance} onChange={(e) => setProfile({ ...profile, guidance: e.target.value as OrganizationProfile["guidance"] })}>
                <option value="guided">Guided — explain everything</option>
                <option value="expert">Expert — terse and dense</option>
              </select>
            </div>
          </div>
          <div className="field">
            <span className="label">Data you handle</span>
            <div className="row row--wrap" style={{ gap: 6 }}>
              {DATA_TYPES.map(([v, l]) => (
                <button key={v} className="chip" aria-pressed={profile.dataTypes.includes(v)} onClick={() => setProfile({ ...profile, dataTypes: toggleList(profile.dataTypes, v) })}>
                  {l}
                </button>
              ))}
            </div>
          </div>
          <div className="field">
            <span className="label">Why now</span>
            <div className="row row--wrap" style={{ gap: 6 }}>
              {DRIVERS.map(([v, l]) => (
                <button key={v} className="chip" aria-pressed={profile.drivers.includes(v)} onClick={() => setProfile({ ...profile, drivers: toggleList(profile.drivers, v) })}>
                  {l}
                </button>
              ))}
            </div>
          </div>
          <div className="row" style={{ justifyContent: "flex-end" }}>
            <button className="btn btn--primary" onClick={() => save.mutate({ name, profile }, { onSuccess: () => toast("Profile saved") })}>
              Save profile
            </button>
          </div>
        </div>
        <div className="stack" style={{ gap: 16 }}>
          <div className="panel">
            <h2 className="section-title">Frameworks</h2>
            <div className="stack" style={{ gap: 10 }}>
              {(meta.data?.frameworks ?? []).filter((f) => f.id !== "nist-rmf" && f.family !== "threat").map((f) => {
                const on = data.frameworks.some((x) => x.id === f.id);
                return (
                  <div key={f.id} className="row" style={{ gap: 10 }}>
                    <FrameworkBadge frameworkId={f.id} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 500 }}>{f.name}</div>
                      <div className="muted" style={{ fontSize: 12 }}>
                        {f.units} {f.unitLabelPlural} · {f.publisher}
                      </div>
                    </div>
                    <Toggle checked={on} label={`Enable ${f.shortName}`} onChange={(v) => enable.mutate({ fw: f.id, enabled: v }, { onSuccess: () => toast(`${f.shortName} ${v ? "enabled" : "disabled"}`) })} />
                  </div>
                );
              })}
            </div>
          </div>
          <div className="panel">
            <div className="panel__head">
              <Globe size={16} />
              <h2>Public trust center</h2>
              <span className="spacer" />
              <span className="muted" style={{ fontSize: 12 }}>
                {data.workspace.trustCenter.enabled ? "Public" : "Not public"} ·{" "}
                <Link to={`/w/${ws}/reports`}>headline and visibility</Link>
              </span>
            </div>
            <p className="muted" style={{ fontSize: 13, marginBottom: 12 }}>
              Choose which frameworks' readiness the trust center publishes. State AI laws are off by default: they track legal obligations, not a security attestation.
            </p>
            <div className="stack" style={{ gap: 10 }}>
              {data.frameworks.map((f) => (
                <div key={f.id} className="row" style={{ gap: 10 }}>
                  <FrameworkBadge frameworkId={f.id} />
                  <span style={{ flex: 1 }}>{f.shortName}</span>
                  <span className="muted" style={{ fontSize: 12 }}>
                    {f.onTrustCenter ? "Published" : "Private"}
                  </span>
                  <Toggle
                    checked={f.onTrustCenter}
                    label={`Publish ${f.shortName} readiness on the trust center`}
                    onChange={(v) => save.mutate({ trustCenter: { frameworks: { [f.id]: v } } }, { onSuccess: () => toast(`${f.shortName} ${v ? "published on" : "withdrawn from"} the trust center`) })}
                  />
                </div>
              ))}
            </div>
          </div>
          <div className="panel">
            <div className="panel__head">
              <h2>Agent autonomy</h2>
              <span className="spacer" />
              <AgentBadge label="human-in-the-loop" />
            </div>
            <p className="muted" style={{ fontSize: 13, marginBottom: 12 }}>
              By default every agent change waits for approval. Grant autonomy per change type; every applied change is still recorded in the audit trail with the run that produced it.
            </p>
            <div className="stack" style={{ gap: 12 }}>
              {AUTONOMY.map(([type, label, hint]) => (
                <div key={type} className="row" style={{ gap: 12, alignItems: "flex-start" }}>
                  <Toggle tone="agent" checked={!!autonomy[type]} label={label} onChange={(v) => save.mutate({ autonomy: { ...autonomy, [type]: v } })} />
                  <div>
                    <div style={{ fontWeight: 500 }}>{label}</div>
                    <div className="muted" style={{ fontSize: 12 }}>
                      {hint}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="panel">
            <div className="panel__head">
              <Sparkles size={16} />
              <h2>AI engine</h2>
            </div>
            {meta.data?.ai.mode === "claude" ? (
              <p style={{ fontSize: 13 }}>
                Agents run on <strong className="mono">{meta.data.ai.model}</strong> with adaptive thinking, a streamed tool loop, prompt caching and server-side refusal fallbacks. Framework statements are grounded in the local official corpus.
              </p>
            ) : (
              <p style={{ fontSize: 13 }}>
                Agents are running <strong>deterministic offline playbooks</strong> — the same tools, citations and approval flow, without a language model. Set <code className="mono">ANTHROPIC_API_KEY</code> on the Visua server to run them on Claude (default model <code className="mono">claude-opus-5</code>, override with <code className="mono">VISUA_MODEL</code>).
              </p>
            )}
          </div>
          <div className="panel" style={{ borderColor: "var(--color-status-at-risk-container)" }}>
            <h2 className="section-title">Danger zone</h2>
            <button
              className="btn btn--danger"
              onClick={() => {
                if (!window.confirm(`Delete ${data.workspace.name} and all of its data? This cannot be undone.`)) return;
                void api.del(`/workspaces/${encodeURIComponent(ws)}`).then(() => navigate("/"));
              }}
            >
              <Trash2 size={14} /> Delete workspace
            </button>
          </div>
        </div>
      </div>
      </fieldset>
    </div>
  );
}
