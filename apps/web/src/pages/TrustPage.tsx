/** Public trust center: only computed, evidence-backed facts — no free-text claims. */
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, CircleAlert, FileText, ShieldCheck } from "lucide-react";
import { useParams } from "react-router-dom";
import { api } from "../lib/api.ts";
import { relativeTime } from "../lib/format.ts";

interface TrustData {
  name: string;
  headline: string;
  contactEmail?: string;
  frameworks: { id: string; name: string; readiness: number; evidenceCoverage: number }[];
  policies: { title: string; version: number }[];
  monitoring: { title: string; outcome: string; observedAt: string }[];
  updatedAt: string;
}

export function TrustPage() {
  const { slug = "" } = useParams();
  const { data, error } = useQuery({ queryKey: ["trust", slug], queryFn: () => api.get<TrustData>(`/trust/${encodeURIComponent(slug)}`) });
  if (error) return <div className="page muted">This trust center is not public.</div>;
  if (!data) return <div className="page muted">Loading…</div>;
  return (
    <div style={{ height: "100%", overflow: "auto" }}>
      <div style={{ maxWidth: 980, margin: "0 auto", padding: "56px 24px" }}>
        <div className="eyebrow">Trust center · powered by Visua</div>
        <h1 style={{ fontFamily: "var(--font-display-lg-family)", fontSize: 38, fontWeight: 600, marginTop: 8 }}>{data.headline}</h1>
        <p className="muted" style={{ marginTop: 8, maxWidth: 720 }}>
          Every figure on this page is computed from {data.name}'s live compliance workspace: implementation levels, accepted evidence with provenance, approved policies and automated monitoring. Readiness is not an audit opinion or a certification.
        </p>
        <div className="grid grid--3" style={{ marginTop: 28 }}>
          {data.frameworks.map((f) => (
            <div key={f.id} className="panel">
              <div className="eyebrow">{f.name}</div>
              <div className="metric__value" style={{ marginTop: 8 }}>
                {f.readiness}
                <small>% ready</small>
              </div>
              <div className="muted" style={{ fontSize: 13, marginTop: 6 }}>
                Evidence coverage {f.evidenceCoverage}%
              </div>
            </div>
          ))}
        </div>
        <div className="grid grid--2" style={{ marginTop: 20, alignItems: "start" }}>
          <div className="panel">
            <div className="panel__head">
              <ShieldCheck size={16} />
              <h2>Continuous monitoring</h2>
            </div>
            <div className="stack" style={{ gap: 8 }}>
              {data.monitoring.map((m) => (
                <div key={m.title} className="row" style={{ gap: 8, fontSize: 13 }}>
                  {m.outcome === "pass" ? <CheckCircle2 size={15} style={{ color: "var(--color-status-implemented)" }} /> : <CircleAlert size={15} style={{ color: "var(--color-status-in-progress)" }} />}
                  <span style={{ flex: 1 }}>{m.title}</span>
                  <span className="muted mono" style={{ fontSize: 11 }}>
                    {m.outcome} · {relativeTime(m.observedAt)}
                  </span>
                </div>
              ))}
              {!data.monitoring.length && <div className="muted">No automated checks published yet.</div>}
            </div>
          </div>
          <div className="panel">
            <div className="panel__head">
              <FileText size={16} />
              <h2>Approved policies</h2>
            </div>
            <div className="stack" style={{ gap: 8 }}>
              {data.policies.map((p) => (
                <div key={p.title} className="row" style={{ fontSize: 13 }}>
                  <span style={{ flex: 1 }}>{p.title}</span>
                  <span className="mono muted" style={{ fontSize: 11 }}>
                    v{p.version}
                  </span>
                </div>
              ))}
              {!data.policies.length && <div className="muted">No approved policies published yet.</div>}
            </div>
          </div>
        </div>
        <p className="muted" style={{ fontSize: 12, marginTop: 24 }}>
          Last updated {relativeTime(data.updatedAt)}.{data.contactEmail ? ` Security contact: ${data.contactEmail}.` : ""}
        </p>
      </div>
    </div>
  );
}
