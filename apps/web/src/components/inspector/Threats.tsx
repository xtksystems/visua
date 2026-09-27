/**
 * Threat inspector sections. A threat (ATLAS technique, OWASP entry, NIST AI 100-2
 * attack) is never assessed: the inspector shows what its publishers link it to,
 * with each link's status, and how far the workspace has implemented those
 * requirements. A requirement's inspector lists the threats it helps address.
 */
import { ExternalLink, Info, X } from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { corpusFileUrl } from "../../lib/api.ts";
import { truncate } from "../../lib/format.ts";
import { badgeOf, isThreatCatalog } from "../../lib/frameworks.ts";
import type { BriefNode, CoverageView, ExternalReference, LinkStatus, LinkView, NodeDetail, ThreatAddressed, ThreatPathView, ThreatRequirement } from "../../lib/types.ts";
import { CoverageBar, CoverageChip, CoverageLegend, LinkStatusBadge, ThreatLinkFilter } from "../threats/Coverage.tsx";
import { FrameworkBadge, LevelPips, Progress, SheetGrabber, StatusChip, Tabs } from "../ui/index.tsx";

const enc = encodeURIComponent;

/** Where a node lives in the app: requirements in the Observatory, threats on the Threats page. */
export function nodeHref(ws: string, framework: string, id: string, threat: boolean) {
  return threat ? `/w/${ws}/threats/${framework}?select=${enc(id)}` : `/w/${ws}/observatory/${framework}?select=${enc(id)}`;
}

/**
 * ATLAS descriptions are Markdown with links to other ATLAS objects ("/techniques/AML.T0051.000")
 * and to outside pages. Render those links (in-app for ATLAS objects), everything else as text.
 */
function ThreatText({ ws, text }: { ws: string; text: string }) {
  const parts: React.ReactNode[] = [];
  const re = /\[([^\]]+)\]\(\s*([^)\s]+)\s*\)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    const [, label, href] = m;
    const atlas = /^\/?(?:techniques|mitigations|tactics)\/(AML\.[A-Z]+\d+(?:\.\d+)?)\/?$/.exec(href!);
    if (atlas) {
      parts.push(
        <Link key={m.index} to={nodeHref(ws, "mitre-atlas", `mitre-atlas:${atlas[1]}`, true)}>
          {label}
        </Link>,
      );
    } else if (/^https?:\/\//.test(href!)) {
      parts.push(
        <a key={m.index} href={href} target="_blank" rel="noreferrer noopener">
          {label}
        </a>,
      );
    } else parts.push(label);
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return <p style={{ whiteSpace: "pre-line", lineHeight: 1.6 }}>{parts}</p>;
}
const isThreat = isThreatCatalog;

function LinkLine({ link }: { link: LinkView }) {
  return (
    <span className="row row--wrap" style={{ gap: 6, fontSize: 12 }}>
      <span className="muted">{link.label}</span>
      <LinkStatusBadge status={link.status} />
      <span className="muted" title={`${link.citation.documentId}${link.citation.locator ? ` · ${link.citation.locator}` : ""}${link.citation.page ? `, p. ${link.citation.page}` : ""}`}>
        {truncate(link.authority, 56)}
      </span>
    </span>
  );
}

function PathLine({ ws, path }: { ws: string; path: ThreatPathView }) {
  const how = path.kind === "mitigation" ? "through mitigation" : path.kind === "edition" ? "through the same entry in the other edition" : "linked directly";
  return (
    <div className="stack" style={{ gap: 3, paddingLeft: 10, borderLeft: "2px solid var(--color-outline)" }}>
      <div className="row row--wrap" style={{ gap: 6, fontSize: 12 }}>
        <span className="muted">{how}</span>
        {path.via && (
          <Link to={nodeHref(ws, path.via.framework, path.via.id, true)} className="mono" style={{ color: "var(--color-primary)" }} title={path.via.title}>
            {path.via.code}
          </Link>
        )}
        {path.via && <span className="muted">{truncate(path.via.title, 40)}</span>}
        {path.group && <span className="muted">· via group {path.group}</span>}
      </div>
      {path.links.map((l, i) => (
        <div key={i} className="stack" style={{ gap: 2 }}>
          <LinkLine link={l} />
          {l.note && (
            <div className="muted" style={{ fontSize: 12, lineHeight: 1.45 }}>
              “{truncate(l.note, 260)}”
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function RequirementRow({ ws, r }: { ws: string; r: ThreatRequirement }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="stack" style={{ gap: 6, padding: "6px 0", borderBottom: "1px solid var(--color-outline)" }}>
      <div className="row" style={{ gap: 8, alignItems: "center" }}>
        <FrameworkBadge frameworkId={r.framework} />
        <Link to={nodeHref(ws, r.framework, r.id, false)} className="mono xw-code" title={`Open ${r.code} in the Observatory`}>
          {r.code}
        </Link>
        <span className="xw-title" style={{ flex: 1, minWidth: 0 }} title={r.title}>
          {r.title}
        </span>
        {!r.enabled ? (
          <span className="muted" style={{ fontSize: 11 }}>
            not followed
          </span>
        ) : r.applicable === false ? (
          <StatusChip status="not-applicable" />
        ) : r.status ? (
          <StatusChip status={r.status} />
        ) : null}
      </div>
      <div className="row" style={{ gap: 8 }}>
        {r.enabled && r.applicable !== false && r.current !== undefined && r.target !== undefined ? <LevelPips current={r.current} target={r.target} /> : null}
        {r.best && <LinkStatusBadge status={r.best} />}
        <span style={{ flex: 1 }} />
        <button className="btn btn--quiet btn--sm" onClick={() => setOpen(!open)} aria-expanded={open}>
          {open ? "Hide" : "Why linked"} ({r.paths.length})
        </button>
      </div>
      {open && (
        <div className="stack" style={{ gap: 8 }}>
          {r.paths.map((p, i) => (
            <PathLine key={i} ws={ws} path={p} />
          ))}
        </div>
      )}
    </div>
  );
}

const STATUS_ORDER: Record<LinkStatus, number> = { final: 3, draft: 2, unreviewed: 1, superseded: 0 };

interface Route {
  key: string;
  kind: ThreatPathView["kind"];
  via?: BriefNode;
  group?: string;
  requirements: ThreatRequirement[];
}
interface Publication {
  publication: string;
  status: LinkStatus;
  view?: CoverageView;
  routes: Route[];
  requirements: number;
}

/**
 * Linked requirements as coverage counts them: by the publication that links them
 * (the last link of each path), then by route — directly, through an ATLAS mitigation,
 * through the other edition's entry, or through a group such as an AI RMF category.
 */
function byPublication(requirements: ThreatRequirement[], views: CoverageView[]): Publication[] {
  const pubs = new Map<string, { status: LinkStatus; routes: Map<string, Route>; ids: Set<string> }>();
  for (const r of requirements) {
    for (const p of r.paths) {
      const publication = p.links[p.links.length - 1]!.authority;
      const pub = pubs.get(publication) ?? { status: p.status, routes: new Map(), ids: new Set() };
      if (STATUS_ORDER[p.status] < STATUS_ORDER[pub.status]) pub.status = p.status;
      const key = p.via ? `via:${p.via.id}` : p.group ? `group:${p.group}` : "direct";
      const route = pub.routes.get(key) ?? { key, kind: p.kind, ...(p.via ? { via: p.via } : {}), ...(p.group ? { group: p.group } : {}), requirements: [] };
      if (!route.requirements.includes(r)) route.requirements.push(r);
      pub.routes.set(key, route);
      pub.ids.add(r.id);
      pubs.set(publication, pub);
    }
  }
  return [...pubs.entries()]
    .map(([publication, p]) => ({
      publication,
      status: p.status,
      view: views.find((v) => v.publication === publication),
      routes: [...p.routes.values()].sort((a, b) => (a.key === "direct" ? -1 : b.key === "direct" ? 1 : b.requirements.length - a.requirements.length)),
      requirements: p.ids.size,
    }))
    .sort((a, b) => STATUS_ORDER[b.status] - STATUS_ORDER[a.status] || b.requirements - a.requirements);
}

function RouteGroup({ ws, route }: { ws: string; route: Route }) {
  const [limit, setLimit] = useState(8);
  const rows = [...route.requirements].sort((a, b) => a.framework.localeCompare(b.framework) || a.code.localeCompare(b.code, undefined, { numeric: true }));
  return (
    <div className="stack" style={{ gap: 2 }}>
      <div className="row row--wrap" style={{ gap: 6, fontSize: 12, marginTop: 6 }}>
        <span className="muted">
          {route.kind === "mitigation" ? "Through mitigation" : route.kind === "edition" ? "Through the same entry in the other edition" : route.group ? "Through the group" : "Linked directly"}
        </span>
        {route.via && (
          <Link to={nodeHref(ws, route.via.framework, route.via.id, true)} className="mono" style={{ color: "var(--color-primary)" }} title={route.via.title}>
            {route.via.code}
          </Link>
        )}
        {route.via && <span className="muted">{truncate(route.via.title, 44)}</span>}
        {route.group && <span className="mono">{route.group}</span>}
        <span className="muted">· {rows.length}</span>
      </div>
      {rows.slice(0, limit).map((r) => (
        <RequirementRow key={r.id} ws={ws} r={r} />
      ))}
      {rows.length > limit && (
        <button className="btn btn--quiet btn--sm" style={{ alignSelf: "flex-start" }} onClick={() => setLimit(rows.length)}>
          Show {rows.length - limit} more
        </button>
      )}
    </div>
  );
}

function LinkedRequirements({ ws, requirements, views }: { ws: string; requirements: ThreatRequirement[]; views: CoverageView[] }) {
  const publications = useMemo(() => byPublication(requirements, views), [requirements, views]);
  return (
    <>
      <section className="stack" style={{ gap: 8 }} aria-label="Coverage by publication">
        <div className="eyebrow">By publication · each counted once</div>
        {publications.map((p) => (
          <div key={p.publication} className="stack" style={{ gap: 4 }}>
            <div className="row row--wrap" style={{ gap: 6, fontSize: 12.5 }}>
              <strong style={{ fontWeight: 500 }}>{p.publication}</strong>
              <LinkStatusBadge status={p.status} />
              <span style={{ flex: 1 }} />
              <span className="mono muted" style={{ fontSize: 11.5 }}>
                {p.view ? `${p.view.met}/${p.view.inScope} at target` : `${p.requirements} linked`}
              </span>
            </div>
            {p.view && p.view.progress !== null ? <Progress value={p.view.progress} /> : <span className="muted" style={{ fontSize: 11.5 }}>No linked requirement in your frameworks</span>}
          </div>
        ))}
      </section>
      {publications.map((p) => (
        <details key={p.publication} className="threat-pub" open={publications.length === 1 || p.requirements <= 15}>
          <summary>
            <span className="row row--wrap" style={{ gap: 6 }}>
              <strong style={{ fontWeight: 600, fontSize: 13 }}>{p.publication}</strong>
              <LinkStatusBadge status={p.status} />
              <span className="muted" style={{ fontSize: 12 }}>
                {p.requirements} requirement{p.requirements === 1 ? "" : "s"}
                {p.routes.length > 1 ? ` · ${p.routes.length} routes` : ""}
              </span>
            </span>
          </summary>
          <div className="stack" style={{ gap: 8, marginTop: 4 }}>
            {p.routes.map((route) => (
              <RouteGroup key={route.key} ws={ws} route={route} />
            ))}
          </div>
        </details>
      ))}
    </>
  );
}

function ExternalRefs({ refs }: { refs: ExternalReference[] }) {
  const byScheme = useMemo(() => {
    const m = new Map<string, ExternalReference[]>();
    for (const r of refs) m.set(r.schemeName, [...(m.get(r.schemeName) ?? []), r]);
    return [...m.entries()];
  }, [refs]);
  if (!refs.length) return null;
  return (
    <details>
      <summary className="eyebrow" style={{ cursor: "pointer" }}>
        Other catalogs ({refs.length})
      </summary>
      <div className="stack" style={{ gap: 10, marginTop: 8 }}>
        {byScheme.map(([scheme, list]) => (
          <div key={scheme} className="stack" style={{ gap: 4 }}>
            <strong style={{ fontSize: 12.5 }}>{scheme}</strong>
            {list.map((r, i) => (
              <div key={i} className="row row--wrap" style={{ gap: 6, fontSize: 12 }}>
                {r.url ? (
                  <a href={r.url} target="_blank" rel="noreferrer" className="mono">
                    {r.id ?? r.label} <ExternalLink size={10} style={{ verticalAlign: -1 }} />
                  </a>
                ) : (
                  <span className="mono">{r.id ?? ""}</span>
                )}
                {r.label && r.label !== r.id ? <span className="muted">{truncate(r.label.replace(r.id ?? "", "").replace(/^\s*[—–-]\s*/, ""), 60)}</span> : null}
                {r.strength ? <span className="muted">· {r.strength}</span> : null}
                <LinkStatusBadge status={r.status} />
              </div>
            ))}
            <span className="muted" style={{ fontSize: 11 }}>
              {list[0]!.authority}
            </span>
          </div>
        ))}
      </div>
    </details>
  );
}

type ThreatTab = "overview" | "requirements" | "related";

export function ThreatInspector({ data, onClose }: { data: NodeDetail; onClose: () => void }) {
  const { ws = "" } = useParams();
  const [tab, setTab] = useState<ThreatTab>("overview");
  const { node } = data;
  const threat = data.threat!;
  const a = (node.attributes ?? {}) as Record<string, unknown>;
  const prevention = (a["preventionStrategies"] as { label: string; title?: string; text: string; page?: number }[] | undefined) ?? [];
  const intro = (a["preventionIntro"] as string[] | undefined) ?? [];
  const lineage = [a["previousEdition"], a["nextEdition"]].filter(Boolean) as { key: string; nodeId: string; basis?: string }[];
  const tactics = (a["tactics"] as string[] | undefined) ?? [];
  const c = threat.coverage;
  return (
    <aside className="inspector" aria-label={`${node.code} details`} data-hud>
      <SheetGrabber />
      <header className="inspector__head">
        <div className="row" style={{ gap: 6, flexWrap: "wrap" }}>
          <FrameworkBadge frameworkId={node.frameworkId} />
          {data.ancestors.map((x) => (
            <span key={x.id} className="code" title={x.title}>
              {x.code}
            </span>
          ))}
          <span style={{ flex: 1 }} />
          <button className="btn btn--quiet btn--sm btn--icon" onClick={onClose} aria-label="Close inspector">
            <X size={14} />
          </button>
        </div>
        <div className="row" style={{ marginTop: 10, gap: 10, alignItems: "flex-start", flexWrap: "wrap" }}>
          <span className="mono" style={{ fontSize: 20, fontWeight: 600, color: "var(--color-primary)", lineHeight: 1.2 }}>
            {String(a["key"] ?? node.code)}
          </span>
          <CoverageChip coverage={c} />
        </div>
        <h2 className="inspector__title">{node.title}</h2>
      </header>
      <Tabs<ThreatTab>
        value={tab}
        onChange={setTab}
        tabs={[
          { id: "overview" as ThreatTab, label: "Overview" },
          ...(threat.group ? [] : [{ id: "requirements" as ThreatTab, label: "Linked requirements", count: threat.requirements.length }]),
          { id: "related" as ThreatTab, label: "Related threats", count: threat.related.length },
        ]}
      />
      <div className="inspector__body">
        {tab === "overview" && (
          <div className="stack" style={{ gap: 16 }}>
            <ThreatText ws={ws} text={node.text} />
            {data.source && (
              <div className="muted" style={{ fontSize: 12 }}>
                Source:{" "}
                {data.source.present ? (
                  <a href={corpusFileUrl(data.source.path, data.source.page)} target="_blank" rel="noreferrer">
                    {data.source.identifier ?? data.source.title}
                    {data.source.page ? `, p. ${data.source.page}` : ""} <ExternalLink size={11} style={{ verticalAlign: -1 }} />
                  </a>
                ) : (
                  <span>{data.source.identifier ?? data.source.title}</span>
                )}
                {data.source.locator ? ` · ${data.source.locator}` : ""}
              </div>
            )}
            <div className="panel panel--raised stack" style={{ gap: 10 }}>
              <div className="row">
                <span className="eyebrow">Coverage</span>
                <span style={{ flex: 1 }} />
                {c.level !== null ? <LevelPips current={c.level} target={4} /> : null}
              </div>
              {threat.group && (
                <div className="stack" style={{ gap: 6 }}>
                  <CoverageBar byState={threat.group.byState} />
                  <CoverageLegend byState={threat.group.byState} />
                </div>
              )}
              <div style={{ fontSize: 13 }}>
                {threat.group
                  ? `${threat.group.units} ${threat.group.units === 1 ? "threat" : "threats"} in this group; coverage pooled from each one's linked requirements.`
                  : c.state === "unmapped"
                  ? "No publisher links this threat to a requirement at the chosen link status."
                  : c.state === "out-of-scope"
                    ? `${c.linked} linked requirement${c.linked === 1 ? "" : "s"}, all in frameworks this workspace does not follow (${c.frameworks.map(badgeOf).join(", ")}).`
                    : `${c.met} of ${c.inScope} linked requirement${c.inScope === 1 ? "" : "s"} in scope ${c.met === 1 ? "is" : "are"} at target · ${Math.round(c.progress * 100)}% of the way, each publication counted once${c.atRisk ? ` · ${c.atRisk} at risk` : ""}.`}
              </div>
              {c.best && (
                <div className="row row--wrap" style={{ gap: 6, fontSize: 12 }}>
                  <span className="muted">Strongest link</span>
                  <LinkStatusBadge status={c.best} />
                </div>
              )}
              <ThreatLinkFilter />
              <div className="muted" style={{ fontSize: 11.5 }}>
                Derived from the requirements linked to this threat, not an assessment of it. Coverage is not a guarantee of protection.
              </div>
            </div>
            {tactics.length > 0 && (
              <div className="row row--wrap" style={{ gap: 6 }}>
                <span className="eyebrow">Tactics</span>
                {tactics.map((t) => (
                  <span key={t} className="chip" style={{ cursor: "default" }}>
                    {t.split(":")[1]}
                  </span>
                ))}
                {a["maturity"] ? <span className="muted" style={{ fontSize: 12 }}>· maturity: {String(a["maturity"])}</span> : null}
              </div>
            )}
            {lineage.length > 0 && (
              <div className="row row--wrap" style={{ gap: 6, fontSize: 12.5 }}>
                <span className="eyebrow">Other edition</span>
                {lineage.map((l) => (
                  <Link key={l.nodeId} to={nodeHref(ws, node.frameworkId, l.nodeId, true)} className="mono" title={l.basis}>
                    {l.key}
                  </Link>
                ))}
              </div>
            )}
            {prevention.length > 0 && (
              <details open>
                <summary className="eyebrow" style={{ cursor: "pointer" }}>
                  Prevention and mitigation strategies ({prevention.length})
                </summary>
                {intro.map((p) => (
                  <p key={p} className="muted" style={{ fontSize: 13, lineHeight: 1.55 }}>
                    {p}
                  </p>
                ))}
                <ol style={{ margin: "8px 0 0", paddingLeft: 20, lineHeight: 1.55, fontSize: 13 }}>
                  {prevention.map((p) => (
                    <li key={`${p.label}-${p.text.slice(0, 20)}`} style={{ marginBottom: 6 }}>
                      {p.title ? <strong>{p.title}. </strong> : null}
                      {p.text}
                    </li>
                  ))}
                </ol>
              </details>
            )}
            {data.children.length > 0 && (
              <section>
                <div className="eyebrow" style={{ marginBottom: 8 }}>
                  {node.kind === "tactic" ? "Techniques" : node.kind === "technique" ? "Sub-techniques" : "Contains"} ({data.children.length})
                </div>
                <div className="stack" style={{ gap: 4 }}>
                  {data.children.slice(0, 80).map((ch) => (
                    <div key={ch.id} className="row" style={{ gap: 8, fontSize: 12.5 }}>
                      <Link to={nodeHref(ws, node.frameworkId, ch.id, true)} className="mono xw-code">
                        {ch.code}
                      </Link>
                      <span className="xw-title">{ch.title}</span>
                    </div>
                  ))}
                </div>
              </section>
            )}
            <ExternalRefs refs={threat.externalRefs} />
            {data.contentNotice && (
              <div className="muted" style={{ fontSize: 11.5, fontStyle: "italic" }}>
                {data.contentNotice}
              </div>
            )}
          </div>
        )}
        {tab === "requirements" && (
          <div className="stack" style={{ gap: 14 }}>
            <ThreatLinkFilter />
            <div className="callout" role="note">
              <Info size={14} /> A link says a publisher considers the requirement relevant to this threat. Implementing it is not proof of protection.
            </div>
            {!threat.requirements.length ? <div className="muted">No linked requirement at the chosen link status.</div> : <LinkedRequirements ws={ws} requirements={threat.requirements} views={threat.coverage.views} />}
          </div>
        )}
        {tab === "related" && (
          <div className="stack" style={{ gap: 8 }}>
            {!threat.related.length && <div className="muted">No published link to another threat catalog.</div>}
            {threat.related.map((r, i) => (
              <div key={`${r.id}-${i}`} className="stack" style={{ gap: 3, paddingBottom: 8, borderBottom: "1px solid var(--color-outline)" }}>
                <div className="row" style={{ gap: 8 }}>
                  <FrameworkBadge frameworkId={r.framework} />
                  <Link to={nodeHref(ws, r.framework, r.id, isThreat(r.framework))} className="mono xw-code">
                    {r.code}
                  </Link>
                  <span className="xw-title" style={{ flex: 1, minWidth: 0 }}>
                    {r.title}
                  </span>
                </div>
                <LinkLine link={r} />
                {r.note && (
                  <div className="muted" style={{ fontSize: 12, lineHeight: 1.45 }}>
                    “{truncate(r.note, 300)}”
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </aside>
  );
}

/** Requirement inspector section: the threats this requirement helps address. */
export function ThreatsAddressed({ threats }: { threats: ThreatAddressed[] }) {
  const { ws = "" } = useParams();
  const [limit, setLimit] = useState(12);
  if (!threats.length) return null;
  const direct = threats.filter((t) => t.paths.some((p) => p.kind === "direct")).length;
  return (
    <details>
      <summary className="eyebrow" style={{ cursor: "pointer" }}>
        Threats this helps address ({threats.length})
      </summary>
      <div className="muted" style={{ fontSize: 12, margin: "6px 0 8px" }}>
        {direct} linked directly, {threats.length - direct} through an ATLAS mitigation or another edition. Published links, labeled by status.
      </div>
      <div className="stack" style={{ gap: 4 }}>
        {threats.slice(0, limit).map((t) => {
          const via = t.paths.find((p) => p.via)?.via;
          return (
            <div key={t.id} className="row" style={{ gap: 6, fontSize: 12.5 }}>
              <FrameworkBadge frameworkId={t.framework} />
              <Link to={nodeHref(ws, t.framework, t.id, true)} className="mono xw-code">
                {t.code}
              </Link>
              <span className="xw-title" style={{ flex: 1, minWidth: 0 }} title={via ? `${t.title} (via ${via.code} ${via.title})` : t.title}>
                {t.title}
                {via && !t.paths.some((p) => p.kind === "direct") ? <span className="muted"> · via {via.code}</span> : null}
              </span>
              <LinkStatusBadge status={t.best} />
            </div>
          );
        })}
      </div>
      {threats.length > limit && (
        <button className="btn btn--quiet btn--sm" style={{ marginTop: 6 }} onClick={() => setLimit(limit + 40)}>
          Show {Math.min(40, threats.length - limit)} more
        </button>
      )}
    </details>
  );
}
