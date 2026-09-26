/**
 * Coverage atoms for threat views. Coverage is derived from the requirements
 * linked to a threat; it reuses the status palette and glyphs (never color
 * alone) and adds one state of its own: no published link.
 */
import type { Status } from "@visua/core";
import type { CoverageState, LinkStatus, MinStatus, ThreatCoverage } from "../../lib/types.ts";
import { useUi } from "../../state/ui.ts";
import { Segmented, StatusGlyph } from "../ui/index.tsx";

export const COVERAGE_ORDER: CoverageState[] = ["covered", "partial", "open", "out-of-scope", "unmapped"];

export const COVERAGE_LABEL: Record<CoverageState, string> = {
  covered: "Covered",
  partial: "Partly covered",
  open: "Open",
  "out-of-scope": "Not in your frameworks",
  unmapped: "No published link",
};

export const COVERAGE_HELP: Record<CoverageState, string> = {
  covered: "Every linked requirement in scope is at its target.",
  partial: "Linked requirements are partly implemented.",
  open: "Linked requirements exist in your frameworks, but none is implemented yet.",
  "out-of-scope": "Linked requirements belong to frameworks this workspace does not follow.",
  unmapped: "No publisher links this threat to a requirement at the chosen link status.",
};

/** The status each coverage state borrows its color and glyph from. */
export const COVERAGE_STATUS: Record<CoverageState, Status | null> = {
  covered: "implemented",
  partial: "in-progress",
  open: "not-started",
  "out-of-scope": "not-applicable",
  unmapped: null,
};

export const coverageColor = (state: CoverageState) => (COVERAGE_STATUS[state] ? `var(--color-status-${COVERAGE_STATUS[state]})` : "var(--color-outline-strong)");

export function CoverageGlyph({ state, size = 12 }: { state: CoverageState; size?: number }) {
  const status = COVERAGE_STATUS[state];
  if (status) return <StatusGlyph status={status} size={size} />;
  return (
    <svg width={size} height={size} viewBox="0 0 12 12" aria-hidden className="status__glyph">
      <circle cx="6" cy="6" r="4.2" fill="none" stroke="currentColor" strokeWidth="1.4" strokeDasharray="1.6 1.8" />
    </svg>
  );
}

export function CoverageChip({ coverage, state }: { coverage?: ThreatCoverage; state?: CoverageState }) {
  const s = coverage?.state ?? state ?? "unmapped";
  const status = COVERAGE_STATUS[s];
  const title = coverage && coverage.inScope ? `${COVERAGE_HELP[s]} ${coverage.met} of ${coverage.inScope} linked requirements at target.` : COVERAGE_HELP[s];
  return (
    <span className={`status ${status ? `status--${status}` : "status--unmapped"}`} title={title}>
      <CoverageGlyph state={s} />
      {COVERAGE_LABEL[s]}
      {coverage && coverage.inScope > 0 && s !== "covered" ? <span className="mono" style={{ opacity: 0.8 }}>{Math.round(coverage.progress * 100)}%</span> : null}
    </span>
  );
}

/** Stacked distribution of coverage states with 2px gaps and a text alternative. */
export function CoverageBar({ byState, height = 8 }: { byState: Record<CoverageState, number>; height?: number }) {
  const present = COVERAGE_ORDER.filter((k) => byState[k]);
  const label = present.map((k) => `${COVERAGE_LABEL[k]} ${byState[k]}`).join(", ");
  return (
    <div style={{ display: "flex", gap: 2, height }} role="img" aria-label={label} title={label}>
      {present.map((k, i) => (
        <span
          key={k}
          style={{
            flexGrow: byState[k],
            flexBasis: 0,
            minWidth: 3,
            background: k === "unmapped" ? "transparent" : coverageColor(k),
            boxShadow: k === "unmapped" ? "inset 0 0 0 1px var(--color-outline-strong)" : undefined,
            borderRadius: `${i === 0 ? 4 : 0}px ${i === present.length - 1 ? 4 : 0}px ${i === present.length - 1 ? 4 : 0}px ${i === 0 ? 4 : 0}px`,
          }}
        />
      ))}
    </div>
  );
}

export function CoverageLegend({ byState }: { byState?: Record<CoverageState, number> }) {
  return (
    <div className="row row--wrap" style={{ gap: 12, fontSize: 12 }}>
      {COVERAGE_ORDER.map((k) => (
        <span key={k} className="row" style={{ gap: 5, color: k === "unmapped" ? "var(--color-on-surface-muted)" : coverageColor(k) }} title={COVERAGE_HELP[k]}>
          <CoverageGlyph state={k} />
          <span style={{ color: "var(--color-on-surface)" }}>
            {COVERAGE_LABEL[k]}
            {byState ? <span className="mono muted"> {byState[k]}</span> : null}
          </span>
        </span>
      ))}
    </div>
  );
}

export const LINK_STATUS_LABEL: Record<LinkStatus, string> = { final: "Final", draft: "Draft", unreviewed: "Unreviewed", superseded: "Superseded" };
export const LINK_STATUS_HELP: Record<LinkStatus, string> = {
  final: "Published in a final catalog or standard (MITRE, OWASP, NIST).",
  draft: "From a NIST draft (Cyber AI Profile, COSAiS outline): may change before final publication.",
  unreviewed: "From OWASP's community crosswalk, which names no reviewer: treat as a lead.",
  superseded: "From an older edition of the catalog.",
};

/** Link status is provenance, not implementation status: neutral ink, told apart by border and label. */
export function LinkStatusBadge({ status }: { status: LinkStatus }) {
  return (
    <span className={`link-status link-status--${status}`} title={LINK_STATUS_HELP[status]}>
      {LINK_STATUS_LABEL[status]}
    </span>
  );
}

const MIN_OPTIONS: { id: MinStatus; label: string }[] = [
  { id: "unreviewed", label: "All published links" },
  { id: "draft", label: "Final and draft" },
  { id: "final", label: "Final only" },
];

/** Which links count toward coverage, shared by the Threats page, the threat Observatory and the Nexus ring. */
export function ThreatLinkFilter() {
  const min = useUi((s) => s.threatMin);
  const set = useUi((s) => s.setThreatMin);
  return <Segmented<MinStatus> label="Links counted toward coverage" options={MIN_OPTIONS} value={min} onChange={set} />;
}
