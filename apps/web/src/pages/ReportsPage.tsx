/** Reports, audit trail, trust center and the official corpus library. */
import { useQuery } from "@tanstack/react-query";
import { Download, ExternalLink, FileJson, FileSpreadsheet, FileText, Globe, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Segmented, toast } from "../components/ui/index.tsx";
import { api, corpusFileUrl, exportUrl } from "../lib/api.ts";
import { relativeTime, truncate } from "../lib/format.ts";
import { useActivity, useAuditVerification, useWorkspace, useWsMutation } from "../lib/queries.ts";

interface ManifestDoc {
  id: string;
  title: string;
  identifier?: string;
  role: string;
  path: string;
  mediaType: string;
  version?: string;
  bytes: number;
  sha256: string;
  url: string;
  present: boolean;
}
interface Manifest {
  framework: string;
  title: string;
  retrieved: string;
  restricted: boolean;
  documents: ManifestDoc[];
}

function Library() {
  const { data = [] } = useQuery({ queryKey: ["corpus"], queryFn: () => api.get<Manifest[]>("/corpus"), staleTime: Infinity });
  const [fw, setFw] = useState<string>("");
  const current = data.find((m) => m.framework === (fw || data[0]?.framework));
  return (
    <div className="panel">
      <div className="panel__head">
        <h2>Official documentation corpus</h2>
        <span className="spacer" />
        {data.length > 0 && <Segmented label="Framework corpus" value={current?.framework ?? ""} onChange={setFw} options={data.map((m) => ({ id: m.framework, label: `${m.framework} (${m.documents.length})` }))} />}
      </div>
      <p className="muted" style={{ fontSize: 13, marginBottom: 12 }}>
        Every requirement, citation and agent answer in Visua traces back to these local, hash-verified copies of the official publications{current ? ` (retrieved ${current.retrieved})` : ""}.
      </p>
      {current?.restricted && (
        <div className="callout" role="note" style={{ marginBottom: 12 }}>
          © AICPA — these documents are not redistributed with Visua. {current.documents.filter((d) => d.present).length} of {current.documents.length} are present in this installation's local copy; the rest are listed for provenance. AICPA text is withheld from AI models unless your organization holds AICPA's permission.
        </div>
      )}
      <div style={{ maxHeight: 420, overflow: "auto" }}>
        <table className="table">
          <thead>
            <tr>
              <th>Document</th>
              <th>Role</th>
              <th>Size</th>
              <th>SHA-256</th>
            </tr>
          </thead>
          <tbody>
            {current?.documents.map((d) => (
              <tr key={d.id}>
                <td>
                  {d.present ? (
                    <a href={corpusFileUrl(d.path)} target="_blank" rel="noreferrer">
                      {truncate(d.title, 90)} <ExternalLink size={11} />
                    </a>
                  ) : (
                    <span title="Not in this installation">
                      {truncate(d.title, 90)} <span className="muted mono" style={{ fontSize: 10.5 }}>· not local</span>
                    </span>
                  )}
                  <div className="muted" style={{ fontSize: 11.5 }}>
                    {d.identifier} {d.version ? `· ${truncate(d.version, 40)}` : ""}
                  </div>
                </td>
                <td className="muted">{d.role}</td>
                <td className="mono muted" style={{ fontSize: 12 }}>
                  {(d.bytes / 1024 / 1024).toFixed(1)} MB
                </td>
                <td className="mono muted" style={{ fontSize: 11 }} title={d.sha256}>
                  {d.sha256.slice(0, 12)}…
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function ReportsPage() {
  const { ws = "" } = useParams();
  const workspace = useWorkspace(ws);
  const audit = useAuditVerification(ws);
  const activity = useActivity(ws, 200);
  const enabled = workspace.data?.frameworks.map((f) => f.id) ?? [];
  const tc = workspace.data?.workspace.trustCenter;
  const [headline, setHeadline] = useState<string | null>(null);
  const [contact, setContact] = useState<string | null>(null);
  const saveTrust = useWsMutation(ws, (body: { enabled: boolean; headline?: string; contactEmail?: string }) => api.patch(`/workspaces/${encodeURIComponent(ws)}`, { trustCenter: body }));
  const exports: { kind: string; title: string; description: string; icon: React.ReactNode; when?: boolean }[] = [
    { kind: "csf-profile.csv", title: "CSF 2.0 Organizational Profile", description: "Current and Target Profile using NIST's official template columns.", icon: <FileSpreadsheet size={18} />, when: enabled.includes("nist-csf-2.0") },
    { kind: "readiness.md", title: "Readiness report", description: "Readiness, evidence coverage and largest gaps for every enabled framework.", icon: <FileText size={18} /> },
    { kind: "action-plan.csv", title: "Action plan", description: "Tasks with dates, effort, checklist progress and their official basis.", icon: <FileSpreadsheet size={18} /> },
    { kind: "evidence-index.csv", title: "Evidence index", description: "Every evidence item with provenance, validity, reviewer and SHA-256.", icon: <FileSpreadsheet size={18} /> },
    { kind: "ai-rmf-profile.csv", title: "NIST AI RMF profile", description: "Current and target state per AI RMF outcome, with Playbook and Generative AI Profile actions.", icon: <FileSpreadsheet size={18} />, when: enabled.includes("nist-ai-rmf") },
    { kind: "soc2-pbc.csv", title: "SOC 2 PBC request list", description: "What an auditor will request per criterion and what is on file.", icon: <FileSpreadsheet size={18} />, when: enabled.includes("aicpa-tsc-2017") },
    { kind: "oscal-ssp.json", title: "OSCAL System Security Plan", description: "OSCAL 1.1.2 SSP with categorization and control implementation status.", icon: <FileJson size={18} />, when: enabled.includes("nist-sp-800-53-r5") },
    { kind: "oscal-poam.json", title: "OSCAL POA&M", description: "Plan of Action and Milestones for every requirement below target.", icon: <FileJson size={18} /> },
  ];
  return (
    <div className="page">
      <header className="page__header">
        <div>
          <div className="eyebrow">Reports</div>
          <h1>Reports, audit trail & trust</h1>
          <p>Readiness exports prepare you for an independent assessment. Visua never issues audit opinions, reports on controls or certifications.</p>
        </div>
      </header>
      <div className="grid grid--3" style={{ marginBottom: 20 }}>
        {exports
          .filter((e) => e.when !== false)
          .map((e) => (
            <a key={e.kind} className="panel" href={exportUrl(ws, e.kind)} style={{ color: "inherit", textDecoration: "none" }}>
              <div className="row" style={{ gap: 10 }}>
                <span style={{ color: "var(--color-primary)" }}>{e.icon}</span>
                <strong style={{ flex: 1 }}>{e.title}</strong>
                <Download size={15} className="muted" />
              </div>
              <p className="muted" style={{ fontSize: 13, marginTop: 8 }}>
                {e.description}
              </p>
            </a>
          ))}
      </div>
      <div className="grid" style={{ gridTemplateColumns: "minmax(0, 1.4fr) minmax(0, 1fr)", alignItems: "start" }}>
        <div className="panel" style={{ padding: 0, overflow: "hidden" }}>
          <div className="panel__head" style={{ padding: "16px 16px 0" }}>
            <ShieldCheck size={16} style={{ color: audit.data?.valid ? "var(--color-status-verified)" : "var(--color-status-at-risk)" }} />
            <h2>Tamper-evident audit trail</h2>
            <span className="spacer" />
            {audit.data && (
              <span className="mono" style={{ fontSize: 11.5, color: audit.data.valid ? "var(--color-status-verified)" : "var(--color-status-at-risk)" }} title={audit.data.head}>
                {audit.data.valid ? `✓ ${audit.data.events} events · head ${audit.data.head?.slice(0, 10)}…` : `✗ broken at #${audit.data.brokenAt}`}
              </span>
            )}
          </div>
          <p className="muted" style={{ fontSize: 12.5, padding: "8px 16px 12px" }}>
            Each event stores the SHA-256 of the previous one. Editing, deleting or reordering any past event breaks the chain, and verification pinpoints where.
          </p>
          <div style={{ maxHeight: 520, overflow: "auto" }}>
            <table className="table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>When</th>
                  <th>Actor</th>
                  <th>Event</th>
                  <th>Hash</th>
                </tr>
              </thead>
              <tbody>
                {(activity.data ?? []).map((a) => (
                  <tr key={a.id}>
                    <td className="mono muted" style={{ fontSize: 11 }}>
                      {a.seq}
                    </td>
                    <td className="muted" style={{ whiteSpace: "nowrap", fontSize: 12 }}>
                      {relativeTime(a.at)}
                    </td>
                    <td style={{ fontSize: 12.5, color: a.actor.startsWith("agent") ? "var(--color-tertiary)" : undefined }}>{truncate(a.actor, 28)}</td>
                    <td style={{ fontSize: 12.5 }}>{truncate(a.summary, 110)}</td>
                    <td className="mono muted" style={{ fontSize: 10.5 }} title={a.hash}>
                      {a.hash?.slice(0, 8)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="stack" style={{ gap: 16 }}>
          <div className="panel">
            <div className="panel__head">
              <Globe size={16} />
              <h2>Trust center</h2>
              <span className="spacer" />
              <label className="row" style={{ gap: 6, fontSize: 13 }}>
                <input type="checkbox" checked={!!tc?.enabled} onChange={(e) => saveTrust.mutate({ enabled: e.target.checked, headline: tc?.headline, contactEmail: tc?.contactEmail })} />
                Public
              </label>
            </div>
            <p className="muted" style={{ fontSize: 13, marginBottom: 12 }}>
              Publishes only computed facts — readiness, evidence coverage, approved policies and live monitoring results. No free-text claims.
            </p>
            <div className="stack" style={{ gap: 10 }}>
              <div className="field">
                <label>Headline</label>
                <input className="input" value={headline ?? tc?.headline ?? ""} onChange={(e) => setHeadline(e.target.value)} />
              </div>
              <div className="field">
                <label>Security contact</label>
                <input className="input" value={contact ?? tc?.contactEmail ?? ""} onChange={(e) => setContact(e.target.value)} />
              </div>
              <div className="row">
                {tc?.enabled && (
                  <Link className="btn" to={`/trust/${workspace.data?.workspace.slug}`} target="_blank">
                    View public page <ExternalLink size={13} />
                  </Link>
                )}
                <span style={{ flex: 1 }} />
                <button className="btn btn--primary" onClick={() => saveTrust.mutate({ enabled: !!tc?.enabled, headline: headline ?? tc?.headline, contactEmail: contact ?? tc?.contactEmail }, { onSuccess: () => toast("Trust center updated") })}>
                  Save
                </button>
              </div>
            </div>
          </div>
          <Library />
        </div>
      </div>
    </div>
  );
}
