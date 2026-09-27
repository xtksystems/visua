/**
 * Observatory: the 3D framework space + its keyboard-navigable 2D twin (outline)
 * + HUD (lens, view, legend, metrics) + inspector.
 */
import { Box, ChevronDown, ChevronRight, ChevronUp, Crosshair, ListTree, Search } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import type { Status } from "@visua/core";
import { Inspector } from "../components/inspector/Inspector.tsx";
import { ThreatLinkFilter } from "../components/threats/Coverage.tsx";
import { StatusBar, StatusGlyph } from "../components/ui/index.tsx";
import { STATUS_LABEL, truncate } from "../lib/format.ts";
import { badgeOf, isThreatCatalog, threatCatalogs } from "../lib/frameworks.ts";
import { PHONE, useMediaQuery } from "../lib/media.ts";
import { useFrameworkState, useGraph, useWorkspace } from "../lib/queries.ts";
import type { FrameworkStateBundle, LeanNode } from "../lib/types.ts";
import { LENS_INFO, THREAT_LENS, THREAT_STATUS_LABEL, overlaySwatch } from "../scene/colors.ts";
import { computeLayout } from "../scene/layout.ts";
import { Observatory } from "../scene/Observatory.tsx";
import { useAgentActivity } from "../state/agentActivity.ts";
import { LENSES, useUi, type Lens } from "../state/ui.ts";

function nodeStatus(state: FrameworkStateBundle | undefined, node: LeanNode): Status {
  if (!state) return "not-started";
  return node.assessable ? (state.units[node.id]?.status ?? "not-started") : (state.groups[node.id]?.status ?? "not-started");
}

function Outline({ nodes, state, selectedId, onSelect, filter }: { nodes: LeanNode[]; state: FrameworkStateBundle | undefined; selectedId: string | null; onSelect: (id: string) => void; filter: string }) {
  const children = useMemo(() => {
    const m = new Map<string | null, LeanNode[]>();
    for (const n of nodes) m.set(n.parentId, [...(m.get(n.parentId) ?? []), n]);
    for (const l of m.values()) l.sort((a, b) => a.order - b.order);
    return m;
  }, [nodes]);
  const byId = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes]);
  const [open, setOpen] = useState<Set<string>>(() => new Set());
  // Keep the selection's ancestors expanded.
  useEffect(() => {
    if (!selectedId) return;
    const next = new Set(open);
    let cur = byId.get(selectedId);
    while (cur?.parentId) {
      next.add(cur.parentId);
      cur = byId.get(cur.parentId);
    }
    if (next.size !== open.size) setOpen(next);
    document.getElementById(`outline-${CSS.escape(selectedId)}`)?.scrollIntoView({ block: "nearest" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, byId]);

  const q = filter.trim().toLowerCase();
  const matches = useMemo(() => {
    if (!q) return null;
    const hit = new Set<string>();
    for (const n of nodes) {
      if (n.code.toLowerCase().includes(q) || n.title.toLowerCase().includes(q) || n.text.toLowerCase().includes(q)) {
        let cur: LeanNode | undefined = n;
        while (cur) {
          hit.add(cur.id);
          cur = cur.parentId ? byId.get(cur.parentId) : undefined;
        }
      }
    }
    return hit;
  }, [q, nodes, byId]);

  const render = (parent: string | null, depth: number): React.ReactNode =>
    (children.get(parent) ?? [])
      .filter((n) => !matches || matches.has(n.id))
      .map((n) => {
        const kids = children.get(n.id) ?? [];
        const expanded = !!matches || open.has(n.id);
        const status = nodeStatus(state, n);
        const unit = state?.units[n.id];
        return (
          <li key={n.id} role="treeitem" aria-expanded={kids.length ? expanded : undefined} aria-selected={selectedId === n.id}>
            <div
              id={`outline-${n.id}`}
              className={`outline__row ${selectedId === n.id ? "is-selected" : ""}`}
              style={{ paddingLeft: 8 + depth * 14 }}
              onClick={() => onSelect(n.id)}
            >
              {kids.length ? (
                <button
                  className="outline__toggle"
                  aria-label={expanded ? "Collapse" : "Expand"}
                  onClick={(e) => {
                    e.stopPropagation();
                    const next = new Set(open);
                    if (next.has(n.id)) next.delete(n.id);
                    else next.add(n.id);
                    setOpen(next);
                  }}
                >
                  {expanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                </button>
              ) : (
                <span style={{ width: 18 }} />
              )}
              <span className={`status--${status}`} style={{ background: "transparent", display: "inline-flex" }} title={STATUS_LABEL[status]}>
                <StatusGlyph status={status} size={11} />
              </span>
              <span className="mono outline__code">{n.code}</span>
              <span className="outline__text">{truncate(n.title && n.title !== n.code ? n.title : n.text, 70)}</span>
              {unit && unit.applicable ? (
                <span className="mono muted" style={{ fontSize: 10.5 }} title="Current → target">
                  {unit.current}→{unit.target}
                </span>
              ) : null}
            </div>
            {kids.length > 0 && expanded ? (
              <ul role="group" className="outline__list">
                {render(n.id, depth + 1)}
              </ul>
            ) : null}
          </li>
        );
      });
  return (
    <ul role="tree" aria-label="Framework outline" className="outline__list">
      {render(null, 0)}
    </ul>
  );
}

export function ObservatoryPage() {
  const { ws = "", fw: fwParam } = useParams();
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const workspace = useWorkspace(ws);
  const enabled = workspace.data?.frameworks.map((f) => f.id) ?? [];
  const fw = fwParam ?? enabled[0] ?? "nist-csf-2.0";
  const graph = useGraph(fw);
  const state = useFrameworkState(workspace.data?.workspace.id, fw);
  const { selectedId, hoveredId, focusIds, focusSeq, lens, view, outlineOpen } = useUi();
  const ui = useUi();
  const running = useAgentActivity((s) => Object.keys(s.running).length > 0);
  const [filter, setFilter] = useState("");
  const [pointer, setPointer] = useState<{ x: number; y: number } | null>(null);
  const legendOpen = useUi((s) => s.legendOpen);
  const phone = useMediaQuery(PHONE);
  const [threeD, setThreeD] = useState(false);
  const outlineView = phone && !threeD;
  const filterRef = useRef<HTMLInputElement>(null);

  const layout = useMemo(() => (graph.data ? computeLayout(graph.data.nodes, view) : undefined), [graph.data, view]);
  const byId = layout?.byId;

  // Deep link: ?select=<nodeId>
  useEffect(() => {
    const sel = params.get("select");
    if (sel && byId?.has(sel)) {
      ui.select(sel);
      params.delete("select");
      setParams(params, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params, byId]);

  // Clear selection when switching framework.
  useEffect(() => {
    if (selectedId && byId && !byId.has(selectedId)) ui.select(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [byId]);

  const onHover = useCallback(
    (id: string | null, x?: number, y?: number) => {
      ui.hover(id);
      setPointer(id && x !== undefined && y !== undefined ? { x, y } : null);
    },
    [ui],
  );

  // Keyboard map (DESIGN.md › Accessibility).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest("input, textarea, select, [contenteditable]") || useUi.getState().paletteOpen) return;
      if (!layout) return;
      const sel = useUi.getState().selectedId;
      const node = sel ? layout.byId.get(sel) : undefined;
      const siblings = node ? (layout.children.get(node.parentId) ?? []) : (layout.children.get(null) ?? []);
      const i = node ? siblings.findIndex((s) => s.id === node.id) : -1;
      switch (e.key) {
        case "ArrowRight":
        case "ArrowDown":
          e.preventDefault();
          ui.select(siblings[(i + 1) % siblings.length]?.id ?? null);
          break;
        case "ArrowLeft":
        case "ArrowUp":
          e.preventDefault();
          ui.select(siblings[(i - 1 + siblings.length) % siblings.length]?.id ?? null);
          break;
        case "Enter": {
          const first = node ? layout.children.get(node.id)?.[0] : layout.children.get(null)?.[0];
          if (first) ui.select(first.id);
          break;
        }
        case "Escape":
        case "Backspace":
          if (node) ui.select(node.parentId);
          break;
        case "f":
        case "F":
          ui.focus(sel ? [sel] : []);
          break;
        case "l":
        case "L":
          ui.cycleLens();
          break;
        case "/":
          e.preventDefault();
          filterRef.current?.focus();
          break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [layout, ui]);

  const hovered = hoveredId && byId ? byId.get(hoveredId) : undefined;
  const hoveredUnit = hoveredId ? state.data?.units[hoveredId] : undefined;
  const hoveredGroup = hoveredId ? state.data?.groups[hoveredId] : undefined;
  // The overlay lens exists only where the framework has an overlay (CSF: Cyber AI Profile; SP 800-53: COSAiS).
  const overlay = state.data?.overlay ?? null;
  // Threat catalogs: coverage (status lens) and its gap only.
  // Threat catalogs open with coverage in place of status.
  const threat = isThreatCatalog(fw);
  const activeLens: Lens = threat ? (lens === "gap" ? "gap" : "status") : lens === "overlay" && !overlay ? "status" : lens;
  const lensInfo = threat
    ? THREAT_LENS[activeLens === "gap" ? "gap" : "status"]
    : activeLens === "overlay" && overlay
      ? {
          title: overlay.shortName,
          description: LENS_INFO.overlay.description,
          legend: [...overlay.levels.map((l) => ({ label: l.label, color: overlaySwatch(l.level) })), { label: "Not in the overlay", color: LENS_INFO.overlay.legend.at(-1)!.color }],
        }
      : LENS_INFO[activeLens];
  const breadcrumb: LeanNode[] = [];
  let cur = selectedId && byId ? byId.get(selectedId) : undefined;
  while (cur) {
    breadcrumb.unshift(cur);
    cur = cur.parentId ? byId?.get(cur.parentId) : undefined;
  }

  const lenses: Lens[] = threat ? ["status", "gap"] : LENSES.filter((l) => l !== "overlay" || overlay);
  const lensTitle = (l: Lens) => (threat ? THREAT_LENS[l as "status" | "gap"] : LENS_INFO[l]).title;
  const chips = threat ? threatCatalogs().map((c) => c.id) : [...enabled, ...(enabled.includes("nist-rmf") ? [] : ["nist-rmf"])];
  const chipLabel = (id: string) => (id === "nist-rmf" && !enabled.includes("nist-rmf") ? "RMF steps" : badgeOf(id));
  const outline = (
    <aside className="outline" aria-label="Outline (2D twin of the 3D scene)" data-hud>
      <div className="outline__head">
        <div className="row" style={{ gap: 8 }}>
          <Search size={14} className="muted" />
          <input ref={filterRef} className="input" style={{ minHeight: 30, height: 30 }} placeholder="Filter (press /)" value={filter} onChange={(e) => setFilter(e.target.value)} aria-label="Filter outline" />
          {outlineView && (
            <button className="btn btn--sm" onClick={() => setThreeD(true)} title="Show the 3D scene">
              <Box size={13} /> 3D
            </button>
          )}
        </div>
        {outlineView && (
          <select className="select" style={{ marginTop: 8 }} aria-label="Framework" value={fw} onChange={(e) => navigate(`/w/${ws}/observatory/${e.target.value}`)}>
            {[...chips, ...(threat ? [] : threatCatalogs().map((c) => c.id))].map((id) => (
              <option key={id} value={id}>
                {chipLabel(id)}
              </option>
            ))}
          </select>
        )}
      </div>
      <div className="outline__scroll">{graph.data ? <Outline nodes={graph.data.nodes} state={state.data} selectedId={selectedId} onSelect={(id) => ui.select(id)} filter={filter} /> : <div className="muted" style={{ padding: 16 }}>Loading framework…</div>}</div>
    </aside>
  );

  // Phones open on the outline, the 3D scene one tap away (DESIGN.md › Layout).
  if (outlineView) {
    return (
      <div className={`observatory is-outline-view ${selectedId ? "has-inspector" : ""}`}>
        {outline}
        {selectedId && byId?.has(selectedId) && <Inspector nodeId={selectedId} onClose={() => ui.select(null)} />}
      </div>
    );
  }

  return (
    <div className={`observatory ${outlineOpen ? "has-outline" : ""} ${selectedId ? "has-inspector" : ""}`} data-stage-root>
      {outlineOpen && outline}
      <section className="observatory__canvas" data-stage onPointerLeave={() => onHover(null)}>
        {layout ? (
          <Observatory
            layout={layout}
            state={state.data}
            lens={activeLens}
            selectedId={selectedId}
            hoveredId={hoveredId}
            focusIds={focusIds}
            focusSeq={focusSeq}
            agentActive={running}
            onHover={onHover}
            onSelect={(id) => ui.select(id)}
          />
        ) : (
          <div className="muted" style={{ padding: 32 }}>
            Preparing the Observatory…
          </div>
        )}

        {/* One bar: its two groups wrap onto two lines rather than overlap. */}
        <div className="hud-bar">
          <div className="hud hud-bar__group" data-hud>
            <div className="row" style={{ gap: 6, flexWrap: "wrap" }}>
              <button className="btn btn--quiet btn--sm btn--icon" onClick={() => (phone ? setThreeD(false) : ui.toggleOutline())} aria-label={phone ? "Show the outline" : "Toggle outline"} aria-pressed={phone ? false : outlineOpen} title="Toggle outline (2D twin)">
                <ListTree size={15} />
              </button>
              {threat && (
                <button className="chip" onClick={() => navigate(`/w/${ws}/observatory/${enabled[0] ?? "nist-csf-2.0"}`)} title="Back to your frameworks">
                  ← Frameworks
                </button>
              )}
              <span className="hud-chips hud-chips--frameworks row" style={{ gap: 6, flexWrap: "wrap" }}>
                {chips.map((id) => (
                  <button key={id} className="chip" aria-pressed={id === fw} onClick={() => navigate(`/w/${ws}/observatory/${id}`)} title={threat ? "Coverage derived from the requirements linked to each threat" : undefined}>
                    {chipLabel(id)}
                  </button>
                ))}
                {!threat && (
                  <button className="chip" onClick={() => navigate(`/w/${ws}/observatory/${threatCatalogs()[0]?.id ?? ""}`)} title="AI threat catalogs (MITRE ATLAS, OWASP, NIST AI 100-2), colored by coverage">
                    Threats →
                  </button>
                )}
              </span>
              <select className="select hud-select hud-select--frameworks" aria-label="Framework" value={fw} onChange={(e) => navigate(`/w/${ws}/observatory/${e.target.value}`)}>
                {[...chips, ...(threat ? [] : threatCatalogs().map((c) => c.id))].map((id) => (
                  <option key={id} value={id}>
                    {chipLabel(id)}
                  </option>
                ))}
              </select>
            </div>
            <nav aria-label="Breadcrumb" className="row" style={{ gap: 4, marginTop: 8, fontSize: 12, flexWrap: "wrap" }}>
              <button className="btn btn--quiet btn--sm" onClick={() => (ui.select(null), ui.focus([]))}>
                {graph.data?.framework.shortName ?? badgeOf(fw)}
              </button>
              {breadcrumb.map((b) => (
                <span key={b.id} className="row" style={{ gap: 4 }}>
                  <ChevronRight size={12} className="muted" />
                  <button className="btn btn--quiet btn--sm mono" onClick={() => ui.select(b.id)}>
                    {b.code}
                  </button>
                </span>
              ))}
            </nav>
          </div>

          <div className="hud hud-bar__group hud-bar__group--end" data-hud>
            <div className="row row--wrap" style={{ gap: 6, justifyContent: "flex-end" }} role="group" aria-label="Lens">
              <span className="eyebrow" style={{ marginRight: 4 }}>
                Lens
              </span>
              <span className="hud-chips row" style={{ gap: 6, flexWrap: "wrap", justifyContent: "flex-end" }}>
                {lenses.map((l) => (
                  <button key={l} className="chip" aria-pressed={activeLens === l} onClick={() => ui.setLens(l)} title={(threat ? THREAT_LENS[l as "status" | "gap"] : LENS_INFO[l]).description}>
                    {lensTitle(l)}
                  </button>
                ))}
              </span>
              <select className="select hud-select" aria-label="Lens" value={activeLens} onChange={(e) => ui.setLens(e.target.value as Lens)}>
                {lenses.map((l) => (
                  <option key={l} value={l}>
                    {lensTitle(l)}
                  </option>
                ))}
              </select>
            </div>
            <div className="row row--wrap" style={{ gap: 6, justifyContent: "flex-end", marginTop: 8 }}>
              <div className="segmented" role="group" aria-label="View">
                <button aria-pressed={view === "constellation"} onClick={() => ui.setView("constellation")}>
                  Constellation
                </button>
                <button aria-pressed={view === "terrain"} onClick={() => ui.setView("terrain")}>
                  Terrain
                </button>
              </div>
              <button className="btn btn--sm" onClick={() => (ui.select(null), ui.focus([]))} title="Frame everything (F with nothing selected)">
                <Crosshair size={13} /> Reset view
              </button>
            </div>
          </div>
        </div>

        <div className="hud-foot">
          <div className={`hud hud-legend ${legendOpen ? "is-open" : ""}`} data-hud>
            <button className="hud-legend__toggle" aria-expanded={legendOpen} onClick={() => ui.toggleLegend()}>
              <span className="eyebrow">{lensInfo.title} lens</span>
              {!legendOpen && (
                <span className="row" style={{ gap: 3 }} aria-hidden>
                  {lensInfo.legend.map((item) => (
                    <span key={item.label} style={{ width: 8, height: 8, borderRadius: 2, background: item.color }} />
                  ))}
                </span>
              )}
              {legendOpen ? <ChevronDown size={13} aria-hidden /> : <ChevronUp size={13} aria-hidden />}
            </button>
            {legendOpen && (
              <>
                <div className="stack" style={{ gap: 4, marginTop: 6 }}>
                  {lensInfo.legend.map((item) => (
                    <div key={item.label} className="row" style={{ gap: 8, fontSize: 12 }}>
                      <span style={{ width: 10, height: 10, borderRadius: 2, background: item.color }} />
                      {item.label}
                    </div>
                  ))}
                </div>
                <div className="muted" style={{ fontSize: 11, marginTop: 8, maxWidth: 230 }}>
                  {threat
                    ? `Height = coverage level · glass = gap to full coverage · small dots: no link in your frameworks${fw === "mitre-atlas" ? " · mitigations are listed in each technique's inspector" : ""}`
                    : "Height = current level · glass = gap to target · small dots: out of scope · ◆ task · ▲ evidence"}
                </div>
              </>
            )}
          </div>

          {state.data && (
            <div className="hud hud-stats" data-hud>
              <div className="row" style={{ gap: 16, alignItems: "flex-end" }}>
                <div>
                  <div className="eyebrow">{threat ? "Coverage" : "Readiness"}</div>
                  <div className="metric__value hud-stats__value">
                    {Math.round(state.data.overall.readiness * 100)}
                    <small>%</small>
                  </div>
                </div>
                <div>
                  <div className="eyebrow">{threat ? "Not fully covered" : "Gaps"}</div>
                  <div className="mono" style={{ fontSize: 18 }}>
                    {state.data.overall.gaps}
                  </div>
                </div>
                {threat ? (
                  <div>
                    <div className="eyebrow">In scope</div>
                    <div className="mono" style={{ fontSize: 18 }}>
                      {state.data.overall.total}
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="eyebrow">Evidence</div>
                    <div className="mono" style={{ fontSize: 18 }}>
                      {Math.round(state.data.overall.evidenceCoverage * 100)}%
                    </div>
                  </div>
                )}
              </div>
              {threat && (
                <div style={{ marginTop: 10 }}>
                  <ThreatLinkFilter />
                  <div className="muted" style={{ fontSize: 11, marginTop: 6 }}>
                    Coverage derived from linked requirements, never assessed
                  </div>
                </div>
              )}
              <div className="hud-stats__bar">
                <StatusBar counts={state.data.overall.counts} />
              </div>
              <div className="muted hud-stats__keys">←→ siblings · Enter drill in · Esc up · F frame · L lens · / filter</div>
            </div>
          )}
        </div>

        {hovered && pointer && (
          <div className="tooltip" style={{ left: pointer.x + 14, top: pointer.y + 14 }} role="tooltip">
            <div className="row" style={{ gap: 8 }}>
              <span className="mono" style={{ color: "var(--color-primary)", fontWeight: 600 }}>
                {hovered.code}
              </span>
              <span className="muted">{hovered.title && hovered.title !== hovered.code ? hovered.title : ""}</span>
            </div>
            <div style={{ marginTop: 4 }}>{truncate(hovered.text, 180)}</div>
            {hoveredUnit && (
              <div className="row" style={{ marginTop: 6, gap: 8, fontSize: 12 }}>
                <span className={`status status--${hoveredUnit.status}`}>
                  <StatusGlyph status={hoveredUnit.status} />
                  {threat ? THREAT_STATUS_LABEL[hoveredUnit.status] : STATUS_LABEL[hoveredUnit.status]}
                </span>
                <span className="mono muted">
                  {hoveredUnit.current}→{hoveredUnit.target}
                </span>
                {hoveredUnit.upcoming ? <span className="muted">○ takes effect {hoveredUnit.upcoming}</span> : null}
                {hoveredUnit.openTasks ? <span className="muted">{hoveredUnit.openTasks} task(s)</span> : null}
                {hoveredUnit.evidence ? <span className="muted">{hoveredUnit.evidence} evidence</span> : null}
              </div>
            )}
            {hoveredGroup && (
              <div className="muted" style={{ marginTop: 6, fontSize: 12 }}>
                {Math.round(hoveredGroup.readiness * 100)}% ready · {hoveredGroup.gaps} gaps · {hoveredGroup.total} in scope
              </div>
            )}
          </div>
        )}
      </section>
      {selectedId && byId?.has(selectedId) && <Inspector nodeId={selectedId} onClose={() => ui.select(null)} />}
    </div>
  );
}
