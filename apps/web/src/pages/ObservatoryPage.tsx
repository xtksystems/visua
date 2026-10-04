/**
 * Observatory: the 3D framework space + its keyboard-navigable 2D twin (outline)
 * + HUD (lens, view, legend, metrics) + inspector.
 */
import { Box, ChevronDown, ChevronRight, ChevronUp, Crosshair, ListTree, Search } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { useWorkspaceId } from "../lib/workspace.ts";
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

/** Scene shortcuts belong to a focused scene surface, never to an open modal. */
function canUseSceneKeys(event: KeyboardEvent<HTMLElement>) {
  const target = event.target;
  return !event.defaultPrevented && !event.altKey && !event.ctrlKey && !event.metaKey && !event.shiftKey
    && target instanceof HTMLElement
    && !target.closest('input, textarea, select, button, a, [contenteditable]:not([contenteditable="false"]), [role="dialog"], [role="alertdialog"]')
    && !useUi.getState().paletteOpen
    && !document.querySelector('[aria-modal="true"]');
}

function Outline({ nodes, state, selectedId, onSelect, filter, onShortcut }: { nodes: LeanNode[]; state: FrameworkStateBundle | undefined; selectedId: string | null; onSelect: (id: string | null) => void; filter: string; onShortcut: (event: KeyboardEvent<HTMLElement>) => boolean }) {
  const children = useMemo(() => {
    const m = new Map<string | null, LeanNode[]>();
    for (const n of nodes) m.set(n.parentId, [...(m.get(n.parentId) ?? []), n]);
    for (const l of m.values()) l.sort((a, b) => a.order - b.order);
    return m;
  }, [nodes]);
  const byId = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes]);
  const [open, setOpen] = useState<Set<string>>(() => new Set());
  const [activeId, setActiveId] = useState<string | null>(null);
  const rows = useRef(new Map<string, HTMLLIElement>());
  const pendingFocus = useRef<string | null>(null);

  // A deep link reveals its ancestors but leaves inspector, input and dialog focus alone.
  useEffect(() => {
    if (!selectedId) return;
    setOpen((current) => {
      const next = new Set(current);
      let node = byId.get(selectedId);
      while (node?.parentId) {
        next.add(node.parentId);
        node = byId.get(node.parentId);
      }
      return next.size === current.size ? current : next;
    });
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
  const visibleChildren = (parent: string | null) => (children.get(parent) ?? []).filter((node) => !matches || matches.has(node.id));
  const visibleIds = new Set<string>();
  const collectVisible = (parent: string | null) => {
    for (const node of visibleChildren(parent)) {
      visibleIds.add(node.id);
      if (matches || open.has(node.id)) collectVisible(node.id);
    }
  };
  collectVisible(null);
  const tabStop = selectedId && visibleIds.has(selectedId) ? selectedId : activeId && visibleIds.has(activeId) ? activeId : visibleIds.values().next().value;

  // Keyboard drill-in may mount a row on the next render. Only an explicit tree
  // interaction requests focus; external selection changes merely reveal rows.
  useEffect(() => {
    const requested = pendingFocus.current;
    const row = requested ? rows.current.get(requested) : undefined;
    if (row) {
      pendingFocus.current = null;
      row.focus();
      row.scrollIntoView({ block: "nearest" });
    }
    if (selectedId) rows.current.get(selectedId)?.scrollIntoView({ block: "nearest" });
  }, [selectedId, open, matches, activeId]);

  const focusRow = (id: string) => {
    setActiveId(id);
    const row = rows.current.get(id);
    if (row) {
      pendingFocus.current = null;
      row.focus();
      row.scrollIntoView({ block: "nearest" });
    } else pendingFocus.current = id;
  };
  const navigateTo = (id: string | null) => {
    if (id) {
      setOpen((current) => {
        const next = new Set(current);
        let node = byId.get(id);
        while (node?.parentId) {
          next.add(node.parentId);
          node = byId.get(node.parentId);
        }
        return next.size === current.size ? current : next;
      });
      focusRow(id);
    } else {
      const first = visibleChildren(null)[0];
      if (first) focusRow(first.id);
    }
    onSelect(id);
  };
  const onKeyDown = (event: KeyboardEvent<HTMLUListElement>) => {
    if (!canUseSceneKeys(event)) return;
    const target = event.target as HTMLElement;
    if (target.getAttribute("role") !== "treeitem") return;
    if (onShortcut(event)) return;
    const node = byId.get(target.dataset.nodeId ?? "");
    if (!node) return;
    const siblings = visibleChildren(node.parentId);
    const index = siblings.findIndex((sibling) => sibling.id === node.id);
    let destination: string | null | undefined;
    switch (event.key) {
      case "ArrowRight":
      case "ArrowDown":
        destination = siblings[(index + 1) % siblings.length]?.id;
        break;
      case "ArrowLeft":
      case "ArrowUp":
        destination = siblings[(index - 1 + siblings.length) % siblings.length]?.id;
        break;
      case "Enter":
        destination = visibleChildren(node.id)[0]?.id;
        break;
      case "Escape":
      case "Backspace":
        destination = node.parentId;
        break;
      default:
        return;
    }
    event.preventDefault();
    event.stopPropagation();
    if (destination !== undefined) navigateTo(destination);
  };

  const render = (parent: string | null, depth: number): React.ReactNode =>
    visibleChildren(parent).map((n, index, siblings) => {
      const kids = visibleChildren(n.id);
      const expanded = !!matches || open.has(n.id);
      const status = nodeStatus(state, n);
      const unit = state?.units[n.id];
      const title = n.title && n.title !== n.code ? n.title : truncate(n.text, 70);
      return (
        <li
          key={n.id}
          ref={(element) => { if (element) rows.current.set(n.id, element); else rows.current.delete(n.id); }}
          className="outline__item"
          role="treeitem"
          data-node-id={n.id}
          aria-label={`${n.code}${title ? ` ${title}` : ""}`}
          aria-level={depth + 1}
          aria-posinset={index + 1}
          aria-setsize={siblings.length}
          aria-expanded={kids.length ? expanded : undefined}
          aria-selected={selectedId === n.id}
          tabIndex={tabStop === n.id ? 0 : -1}
          onFocus={(event) => { if (event.target === event.currentTarget) setActiveId(n.id); }}
        >
          <div
            id={`outline-${n.id}`}
            className={`outline__row ${selectedId === n.id ? "is-selected" : ""}`}
            style={{ paddingLeft: 8 + depth * 14 }}
            onClick={() => navigateTo(n.id)}
          >
            {kids.length ? (
              <button
                className="outline__toggle"
                tabIndex={-1}
                aria-label={`${expanded ? "Collapse" : "Expand"} ${n.code}`}
                onClick={(event) => {
                  event.stopPropagation();
                  setOpen((current) => {
                    const next = new Set(current);
                    if (next.has(n.id)) next.delete(n.id);
                    else next.add(n.id);
                    return next;
                  });
                  focusRow(n.id);
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
    <ul role="tree" aria-label="Framework outline" className="outline__list" onKeyDown={onKeyDown}>
      {render(null, 0)}
    </ul>
  );
}

export function ObservatoryPage() {
  const ws = useWorkspaceId();
  const { fw: fwParam } = useParams();
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

  const selectNode = useCallback((id: string | null) => {
    ui.select(id);
    setParams((current) => {
      const next = new URLSearchParams(current);
      if (id) next.set("select", id);
      else next.delete("select");
      return next;
    }, { replace: true });
  }, [ui.select, setParams]);

  // Keep a deep link retryable even when requirement details fail to load.
  useEffect(() => {
    const sel = params.get("select");
    if (sel && byId?.has(sel)) {
      ui.select(sel);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params, byId]);

  // Clear selection when switching framework.
  useEffect(() => {
    if (selectedId && byId && !byId.has(selectedId) && !byId.has(params.get("select") ?? "")) selectNode(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [byId]);

  const onHover = useCallback(
    (id: string | null, x?: number, y?: number) => {
      ui.hover(id);
      setPointer(id && x !== undefined && y !== undefined ? { x, y } : null);
    },
    [ui],
  );


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
  // DESIGN.md's keyboard map applies only to the outline or the focused canvas.
  const onShortcut = (event: KeyboardEvent<HTMLElement>) => {
    const selection = useUi.getState().selectedId;
    switch (event.key.toLowerCase()) {
      case "f":
        ui.focus(selection ? [selection] : []);
        break;
      case "l":
        ui.setLens(lenses[(lenses.indexOf(activeLens) + 1) % lenses.length]!);
        break;
      case "/":
        if (!outlineView && !outlineOpen) ui.toggleOutline();
        // When opening the outline, its input mounts after this handler returns.
        requestAnimationFrame(() => filterRef.current?.focus());
        break;
      default:
        return false;
    }
    event.preventDefault();
    event.stopPropagation();
    return true;
  };
  const onCanvasKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.target !== event.currentTarget || !canUseSceneKeys(event) || !layout) return;
    if (onShortcut(event)) return;
    const selection = useUi.getState().selectedId;
    const node = selection ? layout.byId.get(selection) : undefined;
    const siblings = layout.children.get(node?.parentId ?? null) ?? [];
    const index = node ? siblings.findIndex((sibling) => sibling.id === node.id) : -1;
    let destination: string | null | undefined;
    switch (event.key) {
      case "ArrowRight":
      case "ArrowDown":
        destination = siblings[(index + 1) % siblings.length]?.id;
        break;
      case "ArrowLeft":
      case "ArrowUp":
        destination = siblings[(index < 0 ? siblings.length - 1 : (index - 1 + siblings.length) % siblings.length)]?.id;
        break;
      case "Enter":
        destination = layout.children.get(node?.id ?? null)?.[0]?.id;
        break;
      case "Escape":
      case "Backspace":
        destination = node?.parentId;
        break;
      default:
        return;
    }
    event.preventDefault();
    event.stopPropagation();
    if (destination !== undefined) selectNode(destination);
  };
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
      <div className="outline__scroll">{graph.data ? <Outline key={`${workspace.data?.workspace.id ?? ws}:${fw}`} nodes={graph.data.nodes} state={state.data} selectedId={selectedId} onSelect={selectNode} filter={filter} onShortcut={onShortcut} /> : <div className="muted" style={{ padding: 16 }}>Loading framework…</div>}</div>
    </aside>
  );

  // Phones open on the outline, the 3D scene one tap away (DESIGN.md › Layout).
  if (outlineView) {
    return (
      <div className={`observatory is-outline-view ${selectedId ? "has-inspector" : ""}`}>
        {outline}
        {selectedId && byId?.has(selectedId) && <Inspector nodeId={selectedId} onClose={() => selectNode(null)} />}
      </div>
    );
  }

  return (
    <div className={`observatory ${outlineOpen ? "has-outline" : ""} ${selectedId ? "has-inspector" : ""}`} data-stage-root>
      {outlineOpen && outline}
      <section
        className="observatory__canvas"
        data-stage
        tabIndex={0}
        aria-label="Framework canvas"
        aria-describedby="observatory-keyboard-help"
        onKeyDown={onCanvasKeyDown}
        onPointerDown={(event) => {
          const target = event.target;
          if (target instanceof Element && !target.closest('[data-hud], button, a, input, textarea, select, [role="dialog"], [contenteditable]')) event.currentTarget.focus({ preventScroll: true });
        }}
        onPointerLeave={() => onHover(null)}
      >
        <span id="observatory-keyboard-help" className="sr-only">Arrow keys move between siblings. Enter drills into children. Backspace or Escape moves to the parent. F frames the selection. L changes the lens. Slash opens the outline filter.</span>
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
            onSelect={(id) => selectNode(id)}
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
              <button className="btn btn--quiet btn--sm" onClick={() => (selectNode(null), ui.focus([]))}>
                {graph.data?.framework.shortName ?? badgeOf(fw)}
              </button>
              {breadcrumb.map((b) => (
                <span key={b.id} className="row" style={{ gap: 4 }}>
                  <ChevronRight size={12} className="muted" />
                  <button className="btn btn--quiet btn--sm mono" onClick={() => selectNode(b.id)}>
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
              <button className="btn btn--sm" onClick={() => (selectNode(null), ui.focus([]))} title="Frame everything (F with nothing selected)">
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
                    ? `Height = coverage level · outlined glass = full coverage gap · ${view === "constellation" ? "outer arc" : "beacon ring"} = coverage · small dots: no link in your frameworks${fw === "mitre-atlas" ? " · mitigations are listed in each technique's inspector" : ""}`
                    : `Height = current level · outlined glass = target gap · ${view === "constellation" ? "outer arc" : "beacon ring"} = readiness · small dots: out of scope · ◆ task · ▲ evidence`}
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
      {selectedId && byId?.has(selectedId) && <Inspector nodeId={selectedId} onClose={() => selectNode(null)} />}
    </div>
  );
}
