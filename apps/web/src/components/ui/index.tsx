/** UI atoms following DESIGN.md components. Status is never conveyed by color alone. */
import { useRef, useState, type CSSProperties, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { create } from "zustand";
import type { Citation as CitationType, Status } from "@visua/core";
import { corpusFileUrl } from "../../lib/api.ts";
import { STATUS_LABEL, codeOf, frameworkOf, pct } from "../../lib/format.ts";
import { badgeOf, familyOf } from "../../lib/frameworks.ts";
import { useModalFocus } from "../../lib/modal.ts";
import { useWorkspaceId } from "../../lib/workspace.ts";
import { useUi } from "../../state/ui.ts";

// ------------------------------------------------------------------ status

export function StatusGlyph({ status, size = 12 }: { status: Status; size?: number }) {
  const common = { width: size, height: size, viewBox: "0 0 12 12", "aria-hidden": true, className: "status__glyph" } as const;
  switch (status) {
    case "not-started":
      return (
        <svg {...common}>
          <circle cx="6" cy="6" r="4.2" fill="none" stroke="currentColor" strokeWidth="1.6" />
        </svg>
      );
    case "in-progress":
      return (
        <svg {...common}>
          <circle cx="6" cy="6" r="4.2" fill="none" stroke="currentColor" strokeWidth="1.6" />
          <path d="M6 1.8 A4.2 4.2 0 0 1 6 10.2 Z" fill="currentColor" />
        </svg>
      );
    case "implemented":
      return (
        <svg {...common}>
          <circle cx="6" cy="6" r="4.6" fill="currentColor" />
        </svg>
      );
    case "verified":
      return (
        <svg {...common}>
          <circle cx="6" cy="6" r="5" fill="currentColor" />
          <path d="M3.6 6.2 L5.3 7.8 L8.5 4.4" fill="none" stroke="var(--color-on-status)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "at-risk":
      return (
        <svg {...common}>
          <path d="M6 1.2 L11 10.4 L1 10.4 Z" fill="currentColor" />
          <path d="M6 4.6 V7.2 M6 8.6 V8.8" stroke="var(--color-on-status)" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
      );
    default:
      return (
        <svg {...common}>
          <circle cx="6" cy="6" r="4.2" fill="none" stroke="currentColor" strokeWidth="1.4" />
          <path d="M3 9 L9 3" stroke="currentColor" strokeWidth="1.4" />
        </svg>
      );
  }
}

export function StatusChip({ status, label }: { status: Status; label?: string }) {
  return (
    <span className={`status status--${status}`}>
      <StatusGlyph status={status} />
      {label ?? STATUS_LABEL[status]}
    </span>
  );
}

const STATUS_ORDER: Status[] = ["verified", "implemented", "in-progress", "at-risk", "not-started", "not-applicable"];

/** Stacked distribution of statuses: 2px surface gaps between segments, glyph legend elsewhere, text alternative. */
export function StatusBar({ counts, height = 8 }: { counts: Record<Status, number>; height?: number }) {
  const total = STATUS_ORDER.reduce((s, k) => s + (counts[k] ?? 0), 0) || 1;
  const label = STATUS_ORDER.filter((k) => counts[k]).map((k) => `${STATUS_LABEL[k]} ${counts[k]}`).join(", ");
  const present = STATUS_ORDER.filter((k) => counts[k]);
  return (
    <div style={{ display: "flex", gap: 2, height }} role="img" aria-label={label} title={label}>
      {present.map((k, i) => (
        <span
          key={k}
          style={{
            flexGrow: counts[k],
            flexBasis: 0,
            minWidth: 3,
            background: `var(--color-status-${k})`,
            borderRadius: `${i === 0 ? 4 : 0}px ${i === present.length - 1 ? 4 : 0}px ${i === present.length - 1 ? 4 : 0}px ${i === 0 ? 4 : 0}px`,
          }}
        />
      ))}
      {!present.length && <span style={{ flex: 1, background: "var(--color-outline)", borderRadius: 4 }} />}
      <span className="sr-only">{label || `0 of ${total}`}</span>
    </div>
  );
}

/** Status legend: glyph + label + count, never color alone. */
export function StatusLegend({ counts }: { counts: Record<Status, number> }) {
  return (
    <div className="row row--wrap" style={{ gap: 12, fontSize: 12 }}>
      {STATUS_ORDER.filter((k) => counts[k]).map((k) => (
        <span key={k} className="row" style={{ gap: 5 }}>
          <span style={{ color: `var(--color-status-${k})`, display: "inline-flex" }}>
            <StatusGlyph status={k} size={11} />
          </span>
          <span className="muted">{STATUS_LABEL[k]}</span>
          <span className="mono">{counts[k]}</span>
        </span>
      ))}
    </div>
  );
}

export function Progress({ value, color }: { value: number; color?: string }) {
  return (
    <div className="progress" role="progressbar" aria-valuenow={Math.round(value * 100)} aria-valuemin={0} aria-valuemax={100}>
      <span style={{ width: `${Math.max(0, Math.min(1, value)) * 100}%`, background: color }} />
    </div>
  );
}

// ------------------------------------------------------------------ identifiers

export function FrameworkBadge({ frameworkId }: { frameworkId: string }) {
  return <span className={`badge-fw badge-fw--${familyOf(frameworkId) ?? "unknown"}`}>{badgeOf(frameworkId)}</span>;
}

/** A requirement code links to its workspace, framework and selection (DESIGN.md: requirement-code). */
export function CodeTag({ id, onNavigate }: { id: string; onNavigate?: (id: string) => void }) {
  const ws = useWorkspaceId();
  const focus = useUi((s) => s.focus);
  const title = `Show ${codeOf(id)} in the Observatory`;
  if (!onNavigate) return (
    <Link
      className="code"
      title={title}
      to={`/w/${encodeURIComponent(ws)}/observatory/${encodeURIComponent(frameworkOf(id))}?select=${encodeURIComponent(id)}`}
      onClick={(e) => {
        e.stopPropagation();
        if (e.button === 0 && !e.metaKey && !e.ctrlKey && !e.altKey && !e.shiftKey) focus([id]);
      }}
    >
      {codeOf(id)}
    </Link>
  );
  return (
    <button
      type="button"
      className="code"
      title={title}
      onClick={(e) => {
        e.stopPropagation();
        onNavigate(id);
      }}
    >
      {codeOf(id)}
    </button>
  );
}

export function AgentBadge({ label = "Agent" }: { label?: string }) {
  return (
    <span className="badge-agent">
      <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden>
        <path d="M5 0 L6.2 3.8 L10 5 L6.2 6.2 L5 10 L3.8 6.2 L0 5 L3.8 3.8 Z" fill="currentColor" />
      </svg>
      {label}
    </span>
  );
}

// ------------------------------------------------------------------ metrics

export function Metric({ label, value, unit, sub, children }: { label: string; value: ReactNode; unit?: string; sub?: ReactNode; children?: ReactNode }) {
  return (
    <div className="metric">
      <span className="eyebrow">{label}</span>
      <span className="metric__value">
        {value}
        {unit ? <small>{unit}</small> : null}
      </span>
      {sub ? <span className="metric__sub">{sub}</span> : null}
      {children}
    </div>
  );
}

export function Percent({ value }: { value: number }) {
  return <>{Math.round(value * 100)}</>;
}

export function LevelPips({ current, target, max = 4 }: { current: number; target: number; max?: number }) {
  return (
    <span className="row" style={{ gap: 3 }} aria-label={`Level ${current} of target ${target}`} title={`Current ${current} · Target ${target}`}>
      {Array.from({ length: max }, (_, i) => {
        const filled = i < current;
        const targeted = i < target;
        return (
          <span
            key={i}
            style={{
              width: 10,
              height: 10,
              borderRadius: 2,
              background: filled ? "var(--color-primary)" : "transparent",
              border: `1px solid ${targeted ? "var(--color-primary)" : "var(--color-outline-strong)"}`,
              opacity: filled || targeted ? 1 : 0.6,
            }}
          />
        );
      })}
    </span>
  );
}

// ------------------------------------------------------------------ layout helpers

interface TabItem<T extends string> { id: T; label: string; count?: number }

export function Tabs<T extends string>({ id, label, tabs, value, onChange, className = "tabs", style, tabClassName, renderTab }: {
  id: string;
  label: string;
  tabs: TabItem<T>[];
  value: T;
  onChange: (id: T) => void;
  className?: string;
  style?: CSSProperties;
  tabClassName?: (tab: TabItem<T>, selected: boolean) => string;
  renderTab?: (tab: TabItem<T>, index: number) => ReactNode;
}) {
  return (
    <div className={className} style={style} role="tablist" aria-label={label}>
      {tabs.map((t, index) => (
        <button
          key={t.id}
          type="button"
          role="tab"
          id={`${id}-tab-${t.id}`}
          aria-controls={`${id}-panel-${t.id}`}
          aria-selected={value === t.id}
          tabIndex={value === t.id ? 0 : -1}
          className={tabClassName?.(t, value === t.id)}
          onClick={() => onChange(t.id)}
          onKeyDown={(event) => {
            const nextIndex = event.key === "ArrowRight" ? (index + 1) % tabs.length
              : event.key === "ArrowLeft" ? (index - 1 + tabs.length) % tabs.length
              : event.key === "Home" ? 0 : event.key === "End" ? tabs.length - 1 : undefined;
            if (nextIndex === undefined) return;
            event.preventDefault();
            event.stopPropagation();
            const next = tabs[nextIndex];
            if (!next) return;
            onChange(next.id);
            document.getElementById(`${id}-tab-${next.id}`)?.focus();
          }}
        >
          {renderTab ? renderTab(t, index) : <>{t.label}{t.count !== undefined ? <span className="count">{t.count}</span> : null}</>}
        </button>
      ))}
    </div>
  );
}

/** Keep every tab's association present without retaining inactive form drafts. */
export function TabPanel({ groupId, id, active, children, className, style }: { groupId: string; id: string; active: boolean; children: ReactNode; className?: string; style?: CSSProperties }) {
  return <div role="tabpanel" id={`${groupId}-panel-${id}`} aria-labelledby={`${groupId}-tab-${id}`} tabIndex={0} hidden={!active} className={className} style={style}>{active ? children : null}</div>;
}

export function Segmented<T extends string>({ options, value, onChange, label }: { options: { id: T; label: string }[]; value: T; onChange: (v: T) => void; label: string }) {
  return (
    <div className={`segmented ${options.length > 3 ? "segmented--wrap" : ""}`} role="group" aria-label={label}>
      {options.map((o) => (
        <button key={o.id} aria-pressed={value === o.id} onClick={() => onChange(o.id)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** The handle of the inspector's bottom sheet (below 1024px): half height, or nearly full. */
export function SheetGrabber() {
  const [full, setFull] = useState(false);
  return (
    <button
      type="button"
      className="inspector__grabber"
      aria-label={full ? "Show less of the details" : "Show more of the details"}
      aria-expanded={full}
      onClick={(e) => {
        e.currentTarget.closest(".inspector")?.toggleAttribute("data-full", !full);
        setFull(!full);
      }}
    />
  );
}

export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="empty">
      <div style={{ fontWeight: 600, color: "var(--color-on-surface)", marginBottom: 6 }}>{title}</div>
      {children}
    </div>
  );
}

export function Dialog({ title, onClose, children, wide, footer }: { title: string; onClose: () => void; children: ReactNode; wide?: boolean; footer?: ReactNode }) {
  const dialogRef = useRef<HTMLDivElement>(null);
  useModalFocus(dialogRef, onClose);
  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div ref={dialogRef} tabIndex={-1} className={`dialog ${wide ? "dialog--wide" : ""}`} role="dialog" aria-modal="true" aria-label={title}>
        <div className="row" style={{ marginBottom: 16 }}>
          <h2 className="section-title" style={{ margin: 0 }}>
            {title}
          </h2>
          <span style={{ flex: 1 }} />
          <button className="btn btn--quiet btn--sm" onClick={onClose} aria-label="Close">
            Esc
          </button>
        </div>
        {children}
        {footer ? <div className="row" style={{ justifyContent: "flex-end", marginTop: 20, gap: 8 }}>{footer}</div> : null}
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ citations

export function CitationBlock({ citation }: { citation: CitationType & { path?: string } }) {
  return (
    <div className="citation">
      “{citation.quote}”
      <cite>
        {citation.documentTitle}
        {citation.page ? `, p. ${citation.page}` : ""}
        {citation.locator ? ` · ${citation.locator}` : ""}
      </cite>
    </div>
  );
}

export function SourceLink({ path, page, label }: { path: string; page?: number; label: string }) {
  return (
    <a href={corpusFileUrl(path, page)} target="_blank" rel="noreferrer" title="Open the official document from the local corpus">
      {label}
      {page ? `, p. ${page}` : ""} ↗
    </a>
  );
}

// ------------------------------------------------------------------ toasts

interface Toast {
  id: number;
  text: string;
  kind: "info" | "error" | "agent";
}
interface ToastState {
  toasts: Toast[];
  push: (text: string, kind?: Toast["kind"]) => void;
  dismiss: (id: number) => void;
}
let toastSeq = 0;
export const useToasts = create<ToastState>((set, get) => ({
  toasts: [],
  push: (text, kind = "info") => {
    if (kind === "error" && get().toasts.some((t) => t.kind === kind && t.text === text)) return;
    const id = ++toastSeq;
    set((s) => ({ toasts: [...s.toasts.slice(-3), { id, text, kind }] }));
    setTimeout(() => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })), kind === "error" ? 7000 : 4200);
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));
export const toast = (text: string, kind?: Toast["kind"]) => useToasts.getState().push(text, kind);

export function Toasts() {
  const toasts = useToasts((s) => s.toasts);
  const dismiss = useToasts((s) => s.dismiss);
  return (
    <div className="toasts" role="status" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={`toast ${t.kind === "error" ? "toast--error" : t.kind === "agent" ? "toast--agent" : ""}`}>
          {t.kind === "agent" ? <AgentBadge /> : null}
          <span style={{ flex: 1 }}>{t.text}</span>
          <button className="btn btn--quiet btn--sm" onClick={() => dismiss(t.id)} aria-label="Dismiss">
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}

export function frameworkLabel(id: string) {
  return badgeOf(frameworkOf(id));
}

export { pct };

/** The Visua mark: a V with the terracotta agent core and a verified arc. */
export function Logo({ size = 30 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-label="Visua" role="img">
      <path d="M14 18 L32 48 L50 18" fill="none" stroke="var(--color-primary)" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="32" cy="27" r="5" fill="var(--color-tertiary)" />
      <path d="M20 18 A 16 16 0 0 1 44 18" fill="none" stroke="var(--color-status-verified)" strokeWidth="2.5" strokeLinecap="round" opacity=".85" />
    </svg>
  );
}
