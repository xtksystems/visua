/**
 * Overlay panels: the NIST Cyber AI Profile (a CSF 2.0 community profile) on
 * the AI governance page, and the COSAiS control overlay on the RMF page.
 * Both are NIST drafts; the panels say so and never present them as
 * requirements.
 */
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ShieldAlert, Telescope } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import type { OverlayAdoption, Status } from "@visua/core";
import { api } from "../../lib/api.ts";
import { useCan } from "../../lib/auth.ts";
import { keys } from "../../lib/queries.ts";
import { useUi } from "../../state/ui.ts";
import { PriorityChip } from "../inspector/Overlays.tsx";
import { Progress, StatusChip, toast } from "../ui/index.tsx";

export const CYBER_AI_PROFILE = "nist-ir-8596-iprd";
export const COSAIS = "nist-cosais-predictive-ai";

interface OverlayMeta {
  id: string;
  shortName: string;
  identifier: string;
  title: string;
  status: string;
  notice: { text: string; citation: { page?: number } };
  landingPage?: string;
  published?: string;
  scope?: { useCases?: { id: string; text: string }[]; lifecyclePhases?: string[] };
}
interface Unit {
  nodeId: string;
  code: string;
  title: string;
  applicable: boolean | null;
  current: number | null;
  target: number | null;
  status: Status | null;
}
interface ProfileSummary {
  overlay: OverlayMeta;
  enabled: boolean;
  adoption: OverlayAdoption | null;
  lenses: { id: string; short: string; title: string; description: string; selected: boolean; byPriority: { level: number; label: string; count: number; readiness: number; gaps: number }[] }[];
  high: { count: number; readiness: number; gaps: number; inScope: number };
  gaps: Unit[];
  raisable: number;
}
interface ControlSummary {
  overlay: OverlayMeta;
  enabled: boolean;
  adoption: OverlayAdoption | null;
  controls: (Unit & { annotated: boolean; proposedAdditional: boolean; lifecyclePhases: string[]; addedByOverlay: boolean; tailoredByPerson: "add" | "remove" | null })[];
  readiness: number;
  gaps: number;
  inScope: number;
}

const enc = encodeURIComponent;
const useSummary = <T,>(ws: string, id: string) => useQuery({ queryKey: [...keys.workspace(ws), "overlay", id], queryFn: () => api.get<T>(`/workspaces/${enc(ws)}/overlays/${id}`) });

function DraftBadge({ overlay }: { overlay: OverlayMeta }) {
  return (
    <span className="role-badge" title={overlay.notice.text}>
      <ShieldAlert size={11} aria-hidden /> {overlay.status}
    </span>
  );
}

function useOverlayAction(ws: string) {
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  return {
    busy,
    run: async (fn: () => Promise<unknown>, message: string) => {
      setBusy(true);
      try {
        await fn();
        toast(message);
        await qc.invalidateQueries({ queryKey: ["ws", ws] });
      } catch (err) {
        toast((err as Error).message, "error");
      } finally {
        setBusy(false);
      }
    },
  };
}

export function CyberAiProfilePanel({ ws }: { ws: string }) {
  const summary = useSummary<ProfileSummary>(ws, CYBER_AI_PROFILE);
  const canConfigure = useCan("workspace.configure");
  const canApprove = useCan("work.approve");
  const action = useOverlayAction(ws);
  const navigate = useNavigate();
  const setLens = useUi((s) => s.setLens);
  const [chosen, setChosen] = useState<string[] | null>(null);
  const data = summary.data;
  if (!data) return null;
  const selected = chosen ?? data.adoption?.lenses ?? data.lenses.map((l) => l.id);
  const toggle = (id: string) => setChosen(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);
  const adopt = () => action.run(() => api.put(`/workspaces/${enc(ws)}/overlays/${CYBER_AI_PROFILE}`, { lenses: selected }), data.adoption ? "Focus areas updated" : "Cyber AI Profile adopted");
  return (
    <section className="panel stack" style={{ gap: 14 }} aria-labelledby="cyber-ai-title">
      <div className="panel__head" style={{ marginBottom: 0 }}>
        <h2 id="cyber-ai-title">NIST Cyber AI Profile</h2>
        <DraftBadge overlay={data.overlay} />
        <span className="spacer" />
        <span className="muted" style={{ fontSize: 12 }}>
          {data.overlay.identifier}
          {data.overlay.published ? ` · ${data.overlay.published}` : ""}
        </span>
      </div>
      <p className="muted" style={{ margin: 0, fontSize: 13 }}>
        A CSF 2.0 Community Profile: NIST proposes a priority for each of the 106 CSF subcategories in three focus areas, with considerations and example references
        (MITRE ATLAS, OWASP). It works on your CSF 2.0 assessment — nothing is assessed twice. {data.overlay.notice.text}
      </p>
      {!data.enabled && <p className="muted">Enable NIST CSF 2.0 to use the Cyber AI Profile.</p>}
      <div className="grid grid--3">
        {data.lenses.map((l) => {
          const on = selected.includes(l.id);
          return (
            <div key={l.id} className="panel panel--raised stack" style={{ gap: 8, borderColor: on ? "var(--color-framework-ai)" : undefined }}>
              <label className="row" style={{ gap: 8, cursor: canConfigure ? "pointer" : "default" }}>
                <input type="checkbox" checked={on} disabled={!canConfigure} onChange={() => toggle(l.id)} aria-label={`Follow the ${l.short} focus area`} />
                <strong>{l.short}</strong>
                <span className="muted" style={{ fontSize: 12 }}>
                  {l.title}
                </span>
              </label>
              <p className="muted" style={{ fontSize: 12, margin: 0 }} title={l.description}>
                {l.description.length > 170 ? `${l.description.slice(0, 169)}…` : l.description}
              </p>
              {l.byPriority.map((p) => (
                <div key={p.level} className="row" style={{ gap: 8 }}>
                  <span style={{ width: 118 }}>
                    <PriorityChip level={p.level} label={p.label} />
                  </span>
                  <span className="mono" style={{ width: 28, textAlign: "right" }}>
                    {p.count}
                  </span>
                  <div style={{ flex: 1 }}>
                    <Progress value={p.readiness} color="var(--color-framework-ai)" />
                  </div>
                  <span className="mono" style={{ fontSize: 12, width: 38, textAlign: "right" }}>
                    {Math.round(p.readiness * 100)}%
                  </span>
                </div>
              ))}
            </div>
          );
        })}
      </div>
      <div className="row row--wrap" style={{ gap: 8 }}>
        {canConfigure && (
          <button className="btn btn--primary" disabled={action.busy || !selected.length || !data.enabled} onClick={() => void adopt()}>
            {data.adoption ? "Update focus areas" : "Adopt for these focus areas"}
          </button>
        )}
        {canConfigure && data.adoption && (
          <button className="btn btn--quiet" disabled={action.busy} onClick={() => void action.run(() => api.del(`/workspaces/${enc(ws)}/overlays/${CYBER_AI_PROFILE}`), "Stopped following the Cyber AI Profile")}>
            Stop following
          </button>
        )}
        {canApprove && data.adoption && data.raisable > 0 && (
          <button
            className="btn"
            disabled={action.busy}
            title="Raise CSF priorities to the profile's proposed priorities for the focus areas you follow (never lowers one)"
            onClick={() => void action.run(() => api.post(`/workspaces/${enc(ws)}/overlays/${CYBER_AI_PROFILE}/apply-priorities`), "CSF priorities raised to the profile's High priorities")}
          >
            Raise {data.raisable} CSF priorit{data.raisable === 1 ? "y" : "ies"}
          </button>
        )}
        <span style={{ flex: 1 }} />
        <button
          className="btn btn--quiet"
          onClick={() => {
            setLens("overlay");
            navigate(`/w/${ws}/observatory/nist-csf-2.0`);
          }}
        >
          <Telescope size={14} aria-hidden /> AI overlay lens in 3D
        </button>
      </div>
      <div>
        <h3 className="section-title" style={{ margin: "0 0 8px" }}>
          High-priority gaps ({data.high.gaps} of {data.high.count} High subcategories below target)
        </h3>
        {data.gaps.length ? (
          <table className="table">
            <thead>
              <tr>
                <th>Subcategory</th>
                <th style={{ width: 110 }}>Current → target</th>
                <th style={{ width: 140 }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {data.gaps.map((g) => (
                <tr key={g.nodeId}>
                  <td>
                    <Link to={`/w/${ws}/observatory/nist-csf-2.0?select=${enc(g.nodeId)}`} style={{ color: "inherit" }}>
                      <span className="mono" style={{ color: "var(--color-primary)" }}>
                        {g.code}
                      </span>{" "}
                      <span className="muted">{g.title}</span>
                    </Link>
                  </td>
                  <td className="mono">
                    {g.current} → {g.target}
                  </td>
                  <td>{g.status && <StatusChip status={g.status} />}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="muted" style={{ margin: 0 }}>
            No High-priority subcategory is below target for the focus areas you follow.
          </p>
        )}
      </div>
    </section>
  );
}

export function CosaisPanel({ ws }: { ws: string }) {
  const summary = useSummary<ControlSummary>(ws, COSAIS);
  const canConfigure = useCan("workspace.configure");
  const action = useOverlayAction(ws);
  const [showAll, setShowAll] = useState(false);
  const data = summary.data;
  if (!data) return null;
  const added = data.controls.filter((c) => c.addedByOverlay).length;
  const rows = showAll ? data.controls : data.controls.filter((c) => c.annotated);
  return (
    <section className="panel stack" style={{ gap: 12 }} aria-labelledby="cosais-title">
      <div className="panel__head" style={{ marginBottom: 0 }}>
        <h2 id="cosais-title">AI control overlay · COSAiS</h2>
        <DraftBadge overlay={data.overlay} />
        <span className="spacer" />
        <span className="muted" style={{ fontSize: 12 }}>
          {data.overlay.identifier}
        </span>
      </div>
      <p className="muted" style={{ margin: 0, fontSize: 13 }}>
        NIST's SP 800-53 Control Overlays for Securing AI Systems. This annotated outline covers using and fine-tuning predictive AI:{" "}
        {data.controls.length} controls, {data.controls.filter((c) => c.annotated).length} of them annotated with AI lifecycle phases and tailoring. {data.overlay.notice.text}
      </p>
      <div className="row row--wrap" style={{ gap: 16 }}>
        <span>
          <span className="mono">{data.inScope}</span> <span className="muted">of {data.controls.length} in scope</span>
        </span>
        <span>
          <span className="mono">{Math.round(data.readiness * 100)}%</span> <span className="muted">readiness</span>
        </span>
        <span>
          <span className="mono">{data.gaps}</span> <span className="muted">gaps</span>
        </span>
        {data.adoption && (
          <span className="muted">
            Adopted — {added} control{added === 1 ? "" : "s"} brought into scope by the overlay
          </span>
        )}
        <span style={{ flex: 1 }} />
        {canConfigure && data.enabled && !data.adoption && (
          <button className="btn btn--primary" disabled={action.busy} onClick={() => void action.run(() => api.put(`/workspaces/${enc(ws)}/overlays/${COSAIS}`, {}), "COSAiS overlay adopted: its controls are in scope")}>
            Adopt the overlay
          </button>
        )}
        {canConfigure && data.adoption && (
          <button className="btn btn--quiet" disabled={action.busy} onClick={() => void action.run(() => api.del(`/workspaces/${enc(ws)}/overlays/${COSAIS}`), "COSAiS overlay dropped")}>
            Drop the overlay
          </button>
        )}
      </div>
      <table className="table table--cosais">
        <thead>
          <tr>
            <th>Control</th>
            <th>AI lifecycle phases</th>
            <th style={{ width: "20%" }}>Scope</th>
            <th style={{ width: "22%" }}>Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((c) => (
            <tr key={c.nodeId}>
              <td>
                <Link to={`/w/${ws}/observatory/nist-sp-800-53-r5?select=${enc(c.nodeId)}`} style={{ color: "inherit" }}>
                  <span className="mono" style={{ color: "var(--color-primary)" }}>
                    {c.code}
                  </span>{" "}
                  <span className="muted">{c.title}</span>
                </Link>
              </td>
              <td className="muted" style={{ fontSize: 12 }}>
                {c.lifecyclePhases.join(", ") || "—"}
              </td>
              <td style={{ fontSize: 12 }}>{c.applicable ? (c.addedByOverlay ? "In scope (overlay)" : "In scope") : c.tailoredByPerson === "remove" ? "Tailored out by you" : "Not in scope"}</td>
              <td>{c.status && <StatusChip status={c.status} />}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div>
        <button className="btn btn--quiet btn--sm" onClick={() => setShowAll(!showAll)}>
          {showAll ? "Show the annotated controls only" : `Show all ${data.controls.length} controls`}
        </button>
      </div>
    </section>
  );
}
