/**
 * Threat views: MITRE ATLAS, the OWASP Top 10s for LLM and agentic applications,
 * and NIST AI 100-2, seen through the requirements a workspace implements.
 *
 * Threats are never assessed. Each one's coverage is derived from the requirements
 * its publishers link to it, and every link keeps its status: final, draft (NIST
 * drafts), unreviewed (OWASP's community crosswalk) or superseded.
 */
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Info, Search, Telescope } from "lucide-react";
import { useId, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Inspector } from "../components/inspector/Inspector.tsx";
import { COVERAGE_LABEL, CoverageBar, CoverageChip, CoverageGlyph, CoverageLegend, coverageColor, LINK_STATUS_HELP, LinkStatusBadge, ThreatLinkFilter } from "../components/threats/Coverage.tsx";
import { Empty, FrameworkBadge, Segmented, TabPanel, Tabs } from "../components/ui/index.tsx";
import { useWorkspaceId } from "../lib/workspace.ts";
import { api } from "../lib/api.ts";
import { truncate } from "../lib/format.ts";
import { threatCatalogs } from "../lib/frameworks.ts";
import { keys } from "../lib/queries.ts";
import type { CoverageState, LinkStatus, ThreatCatalogState, ThreatCoverage, ThreatNode, ThreatsOverview } from "../lib/types.ts";
import { useUi } from "../state/ui.ts";

const enc = encodeURIComponent;

type Show = "all" | "linked" | "gaps";
const SHOW: { id: Show; label: string }[] = [
  { id: "all", label: "All" },
  { id: "linked", label: "With links" },
  { id: "gaps", label: "Open or partial" },
];

const visible = (c: ThreatCoverage | undefined, show: Show) => {
  if (!c || show === "all") return true;
  if (show === "linked") return c.state !== "unmapped";
  return c.state === "open" || c.state === "partial";
};

function Cell({ node, coverage, selected, onSelect, subs, tabIndex, onFocus }: { node: ThreatNode; coverage?: ThreatCoverage; selected: boolean; onSelect: (id: string) => void; subs?: number; tabIndex?: number; onFocus?: () => void }) {
  const state: CoverageState = coverage?.state ?? "unmapped";
  return (
    <button
      type="button"
      data-key={node.id}
      tabIndex={tabIndex}
      onFocus={onFocus}
      className={`atlas-cell ${selected ? "is-selected" : ""}`}
      style={{ borderLeftColor: coverageColor(state) }}
      onClick={() => onSelect(node.id)}
      title={`${node.code} ${node.title} — ${COVERAGE_LABEL[state]}${coverage?.inScope ? ` (${coverage.met}/${coverage.inScope} linked requirements at target)` : ""}`}
      aria-pressed={selected}
    >
      <span className="row" style={{ gap: 5 }}>
        <span style={{ color: state === "unmapped" ? "var(--color-on-surface-muted)" : coverageColor(state), display: "inline-flex" }}>
          <CoverageGlyph state={state} size={11} />
        </span>
        <span className="mono atlas-cell__code">{node.label ?? node.code}</span>
        {subs ? <span className="mono muted atlas-cell__subs">+{subs}</span> : null}
      </span>
      <span className="atlas-cell__name">{node.title}</span>
    </button>
  );
}

/**
 * The ATLAS matrix: one group per tactic (its heading, then its techniques), laid out
 * as columns. It takes a single tab stop; arrow keys move within a tactic (up, down)
 * and across tactics (left, right), Home and End jump within a tactic, Enter opens.
 */
function AtlasMatrix({ data, selected, onSelect, show, query }: { data: ThreatCatalogState; selected: string | null; onSelect: (id: string) => void; show: Show; query: string }) {
  const { tactics, byTactic, subs } = useMemo(() => {
    const tactics = data.nodes.filter((n) => n.kind === "tactic").sort((a, b) => a.order - b.order);
    const techniques = data.nodes.filter((n) => n.kind === "technique");
    const subs = new Map<string, number>();
    for (const n of data.nodes) if (n.kind === "sub-technique" && n.parentId) subs.set(n.parentId, (subs.get(n.parentId) ?? 0) + 1);
    const byTactic = new Map(tactics.map((t) => [t.id, techniques.filter((n) => (n.tactics ?? []).includes(t.id)).sort((a, b) => a.title.localeCompare(b.title))]));
    return { tactics, byTactic, subs };
  }, [data.nodes]);
  const q = query.trim().toLowerCase();
  const match = (n: ThreatNode) => !q || n.code.toLowerCase().includes(q) || n.title.toLowerCase().includes(q);
  const columns = tactics.map((t) => ({ tactic: t, cells: (byTactic.get(t.id) ?? []).filter((n) => match(n) && visible(data.coverage[n.id], show)) }));
  // Keys of the focusable items, column by column: the tactic heading, then its techniques.
  const keys = columns.map((c) => [c.tactic.id, ...c.cells.map((n) => n.id)]);
  const root = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState<string | null>(null);
  const has = (key: string | null) => !!key && keys.some((col) => col.includes(key));
  const current = has(active) ? active! : has(selected) ? selected! : (keys[0]?.[0] ?? null);
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!current) return;
    const c = keys.findIndex((col) => col.includes(current));
    const r = keys[c]!.indexOf(current);
    let next: string | undefined;
    if (e.key === "ArrowDown") next = keys[c]![Math.min(r + 1, keys[c]!.length - 1)];
    else if (e.key === "ArrowUp") next = keys[c]![Math.max(r - 1, 0)];
    else if (e.key === "ArrowRight" && c < keys.length - 1) next = keys[c + 1]![Math.min(r, keys[c + 1]!.length - 1)];
    else if (e.key === "ArrowLeft" && c > 0) next = keys[c - 1]![Math.min(r, keys[c - 1]!.length - 1)];
    else if (e.key === "Home") next = keys[c]![0];
    else if (e.key === "End") next = keys[c]![keys[c]!.length - 1];
    else return;
    e.preventDefault();
    if (!next) return;
    setActive(next);
    root.current?.querySelector<HTMLElement>(`[data-key="${CSS.escape(next)}"]`)?.focus();
  };
  return (
    <div ref={root} className="atlas-matrix" role="group" aria-label="MITRE ATLAS matrix: tactics as columns, techniques colored by coverage" aria-describedby="atlas-keys" onKeyDown={onKeyDown}>
      <p id="atlas-keys" className="sr-only">
        Arrow keys move between techniques and tactics; Enter opens one.
      </p>
      {columns.map(({ tactic: t, cells }) => (
        <div key={t.id} className="atlas-col" role="group" aria-labelledby={`tactic-${t.code}`}>
          <button
            type="button"
            id={`tactic-${t.code}`}
            data-key={t.id}
            tabIndex={current === t.id ? 0 : -1}
            onFocus={() => setActive(t.id)}
            className={`atlas-col__head ${selected === t.id ? "is-selected" : ""}`}
            onClick={() => onSelect(t.id)}
            title={t.summary}
          >
            <span className="atlas-col__name">{t.title}</span>
            <span className="mono muted" style={{ fontSize: 10.5 }}>
              {t.code} · {(byTactic.get(t.id) ?? []).length}
            </span>
          </button>
          {cells.length ? (
            <ul className="atlas-col__list">
              {cells.map((n) => (
                <li key={n.id}>
                  <Cell node={n} coverage={data.coverage[n.id]} selected={selected === n.id} onSelect={onSelect} subs={subs.get(n.id)} tabIndex={current === n.id ? 0 : -1} onFocus={() => setActive(n.id)} />
                </li>
              ))}
            </ul>
          ) : (
            <span className="muted" style={{ fontSize: 11, padding: "4px 6px" }}>
              —
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

function AtlasMitigations({ data, selected, onSelect, query }: { data: ThreatCatalogState; selected: string | null; onSelect: (id: string) => void; query: string }) {
  const q = query.trim().toLowerCase();
  const list = data.nodes.filter((n) => n.kind === "mitigation" && (!q || n.code.toLowerCase().includes(q) || n.title.toLowerCase().includes(q)));
  return (
    <details className="panel">
      <summary className="eyebrow" style={{ cursor: "pointer" }}>
        ATLAS mitigations ({list.length}) — linked to CSF 2.0 by NIST's draft Cyber AI Profile
      </summary>
      <div className="threat-grid" style={{ marginTop: 10 }}>
        {list.map((n) => (
          <Cell key={n.id} node={n} coverage={data.coverage[n.id]} selected={selected === n.id} onSelect={onSelect} />
        ))}
      </div>
    </details>
  );
}

function RiskCard({ node, coverage, selected, onSelect, nodes }: { node: ThreatNode; coverage?: ThreatCoverage; selected: boolean; onSelect: (id: string) => void; nodes: Map<string, ThreatNode> }) {
  const lineage = node.previousEdition ?? node.nextEdition;
  return (
    <button type="button" className={`threat-card ${selected ? "is-selected" : ""}`} onClick={() => onSelect(node.id)} aria-pressed={selected}>
      <span className="row row--wrap" style={{ gap: 8 }}>
        <span className="mono" style={{ color: "var(--color-primary)", fontWeight: 600 }}>
          {node.label ?? node.code}
        </span>
        <strong style={{ flex: 1, minWidth: 120 }}>{node.title}</strong>
        {coverage && <CoverageChip coverage={coverage} />}
      </span>
      <span className="muted" style={{ fontSize: 12.5, lineHeight: 1.5, textAlign: "left" }}>
        {node.summary}
      </span>
      <span className="row row--wrap" style={{ gap: 6, fontSize: 11.5 }}>
        {coverage?.frameworks.map((f) => (
          <FrameworkBadge key={f} frameworkId={f} />
        ))}
        {coverage?.best && <LinkStatusBadge status={coverage.best} />}
        <span style={{ flex: 1 }} />
        {lineage && (
          <span className="muted mono" title={node.previousEdition ? "Same entry in the previous edition" : "Same entry in the current edition"}>
            {node.previousEdition ? "was" : "now"} {lineage.key}
            {nodes.get(lineage.nodeId) && nodes.get(lineage.nodeId)!.title !== node.title ? ` (${nodes.get(lineage.nodeId)!.title})` : ""}
          </span>
        )}
      </span>
    </button>
  );
}

function RiskList({ data, selected, onSelect, show, query }: { data: ThreatCatalogState; selected: string | null; onSelect: (id: string) => void; show: Show; query: string }) {
  const [edition, setEdition] = useState<"current" | "superseded">("current");
  const nodes = useMemo(() => new Map(data.nodes.map((n) => [n.id, n])), [data.nodes]);
  const editions = data.nodes.filter((n) => n.kind === "edition");
  const root = editions.find((e) => (e.status ?? "current") === edition) ?? editions[0];
  const q = query.trim().toLowerCase();
  const risks = data.nodes.filter((n) => n.kind === "risk" && n.parentId === root?.id && visible(data.coverage[n.id], show) && (!q || `${n.code} ${n.title} ${n.summary}`.toLowerCase().includes(q)));
  return (
    <div className="stack" style={{ gap: 12 }}>
      {editions.length > 1 && (
        <div className="row row--wrap" style={{ gap: 8 }}>
          <Segmented<"current" | "superseded">
            label="Edition"
            options={editions.map((e) => ({ id: (e.status ?? "current") as "current" | "superseded", label: `${e.label ?? e.code}${e.status === "superseded" ? " (superseded)" : ""}` }))}
            value={edition}
            onChange={setEdition}
          />
          {edition === "superseded" && (
            <span className="muted" style={{ fontSize: 12 }}>
              Kept because the Agentic Top 10 and NIST's Cyber AI Profile cite its identifiers. Coverage uses those links and the same entry in the current edition.
            </span>
          )}
        </div>
      )}
      <div className="threat-grid threat-grid--cards">
        {risks.map((n) => (
          <RiskCard key={n.id} node={n} coverage={data.coverage[n.id]} selected={selected === n.id} onSelect={onSelect} nodes={nodes} />
        ))}
      </div>
    </div>
  );
}

function AttackGroups({ data, selected, onSelect, show, query }: { data: ThreatCatalogState; selected: string | null; onSelect: (id: string) => void; show: Show; query: string }) {
  const objectives = data.nodes.filter((n) => n.kind === "objective").sort((a, b) => a.order - b.order);
  const q = query.trim().toLowerCase();
  return (
    <div className="stack" style={{ gap: 16 }}>
      {objectives.map((o) => {
        const attacks = data.nodes.filter((n) => n.kind === "attack" && (n.objectives ?? []).includes(o.id) && visible(data.coverage[n.id], show) && (!q || `${n.code} ${n.title}`.toLowerCase().includes(q)));
        return (
          <section key={o.id} className="stack" style={{ gap: 8 }}>
            <h3 className="row" style={{ gap: 8, margin: 0, fontSize: 15 }}>
              {o.title}
              <span className="mono muted" style={{ fontSize: 11 }}>
                {o.code} · {(o.taxonomies ?? []).join(" + ")}
              </span>
            </h3>
            <div className="threat-grid">
              {attacks.map((n) => (
                <Cell key={n.id} node={n} coverage={data.coverage[n.id]} selected={selected === n.id} onSelect={onSelect} />
              ))}
              {!attacks.length && <span className="muted" style={{ fontSize: 12 }}>No attack matches.</span>}
            </div>
          </section>
        );
      })}
    </div>
  );
}

const STATUS_ORDER: LinkStatus[] = ["final", "draft", "unreviewed", "superseded"];

function Sources({ overview }: { overview: ThreatsOverview }) {
  return (
    <details className="panel">
      <summary className="eyebrow" style={{ cursor: "pointer" }}>
        Where the links come from ({overview.sources.reduce((n, s) => n + s.links, 0).toLocaleString()} links, {overview.sources.length} sets)
      </summary>
      <div className="stack" style={{ gap: 12, marginTop: 10 }}>
        {STATUS_ORDER.map((status) => {
          const sets = overview.sources.filter((s) => s.status === status);
          if (!sets.length) return null;
          return (
            <div key={status} className="stack" style={{ gap: 4 }}>
              <div className="row" style={{ gap: 8 }}>
                <LinkStatusBadge status={status} />
                <span className="muted" style={{ fontSize: 12 }}>
                  {LINK_STATUS_HELP[status]}
                </span>
              </div>
              {sets.map((s) => (
                <div key={s.id} className="row" style={{ gap: 8, fontSize: 12.5, paddingLeft: 8 }}>
                  <span style={{ flex: 1 }}>{s.authority}</span>
                  <span className="muted">
                    {s.source.shortName} → {s.target.shortName}
                  </span>
                  <span className="mono" style={{ width: 48, textAlign: "right" }}>
                    {s.links}
                  </span>
                </div>
              ))}
            </div>
          );
        })}
        <p className="muted" style={{ fontSize: 12, margin: 0 }}>
          No publisher maps ATLAS directly to CSF 2.0, SP 800-53 or the AI RMF, or the OWASP Top 10s to CSF 2.0 or SP 800-53, in a final document. Visua counts a requirement toward a threat when it is linked to the threat, to an ATLAS mitigation of it, or to the same OWASP entry in the other edition.
        </p>
      </div>
    </details>
  );
}

export function ThreatsPage() {
  const ws = useWorkspaceId();
  const tabsId = useId();
  const { catalog, ws: routeWs = ws } = useParams();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const min = useUi((s) => s.threatMin);
  const catalogs = threatCatalogs().map((c) => c.id);
  const active = catalog && catalogs.includes(catalog) ? catalog : (catalogs[0] ?? "");
  const [show, setShow] = useState<Show>("all");
  const [query, setQuery] = useState("");
  const overview = useQuery({ queryKey: [...keys.workspace(ws), "threats", min], queryFn: () => api.get<ThreatsOverview>(`/workspaces/${enc(ws)}/threats?min=${min}`), enabled: !!ws, placeholderData: keepPreviousData });
  const state = useQuery({
    queryKey: [...keys.workspace(ws), "threats", active, min],
    queryFn: () => api.get<ThreatCatalogState>(`/workspaces/${enc(ws)}/threats/${active}?min=${min}`),
    enabled: !!ws,
    placeholderData: keepPreviousData,
  });
  const selected = params.get("select");
  const select = (id: string | null) => {
    const next = new URLSearchParams(params);
    if (id) next.set("select", id);
    else next.delete("select");
    setParams(next, { replace: true });
  };
  if (overview.isError) return <div className="page muted">{(overview.error as Error).message}</div>;
  const data = overview.data;
  if (!data) return <div className="page muted">Loading threat catalogs…</div>;
  if (!data.catalogs.length) return <div className="page"><Empty title="No threat catalogs ingested">Run `pnpm ingest` with the corpus in corpus/ai-threats.</Empty></div>;
  const current = data.catalogs.find((c) => c.id === active) ?? data.catalogs[0]!;
  const view = state.data?.catalog.id === current.id ? state.data : undefined;
  return (
    <div className={`threats ${selected ? "has-inspector" : ""}`}>
      <div className="threats__main">
        <div className="page">
          <header className="page__header">
            <div>
              <div className="eyebrow">Threat views · AI systems</div>
              <h1>AI threats, seen through your requirements</h1>
              <p>
                MITRE ATLAS, the OWASP Top 10s for LLM and agentic applications, and NIST AI 100-2. Threats are not assessed: each one's coverage comes from the requirements its publishers link to it, in the
                frameworks you follow, and every link shows whether it is final, a draft or unreviewed.
              </p>
            </div>
            <div className="page__actions">
              <Link className="btn btn--primary" to={`/w/${ws}/observatory/${current.id}`}>
                <Telescope size={14} aria-hidden /> {current.shortName} in 3D
              </Link>
              <Link className="btn" to={`/w/${ws}/crosswalk`}>
                Threat ring in the Nexus
              </Link>
            </div>
          </header>
          <div className="stack" style={{ gap: 16 }}>
            <div className="row row--wrap" style={{ gap: 12 }}>
              <span className="eyebrow">Links counted</span>
              <ThreatLinkFilter />
              <span style={{ flex: 1 }} />
              <CoverageLegend />
            </div>
            <Tabs
              id={tabsId}
              label="Threat catalogs"
              className="grid grid--4"
              value={current.id}
              onChange={(id) => navigate(`/w/${routeWs}/threats/${id}`)}
              tabs={data.catalogs.map((c) => ({ id: c.id, label: c.shortName }))}
              tabClassName={(_, selected) => `panel threat-catalog ${selected ? "is-selected" : ""}`}
              renderTab={(_, index) => {
                const c = data.catalogs[index]!;
                return <>
                  <span className="row" style={{ gap: 8 }}>
                    <FrameworkBadge frameworkId={c.id} />
                    <span className="mono muted" style={{ fontSize: 11 }}>
                      {c.version}
                    </span>
                  </span>
                  <strong style={{ fontSize: 15, textAlign: "left" }}>{c.shortName}</strong>
                  <CoverageBar byState={c.byState} />
                  <span className="muted" style={{ fontSize: 12, textAlign: "left" }}>
                    {c.units} {c.unitLabelPlural} · {c.byState.covered} covered · {c.byState.partial + c.byState.open} with gaps · {c.byState.unmapped} without links
                  </span>
                </>;
              }}
            />
            {data.catalogs.map((c) => (
              <TabPanel key={c.id} groupId={tabsId} id={c.id} active={c.id === current.id}>
                <div className="stack" style={{ gap: 16 }}>
                  <section className="stack" style={{ gap: 12 }} aria-labelledby="catalog-title">
                    <div className="row row--wrap" style={{ gap: 10 }}>
                      <h2 id="catalog-title" className="section-title" style={{ margin: 0 }}>
                        {current.name}
                      </h2>
                      <span className="muted" style={{ fontSize: 12 }}>
                        {current.publisher} · {current.published}
                      </span>
                      <span style={{ flex: 1 }} />
                      <div className="row" style={{ gap: 6 }}>
                        <Search size={14} className="muted" aria-hidden />
                        <input className="input" style={{ height: 30, minHeight: 30, width: 220 }} placeholder={`Find a ${current.unitLabel}`} value={query} onChange={(e) => setQuery(e.target.value)} aria-label={`Find a ${current.unitLabel}`} />
                      </div>
                      <Segmented<Show> label="Show" options={SHOW} value={show} onChange={setShow} />
                    </div>
                    <p className="muted" style={{ margin: 0, fontSize: 13 }}>
                      {current.description}
                    </p>
                    {current.linkedFrameworks.length > 0 && (
                      <div className="row row--wrap" style={{ gap: 6, fontSize: 12 }}>
                        <span className="muted">Linked to</span>
                        {current.linkedFrameworks.map((f) => (
                          <span key={f.id} className="row" style={{ gap: 4 }} title={f.enabled ? "Followed in this workspace" : "Not followed in this workspace: its links count as out of scope"}>
                            <FrameworkBadge frameworkId={f.id} />
                            <span className="muted">
                              {f.threats} {current.unitLabelPlural}
                              {f.enabled ? "" : " · not followed"}
                            </span>
                          </span>
                        ))}
                      </div>
                    )}
                    {current.byState.unmapped === current.units && (
                      <div className="callout" role="note">
                        <Info size={14} /> No {current.unitLabel} in this catalog has a link at the chosen status.
                        {min !== "unreviewed" ? " Include unreviewed links to see OWASP's community crosswalk." : ""}
                      </div>
                    )}
                    {!view ? (
                      <div className="muted">Loading {current.shortName}…</div>
                    ) : current.id === "mitre-atlas" ? (
                      <>
                        <AtlasMatrix data={view} selected={selected} onSelect={select} show={show} query={query} />
                        <AtlasMitigations data={view} selected={selected} onSelect={select} query={query} />
                      </>
                    ) : current.id === "nist-ai-100-2" ? (
                      <AttackGroups data={view} selected={selected} onSelect={select} show={show} query={query} />
                    ) : (
                      <RiskList data={view} selected={selected} onSelect={select} show={show} query={query} />
                    )}
                  </section>
                  {current.weakest.length > 0 && (
                    <section className="panel stack" style={{ gap: 8 }} aria-labelledby="weakest">
                      <h2 id="weakest" className="eyebrow" style={{ margin: 0 }}>
                        Least covered {current.unitLabelPlural} with links in your frameworks
                      </h2>
                      {current.weakest.map((w) => (
                        <button key={w.id} type="button" className="xw-group" onClick={() => select(w.id)}>
                          <span className="mono" style={{ width: 110 }}>
                            {w.code}
                          </span>
                          <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", textAlign: "left" }}>{truncate(w.title, 80)}</span>
                          <CoverageChip coverage={w.coverage} />
                        </button>
                      ))}
                    </section>
                  )}
                  <Sources overview={data} />
                  {current.contentNotice && (
                    <p className="muted" style={{ fontSize: 11.5, fontStyle: "italic", margin: 0 }}>
                      {current.contentNotice}
                    </p>
                  )}
                </div>
              </TabPanel>
            ))}
          </div>
        </div>
      </div>
      {selected && <Inspector nodeId={selected} onClose={() => select(null)} />}
    </div>
  );
}
