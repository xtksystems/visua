/**
 * When state-law obligations take effect. One column per month with effective dates:
 * its height is the number of obligations that take effect then, filled when they are
 * in force and outlined when they are still to come; a dashed line marks today. Only
 * the next wave and the largest month carry a label: every month shows its laws on
 * hover and keyboard focus, and the list view gives every date in words.
 *
 * The SVG is drawn at its real width in pixels, so its text stays at the type scale.
 */
import { useLayoutEffect, useMemo, useState } from "react";
import { Segmented } from "../ui/index.tsx";

export interface TimelineEntry {
  date: string;
  lawCode: string;
  lawId: string;
  label: string;
  obligations: number;
  past: boolean;
}

interface Month {
  month: string;
  /** Dates before the window fold into its first month. */
  earlier: boolean;
  laws: { code: string; title: string; obligations: number; date: string; past: boolean }[];
  obligations: number;
  past: boolean;
}

const t = (d: string) => new Date(`${d.length === 7 ? `${d}-01` : d}T00:00:00Z`).getTime();
const DAY = 86_400_000;

/** The width of an element, followed as it resizes (a callback ref, so a remounted element is followed too). */
function useWidth() {
  const [el, setEl] = useState<HTMLElement | null>(null);
  const [width, setWidth] = useState(0);
  useLayoutEffect(() => {
    if (!el) return;
    const measure = () => setWidth(el.clientWidth);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [el]);
  return [setEl, width] as const;
}

export function LawTimeline({ timeline, today }: { timeline: TimelineEntry[]; today: string }) {
  const [view, setView] = useState<"chart" | "list">("chart");
  const [ref, width] = useWidth();
  const [hover, setHover] = useState<string | null>(null);

  const months = useMemo(() => {
    const windowStart = new Date(t(today) - 2 * 365 * DAY).toISOString().slice(0, 7);
    const by = new Map<string, Month>();
    for (const p of timeline) {
      const earlier = p.date.slice(0, 7) < windowStart;
      const month = earlier ? windowStart : p.date.slice(0, 7);
      const m = by.get(month) ?? { month, earlier: false, laws: [], obligations: 0, past: true };
      m.laws.push({ code: p.lawCode, title: p.label, obligations: p.obligations, date: p.date, past: p.past });
      m.obligations += p.obligations;
      m.past = m.past && p.past;
      m.earlier = m.earlier || earlier;
      by.set(month, m);
    }
    return [...by.values()].sort((a, b) => a.month.localeCompare(b.month));
  }, [timeline, today]);
  if (!months.length) return null;

  // Scales: time across, obligations up. Room for labels above, the axis below.
  const W = Math.max(width, 280);
  const pad = 16;
  const top = 34;
  const base = 104;
  const H = base + 26;
  const min = t(months[0]!.month) - 45 * DAY;
  const max = Math.max(t(months.at(-1)!.month), t(today)) + 75 * DAY;
  const x = (d: string) => pad + ((t(d) - min) / (max - min)) * (W - 2 * pad);
  const most = Math.max(...months.map((m) => m.obligations));
  const h = (n: number) => 6 + (n / most) * (base - top - 6);
  const band = Math.max(8, Math.min(16, ((W - 2 * pad) / ((max - min) / (30 * DAY))) * 0.7));
  const years: number[] = [];
  for (let y = new Date(min).getUTCFullYear(); y <= new Date(max).getUTCFullYear(); y++) if (t(`${y}-01-01`) > min && t(`${y}-01-01`) < max) years.push(y);
  const label = (m: Month) => `${m.earlier ? "≤ " : ""}${m.month} · ${m.laws.length === 1 ? m.laws[0]!.code : `${new Set(m.laws.map((l) => l.code)).size} laws`}`;

  // Selective direct labels: the next wave to come, then the largest month already in force, if they do not collide.
  const next = months.find((m) => !m.past && m.month >= today.slice(0, 7));
  const largest = [...months].filter((m) => m.past).sort((a, b) => b.obligations - a.obligations)[0];
  const labeled: { m: Month; x: number; anchor: "start" | "end"; text: string }[] = [];
  for (const m of [next, largest]) {
    if (!m || labeled.some((l) => l.m === m)) continue;
    const text = m === next ? `Next: ${label(m)}` : label(m);
    const px = x(m.month);
    const w = text.length * 6.7;
    const anchor = px + w > W - pad ? "end" : "start";
    const [a, b] = anchor === "start" ? [px - 2, px + w] : [px - w, px + 2];
    if (labeled.some((l) => (l.anchor === "start" ? l.x < b && a < l.x + l.text.length * 6.7 : l.x - l.text.length * 6.7 < b && a < l.x))) continue;
    labeled.push({ m, x: px, anchor, text });
  }
  const focus = months.find((m) => m.month === hover);

  return (
    <div className="panel">
      <div className="panel__head">
        <h2>When obligations take effect</h2>
        <span className="spacer" />
        <Segmented
          label="Timeline view"
          value={view}
          onChange={(v) => setView(v)}
          options={[
            { id: "chart", label: "Chart" },
            { id: "list", label: "List" },
          ]}
        />
      </div>
      {view === "chart" ? (
        <>
          <div className="row row--wrap law-timeline__legend" aria-hidden>
            <span className="row" style={{ gap: 6 }}>
              <svg width="10" height="12">
                <rect x="1" y="1" width="8" height="11" rx="2" fill="var(--color-framework-law)" />
              </svg>
              In force
            </span>
            <span className="row" style={{ gap: 6 }}>
              <svg width="10" height="12">
                <rect x="1.75" y="1.75" width="6.5" height="9.5" rx="2" fill="var(--color-surface)" stroke="var(--color-framework-law)" strokeWidth="1.5" />
              </svg>
              Upcoming
            </span>
            <span className="row" style={{ gap: 6 }}>
              <svg width="10" height="12">
                <line x1="5" x2="5" y1="0" y2="12" stroke="var(--color-primary)" strokeDasharray="3 2" />
              </svg>
              Today, {today}
            </span>
            <span className="muted">Height: obligations taking effect that month</span>
          </div>
          <div ref={ref} className="law-timeline" onPointerLeave={() => setHover(null)}>
            {width > 0 && (
              <svg width={W} height={H} role="list" aria-label="Effective-date timeline of the tracked laws">
                <line x1={pad} x2={W - pad} y1={base} y2={base} stroke="var(--color-outline-strong)" strokeWidth={1} />
                {years.map((y) => (
                  <g key={y} aria-hidden>
                    <line x1={x(`${y}-01-01`)} x2={x(`${y}-01-01`)} y1={base} y2={base + 5} stroke="var(--color-outline-strong)" />
                    <text x={x(`${y}-01-01`) + 3} y={base + 18} fill="var(--color-on-surface-muted)" fontSize={11}>
                      {y}
                    </text>
                  </g>
                ))}
                <line x1={x(today)} x2={x(today)} y1={top - 12} y2={base + 5} stroke="var(--color-primary)" strokeDasharray="3 3" aria-hidden />
                {months.map((m) => {
                  const px = x(m.month);
                  const bh = h(m.obligations);
                  const text = `${m.earlier ? `${m.month} or earlier` : m.month}: ${m.laws.map((l) => l.code).join(", ")} — ${m.obligations} obligation${m.obligations === 1 ? "" : "s"} ${m.past ? "in force" : "take effect"}`;
                  return (
                    <g
                      key={m.month}
                      role="listitem"
                      tabIndex={0}
                      aria-label={text}
                      className={`law-timeline__month ${hover === m.month ? "is-active" : ""}`}
                      onPointerEnter={() => setHover(m.month)}
                      onFocus={() => setHover(m.month)}
                      onBlur={() => setHover(null)}
                    >
                      {/* The hit area is the whole column band, not just the bar. */}
                      <rect x={px - Math.max(12, band / 2 + 4)} y={top - 12} width={Math.max(24, band + 8)} height={base - top + 18} fill="transparent" />
                      <path
                        d={`M${px - band / 2},${base} v${-(bh - 4)} q0,-4 4,-4 h${band - 8} q4,0 4,4 v${bh - 4} z`}
                        fill={m.past ? "var(--color-framework-law)" : "var(--color-surface)"}
                        stroke={m.past ? "none" : "var(--color-framework-law)"}
                        strokeWidth={m.past ? 0 : 1.5}
                      />
                    </g>
                  );
                })}
                {labeled.map((l) => (
                  <g key={l.m.month} aria-hidden>
                    <line x1={l.x} x2={l.x} y1={base - h(l.m.obligations) - 3} y2={top - 8} stroke="var(--color-outline-strong)" />
                    <text x={l.anchor === "start" ? l.x + 4 : l.x - 4} y={top - 12} textAnchor={l.anchor} fill="var(--color-on-surface)" stroke="var(--color-surface)" strokeWidth={4} paintOrder="stroke" fontSize={11} fontFamily="var(--font-code-sm-family)">
                      {l.text}
                    </text>
                  </g>
                ))}
              </svg>
            )}
            {focus && (
              <div className="tooltip law-timeline__tip" role="status" style={{ left: Math.min(Math.max(8, x(focus.month) - 140), W - 288), top: 4 }}>
                <div className="row" style={{ gap: 8 }}>
                  <strong className="mono">{focus.obligations}</strong>
                  <span className="muted">
                    obligation{focus.obligations === 1 ? "" : "s"} {focus.past ? "in force since" : "take effect"} {focus.earlier ? `${focus.month} or earlier` : focus.month}
                  </span>
                </div>
                <div className="stack" style={{ gap: 2, marginTop: 6 }}>
                  {focus.laws.slice(0, 8).map((l) => (
                    <div key={`${l.code}-${l.date}`} className="row" style={{ gap: 8, fontSize: 12 }}>
                      <span className="mono" style={{ minWidth: 26, textAlign: "right" }}>
                        {l.obligations}
                      </span>
                      <span className="mono muted">{l.code}</span>
                      <span className="muted">{l.date}</span>
                    </div>
                  ))}
                  {focus.laws.length > 8 && <div className="muted" style={{ fontSize: 12 }}>and {focus.laws.length - 8} more</div>}
                </div>
              </div>
            )}
          </div>
        </>
      ) : (
        <table className="table table--timeline" aria-label="Effective dates of the tracked laws">
          <thead>
            <tr>
              <th style={{ width: 110 }}>Date</th>
              <th>Law</th>
              <th style={{ width: 110 }}>Obligations</th>
              <th style={{ width: 120 }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {[...timeline]
              .sort((a, b) => a.date.localeCompare(b.date) || a.lawCode.localeCompare(b.lawCode))
              .map((p) => (
                <tr key={`${p.lawCode}-${p.date}`}>
                  <td className="mono">{p.date}</td>
                  <td>
                    <span className="mono">{p.lawCode}</span> <span className="muted">{p.label}</span>
                  </td>
                  <td className="mono">{p.obligations}</td>
                  <td>{p.past ? "● In force" : "○ Upcoming"}</td>
                </tr>
              ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
