/**
 * Overlay entries for one requirement: the Cyber AI Profile's proposed
 * priorities and considerations per focus area, or a COSAiS control's AI
 * lifecycle phases and tailoring. Always shown with the draft's status.
 */
import { ShieldAlert } from "lucide-react";
import type { NodeDetail, NodeOverlay } from "../../lib/types.ts";
import { SourceLink } from "../ui/index.tsx";

export function PriorityChip({ level, label }: { level?: number; label?: string }) {
  if (level === undefined) return <span className="muted">—</span>;
  return (
    <span className={`ai-prio ai-prio--${level}`} title={`Proposed priority ${level}${label ? ` (${label})` : ""}`}>
      <span aria-hidden>{level === 1 ? "◆" : level === 2 ? "◈" : "◇"}</span>
      {level}
      {label ? ` ${label}` : ""}
    </span>
  );
}

function Refs({ items }: { items: string[] }) {
  if (!items.length) return null;
  return (
    <ul className="ai-overlay__refs">
      {items.map((r) => (
        <li key={r}>{r}</li>
      ))}
    </ul>
  );
}

function ProfileEntry({ o }: { o: NodeOverlay }) {
  const level = (p?: number) => o.priorityLevels?.find((l) => l.level === p)?.label;
  const followed = new Set(o.adoption?.lenses ?? []);
  return (
    <div className="stack" style={{ gap: 10 }}>
      <table className="table ai-overlay__table">
        <thead>
          <tr>
            <th>Focus area</th>
            <th>Proposed priority</th>
          </tr>
        </thead>
        <tbody>
          {(o.lenses ?? []).map((l) => {
            const f = o.entry.lenses?.[l.id];
            return (
              <tr key={l.id}>
                <td>
                  <details>
                    <summary>
                      <strong>{l.short}</strong>
                      {followed.has(l.id) ? <span className="muted"> · followed</span> : null}
                    </summary>
                    <div className="stack ai-overlay__detail" style={{ gap: 6 }}>
                      <span className="muted" style={{ fontSize: 12 }}>
                        {l.title}
                      </span>
                      {f?.opportunities && (
                        <p>
                          <span className="eyebrow">Opportunities</span> {f.opportunities}
                        </p>
                      )}
                      {f?.considerations && (
                        <p>
                          <span className="eyebrow">Considerations</span> {f.considerations}
                        </p>
                      )}
                      {f?.references.length ? (
                        <div>
                          <span className="eyebrow">Example informative references</span>
                          <Refs items={f.references} />
                        </div>
                      ) : f?.referencesNote ? (
                        <p className="muted">{f.referencesNote}</p>
                      ) : null}
                    </div>
                  </details>
                </td>
                <td style={{ verticalAlign: "top" }}>
                  <PriorityChip level={f?.priority} label={level(f?.priority)} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {(o.entry.general?.considerations || o.entry.general?.note) && (
        <p style={{ margin: 0 }}>
          <span className="eyebrow">General considerations</span> {o.entry.general.considerations ?? o.entry.general.note}
        </p>
      )}
    </div>
  );
}

function ControlEntry({ o }: { o: NodeOverlay }) {
  const c = o.entry.control;
  if (!c) return null;
  return (
    <div className="stack" style={{ gap: 8 }}>
      <div className="row row--wrap" style={{ gap: 6 }}>
        <span className="chip" style={{ cursor: "default" }}>
          {c.annotated ? "Annotated in the overlay" : c.inSummaryTable ? "In the summary table" : "Proposed additional control"}
        </span>
        {c.selectedInModerateBaseline && (
          <span className="chip" style={{ cursor: "default" }}>
            Moderate baseline: {c.selectedInModerateBaseline}
          </span>
        )}
        {(c.lifecyclePhases ?? []).map((p) => (
          <span key={p} className="chip" style={{ cursor: "default" }} title="AI lifecycle phase">
            {p}
          </span>
        ))}
      </div>
      {c.tailoring && (
        <div className="muted" style={{ fontSize: 12 }}>
          Tailoring: {[c.tailoring.controlRequirement && "control requirement", c.tailoring.organizationDefinedParameter && "organization-defined parameters", c.tailoring.discussion && "discussion"].filter(Boolean).join(", ") || "none"}
        </div>
      )}
      {c.assumptions && (
        <p style={{ margin: 0 }}>
          <span className="eyebrow">Assumptions</span> {c.assumptions}
        </p>
      )}
      {(c.tailoringSections ?? []).map((t) => (
        <p key={t.label} style={{ margin: 0 }}>
          <span className="eyebrow">{t.label}</span> {t.text}
        </p>
      ))}
      {c.attackIds?.length ? (
        <div className="row row--wrap" style={{ gap: 6 }}>
          <span className="eyebrow">NIST AI 100-2 attacks</span>
          {c.attackIds.map((id) => (
            <span key={id} className="code" style={{ cursor: "default" }}>
              {id}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function OverlaySections({ data }: { data: NodeDetail }) {
  if (!data.overlays?.length) return null;
  return (
    <>
      {data.overlays.map((o) => (
        <section key={o.id} className="panel stack ai-overlay" aria-label={`${o.shortName} (${o.status})`} style={{ gap: 10 }}>
          <div className="row row--wrap" style={{ gap: 8 }}>
            <span className="badge-fw badge-fw--ai">{o.shortName}</span>
            <span className="role-badge" title={o.notice.text}>
              <ShieldAlert size={11} aria-hidden /> {o.status}
            </span>
            {o.adoption && <span className="muted" style={{ fontSize: 12 }}>Adopted</span>}
            <span style={{ flex: 1 }} />
            {o.source?.present ? (
              <SourceLink path={o.source.path} page={o.entry.citation.page} label={o.identifier} />
            ) : (
              <span className="muted" style={{ fontSize: 12 }}>
                {o.identifier}
                {o.entry.citation.page ? `, p. ${o.entry.citation.page}` : ""}
              </span>
            )}
          </div>
          {o.kind === "community-profile" ? <ProfileEntry o={o} /> : <ControlEntry o={o} />}
          <p className="muted" style={{ fontSize: 11.5, margin: 0 }}>
            Draft guidance from NIST, not a requirement: priorities and lists may change before the final publication.
          </p>
        </section>
      ))}
    </>
  );
}
