/**
 * Crosswalk: the 3D Nexus of authoritative mappings between frameworks, with a
 * keyboard-accessible group list and unit-level mapping rows. A mapping means
 * two requirements address related intent — it is never evidence.
 */
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { GitCompareArrows, Info, Sparkles, X } from "lucide-react";
import { Suspense, useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import type { Status } from "@visua/core";
import { useRunAgent } from "../components/inspector/Inspector.tsx";
import { CoverageBar, CoverageLegend, LinkStatusBadge, ThreatLinkFilter } from "../components/threats/Coverage.tsx";
import { Empty, FrameworkBadge, StatusChip } from "../components/ui/index.tsx";
import { api } from "../lib/api.ts";
import { FRAMEWORK_SHORT, truncate } from "../lib/format.ts";
import { useWorkspace } from "../lib/queries.ts";
import type { ThreatRing } from "../lib/types.ts";
import { FRAMEWORK_COLORS, NexusCanvas, type NexusData } from "../scene/Nexus.tsx";
import { useUi } from "../state/ui.ts";

interface Side {
  id: string;
  code: string;
  title: string;
  framework: string;
  group: string | null;
  current: number | null;
  target: number | null;
  applicable: boolean | null;
  status: Status | null;
}
interface Row {
  setId: string;
  authority: string;
  documentId: string;
  relationship: string;
  source: Side;
  target: Side;
}

const AUTHORITY_NOTES: Record<string, string> = {
  "NIST OLIR": "NIST's Online Informative References program — official, NIST-reviewed crosswalks.",
  AICPA: "AICPA's published mapping workbook (local licensed copy).",
  "AICPA + NIST OLIR (composed)": "AICPA's TSC → CSF v1.1 mapping carried to CSF 2.0 through NIST's official v1.1 → v2.0 crosswalk. Indirect: treat as a lead, not a match.",
};

function authorityNote(a: string): string {
  return AUTHORITY_NOTES[a] ?? (a.startsWith("Visua editorial") ? "Visua's editorial reading of the RMF task descriptions — flagged as editorial, not an official crosswalk." : a);
}

function Dot({ fw }: { fw: string }) {
  return <span aria-hidden style={{ display: "inline-block", width: 9, height: 9, borderRadius: 99, background: FRAMEWORK_COLORS[fw] ?? "var(--color-outline)", flexShrink: 0 }} />;
}

function GroupDetail({ ws, data, groupId, onClose }: { ws: string; data: NexusData; groupId: string; onClose: () => void }) {
  const run = useRunAgent();
  const fw = data.frameworks.find((f) => f.groups.some((g) => g.id === groupId))!;
  const group = fw.groups.find((g) => g.id === groupId)!;
  const [limit, setLimit] = useState(80);
  const rows = useQuery({ queryKey: ["ws", ws, "crosswalk-rows", groupId], queryFn: () => api.get<Row[]>(`/workspaces/${encodeURIComponent(ws)}/crosswalk/rows?group=${encodeURIComponent(groupId)}&limit=3000`) });
  const byFramework = useMemo(() => {
    const m = new Map<string, Row[]>();
    for (const r of rows.data ?? []) {
      const other = r.source.group === groupId ? r.target : r.source;
      m.set(other.framework, [...(m.get(other.framework) ?? []), r]);
    }
    return m;
  }, [rows.data, groupId]);
  const name = (id: string) => data.frameworks.find((f) => f.id === id)?.shortName ?? id;
  let shown = 0;
  return (
    <div className="stack" style={{ gap: 12 }}>
      <div className="row" style={{ gap: 8, alignItems: "flex-start" }}>
        <Dot fw={fw.id} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="eyebrow">{fw.shortName}</div>
          <h2 style={{ fontSize: 17, margin: "2px 0" }}>
            <span className="mono">{group.code}</span> {group.title}
          </h2>
          <div className="muted" style={{ fontSize: 12.5 }}>
            {group.units} units{group.readiness !== null ? ` · ${Math.round(group.readiness * 100)}% ready` : fw.enabled ? "" : " · framework not enabled"} · {rows.data?.length ?? "…"} mappings
          </div>
        </div>
        <button className="btn btn--quiet btn--icon btn--sm" aria-label="Close" onClick={onClose}>
          <X size={14} />
        </button>
      </div>
      <div className="row row--wrap" style={{ gap: 6 }}>
        {[...byFramework.entries()].map(([other, list]) => (
          <span key={other} className="chip" style={{ cursor: "default" }}>
            <Dot fw={other} /> {name(other)} · {list.length}
          </span>
        ))}
      </div>
      <div className="callout" role="note">
        <Info size={14} /> A mapping says two requirements address related intent. It is not evidence: each requirement still needs its own implementation and proof.
      </div>
      {fw.enabled && (
        <button className="btn btn--agent btn--sm" style={{ alignSelf: "flex-start" }} onClick={() => run("crosswalk-analyst", `Project mapped progress onto ${fw.shortName}`, { framework: fw.id }, { stay: true })}>
          <Sparkles size={13} /> Project mapped progress onto {fw.shortName}
        </button>
      )}
      {rows.isLoading && <div className="muted">Loading mappings…</div>}
      {[...byFramework.entries()].map(([other, list]) => (
        <div key={other}>
          <div className="row" style={{ gap: 6, margin: "6px 0" }}>
            <Dot fw={other} />
            <strong style={{ fontSize: 13 }}>{name(other)}</strong>
            <span className="muted" style={{ fontSize: 12 }}>
              {list[0] ? truncate(list[0].authority, 60) : ""}
            </span>
          </div>
          <div className="stack" style={{ gap: 4 }}>
            {list.map((r, i) => {
              if (shown >= limit) return null;
              shown++;
              const mine = r.source.group === groupId ? r.source : r.target;
              const theirs = r.source.group === groupId ? r.target : r.source;
              return (
                <div key={`${r.setId}-${i}`} className="xw-row" title={`${r.relationship} · ${r.authority} (${r.documentId})`}>
                  <Link to={`/w/${ws}/observatory/${mine.framework}?select=${encodeURIComponent(mine.id)}`} className="mono xw-code">
                    {mine.code}
                  </Link>
                  <span className="muted" aria-hidden>
                    ↔
                  </span>
                  <Link to={`/w/${ws}/observatory/${theirs.framework}?select=${encodeURIComponent(theirs.id)}`} className="mono xw-code">
                    {theirs.code}
                  </Link>
                  <span className="xw-title">{truncate(theirs.title, 70)}</span>
                  <span className="mono muted" style={{ fontSize: 10.5 }}>
                    {r.relationship}
                  </span>
                  {theirs.status ? <StatusChip status={theirs.status} /> : <span className="muted" style={{ fontSize: 11 }}>not tracked</span>}
                </div>
              );
            })}
          </div>
        </div>
      ))}
      {(rows.data?.length ?? 0) > limit && (
        <button className="btn btn--sm" onClick={() => setLimit(limit + 200)}>
          Show more ({(rows.data?.length ?? 0) - limit} remaining)
        </button>
      )}
    </div>
  );
}

function ThreatGroupDetail({ ws, data, groupId, onClose }: { ws: string; data: NexusData; groupId: string; onClose: () => void }) {
  const catalog = data.threats!.catalogs.find((c) => c.groups.some((g) => g.id === groupId))!;
  const group = catalog.groups.find((g) => g.id === groupId)!;
  const groups = new Map(data.frameworks.flatMap((f) => f.groups.map((g) => [g.id, { f, g }] as const)));
  const links = data.threats!.bundles.filter((b) => b.a === groupId).sort((a, b) => b.count - a.count);
  const byFramework = new Map<string, typeof links>();
  for (const l of links) {
    const fw = groups.get(l.b)?.f.id ?? l.b.slice(0, l.b.indexOf(":"));
    byFramework.set(fw, [...(byFramework.get(fw) ?? []), l]);
  }
  return (
    <div className="stack" style={{ gap: 12 }}>
      <div className="row" style={{ gap: 8, alignItems: "flex-start" }}>
        <FrameworkBadge frameworkId={catalog.id} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="eyebrow">{catalog.shortName} · threat ring</div>
          <h2 style={{ fontSize: 17, margin: "2px 0" }}>
            <span className="mono">{group.code}</span> {group.title}
          </h2>
          <div className="muted" style={{ fontSize: 12.5 }}>
            {group.units} {group.units === 1 ? "threat" : "threats"}
            {group.readiness !== null ? ` · ${Math.round(group.readiness * 100)}% covered` : ""} · linked to {links.length} requirement groups
          </div>
        </div>
        <button className="btn btn--quiet btn--icon btn--sm" aria-label="Close" onClick={onClose}>
          <X size={14} />
        </button>
      </div>
      <CoverageBar byState={group.byState} />
      <CoverageLegend byState={group.byState} />
      <ThreatLinkFilter />
      <div className="callout" role="note">
        <Info size={14} /> Arcs bundle the published links from these threats to requirement groups. Coverage is derived from those requirements: it is never an assessment of the threat.
      </div>
      <Link className="btn btn--sm" style={{ alignSelf: "flex-start" }} to={`/w/${ws}/threats/${catalog.id}?select=${encodeURIComponent(groupId)}`}>
        Open in threat view
      </Link>
      {[...byFramework.entries()].map(([fw, list]) => (
        <div key={fw} className="stack" style={{ gap: 4 }}>
          <div className="row" style={{ gap: 6 }}>
            <Dot fw={fw} />
            <strong style={{ fontSize: 13 }}>{FRAMEWORK_SHORT[fw] ?? fw}</strong>
          </div>
          {list.map((l) => {
            const target = groups.get(l.b);
            return (
              <div key={l.b} className="xw-row" style={{ gridTemplateColumns: "auto minmax(0, 1fr) auto auto auto" }}>
                <Link to={`/w/${ws}/observatory/${fw}?select=${encodeURIComponent(l.b)}`} className="mono xw-code">
                  {target?.g.code ?? l.b}
                </Link>
                <span className="xw-title">{truncate(target?.g.title ?? "", 60)}</span>
                <span className="mono muted" style={{ fontSize: 11 }}>
                  {l.count}
                </span>
                <LinkStatusBadge status={l.best} />
                {target?.g.status ? <StatusChip status={target.g.status} /> : <span className="muted" style={{ fontSize: 11 }}>not tracked</span>}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

function Overview({ data, onSelect }: { data: NexusData; onSelect: (id: string) => void }) {
  const [q, setQ] = useState("");
  const total = data.sets.reduce((s, x) => s + x.count, 0);
  const needle = q.trim().toLowerCase();
  return (
    <div className="stack" style={{ gap: 14 }}>
      <div>
        <div className="eyebrow">Crosswalk Nexus</div>
        <h2 style={{ fontSize: 17, margin: "2px 0 6px" }}>Do the work once, see where it counts</h2>
        <p className="muted" style={{ fontSize: 13 }}>
          {total.toLocaleString()} unit-level mappings from {data.sets.length} sets connect {data.frameworks.length} frameworks. Pillars are requirement groups (height = number of units, color = status); arcs bundle the mappings between two groups (width = count).
        </p>
      </div>
      <div className="stack" style={{ gap: 8 }}>
        {data.sets.map((s) => (
          <div key={s.id} className="row" style={{ gap: 8, alignItems: "flex-start", fontSize: 12.5 }}>
            <span style={{ display: "flex", gap: 3, paddingTop: 4 }}>
              <Dot fw={s.source} />
              <Dot fw={s.target} />
            </span>
            <div style={{ flex: 1 }}>
              <div>{s.title}</div>
              <div className="muted" style={{ fontSize: 11.5 }}>
                {authorityNote(s.authority)}
              </div>
            </div>
            <span className="mono" style={{ fontSize: 12 }}>
              {s.count.toLocaleString()}
            </span>
          </div>
        ))}
      </div>
      <div className="callout" role="note">
        <Info size={14} /> Mapping ≠ evidence. Visua uses mappings to suggest where existing work may help — as proposals you approve — never to mark a requirement met.
      </div>
      <div>
        <input className="input" placeholder="Find a group (e.g. PR.AA, CC6, AC)…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Find a requirement group" />
        <div className="stack" style={{ gap: 2, marginTop: 8, maxHeight: 360, overflow: "auto" }} role="list" aria-label="Requirement groups">
          {data.frameworks.flatMap((f) =>
            f.groups
              .filter((g) => !needle || g.code.toLowerCase().includes(needle) || g.title.toLowerCase().includes(needle))
              .map((g) => (
                <button key={g.id} role="listitem" className="xw-group" onClick={() => onSelect(g.id)}>
                  <Dot fw={f.id} />
                  <span className="mono" style={{ width: 64 }}>
                    {g.code}
                  </span>
                  <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{g.title}</span>
                  {g.status && <StatusChip status={g.status} />}
                </button>
              )),
          )}
          {(data.threats?.catalogs ?? []).flatMap((c) =>
            c.groups
              .filter((g) => !needle || g.code.toLowerCase().includes(needle) || g.title.toLowerCase().includes(needle))
              .map((g) => (
                <button key={g.id} role="listitem" className="xw-group" onClick={() => onSelect(g.id)}>
                  <FrameworkBadge frameworkId={c.id} />
                  <span className="mono" style={{ width: 64, overflow: "hidden", textOverflow: "ellipsis" }}>
                    {g.code}
                  </span>
                  <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{g.title}</span>
                  <span style={{ width: 90 }}>
                    <CoverageBar byState={g.byState} height={6} />
                  </span>
                </button>
              )),
          )}
        </div>
      </div>
      {data.threats && (
        <div className="stack" style={{ gap: 8 }}>
          <div className="eyebrow">Threat ring</div>
          <p className="muted" style={{ fontSize: 12.5, margin: 0 }}>
            The inner ring holds MITRE ATLAS tactics, the OWASP LLM and Agentic Top 10 entries and NIST AI 100-2 objectives. Their arcs bundle published links to requirement groups; pillar
            color is coverage derived from those requirements.
          </p>
          <ThreatLinkFilter />
        </div>
      )}
    </div>
  );
}

export function CrosswalkPage() {
  const { ws = "" } = useParams();
  const workspace = useWorkspace(ws);
  const [params, setParams] = useSearchParams();
  const selected = params.get("group");
  const [hovered, setHovered] = useState<string | null>(null);
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [showThreats, setShowThreats] = useState(true);
  const min = useUi((s) => s.threatMin);
  const { data, error } = useQuery({ queryKey: ["ws", ws, "crosswalk"], queryFn: () => api.get<NexusData>(`/workspaces/${encodeURIComponent(ws)}/crosswalk`) });
  const ring = useQuery({ queryKey: ["ws", ws, "crosswalk-threats", min], queryFn: () => api.get<ThreatRing>(`/workspaces/${encodeURIComponent(ws)}/crosswalk/threats?min=${min}`), placeholderData: keepPreviousData });
  const view = useMemo<NexusData | null>(() => {
    if (!data) return null;
    const frameworks = data.frameworks.filter((f) => !hidden.has(f.id));
    const visible = new Set(frameworks.flatMap((f) => f.groups.map((g) => g.id)));
    const threats = showThreats && ring.data ? { ...ring.data, bundles: ring.data.bundles.filter((b) => visible.has(b.b)) } : undefined;
    return { ...data, frameworks, bundles: data.bundles.filter((b) => visible.has(b.a) && visible.has(b.b)), threats };
  }, [data, hidden, ring.data, showThreats]);
  const isThreatGroup = (id: string | null) => !!id && !!view?.threats?.catalogs.some((c) => c.groups.some((g) => g.id === id));
  const select = (id: string | null) => {
    const next = new URLSearchParams(params);
    if (id) next.set("group", id);
    else next.delete("group");
    setParams(next, { replace: true });
  };
  const hoveredInfo = hovered && view ? [...view.frameworks, ...(view.threats?.catalogs ?? []).map((c) => ({ id: c.id, shortName: c.shortName, groups: c.groups }))].flatMap((f) => f.groups.map((g) => ({ f, g }))).find((x) => x.g.id === hovered) : null;
  const known = (id: string | null) => !!id && (view?.frameworks.some((f) => f.groups.some((g) => g.id === id)) || isThreatGroup(id));

  if (error) return <div className="page muted">Could not load the crosswalk: {(error as Error).message}</div>;
  if (!view || !workspace.data) return <div className="page muted">Loading the Nexus…</div>;
  if (!view.frameworks.length) return <div className="page"><Empty title="No frameworks to show" /></div>;
  return (
    <div className="observatory has-inspector">
      <div className="observatory__canvas">
        <Suspense fallback={null}>
          <NexusCanvas data={view} selected={known(selected) ? selected : null} onSelect={select} hovered={hovered} onHover={setHovered} />
        </Suspense>
        <div className="hud hud--tl">
          <div className="row" style={{ gap: 8, fontWeight: 600 }}>
            <GitCompareArrows size={15} /> Crosswalk Nexus
          </div>
          <div className="row row--wrap" style={{ gap: 6, marginTop: 8 }}>
            {data!.frameworks.map((f) => (
              <button
                key={f.id}
                className="chip"
                aria-pressed={!hidden.has(f.id)}
                onClick={() => {
                  const next = new Set(hidden);
                  if (next.has(f.id)) next.delete(f.id);
                  else if (data!.frameworks.length - next.size > 2) next.add(f.id);
                  setHidden(next);
                }}
              >
                <Dot fw={f.id} /> {f.shortName}
              </button>
            ))}
            {ring.data && ring.data.catalogs.length > 0 && (
              <button className="chip" aria-pressed={showThreats} onClick={() => setShowThreats(!showThreats)} title="Inner ring: AI threat catalogs linked to requirement groups">
                <span aria-hidden style={{ display: "inline-block", width: 9, height: 9, borderRadius: 99, boxShadow: "inset 0 0 0 1.5px var(--color-on-surface-muted)" }} /> Threat ring
              </button>
            )}
          </div>
        </div>
        {hoveredInfo && (
          <div className="hud hud--bl" role="status">
            <div className="row" style={{ gap: 8 }}>
              <Dot fw={hoveredInfo.f.id} />
              <strong className="mono">{hoveredInfo.g.code}</strong>
              <span>{hoveredInfo.g.title}</span>
            </div>
            <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
              {hoveredInfo.f.shortName} · {hoveredInfo.g.units} {isThreatGroup(hovered) ? "threats" : "units"}
              {hoveredInfo.g.readiness !== null ? ` · ${Math.round(hoveredInfo.g.readiness * 100)}% ${isThreatGroup(hovered) ? "covered" : "ready"}` : ""} ·{" "}
              {[...view.bundles, ...(view.threats?.bundles ?? [])].filter((b) => b.a === hovered || b.b === hovered).reduce((s, b) => s + b.count, 0)} {isThreatGroup(hovered) ? "links" : "mappings"}
            </div>
          </div>
        )}
      </div>
      <aside className="inspector" aria-label="Crosswalk details">
        <div className="inspector__body">
          {selected && isThreatGroup(selected) ? (
            <ThreatGroupDetail ws={ws} data={view} groupId={selected} onClose={() => select(null)} />
          ) : selected && view.frameworks.some((f) => f.groups.some((g) => g.id === selected)) ? (
            <GroupDetail ws={ws} data={view} groupId={selected} onClose={() => select(null)} />
          ) : (
            <Overview data={view} onSelect={select} />
          )}
        </div>
      </aside>
    </div>
  );
}
