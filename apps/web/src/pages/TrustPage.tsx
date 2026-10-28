/** Public measures and explicitly attributed organization-authored statements. */
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, CircleAlert, FileText, ShieldCheck } from "lucide-react";
import { useParams } from "react-router-dom";
import { api } from "../lib/api.ts";
import { relativeTime } from "../lib/format.ts";

interface TrustData {
  name: string;
  headline: string;
  headlineSource: "organization-authored" | "template";
  asOf: string;
  basis: { scope: string; readiness: string; evidence: string; monitoring: string; policies: string; time: string };
  contactEmail?: string;
  frameworks: { id: string; name: string; readiness: number | null; evidenceCoverage: number | null; basis: { formulaVersion: string; catalogVersion: string; scope: { assessable: number; inScope: number; upcoming: number; excluded: number }; readiness: { numerator: number; denominator: number }; evidence: { covered: number; denominator: number } } }[];
  policies: { title: string; version: number }[];
  monitoring: { id: string; title: string; outcome: string; observedAt: string; target: string; configuration: string }[];
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
        {data.headlineSource === "organization-authored" && <p className="eyebrow">Organization-authored statement · not independently verified by Visua</p>}
        <p className="muted" style={{ marginTop: 8, maxWidth: 720 }}>
          Measures are computed from {data.name}'s recorded implementation levels and accepted evidence at the evaluation time below. Policy approval and monitoring observations are shown separately. Readiness is not an audit opinion or a certification.
        </p>
        <p className="muted">Evaluated <time dateTime={data.asOf}>{new Date(data.asOf).toLocaleString(undefined, { timeZone: "UTC" })} UTC</time>.</p>
        <div className="grid grid--3" style={{ marginTop: 28 }}>
          {data.frameworks.map((f) => (
            <div key={f.id} className="panel">
              <div className="eyebrow">{f.name}</div>
              <p className="muted">Implementation progress</p>
              <div className="metric__value" style={{ marginTop: 8 }}>
                {f.readiness ?? "—"}
                <small>{f.readiness === null ? " no applicable requirements" : "%"}</small>
              </div>
              <div className="muted" style={{ fontSize: 13, marginTop: 6 }}>
                Valid evidence coverage {f.evidenceCoverage === null ? "—" : `${f.evidenceCoverage}%`} · {f.basis.evidence.covered} of {f.basis.evidence.denominator} applicable requirements
              </div>
              <p className="muted">{f.basis.scope.inScope} in scope · {f.basis.scope.excluded} excluded · {f.basis.scope.upcoming} upcoming</p>
              <details className="muted">
                <summary>Calculation basis</summary>
                <p>{data.basis.readiness}</p>
                <p>Weighted completion {f.basis.readiness.numerator.toFixed(2)} / {f.basis.readiness.denominator}. Catalog {f.basis.catalogVersion}; formula {f.basis.formulaVersion}.</p>
                <p>{data.basis.evidence}</p>
              </details>
            </div>
          ))}
        </div>
        <div className="grid grid--2" style={{ marginTop: 20, alignItems: "start" }}>
          <div className="panel">
            <div className="panel__head">
              <ShieldCheck size={16} />
              <h2>Recorded monitoring</h2>
            </div>
            <p className="muted">Target and configuration labels distinguish observations without publishing addresses or settings.</p>
            <div className="stack" style={{ gap: 8 }}>
              {data.monitoring.map((m) => (
                <div key={m.id} className="row row--wrap" style={{ gap: 8, fontSize: 13 }}>
                  {m.outcome === "pass" ? <CheckCircle2 size={15} style={{ color: "var(--color-status-implemented)" }} /> : <CircleAlert size={15} style={{ color: "var(--color-status-in-progress)" }} />}
                  <span style={{ flex: 1 }}>{m.title}<span className="muted" style={{ display: "block" }}>{m.target} · {m.configuration}</span></span>
                  <span className="muted mono" style={{ fontSize: 11 }}>
                    {m.outcome} · <time dateTime={m.observedAt} title={m.observedAt}>{relativeTime(m.observedAt)}</time>
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
        <details className="panel">
          <summary>Scope and limitations</summary>
          <p>{data.basis.scope}</p>
          <p>{data.basis.monitoring}</p>
          <p>{data.basis.policies}</p>
          <p>{data.basis.time}</p>
        </details>
        <p className="muted" style={{ fontSize: 12, marginTop: 24 }}>
          Workspace settings last changed {relativeTime(data.updatedAt)}.{data.contactEmail ? ` Security contact: ${data.contactEmail}.` : ""}
        </p>
      </div>
    </div>
  );
}
